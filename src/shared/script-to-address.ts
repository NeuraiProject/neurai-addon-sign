// Neurai Wallet — Minimal script-to-address decoder.
//
// Covers the address shapes the covenant-cancel approval popup needs to
// render: any P2PKH, plus the active wallet's own script whatever its family
// (P2PKH, AuthScript v1, PQ v2, ECDSA v3) — the refund of a cancelled order
// normally comes back to it. Anything else returns null so the popup falls
// back to a script-hex summary.
//
// Uses `globalThis.crypto.subtle` for SHA-256 (available both in DOM and
// service-worker contexts).

import type { WalletNetwork } from '../types/index.js';
import { isTestnetNetwork } from './networks.ts';

const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function hexToBytes(hex: string): Uint8Array {
  const clean = String(hex || '').trim().toLowerCase();
  if (!/^[0-9a-f]*$/.test(clean) || clean.length % 2 !== 0) return new Uint8Array(0);
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return out;
}

async function sha256d(bytes: Uint8Array): Promise<Uint8Array> {
  // Copy into a fresh buffer to satisfy BufferSource (rules out shared memory).
  const input = new Uint8Array(bytes);
  const a = await globalThis.crypto.subtle.digest('SHA-256', input.buffer as ArrayBuffer);
  const b = await globalThis.crypto.subtle.digest('SHA-256', a);
  return new Uint8Array(b);
}

function base58Encode(bytes: Uint8Array): string {
  let num = 0n;
  for (const b of bytes) num = (num << 8n) | BigInt(b);
  let s = '';
  while (num > 0n) {
    s = BASE58_ALPHABET[Number(num % 58n)] + s;
    num /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    s = '1' + s;
  }
  return s;
}

function isP2PKH(spk: Uint8Array): boolean {
  return (
    spk.length === 25 &&
    spk[0] === 0x76 && // OP_DUP
    spk[1] === 0xa9 && // OP_HASH160
    spk[2] === 0x14 && // PUSHBYTES_20
    spk[23] === 0x88 && // OP_EQUALVERIFY
    spk[24] === 0xac    // OP_CHECKSIG
  );
}

/**
 * Base58check-encode the given 20-byte PKH for the given network. Uses the
 * same version bytes as `lib/neurai-sign-transaction/src/coins/xna.ts`
 * (mainnet 53 `N…` / testnet 127 `t…`).
 */
async function encodeP2PKHAddress(pkh20: Uint8Array, network: WalletNetwork | string): Promise<string> {
  const versionByte = isTestnetNetwork(network) ? 127 : 53;
  const payload = new Uint8Array(1 + 20);
  payload[0] = versionByte;
  payload.set(pkh20, 1);
  const checksum = (await sha256d(payload)).slice(0, 4);
  const full = new Uint8Array(payload.length + 4);
  full.set(payload, 0);
  full.set(checksum, payload.length);
  return base58Encode(full);
}

/**
 * Try to decode a standalone scriptPubKey (no asset wrapper) to a human-
 * readable address. Returns null when the shape is not supported by this
 * decoder — callers must fall back to showing `scriptHex`.
 *
 * Supported: P2PKH. The AuthScript families (bech32m `tnc1p…`, `tpq1z…`,
 * `tnq1r…`) are not implemented here and return null — the popup falls back
 * to showing the scriptHex for unrecognised shapes.
 */
export async function decodePrefixAddress(
  prefixHex: string,
  network: WalletNetwork | string
): Promise<string | null> {
  const spk = hexToBytes(prefixHex);
  if (isP2PKH(spk)) {
    return encodeP2PKHAddress(spk.slice(3, 23), network);
  }
  return null;
}

/** The active wallet's address and its scriptPubKey (hex, no asset wrapper). */
export interface OwnScript {
  address: string;
  scriptHex: string;
}

/**
 * Address to show for a destination script: the wallet's own address when
 * the script is the wallet's, so a seller can confirm a refund comes back to
 * them in any address family; otherwise `decodePrefixAddress`.
 */
export async function describeDestination(
  scriptHex: string,
  network: WalletNetwork | string,
  own: OwnScript | null
): Promise<string | null> {
  if (own && scriptHex.toLowerCase() === own.scriptHex.toLowerCase()) {
    return own.address;
  }
  return decodePrefixAddress(scriptHex, network);
}
