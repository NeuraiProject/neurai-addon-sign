// Pure utilities for inspecting and normalizing asset payloads, verifier expressions,
// and asset transaction outputs.

import { formatAssetAmount } from './format.js';

export function getAssetType(name: string): string {
  if (name.endsWith('!')) return 'owner';
  if (name.startsWith('$')) return 'restricted';
  if (name.startsWith('#')) return 'qualifier';
  if (name.startsWith('&')) return 'depin';
  if (name.includes('#')) return 'unique';
  if (name.includes('/')) return 'sub';
  return 'root';
}

export function normalizeAssetsFromRpc(assetBalance: unknown) {
  let rows: unknown[] = [];
  if (Array.isArray(assetBalance)) {
    rows = assetBalance;
  } else if (assetBalance && Array.isArray((assetBalance as Record<string, unknown>).assets)) {
    rows = (assetBalance as Record<string, unknown[]>).assets;
  } else if (assetBalance && typeof assetBalance === 'object') {
    rows = Object.keys(assetBalance as object).map((assetName) => ({
      assetName,
      balance: (assetBalance as Record<string, unknown>)[assetName]
    }));
  }

  return rows
    .map((asset) => {
      const a = asset as Record<string, unknown>;
      const name = String(a.assetName || a.name || '').trim();
      if (!name || name.toUpperCase() === 'XNA') return null;
      const decimals = (typeof a.divisible === 'boolean')
        ? (a.divisible ? 8 : 0)
        : 8;
      const amount = Number(a.balance || 0) / Math.pow(10, decimals);
      return { name, amountText: formatAssetAmount(amount, decimals) };
    })
    .filter(Boolean)
    .sort((a, b) => (a as { name: string }).name.localeCompare((b as { name: string }).name, undefined, { sensitivity: 'base' }));
}

export function cloneAssetOutputs(outputs: NeuraiAssetsBuildResult['outputs']) {
  const normalized = Array.isArray(outputs)
    ? outputs
    : Object.entries(outputs || {}).map(([address, value]) => ({ [address]: value }));
  return normalized.map((output) => JSON.parse(JSON.stringify(output)) as Record<string, unknown>);
}

export function normalizeAssetOutputEntries(outputs: NeuraiAssetsBuildResult['outputs'] | Array<Record<string, unknown>>) {
  const normalized = Array.isArray(outputs)
    ? outputs
    : Object.entries(outputs || {}).map(([address, value]) => ({ [address]: value }));

  return normalized.map((output) => {
    const [address, value] = Object.entries(output)[0] || ['', undefined];
    return {
      address: String(address || ''),
      value,
      output
    };
  });
}

