// Neurai Wallet — the PSBT of a transaction signed over Neurai Connect.
//
// The Neurai Connect window (connect-sign.ts) sends NeuraiWallet a PSBT in
// the Neurai profile of neurai-create-transaction: the transaction to sign,
// every previous transaction, and, for the input of a partial-fill order this
// account cancels, the covenant as `witnessScript`. The wallet answers with
// partial signatures (P2PKH, ECDSA witness v3) and, for the covenant, the
// final witness of its cancel branch. This module builds that PSBT and turns
// the answer into the signed transaction.
//
// Uses the NeuraiSignESP32, NeuraiCreateTransaction and NeuraiScripts globals
// at call time (lib/*.js, loaded by connect-sign.html; tests load the bundles).

import { describeDestination, type OwnScript } from './script-to-address.ts';
import { keepForeignUnlockingData, sameTransactionShape } from './tx-merge.ts';
import { parseRawTransaction } from './parse-raw-tx.ts';
import type { Utxo, WalletNetwork } from '../types/index.js';

/** An input this account signs: the address whose key signs it and, for a covenant cancel, the covenant. */
export interface ConnectSignInput {
  index: number;
  address: string;
  witnessScript?: string;
}

/**
 * The inputs of `txHex` this account signs: those the site listed in `utxos`.
 * A plain input is signed by the address the site gives for it (the account's
 * by default). The input of an order this account cancels
 * (`covenant-cancel-legacy`) is signed by the account's own key, the covenant's
 * cancel key; any other hint cannot be signed with the wallet's ECDSA keys.
 */
export function connectSignInputs(txHex: string, utxos: readonly Utxo[], accountAddress: string): ConnectSignInput[] {
  const parsed = parseRawTransaction(txHex);
  return parsed.inputs.flatMap((input, index) => {
    const utxo = utxos.find((u) => String(u.txid).toLowerCase() === input.txid && Number(u.vout) === input.vout);
    if (!utxo) return [];
    const hint = utxo.bareScriptHint as { kind?: string; covenantScriptHex?: string } | undefined;
    if (!hint) return [{ index, address: utxo.address || accountAddress }];
    if (hint.kind === 'covenant-cancel-legacy' && hint.covenantScriptHex) {
      return [{ index, address: accountAddress, witnessScript: String(hint.covenantScriptHex).toLowerCase() }];
    }
    if (hint.kind === 'covenant-cancel-pq') {
      throw new Error('This order is cancelled with a post-quantum key, which NeuraiWallet does not sign over Neurai Connect.');
    }
    throw new Error(`Input ${index} needs a "${hint.kind}" spend, which NeuraiWallet does not sign over Neurai Connect.`);
  });
}

/** The PSBT sent to the wallet: every input with its previous transaction, covenant inputs with their covenant. */
export function buildConnectPsbt(
  psbtNetwork: 'xna' | 'xna-test',
  txHex: string,
  prevTxs: Readonly<Record<string, string>>,
  inputs: readonly ConnectSignInput[]
): string {
  const parsed = parseRawTransaction(txHex);
  return NeuraiSignESP32.buildPSBTFromRawTransaction({
    network: psbtNetwork,
    rawUnsignedTransaction: txHex,
    inputs: parsed.inputs.map((input, index) => {
      const witnessScript = inputs.find((own) => own.index === index)?.witnessScript;
      return {
        txid: input.txid,
        vout: input.vout,
        sequence: input.sequence,
        rawTxHex: prevTxs[input.txid],
        ...(witnessScript ? { witnessScript } : {})
      };
    })
  });
}

/**
 * The signed transaction from the wallet's answer. The answer is combined with
 * the PSBT that was sent (a field they disagree on is an error), only this
 * account's inputs are finalized, and the transaction is extracted with the
 * other inputs left open, then given back the unlocking data they had in
 * `txHex` (another signer's, or a covenant's). Throws when an input of this
 * account is not signed or the result is not the transaction that was sent.
 */
export function finalizeConnectPsbt(txHex: string, psbt: string, signedPsbt: string, ownIndexes: readonly number[]): string {
  const codec = NeuraiCreateTransaction;
  const combined = codec.combinePsbts(psbt, signedPsbt);
  const decoded = codec.decodePsbt(combined);
  const unsigned = ownIndexes.filter((index) => {
    const input = decoded.inputs[index];
    return input.partialSig.length === 0 && input.finalScriptSig === undefined && input.finalScriptWitness === undefined;
  });
  if (unsigned.length > 0) {
    throw new Error(`NeuraiWallet did not sign input${unsigned.length > 1 ? 's' : ''} ${unsigned.join(', ')}.`);
  }
  const extracted = codec.extractPsbtTransaction(codec.finalizePsbt(combined, { inputs: [...ownIndexes] }), { allowIncomplete: true });
  const signedTxHex = keepForeignUnlockingData(txHex, extracted.hex, ownIndexes);
  if (!sameTransactionShape(txHex, signedTxHex)) {
    throw new Error('NeuraiWallet returned a different transaction from the one sent for signing.');
  }
  return signedTxHex;
}

function formatUnits(raw: bigint): string {
  const sign = raw < 0n ? '-' : '';
  const value = raw < 0n ? -raw : raw;
  const fraction = (value % 100000000n).toString().padStart(8, '0').replace(/0+$/, '');
  return sign + (value / 100000000n).toString() + (fraction ? '.' + fraction : '');
}

/**
 * What the window shows for a PSBT with covenant inputs: what each order holds,
 * read from its previous output, and where every output goes. Everything comes
 * from the PSBT (previous transactions checked against their outpoints), not
 * from the site's description of the order.
 */
export async function describeConnectCancellation(
  psbt: string,
  network: WalletNetwork | string,
  own: OwnScript | null
): Promise<string> {
  const decoded = NeuraiCreateTransaction.decodePsbt(psbt);
  const lines: string[] = [];
  decoded.inputs.forEach((input, index) => {
    if (input.witnessScript === undefined) return;
    const previous = NeuraiCreateTransaction.getPsbtPreviousOutput(decoded, index);
    const asset = NeuraiScripts.splitAssetWrappedScriptPubKey(previous.scriptPubKeyHex).assetTransfer;
    lines.push(
      `Cancel sell order (input #${index}): ` +
        (asset ? `${formatUnits(asset.amountRaw)} ${asset.assetName} locked in it` : `${formatUnits(previous.valueSats)} XNA locked in it`)
    );
  });
  lines.push('', 'Outputs:');
  for (const [index, output] of decoded.unsignedTx.outputs.entries()) {
    const split = NeuraiScripts.splitAssetWrappedScriptPubKey(output.scriptPubKeyHex);
    const amount = split.assetTransfer
      ? `${formatUnits(split.assetTransfer.amountRaw)} ${split.assetTransfer.assetName}`
      : `${formatUnits(output.valueSats)} XNA`;
    const address = await describeDestination(split.prefixHex, network, own);
    const mine = own && split.prefixHex.toLowerCase() === own.scriptHex.toLowerCase() ? ' (this account)' : '';
    lines.push(`#${index}  ${amount} → ${address ?? split.prefixHex}${mine}`);
  }
  return lines.join('\n');
}
