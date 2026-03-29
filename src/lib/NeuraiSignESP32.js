"use strict";
var NeuraiSignESP32 = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value2) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value: value2 }) : obj[key] = value2;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
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
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value2) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value2);

  // node_modules/base64-js/index.js
  var require_base64_js = __commonJS({
    "node_modules/base64-js/index.js"(exports) {
      "use strict";
      exports.byteLength = byteLength;
      exports.toByteArray = toByteArray;
      exports.fromByteArray = fromByteArray;
      var lookup = [];
      var revLookup = [];
      var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
      var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      for (i = 0, len = code.length; i < len; ++i) {
        lookup[i] = code[i];
        revLookup[code.charCodeAt(i)] = i;
      }
      var i;
      var len;
      revLookup["-".charCodeAt(0)] = 62;
      revLookup["_".charCodeAt(0)] = 63;
      function getLens(b64) {
        var len2 = b64.length;
        if (len2 % 4 > 0) {
          throw new Error("Invalid string. Length must be a multiple of 4");
        }
        var validLen = b64.indexOf("=");
        if (validLen === -1) validLen = len2;
        var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
        return [validLen, placeHoldersLen];
      }
      function byteLength(b64) {
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function _byteLength(b64, validLen, placeHoldersLen) {
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function toByteArray(b64) {
        var tmp;
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
        var curByte = 0;
        var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
        var i2;
        for (i2 = 0; i2 < len2; i2 += 4) {
          tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
          arr[curByte++] = tmp >> 16 & 255;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 2) {
          tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 1) {
          tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        return arr;
      }
      function tripletToBase64(num) {
        return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
      }
      function encodeChunk(uint8, start, end) {
        var tmp;
        var output = [];
        for (var i2 = start; i2 < end; i2 += 3) {
          tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
          output.push(tripletToBase64(tmp));
        }
        return output.join("");
      }
      function fromByteArray(uint8) {
        var tmp;
        var len2 = uint8.length;
        var extraBytes = len2 % 3;
        var parts = [];
        var maxChunkLength = 16383;
        for (var i2 = 0, len22 = len2 - extraBytes; i2 < len22; i2 += maxChunkLength) {
          parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
        }
        if (extraBytes === 1) {
          tmp = uint8[len2 - 1];
          parts.push(
            lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "=="
          );
        } else if (extraBytes === 2) {
          tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
          parts.push(
            lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "="
          );
        }
        return parts.join("");
      }
    }
  });

  // node_modules/ieee754/index.js
  var require_ieee754 = __commonJS({
    "node_modules/ieee754/index.js"(exports) {
      exports.read = function(buffer, offset, isLE, mLen, nBytes) {
        var e, m;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var nBits = -7;
        var i = isLE ? nBytes - 1 : 0;
        var d = isLE ? -1 : 1;
        var s = buffer[offset + i];
        i += d;
        e = s & (1 << -nBits) - 1;
        s >>= -nBits;
        nBits += eLen;
        for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {
        }
        m = e & (1 << -nBits) - 1;
        e >>= -nBits;
        nBits += mLen;
        for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {
        }
        if (e === 0) {
          e = 1 - eBias;
        } else if (e === eMax) {
          return m ? NaN : (s ? -1 : 1) * Infinity;
        } else {
          m = m + Math.pow(2, mLen);
          e = e - eBias;
        }
        return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
      };
      exports.write = function(buffer, value2, offset, isLE, mLen, nBytes) {
        var e, m, c;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
        var i = isLE ? 0 : nBytes - 1;
        var d = isLE ? 1 : -1;
        var s = value2 < 0 || value2 === 0 && 1 / value2 < 0 ? 1 : 0;
        value2 = Math.abs(value2);
        if (isNaN(value2) || value2 === Infinity) {
          m = isNaN(value2) ? 1 : 0;
          e = eMax;
        } else {
          e = Math.floor(Math.log(value2) / Math.LN2);
          if (value2 * (c = Math.pow(2, -e)) < 1) {
            e--;
            c *= 2;
          }
          if (e + eBias >= 1) {
            value2 += rt / c;
          } else {
            value2 += rt * Math.pow(2, 1 - eBias);
          }
          if (value2 * c >= 2) {
            e++;
            c /= 2;
          }
          if (e + eBias >= eMax) {
            m = 0;
            e = eMax;
          } else if (e + eBias >= 1) {
            m = (value2 * c - 1) * Math.pow(2, mLen);
            e = e + eBias;
          } else {
            m = value2 * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
            e = 0;
          }
        }
        for (; mLen >= 8; buffer[offset + i] = m & 255, i += d, m /= 256, mLen -= 8) {
        }
        e = e << mLen | m;
        eLen += mLen;
        for (; eLen > 0; buffer[offset + i] = e & 255, i += d, e /= 256, eLen -= 8) {
        }
        buffer[offset + i - d] |= s * 128;
      };
    }
  });

  // node_modules/buffer/index.js
  var require_buffer = __commonJS({
    "node_modules/buffer/index.js"(exports) {
      "use strict";
      var base64 = require_base64_js();
      var ieee754 = require_ieee754();
      var customInspectSymbol = typeof Symbol === "function" && typeof Symbol["for"] === "function" ? Symbol["for"]("nodejs.util.inspect.custom") : null;
      exports.Buffer = Buffer2;
      exports.SlowBuffer = SlowBuffer;
      exports.INSPECT_MAX_BYTES = 50;
      var K_MAX_LENGTH = 2147483647;
      exports.kMaxLength = K_MAX_LENGTH;
      Buffer2.TYPED_ARRAY_SUPPORT = typedArraySupport();
      if (!Buffer2.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
        console.error(
          "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
        );
      }
      function typedArraySupport() {
        try {
          const arr = new Uint8Array(1);
          const proto = { foo: function() {
            return 42;
          } };
          Object.setPrototypeOf(proto, Uint8Array.prototype);
          Object.setPrototypeOf(arr, proto);
          return arr.foo() === 42;
        } catch (e) {
          return false;
        }
      }
      Object.defineProperty(Buffer2.prototype, "parent", {
        enumerable: true,
        get: function() {
          if (!Buffer2.isBuffer(this)) return void 0;
          return this.buffer;
        }
      });
      Object.defineProperty(Buffer2.prototype, "offset", {
        enumerable: true,
        get: function() {
          if (!Buffer2.isBuffer(this)) return void 0;
          return this.byteOffset;
        }
      });
      function createBuffer(length2) {
        if (length2 > K_MAX_LENGTH) {
          throw new RangeError('The value "' + length2 + '" is invalid for option "size"');
        }
        const buf = new Uint8Array(length2);
        Object.setPrototypeOf(buf, Buffer2.prototype);
        return buf;
      }
      function Buffer2(arg, encodingOrOffset, length2) {
        if (typeof arg === "number") {
          if (typeof encodingOrOffset === "string") {
            throw new TypeError(
              'The "string" argument must be of type string. Received type number'
            );
          }
          return allocUnsafe(arg);
        }
        return from(arg, encodingOrOffset, length2);
      }
      Buffer2.poolSize = 8192;
      function from(value2, encodingOrOffset, length2) {
        if (typeof value2 === "string") {
          return fromString(value2, encodingOrOffset);
        }
        if (ArrayBuffer.isView(value2)) {
          return fromArrayView(value2);
        }
        if (value2 == null) {
          throw new TypeError(
            "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value2
          );
        }
        if (isInstance(value2, ArrayBuffer) || value2 && isInstance(value2.buffer, ArrayBuffer)) {
          return fromArrayBuffer(value2, encodingOrOffset, length2);
        }
        if (typeof SharedArrayBuffer !== "undefined" && (isInstance(value2, SharedArrayBuffer) || value2 && isInstance(value2.buffer, SharedArrayBuffer))) {
          return fromArrayBuffer(value2, encodingOrOffset, length2);
        }
        if (typeof value2 === "number") {
          throw new TypeError(
            'The "value" argument must not be of type number. Received type number'
          );
        }
        const valueOf = value2.valueOf && value2.valueOf();
        if (valueOf != null && valueOf !== value2) {
          return Buffer2.from(valueOf, encodingOrOffset, length2);
        }
        const b = fromObject(value2);
        if (b) return b;
        if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value2[Symbol.toPrimitive] === "function") {
          return Buffer2.from(value2[Symbol.toPrimitive]("string"), encodingOrOffset, length2);
        }
        throw new TypeError(
          "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value2
        );
      }
      Buffer2.from = function(value2, encodingOrOffset, length2) {
        return from(value2, encodingOrOffset, length2);
      };
      Object.setPrototypeOf(Buffer2.prototype, Uint8Array.prototype);
      Object.setPrototypeOf(Buffer2, Uint8Array);
      function assertSize(size) {
        if (typeof size !== "number") {
          throw new TypeError('"size" argument must be of type number');
        } else if (size < 0) {
          throw new RangeError('The value "' + size + '" is invalid for option "size"');
        }
      }
      function alloc(size, fill, encoding) {
        assertSize(size);
        if (size <= 0) {
          return createBuffer(size);
        }
        if (fill !== void 0) {
          return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
        }
        return createBuffer(size);
      }
      Buffer2.alloc = function(size, fill, encoding) {
        return alloc(size, fill, encoding);
      };
      function allocUnsafe(size) {
        assertSize(size);
        return createBuffer(size < 0 ? 0 : checked(size) | 0);
      }
      Buffer2.allocUnsafe = function(size) {
        return allocUnsafe(size);
      };
      Buffer2.allocUnsafeSlow = function(size) {
        return allocUnsafe(size);
      };
      function fromString(string2, encoding) {
        if (typeof encoding !== "string" || encoding === "") {
          encoding = "utf8";
        }
        if (!Buffer2.isEncoding(encoding)) {
          throw new TypeError("Unknown encoding: " + encoding);
        }
        const length2 = byteLength(string2, encoding) | 0;
        let buf = createBuffer(length2);
        const actual = buf.write(string2, encoding);
        if (actual !== length2) {
          buf = buf.slice(0, actual);
        }
        return buf;
      }
      function fromArrayLike(array2) {
        const length2 = array2.length < 0 ? 0 : checked(array2.length) | 0;
        const buf = createBuffer(length2);
        for (let i = 0; i < length2; i += 1) {
          buf[i] = array2[i] & 255;
        }
        return buf;
      }
      function fromArrayView(arrayView) {
        if (isInstance(arrayView, Uint8Array)) {
          const copy = new Uint8Array(arrayView);
          return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
        }
        return fromArrayLike(arrayView);
      }
      function fromArrayBuffer(array2, byteOffset, length2) {
        if (byteOffset < 0 || array2.byteLength < byteOffset) {
          throw new RangeError('"offset" is outside of buffer bounds');
        }
        if (array2.byteLength < byteOffset + (length2 || 0)) {
          throw new RangeError('"length" is outside of buffer bounds');
        }
        let buf;
        if (byteOffset === void 0 && length2 === void 0) {
          buf = new Uint8Array(array2);
        } else if (length2 === void 0) {
          buf = new Uint8Array(array2, byteOffset);
        } else {
          buf = new Uint8Array(array2, byteOffset, length2);
        }
        Object.setPrototypeOf(buf, Buffer2.prototype);
        return buf;
      }
      function fromObject(obj) {
        if (Buffer2.isBuffer(obj)) {
          const len = checked(obj.length) | 0;
          const buf = createBuffer(len);
          if (buf.length === 0) {
            return buf;
          }
          obj.copy(buf, 0, 0, len);
          return buf;
        }
        if (obj.length !== void 0) {
          if (typeof obj.length !== "number" || numberIsNaN(obj.length)) {
            return createBuffer(0);
          }
          return fromArrayLike(obj);
        }
        if (obj.type === "Buffer" && Array.isArray(obj.data)) {
          return fromArrayLike(obj.data);
        }
      }
      function checked(length2) {
        if (length2 >= K_MAX_LENGTH) {
          throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
        }
        return length2 | 0;
      }
      function SlowBuffer(length2) {
        if (+length2 != length2) {
          length2 = 0;
        }
        return Buffer2.alloc(+length2);
      }
      Buffer2.isBuffer = function isBuffer(b) {
        return b != null && b._isBuffer === true && b !== Buffer2.prototype;
      };
      Buffer2.compare = function compare2(a, b) {
        if (isInstance(a, Uint8Array)) a = Buffer2.from(a, a.offset, a.byteLength);
        if (isInstance(b, Uint8Array)) b = Buffer2.from(b, b.offset, b.byteLength);
        if (!Buffer2.isBuffer(a) || !Buffer2.isBuffer(b)) {
          throw new TypeError(
            'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
          );
        }
        if (a === b) return 0;
        let x = a.length;
        let y = b.length;
        for (let i = 0, len = Math.min(x, y); i < len; ++i) {
          if (a[i] !== b[i]) {
            x = a[i];
            y = b[i];
            break;
          }
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
      };
      Buffer2.isEncoding = function isEncoding(encoding) {
        switch (String(encoding).toLowerCase()) {
          case "hex":
          case "utf8":
          case "utf-8":
          case "ascii":
          case "latin1":
          case "binary":
          case "base64":
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return true;
          default:
            return false;
        }
      };
      Buffer2.concat = function concat2(list, length2) {
        if (!Array.isArray(list)) {
          throw new TypeError('"list" argument must be an Array of Buffers');
        }
        if (list.length === 0) {
          return Buffer2.alloc(0);
        }
        let i;
        if (length2 === void 0) {
          length2 = 0;
          for (i = 0; i < list.length; ++i) {
            length2 += list[i].length;
          }
        }
        const buffer = Buffer2.allocUnsafe(length2);
        let pos = 0;
        for (i = 0; i < list.length; ++i) {
          let buf = list[i];
          if (isInstance(buf, Uint8Array)) {
            if (pos + buf.length > buffer.length) {
              if (!Buffer2.isBuffer(buf)) buf = Buffer2.from(buf);
              buf.copy(buffer, pos);
            } else {
              Uint8Array.prototype.set.call(
                buffer,
                buf,
                pos
              );
            }
          } else if (!Buffer2.isBuffer(buf)) {
            throw new TypeError('"list" argument must be an Array of Buffers');
          } else {
            buf.copy(buffer, pos);
          }
          pos += buf.length;
        }
        return buffer;
      };
      function byteLength(string2, encoding) {
        if (Buffer2.isBuffer(string2)) {
          return string2.length;
        }
        if (ArrayBuffer.isView(string2) || isInstance(string2, ArrayBuffer)) {
          return string2.byteLength;
        }
        if (typeof string2 !== "string") {
          throw new TypeError(
            'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string2
          );
        }
        const len = string2.length;
        const mustMatch = arguments.length > 2 && arguments[2] === true;
        if (!mustMatch && len === 0) return 0;
        let loweredCase = false;
        for (; ; ) {
          switch (encoding) {
            case "ascii":
            case "latin1":
            case "binary":
              return len;
            case "utf8":
            case "utf-8":
              return utf8ToBytes2(string2).length;
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return len * 2;
            case "hex":
              return len >>> 1;
            case "base64":
              return base64ToBytes(string2).length;
            default:
              if (loweredCase) {
                return mustMatch ? -1 : utf8ToBytes2(string2).length;
              }
              encoding = ("" + encoding).toLowerCase();
              loweredCase = true;
          }
        }
      }
      Buffer2.byteLength = byteLength;
      function slowToString(encoding, start, end) {
        let loweredCase = false;
        if (start === void 0 || start < 0) {
          start = 0;
        }
        if (start > this.length) {
          return "";
        }
        if (end === void 0 || end > this.length) {
          end = this.length;
        }
        if (end <= 0) {
          return "";
        }
        end >>>= 0;
        start >>>= 0;
        if (end <= start) {
          return "";
        }
        if (!encoding) encoding = "utf8";
        while (true) {
          switch (encoding) {
            case "hex":
              return hexSlice(this, start, end);
            case "utf8":
            case "utf-8":
              return utf8Slice(this, start, end);
            case "ascii":
              return asciiSlice(this, start, end);
            case "latin1":
            case "binary":
              return latin1Slice(this, start, end);
            case "base64":
              return base64Slice(this, start, end);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return utf16leSlice(this, start, end);
            default:
              if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
              encoding = (encoding + "").toLowerCase();
              loweredCase = true;
          }
        }
      }
      Buffer2.prototype._isBuffer = true;
      function swap(b, n, m) {
        const i = b[n];
        b[n] = b[m];
        b[m] = i;
      }
      Buffer2.prototype.swap16 = function swap16() {
        const len = this.length;
        if (len % 2 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 16-bits");
        }
        for (let i = 0; i < len; i += 2) {
          swap(this, i, i + 1);
        }
        return this;
      };
      Buffer2.prototype.swap32 = function swap32() {
        const len = this.length;
        if (len % 4 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 32-bits");
        }
        for (let i = 0; i < len; i += 4) {
          swap(this, i, i + 3);
          swap(this, i + 1, i + 2);
        }
        return this;
      };
      Buffer2.prototype.swap64 = function swap64() {
        const len = this.length;
        if (len % 8 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 64-bits");
        }
        for (let i = 0; i < len; i += 8) {
          swap(this, i, i + 7);
          swap(this, i + 1, i + 6);
          swap(this, i + 2, i + 5);
          swap(this, i + 3, i + 4);
        }
        return this;
      };
      Buffer2.prototype.toString = function toString() {
        const length2 = this.length;
        if (length2 === 0) return "";
        if (arguments.length === 0) return utf8Slice(this, 0, length2);
        return slowToString.apply(this, arguments);
      };
      Buffer2.prototype.toLocaleString = Buffer2.prototype.toString;
      Buffer2.prototype.equals = function equals(b) {
        if (!Buffer2.isBuffer(b)) throw new TypeError("Argument must be a Buffer");
        if (this === b) return true;
        return Buffer2.compare(this, b) === 0;
      };
      Buffer2.prototype.inspect = function inspect() {
        let str = "";
        const max = exports.INSPECT_MAX_BYTES;
        str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
        if (this.length > max) str += " ... ";
        return "<Buffer " + str + ">";
      };
      if (customInspectSymbol) {
        Buffer2.prototype[customInspectSymbol] = Buffer2.prototype.inspect;
      }
      Buffer2.prototype.compare = function compare2(target, start, end, thisStart, thisEnd) {
        if (isInstance(target, Uint8Array)) {
          target = Buffer2.from(target, target.offset, target.byteLength);
        }
        if (!Buffer2.isBuffer(target)) {
          throw new TypeError(
            'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target
          );
        }
        if (start === void 0) {
          start = 0;
        }
        if (end === void 0) {
          end = target ? target.length : 0;
        }
        if (thisStart === void 0) {
          thisStart = 0;
        }
        if (thisEnd === void 0) {
          thisEnd = this.length;
        }
        if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
          throw new RangeError("out of range index");
        }
        if (thisStart >= thisEnd && start >= end) {
          return 0;
        }
        if (thisStart >= thisEnd) {
          return -1;
        }
        if (start >= end) {
          return 1;
        }
        start >>>= 0;
        end >>>= 0;
        thisStart >>>= 0;
        thisEnd >>>= 0;
        if (this === target) return 0;
        let x = thisEnd - thisStart;
        let y = end - start;
        const len = Math.min(x, y);
        const thisCopy = this.slice(thisStart, thisEnd);
        const targetCopy = target.slice(start, end);
        for (let i = 0; i < len; ++i) {
          if (thisCopy[i] !== targetCopy[i]) {
            x = thisCopy[i];
            y = targetCopy[i];
            break;
          }
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
      };
      function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
        if (buffer.length === 0) return -1;
        if (typeof byteOffset === "string") {
          encoding = byteOffset;
          byteOffset = 0;
        } else if (byteOffset > 2147483647) {
          byteOffset = 2147483647;
        } else if (byteOffset < -2147483648) {
          byteOffset = -2147483648;
        }
        byteOffset = +byteOffset;
        if (numberIsNaN(byteOffset)) {
          byteOffset = dir ? 0 : buffer.length - 1;
        }
        if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
        if (byteOffset >= buffer.length) {
          if (dir) return -1;
          else byteOffset = buffer.length - 1;
        } else if (byteOffset < 0) {
          if (dir) byteOffset = 0;
          else return -1;
        }
        if (typeof val === "string") {
          val = Buffer2.from(val, encoding);
        }
        if (Buffer2.isBuffer(val)) {
          if (val.length === 0) {
            return -1;
          }
          return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
        } else if (typeof val === "number") {
          val = val & 255;
          if (typeof Uint8Array.prototype.indexOf === "function") {
            if (dir) {
              return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
            } else {
              return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
            }
          }
          return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
        }
        throw new TypeError("val must be string, number or Buffer");
      }
      function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
        let indexSize = 1;
        let arrLength = arr.length;
        let valLength = val.length;
        if (encoding !== void 0) {
          encoding = String(encoding).toLowerCase();
          if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
            if (arr.length < 2 || val.length < 2) {
              return -1;
            }
            indexSize = 2;
            arrLength /= 2;
            valLength /= 2;
            byteOffset /= 2;
          }
        }
        function read(buf, i2) {
          if (indexSize === 1) {
            return buf[i2];
          } else {
            return buf.readUInt16BE(i2 * indexSize);
          }
        }
        let i;
        if (dir) {
          let foundIndex = -1;
          for (i = byteOffset; i < arrLength; i++) {
            if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
              if (foundIndex === -1) foundIndex = i;
              if (i - foundIndex + 1 === valLength) return foundIndex * indexSize;
            } else {
              if (foundIndex !== -1) i -= i - foundIndex;
              foundIndex = -1;
            }
          }
        } else {
          if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
          for (i = byteOffset; i >= 0; i--) {
            let found = true;
            for (let j = 0; j < valLength; j++) {
              if (read(arr, i + j) !== read(val, j)) {
                found = false;
                break;
              }
            }
            if (found) return i;
          }
        }
        return -1;
      }
      Buffer2.prototype.includes = function includes(val, byteOffset, encoding) {
        return this.indexOf(val, byteOffset, encoding) !== -1;
      };
      Buffer2.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
      };
      Buffer2.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
      };
      function hexWrite(buf, string2, offset, length2) {
        offset = Number(offset) || 0;
        const remaining = buf.length - offset;
        if (!length2) {
          length2 = remaining;
        } else {
          length2 = Number(length2);
          if (length2 > remaining) {
            length2 = remaining;
          }
        }
        const strLen = string2.length;
        if (length2 > strLen / 2) {
          length2 = strLen / 2;
        }
        let i;
        for (i = 0; i < length2; ++i) {
          const parsed = parseInt(string2.substr(i * 2, 2), 16);
          if (numberIsNaN(parsed)) return i;
          buf[offset + i] = parsed;
        }
        return i;
      }
      function utf8Write(buf, string2, offset, length2) {
        return blitBuffer(utf8ToBytes2(string2, buf.length - offset), buf, offset, length2);
      }
      function asciiWrite(buf, string2, offset, length2) {
        return blitBuffer(asciiToBytes(string2), buf, offset, length2);
      }
      function base64Write(buf, string2, offset, length2) {
        return blitBuffer(base64ToBytes(string2), buf, offset, length2);
      }
      function ucs2Write(buf, string2, offset, length2) {
        return blitBuffer(utf16leToBytes(string2, buf.length - offset), buf, offset, length2);
      }
      Buffer2.prototype.write = function write(string2, offset, length2, encoding) {
        if (offset === void 0) {
          encoding = "utf8";
          length2 = this.length;
          offset = 0;
        } else if (length2 === void 0 && typeof offset === "string") {
          encoding = offset;
          length2 = this.length;
          offset = 0;
        } else if (isFinite(offset)) {
          offset = offset >>> 0;
          if (isFinite(length2)) {
            length2 = length2 >>> 0;
            if (encoding === void 0) encoding = "utf8";
          } else {
            encoding = length2;
            length2 = void 0;
          }
        } else {
          throw new Error(
            "Buffer.write(string, encoding, offset[, length]) is no longer supported"
          );
        }
        const remaining = this.length - offset;
        if (length2 === void 0 || length2 > remaining) length2 = remaining;
        if (string2.length > 0 && (length2 < 0 || offset < 0) || offset > this.length) {
          throw new RangeError("Attempt to write outside buffer bounds");
        }
        if (!encoding) encoding = "utf8";
        let loweredCase = false;
        for (; ; ) {
          switch (encoding) {
            case "hex":
              return hexWrite(this, string2, offset, length2);
            case "utf8":
            case "utf-8":
              return utf8Write(this, string2, offset, length2);
            case "ascii":
            case "latin1":
            case "binary":
              return asciiWrite(this, string2, offset, length2);
            case "base64":
              return base64Write(this, string2, offset, length2);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return ucs2Write(this, string2, offset, length2);
            default:
              if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
              encoding = ("" + encoding).toLowerCase();
              loweredCase = true;
          }
        }
      };
      Buffer2.prototype.toJSON = function toJSON() {
        return {
          type: "Buffer",
          data: Array.prototype.slice.call(this._arr || this, 0)
        };
      };
      function base64Slice(buf, start, end) {
        if (start === 0 && end === buf.length) {
          return base64.fromByteArray(buf);
        } else {
          return base64.fromByteArray(buf.slice(start, end));
        }
      }
      function utf8Slice(buf, start, end) {
        end = Math.min(buf.length, end);
        const res = [];
        let i = start;
        while (i < end) {
          const firstByte = buf[i];
          let codePoint = null;
          let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
          if (i + bytesPerSequence <= end) {
            let secondByte, thirdByte, fourthByte, tempCodePoint;
            switch (bytesPerSequence) {
              case 1:
                if (firstByte < 128) {
                  codePoint = firstByte;
                }
                break;
              case 2:
                secondByte = buf[i + 1];
                if ((secondByte & 192) === 128) {
                  tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
                  if (tempCodePoint > 127) {
                    codePoint = tempCodePoint;
                  }
                }
                break;
              case 3:
                secondByte = buf[i + 1];
                thirdByte = buf[i + 2];
                if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
                  tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
                  if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                    codePoint = tempCodePoint;
                  }
                }
                break;
              case 4:
                secondByte = buf[i + 1];
                thirdByte = buf[i + 2];
                fourthByte = buf[i + 3];
                if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
                  tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
                  if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                    codePoint = tempCodePoint;
                  }
                }
            }
          }
          if (codePoint === null) {
            codePoint = 65533;
            bytesPerSequence = 1;
          } else if (codePoint > 65535) {
            codePoint -= 65536;
            res.push(codePoint >>> 10 & 1023 | 55296);
            codePoint = 56320 | codePoint & 1023;
          }
          res.push(codePoint);
          i += bytesPerSequence;
        }
        return decodeCodePointsArray(res);
      }
      var MAX_ARGUMENTS_LENGTH = 4096;
      function decodeCodePointsArray(codePoints) {
        const len = codePoints.length;
        if (len <= MAX_ARGUMENTS_LENGTH) {
          return String.fromCharCode.apply(String, codePoints);
        }
        let res = "";
        let i = 0;
        while (i < len) {
          res += String.fromCharCode.apply(
            String,
            codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
          );
        }
        return res;
      }
      function asciiSlice(buf, start, end) {
        let ret = "";
        end = Math.min(buf.length, end);
        for (let i = start; i < end; ++i) {
          ret += String.fromCharCode(buf[i] & 127);
        }
        return ret;
      }
      function latin1Slice(buf, start, end) {
        let ret = "";
        end = Math.min(buf.length, end);
        for (let i = start; i < end; ++i) {
          ret += String.fromCharCode(buf[i]);
        }
        return ret;
      }
      function hexSlice(buf, start, end) {
        const len = buf.length;
        if (!start || start < 0) start = 0;
        if (!end || end < 0 || end > len) end = len;
        let out = "";
        for (let i = start; i < end; ++i) {
          out += hexSliceLookupTable[buf[i]];
        }
        return out;
      }
      function utf16leSlice(buf, start, end) {
        const bytes = buf.slice(start, end);
        let res = "";
        for (let i = 0; i < bytes.length - 1; i += 2) {
          res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
        }
        return res;
      }
      Buffer2.prototype.slice = function slice(start, end) {
        const len = this.length;
        start = ~~start;
        end = end === void 0 ? len : ~~end;
        if (start < 0) {
          start += len;
          if (start < 0) start = 0;
        } else if (start > len) {
          start = len;
        }
        if (end < 0) {
          end += len;
          if (end < 0) end = 0;
        } else if (end > len) {
          end = len;
        }
        if (end < start) end = start;
        const newBuf = this.subarray(start, end);
        Object.setPrototypeOf(newBuf, Buffer2.prototype);
        return newBuf;
      };
      function checkOffset(offset, ext, length2) {
        if (offset % 1 !== 0 || offset < 0) throw new RangeError("offset is not uint");
        if (offset + ext > length2) throw new RangeError("Trying to access beyond buffer length");
      }
      Buffer2.prototype.readUintLE = Buffer2.prototype.readUIntLE = function readUIntLE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let val = this[offset];
        let mul = 1;
        let i = 0;
        while (++i < byteLength2 && (mul *= 256)) {
          val += this[offset + i] * mul;
        }
        return val;
      };
      Buffer2.prototype.readUintBE = Buffer2.prototype.readUIntBE = function readUIntBE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          checkOffset(offset, byteLength2, this.length);
        }
        let val = this[offset + --byteLength2];
        let mul = 1;
        while (byteLength2 > 0 && (mul *= 256)) {
          val += this[offset + --byteLength2] * mul;
        }
        return val;
      };
      Buffer2.prototype.readUint8 = Buffer2.prototype.readUInt8 = function readUInt82(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 1, this.length);
        return this[offset];
      };
      Buffer2.prototype.readUint16LE = Buffer2.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        return this[offset] | this[offset + 1] << 8;
      };
      Buffer2.prototype.readUint16BE = Buffer2.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        return this[offset] << 8 | this[offset + 1];
      };
      Buffer2.prototype.readUint32LE = Buffer2.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
      };
      Buffer2.prototype.readUint32BE = Buffer2.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
      };
      Buffer2.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const lo = first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24;
        const hi = this[++offset] + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last * 2 ** 24;
        return BigInt(lo) + (BigInt(hi) << BigInt(32));
      });
      Buffer2.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const hi = first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
        const lo = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
        return (BigInt(hi) << BigInt(32)) + BigInt(lo);
      });
      Buffer2.prototype.readIntLE = function readIntLE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let val = this[offset];
        let mul = 1;
        let i = 0;
        while (++i < byteLength2 && (mul *= 256)) {
          val += this[offset + i] * mul;
        }
        mul *= 128;
        if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
        return val;
      };
      Buffer2.prototype.readIntBE = function readIntBE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let i = byteLength2;
        let mul = 1;
        let val = this[offset + --i];
        while (i > 0 && (mul *= 256)) {
          val += this[offset + --i] * mul;
        }
        mul *= 128;
        if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
        return val;
      };
      Buffer2.prototype.readInt8 = function readInt8(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 1, this.length);
        if (!(this[offset] & 128)) return this[offset];
        return (255 - this[offset] + 1) * -1;
      };
      Buffer2.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        const val = this[offset] | this[offset + 1] << 8;
        return val & 32768 ? val | 4294901760 : val;
      };
      Buffer2.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        const val = this[offset + 1] | this[offset] << 8;
        return val & 32768 ? val | 4294901760 : val;
      };
      Buffer2.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
      };
      Buffer2.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
      };
      Buffer2.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const val = this[offset + 4] + this[offset + 5] * 2 ** 8 + this[offset + 6] * 2 ** 16 + (last << 24);
        return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24);
      });
      Buffer2.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const val = (first << 24) + // Overflow
        this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
        return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last);
      });
      Buffer2.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, true, 23, 4);
      };
      Buffer2.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, false, 23, 4);
      };
      Buffer2.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, true, 52, 8);
      };
      Buffer2.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, false, 52, 8);
      };
      function checkInt(buf, value2, offset, ext, max, min) {
        if (!Buffer2.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance');
        if (value2 > max || value2 < min) throw new RangeError('"value" argument is out of bounds');
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
      }
      Buffer2.prototype.writeUintLE = Buffer2.prototype.writeUIntLE = function writeUIntLE(value2, offset, byteLength2, noAssert) {
        value2 = +value2;
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
          checkInt(this, value2, offset, byteLength2, maxBytes, 0);
        }
        let mul = 1;
        let i = 0;
        this[offset] = value2 & 255;
        while (++i < byteLength2 && (mul *= 256)) {
          this[offset + i] = value2 / mul & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeUintBE = Buffer2.prototype.writeUIntBE = function writeUIntBE(value2, offset, byteLength2, noAssert) {
        value2 = +value2;
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
          checkInt(this, value2, offset, byteLength2, maxBytes, 0);
        }
        let i = byteLength2 - 1;
        let mul = 1;
        this[offset + i] = value2 & 255;
        while (--i >= 0 && (mul *= 256)) {
          this[offset + i] = value2 / mul & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeUint8 = Buffer2.prototype.writeUInt8 = function writeUInt82(value2, offset, noAssert) {
        value2 = +value2;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value2, offset, 1, 255, 0);
        this[offset] = value2 & 255;
        return offset + 1;
      };
      Buffer2.prototype.writeUint16LE = Buffer2.prototype.writeUInt16LE = function writeUInt16LE(value2, offset, noAssert) {
        value2 = +value2;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value2, offset, 2, 65535, 0);
        this[offset] = value2 & 255;
        this[offset + 1] = value2 >>> 8;
        return offset + 2;
      };
      Buffer2.prototype.writeUint16BE = Buffer2.prototype.writeUInt16BE = function writeUInt16BE(value2, offset, noAssert) {
        value2 = +value2;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value2, offset, 2, 65535, 0);
        this[offset] = value2 >>> 8;
        this[offset + 1] = value2 & 255;
        return offset + 2;
      };
      Buffer2.prototype.writeUint32LE = Buffer2.prototype.writeUInt32LE = function writeUInt32LE(value2, offset, noAssert) {
        value2 = +value2;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value2, offset, 4, 4294967295, 0);
        this[offset + 3] = value2 >>> 24;
        this[offset + 2] = value2 >>> 16;
        this[offset + 1] = value2 >>> 8;
        this[offset] = value2 & 255;
        return offset + 4;
      };
      Buffer2.prototype.writeUint32BE = Buffer2.prototype.writeUInt32BE = function writeUInt32BE(value2, offset, noAssert) {
        value2 = +value2;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value2, offset, 4, 4294967295, 0);
        this[offset] = value2 >>> 24;
        this[offset + 1] = value2 >>> 16;
        this[offset + 2] = value2 >>> 8;
        this[offset + 3] = value2 & 255;
        return offset + 4;
      };
      function wrtBigUInt64LE(buf, value2, offset, min, max) {
        checkIntBI(value2, min, max, buf, offset, 7);
        let lo = Number(value2 & BigInt(4294967295));
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        let hi = Number(value2 >> BigInt(32) & BigInt(4294967295));
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        return offset;
      }
      function wrtBigUInt64BE(buf, value2, offset, min, max) {
        checkIntBI(value2, min, max, buf, offset, 7);
        let lo = Number(value2 & BigInt(4294967295));
        buf[offset + 7] = lo;
        lo = lo >> 8;
        buf[offset + 6] = lo;
        lo = lo >> 8;
        buf[offset + 5] = lo;
        lo = lo >> 8;
        buf[offset + 4] = lo;
        let hi = Number(value2 >> BigInt(32) & BigInt(4294967295));
        buf[offset + 3] = hi;
        hi = hi >> 8;
        buf[offset + 2] = hi;
        hi = hi >> 8;
        buf[offset + 1] = hi;
        hi = hi >> 8;
        buf[offset] = hi;
        return offset + 8;
      }
      Buffer2.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE(value2, offset = 0) {
        return wrtBigUInt64LE(this, value2, offset, BigInt(0), BigInt("0xffffffffffffffff"));
      });
      Buffer2.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE(value2, offset = 0) {
        return wrtBigUInt64BE(this, value2, offset, BigInt(0), BigInt("0xffffffffffffffff"));
      });
      Buffer2.prototype.writeIntLE = function writeIntLE(value2, offset, byteLength2, noAssert) {
        value2 = +value2;
        offset = offset >>> 0;
        if (!noAssert) {
          const limit = Math.pow(2, 8 * byteLength2 - 1);
          checkInt(this, value2, offset, byteLength2, limit - 1, -limit);
        }
        let i = 0;
        let mul = 1;
        let sub = 0;
        this[offset] = value2 & 255;
        while (++i < byteLength2 && (mul *= 256)) {
          if (value2 < 0 && sub === 0 && this[offset + i - 1] !== 0) {
            sub = 1;
          }
          this[offset + i] = (value2 / mul >> 0) - sub & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeIntBE = function writeIntBE(value2, offset, byteLength2, noAssert) {
        value2 = +value2;
        offset = offset >>> 0;
        if (!noAssert) {
          const limit = Math.pow(2, 8 * byteLength2 - 1);
          checkInt(this, value2, offset, byteLength2, limit - 1, -limit);
        }
        let i = byteLength2 - 1;
        let mul = 1;
        let sub = 0;
        this[offset + i] = value2 & 255;
        while (--i >= 0 && (mul *= 256)) {
          if (value2 < 0 && sub === 0 && this[offset + i + 1] !== 0) {
            sub = 1;
          }
          this[offset + i] = (value2 / mul >> 0) - sub & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeInt8 = function writeInt8(value2, offset, noAssert) {
        value2 = +value2;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value2, offset, 1, 127, -128);
        if (value2 < 0) value2 = 255 + value2 + 1;
        this[offset] = value2 & 255;
        return offset + 1;
      };
      Buffer2.prototype.writeInt16LE = function writeInt16LE(value2, offset, noAssert) {
        value2 = +value2;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value2, offset, 2, 32767, -32768);
        this[offset] = value2 & 255;
        this[offset + 1] = value2 >>> 8;
        return offset + 2;
      };
      Buffer2.prototype.writeInt16BE = function writeInt16BE(value2, offset, noAssert) {
        value2 = +value2;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value2, offset, 2, 32767, -32768);
        this[offset] = value2 >>> 8;
        this[offset + 1] = value2 & 255;
        return offset + 2;
      };
      Buffer2.prototype.writeInt32LE = function writeInt32LE(value2, offset, noAssert) {
        value2 = +value2;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value2, offset, 4, 2147483647, -2147483648);
        this[offset] = value2 & 255;
        this[offset + 1] = value2 >>> 8;
        this[offset + 2] = value2 >>> 16;
        this[offset + 3] = value2 >>> 24;
        return offset + 4;
      };
      Buffer2.prototype.writeInt32BE = function writeInt32BE(value2, offset, noAssert) {
        value2 = +value2;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value2, offset, 4, 2147483647, -2147483648);
        if (value2 < 0) value2 = 4294967295 + value2 + 1;
        this[offset] = value2 >>> 24;
        this[offset + 1] = value2 >>> 16;
        this[offset + 2] = value2 >>> 8;
        this[offset + 3] = value2 & 255;
        return offset + 4;
      };
      Buffer2.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE(value2, offset = 0) {
        return wrtBigUInt64LE(this, value2, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      });
      Buffer2.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE(value2, offset = 0) {
        return wrtBigUInt64BE(this, value2, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      });
      function checkIEEE754(buf, value2, offset, ext, max, min) {
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
        if (offset < 0) throw new RangeError("Index out of range");
      }
      function writeFloat(buf, value2, offset, littleEndian, noAssert) {
        value2 = +value2;
        offset = offset >>> 0;
        if (!noAssert) {
          checkIEEE754(buf, value2, offset, 4, 34028234663852886e22, -34028234663852886e22);
        }
        ieee754.write(buf, value2, offset, littleEndian, 23, 4);
        return offset + 4;
      }
      Buffer2.prototype.writeFloatLE = function writeFloatLE(value2, offset, noAssert) {
        return writeFloat(this, value2, offset, true, noAssert);
      };
      Buffer2.prototype.writeFloatBE = function writeFloatBE(value2, offset, noAssert) {
        return writeFloat(this, value2, offset, false, noAssert);
      };
      function writeDouble(buf, value2, offset, littleEndian, noAssert) {
        value2 = +value2;
        offset = offset >>> 0;
        if (!noAssert) {
          checkIEEE754(buf, value2, offset, 8, 17976931348623157e292, -17976931348623157e292);
        }
        ieee754.write(buf, value2, offset, littleEndian, 52, 8);
        return offset + 8;
      }
      Buffer2.prototype.writeDoubleLE = function writeDoubleLE(value2, offset, noAssert) {
        return writeDouble(this, value2, offset, true, noAssert);
      };
      Buffer2.prototype.writeDoubleBE = function writeDoubleBE(value2, offset, noAssert) {
        return writeDouble(this, value2, offset, false, noAssert);
      };
      Buffer2.prototype.copy = function copy(target, targetStart, start, end) {
        if (!Buffer2.isBuffer(target)) throw new TypeError("argument should be a Buffer");
        if (!start) start = 0;
        if (!end && end !== 0) end = this.length;
        if (targetStart >= target.length) targetStart = target.length;
        if (!targetStart) targetStart = 0;
        if (end > 0 && end < start) end = start;
        if (end === start) return 0;
        if (target.length === 0 || this.length === 0) return 0;
        if (targetStart < 0) {
          throw new RangeError("targetStart out of bounds");
        }
        if (start < 0 || start >= this.length) throw new RangeError("Index out of range");
        if (end < 0) throw new RangeError("sourceEnd out of bounds");
        if (end > this.length) end = this.length;
        if (target.length - targetStart < end - start) {
          end = target.length - targetStart + start;
        }
        const len = end - start;
        if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
          this.copyWithin(targetStart, start, end);
        } else {
          Uint8Array.prototype.set.call(
            target,
            this.subarray(start, end),
            targetStart
          );
        }
        return len;
      };
      Buffer2.prototype.fill = function fill(val, start, end, encoding) {
        if (typeof val === "string") {
          if (typeof start === "string") {
            encoding = start;
            start = 0;
            end = this.length;
          } else if (typeof end === "string") {
            encoding = end;
            end = this.length;
          }
          if (encoding !== void 0 && typeof encoding !== "string") {
            throw new TypeError("encoding must be a string");
          }
          if (typeof encoding === "string" && !Buffer2.isEncoding(encoding)) {
            throw new TypeError("Unknown encoding: " + encoding);
          }
          if (val.length === 1) {
            const code = val.charCodeAt(0);
            if (encoding === "utf8" && code < 128 || encoding === "latin1") {
              val = code;
            }
          }
        } else if (typeof val === "number") {
          val = val & 255;
        } else if (typeof val === "boolean") {
          val = Number(val);
        }
        if (start < 0 || this.length < start || this.length < end) {
          throw new RangeError("Out of range index");
        }
        if (end <= start) {
          return this;
        }
        start = start >>> 0;
        end = end === void 0 ? this.length : end >>> 0;
        if (!val) val = 0;
        let i;
        if (typeof val === "number") {
          for (i = start; i < end; ++i) {
            this[i] = val;
          }
        } else {
          const bytes = Buffer2.isBuffer(val) ? val : Buffer2.from(val, encoding);
          const len = bytes.length;
          if (len === 0) {
            throw new TypeError('The value "' + val + '" is invalid for argument "value"');
          }
          for (i = 0; i < end - start; ++i) {
            this[i + start] = bytes[i % len];
          }
        }
        return this;
      };
      var errors = {};
      function E(sym, getMessage, Base) {
        errors[sym] = class NodeError extends Base {
          constructor() {
            super();
            Object.defineProperty(this, "message", {
              value: getMessage.apply(this, arguments),
              writable: true,
              configurable: true
            });
            this.name = `${this.name} [${sym}]`;
            this.stack;
            delete this.name;
          }
          get code() {
            return sym;
          }
          set code(value2) {
            Object.defineProperty(this, "code", {
              configurable: true,
              enumerable: true,
              value: value2,
              writable: true
            });
          }
          toString() {
            return `${this.name} [${sym}]: ${this.message}`;
          }
        };
      }
      E(
        "ERR_BUFFER_OUT_OF_BOUNDS",
        function(name) {
          if (name) {
            return `${name} is outside of buffer bounds`;
          }
          return "Attempt to access memory outside buffer bounds";
        },
        RangeError
      );
      E(
        "ERR_INVALID_ARG_TYPE",
        function(name, actual) {
          return `The "${name}" argument must be of type number. Received type ${typeof actual}`;
        },
        TypeError
      );
      E(
        "ERR_OUT_OF_RANGE",
        function(str, range5, input) {
          let msg = `The value of "${str}" is out of range.`;
          let received = input;
          if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
            received = addNumericalSeparator(String(input));
          } else if (typeof input === "bigint") {
            received = String(input);
            if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
              received = addNumericalSeparator(received);
            }
            received += "n";
          }
          msg += ` It must be ${range5}. Received ${received}`;
          return msg;
        },
        RangeError
      );
      function addNumericalSeparator(val) {
        let res = "";
        let i = val.length;
        const start = val[0] === "-" ? 1 : 0;
        for (; i >= start + 4; i -= 3) {
          res = `_${val.slice(i - 3, i)}${res}`;
        }
        return `${val.slice(0, i)}${res}`;
      }
      function checkBounds(buf, offset, byteLength2) {
        validateNumber(offset, "offset");
        if (buf[offset] === void 0 || buf[offset + byteLength2] === void 0) {
          boundsError(offset, buf.length - (byteLength2 + 1));
        }
      }
      function checkIntBI(value2, min, max, buf, offset, byteLength2) {
        if (value2 > max || value2 < min) {
          const n = typeof min === "bigint" ? "n" : "";
          let range5;
          if (byteLength2 > 3) {
            if (min === 0 || min === BigInt(0)) {
              range5 = `>= 0${n} and < 2${n} ** ${(byteLength2 + 1) * 8}${n}`;
            } else {
              range5 = `>= -(2${n} ** ${(byteLength2 + 1) * 8 - 1}${n}) and < 2 ** ${(byteLength2 + 1) * 8 - 1}${n}`;
            }
          } else {
            range5 = `>= ${min}${n} and <= ${max}${n}`;
          }
          throw new errors.ERR_OUT_OF_RANGE("value", range5, value2);
        }
        checkBounds(buf, offset, byteLength2);
      }
      function validateNumber(value2, name) {
        if (typeof value2 !== "number") {
          throw new errors.ERR_INVALID_ARG_TYPE(name, "number", value2);
        }
      }
      function boundsError(value2, length2, type) {
        if (Math.floor(value2) !== value2) {
          validateNumber(value2, type);
          throw new errors.ERR_OUT_OF_RANGE(type || "offset", "an integer", value2);
        }
        if (length2 < 0) {
          throw new errors.ERR_BUFFER_OUT_OF_BOUNDS();
        }
        throw new errors.ERR_OUT_OF_RANGE(
          type || "offset",
          `>= ${type ? 1 : 0} and <= ${length2}`,
          value2
        );
      }
      var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
      function base64clean(str) {
        str = str.split("=")[0];
        str = str.trim().replace(INVALID_BASE64_RE, "");
        if (str.length < 2) return "";
        while (str.length % 4 !== 0) {
          str = str + "=";
        }
        return str;
      }
      function utf8ToBytes2(string2, units) {
        units = units || Infinity;
        let codePoint;
        const length2 = string2.length;
        let leadSurrogate = null;
        const bytes = [];
        for (let i = 0; i < length2; ++i) {
          codePoint = string2.charCodeAt(i);
          if (codePoint > 55295 && codePoint < 57344) {
            if (!leadSurrogate) {
              if (codePoint > 56319) {
                if ((units -= 3) > -1) bytes.push(239, 191, 189);
                continue;
              } else if (i + 1 === length2) {
                if ((units -= 3) > -1) bytes.push(239, 191, 189);
                continue;
              }
              leadSurrogate = codePoint;
              continue;
            }
            if (codePoint < 56320) {
              if ((units -= 3) > -1) bytes.push(239, 191, 189);
              leadSurrogate = codePoint;
              continue;
            }
            codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
          } else if (leadSurrogate) {
            if ((units -= 3) > -1) bytes.push(239, 191, 189);
          }
          leadSurrogate = null;
          if (codePoint < 128) {
            if ((units -= 1) < 0) break;
            bytes.push(codePoint);
          } else if (codePoint < 2048) {
            if ((units -= 2) < 0) break;
            bytes.push(
              codePoint >> 6 | 192,
              codePoint & 63 | 128
            );
          } else if (codePoint < 65536) {
            if ((units -= 3) < 0) break;
            bytes.push(
              codePoint >> 12 | 224,
              codePoint >> 6 & 63 | 128,
              codePoint & 63 | 128
            );
          } else if (codePoint < 1114112) {
            if ((units -= 4) < 0) break;
            bytes.push(
              codePoint >> 18 | 240,
              codePoint >> 12 & 63 | 128,
              codePoint >> 6 & 63 | 128,
              codePoint & 63 | 128
            );
          } else {
            throw new Error("Invalid code point");
          }
        }
        return bytes;
      }
      function asciiToBytes(str) {
        const byteArray = [];
        for (let i = 0; i < str.length; ++i) {
          byteArray.push(str.charCodeAt(i) & 255);
        }
        return byteArray;
      }
      function utf16leToBytes(str, units) {
        let c, hi, lo;
        const byteArray = [];
        for (let i = 0; i < str.length; ++i) {
          if ((units -= 2) < 0) break;
          c = str.charCodeAt(i);
          hi = c >> 8;
          lo = c % 256;
          byteArray.push(lo);
          byteArray.push(hi);
        }
        return byteArray;
      }
      function base64ToBytes(str) {
        return base64.toByteArray(base64clean(str));
      }
      function blitBuffer(src, dst, offset, length2) {
        let i;
        for (i = 0; i < length2; ++i) {
          if (i + offset >= dst.length || i >= src.length) break;
          dst[i + offset] = src[i];
        }
        return i;
      }
      function isInstance(obj, type) {
        return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
      }
      function numberIsNaN(obj) {
        return obj !== obj;
      }
      var hexSliceLookupTable = (function() {
        const alphabet = "0123456789abcdef";
        const table = new Array(256);
        for (let i = 0; i < 16; ++i) {
          const i16 = i * 16;
          for (let j = 0; j < 16; ++j) {
            table[i16 + j] = alphabet[i] + alphabet[j];
          }
        }
        return table;
      })();
      function defineBigIntMethod(fn) {
        return typeof BigInt === "undefined" ? BufferBigIntNotDefined : fn;
      }
      function BufferBigIntNotDefined() {
        throw new Error("BigInt not supported");
      }
    }
  });

  // node_modules/bech32/dist/index.js
  var require_dist = __commonJS({
    "node_modules/bech32/dist/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.bech32m = exports.bech32 = void 0;
      var ALPHABET2 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
      var ALPHABET_MAP = {};
      for (let z = 0; z < ALPHABET2.length; z++) {
        const x = ALPHABET2.charAt(z);
        ALPHABET_MAP[x] = z;
      }
      function polymodStep(pre) {
        const b = pre >> 25;
        return (pre & 33554431) << 5 ^ -(b >> 0 & 1) & 996825010 ^ -(b >> 1 & 1) & 642813549 ^ -(b >> 2 & 1) & 513874426 ^ -(b >> 3 & 1) & 1027748829 ^ -(b >> 4 & 1) & 705979059;
      }
      function prefixChk(prefix) {
        let chk = 1;
        for (let i = 0; i < prefix.length; ++i) {
          const c = prefix.charCodeAt(i);
          if (c < 33 || c > 126)
            return "Invalid prefix (" + prefix + ")";
          chk = polymodStep(chk) ^ c >> 5;
        }
        chk = polymodStep(chk);
        for (let i = 0; i < prefix.length; ++i) {
          const v = prefix.charCodeAt(i);
          chk = polymodStep(chk) ^ v & 31;
        }
        return chk;
      }
      function convert(data, inBits, outBits, pad) {
        let value2 = 0;
        let bits = 0;
        const maxV = (1 << outBits) - 1;
        const result = [];
        for (let i = 0; i < data.length; ++i) {
          value2 = value2 << inBits | data[i];
          bits += inBits;
          while (bits >= outBits) {
            bits -= outBits;
            result.push(value2 >> bits & maxV);
          }
        }
        if (pad) {
          if (bits > 0) {
            result.push(value2 << outBits - bits & maxV);
          }
        } else {
          if (bits >= inBits)
            return "Excess padding";
          if (value2 << outBits - bits & maxV)
            return "Non-zero padding";
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
        if (encoding === "bech32") {
          ENCODING_CONST = 1;
        } else {
          ENCODING_CONST = 734539939;
        }
        function encode20(prefix, words, LIMIT) {
          LIMIT = LIMIT || 90;
          if (prefix.length + 7 + words.length > LIMIT)
            throw new TypeError("Exceeds length limit");
          prefix = prefix.toLowerCase();
          let chk = prefixChk(prefix);
          if (typeof chk === "string")
            throw new Error(chk);
          let result = prefix + "1";
          for (let i = 0; i < words.length; ++i) {
            const x = words[i];
            if (x >> 5 !== 0)
              throw new Error("Non 5-bit word");
            chk = polymodStep(chk) ^ x;
            result += ALPHABET2.charAt(x);
          }
          for (let i = 0; i < 6; ++i) {
            chk = polymodStep(chk);
          }
          chk ^= ENCODING_CONST;
          for (let i = 0; i < 6; ++i) {
            const v = chk >> (5 - i) * 5 & 31;
            result += ALPHABET2.charAt(v);
          }
          return result;
        }
        function __decode(str, LIMIT) {
          LIMIT = LIMIT || 90;
          if (str.length < 8)
            return str + " too short";
          if (str.length > LIMIT)
            return "Exceeds length limit";
          const lowered = str.toLowerCase();
          const uppered = str.toUpperCase();
          if (str !== lowered && str !== uppered)
            return "Mixed-case string " + str;
          str = lowered;
          const split = str.lastIndexOf("1");
          if (split === -1)
            return "No separator character for " + str;
          if (split === 0)
            return "Missing prefix for " + str;
          const prefix = str.slice(0, split);
          const wordChars = str.slice(split + 1);
          if (wordChars.length < 6)
            return "Data too short";
          let chk = prefixChk(prefix);
          if (typeof chk === "string")
            return chk;
          const words = [];
          for (let i = 0; i < wordChars.length; ++i) {
            const c = wordChars.charAt(i);
            const v = ALPHABET_MAP[c];
            if (v === void 0)
              return "Unknown character " + c;
            chk = polymodStep(chk) ^ v;
            if (i + 6 >= wordChars.length)
              continue;
            words.push(v);
          }
          if (chk !== ENCODING_CONST)
            return "Invalid checksum for " + str;
          return { prefix, words };
        }
        function decodeUnsafe(str, LIMIT) {
          const res = __decode(str, LIMIT);
          if (typeof res === "object")
            return res;
        }
        function decode19(str, LIMIT) {
          const res = __decode(str, LIMIT);
          if (typeof res === "object")
            return res;
          throw new Error(res);
        }
        return {
          decodeUnsafe,
          decode: decode19,
          encode: encode20,
          toWords,
          fromWordsUnsafe,
          fromWords
        };
      }
      exports.bech32 = getLibraryFromEncoding("bech32");
      exports.bech32m = getLibraryFromEncoding("bech32m");
    }
  });

  // .tmp-sign-esp32-entry.mjs
  var tmp_sign_esp32_entry_exports = {};
  __export(tmp_sign_esp32_entry_exports, {
    NeuraiESP32: () => $a6c8409f4f68b3eb$export$fa10ee8b91a777b7,
    SerialConnection: () => $f1b85200f32d8427$export$f93edba7156cc57b,
    buildAssetTransferDisplayMetadata: () => $4136916c4ceb2a50$export$fccc4f737c7e9291,
    buildPSBT: () => $68e2926fe257f2e4$export$236ea1e009011592,
    buildPSBTFromRawTransaction: () => $68e2926fe257f2e4$export$e0e3d6f226ea0b0a,
    finalizePSBT: () => $68e2926fe257f2e4$export$ce839c4c9bcf7b77,
    finalizeSignedPSBT: () => $68e2926fe257f2e4$export$3a31c64c43aacd3,
    getNetwork: () => $ab66056610f04b01$export$7de4970ebfd8206d,
    neuraiLegacyMainnet: () => $ab66056610f04b01$export$688657d38fcd7269,
    neuraiLegacyTestnet: () => $ab66056610f04b01$export$68e8f8241c8185fe,
    neuraiMainnet: () => $ab66056610f04b01$export$6b5a4442fe3d94ae,
    neuraiTestnet: () => $ab66056610f04b01$export$7eb3dea33add35cf,
    validatePSBT: () => $68e2926fe257f2e4$export$78a5723c75e7be9
  });

  // node_modules/@neuraiproject/neurai-sign-esp32/dist/index.mjs
  var import_buffer = __toESM(require_buffer(), 1);

  // node_modules/bitcoinjs-lib/src/esm/networks.js
  var bitcoin = {
    /**
     * The message prefix used for signing Bitcoin messages.
     */
    messagePrefix: "Bitcoin Signed Message:\n",
    /**
     * The Bech32 prefix used for Bitcoin addresses.
     */
    bech32: "bc",
    /**
     * The BIP32 key prefixes for Bitcoin.
     */
    bip32: {
      /**
       * The public key prefix for BIP32 extended public keys.
       */
      public: 76067358,
      /**
       * The private key prefix for BIP32 extended private keys.
       */
      private: 76066276
    },
    /**
     * The prefix for Bitcoin public key hashes.
     */
    pubKeyHash: 0,
    /**
     * The prefix for Bitcoin script hashes.
     */
    scriptHash: 5,
    /**
     * The prefix for Bitcoin Wallet Import Format (WIF) private keys.
     */
    wif: 128
  };

  // node_modules/bitcoinjs-lib/src/esm/script.js
  var script_exports = {};
  __export(script_exports, {
    OPS: () => OPS,
    compile: () => compile,
    countNonPushOnlyOPs: () => countNonPushOnlyOPs,
    decompile: () => decompile,
    fromASM: () => fromASM,
    isCanonicalPubKey: () => isCanonicalPubKey,
    isCanonicalScriptSignature: () => isCanonicalScriptSignature,
    isDefinedHashType: () => isDefinedHashType,
    isPushOnly: () => isPushOnly,
    number: () => number2,
    signature: () => signature,
    toASM: () => toASM,
    toStack: () => toStack
  });

  // node_modules/bitcoinjs-lib/src/esm/bip66.js
  function check(buffer) {
    if (buffer.length < 8) return false;
    if (buffer.length > 72) return false;
    if (buffer[0] !== 48) return false;
    if (buffer[1] !== buffer.length - 2) return false;
    if (buffer[2] !== 2) return false;
    const lenR = buffer[3];
    if (lenR === 0) return false;
    if (5 + lenR >= buffer.length) return false;
    if (buffer[4 + lenR] !== 2) return false;
    const lenS = buffer[5 + lenR];
    if (lenS === 0) return false;
    if (6 + lenR + lenS !== buffer.length) return false;
    if (buffer[4] & 128) return false;
    if (lenR > 1 && buffer[4] === 0 && !(buffer[5] & 128)) return false;
    if (buffer[lenR + 6] & 128) return false;
    if (lenS > 1 && buffer[lenR + 6] === 0 && !(buffer[lenR + 7] & 128))
      return false;
    return true;
  }
  function decode(buffer) {
    if (buffer.length < 8) throw new Error("DER sequence length is too short");
    if (buffer.length > 72) throw new Error("DER sequence length is too long");
    if (buffer[0] !== 48) throw new Error("Expected DER sequence");
    if (buffer[1] !== buffer.length - 2)
      throw new Error("DER sequence length is invalid");
    if (buffer[2] !== 2) throw new Error("Expected DER integer");
    const lenR = buffer[3];
    if (lenR === 0) throw new Error("R length is zero");
    if (5 + lenR >= buffer.length) throw new Error("R length is too long");
    if (buffer[4 + lenR] !== 2) throw new Error("Expected DER integer (2)");
    const lenS = buffer[5 + lenR];
    if (lenS === 0) throw new Error("S length is zero");
    if (6 + lenR + lenS !== buffer.length) throw new Error("S length is invalid");
    if (buffer[4] & 128) throw new Error("R value is negative");
    if (lenR > 1 && buffer[4] === 0 && !(buffer[5] & 128))
      throw new Error("R value excessively padded");
    if (buffer[lenR + 6] & 128) throw new Error("S value is negative");
    if (lenS > 1 && buffer[lenR + 6] === 0 && !(buffer[lenR + 7] & 128))
      throw new Error("S value excessively padded");
    return {
      r: buffer.slice(4, 4 + lenR),
      s: buffer.slice(6 + lenR)
    };
  }
  function encode(r, s) {
    const lenR = r.length;
    const lenS = s.length;
    if (lenR === 0) throw new Error("R length is zero");
    if (lenS === 0) throw new Error("S length is zero");
    if (lenR > 33) throw new Error("R length is too long");
    if (lenS > 33) throw new Error("S length is too long");
    if (r[0] & 128) throw new Error("R value is negative");
    if (s[0] & 128) throw new Error("S value is negative");
    if (lenR > 1 && r[0] === 0 && !(r[1] & 128))
      throw new Error("R value excessively padded");
    if (lenS > 1 && s[0] === 0 && !(s[1] & 128))
      throw new Error("S value excessively padded");
    const signature2 = new Uint8Array(6 + lenR + lenS);
    signature2[0] = 48;
    signature2[1] = signature2.length - 2;
    signature2[2] = 2;
    signature2[3] = r.length;
    signature2.set(r, 4);
    signature2[4 + lenR] = 2;
    signature2[5 + lenR] = s.length;
    signature2.set(s, 6 + lenR);
    return signature2;
  }

  // node_modules/bitcoinjs-lib/src/esm/ops.js
  var OPS;
  (function(OPS9) {
    OPS9[OPS9["OP_FALSE"] = 0] = "OP_FALSE";
    OPS9[OPS9["OP_0"] = 0] = "OP_0";
    OPS9[OPS9["OP_PUSHDATA1"] = 76] = "OP_PUSHDATA1";
    OPS9[OPS9["OP_PUSHDATA2"] = 77] = "OP_PUSHDATA2";
    OPS9[OPS9["OP_PUSHDATA4"] = 78] = "OP_PUSHDATA4";
    OPS9[OPS9["OP_1NEGATE"] = 79] = "OP_1NEGATE";
    OPS9[OPS9["OP_RESERVED"] = 80] = "OP_RESERVED";
    OPS9[OPS9["OP_TRUE"] = 81] = "OP_TRUE";
    OPS9[OPS9["OP_1"] = 81] = "OP_1";
    OPS9[OPS9["OP_2"] = 82] = "OP_2";
    OPS9[OPS9["OP_3"] = 83] = "OP_3";
    OPS9[OPS9["OP_4"] = 84] = "OP_4";
    OPS9[OPS9["OP_5"] = 85] = "OP_5";
    OPS9[OPS9["OP_6"] = 86] = "OP_6";
    OPS9[OPS9["OP_7"] = 87] = "OP_7";
    OPS9[OPS9["OP_8"] = 88] = "OP_8";
    OPS9[OPS9["OP_9"] = 89] = "OP_9";
    OPS9[OPS9["OP_10"] = 90] = "OP_10";
    OPS9[OPS9["OP_11"] = 91] = "OP_11";
    OPS9[OPS9["OP_12"] = 92] = "OP_12";
    OPS9[OPS9["OP_13"] = 93] = "OP_13";
    OPS9[OPS9["OP_14"] = 94] = "OP_14";
    OPS9[OPS9["OP_15"] = 95] = "OP_15";
    OPS9[OPS9["OP_16"] = 96] = "OP_16";
    OPS9[OPS9["OP_NOP"] = 97] = "OP_NOP";
    OPS9[OPS9["OP_VER"] = 98] = "OP_VER";
    OPS9[OPS9["OP_IF"] = 99] = "OP_IF";
    OPS9[OPS9["OP_NOTIF"] = 100] = "OP_NOTIF";
    OPS9[OPS9["OP_VERIF"] = 101] = "OP_VERIF";
    OPS9[OPS9["OP_VERNOTIF"] = 102] = "OP_VERNOTIF";
    OPS9[OPS9["OP_ELSE"] = 103] = "OP_ELSE";
    OPS9[OPS9["OP_ENDIF"] = 104] = "OP_ENDIF";
    OPS9[OPS9["OP_VERIFY"] = 105] = "OP_VERIFY";
    OPS9[OPS9["OP_RETURN"] = 106] = "OP_RETURN";
    OPS9[OPS9["OP_TOALTSTACK"] = 107] = "OP_TOALTSTACK";
    OPS9[OPS9["OP_FROMALTSTACK"] = 108] = "OP_FROMALTSTACK";
    OPS9[OPS9["OP_2DROP"] = 109] = "OP_2DROP";
    OPS9[OPS9["OP_2DUP"] = 110] = "OP_2DUP";
    OPS9[OPS9["OP_3DUP"] = 111] = "OP_3DUP";
    OPS9[OPS9["OP_2OVER"] = 112] = "OP_2OVER";
    OPS9[OPS9["OP_2ROT"] = 113] = "OP_2ROT";
    OPS9[OPS9["OP_2SWAP"] = 114] = "OP_2SWAP";
    OPS9[OPS9["OP_IFDUP"] = 115] = "OP_IFDUP";
    OPS9[OPS9["OP_DEPTH"] = 116] = "OP_DEPTH";
    OPS9[OPS9["OP_DROP"] = 117] = "OP_DROP";
    OPS9[OPS9["OP_DUP"] = 118] = "OP_DUP";
    OPS9[OPS9["OP_NIP"] = 119] = "OP_NIP";
    OPS9[OPS9["OP_OVER"] = 120] = "OP_OVER";
    OPS9[OPS9["OP_PICK"] = 121] = "OP_PICK";
    OPS9[OPS9["OP_ROLL"] = 122] = "OP_ROLL";
    OPS9[OPS9["OP_ROT"] = 123] = "OP_ROT";
    OPS9[OPS9["OP_SWAP"] = 124] = "OP_SWAP";
    OPS9[OPS9["OP_TUCK"] = 125] = "OP_TUCK";
    OPS9[OPS9["OP_CAT"] = 126] = "OP_CAT";
    OPS9[OPS9["OP_SUBSTR"] = 127] = "OP_SUBSTR";
    OPS9[OPS9["OP_LEFT"] = 128] = "OP_LEFT";
    OPS9[OPS9["OP_RIGHT"] = 129] = "OP_RIGHT";
    OPS9[OPS9["OP_SIZE"] = 130] = "OP_SIZE";
    OPS9[OPS9["OP_INVERT"] = 131] = "OP_INVERT";
    OPS9[OPS9["OP_AND"] = 132] = "OP_AND";
    OPS9[OPS9["OP_OR"] = 133] = "OP_OR";
    OPS9[OPS9["OP_XOR"] = 134] = "OP_XOR";
    OPS9[OPS9["OP_EQUAL"] = 135] = "OP_EQUAL";
    OPS9[OPS9["OP_EQUALVERIFY"] = 136] = "OP_EQUALVERIFY";
    OPS9[OPS9["OP_RESERVED1"] = 137] = "OP_RESERVED1";
    OPS9[OPS9["OP_RESERVED2"] = 138] = "OP_RESERVED2";
    OPS9[OPS9["OP_1ADD"] = 139] = "OP_1ADD";
    OPS9[OPS9["OP_1SUB"] = 140] = "OP_1SUB";
    OPS9[OPS9["OP_2MUL"] = 141] = "OP_2MUL";
    OPS9[OPS9["OP_2DIV"] = 142] = "OP_2DIV";
    OPS9[OPS9["OP_NEGATE"] = 143] = "OP_NEGATE";
    OPS9[OPS9["OP_ABS"] = 144] = "OP_ABS";
    OPS9[OPS9["OP_NOT"] = 145] = "OP_NOT";
    OPS9[OPS9["OP_0NOTEQUAL"] = 146] = "OP_0NOTEQUAL";
    OPS9[OPS9["OP_ADD"] = 147] = "OP_ADD";
    OPS9[OPS9["OP_SUB"] = 148] = "OP_SUB";
    OPS9[OPS9["OP_MUL"] = 149] = "OP_MUL";
    OPS9[OPS9["OP_DIV"] = 150] = "OP_DIV";
    OPS9[OPS9["OP_MOD"] = 151] = "OP_MOD";
    OPS9[OPS9["OP_LSHIFT"] = 152] = "OP_LSHIFT";
    OPS9[OPS9["OP_RSHIFT"] = 153] = "OP_RSHIFT";
    OPS9[OPS9["OP_BOOLAND"] = 154] = "OP_BOOLAND";
    OPS9[OPS9["OP_BOOLOR"] = 155] = "OP_BOOLOR";
    OPS9[OPS9["OP_NUMEQUAL"] = 156] = "OP_NUMEQUAL";
    OPS9[OPS9["OP_NUMEQUALVERIFY"] = 157] = "OP_NUMEQUALVERIFY";
    OPS9[OPS9["OP_NUMNOTEQUAL"] = 158] = "OP_NUMNOTEQUAL";
    OPS9[OPS9["OP_LESSTHAN"] = 159] = "OP_LESSTHAN";
    OPS9[OPS9["OP_GREATERTHAN"] = 160] = "OP_GREATERTHAN";
    OPS9[OPS9["OP_LESSTHANOREQUAL"] = 161] = "OP_LESSTHANOREQUAL";
    OPS9[OPS9["OP_GREATERTHANOREQUAL"] = 162] = "OP_GREATERTHANOREQUAL";
    OPS9[OPS9["OP_MIN"] = 163] = "OP_MIN";
    OPS9[OPS9["OP_MAX"] = 164] = "OP_MAX";
    OPS9[OPS9["OP_WITHIN"] = 165] = "OP_WITHIN";
    OPS9[OPS9["OP_RIPEMD160"] = 166] = "OP_RIPEMD160";
    OPS9[OPS9["OP_SHA1"] = 167] = "OP_SHA1";
    OPS9[OPS9["OP_SHA256"] = 168] = "OP_SHA256";
    OPS9[OPS9["OP_HASH160"] = 169] = "OP_HASH160";
    OPS9[OPS9["OP_HASH256"] = 170] = "OP_HASH256";
    OPS9[OPS9["OP_CODESEPARATOR"] = 171] = "OP_CODESEPARATOR";
    OPS9[OPS9["OP_CHECKSIG"] = 172] = "OP_CHECKSIG";
    OPS9[OPS9["OP_CHECKSIGVERIFY"] = 173] = "OP_CHECKSIGVERIFY";
    OPS9[OPS9["OP_CHECKMULTISIG"] = 174] = "OP_CHECKMULTISIG";
    OPS9[OPS9["OP_CHECKMULTISIGVERIFY"] = 175] = "OP_CHECKMULTISIGVERIFY";
    OPS9[OPS9["OP_NOP1"] = 176] = "OP_NOP1";
    OPS9[OPS9["OP_CHECKLOCKTIMEVERIFY"] = 177] = "OP_CHECKLOCKTIMEVERIFY";
    OPS9[OPS9["OP_NOP2"] = 177] = "OP_NOP2";
    OPS9[OPS9["OP_CHECKSEQUENCEVERIFY"] = 178] = "OP_CHECKSEQUENCEVERIFY";
    OPS9[OPS9["OP_NOP3"] = 178] = "OP_NOP3";
    OPS9[OPS9["OP_NOP4"] = 179] = "OP_NOP4";
    OPS9[OPS9["OP_NOP5"] = 180] = "OP_NOP5";
    OPS9[OPS9["OP_NOP6"] = 181] = "OP_NOP6";
    OPS9[OPS9["OP_NOP7"] = 182] = "OP_NOP7";
    OPS9[OPS9["OP_NOP8"] = 183] = "OP_NOP8";
    OPS9[OPS9["OP_NOP9"] = 184] = "OP_NOP9";
    OPS9[OPS9["OP_NOP10"] = 185] = "OP_NOP10";
    OPS9[OPS9["OP_CHECKSIGADD"] = 186] = "OP_CHECKSIGADD";
    OPS9[OPS9["OP_PUBKEYHASH"] = 253] = "OP_PUBKEYHASH";
    OPS9[OPS9["OP_PUBKEY"] = 254] = "OP_PUBKEY";
    OPS9[OPS9["OP_INVALIDOPCODE"] = 255] = "OP_INVALIDOPCODE";
  })(OPS || (OPS = {}));

  // node_modules/uint8array-tools/src/mjs/browser.js
  var HEX_STRINGS = "0123456789abcdefABCDEF";
  var HEX_CODES = HEX_STRINGS.split("").map((c) => c.codePointAt(0));
  var HEX_CODEPOINTS = Array(256).fill(true).map((_, i) => {
    const s = String.fromCodePoint(i);
    const index = HEX_STRINGS.indexOf(s);
    return index < 0 ? void 0 : index < 16 ? index : index - 6;
  });
  var ENCODER = new TextEncoder();
  var DECODER = new TextDecoder();
  function toUtf8(bytes) {
    return DECODER.decode(bytes);
  }
  function fromUtf8(s) {
    return ENCODER.encode(s);
  }
  function concat(arrays) {
    const totalLength = arrays.reduce((a, b) => a + b.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const array2 of arrays) {
      result.set(array2, offset);
      offset += array2.length;
    }
    return result;
  }
  function toHex(bytes) {
    const b = bytes || new Uint8Array();
    return b.length > 512 ? _toHexLengthPerf(b) : _toHexIterPerf(b);
  }
  function _toHexIterPerf(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; ++i) {
      s += HEX_STRINGS[HEX_CODEPOINTS[HEX_CODES[bytes[i] >> 4]]];
      s += HEX_STRINGS[HEX_CODEPOINTS[HEX_CODES[bytes[i] & 15]]];
    }
    return s;
  }
  function _toHexLengthPerf(bytes) {
    const hexBytes = new Uint8Array(bytes.length * 2);
    for (let i = 0; i < bytes.length; ++i) {
      hexBytes[i * 2] = HEX_CODES[bytes[i] >> 4];
      hexBytes[i * 2 + 1] = HEX_CODES[bytes[i] & 15];
    }
    return DECODER.decode(hexBytes);
  }
  function fromHex(hexString) {
    const hexBytes = ENCODER.encode(hexString || "");
    const resultBytes = new Uint8Array(Math.floor(hexBytes.length / 2));
    let i;
    for (i = 0; i < resultBytes.length; i++) {
      const a = HEX_CODEPOINTS[hexBytes[i * 2]];
      const b = HEX_CODEPOINTS[hexBytes[i * 2 + 1]];
      if (a === void 0 || b === void 0) {
        break;
      }
      resultBytes[i] = a << 4 | b;
    }
    return i === resultBytes.length ? resultBytes : resultBytes.slice(0, i);
  }
  function toBase64(bytes) {
    return btoa(String.fromCharCode(...bytes));
  }
  function fromBase64(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  function compare(v1, v2) {
    const minLength = Math.min(v1.length, v2.length);
    for (let i = 0; i < minLength; ++i) {
      if (v1[i] !== v2[i]) {
        return v1[i] < v2[i] ? -1 : 1;
      }
    }
    return v1.length === v2.length ? 0 : v1.length > v2.length ? 1 : -1;
  }
  function writeUInt8(buffer, offset, value2) {
    if (offset + 1 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    if (value2 > 255) {
      throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${255}. Received ${value2}`);
    }
    buffer[offset] = value2;
    return offset + 1;
  }
  function writeUInt16(buffer, offset, value2, littleEndian) {
    if (offset + 2 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (value2 > 65535) {
      throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${65535}. Received ${value2}`);
    }
    if (littleEndian === "LE") {
      buffer[offset] = value2 & 255;
      buffer[offset + 1] = value2 >> 8 & 255;
    } else {
      buffer[offset] = value2 >> 8 & 255;
      buffer[offset + 1] = value2 & 255;
    }
    return offset + 2;
  }
  function writeUInt32(buffer, offset, value2, littleEndian) {
    if (offset + 4 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (value2 > 4294967295) {
      throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${4294967295}. Received ${value2}`);
    }
    if (littleEndian === "LE") {
      buffer[offset] = value2 & 255;
      buffer[offset + 1] = value2 >> 8 & 255;
      buffer[offset + 2] = value2 >> 16 & 255;
      buffer[offset + 3] = value2 >> 24 & 255;
    } else {
      buffer[offset] = value2 >> 24 & 255;
      buffer[offset + 1] = value2 >> 16 & 255;
      buffer[offset + 2] = value2 >> 8 & 255;
      buffer[offset + 3] = value2 & 255;
    }
    return offset + 4;
  }
  function writeUInt64(buffer, offset, value2, littleEndian) {
    if (offset + 8 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (value2 > 0xffffffffffffffffn) {
      throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${0xffffffffffffffffn}. Received ${value2}`);
    }
    if (littleEndian === "LE") {
      buffer[offset] = Number(value2 & 0xffn);
      buffer[offset + 1] = Number(value2 >> 8n & 0xffn);
      buffer[offset + 2] = Number(value2 >> 16n & 0xffn);
      buffer[offset + 3] = Number(value2 >> 24n & 0xffn);
      buffer[offset + 4] = Number(value2 >> 32n & 0xffn);
      buffer[offset + 5] = Number(value2 >> 40n & 0xffn);
      buffer[offset + 6] = Number(value2 >> 48n & 0xffn);
      buffer[offset + 7] = Number(value2 >> 56n & 0xffn);
    } else {
      buffer[offset] = Number(value2 >> 56n & 0xffn);
      buffer[offset + 1] = Number(value2 >> 48n & 0xffn);
      buffer[offset + 2] = Number(value2 >> 40n & 0xffn);
      buffer[offset + 3] = Number(value2 >> 32n & 0xffn);
      buffer[offset + 4] = Number(value2 >> 24n & 0xffn);
      buffer[offset + 5] = Number(value2 >> 16n & 0xffn);
      buffer[offset + 6] = Number(value2 >> 8n & 0xffn);
      buffer[offset + 7] = Number(value2 & 0xffn);
    }
    return offset + 8;
  }
  function readUInt8(buffer, offset) {
    if (offset + 1 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    return buffer[offset];
  }
  function readUInt16(buffer, offset, littleEndian) {
    if (offset + 2 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (littleEndian === "LE") {
      let num = 0;
      num = (num << 8) + buffer[offset + 1];
      num = (num << 8) + buffer[offset];
      return num;
    } else {
      let num = 0;
      num = (num << 8) + buffer[offset];
      num = (num << 8) + buffer[offset + 1];
      return num;
    }
  }
  function readUInt32(buffer, offset, littleEndian) {
    if (offset + 4 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (littleEndian === "LE") {
      let num = 0;
      num = (num << 8) + buffer[offset + 3] >>> 0;
      num = (num << 8) + buffer[offset + 2] >>> 0;
      num = (num << 8) + buffer[offset + 1] >>> 0;
      num = (num << 8) + buffer[offset] >>> 0;
      return num;
    } else {
      let num = 0;
      num = (num << 8) + buffer[offset] >>> 0;
      num = (num << 8) + buffer[offset + 1] >>> 0;
      num = (num << 8) + buffer[offset + 2] >>> 0;
      num = (num << 8) + buffer[offset + 3] >>> 0;
      return num;
    }
  }
  function writeInt32(buffer, offset, value2, littleEndian) {
    if (offset + 4 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    if (value2 > 2147483647 || value2 < -2147483648) {
      throw new Error(`The value of "value" is out of range. It must be >= ${-2147483648} and <= ${2147483647}. Received ${value2}`);
    }
    littleEndian = littleEndian.toUpperCase();
    if (littleEndian === "LE") {
      buffer[offset] = value2 & 255;
      buffer[offset + 1] = value2 >> 8 & 255;
      buffer[offset + 2] = value2 >> 16 & 255;
      buffer[offset + 3] = value2 >> 24 & 255;
    } else {
      buffer[offset] = value2 >> 24 & 255;
      buffer[offset + 1] = value2 >> 16 & 255;
      buffer[offset + 2] = value2 >> 8 & 255;
      buffer[offset + 3] = value2 & 255;
    }
    return offset + 4;
  }
  function writeInt64(buffer, offset, value2, littleEndian) {
    if (offset + 8 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    if (value2 > 0x7fffffffffffffffn || value2 < -0x8000000000000000n) {
      throw new Error(`The value of "value" is out of range. It must be >= ${-0x8000000000000000n} and <= ${0x7fffffffffffffffn}. Received ${value2}`);
    }
    littleEndian = littleEndian.toUpperCase();
    if (littleEndian === "LE") {
      buffer[offset] = Number(value2 & 0xffn);
      buffer[offset + 1] = Number(value2 >> 8n & 0xffn);
      buffer[offset + 2] = Number(value2 >> 16n & 0xffn);
      buffer[offset + 3] = Number(value2 >> 24n & 0xffn);
      buffer[offset + 4] = Number(value2 >> 32n & 0xffn);
      buffer[offset + 5] = Number(value2 >> 40n & 0xffn);
      buffer[offset + 6] = Number(value2 >> 48n & 0xffn);
      buffer[offset + 7] = Number(value2 >> 56n & 0xffn);
    } else {
      buffer[offset] = Number(value2 >> 56n & 0xffn);
      buffer[offset + 1] = Number(value2 >> 48n & 0xffn);
      buffer[offset + 2] = Number(value2 >> 40n & 0xffn);
      buffer[offset + 3] = Number(value2 >> 32n & 0xffn);
      buffer[offset + 4] = Number(value2 >> 24n & 0xffn);
      buffer[offset + 5] = Number(value2 >> 16n & 0xffn);
      buffer[offset + 6] = Number(value2 >> 8n & 0xffn);
      buffer[offset + 7] = Number(value2 & 0xffn);
    }
    return offset + 8;
  }
  function readInt32(buffer, offset, littleEndian) {
    if (offset + 4 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (littleEndian === "LE") {
      const val = buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16) + (buffer[offset + 3] << 24 >>> 0);
      return buffer[offset + 3] <= 127 ? val : val - 4294967296;
    } else {
      const val = (buffer[offset] << 24 >>> 0) + (buffer[offset + 1] << 16) + (buffer[offset + 2] << 8) + buffer[offset + 3];
      return buffer[offset] <= 127 ? val : val - 4294967296;
    }
  }
  function readInt64(buffer, offset, littleEndian) {
    if (offset + 8 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    let num = 0n;
    if (littleEndian === "LE") {
      num = (num << 8n) + BigInt(buffer[offset + 7]);
      num = (num << 8n) + BigInt(buffer[offset + 6]);
      num = (num << 8n) + BigInt(buffer[offset + 5]);
      num = (num << 8n) + BigInt(buffer[offset + 4]);
      num = (num << 8n) + BigInt(buffer[offset + 3]);
      num = (num << 8n) + BigInt(buffer[offset + 2]);
      num = (num << 8n) + BigInt(buffer[offset + 1]);
      num = (num << 8n) + BigInt(buffer[offset]);
      return buffer[offset + 7] <= 127 ? num : num - 0x10000000000000000n;
    } else {
      let num2 = 0n;
      num2 = (num2 << 8n) + BigInt(buffer[offset]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 1]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 2]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 3]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 4]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 5]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 6]);
      num2 = (num2 << 8n) + BigInt(buffer[offset + 7]);
      return buffer[offset] <= 127 ? num2 : num2 - 0x10000000000000000n;
    }
  }

  // node_modules/bitcoinjs-lib/src/esm/push_data.js
  function encodingLength(i) {
    return i < OPS.OP_PUSHDATA1 ? 1 : i <= 255 ? 2 : i <= 65535 ? 3 : 5;
  }
  function encode2(buffer, num, offset) {
    const size = encodingLength(num);
    if (size === 1) {
      writeUInt8(buffer, offset, num);
    } else if (size === 2) {
      writeUInt8(buffer, offset, OPS.OP_PUSHDATA1);
      writeUInt8(buffer, offset + 1, num);
    } else if (size === 3) {
      writeUInt8(buffer, offset, OPS.OP_PUSHDATA2);
      writeUInt16(buffer, offset + 1, num, "LE");
    } else {
      writeUInt8(buffer, offset, OPS.OP_PUSHDATA4);
      writeUInt32(buffer, offset + 1, num, "LE");
    }
    return size;
  }
  function decode2(buffer, offset) {
    const opcode = readUInt8(buffer, offset);
    let num;
    let size;
    if (opcode < OPS.OP_PUSHDATA1) {
      num = opcode;
      size = 1;
    } else if (opcode === OPS.OP_PUSHDATA1) {
      if (offset + 2 > buffer.length) return null;
      num = readUInt8(buffer, offset + 1);
      size = 2;
    } else if (opcode === OPS.OP_PUSHDATA2) {
      if (offset + 3 > buffer.length) return null;
      num = readUInt16(buffer, offset + 1, "LE");
      size = 3;
    } else {
      if (offset + 5 > buffer.length) return null;
      if (opcode !== OPS.OP_PUSHDATA4) throw new Error("Unexpected opcode");
      num = readUInt32(buffer, offset + 1, "LE");
      size = 5;
    }
    return {
      opcode,
      number: num,
      size
    };
  }

  // node_modules/bitcoinjs-lib/src/esm/script_number.js
  var script_number_exports = {};
  __export(script_number_exports, {
    decode: () => decode3,
    encode: () => encode3
  });
  function decode3(buffer, maxLength, minimal) {
    maxLength = maxLength || 4;
    minimal = minimal === void 0 ? true : minimal;
    const length2 = buffer.length;
    if (length2 === 0) return 0;
    if (length2 > maxLength) throw new TypeError("Script number overflow");
    if (minimal) {
      if ((buffer[length2 - 1] & 127) === 0) {
        if (length2 <= 1 || (buffer[length2 - 2] & 128) === 0)
          throw new Error("Non-minimally encoded script number");
      }
    }
    if (length2 === 5) {
      const a = readUInt32(buffer, 0, "LE");
      const b = readUInt8(buffer, 4);
      if (b & 128) return -((b & ~128) * 4294967296 + a);
      return b * 4294967296 + a;
    }
    let result = 0;
    for (let i = 0; i < length2; ++i) {
      result |= buffer[i] << 8 * i;
    }
    if (buffer[length2 - 1] & 128)
      return -(result & ~(128 << 8 * (length2 - 1)));
    return result;
  }
  function scriptNumSize(i) {
    return i > 2147483647 ? 5 : i > 8388607 ? 4 : i > 32767 ? 3 : i > 127 ? 2 : i > 0 ? 1 : 0;
  }
  function encode3(_number) {
    let value2 = Math.abs(_number);
    const size = scriptNumSize(value2);
    const buffer = new Uint8Array(size);
    const negative = _number < 0;
    for (let i = 0; i < size; ++i) {
      writeUInt8(buffer, i, value2 & 255);
      value2 >>= 8;
    }
    if (buffer[size - 1] & 128) {
      writeUInt8(buffer, size - 1, negative ? 128 : 0);
    } else if (negative) {
      buffer[size - 1] |= 128;
    }
    return buffer;
  }

  // node_modules/bitcoinjs-lib/src/esm/script_signature.js
  var script_signature_exports = {};
  __export(script_signature_exports, {
    decode: () => decode4,
    encode: () => encode4
  });

  // node_modules/valibot/dist/index.mjs
  var store$4;
  // @__NO_SIDE_EFFECTS__
  function getGlobalConfig(config$1) {
    return {
      lang: config$1?.lang ?? store$4?.lang,
      message: config$1?.message,
      abortEarly: config$1?.abortEarly ?? store$4?.abortEarly,
      abortPipeEarly: config$1?.abortPipeEarly ?? store$4?.abortPipeEarly
    };
  }
  var store$3;
  // @__NO_SIDE_EFFECTS__
  function getGlobalMessage(lang) {
    return store$3?.get(lang);
  }
  var store$2;
  // @__NO_SIDE_EFFECTS__
  function getSchemaMessage(lang) {
    return store$2?.get(lang);
  }
  var store$1;
  // @__NO_SIDE_EFFECTS__
  function getSpecificMessage(reference, lang) {
    return store$1?.get(reference)?.get(lang);
  }
  // @__NO_SIDE_EFFECTS__
  function _stringify(input) {
    const type = typeof input;
    if (type === "string") return `"${input}"`;
    if (type === "number" || type === "bigint" || type === "boolean") return `${input}`;
    if (type === "object" || type === "function") return (input && Object.getPrototypeOf(input)?.constructor?.name) ?? "null";
    return type;
  }
  function _addIssue(context, label, dataset, config$1, other) {
    const input = other && "input" in other ? other.input : dataset.value;
    const expected14 = other?.expected ?? context.expects ?? null;
    const received = other?.received ?? /* @__PURE__ */ _stringify(input);
    const issue = {
      kind: context.kind,
      type: context.type,
      input,
      expected: expected14,
      received,
      message: `Invalid ${label}: ${expected14 ? `Expected ${expected14} but r` : "R"}eceived ${received}`,
      requirement: context.requirement,
      path: other?.path,
      issues: other?.issues,
      lang: config$1.lang,
      abortEarly: config$1.abortEarly,
      abortPipeEarly: config$1.abortPipeEarly
    };
    const isSchema = context.kind === "schema";
    const message$1 = other?.message ?? context.message ?? /* @__PURE__ */ getSpecificMessage(context.reference, issue.lang) ?? (isSchema ? /* @__PURE__ */ getSchemaMessage(issue.lang) : null) ?? config$1.message ?? /* @__PURE__ */ getGlobalMessage(issue.lang);
    if (message$1 !== void 0) issue.message = typeof message$1 === "function" ? message$1(issue) : message$1;
    if (isSchema) dataset.typed = false;
    if (dataset.issues) dataset.issues.push(issue);
    else dataset.issues = [issue];
  }
  // @__NO_SIDE_EFFECTS__
  function _getStandardProps(context) {
    return {
      version: 1,
      vendor: "valibot",
      validate(value$1) {
        return context["~run"]({ value: value$1 }, /* @__PURE__ */ getGlobalConfig());
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function _joinExpects(values$1, separator) {
    const list = [...new Set(values$1)];
    if (list.length > 1) return `(${list.join(` ${separator} `)})`;
    return list[0] ?? "never";
  }
  var ValiError = class extends Error {
    /**
    * Creates a Valibot error with useful information.
    *
    * @param issues The error issues.
    */
    constructor(issues) {
      super(issues[0].message);
      this.name = "ValiError";
      this.issues = issues;
    }
  };
  // @__NO_SIDE_EFFECTS__
  function everyItem(requirement, message$1) {
    return {
      kind: "validation",
      type: "every_item",
      reference: everyItem,
      async: false,
      expects: null,
      requirement,
      message: message$1,
      "~run"(dataset, config$1) {
        if (dataset.typed && !dataset.value.every(this.requirement)) _addIssue(this, "item", dataset, config$1);
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function integer(message$1) {
    return {
      kind: "validation",
      type: "integer",
      reference: integer,
      async: false,
      expects: null,
      requirement: Number.isInteger,
      message: message$1,
      "~run"(dataset, config$1) {
        if (dataset.typed && !this.requirement(dataset.value)) _addIssue(this, "integer", dataset, config$1);
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function length(requirement, message$1) {
    return {
      kind: "validation",
      type: "length",
      reference: length,
      async: false,
      expects: `${requirement}`,
      requirement,
      message: message$1,
      "~run"(dataset, config$1) {
        if (dataset.typed && dataset.value.length !== this.requirement) _addIssue(this, "length", dataset, config$1, { received: `${dataset.value.length}` });
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function maxValue(requirement, message$1) {
    return {
      kind: "validation",
      type: "max_value",
      reference: maxValue,
      async: false,
      expects: `<=${requirement instanceof Date ? requirement.toJSON() : /* @__PURE__ */ _stringify(requirement)}`,
      requirement,
      message: message$1,
      "~run"(dataset, config$1) {
        if (dataset.typed && !(dataset.value <= this.requirement)) _addIssue(this, "value", dataset, config$1, { received: dataset.value instanceof Date ? dataset.value.toJSON() : /* @__PURE__ */ _stringify(dataset.value) });
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function minValue(requirement, message$1) {
    return {
      kind: "validation",
      type: "min_value",
      reference: minValue,
      async: false,
      expects: `>=${requirement instanceof Date ? requirement.toJSON() : /* @__PURE__ */ _stringify(requirement)}`,
      requirement,
      message: message$1,
      "~run"(dataset, config$1) {
        if (dataset.typed && !(dataset.value >= this.requirement)) _addIssue(this, "value", dataset, config$1, { received: dataset.value instanceof Date ? dataset.value.toJSON() : /* @__PURE__ */ _stringify(dataset.value) });
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function regex(requirement, message$1) {
    return {
      kind: "validation",
      type: "regex",
      reference: regex,
      async: false,
      expects: `${requirement}`,
      requirement,
      message: message$1,
      "~run"(dataset, config$1) {
        if (dataset.typed && !this.requirement.test(dataset.value)) _addIssue(this, "format", dataset, config$1);
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function getFallback(schema, dataset, config$1) {
    return typeof schema.fallback === "function" ? schema.fallback(dataset, config$1) : schema.fallback;
  }
  // @__NO_SIDE_EFFECTS__
  function getDefault(schema, dataset, config$1) {
    return typeof schema.default === "function" ? schema.default(dataset, config$1) : schema.default;
  }
  // @__NO_SIDE_EFFECTS__
  function is(schema, input) {
    return !schema["~run"]({ value: input }, { abortEarly: true }).issues;
  }
  // @__NO_SIDE_EFFECTS__
  function any() {
    return {
      kind: "schema",
      type: "any",
      reference: any,
      expects: "any",
      async: false,
      get "~standard"() {
        return /* @__PURE__ */ _getStandardProps(this);
      },
      "~run"(dataset) {
        dataset.typed = true;
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function array(item, message$1) {
    return {
      kind: "schema",
      type: "array",
      reference: array,
      expects: "Array",
      async: false,
      item,
      message: message$1,
      get "~standard"() {
        return /* @__PURE__ */ _getStandardProps(this);
      },
      "~run"(dataset, config$1) {
        const input = dataset.value;
        if (Array.isArray(input)) {
          dataset.typed = true;
          dataset.value = [];
          for (let key = 0; key < input.length; key++) {
            const value$1 = input[key];
            const itemDataset = this.item["~run"]({ value: value$1 }, config$1);
            if (itemDataset.issues) {
              const pathItem = {
                type: "array",
                origin: "value",
                input,
                key,
                value: value$1
              };
              for (const issue of itemDataset.issues) {
                if (issue.path) issue.path.unshift(pathItem);
                else issue.path = [pathItem];
                dataset.issues?.push(issue);
              }
              if (!dataset.issues) dataset.issues = itemDataset.issues;
              if (config$1.abortEarly) {
                dataset.typed = false;
                break;
              }
            }
            if (!itemDataset.typed) dataset.typed = false;
            dataset.value.push(itemDataset.value);
          }
        } else _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function bigint(message$1) {
    return {
      kind: "schema",
      type: "bigint",
      reference: bigint,
      expects: "bigint",
      async: false,
      message: message$1,
      get "~standard"() {
        return /* @__PURE__ */ _getStandardProps(this);
      },
      "~run"(dataset, config$1) {
        if (typeof dataset.value === "bigint") dataset.typed = true;
        else _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function custom(check$1, message$1) {
    return {
      kind: "schema",
      type: "custom",
      reference: custom,
      expects: "unknown",
      async: false,
      check: check$1,
      message: message$1,
      get "~standard"() {
        return /* @__PURE__ */ _getStandardProps(this);
      },
      "~run"(dataset, config$1) {
        if (this.check(dataset.value)) dataset.typed = true;
        else _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function instance(class_, message$1) {
    return {
      kind: "schema",
      type: "instance",
      reference: instance,
      expects: class_.name,
      async: false,
      class: class_,
      message: message$1,
      get "~standard"() {
        return /* @__PURE__ */ _getStandardProps(this);
      },
      "~run"(dataset, config$1) {
        if (dataset.value instanceof this.class) dataset.typed = true;
        else _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function nullable(wrapped, default_) {
    return {
      kind: "schema",
      type: "nullable",
      reference: nullable,
      expects: `(${wrapped.expects} | null)`,
      async: false,
      wrapped,
      default: default_,
      get "~standard"() {
        return /* @__PURE__ */ _getStandardProps(this);
      },
      "~run"(dataset, config$1) {
        if (dataset.value === null) {
          if (this.default !== void 0) dataset.value = /* @__PURE__ */ getDefault(this, dataset, config$1);
          if (dataset.value === null) {
            dataset.typed = true;
            return dataset;
          }
        }
        return this.wrapped["~run"](dataset, config$1);
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function nullish(wrapped, default_) {
    return {
      kind: "schema",
      type: "nullish",
      reference: nullish,
      expects: `(${wrapped.expects} | null | undefined)`,
      async: false,
      wrapped,
      default: default_,
      get "~standard"() {
        return /* @__PURE__ */ _getStandardProps(this);
      },
      "~run"(dataset, config$1) {
        if (dataset.value === null || dataset.value === void 0) {
          if (this.default !== void 0) dataset.value = /* @__PURE__ */ getDefault(this, dataset, config$1);
          if (dataset.value === null || dataset.value === void 0) {
            dataset.typed = true;
            return dataset;
          }
        }
        return this.wrapped["~run"](dataset, config$1);
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function number(message$1) {
    return {
      kind: "schema",
      type: "number",
      reference: number,
      expects: "number",
      async: false,
      message: message$1,
      get "~standard"() {
        return /* @__PURE__ */ _getStandardProps(this);
      },
      "~run"(dataset, config$1) {
        if (typeof dataset.value === "number" && !isNaN(dataset.value)) dataset.typed = true;
        else _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function object(entries$1, message$1) {
    return {
      kind: "schema",
      type: "object",
      reference: object,
      expects: "Object",
      async: false,
      entries: entries$1,
      message: message$1,
      get "~standard"() {
        return /* @__PURE__ */ _getStandardProps(this);
      },
      "~run"(dataset, config$1) {
        const input = dataset.value;
        if (input && typeof input === "object") {
          dataset.typed = true;
          dataset.value = {};
          for (const key in this.entries) {
            const valueSchema = this.entries[key];
            if (key in input || (valueSchema.type === "exact_optional" || valueSchema.type === "optional" || valueSchema.type === "nullish") && valueSchema.default !== void 0) {
              const value$1 = key in input ? input[key] : /* @__PURE__ */ getDefault(valueSchema);
              const valueDataset = valueSchema["~run"]({ value: value$1 }, config$1);
              if (valueDataset.issues) {
                const pathItem = {
                  type: "object",
                  origin: "value",
                  input,
                  key,
                  value: value$1
                };
                for (const issue of valueDataset.issues) {
                  if (issue.path) issue.path.unshift(pathItem);
                  else issue.path = [pathItem];
                  dataset.issues?.push(issue);
                }
                if (!dataset.issues) dataset.issues = valueDataset.issues;
                if (config$1.abortEarly) {
                  dataset.typed = false;
                  break;
                }
              }
              if (!valueDataset.typed) dataset.typed = false;
              dataset.value[key] = valueDataset.value;
            } else if (valueSchema.fallback !== void 0) dataset.value[key] = /* @__PURE__ */ getFallback(valueSchema);
            else if (valueSchema.type !== "exact_optional" && valueSchema.type !== "optional" && valueSchema.type !== "nullish") {
              _addIssue(this, "key", dataset, config$1, {
                input: void 0,
                expected: `"${key}"`,
                path: [{
                  type: "object",
                  origin: "key",
                  input,
                  key,
                  value: input[key]
                }]
              });
              if (config$1.abortEarly) break;
            }
          }
        } else _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function optional(wrapped, default_) {
    return {
      kind: "schema",
      type: "optional",
      reference: optional,
      expects: `(${wrapped.expects} | undefined)`,
      async: false,
      wrapped,
      default: default_,
      get "~standard"() {
        return /* @__PURE__ */ _getStandardProps(this);
      },
      "~run"(dataset, config$1) {
        if (dataset.value === void 0) {
          if (this.default !== void 0) dataset.value = /* @__PURE__ */ getDefault(this, dataset, config$1);
          if (dataset.value === void 0) {
            dataset.typed = true;
            return dataset;
          }
        }
        return this.wrapped["~run"](dataset, config$1);
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function string(message$1) {
    return {
      kind: "schema",
      type: "string",
      reference: string,
      expects: "string",
      async: false,
      message: message$1,
      get "~standard"() {
        return /* @__PURE__ */ _getStandardProps(this);
      },
      "~run"(dataset, config$1) {
        if (typeof dataset.value === "string") dataset.typed = true;
        else _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function tuple(items, message$1) {
    return {
      kind: "schema",
      type: "tuple",
      reference: tuple,
      expects: "Array",
      async: false,
      items,
      message: message$1,
      get "~standard"() {
        return /* @__PURE__ */ _getStandardProps(this);
      },
      "~run"(dataset, config$1) {
        const input = dataset.value;
        if (Array.isArray(input)) {
          dataset.typed = true;
          dataset.value = [];
          for (let key = 0; key < this.items.length; key++) {
            const value$1 = input[key];
            const itemDataset = this.items[key]["~run"]({ value: value$1 }, config$1);
            if (itemDataset.issues) {
              const pathItem = {
                type: "array",
                origin: "value",
                input,
                key,
                value: value$1
              };
              for (const issue of itemDataset.issues) {
                if (issue.path) issue.path.unshift(pathItem);
                else issue.path = [pathItem];
                dataset.issues?.push(issue);
              }
              if (!dataset.issues) dataset.issues = itemDataset.issues;
              if (config$1.abortEarly) {
                dataset.typed = false;
                break;
              }
            }
            if (!itemDataset.typed) dataset.typed = false;
            dataset.value.push(itemDataset.value);
          }
        } else _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function _subIssues(datasets) {
    let issues;
    if (datasets) for (const dataset of datasets) if (issues) issues.push(...dataset.issues);
    else issues = dataset.issues;
    return issues;
  }
  // @__NO_SIDE_EFFECTS__
  function union(options, message$1) {
    return {
      kind: "schema",
      type: "union",
      reference: union,
      expects: /* @__PURE__ */ _joinExpects(options.map((option) => option.expects), "|"),
      async: false,
      options,
      message: message$1,
      get "~standard"() {
        return /* @__PURE__ */ _getStandardProps(this);
      },
      "~run"(dataset, config$1) {
        let validDataset;
        let typedDatasets;
        let untypedDatasets;
        for (const schema of this.options) {
          const optionDataset = schema["~run"]({ value: dataset.value }, config$1);
          if (optionDataset.typed) if (optionDataset.issues) if (typedDatasets) typedDatasets.push(optionDataset);
          else typedDatasets = [optionDataset];
          else {
            validDataset = optionDataset;
            break;
          }
          else if (untypedDatasets) untypedDatasets.push(optionDataset);
          else untypedDatasets = [optionDataset];
        }
        if (validDataset) return validDataset;
        if (typedDatasets) {
          if (typedDatasets.length === 1) return typedDatasets[0];
          _addIssue(this, "type", dataset, config$1, { issues: /* @__PURE__ */ _subIssues(typedDatasets) });
          dataset.typed = true;
        } else if (untypedDatasets?.length === 1) return untypedDatasets[0];
        else _addIssue(this, "type", dataset, config$1, { issues: /* @__PURE__ */ _subIssues(untypedDatasets) });
        return dataset;
      }
    };
  }
  function parse(schema, input, config$1) {
    const dataset = schema["~run"]({ value: input }, /* @__PURE__ */ getGlobalConfig(config$1));
    if (dataset.issues) throw new ValiError(dataset.issues);
    return dataset.value;
  }
  // @__NO_SIDE_EFFECTS__
  function partial(schema, keys) {
    const entries$1 = {};
    for (const key in schema.entries) entries$1[key] = !keys || keys.includes(key) ? /* @__PURE__ */ optional(schema.entries[key]) : schema.entries[key];
    return {
      ...schema,
      entries: entries$1,
      get "~standard"() {
        return /* @__PURE__ */ _getStandardProps(this);
      }
    };
  }
  // @__NO_SIDE_EFFECTS__
  function pipe(...pipe$1) {
    return {
      ...pipe$1[0],
      pipe: pipe$1,
      get "~standard"() {
        return /* @__PURE__ */ _getStandardProps(this);
      },
      "~run"(dataset, config$1) {
        for (const item of pipe$1) if (item.kind !== "metadata") {
          if (dataset.issues && (item.kind === "schema" || item.kind === "transformation")) {
            dataset.typed = false;
            break;
          }
          if (!dataset.issues || !config$1.abortEarly && !config$1.abortPipeEarly) dataset = item["~run"](dataset, config$1);
        }
        return dataset;
      }
    };
  }

  // node_modules/bitcoinjs-lib/src/esm/types.js
  var ZERO32 = new Uint8Array(32);
  var EC_P = fromHex(
    "fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"
  );
  var NBufferSchemaFactory = (size) => pipe(instance(Uint8Array), length(size));
  function stacksEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => {
      return compare(x, b[i]) === 0;
    });
  }
  function isPoint(p) {
    if (!(p instanceof Uint8Array)) return false;
    if (p.length < 33) return false;
    const t = p[0];
    const x = p.slice(1, 33);
    if (compare(ZERO32, x) === 0) return false;
    if (compare(x, EC_P) >= 0) return false;
    if ((t === 2 || t === 3) && p.length === 33) {
      return true;
    }
    const y = p.slice(33);
    if (compare(ZERO32, y) === 0) return false;
    if (compare(y, EC_P) >= 0) return false;
    if (t === 4 && p.length === 65) return true;
    return false;
  }
  var TAPLEAF_VERSION_MASK = 254;
  function isTapleaf(o) {
    if (!o || !("output" in o)) return false;
    if (!(o.output instanceof Uint8Array)) return false;
    if (o.version !== void 0)
      return (o.version & TAPLEAF_VERSION_MASK) === o.version;
    return true;
  }
  function isTaptree(scriptTree) {
    if (!Array.isArray(scriptTree)) return isTapleaf(scriptTree);
    if (scriptTree.length !== 2) return false;
    return scriptTree.every((t) => isTaptree(t));
  }
  var Buffer256bitSchema = NBufferSchemaFactory(32);
  var Hash160bitSchema = NBufferSchemaFactory(20);
  var Hash256bitSchema = NBufferSchemaFactory(32);
  var BufferSchema = instance(Uint8Array);
  var HexSchema = pipe(string(), regex(/^([0-9a-f]{2})+$/i));
  var UInt8Schema = pipe(
    number(),
    integer(),
    minValue(0),
    maxValue(255)
  );
  var UInt32Schema = pipe(
    number(),
    integer(),
    minValue(0),
    maxValue(4294967295)
  );
  var SatoshiSchema = pipe(
    bigint(),
    minValue(0n),
    maxValue(0x7fffffffffffffffn)
  );
  var NullablePartial = (a) => object(
    Object.entries(a).reduce(
      (acc, next) => ({ ...acc, [next[0]]: nullish(next[1]) }),
      {}
    )
  );

  // node_modules/bitcoinjs-lib/src/esm/script_signature.js
  var ZERO = new Uint8Array(1);
  function toDER(x) {
    let i = 0;
    while (x[i] === 0) ++i;
    if (i === x.length) return ZERO;
    x = x.slice(i);
    if (x[0] & 128) return concat([ZERO, x]);
    return x;
  }
  function fromDER(x) {
    if (x[0] === 0) x = x.slice(1);
    const buffer = new Uint8Array(32);
    const bstart = Math.max(0, 32 - x.length);
    buffer.set(x, bstart);
    return buffer;
  }
  function decode4(buffer) {
    const hashType = readUInt8(buffer, buffer.length - 1);
    if (!isDefinedHashType(hashType)) {
      throw new Error("Invalid hashType " + hashType);
    }
    const decoded = decode(buffer.subarray(0, -1));
    const r = fromDER(decoded.r);
    const s = fromDER(decoded.s);
    const signature2 = concat([r, s]);
    return { signature: signature2, hashType };
  }
  function encode4(signature2, hashType) {
    parse(
      object({
        signature: NBufferSchemaFactory(64),
        hashType: UInt8Schema
      }),
      { signature: signature2, hashType }
    );
    if (!isDefinedHashType(hashType)) {
      throw new Error("Invalid hashType " + hashType);
    }
    const hashTypeBuffer = new Uint8Array(1);
    writeUInt8(hashTypeBuffer, 0, hashType);
    const r = toDER(signature2.slice(0, 32));
    const s = toDER(signature2.slice(32, 64));
    return concat([encode(r, s), hashTypeBuffer]);
  }

  // node_modules/bitcoinjs-lib/src/esm/script.js
  var OP_INT_BASE = OPS.OP_RESERVED;
  var StackSchema = array(union([instance(Uint8Array), number()]));
  function isOPInt(value2) {
    return is(number(), value2) && (value2 === OPS.OP_0 || value2 >= OPS.OP_1 && value2 <= OPS.OP_16 || value2 === OPS.OP_1NEGATE);
  }
  function isPushOnlyChunk(value2) {
    return is(BufferSchema, value2) || isOPInt(value2);
  }
  function isPushOnly(value2) {
    return is(pipe(any(), everyItem(isPushOnlyChunk)), value2);
  }
  function countNonPushOnlyOPs(value2) {
    return value2.length - value2.filter(isPushOnlyChunk).length;
  }
  function asMinimalOP(buffer) {
    if (buffer.length === 0) return OPS.OP_0;
    if (buffer.length !== 1) return;
    if (buffer[0] >= 1 && buffer[0] <= 16) return OP_INT_BASE + buffer[0];
    if (buffer[0] === 129) return OPS.OP_1NEGATE;
  }
  function chunksIsBuffer(buf) {
    return buf instanceof Uint8Array;
  }
  function chunksIsArray(buf) {
    return is(StackSchema, buf);
  }
  function singleChunkIsBuffer(buf) {
    return buf instanceof Uint8Array;
  }
  function compile(chunks) {
    if (chunksIsBuffer(chunks)) return chunks;
    parse(StackSchema, chunks);
    const bufferSize = chunks.reduce((accum, chunk) => {
      if (singleChunkIsBuffer(chunk)) {
        if (chunk.length === 1 && asMinimalOP(chunk) !== void 0) {
          return accum + 1;
        }
        return accum + encodingLength(chunk.length) + chunk.length;
      }
      return accum + 1;
    }, 0);
    const buffer = new Uint8Array(bufferSize);
    let offset = 0;
    chunks.forEach((chunk) => {
      if (singleChunkIsBuffer(chunk)) {
        const opcode = asMinimalOP(chunk);
        if (opcode !== void 0) {
          writeUInt8(buffer, offset, opcode);
          offset += 1;
          return;
        }
        offset += encode2(buffer, chunk.length, offset);
        buffer.set(chunk, offset);
        offset += chunk.length;
      } else {
        writeUInt8(buffer, offset, chunk);
        offset += 1;
      }
    });
    if (offset !== buffer.length) throw new Error("Could not decode chunks");
    return buffer;
  }
  function decompile(buffer) {
    if (chunksIsArray(buffer)) return buffer;
    parse(BufferSchema, buffer);
    const chunks = [];
    let i = 0;
    while (i < buffer.length) {
      const opcode = buffer[i];
      if (opcode > OPS.OP_0 && opcode <= OPS.OP_PUSHDATA4) {
        const d = decode2(buffer, i);
        if (d === null) return null;
        i += d.size;
        if (i + d.number > buffer.length) return null;
        const data = buffer.slice(i, i + d.number);
        i += d.number;
        const op = asMinimalOP(data);
        if (op !== void 0) {
          chunks.push(op);
        } else {
          chunks.push(data);
        }
      } else {
        chunks.push(opcode);
        i += 1;
      }
    }
    return chunks;
  }
  function toASM(chunks) {
    if (chunksIsBuffer(chunks)) {
      chunks = decompile(chunks);
    }
    if (!chunks) {
      throw new Error("Could not convert invalid chunks to ASM");
    }
    return chunks.map((chunk) => {
      if (singleChunkIsBuffer(chunk)) {
        const op = asMinimalOP(chunk);
        if (op === void 0) return toHex(chunk);
        chunk = op;
      }
      return OPS[chunk];
    }).join(" ");
  }
  function fromASM(asm) {
    parse(string(), asm);
    return compile(
      asm.split(" ").map((chunk) => {
        if (isNaN(Number(chunk)) && chunk in OPS) {
          return OPS[chunk];
        }
        parse(HexSchema, chunk);
        return fromHex(chunk);
      })
    );
  }
  function toStack(chunks) {
    chunks = decompile(chunks);
    parse(custom(isPushOnly), chunks);
    return chunks.map((op) => {
      if (singleChunkIsBuffer(op)) return op;
      if (op === OPS.OP_0) return new Uint8Array(0);
      return encode3(op - OP_INT_BASE);
    });
  }
  function isCanonicalPubKey(buffer) {
    return isPoint(buffer);
  }
  function isDefinedHashType(hashType) {
    const hashTypeMod = hashType & ~128;
    return hashTypeMod > 0 && hashTypeMod < 4;
  }
  function isCanonicalScriptSignature(buffer) {
    if (!(buffer instanceof Uint8Array)) return false;
    if (!isDefinedHashType(buffer[buffer.length - 1])) return false;
    return check(buffer.slice(0, -1));
  }
  var number2 = script_number_exports;
  var signature = script_signature_exports;

  // node_modules/bitcoinjs-lib/src/esm/payments/lazy.js
  function prop(object2, name, f) {
    Object.defineProperty(object2, name, {
      configurable: true,
      enumerable: true,
      get() {
        const _value = f.call(this);
        this[name] = _value;
        return _value;
      },
      set(_value) {
        Object.defineProperty(this, name, {
          configurable: true,
          enumerable: true,
          value: _value,
          writable: true
        });
      }
    });
  }
  function value(f) {
    let _value;
    return () => {
      if (_value !== void 0) return _value;
      _value = f();
      return _value;
    };
  }

  // node_modules/bitcoinjs-lib/src/esm/payments/p2ms.js
  var OPS2 = OPS;
  var OP_INT_BASE2 = OPS2.OP_RESERVED;
  function encodeSmallOrScriptNum(n) {
    return n <= 16 ? OP_INT_BASE2 + n : encode3(n);
  }
  function decodeSmallOrScriptNum(chunk) {
    if (typeof chunk === "number") {
      const val = chunk - OP_INT_BASE2;
      if (val < 1 || val > 16)
        throw new TypeError(`Invalid opcode: expected OP_1\u2013OP_16, got ${chunk}`);
      return val;
    } else return decode3(chunk);
  }
  function isSmallOrScriptNum(chunk) {
    if (typeof chunk === "number")
      return chunk - OP_INT_BASE2 >= 1 && chunk - OP_INT_BASE2 <= 16;
    else return Number.isInteger(decode3(chunk));
  }
  function p2ms(a, opts) {
    if (!a.input && !a.output && !(a.pubkeys && a.m !== void 0) && !a.signatures)
      throw new TypeError("Not enough data");
    opts = Object.assign({ validate: true }, opts || {});
    function isAcceptableSignature(x) {
      return isCanonicalScriptSignature(x) || (opts.allowIncomplete && x === OPS2.OP_0) !== void 0;
    }
    parse(
      partial(
        object({
          network: object({}),
          m: number(),
          n: number(),
          output: BufferSchema,
          pubkeys: array(custom(isPoint), "Received invalid pubkey"),
          signatures: array(
            custom(isAcceptableSignature),
            "Expected signature to be of type isAcceptableSignature"
          ),
          input: BufferSchema
        })
      ),
      a
    );
    const network = a.network || bitcoin;
    const o = { network };
    let chunks = [];
    let decoded = false;
    function decode19(output) {
      if (decoded) return;
      decoded = true;
      chunks = decompile(output);
      if (chunks.length < 3) throw new TypeError("Output is invalid");
      o.m = decodeSmallOrScriptNum(chunks[0]);
      o.n = decodeSmallOrScriptNum(chunks[chunks.length - 2]);
      o.pubkeys = chunks.slice(1, -2);
    }
    prop(o, "output", () => {
      if (!a.m) return;
      if (!o.n) return;
      if (!a.pubkeys) return;
      return compile(
        [].concat(
          encodeSmallOrScriptNum(a.m),
          a.pubkeys,
          encodeSmallOrScriptNum(o.n),
          OPS2.OP_CHECKMULTISIG
        )
      );
    });
    prop(o, "m", () => {
      if (!o.output) return;
      decode19(o.output);
      return o.m;
    });
    prop(o, "n", () => {
      if (!o.pubkeys) return;
      return o.pubkeys.length;
    });
    prop(o, "pubkeys", () => {
      if (!a.output) return;
      decode19(a.output);
      return o.pubkeys;
    });
    prop(o, "signatures", () => {
      if (!a.input) return;
      return decompile(a.input).slice(1);
    });
    prop(o, "input", () => {
      if (!a.signatures) return;
      return compile([OPS2.OP_0].concat(a.signatures));
    });
    prop(o, "witness", () => {
      if (!o.input) return;
      return [];
    });
    prop(o, "name", () => {
      if (!o.m || !o.n) return;
      return `p2ms(${o.m} of ${o.n})`;
    });
    if (opts.validate) {
      if (a.output) {
        decode19(a.output);
        if (!isSmallOrScriptNum(chunks[0]))
          throw new TypeError("Output is invalid");
        if (!isSmallOrScriptNum(chunks[chunks.length - 2]))
          throw new TypeError("Output is invalid");
        if (chunks[chunks.length - 1] !== OPS2.OP_CHECKMULTISIG)
          throw new TypeError("Output is invalid");
        if (o.m <= 0 || o.n > 20 || o.m > o.n || o.n !== chunks.length - 3)
          throw new TypeError("Output is invalid");
        if (!o.pubkeys.every((x) => isPoint(x)))
          throw new TypeError("Output is invalid");
        if (a.m !== void 0 && a.m !== o.m) throw new TypeError("m mismatch");
        if (a.n !== void 0 && a.n !== o.n) throw new TypeError("n mismatch");
        if (a.pubkeys && !stacksEqual(a.pubkeys, o.pubkeys))
          throw new TypeError("Pubkeys mismatch");
      }
      if (a.pubkeys) {
        if (a.n !== void 0 && a.n !== a.pubkeys.length)
          throw new TypeError("Pubkey count mismatch");
        o.n = a.pubkeys.length;
        if (o.n < o.m) throw new TypeError("Pubkey count cannot be less than m");
      }
      if (a.signatures) {
        if (a.signatures.length < o.m)
          throw new TypeError("Not enough signatures provided");
        if (a.signatures.length > o.m)
          throw new TypeError("Too many signatures provided");
      }
      if (a.input) {
        if (a.input[0] !== OPS2.OP_0) throw new TypeError("Input is invalid");
        if (o.signatures.length === 0 || !o.signatures.every(isAcceptableSignature))
          throw new TypeError("Input has invalid signature(s)");
        if (a.signatures && !stacksEqual(a.signatures, o.signatures))
          throw new TypeError("Signature mismatch");
        if (a.m !== void 0 && a.m !== a.signatures.length)
          throw new TypeError("Signature count mismatch");
      }
    }
    return Object.assign(o, a);
  }

  // node_modules/bitcoinjs-lib/src/esm/payments/p2pk.js
  var OPS3 = OPS;
  function p2pk(a, opts) {
    if (!a.input && !a.output && !a.pubkey && !a.input && !a.signature)
      throw new TypeError("Not enough data");
    opts = Object.assign({ validate: true }, opts || {});
    parse(
      partial(
        object({
          network: object({}),
          output: BufferSchema,
          pubkey: custom(isPoint, "invalid pubkey"),
          signature: custom(
            isCanonicalScriptSignature,
            "Expected signature to be of type isCanonicalScriptSignature"
          ),
          input: BufferSchema
        })
      ),
      a
    );
    const _chunks = value(() => {
      return decompile(a.input);
    });
    const network = a.network || bitcoin;
    const o = { name: "p2pk", network };
    prop(o, "output", () => {
      if (!a.pubkey) return;
      return compile([a.pubkey, OPS3.OP_CHECKSIG]);
    });
    prop(o, "pubkey", () => {
      if (!a.output) return;
      return a.output.slice(1, -1);
    });
    prop(o, "signature", () => {
      if (!a.input) return;
      return _chunks()[0];
    });
    prop(o, "input", () => {
      if (!a.signature) return;
      return compile([a.signature]);
    });
    prop(o, "witness", () => {
      if (!o.input) return;
      return [];
    });
    if (opts.validate) {
      if (a.output) {
        if (a.output[a.output.length - 1] !== OPS3.OP_CHECKSIG)
          throw new TypeError("Output is invalid");
        if (!isPoint(o.pubkey)) throw new TypeError("Output pubkey is invalid");
        if (a.pubkey && compare(a.pubkey, o.pubkey) !== 0)
          throw new TypeError("Pubkey mismatch");
      }
      if (a.signature) {
        if (a.input && compare(a.input, o.input) !== 0)
          throw new TypeError("Signature mismatch");
      }
      if (a.input) {
        if (_chunks().length !== 1) throw new TypeError("Input is invalid");
        if (!isCanonicalScriptSignature(o.signature))
          throw new TypeError("Input has invalid signature");
      }
    }
    return Object.assign(o, a);
  }

  // node_modules/@noble/hashes/esm/utils.js
  function isBytes(a) {
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
  }
  function abytes(b, ...lengths) {
    if (!isBytes(b))
      throw new Error("Uint8Array expected");
    if (lengths.length > 0 && !lengths.includes(b.length))
      throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
  }
  function aexists(instance2, checkFinished = true) {
    if (instance2.destroyed)
      throw new Error("Hash instance has been destroyed");
    if (checkFinished && instance2.finished)
      throw new Error("Hash#digest() has already been called");
  }
  function aoutput(out, instance2) {
    abytes(out);
    const min = instance2.outputLen;
    if (out.length < min) {
      throw new Error("digestInto() expects output buffer of length at least " + min);
    }
  }
  function clean(...arrays) {
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
      throw new Error("string expected");
    return new Uint8Array(new TextEncoder().encode(str));
  }
  function toBytes(data) {
    if (typeof data === "string")
      data = utf8ToBytes(data);
    abytes(data);
    return data;
  }
  var Hash = class {
  };
  function createHasher(hashCons) {
    const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
    const tmp = hashCons();
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = () => hashCons();
    return hashC;
  }

  // node_modules/@noble/hashes/esm/_md.js
  function setBigUint64(view, byteOffset, value2, isLE) {
    if (typeof view.setBigUint64 === "function")
      return view.setBigUint64(byteOffset, value2, isLE);
    const _32n = BigInt(32);
    const _u32_max = BigInt(4294967295);
    const wh = Number(value2 >> _32n & _u32_max);
    const wl = Number(value2 & _u32_max);
    const h = isLE ? 4 : 0;
    const l = isLE ? 0 : 4;
    view.setUint32(byteOffset + h, wh, isLE);
    view.setUint32(byteOffset + l, wl, isLE);
  }
  function Chi(a, b, c) {
    return a & b ^ ~a & c;
  }
  function Maj(a, b, c) {
    return a & b ^ a & c ^ b & c;
  }
  var HashMD = class extends Hash {
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
      for (let pos = 0; pos < len; ) {
        const take = Math.min(blockLen - this.pos, len - pos);
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
      const { buffer, view, blockLen, isLE } = this;
      let { pos } = this;
      buffer[pos++] = 128;
      clean(this.buffer.subarray(pos));
      if (this.padOffset > blockLen - pos) {
        this.process(view, 0);
        pos = 0;
      }
      for (let i = pos; i < blockLen; i++)
        buffer[i] = 0;
      setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
      this.process(view, 0);
      const oview = createView(out);
      const len = this.outputLen;
      if (len % 4)
        throw new Error("_sha2: outputLen should be aligned to 32bit");
      const outLen = len / 4;
      const state = this.get();
      if (outLen > state.length)
        throw new Error("_sha2: outputLen bigger than state");
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
      const { blockLen, buffer, length: length2, finished, destroyed, pos } = this;
      to.destroyed = destroyed;
      to.finished = finished;
      to.length = length2;
      to.pos = pos;
      if (length2 % blockLen)
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

  // node_modules/@noble/hashes/esm/legacy.js
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
    const L = [Id160];
    const R = [Pi160];
    const res = [L, R];
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
  var RIPEMD160 = class extends HashMD {
    constructor() {
      super(64, 20, 8, true);
      this.h0 = 1732584193 | 0;
      this.h1 = 4023233417 | 0;
      this.h2 = 2562383102 | 0;
      this.h3 = 271733878 | 0;
      this.h4 = 3285377520 | 0;
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
      clean(BUF_160);
    }
    destroy() {
      this.destroyed = true;
      clean(this.buffer);
      this.set(0, 0, 0, 0, 0);
    }
  };
  var ripemd160 = /* @__PURE__ */ createHasher(() => new RIPEMD160());

  // node_modules/@noble/hashes/esm/ripemd160.js
  var ripemd1602 = ripemd160;

  // node_modules/@noble/hashes/esm/sha2.js
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
  var SHA256 = class extends HashMD {
    constructor(outputLen = 32) {
      super(64, outputLen, 8, false);
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
      for (let i = 0; i < 16; i++, offset += 4)
        SHA256_W[i] = view.getUint32(offset, false);
      for (let i = 16; i < 64; i++) {
        const W15 = SHA256_W[i - 15];
        const W2 = SHA256_W[i - 2];
        const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
        const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
        SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
      }
      let { A, B, C, D, E, F, G, H } = this;
      for (let i = 0; i < 64; i++) {
        const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
        const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
        const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
        const T2 = sigma0 + Maj(A, B, C) | 0;
        H = G;
        G = F;
        F = E;
        E = D + T1 | 0;
        D = C;
        C = B;
        B = A;
        A = T1 + T2 | 0;
      }
      A = A + this.A | 0;
      B = B + this.B | 0;
      C = C + this.C | 0;
      D = D + this.D | 0;
      E = E + this.E | 0;
      F = F + this.F | 0;
      G = G + this.G | 0;
      H = H + this.H | 0;
      this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
      clean(SHA256_W);
    }
    destroy() {
      this.set(0, 0, 0, 0, 0, 0, 0, 0);
      clean(this.buffer);
    }
  };
  var sha256 = /* @__PURE__ */ createHasher(() => new SHA256());

  // node_modules/@noble/hashes/esm/sha256.js
  var sha2562 = sha256;

  // node_modules/bitcoinjs-lib/src/esm/crypto.js
  function hash160(buffer) {
    return ripemd1602(sha2562(buffer));
  }
  function hash256(buffer) {
    return sha2562(sha2562(buffer));
  }
  var TAGGED_HASH_PREFIXES = {
    "BIP0340/challenge": Uint8Array.from([
      123,
      181,
      45,
      122,
      159,
      239,
      88,
      50,
      62,
      177,
      191,
      122,
      64,
      125,
      179,
      130,
      210,
      243,
      242,
      216,
      27,
      177,
      34,
      79,
      73,
      254,
      81,
      143,
      109,
      72,
      211,
      124,
      123,
      181,
      45,
      122,
      159,
      239,
      88,
      50,
      62,
      177,
      191,
      122,
      64,
      125,
      179,
      130,
      210,
      243,
      242,
      216,
      27,
      177,
      34,
      79,
      73,
      254,
      81,
      143,
      109,
      72,
      211,
      124
    ]),
    "BIP0340/aux": Uint8Array.from([
      241,
      239,
      78,
      94,
      192,
      99,
      202,
      218,
      109,
      148,
      202,
      250,
      157,
      152,
      126,
      160,
      105,
      38,
      88,
      57,
      236,
      193,
      31,
      151,
      45,
      119,
      165,
      46,
      216,
      193,
      204,
      144,
      241,
      239,
      78,
      94,
      192,
      99,
      202,
      218,
      109,
      148,
      202,
      250,
      157,
      152,
      126,
      160,
      105,
      38,
      88,
      57,
      236,
      193,
      31,
      151,
      45,
      119,
      165,
      46,
      216,
      193,
      204,
      144
    ]),
    "BIP0340/nonce": Uint8Array.from([
      7,
      73,
      119,
      52,
      167,
      155,
      203,
      53,
      91,
      155,
      140,
      125,
      3,
      79,
      18,
      28,
      244,
      52,
      215,
      62,
      247,
      45,
      218,
      25,
      135,
      0,
      97,
      251,
      82,
      191,
      235,
      47,
      7,
      73,
      119,
      52,
      167,
      155,
      203,
      53,
      91,
      155,
      140,
      125,
      3,
      79,
      18,
      28,
      244,
      52,
      215,
      62,
      247,
      45,
      218,
      25,
      135,
      0,
      97,
      251,
      82,
      191,
      235,
      47
    ]),
    TapLeaf: Uint8Array.from([
      174,
      234,
      143,
      220,
      66,
      8,
      152,
      49,
      5,
      115,
      75,
      88,
      8,
      29,
      30,
      38,
      56,
      211,
      95,
      28,
      181,
      64,
      8,
      212,
      211,
      87,
      202,
      3,
      190,
      120,
      233,
      238,
      174,
      234,
      143,
      220,
      66,
      8,
      152,
      49,
      5,
      115,
      75,
      88,
      8,
      29,
      30,
      38,
      56,
      211,
      95,
      28,
      181,
      64,
      8,
      212,
      211,
      87,
      202,
      3,
      190,
      120,
      233,
      238
    ]),
    TapBranch: Uint8Array.from([
      25,
      65,
      161,
      242,
      229,
      110,
      185,
      95,
      162,
      169,
      241,
      148,
      190,
      92,
      1,
      247,
      33,
      111,
      51,
      237,
      130,
      176,
      145,
      70,
      52,
      144,
      208,
      91,
      245,
      22,
      160,
      21,
      25,
      65,
      161,
      242,
      229,
      110,
      185,
      95,
      162,
      169,
      241,
      148,
      190,
      92,
      1,
      247,
      33,
      111,
      51,
      237,
      130,
      176,
      145,
      70,
      52,
      144,
      208,
      91,
      245,
      22,
      160,
      21
    ]),
    TapSighash: Uint8Array.from([
      244,
      10,
      72,
      223,
      75,
      42,
      112,
      200,
      180,
      146,
      75,
      242,
      101,
      70,
      97,
      237,
      61,
      149,
      253,
      102,
      163,
      19,
      235,
      135,
      35,
      117,
      151,
      198,
      40,
      228,
      160,
      49,
      244,
      10,
      72,
      223,
      75,
      42,
      112,
      200,
      180,
      146,
      75,
      242,
      101,
      70,
      97,
      237,
      61,
      149,
      253,
      102,
      163,
      19,
      235,
      135,
      35,
      117,
      151,
      198,
      40,
      228,
      160,
      49
    ]),
    TapTweak: Uint8Array.from([
      232,
      15,
      225,
      99,
      156,
      156,
      160,
      80,
      227,
      175,
      27,
      57,
      193,
      67,
      198,
      62,
      66,
      156,
      188,
      235,
      21,
      217,
      64,
      251,
      181,
      197,
      161,
      244,
      175,
      87,
      197,
      233,
      232,
      15,
      225,
      99,
      156,
      156,
      160,
      80,
      227,
      175,
      27,
      57,
      193,
      67,
      198,
      62,
      66,
      156,
      188,
      235,
      21,
      217,
      64,
      251,
      181,
      197,
      161,
      244,
      175,
      87,
      197,
      233
    ]),
    "KeyAgg list": Uint8Array.from([
      72,
      28,
      151,
      28,
      60,
      11,
      70,
      215,
      240,
      178,
      117,
      174,
      89,
      141,
      78,
      44,
      126,
      215,
      49,
      156,
      89,
      74,
      92,
      110,
      199,
      158,
      160,
      212,
      153,
      2,
      148,
      240,
      72,
      28,
      151,
      28,
      60,
      11,
      70,
      215,
      240,
      178,
      117,
      174,
      89,
      141,
      78,
      44,
      126,
      215,
      49,
      156,
      89,
      74,
      92,
      110,
      199,
      158,
      160,
      212,
      153,
      2,
      148,
      240
    ]),
    "KeyAgg coefficient": Uint8Array.from([
      191,
      201,
      4,
      3,
      77,
      28,
      136,
      232,
      200,
      14,
      34,
      229,
      61,
      36,
      86,
      109,
      100,
      130,
      78,
      214,
      66,
      114,
      129,
      192,
      145,
      0,
      249,
      77,
      205,
      82,
      201,
      129,
      191,
      201,
      4,
      3,
      77,
      28,
      136,
      232,
      200,
      14,
      34,
      229,
      61,
      36,
      86,
      109,
      100,
      130,
      78,
      214,
      66,
      114,
      129,
      192,
      145,
      0,
      249,
      77,
      205,
      82,
      201,
      129
    ])
  };
  function taggedHash(prefix, data) {
    return sha2562(concat([TAGGED_HASH_PREFIXES[prefix], data]));
  }

  // node_modules/bitcoinjs-lib/node_modules/base-x/src/esm/index.js
  function base(ALPHABET2) {
    if (ALPHABET2.length >= 255) {
      throw new TypeError("Alphabet too long");
    }
    const BASE_MAP = new Uint8Array(256);
    for (let j = 0; j < BASE_MAP.length; j++) {
      BASE_MAP[j] = 255;
    }
    for (let i = 0; i < ALPHABET2.length; i++) {
      const x = ALPHABET2.charAt(i);
      const xc = x.charCodeAt(0);
      if (BASE_MAP[xc] !== 255) {
        throw new TypeError(x + " is ambiguous");
      }
      BASE_MAP[xc] = i;
    }
    const BASE = ALPHABET2.length;
    const LEADER = ALPHABET2.charAt(0);
    const FACTOR = Math.log(BASE) / Math.log(256);
    const iFACTOR = Math.log(256) / Math.log(BASE);
    function encode20(source) {
      if (source instanceof Uint8Array) {
      } else if (ArrayBuffer.isView(source)) {
        source = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
      } else if (Array.isArray(source)) {
        source = Uint8Array.from(source);
      }
      if (!(source instanceof Uint8Array)) {
        throw new TypeError("Expected Uint8Array");
      }
      if (source.length === 0) {
        return "";
      }
      let zeroes = 0;
      let length2 = 0;
      let pbegin = 0;
      const pend = source.length;
      while (pbegin !== pend && source[pbegin] === 0) {
        pbegin++;
        zeroes++;
      }
      const size = (pend - pbegin) * iFACTOR + 1 >>> 0;
      const b58 = new Uint8Array(size);
      while (pbegin !== pend) {
        let carry = source[pbegin];
        let i = 0;
        for (let it1 = size - 1; (carry !== 0 || i < length2) && it1 !== -1; it1--, i++) {
          carry += 256 * b58[it1] >>> 0;
          b58[it1] = carry % BASE >>> 0;
          carry = carry / BASE >>> 0;
        }
        if (carry !== 0) {
          throw new Error("Non-zero carry");
        }
        length2 = i;
        pbegin++;
      }
      let it2 = size - length2;
      while (it2 !== size && b58[it2] === 0) {
        it2++;
      }
      let str = LEADER.repeat(zeroes);
      for (; it2 < size; ++it2) {
        str += ALPHABET2.charAt(b58[it2]);
      }
      return str;
    }
    function decodeUnsafe(source) {
      if (typeof source !== "string") {
        throw new TypeError("Expected String");
      }
      if (source.length === 0) {
        return new Uint8Array();
      }
      let psz = 0;
      let zeroes = 0;
      let length2 = 0;
      while (source[psz] === LEADER) {
        zeroes++;
        psz++;
      }
      const size = (source.length - psz) * FACTOR + 1 >>> 0;
      const b256 = new Uint8Array(size);
      while (psz < source.length) {
        const charCode = source.charCodeAt(psz);
        if (charCode > 255) {
          return;
        }
        let carry = BASE_MAP[charCode];
        if (carry === 255) {
          return;
        }
        let i = 0;
        for (let it3 = size - 1; (carry !== 0 || i < length2) && it3 !== -1; it3--, i++) {
          carry += BASE * b256[it3] >>> 0;
          b256[it3] = carry % 256 >>> 0;
          carry = carry / 256 >>> 0;
        }
        if (carry !== 0) {
          throw new Error("Non-zero carry");
        }
        length2 = i;
        psz++;
      }
      let it4 = size - length2;
      while (it4 !== size && b256[it4] === 0) {
        it4++;
      }
      const vch = new Uint8Array(zeroes + (size - it4));
      let j = zeroes;
      while (it4 !== size) {
        vch[j++] = b256[it4++];
      }
      return vch;
    }
    function decode19(string2) {
      const buffer = decodeUnsafe(string2);
      if (buffer) {
        return buffer;
      }
      throw new Error("Non-base" + BASE + " character");
    }
    return {
      encode: encode20,
      decodeUnsafe,
      decode: decode19
    };
  }
  var esm_default = base;

  // node_modules/bitcoinjs-lib/node_modules/bs58/src/esm/index.js
  var ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  var esm_default2 = esm_default(ALPHABET);

  // node_modules/bitcoinjs-lib/node_modules/bs58check/src/esm/base.js
  function base_default(checksumFn) {
    function encode20(payload) {
      var payloadU8 = Uint8Array.from(payload);
      var checksum = checksumFn(payloadU8);
      var length2 = payloadU8.length + 4;
      var both = new Uint8Array(length2);
      both.set(payloadU8, 0);
      both.set(checksum.subarray(0, 4), payloadU8.length);
      return esm_default2.encode(both);
    }
    function decodeRaw(buffer) {
      var payload = buffer.slice(0, -4);
      var checksum = buffer.slice(-4);
      var newChecksum = checksumFn(payload);
      if (checksum[0] ^ newChecksum[0] | checksum[1] ^ newChecksum[1] | checksum[2] ^ newChecksum[2] | checksum[3] ^ newChecksum[3])
        return;
      return payload;
    }
    function decodeUnsafe(str) {
      var buffer = esm_default2.decodeUnsafe(str);
      if (buffer == null)
        return;
      return decodeRaw(buffer);
    }
    function decode19(str) {
      var buffer = esm_default2.decode(str);
      var payload = decodeRaw(buffer);
      if (payload == null)
        throw new Error("Invalid checksum");
      return payload;
    }
    return {
      encode: encode20,
      decode: decode19,
      decodeUnsafe
    };
  }

  // node_modules/bitcoinjs-lib/node_modules/bs58check/src/esm/index.js
  function sha256x2(buffer) {
    return sha2562(sha2562(buffer));
  }
  var esm_default3 = base_default(sha256x2);

  // node_modules/bitcoinjs-lib/src/esm/payments/p2pkh.js
  var OPS4 = OPS;
  function p2pkh(a, opts) {
    if (!a.address && !a.hash && !a.output && !a.pubkey && !a.input)
      throw new TypeError("Not enough data");
    opts = Object.assign({ validate: true }, opts || {});
    parse(
      partial(
        object({
          network: object({}),
          address: string(),
          hash: Hash160bitSchema,
          output: NBufferSchemaFactory(25),
          pubkey: custom(isPoint),
          signature: custom(isCanonicalScriptSignature),
          input: BufferSchema
        })
      ),
      a
    );
    const _address = value(() => {
      const payload = esm_default3.decode(a.address);
      const version = readUInt8(payload, 0);
      const hash = payload.slice(1);
      return { version, hash };
    });
    const _chunks = value(() => {
      return decompile(a.input);
    });
    const network = a.network || bitcoin;
    const o = { name: "p2pkh", network };
    prop(o, "address", () => {
      if (!o.hash) return;
      const payload = new Uint8Array(21);
      writeUInt8(payload, 0, network.pubKeyHash);
      payload.set(o.hash, 1);
      return esm_default3.encode(payload);
    });
    prop(o, "hash", () => {
      if (a.output) return a.output.slice(3, 23);
      if (a.address) return _address().hash;
      if (a.pubkey || o.pubkey) return hash160(a.pubkey || o.pubkey);
    });
    prop(o, "output", () => {
      if (!o.hash) return;
      return compile([
        OPS4.OP_DUP,
        OPS4.OP_HASH160,
        o.hash,
        OPS4.OP_EQUALVERIFY,
        OPS4.OP_CHECKSIG
      ]);
    });
    prop(o, "pubkey", () => {
      if (!a.input) return;
      return _chunks()[1];
    });
    prop(o, "signature", () => {
      if (!a.input) return;
      return _chunks()[0];
    });
    prop(o, "input", () => {
      if (!a.pubkey) return;
      if (!a.signature) return;
      return compile([a.signature, a.pubkey]);
    });
    prop(o, "witness", () => {
      if (!o.input) return;
      return [];
    });
    if (opts.validate) {
      let hash = Uint8Array.from([]);
      if (a.address) {
        if (_address().version !== network.pubKeyHash)
          throw new TypeError("Invalid version or Network mismatch");
        if (_address().hash.length !== 20) throw new TypeError("Invalid address");
        hash = _address().hash;
      }
      if (a.hash) {
        if (hash.length > 0 && compare(hash, a.hash) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = a.hash;
      }
      if (a.output) {
        if (a.output.length !== 25 || a.output[0] !== OPS4.OP_DUP || a.output[1] !== OPS4.OP_HASH160 || a.output[2] !== 20 || a.output[23] !== OPS4.OP_EQUALVERIFY || a.output[24] !== OPS4.OP_CHECKSIG)
          throw new TypeError("Output is invalid");
        const hash2 = a.output.slice(3, 23);
        if (hash.length > 0 && compare(hash, hash2) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = hash2;
      }
      if (a.pubkey) {
        const pkh = hash160(a.pubkey);
        if (hash.length > 0 && compare(hash, pkh) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = pkh;
      }
      if (a.input) {
        const chunks = _chunks();
        if (chunks.length !== 2) throw new TypeError("Input is invalid");
        if (!isCanonicalScriptSignature(chunks[0]))
          throw new TypeError("Input has invalid signature");
        if (!isPoint(chunks[1])) throw new TypeError("Input has invalid pubkey");
        if (a.signature && compare(a.signature, chunks[0]) !== 0)
          throw new TypeError("Signature mismatch");
        if (a.pubkey && compare(a.pubkey, chunks[1]) !== 0)
          throw new TypeError("Pubkey mismatch");
        const pkh = hash160(chunks[1]);
        if (hash.length > 0 && compare(hash, pkh) !== 0)
          throw new TypeError("Hash mismatch");
      }
    }
    return Object.assign(o, a);
  }

  // node_modules/bitcoinjs-lib/src/esm/payments/p2sh.js
  var OPS5 = OPS;
  function p2sh(a, opts) {
    if (!a.address && !a.hash && !a.output && !a.redeem && !a.input)
      throw new TypeError("Not enough data");
    opts = Object.assign({ validate: true }, opts || {});
    parse(
      partial(
        object({
          network: object({}),
          address: string(),
          hash: NBufferSchemaFactory(20),
          output: NBufferSchemaFactory(23),
          redeem: partial(
            object({
              network: object({}),
              output: BufferSchema,
              input: BufferSchema,
              witness: array(BufferSchema)
            })
          ),
          input: BufferSchema,
          witness: array(BufferSchema)
        })
      ),
      a
    );
    let network = a.network;
    if (!network) {
      network = a.redeem && a.redeem.network || bitcoin;
    }
    const o = { network };
    const _address = value(() => {
      const payload = esm_default3.decode(a.address);
      const version = readUInt8(payload, 0);
      const hash = payload.slice(1);
      return { version, hash };
    });
    const _chunks = value(() => {
      return decompile(a.input);
    });
    const _redeem = value(() => {
      const chunks = _chunks();
      const lastChunk = chunks[chunks.length - 1];
      return {
        network,
        output: lastChunk === OPS5.OP_FALSE ? Uint8Array.from([]) : lastChunk,
        input: compile(chunks.slice(0, -1)),
        witness: a.witness || []
      };
    });
    prop(o, "address", () => {
      if (!o.hash) return;
      const payload = new Uint8Array(21);
      writeUInt8(payload, 0, o.network.scriptHash);
      payload.set(o.hash, 1);
      return esm_default3.encode(payload);
    });
    prop(o, "hash", () => {
      if (a.output) return a.output.slice(2, 22);
      if (a.address) return _address().hash;
      if (o.redeem && o.redeem.output) return hash160(o.redeem.output);
    });
    prop(o, "output", () => {
      if (!o.hash) return;
      return compile([OPS5.OP_HASH160, o.hash, OPS5.OP_EQUAL]);
    });
    prop(o, "redeem", () => {
      if (!a.input) return;
      return _redeem();
    });
    prop(o, "input", () => {
      if (!a.redeem || !a.redeem.input || !a.redeem.output) return;
      return compile(
        [].concat(decompile(a.redeem.input), a.redeem.output)
      );
    });
    prop(o, "witness", () => {
      if (o.redeem && o.redeem.witness) return o.redeem.witness;
      if (o.input) return [];
    });
    prop(o, "name", () => {
      const nameParts = ["p2sh"];
      if (o.redeem !== void 0 && o.redeem.name !== void 0)
        nameParts.push(o.redeem.name);
      return nameParts.join("-");
    });
    if (opts.validate) {
      let hash = Uint8Array.from([]);
      if (a.address) {
        if (_address().version !== network.scriptHash)
          throw new TypeError("Invalid version or Network mismatch");
        if (_address().hash.length !== 20) throw new TypeError("Invalid address");
        hash = _address().hash;
      }
      if (a.hash) {
        if (hash.length > 0 && compare(hash, a.hash) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = a.hash;
      }
      if (a.output) {
        if (a.output.length !== 23 || a.output[0] !== OPS5.OP_HASH160 || a.output[1] !== 20 || a.output[22] !== OPS5.OP_EQUAL)
          throw new TypeError("Output is invalid");
        const hash2 = a.output.slice(2, 22);
        if (hash.length > 0 && compare(hash, hash2) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = hash2;
      }
      const checkRedeem = (redeem) => {
        if (redeem.output) {
          const decompile2 = decompile(redeem.output);
          if (!decompile2 || decompile2.length < 1)
            throw new TypeError("Redeem.output too short");
          if (redeem.output.byteLength > 520)
            throw new TypeError(
              "Redeem.output unspendable if larger than 520 bytes"
            );
          if (countNonPushOnlyOPs(decompile2) > 201)
            throw new TypeError(
              "Redeem.output unspendable with more than 201 non-push ops"
            );
          const hash2 = hash160(redeem.output);
          if (hash.length > 0 && compare(hash, hash2) !== 0)
            throw new TypeError("Hash mismatch");
          else hash = hash2;
        }
        if (redeem.input) {
          const hasInput = redeem.input.length > 0;
          const hasWitness = redeem.witness && redeem.witness.length > 0;
          if (!hasInput && !hasWitness) throw new TypeError("Empty input");
          if (hasInput && hasWitness)
            throw new TypeError("Input and witness provided");
          if (hasInput) {
            const richunks = decompile(redeem.input);
            if (!isPushOnly(richunks))
              throw new TypeError("Non push-only scriptSig");
          }
        }
      };
      if (a.input) {
        const chunks = _chunks();
        if (!chunks || chunks.length < 1) throw new TypeError("Input too short");
        if (!(_redeem().output instanceof Uint8Array))
          throw new TypeError("Input is invalid");
        checkRedeem(_redeem());
      }
      if (a.redeem) {
        if (a.redeem.network && a.redeem.network !== network)
          throw new TypeError("Network mismatch");
        if (a.input) {
          const redeem = _redeem();
          if (a.redeem.output && compare(a.redeem.output, redeem.output) !== 0)
            throw new TypeError("Redeem.output mismatch");
          if (a.redeem.input && compare(a.redeem.input, redeem.input) !== 0)
            throw new TypeError("Redeem.input mismatch");
        }
        checkRedeem(a.redeem);
      }
      if (a.witness) {
        if (a.redeem && a.redeem.witness && !stacksEqual(a.redeem.witness, a.witness))
          throw new TypeError("Witness and redeem.witness mismatch");
      }
    }
    return Object.assign(o, a);
  }

  // node_modules/bitcoinjs-lib/src/esm/payments/p2wpkh.js
  var import_bech32 = __toESM(require_dist(), 1);
  var OPS6 = OPS;
  var EMPTY_BUFFER = new Uint8Array(0);
  function p2wpkh(a, opts) {
    if (!a.address && !a.hash && !a.output && !a.pubkey && !a.witness)
      throw new TypeError("Not enough data");
    opts = Object.assign({ validate: true }, opts || {});
    parse(
      partial(
        object({
          address: string(),
          hash: NBufferSchemaFactory(20),
          input: NBufferSchemaFactory(0),
          network: object({}),
          output: NBufferSchemaFactory(22),
          pubkey: custom(isPoint, "Not a valid pubkey"),
          signature: custom(isCanonicalScriptSignature),
          witness: array(BufferSchema)
        })
      ),
      a
    );
    const _address = value(() => {
      const result = import_bech32.bech32.decode(a.address);
      const version = result.words.shift();
      const data = import_bech32.bech32.fromWords(result.words);
      return {
        version,
        prefix: result.prefix,
        data: Uint8Array.from(data)
      };
    });
    const network = a.network || bitcoin;
    const o = { name: "p2wpkh", network };
    prop(o, "address", () => {
      if (!o.hash) return;
      const words = import_bech32.bech32.toWords(o.hash);
      words.unshift(0);
      return import_bech32.bech32.encode(network.bech32, words);
    });
    prop(o, "hash", () => {
      if (a.output) return a.output.slice(2, 22);
      if (a.address) return _address().data;
      if (a.pubkey || o.pubkey) return hash160(a.pubkey || o.pubkey);
    });
    prop(o, "output", () => {
      if (!o.hash) return;
      return compile([OPS6.OP_0, o.hash]);
    });
    prop(o, "pubkey", () => {
      if (a.pubkey) return a.pubkey;
      if (!a.witness) return;
      return a.witness[1];
    });
    prop(o, "signature", () => {
      if (!a.witness) return;
      return a.witness[0];
    });
    prop(o, "input", () => {
      if (!o.witness) return;
      return EMPTY_BUFFER;
    });
    prop(o, "witness", () => {
      if (!a.pubkey) return;
      if (!a.signature) return;
      return [a.signature, a.pubkey];
    });
    if (opts.validate) {
      let hash = Uint8Array.from([]);
      if (a.address) {
        if (network && network.bech32 !== _address().prefix)
          throw new TypeError("Invalid prefix or Network mismatch");
        if (_address().version !== 0)
          throw new TypeError("Invalid address version");
        if (_address().data.length !== 20)
          throw new TypeError("Invalid address data");
        hash = _address().data;
      }
      if (a.hash) {
        if (hash.length > 0 && compare(hash, a.hash) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = a.hash;
      }
      if (a.output) {
        if (a.output.length !== 22 || a.output[0] !== OPS6.OP_0 || a.output[1] !== 20)
          throw new TypeError("Output is invalid");
        if (hash.length > 0 && compare(hash, a.output.slice(2)) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = a.output.slice(2);
      }
      if (a.pubkey) {
        const pkh = hash160(a.pubkey);
        if (hash.length > 0 && compare(hash, pkh) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = pkh;
        if (!isPoint(a.pubkey) || a.pubkey.length !== 33)
          throw new TypeError("Invalid pubkey for p2wpkh");
      }
      if (a.witness) {
        if (a.witness.length !== 2) throw new TypeError("Witness is invalid");
        if (!isCanonicalScriptSignature(a.witness[0]))
          throw new TypeError("Witness has invalid signature");
        if (!isPoint(a.witness[1]) || a.witness[1].length !== 33)
          throw new TypeError("Witness has invalid pubkey");
        if (a.signature && compare(a.signature, a.witness[0]) !== 0)
          throw new TypeError("Signature mismatch");
        if (a.pubkey && compare(a.pubkey, a.witness[1]) !== 0)
          throw new TypeError("Pubkey mismatch");
        const pkh = hash160(a.witness[1]);
        if (hash.length > 0 && compare(hash, pkh) !== 0)
          throw new TypeError("Hash mismatch");
      }
    }
    return Object.assign(o, a);
  }

  // node_modules/bitcoinjs-lib/src/esm/payments/p2wsh.js
  var import_bech322 = __toESM(require_dist(), 1);
  var OPS7 = OPS;
  var EMPTY_BUFFER2 = new Uint8Array(0);
  function chunkHasUncompressedPubkey(chunk) {
    if (chunk instanceof Uint8Array && chunk.length === 65 && chunk[0] === 4 && isPoint(chunk)) {
      return true;
    } else {
      return false;
    }
  }
  function p2wsh(a, opts) {
    if (!a.address && !a.hash && !a.output && !a.redeem && !a.witness)
      throw new TypeError("Not enough data");
    opts = Object.assign({ validate: true }, opts || {});
    parse(
      NullablePartial({
        network: object({}),
        address: string(),
        hash: Buffer256bitSchema,
        output: NBufferSchemaFactory(34),
        redeem: NullablePartial({
          input: BufferSchema,
          network: object({}),
          output: BufferSchema,
          witness: array(BufferSchema)
        }),
        input: NBufferSchemaFactory(0),
        witness: array(BufferSchema)
      }),
      a
    );
    const _address = value(() => {
      const result = import_bech322.bech32.decode(a.address);
      const version = result.words.shift();
      const data = import_bech322.bech32.fromWords(result.words);
      return {
        version,
        prefix: result.prefix,
        data: Uint8Array.from(data)
      };
    });
    const _rchunks = value(() => {
      return decompile(a.redeem.input);
    });
    let network = a.network;
    if (!network) {
      network = a.redeem && a.redeem.network || bitcoin;
    }
    const o = { network };
    prop(o, "address", () => {
      if (!o.hash) return;
      const words = import_bech322.bech32.toWords(o.hash);
      words.unshift(0);
      return import_bech322.bech32.encode(network.bech32, words);
    });
    prop(o, "hash", () => {
      if (a.output) return a.output.slice(2);
      if (a.address) return _address().data;
      if (o.redeem && o.redeem.output) return sha2562(o.redeem.output);
    });
    prop(o, "output", () => {
      if (!o.hash) return;
      return compile([OPS7.OP_0, o.hash]);
    });
    prop(o, "redeem", () => {
      if (!a.witness) return;
      return {
        output: a.witness[a.witness.length - 1],
        input: EMPTY_BUFFER2,
        witness: a.witness.slice(0, -1)
      };
    });
    prop(o, "input", () => {
      if (!o.witness) return;
      return EMPTY_BUFFER2;
    });
    prop(o, "witness", () => {
      if (a.redeem && a.redeem.input && a.redeem.input.length > 0 && a.redeem.output && a.redeem.output.length > 0) {
        const stack = toStack(_rchunks());
        o.redeem = Object.assign({ witness: stack }, a.redeem);
        o.redeem.input = EMPTY_BUFFER2;
        return [].concat(stack, a.redeem.output);
      }
      if (!a.redeem) return;
      if (!a.redeem.output) return;
      if (!a.redeem.witness) return;
      return [].concat(a.redeem.witness, a.redeem.output);
    });
    prop(o, "name", () => {
      const nameParts = ["p2wsh"];
      if (o.redeem !== void 0 && o.redeem.name !== void 0)
        nameParts.push(o.redeem.name);
      return nameParts.join("-");
    });
    if (opts.validate) {
      let hash = Uint8Array.from([]);
      if (a.address) {
        if (_address().prefix !== network.bech32)
          throw new TypeError("Invalid prefix or Network mismatch");
        if (_address().version !== 0)
          throw new TypeError("Invalid address version");
        if (_address().data.length !== 32)
          throw new TypeError("Invalid address data");
        hash = _address().data;
      }
      if (a.hash) {
        if (hash.length > 0 && compare(hash, a.hash) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = a.hash;
      }
      if (a.output) {
        if (a.output.length !== 34 || a.output[0] !== OPS7.OP_0 || a.output[1] !== 32)
          throw new TypeError("Output is invalid");
        const hash2 = a.output.slice(2);
        if (hash.length > 0 && compare(hash, hash2) !== 0)
          throw new TypeError("Hash mismatch");
        else hash = hash2;
      }
      if (a.redeem) {
        if (a.redeem.network && a.redeem.network !== network)
          throw new TypeError("Network mismatch");
        if (a.redeem.input && a.redeem.input.length > 0 && a.redeem.witness && a.redeem.witness.length > 0)
          throw new TypeError("Ambiguous witness source");
        if (a.redeem.output) {
          const decompile2 = decompile(a.redeem.output);
          if (!decompile2 || decompile2.length < 1)
            throw new TypeError("Redeem.output is invalid");
          if (a.redeem.output.byteLength > 3600)
            throw new TypeError(
              "Redeem.output unspendable if larger than 3600 bytes"
            );
          if (countNonPushOnlyOPs(decompile2) > 201)
            throw new TypeError(
              "Redeem.output unspendable with more than 201 non-push ops"
            );
          const hash2 = sha2562(a.redeem.output);
          if (hash.length > 0 && compare(hash, hash2) !== 0)
            throw new TypeError("Hash mismatch");
          else hash = hash2;
        }
        if (a.redeem.input && !isPushOnly(_rchunks()))
          throw new TypeError("Non push-only scriptSig");
        if (a.witness && a.redeem.witness && !stacksEqual(a.witness, a.redeem.witness))
          throw new TypeError("Witness and redeem.witness mismatch");
        if (a.redeem.input && _rchunks().some(chunkHasUncompressedPubkey) || a.redeem.output && (decompile(a.redeem.output) || []).some(
          chunkHasUncompressedPubkey
        )) {
          throw new TypeError(
            "redeem.input or redeem.output contains uncompressed pubkey"
          );
        }
      }
      if (a.witness && a.witness.length > 0) {
        const wScript = a.witness[a.witness.length - 1];
        if (a.redeem && a.redeem.output && compare(a.redeem.output, wScript) !== 0)
          throw new TypeError("Witness and redeem.output mismatch");
        if (a.witness.some(chunkHasUncompressedPubkey) || (decompile(wScript) || []).some(chunkHasUncompressedPubkey))
          throw new TypeError("Witness contains uncompressed pubkey");
      }
    }
    return Object.assign(o, a);
  }

  // node_modules/bitcoinjs-lib/src/esm/ecc_lib.js
  var _ECCLIB_CACHE = {};
  function getEccLib() {
    if (!_ECCLIB_CACHE.eccLib)
      throw new Error(
        "No ECC Library provided. You must call initEccLib() with a valid TinySecp256k1Interface instance"
      );
    return _ECCLIB_CACHE.eccLib;
  }

  // node_modules/varuint-bitcoin/src/esm/index.js
  var esm_exports = {};
  __export(esm_exports, {
    decode: () => decode5,
    encode: () => encode5,
    encodingLength: () => encodingLength2
  });

  // node_modules/varuint-bitcoin/node_modules/uint8array-tools/src/mjs/browser.js
  var HEX_STRINGS2 = "0123456789abcdefABCDEF";
  var HEX_CODES2 = HEX_STRINGS2.split("").map((c) => c.codePointAt(0));
  var HEX_CODEPOINTS2 = Array(256).fill(true).map((_, i) => {
    const s = String.fromCodePoint(i);
    const index = HEX_STRINGS2.indexOf(s);
    return index < 0 ? void 0 : index < 16 ? index : index - 6;
  });
  var ENCODER2 = new TextEncoder();
  var DECODER2 = new TextDecoder();
  function writeUInt162(buffer, offset, value2, littleEndian) {
    if (offset + 2 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (value2 > 65535) {
      throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${65535}. Received ${value2}`);
    }
    if (littleEndian === "LE") {
      buffer[offset] = value2 & 255;
      buffer[offset + 1] = value2 >> 8 & 255;
    } else {
      buffer[offset] = value2 >> 8 & 255;
      buffer[offset + 1] = value2 & 255;
    }
  }
  function writeUInt322(buffer, offset, value2, littleEndian) {
    if (offset + 4 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (value2 > 4294967295) {
      throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${4294967295}. Received ${value2}`);
    }
    if (littleEndian === "LE") {
      buffer[offset] = value2 & 255;
      buffer[offset + 1] = value2 >> 8 & 255;
      buffer[offset + 2] = value2 >> 16 & 255;
      buffer[offset + 3] = value2 >> 24 & 255;
    } else {
      buffer[offset] = value2 >> 24 & 255;
      buffer[offset + 1] = value2 >> 16 & 255;
      buffer[offset + 2] = value2 >> 8 & 255;
      buffer[offset + 3] = value2 & 255;
    }
  }
  function writeUInt642(buffer, offset, value2, littleEndian) {
    if (offset + 8 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (value2 > 0xffffffffffffffffn) {
      throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${0xffffffffffffffffn}. Received ${value2}`);
    }
    if (littleEndian === "LE") {
      buffer[offset] = Number(value2 & 0xffn);
      buffer[offset + 1] = Number(value2 >> 8n & 0xffn);
      buffer[offset + 2] = Number(value2 >> 16n & 0xffn);
      buffer[offset + 3] = Number(value2 >> 24n & 0xffn);
      buffer[offset + 4] = Number(value2 >> 32n & 0xffn);
      buffer[offset + 5] = Number(value2 >> 40n & 0xffn);
      buffer[offset + 6] = Number(value2 >> 48n & 0xffn);
      buffer[offset + 7] = Number(value2 >> 56n & 0xffn);
    } else {
      buffer[offset] = Number(value2 >> 56n & 0xffn);
      buffer[offset + 1] = Number(value2 >> 48n & 0xffn);
      buffer[offset + 2] = Number(value2 >> 40n & 0xffn);
      buffer[offset + 3] = Number(value2 >> 32n & 0xffn);
      buffer[offset + 4] = Number(value2 >> 24n & 0xffn);
      buffer[offset + 5] = Number(value2 >> 16n & 0xffn);
      buffer[offset + 6] = Number(value2 >> 8n & 0xffn);
      buffer[offset + 7] = Number(value2 & 0xffn);
    }
  }
  function readUInt162(buffer, offset, littleEndian) {
    if (offset + 2 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (littleEndian === "LE") {
      let num = 0;
      num = (num << 8) + buffer[offset + 1];
      num = (num << 8) + buffer[offset];
      return num;
    } else {
      let num = 0;
      num = (num << 8) + buffer[offset];
      num = (num << 8) + buffer[offset + 1];
      return num;
    }
  }
  function readUInt322(buffer, offset, littleEndian) {
    if (offset + 4 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (littleEndian === "LE") {
      let num = 0;
      num = (num << 8) + buffer[offset + 3] >>> 0;
      num = (num << 8) + buffer[offset + 2] >>> 0;
      num = (num << 8) + buffer[offset + 1] >>> 0;
      num = (num << 8) + buffer[offset] >>> 0;
      return num;
    } else {
      let num = 0;
      num = (num << 8) + buffer[offset] >>> 0;
      num = (num << 8) + buffer[offset + 1] >>> 0;
      num = (num << 8) + buffer[offset + 2] >>> 0;
      num = (num << 8) + buffer[offset + 3] >>> 0;
      return num;
    }
  }
  function readUInt64(buffer, offset, littleEndian) {
    if (offset + 8 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array");
    }
    littleEndian = littleEndian.toUpperCase();
    if (littleEndian === "LE") {
      let num = 0n;
      num = (num << 8n) + BigInt(buffer[offset + 7]);
      num = (num << 8n) + BigInt(buffer[offset + 6]);
      num = (num << 8n) + BigInt(buffer[offset + 5]);
      num = (num << 8n) + BigInt(buffer[offset + 4]);
      num = (num << 8n) + BigInt(buffer[offset + 3]);
      num = (num << 8n) + BigInt(buffer[offset + 2]);
      num = (num << 8n) + BigInt(buffer[offset + 1]);
      num = (num << 8n) + BigInt(buffer[offset]);
      return num;
    } else {
      let num = 0n;
      num = (num << 8n) + BigInt(buffer[offset]);
      num = (num << 8n) + BigInt(buffer[offset + 1]);
      num = (num << 8n) + BigInt(buffer[offset + 2]);
      num = (num << 8n) + BigInt(buffer[offset + 3]);
      num = (num << 8n) + BigInt(buffer[offset + 4]);
      num = (num << 8n) + BigInt(buffer[offset + 5]);
      num = (num << 8n) + BigInt(buffer[offset + 6]);
      num = (num << 8n) + BigInt(buffer[offset + 7]);
      return num;
    }
  }

  // node_modules/varuint-bitcoin/src/esm/index.js
  var checkUInt64 = (n) => {
    if (n < 0 || n > 0xffffffffffffffffn) {
      throw new RangeError("value out of range");
    }
  };
  function checkUInt53(n) {
    if (n < 0 || n > Number.MAX_SAFE_INTEGER || n % 1 !== 0)
      throw new RangeError("value out of range");
  }
  function checkUint53OrUint64(n) {
    if (typeof n === "number")
      checkUInt53(n);
    else
      checkUInt64(n);
  }
  function encode5(n, buffer, offset) {
    checkUint53OrUint64(n);
    if (offset === void 0)
      offset = 0;
    if (buffer === void 0) {
      buffer = new Uint8Array(encodingLength2(n));
    }
    let bytes = 0;
    if (n < 253) {
      buffer.set([Number(n)], offset);
      bytes = 1;
    } else if (n <= 65535) {
      buffer.set([253], offset);
      writeUInt162(buffer, offset + 1, Number(n), "LE");
      bytes = 3;
    } else if (n <= 4294967295) {
      buffer.set([254], offset);
      writeUInt322(buffer, offset + 1, Number(n), "LE");
      bytes = 5;
    } else {
      buffer.set([255], offset);
      writeUInt642(buffer, offset + 1, BigInt(n), "LE");
      bytes = 9;
    }
    return { buffer, bytes };
  }
  function decode5(buffer, offset) {
    if (offset === void 0)
      offset = 0;
    const first = buffer.at(offset);
    if (first === void 0)
      throw new Error("buffer too small");
    if (first < 253) {
      return { numberValue: first, bigintValue: BigInt(first), bytes: 1 };
    } else if (first === 253) {
      const val = readUInt162(buffer, offset + 1, "LE");
      return {
        numberValue: val,
        bigintValue: BigInt(val),
        bytes: 3
      };
    } else if (first === 254) {
      const val = readUInt322(buffer, offset + 1, "LE");
      return {
        numberValue: val,
        bigintValue: BigInt(val),
        bytes: 5
      };
    } else {
      const number3 = readUInt64(buffer, offset + 1, "LE");
      return { numberValue: number3 <= Number.MAX_SAFE_INTEGER ? Number(number3) : null, bigintValue: number3, bytes: 9 };
    }
  }
  function encodingLength2(n) {
    checkUint53OrUint64(n);
    return n < 253 ? 1 : n <= 65535 ? 3 : n <= 4294967295 ? 5 : 9;
  }

  // node_modules/bitcoinjs-lib/src/esm/bufferutils.js
  var MAX_JS_NUMBER = 9007199254740991;
  function verifuint(value2, max) {
    if (typeof value2 !== "number" && typeof value2 !== "bigint")
      throw new Error("cannot write a non-number as a number");
    if (value2 < 0 && value2 < BigInt(0))
      throw new Error("specified a negative value for writing an unsigned value");
    if (value2 > max && value2 > BigInt(max))
      throw new Error("RangeError: value out of range");
    if (Math.floor(Number(value2)) !== Number(value2))
      throw new Error("value has a fractional component");
  }
  function reverseBuffer(buffer) {
    if (buffer.length < 1) return buffer;
    let j = buffer.length - 1;
    let tmp = 0;
    for (let i = 0; i < buffer.length / 2; i++) {
      tmp = buffer[i];
      buffer[i] = buffer[j];
      buffer[j] = tmp;
      j--;
    }
    return buffer;
  }
  function cloneBuffer(buffer) {
    const clone = new Uint8Array(buffer.length);
    clone.set(buffer);
    return clone;
  }
  var BufferWriter = class _BufferWriter {
    constructor(buffer, offset = 0) {
      __publicField(this, "buffer");
      __publicField(this, "offset");
      this.buffer = buffer;
      this.offset = offset;
      parse(tuple([BufferSchema, UInt32Schema]), [
        buffer,
        offset
      ]);
    }
    static withCapacity(size) {
      return new _BufferWriter(new Uint8Array(size));
    }
    writeUInt8(i) {
      this.offset = writeUInt8(this.buffer, this.offset, i);
    }
    writeInt32(i) {
      this.offset = writeInt32(this.buffer, this.offset, i, "LE");
    }
    writeInt64(i) {
      this.offset = writeInt64(this.buffer, this.offset, BigInt(i), "LE");
    }
    writeUInt32(i) {
      this.offset = writeUInt32(this.buffer, this.offset, i, "LE");
    }
    writeUInt64(i) {
      this.offset = writeUInt64(this.buffer, this.offset, BigInt(i), "LE");
    }
    writeVarInt(i) {
      const { bytes } = encode5(i, this.buffer, this.offset);
      this.offset += bytes;
    }
    writeSlice(slice) {
      if (this.buffer.length < this.offset + slice.length) {
        throw new Error("Cannot write slice out of bounds");
      }
      this.buffer.set(slice, this.offset);
      this.offset += slice.length;
    }
    writeVarSlice(slice) {
      this.writeVarInt(slice.length);
      this.writeSlice(slice);
    }
    writeVector(vector) {
      this.writeVarInt(vector.length);
      vector.forEach((buf) => this.writeVarSlice(buf));
    }
    end() {
      if (this.buffer.length === this.offset) {
        return this.buffer;
      }
      throw new Error(`buffer size ${this.buffer.length}, offset ${this.offset}`);
    }
  };
  var BufferReader = class {
    constructor(buffer, offset = 0) {
      __publicField(this, "buffer");
      __publicField(this, "offset");
      this.buffer = buffer;
      this.offset = offset;
      parse(tuple([BufferSchema, UInt32Schema]), [
        buffer,
        offset
      ]);
    }
    readUInt8() {
      const result = readUInt8(this.buffer, this.offset);
      this.offset++;
      return result;
    }
    readInt32() {
      const result = readInt32(this.buffer, this.offset, "LE");
      this.offset += 4;
      return result;
    }
    readUInt32() {
      const result = readUInt32(this.buffer, this.offset, "LE");
      this.offset += 4;
      return result;
    }
    readInt64() {
      const result = readInt64(this.buffer, this.offset, "LE");
      this.offset += 8;
      return result;
    }
    readVarInt() {
      const { bigintValue, bytes } = decode5(this.buffer, this.offset);
      this.offset += bytes;
      return bigintValue;
    }
    readSlice(n) {
      verifuint(n, MAX_JS_NUMBER);
      const num = Number(n);
      if (this.buffer.length < this.offset + num) {
        throw new Error("Cannot read slice out of bounds");
      }
      const result = this.buffer.slice(this.offset, this.offset + num);
      this.offset += num;
      return result;
    }
    readVarSlice() {
      return this.readSlice(this.readVarInt());
    }
    readVector() {
      const count = this.readVarInt();
      const vector = [];
      for (let i = 0; i < count; i++) vector.push(this.readVarSlice());
      return vector;
    }
  };

  // node_modules/bitcoinjs-lib/src/esm/payments/bip341.js
  var LEAF_VERSION_TAPSCRIPT = 192;
  var MAX_TAPTREE_DEPTH = 128;
  var isHashBranch = (ht) => "left" in ht && "right" in ht;
  function rootHashFromPath(controlBlock, leafHash) {
    if (controlBlock.length < 33)
      throw new TypeError(
        `The control-block length is too small. Got ${controlBlock.length}, expected min 33.`
      );
    const m = (controlBlock.length - 33) / 32;
    let kj = leafHash;
    for (let j = 0; j < m; j++) {
      const ej = controlBlock.slice(33 + 32 * j, 65 + 32 * j);
      if (compare(kj, ej) < 0) {
        kj = tapBranchHash(kj, ej);
      } else {
        kj = tapBranchHash(ej, kj);
      }
    }
    return kj;
  }
  function toHashTree(scriptTree) {
    if (isTapleaf(scriptTree)) return { hash: tapleafHash(scriptTree) };
    const hashes = [toHashTree(scriptTree[0]), toHashTree(scriptTree[1])];
    hashes.sort((a, b) => compare(a.hash, b.hash));
    const [left, right] = hashes;
    return {
      hash: tapBranchHash(left.hash, right.hash),
      left,
      right
    };
  }
  function findScriptPath(node, hash) {
    if (isHashBranch(node)) {
      const leftPath = findScriptPath(node.left, hash);
      if (leftPath !== void 0) return [...leftPath, node.right.hash];
      const rightPath = findScriptPath(node.right, hash);
      if (rightPath !== void 0) return [...rightPath, node.left.hash];
    } else if (compare(node.hash, hash) === 0) {
      return [];
    }
    return void 0;
  }
  function tapleafHash(leaf) {
    const version = leaf.version || LEAF_VERSION_TAPSCRIPT;
    return taggedHash(
      "TapLeaf",
      concat([Uint8Array.from([version]), serializeScript(leaf.output)])
    );
  }
  function tapTweakHash(pubKey, h) {
    return taggedHash(
      "TapTweak",
      concat(h ? [pubKey, h] : [pubKey])
    );
  }
  function tweakKey(pubKey, h) {
    if (!(pubKey instanceof Uint8Array)) return null;
    if (pubKey.length !== 32) return null;
    if (h && h.length !== 32) return null;
    const tweakHash = tapTweakHash(pubKey, h);
    const res = getEccLib().xOnlyPointAddTweak(pubKey, tweakHash);
    if (!res || res.xOnlyPubkey === null) return null;
    return {
      parity: res.parity,
      x: Uint8Array.from(res.xOnlyPubkey)
    };
  }
  function tapBranchHash(a, b) {
    return taggedHash("TapBranch", concat([a, b]));
  }
  function serializeScript(s) {
    const varintLen = esm_exports.encodingLength(s.length);
    const buffer = new Uint8Array(varintLen);
    esm_exports.encode(s.length, buffer);
    return concat([buffer, s]);
  }

  // node_modules/bitcoinjs-lib/src/esm/payments/p2tr.js
  var import_bech323 = __toESM(require_dist(), 1);
  var OPS8 = OPS;
  var TAPROOT_WITNESS_VERSION = 1;
  var ANNEX_PREFIX = 80;
  function p2tr(a, opts) {
    if (!a.address && !a.output && !a.pubkey && !a.internalPubkey && !(a.witness && a.witness.length > 1))
      throw new TypeError("Not enough data");
    opts = Object.assign({ validate: true }, opts || {});
    parse(
      partial(
        object({
          address: string(),
          input: NBufferSchemaFactory(0),
          network: object({}),
          output: NBufferSchemaFactory(34),
          internalPubkey: NBufferSchemaFactory(32),
          hash: NBufferSchemaFactory(32),
          // merkle root hash, the tweak
          pubkey: NBufferSchemaFactory(32),
          // tweaked with `hash` from `internalPubkey`
          signature: union([
            NBufferSchemaFactory(64),
            NBufferSchemaFactory(65)
          ]),
          witness: array(BufferSchema),
          scriptTree: custom(isTaptree, "Taptree is not of type isTaptree"),
          redeem: partial(
            object({
              output: BufferSchema,
              // tapleaf script
              redeemVersion: number(),
              // tapleaf version
              witness: array(BufferSchema)
            })
          ),
          redeemVersion: number()
        })
      ),
      a
    );
    const _address = value(() => {
      return fromBech32(a.address);
    });
    const _witness = value(() => {
      if (!a.witness || !a.witness.length) return;
      if (a.witness.length >= 2 && a.witness[a.witness.length - 1][0] === ANNEX_PREFIX) {
        return a.witness.slice(0, -1);
      }
      return a.witness.slice();
    });
    const _hashTree = value(() => {
      if (a.scriptTree) return toHashTree(a.scriptTree);
      if (a.hash) return { hash: a.hash };
      return;
    });
    const network = a.network || bitcoin;
    const o = { name: "p2tr", network };
    prop(o, "address", () => {
      if (!o.pubkey) return;
      const words = import_bech323.bech32m.toWords(o.pubkey);
      words.unshift(TAPROOT_WITNESS_VERSION);
      return import_bech323.bech32m.encode(network.bech32, words);
    });
    prop(o, "hash", () => {
      const hashTree = _hashTree();
      if (hashTree) return hashTree.hash;
      const w = _witness();
      if (w && w.length > 1) {
        const controlBlock = w[w.length - 1];
        const leafVersion = controlBlock[0] & TAPLEAF_VERSION_MASK;
        const script = w[w.length - 2];
        const leafHash = tapleafHash({ output: script, version: leafVersion });
        return rootHashFromPath(controlBlock, leafHash);
      }
      return null;
    });
    prop(o, "output", () => {
      if (!o.pubkey) return;
      return compile([OPS8.OP_1, o.pubkey]);
    });
    prop(o, "redeemVersion", () => {
      if (a.redeemVersion) return a.redeemVersion;
      if (a.redeem && a.redeem.redeemVersion !== void 0 && a.redeem.redeemVersion !== null) {
        return a.redeem.redeemVersion;
      }
      return LEAF_VERSION_TAPSCRIPT;
    });
    prop(o, "redeem", () => {
      const witness = _witness();
      if (!witness || witness.length < 2) return;
      return {
        output: witness[witness.length - 2],
        witness: witness.slice(0, -2),
        redeemVersion: witness[witness.length - 1][0] & TAPLEAF_VERSION_MASK
      };
    });
    prop(o, "pubkey", () => {
      if (a.pubkey) return a.pubkey;
      if (a.output) return a.output.slice(2);
      if (a.address) return _address().data;
      if (o.internalPubkey) {
        const tweakedKey = tweakKey(o.internalPubkey, o.hash);
        if (tweakedKey) return tweakedKey.x;
      }
    });
    prop(o, "internalPubkey", () => {
      if (a.internalPubkey) return a.internalPubkey;
      const witness = _witness();
      if (witness && witness.length > 1)
        return witness[witness.length - 1].slice(1, 33);
    });
    prop(o, "signature", () => {
      if (a.signature) return a.signature;
      const witness = _witness();
      if (!witness || witness.length !== 1) return;
      return witness[0];
    });
    prop(o, "witness", () => {
      if (a.witness) return a.witness;
      const hashTree = _hashTree();
      if (hashTree && a.redeem && a.redeem.output && a.internalPubkey) {
        const leafHash = tapleafHash({
          output: a.redeem.output,
          version: o.redeemVersion
        });
        const path = findScriptPath(hashTree, leafHash);
        if (!path) return;
        const outputKey = tweakKey(a.internalPubkey, hashTree.hash);
        if (!outputKey) return;
        const controlBock = concat(
          [
            Uint8Array.from([o.redeemVersion | outputKey.parity]),
            a.internalPubkey
          ].concat(path)
        );
        return [a.redeem.output, controlBock];
      }
      if (a.signature) return [a.signature];
    });
    if (opts.validate) {
      let pubkey = Uint8Array.from([]);
      if (a.address) {
        if (network && network.bech32 !== _address().prefix)
          throw new TypeError("Invalid prefix or Network mismatch");
        if (_address().version !== TAPROOT_WITNESS_VERSION)
          throw new TypeError("Invalid address version");
        if (_address().data.length !== 32)
          throw new TypeError("Invalid address data");
        pubkey = _address().data;
      }
      if (a.pubkey) {
        if (pubkey.length > 0 && compare(pubkey, a.pubkey) !== 0)
          throw new TypeError("Pubkey mismatch");
        else pubkey = a.pubkey;
      }
      if (a.output) {
        if (a.output.length !== 34 || a.output[0] !== OPS8.OP_1 || a.output[1] !== 32)
          throw new TypeError("Output is invalid");
        if (pubkey.length > 0 && compare(pubkey, a.output.slice(2)) !== 0)
          throw new TypeError("Pubkey mismatch");
        else pubkey = a.output.slice(2);
      }
      if (a.internalPubkey) {
        const tweakedKey = tweakKey(a.internalPubkey, o.hash);
        if (pubkey.length > 0 && compare(pubkey, tweakedKey.x) !== 0)
          throw new TypeError("Pubkey mismatch");
        else pubkey = tweakedKey.x;
      }
      if (pubkey && pubkey.length) {
        if (!getEccLib().isXOnlyPoint(pubkey))
          throw new TypeError("Invalid pubkey for p2tr");
      }
      const hashTree = _hashTree();
      if (a.hash && hashTree) {
        if (compare(a.hash, hashTree.hash) !== 0)
          throw new TypeError("Hash mismatch");
      }
      if (a.redeem && a.redeem.output && hashTree) {
        const leafHash = tapleafHash({
          output: a.redeem.output,
          version: o.redeemVersion
        });
        if (!findScriptPath(hashTree, leafHash))
          throw new TypeError("Redeem script not in tree");
      }
      const witness = _witness();
      if (a.redeem && o.redeem) {
        if (a.redeem.redeemVersion) {
          if (a.redeem.redeemVersion !== o.redeem.redeemVersion)
            throw new TypeError("Redeem.redeemVersion and witness mismatch");
        }
        if (a.redeem.output) {
          if (decompile(a.redeem.output).length === 0)
            throw new TypeError("Redeem.output is invalid");
          if (o.redeem.output && compare(a.redeem.output, o.redeem.output) !== 0)
            throw new TypeError("Redeem.output and witness mismatch");
        }
        if (a.redeem.witness) {
          if (o.redeem.witness && !stacksEqual(a.redeem.witness, o.redeem.witness))
            throw new TypeError("Redeem.witness and witness mismatch");
        }
      }
      if (witness && witness.length) {
        if (witness.length === 1) {
          if (a.signature && compare(a.signature, witness[0]) !== 0)
            throw new TypeError("Signature mismatch");
        } else {
          const controlBlock = witness[witness.length - 1];
          if (controlBlock.length < 33)
            throw new TypeError(
              `The control-block length is too small. Got ${controlBlock.length}, expected min 33.`
            );
          if ((controlBlock.length - 33) % 32 !== 0)
            throw new TypeError(
              `The control-block length of ${controlBlock.length} is incorrect!`
            );
          const m = (controlBlock.length - 33) / 32;
          if (m > 128)
            throw new TypeError(
              `The script path is too long. Got ${m}, expected max 128.`
            );
          const internalPubkey = controlBlock.slice(1, 33);
          if (a.internalPubkey && compare(a.internalPubkey, internalPubkey) !== 0)
            throw new TypeError("Internal pubkey mismatch");
          if (!getEccLib().isXOnlyPoint(internalPubkey))
            throw new TypeError("Invalid internalPubkey for p2tr witness");
          const leafVersion = controlBlock[0] & TAPLEAF_VERSION_MASK;
          const script = witness[witness.length - 2];
          const leafHash = tapleafHash({ output: script, version: leafVersion });
          const hash = rootHashFromPath(controlBlock, leafHash);
          const outputKey = tweakKey(internalPubkey, hash);
          if (!outputKey)
            throw new TypeError("Invalid outputKey for p2tr witness");
          if (pubkey.length && compare(pubkey, outputKey.x) !== 0)
            throw new TypeError("Pubkey mismatch for p2tr witness");
          if (outputKey.parity !== (controlBlock[0] & 1))
            throw new Error("Incorrect parity");
        }
      }
    }
    return Object.assign(o, a);
  }

  // node_modules/bitcoinjs-lib/src/esm/address.js
  var import_bech324 = __toESM(require_dist(), 1);
  var FUTURE_SEGWIT_MAX_SIZE = 40;
  var FUTURE_SEGWIT_MIN_SIZE = 2;
  var FUTURE_SEGWIT_MAX_VERSION = 16;
  var FUTURE_SEGWIT_MIN_VERSION = 2;
  var FUTURE_SEGWIT_VERSION_DIFF = 80;
  var FUTURE_SEGWIT_VERSION_WARNING = "WARNING: Sending to a future segwit version address can lead to loss of funds. End users MUST be warned carefully in the GUI and asked if they wish to proceed with caution. Wallets should verify the segwit version from the output of fromBech32, then decide when it is safe to use which version of segwit.";
  var WARNING_STATES = [false, false];
  function _toFutureSegwitAddress(output, network) {
    const data = output.slice(2);
    if (data.length < FUTURE_SEGWIT_MIN_SIZE || data.length > FUTURE_SEGWIT_MAX_SIZE)
      throw new TypeError("Invalid program length for segwit address");
    const version = output[0] - FUTURE_SEGWIT_VERSION_DIFF;
    if (version < FUTURE_SEGWIT_MIN_VERSION || version > FUTURE_SEGWIT_MAX_VERSION)
      throw new TypeError("Invalid version for segwit address");
    if (output[1] !== data.length)
      throw new TypeError("Invalid script for segwit address");
    if (WARNING_STATES[0] === false) {
      console.warn(FUTURE_SEGWIT_VERSION_WARNING);
      WARNING_STATES[0] = true;
    }
    return toBech32(data, version, network.bech32);
  }
  function fromBase58Check(address) {
    const payload = esm_default3.decode(address);
    if (payload.length < 21) throw new TypeError(address + " is too short");
    if (payload.length > 21) throw new TypeError(address + " is too long");
    const version = readUInt8(payload, 0);
    const hash = payload.slice(1);
    return { version, hash };
  }
  function fromBech32(address) {
    let result;
    let version;
    try {
      result = import_bech324.bech32.decode(address);
    } catch (e) {
    }
    if (result) {
      version = result.words[0];
      if (version !== 0) throw new TypeError(address + " uses wrong encoding");
    } else {
      result = import_bech324.bech32m.decode(address);
      version = result.words[0];
      if (version === 0) throw new TypeError(address + " uses wrong encoding");
    }
    const data = import_bech324.bech32.fromWords(result.words.slice(1));
    return {
      version,
      prefix: result.prefix,
      data: Uint8Array.from(data)
    };
  }
  function toBech32(data, version, prefix) {
    const words = import_bech324.bech32.toWords(data);
    words.unshift(version);
    return version === 0 ? import_bech324.bech32.encode(prefix, words) : import_bech324.bech32m.encode(prefix, words);
  }
  function fromOutputScript(output, network) {
    network = network || bitcoin;
    try {
      return p2pkh({ output, network }).address;
    } catch (e) {
    }
    try {
      return p2sh({ output, network }).address;
    } catch (e) {
    }
    try {
      return p2wpkh({ output, network }).address;
    } catch (e) {
    }
    try {
      return p2wsh({ output, network }).address;
    } catch (e) {
    }
    try {
      return p2tr({ output, network }).address;
    } catch (e) {
    }
    try {
      return _toFutureSegwitAddress(output, network);
    } catch (e) {
    }
    throw new Error(toASM(output) + " has no matching Address");
  }
  function toOutputScript(address, network) {
    network = network || bitcoin;
    let decodeBase58;
    let decodeBech32;
    try {
      decodeBase58 = fromBase58Check(address);
    } catch (e) {
    }
    if (decodeBase58) {
      if (decodeBase58.version === network.pubKeyHash)
        return p2pkh({ hash: decodeBase58.hash }).output;
      if (decodeBase58.version === network.scriptHash)
        return p2sh({ hash: decodeBase58.hash }).output;
    } else {
      try {
        decodeBech32 = fromBech32(address);
      } catch (e) {
      }
      if (decodeBech32) {
        if (decodeBech32.prefix !== network.bech32)
          throw new Error(address + " has an invalid prefix");
        if (decodeBech32.version === 0) {
          if (decodeBech32.data.length === 20)
            return p2wpkh({ hash: decodeBech32.data }).output;
          if (decodeBech32.data.length === 32)
            return p2wsh({ hash: decodeBech32.data }).output;
        } else if (decodeBech32.version === 1) {
          if (decodeBech32.data.length === 32)
            return p2tr({ pubkey: decodeBech32.data }).output;
        } else if (decodeBech32.version >= FUTURE_SEGWIT_MIN_VERSION && decodeBech32.version <= FUTURE_SEGWIT_MAX_VERSION && decodeBech32.data.length >= FUTURE_SEGWIT_MIN_SIZE && decodeBech32.data.length <= FUTURE_SEGWIT_MAX_SIZE) {
          if (WARNING_STATES[1] === false) {
            console.warn(FUTURE_SEGWIT_VERSION_WARNING);
            WARNING_STATES[1] = true;
          }
          return compile([
            decodeBech32.version + FUTURE_SEGWIT_VERSION_DIFF,
            decodeBech32.data
          ]);
        }
      }
    }
    throw new Error(address + " has no matching Script");
  }

  // node_modules/bitcoinjs-lib/src/esm/transaction.js
  function varSliceSize(someScript) {
    const length2 = someScript.length;
    return esm_exports.encodingLength(length2) + length2;
  }
  function vectorSize(someVector) {
    const length2 = someVector.length;
    return esm_exports.encodingLength(length2) + someVector.reduce((sum, witness) => {
      return sum + varSliceSize(witness);
    }, 0);
  }
  var EMPTY_BUFFER3 = new Uint8Array(0);
  var EMPTY_WITNESS = [];
  var ZERO2 = fromHex(
    "0000000000000000000000000000000000000000000000000000000000000000"
  );
  var ONE = fromHex(
    "0000000000000000000000000000000000000000000000000000000000000001"
  );
  var VALUE_UINT64_MAX = fromHex("ffffffffffffffff");
  var BLANK_OUTPUT = {
    script: EMPTY_BUFFER3,
    valueBuffer: VALUE_UINT64_MAX
  };
  function isOutput(out) {
    return out.value !== void 0;
  }
  var _Transaction = class _Transaction {
    constructor() {
      __publicField(this, "version", 1);
      __publicField(this, "locktime", 0);
      __publicField(this, "ins", []);
      __publicField(this, "outs", []);
    }
    static fromBuffer(buffer, _NO_STRICT) {
      const bufferReader = new BufferReader(buffer);
      const tx = new _Transaction();
      tx.version = bufferReader.readUInt32();
      const marker = bufferReader.readUInt8();
      const flag = bufferReader.readUInt8();
      let hasWitnesses = false;
      if (marker === _Transaction.ADVANCED_TRANSACTION_MARKER && flag === _Transaction.ADVANCED_TRANSACTION_FLAG) {
        hasWitnesses = true;
      } else {
        bufferReader.offset -= 2;
      }
      const vinLen = bufferReader.readVarInt();
      for (let i = 0; i < vinLen; ++i) {
        tx.ins.push({
          hash: bufferReader.readSlice(32),
          index: bufferReader.readUInt32(),
          script: bufferReader.readVarSlice(),
          sequence: bufferReader.readUInt32(),
          witness: EMPTY_WITNESS
        });
      }
      const voutLen = bufferReader.readVarInt();
      for (let i = 0; i < voutLen; ++i) {
        tx.outs.push({
          value: bufferReader.readInt64(),
          script: bufferReader.readVarSlice()
        });
      }
      if (hasWitnesses) {
        for (let i = 0; i < vinLen; ++i) {
          tx.ins[i].witness = bufferReader.readVector();
        }
        if (!tx.hasWitnesses())
          throw new Error("Transaction has superfluous witness data");
      }
      tx.locktime = bufferReader.readUInt32();
      if (_NO_STRICT) return tx;
      if (bufferReader.offset !== buffer.length)
        throw new Error("Transaction has unexpected data");
      return tx;
    }
    static fromHex(hex) {
      return _Transaction.fromBuffer(fromHex(hex), false);
    }
    static isCoinbaseHash(buffer) {
      parse(Hash256bitSchema, buffer);
      for (let i = 0; i < 32; ++i) {
        if (buffer[i] !== 0) return false;
      }
      return true;
    }
    isCoinbase() {
      return this.ins.length === 1 && _Transaction.isCoinbaseHash(this.ins[0].hash);
    }
    addInput(hash, index, sequence, scriptSig) {
      parse(
        tuple([
          Hash256bitSchema,
          UInt32Schema,
          nullable(optional(UInt32Schema)),
          nullable(optional(BufferSchema))
        ]),
        [hash, index, sequence, scriptSig]
      );
      if (sequence === void 0 || sequence === null) {
        sequence = _Transaction.DEFAULT_SEQUENCE;
      }
      return this.ins.push({
        hash,
        index,
        script: scriptSig || EMPTY_BUFFER3,
        sequence,
        witness: EMPTY_WITNESS
      }) - 1;
    }
    addOutput(scriptPubKey, value2) {
      parse(tuple([BufferSchema, SatoshiSchema]), [
        scriptPubKey,
        value2
      ]);
      return this.outs.push({
        script: scriptPubKey,
        value: value2
      }) - 1;
    }
    hasWitnesses() {
      return this.ins.some((x) => {
        return x.witness.length !== 0;
      });
    }
    stripWitnesses() {
      this.ins.forEach((input) => {
        input.witness = EMPTY_WITNESS;
      });
    }
    weight() {
      const base2 = this.byteLength(false);
      const total = this.byteLength(true);
      return base2 * 3 + total;
    }
    virtualSize() {
      return Math.ceil(this.weight() / 4);
    }
    byteLength(_ALLOW_WITNESS = true) {
      const hasWitnesses = _ALLOW_WITNESS && this.hasWitnesses();
      return (hasWitnesses ? 10 : 8) + esm_exports.encodingLength(this.ins.length) + esm_exports.encodingLength(this.outs.length) + this.ins.reduce((sum, input) => {
        return sum + 40 + varSliceSize(input.script);
      }, 0) + this.outs.reduce((sum, output) => {
        return sum + 8 + varSliceSize(output.script);
      }, 0) + (hasWitnesses ? this.ins.reduce((sum, input) => {
        return sum + vectorSize(input.witness);
      }, 0) : 0);
    }
    clone() {
      const newTx = new _Transaction();
      newTx.version = this.version;
      newTx.locktime = this.locktime;
      newTx.ins = this.ins.map((txIn) => {
        return {
          hash: txIn.hash,
          index: txIn.index,
          script: txIn.script,
          sequence: txIn.sequence,
          witness: txIn.witness
        };
      });
      newTx.outs = this.outs.map((txOut) => {
        return {
          script: txOut.script,
          value: txOut.value
        };
      });
      return newTx;
    }
    /**
     * Hash transaction for signing a specific input.
     *
     * Bitcoin uses a different hash for each signed transaction input.
     * This method copies the transaction, makes the necessary changes based on the
     * hashType, and then hashes the result.
     * This hash can then be used to sign the provided transaction input.
     */
    hashForSignature(inIndex, prevOutScript, hashType) {
      parse(tuple([UInt32Schema, BufferSchema, number()]), [
        inIndex,
        prevOutScript,
        hashType
      ]);
      if (inIndex >= this.ins.length) return ONE;
      const ourScript = compile(
        decompile(prevOutScript).filter((x) => {
          return x !== OPS.OP_CODESEPARATOR;
        })
      );
      const txTmp = this.clone();
      if ((hashType & 31) === _Transaction.SIGHASH_NONE) {
        txTmp.outs = [];
        txTmp.ins.forEach((input, i) => {
          if (i === inIndex) return;
          input.sequence = 0;
        });
      } else if ((hashType & 31) === _Transaction.SIGHASH_SINGLE) {
        if (inIndex >= this.outs.length) return ONE;
        txTmp.outs.length = inIndex + 1;
        for (let i = 0; i < inIndex; i++) {
          txTmp.outs[i] = BLANK_OUTPUT;
        }
        txTmp.ins.forEach((input, y) => {
          if (y === inIndex) return;
          input.sequence = 0;
        });
      }
      if (hashType & _Transaction.SIGHASH_ANYONECANPAY) {
        txTmp.ins = [txTmp.ins[inIndex]];
        txTmp.ins[0].script = ourScript;
      } else {
        txTmp.ins.forEach((input) => {
          input.script = EMPTY_BUFFER3;
        });
        txTmp.ins[inIndex].script = ourScript;
      }
      const buffer = new Uint8Array(txTmp.byteLength(false) + 4);
      writeInt32(buffer, buffer.length - 4, hashType, "LE");
      txTmp.__toBuffer(buffer, 0, false);
      return hash256(buffer);
    }
    hashForWitnessV1(inIndex, prevOutScripts, values, hashType, leafHash, annex) {
      parse(
        tuple([
          UInt32Schema,
          array(BufferSchema),
          array(SatoshiSchema),
          UInt32Schema
        ]),
        [inIndex, prevOutScripts, values, hashType]
      );
      if (values.length !== this.ins.length || prevOutScripts.length !== this.ins.length) {
        throw new Error("Must supply prevout script and value for all inputs");
      }
      const outputType = hashType === _Transaction.SIGHASH_DEFAULT ? _Transaction.SIGHASH_ALL : hashType & _Transaction.SIGHASH_OUTPUT_MASK;
      const inputType = hashType & _Transaction.SIGHASH_INPUT_MASK;
      const isAnyoneCanPay = inputType === _Transaction.SIGHASH_ANYONECANPAY;
      const isNone = outputType === _Transaction.SIGHASH_NONE;
      const isSingle = outputType === _Transaction.SIGHASH_SINGLE;
      let hashPrevouts = EMPTY_BUFFER3;
      let hashAmounts = EMPTY_BUFFER3;
      let hashScriptPubKeys = EMPTY_BUFFER3;
      let hashSequences = EMPTY_BUFFER3;
      let hashOutputs = EMPTY_BUFFER3;
      if (!isAnyoneCanPay) {
        let bufferWriter = BufferWriter.withCapacity(36 * this.ins.length);
        this.ins.forEach((txIn) => {
          bufferWriter.writeSlice(txIn.hash);
          bufferWriter.writeUInt32(txIn.index);
        });
        hashPrevouts = sha2562(bufferWriter.end());
        bufferWriter = BufferWriter.withCapacity(8 * this.ins.length);
        values.forEach((value2) => bufferWriter.writeInt64(value2));
        hashAmounts = sha2562(bufferWriter.end());
        bufferWriter = BufferWriter.withCapacity(
          prevOutScripts.map(varSliceSize).reduce((a, b) => a + b)
        );
        prevOutScripts.forEach(
          (prevOutScript) => bufferWriter.writeVarSlice(prevOutScript)
        );
        hashScriptPubKeys = sha2562(bufferWriter.end());
        bufferWriter = BufferWriter.withCapacity(4 * this.ins.length);
        this.ins.forEach((txIn) => bufferWriter.writeUInt32(txIn.sequence));
        hashSequences = sha2562(bufferWriter.end());
      }
      if (!(isNone || isSingle)) {
        if (!this.outs.length)
          throw new Error("Add outputs to the transaction before signing.");
        const txOutsSize = this.outs.map((output) => 8 + varSliceSize(output.script)).reduce((a, b) => a + b);
        const bufferWriter = BufferWriter.withCapacity(txOutsSize);
        this.outs.forEach((out) => {
          bufferWriter.writeInt64(out.value);
          bufferWriter.writeVarSlice(out.script);
        });
        hashOutputs = sha2562(bufferWriter.end());
      } else if (isSingle && inIndex < this.outs.length) {
        const output = this.outs[inIndex];
        const bufferWriter = BufferWriter.withCapacity(
          8 + varSliceSize(output.script)
        );
        bufferWriter.writeInt64(output.value);
        bufferWriter.writeVarSlice(output.script);
        hashOutputs = sha2562(bufferWriter.end());
      }
      const spendType = (leafHash ? 2 : 0) + (annex ? 1 : 0);
      const sigMsgSize = 174 - (isAnyoneCanPay ? 49 : 0) - (isNone ? 32 : 0) + (annex ? 32 : 0) + (leafHash ? 37 : 0);
      const sigMsgWriter = BufferWriter.withCapacity(sigMsgSize);
      sigMsgWriter.writeUInt8(hashType);
      sigMsgWriter.writeUInt32(this.version);
      sigMsgWriter.writeUInt32(this.locktime);
      sigMsgWriter.writeSlice(hashPrevouts);
      sigMsgWriter.writeSlice(hashAmounts);
      sigMsgWriter.writeSlice(hashScriptPubKeys);
      sigMsgWriter.writeSlice(hashSequences);
      if (!(isNone || isSingle)) {
        sigMsgWriter.writeSlice(hashOutputs);
      }
      sigMsgWriter.writeUInt8(spendType);
      if (isAnyoneCanPay) {
        const input = this.ins[inIndex];
        sigMsgWriter.writeSlice(input.hash);
        sigMsgWriter.writeUInt32(input.index);
        sigMsgWriter.writeInt64(values[inIndex]);
        sigMsgWriter.writeVarSlice(prevOutScripts[inIndex]);
        sigMsgWriter.writeUInt32(input.sequence);
      } else {
        sigMsgWriter.writeUInt32(inIndex);
      }
      if (annex) {
        const bufferWriter = BufferWriter.withCapacity(varSliceSize(annex));
        bufferWriter.writeVarSlice(annex);
        sigMsgWriter.writeSlice(sha2562(bufferWriter.end()));
      }
      if (isSingle) {
        sigMsgWriter.writeSlice(hashOutputs);
      }
      if (leafHash) {
        sigMsgWriter.writeSlice(leafHash);
        sigMsgWriter.writeUInt8(0);
        sigMsgWriter.writeUInt32(4294967295);
      }
      return taggedHash(
        "TapSighash",
        concat([Uint8Array.from([0]), sigMsgWriter.end()])
      );
    }
    hashForWitnessV0(inIndex, prevOutScript, value2, hashType) {
      parse(
        tuple([
          UInt32Schema,
          BufferSchema,
          SatoshiSchema,
          UInt32Schema
        ]),
        [inIndex, prevOutScript, value2, hashType]
      );
      let tbuffer = Uint8Array.from([]);
      let bufferWriter;
      let hashOutputs = ZERO2;
      let hashPrevouts = ZERO2;
      let hashSequence = ZERO2;
      if (!(hashType & _Transaction.SIGHASH_ANYONECANPAY)) {
        tbuffer = new Uint8Array(36 * this.ins.length);
        bufferWriter = new BufferWriter(tbuffer, 0);
        this.ins.forEach((txIn) => {
          bufferWriter.writeSlice(txIn.hash);
          bufferWriter.writeUInt32(txIn.index);
        });
        hashPrevouts = hash256(tbuffer);
      }
      if (!(hashType & _Transaction.SIGHASH_ANYONECANPAY) && (hashType & 31) !== _Transaction.SIGHASH_SINGLE && (hashType & 31) !== _Transaction.SIGHASH_NONE) {
        tbuffer = new Uint8Array(4 * this.ins.length);
        bufferWriter = new BufferWriter(tbuffer, 0);
        this.ins.forEach((txIn) => {
          bufferWriter.writeUInt32(txIn.sequence);
        });
        hashSequence = hash256(tbuffer);
      }
      if ((hashType & 31) !== _Transaction.SIGHASH_SINGLE && (hashType & 31) !== _Transaction.SIGHASH_NONE) {
        const txOutsSize = this.outs.reduce((sum, output) => {
          return sum + 8 + varSliceSize(output.script);
        }, 0);
        tbuffer = new Uint8Array(txOutsSize);
        bufferWriter = new BufferWriter(tbuffer, 0);
        this.outs.forEach((out) => {
          bufferWriter.writeInt64(out.value);
          bufferWriter.writeVarSlice(out.script);
        });
        hashOutputs = hash256(tbuffer);
      } else if ((hashType & 31) === _Transaction.SIGHASH_SINGLE && inIndex < this.outs.length) {
        const output = this.outs[inIndex];
        tbuffer = new Uint8Array(8 + varSliceSize(output.script));
        bufferWriter = new BufferWriter(tbuffer, 0);
        bufferWriter.writeInt64(output.value);
        bufferWriter.writeVarSlice(output.script);
        hashOutputs = hash256(tbuffer);
      }
      tbuffer = new Uint8Array(156 + varSliceSize(prevOutScript));
      bufferWriter = new BufferWriter(tbuffer, 0);
      const input = this.ins[inIndex];
      bufferWriter.writeUInt32(this.version);
      bufferWriter.writeSlice(hashPrevouts);
      bufferWriter.writeSlice(hashSequence);
      bufferWriter.writeSlice(input.hash);
      bufferWriter.writeUInt32(input.index);
      bufferWriter.writeVarSlice(prevOutScript);
      bufferWriter.writeInt64(value2);
      bufferWriter.writeUInt32(input.sequence);
      bufferWriter.writeSlice(hashOutputs);
      bufferWriter.writeUInt32(this.locktime);
      bufferWriter.writeUInt32(hashType);
      return hash256(tbuffer);
    }
    getHash(forWitness) {
      if (forWitness && this.isCoinbase()) return new Uint8Array(32);
      return hash256(this.__toBuffer(void 0, void 0, forWitness));
    }
    getId() {
      return toHex(reverseBuffer(this.getHash(false)));
    }
    toBuffer(buffer, initialOffset) {
      return this.__toBuffer(buffer, initialOffset, true);
    }
    toHex() {
      return toHex(this.toBuffer(void 0, void 0));
    }
    setInputScript(index, scriptSig) {
      parse(tuple([number(), BufferSchema]), [index, scriptSig]);
      this.ins[index].script = scriptSig;
    }
    setWitness(index, witness) {
      parse(tuple([number(), array(BufferSchema)]), [
        index,
        witness
      ]);
      this.ins[index].witness = witness;
    }
    __toBuffer(buffer, initialOffset, _ALLOW_WITNESS = false) {
      if (!buffer) buffer = new Uint8Array(this.byteLength(_ALLOW_WITNESS));
      const bufferWriter = new BufferWriter(buffer, initialOffset || 0);
      bufferWriter.writeUInt32(this.version);
      const hasWitnesses = _ALLOW_WITNESS && this.hasWitnesses();
      if (hasWitnesses) {
        bufferWriter.writeUInt8(_Transaction.ADVANCED_TRANSACTION_MARKER);
        bufferWriter.writeUInt8(_Transaction.ADVANCED_TRANSACTION_FLAG);
      }
      bufferWriter.writeVarInt(this.ins.length);
      this.ins.forEach((txIn) => {
        bufferWriter.writeSlice(txIn.hash);
        bufferWriter.writeUInt32(txIn.index);
        bufferWriter.writeVarSlice(txIn.script);
        bufferWriter.writeUInt32(txIn.sequence);
      });
      bufferWriter.writeVarInt(this.outs.length);
      this.outs.forEach((txOut) => {
        if (isOutput(txOut)) {
          bufferWriter.writeInt64(txOut.value);
        } else {
          bufferWriter.writeSlice(txOut.valueBuffer);
        }
        bufferWriter.writeVarSlice(txOut.script);
      });
      if (hasWitnesses) {
        this.ins.forEach((input) => {
          bufferWriter.writeVector(input.witness);
        });
      }
      bufferWriter.writeUInt32(this.locktime);
      if (initialOffset !== void 0)
        return buffer.slice(initialOffset, bufferWriter.offset);
      return buffer;
    }
  };
  __publicField(_Transaction, "DEFAULT_SEQUENCE", 4294967295);
  __publicField(_Transaction, "SIGHASH_DEFAULT", 0);
  __publicField(_Transaction, "SIGHASH_ALL", 1);
  __publicField(_Transaction, "SIGHASH_NONE", 2);
  __publicField(_Transaction, "SIGHASH_SINGLE", 3);
  __publicField(_Transaction, "SIGHASH_ANYONECANPAY", 128);
  __publicField(_Transaction, "SIGHASH_OUTPUT_MASK", 3);
  __publicField(_Transaction, "SIGHASH_INPUT_MASK", 128);
  __publicField(_Transaction, "ADVANCED_TRANSACTION_MARKER", 0);
  __publicField(_Transaction, "ADVANCED_TRANSACTION_FLAG", 1);
  var Transaction = _Transaction;

  // node_modules/bitcoinjs-lib/src/esm/block.js
  var errorMerkleNoTxes = new TypeError(
    "Cannot compute merkle root for zero transactions"
  );
  var errorWitnessNotSegwit = new TypeError(
    "Cannot compute witness commit for non-segwit block"
  );

  // node_modules/bip174/src/esm/lib/converter/index.js
  var converter_exports = {};
  __export(converter_exports, {
    globals: () => globals,
    inputs: () => inputs,
    outputs: () => outputs
  });

  // node_modules/bip174/src/esm/lib/typeFields.js
  var GlobalTypes;
  (function(GlobalTypes2) {
    GlobalTypes2[GlobalTypes2["UNSIGNED_TX"] = 0] = "UNSIGNED_TX";
    GlobalTypes2[GlobalTypes2["GLOBAL_XPUB"] = 1] = "GLOBAL_XPUB";
  })(GlobalTypes || (GlobalTypes = {}));
  var InputTypes;
  (function(InputTypes2) {
    InputTypes2[InputTypes2["NON_WITNESS_UTXO"] = 0] = "NON_WITNESS_UTXO";
    InputTypes2[InputTypes2["WITNESS_UTXO"] = 1] = "WITNESS_UTXO";
    InputTypes2[InputTypes2["PARTIAL_SIG"] = 2] = "PARTIAL_SIG";
    InputTypes2[InputTypes2["SIGHASH_TYPE"] = 3] = "SIGHASH_TYPE";
    InputTypes2[InputTypes2["REDEEM_SCRIPT"] = 4] = "REDEEM_SCRIPT";
    InputTypes2[InputTypes2["WITNESS_SCRIPT"] = 5] = "WITNESS_SCRIPT";
    InputTypes2[InputTypes2["BIP32_DERIVATION"] = 6] = "BIP32_DERIVATION";
    InputTypes2[InputTypes2["FINAL_SCRIPTSIG"] = 7] = "FINAL_SCRIPTSIG";
    InputTypes2[InputTypes2["FINAL_SCRIPTWITNESS"] = 8] = "FINAL_SCRIPTWITNESS";
    InputTypes2[InputTypes2["POR_COMMITMENT"] = 9] = "POR_COMMITMENT";
    InputTypes2[InputTypes2["TAP_KEY_SIG"] = 19] = "TAP_KEY_SIG";
    InputTypes2[InputTypes2["TAP_SCRIPT_SIG"] = 20] = "TAP_SCRIPT_SIG";
    InputTypes2[InputTypes2["TAP_LEAF_SCRIPT"] = 21] = "TAP_LEAF_SCRIPT";
    InputTypes2[InputTypes2["TAP_BIP32_DERIVATION"] = 22] = "TAP_BIP32_DERIVATION";
    InputTypes2[InputTypes2["TAP_INTERNAL_KEY"] = 23] = "TAP_INTERNAL_KEY";
    InputTypes2[InputTypes2["TAP_MERKLE_ROOT"] = 24] = "TAP_MERKLE_ROOT";
  })(InputTypes || (InputTypes = {}));
  var OutputTypes;
  (function(OutputTypes2) {
    OutputTypes2[OutputTypes2["REDEEM_SCRIPT"] = 0] = "REDEEM_SCRIPT";
    OutputTypes2[OutputTypes2["WITNESS_SCRIPT"] = 1] = "WITNESS_SCRIPT";
    OutputTypes2[OutputTypes2["BIP32_DERIVATION"] = 2] = "BIP32_DERIVATION";
    OutputTypes2[OutputTypes2["TAP_INTERNAL_KEY"] = 5] = "TAP_INTERNAL_KEY";
    OutputTypes2[OutputTypes2["TAP_TREE"] = 6] = "TAP_TREE";
    OutputTypes2[OutputTypes2["TAP_BIP32_DERIVATION"] = 7] = "TAP_BIP32_DERIVATION";
  })(OutputTypes || (OutputTypes = {}));

  // node_modules/bip174/src/esm/lib/converter/global/globalXpub.js
  var globalXpub_exports = {};
  __export(globalXpub_exports, {
    canAddToArray: () => canAddToArray,
    check: () => check2,
    decode: () => decode6,
    encode: () => encode6,
    expected: () => expected
  });
  var range = (n) => [...Array(n).keys()];
  function decode6(keyVal) {
    if (keyVal.key[0] !== GlobalTypes.GLOBAL_XPUB) {
      throw new Error(
        "Decode Error: could not decode globalXpub with key 0x" + toHex(keyVal.key)
      );
    }
    if (keyVal.key.length !== 79 || ![2, 3].includes(keyVal.key[46])) {
      throw new Error(
        "Decode Error: globalXpub has invalid extended pubkey in key 0x" + toHex(keyVal.key)
      );
    }
    if (keyVal.value.length / 4 % 1 !== 0) {
      throw new Error(
        "Decode Error: Global GLOBAL_XPUB value length should be multiple of 4"
      );
    }
    const extendedPubkey = keyVal.key.slice(1);
    const data = {
      masterFingerprint: keyVal.value.slice(0, 4),
      extendedPubkey,
      path: "m"
    };
    for (const i of range(keyVal.value.length / 4 - 1)) {
      const val = readUInt32(keyVal.value, i * 4 + 4, "LE");
      const isHard = !!(val & 2147483648);
      const idx = val & 2147483647;
      data.path += "/" + idx.toString(10) + (isHard ? "'" : "");
    }
    return data;
  }
  function encode6(data) {
    const head = new Uint8Array([GlobalTypes.GLOBAL_XPUB]);
    const key = concat([head, data.extendedPubkey]);
    const splitPath = data.path.split("/");
    const value2 = new Uint8Array(splitPath.length * 4);
    value2.set(data.masterFingerprint, 0);
    let offset = 4;
    splitPath.slice(1).forEach((level) => {
      const isHard = level.slice(-1) === "'";
      let num = 2147483647 & parseInt(isHard ? level.slice(0, -1) : level, 10);
      if (isHard) num += 2147483648;
      writeUInt32(value2, offset, num, "LE");
      offset += 4;
    });
    return {
      key,
      value: value2
    };
  }
  var expected = "{ masterFingerprint: Uint8Array; extendedPubkey: Uint8Array; path: string; }";
  function check2(data) {
    const epk = data.extendedPubkey;
    const mfp = data.masterFingerprint;
    const p = data.path;
    return epk instanceof Uint8Array && epk.length === 78 && [2, 3].indexOf(epk[45]) > -1 && mfp instanceof Uint8Array && mfp.length === 4 && typeof p === "string" && !!p.match(/^m(\/\d+'?)*$/);
  }
  function canAddToArray(array2, item, dupeSet) {
    const dupeString = toHex(item.extendedPubkey);
    if (dupeSet.has(dupeString)) return false;
    dupeSet.add(dupeString);
    return array2.filter((v) => compare(v.extendedPubkey, item.extendedPubkey)).length === 0;
  }

  // node_modules/bip174/src/esm/lib/converter/global/unsignedTx.js
  var unsignedTx_exports = {};
  __export(unsignedTx_exports, {
    encode: () => encode7
  });
  function encode7(data) {
    return {
      key: new Uint8Array([GlobalTypes.UNSIGNED_TX]),
      value: data.toBuffer()
    };
  }

  // node_modules/bip174/src/esm/lib/converter/input/finalScriptSig.js
  var finalScriptSig_exports = {};
  __export(finalScriptSig_exports, {
    canAdd: () => canAdd,
    check: () => check3,
    decode: () => decode7,
    encode: () => encode8,
    expected: () => expected2
  });
  function decode7(keyVal) {
    if (keyVal.key[0] !== InputTypes.FINAL_SCRIPTSIG) {
      throw new Error(
        "Decode Error: could not decode finalScriptSig with key 0x" + toHex(keyVal.key)
      );
    }
    return keyVal.value;
  }
  function encode8(data) {
    const key = new Uint8Array([InputTypes.FINAL_SCRIPTSIG]);
    return {
      key,
      value: data
    };
  }
  var expected2 = "Uint8Array";
  function check3(data) {
    return data instanceof Uint8Array;
  }
  function canAdd(currentData, newData) {
    return !!currentData && !!newData && currentData.finalScriptSig === void 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/finalScriptWitness.js
  var finalScriptWitness_exports = {};
  __export(finalScriptWitness_exports, {
    canAdd: () => canAdd2,
    check: () => check4,
    decode: () => decode8,
    encode: () => encode9,
    expected: () => expected3
  });
  function decode8(keyVal) {
    if (keyVal.key[0] !== InputTypes.FINAL_SCRIPTWITNESS) {
      throw new Error(
        "Decode Error: could not decode finalScriptWitness with key 0x" + toHex(keyVal.key)
      );
    }
    return keyVal.value;
  }
  function encode9(data) {
    const key = new Uint8Array([InputTypes.FINAL_SCRIPTWITNESS]);
    return {
      key,
      value: data
    };
  }
  var expected3 = "Uint8Array";
  function check4(data) {
    return data instanceof Uint8Array;
  }
  function canAdd2(currentData, newData) {
    return !!currentData && !!newData && currentData.finalScriptWitness === void 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/nonWitnessUtxo.js
  var nonWitnessUtxo_exports = {};
  __export(nonWitnessUtxo_exports, {
    canAdd: () => canAdd3,
    check: () => check5,
    decode: () => decode9,
    encode: () => encode10,
    expected: () => expected4
  });
  function decode9(keyVal) {
    if (keyVal.key[0] !== InputTypes.NON_WITNESS_UTXO) {
      throw new Error(
        "Decode Error: could not decode nonWitnessUtxo with key 0x" + toHex(keyVal.key)
      );
    }
    return keyVal.value;
  }
  function encode10(data) {
    return {
      key: new Uint8Array([InputTypes.NON_WITNESS_UTXO]),
      value: data
    };
  }
  var expected4 = "Uint8Array";
  function check5(data) {
    return data instanceof Uint8Array;
  }
  function canAdd3(currentData, newData) {
    return !!currentData && !!newData && currentData.nonWitnessUtxo === void 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/partialSig.js
  var partialSig_exports = {};
  __export(partialSig_exports, {
    canAddToArray: () => canAddToArray2,
    check: () => check6,
    decode: () => decode10,
    encode: () => encode11,
    expected: () => expected5
  });
  function decode10(keyVal) {
    if (keyVal.key[0] !== InputTypes.PARTIAL_SIG) {
      throw new Error(
        "Decode Error: could not decode partialSig with key 0x" + toHex(keyVal.key)
      );
    }
    if (!(keyVal.key.length === 34 || keyVal.key.length === 66) || ![2, 3, 4].includes(keyVal.key[1])) {
      throw new Error(
        "Decode Error: partialSig has invalid pubkey in key 0x" + toHex(keyVal.key)
      );
    }
    const pubkey = keyVal.key.slice(1);
    return {
      pubkey,
      signature: keyVal.value
    };
  }
  function encode11(pSig) {
    const head = new Uint8Array([InputTypes.PARTIAL_SIG]);
    return {
      key: concat([head, pSig.pubkey]),
      value: pSig.signature
    };
  }
  var expected5 = "{ pubkey: Uint8Array; signature: Uint8Array; }";
  function check6(data) {
    return data.pubkey instanceof Uint8Array && data.signature instanceof Uint8Array && [33, 65].includes(data.pubkey.length) && [2, 3, 4].includes(data.pubkey[0]) && isDerSigWithSighash(data.signature);
  }
  function isDerSigWithSighash(buf) {
    if (!(buf instanceof Uint8Array) || buf.length < 9) return false;
    if (buf[0] !== 48) return false;
    if (buf.length !== buf[1] + 3) return false;
    if (buf[2] !== 2) return false;
    const rLen = buf[3];
    if (rLen > 33 || rLen < 1) return false;
    if (buf[3 + rLen + 1] !== 2) return false;
    const sLen = buf[3 + rLen + 2];
    if (sLen > 33 || sLen < 1) return false;
    if (buf.length !== 3 + rLen + 2 + sLen + 2) return false;
    return true;
  }
  function canAddToArray2(array2, item, dupeSet) {
    const dupeString = toHex(item.pubkey);
    if (dupeSet.has(dupeString)) return false;
    dupeSet.add(dupeString);
    return array2.filter((v) => compare(v.pubkey, item.pubkey) === 0).length === 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/porCommitment.js
  var porCommitment_exports = {};
  __export(porCommitment_exports, {
    canAdd: () => canAdd4,
    check: () => check7,
    decode: () => decode11,
    encode: () => encode12,
    expected: () => expected6
  });
  function decode11(keyVal) {
    if (keyVal.key[0] !== InputTypes.POR_COMMITMENT) {
      throw new Error(
        "Decode Error: could not decode porCommitment with key 0x" + toHex(keyVal.key)
      );
    }
    return toUtf8(keyVal.value);
  }
  function encode12(data) {
    const key = new Uint8Array([InputTypes.POR_COMMITMENT]);
    return {
      key,
      value: fromUtf8(data)
    };
  }
  var expected6 = "string";
  function check7(data) {
    return typeof data === "string";
  }
  function canAdd4(currentData, newData) {
    return !!currentData && !!newData && currentData.porCommitment === void 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/sighashType.js
  var sighashType_exports = {};
  __export(sighashType_exports, {
    canAdd: () => canAdd5,
    check: () => check8,
    decode: () => decode12,
    encode: () => encode13,
    expected: () => expected7
  });
  function decode12(keyVal) {
    if (keyVal.key[0] !== InputTypes.SIGHASH_TYPE) {
      throw new Error(
        "Decode Error: could not decode sighashType with key 0x" + toHex(keyVal.key)
      );
    }
    return Number(readUInt32(keyVal.value, 0, "LE"));
  }
  function encode13(data) {
    const key = Uint8Array.from([InputTypes.SIGHASH_TYPE]);
    const value2 = new Uint8Array(4);
    writeUInt32(value2, 0, data, "LE");
    return {
      key,
      value: value2
    };
  }
  var expected7 = "number";
  function check8(data) {
    return typeof data === "number";
  }
  function canAdd5(currentData, newData) {
    return !!currentData && !!newData && currentData.sighashType === void 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/tapKeySig.js
  var tapKeySig_exports = {};
  __export(tapKeySig_exports, {
    canAdd: () => canAdd6,
    check: () => check9,
    decode: () => decode13,
    encode: () => encode14,
    expected: () => expected8
  });
  function decode13(keyVal) {
    if (keyVal.key[0] !== InputTypes.TAP_KEY_SIG || keyVal.key.length !== 1) {
      throw new Error(
        "Decode Error: could not decode tapKeySig with key 0x" + toHex(keyVal.key)
      );
    }
    if (!check9(keyVal.value)) {
      throw new Error(
        "Decode Error: tapKeySig not a valid 64-65-byte BIP340 signature"
      );
    }
    return keyVal.value;
  }
  function encode14(value2) {
    const key = Uint8Array.from([InputTypes.TAP_KEY_SIG]);
    return { key, value: value2 };
  }
  var expected8 = "Uint8Array";
  function check9(data) {
    return data instanceof Uint8Array && (data.length === 64 || data.length === 65);
  }
  function canAdd6(currentData, newData) {
    return !!currentData && !!newData && currentData.tapKeySig === void 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/tapLeafScript.js
  var tapLeafScript_exports = {};
  __export(tapLeafScript_exports, {
    canAddToArray: () => canAddToArray3,
    check: () => check10,
    decode: () => decode14,
    encode: () => encode15,
    expected: () => expected9
  });
  function decode14(keyVal) {
    if (keyVal.key[0] !== InputTypes.TAP_LEAF_SCRIPT) {
      throw new Error(
        "Decode Error: could not decode tapLeafScript with key 0x" + toHex(keyVal.key)
      );
    }
    if ((keyVal.key.length - 2) % 32 !== 0) {
      throw new Error(
        "Decode Error: tapLeafScript has invalid control block in key 0x" + toHex(keyVal.key)
      );
    }
    const leafVersion = keyVal.value[keyVal.value.length - 1];
    if ((keyVal.key[1] & 254) !== leafVersion) {
      throw new Error(
        "Decode Error: tapLeafScript bad leaf version in key 0x" + toHex(keyVal.key)
      );
    }
    const script = keyVal.value.slice(0, -1);
    const controlBlock = keyVal.key.slice(1);
    return { controlBlock, script, leafVersion };
  }
  function encode15(tScript) {
    const head = Uint8Array.from([InputTypes.TAP_LEAF_SCRIPT]);
    const verBuf = Uint8Array.from([tScript.leafVersion]);
    return {
      key: concat([head, tScript.controlBlock]),
      value: concat([tScript.script, verBuf])
    };
  }
  var expected9 = "{ controlBlock: Uint8Array; leafVersion: number, script: Uint8Array; }";
  function check10(data) {
    return data.controlBlock instanceof Uint8Array && (data.controlBlock.length - 1) % 32 === 0 && (data.controlBlock[0] & 254) === data.leafVersion && data.script instanceof Uint8Array;
  }
  function canAddToArray3(array2, item, dupeSet) {
    const dupeString = toHex(item.controlBlock);
    if (dupeSet.has(dupeString)) return false;
    dupeSet.add(dupeString);
    return array2.filter((v) => compare(v.controlBlock, item.controlBlock) === 0).length === 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/tapMerkleRoot.js
  var tapMerkleRoot_exports = {};
  __export(tapMerkleRoot_exports, {
    canAdd: () => canAdd7,
    check: () => check11,
    decode: () => decode15,
    encode: () => encode16,
    expected: () => expected10
  });
  function decode15(keyVal) {
    if (keyVal.key[0] !== InputTypes.TAP_MERKLE_ROOT || keyVal.key.length !== 1) {
      throw new Error(
        "Decode Error: could not decode tapMerkleRoot with key 0x" + toHex(keyVal.key)
      );
    }
    if (!check11(keyVal.value)) {
      throw new Error("Decode Error: tapMerkleRoot not a 32-byte hash");
    }
    return keyVal.value;
  }
  function encode16(value2) {
    const key = Uint8Array.from([InputTypes.TAP_MERKLE_ROOT]);
    return { key, value: value2 };
  }
  var expected10 = "Uint8Array";
  function check11(data) {
    return data instanceof Uint8Array && data.length === 32;
  }
  function canAdd7(currentData, newData) {
    return !!currentData && !!newData && currentData.tapMerkleRoot === void 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/tapScriptSig.js
  var tapScriptSig_exports = {};
  __export(tapScriptSig_exports, {
    canAddToArray: () => canAddToArray4,
    check: () => check12,
    decode: () => decode16,
    encode: () => encode17,
    expected: () => expected11
  });
  function decode16(keyVal) {
    if (keyVal.key[0] !== InputTypes.TAP_SCRIPT_SIG) {
      throw new Error(
        "Decode Error: could not decode tapScriptSig with key 0x" + toHex(keyVal.key)
      );
    }
    if (keyVal.key.length !== 65) {
      throw new Error(
        "Decode Error: tapScriptSig has invalid key 0x" + toHex(keyVal.key)
      );
    }
    if (keyVal.value.length !== 64 && keyVal.value.length !== 65) {
      throw new Error(
        "Decode Error: tapScriptSig has invalid signature in key 0x" + toHex(keyVal.key)
      );
    }
    const pubkey = keyVal.key.slice(1, 33);
    const leafHash = keyVal.key.slice(33);
    return {
      pubkey,
      leafHash,
      signature: keyVal.value
    };
  }
  function encode17(tSig) {
    const head = Uint8Array.from([InputTypes.TAP_SCRIPT_SIG]);
    return {
      key: concat([head, tSig.pubkey, tSig.leafHash]),
      value: tSig.signature
    };
  }
  var expected11 = "{ pubkey: Uint8Array; leafHash: Uint8Array; signature: Uint8Array; }";
  function check12(data) {
    return data.pubkey instanceof Uint8Array && data.leafHash instanceof Uint8Array && data.signature instanceof Uint8Array && data.pubkey.length === 32 && data.leafHash.length === 32 && (data.signature.length === 64 || data.signature.length === 65);
  }
  function canAddToArray4(array2, item, dupeSet) {
    const dupeString = toHex(item.pubkey) + toHex(item.leafHash);
    if (dupeSet.has(dupeString)) return false;
    dupeSet.add(dupeString);
    return array2.filter(
      (v) => compare(v.pubkey, item.pubkey) === 0 && compare(v.leafHash, item.leafHash) === 0
    ).length === 0;
  }

  // node_modules/bip174/src/esm/lib/converter/input/witnessUtxo.js
  var witnessUtxo_exports = {};
  __export(witnessUtxo_exports, {
    canAdd: () => canAdd8,
    check: () => check13,
    decode: () => decode17,
    encode: () => encode18,
    expected: () => expected12
  });
  function decode17(keyVal) {
    if (keyVal.key[0] !== InputTypes.WITNESS_UTXO) {
      throw new Error(
        "Decode Error: could not decode witnessUtxo with key 0x" + toHex(keyVal.key)
      );
    }
    const value2 = readInt64(keyVal.value, 0, "LE");
    let _offset = 8;
    const { numberValue: scriptLen, bytes } = decode5(
      keyVal.value,
      _offset
    );
    _offset += bytes;
    const script = keyVal.value.slice(_offset);
    if (script.length !== scriptLen) {
      throw new Error("Decode Error: WITNESS_UTXO script is not proper length");
    }
    return {
      script,
      value: value2
    };
  }
  function encode18(data) {
    const { script, value: value2 } = data;
    const varuintlen = encodingLength2(script.length);
    const result = new Uint8Array(8 + varuintlen + script.length);
    writeInt64(result, 0, BigInt(value2), "LE");
    encode5(script.length, result, 8);
    result.set(script, 8 + varuintlen);
    return {
      key: Uint8Array.from([InputTypes.WITNESS_UTXO]),
      value: result
    };
  }
  var expected12 = "{ script: Uint8Array; value: bigint; }";
  function check13(data) {
    return data.script instanceof Uint8Array && typeof data.value === "bigint";
  }
  function canAdd8(currentData, newData) {
    return !!currentData && !!newData && currentData.witnessUtxo === void 0;
  }

  // node_modules/bip174/src/esm/lib/converter/output/tapTree.js
  var tapTree_exports = {};
  __export(tapTree_exports, {
    canAdd: () => canAdd9,
    check: () => check14,
    decode: () => decode18,
    encode: () => encode19,
    expected: () => expected13
  });
  function decode18(keyVal) {
    if (keyVal.key[0] !== OutputTypes.TAP_TREE || keyVal.key.length !== 1) {
      throw new Error(
        "Decode Error: could not decode tapTree with key 0x" + toHex(keyVal.key)
      );
    }
    let _offset = 0;
    const data = [];
    while (_offset < keyVal.value.length) {
      const depth = keyVal.value[_offset++];
      const leafVersion = keyVal.value[_offset++];
      const { numberValue: scriptLen, bytes } = decode5(
        keyVal.value,
        _offset
      );
      _offset += bytes;
      data.push({
        depth,
        leafVersion,
        script: keyVal.value.slice(_offset, _offset + scriptLen)
      });
      _offset += scriptLen;
    }
    return { leaves: data };
  }
  function encode19(tree) {
    const key = Uint8Array.from([OutputTypes.TAP_TREE]);
    const bufs = [].concat(
      ...tree.leaves.map((tapLeaf) => [
        Uint8Array.of(tapLeaf.depth, tapLeaf.leafVersion),
        encode5(BigInt(tapLeaf.script.length)).buffer,
        tapLeaf.script
      ])
    );
    return {
      key,
      value: concat(bufs)
    };
  }
  var expected13 = "{ leaves: [{ depth: number; leafVersion: number, script: Uint8Array; }] }";
  function check14(data) {
    return Array.isArray(data.leaves) && data.leaves.every(
      (tapLeaf) => tapLeaf.depth >= 0 && tapLeaf.depth <= 128 && (tapLeaf.leafVersion & 254) === tapLeaf.leafVersion && tapLeaf.script instanceof Uint8Array
    );
  }
  function canAdd9(currentData, newData) {
    return !!currentData && !!newData && currentData.tapTree === void 0;
  }

  // node_modules/bip174/src/esm/lib/converter/shared/bip32Derivation.js
  var range2 = (n) => [...Array(n).keys()];
  var isValidDERKey = (pubkey) => pubkey.length === 33 && [2, 3].includes(pubkey[0]) || pubkey.length === 65 && 4 === pubkey[0];
  function makeConverter(TYPE_BYTE, isValidPubkey = isValidDERKey) {
    function decode19(keyVal) {
      if (keyVal.key[0] !== TYPE_BYTE) {
        throw new Error(
          "Decode Error: could not decode bip32Derivation with key 0x" + toHex(keyVal.key)
        );
      }
      const pubkey = keyVal.key.slice(1);
      if (!isValidPubkey(pubkey)) {
        throw new Error(
          "Decode Error: bip32Derivation has invalid pubkey in key 0x" + toHex(keyVal.key)
        );
      }
      if (keyVal.value.length / 4 % 1 !== 0) {
        throw new Error(
          "Decode Error: Input BIP32_DERIVATION value length should be multiple of 4"
        );
      }
      const data = {
        masterFingerprint: keyVal.value.slice(0, 4),
        pubkey,
        path: "m"
      };
      for (const i of range2(keyVal.value.length / 4 - 1)) {
        const val = readUInt32(keyVal.value, i * 4 + 4, "LE");
        const isHard = !!(val & 2147483648);
        const idx = val & 2147483647;
        data.path += "/" + idx.toString(10) + (isHard ? "'" : "");
      }
      return data;
    }
    function encode20(data) {
      const head = Uint8Array.from([TYPE_BYTE]);
      const key = concat([head, data.pubkey]);
      const splitPath = data.path.split("/");
      const value2 = new Uint8Array(splitPath.length * 4);
      value2.set(data.masterFingerprint, 0);
      let offset = 4;
      splitPath.slice(1).forEach((level) => {
        const isHard = level.slice(-1) === "'";
        let num = 2147483647 & parseInt(isHard ? level.slice(0, -1) : level, 10);
        if (isHard) num += 2147483648;
        writeUInt32(value2, offset, num, "LE");
        offset += 4;
      });
      return {
        key,
        value: value2
      };
    }
    const expected14 = "{ masterFingerprint: Uint8Array; pubkey: Uint8Array; path: string; }";
    function check15(data) {
      return data.pubkey instanceof Uint8Array && data.masterFingerprint instanceof Uint8Array && typeof data.path === "string" && isValidPubkey(data.pubkey) && data.masterFingerprint.length === 4;
    }
    function canAddToArray5(array2, item, dupeSet) {
      const dupeString = toHex(item.pubkey);
      if (dupeSet.has(dupeString)) return false;
      dupeSet.add(dupeString);
      return array2.filter((v) => compare(v.pubkey, item.pubkey) === 0).length === 0;
    }
    return {
      decode: decode19,
      encode: encode20,
      check: check15,
      expected: expected14,
      canAddToArray: canAddToArray5
    };
  }

  // node_modules/bip174/src/esm/lib/converter/shared/checkPubkey.js
  function makeChecker(pubkeyTypes) {
    return checkPubkey;
    function checkPubkey(keyVal) {
      let pubkey;
      if (pubkeyTypes.includes(keyVal.key[0])) {
        pubkey = keyVal.key.slice(1);
        if (!(pubkey.length === 33 || pubkey.length === 65) || ![2, 3, 4].includes(pubkey[0])) {
          throw new Error(
            "Format Error: invalid pubkey in key 0x" + toHex(keyVal.key)
          );
        }
      }
      return pubkey;
    }
  }

  // node_modules/bip174/src/esm/lib/converter/shared/redeemScript.js
  function makeConverter2(TYPE_BYTE) {
    function decode19(keyVal) {
      if (keyVal.key[0] !== TYPE_BYTE) {
        throw new Error(
          "Decode Error: could not decode redeemScript with key 0x" + toHex(keyVal.key)
        );
      }
      return keyVal.value;
    }
    function encode20(data) {
      const key = Uint8Array.from([TYPE_BYTE]);
      return {
        key,
        value: data
      };
    }
    const expected14 = "Uint8Array";
    function check15(data) {
      return data instanceof Uint8Array;
    }
    function canAdd10(currentData, newData) {
      return !!currentData && !!newData && currentData.redeemScript === void 0;
    }
    return {
      decode: decode19,
      encode: encode20,
      check: check15,
      expected: expected14,
      canAdd: canAdd10
    };
  }

  // node_modules/bip174/src/esm/lib/converter/shared/tapBip32Derivation.js
  var isValidBIP340Key = (pubkey) => pubkey.length === 32;
  function makeConverter3(TYPE_BYTE) {
    const parent = makeConverter(TYPE_BYTE, isValidBIP340Key);
    function decode19(keyVal) {
      const { numberValue: nHashes, bytes: nHashesLen } = decode5(
        keyVal.value
      );
      const base2 = parent.decode({
        key: keyVal.key,
        value: keyVal.value.slice(nHashesLen + Number(nHashes) * 32)
      });
      const leafHashes = new Array(Number(nHashes));
      for (let i = 0, _offset = nHashesLen; i < nHashes; i++, _offset += 32) {
        leafHashes[i] = keyVal.value.slice(_offset, _offset + 32);
      }
      return { ...base2, leafHashes };
    }
    function encode20(data) {
      const base2 = parent.encode(data);
      const nHashesLen = encodingLength2(data.leafHashes.length);
      const nHashesBuf = new Uint8Array(nHashesLen);
      encode5(data.leafHashes.length, nHashesBuf);
      const value2 = concat([nHashesBuf, ...data.leafHashes, base2.value]);
      return { ...base2, value: value2 };
    }
    const expected14 = "{ masterFingerprint: Uint8Array; pubkey: Uint8Array; path: string; leafHashes: Uint8Array[]; }";
    function check15(data) {
      return Array.isArray(data.leafHashes) && data.leafHashes.every(
        (leafHash) => leafHash instanceof Uint8Array && leafHash.length === 32
      ) && parent.check(data);
    }
    return {
      decode: decode19,
      encode: encode20,
      check: check15,
      expected: expected14,
      canAddToArray: parent.canAddToArray
    };
  }

  // node_modules/bip174/src/esm/lib/converter/shared/tapInternalKey.js
  function makeConverter4(TYPE_BYTE) {
    function decode19(keyVal) {
      if (keyVal.key[0] !== TYPE_BYTE || keyVal.key.length !== 1) {
        throw new Error(
          "Decode Error: could not decode tapInternalKey with key 0x" + toHex(keyVal.key)
        );
      }
      if (keyVal.value.length !== 32) {
        throw new Error(
          "Decode Error: tapInternalKey not a 32-byte x-only pubkey"
        );
      }
      return keyVal.value;
    }
    function encode20(value2) {
      const key = Uint8Array.from([TYPE_BYTE]);
      return { key, value: value2 };
    }
    const expected14 = "Uint8Array";
    function check15(data) {
      return data instanceof Uint8Array && data.length === 32;
    }
    function canAdd10(currentData, newData) {
      return !!currentData && !!newData && currentData.tapInternalKey === void 0;
    }
    return {
      decode: decode19,
      encode: encode20,
      check: check15,
      expected: expected14,
      canAdd: canAdd10
    };
  }

  // node_modules/bip174/src/esm/lib/converter/shared/witnessScript.js
  function makeConverter5(TYPE_BYTE) {
    function decode19(keyVal) {
      if (keyVal.key[0] !== TYPE_BYTE) {
        throw new Error(
          "Decode Error: could not decode witnessScript with key 0x" + toHex(keyVal.key)
        );
      }
      return keyVal.value;
    }
    function encode20(data) {
      const key = Uint8Array.from([TYPE_BYTE]);
      return {
        key,
        value: data
      };
    }
    const expected14 = "Uint8Array";
    function check15(data) {
      return data instanceof Uint8Array;
    }
    function canAdd10(currentData, newData) {
      return !!currentData && !!newData && currentData.witnessScript === void 0;
    }
    return {
      decode: decode19,
      encode: encode20,
      check: check15,
      expected: expected14,
      canAdd: canAdd10
    };
  }

  // node_modules/bip174/src/esm/lib/converter/index.js
  var globals = {
    unsignedTx: unsignedTx_exports,
    globalXpub: globalXpub_exports,
    // pass an Array of key bytes that require pubkey beside the key
    checkPubkey: makeChecker([])
  };
  var inputs = {
    nonWitnessUtxo: nonWitnessUtxo_exports,
    partialSig: partialSig_exports,
    sighashType: sighashType_exports,
    finalScriptSig: finalScriptSig_exports,
    finalScriptWitness: finalScriptWitness_exports,
    porCommitment: porCommitment_exports,
    witnessUtxo: witnessUtxo_exports,
    bip32Derivation: makeConverter(InputTypes.BIP32_DERIVATION),
    redeemScript: makeConverter2(InputTypes.REDEEM_SCRIPT),
    witnessScript: makeConverter5(InputTypes.WITNESS_SCRIPT),
    checkPubkey: makeChecker([
      InputTypes.PARTIAL_SIG,
      InputTypes.BIP32_DERIVATION
    ]),
    tapKeySig: tapKeySig_exports,
    tapScriptSig: tapScriptSig_exports,
    tapLeafScript: tapLeafScript_exports,
    tapBip32Derivation: makeConverter3(
      InputTypes.TAP_BIP32_DERIVATION
    ),
    tapInternalKey: makeConverter4(InputTypes.TAP_INTERNAL_KEY),
    tapMerkleRoot: tapMerkleRoot_exports
  };
  var outputs = {
    bip32Derivation: makeConverter(OutputTypes.BIP32_DERIVATION),
    redeemScript: makeConverter2(OutputTypes.REDEEM_SCRIPT),
    witnessScript: makeConverter5(OutputTypes.WITNESS_SCRIPT),
    checkPubkey: makeChecker([OutputTypes.BIP32_DERIVATION]),
    tapBip32Derivation: makeConverter3(
      OutputTypes.TAP_BIP32_DERIVATION
    ),
    tapTree: tapTree_exports,
    tapInternalKey: makeConverter4(OutputTypes.TAP_INTERNAL_KEY)
  };

  // node_modules/bip174/src/esm/lib/converter/tools.js
  var range3 = (n) => [...Array(n).keys()];
  function keyValsToBuffer(keyVals) {
    const buffers = keyVals.map(keyValToBuffer);
    buffers.push(Uint8Array.from([0]));
    return concat(buffers);
  }
  function keyValToBuffer(keyVal) {
    const keyLen = keyVal.key.length;
    const valLen = keyVal.value.length;
    const keyVarIntLen = encodingLength2(keyLen);
    const valVarIntLen = encodingLength2(valLen);
    const buffer = new Uint8Array(keyVarIntLen + keyLen + valVarIntLen + valLen);
    encode5(keyLen, buffer, 0);
    buffer.set(keyVal.key, keyVarIntLen);
    encode5(valLen, buffer, keyVarIntLen + keyLen);
    buffer.set(keyVal.value, keyVarIntLen + keyLen + valVarIntLen);
    return buffer;
  }

  // node_modules/bip174/src/esm/lib/parser/fromBuffer.js
  function psbtFromBuffer(buffer, txGetter) {
    let offset = 0;
    function varSlice() {
      const { numberValue: keyLen, bytes } = decode5(buffer, offset);
      offset += bytes;
      const key = buffer.slice(offset, offset + Number(keyLen));
      offset += Number(keyLen);
      return key;
    }
    function readUInt32BE() {
      const num = readUInt32(buffer, offset, "BE");
      offset += 4;
      return num;
    }
    function readUInt82() {
      const num = readUInt8(buffer, offset);
      offset += 1;
      return num;
    }
    function getKeyValue() {
      const key = varSlice();
      const value2 = varSlice();
      return {
        key,
        value: value2
      };
    }
    function checkEndOfKeyValPairs() {
      if (offset >= buffer.length) {
        throw new Error("Format Error: Unexpected End of PSBT");
      }
      const isEnd = readUInt8(buffer, offset) === 0;
      if (isEnd) {
        offset++;
      }
      return isEnd;
    }
    if (readUInt32BE() !== 1886610036) {
      throw new Error("Format Error: Invalid Magic Number");
    }
    if (readUInt82() !== 255) {
      throw new Error(
        "Format Error: Magic Number must be followed by 0xff separator"
      );
    }
    const globalMapKeyVals = [];
    const globalKeyIndex = {};
    while (!checkEndOfKeyValPairs()) {
      const keyVal = getKeyValue();
      const hexKey = toHex(keyVal.key);
      if (globalKeyIndex[hexKey]) {
        throw new Error(
          "Format Error: Keys must be unique for global keymap: key " + hexKey
        );
      }
      globalKeyIndex[hexKey] = 1;
      globalMapKeyVals.push(keyVal);
    }
    const unsignedTxMaps = globalMapKeyVals.filter(
      (keyVal) => keyVal.key[0] === GlobalTypes.UNSIGNED_TX
    );
    if (unsignedTxMaps.length !== 1) {
      throw new Error("Format Error: Only one UNSIGNED_TX allowed");
    }
    const unsignedTx = txGetter(unsignedTxMaps[0].value);
    const { inputCount, outputCount } = unsignedTx.getInputOutputCounts();
    const inputKeyVals = [];
    const outputKeyVals = [];
    for (const index of range3(inputCount)) {
      const inputKeyIndex = {};
      const input = [];
      while (!checkEndOfKeyValPairs()) {
        const keyVal = getKeyValue();
        const hexKey = toHex(keyVal.key);
        if (inputKeyIndex[hexKey]) {
          throw new Error(
            "Format Error: Keys must be unique for each input: input index " + index + " key " + hexKey
          );
        }
        inputKeyIndex[hexKey] = 1;
        input.push(keyVal);
      }
      inputKeyVals.push(input);
    }
    for (const index of range3(outputCount)) {
      const outputKeyIndex = {};
      const output = [];
      while (!checkEndOfKeyValPairs()) {
        const keyVal = getKeyValue();
        const hexKey = toHex(keyVal.key);
        if (outputKeyIndex[hexKey]) {
          throw new Error(
            "Format Error: Keys must be unique for each output: output index " + index + " key " + hexKey
          );
        }
        outputKeyIndex[hexKey] = 1;
        output.push(keyVal);
      }
      outputKeyVals.push(output);
    }
    return psbtFromKeyVals(unsignedTx, {
      globalMapKeyVals,
      inputKeyVals,
      outputKeyVals
    });
  }
  function checkKeyBuffer(type, keyBuf, keyNum) {
    if (compare(keyBuf, Uint8Array.from([keyNum]))) {
      throw new Error(
        // `Format Error: Invalid ${type} key: ${keyBuf.toString('hex')}`,
        `Format Error: Invalid ${type} key: ${toHex(keyBuf)}`
      );
    }
  }
  function psbtFromKeyVals(unsignedTx, { globalMapKeyVals, inputKeyVals, outputKeyVals }) {
    const globalMap = {
      unsignedTx
    };
    let txCount = 0;
    for (const keyVal of globalMapKeyVals) {
      switch (keyVal.key[0]) {
        case GlobalTypes.UNSIGNED_TX:
          checkKeyBuffer("global", keyVal.key, GlobalTypes.UNSIGNED_TX);
          if (txCount > 0) {
            throw new Error("Format Error: GlobalMap has multiple UNSIGNED_TX");
          }
          txCount++;
          break;
        case GlobalTypes.GLOBAL_XPUB:
          if (globalMap.globalXpub === void 0) {
            globalMap.globalXpub = [];
          }
          globalMap.globalXpub.push(globals.globalXpub.decode(keyVal));
          break;
        default:
          if (!globalMap.unknownKeyVals) globalMap.unknownKeyVals = [];
          globalMap.unknownKeyVals.push(keyVal);
      }
    }
    const inputCount = inputKeyVals.length;
    const outputCount = outputKeyVals.length;
    const inputs2 = [];
    const outputs2 = [];
    for (const index of range3(inputCount)) {
      const input = {};
      for (const keyVal of inputKeyVals[index]) {
        inputs.checkPubkey(keyVal);
        switch (keyVal.key[0]) {
          case InputTypes.NON_WITNESS_UTXO:
            checkKeyBuffer("input", keyVal.key, InputTypes.NON_WITNESS_UTXO);
            if (input.nonWitnessUtxo !== void 0) {
              throw new Error(
                "Format Error: Input has multiple NON_WITNESS_UTXO"
              );
            }
            input.nonWitnessUtxo = inputs.nonWitnessUtxo.decode(keyVal);
            break;
          case InputTypes.WITNESS_UTXO:
            checkKeyBuffer("input", keyVal.key, InputTypes.WITNESS_UTXO);
            if (input.witnessUtxo !== void 0) {
              throw new Error("Format Error: Input has multiple WITNESS_UTXO");
            }
            input.witnessUtxo = inputs.witnessUtxo.decode(keyVal);
            break;
          case InputTypes.PARTIAL_SIG:
            if (input.partialSig === void 0) {
              input.partialSig = [];
            }
            input.partialSig.push(inputs.partialSig.decode(keyVal));
            break;
          case InputTypes.SIGHASH_TYPE:
            checkKeyBuffer("input", keyVal.key, InputTypes.SIGHASH_TYPE);
            if (input.sighashType !== void 0) {
              throw new Error("Format Error: Input has multiple SIGHASH_TYPE");
            }
            input.sighashType = inputs.sighashType.decode(keyVal);
            break;
          case InputTypes.REDEEM_SCRIPT:
            checkKeyBuffer("input", keyVal.key, InputTypes.REDEEM_SCRIPT);
            if (input.redeemScript !== void 0) {
              throw new Error("Format Error: Input has multiple REDEEM_SCRIPT");
            }
            input.redeemScript = inputs.redeemScript.decode(keyVal);
            break;
          case InputTypes.WITNESS_SCRIPT:
            checkKeyBuffer("input", keyVal.key, InputTypes.WITNESS_SCRIPT);
            if (input.witnessScript !== void 0) {
              throw new Error("Format Error: Input has multiple WITNESS_SCRIPT");
            }
            input.witnessScript = inputs.witnessScript.decode(keyVal);
            break;
          case InputTypes.BIP32_DERIVATION:
            if (input.bip32Derivation === void 0) {
              input.bip32Derivation = [];
            }
            input.bip32Derivation.push(
              inputs.bip32Derivation.decode(keyVal)
            );
            break;
          case InputTypes.FINAL_SCRIPTSIG:
            checkKeyBuffer("input", keyVal.key, InputTypes.FINAL_SCRIPTSIG);
            input.finalScriptSig = inputs.finalScriptSig.decode(keyVal);
            break;
          case InputTypes.FINAL_SCRIPTWITNESS:
            checkKeyBuffer("input", keyVal.key, InputTypes.FINAL_SCRIPTWITNESS);
            input.finalScriptWitness = inputs.finalScriptWitness.decode(
              keyVal
            );
            break;
          case InputTypes.POR_COMMITMENT:
            checkKeyBuffer("input", keyVal.key, InputTypes.POR_COMMITMENT);
            input.porCommitment = inputs.porCommitment.decode(keyVal);
            break;
          case InputTypes.TAP_KEY_SIG:
            checkKeyBuffer("input", keyVal.key, InputTypes.TAP_KEY_SIG);
            input.tapKeySig = inputs.tapKeySig.decode(keyVal);
            break;
          case InputTypes.TAP_SCRIPT_SIG:
            if (input.tapScriptSig === void 0) {
              input.tapScriptSig = [];
            }
            input.tapScriptSig.push(inputs.tapScriptSig.decode(keyVal));
            break;
          case InputTypes.TAP_LEAF_SCRIPT:
            if (input.tapLeafScript === void 0) {
              input.tapLeafScript = [];
            }
            input.tapLeafScript.push(inputs.tapLeafScript.decode(keyVal));
            break;
          case InputTypes.TAP_BIP32_DERIVATION:
            if (input.tapBip32Derivation === void 0) {
              input.tapBip32Derivation = [];
            }
            input.tapBip32Derivation.push(
              inputs.tapBip32Derivation.decode(keyVal)
            );
            break;
          case InputTypes.TAP_INTERNAL_KEY:
            checkKeyBuffer("input", keyVal.key, InputTypes.TAP_INTERNAL_KEY);
            input.tapInternalKey = inputs.tapInternalKey.decode(keyVal);
            break;
          case InputTypes.TAP_MERKLE_ROOT:
            checkKeyBuffer("input", keyVal.key, InputTypes.TAP_MERKLE_ROOT);
            input.tapMerkleRoot = inputs.tapMerkleRoot.decode(keyVal);
            break;
          default:
            if (!input.unknownKeyVals) input.unknownKeyVals = [];
            input.unknownKeyVals.push(keyVal);
        }
      }
      inputs2.push(input);
    }
    for (const index of range3(outputCount)) {
      const output = {};
      for (const keyVal of outputKeyVals[index]) {
        outputs.checkPubkey(keyVal);
        switch (keyVal.key[0]) {
          case OutputTypes.REDEEM_SCRIPT:
            checkKeyBuffer("output", keyVal.key, OutputTypes.REDEEM_SCRIPT);
            if (output.redeemScript !== void 0) {
              throw new Error("Format Error: Output has multiple REDEEM_SCRIPT");
            }
            output.redeemScript = outputs.redeemScript.decode(keyVal);
            break;
          case OutputTypes.WITNESS_SCRIPT:
            checkKeyBuffer("output", keyVal.key, OutputTypes.WITNESS_SCRIPT);
            if (output.witnessScript !== void 0) {
              throw new Error("Format Error: Output has multiple WITNESS_SCRIPT");
            }
            output.witnessScript = outputs.witnessScript.decode(keyVal);
            break;
          case OutputTypes.BIP32_DERIVATION:
            if (output.bip32Derivation === void 0) {
              output.bip32Derivation = [];
            }
            output.bip32Derivation.push(
              outputs.bip32Derivation.decode(keyVal)
            );
            break;
          case OutputTypes.TAP_INTERNAL_KEY:
            checkKeyBuffer("output", keyVal.key, OutputTypes.TAP_INTERNAL_KEY);
            output.tapInternalKey = outputs.tapInternalKey.decode(keyVal);
            break;
          case OutputTypes.TAP_TREE:
            checkKeyBuffer("output", keyVal.key, OutputTypes.TAP_TREE);
            output.tapTree = outputs.tapTree.decode(keyVal);
            break;
          case OutputTypes.TAP_BIP32_DERIVATION:
            if (output.tapBip32Derivation === void 0) {
              output.tapBip32Derivation = [];
            }
            output.tapBip32Derivation.push(
              outputs.tapBip32Derivation.decode(keyVal)
            );
            break;
          default:
            if (!output.unknownKeyVals) output.unknownKeyVals = [];
            output.unknownKeyVals.push(keyVal);
        }
      }
      outputs2.push(output);
    }
    return { globalMap, inputs: inputs2, outputs: outputs2 };
  }

  // node_modules/bip174/src/esm/lib/parser/toBuffer.js
  function psbtToBuffer({ globalMap, inputs: inputs2, outputs: outputs2 }) {
    const { globalKeyVals, inputKeyVals, outputKeyVals } = psbtToKeyVals({
      globalMap,
      inputs: inputs2,
      outputs: outputs2
    });
    const globalBuffer = keyValsToBuffer(globalKeyVals);
    const keyValsOrEmptyToBuffer = (keyVals) => keyVals.length === 0 ? [Uint8Array.from([0])] : keyVals.map(keyValsToBuffer);
    const inputBuffers = keyValsOrEmptyToBuffer(inputKeyVals);
    const outputBuffers = keyValsOrEmptyToBuffer(outputKeyVals);
    const header = new Uint8Array(5);
    header.set([112, 115, 98, 116, 255], 0);
    return concat(
      [header, globalBuffer].concat(inputBuffers, outputBuffers)
    );
  }
  var sortKeyVals = (a, b) => {
    return compare(a.key, b.key);
  };
  function keyValsFromMap(keyValMap, converterFactory) {
    const keyHexSet = /* @__PURE__ */ new Set();
    const keyVals = Object.entries(keyValMap).reduce((result, [key, value2]) => {
      if (key === "unknownKeyVals") return result;
      const converter = converterFactory[key];
      if (converter === void 0) return result;
      const encodedKeyVals = (Array.isArray(value2) ? value2 : [value2]).map(
        converter.encode
      );
      const keyHexes = encodedKeyVals.map((kv) => toHex(kv.key));
      keyHexes.forEach((hex) => {
        if (keyHexSet.has(hex))
          throw new Error("Serialize Error: Duplicate key: " + hex);
        keyHexSet.add(hex);
      });
      return result.concat(encodedKeyVals);
    }, []);
    const otherKeyVals = keyValMap.unknownKeyVals ? keyValMap.unknownKeyVals.filter((keyVal) => {
      return !keyHexSet.has(toHex(keyVal.key));
    }) : [];
    return keyVals.concat(otherKeyVals).sort(sortKeyVals);
  }
  function psbtToKeyVals({ globalMap, inputs: inputs2, outputs: outputs2 }) {
    return {
      globalKeyVals: keyValsFromMap(globalMap, globals),
      inputKeyVals: inputs2.map((i) => keyValsFromMap(i, inputs)),
      outputKeyVals: outputs2.map((o) => keyValsFromMap(o, outputs))
    };
  }

  // node_modules/bip174/src/esm/lib/combiner/index.js
  function combine(psbts) {
    const self = psbts[0];
    const selfKeyVals = psbtToKeyVals(self);
    const others = psbts.slice(1);
    if (others.length === 0) throw new Error("Combine: Nothing to combine");
    const selfTx = getTx(self);
    if (selfTx === void 0) {
      throw new Error("Combine: Self missing transaction");
    }
    const selfGlobalSet = getKeySet(selfKeyVals.globalKeyVals);
    const selfInputSets = selfKeyVals.inputKeyVals.map(getKeySet);
    const selfOutputSets = selfKeyVals.outputKeyVals.map(getKeySet);
    for (const other of others) {
      const otherTx = getTx(other);
      if (otherTx === void 0 || compare(otherTx.toBuffer(), selfTx.toBuffer()) !== 0) {
        throw new Error(
          "Combine: One of the Psbts does not have the same transaction."
        );
      }
      const otherKeyVals = psbtToKeyVals(other);
      const otherGlobalSet = getKeySet(otherKeyVals.globalKeyVals);
      otherGlobalSet.forEach(
        keyPusher(
          selfGlobalSet,
          selfKeyVals.globalKeyVals,
          otherKeyVals.globalKeyVals
        )
      );
      const otherInputSets = otherKeyVals.inputKeyVals.map(getKeySet);
      otherInputSets.forEach(
        (inputSet, idx) => inputSet.forEach(
          keyPusher(
            selfInputSets[idx],
            selfKeyVals.inputKeyVals[idx],
            otherKeyVals.inputKeyVals[idx]
          )
        )
      );
      const otherOutputSets = otherKeyVals.outputKeyVals.map(getKeySet);
      otherOutputSets.forEach(
        (outputSet, idx) => outputSet.forEach(
          keyPusher(
            selfOutputSets[idx],
            selfKeyVals.outputKeyVals[idx],
            otherKeyVals.outputKeyVals[idx]
          )
        )
      );
    }
    return psbtFromKeyVals(selfTx, {
      globalMapKeyVals: selfKeyVals.globalKeyVals,
      inputKeyVals: selfKeyVals.inputKeyVals,
      outputKeyVals: selfKeyVals.outputKeyVals
    });
  }
  function keyPusher(selfSet, selfKeyVals, otherKeyVals) {
    return (key) => {
      if (selfSet.has(key)) return;
      const newKv = otherKeyVals.filter((kv) => toHex(kv.key) === key)[0];
      selfKeyVals.push(newKv);
      selfSet.add(key);
    };
  }
  function getTx(psbt) {
    return psbt.globalMap.unsignedTx;
  }
  function getKeySet(keyVals) {
    const set = /* @__PURE__ */ new Set();
    keyVals.forEach((keyVal) => {
      const hex = toHex(keyVal.key);
      if (set.has(hex))
        throw new Error("Combine: KeyValue Map keys should be unique");
      set.add(hex);
    });
    return set;
  }

  // node_modules/bip174/src/esm/lib/utils.js
  function checkForInput(inputs2, inputIndex) {
    const input = inputs2[inputIndex];
    if (input === void 0) throw new Error(`No input #${inputIndex}`);
    return input;
  }
  function checkForOutput(outputs2, outputIndex) {
    const output = outputs2[outputIndex];
    if (output === void 0) throw new Error(`No output #${outputIndex}`);
    return output;
  }
  function checkHasKey(checkKeyVal, keyVals, enumLength) {
    if (checkKeyVal.key[0] < enumLength) {
      throw new Error(
        `Use the method for your specific key instead of addUnknownKeyVal*`
      );
    }
    if (keyVals && keyVals.filter((kv) => compare(kv.key, checkKeyVal.key) === 0).length !== 0) {
      throw new Error(`Duplicate Key: ${toHex(checkKeyVal.key)}`);
    }
  }
  function getEnumLength(myenum) {
    let count = 0;
    Object.keys(myenum).forEach((val) => {
      if (Number(isNaN(Number(val)))) {
        count++;
      }
    });
    return count;
  }
  function inputCheckUncleanFinalized(inputIndex, input) {
    let result = false;
    if (input.nonWitnessUtxo || input.witnessUtxo) {
      const needScriptSig = !!input.redeemScript;
      const needWitnessScript = !!input.witnessScript;
      const scriptSigOK = !needScriptSig || !!input.finalScriptSig;
      const witnessScriptOK = !needWitnessScript || !!input.finalScriptWitness;
      const hasOneFinal = !!input.finalScriptSig || !!input.finalScriptWitness;
      result = scriptSigOK && witnessScriptOK && hasOneFinal;
    }
    if (result === false) {
      throw new Error(
        `Input #${inputIndex} has too much or too little data to clean`
      );
    }
  }
  function throwForUpdateMaker(typeName, name, expected14, data) {
    throw new Error(
      `Data for ${typeName} key ${name} is incorrect: Expected ${expected14} and got ${JSON.stringify(data)}`
    );
  }
  function updateMaker(typeName) {
    return (updateData, mainData) => {
      for (const name of Object.keys(updateData)) {
        const data = updateData[name];
        const { canAdd: canAdd10, canAddToArray: canAddToArray5, check: check15, expected: expected14 } = (
          // @ts-ignore
          converter_exports[typeName + "s"][name] || {}
        );
        const isArray = !!canAddToArray5;
        if (check15) {
          if (isArray) {
            if (!Array.isArray(data) || // @ts-ignore
            mainData[name] && !Array.isArray(mainData[name])) {
              throw new Error(`Key type ${name} must be an array`);
            }
            if (!data.every(check15)) {
              throwForUpdateMaker(typeName, name, expected14, data);
            }
            const arr = mainData[name] || [];
            const dupeCheckSet = /* @__PURE__ */ new Set();
            if (!data.every((v) => canAddToArray5(arr, v, dupeCheckSet))) {
              throw new Error("Can not add duplicate data to array");
            }
            mainData[name] = arr.concat(data);
          } else {
            if (!check15(data)) {
              throwForUpdateMaker(typeName, name, expected14, data);
            }
            if (!canAdd10(mainData, data)) {
              throw new Error(`Can not add duplicate data to ${typeName}`);
            }
            mainData[name] = data;
          }
        }
      }
    };
  }
  var updateGlobal = updateMaker("global");
  var updateInput = updateMaker("input");
  var updateOutput = updateMaker("output");
  function addInputAttributes(inputs2, data) {
    const index = inputs2.length - 1;
    const input = checkForInput(inputs2, index);
    updateInput(data, input);
  }
  function addOutputAttributes(outputs2, data) {
    const index = outputs2.length - 1;
    const output = checkForOutput(outputs2, index);
    updateOutput(data, output);
  }

  // node_modules/bip174/src/esm/lib/psbt.js
  var Psbt = class {
    constructor(tx) {
      this.inputs = [];
      this.outputs = [];
      this.globalMap = {
        unsignedTx: tx
      };
    }
    static fromBase64(data, txFromBuffer) {
      const buffer = fromBase64(data);
      return this.fromBuffer(buffer, txFromBuffer);
    }
    static fromHex(data, txFromBuffer) {
      const buffer = fromHex(data);
      return this.fromBuffer(buffer, txFromBuffer);
    }
    static fromBuffer(buffer, txFromBuffer) {
      const results = psbtFromBuffer(buffer, txFromBuffer);
      const psbt = new this(results.globalMap.unsignedTx);
      Object.assign(psbt, results);
      return psbt;
    }
    toBase64() {
      const buffer = this.toBuffer();
      return toBase64(buffer);
    }
    toHex() {
      const buffer = this.toBuffer();
      return toHex(buffer);
    }
    toBuffer() {
      return psbtToBuffer(this);
    }
    updateGlobal(updateData) {
      updateGlobal(updateData, this.globalMap);
      return this;
    }
    updateInput(inputIndex, updateData) {
      const input = checkForInput(this.inputs, inputIndex);
      updateInput(updateData, input);
      return this;
    }
    updateOutput(outputIndex, updateData) {
      const output = checkForOutput(this.outputs, outputIndex);
      updateOutput(updateData, output);
      return this;
    }
    addUnknownKeyValToGlobal(keyVal) {
      checkHasKey(
        keyVal,
        this.globalMap.unknownKeyVals,
        getEnumLength(GlobalTypes)
      );
      if (!this.globalMap.unknownKeyVals) this.globalMap.unknownKeyVals = [];
      this.globalMap.unknownKeyVals.push(keyVal);
      return this;
    }
    addUnknownKeyValToInput(inputIndex, keyVal) {
      const input = checkForInput(this.inputs, inputIndex);
      checkHasKey(keyVal, input.unknownKeyVals, getEnumLength(InputTypes));
      if (!input.unknownKeyVals) input.unknownKeyVals = [];
      input.unknownKeyVals.push(keyVal);
      return this;
    }
    addUnknownKeyValToOutput(outputIndex, keyVal) {
      const output = checkForOutput(this.outputs, outputIndex);
      checkHasKey(keyVal, output.unknownKeyVals, getEnumLength(OutputTypes));
      if (!output.unknownKeyVals) output.unknownKeyVals = [];
      output.unknownKeyVals.push(keyVal);
      return this;
    }
    addInput(inputData) {
      this.globalMap.unsignedTx.addInput(inputData);
      this.inputs.push({
        unknownKeyVals: []
      });
      const addKeyVals = inputData.unknownKeyVals || [];
      const inputIndex = this.inputs.length - 1;
      if (!Array.isArray(addKeyVals)) {
        throw new Error("unknownKeyVals must be an Array");
      }
      addKeyVals.forEach(
        (keyVal) => this.addUnknownKeyValToInput(inputIndex, keyVal)
      );
      addInputAttributes(this.inputs, inputData);
      return this;
    }
    addOutput(outputData) {
      this.globalMap.unsignedTx.addOutput(outputData);
      this.outputs.push({
        unknownKeyVals: []
      });
      const addKeyVals = outputData.unknownKeyVals || [];
      const outputIndex = this.outputs.length - 1;
      if (!Array.isArray(addKeyVals)) {
        throw new Error("unknownKeyVals must be an Array");
      }
      addKeyVals.forEach(
        (keyVal) => this.addUnknownKeyValToOutput(outputIndex, keyVal)
      );
      addOutputAttributes(this.outputs, outputData);
      return this;
    }
    clearFinalizedInput(inputIndex) {
      const input = checkForInput(this.inputs, inputIndex);
      inputCheckUncleanFinalized(inputIndex, input);
      for (const key of Object.keys(input)) {
        if (![
          "witnessUtxo",
          "nonWitnessUtxo",
          "finalScriptSig",
          "finalScriptWitness",
          "unknownKeyVals"
        ].includes(key)) {
          delete input[key];
        }
      }
      return this;
    }
    combine(...those) {
      const result = combine([this].concat(those));
      Object.assign(this, result);
      return this;
    }
    getTransaction() {
      return this.globalMap.unsignedTx.toBuffer();
    }
  };

  // node_modules/bitcoinjs-lib/src/esm/psbt/psbtutils.js
  function isPaymentFactory(payment) {
    return (script) => {
      try {
        payment({ output: script });
        return true;
      } catch (err) {
        return false;
      }
    };
  }
  var isP2MS = isPaymentFactory(p2ms);
  var isP2PK = isPaymentFactory(p2pk);
  var isP2PKH = isPaymentFactory(p2pkh);
  var isP2WPKH = isPaymentFactory(p2wpkh);
  var isP2WSHScript = isPaymentFactory(p2wsh);
  var isP2SHScript = isPaymentFactory(p2sh);
  var isP2TR = isPaymentFactory(p2tr);
  function witnessStackToScriptWitness(witness) {
    let buffer = new Uint8Array(0);
    function writeSlice(slice) {
      buffer = concat([buffer, slice]);
    }
    function writeVarInt(i) {
      const currentLen = buffer.length;
      const varintLen = encodingLength2(i);
      buffer = concat([buffer, new Uint8Array(varintLen)]);
      encode5(i, buffer, currentLen);
    }
    function writeVarSlice(slice) {
      writeVarInt(slice.length);
      writeSlice(slice);
    }
    function writeVector(vector) {
      writeVarInt(vector.length);
      vector.forEach(writeVarSlice);
    }
    writeVector(witness);
    return buffer;
  }
  function pubkeyPositionInScript(pubkey, script) {
    const pubkeyHash = hash160(pubkey);
    const pubkeyXOnly = pubkey.slice(1, 33);
    const decompiled = decompile(script);
    if (decompiled === null) throw new Error("Unknown script error");
    return decompiled.findIndex((element) => {
      if (typeof element === "number") return false;
      return compare(pubkey, element) === 0 || compare(pubkeyHash, element) === 0 || compare(pubkeyXOnly, element) === 0;
    });
  }
  function pubkeyInScript(pubkey, script) {
    return pubkeyPositionInScript(pubkey, script) !== -1;
  }
  function checkInputForSig(input, action) {
    const pSigs = extractPartialSigs(input);
    return pSigs.some(
      (pSig) => signatureBlocksAction(pSig, signature.decode, action)
    );
  }
  function signatureBlocksAction(signature2, signatureDecodeFn, action) {
    const { hashType } = signatureDecodeFn(signature2);
    const whitelist = [];
    const isAnyoneCanPay = hashType & Transaction.SIGHASH_ANYONECANPAY;
    if (isAnyoneCanPay) whitelist.push("addInput");
    const hashMod = hashType & 31;
    switch (hashMod) {
      case Transaction.SIGHASH_ALL:
        break;
      case Transaction.SIGHASH_SINGLE:
      case Transaction.SIGHASH_NONE:
        whitelist.push("addOutput");
        whitelist.push("setInputSequence");
        break;
    }
    if (whitelist.indexOf(action) === -1) {
      return true;
    }
    return false;
  }
  function extractPartialSigs(input) {
    let pSigs = [];
    if ((input.partialSig || []).length === 0) {
      if (!input.finalScriptSig && !input.finalScriptWitness) return [];
      pSigs = getPsigsFromInputFinalScripts(input);
    } else {
      pSigs = input.partialSig;
    }
    return pSigs.map((p) => p.signature);
  }
  function getPsigsFromInputFinalScripts(input) {
    const scriptItems = !input.finalScriptSig ? [] : decompile(input.finalScriptSig) || [];
    const witnessItems = !input.finalScriptWitness ? [] : decompile(input.finalScriptWitness) || [];
    return scriptItems.concat(witnessItems).filter((item) => {
      return item instanceof Uint8Array && isCanonicalScriptSignature(item);
    }).map((sig) => ({ signature: sig }));
  }

  // node_modules/bitcoinjs-lib/src/esm/psbt/bip371.js
  var toXOnly = (pubKey) => pubKey.length === 32 ? pubKey : pubKey.slice(1, 33);
  function tapScriptFinalizer(inputIndex, input, tapLeafHashToFinalize) {
    const tapLeaf = findTapLeafToFinalize(
      input,
      inputIndex,
      tapLeafHashToFinalize
    );
    try {
      const sigs = sortSignatures(input, tapLeaf);
      const witness = sigs.concat(tapLeaf.script).concat(tapLeaf.controlBlock);
      return { finalScriptWitness: witnessStackToScriptWitness(witness) };
    } catch (err) {
      throw new Error(`Can not finalize taproot input #${inputIndex}: ${err}`);
    }
  }
  function serializeTaprootSignature(sig, sighashType) {
    const sighashTypeByte = sighashType ? Uint8Array.from([sighashType]) : Uint8Array.from([]);
    return concat([sig, sighashTypeByte]);
  }
  function isTaprootInput(input) {
    return input && !!(input.tapInternalKey || input.tapMerkleRoot || input.tapLeafScript && input.tapLeafScript.length || input.tapBip32Derivation && input.tapBip32Derivation.length || input.witnessUtxo && isP2TR(input.witnessUtxo.script));
  }
  function isTaprootOutput(output, script) {
    return output && !!(output.tapInternalKey || output.tapTree || output.tapBip32Derivation && output.tapBip32Derivation.length || script && isP2TR(script));
  }
  function checkTaprootInputFields(inputData, newInputData, action) {
    checkMixedTaprootAndNonTaprootInputFields(inputData, newInputData, action);
    checkIfTapLeafInTree(inputData, newInputData, action);
  }
  function checkTaprootOutputFields(outputData, newOutputData, action) {
    checkMixedTaprootAndNonTaprootOutputFields(outputData, newOutputData, action);
    checkTaprootScriptPubkey(outputData, newOutputData);
  }
  function checkTaprootScriptPubkey(outputData, newOutputData) {
    if (!newOutputData.tapTree && !newOutputData.tapInternalKey) return;
    const tapInternalKey = newOutputData.tapInternalKey || outputData.tapInternalKey;
    const tapTree = newOutputData.tapTree || outputData.tapTree;
    if (tapInternalKey) {
      const { script: scriptPubkey } = outputData;
      const script = getTaprootScripPubkey(tapInternalKey, tapTree);
      if (scriptPubkey && compare(script, scriptPubkey) !== 0)
        throw new Error("Error adding output. Script or address mismatch.");
    }
  }
  function getTaprootScripPubkey(tapInternalKey, tapTree) {
    const scriptTree = tapTree && tapTreeFromList(tapTree.leaves);
    const { output } = p2tr({
      internalPubkey: tapInternalKey,
      scriptTree
    });
    return output;
  }
  function tapTreeFromList(leaves = []) {
    if (leaves.length === 1 && leaves[0].depth === 0)
      return {
        output: leaves[0].script,
        version: leaves[0].leafVersion
      };
    return instertLeavesInTree(leaves);
  }
  function checkTaprootInputForSigs(input, action) {
    const sigs = extractTaprootSigs(input);
    return sigs.some(
      (sig) => signatureBlocksAction(sig, decodeSchnorrSignature, action)
    );
  }
  function decodeSchnorrSignature(signature2) {
    return {
      signature: signature2.slice(0, 64),
      hashType: signature2.slice(64)[0] || Transaction.SIGHASH_DEFAULT
    };
  }
  function extractTaprootSigs(input) {
    const sigs = [];
    if (input.tapKeySig) sigs.push(input.tapKeySig);
    if (input.tapScriptSig)
      sigs.push(...input.tapScriptSig.map((s) => s.signature));
    if (!sigs.length) {
      const finalTapKeySig = getTapKeySigFromWitness(input.finalScriptWitness);
      if (finalTapKeySig) sigs.push(finalTapKeySig);
    }
    return sigs;
  }
  function getTapKeySigFromWitness(finalScriptWitness) {
    if (!finalScriptWitness) return;
    const witness = finalScriptWitness.slice(2);
    if (witness.length === 64 || witness.length === 65) return witness;
  }
  function instertLeavesInTree(leaves) {
    let tree;
    for (const leaf of leaves) {
      tree = instertLeafInTree(leaf, tree);
      if (!tree) throw new Error(`No room left to insert tapleaf in tree`);
    }
    return tree;
  }
  function instertLeafInTree(leaf, tree, depth = 0) {
    if (depth > MAX_TAPTREE_DEPTH) throw new Error("Max taptree depth exceeded.");
    if (leaf.depth === depth) {
      if (!tree)
        return {
          output: leaf.script,
          version: leaf.leafVersion
        };
      return;
    }
    if (isTapleaf(tree)) return;
    const leftSide = instertLeafInTree(leaf, tree && tree[0], depth + 1);
    if (leftSide) return [leftSide, tree && tree[1]];
    const rightSide = instertLeafInTree(leaf, tree && tree[1], depth + 1);
    if (rightSide) return [tree && tree[0], rightSide];
  }
  function checkMixedTaprootAndNonTaprootInputFields(inputData, newInputData, action) {
    const isBadTaprootUpdate = isTaprootInput(inputData) && hasNonTaprootFields(newInputData);
    const isBadNonTaprootUpdate = hasNonTaprootFields(inputData) && isTaprootInput(newInputData);
    const hasMixedFields = inputData === newInputData && isTaprootInput(newInputData) && hasNonTaprootFields(newInputData);
    if (isBadTaprootUpdate || isBadNonTaprootUpdate || hasMixedFields)
      throw new Error(
        `Invalid arguments for Psbt.${action}. Cannot use both taproot and non-taproot fields.`
      );
  }
  function checkMixedTaprootAndNonTaprootOutputFields(inputData, newInputData, action) {
    const isBadTaprootUpdate = isTaprootOutput(inputData) && hasNonTaprootFields(newInputData);
    const isBadNonTaprootUpdate = hasNonTaprootFields(inputData) && isTaprootOutput(newInputData);
    const hasMixedFields = inputData === newInputData && isTaprootOutput(newInputData) && hasNonTaprootFields(newInputData);
    if (isBadTaprootUpdate || isBadNonTaprootUpdate || hasMixedFields)
      throw new Error(
        `Invalid arguments for Psbt.${action}. Cannot use both taproot and non-taproot fields.`
      );
  }
  function checkIfTapLeafInTree(inputData, newInputData, action) {
    if (newInputData.tapMerkleRoot) {
      const newLeafsInTree = (newInputData.tapLeafScript || []).every(
        (l) => isTapLeafInTree(l, newInputData.tapMerkleRoot)
      );
      const oldLeafsInTree = (inputData.tapLeafScript || []).every(
        (l) => isTapLeafInTree(l, newInputData.tapMerkleRoot)
      );
      if (!newLeafsInTree || !oldLeafsInTree)
        throw new Error(
          `Invalid arguments for Psbt.${action}. Tapleaf not part of taptree.`
        );
    } else if (inputData.tapMerkleRoot) {
      const newLeafsInTree = (newInputData.tapLeafScript || []).every(
        (l) => isTapLeafInTree(l, inputData.tapMerkleRoot)
      );
      if (!newLeafsInTree)
        throw new Error(
          `Invalid arguments for Psbt.${action}. Tapleaf not part of taptree.`
        );
    }
  }
  function isTapLeafInTree(tapLeaf, merkleRoot) {
    if (!merkleRoot) return true;
    const leafHash = tapleafHash({
      output: tapLeaf.script,
      version: tapLeaf.leafVersion
    });
    const rootHash = rootHashFromPath(tapLeaf.controlBlock, leafHash);
    return compare(rootHash, merkleRoot) === 0;
  }
  function sortSignatures(input, tapLeaf) {
    const leafHash = tapleafHash({
      output: tapLeaf.script,
      version: tapLeaf.leafVersion
    });
    return (input.tapScriptSig || []).filter((tss) => compare(tss.leafHash, leafHash) === 0).map((tss) => addPubkeyPositionInScript(tapLeaf.script, tss)).sort((t1, t2) => t2.positionInScript - t1.positionInScript).map((t) => t.signature);
  }
  function addPubkeyPositionInScript(script, tss) {
    return Object.assign(
      {
        positionInScript: pubkeyPositionInScript(tss.pubkey, script)
      },
      tss
    );
  }
  function findTapLeafToFinalize(input, inputIndex, leafHashToFinalize) {
    if (!input.tapScriptSig || !input.tapScriptSig.length)
      throw new Error(
        `Can not finalize taproot input #${inputIndex}. No tapleaf script signature provided.`
      );
    const tapLeaf = (input.tapLeafScript || []).sort((a, b) => a.controlBlock.length - b.controlBlock.length).find(
      (leaf) => canFinalizeLeaf(leaf, input.tapScriptSig, leafHashToFinalize)
    );
    if (!tapLeaf)
      throw new Error(
        `Can not finalize taproot input #${inputIndex}. Signature for tapleaf script not found.`
      );
    return tapLeaf;
  }
  function canFinalizeLeaf(leaf, tapScriptSig, hash) {
    const leafHash = tapleafHash({
      output: leaf.script,
      version: leaf.leafVersion
    });
    const whiteListedHash = !hash || compare(leafHash, hash) === 0;
    return whiteListedHash && tapScriptSig.find((tss) => compare(tss.leafHash, leafHash) === 0) !== void 0;
  }
  function hasNonTaprootFields(io) {
    return io && !!(io.redeemScript || io.witnessScript || io.bip32Derivation && io.bip32Derivation.length);
  }

  // node_modules/bitcoinjs-lib/src/esm/psbt.js
  var DEFAULT_OPTS = {
    /**
     * A bitcoinjs Network object. This is only used if you pass an `address`
     * parameter to addOutput. Otherwise it is not needed and can be left default.
     */
    network: bitcoin,
    /**
     * When extractTransaction is called, the fee rate is checked.
     * THIS IS NOT TO BE RELIED ON.
     * It is only here as a last ditch effort to prevent sending a 500 BTC fee etc.
     */
    maximumFeeRate: 5e3
    // satoshi per byte
  };
  var Psbt2 = class _Psbt {
    constructor(opts = {}, data = new Psbt(new PsbtTransaction())) {
      __publicField(this, "data");
      __publicField(this, "__CACHE");
      __publicField(this, "opts");
      this.data = data;
      this.opts = Object.assign({}, DEFAULT_OPTS, opts);
      this.__CACHE = {
        __NON_WITNESS_UTXO_TX_CACHE: [],
        __NON_WITNESS_UTXO_BUF_CACHE: [],
        __TX_IN_CACHE: {},
        __TX: this.data.globalMap.unsignedTx.tx,
        // Psbt's predecessor (TransactionBuilder - now removed) behavior
        // was to not confirm input values  before signing.
        // Even though we highly encourage people to get
        // the full parent transaction to verify values, the ability to
        // sign non-segwit inputs without the full transaction was often
        // requested. So the only way to activate is to use @ts-ignore.
        // We will disable exporting the Psbt when unsafe sign is active.
        // because it is not BIP174 compliant.
        __UNSAFE_SIGN_NONSEGWIT: false
      };
      if (this.data.inputs.length === 0) this.setVersion(2);
      const dpew = (obj, attr, enumerable, writable) => Object.defineProperty(obj, attr, {
        enumerable,
        writable
      });
      dpew(this, "__CACHE", false, true);
      dpew(this, "opts", false, true);
    }
    static fromBase64(data, opts = {}) {
      const buffer = fromBase64(data);
      return this.fromBuffer(buffer, opts);
    }
    static fromHex(data, opts = {}) {
      const buffer = fromHex(data);
      return this.fromBuffer(buffer, opts);
    }
    static fromBuffer(buffer, opts = {}) {
      const psbtBase = Psbt.fromBuffer(buffer, transactionFromBuffer);
      const psbt = new _Psbt(opts, psbtBase);
      checkTxForDupeIns(psbt.__CACHE.__TX, psbt.__CACHE);
      return psbt;
    }
    get inputCount() {
      return this.data.inputs.length;
    }
    get version() {
      return this.__CACHE.__TX.version;
    }
    set version(version) {
      this.setVersion(version);
    }
    get locktime() {
      return this.__CACHE.__TX.locktime;
    }
    set locktime(locktime) {
      this.setLocktime(locktime);
    }
    get txInputs() {
      return this.__CACHE.__TX.ins.map((input) => ({
        hash: cloneBuffer(input.hash),
        index: input.index,
        sequence: input.sequence
      }));
    }
    get txOutputs() {
      return this.__CACHE.__TX.outs.map((output) => {
        let address;
        try {
          address = fromOutputScript(output.script, this.opts.network);
        } catch (_) {
        }
        return {
          script: cloneBuffer(output.script),
          value: output.value,
          address
        };
      });
    }
    combine(...those) {
      this.data.combine(...those.map((o) => o.data));
      return this;
    }
    clone() {
      const res = _Psbt.fromBuffer(this.data.toBuffer());
      res.opts = JSON.parse(JSON.stringify(this.opts));
      return res;
    }
    setMaximumFeeRate(satoshiPerByte) {
      check32Bit(satoshiPerByte);
      this.opts.maximumFeeRate = satoshiPerByte;
    }
    setVersion(version) {
      check32Bit(version);
      checkInputsForPartialSig(this.data.inputs, "setVersion");
      const c = this.__CACHE;
      c.__TX.version = version;
      c.__EXTRACTED_TX = void 0;
      return this;
    }
    setLocktime(locktime) {
      check32Bit(locktime);
      checkInputsForPartialSig(this.data.inputs, "setLocktime");
      const c = this.__CACHE;
      c.__TX.locktime = locktime;
      c.__EXTRACTED_TX = void 0;
      return this;
    }
    setInputSequence(inputIndex, sequence) {
      check32Bit(sequence);
      checkInputsForPartialSig(this.data.inputs, "setInputSequence");
      const c = this.__CACHE;
      if (c.__TX.ins.length <= inputIndex) {
        throw new Error("Input index too high");
      }
      c.__TX.ins[inputIndex].sequence = sequence;
      c.__EXTRACTED_TX = void 0;
      return this;
    }
    addInputs(inputDatas) {
      inputDatas.forEach((inputData) => this.addInput(inputData));
      return this;
    }
    addInput(inputData) {
      if (arguments.length > 1 || !inputData || inputData.hash === void 0 || inputData.index === void 0) {
        throw new Error(
          `Invalid arguments for Psbt.addInput. Requires single object with at least [hash] and [index]`
        );
      }
      checkTaprootInputFields(inputData, inputData, "addInput");
      checkInputsForPartialSig(this.data.inputs, "addInput");
      if (inputData.witnessScript) checkInvalidP2WSH(inputData.witnessScript);
      const c = this.__CACHE;
      this.data.addInput(inputData);
      const txIn = c.__TX.ins[c.__TX.ins.length - 1];
      checkTxInputCache(c, txIn);
      const inputIndex = this.data.inputs.length - 1;
      const input = this.data.inputs[inputIndex];
      if (input.nonWitnessUtxo) {
        addNonWitnessTxCache(this.__CACHE, input, inputIndex);
      }
      c.__FEE = void 0;
      c.__FEE_RATE = void 0;
      c.__EXTRACTED_TX = void 0;
      return this;
    }
    addOutputs(outputDatas) {
      outputDatas.forEach((outputData) => this.addOutput(outputData));
      return this;
    }
    addOutput(outputData) {
      if (arguments.length > 1 || !outputData || outputData.value === void 0 || outputData.address === void 0 && outputData.script === void 0) {
        throw new Error(
          `Invalid arguments for Psbt.addOutput. Requires single object with at least [script or address] and [value]`
        );
      }
      checkInputsForPartialSig(this.data.inputs, "addOutput");
      const { address } = outputData;
      if (typeof address === "string") {
        const { network } = this.opts;
        const script = toOutputScript(address, network);
        outputData = Object.assign({}, outputData, { script });
      }
      checkTaprootOutputFields(outputData, outputData, "addOutput");
      const c = this.__CACHE;
      this.data.addOutput(outputData);
      c.__FEE = void 0;
      c.__FEE_RATE = void 0;
      c.__EXTRACTED_TX = void 0;
      return this;
    }
    extractTransaction(disableFeeCheck) {
      if (!this.data.inputs.every(isFinalized)) throw new Error("Not finalized");
      const c = this.__CACHE;
      if (!disableFeeCheck) {
        checkFees(this, c, this.opts);
      }
      if (c.__EXTRACTED_TX) return c.__EXTRACTED_TX;
      const tx = c.__TX.clone();
      inputFinalizeGetAmts(this.data.inputs, tx, c, true);
      return tx;
    }
    getFeeRate() {
      return getTxCacheValue(
        "__FEE_RATE",
        "fee rate",
        this.data.inputs,
        this.__CACHE
      );
    }
    getFee() {
      return getTxCacheValue("__FEE", "fee", this.data.inputs, this.__CACHE);
    }
    finalizeAllInputs() {
      checkForInput(this.data.inputs, 0);
      range4(this.data.inputs.length).forEach((idx) => this.finalizeInput(idx));
      return this;
    }
    finalizeInput(inputIndex, finalScriptsFunc) {
      const input = checkForInput(this.data.inputs, inputIndex);
      if (isTaprootInput(input))
        return this._finalizeTaprootInput(
          inputIndex,
          input,
          void 0,
          finalScriptsFunc
        );
      return this._finalizeInput(inputIndex, input, finalScriptsFunc);
    }
    finalizeTaprootInput(inputIndex, tapLeafHashToFinalize, finalScriptsFunc = tapScriptFinalizer) {
      const input = checkForInput(this.data.inputs, inputIndex);
      if (isTaprootInput(input))
        return this._finalizeTaprootInput(
          inputIndex,
          input,
          tapLeafHashToFinalize,
          finalScriptsFunc
        );
      throw new Error(`Cannot finalize input #${inputIndex}. Not Taproot.`);
    }
    _finalizeInput(inputIndex, input, finalScriptsFunc = getFinalScripts) {
      const { script, isP2SH, isP2WSH, isSegwit } = getScriptFromInput(
        inputIndex,
        input,
        this.__CACHE
      );
      if (!script) throw new Error(`No script found for input #${inputIndex}`);
      checkPartialSigSighashes(input);
      const { finalScriptSig, finalScriptWitness } = finalScriptsFunc(
        inputIndex,
        input,
        script,
        isSegwit,
        isP2SH,
        isP2WSH
      );
      if (finalScriptSig) this.data.updateInput(inputIndex, { finalScriptSig });
      if (finalScriptWitness)
        this.data.updateInput(inputIndex, { finalScriptWitness });
      if (!finalScriptSig && !finalScriptWitness)
        throw new Error(`Unknown error finalizing input #${inputIndex}`);
      this.data.clearFinalizedInput(inputIndex);
      return this;
    }
    _finalizeTaprootInput(inputIndex, input, tapLeafHashToFinalize, finalScriptsFunc = tapScriptFinalizer) {
      if (!input.witnessUtxo)
        throw new Error(
          `Cannot finalize input #${inputIndex}. Missing withness utxo.`
        );
      if (input.tapKeySig) {
        const payment = p2tr({
          output: input.witnessUtxo.script,
          signature: input.tapKeySig
        });
        const finalScriptWitness = witnessStackToScriptWitness(payment.witness);
        this.data.updateInput(inputIndex, { finalScriptWitness });
      } else {
        const { finalScriptWitness } = finalScriptsFunc(
          inputIndex,
          input,
          tapLeafHashToFinalize
        );
        this.data.updateInput(inputIndex, { finalScriptWitness });
      }
      this.data.clearFinalizedInput(inputIndex);
      return this;
    }
    getInputType(inputIndex) {
      const input = checkForInput(this.data.inputs, inputIndex);
      const script = getScriptFromUtxo(inputIndex, input, this.__CACHE);
      const result = getMeaningfulScript(
        script,
        inputIndex,
        "input",
        input.redeemScript || redeemFromFinalScriptSig(input.finalScriptSig),
        input.witnessScript || redeemFromFinalWitnessScript(input.finalScriptWitness)
      );
      const type = result.type === "raw" ? "" : result.type + "-";
      const mainType = classifyScript(result.meaningfulScript);
      return type + mainType;
    }
    inputHasPubkey(inputIndex, pubkey) {
      const input = checkForInput(this.data.inputs, inputIndex);
      return pubkeyInInput(pubkey, input, inputIndex, this.__CACHE);
    }
    inputHasHDKey(inputIndex, root) {
      const input = checkForInput(this.data.inputs, inputIndex);
      const derivationIsMine = bip32DerivationIsMine(root);
      return !!input.bip32Derivation && input.bip32Derivation.some(derivationIsMine);
    }
    outputHasPubkey(outputIndex, pubkey) {
      const output = checkForOutput(this.data.outputs, outputIndex);
      return pubkeyInOutput(pubkey, output, outputIndex, this.__CACHE);
    }
    outputHasHDKey(outputIndex, root) {
      const output = checkForOutput(this.data.outputs, outputIndex);
      const derivationIsMine = bip32DerivationIsMine(root);
      return !!output.bip32Derivation && output.bip32Derivation.some(derivationIsMine);
    }
    validateSignaturesOfAllInputs(validator) {
      checkForInput(this.data.inputs, 0);
      const results = range4(this.data.inputs.length).map(
        (idx) => this.validateSignaturesOfInput(idx, validator)
      );
      return results.reduce((final, res) => res === true && final, true);
    }
    validateSignaturesOfInput(inputIndex, validator, pubkey) {
      const input = this.data.inputs[inputIndex];
      if (isTaprootInput(input))
        return this.validateSignaturesOfTaprootInput(
          inputIndex,
          validator,
          pubkey
        );
      return this._validateSignaturesOfInput(inputIndex, validator, pubkey);
    }
    _validateSignaturesOfInput(inputIndex, validator, pubkey) {
      const input = this.data.inputs[inputIndex];
      const partialSig = (input || {}).partialSig;
      if (!input || !partialSig || partialSig.length < 1)
        throw new Error("No signatures to validate");
      if (typeof validator !== "function")
        throw new Error("Need validator function to validate signatures");
      const mySigs = pubkey ? partialSig.filter((sig) => compare(sig.pubkey, pubkey) === 0) : partialSig;
      if (mySigs.length < 1) throw new Error("No signatures for this pubkey");
      const results = [];
      let hashCache;
      let scriptCache;
      let sighashCache;
      for (const pSig of mySigs) {
        const sig = signature.decode(pSig.signature);
        const { hash, script } = sighashCache !== sig.hashType ? getHashForSig(
          inputIndex,
          Object.assign({}, input, { sighashType: sig.hashType }),
          this.__CACHE,
          true
        ) : { hash: hashCache, script: scriptCache };
        sighashCache = sig.hashType;
        hashCache = hash;
        scriptCache = script;
        checkScriptForPubkey(pSig.pubkey, script, "verify");
        results.push(validator(pSig.pubkey, hash, sig.signature));
      }
      return results.every((res) => res === true);
    }
    validateSignaturesOfTaprootInput(inputIndex, validator, pubkey) {
      const input = this.data.inputs[inputIndex];
      const tapKeySig = (input || {}).tapKeySig;
      const tapScriptSig = (input || {}).tapScriptSig;
      if (!input && !tapKeySig && !(tapScriptSig && !tapScriptSig.length))
        throw new Error("No signatures to validate");
      if (typeof validator !== "function")
        throw new Error("Need validator function to validate signatures");
      pubkey = pubkey && toXOnly(pubkey);
      const allHashses = pubkey ? getTaprootHashesForSigValidation(
        inputIndex,
        input,
        this.data.inputs,
        pubkey,
        this.__CACHE
      ) : getAllTaprootHashesForSigValidation(
        inputIndex,
        input,
        this.data.inputs,
        this.__CACHE
      );
      if (!allHashses.length) throw new Error("No signatures for this pubkey");
      const tapKeyHash = allHashses.find((h) => !h.leafHash);
      let validationResultCount = 0;
      if (tapKeySig && tapKeyHash) {
        const isValidTapkeySig = validator(
          tapKeyHash.pubkey,
          tapKeyHash.hash,
          trimTaprootSig(tapKeySig)
        );
        if (!isValidTapkeySig) return false;
        validationResultCount++;
      }
      if (tapScriptSig) {
        for (const tapSig of tapScriptSig) {
          const tapSigHash = allHashses.find(
            (h) => compare(h.pubkey, tapSig.pubkey) === 0
          );
          if (tapSigHash) {
            const isValidTapScriptSig = validator(
              tapSig.pubkey,
              tapSigHash.hash,
              trimTaprootSig(tapSig.signature)
            );
            if (!isValidTapScriptSig) return false;
            validationResultCount++;
          }
        }
      }
      return validationResultCount > 0;
    }
    signAllInputsHD(hdKeyPair, sighashTypes = [Transaction.SIGHASH_ALL]) {
      if (!hdKeyPair || !hdKeyPair.publicKey || !hdKeyPair.fingerprint) {
        throw new Error("Need HDSigner to sign input");
      }
      const results = [];
      for (const i of range4(this.data.inputs.length)) {
        try {
          this.signInputHD(i, hdKeyPair, sighashTypes);
          results.push(true);
        } catch (err) {
          results.push(false);
        }
      }
      if (results.every((v) => v === false)) {
        throw new Error("No inputs were signed");
      }
      return this;
    }
    signAllInputsHDAsync(hdKeyPair, sighashTypes = [Transaction.SIGHASH_ALL]) {
      return new Promise((resolve, reject) => {
        if (!hdKeyPair || !hdKeyPair.publicKey || !hdKeyPair.fingerprint) {
          return reject(new Error("Need HDSigner to sign input"));
        }
        const results = [];
        const promises = [];
        for (const i of range4(this.data.inputs.length)) {
          promises.push(
            this.signInputHDAsync(i, hdKeyPair, sighashTypes).then(
              () => {
                results.push(true);
              },
              () => {
                results.push(false);
              }
            )
          );
        }
        return Promise.all(promises).then(() => {
          if (results.every((v) => v === false)) {
            return reject(new Error("No inputs were signed"));
          }
          resolve();
        });
      });
    }
    signInputHD(inputIndex, hdKeyPair, sighashTypes = [Transaction.SIGHASH_ALL]) {
      if (!hdKeyPair || !hdKeyPair.publicKey || !hdKeyPair.fingerprint) {
        throw new Error("Need HDSigner to sign input");
      }
      const signers = getSignersFromHD(inputIndex, this.data.inputs, hdKeyPair);
      signers.forEach((signer) => this.signInput(inputIndex, signer, sighashTypes));
      return this;
    }
    signInputHDAsync(inputIndex, hdKeyPair, sighashTypes = [Transaction.SIGHASH_ALL]) {
      return new Promise((resolve, reject) => {
        if (!hdKeyPair || !hdKeyPair.publicKey || !hdKeyPair.fingerprint) {
          return reject(new Error("Need HDSigner to sign input"));
        }
        const signers = getSignersFromHD(inputIndex, this.data.inputs, hdKeyPair);
        const promises = signers.map(
          (signer) => this.signInputAsync(inputIndex, signer, sighashTypes)
        );
        return Promise.all(promises).then(() => {
          resolve();
        }).catch(reject);
      });
    }
    signAllInputs(keyPair, sighashTypes) {
      if (!keyPair || !keyPair.publicKey)
        throw new Error("Need Signer to sign input");
      const results = [];
      for (const i of range4(this.data.inputs.length)) {
        try {
          this.signInput(i, keyPair, sighashTypes);
          results.push(true);
        } catch (err) {
          results.push(false);
        }
      }
      if (results.every((v) => v === false)) {
        throw new Error("No inputs were signed");
      }
      return this;
    }
    signAllInputsAsync(keyPair, sighashTypes) {
      return new Promise((resolve, reject) => {
        if (!keyPair || !keyPair.publicKey)
          return reject(new Error("Need Signer to sign input"));
        const results = [];
        const promises = [];
        for (const [i] of this.data.inputs.entries()) {
          promises.push(
            this.signInputAsync(i, keyPair, sighashTypes).then(
              () => {
                results.push(true);
              },
              () => {
                results.push(false);
              }
            )
          );
        }
        return Promise.all(promises).then(() => {
          if (results.every((v) => v === false)) {
            return reject(new Error("No inputs were signed"));
          }
          resolve();
        });
      });
    }
    signInput(inputIndex, keyPair, sighashTypes) {
      if (!keyPair || !keyPair.publicKey)
        throw new Error("Need Signer to sign input");
      const input = checkForInput(this.data.inputs, inputIndex);
      if (isTaprootInput(input)) {
        return this._signTaprootInput(
          inputIndex,
          input,
          keyPair,
          void 0,
          sighashTypes
        );
      }
      return this._signInput(inputIndex, keyPair, sighashTypes);
    }
    signTaprootInput(inputIndex, keyPair, tapLeafHashToSign, sighashTypes) {
      if (!keyPair || !keyPair.publicKey)
        throw new Error("Need Signer to sign input");
      const input = checkForInput(this.data.inputs, inputIndex);
      if (isTaprootInput(input))
        return this._signTaprootInput(
          inputIndex,
          input,
          keyPair,
          tapLeafHashToSign,
          sighashTypes
        );
      throw new Error(`Input #${inputIndex} is not of type Taproot.`);
    }
    _signInput(inputIndex, keyPair, sighashTypes = [Transaction.SIGHASH_ALL]) {
      const { hash, sighashType } = getHashAndSighashType(
        this.data.inputs,
        inputIndex,
        keyPair.publicKey,
        this.__CACHE,
        sighashTypes
      );
      const partialSig = [
        {
          pubkey: keyPair.publicKey,
          signature: signature.encode(keyPair.sign(hash), sighashType)
        }
      ];
      this.data.updateInput(inputIndex, { partialSig });
      return this;
    }
    _signTaprootInput(inputIndex, input, keyPair, tapLeafHashToSign, allowedSighashTypes = [Transaction.SIGHASH_DEFAULT]) {
      const hashesForSig = this.checkTaprootHashesForSig(
        inputIndex,
        input,
        keyPair,
        tapLeafHashToSign,
        allowedSighashTypes
      );
      const tapKeySig = hashesForSig.filter((h) => !h.leafHash).map(
        (h) => serializeTaprootSignature(
          keyPair.signSchnorr(h.hash),
          input.sighashType
        )
      )[0];
      const tapScriptSig = hashesForSig.filter((h) => !!h.leafHash).map((h) => ({
        pubkey: toXOnly(keyPair.publicKey),
        signature: serializeTaprootSignature(
          keyPair.signSchnorr(h.hash),
          input.sighashType
        ),
        leafHash: h.leafHash
      }));
      if (tapKeySig) {
        this.data.updateInput(inputIndex, { tapKeySig });
      }
      if (tapScriptSig.length) {
        this.data.updateInput(inputIndex, { tapScriptSig });
      }
      return this;
    }
    signInputAsync(inputIndex, keyPair, sighashTypes) {
      return Promise.resolve().then(() => {
        if (!keyPair || !keyPair.publicKey)
          throw new Error("Need Signer to sign input");
        const input = checkForInput(this.data.inputs, inputIndex);
        if (isTaprootInput(input))
          return this._signTaprootInputAsync(
            inputIndex,
            input,
            keyPair,
            void 0,
            sighashTypes
          );
        return this._signInputAsync(inputIndex, keyPair, sighashTypes);
      });
    }
    signTaprootInputAsync(inputIndex, keyPair, tapLeafHash, sighashTypes) {
      return Promise.resolve().then(() => {
        if (!keyPair || !keyPair.publicKey)
          throw new Error("Need Signer to sign input");
        const input = checkForInput(this.data.inputs, inputIndex);
        if (isTaprootInput(input))
          return this._signTaprootInputAsync(
            inputIndex,
            input,
            keyPair,
            tapLeafHash,
            sighashTypes
          );
        throw new Error(`Input #${inputIndex} is not of type Taproot.`);
      });
    }
    _signInputAsync(inputIndex, keyPair, sighashTypes = [Transaction.SIGHASH_ALL]) {
      const { hash, sighashType } = getHashAndSighashType(
        this.data.inputs,
        inputIndex,
        keyPair.publicKey,
        this.__CACHE,
        sighashTypes
      );
      return Promise.resolve(keyPair.sign(hash)).then((signature2) => {
        const partialSig = [
          {
            pubkey: keyPair.publicKey,
            signature: signature.encode(signature2, sighashType)
          }
        ];
        this.data.updateInput(inputIndex, { partialSig });
      });
    }
    async _signTaprootInputAsync(inputIndex, input, keyPair, tapLeafHash, sighashTypes = [Transaction.SIGHASH_DEFAULT]) {
      const hashesForSig = this.checkTaprootHashesForSig(
        inputIndex,
        input,
        keyPair,
        tapLeafHash,
        sighashTypes
      );
      const signaturePromises = [];
      const tapKeyHash = hashesForSig.filter((h) => !h.leafHash)[0];
      if (tapKeyHash) {
        const tapKeySigPromise = Promise.resolve(
          keyPair.signSchnorr(tapKeyHash.hash)
        ).then((sig) => {
          return { tapKeySig: serializeTaprootSignature(sig, input.sighashType) };
        });
        signaturePromises.push(tapKeySigPromise);
      }
      const tapScriptHashes = hashesForSig.filter((h) => !!h.leafHash);
      if (tapScriptHashes.length) {
        const tapScriptSigPromises = tapScriptHashes.map((tsh) => {
          return Promise.resolve(keyPair.signSchnorr(tsh.hash)).then(
            (signature2) => {
              const tapScriptSig = [
                {
                  pubkey: toXOnly(keyPair.publicKey),
                  signature: serializeTaprootSignature(
                    signature2,
                    input.sighashType
                  ),
                  leafHash: tsh.leafHash
                }
              ];
              return { tapScriptSig };
            }
          );
        });
        signaturePromises.push(...tapScriptSigPromises);
      }
      return Promise.all(signaturePromises).then((results) => {
        results.forEach((v) => this.data.updateInput(inputIndex, v));
      });
    }
    checkTaprootHashesForSig(inputIndex, input, keyPair, tapLeafHashToSign, allowedSighashTypes) {
      if (typeof keyPair.signSchnorr !== "function")
        throw new Error(
          `Need Schnorr Signer to sign taproot input #${inputIndex}.`
        );
      const hashesForSig = getTaprootHashesForSigning(
        inputIndex,
        input,
        this.data.inputs,
        keyPair.publicKey,
        this.__CACHE,
        tapLeafHashToSign,
        allowedSighashTypes
      );
      if (!hashesForSig || !hashesForSig.length)
        throw new Error(
          `Can not sign for input #${inputIndex} with the key ${toHex(keyPair.publicKey)}`
        );
      return hashesForSig;
    }
    toBuffer() {
      checkCache(this.__CACHE);
      return this.data.toBuffer();
    }
    toHex() {
      checkCache(this.__CACHE);
      return this.data.toHex();
    }
    toBase64() {
      checkCache(this.__CACHE);
      return this.data.toBase64();
    }
    updateGlobal(updateData) {
      this.data.updateGlobal(updateData);
      return this;
    }
    updateInput(inputIndex, updateData) {
      if (updateData.witnessScript) checkInvalidP2WSH(updateData.witnessScript);
      checkTaprootInputFields(
        this.data.inputs[inputIndex],
        updateData,
        "updateInput"
      );
      this.data.updateInput(inputIndex, updateData);
      if (updateData.nonWitnessUtxo) {
        addNonWitnessTxCache(
          this.__CACHE,
          this.data.inputs[inputIndex],
          inputIndex
        );
      }
      return this;
    }
    updateOutput(outputIndex, updateData) {
      const outputData = this.data.outputs[outputIndex];
      checkTaprootOutputFields(outputData, updateData, "updateOutput");
      this.data.updateOutput(outputIndex, updateData);
      return this;
    }
    addUnknownKeyValToGlobal(keyVal) {
      this.data.addUnknownKeyValToGlobal(keyVal);
      return this;
    }
    addUnknownKeyValToInput(inputIndex, keyVal) {
      this.data.addUnknownKeyValToInput(inputIndex, keyVal);
      return this;
    }
    addUnknownKeyValToOutput(outputIndex, keyVal) {
      this.data.addUnknownKeyValToOutput(outputIndex, keyVal);
      return this;
    }
    clearFinalizedInput(inputIndex) {
      this.data.clearFinalizedInput(inputIndex);
      return this;
    }
  };
  var transactionFromBuffer = (buffer) => new PsbtTransaction(buffer);
  var PsbtTransaction = class {
    constructor(buffer = Uint8Array.from([2, 0, 0, 0, 0, 0, 0, 0, 0, 0])) {
      __publicField(this, "tx");
      this.tx = Transaction.fromBuffer(buffer);
      checkTxEmpty(this.tx);
      Object.defineProperty(this, "tx", {
        enumerable: false,
        writable: true
      });
    }
    getInputOutputCounts() {
      return {
        inputCount: this.tx.ins.length,
        outputCount: this.tx.outs.length
      };
    }
    addInput(input) {
      if (input.hash === void 0 || input.index === void 0 || !(input.hash instanceof Uint8Array) && typeof input.hash !== "string" || typeof input.index !== "number") {
        throw new Error("Error adding input.");
      }
      const hash = typeof input.hash === "string" ? reverseBuffer(fromHex(input.hash)) : input.hash;
      this.tx.addInput(hash, input.index, input.sequence);
    }
    addOutput(output) {
      if (output.script === void 0 || output.value === void 0 || !(output.script instanceof Uint8Array) || typeof output.value !== "bigint") {
        throw new Error("Error adding output.");
      }
      this.tx.addOutput(output.script, output.value);
    }
    toBuffer() {
      return this.tx.toBuffer();
    }
  };
  function canFinalize(input, script, scriptType) {
    switch (scriptType) {
      case "pubkey":
      case "pubkeyhash":
      case "witnesspubkeyhash":
        return hasSigs(1, input.partialSig);
      case "multisig":
        const p2ms2 = p2ms({ output: script });
        return hasSigs(p2ms2.m, input.partialSig, p2ms2.pubkeys);
      default:
        return false;
    }
  }
  function checkCache(cache) {
    if (cache.__UNSAFE_SIGN_NONSEGWIT !== false) {
      throw new Error("Not BIP174 compliant, can not export");
    }
  }
  function hasSigs(neededSigs, partialSig, pubkeys) {
    if (!partialSig) return false;
    let sigs;
    if (pubkeys) {
      sigs = pubkeys.map((pkey) => {
        const pubkey = compressPubkey(pkey);
        return partialSig.find(
          (pSig) => compare(pSig.pubkey, pubkey) === 0
        );
      }).filter((v) => !!v);
    } else {
      sigs = partialSig;
    }
    if (sigs.length > neededSigs) throw new Error("Too many signatures");
    return sigs.length === neededSigs;
  }
  function isFinalized(input) {
    return !!input.finalScriptSig || !!input.finalScriptWitness;
  }
  function bip32DerivationIsMine(root) {
    return (d) => {
      if (compare(root.fingerprint, d.masterFingerprint)) return false;
      if (compare(root.derivePath(d.path).publicKey, d.pubkey))
        return false;
      return true;
    };
  }
  function check32Bit(num) {
    if (typeof num !== "number" || num !== Math.floor(num) || num > 4294967295 || num < 0) {
      throw new Error("Invalid 32 bit integer");
    }
  }
  function checkFees(psbt, cache, opts) {
    const feeRate = cache.__FEE_RATE || psbt.getFeeRate();
    const vsize = cache.__EXTRACTED_TX.virtualSize();
    const satoshis = feeRate * vsize;
    if (feeRate >= opts.maximumFeeRate) {
      throw new Error(
        `Warning: You are paying around ${(satoshis / 1e8).toFixed(8)} in fees, which is ${feeRate} satoshi per byte for a transaction with a VSize of ${vsize} bytes (segwit counted as 0.25 byte per byte). Use setMaximumFeeRate method to raise your threshold, or pass true to the first arg of extractTransaction.`
      );
    }
  }
  function checkInputsForPartialSig(inputs2, action) {
    inputs2.forEach((input) => {
      const throws = isTaprootInput(input) ? checkTaprootInputForSigs(input, action) : checkInputForSig(input, action);
      if (throws)
        throw new Error("Can not modify transaction, signatures exist.");
    });
  }
  function checkPartialSigSighashes(input) {
    if (!input.sighashType || !input.partialSig) return;
    const { partialSig, sighashType } = input;
    partialSig.forEach((pSig) => {
      const { hashType } = signature.decode(pSig.signature);
      if (sighashType !== hashType) {
        throw new Error("Signature sighash does not match input sighash type");
      }
    });
  }
  function checkScriptForPubkey(pubkey, script, action) {
    if (!pubkeyInScript(pubkey, script)) {
      throw new Error(
        `Can not ${action} for this input with the key ${toHex(pubkey)}`
      );
    }
  }
  function checkTxEmpty(tx) {
    const isEmpty = tx.ins.every(
      (input) => input.script && input.script.length === 0 && input.witness && input.witness.length === 0
    );
    if (!isEmpty) {
      throw new Error("Format Error: Transaction ScriptSigs are not empty");
    }
  }
  function checkTxForDupeIns(tx, cache) {
    tx.ins.forEach((input) => {
      checkTxInputCache(cache, input);
    });
  }
  function checkTxInputCache(cache, input) {
    const key = toHex(reverseBuffer(Uint8Array.from(input.hash))) + ":" + input.index;
    if (cache.__TX_IN_CACHE[key]) throw new Error("Duplicate input detected.");
    cache.__TX_IN_CACHE[key] = 1;
  }
  function scriptCheckerFactory(payment, paymentScriptName) {
    return (inputIndex, scriptPubKey, redeemScript, ioType) => {
      const redeemScriptOutput = payment({
        redeem: { output: redeemScript }
      }).output;
      if (compare(scriptPubKey, redeemScriptOutput)) {
        throw new Error(
          `${paymentScriptName} for ${ioType} #${inputIndex} doesn't match the scriptPubKey in the prevout`
        );
      }
    };
  }
  var checkRedeemScript = scriptCheckerFactory(p2sh, "Redeem script");
  var checkWitnessScript = scriptCheckerFactory(
    p2wsh,
    "Witness script"
  );
  function getTxCacheValue(key, name, inputs2, c) {
    if (!inputs2.every(isFinalized))
      throw new Error(`PSBT must be finalized to calculate ${name}`);
    if (key === "__FEE_RATE" && c.__FEE_RATE) return c.__FEE_RATE;
    if (key === "__FEE" && c.__FEE) return c.__FEE;
    let tx;
    let mustFinalize = true;
    if (c.__EXTRACTED_TX) {
      tx = c.__EXTRACTED_TX;
      mustFinalize = false;
    } else {
      tx = c.__TX.clone();
    }
    inputFinalizeGetAmts(inputs2, tx, c, mustFinalize);
    if (key === "__FEE_RATE") return c.__FEE_RATE;
    else if (key === "__FEE") return c.__FEE;
  }
  function getFinalScripts(inputIndex, input, script, isSegwit, isP2SH, isP2WSH) {
    const scriptType = classifyScript(script);
    if (!canFinalize(input, script, scriptType))
      throw new Error(`Can not finalize input #${inputIndex}`);
    return prepareFinalScripts(
      script,
      scriptType,
      input.partialSig,
      isSegwit,
      isP2SH,
      isP2WSH
    );
  }
  function prepareFinalScripts(script, scriptType, partialSig, isSegwit, isP2SH, isP2WSH) {
    let finalScriptSig;
    let finalScriptWitness;
    const payment = getPayment(script, scriptType, partialSig);
    const p2wsh2 = !isP2WSH ? null : p2wsh({ redeem: payment });
    const p2sh2 = !isP2SH ? null : p2sh({ redeem: p2wsh2 || payment });
    if (isSegwit) {
      if (p2wsh2) {
        finalScriptWitness = witnessStackToScriptWitness(p2wsh2.witness);
      } else {
        finalScriptWitness = witnessStackToScriptWitness(payment.witness);
      }
      if (p2sh2) {
        finalScriptSig = p2sh2.input;
      }
    } else {
      if (p2sh2) {
        finalScriptSig = p2sh2.input;
      } else {
        finalScriptSig = payment.input;
      }
    }
    return {
      finalScriptSig,
      finalScriptWitness
    };
  }
  function getHashAndSighashType(inputs2, inputIndex, pubkey, cache, sighashTypes) {
    const input = checkForInput(inputs2, inputIndex);
    const { hash, sighashType, script } = getHashForSig(
      inputIndex,
      input,
      cache,
      false,
      sighashTypes
    );
    checkScriptForPubkey(pubkey, script, "sign");
    return {
      hash,
      sighashType
    };
  }
  function getHashForSig(inputIndex, input, cache, forValidate, sighashTypes) {
    const unsignedTx = cache.__TX;
    const sighashType = input.sighashType || Transaction.SIGHASH_ALL;
    checkSighashTypeAllowed(sighashType, sighashTypes);
    let hash;
    let prevout;
    if (input.nonWitnessUtxo) {
      const nonWitnessUtxoTx = nonWitnessUtxoTxFromCache(
        cache,
        input,
        inputIndex
      );
      const prevoutHash = unsignedTx.ins[inputIndex].hash;
      const utxoHash = nonWitnessUtxoTx.getHash();
      if (compare(prevoutHash, utxoHash) !== 0) {
        throw new Error(
          `Non-witness UTXO hash for input #${inputIndex} doesn't match the hash specified in the prevout`
        );
      }
      const prevoutIndex = unsignedTx.ins[inputIndex].index;
      prevout = nonWitnessUtxoTx.outs[prevoutIndex];
    } else if (input.witnessUtxo) {
      prevout = input.witnessUtxo;
    } else {
      throw new Error("Need a Utxo input item for signing");
    }
    const { meaningfulScript, type } = getMeaningfulScript(
      prevout.script,
      inputIndex,
      "input",
      input.redeemScript,
      input.witnessScript
    );
    if (["p2sh-p2wsh", "p2wsh"].indexOf(type) >= 0) {
      hash = unsignedTx.hashForWitnessV0(
        inputIndex,
        meaningfulScript,
        prevout.value,
        sighashType
      );
    } else if (isP2WPKH(meaningfulScript)) {
      const signingScript = p2pkh({
        hash: meaningfulScript.slice(2)
      }).output;
      hash = unsignedTx.hashForWitnessV0(
        inputIndex,
        signingScript,
        prevout.value,
        sighashType
      );
    } else {
      if (input.nonWitnessUtxo === void 0 && cache.__UNSAFE_SIGN_NONSEGWIT === false)
        throw new Error(
          `Input #${inputIndex} has witnessUtxo but non-segwit script: ${toHex(meaningfulScript)}`
        );
      if (!forValidate && cache.__UNSAFE_SIGN_NONSEGWIT !== false)
        console.warn(
          "Warning: Signing non-segwit inputs without the full parent transaction means there is a chance that a miner could feed you incorrect information to trick you into paying large fees. This behavior is the same as Psbt's predecessor (TransactionBuilder - now removed) when signing non-segwit scripts. You are not able to export this Psbt with toBuffer|toBase64|toHex since it is not BIP174 compliant.\n*********************\nPROCEED WITH CAUTION!\n*********************"
        );
      hash = unsignedTx.hashForSignature(
        inputIndex,
        meaningfulScript,
        sighashType
      );
    }
    return {
      script: meaningfulScript,
      sighashType,
      hash
    };
  }
  function getAllTaprootHashesForSigValidation(inputIndex, input, inputs2, cache) {
    const allPublicKeys = [];
    if (input.tapInternalKey) {
      const key = getPrevoutTaprootKey(inputIndex, input, cache);
      if (key) {
        allPublicKeys.push(key);
      }
    }
    if (input.tapScriptSig) {
      const tapScriptPubkeys = input.tapScriptSig.map((tss) => tss.pubkey);
      allPublicKeys.push(...tapScriptPubkeys);
    }
    const allHashes = allPublicKeys.map(
      (publicKey) => getTaprootHashesForSigValidation(
        inputIndex,
        input,
        inputs2,
        publicKey,
        cache
      )
    );
    return allHashes.flat();
  }
  function getPrevoutTaprootKey(inputIndex, input, cache) {
    const { script } = getScriptAndAmountFromUtxo(inputIndex, input, cache);
    return isP2TR(script) ? script.subarray(2, 34) : null;
  }
  function trimTaprootSig(signature2) {
    return signature2.length === 64 ? signature2 : signature2.subarray(0, 64);
  }
  function getTaprootHashesForSigning(inputIndex, input, inputs2, pubkey, cache, tapLeafHashToSign, allowedSighashTypes) {
    const sighashType = input.sighashType || Transaction.SIGHASH_DEFAULT;
    checkSighashTypeAllowed(sighashType, allowedSighashTypes);
    const keySpend = Boolean(input.tapInternalKey && !tapLeafHashToSign);
    return getTaprootHashesForSig(
      inputIndex,
      input,
      inputs2,
      pubkey,
      cache,
      keySpend,
      sighashType,
      tapLeafHashToSign
    );
  }
  function getTaprootHashesForSigValidation(inputIndex, input, inputs2, pubkey, cache) {
    const sighashType = input.sighashType || Transaction.SIGHASH_DEFAULT;
    const keySpend = Boolean(input.tapKeySig);
    return getTaprootHashesForSig(
      inputIndex,
      input,
      inputs2,
      pubkey,
      cache,
      keySpend,
      sighashType
    );
  }
  function getTaprootHashesForSig(inputIndex, input, inputs2, pubkey, cache, keySpend, sighashType, tapLeafHashToSign) {
    const unsignedTx = cache.__TX;
    const prevOuts = inputs2.map(
      (i, index) => getScriptAndAmountFromUtxo(index, i, cache)
    );
    const signingScripts = prevOuts.map((o) => o.script);
    const values = prevOuts.map((o) => o.value);
    const hashes = [];
    if (keySpend) {
      const outputKey = getPrevoutTaprootKey(inputIndex, input, cache) || Uint8Array.from([]);
      if (compare(toXOnly(pubkey), outputKey) === 0) {
        const tapKeyHash = unsignedTx.hashForWitnessV1(
          inputIndex,
          signingScripts,
          values,
          sighashType
        );
        hashes.push({ pubkey, hash: tapKeyHash });
      }
    }
    const tapLeafHashes = (input.tapLeafScript || []).filter((tapLeaf) => pubkeyInScript(pubkey, tapLeaf.script)).map((tapLeaf) => {
      const hash = tapleafHash({
        output: tapLeaf.script,
        version: tapLeaf.leafVersion
      });
      return Object.assign({ hash }, tapLeaf);
    }).filter(
      (tapLeaf) => !tapLeafHashToSign || compare(tapLeafHashToSign, tapLeaf.hash) === 0
    ).map((tapLeaf) => {
      const tapScriptHash = unsignedTx.hashForWitnessV1(
        inputIndex,
        signingScripts,
        values,
        sighashType,
        tapLeaf.hash
      );
      return {
        pubkey,
        hash: tapScriptHash,
        leafHash: tapLeaf.hash
      };
    });
    return hashes.concat(tapLeafHashes);
  }
  function checkSighashTypeAllowed(sighashType, sighashTypes) {
    if (sighashTypes && sighashTypes.indexOf(sighashType) < 0) {
      const str = sighashTypeToString(sighashType);
      throw new Error(
        `Sighash type is not allowed. Retry the sign method passing the sighashTypes array of whitelisted types. Sighash type: ${str}`
      );
    }
  }
  function getPayment(script, scriptType, partialSig) {
    let payment;
    switch (scriptType) {
      case "multisig":
        const sigs = getSortedSigs(script, partialSig);
        payment = p2ms({
          output: script,
          signatures: sigs
        });
        break;
      case "pubkey":
        payment = p2pk({
          output: script,
          signature: partialSig[0].signature
        });
        break;
      case "pubkeyhash":
        payment = p2pkh({
          output: script,
          pubkey: partialSig[0].pubkey,
          signature: partialSig[0].signature
        });
        break;
      case "witnesspubkeyhash":
        payment = p2wpkh({
          output: script,
          pubkey: partialSig[0].pubkey,
          signature: partialSig[0].signature
        });
        break;
    }
    return payment;
  }
  function getScriptFromInput(inputIndex, input, cache) {
    const unsignedTx = cache.__TX;
    const res = {
      script: null,
      isSegwit: false,
      isP2SH: false,
      isP2WSH: false
    };
    res.isP2SH = !!input.redeemScript;
    res.isP2WSH = !!input.witnessScript;
    if (input.witnessScript) {
      res.script = input.witnessScript;
    } else if (input.redeemScript) {
      res.script = input.redeemScript;
    } else {
      if (input.nonWitnessUtxo) {
        const nonWitnessUtxoTx = nonWitnessUtxoTxFromCache(
          cache,
          input,
          inputIndex
        );
        const prevoutIndex = unsignedTx.ins[inputIndex].index;
        res.script = nonWitnessUtxoTx.outs[prevoutIndex].script;
      } else if (input.witnessUtxo) {
        res.script = input.witnessUtxo.script;
      }
    }
    if (input.witnessScript || isP2WPKH(res.script)) {
      res.isSegwit = true;
    }
    return res;
  }
  function getSignersFromHD(inputIndex, inputs2, hdKeyPair) {
    const input = checkForInput(inputs2, inputIndex);
    if (!input.bip32Derivation || input.bip32Derivation.length === 0) {
      throw new Error("Need bip32Derivation to sign with HD");
    }
    const myDerivations = input.bip32Derivation.map((bipDv) => {
      if (compare(bipDv.masterFingerprint, hdKeyPair.fingerprint) === 0) {
        return bipDv;
      } else {
        return;
      }
    }).filter((v) => !!v);
    if (myDerivations.length === 0) {
      throw new Error(
        "Need one bip32Derivation masterFingerprint to match the HDSigner fingerprint"
      );
    }
    const signers = myDerivations.map((bipDv) => {
      const node = hdKeyPair.derivePath(bipDv.path);
      if (compare(bipDv.pubkey, node.publicKey) !== 0) {
        throw new Error("pubkey did not match bip32Derivation");
      }
      return node;
    });
    return signers;
  }
  function getSortedSigs(script, partialSig) {
    const p2ms2 = p2ms({ output: script });
    return p2ms2.pubkeys.map((pk) => {
      return (partialSig.filter((ps) => {
        return compare(ps.pubkey, pk) === 0;
      })[0] || {}).signature;
    }).filter((v) => !!v);
  }
  function scriptWitnessToWitnessStack(buffer) {
    let offset = 0;
    function readSlice(n) {
      offset += n;
      return buffer.slice(offset - n, offset);
    }
    function readVarInt() {
      const vi = decode5(buffer, offset);
      offset += encodingLength2(vi.bigintValue);
      return vi.numberValue;
    }
    function readVarSlice() {
      return readSlice(readVarInt());
    }
    function readVector() {
      const count = readVarInt();
      const vector = [];
      for (let i = 0; i < count; i++) vector.push(readVarSlice());
      return vector;
    }
    return readVector();
  }
  function sighashTypeToString(sighashType) {
    let text = sighashType & Transaction.SIGHASH_ANYONECANPAY ? "SIGHASH_ANYONECANPAY | " : "";
    const sigMod = sighashType & 31;
    switch (sigMod) {
      case Transaction.SIGHASH_ALL:
        text += "SIGHASH_ALL";
        break;
      case Transaction.SIGHASH_SINGLE:
        text += "SIGHASH_SINGLE";
        break;
      case Transaction.SIGHASH_NONE:
        text += "SIGHASH_NONE";
        break;
    }
    return text;
  }
  function addNonWitnessTxCache(cache, input, inputIndex) {
    cache.__NON_WITNESS_UTXO_BUF_CACHE[inputIndex] = input.nonWitnessUtxo;
    const tx = Transaction.fromBuffer(input.nonWitnessUtxo);
    cache.__NON_WITNESS_UTXO_TX_CACHE[inputIndex] = tx;
    const self = cache;
    const selfIndex = inputIndex;
    delete input.nonWitnessUtxo;
    Object.defineProperty(input, "nonWitnessUtxo", {
      enumerable: true,
      get() {
        const buf = self.__NON_WITNESS_UTXO_BUF_CACHE[selfIndex];
        const txCache = self.__NON_WITNESS_UTXO_TX_CACHE[selfIndex];
        if (buf !== void 0) {
          return buf;
        } else {
          const newBuf = txCache.toBuffer();
          self.__NON_WITNESS_UTXO_BUF_CACHE[selfIndex] = newBuf;
          return newBuf;
        }
      },
      set(data) {
        self.__NON_WITNESS_UTXO_BUF_CACHE[selfIndex] = data;
      }
    });
  }
  function inputFinalizeGetAmts(inputs2, tx, cache, mustFinalize) {
    let inputAmount = 0n;
    inputs2.forEach((input, idx) => {
      if (mustFinalize && input.finalScriptSig)
        tx.ins[idx].script = input.finalScriptSig;
      if (mustFinalize && input.finalScriptWitness) {
        tx.ins[idx].witness = scriptWitnessToWitnessStack(
          input.finalScriptWitness
        );
      }
      if (input.witnessUtxo) {
        inputAmount += input.witnessUtxo.value;
      } else if (input.nonWitnessUtxo) {
        const nwTx = nonWitnessUtxoTxFromCache(cache, input, idx);
        const vout = tx.ins[idx].index;
        const out = nwTx.outs[vout];
        inputAmount += out.value;
      }
    });
    const outputAmount = tx.outs.reduce((total, o) => total + o.value, 0n);
    const fee = inputAmount - outputAmount;
    if (fee < 0) {
      throw new Error("Outputs are spending more than Inputs");
    }
    const bytes = tx.virtualSize();
    cache.__FEE = fee;
    cache.__EXTRACTED_TX = tx;
    cache.__FEE_RATE = Math.floor(Number(fee / BigInt(bytes)));
  }
  function nonWitnessUtxoTxFromCache(cache, input, inputIndex) {
    const c = cache.__NON_WITNESS_UTXO_TX_CACHE;
    if (!c[inputIndex]) {
      addNonWitnessTxCache(cache, input, inputIndex);
    }
    return c[inputIndex];
  }
  function getScriptFromUtxo(inputIndex, input, cache) {
    const { script } = getScriptAndAmountFromUtxo(inputIndex, input, cache);
    return script;
  }
  function getScriptAndAmountFromUtxo(inputIndex, input, cache) {
    if (input.witnessUtxo !== void 0) {
      return {
        script: input.witnessUtxo.script,
        value: input.witnessUtxo.value
      };
    } else if (input.nonWitnessUtxo !== void 0) {
      const nonWitnessUtxoTx = nonWitnessUtxoTxFromCache(
        cache,
        input,
        inputIndex
      );
      const o = nonWitnessUtxoTx.outs[cache.__TX.ins[inputIndex].index];
      return { script: o.script, value: o.value };
    } else {
      throw new Error("Can't find pubkey in input without Utxo data");
    }
  }
  function pubkeyInInput(pubkey, input, inputIndex, cache) {
    const script = getScriptFromUtxo(inputIndex, input, cache);
    const { meaningfulScript } = getMeaningfulScript(
      script,
      inputIndex,
      "input",
      input.redeemScript,
      input.witnessScript
    );
    return pubkeyInScript(pubkey, meaningfulScript);
  }
  function pubkeyInOutput(pubkey, output, outputIndex, cache) {
    const script = cache.__TX.outs[outputIndex].script;
    const { meaningfulScript } = getMeaningfulScript(
      script,
      outputIndex,
      "output",
      output.redeemScript,
      output.witnessScript
    );
    return pubkeyInScript(pubkey, meaningfulScript);
  }
  function redeemFromFinalScriptSig(finalScript) {
    if (!finalScript) return;
    const decomp = decompile(finalScript);
    if (!decomp) return;
    const lastItem = decomp[decomp.length - 1];
    if (!(lastItem instanceof Uint8Array) || isPubkeyLike(lastItem) || isSigLike(lastItem))
      return;
    const sDecomp = decompile(lastItem);
    if (!sDecomp) return;
    return lastItem;
  }
  function redeemFromFinalWitnessScript(finalScript) {
    if (!finalScript) return;
    const decomp = scriptWitnessToWitnessStack(finalScript);
    const lastItem = decomp[decomp.length - 1];
    if (isPubkeyLike(lastItem)) return;
    const sDecomp = decompile(lastItem);
    if (!sDecomp) return;
    return lastItem;
  }
  function compressPubkey(pubkey) {
    if (pubkey.length === 65) {
      const parity = pubkey[64] & 1;
      const newKey = pubkey.slice(0, 33);
      newKey[0] = 2 | parity;
      return newKey;
    }
    return pubkey.slice();
  }
  function isPubkeyLike(buf) {
    return buf.length === 33 && isCanonicalPubKey(buf);
  }
  function isSigLike(buf) {
    return isCanonicalScriptSignature(buf);
  }
  function getMeaningfulScript(script, index, ioType, redeemScript, witnessScript) {
    const isP2SH = isP2SHScript(script);
    const isP2SHP2WSH = isP2SH && redeemScript && isP2WSHScript(redeemScript);
    const isP2WSH = isP2WSHScript(script);
    if (isP2SH && redeemScript === void 0)
      throw new Error("scriptPubkey is P2SH but redeemScript missing");
    if ((isP2WSH || isP2SHP2WSH) && witnessScript === void 0)
      throw new Error(
        "scriptPubkey or redeemScript is P2WSH but witnessScript missing"
      );
    let meaningfulScript;
    if (isP2SHP2WSH) {
      meaningfulScript = witnessScript;
      checkRedeemScript(index, script, redeemScript, ioType);
      checkWitnessScript(index, redeemScript, witnessScript, ioType);
      checkInvalidP2WSH(meaningfulScript);
    } else if (isP2WSH) {
      meaningfulScript = witnessScript;
      checkWitnessScript(index, script, witnessScript, ioType);
      checkInvalidP2WSH(meaningfulScript);
    } else if (isP2SH) {
      meaningfulScript = redeemScript;
      checkRedeemScript(index, script, redeemScript, ioType);
    } else {
      meaningfulScript = script;
    }
    return {
      meaningfulScript,
      type: isP2SHP2WSH ? "p2sh-p2wsh" : isP2SH ? "p2sh" : isP2WSH ? "p2wsh" : "raw"
    };
  }
  function checkInvalidP2WSH(script) {
    if (isP2WPKH(script) || isP2SHScript(script)) {
      throw new Error("P2WPKH or P2SH can not be contained within P2WSH");
    }
  }
  function classifyScript(script) {
    if (isP2WPKH(script)) return "witnesspubkeyhash";
    if (isP2PKH(script)) return "pubkeyhash";
    if (isP2MS(script)) return "multisig";
    if (isP2PK(script)) return "pubkey";
    return "nonstandard";
  }
  function range4(n) {
    return [...Array(n).keys()];
  }

  // node_modules/@neuraiproject/neurai-sign-esp32/dist/index.mjs
  var $f1b85200f32d8427$var$DEFAULT_FILTERS = [
    {
      usbVendorId: 12346,
      usbProductId: 4097
    },
    {
      usbVendorId: 12346
    },
    {
      usbVendorId: 4292,
      usbProductId: 6e4
    },
    {
      usbVendorId: 6790,
      usbProductId: 29987
    },
    {
      usbVendorId: 1027,
      usbProductId: 24577
    },
    {
      usbVendorId: 1659,
      usbProductId: 8963
    },
    {
      usbVendorId: 10374
    }
  ];
  var $f1b85200f32d8427$var$DEFAULT_BAUD_RATE = 115200;
  var $f1b85200f32d8427$export$f93edba7156cc57b = class _$f1b85200f32d8427$export$f93edba7156cc57b {
    constructor(options) {
      this.port = null;
      this.reader = null;
      this.writer = null;
      this.readableStreamClosed = null;
      this.writableStreamClosed = null;
      this.isReading = false;
      this.responseQueue = [];
      this.baudRate = options?.baudRate ?? $f1b85200f32d8427$var$DEFAULT_BAUD_RATE;
      this.filters = options?.filters ?? $f1b85200f32d8427$var$DEFAULT_FILTERS;
    }
    static isSupported() {
      return typeof navigator !== "undefined" && "serial" in navigator;
    }
    async open() {
      if (!_$f1b85200f32d8427$export$f93edba7156cc57b.isSupported()) throw new Error("Web Serial API not supported. Use Chrome, Edge, or Opera.");
      this.port = await navigator.serial.requestPort({
        filters: this.filters
      });
      await this.port.open({
        baudRate: this.baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        flowControl: "none",
        bufferSize: 8192
      });
      const decoder = new TextDecoderStream();
      this.readableStreamClosed = this.port.readable.pipeTo(decoder.writable);
      this.reader = decoder.readable.getReader();
      const encoder = new TextEncoderStream();
      this.writableStreamClosed = encoder.readable.pipeTo(this.port.writable);
      this.writer = encoder.writable.getWriter();
      this.isReading = true;
      this.readLoop();
      await this.delay(1200);
      this.responseQueue = [];
    }
    async close() {
      this.isReading = false;
      if (this.reader) {
        await this.reader.cancel();
        await this.readableStreamClosed?.catch(() => {
        });
        this.reader = null;
      }
      if (this.writer) {
        await this.writer.close();
        await this.writableStreamClosed;
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
      this.responseQueue = [];
    }
    get connected() {
      return this.port !== null && this.writer !== null;
    }
    async sendCommand(command, timeoutMs = 65e3) {
      if (!this.writer) throw new Error("Serial port not connected");
      this.responseQueue = [];
      const json = JSON.stringify(command);
      console.debug("[NeuraiESP32 Serial] Sending command", {
        action: command.action,
        payloadLength: json.length + 1,
        timeoutMs
      });
      await this.writeChunked(json);
      await this.writer.ready;
      await this.writer.write("\n");
      const response = await this.waitForResponse(timeoutMs);
      if (!response) throw new Error("Device response timeout");
      return response;
    }
    async sendCommandFinal(command, timeoutMs = 65e3) {
      if (!this.writer) throw new Error("Serial port not connected");
      this.responseQueue = [];
      const json = JSON.stringify(command);
      console.debug("[NeuraiESP32 Serial] Sending command", {
        action: command.action,
        payloadLength: json.length + 1,
        timeoutMs
      });
      await this.writeChunked(json);
      await this.writer.ready;
      await this.writer.write("\n");
      const startTime = Date.now();
      while (Date.now() - startTime < timeoutMs) {
        const response = await this.waitForResponse(timeoutMs - (Date.now() - startTime));
        if (!response) throw new Error("Device response timeout");
        if (response.status === "processing") continue;
        return response;
      }
      throw new Error("Device response timeout");
    }
    async readLoop() {
      let buffer = "";
      while (this.isReading && this.reader) try {
        const { value: value2, done } = await this.reader.read();
        if (done) break;
        buffer += value2;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const rawLine of lines) {
          const line = rawLine.trim().replace(/\r/g, "");
          if (line.length === 0) continue;
          if (line.startsWith("{")) try {
            const data = JSON.parse(line);
            console.debug("[NeuraiESP32 Serial] JSON line received", data);
            this.responseQueue.push(data);
          } catch {
            console.debug("[NeuraiESP32 Serial] Invalid JSON line", line);
          }
          else console.debug("[NeuraiESP32 Serial] Non-JSON serial line", line);
        }
      } catch {
        break;
      }
    }
    waitForResponse(timeoutMs) {
      return new Promise((resolve) => {
        const startTime = Date.now();
        const check15 = () => {
          if (this.responseQueue.length > 0) {
            const response = this.responseQueue.shift();
            console.debug("[NeuraiESP32 Serial] Response dequeued", {
              waitedMs: Date.now() - startTime,
              pendingResponses: this.responseQueue.length,
              status: response.status
            });
            resolve(response);
          } else if (Date.now() - startTime > timeoutMs) {
            console.error("[NeuraiESP32 Serial] Response timeout", {
              timeoutMs,
              queuedResponses: this.responseQueue.length
            });
            resolve(null);
          } else setTimeout(check15, 50);
        };
        check15();
      });
    }
    async writeChunked(data, chunkSize = 256, pauseMs = 8) {
      if (!this.writer) throw new Error("Serial port not connected");
      const totalChunks = Math.ceil(data.length / chunkSize);
      const startedAt = Date.now();
      let totalReadyMs = 0;
      let totalWriteMs = 0;
      let totalPauseMs = 0;
      console.debug("[NeuraiESP32 Serial][writeChunked] start", {
        totalBytes: data.length,
        chunkSize,
        pauseMs,
        totalChunks
      });
      for (let offset = 0, chunkIndex = 0; offset < data.length; offset += chunkSize, chunkIndex += 1) {
        const chunk = data.slice(offset, offset + chunkSize);
        const readyStartedAt = Date.now();
        await this.writer.ready;
        const readyMs = Date.now() - readyStartedAt;
        totalReadyMs += readyMs;
        const writeStartedAt = Date.now();
        await this.writer.write(chunk);
        const writeMs = Date.now() - writeStartedAt;
        totalWriteMs += writeMs;
        let actualPauseMs = 0;
        if (pauseMs > 0 && offset + chunkSize < data.length) {
          const pauseStartedAt = Date.now();
          await this.delay(pauseMs);
          actualPauseMs = Date.now() - pauseStartedAt;
          totalPauseMs += actualPauseMs;
        }
        console.debug("[NeuraiESP32 Serial][writeChunked] chunk", {
          chunkIndex: chunkIndex + 1,
          totalChunks,
          chunkBytes: chunk.length,
          readyMs,
          writeMs,
          pauseMs: actualPauseMs
        });
      }
      console.debug("[NeuraiESP32 Serial][writeChunked] complete", {
        totalBytes: data.length,
        totalChunks,
        totalMs: Date.now() - startedAt,
        totalReadyMs,
        totalWriteMs,
        totalPauseMs
      });
    }
    delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
  };
  var $ab66056610f04b01$export$6b5a4442fe3d94ae = {
    messagePrefix: "Neurai Signed Message:\n",
    bech32: "",
    bip32: {
      public: 76067358,
      private: 76066276
    },
    pubKeyHash: 53,
    scriptHash: 117,
    wif: 128
  };
  var $ab66056610f04b01$export$7eb3dea33add35cf = {
    messagePrefix: "Neurai Signed Message:\n",
    bech32: "",
    bip32: {
      public: 70617039,
      private: 70615956
    },
    pubKeyHash: 127,
    scriptHash: 196,
    wif: 239
  };
  var $ab66056610f04b01$export$688657d38fcd7269 = {
    messagePrefix: "Neurai Signed Message:\n",
    bech32: "",
    bip32: {
      public: 76067358,
      private: 76066276
    },
    pubKeyHash: 53,
    scriptHash: 117,
    wif: 128
  };
  var $ab66056610f04b01$export$68e8f8241c8185fe = {
    messagePrefix: "Neurai Signed Message:\n",
    bech32: "",
    bip32: {
      public: 70617039,
      private: 70615956
    },
    pubKeyHash: 127,
    scriptHash: 196,
    wif: 239
  };
  var $ab66056610f04b01$var$networkMap = {
    xna: $ab66056610f04b01$export$6b5a4442fe3d94ae,
    "xna-test": $ab66056610f04b01$export$7eb3dea33add35cf,
    "xna-legacy": $ab66056610f04b01$export$688657d38fcd7269,
    "xna-legacy-test": $ab66056610f04b01$export$68e8f8241c8185fe
  };
  function $ab66056610f04b01$export$7de4970ebfd8206d(network) {
    const net = $ab66056610f04b01$var$networkMap[network];
    if (!net) throw new Error(`Unknown network: ${network}`);
    return net;
  }
  var $68e2926fe257f2e4$var$DEFAULT_FEE_RATE = 1024;
  var $68e2926fe257f2e4$var$TX_OVERHEAD = 10;
  var $68e2926fe257f2e4$var$INPUT_SIZE = 148;
  var $68e2926fe257f2e4$var$OUTPUT_SIZE = 34;
  function $68e2926fe257f2e4$var$estimateTxSize(inputCount, outputCount) {
    return $68e2926fe257f2e4$var$TX_OVERHEAD + inputCount * $68e2926fe257f2e4$var$INPUT_SIZE + outputCount * $68e2926fe257f2e4$var$OUTPUT_SIZE;
  }
  function $68e2926fe257f2e4$var$parseMasterFingerprint(hex) {
    if (hex.length !== 8) throw new Error(`Invalid master fingerprint: expected 8 hex chars, got ${hex.length}`);
    return (0, import_buffer.Buffer).from(hex, "hex");
  }
  function $68e2926fe257f2e4$var$getSignatureHashType(signature2) {
    return signature2[signature2.length - 1] ?? 1;
  }
  function $68e2926fe257f2e4$var$checkPartialSigSighashes(input) {
    if (!input.sighashType || !input.partialSig) return;
    let normalizedSighashType = input.sighashType;
    input.partialSig.forEach((pSig) => {
      const hashType = $68e2926fe257f2e4$var$getSignatureHashType(pSig.signature);
      if (normalizedSighashType !== hashType) {
        console.warn("[NeuraiSignESP32] Adjusting input sighashType to match returned signature", {
          previousSighashType: normalizedSighashType,
          returnedHashType: hashType
        });
        normalizedSighashType = hashType;
      }
    });
    input.sighashType = normalizedSighashType;
  }
  function $68e2926fe257f2e4$var$nonWitnessUtxoTxFromCache(cache, input, inputIndex) {
    const existing = cache.__NON_WITNESS_UTXO_TX_CACHE?.[inputIndex];
    if (existing) return existing;
    if (!input.nonWitnessUtxo) throw new Error(`Missing nonWitnessUtxo for input #${inputIndex}`);
    const tx = Transaction.fromBuffer(input.nonWitnessUtxo);
    cache.__NON_WITNESS_UTXO_TX_CACHE ?? (cache.__NON_WITNESS_UTXO_TX_CACHE = {});
    cache.__NON_WITNESS_UTXO_TX_CACHE[inputIndex] = tx;
    return tx;
  }
  function $68e2926fe257f2e4$export$236ea1e009011592(options) {
    const { network, utxos, outputs: outputs2, changeAddress, pubkey, masterFingerprint, derivationPath, feeRate = $68e2926fe257f2e4$var$DEFAULT_FEE_RATE } = options;
    if (utxos.length === 0) throw new Error("No UTXOs provided");
    if (outputs2.length === 0) throw new Error("No outputs provided");
    const totalOutputValue = outputs2.reduce((sum, output) => sum + output.value, 0);
    const totalInputValue = utxos.reduce((sum, utxo) => sum + utxo.satoshis, 0);
    const estimatedSize = $68e2926fe257f2e4$var$estimateTxSize(utxos.length, outputs2.length + 1);
    const fee = estimatedSize * feeRate;
    const change = totalInputValue - totalOutputValue - fee;
    if (change < 0) throw new Error(`Insufficient funds: inputs=${totalInputValue}, outputs=${totalOutputValue}, fee=${fee}`);
    const psbt = new Psbt2({
      network: (0, $ab66056610f04b01$export$7de4970ebfd8206d)(network)
    });
    const bip32Derivation = [
      {
        masterFingerprint: $68e2926fe257f2e4$var$parseMasterFingerprint(masterFingerprint),
        path: derivationPath,
        pubkey: (0, import_buffer.Buffer).from(pubkey, "hex")
      }
    ];
    for (const utxo of utxos) psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: (0, import_buffer.Buffer).from(utxo.rawTxHex, "hex"),
      bip32Derivation
    });
    for (const output of outputs2) psbt.addOutput({
      address: output.address,
      value: BigInt(output.value)
    });
    const DUST_THRESHOLD = 546;
    if (change >= DUST_THRESHOLD) psbt.addOutput({
      address: changeAddress,
      value: BigInt(change),
      bip32Derivation
    });
    return psbt.toBase64();
  }
  function $68e2926fe257f2e4$export$e0e3d6f226ea0b0a(options) {
    const network = (0, $ab66056610f04b01$export$7de4970ebfd8206d)(options.network);
    const tx = Transaction.fromHex(options.rawUnsignedTransaction);
    const psbt = new Psbt2({
      network
    });
    psbt.setVersion(tx.version);
    psbt.setLocktime(tx.locktime);
    for (let index = 0; index < tx.ins.length; index += 1) {
      const input = tx.ins[index];
      const metadata = options.inputs[index];
      if (!metadata) throw new Error(`Missing input metadata for input #${index}`);
      const inputData = {
        hash: metadata.txid,
        index: metadata.vout,
        sequence: metadata.sequence ?? input.sequence,
        nonWitnessUtxo: (0, import_buffer.Buffer).from(metadata.rawTxHex, "hex")
      };
      if (metadata.masterFingerprint && metadata.derivationPath && metadata.pubkey) inputData.bip32Derivation = [
        {
          masterFingerprint: $68e2926fe257f2e4$var$parseMasterFingerprint(metadata.masterFingerprint),
          path: metadata.derivationPath,
          pubkey: (0, import_buffer.Buffer).from(metadata.pubkey, "hex")
        }
      ];
      if (metadata.sighashType !== void 0) inputData.sighashType = metadata.sighashType;
      psbt.addInput(inputData);
    }
    for (const output of tx.outs) psbt.addOutput({
      script: (0, import_buffer.Buffer).from(output.script),
      value: output.value
    });
    return psbt.toBase64();
  }
  function $68e2926fe257f2e4$export$ce839c4c9bcf7b77(signedPsbtBase64, network) {
    const psbt = Psbt2.fromBase64(signedPsbtBase64, {
      network: (0, $ab66056610f04b01$export$7de4970ebfd8206d)(network)
    });
    $68e2926fe257f2e4$var$finalizeNeuraiP2pkhInputs(psbt, true);
    const tx = $68e2926fe257f2e4$var$extractFinalizableTransaction(psbt, true);
    return {
      txHex: tx.toHex(),
      txId: tx.getId()
    };
  }
  function $68e2926fe257f2e4$export$3a31c64c43aacd3(originalPsbtBase64, signedPsbtBase64, network) {
    const net = (0, $ab66056610f04b01$export$7de4970ebfd8206d)(network);
    const psbt = Psbt2.fromBase64(originalPsbtBase64, {
      network: net
    });
    let mergedWithStandardPsbt = false;
    try {
      const signedPsbt = Psbt2.fromBase64(signedPsbtBase64, {
        network: net
      });
      psbt.combine(signedPsbt);
      mergedWithStandardPsbt = true;
    } catch {
    }
    if (!mergedWithStandardPsbt) {
      const partialSigsByInput = $68e2926fe257f2e4$var$extractPartialSigsFromUNeuraiPsbt(originalPsbtBase64, signedPsbtBase64, psbt.inputCount);
      partialSigsByInput.forEach((partialSig, index) => {
        if (partialSig.length === 0) return;
        psbt.updateInput(index, {
          partialSig
        });
      });
    }
    psbt.data.inputs.forEach((input) => $68e2926fe257f2e4$var$checkPartialSigSighashes(input));
    $68e2926fe257f2e4$var$finalizeNeuraiP2pkhInputs(psbt, false);
    const tx = $68e2926fe257f2e4$var$extractFinalizableTransaction(psbt, false);
    return {
      txHex: tx.toHex(),
      txId: tx.getId()
    };
  }
  function $68e2926fe257f2e4$export$78a5723c75e7be9(psbtBase64, network) {
    try {
      Psbt2.fromBase64(psbtBase64, {
        network: (0, $ab66056610f04b01$export$7de4970ebfd8206d)(network)
      });
      return true;
    } catch {
      return false;
    }
  }
  function $68e2926fe257f2e4$var$extractPartialSigsFromUNeuraiPsbt(originalBase64, signedBase64, inputCount) {
    const originalBuffer = (0, import_buffer.Buffer).from(originalBase64, "base64");
    const buffer = (0, import_buffer.Buffer).from(signedBase64, "base64");
    const partialSigsByInput = Array.from({
      length: inputCount
    }, () => []);
    if (buffer.length < 5 || buffer.toString("ascii", 0, 4) !== "psbt" || buffer[4] !== 255) throw new Error("NeuraiHW returned an invalid PSBT header");
    let offset = $68e2926fe257f2e4$var$getFirstInputSectionOffset(originalBuffer);
    for (let inputIndex = 0; inputIndex < inputCount; inputIndex += 1) while (offset < buffer.length) {
      const keyLen = $68e2926fe257f2e4$var$readPsbtVarInt(buffer, offset);
      offset += keyLen.size;
      if (keyLen.value === 0) break;
      const key = buffer.subarray(offset, offset + keyLen.value);
      offset += keyLen.value;
      const valueLen = $68e2926fe257f2e4$var$readPsbtVarInt(buffer, offset);
      offset += valueLen.size;
      const value2 = buffer.subarray(offset, offset + valueLen.value);
      offset += valueLen.value;
      if (key.length > 1 && key[0] === 2) partialSigsByInput[inputIndex].push({
        pubkey: (0, import_buffer.Buffer).from(key.subarray(1)),
        signature: (0, import_buffer.Buffer).from(value2)
      });
    }
    return partialSigsByInput;
  }
  function $68e2926fe257f2e4$var$getFirstInputSectionOffset(buffer) {
    if (buffer.length < 5 || buffer.toString("ascii", 0, 4) !== "psbt" || buffer[4] !== 255) throw new Error("Invalid original PSBT header");
    let offset = 5;
    const globalKeyLen = $68e2926fe257f2e4$var$readPsbtVarInt(buffer, offset);
    offset += globalKeyLen.size + globalKeyLen.value;
    const globalValueLen = $68e2926fe257f2e4$var$readPsbtVarInt(buffer, offset);
    offset += globalValueLen.size + globalValueLen.value;
    if (offset >= buffer.length || buffer[offset] !== 0) throw new Error("Invalid original PSBT global section");
    return offset + 1;
  }
  function $68e2926fe257f2e4$var$readPsbtVarInt(buffer, offset) {
    if (offset >= buffer.length) throw new Error("Format Error: Unexpected End of PSBT");
    const first = buffer[offset];
    if (first < 253) return {
      value: first,
      size: 1
    };
    if (first === 253) {
      if (offset + 2 >= buffer.length) throw new Error("Format Error: Unexpected End of PSBT");
      return {
        value: buffer.readUInt16LE(offset + 1),
        size: 3
      };
    }
    if (first === 254) {
      if (offset + 4 >= buffer.length) throw new Error("Format Error: Unexpected End of PSBT");
      return {
        value: buffer.readUInt32LE(offset + 1),
        size: 5
      };
    }
    throw new Error("PSBT values larger than 32 bits are not supported");
  }
  function $68e2926fe257f2e4$var$finalizeNeuraiP2pkhInputs(psbt, requireAllInputs) {
    let finalizedCount = 0;
    for (let index = 0; index < psbt.inputCount; index += 1) {
      const input = psbt.data.inputs[index];
      if (input.finalScriptSig || input.finalScriptWitness) {
        finalizedCount += 1;
        continue;
      }
      const partialSig = input.partialSig?.[0];
      const nonWitnessUtxo = input.nonWitnessUtxo;
      const txInput = psbt.txInputs[index];
      if (!partialSig || !nonWitnessUtxo || !txInput) {
        if (requireAllInputs) throw new Error(`Missing data to finalize input #${index}`);
        continue;
      }
      const prevTx = Transaction.fromBuffer(nonWitnessUtxo);
      const prevOut = prevTx.outs[txInput.index];
      if (!prevOut) {
        if (requireAllInputs) throw new Error(`Missing prevout to finalize input #${index}`);
        continue;
      }
      psbt.finalizeInput(index, () => ({
        finalScriptSig: script_exports.compile([
          partialSig.signature,
          partialSig.pubkey
        ]),
        finalScriptWitness: void 0
      }));
      finalizedCount += 1;
    }
    if (requireAllInputs && finalizedCount !== psbt.inputCount) throw new Error(`Not all inputs were finalized (${finalizedCount}/${psbt.inputCount})`);
  }
  function $68e2926fe257f2e4$var$extractFinalizableTransaction(psbt, requireAllInputs) {
    const cache = psbt.__CACHE;
    const baseTx = cache?.__TX;
    if (!baseTx || !cache) {
      if (requireAllInputs) return psbt.extractTransaction(true);
      return psbt.extractTransaction();
    }
    const tx = baseTx.clone();
    $68e2926fe257f2e4$var$inputFinalizeGetAmtsPartial(psbt.data.inputs, tx, cache, requireAllInputs);
    return tx;
  }
  function $68e2926fe257f2e4$var$inputFinalizeGetAmtsPartial(inputs2, tx, cache, requireAllInputs) {
    let inputAmount = 0n;
    inputs2.forEach((input, idx) => {
      if (input.finalScriptSig) tx.ins[idx].script = input.finalScriptSig;
      if (input.finalScriptWitness) tx.ins[idx].witness = $68e2926fe257f2e4$var$scriptWitnessToWitnessStack(input.finalScriptWitness);
      if (input.witnessUtxo) {
        inputAmount += input.witnessUtxo.value;
        return;
      }
      if (input.nonWitnessUtxo) {
        const nwTx = $68e2926fe257f2e4$var$nonWitnessUtxoTxFromCache(cache, input, idx);
        const vout = tx.ins[idx].index;
        const out = nwTx.outs[vout];
        if (!out) {
          if (requireAllInputs) throw new Error(`Missing prevout amount for input #${idx}`);
          return;
        }
        inputAmount += out.value;
        return;
      }
      if (requireAllInputs) throw new Error(`Missing UTXO data for input #${idx}`);
    });
    const outputAmount = tx.outs.reduce((total, o) => total + o.value, 0n);
    const fee = inputAmount - outputAmount;
    cache.__FEE = fee >= 0n ? fee : 0n;
    cache.__EXTRACTED_TX = tx;
    cache.__FEE_RATE = fee > 0n ? Math.floor(Number(fee / BigInt(tx.virtualSize()))) : 0;
  }
  function $68e2926fe257f2e4$var$scriptWitnessToWitnessStack(finalScriptWitness) {
    const buffer = (0, import_buffer.Buffer).from(finalScriptWitness);
    let offset = 0;
    const count = $68e2926fe257f2e4$var$readPsbtVarInt(buffer, offset);
    offset += count.size;
    const stack = [];
    for (let i = 0; i < count.value; i += 1) {
      const itemLen = $68e2926fe257f2e4$var$readPsbtVarInt(buffer, offset);
      offset += itemLen.size;
      stack.push(buffer.subarray(offset, offset + itemLen.value));
      offset += itemLen.value;
    }
    return stack;
  }
  var $a6c8409f4f68b3eb$export$fa10ee8b91a777b7 = class {
    constructor(options) {
      this.deviceInfo = null;
      this.serial = new (0, $f1b85200f32d8427$export$f93edba7156cc57b)(options);
    }
    static isSupported() {
      return (0, $f1b85200f32d8427$export$f93edba7156cc57b).isSupported();
    }
    get connected() {
      return this.serial.connected;
    }
    get info() {
      return this.deviceInfo;
    }
    async connect() {
      await this.serial.open();
    }
    async disconnect() {
      this.deviceInfo = null;
      await this.serial.close();
    }
    async getInfo() {
      const response = await this.serial.sendCommand({
        action: "info"
      }, 5e3);
      this.assertSuccess(response);
      this.deviceInfo = response;
      return this.deviceInfo;
    }
    async getAddress() {
      const response = await this.serial.sendCommand({
        action: "get_address"
      }, 35e3);
      this.assertSuccess(response);
      return response;
    }
    async getBip32Pubkey() {
      const response = await this.serial.sendCommand({
        action: "get_bip32_pubkey"
      }, 35e3);
      this.assertSuccess(response);
      return response;
    }
    async signMessage(message) {
      const response = await this.serial.sendCommand({
        action: "sign_message",
        message
      }, 35e3);
      this.assertSuccess(response);
      return response;
    }
    async signPsbt(psbtBase64, display) {
      const response = await this.serial.sendCommandFinal({
        action: "sign_psbt",
        psbt: psbtBase64,
        ...display ? {
          display
        } : {}
      }, 12e4);
      this.assertSuccess(response);
      return response;
    }
    async signTransaction(options) {
      const info = this.deviceInfo;
      const network = options.network ?? this.inferNetworkType(info);
      const pubkey = options.pubkey ?? info?.pubkey;
      const masterFingerprint = options.masterFingerprint ?? info?.master_fingerprint;
      const derivationPath = options.derivationPath ?? info?.path;
      if (!pubkey) throw new Error("pubkey required. Call getInfo() first or provide it explicitly.");
      if (!masterFingerprint) throw new Error("masterFingerprint required. Call getInfo() first or provide it explicitly.");
      if (!derivationPath) throw new Error("derivationPath required. Call getInfo() first or provide it explicitly.");
      const psbtBase64 = (0, $68e2926fe257f2e4$export$236ea1e009011592)({
        network,
        utxos: options.utxos,
        outputs: options.outputs,
        changeAddress: options.changeAddress,
        pubkey,
        masterFingerprint,
        derivationPath,
        feeRate: options.feeRate
      });
      const signResponse = await this.signPsbt(psbtBase64, options.display);
      const { txHex, txId } = (0, $68e2926fe257f2e4$export$3a31c64c43aacd3)(psbtBase64, signResponse.psbt, network);
      return {
        signedPsbtBase64: signResponse.psbt,
        txHex,
        txId,
        signedInputs: signResponse.signed_inputs
      };
    }
    assertSuccess(response) {
      if (response.status === "error") throw new Error(`Device error: ${response.message}`);
    }
    inferNetworkType(info) {
      if (!info) return "xna";
      const name = (info.network ?? "").toLowerCase();
      if (name.includes("legacy") && name.includes("test")) return "xna-legacy-test";
      if (name.includes("legacy")) return "xna-legacy";
      if (name.includes("test")) return "xna-test";
      return "xna";
    }
  };
  function $4136916c4ceb2a50$var$formatAmount(value2) {
    if (typeof value2 === "string") return value2;
    return value2.toFixed(8);
  }
  function $4136916c4ceb2a50$export$fccc4f737c7e9291(options) {
    return {
      kind: "asset_transfer",
      assetName: options.assetName,
      assetAmount: $4136916c4ceb2a50$var$formatAmount(options.assetAmount),
      destinationAddress: options.destinationAddress,
      destinationCount: options.destinationCount ?? 1,
      changeAddress: options.changeAddress,
      changeCount: options.changeCount ?? 0,
      inputAddresses: options.inputAddresses ?? [],
      feeAmount: options.feeAmount === void 0 ? void 0 : $4136916c4ceb2a50$var$formatAmount(options.feeAmount),
      baseCurrency: options.baseCurrency ?? "XNA"
    };
  }
  return __toCommonJS(tmp_sign_esp32_entry_exports);
})();
/*! Bundled license information:

ieee754/index.js:
  (*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> *)

buffer/index.js:
  (*!
   * The buffer module from node.js, for the browser.
   *
   * @author   Feross Aboukhadijeh <https://feross.org>
   * @license  MIT
   *)

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
