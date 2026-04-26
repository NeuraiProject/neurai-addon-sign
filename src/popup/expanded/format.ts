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

export function xnaToSatoshis(amount: number) {
  return Math.round(Number(amount || 0) * 1e8);
}

export function satoshisToXna(amount: number) {
  return amount / 1e8;
}
