// Which restricted assets the Freeze/Unfreeze dropdown offers.
//
// Reported: with a DEPIN &TOKIO no holder showed up. The cause was not the
// holder lookup — listaddressesbyasset "&TOKIO" returns the addresses fine —
// but the dropdown, which turned ANY owner token into `$NAME`:
// &TOKIO! -> $&TOKIO, which the node rejects with "_Not a valid asset name".
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canBeRestrictedRoot, restrictedCandidates, keepExistingAssets
} from '../src/popup/expanded/restricted-assets.ts';

test('only a ROOT asset can have a restricted counterpart', () => {
  assert.equal(canBeRestrictedRoot('TOKIO'), true);
  assert.equal(canBeRestrictedRoot('MY_TOKEN.V2'), true);

  assert.equal(canBeRestrictedRoot('&TOKIO'), false, 'DEPIN');
  assert.equal(canBeRestrictedRoot('FOO/BAR'), false, 'sub');
  assert.equal(canBeRestrictedRoot('FOO#BAR'), false, 'unique');
  assert.equal(canBeRestrictedRoot('FOO~MSG'), false, 'message');
  assert.equal(canBeRestrictedRoot('#KYC'), false, 'qualifier');
  assert.equal(canBeRestrictedRoot('$ALREADY'), false, 'already restricted');
});

test('rejects names the node does not accept as a root', () => {
  assert.equal(canBeRestrictedRoot('AB'), false, 'fewer than 3');
  assert.equal(canBeRestrictedRoot('A'.repeat(31)), false, 'more than 30');
  assert.equal(canBeRestrictedRoot('.LEADING'), false);
  assert.equal(canBeRestrictedRoot('TRAILING_'), false);
  assert.equal(canBeRestrictedRoot('DOUBLE__UP'), false);
  assert.equal(canBeRestrictedRoot('lowercase'), false);
});

test('THE REPORTED CASE: &TOKIO! produces no candidate', () => {
  const candidates = restrictedCandidates({ '&TOKIO': 10, '&TOKIO!': 1 });
  assert.deepEqual(candidates, [], 'a DEPIN asset cannot be frozen this way');
});

test('a root owner token does produce a candidate', () => {
  assert.deepEqual(restrictedCandidates({ 'TOKIO!': 1 }), ['$TOKIO']);
});

test('without the owner token there is no candidate', () => {
  assert.deepEqual(restrictedCandidates({ TOKIO: 500 }), []);
  assert.deepEqual(restrictedCandidates({ 'TOKIO!': 0 }), [], 'a zero balance does not count');
});

test('realistic mix: only the root survives', () => {
  assert.deepEqual(restrictedCandidates({
    '&TOKIO!': 1, 'FOO/BAR!': 1, '#KYC': 5, 'REAL!': 1, 'OTHER!': 1
  }), ['$OTHER', '$REAL']);
});

test('an empty or invalid response does not blow up', () => {
  assert.deepEqual(restrictedCandidates(null), []);
  assert.deepEqual(restrictedCandidates({}), []);
});

test('a restricted asset that does not exist on chain is dropped', async () => {
  const rpc = async (_m, [name]) => (name === '$REAL' ? { name } : null);
  assert.deepEqual(await keepExistingAssets(rpc, ['$REAL', '$NEVERISSUED']), ['$REAL']);
});

test('the node saying "not found" also drops it', async () => {
  const rpc = async (_m, [name]) => {
    if (name === '$GONE') throw new Error('Asset not found');
    return { name };
  };
  assert.deepEqual(await keepExistingAssets(rpc, ['$REAL', '$GONE']), ['$REAL']);
});

test('a network failure does NOT drop it: the candidate is kept', async () => {
  const rpc = async (_m, [name]) => {
    if (name === '$FLAKY') throw new Error('socket hang up');
    return { name };
  };
  assert.deepEqual(
    await keepExistingAssets(rpc, ['$REAL', '$FLAKY']), ['$REAL', '$FLAKY'],
    'failing to read is not the same as not existing');
});

test('does not fire every check at once', async () => {
  let inFlight = 0, max = 0;
  const rpc = async () => {
    inFlight++; max = Math.max(max, inFlight);
    await new Promise(r => setTimeout(r, 5));
    inFlight--;
    return { ok: true };
  };
  const names = Array.from({ length: 20 }, (_, i) => `$A${i}`);
  await keepExistingAssets(rpc, names, { concurrency: 3 });
  assert.ok(max <= 3, `reached ${max} in flight`);
});
