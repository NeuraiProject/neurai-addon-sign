// Neurai Wallet — every address of a NeuraiWallet account, from its extended
// public key.
//
// A Neurai Connect session exposes one address. NeuraiWallet itself uses many:
// a receive address per payment and a change address per spend, so the
// funds of the account are spread over them. When the wallet shares the
// account's extended public key (`neurai_getAccountXpub`, after the user
// approves it on the phone), the extension derives the receive (`0/i`) and
// change (`1/i`) addresses itself and finds the used ones with a gap limit,
// like any HD wallet. It shows their balance and history, and spends their
// UTXOs (the phone signs each input with `signPsbt`). Change from a spend
// made here goes back to the session address: the extension does not hand
// out new addresses.
//
// The key is the ACCOUNT key (`m/44'/coin'/0'` Legacy, `m/84'/coin'/0'` ECDSA
// witness v3), checked against the account before it is stored: its family
// must match, and the session address must be one of its children.
//
// Pure helpers with injected dependencies, so `node --test` can load them.

import { isTestnetNetwork, toKeyNetwork, walletFamily } from './networks.ts';

export interface ConnectAccountXpub {
  xpub: string;
  path: string;
  addressType: 'legacy' | 'ecdsa';
}

/** Used addresses found by the last scan, per branch. */
export interface ConnectAddressCache {
  receive: string[];
  change: string[];
  scannedAt: number;
}

/** BIP32 version bytes of Neurai extended keys (`xpub` / `tpub`). */
export const BIP32_VERSIONS = Object.freeze({
  mainnet: { public: 0x0488b21e, private: 0x0488ade4 },
  testnet: { public: 0x043587cf, private: 0x04358394 }
});

/** Consecutive unused addresses that end a branch (BIP44). */
export const GAP_LIMIT = 20;

/** Never derive more than this per branch, whatever the chain says. */
const MAX_PER_BRANCH = 2000;

/**
 * Check what the wallet answered to `neurai_getAccountXpub` against the
 * account it is for. Throws with the reason when it does not fit.
 */
export function parseAccountXpubAnswer(answer: unknown, network: string): ConnectAccountXpub {
  const a = (answer ?? {}) as Partial<ConnectAccountXpub>;
  if (typeof a.xpub !== 'string' || typeof a.path !== 'string' || (a.addressType !== 'legacy' && a.addressType !== 'ecdsa')) {
    throw new Error('NeuraiWallet sent a malformed account public key.');
  }
  const family = walletFamily(network);
  if (a.addressType !== family) {
    throw new Error(`NeuraiWallet sent the key of a ${a.addressType} account for a ${family} address.`);
  }
  const testnet = isTestnetNetwork(network);
  const expectedPath = `m/${family === 'ecdsa' ? 84 : 44}'/${testnet ? 1 : 1900}'/0'`;
  if (a.path !== expectedPath) {
    throw new Error(`NeuraiWallet sent the key of ${a.path}; this account is ${expectedPath}.`);
  }
  if (!a.xpub.startsWith(testnet ? 'tpub' : 'xpub')) {
    throw new Error('NeuraiWallet sent an extended key of the other chain.');
  }
  return { xpub: a.xpub, path: a.path, addressType: a.addressType };
}

/** Address at `branch` (0 receive, 1 change) and `index` of the account. */
export type DeriveAddress = (branch: 0 | 1, index: number) => string;

interface ExtendedKey {
  deriveChild(index: number): ExtendedKey;
  publicKey: Uint8Array | null;
}

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/**
 * Derive addresses from the account key.
 *
 * @param fromExtendedKey - `HDKey.fromExtendedKey` of @scure/bip32
 * @param publicKeyToAddress - `NeuraiKey.publicKeyToAddress` (neurai-key 5 label, hex key)
 */
export function createAddressDeriver(
  info: ConnectAccountXpub,
  network: string,
  fromExtendedKey: (xpub: string, versions: { public: number; private: number }) => ExtendedKey,
  publicKeyToAddress: (keyNetwork: string, publicKeyHex: string) => string
): DeriveAddress {
  const root = fromExtendedKey(info.xpub, isTestnetNetwork(network) ? BIP32_VERSIONS.testnet : BIP32_VERSIONS.mainnet);
  const branches = [root.deriveChild(0), root.deriveChild(1)];
  const keyNetwork = toKeyNetwork(network);
  const cache = new Map<string, string>();
  return (branch, index) => {
    const key = branch + '/' + index;
    let address = cache.get(key);
    if (!address) {
      const publicKey = branches[branch].deriveChild(index).publicKey;
      if (!publicKey) throw new Error('Extended key without a public key');
      address = publicKeyToAddress(keyNetwork, toHex(publicKey));
      cache.set(key, address);
    }
    return address;
  };
}

/** Which of `addresses` have been used: any delta, confirmed or in the mempool. */
export type UsedAddressCheck = (addresses: string[]) => Promise<Set<string>>;

/** A `UsedAddressCheck` over the node's address index. */
export function rpcUsedAddressCheck(rpc: (method: string, params: unknown[]) => Promise<unknown>): UsedAddressCheck {
  return async (addresses) => {
    const [deltas, mempool] = await Promise.all([
      rpc('getaddressdeltas', [{ addresses, assetName: '*' }]),
      rpc('getaddressmempool', [{ addresses }]).catch(() => [])
    ]);
    const used = new Set<string>();
    for (const entry of [...(Array.isArray(deltas) ? deltas : []), ...(Array.isArray(mempool) ? mempool : [])]) {
      const address = (entry as { address?: unknown })?.address;
      if (typeof address === 'string') used.add(address);
    }
    return used;
  };
}

