// Partial-fill covenants as the shipped bundles see them.
//
// The covenant-cancel approval parses the order with src/lib/NeuraiScripts.js
// and the signer is src/lib/NeuraiSignTransaction.js. Since neurai-scripts
// 0.10.0 the fill branches of an order are bound to input 0: orders built
// without that binding can be drained through a foreign input 0, so the
// shipped bundles must refuse them. verify-libs.js checks that the bundles are
// the installed packages; these tests check that the installed packages are
// recent enough, and how the approval names the refund destination.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import { describeDestination } from '../src/shared/script-to-address.ts';

// Load the bundles the way the extension does: classic scripts defining globals.
for (const name of ['NeuraiKey', 'NeuraiScripts', 'NeuraiCreateTransaction', 'NeuraiSignTransaction']) {
  runInThisContext(readFileSync(new URL(`../src/lib/${name}.js`, import.meta.url), 'utf8'), { filename: `${name}.js` });
}
const { NeuraiKey, NeuraiScripts, NeuraiCreateTransaction, NeuraiSignTransaction } = globalThis;

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const ECDSA_V3 = NeuraiKey.getAddressByPath('xna-test', NeuraiKey.getHDKey('xna-test', MNEMONIC), "m/84'/1'/0'/0/0").address;
const PQ_V2 = NeuraiKey.getPQAddress('xna-pq-test', MNEMONIC, 0, 0).address;
const LEGACY = NeuraiKey.getAddressPair('xna-legacy-test', MNEMONIC, 0, 0).external.address;

// <0x80 0x00> OP_TXHASH <OP_TXHASH(0x0080) at input 0> OP_EQUALVERIFY
const INPUT_ZERO_BINDING = '028000b520419632cabaf8bb70b96a8c92c4601a9c2ba11e96841daebc9d98f4835eeb0e3688';

function orderFor(paymentAddress) {
  return NeuraiScripts.buildPartialFillScriptHex({
    paymentAddress,
    sellerPubKeyHash: new Uint8Array(20).fill(0xdd),
    tokenId: 'CAT',
    unitPriceSats: 1n,
  });
}

function ownScript(address) {
  return { address, scriptHex: NeuraiScripts.bytesToHex(NeuraiScripts.encodeSellerScriptPubKey(address).bytes) };
}

test('the shipped parser reads an input-0 bound order paid to an ECDSA v3 address', () => {
  const covenantHex = orderFor(ECDSA_V3);
  assert.ok(covenantHex.includes(INPUT_ZERO_BINDING));
  const parsed = NeuraiScripts.parsePartialFillScript(covenantHex);
  assert.equal(NeuraiScripts.bytesToHex(parsed.sellerPubKeyHash), 'dd'.repeat(20));
  assert.equal(NeuraiScripts.bytesToHex(parsed.paymentScriptPubKey), ownScript(ECDSA_V3).scriptHex);
});

test('the shipped parser refuses an order without the input-0 binding', () => {
  const unbound = orderFor(ECDSA_V3).replace(INPUT_ZERO_BINDING, '');
  assert.throws(() => NeuraiScripts.parsePartialFillScript(unbound), /input-0 binding/);
});

test('the shipped signer refuses to fill an order that is not input 0', () => {
  const covenantHex = orderFor(LEGACY);
  const order = NeuraiKey.getNoAuthAddress('xna-authscript-test', { witnessScript: covenantHex });
  const prevout = NeuraiCreateTransaction.createAssetTransferOutput(order.address, 'CAT', 100000000n, { assetMarker: 'xna' });
  const rawTx = NeuraiCreateTransaction.createUnsignedTransaction({
    inputs: [{ txid: 'aa'.repeat(32), vout: 0 }, { txid: 'bb'.repeat(32), vout: 0 }],
    outputs: [NeuraiCreateTransaction.createXnaOutput(LEGACY, 1000n)],
  });
  const orderUtxo = {
    address: order.address,
    assetName: 'CAT',
    txid: 'bb'.repeat(32),
    outputIndex: 0,
    script: prevout.scriptPubKeyHex,
    satoshis: 0,
    value: 0,
    bareScriptHint: { kind: 'covenant-fill', covenantScriptHex: covenantHex, amount: 100000000n },
  };
  assert.throws(() => NeuraiSignTransaction.sign('xna-test', rawTx, [orderUtxo], {}), /only be filled as input 0/);
});

test('a refund to the wallet\'s own script is named with its address in every family', async () => {
  for (const [address, network] of [[ECDSA_V3, 'xna-ecdsa-test'], [PQ_V2, 'xna-pq-test'], [LEGACY, 'xna-test']]) {
    const own = ownScript(address);
    assert.equal(await describeDestination(own.scriptHex, network, own), address);
  }
});

test('a refund to another witness script stays unnamed; another P2PKH is decoded', async () => {
  const own = ownScript(ECDSA_V3);
  assert.equal(await describeDestination(ownScript(PQ_V2).scriptHex, 'xna-ecdsa-test', own), null);
  assert.equal(await describeDestination(ownScript(LEGACY).scriptHex, 'xna-ecdsa-test', own), LEGACY);
});
