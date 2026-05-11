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

// `asset_quantity` from NeuraiAssets outputs is already encoded in raw asset units.
export function logicalAssetQuantityToRaw(value: unknown, _units: number): bigint {
  return asBigIntValue(value, 'asset quantity');
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
