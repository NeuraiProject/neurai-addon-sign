var NeuraiCreateTransactionBundle = (function (exports) {
    'use strict';

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
        const bigintValue = typeof value === 'bigint' ? value : BigInt(value);
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
        const bigintValue = typeof value === 'bigint' ? value : BigInt(value);
        if (bigintValue < -0x8000000000000000n || bigintValue > 0x7fffffffffffffffn) {
            throw new Error(`int64 out of range: ${bigintValue}`);
        }
        const out = new Uint8Array(8);
        const view = new DataView(out.buffer);
        view.setBigInt64(0, bigintValue, true);
        return out;
    }
    function compactSize(value) {
        const bigintValue = typeof value === 'bigint' ? value : BigInt(value);
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
    const PQ_MAINNET_HRP = 'nq';
    const PQ_TESTNET_HRP = 'tnq';
    const OP_XNA_ASSET = 0xc0;
    const OP_DROP = 0x75;
    const OP_1 = 0x51;
    const OP_RESERVED = 0x50;
    /**
     * NIP-040 asset payload marker.
     *
     * Every transfer / new / owner / reissue payload opens with a 3-byte marker
     * followed by the type byte. The marker is consensus: blocks below the NIP-040
     * activation height of a network only accept `rvn` on new asset outputs and
     * blocks at or above it only accept `xna` (mainnet: not scheduled; testnet:
     * 303000; regtest: 1). This library does NOT know chain state and never
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
    function inferNetworkFromAddress(address) {
        const normalized = resolveAddressInput(address).toLowerCase();
        if (normalized.startsWith(PQ_MAINNET_HRP + '1'))
            return 'xna-pq';
        if (normalized.startsWith(PQ_TESTNET_HRP + '1'))
            return 'xna-pq-test';
        if (normalized.startsWith('n'))
            return 'xna';
        if (normalized.startsWith('t'))
            return 'xna-test';
        throw new Error(`Unsupported Neurai address: ${address}`);
    }

    function decodeAddress(address) {
        const normalized = resolveAddressInput(address);
        const lowered = normalized.toLowerCase();
        if (!normalized)
            throw new Error('Address is required');
        if (lowered.startsWith(PQ_MAINNET_HRP + '1') || lowered.startsWith(PQ_TESTNET_HRP + '1')) {
            const decoded = distExports.bech32m.decode(normalized);
            const version = decoded.words[0];
            const program = Uint8Array.from(distExports.bech32m.fromWords(decoded.words.slice(1)));
            if (version !== 1 || program.length !== 32) {
                throw new Error(`Unsupported AuthScript address program for ${address}`);
            }
            const network = lowered.startsWith(PQ_TESTNET_HRP + '1') ? 'xna-pq-test' : 'xna-pq';
            return { address: normalized, type: 'authscript', network, program, commitment: program };
        }
        const payload = Uint8Array.from(bs58check.decode(normalized));
        if (payload.length !== 21) {
            throw new Error(`Unsupported legacy address payload length for ${address}`);
        }
        const prefix = payload[0];
        if (prefix !== LEGACY_MAINNET_PREFIX && prefix !== LEGACY_TESTNET_PREFIX) {
            throw new Error(`Unsupported legacy address prefix ${prefix} for ${address}`);
        }
        return {
            address: normalized,
            type: 'p2pkh',
            network: inferNetworkFromAddress(normalized),
            program: payload.slice(1),
            hash: payload.slice(1)
        };
    }
    function encodeP2PKHScript(address) {
        const destination = decodeAddress(address);
        if (destination.type !== 'p2pkh') {
            throw new Error(`Address ${address} is not legacy P2PKH`);
        }
        return Uint8Array.of(0x76, 0xa9, 0x14, ...destination.hash, 0x88, 0xac);
    }
    function encodeAuthScriptDestinationScript(address) {
        const destination = decodeAddress(address);
        if (destination.type !== 'authscript') {
            throw new Error(`Address ${address} is not AuthScript witness v1`);
        }
        return concatBytes(Uint8Array.of(OP_1), pushData(destination.commitment));
    }
    function encodeDestinationScript(address) {
        const destination = decodeAddress(address);
        return destination.type === 'authscript'
            ? encodeAuthScriptDestinationScript(address)
            : encodeP2PKHScript(address);
    }
    function encodeNullAssetDestinationScript(address, mode = 'strict') {
        const destination = decodeAddress(address);
        if (destination.type === 'authscript') {
            if (mode === 'hash20') {
                throw new Error('hash20 null-asset mode is not supported for AuthScript destinations');
            }
            return concatBytes(Uint8Array.of(OP_XNA_ASSET, OP_1), pushData(destination.commitment));
        }
        return concatBytes(Uint8Array.of(OP_XNA_ASSET), pushData(destination.hash));
    }
    const encodePQWitnessScript = encodeAuthScriptDestinationScript;

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
        'xna-pq': 'mainnet',
        'xna-test': 'testnet',
        'xna-legacy-test': 'testnet',
        'xna-pq-test': 'testnet'
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
        return BigInt(Math.round(getBurnAmountXna(operation, multiplier) * 1e8));
    }
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
        return BigInt(Math.round(Number(amount || 0) * 1e8));
    }
    function assetUnitsToRaw(amount) {
        return xnaToSatoshis(amount);
    }
    function encodeAssetTransferPayload(assetName, amountRaw, message, expireTime, options) {
        const payload = [
            assetPayloadPrefix(options?.assetMarker, 'transfer'),
            serializeString(assetName),
            u64LE(amountRaw)
        ];
        const encodedMessage = encodeAssetDataReference(message);
        if (encodedMessage.length > 0) {
            payload.push(encodedMessage);
            if (expireTime !== undefined && BigInt(expireTime) !== 0n) {
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
     * `OP_1 0x20 <32-byte commitment>`. Consensus only recognises the asset
     * wrapper when OP_XNA_ASSET sits at byte 34 after this exact prefix.
     */
    function isAuthScriptScript(script) {
        return script.length === 34 && script[0] === 0x51 && script[1] === 0x20;
    }
    /**
     * Like `encodeAssetTransferScript` but takes a raw scriptPubKey instead of
     * deriving one from an address, for callers that already hold the
     * scriptPubKey bytes.
     *
     * The recipient script must be exactly P2PKH (25 bytes) or AuthScript
     * `OP_1 <32B>` (34 bytes): the node's OP_XNA_ASSET placement rules only
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
                'exactly P2PKH (25 bytes) or AuthScript OP_1 <32B> (34 bytes); ' +
                'commit the script into an AuthScript destination instead');
        }
        return concatBytes(spkBytes, Uint8Array.of(OP_XNA_ASSET), pushData(encodeAssetTransferPayload(assetName, amountRaw, message, expireTime, options)), Uint8Array.of(OP_DROP));
    }
    function encodeNewAssetPayload(assetName, quantityRaw, units = 0, reissuable = true, ipfsHash, options) {
        const encodedIpfs = encodeAssetDataReference(ipfsHash);
        return concatBytes(assetPayloadPrefix(options?.assetMarker, 'new'), serializeString(assetName), u64LE(quantityRaw), Uint8Array.of(units & 0xff, reissuable ? 1 : 0, encodedIpfs.length > 0 ? 1 : 0), encodedIpfs);
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
        return concatBytes(assetPayloadPrefix(options?.assetMarker, 'reissue'), serializeString(assetName), u64LE(quantityRaw), Uint8Array.of(reissueUnitsByte(units), reissuable ? 1 : 0), encodeAssetDataReference(ipfsHash));
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
            valueSats: typeof valueSats === 'bigint' ? valueSats : BigInt(valueSats),
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
        if (burnAddress && burnAmountSats !== undefined && BigInt(burnAmountSats) > 0n) {
            outputs.push(createXnaOutput(burnAddress, burnAmountSats));
        }
        if (changeAddress && changeSats !== undefined && BigInt(changeSats) > 0n) {
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
        if (BigInt(params.quantityRaw) <= 0n) {
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
            if (BigInt(transfer.amountRaw) <= 0n) {
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
        if (BigInt(params.amountRaw) <= 0n) {
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

    var NeuraiCreateTransaction = /*#__PURE__*/Object.freeze({
        __proto__: null,
        DEFAULT_ASSET_MARKER: DEFAULT_ASSET_MARKER,
        DEPIN_MAX_NAME_LENGTH: DEPIN_MAX_NAME_LENGTH,
        OWNER_ASSET_AMOUNT: OWNER_ASSET_AMOUNT,
        REGTEST_GLOBAL_BURN_ADDRESS: REGTEST_GLOBAL_BURN_ADDRESS,
        UNIQUE_ASSETS_REISSUABLE: UNIQUE_ASSETS_REISSUABLE,
        UNIQUE_ASSET_AMOUNT: UNIQUE_ASSET_AMOUNT,
        UNIQUE_ASSET_UNITS: UNIQUE_ASSET_UNITS,
        assertDepinAssetName: assertDepinAssetName,
        assertDepinNetwork: assertDepinNetwork,
        assetPayloadPrefix: assetPayloadPrefix,
        assetUnitsToRaw: assetUnitsToRaw,
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
        decodeAddress: decodeAddress,
        decodeAssetDataReferenceHex: decodeAssetDataReferenceHex,
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
        estimateTransactionSize: estimateTransactionSize,
        formatAssetDataReferenceHex: formatAssetDataReferenceHex,
        getBurnAddressForOperation: getBurnAddressForOperation,
        getBurnAmountSats: getBurnAmountSats,
        getBurnAmountXna: getBurnAmountXna,
        getOwnerTokenName: getOwnerTokenName,
        getParentAssetName: getParentAssetName,
        getUniqueAssetName: getUniqueAssetName,
        inferNetworkFromAnyAddress: inferNetworkFromAnyAddress,
        isCidV0AssetReference: isCidV0AssetReference,
        isDepinAssetName: isDepinAssetName,
        isEncodedAssetDataReferenceHex: isEncodedAssetDataReferenceHex,
        isRawAssetDataReferenceHex: isRawAssetDataReferenceHex,
        isTxidAssetReference: isTxidAssetReference,
        normalizeVerifierString: normalizeVerifierString,
        parseTransaction: parseTransaction,
        resolveAddressInput: resolveAddressInput,
        resolveAssetMarker: resolveAssetMarker,
        serializeInput: serializeInput,
        serializeOutput: serializeOutput,
        serializeTransaction: serializeTransaction,
        xnaToSatoshis: xnaToSatoshis
    });

    const globalTarget = globalThis;
    globalTarget.NeuraiCreateTransaction = NeuraiCreateTransaction;

    exports.NeuraiCreateTransaction = NeuraiCreateTransaction;

    return exports;

})({});
//# sourceMappingURL=NeuraiCreateTransaction.global.js.map
