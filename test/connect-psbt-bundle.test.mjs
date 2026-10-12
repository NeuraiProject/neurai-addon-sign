// The PSBT that the Neurai Connect window sends to NeuraiWallet, built with
// the shipped src/lib/NeuraiSignESP32.js (connect-sign.ts).
//
// Every input carries its previous transaction. Privacy pools and state
// threads create Neurai version-3 transactions (NIP-014 reference inputs),
// which bitcoinjs-lib cannot read: neurai-sign-esp32 < 0.7.2 failed with
// "Transaction has unexpected data" on any input spending one of their outputs.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';

for (const name of ['NeuraiCreateTransaction', 'NeuraiSignESP32']) {
  runInThisContext(readFileSync(new URL(`../src/lib/${name}.js`, import.meta.url), 'utf8'), { filename: `${name}.js` });
}
const { NeuraiCreateTransaction, NeuraiSignESP32 } = globalThis;

// Testnet block 3002, XNAP#POOL state thread: a version-3 transaction whose
// output 1 pays XNA change to tNq5bpLot8TngXfd5iP28csboQwuw1Z3vh.
const V3_TXID = '33c257664ed140e519accf642ca4f1937eade63be9a86eb0be93ca87db9786ac';
const V3_TX =
  '03000000029aba27aa998d37aa5bab819749bdb2e3185bfee56403c262e48ed86c1e647668030000' +
  '006a4730440220730f319abcda10937f4e18f59f7ada126f8141a3c8d27b3fe9219096cd841bff02' +
  '203ba3f54bcf9cbbc1668f46cdedc9012e803cfbb40b2e65c477ba4eb46f57d83b0121022a3da050' +
  '32a6c02841fb3e463c854123ba66bf8e4dda3e4a9ec6a72b34e98a36ffffffff94b80b69762a8e7a' +
  'cf98508358b771efd52d7ad1e37be99a4df0abc2e1a1f087020000006b483045022100bb5aa64225' +
  '367ed7b6d2f5eab5bba9542f40428438ab2b617e6ce5a583b9048602206391e0fc54f0c01d9361dc' +
  '952558f318a50cefe737ae7fa9ab296efc87d4fdab0121025a12b3d607ba66844f4c049ba7d062d9' +
  'a96ffa6a1b3c26bd6d06cb0d0d513128ffffffff0200000000000000005d5120d8080884df059105' +
  'aec1247cf24c9d8242222435454b1c7ca27a8aa64b65d15ec038786e617409584e415023504f4f4c' +
  '00e1f5050000000054200db2113b3f2a947e4abff06ed52f52979e8b454efb5f030c9d2ca388edf6' +
  '4bf9757cb99705000000001976a914ae7684230a461dfb6db8a67ec0bd44ab2cc1718288ac000000' +
  '0000';

test('the PSBT of a transaction spending a version-3 output carries its previous transaction', () => {
  const raw = NeuraiCreateTransaction.createUnsignedTransaction({
    inputs: [{ txid: V3_TXID, vout: 1 }],
    outputs: [NeuraiCreateTransaction.createXnaOutput('tNq5bpLot8TngXfd5iP28csboQwuw1Z3vh', 1000n)],
  });
  const psbt = NeuraiSignESP32.buildPSBTFromRawTransaction({
    network: 'xna-test',
    rawUnsignedTransaction: raw,
    inputs: [{ txid: V3_TXID, vout: 1, sequence: 0xffffffff, rawTxHex: V3_TX }],
  });
  assert.ok(Buffer.from(psbt, 'base64').toString('hex').includes(V3_TX));
});

test('a previous transaction that is not the one the input spends is refused', () => {
  const otherTxid = '11'.repeat(32);
  const raw = NeuraiCreateTransaction.createUnsignedTransaction({
    inputs: [{ txid: otherTxid, vout: 1 }],
    outputs: [NeuraiCreateTransaction.createXnaOutput('tNq5bpLot8TngXfd5iP28csboQwuw1Z3vh', 1000n)],
  });
  assert.throws(() => NeuraiSignESP32.buildPSBTFromRawTransaction({
    network: 'xna-test',
    rawUnsignedTransaction: raw,
    inputs: [{ txid: otherTxid, vout: 1, sequence: 0xffffffff, rawTxHex: V3_TX }],
  }), /the previous transaction is 33c25766\w+, but the input spends 1{64}:1/);
});

// Hardware wallet (popup.ts / expanded.ts): the same builder, with the device's
// key path on the inputs it signs. The firmware cannot read version-3
// transactions nor sign covenant inputs: those are refused before the device.
test('the device refuses, before signing, a previous transaction of version 3', () => {
  const raw = NeuraiCreateTransaction.createUnsignedTransaction({
    inputs: [{ txid: V3_TXID, vout: 1 }],
    outputs: [NeuraiCreateTransaction.createXnaOutput('tNq5bpLot8TngXfd5iP28csboQwuw1Z3vh', 1000n)],
  });
  const psbt = NeuraiSignESP32.buildPSBTFromRawTransaction({
    network: 'xna-test',
    rawUnsignedTransaction: raw,
    inputs: [{
      txid: V3_TXID, vout: 1, sequence: 0xffffffff, rawTxHex: V3_TX,
      masterFingerprint: 'deadbeef', derivationPath: "m/44'/1'/0'/0/0",
      pubkey: '02' + '11'.repeat(32), sighashType: 1,
    }],
  });
  assert.equal(NeuraiCreateTransaction.decodePsbt(psbt).inputs[0].bip32Derivation[0].path, "m/44'/1'/0'/0/0");
  assert.throws(() => NeuraiSignESP32.assertDeviceCanSignPSBT(psbt), /previous transaction of input #0 is version 3/);
});

test('the device refuses, before signing, a covenant input', () => {
  const prev = NeuraiCreateTransaction.serializeTransaction({
    version: 2,
    inputs: [{ txid: '22'.repeat(32), vout: 0, scriptSigHex: '', sequence: 0xffffffff }],
    outputs: [NeuraiCreateTransaction.createXnaOutput('tNq5bpLot8TngXfd5iP28csboQwuw1Z3vh', 5000n)],
    vrefin: [],
    locktime: 0,
  });
  const prevTxid = NeuraiCreateTransaction.computeTxid(prev);
  const raw = NeuraiCreateTransaction.createUnsignedTransaction({
    inputs: [{ txid: prevTxid, vout: 0 }],
    outputs: [NeuraiCreateTransaction.createXnaOutput('tNq5bpLot8TngXfd5iP28csboQwuw1Z3vh', 1000n)],
  });
  const build = (witnessScript) => NeuraiSignESP32.buildPSBTFromRawTransaction({
    network: 'xna-test',
    rawUnsignedTransaction: raw,
    inputs: [{ txid: prevTxid, vout: 0, sequence: 0xffffffff, rawTxHex: prev, ...(witnessScript ? { witnessScript } : {}) }],
  });
  assert.doesNotThrow(() => NeuraiSignESP32.assertDeviceCanSignPSBT(build()));
  assert.throws(() => NeuraiSignESP32.assertDeviceCanSignPSBT(build('c0ffee')), /carries a witnessScript/);
});
