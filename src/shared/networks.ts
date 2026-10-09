// Neurai Wallet — wallet networks, address families and chain identity.
//
// The extension stores one network label per account and hands it to dApps
// through `getInfo().network`. Those labels predate neurai-key 5, which reused
// the same names for other address types:
//
//   addon label        address family                   neurai-key 5 label
//   ─────────────────  ───────────────────────────────  ──────────────────
//   xna                Legacy Base58, m/44'/1900'       xna-legacy
//   xna-legacy         Legacy Base58, m/44'/0'          xna-old-legacy
//   xna-ecdsa          ECDSA witness v3, nq1r…          xna
//   xna-pq             PQ witness v2, pq1z…             xna-pq
//   xna-test           Legacy Base58, m/44'/1'          xna-legacy-test
//   xna-legacy-test    Legacy Base58, m/44'/1'          xna-legacy-test
//   xna-ecdsa-test     ECDSA witness v3, tnq1r…         xna-test
//   xna-pq-test        PQ witness v2, tpq1z…            xna-pq-test
//
// Handing an addon label straight to neurai-key 5 derives another address
// without any error (`xna` is ECDSA witness there), so every call into the
// libraries goes through `toKeyNetwork`. The addon labels themselves do not
// change: mainnet accounts keep deriving the addresses that hold their funds.
//
// The PQ labels used to mean generic AuthScript witness v1 (`nq1p…` /
// `tnq1p…`). The node now writes that family `nc1p…` / `tnc1p…` and keeps it
// for contracts; the PQ wallet is the strict witness v2 family. The same
// mnemonic and index give the same ML-DSA-44 key in both, so a stored PQ
// account is migrated by re-encoding its public key (see migrations.ts).
//
// No imports and no DOM: `node --test` loads this file as is.

/** Network label stored per account (see the table above). */
export type WalletNetworkLabel =
  | 'xna'
  | 'xna-test'
  | 'xna-legacy'
  | 'xna-legacy-test'
  | 'xna-ecdsa'
  | 'xna-ecdsa-test'
  | 'xna-pq'
  | 'xna-pq-test';

/** Network label as neurai-key 5 (and the libraries built on it) understands it. */
export type KeyNetworkLabel =
  | 'xna'
  | 'xna-test'
  | 'xna-legacy'
  | 'xna-legacy-test'
  | 'xna-old-legacy'
  | 'xna-pq'
  | 'xna-pq-test';

/** Address family of a wallet: how it derives keys and signs. */
export type WalletFamily = 'legacy' | 'ecdsa' | 'pq';

export type ChainKind = 'mainnet' | 'testnet';

/** Every label an account can carry, mainnet first. */
export const WALLET_NETWORKS: readonly WalletNetworkLabel[] = [
  'xna',
  'xna-legacy',
  'xna-ecdsa',
  'xna-pq',
  'xna-test',
  'xna-legacy-test',
  'xna-ecdsa-test',
  'xna-pq-test'
];

const KEY_NETWORK: Record<WalletNetworkLabel, KeyNetworkLabel> = {
  'xna': 'xna-legacy',
  'xna-legacy': 'xna-old-legacy',
  'xna-ecdsa': 'xna',
  'xna-pq': 'xna-pq',
  'xna-test': 'xna-legacy-test',
  'xna-legacy-test': 'xna-legacy-test',
  'xna-ecdsa-test': 'xna-test',
  'xna-pq-test': 'xna-pq-test'
};

const FAMILY: Record<WalletNetworkLabel, WalletFamily> = {
  'xna': 'legacy',
  'xna-legacy': 'legacy',
  'xna-ecdsa': 'ecdsa',
  'xna-pq': 'pq',
  'xna-test': 'legacy',
  'xna-legacy-test': 'legacy',
  'xna-ecdsa-test': 'ecdsa',
  'xna-pq-test': 'pq'
};

