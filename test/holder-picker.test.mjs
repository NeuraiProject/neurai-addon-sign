// Quién tiene el asset y quién está congelado.
//
// Lo que se fija aquí es la parte que decide qué se puede marcar, porque es
// donde un error se traduce en una transacción que el nodo rechaza (congelar
// lo ya congelado) o en que el usuario no vea que una dirección ya lo estaba.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSelectable, blockedReason, frozenLabel, parseAddressBalances, loadHolders
} from '../src/popup/expanded/holder-picker.ts';

const h = (address, quantity, frozen) => ({ address, quantity, frozen });

test('congelar: sólo las libres', () => {
  assert.equal(isSelectable(h('a', 5, false), 'FREEZE'), true);
  assert.equal(isSelectable(h('b', 5, true), 'FREEZE'), false);
  assert.equal(blockedReason(h('b', 5, true), 'FREEZE'), 'Already frozen');
});

test('descongelar: sólo las congeladas', () => {
  assert.equal(isSelectable(h('a', 5, true), 'UNFREEZE'), true);
  assert.equal(isSelectable(h('b', 5, false), 'UNFREEZE'), false);
  assert.equal(blockedReason(h('b', 5, false), 'UNFREEZE'), 'Not frozen');
});

test('estado desconocido: se deja marcar, pero se dice', () => {
  const unknown = h('a', 5, null);
  assert.equal(isSelectable(unknown, 'FREEZE'), true);
  assert.equal(isSelectable(unknown, 'UNFREEZE'), true);
  assert.equal(blockedReason(unknown, 'FREEZE'), null);
  assert.equal(frozenLabel(unknown), 'Status unknown');
});

test('un estado desconocido NO se cuenta como «libre»', () => {
  // Si null se tratara como false, descongelar lo escondería de la lista.
  assert.notEqual(frozenLabel(h('a', 1, null)), frozenLabel(h('a', 1, false)));
  assert.equal(frozenLabel(h('a', 1, false)), 'Free');
  assert.equal(frozenLabel(h('a', 1, true)), 'Frozen');
});

test('las direcciones llegan ordenadas por cantidad, de mayor a menor', () => {
  const parsed = parseAddressBalances({ addrA: 5, addrB: 100, addrC: 50 });
  assert.deepEqual(parsed.map(p => p.address), ['addrB', 'addrC', 'addrA']);
});

test('una respuesta que no es un objeto no revienta la lista', () => {
  assert.deepEqual(parseAddressBalances(null), []);
  assert.deepEqual(parseAddressBalances([]), []);
  assert.deepEqual(parseAddressBalances('nope'), []);
});

/** RPC de mentira que cuenta llamadas simultáneas. */
function fakeRpc({ balances, frozen = {}, failOn = [], globalFrozen = false }) {
  const state = { inFlight: 0, maxInFlight: 0, calls: [] };
  const rpc = async (method, params) => {
    state.calls.push(method);
    state.inFlight++;
    state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
    await new Promise(r => setTimeout(r, 5));
    state.inFlight--;
    if (method === 'listaddressesbyasset') return balances;
    if (method === 'checkglobalrestriction') return globalFrozen;
    if (method === 'checkaddressrestriction') {
      const [addr] = params;
      if (failOn.includes(addr)) throw new Error('node said no');
      return Boolean(frozen[addr]);
    }
    return null;
  };
  return { rpc, state };
}

test('loadHolders trae cantidades y estado de cada dirección', async () => {
  const { rpc } = fakeRpc({
    balances: { addrA: 10, addrB: 30 },
    frozen: { addrB: true }
  });
  const listing = await loadHolders(rpc, '$KYC');

  assert.deepEqual(listing.holders, [
    { address: 'addrB', quantity: 30, frozen: true },
    { address: 'addrA', quantity: 10, frozen: false }
  ]);
  assert.equal(listing.total, 2);
  assert.equal(listing.truncated, false);
  assert.equal(listing.globallyFrozen, false);
});

test('una consulta de estado que falla deja esa dirección en desconocido', async () => {
  const { rpc } = fakeRpc({ balances: { addrA: 1, addrB: 2 }, failOn: ['addrA'] });
  const listing = await loadHolders(rpc, '$KYC');

  const a = listing.holders.find(x => x.address === 'addrA');
  const b = listing.holders.find(x => x.address === 'addrB');
  assert.equal(a.frozen, null, 'no se inventa un estado');
  assert.equal(b.frozen, false, 'y no contamina a las demás');
});

test('no lanza todas las consultas de golpe', async () => {
  const balances = {};
  for (let i = 0; i < 30; i++) balances['addr' + i] = i + 1;
  const { rpc, state } = fakeRpc({ balances });
  await loadHolders(rpc, '$KYC', { concurrency: 4 });

  // 2 de la primera tanda (en paralelo) + como mucho 4 de estado a la vez.
  assert.ok(state.maxInFlight <= 4 + 1, `llegó a ${state.maxInFlight} en vuelo`);
  assert.equal(state.calls.filter(c => c === 'checkaddressrestriction').length, 30);
});

