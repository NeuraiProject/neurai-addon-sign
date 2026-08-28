// Which networks the onboarding offers when creating or importing a wallet.
//
// AuthScript PQ exists on the DePIN-Test branch and works on testnet, but
// mainnet has not activated it. Offering "Neurai Mainnet AuthScript PQ" let a
// user create a wallet whose addresses no mainnet node accepts — a dead end
// that only shows itself after the seed phrase has been written down.
//
// The option stays in welcome.html (so the markup documents the intended final
// set) and is removed from the DOM at load. This test reads the real markup and
// the real constant, so re-enabling the network by editing UNAVAILABLE_NETWORKS
// makes it fail here, which is the reminder to update it.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const HTML = readFileSync(new URL('../src/onboarding/welcome.html', import.meta.url), 'utf8');
const WELCOME_TS = readFileSync(new URL('../src/onboarding/welcome.ts', import.meta.url), 'utf8');

/** The unavailable list as welcome.ts actually declares it. */
function declaredUnavailable() {
  const match = WELCOME_TS.match(/const UNAVAILABLE_NETWORKS: readonly string\[\] = \[([^\]]*)\];/);
  assert.ok(match, 'UNAVAILABLE_NETWORKS not found in welcome.ts');
  return match[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
}

/** Options declared for one <select>, in markup order. */
function optionsOf(selectId) {
  const block = HTML.split(`id="${selectId}"`)[1].split('</select>')[0];
  return [...block.matchAll(/<option value="([^"]+)">/g)].map((m) => m[1]);
}

const SELECTS = ['importNetwork', 'generateNetwork'];

test('mainnet AuthScript PQ is not offered', () => {
  assert.deepEqual(declaredUnavailable(), ['xna-pq']);
});

test('both selectors declare the same networks', () => {
  assert.deepEqual(optionsOf('importNetwork'), optionsOf('generateNetwork'));
});

test('the networks that survive pruning are the usable ones', () => {
  const unavailable = declaredUnavailable();
  for (const id of SELECTS) {
    const shown = optionsOf(id).filter((v) => !unavailable.includes(v));
    assert.deepEqual(shown, ['xna', 'xna-test', 'xna-pq-test'], id);
  }
});

test('testnet AuthScript PQ stays available: it works today', () => {
  for (const id of SELECTS) {
    assert.ok(optionsOf(id).includes('xna-pq-test'), id);
    assert.ok(!declaredUnavailable().includes('xna-pq-test'));
  }
});

test('at least one mainnet and one testnet option remain', () => {
  const unavailable = declaredUnavailable();
  for (const id of SELECTS) {
    const shown = optionsOf(id).filter((v) => !unavailable.includes(v));
    assert.ok(shown.some((v) => !v.endsWith('-test')), `${id}: no mainnet option left`);
    assert.ok(shown.some((v) => v.endsWith('-test')), `${id}: no testnet option left`);
  }
});

test('the handlers refuse an unavailable network even if the option reappears', () => {
  // Defence in depth: pruning is UI, this is the contract.
  const guards = WELCOME_TS.match(/if \(!isNetworkAvailable\(network\)\) \{/g) || [];
  assert.equal(guards.length, 2, 'expected a guard in both the import and generate handlers');
});
