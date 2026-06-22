// Helpers for detecting burn outputs and burn addresses produced by asset operations.
// Relies on the NeuraiCreateTransaction global loaded via classic <script> in expanded.html.

// Every operation that pays a fee to a per-network burn address. Used to build
// the exact set of consensus burn addresses for a given network.
const BURN_OPERATION_TYPES = [
  'ISSUE_ROOT', 'ISSUE_SUB', 'ISSUE_UNIQUE', 'ISSUE_DEPIN', 'ISSUE_MSGCHANNEL',
  'ISSUE_QUALIFIER', 'ISSUE_SUB_QUALIFIER', 'ISSUE_RESTRICTED',
  'REISSUE', 'REISSUE_RESTRICTED', 'TAG_ADDRESS', 'UNTAG_ADDRESS'
];

// True ONLY for an actual Neurai burn address, matched EXACTLY against the
// consensus burn addresses for the address's network. The previous prefix
// heuristic (/^N[bB]/, /^t[Bb]/, /burn/i) gave false positives on ordinary
// wallet addresses that happen to start with "Nb"/"tB" (e.g. tBmebag...),
// which made findXnaEnvelope misclassify the change output as the burn and
// drop the real burn output (node rejects with bad-txns-issue-burn-not-found).
export function isLikelyBurnAddress(address: string): boolean {
  const a = String(address || '').trim();
  if (!a) return false;
  try {
    const network = NeuraiCreateTransaction.inferNetworkFromAnyAddress(a);
    for (const op of BURN_OPERATION_TYPES) {
      if (NeuraiCreateTransaction.getBurnAddressForOperation(network, op) === a) return true;
    }
  } catch (_) {
    // not a decodable address → not a burn address
  }
  return false;
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
    const isBurn = (expectedBurnAddress && entry.address === expectedBurnAddress)
                   || isLikelyBurnAddress(entry.address);
    if (isBurn && burnAddress === undefined) {     // first (exact) burn only; never overwrite
      burnAddress = entry.address;
      burnAmountSats = NeuraiCreateTransaction.xnaToSatoshis(Number(entry.value || 0));
      continue;
    }
    if (!isBurn && xnaChangeAddress === undefined) {
      xnaChangeAddress = entry.address;
      xnaChangeSats = NeuraiCreateTransaction.xnaToSatoshis(Number(entry.value || 0));
    }
  }

  return { burnAddress, burnAmountSats, xnaChangeAddress, xnaChangeSats };
}
