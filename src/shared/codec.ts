// Neurai Wallet — the transaction codec of neurai-create-transaction.
//
// Every module that reads or writes raw transactions goes through it: it knows
// the Neurai serialization, version 3 with its NIP-014 reference inputs
// (`vrefin`, between the outputs and the witness) included, which a parser
// written for Bitcoin misreads.
//
// It is the `NeuraiCreateTransaction` global of lib/NeuraiCreateTransaction.js:
// the background loads it in crypto-preload.ts and each page that handles
// transactions with a <script> tag. `node --test` loads the same bundle (see
// test/load-bundles.mjs). Read at call time, so importing this module needs
// nothing loaded.

export function txCodec(): NeuraiCreateTransactionStatic {
  const lib = (globalThis as { NeuraiCreateTransaction?: NeuraiCreateTransactionStatic }).NeuraiCreateTransaction;
  if (!lib || typeof lib.parseTransaction !== 'function') {
    throw new Error('The transaction codec is not loaded (lib/NeuraiCreateTransaction.js).');
  }
  return lib;
}