export function asObjectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid ${label} output while building local raw transaction.`);
  }
  return value as Record<string, unknown>;
}

export function asStringValue(value: unknown): string {
  return String(value ?? '').trim();
}

export function asOptionalStringValue(value: unknown): string | undefined {
  const normalized = asStringValue(value);
  return normalized || undefined;
}

export function asBooleanFlag(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    if (normalized === '0' || normalized === 'false' || normalized === 'no') return false;
    return true;
  }
  return Boolean(value);
}

export function asOptionalNumberValue(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function asBigIntValue(value: unknown, label: string): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new Error(`Missing ${label} while building local raw transaction.`);
  }
  return BigInt(normalized);
}

// NeuraiAssets >=1.3.0 emits `asset_quantity` (and `localRawBuild.*Raw` fields)
// as the user-facing display amount — the daemon's createrawtransaction handles
// the 10^8 scaling. The PQ rebuild path in this addon does NOT go through the
// daemon, so we have to apply the 10^8 multiplication ourselves before encoding
// the script bytes. We also enforce divisibility by 10^(8 - units) so callers
// fail fast instead of broadcasting an invalid script.
export function logicalAssetQuantityToRaw(value: unknown, units: number): bigint {
  const raw = userAmountToRawSats(value);
  const safeUnits = Number.isFinite(units) && units >= 0 && units <= 8 ? Math.trunc(units) : 0;
  const step = 10n ** BigInt(8 - safeUnits);
  if (raw % step !== 0n) {
    throw new Error(
      `Asset quantity ${String(value)} is not divisible by the smallest unit (10^-${safeUnits}) of an asset with units=${safeUnits}.`
    );
  }
  return raw;
}

// NeuraiAssets >=1.3.0 fills `localRawBuild.params.*Raw` fields with the same
// user-facing amount instead of the raw sats value the script encoder expects.
// Rescale every known *Raw field in place. `quantityRaw` uses the asset's
// `units`; qualifier-related amounts are always units=0.
const LOCAL_RAW_AMOUNT_FIELDS = ['quantityRaw', 'changeQuantityRaw', 'qualifierChangeAmountRaw'] as const;

export function rescaleLocalRawBuildParams<T extends Record<string, unknown>>(params: T): T {
  const unitsRaw = (params as Record<string, unknown>).units;
  const units = typeof unitsRaw === 'number' && Number.isFinite(unitsRaw) ? Math.trunc(unitsRaw) : 0;
  for (const key of LOCAL_RAW_AMOUNT_FIELDS) {
    const value = (params as Record<string, unknown>)[key];
    if (value === undefined || value === null) continue;
    const fieldUnits = key === 'quantityRaw' ? units : 0;
    (params as Record<string, unknown>)[key] = logicalAssetQuantityToRaw(value, fieldUnits);
  }
  return params;
}

function userAmountToRawSats(value: unknown): bigint {
  if (typeof value === 'bigint') return value * 100000000n;
  const text = String(value ?? '').trim();
  if (!text) throw new Error('Missing asset quantity while building local raw transaction.');
  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    throw new Error(`Invalid asset quantity: ${text}`);
  }
  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const [intPart, fracPart = ''] = unsigned.split('.');
  if (fracPart.length > 8) {
    throw new Error(`Asset quantity has more than 8 decimal places: ${text}`);
  }
  const paddedFrac = (fracPart + '00000000').slice(0, 8);
  const combined = BigInt(intPart + paddedFrac);
  return negative ? -combined : combined;
}

export function toTxInputs(inputs: Array<{ txid: string; vout: number }>) {
  return inputs.map((input) => ({
    txid: input.txid,
    vout: input.vout
  }));
}

export function maybeIpfsHash(payload: Record<string, unknown>, flagKey: string, hashKey: string) {
  return asBooleanFlag(payload[flagKey], false)
    ? asOptionalStringValue(payload[hashKey])
    : asOptionalStringValue(payload[hashKey]);
}

export function findLogicalOutput(
  entries: ReturnType<typeof normalizeAssetOutputEntries>,
  key: string
): { address: string; payload: Record<string, unknown> } | null {
  for (const entry of entries) {
    if (!entry.value || typeof entry.value !== 'object' || Array.isArray(entry.value)) continue;
    const container = entry.value as Record<string, unknown>;
    const payload = container[key];
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      return {
        address: entry.address,
        payload: payload as Record<string, unknown>
      };
    }
  }
  return null;
}

export function findTransferOutput(entries: ReturnType<typeof normalizeAssetOutputEntries>) {
  for (const entry of entries) {
    if (!entry.value || typeof entry.value !== 'object' || Array.isArray(entry.value)) continue;
    const container = entry.value as Record<string, unknown>;
    if (!container.transfer || typeof container.transfer !== 'object' || Array.isArray(container.transfer)) continue;
    const transfers = Object.entries(container.transfer as Record<string, unknown>);
    if (transfers.length === 0) continue;
    const [assetName, amount] = transfers[0];
    return {
      address: entry.address,
      assetName,
      amount
    };
  }
  return null;
}

export function inferLocalOperationTypeFromOutputs(outputs: NeuraiAssetsBuildResult['outputs'] | Array<Record<string, unknown>>) {
  const entries = normalizeAssetOutputEntries(outputs);
  if (findLogicalOutput(entries, 'issue_unique')) return 'ISSUE_UNIQUE';
  if (findLogicalOutput(entries, 'issue_restricted')) return 'ISSUE_RESTRICTED';
  if (findLogicalOutput(entries, 'issue_qualifier')) return 'ISSUE_QUALIFIER';
  if (findLogicalOutput(entries, 'reissue_restricted')) return 'REISSUE_RESTRICTED';
  if (findLogicalOutput(entries, 'reissue')) return 'REISSUE';
  if (findLogicalOutput(entries, 'tag_addresses')) return 'TAG_ADDRESSES';
  if (findLogicalOutput(entries, 'untag_addresses')) return 'UNTAG_ADDRESSES';
  if (findLogicalOutput(entries, 'freeze_addresses')) return 'FREEZE_ADDRESSES';
  if (findLogicalOutput(entries, 'unfreeze_addresses')) return 'UNFREEZE_ADDRESSES';
  if (findLogicalOutput(entries, 'freeze_asset')) return 'FREEZE_ASSET';
  if (findLogicalOutput(entries, 'unfreeze_asset')) return 'UNFREEZE_ASSET';

  const issue = findLogicalOutput(entries, 'issue');
  if (issue) {
    const issuePayload = issue.payload;
    const assetName = asStringValue(issuePayload.asset_name);
    if (assetName.startsWith('&')) return 'ISSUE_DEPIN';
    if (assetName.includes('/')) return 'ISSUE_SUB';
    return 'ISSUE_ROOT';
  }

  return null;
}

export function parseUniqueAddresses(rawAddresses: string): string[] {
  return [...new Set(
    rawAddresses
      .split(/\r?\n/)
      .map((address) => address.trim())
      .filter(Boolean)
  )];
}

export function isAuthScriptAddress(address: string): boolean {
  const normalized = String(address || '').trim().toLowerCase();
  return normalized.startsWith('nq1') || normalized.startsWith('tnq1');
}

export function normalizeQualifierTags(raw: unknown): string[] {
  const tags = Array.isArray(raw)
    ? raw
    : (raw && typeof raw === 'object' ? Object.keys(raw as Record<string, unknown>) : []);
  return tags
    .map((tag) => String(tag || '').trim().toUpperCase())
    .filter((tag) => tag.startsWith('#'));
}

export function tokenizeVerifier(verifierString: string) {
  const normalized = verifierString.trim().toUpperCase();
  const tokenPattern = /\s*(!?#[A-Z0-9_/]+|[()&|])\s*/gy;
  const tokens: string[] = [];
  let lastIndex = 0;

  while (lastIndex < normalized.length) {
    tokenPattern.lastIndex = lastIndex;
    const match = tokenPattern.exec(normalized);
    if (!match) {
      throw new Error(`Invalid verifier token near: "${normalized.slice(lastIndex)}"`);
    }
    tokens.push(match[1]);
    lastIndex = tokenPattern.lastIndex;
  }

  return tokens;
}

export function evaluateVerifierAgainstTags(verifierString: string, addressTags: string[]) {
  const tags = new Set(addressTags.map(tag => String(tag || '').trim().toUpperCase()).filter(Boolean));
  const tokens = tokenizeVerifier(verifierString);
  let index = 0;

  function parseExpression(): boolean {
    let value = parseTerm();
    while (tokens[index] === '|') {
      index += 1;
      value = value || parseTerm();
    }
    return value;
  }

  function parseTerm(): boolean {
    let value = parseFactor();
    while (tokens[index] === '&') {
      index += 1;
      value = value && parseFactor();
    }
    return value;
  }

  function parseFactor(): boolean {
    const token = tokens[index];
    if (!token) throw new Error('Unexpected end of verifier expression');

    if (token === '(') {
      index += 1;
      const value = parseExpression();
      if (tokens[index] !== ')') throw new Error('Unbalanced parentheses in verifier expression');
      index += 1;
      return value;
    }

    if (token.startsWith('!#')) {
      index += 1;
      return !tags.has(token.slice(1));
    }

    if (token.startsWith('#')) {
      index += 1;
      return tags.has(token);
    }

    throw new Error(`Unsupported verifier token: ${token}`);
  }

  const result = parseExpression();
  if (index !== tokens.length) {
    throw new Error(`Unexpected verifier token: ${tokens[index]}`);
  }
  return result;
}

export function explainSimpleVerifierFailure(verifierString: string, addressTags: string[]) {
  const normalized = verifierString.trim().toUpperCase();
  const tags = new Set(addressTags.map(tag => String(tag || '').trim().toUpperCase()).filter(Boolean));

  if (/^#[A-Z0-9_/]+$/.test(normalized)) {
    return tags.has(normalized) ? null : `Missing tag: ${normalized}`;
  }

  const negated = normalized.match(/^!#([A-Z0-9_/]+)$/);
  if (negated) {
    const tag = `#${negated[1]}`;
    return tags.has(tag) ? `Address has forbidden tag: ${tag}` : null;
  }

  return null;
}
