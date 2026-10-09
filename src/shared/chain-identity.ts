// Neurai Wallet — check that an RPC endpoint serves the chain the wallet is on.
//
// The testnet was reset on 2026-09-26 with the same chain name, ports, magic
// and address prefixes as before. A node of the previous testnet answers
// `chain: "test"`, accepts the same addresses and even reports the same
// `asset_marker`, so balances, UTXOs and transactions from the wrong chain
// would look valid. Only `getblockhash(0)` tells them apart.
//
// Every RPC endpoint is checked once per page (or service-worker) lifetime,
// before the first call the wallet makes against it. A failed check is not
// cached, so fixing the URL in Settings or a transient network error recovers
// without reloading.
//
// No imports other than ./networks.ts: `node --test` loads this file as is.

import { chainOf, expectedGenesis, GENESIS_HASH } from './networks.ts';

export type RpcCall = (method: string, params: unknown[]) => Promise<unknown>;

/** The RPC answered with a genesis block of another chain. */
export class WrongChainError extends Error {
  readonly url: string;
  readonly expected: string;
  readonly actual: string;

  constructor(url: string, network: string, actual: string) {
    const chain = chainOf(network);
    const expected = expectedGenesis(network);
    const actualChain = actual === GENESIS_HASH.mainnet
      ? 'Neurai mainnet'
      : actual === GENESIS_HASH.testnet
        ? 'the Neurai testnet'
        : chain === 'testnet'
          ? 'another chain, probably the testnet before its reset of 2026-09-26'
          : 'another chain';
    super(
      `The RPC server ${url} serves ${actualChain} (genesis ${actual}), not the ${chain} this wallet uses ` +
      `(genesis ${expected}). Check the ${chain} RPC URL in Settings.`
    );
    this.name = 'WrongChainError';
    this.url = url;
    this.expected = expected;
    this.actual = actual;
  }
}

const verified = new Map<string, Promise<void>>();

/**
 * Resolve when the RPC at `url` serves the chain of `network`; reject with
 * `WrongChainError` when it serves another one, or with the RPC error when the
 * check cannot be made.
 *
 * @param url - Endpoint the wallet is about to use (cache key)
 * @param network - Wallet network label
 * @param call - RPC function bound to that endpoint
 */
export function assertRpcChain(url: string, network: string, call: RpcCall): Promise<void> {
  const key = chainOf(network) + ' ' + url;
  const cached = verified.get(key);
  if (cached) return cached;

  const check = (async () => {
    const genesis = await call('getblockhash', [0]);
    const actual = String(genesis || '').toLowerCase();
    if (actual !== expectedGenesis(network)) {
      throw new WrongChainError(url, network, actual || 'unknown');
    }
  })();
  verified.set(key, check);
  check.catch(() => {
    if (verified.get(key) === check) verified.delete(key);
  });
  return check;
}

/** Forget every result. Only meant for tests. */
export function resetChainChecks(): void {
  verified.clear();
}

/**
 * JSON-RPC 1.0 call over fetch, the shape every endpoint of the wallet speaks.
 * Throws the node's error message when the reply carries one.
 */
export async function jsonRpc(url: string, method: string, params: unknown[], id = 'neurai-wallet'): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '1.0', id, method, params })
  });
  const data = await response.json() as { result?: unknown; error?: { message?: string } | string | null };
  if (data.error) {
    const message = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
    throw new Error(message);
  }
  return data.result;
}

/**
 * `jsonRpc` that first checks the endpoint serves the chain of `network`.
 */
export async function checkedJsonRpc(
  url: string,
  network: string,
  method: string,
  params: unknown[],
  id?: string
): Promise<unknown> {
  await assertRpcChain(url, network, (m, p) => jsonRpc(url, m, p, id));
  return jsonRpc(url, method, params, id);
}
