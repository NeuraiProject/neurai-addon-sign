// Neurai Wallet — keep other signers' unlocking data across a PSBT round trip.
//
// A site may hand over a transaction where some inputs are already signed by
// someone else (a swap: the seller's input, signed SINGLE|ANYONECANPAY, plus
// the buyer's inputs to sign; a partial-fill order unlocked by its covenant
// witness). A PSBT built from the raw transaction carries none of that, so the
// transaction finalized from the wallet's PSBT would lose it. The signatures
// this account adds commit to the prevouts, not to the other inputs' scriptSig
// or witness, so putting those back afterwards is sound.
//
// Reads and writes with the codec of neurai-create-transaction (codec.ts), so
// version-3 transactions (NIP-014 reference inputs) are handled like any other.

import { txCodec } from './codec.ts';

type DecodedTransaction = ReturnType<NeuraiCreateTransactionStatic['parseTransaction']>;

function parse(txHex: string): DecodedTransaction {
  return txCodec().parseTransaction(String(txHex || '').trim());
}

function hasUnlockingData(input: DecodedTransaction['inputs'][number]): boolean {
  return input.scriptSigHex.length > 0 || (input.witness?.length ?? 0) > 0;
}

/**
 * True when both are the same transaction apart from unlocking data: same
 * version, outpoints, sequences, outputs, reference inputs and locktime.
 */
function sameShape(a: DecodedTransaction, b: DecodedTransaction): boolean {
  return (
    a.version === b.version &&
    a.locktime === b.locktime &&
    a.inputs.length === b.inputs.length &&
    a.outputs.length === b.outputs.length &&
    a.vrefin.length === b.vrefin.length &&
    a.inputs.every((input, i) =>
      input.txid === b.inputs[i].txid && input.vout === b.inputs[i].vout && input.sequence === b.inputs[i].sequence) &&
    a.outputs.every((output, i) =>
      output.valueSats === b.outputs[i].valueSats && output.scriptPubKeyHex === b.outputs[i].scriptPubKeyHex) &&
    a.vrefin.every((ref, i) => ref.txid === b.vrefin[i].txid && ref.vout === b.vrefin[i].vout)
  );
}

/** Inputs of `txHex` that already carry a scriptSig or a witness. */
export function signedInputIndexes(txHex: string): number[] {
  return parse(txHex).inputs.flatMap((input, i) => (hasUnlockingData(input) ? [i] : []));
}

/**
 * `signedHex` with the scriptSig and witness of every input NOT in
 * `ownIndexes` taken from `originalHex`. The two must be the same transaction
 * apart from unlocking data; that is checked here too.
 */
export function keepForeignUnlockingData(originalHex: string, signedHex: string, ownIndexes: readonly number[]): string {
  const original = parse(originalHex);
  const foreign = original.inputs
    .map((_, i) => i)
    .filter((i) => !ownIndexes.includes(i) && hasUnlockingData(original.inputs[i]));
  if (foreign.length === 0) return signedHex;

  const signed = parse(signedHex);
  if (!sameShape(original, signed)) throw new Error('The signed transaction is not the one that was sent for signing');

  for (const i of foreign) {
    signed.inputs[i] = { ...signed.inputs[i], scriptSigHex: original.inputs[i].scriptSigHex, witness: original.inputs[i].witness };
  }
  return txCodec().serializeTransaction(signed);
}

/**
 * True when `signedHex` is `unsignedHex` with unlocking data added or
 * changed, nothing else; false as well when either does not parse.
 */
export function sameTransactionShape(unsignedHex: string, signedHex: string): boolean {
  try {
    return sameShape(parse(unsignedHex), parse(signedHex));
  } catch {
    return false;
  }
}

/** Round trip, for tests: parse and serialize unchanged. */
export function reserialize(txHex: string): string {
  return txCodec().serializeTransaction(parse(txHex));
}
