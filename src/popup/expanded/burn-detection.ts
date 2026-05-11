// Helpers for detecting burn outputs and burn addresses produced by asset operations.
// Relies on the NeuraiCreateTransaction global loaded via classic <script> in expanded.html.

export function isLikelyBurnAddress(address: string) {
  const normalized = String(address || '').trim();
  if (!normalized) return false;
  return /^N[bB]/.test(normalized)
    || /^t[Bb]/.test(normalized)
    || /burn/i.test(normalized);
}

export function resolveBurnOperationType(operationType: string) {
  switch (operationType) {
    case 'ISSUE_ROOT':
    case 'ISSUE_SUB':
    case 'ISSUE_UNIQUE':
    case 'ISSUE_DEPIN':
    case 'ISSUE_QUALIFIER':
    case 'ISSUE_SUB_QUALIFIER':
    case 'ISSUE_RESTRICTED':
    case 'REISSUE':
    case 'REISSUE_RESTRICTED':
      return operationType;
    case 'TAG_ADDRESSES':
      return 'TAG_ADDRESS';
    case 'UNTAG_ADDRESSES':
      return 'UNTAG_ADDRESS';
    default:
      return null;
  }
}

export function findExpectedBurnAddress(
  entries: Array<{ address: string; value: unknown }>,
  operationType: string
) {
  const burnOperationType = resolveBurnOperationType(operationType);
  if (!burnOperationType) return undefined;

  const sampleAddress = entries.find((entry) => entry.address)?.address;
  if (!sampleAddress) return undefined;

  try {
    const network = NeuraiCreateTransaction.inferNetworkFromAnyAddress(sampleAddress);
    return NeuraiCreateTransaction.getBurnAddressForOperation(network, burnOperationType);
  } catch (_) {
    return undefined;
  }
}

export function findXnaEnvelope(
  entries: Array<{ address: string; value: unknown }>,
  operationType: string
) {
  let burnAddress: string | undefined;
  let burnAmountSats: bigint | undefined;
  let xnaChangeAddress: string | undefined;
  let xnaChangeSats: bigint | undefined;
  const expectedBurnAddress = findExpectedBurnAddress(entries, operationType);

  for (const entry of entries) {
    if (typeof entry.value !== 'number') continue;
    if (entry.address === expectedBurnAddress || isLikelyBurnAddress(entry.address)) {
      burnAddress = entry.address;
      burnAmountSats = NeuraiCreateTransaction.xnaToSatoshis(Number(entry.value || 0));
      continue;
    }
    if (!xnaChangeAddress) {
      xnaChangeAddress = entry.address;
      xnaChangeSats = NeuraiCreateTransaction.xnaToSatoshis(Number(entry.value || 0));
    }
  }

  return { burnAddress, burnAmountSats, xnaChangeAddress, xnaChangeSats };
}
