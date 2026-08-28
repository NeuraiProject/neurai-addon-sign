// Who holds the asset and who is frozen.
//
// What is pinned here is the part that decides what can be selected, because
// that is where a mistake turns into a transaction the node rejects (freezing
// what is already frozen) or into the user not seeing an address already was.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSelectable, blockedReason, frozenLabel, parseAddressBalances, loadHolders
} from '../src/popup/expanded/holder-picker.ts';

const h = (address, quantity, frozen) => ({ address, quantity, frozen });

test('freeze: only the free ones', () => {
  assert.equal(isSelectable(h('a', 5, false), 'FREEZE'), true);
  assert.equal(isSelectable(h('b', 5, true), 'FREEZE'), false);
  assert.equal(blockedReason(h('b', 5, true), 'FREEZE'), 'Already frozen');
});

test('unfreeze: only the frozen ones', () => {
  assert.equal(isSelectable(h('a', 5, true), 'UNFREEZE'), true);
  assert.equal(isSelectable(h('b', 5, false), 'UNFREEZE'), false);
  assert.equal(blockedReason(h('b', 5, false), 'UNFREEZE'), 'Not frozen');
});

test('unknown state: selectable, but said so', () => {
  const unknown = h('a', 5, null);
  assert.equal(isSelectable(unknown, 'FREEZE'), true);
  assert.equal(isSelectable(unknown, 'UNFREEZE'), true);
  assert.equal(blockedReason(unknown, 'FREEZE'), null);
  assert.equal(frozenLabel(unknown), 'Status unknown');
});

test('an unknown state is NOT counted as "free"', () => {
  // If null were treated as false, unfreeze would hide it from the list.
  assert.notEqual(frozenLabel(h('a', 1, null)), frozenLabel(h('a', 1, false)));
  assert.equal(frozenLabel(h('a', 1, false)), 'Free');
  assert.equal(frozenLabel(h('a', 1, true)), 'Frozen');
});

test('addresses arrive sorted by amount, largest first', () => {
  const parsed = parseAddressBalances({ addrA: 5, addrB: 100, addrC: 50 });
  assert.deepEqual(parsed.map(p => p.address), ['addrB', 'addrC', 'addrA']);
});

test('a response that is not an object does not blow up the list', () => {
  assert.deepEqual(parseAddressBalances(null), []);
  assert.deepEqual(parseAddressBalances([]), []);
  assert.deepEqual(parseAddressBalances('nope'), []);
});

/** Fake RPC that counts simultaneous calls. */
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

