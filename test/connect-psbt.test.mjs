// A transaction signed over Neurai Connect, with the shipped bundles: the
// window builds the PSBT (connect-psbt.ts), NeuraiWallet signs it (emulated
// with the bundle's NeuraiSignTransaction.signPsbt, which the phone uses), and
// the window turns the answer into the transaction. The result must be the
// transaction a local signer produces from the same keys.
//
// Run with:  npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadBundles } from './load-bundles.mjs';
import {
  buildConnectPsbt,
  connectSignInputs,
  describeConnectCancellation,
  finalizeConnectPsbt
} from '../src/shared/connect-psbt.ts';
import { sameTransaction } from '../src/shared/neurai-connect.ts';

loadBundles('NeuraiKey', 'NeuraiScripts', 'NeuraiSignESP32', 'NeuraiSignTransaction');
const { NeuraiKey, NeuraiScripts, NeuraiCreateTransaction: CT, NeuraiSignTransaction } = globalThis;

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const SELLER = NeuraiKey.getAddressPair('xna-legacy-test', MNEMONIC, 0, 0).external;
const OTHER = NeuraiKey.getAddressPair('xna-legacy-test', MNEMONIC, 0, 1).external;
const ECDSA = NeuraiKey.getAddressByPath('xna-test', NeuraiKey.getHDKey('xna-test', MNEMONIC), "m/84'/1'/0'/0/0");
const COIN = 100000000n;
const MARKER = { assetMarker: 'xna' };
const hex = (bytes) => Buffer.from(bytes).toString('hex');
const scriptOf = (address) => hex(CT.encodeDestinationScript(address));
const xnaOut = (address, sats) => ({ valueSats: sats, scriptPubKeyHex: scriptOf(address) });

let counter = 0;
function previousTx(outputs, version = 2) {
  counter += 1;
  return CT.serializeTransaction({
    version,
    inputs: [{ txid: counter.toString(16).padStart(64, '0'), vout: 0, scriptSigHex: '', sequence: 0xffffffff }],
    outputs,
    vrefin: version === 3 ? [{ txid: 'ab'.repeat(32), vout: 0 }] : [],
    locktime: 0
  });
}

const hash160 = (pubkeyHex) =>
  new Uint8Array(createHash('ripemd160').update(createHash('sha256').update(Buffer.from(pubkeyHex, 'hex')).digest()).digest());

/** A partial-fill order paying `seller`, cancelled with its key (neurai-scripts ≥ 0.10.0). */
function covenantFor(seller) {
  const covenantHex = NeuraiScripts.buildPartialFillScriptHex({
    paymentAddress: seller.address,
    sellerPubKeyHash: hash160(seller.publicKey),
    tokenId: 'STAYTOKEN',
    unitPriceSats: 1n
  });
  const covenantAddress = NeuraiKey.getNoAuthAddress('xna-authscript-test', { witnessScript: Buffer.from(covenantHex, 'hex') }).address;
  return { covenantHex, covenantAddress };
}

/** The cancel transaction the DEX builds: covenant input 0, fee input 1; token and change back to the seller. */
function cancelOrder(seller, { refundTo = seller.address, refundAmount = 7n * COIN } = {}) {
  const { covenantHex, covenantAddress } = covenantFor(seller);
  const prev = previousTx([
    CT.createAssetTransferOutput(covenantAddress, 'STAYTOKEN', 7n * COIN, MARKER),
    xnaOut(seller.address, 2n * COIN)
  ]);
  const txid = CT.computeTxid(prev);
  const txHex = CT.serializeTransaction({
    version: 2,
    inputs: [0, 1].map((vout) => ({ txid, vout, scriptSigHex: '', sequence: 0xffffffff })),
    outputs: [
      CT.createAssetTransferOutput(refundTo, 'STAYTOKEN', refundAmount, MARKER),
      xnaOut(seller.address, 2n * COIN - 5000000n)
    ],
    vrefin: [],
    locktime: 0
  });
  // What the DEX hands to the extension: no address, the hint on the covenant input.
  const utxos = [
    { txid, vout: 0, scriptPubKey: CT.parseTransaction(prev).outputs[0].scriptPubKeyHex, amount: 0, bareScriptHint: { kind: 'covenant-cancel-legacy', covenantScriptHex: covenantHex } },
    { txid, vout: 1, scriptPubKey: scriptOf(seller.address), amount: 2 }
  ];
  return { txHex, prev, txid, utxos, covenantHex };
}

/** NeuraiWallet: sign the listed inputs with the account's key. */
function phoneSigns(psbt, inputs, keys) {
  return NeuraiSignTransaction.signPsbt('xna-test', psbt, keys, { inputs: inputs.map(({ index, address }) => ({ index, address })), debug: false });
}

for (const [family, seller] of [['P2PKH', SELLER], ['ECDSA v3', ECDSA]]) {
  test(`an order of a ${family} seller is cancelled through the PSBT, as a local signer would`, async () => {
    const order = cancelOrder(seller);
    const inputs = connectSignInputs(order.txHex, order.utxos, seller.address);
    assert.deepEqual(inputs, [
      { index: 0, address: seller.address, witnessScript: order.covenantHex },
      { index: 1, address: seller.address }
    ]);
    const psbt = buildConnectPsbt('xna-test', order.txHex, { [order.txid]: order.prev }, inputs);
    assert.equal(CT.decodePsbt(psbt).inputs[0].witnessScript, order.covenantHex);

    const signedPsbt = phoneSigns(psbt, inputs, { [seller.address]: seller });
    const signedTxHex = finalizeConnectPsbt(order.txHex, psbt, signedPsbt, [0, 1]);
    assert.equal(sameTransaction(order.txHex, signedTxHex), true);

    const local = NeuraiSignTransaction.sign('xna-test', order.txHex, [
      { address: seller.address, assetName: 'STAYTOKEN', txid: order.txid, outputIndex: 0, script: order.utxos[0].scriptPubKey, satoshis: 0, value: 0, bareScriptHint: order.utxos[0].bareScriptHint },
      { address: seller.address, assetName: 'XNA', txid: order.txid, outputIndex: 1, script: order.utxos[1].scriptPubKey, satoshis: 2n * COIN, value: 2n * COIN }
    ], { [seller.address]: seller }, { debug: false });
    assert.equal(signedTxHex, local);
  });
}

