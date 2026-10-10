/**
 * "Test connection" in Settings: does this RPC answer, and for which chain?
 *
 * The same check the extension makes before using an endpoint (genesis block,
 * shared/chain-identity.ts), done on request and reported in words, plus what
 * a user wants to see of a node: its height and how long it took to answer.
 * On the testnet it also says whether the node reports `asset_marker`, which
 * asset operations need there.
 *
 * No imports and no DOM: `node --test` loads it as is.
 */

export type RpcCall = (method: string, params: unknown[]) => Promise<unknown>;

export type RpcCheckResult =
  | { kind: 'ok'; blocks: number; ms: number; missingAssetMarker: boolean }
  | { kind: 'wrong-chain'; genesis: string }
  | { kind: 'error'; message: string };

interface ChainInfo {
  blocks?: unknown;
  asset_marker?: unknown;
}

export async function checkRpcEndpoint(
  call: RpcCall,
  expectedGenesis: string,
  options: { requireAssetMarker?: boolean; now?: () => number } = {}
): Promise<RpcCheckResult> {
  const now = options.now || (() => Date.now());
  const started = now();
  try {
    const genesis = String(await call('getblockhash', [0]) || '');
    if (genesis.toLowerCase() !== expectedGenesis.toLowerCase()) {
      return { kind: 'wrong-chain', genesis };
    }
    const info = (await call('getblockchaininfo', []) || {}) as ChainInfo;
    const blocks = Number(info.blocks);
    if (!Number.isFinite(blocks)) return { kind: 'error', message: 'the node did not report its height' };
    return {
      kind: 'ok',
      blocks,
      ms: Math.max(0, Math.round(now() - started)),
      missingAssetMarker: !!options.requireAssetMarker && !info.asset_marker
    };
  } catch (error) {
    return { kind: 'error', message: (error as Error)?.message || String(error) };
  }
}

/** One line for the status under the button. */
export function describeRpcCheck(result: RpcCheckResult, chainName: string): string {
  if (result.kind === 'ok') {
    const line = `${chainName} verified · block ${result.blocks.toLocaleString('en-US')} · ${result.ms} ms`;
    return result.missingAssetMarker
      ? `${line}. This node does not report asset_marker: asset operations will be refused.`
      : line;
  }
  if (result.kind === 'wrong-chain') {
    const short = result.genesis ? `${result.genesis.slice(0, 12)}…` : 'unknown';
    return `This node serves another chain (genesis ${short}), not ${chainName}.`;
  }
  return `No answer: ${result.message}`;
}

/** How the status line is coloured. */
export function rpcCheckTone(result: RpcCheckResult): 'ok' | 'warn' | 'bad' {
  if (result.kind === 'ok') return result.missingAssetMarker ? 'warn' : 'ok';
  return 'bad';
}
