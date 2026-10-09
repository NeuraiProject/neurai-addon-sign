var NeuraiMessage = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/global.ts
  var global_exports = {};
  __export(global_exports, {
    AUTHSCRIPT_PROGRAM_LENGTH: () => AUTHSCRIPT_PROGRAM_LENGTH,
    AUTHSCRIPT_WITNESS_VERSION: () => AUTHSCRIPT_WITNESS_VERSION,
    STRICT_ECDSA_WITNESS_VERSION: () => STRICT_ECDSA_WITNESS_VERSION,
    STRICT_PQ_WITNESS_VERSION: () => STRICT_PQ_WITNESS_VERSION,
    decodeAddress: () => decodeAddress,
    default: () => global_default,
    isWitnessAddress: () => isWitnessAddress,
    messageHash: () => messageHash,
    sign: () => sign2,
    signECDSAWitnessMessage: () => signECDSAWitnessMessage,
    signPQMessage: () => signPQMessage,
    strictMessageHash: () => strictMessageHash,
    tryDecodeAddress: () => tryDecodeAddress,
    verifyECDSAWitnessMessage: () => verifyECDSAWitnessMessage,
    verifyLegacyMessage: () => verifyLegacyMessage,
    verifyMessage: () => verifyMessage,
    verifyPQMessage: () => verifyPQMessage
  });

  // src/browser.ts
  var browser_exports = {};
  __export(browser_exports, {
    AUTHSCRIPT_PROGRAM_LENGTH: () => AUTHSCRIPT_PROGRAM_LENGTH,
    AUTHSCRIPT_WITNESS_VERSION: () => AUTHSCRIPT_WITNESS_VERSION,
    STRICT_ECDSA_WITNESS_VERSION: () => STRICT_ECDSA_WITNESS_VERSION,
    STRICT_PQ_WITNESS_VERSION: () => STRICT_PQ_WITNESS_VERSION,
    decodeAddress: () => decodeAddress,
    isWitnessAddress: () => isWitnessAddress,
    messageHash: () => messageHash,
    sign: () => sign2,
    signECDSAWitnessMessage: () => signECDSAWitnessMessage,
    signPQMessage: () => signPQMessage,
    strictMessageHash: () => strictMessageHash,
    tryDecodeAddress: () => tryDecodeAddress,
    verifyECDSAWitnessMessage: () => verifyECDSAWitnessMessage,
    verifyLegacyMessage: () => verifyLegacyMessage,
    verifyMessage: () => verifyMessage,
    verifyPQMessage: () => verifyPQMessage
  });

  // node_modules/@noble/curves/utils.js
  function abool(value, title = "") {
    if (typeof value !== "boolean") {
      const prefix = title && `"${title}" `;
      throw new TypeError(prefix + "expected boolean, got type=" + typeof value);
    }
    return value;
  }

  // node_modules/@noble/post-quantum/node_modules/@noble/hashes/_u64.js
  var U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
  var _32n = /* @__PURE__ */ BigInt(32);
  function fromBig(n, le = false) {
    if (le)
      return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
    return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
  }
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
  var rotlSH = (h, l, s) => h << s | l >>> 32 - s;
  var rotlSL = (h, l, s) => l << s | h >>> 32 - s;
  var rotlBH = (h, l, s) => l << s - 32 | h >>> 64 - s;
  var rotlBL = (h, l, s) => h << s - 32 | l >>> 64 - s;

  // node_modules/@noble/post-quantum/node_modules/@noble/hashes/utils.js
  function isBytes(a) {
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
  }
  function anumber(n, title = "") {
    if (typeof n !== "number") {
      const prefix = title && `"${title}" `;
      throw new TypeError(`${prefix}expected number, got ${typeof n}`);
    }
    if (!Number.isSafeInteger(n) || n < 0) {
      const prefix = title && `"${title}" `;
      throw new RangeError(`${prefix}expected integer >= 0, got ${n}`);
    }
  }
  function abytes(value, length, title = "") {
    const bytes = isBytes(value);
    const len = value?.length;
    const needsLen = length !== void 0;
    if (!bytes || needsLen && len !== length) {
      const prefix = title && `"${title}" `;
      const ofLen = needsLen ? ` of length ${length}` : "";
      const got = bytes ? `length=${len}` : `type=${typeof value}`;
      const message = prefix + "expected Uint8Array" + ofLen + ", got " + got;
      if (!bytes)
        throw new TypeError(message);
      throw new RangeError(message);
    }
    return value;
  }
  function aexists(instance, checkFinished = true) {
    if (instance.destroyed)
      throw new Error("Hash instance has been destroyed");
    if (checkFinished && instance.finished)
      throw new Error("Hash#digest() has already been called");
  }
  function aoutput(out, instance) {
    abytes(out, void 0, "digestInto() output");
    const min = instance.outputLen;
    if (out.length < min) {
      throw new RangeError('"digestInto() output" expected to be of length >=' + min);
    }
  }
  function u32(arr) {
    return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
  }
  function clean(...arrays) {
    for (let i = 0; i < arrays.length; i++) {
      arrays[i].fill(0);
    }
  }
  var isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
  function byteSwap(word) {
    return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
  }
  function byteSwap32(arr) {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = byteSwap(arr[i]);
    }
    return arr;
  }
  var swap32IfBE = isLE ? (u) => u : byteSwap32;
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
  function createHasher(hashCons, info = {}) {
    const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
    const tmp = hashCons(void 0);
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.canXOF = tmp.canXOF;
    hashC.create = (opts) => hashCons(opts);
    Object.assign(hashC, info);
    return Object.freeze(hashC);
  }
  function randomBytes(bytesLength = 32) {
    anumber(bytesLength, "bytesLength");
    const cr = typeof globalThis === "object" ? globalThis.crypto : null;
    if (typeof cr?.getRandomValues !== "function")
      throw new Error("crypto.getRandomValues must be defined");
    if (bytesLength > 65536)
      throw new RangeError(`"bytesLength" expected <= 65536, got ${bytesLength}`);
    return cr.getRandomValues(new Uint8Array(bytesLength));
  }
  var oidNist = (suffix) => ({
    // Current NIST hashAlgs suffixes used here fit in one DER subidentifier octet.
    // Larger suffix values would need base-128 OID encoding and a different length byte.
    oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix])
  });

  // node_modules/@noble/post-quantum/node_modules/@noble/hashes/sha3.js
  var _0n = BigInt(0);
  var _1n = BigInt(1);
  var _2n = BigInt(2);
  var _7n = BigInt(7);
  var _256n = BigInt(256);
  var _0x71n = BigInt(113);
  var SHA3_PI = [];
  var SHA3_ROTL = [];
  var _SHA3_IOTA = [];
  for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
    [x, y] = [y, (2 * x + 3 * y) % 5];
    SHA3_PI.push(2 * (5 * y + x));
    SHA3_ROTL.push((round + 1) * (round + 2) / 2 % 64);
    let t = _0n;
    for (let j = 0; j < 7; j++) {
      R = (R << _1n ^ (R >> _7n) * _0x71n) % _256n;
      if (R & _2n)
        t ^= _1n << (_1n << BigInt(j)) - _1n;
    }
    _SHA3_IOTA.push(t);
  }
  var IOTAS = split(_SHA3_IOTA, true);
  var SHA3_IOTA_H = IOTAS[0];
  var SHA3_IOTA_L = IOTAS[1];
  var rotlH = (h, l, s) => s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s);
  var rotlL = (h, l, s) => s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s);
  function keccakP(s, rounds = 24) {
    anumber(rounds, "rounds");
    if (rounds < 1 || rounds > 24)
      throw new Error('"rounds" expected integer 1..24');
    const B = new Uint32Array(5 * 2);
    for (let round = 24 - rounds; round < 24; round++) {
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
      s[0] ^= SHA3_IOTA_H[round];
      s[1] ^= SHA3_IOTA_L[round];
    }
    clean(B);
  }
  var Keccak = class _Keccak {
    // NOTE: we accept arguments in bytes instead of bits here.
    constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
      __publicField(this, "state");
      __publicField(this, "pos", 0);
      __publicField(this, "posOut", 0);
      __publicField(this, "finished", false);
      __publicField(this, "state32");
      __publicField(this, "destroyed", false);
      __publicField(this, "blockLen");
      __publicField(this, "suffix");
      __publicField(this, "outputLen");
      __publicField(this, "canXOF");
      __publicField(this, "enableXOF", false);
      __publicField(this, "rounds");
      this.blockLen = blockLen;
      this.suffix = suffix;
      this.outputLen = outputLen;
      this.enableXOF = enableXOF;
      this.canXOF = enableXOF;
      this.rounds = rounds;
      anumber(outputLen, "outputLen");
      if (!(0 < blockLen && blockLen < 200))
        throw new Error("only keccak-f1600 function is supported");
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
      for (let pos = 0; pos < len; ) {
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
      state[pos] ^= suffix;
      if ((suffix & 128) !== 0 && pos === blockLen - 1)
        this.keccak();
      state[blockLen - 1] ^= 128;
      this.keccak();
    }
    writeInto(out) {
      aexists(this, false);
      abytes(out);
      this.finish();
      const bufferOut = this.state;
      const { blockLen } = this;
      for (let pos = 0, len = out.length; pos < len; ) {
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
      if (!this.enableXOF)
        throw new Error("XOF is not possible for this instance");
      return this.writeInto(out);
    }
    xof(bytes) {
      anumber(bytes);
      return this.xofInto(new Uint8Array(bytes));
    }
    digestInto(out) {
      aoutput(out, this);
      if (this.finished)
        throw new Error("digest() was already called");
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
      to || (to = new _Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
      to.blockLen = blockLen;
      to.state32.set(this.state32);
      to.pos = this.pos;
      to.posOut = this.posOut;
      to.finished = this.finished;
      to.rounds = rounds;
      to.suffix = suffix;
      to.outputLen = outputLen;
      to.enableXOF = enableXOF;
      to.canXOF = this.canXOF;
      to.destroyed = this.destroyed;
      return to;
    }
  };
  var genShake = (suffix, blockLen, outputLen, info = {}) => createHasher((opts = {}) => new Keccak(blockLen, suffix, opts.dkLen === void 0 ? outputLen : opts.dkLen, true), info);
  var shake128 = /* @__PURE__ */ genShake(31, 168, 16, /* @__PURE__ */ oidNist(11));
  var shake256 = /* @__PURE__ */ genShake(31, 136, 32, /* @__PURE__ */ oidNist(12));

  // node_modules/@noble/curves/abstract/fft.js
  function checkU32(n) {
    if (!Number.isSafeInteger(n) || n < 0 || n > 4294967295)
      throw new Error("wrong u32 integer:" + n);
    return n;
  }
  function isPowerOfTwo(x) {
    checkU32(x);
    return (x & x - 1) === 0 && x !== 0;
  }
  function reverseBits(n, bits) {
    checkU32(n);
    if (!Number.isSafeInteger(bits) || bits < 0 || bits > 32)
      throw new Error(`expected integer 0 <= bits <= 32, got ${bits}`);
    let reversed = 0;
    for (let i = 0; i < bits; i++, n >>>= 1)
      reversed = reversed << 1 | n & 1;
    return reversed >>> 0;
  }
  function log2(n) {
    checkU32(n);
    return 31 - Math.clz32(n);
  }
  function bitReversalInplace(values) {
    const n = values.length;
    if (!isPowerOfTwo(n))
      throw new Error("expected positive power-of-two length, got " + n);
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
  var FFTCore = (F2, coreOpts) => {
    const { N: N3, roots, dit, invertButterflies = false, skipStages = 0, brp = true } = coreOpts;
    const bits = log2(N3);
    if (!isPowerOfTwo(N3))
      throw new Error("FFT: Polynomial size should be power of two");
    if (roots.length !== N3)
      throw new Error(`FFT: wrong roots length: expected ${N3}, got ${roots.length}`);
    const isDit = dit !== invertButterflies;
    isDit;
    return (values) => {
      if (values.length !== N3)
        throw new Error("FFT: wrong Polynomial length");
      if (dit && brp)
        bitReversalInplace(values);
      for (let i = 0, g = 1; i < bits - skipStages; i++) {
        const s = dit ? i + 1 + skipStages : bits - i;
        const m = 1 << s;
        const m2 = m >> 1;
        const stride = N3 >> s;
        for (let k = 0; k < N3; k += m) {
          for (let j = 0, grp = g++; j < m2; j++) {
            const rootPos = invertButterflies ? dit ? N3 - grp : grp : j * stride;
            const i0 = k + j;
            const i1 = k + j + m2;
            const omega = roots[rootPos];
            const b = values[i1];
            const a = values[i0];
            if (isDit) {
              const t = F2.mul(b, omega);
              values[i0] = F2.add(a, t);
              values[i1] = F2.sub(a, t);
            } else if (invertButterflies) {
              values[i0] = F2.add(b, a);
              values[i1] = F2.mul(F2.sub(b, a), omega);
            } else {
              values[i0] = F2.add(a, b);
              values[i1] = F2.mul(F2.sub(a, b), omega);
            }
          }
        }
      }
      if (!dit && brp)
        bitReversalInplace(values);
      return values;
    };
  };

  // node_modules/@noble/post-quantum/utils.js
  var abytesDoc = abytes;
  var randomBytes2 = randomBytes;
  function equalBytes(a, b) {
    if (a.length !== b.length)
      return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++)
      diff |= a[i] ^ b[i];
    return diff === 0;
  }
  function validateOpts(opts) {
    if (Object.prototype.toString.call(opts) !== "[object Object]")
      throw new TypeError("expected valid options object");
  }
  function validateVerOpts(opts) {
    validateOpts(opts);
    if (opts.context !== void 0)
      abytes(opts.context, void 0, "opts.context");
  }
  function validateSigOpts(opts) {
    validateVerOpts(opts);
    if (opts.extraEntropy !== false && opts.extraEntropy !== void 0)
      abytes(opts.extraEntropy, void 0, "opts.extraEntropy");
  }
  function splitCoder(label, ...lengths) {
    const getLength = (c) => typeof c === "number" ? c : c.bytesLen;
    const bytesLen = lengths.reduce((sum, a) => sum + getLength(a), 0);
    return {
      bytesLen,
      encode: (bufs) => {
        const res = new Uint8Array(bytesLen);
        for (let i = 0, pos = 0; i < lengths.length; i++) {
          const c = lengths[i];
          const l = getLength(c);
          const b = typeof c === "number" ? bufs[i] : c.encode(bufs[i]);
          abytes(b, l, label);
          res.set(b, pos);
          if (typeof c !== "number")
            b.fill(0);
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
          res.push(typeof c === "number" ? b : c.decode(b));
          buf = buf.subarray(l);
        }
        return res;
      }
    };
  }
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
          b.fill(0);
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
      }
    };
  }
  function cleanBytes(...list) {
    for (const t of list) {
      if (Array.isArray(t))
        for (const b of t)
          b.fill(0);
      else
        t.fill(0);
    }
  }
  function getMask(bits) {
    if (!Number.isSafeInteger(bits) || bits < 0 || bits > 32)
      throw new RangeError(`expected bits in [0..32], got ${bits}`);
    return bits === 32 ? 4294967295 : ~(-1 << bits) >>> 0;
  }
  var EMPTY = /* @__PURE__ */ Uint8Array.of();
  function getMessage(msg, ctx = EMPTY) {
    abytes(msg);
    abytes(ctx);
    if (ctx.length > 255)
      throw new RangeError("context should be 255 bytes or less");
    return concatBytes(new Uint8Array([0, ctx.length]), ctx, msg);
  }
  var oidNistP = /* @__PURE__ */ Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2]);
  function checkHash(hash, requiredStrength = 0) {
    if (!hash.oid || !equalBytes(hash.oid.subarray(0, 10), oidNistP))
      throw new Error("hash.oid is invalid: expected NIST hash");
    const collisionResistance = hash.outputLen * 8 / 2;
    if (requiredStrength > collisionResistance) {
      throw new Error("Pre-hash security strength too low: " + collisionResistance + ", required: " + requiredStrength);
    }
  }
  function getMessagePrehash(hash, msg, ctx = EMPTY) {
    abytes(msg);
    abytes(ctx);
    if (ctx.length > 255)
      throw new RangeError("context should be 255 bytes or less");
    const hashed = hash(msg);
    return concatBytes(new Uint8Array([1, ctx.length]), ctx, hash.oid, hashed);
  }

  // node_modules/@noble/post-quantum/_crystals.js
  var genCrystals = (opts) => {
    const { newPoly: newPoly2, N: N3, Q: Q2, F: F2, ROOT_OF_UNITY: ROOT_OF_UNITY2, brvBits, isKyber } = opts;
    const mod = (a, modulo = Q2) => {
      const result = a % modulo | 0;
      return (result >= 0 ? result | 0 : modulo + result | 0) | 0;
    };
    const smod = (a, modulo = Q2) => {
      const r = mod(a, modulo) | 0;
      return (r > modulo >> 1 ? r - modulo | 0 : r) | 0;
    };
    function getZettas() {
      const out = newPoly2(N3);
      for (let i = 0; i < N3; i++) {
        const b = reverseBits(i, brvBits);
        const p = BigInt(ROOT_OF_UNITY2) ** BigInt(b) % BigInt(Q2);
        out[i] = Number(p) | 0;
      }
      return out;
    }
    const nttZetas = getZettas();
    const field = {
      add: (a, b) => mod((a | 0) + (b | 0)) | 0,
      sub: (a, b) => mod((a | 0) - (b | 0)) | 0,
      mul: (a, b) => mod((a | 0) * (b | 0)) | 0,
      inv: (_a) => {
        throw new Error("not implemented");
      }
    };
    const nttOpts = {
      N: N3,
      roots: nttZetas,
      invertButterflies: true,
      skipStages: isKyber ? 1 : 0,
      brp: false
    };
    const dif = FFTCore(field, { dit: false, ...nttOpts });
    const dit = FFTCore(field, { dit: true, ...nttOpts });
    const NTT = {
      encode: (r) => {
        return dif(r);
      },
      decode: (r) => {
        dit(r);
        for (let i = 0; i < r.length; i++)
          r[i] = mod(F2 * r[i]);
        return r;
      }
    };
    const bitsCoder = (d, c) => {
      const mask = getMask(d);
      const bytesLen = d * (N3 / 8);
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
          const r = newPoly2(N3);
          for (let i = 0, buf = 0, bufLen = 0, pos = 0; i < bytes.length; i++) {
            buf |= bytes[i] << bufLen;
            bufLen += 8;
            for (; bufLen >= d; bufLen -= d, buf >>= d)
              r[pos++] = c.decode(buf & mask);
          }
          return r;
        }
      };
    };
    return {
      mod,
      smod,
      nttZetas,
      NTT: {
        encode: (r) => NTT.encode(r),
        decode: (r) => NTT.decode(r)
      },
      bitsCoder
    };
  };
  var createXofShake = (shake) => (seed, blockLen) => {
    if (!blockLen)
      blockLen = shake.blockLen;
    const _seed = new Uint8Array(seed.length + 2);
    _seed.set(seed);
    const seedLen = seed.length;
    const buf = new Uint8Array(blockLen);
    let h = shake.create({});
    let calls = 0;
    let xofs = 0;
    return {
      stats: () => ({ calls, xofs }),
      get: (x, y) => {
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
      }
    };
  };
  var XOF128 = /* @__PURE__ */ createXofShake(shake128);
  var XOF256 = /* @__PURE__ */ createXofShake(shake256);

  // node_modules/@noble/post-quantum/ml-dsa.js
  function validateInternalOpts(opts) {
    validateOpts(opts);
    if (opts.externalMu !== void 0)
      abool(opts.externalMu, "opts.externalMu");
  }
  var N = 256;
  var Q = 8380417;
  var ROOT_OF_UNITY = 1753;
  var F = 8347681;
  var D = 13;
  var GAMMA2_1 = Math.floor((Q - 1) / 88) | 0;
  var GAMMA2_2 = Math.floor((Q - 1) / 32) | 0;
  var PARAMS = /* @__PURE__ */ (() => Object.freeze({
    2: Object.freeze({
      K: 4,
      L: 4,
      D,
      GAMMA1: 2 ** 17,
      GAMMA2: GAMMA2_1,
      TAU: 39,
      ETA: 2,
      OMEGA: 80
    }),
    3: Object.freeze({
      K: 6,
      L: 5,
      D,
      GAMMA1: 2 ** 19,
      GAMMA2: GAMMA2_2,
      TAU: 49,
      ETA: 4,
      OMEGA: 55
    }),
    5: Object.freeze({
      K: 8,
      L: 7,
      D,
      GAMMA1: 2 ** 19,
      GAMMA2: GAMMA2_2,
      TAU: 60,
      ETA: 2,
      OMEGA: 75
    })
  }))();
  var newPoly = (n) => new Int32Array(n);
  var crystals = /* @__PURE__ */ genCrystals({
    N,
    Q,
    F,
    ROOT_OF_UNITY,
    newPoly,
    isKyber: false,
    brvBits: 8
  });
  var id = (n) => n;
  var polyCoder = (d, compress = id, verify = id) => crystals.bitsCoder(d, {
    encode: (i) => compress(verify(i)),
    decode: (i) => verify(compress(i))
  });
  var polyAdd = (a_, b_) => {
    const a = a_;
    const b = b_;
    for (let i = 0; i < a.length; i++)
      a[i] = crystals.mod(a[i] + b[i]);
    return a;
  };
  var polySub = (a_, b_) => {
    const a = a_;
    const b = b_;
    for (let i = 0; i < a.length; i++)
      a[i] = crystals.mod(a[i] - b[i]);
    return a;
  };
  var polyShiftl = (p_) => {
    const p = p_;
    for (let i = 0; i < N; i++)
      p[i] <<= D;
    return p;
  };
  var polyChknorm = (p_, B) => {
    const p = p_;
    for (let i = 0; i < N; i++)
      if (Math.abs(crystals.smod(p[i])) >= B)
        return true;
    return false;
  };
  var MultiplyNTTs = (a_, b_) => {
    const a = a_;
    const b = b_;
    const c = newPoly(N);
    for (let i = 0; i < a.length; i++)
      c[i] = crystals.mod(a[i] * b[i]);
    return c;
  };
  function RejNTTPoly(xof_) {
    const xof = xof_;
    const r = newPoly(N);
    for (let j = 0; j < N; ) {
      const b = xof();
      if (b.length % 3)
        throw new Error("RejNTTPoly: unaligned block");
      for (let i = 0; j < N && i <= b.length - 3; i += 3) {
        const t = (b[i + 0] | b[i + 1] << 8 | b[i + 2] << 16) & 8388607;
        if (t < Q)
          r[j++] = t;
      }
    }
    return r;
  }
  function getDilithium(opts_) {
    const opts = opts_;
    const { K, L: L2, GAMMA1, GAMMA2, TAU, ETA, OMEGA } = opts;
    const { CRH_BYTES, TR_BYTES, C_TILDE_BYTES, XOF128: XOF1282, XOF256: XOF2562, securityLevel } = opts;
    if (![2, 4].includes(ETA))
      throw new Error("Wrong ETA");
    if (![1 << 17, 1 << 19].includes(GAMMA1))
      throw new Error("Wrong GAMMA1");
    if (![GAMMA2_1, GAMMA2_2].includes(GAMMA2))
      throw new Error("Wrong GAMMA2");
    const BETA = TAU * ETA;
    const decompose = (r) => {
      const rPlus = crystals.mod(r);
      const r0 = crystals.smod(rPlus, 2 * GAMMA2) | 0;
      if (rPlus - r0 === Q - 1)
        return { r1: 0 | 0, r0: r0 - 1 | 0 };
      const r1 = Math.floor((rPlus - r0) / (2 * GAMMA2)) | 0;
      return { r1, r0 };
    };
    const HighBits = (r) => decompose(r).r1;
    const LowBits = (r) => decompose(r).r0;
    const MakeHint = (z, r) => {
      const res0 = z <= GAMMA2 || z > Q - GAMMA2 || z === Q - GAMMA2 && r === 0 ? 0 : 1;
      return res0;
    };
    const UseHint = (h, r) => {
      const m = Math.floor((Q - 1) / (2 * GAMMA2));
      const { r1, r0 } = decompose(r);
      if (h === 1)
        return r0 > 0 ? crystals.mod(r1 + 1, m) | 0 : crystals.mod(r1 - 1, m) | 0;
      return r1 | 0;
    };
    const Power2Round = (r) => {
      const rPlus = crystals.mod(r);
      const r0 = crystals.smod(rPlus, 2 ** D) | 0;
      return { r1: Math.floor((rPlus - r0) / 2 ** D) | 0, r0 };
    };
    const hintCoder = {
      bytesLen: OMEGA + K,
      encode: (h_) => {
        const h = h_;
        if (h === false)
          throw new Error("hint.encode: hint is false");
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
      }
    };
    const ETACoder = polyCoder(ETA === 2 ? 3 : 4, (i) => ETA - i, (i) => {
      if (!(-ETA <= i && i <= ETA))
        throw new Error(`malformed key s1/s3 ${i} outside of ETA range [${-ETA}, ${ETA}]`);
      return i;
    });
    const T0Coder = polyCoder(13, (i) => (1 << D - 1) - i);
    const T1Coder = polyCoder(10);
    const ZCoder = polyCoder(GAMMA1 === 1 << 17 ? 18 : 20, (i) => crystals.smod(GAMMA1 - i));
    const W1Coder = polyCoder(GAMMA2 === GAMMA2_1 ? 6 : 4);
    const W1Vec = vecCoder(W1Coder, K);
    const publicCoder = splitCoder("publicKey", 32, vecCoder(T1Coder, K));
    const secretCoder = splitCoder("secretKey", 32, 32, TR_BYTES, vecCoder(ETACoder, L2), vecCoder(ETACoder, K), vecCoder(T0Coder, K));
    const sigCoder = splitCoder("signature", C_TILDE_BYTES, vecCoder(ZCoder, L2), hintCoder);
    const CoefFromHalfByte = ETA === 2 ? (n) => n < 15 ? 2 - n % 5 : false : (n) => n < 9 ? 4 - n : false;
    function RejBoundedPoly(xof_) {
      const xof = xof_;
      const r = newPoly(N);
      for (let j = 0; j < N; ) {
        const b = xof();
        for (let i = 0; j < N && i < b.length; i += 1) {
          const d1 = CoefFromHalfByte(b[i] & 15);
          const d2 = CoefFromHalfByte(b[i] >> 4 & 15);
          if (d1 !== false)
            r[j++] = d1;
          if (j < N && d2 !== false)
            r[j++] = d2;
        }
      }
      return r;
    }
    const SampleInBall = (seed) => {
      const pre = newPoly(N);
      const s = shake256.create({}).update(seed);
      const buf = new Uint8Array(shake256.blockLen);
      s.xofInto(buf);
      const masks = buf.slice(0, 8);
      for (let i = N - TAU, pos = 8, maskPos = 0, maskBit = 0; i < N; i++) {
        let b = i + 1;
        for (; b > i; ) {
          b = buf[pos++];
          if (pos < shake256.blockLen)
            continue;
          s.xofInto(buf);
          pos = 0;
        }
        pre[i] = pre[b];
        pre[b] = 1 - ((masks[maskPos] >> maskBit++ & 1) << 1);
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
    const seedCoder = splitCoder("seed", 32, 64, 32);
    const internal = Object.freeze({
      info: Object.freeze({ type: "internal-ml-dsa" }),
      lengths: Object.freeze({
        secretKey: secretCoder.bytesLen,
        publicKey: publicCoder.bytesLen,
        seed: 32,
        signature: sigCoder.bytesLen,
        signRand: signRandBytes
      }),
      keygen: (seed) => {
        const seedDst = new Uint8Array(32 + 2);
        const randSeed = seed === void 0;
        if (randSeed)
          seed = randomBytes2(32);
        abytesDoc(seed, 32, "seed");
        seedDst.set(seed);
        if (randSeed)
          cleanBytes(seed);
        seedDst[32] = K;
        seedDst[33] = L2;
        const [rho, rhoPrime, K_] = seedCoder.decode(shake256(seedDst, { dkLen: seedCoder.bytesLen }));
        const xofPrime = XOF2562(rhoPrime);
        const s1 = [];
        for (let i = 0; i < L2; i++)
          s1.push(RejBoundedPoly(xofPrime.get(i & 255, i >> 8 & 255)));
        const s2 = [];
        for (let i = L2; i < L2 + K; i++)
          s2.push(RejBoundedPoly(xofPrime.get(i & 255, i >> 8 & 255)));
        const s1Hat = s1.map((i) => crystals.NTT.encode(i.slice()));
        const t0 = [];
        const t1 = [];
        const xof = XOF1282(rho);
        const t = newPoly(N);
        for (let i = 0; i < K; i++) {
          cleanBytes(t);
          for (let j = 0; j < L2; j++) {
            const aij = RejNTTPoly(xof.get(j, i));
            polyAdd(t, MultiplyNTTs(aij, s1Hat[j]));
          }
          crystals.NTT.decode(t);
          const { r0, r1 } = polyPowerRound(polyAdd(t, s2[i]));
          t0.push(r0);
          t1.push(r1);
        }
        const publicKey = publicCoder.encode([rho, t1]);
        const tr = shake256(publicKey, { dkLen: TR_BYTES });
        const secretKey = secretCoder.encode([rho, K_, tr, s1, s2, t0]);
        xof.clean();
        xofPrime.clean();
        cleanBytes(rho, rhoPrime, K_, s1, s2, s1Hat, t, t0, t1, tr, seedDst);
        return {
          publicKey,
          secretKey
        };
      },
      getPublicKey: (secretKey) => {
        const [rho, _K, _tr, s1, s2, _t0] = secretCoder.decode(secretKey);
        const xof = XOF1282(rho);
        const s1Hat = s1.map((p) => crystals.NTT.encode(p.slice()));
        const t1 = [];
        const tmp = newPoly(N);
        for (let i = 0; i < K; i++) {
          tmp.fill(0);
          for (let j = 0; j < L2; j++) {
            const aij = RejNTTPoly(xof.get(j, i));
            polyAdd(tmp, MultiplyNTTs(aij, s1Hat[j]));
          }
          crystals.NTT.decode(tmp);
          polyAdd(tmp, s2[i]);
          const { r1 } = polyPowerRound(tmp);
          t1.push(r1);
        }
        xof.clean();
        cleanBytes(tmp, s1Hat, _t0, s1, s2);
        return publicCoder.encode([rho, t1]);
      },
      // NOTE: random is optional.
      sign: (msg, secretKey, opts2 = {}) => {
        validateSigOpts(opts2);
        validateInternalOpts(opts2);
        let { extraEntropy: random, externalMu = false } = opts2;
        const [rho, _K, tr, s1, s2, t0] = secretCoder.decode(secretKey);
        const A = [];
        const xof = XOF1282(rho);
        for (let i = 0; i < K; i++) {
          const pv = [];
          for (let j = 0; j < L2; j++)
            pv.push(RejNTTPoly(xof.get(j, i)));
          A.push(pv);
        }
        xof.clean();
        for (let i = 0; i < L2; i++)
          crystals.NTT.encode(s1[i]);
        for (let i = 0; i < K; i++) {
          crystals.NTT.encode(s2[i]);
          crystals.NTT.encode(t0[i]);
        }
        const mu = externalMu ? msg : (
          // 6: µ ← H(tr||M, 512)
          //    ▷ Compute message representative µ
          shake256.create({ dkLen: CRH_BYTES }).update(tr).update(msg).digest()
        );
        const rnd = random === false ? new Uint8Array(32) : random === void 0 ? randomBytes2(signRandBytes) : random;
        abytesDoc(rnd, 32, "extraEntropy");
        const rhoprime = shake256.create({ dkLen: CRH_BYTES }).update(_K).update(rnd).update(mu).digest();
        abytesDoc(rhoprime, CRH_BYTES);
        const x256 = XOF2562(rhoprime, ZCoder.bytesLen);
        main_loop: for (let kappa = 0; ; ) {
          const y = [];
          for (let i = 0; i < L2; i++, kappa++)
            y.push(ZCoder.decode(x256.get(kappa & 255, kappa >> 8)()));
          const z = y.map((i) => crystals.NTT.encode(i.slice()));
          const w = [];
          for (let i = 0; i < K; i++) {
            const wi = newPoly(N);
            for (let j = 0; j < L2; j++)
              polyAdd(wi, MultiplyNTTs(A[i][j], z[j]));
            crystals.NTT.decode(wi);
            w.push(wi);
          }
          const w1 = w.map((j) => j.map(HighBits));
          const cTilde = shake256.create({ dkLen: C_TILDE_BYTES }).update(mu).update(W1Vec.encode(w1)).digest();
          const cHat = crystals.NTT.encode(SampleInBall(cTilde));
          const cs1 = s1.map((i) => MultiplyNTTs(i, cHat));
          for (let i = 0; i < L2; i++) {
            polyAdd(crystals.NTT.decode(cs1[i]), y[i]);
            if (polyChknorm(cs1[i], GAMMA1 - BETA))
              continue main_loop;
          }
          let cnt = 0;
          const h = [];
          for (let i = 0; i < K; i++) {
            const cs2 = crystals.NTT.decode(MultiplyNTTs(s2[i], cHat));
            const r0 = polySub(w[i], cs2).map(LowBits);
            if (polyChknorm(r0, GAMMA2 - BETA))
              continue main_loop;
            const ct0 = crystals.NTT.decode(MultiplyNTTs(t0[i], cHat));
            if (polyChknorm(ct0, GAMMA2))
              continue main_loop;
            polyAdd(r0, ct0);
            const hint = polyMakeHint(r0, w1[i]);
            h.push(hint.v);
            cnt += hint.cnt;
          }
          if (cnt > OMEGA)
            continue;
          x256.clean();
          const res = sigCoder.encode([cTilde, cs1, h]);
          cleanBytes(cTilde, cs1, h, cHat, w1, w, z, y, rhoprime, s1, s2, t0, ...A);
          if (!externalMu)
            cleanBytes(mu);
          return res;
        }
        throw new Error("Unreachable code path reached, report this error");
      },
      verify: (sig, msg, publicKey, opts2 = {}) => {
        validateInternalOpts(opts2);
        const { externalMu = false } = opts2;
        const [rho, t1] = publicCoder.decode(publicKey);
        const tr = shake256(publicKey, { dkLen: TR_BYTES });
        if (sig.length !== sigCoder.bytesLen)
          return false;
        const [cTilde, z, h] = sigCoder.decode(sig);
        if (h === false)
          return false;
        for (let i = 0; i < L2; i++)
          if (polyChknorm(z[i], GAMMA1 - BETA))
            return false;
        const mu = externalMu ? msg : (
          // 7: µ ← H(tr||M, 512)
          shake256.create({ dkLen: CRH_BYTES }).update(tr).update(msg).digest()
        );
        const c = crystals.NTT.encode(SampleInBall(cTilde));
        const zNtt = z.map((i) => i.slice());
        for (let i = 0; i < L2; i++)
          crystals.NTT.encode(zNtt[i]);
        const wTick1 = [];
        const xof = XOF1282(rho);
        for (let i = 0; i < K; i++) {
          const ct12d = MultiplyNTTs(crystals.NTT.encode(polyShiftl(t1[i])), c);
          const Az = newPoly(N);
          for (let j = 0; j < L2; j++) {
            const aij = RejNTTPoly(xof.get(j, i));
            polyAdd(Az, MultiplyNTTs(aij, zNtt[j]));
          }
          const wApprox = crystals.NTT.decode(polySub(Az, ct12d));
          wTick1.push(polyUseHint(wApprox, h[i]));
        }
        xof.clean();
        const c2 = shake256.create({ dkLen: C_TILDE_BYTES }).update(mu).update(W1Vec.encode(wTick1)).digest();
        for (const t of h) {
          const sum = t.reduce((acc, i) => acc + i, 0);
          if (!(sum <= OMEGA))
            return false;
        }
        for (const t of z)
          if (polyChknorm(t, GAMMA1 - BETA))
            return false;
        return equalBytes(cTilde, c2);
      }
    });
    return Object.freeze({
      info: Object.freeze({ type: "ml-dsa" }),
      internal,
      securityLevel,
      keygen: internal.keygen,
      lengths: internal.lengths,
      getPublicKey: internal.getPublicKey,
      sign: (msg, secretKey, opts2 = {}) => {
        validateSigOpts(opts2);
        const M2 = getMessage(msg, opts2.context);
        const res = internal.sign(M2, secretKey, opts2);
        cleanBytes(M2);
        return res;
      },
      verify: (sig, msg, publicKey, opts2 = {}) => {
        validateVerOpts(opts2);
        return internal.verify(sig, getMessage(msg, opts2.context), publicKey);
      },
      prehash: (hash) => {
        checkHash(hash, securityLevel);
        return Object.freeze({
          info: Object.freeze({ type: "hashml-dsa" }),
          securityLevel,
          lengths: internal.lengths,
          keygen: internal.keygen,
          getPublicKey: internal.getPublicKey,
          sign: (msg, secretKey, opts2 = {}) => {
            validateSigOpts(opts2);
            const M2 = getMessagePrehash(hash, msg, opts2.context);
            const res = internal.sign(M2, secretKey, opts2);
            cleanBytes(M2);
            return res;
          },
          verify: (sig, msg, publicKey, opts2 = {}) => {
            validateVerOpts(opts2);
            return internal.verify(sig, getMessagePrehash(hash, msg, opts2.context), publicKey);
          }
        });
      }
    });
  }
  var ml_dsa44 = /* @__PURE__ */ (() => getDilithium({
    ...PARAMS[2],
    CRH_BYTES: 64,
    TR_BYTES: 64,
    C_TILDE_BYTES: 32,
    XOF128,
    XOF256,
    securityLevel: 128
  }))();

  // node_modules/@scure/base/index.js
  var freeze = (fn) => Object.freeze(fn());
  function isBytes2(a) {
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
  }
  function abytes2(b) {
    if (!isBytes2(b))
      throw new TypeError("Uint8Array expected");
  }
  function isArrayOf(isString, arr) {
    if (!Array.isArray(arr))
      return false;
    if (arr.length === 0)
      return true;
    if (isString) {
      return arr.every((item) => typeof item === "string");
    } else {
      return arr.every((item) => Number.isSafeInteger(item));
    }
  }
  function afn(input) {
    if (typeof input !== "function")
      throw new TypeError("function expected");
    return true;
  }
  function astr(label, input) {
    if (typeof input !== "string")
      throw new TypeError(`${label}: string expected`);
    return true;
  }
  function anumber2(n, title = "number") {
    if (typeof n !== "number")
      throw new TypeError(`${title}: expected number, got ${typeof n}`);
    if (!Number.isSafeInteger(n))
      throw new RangeError(`${title}: expected safe integer, got ${n}`);
  }
  function anumArr(label, input) {
    if (!isArrayOf(false, input))
      throw new TypeError(`${label}: array of numbers expected`);
  }
  function chain(...args) {
    const id2 = (a) => a;
    const wrap = (a, b) => (c) => a(b(c));
    const encode = args.map((x) => x.encode).reduceRight(wrap, id2);
    const decode = args.map((x) => x.decode).reduce(wrap, id2);
    return { encode, decode };
  }
  var powers = /* @__PURE__ */ (() => {
    let res = [];
    for (let i = 0; i < 40; i++)
      res.push(2 ** i);
    return res;
  })();
  function u8ToNumArr(u8, len = u8.length) {
    const res = new Array(len);
    for (let i = 0; i < len; i++)
      res[i] = u8[i];
    return res;
  }
  var asciiDecoder = /* @__PURE__ */ (() => {
    try {
      const decoder = new TextDecoder();
      return decoder.decode(Uint8Array.of(65, 48, 43, 127)) === "A0+\x7F" ? decoder : void 0;
    } catch (e) {
      return void 0;
    }
  })();
  var B2S_CHUNK = 8192;
  function charcodesToString(codes) {
    const len = codes.length;
    if (asciiDecoder !== void 0 && len >= 12)
      return asciiDecoder.decode(codes);
    if (len <= B2S_CHUNK)
      return String.fromCharCode.apply(null, codes);
    let res = "";
    for (let i = 0; i < len; i += B2S_CHUNK)
      res += String.fromCharCode.apply(null, codes.subarray(i, i + B2S_CHUNK));
    return res;
  }
  function radix2(bits) {
    anumber2(bits);
    if (bits <= 0 || bits > 8)
      throw new RangeError("radix2: bits should be in (0..8]");
    const mask = powers[bits] - 1;
    return {
      encode: (bytes) => {
        abytes2(bytes);
        const len = bytes.length;
        const res = new Uint8Array(Math.ceil(len * 8 / bits));
        let carry = 0;
        let pos = 0;
        let j = 0;
        for (let i = 0; i < len; ) {
          if (i + 2 < len) {
            carry = carry << 24 | bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];
            pos += 24;
            i += 3;
          } else {
            carry = (carry << 8 | bytes[i]) & 65535;
            pos += 8;
            i++;
          }
          for (; ; ) {
            pos -= bits;
            res[j++] = carry >> pos & mask;
            if (pos < bits)
              break;
          }
        }
        if (pos > 0)
          res[j] = carry << bits - pos & mask;
        return res;
      },
      decode: (digits) => {
        const len = digits.length;
        const res = new Uint8Array(Math.floor(len * bits / 8));
        let carry = 0;
        let pos = 0;
        let j = 0;
        for (let i = 0; i < len; i++) {
          carry = (carry << bits | digits[i]) & 65535;
          pos += bits;
          for (; pos >= 8; pos -= 8)
            res[j++] = carry >> pos - 8 & 255;
        }
        carry = carry << 8 - pos & 255;
        if (pos >= bits)
          throw new Error("Excess padding");
        if (carry > 0)
          throw new Error(`Non-zero padding: ${carry}`);
        return res;
      }
    };
  }
  function alphabet(letters, aliases) {
    const len = letters.length;
    if (len > 128)
      throw new Error("alphabet: max 128 letters");
    const encTable = new Uint8Array(len);
    const decTable = new Int8Array(128).fill(-1);
    for (let i = 0; i < len; i++) {
      const code = letters.charCodeAt(i);
      if (letters.codePointAt(i) !== code || code > 127)
        throw new Error("alphabet: single-char ASCII letters only");
      encTable[i] = code;
      decTable[code] = i;
    }
    if (aliases !== void 0) {
      for (const alias of Object.keys(aliases)) {
        const code = alias.charCodeAt(0);
        const target = decTable[aliases[alias].charCodeAt(0)];
        if (alias.length !== 1 || code > 127 || target === void 0 || target === -1)
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
          if (code === void 0)
            throw new Error(`alphabet.encode: invalid digit ${d}`);
          codes[i] = code;
        }
        return charcodesToString(codes);
      },
      decode: (input) => {
        astr("decode", input);
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
      }
    };
  }
  function padding(bits, chr = "=") {
    anumber2(bits);
    astr("padding", chr);
    return {
      encode(data) {
        while (data.length * bits % 8)
          data += chr;
        return data;
      },
      decode(input) {
        astr("decode", input);
        let end = input.length;
        if (end * bits % 8)
          throw new Error("padding: invalid length");
        for (; end > 0 && input[end - 1] === chr; end--) {
          const byte = (end - 1) * bits;
          if (byte % 8 === 0)
            throw new Error("padding: excess padding");
        }
        return input.slice(0, end);
      }
    };
  }
  function unsafeWrapper(fn) {
    afn(fn);
    return function(...args) {
      try {
        return fn.apply(null, args);
      } catch (e) {
      }
    };
  }
  function checksum(len, fn) {
    anumber2(len);
    if (len <= 0)
      throw new RangeError(`checksum length must be positive: ${len}`);
    afn(fn);
    const _fn = fn;
    return {
      encode(data) {
        abytes2(data);
        const sum = _fn(data).slice(0, len);
        const res = new Uint8Array(data.length + len);
        res.set(data);
        res.set(sum, data.length);
        return res;
      },
      decode(data) {
        abytes2(data);
        const payload = data.slice(0, -len);
        const oldChecksum = data.slice(-len);
        const newChecksum = _fn(payload).slice(0, len);
        for (let i = 0; i < len; i++)
          if (newChecksum[i] !== oldChecksum[i])
            throw new Error("Invalid checksum");
        return payload;
      }
    };
  }
  var hasBase64Builtin = /* @__PURE__ */ (() => typeof Uint8Array.from([]).toBase64 === "function" && typeof Uint8Array.fromBase64 === "function")();
  var ASCII_WHITESPACE = /[\t\n\f\r ]/;
  var decodeBase64Builtin = (s, isUrl) => {
    astr("base64", s);
    const alphabet2 = isUrl ? "base64url" : "base64";
    if (s.length > 0 && ASCII_WHITESPACE.test(s))
      throw new Error("invalid base64");
    return Uint8Array.fromBase64(s, { alphabet: alphabet2, lastChunkHandling: "strict" });
  };
  var base64Fallback = /* @__PURE__ */ freeze(() => chain(radix2(6), alphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), padding(6)));
  var base64 = /* @__PURE__ */ freeze(() => hasBase64Builtin ? {
    encode(b) {
      abytes2(b);
      return b.toBase64();
    },
    decode(s) {
      return decodeBase64Builtin(s, false);
    }
  } : base64Fallback);
  var B58_GROUP = 656356768;
  var RADIX_BASE_N_MAX_LENGTH = 65536;
  var BASE_N_MAX_BYTES = 2048;
  var BASE_N_MAX_CHARS = 4096;
  var radixBaseN = (BASE, GROUP) => ({
    encode: (bytes) => {
      abytes2(bytes);
      const blen = bytes.length;
      if (blen === 0)
        return new Uint8Array(0);
      if (blen >= RADIX_BASE_N_MAX_LENGTH)
        throw new Error("invalid length");
      let zeros = 0;
      while (zeros < blen - 1 && bytes[zeros] === 0)
        zeros++;
      const nlimbs = Math.ceil(blen / 2);
      const limbs = new Uint16Array(nlimbs);
      const odd = blen & 1;
      if (odd)
        limbs[0] = bytes[0];
      for (let i = odd, j2 = odd; i < blen; i += 2, j2++)
        limbs[j2] = bytes[i] << 8 | bytes[i + 1];
      const groups = [];
      let pos = 0;
      while (pos < nlimbs) {
        let carry = 0;
        for (let i = pos; i < nlimbs; i++) {
          const cur = carry * 65536 + limbs[i];
          const q = Math.floor(cur / GROUP);
          carry = cur - q * GROUP;
          limbs[i] = q;
          if (q === 0 && i === pos)
            pos++;
        }
        groups.push(carry);
      }
      const top = groups.length - 1;
      let sig = top * 5;
      for (let v = groups[top]; ; v = Math.floor(v / BASE)) {
        sig++;
        if (v < BASE)
          break;
      }
      const res = new Uint8Array(zeros + sig);
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
      abytes2(digits);
      const dlen = digits.length;
      if (dlen === 0)
        return new Uint8Array(0);
      if (dlen >= RADIX_BASE_N_MAX_LENGTH)
        throw new Error("invalid length");
      let zeros = 0;
      while (zeros < dlen - 1 && digits[zeros] === 0)
        zeros++;
      const limbs = new Uint16Array(Math.ceil(dlen * 6 / 16) + 1);
      let used = 0;
      let i = 0;
      let group = dlen % 5 || 5;
      while (i < dlen) {
        let gval = 0;
        let factor = 1;
        for (const end = i + group; i < end; i++) {
          const d = digits[i];
          if (d >= BASE)
            throw new Error(`invalid integer: ${d}`);
          gval = gval * BASE + d;
          factor *= BASE;
        }
        group = 5;
        let carry = gval;
        for (let k = 0; k < used; k++) {
          const cur = limbs[k] * factor + carry;
          carry = Math.floor(cur / 65536);
          limbs[k] = cur - carry * 65536;
        }
        for (; carry > 0; carry = Math.floor(carry / 65536))
          limbs[used++] = carry % 65536;
      }
      const valueBytes = used === 0 ? 1 : used * 2 - (limbs[used - 1] < 256 ? 1 : 0);
      const res = new Uint8Array(zeros + valueBytes);
      let j = res.length - 1;
      for (let k = 0; k < used; k++) {
        const limb = limbs[k];
        res[j--] = limb & 255;
        if (j >= zeros)
          res[j--] = limb >> 8;
      }
      return res;
    }
  });
  var genBaseN = (radix, abc) => {
    const letters = alphabet(abc);
    return {
      encode(bytes) {
        abytes2(bytes);
        if (bytes.length > BASE_N_MAX_BYTES)
          throw new Error("invalid length");
        return letters.encode(radix.encode(bytes));
      },
      decode(str) {
        astr("baseN.decode", str);
        if (str.length > BASE_N_MAX_CHARS)
          throw new Error("invalid length");
        return radix.decode(letters.decode(str));
      }
    };
  };
  var radix58 = /* @__PURE__ */ radixBaseN(58, B58_GROUP);
  var genBase58 = (abc) => genBaseN(radix58, abc);
  var base58 = /* @__PURE__ */ freeze(() => genBase58("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"));
  var createBase58check = (sha2562) => {
    afn(sha2562);
    const _sha256 = sha2562;
    return chain(checksum(4, (data) => _sha256(_sha256(data))), base58);
  };
  var BECH_ALPHABET = /* @__PURE__ */ alphabet("qpzry9x8gf2tvdw0s3jn54khce6mua7l");
  var BECH_UPPERCASE_PRINTABLE = /^[\x21-\x60\x7b-\x7e]+$/;
  function assertBech32Printable(label, value) {
    for (let i = 0; i < value.length; i++) {
      const c = value.charCodeAt(i);
      if (c < 33 || c > 126)
        throw new Error(`${label}: printable ASCII expected`);
    }
  }
  function wordsToU8(words) {
    const len = words.length;
    const res = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      const w = words[i];
      if (w < 0 || w >= 32)
        throw new Error(`alphabet.encode: invalid digit ${w}`);
      res[i] = w;
    }
    return res;
  }
  var POLYMOD_GENERATORS = [996825010, 642813549, 513874426, 1027748829, 705979059];
  function bech32Polymod(pre) {
    const b = pre >> 25;
    let chk = (pre & 33554431) << 5;
    for (let i = 0; i < POLYMOD_GENERATORS.length; i++) {
      if ((b >> i & 1) === 1)
        chk ^= POLYMOD_GENERATORS[i];
    }
    return chk;
  }
  function bechChecksum(prefix, words, encodingConst = 1) {
    const len = prefix.length;
    let chk = 1;
    for (let i = 0; i < len; i++) {
      const c = prefix.charCodeAt(i);
      if (c < 33 || c > 126)
        throw new Error(`Invalid prefix (${prefix})`);
      chk = bech32Polymod(chk) ^ c >> 5;
    }
    chk = bech32Polymod(chk);
    for (let i = 0; i < len; i++)
      chk = bech32Polymod(chk) ^ prefix.charCodeAt(i) & 31;
    for (let v of words)
      chk = bech32Polymod(chk) ^ v;
    for (let i = 0; i < 6; i++)
      chk = bech32Polymod(chk);
    chk ^= encodingConst;
    const sum = new Uint8Array(6);
    for (let i = 0; i < 6; i++)
      sum[i] = chk >>> 5 * (5 - i) & 31;
    return BECH_ALPHABET.encode(sum);
  }
  function genBech32(encoding) {
    const ENCODING_CONST = encoding === "bech32" ? 1 : 734539939;
    const _words = radix2(5);
    const toWords = (from) => {
      abytes2(from);
      const len = from.length;
      const res = new Array(Math.ceil(len * 8 / 5));
      let carry = 0;
      let pos = 0;
      let j = 0;
      for (let i = 0; i < len; i++) {
        carry = carry << 8 | from[i];
        pos += 8;
        for (; pos >= 5; pos -= 5)
          res[j++] = carry >> pos - 5 & 31;
      }
      if (pos > 0)
        res[j] = carry << 5 - pos & 31;
      return res;
    };
    const fromWords = (to) => {
      anumArr("radix2.decode", to);
      const len = to.length;
      const digits = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        const w = to[i];
        if (w < 0 || w >= 32)
          throw new Error(`convertRadix2: invalid word=${w}`);
        digits[i] = w;
      }
      return _words.decode(digits);
    };
    const fromWordsUnsafe = unsafeWrapper(fromWords);
    function encode(prefix, words, limit = 90) {
      astr("bech32.encode prefix", prefix);
      if (limit !== false)
        anumber2(limit, "limit");
      if (isBytes2(words))
        words = u8ToNumArr(words);
      anumArr("bech32.encode", words);
      const plen = prefix.length;
      if (plen === 0)
        throw new TypeError(`Invalid prefix length ${plen}`);
      const actualLength = plen + 7 + words.length;
      if (limit !== false && actualLength > limit)
        throw new TypeError(`Length ${actualLength} exceeds limit ${limit}`);
      assertBech32Printable("bech32.encode prefix", prefix);
      const lowered = prefix.toLowerCase();
      const sum = bechChecksum(lowered, words, ENCODING_CONST);
      return `${lowered}1${BECH_ALPHABET.encode(wordsToU8(words))}${sum}`;
    }
    function decode(str, limit = 90) {
      astr("bech32.decode input", str);
      if (limit !== false)
        anumber2(limit, "limit");
      const slen = str.length;
      if (slen < 8 || limit !== false && slen > limit)
        throw new TypeError(`invalid string length ${slen}, expected (8..${limit})`);
      const lowered = str.toLowerCase();
      if (str !== lowered) {
        if (!BECH_UPPERCASE_PRINTABLE.test(str)) {
          assertBech32Printable("bech32.decode input", str);
          throw new Error(`mixed-case string not allowed`);
        }
      }
      const sepIndex = lowered.lastIndexOf("1");
      if (sepIndex === 0 || sepIndex === -1)
        throw new Error(`invalid separator "1"`);
      const prefix = lowered.slice(0, sepIndex);
      const data = lowered.slice(sepIndex + 1);
      if (data.length < 6)
        throw new Error("invalid data length");
      const digits = BECH_ALPHABET.decode(data);
      const words = u8ToNumArr(digits, digits.length - 6);
      const sum = bechChecksum(prefix, words, ENCODING_CONST);
      if (!data.endsWith(sum))
        throw new Error(`Invalid checksum in ${str}`);
      return { prefix, words };
    }
    const decodeUnsafe = unsafeWrapper(decode);
    function decodeToBytes(str, limit = 90) {
      const { prefix, words } = decode(str, limit);
      return {
        prefix,
        words,
        bytes: fromWords(words)
      };
    }
    function encodeFromBytes(prefix, bytes) {
      return encode(prefix, toWords(bytes));
    }
    return {
      encode,
      decode,
      encodeFromBytes,
      decodeToBytes,
      decodeUnsafe,
      fromWords,
      fromWordsUnsafe,
      toWords
    };
  }
  var bech32 = /* @__PURE__ */ freeze(() => genBech32("bech32"));
  var bech32m = /* @__PURE__ */ freeze(() => genBech32("bech32m"));

  // node_modules/@noble/hashes/utils.js
  function isBytes3(a) {
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
  }
  var atitle = (title) => title ? `"${title}" ` : "";
  function anumber3(n, title = "") {
    if (typeof n !== "number")
      throw new TypeError(atitle(title) + "expected number, got " + typeof n);
    if (!Number.isSafeInteger(n) || n < 0)
      throw new RangeError(atitle(title) + "expected integer >= 0, got " + n);
    return n;
  }
  function abytes3(value, length, title = "") {
    if (isBytes3(value) && (length === void 0 || value.length === length))
      return value;
    if (length !== void 0)
      anumber3(length, "length");
    const bytes = isBytes3(value);
    const ofLen = length !== void 0 ? ` of length ${length}` : "";
    const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
    const message = atitle(title) + "expected Uint8Array" + ofLen + ", got " + got;
    if (!bytes)
      throw new TypeError(message);
    throw new RangeError(message);
  }
  function ahash(h) {
    if (typeof h !== "function" || typeof h.create !== "function")
      throw new TypeError("expected hash wrapped by utils.createHasher");
    anumber3(h.outputLen);
    anumber3(h.blockLen);
    if (h.outputLen < 1 || h.blockLen < 1)
      throw new Error("hash blockLen / outputLen must be >= 1");
  }
  var aobject = (value, label) => {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      throw new TypeError((label === "object" ? "" : `"${label}" `) + "expected object, got type=" + typeof value);
  };
  var aopts = (value, label) => {
    aobject(value, label);
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null)
      throw new TypeError(`"${label}" expected plain object`);
    if (Object.hasOwn(value, "__proto__"))
      throw new TypeError(`"${label}.__proto__" is not allowed`);
  };
  function aexists2(instance, checkFinished = true) {
    if (instance.destroyed)
      throw new Error("hash was destroyed");
    if (checkFinished && instance.finished)
      throw new Error("digest() was already called");
  }
  function aoutput2(out, instance) {
    abytes3(out, void 0, "output");
    const min = instance.outputLen;
    if (!(out.length >= min)) {
      throw new RangeError('"output" expected length >= ' + min);
    }
  }
  function clean2(...arrays) {
    for (let i = 0; i < arrays.length; i++) {
      arrays[i].fill(0);
    }
  }
  function createView(arr) {
    return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  function rotr(word, shift) {
    return word << 32 - shift | word >>> shift;
  }
  function rotl(word, shift) {
    return word << shift | word >>> 32 - shift >>> 0;
  }
  function utf8ToBytes(str) {
    if (typeof str !== "string")
      throw new TypeError("string expected");
    const encoded = new TextEncoder().encode(str);
    try {
      return new Uint8Array(encoded);
    } finally {
      clean2(encoded);
    }
  }
  function concatBytes2(...arrays) {
    let sum = 0;
    for (let i = 0; i < arrays.length; i++) {
      const a = arrays[i];
      abytes3(a);
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
  function checkOpts(defaults, opts, title = "opts") {
    aopts(defaults, "defaults");
    if (opts !== void 0)
      aopts(opts, title);
    const merged = Object.assign(/* @__PURE__ */ Object.create(null), defaults, opts);
    return merged;
  }
  function createHasher2(hashCons, info = {}) {
    if (typeof hashCons !== "function")
      throw new TypeError('"hashCons" expected function, got type=' + typeof hashCons);
    info = checkOpts({}, info, "info");
    const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
    const tmp = hashCons(void 0);
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.canXOF = tmp.canXOF;
    hashC.create = (opts) => hashCons(opts);
    Object.assign(hashC, info);
    return Object.freeze(hashC);
  }
  var oidNist2 = (suffix) => ({
    // Current NIST hashAlgs suffixes used here fit in one DER subidentifier octet.
    // Larger suffix values would need base-128 OID encoding and a different length byte.
    oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix])
  });

  // src/bytes.ts
  function asBech32String(address) {
    if (typeof address !== "string" || !address.includes("1")) {
      throw new Error("Invalid bech32 address");
    }
    return address;
  }
  function bytesEqual(a, b) {
    if (a.length !== b.length) {
      return false;
    }
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a[i] ^ b[i];
    }
    return diff === 0;
  }
  function toBase64(bytes) {
    return base64.encode(bytes);
  }
  function fromBase64(text) {
    const compact = text.replace(/\s+/g, "");
    const hasUrlAlphabet = /[-_]/.test(compact);
    const hasStandardAlphabet = /[+/]/.test(compact);
    if (hasUrlAlphabet && hasStandardAlphabet) {
      throw new Error("Invalid base64 input: mixed alphabets");
    }
    const standard = hasUrlAlphabet ? compact.replace(/-/g, "+").replace(/_/g, "/") : compact;
    const body = standard.replace(/=+$/, "");
    if (!/^[A-Za-z0-9+/]*$/.test(body)) {
      throw new Error("Invalid base64 input: unexpected character");
    }
    if (body.length % 4 === 1) {
      throw new Error("Invalid base64 input: impossible length");
    }
    const expectedPadding = (4 - body.length % 4) % 4;
    const givenPadding = standard.length - body.length;
    if (givenPadding !== 0 && givenPadding !== expectedPadding) {
      throw new Error("Invalid base64 input: bad padding");
    }
    return base64.decode(body + "=".repeat(expectedPadding));
  }
  function encodeCompactSize(value) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error("CompactSize value must be a non-negative integer");
    }
    if (value < 253) {
      return Uint8Array.of(value);
    }
    if (value <= 65535) {
      const out = new Uint8Array(3);
      out[0] = 253;
      new DataView(out.buffer).setUint16(1, value, true);
      return out;
    }
    if (value <= 4294967295) {
      const out = new Uint8Array(5);
      out[0] = 254;
      new DataView(out.buffer).setUint32(1, value, true);
      return out;
    }
    throw new Error("CompactSize values above uint32 are not supported");
  }
  function decodeCompactSize(bytes, offset) {
    if (offset >= bytes.length) {
      throw new Error("Unexpected end of CompactSize data");
    }
    const first = bytes[offset];
    if (first < 253) {
      return { value: first, offset: offset + 1 };
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (first === 253) {
      if (offset + 3 > bytes.length) {
        throw new Error("Unexpected end of CompactSize uint16 data");
      }
      return { value: view.getUint16(offset + 1, true), offset: offset + 3 };
    }
    if (first === 254) {
      if (offset + 5 > bytes.length) {
        throw new Error("Unexpected end of CompactSize uint32 data");
      }
      return { value: view.getUint32(offset + 1, true), offset: offset + 5 };
    }
    if (first === 255) {
      throw new Error("CompactSize uint64 is not supported");
    }
    throw new Error("Invalid CompactSize prefix");
  }

  // node_modules/@noble/hashes/_u64.js
  var fromNumH = (n) => n / 2 ** 32 | 0;
  var fromNumL = (n) => n >>> 0;
  function setU64FromNum(view, byteOffset, n, isLE2) {
    const h = fromNumH(n);
    const l = fromNumL(n);
    view.setUint32(byteOffset, isLE2 ? l : h, isLE2);
    view.setUint32(byteOffset + 4, isLE2 ? h : l, isLE2);
  }

  // node_modules/@noble/hashes/_md.js
  function Chi(a, b, c) {
    return a & b ^ ~a & c;
  }
  function Maj(a, b, c) {
    return a & b ^ a & c ^ b & c;
  }
  var HashMD = class {
    constructor(blockLen, outputLen, padOffset, isLE2) {
      __publicField(this, "blockLen");
      __publicField(this, "outputLen");
      __publicField(this, "canXOF", false);
      __publicField(this, "padOffset");
      __publicField(this, "isLE");
      // For partial updates less than block size
      __publicField(this, "buffer");
      __publicField(this, "view");
      __publicField(this, "finished", false);
      __publicField(this, "length", 0);
      __publicField(this, "pos", 0);
      __publicField(this, "destroyed", false);
      this.blockLen = blockLen;
      this.outputLen = outputLen;
      this.padOffset = padOffset;
      this.isLE = isLE2;
      this.buffer = new Uint8Array(blockLen);
      this.view = createView(this.buffer);
    }
    update(data) {
      aexists2(this);
      abytes3(data);
      const { view, buffer, blockLen } = this;
      const len = data.length;
      let processed = false;
      for (let pos = 0; pos < len; ) {
        const take = Math.min(blockLen - this.pos, len - pos);
        if (take === blockLen) {
          const dataView = createView(data);
          for (; blockLen <= len - pos; pos += blockLen)
            this.process(dataView, pos);
          processed = true;
          continue;
        }
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
      if (processed)
        this.roundClean();
      return this;
    }
    digestInto(out) {
      aexists2(this);
      aoutput2(out, this);
      this.finished = true;
      const { buffer, view, blockLen, isLE: isLE2 } = this;
      let { pos } = this;
      buffer[pos++] = 128;
      buffer.fill(0, pos);
      if (this.padOffset > blockLen - pos) {
        this.process(view, 0);
        buffer.fill(0);
      }
      setU64FromNum(view, blockLen - 8, this.length * 8, isLE2);
      this.process(view, 0);
      this.roundClean();
      const oview = out === buffer ? view : createView(out);
      const len = this.outputLen;
      const outLen = len / 4;
      const state = this.get();
      if (len % 4 || outLen > state.length)
        throw new Error("invalid outputLen");
      for (let i = 0; i < outLen; i++)
        oview.setUint32(4 * i, state[i], isLE2);
    }
    digest() {
      const { buffer, outputLen } = this;
      this.digestInto(buffer);
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
      if (pos)
        to.buffer.set(buffer);
      return to;
    }
    clone() {
      return this._cloneInto();
    }
  };
  var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);

  // node_modules/@noble/hashes/legacy.js
  var Rho160 = /* @__PURE__ */ Uint8Array.from([
    7,
    4,
    13,
    1,
    10,
    6,
    15,
    3,
    12,
    0,
    9,
    5,
    2,
    14,
    11,
    8
  ]);
  var Id160 = /* @__PURE__ */ (() => Uint8Array.from(new Array(16).fill(0).map((_, i) => i)))();
  var Pi160 = /* @__PURE__ */ (() => Id160.map((i) => (9 * i + 5) % 16))();
  var idxLR = /* @__PURE__ */ (() => {
    const L2 = [Id160];
    const R = [Pi160];
    const res = [L2, R];
    for (let i = 0; i < 4; i++)
      for (let j of res)
        j.push(j[i].map((k) => Rho160[k]));
    return res;
  })();
  var idxL = /* @__PURE__ */ (() => idxLR[0])();
  var idxR = /* @__PURE__ */ (() => idxLR[1])();
  var shifts160 = /* @__PURE__ */ [
    [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
    [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
    [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
    [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
    [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
  ].map((i) => Uint8Array.from(i));
  var shiftsL160 = /* @__PURE__ */ idxL.map((idx, i) => idx.map((j) => shifts160[i][j]));
  var shiftsR160 = /* @__PURE__ */ idxR.map((idx, i) => idx.map((j) => shifts160[i][j]));
  var Kl160 = /* @__PURE__ */ Uint32Array.from([
    0,
    1518500249,
    1859775393,
    2400959708,
    2840853838
  ]);
  var Kr160 = /* @__PURE__ */ Uint32Array.from([
    1352829926,
    1548603684,
    1836072691,
    2053994217,
    0
  ]);
  function ripemd_f(group, x, y, z) {
    if (group === 0)
      return x ^ y ^ z;
    if (group === 1)
      return x & y | ~x & z;
    if (group === 2)
      return (x | ~y) ^ z;
    if (group === 3)
      return x & z | y & ~z;
    return x ^ (y | ~z);
  }
  var BUF_160 = /* @__PURE__ */ new Uint32Array(16);
  var _RIPEMD160 = class extends HashMD {
    constructor() {
      super(64, 20, 8, true);
      __publicField(this, "h0", 1732584193 | 0);
      __publicField(this, "h1", 4023233417 | 0);
      __publicField(this, "h2", 2562383102 | 0);
      __publicField(this, "h3", 271733878 | 0);
      __publicField(this, "h4", 3285377520 | 0);
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
      (to || (to = new this.constructor())).set(...this.get());
      return this._cloneIntoMeta(to);
    }
    process(view, offset) {
      for (let i = 0; i < 16; i++, offset += 4)
        BUF_160[i] = view.getUint32(offset, true);
      let al = this.h0 | 0, ar = al, bl = this.h1 | 0, br = bl, cl = this.h2 | 0, cr = cl, dl = this.h3 | 0, dr = dl, el = this.h4 | 0, er = el;
      for (let group = 0; group < 5; group++) {
        const rGroup = 4 - group;
        const hbl = Kl160[group], hbr = Kr160[group];
        const rl = idxL[group], rr = idxR[group];
        const sl = shiftsL160[group], sr = shiftsR160[group];
        for (let i = 0; i < 16; i++) {
          const tl = rotl(al + ripemd_f(group, bl, cl, dl) + BUF_160[rl[i]] + hbl, sl[i]) + el | 0;
          al = el, el = dl, dl = rotl(cl, 10) | 0, cl = bl, bl = tl;
        }
        for (let i = 0; i < 16; i++) {
          const tr = rotl(ar + ripemd_f(rGroup, br, cr, dr) + BUF_160[rr[i]] + hbr, sr[i]) + er | 0;
          ar = er, er = dr, dr = rotl(cr, 10) | 0, cr = br, br = tr;
        }
      }
      this.set(this.h1 + cl + dr | 0, this.h2 + dl + er | 0, this.h3 + el + ar | 0, this.h4 + al + br | 0, this.h0 + bl + cr | 0);
    }
    roundClean() {
      clean2(BUF_160);
    }
    destroy() {
      this.destroyed = true;
      clean2(this.buffer);
      this.set(0, 0, 0, 0, 0);
    }
  };
  var ripemd160 = /* @__PURE__ */ createHasher2(() => new _RIPEMD160());

  // node_modules/@noble/hashes/sha2.js
  var SHA256_K = /* @__PURE__ */ Uint32Array.from([
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ]);
  var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
  var SHA2_32B = class extends HashMD {
    constructor(outputLen, IV) {
      super(64, outputLen, 8, false);
      // We cannot use array here since array allows indexing by variable
      // which means optimizer/compiler cannot use registers.
      // Numeric initializers matter: starting the fields as `undefined` changes
      // V8's field representation and makes sha256 3x slower (measured).
      __publicField(this, "A", 0);
      __publicField(this, "B", 0);
      __publicField(this, "C", 0);
      __publicField(this, "D", 0);
      __publicField(this, "E", 0);
      __publicField(this, "F", 0);
      __publicField(this, "G", 0);
      __publicField(this, "H", 0);
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
      const { A, B, C, D: D2, E, F: F2, G: G2, H } = this;
      return [A, B, C, D2, E, F2, G2, H];
    }
    // prettier-ignore
    set(A, B, C, D2, E, F2, G2, H) {
      this.A = A | 0;
      this.B = B | 0;
      this.C = C | 0;
      this.D = D2 | 0;
      this.E = E | 0;
      this.F = F2 | 0;
      this.G = G2 | 0;
      this.H = H | 0;
    }
    _cloneInto(to) {
      (to || (to = new this.constructor())).set(...this.get());
      return this._cloneIntoMeta(to);
    }
    process(view, offset) {
      for (let i = 0; i < 16; i++, offset += 4)
        SHA256_W[i] = view.getUint32(offset, false);
      for (let i = 16; i < 64; i++) {
        const W15 = SHA256_W[i - 15];
        const W2 = SHA256_W[i - 2];
        const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
        const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
        SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
      }
      let { A, B, C, D: D2, E, F: F2, G: G2, H } = this;
      for (let i = 0; i < 64; i++) {
        const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
        const T1 = H + sigma1 + Chi(E, F2, G2) + SHA256_K[i] + SHA256_W[i] | 0;
        const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
        const T2 = sigma0 + Maj(A, B, C) | 0;
        H = G2;
        G2 = F2;
        F2 = E;
        E = D2 + T1 | 0;
        D2 = C;
        C = B;
        B = A;
        A = T1 + T2 | 0;
      }
      A = A + this.A | 0;
      B = B + this.B | 0;
      C = C + this.C | 0;
      D2 = D2 + this.D | 0;
      E = E + this.E | 0;
      F2 = F2 + this.F | 0;
      G2 = G2 + this.G | 0;
      H = H + this.H | 0;
      this.set(A, B, C, D2, E, F2, G2, H);
    }
    roundClean() {
      clean2(SHA256_W);
    }
    destroy() {
      this.destroyed = true;
      this.set(0, 0, 0, 0, 0, 0, 0, 0);
      clean2(this.buffer);
    }
  };
  var _SHA256 = class extends SHA2_32B {
    constructor() {
      super(32, SHA256_IV);
    }
  };
  var sha256 = /* @__PURE__ */ createHasher2(
    () => new _SHA256(),
    /* @__PURE__ */ oidNist2(1)
  );

  // src/hash.ts
  function hash256(bytes) {
    return sha256(sha256(bytes));
  }
  function hash160(bytes) {
    return ripemd160(sha256(bytes));
  }
  function taggedHash(tag, bytes) {
    const tagHash = sha256(utf8ToBytes(tag));
    return sha256(concatBytes2(tagHash, tagHash, bytes));
  }

  // src/address.ts
  var base58check = createBase58check(sha256);
  var BECH32_MAX_LENGTH = 90;
  var LEGACY_HASH_LENGTH = 20;
  var AUTHSCRIPT_PROGRAM_LENGTH = 32;
  var AUTHSCRIPT_WITNESS_VERSION = 1;
  var STRICT_PQ_WITNESS_VERSION = 2;
  var STRICT_ECDSA_WITNESS_VERSION = 3;
  var WITNESS_FAMILIES = [
    {
      type: "authscript",
      witnessVersion: AUTHSCRIPT_WITNESS_VERSION,
      hrp: { mainnet: "nc", testnet: "tnc" }
    },
    {
      type: "pq",
      witnessVersion: STRICT_PQ_WITNESS_VERSION,
      hrp: { mainnet: "pq", testnet: "tpq" }
    },
    {
      type: "ecdsa",
      witnessVersion: STRICT_ECDSA_WITNESS_VERSION,
      hrp: { mainnet: "nq", testnet: "tnq" }
    }
  ];
  var LEGACY_VERSIONS = {
    53: { type: "p2pkh", network: "mainnet" },
    117: { type: "p2sh", network: "mainnet" },
    127: { type: "p2pkh", network: "testnet" },
    196: { type: "p2sh", network: "testnet" }
  };
  function familyByHrp(hrp) {
    for (const family of WITNESS_FAMILIES) {
      if (family.hrp.mainnet === hrp) {
        return { family, network: "mainnet" };
      }
      if (family.hrp.testnet === hrp) {
        return { family, network: "testnet" };
      }
    }
    return null;
  }
  function familyByVersion(version) {
    return WITNESS_FAMILIES.find((family) => family.witnessVersion === version) ?? null;
  }
  function tryDecode(decoder, address) {
    try {
      return decoder.decode(asBech32String(address), BECH32_MAX_LENGTH);
    } catch {
      return null;
    }
  }
  function decodeWitnessAddress(address, prefix, words) {
    const hrp = prefix.toLowerCase();
    const owner = familyByHrp(hrp);
    if (!owner) {
      throw new Error(`Unsupported Bech32m prefix "${hrp}" in ${address}`);
    }
    if (words.length === 0) {
      throw new Error(`Empty witness program in ${address}`);
    }
    const { family, network } = owner;
    const version = words[0];
    if (version !== family.witnessVersion) {
      const actual = familyByVersion(version);
      const hint = actual ? `; witness v${version} addresses use the "${actual.hrp[network]}" prefix` : "";
      const legacyHint = family.type === "ecdsa" && version === AUTHSCRIPT_WITNESS_VERSION ? " Generic AuthScript v1 addresses are now encoded as nc1p\u2026 / tnc1p\u2026 (same witness program): re-encode or regenerate the address." : "";
      throw new Error(
        `Address ${address}: the "${hrp}" prefix only encodes witness v${family.witnessVersion}, not v${version}${hint}.${legacyHint}`
      );
    }
    let program;
    try {
      program = bech32m.fromWords(words.slice(1));
    } catch {
      throw new Error(`Invalid witness program padding in ${address}`);
    }
    if (program.length !== AUTHSCRIPT_PROGRAM_LENGTH) {
      throw new Error(
        `Invalid witness program length ${program.length} in ${address} (expected ${AUTHSCRIPT_PROGRAM_LENGTH})`
      );
    }
    return {
      address,
      type: family.type,
      network,
      hrp,
      witnessVersion: family.witnessVersion,
      program
    };
  }
  function decodeLegacyAddress(address) {
    let payload;
    try {
      payload = base58check.decode(address);
    } catch {
      throw new Error(`Invalid address ${address}: not Base58Check nor a Neurai Bech32m address`);
    }
    if (payload.length !== LEGACY_HASH_LENGTH + 1) {
      throw new Error(`Invalid legacy address payload length in ${address}`);
    }
    const known = LEGACY_VERSIONS[payload[0]];
    if (!known) {
      throw new Error(`Unsupported legacy address version ${payload[0]} in ${address}`);
    }
    return {
      address,
      type: known.type,
      network: known.network,
      version: payload[0],
      hash: payload.slice(1)
    };
  }
  function decodeAddress(address) {
    if (typeof address !== "string" || address.length === 0) {
      throw new Error("Address is required");
    }
    const witness = tryDecode(bech32m, address);
    if (witness) {
      return decodeWitnessAddress(address, witness.prefix, witness.words);
    }
    if (tryDecode(bech32, address)) {
      throw new Error(
        `Address ${address} is Bech32 (witness v0), which Neurai does not use: AuthScript addresses are Bech32m (nc1p\u2026 / pq1z\u2026 / nq1r\u2026)`
      );
    }
    try {
      return decodeLegacyAddress(address);
    } catch (legacyError) {
      const separator = address.lastIndexOf("1");
      const hrp = separator > 0 ? address.slice(0, separator).toLowerCase() : "";
      if (familyByHrp(hrp)) {
        throw new Error(
          `Invalid Bech32m address ${address} (checksum, case or character error)`
        );
      }
      throw legacyError;
    }
  }
  function isWitnessAddress(destination) {
    return destination !== null && destination.type !== "p2pkh" && destination.type !== "p2sh";
  }
  function tryDecodeAddress(address) {
    try {
      return decodeAddress(address);
    } catch {
      return null;
    }
  }

  // node_modules/@noble/hashes/hmac.js
  var _HMAC = class {
    constructor(hash, key) {
      __publicField(this, "oHash");
      __publicField(this, "iHash");
      __publicField(this, "blockLen");
      __publicField(this, "outputLen");
      __publicField(this, "canXOF", false);
      __publicField(this, "finished", false);
      __publicField(this, "destroyed", false);
      ahash(hash);
      abytes3(key, void 0, "key");
      this.iHash = hash.create();
      if (typeof this.iHash.update !== "function")
        throw new Error("expected Hash instance");
      this.blockLen = this.iHash.blockLen;
      this.outputLen = this.iHash.outputLen;
      const blockLen = this.blockLen;
      const pad = new Uint8Array(blockLen);
      pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
      for (let i = 0; i < pad.length; i++)
        pad[i] ^= 54;
      this.iHash.update(pad);
      this.oHash = hash.create();
      for (let i = 0; i < pad.length; i++)
        pad[i] ^= 54 ^ 92;
      this.oHash.update(pad);
      clean2(pad);
    }
    update(buf) {
      aexists2(this);
      this.iHash.update(buf);
      return this;
    }
    digestInto(out) {
      aexists2(this);
      aoutput2(out, this);
      this.finished = true;
      const buf = out.subarray(0, this.outputLen);
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
      to || (to = Object.create(Object.getPrototypeOf(this), {}));
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
  };
  var hmac = /* @__PURE__ */ (() => {
    const hmac_ = ((hash, key, message) => new _HMAC(hash, key).update(message).digest());
    hmac_.create = (hash, key) => new _HMAC(hash, key);
    return hmac_;
  })();

  // node_modules/@noble/secp256k1/index.js
  var freeze2 = Object.freeze;
  var P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
  var N2 = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
  var Gx = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n;
  var Gy = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n;
  var secp256k1_CURVE = freeze2({
    p: P,
    n: N2,
    h: 1n,
    a: 0n,
    b: 7n,
    Gx,
    Gy
  });
  var L = 32;
  var isBytes4 = (a) => {
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && a.BYTES_PER_ELEMENT === 1;
  };
  var abytes4 = (value, length, title = "") => {
    if (isBytes4(value) && (length === void 0 || value.length === length))
      return value;
    const bytes = isBytes4(value);
    const ofLen = length !== void 0 ? ` of length ${length}` : "";
    const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
    const message = (title ? `"${title}" ` : "") + "expected Uint8Array" + ofLen + ", got " + got;
    if (!bytes)
      throw new TypeError(message);
    throw new RangeError(message);
  };
  var cloneBytes = (value) => Uint8Array.from(value);
  var snapshotBytes = (value, title, length) => cloneBytes(abytes4(value, length, title));
  var padh = (n, pad) => n.toString(16).padStart(pad, "0");
  var bytesToHex = (bytes) => {
    let hex = "";
    for (const byte of abytes4(bytes))
      hex += padh(byte, 2);
    return hex;
  };
  var hexToBytes2 = (hex) => {
    const e = "hex invalid";
    if (typeof hex !== "string")
      throw new TypeError(e);
    if (hex.length % 2 || !/^[\da-f]*$/i.test(hex))
      throw new RangeError(e);
    const array = new Uint8Array(hex.length / 2);
    for (let ai = 0, hi = 0; ai < array.length; ai++, hi += 2) {
      const n1 = hex.charCodeAt(hi);
      const n2 = hex.charCodeAt(hi + 1);
      array[ai] = ((n1 & 15) + (n1 >> 6) * 9) * 16 + (n2 & 15) + (n2 >> 6) * 9;
    }
    return array;
  };
  var subtle = () => {
    const s = globalThis?.crypto?.subtle;
    if (s)
      return s;
    throw new Error("crypto.subtle must be defined, consider polyfill");
  };
  var concatBytes3 = (...arrays) => {
    let sum = 0;
    for (const a of arrays)
      sum += abytes4(a).length;
    const res = new Uint8Array(sum);
    let pad = 0;
    for (const a of arrays) {
      res.set(a, pad);
      pad += a.length;
    }
    return res;
  };
  var randomBytes3 = (len = L) => {
    const c = globalThis?.crypto;
    if (typeof c?.getRandomValues !== "function")
      throw new Error("crypto.getRandomValues must be defined, consider polyfill");
    return c.getRandomValues(new Uint8Array(len));
  };
  var big = BigInt;
  var arange = (n, min, max, msg = "bad number: out of range") => {
    if (typeof n !== "bigint")
      throw new TypeError(msg);
    if (min <= n && n < max)
      return n;
    throw new RangeError(msg);
  };
  var M = (a, b = P) => (a %= b) >= 0n ? a : b + a;
  var modN = (a) => M(a, N2);
  var invert = (number, modulo) => {
    if (number === 0n)
      throw new Error("invert: expected non-zero number");
    if (modulo <= 1n)
      throw new Error("invert: expected modulus > 1, got " + modulo);
    let a = M(number, modulo);
    let b = modulo;
    let x = 0n, u = 1n;
    while (a !== 0n) {
      const q = b / a;
      const r = b - a * q;
      const m = x - u * q;
      b = a, a = r, x = u, u = m;
    }
    const gcd = b;
    if (gcd !== 1n)
      throw new Error("invert: does not exist");
    return M(x, modulo);
  };
  var _hash = (name) => {
    const fn = hashes[name];
    if (typeof fn !== "function")
      throw new Error("hashes." + name + " not set");
    return fn;
  };
  var callHash = (name, a, b) => abytes4(_hash(name)(a, b), L, "digest");
  var callHashAsync = async (name, a, b) => abytes4(await _hash(name)(a, b), L, "digest");
  var apoint = (p) => {
    if (p instanceof Point)
      return p;
    throw new TypeError("Point expected");
  };
  var E_BADPOINT = "bad point: not on curve";
  var koblitz = (x) => M(M(x * x) * x + 7n);
  var FpIsValid = (n) => arange(n, 0n, P);
  var FpIsValidNot0 = (n) => arange(n, 1n, P);
  var FnIsValidNot0 = (n) => arange(n, 1n, N2);
  var isEven = (y) => !(y & 1n);
  var getPrefix = (y) => Uint8Array.of(isEven(y) ? 2 : 3);
  var lift_x = (x) => {
    const c = koblitz(FpIsValidNot0(x));
    let r = 1n;
    for (let num = c, e = (P + 1n) / 4n; e > 0n; e >>= 1n) {
      if (e & 1n)
        r = r * num % P;
      num = num * num % P;
    }
    if (M(r * r) !== c)
      throw new Error("sqrt invalid");
    return new Point(x, isEven(r) ? r : M(-r), 1n);
  };
  var _Point = class _Point {
    constructor(X, Y, Z) {
      __publicField(this, "X");
      __publicField(this, "Y");
      __publicField(this, "Z");
      this.X = FpIsValid(X);
      this.Y = FpIsValidNot0(Y);
      this.Z = FpIsValid(Z);
      freeze2(this);
    }
    /** Returns the shared curve metadata object by reference.
     * It is readonly only at type level, and mutating it won't retarget arithmetic,
     * which already uses module-load snapshots. */
    static CURVE() {
      return secp256k1_CURVE;
    }
    /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
    static fromAffine(ap) {
      const { x, y } = ap;
      return x === 0n && y === 0n ? I : new _Point(x, y, 1n);
    }
    /** Convert Uint8Array or hex string to Point. */
    static fromBytes(bytes) {
      abytes4(bytes);
      const length = bytes.length;
      const head = bytes[0];
      const x = sliceBytesNumBE(bytes, 1, 33);
      try {
        if (length === 33 && (head === 2 || head === 3)) {
          const p = lift_x(x);
          return head === 3 ? p.negate() : p;
        }
        if (length === 65 && head === 4)
          return new _Point(x, sliceBytesNumBE(bytes, 33, 65), 1n).assertValidity();
      } catch (error) {
        throw new Error(E_BADPOINT);
      }
      throw new Error(E_BADPOINT);
    }
    static fromHex(hex) {
      return _Point.fromBytes(hexToBytes2(hex));
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    /** Equality check: compare points P&Q. */
    equals(other) {
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const { X: X2, Y: Y2, Z: Z2 } = apoint(other);
      return M(X1 * Z2) === M(X2 * Z1) && M(Y1 * Z2) === M(Y2 * Z1);
    }
    is0() {
      return this.Z === 0n;
    }
    /** Flip point over y coordinate. */
    negate() {
      return new _Point(this.X, M(-this.Y), this.Z);
    }
    /** Point doubling: P+P, complete formula. */
    double() {
      return this.add(this);
    }
    /**
     * Point addition: P+Q, complete, exception-free formula
     * (Renes-Costello-Batina, algo 1 of [2015/1060](https://eprint.iacr.org/2015/1060)).
     * Cost: `12M + 0S + 3*a + 3*b3 + 23add`.
     */
    // prettier-ignore
    add(other) {
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const { X: X2, Y: Y2, Z: Z2 } = apoint(other);
      const a = 0n;
      const b = 7n;
      let X3 = 0n, Y3 = 0n, Z3 = 0n;
      const b3 = M(b * 3n);
      let t0 = M(X1 * X2), t1 = M(Y1 * Y2), t2 = M(Z1 * Z2), t3 = M(X1 + Y1);
      let t4 = M(X2 + Y2);
      t3 = M(t3 * t4);
      t4 = M(t0 + t1);
      t3 = M(t3 - t4);
      t4 = M(X1 + Z1);
      let t5 = M(X2 + Z2);
      t4 = M(t4 * t5);
      t5 = M(t0 + t2);
      t4 = M(t4 - t5);
      t5 = M(Y1 + Z1);
      X3 = M(Y2 + Z2);
      t5 = M(t5 * X3);
      X3 = M(t1 + t2);
      t5 = M(t5 - X3);
      Z3 = M(a * t4);
      X3 = M(b3 * t2);
      Z3 = M(X3 + Z3);
      X3 = M(t1 - Z3);
      Z3 = M(t1 + Z3);
      Y3 = M(X3 * Z3);
      t1 = M(t0 + t0);
      t1 = M(t1 + t0);
      t2 = M(a * t2);
      t4 = M(b3 * t4);
      t1 = M(t1 + t2);
      t2 = M(t0 - t2);
      t2 = M(a * t2);
      t4 = M(t4 + t2);
      t0 = M(t1 * t4);
      Y3 = M(Y3 + t0);
      t0 = M(t5 * t4);
      X3 = M(t3 * X3);
      X3 = M(X3 - t0);
      t0 = M(t3 * t1);
      Z3 = M(t5 * Z3);
      Z3 = M(Z3 + t0);
      return new _Point(X3, Y3, Z3);
    }
    subtract(other) {
      return this.add(apoint(other).negate());
    }
    /**
     * Point-by-scalar multiplication. Scalar must be in range 1 <= n < CURVE.n.
     * Uses {@link wNAF} for base point.
     * Uses fake point to mitigate leakage shape in JS, not as a hard constant-time guarantee.
     * @param n scalar by which point is multiplied
     * @param safe safe mode guards against timing attacks; unsafe mode is faster
     */
    multiply(n, safe = true) {
      if (!safe && n === 0n)
        return I;
      FnIsValidNot0(n);
      if (n === 1n)
        return this;
      if (this.equals(G))
        return wNAF(n).p;
      let p = I;
      let f = G;
      let d = this;
      for (let i = 0; safe ? i < 256 : n > 0n; i++) {
        if (n & 1n)
          p = p.add(d);
        else if (safe)
          f = f.add(d);
        d = d.double();
        n >>= 1n;
      }
      return p;
    }
    multiplyUnsafe(scalar) {
      return this.multiply(scalar, false);
    }
    /** Convert point to 2d xy affine point. (X, Y, Z) ∋ (x=X/Z, y=Y/Z) */
    toAffine() {
      const { X: x, Y: y, Z: z } = this;
      if (z === 0n)
        return { x: 0n, y: 0n };
      if (z === 1n)
        return { x, y };
      const iz = invert(z, P);
      if (M(z * iz) !== 1n)
        throw new Error("inverse invalid");
      return { x: M(x * iz), y: M(y * iz) };
    }
    /** Checks if the point is valid and on-curve. */
    assertValidity() {
      const { x, y } = this.toAffine();
      FpIsValidNot0(x);
      FpIsValidNot0(y);
      if (M(y * y) !== koblitz(x))
        throw new Error(E_BADPOINT);
      return this;
    }
    /** Converts point to 33/65-byte Uint8Array. */
    toBytes(isCompressed = true) {
      const { x, y } = this.assertValidity().toAffine();
      const x32b = numTo32b(x);
      if (isCompressed)
        return concatBytes3(getPrefix(y), x32b);
      return concatBytes3(Uint8Array.of(4), x32b, numTo32b(y));
    }
    toHex(isCompressed) {
      return bytesToHex(this.toBytes(isCompressed));
    }
  };
  __publicField(_Point, "BASE");
  __publicField(_Point, "ZERO");
  var Point = _Point;
  var G = new Point(Gx, Gy, 1n);
  var I = new Point(0n, 1n, 0n);
  Point.BASE = G;
  Point.ZERO = I;
  var doubleScalarMulUns = (R, u1, u2) => {
    return G.multiply(u1, false).add(R.multiply(u2, false)).assertValidity();
  };
  var bytesToNumBE = (b) => big("0x" + (bytesToHex(b) || "0"));
  var sliceBytesNumBE = (b, from, to) => bytesToNumBE(b.subarray(from, to));
  var numTo32b = (num) => hexToBytes2(padh(arange(num, 0n, 2n ** 256n), L * 2));
  var secretKeyToScalar = (secretKey) => {
    const num = bytesToNumBE(abytes4(secretKey, L, "secret key"));
    return arange(num, 1n, N2, "invalid secret key: outside of range");
  };
  var highS = (n) => n > N2 >> 1n;
  var getRecoveryBit = (x, y, r) => (x === r ? 0 : 2) | Number(y & 1n);
  var getPublicKey = (privKey, isCompressed = true) => {
    return G.multiply(secretKeyToScalar(privKey)).toBytes(isCompressed);
  };
  var assertRecoveryBit = (recovery) => {
    if (recovery != null && [0, 1, 2, 3].includes(recovery))
      return recovery;
    throw new Error("invalid recovery id");
  };
  var assertSigFormat = (format) => {
    if (format === "der")
      throw new Error('Signature format "der" is not supported: switch to noble-curves');
    if (format != null && format !== SIG_COMPACT && format !== SIG_RECOVERED)
      throw new Error("Signature format must be one of: compact, recovered, der");
  };
  var assertSigLength = (sig, format = SIG_COMPACT) => {
    assertSigFormat(format);
    const bytes = abytes4(sig, void 0, "signature");
    const len = 64 + Number(format === SIG_RECOVERED);
    if (bytes.length !== len)
      throw new Error(`Signature format "${format}" expects Uint8Array with length ${len}`);
    return bytes;
  };
  var Signature = class _Signature {
    constructor(r, s, recovery) {
      __publicField(this, "r");
      __publicField(this, "s");
      __publicField(this, "recovery");
      this.r = FnIsValidNot0(r);
      this.s = FnIsValidNot0(s);
      if (recovery != null)
        this.recovery = assertRecoveryBit(recovery);
      freeze2(this);
    }
    static fromBytes(b, format = SIG_COMPACT) {
      b = assertSigLength(b, format);
      let rec;
      if (format === SIG_RECOVERED) {
        rec = b[0];
        b = b.subarray(1);
      }
      const r = sliceBytesNumBE(b, 0, L);
      const s = sliceBytesNumBE(b, L, 64);
      return new _Signature(r, s, rec);
    }
    addRecoveryBit(bit) {
      return new _Signature(this.r, this.s, bit);
    }
    hasHighS() {
      return highS(this.s);
    }
    toBytes(format = SIG_COMPACT) {
      assertSigFormat(format);
      const { r, s, recovery } = this;
      const res = concatBytes3(numTo32b(r), numTo32b(s));
      if (format === SIG_RECOVERED) {
        return concatBytes3(Uint8Array.of(assertRecoveryBit(recovery)), res);
      }
      return res;
    }
  };
  var MAX_PREHASHED_BYTES = 8192;
  var E_MSGBIG = "input is too large";
  var oversizedMsg = (bytes, prehash) => !prehash && bytes.length > MAX_PREHASHED_BYTES;
  var bits2int = (bytes) => {
    if (oversizedMsg(bytes))
      throw new Error(E_MSGBIG);
    const delta = bytes.length * 8 - 256;
    const num = bytesToNumBE(bytes);
    return delta > 0 ? num >> big(delta) : num;
  };
  var bits2int_modN = (bytes) => modN(bits2int(abytes4(bytes)));
  var SIG_COMPACT = "compact";
  var SIG_RECOVERED = "recovered";
  var _sha = "SHA-256";
  var hashes = {
    hmacSha256Async: async (key, message) => {
      const s = subtle();
      const k = await s.importKey("raw", key, { name: "HMAC", hash: _sha }, false, ["sign"]);
      return new Uint8Array(await s.sign("HMAC", k, message));
    },
    hmacSha256: void 0,
    sha256Async: async (msg) => new Uint8Array(await subtle().digest(_sha, msg)),
    sha256: void 0
  };
  var prepMsg = (msg, prehash, async_) => {
    const message = abytes4(msg, void 0, "message");
    if (!prehash)
      return message;
    return async_ ? callHashAsync("sha256Async", message) : callHash("sha256", message);
  };
  var NULL = /* @__PURE__ */ new Uint8Array(0);
  var byte0 = /* @__PURE__ */ Uint8Array.of(0);
  var byte1 = /* @__PURE__ */ Uint8Array.of(1);
  var _drbgErr = "drbg: tried max amount of iterations";
  var hmacDrbg = (seed, pred) => {
    let v = new Uint8Array(L);
    let k = new Uint8Array(L);
    let i = 0;
    const reset = () => {
      v.fill(1);
      k.fill(0);
    };
    const h = (...b) => callHash("hmacSha256", k, concatBytes3(v, ...b));
    const reseed = (seed2 = NULL) => {
      k = h(byte0, seed2);
      v = h();
      if (seed2.length === 0)
        return;
      k = h(byte1, seed2);
      v = h();
    };
    const gen = () => {
      if (i++ >= 1e3)
        throw new Error(_drbgErr);
      v = h();
      return v;
    };
    reset();
    reseed(seed);
    let res = void 0;
    while (!(res = pred(gen())))
      reseed();
    reset();
    return res;
  };
  var _sign = (messageHash2, secretKey, opts, drbg) => {
    const [lowS, , format, extraEntropy] = opts;
    const h1i = bits2int_modN(messageHash2);
    const d = secretKeyToScalar(secretKey);
    const seedArgs = [numTo32b(d), numTo32b(h1i)];
    if (extraEntropy != null && extraEntropy !== false) {
      seedArgs.push(abytes4(extraEntropy === true ? randomBytes3(L) : extraEntropy, void 0, "extraEntropy"));
    }
    const k2sig = (kBytes) => {
      const k = bits2int(kBytes);
      if (!(1n <= k && k < N2))
        return;
      const ik = invert(k, N2);
      const q = G.multiply(k).toAffine();
      const r = modN(q.x);
      if (r === 0n)
        return;
      const s = modN(ik * (h1i + r * d));
      if (s === 0n)
        return;
      let recovery = getRecoveryBit(q.x, q.y, r);
      let normS = s;
      if (lowS && highS(s)) {
        normS = N2 - s;
        recovery ^= 1;
      }
      const sig = new Signature(r, normS, recovery);
      return sig.toBytes(format);
    };
    return drbg(concatBytes3(...seedArgs), k2sig);
  };
  var setDefaults = (opts, own = false) => {
    const e = opts.extraEntropy;
    return [
      opts.lowS ?? true,
      opts.prehash ?? true,
      opts.format ?? SIG_COMPACT,
      own && e != null && typeof e !== "boolean" ? snapshotBytes(e, "extraEntropy") : e
    ];
  };
  var sign = (message, secretKey, opts = {}) => {
    const o = setDefaults(opts);
    assertSigFormat(o[2]);
    const msg = prepMsg(message, o[1], false);
    return _sign(msg, secretKey, o, hmacDrbg);
  };
  var _recover = (signature, messageHash2, isCompressed) => {
    const { r, s, recovery: rec } = Signature.fromBytes(signature, "recovered");
    const recovery = assertRecoveryBit(rec);
    const h = bits2int_modN(messageHash2);
    const radj = recovery > 1 ? r + N2 : r;
    FpIsValidNot0(radj);
    const ir = invert(radj, N2);
    const R = Point.fromBytes(concatBytes3(getPrefix(big(recovery)), numTo32b(radj)));
    return doubleScalarMulUns(R, modN(-h * ir), modN(s * ir)).toBytes(isCompressed);
  };
  var recoverPublicKey = (signature, message, opts = {}) => {
    const msg = prepMsg(message, setDefaults(opts)[1], false);
    return _recover(signature, msg, opts.isCompressed ?? true);
  };
  var precompute = () => {
    const points = [];
    let p = G;
    let b = p;
    for (let w = 0; w < 33; w++) {
      b = p;
      points.push(b);
      for (let i = 1; i < 128; i++) {
        b = b.add(p);
        points.push(b);
      }
      p = b.double();
    }
    return points;
  };
  var Gpows = void 0;
  var ctneg = (cnd, p) => {
    const n = p.negate();
    return cnd ? n : p;
  };
  var wNAF = (n) => {
    const comp = Gpows || (Gpows = precompute());
    let p = I;
    let f = G;
    for (let w = 0; w < 33; w++) {
      let wbits = Number(n & 255n);
      n >>= 8n;
      if (wbits > 128) {
        wbits -= 256;
        n += 1n;
      }
      const off = w * 128;
      const offP = off + Math.abs(wbits) - 1;
      const isOddW = w % 2 !== 0;
      const isNeg = wbits < 0;
      if (wbits === 0) {
        f = f.add(ctneg(isOddW, comp[off]));
      } else {
        p = p.add(ctneg(isNeg, comp[offP]));
      }
    }
    if (n !== 0n)
      throw new Error("invalid wnaf");
    return { p, f };
  };

  // src/legacy-message.ts
  hashes.hmacSha256 = (key, msg) => hmac(sha256, key, msg);
  hashes.sha256 = sha256;
  var base58check2 = createBase58check(sha256);
  function encodeCompactSignature(signature, recovery, compressed) {
    let header = recovery + 27;
    if (compressed) {
      header += 4;
    }
    return concatBytes2(Uint8Array.of(header), signature);
  }
  function decodeCompactSignature(bytes) {
    if (bytes.length !== 65) {
      throw new Error("Invalid signature length");
    }
    const flagByte = bytes[0] - 27;
    if (flagByte < 0 || flagByte > 15) {
      throw new Error("Invalid signature parameter");
    }
    return {
      compressed: !!(flagByte & 12),
      recovery: flagByte & 3,
      signature: bytes.subarray(1),
      segwitType: !(flagByte & 8) ? null : !(flagByte & 4) ? "p2sh(p2wpkh)" : "p2wpkh"
    };
  }
  function decodeBech32Address(address) {
    const result = bech32.decode(asBech32String(address));
    return bech32.fromWords(result.words.slice(1));
  }
  function segwitRedeemHash(publicKeyHash) {
    const redeemScript = concatBytes2(Uint8Array.of(0, 20), publicKeyHash);
    return hash160(redeemScript);
  }
  function magicHash(message, messagePrefix) {
    const prefix = typeof messagePrefix === "string" ? utf8ToBytes(messagePrefix) : messagePrefix;
    const payload = typeof message === "string" ? utf8ToBytes(message) : message;
    return hash256(concatBytes2(prefix, encodeCompactSize(payload.length), payload));
  }
  function signCompactHash(hash, privateKey, compressed) {
    const recoveredSignature = sign(hash, privateKey, {
      prehash: false,
      format: "recovered"
    });
    return encodeCompactSignature(
      recoveredSignature.subarray(1),
      recoveredSignature[0],
      compressed
    );
  }
  function recoverCompactPublicKey(hash, signature) {
    if (signature.length !== 65) {
      return null;
    }
    const recovery = signature[0] - 27 & 3;
    const compressed = (signature[0] - 27 & 4) !== 0;
    try {
      const publicKey = recoverPublicKey(
        concatBytes2(Uint8Array.of(recovery), signature.subarray(1)),
        hash,
        { prehash: false }
      );
      return {
        compressed,
        publicKey: compressed ? publicKey : Point.fromBytes(publicKey).toBytes(false)
      };
    } catch {
      return null;
    }
  }
  function getCompressedPublicKey(privateKey) {
    return getPublicKey(privateKey, true);
  }
  function signLegacyMessage(message, privateKey, compressed, messagePrefix) {
    return signCompactHash(magicHash(message, messagePrefix), privateKey, compressed);
  }
  function verifyLegacyCompactMessage(message, address, signature, messagePrefix) {
    const parsed = decodeCompactSignature(signature);
    const hash = magicHash(message, messagePrefix);
    const recoveredSignature = concatBytes2(
      Uint8Array.of(parsed.recovery),
      parsed.signature
    );
    const publicKey = recoverPublicKey(recoveredSignature, hash, {
      prehash: false
    });
    const normalizedPublicKey = parsed.compressed ? publicKey : Point.fromBytes(publicKey).toBytes(false);
    const publicKeyHash = hash160(normalizedPublicKey);
    if (parsed.segwitType === "p2sh(p2wpkh)") {
      return bytesEqual(
        segwitRedeemHash(publicKeyHash),
        base58check2.decode(address).slice(1)
      );
    }
    if (parsed.segwitType === "p2wpkh") {
      return bytesEqual(publicKeyHash, decodeBech32Address(address));
    }
    return bytesEqual(publicKeyHash, base58check2.decode(address).slice(1));
  }

  // src/core.ts
  var MESSAGE_MAGIC = "Neurai Signed Message:\n";
  var MESSAGE_MAGIC_BYTES = utf8ToBytes(MESSAGE_MAGIC);
  var LEGACY_MESSAGE_PREFIX = concatBytes2(
    encodeCompactSize(MESSAGE_MAGIC_BYTES.length),
    MESSAGE_MAGIC_BYTES
  );
  var STRICT_MESSAGE_MAGIC_BYTES = utf8ToBytes("Neurai Strict AuthScript Message");
  var STRICT_MESSAGE_PREFIX = concatBytes2(
    encodeCompactSize(STRICT_MESSAGE_MAGIC_BYTES.length),
    STRICT_MESSAGE_MAGIC_BYTES
  );
  var MESSAGE_HASH_LENGTH = 32;
  var PQ_MESSAGE_SIGNATURE_PREFIX = 53;
  var PQ_SERIALIZED_PUBKEY_PREFIX = 5;
  var PQ_PUBLIC_KEY_LENGTH = 1312;
  var PQ_SERIALIZED_PUBKEY_LENGTH = 1 + PQ_PUBLIC_KEY_LENGTH;
  var PQ_SIGNATURE_LENGTH = 2420;
  var AUTHSCRIPT_AUTH_TYPE_PQ = 1;
  var AUTHSCRIPT_AUTH_TYPE_ECDSA = 2;
  var AUTHSCRIPT_DEFAULT_WITNESS_SCRIPT = Uint8Array.of(81);
  var AUTHSCRIPT_TAG = "NeuraiAuthScript";
  function encodeMessageHash(message) {
    const messageBytes = utf8ToBytes(message);
    return hash256(
      concatBytes2(
        LEGACY_MESSAGE_PREFIX,
        encodeCompactSize(messageBytes.length),
        messageBytes
      )
    );
  }
  function toSignatureBytes(signature) {
    return typeof signature === "string" ? fromBase64(signature) : signature;
  }
  function normalizePQPublicKey(publicKey) {
    if (publicKey.length === PQ_SERIALIZED_PUBKEY_LENGTH && publicKey[0] === PQ_SERIALIZED_PUBKEY_PREFIX) {
      return publicKey;
    }
    if (publicKey.length === PQ_PUBLIC_KEY_LENGTH) {
      return concatBytes2(Uint8Array.of(PQ_SERIALIZED_PUBKEY_PREFIX), publicKey);
    }
    throw new Error("Invalid PQ public key length");
  }
  function getAuthScriptCommitment(commitmentVersion, authType, publicKey) {
    return taggedHash(
      AUTHSCRIPT_TAG,
      concatBytes2(
        Uint8Array.of(commitmentVersion, authType),
        hash160(publicKey),
        sha256(AUTHSCRIPT_DEFAULT_WITNESS_SCRIPT)
      )
    );
  }
  function decodePQMessageSignature(payload) {
    let offset = 0;
    if (payload[offset++] !== PQ_MESSAGE_SIGNATURE_PREFIX) {
      return null;
    }
    const publicKeyLength = decodeCompactSize(payload, offset);
    offset = publicKeyLength.offset;
    const serializedPublicKey = payload.subarray(
      offset,
      offset + publicKeyLength.value
    );
    offset += publicKeyLength.value;
    const signatureLength = decodeCompactSize(payload, offset);
    offset = signatureLength.offset;
    const pqSignature = payload.subarray(offset, offset + signatureLength.value);
    offset += signatureLength.value;
    if (offset !== payload.length) {
      return null;
    }
    if (serializedPublicKey.length !== PQ_SERIALIZED_PUBKEY_LENGTH || serializedPublicKey[0] !== PQ_SERIALIZED_PUBKEY_PREFIX || pqSignature.length !== PQ_SIGNATURE_LENGTH) {
      return null;
    }
    return { serializedPublicKey, pqSignature };
  }
  function verifyPQDestination(message, destination, signature) {
    if (destination.type !== "authscript" && destination.type !== "pq") {
      return false;
    }
    const decoded = decodePQMessageSignature(toSignatureBytes(signature));
    if (!decoded) {
      return false;
    }
    const expectedProgram = getAuthScriptCommitment(
      destination.witnessVersion,
      AUTHSCRIPT_AUTH_TYPE_PQ,
      decoded.serializedPublicKey
    );
    if (!bytesEqual(expectedProgram, destination.program)) {
      return false;
    }
    const plainHash = encodeMessageHash(message);
    const hash = destination.type === "pq" ? strictMessageHash(destination.witnessVersion, destination.program, plainHash) : plainHash;
    return ml_dsa44.verify(
      decoded.pqSignature,
      hash,
      decoded.serializedPublicKey.subarray(1)
    );
  }
  function verifyECDSADestination(message, destination, signature) {
    if (destination.type !== "ecdsa") {
      return false;
    }
    const hash = strictMessageHash(
      destination.witnessVersion,
      destination.program,
      encodeMessageHash(message)
    );
    const recovered = recoverCompactPublicKey(hash, toSignatureBytes(signature));
    if (!recovered || !recovered.compressed) {
      return false;
    }
    return bytesEqual(
      getAuthScriptCommitment(
        destination.witnessVersion,
        AUTHSCRIPT_AUTH_TYPE_ECDSA,
        recovered.publicKey
      ),
      destination.program
    );
  }
  function messageHash(message) {
    return encodeMessageHash(message);
  }
  function strictMessageHash(witnessVersion, program, messageHash2) {
    if (witnessVersion !== STRICT_PQ_WITNESS_VERSION && witnessVersion !== STRICT_ECDSA_WITNESS_VERSION) {
      throw new Error(
        `Witness v${witnessVersion} is not a strict AuthScript family (expected 2 or 3)`
      );
    }
    if (program.length !== AUTHSCRIPT_PROGRAM_LENGTH) {
      throw new Error(`Strict AuthScript program must be ${AUTHSCRIPT_PROGRAM_LENGTH} bytes`);
    }
    if (messageHash2.length !== MESSAGE_HASH_LENGTH) {
      throw new Error(`Message hash must be ${MESSAGE_HASH_LENGTH} bytes`);
    }
    return hash256(
      concatBytes2(
        STRICT_MESSAGE_PREFIX,
        Uint8Array.of(witnessVersion),
        program,
        messageHash2
      )
    );
  }
  function sign2(message, privateKey, compressed = true) {
    const signature = signLegacyMessage(
      message,
      privateKey,
      compressed,
      LEGACY_MESSAGE_PREFIX
    );
    return toBase64(signature);
  }
  function signECDSAWitnessMessage(message, privateKey, address) {
    const destination = decodeAddress(address);
    if (destination.type !== "ecdsa") {
      throw new Error(
        `Address ${address} is not a strict ECDSA AuthScript address (nq1r\u2026 / tnq1r\u2026)`
      );
    }
    const expectedProgram = getAuthScriptCommitment(
      destination.witnessVersion,
      AUTHSCRIPT_AUTH_TYPE_ECDSA,
      getCompressedPublicKey(privateKey)
    );
    if (!bytesEqual(expectedProgram, destination.program)) {
      throw new Error(`Address ${address} does not belong to this private key`);
    }
    const hash = strictMessageHash(
      destination.witnessVersion,
      destination.program,
      encodeMessageHash(message)
    );
    return toBase64(signCompactHash(hash, privateKey, true));
  }
  function signPQMessage(message, privateKey, publicKey, address) {
    const serializedPublicKey = normalizePQPublicKey(publicKey);
    let hash = encodeMessageHash(message);
    if (address !== void 0) {
      const destination = decodeAddress(address);
      if (destination.type !== "authscript" && destination.type !== "pq") {
        throw new Error(
          `Address ${address} is not a PQ message address (generic AuthScript v1 nc1p\u2026 / tnc1p\u2026 or strict PQ v2 pq1z\u2026 / tpq1z\u2026)`
        );
      }
      const expectedProgram = getAuthScriptCommitment(
        destination.witnessVersion,
        AUTHSCRIPT_AUTH_TYPE_PQ,
        serializedPublicKey
      );
      if (!bytesEqual(expectedProgram, destination.program)) {
        throw new Error(`Address ${address} does not belong to this PQ public key`);
      }
      if (destination.type === "pq") {
        hash = strictMessageHash(destination.witnessVersion, destination.program, hash);
      }
    }
    const pqSignature = ml_dsa44.sign(hash, privateKey);
    const payload = concatBytes2(
      Uint8Array.of(PQ_MESSAGE_SIGNATURE_PREFIX),
      encodeCompactSize(serializedPublicKey.length),
      serializedPublicKey,
      encodeCompactSize(pqSignature.length),
      pqSignature
    );
    return toBase64(payload);
  }
  function verifyLegacyMessage(message, address, signature) {
    try {
      return verifyLegacyCompactMessage(
        message,
        address,
        toSignatureBytes(signature),
        LEGACY_MESSAGE_PREFIX
      );
    } catch {
      return false;
    }
  }
  function verifyPQMessage(message, address, signature) {
    try {
      const destination = tryDecodeAddress(address);
      return isWitnessAddress(destination) && verifyPQDestination(message, destination, signature);
    } catch {
      return false;
    }
  }
  function verifyECDSAWitnessMessage(message, address, signature) {
    try {
      const destination = tryDecodeAddress(address);
      return isWitnessAddress(destination) && verifyECDSADestination(message, destination, signature);
    } catch {
      return false;
    }
  }
  function verifyMessage(message, address, signature) {
    try {
      const destination = tryDecodeAddress(address);
      if (!isWitnessAddress(destination)) {
        return verifyLegacyMessage(message, address, signature);
      }
      return destination.type === "ecdsa" ? verifyECDSADestination(message, destination, signature) : verifyPQDestination(message, destination, signature);
    } catch {
      return false;
    }
  }

  // src/global.ts
  if (typeof globalThis !== "undefined") {
    globalThis.NeuraiMessage = browser_exports;
  }
  var global_default = browser_exports;
  return __toCommonJS(global_exports);
})();
/*! Bundled license information:

@noble/curves/utils.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/post-quantum/utils.js:
@noble/post-quantum/_crystals.js:
@noble/post-quantum/ml-dsa.js:
  (*! noble-post-quantum - MIT License (c) 2024 Paul Miller (paulmillr.com) *)

@scure/base/index.js:
  (*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/secp256k1/index.js:
  (*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) *)
*/
