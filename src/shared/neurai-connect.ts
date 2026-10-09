// Neurai Wallet — accounts held by NeuraiWallet (mobile) over Neurai Connect.
//
// The extension acts as the "dApp" side of Neurai Connect: it shows a QR code,
// NeuraiWallet scans it and approves a session, and from then on the extension
// asks the phone for signatures through an end-to-end encrypted relay. No key
// reaches the extension; the account it stores is the address (and public key,
// when the wallet shares it), the session topic and the chain.
//
// What the session can do is what NeuraiWallet answers today:
// `getAccountAddresses` and `signMessage`. `sendTransfer` and `signPsbt` are
// answered with error 4200, so a Neurai Connect account cannot sign
// transactions yet; the extension does not ask for those methods.
//
// The pure helpers here are loaded by `node --test`, so this file only imports
// networks.ts. The client and the storage adapter use the NeuraiConnectSDK and
// chrome globals at call time only.

import { addressKind, type WalletNetworkLabel } from './networks.ts';

/** Methods the extension asks the wallet for, and nothing more. */
export const CONNECT_METHODS: readonly string[] = ['getAccountAddresses', 'signMessage'];

/**
 * CAIP-2 chain identifiers (`bip122:` + first 32 hex characters of the genesis
 * hash). Constants, never derived at runtime (spec/session.md section 4). The
 * testnet value is the 2026-09-26 reset; a test checks both against the SDK.
 */
export const CONNECT_CHAINS = Object.freeze({
  mainnet: 'bip122:00000044d33c0c0ba019be5c02497304',
  testnet: 'bip122:0000008b384aeffecdab182575dc4e86'
});

export type ConnectChainKind = keyof typeof CONNECT_CHAINS;

export function connectChainFor(chain: ConnectChainKind): string {
  return CONNECT_CHAINS[chain];
}

export function chainKindOf(chainId: string | null | undefined): ConnectChainKind | null {
  if (chainId === CONNECT_CHAINS.mainnet) return 'mainnet';
  if (chainId === CONNECT_CHAINS.testnet) return 'testnet';
  return null;
}

/**
 * The account label for an address NeuraiWallet exposes on `chainId`, or null
 * when the extension cannot represent it: an unknown family, the old
 * `nq1p…` spelling, or an address of the other chain.
 */
export function networkForConnectAddress(address: string, chainId: string): WalletNetworkLabel | null {
  const chain = chainKindOf(chainId);
  if (!chain) return null;
  const value = String(address || '').trim();
  const testnetAddress = /^t/i.test(value);
  if (testnetAddress !== (chain === 'testnet')) return null;

  switch (addressKind(value)) {
    case 'p2pkh': return chain === 'testnet' ? 'xna-test' : 'xna';
    case 'ecdsa': return chain === 'testnet' ? 'xna-ecdsa-test' : 'xna-ecdsa';
    case 'pq':
    case 'authscript': return chain === 'testnet' ? 'xna-pq-test' : 'xna-pq';
    default: return null;
  }
}

/** One entry of `getAccountAddresses`; `publicKey` and `path` are optional in the profile. */
export interface ConnectAddressEntry {
  address: string;
  publicKey?: string;
  path?: string;
  intention?: string;
}

interface SessionLike {
  namespaces?: Record<string, { accounts?: string[] } | undefined>;
  sessionProperties?: Record<string, string>;
}

/**
 * Addresses a settled session exposes on `chainId`, in the wallet's order.
 *
 * `sessionProperties.bip122_getAccountAddresses` comes first because it can
 * carry the public keys; the CAIP-10 accounts of the namespace fill in the
 * rest. Only addresses of that chain that the extension can represent are
 * kept, each once.
 */
export function sessionAddresses(session: SessionLike, chainId: string): ConnectAddressEntry[] {
  const found = new Map<string, ConnectAddressEntry>();
  const add = (entry: ConnectAddressEntry) => {
    const address = String(entry?.address || '').trim();
    if (!address || found.has(address) || !networkForConnectAddress(address, chainId)) return;
    found.set(address, { ...entry, address });
  };

  const cached = session?.sessionProperties?.bip122_getAccountAddresses;
  if (cached) {
    try {
      const entries = JSON.parse(cached) as unknown;
      if (Array.isArray(entries)) entries.forEach((entry) => add(entry as ConnectAddressEntry));
    } catch { /* malformed property: the accounts below still count */ }
  }

  const prefix = chainId + ':';
  for (const account of session?.namespaces?.bip122?.accounts || []) {
    if (account.startsWith(prefix)) add({ address: account.slice(prefix.length) });
  }
  return [...found.values()];
}

