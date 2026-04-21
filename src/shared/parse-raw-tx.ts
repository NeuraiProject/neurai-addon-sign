// Neurai Wallet — Shared raw-transaction parser.
//
// Consolidates the two duplicated parsers that lived in `popup/expanded.ts`
// and `popup/popup.ts`. The expanded variant (legacy + segwit aware) is
// adopted as the canonical implementation and extended to report per-input
// unlocking-material presence (`scriptSigLen`, `witnessItemCount`) so the
// `background` handler can compute the `complete` field after signing
// without pulling in `bitcoinjs-lib`.

export interface ParsedTxInput {
  txid: string;
  vout: number;
  sequence: number;
  /** Byte length of the scriptSig for this input. 0 if bare. */
  scriptSigLen: number;
  /** Number of witness stack items for this input. 0 if the tx is legacy-serialized or the input has no witness. */
  witnessItemCount: number;
}

export interface ParsedTxOutput {
  value: bigint;
  scriptHex: string;
}

export interface ParsedRawTransaction {
  inputs: ParsedTxInput[];
  outputs: ParsedTxOutput[];
}

function hexToBytes(hex: string): number[] {
  const normalized = String(hex || '').trim();
  if (!normalized || normalized.length % 2 !== 0) {
    throw new Error('Invalid raw transaction hex');
  }
  const bytes: number[] = [];
  for (let i = 0; i < normalized.length; i += 2) {
    bytes.push(parseInt(normalized.slice(i, i + 2), 16));
  }
  return bytes;
}

function bytesToHex(bytes: number[]): string {
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function readUInt32LE(bytes: number[], offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function readUInt64LE(bytes: number[], offset: number): bigint {
  const low = BigInt(readUInt32LE(bytes, offset));
  const high = BigInt(readUInt32LE(bytes, offset + 4));
  return low + (high << 32n);
}

function readVarInt(bytes: number[], offset: number): { value: number; size: number } {
  const first = bytes[offset];
  if (first < 0xfd) return { value: first, size: 1 };
  if (first === 0xfd) {
    return { value: bytes[offset + 1] | (bytes[offset + 2] << 8), size: 3 };
  }
  if (first === 0xfe) {
    return { value: readUInt32LE(bytes, offset + 1), size: 5 };
  }
  throw new Error('Unsupported varint in raw transaction');
}

/**
 * Parse a Neurai raw transaction hex. Supports both legacy and segwit
 * serialization (marker/flag 0x00 0x01 after version). Returns per-input
 * unlocking-material presence so callers can compute completeness.
 */
export function parseRawTransaction(txHex: string): ParsedRawTransaction {
  const bytes = hexToBytes(txHex);
  let offset = 0;

  if (bytes.length < 10) {
    throw new Error('Invalid raw transaction hex');
  }

  offset += 4; // version

  const hasWitness = bytes[offset] === 0x00 && bytes[offset + 1] === 0x01;
  if (hasWitness) offset += 2;

  const inputVarInt = readVarInt(bytes, offset);
  offset += inputVarInt.size;

  const inputs: ParsedTxInput[] = [];
  for (let i = 0; i < inputVarInt.value; i += 1) {
    const txidBytes = bytes.slice(offset, offset + 32);
    offset += 32;
    const vout = readUInt32LE(bytes, offset);
    offset += 4;
    const scriptLen = readVarInt(bytes, offset);
    offset += scriptLen.size;
    offset += scriptLen.value;
    const sequence = readUInt32LE(bytes, offset);
    offset += 4;

    inputs.push({
      txid: bytesToHex([...txidBytes].reverse()),
      vout,
      sequence,
      scriptSigLen: scriptLen.value,
      witnessItemCount: 0, // filled in below if hasWitness
    });
  }

  const outputVarInt = readVarInt(bytes, offset);
  offset += outputVarInt.size;
  const outputs: ParsedTxOutput[] = [];

  for (let i = 0; i < outputVarInt.value; i += 1) {
    const value = readUInt64LE(bytes, offset);
    offset += 8;
    const scriptLen = readVarInt(bytes, offset);
    offset += scriptLen.size;
    const scriptBytes = bytes.slice(offset, offset + scriptLen.value);
    offset += scriptLen.value;
    outputs.push({ value, scriptHex: bytesToHex(scriptBytes) });
  }

  if (hasWitness) {
    for (let i = 0; i < inputVarInt.value; i += 1) {
      const witnessItems = readVarInt(bytes, offset);
      offset += witnessItems.size;
      inputs[i].witnessItemCount = witnessItems.value;
      for (let j = 0; j < witnessItems.value; j += 1) {
        const itemLen = readVarInt(bytes, offset);
        offset += itemLen.size + itemLen.value;
      }
    }
  }

  return { inputs, outputs };
}

/** Convenience wrapper that returns only the inputs array. */
export function parseRawTransactionInputs(txHex: string): ParsedTxInput[] {
  return parseRawTransaction(txHex).inputs;
}

/** Convenience wrapper that returns only the outputs array. */
export function parseRawTransactionOutputs(txHex: string): ParsedTxOutput[] {
  return parseRawTransaction(txHex).outputs;
}
