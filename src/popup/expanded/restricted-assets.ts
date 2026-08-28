/**
 * Which restricted assets this wallet can actually manage.
 *
 * Freeze/Unfreeze operate on restricted assets (`$NAME`), and that requires
 * the root asset's owner token (`NAME!`). The panel derived the restricted
 * name from ANY owner token in the wallet, so a DEPIN `&TOKIO!` produced
 * `$&TOKIO` — which the node rejects with "_Not a valid asset name" — and a
 * sub `FOO/BAR!` produced `$FOO/BAR`, which does not exist. The dropdown
 * offered impossible things and the holder lookup found nothing, which is
 * exactly what was reported.
 *
 * No imports and no DOM: `node --test` loads it as is.
 */

type RpcFn = (method: string, params: unknown[]) => Promise<unknown>;

/** Existence lookups in flight at once. */
export const DEFAULT_CONCURRENCY = 6;

/**
 * Can this name be the root of a restricted asset?
 *
 * Only ROOT assets have a restricted counterpart. A sub (`FOO/BAR`), a unique
 * (`FOO#BAR`), a message (`FOO~BAR`), a qualifier (`#FOO`) and a DEPIN
 * (`&FOO`) do not, and prefixing them with `$` yields a name the node does not
 * even accept as valid.
 *
 * @param name - Asset name, without the owner token's `!`
 * @returns True if `$name` is a possible name
 */
export function canBeRestrictedRoot(name: string): boolean {
  if (typeof name !== 'string') return false;
  // The node allows A-Z 0-9 _ . in a root name, 3 to 30 characters, with no
  // leading or trailing punctuation and no two in a row.
  if (!/^[A-Z0-9._]{3,30}$/.test(name)) return false;
  if (/^[._]|[._]$/.test(name)) return false;
  if (/[._]{2}/.test(name)) return false;
  return true;
}

/**
 * The `$NAME` assets this wallet could manage, derived from its balances.
 *
 * A local filter, so it only rules out the impossible; whether the restricted
 * asset EXISTS is the node's answer (see `keepExistingAssets`).
 *
 * @param balances - Response of `listassetbalancesbyaddress`
 * @returns Candidate restricted names, sorted and deduplicated
 */
export function restrictedCandidates(balances: Record<string, unknown> | null): string[] {
  if (!balances || typeof balances !== 'object') return [];
  const names = Object.keys(balances)
    .filter(name => name.endsWith('!') && Number(balances[name]) > 0)
    .map(name => name.slice(0, -1))
    .filter(canBeRestrictedRoot)
    .map(name => `$${name}`);
  return [...new Set(names)].sort();
}

/** Runs `task` over each item with at most `limit` in flight. */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = new Array(Math.min(Math.max(1, limit), items.length || 1))
    .fill(null)
    .map(async () => {
      for (;;) {
        const index = next++;
        if (index >= items.length) return;
        results[index] = await task(items[index]!);
      }
    });
  await Promise.all(workers);
  return results;
}

/**
 * Keeps the ones that exist on chain.
 *
 * Holding `NAME!` does not imply having issued `$NAME`: the normal case is
 * holding a root asset's owner token and no restricted asset at all. Offering
 * them unchecked filled the dropdown with assets that do not exist.
 *
 * A failed lookup does NOT drop the candidate: if the node does not answer it
 * is kept, and the operation will say no later. Dropping it because the read
 * failed would hide an asset that does exist.
 *
 * @param rpc - RPC function bound to the node
 * @param names - `$NAME` candidates
 * @param options - `concurrency` of simultaneous lookups
 * @returns The ones that exist (or whose state could not be determined)
 */
export async function keepExistingAssets(
  rpc: RpcFn,
  names: readonly string[],
  options: { concurrency?: number } = {}
): Promise<string[]> {
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const checks = await mapWithConcurrency(names, concurrency, async name => {
    try {
      const data = await rpc('getassetdata', [name]);
      return { name, exists: data !== null && data !== undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // "not found" is an answer; any other failure is network noise.
      if (/not found|doesn't exist|does not exist/i.test(message)) {
        return { name, exists: false };
      }
      return { name, exists: true };
    }
  });
  return checks.filter(check => check.exists).map(check => check.name);
}
