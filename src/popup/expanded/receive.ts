/**
 * What the account and receive cards of the expanded view show.
 *
 * The receive card follows the web wallet's (neurai-webwallet
 * src/ReceiveAddress.tsx): the address broken into a few equal lines next to
 * its QR code, so it can be read and compared at a glance.
 *
 * No imports and no DOM: `node --test` loads it as is.
 */

export type AccountFamily = 'legacy' | 'ecdsa' | 'pq';

/**
 * The address in equal lines: 3 for a Base58 address, 4 for a witness
 * (bech32m) one, which is about twice as long. Joined, the lines give the
 * address back unchanged.
 */
export function addressLines(address: string): string[] {
  const value = String(address || '');
  if (!value) return [];
  const count = value.length > 40 ? 4 : 3;
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

/** The wallet type as the account tile draws it. */
export function accountTileKind(walletType: string | undefined): 'software' | 'hardware' | 'connect' {
  return walletType === 'hardware' || walletType === 'connect' ? walletType : 'software';
}