const LABEL: Record<WalletNetworkLabel, string> = {
  'xna': 'Mainnet',
  'xna-legacy': 'Mainnet Legacy',
  'xna-ecdsa': 'Mainnet ECDSA witness',
  'xna-pq': 'Mainnet PQ',
  'xna-test': 'Testnet',
  'xna-legacy-test': 'Testnet Legacy',
  'xna-ecdsa-test': 'Testnet ECDSA witness',
  'xna-pq-test': 'Testnet PQ'
};

/**
 * Labels the extension can represent but does not offer for new accounts.
 *
 * The witness families (ECDSA v3, PQ v2) are not active on mainnet: the node
 * rejects their addresses there. On the reset testnet they are active from
 * block 10. TO ENABLE one on mainnet: delete it here.
 */
export const UNAVAILABLE_NETWORKS: readonly WalletNetworkLabel[] = ['xna-ecdsa', 'xna-pq'];

export function isWalletNetwork(network: unknown): network is WalletNetworkLabel {
  return typeof network === 'string' && (WALLET_NETWORKS as readonly string[]).includes(network);
}

/** An unknown label is read as mainnet Legacy, the historical default. */
function normalize(network: string | null | undefined): WalletNetworkLabel {
  return isWalletNetwork(network) ? network : 'xna';
}

export function isNetworkAvailable(network: string): boolean {
  return isWalletNetwork(network) && !UNAVAILABLE_NETWORKS.includes(network);
}

export function isTestnetNetwork(network: string | null | undefined): boolean {
  return chainOf(network) === 'testnet';
}

export function chainOf(network: string | null | undefined): ChainKind {
  return normalize(network).endsWith('-test') ? 'testnet' : 'mainnet';
}

export function walletFamily(network: string | null | undefined): WalletFamily {
  return FAMILY[normalize(network)];
}

export function isPQNetwork(network: string | null | undefined): boolean {
  return walletFamily(network) === 'pq';
}

export function isEcdsaNetwork(network: string | null | undefined): boolean {
  return walletFamily(network) === 'ecdsa';
}

export function isLegacyNetwork(network: string | null | undefined): boolean {
  return walletFamily(network) === 'legacy';
}

/** The neurai-key 5 label that derives this account's addresses. */
export function toKeyNetwork(network: string | null | undefined): KeyNetworkLabel {
  return KEY_NETWORK[normalize(network)];
}

/** Human-readable name of a label, for badges and lists. */
export function networkLabel(network: string | null | undefined): string {
  return isWalletNetwork(network) ? LABEL[network] : String(network || 'Mainnet');
}

// ── Chain identity ────────────────────────────────────────────────────────────

/**
 * Genesis block of each chain.
 *
 * The testnet was reset on 2026-09-26. Chain name, ports, magic and address
 * prefixes did not change, so an RPC of the previous testnet answers
 * `chain: "test"` like the new one and only the genesis tells them apart.
 */
export const GENESIS_HASH: Readonly<Record<ChainKind, string>> = Object.freeze({
  mainnet: '00000044d33c0c0ba019be5c0249730424a69cb4c222153322f68c6104484806',
  testnet: '0000008b384aeffecdab182575dc4e86c9f07f90318c65088532660ed9a8a021'
});

export function expectedGenesis(network: string | null | undefined): string {
  return GENESIS_HASH[chainOf(network)];
}

// ── Address and script families ──────────────────────────────────────────────

/**
 * What an address (or a prevout script) is, by its encoding.
 *
 * - `p2pkh`      Base58 `N…` / `t…`
 * - `authscript` generic AuthScript v1 `nc1p…` / `tnc1p…` (contracts)
 * - `pq`         strict PQ v2 `pq1z…` / `tpq1z…`
 * - `ecdsa`      strict ECDSA v3 `nq1r…` / `tnq1r…`
 * - `obsolete`   generic AuthScript v1 in its old spelling `nq1p…` / `tnq1p…`,
 *                which current nodes reject
 */
export type AddressKind = 'p2pkh' | 'authscript' | 'pq' | 'ecdsa' | 'obsolete' | 'unknown';

