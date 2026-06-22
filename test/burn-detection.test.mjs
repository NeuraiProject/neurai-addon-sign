// Regression tests for the asset burn-output detection in the extension.
//
// Run with:  npm test     (node --test, no extra deps; Node >= 22.6 for TS source)
//
// Context: an asset ISSUE built for a hardware wallet was missing its 1000 XNA
// burn output because isLikelyBurnAddress() used a loose prefix heuristic
// (/^t[Bb]/, /^N[bB]/) that false-positived on ordinary wallet addresses
// starting with "tB"/"Nb" (e.g. tBmebag...). findXnaEnvelope then misclassified
// the CHANGE output as the burn and dropped the real burn → node rejected the
// broadcast with bad-txns-issue-burn-not-found.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as NCT from '@neuraiproject/neurai-create-transaction';
import { isLikelyBurnAddress, findXnaEnvelope } from '../src/popup/expanded/burn-detection.ts';

// burn-detection.ts reads the global the extension loads via <script>.
globalThis.NeuraiCreateTransaction = NCT;

const USER_WALLET = 'tBmebagBfXgm7Veco3568kCkiCZehPXVYC'; // starts with "tB" → used to false-positive
const TESTNET_ROOT_BURN = 'tBURNXXXXXXXXXXXXXXXXXXXXXXXVZLroy';

test('isLikelyBurnAddress: exact match against consensus burn addresses only', () => {
  // The bug: a normal wallet address starting with "tB" was treated as a burn.
  assert.equal(isLikelyBurnAddress(USER_WALLET), false);

  // Real per-network burn addresses must be recognised.
  assert.equal(isLikelyBurnAddress(TESTNET_ROOT_BURN), true);                      // testnet issue root
  assert.equal(isLikelyBurnAddress('NbURNXXXXXXXXXXXXXXXXXXXXXXXT65Gdr'), true);   // mainnet issue root
  assert.equal(isLikelyBurnAddress('NXReissueAssetXXXXXXXXXXXXXXWLe4Ao'), true);   // mainnet reissue
  assert.equal(isLikelyBurnAddress('tAssetXXXXXXXXXXXXXXXXXXXXXXas6pz8'), true);   // testnet reissue
  assert.equal(isLikelyBurnAddress('NXissueQuaLifierXXXXXXXXXXXXWurNcU'), true);   // mainnet qualifier

  // Non-addresses / empty must be false.
  assert.equal(isLikelyBurnAddress(''), false);
  assert.equal(isLikelyBurnAddress('not-an-address'), false);
});

test('findXnaEnvelope: ISSUE keeps the real burn AND the change (regression)', () => {
  const entries = [
    { address: TESTNET_ROOT_BURN, value: 1000 },        // burn
    { address: USER_WALLET, value: 3999.9961 },         // change (starts with "tB")
  ];
  const env = findXnaEnvelope(entries, 'ISSUE_ROOT');
  assert.equal(env.burnAddress, TESTNET_ROOT_BURN);
  assert.equal(env.burnAmountSats, 100000000000n);      // 1000 XNA
  assert.equal(env.xnaChangeAddress, USER_WALLET);
  assert.equal(env.xnaChangeSats, 399999610000n);       // 3999.9961 XNA
});

test('findXnaEnvelope: order independence (change listed before burn)', () => {
  const entries = [
    { address: USER_WALLET, value: 3999.9961 },         // change first
    { address: TESTNET_ROOT_BURN, value: 1000 },        // burn second
  ];
  const env = findXnaEnvelope(entries, 'ISSUE_ROOT');
  assert.equal(env.burnAddress, TESTNET_ROOT_BURN);
  assert.equal(env.xnaChangeAddress, USER_WALLET);
});
