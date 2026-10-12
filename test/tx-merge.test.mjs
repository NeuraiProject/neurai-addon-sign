// Other signers' inputs survive the PSBT round trip.
//
// In a swap the site sends a transaction where the seller's input is already
// signed. The PSBT the wallet signs carries none of that, so the transaction
// finalized from it must get the seller's scriptSig / witness back, and
// nothing else may change.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './load-bundles.mjs';
import { keepForeignUnlockingData, signedInputIndexes, reserialize } from '../src/shared/tx-merge.ts';

const varint = (n) => (n < 0xfd ? n.toString(16).padStart(2, '0') : 'fd' + n.toString(16).padStart(4, '0').match(/../g).reverse().join(''));
const push = (hex) => varint(hex.length / 2) + hex;

/**
 * Independent serializer for the test vectors. Version 3 serializes its
 * NIP-014 reference inputs (`vrefin`, outpoints) after the outputs, even none.
 */
function tx({ version = '02000000', inputs, outputs, witnesses = null, locktime = '00000000', vrefin = [] }) {
  const segwit = !!witnesses && witnesses.some((w) => w.length > 0);
  let out = version + (segwit ? '0001' : '') + varint(inputs.length);
  for (const i of inputs) out += i.prevout + push(i.script || '') + (i.sequence || 'ffffffff');
  out += varint(outputs.length) + outputs.join('');
  if (version === '03000000') out += varint(vrefin.length) + vrefin.join('');
  if (segwit) for (const w of witnesses) out += varint(w.length) + w.map(push).join('');
  return out + locktime;
}

const P0 = '11'.repeat(32) + '00000000';
const P1 = '22'.repeat(32) + '01000000';
const OUT_A = 'a086010000000000' + push('76a914' + '33'.repeat(20) + '88ac');
const OUT_B = '1027000000000000' + push('5320' + '44'.repeat(32));
const SELLER_SIG = '47' + '30'.repeat(71) + '21' + '02'.repeat(33);
const BUYER_SIG = '48' + '31'.repeat(72) + '21' + '03'.repeat(33);

test('parse and serialize round trip, legacy and witness', () => {
  const legacy = tx({ inputs: [{ prevout: P0, script: SELLER_SIG }, { prevout: P1 }], outputs: [OUT_A, OUT_B] });
  assert.equal(reserialize(legacy), legacy);
  const witness = tx({ inputs: [{ prevout: P0 }, { prevout: P1 }], outputs: [OUT_A], witnesses: [[], ['02', 'aa'.repeat(71), '03'.repeat(33), '51']] });
  assert.equal(reserialize(witness), witness);
  assert.deepEqual(signedInputIndexes(legacy), [0]);
  assert.deepEqual(signedInputIndexes(witness), [1]);
});

test("the seller's scriptSig comes back next to the buyer's", () => {
  const original = tx({ inputs: [{ prevout: P0, script: SELLER_SIG }, { prevout: P1 }], outputs: [OUT_A, OUT_B] });
  const fromPsbt = tx({ inputs: [{ prevout: P0 }, { prevout: P1, script: BUYER_SIG }], outputs: [OUT_A, OUT_B] });
  const merged = keepForeignUnlockingData(original, fromPsbt, [1]);
  assert.equal(merged, tx({ inputs: [{ prevout: P0, script: SELLER_SIG }, { prevout: P1, script: BUYER_SIG }], outputs: [OUT_A, OUT_B] }));
});

test('a legacy foreign input merges into a witness transaction', () => {
  const original = tx({ inputs: [{ prevout: P0, script: SELLER_SIG }, { prevout: P1 }], outputs: [OUT_A] });
  const v3 = ['02', 'aa'.repeat(71), '03'.repeat(33), '51'];
  const fromPsbt = tx({ inputs: [{ prevout: P0 }, { prevout: P1 }], outputs: [OUT_A], witnesses: [[], v3] });
  const merged = keepForeignUnlockingData(original, fromPsbt, [1]);
  assert.equal(merged, tx({ inputs: [{ prevout: P0, script: SELLER_SIG }, { prevout: P1 }], outputs: [OUT_A], witnesses: [[], v3] }));
});

test('nothing to keep: the signed transaction is returned as it is', () => {
  const original = tx({ inputs: [{ prevout: P0 }], outputs: [OUT_A] });
  const signed = tx({ inputs: [{ prevout: P0, script: BUYER_SIG }], outputs: [OUT_A] });
  assert.equal(keepForeignUnlockingData(original, signed, [0]), signed);
});

test('a different transaction is refused', () => {
  const original = tx({ inputs: [{ prevout: P0, script: SELLER_SIG }, { prevout: P1 }], outputs: [OUT_A, OUT_B] });
  const otherOutputs = tx({ inputs: [{ prevout: P0 }, { prevout: P1, script: BUYER_SIG }], outputs: [OUT_A] });
  assert.throws(() => keepForeignUnlockingData(original, otherOutputs, [1]), /not the one that was sent/);
  const otherSequence = tx({ inputs: [{ prevout: P0, sequence: '00000000' }, { prevout: P1, script: BUYER_SIG }], outputs: [OUT_A, OUT_B] });
  assert.throws(() => keepForeignUnlockingData(original, otherSequence, [1]), /not the one that was sent/);
});

test('version 3: reference inputs are read and the foreign unlocking data comes back', () => {
  const REF = '55'.repeat(32) + '02000000';
  const covenantWitness = ['01', 'c0ffee'];
  const original = tx({
    version: '03000000', vrefin: [REF], witnesses: [covenantWitness, []],
    inputs: [{ prevout: P0 }, { prevout: P1 }], outputs: [OUT_A]
  });
  assert.equal(reserialize(original), original);
  assert.deepEqual(signedInputIndexes(original), [0]);
  const fromPsbt = tx({ version: '03000000', vrefin: [REF], inputs: [{ prevout: P0 }, { prevout: P1, script: BUYER_SIG }], outputs: [OUT_A] });
  assert.equal(
    keepForeignUnlockingData(original, fromPsbt, [1]),
    tx({ version: '03000000', vrefin: [REF], witnesses: [covenantWitness, []], inputs: [{ prevout: P0 }, { prevout: P1, script: BUYER_SIG }], outputs: [OUT_A] })
  );
  // An empty reference-input list is still serialized in version 3.
  const empty = tx({ version: '03000000', inputs: [{ prevout: P0 }], outputs: [OUT_A] });
  assert.equal(reserialize(empty), empty);
});

test('a different version, locktime or reference input is refused', () => {
  const REF = '55'.repeat(32) + '02000000';
  const original = tx({ version: '03000000', vrefin: [REF], inputs: [{ prevout: P0, script: SELLER_SIG }, { prevout: P1 }], outputs: [OUT_A] });
  const signed = (changes) => tx({ version: '03000000', vrefin: [REF], inputs: [{ prevout: P0 }, { prevout: P1, script: BUYER_SIG }], outputs: [OUT_A], ...changes });
  assert.doesNotThrow(() => keepForeignUnlockingData(original, signed({}), [1]));
  assert.throws(() => keepForeignUnlockingData(original, signed({ vrefin: [] }), [1]), /not the one that was sent/);
  assert.throws(() => keepForeignUnlockingData(original, signed({ vrefin: ['66'.repeat(32) + '02000000'] }), [1]), /not the one that was sent/);
  assert.throws(() => keepForeignUnlockingData(original, signed({ locktime: '01000000' }), [1]), /not the one that was sent/);
  assert.throws(() => keepForeignUnlockingData(original, signed({ version: '02000000' }), [1]), /not the one that was sent/);
});
