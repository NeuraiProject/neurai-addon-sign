var NeuraiKeyBundle = (function () {
    'use strict';

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
    function isBytes$3(a) {
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
    // Shared error-message prefix builder. Only called on throw paths, so assert
    // success paths never pay for the string concatenation.
    const atitle$1 = (title) => (title ? `"${title}" ` : '');
    /**
     * Asserts something is a non-negative integer.
     * @param n - number to validate
     * @param title - label included in thrown errors
     * @returns The validated number.
     * @throws On wrong argument types. {@link TypeError}
     * @throws On wrong argument ranges or values. {@link RangeError}
     * @example
     * Validate a non-negative integer option.
     * ```ts
     * anumber(32, 'length');
     * ```
     */
    function anumber$2(n, title = '') {
        if (typeof n !== 'number')
            throw new TypeError(atitle$1(title) + 'expected number, got ' + typeof n);
        if (!Number.isSafeInteger(n) || n < 0)
            throw new RangeError(atitle$1(title) + 'expected integer >= 0, got ' + n);
        return n;
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
    function abytes$3(value, length, title = '') {
        // Success path first: this runs at the start of every update() / digestInto(), and the
        // common `abytes(data)` form must not pay for length handling it does not use.
        if (isBytes$3(value) && (length === undefined || value.length === length))
            return value;
        // Error path: recompute freely to build the exact message.
        if (length !== undefined)
            anumber$2(length, 'length');
        const bytes = isBytes$3(value);
        const ofLen = length !== undefined ? ` of length ${length}` : '';
        const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
        const message = atitle$1(title) + 'expected Uint8Array' + ofLen + ', got ' + got;
        if (!bytes)
            throw new TypeError(message);
        throw new RangeError(message);
    }
    /**
     * Asserts something is a wrapped hash constructor.
     * @param h - hash constructor to validate
     * @throws On wrong argument types or invalid hash wrapper shape. {@link TypeError}
     * @throws On invalid hash metadata ranges or values. {@link RangeError}
     * @throws If the hash metadata allows empty outputs or block sizes. {@link Error}
     * @example
     * Validate a callable hash wrapper.
     * ```ts
     * import { ahash } from '@noble/hashes/utils.js';
     * import { sha256 } from '@noble/hashes/sha2.js';
     * ahash(sha256);
     * ```
     */
    function ahash(h) {
        if (typeof h !== 'function' || typeof h.create !== 'function')
            throw new TypeError('expected hash wrapped by utils.createHasher');
        anumber$2(h.outputLen);
        anumber$2(h.blockLen);
        // HMAC and KDF callers treat these as real byte lengths; allowing zero lets fake wrappers pass
        // validation and can produce empty outputs instead of failing fast.
        if (h.outputLen < 1 || h.blockLen < 1)
            throw new Error('hash blockLen / outputLen must be >= 1');
    }
    const aobject$1 = (value, label) => {
        if (value === null || typeof value !== 'object' || Array.isArray(value))
            throw new TypeError((label === 'object' ? '' : `"${label}" `) + 'expected object, got type=' + typeof value);
    };
    const aopts = (value, label) => {
        aobject$1(value, label);
        const proto = Object.getPrototypeOf(value);
        if (proto !== Object.prototype && proto !== null)
            throw new TypeError(`"${label}" expected plain object`);
        // Object.assign() treats an own "__proto__" source key as a write to the target's legacy
        // prototype setter. Reject it before merging so inherited option values cannot be injected.
        if (Object.hasOwn(value, '__proto__'))
            throw new TypeError(`"${label}.__proto__" is not allowed`);
    };
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
    function aexists$1(instance, checkFinished = true) {
        // Runs on every update()/digestInto(); the flags are library-owned booleans, so only their
        // truthiness is checked - re-validating their type per call was pure hot-path overhead.
        if (instance.destroyed)
            throw new Error('hash was destroyed');
        if (checkFinished && instance.finished)
            throw new Error('digest() was already called');
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
    function aoutput$1(out, instance) {
        abytes$3(out, undefined, 'output');
        // `outputLen` is a library-owned readonly number; the negated comparison keeps failing fast
        // when it is missing/NaN (comparisons with undefined/NaN are false) without an anumber() call.
        const min = instance.outputLen;
        if (!(out.length >= min)) {
            throw new RangeError('"output" expected length >= ' + min);
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
    function clean$1(...arrays) {
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
    // Built-in hex conversion https://caniuse.com/mdn-javascript_builtins_uint8array_fromhex
    const hasHexBuiltin = /* @__PURE__ */ (() => 
    // @ts-ignore
    typeof Uint8Array.from([]).toHex === 'function' && typeof Uint8Array.fromHex === 'function')();
    // Array where index 0xf0 (240) is mapped to string 'f0'
    const hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));
    /**
     * Convert byte array to hex string.
     * Uses the built-in function when available and assumes it matches the tested
     * fallback semantics.
     * @param bytes - bytes to encode
     * @returns Lowercase hexadecimal string.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Convert bytes to lowercase hexadecimal.
     * ```ts
     * bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])); // 'cafe0123'
     * ```
     */
    function bytesToHex$2(bytes) {
        abytes$3(bytes);
        // @ts-ignore
        if (hasHexBuiltin)
            return bytes.toHex();
        // pre-caching improves the speed 6x
        let hex = '';
        for (let i = 0; i < bytes.length; i++) {
            hex += hexes[bytes[i]];
        }
        return hex;
    }
    // Strict ASCII nibble parser: non-ASCII hex lookalikes are rejected as undefined.
    // ASCII codes: '0'..'9' = 48..57, 'A'..'F' = 65..70, 'a'..'f' = 97..102.
    // prettier-ignore
    function asciiToBase16(ch) {
        return ch >= 48 && ch <= 57 ? ch - 48 // '2' => 50-48
            : ch >= 65 && ch <= 70 ? ch - (65 - 10) // 'B' => 66-(65-10)
                : ch >= 97 && ch <= 102 ? ch - (97 - 10) // 'b' => 98-(97-10)
                    : undefined;
    }
    /**
     * Convert hex string to byte array. Uses built-in function, when available.
     * @param hex - hexadecimal string to decode
     * @returns Decoded bytes.
     * @throws On wrong argument types. {@link TypeError}
     * @throws On wrong argument ranges or values. {@link RangeError}
     * @example
     * Decode lowercase hexadecimal into bytes.
     * ```ts
     * hexToBytes('cafe0123'); // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
     * ```
     */
    function hexToBytes$2(hex) {
        if (typeof hex !== 'string')
            throw new TypeError('hex string expected, got ' + typeof hex);
        if (hasHexBuiltin) {
            try {
                return Uint8Array.fromHex(hex);
            }
            catch (error) {
                if (error instanceof SyntaxError)
                    throw new RangeError(error.message);
                throw error;
            }
        }
        const hl = hex.length;
        const al = hl / 2;
        if (hl % 2)
            throw new RangeError('hex string expected, got unpadded hex of length ' + hl);
        const array = new Uint8Array(al);
        for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
            const n1 = asciiToBase16(hex.charCodeAt(hi)); // parse first char, multiply it by 16
            const n2 = asciiToBase16(hex.charCodeAt(hi + 1)); // parse second char
            if (n1 === undefined || n2 === undefined) {
                const char = hex[hi] + hex[hi + 1];
                throw new RangeError('hex string expected, got non-hex character "' + char + '" at index ' + hi);
            }
            array[ai] = n1 * 16 + n2; // example: 'A9' => 10*16 + 9
        }
        return array;
    }
    /**
     * Converts string to bytes using UTF8 encoding.
     * Built-in doesn't validate input to be string: we do the check.
     * Non-ASCII details are delegated to the platform `TextEncoder`.
     * @param str - string to encode
     * @returns UTF-8 encoded bytes.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Encode a string as UTF-8 bytes.
     * ```ts
     * utf8ToBytes('abc'); // Uint8Array.from([97, 98, 99])
     * ```
     */
    function utf8ToBytes(str) {
        if (typeof str !== 'string')
            throw new TypeError('string expected');
        const encoded = new TextEncoder().encode(str);
        try {
            // Copy into the current realm for Firefox extension contexts. Callers that own the returned
            // buffer can then wipe it independently of TextEncoder's temporary result.
            return new Uint8Array(encoded); // https://bugzil.la/1681809
        }
        finally {
            clean$1(encoded);
        }
    }
    /**
     * Helper for KDFs: consumes Uint8Array or string.
     * String inputs are UTF-8 encoded; byte-array inputs stay aliased to the caller buffer.
     * @param data - user-provided KDF input
     * @param errorTitle - label included in thrown errors
     * @returns Byte representation of the input.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Normalize KDF input to bytes.
     * ```ts
     * kdfInputToBytes('password');
     * ```
     */
    function kdfInputToBytes(data, errorTitle = '') {
        if (typeof data === 'string')
            return utf8ToBytes(data);
        return abytes$3(data, undefined, errorTitle);
    }
    /**
     * Copies several Uint8Arrays into one.
     * @param arrays - arrays to concatenate
     * @returns Concatenated byte array.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Concatenate multiple byte arrays.
     * ```ts
     * concatBytes(new Uint8Array([1]), new Uint8Array([2]));
     * ```
     */
    function concatBytes$3(...arrays) {
        let sum = 0;
        for (let i = 0; i < arrays.length; i++) {
            const a = arrays[i];
            abytes$3(a);
            sum += a.length;
        }
        const res = new Uint8Array(sum);
        for (let i = 0, pad = 0; i < arrays.length; i++) {
            const a = arrays[i];
            res.set(a, pad);
            pad += a.length;
        }
        return res;
    }
    /**
     * Merges default options and passed options.
     * @param defaults - base option object
     * @param opts - user overrides
     * @param title - label included in thrown override errors
     * @returns Fresh merged option object with a null prototype.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Merge user overrides onto default options.
     * ```ts
     * checkOpts({ dkLen: 32 }, { asyncTick: 10 });
     * ```
     */
    function checkOpts(defaults, opts, title = 'opts') {
        aopts(defaults, 'defaults');
        if (opts !== undefined)
            aopts(opts, title);
        // Callers read optional fields directly, so omitted values must not fall through to ambient
        // Object.prototype pollution (for example a forged `dkLen` changing SHAKE's default output).
        const merged = Object.assign(Object.create(null), defaults, opts);
        return merged;
    }
    /**
     * Creates a callable hash function from a stateful class constructor.
     * @param hashCons - hash constructor or factory
     * @param info - optional metadata such as DER OID
     * @returns Frozen callable hash wrapper with `.create()`.
     *   Wrapper construction eagerly calls `hashCons(undefined)` once to read
     *   `outputLen` / `blockLen`, so constructor side effects happen at module
     *   init time.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Wrap a stateful hash constructor into a callable helper.
     * ```ts
     * import { createHasher } from '@noble/hashes/utils.js';
     * import { sha256 } from '@noble/hashes/sha2.js';
     * const wrapped = createHasher(sha256.create, { oid: sha256.oid });
     * wrapped(new Uint8Array([1]));
     * ```
     */
    function createHasher$1(hashCons, info = {}) {
        if (typeof hashCons !== 'function')
            throw new TypeError('"hashCons" expected function, got type=' + typeof hashCons);
        info = checkOpts({}, info, 'info');
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
     * Cryptographically secure PRNG backed by `crypto.getRandomValues`.
     * @param bytesLength - number of random bytes to generate
     * @returns Random bytes.
     * The platform `getRandomValues()` implementation still defines any
     * single-call length cap, and this helper rejects oversize requests
     * with a stable library `RangeError` instead of host-specific errors.
     * @throws On wrong argument types. {@link TypeError}
     * @throws On wrong argument ranges or values. {@link RangeError}
     * @throws If the current runtime does not provide `crypto.getRandomValues`. {@link Error}
     * @example
     * Generate a fresh random key or nonce.
     * ```ts
     * const key = randomBytes(16);
     * ```
     */
    function randomBytes$3(bytesLength = 32) {
        // Match the repo's other length-taking helpers instead of relying on Uint8Array coercion.
        anumber$2(bytesLength, 'bytesLength');
        const cr = typeof globalThis === 'object' ? globalThis.crypto : null;
        if (typeof cr?.getRandomValues !== 'function')
            throw new Error('crypto.getRandomValues must be defined');
        // Web Cryptography API Level 2 §10.1.1:
        // if `byteLength > 65536`, throw `QuotaExceededError`.
        // Keep the guard explicit so callers can see the quota in code
        // instead of discovering it by reading the spec or host errors.
        // This wrapper surfaces the same quota as a stable library RangeError.
        if (bytesLength > 65536)
            throw new RangeError(`"bytesLength" expected <= 65536, got ${bytesLength}`);
        return cr.getRandomValues(new Uint8Array(bytesLength));
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
    const oidNist$1 = (suffix) => ({
        // Current NIST hashAlgs suffixes used here fit in one DER subidentifier octet.
        // Larger suffix values would need base-128 OID encoding and a different length byte.
        oid: Uint8Array.from([0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, suffix]),
    });

    /**
     * HMAC: RFC2104 message authentication code.
     * @module
     */
    /**
     * Internal class for HMAC.
     * Accepts any byte key, although RFC 2104 §3 recommends keys at least
     * `HashLen` bytes long.
     */
    class _HMAC {
        oHash;
        iHash;
        blockLen;
        outputLen;
        canXOF = false;
        finished = false;
        destroyed = false;
        constructor(hash, key) {
            ahash(hash);
            abytes$3(key, undefined, 'key');
            this.iHash = hash.create();
            if (typeof this.iHash.update !== 'function')
                throw new Error('expected Hash instance');
            this.blockLen = this.iHash.blockLen;
            this.outputLen = this.iHash.outputLen;
            const blockLen = this.blockLen;
            const pad = new Uint8Array(blockLen);
            // blockLen can be bigger than outputLen
            pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
            for (let i = 0; i < pad.length; i++)
                pad[i] ^= 0x36;
            this.iHash.update(pad);
            // By doing update (processing of the first block) of the outer hash here,
            // we can re-use it between multiple calls via clone.
            this.oHash = hash.create();
            // Undo internal XOR && apply outer XOR
            for (let i = 0; i < pad.length; i++)
                pad[i] ^= 0x36 ^ 0x5c;
            this.oHash.update(pad);
            clean$1(pad);
        }
        update(buf) {
            aexists$1(this);
            this.iHash.update(buf);
            return this;
        }
        digestInto(out) {
            aexists$1(this);
            aoutput$1(out, this);
            this.finished = true;
            const buf = out.subarray(0, this.outputLen);
            // Reuse the first outputLen bytes for the inner digest; the outer hash consumes them before
            // overwriting that same prefix with the final tag, leaving any oversized tail untouched.
            this.iHash.digestInto(buf);
            this.oHash.update(buf);
            this.oHash.digestInto(buf);
            this.destroy();
        }
        digest() {
            const out = new Uint8Array(this.oHash.outputLen);
            this.digestInto(out);
            return out;
        }
        _cloneInto(to) {
            // Create new instance without calling constructor since the key
            // is already in state and we don't know it.
            to ||= Object.create(Object.getPrototypeOf(this), {});
            const { oHash, iHash, finished, destroyed, blockLen, outputLen, canXOF } = this;
            to = to;
            to.finished = finished;
            to.destroyed = destroyed;
            to.blockLen = blockLen;
            to.outputLen = outputLen;
            to.canXOF = canXOF;
            to.oHash = oHash._cloneInto(to.oHash);
            to.iHash = iHash._cloneInto(to.iHash);
            return to;
        }
        clone() {
            return this._cloneInto();
        }
        destroy() {
            this.destroyed = true;
            this.oHash.destroy();
            this.iHash.destroy();
        }
    }
    const hmac = /* @__PURE__ */ (() => {
        const hmac_ = ((hash, key, message) => new _HMAC(hash, key).update(message).digest());
        hmac_.create = (hash, key) => new _HMAC(hash, key);
        return hmac_;
    })();

    /**
     * PBKDF (RFC 2898). Can be used to create a key from password and salt.
     * @module
     */
    // Common validation and per-call state setup for sync/async functions.
    function pbkdf2Init(hash, _password, _salt, _opts) {
        ahash(hash);
        const opts = checkOpts({ dkLen: 32, asyncTick: 10 }, _opts);
        const { c, dkLen, asyncTick } = opts;
        anumber$2(c, 'c');
        anumber$2(dkLen, 'dkLen');
        anumber$2(asyncTick, 'asyncTick');
        if (c < 1)
            throw new Error('"c" (iterations) must be >= 1');
        // RFC 8018 §5.2 defines `dkLen` as "a positive integer".
        if (dkLen < 1)
            throw new Error('"dkLen" must be >= 1');
        // RFC 8018 §5.2 step 1 requires rejecting oversize `dkLen`
        // before allocating the destination buffer.
        if (dkLen > (2 ** 32 - 1) * hash.outputLen)
            throw new Error('derived key too long');
        const p = kdfInputToBytes(_password, 'password');
        try {
            const s = kdfInputToBytes(_salt, 'salt');
            try {
                // DK = PBKDF2(PRF, Password, Salt, c, dkLen);
                const DK = new Uint8Array(dkLen);
                const { iHash, oHash, outputLen } = hmac.create(hash, p);
                // Drive keyed hashes directly; the wrapper is only needed to initialize their HMAC midstates.
                const u = new Uint8Array(outputLen);
                const eng = pbkdf2Engine(iHash, oHash, s, u);
                return { c, dkLen, asyncTick, DK, outputLen, eng };
            }
            finally {
                // Uint8Array inputs belong to the caller; only wipe our UTF-8 conversion.
                if (typeof _salt === 'string')
                    clean$1(s);
            }
        }
        finally {
            if (typeof _password === 'string')
                clean$1(p);
        }
    }
    // Per-call PRF driver writes U1 into both `u` and `Ti`, then later digests into `u`;
    // shared by the sync and async variants.
    function pbkdf2Engine(iHash, oHash, salt, u) {
        const counter = new Uint8Array(4);
        const view = createView(counter);
        // Full clones retain tree/config state; absorb salt before async yields without cloning input.
        const salted = iHash._cloneInto().update(salt);
        // u1() overwrites the worker before reading it. Seed from the outer midstate so a long salt
        // cannot pre-populate a tree stack that the first reset would abandon without wiping.
        const work = oHash._cloneInto();
        const iClone = iHash._cloneInto; // Capture before mixed feedback can materialize state tuples.
        const oClone = oHash._cloneInto;
        return {
            u1: (ti, Ti) => {
                view.setInt32(0, ti, false);
                salted._cloneInto(work).update(counter).digestInto(u);
                oHash._cloneInto(work).update(u).digestInto(u);
                Ti.set(u.subarray(0, Ti.length));
            },
            // Whole `F` inner loop for the sync variant: one optimized function owns the hot loop.
            rounds: (c, Ti) => {
                for (let ui = 1; ui < c; ui++) {
                    iClone.call(iHash, work).update(u).digestInto(u);
                    oClone.call(oHash, work).update(u).digestInto(u);
                    for (let i = 0; i < Ti.length; i++)
                        Ti[i] ^= u[i];
                }
            },
            output: (DK) => {
                // Keyed templates and derived worker states are secret material.
                iHash.destroy();
                oHash.destroy();
                salted.destroy();
                work.destroy();
                // Shared sync/async cleanup point: wipe transient PRF state
                // while preserving the derived key buffer.
                clean$1(u);
                return DK;
            },
        };
    }
    /**
     * PBKDF2-HMAC: RFC 8018 key derivation function.
     * @param hash - hash function that would be used e.g. sha256
     * @param password - password from which a derived key is generated;
     *   JS string inputs are UTF-8 encoded first
     * @param salt - cryptographic salt; JS string inputs are UTF-8 encoded first
     * @param opts - PBKDF2 work factor and output settings. `dkLen`, if provided,
     *   must be `>= 1` per RFC 8018 §5.2. See {@link Pbkdf2Opt}.
     * @returns Derived key bytes.
     * @throws If the PBKDF2 iteration count or derived-key settings are invalid. {@link Error}
     * @example
     * PBKDF2-HMAC: RFC 2898 key derivation function.
     * ```ts
     * import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
     * import { sha256 } from '@noble/hashes/sha2.js';
     * const key = pbkdf2(sha256, 'password', 'salt', { dkLen: 32, c: Math.pow(2, 18) });
     * ```
     */
    function pbkdf2(hash, password, salt, opts) {
        const { c, dkLen, DK, outputLen, eng } = pbkdf2Init(hash, password, salt, opts);
        // DK = T1 + T2 + ⋯ + Tdklen/hlen
        for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += outputLen) {
            // Ti = F(Password, Salt, c, i)
            // The last Ti view can be shorter than hLen, which applies
            // RFC 8018 §5.2 step 4's T_l<0..r-1> truncation without extra copies.
            const Ti = DK.subarray(pos, pos + outputLen);
            // F(Password, Salt, c, i) = U1 ^ U2 ^ ⋯ ^ Uc
            // U1 = PRF(Password, Salt + INT_32_BE(i))
            eng.u1(ti, Ti);
            // Uc = PRF(Password, Uc−1); Ti ^= Uc
            eng.rounds(c, Ti);
        }
        return eng.output(DK);
    }

    const U32_MASK64$1 = /* @__PURE__ */ (() => BigInt(2 ** 32 - 1))();
    const _32n$1 = /* @__PURE__ */ BigInt(32);
    // Split bigint into two 32-bit halves. With `le=true`, returned fields become `{ h: low, l: high
    // }` to match little-endian word order rather than the property names.
    function fromBig$1(n, le = false) {
        if (le)
            return { h: Number(n & U32_MASK64$1), l: Number((n >> _32n$1) & U32_MASK64$1) };
        return { h: Number((n >> _32n$1) & U32_MASK64$1) | 0, l: Number(n & U32_MASK64$1) | 0 };
    }
    // Split bigint list into `[highWords, lowWords]` when `le=false`; with `le=true`, the first array
    // holds the low halves because `fromBig(...)` swaps the semantic meaning of `h` and `l`.
    function split$1(lst, le = false) {
        const len = lst.length;
        let Ah = new Uint32Array(len);
        let Al = new Uint32Array(len);
        for (let i = 0; i < len; i++) {
            const { h, l } = fromBig$1(lst[i], le);
            [Ah[i], Al[i]] = [h, l];
        }
        return [Ah, Al];
    }
    // Split a JS number into u32 halves without a BigInt allocation. Exact only for integers
    // `0 <= n < 2**53`; callers use it on byte / bit counters, which JS length math caps far below
    // that (an ArrayBuffer cannot exceed 2**53 - 1 bytes).
    const fromNumH = (n) => (n / 2 ** 32) | 0;
    const fromNumL = (n) => n >>> 0;
    // Drop-in replacement for `view.setBigUint64(byteOffset, BigInt(n), isLE)` without the per-call
    // BigInt allocation. Same `n < 2**53` precondition as `fromNumH`/`fromNumL`.
    function setU64FromNum(view, byteOffset, n, isLE) {
        const h = fromNumH(n);
        const l = fromNumL(n);
        view.setUint32(byteOffset, isLE ? l : h, isLE);
        view.setUint32(byteOffset + 4, isLE ? h : l, isLE);
    }
    // High 32-bit half of a 64-bit logical right shift for `s` in `0..31`.
    const shrSH = (h, _l, s) => h >>> s;
    // Low 32-bit half of a 64-bit logical right shift, valid for `s` in `1..31`.
    const shrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
    // High 32-bit half of a 64-bit right rotate, valid for `s` in `1..31`.
    const rotrSH = (h, l, s) => (h >>> s) | (l << (32 - s));
    // Low 32-bit half of a 64-bit right rotate, valid for `s` in `1..31`.
    const rotrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
    // High 32-bit half of a 64-bit right rotate, valid for `s` in `33..63`; `32` uses `rotr32*`.
    const rotrBH = (h, l, s) => (h << (64 - s)) | (l >>> (s - 32));
    // Low 32-bit half of a 64-bit right rotate, valid for `s` in `33..63`; `32` uses `rotr32*`.
    const rotrBL = (h, l, s) => (h >>> (s - 32)) | (l << (64 - s));
    // 64-bit left rotates (rotl*) are not defined here: sha3.ts, their only consumer, keeps
    // local copies so V8 inlines them into keccakP.
    // Add two split 64-bit words and return the split `{ h, l }` sum.
    // JS uses 32-bit signed integers for bitwise operations, so we cannot simply shift the carry out
    // of the low sum and instead use division.
    function add(Ah, Al, Bh, Bl) {
        const l = (Al >>> 0) + (Bl >>> 0);
        return { h: (Ah + Bh + ((l / 2 ** 32) | 0)) | 0, l: l | 0 };
    }
    // Addition with more than 2 elements
    // Unmasked low-word accumulator for 3-way addition; pass the raw result into `add3H(...)`.
    const add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
    // High-word finalize step for 3-way addition; `low` must be the untruncated output of `add3L(...)`.
    const add3H = (low, Ah, Bh, Ch) => (Ah + Bh + Ch + ((low / 2 ** 32) | 0)) | 0;
    // Unmasked low-word accumulator for 4-way addition; pass the raw result into `add4H(...)`.
    const add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
    // High-word finalize step for 4-way addition; `low` must be the untruncated output of `add4L(...)`.
    const add4H = (low, Ah, Bh, Ch, Dh) => (Ah + Bh + Ch + Dh + ((low / 2 ** 32) | 0)) | 0;
    // Unmasked low-word accumulator for 5-way addition; pass the raw result into `add5H(...)`.
    const add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
    // High-word finalize step for 5-way addition; `low` must be the untruncated output of `add5L(...)`.
    const add5H = (low, Ah, Bh, Ch, Dh, Eh) => (Ah + Bh + Ch + Dh + Eh + ((low / 2 ** 32) | 0)) | 0;

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
            aexists$1(this);
            abytes$3(data);
            const { view, buffer, blockLen } = this;
            const len = data.length;
            let processed = false;
            for (let pos = 0; pos < len;) {
                const take = Math.min(blockLen - this.pos, len - pos);
                // Fast path only when there is no buffered partial block: `take === blockLen` implies
                // `this.pos === 0`, so we can process full blocks directly from the input view.
                if (take === blockLen) {
                    const dataView = createView(data);
                    for (; blockLen <= len - pos; pos += blockLen)
                        this.process(dataView, pos);
                    processed = true;
                    continue;
                }
                // When the whole input is buffered in one go (common for short messages), passing `data`
                // directly avoids allocating a subarray view.
                buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
                this.pos += take;
                pos += take;
                if (this.pos === blockLen) {
                    this.process(view, 0);
                    this.pos = 0;
                    processed = true;
                }
            }
            this.length += data.length;
            // Shared schedule buffers only pick up input-derived words inside process(); if everything
            // was buffered without processing, there is nothing to zero.
            if (processed)
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
            // append the bit '1' to the message, then zero-pad the rest of the block
            buffer[pos++] = 0b10000000;
            buffer.fill(0, pos);
            // we have less than padOffset left in buffer, so we cannot put length in
            // current block, need process it and pad again
            if (this.padOffset > blockLen - pos) {
                this.process(view, 0);
                buffer.fill(0);
            }
            // `padOffset` reserves the whole length field. For SHA-384/512 the high 64 bits stay zero from
            // the padding fill above, and JS will overflow before user input can make that half non-zero.
            // So we only need to write the low 64 bits here (`length * 8` only scales the exponent of an
            // integer below 2**53, so the split inside the helper stays exact).
            setU64FromNum(view, blockLen - 8, this.length * 8, isLE);
            this.process(view, 0);
            // The final block above is processed outside update(), so the shared message-schedule
            // buffers (e.g. SHA256_W) would otherwise retain input-derived words after digest().
            this.roundClean();
            // digest() passes our own `buffer` as `out`; reuse its cached view instead of allocating one.
            const oview = out === buffer ? view : createView(out);
            const len = this.outputLen;
            // NOTE: we do division by 4 later, which must be fused in single op with modulo by JIT
            const outLen = len / 4;
            const state = this.get();
            // Subclass-misconfiguration invariant: outputLen must be 32-bit aligned and fit the state.
            if (len % 4 || outLen > state.length)
                throw new Error('invalid outputLen');
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
        _cloneIntoMeta(to) {
            const { buffer, length, finished, destroyed, pos } = this;
            to.destroyed = destroyed;
            to.finished = finished;
            to.length = length;
            to.pos = pos;
            // Only partial-block bytes need copying: when `length % blockLen === 0`, `pos === 0` and
            // later `update()` / `digestInto()` overwrite `to.buffer` from the start before reading it.
            if (pos)
                to.buffer.set(buffer); // Avoid a hot modulo guard.
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
    /** Initial SHA512 state from RFC 6234 §6.3: eight RFC 64-bit `H(0)` words stored as sixteen
     * big-endian 32-bit halves. Derived from the fractional parts of the square roots of the first
     * eight prime numbers. Exported as a shared table; callers must treat it as read-only because
     * constructors copy halves from it by index. */
    const SHA512_IV = /* @__PURE__ */ Uint32Array.from([
        0x6a09e667, 0xf3bcc908, 0xbb67ae85, 0x84caa73b, 0x3c6ef372, 0xfe94f82b, 0xa54ff53a, 0x5f1d36f1,
        0x510e527f, 0xade682d1, 0x9b05688c, 0x2b3e6c1f, 0x1f83d9ab, 0xfb41bd6b, 0x5be0cd19, 0x137e2179,
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
        // We cannot use array here since array allows indexing by variable
        // which means optimizer/compiler cannot use registers.
        // Numeric initializers matter: starting the fields as `undefined` changes
        // V8's field representation and makes sha256 3x slower (measured).
        A = 0;
        B = 0;
        C = 0;
        D = 0;
        E = 0;
        F = 0;
        G = 0;
        H = 0;
        constructor(outputLen, IV) {
            super(64, outputLen, 8, false);
            this.A = IV[0] | 0;
            this.B = IV[1] | 0;
            this.C = IV[2] | 0;
            this.D = IV[3] | 0;
            this.E = IV[4] | 0;
            this.F = IV[5] | 0;
            this.G = IV[6] | 0;
            this.H = IV[7] | 0;
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
        _cloneInto(to) {
            (to ||= new this.constructor()).set(...this.get());
            return this._cloneIntoMeta(to);
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
            clean$1(SHA256_W);
        }
        destroy() {
            // HashMD callers route post-destroy usability through `destroyed`; zeroizing alone still leaves
            // update()/digest() callable on reused instances.
            this.destroyed = true;
            this.set(0, 0, 0, 0, 0, 0, 0, 0);
            clean$1(this.buffer);
        }
    }
    /** Internal SHA-256 hash class grounded in RFC 6234 §6.2. */
    class _SHA256 extends SHA2_32B {
        constructor() {
            super(32, SHA256_IV);
        }
    }
    // SHA2-512 is slower than sha256 in js because u64 operations are slow.
    // SHA-384 / SHA-512 round constants from RFC 6234 §5.2:
    // 80 full 64-bit words split into high/low halves.
    // prettier-ignore
    const K512 = /* @__PURE__ */ (() => split$1([
        '0x428a2f98d728ae22', '0x7137449123ef65cd', '0xb5c0fbcfec4d3b2f', '0xe9b5dba58189dbbc',
        '0x3956c25bf348b538', '0x59f111f1b605d019', '0x923f82a4af194f9b', '0xab1c5ed5da6d8118',
        '0xd807aa98a3030242', '0x12835b0145706fbe', '0x243185be4ee4b28c', '0x550c7dc3d5ffb4e2',
        '0x72be5d74f27b896f', '0x80deb1fe3b1696b1', '0x9bdc06a725c71235', '0xc19bf174cf692694',
        '0xe49b69c19ef14ad2', '0xefbe4786384f25e3', '0x0fc19dc68b8cd5b5', '0x240ca1cc77ac9c65',
        '0x2de92c6f592b0275', '0x4a7484aa6ea6e483', '0x5cb0a9dcbd41fbd4', '0x76f988da831153b5',
        '0x983e5152ee66dfab', '0xa831c66d2db43210', '0xb00327c898fb213f', '0xbf597fc7beef0ee4',
        '0xc6e00bf33da88fc2', '0xd5a79147930aa725', '0x06ca6351e003826f', '0x142929670a0e6e70',
        '0x27b70a8546d22ffc', '0x2e1b21385c26c926', '0x4d2c6dfc5ac42aed', '0x53380d139d95b3df',
        '0x650a73548baf63de', '0x766a0abb3c77b2a8', '0x81c2c92e47edaee6', '0x92722c851482353b',
        '0xa2bfe8a14cf10364', '0xa81a664bbc423001', '0xc24b8b70d0f89791', '0xc76c51a30654be30',
        '0xd192e819d6ef5218', '0xd69906245565a910', '0xf40e35855771202a', '0x106aa07032bbd1b8',
        '0x19a4c116b8d2d0c8', '0x1e376c085141ab53', '0x2748774cdf8eeb99', '0x34b0bcb5e19b48a8',
        '0x391c0cb3c5c95a63', '0x4ed8aa4ae3418acb', '0x5b9cca4f7763e373', '0x682e6ff3d6b2b8a3',
        '0x748f82ee5defb2fc', '0x78a5636f43172f60', '0x84c87814a1f0ab72', '0x8cc702081a6439ec',
        '0x90befffa23631e28', '0xa4506cebde82bde9', '0xbef9a3f7b2c67915', '0xc67178f2e372532b',
        '0xca273eceea26619c', '0xd186b8c721c0c207', '0xeada7dd6cde0eb1e', '0xf57d4f7fee6ed178',
        '0x06f067aa72176fba', '0x0a637dc5a2c898a6', '0x113f9804bef90dae', '0x1b710b35131c471b',
        '0x28db77f523047d84', '0x32caab7b40c72493', '0x3c9ebe0a15c9bebc', '0x431d67c49c100d4c',
        '0x4cc5d4becb3e42b6', '0x597f299cfc657e2a', '0x5fcb6fab3ad6faec', '0x6c44198c4a475817'
    ].map(n => BigInt(n))))();
    const SHA512_Kh = /* @__PURE__ */ (() => K512[0])();
    const SHA512_Kl = /* @__PURE__ */ (() => K512[1])();
    // Reusable high-half schedule buffer for the RFC 6234 §6.4 64-bit `W_t` words.
    const SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
    // Reusable low-half schedule buffer for the RFC 6234 §6.4 64-bit `W_t` words.
    const SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
    /** Internal SHA-384 / SHA-512 compression engine from RFC 6234 §6.4. */
    class SHA2_64B extends HashMD {
        // We cannot use array here since array allows indexing by variable
        // which means optimizer/compiler cannot use registers.
        // h -- high 32 bits, l -- low 32 bits
        // Numeric initializers matter: starting the fields as `undefined` changes
        // V8's field representation and slows hashing down (measured on sha256).
        Ah = 0;
        Al = 0;
        Bh = 0;
        Bl = 0;
        Ch = 0;
        Cl = 0;
        Dh = 0;
        Dl = 0;
        Eh = 0;
        El = 0;
        Fh = 0;
        Fl = 0;
        Gh = 0;
        Gl = 0;
        Hh = 0;
        Hl = 0;
        constructor(outputLen, IV) {
            super(128, outputLen, 16, false);
            this.Ah = IV[0] | 0;
            this.Al = IV[1] | 0;
            this.Bh = IV[2] | 0;
            this.Bl = IV[3] | 0;
            this.Ch = IV[4] | 0;
            this.Cl = IV[5] | 0;
            this.Dh = IV[6] | 0;
            this.Dl = IV[7] | 0;
            this.Eh = IV[8] | 0;
            this.El = IV[9] | 0;
            this.Fh = IV[10] | 0;
            this.Fl = IV[11] | 0;
            this.Gh = IV[12] | 0;
            this.Gl = IV[13] | 0;
            this.Hh = IV[14] | 0;
            this.Hl = IV[15] | 0;
        }
        // prettier-ignore
        get() {
            const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
            return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
        }
        // prettier-ignore
        set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
            this.Ah = Ah | 0;
            this.Al = Al | 0;
            this.Bh = Bh | 0;
            this.Bl = Bl | 0;
            this.Ch = Ch | 0;
            this.Cl = Cl | 0;
            this.Dh = Dh | 0;
            this.Dl = Dl | 0;
            this.Eh = Eh | 0;
            this.El = El | 0;
            this.Fh = Fh | 0;
            this.Fl = Fl | 0;
            this.Gh = Gh | 0;
            this.Gl = Gl | 0;
            this.Hh = Hh | 0;
            this.Hl = Hl | 0;
        }
        _cloneInto(to) {
            (to ||= new this.constructor()).set(...this.get());
            return this._cloneIntoMeta(to);
        }
        process(view, offset) {
            // Extend the first 16 words into the remaining 64 words w[16..79] of the message schedule array
            for (let i = 0; i < 16; i++, offset += 4) {
                SHA512_W_H[i] = view.getUint32(offset);
                SHA512_W_L[i] = view.getUint32((offset += 4));
            }
            for (let i = 16; i < 80; i++) {
                // s0 := (w[i-15] rightrotate 1) xor (w[i-15] rightrotate 8) xor (w[i-15] rightshift 7)
                const W15h = SHA512_W_H[i - 15] | 0;
                const W15l = SHA512_W_L[i - 15] | 0;
                const s0h = rotrSH(W15h, W15l, 1) ^ rotrSH(W15h, W15l, 8) ^ shrSH(W15h, W15l, 7);
                const s0l = rotrSL(W15h, W15l, 1) ^ rotrSL(W15h, W15l, 8) ^ shrSL(W15h, W15l, 7);
                // s1 := (w[i-2] rightrotate 19) xor (w[i-2] rightrotate 61) xor (w[i-2] rightshift 6)
                const W2h = SHA512_W_H[i - 2] | 0;
                const W2l = SHA512_W_L[i - 2] | 0;
                const s1h = rotrSH(W2h, W2l, 19) ^ rotrBH(W2h, W2l, 61) ^ shrSH(W2h, W2l, 6);
                const s1l = rotrSL(W2h, W2l, 19) ^ rotrBL(W2h, W2l, 61) ^ shrSL(W2h, W2l, 6);
                // SHA512_W[i] = s0 + s1 + SHA512_W[i - 7] + SHA512_W[i - 16];
                const SUMl = add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
                const SUMh = add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
                SHA512_W_H[i] = SUMh | 0;
                SHA512_W_L[i] = SUMl | 0;
            }
            let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
            // Compression function main loop, 80 rounds
            for (let i = 0; i < 80; i++) {
                // S1 := (e rightrotate 14) xor (e rightrotate 18) xor (e rightrotate 41)
                const sigma1h = rotrSH(Eh, El, 14) ^ rotrSH(Eh, El, 18) ^ rotrBH(Eh, El, 41);
                const sigma1l = rotrSL(Eh, El, 14) ^ rotrSL(Eh, El, 18) ^ rotrBL(Eh, El, 41);
                //const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
                const CHIh = (Eh & Fh) ^ (~Eh & Gh);
                const CHIl = (El & Fl) ^ (~El & Gl);
                // T1 = H + sigma1 + Chi(E, F, G) + SHA512_K[i] + SHA512_W[i]
                // prettier-ignore
                const T1ll = add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
                const T1h = add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
                const T1l = T1ll | 0;
                // S0 := (a rightrotate 28) xor (a rightrotate 34) xor (a rightrotate 39)
                const sigma0h = rotrSH(Ah, Al, 28) ^ rotrBH(Ah, Al, 34) ^ rotrBH(Ah, Al, 39);
                const sigma0l = rotrSL(Ah, Al, 28) ^ rotrBL(Ah, Al, 34) ^ rotrBL(Ah, Al, 39);
                const MAJh = (Ah & Bh) ^ (Ah & Ch) ^ (Bh & Ch);
                const MAJl = (Al & Bl) ^ (Al & Cl) ^ (Bl & Cl);
                Hh = Gh | 0;
                Hl = Gl | 0;
                Gh = Fh | 0;
                Gl = Fl | 0;
                Fh = Eh | 0;
                Fl = El | 0;
                ({ h: Eh, l: El } = add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
                Dh = Ch | 0;
                Dl = Cl | 0;
                Ch = Bh | 0;
                Cl = Bl | 0;
                Bh = Ah | 0;
                Bl = Al | 0;
                const All = add3L(T1l, sigma0l, MAJl);
                Ah = add3H(All, T1h, sigma0h, MAJh);
                Al = All | 0;
            }
            // Add the compressed chunk to the current hash value
            ({ h: Ah, l: Al } = add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
            ({ h: Bh, l: Bl } = add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
            ({ h: Ch, l: Cl } = add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
            ({ h: Dh, l: Dl } = add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
            ({ h: Eh, l: El } = add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
            ({ h: Fh, l: Fl } = add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
            ({ h: Gh, l: Gl } = add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
            ({ h: Hh, l: Hl } = add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
            this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
        }
        roundClean() {
            clean$1(SHA512_W_H, SHA512_W_L);
        }
        destroy() {
            // HashMD callers route post-destroy usability through `destroyed`; zeroizing alone still leaves
            // update()/digest() callable on reused instances.
            this.destroyed = true;
            clean$1(this.buffer);
            this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        }
    }
    /** Internal SHA-512 hash class grounded in RFC 6234 §6.3 and §6.4. */
    class _SHA512 extends SHA2_64B {
        constructor() {
            super(64, SHA512_IV);
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
     * @param opts - Reserved hash options.
     * @returns Digest bytes.
     * @example
     * Hash a message with SHA2-256.
     * ```ts
     * sha256(new Uint8Array([97, 98, 99]));
     * ```
     */
    const sha256 = /* @__PURE__ */ createHasher$1(() => new _SHA256(), 
    /* @__PURE__ */ oidNist$1(0x01));
    /**
     * SHA2-512 hash function from RFC 4634.
     * @param msg - message bytes to hash
     * @param opts - Reserved hash options.
     * @returns Digest bytes.
     * @example
     * Hash a message with SHA2-512.
     * ```ts
     * sha512(new Uint8Array([97, 98, 99]));
     * ```
     */
    const sha512 = /* @__PURE__ */ createHasher$1(() => new _SHA512(), 
    /* @__PURE__ */ oidNist$1(0x03));

    /*! scure-bip39 - MIT License (c) 2022 Patricio Palladino, Paul Miller (paulmillr.com) */
    // Japanese wordlist
    // The canonical BIP-39 Japanese wordlist starts with あいこくしん.
    // Use that sentinel so generated phrases use U+3000 ideographic spaces.
    const isJapanese = (wordlist) => wordlist[0] === '\u3042\u3044\u3053\u304f\u3057\u3093';
    // JavaScript strings can contain unpaired UTF-16 surrogates, which cannot be encoded as UTF-8.
    function isWellFormedUnicode(value) {
        for (let i = 0; i < value.length; i++) {
            const current = value.charCodeAt(i);
            if (current >= 0xd800 && current <= 0xdbff) {
                if (i + 1 >= value.length)
                    return false;
                const next = value.charCodeAt(++i);
                if (next < 0xdc00 || next > 0xdfff)
                    return false;
            }
            else if (current >= 0xdc00 && current <= 0xdfff) {
                return false;
            }
        }
        return true;
    }
    // Normalization replaces equivalent sequences of characters
    // so that any two texts that are equivalent will be reduced
    // to the same sequence of code points, called the normal form of the original text.
    // https://tonsky.me/blog/unicode/#why-is-a----
    // BIP-39 requires UTF-8 NFKD for localized wordlists and mnemonic sentences.
    // It also applies NFKD to the "mnemonic" + passphrase salt.
    function nfkd(str) {
        if (typeof str !== 'string')
            throw new TypeError('invalid mnemonic type: ' + typeof str);
        if (!isWellFormedUnicode(str))
            throw new TypeError('expected well-formed Unicode string');
        return str.normalize('NFKD');
    }
    // BIP-39 mnemonics are consumed in NFKD form.
    // They must contain 12, 15, 18, 21, or 24 words before checksum validation.
    function normalize(str) {
        const norm = nfkd(str);
        const words = norm.split(' ');
        if (![12, 15, 18, 21, 24].includes(words.length))
            throw new Error('Invalid mnemonic');
        return { nfkd: norm, words };
    }
    // BIP-39 entropy payloads are 128-256 bits in 32-bit increments, i.e. 16/20/24/28/32 bytes.
    function aentropy(ent) {
        abytes$3(ent);
        if (![16, 20, 24, 28, 32].includes(ent.length))
            throw new RangeError('invalid entropy length');
    }
    /**
     * Generate x random words. Uses Cryptographically-Secure Random Number Generator.
     * @param wordlist - Imported wordlist for a specific language.
     * @param strength - Mnemonic strength, from 128 to 256 bits.
     * @returns 12-24 word mnemonic phrase.
     * @throws On wrong argument types. {@link TypeError}
     * @throws On wrong argument ranges or values. {@link RangeError}
     * @example
     * Generate a new English mnemonic.
     * ```ts
     * import { generateMnemonic } from '@scure/bip39';
     * import { wordlist } from '@scure/bip39/wordlists/english.js';
     * const mnemonic = generateMnemonic(wordlist, 128);
     * // 'legal winner thank year wave sausage worth useful legal winner thank yellow'
     * ```
     */
    function generateMnemonic$1(wordlist, strength = 128) {
        anumber$2(strength);
        if (strength % 32 !== 0 || strength > 256)
            throw new RangeError('Invalid entropy');
        return entropyToMnemonic$1(randomBytes$3(strength / 8), wordlist);
    }
    // BIP-39 checksum is the first ENT/32 bits of SHA-256(entropy).
    // Returned as a byte with checksum bits on the left and zeroes on the right.
    const calcChecksum = (entropy) => {
        // Checksum is ent.length/4 bits long
        const bitsLeft = 8 - entropy.length / 4;
        // Zero rightmost "bitsLeft" bits in byte
        // For example: bitsLeft=4 val=10111101 -> 10110000
        return (sha256(entropy)[0] >> bitsLeft) << bitsLeft;
    };
    function awordlist(wordlist) {
        if (!Array.isArray(wordlist) || wordlist.length !== 2048 || typeof wordlist[0] !== 'string')
            throw new TypeError('Wordlist: expected array of 2048 strings');
        wordlist.forEach((i) => {
            if (typeof i !== 'string')
                throw new TypeError('wordlist: non-string element: ' + i);
            // Wordlists become mnemonic output, so apply the same lossless UTF-8 boundary as input phrases.
            if (!isWellFormedUnicode(i))
                throw new TypeError('wordlist: expected well-formed Unicode string');
        });
    }
    // BIP-39 appends checksum bits to entropy,
    // then splits the bitstream into 11-bit indexes for a 2048-word list.
    function encodeWords(entropy, wordlist) {
        awordlist(wordlist);
        const bytes = new Uint8Array(entropy.length + 1); // entropy || checksum byte
        bytes.set(entropy);
        bytes[entropy.length] = calcChecksum(entropy);
        const words = [];
        let carry = 0; // bit accumulator, holds < 19 bits
        let bits = 0;
        for (const byte of bytes) {
            carry = (carry << 8) | byte;
            bits += 8;
            if (bits >= 11) {
                bits -= 11;
                words.push(wordlist[(carry >>> bits) & 0x7ff]);
                carry &= (1 << bits) - 1;
            }
        }
        // Bits still in carry are the zero right bits of the checksum byte; drop them.
        return words;
    }
    // Reverse of encodeWords: repacks 11-bit indexes into bytes and verifies checksum.
    function decodeWords(words, wordlist) {
        awordlist(wordlist);
        const entLen = (words.length / 3) * 4; // every 3 words hold 32 entropy bits + 1 checksum bit
        const bytes = new Uint8Array(entLen + 1); // entropy || checksum byte
        let carry = 0; // bit accumulator, holds < 19 bits
        let bits = 0;
        let pos = 0;
        for (const word of words) {
            const index = wordlist.indexOf(word);
            if (index === -1)
                throw new Error('Unknown word: ' + word);
            carry = (carry << 11) | index;
            bits += 11;
            while (bits >= 8) {
                bits -= 8;
                bytes[pos++] = (carry >>> bits) & 0xff;
            }
            carry &= (1 << bits) - 1;
        }
        // Left-align leftover checksum bits, matching calcChecksum output.
        if (bits > 0)
            bytes[pos] = carry << (8 - bits);
        const entropy = bytes.subarray(0, entLen);
        if (bytes[entLen] !== calcChecksum(entropy))
            throw new Error('Invalid checksum');
        return Uint8Array.from(entropy);
    }
    /**
     * Reversible: Converts mnemonic string to raw entropy in form of byte array.
     * @param mnemonic - 12-24 words.
     * @param wordlist - Imported wordlist for a specific language.
     * @returns Raw entropy bytes.
     * @throws If the mnemonic shape or checksum is invalid. {@link Error}
     * @throws On wrong argument types. {@link TypeError}
     * @throws On wrong argument ranges or values. {@link RangeError}
     * @example
     * Decode a mnemonic back into its original entropy bytes.
     * ```ts
     * import { mnemonicToEntropy } from '@scure/bip39';
     * import { wordlist } from '@scure/bip39/wordlists/english.js';
     * const mnem = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
     * const entropy = mnemonicToEntropy(mnem, wordlist);
     * // Produces the original 16-byte entropy payload.
     * new Uint8Array([
     *   0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f,
     *   0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f
     * ])
     * ```
     */
    function mnemonicToEntropy(mnemonic, wordlist) {
        const { words } = normalize(mnemonic);
        const entropy = decodeWords(words, wordlist);
        aentropy(entropy);
        return entropy;
    }
    /**
     * Reversible: Converts raw entropy in form of byte array to mnemonic string.
     * @param entropy - Byte array.
     * @param wordlist - Imported wordlist for a specific language.
     * @returns 12-24 words.
     * @throws On wrong argument types. {@link TypeError}
     * @throws On wrong argument ranges or values. {@link RangeError}
     * @example
     * Convert raw entropy into an English mnemonic.
     * ```ts
     * import { entropyToMnemonic } from '@scure/bip39';
     * import { wordlist } from '@scure/bip39/wordlists/english.js';
     * const ent = new Uint8Array([
     *   0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f,
     *   0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f
     * ]);
     * const mnemonic = entropyToMnemonic(ent, wordlist);
     * // 'legal winner thank year wave sausage worth useful legal winner thank yellow'
     * ```
     */
    function entropyToMnemonic$1(entropy, wordlist) {
        aentropy(entropy);
        const words = encodeWords(entropy, wordlist);
        return words.join(isJapanese(wordlist) ? '\u3000' : ' ');
    }
    /**
     * Validates mnemonic for being 12-24 words contained in `wordlist`.
     * @param mnemonic - 12-24 words.
     * @param wordlist - Imported wordlist for a specific language.
     * @returns `true` when mnemonic checksum and words are valid.
     * @example
     * Validate one English mnemonic.
     * ```ts
     * import { validateMnemonic } from '@scure/bip39';
     * import { wordlist } from '@scure/bip39/wordlists/english.js';
     * const ok = validateMnemonic(
     *   'legal winner thank year wave sausage worth useful legal winner thank yellow',
     *   wordlist
     * );
     * // => true
     * ```
     */
    function validateMnemonic(mnemonic, wordlist) {
        try {
            mnemonicToEntropy(mnemonic, wordlist);
        }
        catch (e) {
            return false;
        }
        return true;
    }
    // BIP-39 salts PBKDF2 with the UTF-8 NFKD string "mnemonic" + passphrase.
    const psalt = (passphrase) => {
        if (typeof passphrase !== 'string')
            throw new TypeError('invalid passphrase type: ' + typeof passphrase);
        return nfkd('mnemonic' + passphrase);
    };
    /**
     * Irreversible: Uses KDF to derive 64 bytes of key data from mnemonic + optional password.
     * @param mnemonic - 12-24 words.
     * @param passphrase - String that will additionally protect the key.
     * @returns 64 bytes of key data.
     * @throws If the mnemonic shape is invalid. {@link Error}
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Derive a seed from a mnemonic with the sync PBKDF2 helper.
     * ```ts
     * const mnem = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
     * const seed = mnemonicToSeedSync(mnem, 'password');
     * // => new Uint8Array([...64 bytes])
     * ```
     */
    function mnemonicToSeedSync(mnemonic, passphrase = '') {
        return pbkdf2(sha512, normalize(mnemonic).nfkd, psalt(passphrase), {
            c: 2048,
            dkLen: 64,
        });
    }

    /** Czech BIP39 wordlist. */
    const wordlist$8 = /* @__PURE__ */ Object.freeze(`abdikace
abeceda
adresa
agrese
akce
aktovka
alej
alkohol
amputace
ananas
andulka
anekdota
anketa
antika
anulovat
archa
arogance
asfalt
asistent
aspirace
astma
astronom
atlas
atletika
atol
autobus
azyl
babka
bachor
bacil
baculka
badatel
bageta
bagr
bahno
bakterie
balada
baletka
balkon
balonek
balvan
balza
bambus
bankomat
barbar
baret
barman
baroko
barva
baterka
batoh
bavlna
bazalka
bazilika
bazuka
bedna
beran
beseda
bestie
beton
bezinka
bezmoc
beztak
bicykl
bidlo
biftek
bikiny
bilance
biograf
biolog
bitva
bizon
blahobyt
blatouch
blecha
bledule
blesk
blikat
blizna
blokovat
bloudit
blud
bobek
bobr
bodlina
bodnout
bohatost
bojkot
bojovat
bokorys
bolest
borec
borovice
bota
boubel
bouchat
bouda
boule
bourat
boxer
bradavka
brambora
branka
bratr
brepta
briketa
brko
brloh
bronz
broskev
brunetka
brusinka
brzda
brzy
bublina
bubnovat
buchta
buditel
budka
budova
bufet
bujarost
bukvice
buldok
bulva
bunda
bunkr
burza
butik
buvol
buzola
bydlet
bylina
bytovka
bzukot
capart
carevna
cedr
cedule
cejch
cejn
cela
celer
celkem
celnice
cenina
cennost
cenovka
centrum
cenzor
cestopis
cetka
chalupa
chapadlo
charita
chata
chechtat
chemie
chichot
chirurg
chlad
chleba
chlubit
chmel
chmura
chobot
chochol
chodba
cholera
chomout
chopit
choroba
chov
chrapot
chrlit
chrt
chrup
chtivost
chudina
chutnat
chvat
chvilka
chvost
chyba
chystat
chytit
cibule
cigareta
cihelna
cihla
cinkot
cirkus
cisterna
citace
citrus
cizinec
cizost
clona
cokoliv
couvat
ctitel
ctnost
cudnost
cuketa
cukr
cupot
cvaknout
cval
cvik
cvrkot
cyklista
daleko
dareba
datel
datum
dcera
debata
dechovka
decibel
deficit
deflace
dekl
dekret
demokrat
deprese
derby
deska
detektiv
dikobraz
diktovat
dioda
diplom
disk
displej
divadlo
divoch
dlaha
dlouho
dluhopis
dnes
dobro
dobytek
docent
dochutit
dodnes
dohled
dohoda
dohra
dojem
dojnice
doklad
dokola
doktor
dokument
dolar
doleva
dolina
doma
dominant
domluvit
domov
donutit
dopad
dopis
doplnit
doposud
doprovod
dopustit
dorazit
dorost
dort
dosah
doslov
dostatek
dosud
dosyta
dotaz
dotek
dotknout
doufat
doutnat
dovozce
dozadu
doznat
dozorce
drahota
drak
dramatik
dravec
draze
drdol
drobnost
drogerie
drozd
drsnost
drtit
drzost
duben
duchovno
dudek
duha
duhovka
dusit
dusno
dutost
dvojice
dvorec
dynamit
ekolog
ekonomie
elektron
elipsa
email
emise
emoce
empatie
epizoda
epocha
epopej
epos
esej
esence
eskorta
eskymo
etiketa
euforie
evoluce
exekuce
exkurze
expedice
exploze
export
extrakt
facka
fajfka
fakulta
fanatik
fantazie
farmacie
favorit
fazole
federace
fejeton
fenka
fialka
figurant
filozof
filtr
finance
finta
fixace
fjord
flanel
flirt
flotila
fond
fosfor
fotbal
fotka
foton
frakce
freska
fronta
fukar
funkce
fyzika
galeje
garant
genetika
geolog
gilotina
glazura
glejt
golem
golfista
gotika
graf
gramofon
granule
grep
gril
grog
groteska
guma
hadice
hadr
hala
halenka
hanba
hanopis
harfa
harpuna
havran
hebkost
hejkal
hejno
hejtman
hektar
helma
hematom
herec
herna
heslo
hezky
historik
hladovka
hlasivky
hlava
hledat
hlen
hlodavec
hloh
hloupost
hltat
hlubina
hluchota
hmat
hmota
hmyz
hnis
hnojivo
hnout
hoblina
hoboj
hoch
hodiny
hodlat
hodnota
hodovat
hojnost
hokej
holinka
holka
holub
homole
honitba
honorace
horal
horda
horizont
horko
horlivec
hormon
hornina
horoskop
horstvo
hospoda
hostina
hotovost
houba
houf
houpat
houska
hovor
hradba
hranice
hravost
hrazda
hrbolek
hrdina
hrdlo
hrdost
hrnek
hrobka
hromada
hrot
hrouda
hrozen
hrstka
hrubost
hryzat
hubenost
hubnout
hudba
hukot
humr
husita
hustota
hvozd
hybnost
hydrant
hygiena
hymna
hysterik
idylka
ihned
ikona
iluze
imunita
infekce
inflace
inkaso
inovace
inspekce
internet
invalida
investor
inzerce
ironie
jablko
jachta
jahoda
jakmile
jakost
jalovec
jantar
jarmark
jaro
jasan
jasno
jatka
javor
jazyk
jedinec
jedle
jednatel
jehlan
jekot
jelen
jelito
jemnost
jenom
jepice
jeseter
jevit
jezdec
jezero
jinak
jindy
jinoch
jiskra
jistota
jitrnice
jizva
jmenovat
jogurt
jurta
kabaret
kabel
kabinet
kachna
kadet
kadidlo
kahan
kajak
kajuta
kakao
kaktus
kalamita
kalhoty
kalibr
kalnost
kamera
kamkoliv
kamna
kanibal
kanoe
kantor
kapalina
kapela
kapitola
kapka
kaple
kapota
kapr
kapusta
kapybara
karamel
karotka
karton
kasa
katalog
katedra
kauce
kauza
kavalec
kazajka
kazeta
kazivost
kdekoliv
kdesi
kedluben
kemp
keramika
kino
klacek
kladivo
klam
klapot
klasika
klaun
klec
klenba
klepat
klesnout
klid
klima
klisna
klobouk
klokan
klopa
kloub
klubovna
klusat
kluzkost
kmen
kmitat
kmotr
kniha
knot
koalice
koberec
kobka
kobliha
kobyla
kocour
kohout
kojenec
kokos
koktejl
kolaps
koleda
kolize
kolo
komando
kometa
komik
komnata
komora
kompas
komunita
konat
koncept
kondice
konec
konfese
kongres
konina
konkurs
kontakt
konzerva
kopanec
kopie
kopnout
koprovka
korbel
korektor
kormidlo
koroptev
korpus
koruna
koryto
korzet
kosatec
kostka
kotel
kotleta
kotoul
koukat
koupelna
kousek
kouzlo
kovboj
koza
kozoroh
krabice
krach
krajina
kralovat
krasopis
kravata
kredit
krejcar
kresba
kreveta
kriket
kritik
krize
krkavec
krmelec
krmivo
krocan
krok
kronika
kropit
kroupa
krovka
krtek
kruhadlo
krupice
krutost
krvinka
krychle
krypta
krystal
kryt
kudlanka
kufr
kujnost
kukla
kulajda
kulich
kulka
kulomet
kultura
kuna
kupodivu
kurt
kurzor
kutil
kvalita
kvasinka
kvestor
kynolog
kyselina
kytara
kytice
kytka
kytovec
kyvadlo
labrador
lachtan
ladnost
laik
lakomec
lamela
lampa
lanovka
lasice
laso
lastura
latinka
lavina
lebka
leckdy
leden
lednice
ledovka
ledvina
legenda
legie
legrace
lehce
lehkost
lehnout
lektvar
lenochod
lentilka
lepenka
lepidlo
letadlo
letec
letmo
letokruh
levhart
levitace
levobok
libra
lichotka
lidojed
lidskost
lihovina
lijavec
lilek
limetka
linie
linka
linoleum
listopad
litina
litovat
lobista
lodivod
logika
logoped
lokalita
loket
lomcovat
lopata
lopuch
lord
losos
lotr
loudal
louh
louka
louskat
lovec
lstivost
lucerna
lucifer
lump
lusk
lustrace
lvice
lyra
lyrika
lysina
madam
madlo
magistr
mahagon
majetek
majitel
majorita
makak
makovice
makrela
malba
malina
malovat
malvice
maminka
mandle
manko
marnost
masakr
maskot
masopust
matice
matrika
maturita
mazanec
mazivo
mazlit
mazurka
mdloba
mechanik
meditace
medovina
melasa
meloun
mentolka
metla
metoda
metr
mezera
migrace
mihnout
mihule
mikina
mikrofon
milenec
milimetr
milost
mimika
mincovna
minibar
minomet
minulost
miska
mistr
mixovat
mladost
mlha
mlhovina
mlok
mlsat
mluvit
mnich
mnohem
mobil
mocnost
modelka
modlitba
mohyla
mokro
molekula
momentka
monarcha
monokl
monstrum
montovat
monzun
mosaz
moskyt
most
motivace
motorka
motyka
moucha
moudrost
mozaika
mozek
mozol
mramor
mravenec
mrkev
mrtvola
mrzet
mrzutost
mstitel
mudrc
muflon
mulat
mumie
munice
muset
mutace
muzeum
muzikant
myslivec
mzda
nabourat
nachytat
nadace
nadbytek
nadhoz
nadobro
nadpis
nahlas
nahnat
nahodile
nahradit
naivita
najednou
najisto
najmout
naklonit
nakonec
nakrmit
nalevo
namazat
namluvit
nanometr
naoko
naopak
naostro
napadat
napevno
naplnit
napnout
naposled
naprosto
narodit
naruby
narychlo
nasadit
nasekat
naslepo
nastat
natolik
navenek
navrch
navzdory
nazvat
nebe
nechat
necky
nedaleko
nedbat
neduh
negace
nehet
nehoda
nejen
nejprve
neklid
nelibost
nemilost
nemoc
neochota
neonka
nepokoj
nerost
nerv
nesmysl
nesoulad
netvor
neuron
nevina
nezvykle
nicota
nijak
nikam
nikdy
nikl
nikterak
nitro
nocleh
nohavice
nominace
nora
norek
nositel
nosnost
nouze
noviny
novota
nozdra
nuda
nudle
nuget
nutit
nutnost
nutrie
nymfa
obal
obarvit
obava
obdiv
obec
obehnat
obejmout
obezita
obhajoba
obilnice
objasnit
objekt
obklopit
oblast
oblek
obliba
obloha
obluda
obnos
obohatit
obojek
obout
obrazec
obrna
obruba
obrys
obsah
obsluha
obstarat
obuv
obvaz
obvinit
obvod
obvykle
obyvatel
obzor
ocas
ocel
ocenit
ochladit
ochota
ochrana
ocitnout
odboj
odbyt
odchod
odcizit
odebrat
odeslat
odevzdat
odezva
odhadce
odhodit
odjet
odjinud
odkaz
odkoupit
odliv
odluka
odmlka
odolnost
odpad
odpis
odplout
odpor
odpustit
odpykat
odrazka
odsoudit
odstup
odsun
odtok
odtud
odvaha
odveta
odvolat
odvracet
odznak
ofina
ofsajd
ohlas
ohnisko
ohrada
ohrozit
ohryzek
okap
okenice
oklika
okno
okouzlit
okovy
okrasa
okres
okrsek
okruh
okupant
okurka
okusit
olejnina
olizovat
omak
omeleta
omezit
omladina
omlouvat
omluva
omyl
onehdy
opakovat
opasek
operace
opice
opilost
opisovat
opora
opozice
opravdu
oproti
orbital
orchestr
orgie
orlice
orloj
ortel
osada
oschnout
osika
osivo
oslava
oslepit
oslnit
oslovit
osnova
osoba
osolit
ospalec
osten
ostraha
ostuda
ostych
osvojit
oteplit
otisk
otop
otrhat
otrlost
otrok
otruby
otvor
ovanout
ovar
oves
ovlivnit
ovoce
oxid
ozdoba
pachatel
pacient
padouch
pahorek
pakt
palanda
palec
palivo
paluba
pamflet
pamlsek
panenka
panika
panna
panovat
panstvo
pantofle
paprika
parketa
parodie
parta
paruka
paryba
paseka
pasivita
pastelka
patent
patrona
pavouk
pazneht
pazourek
pecka
pedagog
pejsek
peklo
peloton
penalta
pendrek
penze
periskop
pero
pestrost
petarda
petice
petrolej
pevnina
pexeso
pianista
piha
pijavice
pikle
piknik
pilina
pilnost
pilulka
pinzeta
pipeta
pisatel
pistole
pitevna
pivnice
pivovar
placenta
plakat
plamen
planeta
plastika
platit
plavidlo
plaz
plech
plemeno
plenta
ples
pletivo
plevel
plivat
plnit
plno
plocha
plodina
plomba
plout
pluk
plyn
pobavit
pobyt
pochod
pocit
poctivec
podat
podcenit
podepsat
podhled
podivit
podklad
podmanit
podnik
podoba
podpora
podraz
podstata
podvod
podzim
poezie
pohanka
pohnutka
pohovor
pohroma
pohyb
pointa
pojistka
pojmout
pokazit
pokles
pokoj
pokrok
pokuta
pokyn
poledne
polibek
polknout
poloha
polynom
pomalu
pominout
pomlka
pomoc
pomsta
pomyslet
ponechat
ponorka
ponurost
popadat
popel
popisek
poplach
poprosit
popsat
popud
poradce
porce
porod
porucha
poryv
posadit
posed
posila
poskok
poslanec
posoudit
pospolu
postava
posudek
posyp
potah
potkan
potlesk
potomek
potrava
potupa
potvora
poukaz
pouto
pouzdro
povaha
povidla
povlak
povoz
povrch
povstat
povyk
povzdech
pozdrav
pozemek
poznatek
pozor
pozvat
pracovat
prahory
praktika
prales
praotec
praporek
prase
pravda
princip
prkno
probudit
procento
prodej
profese
prohra
projekt
prolomit
promile
pronikat
propad
prorok
prosba
proton
proutek
provaz
prskavka
prsten
prudkost
prut
prvek
prvohory
psanec
psovod
pstruh
ptactvo
puberta
puch
pudl
pukavec
puklina
pukrle
pult
pumpa
punc
pupen
pusa
pusinka
pustina
putovat
putyka
pyramida
pysk
pytel
racek
rachot
radiace
radnice
radon
raft
ragby
raketa
rakovina
rameno
rampouch
rande
rarach
rarita
rasovna
rastr
ratolest
razance
razidlo
reagovat
reakce
recept
redaktor
referent
reflex
rejnok
reklama
rekord
rekrut
rektor
reputace
revize
revma
revolver
rezerva
riskovat
riziko
robotika
rodokmen
rohovka
rokle
rokoko
romaneto
ropovod
ropucha
rorejs
rosol
rostlina
rotmistr
rotoped
rotunda
roubenka
roucho
roup
roura
rovina
rovnice
rozbor
rozchod
rozdat
rozeznat
rozhodce
rozinka
rozjezd
rozkaz
rozloha
rozmar
rozpad
rozruch
rozsah
roztok
rozum
rozvod
rubrika
ruchadlo
rukavice
rukopis
ryba
rybolov
rychlost
rydlo
rypadlo
rytina
ryzost
sadista
sahat
sako
samec
samizdat
samota
sanitka
sardinka
sasanka
satelit
sazba
sazenice
sbor
schovat
sebranka
secese
sedadlo
sediment
sedlo
sehnat
sejmout
sekera
sekta
sekunda
sekvoje
semeno
seno
servis
sesadit
seshora
seskok
seslat
sestra
sesuv
sesypat
setba
setina
setkat
setnout
setrvat
sever
seznam
shoda
shrnout
sifon
silnice
sirka
sirotek
sirup
situace
skafandr
skalisko
skanzen
skaut
skeptik
skica
skladba
sklenice
sklo
skluz
skoba
skokan
skoro
skripta
skrz
skupina
skvost
skvrna
slabika
sladidlo
slanina
slast
slavnost
sledovat
slepec
sleva
slezina
slib
slina
sliznice
slon
sloupek
slovo
sluch
sluha
slunce
slupka
slza
smaragd
smetana
smilstvo
smlouva
smog
smrad
smrk
smrtka
smutek
smysl
snad
snaha
snob
sobota
socha
sodovka
sokol
sopka
sotva
souboj
soucit
soudce
souhlas
soulad
soumrak
souprava
soused
soutok
souviset
spalovna
spasitel
spis
splav
spodek
spojenec
spolu
sponzor
spornost
spousta
sprcha
spustit
sranda
sraz
srdce
srna
srnec
srovnat
srpen
srst
srub
stanice
starosta
statika
stavba
stehno
stezka
stodola
stolek
stopa
storno
stoupat
strach
stres
strhnout
strom
struna
studna
stupnice
stvol
styk
subjekt
subtropy
suchar
sudost
sukno
sundat
sunout
surikata
surovina
svah
svalstvo
svetr
svatba
svazek
svisle
svitek
svoboda
svodidlo
svorka
svrab
sykavka
sykot
synek
synovec
sypat
sypkost
syrovost
sysel
sytost
tabletka
tabule
tahoun
tajemno
tajfun
tajga
tajit
tajnost
taktika
tamhle
tampon
tancovat
tanec
tanker
tapeta
tavenina
tazatel
technika
tehdy
tekutina
telefon
temnota
tendence
tenista
tenor
teplota
tepna
teprve
terapie
termoska
textil
ticho
tiskopis
titulek
tkadlec
tkanina
tlapka
tleskat
tlukot
tlupa
tmel
toaleta
topinka
topol
torzo
touha
toulec
tradice
traktor
tramp
trasa
traverza
trefit
trest
trezor
trhavina
trhlina
trochu
trojice
troska
trouba
trpce
trpitel
trpkost
trubec
truchlit
truhlice
trus
trvat
tudy
tuhnout
tuhost
tundra
turista
turnaj
tuzemsko
tvaroh
tvorba
tvrdost
tvrz
tygr
tykev
ubohost
uboze
ubrat
ubrousek
ubrus
ubytovna
ucho
uctivost
udivit
uhradit
ujednat
ujistit
ujmout
ukazatel
uklidnit
uklonit
ukotvit
ukrojit
ulice
ulita
ulovit
umyvadlo
unavit
uniforma
uniknout
upadnout
uplatnit
uplynout
upoutat
upravit
uran
urazit
usednout
usilovat
usmrtit
usnadnit
usnout
usoudit
ustlat
ustrnout
utahovat
utkat
utlumit
utonout
utopenec
utrousit
uvalit
uvolnit
uvozovka
uzdravit
uzel
uzenina
uzlina
uznat
vagon
valcha
valoun
vana
vandal
vanilka
varan
varhany
varovat
vcelku
vchod
vdova
vedro
vegetace
vejce
velbloud
veletrh
velitel
velmoc
velryba
venkov
veranda
verze
veselka
veskrze
vesnice
vespodu
vesta
veterina
veverka
vibrace
vichr
videohra
vidina
vidle
vila
vinice
viset
vitalita
vize
vizitka
vjezd
vklad
vkus
vlajka
vlak
vlasec
vlevo
vlhkost
vliv
vlnovka
vloupat
vnucovat
vnuk
voda
vodivost
vodoznak
vodstvo
vojensky
vojna
vojsko
volant
volba
volit
volno
voskovka
vozidlo
vozovna
vpravo
vrabec
vracet
vrah
vrata
vrba
vrcholek
vrhat
vrstva
vrtule
vsadit
vstoupit
vstup
vtip
vybavit
vybrat
vychovat
vydat
vydra
vyfotit
vyhledat
vyhnout
vyhodit
vyhradit
vyhubit
vyjasnit
vyjet
vyjmout
vyklopit
vykonat
vylekat
vymazat
vymezit
vymizet
vymyslet
vynechat
vynikat
vynutit
vypadat
vyplatit
vypravit
vypustit
vyrazit
vyrovnat
vyrvat
vyslovit
vysoko
vystavit
vysunout
vysypat
vytasit
vytesat
vytratit
vyvinout
vyvolat
vyvrhel
vyzdobit
vyznat
vzadu
vzbudit
vzchopit
vzdor
vzduch
vzdychat
vzestup
vzhledem
vzkaz
vzlykat
vznik
vzorek
vzpoura
vztah
vztek
xylofon
zabrat
zabydlet
zachovat
zadarmo
zadusit
zafoukat
zahltit
zahodit
zahrada
zahynout
zajatec
zajet
zajistit
zaklepat
zakoupit
zalepit
zamezit
zamotat
zamyslet
zanechat
zanikat
zaplatit
zapojit
zapsat
zarazit
zastavit
zasunout
zatajit
zatemnit
zatknout
zaujmout
zavalit
zavelet
zavinit
zavolat
zavrtat
zazvonit
zbavit
zbrusu
zbudovat
zbytek
zdaleka
zdarma
zdatnost
zdivo
zdobit
zdroj
zdvih
zdymadlo
zelenina
zeman
zemina
zeptat
zezadu
zezdola
zhatit
zhltnout
zhluboka
zhotovit
zhruba
zima
zimnice
zjemnit
zklamat
zkoumat
zkratka
zkumavka
zlato
zlehka
zloba
zlom
zlost
zlozvyk
zmapovat
zmar
zmatek
zmije
zmizet
zmocnit
zmodrat
zmrzlina
zmutovat
znak
znalost
znamenat
znovu
zobrazit
zotavit
zoubek
zoufale
zplodit
zpomalit
zprava
zprostit
zprudka
zprvu
zrada
zranit
zrcadlo
zrnitost
zrno
zrovna
zrychlit
zrzavost
zticha
ztratit
zubovina
zubr
zvednout
zvenku
zvesela
zvon
zvrat
zvukovod
zvyk`.split('\n'));

    /** English BIP39 wordlist. */
    const wordlist$7 = /* @__PURE__ */ Object.freeze(`abandon
ability
able
about
above
absent
absorb
abstract
absurd
abuse
access
accident
account
accuse
achieve
acid
acoustic
acquire
across
act
action
actor
actress
actual
adapt
add
addict
address
adjust
admit
adult
advance
advice
aerobic
affair
afford
afraid
again
age
agent
agree
ahead
aim
air
airport
aisle
alarm
album
alcohol
alert
alien
all
alley
allow
almost
alone
alpha
already
also
alter
always
amateur
amazing
among
amount
amused
analyst
anchor
ancient
anger
angle
angry
animal
ankle
announce
annual
another
answer
antenna
antique
anxiety
any
apart
apology
appear
apple
approve
april
arch
arctic
area
arena
argue
arm
armed
armor
army
around
arrange
arrest
arrive
arrow
art
artefact
artist
artwork
ask
aspect
assault
asset
assist
assume
asthma
athlete
atom
attack
attend
attitude
attract
auction
audit
august
aunt
author
auto
autumn
average
avocado
avoid
awake
aware
away
awesome
awful
awkward
axis
baby
bachelor
bacon
badge
bag
balance
balcony
ball
bamboo
banana
banner
bar
barely
bargain
barrel
base
basic
basket
battle
beach
bean
beauty
because
become
beef
before
begin
behave
behind
believe
below
belt
bench
benefit
best
betray
better
between
beyond
bicycle
bid
bike
bind
biology
bird
birth
bitter
black
blade
blame
blanket
blast
bleak
bless
blind
blood
blossom
blouse
blue
blur
blush
board
boat
body
boil
bomb
bone
bonus
book
boost
border
boring
borrow
boss
bottom
bounce
box
boy
bracket
brain
brand
brass
brave
bread
breeze
brick
bridge
brief
bright
bring
brisk
broccoli
broken
bronze
broom
brother
brown
brush
bubble
buddy
budget
buffalo
build
bulb
bulk
bullet
bundle
bunker
burden
burger
burst
bus
business
busy
butter
buyer
buzz
cabbage
cabin
cable
cactus
cage
cake
call
calm
camera
camp
can
canal
cancel
candy
cannon
canoe
canvas
canyon
capable
capital
captain
car
carbon
card
cargo
carpet
carry
cart
case
cash
casino
castle
casual
cat
catalog
catch
category
cattle
caught
cause
caution
cave
ceiling
celery
cement
census
century
cereal
certain
chair
chalk
champion
change
chaos
chapter
charge
chase
chat
cheap
check
cheese
chef
cherry
chest
chicken
chief
child
chimney
choice
choose
chronic
chuckle
chunk
churn
cigar
cinnamon
circle
citizen
city
civil
claim
clap
clarify
claw
clay
clean
clerk
clever
click
client
cliff
climb
clinic
clip
clock
clog
close
cloth
cloud
clown
club
clump
cluster
clutch
coach
coast
coconut
code
coffee
coil
coin
collect
color
column
combine
come
comfort
comic
common
company
concert
conduct
confirm
congress
connect
consider
control
convince
cook
cool
copper
copy
coral
core
corn
correct
cost
cotton
couch
country
couple
course
cousin
cover
coyote
crack
cradle
craft
cram
crane
crash
crater
crawl
crazy
cream
credit
creek
crew
cricket
crime
crisp
critic
crop
cross
crouch
crowd
crucial
cruel
cruise
crumble
crunch
crush
cry
crystal
cube
culture
cup
cupboard
curious
current
curtain
curve
cushion
custom
cute
cycle
dad
damage
damp
dance
danger
daring
dash
daughter
dawn
day
deal
debate
debris
decade
december
decide
decline
decorate
decrease
deer
defense
define
defy
degree
delay
deliver
demand
demise
denial
dentist
deny
depart
depend
deposit
depth
deputy
derive
describe
desert
design
desk
despair
destroy
detail
detect
develop
device
devote
diagram
dial
diamond
diary
dice
diesel
diet
differ
digital
dignity
dilemma
dinner
dinosaur
direct
dirt
disagree
discover
disease
dish
dismiss
disorder
display
distance
divert
divide
divorce
dizzy
doctor
document
dog
doll
dolphin
domain
donate
donkey
donor
door
dose
double
dove
draft
dragon
drama
drastic
draw
dream
dress
drift
drill
drink
drip
drive
drop
drum
dry
duck
dumb
dune
during
dust
dutch
duty
dwarf
dynamic
eager
eagle
early
earn
earth
easily
east
easy
echo
ecology
economy
edge
edit
educate
effort
egg
eight
either
elbow
elder
electric
elegant
element
elephant
elevator
elite
else
embark
embody
embrace
emerge
emotion
employ
empower
empty
enable
enact
end
endless
endorse
enemy
energy
enforce
engage
engine
enhance
enjoy
enlist
enough
enrich
enroll
ensure
enter
entire
entry
envelope
episode
equal
equip
era
erase
erode
erosion
error
erupt
escape
essay
essence
estate
eternal
ethics
evidence
evil
evoke
evolve
exact
example
excess
exchange
excite
exclude
excuse
execute
exercise
exhaust
exhibit
exile
exist
exit
exotic
expand
expect
expire
explain
expose
express
extend
extra
eye
eyebrow
fabric
face
faculty
fade
faint
faith
fall
false
fame
family
famous
fan
fancy
fantasy
farm
fashion
fat
fatal
father
fatigue
fault
favorite
feature
february
federal
fee
feed
feel
female
fence
festival
fetch
fever
few
fiber
fiction
field
figure
file
film
filter
final
find
fine
finger
finish
fire
firm
first
fiscal
fish
fit
fitness
fix
flag
flame
flash
flat
flavor
flee
flight
flip
float
flock
floor
flower
fluid
flush
fly
foam
focus
fog
foil
fold
follow
food
foot
force
forest
forget
fork
fortune
forum
forward
fossil
foster
found
fox
fragile
frame
frequent
fresh
friend
fringe
frog
front
frost
frown
frozen
fruit
fuel
fun
funny
furnace
fury
future
gadget
gain
galaxy
gallery
game
gap
garage
garbage
garden
garlic
garment
gas
gasp
gate
gather
gauge
gaze
general
genius
genre
gentle
genuine
gesture
ghost
giant
gift
giggle
ginger
giraffe
girl
give
glad
glance
glare
glass
glide
glimpse
globe
gloom
glory
glove
glow
glue
goat
goddess
gold
good
goose
gorilla
gospel
gossip
govern
gown
grab
grace
grain
grant
grape
grass
gravity
great
green
grid
grief
grit
grocery
group
grow
grunt
guard
guess
guide
guilt
guitar
gun
gym
habit
hair
half
hammer
hamster
hand
happy
harbor
hard
harsh
harvest
hat
have
hawk
hazard
head
health
heart
heavy
hedgehog
height
hello
helmet
help
hen
hero
hidden
high
hill
hint
hip
hire
history
hobby
hockey
hold
hole
holiday
hollow
home
honey
hood
hope
horn
horror
horse
hospital
host
hotel
hour
hover
hub
huge
human
humble
humor
hundred
hungry
hunt
hurdle
hurry
hurt
husband
hybrid
ice
icon
idea
identify
idle
ignore
ill
illegal
illness
image
imitate
immense
immune
impact
impose
improve
impulse
inch
include
income
increase
index
indicate
indoor
industry
infant
inflict
inform
inhale
inherit
initial
inject
injury
inmate
inner
innocent
input
inquiry
insane
insect
inside
inspire
install
intact
interest
into
invest
invite
involve
iron
island
isolate
issue
item
ivory
jacket
jaguar
jar
jazz
jealous
jeans
jelly
jewel
job
join
joke
journey
joy
judge
juice
jump
jungle
junior
junk
just
kangaroo
keen
keep
ketchup
key
kick
kid
kidney
kind
kingdom
kiss
kit
kitchen
kite
kitten
kiwi
knee
knife
knock
know
lab
label
labor
ladder
lady
lake
lamp
language
laptop
large
later
latin
laugh
laundry
lava
law
lawn
lawsuit
layer
lazy
leader
leaf
learn
leave
lecture
left
leg
legal
legend
leisure
lemon
lend
length
lens
leopard
lesson
letter
level
liar
liberty
library
license
life
lift
light
like
limb
limit
link
lion
liquid
list
little
live
lizard
load
loan
lobster
local
lock
logic
lonely
long
loop
lottery
loud
lounge
love
loyal
lucky
luggage
lumber
lunar
lunch
luxury
lyrics
machine
mad
magic
magnet
maid
mail
main
major
make
mammal
man
manage
mandate
mango
mansion
manual
maple
marble
march
margin
marine
market
marriage
mask
mass
master
match
material
math
matrix
matter
maximum
maze
meadow
mean
measure
meat
mechanic
medal
media
melody
melt
member
memory
mention
menu
mercy
merge
merit
merry
mesh
message
metal
method
middle
midnight
milk
million
mimic
mind
minimum
minor
minute
miracle
mirror
misery
miss
mistake
mix
mixed
mixture
mobile
model
modify
mom
moment
monitor
monkey
monster
month
moon
moral
more
morning
mosquito
mother
motion
motor
mountain
mouse
move
movie
much
muffin
mule
multiply
muscle
museum
mushroom
music
must
mutual
myself
mystery
myth
naive
name
napkin
narrow
nasty
nation
nature
near
neck
need
negative
neglect
neither
nephew
nerve
nest
net
network
neutral
never
news
next
nice
night
noble
noise
nominee
noodle
normal
north
nose
notable
note
nothing
notice
novel
now
nuclear
number
nurse
nut
oak
obey
object
oblige
obscure
observe
obtain
obvious
occur
ocean
october
odor
off
offer
office
often
oil
okay
old
olive
olympic
omit
once
one
onion
online
only
open
opera
opinion
oppose
option
orange
orbit
orchard
order
ordinary
organ
orient
original
orphan
ostrich
other
outdoor
outer
output
outside
oval
oven
over
own
owner
oxygen
oyster
ozone
pact
paddle
page
pair
palace
palm
panda
panel
panic
panther
paper
parade
parent
park
parrot
party
pass
patch
path
patient
patrol
pattern
pause
pave
payment
peace
peanut
pear
peasant
pelican
pen
penalty
pencil
people
pepper
perfect
permit
person
pet
phone
photo
phrase
physical
piano
picnic
picture
piece
pig
pigeon
pill
pilot
pink
pioneer
pipe
pistol
pitch
pizza
place
planet
plastic
plate
play
please
pledge
pluck
plug
plunge
poem
poet
point
polar
pole
police
pond
pony
pool
popular
portion
position
possible
post
potato
pottery
poverty
powder
power
practice
praise
predict
prefer
prepare
present
pretty
prevent
price
pride
primary
print
priority
prison
private
prize
problem
process
produce
profit
program
project
promote
proof
property
prosper
protect
proud
provide
public
pudding
pull
pulp
pulse
pumpkin
punch
pupil
puppy
purchase
purity
purpose
purse
push
put
puzzle
pyramid
quality
quantum
quarter
question
quick
quit
quiz
quote
rabbit
raccoon
race
rack
radar
radio
rail
rain
raise
rally
ramp
ranch
random
range
rapid
rare
rate
rather
raven
raw
razor
ready
real
reason
rebel
rebuild
recall
receive
recipe
record
recycle
reduce
reflect
reform
refuse
region
regret
regular
reject
relax
release
relief
rely
remain
remember
remind
remove
render
renew
rent
reopen
repair
repeat
replace
report
require
rescue
resemble
resist
resource
response
result
retire
retreat
return
reunion
reveal
review
reward
rhythm
rib
ribbon
rice
rich
ride
ridge
rifle
right
rigid
ring
riot
ripple
risk
ritual
rival
river
road
roast
robot
robust
rocket
romance
roof
rookie
room
rose
rotate
rough
round
route
royal
rubber
rude
rug
rule
run
runway
rural
sad
saddle
sadness
safe
sail
salad
salmon
salon
salt
salute
same
sample
sand
satisfy
satoshi
sauce
sausage
save
say
scale
scan
scare
scatter
scene
scheme
school
science
scissors
scorpion
scout
scrap
screen
script
scrub
sea
search
season
seat
second
secret
section
security
seed
seek
segment
select
sell
seminar
senior
sense
sentence
series
service
session
settle
setup
seven
shadow
shaft
shallow
share
shed
shell
sheriff
shield
shift
shine
ship
shiver
shock
shoe
shoot
shop
short
shoulder
shove
shrimp
shrug
shuffle
shy
sibling
sick
side
siege
sight
sign
silent
silk
silly
silver
similar
simple
since
sing
siren
sister
situate
six
size
skate
sketch
ski
skill
skin
skirt
skull
slab
slam
sleep
slender
slice
slide
slight
slim
slogan
slot
slow
slush
small
smart
smile
smoke
smooth
snack
snake
snap
sniff
snow
soap
soccer
social
sock
soda
soft
solar
soldier
solid
solution
solve
someone
song
soon
sorry
sort
soul
sound
soup
source
south
space
spare
spatial
spawn
speak
special
speed
spell
spend
sphere
spice
spider
spike
spin
spirit
split
spoil
sponsor
spoon
sport
spot
spray
spread
spring
spy
square
squeeze
squirrel
stable
stadium
staff
stage
stairs
stamp
stand
start
state
stay
steak
steel
stem
step
stereo
stick
still
sting
stock
stomach
stone
stool
story
stove
strategy
street
strike
strong
struggle
student
stuff
stumble
style
subject
submit
subway
success
such
sudden
suffer
sugar
suggest
suit
summer
sun
sunny
sunset
super
supply
supreme
sure
surface
surge
surprise
surround
survey
suspect
sustain
swallow
swamp
swap
swarm
swear
sweet
swift
swim
swing
switch
sword
symbol
symptom
syrup
system
table
tackle
tag
tail
talent
talk
tank
tape
target
task
taste
tattoo
taxi
teach
team
tell
ten
tenant
tennis
tent
term
test
text
thank
that
theme
then
theory
there
they
thing
this
thought
three
thrive
throw
thumb
thunder
ticket
tide
tiger
tilt
timber
time
tiny
tip
tired
tissue
title
toast
tobacco
today
toddler
toe
together
toilet
token
tomato
tomorrow
tone
tongue
tonight
tool
tooth
top
topic
topple
torch
tornado
tortoise
toss
total
tourist
toward
tower
town
toy
track
trade
traffic
tragic
train
transfer
trap
trash
travel
tray
treat
tree
trend
trial
tribe
trick
trigger
trim
trip
trophy
trouble
truck
true
truly
trumpet
trust
truth
try
tube
tuition
tumble
tuna
tunnel
turkey
turn
turtle
twelve
twenty
twice
twin
twist
two
type
typical
ugly
umbrella
unable
unaware
uncle
uncover
under
undo
unfair
unfold
unhappy
uniform
unique
unit
universe
unknown
unlock
until
unusual
unveil
update
upgrade
uphold
upon
upper
upset
urban
urge
usage
use
used
useful
useless
usual
utility
vacant
vacuum
vague
valid
valley
valve
van
vanish
vapor
various
vast
vault
vehicle
velvet
vendor
venture
venue
verb
verify
version
very
vessel
veteran
viable
vibrant
vicious
victory
video
view
village
vintage
violin
virtual
virus
visa
visit
visual
vital
vivid
vocal
voice
void
volcano
volume
vote
voyage
wage
wagon
wait
walk
wall
walnut
want
warfare
warm
warrior
wash
wasp
waste
water
wave
way
wealth
weapon
wear
weasel
weather
web
wedding
weekend
weird
welcome
west
wet
whale
what
wheat
wheel
when
where
whip
whisper
wide
width
wife
wild
will
win
window
wine
wing
wink
winner
winter
wire
wisdom
wise
wish
witness
wolf
woman
wonder
wood
wool
word
work
world
worry
worth
wrap
wreck
wrestle
wrist
write
wrong
yard
year
yellow
you
young
youth
zebra
zero
zone
zoo`.split('\n'));

    /** French BIP39 wordlist. */
    const wordlist$6 = /* @__PURE__ */ Object.freeze(`abaisser
abandon
abdiquer
abeille
abolir
aborder
aboutir
aboyer
abrasif
abreuver
abriter
abroger
abrupt
absence
absolu
absurde
abusif
abyssal
académie
acajou
acarien
accabler
accepter
acclamer
accolade
accroche
accuser
acerbe
achat
acheter
aciduler
acier
acompte
acquérir
acronyme
acteur
actif
actuel
adepte
adéquat
adhésif
adjectif
adjuger
admettre
admirer
adopter
adorer
adoucir
adresse
adroit
adulte
adverbe
aérer
aéronef
affaire
affecter
affiche
affreux
affubler
agacer
agencer
agile
agiter
agrafer
agréable
agrume
aider
aiguille
ailier
aimable
aisance
ajouter
ajuster
alarmer
alchimie
alerte
algèbre
algue
aliéner
aliment
alléger
alliage
allouer
allumer
alourdir
alpaga
altesse
alvéole
amateur
ambigu
ambre
aménager
amertume
amidon
amiral
amorcer
amour
amovible
amphibie
ampleur
amusant
analyse
anaphore
anarchie
anatomie
ancien
anéantir
angle
angoisse
anguleux
animal
annexer
annonce
annuel
anodin
anomalie
anonyme
anormal
antenne
antidote
anxieux
apaiser
apéritif
aplanir
apologie
appareil
appeler
apporter
appuyer
aquarium
aqueduc
arbitre
arbuste
ardeur
ardoise
argent
arlequin
armature
armement
armoire
armure
arpenter
arracher
arriver
arroser
arsenic
artériel
article
aspect
asphalte
aspirer
assaut
asservir
assiette
associer
assurer
asticot
astre
astuce
atelier
atome
atrium
atroce
attaque
attentif
attirer
attraper
aubaine
auberge
audace
audible
augurer
aurore
automne
autruche
avaler
avancer
avarice
avenir
averse
aveugle
aviateur
avide
avion
aviser
avoine
avouer
avril
axial
axiome
badge
bafouer
bagage
baguette
baignade
balancer
balcon
baleine
balisage
bambin
bancaire
bandage
banlieue
bannière
banquier
barbier
baril
baron
barque
barrage
bassin
bastion
bataille
bateau
batterie
baudrier
bavarder
belette
bélier
belote
bénéfice
berceau
berger
berline
bermuda
besace
besogne
bétail
beurre
biberon
bicycle
bidule
bijou
bilan
bilingue
billard
binaire
biologie
biopsie
biotype
biscuit
bison
bistouri
bitume
bizarre
blafard
blague
blanchir
blessant
blinder
blond
bloquer
blouson
bobard
bobine
boire
boiser
bolide
bonbon
bondir
bonheur
bonifier
bonus
bordure
borne
botte
boucle
boueux
bougie
boulon
bouquin
bourse
boussole
boutique
boxeur
branche
brasier
brave
brebis
brèche
breuvage
bricoler
brigade
brillant
brioche
brique
brochure
broder
bronzer
brousse
broyeur
brume
brusque
brutal
bruyant
buffle
buisson
bulletin
bureau
burin
bustier
butiner
butoir
buvable
buvette
cabanon
cabine
cachette
cadeau
cadre
caféine
caillou
caisson
calculer
calepin
calibre
calmer
calomnie
calvaire
camarade
caméra
camion
campagne
canal
caneton
canon
cantine
canular
capable
caporal
caprice
capsule
capter
capuche
carabine
carbone
caresser
caribou
carnage
carotte
carreau
carton
cascade
casier
casque
cassure
causer
caution
cavalier
caverne
caviar
cédille
ceinture
céleste
cellule
cendrier
censurer
central
cercle
cérébral
cerise
cerner
cerveau
cesser
chagrin
chaise
chaleur
chambre
chance
chapitre
charbon
chasseur
chaton
chausson
chavirer
chemise
chenille
chéquier
chercher
cheval
chien
chiffre
chignon
chimère
chiot
chlorure
chocolat
choisir
chose
chouette
chrome
chute
cigare
cigogne
cimenter
cinéma
cintrer
circuler
cirer
cirque
citerne
citoyen
citron
civil
clairon
clameur
claquer
classe
clavier
client
cligner
climat
clivage
cloche
clonage
cloporte
cobalt
cobra
cocasse
cocotier
coder
codifier
coffre
cogner
cohésion
coiffer
coincer
colère
colibri
colline
colmater
colonel
combat
comédie
commande
compact
concert
conduire
confier
congeler
connoter
consonne
contact
convexe
copain
copie
corail
corbeau
cordage
corniche
corpus
correct
cortège
cosmique
costume
coton
coude
coupure
courage
couteau
couvrir
coyote
crabe
crainte
cravate
crayon
créature
créditer
crémeux
creuser
crevette
cribler
crier
cristal
critère
croire
croquer
crotale
crucial
cruel
crypter
cubique
cueillir
cuillère
cuisine
cuivre
culminer
cultiver
cumuler
cupide
curatif
curseur
cyanure
cycle
cylindre
cynique
daigner
damier
danger
danseur
dauphin
débattre
débiter
déborder
débrider
débutant
décaler
décembre
déchirer
décider
déclarer
décorer
décrire
décupler
dédale
déductif
déesse
défensif
défiler
défrayer
dégager
dégivrer
déglutir
dégrafer
déjeuner
délice
déloger
demander
demeurer
démolir
dénicher
dénouer
dentelle
dénuder
départ
dépenser
déphaser
déplacer
déposer
déranger
dérober
désastre
descente
désert
désigner
désobéir
dessiner
destrier
détacher
détester
détourer
détresse
devancer
devenir
deviner
devoir
diable
dialogue
diamant
dicter
différer
digérer
digital
digne
diluer
dimanche
diminuer
dioxyde
directif
diriger
discuter
disposer
dissiper
distance
divertir
diviser
docile
docteur
dogme
doigt
domaine
domicile
dompter
donateur
donjon
donner
dopamine
dortoir
dorure
dosage
doseur
dossier
dotation
douanier
double
douceur
douter
doyen
dragon
draper
dresser
dribbler
droiture
duperie
duplexe
durable
durcir
dynastie
éblouir
écarter
écharpe
échelle
éclairer
éclipse
éclore
écluse
école
économie
écorce
écouter
écraser
écrémer
écrivain
écrou
écume
écureuil
édifier
éduquer
effacer
effectif
effigie
effort
effrayer
effusion
égaliser
égarer
éjecter
élaborer
élargir
électron
élégant
éléphant
élève
éligible
élitisme
éloge
élucider
éluder
emballer
embellir
embryon
émeraude
émission
emmener
émotion
émouvoir
empereur
employer
emporter
emprise
émulsion
encadrer
enchère
enclave
encoche
endiguer
endosser
endroit
enduire
énergie
enfance
enfermer
enfouir
engager
engin
englober
énigme
enjamber
enjeu
enlever
ennemi
ennuyeux
enrichir
enrobage
enseigne
entasser
entendre
entier
entourer
entraver
énumérer
envahir
enviable
envoyer
enzyme
éolien
épaissir
épargne
épatant
épaule
épicerie
épidémie
épier
épilogue
épine
épisode
épitaphe
époque
épreuve
éprouver
épuisant
équerre
équipe
ériger
érosion
erreur
éruption
escalier
espadon
espèce
espiègle
espoir
esprit
esquiver
essayer
essence
essieu
essorer
estime
estomac
estrade
étagère
étaler
étanche
étatique
éteindre
étendoir
éternel
éthanol
éthique
ethnie
étirer
étoffer
étoile
étonnant
étourdir
étrange
étroit
étude
euphorie
évaluer
évasion
éventail
évidence
éviter
évolutif
évoquer
exact
exagérer
exaucer
exceller
excitant
exclusif
excuse
exécuter
exemple
exercer
exhaler
exhorter
exigence
exiler
exister
exotique
expédier
explorer
exposer
exprimer
exquis
extensif
extraire
exulter
fable
fabuleux
facette
facile
facture
faiblir
falaise
fameux
famille
farceur
farfelu
farine
farouche
fasciner
fatal
fatigue
faucon
fautif
faveur
favori
fébrile
féconder
fédérer
félin
femme
fémur
fendoir
féodal
fermer
féroce
ferveur
festival
feuille
feutre
février
fiasco
ficeler
fictif
fidèle
figure
filature
filetage
filière
filleul
filmer
filou
filtrer
financer
finir
fiole
firme
fissure
fixer
flairer
flamme
flasque
flatteur
fléau
flèche
fleur
flexion
flocon
flore
fluctuer
fluide
fluvial
folie
fonderie
fongible
fontaine
forcer
forgeron
formuler
fortune
fossile
foudre
fougère
fouiller
foulure
fourmi
fragile
fraise
franchir
frapper
frayeur
frégate
freiner
frelon
frémir
frénésie
frère
friable
friction
frisson
frivole
froid
fromage
frontal
frotter
fruit
fugitif
fuite
fureur
furieux
furtif
fusion
futur
gagner
galaxie
galerie
gambader
garantir
gardien
garnir
garrigue
gazelle
gazon
géant
gélatine
gélule
gendarme
général
génie
genou
gentil
géologie
géomètre
géranium
germe
gestuel
geyser
gibier
gicler
girafe
givre
glace
glaive
glisser
globe
gloire
glorieux
golfeur
gomme
gonfler
gorge
gorille
goudron
gouffre
goulot
goupille
gourmand
goutte
graduel
graffiti
graine
grand
grappin
gratuit
gravir
grenat
griffure
griller
grimper
grogner
gronder
grotte
groupe
gruger
grutier
gruyère
guépard
guerrier
guide
guimauve
guitare
gustatif
gymnaste
gyrostat
habitude
hachoir
halte
hameau
hangar
hanneton
haricot
harmonie
harpon
hasard
hélium
hématome
herbe
hérisson
hermine
héron
hésiter
heureux
hiberner
hibou
hilarant
histoire
hiver
homard
hommage
homogène
honneur
honorer
honteux
horde
horizon
horloge
hormone
horrible
houleux
housse
hublot
huileux
humain
humble
humide
humour
hurler
hydromel
hygiène
hymne
hypnose
idylle
ignorer
iguane
illicite
illusion
image
imbiber
imiter
immense
immobile
immuable
impact
impérial
implorer
imposer
imprimer
imputer
incarner
incendie
incident
incliner
incolore
indexer
indice
inductif
inédit
ineptie
inexact
infini
infliger
informer
infusion
ingérer
inhaler
inhiber
injecter
injure
innocent
inoculer
inonder
inscrire
insecte
insigne
insolite
inspirer
instinct
insulter
intact
intense
intime
intrigue
intuitif
inutile
invasion
inventer
inviter
invoquer
ironique
irradier
irréel
irriter
isoler
ivoire
ivresse
jaguar
jaillir
jambe
janvier
jardin
jauger
jaune
javelot
jetable
jeton
jeudi
jeunesse
joindre
joncher
jongler
joueur
jouissif
journal
jovial
joyau
joyeux
jubiler
jugement
junior
jupon
juriste
justice
juteux
juvénile
kayak
kimono
kiosque
label
labial
labourer
lacérer
lactose
lagune
laine
laisser
laitier
lambeau
lamelle
lampe
lanceur
langage
lanterne
lapin
largeur
larme
laurier
lavabo
lavoir
lecture
légal
léger
légume
lessive
lettre
levier
lexique
lézard
liasse
libérer
libre
licence
licorne
liège
lièvre
ligature
ligoter
ligue
limer
limite
limonade
limpide
linéaire
lingot
lionceau
liquide
lisière
lister
lithium
litige
littoral
livreur
logique
lointain
loisir
lombric
loterie
louer
lourd
loutre
louve
loyal
lubie
lucide
lucratif
lueur
lugubre
luisant
lumière
lunaire
lundi
luron
lutter
luxueux
machine
magasin
magenta
magique
maigre
maillon
maintien
mairie
maison
majorer
malaxer
maléfice
malheur
malice
mallette
mammouth
mandater
maniable
manquant
manteau
manuel
marathon
marbre
marchand
mardi
maritime
marqueur
marron
marteler
mascotte
massif
matériel
matière
matraque
maudire
maussade
mauve
maximal
méchant
méconnu
médaille
médecin
méditer
méduse
meilleur
mélange
mélodie
membre
mémoire
menacer
mener
menhir
mensonge
mentor
mercredi
mérite
merle
messager
mesure
métal
météore
méthode
métier
meuble
miauler
microbe
miette
mignon
migrer
milieu
million
mimique
mince
minéral
minimal
minorer
minute
miracle
miroiter
missile
mixte
mobile
moderne
moelleux
mondial
moniteur
monnaie
monotone
monstre
montagne
monument
moqueur
morceau
morsure
mortier
moteur
motif
mouche
moufle
moulin
mousson
mouton
mouvant
multiple
munition
muraille
murène
murmure
muscle
muséum
musicien
mutation
muter
mutuel
myriade
myrtille
mystère
mythique
nageur
nappe
narquois
narrer
natation
nation
nature
naufrage
nautique
navire
nébuleux
nectar
néfaste
négation
négliger
négocier
neige
nerveux
nettoyer
neurone
neutron
neveu
niche
nickel
nitrate
niveau
noble
nocif
nocturne
noirceur
noisette
nomade
nombreux
nommer
normatif
notable
notifier
notoire
nourrir
nouveau
novateur
novembre
novice
nuage
nuancer
nuire
nuisible
numéro
nuptial
nuque
nutritif
obéir
objectif
obliger
obscur
observer
obstacle
obtenir
obturer
occasion
occuper
océan
octobre
octroyer
octupler
oculaire
odeur
odorant
offenser
officier
offrir
ogive
oiseau
oisillon
olfactif
olivier
ombrage
omettre
onctueux
onduler
onéreux
onirique
opale
opaque
opérer
opinion
opportun
opprimer
opter
optique
orageux
orange
orbite
ordonner
oreille
organe
orgueil
orifice
ornement
orque
ortie
osciller
osmose
ossature
otarie
ouragan
ourson
outil
outrager
ouvrage
ovation
oxyde
oxygène
ozone
paisible
palace
palmarès
palourde
palper
panache
panda
pangolin
paniquer
panneau
panorama
pantalon
papaye
papier
papoter
papyrus
paradoxe
parcelle
paresse
parfumer
parler
parole
parrain
parsemer
partager
parure
parvenir
passion
pastèque
paternel
patience
patron
pavillon
pavoiser
payer
paysage
peigne
peintre
pelage
pélican
pelle
pelouse
peluche
pendule
pénétrer
pénible
pensif
pénurie
pépite
péplum
perdrix
perforer
période
permuter
perplexe
persil
perte
peser
pétale
petit
pétrir
peuple
pharaon
phobie
phoque
photon
phrase
physique
piano
pictural
pièce
pierre
pieuvre
pilote
pinceau
pipette
piquer
pirogue
piscine
piston
pivoter
pixel
pizza
placard
plafond
plaisir
planer
plaque
plastron
plateau
pleurer
plexus
pliage
plomb
plonger
pluie
plumage
pochette
poésie
poète
pointe
poirier
poisson
poivre
polaire
policier
pollen
polygone
pommade
pompier
ponctuel
pondérer
poney
portique
position
posséder
posture
potager
poteau
potion
pouce
poulain
poumon
pourpre
poussin
pouvoir
prairie
pratique
précieux
prédire
préfixe
prélude
prénom
présence
prétexte
prévoir
primitif
prince
prison
priver
problème
procéder
prodige
profond
progrès
proie
projeter
prologue
promener
propre
prospère
protéger
prouesse
proverbe
prudence
pruneau
psychose
public
puceron
puiser
pulpe
pulsar
punaise
punitif
pupitre
purifier
puzzle
pyramide
quasar
querelle
question
quiétude
quitter
quotient
racine
raconter
radieux
ragondin
raideur
raisin
ralentir
rallonge
ramasser
rapide
rasage
ratisser
ravager
ravin
rayonner
réactif
réagir
réaliser
réanimer
recevoir
réciter
réclamer
récolter
recruter
reculer
recycler
rédiger
redouter
refaire
réflexe
réformer
refrain
refuge
régalien
région
réglage
régulier
réitérer
rejeter
rejouer
relatif
relever
relief
remarque
remède
remise
remonter
remplir
remuer
renard
renfort
renifler
renoncer
rentrer
renvoi
replier
reporter
reprise
reptile
requin
réserve
résineux
résoudre
respect
rester
résultat
rétablir
retenir
réticule
retomber
retracer
réunion
réussir
revanche
revivre
révolte
révulsif
richesse
rideau
rieur
rigide
rigoler
rincer
riposter
risible
risque
rituel
rival
rivière
rocheux
romance
rompre
ronce
rondin
roseau
rosier
rotatif
rotor
rotule
rouge
rouille
rouleau
routine
royaume
ruban
rubis
ruche
ruelle
rugueux
ruiner
ruisseau
ruser
rustique
rythme
sabler
saboter
sabre
sacoche
safari
sagesse
saisir
salade
salive
salon
saluer
samedi
sanction
sanglier
sarcasme
sardine
saturer
saugrenu
saumon
sauter
sauvage
savant
savonner
scalpel
scandale
scélérat
scénario
sceptre
schéma
science
scinder
score
scrutin
sculpter
séance
sécable
sécher
secouer
sécréter
sédatif
séduire
seigneur
séjour
sélectif
semaine
sembler
semence
séminal
sénateur
sensible
sentence
séparer
séquence
serein
sergent
sérieux
serrure
sérum
service
sésame
sévir
sevrage
sextuple
sidéral
siècle
siéger
siffler
sigle
signal
silence
silicium
simple
sincère
sinistre
siphon
sirop
sismique
situer
skier
social
socle
sodium
soigneux
soldat
soleil
solitude
soluble
sombre
sommeil
somnoler
sonde
songeur
sonnette
sonore
sorcier
sortir
sosie
sottise
soucieux
soudure
souffle
soulever
soupape
source
soutirer
souvenir
spacieux
spatial
spécial
sphère
spiral
stable
station
sternum
stimulus
stipuler
strict
studieux
stupeur
styliste
sublime
substrat
subtil
subvenir
succès
sucre
suffixe
suggérer
suiveur
sulfate
superbe
supplier
surface
suricate
surmener
surprise
sursaut
survie
suspect
syllabe
symbole
symétrie
synapse
syntaxe
système
tabac
tablier
tactile
tailler
talent
talisman
talonner
tambour
tamiser
tangible
tapis
taquiner
tarder
tarif
tartine
tasse
tatami
tatouage
taupe
taureau
taxer
témoin
temporel
tenaille
tendre
teneur
tenir
tension
terminer
terne
terrible
tétine
texte
thème
théorie
thérapie
thorax
tibia
tiède
timide
tirelire
tiroir
tissu
titane
titre
tituber
toboggan
tolérant
tomate
tonique
tonneau
toponyme
torche
tordre
tornade
torpille
torrent
torse
tortue
totem
toucher
tournage
tousser
toxine
traction
trafic
tragique
trahir
train
trancher
travail
trèfle
tremper
trésor
treuil
triage
tribunal
tricoter
trilogie
triomphe
tripler
triturer
trivial
trombone
tronc
tropical
troupeau
tuile
tulipe
tumulte
tunnel
turbine
tuteur
tutoyer
tuyau
tympan
typhon
typique
tyran
ubuesque
ultime
ultrason
unanime
unifier
union
unique
unitaire
univers
uranium
urbain
urticant
usage
usine
usuel
usure
utile
utopie
vacarme
vaccin
vagabond
vague
vaillant
vaincre
vaisseau
valable
valise
vallon
valve
vampire
vanille
vapeur
varier
vaseux
vassal
vaste
vecteur
vedette
végétal
véhicule
veinard
véloce
vendredi
vénérer
venger
venimeux
ventouse
verdure
vérin
vernir
verrou
verser
vertu
veston
vétéran
vétuste
vexant
vexer
viaduc
viande
victoire
vidange
vidéo
vignette
vigueur
vilain
village
vinaigre
violon
vipère
virement
virtuose
virus
visage
viseur
vision
visqueux
visuel
vital
vitesse
viticole
vitrine
vivace
vivipare
vocation
voguer
voile
voisin
voiture
volaille
volcan
voltiger
volume
vorace
vortex
voter
vouloir
voyage
voyelle
wagon
xénon
yacht
zèbre
zénith
zeste
zoologie`.split('\n'));

    /** Italian BIP39 wordlist. */
    const wordlist$5 = /* @__PURE__ */ Object.freeze(`abaco
abbaglio
abbinato
abete
abisso
abolire
abrasivo
abrogato
accadere
accenno
accusato
acetone
achille
acido
acqua
acre
acrilico
acrobata
acuto
adagio
addebito
addome
adeguato
aderire
adipe
adottare
adulare
affabile
affetto
affisso
affranto
aforisma
afoso
africano
agave
agente
agevole
aggancio
agire
agitare
agonismo
agricolo
agrumeto
aguzzo
alabarda
alato
albatro
alberato
albo
albume
alce
alcolico
alettone
alfa
algebra
aliante
alibi
alimento
allagato
allegro
allievo
allodola
allusivo
almeno
alogeno
alpaca
alpestre
altalena
alterno
alticcio
altrove
alunno
alveolo
alzare
amalgama
amanita
amarena
ambito
ambrato
ameba
america
ametista
amico
ammasso
ammenda
ammirare
ammonito
amore
ampio
ampliare
amuleto
anacardo
anagrafe
analista
anarchia
anatra
anca
ancella
ancora
andare
andrea
anello
angelo
angolare
angusto
anima
annegare
annidato
anno
annuncio
anonimo
anticipo
anzi
apatico
apertura
apode
apparire
appetito
appoggio
approdo
appunto
aprile
arabica
arachide
aragosta
araldica
arancio
aratura
arazzo
arbitro
archivio
ardito
arenile
argento
argine
arguto
aria
armonia
arnese
arredato
arringa
arrosto
arsenico
arso
artefice
arzillo
asciutto
ascolto
asepsi
asettico
asfalto
asino
asola
aspirato
aspro
assaggio
asse
assoluto
assurdo
asta
astenuto
astice
astratto
atavico
ateismo
atomico
atono
attesa
attivare
attorno
attrito
attuale
ausilio
austria
autista
autonomo
autunno
avanzato
avere
avvenire
avviso
avvolgere
azione
azoto
azzimo
azzurro
babele
baccano
bacino
baco
badessa
badilata
bagnato
baita
balcone
baldo
balena
ballata
balzano
bambino
bandire
baraonda
barbaro
barca
baritono
barlume
barocco
basilico
basso
batosta
battuto
baule
bava
bavosa
becco
beffa
belgio
belva
benda
benevole
benigno
benzina
bere
berlina
beta
bibita
bici
bidone
bifido
biga
bilancia
bimbo
binocolo
biologo
bipede
bipolare
birbante
birra
biscotto
bisesto
bisnonno
bisonte
bisturi
bizzarro
blando
blatta
bollito
bonifico
bordo
bosco
botanico
bottino
bozzolo
braccio
bradipo
brama
branca
bravura
bretella
brevetto
brezza
briglia
brillante
brindare
broccolo
brodo
bronzina
brullo
bruno
bubbone
buca
budino
buffone
buio
bulbo
buono
burlone
burrasca
bussola
busta
cadetto
caduco
calamaro
calcolo
calesse
calibro
calmo
caloria
cambusa
camerata
camicia
cammino
camola
campale
canapa
candela
cane
canino
canotto
cantina
capace
capello
capitolo
capogiro
cappero
capra
capsula
carapace
carcassa
cardo
carisma
carovana
carretto
cartolina
casaccio
cascata
caserma
caso
cassone
castello
casuale
catasta
catena
catrame
cauto
cavillo
cedibile
cedrata
cefalo
celebre
cellulare
cena
cenone
centesimo
ceramica
cercare
certo
cerume
cervello
cesoia
cespo
ceto
chela
chiaro
chicca
chiedere
chimera
china
chirurgo
chitarra
ciao
ciclismo
cifrare
cigno
cilindro
ciottolo
circa
cirrosi
citrico
cittadino
ciuffo
civetta
civile
classico
clinica
cloro
cocco
codardo
codice
coerente
cognome
collare
colmato
colore
colposo
coltivato
colza
coma
cometa
commando
comodo
computer
comune
conciso
condurre
conferma
congelare
coniuge
connesso
conoscere
consumo
continuo
convegno
coperto
copione
coppia
copricapo
corazza
cordata
coricato
cornice
corolla
corpo
corredo
corsia
cortese
cosmico
costante
cottura
covato
cratere
cravatta
creato
credere
cremoso
crescita
creta
criceto
crinale
crisi
critico
croce
cronaca
crostata
cruciale
crusca
cucire
cuculo
cugino
cullato
cupola
curatore
cursore
curvo
cuscino
custode
dado
daino
dalmata
damerino
daniela
dannoso
danzare
datato
davanti
davvero
debutto
decennio
deciso
declino
decollo
decreto
dedicato
definito
deforme
degno
delegare
delfino
delirio
delta
demenza
denotato
dentro
deposito
derapata
derivare
deroga
descritto
deserto
desiderio
desumere
detersivo
devoto
diametro
dicembre
diedro
difeso
diffuso
digerire
digitale
diluvio
dinamico
dinnanzi
dipinto
diploma
dipolo
diradare
dire
dirotto
dirupo
disagio
discreto
disfare
disgelo
disposto
distanza
disumano
dito
divano
divelto
dividere
divorato
doblone
docente
doganale
dogma
dolce
domato
domenica
dominare
dondolo
dono
dormire
dote
dottore
dovuto
dozzina
drago
druido
dubbio
dubitare
ducale
duna
duomo
duplice
duraturo
ebano
eccesso
ecco
eclissi
economia
edera
edicola
edile
editoria
educare
egemonia
egli
egoismo
egregio
elaborato
elargire
elegante
elencato
eletto
elevare
elfico
elica
elmo
elsa
eluso
emanato
emblema
emesso
emiro
emotivo
emozione
empirico
emulo
endemico
enduro
energia
enfasi
enoteca
entrare
enzima
epatite
epilogo
episodio
epocale
eppure
equatore
erario
erba
erboso
erede
eremita
erigere
ermetico
eroe
erosivo
errante
esagono
esame
esanime
esaudire
esca
esempio
esercito
esibito
esigente
esistere
esito
esofago
esortato
esoso
espanso
espresso
essenza
esso
esteso
estimare
estonia
estroso
esultare
etilico
etnico
etrusco
etto
euclideo
europa
evaso
evidenza
evitato
evoluto
evviva
fabbrica
faccenda
fachiro
falco
famiglia
fanale
fanfara
fango
fantasma
fare
farfalla
farinoso
farmaco
fascia
fastoso
fasullo
faticare
fato
favoloso
febbre
fecola
fede
fegato
felpa
feltro
femmina
fendere
fenomeno
fermento
ferro
fertile
fessura
festivo
fetta
feudo
fiaba
fiducia
fifa
figurato
filo
finanza
finestra
finire
fiore
fiscale
fisico
fiume
flacone
flamenco
flebo
flemma
florido
fluente
fluoro
fobico
focaccia
focoso
foderato
foglio
folata
folclore
folgore
fondente
fonetico
fonia
fontana
forbito
forchetta
foresta
formica
fornaio
foro
fortezza
forzare
fosfato
fosso
fracasso
frana
frassino
fratello
freccetta
frenata
fresco
frigo
frollino
fronde
frugale
frutta
fucilata
fucsia
fuggente
fulmine
fulvo
fumante
fumetto
fumoso
fune
funzione
fuoco
furbo
furgone
furore
fuso
futile
gabbiano
gaffe
galateo
gallina
galoppo
gambero
gamma
garanzia
garbo
garofano
garzone
gasdotto
gasolio
gastrico
gatto
gaudio
gazebo
gazzella
geco
gelatina
gelso
gemello
gemmato
gene
genitore
gennaio
genotipo
gergo
ghepardo
ghiaccio
ghisa
giallo
gilda
ginepro
giocare
gioiello
giorno
giove
girato
girone
gittata
giudizio
giurato
giusto
globulo
glutine
gnomo
gobba
golf
gomito
gommone
gonfio
gonna
governo
gracile
grado
grafico
grammo
grande
grattare
gravoso
grazia
greca
gregge
grifone
grigio
grinza
grotta
gruppo
guadagno
guaio
guanto
guardare
gufo
guidare
ibernato
icona
identico
idillio
idolo
idra
idrico
idrogeno
igiene
ignaro
ignorato
ilare
illeso
illogico
illudere
imballo
imbevuto
imbocco
imbuto
immane
immerso
immolato
impacco
impeto
impiego
importo
impronta
inalare
inarcare
inattivo
incanto
incendio
inchino
incisivo
incluso
incontro
incrocio
incubo
indagine
india
indole
inedito
infatti
infilare
inflitto
ingaggio
ingegno
inglese
ingordo
ingrosso
innesco
inodore
inoltrare
inondato
insano
insetto
insieme
insonnia
insulina
intasato
intero
intonaco
intuito
inumidire
invalido
invece
invito
iperbole
ipnotico
ipotesi
ippica
iride
irlanda
ironico
irrigato
irrorare
isolato
isotopo
isterico
istituto
istrice
italia
iterare
labbro
labirinto
lacca
lacerato
lacrima
lacuna
laddove
lago
lampo
lancetta
lanterna
lardoso
larga
laringe
lastra
latenza
latino
lattuga
lavagna
lavoro
legale
leggero
lembo
lentezza
lenza
leone
lepre
lesivo
lessato
lesto
letterale
leva
levigato
libero
lido
lievito
lilla
limatura
limitare
limpido
lineare
lingua
liquido
lira
lirica
lisca
lite
litigio
livrea
locanda
lode
logica
lombare
londra
longevo
loquace
lorenzo
loto
lotteria
luce
lucidato
lumaca
luminoso
lungo
lupo
luppolo
lusinga
lusso
lutto
macabro
macchina
macero
macinato
madama
magico
maglia
magnete
magro
maiolica
malafede
malgrado
malinteso
malsano
malto
malumore
mana
mancia
mandorla
mangiare
manifesto
mannaro
manovra
mansarda
mantide
manubrio
mappa
maratona
marcire
maretta
marmo
marsupio
maschera
massaia
mastino
materasso
matricola
mattone
maturo
mazurca
meandro
meccanico
mecenate
medesimo
meditare
mega
melassa
melis
melodia
meninge
meno
mensola
mercurio
merenda
merlo
meschino
mese
messere
mestolo
metallo
metodo
mettere
miagolare
mica
micelio
michele
microbo
midollo
miele
migliore
milano
milite
mimosa
minerale
mini
minore
mirino
mirtillo
miscela
missiva
misto
misurare
mitezza
mitigare
mitra
mittente
mnemonico
modello
modifica
modulo
mogano
mogio
mole
molosso
monastero
monco
mondina
monetario
monile
monotono
monsone
montato
monviso
mora
mordere
morsicato
mostro
motivato
motosega
motto
movenza
movimento
mozzo
mucca
mucosa
muffa
mughetto
mugnaio
mulatto
mulinello
multiplo
mummia
munto
muovere
murale
musa
muscolo
musica
mutevole
muto
nababbo
nafta
nanometro
narciso
narice
narrato
nascere
nastrare
naturale
nautica
naviglio
nebulosa
necrosi
negativo
negozio
nemmeno
neofita
neretto
nervo
nessuno
nettuno
neutrale
neve
nevrotico
nicchia
ninfa
nitido
nobile
nocivo
nodo
nome
nomina
nordico
normale
norvegese
nostrano
notare
notizia
notturno
novella
nucleo
nulla
numero
nuovo
nutrire
nuvola
nuziale
oasi
obbedire
obbligo
obelisco
oblio
obolo
obsoleto
occasione
occhio
occidente
occorrere
occultare
ocra
oculato
odierno
odorare
offerta
offrire
offuscato
oggetto
oggi
ognuno
olandese
olfatto
oliato
oliva
ologramma
oltre
omaggio
ombelico
ombra
omega
omissione
ondoso
onere
onice
onnivoro
onorevole
onta
operato
opinione
opposto
oracolo
orafo
ordine
orecchino
orefice
orfano
organico
origine
orizzonte
orma
ormeggio
ornativo
orologio
orrendo
orribile
ortensia
ortica
orzata
orzo
osare
oscurare
osmosi
ospedale
ospite
ossa
ossidare
ostacolo
oste
otite
otre
ottagono
ottimo
ottobre
ovale
ovest
ovino
oviparo
ovocito
ovunque
ovviare
ozio
pacchetto
pace
pacifico
padella
padrone
paese
paga
pagina
palazzina
palesare
pallido
palo
palude
pandoro
pannello
paolo
paonazzo
paprica
parabola
parcella
parere
pargolo
pari
parlato
parola
partire
parvenza
parziale
passivo
pasticca
patacca
patologia
pattume
pavone
peccato
pedalare
pedonale
peggio
peloso
penare
pendice
penisola
pennuto
penombra
pensare
pentola
pepe
pepita
perbene
percorso
perdonato
perforare
pergamena
periodo
permesso
perno
perplesso
persuaso
pertugio
pervaso
pesatore
pesista
peso
pestifero
petalo
pettine
petulante
pezzo
piacere
pianta
piattino
piccino
picozza
piega
pietra
piffero
pigiama
pigolio
pigro
pila
pilifero
pillola
pilota
pimpante
pineta
pinna
pinolo
pioggia
piombo
piramide
piretico
pirite
pirolisi
pitone
pizzico
placebo
planare
plasma
platano
plenario
pochezza
poderoso
podismo
poesia
poggiare
polenta
poligono
pollice
polmonite
polpetta
polso
poltrona
polvere
pomice
pomodoro
ponte
popoloso
porfido
poroso
porpora
porre
portata
posa
positivo
possesso
postulato
potassio
potere
pranzo
prassi
pratica
precluso
predica
prefisso
pregiato
prelievo
premere
prenotare
preparato
presenza
pretesto
prevalso
prima
principe
privato
problema
procura
produrre
profumo
progetto
prolunga
promessa
pronome
proposta
proroga
proteso
prova
prudente
prugna
prurito
psiche
pubblico
pudica
pugilato
pugno
pulce
pulito
pulsante
puntare
pupazzo
pupilla
puro
quadro
qualcosa
quasi
querela
quota
raccolto
raddoppio
radicale
radunato
raffica
ragazzo
ragione
ragno
ramarro
ramingo
ramo
randagio
rantolare
rapato
rapina
rappreso
rasatura
raschiato
rasente
rassegna
rastrello
rata
ravveduto
reale
recepire
recinto
recluta
recondito
recupero
reddito
redimere
regalato
registro
regola
regresso
relazione
remare
remoto
renna
replica
reprimere
reputare
resa
residente
responso
restauro
rete
retina
retorica
rettifica
revocato
riassunto
ribadire
ribelle
ribrezzo
ricarica
ricco
ricevere
riciclato
ricordo
ricreduto
ridicolo
ridurre
rifasare
riflesso
riforma
rifugio
rigare
rigettato
righello
rilassato
rilevato
rimanere
rimbalzo
rimedio
rimorchio
rinascita
rincaro
rinforzo
rinnovo
rinomato
rinsavito
rintocco
rinuncia
rinvenire
riparato
ripetuto
ripieno
riportare
ripresa
ripulire
risata
rischio
riserva
risibile
riso
rispetto
ristoro
risultato
risvolto
ritardo
ritegno
ritmico
ritrovo
riunione
riva
riverso
rivincita
rivolto
rizoma
roba
robotico
robusto
roccia
roco
rodaggio
rodere
roditore
rogito
rollio
romantico
rompere
ronzio
rosolare
rospo
rotante
rotondo
rotula
rovescio
rubizzo
rubrica
ruga
rullino
rumine
rumoroso
ruolo
rupe
russare
rustico
sabato
sabbiare
sabotato
sagoma
salasso
saldatura
salgemma
salivare
salmone
salone
saltare
saluto
salvo
sapere
sapido
saporito
saraceno
sarcasmo
sarto
sassoso
satellite
satira
satollo
saturno
savana
savio
saziato
sbadiglio
sbalzo
sbancato
sbarra
sbattere
sbavare
sbendare
sbirciare
sbloccato
sbocciato
sbrinare
sbruffone
sbuffare
scabroso
scadenza
scala
scambiare
scandalo
scapola
scarso
scatenare
scavato
scelto
scenico
scettro
scheda
schiena
sciarpa
scienza
scindere
scippo
sciroppo
scivolo
sclerare
scodella
scolpito
scomparto
sconforto
scoprire
scorta
scossone
scozzese
scriba
scrollare
scrutinio
scuderia
scultore
scuola
scuro
scusare
sdebitare
sdoganare
seccatura
secondo
sedano
seggiola
segnalato
segregato
seguito
selciato
selettivo
sella
selvaggio
semaforo
sembrare
seme
seminato
sempre
senso
sentire
sepolto
sequenza
serata
serbato
sereno
serio
serpente
serraglio
servire
sestina
setola
settimana
sfacelo
sfaldare
sfamato
sfarzoso
sfaticato
sfera
sfida
sfilato
sfinge
sfocato
sfoderare
sfogo
sfoltire
sforzato
sfratto
sfruttato
sfuggito
sfumare
sfuso
sgabello
sgarbato
sgonfiare
sgorbio
sgrassato
sguardo
sibilo
siccome
sierra
sigla
signore
silenzio
sillaba
simbolo
simpatico
simulato
sinfonia
singolo
sinistro
sino
sintesi
sinusoide
sipario
sisma
sistole
situato
slitta
slogatura
sloveno
smarrito
smemorato
smentito
smeraldo
smilzo
smontare
smottato
smussato
snellire
snervato
snodo
sobbalzo
sobrio
soccorso
sociale
sodale
soffitto
sogno
soldato
solenne
solido
sollazzo
solo
solubile
solvente
somatico
somma
sonda
sonetto
sonnifero
sopire
soppeso
sopra
sorgere
sorpasso
sorriso
sorso
sorteggio
sorvolato
sospiro
sosta
sottile
spada
spalla
spargere
spatola
spavento
spazzola
specie
spedire
spegnere
spelatura
speranza
spessore
spettrale
spezzato
spia
spigoloso
spillato
spinoso
spirale
splendido
sportivo
sposo
spranga
sprecare
spronato
spruzzo
spuntino
squillo
sradicare
srotolato
stabile
stacco
staffa
stagnare
stampato
stantio
starnuto
stasera
statuto
stelo
steppa
sterzo
stiletto
stima
stirpe
stivale
stizzoso
stonato
storico
strappo
stregato
stridulo
strozzare
strutto
stuccare
stufo
stupendo
subentro
succoso
sudore
suggerito
sugo
sultano
suonare
superbo
supporto
surgelato
surrogato
sussurro
sutura
svagare
svedese
sveglio
svelare
svenuto
svezia
sviluppo
svista
svizzera
svolta
svuotare
tabacco
tabulato
tacciare
taciturno
tale
talismano
tampone
tannino
tara
tardivo
targato
tariffa
tarpare
tartaruga
tasto
tattico
taverna
tavolata
tazza
teca
tecnico
telefono
temerario
tempo
temuto
tendone
tenero
tensione
tentacolo
teorema
terme
terrazzo
terzetto
tesi
tesserato
testato
tetro
tettoia
tifare
tigella
timbro
tinto
tipico
tipografo
tiraggio
tiro
titanio
titolo
titubante
tizio
tizzone
toccare
tollerare
tolto
tombola
tomo
tonfo
tonsilla
topazio
topologia
toppa
torba
tornare
torrone
tortora
toscano
tossire
tostatura
totano
trabocco
trachea
trafila
tragedia
tralcio
tramonto
transito
trapano
trarre
trasloco
trattato
trave
treccia
tremolio
trespolo
tributo
tricheco
trifoglio
trillo
trincea
trio
tristezza
triturato
trivella
tromba
trono
troppo
trottola
trovare
truccato
tubatura
tuffato
tulipano
tumulto
tunisia
turbare
turchino
tuta
tutela
ubicato
uccello
uccisore
udire
uditivo
uffa
ufficio
uguale
ulisse
ultimato
umano
umile
umorismo
uncinetto
ungere
ungherese
unicorno
unificato
unisono
unitario
unte
uovo
upupa
uragano
urgenza
urlo
usanza
usato
uscito
usignolo
usuraio
utensile
utilizzo
utopia
vacante
vaccinato
vagabondo
vagliato
valanga
valgo
valico
valletta
valoroso
valutare
valvola
vampata
vangare
vanitoso
vano
vantaggio
vanvera
vapore
varano
varcato
variante
vasca
vedetta
vedova
veduto
vegetale
veicolo
velcro
velina
velluto
veloce
venato
vendemmia
vento
verace
verbale
vergogna
verifica
vero
verruca
verticale
vescica
vessillo
vestale
veterano
vetrina
vetusto
viandante
vibrante
vicenda
vichingo
vicinanza
vidimare
vigilia
vigneto
vigore
vile
villano
vimini
vincitore
viola
vipera
virgola
virologo
virulento
viscoso
visione
vispo
vissuto
visura
vita
vitello
vittima
vivanda
vivido
viziare
voce
voga
volatile
volere
volpe
voragine
vulcano
zampogna
zanna
zappato
zattera
zavorra
zefiro
zelante
zelo
zenzero
zerbino
zibetto
zinco
zircone
zitto
zolla
zotico
zucchero
zufolo
zulu
zuppa`.split('\n'));

    /** Japanese BIP39 wordlist. */
    const wordlist$4 = /* @__PURE__ */ Object.freeze(`あいこくしん
あいさつ
あいだ
あおぞら
あかちゃん
あきる
あけがた
あける
あこがれる
あさい
あさひ
あしあと
あじわう
あずかる
あずき
あそぶ
あたえる
あたためる
あたりまえ
あたる
あつい
あつかう
あっしゅく
あつまり
あつめる
あてな
あてはまる
あひる
あぶら
あぶる
あふれる
あまい
あまど
あまやかす
あまり
あみもの
あめりか
あやまる
あゆむ
あらいぐま
あらし
あらすじ
あらためる
あらゆる
あらわす
ありがとう
あわせる
あわてる
あんい
あんがい
あんこ
あんぜん
あんてい
あんない
あんまり
いいだす
いおん
いがい
いがく
いきおい
いきなり
いきもの
いきる
いくじ
いくぶん
いけばな
いけん
いこう
いこく
いこつ
いさましい
いさん
いしき
いじゅう
いじょう
いじわる
いずみ
いずれ
いせい
いせえび
いせかい
いせき
いぜん
いそうろう
いそがしい
いだい
いだく
いたずら
いたみ
いたりあ
いちおう
いちじ
いちど
いちば
いちぶ
いちりゅう
いつか
いっしゅん
いっせい
いっそう
いったん
いっち
いってい
いっぽう
いてざ
いてん
いどう
いとこ
いない
いなか
いねむり
いのち
いのる
いはつ
いばる
いはん
いびき
いひん
いふく
いへん
いほう
いみん
いもうと
いもたれ
いもり
いやがる
いやす
いよかん
いよく
いらい
いらすと
いりぐち
いりょう
いれい
いれもの
いれる
いろえんぴつ
いわい
いわう
いわかん
いわば
いわゆる
いんげんまめ
いんさつ
いんしょう
いんよう
うえき
うえる
うおざ
うがい
うかぶ
うかべる
うきわ
うくらいな
うくれれ
うけたまわる
うけつけ
うけとる
うけもつ
うける
うごかす
うごく
うこん
うさぎ
うしなう
うしろがみ
うすい
うすぎ
うすぐらい
うすめる
うせつ
うちあわせ
うちがわ
うちき
うちゅう
うっかり
うつくしい
うったえる
うつる
うどん
うなぎ
うなじ
うなずく
うなる
うねる
うのう
うぶげ
うぶごえ
うまれる
うめる
うもう
うやまう
うよく
うらがえす
うらぐち
うらない
うりあげ
うりきれ
うるさい
うれしい
うれゆき
うれる
うろこ
うわき
うわさ
うんこう
うんちん
うんてん
うんどう
えいえん
えいが
えいきょう
えいご
えいせい
えいぶん
えいよう
えいわ
えおり
えがお
えがく
えきたい
えくせる
えしゃく
えすて
えつらん
えのぐ
えほうまき
えほん
えまき
えもじ
えもの
えらい
えらぶ
えりあ
えんえん
えんかい
えんぎ
えんげき
えんしゅう
えんぜつ
えんそく
えんちょう
えんとつ
おいかける
おいこす
おいしい
おいつく
おうえん
おうさま
おうじ
おうせつ
おうたい
おうふく
おうべい
おうよう
おえる
おおい
おおう
おおどおり
おおや
おおよそ
おかえり
おかず
おがむ
おかわり
おぎなう
おきる
おくさま
おくじょう
おくりがな
おくる
おくれる
おこす
おこなう
おこる
おさえる
おさない
おさめる
おしいれ
おしえる
おじぎ
おじさん
おしゃれ
おそらく
おそわる
おたがい
おたく
おだやか
おちつく
おっと
おつり
おでかけ
おとしもの
おとなしい
おどり
おどろかす
おばさん
おまいり
おめでとう
おもいで
おもう
おもたい
おもちゃ
おやつ
おやゆび
およぼす
おらんだ
おろす
おんがく
おんけい
おんしゃ
おんせん
おんだん
おんちゅう
おんどけい
かあつ
かいが
がいき
がいけん
がいこう
かいさつ
かいしゃ
かいすいよく
かいぜん
かいぞうど
かいつう
かいてん
かいとう
かいふく
がいへき
かいほう
かいよう
がいらい
かいわ
かえる
かおり
かかえる
かがく
かがし
かがみ
かくご
かくとく
かざる
がぞう
かたい
かたち
がちょう
がっきゅう
がっこう
がっさん
がっしょう
かなざわし
かのう
がはく
かぶか
かほう
かほご
かまう
かまぼこ
かめれおん
かゆい
かようび
からい
かるい
かろう
かわく
かわら
がんか
かんけい
かんこう
かんしゃ
かんそう
かんたん
かんち
がんばる
きあい
きあつ
きいろ
ぎいん
きうい
きうん
きえる
きおう
きおく
きおち
きおん
きかい
きかく
きかんしゃ
ききて
きくばり
きくらげ
きけんせい
きこう
きこえる
きこく
きさい
きさく
きさま
きさらぎ
ぎじかがく
ぎしき
ぎじたいけん
ぎじにってい
ぎじゅつしゃ
きすう
きせい
きせき
きせつ
きそう
きぞく
きぞん
きたえる
きちょう
きつえん
ぎっちり
きつつき
きつね
きてい
きどう
きどく
きない
きなが
きなこ
きぬごし
きねん
きのう
きのした
きはく
きびしい
きひん
きふく
きぶん
きぼう
きほん
きまる
きみつ
きむずかしい
きめる
きもだめし
きもち
きもの
きゃく
きやく
ぎゅうにく
きよう
きょうりゅう
きらい
きらく
きりん
きれい
きれつ
きろく
ぎろん
きわめる
ぎんいろ
きんかくじ
きんじょ
きんようび
ぐあい
くいず
くうかん
くうき
くうぐん
くうこう
ぐうせい
くうそう
ぐうたら
くうふく
くうぼ
くかん
くきょう
くげん
ぐこう
くさい
くさき
くさばな
くさる
くしゃみ
くしょう
くすのき
くすりゆび
くせげ
くせん
ぐたいてき
くださる
くたびれる
くちこみ
くちさき
くつした
ぐっすり
くつろぐ
くとうてん
くどく
くなん
くねくね
くのう
くふう
くみあわせ
くみたてる
くめる
くやくしょ
くらす
くらべる
くるま
くれる
くろう
くわしい
ぐんかん
ぐんしょく
ぐんたい
ぐんて
けあな
けいかく
けいけん
けいこ
けいさつ
げいじゅつ
けいたい
げいのうじん
けいれき
けいろ
けおとす
けおりもの
げきか
げきげん
げきだん
げきちん
げきとつ
げきは
げきやく
げこう
げこくじょう
げざい
けさき
げざん
けしき
けしごむ
けしょう
げすと
けたば
けちゃっぷ
けちらす
けつあつ
けつい
けつえき
けっこん
けつじょ
けっせき
けってい
けつまつ
げつようび
げつれい
けつろん
げどく
けとばす
けとる
けなげ
けなす
けなみ
けぬき
げねつ
けねん
けはい
げひん
けぶかい
げぼく
けまり
けみかる
けむし
けむり
けもの
けらい
けろけろ
けわしい
けんい
けんえつ
けんお
けんか
げんき
けんげん
けんこう
けんさく
けんしゅう
けんすう
げんそう
けんちく
けんてい
けんとう
けんない
けんにん
げんぶつ
けんま
けんみん
けんめい
けんらん
けんり
こあくま
こいぬ
こいびと
ごうい
こうえん
こうおん
こうかん
ごうきゅう
ごうけい
こうこう
こうさい
こうじ
こうすい
ごうせい
こうそく
こうたい
こうちゃ
こうつう
こうてい
こうどう
こうない
こうはい
ごうほう
ごうまん
こうもく
こうりつ
こえる
こおり
ごかい
ごがつ
ごかん
こくご
こくさい
こくとう
こくない
こくはく
こぐま
こけい
こける
ここのか
こころ
こさめ
こしつ
こすう
こせい
こせき
こぜん
こそだて
こたい
こたえる
こたつ
こちょう
こっか
こつこつ
こつばん
こつぶ
こてい
こてん
ことがら
ことし
ことば
ことり
こなごな
こねこね
このまま
このみ
このよ
ごはん
こひつじ
こふう
こふん
こぼれる
ごまあぶら
こまかい
ごますり
こまつな
こまる
こむぎこ
こもじ
こもち
こもの
こもん
こやく
こやま
こゆう
こゆび
こよい
こよう
こりる
これくしょん
ころっけ
こわもて
こわれる
こんいん
こんかい
こんき
こんしゅう
こんすい
こんだて
こんとん
こんなん
こんびに
こんぽん
こんまけ
こんや
こんれい
こんわく
ざいえき
さいかい
さいきん
ざいげん
ざいこ
さいしょ
さいせい
ざいたく
ざいちゅう
さいてき
ざいりょう
さうな
さかいし
さがす
さかな
さかみち
さがる
さぎょう
さくし
さくひん
さくら
さこく
さこつ
さずかる
ざせき
さたん
さつえい
ざつおん
ざっか
ざつがく
さっきょく
ざっし
さつじん
ざっそう
さつたば
さつまいも
さてい
さといも
さとう
さとおや
さとし
さとる
さのう
さばく
さびしい
さべつ
さほう
さほど
さます
さみしい
さみだれ
さむけ
さめる
さやえんどう
さゆう
さよう
さよく
さらだ
ざるそば
さわやか
さわる
さんいん
さんか
さんきゃく
さんこう
さんさい
ざんしょ
さんすう
さんせい
さんそ
さんち
さんま
さんみ
さんらん
しあい
しあげ
しあさって
しあわせ
しいく
しいん
しうち
しえい
しおけ
しかい
しかく
じかん
しごと
しすう
じだい
したうけ
したぎ
したて
したみ
しちょう
しちりん
しっかり
しつじ
しつもん
してい
してき
してつ
じてん
じどう
しなぎれ
しなもの
しなん
しねま
しねん
しのぐ
しのぶ
しはい
しばかり
しはつ
しはらい
しはん
しひょう
しふく
じぶん
しへい
しほう
しほん
しまう
しまる
しみん
しむける
じむしょ
しめい
しめる
しもん
しゃいん
しゃうん
しゃおん
じゃがいも
しやくしょ
しゃくほう
しゃけん
しゃこ
しゃざい
しゃしん
しゃせん
しゃそう
しゃたい
しゃちょう
しゃっきん
じゃま
しゃりん
しゃれい
じゆう
じゅうしょ
しゅくはく
じゅしん
しゅっせき
しゅみ
しゅらば
じゅんばん
しょうかい
しょくたく
しょっけん
しょどう
しょもつ
しらせる
しらべる
しんか
しんこう
じんじゃ
しんせいじ
しんちく
しんりん
すあげ
すあし
すあな
ずあん
すいえい
すいか
すいとう
ずいぶん
すいようび
すうがく
すうじつ
すうせん
すおどり
すきま
すくう
すくない
すける
すごい
すこし
ずさん
すずしい
すすむ
すすめる
すっかり
ずっしり
ずっと
すてき
すてる
すねる
すのこ
すはだ
すばらしい
ずひょう
ずぶぬれ
すぶり
すふれ
すべて
すべる
ずほう
すぼん
すまい
すめし
すもう
すやき
すらすら
するめ
すれちがう
すろっと
すわる
すんぜん
すんぽう
せあぶら
せいかつ
せいげん
せいじ
せいよう
せおう
せかいかん
せきにん
せきむ
せきゆ
せきらんうん
せけん
せこう
せすじ
せたい
せたけ
せっかく
せっきゃく
ぜっく
せっけん
せっこつ
せっさたくま
せつぞく
せつだん
せつでん
せっぱん
せつび
せつぶん
せつめい
せつりつ
せなか
せのび
せはば
せびろ
せぼね
せまい
せまる
せめる
せもたれ
せりふ
ぜんあく
せんい
せんえい
せんか
せんきょ
せんく
せんげん
ぜんご
せんさい
せんしゅ
せんすい
せんせい
せんぞ
せんたく
せんちょう
せんてい
せんとう
せんぬき
せんねん
せんぱい
ぜんぶ
ぜんぽう
せんむ
せんめんじょ
せんもん
せんやく
せんゆう
せんよう
ぜんら
ぜんりゃく
せんれい
せんろ
そあく
そいとげる
そいね
そうがんきょう
そうき
そうご
そうしん
そうだん
そうなん
そうび
そうめん
そうり
そえもの
そえん
そがい
そげき
そこう
そこそこ
そざい
そしな
そせい
そせん
そそぐ
そだてる
そつう
そつえん
そっかん
そつぎょう
そっけつ
そっこう
そっせん
そっと
そとがわ
そとづら
そなえる
そなた
そふぼ
そぼく
そぼろ
そまつ
そまる
そむく
そむりえ
そめる
そもそも
そよかぜ
そらまめ
そろう
そんかい
そんけい
そんざい
そんしつ
そんぞく
そんちょう
ぞんび
ぞんぶん
そんみん
たあい
たいいん
たいうん
たいえき
たいおう
だいがく
たいき
たいぐう
たいけん
たいこ
たいざい
だいじょうぶ
だいすき
たいせつ
たいそう
だいたい
たいちょう
たいてい
だいどころ
たいない
たいねつ
たいのう
たいはん
だいひょう
たいふう
たいへん
たいほ
たいまつばな
たいみんぐ
たいむ
たいめん
たいやき
たいよう
たいら
たいりょく
たいる
たいわん
たうえ
たえる
たおす
たおる
たおれる
たかい
たかね
たきび
たくさん
たこく
たこやき
たさい
たしざん
だじゃれ
たすける
たずさわる
たそがれ
たたかう
たたく
ただしい
たたみ
たちばな
だっかい
だっきゃく
だっこ
だっしゅつ
だったい
たてる
たとえる
たなばた
たにん
たぬき
たのしみ
たはつ
たぶん
たべる
たぼう
たまご
たまる
だむる
ためいき
ためす
ためる
たもつ
たやすい
たよる
たらす
たりきほんがん
たりょう
たりる
たると
たれる
たれんと
たろっと
たわむれる
だんあつ
たんい
たんおん
たんか
たんき
たんけん
たんご
たんさん
たんじょうび
だんせい
たんそく
たんたい
だんち
たんてい
たんとう
だんな
たんにん
だんねつ
たんのう
たんぴん
だんぼう
たんまつ
たんめい
だんれつ
だんろ
だんわ
ちあい
ちあん
ちいき
ちいさい
ちえん
ちかい
ちから
ちきゅう
ちきん
ちけいず
ちけん
ちこく
ちさい
ちしき
ちしりょう
ちせい
ちそう
ちたい
ちたん
ちちおや
ちつじょ
ちてき
ちてん
ちぬき
ちぬり
ちのう
ちひょう
ちへいせん
ちほう
ちまた
ちみつ
ちみどろ
ちめいど
ちゃんこなべ
ちゅうい
ちゆりょく
ちょうし
ちょさくけん
ちらし
ちらみ
ちりがみ
ちりょう
ちるど
ちわわ
ちんたい
ちんもく
ついか
ついたち
つうか
つうじょう
つうはん
つうわ
つかう
つかれる
つくね
つくる
つけね
つける
つごう
つたえる
つづく
つつじ
つつむ
つとめる
つながる
つなみ
つねづね
つのる
つぶす
つまらない
つまる
つみき
つめたい
つもり
つもる
つよい
つるぼ
つるみく
つわもの
つわり
てあし
てあて
てあみ
ていおん
ていか
ていき
ていけい
ていこく
ていさつ
ていし
ていせい
ていたい
ていど
ていねい
ていひょう
ていへん
ていぼう
てうち
ておくれ
てきとう
てくび
でこぼこ
てさぎょう
てさげ
てすり
てそう
てちがい
てちょう
てつがく
てつづき
でっぱ
てつぼう
てつや
でぬかえ
てぬき
てぬぐい
てのひら
てはい
てぶくろ
てふだ
てほどき
てほん
てまえ
てまきずし
てみじか
てみやげ
てらす
てれび
てわけ
てわたし
でんあつ
てんいん
てんかい
てんき
てんぐ
てんけん
てんごく
てんさい
てんし
てんすう
でんち
てんてき
てんとう
てんない
てんぷら
てんぼうだい
てんめつ
てんらんかい
でんりょく
でんわ
どあい
といれ
どうかん
とうきゅう
どうぐ
とうし
とうむぎ
とおい
とおか
とおく
とおす
とおる
とかい
とかす
ときおり
ときどき
とくい
とくしゅう
とくてん
とくに
とくべつ
とけい
とける
とこや
とさか
としょかん
とそう
とたん
とちゅう
とっきゅう
とっくん
とつぜん
とつにゅう
とどける
ととのえる
とない
となえる
となり
とのさま
とばす
どぶがわ
とほう
とまる
とめる
ともだち
ともる
どようび
とらえる
とんかつ
どんぶり
ないかく
ないこう
ないしょ
ないす
ないせん
ないそう
なおす
ながい
なくす
なげる
なこうど
なさけ
なたでここ
なっとう
なつやすみ
ななおし
なにごと
なにもの
なにわ
なのか
なふだ
なまいき
なまえ
なまみ
なみだ
なめらか
なめる
なやむ
ならう
ならび
ならぶ
なれる
なわとび
なわばり
にあう
にいがた
にうけ
におい
にかい
にがて
にきび
にくしみ
にくまん
にげる
にさんかたんそ
にしき
にせもの
にちじょう
にちようび
にっか
にっき
にっけい
にっこう
にっさん
にっしょく
にっすう
にっせき
にってい
になう
にほん
にまめ
にもつ
にやり
にゅういん
にりんしゃ
にわとり
にんい
にんか
にんき
にんげん
にんしき
にんずう
にんそう
にんたい
にんち
にんてい
にんにく
にんぷ
にんまり
にんむ
にんめい
にんよう
ぬいくぎ
ぬかす
ぬぐいとる
ぬぐう
ぬくもり
ぬすむ
ぬまえび
ぬめり
ぬらす
ぬんちゃく
ねあげ
ねいき
ねいる
ねいろ
ねぐせ
ねくたい
ねくら
ねこぜ
ねこむ
ねさげ
ねすごす
ねそべる
ねだん
ねつい
ねっしん
ねつぞう
ねったいぎょ
ねぶそく
ねふだ
ねぼう
ねほりはほり
ねまき
ねまわし
ねみみ
ねむい
ねむたい
ねもと
ねらう
ねわざ
ねんいり
ねんおし
ねんかん
ねんきん
ねんぐ
ねんざ
ねんし
ねんちゃく
ねんど
ねんぴ
ねんぶつ
ねんまつ
ねんりょう
ねんれい
のいず
のおづま
のがす
のきなみ
のこぎり
のこす
のこる
のせる
のぞく
のぞむ
のたまう
のちほど
のっく
のばす
のはら
のべる
のぼる
のみもの
のやま
のらいぬ
のらねこ
のりもの
のりゆき
のれん
のんき
ばあい
はあく
ばあさん
ばいか
ばいく
はいけん
はいご
はいしん
はいすい
はいせん
はいそう
はいち
ばいばい
はいれつ
はえる
はおる
はかい
ばかり
はかる
はくしゅ
はけん
はこぶ
はさみ
はさん
はしご
ばしょ
はしる
はせる
ぱそこん
はそん
はたん
はちみつ
はつおん
はっかく
はづき
はっきり
はっくつ
はっけん
はっこう
はっさん
はっしん
はったつ
はっちゅう
はってん
はっぴょう
はっぽう
はなす
はなび
はにかむ
はぶらし
はみがき
はむかう
はめつ
はやい
はやし
はらう
はろうぃん
はわい
はんい
はんえい
はんおん
はんかく
はんきょう
ばんぐみ
はんこ
はんしゃ
はんすう
はんだん
ぱんち
ぱんつ
はんてい
はんとし
はんのう
はんぱ
はんぶん
はんぺん
はんぼうき
はんめい
はんらん
はんろん
ひいき
ひうん
ひえる
ひかく
ひかり
ひかる
ひかん
ひくい
ひけつ
ひこうき
ひこく
ひさい
ひさしぶり
ひさん
びじゅつかん
ひしょ
ひそか
ひそむ
ひたむき
ひだり
ひたる
ひつぎ
ひっこし
ひっし
ひつじゅひん
ひっす
ひつぜん
ぴったり
ぴっちり
ひつよう
ひてい
ひとごみ
ひなまつり
ひなん
ひねる
ひはん
ひびく
ひひょう
ひほう
ひまわり
ひまん
ひみつ
ひめい
ひめじし
ひやけ
ひやす
ひよう
びょうき
ひらがな
ひらく
ひりつ
ひりょう
ひるま
ひるやすみ
ひれい
ひろい
ひろう
ひろき
ひろゆき
ひんかく
ひんけつ
ひんこん
ひんしゅ
ひんそう
ぴんち
ひんぱん
びんぼう
ふあん
ふいうち
ふうけい
ふうせん
ぷうたろう
ふうとう
ふうふ
ふえる
ふおん
ふかい
ふきん
ふくざつ
ふくぶくろ
ふこう
ふさい
ふしぎ
ふじみ
ふすま
ふせい
ふせぐ
ふそく
ぶたにく
ふたん
ふちょう
ふつう
ふつか
ふっかつ
ふっき
ふっこく
ぶどう
ふとる
ふとん
ふのう
ふはい
ふひょう
ふへん
ふまん
ふみん
ふめつ
ふめん
ふよう
ふりこ
ふりる
ふるい
ふんいき
ぶんがく
ぶんぐ
ふんしつ
ぶんせき
ふんそう
ぶんぽう
へいあん
へいおん
へいがい
へいき
へいげん
へいこう
へいさ
へいしゃ
へいせつ
へいそ
へいたく
へいてん
へいねつ
へいわ
へきが
へこむ
べにいろ
べにしょうが
へらす
へんかん
べんきょう
べんごし
へんさい
へんたい
べんり
ほあん
ほいく
ぼうぎょ
ほうこく
ほうそう
ほうほう
ほうもん
ほうりつ
ほえる
ほおん
ほかん
ほきょう
ぼきん
ほくろ
ほけつ
ほけん
ほこう
ほこる
ほしい
ほしつ
ほしゅ
ほしょう
ほせい
ほそい
ほそく
ほたて
ほたる
ぽちぶくろ
ほっきょく
ほっさ
ほったん
ほとんど
ほめる
ほんい
ほんき
ほんけ
ほんしつ
ほんやく
まいにち
まかい
まかせる
まがる
まける
まこと
まさつ
まじめ
ますく
まぜる
まつり
まとめ
まなぶ
まぬけ
まねく
まほう
まもる
まゆげ
まよう
まろやか
まわす
まわり
まわる
まんが
まんきつ
まんぞく
まんなか
みいら
みうち
みえる
みがく
みかた
みかん
みけん
みこん
みじかい
みすい
みすえる
みせる
みっか
みつかる
みつける
みてい
みとめる
みなと
みなみかさい
みねらる
みのう
みのがす
みほん
みもと
みやげ
みらい
みりょく
みわく
みんか
みんぞく
むいか
むえき
むえん
むかい
むかう
むかえ
むかし
むぎちゃ
むける
むげん
むさぼる
むしあつい
むしば
むじゅん
むしろ
むすう
むすこ
むすぶ
むすめ
むせる
むせん
むちゅう
むなしい
むのう
むやみ
むよう
むらさき
むりょう
むろん
めいあん
めいうん
めいえん
めいかく
めいきょく
めいさい
めいし
めいそう
めいぶつ
めいれい
めいわく
めぐまれる
めざす
めした
めずらしい
めだつ
めまい
めやす
めんきょ
めんせき
めんどう
もうしあげる
もうどうけん
もえる
もくし
もくてき
もくようび
もちろん
もどる
もらう
もんく
もんだい
やおや
やける
やさい
やさしい
やすい
やすたろう
やすみ
やせる
やそう
やたい
やちん
やっと
やっぱり
やぶる
やめる
ややこしい
やよい
やわらかい
ゆうき
ゆうびんきょく
ゆうべ
ゆうめい
ゆけつ
ゆしゅつ
ゆせん
ゆそう
ゆたか
ゆちゃく
ゆでる
ゆにゅう
ゆびわ
ゆらい
ゆれる
ようい
ようか
ようきゅう
ようじ
ようす
ようちえん
よかぜ
よかん
よきん
よくせい
よくぼう
よけい
よごれる
よさん
よしゅう
よそう
よそく
よっか
よてい
よどがわく
よねつ
よやく
よゆう
よろこぶ
よろしい
らいう
らくがき
らくご
らくさつ
らくだ
らしんばん
らせん
らぞく
らたい
らっか
られつ
りえき
りかい
りきさく
りきせつ
りくぐん
りくつ
りけん
りこう
りせい
りそう
りそく
りてん
りねん
りゆう
りゅうがく
りよう
りょうり
りょかん
りょくちゃ
りょこう
りりく
りれき
りろん
りんご
るいけい
るいさい
るいじ
るいせき
るすばん
るりがわら
れいかん
れいぎ
れいせい
れいぞうこ
れいとう
れいぼう
れきし
れきだい
れんあい
れんけい
れんこん
れんさい
れんしゅう
れんぞく
れんらく
ろうか
ろうご
ろうじん
ろうそく
ろくが
ろこつ
ろじうら
ろしゅつ
ろせん
ろてん
ろめん
ろれつ
ろんぎ
ろんぱ
ろんぶん
ろんり
わかす
わかめ
わかやま
わかれる
わしつ
わじまし
わすれもの
わらう
われる`.split('\n'));

    /** Korean BIP39 wordlist. */
    const wordlist$3 = /* @__PURE__ */ Object.freeze(`가격
가끔
가난
가능
가득
가르침
가뭄
가방
가상
가슴
가운데
가을
가이드
가입
가장
가정
가족
가죽
각오
각자
간격
간부
간섭
간장
간접
간판
갈등
갈비
갈색
갈증
감각
감기
감소
감수성
감자
감정
갑자기
강남
강당
강도
강력히
강변
강북
강사
강수량
강아지
강원도
강의
강제
강조
같이
개구리
개나리
개방
개별
개선
개성
개인
객관적
거실
거액
거울
거짓
거품
걱정
건강
건물
건설
건조
건축
걸음
검사
검토
게시판
게임
겨울
견해
결과
결국
결론
결석
결승
결심
결정
결혼
경계
경고
경기
경력
경복궁
경비
경상도
경영
경우
경쟁
경제
경주
경찰
경치
경향
경험
계곡
계단
계란
계산
계속
계약
계절
계층
계획
고객
고구려
고궁
고급
고등학생
고무신
고민
고양이
고장
고전
고집
고춧가루
고통
고향
곡식
골목
골짜기
골프
공간
공개
공격
공군
공급
공기
공동
공무원
공부
공사
공식
공업
공연
공원
공장
공짜
공책
공통
공포
공항
공휴일
과목
과일
과장
과정
과학
관객
관계
관광
관념
관람
관련
관리
관습
관심
관점
관찰
광경
광고
광장
광주
괴로움
굉장히
교과서
교문
교복
교실
교양
교육
교장
교직
교통
교환
교훈
구경
구름
구멍
구별
구분
구석
구성
구속
구역
구입
구청
구체적
국가
국기
국내
국립
국물
국민
국수
국어
국왕
국적
국제
국회
군대
군사
군인
궁극적
권리
권위
권투
귀국
귀신
규정
규칙
균형
그날
그냥
그늘
그러나
그룹
그릇
그림
그제서야
그토록
극복
극히
근거
근교
근래
근로
근무
근본
근원
근육
근처
글씨
글자
금강산
금고
금년
금메달
금액
금연
금요일
금지
긍정적
기간
기관
기념
기능
기독교
기둥
기록
기름
기법
기본
기분
기쁨
기숙사
기술
기억
기업
기온
기운
기원
기적
기준
기침
기혼
기획
긴급
긴장
길이
김밥
김치
김포공항
깍두기
깜빡
깨달음
깨소금
껍질
꼭대기
꽃잎
나들이
나란히
나머지
나물
나침반
나흘
낙엽
난방
날개
날씨
날짜
남녀
남대문
남매
남산
남자
남편
남학생
낭비
낱말
내년
내용
내일
냄비
냄새
냇물
냉동
냉면
냉방
냉장고
넥타이
넷째
노동
노란색
노력
노인
녹음
녹차
녹화
논리
논문
논쟁
놀이
농구
농담
농민
농부
농업
농장
농촌
높이
눈동자
눈물
눈썹
뉴욕
느낌
늑대
능동적
능력
다방
다양성
다음
다이어트
다행
단계
단골
단독
단맛
단순
단어
단위
단점
단체
단추
단편
단풍
달걀
달러
달력
달리
닭고기
담당
담배
담요
담임
답변
답장
당근
당분간
당연히
당장
대규모
대낮
대단히
대답
대도시
대략
대량
대륙
대문
대부분
대신
대응
대장
대전
대접
대중
대책
대출
대충
대통령
대학
대한민국
대합실
대형
덩어리
데이트
도대체
도덕
도둑
도망
도서관
도심
도움
도입
도자기
도저히
도전
도중
도착
독감
독립
독서
독일
독창적
동화책
뒷모습
뒷산
딸아이
마누라
마늘
마당
마라톤
마련
마무리
마사지
마약
마요네즈
마을
마음
마이크
마중
마지막
마찬가지
마찰
마흔
막걸리
막내
막상
만남
만두
만세
만약
만일
만점
만족
만화
많이
말기
말씀
말투
맘대로
망원경
매년
매달
매력
매번
매스컴
매일
매장
맥주
먹이
먼저
먼지
멀리
메일
며느리
며칠
면담
멸치
명단
명령
명예
명의
명절
명칭
명함
모금
모니터
모델
모든
모범
모습
모양
모임
모조리
모집
모퉁이
목걸이
목록
목사
목소리
목숨
목적
목표
몰래
몸매
몸무게
몸살
몸속
몸짓
몸통
몹시
무관심
무궁화
무더위
무덤
무릎
무슨
무엇
무역
무용
무조건
무지개
무척
문구
문득
문법
문서
문제
문학
문화
물가
물건
물결
물고기
물론
물리학
물음
물질
물체
미국
미디어
미사일
미술
미역
미용실
미움
미인
미팅
미혼
민간
민족
민주
믿음
밀가루
밀리미터
밑바닥
바가지
바구니
바나나
바늘
바닥
바닷가
바람
바이러스
바탕
박물관
박사
박수
반대
반드시
반말
반발
반성
반응
반장
반죽
반지
반찬
받침
발가락
발걸음
발견
발달
발레
발목
발바닥
발생
발음
발자국
발전
발톱
발표
밤하늘
밥그릇
밥맛
밥상
밥솥
방금
방면
방문
방바닥
방법
방송
방식
방안
방울
방지
방학
방해
방향
배경
배꼽
배달
배드민턴
백두산
백색
백성
백인
백제
백화점
버릇
버섯
버튼
번개
번역
번지
번호
벌금
벌레
벌써
범위
범인
범죄
법률
법원
법적
법칙
베이징
벨트
변경
변동
변명
변신
변호사
변화
별도
별명
별일
병실
병아리
병원
보관
보너스
보라색
보람
보름
보상
보안
보자기
보장
보전
보존
보통
보편적
보험
복도
복사
복숭아
복습
볶음
본격적
본래
본부
본사
본성
본인
본질
볼펜
봉사
봉지
봉투
부근
부끄러움
부담
부동산
부문
부분
부산
부상
부엌
부인
부작용
부장
부정
부족
부지런히
부친
부탁
부품
부회장
북부
북한
분노
분량
분리
분명
분석
분야
분위기
분필
분홍색
불고기
불과
불교
불꽃
불만
불법
불빛
불안
불이익
불행
브랜드
비극
비난
비닐
비둘기
비디오
비로소
비만
비명
비밀
비바람
비빔밥
비상
비용
비율
비중
비타민
비판
빌딩
빗물
빗방울
빗줄기
빛깔
빨간색
빨래
빨리
사건
사계절
사나이
사냥
사람
사랑
사립
사모님
사물
사방
사상
사생활
사설
사슴
사실
사업
사용
사월
사장
사전
사진
사촌
사춘기
사탕
사투리
사흘
산길
산부인과
산업
산책
살림
살인
살짝
삼계탕
삼국
삼십
삼월
삼촌
상관
상금
상대
상류
상반기
상상
상식
상업
상인
상자
상점
상처
상추
상태
상표
상품
상황
새벽
색깔
색연필
생각
생명
생물
생방송
생산
생선
생신
생일
생활
서랍
서른
서명
서민
서비스
서양
서울
서적
서점
서쪽
서클
석사
석유
선거
선물
선배
선생
선수
선원
선장
선전
선택
선풍기
설거지
설날
설렁탕
설명
설문
설사
설악산
설치
설탕
섭씨
성공
성당
성명
성별
성인
성장
성적
성질
성함
세금
세미나
세상
세월
세종대왕
세탁
센터
센티미터
셋째
소규모
소극적
소금
소나기
소년
소득
소망
소문
소설
소속
소아과
소용
소원
소음
소중히
소지품
소질
소풍
소형
속담
속도
속옷
손가락
손길
손녀
손님
손등
손목
손뼉
손실
손질
손톱
손해
솔직히
솜씨
송아지
송이
송편
쇠고기
쇼핑
수건
수년
수단
수돗물
수동적
수면
수명
수박
수상
수석
수술
수시로
수업
수염
수영
수입
수준
수집
수출
수컷
수필
수학
수험생
수화기
숙녀
숙소
숙제
순간
순서
순수
순식간
순위
숟가락
술병
술집
숫자
스님
스물
스스로
스승
스웨터
스위치
스케이트
스튜디오
스트레스
스포츠
슬쩍
슬픔
습관
습기
승객
승리
승부
승용차
승진
시각
시간
시골
시금치
시나리오
시댁
시리즈
시멘트
시민
시부모
시선
시설
시스템
시아버지
시어머니
시월
시인
시일
시작
시장
시절
시점
시중
시즌
시집
시청
시합
시험
식구
식기
식당
식량
식료품
식물
식빵
식사
식생활
식초
식탁
식품
신고
신규
신념
신문
신발
신비
신사
신세
신용
신제품
신청
신체
신화
실감
실내
실력
실례
실망
실수
실습
실시
실장
실정
실질적
실천
실체
실컷
실태
실패
실험
실현
심리
심부름
심사
심장
심정
심판
쌍둥이
씨름
씨앗
아가씨
아나운서
아드님
아들
아쉬움
아스팔트
아시아
아울러
아저씨
아줌마
아직
아침
아파트
아프리카
아픔
아홉
아흔
악기
악몽
악수
안개
안경
안과
안내
안녕
안동
안방
안부
안주
알루미늄
알코올
암시
암컷
압력
앞날
앞문
애인
애정
액수
앨범
야간
야단
야옹
약간
약국
약속
약수
약점
약품
약혼녀
양념
양력
양말
양배추
양주
양파
어둠
어려움
어른
어젯밤
어쨌든
어쩌다가
어쩐지
언니
언덕
언론
언어
얼굴
얼른
얼음
얼핏
엄마
업무
업종
업체
엉덩이
엉망
엉터리
엊그제
에너지
에어컨
엔진
여건
여고생
여관
여군
여권
여대생
여덟
여동생
여든
여론
여름
여섯
여성
여왕
여인
여전히
여직원
여학생
여행
역사
역시
역할
연결
연구
연극
연기
연락
연설
연세
연속
연습
연애
연예인
연인
연장
연주
연출
연필
연합
연휴
열기
열매
열쇠
열심히
열정
열차
열흘
염려
엽서
영국
영남
영상
영양
영역
영웅
영원히
영하
영향
영혼
영화
옆구리
옆방
옆집
예감
예금
예방
예산
예상
예선
예술
예습
예식장
예약
예전
예절
예정
예컨대
옛날
오늘
오락
오랫동안
오렌지
오로지
오른발
오븐
오십
오염
오월
오전
오직
오징어
오페라
오피스텔
오히려
옥상
옥수수
온갖
온라인
온몸
온종일
온통
올가을
올림픽
올해
옷차림
와이셔츠
와인
완성
완전
왕비
왕자
왜냐하면
왠지
외갓집
외국
외로움
외삼촌
외출
외침
외할머니
왼발
왼손
왼쪽
요금
요일
요즘
요청
용기
용서
용어
우산
우선
우승
우연히
우정
우체국
우편
운동
운명
운반
운전
운행
울산
울음
움직임
웃어른
웃음
워낙
원고
원래
원서
원숭이
원인
원장
원피스
월급
월드컵
월세
월요일
웨이터
위반
위법
위성
위원
위험
위협
윗사람
유난히
유럽
유명
유물
유산
유적
유치원
유학
유행
유형
육군
육상
육십
육체
은행
음력
음료
음반
음성
음식
음악
음주
의견
의논
의문
의복
의식
의심
의외로
의욕
의원
의학
이것
이곳
이념
이놈
이달
이대로
이동
이렇게
이력서
이론적
이름
이민
이발소
이별
이불
이빨
이상
이성
이슬
이야기
이용
이웃
이월
이윽고
이익
이전
이중
이튿날
이틀
이혼
인간
인격
인공
인구
인근
인기
인도
인류
인물
인생
인쇄
인연
인원
인재
인종
인천
인체
인터넷
인하
인형
일곱
일기
일단
일대
일등
일반
일본
일부
일상
일생
일손
일요일
일월
일정
일종
일주일
일찍
일체
일치
일행
일회용
임금
임무
입대
입력
입맛
입사
입술
입시
입원
입장
입학
자가용
자격
자극
자동
자랑
자부심
자식
자신
자연
자원
자율
자전거
자정
자존심
자판
작가
작년
작성
작업
작용
작은딸
작품
잔디
잔뜩
잔치
잘못
잠깐
잠수함
잠시
잠옷
잠자리
잡지
장관
장군
장기간
장래
장례
장르
장마
장면
장모
장미
장비
장사
장소
장식
장애인
장인
장점
장차
장학금
재능
재빨리
재산
재생
재작년
재정
재채기
재판
재학
재활용
저것
저고리
저곳
저녁
저런
저렇게
저번
저울
저절로
저축
적극
적당히
적성
적용
적응
전개
전공
전기
전달
전라도
전망
전문
전반
전부
전세
전시
전용
전자
전쟁
전주
전철
전체
전통
전혀
전후
절대
절망
절반
절약
절차
점검
점수
점심
점원
점점
점차
접근
접시
접촉
젓가락
정거장
정도
정류장
정리
정말
정면
정문
정반대
정보
정부
정비
정상
정성
정오
정원
정장
정지
정치
정확히
제공
제과점
제대로
제목
제발
제법
제삿날
제안
제일
제작
제주도
제출
제품
제한
조각
조건
조금
조깅
조명
조미료
조상
조선
조용히
조절
조정
조직
존댓말
존재
졸업
졸음
종교
종로
종류
종소리
종업원
종종
종합
좌석
죄인
주관적
주름
주말
주머니
주먹
주문
주민
주방
주변
주식
주인
주일
주장
주전자
주택
준비
줄거리
줄기
줄무늬
중간
중계방송
중국
중년
중단
중독
중반
중부
중세
중소기업
중순
중앙
중요
중학교
즉석
즉시
즐거움
증가
증거
증권
증상
증세
지각
지갑
지경
지극히
지금
지급
지능
지름길
지리산
지방
지붕
지식
지역
지우개
지원
지적
지점
지진
지출
직선
직업
직원
직장
진급
진동
진로
진료
진리
진짜
진찰
진출
진통
진행
질문
질병
질서
짐작
집단
집안
집중
짜증
찌꺼기
차남
차라리
차량
차림
차별
차선
차츰
착각
찬물
찬성
참가
참기름
참새
참석
참여
참외
참조
찻잔
창가
창고
창구
창문
창밖
창작
창조
채널
채점
책가방
책방
책상
책임
챔피언
처벌
처음
천국
천둥
천장
천재
천천히
철도
철저히
철학
첫날
첫째
청년
청바지
청소
청춘
체계
체력
체온
체육
체중
체험
초등학생
초반
초밥
초상화
초순
초여름
초원
초저녁
초점
초청
초콜릿
촛불
총각
총리
총장
촬영
최근
최상
최선
최신
최악
최종
추석
추억
추진
추천
추측
축구
축소
축제
축하
출근
출발
출산
출신
출연
출입
출장
출판
충격
충고
충돌
충분히
충청도
취업
취직
취향
치약
친구
친척
칠십
칠월
칠판
침대
침묵
침실
칫솔
칭찬
카메라
카운터
칼국수
캐릭터
캠퍼스
캠페인
커튼
컨디션
컬러
컴퓨터
코끼리
코미디
콘서트
콜라
콤플렉스
콩나물
쾌감
쿠데타
크림
큰길
큰딸
큰소리
큰아들
큰어머니
큰일
큰절
클래식
클럽
킬로
타입
타자기
탁구
탁자
탄생
태권도
태양
태풍
택시
탤런트
터널
터미널
테니스
테스트
테이블
텔레비전
토론
토마토
토요일
통계
통과
통로
통신
통역
통일
통장
통제
통증
통합
통화
퇴근
퇴원
퇴직금
튀김
트럭
특급
특별
특성
특수
특징
특히
튼튼히
티셔츠
파란색
파일
파출소
판결
판단
판매
판사
팔십
팔월
팝송
패션
팩스
팩시밀리
팬티
퍼센트
페인트
편견
편의
편지
편히
평가
평균
평생
평소
평양
평일
평화
포스터
포인트
포장
포함
표면
표정
표준
표현
품목
품질
풍경
풍속
풍습
프랑스
프린터
플라스틱
피곤
피망
피아노
필름
필수
필요
필자
필통
핑계
하느님
하늘
하드웨어
하룻밤
하반기
하숙집
하순
하여튼
하지만
하천
하품
하필
학과
학교
학급
학기
학년
학력
학번
학부모
학비
학생
학술
학습
학용품
학원
학위
학자
학점
한계
한글
한꺼번에
한낮
한눈
한동안
한때
한라산
한마디
한문
한번
한복
한식
한여름
한쪽
할머니
할아버지
할인
함께
함부로
합격
합리적
항공
항구
항상
항의
해결
해군
해답
해당
해물
해석
해설
해수욕장
해안
핵심
핸드백
햄버거
햇볕
햇살
행동
행복
행사
행운
행위
향기
향상
향수
허락
허용
헬기
현관
현금
현대
현상
현실
현장
현재
현지
혈액
협력
형부
형사
형수
형식
형제
형태
형편
혜택
호기심
호남
호랑이
호박
호텔
호흡
혹시
홀로
홈페이지
홍보
홍수
홍차
화면
화분
화살
화요일
화장
화학
확보
확인
확장
확정
환갑
환경
환영
환율
환자
활기
활동
활발히
활용
활짝
회견
회관
회복
회색
회원
회장
회전
횟수
횡단보도
효율적
후반
후춧가루
훈련
훨씬
휴식
휴일
흉내
흐름
흑백
흑인
흔적
흔히
흥미
흥분
희곡
희망
희생
흰색
힘껏`.split('\n'));

    /** Portuguese BIP39 wordlist. */
    const wordlist$2 = /* @__PURE__ */ Object.freeze(`abacate
abaixo
abalar
abater
abduzir
abelha
aberto
abismo
abotoar
abranger
abreviar
abrigar
abrupto
absinto
absoluto
absurdo
abutre
acabado
acalmar
acampar
acanhar
acaso
aceitar
acelerar
acenar
acervo
acessar
acetona
achatar
acidez
acima
acionado
acirrar
aclamar
aclive
acolhida
acomodar
acoplar
acordar
acumular
acusador
adaptar
adega
adentro
adepto
adequar
aderente
adesivo
adeus
adiante
aditivo
adjetivo
adjunto
admirar
adorar
adquirir
adubo
adverso
advogado
aeronave
afastar
aferir
afetivo
afinador
afivelar
aflito
afluente
afrontar
agachar
agarrar
agasalho
agenciar
agilizar
agiota
agitado
agora
agradar
agreste
agrupar
aguardar
agulha
ajoelhar
ajudar
ajustar
alameda
alarme
alastrar
alavanca
albergue
albino
alcatra
aldeia
alecrim
alegria
alertar
alface
alfinete
algum
alheio
aliar
alicate
alienar
alinhar
aliviar
almofada
alocar
alpiste
alterar
altitude
alucinar
alugar
aluno
alusivo
alvo
amaciar
amador
amarelo
amassar
ambas
ambiente
ameixa
amenizar
amido
amistoso
amizade
amolador
amontoar
amoroso
amostra
amparar
ampliar
ampola
anagrama
analisar
anarquia
anatomia
andaime
anel
anexo
angular
animar
anjo
anomalia
anotado
ansioso
anterior
anuidade
anunciar
anzol
apagador
apalpar
apanhado
apego
apelido
apertada
apesar
apetite
apito
aplauso
aplicada
apoio
apontar
aposta
aprendiz
aprovar
aquecer
arame
aranha
arara
arcada
ardente
areia
arejar
arenito
aresta
argiloso
argola
arma
arquivo
arraial
arrebate
arriscar
arroba
arrumar
arsenal
arterial
artigo
arvoredo
asfaltar
asilado
aspirar
assador
assinar
assoalho
assunto
astral
atacado
atadura
atalho
atarefar
atear
atender
aterro
ateu
atingir
atirador
ativo
atoleiro
atracar
atrevido
atriz
atual
atum
auditor
aumentar
aura
aurora
autismo
autoria
autuar
avaliar
avante
avaria
avental
avesso
aviador
avisar
avulso
axila
azarar
azedo
azeite
azulejo
babar
babosa
bacalhau
bacharel
bacia
bagagem
baiano
bailar
baioneta
bairro
baixista
bajular
baleia
baliza
balsa
banal
bandeira
banho
banir
banquete
barato
barbado
baronesa
barraca
barulho
baseado
bastante
batata
batedor
batida
batom
batucar
baunilha
beber
beijo
beirada
beisebol
beldade
beleza
belga
beliscar
bendito
bengala
benzer
berimbau
berlinda
berro
besouro
bexiga
bezerro
bico
bicudo
bienal
bifocal
bifurcar
bigorna
bilhete
bimestre
bimotor
biologia
biombo
biosfera
bipolar
birrento
biscoito
bisneto
bispo
bissexto
bitola
bizarro
blindado
bloco
bloquear
boato
bobagem
bocado
bocejo
bochecha
boicotar
bolada
boletim
bolha
bolo
bombeiro
bonde
boneco
bonita
borbulha
borda
boreal
borracha
bovino
boxeador
branco
brasa
braveza
breu
briga
brilho
brincar
broa
brochura
bronzear
broto
bruxo
bucha
budismo
bufar
bule
buraco
busca
busto
buzina
cabana
cabelo
cabide
cabo
cabrito
cacau
cacetada
cachorro
cacique
cadastro
cadeado
cafezal
caiaque
caipira
caixote
cajado
caju
calafrio
calcular
caldeira
calibrar
calmante
calota
camada
cambista
camisa
camomila
campanha
camuflar
canavial
cancelar
caneta
canguru
canhoto
canivete
canoa
cansado
cantar
canudo
capacho
capela
capinar
capotar
capricho
captador
capuz
caracol
carbono
cardeal
careca
carimbar
carneiro
carpete
carreira
cartaz
carvalho
casaco
casca
casebre
castelo
casulo
catarata
cativar
caule
causador
cautelar
cavalo
caverna
cebola
cedilha
cegonha
celebrar
celular
cenoura
censo
centeio
cercar
cerrado
certeiro
cerveja
cetim
cevada
chacota
chaleira
chamado
chapada
charme
chatice
chave
chefe
chegada
cheiro
cheque
chicote
chifre
chinelo
chocalho
chover
chumbo
chutar
chuva
cicatriz
ciclone
cidade
cidreira
ciente
cigana
cimento
cinto
cinza
ciranda
circuito
cirurgia
citar
clareza
clero
clicar
clone
clube
coado
coagir
cobaia
cobertor
cobrar
cocada
coelho
coentro
coeso
cogumelo
coibir
coifa
coiote
colar
coleira
colher
colidir
colmeia
colono
coluna
comando
combinar
comentar
comitiva
comover
complexo
comum
concha
condor
conectar
confuso
congelar
conhecer
conjugar
consumir
contrato
convite
cooperar
copeiro
copiador
copo
coquetel
coragem
cordial
corneta
coronha
corporal
correio
cortejo
coruja
corvo
cosseno
costela
cotonete
couro
couve
covil
cozinha
cratera
cravo
creche
credor
creme
crer
crespo
criada
criminal
crioulo
crise
criticar
crosta
crua
cruzeiro
cubano
cueca
cuidado
cujo
culatra
culminar
culpar
cultura
cumprir
cunhado
cupido
curativo
curral
cursar
curto
cuspir
custear
cutelo
damasco
datar
debater
debitar
deboche
debulhar
decalque
decimal
declive
decote
decretar
dedal
dedicado
deduzir
defesa
defumar
degelo
degrau
degustar
deitado
deixar
delator
delegado
delinear
delonga
demanda
demitir
demolido
dentista
depenado
depilar
depois
depressa
depurar
deriva
derramar
desafio
desbotar
descanso
desenho
desfiado
desgaste
desigual
deslize
desmamar
desova
despesa
destaque
desviar
detalhar
detentor
detonar
detrito
deusa
dever
devido
devotado
dezena
diagrama
dialeto
didata
difuso
digitar
dilatado
diluente
diminuir
dinastia
dinheiro
diocese
direto
discreta
disfarce
disparo
disquete
dissipar
distante
ditador
diurno
diverso
divisor
divulgar
dizer
dobrador
dolorido
domador
dominado
donativo
donzela
dormente
dorsal
dosagem
dourado
doutor
drenagem
drible
drogaria
duelar
duende
dueto
duplo
duquesa
durante
duvidoso
eclodir
ecoar
ecologia
edificar
edital
educado
efeito
efetivar
ejetar
elaborar
eleger
eleitor
elenco
elevador
eliminar
elogiar
embargo
embolado
embrulho
embutido
emenda
emergir
emissor
empatia
empenho
empinado
empolgar
emprego
empurrar
emulador
encaixe
encenado
enchente
encontro
endeusar
endossar
enfaixar
enfeite
enfim
engajado
engenho
englobar
engomado
engraxar
enguia
enjoar
enlatar
enquanto
enraizar
enrolado
enrugar
ensaio
enseada
ensino
ensopado
entanto
enteado
entidade
entortar
entrada
entulho
envergar
enviado
envolver
enxame
enxerto
enxofre
enxuto
epiderme
equipar
ereto
erguido
errata
erva
ervilha
esbanjar
esbelto
escama
escola
escrita
escuta
esfinge
esfolar
esfregar
esfumado
esgrima
esmalte
espanto
espelho
espiga
esponja
espreita
espumar
esquerda
estaca
esteira
esticar
estofado
estrela
estudo
esvaziar
etanol
etiqueta
euforia
europeu
evacuar
evaporar
evasivo
eventual
evidente
evoluir
exagero
exalar
examinar
exato
exausto
excesso
excitar
exclamar
executar
exemplo
exibir
exigente
exonerar
expandir
expelir
expirar
explanar
exposto
expresso
expulsar
externo
extinto
extrato
fabricar
fabuloso
faceta
facial
fada
fadiga
faixa
falar
falta
familiar
fandango
fanfarra
fantoche
fardado
farelo
farinha
farofa
farpa
fartura
fatia
fator
favorita
faxina
fazenda
fechado
feijoada
feirante
felino
feminino
fenda
feno
fera
feriado
ferrugem
ferver
festejar
fetal
feudal
fiapo
fibrose
ficar
ficheiro
figurado
fileira
filho
filme
filtrar
firmeza
fisgada
fissura
fita
fivela
fixador
fixo
flacidez
flamingo
flanela
flechada
flora
flutuar
fluxo
focal
focinho
fofocar
fogo
foguete
foice
folgado
folheto
forjar
formiga
forno
forte
fosco
fossa
fragata
fralda
frango
frasco
fraterno
freira
frente
fretar
frieza
friso
fritura
fronha
frustrar
fruteira
fugir
fulano
fuligem
fundar
fungo
funil
furador
furioso
futebol
gabarito
gabinete
gado
gaiato
gaiola
gaivota
galega
galho
galinha
galocha
ganhar
garagem
garfo
gargalo
garimpo
garoupa
garrafa
gasoduto
gasto
gata
gatilho
gaveta
gazela
gelado
geleia
gelo
gemada
gemer
gemido
generoso
gengiva
genial
genoma
genro
geologia
gerador
germinar
gesso
gestor
ginasta
gincana
gingado
girafa
girino
glacial
glicose
global
glorioso
goela
goiaba
golfe
golpear
gordura
gorjeta
gorro
gostoso
goteira
governar
gracejo
gradual
grafite
gralha
grampo
granada
gratuito
graveto
graxa
grego
grelhar
greve
grilo
grisalho
gritaria
grosso
grotesco
grudado
grunhido
gruta
guache
guarani
guaxinim
guerrear
guiar
guincho
guisado
gula
guloso
guru
habitar
harmonia
haste
haver
hectare
herdar
heresia
hesitar
hiato
hibernar
hidratar
hiena
hino
hipismo
hipnose
hipoteca
hoje
holofote
homem
honesto
honrado
hormonal
hospedar
humorado
iate
ideia
idoso
ignorado
igreja
iguana
ileso
ilha
iludido
iluminar
ilustrar
imagem
imediato
imenso
imersivo
iminente
imitador
imortal
impacto
impedir
implante
impor
imprensa
impune
imunizar
inalador
inapto
inativo
incenso
inchar
incidir
incluir
incolor
indeciso
indireto
indutor
ineficaz
inerente
infantil
infestar
infinito
inflamar
informal
infrator
ingerir
inibido
inicial
inimigo
injetar
inocente
inodoro
inovador
inox
inquieto
inscrito
inseto
insistir
inspetor
instalar
insulto
intacto
integral
intimar
intocado
intriga
invasor
inverno
invicto
invocar
iogurte
iraniano
ironizar
irreal
irritado
isca
isento
isolado
isqueiro
italiano
janeiro
jangada
janta
jararaca
jardim
jarro
jasmim
jato
javali
jazida
jejum
joaninha
joelhada
jogador
joia
jornal
jorrar
jovem
juba
judeu
judoca
juiz
julgador
julho
jurado
jurista
juro
justa
labareda
laboral
lacre
lactante
ladrilho
lagarta
lagoa
laje
lamber
lamentar
laminar
lampejo
lanche
lapidar
lapso
laranja
lareira
largura
lasanha
lastro
lateral
latido
lavanda
lavoura
lavrador
laxante
lazer
lealdade
lebre
legado
legendar
legista
leigo
leiloar
leitura
lembrete
leme
lenhador
lentilha
leoa
lesma
leste
letivo
letreiro
levar
leveza
levitar
liberal
libido
liderar
ligar
ligeiro
limitar
limoeiro
limpador
linda
linear
linhagem
liquidez
listagem
lisura
litoral
livro
lixa
lixeira
locador
locutor
lojista
lombo
lona
longe
lontra
lorde
lotado
loteria
loucura
lousa
louvar
luar
lucidez
lucro
luneta
lustre
lutador
luva
macaco
macete
machado
macio
madeira
madrinha
magnata
magreza
maior
mais
malandro
malha
malote
maluco
mamilo
mamoeiro
mamute
manada
mancha
mandato
manequim
manhoso
manivela
manobrar
mansa
manter
manusear
mapeado
maquinar
marcador
maresia
marfim
margem
marinho
marmita
maroto
marquise
marreco
martelo
marujo
mascote
masmorra
massagem
mastigar
matagal
materno
matinal
matutar
maxilar
medalha
medida
medusa
megafone
meiga
melancia
melhor
membro
memorial
menino
menos
mensagem
mental
merecer
mergulho
mesada
mesclar
mesmo
mesquita
mestre
metade
meteoro
metragem
mexer
mexicano
micro
migalha
migrar
milagre
milenar
milhar
mimado
minerar
minhoca
ministro
minoria
miolo
mirante
mirtilo
misturar
mocidade
moderno
modular
moeda
moer
moinho
moita
moldura
moleza
molho
molinete
molusco
montanha
moqueca
morango
morcego
mordomo
morena
mosaico
mosquete
mostarda
motel
motim
moto
motriz
muda
muito
mulata
mulher
multar
mundial
munido
muralha
murcho
muscular
museu
musical
nacional
nadador
naja
namoro
narina
narrado
nascer
nativa
natureza
navalha
navegar
navio
neblina
nebuloso
negativa
negociar
negrito
nervoso
neta
neural
nevasca
nevoeiro
ninar
ninho
nitidez
nivelar
nobreza
noite
noiva
nomear
nominal
nordeste
nortear
notar
noticiar
noturno
novelo
novilho
novo
nublado
nudez
numeral
nupcial
nutrir
nuvem
obcecado
obedecer
objetivo
obrigado
obscuro
obstetra
obter
obturar
ocidente
ocioso
ocorrer
oculista
ocupado
ofegante
ofensiva
oferenda
oficina
ofuscado
ogiva
olaria
oleoso
olhar
oliveira
ombro
omelete
omisso
omitir
ondulado
oneroso
ontem
opcional
operador
oponente
oportuno
oposto
orar
orbitar
ordem
ordinal
orfanato
orgasmo
orgulho
oriental
origem
oriundo
orla
ortodoxo
orvalho
oscilar
ossada
osso
ostentar
otimismo
ousadia
outono
outubro
ouvido
ovelha
ovular
oxidar
oxigenar
pacato
paciente
pacote
pactuar
padaria
padrinho
pagar
pagode
painel
pairar
paisagem
palavra
palestra
palheta
palito
palmada
palpitar
pancada
panela
panfleto
panqueca
pantanal
papagaio
papelada
papiro
parafina
parcial
pardal
parede
partida
pasmo
passado
pastel
patamar
patente
patinar
patrono
paulada
pausar
peculiar
pedalar
pedestre
pediatra
pedra
pegada
peitoral
peixe
pele
pelicano
penca
pendurar
peneira
penhasco
pensador
pente
perceber
perfeito
pergunta
perito
permitir
perna
perplexo
persiana
pertence
peruca
pescado
pesquisa
pessoa
petiscar
piada
picado
piedade
pigmento
pilastra
pilhado
pilotar
pimenta
pincel
pinguim
pinha
pinote
pintar
pioneiro
pipoca
piquete
piranha
pires
pirueta
piscar
pistola
pitanga
pivete
planta
plaqueta
platina
plebeu
plumagem
pluvial
pneu
poda
poeira
poetisa
polegada
policiar
poluente
polvilho
pomar
pomba
ponderar
pontaria
populoso
porta
possuir
postal
pote
poupar
pouso
povoar
praia
prancha
prato
praxe
prece
predador
prefeito
premiar
prensar
preparar
presilha
pretexto
prevenir
prezar
primata
princesa
prisma
privado
processo
produto
profeta
proibido
projeto
prometer
propagar
prosa
protetor
provador
publicar
pudim
pular
pulmonar
pulseira
punhal
punir
pupilo
pureza
puxador
quadra
quantia
quarto
quase
quebrar
queda
queijo
quente
querido
quimono
quina
quiosque
rabanada
rabisco
rachar
racionar
radial
raiar
rainha
raio
raiva
rajada
ralado
ramal
ranger
ranhura
rapadura
rapel
rapidez
raposa
raquete
raridade
rasante
rascunho
rasgar
raspador
rasteira
rasurar
ratazana
ratoeira
realeza
reanimar
reaver
rebaixar
rebelde
rebolar
recado
recente
recheio
recibo
recordar
recrutar
recuar
rede
redimir
redonda
reduzida
reenvio
refinar
refletir
refogar
refresco
refugiar
regalia
regime
regra
reinado
reitor
rejeitar
relativo
remador
remendo
remorso
renovado
reparo
repelir
repleto
repolho
represa
repudiar
requerer
resenha
resfriar
resgatar
residir
resolver
respeito
ressaca
restante
resumir
retalho
reter
retirar
retomada
retratar
revelar
revisor
revolta
riacho
rica
rigidez
rigoroso
rimar
ringue
risada
risco
risonho
robalo
rochedo
rodada
rodeio
rodovia
roedor
roleta
romano
roncar
rosado
roseira
rosto
rota
roteiro
rotina
rotular
rouco
roupa
roxo
rubro
rugido
rugoso
ruivo
rumo
rupestre
russo
sabor
saciar
sacola
sacudir
sadio
safira
saga
sagrada
saibro
salada
saleiro
salgado
saliva
salpicar
salsicha
saltar
salvador
sambar
samurai
sanar
sanfona
sangue
sanidade
sapato
sarda
sargento
sarjeta
saturar
saudade
saxofone
sazonal
secar
secular
seda
sedento
sediado
sedoso
sedutor
segmento
segredo
segundo
seiva
seleto
selvagem
semanal
semente
senador
senhor
sensual
sentado
separado
sereia
seringa
serra
servo
setembro
setor
sigilo
silhueta
silicone
simetria
simpatia
simular
sinal
sincero
singular
sinopse
sintonia
sirene
siri
situado
soberano
sobra
socorro
sogro
soja
solda
soletrar
solteiro
sombrio
sonata
sondar
sonegar
sonhador
sono
soprano
soquete
sorrir
sorteio
sossego
sotaque
soterrar
sovado
sozinho
suavizar
subida
submerso
subsolo
subtrair
sucata
sucesso
suco
sudeste
sufixo
sugador
sugerir
sujeito
sulfato
sumir
suor
superior
suplicar
suposto
suprimir
surdina
surfista
surpresa
surreal
surtir
suspiro
sustento
tabela
tablete
tabuada
tacho
tagarela
talher
talo
talvez
tamanho
tamborim
tampa
tangente
tanto
tapar
tapioca
tardio
tarefa
tarja
tarraxa
tatuagem
taurino
taxativo
taxista
teatral
tecer
tecido
teclado
tedioso
teia
teimar
telefone
telhado
tempero
tenente
tensor
tentar
termal
terno
terreno
tese
tesoura
testado
teto
textura
texugo
tiara
tigela
tijolo
timbrar
timidez
tingido
tinteiro
tiragem
titular
toalha
tocha
tolerar
tolice
tomada
tomilho
tonel
tontura
topete
tora
torcido
torneio
torque
torrada
torto
tostar
touca
toupeira
toxina
trabalho
tracejar
tradutor
trafegar
trajeto
trama
trancar
trapo
traseiro
tratador
travar
treino
tremer
trepidar
trevo
triagem
tribo
triciclo
tridente
trilogia
trindade
triplo
triturar
triunfal
trocar
trombeta
trova
trunfo
truque
tubular
tucano
tudo
tulipa
tupi
turbo
turma
turquesa
tutelar
tutorial
uivar
umbigo
unha
unidade
uniforme
urologia
urso
urtiga
urubu
usado
usina
usufruir
vacina
vadiar
vagaroso
vaidoso
vala
valente
validade
valores
vantagem
vaqueiro
varanda
vareta
varrer
vascular
vasilha
vassoura
vazar
vazio
veado
vedar
vegetar
veicular
veleiro
velhice
veludo
vencedor
vendaval
venerar
ventre
verbal
verdade
vereador
vergonha
vermelho
verniz
versar
vertente
vespa
vestido
vetorial
viaduto
viagem
viajar
viatura
vibrador
videira
vidraria
viela
viga
vigente
vigiar
vigorar
vilarejo
vinco
vinheta
vinil
violeta
virada
virtude
visitar
visto
vitral
viveiro
vizinho
voador
voar
vogal
volante
voleibol
voltagem
volumoso
vontade
vulto
vuvuzela
xadrez
xarope
xeque
xeretar
xerife
xingar
zangado
zarpar
zebu
zelador
zombar
zoologia
zumbido`.split('\n'));

    /** Spanish BIP39 wordlist. */
    const wordlist$1 = /* @__PURE__ */ Object.freeze(`ábaco
abdomen
abeja
abierto
abogado
abono
aborto
abrazo
abrir
abuelo
abuso
acabar
academia
acceso
acción
aceite
acelga
acento
aceptar
ácido
aclarar
acné
acoger
acoso
activo
acto
actriz
actuar
acudir
acuerdo
acusar
adicto
admitir
adoptar
adorno
aduana
adulto
aéreo
afectar
afición
afinar
afirmar
ágil
agitar
agonía
agosto
agotar
agregar
agrio
agua
agudo
águila
aguja
ahogo
ahorro
aire
aislar
ajedrez
ajeno
ajuste
alacrán
alambre
alarma
alba
álbum
alcalde
aldea
alegre
alejar
alerta
aleta
alfiler
alga
algodón
aliado
aliento
alivio
alma
almeja
almíbar
altar
alteza
altivo
alto
altura
alumno
alzar
amable
amante
amapola
amargo
amasar
ámbar
ámbito
ameno
amigo
amistad
amor
amparo
amplio
ancho
anciano
ancla
andar
andén
anemia
ángulo
anillo
ánimo
anís
anotar
antena
antiguo
antojo
anual
anular
anuncio
añadir
añejo
año
apagar
aparato
apetito
apio
aplicar
apodo
aporte
apoyo
aprender
aprobar
apuesta
apuro
arado
araña
arar
árbitro
árbol
arbusto
archivo
arco
arder
ardilla
arduo
área
árido
aries
armonía
arnés
aroma
arpa
arpón
arreglo
arroz
arruga
arte
artista
asa
asado
asalto
ascenso
asegurar
aseo
asesor
asiento
asilo
asistir
asno
asombro
áspero
astilla
astro
astuto
asumir
asunto
atajo
ataque
atar
atento
ateo
ático
atleta
átomo
atraer
atroz
atún
audaz
audio
auge
aula
aumento
ausente
autor
aval
avance
avaro
ave
avellana
avena
avestruz
avión
aviso
ayer
ayuda
ayuno
azafrán
azar
azote
azúcar
azufre
azul
baba
babor
bache
bahía
baile
bajar
balanza
balcón
balde
bambú
banco
banda
baño
barba
barco
barniz
barro
báscula
bastón
basura
batalla
batería
batir
batuta
baúl
bazar
bebé
bebida
bello
besar
beso
bestia
bicho
bien
bingo
blanco
bloque
blusa
boa
bobina
bobo
boca
bocina
boda
bodega
boina
bola
bolero
bolsa
bomba
bondad
bonito
bono
bonsái
borde
borrar
bosque
bote
botín
bóveda
bozal
bravo
brazo
brecha
breve
brillo
brinco
brisa
broca
broma
bronce
brote
bruja
brusco
bruto
buceo
bucle
bueno
buey
bufanda
bufón
búho
buitre
bulto
burbuja
burla
burro
buscar
butaca
buzón
caballo
cabeza
cabina
cabra
cacao
cadáver
cadena
caer
café
caída
caimán
caja
cajón
cal
calamar
calcio
caldo
calidad
calle
calma
calor
calvo
cama
cambio
camello
camino
campo
cáncer
candil
canela
canguro
canica
canto
caña
cañón
caoba
caos
capaz
capitán
capote
captar
capucha
cara
carbón
cárcel
careta
carga
cariño
carne
carpeta
carro
carta
casa
casco
casero
caspa
castor
catorce
catre
caudal
causa
cazo
cebolla
ceder
cedro
celda
célebre
celoso
célula
cemento
ceniza
centro
cerca
cerdo
cereza
cero
cerrar
certeza
césped
cetro
chacal
chaleco
champú
chancla
chapa
charla
chico
chiste
chivo
choque
choza
chuleta
chupar
ciclón
ciego
cielo
cien
cierto
cifra
cigarro
cima
cinco
cine
cinta
ciprés
circo
ciruela
cisne
cita
ciudad
clamor
clan
claro
clase
clave
cliente
clima
clínica
cobre
cocción
cochino
cocina
coco
código
codo
cofre
coger
cohete
cojín
cojo
cola
colcha
colegio
colgar
colina
collar
colmo
columna
combate
comer
comida
cómodo
compra
conde
conejo
conga
conocer
consejo
contar
copa
copia
corazón
corbata
corcho
cordón
corona
correr
coser
cosmos
costa
cráneo
cráter
crear
crecer
creído
crema
cría
crimen
cripta
crisis
cromo
crónica
croqueta
crudo
cruz
cuadro
cuarto
cuatro
cubo
cubrir
cuchara
cuello
cuento
cuerda
cuesta
cueva
cuidar
culebra
culpa
culto
cumbre
cumplir
cuna
cuneta
cuota
cupón
cúpula
curar
curioso
curso
curva
cutis
dama
danza
dar
dardo
dátil
deber
débil
década
decir
dedo
defensa
definir
dejar
delfín
delgado
delito
demora
denso
dental
deporte
derecho
derrota
desayuno
deseo
desfile
desnudo
destino
desvío
detalle
detener
deuda
día
diablo
diadema
diamante
diana
diario
dibujo
dictar
diente
dieta
diez
difícil
digno
dilema
diluir
dinero
directo
dirigir
disco
diseño
disfraz
diva
divino
doble
doce
dolor
domingo
don
donar
dorado
dormir
dorso
dos
dosis
dragón
droga
ducha
duda
duelo
dueño
dulce
dúo
duque
durar
dureza
duro
ébano
ebrio
echar
eco
ecuador
edad
edición
edificio
editor
educar
efecto
eficaz
eje
ejemplo
elefante
elegir
elemento
elevar
elipse
élite
elixir
elogio
eludir
embudo
emitir
emoción
empate
empeño
empleo
empresa
enano
encargo
enchufe
encía
enemigo
enero
enfado
enfermo
engaño
enigma
enlace
enorme
enredo
ensayo
enseñar
entero
entrar
envase
envío
época
equipo
erizo
escala
escena
escolar
escribir
escudo
esencia
esfera
esfuerzo
espada
espejo
espía
esposa
espuma
esquí
estar
este
estilo
estufa
etapa
eterno
ética
etnia
evadir
evaluar
evento
evitar
exacto
examen
exceso
excusa
exento
exigir
exilio
existir
éxito
experto
explicar
exponer
extremo
fábrica
fábula
fachada
fácil
factor
faena
faja
falda
fallo
falso
faltar
fama
familia
famoso
faraón
farmacia
farol
farsa
fase
fatiga
fauna
favor
fax
febrero
fecha
feliz
feo
feria
feroz
fértil
fervor
festín
fiable
fianza
fiar
fibra
ficción
ficha
fideo
fiebre
fiel
fiera
fiesta
figura
fijar
fijo
fila
filete
filial
filtro
fin
finca
fingir
finito
firma
flaco
flauta
flecha
flor
flota
fluir
flujo
flúor
fobia
foca
fogata
fogón
folio
folleto
fondo
forma
forro
fortuna
forzar
fosa
foto
fracaso
frágil
franja
frase
fraude
freír
freno
fresa
frío
frito
fruta
fuego
fuente
fuerza
fuga
fumar
función
funda
furgón
furia
fusil
fútbol
futuro
gacela
gafas
gaita
gajo
gala
galería
gallo
gamba
ganar
gancho
ganga
ganso
garaje
garza
gasolina
gastar
gato
gavilán
gemelo
gemir
gen
género
genio
gente
geranio
gerente
germen
gesto
gigante
gimnasio
girar
giro
glaciar
globo
gloria
gol
golfo
goloso
golpe
goma
gordo
gorila
gorra
gota
goteo
gozar
grada
gráfico
grano
grasa
gratis
grave
grieta
grillo
gripe
gris
grito
grosor
grúa
grueso
grumo
grupo
guante
guapo
guardia
guerra
guía
guiño
guion
guiso
guitarra
gusano
gustar
haber
hábil
hablar
hacer
hacha
hada
hallar
hamaca
harina
haz
hazaña
hebilla
hebra
hecho
helado
helio
hembra
herir
hermano
héroe
hervir
hielo
hierro
hígado
higiene
hijo
himno
historia
hocico
hogar
hoguera
hoja
hombre
hongo
honor
honra
hora
hormiga
horno
hostil
hoyo
hueco
huelga
huerta
hueso
huevo
huida
huir
humano
húmedo
humilde
humo
hundir
huracán
hurto
icono
ideal
idioma
ídolo
iglesia
iglú
igual
ilegal
ilusión
imagen
imán
imitar
impar
imperio
imponer
impulso
incapaz
índice
inerte
infiel
informe
ingenio
inicio
inmenso
inmune
innato
insecto
instante
interés
íntimo
intuir
inútil
invierno
ira
iris
ironía
isla
islote
jabalí
jabón
jamón
jarabe
jardín
jarra
jaula
jazmín
jefe
jeringa
jinete
jornada
joroba
joven
joya
juerga
jueves
juez
jugador
jugo
juguete
juicio
junco
jungla
junio
juntar
júpiter
jurar
justo
juvenil
juzgar
kilo
koala
labio
lacio
lacra
lado
ladrón
lagarto
lágrima
laguna
laico
lamer
lámina
lámpara
lana
lancha
langosta
lanza
lápiz
largo
larva
lástima
lata
látex
latir
laurel
lavar
lazo
leal
lección
leche
lector
leer
legión
legumbre
lejano
lengua
lento
leña
león
leopardo
lesión
letal
letra
leve
leyenda
libertad
libro
licor
líder
lidiar
lienzo
liga
ligero
lima
límite
limón
limpio
lince
lindo
línea
lingote
lino
linterna
líquido
liso
lista
litera
litio
litro
llaga
llama
llanto
llave
llegar
llenar
llevar
llorar
llover
lluvia
lobo
loción
loco
locura
lógica
logro
lombriz
lomo
lonja
lote
lucha
lucir
lugar
lujo
luna
lunes
lupa
lustro
luto
luz
maceta
macho
madera
madre
maduro
maestro
mafia
magia
mago
maíz
maldad
maleta
malla
malo
mamá
mambo
mamut
manco
mando
manejar
manga
maniquí
manjar
mano
manso
manta
mañana
mapa
máquina
mar
marco
marea
marfil
margen
marido
mármol
marrón
martes
marzo
masa
máscara
masivo
matar
materia
matiz
matriz
máximo
mayor
mazorca
mecha
medalla
medio
médula
mejilla
mejor
melena
melón
memoria
menor
mensaje
mente
menú
mercado
merengue
mérito
mes
mesón
meta
meter
método
metro
mezcla
miedo
miel
miembro
miga
mil
milagro
militar
millón
mimo
mina
minero
mínimo
minuto
miope
mirar
misa
miseria
misil
mismo
mitad
mito
mochila
moción
moda
modelo
moho
mojar
molde
moler
molino
momento
momia
monarca
moneda
monja
monto
moño
morada
morder
moreno
morir
morro
morsa
mortal
mosca
mostrar
motivo
mover
móvil
mozo
mucho
mudar
mueble
muela
muerte
muestra
mugre
mujer
mula
muleta
multa
mundo
muñeca
mural
muro
músculo
museo
musgo
música
muslo
nácar
nación
nadar
naipe
naranja
nariz
narrar
nasal
natal
nativo
natural
náusea
naval
nave
navidad
necio
néctar
negar
negocio
negro
neón
nervio
neto
neutro
nevar
nevera
nicho
nido
niebla
nieto
niñez
niño
nítido
nivel
nobleza
noche
nómina
noria
norma
norte
nota
noticia
novato
novela
novio
nube
nuca
núcleo
nudillo
nudo
nuera
nueve
nuez
nulo
número
nutria
oasis
obeso
obispo
objeto
obra
obrero
observar
obtener
obvio
oca
ocaso
océano
ochenta
ocho
ocio
ocre
octavo
octubre
oculto
ocupar
ocurrir
odiar
odio
odisea
oeste
ofensa
oferta
oficio
ofrecer
ogro
oído
oír
ojo
ola
oleada
olfato
olivo
olla
olmo
olor
olvido
ombligo
onda
onza
opaco
opción
ópera
opinar
oponer
optar
óptica
opuesto
oración
orador
oral
órbita
orca
orden
oreja
órgano
orgía
orgullo
oriente
origen
orilla
oro
orquesta
oruga
osadía
oscuro
osezno
oso
ostra
otoño
otro
oveja
óvulo
óxido
oxígeno
oyente
ozono
pacto
padre
paella
página
pago
país
pájaro
palabra
palco
paleta
pálido
palma
paloma
palpar
pan
panal
pánico
pantera
pañuelo
papá
papel
papilla
paquete
parar
parcela
pared
parir
paro
párpado
parque
párrafo
parte
pasar
paseo
pasión
paso
pasta
pata
patio
patria
pausa
pauta
pavo
payaso
peatón
pecado
pecera
pecho
pedal
pedir
pegar
peine
pelar
peldaño
pelea
peligro
pellejo
pelo
peluca
pena
pensar
peñón
peón
peor
pepino
pequeño
pera
percha
perder
pereza
perfil
perico
perla
permiso
perro
persona
pesa
pesca
pésimo
pestaña
pétalo
petróleo
pez
pezuña
picar
pichón
pie
piedra
pierna
pieza
pijama
pilar
piloto
pimienta
pino
pintor
pinza
piña
piojo
pipa
pirata
pisar
piscina
piso
pista
pitón
pizca
placa
plan
plata
playa
plaza
pleito
pleno
plomo
pluma
plural
pobre
poco
poder
podio
poema
poesía
poeta
polen
policía
pollo
polvo
pomada
pomelo
pomo
pompa
poner
porción
portal
posada
poseer
posible
poste
potencia
potro
pozo
prado
precoz
pregunta
premio
prensa
preso
previo
primo
príncipe
prisión
privar
proa
probar
proceso
producto
proeza
profesor
programa
prole
promesa
pronto
propio
próximo
prueba
público
puchero
pudor
pueblo
puerta
puesto
pulga
pulir
pulmón
pulpo
pulso
puma
punto
puñal
puño
pupa
pupila
puré
quedar
queja
quemar
querer
queso
quieto
química
quince
quitar
rábano
rabia
rabo
ración
radical
raíz
rama
rampa
rancho
rango
rapaz
rápido
rapto
rasgo
raspa
rato
rayo
raza
razón
reacción
realidad
rebaño
rebote
recaer
receta
rechazo
recoger
recreo
recto
recurso
red
redondo
reducir
reflejo
reforma
refrán
refugio
regalo
regir
regla
regreso
rehén
reino
reír
reja
relato
relevo
relieve
relleno
reloj
remar
remedio
remo
rencor
rendir
renta
reparto
repetir
reposo
reptil
res
rescate
resina
respeto
resto
resumen
retiro
retorno
retrato
reunir
revés
revista
rey
rezar
rico
riego
rienda
riesgo
rifa
rígido
rigor
rincón
riñón
río
riqueza
risa
ritmo
rito
rizo
roble
roce
rociar
rodar
rodeo
rodilla
roer
rojizo
rojo
romero
romper
ron
ronco
ronda
ropa
ropero
rosa
rosca
rostro
rotar
rubí
rubor
rudo
rueda
rugir
ruido
ruina
ruleta
rulo
rumbo
rumor
ruptura
ruta
rutina
sábado
saber
sabio
sable
sacar
sagaz
sagrado
sala
saldo
salero
salir
salmón
salón
salsa
salto
salud
salvar
samba
sanción
sandía
sanear
sangre
sanidad
sano
santo
sapo
saque
sardina
sartén
sastre
satán
sauna
saxofón
sección
seco
secreto
secta
sed
seguir
seis
sello
selva
semana
semilla
senda
sensor
señal
señor
separar
sepia
sequía
ser
serie
sermón
servir
sesenta
sesión
seta
setenta
severo
sexo
sexto
sidra
siesta
siete
siglo
signo
sílaba
silbar
silencio
silla
símbolo
simio
sirena
sistema
sitio
situar
sobre
socio
sodio
sol
solapa
soldado
soledad
sólido
soltar
solución
sombra
sondeo
sonido
sonoro
sonrisa
sopa
soplar
soporte
sordo
sorpresa
sorteo
sostén
sótano
suave
subir
suceso
sudor
suegra
suelo
sueño
suerte
sufrir
sujeto
sultán
sumar
superar
suplir
suponer
supremo
sur
surco
sureño
surgir
susto
sutil
tabaco
tabique
tabla
tabú
taco
tacto
tajo
talar
talco
talento
talla
talón
tamaño
tambor
tango
tanque
tapa
tapete
tapia
tapón
taquilla
tarde
tarea
tarifa
tarjeta
tarot
tarro
tarta
tatuaje
tauro
taza
tazón
teatro
techo
tecla
técnica
tejado
tejer
tejido
tela
teléfono
tema
temor
templo
tenaz
tender
tener
tenis
tenso
teoría
terapia
terco
término
ternura
terror
tesis
tesoro
testigo
tetera
texto
tez
tibio
tiburón
tiempo
tienda
tierra
tieso
tigre
tijera
tilde
timbre
tímido
timo
tinta
tío
típico
tipo
tira
tirón
titán
títere
título
tiza
toalla
tobillo
tocar
tocino
todo
toga
toldo
tomar
tono
tonto
topar
tope
toque
tórax
torero
tormenta
torneo
toro
torpedo
torre
torso
tortuga
tos
tosco
toser
tóxico
trabajo
tractor
traer
tráfico
trago
traje
tramo
trance
trato
trauma
trazar
trébol
tregua
treinta
tren
trepar
tres
tribu
trigo
tripa
triste
triunfo
trofeo
trompa
tronco
tropa
trote
trozo
truco
trueno
trufa
tubería
tubo
tuerto
tumba
tumor
túnel
túnica
turbina
turismo
turno
tutor
ubicar
úlcera
umbral
unidad
unir
universo
uno
untar
uña
urbano
urbe
urgente
urna
usar
usuario
útil
utopía
uva
vaca
vacío
vacuna
vagar
vago
vaina
vajilla
vale
válido
valle
valor
válvula
vampiro
vara
variar
varón
vaso
vecino
vector
vehículo
veinte
vejez
vela
velero
veloz
vena
vencer
venda
veneno
vengar
venir
venta
venus
ver
verano
verbo
verde
vereda
verja
verso
verter
vía
viaje
vibrar
vicio
víctima
vida
vídeo
vidrio
viejo
viernes
vigor
vil
villa
vinagre
vino
viñedo
violín
viral
virgo
virtud
visor
víspera
vista
vitamina
viudo
vivaz
vivero
vivir
vivo
volcán
volumen
volver
voraz
votar
voto
voz
vuelo
vulgar
yacer
yate
yegua
yema
yerno
yeso
yodo
yoga
yogur
zafiro
zanja
zapato
zarza
zona
zorro
zumo
zurdo`.split('\n'));

    /** Simplified Chinese BIP39 wordlist. */
    const wordlist = /* @__PURE__ */ Object.freeze(`的
一
是
在
不
了
有
和
人
这
中
大
为
上
个
国
我
以
要
他
时
来
用
们
生
到
作
地
于
出
就
分
对
成
会
可
主
发
年
动
同
工
也
能
下
过
子
说
产
种
面
而
方
后
多
定
行
学
法
所
民
得
经
十
三
之
进
着
等
部
度
家
电
力
里
如
水
化
高
自
二
理
起
小
物
现
实
加
量
都
两
体
制
机
当
使
点
从
业
本
去
把
性
好
应
开
它
合
还
因
由
其
些
然
前
外
天
政
四
日
那
社
义
事
平
形
相
全
表
间
样
与
关
各
重
新
线
内
数
正
心
反
你
明
看
原
又
么
利
比
或
但
质
气
第
向
道
命
此
变
条
只
没
结
解
问
意
建
月
公
无
系
军
很
情
者
最
立
代
想
已
通
并
提
直
题
党
程
展
五
果
料
象
员
革
位
入
常
文
总
次
品
式
活
设
及
管
特
件
长
求
老
头
基
资
边
流
路
级
少
图
山
统
接
知
较
将
组
见
计
别
她
手
角
期
根
论
运
农
指
几
九
区
强
放
决
西
被
干
做
必
战
先
回
则
任
取
据
处
队
南
给
色
光
门
即
保
治
北
造
百
规
热
领
七
海
口
东
导
器
压
志
世
金
增
争
济
阶
油
思
术
极
交
受
联
什
认
六
共
权
收
证
改
清
美
再
采
转
更
单
风
切
打
白
教
速
花
带
安
场
身
车
例
真
务
具
万
每
目
至
达
走
积
示
议
声
报
斗
完
类
八
离
华
名
确
才
科
张
信
马
节
话
米
整
空
元
况
今
集
温
传
土
许
步
群
广
石
记
需
段
研
界
拉
林
律
叫
且
究
观
越
织
装
影
算
低
持
音
众
书
布
复
容
儿
须
际
商
非
验
连
断
深
难
近
矿
千
周
委
素
技
备
半
办
青
省
列
习
响
约
支
般
史
感
劳
便
团
往
酸
历
市
克
何
除
消
构
府
称
太
准
精
值
号
率
族
维
划
选
标
写
存
候
毛
亲
快
效
斯
院
查
江
型
眼
王
按
格
养
易
置
派
层
片
始
却
专
状
育
厂
京
识
适
属
圆
包
火
住
调
满
县
局
照
参
红
细
引
听
该
铁
价
严
首
底
液
官
德
随
病
苏
失
尔
死
讲
配
女
黄
推
显
谈
罪
神
艺
呢
席
含
企
望
密
批
营
项
防
举
球
英
氧
势
告
李
台
落
木
帮
轮
破
亚
师
围
注
远
字
材
排
供
河
态
封
另
施
减
树
溶
怎
止
案
言
士
均
武
固
叶
鱼
波
视
仅
费
紧
爱
左
章
早
朝
害
续
轻
服
试
食
充
兵
源
判
护
司
足
某
练
差
致
板
田
降
黑
犯
负
击
范
继
兴
似
余
坚
曲
输
修
故
城
夫
够
送
笔
船
占
右
财
吃
富
春
职
觉
汉
画
功
巴
跟
虽
杂
飞
检
吸
助
升
阳
互
初
创
抗
考
投
坏
策
古
径
换
未
跑
留
钢
曾
端
责
站
简
述
钱
副
尽
帝
射
草
冲
承
独
令
限
阿
宣
环
双
请
超
微
让
控
州
良
轴
找
否
纪
益
依
优
顶
础
载
倒
房
突
坐
粉
敌
略
客
袁
冷
胜
绝
析
块
剂
测
丝
协
诉
念
陈
仍
罗
盐
友
洋
错
苦
夜
刑
移
频
逐
靠
混
母
短
皮
终
聚
汽
村
云
哪
既
距
卫
停
烈
央
察
烧
迅
境
若
印
洲
刻
括
激
孔
搞
甚
室
待
核
校
散
侵
吧
甲
游
久
菜
味
旧
模
湖
货
损
预
阻
毫
普
稳
乙
妈
植
息
扩
银
语
挥
酒
守
拿
序
纸
医
缺
雨
吗
针
刘
啊
急
唱
误
训
愿
审
附
获
茶
鲜
粮
斤
孩
脱
硫
肥
善
龙
演
父
渐
血
欢
械
掌
歌
沙
刚
攻
谓
盾
讨
晚
粒
乱
燃
矛
乎
杀
药
宁
鲁
贵
钟
煤
读
班
伯
香
介
迫
句
丰
培
握
兰
担
弦
蛋
沉
假
穿
执
答
乐
谁
顺
烟
缩
征
脸
喜
松
脚
困
异
免
背
星
福
买
染
井
概
慢
怕
磁
倍
祖
皇
促
静
补
评
翻
肉
践
尼
衣
宽
扬
棉
希
伤
操
垂
秋
宜
氢
套
督
振
架
亮
末
宪
庆
编
牛
触
映
雷
销
诗
座
居
抓
裂
胞
呼
娘
景
威
绿
晶
厚
盟
衡
鸡
孙
延
危
胶
屋
乡
临
陆
顾
掉
呀
灯
岁
措
束
耐
剧
玉
赵
跳
哥
季
课
凯
胡
额
款
绍
卷
齐
伟
蒸
殖
永
宗
苗
川
炉
岩
弱
零
杨
奏
沿
露
杆
探
滑
镇
饭
浓
航
怀
赶
库
夺
伊
灵
税
途
灭
赛
归
召
鼓
播
盘
裁
险
康
唯
录
菌
纯
借
糖
盖
横
符
私
努
堂
域
枪
润
幅
哈
竟
熟
虫
泽
脑
壤
碳
欧
遍
侧
寨
敢
彻
虑
斜
薄
庭
纳
弹
饲
伸
折
麦
湿
暗
荷
瓦
塞
床
筑
恶
户
访
塔
奇
透
梁
刀
旋
迹
卡
氯
遇
份
毒
泥
退
洗
摆
灰
彩
卖
耗
夏
择
忙
铜
献
硬
予
繁
圈
雪
函
亦
抽
篇
阵
阴
丁
尺
追
堆
雄
迎
泛
爸
楼
避
谋
吨
野
猪
旗
累
偏
典
馆
索
秦
脂
潮
爷
豆
忽
托
惊
塑
遗
愈
朱
替
纤
粗
倾
尚
痛
楚
谢
奋
购
磨
君
池
旁
碎
骨
监
捕
弟
暴
割
贯
殊
释
词
亡
壁
顿
宝
午
尘
闻
揭
炮
残
冬
桥
妇
警
综
招
吴
付
浮
遭
徐
您
摇
谷
赞
箱
隔
订
男
吹
园
纷
唐
败
宋
玻
巨
耕
坦
荣
闭
湾
键
凡
驻
锅
救
恩
剥
凝
碱
齿
截
炼
麻
纺
禁
废
盛
版
缓
净
睛
昌
婚
涉
筒
嘴
插
岸
朗
庄
街
藏
姑
贸
腐
奴
啦
惯
乘
伙
恢
匀
纱
扎
辩
耳
彪
臣
亿
璃
抵
脉
秀
萨
俄
网
舞
店
喷
纵
寸
汗
挂
洪
贺
闪
柬
爆
烯
津
稻
墙
软
勇
像
滚
厘
蒙
芳
肯
坡
柱
荡
腿
仪
旅
尾
轧
冰
贡
登
黎
削
钻
勒
逃
障
氨
郭
峰
币
港
伏
轨
亩
毕
擦
莫
刺
浪
秘
援
株
健
售
股
岛
甘
泡
睡
童
铸
汤
阀
休
汇
舍
牧
绕
炸
哲
磷
绩
朋
淡
尖
启
陷
柴
呈
徒
颜
泪
稍
忘
泵
蓝
拖
洞
授
镜
辛
壮
锋
贫
虚
弯
摩
泰
幼
廷
尊
窗
纲
弄
隶
疑
氏
宫
姐
震
瑞
怪
尤
琴
循
描
膜
违
夹
腰
缘
珠
穷
森
枝
竹
沟
催
绳
忆
邦
剩
幸
浆
栏
拥
牙
贮
礼
滤
钠
纹
罢
拍
咱
喊
袖
埃
勤
罚
焦
潜
伍
墨
欲
缝
姓
刊
饱
仿
奖
铝
鬼
丽
跨
默
挖
链
扫
喝
袋
炭
污
幕
诸
弧
励
梅
奶
洁
灾
舟
鉴
苯
讼
抱
毁
懂
寒
智
埔
寄
届
跃
渡
挑
丹
艰
贝
碰
拔
爹
戴
码
梦
芽
熔
赤
渔
哭
敬
颗
奔
铅
仲
虎
稀
妹
乏
珍
申
桌
遵
允
隆
螺
仓
魏
锐
晓
氮
兼
隐
碍
赫
拨
忠
肃
缸
牵
抢
博
巧
壳
兄
杜
讯
诚
碧
祥
柯
页
巡
矩
悲
灌
龄
伦
票
寻
桂
铺
圣
恐
恰
郑
趣
抬
荒
腾
贴
柔
滴
猛
阔
辆
妻
填
撤
储
签
闹
扰
紫
砂
递
戏
吊
陶
伐
喂
疗
瓶
婆
抚
臂
摸
忍
虾
蜡
邻
胸
巩
挤
偶
弃
槽
劲
乳
邓
吉
仁
烂
砖
租
乌
舰
伴
瓜
浅
丙
暂
燥
橡
柳
迷
暖
牌
秧
胆
详
簧
踏
瓷
谱
呆
宾
糊
洛
辉
愤
竞
隙
怒
粘
乃
绪
肩
籍
敏
涂
熙
皆
侦
悬
掘
享
纠
醒
狂
锁
淀
恨
牲
霸
爬
赏
逆
玩
陵
祝
秒
浙
貌
役
彼
悉
鸭
趋
凤
晨
畜
辈
秩
卵
署
梯
炎
滩
棋
驱
筛
峡
冒
啥
寿
译
浸
泉
帽
迟
硅
疆
贷
漏
稿
冠
嫩
胁
芯
牢
叛
蚀
奥
鸣
岭
羊
凭
串
塘
绘
酵
融
盆
锡
庙
筹
冻
辅
摄
袭
筋
拒
僚
旱
钾
鸟
漆
沈
眉
疏
添
棒
穗
硝
韩
逼
扭
侨
凉
挺
碗
栽
炒
杯
患
馏
劝
豪
辽
勃
鸿
旦
吏
拜
狗
埋
辊
掩
饮
搬
骂
辞
勾
扣
估
蒋
绒
雾
丈
朵
姆
拟
宇
辑
陕
雕
偿
蓄
崇
剪
倡
厅
咬
驶
薯
刷
斥
番
赋
奉
佛
浇
漫
曼
扇
钙
桃
扶
仔
返
俗
亏
腔
鞋
棱
覆
框
悄
叔
撞
骗
勘
旺
沸
孤
吐
孟
渠
屈
疾
妙
惜
仰
狠
胀
谐
抛
霉
桑
岗
嘛
衰
盗
渗
脏
赖
涌
甜
曹
阅
肌
哩
厉
烃
纬
毅
昨
伪
症
煮
叹
钉
搭
茎
笼
酷
偷
弓
锥
恒
杰
坑
鼻
翼
纶
叙
狱
逮
罐
络
棚
抑
膨
蔬
寺
骤
穆
冶
枯
册
尸
凸
绅
坯
牺
焰
轰
欣
晋
瘦
御
锭
锦
丧
旬
锻
垄
搜
扑
邀
亭
酯
迈
舒
脆
酶
闲
忧
酚
顽
羽
涨
卸
仗
陪
辟
惩
杭
姚
肚
捉
飘
漂
昆
欺
吾
郎
烷
汁
呵
饰
萧
雅
邮
迁
燕
撒
姻
赴
宴
烦
债
帐
斑
铃
旨
醇
董
饼
雏
姿
拌
傅
腹
妥
揉
贤
拆
歪
葡
胺
丢
浩
徽
昂
垫
挡
览
贪
慰
缴
汪
慌
冯
诺
姜
谊
凶
劣
诬
耀
昏
躺
盈
骑
乔
溪
丛
卢
抹
闷
咨
刮
驾
缆
悟
摘
铒
掷
颇
幻
柄
惠
惨
佳
仇
腊
窝
涤
剑
瞧
堡
泼
葱
罩
霍
捞
胎
苍
滨
俩
捅
湘
砍
霞
邵
萄
疯
淮
遂
熊
粪
烘
宿
档
戈
驳
嫂
裕
徙
箭
捐
肠
撑
晒
辨
殿
莲
摊
搅
酱
屏
疫
哀
蔡
堵
沫
皱
畅
叠
阁
莱
敲
辖
钩
痕
坝
巷
饿
祸
丘
玄
溜
曰
逻
彭
尝
卿
妨
艇
吞
韦
怨
矮
歇`.split('\n'));

    /*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */

    // initializer tree-shakable: the annotated call's only argument is a function literal,
    // so bundlers drop everything (inner chain()/alphabet() calls included) when unused.
    const freeze = (fn) => Object.freeze(fn());
    function isBytes$2(a) {
        // Plain `instanceof Uint8Array` is too strict for some Buffer / proxy / cross-realm cases. The
        // fallback still requires a real ArrayBuffer view, so plain JSON-deserialized
        // `{ constructor: ... }` spoofing is rejected. `BYTES_PER_ELEMENT === 1` keeps the
        // fallback on byte-oriented views.
        return (a instanceof Uint8Array ||
            (ArrayBuffer.isView(a) &&
                a.constructor.name === 'Uint8Array' &&
                'BYTES_PER_ELEMENT' in a &&
                a.BYTES_PER_ELEMENT === 1));
    }
    /** Asserts something is Uint8Array. */
    function abytes$2(b) {
        if (!isBytes$2(b))
            throw new TypeError('Uint8Array expected');
    }
    function astr(label, input) {
        if (typeof input !== 'string')
            throw new TypeError(`${label}: string expected`);
        return true;
    }
    // UTF-8 TextDecoder builds a string from ASCII codes 2x faster than `TextDecoder('latin1')`
    // (4x on freshly allocated, our exact case).
    // All codes here are < 128 (range is validated elsewhere): UTF-8 agrees with ASCII byte-for-byte.
    // UTF-8 needs no ICU, so the probe only guards runtimes without TextDecoder at all (Hermes).
    const asciiDecoder = /* @__PURE__ */ (() => {
        try {
            const decoder = new TextDecoder();
            // Self-check on the domain we use (codes < 128): reject broken polyfills at
            // probe time instead of producing corrupted codec output later.
            return decoder.decode(Uint8Array.of(0x41, 0x30, 0x2b, 0x7f)) === 'A0+\x7f'
                ? decoder
                : undefined;
        }
        catch (e) {
            return undefined;
        }
    })();
    const B2S_CHUNK = 8192; // char codes per String.fromCharCode call, avoids arg-count limits
    function charcodesToString(codes) {
        const len = codes.length;
        // Measured crossover: the TextDecoder's per-call setup dominates below ~12 chars,
        // where String.fromCharCode wins (bech32 checksums, base58xmr blocks).
        if (asciiDecoder !== undefined && len >= 12)
            return asciiDecoder.decode(codes);
        if (len <= B2S_CHUNK)
            return String.fromCharCode.apply(null, codes);
        let res = '';
        for (let i = 0; i < len; i += B2S_CHUNK)
            res += String.fromCharCode.apply(null, codes.subarray(i, i + B2S_CHUNK));
        return res;
    }
    /**
     * Digit <-> letter mapping fused with string join (chain(alphabetSlow(letters), join(''))
     * semantics), via char-code lookup tables.
     */
    function alphabet(letters, aliases) {
        const len = letters.length;
        // Larger indexes would wrap in the Int8Array reverse table and decode to wrong digits.
        if (len > 128)
            throw new Error('alphabet: max 128 letters');
        const encTable = new Uint8Array(len);
        const decTable = new Int8Array(128).fill(-1);
        for (let i = 0; i < len; i++) {
            const code = letters.charCodeAt(i);
            if (letters.codePointAt(i) !== code || code > 127)
                throw new Error('alphabet: single-char ASCII letters only');
            encTable[i] = code;
            decTable[code] = i;
        }
        // Aliases decode like their canonical letter (e.g. hex case-folding), without a
        // separate normalization pass over the input string.
        if (aliases !== undefined) {
            for (const alias of Object.keys(aliases)) {
                const code = alias.charCodeAt(0);
                const target = decTable[aliases[alias].charCodeAt(0)];
                if (alias.length !== 1 || code > 127 || target === undefined || target === -1)
                    throw new Error(`alphabet: invalid alias ${alias}`);
                decTable[code] = target;
            }
        }
        return {
            encode: (digits) => {
                const codes = new Uint8Array(digits.length);
                for (let i = 0; i < digits.length; i++) {
                    const d = digits[i];
                    const code = encTable[d];
                    // Reuse the table lookup's bounds result for the required per-digit range check.
                    // Chained radix2 always emits digits < 2**bits === len; check anyway so a
                    // mismatched chain throws (like alphabetSlow) instead of silently emitting letter 0.
                    if (code === undefined)
                        throw new Error(`alphabet.encode: invalid digit ${d}`);
                    codes[i] = code;
                }
                return charcodesToString(codes);
            },
            decode: (input) => {
                // Uniform label: this is the decode entry link for nopad codecs, padding for padded
                // ones. Keeps "decode: string expected" identical across all built-in codecs
                // (released 2.x said "join.decode: string expected").
                astr('decode', input);
                const slen = input.length;
                const digits = new Uint8Array(slen);
                for (let i = 0; i < slen; i++) {
                    const code = input.charCodeAt(i);
                    const digit = code < 128 ? decTable[code] : -1;
                    if (digit === -1)
                        throw new Error(`Unknown letter "${input[i]}". Allowed: ${letters}`);
                    digits[i] = digit;
                }
                return digits;
            },
        };
    }
    // baseN radix code (base58, base36)
    // ---------------------------------
    // Base conversion 256 <-> BASE done on 16-bit limbs, five baseN digits (one divmod by
    // BASE**5) per pass, ~10x fewer inner-loop iterations than digit-at-a-time conversion.
    // Exactness: every intermediate is a non-negative integer below 2**53, so float64
    // arithmetic (including Math.floor of the quotients) is exact for any GROUP = BASE**5 < 2**30:
    // - encode: carry * 2**16 + limb < BASE**5 * 2**16 < 2**46
    // - decode: limb * BASE**5 + carry < 2**16 * BASE**5 + 2**30 < 2**46
    // Still O(n^2) overall like any positional-base conversion — see the base58 DoS note.
    // GROUP literals (not `BASE ** 5`) so bundlers can drop unused coders as dead code.
    const B58_GROUP = 656356768; // 58**5 < 2**30
    const RADIX_BASE_N_MAX_LENGTH = 65536;
    const BASE_N_MAX_BYTES = 2048;
    const BASE_N_MAX_CHARS = 4096;
    const radixBaseN = (BASE, GROUP) => ({
        encode: (bytes) => {
            abytes$2(bytes);
            const blen = bytes.length;
            if (blen === 0)
                return new Uint8Array(0);
            if (blen >= RADIX_BASE_N_MAX_LENGTH)
                throw new Error('invalid length');
            // Leading zero bytes map 1:1 to leading zero digits (at most blen-1 explicit zeros;
            // an all-zero value still contributes one digit below).
            let zeros = 0;
            while (zeros < blen - 1 && bytes[zeros] === 0)
                zeros++;
            // Pack big-endian 16-bit limbs; odd length makes the top limb a single byte.
            const nlimbs = Math.ceil(blen / 2);
            const limbs = new Uint16Array(nlimbs);
            const odd = blen & 1;
            if (odd)
                limbs[0] = bytes[0];
            for (let i = odd, j = odd; i < blen; i += 2, j++)
                limbs[j] = (bytes[i] << 8) | bytes[i + 1];
            // Repeated divmod by BASE**5; each pass emits one 5-digit group, least significant
            // first. No carry-overflow guard like convertRadix had: that one faced arbitrary
            // caller-chosen bases, while these bounds are static and proven exact above.
            const groups = [];
            let pos = 0; // limbs before pos are known zero
            while (pos < nlimbs) {
                let carry = 0;
                for (let i = pos; i < nlimbs; i++) {
                    const cur = carry * 0x10000 + limbs[i];
                    const q = Math.floor(cur / GROUP);
                    carry = cur - q * GROUP;
                    limbs[i] = q;
                    if (q === 0 && i === pos)
                        pos++;
                }
                groups.push(carry);
            }
            // The top group is nonzero unless the whole value is zero, so total significant
            // digit count is 5 per full group plus the top group's own width. (Writing 5 digits
            // per group and trimming via subarray is smaller code, but the offset view slows
            // encode ~25% and base58xmr 2x — measured.)
            const top = groups.length - 1;
            let sig = top * 5;
            for (let v = groups[top];; v = Math.floor(v / BASE)) {
                sig++;
                if (v < BASE)
                    break;
            }
            const res = new Uint8Array(zeros + sig); // leading zero digits are already 0
            let j = res.length - 1;
            for (let g = 0; g < top; g++) {
                let v = groups[g];
                for (let k = 0; k < 5; k++) {
                    res[j--] = v % BASE;
                    v = Math.floor(v / BASE);
                }
            }
            for (let v = groups[top]; j >= zeros; v = Math.floor(v / BASE))
                res[j--] = v % BASE;
            return res;
        },
        decode: (digits) => {
            abytes$2(digits);
            const dlen = digits.length;
            if (dlen === 0)
                return new Uint8Array(0);
            if (dlen >= RADIX_BASE_N_MAX_LENGTH)
                throw new Error('invalid length');
            let zeros = 0;
            while (zeros < dlen - 1 && digits[zeros] === 0)
                zeros++;
            // Multiply-accumulate 16-bit limbs (little-endian, `used` live) group by group,
            // most significant group first; the first group may be shorter than 5 digits, and
            // its BASE**group factor falls out of the digit fold.
            const limbs = new Uint16Array(Math.ceil((dlen * 6) / 16) + 1);
            let used = 0;
            let i = 0;
            let group = dlen % 5 || 5;
            while (i < dlen) {
                let gval = 0;
                let factor = 1;
                for (const end = i + group; i < end; i++) {
                    const d = digits[i];
                    // Unreachable through the public chain (alphabet emits digits < BASE); guards
                    // internal misuse from silently corrupting output.
                    if (d >= BASE)
                        throw new Error(`invalid integer: ${d}`);
                    gval = gval * BASE + d;
                    factor *= BASE;
                }
                group = 5;
                let carry = gval;
                for (let k = 0; k < used; k++) {
                    const cur = limbs[k] * factor + carry;
                    carry = Math.floor(cur / 0x10000);
                    limbs[k] = cur - carry * 0x10000;
                }
                for (; carry > 0; carry = Math.floor(carry / 0x10000))
                    limbs[used++] = carry % 0x10000;
            }
            // used === 0 means the value is zero: it still contributes one byte, like a lone
            // zero digit does.
            const valueBytes = used === 0 ? 1 : used * 2 - (limbs[used - 1] < 256 ? 1 : 0);
            const res = new Uint8Array(zeros + valueBytes); // leading zero bytes are already 0
            let j = res.length - 1;
            for (let k = 0; k < used; k++) {
                const limb = limbs[k];
                res[j--] = limb & 0xff;
                if (j >= zeros)
                    res[j--] = limb >> 8;
            }
            return res;
        },
    });
    const genBaseN = (radix, abc) => {
        const letters = alphabet(abc);
        return {
            encode(bytes) {
                abytes$2(bytes);
                if (bytes.length > BASE_N_MAX_BYTES)
                    throw new Error('invalid length');
                return letters.encode(radix.encode(bytes));
            },
            decode(str) {
                astr('baseN.decode', str);
                if (str.length > BASE_N_MAX_CHARS)
                    throw new Error('invalid length');
                return radix.decode(letters.decode(str));
            },
        };
    };
    const radix58 = /* @__PURE__ */ radixBaseN(58, B58_GROUP);
    const genBase58 = (abc) => genBaseN(radix58, abc);
    /**
     * base58: base64 without ambigous characters +, /, 0, O, I, l.
     * Quadratic (O(n^2)) - so, can't be used on large inputs.
     * @example
     * ```js
     * const text = base58.encode(Uint8Array.from([0, 1, 2]));
     * base58.decode(text);
     * // => Uint8Array.from([0, 1, 2])
     * ```
     */
    const base58 = /* @__PURE__ */ freeze(() => genBase58('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'));

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
        _cloneInto(to) {
            (to ||= new this.constructor()).set(...this.get());
            return this._cloneIntoMeta(to);
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
            clean$1(BUF_160);
        }
        destroy() {
            this.destroyed = true;
            clean$1(this.buffer);
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
     * @param opts - Reserved hash options.
     * @returns Digest bytes.
     * @example
     * Hash a message with RIPEMD-160.
     * ```ts
     * ripemd160(new Uint8Array([97, 98, 99]));
     * ```
     */
    const ripemd160 = /* @__PURE__ */ createHasher$1(() => new _RIPEMD160());

    const HARDENED_OFFSET = 0x80000000;
    const SECP256K1_ORDER = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
    function bytesToHex$1(bytes) {
        return bytesToHex$2(bytes);
    }
    function concatBytes$2(...arrays) {
        return concatBytes$3(...arrays);
    }
    function hexToBytes$1(hex) {
        return hexToBytes$2(hex);
    }
    function ensureBytes(input) {
        return typeof input === "string" ? hexToBytes$1(input) : Uint8Array.from(input);
    }
    function numberToBytesBE$1(value, length) {
        const bytes = new Uint8Array(length);
        let current = value;
        for (let index = length - 1; index >= 0; index -= 1) {
            bytes[index] = Number(current & 0xffn);
            current >>= 8n;
        }
        return bytes;
    }
    function bytesToNumberBE$1(bytes) {
        let value = 0n;
        for (const byte of bytes) {
            value = (value << 8n) + BigInt(byte);
        }
        return value;
    }
    function uint32ToBytesBE(value) {
        const bytes = new Uint8Array(4);
        const view = new DataView(bytes.buffer);
        view.setUint32(0, value, false);
        return bytes;
    }
    function hash160(data) {
        return ripemd160(sha256(data));
    }
    function sha256Hash(data) {
        return sha256(data);
    }
    function taggedHash(tag, data) {
        const tagHash = sha256(utf8ToBytes(tag));
        return sha256(concatBytes$2(tagHash, tagHash, data));
    }
    function doubleSha256(data) {
        return sha256(sha256(data));
    }
    function hmacSha512(key, data) {
        return hmac(sha512, key, data);
    }
    function base58CheckEncode(payload) {
        const checksum = doubleSha256(payload).slice(0, 4);
        return base58.encode(concatBytes$2(payload, checksum));
    }
    function base58CheckDecode(value) {
        const decoded = Uint8Array.from(base58.decode(value));
        if (decoded.length < 5) {
            throw new Error("Invalid Base58Check payload");
        }
        const payload = decoded.slice(0, -4);
        const checksum = decoded.slice(-4);
        const expected = doubleSha256(payload).slice(0, 4);
        for (let index = 0; index < 4; index += 1) {
            if (checksum[index] !== expected[index]) {
                throw new Error("Invalid Base58Check checksum");
            }
        }
        return payload;
    }
    function bigIntMod(value, modulo) {
        const remainder = value % modulo;
        return remainder >= 0n ? remainder : remainder + modulo;
    }
    function isValidPrivateKey(privateKey) {
        if (privateKey.length !== 32) {
            return false;
        }
        const value = bytesToNumberBE$1(privateKey);
        return value > 0n && value < SECP256K1_ORDER;
    }
    function mnemonicToSeedBytes(mnemonicToSeedSync, mnemonic, passphrase) {
        return Uint8Array.from(mnemonicToSeedSync(mnemonic, passphrase));
    }
    const BITCOIN_SEED_KEY = utf8ToBytes("Bitcoin seed");

    /**
     * Hex, bytes and number utilities.
     * @module
     */
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    /**
     * Validates that a value is an array, optionally validating each element.
     * @param item - Value to validate.
     * @param title - Label included in thrown errors.
     * @param inner - Optional per-element validator, called with the element and its label.
     * @returns The validated array.
     * @example
     * Validate an array of points before batch processing.
     *
     * ```ts
     * aarray([1n, 2n], 'scalars');
     * ```
     */
    function aarray(item, title, inner = () => { }) {
        if (!Array.isArray(item))
            throw new TypeError(`"${title}" expected array, got type=${typeof item}`);
        for (let i = 0; i < item.length; i++)
            inner(item[i], `${title}[${i}]`);
        return item;
    }
    /**
     * Validates that a value is a byte array.
     * @param value - Value to validate.
     * @param length - Optional exact byte length.
     * @param title - Optional field name.
     * @returns Original byte array.
     * @example
     * Reject non-byte input before passing data into curve code.
     *
     * ```ts
     * abytes(new Uint8Array(1));
     * ```
     */
    const abytes$1 = (value, length, title) => abytes$3(value, length, title);
    /**
     * Validates that a value is a non-negative safe integer.
     * @param n - Value to validate.
     * @param title - Optional field name.
     * @returns The validated number.
     * @example
     * Validate a numeric length before allocating buffers.
     *
     * ```ts
     * anumber(1);
     * ```
     */
    const anumber$1 = anumber$2;
    /**
     * Asserts something is a string.
     * @param value - Value to validate.
     * @param title - Label included in thrown errors.
     * @returns The validated string.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Validate a label string.
     *
     * ```ts
     * astring('example', 'label');
     * ```
     */
    function astring(value, title = '') {
        if (typeof value !== 'string') {
            const prefix = title && `"${title}" `;
            throw new TypeError(prefix + 'expected string, got type=' + typeof value);
        }
        return value;
    }
    /**
     * Asserts something is a plain object-ish value, not null or array.
     * @param value - Value to validate.
     * @param title - Label included in thrown errors.
     * @returns The validated object.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Validate an options object before checking fields.
     *
     * ```ts
     * aobject({ flag: true });
     * ```
     */
    function aobject(value, title = 'object') {
        if (value === null || typeof value !== 'object' || Array.isArray(value))
            throw new TypeError(title === 'object'
                ? 'expected valid options object'
                : `"${title}" expected object, got type=${typeof value}`);
        return value;
    }
    /**
     * Asserts something is a function.
     * @param value - Value to validate.
     * @param title - Label included in thrown errors.
     * @returns The validated function.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Validate a required method before calling it.
     *
     * ```ts
     * afunction(() => true, 'predicate');
     * ```
     */
    function afunction(value, title) {
        if (typeof value !== 'function')
            throw new TypeError(`"${title}" is invalid: expected function, got ${typeof value}`);
        return value;
    }
    /**
     * Encodes bytes as lowercase hex.
     * @param bytes - Bytes to encode.
     * @returns Lowercase hex string.
     * @example
     * Serialize bytes as hex for logging or fixtures.
     *
     * ```ts
     * bytesToHex(Uint8Array.of(1, 2, 3));
     * ```
     */
    const bytesToHex = bytesToHex$2;
    /**
     * Concatenates byte arrays.
     * @param arrays - Byte arrays to join.
     * @returns Concatenated bytes.
     * @example
     * Join domain-separated chunks into one buffer.
     *
     * ```ts
     * concatBytes(Uint8Array.of(1), Uint8Array.of(2));
     * ```
     */
    const concatBytes$1 = (...arrays) => concatBytes$3(...arrays);
    /**
     * Decodes lowercase or uppercase hex into bytes.
     * @param hex - Hex string to decode.
     * @returns Decoded bytes.
     * @example
     * Parse fixture hex into bytes before hashing.
     *
     * ```ts
     * hexToBytes('0102');
     * ```
     */
    const hexToBytes = (hex) => hexToBytes$2(hex);
    /**
     * Checks whether a value is a Uint8Array.
     * @param a - Value to inspect.
     * @returns `true` when `a` is a Uint8Array.
     * @example
     * Branch on byte input before decoding it.
     *
     * ```ts
     * isBytes(new Uint8Array(1));
     * ```
     */
    const isBytes$1 = isBytes$3;
    /**
     * Reads random bytes from the platform CSPRNG.
     * @param bytesLength - Number of random bytes to read.
     * @returns Fresh random bytes.
     * @example
     * Generate a random seed for a keypair.
     *
     * ```ts
     * randomBytes(2);
     * ```
     */
    const randomBytes$2 = (bytesLength) => randomBytes$3(bytesLength);
    const _0n$5 = /* @__PURE__ */ BigInt(0);
    const _1n$4 = /* @__PURE__ */ BigInt(1);
    // Shared error-message prefix builder. Only called on throw paths, so assert
    // success paths never pay for the string concatenation.
    const atitle = (title) => (title ? `"${title}" ` : '');
    /**
     * Validates that a flag is boolean.
     * @param value - Value to validate.
     * @param title - Optional field name.
     * @returns Original value.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Reject non-boolean option flags early.
     *
     * ```ts
     * abool(true);
     * ```
     */
    function abool$1(value, title = '') {
        if (typeof value !== 'boolean')
            throw new TypeError(atitle(title) + 'expected boolean, got type=' + typeof value);
        return value;
    }
    /**
     * Validates that a value is a non-negative bigint or safe integer.
     * @param n - Value to validate.
     * @returns The same validated value.
     * @throws On wrong argument ranges or values. {@link RangeError}
     * @example
     * Validate one integer-like value before serializing it.
     *
     * ```ts
     * abignumber(1n);
     * ```
     */
    function abignumber(n) {
        if (typeof n === 'bigint') {
            if (!isPosBig(n))
                throw new RangeError('positive bigint expected, got ' + n);
        }
        else
            anumber$1(n);
        return n;
    }
    /**
     * Validates that a value is a safe integer.
     * @param value - Integer to validate.
     * @param title - Optional field name.
     * @throws On wrong argument types. {@link TypeError}
     * @throws On wrong argument ranges or values. {@link RangeError}
     * @example
     * Validate a window size before scalar arithmetic uses it.
     *
     * ```ts
     * asafenumber(1);
     * ```
     */
    function asafenumber(value, title = '') {
        if (typeof value !== 'number') {
            const prefix = title && `"${title}" `;
            throw new TypeError(prefix + 'expected number, got type=' + typeof value);
        }
        if (!Number.isSafeInteger(value)) {
            const prefix = title && `"${title}" `;
            throw new RangeError(prefix + 'expected safe integer, got ' + value);
        }
    }
    /**
     * Encodes a bigint into even-length big-endian hex.
     * The historical "unpadded" name only means "no fixed-width field padding"; odd-length hex still
     * gets one leading zero nibble so the result always represents whole bytes.
     * @param num - Number to encode.
     * @returns Big-endian hex string.
     * @throws On wrong argument ranges or values. {@link RangeError}
     * @example
     * Encode a scalar into hex without a `0x` prefix.
     *
     * ```ts
     * numberToHexUnpadded(255n);
     * ```
     */
    function numberToHexUnpadded(num) {
        const hex = abignumber(num).toString(16);
        return hex.length & 1 ? '0' + hex : hex;
    }
    /**
     * Parses a big-endian hex string into bigint.
     * Accepts odd-length hex through the native `BigInt('0x' + hex)` parser and currently surfaces the
     * same native `SyntaxError` for malformed hex instead of wrapping it in a library-specific error.
     * @param hex - Hex string without `0x`.
     * @returns Parsed bigint value.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Parse a scalar from fixture hex.
     *
     * ```ts
     * hexToNumber('ff');
     * ```
     */
    function hexToNumber(hex) {
        if (typeof hex !== 'string')
            throw new TypeError('hex string expected, got ' + typeof hex);
        return hex === '' ? _0n$5 : BigInt('0x' + hex); // Big Endian
    }
    // BE: Big Endian, LE: Little Endian
    /**
     * Parses big-endian bytes into bigint.
     * @param bytes - Bytes in big-endian order.
     * @returns Parsed bigint value.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Read a scalar encoded in network byte order.
     *
     * ```ts
     * bytesToNumberBE(Uint8Array.of(1, 0));
     * ```
     */
    function bytesToNumberBE(bytes) {
        return hexToNumber(bytesToHex$2(bytes));
    }
    /**
     * Parses little-endian bytes into bigint.
     * @param bytes - Bytes in little-endian order.
     * @returns Parsed bigint value.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Read a scalar encoded in little-endian form.
     *
     * ```ts
     * bytesToNumberLE(Uint8Array.of(1, 0));
     * ```
     */
    function bytesToNumberLE(bytes) {
        return hexToNumber(bytesToHex$2(copyBytes(abytes$3(bytes)).reverse()));
    }
    /**
     * Encodes a bigint into fixed-length big-endian bytes.
     * @param n - Number to encode.
     * @param len - Output length in bytes. Must be greater than zero.
     * @returns Big-endian byte array.
     * @throws On wrong argument ranges or values. {@link RangeError}
     * @throws If a documented runtime validation or state check fails. {@link Error}
     * @example
     * Serialize a scalar into a 32-byte field element.
     *
     * ```ts
     * numberToBytesBE(255n, 2);
     * ```
     */
    function numberToBytesBE(n, len) {
        anumber$2(len);
        if (len === 0)
            throw new Error('zero output length is invalid');
        n = abignumber(n);
        const expectedLen = len * 2;
        const hex = n.toString(16);
        // Detect overflow before hex parsing so oversized values don't leak the shared odd-hex error.
        if (hex.length > expectedLen)
            throw new RangeError('number is too large');
        return hexToBytes$2(hex.padStart(expectedLen, '0'));
    }
    /**
     * Encodes a bigint into fixed-length little-endian bytes.
     * @param n - Number to encode.
     * @param len - Output length in bytes.
     * @returns Little-endian byte array.
     * @throws On wrong argument ranges or values. {@link RangeError}
     * @throws If a documented runtime validation or state check fails. {@link Error}
     * @example
     * Serialize a scalar for little-endian protocols.
     *
     * ```ts
     * numberToBytesLE(255n, 2);
     * ```
     */
    function numberToBytesLE(n, len) {
        return numberToBytesBE(n, len).reverse();
    }
    /**
     * Copies Uint8Array. We can't use u8a.slice(), because u8a can be Buffer,
     * and Buffer#slice creates mutable copy. Never use Buffers!
     * @param bytes - Bytes to copy.
     * @returns Detached copy.
     * @example
     * Make an isolated copy before mutating serialized bytes.
     *
     * ```ts
     * copyBytes(Uint8Array.of(1, 2, 3));
     * ```
     */
    function copyBytes(bytes) {
        // `Uint8Array.from(...)` would also accept arrays / other typed arrays. Keep this helper strict
        // because callers use it at byte-validation boundaries before mutating the detached copy.
        return Uint8Array.from(abytes$1(bytes));
    }
    /**
     * Checks whether n is non-negative bigint. Historical name.
     * @param n - candidate value
     * @returns `true` when the value is bigint and 0 or larger
     * @example
     * Check a candidate scalar before range validation.
     *
     * ```ts
     * isPosBig(2n);
     * ```
     */
    function isPosBig(n) {
        return typeof n === 'bigint' && _0n$5 <= n;
    }
    /**
     * Checks whether a bigint lies inside a half-open range.
     * @param n - Candidate value.
     * @param min - Inclusive lower bound.
     * @param max - Exclusive upper bound.
     * @returns `true` when the value is inside the range.
     * @example
     * Check whether a candidate scalar fits the field order.
     *
     * ```ts
     * inRange(2n, 1n, 3n);
     * ```
     */
    function inRange(n, min, max) {
        return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
    }
    /**
     * Asserts `min <= n < max`. NOTE: upper bound is exclusive.
     * @param title - Value label for error messages.
     * @param n - Candidate value.
     * @param min - Inclusive lower bound.
     * @param max - Exclusive upper bound.
     * Wrong-type inputs are not separated from out-of-range values here: they still flow through the
     * shared `RangeError` path because this is only a throwing wrapper around `inRange(...)`.
     * @throws On wrong argument ranges or values. {@link RangeError}
     * @example
     * Assert that a bigint stays within one half-open range.
     *
     * ```ts
     * aInRange('x', 2n, 1n, 256n);
     * ```
     */
    function aInRange(title, n, min, max) {
        // Why min <= n < max and not a (min < n < max) OR b (min <= n <= max)?
        // consider P=256n, min=0n, max=P
        // - a for min=0 would require -1:          `inRange('x', x, -1n, P)`
        // - b would commonly require subtraction:  `inRange('x', x, 0n, P - 1n)`
        // - our way is the cleanest:               `inRange('x', x, 0n, P)
        if (!inRange(n, min, max))
            throw new RangeError('expected valid ' + title + ': ' + min + ' <= n < ' + max + ', got ' + n);
    }
    // Bit operations
    /**
     * Calculates amount of bits in a bigint.
     * Same as `n.toString(2).length`
     * TODO: merge with nLength in modular
     * @param n - Value to inspect.
     * @returns Bit length.
     * @throws If the value is negative. {@link Error}
     * @example
     * Measure the bit length of a scalar before serialization.
     *
     * ```ts
     * bitLen(8n);
     * ```
     */
    function bitLen(n) {
        // Size callers in this repo only use non-negative orders / scalars, so negative inputs are a
        // contract bug and must not silently collapse to zero bits.
        if (n < _0n$5)
            throw new Error('expected non-negative bigint, got ' + n);
        // Native radix conversion beats a shift loop at every size, and the loop is quadratic in bits.
        return n === _0n$5 ? 0 : n.toString(2).length;
    }
    /**
     * Calculate mask for N bits. Not using ** operator with bigints because of old engines.
     * Same as BigInt(`0b${Array(i).fill('1').join('')}`)
     * @param n - Number of bits. Negative widths are currently passed through to raw bigint shift
     *   semantics and therefore produce `-1n`.
     * @returns Bitmask value.
     * @example
     * Calculate mask for N bits.
     *
     * ```ts
     * bitMask(4);
     * ```
     */
    const bitMask = (n) => {
        asafenumber(n, 'n');
        return (_1n$4 << BigInt(n)) - _1n$4;
    };
    /**
     * Minimal HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
     * @param hashLen - Hash output size in bytes. Callers are expected to pass a positive length; `0`
     *   is not rejected here and would make the internal generate loop non-progressing.
     * @param qByteLen - Requested output size in bytes. Callers are expected to pass a positive length.
     * @param hmacFn - HMAC implementation.
     * @returns Function that will call DRBG until the predicate returns anything
     *   other than `undefined`.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Build a deterministic nonce generator for RFC6979-style signing.
     *
     * ```ts
     * import { createHmacDrbg } from '@noble/curves/utils.js';
     * import { hmac } from '@noble/hashes/hmac.js';
     * import { sha256 } from '@noble/hashes/sha2.js';
     * const hmacFn = (key: Uint8Array, msg: Uint8Array) => hmac(sha256, key, msg);
     * const drbg = createHmacDrbg(32, 32, hmacFn);
     * const seed = new Uint8Array(32);
     * drbg(seed, (bytes) => bytes);
     * ```
     */
    function createHmacDrbg(hashLen, qByteLen, hmacFn) {
        anumber$2(hashLen, 'hashLen');
        anumber$2(qByteLen, 'qByteLen');
        if (typeof hmacFn !== 'function')
            throw new TypeError('hmacFn must be a function');
        // creates Uint8Array
        const u8n = (len) => new Uint8Array(len);
        const NULL = Uint8Array.of();
        const byte0 = Uint8Array.of(0x00);
        const byte1 = Uint8Array.of(0x01);
        const _maxDrbgIters = 1000;
        // Step B, Step C: set hashLen to 8*ceil(hlen/8).
        // Minimal non-full-spec HMAC-DRBG from NIST 800-90 for RFC6979 signatures.
        let v = u8n(hashLen);
        // Steps B and C of RFC6979 3.2.
        let k = u8n(hashLen);
        let i = 0; // Iterations counter, will throw when over 1000
        const reset = () => {
            v.fill(1);
            k.fill(0);
            i = 0;
        };
        // hmac(k)(v, ...values)
        const h = (...msgs) => hmacFn(k, concatBytes$1(v, ...msgs));
        const reseed = (seed = NULL) => {
            // HMAC-DRBG reseed() function. Steps D-G
            k = h(byte0, seed); // k = hmac(k || v || 0x00 || seed)
            v = h(); // v = hmac(k || v)
            if (seed.length === 0)
                return;
            k = h(byte1, seed); // k = hmac(k || v || 0x01 || seed)
            v = h(); // v = hmac(k || v)
        };
        const gen = () => {
            // HMAC-DRBG generate() function
            if (i++ >= _maxDrbgIters)
                throw new Error('drbg: tried max amount of iterations');
            let len = 0;
            const out = [];
            while (len < qByteLen) {
                v = h();
                const sl = v.slice();
                out.push(sl);
                len += v.length;
            }
            return concatBytes$1(...out);
        };
        const genUntil = (seed, pred) => {
            reset();
            reseed(seed); // Steps D-G
            let res = undefined; // Step H: grind until the predicate accepts a candidate.
            // Falsy values like 0 are valid outputs.
            while ((res = pred(gen())) === undefined)
                reseed();
            reset();
            return res;
        };
        return genUntil;
    }
    /**
     * Validates declared required and optional field types on a plain object.
     * Extra keys are intentionally ignored because many callers validate only the subset they use from
     * richer option bags or runtime objects.
     * This walks field schemas and formats detailed errors, so avoid it on hot paths; use direct
     * one-line guards such as `aobject()`, `afunction()`, `abool()`, or `asafenumber()` instead.
     * @param object - Object to validate.
     * @param fields - Required field types.
     * @param optFields - Optional field types.
     * @param title - Object label included in thrown errors.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Check user options before building a curve helper.
     *
     * ```ts
     * validateObject({ flag: true }, { flag: 'boolean' });
     * ```
     */
    function validateObject(object, fields = {}, optFields = {}, title = 'object') {
        aobject(object, title);
        aobject(fields, 'fields');
        aobject(optFields, 'optFields');
        function checkField(fieldName, expectedType, isOpt) {
            const label = title === 'object' ? `param "${String(fieldName)}"` : `"${title}.${String(fieldName)}"`;
            // Config fields must be explicit own properties. Optional inherited values are rejected too
            // because callers keep reading the same options object after validation.
            const val = object[fieldName];
            // Runtime objects such as Field instances intentionally satisfy required method slots
            // via their shared prototype.
            if (!Object.hasOwn(object, fieldName) &&
                (isOpt ? val !== undefined : expectedType !== 'function')) {
                throw new TypeError(`${label} is invalid: expected own property`);
            }
            if (isOpt && val === undefined)
                return;
            const current = typeof val;
            if (current !== expectedType || val === null)
                throw new TypeError(`${label} is invalid: expected ${expectedType}, got ${current}`);
        }
        const iter = (f, isOpt) => Object.entries(f).forEach(([k, v]) => checkField(k, v, isOpt));
        iter(fields, false);
        iter(optFields, true);
    }

    /**
     * Utils for modular division and fields.
     * Field over 11 is a finite (Galois) field is integer number operations `mod 11`.
     * There is no division: it is replaced by modular multiplicative inverse.
     * @module
     */
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    // Numbers aren't used in x25519 / x448 builds
    // prettier-ignore
    const _0n$4 = /* @__PURE__ */ BigInt(0), _1n$3 = /* @__PURE__ */ BigInt(1), _2n$3 = /* @__PURE__ */ BigInt(2);
    // prettier-ignore
    const _3n$1 = /* @__PURE__ */ BigInt(3), _4n$2 = /* @__PURE__ */ BigInt(4), _5n = /* @__PURE__ */ BigInt(5);
    // prettier-ignore
    const _7n$1 = /* @__PURE__ */ BigInt(7), _8n = /* @__PURE__ */ BigInt(8), _9n = /* @__PURE__ */ BigInt(9);
    const _15n = /* @__PURE__ */ BigInt(15), _16n = /* @__PURE__ */ BigInt(16);
    // 2^64: exponents below this use plain square-and-multiply in pow()/FpPow(); the windowed path's
    // table build (14 multiplications) only pays off for longer exponents (break-even ~50 bits).
    const POW_WINDOWED_MIN = /* @__PURE__ */ BigInt('0x10000000000000000');
    /**
     * @param a - Dividend value.
     * @param b - Positive modulus.
     * @returns Reduced value in `[0, b)` only when `b` is positive.
     * @throws If the modulus is not positive. {@link Error}
     * @example
     * Normalize a bigint into one field residue.
     *
     * ```ts
     * mod(-1n, 5n);
     * ```
     */
    function mod(a, b) {
        if (b <= _0n$4)
            throw new Error('mod: expected positive modulus, got ' + b);
        const result = a % b;
        return result >= _0n$4 ? result : b + result;
    }
    /**
     * Efficiently raise num to a power with modular reduction.
     * Unsafe in some contexts: uses ladder, so can expose bigint bits.
     * Low-level helper: callers that need canonical residues must pass a valid `num` for the chosen
     * modulus instead of relying on the `power===0/1` fast paths to normalize it.
     * @param num - Base value.
     * @param power - Exponent value.
     * @param modulo - Reduction modulus.
     * @returns Modular exponentiation result.
     * @throws If the modulus or exponent is invalid. {@link Error}
     * @example
     * Raise one bigint to a modular power.
     *
     * ```ts
     * pow(2n, 6n, 11n) // 64n % 11n == 9n
     * ```
     */
    function pow(num, power, modulo) {
        if (modulo <= _1n$3)
            throw new Error('pow: expected modulus > 1, got ' + modulo);
        // Non-bigint exponents coerce every comparison below to false and would silently return 1.
        if (typeof power !== 'bigint')
            throw new TypeError('invalid exponent: expected bigint, got ' + typeof power);
        if (power < _0n$4)
            throw new Error('invalid exponent, negatives unsupported');
        if (power === _0n$4)
            return _1n$3;
        if (power === _1n$3)
            return num;
        let d = num % modulo;
        if (d < _0n$4)
            d += modulo;
        // Control flow in both branches below depends only on the exponent, never on `num` — invertCt()
        // relies on that for its (public-exponent) secret-independence guarantee.
        if (power < POW_WINDOWED_MIN) {
            // Square-and-multiply: cheaper than the windowed path for short exponents.
            let p = _1n$3;
            while (power > _0n$4) {
                if (power & _1n$3)
                    p = (p * d) % modulo;
                d = (d * d) % modulo;
                power >>= _1n$3;
            }
            return p;
        }
        // Fixed 4-bit windows, MSB-first: a 14-multiplication table drops per-window cost to <1
        // multiplication (vs ~2 per window for square-and-multiply), ~25-30% faster for the dense
        // 256-bit exponents of sqrt / Legendre / invertCt.
        const digits = [];
        while (power > _0n$4) {
            digits.push(Number(power & _15n));
            power >>= _4n$2;
        }
        const table = new Array(16);
        table[0] = _1n$3;
        table[1] = d;
        for (let i = 2; i < 16; i++)
            table[i] = (table[i - 1] * d) % modulo;
        let p = table[digits[digits.length - 1]]; // top digit is nonzero: the loop above stops on 0
        for (let w = digits.length - 2; w >= 0; w--) {
            p = (p * p) % modulo;
            p = (p * p) % modulo;
            p = (p * p) % modulo;
            p = (p * p) % modulo;
            const digit = digits[w];
            if (digit !== 0)
                p = (p * table[digit]) % modulo;
        }
        return p;
    }
    /**
     * Does `x^(2^power)` mod p. `pow2(30, 4)` == `30^(2^4)`.
     * Low-level helper: callers that need canonical residues must pass a valid `x` for the chosen
     * modulus; the `power===0` fast path intentionally returns the input unchanged.
     * @param x - Base value.
     * @param power - Number of squarings.
     * @param modulo - Reduction modulus.
     * @returns Repeated-squaring result.
     * @throws If the exponent is negative. {@link Error}
     * @example
     * Apply repeated squaring inside one field.
     *
     * ```ts
     * pow2(3n, 2n, 11n);
     * ```
     */
    function pow2(x, power, modulo) {
        if (modulo <= _1n$3)
            throw new Error('pow2: expected modulus > 1, got ' + modulo);
        if (power < _0n$4)
            throw new Error('pow2: expected non-negative exponent, got ' + power);
        let res = x;
        while (power-- > _0n$4) {
            res *= res;
            res %= modulo;
        }
        return res;
    }
    /**
     * Inverses number over modulo.
     * Implemented using the {@link https://brilliant.org/wiki/extended-euclidean-algorithm/ | extended Euclidean algorithm}.
     * @param number - Value to invert.
     * @param modulo - Modulus greater than 1.
     * @returns Multiplicative inverse.
     * @throws If the modulus is invalid or the inverse does not exist. {@link Error}
     * @example
     * Compute one modular inverse with the extended Euclidean algorithm.
     *
     * ```ts
     * invert(3n, 11n);
     * ```
     */
    function invert(number, modulo) {
        if (number === _0n$4)
            throw new Error('invert: expected non-zero number');
        // modulo = 1 is the zero ring: gcd(x, 1) = 1 makes the loop below "succeed" and return the
        // useless inverse 0. Reject it like pow() and invertCt() do.
        if (modulo <= _1n$3)
            throw new Error('invert: expected modulus > 1, got ' + modulo);
        // This is variable-time: the loop count depends on `number`. For a secret-independent
        // (Fermat) alternative over a prime modulus, see {@link invertCt} (~4x slower).
        let a = mod(number, modulo);
        let b = modulo;
        // Only the Bézout coefficient of `number` (x/u chain) is tracked; the coefficient of `modulo`
        // never affects the output, so it is not computed.
        // prettier-ignore
        let x = _0n$4, u = _1n$3;
        while (a !== _0n$4) {
            const q = b / a;
            const r = b - a * q;
            const m = x - u * q;
            // prettier-ignore
            b = a, a = r, x = u, u = m;
        }
        const gcd = b;
        if (gcd !== _1n$3)
            throw new Error('invert: does not exist');
        return mod(x, modulo);
    }
    /**
     * Inverses number over modulo using Fermat's little theorem: `a^(p-2) ≡ a⁻¹ (mod p)`.
     *
     * Unlike {@link invert} (extended Euclidean), the exponent `p-2` is a public constant, so the
     * underlying square-and-multiply has the same control flow for every secret `a`: there is no
     * data-dependent branching or loop count that could leak `a` through timing (e.g. Minerva-style
     * ECDSA nonce-inversion attacks). This is only "algorithmically" constant-time — JS bigint
     * multiplication/reduction is still value-dependent — and it is roughly 4x slower than
     * {@link invert}.
     *
     * REQUIRES a prime modulus; Fermat's theorem does not hold otherwise. The result is verified to be
     * a real inverse, so a non-prime modulus (or a non-invertible input) fails closed with an error
     * instead of returning a wrong value.
     * @param a - Value to invert.
     * @param prime - Prime modulus.
     * @returns Multiplicative inverse in `[1, prime)`.
     * @throws If the modulus is below 2, the input reduces to zero, or the inverse does not exist.
     *   {@link Error}
     * @example
     * Compute one modular inverse without secret-dependent branching.
     *
     * ```ts
     * invertCt(3n, 11n); // 4n, since 3 * 4 = 12 ≡ 1 (mod 11)
     * ```
     */
    function invertCt(a, prime) {
        if (prime <= _1n$3)
            throw new Error('invertCt: expected prime modulus > 1, got ' + prime);
        const an = mod(a, prime);
        if (an === _0n$4)
            throw new Error('invertCt: expected non-zero number');
        // Exponent (prime - 2) is public, so FpPow's square-and-multiply is secret-independent.
        const inverse = pow(an, prime - _2n$3, prime);
        // O(1) safety net: verifies the inverse and rejects composite moduli where a^(p-2) is not one.
        if (mod(an * inverse, prime) !== _1n$3)
            throw new Error('invertCt: does not exist');
        return inverse;
    }
    function assertIsSquare(Fp, root, n) {
        const F = Fp;
        if (!F.eql(F.sqr(root), n))
            throw new Error('Cannot find square root');
    }
    // The Legendre symbol and every sqrt variant here are only defined over an odd (prime) modulus.
    // An even ORDER makes their integer divisions — (p-1)/2, (p+1)/4, (p-5)/8, (p+7)/16 — truncate and
    // silently return a wrong result, so reject it explicitly at the entry points instead. This is a
    // cheap necessary-condition check, not a primality test (composite odd moduli are caught later by
    // the Legendre-result / assertIsSquare checks).
    function aoddModulus(order, fnName) {
        if ((order & _1n$3) === _0n$4)
            throw new Error(fnName + ': expected odd modulus, got ' + order);
    }
    // Not all roots are possible! Example which will throw:
    // const NUM =
    // n = 72057594037927816n;
    // Fp = Field(BigInt('0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab'));
    function sqrt3mod4(Fp, n) {
        const F = Fp;
        const p1div4 = (F.ORDER + _1n$3) / _4n$2;
        const root = F.pow(n, p1div4);
        assertIsSquare(F, root, n);
        return root;
    }
    // Equivalent `q = 5 (mod 8)` square-root formula (Atkin-style), not the RFC Appendix I.2 CMOV
    // pseudocode verbatim.
    function sqrt5mod8(Fp, n) {
        const F = Fp;
        const p5div8 = (F.ORDER - _5n) / _8n;
        const n2 = F.mul(n, _2n$3);
        const v = F.pow(n2, p5div8);
        const nv = F.mul(n, v);
        const i = F.mul(F.mul(nv, _2n$3), v);
        const root = F.mul(nv, F.sub(i, F.ONE));
        assertIsSquare(F, root, n);
        return root;
    }
    // Based on RFC9380, Kong algorithm
    // prettier-ignore
    function sqrt9mod16(P) {
        const Fp_ = Field(P);
        const tn = tonelliShanks(P);
        const c1 = tn(Fp_, Fp_.neg(Fp_.ONE)); //  1. c1 = sqrt(-1) in F, i.e., (c1^2) == -1 in F
        const c2 = tn(Fp_, c1); //  2. c2 = sqrt(c1) in F, i.e., (c2^2) == c1 in F
        const c3 = tn(Fp_, Fp_.neg(c1)); //  3. c3 = sqrt(-c1) in F, i.e., (c3^2) == -c1 in F
        const c4 = (P + _7n$1) / _16n; //  4. c4 = (q + 7) / 16        # Integer arithmetic
        return ((Fp, n) => {
            const F = Fp;
            let tv1 = F.pow(n, c4); //  1. tv1 = x^c4
            let tv2 = F.mul(tv1, c1); //  2. tv2 = c1 * tv1
            const tv3 = F.mul(tv1, c2); //  3. tv3 = c2 * tv1
            const tv4 = F.mul(tv1, c3); //  4. tv4 = c3 * tv1
            const e1 = F.eql(F.sqr(tv2), n); //  5.  e1 = (tv2^2) == x
            const e2 = F.eql(F.sqr(tv3), n); //  6.  e2 = (tv3^2) == x
            tv1 = F.cmov(tv1, tv2, e1); //  7. tv1 = CMOV(tv1, tv2, e1)  # Select tv2 if (tv2^2) == x
            tv2 = F.cmov(tv4, tv3, e2); //  8. tv2 = CMOV(tv4, tv3, e2)  # Select tv3 if (tv3^2) == x
            const e3 = F.eql(F.sqr(tv2), n); //  9.  e3 = (tv2^2) == x
            const root = F.cmov(tv1, tv2, e3); // 10.  z = CMOV(tv1, tv2, e3)   # Select sqrt from tv1 & tv2
            assertIsSquare(F, root, n);
            return root;
        });
    }
    /**
     * Tonelli-Shanks square root search algorithm.
     * This implementation is variable-time: it searches data-dependently for the first non-residue `Z`
     * and for the smallest `i` in the main loop, unlike RFC 9380 Appendix I.4's constant-time shape.
     * 1. {@link https://eprint.iacr.org/2012/685.pdf | eprint 2012/685}, page 12
     * 2. Square Roots from 1; 24, 51, 10 to Dan Shanks
     * @param P - field order
     * @returns function that takes field Fp (created from P) and number n
     * @throws If the field is too small, non-prime, or the square root does not exist. {@link Error}
     * @example
     * Construct a square-root helper for primes that need Tonelli-Shanks.
     *
     * ```ts
     * import { Field, tonelliShanks } from '@noble/curves/abstract/modular.js';
     * const Fp = Field(17n);
     * const sqrt = tonelliShanks(17n)(Fp, 4n);
     * ```
     */
    function tonelliShanks(P) {
        // Initialization (precomputation).
        // Caching initialization could boost perf by 7%.
        if (P < _3n$1)
            throw new Error('sqrt is not defined for small field');
        aoddModulus(P, 'tonelliShanks');
        // Factor P - 1 = Q * 2^S, where Q is odd
        let Q = P - _1n$3;
        let S = 0;
        while (Q % _2n$3 === _0n$4) {
            Q /= _2n$3;
            S++;
        }
        // Find the first quadratic non-residue Z >= 2
        let Z = _2n$3;
        const _Fp = Field(P);
        while (FpLegendre(_Fp, Z) === 1) {
            // Basic primality test for P. After x iterations, chance of
            // not finding quadratic non-residue is 2^x, so 2^1000.
            if (Z++ > 1000)
                throw new Error('Cannot find square root: probably non-prime P');
        }
        // Fast-path; usually done before Z, but we do "primality test".
        if (S === 1)
            return sqrt3mod4;
        // Slow-path
        // TODO: test on Fp2 and others
        let cc = _Fp.pow(Z, Q); // c = z^Q
        const Q1div2 = (Q + _1n$3) / _2n$3;
        return function tonelliSlow(Fp, n) {
            const F = Fp;
            if (F.is0(n))
                return n;
            // Check if n is a quadratic residue using Legendre symbol
            if (FpLegendre(F, n) !== 1)
                throw new Error('Cannot find square root');
            // Initialize variables for the main loop
            let M = S;
            let c = F.mul(F.ONE, cc); // c = z^Q, move cc from field _Fp into field Fp
            let t = F.pow(n, Q); // t = n^Q, first guess at the fudge factor
            let R = F.pow(n, Q1div2); // R = n^((Q+1)/2), first guess at the square root
            // Main loop
            // while t != 1
            while (!F.eql(t, F.ONE)) {
                // Unreachable over a genuine field (no zero divisors; n=0 already returned above). A zero t
                // means composite ORDER, where a fabricated root would be wrong: fail closed instead.
                if (F.is0(t))
                    throw new Error('Cannot find square root: probably non-prime P');
                let i = 1;
                // Find the smallest i >= 1 such that t^(2^i) ≡ 1 (mod P)
                let t_tmp = F.sqr(t); // t^(2^1)
                while (!F.eql(t_tmp, F.ONE)) {
                    i++;
                    t_tmp = F.sqr(t_tmp); // t^(2^2)...
                    if (i === M)
                        throw new Error('Cannot find square root');
                }
                // Calculate the exponent for b: 2^(M - i - 1)
                const exponent = _1n$3 << BigInt(M - i - 1); // bigint is important
                const b = F.pow(c, exponent); // b = 2^(M - i - 1)
                // Update variables
                M = i;
                c = F.sqr(b); // c = b^2
                t = F.mul(t, c); // t = (t * b^2)
                R = F.mul(R, b); // R = R*b
            }
            return R;
        };
    }
    /**
     * Square root for a finite field. Will try optimized versions first:
     *
     * 1. P ≡ 3 (mod 4)
     * 2. P ≡ 5 (mod 8)
     * 3. P ≡ 9 (mod 16)
     * 4. Tonelli-Shanks algorithm
     *
     * Different algorithms can give different roots, it is up to user to decide which one they want.
     * For example there is FpSqrtOdd/FpSqrtEven to choose a root by oddness
     * (used for hash-to-curve).
     * @param P - Field order.
     * @returns Square-root helper. The generic fallback inherits Tonelli-Shanks' variable-time
     *   behavior and this selector assumes prime-field-style integer moduli.
     * @throws If the field is unsupported or the square root does not exist. {@link Error}
     * @example
     * Choose the square-root helper appropriate for one field modulus.
     *
     * ```ts
     * import { Field, FpSqrt } from '@noble/curves/abstract/modular.js';
     * const Fp = Field(17n);
     * const sqrt = FpSqrt(17n)(Fp, 4n);
     * ```
     */
    function FpSqrt(P) {
        aoddModulus(P, 'Fp.sqrt');
        // P ≡ 3 (mod 4) => √n = n^((P+1)/4)
        if (P % _4n$2 === _3n$1)
            return sqrt3mod4;
        // P ≡ 5 (mod 8) => Atkin algorithm, page 10 of https://eprint.iacr.org/2012/685.pdf
        if (P % _8n === _5n)
            return sqrt5mod8;
        // P ≡ 9 (mod 16) => Kong algorithm, page 11 of https://eprint.iacr.org/2012/685.pdf (algorithm 4)
        if (P % _16n === _9n)
            return sqrt9mod16(P);
        // Tonelli-Shanks algorithm
        return tonelliShanks(P);
    }
    // prettier-ignore
    // Arithmetic-only subset checked by validateField(). This is intentionally not the full runtime
    // IField contract: helpers like `isValidNot0`, `invertBatch`, `toBytes`, `fromBytes`, `cmov`, and
    // field-specific extras like `isOdd` are left to the callers that actually need them.
    const FIELD_FIELDS = [
        'create', 'isValid', 'is0', 'neg', 'inv', 'sqrt', 'sqr',
        'eql', 'add', 'sub', 'mul', 'pow', 'div',
        'addN', 'subN', 'mulN', 'sqrN'
    ];
    /**
     * @param field - Field implementation.
     * @returns Validated field. This only checks the arithmetic subset needed by generic helpers; it
     *   does not guarantee full runtime-method coverage for serialization, batching, `cmov`, or
     *   field-specific extras beyond positive `BYTES` / `BITS`.
     * @throws If the field shape or numeric metadata are invalid. {@link Error}
     * @example
     * Check that a field implementation exposes the operations curve code expects.
     *
     * ```ts
     * import { Field, validateField } from '@noble/curves/abstract/modular.js';
     * const Fp = validateField(Field(17n));
     * ```
     */
    function validateField(field) {
        aobject(field, 'field');
        if (typeof field.ORDER !== 'bigint')
            throw new TypeError('param "ORDER" is invalid: expected bigint, got ' + typeof field.ORDER);
        // Runtime field implementations must expose real integer byte/bit sizes; fractional / NaN /
        // infinite metadata breaks encoders and caches.
        asafenumber(field.BYTES, 'BYTES');
        asafenumber(field.BITS, 'BITS');
        for (const name of FIELD_FIELDS)
            afunction(field[name], 'field.' + name);
        // Runtime field implementations must expose positive byte/bit sizes; zero leaks through the
        // numeric shape checks above but still breaks encoding helpers and cached-length assumptions.
        if (field.BYTES < 1 || field.BITS < 1)
            throw new Error('invalid field: expected BYTES/BITS > 0');
        if (field.ORDER <= _1n$3)
            throw new Error('invalid field: expected ORDER > 1, got ' + field.ORDER);
        return field;
    }
    function FpInvertBatch(Fp, nums, passZero = false) {
        validateField(Fp);
        aarray(nums, 'nums');
        abool$1(passZero, 'passZero');
        const F = Fp;
        const inverted = new Array(nums.length).fill(passZero ? F.ZERO : undefined);
        // Walk from first to last, multiply them by each other MOD p
        const multipliedAcc = nums.reduce((acc, num, i) => {
            if (F.is0(num))
                return acc;
            inverted[i] = acc;
            return F.mul(acc, num);
        }, F.ONE);
        // Invert last element
        const invertedAcc = F.inv(multipliedAcc);
        // Walk from last to first, multiply them by inverted each other MOD p
        nums.reduceRight((acc, num, i) => {
            if (F.is0(num))
                return acc;
            // Non-zero `num` means the forward pass already stored a defined prefix product at index i.
            inverted[i] = F.mul(acc, inverted[i]);
            return F.mul(acc, num);
        }, invertedAcc);
        return inverted;
    }
    /**
     * Legendre symbol.
     * Legendre constant is used to calculate Legendre symbol (a | p)
     * which denotes the value of a^((p-1)/2) (mod p).
     *
     * * (a | p) ≡ 1    if a is a square (mod p), quadratic residue
     * * (a | p) ≡ -1   if a is not a square (mod p), quadratic non residue
     * * (a | p) ≡ 0    if a ≡ 0 (mod p)
     * @param Fp - Field implementation.
     * @param n - Value to inspect.
     * @returns Legendre symbol.
     * @throws If the powered value does not match a valid Legendre symbol. {@link Error}
     * @example
     * Compute the Legendre symbol of one field element.
     *
     * ```ts
     * import { Field, FpLegendre } from '@noble/curves/abstract/modular.js';
     * const Fp = Field(17n);
     * const symbol = FpLegendre(Fp, 4n);
     * ```
     */
    function FpLegendre(Fp, n) {
        validateField(Fp);
        const F = Fp;
        aoddModulus(F.ORDER, 'FpLegendre');
        // We can use 3rd argument as optional cache of this value
        // but seems unneeded for now. The operation is very fast.
        const p1mod2 = (F.ORDER - _1n$3) / _2n$3;
        const powered = F.pow(n, p1mod2);
        const yes = F.eql(powered, F.ONE);
        const zero = F.eql(powered, F.ZERO);
        const no = F.eql(powered, F.neg(F.ONE));
        if (!yes && !zero && !no)
            throw new Error('invalid Legendre symbol result');
        return yes ? 1 : zero ? 0 : -1;
    }
    /**
     * @param n - Curve order. Callers are expected to pass a positive order.
     * @param nBitLength - Optional cached bit length. Callers are expected to pass a positive cached
     *   value when overriding the derived bit length.
     * @returns Byte and bit lengths.
     * @throws If the order or cached bit length is invalid. {@link Error}
     * @example
     * Measure the encoding sizes needed for one modulus.
     *
     * ```ts
     * nLength(255n);
     * ```
     */
    function nLength(n, nBitLength) {
        // Bit size, byte size of CURVE.n
        if (nBitLength !== undefined)
            anumber$1(nBitLength);
        if (n <= _0n$4)
            throw new Error('invalid n length: expected positive n, got ' + n);
        if (nBitLength !== undefined && nBitLength < 1)
            throw new Error('invalid n length: expected positive bit length, got ' + nBitLength);
        const bits = bitLen(n);
        // Cached bit lengths smaller than ORDER would truncate serialized scalars/elements and poison
        // any math that relies on the derived field metadata.
        if (nBitLength !== undefined && nBitLength < bits)
            throw new Error(`invalid n length: expected nBitLength (${nBitLength}) >= bitLen(n) (${bits})`);
        const _nBitLength = nBitLength !== undefined ? nBitLength : bits;
        const nByteLength = Math.ceil(_nBitLength / 8);
        return { nBitLength: _nBitLength, nByteLength };
    }
    // Keep the lazy sqrt cache off-instance so Field(...) can return a frozen object. Otherwise the
    // cached helper write would keep the field surface externally mutable.
    const FIELD_SQRT = new WeakMap();
    class _Field {
        ORDER;
        BITS;
        BYTES;
        isLE;
        ZERO = _0n$4;
        ONE = _1n$3;
        _lengths;
        _mod;
        constructor(ORDER, opts = {}) {
            // ORDER <= 1 is degenerate: ONE would not be a valid field element and helpers like pow/inv
            // would stop modeling field arithmetic.
            if (ORDER <= _1n$3)
                throw new Error('invalid field: expected ORDER > 1, got ' + ORDER);
            let _nbitLength = undefined;
            this.isLE = false;
            if (opts != null && typeof opts === 'object') {
                // Cached bit lengths are trusted here and should already be positive / consistent with ORDER.
                if (typeof opts.BITS === 'number')
                    _nbitLength = opts.BITS;
                if (typeof opts.sqrt === 'function')
                    // `_Field.prototype` is frozen below, so custom sqrt hooks must become own properties
                    // explicitly instead of relying on writable prototype shadowing via assignment.
                    Object.defineProperty(this, 'sqrt', { value: opts.sqrt, enumerable: true });
                if (typeof opts.isLE === 'boolean')
                    this.isLE = opts.isLE;
                if (opts.allowedLengths)
                    this._lengths = Object.freeze(opts.allowedLengths.slice());
                if (typeof opts.modFromBytes === 'boolean')
                    this._mod = opts.modFromBytes;
            }
            const { nBitLength, nByteLength } = nLength(ORDER, _nbitLength);
            if (nByteLength > 2048)
                throw new Error('invalid field: expected ORDER of <= 2048 bytes');
            this.ORDER = ORDER;
            this.BITS = nBitLength;
            this.BYTES = nByteLength;
            Object.freeze(this);
        }
        create(num) {
            return mod(num, this.ORDER);
        }
        isValid(num) {
            if (typeof num !== 'bigint')
                throw new TypeError('invalid field element: expected bigint, got ' + typeof num);
            return _0n$4 <= num && num < this.ORDER; // 0 is valid element, but it's not invertible
        }
        is0(num) {
            return num === _0n$4;
        }
        // is valid and invertible
        isValidNot0(num) {
            return !this.is0(num) && this.isValid(num);
        }
        isOdd(num) {
            return (num & _1n$3) === _1n$3;
        }
        neg(num) {
            return mod(-num, this.ORDER);
        }
        eql(lhs, rhs) {
            return lhs === rhs;
        }
        sqr(num) {
            return mod(num * num, this.ORDER);
        }
        add(lhs, rhs) {
            return mod(lhs + rhs, this.ORDER);
        }
        sub(lhs, rhs) {
            return mod(lhs - rhs, this.ORDER);
        }
        mul(lhs, rhs) {
            return mod(lhs * rhs, this.ORDER);
        }
        pow(num, power) {
            return pow(num, power, this.ORDER);
        }
        div(lhs, rhs) {
            return mod(lhs * invert(rhs, this.ORDER), this.ORDER);
        }
        // Same as above, but doesn't normalize
        sqrN(num) {
            return num * num;
        }
        addN(lhs, rhs) {
            return lhs + rhs;
        }
        subN(lhs, rhs) {
            return lhs - rhs;
        }
        mulN(lhs, rhs) {
            return lhs * rhs;
        }
        inv(num) {
            return invert(num, this.ORDER);
        }
        sqrt(num) {
            // Caching sqrt helpers speeds up sqrt9mod16 by 5x and Tonelli-Shanks by about 10% without keeping
            // the field instance itself mutable.
            let sqrt = FIELD_SQRT.get(this);
            if (!sqrt)
                FIELD_SQRT.set(this, (sqrt = FpSqrt(this.ORDER)));
            return sqrt(this, num);
        }
        toBytes(num) {
            // Serialize fixed-width limbs without re-validating the field range. Callers that need a
            // canonical encoding must pass a valid element; some protocols intentionally serialize raw
            // residues here and reduce or validate them elsewhere.
            return this.isLE ? numberToBytesLE(num, this.BYTES) : numberToBytesBE(num, this.BYTES);
        }
        fromBytes(bytes, skipValidation = false) {
            abytes$1(bytes);
            const { _lengths: allowedLengths, BYTES, isLE, ORDER, _mod: modFromBytes } = this;
            if (allowedLengths) {
                // `allowedLengths` must list real positive byte lengths; otherwise empty input would get
                // padded into zero and silently decode as a field element.
                if (bytes.length < 1 || !allowedLengths.includes(bytes.length) || bytes.length > BYTES) {
                    throw new Error('Field.fromBytes: expected ' + allowedLengths + ' bytes, got ' + bytes.length);
                }
                const padded = new Uint8Array(BYTES);
                // isLE add 0 to right, !isLE to the left.
                padded.set(bytes, isLE ? 0 : padded.length - bytes.length);
                bytes = padded;
            }
            if (bytes.length !== BYTES)
                throw new Error('Field.fromBytes: expected ' + BYTES + ' bytes, got ' + bytes.length);
            let scalar = isLE ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
            if (modFromBytes)
                scalar = mod(scalar, ORDER);
            if (!skipValidation)
                if (!this.isValid(scalar))
                    throw new Error('invalid field element: outside of range 0..ORDER');
            // Range validation is optional here because some protocols intentionally decode raw residues
            // and reduce or validate them elsewhere.
            return scalar;
        }
        // TODO: we don't need it here, move out to separate fn
        invertBatch(lst) {
            // `passZero` keeps the `bigint[]` contract honest: zero inputs map to `0` instead of leaking
            // `undefined` into a `bigint[]`. Callers that must distinguish non-invertible inputs should use
            // `FpInvertBatch` directly, whose default omits `passZero` and returns `(bigint | undefined)[]`.
            return FpInvertBatch(this, lst, true);
        }
        // We can't move this out because Fp6, Fp12 implement it
        // and it's unclear what to return in there.
        cmov(a, b, condition) {
            // Field elements have `isValid(...)`; the CMOV branch bit is a direct runtime input, so reject
            // non-boolean selectors here instead of letting JS truthiness silently change arithmetic.
            abool$1(condition, 'condition');
            return condition ? b : a;
        }
    }
    /**
     * Creates a finite field. Major performance optimizations:
     * * 1. Denormalized operations like mulN instead of mul.
     * * 2. Identical object shape: never add or remove keys.
     * * 3. Frozen stable object shape; the lazy sqrt cache lives in a module-level `WeakMap`.
     * Fragile: always run a benchmark on a change.
     * Security note: operations and low-level serializers like `toBytes` don't check `isValid` for
     * all elements for performance and protocol-flexibility reasons; callers are responsible for
     * supplying valid elements when they need canonical field behavior.
     * This is low-level code, please make sure you know what you're doing.
     *
     * Note about field properties:
     * * CHARACTERISTIC p = prime number, number of elements in main subgroup.
     * * ORDER q = similar to cofactor in curves, may be composite `q = p^m`.
     *
     * @param ORDER - field order, probably prime, or could be composite
     * @param opts - Field options such as bit length or endianness. See {@link FieldOpts}.
     * @returns Frozen field instance with a stable object shape. This wrapper forwards `opts` straight
     *   into `_Field`, so it inherits `_Field`'s assumptions about cached sizes and `allowedLengths`.
     * @example
     * Construct one prime field with optional overrides.
     *
     * ```ts
     * Field(11n);
     * ```
     */
    function Field(ORDER, opts = {}) {
        // Freeze the shared method surface before any instance is reachable; otherwise callers can
        // poison every Field instance by monkey-patching `_Field.prototype` even if each instance is
        // frozen. Freezing here instead of module scope keeps `_Field` tree-shakeable for importers
        // that never construct a field; the call is idempotent and cheap.
        Object.freeze(_Field.prototype);
        return new _Field(ORDER, opts);
    }
    /**
     * Returns total number of bytes consumed by the field element.
     * For example, 32 bytes for usual 256-bit weierstrass curve.
     * @param fieldOrder - number of field elements, usually CURVE.n. Callers are expected to pass an
     *   order greater than 1.
     * @returns byte length of field
     * @throws If the field order is not a bigint. {@link Error}
     * @example
     * Read the fixed-width byte length of one field.
     *
     * ```ts
     * getFieldBytesLength(255n);
     * ```
     */
    function getFieldBytesLength(fieldOrder) {
        if (typeof fieldOrder !== 'bigint')
            throw new Error('field order must be bigint');
        // Valid field elements are in 0..ORDER-1, so ORDER <= 1 would make the encoded range degenerate.
        if (fieldOrder <= _1n$3)
            throw new Error('field order must be greater than 1');
        // Valid field elements are < ORDER, so the maximal encoded element is ORDER - 1.
        const bitLength = bitLen(fieldOrder - _1n$3);
        return Math.ceil(bitLength / 8);
    }
    /**
     * Returns minimal amount of bytes that can be safely reduced
     * by field order.
     * Should be 2^-128 for 128-bit curve such as P256.
     * This is the reduction / modulo-bias lower bound; higher-level helpers may still impose a larger
     * absolute floor for policy reasons.
     * @param fieldOrder - number of field elements greater than 1, usually CURVE.n.
     * @returns byte length of target hash
     * @throws If the field order is invalid. {@link Error}
     * @example
     * Compute the minimum hash length needed for field reduction.
     *
     * ```ts
     * getMinHashLength(255n);
     * ```
     */
    function getMinHashLength(fieldOrder) {
        const length = getFieldBytesLength(fieldOrder);
        return length + Math.ceil(length / 2);
    }
    /**
     * "Constant-time" private key generation utility.
     * Can take (n + n/2) or more bytes of uniform input e.g. from CSPRNG or KDF
     * and convert them into private scalar, with the modulo bias being negligible.
     * Needs at least 48 bytes of input for 32-byte private key. The implementation also keeps a hard
     * 16-byte minimum even when `getMinHashLength(...)` is smaller, so toy-small inputs do not look
     * accidentally acceptable for real scalar derivation.
     * See {@link https://research.kudelskisecurity.com/2020/07/28/the-definitive-guide-to-modulo-bias-and-how-to-avoid-it/ | Kudelski's modulo-bias guide},
     * {@link https://csrc.nist.gov/publications/detail/fips/186/5/final | FIPS 186-5 appendix A.2}, and
     * {@link https://www.rfc-editor.org/rfc/rfc9380#section-5 | RFC 9380 section 5}. Unlike RFC 9380
     * `hash_to_field`, this helper intentionally maps into the non-zero private-scalar range `1..n-1`.
     * @param key - Uniform input bytes.
     * @param fieldOrder - Size of subgroup.
     * @param isLE - interpret hash bytes as LE num
     * @returns valid private scalar
     * @throws If the hash length or field order is invalid for scalar reduction. {@link Error}
     * @example
     * Map hash output into a private scalar range.
     *
     * ```ts
     * mapHashToField(new Uint8Array(48).fill(1), 255n);
     * ```
     */
    function mapHashToField(key, fieldOrder, isLE = false) {
        abytes$1(key);
        const len = key.length;
        const fieldLen = getFieldBytesLength(fieldOrder);
        const minLen = Math.max(getMinHashLength(fieldOrder), 16);
        // No toy-small inputs: the helper is for real scalar derivation, not tiny test curves. No huge
        // inputs: easier to reason about JS timing / allocation behavior.
        if (len < minLen || len > 1024)
            throw new Error('expected ' + minLen + '-1024 bytes of input, got ' + len);
        const num = isLE ? bytesToNumberLE(key) : bytesToNumberBE(key);
        // Map into the non-zero scalar range [1, fieldOrder-1]: reduce mod (fieldOrder-1) to land in
        // [0, fieldOrder-2], then add 1. This shifts the range off zero; it is NOT equal to
        // `mod(num, fieldOrder)` (which spans [0, fieldOrder-1] and can be 0). A residual modulo bias
        // remains but is negligible (~2^-(nBits/2), e.g. ~2^-128 for a 256-bit order) because `key` is
        // required to be at least `getMinHashLength(fieldOrder)` (~1.5x field size) bytes of input.
        const reduced = mod(num, fieldOrder - _1n$3) + _1n$3;
        return isLE ? numberToBytesLE(reduced, fieldLen) : numberToBytesBE(reduced, fieldLen);
    }

    /**
     * Methods for elliptic curve multiplication by scalars.
     * Contains wNAF-based ScalarMultiplier, pippenger.
     * @module
     */
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    const _0n$3 = /* @__PURE__ */ BigInt(0);
    const _1n$2 = /* @__PURE__ */ BigInt(1);
    const _4n$1 = /* @__PURE__ */ BigInt(4);
    const BLIND_BYTES = 16;
    const BLIND_BITS = 128;
    // Fixed-window width for the constant-time multiply of un-precomputed points (W===1).
    // A flat 2^FW_WINDOW table has a small, scalar-independent build cost that amortizes over a single
    // multiply, unlike the larger per-point wNAF tables that only pay off when cached.
    const FW_WINDOW = 5;
    // Precompute tables are capped at ~2 GiB of estimated heap. Rejecting larger windows up front
    // turns a typo'd window size into an immediate error instead of a multi-GB allocation (or an
    // effective hang) when the lazy table is built on first multiply.
    const TABLE_BYTES_MAX = /* @__PURE__ */ (() => 2 ** 31)();
    /**
     * Validates the static surface of a point constructor.
     * This is only a cheap sanity check for the constructor hooks and fields consumed by generic
     * factories; it does not certify `BASE`/`ZERO` semantics or prove the curve implementation itself.
     * @param Point - Runtime point constructor.
     * @throws On missing constructor hooks or malformed field metadata. {@link TypeError}
     * @example
     * Check that one point constructor exposes the static hooks generic helpers need.
     *
     * ```ts
     * import { ed25519 } from '@noble/curves/ed25519.js';
     * import { validatePointCons } from '@noble/curves/abstract/curve.js';
     * validatePointCons(ed25519.Point);
     * ```
     */
    function validatePointCons(Point) {
        const pc = Point;
        if (typeof pc !== 'function')
            throw new TypeError('"Point" expected constructor, got type=' + typeof Point);
        afunction(pc.fromAffine, 'Point.fromAffine');
        afunction(pc.fromBytes, 'Point.fromBytes');
        afunction(pc.fromHex, 'Point.fromHex');
        // Generic helpers (ScalarMultiplier, normalizeZ, MSM) dereference BASE / ZERO:
        // fail here with a typed error instead of an `undefined` access later.
        aobject(pc.BASE, 'Point.BASE');
        aobject(pc.ZERO, 'Point.ZERO');
        validateField(pc.Fp);
        validateField(pc.Fn);
    }
    /**
     * Takes a bunch of Projective Points but executes only one
     * inversion on all of them. Inversion is very slow operation,
     * so this improves performance massively.
     * Optimization: converts a list of projective points to a list of identical points with Z=1.
     * Input points are left unchanged; the normalized points are returned as fresh instances.
     * @param c - Point constructor.
     * @param points - Projective points.
     * @returns Fresh projective points reconstructed from normalized affine coordinates.
     * @example
     * Batch-normalize projective points with a single shared inversion.
     *
     * ```ts
     * import { normalizeZ } from '@noble/curves/abstract/curve.js';
     * import { p256 } from '@noble/curves/nist.js';
     * const points = normalizeZ(p256.Point, [p256.Point.BASE, p256.Point.BASE.double()]);
     * ```
     */
    function normalizeZ(c, points) {
        // Match MSM helpers: reject malformed public inputs before reading projective internals.
        validatePointCons(c);
        validateMSMPoints(points, c);
        // Identity points (Z=0) rely on an implicit contract: FpInvertBatch without `passZero`
        // yields `undefined` for zero inputs, and `toAffine(undefined)` falls back to its internal
        // is0 handling instead of using the batch inverse.
        const invertedZs = FpInvertBatch(c.Fp, points.map((p) => p.Z));
        return points.map((p, i) => c.fromAffine(p.toAffine(invertedZs[i])));
    }
    function validateW(W, bits, min = 1) {
        if (!Number.isSafeInteger(W) || W < min || W > bits)
            throw new Error('invalid window size, expected [' + min + '..' + bits + '], got W=' + W);
    }
    // Rough per-point heap estimate for the {@link TABLE_BYTES_MAX} cap: up to 4 projective/extended
    // coordinates of Fp.BYTES each, plus bigint/object overhead. Callers pass the point count of the
    // largest table the checked parameters can produce.
    function validateTableBytes(numPoints, fpBytes) {
        const bytes = numPoints * (4 * fpBytes + 128);
        if (bytes > TABLE_BYTES_MAX)
            throw new Error('invalid window size: table would need ~' +
                Math.ceil(bytes / 2 ** 20) +
                ' MiB, max ' +
                TABLE_BYTES_MAX / 2 ** 20 +
                ' MiB');
    }
    /**
     * Probes an RNG once, at construction time: returns `undefined` when it is unavailable —
     * throws or returns malformed bytes — so callers can downgrade to their unblinded /
     * deterministic constant-time fallback. Blinding is defense-in-depth (DPA/template
     * hardening), not a correctness or key-secrecy requirement, so availability-based
     * downgrade is acceptable.
     *
     * The downgrade decision is deliberately static. After a successful probe the RNG becomes
     * part of the trusted contract: later misbehavior must fail closed in per-call validation
     * (throw), never downgrade — a dynamic fallback would let a tampered RNG silently strip
     * blinding on demand. A probe can only ever classify broken environments, not adversarial
     * RNGs: a stateful RNG can always behave while probed and misbehave later.
     * @param randomBytes - RNG to probe, or `undefined` when the environment provides none.
     * @param length - Byte length requested from the probe call.
     * @returns The RNG when the probe produced `length` valid bytes; `undefined` otherwise.
     * @example
     * Probe an RNG once before enabling scalar blinding.
     *
     * ```ts
     * import { probeRandomBytes } from '@noble/curves/abstract/curve.js';
     * import { randomBytes } from '@noble/hashes/utils.js';
     * const rng = probeRandomBytes(randomBytes, 16);
     * ```
     */
    function probeRandomBytes(randomBytes, length) {
        if (randomBytes === undefined)
            return undefined;
        afunction(randomBytes, 'randomBytes');
        try {
            const probe = randomBytes(length);
            if (!isBytes$1(probe) || probe.length !== length)
                return undefined;
        }
        catch {
            return undefined;
        }
        return randomBytes;
    }
    function validateMSMPoints(points, c) {
        aarray(points, 'points');
        points.forEach((p, i) => {
            if (!(p instanceof c))
                throw new Error('invalid point at index ' + i);
        });
    }
    // Default bound is field membership (0 <= s < field.ORDER); a `maxScalar` override widens it
    // to 0 <= s < maxScalar for callers that accept oversized scalars.
    function validateMSMScalars(scalars, field, maxScalar) {
        if (!Array.isArray(scalars))
            throw new Error('array of scalars expected');
        scalars.forEach((s, i) => {
            const ok = maxScalar === undefined ? field.isValid(s) : isPosBig(s) && s < maxScalar;
            if (!ok)
                throw new Error('invalid scalar at index ' + i);
        });
    }
    const pointWindowSizes = new WeakMap();
    function getWindowSize(P) {
        // `1` is the uncached sentinel: use the non-precomputed (wNAF / fixed-window) path.
        return pointWindowSizes.get(P) || 1;
    }
    /** Table of odd multiples [1P, 3P, ..., (2⋅size−1)P]; width-W wNAF uses size = 2^(W−2). */
    function oddMultiples(p, size) {
        const dbl = p.double();
        const t = [p];
        for (let j = 1; j < size; j++)
            t.push(t[j - 1].add(dbl));
        return t;
    }
    /**
     * Width-W wNAF signed-digit recoding (W >= 2), LSB-first: digits are 0 or odd with
     * |digit| < 2^(W−1); nonzero density ~1/(W+1) (a nonzero digit is followed by W−1 zeros).
     */
    function wnafDigits(n, W) {
        const size = 2 ** W;
        const half = size / 2;
        const mask = BigInt(size - 1);
        const d = [];
        while (n > _0n$3) {
            let w = 0;
            if (n & _1n$2) {
                w = Number(n & mask); // n mod 2^W, odd
                if (w >= half)
                    w -= size; // signed residue
                n -= BigInt(w); // n - w ≡ 0 mod 2^W: next W−1 digits are zero
            }
            d.push(w);
            n >>= _1n$2;
        }
        return d;
    }
    /**
     * Fixed-position signed-window recoding for precomputed wNAF: `n = Σ digits[w]⋅2^(w⋅W)` with
     * digits in `[−2^(W−1)+1, 2^(W−1)]`. Digit count is fixed by `windows` (callers reserve one
     * extra window for the final carry), so recoding length does not depend on the scalar.
     */
    function signedWindowDigits(n, W, windows) {
        const size = 2 ** W;
        const half = size / 2;
        const mask = BigInt(size - 1);
        const shiftBy = BigInt(W);
        const d = [];
        for (let w = 0; w < windows; w++) {
            let v = Number(n & mask);
            n >>= shiftBy;
            if (v > half) {
                v -= size; // negative digit, carry into the next window
                n += _1n$2;
            }
            d.push(v);
        }
        // Internal invariant: leftover bits mean the window count did not cover the scalar.
        if (n !== _0n$3)
            throw new Error('invalid wnaf');
        return d;
    }
    /**
     * Shared vartime walk over per-scalar wNAF digit streams: one doubling of a single shared
     * accumulator per bit position of the longest recoding, one signed table addition per
     * nonzero digit. `tables[i]` must hold the odd multiples of the i-th point.
     */
    function wnafWalk(zero, tables, digits) {
        let max = 0;
        for (const d of digits)
            max = Math.max(max, d.length);
        let acc = zero;
        for (let bit = max - 1; bit >= 0; bit--) {
            if (bit !== max - 1)
                acc = acc.double();
            for (let i = 0; i < digits.length; i++) {
                const w = digits[i][bit]; // reads past shorter recodings yield undefined, skipped below
                if (w) {
                    const item = tables[i][(Math.abs(w) - 1) >> 1];
                    acc = acc.add(w < 0 ? item.negate() : item);
                }
            }
        }
        return acc;
    }
    /**
     * Elliptic curve multiplication of Point by scalar.
     * Routes between cached-table, fixed-window, and one-shot wNAF paths; entry points validate
     * their own scalars (`mulCT`/`mulCTBlinded`: `1 <= s < Fn.ORDER`; `mulUnsafe`: up to the
     * `Fn.ORDER^4` DoS cap via {@link mulAddUnsafe}).
     * Table generation is expensive and happens on first call of `multiply()`
     * (or eagerly via `precompute(W, false)`). By default, `BASE` point is precomputed.
     *
     * Cached algorithm is signed fixed-window wNAF:
     * - table stores, for every window w, the multiples `[1..2^(W−1)]⋅2^(w⋅W)⋅P` — all doublings
     *   are baked in, so a multiplication is exactly one table addition per window
     * - window count is fixed (`ceil(bits/W) + 1`), so the point-operation count is scalar-independent
     *   (basis of the constant-time path)
     * - for a 256-bit curve and W=6: 44⋅32 = 1408 table points, 44 additions per multiply
     * - secret scalars are additionally blinded (see {@link ScalarMultiplier.mulCTBlinded}), which
     *   widens tables by 128 bits
     * @param Point - Point constructor.
     * @param randomBytes - RNG used for scalar blinding; required by the blinded secret path.
     * @example
     * Elliptic curve multiplication of Point by scalar.
     *
     * ```ts
     * import { ScalarMultiplier } from '@noble/curves/abstract/curve.js';
     * import { p256 } from '@noble/curves/nist.js';
     * const mul = new ScalarMultiplier(p256.Point);
     * ```
     */
    class ScalarMultiplier {
        Point;
        BASE;
        ZERO;
        randomBytes;
        wnafPrecomputes = new WeakMap();
        baseCanBeBlinded;
        bits;
        // Parametrized with a given Point class (not individual point)
        constructor(Point, randomBytes) {
            validatePointCons(Point);
            // Probe the RNG once (see {@link probeRandomBytes}): in environments without working
            // randomness (e.g. no WebCrypto), shouldBlind() then routes secret multiplication to the
            // unblinded constant-time path instead of throwing on every multiply(). The shape of
            // returned bytes is still validated on every blinded call, where breakage fails closed.
            this.randomBytes = probeRandomBytes(randomBytes, BLIND_BYTES);
            this.Point = Point;
            this.BASE = Point.BASE;
            this.ZERO = Point.ZERO;
            this.bits = Point.Fn.BITS;
        }
        /**
         * Creates a signed fixed-window wNAF precomputation table: for every window w, the
         * multiples `[1..2^(W−1)]⋅2^(w⋅W)⋅P`, flattened. All doublings are baked into the table,
         * so cached multiplication is additions-only. `windows = ceil(bits/W) + 1`: the extra
         * window absorbs the final carry of signed-digit recoding.
         * For a 256-bit curve and W=6, the table is 44⋅32 = 1408 points.
         * @param point - Point instance
         * @param W - window size
         * @param bits - scalar bitlength the table must cover
         */
        buildWnafTable(point, W, bits) {
            // W needs no re-validation: its only source is setWindowSize(), which enforces
            // 1 <= W <= Fn.BITS <= bits (the blinded path only ever widens bits) and caps the
            // resulting table at ~2 GiB (sized against the wider blinded layout).
            const windows = Math.ceil(bits / W) + 1;
            const half = 2 ** (W - 1);
            const comp = [];
            let base = point;
            for (let w = 0; w < windows; w++) {
                let acc = base;
                for (let i = 0; i < half; i++) {
                    comp.push(acc);
                    acc = acc.add(base);
                }
                base = comp[comp.length - 1].double(); // 2⋅(2^(W−1)⋅base) = next window's base
            }
            return { W, bits, windows, comp };
        }
        /**
         * Implements ec multiplication using precomputed signed fixed-window wNAF tables.
         * Constant-time: fixed window count with one table addition per window — zero digits feed
         * the fake accumulator — and no doublings; the lookup scans the whole window slice.
         * Scalar bounds are validated by the public entry points ({@link ScalarMultiplier.mulCT},
         * {@link ScalarMultiplier.mulCTBlinded}, {@link ScalarMultiplier.mulUnsafe});
         * signedWindowDigits throws if `n` exceeds the table.
         * @returns real and fake (for const-time) points
         */
        wnafCachedCT(precomputes, n) {
            const { W, windows, comp } = precomputes;
            const half = 2 ** (W - 1);
            const digits = signedWindowDigits(n, W, windows);
            let p = this.ZERO;
            let f = this.BASE;
            for (let w = 0; w < windows; w++) {
                const digit = digits[w];
                const start = w * half;
                // Data-oblivious select: touch every entry of the window before the digit branch.
                const idx = Math.abs(digit) - 1; // -1 for zero digits: matches nothing, `sel` unused
                let sel = comp[start];
                for (let i = 1; i < half; i++)
                    sel = i === idx ? comp[start + i] : sel;
                const neg = sel.negate(); // compute both signs; the digit only picks one
                if (digit === 0)
                    f = f.add(comp[start]);
                else
                    p = p.add(digit < 0 ? neg : sel);
            }
            return { p, f };
        }
        // Cache key is point identity plus (W, bits); at most two entries exist per point (public-width
        // `Fn.BITS` and blinded `Fn.BITS + BLIND_BITS`). Callers must not reuse the same point with
        // incompatible `transform(...)` layouts and expect a separate cache entry.
        getWnafPrecomputes(W, point, bits, transform) {
            let entries = this.wnafPrecomputes.get(point);
            let comp = entries?.find((entry) => entry.W === W && entry.bits === bits);
            if (!comp) {
                comp = this.buildWnafTable(point, W, bits);
                if (typeof transform === 'function')
                    comp = { ...comp, comp: transform(comp.comp) };
                if (!entries) {
                    entries = [];
                    this.wnafPrecomputes.set(point, entries);
                }
                entries.push(comp);
            }
            return comp;
        }
        assertPoint(point) {
            if (!(point instanceof this.Point))
                throw new TypeError('"point" expected Point instance, got type=' + typeof point);
        }
        // Shared prologue of the constant-time entry points. Rejects scalar 0: in key/signature-style
        // callers a zero scalar means broken upstream plumbing, and concrete Points already reject it.
        // Uses inRange instead of Fn.isValidNot0: validateField() only certifies the arithmetic subset.
        validateMulInput(point, scalar) {
            this.assertPoint(point);
            if (!inRange(scalar, _1n$2, this.Point.Fn.ORDER))
                throw new Error('invalid scalar');
        }
        // Constant-time dispatch shared by mulCT / mulCTBlinded. Un-precomputed points (W===1, e.g.
        // ECDH peer keys) skip building a throwaway cached table in favor of a small fixed-window
        // multiply. `n` must be < 2^bits.
        runCT(point, n, bits, transform) {
            const W = getWindowSize(point);
            if (W === 1)
                return this.fixedWindowCT(point, n, bits);
            return this.wnafCachedCT(this.getWnafPrecomputes(W, point, bits, transform), n);
        }
        mulCT(point, scalar, transform) {
            this.validateMulInput(point, scalar);
            return this.runCT(point, scalar, this.bits, transform);
        }
        mulCTBlinded(point, scalar, transform) {
            this.validateMulInput(point, scalar);
            // Blinding computes n = scalar + blind*Fn.ORDER, then n*P via a constant-time multiply. This
            // equals scalar*P only when Fn.ORDER*P == O; callers guarantee that via shouldBlind() (always
            // for cofactor-1 curves; for cofactored curves only BASE, and only after checking BASE*n == O).
            // Fail before building the (large) precompute table if randomness is unavailable.
            if (this.randomBytes === undefined)
                throw new Error('randomBytes is required for scalar blinding');
            const bits = this.Point.Fn.BITS + BLIND_BITS;
            const blind = this.randomBytes(BLIND_BYTES);
            if (!isBytes$1(blind) || blind.length !== BLIND_BYTES)
                throw new Error('randomBytes returned invalid byte array');
            // Force the top two bits of the 128-bit blind to 10xxxxxx, so blind is in [2^127, 1.5*2^127):
            // * `| 0x80` (bit 127 = 1) is the load-bearing part: it guarantees blind >= 2^127, so the blind
            //   is always a full-width, nonzero factor and the scalar is masked even with a degenerate RNG.
            // * `& 0x3f` (bit 126 = 0) is a safety margin: it caps blind < 1.5*2^127, keeping
            //   blind*Fn.ORDER + scalar < 0.75*2^(nBits+128), i.e. ~half a window below the 2^(nBits+128)
            //   ceiling. Not strictly required for the bound (see below), but it reserves headroom so the
            //   guarantee does not rest on the tight `Fn.ORDER < 2^Fn.BITS` fact and the final carry window
            //   only ever holds a small carry, never a full digit.
            blind[0] = (blind[0] & 0x3f) | 0x80;
            // Even at the extreme (blind < 2^128, scalar < Fn.ORDER < 2^nBits): n <= 2^128*Fn.ORDER - 1 <
            // 2^(nBits+128), so n stays below 2^bits and within the blinded table's
            // window count. Both cached CT kernels run a fixed number of windows/rows with one point-add
            // each, so the add count is independent of scalar (constant-time).
            const n = scalar + bytesToNumberBE(blind) * this.Point.Fn.ORDER;
            return this.runCT(point, n, bits, transform);
        }
        /**
         * Constant-time multiplication `n*point` for an un-precomputed point, via a small fixed window.
         * A cached wNAF table only pays off when reused; a flat 2^FW_WINDOW table (`size-1` adds) is
         * far cheaper to build for a single use. The point-operation sequence is independent of `n`:
         * build the table, then per window exactly FW_WINDOW doublings, a data-oblivious scan over
         * every table entry, and one addition (adds the identity when the window digit is 0 — never
         * skipped).
         *
         * `n` must be `< 2^bits`. Assumes complete addition (adding the identity costs the same as any
         * add), which holds for the Weierstrass/Edwards point types used here. The table is left in
         * projective form (no normalizeZ): normalizing this small a table costs more than the
         * mixed-add savings it would buy for a single multiply.
         * @returns real point `p`; `f` duplicates it only to match {@link wnafCachedCT}'s return shape
         * (this path needs no fake accumulator — its op-count is already scalar-independent).
         */
        fixedWindowCT(point, n, bits) {
            const W = FW_WINDOW;
            const size = 1 << W;
            const mask = bitMask(W);
            // Flat table [O, point, 2*point, ..., (size-1)*point].
            const table = new Array(size);
            table[0] = this.ZERO;
            for (let i = 1; i < size; i++)
                table[i] = table[i - 1].add(point);
            // Horner MSB->LSB. windows*W >= bits and n < 2^bits, so every bit of n is consumed.
            const windows = Math.ceil(bits / W);
            let acc = this.ZERO;
            for (let window = windows - 1; window >= 0; window--) {
                // W doublings per window; skipped for the first (topmost) window, where acc is still the
                // identity. The skip is scalar-independent: it depends only on the loop index.
                if (window !== windows - 1)
                    for (let d = 0; d < W; d++)
                        acc = acc.double();
                const digit = Number((n >> BigInt(window * W)) & mask);
                // Data-oblivious select: touch every entry, same as wnafCachedCT.
                let sel = table[0];
                for (let i = 1; i < size; i++)
                    sel = i === digit ? table[i] : sel;
                acc = acc.add(sel); // one add per window, even for digit 0
            }
            return { p: acc, f: acc };
        }
        shouldBlind(point, cofactor) {
            // No usable RNG (probed in the constructor): blinding is impossible, use the plain CT path.
            if (this.randomBytes === undefined)
                return false;
            if (cofactor === _1n$2)
                return true;
            if (point !== this.BASE)
                return false;
            if (this.baseCanBeBlinded === undefined)
                this.baseCanBeBlinded = this.mulUnsafe(this.BASE, this.Point.Fn.ORDER).is0();
            return this.baseCanBeBlinded;
        }
        mulSecret(point, scalar, cofactor, transform) {
            return this.shouldBlind(point, cofactor)
                ? this.mulCTBlinded(point, scalar, transform)
                : this.mulCT(point, scalar, transform);
        }
        mulUnsafe(point, scalar, transform) {
            this.assertPoint(point);
            if (!isPosBig(scalar))
                throw new Error('invalid scalar');
            const W = getWindowSize(point);
            // W === 1 (un-precomputed): one-shot width-4 wNAF via {@link mulAddUnsafe} with L=1 —
            // a cached table would be thrown away after one use. `allowOversized` swaps the
            // `s < Fn.ORDER` check for mulAddUnsafe's `Fn.ORDER^4` DoS cap.
            //
            // Oversized scalar could happen when:
            // a) user passes large scalar on their own (rare)
            // b) `assertValidity()` calls `isTorsionFree()`, which multiplies point by `Fn.ORDER`
            if (W === 1 || scalar >= this.Point.Fn.ORDER)
                return mulAddUnsafe(this.Point, [point], [scalar], true);
            // Precomputed points reuse the CT kernel (fake accumulator discarded): with W=6 only
            // ~1/64 of window-adds are skippable, so a dedicated vartime kernel saved just ~6% on
            // this path while doubling the cached-table code surface.
            const precomputes = this.getWnafPrecomputes(W, point, this.bits, transform);
            return this.wnafCachedCT(precomputes, scalar).p;
        }
        // Remembers the window size used for precomputed wNAF multiplication of the given point
        // and drops any previously built tables. Usually only the base point is precomputed.
        // W=1 resets the point to the un-precomputed (table-less) paths.
        // W is additionally capped so tables stay under ~2 GiB ({@link TABLE_BYTES_MAX}).
        setWindowSize(point, W) {
            this.assertPoint(point);
            validateW(W, this.bits);
            // Size against the widest table this W can produce: the blinded path adds BLIND_BITS.
            const windows = Math.ceil((this.bits + BLIND_BITS) / W) + 1;
            validateTableBytes(windows * 2 ** (W - 1), this.Point.Fp.BYTES);
            pointWindowSizes.set(point, W);
            this.wnafPrecomputes.delete(point);
        }
        // True when a window size is set: tables themselves are built lazily on first multiply.
        hasWindowSize(point) {
            return getWindowSize(point) !== 1;
        }
    }
    /**
     * Combined multi-scalar multiplication `Σ scalars[i]⋅points[i]` via interleaved width-4 wNAF
     * (Strauss–Shamir). Every input gets its own table of odd multiples `[1P, 3P, 5P, 7P]` and
     * signed-digit recoding, but all walks share one doubling chain, so total cost is
     * `~bits` doublings + `L⋅bits/5` additions instead of `L⋅bits` doublings for separate
     * multiplications. Intended for the 2-4 point shapes of signature verification
     * (`R = u1⋅G + u2⋅P`); use {@link pippenger} for larger batches.
     *
     * Not constant-time: only for public inputs. Scalars must satisfy `0 <= s < Fn.ORDER`;
     * fold negative signs into the points before calling.
     * @param c - Point constructor.
     * @param points - Array of curve points.
     * @param scalars - Array of non-negative scalars, same length as points.
     * @param allowOversized - Replace the `s < Fn.ORDER` scalar check with a `Fn.ORDER^4` DoS cap.
     *   Off by default. For scalars that must NOT be reduced mod ORDER: torsion checks
     *   (`Fn.ORDER⋅P ≟ O`) and cofactor-clearing multiples. Walk length grows with `bitLen(s)`.
     * @returns Combined multiplication result; identity for empty input.
     * @throws If the point set or scalar set is invalid. {@link Error}
     * @example
     * Combined multi-scalar multiplication via Strauss–Shamir.
     *
     * ```ts
     * import { mulAddUnsafe } from '@noble/curves/abstract/curve.js';
     * import { p256 } from '@noble/curves/nist.js';
     * const G = p256.Point.BASE;
     * const R = mulAddUnsafe(p256.Point, [G, G.double()], [2n, 3n]); // 2⋅G + 3⋅(2⋅G)
     * ```
     */
    function mulAddUnsafe(c, points, scalars, allowOversized = false) {
        validatePointCons(c);
        validateMSMPoints(points, c);
        abool$1(allowOversized, 'allowOversized');
        // Oversized cap is ORDER^4: hard bound to mitigate DoS, walk length grows with bitLen(s).
        validateMSMScalars(scalars, c.Fn, allowOversized ? c.Fn.ORDER ** _4n$1 : undefined);
        if (points.length !== scalars.length)
            throw new Error('arrays of points and scalars must have equal length');
        const tables = points.map((p) => oddMultiples(p, 4));
        const digits = scalars.map((n) => wnafDigits(n, 4));
        return wnafWalk(c.ZERO, tables, digits);
    }
    function createField(order, field, isLE) {
        if (field) {
            // Reuse supplied field overrides as-is; `isLE` only affects freshly constructed fallback
            // fields, and validateField() below only checks the arithmetic subset, not full byte/cmov
            // behavior.
            if (field.ORDER !== order)
                throw new Error('Field.ORDER must match order: Fp == p, Fn == n');
            validateField(field);
            return field;
        }
        else {
            return Field(order, { isLE });
        }
    }
    /**
     * Validates basic CURVE shape and field membership, then creates fields.
     * This does not prove that the generator is on-curve, that subgroup/order data are consistent, or
     * that the curve equation itself is otherwise sane.
     * @param type - Curve family.
     * @param CURVE - Curve parameters.
     * @param curveOpts - Optional field overrides. See {@link FpFn}:
     *   - `Fp` (optional): Optional base-field override.
     *   - `Fn` (optional): Optional scalar-field override.
     * @param FpFnLE - Whether field encoding is little-endian.
     * @returns Frozen curve parameters and fields.
     * @throws If the curve parameters or field overrides are invalid. {@link Error}
     * @example
     * Build curve fields from raw constants before constructing a curve instance.
     *
     * ```ts
     * const curve = createCurveFields('weierstrass', {
     *   p: 17n,
     *   n: 19n,
     *   h: 1n,
     *   a: 2n,
     *   b: 2n,
     *   Gx: 5n,
     *   Gy: 1n,
     * });
     * ```
     */
    function createCurveFields(type, CURVE, curveOpts = {}, FpFnLE) {
        if (FpFnLE === undefined)
            FpFnLE = type === 'edwards';
        if (!CURVE || typeof CURVE !== 'object')
            throw new Error(`expected valid ${type} CURVE object`);
        // Validate before reading Fp/Fn so explicit null fails with an options-object error.
        validateObject(curveOpts);
        for (const p of ['p', 'n', 'h']) {
            const val = CURVE[p];
            if (!(isPosBig(val) && val !== _0n$3))
                throw new Error(`CURVE.${p} must be positive bigint`);
        }
        const Fp = createField(CURVE.p, curveOpts.Fp, FpFnLE);
        const Fn = createField(CURVE.n, curveOpts.Fn, FpFnLE);
        const _b = 'b' ;
        const params = ['Gx', 'Gy', 'a', _b];
        for (const p of params) {
            // @ts-ignore
            if (!Fp.isValid(CURVE[p]))
                throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
        }
        CURVE = Object.freeze(Object.assign({}, CURVE));
        return { CURVE, Fp, Fn };
    }
    /**
     * @param randomSecretKey - Secret-key generator.
     * @param getPublicKey - Public-key derivation helper.
     * @returns Keypair generator.
     * @example
     * Build a `keygen()` helper from existing secret-key and public-key primitives.
     *
     * ```ts
     * import { createKeygen } from '@noble/curves/abstract/curve.js';
     * import { p256 } from '@noble/curves/nist.js';
     * const keygen = createKeygen(p256.utils.randomSecretKey, p256.getPublicKey);
     * const pair = keygen();
     * ```
     */
    function createKeygen(randomSecretKey, getPublicKey) {
        return function keygen(seed) {
            const secretKey = randomSecretKey(seed);
            return { secretKey, publicKey: getPublicKey(secretKey) };
        };
    }

    /**
     * ASN.1 DER (Distinguished Encoding Rules) helpers for ECDSA signatures.
     * Only implements the tiny subset needed for `SEQUENCE(INTEGER r, INTEGER s)`.
     * @module
     */
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    const _0n$2 = /* @__PURE__ */ BigInt(0);
    /**
     * @param m - Error message.
     * @example
     * Throw a DER-specific error when signature parsing encounters invalid bytes.
     *
     * ```ts
     * new DERErr('bad der');
     * ```
     */
    class DERErr extends Error {
        constructor(m = '') {
            super(m);
        }
    }
    // Plain const so the freezes can live inside the pure initializer of the `DER` export below:
    // bare top-level `Object.freeze(...)` calls would defeat tree-shaking for every importer.
    const _DER = {
        // asn.1 DER encoding utils
        Err: DERErr,
        // Basic building block is TLV (Tag-Length-Value)
        _tlv: {
            encode: (tag, data) => {
                const { Err: E } = _DER;
                asafenumber(tag, 'tag');
                if (tag < 0 || tag > 255)
                    throw new E('tlv.encode: wrong tag');
                astring(data, 'data');
                // Internal helper: callers hand this already-validated hex payload, so we only enforce
                // byte alignment here instead of re-validating every nibble.
                if (data.length & 1)
                    throw new E('tlv.encode: unpadded data');
                const dataLen = data.length / 2;
                const len = numberToHexUnpadded(dataLen);
                if ((len.length / 2) & 0b1000_0000)
                    throw new E('tlv.encode: long form length too big');
                // length of length with long form flag
                const lenLen = dataLen > 127 ? numberToHexUnpadded((len.length / 2) | 0b1000_0000) : '';
                const t = numberToHexUnpadded(tag);
                return t + lenLen + len + data;
            },
            // v - value, l - left bytes (unparsed)
            decode(tag, data) {
                const { Err: E } = _DER;
                data = abytes$1(data, undefined, 'DER data');
                let pos = 0;
                if (tag < 0 || tag > 255)
                    throw new E('tlv.decode: wrong tag');
                if (data.length < 2 || data[pos++] !== tag)
                    throw new E('tlv.decode: wrong tlv');
                const first = data[pos++];
                // First bit of first length byte is the short/long form flag.
                const isLong = !!(first & 0b1000_0000);
                let length = 0;
                if (!isLong)
                    length = first;
                else {
                    // Long form: [longFlag(1bit), lengthLength(7bit), length (BE)]
                    const lenLen = first & 0b0111_1111;
                    if (!lenLen)
                        throw new E('tlv.decode(long): indefinite length not supported');
                    // This would overflow u32 in JS.
                    if (lenLen > 4)
                        throw new E('tlv.decode(long): byte length is too big');
                    const lengthBytes = data.subarray(pos, pos + lenLen);
                    if (lengthBytes.length !== lenLen)
                        throw new E('tlv.decode: length bytes not complete');
                    if (lengthBytes[0] === 0)
                        throw new E('tlv.decode(long): zero leftmost byte');
                    for (const b of lengthBytes)
                        length = (length << 8) | b;
                    pos += lenLen;
                    if (length < 128)
                        throw new E('tlv.decode(long): not minimal encoding');
                }
                const v = data.subarray(pos, pos + length);
                if (v.length !== length)
                    throw new E('tlv.decode: wrong value length');
                return { v, l: data.subarray(pos + length) };
            },
        },
        // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
        // since we always use positive integers here. It must always be empty:
        // - add zero byte if exists
        // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
        _int: {
            encode(num) {
                const { Err: E } = _DER;
                abignumber(num);
                if (num < _0n$2)
                    throw new E('integer: negative integers are not allowed');
                let hex = numberToHexUnpadded(num);
                // Pad with zero byte if negative flag is present
                if (Number.parseInt(hex[0], 16) & 0b1000)
                    hex = '00' + hex;
                if (hex.length & 1)
                    throw new E('unexpected DER parsing assertion: unpadded hex');
                return hex;
            },
            decode(data) {
                const { Err: E } = _DER;
                if (data.length < 1)
                    throw new E('invalid signature integer: empty');
                if (data[0] & 0b1000_0000)
                    throw new E('invalid signature integer: negative');
                // Single-byte zero `00` is the canonical DER INTEGER encoding for zero.
                if (data.length > 1 && data[0] === 0x00 && !(data[1] & 0b1000_0000))
                    throw new E('invalid signature integer: unnecessary leading zero');
                return bytesToNumberBE(data);
            },
        },
        toSig(bytes, maxScalarBytes) {
            // parse DER signature
            const { Err: E, _int: int, _tlv: tlv } = _DER;
            if (maxScalarBytes !== undefined) {
                asafenumber(maxScalarBytes, 'maxScalarBytes');
                if (maxScalarBytes < 1)
                    throw new E('invalid signature: maxScalarBytes must be positive');
            }
            const data = abytes$1(bytes, undefined, 'signature');
            const { v: seqBytes, l: seqLeftBytes } = tlv.decode(0x30, data);
            if (seqLeftBytes.length)
                throw new E('invalid signature: left bytes after parsing');
            const { v: rBytes, l: rLeftBytes } = tlv.decode(0x02, seqBytes);
            const { v: sBytes, l: sLeftBytes } = tlv.decode(0x02, rLeftBytes);
            if (sLeftBytes.length)
                throw new E('invalid signature: left bytes after parsing');
            // Enforce curve-provided bounds before bytes-to-hex-to-BigInt conversion can amplify memory.
            if (maxScalarBytes !== undefined &&
                (rBytes.length > maxScalarBytes || sBytes.length > maxScalarBytes))
                throw new E('invalid signature: integer too large');
            return { r: int.decode(rBytes), s: int.decode(sBytes) };
        },
        hexFromSig(sig) {
            const { _tlv: tlv, _int: int } = _DER;
            validateObject(sig, { r: 'bigint', s: 'bigint' }, {}, 'sig');
            const rs = tlv.encode(0x02, int.encode(sig.r));
            const ss = tlv.encode(0x02, int.encode(sig.s));
            const seq = rs + ss;
            return tlv.encode(0x30, seq);
        },
    };
    /**
     * ASN.1 DER encoding utilities. ASN is very complex & fragile. Format:
     *
     *     [0x30 (SEQUENCE), bytelength, 0x02 (INTEGER), intLength, R, 0x02 (INTEGER), intLength, S]
     *
     * Docs: {@link https://letsencrypt.org/docs/a-warm-welcome-to-asn1-and-der/ | Let's Encrypt ASN.1 guide} and
     * {@link https://luca.ntop.org/Teaching/Appunti/asn1.html | Luca Deri's ASN.1 notes}.
     * @example
     * ASN.1 DER encoding utilities.
     *
     * ```ts
     * const der = DER.hexFromSig({ r: 1n, s: 2n });
     * ```
     */
    const DER = /* @__PURE__ */ (() => {
        Object.freeze(_DER._tlv);
        Object.freeze(_DER._int);
        return Object.freeze(_DER);
    })();

    /**
     * Short Weierstrass curve methods. The formula is: y² = x³ + ax + b.
     *
     * ### Design rationale for types
     *
     * * Interaction between classes from different curves should fail:
     *   `k256.Point.BASE.add(p256.Point.BASE)`
     * * For this purpose we want to use `instanceof` operator, which is fast and works during runtime
     * * Different calls of `curve()` would return different classes -
     *   `curve(params) !== curve(params)`: if somebody decided to monkey-patch their curve,
     *   it won't affect others
     *
     * TypeScript can't infer types for classes created inside a function. Classes is one instance
     * of nominative types in TypeScript and interfaces only check for shape, so it's hard to create
     * unique type for every function call.
     *
     * We can use generic types via some param, like curve opts, but that would:
     *     1. Enable interaction between `curve(params)` and `curve(params)` (curves of same params)
     *     which is hard to debug.
     *     2. Params can be generic and we can't enforce them to be constant value:
     *     if somebody creates curve from non-constant params,
     *     it would be allowed to interact with other curves with non-constant params
     *
     * @todo https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-7.html#unique-symbol
     * @module
     */
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    // We construct the basis so `den` is always positive and equals `n`,
    // but the `num` sign depends on the basis, not on the secret value.
    // Exact half-way cases round away from zero, which keeps the split symmetric
    // around the reduced-basis boundaries used by endomorphism decomposition.
    const divNearest = (num, den) => (num + (num >= 0 ? den : -den) / _2n$2) / den;
    /** Splits scalar for GLV endomorphism. */
    function _splitEndoScalar(k, basis, n) {
        // Split scalar into two such that part is ~half bits: `abs(part) < sqrt(N)`
        // Since part can be negative, we need to do this on point.
        // Callers must provide a reduced GLV basis whose vectors satisfy
        // `a + b * lambda ≡ 0 (mod n)`; this helper only sees the basis and `n`.
        // Reject unreduced scalars instead of silently treating them mod n.
        aInRange('scalar', k, _0n$1, n);
        // TODO: verifyScalar function which consumes lambda
        const [[a1, b1], [a2, b2]] = basis;
        const c1 = divNearest(b2 * k, n);
        const c2 = divNearest(-b1 * k, n);
        // |k1|/|k2| is < sqrt(N), but can be negative.
        // If we do `k1 mod N`, we'll get big scalar (`> sqrt(N)`): so, we do cheaper negation instead.
        let k1 = k - c1 * a1 - c2 * a2;
        let k2 = -c1 * b1 - c2 * b2;
        const k1neg = k1 < _0n$1;
        const k2neg = k2 < _0n$1;
        if (k1neg)
            k1 = -k1;
        if (k2neg)
            k2 = -k2;
        // Double check that resulting scalar is less than half bits of N: the wNAF pair walk
        // relies on the halves being short. This should only happen on wrong bases.
        // Also, the math inside is complex enough that this guard is worth keeping.
        const MAX_NUM = bitMask(Math.ceil(bitLen(n) / 2)) + _1n$1; // Half bits of N
        if (k1 < _0n$1 || k1 >= MAX_NUM || k2 < _0n$1 || k2 >= MAX_NUM) {
            throw new Error('splitScalar (endomorphism): failed for k');
        }
        return { k1neg, k1, k2neg, k2 };
    }
    function validateSigFormat(format) {
        if (!['compact', 'recovered', 'der'].includes(format))
            throw new Error('Signature format must be "compact", "recovered", or "der"');
        return format;
    }
    function validateSigOpts$1(opts, def) {
        validateObject(opts);
        const optsn = {};
        // Normalize only the declared option subset from `def`; unknown keys are
        // intentionally ignored so shared / superset option bags stay valid here too.
        // `extraEntropy` stays an opaque payload until the signing path consumes it.
        for (let optName of Object.keys(def)) {
            // @ts-ignore
            optsn[optName] = opts[optName] === undefined ? def[optName] : opts[optName];
        }
        abool$1(optsn.lowS, 'lowS');
        abool$1(optsn.prehash, 'prehash');
        if (optsn.format !== undefined)
            validateSigFormat(optsn.format);
        return optsn;
    }
    // Be friendly to bad ECMAScript parsers by not using bigint literals
    // prettier-ignore
    const _0n$1 = /* @__PURE__ */ BigInt(0), _1n$1 = /* @__PURE__ */ BigInt(1), _2n$2 = /* @__PURE__ */ BigInt(2), _3n = /* @__PURE__ */ BigInt(3), _4n = /* @__PURE__ */ BigInt(4);
    /**
     * Creates weierstrass Point constructor, based on specified curve options.
     *
     * See {@link WeierstrassOpts}.
     * @param params - Curve parameters. See {@link WeierstrassOpts}.
     * @param extraOpts - Optional helpers and overrides. See {@link WeierstrassExtraOpts}.
     * @returns Weierstrass point constructor.
     * @throws If the curve parameters, overrides, or point codecs are invalid. {@link Error}
     *
     * @example
     * Construct a point type from explicit Weierstrass curve parameters.
     *
     * ```js
     * const opts = {
     *   p: 0xfffffffffffffffffffffffffffffffeffffac73n,
     *   n: 0x100000000000000000001b8fa16dfab9aca16b6b3n,
     *   h: 1n,
     *   a: 0n,
     *   b: 7n,
     *   Gx: 0x3b4c382ce37aa192a4019e763036f4f5dd4d7ebbn,
     *   Gy: 0x938cf935318fdced6bc28286531733c3f03c4feen,
     * };
     * const secp160k1_Point = weierstrass(opts);
     * ```
     */
    function weierstrass(params, extraOpts = {}) {
        const validated = createCurveFields('weierstrass', params, extraOpts);
        const Fp = validated.Fp;
        const Fn = validated.Fn;
        let CURVE = validated.CURVE;
        const { h: cofactor, n: CURVE_ORDER } = CURVE;
        validateObject(extraOpts, {}, {
            allowInfinityPoint: 'boolean',
            clearCofactor: 'function',
            isTorsionFree: 'function',
            fromBytes: 'function',
            toBytes: 'function',
            endo: 'object',
            randomBytes: 'function',
        });
        // Snapshot every hook and take an owned copy of nested GLV configuration. Later mutations of
        // the caller's options must not change arithmetic, subgroup, or codec policy.
        const { endo: endoOpts, allowInfinityPoint, clearCofactor, isTorsionFree, fromBytes, toBytes, } = extraOpts;
        const randomBytes = extraOpts.randomBytes === undefined ? randomBytes$2 : extraOpts.randomBytes;
        if (endoOpts) {
            if (!Fp.is0(CURVE.a) || typeof endoOpts.beta !== 'bigint' || !Array.isArray(endoOpts.basises)) {
                throw new Error('invalid endo: expected "beta": bigint and "basises": array');
            }
        }
        const endo = endoOpts
            ? {
                beta: endoOpts.beta,
                basises: endoOpts.basises.map((basis) => [...basis]),
            }
            : undefined;
        const lengths = getWLengths(Fp, Fn);
        function assertCompressionIsSupported() {
            if (!Fp.isOdd)
                throw new Error('compression is not supported: Field does not have .isOdd()');
        }
        // Implements IEEE P1363 point encoding
        function pointToBytes(_c, point, isCompressed) {
            // Handle infinity before toAffine(), which maps ZERO to (0, 0) silently: without this the
            // encoder would emit an all-zero byte string that decodes back as a different point. Only
            // curves that opt into infinity as a public point value get the SEC 1 byte form.
            if (point.is0()) {
                if (!allowInfinityPoint)
                    throw new Error('bad point: ZERO');
                return Uint8Array.of(0); // SEC 1 v2.0 §2.3.3
            }
            const { x, y } = point.toAffine();
            const bx = Fp.toBytes(x);
            abool$1(isCompressed, 'isCompressed');
            if (isCompressed) {
                assertCompressionIsSupported();
                const hasEvenY = !Fp.isOdd(y);
                return concatBytes$1(pprefix(hasEvenY), bx);
            }
            else {
                return concatBytes$1(Uint8Array.of(0x04), bx, Fp.toBytes(y));
            }
        }
        function pointFromBytes(bytes) {
            abytes$1(bytes, undefined, 'Point');
            const { publicKey: comp, publicKeyUncompressed: uncomp } = lengths; // e.g. for 32-byte: 33, 65
            const length = bytes.length;
            const head = bytes[0];
            const tail = bytes.subarray(1);
            // SEC 1 v2.0 §2.3.4 decodes 0x00 as infinity, but §3.2.2 rejects infinity as a public key.
            // Leaving 0x00 undecodable by default makes that rejection structural rather than a check:
            // callers reuse this parser as the strict key boundary, and infinity is simply not
            // expressible. Curves where infinity is a real wire value opt into the codec instead.
            // secp256k1 crosstests show OpenSSL raw point codecs accept 0x00 too.
            if (allowInfinityPoint && length === 1 && head === 0x00)
                return { x: Fp.ZERO, y: Fp.ZERO };
            // No actual validation is done here: use .assertValidity()
            if (length === comp && (head === 0x02 || head === 0x03)) {
                const x = Fp.fromBytes(tail);
                if (!Fp.isValid(x))
                    throw new Error('bad point: is not on curve, wrong x');
                const y2 = weierstrassEquation(x); // y² = x³ + ax + b
                let y;
                try {
                    y = Fp.sqrt(y2); // y = y² ^ (p+1)/4
                }
                catch (sqrtError) {
                    const err = sqrtError instanceof Error ? ': ' + sqrtError.message : '';
                    throw new Error('bad point: is not on curve, sqrt error' + err);
                }
                assertCompressionIsSupported();
                const evenY = Fp.isOdd(y);
                const evenH = (head & 1) === 1; // ECDSA-specific
                if (evenH !== evenY)
                    y = Fp.neg(y);
                return { x, y };
            }
            else if (length === uncomp && head === 0x04) {
                // TODO: more checks
                const L = Fp.BYTES;
                const x = Fp.fromBytes(tail.subarray(0, L));
                const y = Fp.fromBytes(tail.subarray(L, L * 2));
                if (!isValidXY(x, y))
                    throw new Error('bad point: is not on curve');
                return { x, y };
            }
            else {
                throw new Error(`bad point: got length ${length}, expected compressed=${comp} or uncompressed=${uncomp}`);
            }
        }
        const encodePoint = toBytes === undefined ? pointToBytes : toBytes;
        const decodePoint = fromBytes === undefined ? pointFromBytes : fromBytes;
        // Hoisted from double() / add(): curve params never change after construction.
        // Koblitz curves (a=0, e.g. secp256k1) skip the three a-multiplications per operation;
        // the selection depends only on public curve constants.
        const b3 = Fp.mul(CURVE.b, _3n);
        const mulA = Fp.is0(CURVE.a) ? (_) => Fp.ZERO : (x) => Fp.mul(CURVE.a, x);
        function weierstrassEquation(x) {
            const x2 = Fp.sqr(x);
            const x3 = Fp.mul(x2, x);
            return Fp.add(Fp.add(x3, Fp.mul(x, CURVE.a)), CURVE.b); // x³ + a * x + b
        }
        // TODO: move top-level
        /** Checks whether equation holds for given x, y: y² == x³ + ax + b */
        function isValidXY(x, y) {
            const left = Fp.sqr(y);
            const right = weierstrassEquation(x); // x³ + ax + b
            return Fp.eql(left, right);
        }
        // Keep constructor-time generator validation cheap: callers are responsible for supplying the
        // correct prime-order base point, while eager subgroup checks here would slow heavy module imports.
        // Test 1: equation y² = x³ + ax + b should work for generator point.
        if (!isValidXY(CURVE.Gx, CURVE.Gy))
            throw new Error('bad curve params: generator point');
        // Test 2: discriminant Δ part should be non-zero: 4a³ + 27b² != 0.
        // Guarantees curve is genus-1, smooth (non-singular).
        const _4a3 = Fp.mul(Fp.pow(CURVE.a, _3n), _4n);
        const _27b2 = Fp.mul(Fp.sqr(CURVE.b), BigInt(27));
        if (Fp.is0(Fp.add(_4a3, _27b2)))
            throw new Error('bad curve params: a or b');
        /** Asserts coordinate is valid: 0 <= n < Fp.ORDER. */
        function acoord(title, n, banZero = false) {
            if (!Fp.isValid(n) || (banZero && Fp.is0(n)))
                throw new Error(`bad point coordinate ${title}`);
            // Extension-field elements are objects. Keep point coordinates detached from caller-owned
            // objects so their mutation cannot invalidate cached on-curve / subgroup checks. Primitive
            // field elements (bigints in shipped prime fields) are already immutable values.
            return typeof n === 'object' && n !== null ? Fp.create(n) : n;
        }
        function aprjpoint(other) {
            if (!(other instanceof Point))
                throw new Error('Weierstrass Point expected');
        }
        function splitEndoScalarN(k) {
            if (!endo || !endo.basises)
                throw new Error('no endo');
            return _splitEndoScalar(k, endo.basises, Fn.ORDER);
        }
        /**
         * Appends a (point, scalar) pair to the inputs of a vartime wNAF walk
         * ({@link mulAddUnsafe}). With GLV endomorphism the scalar is split into two half-width
         * pairs against P and ψ(P) = (β⋅x, y), halving the walk's shared doubling chain;
         * split signs fold into the points.
         */
        function pushWnafPair(points, scalars, p, k) {
            if (!Fn.isValid(k))
                throw new RangeError('invalid scalar: out of range'); // 0 is valid
            if (endo) {
                const { k1neg, k1, k2neg, k2 } = splitEndoScalarN(k);
                const psi = new Point(Fp.mul(p.X, endo.beta), p.Y, p.Z);
                points.push(k1neg ? p.negate() : p, k2neg ? psi.negate() : psi);
                scalars.push(k1, k2);
            }
            else {
                points.push(p);
                scalars.push(k);
            }
        }
        // Successful assertValidity() results are cached: Point instances are frozen at construction,
        // so on-curve + subgroup facts cannot change afterwards. Only success is cached — invalid
        // points re-throw on every call. This matters most for pairing curves, where subgroup checks
        // cost a scalar multiplication and the same instance is re-validated across layers
        // (signature fromBytes, pairingBatch) or across repeated verifies with a cached public key.
        const validityCache = new WeakSet();
        /**
         * Projective Point works in 3d / projective (homogeneous) coordinates:(X, Y, Z) ∋ (x=X/Z, y=Y/Z).
         * Default Point works in 2d / affine coordinates: (x, y).
         * We're doing calculations in projective, because its operations don't require costly inversion.
         */
        class Point {
            static BASE = new Point(CURVE.Gx, CURVE.Gy, Fp.ONE);
            static ZERO = new Point(Fp.ZERO, Fp.ONE, Fp.ZERO);
            static Fp = Fp;
            static Fn = Fn;
            X;
            Y;
            Z;
            /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
            constructor(X, Y, Z) {
                this.X = acoord('x', X);
                // This is not just about ZERO / infinity: ambient curves can have real
                // finite points with y=0. Those points are 2-torsion, so they cannot lie
                // in the odd prime-order subgroups this point type is meant to represent.
                this.Y = acoord('y', Y, true);
                this.Z = acoord('z', Z);
                Object.freeze(this);
            }
            static CURVE() {
                return CURVE;
            }
            /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
            static fromAffine(p) {
                const { x, y } = p || {};
                if (!p || !Fp.isValid(x) || !Fp.isValid(y))
                    throw new Error('invalid affine point');
                if (p instanceof Point)
                    throw new Error('projective point not allowed');
                // (0, 0) would've produced (0, 0, 1) - instead, we need (0, 1, 0)
                if (Fp.is0(x) && Fp.is0(y))
                    return Point.ZERO;
                return new Point(x, y, Fp.ONE);
            }
            static fromBytes(bytes) {
                const P = Point.fromAffine(decodePoint(abytes$1(bytes, undefined, 'point')));
                P.assertValidity();
                return P;
            }
            static fromHex(hex) {
                return Point.fromBytes(hexToBytes(hex));
            }
            get x() {
                return this.toAffine().x;
            }
            get y() {
                return this.toAffine().y;
            }
            /**
             * @param isLazy - true will defer table computation until the first multiplication
             */
            precompute(windowSize = 6, isLazy = true) {
                wnaf.setWindowSize(this, windowSize);
                if (!isLazy)
                    this.multiply(_3n); // random number
                return this;
            }
            // TODO: return `this`
            /** A point on curve is valid if it conforms to equation. */
            assertValidity() {
                const p = this;
                if (p.is0()) {
                    // (0, 1, 0) aka ZERO is invalid in most contexts.
                    // In BLS, ZERO can be serialized, so we allow it.
                    // Keep the accepted infinity encoding canonical: projective-equivalent (X, Y, 0) points
                    // like (1, 1, 0) compare equal to ZERO, but only (0, 1, 0) should pass this guard.
                    if (allowInfinityPoint && Fp.is0(p.X) && Fp.eql(p.Y, Fp.ONE) && Fp.is0(p.Z))
                        return;
                    throw new Error('bad point: ZERO');
                }
                if (validityCache.has(p))
                    return;
                // Some 3rd-party test vectors require different wording between here & `fromCompressedHex`
                const { x, y } = p.toAffine();
                if (!Fp.isValid(x) || !Fp.isValid(y))
                    throw new Error('bad point: x or y not field elements');
                if (!isValidXY(x, y))
                    throw new Error('bad point: equation left != right');
                if (!p.isTorsionFree())
                    throw new Error('bad point: not in prime-order subgroup');
                validityCache.add(p);
            }
            hasEvenY() {
                const { y } = this.toAffine();
                if (!Fp.isOdd)
                    throw new Error("Field doesn't support isOdd");
                return !Fp.isOdd(y);
            }
            /** Compare one point to another. */
            equals(other) {
                aprjpoint(other);
                const { X: X1, Y: Y1, Z: Z1 } = this;
                const { X: X2, Y: Y2, Z: Z2 } = other;
                const U1 = Fp.eql(Fp.mul(X1, Z2), Fp.mul(X2, Z1));
                const U2 = Fp.eql(Fp.mul(Y1, Z2), Fp.mul(Y2, Z1));
                return U1 && U2;
            }
            /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
            negate() {
                return new Point(this.X, Fp.neg(this.Y), this.Z);
            }
            // Renes-Costello-Batina exception-free doubling formula.
            // There is 30% faster Jacobian formula, but it is not complete.
            // https://eprint.iacr.org/2015/1060, algorithm 3
            // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
            double() {
                const { X: X1, Y: Y1, Z: Z1 } = this;
                let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO; // prettier-ignore
                let t0 = Fp.mul(X1, X1); // step 1
                let t1 = Fp.mul(Y1, Y1);
                let t2 = Fp.mul(Z1, Z1);
                let t3 = Fp.mul(X1, Y1);
                t3 = Fp.add(t3, t3); // step 5
                Z3 = Fp.mul(X1, Z1);
                Z3 = Fp.add(Z3, Z3);
                X3 = mulA(Z3);
                Y3 = Fp.mul(b3, t2);
                Y3 = Fp.add(X3, Y3); // step 10
                X3 = Fp.sub(t1, Y3);
                Y3 = Fp.add(t1, Y3);
                Y3 = Fp.mul(X3, Y3);
                X3 = Fp.mul(t3, X3);
                Z3 = Fp.mul(b3, Z3); // step 15
                t2 = mulA(t2);
                t3 = Fp.sub(t0, t2);
                t3 = mulA(t3);
                t3 = Fp.add(t3, Z3);
                Z3 = Fp.add(t0, t0); // step 20
                t0 = Fp.add(Z3, t0);
                t0 = Fp.add(t0, t2);
                t0 = Fp.mul(t0, t3);
                Y3 = Fp.add(Y3, t0);
                t2 = Fp.mul(Y1, Z1); // step 25
                t2 = Fp.add(t2, t2);
                t0 = Fp.mul(t2, t3);
                X3 = Fp.sub(X3, t0);
                Z3 = Fp.mul(t2, t1);
                Z3 = Fp.add(Z3, Z3); // step 30
                Z3 = Fp.add(Z3, Z3);
                return new Point(X3, Y3, Z3);
            }
            // Renes-Costello-Batina exception-free addition formula.
            // There is 30% faster Jacobian formula, but it is not complete.
            // https://eprint.iacr.org/2015/1060, algorithm 1
            // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
            add(other) {
                aprjpoint(other);
                const { X: X1, Y: Y1, Z: Z1 } = this;
                const { X: X2, Y: Y2, Z: Z2 } = other;
                let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO; // prettier-ignore
                let t0 = Fp.mul(X1, X2); // step 1
                let t1 = Fp.mul(Y1, Y2);
                let t2 = Fp.mul(Z1, Z2);
                let t3 = Fp.add(X1, Y1);
                let t4 = Fp.add(X2, Y2); // step 5
                t3 = Fp.mul(t3, t4);
                t4 = Fp.add(t0, t1);
                t3 = Fp.sub(t3, t4);
                t4 = Fp.add(X1, Z1);
                let t5 = Fp.add(X2, Z2); // step 10
                t4 = Fp.mul(t4, t5);
                t5 = Fp.add(t0, t2);
                t4 = Fp.sub(t4, t5);
                t5 = Fp.add(Y1, Z1);
                X3 = Fp.add(Y2, Z2); // step 15
                t5 = Fp.mul(t5, X3);
                X3 = Fp.add(t1, t2);
                t5 = Fp.sub(t5, X3);
                Z3 = mulA(t4);
                X3 = Fp.mul(b3, t2); // step 20
                Z3 = Fp.add(X3, Z3);
                X3 = Fp.sub(t1, Z3);
                Z3 = Fp.add(t1, Z3);
                Y3 = Fp.mul(X3, Z3);
                t1 = Fp.add(t0, t0); // step 25
                t1 = Fp.add(t1, t0);
                t2 = mulA(t2);
                t4 = Fp.mul(b3, t4);
                t1 = Fp.add(t1, t2);
                t2 = Fp.sub(t0, t2); // step 30
                t2 = mulA(t2);
                t4 = Fp.add(t4, t2);
                t0 = Fp.mul(t1, t4);
                Y3 = Fp.add(Y3, t0);
                t0 = Fp.mul(t5, t4); // step 35
                X3 = Fp.mul(t3, X3);
                X3 = Fp.sub(X3, t0);
                t0 = Fp.mul(t3, t1);
                Z3 = Fp.mul(t5, Z3);
                Z3 = Fp.add(Z3, t0); // step 40
                return new Point(X3, Y3, Z3);
            }
            subtract(other) {
                // Validate before calling `negate()` so wrong inputs fail with the point guard
                // instead of leaking a foreign `negate()` error.
                aprjpoint(other);
                return this.add(other.negate());
            }
            is0() {
                return this.equals(Point.ZERO);
            }
            /**
             * Constant time multiplication.
             * Uses precomputed tables (signed fixed-window wNAF) when available.
             * Uses scalar blinding and avoids endomorphism splitting in the secret-scalar path.
             * @param scalar - by which the point would be multiplied
             * @returns New point
             */
            multiply(scalar) {
                // Keep the subgroup-scalar contract strict instead of reducing 0 / n to ZERO.
                // In key/signature-style callers, those values usually mean broken hash/scalar plumbing,
                // and failing closed is safer than silently producing the identity point.
                if (!Fn.isValidNot0(scalar))
                    throw new RangeError('invalid scalar: out of range'); // 0 is invalid
                const { p, f } = wnaf.mulSecret(this, scalar, cofactor, normalize);
                return normalize([p, f])[0];
            }
            /**
             * Non-constant-time multiplication. Uses width-4 wNAF with GLV endomorphism splitting
             * when available (two half-width scalars sharing one halved doubling chain).
             * It's faster, but should only be used when you don't care about
             * an exposed secret key e.g. sig verification, which works over *public* keys.
             */
            multiplyUnsafe(scalar) {
                const p = this;
                const sc = scalar;
                // Public-scalar callers may need 0, but n and larger values stay rejected here too.
                // Reducing them mod n would turn bad caller input into an accidental identity point.
                if (!Fn.isValid(sc))
                    throw new RangeError('invalid scalar: out of range'); // 0 is valid
                if (sc === _0n$1 || p.is0())
                    return Point.ZERO;
                if (sc === _1n$1)
                    return p;
                if (wnaf.hasWindowSize(this))
                    return wnaf.mulUnsafe(p, sc, normalize); // precomputes
                const points = [];
                const scalars = [];
                pushWnafPair(points, scalars, p, sc);
                return mulAddUnsafe(Point, points, scalars);
            }
            /**
             * Non-constant-time double-scalar multiplication `a⋅this + b⋅other` (Strauss–Shamir).
             * Both walks share one doubling chain via {@link mulAddUnsafe}, and GLV endomorphism
             * (when available) halves the chain again by splitting each scalar into two half-width
             * parts. Used by ECDSA verification and public-key recovery for `R = u1⋅G + u2⋅P`.
             * Only for public scalars.
             */
            mulAddUnsafe(a, other, b) {
                aprjpoint(other);
                const points = [];
                const scalars = [];
                pushWnafPair(points, scalars, this, a);
                pushWnafPair(points, scalars, other, b);
                return mulAddUnsafe(Point, points, scalars);
            }
            /**
             * Converts Projective point to affine (x, y) coordinates.
             * (X, Y, Z) ∋ (x=X/Z, y=Y/Z).
             * @param invertedZ - Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
             */
            toAffine(invertedZ) {
                const p = this;
                let iz = invertedZ;
                if (iz != null && !Fp.isValid(iz))
                    throw new RangeError('"invertedZ" expected valid field element');
                const { X, Y, Z } = p;
                // Fast-path for normalized points
                if (Fp.eql(Z, Fp.ONE))
                    return { x: X, y: Y };
                const is0 = p.is0();
                // If invZ was 0, we return zero point. However we still want to execute
                // all operations, so we replace invZ with a random number, 1.
                if (iz == null)
                    iz = is0 ? Fp.ONE : Fp.inv(Z);
                const x = Fp.mul(X, iz);
                const y = Fp.mul(Y, iz);
                const zz = Fp.mul(Z, iz);
                if (is0)
                    return { x: Fp.ZERO, y: Fp.ZERO };
                if (!Fp.eql(zz, Fp.ONE))
                    throw new Error('invZ was invalid');
                return { x, y };
            }
            /**
             * Checks whether Point is free of torsion elements (is in prime subgroup).
             * Always torsion-free for cofactor=1 curves.
             */
            isTorsionFree() {
                if (cofactor === _1n$1)
                    return true;
                if (isTorsionFree)
                    return isTorsionFree(Point, this);
                // unsafe() will use the uncached wNAF path internally, since CURVE_ORDER >= Fn.ORDER
                return wnaf.mulUnsafe(this, CURVE_ORDER).is0();
            }
            clearCofactor() {
                if (cofactor === _1n$1)
                    return this; // Fast-path
                if (clearCofactor)
                    return clearCofactor(Point, this);
                // Default fallback assumes the cofactor fits the usual subgroup-scalar
                // multiplyUnsafe() contract. Curves with larger / structured cofactors
                // should define a clearCofactor override anyway (e.g. psi/Frobenius maps).
                return this.multiplyUnsafe(cofactor);
            }
            isSmallOrder() {
                if (cofactor === _1n$1)
                    return this.is0(); // Fast-path
                return this.clearCofactor().is0();
            }
            toBytes(isCompressed = true) {
                abool$1(isCompressed, 'isCompressed');
                // assertValidity() covers on-curve and subgroup membership. The encoder below repeats the
                // infinity check rather than relying on this call, so it stays correct for any caller.
                this.assertValidity();
                return encodePoint(Point, this, isCompressed);
            }
            toHex(isCompressed = true) {
                return bytesToHex(this.toBytes(isCompressed));
            }
            toString() {
                return `<Point ${this.is0() ? 'ZERO' : this.toHex()}>`;
            }
        }
        const normalize = (points) => normalizeZ(Point, points);
        const wnaf = new ScalarMultiplier(Point, randomBytes);
        // Enable W=6 wNAF precomputes. Slows down first publicKey computation.
        // Disable for tiny toy curves, with scalar fields < 6 bits.
        if (wnaf.bits >= 6)
            Point.BASE.precompute(6);
        Object.freeze(Point.prototype);
        Object.freeze(Point);
        return Point;
    }
    // Points start with byte 0x02 when y is even; otherwise 0x03
    function pprefix(hasEvenY) {
        return Uint8Array.of(hasEvenY ? 0x02 : 0x03);
    }
    function getWLengths(Fp, Fn) {
        return {
            secretKey: Fn.BYTES,
            publicKey: 1 + Fp.BYTES,
            publicKeyUncompressed: 1 + 2 * Fp.BYTES,
            publicKeyHasPrefix: true,
            // Raw compact `(r || s)` signature width; DER and recovered signatures use
            // different lengths outside this helper.
            signature: 2 * Fn.BYTES,
        };
    }
    /**
     * Sometimes users only need getPublicKey, getSharedSecret, and secret key handling.
     * This helper ensures no signature functionality is present. Less code, smaller bundle size.
     * @param Point - Weierstrass point constructor.
     * @param ecdhOpts - Optional randomness helpers:
     *   - `randomBytes` (optional): Optional RNG override.
     * @returns ECDH helper namespace.
     * @example
     * Sometimes users only need getPublicKey, getSharedSecret, and secret key handling.
     *
     * ```ts
     * import { ecdh } from '@noble/curves/abstract/weierstrass.js';
     * import { p256 } from '@noble/curves/nist.js';
     * const dh = ecdh(p256.Point);
     * const alice = dh.keygen();
     * const shared = dh.getSharedSecret(alice.secretKey, alice.publicKey);
     * ```
     */
    function ecdh(Point, ecdhOpts = {}) {
        validatePointCons(Point);
        const { Fn } = Point;
        const randomBytes_ = ecdhOpts.randomBytes === undefined ? randomBytes$2 : ecdhOpts.randomBytes;
        // Keep the advertised seed length aligned with mapHashToField(), which keeps a hard 16-byte
        // minimum even on toy curves.
        const lengths = Object.assign(getWLengths(Point.Fp, Fn), {
            seed: Math.max(getMinHashLength(Fn.ORDER), 16),
        });
        function isValidSecretKey(secretKey) {
            try {
                const num = Fn.fromBytes(secretKey);
                return Fn.isValidNot0(num);
            }
            catch (error) {
                return false;
            }
        }
        function isValidPublicKey(publicKey, isCompressed) {
            const { publicKey: comp, publicKeyUncompressed } = lengths;
            try {
                const l = publicKey.length;
                if (isCompressed === true && l !== comp)
                    return false;
                if (isCompressed === false && l !== publicKeyUncompressed)
                    return false;
                // SEC 1 §3.2.2: the identity is never a valid public key, even on curves whose codec
                // can decode it.
                return !Point.fromBytes(publicKey).is0();
            }
            catch (error) {
                return false;
            }
        }
        /**
         * Produces cryptographically secure secret key from random of size
         * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
         */
        function randomSecretKey(seed) {
            seed = seed === undefined ? randomBytes_(lengths.seed) : seed;
            return mapHashToField(abytes$1(seed, lengths.seed, 'seed'), Fn.ORDER);
        }
        /**
         * Computes public key for a secret key. Checks for validity of the secret key.
         * @param isCompressed - whether to return compact (default), or full key
         * @returns Public key, full when isCompressed=false; short when isCompressed=true
         */
        function getPublicKey(secretKey, isCompressed = true) {
            return Point.BASE.multiply(Fn.fromBytes(secretKey)).toBytes(isCompressed);
        }
        /**
         * Quick and dirty check for item being public key. Does not validate hex, or being on-curve.
         */
        function isProbPub(item) {
            const { secretKey, publicKey, publicKeyUncompressed } = lengths;
            const allowedLengths = Fn._lengths;
            if (!isBytes$1(item))
                return undefined;
            const l = abytes$1(item, undefined, 'key').length;
            const isPub = l === publicKey || l === publicKeyUncompressed;
            const isSec = l === secretKey || !!allowedLengths?.includes(l);
            // P-521 accepts both 65- and 66-byte secret keys, so overlapping lengths stay ambiguous.
            if (isPub && isSec)
                return undefined;
            return isPub;
        }
        /**
         * ECDH (Elliptic Curve Diffie Hellman).
         * Computes encoded shared point from secret key A and public key B.
         * Checks: 1) secret key validity 2) shared key is on-curve.
         * Does NOT hash the result or expose the SEC 1 x-coordinate-only `z`.
         * Returns the encoded shared point on purpose: callers that need `x_P`
         * can derive it from the encoded point, but `x_P` alone cannot recover the
         * point/parity back.
         * This helper only exposes the fully validated public-key path, not cofactor DH.
         * @param isCompressed - whether to return compact (default), or full key
         * @returns shared point encoding
         */
        function getSharedSecret(secretKeyA, publicKeyB, isCompressed = true) {
            if (isProbPub(secretKeyA) === true)
                throw new Error('first arg must be private key');
            if (isProbPub(publicKeyB) === false)
                throw new Error('second arg must be public key');
            const s = Fn.fromBytes(secretKeyA);
            const b = Point.fromBytes(publicKeyB); // checks for being on-curve
            if (b.is0())
                throw new Error('invalid public key: point at infinity');
            return b.multiply(s).toBytes(isCompressed);
        }
        const utils = {
            isValidSecretKey,
            isValidPublicKey,
            randomSecretKey,
        };
        const keygen = createKeygen(randomSecretKey, getPublicKey);
        Object.freeze(utils);
        Object.freeze(lengths);
        return Object.freeze({ getPublicKey, getSharedSecret, keygen, Point, utils, lengths });
    }
    /**
     * Creates ECDSA signing interface for given elliptic curve `Point` and `hash` function.
     *
     * @param Point - created using {@link weierstrass} function
     * @param hash - used for 1) message prehash-ing 2) k generation in `sign`, using hmac_drbg(hash)
     * @param ecdsaOpts - rarely needed, see {@link ECDSAOpts}:
     *   - `lowS`: Default low-S policy.
     *   - `hmac`: HMAC implementation used by RFC6979 DRBG.
     *   - `randomBytes`: Optional RNG override.
     *   - `bits2int`: Optional hash-to-int conversion override.
     *   - `bits2int_modN`: Optional hash-to-int-mod-n conversion override.
     *
     * @returns ECDSA helper namespace.
     * @example
     * Create an ECDSA signer/verifier bundle for one curve implementation.
     *
     * ```ts
     * import { ecdsa } from '@noble/curves/abstract/weierstrass.js';
     * import { p256 } from '@noble/curves/nist.js';
     * import { sha256 } from '@noble/hashes/sha2.js';
     * const p256ecdsa = ecdsa(p256.Point, sha256);
     * const { secretKey, publicKey } = p256ecdsa.keygen();
     * const msg = new TextEncoder().encode('hello noble');
     * const sig = p256ecdsa.sign(msg, secretKey);
     * const isValid = p256ecdsa.verify(sig, msg, publicKey);
     * ```
     */
    function ecdsa$1(Point, hash, ecdsaOpts = {}) {
        validatePointCons(Point);
        // Custom hash / bits2int hooks are treated as pure functions over validated caller-owned bytes.
        const hash_ = hash;
        ahash(hash_);
        validateObject(ecdsaOpts, {}, {
            hmac: 'function',
            lowS: 'boolean',
            randomBytes: 'function',
            bits2int: 'function',
            bits2int_modN: 'function',
        });
        const opts = Object.assign({}, ecdsaOpts);
        const randomBytes = opts.randomBytes === undefined ? randomBytes$2 : opts.randomBytes;
        const hmac$1 = opts.hmac === undefined
            ? (key, msg) => hmac(hash_, key, msg)
            : opts.hmac;
        const { Fp, Fn } = Point;
        const { ORDER: CURVE_ORDER, BITS: fnBits } = Fn;
        // Nonce-inversion blinding in k2sig draws `getMinHashLength(n)` bytes per sign. Probe the RNG
        // once (see {@link probeRandomBytes}, shared with ScalarMultiplier): in environments without
        // working randomness, signing downgrades to Fermat inversion (invertCt) instead of throwing on
        // every sign(). The shape of returned bytes is still validated (by mapHashToField) on every
        // blinded call, where breakage fails closed.
        const blindLength = getMinHashLength(CURVE_ORDER);
        const csprng = probeRandomBytes(randomBytes, blindLength);
        const { keygen, getPublicKey, getSharedSecret, utils, lengths } = ecdh(Point, opts);
        const defaultSigOpts = {
            prehash: true,
            lowS: typeof opts.lowS === 'boolean' ? opts.lowS : true,
            format: 'compact',
            extraEntropy: false,
        };
        // SEC 1 4.1.6 public-key recovery tries x = r + jn for j = 0..h. Our recovered-signature
        // format only stores one overflow bit, so it can only distinguish q.x = r from q.x = r + n.
        // A third lift would have the form q.x = r + 2n. Since valid ECDSA r is in 1..n-1, the
        // smallest such lift is 1 + 2n, not 2n.
        const hasLargeRecoveryLifts = CURVE_ORDER * _2n$2 + _1n$1 < Fp.ORDER;
        function isBiggerThanHalfOrder(number) {
            const HALF = CURVE_ORDER >> _1n$1;
            return number > HALF;
        }
        function validateRS(title, num) {
            if (!Fn.isValidNot0(num))
                throw new Error(`invalid signature ${title}: out of range 1..Point.Fn.ORDER`);
            return num;
        }
        function assertFieldSignIsSupported() {
            if (!Fp.isOdd)
                throw new Error("Field doesn't support isOdd");
        }
        // Recovery id of an affine point (x, y) whose x reduces to signature `r` mod n:
        // bit 0 = y parity, bit 1 = x overflowed the group order (x = r + n).
        function getRecoveryBit(x, y, r) {
            assertFieldSignIsSupported();
            return (x === r ? 0 : 2) | Number(Fp.isOdd(y));
        }
        function assertRecoverableCurve() {
            // ECDSA recovery only supports curves where the current recovery id can distinguish
            // q.x = r and q.x = r + n; larger lifts may need additional `r + n*i` branches.
            // SEC 1 4.1.6 recovers candidates via x = r + jn, but this format only encodes j = 0 or 1.
            // The next possible candidate is q.x = r + 2n, and its smallest valid value is 1 + 2n.
            // To easily get i, we either need to:
            // a. increase amount of valid recid values (4, 5...); OR
            // b. prohibit recovered signatures for those curves.
            if (hasLargeRecoveryLifts)
                throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
        }
        function validateSigLength(bytes, format) {
            validateSigFormat(format);
            const size = lengths.signature;
            const sizer = format === 'compact' ? size : format === 'recovered' ? size + 1 : undefined;
            return abytes$1(bytes, sizer);
        }
        /**
         * ECDSA signature with its (r, s) properties. Supports compact, recovered & DER representations.
         */
        class Signature {
            r;
            s;
            recovery;
            constructor(r, s, recovery) {
                this.r = validateRS('r', r); // r in [1..N-1];
                this.s = validateRS('s', s); // s in [1..N-1];
                if (recovery != null) {
                    assertRecoverableCurve();
                    if (![0, 1, 2, 3].includes(recovery))
                        throw new Error('invalid recovery id');
                    this.recovery = recovery;
                }
                Object.freeze(this);
            }
            static fromBytes(bytes, format = defaultSigOpts.format) {
                validateSigLength(bytes, format);
                let recid;
                if (format === 'der') {
                    // Valid scalar INTEGERs use at most Fn.BYTES plus one DER sign-padding byte. Keep the
                    // total bound conservative so malformed inputs are rejected before parsing any INTEGER.
                    if (bytes.length > 2 * Fn.BYTES + 16)
                        throw new DER.Err('invalid signature: DER signature too long');
                    const { r, s } = DER.toSig(abytes$1(bytes), Fn.BYTES + 1);
                    return new Signature(r, s);
                }
                if (format === 'recovered') {
                    recid = bytes[0];
                    format = 'compact';
                    bytes = bytes.subarray(1);
                }
                const L = lengths.signature / 2;
                const r = bytes.subarray(0, L);
                const s = bytes.subarray(L, L * 2);
                return new Signature(Fn.fromBytes(r), Fn.fromBytes(s), recid);
            }
            static fromHex(hex, format) {
                return this.fromBytes(hexToBytes(hex), format);
            }
            assertRecovery() {
                const { recovery } = this;
                if (recovery == null)
                    throw new Error('invalid recovery id: must be present');
                return recovery;
            }
            addRecoveryBit(recovery) {
                return new Signature(this.r, this.s, recovery);
            }
            // Unlike the top-level helper below, this method expects a digest that has
            // already been hashed to the curve's message representative.
            recoverPublicKey(messageHash) {
                const { r, s } = this;
                const recovery = this.assertRecovery();
                const radj = recovery === 2 || recovery === 3 ? r + CURVE_ORDER : r;
                if (!Fp.isValid(radj))
                    throw new Error('invalid recovery id: sig.r+curve.n != R.x');
                const x = Fp.toBytes(radj);
                const R = Point.fromBytes(concatBytes$1(pprefix((recovery & 1) === 0), x));
                const ir = Fn.inv(radj); // r^-1
                const h = bits2int_modN(abytes$1(messageHash, undefined, 'msgHash')); // Truncate hash
                const u1 = Fn.create(-h * ir); // -hr^-1
                const u2 = Fn.create(s * ir); // sr^-1
                // (sr^-1)R-(hr^-1)G = -(hr^-1)G + (sr^-1). unsafe is fine: there is no private data.
                const Q = Point.BASE.mulAddUnsafe(u1, R, u2);
                if (Q.is0())
                    throw new Error('invalid recovery: point at infinify');
                Q.assertValidity();
                return Q;
            }
            // Signatures should be low-s, to prevent malleability.
            hasHighS() {
                return isBiggerThanHalfOrder(this.s);
            }
            toBytes(format = defaultSigOpts.format) {
                validateSigFormat(format);
                if (format === 'der')
                    return hexToBytes(DER.hexFromSig(this));
                const { r, s } = this;
                const rb = Fn.toBytes(r);
                const sb = Fn.toBytes(s);
                if (format === 'recovered') {
                    assertRecoverableCurve();
                    return concatBytes$1(Uint8Array.of(this.assertRecovery()), rb, sb);
                }
                return concatBytes$1(rb, sb);
            }
            toHex(format) {
                return bytesToHex(this.toBytes(format));
            }
        }
        Object.freeze(Signature.prototype);
        Object.freeze(Signature);
        // RFC6979: ensure ECDSA msg is X bytes and < N. RFC suggests optional truncating via bits2octets.
        // FIPS 186-4 4.6 suggests the leftmost min(nBitLen, outLen) bits, which matches bits2int.
        // bits2int can produce res>N, we can do mod(res, N) since the bitLen is the same.
        // int2octets can't be used; pads small msgs with 0: unacceptatble for trunc as per RFC vectors
        const bits2int = opts.bits2int === undefined
            ? function bits2int_def(bytes) {
                // Our custom check "just in case", for protection against DoS
                if (bytes.length > 8192)
                    throw new Error('input is too large');
                // For curves with nBitLength % 8 !== 0: bits2octets(bits2octets(m)) !== bits2octets(m)
                // for some cases, since bytes.length * 8 is not actual bitLength.
                const num = bytesToNumberBE(bytes); // check for == u8 done here
                const delta = bytes.length * 8 - fnBits; // truncate to nBitLength leftmost bits
                return delta > 0 ? num >> BigInt(delta) : num;
            }
            : opts.bits2int;
        const bits2int_modN = opts.bits2int_modN === undefined
            ? function bits2int_modN_def(bytes) {
                return Fn.create(bits2int(bytes)); // can't use bytesToNumberBE here
            }
            : opts.bits2int_modN;
        const ORDER_MASK = bitMask(fnBits);
        // Pads output with zero as per spec.
        /** Converts to bytes. Checks if num in `[0..ORDER_MASK-1]` e.g.: `[0..2^256-1]`. */
        function int2octets(num) {
            aInRange('num < 2^' + fnBits, num, _0n$1, ORDER_MASK);
            return Fn.toBytes(num);
        }
        function validateMsgAndHash(message, prehash) {
            abytes$1(message, undefined, 'message');
            return (prehash ? abytes$1(hash_(message), undefined, 'prehashed message') : message);
        }
        /**
         * Steps A, D of RFC6979 3.2.
         * Creates RFC6979 seed; converts msg/privKey to numbers.
         * Used only in sign, not in verify.
         *
         * Warning: we cannot assume here that message has same amount of bytes as curve order,
         * this will be invalid at least for P521. Also it can be bigger for P224 + SHA256.
         */
        function prepSig(message, secretKey, opts) {
            const { lowS, prehash, extraEntropy } = validateSigOpts$1(opts, defaultSigOpts);
            message = validateMsgAndHash(message, prehash); // RFC6979 3.2 A: h1 = H(m)
            // We can't later call bits2octets, since nested bits2int is broken for curves
            // with fnBits % 8 !== 0. Because of that, we unwrap it here as int2octets call.
            // const bits2octets = (bits) => int2octets(bits2int_modN(bits))
            const h1int = bits2int_modN(message);
            const d = Fn.fromBytes(secretKey); // validate secret key, convert to bigint
            if (!Fn.isValidNot0(d))
                throw new Error('invalid private key');
            const seedArgs = [int2octets(d), int2octets(h1int)];
            // extraEntropy. RFC6979 3.6: additional k' (optional).
            if (extraEntropy != null && extraEntropy !== false) {
                // K = HMAC_K(V || 0x00 || int2octets(x) || bits2octets(h1) || k')
                // gen random bytes OR pass as-is
                const e = extraEntropy === true ? randomBytes(lengths.secretKey) : extraEntropy;
                seedArgs.push(abytes$1(e, undefined, 'extraEntropy')); // check for being bytes
            }
            const seed = concatBytes$1(...seedArgs); // Step D of RFC6979 3.2
            const m = h1int; // no need to call bits2int second time here, it is inside truncateHash!
            // Converts signature params into point w r/s, checks result for validity.
            // To transform k => Signature:
            // q = k⋅G
            // r = q.x mod n
            // s = k^-1(m + rd) mod n
            // The nonce inversion is blinded: with random b ∈ [1,n−1], s = (bk)^-1(bm + bdr) per
            // https://tches.iacr.org/index.php/TCHES/article/view/7337/6509. Fn.inv()'s extended-Euclidean
            // loop count depends on its input (cf. Minerva), but here it only ever sees b·k — uniformly
            // random, independent of k — so its timing reveals nothing about the nonce; b also masks d in
            // the products. Without a CSPRNG (probed in ecdsa()) we fall back to Fermat inversion
            // (invertCt), whose control flow is data-independent, at ~4x the inversion cost.
            function k2sig(kBytes) {
                // RFC 6979 Section 3.2, step 3: k = bits2int(T)
                // Important: all mod() calls here must be done over N
                const k = bits2int(kBytes); // Cannot use fields methods, since it is group element
                if (!Fn.isValidNot0(k))
                    return; // Valid scalars (including k) must be in 1..N-1
                const q = Point.BASE.multiply(k).toAffine(); // q = k⋅G
                const r = Fn.create(q.x); // r = q.x mod n
                if (r === _0n$1)
                    return;
                let s;
                if (csprng !== undefined) {
                    // mapHashToField maps 1.5x-order-length uniform bytes into [1, n-1], negligible bias.
                    const b = bytesToNumberBE(mapHashToField(csprng(blindLength), CURVE_ORDER));
                    const ibk = Fn.inv(Fn.mul(b, k)); // (bk)^-1: inversion input is decorrelated from k
                    const bm = Fn.mul(b, m);
                    const bd = Fn.mul(b, d);
                    s = Fn.create(ibk * Fn.create(bm + bd * r)); // s = (bk)^-1(bm + bdr) = k^-1(m + rd) mod n
                }
                else {
                    const ik = invertCt(k, CURVE_ORDER); // k^-1 mod n with data-independent control flow
                    s = Fn.create(ik * Fn.create(m + r * d)); // s = k^-1(m + rd) mod n
                }
                if (s === _0n$1)
                    return;
                let recovery = getRecoveryBit(q.x, q.y, r); // recovery bit (2 or 3 when q.x>n)
                let normS = s;
                if (lowS && isBiggerThanHalfOrder(s)) {
                    normS = Fn.neg(s); // if lowS was passed, ensure s is always in the bottom half of N
                    recovery ^= 1;
                }
                return new Signature(r, normS, hasLargeRecoveryLifts ? undefined : recovery);
            }
            return { seed, k2sig };
        }
        /**
         * Signs a message or message hash with a secret key.
         * With the default `prehash: true`, raw message bytes are hashed internally;
         * only `{ prehash: false }` expects a caller-supplied digest.
         *
         * ```
         * sign(m, d) where
         *   k = rfc6979_hmac_drbg(m, d)
         *   (x, y) = G × k
         *   r = x mod n
         *   s = (m + dr) / k mod n
         * ```
         */
        function sign(message, secretKey, opts = {}) {
            const { seed, k2sig } = prepSig(message, secretKey, opts); // Steps A, D of RFC6979 3.2.
            const drbg = createHmacDrbg(hash_.outputLen, Fn.BYTES, hmac$1);
            const sig = drbg(seed, k2sig); // Steps B, C, D, E, F, G
            return sig.toBytes(opts.format);
        }
        /**
         * Verifies a signature against message and public key.
         * Rejects lowS signatures by default: see {@link ECDSAVerifyOpts}.
         * Implements section 4.1.4 from https://www.secg.org/sec1-v2.pdf:
         *
         * ```
         * verify(r, s, h, P) where
         *   u1 = hs^-1 mod n
         *   u2 = rs^-1 mod n
         *   R = u1⋅G + u2⋅P
         *   mod(R.x, n) == r
         * ```
         */
        function verify(signature, message, publicKey, opts = {}) {
            const { lowS, prehash, format } = validateSigOpts$1(opts, defaultSigOpts);
            publicKey = abytes$1(publicKey, undefined, 'publicKey');
            message = validateMsgAndHash(message, prehash);
            if (!isBytes$1(signature)) {
                const end = signature instanceof Signature ? ', use sig.toBytes()' : '';
                throw new Error('verify expects Uint8Array signature' + end);
            }
            validateSigLength(signature, format); // execute this twice because we want loud error
            try {
                const sig = Signature.fromBytes(signature, format);
                const P = Point.fromBytes(publicKey);
                // SEC 1 verification keys must not be the identity, even when the generic point decoder
                // permits infinity for another protocol (for example, a pairing curve).
                if (P.is0())
                    return false;
                if (lowS && sig.hasHighS())
                    return false;
                const { r, s } = sig;
                const h = bits2int_modN(message); // mod n, not mod p
                const is = Fn.inv(s); // s^-1 mod n
                const u1 = Fn.create(h * is); // u1 = hs^-1 mod n
                const u2 = Fn.create(r * is); // u2 = rs^-1 mod n
                const R = Point.BASE.mulAddUnsafe(u1, P, u2); // u1⋅G + u2⋅P, joint Strauss–Shamir
                if (R.is0())
                    return false;
                const q = R.toAffine();
                const v = Fn.create(q.x); // v = R.x mod n
                if (v !== r)
                    return false;
                // R is the exact point `recoverPublicKey(r, recid)` reconstructs (sR = hG + rP),
                // so binding the signature to its recovery id only needs R's parity/overflow bits.
                if (format === 'recovered' && sig.recovery !== getRecoveryBit(q.x, q.y, r))
                    return false;
                return true;
            }
            catch (e) {
                return false;
            }
        }
        function recoverPublicKey(signature, message, opts = {}) {
            // Top-level recovery mirrors `sign()` / `verify()`: it hashes raw message
            // bytes first unless the caller passes `{ prehash: false }`.
            const { prehash } = validateSigOpts$1(opts, defaultSigOpts);
            message = validateMsgAndHash(message, prehash);
            return Signature.fromBytes(signature, 'recovered').recoverPublicKey(message).toBytes();
        }
        // utils.isValidPublicKey() already rejects the identity, so ECDSA needs no shadow copy.
        return Object.freeze({
            keygen,
            getPublicKey,
            getSharedSecret,
            utils,
            lengths,
            Point,
            sign,
            verify,
            recoverPublicKey,
            Signature,
            hash: hash_,
        });
    }

    /**
     * SECG secp256k1. See [pdf](https://www.secg.org/sec2-v2.pdf).
     *
     * Belongs to Koblitz curves: it has efficiently-computable GLV endomorphism ψ,
     * check out {@link EndomorphismOpts}. Seems to be rigid (not backdoored).
     * @module
     */
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    // Seems like generator was produced from some seed:
    // `Pointk1.BASE.multiply(Pointk1.Fn.inv(2n, N)).toAffine().x`
    // // gives short x 0x3b78ce563f89a0ed9414f5aa28ad0d96d6795f9c63n
    const secp256k1_CURVE = {
        p: BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f'),
        n: BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141'),
        h: BigInt(1),
        a: BigInt(0),
        b: BigInt(7),
        Gx: BigInt('0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'),
        Gy: BigInt('0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8'),
    };
    const secp256k1_ENDO = {
        beta: BigInt('0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee'),
        basises: [
            [BigInt('0x3086d221a7d46bcde86c90e49284eb15'), -BigInt('0xe4437ed6010e88286f547fa90abfe4c3')],
            [BigInt('0x114ca50f7a8e2f3f657c1108d9d44cfd8'), BigInt('0x3086d221a7d46bcde86c90e49284eb15')],
        ],
    };
    const _2n$1 = /* @__PURE__ */ BigInt(2);
    /**
     * √n = n^((p+1)/4) for fields p = 3 mod 4. We unwrap the loop and multiply bit-by-bit.
     * (P+1n/4n).toString(2) would produce bits [223x 1, 0, 22x 1, 4x 0, 11, 00]
     */
    function sqrtMod(y) {
        const P = secp256k1_CURVE.p;
        // prettier-ignore
        const _3n = BigInt(3), _6n = BigInt(6), _11n = BigInt(11), _22n = BigInt(22);
        // prettier-ignore
        const _23n = BigInt(23), _44n = BigInt(44), _88n = BigInt(88);
        const b2 = (y * y * y) % P; // x^3, 11
        const b3 = (b2 * b2 * y) % P; // x^7
        const b6 = (pow2(b3, _3n, P) * b3) % P;
        const b9 = (pow2(b6, _3n, P) * b3) % P;
        const b11 = (pow2(b9, _2n$1, P) * b2) % P;
        const b22 = (pow2(b11, _11n, P) * b11) % P;
        const b44 = (pow2(b22, _22n, P) * b22) % P;
        const b88 = (pow2(b44, _44n, P) * b44) % P;
        const b176 = (pow2(b88, _88n, P) * b88) % P;
        const b220 = (pow2(b176, _44n, P) * b44) % P;
        const b223 = (pow2(b220, _3n, P) * b3) % P;
        const t1 = (pow2(b223, _23n, P) * b22) % P;
        const t2 = (pow2(t1, _6n, P) * b2) % P;
        const root = pow2(t2, _2n$1, P);
        if (!Fpk1.eql(Fpk1.sqr(root), y))
            throw new Error('Cannot find square root');
        return root;
    }
    const Fpk1 = /* @__PURE__ */ Field(secp256k1_CURVE.p, { sqrt: sqrtMod });
    const Pointk1 = /* @__PURE__ */ weierstrass(secp256k1_CURVE, {
        Fp: Fpk1,
        endo: secp256k1_ENDO,
    });
    /**
     * secp256k1 curve: ECDSA and ECDH methods.
     *
     * Uses sha256 to hash messages. To use a different hash,
     * pass `{ prehash: false }` to sign / verify.
     *
     * @example
     * Generate one secp256k1 keypair, sign a message, and verify it.
     *
     * ```js
     * import { secp256k1 } from '@noble/curves/secp256k1.js';
     * const { secretKey, publicKey } = secp256k1.keygen();
     * // const publicKey = secp256k1.getPublicKey(secretKey);
     * const msg = new TextEncoder().encode('hello noble');
     * const sig = secp256k1.sign(msg, secretKey);
     * const isValid = secp256k1.verify(sig, msg, publicKey);
     * // const sigKeccak = secp256k1.sign(keccak256(msg), secretKey, { prehash: false });
     * ```
     */
    const secp256k1 = /* @__PURE__ */ ecdsa$1(Pointk1, sha256);

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

    const AUTHSCRIPT_TAG = "NeuraiAuthScript";
    // Witness versions double as the commitment preimage lead byte.
    const AUTHSCRIPT_VERSION = 0x01; // generic AuthScript
    const PQ_WITNESS_VERSION = 0x02; // strict PQ
    const ECDSA_WITNESS_VERSION = 0x03; // strict ECDSA
    const NOAUTH_TYPE = 0x00;
    const PQ_AUTH_TYPE = 0x01;
    const LEGACY_AUTH_TYPE = 0x02;
    const PQ_PUBLIC_KEY_HEADER$1 = Uint8Array.from([0x05]);
    const DEFAULT_WITNESS_SCRIPT = Uint8Array.from([0x51]);
    function encodeWIF(privateKey, version, compressed = true) {
        const payload = compressed
            ? concatBytes$2(Uint8Array.from([version]), privateKey, Uint8Array.from([0x01]))
            : concatBytes$2(Uint8Array.from([version]), privateKey);
        return base58CheckEncode(payload);
    }
    // The node's CNeuraiSecret::IsValid() requires a WIF prefix matching the active
    // chain, so importing a foreign WIF fails there with "Invalid private key
    // encoding". expectedVersion is required rather than optional so every caller
    // has to name the chain it means: a WIF from another network is rejected here
    // too instead of being silently re-encoded for the target network.
    function decodeWIF(wif, expectedVersion) {
        const payload = base58CheckDecode(wif);
        if (payload.length !== 33 && payload.length !== 34) {
            throw new Error("Invalid WIF length");
        }
        const version = payload[0];
        const compressed = payload.length === 34;
        if (version !== expectedVersion) {
            throw new Error(`WIF is for a different network (version byte 0x${version.toString(16).padStart(2, "0")}, ` +
                `expected 0x${expectedVersion.toString(16).padStart(2, "0")})`);
        }
        if (compressed && payload[payload.length - 1] !== 0x01) {
            throw new Error("Invalid compressed WIF payload");
        }
        return {
            version,
            privateKey: payload.slice(1, 33),
            compressed,
        };
    }
    function getCompressedPublicKey(privateKey) {
        return secp256k1.getPublicKey(privateKey, true);
    }
    function publicKeyToAddressBytes(publicKey, versions) {
        return base58CheckEncode(concatBytes$2(Uint8Array.from([versions.public]), hash160(publicKey)));
    }
    function addressObjectFromWIF(wif, versions) {
        const decoded = decodeWIF(wif, versions.private);
        const publicKey = decoded.compressed
            ? secp256k1.getPublicKey(decoded.privateKey, true)
            : secp256k1.getPublicKey(decoded.privateKey, false);
        return {
            address: publicKeyToAddressBytes(publicKey, versions),
            privateKey: bytesToHex$1(decoded.privateKey),
            WIF: encodeWIF(decoded.privateKey, versions.private, decoded.compressed),
        };
    }
    function publicKeyHexFromWIF(wif, expectedVersion, compressed = true) {
        const decoded = decodeWIF(wif, expectedVersion);
        return bytesToHex$1(secp256k1.getPublicKey(decoded.privateKey, compressed && decoded.compressed));
    }
    function bech32mEncode(hrp, witnessVersion, hash) {
        return distExports.bech32m.encode(hrp, [witnessVersion, ...distExports.bech32m.toWords(hash)]);
    }
    // Not provided (undefined / null): default OP_TRUE. A provided script must be
    // non-empty, so an empty value is never silently replaced by OP_TRUE.
    function normalizeWitnessScript(input) {
        if (input === undefined || input === null) {
            return Uint8Array.from(DEFAULT_WITNESS_SCRIPT);
        }
        const script = ensureBytes(input);
        if (script.length === 0) {
            throw new Error("witnessScript must not be empty");
        }
        return script;
    }
    function buildAuthDescriptor(authType, publicKey) {
        if (authType === NOAUTH_TYPE) {
            return Uint8Array.from([NOAUTH_TYPE]);
        }
        if (!publicKey) {
            throw new Error(`Auth type 0x${authType.toString(16).padStart(2, "0")} requires a public key`);
        }
        if (authType === PQ_AUTH_TYPE) {
            return concatBytes$2(Uint8Array.from([PQ_AUTH_TYPE]), hash160(concatBytes$2(PQ_PUBLIC_KEY_HEADER$1, publicKey)));
        }
        if (authType === LEGACY_AUTH_TYPE) {
            return concatBytes$2(Uint8Array.from([LEGACY_AUTH_TYPE]), hash160(publicKey));
        }
        throw new Error(`Unsupported authType: 0x${String(authType).padStart(2, "0")}`);
    }
    function pqPublicKeyToAuthDescriptor(publicKey) {
        return buildAuthDescriptor(PQ_AUTH_TYPE, publicKey);
    }
    function authScriptCommitmentParts(authType, publicKey, options = {}, commitmentVersion = AUTHSCRIPT_VERSION) {
        const witnessScript = normalizeWitnessScript(options.witnessScript);
        const authDescriptor = buildAuthDescriptor(authType, publicKey);
        const witnessScriptHash = sha256Hash(witnessScript);
        const commitment = taggedHash(AUTHSCRIPT_TAG, concatBytes$2(Uint8Array.from([commitmentVersion]), authDescriptor, witnessScriptHash));
        return {
            authDescriptor,
            authType,
            commitment,
            witnessScript,
        };
    }
    // Encode a commitment authScriptCommitmentParts() already produced. Callers
    // that need the other parts too use this instead of the *ToAddressBytes
    // helpers, which would hash the public key a second time.
    function commitmentToAddressBytes(commitment, network) {
        return bech32mEncode(network.hrp, network.witnessVersion, commitment);
    }
    // Generic AuthScript (witness v1): any authType, any witnessScript.
    function authScriptToAddressBytes(authType, publicKey, network, options = {}) {
        return bech32mEncode(network.hrp, network.witnessVersion, authScriptCommitmentParts(authType, publicKey, options).commitment);
    }
    // PQ (strict witness v2) and ECDSA (strict witness v3): the witness version fixes
    // the authType and the witnessScript is always OP_TRUE.
    function pqPublicKeyToCommitmentParts(publicKey) {
        return authScriptCommitmentParts(PQ_AUTH_TYPE, publicKey, {}, PQ_WITNESS_VERSION);
    }
    function pqPublicKeyToAddressBytes(publicKey, network) {
        return bech32mEncode(network.hrp, network.witnessVersion, pqPublicKeyToCommitmentParts(publicKey).commitment);
    }
    function ecdsaPublicKeyToCommitmentParts(publicKey) {
        assertCompressedPublicKey(publicKey);
        return authScriptCommitmentParts(LEGACY_AUTH_TYPE, publicKey, {}, ECDSA_WITNESS_VERSION);
    }
    function ecdsaPublicKeyToAddressBytes(publicKey, bech32) {
        return bech32mEncode(bech32.hrp, bech32.witnessVersion, ecdsaPublicKeyToCommitmentParts(publicKey).commitment);
    }
    // Address of a secp256k1 public key: ECDSA witness v3 when the network has bech32
    // params ("xna" / "xna-test"), Legacy Base58 otherwise.
    function secp256k1PublicKeyToAddressBytes(publicKey, network) {
        return network.bech32
            ? ecdsaPublicKeyToAddressBytes(publicKey, network.bech32)
            : publicKeyToAddressBytes(publicKey, network.versions);
    }
    // A key off the curve would give an address nobody can spend from.
    function assertValidSecp256k1PublicKey(publicKey) {
        try {
            secp256k1.Point.fromBytes(publicKey).assertValidity();
        }
        catch {
            throw new Error("Public key is not a valid secp256k1 point");
        }
    }
    // The node has no ECDSA (witness v3) destination for uncompressed keys.
    function assertCompressedPublicKey(publicKey) {
        if (publicKey.length !== 33 || (publicKey[0] !== 0x02 && publicKey[0] !== 0x03)) {
            throw new Error("ECDSA (witness v3) addresses require a 33-byte compressed secp256k1 public key");
        }
        assertValidSecp256k1PublicKey(publicKey);
    }
    function normalizePublicKey(input) {
        return ensureBytes(input);
    }

    const MAX_CHILD_INDEX = 0xffffffff;
    // BIP32 leaves the retry count open. The chance of even one invalid child is
    // about 2^-127, so a handful of attempts is already far past "never happens".
    const MAX_DERIVE_ATTEMPTS = 4;
    function ensureValidTweak(tweak) {
        const tweakValue = bytesToNumberBE$1(tweak);
        if (tweakValue === 0n || tweakValue >= SECP256K1_ORDER) {
            throw new Error("Invalid BIP32 tweak");
        }
        return tweakValue;
    }
    function serializeExtendedKey(version, depth, parentFingerprint, index, chainCode, keyData) {
        return concatBytes$2(uint32ToBytesBE(version), Uint8Array.from([depth]), uint32ToBytesBE(parentFingerprint), uint32ToBytesBE(index), chainCode, keyData);
    }
    class HDKey {
        constructor(versions, chainCode, publicKey, privateKey, depth = 0, index = 0, parentFingerprint = 0) {
            this.versions = versions;
            this.depth = depth;
            this.index = index;
            this.chainCode = chainCode;
            this.parentFingerprint = parentFingerprint;
            this.privateKey = privateKey;
            this.publicKey = publicKey;
        }
        static fromMasterSeed(seed, versions) {
            const I = hmacSha512(BITCOIN_SEED_KEY, seed);
            const IL = I.slice(0, 32);
            const IR = I.slice(32);
            if (!isValidPrivateKey(IL)) {
                throw new Error("Invalid master seed");
            }
            const publicKey = secp256k1.getPublicKey(IL, true);
            return new HDKey(versions, IR, publicKey, IL);
        }
        get fingerprint() {
            return new DataView(hash160(this.publicKey).buffer, hash160(this.publicKey).byteOffset, 4).getUint32(0, false);
        }
        get privateExtendedKey() {
            if (!this.privateKey) {
                return null;
            }
            const keyData = concatBytes$2(Uint8Array.from([0x00]), this.privateKey);
            return base58CheckEncode(serializeExtendedKey(this.versions.private, this.depth, this.parentFingerprint, this.index, this.chainCode, keyData));
        }
        get publicExtendedKey() {
            return base58CheckEncode(serializeExtendedKey(this.versions.public, this.depth, this.parentFingerprint, this.index, this.chainCode, this.publicKey));
        }
        derive(path) {
            if (path === "m" || path === "M" || path === "m'" || path === "M'") {
                return this;
            }
            const entries = path.split("/");
            let current = this;
            entries.forEach((entry, index) => {
                if (index === 0) {
                    if (!/^[mM]{1}/.test(entry)) {
                        throw new Error('Path must start with "m" or "M"');
                    }
                    return;
                }
                const match = /^(\d+)(')?$/.exec(entry);
                const childIndex = match ? Number(match[1]) : Number.NaN;
                if (!Number.isSafeInteger(childIndex) || childIndex >= HARDENED_OFFSET) {
                    throw new Error(`Invalid index "${entry}"`);
                }
                const hardened = match[2] === "'";
                current = current.deriveChild(hardened ? childIndex + HARDENED_OFFSET : childIndex);
            });
            return current;
        }
        deriveChild(index) {
            if (!Number.isSafeInteger(index) || index < 0 || index > MAX_CHILD_INDEX) {
                throw new Error(`Invalid child index "${index}"`);
            }
            // BIP32: an invalid tweak or a zero child key means "proceed with the next
            // value for i". That next value has to stay inside the same domain --
            // crossing HARDENED_OFFSET would silently turn a normal derivation into a
            // hardened one, and 2**32 would wrap back to index 0 in uint32ToBytesBE.
            const domainEnd = index >= HARDENED_OFFSET ? MAX_CHILD_INDEX + 1 : HARDENED_OFFSET;
            const stopAt = Math.min(index + MAX_DERIVE_ATTEMPTS, domainEnd);
            for (let childIndex = index; childIndex < stopAt; childIndex++) {
                const child = this.tryDeriveChild(childIndex);
                if (child) {
                    return child;
                }
            }
            throw new Error(`Could not derive a valid child key at index ${index}`);
        }
        tryDeriveChild(index) {
            const hardened = index >= HARDENED_OFFSET;
            const indexBytes = uint32ToBytesBE(index);
            const data = hardened
                ? (() => {
                    if (!this.privateKey) {
                        throw new Error("Could not derive hardened child key");
                    }
                    return concatBytes$2(Uint8Array.from([0x00]), this.privateKey, indexBytes);
                })()
                : concatBytes$2(this.publicKey, indexBytes);
            const I = hmacSha512(this.chainCode, data);
            const IL = I.slice(0, 32);
            const IR = I.slice(32);
            let tweak;
            try {
                tweak = ensureValidTweak(IL);
            }
            catch {
                return null;
            }
            if (this.privateKey) {
                const childKey = bigIntMod(bytesToNumberBE$1(this.privateKey) + tweak, SECP256K1_ORDER);
                if (childKey === 0n) {
                    return null;
                }
                const privateKey = numberToBytesBE$1(childKey, 32);
                const publicKey = secp256k1.getPublicKey(privateKey, true);
                return new HDKey(this.versions, IR, publicKey, privateKey, this.depth + 1, index, this.fingerprint);
            }
            const tweakPoint = secp256k1.Point.BASE.multiply(tweak);
            const parentPoint = secp256k1.Point.fromHex(bytesToHex$1(this.publicKey));
            const childPoint = tweakPoint.add(parentPoint);
            if (childPoint.equals(secp256k1.Point.ZERO)) {
                return null;
            }
            return new HDKey(this.versions, IR, childPoint.toBytes(true), undefined, this.depth + 1, index, this.fingerprint);
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
     * Asserts something is a non-negative integer.
     * @param n - number to validate
     * @param title - label included in thrown errors
     * @throws On wrong argument types. {@link TypeError}
     * @throws On wrong argument ranges or values. {@link RangeError}
     * @example
     * Validate a non-negative integer option.
     * ```ts
     * anumber(32, 'length');
     * ```
     */
    function anumber(n, title = '') {
        if (typeof n !== 'number') {
            const prefix = title && `"${title}" `;
            throw new TypeError(`${prefix}expected number, got ${typeof n}`);
        }
        if (!Number.isSafeInteger(n) || n < 0) {
            const prefix = title && `"${title}" `;
            throw new RangeError(`${prefix}expected integer >= 0, got ${n}`);
        }
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
        if (!bytes || (needsLen && len !== length)) {
            const prefix = title && `"${title}" `;
            const ofLen = needsLen ? ` of length ${length}` : '';
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
     * Casts a typed array view to Uint32Array.
     * `arr.byteOffset` must already be 4-byte aligned or the platform
     * Uint32Array constructor will throw.
     * @param arr - source typed array
     * @returns Uint32Array view over the same buffer.
     * @example
     * Reinterpret a byte array as 32-bit words.
     * ```ts
     * u32(new Uint8Array(8));
     * ```
     */
    function u32(arr) {
        return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
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
    /** Whether the current platform is little-endian. */
    const isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44)();
    /**
     * Byte-swap operation for uint32 values.
     * @param word - source word
     * @returns Word with reversed byte order.
     * @example
     * Reverse the byte order of a 32-bit word.
     * ```ts
     * byteSwap(0x11223344);
     * ```
     */
    function byteSwap(word) {
        return (((word << 24) & 0xff000000) |
            ((word << 8) & 0xff0000) |
            ((word >>> 8) & 0xff00) |
            ((word >>> 24) & 0xff));
    }
    /**
     * Byte-swaps every word of a Uint32Array in place.
     * @param arr - array to mutate
     * @returns The same array after mutation; callers pass live state arrays here.
     * @example
     * Reverse the byte order of every word in place.
     * ```ts
     * byteSwap32(new Uint32Array([0x11223344]));
     * ```
     */
    function byteSwap32(arr) {
        for (let i = 0; i < arr.length; i++) {
            arr[i] = byteSwap(arr[i]);
        }
        return arr;
    }
    /**
     * Conditionally byte-swaps a Uint32Array on big-endian platforms.
     * @param u - array to normalize for host endianness
     * @returns Original or byte-swapped array depending on platform endianness.
     *   On big-endian runtimes this mutates `u` in place via `byteSwap32(...)`.
     * @example
     * Normalize a word array for host endianness.
     * ```ts
     * swap32IfBE(new Uint32Array([0x11223344]));
     * ```
     */
    const swap32IfBE = isLE
        ? (u) => u
        : byteSwap32;
    /**
     * Copies several Uint8Arrays into one.
     * @param arrays - arrays to concatenate
     * @returns Concatenated byte array.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Concatenate multiple byte arrays.
     * ```ts
     * concatBytes(new Uint8Array([1]), new Uint8Array([2]));
     * ```
     */
    function concatBytes(...arrays) {
        let sum = 0;
        for (let i = 0; i < arrays.length; i++) {
            const a = arrays[i];
            abytes(a);
            sum += a.length;
        }
        const res = new Uint8Array(sum);
        for (let i = 0, pad = 0; i < arrays.length; i++) {
            const a = arrays[i];
            res.set(a, pad);
            pad += a.length;
        }
        return res;
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
     * Cryptographically secure PRNG backed by `crypto.getRandomValues`.
     * @param bytesLength - number of random bytes to generate
     * @returns Random bytes.
     * The platform `getRandomValues()` implementation still defines any
     * single-call length cap, and this helper rejects oversize requests
     * with a stable library `RangeError` instead of host-specific errors.
     * @throws On wrong argument types. {@link TypeError}
     * @throws On wrong argument ranges or values. {@link RangeError}
     * @throws If the current runtime does not provide `crypto.getRandomValues`. {@link Error}
     * @example
     * Generate a fresh random key or nonce.
     * ```ts
     * const key = randomBytes(16);
     * ```
     */
    function randomBytes$1(bytesLength = 32) {
        // Match the repo's other length-taking helpers instead of relying on Uint8Array coercion.
        anumber(bytesLength, 'bytesLength');
        const cr = typeof globalThis === 'object' ? globalThis.crypto : null;
        if (typeof cr?.getRandomValues !== 'function')
            throw new Error('crypto.getRandomValues must be defined');
        // Web Cryptography API Level 2 §10.1.1:
        // if `byteLength > 65536`, throw `QuotaExceededError`.
        // Keep the guard explicit so callers can see the quota in code
        // instead of discovering it by reading the spec or host errors.
        // This wrapper surfaces the same quota as a stable library RangeError.
        if (bytesLength > 65536)
            throw new RangeError(`"bytesLength" expected <= 65536, got ${bytesLength}`);
        return cr.getRandomValues(new Uint8Array(bytesLength));
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
     * Hex, bytes and number utilities.
     * @module
     */
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    /**
     * Validates that a flag is boolean.
     * @param value - Value to validate.
     * @param title - Optional field name.
     * @returns Original value.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Reject non-boolean option flags early.
     *
     * ```ts
     * abool(true);
     * ```
     */
    function abool(value, title = '') {
        if (typeof value !== 'boolean') {
            const prefix = title && `"${title}" `;
            throw new TypeError(prefix + 'expected boolean, got type=' + typeof value);
        }
        return value;
    }

    const U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
    const _32n = /* @__PURE__ */ BigInt(32);
    // Split bigint into two 32-bit halves. With `le=true`, returned fields become `{ h: low, l: high
    // }` to match little-endian word order rather than the property names.
    function fromBig(n, le = false) {
        if (le)
            return { h: Number(n & U32_MASK64), l: Number((n >> _32n) & U32_MASK64) };
        return { h: Number((n >> _32n) & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
    }
    // Split bigint list into `[highWords, lowWords]` when `le=false`; with `le=true`, the first array
    // holds the low halves because `fromBig(...)` swaps the semantic meaning of `h` and `l`.
    function split(lst, le = false) {
        const len = lst.length;
        let Ah = new Uint32Array(len);
        let Al = new Uint32Array(len);
        for (let i = 0; i < len; i++) {
            const { h, l } = fromBig(lst[i], le);
            [Ah[i], Al[i]] = [h, l];
        }
        return [Ah, Al];
    }
    // High 32-bit half of a 64-bit left rotate, valid for `s` in `1..31`.
    const rotlSH = (h, l, s) => (h << s) | (l >>> (32 - s));
    // Low 32-bit half of a 64-bit left rotate, valid for `s` in `1..31`.
    const rotlSL = (h, l, s) => (l << s) | (h >>> (32 - s));
    // High 32-bit half of a 64-bit left rotate, valid for `s` in `33..63`; `32` uses `rotr32*`.
    const rotlBH = (h, l, s) => (l << (s - 32)) | (h >>> (64 - s));
    // Low 32-bit half of a 64-bit left rotate, valid for `s` in `33..63`; `32` uses `rotr32*`.
    const rotlBL = (h, l, s) => (h << (s - 32)) | (l >>> (64 - s));

    /**
     * SHA3 (keccak) hash function, based on a new "Sponge function" design.
     * Different from older hashes, the internal state is bigger than output size.
     *
     * Check out
     * {@link https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.202.pdf | FIPS-202},
     * {@link https://keccak.team/keccak.html | Website}, and
     * {@link https://crypto.stackexchange.com/q/15727 | the differences between
     * SHA-3 and Keccak}.
     *
     * Check out `sha3-addons` module for cSHAKE, k12, and others.
     * @module
     */
    // No __PURE__ annotations in sha3 header:
    // EVERYTHING is in fact used on every export.
    // Various per round constants calculations
    const _0n = BigInt(0);
    const _1n = BigInt(1);
    const _2n = BigInt(2);
    const _7n = BigInt(7);
    const _256n = BigInt(256);
    // FIPS 202 Algorithm 5 rc(): when the outgoing bit is 1, the 8-bit LFSR xors
    // taps 0, 4, 5, and 6, which compresses to the feedback mask `0x71`.
    const _0x71n = BigInt(0x71);
    const SHA3_PI = [];
    const SHA3_ROTL = [];
    const _SHA3_IOTA = []; // no pure annotation: var is always used
    for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
        // Pi
        [x, y] = [y, (2 * x + 3 * y) % 5];
        SHA3_PI.push(2 * (5 * y + x));
        // Rotational
        SHA3_ROTL.push((((round + 1) * (round + 2)) / 2) % 64);
        // Iota
        let t = _0n;
        for (let j = 0; j < 7; j++) {
            R = ((R << _1n) ^ ((R >> _7n) * _0x71n)) % _256n;
            if (R & _2n)
                t ^= _1n << ((_1n << BigInt(j)) - _1n);
        }
        _SHA3_IOTA.push(t);
    }
    const IOTAS = split(_SHA3_IOTA, true);
    // `split(..., true)` keeps the local little-endian lane-word layout used by
    // `state32`, so these `H` / `L` tables follow the file's first-word /
    // second-word lane slots rather than `_u64.ts`'s usual high/low naming.
    const SHA3_IOTA_H = IOTAS[0];
    const SHA3_IOTA_L = IOTAS[1];
    // Left rotation (without 0, 32, 64)
    const rotlH = (h, l, s) => (s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s));
    const rotlL = (h, l, s) => (s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s));
    /**
     * `keccakf1600` internal permutation, additionally allows adjusting the round count.
     * @param s - 5x5 Keccak state encoded as 25 lanes split into 50 uint32 words
     *   in this file's local little-endian lane-word order
     * @param rounds - number of rounds to execute
     * @throws If `rounds` is outside the supported `1..24` range. {@link Error}
     * @example
     * Permute a Keccak state with the default 24 rounds.
     * ```ts
     * keccakP(new Uint32Array(50));
     * ```
     */
    function keccakP(s, rounds = 24) {
        anumber(rounds, 'rounds');
        // This implementation precomputes only the standard Keccak-f[1600] 24-round Iota table.
        if (rounds < 1 || rounds > 24)
            throw new Error('"rounds" expected integer 1..24');
        const B = new Uint32Array(5 * 2);
        // NOTE: all indices are x2 since we store state as u32 instead of u64 (bigints to slow in js)
        for (let round = 24 - rounds; round < 24; round++) {
            // Theta θ
            for (let x = 0; x < 10; x++)
                B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
            for (let x = 0; x < 10; x += 2) {
                const idx1 = (x + 8) % 10;
                const idx0 = (x + 2) % 10;
                const B0 = B[idx0];
                const B1 = B[idx0 + 1];
                const Th = rotlH(B0, B1, 1) ^ B[idx1];
                const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
                for (let y = 0; y < 50; y += 10) {
                    s[x + y] ^= Th;
                    s[x + y + 1] ^= Tl;
                }
            }
            // Rho (ρ) and Pi (π)
            let curH = s[2];
            let curL = s[3];
            for (let t = 0; t < 24; t++) {
                const shift = SHA3_ROTL[t];
                const Th = rotlH(curH, curL, shift);
                const Tl = rotlL(curH, curL, shift);
                const PI = SHA3_PI[t];
                curH = s[PI];
                curL = s[PI + 1];
                s[PI] = Th;
                s[PI + 1] = Tl;
            }
            // Chi (χ)
            // Same as:
            // for (let x = 0; x < 10; x++) B[x] = s[y + x];
            // for (let x = 0; x < 10; x++) s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
            for (let y = 0; y < 50; y += 10) {
                const b0 = s[y], b1 = s[y + 1], b2 = s[y + 2], b3 = s[y + 3];
                s[y] ^= ~s[y + 2] & s[y + 4];
                s[y + 1] ^= ~s[y + 3] & s[y + 5];
                s[y + 2] ^= ~s[y + 4] & s[y + 6];
                s[y + 3] ^= ~s[y + 5] & s[y + 7];
                s[y + 4] ^= ~s[y + 6] & s[y + 8];
                s[y + 5] ^= ~s[y + 7] & s[y + 9];
                s[y + 6] ^= ~s[y + 8] & b0;
                s[y + 7] ^= ~s[y + 9] & b1;
                s[y + 8] ^= ~b0 & b2;
                s[y + 9] ^= ~b1 & b3;
            }
            // Iota (ι)
            s[0] ^= SHA3_IOTA_H[round];
            s[1] ^= SHA3_IOTA_L[round];
        }
        clean(B);
    }
    /**
     * Keccak sponge function.
     * @param blockLen - absorb/squeeze rate in bytes
     * @param suffix - domain separation suffix byte
     * @param outputLen - default digest length in bytes. This base sponge only
     *   requires a non-negative integer; wrappers that need positive output
     *   lengths must enforce that themselves.
     * @param enableXOF - whether XOF output is allowed
     * @param rounds - number of Keccak-f rounds
     * @example
     * Build a sponge state, absorb bytes, then finalize a digest.
     * ```ts
     * const hash = new Keccak(136, 0x06, 32);
     * hash.update(new Uint8Array([1, 2, 3]));
     * hash.digest();
     * ```
     */
    class Keccak {
        state;
        pos = 0;
        posOut = 0;
        finished = false;
        state32;
        destroyed = false;
        blockLen;
        suffix;
        outputLen;
        canXOF;
        enableXOF = false;
        rounds;
        // NOTE: we accept arguments in bytes instead of bits here.
        constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
            this.blockLen = blockLen;
            this.suffix = suffix;
            this.outputLen = outputLen;
            this.enableXOF = enableXOF;
            this.canXOF = enableXOF;
            this.rounds = rounds;
            // Can be passed from user as dkLen
            anumber(outputLen, 'outputLen');
            // 1600 = 5x5 matrix of 64bit.  1600 bits === 200 bytes
            // 0 < blockLen < 200
            if (!(0 < blockLen && blockLen < 200))
                throw new Error('only keccak-f1600 function is supported');
            this.state = new Uint8Array(200);
            this.state32 = u32(this.state);
        }
        clone() {
            return this._cloneInto();
        }
        keccak() {
            swap32IfBE(this.state32);
            keccakP(this.state32, this.rounds);
            swap32IfBE(this.state32);
            this.posOut = 0;
            this.pos = 0;
        }
        update(data) {
            aexists(this);
            abytes(data);
            const { blockLen, state } = this;
            const len = data.length;
            for (let pos = 0; pos < len;) {
                const take = Math.min(blockLen - this.pos, len - pos);
                for (let i = 0; i < take; i++)
                    state[this.pos++] ^= data[pos++];
                if (this.pos === blockLen)
                    this.keccak();
            }
            return this;
        }
        finish() {
            if (this.finished)
                return;
            this.finished = true;
            const { state, suffix, pos, blockLen } = this;
            // FIPS 202 appends the SHA3/SHAKE domain-separation suffix before pad10*1.
            // These byte values already include the first padding bit, while the
            // final `0x80` below supplies the closing `1` bit in the last rate byte.
            state[pos] ^= suffix;
            // If that combined suffix lands in the last rate byte and already sets
            // bit 7, absorb it first so the final pad10*1 bit can be xored into a
            // fresh block.
            if ((suffix & 0x80) !== 0 && pos === blockLen - 1)
                this.keccak();
            state[blockLen - 1] ^= 0x80;
            this.keccak();
        }
        writeInto(out) {
            aexists(this, false);
            abytes(out);
            this.finish();
            const bufferOut = this.state;
            const { blockLen } = this;
            for (let pos = 0, len = out.length; pos < len;) {
                if (this.posOut >= blockLen)
                    this.keccak();
                const take = Math.min(blockLen - this.posOut, len - pos);
                out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
                this.posOut += take;
                pos += take;
            }
            return out;
        }
        xofInto(out) {
            // Plain SHA3/Keccak usage with XOF is probably a mistake, but this base
            // class is also reused by SHAKE/cSHAKE/KMAC/TupleHash/ParallelHash/
            // TurboSHAKE/KangarooTwelve wrappers that intentionally enable XOF.
            if (!this.enableXOF)
                throw new Error('XOF is not possible for this instance');
            return this.writeInto(out);
        }
        xof(bytes) {
            anumber(bytes);
            return this.xofInto(new Uint8Array(bytes));
        }
        digestInto(out) {
            aoutput(out, this);
            if (this.finished)
                throw new Error('digest() was already called');
            // `aoutput(...)` allows oversized buffers; digestInto() must fill only the advertised digest.
            this.writeInto(out.subarray(0, this.outputLen));
            this.destroy();
        }
        digest() {
            const out = new Uint8Array(this.outputLen);
            this.digestInto(out);
            return out;
        }
        destroy() {
            this.destroyed = true;
            clean(this.state);
        }
        _cloneInto(to) {
            const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
            to ||= new Keccak(blockLen, suffix, outputLen, enableXOF, rounds);
            // Reused destinations can come from a different rate/capacity variant, so clone must rewrite
            // the sponge geometry as well as the state words.
            to.blockLen = blockLen;
            to.state32.set(this.state32);
            to.pos = this.pos;
            to.posOut = this.posOut;
            to.finished = this.finished;
            to.rounds = rounds;
            // Suffix can change in cSHAKE
            to.suffix = suffix;
            to.outputLen = outputLen;
            to.enableXOF = enableXOF;
            // Clones must preserve the public capability bit too; `_KMAC` reuses this path and deep clone
            // tests compare instance fields directly, so leaving `canXOF` behind makes the clone lie.
            to.canXOF = this.canXOF;
            to.destroyed = this.destroyed;
            return to;
        }
    }
    const genShake = (suffix, blockLen, outputLen, info = {}) => createHasher((opts = {}) => new Keccak(blockLen, suffix, opts.dkLen === undefined ? outputLen : opts.dkLen, true), info);
    /**
     * SHAKE128 XOF with 128-bit security and a 16-byte default output.
     * @param msg - message bytes to hash
     * @param opts - Optional output-length override. See {@link ShakeOpts}.
     * @returns Digest bytes.
     * @example
     * Hash a message with SHAKE128.
     * ```ts
     * shake128(new Uint8Array([97, 98, 99]), { dkLen: 32 });
     * ```
     */
    const shake128 = 
    /* @__PURE__ */
    genShake(0x1f, 168, 16, /* @__PURE__ */ oidNist(0x0b));
    /**
     * SHAKE256 XOF with 256-bit security and a 32-byte default output.
     * @param msg - message bytes to hash
     * @param opts - Optional output-length override. See {@link ShakeOpts}.
     * @returns Digest bytes.
     * @example
     * Hash a message with SHAKE256.
     * ```ts
     * shake256(new Uint8Array([97, 98, 99]), { dkLen: 64 });
     * ```
     */
    const shake256 = 
    /* @__PURE__ */
    genShake(0x1f, 136, 32, /* @__PURE__ */ oidNist(0x0c));

    function checkU32(n) {
        // 0xff_ff_ff_ff
        if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff)
            throw new Error('wrong u32 integer:' + n);
        return n;
    }
    /**
     * Checks if integer is in form of `1 << X`.
     * @param x - Integer to inspect.
     * @returns `true` when the value is a power of two.
     * @throws If `x` is not a valid unsigned 32-bit integer. {@link Error}
     * @example
     * Validate that an FFT size is a power of two.
     *
     * ```ts
     * isPowerOfTwo(8);
     * ```
     */
    function isPowerOfTwo(x) {
        checkU32(x);
        return (x & (x - 1)) === 0 && x !== 0;
    }
    /**
     * @param n - Value to reverse.
     * @param bits - Number of bits to use.
     * @returns Bit-reversed integer.
     * @throws If `n` is not a valid unsigned 32-bit integer. {@link Error}
     * @example
     * Reverse the low `bits` bits of one index.
     *
     * ```ts
     * reverseBits(3, 3);
     * ```
     */
    function reverseBits(n, bits) {
        checkU32(n);
        if (!Number.isSafeInteger(bits) || bits < 0 || bits > 32)
            throw new Error(`expected integer 0 <= bits <= 32, got ${bits}`);
        let reversed = 0;
        for (let i = 0; i < bits; i++, n >>>= 1)
            reversed = (reversed << 1) | (n & 1);
        // JS bitwise ops are signed i32; cast back so 32-bit reversals stay in the unsigned u32 domain.
        return reversed >>> 0;
    }
    /**
     * Similar to `bitLen(x)-1` but much faster for small integers, like indices.
     * @param n - Input value.
     * @returns Base-2 logarithm. For `n = 0`, the current implementation returns `-1`.
     * @throws If `n` is not a valid unsigned 32-bit integer. {@link Error}
     * @example
     * Compute the radix-2 stage count for one transform size.
     *
     * ```ts
     * log2(8);
     * ```
     */
    function log2(n) {
        checkU32(n);
        return 31 - Math.clz32(n);
    }
    /**
     * Moves lowest bit to highest position, which at first step splits
     * array on even and odd indices, then it applied again to each part,
     * which is core of fft
     * @param values - Mutable coefficient array.
     * @returns Mutated input array.
     * @throws If the array length is not a positive power of two. {@link Error}
     * @example
     * Reorder coefficients into bit-reversed order in place.
     *
     * ```ts
     * const values = Uint8Array.from([0, 1, 2, 3]);
     * bitReversalInplace(values);
     * ```
     */
    function bitReversalInplace(values) {
        const n = values.length;
        // Size-1 FFT is the identity, so bit-reversal must stay a no-op there instead of rejecting it.
        if (!isPowerOfTwo(n))
            throw new Error('expected positive power-of-two length, got ' + n);
        const bits = log2(n);
        for (let i = 0; i < n; i++) {
            const j = reverseBits(i, bits);
            if (i < j) {
                const tmp = values[i];
                values[i] = values[j];
                values[j] = tmp;
            }
        }
        return values;
    }
    /**
     * Constructs different flavors of FFT. radix2 implementation of low level mutating API. Flavors:
     *
     * - DIT (Decimation-in-Time): Bottom-Up (leaves to root), Cool-Turkey
     * - DIF (Decimation-in-Frequency): Top-Down (root to leaves), Gentleman-Sande
     *
     * DIT takes brp input, returns natural output.
     * DIF takes natural input, returns brp output.
     *
     * The output is actually identical. Time / frequence distinction is not meaningful
     * for Polynomial multiplication in fields.
     * Which means if protocol supports/needs brp output/inputs, then we can skip this step.
     *
     * Cyclic NTT: Rq = Zq[x]/(x^n-1). butterfly_DIT+loop_DIT OR butterfly_DIF+loop_DIT, roots are omega
     * Negacyclic NTT: Rq = Zq[x]/(x^n+1). butterfly_DIT+loop_DIF, at least for mlkem / mldsa
     * @param F - Field operations.
     * @param coreOpts - FFT configuration:
     *   - `N`: Transform size. Must be a power of two.
     *   - `roots`: Stage roots for the selected transform size.
     *   - `dit`: Whether to run the DIT variant instead of DIF.
     *   - `invertButterflies` (optional): Whether to invert butterfly placement.
     *   - `skipStages` (optional): Number of initial stages to skip.
     *   - `brp` (optional): Whether to apply bit-reversal permutation at the boundary.
     * @returns Low-level FFT loop.
     * @throws If the FFT options or cached roots are invalid for the requested size. {@link Error}
     * @example
     * Constructs different flavors of FFT.
     *
     * ```ts
     * import { FFTCore, rootsOfUnity } from '@noble/curves/abstract/fft.js';
     * import { Field } from '@noble/curves/abstract/modular.js';
     * const Fp = Field(17n);
     * const roots = rootsOfUnity(Fp).roots(2);
     * const loop = FFTCore(Fp, { N: 4, roots, dit: true });
     * const values = loop([1n, 2n, 3n, 4n]);
     * ```
     */
    const FFTCore = (F, coreOpts) => {
        const { N, roots, dit, invertButterflies = false, skipStages = 0, brp = true } = coreOpts;
        const bits = log2(N);
        if (!isPowerOfTwo(N))
            throw new Error('FFT: Polynomial size should be power of two');
        // Wrong-sized root tables can stay in-bounds for some loop shapes and silently compute nonsense.
        if (roots.length !== N)
            throw new Error(`FFT: wrong roots length: expected ${N}, got ${roots.length}`);
        const isDit = dit !== invertButterflies;
        return (values) => {
            if (values.length !== N)
                throw new Error('FFT: wrong Polynomial length');
            if (dit && brp)
                bitReversalInplace(values);
            for (let i = 0, g = 1; i < bits - skipStages; i++) {
                // For each stage s (sub-FFT length m = 2^s)
                const s = dit ? i + 1 + skipStages : bits - i;
                const m = 1 << s;
                const m2 = m >> 1;
                const stride = N >> s;
                // Loop over each subarray of length m
                for (let k = 0; k < N; k += m) {
                    // Loop over each butterfly within the subarray
                    for (let j = 0, grp = g++; j < m2; j++) {
                        const rootPos = invertButterflies ? (dit ? N - grp : grp) : j * stride;
                        const i0 = k + j;
                        const i1 = k + j + m2;
                        const omega = roots[rootPos];
                        const b = values[i1];
                        const a = values[i0];
                        // Inlining gives us 10% perf in kyber vs functions
                        if (isDit) {
                            const t = F.mul(b, omega); // Standard DIT butterfly
                            values[i0] = F.add(a, t);
                            values[i1] = F.sub(a, t);
                        }
                        else if (invertButterflies) {
                            values[i0] = F.add(b, a); // DIT loop + inverted butterflies (Kyber decode)
                            values[i1] = F.mul(F.sub(b, a), omega);
                        }
                        else {
                            values[i0] = F.add(a, b); // Standard DIF butterfly
                            values[i1] = F.mul(F.sub(a, b), omega);
                        }
                    }
                }
            }
            if (!dit && brp)
                bitReversalInplace(values);
            return values;
        };
    };

    /**
     * Utilities for hex, bytearray and number handling.
     * @module
     */
    /*! noble-post-quantum - MIT License (c) 2024 Paul Miller (paulmillr.com) */
    /**
     * Asserts that a value is a byte array and optionally checks its length.
     * Returns the original reference unchanged on success, and currently also accepts Node `Buffer`
     * values through the upstream validator.
     * This helper throws on malformed input, so APIs that must return `false` need to guard lengths
     * before decoding or before calling it.
     * @example
     * Validate that a value is a byte array with the expected length.
     * ```ts
     * abytes(new Uint8Array([1]), 1);
     * ```
     */
    const abytesDoc = abytes;
    /**
     * Returns cryptographically secure random bytes.
     * Requires `globalThis.crypto.getRandomValues` and throws if that API is unavailable.
     * `bytesLength` is validated by the upstream helper as a non-negative integer before allocation,
     * so negative and fractional values both throw instead of truncating through JS `ToIndex`.
     * @param bytesLength - Number of random bytes to generate.
     * @returns Fresh random bytes.
     * @example
     * Generate a fresh random seed.
     * ```ts
     * const seed = randomBytes(4);
     * ```
     */
    const randomBytes = randomBytes$1;
    /**
     * Compares two byte arrays in a length-constant way for equal lengths.
     * Unequal lengths return `false` immediately, and there is no runtime type validation.
     * @param a - First byte array.
     * @param b - Second byte array.
     * @returns Whether both arrays contain the same bytes.
     * @example
     * Compare two byte arrays for equality.
     * ```ts
     * equalBytes(new Uint8Array([1]), new Uint8Array([1]));
     * ```
     */
    function equalBytes(a, b) {
        if (a.length !== b.length)
            return false;
        let diff = 0;
        for (let i = 0; i < a.length; i++)
            diff |= a[i] ^ b[i];
        return diff === 0;
    }
    /**
     * Validates that an options bag is a plain object.
     * @param opts - Options object to validate.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Validate that an options bag is a plain object.
     * ```ts
     * validateOpts({});
     * ```
     */
    function validateOpts(opts) {
        // Arrays silently passed here before, but these call sites expect named option-bag fields.
        if (Object.prototype.toString.call(opts) !== '[object Object]')
            throw new TypeError('expected valid options object');
    }
    /**
     * Validates common verification options.
     * `context` itself is validated with `abytes(...)`, and individual algorithms may narrow support
     * further after this shared plain-object gate.
     * @param opts - Verification options. See {@link VerOpts}.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Validate common verification options.
     * ```ts
     * validateVerOpts({ context: new Uint8Array([1]) });
     * ```
     */
    function validateVerOpts(opts) {
        validateOpts(opts);
        if (opts.context !== undefined)
            abytes(opts.context, undefined, 'opts.context');
    }
    /**
     * Validates common signing options.
     * `extraEntropy` is validated with `abytes(...)`; exact lengths and extra algorithm-specific
     * restrictions are enforced later by callers.
     * @param opts - Signing options. See {@link SigOpts}.
     * @throws On wrong argument types. {@link TypeError}
     * @example
     * Validate common signing options.
     * ```ts
     * validateSigOpts({ extraEntropy: new Uint8Array([1]) });
     * ```
     */
    function validateSigOpts(opts) {
        validateVerOpts(opts);
        if (opts.extraEntropy !== false && opts.extraEntropy !== undefined)
            abytes(opts.extraEntropy, undefined, 'opts.extraEntropy');
    }
    /**
     * Builds a fixed-layout coder from byte lengths and nested coders.
     * Raw-length fields decode as zero-copy `subarray(...)` views, and nested coders may preserve that
     * aliasing too. Nested coder `encode(...)` results are treated as owned scratch: `splitCoder`
     * copies them into the output and then zeroizes them with `fill(0)`. If a nested encoder forwards
     * caller-owned bytes, it must do so only after detaching them into a disposable copy.
     * @param label - Label used in validation errors.
     * @param lengths - Field lengths or nested coders.
     * @returns Composite fixed-length coder.
     * @example
     * Build a fixed-layout coder from byte lengths and nested coders.
     * ```ts
     * splitCoder('demo', 1, 2).encode([new Uint8Array([1]), new Uint8Array([2, 3])]);
     * ```
     */
    function splitCoder(label, ...lengths) {
        const getLength = (c) => typeof c === 'number' ? c : c.bytesLen;
        const bytesLen = lengths.reduce((sum, a) => sum + getLength(a), 0);
        return {
            bytesLen,
            encode: (bufs) => {
                const res = new Uint8Array(bytesLen);
                for (let i = 0, pos = 0; i < lengths.length; i++) {
                    const c = lengths[i];
                    const l = getLength(c);
                    const b = typeof c === 'number' ? bufs[i] : c.encode(bufs[i]);
                    abytes(b, l, label);
                    res.set(b, pos);
                    if (typeof c !== 'number')
                        b.fill(0); // clean
                    pos += l;
                }
                return res;
            },
            decode: (buf) => {
                abytes(buf, bytesLen, label);
                const res = [];
                for (const c of lengths) {
                    const l = getLength(c);
                    const b = buf.subarray(0, l);
                    res.push(typeof c === 'number' ? b : c.decode(b));
                    buf = buf.subarray(l);
                }
                return res;
            },
        };
    }
    // nano-packed.array (fixed size)
    /**
     * Builds a fixed-length vector coder from another fixed-length coder.
     * Element decoding receives `subarray(...)` views, so aliasing depends on the element coder.
     * Element coder `encode(...)` results are treated as owned scratch: `vecCoder` copies them into
     * the output and then zeroizes them with `fill(0)`. If an element encoder forwards caller-owned
     * bytes, it must do so only after detaching them into a disposable copy. `vecCoder` also trusts
     * the `BytesCoderLen` contract: each encoded element must already be exactly `c.bytesLen` bytes.
     * @param c - Element coder.
     * @param vecLen - Number of elements in the vector.
     * @returns Fixed-length vector coder.
     * @example
     * Build a fixed-length vector coder from another fixed-length coder.
     * ```ts
     * vecCoder(
     *   { bytesLen: 1, encode: (n: number) => Uint8Array.of(n), decode: (b: Uint8Array) => b[0] || 0 },
     *   2
     * ).encode([1, 2]);
     * ```
     */
    function vecCoder(c, vecLen) {
        const coder = c;
        const bytesLen = vecLen * coder.bytesLen;
        return {
            bytesLen,
            encode: (u) => {
                if (u.length !== vecLen)
                    throw new RangeError(`vecCoder.encode: wrong length=${u.length}. Expected: ${vecLen}`);
                const res = new Uint8Array(bytesLen);
                for (let i = 0, pos = 0; i < u.length; i++) {
                    const b = coder.encode(u[i]);
                    res.set(b, pos);
                    b.fill(0); // clean
                    pos += b.length;
                }
                return res;
            },
            decode: (a) => {
                abytes(a, bytesLen);
                const r = [];
                for (let i = 0; i < a.length; i += coder.bytesLen)
                    r.push(coder.decode(a.subarray(i, i + coder.bytesLen)));
                return r;
            },
        };
    }
    /**
     * Overwrites supported typed-array inputs with zeroes in place.
     * Accepts direct typed arrays and one-level arrays of them.
     * @param list - Typed arrays or one-level lists of typed arrays to clear.
     * @example
     * Overwrite typed arrays with zeroes.
     * ```ts
     * const buf = Uint8Array.of(1, 2, 3);
     * cleanBytes(buf);
     * ```
     */
    function cleanBytes(...list) {
        for (const t of list) {
            if (Array.isArray(t))
                for (const b of t)
                    b.fill(0);
            else
                t.fill(0);
        }
    }
    /**
     * Creates a 32-bit mask with the lowest `bits` bits set.
     * @param bits - Number of low bits to keep.
     * @returns Bit mask with `bits` ones.
     * @throws On wrong argument ranges or values. {@link RangeError}
     * @example
     * Create a low-bit mask for packed-field operations.
     * ```ts
     * const mask = getMask(4);
     * ```
     */
    function getMask(bits) {
        if (!Number.isSafeInteger(bits) || bits < 0 || bits > 32)
            throw new RangeError(`expected bits in [0..32], got ${bits}`);
        // JS shifts are modulo 32, so bit 32 needs an explicit full-width mask.
        return bits === 32 ? 0xffffffff : ~(-1 << bits) >>> 0;
    }
    /** Shared empty byte array used as the default context. */
    const EMPTY = /* @__PURE__ */ Uint8Array.of();
    /**
     * Builds the domain-separated message payload for the pure sign/verify paths.
     * Context length `255` is valid; only `ctx.length > 255` is rejected.
     * @param msg - Message bytes.
     * @param ctx - Optional context bytes.
     * @returns Domain-separated message payload.
     * @throws On wrong argument ranges or values. {@link RangeError}
     * @example
     * Build the domain-separated payload before direct signing.
     * ```ts
     * const payload = getMessage(new Uint8Array([1, 2]));
     * ```
     */
    function getMessage(msg, ctx = EMPTY) {
        abytes(msg);
        abytes(ctx);
        if (ctx.length > 255)
            throw new RangeError('context should be 255 bytes or less');
        return concatBytes(new Uint8Array([0, ctx.length]), ctx, msg);
    }
    // DER tag+length plus the shared NIST hash OID arc 2.16.840.1.101.3.4.2.* used by the
    // FIPS 204 / FIPS 205 pre-hash wrappers; the final byte selects SHA-256, SHA-512, SHAKE128,
    // SHAKE256, or another approved hash/XOF under that subtree.
    // 06 09 60 86 48 01 65 03 04 02
    const oidNistP = /* @__PURE__ */ Uint8Array.from([6, 9, 0x60, 0x86, 0x48, 1, 0x65, 3, 4, 2]);
    /**
     * Validates that a hash exposes a NIST hash OID and enough collision resistance.
     * Current accepted surface is broader than the FIPS algorithm tables: any hash/XOF under the NIST
     * `2.16.840.1.101.3.4.2.*` subtree is accepted if its effective `outputLen` is strong enough.
     * XOF callers must pass a callable whose `outputLen` matches the digest length they actually intend
     * to sign; bare `shake128` / `shake256` defaults are too short for the stronger prehash modes.
     * @param hash - Hash function to validate.
     * @param requiredStrength - Minimum required collision-resistance strength in bits.
     * @throws If the hash metadata or collision resistance is insufficient. {@link Error}
     * @example
     * Validate that a hash exposes a NIST hash OID and enough collision resistance.
     * ```ts
     * import { sha256 } from '@noble/hashes/sha2.js';
     * import { checkHash } from '@noble/post-quantum/utils.js';
     * checkHash(sha256, 128);
     * ```
     */
    function checkHash(hash, requiredStrength = 0) {
        if (!hash.oid || !equalBytes(hash.oid.subarray(0, 10), oidNistP))
            throw new Error('hash.oid is invalid: expected NIST hash');
        // FIPS 204 / FIPS 205 require both collision and second-preimage strength; for approved NIST
        // hashes/XOFs under this OID subtree, the collision bound from the configured digest length is
        // the tighter runtime check, so enforce that lower bound here.
        const collisionResistance = (hash.outputLen * 8) / 2;
        if (requiredStrength > collisionResistance) {
            throw new Error('Pre-hash security strength too low: ' +
                collisionResistance +
                ', required: ' +
                requiredStrength);
        }
    }
    /**
     * Builds the domain-separated prehash payload for the prehash sign/verify paths.
     * Callers are expected to vet `hash.oid` first, e.g. via `checkHash(...)`; calling this helper
     * directly with a hash object that lacks `oid` currently throws later inside `concatBytes(...)`.
     * Context length `255` is valid; only `ctx.length > 255` is rejected.
     * @param hash - Prehash function.
     * @param msg - Message bytes.
     * @param ctx - Optional context bytes.
     * @returns Domain-separated prehash payload.
     * @throws On wrong argument ranges or values. {@link RangeError}
     * @example
     * Build the domain-separated prehash payload for external hashing.
     * ```ts
     * import { sha256 } from '@noble/hashes/sha2.js';
     * import { getMessagePrehash } from '@noble/post-quantum/utils.js';
     * getMessagePrehash(sha256, new Uint8Array([1, 2]));
     * ```
     */
    function getMessagePrehash(hash, msg, ctx = EMPTY) {
        abytes(msg);
        abytes(ctx);
        if (ctx.length > 255)
            throw new RangeError('context should be 255 bytes or less');
        const hashed = hash(msg);
        return concatBytes(new Uint8Array([1, ctx.length]), ctx, hash.oid, hashed);
    }

    /**
     * Internal methods for lattice-based ML-KEM and ML-DSA.
     * @module
     */
    /*! noble-post-quantum - MIT License (c) 2024 Paul Miller (paulmillr.com) */
    /**
     * Creates shared modular arithmetic, NTT, and packing helpers for CRYSTALS schemes.
     * @param opts - Polynomial and transform parameters. See {@link CrystalOpts}.
     * @returns CRYSTALS arithmetic and encoding helpers.
     * @example
     * Create shared modular arithmetic and NTT helpers for a CRYSTALS parameter set.
     * ```ts
     * const crystals = genCrystals({
     *   newPoly: (n) => new Uint16Array(n),
     *   N: 256,
     *   Q: 3329,
     *   F: 3303,
     *   ROOT_OF_UNITY: 17,
     *   brvBits: 7,
     *   isKyber: true,
     * });
     * const reduced = crystals.mod(-1);
     * ```
     */
    const genCrystals = (opts) => {
        // isKyber: true means Kyber, false means Dilithium
        const { newPoly, N, Q, F, ROOT_OF_UNITY, brvBits} = opts;
        // Normalize JS `%` into the canonical Z_m representative `[0, modulo-1]` expected by
        // FIPS 203 §2.3 / FIPS 204 §2.3 before downstream mod-q arithmetic.
        const mod = (a, modulo = Q) => {
            const result = a % modulo | 0;
            return (result >= 0 ? result | 0 : (modulo + result) | 0) | 0;
        };
        // FIPS 204 §7.4 uses the centered `mod ±` representative for low bits, keeping the
        // positive midpoint when `modulo` is even.
        // Center to `[-floor((modulo-1)/2), floor(modulo/2)]`.
        const smod = (a, modulo = Q) => {
            const r = mod(a, modulo) | 0;
            return (r > modulo >> 1 ? (r - modulo) | 0 : r) | 0;
        };
        // Kyber uses the FIPS 203 Appendix A `BitRev_7` table here via the first 128 entries, while
        // Dilithium uses the FIPS 204 §7.5 / Appendix B `BitRev_8` zetas table over all 256 entries.
        function getZettas() {
            const out = newPoly(N);
            for (let i = 0; i < N; i++) {
                const b = reverseBits(i, brvBits);
                const p = BigInt(ROOT_OF_UNITY) ** BigInt(b) % BigInt(Q);
                out[i] = Number(p) | 0;
            }
            return out;
        }
        const nttZetas = getZettas();
        // Number-Theoretic Transform
        // Explained: https://electricdusk.com/ntt.html
        // Kyber has slightly different params, since there is no 512th primitive root of unity mod q,
        // only 256th primitive root of unity mod. Which also complicates MultiplyNTT.
        const field = {
            add: (a, b) => mod((a | 0) + (b | 0)) | 0,
            sub: (a, b) => mod((a | 0) - (b | 0)) | 0,
            mul: (a, b) => mod((a | 0) * (b | 0)) | 0,
            inv: (_a) => {
                throw new Error('not implemented');
            },
        };
        const nttOpts = {
            N,
            roots: nttZetas,
            invertButterflies: true,
            skipStages: 0,
            brp: false,
        };
        const dif = FFTCore(field, { dit: false, ...nttOpts });
        const dit = FFTCore(field, { dit: true, ...nttOpts });
        const NTT = {
            encode: (r) => {
                return dif(r);
            },
            decode: (r) => {
                dit(r);
                // The inverse-NTT normalization factor is family-specific: FIPS 203 Algorithm 10 line 14
                // uses `128^-1 mod q` for Kyber, while FIPS 204 Algorithm 42 lines 21-23 use `256^-1 mod q`.
                // kyber uses 128 here, because brv && stuff
                for (let i = 0; i < r.length; i++)
                    r[i] = mod(F * r[i]);
                return r;
            },
        };
        // Pack one little-endian `d`-bit word per coefficient, matching FIPS 203 ByteEncode /
        // ByteDecode and the FIPS 204 BitsToBytes-based polynomial packing helpers.
        const bitsCoder = (d, c) => {
            const mask = getMask(d);
            const bytesLen = d * (N / 8);
            return {
                bytesLen,
                encode: (poly_) => {
                    const poly = poly_;
                    const r = new Uint8Array(bytesLen);
                    for (let i = 0, buf = 0, bufLen = 0, pos = 0; i < poly.length; i++) {
                        buf |= (c.encode(poly[i]) & mask) << bufLen;
                        bufLen += d;
                        for (; bufLen >= 8; bufLen -= 8, buf >>= 8)
                            r[pos++] = buf & getMask(bufLen);
                    }
                    return r;
                },
                decode: (bytes) => {
                    const r = newPoly(N);
                    for (let i = 0, buf = 0, bufLen = 0, pos = 0; i < bytes.length; i++) {
                        buf |= bytes[i] << bufLen;
                        bufLen += 8;
                        for (; bufLen >= d; bufLen -= d, buf >>= d)
                            r[pos++] = c.decode(buf & mask);
                    }
                    return r;
                },
            };
        };
        return {
            mod,
            smod,
            nttZetas: nttZetas,
            NTT: {
                encode: (r) => NTT.encode(r),
                decode: (r) => NTT.decode(r),
            },
            bitsCoder: bitsCoder,
        };
    };
    const createXofShake = (shake) => (seed, blockLen) => {
        if (!blockLen)
            blockLen = shake.blockLen;
        // Optimizations that won't mater:
        // - cached seed update (two .update(), on start and on the end)
        // - another cache which cloned into working copy
        // Faster than multiple updates, since seed less than blockLen
        const _seed = new Uint8Array(seed.length + 2);
        _seed.set(seed);
        const seedLen = seed.length;
        const buf = new Uint8Array(blockLen); // == shake128.blockLen
        let h = shake.create({});
        let calls = 0;
        let xofs = 0;
        return {
            stats: () => ({ calls, xofs }),
            get: (x, y) => {
                // Rebind to `seed || x || y` so callers can implement the spec's per-coordinate
                // SHAKE inputs like `rho || j || i` and `rho || IntegerToBytes(counter, 2)`.
                _seed[seedLen + 0] = x;
                _seed[seedLen + 1] = y;
                h.destroy();
                h = shake.create({}).update(_seed);
                calls++;
                return () => {
                    xofs++;
                    return h.xofInto(buf);
                };
            },
            clean: () => {
                h.destroy();
                cleanBytes(buf, _seed);
            },
        };
    };
    /**
     * SHAKE128-based extendable-output reader factory used by ML-KEM.
     * `get(x, y)` selects one coordinate pair at a time; calling it again invalidates previously
     * returned readers, and each squeeze reuses one mutable internal output buffer.
     * @param seed - Seed bytes for the reader.
     * @param blockLen - Optional output block length.
     * @returns Stateful XOF reader.
     * @example
     * Build the ML-KEM SHAKE128 matrix expander and read one block.
     * ```ts
     * import { randomBytes } from '@noble/post-quantum/utils.js';
     * import { XOF128 } from '@noble/post-quantum/_crystals.js';
     * const reader = XOF128(randomBytes(32));
     * const block = reader.get(0, 0)();
     * ```
     */
    const XOF128 = /* @__PURE__ */ createXofShake(shake128);
    /**
     * SHAKE256-based extendable-output reader factory used by ML-DSA.
     * `get(x, y)` appends raw one-byte coordinates to the seed, invalidates previously returned
     * readers, and reuses one mutable internal output buffer for each squeeze.
     * @param seed - Seed bytes for the reader.
     * @param blockLen - Optional output block length.
     * @returns Stateful XOF reader.
     * @example
     * Build the ML-DSA SHAKE256 coefficient expander and read one block.
     * ```ts
     * import { randomBytes } from '@noble/post-quantum/utils.js';
     * import { XOF256 } from '@noble/post-quantum/_crystals.js';
     * const reader = XOF256(randomBytes(32));
     * const block = reader.get(0, 0)();
     * ```
     */
    const XOF256 = /* @__PURE__ */ createXofShake(shake256);

    /**
     * ML-DSA: Module Lattice-based Digital Signature Algorithm from
     * [FIPS-204](https://csrc.nist.gov/pubs/fips/204/ipd). A.k.a. CRYSTALS-Dilithium.
     *
     * Has similar internals to ML-KEM, but their keys and params are different.
     * Check out [official site](https://www.pq-crystals.org/dilithium/index.shtml),
     * [repo](https://github.com/pq-crystals/dilithium).
     * @module
     */
    /*! noble-post-quantum - MIT License (c) 2024 Paul Miller (paulmillr.com) */
    function validateInternalOpts(opts) {
        validateOpts(opts);
        if (opts.externalMu !== undefined)
            abool(opts.externalMu, 'opts.externalMu');
    }
    // Constants
    // FIPS 204 fixes ML-DSA over R = Z[X]/(X^256 + 1), so every polynomial has 256 coefficients.
    const N = 256;
    // 2**23 − 2**13 + 1, 23 bits: multiply will be 46. We have enough precision in JS to avoid bigints
    const Q = 8380417;
    // FIPS 204 §2.5 / Table 1 fixes zeta = 1753 as the 512th root of unity used by ML-DSA's NTT.
    const ROOT_OF_UNITY = 1753;
    // f = 256**−1 mod q, pow(256, -1, q) = 8347681 (python3)
    const F = 8347681;
    // FIPS 204 Table 1 / §7.4 fixes d = 13 dropped low bits for Power2Round on t.
    const D = 13;
    // FIPS 204 Table 1 fixes gamma2 to (q-1)/88 for ML-DSA-44 and (q-1)/32 for ML-DSA-65/87;
    // §7.4 then uses alpha = 2*gamma2 for Decompose / MakeHint / UseHint.
    // Dilithium is kinda parametrized over GAMMA2, but everything will break with any other value.
    const GAMMA2_1 = Math.floor((Q - 1) / 88) | 0;
    const GAMMA2_2 = Math.floor((Q - 1) / 32) | 0;
    /** Internal params for different versions of ML-DSA  */
    // prettier-ignore
    /** Built-in ML-DSA parameter presets keyed by security categories `2/3/5`
     * for `ml_dsa44` / `ml_dsa65` / `ml_dsa87`.
     * This is only the Table 1 subset used directly here: `BETA = TAU * ETA` is derived later,
     * while `C_TILDE_BYTES`, `TR_BYTES`, `CRH_BYTES`, and `securityLevel` live in the preset wrappers.
     */
    const PARAMS = /* @__PURE__ */ (() => Object.freeze({
        2: Object.freeze({
            K: 4, L: 4, D, GAMMA1: 2 ** 17, GAMMA2: GAMMA2_1, TAU: 39, ETA: 2, OMEGA: 80
        }),
        3: Object.freeze({
            K: 6, L: 5, D, GAMMA1: 2 ** 19, GAMMA2: GAMMA2_2, TAU: 49, ETA: 4, OMEGA: 55
        }),
        5: Object.freeze({
            K: 8, L: 7, D, GAMMA1: 2 ** 19, GAMMA2: GAMMA2_2, TAU: 60, ETA: 2, OMEGA: 75
        }),
    }))();
    const newPoly = (n) => new Int32Array(n);
    // Shared CRYSTALS helper in the ML-DSA branch: non-Kyber mode, 8-bit bit-reversal,
    // and Int32Array polys because ordinary-form coefficients can be negative / centered.
    const crystals = /* @__PURE__ */ genCrystals({
        N,
        Q,
        F,
        ROOT_OF_UNITY,
        newPoly,
        brvBits: 8,
    });
    const id = (n) => n;
    // compress()/verify() must be compatible in both directions:
    // wrap the shared d-bit packer with the FIPS 204 SimpleBitPack / BitPack coefficient maps.
    // malformed-input rejection only happens through the optional verify hook.
    const polyCoder = (d, compress = id, verify = id) => crystals.bitsCoder(d, {
        encode: (i) => compress(verify(i)),
        decode: (i) => verify(compress(i)),
    });
    // Mutates `a` in place; callers must pass same-length polynomials.
    const polyAdd = (a_, b_) => {
        const a = a_;
        const b = b_;
        for (let i = 0; i < a.length; i++)
            a[i] = crystals.mod(a[i] + b[i]);
        return a;
    };
    // Mutates `a` in place; callers must pass same-length polynomials.
    const polySub = (a_, b_) => {
        const a = a_;
        const b = b_;
        for (let i = 0; i < a.length; i++)
            a[i] = crystals.mod(a[i] - b[i]);
        return a;
    };
    // Mutates `p` in place and assumes it is a decoded `t1`-range polynomial.
    const polyShiftl = (p_) => {
        const p = p_;
        for (let i = 0; i < N; i++)
            p[i] <<= D;
        return p;
    };
    const polyChknorm = (p_, B) => {
        const p = p_;
        // FIPS 204 Algorithms 7 and 8 express the same centered-norm check with explicit inequalities.
        for (let i = 0; i < N; i++)
            if (Math.abs(crystals.smod(p[i])) >= B)
                return true;
        return false;
    };
    // Both inputs must already be in NTT / `T_q` form.
    const MultiplyNTTs = (a_, b_) => {
        const a = a_;
        const b = b_;
        // NOTE: we don't use montgomery reduction in code, since it requires 64 bit ints,
        // which is not available in JS. mod(a[i] * b[i]) is ok, since Q is 23 bit,
        // which means a[i] * b[i] is 46 bit, which is safe to use in JS. (number is 53 bits).
        // Barrett reduction is slower than mod :(
        const c = newPoly(N);
        for (let i = 0; i < a.length; i++)
            c[i] = crystals.mod(a[i] * b[i]);
        return c;
    };
    // Return poly in NTT representation
    function RejNTTPoly(xof_) {
        const xof = xof_;
        // Samples a polynomial ∈ Tq. xof() must return byte lengths divisible by 3.
        const r = newPoly(N);
        // NOTE: we can represent 3xu24 as 4xu32, but it doesn't improve perf :(
        for (let j = 0; j < N;) {
            const b = xof();
            if (b.length % 3)
                throw new Error('RejNTTPoly: unaligned block');
            for (let i = 0; j < N && i <= b.length - 3; i += 3) {
                // FIPS 204 Algorithm 14 clears the top bit of b2 before forming the 23-bit candidate.
                const t = (b[i + 0] | (b[i + 1] << 8) | (b[i + 2] << 16)) & 0x7fffff; // 3 bytes
                if (t < Q)
                    r[j++] = t;
            }
        }
        return r;
    }
    // Instantiate one ML-DSA parameter set from the Table 1 lattice constants plus the
    // Table 2 byte lengths / hash-width choices used by the public wrappers below.
    function getDilithium(opts_) {
        const opts = opts_;
        const { K, L, GAMMA1, GAMMA2, TAU, ETA, OMEGA } = opts;
        const { CRH_BYTES, TR_BYTES, C_TILDE_BYTES, XOF128, XOF256, securityLevel } = opts;
        if (![2, 4].includes(ETA))
            throw new Error('Wrong ETA');
        if (![1 << 17, 1 << 19].includes(GAMMA1))
            throw new Error('Wrong GAMMA1');
        if (![GAMMA2_1, GAMMA2_2].includes(GAMMA2))
            throw new Error('Wrong GAMMA2');
        const BETA = TAU * ETA;
        const decompose = (r) => {
            // Decomposes r into (r1, r0) such that r ≡ r1(2γ2) + r0 mod q.
            const rPlus = crystals.mod(r);
            const r0 = crystals.smod(rPlus, 2 * GAMMA2) | 0;
            // FIPS 204 Algorithm 36 folds the top bucket `q-1` back to `(r1, r0) = (0, r0-1)`.
            if (rPlus - r0 === Q - 1)
                return { r1: 0 | 0, r0: (r0 - 1) | 0 };
            const r1 = Math.floor((rPlus - r0) / (2 * GAMMA2)) | 0;
            return { r1, r0 }; // r1 = HighBits, r0 = LowBits
        };
        const HighBits = (r) => decompose(r).r1;
        const LowBits = (r) => decompose(r).r0;
        const MakeHint = (z, r) => {
            // Compute hint bit indicating whether adding z to r alters the high bits of r.
            // FIPS 204 §6.2 also permits the Section 5.1 alternative from [6], which uses the
            // transformed low-bits/high-bits state at this call site instead of Algorithm 39 literally.
            // This optimized predicate only applies to those transformed Section 5.1 inputs; it is
            // not a drop-in replacement for Algorithm 39 on arbitrary `(z, r)` pairs.
            // From dilithium code
            const res0 = z <= GAMMA2 || z > Q - GAMMA2 || (z === Q - GAMMA2 && r === 0) ? 0 : 1;
            // from FIPS204:
            // // const r1 = HighBits(r);
            // // const v1 = HighBits(r + z);
            // // const res1 = +(r1 !== v1);
            // But they return different results! However, decompose is same.
            // So, either there is a bug in Dilithium ref implementation or in FIPS204.
            // For now, lets use dilithium one, so test vectors can be passed.
            // The round-3 Dilithium / ML-DSA code uses the same low-bits / high-bits convention after
            // `r0 += ct0`.
            // See dilithium-py README section "Optimising decomposition and making hints".
            return res0;
        };
        const UseHint = (h, r) => {
            // Returns the high bits of r adjusted according to hint h
            const m = Math.floor((Q - 1) / (2 * GAMMA2));
            const { r1, r0 } = decompose(r);
            // 3: if h = 1 and r0 > 0 return (r1 + 1) mod m
            // 4: if h = 1 and r0 ≤ 0 return (r1 − 1) mod m
            if (h === 1)
                return r0 > 0 ? crystals.mod(r1 + 1, m) | 0 : crystals.mod(r1 - 1, m) | 0;
            return r1 | 0;
        };
        const Power2Round = (r) => {
            // Decomposes r into (r1, r0) such that r ≡ r1*(2**d) + r0 mod q.
            const rPlus = crystals.mod(r);
            const r0 = crystals.smod(rPlus, 2 ** D) | 0;
            return { r1: Math.floor((rPlus - r0) / 2 ** D) | 0, r0 };
        };
        const hintCoder = {
            bytesLen: OMEGA + K,
            encode: (h_) => {
                const h = h_;
                if (h === false)
                    throw new Error('hint.encode: hint is false'); // should never happen
                const res = new Uint8Array(OMEGA + K);
                for (let i = 0, k = 0; i < K; i++) {
                    for (let j = 0; j < N; j++)
                        if (h[i][j] !== 0)
                            res[k++] = j;
                    res[OMEGA + i] = k;
                }
                return res;
            },
            decode: (buf) => {
                const h = [];
                let k = 0;
                for (let i = 0; i < K; i++) {
                    const hi = newPoly(N);
                    if (buf[OMEGA + i] < k || buf[OMEGA + i] > OMEGA)
                        return false;
                    for (let j = k; j < buf[OMEGA + i]; j++) {
                        if (j > k && buf[j] <= buf[j - 1])
                            return false;
                        hi[buf[j]] = 1;
                    }
                    k = buf[OMEGA + i];
                    h.push(hi);
                }
                for (let j = k; j < OMEGA; j++)
                    if (buf[j] !== 0)
                        return false;
                return h;
            },
        };
        const ETACoder = polyCoder(ETA === 2 ? 3 : 4, (i) => ETA - i, (i) => {
            if (!(-ETA <= i && i <= ETA))
                throw new Error(`malformed key s1/s3 ${i} outside of ETA range [${-ETA}, ${ETA}]`);
            return i;
        });
        const T0Coder = polyCoder(13, (i) => (1 << (D - 1)) - i);
        const T1Coder = polyCoder(10);
        // Requires smod. Need to fix!
        const ZCoder = polyCoder(GAMMA1 === 1 << 17 ? 18 : 20, (i) => crystals.smod(GAMMA1 - i));
        const W1Coder = polyCoder(GAMMA2 === GAMMA2_1 ? 6 : 4);
        const W1Vec = vecCoder(W1Coder, K);
        // Main structures
        const publicCoder = splitCoder('publicKey', 32, vecCoder(T1Coder, K));
        const secretCoder = splitCoder('secretKey', 32, 32, TR_BYTES, vecCoder(ETACoder, L), vecCoder(ETACoder, K), vecCoder(T0Coder, K));
        const sigCoder = splitCoder('signature', C_TILDE_BYTES, vecCoder(ZCoder, L), hintCoder);
        const CoefFromHalfByte = ETA === 2
            ? (n) => (n < 15 ? 2 - (n % 5) : false)
            : (n) => (n < 9 ? 4 - n : false);
        // Return poly in ordinary representation.
        // This helper returns ordinary-form `[-ETA, ETA]` coefficients for ExpandS; callers apply
        // `NTT.encode()` later when needed.
        function RejBoundedPoly(xof_) {
            const xof = xof_;
            // Samples an element a ∈ Rq with coeffcients in [−η, η] computed via rejection sampling from ρ.
            const r = newPoly(N);
            for (let j = 0; j < N;) {
                const b = xof();
                for (let i = 0; j < N && i < b.length; i += 1) {
                    // half byte. Should be superfast with vector instructions. But very slow with js :(
                    const d1 = CoefFromHalfByte(b[i] & 0x0f);
                    const d2 = CoefFromHalfByte((b[i] >> 4) & 0x0f);
                    if (d1 !== false)
                        r[j++] = d1;
                    if (j < N && d2 !== false)
                        r[j++] = d2;
                }
            }
            return r;
        }
        const SampleInBall = (seed) => {
            // Samples a polynomial c ∈ Rq with coeffcients from {−1, 0, 1} and Hamming weight τ
            const pre = newPoly(N);
            const s = shake256.create({}).update(seed);
            const buf = new Uint8Array(shake256.blockLen);
            s.xofInto(buf);
            // FIPS 204 Algorithm 29 uses the first 8 squeezed bytes as the 64 sign bits `h`,
            // then rejection-samples coefficient positions from the remaining XOF stream.
            const masks = buf.slice(0, 8);
            for (let i = N - TAU, pos = 8, maskPos = 0, maskBit = 0; i < N; i++) {
                let b = i + 1;
                for (; b > i;) {
                    b = buf[pos++];
                    if (pos < shake256.blockLen)
                        continue;
                    s.xofInto(buf);
                    pos = 0;
                }
                pre[i] = pre[b];
                pre[b] = 1 - (((masks[maskPos] >> maskBit++) & 1) << 1);
                if (maskBit >= 8) {
                    maskPos++;
                    maskBit = 0;
                }
            }
            return pre;
        };
        const polyPowerRound = (p_) => {
            const p = p_;
            const res0 = newPoly(N);
            const res1 = newPoly(N);
            for (let i = 0; i < p.length; i++) {
                const { r0, r1 } = Power2Round(p[i]);
                res0[i] = r0;
                res1[i] = r1;
            }
            return { r0: res0, r1: res1 };
        };
        const polyUseHint = (u_, h_) => {
            const u = u_;
            const h = h_;
            // In-place on `u`: verification only needs the recovered high bits, so reuse the
            // temporary `wApprox` buffer instead of allocating another polynomial.
            for (let i = 0; i < N; i++)
                u[i] = UseHint(h[i], u[i]);
            return u;
        };
        const polyMakeHint = (a_, b_) => {
            const a = a_;
            const b = b_;
            const v = newPoly(N);
            let cnt = 0;
            for (let i = 0; i < N; i++) {
                const h = MakeHint(a[i], b[i]);
                v[i] = h;
                cnt += h;
            }
            return { v, cnt };
        };
        const signRandBytes = 32;
        const seedCoder = splitCoder('seed', 32, 64, 32);
        // API & argument positions are exactly as in FIPS204.
        const internal = Object.freeze({
            info: Object.freeze({ type: 'internal-ml-dsa' }),
            lengths: Object.freeze({
                secretKey: secretCoder.bytesLen,
                publicKey: publicCoder.bytesLen,
                seed: 32,
                signature: sigCoder.bytesLen,
                signRand: signRandBytes,
            }),
            keygen: (seed) => {
                // H(𝜉||IntegerToBytes(𝑘, 1)||IntegerToBytes(ℓ, 1), 128) 2: ▷ expand seed
                const seedDst = new Uint8Array(32 + 2);
                const randSeed = seed === undefined;
                if (randSeed)
                    seed = randomBytes(32);
                abytesDoc(seed, 32, 'seed');
                seedDst.set(seed);
                if (randSeed)
                    cleanBytes(seed);
                seedDst[32] = K;
                seedDst[33] = L;
                const [rho, rhoPrime, K_] = seedCoder.decode(shake256(seedDst, { dkLen: seedCoder.bytesLen }));
                const xofPrime = XOF256(rhoPrime);
                const s1 = [];
                for (let i = 0; i < L; i++)
                    s1.push(RejBoundedPoly(xofPrime.get(i & 0xff, (i >> 8) & 0xff)));
                const s2 = [];
                for (let i = L; i < L + K; i++)
                    s2.push(RejBoundedPoly(xofPrime.get(i & 0xff, (i >> 8) & 0xff)));
                const s1Hat = s1.map((i) => crystals.NTT.encode(i.slice()));
                const t0 = [];
                const t1 = [];
                const xof = XOF128(rho);
                const t = newPoly(N);
                for (let i = 0; i < K; i++) {
                    // t ← NTT−1(A*NTT(s1)) + s2
                    cleanBytes(t); // don't-reallocate
                    for (let j = 0; j < L; j++) {
                        const aij = RejNTTPoly(xof.get(j, i)); // super slow!
                        polyAdd(t, MultiplyNTTs(aij, s1Hat[j]));
                    }
                    crystals.NTT.decode(t);
                    const { r0, r1 } = polyPowerRound(polyAdd(t, s2[i])); // (t1, t0) ← Power2Round(t, d)
                    t0.push(r0);
                    t1.push(r1);
                }
                const publicKey = publicCoder.encode([rho, t1]); // pk ← pkEncode(ρ, t1)
                const tr = shake256(publicKey, { dkLen: TR_BYTES }); // tr ← H(BytesToBits(pk), 512)
                // sk ← skEncode(ρ, K,tr, s1, s2, t0)
                const secretKey = secretCoder.encode([rho, K_, tr, s1, s2, t0]);
                xof.clean();
                xofPrime.clean();
                // STATS
                // Kyber512: { calls: 4, xofs: 12 }, Kyber768: { calls: 9, xofs: 27 },
                // Kyber1024: { calls: 16, xofs: 48 }
                // DSA44: { calls: 24, xofs: 24 }, DSA65: { calls: 41, xofs: 41 },
                // DSA87: { calls: 71, xofs: 71 }
                cleanBytes(rho, rhoPrime, K_, s1, s2, s1Hat, t, t0, t1, tr, seedDst);
                return {
                    publicKey: publicKey,
                    secretKey: secretKey,
                };
            },
            getPublicKey: (secretKey) => {
                // (ρ, K,tr, s1, s2, t0) ← skDecode(sk)
                const [rho, _K, _tr, s1, s2, _t0] = secretCoder.decode(secretKey);
                const xof = XOF128(rho);
                const s1Hat = s1.map((p) => crystals.NTT.encode(p.slice()));
                const t1 = [];
                const tmp = newPoly(N);
                for (let i = 0; i < K; i++) {
                    tmp.fill(0);
                    for (let j = 0; j < L; j++) {
                        const aij = RejNTTPoly(xof.get(j, i)); // A_ij in NTT
                        polyAdd(tmp, MultiplyNTTs(aij, s1Hat[j])); // += A_ij * s1_j
                    }
                    crystals.NTT.decode(tmp); // NTT⁻¹
                    polyAdd(tmp, s2[i]); // t_i = A·s1 + s2
                    const { r1 } = polyPowerRound(tmp); // r1 = t1, r0 ≈ t0
                    t1.push(r1);
                }
                xof.clean();
                cleanBytes(tmp, s1Hat, _t0, s1, s2);
                return publicCoder.encode([rho, t1]);
            },
            // NOTE: random is optional.
            sign: (msg, secretKey, opts = {}) => {
                validateSigOpts(opts);
                validateInternalOpts(opts);
                let { extraEntropy: random, externalMu = false } = opts;
                // This part can be pre-cached per secretKey, but there is only minor performance improvement,
                // since we re-use a lot of variables to computation.
                // (ρ, K,tr, s1, s2, t0) ← skDecode(sk)
                const [rho, _K, tr, s1, s2, t0] = secretCoder.decode(secretKey);
                // Cache matrix to avoid re-compute later
                const A = []; // A ← ExpandA(ρ)
                const xof = XOF128(rho);
                for (let i = 0; i < K; i++) {
                    const pv = [];
                    for (let j = 0; j < L; j++)
                        pv.push(RejNTTPoly(xof.get(j, i)));
                    A.push(pv);
                }
                xof.clean();
                for (let i = 0; i < L; i++)
                    crystals.NTT.encode(s1[i]); // sˆ1 ← NTT(s1)
                for (let i = 0; i < K; i++) {
                    crystals.NTT.encode(s2[i]); // sˆ2 ← NTT(s2)
                    crystals.NTT.encode(t0[i]); // tˆ0 ← NTT(t0)
                }
                // This part is per msg
                const mu = externalMu
                    ? msg
                    : // 6: µ ← H(tr||M, 512)
                        //    ▷ Compute message representative µ
                        shake256.create({ dkLen: CRH_BYTES }).update(tr).update(msg).digest();
                // Compute private random seed
                const rnd = random === false
                    ? new Uint8Array(32)
                    : random === undefined
                        ? randomBytes(signRandBytes)
                        : random;
                abytesDoc(rnd, 32, 'extraEntropy');
                const rhoprime = shake256
                    .create({ dkLen: CRH_BYTES })
                    .update(_K)
                    .update(rnd)
                    .update(mu)
                    .digest(); // ρ′← H(K||rnd||µ, 512)
                abytesDoc(rhoprime, CRH_BYTES);
                const x256 = XOF256(rhoprime, ZCoder.bytesLen);
                //  Rejection sampling loop
                main_loop: for (let kappa = 0;;) {
                    const y = [];
                    // y ← ExpandMask(ρ , κ)
                    for (let i = 0; i < L; i++, kappa++)
                        y.push(ZCoder.decode(x256.get(kappa & 0xff, kappa >> 8)()));
                    const z = y.map((i) => crystals.NTT.encode(i.slice()));
                    const w = [];
                    for (let i = 0; i < K; i++) {
                        // w ← NTT−1(A ◦ NTT(y))
                        const wi = newPoly(N);
                        for (let j = 0; j < L; j++)
                            polyAdd(wi, MultiplyNTTs(A[i][j], z[j]));
                        crystals.NTT.decode(wi);
                        w.push(wi);
                    }
                    const w1 = w.map((j) => j.map(HighBits)); // w1 ← HighBits(w)
                    // Commitment hash: c˜ ∈{0, 1 2λ } ← H(µ||w1Encode(w1), 2λ)
                    const cTilde = shake256
                        .create({ dkLen: C_TILDE_BYTES })
                        .update(mu)
                        .update(W1Vec.encode(w1))
                        .digest();
                    // Verifer’s challenge
                    // c ← SampleInBall(c˜1); cˆ ← NTT(c)
                    const cHat = crystals.NTT.encode(SampleInBall(cTilde));
                    // ⟨⟨cs1⟩⟩ ← NTT−1(cˆ◦ sˆ1)
                    const cs1 = s1.map((i) => MultiplyNTTs(i, cHat));
                    for (let i = 0; i < L; i++) {
                        polyAdd(crystals.NTT.decode(cs1[i]), y[i]); // z ← y + ⟨⟨cs1⟩⟩
                        if (polyChknorm(cs1[i], GAMMA1 - BETA))
                            continue main_loop; // ||z||∞ ≥ γ1 − β
                    }
                    // cs1 is now z (▷ Signer’s response)
                    let cnt = 0;
                    const h = [];
                    for (let i = 0; i < K; i++) {
                        const cs2 = crystals.NTT.decode(MultiplyNTTs(s2[i], cHat)); // ⟨⟨cs2⟩⟩ ← NTT−1(cˆ◦ sˆ2)
                        const r0 = polySub(w[i], cs2).map(LowBits); // r0 ← LowBits(w − ⟨⟨cs2⟩⟩)
                        if (polyChknorm(r0, GAMMA2 - BETA))
                            continue main_loop; // ||r0||∞ ≥ γ2 − β
                        const ct0 = crystals.NTT.decode(MultiplyNTTs(t0[i], cHat)); // ⟨⟨ct0⟩⟩ ← NTT−1(cˆ◦ tˆ0)
                        if (polyChknorm(ct0, GAMMA2))
                            continue main_loop;
                        polyAdd(r0, ct0);
                        // ▷ Signer’s hint
                        const hint = polyMakeHint(r0, w1[i]); // h ← MakeHint(−⟨⟨ct0⟩⟩, w− ⟨⟨cs2⟩⟩ + ⟨⟨ct0⟩⟩)
                        h.push(hint.v);
                        cnt += hint.cnt;
                    }
                    if (cnt > OMEGA)
                        continue; // the number of 1’s in h is greater than ω
                    x256.clean();
                    const res = sigCoder.encode([cTilde, cs1, h]); // σ ← sigEncode(c˜, z mod±q, h)
                    // rho, _K, tr is subarray of secretKey, cannot clean.
                    cleanBytes(cTilde, cs1, h, cHat, w1, w, z, y, rhoprime, s1, s2, t0, ...A);
                    // `externalMu` hands ownership of `mu` to the caller,
                    // so only wipe the internally derived digest form here;
                    // zeroizing caller memory would break the caller's own reuse / verify path.
                    if (!externalMu)
                        cleanBytes(mu);
                    return res;
                }
                // @ts-ignore
                throw new Error('Unreachable code path reached, report this error');
            },
            verify: (sig, msg, publicKey, opts = {}) => {
                validateInternalOpts(opts);
                const { externalMu = false } = opts;
                // ML-DSA.Verify(pk, M, σ): Verifes a signature σ for a message M.
                const [rho, t1] = publicCoder.decode(publicKey); // (ρ, t1) ← pkDecode(pk)
                const tr = shake256(publicKey, { dkLen: TR_BYTES }); // 6: tr ← H(BytesToBits(pk), 512)
                if (sig.length !== sigCoder.bytesLen)
                    return false; // return false instead of exception
                // (c˜, z, h) ← sigDecode(σ)
                // ▷ Signer’s commitment hash c ˜, response z and hint
                const [cTilde, z, h] = sigCoder.decode(sig);
                if (h === false)
                    return false; // if h = ⊥ then return false
                for (let i = 0; i < L; i++)
                    if (polyChknorm(z[i], GAMMA1 - BETA))
                        return false;
                const mu = externalMu
                    ? msg
                    : // 7: µ ← H(tr||M, 512)
                        shake256.create({ dkLen: CRH_BYTES }).update(tr).update(msg).digest();
                // Compute verifer’s challenge from c˜
                const c = crystals.NTT.encode(SampleInBall(cTilde)); // c ← SampleInBall(c˜1)
                const zNtt = z.map((i) => i.slice()); // zNtt = NTT(z)
                for (let i = 0; i < L; i++)
                    crystals.NTT.encode(zNtt[i]);
                const wTick1 = [];
                const xof = XOF128(rho);
                for (let i = 0; i < K; i++) {
                    const ct12d = MultiplyNTTs(crystals.NTT.encode(polyShiftl(t1[i])), c); //c * t1 * (2**d)
                    const Az = newPoly(N); // // A * z
                    for (let j = 0; j < L; j++) {
                        const aij = RejNTTPoly(xof.get(j, i)); // A[i][j] inplace
                        polyAdd(Az, MultiplyNTTs(aij, zNtt[j]));
                    }
                    // wApprox = A*z - c*t1 * (2**d)
                    const wApprox = crystals.NTT.decode(polySub(Az, ct12d));
                    // Reconstruction of signer’s commitment
                    wTick1.push(polyUseHint(wApprox, h[i])); // w ′ ← UseHint(h, w'approx )
                }
                xof.clean();
                // c˜′← H (µ||w1Encode(w′1), 2λ),  Hash it; this should match c˜
                const c2 = shake256
                    .create({ dkLen: C_TILDE_BYTES })
                    .update(mu)
                    .update(W1Vec.encode(wTick1))
                    .digest();
                // Additional checks in FIPS-204:
                // [[ ||z||∞ < γ1 − β ]] and [[c ˜ = c˜′]] and [[number of 1’s in h is ≤ ω]]
                for (const t of h) {
                    const sum = t.reduce((acc, i) => acc + i, 0);
                    if (!(sum <= OMEGA))
                        return false;
                }
                for (const t of z)
                    if (polyChknorm(t, GAMMA1 - BETA))
                        return false;
                return equalBytes(cTilde, c2);
            },
        });
        return Object.freeze({
            info: Object.freeze({ type: 'ml-dsa' }),
            internal,
            securityLevel: securityLevel,
            keygen: internal.keygen,
            lengths: internal.lengths,
            getPublicKey: internal.getPublicKey,
            sign: (msg, secretKey, opts = {}) => {
                validateSigOpts(opts);
                const M = getMessage(msg, opts.context);
                const res = internal.sign(M, secretKey, opts);
                cleanBytes(M);
                return res;
            },
            verify: (sig, msg, publicKey, opts = {}) => {
                validateVerOpts(opts);
                return internal.verify(sig, getMessage(msg, opts.context), publicKey);
            },
            prehash: (hash) => {
                checkHash(hash, securityLevel);
                return Object.freeze({
                    info: Object.freeze({ type: 'hashml-dsa' }),
                    securityLevel: securityLevel,
                    lengths: internal.lengths,
                    keygen: internal.keygen,
                    getPublicKey: internal.getPublicKey,
                    sign: (msg, secretKey, opts = {}) => {
                        validateSigOpts(opts);
                        const M = getMessagePrehash(hash, msg, opts.context);
                        const res = internal.sign(M, secretKey, opts);
                        cleanBytes(M);
                        return res;
                    },
                    verify: (sig, msg, publicKey, opts = {}) => {
                        validateVerOpts(opts);
                        return internal.verify(sig, getMessagePrehash(hash, msg, opts.context), publicKey);
                    },
                });
            },
        });
    }
    /** ML-DSA-44 for 128-bit security level. Not recommended after 2030, as per ASD. */
    const ml_dsa44 = /* @__PURE__ */ (() => getDilithium({
        ...PARAMS[2],
        CRH_BYTES: 64,
        TR_BYTES: 64,
        C_TILDE_BYTES: 32,
        XOF128,
        XOF256,
        securityLevel: 128,
    }))();

    const PQ_SEED_KEY = utf8ToBytes("Neurai PQ seed");
    const PQ_PUBLIC_KEY_HEADER = 0x05;
    // 74-byte layout, padded to match BIP32 xprv so base58check yields "xpqp..."/"tpqp...":
    // depth(1) + fingerprint(4) + child(4) + chaincode(32) + padding(1=0x00) + pq_seed(32)
    const BIP32_PQ_EXTKEY_SIZE = 74;
    class PQHDKey {
        constructor(depth, index, parentFingerprint, chainCode, pqSeed) {
            this.depth = depth;
            this.index = index;
            this.parentFingerprint = parentFingerprint;
            this.chainCode = chainCode;
            this.pqSeed = pqSeed;
        }
        static fromMasterSeed(seed) {
            const I = hmacSha512(PQ_SEED_KEY, seed);
            return new PQHDKey(0, 0, new Uint8Array(4), I.slice(32, 64), I.slice(0, 32));
        }
        ensureKeypair() {
            if (!this._publicKey || !this._secretKey) {
                const { publicKey, secretKey } = ml_dsa44.keygen(this.pqSeed);
                this._publicKey = publicKey;
                this._secretKey = secretKey;
            }
        }
        get publicKey() {
            this.ensureKeypair();
            return this._publicKey;
        }
        get secretKey() {
            this.ensureKeypair();
            return this._secretKey;
        }
        get fingerprint() {
            return hash160(concatBytes$2(Uint8Array.from([PQ_PUBLIC_KEY_HEADER]), this.publicKey)).slice(0, 4);
        }
        deriveChild(index) {
            if ((index & HARDENED_OFFSET) === 0) {
                throw new Error("PQ-HD (NIP-022) requires hardened derivation at every level");
            }
            const data = concatBytes$2(Uint8Array.from([0x00]), this.pqSeed, uint32ToBytesBE(index >>> 0));
            const I = hmacSha512(this.chainCode, data);
            return new PQHDKey(this.depth + 1, index >>> 0, this.fingerprint, I.slice(32, 64), I.slice(0, 32));
        }
        encode() {
            const out = new Uint8Array(BIP32_PQ_EXTKEY_SIZE);
            out[0] = this.depth & 0xff;
            out.set(this.parentFingerprint, 1);
            out[5] = (this.index >>> 24) & 0xff;
            out[6] = (this.index >>> 16) & 0xff;
            out[7] = (this.index >>> 8) & 0xff;
            out[8] = this.index & 0xff;
            out.set(this.chainCode, 9);
            out[41] = 0x00; // padding byte (aligns layout with BIP32 xprv)
            out.set(this.pqSeed, 42);
            return out;
        }
        encodeBase58Check(version) {
            const versionBytes = Uint8Array.from([
                (version >>> 24) & 0xff,
                (version >>> 16) & 0xff,
                (version >>> 8) & 0xff,
                version & 0xff,
            ]);
            return base58CheckEncode(concatBytes$2(versionBytes, this.encode()));
        }
        static decode(raw, parentFingerprint) {
            if (raw.length !== BIP32_PQ_EXTKEY_SIZE) {
                throw new Error(`PQ extended key payload must be ${BIP32_PQ_EXTKEY_SIZE} bytes`);
            }
            if (raw[41] !== 0x00) {
                throw new Error("PQ extended key padding byte (offset 41) must be 0x00");
            }
            const depth = raw[0];
            const fingerprint = parentFingerprint ?? raw.slice(1, 5);
            const index = ((raw[5] << 24) | (raw[6] << 16) | (raw[7] << 8) | raw[8]) >>> 0;
            const chainCode = raw.slice(9, 41);
            const pqSeed = raw.slice(42, 74);
            return new PQHDKey(depth, index, Uint8Array.from(fingerprint.slice(0, 4)), chainCode, pqSeed);
        }
        static decodeBase58Check(extKey, expectedVersion) {
            const payload = base58CheckDecode(extKey);
            if (payload.length !== 4 + BIP32_PQ_EXTKEY_SIZE) {
                throw new Error("Invalid PQ extended key length");
            }
            const version = ((payload[0] << 24) | (payload[1] << 16) | (payload[2] << 8) | payload[3]) >>> 0;
            if (version !== (expectedVersion >>> 0)) {
                throw new Error(`PQ extended key version mismatch (expected 0x${expectedVersion.toString(16)}, got 0x${version.toString(16)})`);
            }
            return PQHDKey.decode(payload.slice(4));
        }
        derive(path) {
            const entries = path.split("/");
            const root = entries[0];
            if (root !== "m" && root !== "M" && root !== "m_pq" && root !== "M_pq") {
                throw new Error('PQ path must start with "m_pq" (or "m")');
            }
            if (entries.length === 1) {
                return this;
            }
            let current = this;
            for (let i = 1; i < entries.length; i += 1) {
                const entry = entries[i];
                const hardened = entry.endsWith("'");
                if (!hardened) {
                    throw new Error(`PQ-HD path requires hardened indices (got "${entry}")`);
                }
                const raw = /^\d+'$/.test(entry) ? Number(entry.slice(0, -1)) : Number.NaN;
                if (!Number.isSafeInteger(raw) || raw >= HARDENED_OFFSET) {
                    throw new Error(`Invalid PQ-HD index "${entry}"`);
                }
                current = current.deriveChild(raw + HARDENED_OFFSET);
            }
            return current;
        }
    }

    /**
     * Neurai address types. Each one fixes the encoding, the key and the derivation path.
     * Base58 versions, WIF and BIP32 versions are chain parameters (chain-params.ts).
     * Values are given for mainnet and testnet; regtest uses the testnet values.
     *
     * AuthScript commitment (Bech32m types), with the witness version as lead byte:
     *   tagged_hash("NeuraiAuthScript", witnessVersion || auth_descriptor || SHA256(witnessScript))
     */
    /**
     * Legacy: Base58Check P2PKH, secp256k1 key.
     * Path: m/44'/coinType'/account'/change/index
     * Library networks: "xna-legacy" / "xna-legacy-test"
     */
    const legacy = {
        encoding: "base58",
        key: "secp256k1",
        purpose: 44,
        coinType: { mainnet: 1900, testnet: 1 },
    };
    /**
     * Old legacy: Legacy with the historical coin type 0, kept by the node wallet
     * because exchanges and early wallets use it. Not recommended for new wallets.
     * Path: m/44'/0'/account'/change/index
     * Library network: "xna-old-legacy" (mainnet only: on testnet/regtest the coin
     * type is 1, the same path as legacy, so "xna-legacy-test" covers it)
     */
    const oldLegacy = {
        ...legacy,
        coinType: { mainnet: 0, testnet: 1 },
    };
    /**
     * PQ: strict AuthScript, Bech32m witness v2 (pq1z... / tpq1z...).
     * ML-DSA-44 key from the native PQ HD tree (NIP-022), fixed OP_TRUE witnessScript.
     * Auth descriptor: 0x01 || HASH160(0x05 || pq_pubkey)
     * Path: m_pq/100'/coinType'/account'/change'/index' (all hardened)
     * Library networks: "xna-pq" / "xna-pq-test"
     */
    const pq = {
        hrp: { mainnet: "pq", testnet: "tpq" },
        witnessVersion: 2,
        purpose: 100,
        coinType: { mainnet: 1900, testnet: 1 },
        extendedPrivateKey: { mainnet: 0x0488ac24, testnet: 0x043581d5 }, // xpqp / tpqp
    };
    /**
     * ECDSA: strict AuthScript, Bech32m witness v3 (nq1r... / tnq1r...).
     * Compressed secp256k1 key, fixed OP_TRUE witnessScript.
     * Auth descriptor: 0x02 || HASH160(compressed_pubkey)
     * Path: m/84'/coinType'/account'/change/index
     * Library networks: "xna" / "xna-test"
     */
    const ecdsa = {
        encoding: "bech32m",
        hrp: { mainnet: "nq", testnet: "tnq" },
        witnessVersion: 3,
        purpose: 84,
        coinType: { mainnet: 1900, testnet: 1 },
    };
    /**
     * Generic AuthScript: Bech32m witness v1 (nc1p... / tnc1p...), used for contracts.
     * Any authType and any witnessScript:
     *   0x00 NoAuth: no key
     *   0x01 PQ:     ML-DSA-44 key from the pq tree
     *   0x02 Legacy: secp256k1 key from the legacy (BIP44) tree
     * Library networks: "xna-authscript" / "xna-authscript-test"
     */
    const authscript = {
        hrp: { mainnet: "nc", testnet: "tnc" },
        witnessVersion: 1};
    const addressTypes = { legacy, oldLegacy, pq, ecdsa, authscript };

    /**
     * Neurai chain parameters, one entry per network.
     * Mirrors the node's src/chainparams.cpp and src/chainparamsbase.cpp (Neurai 2.0.0).
     * Address-type specific values (HRPs, derivation paths) are in address-types.ts.
     */
    const neurai = {
        name: "Neurai",
        unit: "XNA",
        symbol: "xna",
        decimalPlaces: 100000000,
        messagePrefix: "Neurai Signed Message:\n",
        confirmations: 6,
        website: "https://neurai.org/",
        projectUrl: "https://github.com/NeuraiProject",
    };
    const mainnet = {
        ...neurai,
        network: "mainnet",
        id: "94C49B3B-2C88-4408-B566-3D277C596778",
        hashGenesisBlock: "00000044d33c0c0ba019be5c0249730424a69cb4c222153322f68c6104484806",
        port: 19000,
        portRpc: 19001,
        magic: 1381320014, // "NEUR"
        seedsDns: [
            "dns.neurai.org",
            "neurai.satopool.com",
            "seed1.neurai.org",
            "seed2.neurai.org",
            "seed3.neurai.org",
            "neurai-ipv6.neuraiexplorer.com",
            "neurai-ipv4.neuraiexplorer.com",
            "main-seed.neurai.top",
            "node.neurai.org",
        ],
        base58: {
            pubKeyHash: 53, // N...
            scriptHash: 117,
            wif: 128,
        },
        bip32: {
            private: 0x0488ade4, // xprv
            public: 0x0488b21e, // xpub
        },
    };
    const testnet = {
        ...neurai,
        network: "testnet",
        id: "1EB2ACBA-E8E0-4970-BB20-37DA4B70F6A6",
        // Reset testnet genesis: fixed SHA256d hash, time 1790380800 and nonce 3409810.
        hashGenesisBlock: "0000008b384aeffecdab182575dc4e86c9f07f90318c65088532660ed9a8a021",
        port: 19100,
        portRpc: 19101,
        magic: 1313166674, // "RUEN"
        seedsDns: [
            "testnet1.neurai.org",
            "testnet2.neurai.org",
            "testnet3.neurai.org",
            "seed-testnet.neurai.org",
            "testnet.neurai.top",
        ],
        base58: {
            pubKeyHash: 127, // t...
            scriptHash: 196,
            wif: 239,
        },
        bip32: {
            private: 0x04358394, // tprv
            public: 0x043587cf, // tpub
        },
    };
    // Regtest shares magic and every address/key prefix with testnet; only ports and genesis differ.
    const regtest = {
        ...testnet,
        network: "regtest",
        id: undefined,
        hashGenesisBlock: "5241e503402b81548ea32dbfd7b670829b30fb83220a92ad9804ad893ecdce71",
        port: 19200,
        portRpc: 19201,
        seedsDns: [],
    };
    const chainParams = { mainnet, testnet, regtest };

    const EXTERNAL_BRANCH = 0;
    function secp256k1Config(type, chain) {
        const params = chainParams[chain];
        return {
            versions: {
                bip32: params.bip32,
                bip44: type.coinType[chain],
                private: params.base58.wif,
                public: params.base58.pubKeyHash,
                scripthash: params.base58.scriptHash,
            },
            purpose: type.purpose,
            bech32: type.encoding === "bech32m" ? { hrp: type.hrp[chain], witnessVersion: type.witnessVersion } : undefined,
        };
    }
    function pqConfig(chain) {
        const { pq } = addressTypes;
        return {
            hrp: pq.hrp[chain],
            witnessVersion: pq.witnessVersion,
            purpose: pq.purpose,
            coinType: pq.coinType[chain],
            changeIndex: EXTERNAL_BRANCH,
            pqExtPrivVersion: pq.extendedPrivateKey[chain],
        };
    }
    function authScriptConfig(chain, pqNetwork) {
        const { authscript } = addressTypes;
        return {
            hrp: authscript.hrp[chain],
            witnessVersion: authscript.witnessVersion,
            pqNetwork,
            wifVersion: chainParams[chain].base58.wif,
        };
    }
    const secp256k1Networks = {
        xna: secp256k1Config(addressTypes.ecdsa, "mainnet"),
        "xna-test": secp256k1Config(addressTypes.ecdsa, "testnet"),
        "xna-legacy": secp256k1Config(addressTypes.legacy, "mainnet"),
        "xna-legacy-test": secp256k1Config(addressTypes.legacy, "testnet"),
        "xna-old-legacy": secp256k1Config(addressTypes.oldLegacy, "mainnet"),
    };
    const pqNetworks = {
        "xna-pq": pqConfig("mainnet"),
        "xna-pq-test": pqConfig("testnet"),
    };
    const authScriptNetworks = {
        "xna-authscript": authScriptConfig("mainnet", "xna-pq"),
        "xna-authscript-test": authScriptConfig("testnet", "xna-pq-test"),
    };
    function getNetwork(name) {
        const network = secp256k1Networks[name];
        if (!network) {
            throw new Error(`network must be of value ${Object.keys(secp256k1Networks).toString()}`);
        }
        return network;
    }
    function getPQNetwork(name) {
        const network = pqNetworks[name];
        if (!network) {
            throw new Error("PQ network must be 'xna-pq' or 'xna-pq-test'");
        }
        return network;
    }
    function getAuthScriptNetwork(name) {
        const network = authScriptNetworks[name];
        if (!network) {
            throw new Error("AuthScript network must be 'xna-authscript' or 'xna-authscript-test'");
        }
        return network;
    }

    const mnemonicWordlists = [
        wordlist$8,
        wordlist$7,
        wordlist$1,
        wordlist$6,
        wordlist$5,
        wordlist$4,
        wordlist$3,
        wordlist$2,
        wordlist,
    ];
    // Account and index become BIP32 path segments: integers below the hardened offset.
    function assertPathIndex(name, value) {
        if (!Number.isInteger(value) || value < 0 || value >= 0x80000000) {
            throw new Error(`${name} must be an integer between 0 and 2147483647 (got ${value})`);
        }
    }
    // ---------------------------------------------------------------------------
    // secp256k1 addresses. The network selects the address type:
    //   "xna" / "xna-test":               ECDSA, Bech32m witness v3, m/84'/coin'
    //   "xna-legacy" / "xna-legacy-test": Legacy Base58, m/44'/1900' (testnet m/44'/1')
    //   "xna-old-legacy":                 Legacy Base58, m/44'/0' (mainnet only)
    // ---------------------------------------------------------------------------
    // The address and the witness fields come from the same commitment, so it is
    // computed once here rather than again inside ecdsaPublicKeyToAddressBytes().
    function ecdsaAddressFields(publicKey, bech32) {
        const parts = ecdsaPublicKeyToCommitmentParts(publicKey);
        return {
            address: commitmentToAddressBytes(parts.commitment, bech32),
            witnessVersion: 0x03,
            authType: 0x02,
            authDescriptor: bytesToHex$1(parts.authDescriptor),
            commitment: bytesToHex$1(parts.commitment),
            witnessScript: bytesToHex$1(parts.witnessScript),
        };
    }
    function secp256k1AddressObject(chain, privateKey, path) {
        const publicKey = getCompressedPublicKey(privateKey);
        return {
            ...(chain.bech32
                ? ecdsaAddressFields(publicKey, chain.bech32)
                : { address: publicKeyToAddressBytes(publicKey, chain.versions) }),
            path,
            publicKey: bytesToHex$1(publicKey),
            privateKey: bytesToHex$1(privateKey),
            WIF: encodeWIF(privateKey, chain.versions.private),
        };
    }
    function getCoinType(network) {
        return getNetwork(network).versions.bip44;
    }
    function getAddressPair(network, mnemonic, account, position, passphrase = "") {
        assertPathIndex("account", account);
        assertPathIndex("position", position);
        const chain = getNetwork(network);
        const hdKey = getHDKey(network, mnemonic, passphrase);
        const accountPath = `m/${chain.purpose}'/${chain.versions.bip44}'/${account}'`;
        const externalPath = `${accountPath}/0/${position}`;
        const internalPath = `${accountPath}/1/${position}`;
        return {
            internal: getAddressByPath(network, hdKey, internalPath),
            external: getAddressByPath(network, hdKey, externalPath),
            position,
        };
    }
    function getHDKey(network, mnemonic, passphrase = "") {
        const chain = getNetwork(network);
        const seed = mnemonicToSeedBytes(mnemonicToSeedSync, mnemonic, passphrase);
        return HDKey.fromMasterSeed(seed, chain.versions.bip32);
    }
    function getAddressByPath(network, hdKey, path) {
        const chain = getNetwork(network);
        const derived = hdKey.derive(path);
        if (!derived.privateKey) {
            throw new Error("Could not derive private key for path");
        }
        return secp256k1AddressObject(chain, derived.privateKey, path);
    }
    function generateMnemonic() {
        return generateMnemonic$1(wordlist$7);
    }
    function isMnemonicValid(mnemonic) {
        return mnemonicWordlists.some((wordlist) => validateMnemonic(mnemonic, wordlist));
    }
    function getAddressByWIF(network, privateKeyWIF) {
        const chain = getNetwork(network);
        if (!chain.bech32) {
            return addressObjectFromWIF(privateKeyWIF, chain.versions);
        }
        const decoded = decodeWIF(privateKeyWIF, chain.versions.private);
        if (!decoded.compressed) {
            throw new Error("ECDSA (witness v3) addresses require a compressed WIF");
        }
        const publicKey = getCompressedPublicKey(decoded.privateKey);
        return {
            ...ecdsaAddressFields(publicKey, chain.bech32),
            privateKey: bytesToHex$1(decoded.privateKey),
            WIF: encodeWIF(decoded.privateKey, chain.versions.private),
        };
    }
    function getPubkeyByWIF(network, privateKeyWIF) {
        return publicKeyHexFromWIF(privateKeyWIF, getNetwork(network).versions.private);
    }
    function entropyToMnemonic(entropy) {
        const normalized = typeof entropy === "string" ? ensureBytes(entropy) : entropy;
        return entropyToMnemonic$1(normalized, wordlist$7);
    }
    // Keep the Legacy default for compatibility; ECDSA witness v3 starts at testnet height 10.
    function generateAddressObject(network = "xna-legacy", passphrase = "") {
        const mnemonic = generateMnemonic();
        const addressObject = getAddressPair(network, mnemonic, 0, 0, passphrase).external;
        return {
            ...addressObject,
            mnemonic,
            network,
        };
    }
    function publicKeyToAddress(network, publicKey) {
        const keyBytes = normalizePublicKey(publicKey);
        const chain = getNetwork(network);
        if (!chain.bech32 && keyBytes.length !== 33 && keyBytes.length !== 65) {
            throw new Error("Public key must be 33 or 65 bytes");
        }
        assertValidSecp256k1PublicKey(keyBytes);
        return secp256k1PublicKeyToAddressBytes(keyBytes, chain);
    }
    function generateAddress(network = "xna-legacy") {
        return generateAddressObject(network);
    }
    // ---------------------------------------------------------------------------
    // PQ addresses: strict AuthScript witness v2 (pq1z... / tpq1z...).
    // ML-DSA-44 key from the native PQ tree, fixed OP_TRUE witnessScript.
    // ---------------------------------------------------------------------------
    // 4.x PQ functions took AuthScript options. PQ (witness v2) has a fixed OP_TRUE
    // witnessScript, so reject them instead of silently dropping a contract script.
    function rejectRemovedPQOptions(fn, replacement, options) {
        if (options !== undefined) {
            throw new Error(`${fn}() no longer accepts AuthScript options: PQ addresses (witness v2) use a fixed OP_TRUE witnessScript. ` +
                `Use ${replacement}() with an "xna-authscript" network for a custom witnessScript.`);
        }
    }
    function assertPQPublicKey(keyBytes) {
        if (keyBytes.length !== 1312) {
            throw new Error("ML-DSA-44 public key must be 1312 bytes");
        }
    }
    function getPQHDKey(_network, mnemonic, passphrase = "") {
        const seed = mnemonicToSeedBytes(mnemonicToSeedSync, mnemonic, passphrase);
        return PQHDKey.fromMasterSeed(seed);
    }
    function pqExtendedPrivateKey(network, hdKey) {
        return hdKey.encodeBase58Check(getPQNetwork(network).pqExtPrivVersion);
    }
    function pqHDKeyFromExtended(network, extKey) {
        return PQHDKey.decodeBase58Check(extKey, getPQNetwork(network).pqExtPrivVersion);
    }
    function getPQAddressByPath(network, hdKey, path, removedOptions) {
        rejectRemovedPQOptions("getPQAddressByPath", "getPQAuthScriptAddressByPath", removedOptions);
        const chain = getPQNetwork(network);
        const derived = hdKey.derive(path);
        const publicKey = derived.publicKey;
        const parts = pqPublicKeyToCommitmentParts(publicKey);
        return {
            address: commitmentToAddressBytes(parts.commitment, chain),
            witnessVersion: 0x02,
            authType: 0x01,
            authDescriptor: bytesToHex$1(parts.authDescriptor),
            commitment: bytesToHex$1(parts.commitment),
            path,
            publicKey: bytesToHex$1(publicKey),
            privateKey: bytesToHex$1(derived.secretKey),
            seedKey: bytesToHex$1(derived.pqSeed),
            witnessScript: bytesToHex$1(parts.witnessScript),
        };
    }
    function pqDefaultPath(network, account, index) {
        assertPathIndex("account", account);
        assertPathIndex("index", index);
        const chain = getPQNetwork(network);
        return `m_pq/${chain.purpose}'/${chain.coinType}'/${account}'/${chain.changeIndex}'/${index}'`;
    }
    function getPQAddress(network, mnemonic, account, index, passphrase = "", removedOptions) {
        rejectRemovedPQOptions("getPQAddress", "getPQAuthScriptAddress", removedOptions);
        const hdKey = getPQHDKey(network, mnemonic, passphrase);
        return getPQAddressByPath(network, hdKey, pqDefaultPath(network, account, index));
    }
    function pqPublicKeyToAddress(network, publicKey, removedOptions) {
        rejectRemovedPQOptions("pqPublicKeyToAddress", "pqPublicKeyToAuthScriptAddress", removedOptions);
        const keyBytes = ensureBytes(publicKey);
        assertPQPublicKey(keyBytes);
        return pqPublicKeyToAddressBytes(keyBytes, getPQNetwork(network));
    }
    function pqPublicKeyToCommitmentHex(publicKey, removedOptions) {
        rejectRemovedPQOptions("pqPublicKeyToCommitmentHex", "pqPublicKeyToAuthScriptCommitmentHex", removedOptions);
        const keyBytes = ensureBytes(publicKey);
        assertPQPublicKey(keyBytes);
        return bytesToHex$1(pqPublicKeyToCommitmentParts(keyBytes).commitment);
    }
    function pqPublicKeyToAuthDescriptorHex(publicKey) {
        const keyBytes = ensureBytes(publicKey);
        assertPQPublicKey(keyBytes);
        return bytesToHex$1(pqPublicKeyToAuthDescriptor(keyBytes));
    }
    function generatePQAddressObject(network = "xna-pq", passphrase = "", removedOptions) {
        rejectRemovedPQOptions("generatePQAddressObject", "getPQAuthScriptAddress", removedOptions);
        const mnemonic = generateMnemonic();
        return {
            ...getPQAddress(network, mnemonic, 0, 0, passphrase),
            mnemonic,
        };
    }
    // ---------------------------------------------------------------------------
    // Generic AuthScript: witness v1 (nc1p... / tnc1p...). Any authType and any
    // witnessScript; used for contracts.
    // ---------------------------------------------------------------------------
    function getPQAuthScriptAddressByPath(network, hdKey, path, options = {}) {
        const chain = getAuthScriptNetwork(network);
        const derived = hdKey.derive(path);
        const publicKey = derived.publicKey;
        const parts = authScriptCommitmentParts(0x01, publicKey, options);
        return {
            address: commitmentToAddressBytes(parts.commitment, chain),
            witnessVersion: 0x01,
            authType: 0x01,
            authDescriptor: bytesToHex$1(parts.authDescriptor),
            commitment: bytesToHex$1(parts.commitment),
            path,
            publicKey: bytesToHex$1(publicKey),
            privateKey: bytesToHex$1(derived.secretKey),
            seedKey: bytesToHex$1(derived.pqSeed),
            witnessScript: bytesToHex$1(parts.witnessScript),
        };
    }
    function getPQAuthScriptAddress(network, mnemonic, account, index, passphrase = "", options = {}) {
        const pqNetwork = getAuthScriptNetwork(network).pqNetwork;
        const hdKey = getPQHDKey(pqNetwork, mnemonic, passphrase);
        return getPQAuthScriptAddressByPath(network, hdKey, pqDefaultPath(pqNetwork, account, index), options);
    }
    function pqPublicKeyToAuthScriptAddress(network, publicKey, options = {}) {
        const keyBytes = ensureBytes(publicKey);
        assertPQPublicKey(keyBytes);
        normalizeWitnessScript(options.witnessScript);
        return authScriptToAddressBytes(0x01, keyBytes, getAuthScriptNetwork(network), options);
    }
    function pqPublicKeyToAuthScriptCommitmentHex(publicKey, options = {}) {
        const keyBytes = ensureBytes(publicKey);
        assertPQPublicKey(keyBytes);
        return bytesToHex$1(authScriptCommitmentParts(0x01, keyBytes, options).commitment);
    }
    // NoAuth has no key, so the witnessScript alone decides who can spend: never
    // default it. The library only checks that a script is given, not that it is safe.
    function getNoAuthAddress(network, options) {
        const chain = getAuthScriptNetwork(network);
        if (options?.witnessScript === undefined || options?.witnessScript === null) {
            throw new Error("getNoAuthAddress() requires an explicit witnessScript: a NoAuth address has no key, " +
                "so the script alone defines who can spend it");
        }
        const parts = authScriptCommitmentParts(0x00, null, options);
        return {
            address: commitmentToAddressBytes(parts.commitment, chain),
            witnessVersion: 0x01,
            authType: 0x00,
            commitment: bytesToHex$1(parts.commitment),
            witnessScript: bytesToHex$1(parts.witnessScript),
        };
    }
    function getLegacyAuthScriptAddress(network, keyNetwork, mnemonic, account, index, passphrase = "", options = {}) {
        assertPathIndex("account", account);
        assertPathIndex("index", index);
        // The secp256k1 key is the one keyNetwork derives at this account/index.
        const chain = getAuthScriptNetwork(network);
        const keyChain = getNetwork(keyNetwork);
        const hdKey = getHDKey(keyNetwork, mnemonic, passphrase);
        const path = `m/${keyChain.purpose}'/${keyChain.versions.bip44}'/${account}'/0/${index}`;
        const derived = hdKey.derive(path);
        if (!derived.privateKey) {
            throw new Error("Could not derive private key for path");
        }
        const publicKeyBytes = getCompressedPublicKey(derived.privateKey);
        const parts = authScriptCommitmentParts(0x02, publicKeyBytes, options);
        return {
            address: commitmentToAddressBytes(parts.commitment, chain),
            path,
            publicKey: bytesToHex$1(publicKeyBytes),
            privateKey: bytesToHex$1(derived.privateKey),
            WIF: encodeWIF(derived.privateKey, keyChain.versions.private),
            witnessVersion: 0x01,
            authType: 0x02,
            authDescriptor: bytesToHex$1(parts.authDescriptor),
            commitment: bytesToHex$1(parts.commitment),
            witnessScript: bytesToHex$1(parts.witnessScript),
        };
    }
    function getLegacyAuthScriptAddressByWIF(network, wif, options = {}) {
        const chain = getAuthScriptNetwork(network);
        const publicKeyHex = publicKeyHexFromWIF(wif, chain.wifVersion);
        const publicKeyBytes = ensureBytes(publicKeyHex);
        const parts = authScriptCommitmentParts(0x02, publicKeyBytes, options);
        return {
            address: commitmentToAddressBytes(parts.commitment, chain),
            publicKey: publicKeyHex,
            privateKey: "",
            WIF: wif,
            witnessVersion: 0x01,
            authType: 0x02,
            authDescriptor: bytesToHex$1(parts.authDescriptor),
            commitment: bytesToHex$1(parts.commitment),
            witnessScript: bytesToHex$1(parts.witnessScript),
        };
    }
    const NeuraiKey = {
        entropyToMnemonic,
        generateAddress,
        generateAddressObject,
        generateMnemonic,
        getAddressByPath,
        getAddressByWIF,
        getPubkeyByWIF,
        getAddressPair,
        getCoinType,
        getHDKey,
        isMnemonicValid,
        publicKeyToAddress,
        getPQAddress,
        getPQAddressByPath,
        getPQHDKey,
        pqExtendedPrivateKey,
        pqHDKeyFromExtended,
        pqPublicKeyToAddress,
        pqPublicKeyToAuthDescriptorHex,
        pqPublicKeyToCommitmentHex,
        generatePQAddressObject,
        getPQAuthScriptAddress,
        getPQAuthScriptAddressByPath,
        pqPublicKeyToAuthScriptAddress,
        pqPublicKeyToAuthScriptCommitmentHex,
        getNoAuthAddress,
        getLegacyAuthScriptAddress,
        getLegacyAuthScriptAddressByWIF,
    };

    globalThis.NeuraiKey = NeuraiKey;

    return NeuraiKey;

})();
//# sourceMappingURL=NeuraiKey.global.js.map
