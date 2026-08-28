/**
 * Who holds a restricted asset, and who is frozen.
 *
 * Freeze/Unfreeze asked for hand-typed addresses, which is where typos happen
 * and where the only thing that matters for the decision is invisible: who
 * holds tokens and who is already frozen. The node knows both.
 *
 * Import-free and DOM-free on purpose: `node --test` loads it as is, so the
 * part that decides what can be selected is testable without a browser.
 */

/** An address holding the asset, with its freeze state. */
export interface Holder {
  address: string;
  /** Asset amount, as the node reports it. */
  quantity: number;
  /**
   * `true` frozen, `false` free, `null` when the node did not answer.
   * `null` is not folded into `false`: "I do not know" and "it is not frozen"
   * lead to different decisions, and the second would be an invention.
   */
  frozen: boolean | null;
}

export interface HolderListing {
  holders: Holder[];
  /** How many addresses hold the asset in total, before truncating. */
  total: number;
  /** True if the list was truncated by the limit. */
  truncated: boolean;
  /** True if the asset is frozen globally. */
  globallyFrozen: boolean | null;
}

export type FreezeMode = 'FREEZE' | 'UNFREEZE';

type RpcFn = (method: string, params: unknown[]) => Promise<unknown>;

/** How many addresses to fetch at most: each one costs a lookup. */
export const DEFAULT_HOLDER_LIMIT = 200;
/** State lookups in flight at once. */
export const DEFAULT_CONCURRENCY = 6;

/**
 * Does selecting this address make sense for this operation?
 *
 * Freezing one already frozen, or unfreezing one that is not, are
 * transactions the node rejects: better not to allow selecting them. When the
 * state is unknown selection IS allowed — the node remains the authority and
 * will reject what does not apply — because blocking on a failed read would
 * leave the list useless after a transient failure.
 *
 * @param holder - The address and its state
 * @param mode - The operation about to run
 * @returns True if it can be selected
 */
export function isSelectable(holder: Holder, mode: FreezeMode): boolean {
  if (holder.frozen === null) return true;
  return mode === 'FREEZE' ? !holder.frozen : holder.frozen;
}

/** Why it cannot be selected, to show next to it. */
export function blockedReason(holder: Holder, mode: FreezeMode): string | null {
  if (isSelectable(holder, mode)) return null;
  return mode === 'FREEZE' ? 'Already frozen' : 'Not frozen';
}

/** State label, uncertainty included. */
export function frozenLabel(holder: Holder): string {
  if (holder.frozen === null) return 'Status unknown';
  return holder.frozen ? 'Frozen' : 'Free';
}

/** Runs `task` over each item with at most `limit` in flight. */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = new Array(Math.min(Math.max(1, limit), items.length || 1))
    .fill(null)
    .map(async () => {
      for (;;) {
        const index = next++;
        if (index >= items.length) return;
        results[index] = await task(items[index]!, index);
      }
    });
  await Promise.all(workers);
  return results;
}

/**
 * Normalises what `listaddressesbyasset` returns, an object of
 * `{address: amount}`.
 */
export function parseAddressBalances(raw: unknown): Array<{ address: string; quantity: number }> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, unknown>)
    .map(([address, quantity]) => ({ address, quantity: Number(quantity) }))
    .filter(entry => entry.address && Number.isFinite(entry.quantity))
    .sort((a, b) => b.quantity - a.quantity || a.address.localeCompare(b.address));
}

/**
 * Asks the node who holds the asset and what state each address is in.
 *
 * State is asked once per address — the node offers no bulk query — with a
 * cap on simultaneous lookups, because against a remote proxy each one costs
 * hundreds of milliseconds and firing them all at once is as bad as running
 * them in sequence.
 *
 * @param rpc - RPC function bound to the operation's node
 * @param assetName - The restricted asset ($NAME)
 * @param options - `limit` of addresses and `concurrency` of lookups
 * @returns The list, how many there are in total, and whether it was truncated
 */
export async function loadHolders(
  rpc: RpcFn,
  assetName: string,
  options: { limit?: number; concurrency?: number } = {}
): Promise<HolderListing> {
  const limit = options.limit ?? DEFAULT_HOLDER_LIMIT;
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;

  const [balancesRaw, globalRaw] = await Promise.all([
    rpc('listaddressesbyasset', [assetName]),
    rpc('checkglobalrestriction', [assetName]).catch(() => null)
  ]);

  const all = parseAddressBalances(balancesRaw);
  const truncated = all.length > limit;
  const selected = truncated ? all.slice(0, limit) : all;

  const holders = await mapWithConcurrency(selected, concurrency, async entry => {
    let frozen: boolean | null = null;
    try {
      frozen = Boolean(await rpc('checkaddressrestriction', [entry.address, assetName]));
    } catch {
      frozen = null;
    }
    return { address: entry.address, quantity: entry.quantity, frozen };
  });

  return {
    holders,
    total: all.length,
    truncated,
    globallyFrozen: typeof globalRaw === 'boolean' ? globalRaw : null
  };
}

/** What a row needs to render, already decided. */
export interface HolderRow {
  address: string;
  quantity: number;
  /** Amount already formatted for reading. */
  quantityText: string;
  /** `frozen` | `free` | `unknown`, for the badge colour. */
  stateKind: 'frozen' | 'free' | 'unknown';
  /** What the badge reads: the reason when it cannot be selected. */
  stateText: string;
  /** The real state, for the tooltip. */
  stateTitle: string;
  selectable: boolean;
}

/**
 * Turns holders into rows for the given operation.
 *
 * It lives here and not in the rendering because what it decides — what can be
 * selected and what each row reads — is exactly what must be testable without
 * a browser.
 *
 * @param holders - Holders as the node returned them
 * @param mode - The operation in progress
 * @param formatQuantity - How to format the amount (injectable for testing)
 * @returns One row per holder
 */
export function toHolderRows(
  holders: readonly Holder[],
  mode: FreezeMode,
  formatQuantity: (quantity: number) => string = String
): HolderRow[] {
  return holders.map(holder => {
    const selectable = isSelectable(holder, mode);
    const reason = blockedReason(holder, mode);
    return {
      address: holder.address,
      quantity: holder.quantity,
      quantityText: Number.isFinite(holder.quantity) ? formatQuantity(holder.quantity) : '—',
      stateKind: holder.frozen === null ? 'unknown' : holder.frozen ? 'frozen' : 'free',
      stateText: reason || frozenLabel(holder),
      stateTitle: frozenLabel(holder),
      selectable
    };
  });
}

/**
 * Drops from the selection whatever no longer applies.
 *
 * Switching from Freeze to Unfreeze makes the selected addresses stop being
 * the candidates: keeping them selected would send the node an impossible
 * operation.
 *
 * @param selection - Selected addresses
 * @param holders - Current holders
 * @param mode - The operation in progress
 * @returns The addresses that are still valid
 */
export function pruneSelection(
  selection: Iterable<string>,
  holders: readonly Holder[],
  mode: FreezeMode
): string[] {
  const byAddress = new Map(holders.map(holder => [holder.address, holder]));
  return [...selection].filter(address => {
    const holder = byAddress.get(address);
    return Boolean(holder && isSelectable(holder, mode));
  });
}

/** The addresses `Select all` should select. */
export function selectableAddresses(
  holders: readonly Holder[],
  mode: FreezeMode
): string[] {
  return holders.filter(holder => isSelectable(holder, mode)).map(holder => holder.address);
}
