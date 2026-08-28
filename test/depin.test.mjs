// The DEPIN tab model.
//
// What is pinned here is what can be selected and what is offered, which is
// where a mistake turns into a transaction the node rejects (blocking what is
// already blocked) or into an asset nobody can unblock.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  depinParent, parseDepinAssets, manageableDepinParents,
  isDeviceSelectable, toDeviceRows, pruneDeviceSelection, blockingReasonForFreeze
} from '../src/popup/expanded/depin.ts';

test('the parent is the immediate one, as in the node', () => {
  assert.equal(depinParent('&FLEET'), null);
  assert.equal(depinParent('&FLEET/SENSOR'), '&FLEET');
  assert.equal(depinParent('&FLEET/SENSOR/ALPHA'), '&FLEET/SENSOR');
});

test("lists the wallet's DEPIN assets and whether they are manageable", () => {
  const assets = parseDepinAssets({
    '&FLEET': 100, '&FLEET!': 1,
    '&FLEET/SENSOR': 5,
    MYTOKEN: 500, 'MYTOKEN!': 1,
    '#KYC': 3
  });
  assert.deepEqual(assets.map(a => a.name), ['&FLEET', '&FLEET/SENSOR']);
  assert.equal(assets[0].owned, true, 'holds &FLEET!');
  assert.equal(assets[1].owned, false, 'does not hold &FLEET/SENSOR!');
  assert.equal(assets[1].parent, '&FLEET');
  assert.equal(assets[1].depth, 1);
});

test('the owner token is not listed as an asset', () => {
  assert.deepEqual(parseDepinAssets({ '&FLEET!': 1 }).map(a => a.name), []);
});

test('a zero balance does not count', () => {
  const assets = parseDepinAssets({ '&FLEET': 0, '&OTHER': 2, '&OTHER!': 0 });
  assert.deepEqual(assets.map(a => a.name), ['&OTHER']);
  assert.equal(assets[0].owned, false, 'an owner token with balance 0 enables nothing');
});

test('roots come before subs', () => {
  const assets = parseDepinAssets({ '&B/SUB': 1, '&A': 1, '&A/SUB': 1 });
  assert.deepEqual(assets.map(a => a.name), ['&A', '&A/SUB', '&B/SUB']);
});

test('manageable parents come from the owner token, not the asset', () => {
  // The normal case after handing out: &FLEET! kept but no units of &FLEET.
  assert.deepEqual(manageableDepinParents({ '&FLEET!': 1, '&FLEET': 0 }), ['&FLEET']);
  assert.deepEqual(manageableDepinParents({ '&FLEET': 10 }), [], 'no owner token, nothing');
  assert.deepEqual(manageableDepinParents({ 'MYTOKEN!': 1 }), [], 'DEPIN only');
});

const holders = [
  { address: 'devActive', amount: 3, valid: 1 },
  { address: 'devBlocked', amount: 1, valid: 0 }
];

test('FREEZE: only the active ones', () => {
  assert.equal(isDeviceSelectable(holders[0], 'FREEZE'), true);
  assert.equal(isDeviceSelectable(holders[1], 'FREEZE'), false);
});

test('UNFREEZE: only the blocked ones', () => {
  assert.equal(isDeviceSelectable(holders[0], 'UNFREEZE'), false);
  assert.equal(isDeviceSelectable(holders[1], 'UNFREEZE'), true);
});

test('the row states the reason when it cannot be selected', () => {
  const freeze = toDeviceRows(holders, 'FREEZE');
  assert.equal(freeze.find(r => r.address === 'devBlocked').stateText, 'Already blocked');
  assert.equal(freeze.find(r => r.address === 'devBlocked').stateTitle, 'Blocked or revoked');
  const unfreeze = toDeviceRows(holders, 'UNFREEZE');
  assert.equal(unfreeze.find(r => r.address === 'devActive').stateText, 'Not blocked');
});

test('rows run from largest to smallest amount', () => {
  const rows = toDeviceRows(
    [{ address: 'a', amount: 1, valid: 1 }, { address: 'b', amount: 9, valid: 1 }], 'FREEZE');
  assert.deepEqual(rows.map(r => r.address), ['b', 'a']);
});

test('marks which address is the wallet\'s own', () => {
  const rows = toDeviceRows(holders, 'FREEZE', { ownerAddress: 'devActive' });
  assert.equal(rows.find(r => r.address === 'devActive').isSelf, true);
  assert.equal(rows.find(r => r.address === 'devBlocked').isSelf, false);
});

test('switching from Freeze to Unfreeze drops what no longer applies', () => {
  assert.deepEqual(pruneDeviceSelection(['devActive'], holders, 'FREEZE'), ['devActive']);
  assert.deepEqual(pruneDeviceSelection(['devActive'], holders, 'UNFREEZE'), []);
});

test('an address no longer in the list is dropped', () => {
  assert.deepEqual(pruneDeviceSelection(['seFue'], holders, 'FREEZE'), []);
});

test('does not allow blocking with nothing selected', () => {
  assert.match(blockingReasonForFreeze([], 'owner'), /at least one device/);
});

test('does not allow blocking the address holding the owner token', () => {
  const reason = blockingReasonForFreeze(['owner', 'dev'], 'owner');
  assert.match(reason, /owner token/);
  assert.match(reason, /undo/);
});

test('an ordinary selection is not blocked', () => {
  assert.equal(blockingReasonForFreeze(['dev'], 'owner'), null);
});
