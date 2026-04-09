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
    function isBytes(a) {
        return a instanceof Uint8Array || (ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array');
    }
    /** Asserts something is Uint8Array. */
    function abytes(b, ...lengths) {
        if (!isBytes(b))
            throw new Error('Uint8Array expected');
        if (lengths.length > 0 && !lengths.includes(b.length))
            throw new Error('Uint8Array expected of length ' + lengths + ', got length=' + b.length);
    }
    /** Asserts a hash instance has not been destroyed / finished */
    function aexists(instance, checkFinished = true) {
        if (instance.destroyed)
            throw new Error('Hash instance has been destroyed');
        if (checkFinished && instance.finished)
            throw new Error('Hash#digest() has already been called');
    }
    /** Asserts output is properly-sized byte array */
    function aoutput(out, instance) {
        abytes(out);
        const min = instance.outputLen;
        if (out.length < min) {
            throw new Error('digestInto() expects output buffer of length at least ' + min);
        }
    }
    /** Zeroize a byte array. Warning: JS provides no guarantees. */
    function clean(...arrays) {
        for (let i = 0; i < arrays.length; i++) {
            arrays[i].fill(0);
        }
    }
    /** Create DataView of an array for easy byte-level manipulation. */
    function createView(arr) {
        return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    }
    /** The rotate right (circular right shift) operation for uint32 */
    function rotr(word, shift) {
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
        abytes(data);
        return data;
    }
    /** For runtime check if class implements interface */
    class Hash {
    }
    /** Wraps hash function, creating an interface on top of it */
    function createHasher(hashCons) {
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
    function Chi(a, b, c) {
        return (a & b) ^ (~a & c);
    }
    /** Majority function, true if any two inputs is true. */
    function Maj(a, b, c) {
        return (a & b) ^ (a & c) ^ (b & c);
    }
    /**
     * Merkle-Damgard hash construction base class.
     * Could be used to create MD5, RIPEMD, SHA1, SHA2.
     */
    class HashMD extends Hash {
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
            this.view = createView(this.buffer);
        }
        update(data) {
            aexists(this);
            data = toBytes(data);
            abytes(data);
            const { view, buffer, blockLen } = this;
            const len = data.length;
            for (let pos = 0; pos < len;) {
                const take = Math.min(blockLen - this.pos, len - pos);
                // Fast path: we have at least one block in input, cast it to view and process
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
            // Note: sha512 requires length to be 128bit integer, but length in JS will overflow before that
            // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
            // So we just write lowest 64 bits of that value.
            setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
            this.process(view, 0);
            const oview = createView(out);
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
    }
    /**
     * Initial SHA-2 state: fractional parts of square roots of first 16 primes 2..53.
     * Check out `test/misc/sha2-gen-iv.js` for recomputation guide.
     */
    /** Initial SHA256 state. Bits 0..32 of frac part of sqrt of primes 2..19 */
    const SHA256_IV = /* @__PURE__ */ Uint32Array.from([
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
    /** Reusable temporary buffer. "W" comes straight from spec. */
    const SHA256_W = /* @__PURE__ */ new Uint32Array(64);
    class SHA256 extends HashMD {
        constructor(outputLen = 32) {
            super(64, outputLen, 8, false);
            // We cannot use array here since array allows indexing by variable
            // which means optimizer/compiler cannot use registers.
            this.A = SHA256_IV[0] | 0;
            this.B = SHA256_IV[1] | 0;
            this.C = SHA256_IV[2] | 0;
            this.D = SHA256_IV[3] | 0;
            this.E = SHA256_IV[4] | 0;
            this.F = SHA256_IV[5] | 0;
            this.G = SHA256_IV[6] | 0;
            this.H = SHA256_IV[7] | 0;
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
            this.set(0, 0, 0, 0, 0, 0, 0, 0);
            clean(this.buffer);
        }
    }
    /**
     * SHA2-256 hash function from RFC 4634.
     *
     * It is the fastest JS hash, even faster than Blake3.
     * To break sha256 using birthday attack, attackers need to try 2^128 hashes.
     * BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per 2025.
     */
    const sha256$1 = /* @__PURE__ */ createHasher(() => new SHA256());

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
    const sha256 = sha256$1;

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
        return sha256(sha256(buffer));
    }
    var bs58check = bs58checkBase(sha256x2);

    const LEGACY_MAINNET_PREFIX = 53;
    const LEGACY_TESTNET_PREFIX = 127;
    const PQ_MAINNET_HRP = 'nq';
    const PQ_TESTNET_HRP = 'tnq';
    const OP_XNA_ASSET = 0xc0;
    const OP_DROP = 0x75;
    const OP_1 = 0x51;
    const OP_RESERVED = 0x50;
    const XNA_TRANSFER_PREFIX = new Uint8Array([
        0x72, 0x76, 0x6e, 0x74
    ]);
    const XNA_ISSUE_PREFIX = new Uint8Array([
        0x72, 0x76, 0x6e, 0x71
    ]);
    const XNA_OWNER_PREFIX = new Uint8Array([
        0x72, 0x76, 0x6e, 0x6f
    ]);
    const XNA_REISSUE_PREFIX = new Uint8Array([
        0x72, 0x76, 0x6e, 0x72
    ]);
    function inferNetworkFromAddress(address) {
        const normalized = String(address || '').trim().toLowerCase();
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
        const normalized = String(address || '').trim();
        if (!normalized)
            throw new Error('Address is required');
        if (normalized.startsWith(PQ_MAINNET_HRP + '1') || normalized.startsWith(PQ_TESTNET_HRP + '1')) {
            const decoded = distExports.bech32m.decode(normalized);
            const version = decoded.words[0];
            const program = Uint8Array.from(distExports.bech32m.fromWords(decoded.words.slice(1)));
            if (version !== 1 || program.length !== 20) {
                throw new Error(`Unsupported PQ address program for ${address}`);
            }
            const network = normalized.startsWith(PQ_TESTNET_HRP + '1') ? 'xna-pq-test' : 'xna-pq';
            return { address: normalized, type: 'pq', network, hash: program };
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
    function encodePQWitnessScript(address) {
        const destination = decodeAddress(address);
        if (destination.type !== 'pq') {
            throw new Error(`Address ${address} is not PQ witness v1`);
        }
        return concatBytes(Uint8Array.of(OP_1), pushData(destination.hash));
    }
    function encodeDestinationScript(address) {
        const destination = decodeAddress(address);
        return destination.type === 'pq'
            ? encodePQWitnessScript(address)
            : encodeP2PKHScript(address);
    }
    function encodeNullAssetDestinationScript(address, mode = 'strict') {
        const destination = decodeAddress(address);
        if (destination.type === 'pq') {
            if (mode === 'hash20') {
                return concatBytes(Uint8Array.of(OP_XNA_ASSET), pushData(destination.hash));
            }
            return concatBytes(Uint8Array.of(OP_XNA_ASSET, OP_1), pushData(destination.hash));
        }
        return concatBytes(Uint8Array.of(OP_XNA_ASSET), pushData(destination.hash));
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
    function resolveNetworkFamily(network) {
        return network === 'xna' || network === 'xna-pq' ? 'mainnet' : 'testnet';
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
        const slashIndex = assetName.indexOf('/');
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
    function isDepinAssetName(assetName) {
        const normalized = String(assetName || '').trim();
        return /^&[A-Z0-9._]{3,}$/.test(normalized) || /^&[A-Z0-9._]+\/[A-Z0-9._/]+$/.test(normalized);
    }
    function assertDepinAssetName(assetName) {
        if (!isDepinAssetName(assetName)) {
            throw new Error(`Invalid DEPIN asset name: ${assetName}`);
        }
    }

    function xnaToSatoshis(amount) {
        return BigInt(Math.round(Number(amount || 0) * 1e8));
    }
    function assetUnitsToRaw(amount) {
        return xnaToSatoshis(amount);
    }
    function encodeAssetTransferPayload(assetName, amountRaw, message, expireTime) {
        const payload = [
            XNA_TRANSFER_PREFIX,
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
    function encodeAssetTransferScript(address, assetName, amountRaw, message, expireTime) {
        return concatBytes(encodeDestinationScript(address), Uint8Array.of(OP_XNA_ASSET), pushData(encodeAssetTransferPayload(assetName, amountRaw, message, expireTime)), Uint8Array.of(OP_DROP));
    }
    function encodeNewAssetPayload(assetName, quantityRaw, units = 0, reissuable = true, ipfsHash) {
        const encodedIpfs = encodeAssetDataReference(ipfsHash);
        return concatBytes(XNA_ISSUE_PREFIX, serializeString(assetName), u64LE(quantityRaw), Uint8Array.of(units & 0xff, reissuable ? 1 : 0, encodedIpfs.length > 0 ? 1 : 0), encodedIpfs);
    }
    function encodeNewAssetScript(address, assetName, quantityRaw, units = 0, reissuable = true, ipfsHash) {
        return concatBytes(encodeDestinationScript(address), Uint8Array.of(OP_XNA_ASSET), pushData(encodeNewAssetPayload(assetName, quantityRaw, units, reissuable, ipfsHash)), Uint8Array.of(OP_DROP));
    }
    function encodeOwnerAssetPayload(ownerTokenName) {
        return concatBytes(XNA_OWNER_PREFIX, serializeString(ownerTokenName));
    }
    function encodeOwnerAssetScript(address, ownerTokenName) {
        return concatBytes(encodeDestinationScript(address), Uint8Array.of(OP_XNA_ASSET), pushData(encodeOwnerAssetPayload(ownerTokenName)), Uint8Array.of(OP_DROP));
    }
    function encodeReissueAssetPayload(assetName, quantityRaw, units = 0, reissuable = true, ipfsHash) {
        return concatBytes(XNA_REISSUE_PREFIX, serializeString(assetName), u64LE(quantityRaw), Uint8Array.of(units & 0xff, reissuable ? 1 : 0), encodeAssetDataReference(ipfsHash));
    }
    function encodeReissueAssetScript(address, assetName, quantityRaw, units = 0, reissuable = true, ipfsHash) {
        return concatBytes(encodeDestinationScript(address), Uint8Array.of(OP_XNA_ASSET), pushData(encodeReissueAssetPayload(assetName, quantityRaw, units, reissuable, ipfsHash)), Uint8Array.of(OP_DROP));
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
    function createAssetTransferOutput(address, assetName, amountRaw) {
        return {
            valueSats: 0n,
            scriptPubKeyHex: bytesToHex(encodeAssetTransferScript(address, assetName, amountRaw))
        };
    }
    function createTransferWithMessageOutput(params) {
        return {
            valueSats: 0n,
            scriptPubKeyHex: bytesToHex(encodeAssetTransferScript(params.address, params.assetName, params.amountRaw, params.message, params.expireTime))
        };
    }
    function createOwnerAssetIssueOutput(address, ownerTokenName) {
        return {
            valueSats: 0n,
            scriptPubKeyHex: bytesToHex(encodeOwnerAssetScript(address, ownerTokenName))
        };
    }
    function createOwnerAssetTransferOutput(address, ownerTokenName) {
        return {
            valueSats: 0n,
            scriptPubKeyHex: bytesToHex(encodeAssetTransferScript(address, ownerTokenName, OWNER_ASSET_AMOUNT))
        };
    }
    function createIssueAssetOutput(params) {
        return {
            valueSats: 0n,
            scriptPubKeyHex: bytesToHex(encodeNewAssetScript(params.address, params.assetName, params.quantityRaw, params.units ?? 0, params.reissuable ?? true, params.ipfsHash))
        };
    }
    function createReissueAssetOutput(params) {
        return {
            valueSats: 0n,
            scriptPubKeyHex: bytesToHex(encodeReissueAssetScript(params.address, params.assetName, params.quantityRaw, params.units ?? 0, params.reissuable ?? true, params.ipfsHash))
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
        return createAssetTransferOutput(params.address, params.assetName, params.amountRaw);
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
    function freezeFlagFromOperation(operation) {
        return operation === 'freeze' ? 1 : 0;
    }
    function createPaymentTransaction(params) {
        const outputs = [
            ...params.payments.map((payment) => createXnaOutput(payment.address, payment.valueSats)),
            ...(params.extraOutputs ?? [])
        ];
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createStandardAssetTransferTransaction(params) {
        const outputs = [];
        for (const payment of params.payments ?? []) {
            outputs.push(createXnaOutput(payment.address, payment.valueSats));
        }
        for (const transfer of params.transfers ?? []) {
            outputs.push(createTransferOutput(transfer));
        }
        for (const transfer of params.transferMessages ?? []) {
            outputs.push(createTransferWithMessageOutput(transfer));
        }
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createIssueAssetTransaction(params) {
        const outputs = [];
        appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
        if (params.includeOwnerOutput ?? true) {
            outputs.push(createOwnerAssetIssueOutput(params.ownerTokenAddress ?? params.toAddress, params.ownerTokenName ?? getOwnerTokenName(params.assetName)));
        }
        outputs.push(createIssueAssetOutput({
            address: params.toAddress,
            assetName: params.assetName,
            quantityRaw: params.quantityRaw,
            units: params.units ?? 0,
            reissuable: params.reissuable ?? true,
            ipfsHash: params.ipfsHash
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
        outputs.push(createOwnerAssetTransferOutput(params.parentOwnerAddress ?? params.xnaChangeAddress ?? params.toAddress, getOwnerTokenName(parentAssetName)));
        outputs.push(createOwnerAssetIssueOutput(params.ownerTokenAddress ?? params.toAddress, getOwnerTokenName(params.assetName)));
        outputs.push(createIssueAssetOutput({
            address: params.toAddress,
            assetName: params.assetName,
            quantityRaw: params.quantityRaw,
            units: params.units ?? 0,
            reissuable: params.reissuable ?? true,
            ipfsHash: params.ipfsHash
        }));
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createIssueDepinTransaction(params) {
        assertDepinAssetName(params.assetName);
        if (params.reissuable !== undefined && typeof params.reissuable !== 'boolean') {
            throw new Error('DEPIN reissuable must be boolean when provided');
        }
        return createIssueAssetTransaction({
            ...params,
            units: 0,
            includeOwnerOutput: true,
            ownerTokenAddress: params.ownerTokenAddress ?? params.toAddress,
            reissuable: params.reissuable ?? true
        });
    }
    function createIssueUniqueAssetTransaction(params) {
        const outputs = [];
        appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
        outputs.push(createOwnerAssetTransferOutput(params.ownerTokenAddress ?? params.toAddress, getOwnerTokenName(params.rootName)));
        for (let index = 0; index < params.assetTags.length; index += 1) {
            outputs.push(createIssueAssetOutput({
                address: params.toAddress,
                assetName: getUniqueAssetName(params.rootName, params.assetTags[index]),
                quantityRaw: UNIQUE_ASSET_AMOUNT,
                units: UNIQUE_ASSET_UNITS,
                reissuable: UNIQUE_ASSETS_REISSUABLE,
                ipfsHash: params.ipfsHashes?.[index]
            }));
        }
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createIssueQualifierTransaction(params) {
        const outputs = [];
        appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
        const parentQualifier = getParentAssetName(params.assetName);
        if (parentQualifier) {
            outputs.push(createAssetTransferOutput(params.rootChangeAddress ?? params.xnaChangeAddress ?? params.toAddress, parentQualifier, params.changeQuantityRaw ?? OWNER_ASSET_AMOUNT));
        }
        outputs.push(createIssueAssetOutput({
            address: params.toAddress,
            assetName: params.assetName,
            quantityRaw: params.quantityRaw,
            units: 0,
            reissuable: false,
            ipfsHash: params.ipfsHash
        }));
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createIssueRestrictedTransaction(params) {
        const outputs = [];
        appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
        outputs.push(createVerifierStringOutput(normalizeVerifierString(params.verifierString)));
        outputs.push(createOwnerAssetTransferOutput(params.ownerChangeAddress ?? params.toAddress, getOwnerTokenName(params.assetName)));
        outputs.push(createIssueAssetOutput({
            address: params.toAddress,
            assetName: params.assetName,
            quantityRaw: params.quantityRaw,
            units: params.units ?? 0,
            reissuable: params.reissuable ?? true,
            ipfsHash: params.ipfsHash
        }));
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createReissueTransaction(params) {
        const outputs = [];
        appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
        outputs.push(createOwnerAssetTransferOutput(params.ownerChangeAddress ?? params.toAddress, getOwnerTokenName(params.assetName)));
        outputs.push(createReissueAssetOutput({
            address: params.toAddress,
            assetName: params.assetName,
            quantityRaw: params.quantityRaw,
            units: params.units ?? 0,
            reissuable: params.reissuable ?? true,
            ipfsHash: params.ipfsHash
        }));
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createReissueRestrictedTransaction(params) {
        const outputs = [];
        appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
        if (params.verifierString) {
            outputs.push(createVerifierStringOutput(normalizeVerifierString(params.verifierString)));
        }
        outputs.push(createOwnerAssetTransferOutput(params.ownerChangeAddress ?? params.toAddress, getOwnerTokenName(params.assetName)));
        outputs.push(createReissueAssetOutput({
            address: params.toAddress,
            assetName: params.assetName,
            quantityRaw: params.quantityRaw,
            units: params.units ?? 0,
            reissuable: params.reissuable ?? true,
            ipfsHash: params.ipfsHash
        }));
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createQualifierTagTransaction(params) {
        const outputs = [];
        appendXnaEnvelope(outputs, params.burnAddress, params.burnAmountSats, params.xnaChangeAddress, params.xnaChangeSats);
        outputs.push(createAssetTransferOutput(params.qualifierChangeAddress, params.qualifierName, params.qualifierChangeAmountRaw));
        for (const address of params.targetAddresses) {
            outputs.push(createNullAssetTagOutput(address, params.qualifierName, params.operation, params.nullAssetDestinationMode ?? 'strict'));
        }
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createFreezeAddressesTransaction(params) {
        const outputs = [];
        appendXnaEnvelope(outputs, undefined, undefined, params.xnaChangeAddress, params.xnaChangeSats);
        outputs.push(createOwnerAssetTransferOutput(params.ownerChangeAddress, getOwnerTokenName(params.assetName)));
        for (const address of params.targetAddresses) {
            outputs.push(createNullAssetRestrictionOutput(address, params.assetName, freezeFlagFromOperation(params.operation), params.nullAssetDestinationMode ?? 'strict'));
        }
        return buildTransaction(params.version, params.locktime, params.inputs, outputs);
    }
    function createFreezeAssetTransaction(params) {
        const outputs = [];
        appendXnaEnvelope(outputs, undefined, undefined, params.xnaChangeAddress, params.xnaChangeSats);
        outputs.push(createOwnerAssetTransferOutput(params.ownerChangeAddress, getOwnerTokenName(params.assetName)));
        outputs.push(createGlobalRestrictionOutput(params.assetName, freezeFlagFromOperation(params.operation) + 2));
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

    var NeuraiCreateTransaction = /*#__PURE__*/Object.freeze({
        __proto__: null,
        OWNER_ASSET_AMOUNT: OWNER_ASSET_AMOUNT,
        UNIQUE_ASSETS_REISSUABLE: UNIQUE_ASSETS_REISSUABLE,
        UNIQUE_ASSET_AMOUNT: UNIQUE_ASSET_AMOUNT,
        UNIQUE_ASSET_UNITS: UNIQUE_ASSET_UNITS,
        assertDepinAssetName: assertDepinAssetName,
        assetUnitsToRaw: assetUnitsToRaw,
        createAssetTransferOutput: createAssetTransferOutput,
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
        serializeInput: serializeInput,
        serializeOutput: serializeOutput,
        xnaToSatoshis: xnaToSatoshis
    });

    const globalTarget = globalThis;
    globalTarget.NeuraiCreateTransaction = NeuraiCreateTransaction;

    exports.NeuraiCreateTransaction = NeuraiCreateTransaction;

    return exports;

})({});
//# sourceMappingURL=NeuraiCreateTransaction.global.js.map