const BECH32M_DATA = '[qpzry9x8gf2tvdw0s3jn54khce6mua7l]';
const WITNESS_ADDRESS = new RegExp(`^(t?)(nc|pq|nq)1([pzr])${BECH32M_DATA}{58}$`);
const BASE58_ADDRESS = /^[Nt][1-9A-HJ-NP-Za-km-z]{25,34}$/;

/**
 * Classify an address by its prefix and length. It does not verify the
 * checksum: that is the node's job when the transaction is validated. Use it
 * for fee estimation and for messages, never to accept an address.
 */
export function addressKind(address: string | null | undefined): AddressKind {
  const value = String(address || '').trim();
  if (BASE58_ADDRESS.test(value)) return 'p2pkh';
  const match = WITNESS_ADDRESS.exec(value.toLowerCase());
  if (!match) return 'unknown';
  const [, , hrp, version] = match;
  if (hrp === 'nc' && version === 'p') return 'authscript';
  if (hrp === 'pq' && version === 'z') return 'pq';
  if (hrp === 'nq' && version === 'r') return 'ecdsa';
  if (hrp === 'nq' && version === 'p') return 'obsolete';
  return 'unknown';
}

/** Any Bech32m AuthScript family (v1, v2 or v3), including the obsolete spelling. */
export function isWitnessAddress(address: string | null | undefined): boolean {
  const kind = addressKind(address);
  return kind === 'authscript' || kind === 'pq' || kind === 'ecdsa' || kind === 'obsolete';
}

/**
 * Classify a scriptPubKey (with or without an asset suffix) by its prefix:
 * `76a914…88ac` P2PKH, `5120…` v1, `5220…` v2, `5320…` v3.
 */
export function scriptKind(scriptHex: string | null | undefined): AddressKind {
  const script = String(scriptHex || '').toLowerCase();
  if (script.startsWith('76a914') && script.slice(46, 50) === '88ac') return 'p2pkh';
  if (script.length >= 68) {
    if (script.startsWith('5120')) return 'authscript';
    if (script.startsWith('5220')) return 'pq';
    if (script.startsWith('5320')) return 'ecdsa';
  }
  return 'unknown';
}

/**
 * Error text for a recipient written in the old AuthScript spelling, or null.
 *
 * It used to be valid, so a bare "invalid address" would look like a wallet
 * bug. The address is never rewritten on the user's behalf: the recipient has
 * to confirm the new spelling.
 */
export function obsoleteAddressMessage(address: string): string | null {
  if (addressKind(address) !== 'obsolete') return null;
  return `${address} is an old-format AuthScript address (nq1p… / tnq1p…) that the network no longer accepts. ` +
    'The same destination is now written nc1p… / tnc1p…: ask the recipient for their current address.';
}

// ── Bech32m ──────────────────────────────────────────────────────────────────

const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BECH32M_CONST = 0x2bc830a3;

function bech32Polymod(values: number[]): number {
  const generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const value of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i++) {
      if ((top >>> i) & 1) chk ^= generators[i];
    }
  }
  return chk >>> 0;
}

function hrpExpand(hrp: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) >> 5);
  out.push(0);
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) & 31);
  return out;
}

/**
 * Re-encode an address written in the old AuthScript spelling (`nq1p…` /
 * `tnq1p…`) as `nc1p…` / `tnc1p…`. Same witness program and scriptPubKey;
 * only the HRP and checksum change. Returns null for anything else, including
 * an old-spelling string whose checksum is wrong.
 */
