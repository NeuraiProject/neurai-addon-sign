/**
 * Model for the DEPIN tab: which DEPIN assets this wallet holds, what it can
 * do with each, and which devices hold them.
 *
 * Import-free and DOM-free on purpose: `node --test` loads it as is, like
 * `holder-picker` and `confirm-preparing`. What is decided here — what can be
 * selected, what actions are offered — is exactly what must be testable
 * without a browser.
 */

/** A DEPIN asset present in the wallet. */
export interface DepinAsset {
  /** Full name, "&FLEET" or "&FLEET/SENSOR". */
  name: string;
  /** Units this wallet holds. */
  amount: number;
  /** True if the wallet holds "&NAME!", which is what allows managing it. */
  owned: boolean;
  /** Immediate parent, or null for a root. */
  parent: string | null;
  /** Depth: 0 root, 1 sub, 2 sub-sub… */
  depth: number;
}

/** A holder of the asset, as `listdepinholders` reports it. */
export interface DepinHolder {
  address: string;
  amount: number;
  /** 1 active, 0 blocked or revoked. */
  valid: number;
}

export type DeviceMode = 'FREEZE' | 'UNFREEZE';

/** A device row ready to render. */
export interface DeviceRow {
  address: string;
  amount: number;
  amountText: string;
  /** `active` or `blocked`. */
  stateKind: 'active' | 'blocked';
  /** What the badge reads: the reason when it cannot be selected. */
  stateText: string;
  stateTitle: string;
  selectable: boolean;
  /** True if this address is the wallet's own. */
  isSelf: boolean;
}

/**
 * The IMMEDIATE parent of a DEPIN name.
 *
 * The node resolves it with find_last_of, so "&A/B/C" is owned by "&A/B!",
 * not "&A!".
 *
 * @param name - DEPIN name
 * @returns The parent, or null for a root
 */
export function depinParent(name: string): string | null {
  const slash = name.lastIndexOf('/');
  return slash === -1 ? null : name.slice(0, slash);
}

/**
 * This wallet's DEPIN assets, derived from its balances.
 *
 * @param balances - Response of `listassetbalancesbyaddress`
 * @returns DEPIN assets, roots first and then by name
 */
export function parseDepinAssets(balances: Record<string, unknown> | null): DepinAsset[] {
  if (!balances || typeof balances !== 'object') return [];

  const held = new Set(
    Object.keys(balances).filter(name => Number(balances[name]) > 0)
  );

  return Object.keys(balances)
    .filter(name => name.startsWith('&') && !name.endsWith('!'))
    .filter(name => Number(balances[name]) > 0)
    .map(name => ({
      name,
      amount: Number(balances[name]),
      owned: held.has(`${name}!`),
      parent: depinParent(name),
      depth: (name.match(/\//g) || []).length
    }))
    .sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name));
}

/**
 * The assets whose owner token this wallet holds, parent material or not.
 *
 * Used by the sub-asset creation dropdown: a sub can only be created under a
 * DEPIN asset whose owner token you hold. It includes assets you hold the
 * owner token for even with no units of the asset itself, which is the normal
 * case once it has been handed out to devices.
 *
 * @param balances - Response of `listassetbalancesbyaddress`
 * @returns Manageable DEPIN names, sorted
 */
export function manageableDepinParents(balances: Record<string, unknown> | null): string[] {
  if (!balances || typeof balances !== 'object') return [];
  return Object.keys(balances)
    .filter(name => name.startsWith('&') && name.endsWith('!') && Number(balances[name]) > 0)
    .map(name => name.slice(0, -1))
    .sort();
}

/**
 * Does selecting this device make sense for this operation?
 *
 * Blocking one already blocked, or unblocking one that is active, are
 * transactions the node rejects.
 *
 * @param holder - The holder
 * @param mode - The operation
 * @returns True if it can be selected
 */
export function isDeviceSelectable(holder: DepinHolder, mode: DeviceMode): boolean {
  return mode === 'FREEZE' ? holder.valid === 1 : holder.valid !== 1;
}

/**
 * Turns holders into rows for the given operation.
 *
 * @param holders - Holders as the node returned them
 * @param mode - The operation in progress
 * @param options - `ownerAddress` (the wallet's address) and `formatAmount`
 * @returns One row per holder, largest amount first
 */
export function toDeviceRows(
  holders: readonly DepinHolder[],
  mode: DeviceMode,
  options: { ownerAddress?: string; formatAmount?: (n: number) => string } = {}
): DeviceRow[] {
  const format = options.formatAmount || String;
  return [...holders]
    .sort((a, b) => b.amount - a.amount || a.address.localeCompare(b.address))
    .map(holder => {
      const selectable = isDeviceSelectable(holder, mode);
      const active = holder.valid === 1;
      return {
        address: holder.address,
        amount: holder.amount,
        amountText: Number.isFinite(holder.amount) ? format(holder.amount) : '—',
        stateKind: active ? 'active' : 'blocked',
        stateText: selectable
          ? (active ? 'Active' : 'Blocked')
          : (mode === 'FREEZE' ? 'Already blocked' : 'Not blocked'),
        stateTitle: active ? 'Active' : 'Blocked or revoked',
        selectable,
        isSelf: Boolean(options.ownerAddress) && holder.address === options.ownerAddress
      };
    });
}

/**
 * Drops from the selection whatever no longer applies after switching mode.
 *
 * @param selection - Selected addresses
 * @param holders - Current holders
 * @param mode - The operation in progress
 * @returns The ones that are still valid
 */
export function pruneDeviceSelection(
  selection: Iterable<string>,
  holders: readonly DepinHolder[],
  mode: DeviceMode
): string[] {
  const byAddress = new Map(holders.map(h => [h.address, h]));
  return [...selection].filter(address => {
    const holder = byAddress.get(address);
    return Boolean(holder && isDeviceSelectable(holder, mode));
  });
}

/**
 * The owner token's address cannot be blocked or revoked: the node rejects it
 * and, if it slipped through, nobody could undo it.
 *
 * @param addresses - Selected addresses
 * @param ownerAddress - This wallet's address
 * @returns The reason it cannot proceed, or null
 */
export function blockingReasonForFreeze(
  addresses: readonly string[],
  ownerAddress: string | undefined
): string | null {
  if (addresses.length === 0) {
    return 'Select at least one device.';
  }
  if (ownerAddress && addresses.includes(ownerAddress)) {
    return `${ownerAddress} holds the owner token: freezing it would leave nobody able to undo it.`;
  }
  return null;
}
