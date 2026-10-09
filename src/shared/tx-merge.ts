// Neurai Wallet — keep other signers' unlocking data across a PSBT round trip.
//
// A site may hand over a transaction where some inputs are already signed by
// someone else (a swap: the seller's input, signed SINGLE|ANYONECANPAY, plus
// the buyer's inputs to sign). A PSBT built from the raw transaction carries
// none of that, so the transaction finalized from the wallet's PSBT would lose
// the seller's signature. The signatures this account adds commit to the
// prevouts, not to the other inputs' scriptSig or witness, so putting those
// back afterwards is sound.
//
// Self-contained (no imports): `node --test` loads it as is.

interface RawInput {
  prevout: string;   // 36 bytes, hex
  script: string;    // scriptSig, hex
  sequence: string;  // 4 bytes, hex
}

interface RawTransaction {
  version: number;
  versionHex: string;
  inputs: RawInput[];
  outputs: string[]; // each output serialized, hex
  witnesses: string[][]; // per input, each item hex
  locktime: string;  // 4 bytes, hex
}

class Reader {
  private offset = 0;
  private readonly hex: string;

  constructor(hex: string) {
    this.hex = hex;
  }

  bytes(count: number): string {
    const end = this.offset + count * 2;
    if (end > this.hex.length) throw new Error('Truncated raw transaction');
    const out = this.hex.slice(this.offset, end);
    this.offset = end;
    return out;
  }

  varint(): number {
    const first = parseInt(this.bytes(1), 16);
    if (first < 0xfd) return first;
    const size = first === 0xfd ? 2 : first === 0xfe ? 4 : 8;
    const le = this.bytes(size);
    let value = 0;
    for (let i = size - 1; i >= 0; i--) value = value * 256 + parseInt(le.slice(i * 2, i * 2 + 2), 16);
    if (!Number.isSafeInteger(value)) throw new Error('Varint out of range');
    return value;
  }

  peek(count: number): string {
    return this.hex.slice(this.offset, this.offset + count * 2);
  }

  done(): boolean {
    return this.offset === this.hex.length;
  }
}

function writeVarint(value: number): string {
  const le = (n: number, size: number) => {
    let out = '';
    for (let i = 0; i < size; i++) { out += (n % 256).toString(16).padStart(2, '0'); n = Math.floor(n / 256); }
    return out;
  };
  if (value < 0xfd) return le(value, 1);
  if (value <= 0xffff) return 'fd' + le(value, 2);
  if (value <= 0xffffffff) return 'fe' + le(value, 4);
  return 'ff' + le(value, 8);
}

function parse(txHex: string): RawTransaction {
  const hex = String(txHex || '').trim().toLowerCase();
  if (!/^[0-9a-f]*$/.test(hex) || hex.length % 2 !== 0) throw new Error('Invalid raw transaction hex');
  const r = new Reader(hex);
  const versionHex = r.bytes(4);
  const version = parseInt(versionHex.match(/../g)!.reverse().join(''), 16);
  const segwit = r.peek(2) === '0001';
  if (segwit) r.bytes(2);

  const inputs: RawInput[] = [];
  for (let i = r.varint(); i > 0; i--) {
    const prevout = r.bytes(36);
    const script = r.bytes(r.varint());
    inputs.push({ prevout, script, sequence: r.bytes(4) });
  }
  const outputs: string[] = [];
  for (let i = r.varint(); i > 0; i--) {
    const value = r.bytes(8);
    const scriptLen = r.varint();
    outputs.push(value + writeVarint(scriptLen) + r.bytes(scriptLen));
  }
  const witnesses: string[][] = inputs.map(() => []);
  if (segwit) {
    for (const items of witnesses) {
      for (let n = r.varint(); n > 0; n--) items.push(r.bytes(r.varint()));
    }
  }
  const locktime = r.bytes(4);
  if (!r.done()) throw new Error('Unsupported raw transaction layout (trailing data)');
  return { version, versionHex, inputs, outputs, witnesses, locktime };
}

function serialize(tx: RawTransaction): string {
  const segwit = tx.witnesses.some((items) => items.length > 0);
  let out = tx.versionHex + (segwit ? '0001' : '');
  out += writeVarint(tx.inputs.length);
  for (const input of tx.inputs) {
    out += input.prevout + writeVarint(input.script.length / 2) + input.script + input.sequence;
  }
  out += writeVarint(tx.outputs.length) + tx.outputs.join('');
  if (segwit) {
    for (const items of tx.witnesses) {
      out += writeVarint(items.length);
      for (const item of items) out += writeVarint(item.length / 2) + item;
    }
  }
  return out + tx.locktime;
}

/** Inputs of `txHex` that already carry a scriptSig or a witness. */
export function signedInputIndexes(txHex: string): number[] {
  const tx = parse(txHex);
  return tx.inputs
    .map((input, i) => (input.script.length > 0 || tx.witnesses[i].length > 0 ? i : -1))
    .filter((i) => i >= 0);
}

/**
 * `signedHex` with the scriptSig and witness of every input NOT in
 * `ownIndexes` taken from `originalHex`. The two transactions must spend the
 * same outpoints into the same outputs; that is checked here too.
 *
 * Version 3 transactions can carry reference inputs this parser does not
 * read, so they are refused when anything has to be copied.
 */
export function keepForeignUnlockingData(originalHex: string, signedHex: string, ownIndexes: readonly number[]): string {
  const original = parse(originalHex);
  const foreign = original.inputs
    .map((_, i) => i)
    .filter((i) => !ownIndexes.includes(i) && (original.inputs[i].script.length > 0 || original.witnesses[i].length > 0));
  if (foreign.length === 0) return signedHex;
  if (original.version >= 3) {
    throw new Error('Cannot keep the other signatures of a version 3 transaction');
  }

  const signed = parse(signedHex);
  const sameShape =
    signed.inputs.length === original.inputs.length &&
    signed.outputs.length === original.outputs.length &&
    signed.inputs.every((input, i) => input.prevout === original.inputs[i].prevout && input.sequence === original.inputs[i].sequence) &&
    signed.outputs.every((output, i) => output === original.outputs[i]) &&
    signed.locktime === original.locktime &&
    signed.versionHex === original.versionHex;
  if (!sameShape) throw new Error('The signed transaction is not the one that was sent for signing');

  for (const i of foreign) {
    signed.inputs[i] = { ...signed.inputs[i], script: original.inputs[i].script };
    signed.witnesses[i] = [...original.witnesses[i]];
  }
  return serialize(signed);
}

/** Round trip, for tests: parse and serialize unchanged. */
export function reserialize(txHex: string): string {
  return serialize(parse(txHex));
}
