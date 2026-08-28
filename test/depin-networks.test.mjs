// Which networks offer DEPIN.
//
// Until now the form offered creating DEPIN assets on mainnet too, where the
// fork has not happened: the transaction was built and the chain rejected it.
// The list is deliberate — on the day mainnet activates, 'xna' is added here
// and there is nothing else to touch.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supportsDepin, DEPIN_NETWORKS } from '../src/popup/expanded/depin-networks.ts';

test('testnet supports DEPIN, in every variant', () => {
  assert.equal(supportsDepin('xna-test'), true);
  assert.equal(supportsDepin('xna-legacy-test'), true);
  assert.equal(supportsDepin('xna-pq-test'), true);
});

test('mainnet does not, nor its PQ variant', () => {
  assert.equal(supportsDepin('xna'), false);
  assert.equal(supportsDepin('xna-pq'), false);
  assert.equal(supportsDepin('xna-legacy'), false);
});

test('an unknown network does not offer DEPIN', () => {
  // Hiding too much is preferable to offering an operation the chain would
  // reject.
  assert.equal(supportsDepin('alguna-red-futura'), false);
});

test('with no network it is not offered', () => {
  assert.equal(supportsDepin(undefined), false);
  assert.equal(supportsDepin(null), false);
  assert.equal(supportsDepin(''), false);
});

test('the list includes no mainnet network', () => {
  // Guards against adding 'xna' by mistake when touching the list.
  assert.ok(DEPIN_NETWORKS.every(n => n.endsWith('-test')),
    `a network in the list is not testnet: ${DEPIN_NETWORKS.join(', ')}`);
});
