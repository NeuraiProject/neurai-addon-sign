// Qué assets restringidos ofrece el desplegable de Freeze/Unfreeze.
//
// Reportado: con un DePIN &TOKIO no aparecía ningún titular. La causa no
// estaba en la consulta de titulares —listaddressesbyasset "&TOKIO" devuelve
// las direcciones perfectamente— sino en el desplegable, que convertía
// CUALQUIER token owner en `$NOMBRE`: &TOKIO! -> $&TOKIO, que el nodo rechaza
// con «_Not a valid asset name».
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canBeRestrictedRoot, restrictedCandidates, keepExistingAssets
} from '../src/popup/expanded/restricted-assets.ts';

test('sólo un asset RAÍZ puede tener contrapartida restringida', () => {
  assert.equal(canBeRestrictedRoot('TOKIO'), true);
  assert.equal(canBeRestrictedRoot('MY_TOKEN.V2'), true);

  assert.equal(canBeRestrictedRoot('&TOKIO'), false, 'DePIN');
  assert.equal(canBeRestrictedRoot('FOO/BAR'), false, 'sub');
  assert.equal(canBeRestrictedRoot('FOO#BAR'), false, 'único');
  assert.equal(canBeRestrictedRoot('FOO~MSG'), false, 'mensaje');
  assert.equal(canBeRestrictedRoot('#KYC'), false, 'qualifier');
  assert.equal(canBeRestrictedRoot('$ALREADY'), false, 'ya restringido');
});

test('rechaza nombres que el nodo no admite como raíz', () => {
  assert.equal(canBeRestrictedRoot('AB'), false, 'menos de 3');
  assert.equal(canBeRestrictedRoot('A'.repeat(31)), false, 'más de 30');
  assert.equal(canBeRestrictedRoot('.LEADING'), false);
  assert.equal(canBeRestrictedRoot('TRAILING_'), false);
  assert.equal(canBeRestrictedRoot('DOUBLE__UP'), false);
  assert.equal(canBeRestrictedRoot('lowercase'), false);
});

test('EL CASO REPORTADO: &TOKIO! no genera candidato', () => {
  const candidates = restrictedCandidates({ '&TOKIO': 10, '&TOKIO!': 1 });
  assert.deepEqual(candidates, [], 'un DePIN no puede congelarse por dirección');
});

test('un token owner de raíz sí genera candidato', () => {
  assert.deepEqual(restrictedCandidates({ 'TOKIO!': 1 }), ['$TOKIO']);
});

test('sin el token owner no hay candidato', () => {
  assert.deepEqual(restrictedCandidates({ TOKIO: 500 }), []);
  assert.deepEqual(restrictedCandidates({ 'TOKIO!': 0 }), [], 'saldo cero no cuenta');
});

test('mezcla realista: sólo sobrevive la raíz', () => {
  assert.deepEqual(restrictedCandidates({
    '&TOKIO!': 1, 'FOO/BAR!': 1, '#KYC': 5, 'REAL!': 1, 'OTHER!': 1
  }), ['$OTHER', '$REAL']);
});

test('una respuesta vacía o inválida no revienta', () => {
  assert.deepEqual(restrictedCandidates(null), []);
  assert.deepEqual(restrictedCandidates({}), []);
});

test('se descarta el restringido que no existe en la cadena', async () => {
  const rpc = async (_m, [name]) => (name === '$REAL' ? { name } : null);
  assert.deepEqual(await keepExistingAssets(rpc, ['$REAL', '$NEVERISSUED']), ['$REAL']);
});

test('«not found» del nodo también descarta', async () => {
  const rpc = async (_m, [name]) => {
    if (name === '$GONE') throw new Error('Asset not found');
    return { name };
  };
  assert.deepEqual(await keepExistingAssets(rpc, ['$REAL', '$GONE']), ['$REAL']);
});

test('un fallo de red NO descarta: se conserva el candidato', async () => {
  const rpc = async (_m, [name]) => {
    if (name === '$FLAKY') throw new Error('socket hang up');
    return { name };
  };
  assert.deepEqual(
    await keepExistingAssets(rpc, ['$REAL', '$FLAKY']), ['$REAL', '$FLAKY'],
    'no haber podido leer no es lo mismo que no existir');
});

test('no lanza todas las comprobaciones de golpe', async () => {
  let inFlight = 0, max = 0;
  const rpc = async () => {
    inFlight++; max = Math.max(max, inFlight);
    await new Promise(r => setTimeout(r, 5));
    inFlight--;
    return { ok: true };
  };
  const names = Array.from({ length: 20 }, (_, i) => `$A${i}`);
  await keepExistingAssets(rpc, names, { concurrency: 3 });
  assert.ok(max <= 3, `llegó a ${max} en vuelo`);
});
