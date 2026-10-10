// The account and receive cards of the expanded view.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addressLines, accountChips } from '../src/popup/expanded/receive.ts';

const BASE58 = 't9Zo5RAwAucmz3tGuTFak6ZqpytiyxnLiJ';
const WITNESS = 'tnq1rgyglqrnncwfqx594um7f5hl3nj33w0mgax7qeuskaaxmtszjk0fsz0jvty';

test('the address is cut in two halves by default, or in as many parts as asked', () => {
  assert.deepEqual(addressLines(BASE58), ['t9Zo5RAwAucmz3tGu', 'TFak6ZqpytiyxnLiJ']);
  assert.equal(addressLines(WITNESS).length, 2);
  assert.equal(addressLines(WITNESS, 4).length, 4);
});

test('the lines give the address back unchanged', () => {
  for (const address of [BASE58, WITNESS, 'N1', 'abc']) {
    assert.equal(addressLines(address).join(''), address);
    assert.equal(addressLines(address, 3).join(''), address);
  }
});

test('the lines are of near equal length', () => {
  const lengths = addressLines(WITNESS).map((line) => line.length);
  assert.ok(Math.max(...lengths) - Math.min(...lengths) <= 1, String(lengths));
});

test('no address, no lines', () => {
  assert.deepEqual(addressLines(''), []);
  assert.deepEqual(addressLines(undefined), []);
});

test('chips name the family and where the keys live', () => {
  assert.deepEqual(accountChips('legacy', 'software'), ['Legacy', 'Software wallet']);
  assert.deepEqual(accountChips('pq', 'hardware'), ['Post-quantum', 'ESP32 hardware']);
  assert.deepEqual(accountChips('ecdsa', undefined), ['ECDSA witness', 'Software wallet']);
});

test('a followed NeuraiWallet account also says how many addresses it watches', () => {
  assert.deepEqual(accountChips('ecdsa', 'connect', 5), ['ECDSA witness', 'NeuraiWallet', '5 addresses']);
  assert.deepEqual(accountChips('ecdsa', 'connect', 1), ['ECDSA witness', 'NeuraiWallet']);
});
