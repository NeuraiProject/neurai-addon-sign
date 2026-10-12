// Neurai Wallet — Shared raw-transaction parser.
//
// Consolidates the two duplicated parsers that lived in `popup/expanded.ts`
// and `popup/popup.ts`, and reports per-input unlocking-material presence
// (`scriptSigLen`, `witnessItemCount`) so the `background` handler can compute
// the `complete` field after signing without pulling in `bitcoinjs-lib`.
//
// Reads with the codec of neurai-create-transaction (codec.ts): versions 1, 2
// and 3, with or without witness, NIP-014 reference inputs included.

import { txCodec } from './codec.ts';

export interface ParsedTxInput {
  txid: string;
  vout: number;
  sequence: number;
  /** Byte length of the scriptSig for this input. 0 if bare. */
  scriptSigLen: number;
  /** Number of witness stack items for this input. 0 if the input has no witness. */
  witnessItemCount: number;
}

export interface ParsedTxOutput {
  value: bigint;
  scriptHex: string;
}

export interface ParsedRawTransaction {
  version: number;
  inputs: ParsedTxInput[];
  outputs: ParsedTxOutput[];
  /** NIP-014 reference inputs (version 3 only; empty otherwise). */
  vrefin: Array<{ txid: string; vout: number }>;
  locktime: number;
}

/** Parse a Neurai raw transaction hex. */
export function parseRawTransaction(txHex: string): ParsedRawTransaction {
  const tx = txCodec().parseTransaction(String(txHex || '').trim());
  return {
    version: tx.version,
    inputs: tx.inputs.map((input) => ({
      txid: input.txid,
      vout: input.vout,
      sequence: input.sequence,
      scriptSigLen: input.scriptSigHex.length / 2,
      witnessItemCount: input.witness?.length ?? 0
    })),
    outputs: tx.outputs.map((output) => ({ value: output.valueSats, scriptHex: output.scriptPubKeyHex })),
    vrefin: tx.vrefin.map((ref) => ({ txid: ref.txid, vout: ref.vout })),
    locktime: tx.locktime
  };
}

/** Convenience wrapper that returns only the inputs array. */
export function parseRawTransactionInputs(txHex: string): ParsedTxInput[] {
  return parseRawTransaction(txHex).inputs;
}

/** Convenience wrapper that returns only the outputs array. */
export function parseRawTransactionOutputs(txHex: string): ParsedTxOutput[] {
  return parseRawTransaction(txHex).outputs;
}
