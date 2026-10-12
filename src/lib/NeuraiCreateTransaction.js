var NeuraiCreateTransactionBundle = (function (exports) {
    'use strict';

    /** Exact monetary primitives. This module has no runtime dependencies. */
    const SATS_PER_XNA = 100000000n;
    const MAX_MONEY = 2100000000000000000n;
    /** Normalize a raw integer without preserving an already rounded number. */
    function toRawInteger(value, label = 'amount') {
        if (typeof value === 'bigint')
            return value;
        if (typeof value === 'number' && Number.isSafeInteger(value))
            return BigInt(value);
        if (typeof value === 'string' && /^-?\d+$/.test(value) && value.length <= 100)
            return BigInt(value);
        throw new Error(`${label}: expected an exact integer; use bigint or an integer string for large values`);
    }
    function assertMoneyRange(value, label = 'amount') {
        const raw = toRawInteger(value, label);
        if (raw < 0n || raw > MAX_MONEY)
            throw new Error(`${label} outside Neurai monetary range`);
        return raw;
    }
    /** Parse decimal units exactly, including scientific notation, with at most 8 decimals. */
    function decimalToSatoshis(value) {
        if (typeof value !== 'string' && typeof value !== 'number')
            throw new Error('Expected decimal string or number');
        if (typeof value === 'number' && !Number.isFinite(value))
            throw new Error('Amount must be finite');
        const text = String(value);
        if (text.length > 100)
            throw new Error('Amount too long');
        const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(text);
        if (!match)
            throw new Error('Invalid decimal amount');
        const exponent = Number(match[4] ?? 0);
        if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 100)
            throw new Error('Invalid decimal exponent');
        const fraction = match[3] ?? '';
        const shift = 8 + exponent - fraction.length;
        let raw = BigInt(match[2] + fraction);
        if (shift >= 0)
            raw *= 10n ** BigInt(shift);
        else {
            const divisor = 10n ** BigInt(-shift);
            if (raw % divisor !== 0n)
                throw new Error('Amount has more than 8 decimals');
            raw /= divisor;
        }
        if (typeof value === 'number' && raw > BigInt(Number.MAX_SAFE_INTEGER) && !Number.isSafeInteger(value)) {
            throw new Error('Large fractional amounts must be supplied as decimal strings');
        }
        return match[1] ? -raw : raw;
    }
    /** Format signed raw units without converting to floating point. */
    function satoshisToDecimal(value) {
        const raw = toRawInteger(value);
        const abs = raw < 0n ? -raw : raw;
        const fraction = (abs % SATS_PER_XNA).toString().padStart(8, '0').replace(/0+$/, '');
        return `${raw < 0n ? '-' : ''}${abs / SATS_PER_XNA}${fraction ? '.' + fraction : ''}`;
    }

    function ensureHex(hex, label = 'hex') {
        const normalized = String(hex || '').trim().toLowerCase();
        if (!/^[0-9a-f]*$/.test(normalized) || normalized.length % 2 !== 0) {
            throw new Error(`Invalid ${label}: expected even-length hex string`);
        }
        return normalized;
    }
    function hexToBytes(hex) {
        const normalized = ensureHex(hex);
        const bytes = new Uint8Array(normalized.length / 2);
        for (let i = 0; i < normalized.length; i += 2) {
            bytes[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16);
        }
        return bytes;
    }
    function bytesToHex(bytes) {
        return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    }
    function concatBytes(...parts) {
        const total = parts.reduce((sum, part) => sum + part.length, 0);
        const out = new Uint8Array(total);
        let offset = 0;
        for (const part of parts) {
            out.set(part, offset);
            offset += part.length;
        }
        return out;
    }
    function asciiBytes(text) {
        return Uint8Array.from(Array.from(text, (char) => char.charCodeAt(0)));
    }
    function serializeString(text) {
        const bytes = asciiBytes(text);
        return concatBytes(compactSize(bytes.length), bytes);
    }
    function reverseBytes(bytes) {
        return Uint8Array.from(Array.from(bytes).reverse());
    }
    function u32LE(value) {
        if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
            throw new Error(`uint32 out of range: ${value}`);
        }
        const out = new Uint8Array(4);
        const view = new DataView(out.buffer);
        view.setUint32(0, value, true);
        return out;
    }
    function u64LE(value) {
        const bigintValue = toRawInteger(value);
        if (bigintValue < 0n || bigintValue > 0xffffffffffffffffn) {
            throw new Error(`uint64 out of range: ${bigintValue}`);
        }
        const out = new Uint8Array(8);
        let remaining = bigintValue;
        for (let i = 0; i < 8; i += 1) {
            out[i] = Number(remaining & 0xffn);
            remaining >>= 8n;
        }
        return out;
    }
    function i64LE(value) {
        const bigintValue = toRawInteger(value);
        if (bigintValue < -0x8000000000000000n || bigintValue > 0x7fffffffffffffffn) {
            throw new Error(`int64 out of range: ${bigintValue}`);
        }
        const out = new Uint8Array(8);
        const view = new DataView(out.buffer);
        view.setBigInt64(0, bigintValue, true);
        return out;
    }
    function compactSize(value) {
        const bigintValue = toRawInteger(value);
        if (bigintValue < 0n)
            throw new Error('CompactSize cannot encode negative numbers');
        if (bigintValue < 253n) {
            return Uint8Array.of(Number(bigintValue));
        }
        if (bigintValue <= 0xffffn) {
            return concatBytes(Uint8Array.of(0xfd), u16LE(Number(bigintValue)));
        }
        if (bigintValue <= 0xffffffffn) {
            return concatBytes(Uint8Array.of(0xfe), u32LE(Number(bigintValue)));
        }
        return concatBytes(Uint8Array.of(0xff), u64LE(bigintValue));
    }
    function u16LE(value) {
        if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
            throw new Error(`uint16 out of range: ${value}`);
        }
        const out = new Uint8Array(2);
        const view = new DataView(out.buffer);
        view.setUint16(0, value, true);
        return out;
    }
    function pushData(data) {
        if (data.length > 0xffff) {
            throw new Error(`Pushdata too large for current implementation: ${data.length} bytes`);
        }
        if (data.length < 0x4c) {
            return concatBytes(Uint8Array.of(data.length), data);
        }
        if (data.length <= 0xff) {
            return concatBytes(Uint8Array.of(0x4c, data.length), data);
        }
        return concatBytes(Uint8Array.of(0x4d), u16LE(data.length), data);
    }

    // base-x encoding / decoding
    // Copyright (c) 2018 base-x contributors
    // Copyright (c) 2014-2018 The Bitcoin Core developers (base58.cpp)
    // Distributed under the MIT software license, see the accompanying
    // file LICENSE or http://www.opensource.org/licenses/mit-license.php.
    function base (ALPHABET) {
      if (ALPHABET.length >= 255) { throw new TypeError('Alphabet too long') }
      const BASE_MAP = new Uint8Array(256);
      for (let j = 0; j < BASE_MAP.length; j++) {
        BASE_MAP[j] = 255;
      }
      for (let i = 0; i < ALPHABET.length; i++) {
        const x = ALPHABET.charAt(i);
        const xc = x.charCodeAt(0);
        if (BASE_MAP[xc] !== 255) { throw new TypeError(x + ' is ambiguous') }
        BASE_MAP[xc] = i;
      }
      const BASE = ALPHABET.length;
      const LEADER = ALPHABET.charAt(0);
      const FACTOR = Math.log(BASE) / Math.log(256); // log(BASE) / log(256), rounded up
      const iFACTOR = Math.log(256) / Math.log(BASE); // log(256) / log(BASE), rounded up
      function encode (source) {
        // eslint-disable-next-line no-empty
        if (source instanceof Uint8Array) ; else if (ArrayBuffer.isView(source)) {
          source = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
        } else if (Array.isArray(source)) {
          source = Uint8Array.from(source);
        }
        if (!(source instanceof Uint8Array)) { throw new TypeError('Expected Uint8Array') }
        if (source.length === 0) { return '' }
        // Skip & count leading zeroes.
        let zeroes = 0;
        let length = 0;
        let pbegin = 0;
        const pend = source.length;
        while (pbegin !== pend && source[pbegin] === 0) {
          pbegin++;
          zeroes++;
        }
        // Allocate enough space in big-endian base58 representation.
        const size = ((pend - pbegin) * iFACTOR + 1) >>> 0;
        const b58 = new Uint8Array(size);
        // Process the bytes.
        while (pbegin !== pend) {
          let carry = source[pbegin];
          // Apply "b58 = b58 * 256 + ch".
          let i = 0;
          for (let it1 = size - 1; (carry !== 0 || i < length) && (it1 !== -1); it1--, i++) {
            carry += (256 * b58[it1]) >>> 0;
            b58[it1] = (carry % BASE) >>> 0;
            carry = (carry / BASE) >>> 0;
          }
          if (carry !== 0) { throw new Error('Non-zero carry') }
          length = i;
          pbegin++;
        }
        // Skip leading zeroes in base58 result.
        let it2 = size - length;
        while (it2 !== size && b58[it2] === 0) {
          it2++;
        }
        // Translate the result into a string.
        let str = LEADER.repeat(zeroes);
        for (; it2 < size; ++it2) { str += ALPHABET.charAt(b58[it2]); }
        return str
      }
      function decodeUnsafe (source) {
        if (typeof source !== 'string') { throw new TypeError('Expected String') }
        if (source.length === 0) { return new Uint8Array() }
        let psz = 0;
        // Skip and count leading '1's.
        let zeroes = 0;
        let length = 0;
        while (source[psz] === LEADER) {
          zeroes++;
          psz++;
        }
        // Allocate enough space in big-endian base256 representation.
        const size = (((source.length - psz) * FACTOR) + 1) >>> 0; // log(58) / log(256), rounded up.
        const b256 = new Uint8Array(size);
        // Process the characters.
        while (psz < source.length) {
          // Find code of next character
          const charCode = source.charCodeAt(psz);
          // Base map can not be indexed using char code
          if (charCode > 255) { return }
          // Decode character
          let carry = BASE_MAP[charCode];
          // Invalid character
          if (carry === 255) { return }
          let i = 0;
          for (let it3 = size - 1; (carry !== 0 || i < length) && (it3 !== -1); it3--, i++) {
            carry += (BASE * b256[it3]) >>> 0;
            b256[it3] = (carry % 256) >>> 0;
            carry = (carry / 256) >>> 0;
          }
          if (carry !== 0) { throw new Error('Non-zero carry') }
          length = i;
          psz++;
        }
        // Skip leading zeroes in b256.
        let it4 = size - length;
        while (it4 !== size && b256[it4] === 0) {
          it4++;
        }
        const vch = new Uint8Array(zeroes + (size - it4));
        let j = zeroes;
        while (it4 !== size) {
          vch[j++] = b256[it4++];
        }
        return vch
      }
      function decode (string) {
        const buffer = decodeUnsafe(string);
        if (buffer) { return buffer }
        throw new Error('Non-base' + BASE + ' character')
      }
      return {
        encode,
        decodeUnsafe,
        decode
      }
    }

    var ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    var base58 = base(ALPHABET);

    const IPFS_LENGTH = 0x20;
    const TXID_PREFIX = 0x54;
    function encodeAssetDataReference(value) {
        const normalized = String(value || '').trim();
        if (!normalized) {
            return new Uint8Array();
        }
        if (normalized.startsWith('Qm') && normalized.length === 46) {
            const decoded = Uint8Array.from(base58.decode(normalized));
            if (decoded.length !== 34) {
                throw new Error(`Invalid CIDv0 length for asset data: ${decoded.length}`);
            }
            return decoded;
        }
        if (normalized.length === 64 && /^[0-9a-fA-F]+$/.test(normalized)) {
            const txidBytes = hexToBytes(normalized);
            return Uint8Array.of(TXID_PREFIX, IPFS_LENGTH, ...txidBytes);
        }
        if (normalized.length === 68 && /^[0-9a-fA-F]+$/.test(normalized)) {
            const raw = hexToBytes(normalized);
            if (raw[1] !== IPFS_LENGTH) {
                throw new Error('Invalid raw asset data reference length prefix');
            }
            return raw;
        }
        throw new Error('Unsupported asset data reference. Expected CIDv0 (Qm...), 64-char txid, or 68-char raw hex');
    }
    function decodeAssetDataReferenceHex(value) {
        return bytesToHex(encodeAssetDataReference(value));
    }
    function isEncodedAssetDataReferenceHex(hex) {
        const normalized = ensureHex(hex);
        return normalized.length === 68 || normalized.length === 0;
    }
    function isCidV0AssetReference(value) {
        const normalized = String(value || '').trim();
        return normalized.startsWith('Qm') && normalized.length === 46;
    }
    function isTxidAssetReference(value) {
        const normalized = String(value || '').trim();
        return normalized.length === 64 && /^[0-9a-fA-F]+$/.test(normalized);
    }
    function isRawAssetDataReferenceHex(value) {
        const normalized = String(value || '').trim();
        return normalized.length === 68 && /^[0-9a-fA-F]+$/.test(normalized);
    }
    function formatAssetDataReferenceHex(value) {
        return bytesToHex(encodeAssetDataReference(value));
    }

    var dist = {};

    var hasRequiredDist;

    function requireDist () {
    	if (hasRequiredDist) return dist;
    	hasRequiredDist = 1;
    	Object.defineProperty(dist, "__esModule", { value: true });
    	dist.bech32m = dist.bech32 = void 0;
    	const ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
    	const ALPHABET_MAP = {};
    	for (let z = 0; z < ALPHABET.length; z++) {
    	    const x = ALPHABET.charAt(z);
    	    ALPHABET_MAP[x] = z;
    	}
    	function polymodStep(pre) {
    	    const b = pre >> 25;
    	    return (((pre & 0x1ffffff) << 5) ^
    	        (-((b >> 0) & 1) & 0x3b6a57b2) ^
    	        (-((b >> 1) & 1) & 0x26508e6d) ^
    	        (-((b >> 2) & 1) & 0x1ea119fa) ^
    	        (-((b >> 3) & 1) & 0x3d4233dd) ^
    	        (-((b >> 4) & 1) & 0x2a1462b3));
    	}
    	function prefixChk(prefix) {
    	    let chk = 1;
    	    for (let i = 0; i < prefix.length; ++i) {
    	        const c = prefix.charCodeAt(i);
    	        if (c < 33 || c > 126)
    	            return 'Invalid prefix (' + prefix + ')';
    	        chk = polymodStep(chk) ^ (c >> 5);
    	    }
    	    chk = polymodStep(chk);
    	    for (let i = 0; i < prefix.length; ++i) {
    	        const v = prefix.charCodeAt(i);
    	        chk = polymodStep(chk) ^ (v & 0x1f);
    	    }
    	    return chk;
    	}
    	function convert(data, inBits, outBits, pad) {
    	    let value = 0;
    	    let bits = 0;
    	    const maxV = (1 << outBits) - 1;
    	    const result = [];
    	    for (let i = 0; i < data.length; ++i) {
    	        value = (value << inBits) | data[i];
    	        bits += inBits;
    	        while (bits >= outBits) {
    	            bits -= outBits;
    	            result.push((value >> bits) & maxV);
    	        }
    	    }
    	    if (pad) {
    	        if (bits > 0) {
    	            result.push((value << (outBits - bits)) & maxV);
    	        }
    	    }
    	    else {
    	        if (bits >= inBits)
    	            return 'Excess padding';
    	        if ((value << (outBits - bits)) & maxV)
    	            return 'Non-zero padding';
    	    }
    	    return result;
    	}
    	function toWords(bytes) {
    	    return convert(bytes, 8, 5, true);
    	}
    	function fromWordsUnsafe(words) {
    	    const res = convert(words, 5, 8, false);
    	    if (Array.isArray(res))
    	        return res;
    	}
    	function fromWords(words) {
    	    const res = convert(words, 5, 8, false);
    	    if (Array.isArray(res))
    	        return res;
    	    throw new Error(res);
    	}
    	function getLibraryFromEncoding(encoding) {
    	    let ENCODING_CONST;
    	    if (encoding === 'bech32') {
    	        ENCODING_CONST = 1;
    	    }
    	    else {
    	        ENCODING_CONST = 0x2bc830a3;
    	    }
    	    function encode(prefix, words, LIMIT) {
    	        LIMIT = LIMIT || 90;
    	        if (prefix.length + 7 + words.length > LIMIT)
    	            throw new TypeError('Exceeds length limit');
    	        prefix = prefix.toLowerCase();
    	        // determine chk mod
    	        let chk = prefixChk(prefix);
    	        if (typeof chk === 'string')
    	            throw new Error(chk);
    	        let result = prefix + '1';
    	        for (let i = 0; i < words.length; ++i) {
    	            const x = words[i];
    	            if (x >> 5 !== 0)
    	                throw new Error('Non 5-bit word');
    	            chk = polymodStep(chk) ^ x;
    	            result += ALPHABET.charAt(x);
    	        }
    	        for (let i = 0; i < 6; ++i) {
    	            chk = polymodStep(chk);
    	        }
    	        chk ^= ENCODING_CONST;
    	        for (let i = 0; i < 6; ++i) {
    	            const v = (chk >> ((5 - i) * 5)) & 0x1f;
    	            result += ALPHABET.charAt(v);
    	        }
    	        return result;
    	    }
    	    function __decode(str, LIMIT) {
    	        LIMIT = LIMIT || 90;
    	        if (str.length < 8)
    	            return str + ' too short';
    	        if (str.length > LIMIT)
    	            return 'Exceeds length limit';
    	        // don't allow mixed case
    	        const lowered = str.toLowerCase();
    	        const uppered = str.toUpperCase();
    	        if (str !== lowered && str !== uppered)
    	            return 'Mixed-case string ' + str;
    	        str = lowered;
    	        const split = str.lastIndexOf('1');
    	        if (split === -1)
    	            return 'No separator character for ' + str;
    	        if (split === 0)
    	            return 'Missing prefix for ' + str;
    	        const prefix = str.slice(0, split);
    	        const wordChars = str.slice(split + 1);
    	        if (wordChars.length < 6)
    	            return 'Data too short';
    	        let chk = prefixChk(prefix);
    	        if (typeof chk === 'string')
    	            return chk;
    	        const words = [];
    	        for (let i = 0; i < wordChars.length; ++i) {
    	            const c = wordChars.charAt(i);
    	            const v = ALPHABET_MAP[c];
    	            if (v === undefined)
    	                return 'Unknown character ' + c;
    	            chk = polymodStep(chk) ^ v;
    	            // not in the checksum?
    	            if (i + 6 >= wordChars.length)
    	                continue;
    	            words.push(v);
    	        }
    	        if (chk !== ENCODING_CONST)
    	            return 'Invalid checksum for ' + str;
    	        return { prefix, words };
    	    }
    	    function decodeUnsafe(str, LIMIT) {
    	        const res = __decode(str, LIMIT);
    	        if (typeof res === 'object')
    	            return res;
    	    }
    	    function decode(str, LIMIT) {
    	        const res = __decode(str, LIMIT);
    	        if (typeof res === 'object')
    	            return res;
    	        throw new Error(res);
    	    }
    	    return {
    	        decodeUnsafe,
    	        decode,
    	        encode,
    	        toWords,
    	        fromWordsUnsafe,
    	        fromWords,
    	    };
    	}
    	dist.bech32 = getLibraryFromEncoding('bech32');
    	dist.bech32m = getLibraryFromEncoding('bech32m');
    	return dist;
    }

    var distExports = requireDist();

    /**
     * Utilities for hex, bytes, CSPRNG.
     * @module
     */
    /*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    // We use WebCrypto aka globalThis.crypto, which exists in browsers and node.js 16+.
    // node.js versions earlier than v19 don't declare it in global scope.
    // For node.js, package.json#exports field mapping rewrites import
    // from `crypto` to `cryptoNode`, which imports native module.
    // Makes the utils un-importable in browsers without a bundler.
    // Once node.js 18 is deprecated (2025-04-30), we can just drop the import.
    /** Checks if something is Uint8Array. Be careful: nodejs Buffer will return true. */
    function isBytes$1(a) {
        return a instanceof Uint8Array || (ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array');
    }
    /** Asserts something is Uint8Array. */
    function abytes$1(b, ...lengths) {
        if (!isBytes$1(b))
            throw new Error('Uint8Array expected');
        if (lengths.length > 0 && !lengths.includes(b.length))
            throw new Error('Uint8Array expected of length ' + lengths + ', got length=' + b.length);
    }
    /** Asserts a hash instance has not been destroyed / finished */
    function aexists$1(instance, checkFinished = true) {
        if (instance.destroyed)
            throw new Error('Hash instance has been destroyed');
        if (checkFinished && instance.finished)
            throw new Error('Hash#digest() has already been called');
    }
    /** Asserts output is properly-sized byte array */
    function aoutput$1(out, instance) {
        abytes$1(out);
        const min = instance.outputLen;
        if (out.length < min) {
            throw new Error('digestInto() expects output buffer of length at least ' + min);
        }
    }
    /** Zeroize a byte array. Warning: JS provides no guarantees. */
    function clean$1(...arrays) {
        for (let i = 0; i < arrays.length; i++) {
            arrays[i].fill(0);
        }
    }
    /** Create DataView of an array for easy byte-level manipulation. */
    function createView$1(arr) {
        return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    }
    /** The rotate right (circular right shift) operation for uint32 */
    function rotr$1(word, shift) {
        return (word << (32 - shift)) | (word >>> shift);
    }
    /**
     * Converts string to bytes using UTF8 encoding.
     * @example utf8ToBytes('abc') // Uint8Array.from([97, 98, 99])
     */
    function utf8ToBytes(str) {
        if (typeof str !== 'string')
            throw new Error('string expected');
        return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
    }
    /**
     * Normalizes (non-hex) string or Uint8Array to Uint8Array.
     * Warning: when Uint8Array is passed, it would NOT get copied.
     * Keep in mind for future mutable operations.
     */
    function toBytes(data) {
        if (typeof data === 'string')
            data = utf8ToBytes(data);
        abytes$1(data);
        return data;
    }
    /** For runtime check if class implements interface */
    class Hash {
    }
    /** Wraps hash function, creating an interface on top of it */
    function createHasher$1(hashCons) {
        const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
        const tmp = hashCons();
        hashC.outputLen = tmp.outputLen;
        hashC.blockLen = tmp.blockLen;
        hashC.create = () => hashCons();
        return hashC;
    }

    /**
     * Internal Merkle-Damgard hash utils.
     * @module
     */
    /** Polyfill for Safari 14. https://caniuse.com/mdn-javascript_builtins_dataview_setbiguint64 */
    function setBigUint64(view, byteOffset, value, isLE) {
        if (typeof view.setBigUint64 === 'function')
            return view.setBigUint64(byteOffset, value, isLE);
        const _32n = BigInt(32);
        const _u32_max = BigInt(0xffffffff);
        const wh = Number((value >> _32n) & _u32_max);
        const wl = Number(value & _u32_max);
        const h = isLE ? 4 : 0;
        const l = isLE ? 0 : 4;
        view.setUint32(byteOffset + h, wh, isLE);
        view.setUint32(byteOffset + l, wl, isLE);
    }
    /** Choice: a ? b : c */
    function Chi$1(a, b, c) {
        return (a & b) ^ (~a & c);
    }
    /** Majority function, true if any two inputs is true. */
    function Maj$1(a, b, c) {
        return (a & b) ^ (a & c) ^ (b & c);
    }
    /**
     * Merkle-Damgard hash construction base class.
     * Could be used to create MD5, RIPEMD, SHA1, SHA2.
     */
    let HashMD$1 = class HashMD extends Hash {
        constructor(blockLen, outputLen, padOffset, isLE) {
            super();
            this.finished = false;
            this.length = 0;
            this.pos = 0;
            this.destroyed = false;
            this.blockLen = blockLen;
            this.outputLen = outputLen;
            this.padOffset = padOffset;
            this.isLE = isLE;
            this.buffer = new Uint8Array(blockLen);
            this.view = createView$1(this.buffer);
        }
        update(data) {
            aexists$1(this);
            data = toBytes(data);
            abytes$1(data);
            const { view, buffer, blockLen } = this;
            const len = data.length;
            for (let pos = 0; pos < len;) {
                const take = Math.min(blockLen - this.pos, len - pos);
                // Fast path: we have at least one block in input, cast it to view and process
                if (take === blockLen) {
                    const dataView = createView$1(data);
                    for (; blockLen <= len - pos; pos += blockLen)
                        this.process(dataView, pos);
                    continue;
                }
                buffer.set(data.subarray(pos, pos + take), this.pos);
                this.pos += take;
                pos += take;
                if (this.pos === blockLen) {
                    this.process(view, 0);
                    this.pos = 0;
                }
            }
            this.length += data.length;
            this.roundClean();
            return this;
        }
        digestInto(out) {
            aexists$1(this);
            aoutput$1(out, this);
            this.finished = true;
            // Padding
            // We can avoid allocation of buffer for padding completely if it
            // was previously not allocated here. But it won't change performance.
            const { buffer, view, blockLen, isLE } = this;
            let { pos } = this;
            // append the bit '1' to the message
            buffer[pos++] = 0b10000000;
            clean$1(this.buffer.subarray(pos));
            // we have less than padOffset left in buffer, so we cannot put length in
            // current block, need process it and pad again
            if (this.padOffset > blockLen - pos) {
                this.process(view, 0);
                pos = 0;
            }
            // Pad until full block byte with zeros
            for (let i = pos; i < blockLen; i++)
                buffer[i] = 0;
            // Note: sha512 requires length to be 128bit integer, but length in JS will overflow before that
            // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
            // So we just write lowest 64 bits of that value.
            setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
            this.process(view, 0);
            const oview = createView$1(out);
            const len = this.outputLen;
            // NOTE: we do division by 4 later, which should be fused in single op with modulo by JIT
            if (len % 4)
                throw new Error('_sha2: outputLen should be aligned to 32bit');
            const outLen = len / 4;
            const state = this.get();
            if (outLen > state.length)
                throw new Error('_sha2: outputLen bigger than state');
            for (let i = 0; i < outLen; i++)
                oview.setUint32(4 * i, state[i], isLE);
        }
        digest() {
            const { buffer, outputLen } = this;
            this.digestInto(buffer);
            const res = buffer.slice(0, outputLen);
            this.destroy();
            return res;
        }
        _cloneInto(to) {
            to || (to = new this.constructor());
            to.set(...this.get());
            const { blockLen, buffer, length, finished, destroyed, pos } = this;
            to.destroyed = destroyed;
            to.finished = finished;
            to.length = length;
            to.pos = pos;
            if (length % blockLen)
                to.buffer.set(buffer);
            return to;
        }
        clone() {
            return this._cloneInto();
        }
    };
    /**
     * Initial SHA-2 state: fractional parts of square roots of first 16 primes 2..53.
     * Check out `test/misc/sha2-gen-iv.js` for recomputation guide.
     */
    /** Initial SHA256 state. Bits 0..32 of frac part of sqrt of primes 2..19 */
    const SHA256_IV$1 = /* @__PURE__ */ Uint32Array.from([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]);

    /**
     * SHA2 hash function. A.k.a. sha256, sha384, sha512, sha512_224, sha512_256.
     * SHA256 is the fastest hash implementable in JS, even faster than Blake3.
     * Check out [RFC 4634](https://datatracker.ietf.org/doc/html/rfc4634) and
     * [FIPS 180-4](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf).
     * @module
     */
    /**
     * Round constants:
     * First 32 bits of fractional parts of the cube roots of the first 64 primes 2..311)
     */
    // prettier-ignore
    const SHA256_K$1 = /* @__PURE__ */ Uint32Array.from([
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ]);
    /** Reusable temporary buffer. "W" comes straight from spec. */
    const SHA256_W$1 = /* @__PURE__ */ new Uint32Array(64);
    class SHA256 extends HashMD$1 {
        constructor(outputLen = 32) {
            super(64, outputLen, 8, false);
            // We cannot use array here since array allows indexing by variable
            // which means optimizer/compiler cannot use registers.
            this.A = SHA256_IV$1[0] | 0;
            this.B = SHA256_IV$1[1] | 0;
            this.C = SHA256_IV$1[2] | 0;
            this.D = SHA256_IV$1[3] | 0;
            this.E = SHA256_IV$1[4] | 0;
            this.F = SHA256_IV$1[5] | 0;
            this.G = SHA256_IV$1[6] | 0;
            this.H = SHA256_IV$1[7] | 0;
        }
        get() {
            const { A, B, C, D, E, F, G, H } = this;
            return [A, B, C, D, E, F, G, H];
        }
        // prettier-ignore
        set(A, B, C, D, E, F, G, H) {
            this.A = A | 0;
            this.B = B | 0;
            this.C = C | 0;
            this.D = D | 0;
            this.E = E | 0;
            this.F = F | 0;
            this.G = G | 0;
            this.H = H | 0;
        }
        process(view, offset) {
            // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
            for (let i = 0; i < 16; i++, offset += 4)
                SHA256_W$1[i] = view.getUint32(offset, false);
            for (let i = 16; i < 64; i++) {
                const W15 = SHA256_W$1[i - 15];
                const W2 = SHA256_W$1[i - 2];
                const s0 = rotr$1(W15, 7) ^ rotr$1(W15, 18) ^ (W15 >>> 3);
                const s1 = rotr$1(W2, 17) ^ rotr$1(W2, 19) ^ (W2 >>> 10);
                SHA256_W$1[i] = (s1 + SHA256_W$1[i - 7] + s0 + SHA256_W$1[i - 16]) | 0;
            }
            // Compression function main loop, 64 rounds
            let { A, B, C, D, E, F, G, H } = this;
            for (let i = 0; i < 64; i++) {
                const sigma1 = rotr$1(E, 6) ^ rotr$1(E, 11) ^ rotr$1(E, 25);
                const T1 = (H + sigma1 + Chi$1(E, F, G) + SHA256_K$1[i] + SHA256_W$1[i]) | 0;
                const sigma0 = rotr$1(A, 2) ^ rotr$1(A, 13) ^ rotr$1(A, 22);
                const T2 = (sigma0 + Maj$1(A, B, C)) | 0;
                H = G;
                G = F;
                F = E;
                E = (D + T1) | 0;
                D = C;
                C = B;
                B = A;
                A = (T1 + T2) | 0;
            }
            // Add the compressed chunk to the current hash value
            A = (A + this.A) | 0;
            B = (B + this.B) | 0;
            C = (C + this.C) | 0;
            D = (D + this.D) | 0;
            E = (E + this.E) | 0;
            F = (F + this.F) | 0;
            G = (G + this.G) | 0;
            H = (H + this.H) | 0;
            this.set(A, B, C, D, E, F, G, H);
        }
        roundClean() {
            clean$1(SHA256_W$1);
        }
        destroy() {
            this.set(0, 0, 0, 0, 0, 0, 0, 0);
            clean$1(this.buffer);
        }
    }
    /**
     * SHA2-256 hash function from RFC 4634.
     *
     * It is the fastest JS hash, even faster than Blake3.
     * To break sha256 using birthday attack, attackers need to try 2^128 hashes.
     * BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per 2025.
     */
    const sha256$2 = /* @__PURE__ */ createHasher$1(() => new SHA256());

    /**
     * SHA2-256 a.k.a. sha256. In JS, it is the fastest hash, even faster than Blake3.
     *
     * To break sha256 using birthday attack, attackers need to try 2^128 hashes.
     * BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per 2025.
     *
     * Check out [FIPS 180-4](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf).
     * @module
     * @deprecated
     */
    /** @deprecated Use import from `noble/hashes/sha2` module */
    const sha256$1 = sha256$2;

    function bs58checkBase (checksumFn) {
        // Encode a buffer as a base58-check encoded string
        function encode(payload) {
            var payloadU8 = Uint8Array.from(payload);
            var checksum = checksumFn(payloadU8);
            var length = payloadU8.length + 4;
            var both = new Uint8Array(length);
            both.set(payloadU8, 0);
            both.set(checksum.subarray(0, 4), payloadU8.length);
            return base58.encode(both);
        }
        function decodeRaw(buffer) {
            var payload = buffer.slice(0, -4);
            var checksum = buffer.slice(-4);
            var newChecksum = checksumFn(payload);
            // eslint-disable-next-line
            if (checksum[0] ^ newChecksum[0] |
                checksum[1] ^ newChecksum[1] |
                checksum[2] ^ newChecksum[2] |
                checksum[3] ^ newChecksum[3])
                return;
            return payload;
        }
        // Decode a base58-check encoded string to a buffer, no result if checksum is wrong
        function decodeUnsafe(str) {
            var buffer = base58.decodeUnsafe(str);
            if (buffer == null)
                return;
            return decodeRaw(buffer);
        }
        function decode(str) {
            var buffer = base58.decode(str);
            var payload = decodeRaw(buffer);
            if (payload == null)
                throw new Error('Invalid checksum');
            return payload;
        }
        return {
            encode: encode,
            decode: decode,
            decodeUnsafe: decodeUnsafe
        };
    }

    // SHA256(SHA256(buffer))
    function sha256x2(buffer) {
        return sha256$1(sha256$1(buffer));
    }
    var bs58check = bs58checkBase(sha256x2);

    function resolveAddressInput(address) {
        if (typeof address === 'string') {
            return String(address).trim();
        }
        if (address && typeof address.address === 'string') {
            return String(address.address).trim();
        }
        throw new Error('Address must be a string or an object with an address field');
    }

    const LEGACY_MAINNET_PREFIX = 53;
    const LEGACY_TESTNET_PREFIX = 127;
    const OP_XNA_ASSET = 0xc0;
    const OP_DROP = 0x75;
    const OP_1 = 0x51;
    const OP_RESERVED = 0x50;
    const WITNESS_FAMILIES = [
        {
            type: 'authscript',
            witnessVersion: 1,
            hrp: { mainnet: 'nc', testnet: 'tnc' },
            network: { mainnet: 'xna-authscript', testnet: 'xna-authscript-test' }
        },
        {
            type: 'pq',
            witnessVersion: 2,
            hrp: { mainnet: 'pq', testnet: 'tpq' },
            network: { mainnet: 'xna-pq', testnet: 'xna-pq-test' }
        },
        {
            type: 'ecdsa',
            witnessVersion: 3,
            hrp: { mainnet: 'nq', testnet: 'tnq' },
            network: { mainnet: 'xna', testnet: 'xna-test' }
        }
    ];
    const AUTHSCRIPT_MAINNET_HRP = 'nc';
    const AUTHSCRIPT_TESTNET_HRP = 'tnc';
    const PQ_MAINNET_HRP = 'pq';
    const PQ_TESTNET_HRP = 'tpq';
    const ECDSA_MAINNET_HRP = 'nq';
    const ECDSA_TESTNET_HRP = 'tnq';
    /** The family that owns `hrp` (lowercase), with the chain it encodes. */
    function witnessFamilyByHrp(hrp) {
        for (const family of WITNESS_FAMILIES) {
            if (family.hrp.mainnet === hrp)
                return { family, chain: 'mainnet' };
            if (family.hrp.testnet === hrp)
                return { family, chain: 'testnet' };
        }
        return undefined;
    }
    /** The family encoded by `witnessVersion`, or undefined for any other version. */
    function witnessFamilyByVersion(witnessVersion) {
        return WITNESS_FAMILIES.find((family) => family.witnessVersion === witnessVersion);
    }
    /** `OP_1`, `OP_2` or `OP_3`: the scriptPubKey opcode of a witness version. */
    function witnessVersionOpcode(witnessVersion) {
        if (!witnessFamilyByVersion(witnessVersion)) {
            throw new Error(`Unsupported AuthScript witness version: ${String(witnessVersion)} (expected 1, 2 or 3)`);
        }
        return OP_1 - 1 + witnessVersion;
    }
    /**
     * NIP-040 asset payload marker.
     *
     * Every transfer / new / owner / reissue payload opens with a 3-byte marker
     * followed by the type byte. The marker is consensus: blocks below the NIP-040
     * activation height of a network only accept `rvn` on new asset outputs and
     * blocks at or above it only accept `xna` (mainnet: not scheduled; reset testnet:
     * 10; regtest: 1). This library does NOT know chain state and never
     * infers the marker from a network or an address: the caller passes the
     * value reported by the node for the next block
     * (`getblockchaininfo.asset_marker`, node commit 347362b) — or, when building
     * offline, the marker it knows to be right. Without it the default is `rvn`,
     * byte-for-byte identical to 0.6.0.
     */
    const DEFAULT_ASSET_MARKER = 'rvn';
    const ASSET_MARKER_BYTES = {
        rvn: [0x72, 0x76, 0x6e],
        xna: [0x78, 0x6e, 0x61]
    };
    const ASSET_PAYLOAD_TYPE_BYTE = {
        transfer: 0x74, // 't'
        new: 0x71, // 'q'
        owner: 0x6f, // 'o'
        reissue: 0x72 // 'r'
    };
    /**
     * Applies the default only when the marker was not given at all (`undefined`)
     * and rejects anything else that is not `'rvn'` or `'xna'` — including
     * `null`, which is what a missing or null `asset_marker` in a JSON reply
     * becomes: it must fail loudly, not silently build a legacy output.
     */
    function resolveAssetMarker(value) {
        if (value === undefined)
            return DEFAULT_ASSET_MARKER;
        if (value === 'rvn' || value === 'xna')
            return value;
        throw new Error(`Invalid assetMarker: ${String(value)} (expected 'rvn' or 'xna', the value of getblockchaininfo.asset_marker)`);
    }
    /**
     * The only place marker bytes are assembled (mirror of the node's
     * `AppendAssetMarkerPrefix`): `<marker 3B> <type 1B>`.
     */
    function assetPayloadPrefix(marker, type) {
        const typeByte = ASSET_PAYLOAD_TYPE_BYTE[type];
        if (typeByte === undefined) {
            throw new Error(`Unknown asset payload type: ${String(type)}`);
        }
        const [a, b, c] = ASSET_MARKER_BYTES[resolveAssetMarker(marker)];
        return Uint8Array.of(a, b, c, typeByte);
    }

    // Longest Bech32m string the node's decoder accepts (bech32.cpp).
    const BECH32M_MAX_LENGTH = 90;
    const AUTHSCRIPT_PROGRAM_LENGTH = 32;
    function tryBech32mDecode(address) {
        try {
            const { prefix, words } = distExports.bech32m.decode(address, BECH32M_MAX_LENGTH);
            return { hrp: prefix.toLowerCase(), words };
        }
        catch {
            return null;
        }
    }
    function decodeWitnessAddress(address, parts) {
        const owner = witnessFamilyByHrp(parts.hrp);
        if (!owner) {
            throw new Error(`Unsupported Bech32m prefix "${parts.hrp}" for ${address}`);
        }
        if (parts.words.length === 0) {
            throw new Error(`Empty witness program in ${address}`);
        }
        const version = parts.words[0];
        const { family, chain } = owner;
        if (version !== family.witnessVersion) {
            const actual = witnessFamilyByVersion(version);
            const hint = actual
                ? `; witness v${version} addresses use the "${actual.hrp[chain]}" prefix`
                : '';
            const legacyHint = family.type === 'ecdsa' && version === 1
                ? ' Generic AuthScript v1 addresses are now encoded as nc1p… / tnc1p… ' +
                    '(same scriptPubKey): regenerate the address (neurai-key xna-authscript networks).'
                : '';
            throw new Error(`Address ${address}: the "${parts.hrp}" prefix only encodes witness v${family.witnessVersion}, ` +
                `not v${version}${hint}.${legacyHint}`);
        }
        let program;
        try {
            program = Uint8Array.from(distExports.bech32m.fromWords(parts.words.slice(1)));
        }
        catch {
            throw new Error(`Invalid witness program padding in ${address}`);
        }
        if (program.length !== AUTHSCRIPT_PROGRAM_LENGTH) {
            throw new Error(`Unsupported AuthScript program length ${program.length} for ${address} (expected ${AUTHSCRIPT_PROGRAM_LENGTH})`);
        }
        return {
            address,
            type: family.type,
            witnessVersion: family.witnessVersion,
            network: family.network[chain],
            program,
            commitment: program
        };
    }
    function decodeLegacyAddress(address) {
        const payload = Uint8Array.from(bs58check.decode(address));
        if (payload.length !== 21) {
            throw new Error(`Unsupported legacy address payload length for ${address}`);
        }
        const prefix = payload[0];
        if (prefix !== LEGACY_MAINNET_PREFIX && prefix !== LEGACY_TESTNET_PREFIX) {
            throw new Error(`Unsupported legacy address prefix ${prefix} for ${address}`);
        }
        return {
            address,
            type: 'p2pkh',
            network: prefix === LEGACY_MAINNET_PREFIX ? 'xna-legacy' : 'xna-legacy-test',
            program: payload.slice(1),
            hash: payload.slice(1)
        };
    }
    /**
     * Decode a Neurai address the way the node does (base58.cpp
     * `DecodeDestination`): Bech32m first, Base58Check otherwise.
     *
     * - Base58 P2PKH → `type: 'p2pkh'`, network `xna-legacy` / `xna-legacy-test`
     *   (an `xna-old-legacy` address is indistinguishable and reports
     *   `xna-legacy`).
     * - Bech32m → `authscript` (v1, `nc`/`tnc`), `pq` (v2, `pq`/`tpq`) or
     *   `ecdsa` (v3, `nq`/`tnq`), with `witnessVersion` and the 32-byte
     *   commitment. Any other HRP/version pair is rejected, including the old
     *   `nq1p…` / `tnq1p…` encoding of generic AuthScript v1.
     *
     * The decoder does not know whether a witness family is active on the
     * target chain: before activation the node refuses v2/v3 addresses and a
     * witness output is anyone-can-spend.
     */
    function decodeAddress(address) {
        const normalized = resolveAddressInput(address);
        if (!normalized)
            throw new Error('Address is required');
        const bech32mParts = tryBech32mDecode(normalized);
        if (bech32mParts) {
            return decodeWitnessAddress(normalized, bech32mParts);
        }
        try {
            return decodeLegacyAddress(normalized);
        }
        catch (legacyError) {
            // Not Base58 either. When the string carries a known Bech32m prefix the
            // Bech32m failure (bad checksum, mixed case…) is the useful diagnosis.
            const separator = normalized.lastIndexOf('1');
            const hrp = separator > 0 ? normalized.slice(0, separator).toLowerCase() : '';
            if (witnessFamilyByHrp(hrp)) {
                throw new Error(`Invalid Bech32m address ${normalized} (checksum, case or character error)`);
            }
            throw legacyError;
        }
    }
    /** Chain-family label of an address: see `decodeAddress`. */
    function inferNetworkFromAddress(address) {
        return decodeAddress(address).network;
    }
    /** True for the Bech32m (AuthScript v1, PQ v2, ECDSA v3) destinations. */
    function isWitnessDestination(destination) {
        return destination.type !== 'p2pkh';
    }
    /** `OP_n 0x20 <32-byte commitment>` for witness version `n` (1, 2 or 3). */
    function encodeWitnessProgramScript(witnessVersion, commitment) {
        const bytes = typeof commitment === 'string' ? hexToBytes(commitment) : commitment;
        if (bytes.length !== AUTHSCRIPT_PROGRAM_LENGTH) {
            throw new Error(`AuthScript commitment must be ${AUTHSCRIPT_PROGRAM_LENGTH} bytes, got ${bytes.length}`);
        }
        return concatBytes(Uint8Array.of(witnessVersionOpcode(witnessVersion)), pushData(bytes));
    }
    function encodeP2PKHScript(address) {
        const destination = decodeAddress(address);
        if (destination.type !== 'p2pkh') {
            throw new Error(`Address ${resolveAddressInput(address)} is not legacy P2PKH`);
        }
        return Uint8Array.of(0x76, 0xa9, 0x14, ...destination.hash, 0x88, 0xac);
    }
    /**
     * scriptPubKey of an AuthScript destination of any witness version:
     * `OP_1` (generic v1), `OP_2` (PQ) or `OP_3` (ECDSA) followed by the
     * 32-byte commitment.
     */
    function encodeAuthScriptDestinationScript(address) {
        const destination = decodeAddress(address);
        if (!isWitnessDestination(destination)) {
            throw new Error(`Address ${resolveAddressInput(address)} is not an AuthScript (witness v1, v2 or v3) address`);
        }
        return encodeWitnessProgramScript(destination.witnessVersion, destination.commitment);
    }
    function encodeDestinationScript(address) {
        const destination = decodeAddress(address);
        return isWitnessDestination(destination)
            ? encodeWitnessProgramScript(destination.witnessVersion, destination.commitment)
            : encodeP2PKHScript(address);
    }
    function encodeNullAssetDestinationScript(address, mode = 'strict') {
        const destination = decodeAddress(address);
        if (isWitnessDestination(destination)) {
            if (mode === 'hash20') {
                throw new Error('hash20 null-asset mode is not supported for AuthScript destinations');
            }
            return concatBytes(Uint8Array.of(OP_XNA_ASSET, witnessVersionOpcode(destination.witnessVersion)), pushData(destination.commitment));
        }
        return concatBytes(Uint8Array.of(OP_XNA_ASSET), pushData(destination.hash));
    }
    /**
     * @deprecated The name predates the PQ witness v2 family: it encodes every
     * AuthScript witness version. Use `encodeAuthScriptDestinationScript`.
     */
    const encodePQWitnessScript = encodeAuthScriptDestinationScript;
    /**
     * Classify a scriptPubKey by its destination prefix, ignoring any trailing
     * asset wrapper: `76a914<20>88ac…` is P2PKH, `5120<32>…`, `5220<32>…` and
     * `5320<32>…` are AuthScript v1 (generic), v2 (PQ) and v3 (ECDSA).
     */
    function classifyScriptPubKey(script) {
        const bytes = typeof script === 'string' ? hexToBytes(script) : script;
        if (bytes.length >= 25 &&
            bytes[0] === 0x76 &&
            bytes[1] === 0xa9 &&
            bytes[2] === 0x14 &&
            bytes[23] === 0x88 &&
            bytes[24] === 0xac) {
            return { type: 'p2pkh', program: bytes.slice(3, 23), hasSuffix: bytes.length > 25 };
        }
        if (bytes.length >= 34 && bytes[1] === 0x20) {
            const family = witnessFamilyByVersion(bytes[0] - (OP_1 - 1));
            if (family) {
                return {
                    type: family.type,
                    witnessVersion: family.witnessVersion,
                    program: bytes.slice(2, 34),
                    hasSuffix: bytes.length > 34
                };
            }
        }
        return { type: 'unknown', hasSuffix: false };
    }

    const OWNER_ASSET_AMOUNT = 100000000n;
    const UNIQUE_ASSET_AMOUNT = 100000000n;
    const UNIQUE_ASSET_UNITS = 0;
    const UNIQUE_ASSETS_REISSUABLE = false;
    const MAINNET_BURN_ADDRESSES = {
        ISSUE_ROOT: 'NbURNXXXXXXXXXXXXXXXXXXXXXXXT65Gdr',
        ISSUE_SUB: 'NXissueSubAssetXXXXXXXXXXXXXX6B2JF',
        ISSUE_UNIQUE: 'NXissueUniqueAssetXXXXXXXXXXUBzP4Z',
        ISSUE_DEPIN: 'NXissueUniqueAssetXXXXXXXXXXUBzP4Z',
        ISSUE_MSGCHANNEL: 'NXissueMsgChanneLAssetXXXXXXTUzrtJ',
        REISSUE: 'NXReissueAssetXXXXXXXXXXXXXXWLe4Ao',
        REISSUE_RESTRICTED: 'NXReissueAssetXXXXXXXXXXXXXXWLe4Ao',
        ISSUE_RESTRICTED: 'NXissueRestrictedXXXXXXXXXXXWpXx4H',
        ISSUE_QUALIFIER: 'NXissueQuaLifierXXXXXXXXXXXXWurNcU',
        ISSUE_SUB_QUALIFIER: 'NXissueSubQuaLifierXXXXXXXXXV71vM3',
        TAG_ADDRESS: 'NXaddTagBurnXXXXXXXXXXXXXXXXWucUTr',
        UNTAG_ADDRESS: 'NXaddTagBurnXXXXXXXXXXXXXXXXWucUTr'
    };
    const TESTNET_BURN_ADDRESSES = {
        ISSUE_ROOT: 'tBURNXXXXXXXXXXXXXXXXXXXXXXXVZLroy',
        ISSUE_SUB: 'tSubAssetXXXXXXXXXXXXXXXXXXXXGTvF4',
        ISSUE_UNIQUE: 'tUniqueAssetXXXXXXXXXXXXXXXXVCgpLs',
        ISSUE_DEPIN: 'tUniqueAssetXXXXXXXXXXXXXXXXVCgpLs',
        ISSUE_MSGCHANNEL: 'tMsgChanneLAssetXXXXXXXXXXXXVsJoya',
        REISSUE: 'tAssetXXXXXXXXXXXXXXXXXXXXXXas6pz8',
        REISSUE_RESTRICTED: 'tAssetXXXXXXXXXXXXXXXXXXXXXXas6pz8',
        ISSUE_RESTRICTED: 'tRestrictedXXXXXXXXXXXXXXXXXVyPBEK',
        ISSUE_QUALIFIER: 'tQuaLifierXXXXXXXXXXXXXXXXXXT5czoV',
        ISSUE_SUB_QUALIFIER: 'tSubQuaLifierXXXXXXXXXXXXXXXW5MmGk',
        TAG_ADDRESS: 'tTagBurnXXXXXXXXXXXXXXXXXXXXYm6pxA',
        UNTAG_ADDRESS: 'tTagBurnXXXXXXXXXXXXXXXXXXXXYm6pxA'
    };
    const BURN_COSTS_XNA = {
        ISSUE_ROOT: 1000,
        ISSUE_SUB: 200,
        ISSUE_UNIQUE: 10,
        ISSUE_DEPIN: 10,
        ISSUE_MSGCHANNEL: 200,
        ISSUE_QUALIFIER: 2000,
        ISSUE_SUB_QUALIFIER: 200,
        ISSUE_RESTRICTED: 3000,
        REISSUE: 200,
        REISSUE_RESTRICTED: 200,
        TAG_ADDRESS: 0.2,
        UNTAG_ADDRESS: 0.2
    };
    // Regtest chainparams use one global burn address for every operation
    // (node chainparams.cpp strGlobalBurnAddress). Pass it as the
    // `burnAddress` override of the issuance/reissue builders when targeting
    // regtest; `getBurnAddressForOperation` only models mainnet/testnet.
    const REGTEST_GLOBAL_BURN_ADDRESS = 'tBURNXXXXXXXXXXXXXXXXXXXXXXXVZLroy';
    /**
     * Every value `SupportedNetwork` admits, and the chain family each belongs to.
     *
     * Written as an exhaustive map rather than a couple of comparisons so that a
     * network added to the union upstream fails to compile here instead of
     * silently defaulting to testnet.
     */
    const NETWORK_FAMILY = {
        'xna': 'mainnet',
        'xna-legacy': 'mainnet',
        'xna-old-legacy': 'mainnet',
        'xna-pq': 'mainnet',
        'xna-authscript': 'mainnet',
        'xna-test': 'testnet',
        'xna-legacy-test': 'testnet',
        'xna-pq-test': 'testnet',
        'xna-authscript-test': 'testnet'
    };
    /**
     * Resolve a network to its chain family, rejecting anything unrecognised.
     *
     * This used to return `'testnet'` for every value that was not explicitly
     * mainnet. TypeScript keeps its own callers honest, but a JavaScript consumer
     * passing the alias `'mainnet'` — which other libraries in the stack accept —
     * landed in the testnet branch and **slipped past the DEPIN mainnet guard**,
     * while the canonical `'xna'` triggered it. An unrecognised label is a caller
     * error, not an implicit testnet.
     *
     * Callers that speak in aliases must normalize first: `'mainnet'` to `'xna'`,
     * `'testnet'` to `'xna-test'`.
     *
     * Regtest is not a member of `SupportedNetwork` — it shares testnet's address
     * prefixes — and now throws here. That reaches `getBurnAddressForOperation`,
     * which used to answer with the TESTNET burn addresses: wrong for regtest,
     * whose chainparams use a single global burn address for every operation, so
     * only ISSUE_ROOT happened to coincide. Pass `REGTEST_GLOBAL_BURN_ADDRESS` as
     * the `burnAddress` override instead; the previous answer had to be replaced
     * anyway.
     *
     * @param network - Network label
     * @returns The chain family
     * @throws If the label is not a supported network
     */
    function resolveNetworkFamily(network) {
        const family = NETWORK_FAMILY[network];
        if (family === undefined) {
            throw new Error(`Unsupported network: ${JSON.stringify(network)}. Expected one of ` +
                `${Object.keys(NETWORK_FAMILY).join(', ')}. Aliases such as 'mainnet' ` +
                `or 'testnet' must be normalized by the caller ('xna', 'xna-test'); ` +
                `for regtest, pass REGTEST_GLOBAL_BURN_ADDRESS as the burnAddress override.`);
        }
        return family;
    }
    function getBurnAddressForOperation(network, operation) {
        const byFamily = resolveNetworkFamily(network) === 'mainnet'
            ? MAINNET_BURN_ADDRESSES
            : TESTNET_BURN_ADDRESSES;
        return byFamily[operation];
    }
    function getBurnAmountXna(operation, multiplier = 1) {
        return BURN_COSTS_XNA[operation] * multiplier;
    }
    function getBurnAmountSats(operation, multiplier = 1) {
        return assertMoneyRange(decimalToSatoshis(BURN_COSTS_XNA[operation]) * assertMoneyRange(toRawInteger(multiplier, 'burn multiplier')));
    }
    /**
     * Network label of an address, from its encoding (see `decodeAddress`):
     * `xna-legacy[-test]` for Base58, `xna-authscript[-test]` for `nc1`/`tnc1`,
     * `xna-pq[-test]` for `pq1`/`tpq1` and `xna[-test]` for `nq1`/`tnq1`.
     */
    function inferNetworkFromAnyAddress(address) {
        return inferNetworkFromAddress(address);
    }
    function getOwnerTokenName(assetName) {
        if (assetName.startsWith('$')) {
            return `${assetName.slice(1)}!`;
        }
        return `${assetName}!`;
    }
    function getParentAssetName(assetName) {
        // The parent is the immediate one, not the root: "A/B/C" is owned by "A/B!"
        // (node GetParentName resolves with find_last_of for SUB and DEPIN alike).
        const slashIndex = assetName.lastIndexOf('/');
        if (slashIndex === -1) {
            return null;
        }
        return assetName.slice(0, slashIndex);
    }
    function getUniqueAssetName(rootName, tag) {
        return `${rootName}#${tag}`;
    }
    function normalizeVerifierString(verifierString) {
        return String(verifierString || '')
            .replace(/\s+/g, '')
            .replace(/#/g, '');
    }
    // The node accepts DEPIN names up to 121 chars where DePIN is enabled, but a
    // 121-char base name yields a 122-char owner token ("&X!") that fails the
    // global name-length check, making the asset untransferable. Capped at 120
    // here so every name this library issues keeps a nameable owner token.
    const DEPIN_MAX_NAME_LENGTH = 120;
    function isDepinAssetName(assetName) {
        const normalized = String(assetName || '').trim();
        if (normalized.length > DEPIN_MAX_NAME_LENGTH) {
            return false;
        }
        if (!normalized.includes('/')) {
            return /^&[A-Z0-9._]{3,}$/.test(normalized);
        }
        if (!/^&[A-Z0-9._]+\/[A-Z0-9._/]+$/.test(normalized)) {
            return false;
        }
        // The node parser lets the first part count its leading '&' toward the
        // 3-char minimum ("&AB/CDE" parses), but such an asset can never be issued:
        // its parent "&AB" is not a valid root, so the parent owner token "&AB!"
        // required at issuance cannot exist. Require 3 real chars in every segment.
        const [root, ...rest] = normalized.split('/');
        return root.length >= 4 && rest.every((part) => part.length >= 3);
    }
    function assertDepinAssetName(assetName) {
        if (!isDepinAssetName(assetName)) {
            throw new Error(`Invalid DEPIN asset name: ${assetName}`);
        }
    }
    function assertDepinNetwork(network) {
        if (network !== undefined && resolveNetworkFamily(network) === 'mainnet') {
            throw new Error(`DEPIN assets are only available on testnet/regtest networks: ${network}`);
        }
    }

    function xnaToSatoshis(amount) {
        return assertMoneyRange(decimalToSatoshis(amount));
    }
    function assetUnitsToRaw(amount) {
        return xnaToSatoshis(amount);
    }
    function encodeAssetTransferPayload(assetName, amountRaw, message, expireTime, options) {
        const payload = [
            assetPayloadPrefix(options?.assetMarker, 'transfer'),
            serializeString(assetName),
            u64LE(assertMoneyRange(amountRaw))
        ];
        const encodedMessage = encodeAssetDataReference(message);
        if (encodedMessage.length > 0) {
            payload.push(encodedMessage);
            if (expireTime !== undefined && toRawInteger(expireTime) !== 0n) {
                payload.push(i64LE(expireTime));
            }
        }
        return concatBytes(...payload);
    }
    function encodeAssetTransferScript(address, assetName, amountRaw, message, expireTime, options) {
        return concatBytes(encodeDestinationScript(address), Uint8Array.of(OP_XNA_ASSET), pushData(encodeAssetTransferPayload(assetName, amountRaw, message, expireTime, options)), Uint8Array.of(OP_DROP));
    }
    /**
     * True when `script` is exactly the 25-byte P2PKH form
     * `OP_DUP OP_HASH160 0x14 <20B> OP_EQUALVERIFY OP_CHECKSIG`. Consensus only
     * recognises the asset wrapper when OP_XNA_ASSET sits at byte 25 after this
     * exact prefix (node `HasAssetOpcodeInExpectedPosition`).
     */
    function isP2pkhScript(script) {
        return (script.length === 25 &&
            script[0] === 0x76 &&
            script[1] === 0xa9 &&
            script[2] === 0x14 &&
            script[23] === 0x88 &&
            script[24] === 0xac);
    }
    /**
     * True when `script` is exactly the 34-byte AuthScript form
     * `OP_n 0x20 <32-byte commitment>`, with `OP_1` (generic v1), `OP_2` (PQ)
     * or `OP_3` (ECDSA). Consensus only recognises the asset wrapper when
     * OP_XNA_ASSET sits at byte 34 after this exact prefix; `OP_2` / `OP_3`
     * only where the strict AuthScript families are active.
     */
    function isAuthScriptScript(script) {
        return (script.length === 34 &&
            (script[0] === 0x51 || script[0] === 0x52 || script[0] === 0x53) &&
            script[1] === 0x20);
    }
    /**
     * Like `encodeAssetTransferScript` but takes a raw scriptPubKey instead of
     * deriving one from an address, for callers that already hold the
     * scriptPubKey bytes.
     *
     * The recipient script must be exactly P2PKH (25 bytes) or AuthScript
     * `OP_n <32B>` (34 bytes, n = 1, 2 or 3): the node's OP_XNA_ASSET placement rules only
     * accept the asset wrapper right after one of those two prefixes, on every
     * network, so appending it to any other script (a bare covenant, P2SH, …)
     * produces a consensus-invalid output. To pay assets into an arbitrary
     * script, commit it into an AuthScript destination instead (derive the
     * address with neurai-key's `getNoAuthAddress`) and use the regular
     * address-based transfer helpers.
     *
     * The asset-transfer wrapper is appended exactly as in the address-based
     * variant: `<recipientScriptPubKey> OP_XNA_ASSET <pushdata(payload)> OP_DROP`.
     *
     * Note: this helper only builds the output. Spending an AuthScript output
     * takes a witness stack; `createUnsignedTransaction` serializes the legacy
     * pre-segwit format only, so serialize such spends with the transaction
     * codec's `serializeTransaction` (tx-codec.ts, 0.5.1+) instead.
     */
    function encodeAssetTransferScriptToScript(recipientScriptPubKey, assetName, amountRaw, message, expireTime, options) {
        const spkBytes = typeof recipientScriptPubKey === 'string'
            ? hexToBytes(ensureHex(recipientScriptPubKey, 'recipientScriptPubKey'))
            : recipientScriptPubKey;
        if (!isP2pkhScript(spkBytes) && !isAuthScriptScript(spkBytes)) {
            throw new Error('asset transfers to arbitrary scripts are rejected by consensus ' +
                '(OP_XNA_ASSET placement rules): the recipient scriptPubKey must be ' +
                'exactly P2PKH (25 bytes) or AuthScript OP_1/OP_2/OP_3 <32B> (34 bytes); ' +
                'commit the script into an AuthScript destination instead');
        }
        return concatBytes(spkBytes, Uint8Array.of(OP_XNA_ASSET), pushData(encodeAssetTransferPayload(assetName, amountRaw, message, expireTime, options)), Uint8Array.of(OP_DROP));
    }
    function encodeNewAssetPayload(assetName, quantityRaw, units = 0, reissuable = true, ipfsHash, options) {
        const encodedIpfs = encodeAssetDataReference(ipfsHash);
        return concatBytes(assetPayloadPrefix(options?.assetMarker, 'new'), serializeString(assetName), u64LE(assertMoneyRange(quantityRaw)), Uint8Array.of(units & 0xff, reissuable ? 1 : 0, encodedIpfs.length > 0 ? 1 : 0), encodedIpfs);
    }
    function encodeNewAssetScript(address, assetName, quantityRaw, units = 0, reissuable = true, ipfsHash, options) {
        return concatBytes(encodeDestinationScript(address), Uint8Array.of(OP_XNA_ASSET), pushData(encodeNewAssetPayload(assetName, quantityRaw, units, reissuable, ipfsHash, options)), Uint8Array.of(OP_DROP));
    }
    function encodeOwnerAssetPayload(ownerTokenName, options) {
        return concatBytes(assetPayloadPrefix(options?.assetMarker, 'owner'), serializeString(ownerTokenName));
    }
    function encodeOwnerAssetScript(address, ownerTokenName, options) {
        return concatBytes(encodeDestinationScript(address), Uint8Array.of(OP_XNA_ASSET), pushData(encodeOwnerAssetPayload(ownerTokenName, options)), Uint8Array.of(OP_DROP));
    }
    /** "Keep the asset's current units", encoded as the signed byte -1 (0xff). */
    const REISSUE_UNITS_UNCHANGED = -1;
    /**
     * Resolve the `units` byte of a reissue payload.
     *
     * Omitting `units` means "do not change them", which the protocol spells `-1`
     * (`0xff`) — the value the node's own `reissue` RPC defaults to. Its
     * validation is `nNewUnits == -1 || nNewUnits >= currentUnits`, so the
     * previous default of `0` said "set units to 0" and was rejected outright for
     * any asset with `units > 0` (`unit must be larger than current unit
     * selection`).
     *
     * An explicit `0` still encodes `0x00`: it is legitimate for an asset that
     * already has `units=0`, and folding it into -1 would lose the distinction in
     * the other direction.
     *
     * The range is validated rather than masked. `units & 0xff` used to turn `-2`
     * into `0xfe` and `255` into `0xff` — manufacturing a valid-looking
     * "unchanged" byte out of an invalid input.
     *
     * @param units - Requested units, or undefined to keep the current ones
     * @returns The byte to encode
     * @throws If units is not an integer in -1..8
     */
    function reissueUnitsByte(units) {
        const resolved = units ?? REISSUE_UNITS_UNCHANGED;
        if (!Number.isInteger(resolved) || resolved < -1 || resolved > 8) {
            throw new Error(`Invalid reissue units: ${units}. Use an integer 0..8 to set the units, ` +
                `or -1 (or omit it) to keep the asset's current units.`);
        }
        return resolved & 0xff;
    }
    function encodeReissueAssetPayload(assetName, quantityRaw, units, reissuable = true, ipfsHash, options) {
        return concatBytes(assetPayloadPrefix(options?.assetMarker, 'reissue'), serializeString(assetName), u64LE(assertMoneyRange(quantityRaw)), Uint8Array.of(reissueUnitsByte(units), reissuable ? 1 : 0), encodeAssetDataReference(ipfsHash));
    }
    function encodeReissueAssetScript(address, assetName, quantityRaw, units, reissuable = true, ipfsHash, options) {
        return concatBytes(encodeDestinationScript(address), Uint8Array.of(OP_XNA_ASSET), pushData(encodeReissueAssetPayload(assetName, quantityRaw, units, reissuable, ipfsHash, options)), Uint8Array.of(OP_DROP));
    }
    function encodeNullAssetDataPayload(assetName, flag) {
        const nameBytes = asciiBytes(assetName);
        return concatBytes(compactSize(nameBytes.length), nameBytes, Uint8Array.of(flag & 0xff));
    }
    function encodeNullAssetTagPayload(qualifierName, operation) {
        return encodeNullAssetDataPayload(qualifierName, operation === 'tag' ? 1 : 0);
    }
    function encodeNullAssetTagScript(address, qualifierName, operation, mode = 'strict') {
        return concatBytes(encodeNullAssetDestinationScript(address, mode), pushData(encodeNullAssetTagPayload(qualifierName, operation)));
    }
    function encodeNullAssetRestrictionScript(address, assetName, freezeFlag, mode = 'strict') {
        return concatBytes(encodeNullAssetDestinationScript(address, mode), pushData(encodeNullAssetDataPayload(assetName, freezeFlag)));
    }
    function encodeVerifierStringPayload(verifierString) {
        return serializeString(verifierString);
    }
    function encodeVerifierStringScript(verifierString) {
        return concatBytes(Uint8Array.of(OP_XNA_ASSET, OP_RESERVED), pushData(encodeVerifierStringPayload(verifierString)));
    }
    function encodeGlobalRestrictionScript(assetName, freezeFlag) {
        return concatBytes(Uint8Array.of(OP_XNA_ASSET, OP_RESERVED, OP_RESERVED), pushData(encodeNullAssetDataPayload(assetName, freezeFlag)));
    }
    function createXnaOutput(address, valueSats) {
        return {
            valueSats: assertMoneyRange(valueSats),
            scriptPubKeyHex: bytesToHex(encodeDestinationScript(address))
        };
    }
    function createAssetTransferOutput(address, assetName, amountRaw, options) {
        return {
            valueSats: 0n,
            scriptPubKeyHex: bytesToHex(encodeAssetTransferScript(address, assetName, amountRaw, undefined, undefined, options))
        };
    }
    function createTransferWithMessageOutput(params) {
        return {
            valueSats: 0n,
            scriptPubKeyHex: bytesToHex(encodeAssetTransferScript(params.address, params.assetName, params.amountRaw, params.message, params.expireTime, { assetMarker: params.assetMarker }))
        };
    }
    function createOwnerAssetIssueOutput(address, ownerTokenName, options) {
        return {
            valueSats: 0n,
            scriptPubKeyHex: bytesToHex(encodeOwnerAssetScript(address, ownerTokenName, options))
        };
    }
    function createOwnerAssetTransferOutput(address, ownerTokenName, options) {
        return {
            valueSats: 0n,
            scriptPubKeyHex: bytesToHex(encodeAssetTransferScript(address, ownerTokenName, OWNER_ASSET_AMOUNT, undefined, undefined, options))
        };
    }
    function createIssueAssetOutput(params) {
        return {
            valueSats: 0n,
            scriptPubKeyHex: bytesToHex(encodeNewAssetScript(params.address, params.assetName, params.quantityRaw, params.units ?? 0, params.reissuable ?? true, params.ipfsHash, { assetMarker: params.assetMarker }))
        };
    }
    function createReissueAssetOutput(params) {
        return {
            valueSats: 0n,
            scriptPubKeyHex: bytesToHex(encodeReissueAssetScript(params.address, params.assetName, params.quantityRaw, 
            // Omitted means "keep the current units" (-1); do NOT collapse to 0.
            params.units, params.reissuable ?? true, params.ipfsHash, { assetMarker: params.assetMarker }))
        };
    }
    function createNullAssetTagOutput(address, qualifierName, operation, mode = 'strict') {
        return {
            valueSats: 0n,
            scriptPubKeyHex: bytesToHex(encodeNullAssetTagScript(address, qualifierName, operation, mode))
        };
    }
    function createNullAssetRestrictionOutput(address, assetName, freezeFlag, mode = 'strict') {
        return {
            valueSats: 0n,
            scriptPubKeyHex: bytesToHex(encodeNullAssetRestrictionScript(address, assetName, freezeFlag, mode))
        };
    }
    function createVerifierStringOutput(verifierString) {
        return {
            valueSats: 0n,
            scriptPubKeyHex: bytesToHex(encodeVerifierStringScript(verifierString))
        };
    }
    function createGlobalRestrictionOutput(assetName, freezeFlag) {
        return {
            valueSats: 0n,
            scriptPubKeyHex: bytesToHex(encodeGlobalRestrictionScript(assetName, freezeFlag))
        };
    }
    function createTransferOutput(params) {
        return createAssetTransferOutput(params.address, params.assetName, params.amountRaw, {
            assetMarker: params.assetMarker
        });
    }
    /**
     * Build a SerializedTxOutput that locks `amountRaw` of `assetName` under a
     * raw P2PKH or AuthScript scriptPubKey (the only shapes consensus accepts —
     * see `encodeAssetTransferScriptToScript`; covenants go through neurai-key's
     * `getNoAuthAddress` and the address-based helpers). `valueSats` is
     * hardcoded to 0n (asset-only outputs carry no XNA; matches
     * `createAssetTransferOutput` semantics).
     */
    function createAssetTransferToScriptOutput(params) {
        return {
            valueSats: 0n,
            scriptPubKeyHex: bytesToHex(encodeAssetTransferScriptToScript(params.scriptPubKeyHex, params.assetName, params.amountRaw, params.message, params.expireTime, { assetMarker: params.assetMarker }))
        };
    }

    function serializeInput(input) {
        const txidBytes = reverseBytes(hexToBytes(input.txid));
        const scriptSig = input.scriptSigHex ? hexToBytes(input.scriptSigHex) : new Uint8Array();
        return concatBytes(txidBytes, u32LE(input.vout), compactSize(scriptSig.length), scriptSig, u32LE(input.sequence ?? 0xffffffff));
    }
    function serializeOutput(output) {
        const scriptPubKey = hexToBytes(ensureHex(output.scriptPubKeyHex, 'scriptPubKeyHex'));
        return concatBytes(u64LE(output.valueSats), compactSize(scriptPubKey.length), scriptPubKey);
    }
    function createUnsignedTransaction(tx) {
        let total = 0n;
        for (const output of tx.outputs)
            total += assertMoneyRange(output.valueSats, 'output');
        assertMoneyRange(total, 'total outputs');
        const version = tx.version ?? 2;
        const locktime = tx.locktime ?? 0;
        const inputs = tx.inputs.map(serializeInput);
        const outputs = tx.outputs.map(serializeOutput);
        const bytes = concatBytes(u32LE(version), compactSize(inputs.length), ...inputs, compactSize(outputs.length), ...outputs, u32LE(locktime));
        return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    }

    function buildTransaction(version, locktime, inputs, outputs) {
        return {
            rawTx: createUnsignedTransaction({
                version: version ?? 2,
                locktime: locktime ?? 0,
                inputs,
                outputs
            }),
            outputs
        };
    }
    function appendXnaEnvelope(outputs, burnAddress, burnAmountSats, changeAddress, changeSats) {
        if (burnAddress && burnAmountSats !== undefined && toRawInteger(burnAmountSats) > 0n) {
            outputs.push(createXnaOutput(burnAddress, burnAmountSats));
        }
        if (changeAddress && changeSats !== undefined && toRawInteger(changeSats) > 0n) {
            outputs.push(createXnaOutput(changeAddress, changeSats));
        }
    }
    function appendExtraOutputs(outputs, extraOutputs) {
        if (extraOutputs?.length) {
            outputs.push(...extraOutputs);
        }
    }
    /**
     * Null-asset data flag: 1 freezes, 0 unfreezes.
     *
     * Consensus accepts nothing else. The node's `VerifyNullAssetDataFlag`
     * (`src/assets/assets.cpp`) rejects any other value with
     * `bad-txns-null-data-flag-must-be-0-or-1`, and it takes neither the network
     * nor the height, so the mapping is identical on mainnet, testnet and regtest.
     *
     * These same two values serve the per-address restriction, the qualifier
     * tag/untag AND the global restriction: `VerifyRestrictedAddressChange`,
     * `VerifyQualifierChange` and `VerifyGlobalRestrictedChange` all delegate to
     * that one check. Captured from the node's own transactions:
     *
     *   freezerestrictedasset   $PROBE → c0505008062450524f424501   (flag 01)
     *   unfreezerestrictedasset $PROBE → c0505008062450524f424500   (flag 00)
     *
     * Until 0.7.1 the global restriction added 2 to this value, emitting 3 and 2,
     * which the node rejected outright.
     */
    function freezeFlagFromOperation(operation) {
        return operation === 'freeze' ? 1 : 0;
    }
    // NIP-040: the transaction-level marker reaches every asset output a builder
    // creates; an output-level marker wins. `extraOutputs` are never touched.
    function marker(params) {
        return { assetMarker: params.assetMarker };
    }
    function withMarker(output, params) {
        return output.assetMarker === undefined && params.assetMarker !== undefined
            ? { ...output, assetMarker: params.assetMarker }
            : output;
    }
    // Compare by decoded destination script, not by address text: two encodings of
    // the same destination (e.g. different Bech32 case) must count as equal.
    function sameDestination(a, b) {
        return bytesToHex(encodeDestinationScript(a)) === bytesToHex(encodeDestinationScript(b));
    }
    function createPaymentTransaction(params) {
        const outputs = [
            ...params.payments.map((payment) => createXnaOutput(payment.address, payment.valueSats)),
            ...(params.extraOutputs ?? [])
        ];
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createStandardAssetTransferTransaction(params) {
        // Output order is fixed:
        //   payments → transfers → transferMessages → transfersToScript → extraOutputs.
        // Keep transfersToScript after transferMessages so indices of existing
        // callers (payments + transfers + transferMessages) remain stable.
        const outputs = [];
        for (const payment of params.payments ?? []) {
            outputs.push(createXnaOutput(payment.address, payment.valueSats));
        }
        for (const transfer of params.transfers ?? []) {
            outputs.push(createTransferOutput(withMarker(transfer, params)));
        }
        for (const transfer of params.transferMessages ?? []) {
            outputs.push(createTransferWithMessageOutput(withMarker(transfer, params)));
        }
        for (const transfer of params.transfersToScript ?? []) {
            outputs.push(createAssetTransferToScriptOutput(withMarker(transfer, params)));
        }
        appendExtraOutputs(outputs, params.extraOutputs);
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createIssueAssetTransaction(params) {
        const outputs = [];
        appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
        // Consensus locates issuance outputs positionally (issue at vout[n-1], owner
        // at vout[n-2]), so extraOutputs must come before them, not after.
        appendExtraOutputs(outputs, params.extraOutputs);
        if (params.includeOwnerOutput ?? true) {
            outputs.push(createOwnerAssetIssueOutput(params.ownerTokenAddress ?? params.toAddress, params.ownerTokenName ?? getOwnerTokenName(params.assetName), marker(params)));
        }
        outputs.push(createIssueAssetOutput({
            address: params.toAddress,
            assetName: params.assetName,
            quantityRaw: params.quantityRaw,
            units: params.units ?? 0,
            reissuable: params.reissuable ?? true,
            ipfsHash: params.ipfsHash,
            assetMarker: params.assetMarker
        }));
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createIssueSubAssetTransaction(params) {
        const parentAssetName = getParentAssetName(params.assetName);
        if (!parentAssetName) {
            throw new Error(`Sub-asset name must contain '/': ${params.assetName}`);
        }
        const outputs = [];
        appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
        appendExtraOutputs(outputs, params.extraOutputs);
        outputs.push(createOwnerAssetTransferOutput(params.parentOwnerAddress ?? params.xnaChangeAddress ?? params.toAddress, getOwnerTokenName(parentAssetName), marker(params)));
        outputs.push(createOwnerAssetIssueOutput(params.ownerTokenAddress ?? params.toAddress, getOwnerTokenName(params.assetName), marker(params)));
        outputs.push(createIssueAssetOutput({
            address: params.toAddress,
            assetName: params.assetName,
            quantityRaw: params.quantityRaw,
            units: params.units ?? 0,
            reissuable: params.reissuable ?? true,
            ipfsHash: params.ipfsHash,
            assetMarker: params.assetMarker
        }));
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createIssueDepinTransaction(params) {
        assertDepinAssetName(params.assetName);
        assertDepinNetwork(params.network);
        if (toRawInteger(params.quantityRaw) <= 0n) {
            throw new Error('DEPIN issue quantity must be positive');
        }
        if (params.reissuable !== undefined && typeof params.reissuable !== 'boolean') {
            throw new Error('DEPIN reissuable must be boolean when provided');
        }
        // A sub-DEPIN ("&X/Y") must transfer the immediate parent's owner token in
        // the issuing transaction, exactly like sub-assets. It stays AssetType DEPIN
        // (same burn as the root), so only the output layout follows the sub flow.
        if (getParentAssetName(params.assetName)) {
            return createIssueSubAssetTransaction({
                ...params,
                units: 0,
                reissuable: params.reissuable ?? true,
                parentOwnerAddress: params.parentOwnerAddress,
                ownerTokenAddress: params.ownerTokenAddress ?? params.toAddress
            });
        }
        return createIssueAssetTransaction({
            ...params,
            units: 0,
            includeOwnerOutput: true,
            ownerTokenAddress: params.ownerTokenAddress ?? params.toAddress,
            reissuable: params.reissuable ?? true
        });
    }
    function createDepinTransferTransaction(params) {
        assertDepinNetwork(params.network);
        if (!params.transfers?.length) {
            throw new Error('DEPIN transfer requires at least one transfer');
        }
        const assetName = params.transfers[0].assetName;
        assertDepinAssetName(assetName);
        for (const transfer of params.transfers) {
            if (transfer.assetName !== assetName) {
                throw new Error(`DEPIN transfers must all move the same asset (got ${transfer.assetName} and ${assetName}); build one transaction per DEPIN asset`);
            }
            if (toRawInteger(transfer.amountRaw) <= 0n) {
                throw new Error(`DEPIN transfer amount must be positive: ${assetName}`);
            }
        }
        const outputs = [];
        for (const transfer of params.transfers) {
            outputs.push(createTransferOutput(withMarker(transfer, params)));
        }
        // Soulbound escort: consensus also requires SPENDING an "&X!" UTXO, which
        // must be present in params.inputs (this package does not select UTXOs).
        outputs.push(createOwnerAssetTransferOutput(params.ownerChangeAddress, getOwnerTokenName(assetName), marker(params)));
        appendXnaEnvelope(outputs, undefined, undefined, params.xnaChangeAddress, params.xnaChangeSats);
        appendExtraOutputs(outputs, params.extraOutputs);
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createDepinSelfRevokeTransaction(params) {
        assertDepinAssetName(params.assetName);
        assertDepinNetwork(params.network);
        if (toRawInteger(params.amountRaw) <= 0n) {
            throw new Error('DEPIN self-revoke amount must be positive');
        }
        // Exact consensus pattern: one self-transfer of "&X" back to the holder plus
        // one null-data with flag 1 (the only valid flag without the owner token).
        // No owner token, no burn. The input-side rules live on the caller — see
        // DepinSelfRevokeTransactionParams.
        const outputs = [
            createAssetTransferOutput(params.holderAddress, params.assetName, params.amountRaw, marker(params)),
            createNullAssetRestrictionOutput(params.holderAddress, params.assetName, 1, params.nullAssetDestinationMode ?? 'strict')
        ];
        appendXnaEnvelope(outputs, undefined, undefined, params.xnaChangeAddress, params.xnaChangeSats);
        appendExtraOutputs(outputs, params.extraOutputs);
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createIssueUniqueAssetTransaction(params) {
        const outputs = [];
        appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
        appendExtraOutputs(outputs, params.extraOutputs);
        outputs.push(createOwnerAssetTransferOutput(params.ownerTokenAddress ?? params.toAddress, getOwnerTokenName(params.rootName), marker(params)));
        for (let index = 0; index < params.assetTags.length; index += 1) {
            outputs.push(createIssueAssetOutput({
                address: params.toAddress,
                assetName: getUniqueAssetName(params.rootName, params.assetTags[index]),
                quantityRaw: UNIQUE_ASSET_AMOUNT,
                units: UNIQUE_ASSET_UNITS,
                reissuable: UNIQUE_ASSETS_REISSUABLE,
                ipfsHash: params.ipfsHashes?.[index],
                assetMarker: params.assetMarker
            }));
        }
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createIssueQualifierTransaction(params) {
        const outputs = [];
        appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
        appendExtraOutputs(outputs, params.extraOutputs);
        const parentQualifier = getParentAssetName(params.assetName);
        if (parentQualifier) {
            outputs.push(createAssetTransferOutput(params.rootChangeAddress ?? params.xnaChangeAddress ?? params.toAddress, parentQualifier, params.changeQuantityRaw ?? OWNER_ASSET_AMOUNT, marker(params)));
        }
        outputs.push(createIssueAssetOutput({
            address: params.toAddress,
            assetName: params.assetName,
            quantityRaw: params.quantityRaw,
            units: 0,
            reissuable: false,
            ipfsHash: params.ipfsHash,
            assetMarker: params.assetMarker
        }));
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createIssueRestrictedTransaction(params) {
        const outputs = [];
        appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
        appendExtraOutputs(outputs, params.extraOutputs);
        outputs.push(createVerifierStringOutput(normalizeVerifierString(params.verifierString)));
        outputs.push(createOwnerAssetTransferOutput(params.ownerChangeAddress ?? params.toAddress, getOwnerTokenName(params.assetName), marker(params)));
        outputs.push(createIssueAssetOutput({
            address: params.toAddress,
            assetName: params.assetName,
            quantityRaw: params.quantityRaw,
            units: params.units ?? 0,
            reissuable: params.reissuable ?? true,
            ipfsHash: params.ipfsHash,
            assetMarker: params.assetMarker
        }));
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createReissueTransaction(params) {
        if (isDepinAssetName(params.assetName)) {
            // DEPIN reissue: units must stay 0 (-1 means "keep"), and the owner-token
            // change must return to the destination address itself.
            if (params.units !== undefined && params.units !== 0 && params.units !== -1) {
                throw new Error('DEPIN reissue units must be 0 or -1 (keep)');
            }
            if (params.ownerChangeAddress !== undefined &&
                !sameDestination(params.ownerChangeAddress, params.toAddress)) {
                throw new Error('DEPIN reissue owner change address must match the destination address');
            }
        }
        const outputs = [];
        appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
        // Consensus locates the reissue output at vout[n-1]; extraOutputs go first.
        appendExtraOutputs(outputs, params.extraOutputs);
        outputs.push(createOwnerAssetTransferOutput(params.ownerChangeAddress ?? params.toAddress, getOwnerTokenName(params.assetName), marker(params)));
        outputs.push(createReissueAssetOutput({
            address: params.toAddress,
            assetName: params.assetName,
            quantityRaw: params.quantityRaw,
            // Omitted means "keep the current units" (-1); do NOT collapse to 0.
            units: params.units,
            reissuable: params.reissuable ?? true,
            ipfsHash: params.ipfsHash,
            assetMarker: params.assetMarker
        }));
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createReissueRestrictedTransaction(params) {
        const outputs = [];
        appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
        appendExtraOutputs(outputs, params.extraOutputs);
        if (params.verifierString) {
            outputs.push(createVerifierStringOutput(normalizeVerifierString(params.verifierString)));
        }
        outputs.push(createOwnerAssetTransferOutput(params.ownerChangeAddress ?? params.toAddress, getOwnerTokenName(params.assetName), marker(params)));
        outputs.push(createReissueAssetOutput({
            address: params.toAddress,
            assetName: params.assetName,
            quantityRaw: params.quantityRaw,
            // Omitted means "keep the current units" (-1); do NOT collapse to 0.
            units: params.units,
            reissuable: params.reissuable ?? true,
            ipfsHash: params.ipfsHash,
            assetMarker: params.assetMarker
        }));
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createQualifierTagTransaction(params) {
        const outputs = [];
        appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
        outputs.push(createAssetTransferOutput(params.qualifierChangeAddress, params.qualifierName, params.qualifierChangeAmountRaw, marker(params)));
        for (const address of params.targetAddresses) {
            outputs.push(createNullAssetTagOutput(address, params.qualifierName, params.operation, params.nullAssetDestinationMode ?? 'strict'));
        }
        appendExtraOutputs(outputs, params.extraOutputs);
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createFreezeAddressesTransaction(params) {
        if (isDepinAssetName(params.assetName)) {
            // The address holding (or receiving) the owner token cannot be frozen or
            // revoked. The node also rejects spending an "&X!" UTXO that sits on a
            // target address — that input-side rule cannot be checked here (inputs
            // carry no address) and stays the caller's responsibility.
            for (const target of params.targetAddresses) {
                if (sameDestination(target, params.ownerChangeAddress)) {
                    throw new Error('DEPIN owner change address cannot be one of the target addresses (owner-holder address cannot be frozen or revoked)');
                }
            }
        }
        const outputs = [];
        appendXnaEnvelope(outputs, undefined, undefined, params.xnaChangeAddress, params.xnaChangeSats);
        outputs.push(createOwnerAssetTransferOutput(params.ownerChangeAddress, getOwnerTokenName(params.assetName), marker(params)));
        for (const address of params.targetAddresses) {
            outputs.push(createNullAssetRestrictionOutput(address, params.assetName, freezeFlagFromOperation(params.operation), params.nullAssetDestinationMode ?? 'strict'));
        }
        appendExtraOutputs(outputs, params.extraOutputs);
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createFreezeAssetTransaction(params) {
        const outputs = [];
        appendXnaEnvelope(outputs, undefined, undefined, params.xnaChangeAddress, params.xnaChangeSats);
        outputs.push(createOwnerAssetTransferOutput(params.ownerChangeAddress, getOwnerTokenName(params.assetName), marker(params)));
        outputs.push(createGlobalRestrictionOutput(params.assetName, freezeFlagFromOperation(params.operation)));
        appendExtraOutputs(outputs, params.extraOutputs);
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createFromOperation(build) {
        switch (build.operationType) {
            case 'STANDARD_PAYMENT':
                return createPaymentTransaction(build.params);
            case 'STANDARD_TRANSFER':
                return createStandardAssetTransferTransaction(build.params);
            case 'ISSUE_ROOT':
            case 'ISSUE_MSGCHANNEL':
                return createIssueAssetTransaction(build.params);
            case 'ISSUE_SUB':
                return createIssueSubAssetTransaction(build.params);
            case 'ISSUE_UNIQUE':
                return createIssueUniqueAssetTransaction(build.params);
            case 'ISSUE_DEPIN':
                return createIssueDepinTransaction(build.params);
            case 'ISSUE_QUALIFIER':
            case 'ISSUE_SUB_QUALIFIER':
                return createIssueQualifierTransaction(build.params);
            case 'ISSUE_RESTRICTED':
                return createIssueRestrictedTransaction(build.params);
            case 'REISSUE':
                return createReissueTransaction(build.params);
            case 'REISSUE_RESTRICTED':
                return createReissueRestrictedTransaction(build.params);
            case 'TRANSFER_DEPIN':
                return createDepinTransferTransaction(build.params);
            case 'SELF_REVOKE_DEPIN':
                return createDepinSelfRevokeTransaction(build.params);
            case 'TAG_ADDRESSES':
                return createQualifierTagTransaction({
                    ...build.params,
                    operation: 'tag'
                });
            case 'UNTAG_ADDRESSES':
                return createQualifierTagTransaction({
                    ...build.params,
                    operation: 'untag'
                });
            case 'FREEZE_ADDRESSES':
                return createFreezeAddressesTransaction({
                    ...build.params,
                    operation: 'freeze'
                });
            case 'UNFREEZE_ADDRESSES':
                return createFreezeAddressesTransaction({
                    ...build.params,
                    operation: 'unfreeze'
                });
            case 'FREEZE_ASSET':
                return createFreezeAssetTransaction({
                    ...build.params,
                    operation: 'freeze'
                });
            case 'UNFREEZE_ASSET':
                return createFreezeAssetTransaction({
                    ...build.params,
                    operation: 'unfreeze'
                });
            default: {
                const unsupported = build;
                throw new Error(`Unsupported operation type: ${JSON.stringify(unsupported)}`);
            }
        }
    }

    /**
     * Checks if something is Uint8Array. Be careful: nodejs Buffer will return true.
     * @param a - value to test
     * @returns `true` when the value is a Uint8Array-compatible view.
     * @example
     * Check whether a value is a Uint8Array-compatible view.
     * ```ts
     * isBytes(new Uint8Array([1, 2, 3]));
     * ```
     */
    function isBytes(a) {
        // Plain `instanceof Uint8Array` is too strict for some Buffer / proxy / cross-realm cases.
        // The fallback still requires a real ArrayBuffer view, so plain
        // JSON-deserialized `{ constructor: ... }` spoofing is rejected, and
        // `BYTES_PER_ELEMENT === 1` keeps the fallback on byte-oriented views.
        return (a instanceof Uint8Array ||
            (ArrayBuffer.isView(a) &&
                a.constructor.name === 'Uint8Array' &&
                'BYTES_PER_ELEMENT' in a &&
                a.BYTES_PER_ELEMENT === 1));
    }
    /**
     * Asserts something is Uint8Array.
     * @param value - value to validate
     * @param length - optional exact length constraint
     * @param title - label included in thrown errors
     * @returns The validated byte array.
     * @throws On wrong argument types. {@link TypeError}
     * @throws On wrong argument ranges or values. {@link RangeError}
     * @example
     * Validate that a value is a byte array.
     * ```ts
     * abytes(new Uint8Array([1, 2, 3]));
     * ```
     */
    function abytes(value, length, title = '') {
        const bytes = isBytes(value);
        const len = value?.length;
        const needsLen = length !== undefined;
        if (!bytes || (needsLen)) {
            const prefix = title && `"${title}" `;
            const ofLen = '';
            const got = bytes ? `length=${len}` : `type=${typeof value}`;
            const message = prefix + 'expected Uint8Array' + ofLen + ', got ' + got;
            if (!bytes)
                throw new TypeError(message);
            throw new RangeError(message);
        }
        return value;
    }
    /**
     * Asserts a hash instance has not been destroyed or finished.
     * @param instance - hash instance to validate
     * @param checkFinished - whether to reject finalized instances
     * @throws If the hash instance has already been destroyed or finalized. {@link Error}
     * @example
     * Validate that a hash instance is still usable.
     * ```ts
     * import { aexists } from '@noble/hashes/utils.js';
     * import { sha256 } from '@noble/hashes/sha2.js';
     * const hash = sha256.create();
     * aexists(hash);
     * ```
     */
    function aexists(instance, checkFinished = true) {
        if (instance.destroyed)
            throw new Error('Hash instance has been destroyed');
        if (checkFinished && instance.finished)
            throw new Error('Hash#digest() has already been called');
    }
    /**
     * Asserts output is a sufficiently-sized byte array.
     * @param out - destination buffer
     * @param instance - hash instance providing output length
     * Oversized buffers are allowed; downstream code only promises to fill the first `outputLen` bytes.
     * @throws On wrong argument types. {@link TypeError}
     * @throws On wrong argument ranges or values. {@link RangeError}
     * @example
     * Validate a caller-provided digest buffer.
     * ```ts
     * import { aoutput } from '@noble/hashes/utils.js';
     * import { sha256 } from '@noble/hashes/sha2.js';
     * const hash = sha256.create();
     * aoutput(new Uint8Array(hash.outputLen), hash);
     * ```
     */
    function aoutput(out, instance) {
        abytes(out, undefined, 'digestInto() output');
        const min = instance.outputLen;
        if (out.length < min) {
            throw new RangeError('"digestInto() output" expected to be of length >=' + min);
        }
    }
    /**
     * Zeroizes typed arrays in place. Warning: JS provides no guarantees.
     * @param arrays - arrays to overwrite with zeros
     * @example
     * Zeroize sensitive buffers in place.
     * ```ts
     * clean(new Uint8Array([1, 2, 3]));
     * ```
     */
    function clean(...arrays) {
        for (let i = 0; i < arrays.length; i++) {
            arrays[i].fill(0);
        }
    }
    /**
     * Creates a DataView for byte-level manipulation.
     * @param arr - source typed array
     * @returns DataView over the same buffer region.
     * @example
     * Create a DataView over an existing buffer.
     * ```ts
     * createView(new Uint8Array(4));
     * ```
     */
    function createView(arr) {
        return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    }
    /**
     * Rotate-right operation for uint32 values.
     * @param word - source word
     * @param shift - shift amount in bits
     * @returns Rotated word.
     * @example
     * Rotate a 32-bit word to the right.
     * ```ts
     * rotr(0x12345678, 8);
     * ```
     */
    function rotr(word, shift) {
        return (word << (32 - shift)) | (word >>> shift);
    }
    /**
     * Rotate-left operation for uint32 values.
     * @param word - source word
     * @param shift - shift amount in bits
     * @returns Rotated word.
     * @example
     * Rotate a 32-bit word to the left.
     * ```ts
     * rotl(0x12345678, 8);
     * ```
     */
    function rotl(word, shift) {
        return (word << shift) | ((word >>> (32 - shift)) >>> 0);
    }
    /**
     * Creates a callable hash function from a stateful class constructor.
     * @param hashCons - hash constructor or factory
     * @param info - optional metadata such as DER OID
     * @returns Frozen callable hash wrapper with `.create()`.
     *   Wrapper construction eagerly calls `hashCons(undefined)` once to read
     *   `outputLen` / `blockLen`, so constructor side effects happen at module
     *   init time.
     * @example
     * Wrap a stateful hash constructor into a callable helper.
     * ```ts
     * import { createHasher } from '@noble/hashes/utils.js';
     * import { sha256 } from '@noble/hashes/sha2.js';
     * const wrapped = createHasher(sha256.create, { oid: sha256.oid });
     * wrapped(new Uint8Array([1]));
     * ```
     */
    function createHasher(hashCons, info = {}) {
        const hashC = (msg, opts) => hashCons(opts)
            .update(msg)
            .digest();
        const tmp = hashCons(undefined);
        hashC.outputLen = tmp.outputLen;
        hashC.blockLen = tmp.blockLen;
        hashC.canXOF = tmp.canXOF;
        hashC.create = (opts) => hashCons(opts);
        Object.assign(hashC, info);
        return Object.freeze(hashC);
    }
    /**
     * Creates OID metadata for NIST hashes with prefix `06 09 60 86 48 01 65 03 04 02`.
     * @param suffix - final OID byte for the selected hash.
     *   The helper accepts any byte even though only the documented NIST hash
     *   suffixes are meaningful downstream.
     * @returns Object containing the DER-encoded OID.
     * @example
     * Build OID metadata for a NIST hash.
     * ```ts
     * oidNist(0x01);
     * ```
     */
    const oidNist = (suffix) => ({
        // Current NIST hashAlgs suffixes used here fit in one DER subidentifier octet.
        // Larger suffix values would need base-128 OID encoding and a different length byte.
        oid: Uint8Array.from([0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, suffix]),
    });

    /**
     * Internal Merkle-Damgard hash utils.
     * @module
     */
    /**
     * Shared 32-bit conditional boolean primitive reused by SHA-256, SHA-1, and MD5 `F`.
     * Returns bits from `b` when `a` is set, otherwise from `c`.
     * The XOR form is equivalent to MD5's `F(X,Y,Z) = XY v not(X)Z` because the masked terms never
     * set the same bit.
     * @param a - selector word
     * @param b - word chosen when selector bit is set
     * @param c - word chosen when selector bit is clear
     * @returns Mixed 32-bit word.
     * @example
     * Combine three words with the shared 32-bit choice primitive.
     * ```ts
     * Chi(0xffffffff, 0x12345678, 0x87654321);
     * ```
     */
    function Chi(a, b, c) {
        return (a & b) ^ (~a & c);
    }
    /**
     * Shared 32-bit majority primitive reused by SHA-256 and SHA-1.
     * Returns bits shared by at least two inputs.
     * @param a - first input word
     * @param b - second input word
     * @param c - third input word
     * @returns Mixed 32-bit word.
     * @example
     * Combine three words with the shared 32-bit majority primitive.
     * ```ts
     * Maj(0xffffffff, 0x12345678, 0x87654321);
     * ```
     */
    function Maj(a, b, c) {
        return (a & b) ^ (a & c) ^ (b & c);
    }
    /**
     * Merkle-Damgard hash construction base class.
     * Could be used to create MD5, RIPEMD, SHA1, SHA2.
     * Accepts only byte-aligned `Uint8Array` input, even when the underlying spec describes bit
     * strings with partial-byte tails.
     * @param blockLen - internal block size in bytes
     * @param outputLen - digest size in bytes
     * @param padOffset - trailing length field size in bytes
     * @param isLE - whether length and state words are encoded in little-endian
     * @example
     * Use a concrete subclass to get the shared Merkle-Damgard update/digest flow.
     * ```ts
     * import { _SHA1 } from '@noble/hashes/legacy.js';
     * const hash = new _SHA1();
     * hash.update(new Uint8Array([97, 98, 99]));
     * hash.digest();
     * ```
     */
    class HashMD {
        blockLen;
        outputLen;
        canXOF = false;
        padOffset;
        isLE;
        // For partial updates less than block size
        buffer;
        view;
        finished = false;
        length = 0;
        pos = 0;
        destroyed = false;
        constructor(blockLen, outputLen, padOffset, isLE) {
            this.blockLen = blockLen;
            this.outputLen = outputLen;
            this.padOffset = padOffset;
            this.isLE = isLE;
            this.buffer = new Uint8Array(blockLen);
            this.view = createView(this.buffer);
        }
        update(data) {
            aexists(this);
            abytes(data);
            const { view, buffer, blockLen } = this;
            const len = data.length;
            for (let pos = 0; pos < len;) {
                const take = Math.min(blockLen - this.pos, len - pos);
                // Fast path only when there is no buffered partial block: `take === blockLen` implies
                // `this.pos === 0`, so we can process full blocks directly from the input view.
                if (take === blockLen) {
                    const dataView = createView(data);
                    for (; blockLen <= len - pos; pos += blockLen)
                        this.process(dataView, pos);
                    continue;
                }
                buffer.set(data.subarray(pos, pos + take), this.pos);
                this.pos += take;
                pos += take;
                if (this.pos === blockLen) {
                    this.process(view, 0);
                    this.pos = 0;
                }
            }
            this.length += data.length;
            this.roundClean();
            return this;
        }
        digestInto(out) {
            aexists(this);
            aoutput(out, this);
            this.finished = true;
            // Padding
            // We can avoid allocation of buffer for padding completely if it
            // was previously not allocated here. But it won't change performance.
            const { buffer, view, blockLen, isLE } = this;
            let { pos } = this;
            // append the bit '1' to the message
            buffer[pos++] = 0b10000000;
            clean(this.buffer.subarray(pos));
            // we have less than padOffset left in buffer, so we cannot put length in
            // current block, need process it and pad again
            if (this.padOffset > blockLen - pos) {
                this.process(view, 0);
                pos = 0;
            }
            // Pad until full block byte with zeros
            for (let i = pos; i < blockLen; i++)
                buffer[i] = 0;
            // `padOffset` reserves the whole length field. For SHA-384/512 the high 64 bits stay zero from
            // the padding fill above, and JS will overflow before user input can make that half non-zero.
            // So we only need to write the low 64 bits here.
            view.setBigUint64(blockLen - 8, BigInt(this.length * 8), isLE);
            this.process(view, 0);
            const oview = createView(out);
            const len = this.outputLen;
            // NOTE: we do division by 4 later, which must be fused in single op with modulo by JIT
            if (len % 4)
                throw new Error('_sha2: outputLen must be aligned to 32bit');
            const outLen = len / 4;
            const state = this.get();
            if (outLen > state.length)
                throw new Error('_sha2: outputLen bigger than state');
            for (let i = 0; i < outLen; i++)
                oview.setUint32(4 * i, state[i], isLE);
        }
        digest() {
            const { buffer, outputLen } = this;
            this.digestInto(buffer);
            // Copy before destroy(): subclasses wipe `buffer` during cleanup, but `digest()` must return
            // fresh bytes to the caller.
            const res = buffer.slice(0, outputLen);
            this.destroy();
            return res;
        }
        _cloneInto(to) {
            to ||= new this.constructor();
            to.set(...this.get());
            const { blockLen, buffer, length, finished, destroyed, pos } = this;
            to.destroyed = destroyed;
            to.finished = finished;
            to.length = length;
            to.pos = pos;
            // Only partial-block bytes need copying: when `length % blockLen === 0`, `pos === 0` and
            // later `update()` / `digestInto()` overwrite `to.buffer` from the start before reading it.
            if (length % blockLen)
                to.buffer.set(buffer);
            return to;
        }
        clone() {
            return this._cloneInto();
        }
    }
    /**
     * Initial SHA-2 state: fractional parts of square roots of first 16 primes 2..53.
     * Check out `test/misc/sha2-gen-iv.js` for recomputation guide.
     */
    /** Initial SHA256 state from RFC 6234 §6.1: the first 32 bits of the fractional parts of the
     * square roots of the first eight prime numbers. Exported as a shared table; callers must treat
     * it as read-only because constructors copy words from it by index. */
    const SHA256_IV = /* @__PURE__ */ Uint32Array.from([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]);

    /**
     * SHA2 hash function. A.k.a. sha256, sha384, sha512, sha512_224, sha512_256.
     * SHA256 is the fastest hash implementable in JS, even faster than Blake3.
     * Check out {@link https://www.rfc-editor.org/rfc/rfc4634 | RFC 4634} and
     * {@link https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf | FIPS 180-4}.
     * @module
     */
    /**
     * SHA-224 / SHA-256 round constants from RFC 6234 §5.1: the first 32 bits
     * of the cube roots of the first 64 primes (2..311).
     */
    // prettier-ignore
    const SHA256_K = /* @__PURE__ */ Uint32Array.from([
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ]);
    /** Reusable SHA-224 / SHA-256 message schedule buffer `W_t` from RFC 6234 §6.2 step 1. */
    const SHA256_W = /* @__PURE__ */ new Uint32Array(64);
    /** Internal SHA-224 / SHA-256 compression engine from RFC 6234 §6.2. */
    class SHA2_32B extends HashMD {
        constructor(outputLen) {
            super(64, outputLen, 8, false);
        }
        get() {
            const { A, B, C, D, E, F, G, H } = this;
            return [A, B, C, D, E, F, G, H];
        }
        // prettier-ignore
        set(A, B, C, D, E, F, G, H) {
            this.A = A | 0;
            this.B = B | 0;
            this.C = C | 0;
            this.D = D | 0;
            this.E = E | 0;
            this.F = F | 0;
            this.G = G | 0;
            this.H = H | 0;
        }
        process(view, offset) {
            // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
            for (let i = 0; i < 16; i++, offset += 4)
                SHA256_W[i] = view.getUint32(offset, false);
            for (let i = 16; i < 64; i++) {
                const W15 = SHA256_W[i - 15];
                const W2 = SHA256_W[i - 2];
                const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ (W15 >>> 3);
                const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ (W2 >>> 10);
                SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
            }
            // Compression function main loop, 64 rounds
            let { A, B, C, D, E, F, G, H } = this;
            for (let i = 0; i < 64; i++) {
                const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
                const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
                const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
                const T2 = (sigma0 + Maj(A, B, C)) | 0;
                H = G;
                G = F;
                F = E;
                E = (D + T1) | 0;
                D = C;
                C = B;
                B = A;
                A = (T1 + T2) | 0;
            }
            // Add the compressed chunk to the current hash value
            A = (A + this.A) | 0;
            B = (B + this.B) | 0;
            C = (C + this.C) | 0;
            D = (D + this.D) | 0;
            E = (E + this.E) | 0;
            F = (F + this.F) | 0;
            G = (G + this.G) | 0;
            H = (H + this.H) | 0;
            this.set(A, B, C, D, E, F, G, H);
        }
        roundClean() {
            clean(SHA256_W);
        }
        destroy() {
            // HashMD callers route post-destroy usability through `destroyed`; zeroizing alone still leaves
            // update()/digest() callable on reused instances.
            this.destroyed = true;
            this.set(0, 0, 0, 0, 0, 0, 0, 0);
            clean(this.buffer);
        }
    }
    /** Internal SHA-256 hash class grounded in RFC 6234 §6.2. */
    class _SHA256 extends SHA2_32B {
        // We cannot use array here since array allows indexing by variable
        // which means optimizer/compiler cannot use registers.
        A = SHA256_IV[0] | 0;
        B = SHA256_IV[1] | 0;
        C = SHA256_IV[2] | 0;
        D = SHA256_IV[3] | 0;
        E = SHA256_IV[4] | 0;
        F = SHA256_IV[5] | 0;
        G = SHA256_IV[6] | 0;
        H = SHA256_IV[7] | 0;
        constructor() {
            super(32);
        }
    }
    /**
     * SHA2-256 hash function from RFC 4634. In JS it's the fastest: even faster than Blake3. Some info:
     *
     * - Trying 2^128 hashes would get 50% chance of collision, using birthday attack.
     * - BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per 2025.
     * - Each sha256 hash is executing 2^18 bit operations.
     * - Good 2024 ASICs can do 200Th/sec with 3500 watts of power, corresponding to 2^36 hashes/joule.
     * @param msg - message bytes to hash
     * @returns Digest bytes.
     * @example
     * Hash a message with SHA2-256.
     * ```ts
     * sha256(new Uint8Array([97, 98, 99]));
     * ```
     */
    const sha256 = /* @__PURE__ */ createHasher(() => new _SHA256(), 
    /* @__PURE__ */ oidNist(0x01));

    // Hard deserialization bound, mirroring the node (serialize.h MAX_SIZE):
    // ReadCompactSize rejects anything above it, canonical or not.
    const MAX_SIZE = 0x02000000;
    function hash256(bytes) {
        return sha256(sha256(bytes));
    }
    class ByteReader {
        bytes;
        offset = 0;
        constructor(bytes) {
            this.bytes = bytes;
        }
        need(count) {
            if (count > this.bytes.length - this.offset) {
                throw new Error(`Transaction hex truncated: need ${count} more byte(s) at offset ${this.offset}, ` +
                    `${this.bytes.length - this.offset} remaining`);
            }
        }
        readBytes(count) {
            this.need(count);
            const slice = this.bytes.subarray(this.offset, this.offset + count);
            this.offset += count;
            return slice;
        }
        readU8() {
            return this.readBytes(1)[0];
        }
        readU32() {
            const slice = this.readBytes(4);
            return (slice[0] | (slice[1] << 8) | (slice[2] << 16) | (slice[3] << 24)) >>> 0;
        }
        readU64() {
            const slice = this.readBytes(8);
            let value = 0n;
            for (let i = 7; i >= 0; i -= 1) {
                value = (value << 8n) | BigInt(slice[i]);
            }
            return value;
        }
        // Canonical CompactSize with the node's range bound: the shortest encoding
        // is mandatory and anything above MAX_SIZE throws, exactly like
        // ReadCompactSize. Lengths are validated against the remaining bytes by the
        // callers BEFORE any allocation or iteration.
        readCompactSize() {
            const first = this.readU8();
            let value;
            if (first < 0xfd) {
                value = first;
            }
            else if (first === 0xfd) {
                const slice = this.readBytes(2);
                value = slice[0] | (slice[1] << 8);
                if (value < 0xfd)
                    throw new Error('Non-canonical CompactSize (0xfd form for value < 253)');
            }
            else if (first === 0xfe) {
                value = this.readU32();
                if (value < 0x10000)
                    throw new Error('Non-canonical CompactSize (0xfe form for value < 0x10000)');
            }
            else {
                const big = this.readU64();
                if (big < 0x100000000n)
                    throw new Error('Non-canonical CompactSize (0xff form for value < 2^32)');
                if (big > BigInt(MAX_SIZE))
                    throw new Error(`CompactSize exceeds MAX_SIZE: ${big}`);
                value = Number(big);
            }
            if (value > MAX_SIZE) {
                throw new Error(`CompactSize exceeds MAX_SIZE: ${value}`);
            }
            return value;
        }
        /** Read a length prefix that must fit in the remaining bytes at `bytesPerItem`. */
        readCount(bytesPerItem, label) {
            const count = this.readCompactSize();
            if (count * bytesPerItem > this.bytes.length - this.offset) {
                throw new Error(`Declared ${label} count ${count} does not fit in the remaining ` +
                    `${this.bytes.length - this.offset} byte(s)`);
            }
            return count;
        }
        get finished() {
            return this.offset === this.bytes.length;
        }
        get position() {
            return this.offset;
        }
    }
    function readOutpoint(reader) {
        const txid = bytesToHex(reverseBytes(reader.readBytes(32)));
        const vout = reader.readU32();
        return { txid, vout };
    }
    function readInput(reader) {
        const { txid, vout } = readOutpoint(reader);
        const scriptLength = reader.readCount(1, 'scriptSig');
        const scriptSigHex = bytesToHex(reader.readBytes(scriptLength));
        const sequence = reader.readU32();
        return { txid, vout, scriptSigHex, sequence };
    }
    function readOutput(reader) {
        const valueSats = reader.readU64();
        const scriptLength = reader.readCount(1, 'scriptPubKey');
        const scriptPubKeyHex = bytesToHex(reader.readBytes(scriptLength));
        return { valueSats, scriptPubKeyHex };
    }
    // Minimum serialized size per item, used only to bound counts before reading:
    // input = outpoint(36) + compactSize(1) + sequence(4); output = value(8) +
    // compactSize(1); witness element = compactSize(1).
    const MIN_INPUT_SIZE = 41;
    const MIN_OUTPUT_SIZE = 9;
    function parseTransaction(hex) {
        const reader = new ByteReader(hexToBytes(ensureHex(hex, 'transaction hex')));
        // nVersion is a signed int32 (negative versions exist on-chain historically).
        const version = reader.readU32() | 0;
        const inputs = [];
        const outputs = [];
        let flags = 0;
        const vinCount = reader.readCount(MIN_INPUT_SIZE, 'input');
        if (vinCount === 0) {
            // Either a dummy marker for the extended (witness) format, or a genuinely
            // empty vin. Mirrors UnserializeTransaction: a flags byte follows; when it
            // is non-zero the real vin/vout follow, when zero the vout is NOT read.
            flags = reader.readU8();
            if (flags !== 0) {
                const realVinCount = reader.readCount(MIN_INPUT_SIZE, 'input');
                for (let i = 0; i < realVinCount; i += 1)
                    inputs.push(readInput(reader));
                const voutCount = reader.readCount(MIN_OUTPUT_SIZE, 'output');
                for (let i = 0; i < voutCount; i += 1)
                    outputs.push(readOutput(reader));
            }
        }
        else {
            for (let i = 0; i < vinCount; i += 1)
                inputs.push(readInput(reader));
            const voutCount = reader.readCount(MIN_OUTPUT_SIZE, 'output');
            for (let i = 0; i < voutCount; i += 1)
                outputs.push(readOutput(reader));
        }
        // NIP-014: vrefin sits between vout and witness, v3 only (even when empty).
        const vrefin = [];
        if (version === 3) {
            const refCount = reader.readCount(36, 'refinput');
            for (let i = 0; i < refCount; i += 1)
                vrefin.push(readOutpoint(reader));
        }
        if (flags & 1) {
            flags ^= 1;
            for (const input of inputs) {
                const stackSize = reader.readCount(1, 'witness element');
                const stack = [];
                for (let i = 0; i < stackSize; i += 1) {
                    const elementLength = reader.readCount(1, 'witness bytes');
                    stack.push(bytesToHex(reader.readBytes(elementLength)));
                }
                input.witness = stack;
            }
        }
        if (flags) {
            throw new Error(`Unknown transaction optional data (flags 0x${flags.toString(16)})`);
        }
        const locktime = reader.readU32();
        if (!reader.finished) {
            throw new Error(`Trailing bytes after transaction (offset ${reader.position})`);
        }
        return { version, inputs, outputs, vrefin, locktime };
    }
    function serializeOutpoint(ref) {
        const txid = hexToBytes(ensureHex(ref.txid, 'txid'));
        if (txid.length !== 32) {
            throw new Error(`Invalid txid: expected 32 bytes, got ${txid.length}`);
        }
        return concatBytes(reverseBytes(txid), u32LE(ref.vout));
    }
    function serializeCodecInput(input) {
        const scriptSig = hexToBytes(ensureHex(input.scriptSigHex ?? '', 'scriptSigHex'));
        return concatBytes(serializeOutpoint(input), compactSize(scriptSig.length), scriptSig, u32LE(input.sequence ?? 0xffffffff));
    }
    function serializeCodecOutput(output) {
        const script = hexToBytes(ensureHex(output.scriptPubKeyHex, 'scriptPubKeyHex'));
        return concatBytes(u64LE(output.valueSats), compactSize(script.length), script);
    }
    function inputHasWitness(input) {
        return (input.witness?.length ?? 0) > 0;
    }
    function serializeTransaction(tx, options = {}) {
        if (!Number.isInteger(tx.version) || tx.version < -2147483648 || tx.version > 0x7fffffff) {
            throw new Error(`Transaction version out of int32 range: ${tx.version}`);
        }
        const vrefin = tx.vrefin ?? [];
        if (tx.version !== 3 && vrefin.length > 0) {
            throw new Error(`vrefin requires transaction version 3 (got version ${tx.version})`);
        }
        const withWitness = (options.includeWitness ?? true) && tx.inputs.some(inputHasWitness);
        const parts = [u32LE(tx.version >>> 0)];
        if (withWitness) {
            // Extended format: dummy empty vin + flags byte.
            parts.push(Uint8Array.of(0x00, 0x01));
        }
        parts.push(compactSize(tx.inputs.length));
        for (const input of tx.inputs)
            parts.push(serializeCodecInput(input));
        parts.push(compactSize(tx.outputs.length));
        for (const output of tx.outputs)
            parts.push(serializeCodecOutput(output));
        if (tx.version === 3) {
            parts.push(compactSize(vrefin.length));
            for (const ref of vrefin)
                parts.push(serializeOutpoint(ref));
        }
        if (withWitness) {
            // One stack per input, empty (CompactSize 0) where the input has none.
            for (const input of tx.inputs) {
                const stack = input.witness ?? [];
                parts.push(compactSize(stack.length));
                for (const element of stack) {
                    const bytes = hexToBytes(ensureHex(element, 'witness element'));
                    parts.push(compactSize(bytes.length), bytes);
                }
            }
        }
        parts.push(u32LE(tx.locktime));
        return bytesToHex(concatBytes(...parts));
    }
    function toDecoded(txOrHex) {
        return typeof txOrHex === 'string' ? parseTransaction(txOrHex) : txOrHex;
    }
    function computeTxid(txOrHex) {
        const stripped = serializeTransaction(toDecoded(txOrHex), { includeWitness: false });
        return bytesToHex(reverseBytes(hash256(hexToBytes(stripped))));
    }
    function computeWtxid(txOrHex) {
        const full = serializeTransaction(toDecoded(txOrHex));
        return bytesToHex(reverseBytes(hash256(hexToBytes(full))));
    }
    function estimateTransactionSize(txOrHex) {
        const tx = toDecoded(txOrHex);
        const size = serializeTransaction(tx).length / 2;
        const strippedSize = serializeTransaction(tx, { includeWitness: false }).length / 2;
        // consensus/validation.h: weight = stripped * (WITNESS_SCALE_FACTOR - 1) + total.
        const weight = strippedSize * 3 + size;
        return { size, strippedSize, weight, vsize: Math.ceil(weight / 4) };
    }

    /**

    SHA1 (RFC 3174), MD5 (RFC 1321), and RIPEMD160 legacy, weak hash functions.
    RFC 2286 only covers HMAC-RIPEMD160 wrapper material and test vectors,
    not the base RIPEMD-160 compression spec.
    Don't use them in a new protocol. What "weak" means:

    - Collisions can be made with 2^18 effort in MD5, 2^60 in SHA1, 2^80 in RIPEMD160.
    - No practical pre-image attacks (only theoretical, 2^123.4)
    - HMAC seems kinda ok: https://www.rfc-editor.org/rfc/rfc6151
     * @module
     */
    // RIPEMD-160
    // Permutation repeatedly applied to derive the later RIPEMD-160 message-order tables.
    const Rho160 = /* @__PURE__ */ Uint8Array.from([
        7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
    ]);
    const Id160 = /* @__PURE__ */ (() => Uint8Array.from(new Array(16).fill(0).map((_, i) => i)))();
    const Pi160 = /* @__PURE__ */ (() => Id160.map((i) => (9 * i + 5) % 16))();
    // Five left/right message-word orderings for the RIPEMD-160 dual-lane rounds.
    const idxLR = /* @__PURE__ */ (() => {
        const L = [Id160];
        const R = [Pi160];
        const res = [L, R];
        for (let i = 0; i < 4; i++)
            for (let j of res)
                j.push(j[i].map((k) => Rho160[k]));
        return res;
    })();
    const idxL = /* @__PURE__ */ (() => idxLR[0])();
    const idxR = /* @__PURE__ */ (() => idxLR[1])();
    // const [idxL, idxR] = idxLR;
    // Base per-group shift table before the left/right message-order permutations are applied.
    const shifts160 = /* @__PURE__ */ [
        [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
        [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
        [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
        [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
        [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5],
    ].map((i) => Uint8Array.from(i));
    const shiftsL160 = /* @__PURE__ */ idxL.map((idx, i) => idx.map((j) => shifts160[i][j]));
    const shiftsR160 = /* @__PURE__ */ idxR.map((idx, i) => idx.map((j) => shifts160[i][j]));
    // Five left-lane additive constants for RIPEMD-160.
    const Kl160 = /* @__PURE__ */ Uint32Array.from([
        0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e,
    ]);
    // Five right-lane additive constants for RIPEMD-160.
    const Kr160 = /* @__PURE__ */ Uint32Array.from([
        0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000,
    ]);
    // Called `f()` in the spec; valid `group` values are 0..4, and out-of-range
    // inputs currently fall through to the group-4 branch.
    function ripemd_f(group, x, y, z) {
        if (group === 0)
            return x ^ y ^ z;
        if (group === 1)
            return (x & y) | (~x & z);
        if (group === 2)
            return (x | ~y) ^ z;
        if (group === 3)
            return (x & z) | (y & ~z);
        return x ^ (y | ~z);
    }
    // Reusable 16-word RIPEMD-160 message block buffer.
    const BUF_160 = /* @__PURE__ */ new Uint32Array(16);
    /**
     * Internal RIPEMD-160 legacy hash class.
     * RFC 2286 only adds HMAC-RIPEMD160 material, not the core hash specification.
     */
    class _RIPEMD160 extends HashMD {
        h0 = 0x67452301 | 0;
        h1 = 0xefcdab89 | 0;
        h2 = 0x98badcfe | 0;
        h3 = 0x10325476 | 0;
        h4 = 0xc3d2e1f0 | 0;
        constructor() {
            super(64, 20, 8, true);
        }
        get() {
            const { h0, h1, h2, h3, h4 } = this;
            return [h0, h1, h2, h3, h4];
        }
        set(h0, h1, h2, h3, h4) {
            this.h0 = h0 | 0;
            this.h1 = h1 | 0;
            this.h2 = h2 | 0;
            this.h3 = h3 | 0;
            this.h4 = h4 | 0;
        }
        process(view, offset) {
            for (let i = 0; i < 16; i++, offset += 4)
                BUF_160[i] = view.getUint32(offset, true);
            // prettier-ignore
            let al = this.h0 | 0, ar = al, bl = this.h1 | 0, br = bl, cl = this.h2 | 0, cr = cl, dl = this.h3 | 0, dr = dl, el = this.h4 | 0, er = el;
            // Instead of iterating 0 to 80, we split it into 5 groups
            // And use the groups in constants, functions, etc. Much simpler
            for (let group = 0; group < 5; group++) {
                const rGroup = 4 - group;
                const hbl = Kl160[group], hbr = Kr160[group]; // prettier-ignore
                const rl = idxL[group], rr = idxR[group]; // prettier-ignore
                const sl = shiftsL160[group], sr = shiftsR160[group]; // prettier-ignore
                for (let i = 0; i < 16; i++) {
                    const tl = (rotl(al + ripemd_f(group, bl, cl, dl) + BUF_160[rl[i]] + hbl, sl[i]) + el) | 0;
                    al = el, el = dl, dl = rotl(cl, 10) | 0, cl = bl, bl = tl; // prettier-ignore
                }
                // 2 loops are 10% faster
                for (let i = 0; i < 16; i++) {
                    const tr = (rotl(ar + ripemd_f(rGroup, br, cr, dr) + BUF_160[rr[i]] + hbr, sr[i]) + er) | 0;
                    ar = er, er = dr, dr = rotl(cr, 10) | 0, cr = br, br = tr; // prettier-ignore
                }
            }
            // Add the compressed chunk to the current hash value
            // Final recombination cross-adds the left/right lane accumulators into the next h0..h4 order.
            this.set((this.h1 + cl + dr) | 0, (this.h2 + dl + er) | 0, (this.h3 + el + ar) | 0, (this.h4 + al + br) | 0, (this.h0 + bl + cr) | 0);
        }
        roundClean() {
            clean(BUF_160);
        }
        destroy() {
            this.destroyed = true;
            clean(this.buffer);
            this.set(0, 0, 0, 0, 0);
        }
    }
    /**
     * RIPEMD-160 - a legacy hash function from 1990s.
     * RFC 2286 only covers HMAC-RIPEMD160 test material; the links below point
     * at the base RIPEMD-160 references.
     * * {@link https://homes.esat.kuleuven.be/~bosselae/ripemd160.html}
     * * {@link https://homes.esat.kuleuven.be/~bosselae/ripemd160/pdf/AB-9601/AB-9601.pdf}
     * @param msg - message bytes to hash
     * @returns Digest bytes.
     * @example
     * Hash a message with RIPEMD-160.
     * ```ts
     * ripemd160(new Uint8Array([97, 98, 99]));
     * ```
     */
    const ripemd160 = /* @__PURE__ */ createHasher(() => new _RIPEMD160());

    const PSBT_MAGIC = Uint8Array.of(0x70, 0x73, 0x62, 0x74, 0xff);
    const PSBT_GLOBAL_UNSIGNED_TX = 0x00;
    const PSBT_GLOBAL_VERSION = 0xfb;
    const PSBT_IN_NON_WITNESS_UTXO = 0x00;
    const PSBT_IN_WITNESS_UTXO = 0x01;
    const PSBT_IN_PARTIAL_SIG = 0x02;
    const PSBT_IN_SIGHASH_TYPE = 0x03;
    const PSBT_IN_REDEEM_SCRIPT = 0x04;
    const PSBT_IN_WITNESS_SCRIPT = 0x05;
    const PSBT_IN_BIP32_DERIVATION = 0x06;
    const PSBT_IN_FINAL_SCRIPTSIG = 0x07;
    const PSBT_IN_FINAL_SCRIPTWITNESS = 0x08;
    const PSBT_OUT_REDEEM_SCRIPT = 0x00;
    const PSBT_OUT_WITNESS_SCRIPT = 0x01;
    const PSBT_OUT_BIP32_DERIVATION = 0x02;
    const INPUT_FIELD_NAMES = {
        [PSBT_IN_NON_WITNESS_UTXO]: 'previous transaction',
        [PSBT_IN_WITNESS_UTXO]: 'witness UTXO',
        [PSBT_IN_PARTIAL_SIG]: 'partial signature',
        [PSBT_IN_SIGHASH_TYPE]: 'sighash type',
        [PSBT_IN_REDEEM_SCRIPT]: 'redeem script',
        [PSBT_IN_WITNESS_SCRIPT]: 'witness script',
        [PSBT_IN_BIP32_DERIVATION]: 'BIP32 derivation',
        [PSBT_IN_FINAL_SCRIPTSIG]: 'final scriptSig',
        [PSBT_IN_FINAL_SCRIPTWITNESS]: 'final script witness'
    };
    const OUTPUT_FIELD_NAMES = {
        [PSBT_OUT_REDEEM_SCRIPT]: 'redeem script',
        [PSBT_OUT_WITNESS_SCRIPT]: 'witness script',
        [PSBT_OUT_BIP32_DERIVATION]: 'BIP32 derivation'
    };
    // A Finalizer clears the signing data it knows about (BIP-174) and keeps the
    // UTXO, the final scripts and the fields it does not interpret.
    const CLEARED_ON_FINALIZE = new Set([
        PSBT_IN_PARTIAL_SIG,
        PSBT_IN_SIGHASH_TYPE,
        PSBT_IN_REDEEM_SCRIPT,
        PSBT_IN_WITNESS_SCRIPT,
        PSBT_IN_BIP32_DERIVATION
    ]);
    const UPDATE_FIELDS = new Set([
        'previousTx',
        'witnessUtxo',
        'witnessScript',
        'sighashType',
        'bip32Derivation',
        'partialSig',
        'finalScriptSig',
        'finalScriptWitness'
    ]);
    // Strict ECDSA (AuthScript witness v3): witness [authType 0x02, sig, pubkey, OP_TRUE]
    // against taggedHash("NeuraiAuthScript", 0x03 || 0x02 || HASH160(pubkey) || SHA256(OP_TRUE)).
    const AUTHSCRIPT_TAG = 'NeuraiAuthScript';
    const ECDSA_WITNESS_VERSION = 0x03;
    const ECDSA_AUTH_TYPE = 0x02;
    const OP_TRUE_SCRIPT = Uint8Array.of(0x51);
    const HARDENED = 0x80000000;
    // ---------------------------------------------------------------------------
    // Bytes
    const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    function bytesToBase64(bytes) {
        let out = '';
        for (let i = 0; i < bytes.length; i += 3) {
            const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
            out += BASE64[(n >> 18) & 63] + BASE64[(n >> 12) & 63];
            out += i + 1 < bytes.length ? BASE64[(n >> 6) & 63] : '=';
            out += i + 2 < bytes.length ? BASE64[n & 63] : '=';
        }
        return out;
    }
    function base64ToBytes(text) {
        if (text.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) {
            throw new Error('PSBT string is neither base64 nor hex');
        }
        const padding = text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0;
        const out = new Uint8Array((text.length / 4) * 3 - padding);
        const digit = (char) => (char === '=' ? 0 : BASE64.indexOf(char));
        let o = 0;
        for (let i = 0; i < text.length; i += 4) {
            const n = (digit(text[i]) << 18) | (digit(text[i + 1]) << 12) | (digit(text[i + 2]) << 6) | digit(text[i + 3]);
            for (const shift of [16, 8, 0])
                if (o < out.length)
                    out[o++] = (n >> shift) & 255;
        }
        return out;
    }
    function psbtBytes(psbt) {
        if (psbt instanceof Uint8Array)
            return psbt;
        if (typeof psbt !== 'string')
            throw new TypeError('PSBT must be a base64 or hex string, or bytes');
        const text = psbt.trim();
        return /^70736274ff/i.test(text) ? hexToBytes(text) : base64ToBytes(text);
    }
    function equalBytes(a, b) {
        return a.length === b.length && a.every((value, index) => value === b[index]);
    }
    /** Byte-wise order, a prefix first: how BIP-174 serializers sort map keys. */
    function compareBytes(a, b) {
        for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
            if (a[i] !== b[i])
                return a[i] < b[i] ? -1 : 1;
        }
        return a.length - b.length;
    }
    function readU32LE(bytes) {
        return new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, true);
    }
    function hash160(bytes) {
        return ripemd160(sha256(bytes));
    }
    function taggedHash(tag, message) {
        const tagHash = sha256(asciiBytes(tag));
        return sha256(concatBytes(tagHash, tagHash, message));
    }
    function ecdsaV3Commitment(pubkey) {
        return taggedHash(AUTHSCRIPT_TAG, concatBytes(Uint8Array.of(ECDSA_WITNESS_VERSION, ECDSA_AUTH_TYPE), hash160(pubkey), sha256(OP_TRUE_SCRIPT)));
    }
    class Reader {
        bytes;
        label;
        offset = 0;
        constructor(bytes, label) {
            this.bytes = bytes;
            this.label = label;
        }
        get finished() {
            return this.offset === this.bytes.length;
        }
        readBytes(count) {
            if (count > this.bytes.length - this.offset) {
                throw new Error(`${this.label} is truncated (need ${count} byte(s) at offset ${this.offset})`);
            }
            const out = this.bytes.subarray(this.offset, this.offset + count);
            this.offset += count;
            return out;
        }
        /** Canonical CompactSize, bounded by the bytes left (every length or count here is). */
        readCompactSize() {
            const first = this.readBytes(1)[0];
            let value = BigInt(first);
            if (first >= 0xfd) {
                const width = first === 0xfd ? 2 : first === 0xfe ? 4 : 8;
                const bytes = this.readBytes(width);
                value = 0n;
                for (let i = width - 1; i >= 0; i -= 1)
                    value = (value << 8n) | BigInt(bytes[i]);
                const minimum = width === 2 ? 0xfdn : width === 4 ? 0x10000n : 0x100000000n;
                if (value < minimum)
                    throw new Error(`${this.label}: non-canonical CompactSize at offset ${this.offset - width - 1}`);
            }
            if (value > BigInt(this.bytes.length - this.offset)) {
                throw new Error(`${this.label} is truncated (length ${value} at offset ${this.offset})`);
            }
            return Number(value);
        }
        readMap(mapLabel) {
            const map = [];
            const seen = new Set();
            for (;;) {
                const keyLength = this.readCompactSize();
                if (keyLength === 0)
                    return map;
                const key = this.readBytes(keyLength);
                const value = this.readBytes(this.readCompactSize());
                const keyHex = bytesToHex(key);
                if (seen.has(keyHex))
                    throw new Error(`PSBT ${mapLabel}: duplicate key ${keyHex}`);
                seen.add(keyHex);
                map.push({ key, value });
            }
        }
    }
    function encodeWitnessStack(stack) {
        if (!Array.isArray(stack))
            throw new Error('finalScriptWitness must be an array of hex strings');
        return concatBytes(compactSize(stack.length), ...stack.map((element) => {
            const bytes = hexToBytes(ensureHex(element, 'witness element'));
            return concatBytes(compactSize(bytes.length), bytes);
        }));
    }
    function decodeWitnessStack(bytes, label) {
        const reader = new Reader(bytes, label);
        const count = reader.readCompactSize();
        const stack = [];
        for (let i = 0; i < count; i += 1)
            stack.push(bytesToHex(reader.readBytes(reader.readCompactSize())));
        if (!reader.finished)
            throw new Error(`${label} has trailing data`);
        return stack;
    }
    // BIP-66 DER structure followed by one sighash byte.
    function isDerSignatureWithSighash(sig) {
        if (sig.length < 9 || sig.length > 73 || sig[0] !== 0x30 || sig[1] !== sig.length - 3)
            return false;
        const rLength = sig[3];
        if (sig[2] !== 0x02 || rLength === 0 || 5 + rLength >= sig.length)
            return false;
        const sLength = sig[5 + rLength];
        if (sig[4 + rLength] !== 0x02 || sLength === 0)
            return false;
        return rLength + sLength + 7 === sig.length;
    }
    function isPublicKey(pubkey) {
        return (pubkey.length === 33 && (pubkey[0] === 0x02 || pubkey[0] === 0x03)) || (pubkey.length === 65 && pubkey[0] === 0x04);
    }
    function encodePath(path, label) {
        if (typeof path !== 'string' || !/^m(\/\d+['h]?)*$/.test(path)) {
            throw new Error(`${label}: invalid derivation path "${path}"`);
        }
        return concatBytes(...path
            .split('/')
            .slice(1)
            .map((level) => {
            const hardened = /['h]$/.test(level);
            const index = Number(hardened ? level.slice(0, -1) : level);
            if (!Number.isSafeInteger(index) || index >= HARDENED)
                throw new Error(`${label}: derivation index out of range in "${path}"`);
            return u32LE(hardened ? index + HARDENED : index);
        }));
    }
    function decodePath(bytes) {
        let path = 'm';
        for (let offset = 0; offset < bytes.length; offset += 4) {
            const value = readU32LE(bytes.subarray(offset, offset + 4));
            path += `/${value & 0x7fffffff}${value >= HARDENED ? "'" : ''}`;
        }
        return path;
    }
    // ---------------------------------------------------------------------------
    // Maps
    function fieldName(map, key) {
        const names = map.startsWith('input') ? INPUT_FIELD_NAMES : map.startsWith('output') ? OUTPUT_FIELD_NAMES : {};
        const name = names[key[0]] ?? `key type 0x${key[0].toString(16).padStart(2, '0')}`;
        return key.length > 1 ? `${name} ${bytesToHex(key.subarray(1))}` : name;
    }
    function singleByteKey(entry, map) {
        if (entry.key.length !== 1)
            throw new Error(`PSBT ${map}: the ${fieldName(map, entry.key)} key has unexpected key data`);
    }
    function keyPublicKey(entry, map) {
        const pubkey = entry.key.subarray(1);
        if (!isPublicKey(pubkey))
            throw new Error(`PSBT ${map}: invalid public key in the ${fieldName(map, entry.key)} key`);
        return pubkey;
    }
    function decodeDerivation(entry, map) {
        const pubkey = keyPublicKey(entry, map);
        if (entry.value.length < 4 || entry.value.length % 4 !== 0) {
            throw new Error(`PSBT ${map}: BIP32 derivation value must be a fingerprint and 4-byte path elements`);
        }
        return { masterFingerprint: entry.value.subarray(0, 4), pubkey, path: decodePath(entry.value.subarray(4)) };
    }
    function decodeInputMap(map, label) {
        const view = { partialSig: [], bip32Derivation: [], unknown: [] };
        for (const entry of map) {
            const { key, value } = entry;
            switch (key[0]) {
                case PSBT_IN_NON_WITNESS_UTXO:
                    singleByteKey(entry, label);
                    view.previousTx = value;
                    break;
                case PSBT_IN_WITNESS_UTXO: {
                    singleByteKey(entry, label);
                    const reader = new Reader(value, `PSBT ${label} witness UTXO`);
                    const amountBytes = reader.readBytes(8);
                    const amount = new DataView(amountBytes.buffer, amountBytes.byteOffset, 8).getBigInt64(0, true);
                    const script = reader.readBytes(reader.readCompactSize());
                    if (!reader.finished || amount < 0n)
                        throw new Error(`PSBT ${label}: malformed witness UTXO`);
                    view.witnessUtxo = { script, value: amount };
                    break;
                }
                case PSBT_IN_PARTIAL_SIG: {
                    const pubkey = keyPublicKey(entry, label);
                    if (!isDerSignatureWithSighash(value)) {
                        throw new Error(`PSBT ${label}: the signature for ${bytesToHex(pubkey)} is not DER followed by a sighash byte`);
                    }
                    view.partialSig.push({ pubkey, signature: value });
                    break;
                }
                case PSBT_IN_SIGHASH_TYPE:
                    singleByteKey(entry, label);
                    if (value.length !== 4)
                        throw new Error(`PSBT ${label}: the sighash type must be 4 bytes`);
                    view.sighashType = readU32LE(value);
                    break;
                case PSBT_IN_REDEEM_SCRIPT:
                    singleByteKey(entry, label);
                    view.redeemScript = value;
                    break;
                case PSBT_IN_WITNESS_SCRIPT:
                    singleByteKey(entry, label);
                    view.witnessScript = value;
                    break;
                case PSBT_IN_BIP32_DERIVATION:
                    view.bip32Derivation.push(decodeDerivation(entry, label));
                    break;
                case PSBT_IN_FINAL_SCRIPTSIG:
                    singleByteKey(entry, label);
                    view.finalScriptSig = value;
                    break;
                case PSBT_IN_FINAL_SCRIPTWITNESS:
                    singleByteKey(entry, label);
                    view.finalScriptWitness = decodeWitnessStack(value, `PSBT ${label} final script witness`);
                    break;
                default:
                    view.unknown.push(entry);
            }
        }
        return view;
    }
    function decodeOutputMap(map, label) {
        const view = { bip32Derivation: [], unknown: [] };
        for (const entry of map) {
            switch (entry.key[0]) {
                case PSBT_OUT_REDEEM_SCRIPT:
                    singleByteKey(entry, label);
                    view.redeemScript = entry.value;
                    break;
                case PSBT_OUT_WITNESS_SCRIPT:
                    singleByteKey(entry, label);
                    view.witnessScript = entry.value;
                    break;
                case PSBT_OUT_BIP32_DERIVATION:
                    view.bip32Derivation.push(decodeDerivation(entry, label));
                    break;
                default:
                    view.unknown.push(entry);
            }
        }
        return view;
    }
    function encodeDerivation(type, derivation, label) {
        const fingerprint = hexToBytes(ensureHex(derivation.masterFingerprintHex, 'masterFingerprintHex'));
        if (fingerprint.length !== 4)
            throw new Error(`${label}: the master fingerprint must be 4 bytes`);
        return {
            key: concatBytes(Uint8Array.of(type), hexToBytes(ensureHex(derivation.pubkeyHex, 'pubkeyHex'))),
            value: concatBytes(fingerprint, encodePath(derivation.path, label))
        };
    }
    function encodeOutputFields(fields, index) {
        if (!fields || typeof fields !== 'object')
            throw new Error(`PSBT output ${index}: fields must be an object`);
        for (const name of Object.keys(fields)) {
            if (name !== 'bip32Derivation')
                throw new Error(`PSBT output ${index}: unknown field "${name}"`);
        }
        return (fields.bip32Derivation ?? []).map((derivation) => encodeDerivation(PSBT_OUT_BIP32_DERIVATION, derivation, `PSBT output ${index}`));
    }
    function encodeInputFields(fields, index) {
        if (!fields || typeof fields !== 'object')
            throw new Error(`PSBT input ${index}: fields must be an object`);
        for (const name of Object.keys(fields)) {
            if (!UPDATE_FIELDS.has(name))
                throw new Error(`PSBT input ${index}: unknown field "${name}"`);
        }
        const bytes = (hex, label) => hexToBytes(ensureHex(hex, label));
        const entries = [];
        const add = (type, keyData, value) => entries.push({ key: concatBytes(Uint8Array.of(type), keyData), value });
        const none = new Uint8Array();
        if (fields.previousTx !== undefined)
            add(PSBT_IN_NON_WITNESS_UTXO, none, bytes(fields.previousTx, 'previousTx'));
        if (fields.witnessUtxo !== undefined) {
            const value = toRawInteger(fields.witnessUtxo.valueSats, 'witnessUtxo.valueSats');
            if (value < 0n)
                throw new Error(`PSBT input ${index}: negative witnessUtxo value`);
            const script = bytes(fields.witnessUtxo.scriptPubKeyHex, 'witnessUtxo.scriptPubKeyHex');
            add(PSBT_IN_WITNESS_UTXO, none, concatBytes(i64LE(value), compactSize(script.length), script));
        }
        if (fields.witnessScript !== undefined)
            add(PSBT_IN_WITNESS_SCRIPT, none, bytes(fields.witnessScript, 'witnessScript'));
        if (fields.sighashType !== undefined) {
            const type = fields.sighashType;
            if (!Number.isInteger(type) || type < 0 || type > 0xffffffff)
                throw new Error(`PSBT input ${index}: invalid sighashType ${type}`);
            add(PSBT_IN_SIGHASH_TYPE, none, u32LE(type));
        }
        for (const derivation of fields.bip32Derivation ?? []) {
            entries.push(encodeDerivation(PSBT_IN_BIP32_DERIVATION, derivation, `PSBT input ${index}`));
        }
        for (const sig of fields.partialSig ?? []) {
            add(PSBT_IN_PARTIAL_SIG, bytes(sig.pubkeyHex, 'pubkeyHex'), bytes(sig.signatureHex, 'signatureHex'));
        }
        if (fields.finalScriptSig !== undefined)
            add(PSBT_IN_FINAL_SCRIPTSIG, none, bytes(fields.finalScriptSig, 'finalScriptSig'));
        if (fields.finalScriptWitness !== undefined) {
            add(PSBT_IN_FINAL_SCRIPTWITNESS, none, encodeWitnessStack(fields.finalScriptWitness));
        }
        return entries;
    }
    // ---------------------------------------------------------------------------
    // Reading and writing
    function assertUnsigned(tx, label) {
        if (tx.inputs.length === 0)
            throw new Error(`${label} has no inputs`);
        tx.inputs.forEach((input, index) => {
            if (input.scriptSigHex) {
                throw new Error(`${label}: input ${index} has a scriptSig (the transaction of a PSBT is unsigned)`);
            }
            if (input.witness && input.witness.length > 0) {
                throw new Error(`${label}: input ${index} has a witness (the transaction of a PSBT is unsigned)`);
            }
        });
    }
    /** The global transaction: unsigned, in the plain (non-witness) Neurai serialization. */
    function parseUnsignedTransaction(bytes) {
        const hex = bytesToHex(bytes);
        let tx;
        try {
            tx = parseTransaction(hex);
        }
        catch (error) {
            throw new Error(`PSBT unsigned transaction is unreadable: ${error.message}`);
        }
        assertUnsigned(tx, 'PSBT unsigned transaction');
        if (serializeTransaction(tx, { includeWitness: false }) !== hex) {
            throw new Error('PSBT unsigned transaction is not in the plain serialization');
        }
        return tx;
    }
    /** Previous output of an input, its previous transaction checked against the outpoint. */
    function previousOutputOf(input, outpoint, index) {
        if (input.previousTx) {
            const previousHex = bytesToHex(input.previousTx);
            let previous;
            try {
                previous = parseTransaction(previousHex);
            }
            catch (error) {
                throw new Error(`PSBT input ${index}: unreadable previous transaction (${error.message})`);
            }
            const txid = computeTxid(previous);
            if (txid !== outpoint.txid) {
                throw new Error(`PSBT input ${index}: the previous transaction is ${txid}, but the input spends ${outpoint.txid}:${outpoint.vout}`);
            }
            const output = previous.outputs[outpoint.vout];
            if (!output)
                throw new Error(`PSBT input ${index}: the previous transaction has no output ${outpoint.vout}`);
            if (input.witnessUtxo &&
                (bytesToHex(input.witnessUtxo.script) !== output.scriptPubKeyHex || input.witnessUtxo.value !== output.valueSats)) {
                throw new Error(`PSBT input ${index}: the witness UTXO contradicts the previous transaction`);
            }
            return { scriptPubKeyHex: output.scriptPubKeyHex, valueSats: output.valueSats };
        }
        if (input.witnessUtxo) {
            return { scriptPubKeyHex: bytesToHex(input.witnessUtxo.script), valueSats: input.witnessUtxo.value };
        }
        return null;
    }
    /** Parse and validate: structure, every interpreted field, and the profile rules. */
    function loadPsbt(psbt) {
        const bytes = psbtBytes(psbt);
        if (bytes.length < PSBT_MAGIC.length || !equalBytes(bytes.subarray(0, PSBT_MAGIC.length), PSBT_MAGIC)) {
            throw new Error('Not a PSBT: missing the "psbt" magic and 0xff separator');
        }
        const reader = new Reader(bytes.subarray(PSBT_MAGIC.length), 'PSBT');
        const global = reader.readMap('global map');
        const txEntries = global.filter((entry) => entry.key[0] === PSBT_GLOBAL_UNSIGNED_TX);
        if (txEntries.length !== 1 || txEntries[0].key.length !== 1) {
            throw new Error('PSBT global map must hold exactly one unsigned transaction (PSBT version 0)');
        }
        const version = global.find((entry) => entry.key.length === 1 && entry.key[0] === PSBT_GLOBAL_VERSION);
        if (version && (version.value.length !== 4 || readU32LE(version.value) !== 0)) {
            throw new Error('Only PSBT version 0 is supported');
        }
        const tx = parseUnsignedTransaction(txEntries[0].value);
        const inputs = tx.inputs.map((_, index) => reader.readMap(`input ${index}`));
        const outputs = tx.outputs.map((_, index) => reader.readMap(`output ${index}`));
        if (!reader.finished)
            throw new Error('PSBT has data after its last output map');
        inputs.forEach((map, index) => previousOutputOf(decodeInputMap(map, `input ${index}`), tx.inputs[index], index));
        outputs.forEach((map, index) => decodeOutputMap(map, `output ${index}`));
        return { tx, global, inputs, outputs };
    }
    /** Canonical form: every map sorted by key, as BIP-174 serializers write it. */
    function encodePsbt(loaded) {
        const map = (entries) => concatBytes(...[...entries]
            .sort((a, b) => compareBytes(a.key, b.key))
            .flatMap(({ key, value }) => [compactSize(key.length), key, compactSize(value.length), value]), Uint8Array.of(0));
        return bytesToBase64(concatBytes(PSBT_MAGIC, map(loaded.global), ...loaded.inputs.map(map), ...loaded.outputs.map(map)));
    }
    /** Union of key-value maps; the same key with a different value is a conflict, never a choice. */
    function mergeMap(target, other, map) {
        for (const entry of other) {
            const existing = target.find((candidate) => equalBytes(candidate.key, entry.key));
            if (!existing) {
                target.push(entry);
            }
            else if (!equalBytes(existing.value, entry.value)) {
                throw new Error(`PSBT conflict in ${map}: ${fieldName(map, entry.key)} already holds a different value`);
            }
        }
    }
    /** Re-read after a change, so the result passes the same validation as any input. */
    function revalidated(loaded) {
        return encodePsbt(loadPsbt(encodePsbt(loaded)));
    }
    function checkIndex(index, count, kind) {
        if (!Number.isInteger(index) || index < 0 || index >= count) {
            throw new Error(`PSBT has no ${kind} ${index} (it has ${count})`);
        }
    }
    // ---------------------------------------------------------------------------
    // Public API
    /** Creator + Updater: a PSBT for an unsigned transaction, with optional fields per input and output. */
    function createPsbt(params) {
        const { unsignedTx } = params;
        const tx = typeof unsignedTx === 'string' ? parseTransaction(unsignedTx) : unsignedTx;
        assertUnsigned(tx, 'createPsbt: the transaction');
        const fields = params.inputs ?? [];
        if (fields.length > tx.inputs.length) {
            throw new Error(`createPsbt: fields for ${fields.length} inputs, but the transaction has ${tx.inputs.length}`);
        }
        const outputFields = params.outputs ?? [];
        if (outputFields.length > tx.outputs.length) {
            throw new Error(`createPsbt: fields for ${outputFields.length} outputs, but the transaction has ${tx.outputs.length}`);
        }
        const inputs = tx.inputs.map((_, index) => []);
        fields.forEach((inputFields, index) => {
            if (inputFields !== undefined)
                mergeMap(inputs[index], encodeInputFields(inputFields, index), `input ${index}`);
        });
        const outputs = tx.outputs.map((_, index) => []);
        outputFields.forEach((fieldsOfOutput, index) => {
            if (fieldsOfOutput !== undefined)
                mergeMap(outputs[index], encodeOutputFields(fieldsOfOutput, index), `output ${index}`);
        });
        return revalidated({
            global: [
                { key: Uint8Array.of(PSBT_GLOBAL_UNSIGNED_TX), value: hexToBytes(serializeTransaction(tx, { includeWitness: false })) }
            ],
            inputs,
            outputs
        });
    }
    /** Read a PSBT, enforcing the Neurai profile (previous transactions match their outpoints). */
    function decodePsbt(psbt) {
        const { tx, global, inputs, outputs } = loadPsbt(psbt);
        const keyValues = (entries) => entries.map((entry) => ({ keyHex: bytesToHex(entry.key), valueHex: bytesToHex(entry.value) }));
        const derivations = (list) => list.map((derivation) => ({
            masterFingerprintHex: bytesToHex(derivation.masterFingerprint),
            pubkeyHex: bytesToHex(derivation.pubkey),
            path: derivation.path
        }));
        const hex = (bytes) => (bytes ? bytesToHex(bytes) : undefined);
        const defined = (object) => Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
        return {
            unsignedTx: tx,
            txid: computeTxid(tx),
            inputs: inputs.map((map, index) => {
                const view = decodeInputMap(map, `input ${index}`);
                return defined({
                    previousTx: hex(view.previousTx),
                    witnessUtxo: view.witnessUtxo && {
                        scriptPubKeyHex: bytesToHex(view.witnessUtxo.script),
                        valueSats: view.witnessUtxo.value
                    },
                    partialSig: view.partialSig.map((sig) => ({
                        pubkeyHex: bytesToHex(sig.pubkey),
                        signatureHex: bytesToHex(sig.signature)
                    })),
                    sighashType: view.sighashType,
                    redeemScript: hex(view.redeemScript),
                    witnessScript: hex(view.witnessScript),
                    bip32Derivation: derivations(view.bip32Derivation),
                    finalScriptSig: hex(view.finalScriptSig),
                    finalScriptWitness: view.finalScriptWitness,
                    unknown: keyValues(view.unknown)
                });
            }),
            outputs: outputs.map((map, index) => {
                const view = decodeOutputMap(map, `output ${index}`);
                return defined({
                    redeemScript: hex(view.redeemScript),
                    witnessScript: hex(view.witnessScript),
                    bip32Derivation: derivations(view.bip32Derivation),
                    unknown: keyValues(view.unknown)
                });
            }),
            unknown: keyValues(global.filter((entry) => entry.key[0] !== PSBT_GLOBAL_UNSIGNED_TX))
        };
    }
    /**
     * Add fields to one input. A field already present with the same value is
     * left as is; with a different value it is a conflict and throws.
     */
    function updatePsbtInput(psbt, index, fields) {
        const loaded = loadPsbt(psbt);
        checkIndex(index, loaded.tx.inputs.length, 'input');
        mergeMap(loaded.inputs[index], encodeInputFields(fields, index), `input ${index}`);
        return revalidated(loaded);
    }
    /**
     * Combiner: union of PSBTs of the same transaction. Unlike BIP-174's
     * "pick one", a key present with different values is rejected.
     */
    function combinePsbts(base, ...others) {
        const merged = loadPsbt(base);
        const baseTx = serializeTransaction(merged.tx, { includeWitness: false });
        for (const other of others.map(loadPsbt)) {
            if (serializeTransaction(other.tx, { includeWitness: false }) !== baseTx) {
                throw new Error('Cannot combine PSBTs of different transactions');
            }
            mergeMap(merged.global, other.global, 'global map');
            other.inputs.forEach((map, index) => mergeMap(merged.inputs[index], map, `input ${index}`));
            other.outputs.forEach((map, index) => mergeMap(merged.outputs[index], map, `output ${index}`));
        }
        return revalidated(merged);
    }
    /** Previous output (script and value) an input spends, from its previous transaction or witness UTXO. */
    function getPsbtPreviousOutput(decoded, index) {
        checkIndex(index, decoded.unsignedTx.inputs.length, 'input');
        const input = decoded.inputs[index];
        const view = { };
        if (input?.previousTx)
            view.previousTx = hexToBytes(input.previousTx);
        if (input?.witnessUtxo) {
            view.witnessUtxo = { script: hexToBytes(input.witnessUtxo.scriptPubKeyHex), value: input.witnessUtxo.valueSats };
        }
        const previous = previousOutputOf(view, decoded.unsignedTx.inputs[index], index);
        if (!previous)
            throw new Error(`PSBT input ${index} carries neither its previous transaction nor a witness UTXO`);
        return previous;
    }
    function signatureFor(input, index, family, ownsKey) {
        if (input.partialSig.length === 0)
            throw new Error(`PSBT input ${index} (${family}) is not signed`);
        const match = input.partialSig.find((sig) => ownsKey(sig.pubkey));
        if (!match)
            throw new Error(`PSBT input ${index}: no signature from the key its ${family} previous output pays to`);
        const used = match.signature[match.signature.length - 1];
        if (input.sighashType !== undefined && used !== input.sighashType) {
            throw new Error(`PSBT input ${index}: the signature uses sighash 0x${used.toString(16).padStart(2, '0')}, ` +
                `but the input asks for 0x${input.sighashType.toString(16).padStart(2, '0')}`);
        }
        return match;
    }
    /** Final key-value pairs of one input: final scripts built (or kept), signing data cleared. */
    function finalizeInputMap(map, outpoint, index) {
        const input = decodeInputMap(map, `input ${index}`);
        const finals = [];
        if (!input.finalScriptSig && !input.finalScriptWitness) {
            const previous = previousOutputOf(input, outpoint, index);
            if (!previous)
                throw new Error(`PSBT input ${index} carries neither its previous transaction nor a witness UTXO`);
            const kind = classifyScriptPubKey(previous.scriptPubKeyHex);
            const program = kind.program ?? new Uint8Array();
            if (kind.type === 'p2pkh') {
                const sig = signatureFor(input, index, 'P2PKH', (pubkey) => equalBytes(hash160(pubkey), program));
                finals.push({
                    key: Uint8Array.of(PSBT_IN_FINAL_SCRIPTSIG),
                    value: concatBytes(pushData(sig.signature), pushData(sig.pubkey))
                });
            }
            else if (kind.type === 'ecdsa') {
                const sig = signatureFor(input, index, 'ECDSA (AuthScript v3)', (pubkey) => pubkey.length === 33 && equalBytes(ecdsaV3Commitment(pubkey), program));
                finals.push({
                    key: Uint8Array.of(PSBT_IN_FINAL_SCRIPTWITNESS),
                    value: encodeWitnessStack([
                        bytesToHex(Uint8Array.of(ECDSA_AUTH_TYPE)),
                        bytesToHex(sig.signature),
                        bytesToHex(sig.pubkey),
                        bytesToHex(OP_TRUE_SCRIPT)
                    ])
                });
            }
            else if (kind.type === 'authscript' || kind.type === 'pq') {
                throw new Error(`PSBT input ${index}: an AuthScript v${kind.witnessVersion} input is finalized by its signer ` +
                    '(final script witness), and this one has none');
            }
            else {
                throw new Error(`PSBT input ${index}: no finalization template for scriptPubKey ${previous.scriptPubKeyHex}`);
            }
        }
        return [...map.filter((entry) => !CLEARED_ON_FINALIZE.has(entry.key[0])), ...finals];
    }
    /**
     * Finalizer. P2PKH and strict ECDSA (AuthScript v3) inputs are completed from
     * their `partialSig`; inputs that already carry finalScriptSig/finalScriptWitness
     * (covenant branches, PQ) are kept. A signature whose sighash byte differs from
     * the input's `sighashType` is rejected. Finalized inputs keep only the UTXO,
     * the final scripts and the fields this module does not interpret.
     */
    function finalizePsbt(psbt, options = {}) {
        const loaded = loadPsbt(psbt);
        const count = loaded.tx.inputs.length;
        const selection = options.inputs ?? 'all';
        let indexes;
        if (selection === 'all') {
            indexes = loaded.tx.inputs.map((_, index) => index);
        }
        else if (Array.isArray(selection)) {
            selection.forEach((index) => checkIndex(index, count, 'input'));
            indexes = [...new Set(selection)];
        }
        else {
            throw new Error(`finalizePsbt: inputs must be 'all' or a list of indexes`);
        }
        for (const index of indexes) {
            loaded.inputs[index] = finalizeInputMap(loaded.inputs[index], loaded.tx.inputs[index], index);
        }
        return revalidated(loaded);
    }
    /**
     * Extractor: the network transaction from the final scripts. Inputs without
     * them make it throw, unless `allowIncomplete` is set: they are then left
     * empty and listed in `incomplete` (for callers that add other unlocking data).
     */
    function extractPsbtTransaction(psbt, options = {}) {
        const loaded = loadPsbt(psbt);
        const incomplete = [];
        const inputs = loaded.tx.inputs.map((outpoint, index) => {
            const input = decodeInputMap(loaded.inputs[index], `input ${index}`);
            if (!input.finalScriptSig && !input.finalScriptWitness) {
                incomplete.push(index);
                return { ...outpoint };
            }
            const signed = {
                ...outpoint,
                scriptSigHex: input.finalScriptSig ? bytesToHex(input.finalScriptSig) : ''
            };
            if (input.finalScriptWitness)
                signed.witness = input.finalScriptWitness;
            return signed;
        });
        if (incomplete.length > 0 && !options.allowIncomplete) {
            throw new Error(`PSBT is not finalized: input(s) ${incomplete.join(', ')} have no final scriptSig or witness`);
        }
        const hex = serializeTransaction({ ...loaded.tx, inputs });
        return { hex, txid: computeTxid(hex), incomplete };
    }

    var NeuraiCreateTransaction = /*#__PURE__*/Object.freeze({
        __proto__: null,
        AUTHSCRIPT_MAINNET_HRP: AUTHSCRIPT_MAINNET_HRP,
        AUTHSCRIPT_TESTNET_HRP: AUTHSCRIPT_TESTNET_HRP,
        DEFAULT_ASSET_MARKER: DEFAULT_ASSET_MARKER,
        DEPIN_MAX_NAME_LENGTH: DEPIN_MAX_NAME_LENGTH,
        ECDSA_MAINNET_HRP: ECDSA_MAINNET_HRP,
        ECDSA_TESTNET_HRP: ECDSA_TESTNET_HRP,
        MAX_MONEY: MAX_MONEY,
        OWNER_ASSET_AMOUNT: OWNER_ASSET_AMOUNT,
        PQ_MAINNET_HRP: PQ_MAINNET_HRP,
        PQ_TESTNET_HRP: PQ_TESTNET_HRP,
        REGTEST_GLOBAL_BURN_ADDRESS: REGTEST_GLOBAL_BURN_ADDRESS,
        SATS_PER_XNA: SATS_PER_XNA,
        UNIQUE_ASSETS_REISSUABLE: UNIQUE_ASSETS_REISSUABLE,
        UNIQUE_ASSET_AMOUNT: UNIQUE_ASSET_AMOUNT,
        UNIQUE_ASSET_UNITS: UNIQUE_ASSET_UNITS,
        WITNESS_FAMILIES: WITNESS_FAMILIES,
        assertDepinAssetName: assertDepinAssetName,
        assertDepinNetwork: assertDepinNetwork,
        assertMoneyRange: assertMoneyRange,
        assetPayloadPrefix: assetPayloadPrefix,
        assetUnitsToRaw: assetUnitsToRaw,
        classifyScriptPubKey: classifyScriptPubKey,
        combinePsbts: combinePsbts,
        computeTxid: computeTxid,
        computeWtxid: computeWtxid,
        createAssetTransferOutput: createAssetTransferOutput,
        createAssetTransferToScriptOutput: createAssetTransferToScriptOutput,
        createDepinSelfRevokeTransaction: createDepinSelfRevokeTransaction,
        createDepinTransferTransaction: createDepinTransferTransaction,
        createFreezeAddressesTransaction: createFreezeAddressesTransaction,
        createFreezeAssetTransaction: createFreezeAssetTransaction,
        createFromOperation: createFromOperation,
        createGlobalRestrictionOutput: createGlobalRestrictionOutput,
        createIssueAssetOutput: createIssueAssetOutput,
        createIssueAssetTransaction: createIssueAssetTransaction,
        createIssueDepinTransaction: createIssueDepinTransaction,
        createIssueQualifierTransaction: createIssueQualifierTransaction,
        createIssueRestrictedTransaction: createIssueRestrictedTransaction,
        createIssueSubAssetTransaction: createIssueSubAssetTransaction,
        createIssueUniqueAssetTransaction: createIssueUniqueAssetTransaction,
        createNullAssetRestrictionOutput: createNullAssetRestrictionOutput,
        createNullAssetTagOutput: createNullAssetTagOutput,
        createOwnerAssetIssueOutput: createOwnerAssetIssueOutput,
        createOwnerAssetTransferOutput: createOwnerAssetTransferOutput,
        createPaymentTransaction: createPaymentTransaction,
        createPsbt: createPsbt,
        createQualifierTagTransaction: createQualifierTagTransaction,
        createReissueAssetOutput: createReissueAssetOutput,
        createReissueRestrictedTransaction: createReissueRestrictedTransaction,
        createReissueTransaction: createReissueTransaction,
        createStandardAssetTransferTransaction: createStandardAssetTransferTransaction,
        createTransferOutput: createTransferOutput,
        createTransferWithMessageOutput: createTransferWithMessageOutput,
        createUnsignedTransaction: createUnsignedTransaction,
        createVerifierStringOutput: createVerifierStringOutput,
        createXnaOutput: createXnaOutput,
        decimalToSatoshis: decimalToSatoshis,
        decodeAddress: decodeAddress,
        decodeAssetDataReferenceHex: decodeAssetDataReferenceHex,
        decodePsbt: decodePsbt,
        encodeAssetDataReference: encodeAssetDataReference,
        encodeAssetTransferPayload: encodeAssetTransferPayload,
        encodeAssetTransferScript: encodeAssetTransferScript,
        encodeAssetTransferScriptToScript: encodeAssetTransferScriptToScript,
        encodeAuthScriptDestinationScript: encodeAuthScriptDestinationScript,
        encodeDestinationScript: encodeDestinationScript,
        encodeGlobalRestrictionScript: encodeGlobalRestrictionScript,
        encodeNewAssetPayload: encodeNewAssetPayload,
        encodeNewAssetScript: encodeNewAssetScript,
        encodeNullAssetDataPayload: encodeNullAssetDataPayload,
        encodeNullAssetDestinationScript: encodeNullAssetDestinationScript,
        encodeNullAssetRestrictionScript: encodeNullAssetRestrictionScript,
        encodeNullAssetTagPayload: encodeNullAssetTagPayload,
        encodeNullAssetTagScript: encodeNullAssetTagScript,
        encodeOwnerAssetPayload: encodeOwnerAssetPayload,
        encodeOwnerAssetScript: encodeOwnerAssetScript,
        encodeP2PKHScript: encodeP2PKHScript,
        encodePQWitnessScript: encodePQWitnessScript,
        encodeReissueAssetPayload: encodeReissueAssetPayload,
        encodeReissueAssetScript: encodeReissueAssetScript,
        encodeVerifierStringPayload: encodeVerifierStringPayload,
        encodeVerifierStringScript: encodeVerifierStringScript,
        encodeWitnessProgramScript: encodeWitnessProgramScript,
        estimateTransactionSize: estimateTransactionSize,
        extractPsbtTransaction: extractPsbtTransaction,
        finalizePsbt: finalizePsbt,
        formatAssetDataReferenceHex: formatAssetDataReferenceHex,
        getBurnAddressForOperation: getBurnAddressForOperation,
        getBurnAmountSats: getBurnAmountSats,
        getBurnAmountXna: getBurnAmountXna,
        getOwnerTokenName: getOwnerTokenName,
        getParentAssetName: getParentAssetName,
        getPsbtPreviousOutput: getPsbtPreviousOutput,
        getUniqueAssetName: getUniqueAssetName,
        inferNetworkFromAnyAddress: inferNetworkFromAnyAddress,
        isCidV0AssetReference: isCidV0AssetReference,
        isDepinAssetName: isDepinAssetName,
        isEncodedAssetDataReferenceHex: isEncodedAssetDataReferenceHex,
        isRawAssetDataReferenceHex: isRawAssetDataReferenceHex,
        isTxidAssetReference: isTxidAssetReference,
        isWitnessDestination: isWitnessDestination,
        normalizeVerifierString: normalizeVerifierString,
        parseTransaction: parseTransaction,
        resolveAddressInput: resolveAddressInput,
        resolveAssetMarker: resolveAssetMarker,
        satoshisToDecimal: satoshisToDecimal,
        serializeInput: serializeInput,
        serializeOutput: serializeOutput,
        serializeTransaction: serializeTransaction,
        toRawInteger: toRawInteger,
        updatePsbtInput: updatePsbtInput,
        xnaToSatoshis: xnaToSatoshis
    });

    const globalTarget = globalThis;
    globalTarget.NeuraiCreateTransaction = NeuraiCreateTransaction;

    exports.NeuraiCreateTransaction = NeuraiCreateTransaction;

    return exports;

})({});
//# sourceMappingURL=NeuraiCreateTransaction.global.js.map