export interface DiscoveredAddresses {
  receive: string[];
  change: string[];
  /** Every address derived during the scan, used or not. */
  derived: Set<string>;
}

/**
 * Scan both branches until `gap` consecutive unused addresses, one batch of
 * `gap` addresses per request.
 */
export async function discoverAddresses(derive: DeriveAddress, isUsed: UsedAddressCheck, gap = GAP_LIMIT): Promise<DiscoveredAddresses> {
  const derived = new Set<string>();
  const scan = async (branch: 0 | 1): Promise<string[]> => {
    const used: string[] = [];
    let lastUsed = -1;
    for (let start = 0; start <= lastUsed + gap && start < MAX_PER_BRANCH; start += gap) {
      const batch = Array.from({ length: gap }, (_, i) => derive(branch, start + i));
      batch.forEach((address) => derived.add(address));
      const found = await isUsed(batch);
      batch.forEach((address, i) => {
        if (found.has(address)) {
          used.push(address);
          lastUsed = start + i;
        }
      });
    }
    return used;
  };
  const [receive, change] = await Promise.all([scan(0), scan(1)]);
  return { receive, change, derived };
}

interface StoredConnectWallet {
  address?: unknown;
  walletType?: unknown;
  connectXpub?: unknown;
  connectAddresses?: unknown;
}

/** Every address a stored account watches: the session address first. */
export function walletAddressSet(wallet: StoredConnectWallet | null | undefined): string[] {
  if (!wallet || typeof wallet.address !== 'string') return [];
  const cache = wallet.walletType === 'connect' ? (wallet.connectAddresses as ConnectAddressCache | null | undefined) : null;
  return [...new Set([wallet.address, ...(cache?.receive || []), ...(cache?.change || [])])];
}

/** Whether a stored account follows its whole NeuraiWallet account. */
export function watchesConnectAccount(wallet: StoredConnectWallet | null | undefined): boolean {
  return !!wallet && wallet.walletType === 'connect' && !!wallet.connectXpub;
}

// ── Runtime: scan with the bundled libraries and keep the result ────────────

/** A scan younger than this is reused instead of asking the node again. */
export const RESCAN_AFTER_MS = 60_000;

/** `DeriveAddress` built from the NeuraiConnectSDK (HDKey) and NeuraiKey globals of the page. */
export function runtimeAddressDeriver(info: ConnectAccountXpub, network: string): DeriveAddress {
  if (typeof NeuraiConnectSDK === 'undefined' || typeof NeuraiKey === 'undefined') {
    throw new Error('lib/NeuraiConnect.js and lib/NeuraiKey.js must be loaded to derive the account addresses.');
  }
  return createAddressDeriver(
    info,
    network,
    (xpub, versions) => NeuraiConnectSDK.HDKey.fromExtendedKey(xpub, versions),
    (keyNetwork, publicKeyHex) => NeuraiKey.publicKeyToAddress(keyNetwork as NeuraiKeyNetwork, publicKeyHex)
  );
}

/**
 * Scan the account of `wallet` (when it has a key and the last scan is old)
 * and store the result on every stored copy of that account. Returns the
 * cache in use; never throws on a failed scan, which keeps the previous one.
 */
export async function refreshConnectAddresses(
  wallet: StoredConnectWallet & { network?: unknown; connectChainId?: unknown },
  rpc: (method: string, params: unknown[]) => Promise<unknown>,
  storageKeys: { accounts: string; activeWallet: string },
  force = false
): Promise<ConnectAddressCache | null> {
  if (!watchesConnectAccount(wallet)) return null;
  const previous = (wallet.connectAddresses as ConnectAddressCache | null | undefined) || null;
  if (!force && previous && Date.now() - previous.scannedAt < RESCAN_AFTER_MS) return previous;
  try {
    const network = String(wallet.network || '');
    const found = await discoverAddresses(runtimeAddressDeriver(wallet.connectXpub as ConnectAccountXpub, network), rpcUsedAddressCheck(rpc));
    const cache: ConnectAddressCache = { receive: found.receive, change: found.change, scannedAt: Date.now() };
    await storeConnectAddresses(String(wallet.address), wallet.connectChainId, cache, storageKeys);
    return cache;
  } catch (error) {
    console.warn('[neurai-connect] address scan failed', error);
    return previous;
  }
}

async function storeConnectAddresses(
  address: string,
  chainId: unknown,
  cache: ConnectAddressCache,
  keys: { accounts: string; activeWallet: string }
): Promise<void> {
  const stored = await chrome.storage.local.get([keys.accounts, keys.activeWallet]);
  const matches = (wallet: StoredConnectWallet & { connectChainId?: unknown } | null | undefined) =>
    !!wallet && wallet.walletType === 'connect' && wallet.address === address && wallet.connectChainId === chainId;
  const updates: Record<string, unknown> = {};
  const accounts = (stored[keys.accounts] || {}) as Record<string, (StoredConnectWallet & { connectChainId?: unknown }) | null>;
  let changed = false;
  const next = { ...accounts };
  for (const [id, wallet] of Object.entries(accounts)) {
    if (matches(wallet)) { next[id] = { ...wallet!, connectAddresses: cache }; changed = true; }
  }
  if (changed) updates[keys.accounts] = next;
  const active = stored[keys.activeWallet] as (StoredConnectWallet & { connectChainId?: unknown }) | null;
  if (matches(active)) updates[keys.activeWallet] = { ...active!, connectAddresses: cache };
  if (Object.keys(updates).length > 0) await chrome.storage.local.set(updates);
}