test('the window describes the cancellation from the PSBT: what the order holds, where each output goes', async () => {
  const order = cancelOrder(SELLER);
  const inputs = connectSignInputs(order.txHex, order.utxos, SELLER.address);
  const psbt = buildConnectPsbt('xna-test', order.txHex, { [order.txid]: order.prev }, inputs);
  const own = { address: SELLER.address, scriptHex: scriptOf(SELLER.address) };
  const text = await describeConnectCancellation(psbt, 'xna-test', own);
  assert.match(text, /Cancel sell order \(input #0\): 7 STAYTOKEN locked in it/);
  assert.match(text, new RegExp(`#0  7 STAYTOKEN → ${SELLER.address} \\(this account\\)`));
  assert.match(text, new RegExp(`#1  1\\.95 XNA → ${SELLER.address} \\(this account\\)`));

  const elsewhere = cancelOrder(SELLER, { refundTo: OTHER.address });
  const otherPsbt = buildConnectPsbt('xna-test', elsewhere.txHex, { [elsewhere.txid]: elsewhere.prev }, connectSignInputs(elsewhere.txHex, elsewhere.utxos, SELLER.address));
  const otherText = await describeConnectCancellation(otherPsbt, 'xna-test', own);
  assert.match(otherText, new RegExp(`#0  7 STAYTOKEN → ${OTHER.address}$`, 'm'));
});

test('hints the wallet cannot sign are refused before anything is sent', () => {
  const order = cancelOrder(SELLER);
  const pq = order.utxos.map((u, i) => (i === 0 ? { ...u, bareScriptHint: { kind: 'covenant-cancel-pq', covenantScriptHex: order.covenantHex } } : u));
  assert.throws(() => connectSignInputs(order.txHex, pq, SELLER.address), /post-quantum key/);
  const fill = order.utxos.map((u, i) => (i === 0 ? { ...u, bareScriptHint: { kind: 'covenant-fill', covenantScriptHex: order.covenantHex, amount: 1n } } : u));
  assert.throws(() => connectSignInputs(order.txHex, fill, SELLER.address), /"covenant-fill" spend/);
});

test("an answer missing this account's signature, or for another transaction, is refused", () => {
  const order = cancelOrder(SELLER);
  const inputs = connectSignInputs(order.txHex, order.utxos, SELLER.address);
  const psbt = buildConnectPsbt('xna-test', order.txHex, { [order.txid]: order.prev }, inputs);
  const onlyCovenant = phoneSigns(psbt, [inputs[0]], { [SELLER.address]: SELLER });
  assert.throws(() => finalizeConnectPsbt(order.txHex, psbt, onlyCovenant, [0, 1]), /did not sign input 1/);

  const other = cancelOrder(SELLER, { refundAmount: 6n * COIN });
  const otherInputs = connectSignInputs(other.txHex, other.utxos, SELLER.address);
  const otherPsbt = buildConnectPsbt('xna-test', other.txHex, { [other.txid]: other.prev }, otherInputs);
  const forOther = phoneSigns(otherPsbt, otherInputs, { [SELLER.address]: SELLER });
  assert.throws(() => finalizeConnectPsbt(order.txHex, psbt, forOther, [0, 1]), /different transactions/);
});

test("a buy: the phone signs the buyer's input of a version-3 transaction, the other input keeps its unlocking data", () => {
  const prev = previousTx([xnaOut(SELLER.address, 3n * COIN), xnaOut(OTHER.address, 5n * COIN)], 3);
  const txid = CT.computeTxid(prev);
  const foreignWitness = ['01', 'c0ffee'];
  const tx = (witness) => CT.serializeTransaction({
    version: 3,
    inputs: [
      { txid, vout: 0, scriptSigHex: '', sequence: 0xffffffff, witness },
      { txid, vout: 1, scriptSigHex: '', sequence: 0xffffffff }
    ],
    outputs: [xnaOut(SELLER.address, 4n * COIN), xnaOut(OTHER.address, 3n * COIN)],
    vrefin: [{ txid: 'cd'.repeat(32), vout: 1 }],
    locktime: 0
  });
  const txHex = tx(foreignWitness);
  const utxos = [{ txid, vout: 1, scriptPubKey: scriptOf(OTHER.address), amount: 5, address: OTHER.address }];
  const inputs = connectSignInputs(txHex, utxos, SELLER.address);
  assert.deepEqual(inputs, [{ index: 1, address: OTHER.address }]);
  const psbt = buildConnectPsbt('xna-test', txHex, { [txid]: prev }, inputs);
  assert.equal(CT.decodePsbt(psbt).unsignedTx.version, 3);
  const signedTxHex = finalizeConnectPsbt(txHex, psbt, phoneSigns(psbt, inputs, { [OTHER.address]: OTHER }), [1]);
  const signed = CT.parseTransaction(signedTxHex);
  assert.deepEqual(signed.inputs[0].witness, foreignWitness);
  assert.ok(signed.inputs[1].scriptSigHex.length > 0);
  assert.deepEqual(signed.vrefin, [{ txid: 'cd'.repeat(32), vout: 1 }]);
  assert.equal(sameTransaction(txHex, signedTxHex), true);
});
