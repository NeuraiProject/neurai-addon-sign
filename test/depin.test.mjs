// El modelo de la pestaña DePIN.
//
// Lo que se fija aquí es qué se puede marcar y qué se ofrece, que es donde un
// error se traduce en una transacción que el nodo rechaza (congelar lo ya
// bloqueado) o en dejar un asset sin nadie que pueda descongelarlo.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  depinParent, parseDepinAssets, manageableDepinParents,
  isDeviceSelectable, toDeviceRows, pruneDeviceSelection, blockingReasonForFreeze
} from '../src/popup/expanded/depin.ts';

test('el padre es el inmediato, como en el nodo', () => {
  assert.equal(depinParent('&FLEET'), null);
  assert.equal(depinParent('&FLEET/SENSOR'), '&FLEET');
  assert.equal(depinParent('&FLEET/SENSOR/ALPHA'), '&FLEET/SENSOR');
});

test('lista los DePIN del monedero y si se pueden gestionar', () => {
  const assets = parseDepinAssets({
    '&FLEET': 100, '&FLEET!': 1,
    '&FLEET/SENSOR': 5,
    MYTOKEN: 500, 'MYTOKEN!': 1,
    '#KYC': 3
  });
  assert.deepEqual(assets.map(a => a.name), ['&FLEET', '&FLEET/SENSOR']);
  assert.equal(assets[0].owned, true, 'tiene &FLEET!');
  assert.equal(assets[1].owned, false, 'no tiene &FLEET/SENSOR!');
  assert.equal(assets[1].parent, '&FLEET');
  assert.equal(assets[1].depth, 1);
});

test('el token owner no se lista como asset', () => {
  assert.deepEqual(parseDepinAssets({ '&FLEET!': 1 }).map(a => a.name), []);
});

test('un saldo cero no cuenta', () => {
  const assets = parseDepinAssets({ '&FLEET': 0, '&OTHER': 2, '&OTHER!': 0 });
  assert.deepEqual(assets.map(a => a.name), ['&OTHER']);
  assert.equal(assets[0].owned, false, 'token owner con saldo 0 no habilita nada');
});

test('las raíces salen antes que los sub', () => {
  const assets = parseDepinAssets({ '&B/SUB': 1, '&A': 1, '&A/SUB': 1 });
  assert.deepEqual(assets.map(a => a.name), ['&A', '&A/SUB', '&B/SUB']);
});

test('los padres gestionables salen del token owner, no del asset', () => {
  // Lo normal tras repartir: se conserva &FLEET! pero ninguna unidad de &FLEET.
  assert.deepEqual(manageableDepinParents({ '&FLEET!': 1, '&FLEET': 0 }), ['&FLEET']);
  assert.deepEqual(manageableDepinParents({ '&FLEET': 10 }), [], 'sin token owner, nada');
  assert.deepEqual(manageableDepinParents({ 'MYTOKEN!': 1 }), [], 'sólo DePIN');
});

const holders = [
  { address: 'devActive', amount: 3, valid: 1 },
  { address: 'devBlocked', amount: 1, valid: 0 }
];

test('FREEZE: sólo los activos', () => {
  assert.equal(isDeviceSelectable(holders[0], 'FREEZE'), true);
  assert.equal(isDeviceSelectable(holders[1], 'FREEZE'), false);
});

test('UNFREEZE: sólo los bloqueados', () => {
  assert.equal(isDeviceSelectable(holders[0], 'UNFREEZE'), false);
  assert.equal(isDeviceSelectable(holders[1], 'UNFREEZE'), true);
});

test('la fila dice el motivo cuando no se puede marcar', () => {
  const freeze = toDeviceRows(holders, 'FREEZE');
  assert.equal(freeze.find(r => r.address === 'devBlocked').stateText, 'Already blocked');
  assert.equal(freeze.find(r => r.address === 'devBlocked').stateTitle, 'Blocked or revoked');
  const unfreeze = toDeviceRows(holders, 'UNFREEZE');
  assert.equal(unfreeze.find(r => r.address === 'devActive').stateText, 'Not blocked');
});

test('las filas van de mayor a menor cantidad', () => {
  const rows = toDeviceRows(
    [{ address: 'a', amount: 1, valid: 1 }, { address: 'b', amount: 9, valid: 1 }], 'FREEZE');
  assert.deepEqual(rows.map(r => r.address), ['b', 'a']);
});

test('marca cuál es la dirección propia', () => {
  const rows = toDeviceRows(holders, 'FREEZE', { ownerAddress: 'devActive' });
  assert.equal(rows.find(r => r.address === 'devActive').isSelf, true);
  assert.equal(rows.find(r => r.address === 'devBlocked').isSelf, false);
});

test('cambiar de Freeze a Unfreeze suelta lo que ya no procede', () => {
  assert.deepEqual(pruneDeviceSelection(['devActive'], holders, 'FREEZE'), ['devActive']);
  assert.deepEqual(pruneDeviceSelection(['devActive'], holders, 'UNFREEZE'), []);
});

test('una dirección que ya no está en la lista se suelta', () => {
  assert.deepEqual(pruneDeviceSelection(['seFue'], holders, 'FREEZE'), []);
});

test('no deja congelar sin seleccionar nada', () => {
  assert.match(blockingReasonForFreeze([], 'owner'), /at least one device/);
});

test('no deja congelar la dirección que tiene el token owner', () => {
  const reason = blockingReasonForFreeze(['owner', 'dev'], 'owner');
  assert.match(reason, /owner token/);
  assert.match(reason, /undo/);
});

test('una selección normal no se bloquea', () => {
  assert.equal(blockingReasonForFreeze(['dev'], 'owner'), null);
});
