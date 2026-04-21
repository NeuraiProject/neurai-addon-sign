// Neurai Wallet — Block explorer URL helpers.
//
// Build clickable links to transactions on configured block explorers. The
// explorer URL templates are per-network and live in `WalletSettings`:
//   - explorerMainnet (empty → default EXPLORER_URL_MAINNET)
//   - explorerTestnet (empty → default EXPLORER_URL_TESTNET)
//
// Templates may contain a literal `{txid}` placeholder that gets substituted
// with the transaction id. If the template has no `{txid}` placeholder, the
// txid is appended at the end (useful for path-style explorers written as
// `https://explorer.example/tx/`).

import { NEURAI_CONSTANTS } from './constants.js';
import type { WalletNetwork, WalletSettings } from '../types/index.js';

function isTestnetNetwork(network: WalletNetwork | string | undefined): boolean {
  return network === 'xna-test' || network === 'xna-legacy-test' || network === 'xna-pq-test';
}

/**
 * Resolve the block-explorer URL for a given `txid` and `network`. Returns
 * null if inputs are invalid (e.g. empty txid). Uses the per-network template
 * from settings, falling back to the built-in defaults when the setting is
 * empty.
 */
export function resolveExplorerTxUrl(
  network: WalletNetwork | string | undefined,
  txid: string,
  settings: WalletSettings | null | undefined
): string | null {
  if (!txid || !/^[0-9a-fA-F]{64}$/.test(txid)) return null;

  const template = isTestnetNetwork(network)
    ? settings?.explorerTestnet || NEURAI_CONSTANTS.EXPLORER_URL_TESTNET
    : settings?.explorerMainnet || NEURAI_CONSTANTS.EXPLORER_URL_MAINNET;

  if (!template) return null;

  if (template.includes('{txid}')) {
    return template.replace('{txid}', txid);
  }
  // Convenience: caller saved a base URL without the placeholder.
  return template.endsWith('/') ? template + txid : template + '/' + txid;
}

// ── Txid computation (SHA256d over the legacy-form bytes) ─────────────────

function hexToBytes(hex: string): Uint8Array {
  const normalized = String(hex || '').trim();
  if (!normalized || normalized.length % 2 !== 0) {
    throw new Error('Invalid raw transaction hex');
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function readUInt32LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>> 0
  );
}

function readVarInt(bytes: Uint8Array, offset: number): { value: number; size: number } {
  const first = bytes[offset];
  if (first < 0xfd) return { value: first, size: 1 };
  if (first === 0xfd) return { value: bytes[offset + 1] | (bytes[offset + 2] << 8), size: 3 };
  if (first === 0xfe) return { value: readUInt32LE(bytes, offset + 1), size: 5 };
  throw new Error('Unsupported varint in raw transaction');
}

/**
 * Strip the segwit marker/flag (0x0001) and witness section from a raw tx,
 * leaving the "legacy form" over which the txid is hashed. If the input has
 * no witness, returns the input as-is.
 */
function stripWitnessBytes(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 10) throw new Error('Invalid raw transaction hex');
  if (!(bytes[4] === 0x00 && bytes[5] === 0x01)) return bytes;

  let offset = 6; // skip version + marker + flag
  const inputVarInt = readVarInt(bytes, offset);
  offset += inputVarInt.size;

  const inputsStart = offset;
  for (let i = 0; i < inputVarInt.value; i += 1) {
    offset += 32 + 4; // prevout
    const scriptLen = readVarInt(bytes, offset);
    offset += scriptLen.size + scriptLen.value;
    offset += 4; // sequence
  }
  const outputVarInt = readVarInt(bytes, offset);
  offset += outputVarInt.size;
  for (let i = 0; i < outputVarInt.value; i += 1) {
    offset += 8;
    const scriptLen = readVarInt(bytes, offset);
    offset += scriptLen.size + scriptLen.value;
  }
  const ioEnd = offset;

  // Skip witness section: per input, readVarInt(items) then items of varInt-len.
  for (let i = 0; i < inputVarInt.value; i += 1) {
    const witnessItems = readVarInt(bytes, offset);
    offset += witnessItems.size;
    for (let j = 0; j < witnessItems.value; j += 1) {
      const itemLen = readVarInt(bytes, offset);
      offset += itemLen.size + itemLen.value;
    }
  }
  // After witness: 4 bytes locktime.
  const locktimeOffset = offset;

  const versionBytes = bytes.slice(0, 4);
  const ioBytes = bytes.slice(inputsStart - inputVarInt.size, ioEnd);
  const locktimeBytes = bytes.slice(locktimeOffset, locktimeOffset + 4);

  const legacy = new Uint8Array(versionBytes.length + ioBytes.length + locktimeBytes.length);
  legacy.set(versionBytes, 0);
  legacy.set(ioBytes, versionBytes.length);
  legacy.set(locktimeBytes, versionBytes.length + ioBytes.length);
  return legacy;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  // Copy into a plain ArrayBuffer-backed Uint8Array so that crypto.subtle.digest
  // accepts it under TS 6.x strict BufferSource typing (rejects SharedArrayBuffer-backed views).
  const buf = new ArrayBuffer(data.length);
  new Uint8Array(buf).set(data);
  const h = await crypto.subtle.digest('SHA-256', buf);
  return new Uint8Array(h);
}

/**
 * Compute the txid of a signed raw transaction hex. txid = SHA256d of the
 * legacy-form bytes (witness section, if present, is stripped), printed in
 * little-endian (the usual explorer display order).
 *
 * Returns `null` on any parsing error — callers can then skip the explorer
 * link without crashing the history view.
 */
export async function computeTxid(signedTxHex: string): Promise<string | null> {
  try {
    const bytes = hexToBytes(signedTxHex);
    const legacyBytes = stripWitnessBytes(bytes);
    const h1 = await sha256(legacyBytes);
    const h2 = await sha256(h1);
    return bytesToHex(h2.slice().reverse());
  } catch {
    return null;
  }
}