test('loadHolders brings amounts and state for each address', async () => {
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

test('a failed state lookup leaves that address unknown', async () => {
  const { rpc } = fakeRpc({ balances: { addrA: 1, addrB: 2 }, failOn: ['addrA'] });
  const listing = await loadHolders(rpc, '$KYC');

  const a = listing.holders.find(x => x.address === 'addrA');
  const b = listing.holders.find(x => x.address === 'addrB');
  assert.equal(a.frozen, null, 'no state is invented');
  assert.equal(b.frozen, false, 'and it does not contaminate the others');
});

test('does not fire every lookup at once', async () => {
  const balances = {};
  for (let i = 0; i < 30; i++) balances['addr' + i] = i + 1;
  const { rpc, state } = fakeRpc({ balances });
  await loadHolders(rpc, '$KYC', { concurrency: 4 });

  // 2 from the first batch (in parallel) + at most 4 state lookups at once.
  assert.ok(state.maxInFlight <= 4 + 1, `reached ${state.maxInFlight} in flight`);
  assert.equal(state.calls.filter(c => c === 'checkaddressrestriction').length, 30);
});

test('with many addresses it truncates and reports the total', async () => {
  const balances = {};
  for (let i = 0; i < 25; i++) balances['addr' + i] = i + 1;
  const { rpc } = fakeRpc({ balances });
  const listing = await loadHolders(rpc, '$KYC', { limit: 10 });

  assert.equal(listing.holders.length, 10);
  assert.equal(listing.total, 25);
  assert.equal(listing.truncated, true);
  assert.equal(listing.holders[0].quantity, 25, 'the largest ones are kept');
});

test('a globally frozen asset is reported', async () => {
  const { rpc } = fakeRpc({ balances: { addrA: 1 }, globalFrozen: true });
  const listing = await loadHolders(rpc, '$KYC');
  assert.equal(listing.globallyFrozen, true);
});

test('if checkglobalrestriction fails, unknown is reported, not false', async () => {
  const rpc = async (method) => {
    if (method === 'listaddressesbyasset') return { addrA: 1 };
    if (method === 'checkglobalrestriction') throw new Error('not active');
    return false;
  };
  const listing = await loadHolders(rpc, '$KYC');
  assert.equal(listing.globallyFrozen, null);
});

test('an asset with no holders returns an empty list without state lookups', async () => {
  const { rpc, state } = fakeRpc({ balances: {} });
  const listing = await loadHolders(rpc, '$KYC');
  assert.deepEqual(listing.holders, []);
  assert.equal(state.calls.filter(c => c === 'checkaddressrestriction').length, 0);
});

// --- Rows and selection ---------------------------------------------------

import { toHolderRows, pruneSelection, selectableAddresses } from '../src/popup/expanded/holder-picker.ts';

const mixed = [
  h('addrFrozen', 100, true),
  h('addrFree', 50, false),
  h('addrUnknown', 25, null)
];

test('FREEZE: the frozen one is not selectable and says why', () => {
  const rows = toHolderRows(mixed, 'FREEZE');
  const frozen = rows.find(r => r.address === 'addrFrozen');
  assert.equal(frozen.selectable, false);
  assert.equal(frozen.stateText, 'Already frozen');
  assert.equal(frozen.stateKind, 'frozen');
  assert.equal(frozen.stateTitle, 'Frozen', 'the tooltip keeps the real state');
  assert.equal(rows.find(r => r.address === 'addrFree').selectable, true);
});

test('UNFREEZE: the free one is not selectable and says why', () => {
  const rows = toHolderRows(mixed, 'UNFREEZE');
  const free = rows.find(r => r.address === 'addrFree');
  assert.equal(free.selectable, false);
  assert.equal(free.stateText, 'Not frozen');
  assert.equal(rows.find(r => r.address === 'addrFrozen').selectable, true);
});

test('the unknown one is selectable in both modes and stands out', () => {
  for (const mode of ['FREEZE', 'UNFREEZE']) {
    const row = toHolderRows(mixed, mode).find(r => r.address === 'addrUnknown');
    assert.equal(row.selectable, true);
    assert.equal(row.stateKind, 'unknown');
    assert.equal(row.stateText, 'Status unknown');
  }
});

test('the amount is formatted with whatever is passed in', () => {
  const rows = toHolderRows([h('a', 1234.5, false)], 'FREEZE', n => n.toFixed(2));
  assert.equal(rows[0].quantityText, '1234.50');
});

test('a non-numeric amount does not print NaN', () => {
  const rows = toHolderRows([h('a', Number.NaN, false)], 'FREEZE');
  assert.equal(rows[0].quantityText, '—');
});

test('switching from Freeze to Unfreeze drops what no longer applies', () => {
  const picked = ['addrFree', 'addrUnknown'];
  assert.deepEqual(pruneSelection(picked, mixed, 'FREEZE'), ['addrFree', 'addrUnknown']);
  // Under Unfreeze, addrFree stops being a candidate.
  assert.deepEqual(pruneSelection(picked, mixed, 'UNFREEZE'), ['addrUnknown']);
});

test('an address no longer in the list is dropped', () => {
  assert.deepEqual(pruneSelection(['seFue'], mixed, 'FREEZE'), []);
});

test('"Select all" selects only the ones available in that mode', () => {
  assert.deepEqual(selectableAddresses(mixed, 'FREEZE'), ['addrFree', 'addrUnknown']);
  assert.deepEqual(selectableAddresses(mixed, 'UNFREEZE'), ['addrFrozen', 'addrUnknown']);
});