export function reencodeObsoleteAddress(address: string): string | null {
  const value = String(address || '').trim().toLowerCase();
  if (addressKind(value) !== 'obsolete') return null;
  const separator = value.lastIndexOf('1');
  const hrp = value.slice(0, separator);
  const data = Array.from(value.slice(separator + 1), (c) => BECH32_CHARSET.indexOf(c));
  if (bech32Polymod([...hrpExpand(hrp), ...data]) !== BECH32M_CONST) return null;

  const newHrp = hrp === 'tnq' ? 'tnc' : 'nc';
  const payload = data.slice(0, -6);
  const polymod = bech32Polymod([...hrpExpand(newHrp), ...payload, 0, 0, 0, 0, 0, 0]) ^ BECH32M_CONST;
  const checksum = Array.from({ length: 6 }, (_, i) => (polymod >>> (5 * (5 - i))) & 31);
  return newHrp + '1' + [...payload, ...checksum].map((v) => BECH32_CHARSET[v]).join('');
}

// ── Transaction size ─────────────────────────────────────────────────────────

/**
 * Virtual size of each input and output, as the node and
 * neurai-sign-transaction 3 compute them.
 *
 * A witness input carries an ML-DSA-44 signature and public key (v1 / v2) or a
 * compressed ECDSA key (v3) in the witness, discounted 4:1.
 */
export const TX_VBYTES = Object.freeze({
  base: 10,
  /** Segwit marker + flag, once per transaction with a witness input. */
  witnessMarker: 0.5,
  input: { p2pkh: 148, authscript: 977.25, pq: 977.25, ecdsa: 70 } as Readonly<Record<string, number>>,
  output: { p2pkh: 34, witness: 43 }
});

/** vbytes of one input of the given family. Unknown families are sized as P2PKH. */
export function inputVbytes(kind: AddressKind): number {
  return TX_VBYTES.input[kind] ?? TX_VBYTES.input.p2pkh;
}

/** Bytes of one output paying `address`. Unknown addresses are sized as P2PKH. */
export function outputBytes(address: string | null | undefined): number {
  return isWitnessAddress(address) ? TX_VBYTES.output.witness : TX_VBYTES.output.p2pkh;
}

/**
 * Family of the input spending a prevout: from its script when known,
 * otherwise from the address holding it.
 */
export function prevoutKind(scriptHex: string | null | undefined, address: string | null | undefined): AddressKind {
  const fromScript = scriptKind(scriptHex);
  return fromScript !== 'unknown' ? fromScript : addressKind(address);
}

/**
 * Estimated virtual size of a transaction, rounded up.
 *
 * @param inputKinds - family of every prevout spent (see `prevoutKind`)
 * @param outputAddresses - address of every output
 */
export function estimateTxVbytes(inputKinds: readonly AddressKind[], outputAddresses: readonly string[]): number {
  const hasWitnessInput = inputKinds.some((kind) => kind !== 'p2pkh' && kind !== 'unknown');
  const inputs = inputKinds.reduce((total, kind) => total + inputVbytes(kind), 0);
  const outputs = outputAddresses.reduce((total, address) => total + outputBytes(address), 0);
  return Math.ceil(TX_VBYTES.base + (hasWitnessInput ? TX_VBYTES.witnessMarker : 0) + inputs + outputs);
}

/**
 * Fee in satoshis for `vbytes` at `feeRateXnaPerKvB` (XNA per 1000 vbytes, as
 * `estimatesmartfee` reports it), rounded up in integer arithmetic.
 */
export function feeSatsForVbytes(vbytes: number, feeRateXnaPerKvB: number): bigint {
  const rateSats = BigInt(Math.round(feeRateXnaPerKvB * 1e8));
  return (BigInt(Math.ceil(vbytes)) * rateSats + 999n) / 1000n;
}

/**
 * Dust limit (sats) of an output paying `address`.
 *
 * The node computes it as dustRelayFee (3000 sat/kB) × (output size + size of
 * the input that later spends it):
 *   P2PKH            34 + 148       → 546
 *   AuthScript / PQ  43 + 41 + 936  → 3060
 *   ECDSA v3         43 + 41 + 28   → 336
 */
export function dustThresholdSats(address: string | null | undefined): bigint {
  const kind = addressKind(address);
  if (kind === 'pq' || kind === 'authscript' || kind === 'obsolete') return 3060n;
  if (kind === 'ecdsa') return 336n;
  return 546n;
}
