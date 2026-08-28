/**
 * Which networks have DEPIN.
 *
 * The node says it plainly: "DEPIN assets (soulbound, enabled on testnet and
 * regtest)" (`src/assets/assets.cpp:66`). Mainnet has no fork yet, so offering
 * the operation there only produces transactions the chain rejects.
 *
 * Deliberately a list and not a probe against the node: today the answer is
 * fixed and known, and a list has no failure modes. **The day DEPIN activates
 * on mainnet, this is the only thing to touch** — add `'xna'` (and `'xna-pq'`
 * if the PQ variant lands at the same time).
 *
 * No imports and no DOM: `node --test` loads it as is.
 */

/** Networks where the node supports DEPIN assets. */
export const DEPIN_NETWORKS: readonly string[] = [
  'xna-test',
  'xna-legacy-test',
  'xna-pq-test'
];

/**
 * Does this network support DEPIN assets?
 *
 * An unknown network returns `false`: hiding the operation is preferable to
 * offering one the chain is going to reject.
 *
 * @param network - The wallet's network label (`xna`, `xna-test`, …)
 * @returns True if DEPIN exists on that network
 */
export function supportsDepin(network: string | undefined | null): boolean {
  if (typeof network !== 'string') return false;
  return DEPIN_NETWORKS.includes(network);
}
