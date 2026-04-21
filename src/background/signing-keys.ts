// Neurai Wallet — Material de clave para el signer local.
//
// Extrae la lógica inline de `signRawTxForPage` (legacy vs PQ) en helpers
// reutilizables. **Preserva el comportamiento actual byte-a-byte**: los
// mensajes de error, el orden de fallbacks y la llamada a
// `NEURAI_UTILS.decryptTextWithPin` se mantienen idénticos al código
// original de `background.ts:540-588`.

import { NEURAI_UTILS } from '../shared/utils.js';
import type { WalletData, WalletSettings, WalletNetwork } from '../types/index.js';

type PQNetwork = Extract<WalletNetwork, 'xna-pq' | 'xna-pq-test'>;

/**
 * Resolve the legacy P2PKH WIF for the active wallet. Handles plain storage
 * and PIN-encrypted storage. Throws with the exact message the inline code
 * used to emit so error output stays stable for dApps.
 */
export async function resolveWif(
  walletData: WalletData,
  walletSettings: WalletSettings,
  pin: string | null
): Promise<string> {
  if (walletData.privateKey) return walletData.privateKey;

  if (walletData.privateKeyEnc) {
    if (!walletSettings.pinHash) {
      throw new Error('Wallet key is encrypted but PIN is not configured');
    }
    if (!pin) {
      throw new Error('PIN is required to decrypt wallet key');
    }
    const wif = await NEURAI_UTILS.decryptTextWithPin(walletData.privateKeyEnc, pin);
    if (!wif) throw new Error('Unable to access wallet private key');
    return wif;
  }

  throw new Error('Unable to access wallet private key');
}

/**
 * Resolve the AuthScript PQ seedKey. Falls back to re-deriving from the
 * mnemonic (and optional passphrase) when the seedKey is not stored
 * directly. Mirrors the flow at `background.ts:540-561`.
 */
export async function resolveSeedKey(
  walletData: WalletData,
  walletSettings: WalletSettings,
  network: PQNetwork,
  pin: string | null
): Promise<string> {
  if (walletData.seedKey) return walletData.seedKey;

  if (walletData.seedKeyEnc) {
    if (!walletSettings.pinHash) {
      throw new Error('Wallet key is encrypted but PIN is not configured');
    }
    if (!pin) {
      throw new Error('PIN is required to decrypt wallet key');
    }
    const seedKey = await NEURAI_UTILS.decryptTextWithPin(walletData.seedKeyEnc, pin);
    if (seedKey) return seedKey;
  }

  // Fallback: re-derive from mnemonic.
  let mnemonic: string | null = walletData.mnemonic || null;
  if (!mnemonic && walletData.mnemonicEnc) {
    if (!pin) {
      throw new Error('PIN is required to decrypt wallet key');
    }
    mnemonic = await NEURAI_UTILS.decryptTextWithPin(walletData.mnemonicEnc, pin);
  }
  if (!mnemonic) {
    throw new Error('Unable to access wallet key for AuthScript PQ signing');
  }

  let passphrase = '';
  if (walletData.passphraseEnc) {
    passphrase = (await NEURAI_UTILS.decryptTextWithPin(walletData.passphraseEnc, pin || '')) || '';
  }
  const pqAddr = NeuraiKey.getPQAddress(network, mnemonic, 0, 0, passphrase || undefined);
  return pqAddr.seedKey;
}

export type WalletSigningKind = 'legacy' | 'pq';

/**
 * Shape of the third argument accepted by `NeuraiSignTransaction.sign(...)`
 * for a single-address wallet. Legacy takes a WIF string; PQ takes an
 * object with the seedKey.
 */
export type SigningKeyMap = Record<string, string | { seedKey: string }>;

/**
 * Build the `privateKeys` argument for `NeuraiSignTransaction.sign(...)`
 * from the current wallet state. Throws with a clear error if the wallet
 * is locked or the encrypted material cannot be decrypted.
 */
export async function resolvePrivateKeysForSigning(
  walletData: WalletData,
  walletSettings: WalletSettings,
  network: WalletNetwork,
  walletKind: WalletSigningKind,
  pin: string | null
): Promise<SigningKeyMap> {
  if (!walletData.address) {
    throw new Error('No address available');
  }

  if (walletKind === 'pq') {
    const seedKey = await resolveSeedKey(
      walletData,
      walletSettings,
      network as PQNetwork,
      pin
    );
    return { [walletData.address]: { seedKey } };
  }

  const wif = await resolveWif(walletData, walletSettings, pin);
  return { [walletData.address]: wif };
}
