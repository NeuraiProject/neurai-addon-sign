// Which networks the onboarding offers when creating or importing a wallet.
//
// The witness families (ECDSA witness v3 and PQ witness v2) are active on the
// reset testnet from block 10, but not on mainnet. Offering them there let a
// user create a wallet whose addresses no mainnet node accepts — a dead end
// that only shows itself after the seed phrase has been written down.
//
// The options stay in welcome.html (so the markup documents the intended final
// set) and are removed from the DOM at load. This test reads the real markup and
// the real constant, so re-enabling a network by editing UNAVAILABLE_NETWORKS
// makes it fail here, which is the reminder to update it.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UNAVAILABLE_NETWORKS, isWalletNetwork } from '../src/shared/networks.ts';

const HTML = readFileSync(new URL('../src/onboarding/welcome.html', import.meta.url), 'utf8');
const WELCOME_TS = readFileSync(new URL('../src/onboarding/welcome.ts', import.meta.url), 'utf8');

/** Options declared for one <select>, in markup order. */
function optionsOf(selectId) {
  const block = HTML.split(`id="${selectId}"`)[1].split('</select>')[0];
  return [...block.matchAll(/<option value="([^"]+)">/g)].map((m) => m[1]);
}

const SELECTS = ['importNetwork', 'generateNetwork'];

test('the mainnet witness families are not offered', () => {
  assert.deepEqual([...UNAVAILABLE_NETWORKS].sort(), ['xna-ecdsa', 'xna-pq']);
});

test('both selectors declare the same networks', () => {
  assert.deepEqual(optionsOf('importNetwork'), optionsOf('generateNetwork'));
});

test('every option is a label the wallet knows', () => {
  for (const id of SELECTS) {
    for (const value of optionsOf(id)) assert.ok(isWalletNetwork(value), `${id}: ${value}`);
  }
});

test('the networks that survive pruning are the usable ones', () => {
  for (const id of SELECTS) {
    const shown = optionsOf(id).filter((v) => !UNAVAILABLE_NETWORKS.includes(v));
    assert.deepEqual(shown, ['xna', 'xna-test', 'xna-ecdsa-test', 'xna-pq-test'], id);
  }
});

test('every testnet family stays available: all three are active on the reset testnet', () => {
  for (const network of ['xna-test', 'xna-ecdsa-test', 'xna-pq-test']) {
    assert.ok(!UNAVAILABLE_NETWORKS.includes(network), network);
  }
});

test('at least one mainnet and one testnet option remain', () => {
  for (const id of SELECTS) {
    const shown = optionsOf(id).filter((v) => !UNAVAILABLE_NETWORKS.includes(v));
    assert.ok(shown.some((v) => !v.endsWith('-test')), `${id}: no mainnet option left`);
    assert.ok(shown.some((v) => v.endsWith('-test')), `${id}: no testnet option left`);
  }
});

test('the handlers refuse an unavailable network even if the option reappears', () => {
  // Defence in depth: pruning is UI, this is the contract.
  const guards = WELCOME_TS.match(/if \(!isNetworkAvailable\(network\)\) \{/g) || [];
  assert.equal(guards.length, 2, 'expected a guard in both the import and generate handlers');
});

test('the library is called with the neurai-key 5 label, never the account label', () => {
  // neurai-key 5 reads `xna` as ECDSA witness v3: an unmapped call derives
  // another address for a mainnet Legacy wallet without any error.
  const calls = WELCOME_TS.match(/NeuraiKey\.(getAddressPair|getPQAddress)\(([^,]+),/g) || [];
  assert.ok(calls.length >= 2);
  for (const call of calls) assert.match(call, /toKeyNetwork\(network\)/, call);
});
