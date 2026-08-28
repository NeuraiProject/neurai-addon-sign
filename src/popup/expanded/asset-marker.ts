/**
 * NIP-040 marker resolution.
 *
 * Deliberately free of imports: it is loaded straight from source by
 * `node --test`, and it has nothing to do with the formatting helpers in
 * asset-utils.
 */
/** NIP-040 asset payload marker, as the node reports it. */
export type AssetMarker = 'rvn' | 'xna';

type RpcFn = (method: string, params: unknown[]) => Promise<unknown>;

/**
 * Resolve the marker the chain requires for the next block, from the node the
 * operation will be built and broadcast against.
 *
 * Every asset payload opens with a 3-byte marker. NIP-040 migrates it from the
 * Ravencoin-inherited `rvn` to `xna` at a per-network activation height, and
 * the node reports the one it will accept as
 * `getblockchaininfo.asset_marker`. It is never inferred from the network name
 * or an address: only the node knows its own height.
 *
 * The policy is deliberately strict about failure:
 *
 * - `rvn` / `xna` → use it;
 * - field absent or null in a VALID reply → `rvn`. That is an answer, not a
 *   guess: a node predating the field is a node that still enforces the legacy
 *   marker;
 * - any other value → throw, rather than pick one;
 * - the RPC call itself failing → throw. "The node did not answer" must not
 *   become "the node said rvn": on a post-activation chain that builds a
 *   transaction rejected with `bad-txns-legacy-asset-marker-after-nip040`,
 *   and the user would see a signing failure with no useful cause.
 *
 * @param rpc - RPC function bound to the node the operation targets
 * @returns The marker to stamp on every asset output of this operation
 */
export async function resolveAssetMarker(rpc: RpcFn): Promise<AssetMarker> {
  let info: { asset_marker?: unknown } | null;
  try {
    info = await rpc('getblockchaininfo', []) as { asset_marker?: unknown } | null;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Cannot resolve the NIP-040 asset marker: getblockchaininfo failed (${detail}). ` +
      'Building the asset output without it would use the legacy "rvn" marker, ' +
      'which a chain past NIP-040 activation rejects with ' +
      'bad-txns-legacy-asset-marker-after-nip040.'
    );
  }

  const marker = info ? info.asset_marker : undefined;
  if (marker === undefined || marker === null) {
    return 'rvn';
  }
  if (marker !== 'rvn' && marker !== 'xna') {
    throw new Error(`Node reported an unknown asset_marker: ${String(marker)}`);
  }
  return marker;
}
