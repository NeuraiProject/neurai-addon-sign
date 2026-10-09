// Neurai Wallet — bring stored accounts to the address formats of neurai-key 5
// and the reset testnet.
//
// Two kinds of stored account change address, and neither needs the PIN:
//
// - A software PQ account stored the generic AuthScript v1 address of its
//   ML-DSA-44 key (`nq1p…` / `tnq1p…`). The PQ wallet is now the strict
//   witness v2 family, and the same mnemonic and index give the same key and
//   seed in both, so its address is re-derived from the stored public key
//   (`pq1z…` / `tpq1z…`) and the stored seed keeps signing.
// - Any other account with an address in the old AuthScript spelling — a
//   hardware PQ account, whose device keeps the v1 family — is re-encoded as
//   `nc1p…` / `tnc1p…`. Same witness program, so the same scriptPubKey.
//
// Legacy accounts do not change: the extension's labels keep deriving the
// addresses they always did (see networks.ts). On the testnet the outputs of
// the old chain are gone anyway; on mainnet nothing moves.
//
// The migration is idempotent and cheap, so every context that reads accounts
// runs it before using them instead of tracking a schema version.
//
// Only imports networks.ts: `node --test` loads this file as is.

import { isPQNetwork, toKeyNetwork, reencodeObsoleteAddress, type KeyNetworkLabel } from './networks.ts';

export interface StoredWallet {
  address?: string;
  publicKey?: string;
  network?: string;
  walletType?: string;
  [key: string]: unknown;
}

/** PQ witness v2 address of an ML-DSA-44 public key (NeuraiKey.pqPublicKeyToAddress). */
export type PQAddressFromPublicKey = (keyNetwork: KeyNetworkLabel, publicKey: string) => string;

/**
 * The migrated copy of one account, or null when it is already current.
 * Never throws: an account that cannot be migrated is left as it is.
 */
export function migrateWallet<T extends StoredWallet>(wallet: T, pqAddress: PQAddressFromPublicKey): T | null {
  if (!wallet || typeof wallet !== 'object' || !wallet.address) return null;

  if (wallet.walletType !== 'hardware' && isPQNetwork(wallet.network) && wallet.publicKey) {
    try {
      const address = pqAddress(toKeyNetwork(wallet.network), wallet.publicKey);
      return address && address !== wallet.address ? { ...wallet, address } : null;
    } catch (error) {
      console.warn('[migrations] could not re-derive the PQ address', { address: wallet.address, error });
      return null;
    }
  }

  const reencoded = reencodeObsoleteAddress(wallet.address);
  return reencoded ? { ...wallet, address: reencoded } : null;
}

/** Migrate every account of a record; `changed` tells whether anything moved. */
export function migrateAccounts<T extends StoredWallet>(
  accounts: Record<string, T | null> | null | undefined,
  pqAddress: PQAddressFromPublicKey
): { accounts: Record<string, T | null>; changed: boolean } {
  const out: Record<string, T | null> = { ...(accounts || {}) };
  let changed = false;
  for (const [id, wallet] of Object.entries(out)) {
    const migrated = wallet ? migrateWallet(wallet, pqAddress) : null;
    if (migrated) {
      out[id] = migrated;
      changed = true;
    }
  }
  return { accounts: out, changed };
}

/**
 * Migrate the accounts in chrome.storage.local: the account record and the
 * copy of the active wallet kept under the legacy single-wallet key. Writes
 * only when something changed. Needs the NeuraiKey global.
 *
 * @param keys - Storage keys of the account record and the active-wallet copy
 */
export async function runWalletMigrations(keys: { accounts: string; activeWallet: string }): Promise<boolean> {
  if (typeof NeuraiKey === 'undefined' || typeof NeuraiKey.pqPublicKeyToAddress !== 'function') return false;
  const pqAddress: PQAddressFromPublicKey = (network, publicKey) =>
    NeuraiKey.pqPublicKeyToAddress(network as NeuraiKeyPQNetwork, publicKey);

  const stored = await chrome.storage.local.get([keys.accounts, keys.activeWallet]);
  const updates: Record<string, unknown> = {};

  const record = stored[keys.accounts] as Record<string, StoredWallet | null> | undefined;
  if (record && typeof record === 'object') {
    const { accounts, changed } = migrateAccounts(record, pqAddress);
    if (changed) updates[keys.accounts] = accounts;
  }

  const active = stored[keys.activeWallet] as StoredWallet | undefined;
  const migratedActive = active ? migrateWallet(active, pqAddress) : null;
  if (migratedActive) updates[keys.activeWallet] = migratedActive;

  if (Object.keys(updates).length === 0) return false;
  await chrome.storage.local.set(updates);
  return true;
}