/** Params of a `signMessage` session request, as NeuraiWallet reads them. */
export function signMessageParams(chainId: string, address: string, message: string) {
  return { account: `${chainId}:${address}`, address, message };
}

/** Human-readable reason for a Neurai Connect failure. */
export function describeConnectError(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  const message = String((error as { message?: unknown } | null)?.message ?? error ?? '');
  if (code === 4001) return 'The request was rejected in NeuraiWallet.';
  if (code === 4200) return 'NeuraiWallet does not support this request yet.';
  if (/unknown session|expired/i.test(message)) {
    return 'The Neurai Connect session with NeuraiWallet has ended. Scan the QR code again to reconnect.';
  }
  if (/cancel|abort/i.test(message)) return 'The request was cancelled.';
  if (/timed? ?out|in time/i.test(message)) return 'NeuraiWallet did not answer in time.';
  return message || 'Neurai Connect request failed.';
}

// ── Runtime: storage adapter and client ─────────────────────────────────────

/**
 * Neurai Connect storage over chrome.storage.local, shared by every extension
 * page. Values are stored as they are (chrome.storage serializes JSON).
 */
export class ChromeConnectStorage implements NeuraiConnectKeyValueStorage {
  private readonly prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const name = this.prefix + key;
    const result = await chrome.storage.local.get(name);
    return result[name] as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.local.set({ [this.prefix + key]: value });
  }

  async delete(key: string): Promise<void> {
    await chrome.storage.local.remove(this.prefix + key);
  }

  async keys(prefix = ''): Promise<string[]> {
    const all = await chrome.storage.local.get(null);
    const full = this.prefix + prefix;
    return Object.keys(all).filter((name) => name.startsWith(full)).map((name) => name.slice(this.prefix.length));
  }
}

let clientPromise: Promise<NeuraiConnectClient> | null = null;

/**
 * The Neurai Connect client of this page: one relay socket and one view of
 * the stored sessions. A failed start is not cached.
 *
 * Keep at most one client alive across the extension, and only while it is
 * needed (close it with `closeConnectClient`). Every client subscribes to the
 * stored session topics, and the dApp SDK answers any request it sees there
 * with 4200 "unsupported method" — including the `wc_sessionRequest` another
 * extension page just sent, which then fails before the phone answers.
 */
export function getConnectClient(relayUrl: string, storagePrefix: string): Promise<NeuraiConnectClient> {
  if (typeof NeuraiConnectSDK === 'undefined') {
    return Promise.reject(new Error('Neurai Connect is not loaded on this page (lib/NeuraiConnect.js).'));
  }
  if (!clientPromise) {
    const starting = NeuraiConnectSDK.NeuraiConnect.init({
      relayUrl,
      storage: new ChromeConnectStorage(storagePrefix),
      metadata: {
        name: 'Neurai Sign',
        description: 'Neurai Sign browser extension',
        url: chrome.runtime.getURL('').replace(/\/$/, '')
      }
    });
    clientPromise = starting;
    starting.catch(() => { if (clientPromise === starting) clientPromise = null; });
  }
  return clientPromise;
}

/** Close this page's client, if any, so it stops listening on the relay. */
export async function closeConnectClient(): Promise<void> {
  const current = clientPromise;
  clientPromise = null;
  if (!current) return;
  try {
    await (await current).close();
  } catch (_) { /* never started, or already closed */ }
}

/** Where the dApp SDK keeps its sessions (`DAPP_SESSIONS_STORAGE_KEY`), under the storage prefix. */
export const CONNECT_SESSIONS_KEY = 'connect:dapp:sessions';

/**
 * A stored session, read straight from chrome.storage without starting a
 * client (which would open the relay socket just to show a date).
 */
export async function readStoredConnectSession(storagePrefix: string, topic: string): Promise<NeuraiConnectSession | null> {
  const name = storagePrefix + CONNECT_SESSIONS_KEY;
  const stored = (await chrome.storage.local.get(name))[name] as Record<string, NeuraiConnectSession> | undefined;
  return (stored && stored[topic]) || null;
}

/** Remove every Neurai Connect record (pairings, sessions, relay identity). */
export async function clearConnectStorage(storagePrefix: string): Promise<void> {
  const all = await chrome.storage.local.get(null);
  const names = Object.keys(all).filter((name) => name.startsWith(storagePrefix));
  if (names.length > 0) await chrome.storage.local.remove(names);
}
