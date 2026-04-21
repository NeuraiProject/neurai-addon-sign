// Neurai Wallet — Compute `complete` flag from a signed raw transaction.
//
// Semantics (contract of the addon's `complete` return field):
//
//   complete: true   ⇔   every input carries unlocking material
//                         (scriptSig with bytes OR non-empty witness stack).
//
//   complete: false  ⇔   at least one input is bare (no scriptSig AND no
//                         witness items).
//
// This does NOT validate that signatures are cryptographically correct or
// that the script would execute successfully — the authoritative validator
// is the node at `sendrawtransaction` time. A `complete: true` followed by
// a broadcast rejection is contractually possible and expected in cases
// like scriptSig garbage preserved by the signer, pre-filled unlocks that
// don't actually satisfy the prevout script, etc.
//
// Cases counted as complete:
//   - Inputs signed by the library (legacy P2PKH → scriptSig, AuthScript →
//     witness).
//   - Inputs whose scriptSig was pre-filled by the caller before signing
//     (e.g. a covenant fill's `<N> <0>` unlock). The library preserves
//     pre-existing scripts (shared.ts:590) and skips inputs without UTXO
//     data (shared.ts:616).

import { parseRawTransaction } from './parse-raw-tx.js';

export function isTxComplete(signedTxHex: string): boolean {
  const { inputs } = parseRawTransaction(signedTxHex);
  return inputs.every((i) => i.scriptSigLen > 0 || i.witnessItemCount > 0);
}
