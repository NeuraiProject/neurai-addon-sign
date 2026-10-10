/**
 * What the account and receive cards of the expanded view show.
 *
 * The receive card puts the address under its QR code, in equal parts: on one
 * line when it fits the card, broken in two when it does not (each part is an
 * unbreakable box, so it never breaks anywhere else).
 *
 * No imports and no DOM: `node --test` loads it as is.
 */

export type AccountFamily = 'legacy' | 'ecdsa' | 'pq';

/**
 * The address in `count` near-equal parts. Joined, the parts give the address
 * back unchanged.
 */
export function addressLines(address: string, count = 2): string[] {
  const value = String(address || '');
  if (!value) return [];
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const line = value.slice(Math.floor((i * value.length) / count), Math.floor(((i + 1) * value.length) / count));
    if (line) lines.push(line);
  }
  return lines;
}

const FAMILY_LABEL: Record<AccountFamily, string> = {
  legacy: 'Legacy',
  ecdsa: 'ECDSA witness',
  pq: 'Post-quantum'
};

const WALLET_LABEL: Record<string, string> = {
  software: 'Software wallet',
  hardware: 'ESP32 hardware',
  connect: 'NeuraiWallet'
};

/**
 * The chips under the account name: address family, where the keys live and,
 * for a NeuraiWallet account followed through its account key, how many of
 * its addresses are watched.
 */
export function accountChips(
  family: AccountFamily | undefined,
  walletType: string | undefined,
  followedAddresses = 0
): string[] {
  const chips: string[] = [];
  if (family) chips.push(FAMILY_LABEL[family]);
  chips.push(WALLET_LABEL[walletType || 'software'] || 'Software wallet');
  if (walletType === 'connect' && followedAddresses > 1) chips.push(`${followedAddresses} addresses`);
  return chips;
}
