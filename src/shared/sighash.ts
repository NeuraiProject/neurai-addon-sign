// Neurai Wallet — Sighash support matrix for the local signing path.
//
// The addon signs exclusively via `@neuraiproject/neurai-sign-transaction`,
// whose three call sites hardcode `HASH_TYPE = SIGHASH_ALL` (legacy P2PKH,
// AuthScript Legacy and AuthScript PQ). Until the library exposes a
// parameterized `hashType`, the addon accepts **only `ALL`**.
//
// Rather than silently signing with a sighash different from the one the
// caller requested, we reject unsupported values up front with a clearly
// named error. When the library gains support for variable sighashes, the
// only touch point needed here is `SUPPORTED_SIGHASHES`.

import type { SighashType } from '../types/index.js';

export type WalletSigningKind = 'legacy' | 'pq' | 'hardware';

/** Sighash values accepted by the current signing path. */
export const SUPPORTED_SIGHASHES: readonly SighashType[] = ['ALL'] as const;

export class UnsupportedSighashError extends Error {
  readonly sighashType: string;
  readonly walletKind: WalletSigningKind;

  constructor(sighashType: string, walletKind: WalletSigningKind) {
    super(
      `sighashType "${sighashType}" is not supported for ${walletKind} wallets. ` +
        `This addon signs exclusively SIGHASH_ALL. ` +
        `See plan-adaptacion-addon-sign-v2.md §2.2.`
    );
    this.name = 'UnsupportedSighashError';
    this.sighashType = sighashType;
    this.walletKind = walletKind;
  }
}

/**
 * Throws `UnsupportedSighashError` when the requested sighashType is not in
 * the current support matrix. The caller receives the error as a normal
 * response-level `{ error }` field.
 */
export function assertSighashSupported(
  sighashType: SighashType | string,
  walletKind: WalletSigningKind
): void {
  if (!SUPPORTED_SIGHASHES.includes(sighashType as SighashType)) {
    throw new UnsupportedSighashError(String(sighashType), walletKind);
  }
}