test('con muchas direcciones se recorta y se dice cuántas hay', async () => {
  const balances = {};
  for (let i = 0; i < 25; i++) balances['addr' + i] = i + 1;
  const { rpc } = fakeRpc({ balances });
  const listing = await loadHolders(rpc, '$KYC', { limit: 10 });

  assert.equal(listing.holders.length, 10);
  assert.equal(listing.total, 25);
  assert.equal(listing.truncated, true);
  assert.equal(listing.holders[0].quantity, 25, 'se quedan las mayores');
});

test('el asset congelado globalmente se reporta', async () => {
  const { rpc } = fakeRpc({ balances: { addrA: 1 }, globalFrozen: true });
  const listing = await loadHolders(rpc, '$KYC');
  assert.equal(listing.globallyFrozen, true);
});

test('si checkglobalrestriction falla, se reporta desconocido, no false', async () => {
  const rpc = async (method) => {
    if (method === 'listaddressesbyasset') return { addrA: 1 };
    if (method === 'checkglobalrestriction') throw new Error('not active');
    return false;
  };
  const listing = await loadHolders(rpc, '$KYC');
  assert.equal(listing.globallyFrozen, null);
});

test('un asset sin titulares devuelve lista vacía sin consultar estados', async () => {
  const { rpc, state } = fakeRpc({ balances: {} });
  const listing = await loadHolders(rpc, '$KYC');
  assert.deepEqual(listing.holders, []);
  assert.equal(state.calls.filter(c => c === 'checkaddressrestriction').length, 0);
});

// --- Filas y selección ----------------------------------------------------

import { toHolderRows, pruneSelection, selectableAddresses } from '../src/popup/expanded/holder-picker.ts';

const mixed = [
  h('addrFrozen', 100, true),
  h('addrFree', 50, false),
  h('addrUnknown', 25, null)
];

test('FREEZE: la congelada no se puede marcar y dice por qué', () => {
  const rows = toHolderRows(mixed, 'FREEZE');
  const frozen = rows.find(r => r.address === 'addrFrozen');
  assert.equal(frozen.selectable, false);
  assert.equal(frozen.stateText, 'Already frozen');
  assert.equal(frozen.stateKind, 'frozen');
  assert.equal(frozen.stateTitle, 'Frozen', 'el tooltip conserva el estado real');
  assert.equal(rows.find(r => r.address === 'addrFree').selectable, true);
});

test('UNFREEZE: la libre no se puede marcar y dice por qué', () => {
  const rows = toHolderRows(mixed, 'UNFREEZE');
  const free = rows.find(r => r.address === 'addrFree');
  assert.equal(free.selectable, false);
  assert.equal(free.stateText, 'Not frozen');
  assert.equal(rows.find(r => r.address === 'addrFrozen').selectable, true);
});

test('la desconocida se puede marcar en ambos modos y se distingue', () => {
  for (const mode of ['FREEZE', 'UNFREEZE']) {
    const row = toHolderRows(mixed, mode).find(r => r.address === 'addrUnknown');
    assert.equal(row.selectable, true);
    assert.equal(row.stateKind, 'unknown');
    assert.equal(row.stateText, 'Status unknown');
  }
});

test('la cantidad se formatea con lo que se le pase', () => {
  const rows = toHolderRows([h('a', 1234.5, false)], 'FREEZE', n => n.toFixed(2));
  assert.equal(rows[0].quantityText, '1234.50');
});

test('una cantidad no numérica no imprime NaN', () => {
  const rows = toHolderRows([h('a', Number.NaN, false)], 'FREEZE');
  assert.equal(rows[0].quantityText, '—');
});

test('cambiar de Freeze a Unfreeze suelta lo que ya no procede', () => {
  const picked = ['addrFree', 'addrUnknown'];
  assert.deepEqual(pruneSelection(picked, mixed, 'FREEZE'), ['addrFree', 'addrUnknown']);
  // En Unfreeze, addrFree deja de ser candidata.
  assert.deepEqual(pruneSelection(picked, mixed, 'UNFREEZE'), ['addrUnknown']);
});

test('una dirección que ya no está en la lista se suelta', () => {
  assert.deepEqual(pruneSelection(['seFue'], mixed, 'FREEZE'), []);
});

test('«Select all» marca sólo las disponibles del modo', () => {
  assert.deepEqual(selectableAddresses(mixed, 'FREEZE'), ['addrFree', 'addrUnknown']);
  assert.deepEqual(selectableAddresses(mixed, 'UNFREEZE'), ['addrFrozen', 'addrUnknown']);
});
