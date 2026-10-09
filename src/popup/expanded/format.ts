// Pure formatting helpers for amounts shown in the expanded view.

export function formatAmountParts(value: unknown, fallback = '0') {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '--') return { integer: '--', decimals: '' };
  const normalized = raw.replace(/,/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return { integer: fallback, decimals: '' };
  }
  const [intPart, decPart = ''] = normalized.split('.');
  return { integer: intPart, decimals: decPart.replace(/0+$/, '') };
}

export function renderAmount(element: HTMLElement, value: unknown, fallback = '0') {
  const { integer, decimals } = formatAmountParts(value, fallback);
  element.textContent = '';
  const intNode = document.createElement('span');
  intNode.className = 'amount-int';
  intNode.textContent = integer;
  element.appendChild(intNode);
  if (decimals) {
    const decNode = document.createElement('span');
    decNode.className = 'amount-dec';
    decNode.textContent = '.' + decimals;
    element.appendChild(decNode);
  }
}

export function formatAssetAmount(amount: unknown, decimals: number) {
  const fixed = Number(amount || 0).toFixed(decimals);
  const trimmed = fixed.replace(/\.?0+$/, '');
  return trimmed || '0';
}

export function formatSatoshisToXna(satoshis: bigint | number) {
  return (Number(satoshis) / 1e8).toFixed(8);
}

/** Display-side conversion. For transaction amounts use NeuraiCreateTransaction.xnaToSatoshis(amountText(…)). */
export function xnaToSatoshis(amount: number | string) {
  return Math.round(Number(amount || 0) * 1e8);
}

/**
 * Exact decimal text of an XNA or asset amount, or null when `value` is not an
 * amount (an asset payload object, for instance).
 *
 * neurai-create-transaction 0.9 parses amounts exactly: it rejects more than 8
 * decimals, so a float artifact such as `0.1 + 0.2` (0.30000000000000004) or
 * an exponent form such as `1e-7` throws. And neurai-assets 1.6.1+ emits an
 * amount as a number only when it round-trips exactly; otherwise as decimal
 * text, or as an RpcDecimal (`{ isLosslessNumber: true, value }`) on the way to
 * `createrawtransaction`. Every amount handed to the serializer goes through
 * here first.
 */
export function amountText(value: unknown): string | null {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
  }
  if (typeof value === 'string') {
    const text = value.trim();
    return /^-?\d+(\.\d+)?$/.test(text) ? text : null;
  }
  if (value && typeof value === 'object' && (value as { isLosslessNumber?: unknown }).isLosslessNumber === true) {
    return amountText(String((value as { value?: unknown }).value ?? ''));
  }
  return null;
}

/** `amountText` for a value that must be an amount. */
export function requireAmountText(value: unknown, label: string): string {
  const text = amountText(value);
  if (text === null) throw new Error(`Invalid ${label}: ${String(value)}`);
  return text;
}

export function satoshisToXna(amount: number) {
  return amount / 1e8;
}
