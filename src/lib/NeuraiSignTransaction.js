(function () {
	'use strict';

	function _mergeNamespaces(n, m) {
		m.forEach(function (e) {
			e && typeof e !== 'string' && !Array.isArray(e) && Object.keys(e).forEach(function (k) {
				if (k !== 'default' && !(k in n)) {
					var d = Object.getOwnPropertyDescriptor(e, k);
					Object.defineProperty(n, k, d.get ? d : {
						enumerable: true,
						get: function () { return e[k]; }
					});
				}
			});
		});
		return Object.freeze(n);
	}

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	var src$1 = {};

	var buffer = {};

	var base64Js = {};

	var hasRequiredBase64Js;

	function requireBase64Js () {
		if (hasRequiredBase64Js) return base64Js;
		hasRequiredBase64Js = 1;

		base64Js.byteLength = byteLength;
		base64Js.toByteArray = toByteArray;
		base64Js.fromByteArray = fromByteArray;

		var lookup = [];
		var revLookup = [];
		var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;

		var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
		for (var i = 0, len = code.length; i < len; ++i) {
		  lookup[i] = code[i];
		  revLookup[code.charCodeAt(i)] = i;
		}

		// Support decoding URL-safe base64 strings, as Node.js does.
		// See: https://en.wikipedia.org/wiki/Base64#URL_applications
		revLookup['-'.charCodeAt(0)] = 62;
		revLookup['_'.charCodeAt(0)] = 63;

		function getLens (b64) {
		  var len = b64.length;

		  if (len % 4 > 0) {
		    throw new Error('Invalid string. Length must be a multiple of 4')
		  }

		  // Trim off extra bytes after placeholder bytes are found
		  // See: https://github.com/beatgammit/base64-js/issues/42
		  var validLen = b64.indexOf('=');
		  if (validLen === -1) validLen = len;

		  var placeHoldersLen = validLen === len
		    ? 0
		    : 4 - (validLen % 4);

		  return [validLen, placeHoldersLen]
		}

		// base64 is 4/3 + up to two characters of the original data
		function byteLength (b64) {
		  var lens = getLens(b64);
		  var validLen = lens[0];
		  var placeHoldersLen = lens[1];
		  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
		}

		function _byteLength (b64, validLen, placeHoldersLen) {
		  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
		}

		function toByteArray (b64) {
		  var tmp;
		  var lens = getLens(b64);
		  var validLen = lens[0];
		  var placeHoldersLen = lens[1];

		  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));

		  var curByte = 0;

		  // if there are placeholders, only get up to the last complete 4 chars
		  var len = placeHoldersLen > 0
		    ? validLen - 4
		    : validLen;

		  var i;
		  for (i = 0; i < len; i += 4) {
		    tmp =
		      (revLookup[b64.charCodeAt(i)] << 18) |
		      (revLookup[b64.charCodeAt(i + 1)] << 12) |
		      (revLookup[b64.charCodeAt(i + 2)] << 6) |
		      revLookup[b64.charCodeAt(i + 3)];
		    arr[curByte++] = (tmp >> 16) & 0xFF;
		    arr[curByte++] = (tmp >> 8) & 0xFF;
		    arr[curByte++] = tmp & 0xFF;
		  }

		  if (placeHoldersLen === 2) {
		    tmp =
		      (revLookup[b64.charCodeAt(i)] << 2) |
		      (revLookup[b64.charCodeAt(i + 1)] >> 4);
		    arr[curByte++] = tmp & 0xFF;
		  }

		  if (placeHoldersLen === 1) {
		    tmp =
		      (revLookup[b64.charCodeAt(i)] << 10) |
		      (revLookup[b64.charCodeAt(i + 1)] << 4) |
		      (revLookup[b64.charCodeAt(i + 2)] >> 2);
		    arr[curByte++] = (tmp >> 8) & 0xFF;
		    arr[curByte++] = tmp & 0xFF;
		  }

		  return arr
		}

		function tripletToBase64 (num) {
		  return lookup[num >> 18 & 0x3F] +
		    lookup[num >> 12 & 0x3F] +
		    lookup[num >> 6 & 0x3F] +
		    lookup[num & 0x3F]
		}

		function encodeChunk (uint8, start, end) {
		  var tmp;
		  var output = [];
		  for (var i = start; i < end; i += 3) {
		    tmp =
		      ((uint8[i] << 16) & 0xFF0000) +
		      ((uint8[i + 1] << 8) & 0xFF00) +
		      (uint8[i + 2] & 0xFF);
		    output.push(tripletToBase64(tmp));
		  }
		  return output.join('')
		}

		function fromByteArray (uint8) {
		  var tmp;
		  var len = uint8.length;
		  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
		  var parts = [];
		  var maxChunkLength = 16383; // must be multiple of 3

		  // go through the array every three bytes, we'll deal with trailing stuff later
		  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
		    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
		  }

		  // pad the end with zeros, but make sure to not forget the extra bytes
		  if (extraBytes === 1) {
		    tmp = uint8[len - 1];
		    parts.push(
		      lookup[tmp >> 2] +
		      lookup[(tmp << 4) & 0x3F] +
		      '=='
		    );
		  } else if (extraBytes === 2) {
		    tmp = (uint8[len - 2] << 8) + uint8[len - 1];
		    parts.push(
		      lookup[tmp >> 10] +
		      lookup[(tmp >> 4) & 0x3F] +
		      lookup[(tmp << 2) & 0x3F] +
		      '='
		    );
		  }

		  return parts.join('')
		}
		return base64Js;
	}

	var ieee754 = {};

	/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */

	var hasRequiredIeee754;

	function requireIeee754 () {
		if (hasRequiredIeee754) return ieee754;
		hasRequiredIeee754 = 1;
		ieee754.read = function (buffer, offset, isLE, mLen, nBytes) {
		  var e, m;
		  var eLen = (nBytes * 8) - mLen - 1;
		  var eMax = (1 << eLen) - 1;
		  var eBias = eMax >> 1;
		  var nBits = -7;
		  var i = isLE ? (nBytes - 1) : 0;
		  var d = isLE ? -1 : 1;
		  var s = buffer[offset + i];

		  i += d;

		  e = s & ((1 << (-nBits)) - 1);
		  s >>= (-nBits);
		  nBits += eLen;
		  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

		  m = e & ((1 << (-nBits)) - 1);
		  e >>= (-nBits);
		  nBits += mLen;
		  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

		  if (e === 0) {
		    e = 1 - eBias;
		  } else if (e === eMax) {
		    return m ? NaN : ((s ? -1 : 1) * Infinity)
		  } else {
		    m = m + Math.pow(2, mLen);
		    e = e - eBias;
		  }
		  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
		};

		ieee754.write = function (buffer, value, offset, isLE, mLen, nBytes) {
		  var e, m, c;
		  var eLen = (nBytes * 8) - mLen - 1;
		  var eMax = (1 << eLen) - 1;
		  var eBias = eMax >> 1;
		  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
		  var i = isLE ? 0 : (nBytes - 1);
		  var d = isLE ? 1 : -1;
		  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

		  value = Math.abs(value);

		  if (isNaN(value) || value === Infinity) {
		    m = isNaN(value) ? 1 : 0;
		    e = eMax;
		  } else {
		    e = Math.floor(Math.log(value) / Math.LN2);
		    if (value * (c = Math.pow(2, -e)) < 1) {
		      e--;
		      c *= 2;
		    }
		    if (e + eBias >= 1) {
		      value += rt / c;
		    } else {
		      value += rt * Math.pow(2, 1 - eBias);
		    }
		    if (value * c >= 2) {
		      e++;
		      c /= 2;
		    }

		    if (e + eBias >= eMax) {
		      m = 0;
		      e = eMax;
		    } else if (e + eBias >= 1) {
		      m = ((value * c) - 1) * Math.pow(2, mLen);
		      e = e + eBias;
		    } else {
		      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
		      e = 0;
		    }
		  }

		  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

		  e = (e << mLen) | m;
		  eLen += mLen;
		  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

		  buffer[offset + i - d] |= s * 128;
		};
		return ieee754;
	}

	/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <https://feross.org>
	 * @license  MIT
	 */

	var hasRequiredBuffer;

	function requireBuffer () {
		if (hasRequiredBuffer) return buffer;
		hasRequiredBuffer = 1;
		(function (exports$1) {

			const base64 = requireBase64Js();
			const ieee754 = requireIeee754();
			const customInspectSymbol =
			  (typeof Symbol === 'function' && typeof Symbol['for'] === 'function') // eslint-disable-line dot-notation
			    ? Symbol['for']('nodejs.util.inspect.custom') // eslint-disable-line dot-notation
			    : null;

			exports$1.Buffer = Buffer;
			exports$1.SlowBuffer = SlowBuffer;
			exports$1.INSPECT_MAX_BYTES = 50;

			const K_MAX_LENGTH = 0x7fffffff;
			exports$1.kMaxLength = K_MAX_LENGTH;

			/**
			 * If `Buffer.TYPED_ARRAY_SUPPORT`:
			 *   === true    Use Uint8Array implementation (fastest)
			 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
			 *               implementation (most compatible, even IE6)
			 *
			 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
			 * Opera 11.6+, iOS 4.2+.
			 *
			 * We report that the browser does not support typed arrays if the are not subclassable
			 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
			 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
			 * for __proto__ and has a buggy typed array implementation.
			 */
			Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();

			if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
			    typeof console.error === 'function') {
			  console.error(
			    'This browser lacks typed array (Uint8Array) support which is required by ' +
			    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
			  );
			}

			function typedArraySupport () {
			  // Can typed array instances can be augmented?
			  try {
			    const arr = new Uint8Array(1);
			    const proto = { foo: function () { return 42 } };
			    Object.setPrototypeOf(proto, Uint8Array.prototype);
			    Object.setPrototypeOf(arr, proto);
			    return arr.foo() === 42
			  } catch (e) {
			    return false
			  }
			}

			Object.defineProperty(Buffer.prototype, 'parent', {
			  enumerable: true,
			  get: function () {
			    if (!Buffer.isBuffer(this)) return undefined
			    return this.buffer
			  }
			});

			Object.defineProperty(Buffer.prototype, 'offset', {
			  enumerable: true,
			  get: function () {
			    if (!Buffer.isBuffer(this)) return undefined
			    return this.byteOffset
			  }
			});

			function createBuffer (length) {
			  if (length > K_MAX_LENGTH) {
			    throw new RangeError('The value "' + length + '" is invalid for option "size"')
			  }
			  // Return an augmented `Uint8Array` instance
			  const buf = new Uint8Array(length);
			  Object.setPrototypeOf(buf, Buffer.prototype);
			  return buf
			}

			/**
			 * The Buffer constructor returns instances of `Uint8Array` that have their
			 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
			 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
			 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
			 * returns a single octet.
			 *
			 * The `Uint8Array` prototype remains unmodified.
			 */

			function Buffer (arg, encodingOrOffset, length) {
			  // Common case.
			  if (typeof arg === 'number') {
			    if (typeof encodingOrOffset === 'string') {
			      throw new TypeError(
			        'The "string" argument must be of type string. Received type number'
			      )
			    }
			    return allocUnsafe(arg)
			  }
			  return from(arg, encodingOrOffset, length)
			}

			Buffer.poolSize = 8192; // not used by this implementation

			function from (value, encodingOrOffset, length) {
			  if (typeof value === 'string') {
			    return fromString(value, encodingOrOffset)
			  }

			  if (ArrayBuffer.isView(value)) {
			    return fromArrayView(value)
			  }

			  if (value == null) {
			    throw new TypeError(
			      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
			      'or Array-like Object. Received type ' + (typeof value)
			    )
			  }

			  if (isInstance(value, ArrayBuffer) ||
			      (value && isInstance(value.buffer, ArrayBuffer))) {
			    return fromArrayBuffer(value, encodingOrOffset, length)
			  }

			  if (typeof SharedArrayBuffer !== 'undefined' &&
			      (isInstance(value, SharedArrayBuffer) ||
			      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
			    return fromArrayBuffer(value, encodingOrOffset, length)
			  }

			  if (typeof value === 'number') {
			    throw new TypeError(
			      'The "value" argument must not be of type number. Received type number'
			    )
			  }

			  const valueOf = value.valueOf && value.valueOf();
			  if (valueOf != null && valueOf !== value) {
			    return Buffer.from(valueOf, encodingOrOffset, length)
			  }

			  const b = fromObject(value);
			  if (b) return b

			  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
			      typeof value[Symbol.toPrimitive] === 'function') {
			    return Buffer.from(value[Symbol.toPrimitive]('string'), encodingOrOffset, length)
			  }

			  throw new TypeError(
			    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
			    'or Array-like Object. Received type ' + (typeof value)
			  )
			}

			/**
			 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
			 * if value is a number.
			 * Buffer.from(str[, encoding])
			 * Buffer.from(array)
			 * Buffer.from(buffer)
			 * Buffer.from(arrayBuffer[, byteOffset[, length]])
			 **/
			Buffer.from = function (value, encodingOrOffset, length) {
			  return from(value, encodingOrOffset, length)
			};

			// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
			// https://github.com/feross/buffer/pull/148
			Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype);
			Object.setPrototypeOf(Buffer, Uint8Array);

			function assertSize (size) {
			  if (typeof size !== 'number') {
			    throw new TypeError('"size" argument must be of type number')
			  } else if (size < 0) {
			    throw new RangeError('The value "' + size + '" is invalid for option "size"')
			  }
			}

			function alloc (size, fill, encoding) {
			  assertSize(size);
			  if (size <= 0) {
			    return createBuffer(size)
			  }
			  if (fill !== undefined) {
			    // Only pay attention to encoding if it's a string. This
			    // prevents accidentally sending in a number that would
			    // be interpreted as a start offset.
			    return typeof encoding === 'string'
			      ? createBuffer(size).fill(fill, encoding)
			      : createBuffer(size).fill(fill)
			  }
			  return createBuffer(size)
			}

			/**
			 * Creates a new filled Buffer instance.
			 * alloc(size[, fill[, encoding]])
			 **/
			Buffer.alloc = function (size, fill, encoding) {
			  return alloc(size, fill, encoding)
			};

			function allocUnsafe (size) {
			  assertSize(size);
			  return createBuffer(size < 0 ? 0 : checked(size) | 0)
			}

			/**
			 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
			 * */
			Buffer.allocUnsafe = function (size) {
			  return allocUnsafe(size)
			};
			/**
			 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
			 */
			Buffer.allocUnsafeSlow = function (size) {
			  return allocUnsafe(size)
			};

			function fromString (string, encoding) {
			  if (typeof encoding !== 'string' || encoding === '') {
			    encoding = 'utf8';
			  }

			  if (!Buffer.isEncoding(encoding)) {
			    throw new TypeError('Unknown encoding: ' + encoding)
			  }

			  const length = byteLength(string, encoding) | 0;
			  let buf = createBuffer(length);

			  const actual = buf.write(string, encoding);

			  if (actual !== length) {
			    // Writing a hex string, for example, that contains invalid characters will
			    // cause everything after the first invalid character to be ignored. (e.g.
			    // 'abxxcd' will be treated as 'ab')
			    buf = buf.slice(0, actual);
			  }

			  return buf
			}

			function fromArrayLike (array) {
			  const length = array.length < 0 ? 0 : checked(array.length) | 0;
			  const buf = createBuffer(length);
			  for (let i = 0; i < length; i += 1) {
			    buf[i] = array[i] & 255;
			  }
			  return buf
			}

			function fromArrayView (arrayView) {
			  if (isInstance(arrayView, Uint8Array)) {
			    const copy = new Uint8Array(arrayView);
			    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
			  }
			  return fromArrayLike(arrayView)
			}

			function fromArrayBuffer (array, byteOffset, length) {
			  if (byteOffset < 0 || array.byteLength < byteOffset) {
			    throw new RangeError('"offset" is outside of buffer bounds')
			  }

			  if (array.byteLength < byteOffset + (length || 0)) {
			    throw new RangeError('"length" is outside of buffer bounds')
			  }

			  let buf;
			  if (byteOffset === undefined && length === undefined) {
			    buf = new Uint8Array(array);
			  } else if (length === undefined) {
			    buf = new Uint8Array(array, byteOffset);
			  } else {
			    buf = new Uint8Array(array, byteOffset, length);
			  }

			  // Return an augmented `Uint8Array` instance
			  Object.setPrototypeOf(buf, Buffer.prototype);

			  return buf
			}

			function fromObject (obj) {
			  if (Buffer.isBuffer(obj)) {
			    const len = checked(obj.length) | 0;
			    const buf = createBuffer(len);

			    if (buf.length === 0) {
			      return buf
			    }

			    obj.copy(buf, 0, 0, len);
			    return buf
			  }

			  if (obj.length !== undefined) {
			    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
			      return createBuffer(0)
			    }
			    return fromArrayLike(obj)
			  }

			  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
			    return fromArrayLike(obj.data)
			  }
			}

			function checked (length) {
			  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
			  // length is NaN (which is otherwise coerced to zero.)
			  if (length >= K_MAX_LENGTH) {
			    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
			                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
			  }
			  return length | 0
			}

			function SlowBuffer (length) {
			  if (+length != length) { // eslint-disable-line eqeqeq
			    length = 0;
			  }
			  return Buffer.alloc(+length)
			}

			Buffer.isBuffer = function isBuffer (b) {
			  return b != null && b._isBuffer === true &&
			    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
			};

			Buffer.compare = function compare (a, b) {
			  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength);
			  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength);
			  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
			    throw new TypeError(
			      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
			    )
			  }

			  if (a === b) return 0

			  let x = a.length;
			  let y = b.length;

			  for (let i = 0, len = Math.min(x, y); i < len; ++i) {
			    if (a[i] !== b[i]) {
			      x = a[i];
			      y = b[i];
			      break
			    }
			  }

			  if (x < y) return -1
			  if (y < x) return 1
			  return 0
			};

			Buffer.isEncoding = function isEncoding (encoding) {
			  switch (String(encoding).toLowerCase()) {
			    case 'hex':
			    case 'utf8':
			    case 'utf-8':
			    case 'ascii':
			    case 'latin1':
			    case 'binary':
			    case 'base64':
			    case 'ucs2':
			    case 'ucs-2':
			    case 'utf16le':
			    case 'utf-16le':
			      return true
			    default:
			      return false
			  }
			};

			Buffer.concat = function concat (list, length) {
			  if (!Array.isArray(list)) {
			    throw new TypeError('"list" argument must be an Array of Buffers')
			  }

			  if (list.length === 0) {
			    return Buffer.alloc(0)
			  }

			  let i;
			  if (length === undefined) {
			    length = 0;
			    for (i = 0; i < list.length; ++i) {
			      length += list[i].length;
			    }
			  }

			  const buffer = Buffer.allocUnsafe(length);
			  let pos = 0;
			  for (i = 0; i < list.length; ++i) {
			    let buf = list[i];
			    if (isInstance(buf, Uint8Array)) {
			      if (pos + buf.length > buffer.length) {
			        if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
			        buf.copy(buffer, pos);
			      } else {
			        Uint8Array.prototype.set.call(
			          buffer,
			          buf,
			          pos
			        );
			      }
			    } else if (!Buffer.isBuffer(buf)) {
			      throw new TypeError('"list" argument must be an Array of Buffers')
			    } else {
			      buf.copy(buffer, pos);
			    }
			    pos += buf.length;
			  }
			  return buffer
			};

			function byteLength (string, encoding) {
			  if (Buffer.isBuffer(string)) {
			    return string.length
			  }
			  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
			    return string.byteLength
			  }
			  if (typeof string !== 'string') {
			    throw new TypeError(
			      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
			      'Received type ' + typeof string
			    )
			  }

			  const len = string.length;
			  const mustMatch = (arguments.length > 2 && arguments[2] === true);
			  if (!mustMatch && len === 0) return 0

			  // Use a for loop to avoid recursion
			  let loweredCase = false;
			  for (;;) {
			    switch (encoding) {
			      case 'ascii':
			      case 'latin1':
			      case 'binary':
			        return len
			      case 'utf8':
			      case 'utf-8':
			        return utf8ToBytes(string).length
			      case 'ucs2':
			      case 'ucs-2':
			      case 'utf16le':
			      case 'utf-16le':
			        return len * 2
			      case 'hex':
			        return len >>> 1
			      case 'base64':
			        return base64ToBytes(string).length
			      default:
			        if (loweredCase) {
			          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
			        }
			        encoding = ('' + encoding).toLowerCase();
			        loweredCase = true;
			    }
			  }
			}
			Buffer.byteLength = byteLength;

			function slowToString (encoding, start, end) {
			  let loweredCase = false;

			  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
			  // property of a typed array.

			  // This behaves neither like String nor Uint8Array in that we set start/end
			  // to their upper/lower bounds if the value passed is out of range.
			  // undefined is handled specially as per ECMA-262 6th Edition,
			  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
			  if (start === undefined || start < 0) {
			    start = 0;
			  }
			  // Return early if start > this.length. Done here to prevent potential uint32
			  // coercion fail below.
			  if (start > this.length) {
			    return ''
			  }

			  if (end === undefined || end > this.length) {
			    end = this.length;
			  }

			  if (end <= 0) {
			    return ''
			  }

			  // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
			  end >>>= 0;
			  start >>>= 0;

			  if (end <= start) {
			    return ''
			  }

			  if (!encoding) encoding = 'utf8';

			  while (true) {
			    switch (encoding) {
			      case 'hex':
			        return hexSlice(this, start, end)

			      case 'utf8':
			      case 'utf-8':
			        return utf8Slice(this, start, end)

			      case 'ascii':
			        return asciiSlice(this, start, end)

			      case 'latin1':
			      case 'binary':
			        return latin1Slice(this, start, end)

			      case 'base64':
			        return base64Slice(this, start, end)

			      case 'ucs2':
			      case 'ucs-2':
			      case 'utf16le':
			      case 'utf-16le':
			        return utf16leSlice(this, start, end)

			      default:
			        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
			        encoding = (encoding + '').toLowerCase();
			        loweredCase = true;
			    }
			  }
			}

			// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
			// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
			// reliably in a browserify context because there could be multiple different
			// copies of the 'buffer' package in use. This method works even for Buffer
			// instances that were created from another copy of the `buffer` package.
			// See: https://github.com/feross/buffer/issues/154
			Buffer.prototype._isBuffer = true;

			function swap (b, n, m) {
			  const i = b[n];
			  b[n] = b[m];
			  b[m] = i;
			}

			Buffer.prototype.swap16 = function swap16 () {
			  const len = this.length;
			  if (len % 2 !== 0) {
			    throw new RangeError('Buffer size must be a multiple of 16-bits')
			  }
			  for (let i = 0; i < len; i += 2) {
			    swap(this, i, i + 1);
			  }
			  return this
			};

			Buffer.prototype.swap32 = function swap32 () {
			  const len = this.length;
			  if (len % 4 !== 0) {
			    throw new RangeError('Buffer size must be a multiple of 32-bits')
			  }
			  for (let i = 0; i < len; i += 4) {
			    swap(this, i, i + 3);
			    swap(this, i + 1, i + 2);
			  }
			  return this
			};

			Buffer.prototype.swap64 = function swap64 () {
			  const len = this.length;
			  if (len % 8 !== 0) {
			    throw new RangeError('Buffer size must be a multiple of 64-bits')
			  }
			  for (let i = 0; i < len; i += 8) {
			    swap(this, i, i + 7);
			    swap(this, i + 1, i + 6);
			    swap(this, i + 2, i + 5);
			    swap(this, i + 3, i + 4);
			  }
			  return this
			};

			Buffer.prototype.toString = function toString () {
			  const length = this.length;
			  if (length === 0) return ''
			  if (arguments.length === 0) return utf8Slice(this, 0, length)
			  return slowToString.apply(this, arguments)
			};

			Buffer.prototype.toLocaleString = Buffer.prototype.toString;

			Buffer.prototype.equals = function equals (b) {
			  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
			  if (this === b) return true
			  return Buffer.compare(this, b) === 0
			};

			Buffer.prototype.inspect = function inspect () {
			  let str = '';
			  const max = exports$1.INSPECT_MAX_BYTES;
			  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim();
			  if (this.length > max) str += ' ... ';
			  return '<Buffer ' + str + '>'
			};
			if (customInspectSymbol) {
			  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect;
			}

			Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
			  if (isInstance(target, Uint8Array)) {
			    target = Buffer.from(target, target.offset, target.byteLength);
			  }
			  if (!Buffer.isBuffer(target)) {
			    throw new TypeError(
			      'The "target" argument must be one of type Buffer or Uint8Array. ' +
			      'Received type ' + (typeof target)
			    )
			  }

			  if (start === undefined) {
			    start = 0;
			  }
			  if (end === undefined) {
			    end = target ? target.length : 0;
			  }
			  if (thisStart === undefined) {
			    thisStart = 0;
			  }
			  if (thisEnd === undefined) {
			    thisEnd = this.length;
			  }

			  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
			    throw new RangeError('out of range index')
			  }

			  if (thisStart >= thisEnd && start >= end) {
			    return 0
			  }
			  if (thisStart >= thisEnd) {
			    return -1
			  }
			  if (start >= end) {
			    return 1
			  }

			  start >>>= 0;
			  end >>>= 0;
			  thisStart >>>= 0;
			  thisEnd >>>= 0;

			  if (this === target) return 0

			  let x = thisEnd - thisStart;
			  let y = end - start;
			  const len = Math.min(x, y);

			  const thisCopy = this.slice(thisStart, thisEnd);
			  const targetCopy = target.slice(start, end);

			  for (let i = 0; i < len; ++i) {
			    if (thisCopy[i] !== targetCopy[i]) {
			      x = thisCopy[i];
			      y = targetCopy[i];
			      break
			    }
			  }

			  if (x < y) return -1
			  if (y < x) return 1
			  return 0
			};

			// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
			// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
			//
			// Arguments:
			// - buffer - a Buffer to search
			// - val - a string, Buffer, or number
			// - byteOffset - an index into `buffer`; will be clamped to an int32
			// - encoding - an optional encoding, relevant is val is a string
			// - dir - true for indexOf, false for lastIndexOf
			function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
			  // Empty buffer means no match
			  if (buffer.length === 0) return -1

			  // Normalize byteOffset
			  if (typeof byteOffset === 'string') {
			    encoding = byteOffset;
			    byteOffset = 0;
			  } else if (byteOffset > 0x7fffffff) {
			    byteOffset = 0x7fffffff;
			  } else if (byteOffset < -2147483648) {
			    byteOffset = -2147483648;
			  }
			  byteOffset = +byteOffset; // Coerce to Number.
			  if (numberIsNaN(byteOffset)) {
			    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
			    byteOffset = dir ? 0 : (buffer.length - 1);
			  }

			  // Normalize byteOffset: negative offsets start from the end of the buffer
			  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
			  if (byteOffset >= buffer.length) {
			    if (dir) return -1
			    else byteOffset = buffer.length - 1;
			  } else if (byteOffset < 0) {
			    if (dir) byteOffset = 0;
			    else return -1
			  }

			  // Normalize val
			  if (typeof val === 'string') {
			    val = Buffer.from(val, encoding);
			  }

			  // Finally, search either indexOf (if dir is true) or lastIndexOf
			  if (Buffer.isBuffer(val)) {
			    // Special case: looking for empty string/buffer always fails
			    if (val.length === 0) {
			      return -1
			    }
			    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
			  } else if (typeof val === 'number') {
			    val = val & 0xFF; // Search for a byte value [0-255]
			    if (typeof Uint8Array.prototype.indexOf === 'function') {
			      if (dir) {
			        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
			      } else {
			        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
			      }
			    }
			    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
			  }

			  throw new TypeError('val must be string, number or Buffer')
			}

			function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
			  let indexSize = 1;
			  let arrLength = arr.length;
			  let valLength = val.length;

			  if (encoding !== undefined) {
			    encoding = String(encoding).toLowerCase();
			    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
			        encoding === 'utf16le' || encoding === 'utf-16le') {
			      if (arr.length < 2 || val.length < 2) {
			        return -1
			      }
			      indexSize = 2;
			      arrLength /= 2;
			      valLength /= 2;
			      byteOffset /= 2;
			    }
			  }

			  function read (buf, i) {
			    if (indexSize === 1) {
			      return buf[i]
			    } else {
			      return buf.readUInt16BE(i * indexSize)
			    }
			  }

			  let i;
			  if (dir) {
			    let foundIndex = -1;
			    for (i = byteOffset; i < arrLength; i++) {
			      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
			        if (foundIndex === -1) foundIndex = i;
			        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
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
			          break
			        }
			      }
			      if (found) return i
			    }
			  }

			  return -1
			}

			Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
			  return this.indexOf(val, byteOffset, encoding) !== -1
			};

			Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
			  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
			};

			Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
			  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
			};

			function hexWrite (buf, string, offset, length) {
			  offset = Number(offset) || 0;
			  const remaining = buf.length - offset;
			  if (!length) {
			    length = remaining;
			  } else {
			    length = Number(length);
			    if (length > remaining) {
			      length = remaining;
			    }
			  }

			  const strLen = string.length;

			  if (length > strLen / 2) {
			    length = strLen / 2;
			  }
			  let i;
			  for (i = 0; i < length; ++i) {
			    const parsed = parseInt(string.substr(i * 2, 2), 16);
			    if (numberIsNaN(parsed)) return i
			    buf[offset + i] = parsed;
			  }
			  return i
			}

			function utf8Write (buf, string, offset, length) {
			  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
			}

			function asciiWrite (buf, string, offset, length) {
			  return blitBuffer(asciiToBytes(string), buf, offset, length)
			}

			function base64Write (buf, string, offset, length) {
			  return blitBuffer(base64ToBytes(string), buf, offset, length)
			}

			function ucs2Write (buf, string, offset, length) {
			  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
			}

			Buffer.prototype.write = function write (string, offset, length, encoding) {
			  // Buffer#write(string)
			  if (offset === undefined) {
			    encoding = 'utf8';
			    length = this.length;
			    offset = 0;
			  // Buffer#write(string, encoding)
			  } else if (length === undefined && typeof offset === 'string') {
			    encoding = offset;
			    length = this.length;
			    offset = 0;
			  // Buffer#write(string, offset[, length][, encoding])
			  } else if (isFinite(offset)) {
			    offset = offset >>> 0;
			    if (isFinite(length)) {
			      length = length >>> 0;
			      if (encoding === undefined) encoding = 'utf8';
			    } else {
			      encoding = length;
			      length = undefined;
			    }
			  } else {
			    throw new Error(
			      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
			    )
			  }

			  const remaining = this.length - offset;
			  if (length === undefined || length > remaining) length = remaining;

			  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
			    throw new RangeError('Attempt to write outside buffer bounds')
			  }

			  if (!encoding) encoding = 'utf8';

			  let loweredCase = false;
			  for (;;) {
			    switch (encoding) {
			      case 'hex':
			        return hexWrite(this, string, offset, length)

			      case 'utf8':
			      case 'utf-8':
			        return utf8Write(this, string, offset, length)

			      case 'ascii':
			      case 'latin1':
			      case 'binary':
			        return asciiWrite(this, string, offset, length)

			      case 'base64':
			        // Warning: maxLength not taken into account in base64Write
			        return base64Write(this, string, offset, length)

			      case 'ucs2':
			      case 'ucs-2':
			      case 'utf16le':
			      case 'utf-16le':
			        return ucs2Write(this, string, offset, length)

			      default:
			        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
			        encoding = ('' + encoding).toLowerCase();
			        loweredCase = true;
			    }
			  }
			};

			Buffer.prototype.toJSON = function toJSON () {
			  return {
			    type: 'Buffer',
			    data: Array.prototype.slice.call(this._arr || this, 0)
			  }
			};

			function base64Slice (buf, start, end) {
			  if (start === 0 && end === buf.length) {
			    return base64.fromByteArray(buf)
			  } else {
			    return base64.fromByteArray(buf.slice(start, end))
			  }
			}

			function utf8Slice (buf, start, end) {
			  end = Math.min(buf.length, end);
			  const res = [];

			  let i = start;
			  while (i < end) {
			    const firstByte = buf[i];
			    let codePoint = null;
			    let bytesPerSequence = (firstByte > 0xEF)
			      ? 4
			      : (firstByte > 0xDF)
			          ? 3
			          : (firstByte > 0xBF)
			              ? 2
			              : 1;

			    if (i + bytesPerSequence <= end) {
			      let secondByte, thirdByte, fourthByte, tempCodePoint;

			      switch (bytesPerSequence) {
			        case 1:
			          if (firstByte < 0x80) {
			            codePoint = firstByte;
			          }
			          break
			        case 2:
			          secondByte = buf[i + 1];
			          if ((secondByte & 0xC0) === 0x80) {
			            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
			            if (tempCodePoint > 0x7F) {
			              codePoint = tempCodePoint;
			            }
			          }
			          break
			        case 3:
			          secondByte = buf[i + 1];
			          thirdByte = buf[i + 2];
			          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
			            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
			            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
			              codePoint = tempCodePoint;
			            }
			          }
			          break
			        case 4:
			          secondByte = buf[i + 1];
			          thirdByte = buf[i + 2];
			          fourthByte = buf[i + 3];
			          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
			            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
			            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
			              codePoint = tempCodePoint;
			            }
			          }
			      }
			    }

			    if (codePoint === null) {
			      // we did not generate a valid codePoint so insert a
			      // replacement char (U+FFFD) and advance only 1 byte
			      codePoint = 0xFFFD;
			      bytesPerSequence = 1;
			    } else if (codePoint > 0xFFFF) {
			      // encode to utf16 (surrogate pair dance)
			      codePoint -= 0x10000;
			      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
			      codePoint = 0xDC00 | codePoint & 0x3FF;
			    }

			    res.push(codePoint);
			    i += bytesPerSequence;
			  }

			  return decodeCodePointsArray(res)
			}

			// Based on http://stackoverflow.com/a/22747272/680742, the browser with
			// the lowest limit is Chrome, with 0x10000 args.
			// We go 1 magnitude less, for safety
			const MAX_ARGUMENTS_LENGTH = 0x1000;

			function decodeCodePointsArray (codePoints) {
			  const len = codePoints.length;
			  if (len <= MAX_ARGUMENTS_LENGTH) {
			    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
			  }

			  // Decode in chunks to avoid "call stack size exceeded".
			  let res = '';
			  let i = 0;
			  while (i < len) {
			    res += String.fromCharCode.apply(
			      String,
			      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
			    );
			  }
			  return res
			}

			function asciiSlice (buf, start, end) {
			  let ret = '';
			  end = Math.min(buf.length, end);

			  for (let i = start; i < end; ++i) {
			    ret += String.fromCharCode(buf[i] & 0x7F);
			  }
			  return ret
			}

			function latin1Slice (buf, start, end) {
			  let ret = '';
			  end = Math.min(buf.length, end);

			  for (let i = start; i < end; ++i) {
			    ret += String.fromCharCode(buf[i]);
			  }
			  return ret
			}

			function hexSlice (buf, start, end) {
			  const len = buf.length;

			  if (!start || start < 0) start = 0;
			  if (!end || end < 0 || end > len) end = len;

			  let out = '';
			  for (let i = start; i < end; ++i) {
			    out += hexSliceLookupTable[buf[i]];
			  }
			  return out
			}

			function utf16leSlice (buf, start, end) {
			  const bytes = buf.slice(start, end);
			  let res = '';
			  // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
			  for (let i = 0; i < bytes.length - 1; i += 2) {
			    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256));
			  }
			  return res
			}

			Buffer.prototype.slice = function slice (start, end) {
			  const len = this.length;
			  start = ~~start;
			  end = end === undefined ? len : ~~end;

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
			  // Return an augmented `Uint8Array` instance
			  Object.setPrototypeOf(newBuf, Buffer.prototype);

			  return newBuf
			};

			/*
			 * Need to make sure that buffer isn't trying to write out of bounds.
			 */
			function checkOffset (offset, ext, length) {
			  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
			  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
			}

			Buffer.prototype.readUintLE =
			Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
			  offset = offset >>> 0;
			  byteLength = byteLength >>> 0;
			  if (!noAssert) checkOffset(offset, byteLength, this.length);

			  let val = this[offset];
			  let mul = 1;
			  let i = 0;
			  while (++i < byteLength && (mul *= 0x100)) {
			    val += this[offset + i] * mul;
			  }

			  return val
			};

			Buffer.prototype.readUintBE =
			Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
			  offset = offset >>> 0;
			  byteLength = byteLength >>> 0;
			  if (!noAssert) {
			    checkOffset(offset, byteLength, this.length);
			  }

			  let val = this[offset + --byteLength];
			  let mul = 1;
			  while (byteLength > 0 && (mul *= 0x100)) {
			    val += this[offset + --byteLength] * mul;
			  }

			  return val
			};

			Buffer.prototype.readUint8 =
			Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 1, this.length);
			  return this[offset]
			};

			Buffer.prototype.readUint16LE =
			Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 2, this.length);
			  return this[offset] | (this[offset + 1] << 8)
			};

			Buffer.prototype.readUint16BE =
			Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 2, this.length);
			  return (this[offset] << 8) | this[offset + 1]
			};

			Buffer.prototype.readUint32LE =
			Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 4, this.length);

			  return ((this[offset]) |
			      (this[offset + 1] << 8) |
			      (this[offset + 2] << 16)) +
			      (this[offset + 3] * 0x1000000)
			};

			Buffer.prototype.readUint32BE =
			Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 4, this.length);

			  return (this[offset] * 0x1000000) +
			    ((this[offset + 1] << 16) |
			    (this[offset + 2] << 8) |
			    this[offset + 3])
			};

			Buffer.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE (offset) {
			  offset = offset >>> 0;
			  validateNumber(offset, 'offset');
			  const first = this[offset];
			  const last = this[offset + 7];
			  if (first === undefined || last === undefined) {
			    boundsError(offset, this.length - 8);
			  }

			  const lo = first +
			    this[++offset] * 2 ** 8 +
			    this[++offset] * 2 ** 16 +
			    this[++offset] * 2 ** 24;

			  const hi = this[++offset] +
			    this[++offset] * 2 ** 8 +
			    this[++offset] * 2 ** 16 +
			    last * 2 ** 24;

			  return BigInt(lo) + (BigInt(hi) << BigInt(32))
			});

			Buffer.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE (offset) {
			  offset = offset >>> 0;
			  validateNumber(offset, 'offset');
			  const first = this[offset];
			  const last = this[offset + 7];
			  if (first === undefined || last === undefined) {
			    boundsError(offset, this.length - 8);
			  }

			  const hi = first * 2 ** 24 +
			    this[++offset] * 2 ** 16 +
			    this[++offset] * 2 ** 8 +
			    this[++offset];

			  const lo = this[++offset] * 2 ** 24 +
			    this[++offset] * 2 ** 16 +
			    this[++offset] * 2 ** 8 +
			    last;

			  return (BigInt(hi) << BigInt(32)) + BigInt(lo)
			});

			Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
			  offset = offset >>> 0;
			  byteLength = byteLength >>> 0;
			  if (!noAssert) checkOffset(offset, byteLength, this.length);

			  let val = this[offset];
			  let mul = 1;
			  let i = 0;
			  while (++i < byteLength && (mul *= 0x100)) {
			    val += this[offset + i] * mul;
			  }
			  mul *= 0x80;

			  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

			  return val
			};

			Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
			  offset = offset >>> 0;
			  byteLength = byteLength >>> 0;
			  if (!noAssert) checkOffset(offset, byteLength, this.length);

			  let i = byteLength;
			  let mul = 1;
			  let val = this[offset + --i];
			  while (i > 0 && (mul *= 0x100)) {
			    val += this[offset + --i] * mul;
			  }
			  mul *= 0x80;

			  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

			  return val
			};

			Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 1, this.length);
			  if (!(this[offset] & 0x80)) return (this[offset])
			  return ((0xff - this[offset] + 1) * -1)
			};

			Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 2, this.length);
			  const val = this[offset] | (this[offset + 1] << 8);
			  return (val & 0x8000) ? val | 0xFFFF0000 : val
			};

			Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 2, this.length);
			  const val = this[offset + 1] | (this[offset] << 8);
			  return (val & 0x8000) ? val | 0xFFFF0000 : val
			};

			Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 4, this.length);

			  return (this[offset]) |
			    (this[offset + 1] << 8) |
			    (this[offset + 2] << 16) |
			    (this[offset + 3] << 24)
			};

			Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 4, this.length);

			  return (this[offset] << 24) |
			    (this[offset + 1] << 16) |
			    (this[offset + 2] << 8) |
			    (this[offset + 3])
			};

			Buffer.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE (offset) {
			  offset = offset >>> 0;
			  validateNumber(offset, 'offset');
			  const first = this[offset];
			  const last = this[offset + 7];
			  if (first === undefined || last === undefined) {
			    boundsError(offset, this.length - 8);
			  }

			  const val = this[offset + 4] +
			    this[offset + 5] * 2 ** 8 +
			    this[offset + 6] * 2 ** 16 +
			    (last << 24); // Overflow

			  return (BigInt(val) << BigInt(32)) +
			    BigInt(first +
			    this[++offset] * 2 ** 8 +
			    this[++offset] * 2 ** 16 +
			    this[++offset] * 2 ** 24)
			});

			Buffer.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE (offset) {
			  offset = offset >>> 0;
			  validateNumber(offset, 'offset');
			  const first = this[offset];
			  const last = this[offset + 7];
			  if (first === undefined || last === undefined) {
			    boundsError(offset, this.length - 8);
			  }

			  const val = (first << 24) + // Overflow
			    this[++offset] * 2 ** 16 +
			    this[++offset] * 2 ** 8 +
			    this[++offset];

			  return (BigInt(val) << BigInt(32)) +
			    BigInt(this[++offset] * 2 ** 24 +
			    this[++offset] * 2 ** 16 +
			    this[++offset] * 2 ** 8 +
			    last)
			});

			Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 4, this.length);
			  return ieee754.read(this, offset, true, 23, 4)
			};

			Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 4, this.length);
			  return ieee754.read(this, offset, false, 23, 4)
			};

			Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 8, this.length);
			  return ieee754.read(this, offset, true, 52, 8)
			};

			Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 8, this.length);
			  return ieee754.read(this, offset, false, 52, 8)
			};

			function checkInt (buf, value, offset, ext, max, min) {
			  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
			  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
			  if (offset + ext > buf.length) throw new RangeError('Index out of range')
			}

			Buffer.prototype.writeUintLE =
			Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  byteLength = byteLength >>> 0;
			  if (!noAssert) {
			    const maxBytes = Math.pow(2, 8 * byteLength) - 1;
			    checkInt(this, value, offset, byteLength, maxBytes, 0);
			  }

			  let mul = 1;
			  let i = 0;
			  this[offset] = value & 0xFF;
			  while (++i < byteLength && (mul *= 0x100)) {
			    this[offset + i] = (value / mul) & 0xFF;
			  }

			  return offset + byteLength
			};

			Buffer.prototype.writeUintBE =
			Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  byteLength = byteLength >>> 0;
			  if (!noAssert) {
			    const maxBytes = Math.pow(2, 8 * byteLength) - 1;
			    checkInt(this, value, offset, byteLength, maxBytes, 0);
			  }

			  let i = byteLength - 1;
			  let mul = 1;
			  this[offset + i] = value & 0xFF;
			  while (--i >= 0 && (mul *= 0x100)) {
			    this[offset + i] = (value / mul) & 0xFF;
			  }

			  return offset + byteLength
			};

			Buffer.prototype.writeUint8 =
			Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
			  this[offset] = (value & 0xff);
			  return offset + 1
			};

			Buffer.prototype.writeUint16LE =
			Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
			  this[offset] = (value & 0xff);
			  this[offset + 1] = (value >>> 8);
			  return offset + 2
			};

			Buffer.prototype.writeUint16BE =
			Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
			  this[offset] = (value >>> 8);
			  this[offset + 1] = (value & 0xff);
			  return offset + 2
			};

			Buffer.prototype.writeUint32LE =
			Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
			  this[offset + 3] = (value >>> 24);
			  this[offset + 2] = (value >>> 16);
			  this[offset + 1] = (value >>> 8);
			  this[offset] = (value & 0xff);
			  return offset + 4
			};

			Buffer.prototype.writeUint32BE =
			Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
			  this[offset] = (value >>> 24);
			  this[offset + 1] = (value >>> 16);
			  this[offset + 2] = (value >>> 8);
			  this[offset + 3] = (value & 0xff);
			  return offset + 4
			};

			function wrtBigUInt64LE (buf, value, offset, min, max) {
			  checkIntBI(value, min, max, buf, offset, 7);

			  let lo = Number(value & BigInt(0xffffffff));
			  buf[offset++] = lo;
			  lo = lo >> 8;
			  buf[offset++] = lo;
			  lo = lo >> 8;
			  buf[offset++] = lo;
			  lo = lo >> 8;
			  buf[offset++] = lo;
			  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
			  buf[offset++] = hi;
			  hi = hi >> 8;
			  buf[offset++] = hi;
			  hi = hi >> 8;
			  buf[offset++] = hi;
			  hi = hi >> 8;
			  buf[offset++] = hi;
			  return offset
			}

			function wrtBigUInt64BE (buf, value, offset, min, max) {
			  checkIntBI(value, min, max, buf, offset, 7);

			  let lo = Number(value & BigInt(0xffffffff));
			  buf[offset + 7] = lo;
			  lo = lo >> 8;
			  buf[offset + 6] = lo;
			  lo = lo >> 8;
			  buf[offset + 5] = lo;
			  lo = lo >> 8;
			  buf[offset + 4] = lo;
			  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
			  buf[offset + 3] = hi;
			  hi = hi >> 8;
			  buf[offset + 2] = hi;
			  hi = hi >> 8;
			  buf[offset + 1] = hi;
			  hi = hi >> 8;
			  buf[offset] = hi;
			  return offset + 8
			}

			Buffer.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE (value, offset = 0) {
			  return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
			});

			Buffer.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE (value, offset = 0) {
			  return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
			});

			Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) {
			    const limit = Math.pow(2, (8 * byteLength) - 1);

			    checkInt(this, value, offset, byteLength, limit - 1, -limit);
			  }

			  let i = 0;
			  let mul = 1;
			  let sub = 0;
			  this[offset] = value & 0xFF;
			  while (++i < byteLength && (mul *= 0x100)) {
			    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
			      sub = 1;
			    }
			    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
			  }

			  return offset + byteLength
			};

			Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) {
			    const limit = Math.pow(2, (8 * byteLength) - 1);

			    checkInt(this, value, offset, byteLength, limit - 1, -limit);
			  }

			  let i = byteLength - 1;
			  let mul = 1;
			  let sub = 0;
			  this[offset + i] = value & 0xFF;
			  while (--i >= 0 && (mul *= 0x100)) {
			    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
			      sub = 1;
			    }
			    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
			  }

			  return offset + byteLength
			};

			Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -128);
			  if (value < 0) value = 0xff + value + 1;
			  this[offset] = (value & 0xff);
			  return offset + 1
			};

			Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -32768);
			  this[offset] = (value & 0xff);
			  this[offset + 1] = (value >>> 8);
			  return offset + 2
			};

			Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -32768);
			  this[offset] = (value >>> 8);
			  this[offset + 1] = (value & 0xff);
			  return offset + 2
			};

			Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -2147483648);
			  this[offset] = (value & 0xff);
			  this[offset + 1] = (value >>> 8);
			  this[offset + 2] = (value >>> 16);
			  this[offset + 3] = (value >>> 24);
			  return offset + 4
			};

			Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -2147483648);
			  if (value < 0) value = 0xffffffff + value + 1;
			  this[offset] = (value >>> 24);
			  this[offset + 1] = (value >>> 16);
			  this[offset + 2] = (value >>> 8);
			  this[offset + 3] = (value & 0xff);
			  return offset + 4
			};

			Buffer.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE (value, offset = 0) {
			  return wrtBigUInt64LE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
			});

			Buffer.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE (value, offset = 0) {
			  return wrtBigUInt64BE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
			});

			function checkIEEE754 (buf, value, offset, ext, max, min) {
			  if (offset + ext > buf.length) throw new RangeError('Index out of range')
			  if (offset < 0) throw new RangeError('Index out of range')
			}

			function writeFloat (buf, value, offset, littleEndian, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) {
			    checkIEEE754(buf, value, offset, 4);
			  }
			  ieee754.write(buf, value, offset, littleEndian, 23, 4);
			  return offset + 4
			}

			Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
			  return writeFloat(this, value, offset, true, noAssert)
			};

			Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
			  return writeFloat(this, value, offset, false, noAssert)
			};

			function writeDouble (buf, value, offset, littleEndian, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) {
			    checkIEEE754(buf, value, offset, 8);
			  }
			  ieee754.write(buf, value, offset, littleEndian, 52, 8);
			  return offset + 8
			}

			Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
			  return writeDouble(this, value, offset, true, noAssert)
			};

			Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
			  return writeDouble(this, value, offset, false, noAssert)
			};

			// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
			Buffer.prototype.copy = function copy (target, targetStart, start, end) {
			  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
			  if (!start) start = 0;
			  if (!end && end !== 0) end = this.length;
			  if (targetStart >= target.length) targetStart = target.length;
			  if (!targetStart) targetStart = 0;
			  if (end > 0 && end < start) end = start;

			  // Copy 0 bytes; we're done
			  if (end === start) return 0
			  if (target.length === 0 || this.length === 0) return 0

			  // Fatal error conditions
			  if (targetStart < 0) {
			    throw new RangeError('targetStart out of bounds')
			  }
			  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
			  if (end < 0) throw new RangeError('sourceEnd out of bounds')

			  // Are we oob?
			  if (end > this.length) end = this.length;
			  if (target.length - targetStart < end - start) {
			    end = target.length - targetStart + start;
			  }

			  const len = end - start;

			  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
			    // Use built-in when available, missing from IE11
			    this.copyWithin(targetStart, start, end);
			  } else {
			    Uint8Array.prototype.set.call(
			      target,
			      this.subarray(start, end),
			      targetStart
			    );
			  }

			  return len
			};

			// Usage:
			//    buffer.fill(number[, offset[, end]])
			//    buffer.fill(buffer[, offset[, end]])
			//    buffer.fill(string[, offset[, end]][, encoding])
			Buffer.prototype.fill = function fill (val, start, end, encoding) {
			  // Handle string cases:
			  if (typeof val === 'string') {
			    if (typeof start === 'string') {
			      encoding = start;
			      start = 0;
			      end = this.length;
			    } else if (typeof end === 'string') {
			      encoding = end;
			      end = this.length;
			    }
			    if (encoding !== undefined && typeof encoding !== 'string') {
			      throw new TypeError('encoding must be a string')
			    }
			    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
			      throw new TypeError('Unknown encoding: ' + encoding)
			    }
			    if (val.length === 1) {
			      const code = val.charCodeAt(0);
			      if ((encoding === 'utf8' && code < 128) ||
			          encoding === 'latin1') {
			        // Fast path: If `val` fits into a single byte, use that numeric value.
			        val = code;
			      }
			    }
			  } else if (typeof val === 'number') {
			    val = val & 255;
			  } else if (typeof val === 'boolean') {
			    val = Number(val);
			  }

			  // Invalid ranges are not set to a default, so can range check early.
			  if (start < 0 || this.length < start || this.length < end) {
			    throw new RangeError('Out of range index')
			  }

			  if (end <= start) {
			    return this
			  }

			  start = start >>> 0;
			  end = end === undefined ? this.length : end >>> 0;

			  if (!val) val = 0;

			  let i;
			  if (typeof val === 'number') {
			    for (i = start; i < end; ++i) {
			      this[i] = val;
			    }
			  } else {
			    const bytes = Buffer.isBuffer(val)
			      ? val
			      : Buffer.from(val, encoding);
			    const len = bytes.length;
			    if (len === 0) {
			      throw new TypeError('The value "' + val +
			        '" is invalid for argument "value"')
			    }
			    for (i = 0; i < end - start; ++i) {
			      this[i + start] = bytes[i % len];
			    }
			  }

			  return this
			};

			// CUSTOM ERRORS
			// =============

			// Simplified versions from Node, changed for Buffer-only usage
			const errors = {};
			function E (sym, getMessage, Base) {
			  errors[sym] = class NodeError extends Base {
			    constructor () {
			      super();

			      Object.defineProperty(this, 'message', {
			        value: getMessage.apply(this, arguments),
			        writable: true,
			        configurable: true
			      });

			      // Add the error code to the name to include it in the stack trace.
			      this.name = `${this.name} [${sym}]`;
			      // Access the stack to generate the error message including the error code
			      // from the name.
			      this.stack; // eslint-disable-line no-unused-expressions
			      // Reset the name to the actual name.
			      delete this.name;
			    }

			    get code () {
			      return sym
			    }

			    set code (value) {
			      Object.defineProperty(this, 'code', {
			        configurable: true,
			        enumerable: true,
			        value,
			        writable: true
			      });
			    }

			    toString () {
			      return `${this.name} [${sym}]: ${this.message}`
			    }
			  };
			}

			E('ERR_BUFFER_OUT_OF_BOUNDS',
			  function (name) {
			    if (name) {
			      return `${name} is outside of buffer bounds`
			    }

			    return 'Attempt to access memory outside buffer bounds'
			  }, RangeError);
			E('ERR_INVALID_ARG_TYPE',
			  function (name, actual) {
			    return `The "${name}" argument must be of type number. Received type ${typeof actual}`
			  }, TypeError);
			E('ERR_OUT_OF_RANGE',
			  function (str, range, input) {
			    let msg = `The value of "${str}" is out of range.`;
			    let received = input;
			    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
			      received = addNumericalSeparator(String(input));
			    } else if (typeof input === 'bigint') {
			      received = String(input);
			      if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
			        received = addNumericalSeparator(received);
			      }
			      received += 'n';
			    }
			    msg += ` It must be ${range}. Received ${received}`;
			    return msg
			  }, RangeError);

			function addNumericalSeparator (val) {
			  let res = '';
			  let i = val.length;
			  const start = val[0] === '-' ? 1 : 0;
			  for (; i >= start + 4; i -= 3) {
			    res = `_${val.slice(i - 3, i)}${res}`;
			  }
			  return `${val.slice(0, i)}${res}`
			}

			// CHECK FUNCTIONS
			// ===============

			function checkBounds (buf, offset, byteLength) {
			  validateNumber(offset, 'offset');
			  if (buf[offset] === undefined || buf[offset + byteLength] === undefined) {
			    boundsError(offset, buf.length - (byteLength + 1));
			  }
			}

			function checkIntBI (value, min, max, buf, offset, byteLength) {
			  if (value > max || value < min) {
			    const n = typeof min === 'bigint' ? 'n' : '';
			    let range;
			    {
			      if (min === 0 || min === BigInt(0)) {
			        range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`;
			      } else {
			        range = `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and < 2 ** ` +
			                `${(byteLength + 1) * 8 - 1}${n}`;
			      }
			    }
			    throw new errors.ERR_OUT_OF_RANGE('value', range, value)
			  }
			  checkBounds(buf, offset, byteLength);
			}

			function validateNumber (value, name) {
			  if (typeof value !== 'number') {
			    throw new errors.ERR_INVALID_ARG_TYPE(name, 'number', value)
			  }
			}

			function boundsError (value, length, type) {
			  if (Math.floor(value) !== value) {
			    validateNumber(value, type);
			    throw new errors.ERR_OUT_OF_RANGE('offset', 'an integer', value)
			  }

			  if (length < 0) {
			    throw new errors.ERR_BUFFER_OUT_OF_BOUNDS()
			  }

			  throw new errors.ERR_OUT_OF_RANGE('offset',
			                                    `>= ${0} and <= ${length}`,
			                                    value)
			}

			// HELPER FUNCTIONS
			// ================

			const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;

			function base64clean (str) {
			  // Node takes equal signs as end of the Base64 encoding
			  str = str.split('=')[0];
			  // Node strips out invalid characters like \n and \t from the string, base64-js does not
			  str = str.trim().replace(INVALID_BASE64_RE, '');
			  // Node converts strings with length < 2 to ''
			  if (str.length < 2) return ''
			  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
			  while (str.length % 4 !== 0) {
			    str = str + '=';
			  }
			  return str
			}

			function utf8ToBytes (string, units) {
			  units = units || Infinity;
			  let codePoint;
			  const length = string.length;
			  let leadSurrogate = null;
			  const bytes = [];

			  for (let i = 0; i < length; ++i) {
			    codePoint = string.charCodeAt(i);

			    // is surrogate component
			    if (codePoint > 0xD7FF && codePoint < 0xE000) {
			      // last char was a lead
			      if (!leadSurrogate) {
			        // no lead yet
			        if (codePoint > 0xDBFF) {
			          // unexpected trail
			          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
			          continue
			        } else if (i + 1 === length) {
			          // unpaired lead
			          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
			          continue
			        }

			        // valid lead
			        leadSurrogate = codePoint;

			        continue
			      }

			      // 2 leads in a row
			      if (codePoint < 0xDC00) {
			        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
			        leadSurrogate = codePoint;
			        continue
			      }

			      // valid surrogate pair
			      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
			    } else if (leadSurrogate) {
			      // valid bmp char, but last char was a lead
			      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
			    }

			    leadSurrogate = null;

			    // encode utf8
			    if (codePoint < 0x80) {
			      if ((units -= 1) < 0) break
			      bytes.push(codePoint);
			    } else if (codePoint < 0x800) {
			      if ((units -= 2) < 0) break
			      bytes.push(
			        codePoint >> 0x6 | 0xC0,
			        codePoint & 0x3F | 0x80
			      );
			    } else if (codePoint < 0x10000) {
			      if ((units -= 3) < 0) break
			      bytes.push(
			        codePoint >> 0xC | 0xE0,
			        codePoint >> 0x6 & 0x3F | 0x80,
			        codePoint & 0x3F | 0x80
			      );
			    } else if (codePoint < 0x110000) {
			      if ((units -= 4) < 0) break
			      bytes.push(
			        codePoint >> 0x12 | 0xF0,
			        codePoint >> 0xC & 0x3F | 0x80,
			        codePoint >> 0x6 & 0x3F | 0x80,
			        codePoint & 0x3F | 0x80
			      );
			    } else {
			      throw new Error('Invalid code point')
			    }
			  }

			  return bytes
			}

			function asciiToBytes (str) {
			  const byteArray = [];
			  for (let i = 0; i < str.length; ++i) {
			    // Node's code seems to be doing this and not & 0x7F..
			    byteArray.push(str.charCodeAt(i) & 0xFF);
			  }
			  return byteArray
			}

			function utf16leToBytes (str, units) {
			  let c, hi, lo;
			  const byteArray = [];
			  for (let i = 0; i < str.length; ++i) {
			    if ((units -= 2) < 0) break

			    c = str.charCodeAt(i);
			    hi = c >> 8;
			    lo = c % 256;
			    byteArray.push(lo);
			    byteArray.push(hi);
			  }

			  return byteArray
			}

			function base64ToBytes (str) {
			  return base64.toByteArray(base64clean(str))
			}

			function blitBuffer (src, dst, offset, length) {
			  let i;
			  for (i = 0; i < length; ++i) {
			    if ((i + offset >= dst.length) || (i >= src.length)) break
			    dst[i + offset] = src[i];
			  }
			  return i
			}

			// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
			// the `instanceof` check but they should be treated as of that type.
			// See: https://github.com/feross/buffer/issues/166
			function isInstance (obj, type) {
			  return obj instanceof type ||
			    (obj != null && obj.constructor != null && obj.constructor.name != null &&
			      obj.constructor.name === type.name)
			}
			function numberIsNaN (obj) {
			  // For IE11 support
			  return obj !== obj // eslint-disable-line no-self-compare
			}

			// Create lookup table for `toString('hex')`
			// See: https://github.com/feross/buffer/issues/219
			const hexSliceLookupTable = (function () {
			  const alphabet = '0123456789abcdef';
			  const table = new Array(256);
			  for (let i = 0; i < 16; ++i) {
			    const i16 = i * 16;
			    for (let j = 0; j < 16; ++j) {
			      table[i16 + j] = alphabet[i] + alphabet[j];
			    }
			  }
			  return table
			})();

			// Return not function with Error if BigInt not supported
			function defineBigIntMethod (fn) {
			  return typeof BigInt === 'undefined' ? BufferBigIntNotDefined : fn
			}

			function BufferBigIntNotDefined () {
			  throw new Error('BigInt not supported')
			} 
		} (buffer));
		return buffer;
	}

	var bufferExports = requireBuffer();

	var address = {};

	var networks = {};

	var hasRequiredNetworks;

	function requireNetworks () {
		if (hasRequiredNetworks) return networks;
		hasRequiredNetworks = 1;
		// https://en.bitcoin.it/wiki/List_of_address_prefixes
		// Dogecoin BIP32 is a proposed standard: https://bitcointalk.org/index.php?topic=409731
		Object.defineProperty(networks, '__esModule', { value: true });
		networks.testnet = networks.regtest = networks.bitcoin = void 0;
		/**
		 * Represents the Bitcoin network configuration.
		 */
		networks.bitcoin = {
		  /**
		   * The message prefix used for signing Bitcoin messages.
		   */
		  messagePrefix: '\x18Bitcoin Signed Message:\n',
		  /**
		   * The Bech32 prefix used for Bitcoin addresses.
		   */
		  bech32: 'bc',
		  /**
		   * The BIP32 key prefixes for Bitcoin.
		   */
		  bip32: {
		    /**
		     * The public key prefix for BIP32 extended public keys.
		     */
		    public: 0x0488b21e,
		    /**
		     * The private key prefix for BIP32 extended private keys.
		     */
		    private: 0x0488ade4,
		  },
		  /**
		   * The prefix for Bitcoin public key hashes.
		   */
		  pubKeyHash: 0x00,
		  /**
		   * The prefix for Bitcoin script hashes.
		   */
		  scriptHash: 0x05,
		  /**
		   * The prefix for Bitcoin Wallet Import Format (WIF) private keys.
		   */
		  wif: 0x80,
		};
		/**
		 * Represents the regtest network configuration.
		 */
		networks.regtest = {
		  messagePrefix: '\x18Bitcoin Signed Message:\n',
		  bech32: 'bcrt',
		  bip32: {
		    public: 0x043587cf,
		    private: 0x04358394,
		  },
		  pubKeyHash: 0x6f,
		  scriptHash: 0xc4,
		  wif: 0xef,
		};
		/**
		 * Represents the testnet network configuration.
		 */
		networks.testnet = {
		  messagePrefix: '\x18Bitcoin Signed Message:\n',
		  bech32: 'tb',
		  bip32: {
		    public: 0x043587cf,
		    private: 0x04358394,
		  },
		  pubKeyHash: 0x6f,
		  scriptHash: 0xc4,
		  wif: 0xef,
		};
		return networks;
	}

	var payments = {};

	var embed = {};

	var script = {};

	var bip66 = {};

	var hasRequiredBip66;

	function requireBip66 () {
		if (hasRequiredBip66) return bip66;
		hasRequiredBip66 = 1;
		// Reference https://github.com/bitcoin/bips/blob/master/bip-0066.mediawiki
		// Format: 0x30 [total-length] 0x02 [R-length] [R] 0x02 [S-length] [S]
		// NOTE: SIGHASH byte ignored AND restricted, truncate before use
		Object.defineProperty(bip66, '__esModule', { value: true });
		bip66.encode = bip66.decode = bip66.check = void 0;
		function check(buffer) {
		  if (buffer.length < 8) return false;
		  if (buffer.length > 72) return false;
		  if (buffer[0] !== 0x30) return false;
		  if (buffer[1] !== buffer.length - 2) return false;
		  if (buffer[2] !== 0x02) return false;
		  const lenR = buffer[3];
		  if (lenR === 0) return false;
		  if (5 + lenR >= buffer.length) return false;
		  if (buffer[4 + lenR] !== 0x02) return false;
		  const lenS = buffer[5 + lenR];
		  if (lenS === 0) return false;
		  if (6 + lenR + lenS !== buffer.length) return false;
		  if (buffer[4] & 0x80) return false;
		  if (lenR > 1 && buffer[4] === 0x00 && !(buffer[5] & 0x80)) return false;
		  if (buffer[lenR + 6] & 0x80) return false;
		  if (lenS > 1 && buffer[lenR + 6] === 0x00 && !(buffer[lenR + 7] & 0x80))
		    return false;
		  return true;
		}
		bip66.check = check;
		function decode(buffer) {
		  if (buffer.length < 8) throw new Error('DER sequence length is too short');
		  if (buffer.length > 72) throw new Error('DER sequence length is too long');
		  if (buffer[0] !== 0x30) throw new Error('Expected DER sequence');
		  if (buffer[1] !== buffer.length - 2)
		    throw new Error('DER sequence length is invalid');
		  if (buffer[2] !== 0x02) throw new Error('Expected DER integer');
		  const lenR = buffer[3];
		  if (lenR === 0) throw new Error('R length is zero');
		  if (5 + lenR >= buffer.length) throw new Error('R length is too long');
		  if (buffer[4 + lenR] !== 0x02) throw new Error('Expected DER integer (2)');
		  const lenS = buffer[5 + lenR];
		  if (lenS === 0) throw new Error('S length is zero');
		  if (6 + lenR + lenS !== buffer.length) throw new Error('S length is invalid');
		  if (buffer[4] & 0x80) throw new Error('R value is negative');
		  if (lenR > 1 && buffer[4] === 0x00 && !(buffer[5] & 0x80))
		    throw new Error('R value excessively padded');
		  if (buffer[lenR + 6] & 0x80) throw new Error('S value is negative');
		  if (lenS > 1 && buffer[lenR + 6] === 0x00 && !(buffer[lenR + 7] & 0x80))
		    throw new Error('S value excessively padded');
		  // non-BIP66 - extract R, S values
		  return {
		    r: buffer.slice(4, 4 + lenR),
		    s: buffer.slice(6 + lenR),
		  };
		}
		bip66.decode = decode;
		/*
		 * Expects r and s to be positive DER integers.
		 *
		 * The DER format uses the most significant bit as a sign bit (& 0x80).
		 * If the significant bit is set AND the integer is positive, a 0x00 is prepended.
		 *
		 * Examples:
		 *
		 *      0 =>     0x00
		 *      1 =>     0x01
		 *     -1 =>     0xff
		 *    127 =>     0x7f
		 *   -127 =>     0x81
		 *    128 =>   0x0080
		 *   -128 =>     0x80
		 *    255 =>   0x00ff
		 *   -255 =>   0xff01
		 *  16300 =>   0x3fac
		 * -16300 =>   0xc054
		 *  62300 => 0x00f35c
		 * -62300 => 0xff0ca4
		 */
		function encode(r, s) {
		  const lenR = r.length;
		  const lenS = s.length;
		  if (lenR === 0) throw new Error('R length is zero');
		  if (lenS === 0) throw new Error('S length is zero');
		  if (lenR > 33) throw new Error('R length is too long');
		  if (lenS > 33) throw new Error('S length is too long');
		  if (r[0] & 0x80) throw new Error('R value is negative');
		  if (s[0] & 0x80) throw new Error('S value is negative');
		  if (lenR > 1 && r[0] === 0x00 && !(r[1] & 0x80))
		    throw new Error('R value excessively padded');
		  if (lenS > 1 && s[0] === 0x00 && !(s[1] & 0x80))
		    throw new Error('S value excessively padded');
		  const signature = bufferExports.Buffer.allocUnsafe(6 + lenR + lenS);
		  // 0x30 [total-length] 0x02 [R-length] [R] 0x02 [S-length] [S]
		  signature[0] = 0x30;
		  signature[1] = signature.length - 2;
		  signature[2] = 0x02;
		  signature[3] = r.length;
		  r.copy(signature, 4);
		  signature[4 + lenR] = 0x02;
		  signature[5 + lenR] = s.length;
		  s.copy(signature, 6 + lenR);
		  return signature;
		}
		bip66.encode = encode;
		return bip66;
	}

	var ops = {};

	var hasRequiredOps;

	function requireOps () {
		if (hasRequiredOps) return ops;
		hasRequiredOps = 1;
		Object.defineProperty(ops, '__esModule', { value: true });
		ops.REVERSE_OPS = ops.OPS = void 0;
		const OPS = {
		  OP_FALSE: 0,
		  OP_0: 0,
		  OP_PUSHDATA1: 76,
		  OP_PUSHDATA2: 77,
		  OP_PUSHDATA4: 78,
		  OP_1NEGATE: 79,
		  OP_RESERVED: 80,
		  OP_TRUE: 81,
		  OP_1: 81,
		  OP_2: 82,
		  OP_3: 83,
		  OP_4: 84,
		  OP_5: 85,
		  OP_6: 86,
		  OP_7: 87,
		  OP_8: 88,
		  OP_9: 89,
		  OP_10: 90,
		  OP_11: 91,
		  OP_12: 92,
		  OP_13: 93,
		  OP_14: 94,
		  OP_15: 95,
		  OP_16: 96,
		  OP_NOP: 97,
		  OP_VER: 98,
		  OP_IF: 99,
		  OP_NOTIF: 100,
		  OP_VERIF: 101,
		  OP_VERNOTIF: 102,
		  OP_ELSE: 103,
		  OP_ENDIF: 104,
		  OP_VERIFY: 105,
		  OP_RETURN: 106,
		  OP_TOALTSTACK: 107,
		  OP_FROMALTSTACK: 108,
		  OP_2DROP: 109,
		  OP_2DUP: 110,
		  OP_3DUP: 111,
		  OP_2OVER: 112,
		  OP_2ROT: 113,
		  OP_2SWAP: 114,
		  OP_IFDUP: 115,
		  OP_DEPTH: 116,
		  OP_DROP: 117,
		  OP_DUP: 118,
		  OP_NIP: 119,
		  OP_OVER: 120,
		  OP_PICK: 121,
		  OP_ROLL: 122,
		  OP_ROT: 123,
		  OP_SWAP: 124,
		  OP_TUCK: 125,
		  OP_CAT: 126,
		  OP_SUBSTR: 127,
		  OP_LEFT: 128,
		  OP_RIGHT: 129,
		  OP_SIZE: 130,
		  OP_INVERT: 131,
		  OP_AND: 132,
		  OP_OR: 133,
		  OP_XOR: 134,
		  OP_EQUAL: 135,
		  OP_EQUALVERIFY: 136,
		  OP_RESERVED1: 137,
		  OP_RESERVED2: 138,
		  OP_1ADD: 139,
		  OP_1SUB: 140,
		  OP_2MUL: 141,
		  OP_2DIV: 142,
		  OP_NEGATE: 143,
		  OP_ABS: 144,
		  OP_NOT: 145,
		  OP_0NOTEQUAL: 146,
		  OP_ADD: 147,
		  OP_SUB: 148,
		  OP_MUL: 149,
		  OP_DIV: 150,
		  OP_MOD: 151,
		  OP_LSHIFT: 152,
		  OP_RSHIFT: 153,
		  OP_BOOLAND: 154,
		  OP_BOOLOR: 155,
		  OP_NUMEQUAL: 156,
		  OP_NUMEQUALVERIFY: 157,
		  OP_NUMNOTEQUAL: 158,
		  OP_LESSTHAN: 159,
		  OP_GREATERTHAN: 160,
		  OP_LESSTHANOREQUAL: 161,
		  OP_GREATERTHANOREQUAL: 162,
		  OP_MIN: 163,
		  OP_MAX: 164,
		  OP_WITHIN: 165,
		  OP_RIPEMD160: 166,
		  OP_SHA1: 167,
		  OP_SHA256: 168,
		  OP_HASH160: 169,
		  OP_HASH256: 170,
		  OP_CODESEPARATOR: 171,
		  OP_CHECKSIG: 172,
		  OP_CHECKSIGVERIFY: 173,
		  OP_CHECKMULTISIG: 174,
		  OP_CHECKMULTISIGVERIFY: 175,
		  OP_NOP1: 176,
		  OP_NOP2: 177,
		  OP_CHECKLOCKTIMEVERIFY: 177,
		  OP_NOP3: 178,
		  OP_CHECKSEQUENCEVERIFY: 178,
		  OP_NOP4: 179,
		  OP_NOP5: 180,
		  OP_NOP6: 181,
		  OP_NOP7: 182,
		  OP_NOP8: 183,
		  OP_NOP9: 184,
		  OP_NOP10: 185,
		  OP_CHECKSIGADD: 186,
		  OP_PUBKEYHASH: 253,
		  OP_PUBKEY: 254,
		  OP_INVALIDOPCODE: 255,
		};
		ops.OPS = OPS;
		const REVERSE_OPS = {};
		ops.REVERSE_OPS = REVERSE_OPS;
		for (const op of Object.keys(OPS)) {
		  const code = OPS[op];
		  REVERSE_OPS[code] = op;
		}
		return ops;
	}

	var push_data = {};

	var hasRequiredPush_data;

	function requirePush_data () {
		if (hasRequiredPush_data) return push_data;
		hasRequiredPush_data = 1;
		Object.defineProperty(push_data, '__esModule', { value: true });
		push_data.decode = push_data.encode = push_data.encodingLength = void 0;
		const ops_1 = requireOps();
		/**
		 * Calculates the encoding length of a number used for push data in Bitcoin transactions.
		 * @param i The number to calculate the encoding length for.
		 * @returns The encoding length of the number.
		 */
		function encodingLength(i) {
		  return i < ops_1.OPS.OP_PUSHDATA1 ? 1 : i <= 0xff ? 2 : i <= 0xffff ? 3 : 5;
		}
		push_data.encodingLength = encodingLength;
		/**
		 * Encodes a number into a buffer using a variable-length encoding scheme.
		 * The encoded buffer is written starting at the specified offset.
		 * Returns the size of the encoded buffer.
		 *
		 * @param buffer - The buffer to write the encoded data into.
		 * @param num - The number to encode.
		 * @param offset - The offset at which to start writing the encoded buffer.
		 * @returns The size of the encoded buffer.
		 */
		function encode(buffer, num, offset) {
		  const size = encodingLength(num);
		  // ~6 bit
		  if (size === 1) {
		    buffer.writeUInt8(num, offset);
		    // 8 bit
		  } else if (size === 2) {
		    buffer.writeUInt8(ops_1.OPS.OP_PUSHDATA1, offset);
		    buffer.writeUInt8(num, offset + 1);
		    // 16 bit
		  } else if (size === 3) {
		    buffer.writeUInt8(ops_1.OPS.OP_PUSHDATA2, offset);
		    buffer.writeUInt16LE(num, offset + 1);
		    // 32 bit
		  } else {
		    buffer.writeUInt8(ops_1.OPS.OP_PUSHDATA4, offset);
		    buffer.writeUInt32LE(num, offset + 1);
		  }
		  return size;
		}
		push_data.encode = encode;
		/**
		 * Decodes a buffer and returns information about the opcode, number, and size.
		 * @param buffer - The buffer to decode.
		 * @param offset - The offset within the buffer to start decoding.
		 * @returns An object containing the opcode, number, and size, or null if decoding fails.
		 */
		function decode(buffer, offset) {
		  const opcode = buffer.readUInt8(offset);
		  let num;
		  let size;
		  // ~6 bit
		  if (opcode < ops_1.OPS.OP_PUSHDATA1) {
		    num = opcode;
		    size = 1;
		    // 8 bit
		  } else if (opcode === ops_1.OPS.OP_PUSHDATA1) {
		    if (offset + 2 > buffer.length) return null;
		    num = buffer.readUInt8(offset + 1);
		    size = 2;
		    // 16 bit
		  } else if (opcode === ops_1.OPS.OP_PUSHDATA2) {
		    if (offset + 3 > buffer.length) return null;
		    num = buffer.readUInt16LE(offset + 1);
		    size = 3;
		    // 32 bit
		  } else {
		    if (offset + 5 > buffer.length) return null;
		    if (opcode !== ops_1.OPS.OP_PUSHDATA4) throw new Error('Unexpected opcode');
		    num = buffer.readUInt32LE(offset + 1);
		    size = 5;
		  }
		  return {
		    opcode,
		    number: num,
		    size,
		  };
		}
		push_data.decode = decode;
		return push_data;
	}

	var script_number = {};

	var hasRequiredScript_number;

	function requireScript_number () {
		if (hasRequiredScript_number) return script_number;
		hasRequiredScript_number = 1;
		Object.defineProperty(script_number, '__esModule', { value: true });
		script_number.encode = script_number.decode = void 0;
		/**
		 * Decodes a script number from a buffer.
		 *
		 * @param buffer - The buffer containing the script number.
		 * @param maxLength - The maximum length of the script number. Defaults to 4.
		 * @param minimal - Whether the script number should be minimal. Defaults to true.
		 * @returns The decoded script number.
		 * @throws {TypeError} If the script number overflows the maximum length.
		 * @throws {Error} If the script number is not minimally encoded when minimal is true.
		 */
		function decode(buffer, maxLength, minimal) {
		  maxLength = maxLength || 4;
		  minimal = minimal === undefined ? true : minimal;
		  const length = buffer.length;
		  if (length === 0) return 0;
		  if (length > maxLength) throw new TypeError('Script number overflow');
		  if (minimal) {
		    if ((buffer[length - 1] & 0x7f) === 0) {
		      if (length <= 1 || (buffer[length - 2] & 0x80) === 0)
		        throw new Error('Non-minimally encoded script number');
		    }
		  }
		  // 40-bit
		  if (length === 5) {
		    const a = buffer.readUInt32LE(0);
		    const b = buffer.readUInt8(4);
		    if (b & 0x80) return -((b & -129) * 0x100000000 + a);
		    return b * 0x100000000 + a;
		  }
		  // 32-bit / 24-bit / 16-bit / 8-bit
		  let result = 0;
		  for (let i = 0; i < length; ++i) {
		    result |= buffer[i] << (8 * i);
		  }
		  if (buffer[length - 1] & 0x80)
		    return -(result & ~(0x80 << (8 * (length - 1))));
		  return result;
		}
		script_number.decode = decode;
		function scriptNumSize(i) {
		  return i > 0x7fffffff
		    ? 5
		    : i > 0x7fffff
		    ? 4
		    : i > 0x7fff
		    ? 3
		    : i > 0x7f
		    ? 2
		    : i > 0x00
		    ? 1
		    : 0;
		}
		/**
		 * Encodes a number into a Buffer using a specific format.
		 *
		 * @param _number - The number to encode.
		 * @returns The encoded number as a Buffer.
		 */
		function encode(_number) {
		  let value = Math.abs(_number);
		  const size = scriptNumSize(value);
		  const buffer = bufferExports.Buffer.allocUnsafe(size);
		  const negative = _number < 0;
		  for (let i = 0; i < size; ++i) {
		    buffer.writeUInt8(value & 0xff, i);
		    value >>= 8;
		  }
		  if (buffer[size - 1] & 0x80) {
		    buffer.writeUInt8(negative ? 0x80 : 0x00, size - 1);
		  } else if (negative) {
		    buffer[size - 1] |= 0x80;
		  }
		  return buffer;
		}
		script_number.encode = encode;
		return script_number;
	}

	var script_signature = {};

	var types = {};

	var native;
	var hasRequiredNative;

	function requireNative () {
		if (hasRequiredNative) return native;
		hasRequiredNative = 1;
		var types = {
		  Array: function (value) { return value !== null && value !== undefined && value.constructor === Array },
		  Boolean: function (value) { return typeof value === 'boolean' },
		  Function: function (value) { return typeof value === 'function' },
		  Nil: function (value) { return value === undefined || value === null },
		  Number: function (value) { return typeof value === 'number' },
		  Object: function (value) { return typeof value === 'object' },
		  String: function (value) { return typeof value === 'string' },
		  '': function () { return true }
		};

		// TODO: deprecate
		types.Null = types.Nil;

		for (var typeName in types) {
		  types[typeName].toJSON = function (t) {
		    return t
		  }.bind(null, typeName);
		}

		native = types;
		return native;
	}

	var errors;
	var hasRequiredErrors;

	function requireErrors () {
		if (hasRequiredErrors) return errors;
		hasRequiredErrors = 1;
		var native = requireNative();

		function getTypeName (fn) {
		  return fn.name || fn.toString().match(/function (.*?)\s*\(/)[1]
		}

		function getValueTypeName (value) {
		  return native.Nil(value) ? '' : getTypeName(value.constructor)
		}

		function getValue (value) {
		  if (native.Function(value)) return ''
		  if (native.String(value)) return JSON.stringify(value)
		  if (value && native.Object(value)) return ''
		  return value
		}

		function captureStackTrace (e, t) {
		  if (Error.captureStackTrace) {
		    Error.captureStackTrace(e, t);
		  }
		}

		function tfJSON (type) {
		  if (native.Function(type)) return type.toJSON ? type.toJSON() : getTypeName(type)
		  if (native.Array(type)) return 'Array'
		  if (type && native.Object(type)) return 'Object'

		  return type !== undefined ? type : ''
		}

		function tfErrorString (type, value, valueTypeName) {
		  var valueJson = getValue(value);

		  return 'Expected ' + tfJSON(type) + ', got' +
		    (valueTypeName !== '' ? ' ' + valueTypeName : '') +
		    (valueJson !== '' ? ' ' + valueJson : '')
		}

		function TfTypeError (type, value, valueTypeName) {
		  valueTypeName = valueTypeName || getValueTypeName(value);
		  this.message = tfErrorString(type, value, valueTypeName);

		  captureStackTrace(this, TfTypeError);
		  this.__type = type;
		  this.__value = value;
		  this.__valueTypeName = valueTypeName;
		}

		TfTypeError.prototype = Object.create(Error.prototype);
		TfTypeError.prototype.constructor = TfTypeError;

		function tfPropertyErrorString (type, label, name, value, valueTypeName) {
		  var description = '" of type ';
		  if (label === 'key') description = '" with key type ';

		  return tfErrorString('property "' + tfJSON(name) + description + tfJSON(type), value, valueTypeName)
		}

		function TfPropertyTypeError (type, property, label, value, valueTypeName) {
		  if (type) {
		    valueTypeName = valueTypeName || getValueTypeName(value);
		    this.message = tfPropertyErrorString(type, label, property, value, valueTypeName);
		  } else {
		    this.message = 'Unexpected property "' + property + '"';
		  }

		  captureStackTrace(this, TfTypeError);
		  this.__label = label;
		  this.__property = property;
		  this.__type = type;
		  this.__value = value;
		  this.__valueTypeName = valueTypeName;
		}

		TfPropertyTypeError.prototype = Object.create(Error.prototype);
		TfPropertyTypeError.prototype.constructor = TfTypeError;

		function tfCustomError (expected, actual) {
		  return new TfTypeError(expected, {}, actual)
		}

		function tfSubError (e, property, label) {
		  // sub child?
		  if (e instanceof TfPropertyTypeError) {
		    property = property + '.' + e.__property;

		    e = new TfPropertyTypeError(
		      e.__type, property, e.__label, e.__value, e.__valueTypeName
		    );

		  // child?
		  } else if (e instanceof TfTypeError) {
		    e = new TfPropertyTypeError(
		      e.__type, property, label, e.__value, e.__valueTypeName
		    );
		  }

		  captureStackTrace(e);
		  return e
		}

		errors = {
		  TfTypeError: TfTypeError,
		  TfPropertyTypeError: TfPropertyTypeError,
		  tfCustomError: tfCustomError,
		  tfSubError: tfSubError,
		  tfJSON: tfJSON,
		  getValueTypeName: getValueTypeName
		};
		return errors;
	}

	var extra;
	var hasRequiredExtra;

	function requireExtra () {
		if (hasRequiredExtra) return extra;
		hasRequiredExtra = 1;
		var NATIVE = requireNative();
		var ERRORS = requireErrors();

		function _Buffer (value) {
		  return bufferExports.Buffer.isBuffer(value)
		}

		function Hex (value) {
		  return typeof value === 'string' && /^([0-9a-f]{2})+$/i.test(value)
		}

		function _LengthN (type, length) {
		  var name = type.toJSON();

		  function Length (value) {
		    if (!type(value)) return false
		    if (value.length === length) return true

		    throw ERRORS.tfCustomError(name + '(Length: ' + length + ')', name + '(Length: ' + value.length + ')')
		  }
		  Length.toJSON = function () { return name };

		  return Length
		}

		var _ArrayN = _LengthN.bind(null, NATIVE.Array);
		var _BufferN = _LengthN.bind(null, _Buffer);
		var _HexN = _LengthN.bind(null, Hex);
		var _StringN = _LengthN.bind(null, NATIVE.String);

		function Range (a, b, f) {
		  f = f || NATIVE.Number;
		  function _range (value, strict) {
		    return f(value, strict) && (value > a) && (value < b)
		  }
		  _range.toJSON = function () {
		    return `${f.toJSON()} between [${a}, ${b}]`
		  };
		  return _range
		}

		var INT53_MAX = Math.pow(2, 53) - 1;

		function Finite (value) {
		  return typeof value === 'number' && isFinite(value)
		}
		function Int8 (value) { return ((value << 24) >> 24) === value }
		function Int16 (value) { return ((value << 16) >> 16) === value }
		function Int32 (value) { return (value | 0) === value }
		function Int53 (value) {
		  return typeof value === 'number' &&
		    value >= -INT53_MAX &&
		    value <= INT53_MAX &&
		    Math.floor(value) === value
		}
		function UInt8 (value) { return (value & 0xff) === value }
		function UInt16 (value) { return (value & 0xffff) === value }
		function UInt32 (value) { return (value >>> 0) === value }
		function UInt53 (value) {
		  return typeof value === 'number' &&
		    value >= 0 &&
		    value <= INT53_MAX &&
		    Math.floor(value) === value
		}

		var types = {
		  ArrayN: _ArrayN,
		  Buffer: _Buffer,
		  BufferN: _BufferN,
		  Finite: Finite,
		  Hex: Hex,
		  HexN: _HexN,
		  Int8: Int8,
		  Int16: Int16,
		  Int32: Int32,
		  Int53: Int53,
		  Range: Range,
		  StringN: _StringN,
		  UInt8: UInt8,
		  UInt16: UInt16,
		  UInt32: UInt32,
		  UInt53: UInt53
		};

		for (var typeName in types) {
		  types[typeName].toJSON = function (t) {
		    return t
		  }.bind(null, typeName);
		}

		extra = types;
		return extra;
	}

	var typeforce_1;
	var hasRequiredTypeforce;

	function requireTypeforce () {
		if (hasRequiredTypeforce) return typeforce_1;
		hasRequiredTypeforce = 1;
		var ERRORS = requireErrors();
		var NATIVE = requireNative();

		// short-hand
		var tfJSON = ERRORS.tfJSON;
		var TfTypeError = ERRORS.TfTypeError;
		var TfPropertyTypeError = ERRORS.TfPropertyTypeError;
		var tfSubError = ERRORS.tfSubError;
		var getValueTypeName = ERRORS.getValueTypeName;

		var TYPES = {
		  arrayOf: function arrayOf (type, options) {
		    type = compile(type);
		    options = options || {};

		    function _arrayOf (array, strict) {
		      if (!NATIVE.Array(array)) return false
		      if (NATIVE.Nil(array)) return false
		      if (options.minLength !== undefined && array.length < options.minLength) return false
		      if (options.maxLength !== undefined && array.length > options.maxLength) return false
		      if (options.length !== undefined && array.length !== options.length) return false

		      return array.every(function (value, i) {
		        try {
		          return typeforce(type, value, strict)
		        } catch (e) {
		          throw tfSubError(e, i)
		        }
		      })
		    }
		    _arrayOf.toJSON = function () {
		      var str = '[' + tfJSON(type) + ']';
		      if (options.length !== undefined) {
		        str += '{' + options.length + '}';
		      } else if (options.minLength !== undefined || options.maxLength !== undefined) {
		        str += '{' +
		          (options.minLength === undefined ? 0 : options.minLength) + ',' +
		          (options.maxLength === undefined ? Infinity : options.maxLength) + '}';
		      }
		      return str
		    };

		    return _arrayOf
		  },

		  maybe: function maybe (type) {
		    type = compile(type);

		    function _maybe (value, strict) {
		      return NATIVE.Nil(value) || type(value, strict, maybe)
		    }
		    _maybe.toJSON = function () { return '?' + tfJSON(type) };

		    return _maybe
		  },

		  map: function map (propertyType, propertyKeyType) {
		    propertyType = compile(propertyType);
		    if (propertyKeyType) propertyKeyType = compile(propertyKeyType);

		    function _map (value, strict) {
		      if (!NATIVE.Object(value)) return false
		      if (NATIVE.Nil(value)) return false

		      for (var propertyName in value) {
		        try {
		          if (propertyKeyType) {
		            typeforce(propertyKeyType, propertyName, strict);
		          }
		        } catch (e) {
		          throw tfSubError(e, propertyName, 'key')
		        }

		        try {
		          var propertyValue = value[propertyName];
		          typeforce(propertyType, propertyValue, strict);
		        } catch (e) {
		          throw tfSubError(e, propertyName)
		        }
		      }

		      return true
		    }

		    if (propertyKeyType) {
		      _map.toJSON = function () {
		        return '{' + tfJSON(propertyKeyType) + ': ' + tfJSON(propertyType) + '}'
		      };
		    } else {
		      _map.toJSON = function () { return '{' + tfJSON(propertyType) + '}' };
		    }

		    return _map
		  },

		  object: function object (uncompiled) {
		    var type = {};

		    for (var typePropertyName in uncompiled) {
		      type[typePropertyName] = compile(uncompiled[typePropertyName]);
		    }

		    function _object (value, strict) {
		      if (!NATIVE.Object(value)) return false
		      if (NATIVE.Nil(value)) return false

		      var propertyName;

		      try {
		        for (propertyName in type) {
		          var propertyType = type[propertyName];
		          var propertyValue = value[propertyName];

		          typeforce(propertyType, propertyValue, strict);
		        }
		      } catch (e) {
		        throw tfSubError(e, propertyName)
		      }

		      if (strict) {
		        for (propertyName in value) {
		          if (type[propertyName]) continue

		          throw new TfPropertyTypeError(undefined, propertyName)
		        }
		      }

		      return true
		    }
		    _object.toJSON = function () { return tfJSON(type) };

		    return _object
		  },

		  anyOf: function anyOf () {
		    var types = [].slice.call(arguments).map(compile);

		    function _anyOf (value, strict) {
		      return types.some(function (type) {
		        try {
		          return typeforce(type, value, strict)
		        } catch (e) {
		          return false
		        }
		      })
		    }
		    _anyOf.toJSON = function () { return types.map(tfJSON).join('|') };

		    return _anyOf
		  },

		  allOf: function allOf () {
		    var types = [].slice.call(arguments).map(compile);

		    function _allOf (value, strict) {
		      return types.every(function (type) {
		        try {
		          return typeforce(type, value, strict)
		        } catch (e) {
		          return false
		        }
		      })
		    }
		    _allOf.toJSON = function () { return types.map(tfJSON).join(' & ') };

		    return _allOf
		  },

		  quacksLike: function quacksLike (type) {
		    function _quacksLike (value) {
		      return type === getValueTypeName(value)
		    }
		    _quacksLike.toJSON = function () { return type };

		    return _quacksLike
		  },

		  tuple: function tuple () {
		    var types = [].slice.call(arguments).map(compile);

		    function _tuple (values, strict) {
		      if (NATIVE.Nil(values)) return false
		      if (NATIVE.Nil(values.length)) return false
		      if (strict && (values.length !== types.length)) return false

		      return types.every(function (type, i) {
		        try {
		          return typeforce(type, values[i], strict)
		        } catch (e) {
		          throw tfSubError(e, i)
		        }
		      })
		    }
		    _tuple.toJSON = function () { return '(' + types.map(tfJSON).join(', ') + ')' };

		    return _tuple
		  },

		  value: function value (expected) {
		    function _value (actual) {
		      return actual === expected
		    }
		    _value.toJSON = function () { return expected };

		    return _value
		  }
		};

		// TODO: deprecate
		TYPES.oneOf = TYPES.anyOf;

		function compile (type) {
		  if (NATIVE.String(type)) {
		    if (type[0] === '?') return TYPES.maybe(type.slice(1))

		    return NATIVE[type] || TYPES.quacksLike(type)
		  } else if (type && NATIVE.Object(type)) {
		    if (NATIVE.Array(type)) {
		      if (type.length !== 1) throw new TypeError('Expected compile() parameter of type Array of length 1')
		      return TYPES.arrayOf(type[0])
		    }

		    return TYPES.object(type)
		  } else if (NATIVE.Function(type)) {
		    return type
		  }

		  return TYPES.value(type)
		}

		function typeforce (type, value, strict, surrogate) {
		  if (NATIVE.Function(type)) {
		    if (type(value, strict)) return true

		    throw new TfTypeError(surrogate || type, value)
		  }

		  // JIT
		  return typeforce(compile(type), value, strict)
		}

		// assign types to typeforce function
		for (var typeName in NATIVE) {
		  typeforce[typeName] = NATIVE[typeName];
		}

		for (typeName in TYPES) {
		  typeforce[typeName] = TYPES[typeName];
		}

		var EXTRA = requireExtra();
		for (typeName in EXTRA) {
		  typeforce[typeName] = EXTRA[typeName];
		}

		typeforce.compile = compile;
		typeforce.TfTypeError = TfTypeError;
		typeforce.TfPropertyTypeError = TfPropertyTypeError;

		typeforce_1 = typeforce;
		return typeforce_1;
	}

	var hasRequiredTypes;

	function requireTypes () {
		if (hasRequiredTypes) return types;
		hasRequiredTypes = 1;
		(function (exports$1) {
			Object.defineProperty(exports$1, '__esModule', { value: true });
			exports$1.oneOf =
			  exports$1.Null =
			  exports$1.BufferN =
			  exports$1.Function =
			  exports$1.UInt32 =
			  exports$1.UInt8 =
			  exports$1.tuple =
			  exports$1.maybe =
			  exports$1.Hex =
			  exports$1.Buffer =
			  exports$1.String =
			  exports$1.Boolean =
			  exports$1.Array =
			  exports$1.Number =
			  exports$1.Hash256bit =
			  exports$1.Hash160bit =
			  exports$1.Buffer256bit =
			  exports$1.isTaptree =
			  exports$1.isTapleaf =
			  exports$1.TAPLEAF_VERSION_MASK =
			  exports$1.Satoshi =
			  exports$1.isPoint =
			  exports$1.stacksEqual =
			  exports$1.typeforce =
			    void 0;
			const buffer_1 = requireBuffer();
			exports$1.typeforce = requireTypeforce();
			const ZERO32 = buffer_1.Buffer.alloc(32, 0);
			const EC_P = buffer_1.Buffer.from(
			  'fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f',
			  'hex',
			);
			/**
			 * Checks if two arrays of Buffers are equal.
			 * @param a - The first array of Buffers.
			 * @param b - The second array of Buffers.
			 * @returns True if the arrays are equal, false otherwise.
			 */
			function stacksEqual(a, b) {
			  if (a.length !== b.length) return false;
			  return a.every((x, i) => {
			    return x.equals(b[i]);
			  });
			}
			exports$1.stacksEqual = stacksEqual;
			/**
			 * Checks if the given value is a valid elliptic curve point.
			 * @param p - The value to check.
			 * @returns True if the value is a valid elliptic curve point, false otherwise.
			 */
			function isPoint(p) {
			  if (!buffer_1.Buffer.isBuffer(p)) return false;
			  if (p.length < 33) return false;
			  const t = p[0];
			  const x = p.slice(1, 33);
			  if (x.compare(ZERO32) === 0) return false;
			  if (x.compare(EC_P) >= 0) return false;
			  if ((t === 0x02 || t === 0x03) && p.length === 33) {
			    return true;
			  }
			  const y = p.slice(33);
			  if (y.compare(ZERO32) === 0) return false;
			  if (y.compare(EC_P) >= 0) return false;
			  if (t === 0x04 && p.length === 65) return true;
			  return false;
			}
			exports$1.isPoint = isPoint;
			const SATOSHI_MAX = 21 * 1e14;
			function Satoshi(value) {
			  return exports$1.typeforce.UInt53(value) && value <= SATOSHI_MAX;
			}
			exports$1.Satoshi = Satoshi;
			exports$1.TAPLEAF_VERSION_MASK = 0xfe;
			function isTapleaf(o) {
			  if (!o || !('output' in o)) return false;
			  if (!buffer_1.Buffer.isBuffer(o.output)) return false;
			  if (o.version !== undefined)
			    return (o.version & exports$1.TAPLEAF_VERSION_MASK) === o.version;
			  return true;
			}
			exports$1.isTapleaf = isTapleaf;
			function isTaptree(scriptTree) {
			  if (!(0, exports$1.Array)(scriptTree)) return isTapleaf(scriptTree);
			  if (scriptTree.length !== 2) return false;
			  return scriptTree.every(t => isTaptree(t));
			}
			exports$1.isTaptree = isTaptree;
			exports$1.Buffer256bit = exports$1.typeforce.BufferN(32);
			exports$1.Hash160bit = exports$1.typeforce.BufferN(20);
			exports$1.Hash256bit = exports$1.typeforce.BufferN(32);
			exports$1.Number = exports$1.typeforce.Number;
			exports$1.Array = exports$1.typeforce.Array;
			exports$1.Boolean = exports$1.typeforce.Boolean;
			exports$1.String = exports$1.typeforce.String;
			exports$1.Buffer = exports$1.typeforce.Buffer;
			exports$1.Hex = exports$1.typeforce.Hex;
			exports$1.maybe = exports$1.typeforce.maybe;
			exports$1.tuple = exports$1.typeforce.tuple;
			exports$1.UInt8 = exports$1.typeforce.UInt8;
			exports$1.UInt32 = exports$1.typeforce.UInt32;
			exports$1.Function = exports$1.typeforce.Function;
			exports$1.BufferN = exports$1.typeforce.BufferN;
			exports$1.Null = exports$1.typeforce.Null;
			exports$1.oneOf = exports$1.typeforce.oneOf; 
		} (types));
		return types;
	}

	var hasRequiredScript_signature;

	function requireScript_signature () {
		if (hasRequiredScript_signature) return script_signature;
		hasRequiredScript_signature = 1;
		Object.defineProperty(script_signature, '__esModule', { value: true });
		script_signature.encode = script_signature.decode = void 0;
		const bip66 = requireBip66();
		const script_1 = requireScript();
		const types = requireTypes();
		const { typeforce } = types;
		const ZERO = bufferExports.Buffer.alloc(1, 0);
		/**
		 * Converts a buffer to a DER-encoded buffer.
		 * @param x - The buffer to be converted.
		 * @returns The DER-encoded buffer.
		 */
		function toDER(x) {
		  let i = 0;
		  while (x[i] === 0) ++i;
		  if (i === x.length) return ZERO;
		  x = x.slice(i);
		  if (x[0] & 0x80) return bufferExports.Buffer.concat([ZERO, x], 1 + x.length);
		  return x;
		}
		/**
		 * Converts a DER-encoded signature to a buffer.
		 * If the first byte of the input buffer is 0x00, it is skipped.
		 * The resulting buffer is 32 bytes long, filled with zeros if necessary.
		 * @param x - The DER-encoded signature.
		 * @returns The converted buffer.
		 */
		function fromDER(x) {
		  if (x[0] === 0x00) x = x.slice(1);
		  const buffer = bufferExports.Buffer.alloc(32, 0);
		  const bstart = Math.max(0, 32 - x.length);
		  x.copy(buffer, bstart);
		  return buffer;
		}
		// BIP62: 1 byte hashType flag (only 0x01, 0x02, 0x03, 0x81, 0x82 and 0x83 are allowed)
		/**
		 * Decodes a buffer into a ScriptSignature object.
		 * @param buffer - The buffer to decode.
		 * @returns The decoded ScriptSignature object.
		 * @throws Error if the hashType is invalid.
		 */
		function decode(buffer) {
		  const hashType = buffer.readUInt8(buffer.length - 1);
		  if (!(0, script_1.isDefinedHashType)(hashType)) {
		    throw new Error('Invalid hashType ' + hashType);
		  }
		  const decoded = bip66.decode(buffer.slice(0, -1));
		  const r = fromDER(decoded.r);
		  const s = fromDER(decoded.s);
		  const signature = bufferExports.Buffer.concat([r, s], 64);
		  return { signature, hashType };
		}
		script_signature.decode = decode;
		/**
		 * Encodes a signature and hash type into a buffer.
		 * @param signature - The signature to encode.
		 * @param hashType - The hash type to encode.
		 * @returns The encoded buffer.
		 * @throws Error if the hashType is invalid.
		 */
		function encode(signature, hashType) {
		  typeforce(
		    {
		      signature: types.BufferN(64),
		      hashType: types.UInt8,
		    },
		    { signature, hashType },
		  );
		  if (!(0, script_1.isDefinedHashType)(hashType)) {
		    throw new Error('Invalid hashType ' + hashType);
		  }
		  const hashTypeBuffer = bufferExports.Buffer.allocUnsafe(1);
		  hashTypeBuffer.writeUInt8(hashType, 0);
		  const r = toDER(signature.slice(0, 32));
		  const s = toDER(signature.slice(32, 64));
		  return bufferExports.Buffer.concat([bip66.encode(r, s), hashTypeBuffer]);
		}
		script_signature.encode = encode;
		return script_signature;
	}

	var hasRequiredScript;

	function requireScript () {
		if (hasRequiredScript) return script;
		hasRequiredScript = 1;
		(function (exports$1) {
			Object.defineProperty(exports$1, '__esModule', { value: true });
			exports$1.signature =
			  exports$1.number =
			  exports$1.isCanonicalScriptSignature =
			  exports$1.isDefinedHashType =
			  exports$1.isCanonicalPubKey =
			  exports$1.toStack =
			  exports$1.fromASM =
			  exports$1.toASM =
			  exports$1.decompile =
			  exports$1.compile =
			  exports$1.countNonPushOnlyOPs =
			  exports$1.isPushOnly =
			  exports$1.OPS =
			    void 0;
			/**
			 * Script tools, including decompile, compile, toASM, fromASM, toStack, isCanonicalPubKey, isCanonicalScriptSignature
			 * @packageDocumentation
			 */
			const bip66 = requireBip66();
			const ops_1 = requireOps();
			Object.defineProperty(exports$1, 'OPS', {
			  enumerable: true,
			  get: function () {
			    return ops_1.OPS;
			  },
			});
			const pushdata = requirePush_data();
			const scriptNumber = requireScript_number();
			const scriptSignature = requireScript_signature();
			const types = requireTypes();
			const { typeforce } = types;
			const OP_INT_BASE = ops_1.OPS.OP_RESERVED; // OP_1 - 1
			function isOPInt(value) {
			  return (
			    types.Number(value) &&
			    (value === ops_1.OPS.OP_0 ||
			      (value >= ops_1.OPS.OP_1 && value <= ops_1.OPS.OP_16) ||
			      value === ops_1.OPS.OP_1NEGATE)
			  );
			}
			function isPushOnlyChunk(value) {
			  return types.Buffer(value) || isOPInt(value);
			}
			function isPushOnly(value) {
			  return types.Array(value) && value.every(isPushOnlyChunk);
			}
			exports$1.isPushOnly = isPushOnly;
			function countNonPushOnlyOPs(value) {
			  return value.length - value.filter(isPushOnlyChunk).length;
			}
			exports$1.countNonPushOnlyOPs = countNonPushOnlyOPs;
			function asMinimalOP(buffer) {
			  if (buffer.length === 0) return ops_1.OPS.OP_0;
			  if (buffer.length !== 1) return;
			  if (buffer[0] >= 1 && buffer[0] <= 16) return OP_INT_BASE + buffer[0];
			  if (buffer[0] === 0x81) return ops_1.OPS.OP_1NEGATE;
			}
			function chunksIsBuffer(buf) {
			  return bufferExports.Buffer.isBuffer(buf);
			}
			function chunksIsArray(buf) {
			  return types.Array(buf);
			}
			function singleChunkIsBuffer(buf) {
			  return bufferExports.Buffer.isBuffer(buf);
			}
			/**
			 * Compiles an array of chunks into a Buffer.
			 *
			 * @param chunks - The array of chunks to compile.
			 * @returns The compiled Buffer.
			 * @throws Error if the compilation fails.
			 */
			function compile(chunks) {
			  // TODO: remove me
			  if (chunksIsBuffer(chunks)) return chunks;
			  typeforce(types.Array, chunks);
			  const bufferSize = chunks.reduce((accum, chunk) => {
			    // data chunk
			    if (singleChunkIsBuffer(chunk)) {
			      // adhere to BIP62.3, minimal push policy
			      if (chunk.length === 1 && asMinimalOP(chunk) !== undefined) {
			        return accum + 1;
			      }
			      return accum + pushdata.encodingLength(chunk.length) + chunk.length;
			    }
			    // opcode
			    return accum + 1;
			  }, 0.0);
			  const buffer = bufferExports.Buffer.allocUnsafe(bufferSize);
			  let offset = 0;
			  chunks.forEach(chunk => {
			    // data chunk
			    if (singleChunkIsBuffer(chunk)) {
			      // adhere to BIP62.3, minimal push policy
			      const opcode = asMinimalOP(chunk);
			      if (opcode !== undefined) {
			        buffer.writeUInt8(opcode, offset);
			        offset += 1;
			        return;
			      }
			      offset += pushdata.encode(buffer, chunk.length, offset);
			      chunk.copy(buffer, offset);
			      offset += chunk.length;
			      // opcode
			    } else {
			      buffer.writeUInt8(chunk, offset);
			      offset += 1;
			    }
			  });
			  if (offset !== buffer.length) throw new Error('Could not decode chunks');
			  return buffer;
			}
			exports$1.compile = compile;
			function decompile(buffer) {
			  // TODO: remove me
			  if (chunksIsArray(buffer)) return buffer;
			  typeforce(types.Buffer, buffer);
			  const chunks = [];
			  let i = 0;
			  while (i < buffer.length) {
			    const opcode = buffer[i];
			    // data chunk
			    if (opcode > ops_1.OPS.OP_0 && opcode <= ops_1.OPS.OP_PUSHDATA4) {
			      const d = pushdata.decode(buffer, i);
			      // did reading a pushDataInt fail?
			      if (d === null) return null;
			      i += d.size;
			      // attempt to read too much data?
			      if (i + d.number > buffer.length) return null;
			      const data = buffer.slice(i, i + d.number);
			      i += d.number;
			      // decompile minimally
			      const op = asMinimalOP(data);
			      if (op !== undefined) {
			        chunks.push(op);
			      } else {
			        chunks.push(data);
			      }
			      // opcode
			    } else {
			      chunks.push(opcode);
			      i += 1;
			    }
			  }
			  return chunks;
			}
			exports$1.decompile = decompile;
			/**
			 * Converts the given chunks into an ASM (Assembly) string representation.
			 * If the chunks parameter is a Buffer, it will be decompiled into a Stack before conversion.
			 * @param chunks - The chunks to convert into ASM.
			 * @returns The ASM string representation of the chunks.
			 */
			function toASM(chunks) {
			  if (chunksIsBuffer(chunks)) {
			    chunks = decompile(chunks);
			  }
			  if (!chunks) {
			    throw new Error('Could not convert invalid chunks to ASM');
			  }
			  return chunks
			    .map(chunk => {
			      // data?
			      if (singleChunkIsBuffer(chunk)) {
			        const op = asMinimalOP(chunk);
			        if (op === undefined) return chunk.toString('hex');
			        chunk = op;
			      }
			      // opcode!
			      return ops_1.REVERSE_OPS[chunk];
			    })
			    .join(' ');
			}
			exports$1.toASM = toASM;
			/**
			 * Converts an ASM string to a Buffer.
			 * @param asm The ASM string to convert.
			 * @returns The converted Buffer.
			 */
			function fromASM(asm) {
			  typeforce(types.String, asm);
			  return compile(
			    asm.split(' ').map(chunkStr => {
			      // opcode?
			      if (ops_1.OPS[chunkStr] !== undefined) return ops_1.OPS[chunkStr];
			      typeforce(types.Hex, chunkStr);
			      // data!
			      return bufferExports.Buffer.from(chunkStr, 'hex');
			    }),
			  );
			}
			exports$1.fromASM = fromASM;
			/**
			 * Converts the given chunks into a stack of buffers.
			 *
			 * @param chunks - The chunks to convert.
			 * @returns The stack of buffers.
			 */
			function toStack(chunks) {
			  chunks = decompile(chunks);
			  typeforce(isPushOnly, chunks);
			  return chunks.map(op => {
			    if (singleChunkIsBuffer(op)) return op;
			    if (op === ops_1.OPS.OP_0) return bufferExports.Buffer.allocUnsafe(0);
			    return scriptNumber.encode(op - OP_INT_BASE);
			  });
			}
			exports$1.toStack = toStack;
			function isCanonicalPubKey(buffer) {
			  return types.isPoint(buffer);
			}
			exports$1.isCanonicalPubKey = isCanonicalPubKey;
			function isDefinedHashType(hashType) {
			  const hashTypeMod = hashType & -129;
			  // return hashTypeMod > SIGHASH_ALL && hashTypeMod < SIGHASH_SINGLE
			  return hashTypeMod > 0x00 && hashTypeMod < 0x04;
			}
			exports$1.isDefinedHashType = isDefinedHashType;
			function isCanonicalScriptSignature(buffer) {
			  if (!bufferExports.Buffer.isBuffer(buffer)) return false;
			  if (!isDefinedHashType(buffer[buffer.length - 1])) return false;
			  return bip66.check(buffer.slice(0, -1));
			}
			exports$1.isCanonicalScriptSignature = isCanonicalScriptSignature;
			exports$1.number = scriptNumber;
			exports$1.signature = scriptSignature; 
		} (script));
		return script;
	}

	var lazy = {};

	var hasRequiredLazy;

	function requireLazy () {
		if (hasRequiredLazy) return lazy;
		hasRequiredLazy = 1;
		Object.defineProperty(lazy, '__esModule', { value: true });
		lazy.value = lazy.prop = void 0;
		function prop(object, name, f) {
		  Object.defineProperty(object, name, {
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
		        writable: true,
		      });
		    },
		  });
		}
		lazy.prop = prop;
		function value(f) {
		  let _value;
		  return () => {
		    if (_value !== undefined) return _value;
		    _value = f();
		    return _value;
		  };
		}
		lazy.value = value;
		return lazy;
	}

	var hasRequiredEmbed;

	function requireEmbed () {
		if (hasRequiredEmbed) return embed;
		hasRequiredEmbed = 1;
		Object.defineProperty(embed, '__esModule', { value: true });
		embed.p2data = void 0;
		const networks_1 = requireNetworks();
		const bscript = requireScript();
		const types_1 = requireTypes();
		const lazy = requireLazy();
		const OPS = bscript.OPS;
		// output: OP_RETURN ...
		/**
		 * Embeds data in a Bitcoin payment.
		 * @param a - The payment object.
		 * @param opts - Optional payment options.
		 * @returns The modified payment object.
		 * @throws {TypeError} If there is not enough data or if the output is invalid.
		 */
		function p2data(a, opts) {
		  if (!a.data && !a.output) throw new TypeError('Not enough data');
		  opts = Object.assign({ validate: true }, opts || {});
		  (0, types_1.typeforce)(
		    {
		      network: types_1.typeforce.maybe(types_1.typeforce.Object),
		      output: types_1.typeforce.maybe(types_1.typeforce.Buffer),
		      data: types_1.typeforce.maybe(
		        types_1.typeforce.arrayOf(types_1.typeforce.Buffer),
		      ),
		    },
		    a,
		  );
		  const network = a.network || networks_1.bitcoin;
		  const o = { name: 'embed', network };
		  lazy.prop(o, 'output', () => {
		    if (!a.data) return;
		    return bscript.compile([OPS.OP_RETURN].concat(a.data));
		  });
		  lazy.prop(o, 'data', () => {
		    if (!a.output) return;
		    return bscript.decompile(a.output).slice(1);
		  });
		  // extended validation
		  if (opts.validate) {
		    if (a.output) {
		      const chunks = bscript.decompile(a.output);
		      if (chunks[0] !== OPS.OP_RETURN) throw new TypeError('Output is invalid');
		      if (!chunks.slice(1).every(types_1.typeforce.Buffer))
		        throw new TypeError('Output is invalid');
		      if (a.data && !(0, types_1.stacksEqual)(a.data, o.data))
		        throw new TypeError('Data mismatch');
		    }
		  }
		  return Object.assign(o, a);
		}
		embed.p2data = p2data;
		return embed;
	}

	var p2ms = {};

	var hasRequiredP2ms;

	function requireP2ms () {
		if (hasRequiredP2ms) return p2ms;
		hasRequiredP2ms = 1;
		Object.defineProperty(p2ms, '__esModule', { value: true });
		p2ms.p2ms = void 0;
		const networks_1 = requireNetworks();
		const bscript = requireScript();
		const types_1 = requireTypes();
		const lazy = requireLazy();
		const OPS = bscript.OPS;
		const OP_INT_BASE = OPS.OP_RESERVED; // OP_1 - 1
		// input: OP_0 [signatures ...]
		// output: m [pubKeys ...] n OP_CHECKMULTISIG
		/**
		 * Represents a function that creates a Pay-to-Multisig (P2MS) payment object.
		 * @param a - The payment object.
		 * @param opts - Optional payment options.
		 * @returns The created payment object.
		 * @throws {TypeError} If the provided data is not valid.
		 */
		function p2ms$1(a, opts) {
		  if (
		    !a.input &&
		    !a.output &&
		    !(a.pubkeys && a.m !== undefined) &&
		    !a.signatures
		  )
		    throw new TypeError('Not enough data');
		  opts = Object.assign({ validate: true }, opts || {});
		  function isAcceptableSignature(x) {
		    return (
		      bscript.isCanonicalScriptSignature(x) ||
		      (opts.allowIncomplete && x === OPS.OP_0) !== undefined
		    );
		  }
		  (0, types_1.typeforce)(
		    {
		      network: types_1.typeforce.maybe(types_1.typeforce.Object),
		      m: types_1.typeforce.maybe(types_1.typeforce.Number),
		      n: types_1.typeforce.maybe(types_1.typeforce.Number),
		      output: types_1.typeforce.maybe(types_1.typeforce.Buffer),
		      pubkeys: types_1.typeforce.maybe(
		        types_1.typeforce.arrayOf(types_1.isPoint),
		      ),
		      signatures: types_1.typeforce.maybe(
		        types_1.typeforce.arrayOf(isAcceptableSignature),
		      ),
		      input: types_1.typeforce.maybe(types_1.typeforce.Buffer),
		    },
		    a,
		  );
		  const network = a.network || networks_1.bitcoin;
		  const o = { network };
		  let chunks = [];
		  let decoded = false;
		  function decode(output) {
		    if (decoded) return;
		    decoded = true;
		    chunks = bscript.decompile(output);
		    o.m = chunks[0] - OP_INT_BASE;
		    o.n = chunks[chunks.length - 2] - OP_INT_BASE;
		    o.pubkeys = chunks.slice(1, -2);
		  }
		  lazy.prop(o, 'output', () => {
		    if (!a.m) return;
		    if (!o.n) return;
		    if (!a.pubkeys) return;
		    return bscript.compile(
		      [].concat(
		        OP_INT_BASE + a.m,
		        a.pubkeys,
		        OP_INT_BASE + o.n,
		        OPS.OP_CHECKMULTISIG,
		      ),
		    );
		  });
		  lazy.prop(o, 'm', () => {
		    if (!o.output) return;
		    decode(o.output);
		    return o.m;
		  });
		  lazy.prop(o, 'n', () => {
		    if (!o.pubkeys) return;
		    return o.pubkeys.length;
		  });
		  lazy.prop(o, 'pubkeys', () => {
		    if (!a.output) return;
		    decode(a.output);
		    return o.pubkeys;
		  });
		  lazy.prop(o, 'signatures', () => {
		    if (!a.input) return;
		    return bscript.decompile(a.input).slice(1);
		  });
		  lazy.prop(o, 'input', () => {
		    if (!a.signatures) return;
		    return bscript.compile([OPS.OP_0].concat(a.signatures));
		  });
		  lazy.prop(o, 'witness', () => {
		    if (!o.input) return;
		    return [];
		  });
		  lazy.prop(o, 'name', () => {
		    if (!o.m || !o.n) return;
		    return `p2ms(${o.m} of ${o.n})`;
		  });
		  // extended validation
		  if (opts.validate) {
		    if (a.output) {
		      decode(a.output);
		      if (!types_1.typeforce.Number(chunks[0]))
		        throw new TypeError('Output is invalid');
		      if (!types_1.typeforce.Number(chunks[chunks.length - 2]))
		        throw new TypeError('Output is invalid');
		      if (chunks[chunks.length - 1] !== OPS.OP_CHECKMULTISIG)
		        throw new TypeError('Output is invalid');
		      if (o.m <= 0 || o.n > 16 || o.m > o.n || o.n !== chunks.length - 3)
		        throw new TypeError('Output is invalid');
		      if (!o.pubkeys.every(x => (0, types_1.isPoint)(x)))
		        throw new TypeError('Output is invalid');
		      if (a.m !== undefined && a.m !== o.m) throw new TypeError('m mismatch');
		      if (a.n !== undefined && a.n !== o.n) throw new TypeError('n mismatch');
		      if (a.pubkeys && !(0, types_1.stacksEqual)(a.pubkeys, o.pubkeys))
		        throw new TypeError('Pubkeys mismatch');
		    }
		    if (a.pubkeys) {
		      if (a.n !== undefined && a.n !== a.pubkeys.length)
		        throw new TypeError('Pubkey count mismatch');
		      o.n = a.pubkeys.length;
		      if (o.n < o.m) throw new TypeError('Pubkey count cannot be less than m');
		    }
		    if (a.signatures) {
		      if (a.signatures.length < o.m)
		        throw new TypeError('Not enough signatures provided');
		      if (a.signatures.length > o.m)
		        throw new TypeError('Too many signatures provided');
		    }
		    if (a.input) {
		      if (a.input[0] !== OPS.OP_0) throw new TypeError('Input is invalid');
		      if (
		        o.signatures.length === 0 ||
		        !o.signatures.every(isAcceptableSignature)
		      )
		        throw new TypeError('Input has invalid signature(s)');
		      if (a.signatures && !(0, types_1.stacksEqual)(a.signatures, o.signatures))
		        throw new TypeError('Signature mismatch');
		      if (a.m !== undefined && a.m !== a.signatures.length)
		        throw new TypeError('Signature count mismatch');
		    }
		  }
		  return Object.assign(o, a);
		}
		p2ms.p2ms = p2ms$1;
		return p2ms;
	}

	var p2pk = {};

	var hasRequiredP2pk;

	function requireP2pk () {
		if (hasRequiredP2pk) return p2pk;
		hasRequiredP2pk = 1;
		Object.defineProperty(p2pk, '__esModule', { value: true });
		p2pk.p2pk = void 0;
		const networks_1 = requireNetworks();
		const bscript = requireScript();
		const types_1 = requireTypes();
		const lazy = requireLazy();
		const OPS = bscript.OPS;
		// input: {signature}
		// output: {pubKey} OP_CHECKSIG
		/**
		 * Creates a pay-to-public-key (P2PK) payment object.
		 *
		 * @param a - The payment object containing the necessary data.
		 * @param opts - Optional payment options.
		 * @returns The P2PK payment object.
		 * @throws {TypeError} If the required data is not provided or if the data is invalid.
		 */
		function p2pk$1(a, opts) {
		  if (!a.input && !a.output && !a.pubkey && !a.input && !a.signature)
		    throw new TypeError('Not enough data');
		  opts = Object.assign({ validate: true }, opts || {});
		  (0, types_1.typeforce)(
		    {
		      network: types_1.typeforce.maybe(types_1.typeforce.Object),
		      output: types_1.typeforce.maybe(types_1.typeforce.Buffer),
		      pubkey: types_1.typeforce.maybe(types_1.isPoint),
		      signature: types_1.typeforce.maybe(bscript.isCanonicalScriptSignature),
		      input: types_1.typeforce.maybe(types_1.typeforce.Buffer),
		    },
		    a,
		  );
		  const _chunks = lazy.value(() => {
		    return bscript.decompile(a.input);
		  });
		  const network = a.network || networks_1.bitcoin;
		  const o = { name: 'p2pk', network };
		  lazy.prop(o, 'output', () => {
		    if (!a.pubkey) return;
		    return bscript.compile([a.pubkey, OPS.OP_CHECKSIG]);
		  });
		  lazy.prop(o, 'pubkey', () => {
		    if (!a.output) return;
		    return a.output.slice(1, -1);
		  });
		  lazy.prop(o, 'signature', () => {
		    if (!a.input) return;
		    return _chunks()[0];
		  });
		  lazy.prop(o, 'input', () => {
		    if (!a.signature) return;
		    return bscript.compile([a.signature]);
		  });
		  lazy.prop(o, 'witness', () => {
		    if (!o.input) return;
		    return [];
		  });
		  // extended validation
		  if (opts.validate) {
		    if (a.output) {
		      if (a.output[a.output.length - 1] !== OPS.OP_CHECKSIG)
		        throw new TypeError('Output is invalid');
		      if (!(0, types_1.isPoint)(o.pubkey))
		        throw new TypeError('Output pubkey is invalid');
		      if (a.pubkey && !a.pubkey.equals(o.pubkey))
		        throw new TypeError('Pubkey mismatch');
		    }
		    if (a.signature) {
		      if (a.input && !a.input.equals(o.input))
		        throw new TypeError('Signature mismatch');
		    }
		    if (a.input) {
		      if (_chunks().length !== 1) throw new TypeError('Input is invalid');
		      if (!bscript.isCanonicalScriptSignature(o.signature))
		        throw new TypeError('Input has invalid signature');
		    }
		  }
		  return Object.assign(o, a);
		}
		p2pk.p2pk = p2pk$1;
		return p2pk;
	}

	var p2pkh = {};

	var crypto$2 = {};

	var ripemd160 = {};

	var legacy = {};

	var _md = {};

	var utils$3 = {};

	var crypto$1 = {};

	var hasRequiredCrypto$1;

	function requireCrypto$1 () {
		if (hasRequiredCrypto$1) return crypto$1;
		hasRequiredCrypto$1 = 1;
		Object.defineProperty(crypto$1, "__esModule", { value: true });
		crypto$1.crypto = void 0;
		crypto$1.crypto = typeof globalThis === 'object' && 'crypto' in globalThis ? globalThis.crypto : undefined;
		
		return crypto$1;
	}

	var hasRequiredUtils$3;

	function requireUtils$3 () {
		if (hasRequiredUtils$3) return utils$3;
		hasRequiredUtils$3 = 1;
		(function (exports$1) {
			/**
			 * Utilities for hex, bytes, CSPRNG.
			 * @module
			 */
			/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
			Object.defineProperty(exports$1, "__esModule", { value: true });
			exports$1.wrapXOFConstructorWithOpts = exports$1.wrapConstructorWithOpts = exports$1.wrapConstructor = exports$1.Hash = exports$1.nextTick = exports$1.swap32IfBE = exports$1.byteSwapIfBE = exports$1.swap8IfBE = exports$1.isLE = void 0;
			exports$1.isBytes = isBytes;
			exports$1.anumber = anumber;
			exports$1.abytes = abytes;
			exports$1.ahash = ahash;
			exports$1.aexists = aexists;
			exports$1.aoutput = aoutput;
			exports$1.u8 = u8;
			exports$1.u32 = u32;
			exports$1.clean = clean;
			exports$1.createView = createView;
			exports$1.rotr = rotr;
			exports$1.rotl = rotl;
			exports$1.byteSwap = byteSwap;
			exports$1.byteSwap32 = byteSwap32;
			exports$1.bytesToHex = bytesToHex;
			exports$1.hexToBytes = hexToBytes;
			exports$1.asyncLoop = asyncLoop;
			exports$1.utf8ToBytes = utf8ToBytes;
			exports$1.bytesToUtf8 = bytesToUtf8;
			exports$1.toBytes = toBytes;
			exports$1.kdfInputToBytes = kdfInputToBytes;
			exports$1.concatBytes = concatBytes;
			exports$1.checkOpts = checkOpts;
			exports$1.createHasher = createHasher;
			exports$1.createOptHasher = createOptHasher;
			exports$1.createXOFer = createXOFer;
			exports$1.randomBytes = randomBytes;
			// We use WebCrypto aka globalThis.crypto, which exists in browsers and node.js 16+.
			// node.js versions earlier than v19 don't declare it in global scope.
			// For node.js, package.json#exports field mapping rewrites import
			// from `crypto` to `cryptoNode`, which imports native module.
			// Makes the utils un-importable in browsers without a bundler.
			// Once node.js 18 is deprecated (2025-04-30), we can just drop the import.
			const crypto_1 = requireCrypto$1();
			/** Checks if something is Uint8Array. Be careful: nodejs Buffer will return true. */
			function isBytes(a) {
			    return a instanceof Uint8Array || (ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array');
			}
			/** Asserts something is positive integer. */
			function anumber(n) {
			    if (!Number.isSafeInteger(n) || n < 0)
			        throw new Error('positive integer expected, got ' + n);
			}
			/** Asserts something is Uint8Array. */
			function abytes(b, ...lengths) {
			    if (!isBytes(b))
			        throw new Error('Uint8Array expected');
			    if (lengths.length > 0 && !lengths.includes(b.length))
			        throw new Error('Uint8Array expected of length ' + lengths + ', got length=' + b.length);
			}
			/** Asserts something is hash */
			function ahash(h) {
			    if (typeof h !== 'function' || typeof h.create !== 'function')
			        throw new Error('Hash should be wrapped by utils.createHasher');
			    anumber(h.outputLen);
			    anumber(h.blockLen);
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
			/** Cast u8 / u16 / u32 to u8. */
			function u8(arr) {
			    return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
			}
			/** Cast u8 / u16 / u32 to u32. */
			function u32(arr) {
			    return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
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
			/** The rotate left (circular left shift) operation for uint32 */
			function rotl(word, shift) {
			    return (word << shift) | ((word >>> (32 - shift)) >>> 0);
			}
			/** Is current platform little-endian? Most are. Big-Endian platform: IBM */
			exports$1.isLE = (() => new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44)();
			/** The byte swap operation for uint32 */
			function byteSwap(word) {
			    return (((word << 24) & 0xff000000) |
			        ((word << 8) & 0xff0000) |
			        ((word >>> 8) & 0xff00) |
			        ((word >>> 24) & 0xff));
			}
			/** Conditionally byte swap if on a big-endian platform */
			exports$1.swap8IfBE = exports$1.isLE
			    ? (n) => n
			    : (n) => byteSwap(n);
			/** @deprecated */
			exports$1.byteSwapIfBE = exports$1.swap8IfBE;
			/** In place byte swap for Uint32Array */
			function byteSwap32(arr) {
			    for (let i = 0; i < arr.length; i++) {
			        arr[i] = byteSwap(arr[i]);
			    }
			    return arr;
			}
			exports$1.swap32IfBE = exports$1.isLE
			    ? (u) => u
			    : byteSwap32;
			// Built-in hex conversion https://caniuse.com/mdn-javascript_builtins_uint8array_fromhex
			const hasHexBuiltin = /* @__PURE__ */ (() => 
			// @ts-ignore
			typeof Uint8Array.from([]).toHex === 'function' && typeof Uint8Array.fromHex === 'function')();
			// Array where index 0xf0 (240) is mapped to string 'f0'
			const hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));
			/**
			 * Convert byte array to hex string. Uses built-in function, when available.
			 * @example bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])) // 'cafe0123'
			 */
			function bytesToHex(bytes) {
			    abytes(bytes);
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
			// We use optimized technique to convert hex string to byte array
			const asciis = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
			function asciiToBase16(ch) {
			    if (ch >= asciis._0 && ch <= asciis._9)
			        return ch - asciis._0; // '2' => 50-48
			    if (ch >= asciis.A && ch <= asciis.F)
			        return ch - (asciis.A - 10); // 'B' => 66-(65-10)
			    if (ch >= asciis.a && ch <= asciis.f)
			        return ch - (asciis.a - 10); // 'b' => 98-(97-10)
			    return;
			}
			/**
			 * Convert hex string to byte array. Uses built-in function, when available.
			 * @example hexToBytes('cafe0123') // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
			 */
			function hexToBytes(hex) {
			    if (typeof hex !== 'string')
			        throw new Error('hex string expected, got ' + typeof hex);
			    // @ts-ignore
			    if (hasHexBuiltin)
			        return Uint8Array.fromHex(hex);
			    const hl = hex.length;
			    const al = hl / 2;
			    if (hl % 2)
			        throw new Error('hex string expected, got unpadded hex of length ' + hl);
			    const array = new Uint8Array(al);
			    for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
			        const n1 = asciiToBase16(hex.charCodeAt(hi));
			        const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
			        if (n1 === undefined || n2 === undefined) {
			            const char = hex[hi] + hex[hi + 1];
			            throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
			        }
			        array[ai] = n1 * 16 + n2; // multiply first octet, e.g. 'a3' => 10*16+3 => 160 + 3 => 163
			    }
			    return array;
			}
			/**
			 * There is no setImmediate in browser and setTimeout is slow.
			 * Call of async fn will return Promise, which will be fullfiled only on
			 * next scheduler queue processing step and this is exactly what we need.
			 */
			const nextTick = async () => { };
			exports$1.nextTick = nextTick;
			/** Returns control to thread each 'tick' ms to avoid blocking. */
			async function asyncLoop(iters, tick, cb) {
			    let ts = Date.now();
			    for (let i = 0; i < iters; i++) {
			        cb(i);
			        // Date.now() is not monotonic, so in case if clock goes backwards we return return control too
			        const diff = Date.now() - ts;
			        if (diff >= 0 && diff < tick)
			            continue;
			        await (0, exports$1.nextTick)();
			        ts += diff;
			    }
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
			 * Converts bytes to string using UTF8 encoding.
			 * @example bytesToUtf8(Uint8Array.from([97, 98, 99])) // 'abc'
			 */
			function bytesToUtf8(bytes) {
			    return new TextDecoder().decode(bytes);
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
			/**
			 * Helper for KDFs: consumes uint8array or string.
			 * When string is passed, does utf8 decoding, using TextDecoder.
			 */
			function kdfInputToBytes(data) {
			    if (typeof data === 'string')
			        data = utf8ToBytes(data);
			    abytes(data);
			    return data;
			}
			/** Copies several Uint8Arrays into one. */
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
			function checkOpts(defaults, opts) {
			    if (opts !== undefined && {}.toString.call(opts) !== '[object Object]')
			        throw new Error('options should be object or undefined');
			    const merged = Object.assign(defaults, opts);
			    return merged;
			}
			/** For runtime check if class implements interface */
			class Hash {
			}
			exports$1.Hash = Hash;
			/** Wraps hash function, creating an interface on top of it */
			function createHasher(hashCons) {
			    const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
			    const tmp = hashCons();
			    hashC.outputLen = tmp.outputLen;
			    hashC.blockLen = tmp.blockLen;
			    hashC.create = () => hashCons();
			    return hashC;
			}
			function createOptHasher(hashCons) {
			    const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
			    const tmp = hashCons({});
			    hashC.outputLen = tmp.outputLen;
			    hashC.blockLen = tmp.blockLen;
			    hashC.create = (opts) => hashCons(opts);
			    return hashC;
			}
			function createXOFer(hashCons) {
			    const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
			    const tmp = hashCons({});
			    hashC.outputLen = tmp.outputLen;
			    hashC.blockLen = tmp.blockLen;
			    hashC.create = (opts) => hashCons(opts);
			    return hashC;
			}
			exports$1.wrapConstructor = createHasher;
			exports$1.wrapConstructorWithOpts = createOptHasher;
			exports$1.wrapXOFConstructorWithOpts = createXOFer;
			/** Cryptographically secure PRNG. Uses internal OS-level `crypto.getRandomValues`. */
			function randomBytes(bytesLength = 32) {
			    if (crypto_1.crypto && typeof crypto_1.crypto.getRandomValues === 'function') {
			        return crypto_1.crypto.getRandomValues(new Uint8Array(bytesLength));
			    }
			    // Legacy Node.js compatibility
			    if (crypto_1.crypto && typeof crypto_1.crypto.randomBytes === 'function') {
			        return Uint8Array.from(crypto_1.crypto.randomBytes(bytesLength));
			    }
			    throw new Error('crypto.getRandomValues must be defined');
			}
			
		} (utils$3));
		return utils$3;
	}

	var hasRequired_md;

	function require_md () {
		if (hasRequired_md) return _md;
		hasRequired_md = 1;
		Object.defineProperty(_md, "__esModule", { value: true });
		_md.SHA512_IV = _md.SHA384_IV = _md.SHA224_IV = _md.SHA256_IV = _md.HashMD = void 0;
		_md.setBigUint64 = setBigUint64;
		_md.Chi = Chi;
		_md.Maj = Maj;
		/**
		 * Internal Merkle-Damgard hash utils.
		 * @module
		 */
		const utils_ts_1 = /*@__PURE__*/ requireUtils$3();
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
		class HashMD extends utils_ts_1.Hash {
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
		        this.view = (0, utils_ts_1.createView)(this.buffer);
		    }
		    update(data) {
		        (0, utils_ts_1.aexists)(this);
		        data = (0, utils_ts_1.toBytes)(data);
		        (0, utils_ts_1.abytes)(data);
		        const { view, buffer, blockLen } = this;
		        const len = data.length;
		        for (let pos = 0; pos < len;) {
		            const take = Math.min(blockLen - this.pos, len - pos);
		            // Fast path: we have at least one block in input, cast it to view and process
		            if (take === blockLen) {
		                const dataView = (0, utils_ts_1.createView)(data);
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
		        (0, utils_ts_1.aexists)(this);
		        (0, utils_ts_1.aoutput)(out, this);
		        this.finished = true;
		        // Padding
		        // We can avoid allocation of buffer for padding completely if it
		        // was previously not allocated here. But it won't change performance.
		        const { buffer, view, blockLen, isLE } = this;
		        let { pos } = this;
		        // append the bit '1' to the message
		        buffer[pos++] = 0b10000000;
		        (0, utils_ts_1.clean)(this.buffer.subarray(pos));
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
		        const oview = (0, utils_ts_1.createView)(out);
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
		_md.HashMD = HashMD;
		/**
		 * Initial SHA-2 state: fractional parts of square roots of first 16 primes 2..53.
		 * Check out `test/misc/sha2-gen-iv.js` for recomputation guide.
		 */
		/** Initial SHA256 state. Bits 0..32 of frac part of sqrt of primes 2..19 */
		_md.SHA256_IV = Uint32Array.from([
		    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
		]);
		/** Initial SHA224 state. Bits 32..64 of frac part of sqrt of primes 23..53 */
		_md.SHA224_IV = Uint32Array.from([
		    0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939, 0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4,
		]);
		/** Initial SHA384 state. Bits 0..64 of frac part of sqrt of primes 23..53 */
		_md.SHA384_IV = Uint32Array.from([
		    0xcbbb9d5d, 0xc1059ed8, 0x629a292a, 0x367cd507, 0x9159015a, 0x3070dd17, 0x152fecd8, 0xf70e5939,
		    0x67332667, 0xffc00b31, 0x8eb44a87, 0x68581511, 0xdb0c2e0d, 0x64f98fa7, 0x47b5481d, 0xbefa4fa4,
		]);
		/** Initial SHA512 state. Bits 0..64 of frac part of sqrt of primes 2..19 */
		_md.SHA512_IV = Uint32Array.from([
		    0x6a09e667, 0xf3bcc908, 0xbb67ae85, 0x84caa73b, 0x3c6ef372, 0xfe94f82b, 0xa54ff53a, 0x5f1d36f1,
		    0x510e527f, 0xade682d1, 0x9b05688c, 0x2b3e6c1f, 0x1f83d9ab, 0xfb41bd6b, 0x5be0cd19, 0x137e2179,
		]);
		
		return _md;
	}

	var hasRequiredLegacy;

	function requireLegacy () {
		if (hasRequiredLegacy) return legacy;
		hasRequiredLegacy = 1;
		Object.defineProperty(legacy, "__esModule", { value: true });
		legacy.ripemd160 = legacy.RIPEMD160 = legacy.md5 = legacy.MD5 = legacy.sha1 = legacy.SHA1 = void 0;
		/**

		SHA1 (RFC 3174), MD5 (RFC 1321) and RIPEMD160 (RFC 2286) legacy, weak hash functions.
		Don't use them in a new protocol. What "weak" means:

		- Collisions can be made with 2^18 effort in MD5, 2^60 in SHA1, 2^80 in RIPEMD160.
		- No practical pre-image attacks (only theoretical, 2^123.4)
		- HMAC seems kinda ok: https://datatracker.ietf.org/doc/html/rfc6151
		 * @module
		 */
		const _md_ts_1 = /*@__PURE__*/ require_md();
		const utils_ts_1 = /*@__PURE__*/ requireUtils$3();
		/** Initial SHA1 state */
		const SHA1_IV = /* @__PURE__ */ Uint32Array.from([
		    0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0,
		]);
		// Reusable temporary buffer
		const SHA1_W = /* @__PURE__ */ new Uint32Array(80);
		/** SHA1 legacy hash class. */
		class SHA1 extends _md_ts_1.HashMD {
		    constructor() {
		        super(64, 20, 8, false);
		        this.A = SHA1_IV[0] | 0;
		        this.B = SHA1_IV[1] | 0;
		        this.C = SHA1_IV[2] | 0;
		        this.D = SHA1_IV[3] | 0;
		        this.E = SHA1_IV[4] | 0;
		    }
		    get() {
		        const { A, B, C, D, E } = this;
		        return [A, B, C, D, E];
		    }
		    set(A, B, C, D, E) {
		        this.A = A | 0;
		        this.B = B | 0;
		        this.C = C | 0;
		        this.D = D | 0;
		        this.E = E | 0;
		    }
		    process(view, offset) {
		        for (let i = 0; i < 16; i++, offset += 4)
		            SHA1_W[i] = view.getUint32(offset, false);
		        for (let i = 16; i < 80; i++)
		            SHA1_W[i] = (0, utils_ts_1.rotl)(SHA1_W[i - 3] ^ SHA1_W[i - 8] ^ SHA1_W[i - 14] ^ SHA1_W[i - 16], 1);
		        // Compression function main loop, 80 rounds
		        let { A, B, C, D, E } = this;
		        for (let i = 0; i < 80; i++) {
		            let F, K;
		            if (i < 20) {
		                F = (0, _md_ts_1.Chi)(B, C, D);
		                K = 0x5a827999;
		            }
		            else if (i < 40) {
		                F = B ^ C ^ D;
		                K = 0x6ed9eba1;
		            }
		            else if (i < 60) {
		                F = (0, _md_ts_1.Maj)(B, C, D);
		                K = 0x8f1bbcdc;
		            }
		            else {
		                F = B ^ C ^ D;
		                K = 0xca62c1d6;
		            }
		            const T = ((0, utils_ts_1.rotl)(A, 5) + F + E + K + SHA1_W[i]) | 0;
		            E = D;
		            D = C;
		            C = (0, utils_ts_1.rotl)(B, 30);
		            B = A;
		            A = T;
		        }
		        // Add the compressed chunk to the current hash value
		        A = (A + this.A) | 0;
		        B = (B + this.B) | 0;
		        C = (C + this.C) | 0;
		        D = (D + this.D) | 0;
		        E = (E + this.E) | 0;
		        this.set(A, B, C, D, E);
		    }
		    roundClean() {
		        (0, utils_ts_1.clean)(SHA1_W);
		    }
		    destroy() {
		        this.set(0, 0, 0, 0, 0);
		        (0, utils_ts_1.clean)(this.buffer);
		    }
		}
		legacy.SHA1 = SHA1;
		/** SHA1 (RFC 3174) legacy hash function. It was cryptographically broken. */
		legacy.sha1 = (0, utils_ts_1.createHasher)(() => new SHA1());
		/** Per-round constants */
		const p32 = /* @__PURE__ */ Math.pow(2, 32);
		const K = /* @__PURE__ */ Array.from({ length: 64 }, (_, i) => Math.floor(p32 * Math.abs(Math.sin(i + 1))));
		/** md5 initial state: same as sha1, but 4 u32 instead of 5. */
		const MD5_IV = /* @__PURE__ */ SHA1_IV.slice(0, 4);
		// Reusable temporary buffer
		const MD5_W = /* @__PURE__ */ new Uint32Array(16);
		/** MD5 legacy hash class. */
		class MD5 extends _md_ts_1.HashMD {
		    constructor() {
		        super(64, 16, 8, true);
		        this.A = MD5_IV[0] | 0;
		        this.B = MD5_IV[1] | 0;
		        this.C = MD5_IV[2] | 0;
		        this.D = MD5_IV[3] | 0;
		    }
		    get() {
		        const { A, B, C, D } = this;
		        return [A, B, C, D];
		    }
		    set(A, B, C, D) {
		        this.A = A | 0;
		        this.B = B | 0;
		        this.C = C | 0;
		        this.D = D | 0;
		    }
		    process(view, offset) {
		        for (let i = 0; i < 16; i++, offset += 4)
		            MD5_W[i] = view.getUint32(offset, true);
		        // Compression function main loop, 64 rounds
		        let { A, B, C, D } = this;
		        for (let i = 0; i < 64; i++) {
		            let F, g, s;
		            if (i < 16) {
		                F = (0, _md_ts_1.Chi)(B, C, D);
		                g = i;
		                s = [7, 12, 17, 22];
		            }
		            else if (i < 32) {
		                F = (0, _md_ts_1.Chi)(D, B, C);
		                g = (5 * i + 1) % 16;
		                s = [5, 9, 14, 20];
		            }
		            else if (i < 48) {
		                F = B ^ C ^ D;
		                g = (3 * i + 5) % 16;
		                s = [4, 11, 16, 23];
		            }
		            else {
		                F = C ^ (B | ~D);
		                g = (7 * i) % 16;
		                s = [6, 10, 15, 21];
		            }
		            F = F + A + K[i] + MD5_W[g];
		            A = D;
		            D = C;
		            C = B;
		            B = B + (0, utils_ts_1.rotl)(F, s[i % 4]);
		        }
		        // Add the compressed chunk to the current hash value
		        A = (A + this.A) | 0;
		        B = (B + this.B) | 0;
		        C = (C + this.C) | 0;
		        D = (D + this.D) | 0;
		        this.set(A, B, C, D);
		    }
		    roundClean() {
		        (0, utils_ts_1.clean)(MD5_W);
		    }
		    destroy() {
		        this.set(0, 0, 0, 0);
		        (0, utils_ts_1.clean)(this.buffer);
		    }
		}
		legacy.MD5 = MD5;
		/**
		 * MD5 (RFC 1321) legacy hash function. It was cryptographically broken.
		 * MD5 architecture is similar to SHA1, with some differences:
		 * - Reduced output length: 16 bytes (128 bit) instead of 20
		 * - 64 rounds, instead of 80
		 * - Little-endian: could be faster, but will require more code
		 * - Non-linear index selection: huge speed-up for unroll
		 * - Per round constants: more memory accesses, additional speed-up for unroll
		 */
		legacy.md5 = (0, utils_ts_1.createHasher)(() => new MD5());
		// RIPEMD-160
		const Rho160 = /* @__PURE__ */ Uint8Array.from([
		    7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
		]);
		const Id160 = /* @__PURE__ */ (() => Uint8Array.from(new Array(16).fill(0).map((_, i) => i)))();
		const Pi160 = /* @__PURE__ */ (() => Id160.map((i) => (9 * i + 5) % 16))();
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
		const shifts160 = /* @__PURE__ */ [
		    [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
		    [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
		    [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
		    [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
		    [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5],
		].map((i) => Uint8Array.from(i));
		const shiftsL160 = /* @__PURE__ */ idxL.map((idx, i) => idx.map((j) => shifts160[i][j]));
		const shiftsR160 = /* @__PURE__ */ idxR.map((idx, i) => idx.map((j) => shifts160[i][j]));
		const Kl160 = /* @__PURE__ */ Uint32Array.from([
		    0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e,
		]);
		const Kr160 = /* @__PURE__ */ Uint32Array.from([
		    0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000,
		]);
		// It's called f() in spec.
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
		// Reusable temporary buffer
		const BUF_160 = /* @__PURE__ */ new Uint32Array(16);
		class RIPEMD160 extends _md_ts_1.HashMD {
		    constructor() {
		        super(64, 20, 8, true);
		        this.h0 = 0x67452301 | 0;
		        this.h1 = 0xefcdab89 | 0;
		        this.h2 = 0x98badcfe | 0;
		        this.h3 = 0x10325476 | 0;
		        this.h4 = 0xc3d2e1f0 | 0;
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
		                const tl = ((0, utils_ts_1.rotl)(al + ripemd_f(group, bl, cl, dl) + BUF_160[rl[i]] + hbl, sl[i]) + el) | 0;
		                al = el, el = dl, dl = (0, utils_ts_1.rotl)(cl, 10) | 0, cl = bl, bl = tl; // prettier-ignore
		            }
		            // 2 loops are 10% faster
		            for (let i = 0; i < 16; i++) {
		                const tr = ((0, utils_ts_1.rotl)(ar + ripemd_f(rGroup, br, cr, dr) + BUF_160[rr[i]] + hbr, sr[i]) + er) | 0;
		                ar = er, er = dr, dr = (0, utils_ts_1.rotl)(cr, 10) | 0, cr = br, br = tr; // prettier-ignore
		            }
		        }
		        // Add the compressed chunk to the current hash value
		        this.set((this.h1 + cl + dr) | 0, (this.h2 + dl + er) | 0, (this.h3 + el + ar) | 0, (this.h4 + al + br) | 0, (this.h0 + bl + cr) | 0);
		    }
		    roundClean() {
		        (0, utils_ts_1.clean)(BUF_160);
		    }
		    destroy() {
		        this.destroyed = true;
		        (0, utils_ts_1.clean)(this.buffer);
		        this.set(0, 0, 0, 0, 0);
		    }
		}
		legacy.RIPEMD160 = RIPEMD160;
		/**
		 * RIPEMD-160 - a legacy hash function from 1990s.
		 * * https://homes.esat.kuleuven.be/~bosselae/ripemd160.html
		 * * https://homes.esat.kuleuven.be/~bosselae/ripemd160/pdf/AB-9601/AB-9601.pdf
		 */
		legacy.ripemd160 = (0, utils_ts_1.createHasher)(() => new RIPEMD160());
		
		return legacy;
	}

	var hasRequiredRipemd160;

	function requireRipemd160 () {
		if (hasRequiredRipemd160) return ripemd160;
		hasRequiredRipemd160 = 1;
		Object.defineProperty(ripemd160, "__esModule", { value: true });
		ripemd160.ripemd160 = ripemd160.RIPEMD160 = void 0;
		/**
		 * RIPEMD-160 legacy hash function.
		 * https://homes.esat.kuleuven.be/~bosselae/ripemd160.html
		 * https://homes.esat.kuleuven.be/~bosselae/ripemd160/pdf/AB-9601/AB-9601.pdf
		 * @module
		 * @deprecated
		 */
		const legacy_ts_1 = /*@__PURE__*/ requireLegacy();
		/** @deprecated Use import from `noble/hashes/legacy` module */
		ripemd160.RIPEMD160 = legacy_ts_1.RIPEMD160;
		/** @deprecated Use import from `noble/hashes/legacy` module */
		ripemd160.ripemd160 = legacy_ts_1.ripemd160;
		
		return ripemd160;
	}

	var sha1 = {};

	var hasRequiredSha1;

	function requireSha1 () {
		if (hasRequiredSha1) return sha1;
		hasRequiredSha1 = 1;
		Object.defineProperty(sha1, "__esModule", { value: true });
		sha1.sha1 = sha1.SHA1 = void 0;
		/**
		 * SHA1 (RFC 3174) legacy hash function.
		 * @module
		 * @deprecated
		 */
		const legacy_ts_1 = /*@__PURE__*/ requireLegacy();
		/** @deprecated Use import from `noble/hashes/legacy` module */
		sha1.SHA1 = legacy_ts_1.SHA1;
		/** @deprecated Use import from `noble/hashes/legacy` module */
		sha1.sha1 = legacy_ts_1.sha1;
		
		return sha1;
	}

	var sha256$3 = {};

	var sha2 = {};

	var _u64 = {};

	var hasRequired_u64;

	function require_u64 () {
		if (hasRequired_u64) return _u64;
		hasRequired_u64 = 1;
		Object.defineProperty(_u64, "__esModule", { value: true });
		_u64.toBig = _u64.shrSL = _u64.shrSH = _u64.rotrSL = _u64.rotrSH = _u64.rotrBL = _u64.rotrBH = _u64.rotr32L = _u64.rotr32H = _u64.rotlSL = _u64.rotlSH = _u64.rotlBL = _u64.rotlBH = _u64.add5L = _u64.add5H = _u64.add4L = _u64.add4H = _u64.add3L = _u64.add3H = void 0;
		_u64.add = add;
		_u64.fromBig = fromBig;
		_u64.split = split;
		/**
		 * Internal helpers for u64. BigUint64Array is too slow as per 2025, so we implement it using Uint32Array.
		 * @todo re-check https://issues.chromium.org/issues/42212588
		 * @module
		 */
		const U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
		const _32n = /* @__PURE__ */ BigInt(32);
		function fromBig(n, le = false) {
		    if (le)
		        return { h: Number(n & U32_MASK64), l: Number((n >> _32n) & U32_MASK64) };
		    return { h: Number((n >> _32n) & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
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
		const toBig = (h, l) => (BigInt(h >>> 0) << _32n) | BigInt(l >>> 0);
		_u64.toBig = toBig;
		// for Shift in [0, 32)
		const shrSH = (h, _l, s) => h >>> s;
		_u64.shrSH = shrSH;
		const shrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
		_u64.shrSL = shrSL;
		// Right rotate for Shift in [1, 32)
		const rotrSH = (h, l, s) => (h >>> s) | (l << (32 - s));
		_u64.rotrSH = rotrSH;
		const rotrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
		_u64.rotrSL = rotrSL;
		// Right rotate for Shift in (32, 64), NOTE: 32 is special case.
		const rotrBH = (h, l, s) => (h << (64 - s)) | (l >>> (s - 32));
		_u64.rotrBH = rotrBH;
		const rotrBL = (h, l, s) => (h >>> (s - 32)) | (l << (64 - s));
		_u64.rotrBL = rotrBL;
		// Right rotate for shift===32 (just swaps l&h)
		const rotr32H = (_h, l) => l;
		_u64.rotr32H = rotr32H;
		const rotr32L = (h, _l) => h;
		_u64.rotr32L = rotr32L;
		// Left rotate for Shift in [1, 32)
		const rotlSH = (h, l, s) => (h << s) | (l >>> (32 - s));
		_u64.rotlSH = rotlSH;
		const rotlSL = (h, l, s) => (l << s) | (h >>> (32 - s));
		_u64.rotlSL = rotlSL;
		// Left rotate for Shift in (32, 64), NOTE: 32 is special case.
		const rotlBH = (h, l, s) => (l << (s - 32)) | (h >>> (64 - s));
		_u64.rotlBH = rotlBH;
		const rotlBL = (h, l, s) => (h << (s - 32)) | (l >>> (64 - s));
		_u64.rotlBL = rotlBL;
		// JS uses 32-bit signed integers for bitwise operations which means we cannot
		// simple take carry out of low bit sum by shift, we need to use division.
		function add(Ah, Al, Bh, Bl) {
		    const l = (Al >>> 0) + (Bl >>> 0);
		    return { h: (Ah + Bh + ((l / 2 ** 32) | 0)) | 0, l: l | 0 };
		}
		// Addition with more than 2 elements
		const add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
		_u64.add3L = add3L;
		const add3H = (low, Ah, Bh, Ch) => (Ah + Bh + Ch + ((low / 2 ** 32) | 0)) | 0;
		_u64.add3H = add3H;
		const add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
		_u64.add4L = add4L;
		const add4H = (low, Ah, Bh, Ch, Dh) => (Ah + Bh + Ch + Dh + ((low / 2 ** 32) | 0)) | 0;
		_u64.add4H = add4H;
		const add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
		_u64.add5L = add5L;
		const add5H = (low, Ah, Bh, Ch, Dh, Eh) => (Ah + Bh + Ch + Dh + Eh + ((low / 2 ** 32) | 0)) | 0;
		_u64.add5H = add5H;
		// prettier-ignore
		const u64 = {
		    fromBig, split, toBig,
		    shrSH, shrSL,
		    rotrSH, rotrSL, rotrBH, rotrBL,
		    rotr32H, rotr32L,
		    rotlSH, rotlSL, rotlBH, rotlBL,
		    add, add3L, add3H, add4L, add4H, add5H, add5L,
		};
		_u64.default = u64;
		
		return _u64;
	}

	var hasRequiredSha2;

	function requireSha2 () {
		if (hasRequiredSha2) return sha2;
		hasRequiredSha2 = 1;
		Object.defineProperty(sha2, "__esModule", { value: true });
		sha2.sha512_224 = sha2.sha512_256 = sha2.sha384 = sha2.sha512 = sha2.sha224 = sha2.sha256 = sha2.SHA512_256 = sha2.SHA512_224 = sha2.SHA384 = sha2.SHA512 = sha2.SHA224 = sha2.SHA256 = void 0;
		/**
		 * SHA2 hash function. A.k.a. sha256, sha384, sha512, sha512_224, sha512_256.
		 * SHA256 is the fastest hash implementable in JS, even faster than Blake3.
		 * Check out [RFC 4634](https://datatracker.ietf.org/doc/html/rfc4634) and
		 * [FIPS 180-4](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf).
		 * @module
		 */
		const _md_ts_1 = /*@__PURE__*/ require_md();
		const u64 = /*@__PURE__*/ require_u64();
		const utils_ts_1 = /*@__PURE__*/ requireUtils$3();
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
		class SHA256 extends _md_ts_1.HashMD {
		    constructor(outputLen = 32) {
		        super(64, outputLen, 8, false);
		        // We cannot use array here since array allows indexing by variable
		        // which means optimizer/compiler cannot use registers.
		        this.A = _md_ts_1.SHA256_IV[0] | 0;
		        this.B = _md_ts_1.SHA256_IV[1] | 0;
		        this.C = _md_ts_1.SHA256_IV[2] | 0;
		        this.D = _md_ts_1.SHA256_IV[3] | 0;
		        this.E = _md_ts_1.SHA256_IV[4] | 0;
		        this.F = _md_ts_1.SHA256_IV[5] | 0;
		        this.G = _md_ts_1.SHA256_IV[6] | 0;
		        this.H = _md_ts_1.SHA256_IV[7] | 0;
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
		            const s0 = (0, utils_ts_1.rotr)(W15, 7) ^ (0, utils_ts_1.rotr)(W15, 18) ^ (W15 >>> 3);
		            const s1 = (0, utils_ts_1.rotr)(W2, 17) ^ (0, utils_ts_1.rotr)(W2, 19) ^ (W2 >>> 10);
		            SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
		        }
		        // Compression function main loop, 64 rounds
		        let { A, B, C, D, E, F, G, H } = this;
		        for (let i = 0; i < 64; i++) {
		            const sigma1 = (0, utils_ts_1.rotr)(E, 6) ^ (0, utils_ts_1.rotr)(E, 11) ^ (0, utils_ts_1.rotr)(E, 25);
		            const T1 = (H + sigma1 + (0, _md_ts_1.Chi)(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
		            const sigma0 = (0, utils_ts_1.rotr)(A, 2) ^ (0, utils_ts_1.rotr)(A, 13) ^ (0, utils_ts_1.rotr)(A, 22);
		            const T2 = (sigma0 + (0, _md_ts_1.Maj)(A, B, C)) | 0;
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
		        (0, utils_ts_1.clean)(SHA256_W);
		    }
		    destroy() {
		        this.set(0, 0, 0, 0, 0, 0, 0, 0);
		        (0, utils_ts_1.clean)(this.buffer);
		    }
		}
		sha2.SHA256 = SHA256;
		class SHA224 extends SHA256 {
		    constructor() {
		        super(28);
		        this.A = _md_ts_1.SHA224_IV[0] | 0;
		        this.B = _md_ts_1.SHA224_IV[1] | 0;
		        this.C = _md_ts_1.SHA224_IV[2] | 0;
		        this.D = _md_ts_1.SHA224_IV[3] | 0;
		        this.E = _md_ts_1.SHA224_IV[4] | 0;
		        this.F = _md_ts_1.SHA224_IV[5] | 0;
		        this.G = _md_ts_1.SHA224_IV[6] | 0;
		        this.H = _md_ts_1.SHA224_IV[7] | 0;
		    }
		}
		sha2.SHA224 = SHA224;
		// SHA2-512 is slower than sha256 in js because u64 operations are slow.
		// Round contants
		// First 32 bits of the fractional parts of the cube roots of the first 80 primes 2..409
		// prettier-ignore
		const K512 = /* @__PURE__ */ (() => u64.split([
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
		// Reusable temporary buffers
		const SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
		const SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
		class SHA512 extends _md_ts_1.HashMD {
		    constructor(outputLen = 64) {
		        super(128, outputLen, 16, false);
		        // We cannot use array here since array allows indexing by variable
		        // which means optimizer/compiler cannot use registers.
		        // h -- high 32 bits, l -- low 32 bits
		        this.Ah = _md_ts_1.SHA512_IV[0] | 0;
		        this.Al = _md_ts_1.SHA512_IV[1] | 0;
		        this.Bh = _md_ts_1.SHA512_IV[2] | 0;
		        this.Bl = _md_ts_1.SHA512_IV[3] | 0;
		        this.Ch = _md_ts_1.SHA512_IV[4] | 0;
		        this.Cl = _md_ts_1.SHA512_IV[5] | 0;
		        this.Dh = _md_ts_1.SHA512_IV[6] | 0;
		        this.Dl = _md_ts_1.SHA512_IV[7] | 0;
		        this.Eh = _md_ts_1.SHA512_IV[8] | 0;
		        this.El = _md_ts_1.SHA512_IV[9] | 0;
		        this.Fh = _md_ts_1.SHA512_IV[10] | 0;
		        this.Fl = _md_ts_1.SHA512_IV[11] | 0;
		        this.Gh = _md_ts_1.SHA512_IV[12] | 0;
		        this.Gl = _md_ts_1.SHA512_IV[13] | 0;
		        this.Hh = _md_ts_1.SHA512_IV[14] | 0;
		        this.Hl = _md_ts_1.SHA512_IV[15] | 0;
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
		            const s0h = u64.rotrSH(W15h, W15l, 1) ^ u64.rotrSH(W15h, W15l, 8) ^ u64.shrSH(W15h, W15l, 7);
		            const s0l = u64.rotrSL(W15h, W15l, 1) ^ u64.rotrSL(W15h, W15l, 8) ^ u64.shrSL(W15h, W15l, 7);
		            // s1 := (w[i-2] rightrotate 19) xor (w[i-2] rightrotate 61) xor (w[i-2] rightshift 6)
		            const W2h = SHA512_W_H[i - 2] | 0;
		            const W2l = SHA512_W_L[i - 2] | 0;
		            const s1h = u64.rotrSH(W2h, W2l, 19) ^ u64.rotrBH(W2h, W2l, 61) ^ u64.shrSH(W2h, W2l, 6);
		            const s1l = u64.rotrSL(W2h, W2l, 19) ^ u64.rotrBL(W2h, W2l, 61) ^ u64.shrSL(W2h, W2l, 6);
		            // SHA256_W[i] = s0 + s1 + SHA256_W[i - 7] + SHA256_W[i - 16];
		            const SUMl = u64.add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
		            const SUMh = u64.add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
		            SHA512_W_H[i] = SUMh | 0;
		            SHA512_W_L[i] = SUMl | 0;
		        }
		        let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
		        // Compression function main loop, 80 rounds
		        for (let i = 0; i < 80; i++) {
		            // S1 := (e rightrotate 14) xor (e rightrotate 18) xor (e rightrotate 41)
		            const sigma1h = u64.rotrSH(Eh, El, 14) ^ u64.rotrSH(Eh, El, 18) ^ u64.rotrBH(Eh, El, 41);
		            const sigma1l = u64.rotrSL(Eh, El, 14) ^ u64.rotrSL(Eh, El, 18) ^ u64.rotrBL(Eh, El, 41);
		            //const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
		            const CHIh = (Eh & Fh) ^ (~Eh & Gh);
		            const CHIl = (El & Fl) ^ (~El & Gl);
		            // T1 = H + sigma1 + Chi(E, F, G) + SHA512_K[i] + SHA512_W[i]
		            // prettier-ignore
		            const T1ll = u64.add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
		            const T1h = u64.add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
		            const T1l = T1ll | 0;
		            // S0 := (a rightrotate 28) xor (a rightrotate 34) xor (a rightrotate 39)
		            const sigma0h = u64.rotrSH(Ah, Al, 28) ^ u64.rotrBH(Ah, Al, 34) ^ u64.rotrBH(Ah, Al, 39);
		            const sigma0l = u64.rotrSL(Ah, Al, 28) ^ u64.rotrBL(Ah, Al, 34) ^ u64.rotrBL(Ah, Al, 39);
		            const MAJh = (Ah & Bh) ^ (Ah & Ch) ^ (Bh & Ch);
		            const MAJl = (Al & Bl) ^ (Al & Cl) ^ (Bl & Cl);
		            Hh = Gh | 0;
		            Hl = Gl | 0;
		            Gh = Fh | 0;
		            Gl = Fl | 0;
		            Fh = Eh | 0;
		            Fl = El | 0;
		            ({ h: Eh, l: El } = u64.add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
		            Dh = Ch | 0;
		            Dl = Cl | 0;
		            Ch = Bh | 0;
		            Cl = Bl | 0;
		            Bh = Ah | 0;
		            Bl = Al | 0;
		            const All = u64.add3L(T1l, sigma0l, MAJl);
		            Ah = u64.add3H(All, T1h, sigma0h, MAJh);
		            Al = All | 0;
		        }
		        // Add the compressed chunk to the current hash value
		        ({ h: Ah, l: Al } = u64.add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
		        ({ h: Bh, l: Bl } = u64.add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
		        ({ h: Ch, l: Cl } = u64.add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
		        ({ h: Dh, l: Dl } = u64.add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
		        ({ h: Eh, l: El } = u64.add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
		        ({ h: Fh, l: Fl } = u64.add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
		        ({ h: Gh, l: Gl } = u64.add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
		        ({ h: Hh, l: Hl } = u64.add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
		        this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
		    }
		    roundClean() {
		        (0, utils_ts_1.clean)(SHA512_W_H, SHA512_W_L);
		    }
		    destroy() {
		        (0, utils_ts_1.clean)(this.buffer);
		        this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
		    }
		}
		sha2.SHA512 = SHA512;
		class SHA384 extends SHA512 {
		    constructor() {
		        super(48);
		        this.Ah = _md_ts_1.SHA384_IV[0] | 0;
		        this.Al = _md_ts_1.SHA384_IV[1] | 0;
		        this.Bh = _md_ts_1.SHA384_IV[2] | 0;
		        this.Bl = _md_ts_1.SHA384_IV[3] | 0;
		        this.Ch = _md_ts_1.SHA384_IV[4] | 0;
		        this.Cl = _md_ts_1.SHA384_IV[5] | 0;
		        this.Dh = _md_ts_1.SHA384_IV[6] | 0;
		        this.Dl = _md_ts_1.SHA384_IV[7] | 0;
		        this.Eh = _md_ts_1.SHA384_IV[8] | 0;
		        this.El = _md_ts_1.SHA384_IV[9] | 0;
		        this.Fh = _md_ts_1.SHA384_IV[10] | 0;
		        this.Fl = _md_ts_1.SHA384_IV[11] | 0;
		        this.Gh = _md_ts_1.SHA384_IV[12] | 0;
		        this.Gl = _md_ts_1.SHA384_IV[13] | 0;
		        this.Hh = _md_ts_1.SHA384_IV[14] | 0;
		        this.Hl = _md_ts_1.SHA384_IV[15] | 0;
		    }
		}
		sha2.SHA384 = SHA384;
		/**
		 * Truncated SHA512/256 and SHA512/224.
		 * SHA512_IV is XORed with 0xa5a5a5a5a5a5a5a5, then used as "intermediary" IV of SHA512/t.
		 * Then t hashes string to produce result IV.
		 * See `test/misc/sha2-gen-iv.js`.
		 */
		/** SHA512/224 IV */
		const T224_IV = /* @__PURE__ */ Uint32Array.from([
		    0x8c3d37c8, 0x19544da2, 0x73e19966, 0x89dcd4d6, 0x1dfab7ae, 0x32ff9c82, 0x679dd514, 0x582f9fcf,
		    0x0f6d2b69, 0x7bd44da8, 0x77e36f73, 0x04c48942, 0x3f9d85a8, 0x6a1d36c8, 0x1112e6ad, 0x91d692a1,
		]);
		/** SHA512/256 IV */
		const T256_IV = /* @__PURE__ */ Uint32Array.from([
		    0x22312194, 0xfc2bf72c, 0x9f555fa3, 0xc84c64c2, 0x2393b86b, 0x6f53b151, 0x96387719, 0x5940eabd,
		    0x96283ee2, 0xa88effe3, 0xbe5e1e25, 0x53863992, 0x2b0199fc, 0x2c85b8aa, 0x0eb72ddc, 0x81c52ca2,
		]);
		class SHA512_224 extends SHA512 {
		    constructor() {
		        super(28);
		        this.Ah = T224_IV[0] | 0;
		        this.Al = T224_IV[1] | 0;
		        this.Bh = T224_IV[2] | 0;
		        this.Bl = T224_IV[3] | 0;
		        this.Ch = T224_IV[4] | 0;
		        this.Cl = T224_IV[5] | 0;
		        this.Dh = T224_IV[6] | 0;
		        this.Dl = T224_IV[7] | 0;
		        this.Eh = T224_IV[8] | 0;
		        this.El = T224_IV[9] | 0;
		        this.Fh = T224_IV[10] | 0;
		        this.Fl = T224_IV[11] | 0;
		        this.Gh = T224_IV[12] | 0;
		        this.Gl = T224_IV[13] | 0;
		        this.Hh = T224_IV[14] | 0;
		        this.Hl = T224_IV[15] | 0;
		    }
		}
		sha2.SHA512_224 = SHA512_224;
		class SHA512_256 extends SHA512 {
		    constructor() {
		        super(32);
		        this.Ah = T256_IV[0] | 0;
		        this.Al = T256_IV[1] | 0;
		        this.Bh = T256_IV[2] | 0;
		        this.Bl = T256_IV[3] | 0;
		        this.Ch = T256_IV[4] | 0;
		        this.Cl = T256_IV[5] | 0;
		        this.Dh = T256_IV[6] | 0;
		        this.Dl = T256_IV[7] | 0;
		        this.Eh = T256_IV[8] | 0;
		        this.El = T256_IV[9] | 0;
		        this.Fh = T256_IV[10] | 0;
		        this.Fl = T256_IV[11] | 0;
		        this.Gh = T256_IV[12] | 0;
		        this.Gl = T256_IV[13] | 0;
		        this.Hh = T256_IV[14] | 0;
		        this.Hl = T256_IV[15] | 0;
		    }
		}
		sha2.SHA512_256 = SHA512_256;
		/**
		 * SHA2-256 hash function from RFC 4634.
		 *
		 * It is the fastest JS hash, even faster than Blake3.
		 * To break sha256 using birthday attack, attackers need to try 2^128 hashes.
		 * BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per 2025.
		 */
		sha2.sha256 = (0, utils_ts_1.createHasher)(() => new SHA256());
		/** SHA2-224 hash function from RFC 4634 */
		sha2.sha224 = (0, utils_ts_1.createHasher)(() => new SHA224());
		/** SHA2-512 hash function from RFC 4634. */
		sha2.sha512 = (0, utils_ts_1.createHasher)(() => new SHA512());
		/** SHA2-384 hash function from RFC 4634. */
		sha2.sha384 = (0, utils_ts_1.createHasher)(() => new SHA384());
		/**
		 * SHA2-512/256 "truncated" hash function, with improved resistance to length extension attacks.
		 * See the paper on [truncated SHA512](https://eprint.iacr.org/2010/548.pdf).
		 */
		sha2.sha512_256 = (0, utils_ts_1.createHasher)(() => new SHA512_256());
		/**
		 * SHA2-512/224 "truncated" hash function, with improved resistance to length extension attacks.
		 * See the paper on [truncated SHA512](https://eprint.iacr.org/2010/548.pdf).
		 */
		sha2.sha512_224 = (0, utils_ts_1.createHasher)(() => new SHA512_224());
		
		return sha2;
	}

	var hasRequiredSha256;

	function requireSha256 () {
		if (hasRequiredSha256) return sha256$3;
		hasRequiredSha256 = 1;
		Object.defineProperty(sha256$3, "__esModule", { value: true });
		sha256$3.sha224 = sha256$3.SHA224 = sha256$3.sha256 = sha256$3.SHA256 = void 0;
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
		const sha2_ts_1 = /*@__PURE__*/ requireSha2();
		/** @deprecated Use import from `noble/hashes/sha2` module */
		sha256$3.SHA256 = sha2_ts_1.SHA256;
		/** @deprecated Use import from `noble/hashes/sha2` module */
		sha256$3.sha256 = sha2_ts_1.sha256;
		/** @deprecated Use import from `noble/hashes/sha2` module */
		sha256$3.SHA224 = sha2_ts_1.SHA224;
		/** @deprecated Use import from `noble/hashes/sha2` module */
		sha256$3.sha224 = sha2_ts_1.sha224;
		
		return sha256$3;
	}

	var hasRequiredCrypto;

	function requireCrypto () {
		if (hasRequiredCrypto) return crypto$2;
		hasRequiredCrypto = 1;
		(function (exports$1) {
			Object.defineProperty(exports$1, '__esModule', { value: true });
			exports$1.taggedHash =
			  exports$1.TAGGED_HASH_PREFIXES =
			  exports$1.TAGS =
			  exports$1.hash256 =
			  exports$1.hash160 =
			  exports$1.sha256 =
			  exports$1.sha1 =
			  exports$1.ripemd160 =
			    void 0;
			/**
			 * A module for hashing functions.
			 * include ripemd160、sha1、sha256、hash160、hash256、taggedHash
			 *
			 * @packageDocumentation
			 */
			const ripemd160_1 = /*@__PURE__*/ requireRipemd160();
			const sha1_1 = /*@__PURE__*/ requireSha1();
			const sha256_1 = /*@__PURE__*/ requireSha256();
			function ripemd160(buffer) {
			  return bufferExports.Buffer.from((0, ripemd160_1.ripemd160)(Uint8Array.from(buffer)));
			}
			exports$1.ripemd160 = ripemd160;
			function sha1(buffer) {
			  return bufferExports.Buffer.from((0, sha1_1.sha1)(Uint8Array.from(buffer)));
			}
			exports$1.sha1 = sha1;
			function sha256(buffer) {
			  return bufferExports.Buffer.from((0, sha256_1.sha256)(Uint8Array.from(buffer)));
			}
			exports$1.sha256 = sha256;
			function hash160(buffer) {
			  return bufferExports.Buffer.from(
			    (0, ripemd160_1.ripemd160)((0, sha256_1.sha256)(Uint8Array.from(buffer))),
			  );
			}
			exports$1.hash160 = hash160;
			function hash256(buffer) {
			  return bufferExports.Buffer.from(
			    (0, sha256_1.sha256)((0, sha256_1.sha256)(Uint8Array.from(buffer))),
			  );
			}
			exports$1.hash256 = hash256;
			exports$1.TAGS = [
			  'BIP0340/challenge',
			  'BIP0340/aux',
			  'BIP0340/nonce',
			  'TapLeaf',
			  'TapBranch',
			  'TapSighash',
			  'TapTweak',
			  'KeyAgg list',
			  'KeyAgg coefficient',
			];
			/** An object mapping tags to their tagged hash prefix of [SHA256(tag) | SHA256(tag)] */
			/**
			 * Defines the tagged hash prefixes used in the crypto module.
			 */
			exports$1.TAGGED_HASH_PREFIXES = {
			  'BIP0340/challenge': bufferExports.Buffer.from([
			    123, 181, 45, 122, 159, 239, 88, 50, 62, 177, 191, 122, 64, 125, 179, 130,
			    210, 243, 242, 216, 27, 177, 34, 79, 73, 254, 81, 143, 109, 72, 211, 124,
			    123, 181, 45, 122, 159, 239, 88, 50, 62, 177, 191, 122, 64, 125, 179, 130,
			    210, 243, 242, 216, 27, 177, 34, 79, 73, 254, 81, 143, 109, 72, 211, 124,
			  ]),
			  'BIP0340/aux': bufferExports.Buffer.from([
			    241, 239, 78, 94, 192, 99, 202, 218, 109, 148, 202, 250, 157, 152, 126, 160,
			    105, 38, 88, 57, 236, 193, 31, 151, 45, 119, 165, 46, 216, 193, 204, 144,
			    241, 239, 78, 94, 192, 99, 202, 218, 109, 148, 202, 250, 157, 152, 126, 160,
			    105, 38, 88, 57, 236, 193, 31, 151, 45, 119, 165, 46, 216, 193, 204, 144,
			  ]),
			  'BIP0340/nonce': bufferExports.Buffer.from([
			    7, 73, 119, 52, 167, 155, 203, 53, 91, 155, 140, 125, 3, 79, 18, 28, 244,
			    52, 215, 62, 247, 45, 218, 25, 135, 0, 97, 251, 82, 191, 235, 47, 7, 73,
			    119, 52, 167, 155, 203, 53, 91, 155, 140, 125, 3, 79, 18, 28, 244, 52, 215,
			    62, 247, 45, 218, 25, 135, 0, 97, 251, 82, 191, 235, 47,
			  ]),
			  TapLeaf: bufferExports.Buffer.from([
			    174, 234, 143, 220, 66, 8, 152, 49, 5, 115, 75, 88, 8, 29, 30, 38, 56, 211,
			    95, 28, 181, 64, 8, 212, 211, 87, 202, 3, 190, 120, 233, 238, 174, 234, 143,
			    220, 66, 8, 152, 49, 5, 115, 75, 88, 8, 29, 30, 38, 56, 211, 95, 28, 181,
			    64, 8, 212, 211, 87, 202, 3, 190, 120, 233, 238,
			  ]),
			  TapBranch: bufferExports.Buffer.from([
			    25, 65, 161, 242, 229, 110, 185, 95, 162, 169, 241, 148, 190, 92, 1, 247,
			    33, 111, 51, 237, 130, 176, 145, 70, 52, 144, 208, 91, 245, 22, 160, 21, 25,
			    65, 161, 242, 229, 110, 185, 95, 162, 169, 241, 148, 190, 92, 1, 247, 33,
			    111, 51, 237, 130, 176, 145, 70, 52, 144, 208, 91, 245, 22, 160, 21,
			  ]),
			  TapSighash: bufferExports.Buffer.from([
			    244, 10, 72, 223, 75, 42, 112, 200, 180, 146, 75, 242, 101, 70, 97, 237, 61,
			    149, 253, 102, 163, 19, 235, 135, 35, 117, 151, 198, 40, 228, 160, 49, 244,
			    10, 72, 223, 75, 42, 112, 200, 180, 146, 75, 242, 101, 70, 97, 237, 61, 149,
			    253, 102, 163, 19, 235, 135, 35, 117, 151, 198, 40, 228, 160, 49,
			  ]),
			  TapTweak: bufferExports.Buffer.from([
			    232, 15, 225, 99, 156, 156, 160, 80, 227, 175, 27, 57, 193, 67, 198, 62, 66,
			    156, 188, 235, 21, 217, 64, 251, 181, 197, 161, 244, 175, 87, 197, 233, 232,
			    15, 225, 99, 156, 156, 160, 80, 227, 175, 27, 57, 193, 67, 198, 62, 66, 156,
			    188, 235, 21, 217, 64, 251, 181, 197, 161, 244, 175, 87, 197, 233,
			  ]),
			  'KeyAgg list': bufferExports.Buffer.from([
			    72, 28, 151, 28, 60, 11, 70, 215, 240, 178, 117, 174, 89, 141, 78, 44, 126,
			    215, 49, 156, 89, 74, 92, 110, 199, 158, 160, 212, 153, 2, 148, 240, 72, 28,
			    151, 28, 60, 11, 70, 215, 240, 178, 117, 174, 89, 141, 78, 44, 126, 215, 49,
			    156, 89, 74, 92, 110, 199, 158, 160, 212, 153, 2, 148, 240,
			  ]),
			  'KeyAgg coefficient': bufferExports.Buffer.from([
			    191, 201, 4, 3, 77, 28, 136, 232, 200, 14, 34, 229, 61, 36, 86, 109, 100,
			    130, 78, 214, 66, 114, 129, 192, 145, 0, 249, 77, 205, 82, 201, 129, 191,
			    201, 4, 3, 77, 28, 136, 232, 200, 14, 34, 229, 61, 36, 86, 109, 100, 130,
			    78, 214, 66, 114, 129, 192, 145, 0, 249, 77, 205, 82, 201, 129,
			  ]),
			};
			function taggedHash(prefix, data) {
			  return sha256(bufferExports.Buffer.concat([exports$1.TAGGED_HASH_PREFIXES[prefix], data]));
			}
			exports$1.taggedHash = taggedHash; 
		} (crypto$2));
		return crypto$2;
	}

	var src;
	var hasRequiredSrc$1;

	function requireSrc$1 () {
		if (hasRequiredSrc$1) return src;
		hasRequiredSrc$1 = 1;
		// base-x encoding / decoding
		// Copyright (c) 2018 base-x contributors
		// Copyright (c) 2014-2018 The Bitcoin Core developers (base58.cpp)
		// Distributed under the MIT software license, see the accompanying
		// file LICENSE or http://www.opensource.org/licenses/mit-license.php.
		function base (ALPHABET) {
		  if (ALPHABET.length >= 255) { throw new TypeError('Alphabet too long') }
		  var BASE_MAP = new Uint8Array(256);
		  for (var j = 0; j < BASE_MAP.length; j++) {
		    BASE_MAP[j] = 255;
		  }
		  for (var i = 0; i < ALPHABET.length; i++) {
		    var x = ALPHABET.charAt(i);
		    var xc = x.charCodeAt(0);
		    if (BASE_MAP[xc] !== 255) { throw new TypeError(x + ' is ambiguous') }
		    BASE_MAP[xc] = i;
		  }
		  var BASE = ALPHABET.length;
		  var LEADER = ALPHABET.charAt(0);
		  var FACTOR = Math.log(BASE) / Math.log(256); // log(BASE) / log(256), rounded up
		  var iFACTOR = Math.log(256) / Math.log(BASE); // log(256) / log(BASE), rounded up
		  function encode (source) {
		    if (source instanceof Uint8Array) ; else if (ArrayBuffer.isView(source)) {
		      source = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
		    } else if (Array.isArray(source)) {
		      source = Uint8Array.from(source);
		    }
		    if (!(source instanceof Uint8Array)) { throw new TypeError('Expected Uint8Array') }
		    if (source.length === 0) { return '' }
		        // Skip & count leading zeroes.
		    var zeroes = 0;
		    var length = 0;
		    var pbegin = 0;
		    var pend = source.length;
		    while (pbegin !== pend && source[pbegin] === 0) {
		      pbegin++;
		      zeroes++;
		    }
		        // Allocate enough space in big-endian base58 representation.
		    var size = ((pend - pbegin) * iFACTOR + 1) >>> 0;
		    var b58 = new Uint8Array(size);
		        // Process the bytes.
		    while (pbegin !== pend) {
		      var carry = source[pbegin];
		            // Apply "b58 = b58 * 256 + ch".
		      var i = 0;
		      for (var it1 = size - 1; (carry !== 0 || i < length) && (it1 !== -1); it1--, i++) {
		        carry += (256 * b58[it1]) >>> 0;
		        b58[it1] = (carry % BASE) >>> 0;
		        carry = (carry / BASE) >>> 0;
		      }
		      if (carry !== 0) { throw new Error('Non-zero carry') }
		      length = i;
		      pbegin++;
		    }
		        // Skip leading zeroes in base58 result.
		    var it2 = size - length;
		    while (it2 !== size && b58[it2] === 0) {
		      it2++;
		    }
		        // Translate the result into a string.
		    var str = LEADER.repeat(zeroes);
		    for (; it2 < size; ++it2) { str += ALPHABET.charAt(b58[it2]); }
		    return str
		  }
		  function decodeUnsafe (source) {
		    if (typeof source !== 'string') { throw new TypeError('Expected String') }
		    if (source.length === 0) { return new Uint8Array() }
		    var psz = 0;
		        // Skip and count leading '1's.
		    var zeroes = 0;
		    var length = 0;
		    while (source[psz] === LEADER) {
		      zeroes++;
		      psz++;
		    }
		        // Allocate enough space in big-endian base256 representation.
		    var size = (((source.length - psz) * FACTOR) + 1) >>> 0; // log(58) / log(256), rounded up.
		    var b256 = new Uint8Array(size);
		        // Process the characters.
		    while (source[psz]) {
		            // Find code of next character
		      var charCode = source.charCodeAt(psz);
		            // Base map can not be indexed using char code
		      if (charCode > 255) { return }
		            // Decode character
		      var carry = BASE_MAP[charCode];
		            // Invalid character
		      if (carry === 255) { return }
		      var i = 0;
		      for (var it3 = size - 1; (carry !== 0 || i < length) && (it3 !== -1); it3--, i++) {
		        carry += (BASE * b256[it3]) >>> 0;
		        b256[it3] = (carry % 256) >>> 0;
		        carry = (carry / 256) >>> 0;
		      }
		      if (carry !== 0) { throw new Error('Non-zero carry') }
		      length = i;
		      psz++;
		    }
		        // Skip leading zeroes in b256.
		    var it4 = size - length;
		    while (it4 !== size && b256[it4] === 0) {
		      it4++;
		    }
		    var vch = new Uint8Array(zeroes + (size - it4));
		    var j = zeroes;
		    while (it4 !== size) {
		      vch[j++] = b256[it4++];
		    }
		    return vch
		  }
		  function decode (string) {
		    var buffer = decodeUnsafe(string);
		    if (buffer) { return buffer }
		    throw new Error('Non-base' + BASE + ' character')
		  }
		  return {
		    encode: encode,
		    decodeUnsafe: decodeUnsafe,
		    decode: decode
		  }
		}
		src = base;
		return src;
	}

	var bs58;
	var hasRequiredBs58;

	function requireBs58 () {
		if (hasRequiredBs58) return bs58;
		hasRequiredBs58 = 1;
		const basex = requireSrc$1();
		const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

		bs58 = basex(ALPHABET);
		return bs58;
	}

	var base$2;
	var hasRequiredBase;

	function requireBase () {
		if (hasRequiredBase) return base$2;
		hasRequiredBase = 1;

		var base58 = requireBs58();

		base$2 = function (checksumFn) {
		  // Encode a buffer as a base58-check encoded string
		  function encode (payload) {
		    var payloadU8 = Uint8Array.from(payload);
		    var checksum = checksumFn(payloadU8);
		    var length = payloadU8.length + 4;
		    var both = new Uint8Array(length);
		    both.set(payloadU8, 0);
		    both.set(checksum.subarray(0, 4), payloadU8.length);
		    return base58.encode(both, length)
		  }

		  function decodeRaw (buffer) {
		    var payload = buffer.slice(0, -4);
		    var checksum = buffer.slice(-4);
		    var newChecksum = checksumFn(payload);

		    if (checksum[0] ^ newChecksum[0] |
		        checksum[1] ^ newChecksum[1] |
		        checksum[2] ^ newChecksum[2] |
		        checksum[3] ^ newChecksum[3]) return

		    return payload
		  }

		  // Decode a base58-check encoded string to a buffer, no result if checksum is wrong
		  function decodeUnsafe (string) {
		    var buffer = base58.decodeUnsafe(string);
		    if (!buffer) return

		    return decodeRaw(buffer)
		  }

		  function decode (string) {
		    var buffer = base58.decode(string);
		    var payload = decodeRaw(buffer);
		    if (!payload) throw new Error('Invalid checksum')
		    return payload
		  }

		  return {
		    encode: encode,
		    decode: decode,
		    decodeUnsafe: decodeUnsafe
		  }
		};
		return base$2;
	}

	var bs58check;
	var hasRequiredBs58check;

	function requireBs58check () {
		if (hasRequiredBs58check) return bs58check;
		hasRequiredBs58check = 1;

		var { sha256 } = /*@__PURE__*/ requireSha256();
		var bs58checkBase = requireBase();

		// SHA256(SHA256(buffer))
		function sha256x2 (buffer) {
		  return sha256(sha256(buffer))
		}

		bs58check = bs58checkBase(sha256x2);
		return bs58check;
	}

	var hasRequiredP2pkh;

	function requireP2pkh () {
		if (hasRequiredP2pkh) return p2pkh;
		hasRequiredP2pkh = 1;
		Object.defineProperty(p2pkh, '__esModule', { value: true });
		p2pkh.p2pkh = void 0;
		const bcrypto = requireCrypto();
		const networks_1 = requireNetworks();
		const bscript = requireScript();
		const types_1 = requireTypes();
		const lazy = requireLazy();
		const bs58check = requireBs58check();
		const OPS = bscript.OPS;
		// input: {signature} {pubkey}
		// output: OP_DUP OP_HASH160 {hash160(pubkey)} OP_EQUALVERIFY OP_CHECKSIG
		/**
		 * Creates a Pay-to-Public-Key-Hash (P2PKH) payment object.
		 *
		 * @param a - The payment object containing the necessary data.
		 * @param opts - Optional payment options.
		 * @returns The P2PKH payment object.
		 * @throws {TypeError} If the required data is not provided or if the data is invalid.
		 */
		function p2pkh$1(a, opts) {
		  if (!a.address && !a.hash && !a.output && !a.pubkey && !a.input)
		    throw new TypeError('Not enough data');
		  opts = Object.assign({ validate: true }, opts || {});
		  (0, types_1.typeforce)(
		    {
		      network: types_1.typeforce.maybe(types_1.typeforce.Object),
		      address: types_1.typeforce.maybe(types_1.typeforce.String),
		      hash: types_1.typeforce.maybe(types_1.typeforce.BufferN(20)),
		      output: types_1.typeforce.maybe(types_1.typeforce.BufferN(25)),
		      pubkey: types_1.typeforce.maybe(types_1.isPoint),
		      signature: types_1.typeforce.maybe(bscript.isCanonicalScriptSignature),
		      input: types_1.typeforce.maybe(types_1.typeforce.Buffer),
		    },
		    a,
		  );
		  const _address = lazy.value(() => {
		    const payload = bufferExports.Buffer.from(bs58check.decode(a.address));
		    const version = payload.readUInt8(0);
		    const hash = payload.slice(1);
		    return { version, hash };
		  });
		  const _chunks = lazy.value(() => {
		    return bscript.decompile(a.input);
		  });
		  const network = a.network || networks_1.bitcoin;
		  const o = { name: 'p2pkh', network };
		  lazy.prop(o, 'address', () => {
		    if (!o.hash) return;
		    const payload = bufferExports.Buffer.allocUnsafe(21);
		    payload.writeUInt8(network.pubKeyHash, 0);
		    o.hash.copy(payload, 1);
		    return bs58check.encode(payload);
		  });
		  lazy.prop(o, 'hash', () => {
		    if (a.output) return a.output.slice(3, 23);
		    if (a.address) return _address().hash;
		    if (a.pubkey || o.pubkey) return bcrypto.hash160(a.pubkey || o.pubkey);
		  });
		  lazy.prop(o, 'output', () => {
		    if (!o.hash) return;
		    return bscript.compile([
		      OPS.OP_DUP,
		      OPS.OP_HASH160,
		      o.hash,
		      OPS.OP_EQUALVERIFY,
		      OPS.OP_CHECKSIG,
		    ]);
		  });
		  lazy.prop(o, 'pubkey', () => {
		    if (!a.input) return;
		    return _chunks()[1];
		  });
		  lazy.prop(o, 'signature', () => {
		    if (!a.input) return;
		    return _chunks()[0];
		  });
		  lazy.prop(o, 'input', () => {
		    if (!a.pubkey) return;
		    if (!a.signature) return;
		    return bscript.compile([a.signature, a.pubkey]);
		  });
		  lazy.prop(o, 'witness', () => {
		    if (!o.input) return;
		    return [];
		  });
		  // extended validation
		  if (opts.validate) {
		    let hash = bufferExports.Buffer.from([]);
		    if (a.address) {
		      if (_address().version !== network.pubKeyHash)
		        throw new TypeError('Invalid version or Network mismatch');
		      if (_address().hash.length !== 20) throw new TypeError('Invalid address');
		      hash = _address().hash;
		    }
		    if (a.hash) {
		      if (hash.length > 0 && !hash.equals(a.hash))
		        throw new TypeError('Hash mismatch');
		      else hash = a.hash;
		    }
		    if (a.output) {
		      if (
		        a.output.length !== 25 ||
		        a.output[0] !== OPS.OP_DUP ||
		        a.output[1] !== OPS.OP_HASH160 ||
		        a.output[2] !== 0x14 ||
		        a.output[23] !== OPS.OP_EQUALVERIFY ||
		        a.output[24] !== OPS.OP_CHECKSIG
		      )
		        throw new TypeError('Output is invalid');
		      const hash2 = a.output.slice(3, 23);
		      if (hash.length > 0 && !hash.equals(hash2))
		        throw new TypeError('Hash mismatch');
		      else hash = hash2;
		    }
		    if (a.pubkey) {
		      const pkh = bcrypto.hash160(a.pubkey);
		      if (hash.length > 0 && !hash.equals(pkh))
		        throw new TypeError('Hash mismatch');
		      else hash = pkh;
		    }
		    if (a.input) {
		      const chunks = _chunks();
		      if (chunks.length !== 2) throw new TypeError('Input is invalid');
		      if (!bscript.isCanonicalScriptSignature(chunks[0]))
		        throw new TypeError('Input has invalid signature');
		      if (!(0, types_1.isPoint)(chunks[1]))
		        throw new TypeError('Input has invalid pubkey');
		      if (a.signature && !a.signature.equals(chunks[0]))
		        throw new TypeError('Signature mismatch');
		      if (a.pubkey && !a.pubkey.equals(chunks[1]))
		        throw new TypeError('Pubkey mismatch');
		      const pkh = bcrypto.hash160(chunks[1]);
		      if (hash.length > 0 && !hash.equals(pkh))
		        throw new TypeError('Hash mismatch');
		    }
		  }
		  return Object.assign(o, a);
		}
		p2pkh.p2pkh = p2pkh$1;
		return p2pkh;
	}

	var p2sh = {};

	var hasRequiredP2sh;

	function requireP2sh () {
		if (hasRequiredP2sh) return p2sh;
		hasRequiredP2sh = 1;
		Object.defineProperty(p2sh, '__esModule', { value: true });
		p2sh.p2sh = void 0;
		const bcrypto = requireCrypto();
		const networks_1 = requireNetworks();
		const bscript = requireScript();
		const types_1 = requireTypes();
		const lazy = requireLazy();
		const bs58check = requireBs58check();
		const OPS = bscript.OPS;
		// input: [redeemScriptSig ...] {redeemScript}
		// witness: <?>
		// output: OP_HASH160 {hash160(redeemScript)} OP_EQUAL
		/**
		 * Creates a Pay-to-Script-Hash (P2SH) payment object.
		 *
		 * @param a - The payment object containing the necessary data.
		 * @param opts - Optional payment options.
		 * @returns The P2SH payment object.
		 * @throws {TypeError} If the required data is not provided or if the data is invalid.
		 */
		function p2sh$1(a, opts) {
		  if (!a.address && !a.hash && !a.output && !a.redeem && !a.input)
		    throw new TypeError('Not enough data');
		  opts = Object.assign({ validate: true }, opts || {});
		  (0, types_1.typeforce)(
		    {
		      network: types_1.typeforce.maybe(types_1.typeforce.Object),
		      address: types_1.typeforce.maybe(types_1.typeforce.String),
		      hash: types_1.typeforce.maybe(types_1.typeforce.BufferN(20)),
		      output: types_1.typeforce.maybe(types_1.typeforce.BufferN(23)),
		      redeem: types_1.typeforce.maybe({
		        network: types_1.typeforce.maybe(types_1.typeforce.Object),
		        output: types_1.typeforce.maybe(types_1.typeforce.Buffer),
		        input: types_1.typeforce.maybe(types_1.typeforce.Buffer),
		        witness: types_1.typeforce.maybe(
		          types_1.typeforce.arrayOf(types_1.typeforce.Buffer),
		        ),
		      }),
		      input: types_1.typeforce.maybe(types_1.typeforce.Buffer),
		      witness: types_1.typeforce.maybe(
		        types_1.typeforce.arrayOf(types_1.typeforce.Buffer),
		      ),
		    },
		    a,
		  );
		  let network = a.network;
		  if (!network) {
		    network = (a.redeem && a.redeem.network) || networks_1.bitcoin;
		  }
		  const o = { network };
		  const _address = lazy.value(() => {
		    const payload = bufferExports.Buffer.from(bs58check.decode(a.address));
		    const version = payload.readUInt8(0);
		    const hash = payload.slice(1);
		    return { version, hash };
		  });
		  const _chunks = lazy.value(() => {
		    return bscript.decompile(a.input);
		  });
		  const _redeem = lazy.value(() => {
		    const chunks = _chunks();
		    const lastChunk = chunks[chunks.length - 1];
		    return {
		      network,
		      output: lastChunk === OPS.OP_FALSE ? bufferExports.Buffer.from([]) : lastChunk,
		      input: bscript.compile(chunks.slice(0, -1)),
		      witness: a.witness || [],
		    };
		  });
		  // output dependents
		  lazy.prop(o, 'address', () => {
		    if (!o.hash) return;
		    const payload = bufferExports.Buffer.allocUnsafe(21);
		    payload.writeUInt8(o.network.scriptHash, 0);
		    o.hash.copy(payload, 1);
		    return bs58check.encode(payload);
		  });
		  lazy.prop(o, 'hash', () => {
		    // in order of least effort
		    if (a.output) return a.output.slice(2, 22);
		    if (a.address) return _address().hash;
		    if (o.redeem && o.redeem.output) return bcrypto.hash160(o.redeem.output);
		  });
		  lazy.prop(o, 'output', () => {
		    if (!o.hash) return;
		    return bscript.compile([OPS.OP_HASH160, o.hash, OPS.OP_EQUAL]);
		  });
		  // input dependents
		  lazy.prop(o, 'redeem', () => {
		    if (!a.input) return;
		    return _redeem();
		  });
		  lazy.prop(o, 'input', () => {
		    if (!a.redeem || !a.redeem.input || !a.redeem.output) return;
		    return bscript.compile(
		      [].concat(bscript.decompile(a.redeem.input), a.redeem.output),
		    );
		  });
		  lazy.prop(o, 'witness', () => {
		    if (o.redeem && o.redeem.witness) return o.redeem.witness;
		    if (o.input) return [];
		  });
		  lazy.prop(o, 'name', () => {
		    const nameParts = ['p2sh'];
		    if (o.redeem !== undefined && o.redeem.name !== undefined)
		      nameParts.push(o.redeem.name);
		    return nameParts.join('-');
		  });
		  if (opts.validate) {
		    let hash = bufferExports.Buffer.from([]);
		    if (a.address) {
		      if (_address().version !== network.scriptHash)
		        throw new TypeError('Invalid version or Network mismatch');
		      if (_address().hash.length !== 20) throw new TypeError('Invalid address');
		      hash = _address().hash;
		    }
		    if (a.hash) {
		      if (hash.length > 0 && !hash.equals(a.hash))
		        throw new TypeError('Hash mismatch');
		      else hash = a.hash;
		    }
		    if (a.output) {
		      if (
		        a.output.length !== 23 ||
		        a.output[0] !== OPS.OP_HASH160 ||
		        a.output[1] !== 0x14 ||
		        a.output[22] !== OPS.OP_EQUAL
		      )
		        throw new TypeError('Output is invalid');
		      const hash2 = a.output.slice(2, 22);
		      if (hash.length > 0 && !hash.equals(hash2))
		        throw new TypeError('Hash mismatch');
		      else hash = hash2;
		    }
		    // inlined to prevent 'no-inner-declarations' failing
		    const checkRedeem = redeem => {
		      // is the redeem output empty/invalid?
		      if (redeem.output) {
		        const decompile = bscript.decompile(redeem.output);
		        if (!decompile || decompile.length < 1)
		          throw new TypeError('Redeem.output too short');
		        if (redeem.output.byteLength > 520)
		          throw new TypeError(
		            'Redeem.output unspendable if larger than 520 bytes',
		          );
		        if (bscript.countNonPushOnlyOPs(decompile) > 201)
		          throw new TypeError(
		            'Redeem.output unspendable with more than 201 non-push ops',
		          );
		        // match hash against other sources
		        const hash2 = bcrypto.hash160(redeem.output);
		        if (hash.length > 0 && !hash.equals(hash2))
		          throw new TypeError('Hash mismatch');
		        else hash = hash2;
		      }
		      if (redeem.input) {
		        const hasInput = redeem.input.length > 0;
		        const hasWitness = redeem.witness && redeem.witness.length > 0;
		        if (!hasInput && !hasWitness) throw new TypeError('Empty input');
		        if (hasInput && hasWitness)
		          throw new TypeError('Input and witness provided');
		        if (hasInput) {
		          const richunks = bscript.decompile(redeem.input);
		          if (!bscript.isPushOnly(richunks))
		            throw new TypeError('Non push-only scriptSig');
		        }
		      }
		    };
		    if (a.input) {
		      const chunks = _chunks();
		      if (!chunks || chunks.length < 1) throw new TypeError('Input too short');
		      if (!bufferExports.Buffer.isBuffer(_redeem().output))
		        throw new TypeError('Input is invalid');
		      checkRedeem(_redeem());
		    }
		    if (a.redeem) {
		      if (a.redeem.network && a.redeem.network !== network)
		        throw new TypeError('Network mismatch');
		      if (a.input) {
		        const redeem = _redeem();
		        if (a.redeem.output && !a.redeem.output.equals(redeem.output))
		          throw new TypeError('Redeem.output mismatch');
		        if (a.redeem.input && !a.redeem.input.equals(redeem.input))
		          throw new TypeError('Redeem.input mismatch');
		      }
		      checkRedeem(a.redeem);
		    }
		    if (a.witness) {
		      if (
		        a.redeem &&
		        a.redeem.witness &&
		        !(0, types_1.stacksEqual)(a.redeem.witness, a.witness)
		      )
		        throw new TypeError('Witness and redeem.witness mismatch');
		    }
		  }
		  return Object.assign(o, a);
		}
		p2sh.p2sh = p2sh$1;
		return p2sh;
	}

	var p2wpkh = {};

	var dist$2 = {};

	var hasRequiredDist$2;

	function requireDist$2 () {
		if (hasRequiredDist$2) return dist$2;
		hasRequiredDist$2 = 1;
		Object.defineProperty(dist$2, "__esModule", { value: true });
		dist$2.bech32m = dist$2.bech32 = void 0;
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
		dist$2.bech32 = getLibraryFromEncoding('bech32');
		dist$2.bech32m = getLibraryFromEncoding('bech32m');
		return dist$2;
	}

	var hasRequiredP2wpkh;

	function requireP2wpkh () {
		if (hasRequiredP2wpkh) return p2wpkh;
		hasRequiredP2wpkh = 1;
		Object.defineProperty(p2wpkh, '__esModule', { value: true });
		p2wpkh.p2wpkh = void 0;
		const bcrypto = requireCrypto();
		const networks_1 = requireNetworks();
		const bscript = requireScript();
		const types_1 = requireTypes();
		const lazy = requireLazy();
		const bech32_1 = requireDist$2();
		const OPS = bscript.OPS;
		const EMPTY_BUFFER = bufferExports.Buffer.alloc(0);
		// witness: {signature} {pubKey}
		// input: <>
		// output: OP_0 {pubKeyHash}
		/**
		 * Creates a pay-to-witness-public-key-hash (p2wpkh) payment object.
		 *
		 * @param a - The payment object containing the necessary data.
		 * @param opts - Optional payment options.
		 * @returns The p2wpkh payment object.
		 * @throws {TypeError} If the required data is missing or invalid.
		 */
		function p2wpkh$1(a, opts) {
		  if (!a.address && !a.hash && !a.output && !a.pubkey && !a.witness)
		    throw new TypeError('Not enough data');
		  opts = Object.assign({ validate: true }, opts || {});
		  (0, types_1.typeforce)(
		    {
		      address: types_1.typeforce.maybe(types_1.typeforce.String),
		      hash: types_1.typeforce.maybe(types_1.typeforce.BufferN(20)),
		      input: types_1.typeforce.maybe(types_1.typeforce.BufferN(0)),
		      network: types_1.typeforce.maybe(types_1.typeforce.Object),
		      output: types_1.typeforce.maybe(types_1.typeforce.BufferN(22)),
		      pubkey: types_1.typeforce.maybe(types_1.isPoint),
		      signature: types_1.typeforce.maybe(bscript.isCanonicalScriptSignature),
		      witness: types_1.typeforce.maybe(
		        types_1.typeforce.arrayOf(types_1.typeforce.Buffer),
		      ),
		    },
		    a,
		  );
		  const _address = lazy.value(() => {
		    const result = bech32_1.bech32.decode(a.address);
		    const version = result.words.shift();
		    const data = bech32_1.bech32.fromWords(result.words);
		    return {
		      version,
		      prefix: result.prefix,
		      data: bufferExports.Buffer.from(data),
		    };
		  });
		  const network = a.network || networks_1.bitcoin;
		  const o = { name: 'p2wpkh', network };
		  lazy.prop(o, 'address', () => {
		    if (!o.hash) return;
		    const words = bech32_1.bech32.toWords(o.hash);
		    words.unshift(0x00);
		    return bech32_1.bech32.encode(network.bech32, words);
		  });
		  lazy.prop(o, 'hash', () => {
		    if (a.output) return a.output.slice(2, 22);
		    if (a.address) return _address().data;
		    if (a.pubkey || o.pubkey) return bcrypto.hash160(a.pubkey || o.pubkey);
		  });
		  lazy.prop(o, 'output', () => {
		    if (!o.hash) return;
		    return bscript.compile([OPS.OP_0, o.hash]);
		  });
		  lazy.prop(o, 'pubkey', () => {
		    if (a.pubkey) return a.pubkey;
		    if (!a.witness) return;
		    return a.witness[1];
		  });
		  lazy.prop(o, 'signature', () => {
		    if (!a.witness) return;
		    return a.witness[0];
		  });
		  lazy.prop(o, 'input', () => {
		    if (!o.witness) return;
		    return EMPTY_BUFFER;
		  });
		  lazy.prop(o, 'witness', () => {
		    if (!a.pubkey) return;
		    if (!a.signature) return;
		    return [a.signature, a.pubkey];
		  });
		  // extended validation
		  if (opts.validate) {
		    let hash = bufferExports.Buffer.from([]);
		    if (a.address) {
		      if (network && network.bech32 !== _address().prefix)
		        throw new TypeError('Invalid prefix or Network mismatch');
		      if (_address().version !== 0x00)
		        throw new TypeError('Invalid address version');
		      if (_address().data.length !== 20)
		        throw new TypeError('Invalid address data');
		      hash = _address().data;
		    }
		    if (a.hash) {
		      if (hash.length > 0 && !hash.equals(a.hash))
		        throw new TypeError('Hash mismatch');
		      else hash = a.hash;
		    }
		    if (a.output) {
		      if (
		        a.output.length !== 22 ||
		        a.output[0] !== OPS.OP_0 ||
		        a.output[1] !== 0x14
		      )
		        throw new TypeError('Output is invalid');
		      if (hash.length > 0 && !hash.equals(a.output.slice(2)))
		        throw new TypeError('Hash mismatch');
		      else hash = a.output.slice(2);
		    }
		    if (a.pubkey) {
		      const pkh = bcrypto.hash160(a.pubkey);
		      if (hash.length > 0 && !hash.equals(pkh))
		        throw new TypeError('Hash mismatch');
		      else hash = pkh;
		      if (!(0, types_1.isPoint)(a.pubkey) || a.pubkey.length !== 33)
		        throw new TypeError('Invalid pubkey for p2wpkh');
		    }
		    if (a.witness) {
		      if (a.witness.length !== 2) throw new TypeError('Witness is invalid');
		      if (!bscript.isCanonicalScriptSignature(a.witness[0]))
		        throw new TypeError('Witness has invalid signature');
		      if (!(0, types_1.isPoint)(a.witness[1]) || a.witness[1].length !== 33)
		        throw new TypeError('Witness has invalid pubkey');
		      if (a.signature && !a.signature.equals(a.witness[0]))
		        throw new TypeError('Signature mismatch');
		      if (a.pubkey && !a.pubkey.equals(a.witness[1]))
		        throw new TypeError('Pubkey mismatch');
		      const pkh = bcrypto.hash160(a.witness[1]);
		      if (hash.length > 0 && !hash.equals(pkh))
		        throw new TypeError('Hash mismatch');
		    }
		  }
		  return Object.assign(o, a);
		}
		p2wpkh.p2wpkh = p2wpkh$1;
		return p2wpkh;
	}

	var p2wsh = {};

	var hasRequiredP2wsh;

	function requireP2wsh () {
		if (hasRequiredP2wsh) return p2wsh;
		hasRequiredP2wsh = 1;
		Object.defineProperty(p2wsh, '__esModule', { value: true });
		p2wsh.p2wsh = void 0;
		const bcrypto = requireCrypto();
		const networks_1 = requireNetworks();
		const bscript = requireScript();
		const types_1 = requireTypes();
		const lazy = requireLazy();
		const bech32_1 = requireDist$2();
		const OPS = bscript.OPS;
		const EMPTY_BUFFER = bufferExports.Buffer.alloc(0);
		function chunkHasUncompressedPubkey(chunk) {
		  if (
		    bufferExports.Buffer.isBuffer(chunk) &&
		    chunk.length === 65 &&
		    chunk[0] === 0x04 &&
		    (0, types_1.isPoint)(chunk)
		  ) {
		    return true;
		  } else {
		    return false;
		  }
		}
		// input: <>
		// witness: [redeemScriptSig ...] {redeemScript}
		// output: OP_0 {sha256(redeemScript)}
		/**
		 * Creates a Pay-to-Witness-Script-Hash (P2WSH) payment object.
		 *
		 * @param a - The payment object containing the necessary data.
		 * @param opts - Optional payment options.
		 * @returns The P2WSH payment object.
		 * @throws {TypeError} If the required data is missing or invalid.
		 */
		function p2wsh$1(a, opts) {
		  if (!a.address && !a.hash && !a.output && !a.redeem && !a.witness)
		    throw new TypeError('Not enough data');
		  opts = Object.assign({ validate: true }, opts || {});
		  (0, types_1.typeforce)(
		    {
		      network: types_1.typeforce.maybe(types_1.typeforce.Object),
		      address: types_1.typeforce.maybe(types_1.typeforce.String),
		      hash: types_1.typeforce.maybe(types_1.typeforce.BufferN(32)),
		      output: types_1.typeforce.maybe(types_1.typeforce.BufferN(34)),
		      redeem: types_1.typeforce.maybe({
		        input: types_1.typeforce.maybe(types_1.typeforce.Buffer),
		        network: types_1.typeforce.maybe(types_1.typeforce.Object),
		        output: types_1.typeforce.maybe(types_1.typeforce.Buffer),
		        witness: types_1.typeforce.maybe(
		          types_1.typeforce.arrayOf(types_1.typeforce.Buffer),
		        ),
		      }),
		      input: types_1.typeforce.maybe(types_1.typeforce.BufferN(0)),
		      witness: types_1.typeforce.maybe(
		        types_1.typeforce.arrayOf(types_1.typeforce.Buffer),
		      ),
		    },
		    a,
		  );
		  const _address = lazy.value(() => {
		    const result = bech32_1.bech32.decode(a.address);
		    const version = result.words.shift();
		    const data = bech32_1.bech32.fromWords(result.words);
		    return {
		      version,
		      prefix: result.prefix,
		      data: bufferExports.Buffer.from(data),
		    };
		  });
		  const _rchunks = lazy.value(() => {
		    return bscript.decompile(a.redeem.input);
		  });
		  let network = a.network;
		  if (!network) {
		    network = (a.redeem && a.redeem.network) || networks_1.bitcoin;
		  }
		  const o = { network };
		  lazy.prop(o, 'address', () => {
		    if (!o.hash) return;
		    const words = bech32_1.bech32.toWords(o.hash);
		    words.unshift(0x00);
		    return bech32_1.bech32.encode(network.bech32, words);
		  });
		  lazy.prop(o, 'hash', () => {
		    if (a.output) return a.output.slice(2);
		    if (a.address) return _address().data;
		    if (o.redeem && o.redeem.output) return bcrypto.sha256(o.redeem.output);
		  });
		  lazy.prop(o, 'output', () => {
		    if (!o.hash) return;
		    return bscript.compile([OPS.OP_0, o.hash]);
		  });
		  lazy.prop(o, 'redeem', () => {
		    if (!a.witness) return;
		    return {
		      output: a.witness[a.witness.length - 1],
		      input: EMPTY_BUFFER,
		      witness: a.witness.slice(0, -1),
		    };
		  });
		  lazy.prop(o, 'input', () => {
		    if (!o.witness) return;
		    return EMPTY_BUFFER;
		  });
		  lazy.prop(o, 'witness', () => {
		    // transform redeem input to witness stack?
		    if (
		      a.redeem &&
		      a.redeem.input &&
		      a.redeem.input.length > 0 &&
		      a.redeem.output &&
		      a.redeem.output.length > 0
		    ) {
		      const stack = bscript.toStack(_rchunks());
		      // assign, and blank the existing input
		      o.redeem = Object.assign({ witness: stack }, a.redeem);
		      o.redeem.input = EMPTY_BUFFER;
		      return [].concat(stack, a.redeem.output);
		    }
		    if (!a.redeem) return;
		    if (!a.redeem.output) return;
		    if (!a.redeem.witness) return;
		    return [].concat(a.redeem.witness, a.redeem.output);
		  });
		  lazy.prop(o, 'name', () => {
		    const nameParts = ['p2wsh'];
		    if (o.redeem !== undefined && o.redeem.name !== undefined)
		      nameParts.push(o.redeem.name);
		    return nameParts.join('-');
		  });
		  // extended validation
		  if (opts.validate) {
		    let hash = bufferExports.Buffer.from([]);
		    if (a.address) {
		      if (_address().prefix !== network.bech32)
		        throw new TypeError('Invalid prefix or Network mismatch');
		      if (_address().version !== 0x00)
		        throw new TypeError('Invalid address version');
		      if (_address().data.length !== 32)
		        throw new TypeError('Invalid address data');
		      hash = _address().data;
		    }
		    if (a.hash) {
		      if (hash.length > 0 && !hash.equals(a.hash))
		        throw new TypeError('Hash mismatch');
		      else hash = a.hash;
		    }
		    if (a.output) {
		      if (
		        a.output.length !== 34 ||
		        a.output[0] !== OPS.OP_0 ||
		        a.output[1] !== 0x20
		      )
		        throw new TypeError('Output is invalid');
		      const hash2 = a.output.slice(2);
		      if (hash.length > 0 && !hash.equals(hash2))
		        throw new TypeError('Hash mismatch');
		      else hash = hash2;
		    }
		    if (a.redeem) {
		      if (a.redeem.network && a.redeem.network !== network)
		        throw new TypeError('Network mismatch');
		      // is there two redeem sources?
		      if (
		        a.redeem.input &&
		        a.redeem.input.length > 0 &&
		        a.redeem.witness &&
		        a.redeem.witness.length > 0
		      )
		        throw new TypeError('Ambiguous witness source');
		      // is the redeem output non-empty/valid?
		      if (a.redeem.output) {
		        const decompile = bscript.decompile(a.redeem.output);
		        if (!decompile || decompile.length < 1)
		          throw new TypeError('Redeem.output is invalid');
		        if (a.redeem.output.byteLength > 3600)
		          throw new TypeError(
		            'Redeem.output unspendable if larger than 3600 bytes',
		          );
		        if (bscript.countNonPushOnlyOPs(decompile) > 201)
		          throw new TypeError(
		            'Redeem.output unspendable with more than 201 non-push ops',
		          );
		        // match hash against other sources
		        const hash2 = bcrypto.sha256(a.redeem.output);
		        if (hash.length > 0 && !hash.equals(hash2))
		          throw new TypeError('Hash mismatch');
		        else hash = hash2;
		      }
		      if (a.redeem.input && !bscript.isPushOnly(_rchunks()))
		        throw new TypeError('Non push-only scriptSig');
		      if (
		        a.witness &&
		        a.redeem.witness &&
		        !(0, types_1.stacksEqual)(a.witness, a.redeem.witness)
		      )
		        throw new TypeError('Witness and redeem.witness mismatch');
		      if (
		        (a.redeem.input && _rchunks().some(chunkHasUncompressedPubkey)) ||
		        (a.redeem.output &&
		          (bscript.decompile(a.redeem.output) || []).some(
		            chunkHasUncompressedPubkey,
		          ))
		      ) {
		        throw new TypeError(
		          'redeem.input or redeem.output contains uncompressed pubkey',
		        );
		      }
		    }
		    if (a.witness && a.witness.length > 0) {
		      const wScript = a.witness[a.witness.length - 1];
		      if (a.redeem && a.redeem.output && !a.redeem.output.equals(wScript))
		        throw new TypeError('Witness and redeem.output mismatch');
		      if (
		        a.witness.some(chunkHasUncompressedPubkey) ||
		        (bscript.decompile(wScript) || []).some(chunkHasUncompressedPubkey)
		      )
		        throw new TypeError('Witness contains uncompressed pubkey');
		    }
		  }
		  return Object.assign(o, a);
		}
		p2wsh.p2wsh = p2wsh$1;
		return p2wsh;
	}

	var p2tr = {};

	var ecc_lib = {};

	var hasRequiredEcc_lib;

	function requireEcc_lib () {
		if (hasRequiredEcc_lib) return ecc_lib;
		hasRequiredEcc_lib = 1;
		Object.defineProperty(ecc_lib, '__esModule', { value: true });
		ecc_lib.getEccLib = ecc_lib.initEccLib = void 0;
		const _ECCLIB_CACHE = {};
		/**
		 * Initializes the ECC library with the provided instance.
		 * If `eccLib` is `undefined`, the library will be cleared.
		 * If `eccLib` is a new instance, it will be verified before setting it as the active library.
		 *
		 * @param eccLib The instance of the ECC library to initialize.
		 * @param opts Extra initialization options. Use {DANGER_DO_NOT_VERIFY_ECCLIB:true} if ecc verification should not be executed. Not recommended!
		 */
		function initEccLib(eccLib, opts) {
		  if (!eccLib) {
		    // allow clearing the library
		    _ECCLIB_CACHE.eccLib = eccLib;
		  } else if (eccLib !== _ECCLIB_CACHE.eccLib) {
		    if (!opts?.DANGER_DO_NOT_VERIFY_ECCLIB)
		      // new instance, verify it
		      verifyEcc(eccLib);
		    _ECCLIB_CACHE.eccLib = eccLib;
		  }
		}
		ecc_lib.initEccLib = initEccLib;
		/**
		 * Retrieves the ECC Library instance.
		 * Throws an error if the ECC Library is not provided.
		 * You must call initEccLib() with a valid TinySecp256k1Interface instance before calling this function.
		 * @returns The ECC Library instance.
		 * @throws Error if the ECC Library is not provided.
		 */
		function getEccLib() {
		  if (!_ECCLIB_CACHE.eccLib)
		    throw new Error(
		      'No ECC Library provided. You must call initEccLib() with a valid TinySecp256k1Interface instance',
		    );
		  return _ECCLIB_CACHE.eccLib;
		}
		ecc_lib.getEccLib = getEccLib;
		const h = hex => bufferExports.Buffer.from(hex, 'hex');
		/**
		 * Verifies the ECC functionality.
		 *
		 * @param ecc - The TinySecp256k1Interface object.
		 */
		function verifyEcc(ecc) {
		  assert(typeof ecc.isXOnlyPoint === 'function');
		  assert(
		    ecc.isXOnlyPoint(
		      h('79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'),
		    ),
		  );
		  assert(
		    ecc.isXOnlyPoint(
		      h('fffffffffffffffffffffffffffffffffffffffffffffffffffffffeeffffc2e'),
		    ),
		  );
		  assert(
		    ecc.isXOnlyPoint(
		      h('f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9'),
		    ),
		  );
		  assert(
		    ecc.isXOnlyPoint(
		      h('0000000000000000000000000000000000000000000000000000000000000001'),
		    ),
		  );
		  assert(
		    !ecc.isXOnlyPoint(
		      h('0000000000000000000000000000000000000000000000000000000000000000'),
		    ),
		  );
		  assert(
		    !ecc.isXOnlyPoint(
		      h('fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f'),
		    ),
		  );
		  assert(typeof ecc.xOnlyPointAddTweak === 'function');
		  tweakAddVectors.forEach(t => {
		    const r = ecc.xOnlyPointAddTweak(h(t.pubkey), h(t.tweak));
		    if (t.result === null) {
		      assert(r === null);
		    } else {
		      assert(r !== null);
		      assert(r.parity === t.parity);
		      assert(bufferExports.Buffer.from(r.xOnlyPubkey).equals(h(t.result)));
		    }
		  });
		}
		function assert(bool) {
		  if (!bool) throw new Error('ecc library invalid');
		}
		const tweakAddVectors = [
		  {
		    pubkey: '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
		    tweak: 'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140',
		    parity: -1,
		    result: null,
		  },
		  {
		    pubkey: '1617d38ed8d8657da4d4761e8057bc396ea9e4b9d29776d4be096016dbd2509b',
		    tweak: 'a8397a935f0dfceba6ba9618f6451ef4d80637abf4e6af2669fbc9de6a8fd2ac',
		    parity: 1,
		    result: 'e478f99dab91052ab39a33ea35fd5e6e4933f4d28023cd597c9a1f6760346adf',
		  },
		  {
		    pubkey: '2c0b7cf95324a07d05398b240174dc0c2be444d96b159aa6c7f7b1e668680991',
		    tweak: '823c3cd2142744b075a87eade7e1b8678ba308d566226a0056ca2b7a76f86b47',
		    parity: 0,
		    result: '9534f8dc8c6deda2dc007655981c78b49c5d96c778fbf363462a11ec9dfd948c',
		  },
		];
		return ecc_lib;
	}

	var bip341 = {};

	var bufferutils = {};

	var safeBuffer = {exports: {}};

	/*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */

	var hasRequiredSafeBuffer;

	function requireSafeBuffer () {
		if (hasRequiredSafeBuffer) return safeBuffer.exports;
		hasRequiredSafeBuffer = 1;
		(function (module, exports$1) {
			/* eslint-disable node/no-deprecated-api */
			var buffer = requireBuffer();
			var Buffer = buffer.Buffer;

			// alternative to using Object.keys for old browsers
			function copyProps (src, dst) {
			  for (var key in src) {
			    dst[key] = src[key];
			  }
			}
			if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
			  module.exports = buffer;
			} else {
			  // Copy properties from require('buffer')
			  copyProps(buffer, exports$1);
			  exports$1.Buffer = SafeBuffer;
			}

			function SafeBuffer (arg, encodingOrOffset, length) {
			  return Buffer(arg, encodingOrOffset, length)
			}

			SafeBuffer.prototype = Object.create(Buffer.prototype);

			// Copy static methods from Buffer
			copyProps(Buffer, SafeBuffer);

			SafeBuffer.from = function (arg, encodingOrOffset, length) {
			  if (typeof arg === 'number') {
			    throw new TypeError('Argument must not be a number')
			  }
			  return Buffer(arg, encodingOrOffset, length)
			};

			SafeBuffer.alloc = function (size, fill, encoding) {
			  if (typeof size !== 'number') {
			    throw new TypeError('Argument must be a number')
			  }
			  var buf = Buffer(size);
			  if (fill !== undefined) {
			    if (typeof encoding === 'string') {
			      buf.fill(fill, encoding);
			    } else {
			      buf.fill(fill);
			    }
			  } else {
			    buf.fill(0);
			  }
			  return buf
			};

			SafeBuffer.allocUnsafe = function (size) {
			  if (typeof size !== 'number') {
			    throw new TypeError('Argument must be a number')
			  }
			  return Buffer(size)
			};

			SafeBuffer.allocUnsafeSlow = function (size) {
			  if (typeof size !== 'number') {
			    throw new TypeError('Argument must be a number')
			  }
			  return buffer.SlowBuffer(size)
			}; 
		} (safeBuffer, safeBuffer.exports));
		return safeBuffer.exports;
	}

	var varuintBitcoin;
	var hasRequiredVaruintBitcoin;

	function requireVaruintBitcoin () {
		if (hasRequiredVaruintBitcoin) return varuintBitcoin;
		hasRequiredVaruintBitcoin = 1;
		var Buffer = requireSafeBuffer().Buffer;

		// Number.MAX_SAFE_INTEGER
		var MAX_SAFE_INTEGER = 9007199254740991;

		function checkUInt53 (n) {
		  if (n < 0 || n > MAX_SAFE_INTEGER || n % 1 !== 0) throw new RangeError('value out of range')
		}

		function encode (number, buffer, offset) {
		  checkUInt53(number);

		  if (!buffer) buffer = Buffer.allocUnsafe(encodingLength(number));
		  if (!Buffer.isBuffer(buffer)) throw new TypeError('buffer must be a Buffer instance')
		  if (!offset) offset = 0;

		  // 8 bit
		  if (number < 0xfd) {
		    buffer.writeUInt8(number, offset);
		    encode.bytes = 1;

		  // 16 bit
		  } else if (number <= 0xffff) {
		    buffer.writeUInt8(0xfd, offset);
		    buffer.writeUInt16LE(number, offset + 1);
		    encode.bytes = 3;

		  // 32 bit
		  } else if (number <= 0xffffffff) {
		    buffer.writeUInt8(0xfe, offset);
		    buffer.writeUInt32LE(number, offset + 1);
		    encode.bytes = 5;

		  // 64 bit
		  } else {
		    buffer.writeUInt8(0xff, offset);
		    buffer.writeUInt32LE(number >>> 0, offset + 1);
		    buffer.writeUInt32LE((number / 0x100000000) | 0, offset + 5);
		    encode.bytes = 9;
		  }

		  return buffer
		}

		function decode (buffer, offset) {
		  if (!Buffer.isBuffer(buffer)) throw new TypeError('buffer must be a Buffer instance')
		  if (!offset) offset = 0;

		  var first = buffer.readUInt8(offset);

		  // 8 bit
		  if (first < 0xfd) {
		    decode.bytes = 1;
		    return first

		  // 16 bit
		  } else if (first === 0xfd) {
		    decode.bytes = 3;
		    return buffer.readUInt16LE(offset + 1)

		  // 32 bit
		  } else if (first === 0xfe) {
		    decode.bytes = 5;
		    return buffer.readUInt32LE(offset + 1)

		  // 64 bit
		  } else {
		    decode.bytes = 9;
		    var lo = buffer.readUInt32LE(offset + 1);
		    var hi = buffer.readUInt32LE(offset + 5);
		    var number = hi * 0x0100000000 + lo;
		    checkUInt53(number);

		    return number
		  }
		}

		function encodingLength (number) {
		  checkUInt53(number);

		  return (
		    number < 0xfd ? 1
		      : number <= 0xffff ? 3
		        : number <= 0xffffffff ? 5
		          : 9
		  )
		}

		varuintBitcoin = { encode: encode, decode: decode, encodingLength: encodingLength };
		return varuintBitcoin;
	}

	var hasRequiredBufferutils;

	function requireBufferutils () {
		if (hasRequiredBufferutils) return bufferutils;
		hasRequiredBufferutils = 1;
		Object.defineProperty(bufferutils, '__esModule', { value: true });
		bufferutils.BufferReader =
		  bufferutils.BufferWriter =
		  bufferutils.cloneBuffer =
		  bufferutils.reverseBuffer =
		  bufferutils.writeUInt64LE =
		  bufferutils.readUInt64LE =
		  bufferutils.varuint =
		    void 0;
		const types = requireTypes();
		const { typeforce } = types;
		const varuint = requireVaruintBitcoin();
		bufferutils.varuint = varuint;
		// https://github.com/feross/buffer/blob/master/index.js#L1127
		function verifuint(value, max) {
		  if (typeof value !== 'number')
		    throw new Error('cannot write a non-number as a number');
		  if (value < 0)
		    throw new Error('specified a negative value for writing an unsigned value');
		  if (value > max) throw new Error('RangeError: value out of range');
		  if (Math.floor(value) !== value)
		    throw new Error('value has a fractional component');
		}
		function readUInt64LE(buffer, offset) {
		  const a = buffer.readUInt32LE(offset);
		  let b = buffer.readUInt32LE(offset + 4);
		  b *= 0x100000000;
		  verifuint(b + a, 0x001fffffffffffff);
		  return b + a;
		}
		bufferutils.readUInt64LE = readUInt64LE;
		/**
		 * Writes a 64-bit unsigned integer in little-endian format to the specified buffer at the given offset.
		 *
		 * @param buffer - The buffer to write the value to.
		 * @param value - The 64-bit unsigned integer value to write.
		 * @param offset - The offset in the buffer where the value should be written.
		 * @returns The new offset after writing the value.
		 */
		function writeUInt64LE(buffer, value, offset) {
		  verifuint(value, 0x001fffffffffffff);
		  buffer.writeInt32LE(value & -1, offset);
		  buffer.writeUInt32LE(Math.floor(value / 0x100000000), offset + 4);
		  return offset + 8;
		}
		bufferutils.writeUInt64LE = writeUInt64LE;
		/**
		 * Reverses the order of bytes in a buffer.
		 * @param buffer - The buffer to reverse.
		 * @returns A new buffer with the bytes reversed.
		 */
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
		bufferutils.reverseBuffer = reverseBuffer;
		function cloneBuffer(buffer) {
		  const clone = bufferExports.Buffer.allocUnsafe(buffer.length);
		  buffer.copy(clone);
		  return clone;
		}
		bufferutils.cloneBuffer = cloneBuffer;
		/**
		 * Helper class for serialization of bitcoin data types into a pre-allocated buffer.
		 */
		class BufferWriter {
		  static withCapacity(size) {
		    return new BufferWriter(bufferExports.Buffer.alloc(size));
		  }
		  constructor(buffer, offset = 0) {
		    this.buffer = buffer;
		    this.offset = offset;
		    typeforce(types.tuple(types.Buffer, types.UInt32), [buffer, offset]);
		  }
		  writeUInt8(i) {
		    this.offset = this.buffer.writeUInt8(i, this.offset);
		  }
		  writeInt32(i) {
		    this.offset = this.buffer.writeInt32LE(i, this.offset);
		  }
		  writeUInt32(i) {
		    this.offset = this.buffer.writeUInt32LE(i, this.offset);
		  }
		  writeUInt64(i) {
		    this.offset = writeUInt64LE(this.buffer, i, this.offset);
		  }
		  writeVarInt(i) {
		    varuint.encode(i, this.buffer, this.offset);
		    this.offset += varuint.encode.bytes;
		  }
		  writeSlice(slice) {
		    if (this.buffer.length < this.offset + slice.length) {
		      throw new Error('Cannot write slice out of bounds');
		    }
		    this.offset += slice.copy(this.buffer, this.offset);
		  }
		  writeVarSlice(slice) {
		    this.writeVarInt(slice.length);
		    this.writeSlice(slice);
		  }
		  writeVector(vector) {
		    this.writeVarInt(vector.length);
		    vector.forEach(buf => this.writeVarSlice(buf));
		  }
		  end() {
		    if (this.buffer.length === this.offset) {
		      return this.buffer;
		    }
		    throw new Error(`buffer size ${this.buffer.length}, offset ${this.offset}`);
		  }
		}
		bufferutils.BufferWriter = BufferWriter;
		/**
		 * Helper class for reading of bitcoin data types from a buffer.
		 */
		class BufferReader {
		  constructor(buffer, offset = 0) {
		    this.buffer = buffer;
		    this.offset = offset;
		    typeforce(types.tuple(types.Buffer, types.UInt32), [buffer, offset]);
		  }
		  readUInt8() {
		    const result = this.buffer.readUInt8(this.offset);
		    this.offset++;
		    return result;
		  }
		  readInt32() {
		    const result = this.buffer.readInt32LE(this.offset);
		    this.offset += 4;
		    return result;
		  }
		  readUInt32() {
		    const result = this.buffer.readUInt32LE(this.offset);
		    this.offset += 4;
		    return result;
		  }
		  readUInt64() {
		    const result = readUInt64LE(this.buffer, this.offset);
		    this.offset += 8;
		    return result;
		  }
		  readVarInt() {
		    const vi = varuint.decode(this.buffer, this.offset);
		    this.offset += varuint.decode.bytes;
		    return vi;
		  }
		  readSlice(n) {
		    if (this.buffer.length < this.offset + n) {
		      throw new Error('Cannot read slice out of bounds');
		    }
		    const result = this.buffer.slice(this.offset, this.offset + n);
		    this.offset += n;
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
		}
		bufferutils.BufferReader = BufferReader;
		return bufferutils;
	}

	var hasRequiredBip341;

	function requireBip341 () {
		if (hasRequiredBip341) return bip341;
		hasRequiredBip341 = 1;
		(function (exports$1) {
			Object.defineProperty(exports$1, '__esModule', { value: true });
			exports$1.tweakKey =
			  exports$1.tapTweakHash =
			  exports$1.tapleafHash =
			  exports$1.findScriptPath =
			  exports$1.toHashTree =
			  exports$1.rootHashFromPath =
			  exports$1.MAX_TAPTREE_DEPTH =
			  exports$1.LEAF_VERSION_TAPSCRIPT =
			    void 0;
			const buffer_1 = requireBuffer();
			const ecc_lib_1 = requireEcc_lib();
			const bcrypto = requireCrypto();
			const bufferutils_1 = requireBufferutils();
			const types_1 = requireTypes();
			exports$1.LEAF_VERSION_TAPSCRIPT = 0xc0;
			exports$1.MAX_TAPTREE_DEPTH = 128;
			const isHashBranch = ht => 'left' in ht && 'right' in ht;
			/**
			 * Calculates the root hash from a given control block and leaf hash.
			 * @param controlBlock - The control block buffer.
			 * @param leafHash - The leaf hash buffer.
			 * @returns The root hash buffer.
			 * @throws {TypeError} If the control block length is less than 33.
			 */
			function rootHashFromPath(controlBlock, leafHash) {
			  if (controlBlock.length < 33)
			    throw new TypeError(
			      `The control-block length is too small. Got ${controlBlock.length}, expected min 33.`,
			    );
			  const m = (controlBlock.length - 33) / 32;
			  let kj = leafHash;
			  for (let j = 0; j < m; j++) {
			    const ej = controlBlock.slice(33 + 32 * j, 65 + 32 * j);
			    if (kj.compare(ej) < 0) {
			      kj = tapBranchHash(kj, ej);
			    } else {
			      kj = tapBranchHash(ej, kj);
			    }
			  }
			  return kj;
			}
			exports$1.rootHashFromPath = rootHashFromPath;
			/**
			 * Build a hash tree of merkle nodes from the scripts binary tree.
			 * @param scriptTree - the tree of scripts to pairwise hash.
			 */
			function toHashTree(scriptTree) {
			  if ((0, types_1.isTapleaf)(scriptTree))
			    return { hash: tapleafHash(scriptTree) };
			  const hashes = [toHashTree(scriptTree[0]), toHashTree(scriptTree[1])];
			  hashes.sort((a, b) => a.hash.compare(b.hash));
			  const [left, right] = hashes;
			  return {
			    hash: tapBranchHash(left.hash, right.hash),
			    left,
			    right,
			  };
			}
			exports$1.toHashTree = toHashTree;
			/**
			 * Given a HashTree, finds the path from a particular hash to the root.
			 * @param node - the root of the tree
			 * @param hash - the hash to search for
			 * @returns - array of sibling hashes, from leaf (inclusive) to root
			 * (exclusive) needed to prove inclusion of the specified hash. undefined if no
			 * path is found
			 */
			function findScriptPath(node, hash) {
			  if (isHashBranch(node)) {
			    const leftPath = findScriptPath(node.left, hash);
			    if (leftPath !== undefined) return [...leftPath, node.right.hash];
			    const rightPath = findScriptPath(node.right, hash);
			    if (rightPath !== undefined) return [...rightPath, node.left.hash];
			  } else if (node.hash.equals(hash)) {
			    return [];
			  }
			  return undefined;
			}
			exports$1.findScriptPath = findScriptPath;
			function tapleafHash(leaf) {
			  const version = leaf.version || exports$1.LEAF_VERSION_TAPSCRIPT;
			  return bcrypto.taggedHash(
			    'TapLeaf',
			    buffer_1.Buffer.concat([
			      buffer_1.Buffer.from([version]),
			      serializeScript(leaf.output),
			    ]),
			  );
			}
			exports$1.tapleafHash = tapleafHash;
			function tapTweakHash(pubKey, h) {
			  return bcrypto.taggedHash(
			    'TapTweak',
			    buffer_1.Buffer.concat(h ? [pubKey, h] : [pubKey]),
			  );
			}
			exports$1.tapTweakHash = tapTweakHash;
			function tweakKey(pubKey, h) {
			  if (!buffer_1.Buffer.isBuffer(pubKey)) return null;
			  if (pubKey.length !== 32) return null;
			  if (h && h.length !== 32) return null;
			  const tweakHash = tapTweakHash(pubKey, h);
			  const res = (0, ecc_lib_1.getEccLib)().xOnlyPointAddTweak(pubKey, tweakHash);
			  if (!res || res.xOnlyPubkey === null) return null;
			  return {
			    parity: res.parity,
			    x: buffer_1.Buffer.from(res.xOnlyPubkey),
			  };
			}
			exports$1.tweakKey = tweakKey;
			function tapBranchHash(a, b) {
			  return bcrypto.taggedHash('TapBranch', buffer_1.Buffer.concat([a, b]));
			}
			function serializeScript(s) {
			  const varintLen = bufferutils_1.varuint.encodingLength(s.length);
			  const buffer = buffer_1.Buffer.allocUnsafe(varintLen); // better
			  bufferutils_1.varuint.encode(s.length, buffer);
			  return buffer_1.Buffer.concat([buffer, s]);
			} 
		} (bip341));
		return bip341;
	}

	var hasRequiredP2tr;

	function requireP2tr () {
		if (hasRequiredP2tr) return p2tr;
		hasRequiredP2tr = 1;
		Object.defineProperty(p2tr, '__esModule', { value: true });
		p2tr.p2tr = void 0;
		const buffer_1 = requireBuffer();
		const networks_1 = requireNetworks();
		const bscript = requireScript();
		const types_1 = requireTypes();
		const ecc_lib_1 = requireEcc_lib();
		const bip341_1 = requireBip341();
		const lazy = requireLazy();
		const bech32_1 = requireDist$2();
		const address_1 = requireAddress();
		const OPS = bscript.OPS;
		const TAPROOT_WITNESS_VERSION = 0x01;
		const ANNEX_PREFIX = 0x50;
		/**
		 * Creates a Pay-to-Taproot (P2TR) payment object.
		 *
		 * @param a - The payment object containing the necessary data for P2TR.
		 * @param opts - Optional payment options.
		 * @returns The P2TR payment object.
		 * @throws {TypeError} If the provided data is invalid or insufficient.
		 */
		function p2tr$1(a, opts) {
		  if (
		    !a.address &&
		    !a.output &&
		    !a.pubkey &&
		    !a.internalPubkey &&
		    !(a.witness && a.witness.length > 1)
		  )
		    throw new TypeError('Not enough data');
		  opts = Object.assign({ validate: true }, opts || {});
		  (0, types_1.typeforce)(
		    {
		      address: types_1.typeforce.maybe(types_1.typeforce.String),
		      input: types_1.typeforce.maybe(types_1.typeforce.BufferN(0)),
		      network: types_1.typeforce.maybe(types_1.typeforce.Object),
		      output: types_1.typeforce.maybe(types_1.typeforce.BufferN(34)),
		      internalPubkey: types_1.typeforce.maybe(types_1.typeforce.BufferN(32)),
		      hash: types_1.typeforce.maybe(types_1.typeforce.BufferN(32)),
		      pubkey: types_1.typeforce.maybe(types_1.typeforce.BufferN(32)),
		      signature: types_1.typeforce.maybe(
		        types_1.typeforce.anyOf(
		          types_1.typeforce.BufferN(64),
		          types_1.typeforce.BufferN(65),
		        ),
		      ),
		      witness: types_1.typeforce.maybe(
		        types_1.typeforce.arrayOf(types_1.typeforce.Buffer),
		      ),
		      scriptTree: types_1.typeforce.maybe(types_1.isTaptree),
		      redeem: types_1.typeforce.maybe({
		        output: types_1.typeforce.maybe(types_1.typeforce.Buffer),
		        redeemVersion: types_1.typeforce.maybe(types_1.typeforce.Number),
		        witness: types_1.typeforce.maybe(
		          types_1.typeforce.arrayOf(types_1.typeforce.Buffer),
		        ),
		      }),
		      redeemVersion: types_1.typeforce.maybe(types_1.typeforce.Number),
		    },
		    a,
		  );
		  const _address = lazy.value(() => {
		    return (0, address_1.fromBech32)(a.address);
		  });
		  // remove annex if present, ignored by taproot
		  const _witness = lazy.value(() => {
		    if (!a.witness || !a.witness.length) return;
		    if (
		      a.witness.length >= 2 &&
		      a.witness[a.witness.length - 1][0] === ANNEX_PREFIX
		    ) {
		      return a.witness.slice(0, -1);
		    }
		    return a.witness.slice();
		  });
		  const _hashTree = lazy.value(() => {
		    if (a.scriptTree) return (0, bip341_1.toHashTree)(a.scriptTree);
		    if (a.hash) return { hash: a.hash };
		    return;
		  });
		  const network = a.network || networks_1.bitcoin;
		  const o = { name: 'p2tr', network };
		  lazy.prop(o, 'address', () => {
		    if (!o.pubkey) return;
		    const words = bech32_1.bech32m.toWords(o.pubkey);
		    words.unshift(TAPROOT_WITNESS_VERSION);
		    return bech32_1.bech32m.encode(network.bech32, words);
		  });
		  lazy.prop(o, 'hash', () => {
		    const hashTree = _hashTree();
		    if (hashTree) return hashTree.hash;
		    const w = _witness();
		    if (w && w.length > 1) {
		      const controlBlock = w[w.length - 1];
		      const leafVersion = controlBlock[0] & types_1.TAPLEAF_VERSION_MASK;
		      const script = w[w.length - 2];
		      const leafHash = (0, bip341_1.tapleafHash)({
		        output: script,
		        version: leafVersion,
		      });
		      return (0, bip341_1.rootHashFromPath)(controlBlock, leafHash);
		    }
		    return null;
		  });
		  lazy.prop(o, 'output', () => {
		    if (!o.pubkey) return;
		    return bscript.compile([OPS.OP_1, o.pubkey]);
		  });
		  lazy.prop(o, 'redeemVersion', () => {
		    if (a.redeemVersion) return a.redeemVersion;
		    if (
		      a.redeem &&
		      a.redeem.redeemVersion !== undefined &&
		      a.redeem.redeemVersion !== null
		    ) {
		      return a.redeem.redeemVersion;
		    }
		    return bip341_1.LEAF_VERSION_TAPSCRIPT;
		  });
		  lazy.prop(o, 'redeem', () => {
		    const witness = _witness(); // witness without annex
		    if (!witness || witness.length < 2) return;
		    return {
		      output: witness[witness.length - 2],
		      witness: witness.slice(0, -2),
		      redeemVersion:
		        witness[witness.length - 1][0] & types_1.TAPLEAF_VERSION_MASK,
		    };
		  });
		  lazy.prop(o, 'pubkey', () => {
		    if (a.pubkey) return a.pubkey;
		    if (a.output) return a.output.slice(2);
		    if (a.address) return _address().data;
		    if (o.internalPubkey) {
		      const tweakedKey = (0, bip341_1.tweakKey)(o.internalPubkey, o.hash);
		      if (tweakedKey) return tweakedKey.x;
		    }
		  });
		  lazy.prop(o, 'internalPubkey', () => {
		    if (a.internalPubkey) return a.internalPubkey;
		    const witness = _witness();
		    if (witness && witness.length > 1)
		      return witness[witness.length - 1].slice(1, 33);
		  });
		  lazy.prop(o, 'signature', () => {
		    if (a.signature) return a.signature;
		    const witness = _witness(); // witness without annex
		    if (!witness || witness.length !== 1) return;
		    return witness[0];
		  });
		  lazy.prop(o, 'witness', () => {
		    if (a.witness) return a.witness;
		    const hashTree = _hashTree();
		    if (hashTree && a.redeem && a.redeem.output && a.internalPubkey) {
		      const leafHash = (0, bip341_1.tapleafHash)({
		        output: a.redeem.output,
		        version: o.redeemVersion,
		      });
		      const path = (0, bip341_1.findScriptPath)(hashTree, leafHash);
		      if (!path) return;
		      const outputKey = (0, bip341_1.tweakKey)(a.internalPubkey, hashTree.hash);
		      if (!outputKey) return;
		      const controlBock = buffer_1.Buffer.concat(
		        [
		          buffer_1.Buffer.from([o.redeemVersion | outputKey.parity]),
		          a.internalPubkey,
		        ].concat(path),
		      );
		      return [a.redeem.output, controlBock];
		    }
		    if (a.signature) return [a.signature];
		  });
		  // extended validation
		  if (opts.validate) {
		    let pubkey = buffer_1.Buffer.from([]);
		    if (a.address) {
		      if (network && network.bech32 !== _address().prefix)
		        throw new TypeError('Invalid prefix or Network mismatch');
		      if (_address().version !== TAPROOT_WITNESS_VERSION)
		        throw new TypeError('Invalid address version');
		      if (_address().data.length !== 32)
		        throw new TypeError('Invalid address data');
		      pubkey = _address().data;
		    }
		    if (a.pubkey) {
		      if (pubkey.length > 0 && !pubkey.equals(a.pubkey))
		        throw new TypeError('Pubkey mismatch');
		      else pubkey = a.pubkey;
		    }
		    if (a.output) {
		      if (
		        a.output.length !== 34 ||
		        a.output[0] !== OPS.OP_1 ||
		        a.output[1] !== 0x20
		      )
		        throw new TypeError('Output is invalid');
		      if (pubkey.length > 0 && !pubkey.equals(a.output.slice(2)))
		        throw new TypeError('Pubkey mismatch');
		      else pubkey = a.output.slice(2);
		    }
		    if (a.internalPubkey) {
		      const tweakedKey = (0, bip341_1.tweakKey)(a.internalPubkey, o.hash);
		      if (pubkey.length > 0 && !pubkey.equals(tweakedKey.x))
		        throw new TypeError('Pubkey mismatch');
		      else pubkey = tweakedKey.x;
		    }
		    if (pubkey && pubkey.length) {
		      if (!(0, ecc_lib_1.getEccLib)().isXOnlyPoint(pubkey))
		        throw new TypeError('Invalid pubkey for p2tr');
		    }
		    const hashTree = _hashTree();
		    if (a.hash && hashTree) {
		      if (!a.hash.equals(hashTree.hash)) throw new TypeError('Hash mismatch');
		    }
		    if (a.redeem && a.redeem.output && hashTree) {
		      const leafHash = (0, bip341_1.tapleafHash)({
		        output: a.redeem.output,
		        version: o.redeemVersion,
		      });
		      if (!(0, bip341_1.findScriptPath)(hashTree, leafHash))
		        throw new TypeError('Redeem script not in tree');
		    }
		    const witness = _witness();
		    // compare the provided redeem data with the one computed from witness
		    if (a.redeem && o.redeem) {
		      if (a.redeem.redeemVersion) {
		        if (a.redeem.redeemVersion !== o.redeem.redeemVersion)
		          throw new TypeError('Redeem.redeemVersion and witness mismatch');
		      }
		      if (a.redeem.output) {
		        if (bscript.decompile(a.redeem.output).length === 0)
		          throw new TypeError('Redeem.output is invalid');
		        // output redeem is constructed from the witness
		        if (o.redeem.output && !a.redeem.output.equals(o.redeem.output))
		          throw new TypeError('Redeem.output and witness mismatch');
		      }
		      if (a.redeem.witness) {
		        if (
		          o.redeem.witness &&
		          !(0, types_1.stacksEqual)(a.redeem.witness, o.redeem.witness)
		        )
		          throw new TypeError('Redeem.witness and witness mismatch');
		      }
		    }
		    if (witness && witness.length) {
		      if (witness.length === 1) {
		        // key spending
		        if (a.signature && !a.signature.equals(witness[0]))
		          throw new TypeError('Signature mismatch');
		      } else {
		        // script path spending
		        const controlBlock = witness[witness.length - 1];
		        if (controlBlock.length < 33)
		          throw new TypeError(
		            `The control-block length is too small. Got ${controlBlock.length}, expected min 33.`,
		          );
		        if ((controlBlock.length - 33) % 32 !== 0)
		          throw new TypeError(
		            `The control-block length of ${controlBlock.length} is incorrect!`,
		          );
		        const m = (controlBlock.length - 33) / 32;
		        if (m > 128)
		          throw new TypeError(
		            `The script path is too long. Got ${m}, expected max 128.`,
		          );
		        const internalPubkey = controlBlock.slice(1, 33);
		        if (a.internalPubkey && !a.internalPubkey.equals(internalPubkey))
		          throw new TypeError('Internal pubkey mismatch');
		        if (!(0, ecc_lib_1.getEccLib)().isXOnlyPoint(internalPubkey))
		          throw new TypeError('Invalid internalPubkey for p2tr witness');
		        const leafVersion = controlBlock[0] & types_1.TAPLEAF_VERSION_MASK;
		        const script = witness[witness.length - 2];
		        const leafHash = (0, bip341_1.tapleafHash)({
		          output: script,
		          version: leafVersion,
		        });
		        const hash = (0, bip341_1.rootHashFromPath)(controlBlock, leafHash);
		        const outputKey = (0, bip341_1.tweakKey)(internalPubkey, hash);
		        if (!outputKey)
		          // todo: needs test data
		          throw new TypeError('Invalid outputKey for p2tr witness');
		        if (pubkey.length && !pubkey.equals(outputKey.x))
		          throw new TypeError('Pubkey mismatch for p2tr witness');
		        if (outputKey.parity !== (controlBlock[0] & 1))
		          throw new Error('Incorrect parity');
		      }
		    }
		  }
		  return Object.assign(o, a);
		}
		p2tr.p2tr = p2tr$1;
		return p2tr;
	}

	var hasRequiredPayments;

	function requirePayments () {
		if (hasRequiredPayments) return payments;
		hasRequiredPayments = 1;
		(function (exports$1) {
			Object.defineProperty(exports$1, '__esModule', { value: true });
			exports$1.p2tr =
			  exports$1.p2wsh =
			  exports$1.p2wpkh =
			  exports$1.p2sh =
			  exports$1.p2pkh =
			  exports$1.p2pk =
			  exports$1.p2ms =
			  exports$1.embed =
			    void 0;
			const embed_1 = requireEmbed();
			Object.defineProperty(exports$1, 'embed', {
			  enumerable: true,
			  get: function () {
			    return embed_1.p2data;
			  },
			});
			const p2ms_1 = requireP2ms();
			Object.defineProperty(exports$1, 'p2ms', {
			  enumerable: true,
			  get: function () {
			    return p2ms_1.p2ms;
			  },
			});
			const p2pk_1 = requireP2pk();
			Object.defineProperty(exports$1, 'p2pk', {
			  enumerable: true,
			  get: function () {
			    return p2pk_1.p2pk;
			  },
			});
			const p2pkh_1 = requireP2pkh();
			Object.defineProperty(exports$1, 'p2pkh', {
			  enumerable: true,
			  get: function () {
			    return p2pkh_1.p2pkh;
			  },
			});
			const p2sh_1 = requireP2sh();
			Object.defineProperty(exports$1, 'p2sh', {
			  enumerable: true,
			  get: function () {
			    return p2sh_1.p2sh;
			  },
			});
			const p2wpkh_1 = requireP2wpkh();
			Object.defineProperty(exports$1, 'p2wpkh', {
			  enumerable: true,
			  get: function () {
			    return p2wpkh_1.p2wpkh;
			  },
			});
			const p2wsh_1 = requireP2wsh();
			Object.defineProperty(exports$1, 'p2wsh', {
			  enumerable: true,
			  get: function () {
			    return p2wsh_1.p2wsh;
			  },
			});
			const p2tr_1 = requireP2tr();
			Object.defineProperty(exports$1, 'p2tr', {
			  enumerable: true,
			  get: function () {
			    return p2tr_1.p2tr;
			  },
			});
			// TODO
			// witness commitment 
		} (payments));
		return payments;
	}

	var hasRequiredAddress;

	function requireAddress () {
		if (hasRequiredAddress) return address;
		hasRequiredAddress = 1;
		Object.defineProperty(address, '__esModule', { value: true });
		address.toOutputScript =
		  address.fromOutputScript =
		  address.toBech32 =
		  address.toBase58Check =
		  address.fromBech32 =
		  address.fromBase58Check =
		    void 0;
		const networks = requireNetworks();
		const payments = requirePayments();
		const bscript = requireScript();
		const types_1 = requireTypes();
		const bech32_1 = requireDist$2();
		const bs58check = requireBs58check();
		const FUTURE_SEGWIT_MAX_SIZE = 40;
		const FUTURE_SEGWIT_MIN_SIZE = 2;
		const FUTURE_SEGWIT_MAX_VERSION = 16;
		const FUTURE_SEGWIT_MIN_VERSION = 2;
		const FUTURE_SEGWIT_VERSION_DIFF = 0x50;
		const FUTURE_SEGWIT_VERSION_WARNING =
		  'WARNING: Sending to a future segwit version address can lead to loss of funds. ' +
		  'End users MUST be warned carefully in the GUI and asked if they wish to proceed ' +
		  'with caution. Wallets should verify the segwit version from the output of fromBech32, ' +
		  'then decide when it is safe to use which version of segwit.';
		function _toFutureSegwitAddress(output, network) {
		  const data = output.slice(2);
		  if (
		    data.length < FUTURE_SEGWIT_MIN_SIZE ||
		    data.length > FUTURE_SEGWIT_MAX_SIZE
		  )
		    throw new TypeError('Invalid program length for segwit address');
		  const version = output[0] - FUTURE_SEGWIT_VERSION_DIFF;
		  if (
		    version < FUTURE_SEGWIT_MIN_VERSION ||
		    version > FUTURE_SEGWIT_MAX_VERSION
		  )
		    throw new TypeError('Invalid version for segwit address');
		  if (output[1] !== data.length)
		    throw new TypeError('Invalid script for segwit address');
		  console.warn(FUTURE_SEGWIT_VERSION_WARNING);
		  return toBech32(data, version, network.bech32);
		}
		/**
		 * decode address with base58 specification,  return address version and address hash if valid
		 */
		function fromBase58Check(address) {
		  const payload = bufferExports.Buffer.from(bs58check.decode(address));
		  // TODO: 4.0.0, move to "toOutputScript"
		  if (payload.length < 21) throw new TypeError(address + ' is too short');
		  if (payload.length > 21) throw new TypeError(address + ' is too long');
		  const version = payload.readUInt8(0);
		  const hash = payload.slice(1);
		  return { version, hash };
		}
		address.fromBase58Check = fromBase58Check;
		/**
		 * decode address with bech32 specification,  return address version、address prefix and address data if valid
		 */
		function fromBech32(address) {
		  let result;
		  let version;
		  try {
		    result = bech32_1.bech32.decode(address);
		  } catch (e) {}
		  if (result) {
		    version = result.words[0];
		    if (version !== 0) throw new TypeError(address + ' uses wrong encoding');
		  } else {
		    result = bech32_1.bech32m.decode(address);
		    version = result.words[0];
		    if (version === 0) throw new TypeError(address + ' uses wrong encoding');
		  }
		  const data = bech32_1.bech32.fromWords(result.words.slice(1));
		  return {
		    version,
		    prefix: result.prefix,
		    data: bufferExports.Buffer.from(data),
		  };
		}
		address.fromBech32 = fromBech32;
		/**
		 * encode address hash to base58 address with version
		 */
		function toBase58Check(hash, version) {
		  (0, types_1.typeforce)(
		    (0, types_1.tuple)(types_1.Hash160bit, types_1.UInt8),
		    arguments,
		  );
		  const payload = bufferExports.Buffer.allocUnsafe(21);
		  payload.writeUInt8(version, 0);
		  hash.copy(payload, 1);
		  return bs58check.encode(payload);
		}
		address.toBase58Check = toBase58Check;
		/**
		 * encode address hash to bech32 address with version and prefix
		 */
		function toBech32(data, version, prefix) {
		  const words = bech32_1.bech32.toWords(data);
		  words.unshift(version);
		  return version === 0
		    ? bech32_1.bech32.encode(prefix, words)
		    : bech32_1.bech32m.encode(prefix, words);
		}
		address.toBech32 = toBech32;
		/**
		 * decode address from output script with network, return address if matched
		 */
		function fromOutputScript(output, network) {
		  // TODO: Network
		  network = network || networks.bitcoin;
		  try {
		    return payments.p2pkh({ output, network }).address;
		  } catch (e) {}
		  try {
		    return payments.p2sh({ output, network }).address;
		  } catch (e) {}
		  try {
		    return payments.p2wpkh({ output, network }).address;
		  } catch (e) {}
		  try {
		    return payments.p2wsh({ output, network }).address;
		  } catch (e) {}
		  try {
		    return payments.p2tr({ output, network }).address;
		  } catch (e) {}
		  try {
		    return _toFutureSegwitAddress(output, network);
		  } catch (e) {}
		  throw new Error(bscript.toASM(output) + ' has no matching Address');
		}
		address.fromOutputScript = fromOutputScript;
		/**
		 * encodes address to output script with network, return output script if address matched
		 */
		function toOutputScript(address, network) {
		  network = network || networks.bitcoin;
		  let decodeBase58;
		  let decodeBech32;
		  try {
		    decodeBase58 = fromBase58Check(address);
		  } catch (e) {}
		  if (decodeBase58) {
		    if (decodeBase58.version === network.pubKeyHash)
		      return payments.p2pkh({ hash: decodeBase58.hash }).output;
		    if (decodeBase58.version === network.scriptHash)
		      return payments.p2sh({ hash: decodeBase58.hash }).output;
		  } else {
		    try {
		      decodeBech32 = fromBech32(address);
		    } catch (e) {}
		    if (decodeBech32) {
		      if (decodeBech32.prefix !== network.bech32)
		        throw new Error(address + ' has an invalid prefix');
		      if (decodeBech32.version === 0) {
		        if (decodeBech32.data.length === 20)
		          return payments.p2wpkh({ hash: decodeBech32.data }).output;
		        if (decodeBech32.data.length === 32)
		          return payments.p2wsh({ hash: decodeBech32.data }).output;
		      } else if (decodeBech32.version === 1) {
		        if (decodeBech32.data.length === 32)
		          return payments.p2tr({ pubkey: decodeBech32.data }).output;
		      } else if (
		        decodeBech32.version >= FUTURE_SEGWIT_MIN_VERSION &&
		        decodeBech32.version <= FUTURE_SEGWIT_MAX_VERSION &&
		        decodeBech32.data.length >= FUTURE_SEGWIT_MIN_SIZE &&
		        decodeBech32.data.length <= FUTURE_SEGWIT_MAX_SIZE
		      ) {
		        console.warn(FUTURE_SEGWIT_VERSION_WARNING);
		        return bscript.compile([
		          decodeBech32.version + FUTURE_SEGWIT_VERSION_DIFF,
		          decodeBech32.data,
		        ]);
		      }
		    }
		  }
		  throw new Error(address + ' has no matching Script');
		}
		address.toOutputScript = toOutputScript;
		return address;
	}

	var block = {};

	var merkle = {};

	var hasRequiredMerkle;

	function requireMerkle () {
		if (hasRequiredMerkle) return merkle;
		hasRequiredMerkle = 1;
		Object.defineProperty(merkle, '__esModule', { value: true });
		merkle.fastMerkleRoot = void 0;
		/**
		 * Calculates the Merkle root of an array of buffers using a specified digest function.
		 *
		 * @param values - The array of buffers.
		 * @param digestFn - The digest function used to calculate the hash of the concatenated buffers.
		 * @returns The Merkle root as a buffer.
		 * @throws {TypeError} If the values parameter is not an array or the digestFn parameter is not a function.
		 */
		function fastMerkleRoot(values, digestFn) {
		  if (!Array.isArray(values)) throw TypeError('Expected values Array');
		  if (typeof digestFn !== 'function')
		    throw TypeError('Expected digest Function');
		  let length = values.length;
		  const results = values.concat();
		  while (length > 1) {
		    let j = 0;
		    for (let i = 0; i < length; i += 2, ++j) {
		      const left = results[i];
		      const right = i + 1 === length ? left : results[i + 1];
		      const data = bufferExports.Buffer.concat([left, right]);
		      results[j] = digestFn(data);
		    }
		    length = j;
		  }
		  return results[0];
		}
		merkle.fastMerkleRoot = fastMerkleRoot;
		return merkle;
	}

	var transaction = {};

	var hasRequiredTransaction;

	function requireTransaction () {
		if (hasRequiredTransaction) return transaction;
		hasRequiredTransaction = 1;
		Object.defineProperty(transaction, '__esModule', { value: true });
		transaction.Transaction = void 0;
		const bufferutils_1 = requireBufferutils();
		const bcrypto = requireCrypto();
		const bscript = requireScript();
		const script_1 = requireScript();
		const types = requireTypes();
		const { typeforce } = types;
		function varSliceSize(someScript) {
		  const length = someScript.length;
		  return bufferutils_1.varuint.encodingLength(length) + length;
		}
		function vectorSize(someVector) {
		  const length = someVector.length;
		  return (
		    bufferutils_1.varuint.encodingLength(length) +
		    someVector.reduce((sum, witness) => {
		      return sum + varSliceSize(witness);
		    }, 0)
		  );
		}
		const EMPTY_BUFFER = bufferExports.Buffer.allocUnsafe(0);
		const EMPTY_WITNESS = [];
		const ZERO = bufferExports.Buffer.from(
		  '0000000000000000000000000000000000000000000000000000000000000000',
		  'hex',
		);
		const ONE = bufferExports.Buffer.from(
		  '0000000000000000000000000000000000000000000000000000000000000001',
		  'hex',
		);
		const VALUE_UINT64_MAX = bufferExports.Buffer.from('ffffffffffffffff', 'hex');
		const BLANK_OUTPUT = {
		  script: EMPTY_BUFFER,
		  valueBuffer: VALUE_UINT64_MAX,
		};
		function isOutput(out) {
		  return out.value !== undefined;
		}
		/**
		 * Represents a Bitcoin transaction.
		 */
		class Transaction {
		  constructor() {
		    this.version = 1;
		    this.locktime = 0;
		    this.ins = [];
		    this.outs = [];
		  }
		  static fromBuffer(buffer, _NO_STRICT) {
		    const bufferReader = new bufferutils_1.BufferReader(buffer);
		    const tx = new Transaction();
		    tx.version = bufferReader.readInt32();
		    const marker = bufferReader.readUInt8();
		    const flag = bufferReader.readUInt8();
		    let hasWitnesses = false;
		    if (
		      marker === Transaction.ADVANCED_TRANSACTION_MARKER &&
		      flag === Transaction.ADVANCED_TRANSACTION_FLAG
		    ) {
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
		        witness: EMPTY_WITNESS,
		      });
		    }
		    const voutLen = bufferReader.readVarInt();
		    for (let i = 0; i < voutLen; ++i) {
		      tx.outs.push({
		        value: bufferReader.readUInt64(),
		        script: bufferReader.readVarSlice(),
		      });
		    }
		    if (hasWitnesses) {
		      for (let i = 0; i < vinLen; ++i) {
		        tx.ins[i].witness = bufferReader.readVector();
		      }
		      // was this pointless?
		      if (!tx.hasWitnesses())
		        throw new Error('Transaction has superfluous witness data');
		    }
		    tx.locktime = bufferReader.readUInt32();
		    if (_NO_STRICT) return tx;
		    if (bufferReader.offset !== buffer.length)
		      throw new Error('Transaction has unexpected data');
		    return tx;
		  }
		  static fromHex(hex) {
		    return Transaction.fromBuffer(bufferExports.Buffer.from(hex, 'hex'), false);
		  }
		  static isCoinbaseHash(buffer) {
		    typeforce(types.Hash256bit, buffer);
		    for (let i = 0; i < 32; ++i) {
		      if (buffer[i] !== 0) return false;
		    }
		    return true;
		  }
		  isCoinbase() {
		    return (
		      this.ins.length === 1 && Transaction.isCoinbaseHash(this.ins[0].hash)
		    );
		  }
		  addInput(hash, index, sequence, scriptSig) {
		    typeforce(
		      types.tuple(
		        types.Hash256bit,
		        types.UInt32,
		        types.maybe(types.UInt32),
		        types.maybe(types.Buffer),
		      ),
		      arguments,
		    );
		    if (types.Null(sequence)) {
		      sequence = Transaction.DEFAULT_SEQUENCE;
		    }
		    // Add the input and return the input's index
		    return (
		      this.ins.push({
		        hash,
		        index,
		        script: scriptSig || EMPTY_BUFFER,
		        sequence: sequence,
		        witness: EMPTY_WITNESS,
		      }) - 1
		    );
		  }
		  addOutput(scriptPubKey, value) {
		    typeforce(types.tuple(types.Buffer, types.Satoshi), arguments);
		    // Add the output and return the output's index
		    return (
		      this.outs.push({
		        script: scriptPubKey,
		        value,
		      }) - 1
		    );
		  }
		  hasWitnesses() {
		    return this.ins.some(x => {
		      return x.witness.length !== 0;
		    });
		  }
		  stripWitnesses() {
		    this.ins.forEach(input => {
		      input.witness = EMPTY_WITNESS; // Set witness data to an empty array
		    });
		  }
		  weight() {
		    const base = this.byteLength(false);
		    const total = this.byteLength(true);
		    return base * 3 + total;
		  }
		  virtualSize() {
		    return Math.ceil(this.weight() / 4);
		  }
		  byteLength(_ALLOW_WITNESS = true) {
		    const hasWitnesses = _ALLOW_WITNESS && this.hasWitnesses();
		    return (
		      (hasWitnesses ? 10 : 8) +
		      bufferutils_1.varuint.encodingLength(this.ins.length) +
		      bufferutils_1.varuint.encodingLength(this.outs.length) +
		      this.ins.reduce((sum, input) => {
		        return sum + 40 + varSliceSize(input.script);
		      }, 0) +
		      this.outs.reduce((sum, output) => {
		        return sum + 8 + varSliceSize(output.script);
		      }, 0) +
		      (hasWitnesses
		        ? this.ins.reduce((sum, input) => {
		            return sum + vectorSize(input.witness);
		          }, 0)
		        : 0)
		    );
		  }
		  clone() {
		    const newTx = new Transaction();
		    newTx.version = this.version;
		    newTx.locktime = this.locktime;
		    newTx.ins = this.ins.map(txIn => {
		      return {
		        hash: txIn.hash,
		        index: txIn.index,
		        script: txIn.script,
		        sequence: txIn.sequence,
		        witness: txIn.witness,
		      };
		    });
		    newTx.outs = this.outs.map(txOut => {
		      return {
		        script: txOut.script,
		        value: txOut.value,
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
		    typeforce(
		      types.tuple(types.UInt32, types.Buffer, /* types.UInt8 */ types.Number),
		      arguments,
		    );
		    // https://github.com/bitcoin/bitcoin/blob/master/src/test/sighash_tests.cpp#L29
		    if (inIndex >= this.ins.length) return ONE;
		    // ignore OP_CODESEPARATOR
		    const ourScript = bscript.compile(
		      bscript.decompile(prevOutScript).filter(x => {
		        return x !== script_1.OPS.OP_CODESEPARATOR;
		      }),
		    );
		    const txTmp = this.clone();
		    // SIGHASH_NONE: ignore all outputs? (wildcard payee)
		    if ((hashType & 0x1f) === Transaction.SIGHASH_NONE) {
		      txTmp.outs = [];
		      // ignore sequence numbers (except at inIndex)
		      txTmp.ins.forEach((input, i) => {
		        if (i === inIndex) return;
		        input.sequence = 0;
		      });
		      // SIGHASH_SINGLE: ignore all outputs, except at the same index?
		    } else if ((hashType & 0x1f) === Transaction.SIGHASH_SINGLE) {
		      // https://github.com/bitcoin/bitcoin/blob/master/src/test/sighash_tests.cpp#L60
		      if (inIndex >= this.outs.length) return ONE;
		      // truncate outputs after
		      txTmp.outs.length = inIndex + 1;
		      // "blank" outputs before
		      for (let i = 0; i < inIndex; i++) {
		        txTmp.outs[i] = BLANK_OUTPUT;
		      }
		      // ignore sequence numbers (except at inIndex)
		      txTmp.ins.forEach((input, y) => {
		        if (y === inIndex) return;
		        input.sequence = 0;
		      });
		    }
		    // SIGHASH_ANYONECANPAY: ignore inputs entirely?
		    if (hashType & Transaction.SIGHASH_ANYONECANPAY) {
		      txTmp.ins = [txTmp.ins[inIndex]];
		      txTmp.ins[0].script = ourScript;
		      // SIGHASH_ALL: only ignore input scripts
		    } else {
		      // "blank" others input scripts
		      txTmp.ins.forEach(input => {
		        input.script = EMPTY_BUFFER;
		      });
		      txTmp.ins[inIndex].script = ourScript;
		    }
		    // serialize and hash
		    const buffer = bufferExports.Buffer.allocUnsafe(txTmp.byteLength(false) + 4);
		    buffer.writeInt32LE(hashType, buffer.length - 4);
		    txTmp.__toBuffer(buffer, 0, false);
		    return bcrypto.hash256(buffer);
		  }
		  hashForWitnessV1(inIndex, prevOutScripts, values, hashType, leafHash, annex) {
		    // https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki#common-signature-message
		    typeforce(
		      types.tuple(
		        types.UInt32,
		        typeforce.arrayOf(types.Buffer),
		        typeforce.arrayOf(types.Satoshi),
		        types.UInt32,
		      ),
		      arguments,
		    );
		    if (
		      values.length !== this.ins.length ||
		      prevOutScripts.length !== this.ins.length
		    ) {
		      throw new Error('Must supply prevout script and value for all inputs');
		    }
		    const outputType =
		      hashType === Transaction.SIGHASH_DEFAULT
		        ? Transaction.SIGHASH_ALL
		        : hashType & Transaction.SIGHASH_OUTPUT_MASK;
		    const inputType = hashType & Transaction.SIGHASH_INPUT_MASK;
		    const isAnyoneCanPay = inputType === Transaction.SIGHASH_ANYONECANPAY;
		    const isNone = outputType === Transaction.SIGHASH_NONE;
		    const isSingle = outputType === Transaction.SIGHASH_SINGLE;
		    let hashPrevouts = EMPTY_BUFFER;
		    let hashAmounts = EMPTY_BUFFER;
		    let hashScriptPubKeys = EMPTY_BUFFER;
		    let hashSequences = EMPTY_BUFFER;
		    let hashOutputs = EMPTY_BUFFER;
		    if (!isAnyoneCanPay) {
		      let bufferWriter = bufferutils_1.BufferWriter.withCapacity(
		        36 * this.ins.length,
		      );
		      this.ins.forEach(txIn => {
		        bufferWriter.writeSlice(txIn.hash);
		        bufferWriter.writeUInt32(txIn.index);
		      });
		      hashPrevouts = bcrypto.sha256(bufferWriter.end());
		      bufferWriter = bufferutils_1.BufferWriter.withCapacity(
		        8 * this.ins.length,
		      );
		      values.forEach(value => bufferWriter.writeUInt64(value));
		      hashAmounts = bcrypto.sha256(bufferWriter.end());
		      bufferWriter = bufferutils_1.BufferWriter.withCapacity(
		        prevOutScripts.map(varSliceSize).reduce((a, b) => a + b),
		      );
		      prevOutScripts.forEach(prevOutScript =>
		        bufferWriter.writeVarSlice(prevOutScript),
		      );
		      hashScriptPubKeys = bcrypto.sha256(bufferWriter.end());
		      bufferWriter = bufferutils_1.BufferWriter.withCapacity(
		        4 * this.ins.length,
		      );
		      this.ins.forEach(txIn => bufferWriter.writeUInt32(txIn.sequence));
		      hashSequences = bcrypto.sha256(bufferWriter.end());
		    }
		    if (!(isNone || isSingle)) {
		      const txOutsSize = this.outs
		        .map(output => 8 + varSliceSize(output.script))
		        .reduce((a, b) => a + b);
		      const bufferWriter = bufferutils_1.BufferWriter.withCapacity(txOutsSize);
		      this.outs.forEach(out => {
		        bufferWriter.writeUInt64(out.value);
		        bufferWriter.writeVarSlice(out.script);
		      });
		      hashOutputs = bcrypto.sha256(bufferWriter.end());
		    } else if (isSingle && inIndex < this.outs.length) {
		      const output = this.outs[inIndex];
		      const bufferWriter = bufferutils_1.BufferWriter.withCapacity(
		        8 + varSliceSize(output.script),
		      );
		      bufferWriter.writeUInt64(output.value);
		      bufferWriter.writeVarSlice(output.script);
		      hashOutputs = bcrypto.sha256(bufferWriter.end());
		    }
		    const spendType = (leafHash ? 2 : 0) + (annex ? 1 : 0);
		    // Length calculation from:
		    // https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki#cite_note-14
		    // With extension from:
		    // https://github.com/bitcoin/bips/blob/master/bip-0342.mediawiki#signature-validation
		    const sigMsgSize =
		      174 -
		      (isAnyoneCanPay ? 49 : 0) -
		      (isNone ? 32 : 0) +
		      (annex ? 32 : 0) +
		      (leafHash ? 37 : 0);
		    const sigMsgWriter = bufferutils_1.BufferWriter.withCapacity(sigMsgSize);
		    sigMsgWriter.writeUInt8(hashType);
		    // Transaction
		    sigMsgWriter.writeInt32(this.version);
		    sigMsgWriter.writeUInt32(this.locktime);
		    sigMsgWriter.writeSlice(hashPrevouts);
		    sigMsgWriter.writeSlice(hashAmounts);
		    sigMsgWriter.writeSlice(hashScriptPubKeys);
		    sigMsgWriter.writeSlice(hashSequences);
		    if (!(isNone || isSingle)) {
		      sigMsgWriter.writeSlice(hashOutputs);
		    }
		    // Input
		    sigMsgWriter.writeUInt8(spendType);
		    if (isAnyoneCanPay) {
		      const input = this.ins[inIndex];
		      sigMsgWriter.writeSlice(input.hash);
		      sigMsgWriter.writeUInt32(input.index);
		      sigMsgWriter.writeUInt64(values[inIndex]);
		      sigMsgWriter.writeVarSlice(prevOutScripts[inIndex]);
		      sigMsgWriter.writeUInt32(input.sequence);
		    } else {
		      sigMsgWriter.writeUInt32(inIndex);
		    }
		    if (annex) {
		      const bufferWriter = bufferutils_1.BufferWriter.withCapacity(
		        varSliceSize(annex),
		      );
		      bufferWriter.writeVarSlice(annex);
		      sigMsgWriter.writeSlice(bcrypto.sha256(bufferWriter.end()));
		    }
		    // Output
		    if (isSingle) {
		      sigMsgWriter.writeSlice(hashOutputs);
		    }
		    // BIP342 extension
		    if (leafHash) {
		      sigMsgWriter.writeSlice(leafHash);
		      sigMsgWriter.writeUInt8(0);
		      sigMsgWriter.writeUInt32(0xffffffff);
		    }
		    // Extra zero byte because:
		    // https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki#cite_note-19
		    return bcrypto.taggedHash(
		      'TapSighash',
		      bufferExports.Buffer.concat([bufferExports.Buffer.from([0x00]), sigMsgWriter.end()]),
		    );
		  }
		  hashForWitnessV0(inIndex, prevOutScript, value, hashType) {
		    typeforce(
		      types.tuple(types.UInt32, types.Buffer, types.Satoshi, types.UInt32),
		      arguments,
		    );
		    let tbuffer = bufferExports.Buffer.from([]);
		    let bufferWriter;
		    let hashOutputs = ZERO;
		    let hashPrevouts = ZERO;
		    let hashSequence = ZERO;
		    if (!(hashType & Transaction.SIGHASH_ANYONECANPAY)) {
		      tbuffer = bufferExports.Buffer.allocUnsafe(36 * this.ins.length);
		      bufferWriter = new bufferutils_1.BufferWriter(tbuffer, 0);
		      this.ins.forEach(txIn => {
		        bufferWriter.writeSlice(txIn.hash);
		        bufferWriter.writeUInt32(txIn.index);
		      });
		      hashPrevouts = bcrypto.hash256(tbuffer);
		    }
		    if (
		      !(hashType & Transaction.SIGHASH_ANYONECANPAY) &&
		      (hashType & 0x1f) !== Transaction.SIGHASH_SINGLE &&
		      (hashType & 0x1f) !== Transaction.SIGHASH_NONE
		    ) {
		      tbuffer = bufferExports.Buffer.allocUnsafe(4 * this.ins.length);
		      bufferWriter = new bufferutils_1.BufferWriter(tbuffer, 0);
		      this.ins.forEach(txIn => {
		        bufferWriter.writeUInt32(txIn.sequence);
		      });
		      hashSequence = bcrypto.hash256(tbuffer);
		    }
		    if (
		      (hashType & 0x1f) !== Transaction.SIGHASH_SINGLE &&
		      (hashType & 0x1f) !== Transaction.SIGHASH_NONE
		    ) {
		      const txOutsSize = this.outs.reduce((sum, output) => {
		        return sum + 8 + varSliceSize(output.script);
		      }, 0);
		      tbuffer = bufferExports.Buffer.allocUnsafe(txOutsSize);
		      bufferWriter = new bufferutils_1.BufferWriter(tbuffer, 0);
		      this.outs.forEach(out => {
		        bufferWriter.writeUInt64(out.value);
		        bufferWriter.writeVarSlice(out.script);
		      });
		      hashOutputs = bcrypto.hash256(tbuffer);
		    } else if (
		      (hashType & 0x1f) === Transaction.SIGHASH_SINGLE &&
		      inIndex < this.outs.length
		    ) {
		      const output = this.outs[inIndex];
		      tbuffer = bufferExports.Buffer.allocUnsafe(8 + varSliceSize(output.script));
		      bufferWriter = new bufferutils_1.BufferWriter(tbuffer, 0);
		      bufferWriter.writeUInt64(output.value);
		      bufferWriter.writeVarSlice(output.script);
		      hashOutputs = bcrypto.hash256(tbuffer);
		    }
		    tbuffer = bufferExports.Buffer.allocUnsafe(156 + varSliceSize(prevOutScript));
		    bufferWriter = new bufferutils_1.BufferWriter(tbuffer, 0);
		    const input = this.ins[inIndex];
		    bufferWriter.writeInt32(this.version);
		    bufferWriter.writeSlice(hashPrevouts);
		    bufferWriter.writeSlice(hashSequence);
		    bufferWriter.writeSlice(input.hash);
		    bufferWriter.writeUInt32(input.index);
		    bufferWriter.writeVarSlice(prevOutScript);
		    bufferWriter.writeUInt64(value);
		    bufferWriter.writeUInt32(input.sequence);
		    bufferWriter.writeSlice(hashOutputs);
		    bufferWriter.writeUInt32(this.locktime);
		    bufferWriter.writeUInt32(hashType);
		    return bcrypto.hash256(tbuffer);
		  }
		  getHash(forWitness) {
		    // wtxid for coinbase is always 32 bytes of 0x00
		    if (forWitness && this.isCoinbase()) return bufferExports.Buffer.alloc(32, 0);
		    return bcrypto.hash256(this.__toBuffer(undefined, undefined, forWitness));
		  }
		  getId() {
		    // transaction hash's are displayed in reverse order
		    return (0, bufferutils_1.reverseBuffer)(this.getHash(false)).toString(
		      'hex',
		    );
		  }
		  toBuffer(buffer, initialOffset) {
		    return this.__toBuffer(buffer, initialOffset, true);
		  }
		  toHex() {
		    return this.toBuffer(undefined, undefined).toString('hex');
		  }
		  setInputScript(index, scriptSig) {
		    typeforce(types.tuple(types.Number, types.Buffer), arguments);
		    this.ins[index].script = scriptSig;
		  }
		  setWitness(index, witness) {
		    typeforce(types.tuple(types.Number, [types.Buffer]), arguments);
		    this.ins[index].witness = witness;
		  }
		  __toBuffer(buffer, initialOffset, _ALLOW_WITNESS = false) {
		    if (!buffer) buffer = bufferExports.Buffer.allocUnsafe(this.byteLength(_ALLOW_WITNESS));
		    const bufferWriter = new bufferutils_1.BufferWriter(
		      buffer,
		      initialOffset || 0,
		    );
		    bufferWriter.writeInt32(this.version);
		    const hasWitnesses = _ALLOW_WITNESS && this.hasWitnesses();
		    if (hasWitnesses) {
		      bufferWriter.writeUInt8(Transaction.ADVANCED_TRANSACTION_MARKER);
		      bufferWriter.writeUInt8(Transaction.ADVANCED_TRANSACTION_FLAG);
		    }
		    bufferWriter.writeVarInt(this.ins.length);
		    this.ins.forEach(txIn => {
		      bufferWriter.writeSlice(txIn.hash);
		      bufferWriter.writeUInt32(txIn.index);
		      bufferWriter.writeVarSlice(txIn.script);
		      bufferWriter.writeUInt32(txIn.sequence);
		    });
		    bufferWriter.writeVarInt(this.outs.length);
		    this.outs.forEach(txOut => {
		      if (isOutput(txOut)) {
		        bufferWriter.writeUInt64(txOut.value);
		      } else {
		        bufferWriter.writeSlice(txOut.valueBuffer);
		      }
		      bufferWriter.writeVarSlice(txOut.script);
		    });
		    if (hasWitnesses) {
		      this.ins.forEach(input => {
		        bufferWriter.writeVector(input.witness);
		      });
		    }
		    bufferWriter.writeUInt32(this.locktime);
		    // avoid slicing unless necessary
		    if (initialOffset !== undefined)
		      return buffer.slice(initialOffset, bufferWriter.offset);
		    return buffer;
		  }
		}
		transaction.Transaction = Transaction;
		Transaction.DEFAULT_SEQUENCE = 0xffffffff;
		Transaction.SIGHASH_DEFAULT = 0x00;
		Transaction.SIGHASH_ALL = 0x01;
		Transaction.SIGHASH_NONE = 0x02;
		Transaction.SIGHASH_SINGLE = 0x03;
		Transaction.SIGHASH_ANYONECANPAY = 0x80;
		Transaction.SIGHASH_OUTPUT_MASK = 0x03;
		Transaction.SIGHASH_INPUT_MASK = 0x80;
		Transaction.ADVANCED_TRANSACTION_MARKER = 0x00;
		Transaction.ADVANCED_TRANSACTION_FLAG = 0x01;
		return transaction;
	}

	var hasRequiredBlock;

	function requireBlock () {
		if (hasRequiredBlock) return block;
		hasRequiredBlock = 1;
		Object.defineProperty(block, '__esModule', { value: true });
		block.Block = void 0;
		const bufferutils_1 = requireBufferutils();
		const bcrypto = requireCrypto();
		const merkle_1 = requireMerkle();
		const transaction_1 = requireTransaction();
		const types = requireTypes();
		const { typeforce } = types;
		const errorMerkleNoTxes = new TypeError(
		  'Cannot compute merkle root for zero transactions',
		);
		const errorWitnessNotSegwit = new TypeError(
		  'Cannot compute witness commit for non-segwit block',
		);
		class Block {
		  constructor() {
		    this.version = 1;
		    this.prevHash = undefined;
		    this.merkleRoot = undefined;
		    this.timestamp = 0;
		    this.witnessCommit = undefined;
		    this.bits = 0;
		    this.nonce = 0;
		    this.transactions = undefined;
		  }
		  static fromBuffer(buffer) {
		    if (buffer.length < 80) throw new Error('Buffer too small (< 80 bytes)');
		    const bufferReader = new bufferutils_1.BufferReader(buffer);
		    const block = new Block();
		    block.version = bufferReader.readInt32();
		    block.prevHash = bufferReader.readSlice(32);
		    block.merkleRoot = bufferReader.readSlice(32);
		    block.timestamp = bufferReader.readUInt32();
		    block.bits = bufferReader.readUInt32();
		    block.nonce = bufferReader.readUInt32();
		    if (buffer.length === 80) return block;
		    const readTransaction = () => {
		      const tx = transaction_1.Transaction.fromBuffer(
		        bufferReader.buffer.slice(bufferReader.offset),
		        true,
		      );
		      bufferReader.offset += tx.byteLength();
		      return tx;
		    };
		    const nTransactions = bufferReader.readVarInt();
		    block.transactions = [];
		    for (let i = 0; i < nTransactions; ++i) {
		      const tx = readTransaction();
		      block.transactions.push(tx);
		    }
		    const witnessCommit = block.getWitnessCommit();
		    // This Block contains a witness commit
		    if (witnessCommit) block.witnessCommit = witnessCommit;
		    return block;
		  }
		  static fromHex(hex) {
		    return Block.fromBuffer(bufferExports.Buffer.from(hex, 'hex'));
		  }
		  static calculateTarget(bits) {
		    const exponent = ((bits & 0xff000000) >> 24) - 3;
		    const mantissa = bits & 0x007fffff;
		    const target = bufferExports.Buffer.alloc(32, 0);
		    target.writeUIntBE(mantissa, 29 - exponent, 3);
		    return target;
		  }
		  static calculateMerkleRoot(transactions, forWitness) {
		    typeforce([{ getHash: types.Function }], transactions);
		    if (transactions.length === 0) throw errorMerkleNoTxes;
		    if (forWitness && !txesHaveWitnessCommit(transactions))
		      throw errorWitnessNotSegwit;
		    const hashes = transactions.map(transaction =>
		      transaction.getHash(forWitness),
		    );
		    const rootHash = (0, merkle_1.fastMerkleRoot)(hashes, bcrypto.hash256);
		    return forWitness
		      ? bcrypto.hash256(
		          bufferExports.Buffer.concat([rootHash, transactions[0].ins[0].witness[0]]),
		        )
		      : rootHash;
		  }
		  getWitnessCommit() {
		    if (!txesHaveWitnessCommit(this.transactions)) return null;
		    // The merkle root for the witness data is in an OP_RETURN output.
		    // There is no rule for the index of the output, so use filter to find it.
		    // The root is prepended with 0xaa21a9ed so check for 0x6a24aa21a9ed
		    // If multiple commits are found, the output with highest index is assumed.
		    const witnessCommits = this.transactions[0].outs
		      .filter(out =>
		        out.script.slice(0, 6).equals(bufferExports.Buffer.from('6a24aa21a9ed', 'hex')),
		      )
		      .map(out => out.script.slice(6, 38));
		    if (witnessCommits.length === 0) return null;
		    // Use the commit with the highest output (should only be one though)
		    const result = witnessCommits[witnessCommits.length - 1];
		    if (!(result instanceof bufferExports.Buffer && result.length === 32)) return null;
		    return result;
		  }
		  hasWitnessCommit() {
		    if (
		      this.witnessCommit instanceof bufferExports.Buffer &&
		      this.witnessCommit.length === 32
		    )
		      return true;
		    if (this.getWitnessCommit() !== null) return true;
		    return false;
		  }
		  hasWitness() {
		    return anyTxHasWitness(this.transactions);
		  }
		  weight() {
		    const base = this.byteLength(false, false);
		    const total = this.byteLength(false, true);
		    return base * 3 + total;
		  }
		  byteLength(headersOnly, allowWitness = true) {
		    if (headersOnly || !this.transactions) return 80;
		    return (
		      80 +
		      bufferutils_1.varuint.encodingLength(this.transactions.length) +
		      this.transactions.reduce((a, x) => a + x.byteLength(allowWitness), 0)
		    );
		  }
		  getHash() {
		    return bcrypto.hash256(this.toBuffer(true));
		  }
		  getId() {
		    return (0, bufferutils_1.reverseBuffer)(this.getHash()).toString('hex');
		  }
		  getUTCDate() {
		    const date = new Date(0); // epoch
		    date.setUTCSeconds(this.timestamp);
		    return date;
		  }
		  // TODO: buffer, offset compatibility
		  toBuffer(headersOnly) {
		    const buffer = bufferExports.Buffer.allocUnsafe(this.byteLength(headersOnly));
		    const bufferWriter = new bufferutils_1.BufferWriter(buffer);
		    bufferWriter.writeInt32(this.version);
		    bufferWriter.writeSlice(this.prevHash);
		    bufferWriter.writeSlice(this.merkleRoot);
		    bufferWriter.writeUInt32(this.timestamp);
		    bufferWriter.writeUInt32(this.bits);
		    bufferWriter.writeUInt32(this.nonce);
		    if (headersOnly || !this.transactions) return buffer;
		    bufferutils_1.varuint.encode(
		      this.transactions.length,
		      buffer,
		      bufferWriter.offset,
		    );
		    bufferWriter.offset += bufferutils_1.varuint.encode.bytes;
		    this.transactions.forEach(tx => {
		      const txSize = tx.byteLength(); // TODO: extract from toBuffer?
		      tx.toBuffer(buffer, bufferWriter.offset);
		      bufferWriter.offset += txSize;
		    });
		    return buffer;
		  }
		  toHex(headersOnly) {
		    return this.toBuffer(headersOnly).toString('hex');
		  }
		  checkTxRoots() {
		    // If the Block has segwit transactions but no witness commit,
		    // there's no way it can be valid, so fail the check.
		    const hasWitnessCommit = this.hasWitnessCommit();
		    if (!hasWitnessCommit && this.hasWitness()) return false;
		    return (
		      this.__checkMerkleRoot() &&
		      (hasWitnessCommit ? this.__checkWitnessCommit() : true)
		    );
		  }
		  checkProofOfWork() {
		    const hash = (0, bufferutils_1.reverseBuffer)(this.getHash());
		    const target = Block.calculateTarget(this.bits);
		    return hash.compare(target) <= 0;
		  }
		  __checkMerkleRoot() {
		    if (!this.transactions) throw errorMerkleNoTxes;
		    const actualMerkleRoot = Block.calculateMerkleRoot(this.transactions);
		    return this.merkleRoot.compare(actualMerkleRoot) === 0;
		  }
		  __checkWitnessCommit() {
		    if (!this.transactions) throw errorMerkleNoTxes;
		    if (!this.hasWitnessCommit()) throw errorWitnessNotSegwit;
		    const actualWitnessCommit = Block.calculateMerkleRoot(
		      this.transactions,
		      true,
		    );
		    return this.witnessCommit.compare(actualWitnessCommit) === 0;
		  }
		}
		block.Block = Block;
		function txesHaveWitnessCommit(transactions) {
		  return (
		    transactions instanceof Array &&
		    transactions[0] &&
		    transactions[0].ins &&
		    transactions[0].ins instanceof Array &&
		    transactions[0].ins[0] &&
		    transactions[0].ins[0].witness &&
		    transactions[0].ins[0].witness instanceof Array &&
		    transactions[0].ins[0].witness.length > 0
		  );
		}
		function anyTxHasWitness(transactions) {
		  return (
		    transactions instanceof Array &&
		    transactions.some(
		      tx =>
		        typeof tx === 'object' &&
		        tx.ins instanceof Array &&
		        tx.ins.some(
		          input =>
		            typeof input === 'object' &&
		            input.witness instanceof Array &&
		            input.witness.length > 0,
		        ),
		    )
		  );
		}
		return block;
	}

	var psbt$1 = {};

	var psbt = {};

	var combiner = {};

	var parser = {};

	var fromBuffer = {};

	var converter = {};

	var typeFields = {};

	var hasRequiredTypeFields;

	function requireTypeFields () {
		if (hasRequiredTypeFields) return typeFields;
		hasRequiredTypeFields = 1;
		(function (exports$1) {
			Object.defineProperty(exports$1, '__esModule', { value: true });
			(function(GlobalTypes) {
			  GlobalTypes[(GlobalTypes['UNSIGNED_TX'] = 0)] = 'UNSIGNED_TX';
			  GlobalTypes[(GlobalTypes['GLOBAL_XPUB'] = 1)] = 'GLOBAL_XPUB';
			})((exports$1.GlobalTypes || (exports$1.GlobalTypes = {})));
			exports$1.GLOBAL_TYPE_NAMES = ['unsignedTx', 'globalXpub'];
			(function(InputTypes) {
			  InputTypes[(InputTypes['NON_WITNESS_UTXO'] = 0)] = 'NON_WITNESS_UTXO';
			  InputTypes[(InputTypes['WITNESS_UTXO'] = 1)] = 'WITNESS_UTXO';
			  InputTypes[(InputTypes['PARTIAL_SIG'] = 2)] = 'PARTIAL_SIG';
			  InputTypes[(InputTypes['SIGHASH_TYPE'] = 3)] = 'SIGHASH_TYPE';
			  InputTypes[(InputTypes['REDEEM_SCRIPT'] = 4)] = 'REDEEM_SCRIPT';
			  InputTypes[(InputTypes['WITNESS_SCRIPT'] = 5)] = 'WITNESS_SCRIPT';
			  InputTypes[(InputTypes['BIP32_DERIVATION'] = 6)] = 'BIP32_DERIVATION';
			  InputTypes[(InputTypes['FINAL_SCRIPTSIG'] = 7)] = 'FINAL_SCRIPTSIG';
			  InputTypes[(InputTypes['FINAL_SCRIPTWITNESS'] = 8)] = 'FINAL_SCRIPTWITNESS';
			  InputTypes[(InputTypes['POR_COMMITMENT'] = 9)] = 'POR_COMMITMENT';
			  InputTypes[(InputTypes['TAP_KEY_SIG'] = 19)] = 'TAP_KEY_SIG';
			  InputTypes[(InputTypes['TAP_SCRIPT_SIG'] = 20)] = 'TAP_SCRIPT_SIG';
			  InputTypes[(InputTypes['TAP_LEAF_SCRIPT'] = 21)] = 'TAP_LEAF_SCRIPT';
			  InputTypes[(InputTypes['TAP_BIP32_DERIVATION'] = 22)] =
			    'TAP_BIP32_DERIVATION';
			  InputTypes[(InputTypes['TAP_INTERNAL_KEY'] = 23)] = 'TAP_INTERNAL_KEY';
			  InputTypes[(InputTypes['TAP_MERKLE_ROOT'] = 24)] = 'TAP_MERKLE_ROOT';
			})((exports$1.InputTypes || (exports$1.InputTypes = {})));
			exports$1.INPUT_TYPE_NAMES = [
			  'nonWitnessUtxo',
			  'witnessUtxo',
			  'partialSig',
			  'sighashType',
			  'redeemScript',
			  'witnessScript',
			  'bip32Derivation',
			  'finalScriptSig',
			  'finalScriptWitness',
			  'porCommitment',
			  'tapKeySig',
			  'tapScriptSig',
			  'tapLeafScript',
			  'tapBip32Derivation',
			  'tapInternalKey',
			  'tapMerkleRoot',
			];
			(function(OutputTypes) {
			  OutputTypes[(OutputTypes['REDEEM_SCRIPT'] = 0)] = 'REDEEM_SCRIPT';
			  OutputTypes[(OutputTypes['WITNESS_SCRIPT'] = 1)] = 'WITNESS_SCRIPT';
			  OutputTypes[(OutputTypes['BIP32_DERIVATION'] = 2)] = 'BIP32_DERIVATION';
			  OutputTypes[(OutputTypes['TAP_INTERNAL_KEY'] = 5)] = 'TAP_INTERNAL_KEY';
			  OutputTypes[(OutputTypes['TAP_TREE'] = 6)] = 'TAP_TREE';
			  OutputTypes[(OutputTypes['TAP_BIP32_DERIVATION'] = 7)] =
			    'TAP_BIP32_DERIVATION';
			})((exports$1.OutputTypes || (exports$1.OutputTypes = {})));
			exports$1.OUTPUT_TYPE_NAMES = [
			  'redeemScript',
			  'witnessScript',
			  'bip32Derivation',
			  'tapInternalKey',
			  'tapTree',
			  'tapBip32Derivation',
			]; 
		} (typeFields));
		return typeFields;
	}

	var globalXpub = {};

	var hasRequiredGlobalXpub;

	function requireGlobalXpub () {
		if (hasRequiredGlobalXpub) return globalXpub;
		hasRequiredGlobalXpub = 1;
		Object.defineProperty(globalXpub, '__esModule', { value: true });
		const typeFields_1 = requireTypeFields();
		const range = n => [...Array(n).keys()];
		function decode(keyVal) {
		  if (keyVal.key[0] !== typeFields_1.GlobalTypes.GLOBAL_XPUB) {
		    throw new Error(
		      'Decode Error: could not decode globalXpub with key 0x' +
		        keyVal.key.toString('hex'),
		    );
		  }
		  if (keyVal.key.length !== 79 || ![2, 3].includes(keyVal.key[46])) {
		    throw new Error(
		      'Decode Error: globalXpub has invalid extended pubkey in key 0x' +
		        keyVal.key.toString('hex'),
		    );
		  }
		  if ((keyVal.value.length / 4) % 1 !== 0) {
		    throw new Error(
		      'Decode Error: Global GLOBAL_XPUB value length should be multiple of 4',
		    );
		  }
		  const extendedPubkey = keyVal.key.slice(1);
		  const data = {
		    masterFingerprint: keyVal.value.slice(0, 4),
		    extendedPubkey,
		    path: 'm',
		  };
		  for (const i of range(keyVal.value.length / 4 - 1)) {
		    const val = keyVal.value.readUInt32LE(i * 4 + 4);
		    const isHard = !!(val & 0x80000000);
		    const idx = val & 0x7fffffff;
		    data.path += '/' + idx.toString(10) + (isHard ? "'" : '');
		  }
		  return data;
		}
		globalXpub.decode = decode;
		function encode(data) {
		  const head = bufferExports.Buffer.from([typeFields_1.GlobalTypes.GLOBAL_XPUB]);
		  const key = bufferExports.Buffer.concat([head, data.extendedPubkey]);
		  const splitPath = data.path.split('/');
		  const value = bufferExports.Buffer.allocUnsafe(splitPath.length * 4);
		  data.masterFingerprint.copy(value, 0);
		  let offset = 4;
		  splitPath.slice(1).forEach(level => {
		    const isHard = level.slice(-1) === "'";
		    let num = 0x7fffffff & parseInt(isHard ? level.slice(0, -1) : level, 10);
		    if (isHard) num += 0x80000000;
		    value.writeUInt32LE(num, offset);
		    offset += 4;
		  });
		  return {
		    key,
		    value,
		  };
		}
		globalXpub.encode = encode;
		globalXpub.expected =
		  '{ masterFingerprint: Buffer; extendedPubkey: Buffer; path: string; }';
		function check(data) {
		  const epk = data.extendedPubkey;
		  const mfp = data.masterFingerprint;
		  const p = data.path;
		  return (
		    bufferExports.Buffer.isBuffer(epk) &&
		    epk.length === 78 &&
		    [2, 3].indexOf(epk[45]) > -1 &&
		    bufferExports.Buffer.isBuffer(mfp) &&
		    mfp.length === 4 &&
		    typeof p === 'string' &&
		    !!p.match(/^m(\/\d+'?)*$/)
		  );
		}
		globalXpub.check = check;
		function canAddToArray(array, item, dupeSet) {
		  const dupeString = item.extendedPubkey.toString('hex');
		  if (dupeSet.has(dupeString)) return false;
		  dupeSet.add(dupeString);
		  return (
		    array.filter(v => v.extendedPubkey.equals(item.extendedPubkey)).length === 0
		  );
		}
		globalXpub.canAddToArray = canAddToArray;
		return globalXpub;
	}

	var unsignedTx = {};

	var hasRequiredUnsignedTx;

	function requireUnsignedTx () {
		if (hasRequiredUnsignedTx) return unsignedTx;
		hasRequiredUnsignedTx = 1;
		Object.defineProperty(unsignedTx, '__esModule', { value: true });
		const typeFields_1 = requireTypeFields();
		function encode(data) {
		  return {
		    key: bufferExports.Buffer.from([typeFields_1.GlobalTypes.UNSIGNED_TX]),
		    value: data.toBuffer(),
		  };
		}
		unsignedTx.encode = encode;
		return unsignedTx;
	}

	var finalScriptSig = {};

	var hasRequiredFinalScriptSig;

	function requireFinalScriptSig () {
		if (hasRequiredFinalScriptSig) return finalScriptSig;
		hasRequiredFinalScriptSig = 1;
		Object.defineProperty(finalScriptSig, '__esModule', { value: true });
		const typeFields_1 = requireTypeFields();
		function decode(keyVal) {
		  if (keyVal.key[0] !== typeFields_1.InputTypes.FINAL_SCRIPTSIG) {
		    throw new Error(
		      'Decode Error: could not decode finalScriptSig with key 0x' +
		        keyVal.key.toString('hex'),
		    );
		  }
		  return keyVal.value;
		}
		finalScriptSig.decode = decode;
		function encode(data) {
		  const key = bufferExports.Buffer.from([typeFields_1.InputTypes.FINAL_SCRIPTSIG]);
		  return {
		    key,
		    value: data,
		  };
		}
		finalScriptSig.encode = encode;
		finalScriptSig.expected = 'Buffer';
		function check(data) {
		  return bufferExports.Buffer.isBuffer(data);
		}
		finalScriptSig.check = check;
		function canAdd(currentData, newData) {
		  return !!currentData && !!newData && currentData.finalScriptSig === undefined;
		}
		finalScriptSig.canAdd = canAdd;
		return finalScriptSig;
	}

	var finalScriptWitness = {};

	var hasRequiredFinalScriptWitness;

	function requireFinalScriptWitness () {
		if (hasRequiredFinalScriptWitness) return finalScriptWitness;
		hasRequiredFinalScriptWitness = 1;
		Object.defineProperty(finalScriptWitness, '__esModule', { value: true });
		const typeFields_1 = requireTypeFields();
		function decode(keyVal) {
		  if (keyVal.key[0] !== typeFields_1.InputTypes.FINAL_SCRIPTWITNESS) {
		    throw new Error(
		      'Decode Error: could not decode finalScriptWitness with key 0x' +
		        keyVal.key.toString('hex'),
		    );
		  }
		  return keyVal.value;
		}
		finalScriptWitness.decode = decode;
		function encode(data) {
		  const key = bufferExports.Buffer.from([typeFields_1.InputTypes.FINAL_SCRIPTWITNESS]);
		  return {
		    key,
		    value: data,
		  };
		}
		finalScriptWitness.encode = encode;
		finalScriptWitness.expected = 'Buffer';
		function check(data) {
		  return bufferExports.Buffer.isBuffer(data);
		}
		finalScriptWitness.check = check;
		function canAdd(currentData, newData) {
		  return (
		    !!currentData && !!newData && currentData.finalScriptWitness === undefined
		  );
		}
		finalScriptWitness.canAdd = canAdd;
		return finalScriptWitness;
	}

	var nonWitnessUtxo = {};

	var hasRequiredNonWitnessUtxo;

	function requireNonWitnessUtxo () {
		if (hasRequiredNonWitnessUtxo) return nonWitnessUtxo;
		hasRequiredNonWitnessUtxo = 1;
		Object.defineProperty(nonWitnessUtxo, '__esModule', { value: true });
		const typeFields_1 = requireTypeFields();
		function decode(keyVal) {
		  if (keyVal.key[0] !== typeFields_1.InputTypes.NON_WITNESS_UTXO) {
		    throw new Error(
		      'Decode Error: could not decode nonWitnessUtxo with key 0x' +
		        keyVal.key.toString('hex'),
		    );
		  }
		  return keyVal.value;
		}
		nonWitnessUtxo.decode = decode;
		function encode(data) {
		  return {
		    key: bufferExports.Buffer.from([typeFields_1.InputTypes.NON_WITNESS_UTXO]),
		    value: data,
		  };
		}
		nonWitnessUtxo.encode = encode;
		nonWitnessUtxo.expected = 'Buffer';
		function check(data) {
		  return bufferExports.Buffer.isBuffer(data);
		}
		nonWitnessUtxo.check = check;
		function canAdd(currentData, newData) {
		  return !!currentData && !!newData && currentData.nonWitnessUtxo === undefined;
		}
		nonWitnessUtxo.canAdd = canAdd;
		return nonWitnessUtxo;
	}

	var partialSig = {};

	var hasRequiredPartialSig;

	function requirePartialSig () {
		if (hasRequiredPartialSig) return partialSig;
		hasRequiredPartialSig = 1;
		Object.defineProperty(partialSig, '__esModule', { value: true });
		const typeFields_1 = requireTypeFields();
		function decode(keyVal) {
		  if (keyVal.key[0] !== typeFields_1.InputTypes.PARTIAL_SIG) {
		    throw new Error(
		      'Decode Error: could not decode partialSig with key 0x' +
		        keyVal.key.toString('hex'),
		    );
		  }
		  if (
		    !(keyVal.key.length === 34 || keyVal.key.length === 66) ||
		    ![2, 3, 4].includes(keyVal.key[1])
		  ) {
		    throw new Error(
		      'Decode Error: partialSig has invalid pubkey in key 0x' +
		        keyVal.key.toString('hex'),
		    );
		  }
		  const pubkey = keyVal.key.slice(1);
		  return {
		    pubkey,
		    signature: keyVal.value,
		  };
		}
		partialSig.decode = decode;
		function encode(pSig) {
		  const head = bufferExports.Buffer.from([typeFields_1.InputTypes.PARTIAL_SIG]);
		  return {
		    key: bufferExports.Buffer.concat([head, pSig.pubkey]),
		    value: pSig.signature,
		  };
		}
		partialSig.encode = encode;
		partialSig.expected = '{ pubkey: Buffer; signature: Buffer; }';
		function check(data) {
		  return (
		    bufferExports.Buffer.isBuffer(data.pubkey) &&
		    bufferExports.Buffer.isBuffer(data.signature) &&
		    [33, 65].includes(data.pubkey.length) &&
		    [2, 3, 4].includes(data.pubkey[0]) &&
		    isDerSigWithSighash(data.signature)
		  );
		}
		partialSig.check = check;
		function isDerSigWithSighash(buf) {
		  if (!bufferExports.Buffer.isBuffer(buf) || buf.length < 9) return false;
		  if (buf[0] !== 0x30) return false;
		  if (buf.length !== buf[1] + 3) return false;
		  if (buf[2] !== 0x02) return false;
		  const rLen = buf[3];
		  if (rLen > 33 || rLen < 1) return false;
		  if (buf[3 + rLen + 1] !== 0x02) return false;
		  const sLen = buf[3 + rLen + 2];
		  if (sLen > 33 || sLen < 1) return false;
		  if (buf.length !== 3 + rLen + 2 + sLen + 2) return false;
		  return true;
		}
		function canAddToArray(array, item, dupeSet) {
		  const dupeString = item.pubkey.toString('hex');
		  if (dupeSet.has(dupeString)) return false;
		  dupeSet.add(dupeString);
		  return array.filter(v => v.pubkey.equals(item.pubkey)).length === 0;
		}
		partialSig.canAddToArray = canAddToArray;
		return partialSig;
	}

	var porCommitment = {};

	var hasRequiredPorCommitment;

	function requirePorCommitment () {
		if (hasRequiredPorCommitment) return porCommitment;
		hasRequiredPorCommitment = 1;
		Object.defineProperty(porCommitment, '__esModule', { value: true });
		const typeFields_1 = requireTypeFields();
		function decode(keyVal) {
		  if (keyVal.key[0] !== typeFields_1.InputTypes.POR_COMMITMENT) {
		    throw new Error(
		      'Decode Error: could not decode porCommitment with key 0x' +
		        keyVal.key.toString('hex'),
		    );
		  }
		  return keyVal.value.toString('utf8');
		}
		porCommitment.decode = decode;
		function encode(data) {
		  const key = bufferExports.Buffer.from([typeFields_1.InputTypes.POR_COMMITMENT]);
		  return {
		    key,
		    value: bufferExports.Buffer.from(data, 'utf8'),
		  };
		}
		porCommitment.encode = encode;
		porCommitment.expected = 'string';
		function check(data) {
		  return typeof data === 'string';
		}
		porCommitment.check = check;
		function canAdd(currentData, newData) {
		  return !!currentData && !!newData && currentData.porCommitment === undefined;
		}
		porCommitment.canAdd = canAdd;
		return porCommitment;
	}

	var sighashType = {};

	var hasRequiredSighashType;

	function requireSighashType () {
		if (hasRequiredSighashType) return sighashType;
		hasRequiredSighashType = 1;
		Object.defineProperty(sighashType, '__esModule', { value: true });
		const typeFields_1 = requireTypeFields();
		function decode(keyVal) {
		  if (keyVal.key[0] !== typeFields_1.InputTypes.SIGHASH_TYPE) {
		    throw new Error(
		      'Decode Error: could not decode sighashType with key 0x' +
		        keyVal.key.toString('hex'),
		    );
		  }
		  return keyVal.value.readUInt32LE(0);
		}
		sighashType.decode = decode;
		function encode(data) {
		  const key = bufferExports.Buffer.from([typeFields_1.InputTypes.SIGHASH_TYPE]);
		  const value = bufferExports.Buffer.allocUnsafe(4);
		  value.writeUInt32LE(data, 0);
		  return {
		    key,
		    value,
		  };
		}
		sighashType.encode = encode;
		sighashType.expected = 'number';
		function check(data) {
		  return typeof data === 'number';
		}
		sighashType.check = check;
		function canAdd(currentData, newData) {
		  return !!currentData && !!newData && currentData.sighashType === undefined;
		}
		sighashType.canAdd = canAdd;
		return sighashType;
	}

	var tapKeySig = {};

	var hasRequiredTapKeySig;

	function requireTapKeySig () {
		if (hasRequiredTapKeySig) return tapKeySig;
		hasRequiredTapKeySig = 1;
		Object.defineProperty(tapKeySig, '__esModule', { value: true });
		const typeFields_1 = requireTypeFields();
		function decode(keyVal) {
		  if (
		    keyVal.key[0] !== typeFields_1.InputTypes.TAP_KEY_SIG ||
		    keyVal.key.length !== 1
		  ) {
		    throw new Error(
		      'Decode Error: could not decode tapKeySig with key 0x' +
		        keyVal.key.toString('hex'),
		    );
		  }
		  if (!check(keyVal.value)) {
		    throw new Error(
		      'Decode Error: tapKeySig not a valid 64-65-byte BIP340 signature',
		    );
		  }
		  return keyVal.value;
		}
		tapKeySig.decode = decode;
		function encode(value) {
		  const key = bufferExports.Buffer.from([typeFields_1.InputTypes.TAP_KEY_SIG]);
		  return { key, value };
		}
		tapKeySig.encode = encode;
		tapKeySig.expected = 'Buffer';
		function check(data) {
		  return bufferExports.Buffer.isBuffer(data) && (data.length === 64 || data.length === 65);
		}
		tapKeySig.check = check;
		function canAdd(currentData, newData) {
		  return !!currentData && !!newData && currentData.tapKeySig === undefined;
		}
		tapKeySig.canAdd = canAdd;
		return tapKeySig;
	}

	var tapLeafScript = {};

	var hasRequiredTapLeafScript;

	function requireTapLeafScript () {
		if (hasRequiredTapLeafScript) return tapLeafScript;
		hasRequiredTapLeafScript = 1;
		Object.defineProperty(tapLeafScript, '__esModule', { value: true });
		const typeFields_1 = requireTypeFields();
		function decode(keyVal) {
		  if (keyVal.key[0] !== typeFields_1.InputTypes.TAP_LEAF_SCRIPT) {
		    throw new Error(
		      'Decode Error: could not decode tapLeafScript with key 0x' +
		        keyVal.key.toString('hex'),
		    );
		  }
		  if ((keyVal.key.length - 2) % 32 !== 0) {
		    throw new Error(
		      'Decode Error: tapLeafScript has invalid control block in key 0x' +
		        keyVal.key.toString('hex'),
		    );
		  }
		  const leafVersion = keyVal.value[keyVal.value.length - 1];
		  if ((keyVal.key[1] & 0xfe) !== leafVersion) {
		    throw new Error(
		      'Decode Error: tapLeafScript bad leaf version in key 0x' +
		        keyVal.key.toString('hex'),
		    );
		  }
		  const script = keyVal.value.slice(0, -1);
		  const controlBlock = keyVal.key.slice(1);
		  return { controlBlock, script, leafVersion };
		}
		tapLeafScript.decode = decode;
		function encode(tScript) {
		  const head = bufferExports.Buffer.from([typeFields_1.InputTypes.TAP_LEAF_SCRIPT]);
		  const verBuf = bufferExports.Buffer.from([tScript.leafVersion]);
		  return {
		    key: bufferExports.Buffer.concat([head, tScript.controlBlock]),
		    value: bufferExports.Buffer.concat([tScript.script, verBuf]),
		  };
		}
		tapLeafScript.encode = encode;
		tapLeafScript.expected =
		  '{ controlBlock: Buffer; leafVersion: number, script: Buffer; }';
		function check(data) {
		  return (
		    bufferExports.Buffer.isBuffer(data.controlBlock) &&
		    (data.controlBlock.length - 1) % 32 === 0 &&
		    (data.controlBlock[0] & 0xfe) === data.leafVersion &&
		    bufferExports.Buffer.isBuffer(data.script)
		  );
		}
		tapLeafScript.check = check;
		function canAddToArray(array, item, dupeSet) {
		  const dupeString = item.controlBlock.toString('hex');
		  if (dupeSet.has(dupeString)) return false;
		  dupeSet.add(dupeString);
		  return (
		    array.filter(v => v.controlBlock.equals(item.controlBlock)).length === 0
		  );
		}
		tapLeafScript.canAddToArray = canAddToArray;
		return tapLeafScript;
	}

	var tapMerkleRoot = {};

	var hasRequiredTapMerkleRoot;

	function requireTapMerkleRoot () {
		if (hasRequiredTapMerkleRoot) return tapMerkleRoot;
		hasRequiredTapMerkleRoot = 1;
		Object.defineProperty(tapMerkleRoot, '__esModule', { value: true });
		const typeFields_1 = requireTypeFields();
		function decode(keyVal) {
		  if (
		    keyVal.key[0] !== typeFields_1.InputTypes.TAP_MERKLE_ROOT ||
		    keyVal.key.length !== 1
		  ) {
		    throw new Error(
		      'Decode Error: could not decode tapMerkleRoot with key 0x' +
		        keyVal.key.toString('hex'),
		    );
		  }
		  if (!check(keyVal.value)) {
		    throw new Error('Decode Error: tapMerkleRoot not a 32-byte hash');
		  }
		  return keyVal.value;
		}
		tapMerkleRoot.decode = decode;
		function encode(value) {
		  const key = bufferExports.Buffer.from([typeFields_1.InputTypes.TAP_MERKLE_ROOT]);
		  return { key, value };
		}
		tapMerkleRoot.encode = encode;
		tapMerkleRoot.expected = 'Buffer';
		function check(data) {
		  return bufferExports.Buffer.isBuffer(data) && data.length === 32;
		}
		tapMerkleRoot.check = check;
		function canAdd(currentData, newData) {
		  return !!currentData && !!newData && currentData.tapMerkleRoot === undefined;
		}
		tapMerkleRoot.canAdd = canAdd;
		return tapMerkleRoot;
	}

	var tapScriptSig = {};

	var hasRequiredTapScriptSig;

	function requireTapScriptSig () {
		if (hasRequiredTapScriptSig) return tapScriptSig;
		hasRequiredTapScriptSig = 1;
		Object.defineProperty(tapScriptSig, '__esModule', { value: true });
		const typeFields_1 = requireTypeFields();
		function decode(keyVal) {
		  if (keyVal.key[0] !== typeFields_1.InputTypes.TAP_SCRIPT_SIG) {
		    throw new Error(
		      'Decode Error: could not decode tapScriptSig with key 0x' +
		        keyVal.key.toString('hex'),
		    );
		  }
		  if (keyVal.key.length !== 65) {
		    throw new Error(
		      'Decode Error: tapScriptSig has invalid key 0x' +
		        keyVal.key.toString('hex'),
		    );
		  }
		  if (keyVal.value.length !== 64 && keyVal.value.length !== 65) {
		    throw new Error(
		      'Decode Error: tapScriptSig has invalid signature in key 0x' +
		        keyVal.key.toString('hex'),
		    );
		  }
		  const pubkey = keyVal.key.slice(1, 33);
		  const leafHash = keyVal.key.slice(33);
		  return {
		    pubkey,
		    leafHash,
		    signature: keyVal.value,
		  };
		}
		tapScriptSig.decode = decode;
		function encode(tSig) {
		  const head = bufferExports.Buffer.from([typeFields_1.InputTypes.TAP_SCRIPT_SIG]);
		  return {
		    key: bufferExports.Buffer.concat([head, tSig.pubkey, tSig.leafHash]),
		    value: tSig.signature,
		  };
		}
		tapScriptSig.encode = encode;
		tapScriptSig.expected = '{ pubkey: Buffer; leafHash: Buffer; signature: Buffer; }';
		function check(data) {
		  return (
		    bufferExports.Buffer.isBuffer(data.pubkey) &&
		    bufferExports.Buffer.isBuffer(data.leafHash) &&
		    bufferExports.Buffer.isBuffer(data.signature) &&
		    data.pubkey.length === 32 &&
		    data.leafHash.length === 32 &&
		    (data.signature.length === 64 || data.signature.length === 65)
		  );
		}
		tapScriptSig.check = check;
		function canAddToArray(array, item, dupeSet) {
		  const dupeString =
		    item.pubkey.toString('hex') + item.leafHash.toString('hex');
		  if (dupeSet.has(dupeString)) return false;
		  dupeSet.add(dupeString);
		  return (
		    array.filter(
		      v => v.pubkey.equals(item.pubkey) && v.leafHash.equals(item.leafHash),
		    ).length === 0
		  );
		}
		tapScriptSig.canAddToArray = canAddToArray;
		return tapScriptSig;
	}

	var witnessUtxo = {};

	var tools = {};

	var varint = {};

	var hasRequiredVarint;

	function requireVarint () {
		if (hasRequiredVarint) return varint;
		hasRequiredVarint = 1;
		Object.defineProperty(varint, '__esModule', { value: true });
		// Number.MAX_SAFE_INTEGER
		const MAX_SAFE_INTEGER = 9007199254740991;
		function checkUInt53(n) {
		  if (n < 0 || n > MAX_SAFE_INTEGER || n % 1 !== 0)
		    throw new RangeError('value out of range');
		}
		function encode(_number, buffer, offset) {
		  checkUInt53(_number);
		  if (!buffer) buffer = bufferExports.Buffer.allocUnsafe(encodingLength(_number));
		  if (!bufferExports.Buffer.isBuffer(buffer))
		    throw new TypeError('buffer must be a Buffer instance');
		  if (!offset) offset = 0;
		  // 8 bit
		  if (_number < 0xfd) {
		    buffer.writeUInt8(_number, offset);
		    Object.assign(encode, { bytes: 1 });
		    // 16 bit
		  } else if (_number <= 0xffff) {
		    buffer.writeUInt8(0xfd, offset);
		    buffer.writeUInt16LE(_number, offset + 1);
		    Object.assign(encode, { bytes: 3 });
		    // 32 bit
		  } else if (_number <= 0xffffffff) {
		    buffer.writeUInt8(0xfe, offset);
		    buffer.writeUInt32LE(_number, offset + 1);
		    Object.assign(encode, { bytes: 5 });
		    // 64 bit
		  } else {
		    buffer.writeUInt8(0xff, offset);
		    buffer.writeUInt32LE(_number >>> 0, offset + 1);
		    buffer.writeUInt32LE((_number / 0x100000000) | 0, offset + 5);
		    Object.assign(encode, { bytes: 9 });
		  }
		  return buffer;
		}
		varint.encode = encode;
		function decode(buffer, offset) {
		  if (!bufferExports.Buffer.isBuffer(buffer))
		    throw new TypeError('buffer must be a Buffer instance');
		  if (!offset) offset = 0;
		  const first = buffer.readUInt8(offset);
		  // 8 bit
		  if (first < 0xfd) {
		    Object.assign(decode, { bytes: 1 });
		    return first;
		    // 16 bit
		  } else if (first === 0xfd) {
		    Object.assign(decode, { bytes: 3 });
		    return buffer.readUInt16LE(offset + 1);
		    // 32 bit
		  } else if (first === 0xfe) {
		    Object.assign(decode, { bytes: 5 });
		    return buffer.readUInt32LE(offset + 1);
		    // 64 bit
		  } else {
		    Object.assign(decode, { bytes: 9 });
		    const lo = buffer.readUInt32LE(offset + 1);
		    const hi = buffer.readUInt32LE(offset + 5);
		    const _number = hi * 0x0100000000 + lo;
		    checkUInt53(_number);
		    return _number;
		  }
		}
		varint.decode = decode;
		function encodingLength(_number) {
		  checkUInt53(_number);
		  return _number < 0xfd
		    ? 1
		    : _number <= 0xffff
		    ? 3
		    : _number <= 0xffffffff
		    ? 5
		    : 9;
		}
		varint.encodingLength = encodingLength;
		return varint;
	}

	var hasRequiredTools;

	function requireTools () {
		if (hasRequiredTools) return tools;
		hasRequiredTools = 1;
		Object.defineProperty(tools, '__esModule', { value: true });
		const varuint = requireVarint();
		tools.range = n => [...Array(n).keys()];
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
		tools.reverseBuffer = reverseBuffer;
		function keyValsToBuffer(keyVals) {
		  const buffers = keyVals.map(keyValToBuffer);
		  buffers.push(bufferExports.Buffer.from([0]));
		  return bufferExports.Buffer.concat(buffers);
		}
		tools.keyValsToBuffer = keyValsToBuffer;
		function keyValToBuffer(keyVal) {
		  const keyLen = keyVal.key.length;
		  const valLen = keyVal.value.length;
		  const keyVarIntLen = varuint.encodingLength(keyLen);
		  const valVarIntLen = varuint.encodingLength(valLen);
		  const buffer = bufferExports.Buffer.allocUnsafe(
		    keyVarIntLen + keyLen + valVarIntLen + valLen,
		  );
		  varuint.encode(keyLen, buffer, 0);
		  keyVal.key.copy(buffer, keyVarIntLen);
		  varuint.encode(valLen, buffer, keyVarIntLen + keyLen);
		  keyVal.value.copy(buffer, keyVarIntLen + keyLen + valVarIntLen);
		  return buffer;
		}
		tools.keyValToBuffer = keyValToBuffer;
		// https://github.com/feross/buffer/blob/master/index.js#L1127
		function verifuint(value, max) {
		  if (typeof value !== 'number')
		    throw new Error('cannot write a non-number as a number');
		  if (value < 0)
		    throw new Error('specified a negative value for writing an unsigned value');
		  if (value > max) throw new Error('RangeError: value out of range');
		  if (Math.floor(value) !== value)
		    throw new Error('value has a fractional component');
		}
		function readUInt64LE(buffer, offset) {
		  const a = buffer.readUInt32LE(offset);
		  let b = buffer.readUInt32LE(offset + 4);
		  b *= 0x100000000;
		  verifuint(b + a, 0x001fffffffffffff);
		  return b + a;
		}
		tools.readUInt64LE = readUInt64LE;
		function writeUInt64LE(buffer, value, offset) {
		  verifuint(value, 0x001fffffffffffff);
		  buffer.writeInt32LE(value & -1, offset);
		  buffer.writeUInt32LE(Math.floor(value / 0x100000000), offset + 4);
		  return offset + 8;
		}
		tools.writeUInt64LE = writeUInt64LE;
		return tools;
	}

	var hasRequiredWitnessUtxo;

	function requireWitnessUtxo () {
		if (hasRequiredWitnessUtxo) return witnessUtxo;
		hasRequiredWitnessUtxo = 1;
		Object.defineProperty(witnessUtxo, '__esModule', { value: true });
		const typeFields_1 = requireTypeFields();
		const tools_1 = requireTools();
		const varuint = requireVarint();
		function decode(keyVal) {
		  if (keyVal.key[0] !== typeFields_1.InputTypes.WITNESS_UTXO) {
		    throw new Error(
		      'Decode Error: could not decode witnessUtxo with key 0x' +
		        keyVal.key.toString('hex'),
		    );
		  }
		  const value = tools_1.readUInt64LE(keyVal.value, 0);
		  let _offset = 8;
		  const scriptLen = varuint.decode(keyVal.value, _offset);
		  _offset += varuint.encodingLength(scriptLen);
		  const script = keyVal.value.slice(_offset);
		  if (script.length !== scriptLen) {
		    throw new Error('Decode Error: WITNESS_UTXO script is not proper length');
		  }
		  return {
		    script,
		    value,
		  };
		}
		witnessUtxo.decode = decode;
		function encode(data) {
		  const { script, value } = data;
		  const varintLen = varuint.encodingLength(script.length);
		  const result = bufferExports.Buffer.allocUnsafe(8 + varintLen + script.length);
		  tools_1.writeUInt64LE(result, value, 0);
		  varuint.encode(script.length, result, 8);
		  script.copy(result, 8 + varintLen);
		  return {
		    key: bufferExports.Buffer.from([typeFields_1.InputTypes.WITNESS_UTXO]),
		    value: result,
		  };
		}
		witnessUtxo.encode = encode;
		witnessUtxo.expected = '{ script: Buffer; value: number; }';
		function check(data) {
		  return bufferExports.Buffer.isBuffer(data.script) && typeof data.value === 'number';
		}
		witnessUtxo.check = check;
		function canAdd(currentData, newData) {
		  return !!currentData && !!newData && currentData.witnessUtxo === undefined;
		}
		witnessUtxo.canAdd = canAdd;
		return witnessUtxo;
	}

	var tapTree = {};

	var hasRequiredTapTree;

	function requireTapTree () {
		if (hasRequiredTapTree) return tapTree;
		hasRequiredTapTree = 1;
		Object.defineProperty(tapTree, '__esModule', { value: true });
		const typeFields_1 = requireTypeFields();
		const varuint = requireVarint();
		function decode(keyVal) {
		  if (
		    keyVal.key[0] !== typeFields_1.OutputTypes.TAP_TREE ||
		    keyVal.key.length !== 1
		  ) {
		    throw new Error(
		      'Decode Error: could not decode tapTree with key 0x' +
		        keyVal.key.toString('hex'),
		    );
		  }
		  let _offset = 0;
		  const data = [];
		  while (_offset < keyVal.value.length) {
		    const depth = keyVal.value[_offset++];
		    const leafVersion = keyVal.value[_offset++];
		    const scriptLen = varuint.decode(keyVal.value, _offset);
		    _offset += varuint.encodingLength(scriptLen);
		    data.push({
		      depth,
		      leafVersion,
		      script: keyVal.value.slice(_offset, _offset + scriptLen),
		    });
		    _offset += scriptLen;
		  }
		  return { leaves: data };
		}
		tapTree.decode = decode;
		function encode(tree) {
		  const key = bufferExports.Buffer.from([typeFields_1.OutputTypes.TAP_TREE]);
		  const bufs = [].concat(
		    ...tree.leaves.map(tapLeaf => [
		      bufferExports.Buffer.of(tapLeaf.depth, tapLeaf.leafVersion),
		      varuint.encode(tapLeaf.script.length),
		      tapLeaf.script,
		    ]),
		  );
		  return {
		    key,
		    value: bufferExports.Buffer.concat(bufs),
		  };
		}
		tapTree.encode = encode;
		tapTree.expected =
		  '{ leaves: [{ depth: number; leafVersion: number, script: Buffer; }] }';
		function check(data) {
		  return (
		    Array.isArray(data.leaves) &&
		    data.leaves.every(
		      tapLeaf =>
		        tapLeaf.depth >= 0 &&
		        tapLeaf.depth <= 128 &&
		        (tapLeaf.leafVersion & 0xfe) === tapLeaf.leafVersion &&
		        bufferExports.Buffer.isBuffer(tapLeaf.script),
		    )
		  );
		}
		tapTree.check = check;
		function canAdd(currentData, newData) {
		  return !!currentData && !!newData && currentData.tapTree === undefined;
		}
		tapTree.canAdd = canAdd;
		return tapTree;
	}

	var bip32Derivation = {};

	var hasRequiredBip32Derivation;

	function requireBip32Derivation () {
		if (hasRequiredBip32Derivation) return bip32Derivation;
		hasRequiredBip32Derivation = 1;
		Object.defineProperty(bip32Derivation, '__esModule', { value: true });
		const range = n => [...Array(n).keys()];
		const isValidDERKey = pubkey =>
		  (pubkey.length === 33 && [2, 3].includes(pubkey[0])) ||
		  (pubkey.length === 65 && 4 === pubkey[0]);
		function makeConverter(TYPE_BYTE, isValidPubkey = isValidDERKey) {
		  function decode(keyVal) {
		    if (keyVal.key[0] !== TYPE_BYTE) {
		      throw new Error(
		        'Decode Error: could not decode bip32Derivation with key 0x' +
		          keyVal.key.toString('hex'),
		      );
		    }
		    const pubkey = keyVal.key.slice(1);
		    if (!isValidPubkey(pubkey)) {
		      throw new Error(
		        'Decode Error: bip32Derivation has invalid pubkey in key 0x' +
		          keyVal.key.toString('hex'),
		      );
		    }
		    if ((keyVal.value.length / 4) % 1 !== 0) {
		      throw new Error(
		        'Decode Error: Input BIP32_DERIVATION value length should be multiple of 4',
		      );
		    }
		    const data = {
		      masterFingerprint: keyVal.value.slice(0, 4),
		      pubkey,
		      path: 'm',
		    };
		    for (const i of range(keyVal.value.length / 4 - 1)) {
		      const val = keyVal.value.readUInt32LE(i * 4 + 4);
		      const isHard = !!(val & 0x80000000);
		      const idx = val & 0x7fffffff;
		      data.path += '/' + idx.toString(10) + (isHard ? "'" : '');
		    }
		    return data;
		  }
		  function encode(data) {
		    const head = bufferExports.Buffer.from([TYPE_BYTE]);
		    const key = bufferExports.Buffer.concat([head, data.pubkey]);
		    const splitPath = data.path.split('/');
		    const value = bufferExports.Buffer.allocUnsafe(splitPath.length * 4);
		    data.masterFingerprint.copy(value, 0);
		    let offset = 4;
		    splitPath.slice(1).forEach(level => {
		      const isHard = level.slice(-1) === "'";
		      let num = 0x7fffffff & parseInt(isHard ? level.slice(0, -1) : level, 10);
		      if (isHard) num += 0x80000000;
		      value.writeUInt32LE(num, offset);
		      offset += 4;
		    });
		    return {
		      key,
		      value,
		    };
		  }
		  const expected =
		    '{ masterFingerprint: Buffer; pubkey: Buffer; path: string; }';
		  function check(data) {
		    return (
		      bufferExports.Buffer.isBuffer(data.pubkey) &&
		      bufferExports.Buffer.isBuffer(data.masterFingerprint) &&
		      typeof data.path === 'string' &&
		      isValidPubkey(data.pubkey) &&
		      data.masterFingerprint.length === 4
		    );
		  }
		  function canAddToArray(array, item, dupeSet) {
		    const dupeString = item.pubkey.toString('hex');
		    if (dupeSet.has(dupeString)) return false;
		    dupeSet.add(dupeString);
		    return array.filter(v => v.pubkey.equals(item.pubkey)).length === 0;
		  }
		  return {
		    decode,
		    encode,
		    check,
		    expected,
		    canAddToArray,
		  };
		}
		bip32Derivation.makeConverter = makeConverter;
		return bip32Derivation;
	}

	var checkPubkey = {};

	var hasRequiredCheckPubkey;

	function requireCheckPubkey () {
		if (hasRequiredCheckPubkey) return checkPubkey;
		hasRequiredCheckPubkey = 1;
		Object.defineProperty(checkPubkey, '__esModule', { value: true });
		function makeChecker(pubkeyTypes) {
		  return checkPubkey;
		  function checkPubkey(keyVal) {
		    let pubkey;
		    if (pubkeyTypes.includes(keyVal.key[0])) {
		      pubkey = keyVal.key.slice(1);
		      if (
		        !(pubkey.length === 33 || pubkey.length === 65) ||
		        ![2, 3, 4].includes(pubkey[0])
		      ) {
		        throw new Error(
		          'Format Error: invalid pubkey in key 0x' + keyVal.key.toString('hex'),
		        );
		      }
		    }
		    return pubkey;
		  }
		}
		checkPubkey.makeChecker = makeChecker;
		return checkPubkey;
	}

	var redeemScript = {};

	var hasRequiredRedeemScript;

	function requireRedeemScript () {
		if (hasRequiredRedeemScript) return redeemScript;
		hasRequiredRedeemScript = 1;
		Object.defineProperty(redeemScript, '__esModule', { value: true });
		function makeConverter(TYPE_BYTE) {
		  function decode(keyVal) {
		    if (keyVal.key[0] !== TYPE_BYTE) {
		      throw new Error(
		        'Decode Error: could not decode redeemScript with key 0x' +
		          keyVal.key.toString('hex'),
		      );
		    }
		    return keyVal.value;
		  }
		  function encode(data) {
		    const key = bufferExports.Buffer.from([TYPE_BYTE]);
		    return {
		      key,
		      value: data,
		    };
		  }
		  const expected = 'Buffer';
		  function check(data) {
		    return bufferExports.Buffer.isBuffer(data);
		  }
		  function canAdd(currentData, newData) {
		    return !!currentData && !!newData && currentData.redeemScript === undefined;
		  }
		  return {
		    decode,
		    encode,
		    check,
		    expected,
		    canAdd,
		  };
		}
		redeemScript.makeConverter = makeConverter;
		return redeemScript;
	}

	var tapBip32Derivation = {};

	var hasRequiredTapBip32Derivation;

	function requireTapBip32Derivation () {
		if (hasRequiredTapBip32Derivation) return tapBip32Derivation;
		hasRequiredTapBip32Derivation = 1;
		Object.defineProperty(tapBip32Derivation, '__esModule', { value: true });
		const varuint = requireVarint();
		const bip32Derivation = requireBip32Derivation();
		const isValidBIP340Key = pubkey => pubkey.length === 32;
		function makeConverter(TYPE_BYTE) {
		  const parent = bip32Derivation.makeConverter(TYPE_BYTE, isValidBIP340Key);
		  function decode(keyVal) {
		    const nHashes = varuint.decode(keyVal.value);
		    const nHashesLen = varuint.encodingLength(nHashes);
		    const base = parent.decode({
		      key: keyVal.key,
		      value: keyVal.value.slice(nHashesLen + nHashes * 32),
		    });
		    const leafHashes = new Array(nHashes);
		    for (let i = 0, _offset = nHashesLen; i < nHashes; i++, _offset += 32) {
		      leafHashes[i] = keyVal.value.slice(_offset, _offset + 32);
		    }
		    return Object.assign({}, base, { leafHashes });
		  }
		  function encode(data) {
		    const base = parent.encode(data);
		    const nHashesLen = varuint.encodingLength(data.leafHashes.length);
		    const nHashesBuf = bufferExports.Buffer.allocUnsafe(nHashesLen);
		    varuint.encode(data.leafHashes.length, nHashesBuf);
		    const value = bufferExports.Buffer.concat([nHashesBuf, ...data.leafHashes, base.value]);
		    return Object.assign({}, base, { value });
		  }
		  const expected =
		    '{ ' +
		    'masterFingerprint: Buffer; ' +
		    'pubkey: Buffer; ' +
		    'path: string; ' +
		    'leafHashes: Buffer[]; ' +
		    '}';
		  function check(data) {
		    return (
		      Array.isArray(data.leafHashes) &&
		      data.leafHashes.every(
		        leafHash => bufferExports.Buffer.isBuffer(leafHash) && leafHash.length === 32,
		      ) &&
		      parent.check(data)
		    );
		  }
		  return {
		    decode,
		    encode,
		    check,
		    expected,
		    canAddToArray: parent.canAddToArray,
		  };
		}
		tapBip32Derivation.makeConverter = makeConverter;
		return tapBip32Derivation;
	}

	var tapInternalKey = {};

	var hasRequiredTapInternalKey;

	function requireTapInternalKey () {
		if (hasRequiredTapInternalKey) return tapInternalKey;
		hasRequiredTapInternalKey = 1;
		Object.defineProperty(tapInternalKey, '__esModule', { value: true });
		function makeConverter(TYPE_BYTE) {
		  function decode(keyVal) {
		    if (keyVal.key[0] !== TYPE_BYTE || keyVal.key.length !== 1) {
		      throw new Error(
		        'Decode Error: could not decode tapInternalKey with key 0x' +
		          keyVal.key.toString('hex'),
		      );
		    }
		    if (keyVal.value.length !== 32) {
		      throw new Error(
		        'Decode Error: tapInternalKey not a 32-byte x-only pubkey',
		      );
		    }
		    return keyVal.value;
		  }
		  function encode(value) {
		    const key = bufferExports.Buffer.from([TYPE_BYTE]);
		    return { key, value };
		  }
		  const expected = 'Buffer';
		  function check(data) {
		    return bufferExports.Buffer.isBuffer(data) && data.length === 32;
		  }
		  function canAdd(currentData, newData) {
		    return (
		      !!currentData && !!newData && currentData.tapInternalKey === undefined
		    );
		  }
		  return {
		    decode,
		    encode,
		    check,
		    expected,
		    canAdd,
		  };
		}
		tapInternalKey.makeConverter = makeConverter;
		return tapInternalKey;
	}

	var witnessScript = {};

	var hasRequiredWitnessScript;

	function requireWitnessScript () {
		if (hasRequiredWitnessScript) return witnessScript;
		hasRequiredWitnessScript = 1;
		Object.defineProperty(witnessScript, '__esModule', { value: true });
		function makeConverter(TYPE_BYTE) {
		  function decode(keyVal) {
		    if (keyVal.key[0] !== TYPE_BYTE) {
		      throw new Error(
		        'Decode Error: could not decode witnessScript with key 0x' +
		          keyVal.key.toString('hex'),
		      );
		    }
		    return keyVal.value;
		  }
		  function encode(data) {
		    const key = bufferExports.Buffer.from([TYPE_BYTE]);
		    return {
		      key,
		      value: data,
		    };
		  }
		  const expected = 'Buffer';
		  function check(data) {
		    return bufferExports.Buffer.isBuffer(data);
		  }
		  function canAdd(currentData, newData) {
		    return (
		      !!currentData && !!newData && currentData.witnessScript === undefined
		    );
		  }
		  return {
		    decode,
		    encode,
		    check,
		    expected,
		    canAdd,
		  };
		}
		witnessScript.makeConverter = makeConverter;
		return witnessScript;
	}

	var hasRequiredConverter;

	function requireConverter () {
		if (hasRequiredConverter) return converter;
		hasRequiredConverter = 1;
		Object.defineProperty(converter, '__esModule', { value: true });
		const typeFields_1 = requireTypeFields();
		const globalXpub = requireGlobalXpub();
		const unsignedTx = requireUnsignedTx();
		const finalScriptSig = requireFinalScriptSig();
		const finalScriptWitness = requireFinalScriptWitness();
		const nonWitnessUtxo = requireNonWitnessUtxo();
		const partialSig = requirePartialSig();
		const porCommitment = requirePorCommitment();
		const sighashType = requireSighashType();
		const tapKeySig = requireTapKeySig();
		const tapLeafScript = requireTapLeafScript();
		const tapMerkleRoot = requireTapMerkleRoot();
		const tapScriptSig = requireTapScriptSig();
		const witnessUtxo = requireWitnessUtxo();
		const tapTree = requireTapTree();
		const bip32Derivation = requireBip32Derivation();
		const checkPubkey = requireCheckPubkey();
		const redeemScript = requireRedeemScript();
		const tapBip32Derivation = requireTapBip32Derivation();
		const tapInternalKey = requireTapInternalKey();
		const witnessScript = requireWitnessScript();
		const globals = {
		  unsignedTx,
		  globalXpub,
		  // pass an Array of key bytes that require pubkey beside the key
		  checkPubkey: checkPubkey.makeChecker([]),
		};
		converter.globals = globals;
		const inputs = {
		  nonWitnessUtxo,
		  partialSig,
		  sighashType,
		  finalScriptSig,
		  finalScriptWitness,
		  porCommitment,
		  witnessUtxo,
		  bip32Derivation: bip32Derivation.makeConverter(
		    typeFields_1.InputTypes.BIP32_DERIVATION,
		  ),
		  redeemScript: redeemScript.makeConverter(
		    typeFields_1.InputTypes.REDEEM_SCRIPT,
		  ),
		  witnessScript: witnessScript.makeConverter(
		    typeFields_1.InputTypes.WITNESS_SCRIPT,
		  ),
		  checkPubkey: checkPubkey.makeChecker([
		    typeFields_1.InputTypes.PARTIAL_SIG,
		    typeFields_1.InputTypes.BIP32_DERIVATION,
		  ]),
		  tapKeySig,
		  tapScriptSig,
		  tapLeafScript,
		  tapBip32Derivation: tapBip32Derivation.makeConverter(
		    typeFields_1.InputTypes.TAP_BIP32_DERIVATION,
		  ),
		  tapInternalKey: tapInternalKey.makeConverter(
		    typeFields_1.InputTypes.TAP_INTERNAL_KEY,
		  ),
		  tapMerkleRoot,
		};
		converter.inputs = inputs;
		const outputs = {
		  bip32Derivation: bip32Derivation.makeConverter(
		    typeFields_1.OutputTypes.BIP32_DERIVATION,
		  ),
		  redeemScript: redeemScript.makeConverter(
		    typeFields_1.OutputTypes.REDEEM_SCRIPT,
		  ),
		  witnessScript: witnessScript.makeConverter(
		    typeFields_1.OutputTypes.WITNESS_SCRIPT,
		  ),
		  checkPubkey: checkPubkey.makeChecker([
		    typeFields_1.OutputTypes.BIP32_DERIVATION,
		  ]),
		  tapBip32Derivation: tapBip32Derivation.makeConverter(
		    typeFields_1.OutputTypes.TAP_BIP32_DERIVATION,
		  ),
		  tapTree,
		  tapInternalKey: tapInternalKey.makeConverter(
		    typeFields_1.OutputTypes.TAP_INTERNAL_KEY,
		  ),
		};
		converter.outputs = outputs;
		return converter;
	}

	var hasRequiredFromBuffer;

	function requireFromBuffer () {
		if (hasRequiredFromBuffer) return fromBuffer;
		hasRequiredFromBuffer = 1;
		Object.defineProperty(fromBuffer, '__esModule', { value: true });
		const convert = requireConverter();
		const tools_1 = requireTools();
		const varuint = requireVarint();
		const typeFields_1 = requireTypeFields();
		function psbtFromBuffer(buffer, txGetter) {
		  let offset = 0;
		  function varSlice() {
		    const keyLen = varuint.decode(buffer, offset);
		    offset += varuint.encodingLength(keyLen);
		    const key = buffer.slice(offset, offset + keyLen);
		    offset += keyLen;
		    return key;
		  }
		  function readUInt32BE() {
		    const num = buffer.readUInt32BE(offset);
		    offset += 4;
		    return num;
		  }
		  function readUInt8() {
		    const num = buffer.readUInt8(offset);
		    offset += 1;
		    return num;
		  }
		  function getKeyValue() {
		    const key = varSlice();
		    const value = varSlice();
		    return {
		      key,
		      value,
		    };
		  }
		  function checkEndOfKeyValPairs() {
		    if (offset >= buffer.length) {
		      throw new Error('Format Error: Unexpected End of PSBT');
		    }
		    const isEnd = buffer.readUInt8(offset) === 0;
		    if (isEnd) {
		      offset++;
		    }
		    return isEnd;
		  }
		  if (readUInt32BE() !== 0x70736274) {
		    throw new Error('Format Error: Invalid Magic Number');
		  }
		  if (readUInt8() !== 0xff) {
		    throw new Error(
		      'Format Error: Magic Number must be followed by 0xff separator',
		    );
		  }
		  const globalMapKeyVals = [];
		  const globalKeyIndex = {};
		  while (!checkEndOfKeyValPairs()) {
		    const keyVal = getKeyValue();
		    const hexKey = keyVal.key.toString('hex');
		    if (globalKeyIndex[hexKey]) {
		      throw new Error(
		        'Format Error: Keys must be unique for global keymap: key ' + hexKey,
		      );
		    }
		    globalKeyIndex[hexKey] = 1;
		    globalMapKeyVals.push(keyVal);
		  }
		  const unsignedTxMaps = globalMapKeyVals.filter(
		    keyVal => keyVal.key[0] === typeFields_1.GlobalTypes.UNSIGNED_TX,
		  );
		  if (unsignedTxMaps.length !== 1) {
		    throw new Error('Format Error: Only one UNSIGNED_TX allowed');
		  }
		  const unsignedTx = txGetter(unsignedTxMaps[0].value);
		  // Get input and output counts to loop the respective fields
		  const { inputCount, outputCount } = unsignedTx.getInputOutputCounts();
		  const inputKeyVals = [];
		  const outputKeyVals = [];
		  // Get input fields
		  for (const index of tools_1.range(inputCount)) {
		    const inputKeyIndex = {};
		    const input = [];
		    while (!checkEndOfKeyValPairs()) {
		      const keyVal = getKeyValue();
		      const hexKey = keyVal.key.toString('hex');
		      if (inputKeyIndex[hexKey]) {
		        throw new Error(
		          'Format Error: Keys must be unique for each input: ' +
		            'input index ' +
		            index +
		            ' key ' +
		            hexKey,
		        );
		      }
		      inputKeyIndex[hexKey] = 1;
		      input.push(keyVal);
		    }
		    inputKeyVals.push(input);
		  }
		  for (const index of tools_1.range(outputCount)) {
		    const outputKeyIndex = {};
		    const output = [];
		    while (!checkEndOfKeyValPairs()) {
		      const keyVal = getKeyValue();
		      const hexKey = keyVal.key.toString('hex');
		      if (outputKeyIndex[hexKey]) {
		        throw new Error(
		          'Format Error: Keys must be unique for each output: ' +
		            'output index ' +
		            index +
		            ' key ' +
		            hexKey,
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
		    outputKeyVals,
		  });
		}
		fromBuffer.psbtFromBuffer = psbtFromBuffer;
		function checkKeyBuffer(type, keyBuf, keyNum) {
		  if (!keyBuf.equals(bufferExports.Buffer.from([keyNum]))) {
		    throw new Error(
		      `Format Error: Invalid ${type} key: ${keyBuf.toString('hex')}`,
		    );
		  }
		}
		fromBuffer.checkKeyBuffer = checkKeyBuffer;
		function psbtFromKeyVals(
		  unsignedTx,
		  { globalMapKeyVals, inputKeyVals, outputKeyVals },
		) {
		  // That was easy :-)
		  const globalMap = {
		    unsignedTx,
		  };
		  let txCount = 0;
		  for (const keyVal of globalMapKeyVals) {
		    // If a globalMap item needs pubkey, uncomment
		    // const pubkey = convert.globals.checkPubkey(keyVal);
		    switch (keyVal.key[0]) {
		      case typeFields_1.GlobalTypes.UNSIGNED_TX:
		        checkKeyBuffer(
		          'global',
		          keyVal.key,
		          typeFields_1.GlobalTypes.UNSIGNED_TX,
		        );
		        if (txCount > 0) {
		          throw new Error('Format Error: GlobalMap has multiple UNSIGNED_TX');
		        }
		        txCount++;
		        break;
		      case typeFields_1.GlobalTypes.GLOBAL_XPUB:
		        if (globalMap.globalXpub === undefined) {
		          globalMap.globalXpub = [];
		        }
		        globalMap.globalXpub.push(convert.globals.globalXpub.decode(keyVal));
		        break;
		      default:
		        // This will allow inclusion during serialization.
		        if (!globalMap.unknownKeyVals) globalMap.unknownKeyVals = [];
		        globalMap.unknownKeyVals.push(keyVal);
		    }
		  }
		  // Get input and output counts to loop the respective fields
		  const inputCount = inputKeyVals.length;
		  const outputCount = outputKeyVals.length;
		  const inputs = [];
		  const outputs = [];
		  // Get input fields
		  for (const index of tools_1.range(inputCount)) {
		    const input = {};
		    for (const keyVal of inputKeyVals[index]) {
		      convert.inputs.checkPubkey(keyVal);
		      switch (keyVal.key[0]) {
		        case typeFields_1.InputTypes.NON_WITNESS_UTXO:
		          checkKeyBuffer(
		            'input',
		            keyVal.key,
		            typeFields_1.InputTypes.NON_WITNESS_UTXO,
		          );
		          if (input.nonWitnessUtxo !== undefined) {
		            throw new Error(
		              'Format Error: Input has multiple NON_WITNESS_UTXO',
		            );
		          }
		          input.nonWitnessUtxo = convert.inputs.nonWitnessUtxo.decode(keyVal);
		          break;
		        case typeFields_1.InputTypes.WITNESS_UTXO:
		          checkKeyBuffer(
		            'input',
		            keyVal.key,
		            typeFields_1.InputTypes.WITNESS_UTXO,
		          );
		          if (input.witnessUtxo !== undefined) {
		            throw new Error('Format Error: Input has multiple WITNESS_UTXO');
		          }
		          input.witnessUtxo = convert.inputs.witnessUtxo.decode(keyVal);
		          break;
		        case typeFields_1.InputTypes.PARTIAL_SIG:
		          if (input.partialSig === undefined) {
		            input.partialSig = [];
		          }
		          input.partialSig.push(convert.inputs.partialSig.decode(keyVal));
		          break;
		        case typeFields_1.InputTypes.SIGHASH_TYPE:
		          checkKeyBuffer(
		            'input',
		            keyVal.key,
		            typeFields_1.InputTypes.SIGHASH_TYPE,
		          );
		          if (input.sighashType !== undefined) {
		            throw new Error('Format Error: Input has multiple SIGHASH_TYPE');
		          }
		          input.sighashType = convert.inputs.sighashType.decode(keyVal);
		          break;
		        case typeFields_1.InputTypes.REDEEM_SCRIPT:
		          checkKeyBuffer(
		            'input',
		            keyVal.key,
		            typeFields_1.InputTypes.REDEEM_SCRIPT,
		          );
		          if (input.redeemScript !== undefined) {
		            throw new Error('Format Error: Input has multiple REDEEM_SCRIPT');
		          }
		          input.redeemScript = convert.inputs.redeemScript.decode(keyVal);
		          break;
		        case typeFields_1.InputTypes.WITNESS_SCRIPT:
		          checkKeyBuffer(
		            'input',
		            keyVal.key,
		            typeFields_1.InputTypes.WITNESS_SCRIPT,
		          );
		          if (input.witnessScript !== undefined) {
		            throw new Error('Format Error: Input has multiple WITNESS_SCRIPT');
		          }
		          input.witnessScript = convert.inputs.witnessScript.decode(keyVal);
		          break;
		        case typeFields_1.InputTypes.BIP32_DERIVATION:
		          if (input.bip32Derivation === undefined) {
		            input.bip32Derivation = [];
		          }
		          input.bip32Derivation.push(
		            convert.inputs.bip32Derivation.decode(keyVal),
		          );
		          break;
		        case typeFields_1.InputTypes.FINAL_SCRIPTSIG:
		          checkKeyBuffer(
		            'input',
		            keyVal.key,
		            typeFields_1.InputTypes.FINAL_SCRIPTSIG,
		          );
		          input.finalScriptSig = convert.inputs.finalScriptSig.decode(keyVal);
		          break;
		        case typeFields_1.InputTypes.FINAL_SCRIPTWITNESS:
		          checkKeyBuffer(
		            'input',
		            keyVal.key,
		            typeFields_1.InputTypes.FINAL_SCRIPTWITNESS,
		          );
		          input.finalScriptWitness = convert.inputs.finalScriptWitness.decode(
		            keyVal,
		          );
		          break;
		        case typeFields_1.InputTypes.POR_COMMITMENT:
		          checkKeyBuffer(
		            'input',
		            keyVal.key,
		            typeFields_1.InputTypes.POR_COMMITMENT,
		          );
		          input.porCommitment = convert.inputs.porCommitment.decode(keyVal);
		          break;
		        case typeFields_1.InputTypes.TAP_KEY_SIG:
		          checkKeyBuffer(
		            'input',
		            keyVal.key,
		            typeFields_1.InputTypes.TAP_KEY_SIG,
		          );
		          input.tapKeySig = convert.inputs.tapKeySig.decode(keyVal);
		          break;
		        case typeFields_1.InputTypes.TAP_SCRIPT_SIG:
		          if (input.tapScriptSig === undefined) {
		            input.tapScriptSig = [];
		          }
		          input.tapScriptSig.push(convert.inputs.tapScriptSig.decode(keyVal));
		          break;
		        case typeFields_1.InputTypes.TAP_LEAF_SCRIPT:
		          if (input.tapLeafScript === undefined) {
		            input.tapLeafScript = [];
		          }
		          input.tapLeafScript.push(convert.inputs.tapLeafScript.decode(keyVal));
		          break;
		        case typeFields_1.InputTypes.TAP_BIP32_DERIVATION:
		          if (input.tapBip32Derivation === undefined) {
		            input.tapBip32Derivation = [];
		          }
		          input.tapBip32Derivation.push(
		            convert.inputs.tapBip32Derivation.decode(keyVal),
		          );
		          break;
		        case typeFields_1.InputTypes.TAP_INTERNAL_KEY:
		          checkKeyBuffer(
		            'input',
		            keyVal.key,
		            typeFields_1.InputTypes.TAP_INTERNAL_KEY,
		          );
		          input.tapInternalKey = convert.inputs.tapInternalKey.decode(keyVal);
		          break;
		        case typeFields_1.InputTypes.TAP_MERKLE_ROOT:
		          checkKeyBuffer(
		            'input',
		            keyVal.key,
		            typeFields_1.InputTypes.TAP_MERKLE_ROOT,
		          );
		          input.tapMerkleRoot = convert.inputs.tapMerkleRoot.decode(keyVal);
		          break;
		        default:
		          // This will allow inclusion during serialization.
		          if (!input.unknownKeyVals) input.unknownKeyVals = [];
		          input.unknownKeyVals.push(keyVal);
		      }
		    }
		    inputs.push(input);
		  }
		  for (const index of tools_1.range(outputCount)) {
		    const output = {};
		    for (const keyVal of outputKeyVals[index]) {
		      convert.outputs.checkPubkey(keyVal);
		      switch (keyVal.key[0]) {
		        case typeFields_1.OutputTypes.REDEEM_SCRIPT:
		          checkKeyBuffer(
		            'output',
		            keyVal.key,
		            typeFields_1.OutputTypes.REDEEM_SCRIPT,
		          );
		          if (output.redeemScript !== undefined) {
		            throw new Error('Format Error: Output has multiple REDEEM_SCRIPT');
		          }
		          output.redeemScript = convert.outputs.redeemScript.decode(keyVal);
		          break;
		        case typeFields_1.OutputTypes.WITNESS_SCRIPT:
		          checkKeyBuffer(
		            'output',
		            keyVal.key,
		            typeFields_1.OutputTypes.WITNESS_SCRIPT,
		          );
		          if (output.witnessScript !== undefined) {
		            throw new Error('Format Error: Output has multiple WITNESS_SCRIPT');
		          }
		          output.witnessScript = convert.outputs.witnessScript.decode(keyVal);
		          break;
		        case typeFields_1.OutputTypes.BIP32_DERIVATION:
		          if (output.bip32Derivation === undefined) {
		            output.bip32Derivation = [];
		          }
		          output.bip32Derivation.push(
		            convert.outputs.bip32Derivation.decode(keyVal),
		          );
		          break;
		        case typeFields_1.OutputTypes.TAP_INTERNAL_KEY:
		          checkKeyBuffer(
		            'output',
		            keyVal.key,
		            typeFields_1.OutputTypes.TAP_INTERNAL_KEY,
		          );
		          output.tapInternalKey = convert.outputs.tapInternalKey.decode(keyVal);
		          break;
		        case typeFields_1.OutputTypes.TAP_TREE:
		          checkKeyBuffer(
		            'output',
		            keyVal.key,
		            typeFields_1.OutputTypes.TAP_TREE,
		          );
		          output.tapTree = convert.outputs.tapTree.decode(keyVal);
		          break;
		        case typeFields_1.OutputTypes.TAP_BIP32_DERIVATION:
		          if (output.tapBip32Derivation === undefined) {
		            output.tapBip32Derivation = [];
		          }
		          output.tapBip32Derivation.push(
		            convert.outputs.tapBip32Derivation.decode(keyVal),
		          );
		          break;
		        default:
		          if (!output.unknownKeyVals) output.unknownKeyVals = [];
		          output.unknownKeyVals.push(keyVal);
		      }
		    }
		    outputs.push(output);
		  }
		  return { globalMap, inputs, outputs };
		}
		fromBuffer.psbtFromKeyVals = psbtFromKeyVals;
		return fromBuffer;
	}

	var toBuffer = {};

	var hasRequiredToBuffer;

	function requireToBuffer () {
		if (hasRequiredToBuffer) return toBuffer;
		hasRequiredToBuffer = 1;
		Object.defineProperty(toBuffer, '__esModule', { value: true });
		const convert = requireConverter();
		const tools_1 = requireTools();
		function psbtToBuffer({ globalMap, inputs, outputs }) {
		  const { globalKeyVals, inputKeyVals, outputKeyVals } = psbtToKeyVals({
		    globalMap,
		    inputs,
		    outputs,
		  });
		  const globalBuffer = tools_1.keyValsToBuffer(globalKeyVals);
		  const keyValsOrEmptyToBuffer = keyVals =>
		    keyVals.length === 0
		      ? [bufferExports.Buffer.from([0])]
		      : keyVals.map(tools_1.keyValsToBuffer);
		  const inputBuffers = keyValsOrEmptyToBuffer(inputKeyVals);
		  const outputBuffers = keyValsOrEmptyToBuffer(outputKeyVals);
		  const header = bufferExports.Buffer.allocUnsafe(5);
		  header.writeUIntBE(0x70736274ff, 0, 5);
		  return bufferExports.Buffer.concat(
		    [header, globalBuffer].concat(inputBuffers, outputBuffers),
		  );
		}
		toBuffer.psbtToBuffer = psbtToBuffer;
		const sortKeyVals = (a, b) => {
		  return a.key.compare(b.key);
		};
		function keyValsFromMap(keyValMap, converterFactory) {
		  const keyHexSet = new Set();
		  const keyVals = Object.entries(keyValMap).reduce((result, [key, value]) => {
		    if (key === 'unknownKeyVals') return result;
		    // We are checking for undefined anyways. So ignore TS error
		    // @ts-ignore
		    const converter = converterFactory[key];
		    if (converter === undefined) return result;
		    const encodedKeyVals = (Array.isArray(value) ? value : [value]).map(
		      converter.encode,
		    );
		    const keyHexes = encodedKeyVals.map(kv => kv.key.toString('hex'));
		    keyHexes.forEach(hex => {
		      if (keyHexSet.has(hex))
		        throw new Error('Serialize Error: Duplicate key: ' + hex);
		      keyHexSet.add(hex);
		    });
		    return result.concat(encodedKeyVals);
		  }, []);
		  // Get other keyVals that have not yet been gotten
		  const otherKeyVals = keyValMap.unknownKeyVals
		    ? keyValMap.unknownKeyVals.filter(keyVal => {
		        return !keyHexSet.has(keyVal.key.toString('hex'));
		      })
		    : [];
		  return keyVals.concat(otherKeyVals).sort(sortKeyVals);
		}
		function psbtToKeyVals({ globalMap, inputs, outputs }) {
		  // First parse the global keyVals
		  // Get any extra keyvals to pass along
		  return {
		    globalKeyVals: keyValsFromMap(globalMap, convert.globals),
		    inputKeyVals: inputs.map(i => keyValsFromMap(i, convert.inputs)),
		    outputKeyVals: outputs.map(o => keyValsFromMap(o, convert.outputs)),
		  };
		}
		toBuffer.psbtToKeyVals = psbtToKeyVals;
		return toBuffer;
	}

	var hasRequiredParser;

	function requireParser () {
		if (hasRequiredParser) return parser;
		hasRequiredParser = 1;
		(function (exports$1) {
			function __export(m) {
			  for (var p in m) if (!exports$1.hasOwnProperty(p)) exports$1[p] = m[p];
			}
			Object.defineProperty(exports$1, '__esModule', { value: true });
			__export(requireFromBuffer());
			__export(requireToBuffer()); 
		} (parser));
		return parser;
	}

	var hasRequiredCombiner;

	function requireCombiner () {
		if (hasRequiredCombiner) return combiner;
		hasRequiredCombiner = 1;
		Object.defineProperty(combiner, '__esModule', { value: true });
		const parser_1 = requireParser();
		function combine(psbts) {
		  const self = psbts[0];
		  const selfKeyVals = parser_1.psbtToKeyVals(self);
		  const others = psbts.slice(1);
		  if (others.length === 0) throw new Error('Combine: Nothing to combine');
		  const selfTx = getTx(self);
		  if (selfTx === undefined) {
		    throw new Error('Combine: Self missing transaction');
		  }
		  const selfGlobalSet = getKeySet(selfKeyVals.globalKeyVals);
		  const selfInputSets = selfKeyVals.inputKeyVals.map(getKeySet);
		  const selfOutputSets = selfKeyVals.outputKeyVals.map(getKeySet);
		  for (const other of others) {
		    const otherTx = getTx(other);
		    if (
		      otherTx === undefined ||
		      !otherTx.toBuffer().equals(selfTx.toBuffer())
		    ) {
		      throw new Error(
		        'Combine: One of the Psbts does not have the same transaction.',
		      );
		    }
		    const otherKeyVals = parser_1.psbtToKeyVals(other);
		    const otherGlobalSet = getKeySet(otherKeyVals.globalKeyVals);
		    otherGlobalSet.forEach(
		      keyPusher(
		        selfGlobalSet,
		        selfKeyVals.globalKeyVals,
		        otherKeyVals.globalKeyVals,
		      ),
		    );
		    const otherInputSets = otherKeyVals.inputKeyVals.map(getKeySet);
		    otherInputSets.forEach((inputSet, idx) =>
		      inputSet.forEach(
		        keyPusher(
		          selfInputSets[idx],
		          selfKeyVals.inputKeyVals[idx],
		          otherKeyVals.inputKeyVals[idx],
		        ),
		      ),
		    );
		    const otherOutputSets = otherKeyVals.outputKeyVals.map(getKeySet);
		    otherOutputSets.forEach((outputSet, idx) =>
		      outputSet.forEach(
		        keyPusher(
		          selfOutputSets[idx],
		          selfKeyVals.outputKeyVals[idx],
		          otherKeyVals.outputKeyVals[idx],
		        ),
		      ),
		    );
		  }
		  return parser_1.psbtFromKeyVals(selfTx, {
		    globalMapKeyVals: selfKeyVals.globalKeyVals,
		    inputKeyVals: selfKeyVals.inputKeyVals,
		    outputKeyVals: selfKeyVals.outputKeyVals,
		  });
		}
		combiner.combine = combine;
		function keyPusher(selfSet, selfKeyVals, otherKeyVals) {
		  return key => {
		    if (selfSet.has(key)) return;
		    const newKv = otherKeyVals.filter(kv => kv.key.toString('hex') === key)[0];
		    selfKeyVals.push(newKv);
		    selfSet.add(key);
		  };
		}
		function getTx(psbt) {
		  return psbt.globalMap.unsignedTx;
		}
		function getKeySet(keyVals) {
		  const set = new Set();
		  keyVals.forEach(keyVal => {
		    const hex = keyVal.key.toString('hex');
		    if (set.has(hex))
		      throw new Error('Combine: KeyValue Map keys should be unique');
		    set.add(hex);
		  });
		  return set;
		}
		return combiner;
	}

	var utils$2 = {};

	var hasRequiredUtils$2;

	function requireUtils$2 () {
		if (hasRequiredUtils$2) return utils$2;
		hasRequiredUtils$2 = 1;
		(function (exports$1) {
			Object.defineProperty(exports$1, '__esModule', { value: true });
			const converter = requireConverter();
			function checkForInput(inputs, inputIndex) {
			  const input = inputs[inputIndex];
			  if (input === undefined) throw new Error(`No input #${inputIndex}`);
			  return input;
			}
			exports$1.checkForInput = checkForInput;
			function checkForOutput(outputs, outputIndex) {
			  const output = outputs[outputIndex];
			  if (output === undefined) throw new Error(`No output #${outputIndex}`);
			  return output;
			}
			exports$1.checkForOutput = checkForOutput;
			function checkHasKey(checkKeyVal, keyVals, enumLength) {
			  if (checkKeyVal.key[0] < enumLength) {
			    throw new Error(
			      `Use the method for your specific key instead of addUnknownKeyVal*`,
			    );
			  }
			  if (
			    keyVals &&
			    keyVals.filter(kv => kv.key.equals(checkKeyVal.key)).length !== 0
			  ) {
			    throw new Error(`Duplicate Key: ${checkKeyVal.key.toString('hex')}`);
			  }
			}
			exports$1.checkHasKey = checkHasKey;
			function getEnumLength(myenum) {
			  let count = 0;
			  Object.keys(myenum).forEach(val => {
			    if (Number(isNaN(Number(val)))) {
			      count++;
			    }
			  });
			  return count;
			}
			exports$1.getEnumLength = getEnumLength;
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
			      `Input #${inputIndex} has too much or too little data to clean`,
			    );
			  }
			}
			exports$1.inputCheckUncleanFinalized = inputCheckUncleanFinalized;
			function throwForUpdateMaker(typeName, name, expected, data) {
			  throw new Error(
			    `Data for ${typeName} key ${name} is incorrect: Expected ` +
			      `${expected} and got ${JSON.stringify(data)}`,
			  );
			}
			function updateMaker(typeName) {
			  return (updateData, mainData) => {
			    for (const name of Object.keys(updateData)) {
			      // @ts-ignore
			      const data = updateData[name];
			      // @ts-ignore
			      const { canAdd, canAddToArray, check, expected } =
			        // @ts-ignore
			        converter[typeName + 's'][name] || {};
			      const isArray = !!canAddToArray;
			      // If unknown data. ignore and do not add
			      if (check) {
			        if (isArray) {
			          if (
			            !Array.isArray(data) ||
			            // @ts-ignore
			            (mainData[name] && !Array.isArray(mainData[name]))
			          ) {
			            throw new Error(`Key type ${name} must be an array`);
			          }
			          if (!data.every(check)) {
			            throwForUpdateMaker(typeName, name, expected, data);
			          }
			          // @ts-ignore
			          const arr = mainData[name] || [];
			          const dupeCheckSet = new Set();
			          if (!data.every(v => canAddToArray(arr, v, dupeCheckSet))) {
			            throw new Error('Can not add duplicate data to array');
			          }
			          // @ts-ignore
			          mainData[name] = arr.concat(data);
			        } else {
			          if (!check(data)) {
			            throwForUpdateMaker(typeName, name, expected, data);
			          }
			          if (!canAdd(mainData, data)) {
			            throw new Error(`Can not add duplicate data to ${typeName}`);
			          }
			          // @ts-ignore
			          mainData[name] = data;
			        }
			      }
			    }
			  };
			}
			exports$1.updateGlobal = updateMaker('global');
			exports$1.updateInput = updateMaker('input');
			exports$1.updateOutput = updateMaker('output');
			function addInputAttributes(inputs, data) {
			  const index = inputs.length - 1;
			  const input = checkForInput(inputs, index);
			  exports$1.updateInput(data, input);
			}
			exports$1.addInputAttributes = addInputAttributes;
			function addOutputAttributes(outputs, data) {
			  const index = outputs.length - 1;
			  const output = checkForOutput(outputs, index);
			  exports$1.updateOutput(data, output);
			}
			exports$1.addOutputAttributes = addOutputAttributes;
			function defaultVersionSetter(version, txBuf) {
			  if (!bufferExports.Buffer.isBuffer(txBuf) || txBuf.length < 4) {
			    throw new Error('Set Version: Invalid Transaction');
			  }
			  txBuf.writeUInt32LE(version, 0);
			  return txBuf;
			}
			exports$1.defaultVersionSetter = defaultVersionSetter;
			function defaultLocktimeSetter(locktime, txBuf) {
			  if (!bufferExports.Buffer.isBuffer(txBuf) || txBuf.length < 4) {
			    throw new Error('Set Locktime: Invalid Transaction');
			  }
			  txBuf.writeUInt32LE(locktime, txBuf.length - 4);
			  return txBuf;
			}
			exports$1.defaultLocktimeSetter = defaultLocktimeSetter; 
		} (utils$2));
		return utils$2;
	}

	var hasRequiredPsbt$1;

	function requirePsbt$1 () {
		if (hasRequiredPsbt$1) return psbt;
		hasRequiredPsbt$1 = 1;
		Object.defineProperty(psbt, '__esModule', { value: true });
		const combiner_1 = requireCombiner();
		const parser_1 = requireParser();
		const typeFields_1 = requireTypeFields();
		const utils_1 = requireUtils$2();
		class Psbt {
		  constructor(tx) {
		    this.inputs = [];
		    this.outputs = [];
		    this.globalMap = {
		      unsignedTx: tx,
		    };
		  }
		  static fromBase64(data, txFromBuffer) {
		    const buffer = bufferExports.Buffer.from(data, 'base64');
		    return this.fromBuffer(buffer, txFromBuffer);
		  }
		  static fromHex(data, txFromBuffer) {
		    const buffer = bufferExports.Buffer.from(data, 'hex');
		    return this.fromBuffer(buffer, txFromBuffer);
		  }
		  static fromBuffer(buffer, txFromBuffer) {
		    const results = parser_1.psbtFromBuffer(buffer, txFromBuffer);
		    const psbt = new this(results.globalMap.unsignedTx);
		    Object.assign(psbt, results);
		    return psbt;
		  }
		  toBase64() {
		    const buffer = this.toBuffer();
		    return buffer.toString('base64');
		  }
		  toHex() {
		    const buffer = this.toBuffer();
		    return buffer.toString('hex');
		  }
		  toBuffer() {
		    return parser_1.psbtToBuffer(this);
		  }
		  updateGlobal(updateData) {
		    utils_1.updateGlobal(updateData, this.globalMap);
		    return this;
		  }
		  updateInput(inputIndex, updateData) {
		    const input = utils_1.checkForInput(this.inputs, inputIndex);
		    utils_1.updateInput(updateData, input);
		    return this;
		  }
		  updateOutput(outputIndex, updateData) {
		    const output = utils_1.checkForOutput(this.outputs, outputIndex);
		    utils_1.updateOutput(updateData, output);
		    return this;
		  }
		  addUnknownKeyValToGlobal(keyVal) {
		    utils_1.checkHasKey(
		      keyVal,
		      this.globalMap.unknownKeyVals,
		      utils_1.getEnumLength(typeFields_1.GlobalTypes),
		    );
		    if (!this.globalMap.unknownKeyVals) this.globalMap.unknownKeyVals = [];
		    this.globalMap.unknownKeyVals.push(keyVal);
		    return this;
		  }
		  addUnknownKeyValToInput(inputIndex, keyVal) {
		    const input = utils_1.checkForInput(this.inputs, inputIndex);
		    utils_1.checkHasKey(
		      keyVal,
		      input.unknownKeyVals,
		      utils_1.getEnumLength(typeFields_1.InputTypes),
		    );
		    if (!input.unknownKeyVals) input.unknownKeyVals = [];
		    input.unknownKeyVals.push(keyVal);
		    return this;
		  }
		  addUnknownKeyValToOutput(outputIndex, keyVal) {
		    const output = utils_1.checkForOutput(this.outputs, outputIndex);
		    utils_1.checkHasKey(
		      keyVal,
		      output.unknownKeyVals,
		      utils_1.getEnumLength(typeFields_1.OutputTypes),
		    );
		    if (!output.unknownKeyVals) output.unknownKeyVals = [];
		    output.unknownKeyVals.push(keyVal);
		    return this;
		  }
		  addInput(inputData) {
		    this.globalMap.unsignedTx.addInput(inputData);
		    this.inputs.push({
		      unknownKeyVals: [],
		    });
		    const addKeyVals = inputData.unknownKeyVals || [];
		    const inputIndex = this.inputs.length - 1;
		    if (!Array.isArray(addKeyVals)) {
		      throw new Error('unknownKeyVals must be an Array');
		    }
		    addKeyVals.forEach(keyVal =>
		      this.addUnknownKeyValToInput(inputIndex, keyVal),
		    );
		    utils_1.addInputAttributes(this.inputs, inputData);
		    return this;
		  }
		  addOutput(outputData) {
		    this.globalMap.unsignedTx.addOutput(outputData);
		    this.outputs.push({
		      unknownKeyVals: [],
		    });
		    const addKeyVals = outputData.unknownKeyVals || [];
		    const outputIndex = this.outputs.length - 1;
		    if (!Array.isArray(addKeyVals)) {
		      throw new Error('unknownKeyVals must be an Array');
		    }
		    addKeyVals.forEach(keyVal =>
		      this.addUnknownKeyValToOutput(outputIndex, keyVal),
		    );
		    utils_1.addOutputAttributes(this.outputs, outputData);
		    return this;
		  }
		  clearFinalizedInput(inputIndex) {
		    const input = utils_1.checkForInput(this.inputs, inputIndex);
		    utils_1.inputCheckUncleanFinalized(inputIndex, input);
		    for (const key of Object.keys(input)) {
		      if (
		        ![
		          'witnessUtxo',
		          'nonWitnessUtxo',
		          'finalScriptSig',
		          'finalScriptWitness',
		          'unknownKeyVals',
		        ].includes(key)
		      ) {
		        // @ts-ignore
		        delete input[key];
		      }
		    }
		    return this;
		  }
		  combine(...those) {
		    // Combine this with those.
		    // Return self for chaining.
		    const result = combiner_1.combine([this].concat(those));
		    Object.assign(this, result);
		    return this;
		  }
		  getTransaction() {
		    return this.globalMap.unsignedTx.toBuffer();
		  }
		}
		psbt.Psbt = Psbt;
		return psbt;
	}

	var bip371 = {};

	var psbtutils = {};

	var hasRequiredPsbtutils;

	function requirePsbtutils () {
		if (hasRequiredPsbtutils) return psbtutils;
		hasRequiredPsbtutils = 1;
		Object.defineProperty(psbtutils, '__esModule', { value: true });
		psbtutils.signatureBlocksAction =
		  psbtutils.checkInputForSig =
		  psbtutils.pubkeyInScript =
		  psbtutils.pubkeyPositionInScript =
		  psbtutils.witnessStackToScriptWitness =
		  psbtutils.isP2TR =
		  psbtutils.isP2SHScript =
		  psbtutils.isP2WSHScript =
		  psbtutils.isP2WPKH =
		  psbtutils.isP2PKH =
		  psbtutils.isP2PK =
		  psbtutils.isP2MS =
		    void 0;
		const varuint = requireVarint();
		const bscript = requireScript();
		const transaction_1 = requireTransaction();
		const crypto_1 = requireCrypto();
		const payments = requirePayments();
		function isPaymentFactory(payment) {
		  return script => {
		    try {
		      payment({ output: script });
		      return true;
		    } catch (err) {
		      return false;
		    }
		  };
		}
		psbtutils.isP2MS = isPaymentFactory(payments.p2ms);
		psbtutils.isP2PK = isPaymentFactory(payments.p2pk);
		psbtutils.isP2PKH = isPaymentFactory(payments.p2pkh);
		psbtutils.isP2WPKH = isPaymentFactory(payments.p2wpkh);
		psbtutils.isP2WSHScript = isPaymentFactory(payments.p2wsh);
		psbtutils.isP2SHScript = isPaymentFactory(payments.p2sh);
		psbtutils.isP2TR = isPaymentFactory(payments.p2tr);
		/**
		 * Converts a witness stack to a script witness.
		 * @param witness The witness stack to convert.
		 * @returns The script witness as a Buffer.
		 */
		/**
		 * Converts a witness stack to a script witness.
		 * @param witness The witness stack to convert.
		 * @returns The converted script witness.
		 */
		function witnessStackToScriptWitness(witness) {
		  let buffer = bufferExports.Buffer.allocUnsafe(0);
		  function writeSlice(slice) {
		    buffer = bufferExports.Buffer.concat([buffer, bufferExports.Buffer.from(slice)]);
		  }
		  function writeVarInt(i) {
		    const currentLen = buffer.length;
		    const varintLen = varuint.encodingLength(i);
		    buffer = bufferExports.Buffer.concat([buffer, bufferExports.Buffer.allocUnsafe(varintLen)]);
		    varuint.encode(i, buffer, currentLen);
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
		psbtutils.witnessStackToScriptWitness = witnessStackToScriptWitness;
		/**
		 * Finds the position of a public key in a script.
		 * @param pubkey The public key to search for.
		 * @param script The script to search in.
		 * @returns The index of the public key in the script, or -1 if not found.
		 * @throws {Error} If there is an unknown script error.
		 */
		function pubkeyPositionInScript(pubkey, script) {
		  const pubkeyHash = (0, crypto_1.hash160)(pubkey);
		  const pubkeyXOnly = pubkey.slice(1, 33); // slice before calling?
		  const decompiled = bscript.decompile(script);
		  if (decompiled === null) throw new Error('Unknown script error');
		  return decompiled.findIndex(element => {
		    if (typeof element === 'number') return false;
		    return (
		      element.equals(pubkey) ||
		      element.equals(pubkeyHash) ||
		      element.equals(pubkeyXOnly)
		    );
		  });
		}
		psbtutils.pubkeyPositionInScript = pubkeyPositionInScript;
		/**
		 * Checks if a public key is present in a script.
		 * @param pubkey The public key to check.
		 * @param script The script to search in.
		 * @returns A boolean indicating whether the public key is present in the script.
		 */
		function pubkeyInScript(pubkey, script) {
		  return pubkeyPositionInScript(pubkey, script) !== -1;
		}
		psbtutils.pubkeyInScript = pubkeyInScript;
		/**
		 * Checks if an input contains a signature for a specific action.
		 * @param input - The input to check.
		 * @param action - The action to check for.
		 * @returns A boolean indicating whether the input contains a signature for the specified action.
		 */
		function checkInputForSig(input, action) {
		  const pSigs = extractPartialSigs(input);
		  return pSigs.some(pSig =>
		    signatureBlocksAction(pSig, bscript.signature.decode, action),
		  );
		}
		psbtutils.checkInputForSig = checkInputForSig;
		/**
		 * Determines if a given action is allowed for a signature block.
		 * @param signature - The signature block.
		 * @param signatureDecodeFn - The function used to decode the signature.
		 * @param action - The action to be checked.
		 * @returns True if the action is allowed, false otherwise.
		 */
		function signatureBlocksAction(signature, signatureDecodeFn, action) {
		  const { hashType } = signatureDecodeFn(signature);
		  const whitelist = [];
		  const isAnyoneCanPay =
		    hashType & transaction_1.Transaction.SIGHASH_ANYONECANPAY;
		  if (isAnyoneCanPay) whitelist.push('addInput');
		  const hashMod = hashType & 0x1f;
		  switch (hashMod) {
		    case transaction_1.Transaction.SIGHASH_ALL:
		      break;
		    case transaction_1.Transaction.SIGHASH_SINGLE:
		    case transaction_1.Transaction.SIGHASH_NONE:
		      whitelist.push('addOutput');
		      whitelist.push('setInputSequence');
		      break;
		  }
		  if (whitelist.indexOf(action) === -1) {
		    return true;
		  }
		  return false;
		}
		psbtutils.signatureBlocksAction = signatureBlocksAction;
		/**
		 * Extracts the signatures from a PsbtInput object.
		 * If the input has partial signatures, it returns an array of the signatures.
		 * If the input does not have partial signatures, it checks if it has a finalScriptSig or finalScriptWitness.
		 * If it does, it extracts the signatures from the final scripts and returns them.
		 * If none of the above conditions are met, it returns an empty array.
		 *
		 * @param input - The PsbtInput object from which to extract the signatures.
		 * @returns An array of signatures extracted from the PsbtInput object.
		 */
		function extractPartialSigs(input) {
		  let pSigs = [];
		  if ((input.partialSig || []).length === 0) {
		    if (!input.finalScriptSig && !input.finalScriptWitness) return [];
		    pSigs = getPsigsFromInputFinalScripts(input);
		  } else {
		    pSigs = input.partialSig;
		  }
		  return pSigs.map(p => p.signature);
		}
		/**
		 * Retrieves the partial signatures (Psigs) from the input's final scripts.
		 * Psigs are extracted from both the final scriptSig and final scriptWitness of the input.
		 * Only canonical script signatures are considered.
		 *
		 * @param input - The PsbtInput object representing the input.
		 * @returns An array of PartialSig objects containing the extracted Psigs.
		 */
		function getPsigsFromInputFinalScripts(input) {
		  const scriptItems = !input.finalScriptSig
		    ? []
		    : bscript.decompile(input.finalScriptSig) || [];
		  const witnessItems = !input.finalScriptWitness
		    ? []
		    : bscript.decompile(input.finalScriptWitness) || [];
		  return scriptItems
		    .concat(witnessItems)
		    .filter(item => {
		      return bufferExports.Buffer.isBuffer(item) && bscript.isCanonicalScriptSignature(item);
		    })
		    .map(sig => ({ signature: sig }));
		}
		return psbtutils;
	}

	var hasRequiredBip371;

	function requireBip371 () {
		if (hasRequiredBip371) return bip371;
		hasRequiredBip371 = 1;
		Object.defineProperty(bip371, '__esModule', { value: true });
		bip371.checkTaprootInputForSigs =
		  bip371.tapTreeFromList =
		  bip371.tapTreeToList =
		  bip371.tweakInternalPubKey =
		  bip371.checkTaprootOutputFields =
		  bip371.checkTaprootInputFields =
		  bip371.isTaprootOutput =
		  bip371.isTaprootInput =
		  bip371.serializeTaprootSignature =
		  bip371.tapScriptFinalizer =
		  bip371.toXOnly =
		    void 0;
		const types_1 = requireTypes();
		const transaction_1 = requireTransaction();
		const psbtutils_1 = requirePsbtutils();
		const bip341_1 = requireBip341();
		const payments_1 = requirePayments();
		const psbtutils_2 = requirePsbtutils();
		const toXOnly = pubKey => (pubKey.length === 32 ? pubKey : pubKey.slice(1, 33));
		bip371.toXOnly = toXOnly;
		/**
		 * Default tapscript finalizer. It searches for the `tapLeafHashToFinalize` if provided.
		 * Otherwise it will search for the tapleaf that has at least one signature and has the shortest path.
		 * @param inputIndex the position of the PSBT input.
		 * @param input the PSBT input.
		 * @param tapLeafHashToFinalize optional, if provided the finalizer will search for a tapleaf that has this hash
		 *                              and will try to build the finalScriptWitness.
		 * @returns the finalScriptWitness or throws an exception if no tapleaf found.
		 */
		function tapScriptFinalizer(inputIndex, input, tapLeafHashToFinalize) {
		  const tapLeaf = findTapLeafToFinalize(
		    input,
		    inputIndex,
		    tapLeafHashToFinalize,
		  );
		  try {
		    const sigs = sortSignatures(input, tapLeaf);
		    const witness = sigs.concat(tapLeaf.script).concat(tapLeaf.controlBlock);
		    return {
		      finalScriptWitness: (0, psbtutils_1.witnessStackToScriptWitness)(witness),
		    };
		  } catch (err) {
		    throw new Error(`Can not finalize taproot input #${inputIndex}: ${err}`);
		  }
		}
		bip371.tapScriptFinalizer = tapScriptFinalizer;
		function serializeTaprootSignature(sig, sighashType) {
		  const sighashTypeByte = sighashType
		    ? bufferExports.Buffer.from([sighashType])
		    : bufferExports.Buffer.from([]);
		  return bufferExports.Buffer.concat([sig, sighashTypeByte]);
		}
		bip371.serializeTaprootSignature = serializeTaprootSignature;
		function isTaprootInput(input) {
		  return (
		    input &&
		    !!(
		      input.tapInternalKey ||
		      input.tapMerkleRoot ||
		      (input.tapLeafScript && input.tapLeafScript.length) ||
		      (input.tapBip32Derivation && input.tapBip32Derivation.length) ||
		      (input.witnessUtxo && (0, psbtutils_1.isP2TR)(input.witnessUtxo.script))
		    )
		  );
		}
		bip371.isTaprootInput = isTaprootInput;
		function isTaprootOutput(output, script) {
		  return (
		    output &&
		    !!(
		      output.tapInternalKey ||
		      output.tapTree ||
		      (output.tapBip32Derivation && output.tapBip32Derivation.length) ||
		      (script && (0, psbtutils_1.isP2TR)(script))
		    )
		  );
		}
		bip371.isTaprootOutput = isTaprootOutput;
		function checkTaprootInputFields(inputData, newInputData, action) {
		  checkMixedTaprootAndNonTaprootInputFields(inputData, newInputData, action);
		  checkIfTapLeafInTree(inputData, newInputData, action);
		}
		bip371.checkTaprootInputFields = checkTaprootInputFields;
		function checkTaprootOutputFields(outputData, newOutputData, action) {
		  checkMixedTaprootAndNonTaprootOutputFields(outputData, newOutputData, action);
		  checkTaprootScriptPubkey(outputData, newOutputData);
		}
		bip371.checkTaprootOutputFields = checkTaprootOutputFields;
		function checkTaprootScriptPubkey(outputData, newOutputData) {
		  if (!newOutputData.tapTree && !newOutputData.tapInternalKey) return;
		  const tapInternalKey =
		    newOutputData.tapInternalKey || outputData.tapInternalKey;
		  const tapTree = newOutputData.tapTree || outputData.tapTree;
		  if (tapInternalKey) {
		    const { script: scriptPubkey } = outputData;
		    const script = getTaprootScripPubkey(tapInternalKey, tapTree);
		    if (scriptPubkey && !scriptPubkey.equals(script))
		      throw new Error('Error adding output. Script or address missmatch.');
		  }
		}
		function getTaprootScripPubkey(tapInternalKey, tapTree) {
		  const scriptTree = tapTree && tapTreeFromList(tapTree.leaves);
		  const { output } = (0, payments_1.p2tr)({
		    internalPubkey: tapInternalKey,
		    scriptTree,
		  });
		  return output;
		}
		function tweakInternalPubKey(inputIndex, input) {
		  const tapInternalKey = input.tapInternalKey;
		  const outputKey =
		    tapInternalKey &&
		    (0, bip341_1.tweakKey)(tapInternalKey, input.tapMerkleRoot);
		  if (!outputKey)
		    throw new Error(
		      `Cannot tweak tap internal key for input #${inputIndex}. Public key: ${
	        tapInternalKey && tapInternalKey.toString('hex')
	      }`,
		    );
		  return outputKey.x;
		}
		bip371.tweakInternalPubKey = tweakInternalPubKey;
		/**
		 * Convert a binary tree to a BIP371 type list. Each element of the list is (according to BIP371):
		 * One or more tuples representing the depth, leaf version, and script for a leaf in the Taproot tree,
		 * allowing the entire tree to be reconstructed. The tuples must be in depth first search order so that
		 * the tree is correctly reconstructed.
		 * @param tree the binary tap tree
		 * @returns a list of BIP 371 tapleaves
		 */
		function tapTreeToList(tree) {
		  if (!(0, types_1.isTaptree)(tree))
		    throw new Error(
		      'Cannot convert taptree to tapleaf list. Expecting a tapree structure.',
		    );
		  return _tapTreeToList(tree);
		}
		bip371.tapTreeToList = tapTreeToList;
		/**
		 * Convert a BIP371 TapLeaf list to a TapTree (binary).
		 * @param leaves a list of tapleaves where each element of the list is (according to BIP371):
		 * One or more tuples representing the depth, leaf version, and script for a leaf in the Taproot tree,
		 * allowing the entire tree to be reconstructed. The tuples must be in depth first search order so that
		 * the tree is correctly reconstructed.
		 * @returns the corresponding taptree, or throws an exception if the tree cannot be reconstructed
		 */
		function tapTreeFromList(leaves = []) {
		  if (leaves.length === 1 && leaves[0].depth === 0)
		    return {
		      output: leaves[0].script,
		      version: leaves[0].leafVersion,
		    };
		  return instertLeavesInTree(leaves);
		}
		bip371.tapTreeFromList = tapTreeFromList;
		function checkTaprootInputForSigs(input, action) {
		  const sigs = extractTaprootSigs(input);
		  return sigs.some(sig =>
		    (0, psbtutils_2.signatureBlocksAction)(sig, decodeSchnorrSignature, action),
		  );
		}
		bip371.checkTaprootInputForSigs = checkTaprootInputForSigs;
		function decodeSchnorrSignature(signature) {
		  return {
		    signature: signature.slice(0, 64),
		    hashType:
		      signature.slice(64)[0] || transaction_1.Transaction.SIGHASH_DEFAULT,
		  };
		}
		function extractTaprootSigs(input) {
		  const sigs = [];
		  if (input.tapKeySig) sigs.push(input.tapKeySig);
		  if (input.tapScriptSig)
		    sigs.push(...input.tapScriptSig.map(s => s.signature));
		  if (!sigs.length) {
		    const finalTapKeySig = getTapKeySigFromWithness(input.finalScriptWitness);
		    if (finalTapKeySig) sigs.push(finalTapKeySig);
		  }
		  return sigs;
		}
		function getTapKeySigFromWithness(finalScriptWitness) {
		  if (!finalScriptWitness) return;
		  const witness = finalScriptWitness.slice(2);
		  // todo: add schnorr signature validation
		  if (witness.length === 64 || witness.length === 65) return witness;
		}
		function _tapTreeToList(tree, leaves = [], depth = 0) {
		  if (depth > bip341_1.MAX_TAPTREE_DEPTH)
		    throw new Error('Max taptree depth exceeded.');
		  if (!tree) return [];
		  if ((0, types_1.isTapleaf)(tree)) {
		    leaves.push({
		      depth,
		      leafVersion: tree.version || bip341_1.LEAF_VERSION_TAPSCRIPT,
		      script: tree.output,
		    });
		    return leaves;
		  }
		  if (tree[0]) _tapTreeToList(tree[0], leaves, depth + 1);
		  if (tree[1]) _tapTreeToList(tree[1], leaves, depth + 1);
		  return leaves;
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
		  if (depth > bip341_1.MAX_TAPTREE_DEPTH)
		    throw new Error('Max taptree depth exceeded.');
		  if (leaf.depth === depth) {
		    if (!tree)
		      return {
		        output: leaf.script,
		        version: leaf.leafVersion,
		      };
		    return;
		  }
		  if ((0, types_1.isTapleaf)(tree)) return;
		  const leftSide = instertLeafInTree(leaf, tree && tree[0], depth + 1);
		  if (leftSide) return [leftSide, tree && tree[1]];
		  const rightSide = instertLeafInTree(leaf, tree && tree[1], depth + 1);
		  if (rightSide) return [tree && tree[0], rightSide];
		}
		function checkMixedTaprootAndNonTaprootInputFields(
		  inputData,
		  newInputData,
		  action,
		) {
		  const isBadTaprootUpdate =
		    isTaprootInput(inputData) && hasNonTaprootFields(newInputData);
		  const isBadNonTaprootUpdate =
		    hasNonTaprootFields(inputData) && isTaprootInput(newInputData);
		  const hasMixedFields =
		    inputData === newInputData &&
		    isTaprootInput(newInputData) &&
		    hasNonTaprootFields(newInputData); // todo: bad? use !===
		  if (isBadTaprootUpdate || isBadNonTaprootUpdate || hasMixedFields)
		    throw new Error(
		      `Invalid arguments for Psbt.${action}. ` +
		        `Cannot use both taproot and non-taproot fields.`,
		    );
		}
		function checkMixedTaprootAndNonTaprootOutputFields(
		  inputData,
		  newInputData,
		  action,
		) {
		  const isBadTaprootUpdate =
		    isTaprootOutput(inputData) && hasNonTaprootFields(newInputData);
		  const isBadNonTaprootUpdate =
		    hasNonTaprootFields(inputData) && isTaprootOutput(newInputData);
		  const hasMixedFields =
		    inputData === newInputData &&
		    isTaprootOutput(newInputData) &&
		    hasNonTaprootFields(newInputData);
		  if (isBadTaprootUpdate || isBadNonTaprootUpdate || hasMixedFields)
		    throw new Error(
		      `Invalid arguments for Psbt.${action}. ` +
		        `Cannot use both taproot and non-taproot fields.`,
		    );
		}
		/**
		 * Checks if the tap leaf is part of the tap tree for the given input data.
		 * Throws an error if the tap leaf is not part of the tap tree.
		 * @param inputData - The original PsbtInput data.
		 * @param newInputData - The new PsbtInput data.
		 * @param action - The action being performed.
		 * @throws {Error} - If the tap leaf is not part of the tap tree.
		 */
		function checkIfTapLeafInTree(inputData, newInputData, action) {
		  if (newInputData.tapMerkleRoot) {
		    const newLeafsInTree = (newInputData.tapLeafScript || []).every(l =>
		      isTapLeafInTree(l, newInputData.tapMerkleRoot),
		    );
		    const oldLeafsInTree = (inputData.tapLeafScript || []).every(l =>
		      isTapLeafInTree(l, newInputData.tapMerkleRoot),
		    );
		    if (!newLeafsInTree || !oldLeafsInTree)
		      throw new Error(
		        `Invalid arguments for Psbt.${action}. Tapleaf not part of taptree.`,
		      );
		  } else if (inputData.tapMerkleRoot) {
		    const newLeafsInTree = (newInputData.tapLeafScript || []).every(l =>
		      isTapLeafInTree(l, inputData.tapMerkleRoot),
		    );
		    if (!newLeafsInTree)
		      throw new Error(
		        `Invalid arguments for Psbt.${action}. Tapleaf not part of taptree.`,
		      );
		  }
		}
		/**
		 * Checks if a TapLeafScript is present in a Merkle tree.
		 * @param tapLeaf The TapLeafScript to check.
		 * @param merkleRoot The Merkle root of the tree. If not provided, the function assumes the TapLeafScript is present.
		 * @returns A boolean indicating whether the TapLeafScript is present in the tree.
		 */
		function isTapLeafInTree(tapLeaf, merkleRoot) {
		  if (!merkleRoot) return true;
		  const leafHash = (0, bip341_1.tapleafHash)({
		    output: tapLeaf.script,
		    version: tapLeaf.leafVersion,
		  });
		  const rootHash = (0, bip341_1.rootHashFromPath)(
		    tapLeaf.controlBlock,
		    leafHash,
		  );
		  return rootHash.equals(merkleRoot);
		}
		/**
		 * Sorts the signatures in the input's tapScriptSig array based on their position in the tapLeaf script.
		 *
		 * @param input - The PsbtInput object.
		 * @param tapLeaf - The TapLeafScript object.
		 * @returns An array of sorted signatures as Buffers.
		 */
		function sortSignatures(input, tapLeaf) {
		  const leafHash = (0, bip341_1.tapleafHash)({
		    output: tapLeaf.script,
		    version: tapLeaf.leafVersion,
		  });
		  return (input.tapScriptSig || [])
		    .filter(tss => tss.leafHash.equals(leafHash))
		    .map(tss => addPubkeyPositionInScript(tapLeaf.script, tss))
		    .sort((t1, t2) => t2.positionInScript - t1.positionInScript)
		    .map(t => t.signature);
		}
		/**
		 * Adds the position of a public key in a script to a TapScriptSig object.
		 * @param script The script in which to find the position of the public key.
		 * @param tss The TapScriptSig object to add the position to.
		 * @returns A TapScriptSigWitPosition object with the added position.
		 */
		function addPubkeyPositionInScript(script, tss) {
		  return Object.assign(
		    {
		      positionInScript: (0, psbtutils_1.pubkeyPositionInScript)(
		        tss.pubkey,
		        script,
		      ),
		    },
		    tss,
		  );
		}
		/**
		 * Find tapleaf by hash, or get the signed tapleaf with the shortest path.
		 */
		function findTapLeafToFinalize(input, inputIndex, leafHashToFinalize) {
		  if (!input.tapScriptSig || !input.tapScriptSig.length)
		    throw new Error(
		      `Can not finalize taproot input #${inputIndex}. No tapleaf script signature provided.`,
		    );
		  const tapLeaf = (input.tapLeafScript || [])
		    .sort((a, b) => a.controlBlock.length - b.controlBlock.length)
		    .find(leaf =>
		      canFinalizeLeaf(leaf, input.tapScriptSig, leafHashToFinalize),
		    );
		  if (!tapLeaf)
		    throw new Error(
		      `Can not finalize taproot input #${inputIndex}. Signature for tapleaf script not found.`,
		    );
		  return tapLeaf;
		}
		/**
		 * Determines whether a TapLeafScript can be finalized.
		 *
		 * @param leaf - The TapLeafScript to check.
		 * @param tapScriptSig - The array of TapScriptSig objects.
		 * @param hash - The optional hash to compare with the leaf hash.
		 * @returns A boolean indicating whether the TapLeafScript can be finalized.
		 */
		function canFinalizeLeaf(leaf, tapScriptSig, hash) {
		  const leafHash = (0, bip341_1.tapleafHash)({
		    output: leaf.script,
		    version: leaf.leafVersion,
		  });
		  const whiteListedHash = !hash || hash.equals(leafHash);
		  return (
		    whiteListedHash &&
		    tapScriptSig.find(tss => tss.leafHash.equals(leafHash)) !== undefined
		  );
		}
		/**
		 * Checks if the given PsbtInput or PsbtOutput has non-taproot fields.
		 * Non-taproot fields include redeemScript, witnessScript, and bip32Derivation.
		 * @param io The PsbtInput or PsbtOutput to check.
		 * @returns A boolean indicating whether the given input or output has non-taproot fields.
		 */
		function hasNonTaprootFields(io) {
		  return (
		    io &&
		    !!(
		      io.redeemScript ||
		      io.witnessScript ||
		      (io.bip32Derivation && io.bip32Derivation.length)
		    )
		  );
		}
		return bip371;
	}

	var hasRequiredPsbt;

	function requirePsbt () {
		if (hasRequiredPsbt) return psbt$1;
		hasRequiredPsbt = 1;
		Object.defineProperty(psbt$1, '__esModule', { value: true });
		psbt$1.Psbt = void 0;
		const bip174_1 = requirePsbt$1();
		const varuint = requireVarint();
		const utils_1 = requireUtils$2();
		const address_1 = requireAddress();
		const bufferutils_1 = requireBufferutils();
		const networks_1 = requireNetworks();
		const payments = requirePayments();
		const bip341_1 = requireBip341();
		const bscript = requireScript();
		const transaction_1 = requireTransaction();
		const bip371_1 = requireBip371();
		const psbtutils_1 = requirePsbtutils();
		/**
		 * These are the default arguments for a Psbt instance.
		 */
		const DEFAULT_OPTS = {
		  /**
		   * A bitcoinjs Network object. This is only used if you pass an `address`
		   * parameter to addOutput. Otherwise it is not needed and can be left default.
		   */
		  network: networks_1.bitcoin,
		  /**
		   * When extractTransaction is called, the fee rate is checked.
		   * THIS IS NOT TO BE RELIED ON.
		   * It is only here as a last ditch effort to prevent sending a 500 BTC fee etc.
		   */
		  maximumFeeRate: 5000, // satoshi per byte
		};
		/**
		 * Psbt class can parse and generate a PSBT binary based off of the BIP174.
		 * There are 6 roles that this class fulfills. (Explained in BIP174)
		 *
		 * Creator: This can be done with `new Psbt()`
		 *
		 * Updater: This can be done with `psbt.addInput(input)`, `psbt.addInputs(inputs)`,
		 *   `psbt.addOutput(output)`, `psbt.addOutputs(outputs)` when you are looking to
		 *   add new inputs and outputs to the PSBT, and `psbt.updateGlobal(itemObject)`,
		 *   `psbt.updateInput(itemObject)`, `psbt.updateOutput(itemObject)`
		 *   addInput requires hash: Buffer | string; and index: number; as attributes
		 *   and can also include any attributes that are used in updateInput method.
		 *   addOutput requires script: Buffer; and value: number; and likewise can include
		 *   data for updateOutput.
		 *   For a list of what attributes should be what types. Check the bip174 library.
		 *   Also, check the integration tests for some examples of usage.
		 *
		 * Signer: There are a few methods. signAllInputs and signAllInputsAsync, which will search all input
		 *   information for your pubkey or pubkeyhash, and only sign inputs where it finds
		 *   your info. Or you can explicitly sign a specific input with signInput and
		 *   signInputAsync. For the async methods you can create a SignerAsync object
		 *   and use something like a hardware wallet to sign with. (You must implement this)
		 *
		 * Combiner: psbts can be combined easily with `psbt.combine(psbt2, psbt3, psbt4 ...)`
		 *   the psbt calling combine will always have precedence when a conflict occurs.
		 *   Combine checks if the internal bitcoin transaction is the same, so be sure that
		 *   all sequences, version, locktime, etc. are the same before combining.
		 *
		 * Input Finalizer: This role is fairly important. Not only does it need to construct
		 *   the input scriptSigs and witnesses, but it SHOULD verify the signatures etc.
		 *   Before running `psbt.finalizeAllInputs()` please run `psbt.validateSignaturesOfAllInputs()`
		 *   Running any finalize method will delete any data in the input(s) that are no longer
		 *   needed due to the finalized scripts containing the information.
		 *
		 * Transaction Extractor: This role will perform some checks before returning a
		 *   Transaction object. Such as fee rate not being larger than maximumFeeRate etc.
		 */
		class Psbt {
		  static fromBase64(data, opts = {}) {
		    const buffer = bufferExports.Buffer.from(data, 'base64');
		    return this.fromBuffer(buffer, opts);
		  }
		  static fromHex(data, opts = {}) {
		    const buffer = bufferExports.Buffer.from(data, 'hex');
		    return this.fromBuffer(buffer, opts);
		  }
		  static fromBuffer(buffer, opts = {}) {
		    const psbtBase = bip174_1.Psbt.fromBuffer(buffer, transactionFromBuffer);
		    const psbt = new Psbt(opts, psbtBase);
		    checkTxForDupeIns(psbt.__CACHE.__TX, psbt.__CACHE);
		    return psbt;
		  }
		  constructor(opts = {}, data = new bip174_1.Psbt(new PsbtTransaction())) {
		    this.data = data;
		    // set defaults
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
		      __UNSAFE_SIGN_NONSEGWIT: false,
		    };
		    if (this.data.inputs.length === 0) this.setVersion(2);
		    // Make data hidden when enumerating
		    const dpew = (obj, attr, enumerable, writable) =>
		      Object.defineProperty(obj, attr, {
		        enumerable,
		        writable,
		      });
		    dpew(this, '__CACHE', false, true);
		    dpew(this, 'opts', false, true);
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
		    return this.__CACHE.__TX.ins.map(input => ({
		      hash: (0, bufferutils_1.cloneBuffer)(input.hash),
		      index: input.index,
		      sequence: input.sequence,
		    }));
		  }
		  get txOutputs() {
		    return this.__CACHE.__TX.outs.map(output => {
		      let address;
		      try {
		        address = (0, address_1.fromOutputScript)(
		          output.script,
		          this.opts.network,
		        );
		      } catch (_) {}
		      return {
		        script: (0, bufferutils_1.cloneBuffer)(output.script),
		        value: output.value,
		        address,
		      };
		    });
		  }
		  combine(...those) {
		    this.data.combine(...those.map(o => o.data));
		    return this;
		  }
		  clone() {
		    // TODO: more efficient cloning
		    const res = Psbt.fromBuffer(this.data.toBuffer());
		    res.opts = JSON.parse(JSON.stringify(this.opts));
		    return res;
		  }
		  setMaximumFeeRate(satoshiPerByte) {
		    check32Bit(satoshiPerByte); // 42.9 BTC per byte IS excessive... so throw
		    this.opts.maximumFeeRate = satoshiPerByte;
		  }
		  setVersion(version) {
		    check32Bit(version);
		    checkInputsForPartialSig(this.data.inputs, 'setVersion');
		    const c = this.__CACHE;
		    c.__TX.version = version;
		    c.__EXTRACTED_TX = undefined;
		    return this;
		  }
		  setLocktime(locktime) {
		    check32Bit(locktime);
		    checkInputsForPartialSig(this.data.inputs, 'setLocktime');
		    const c = this.__CACHE;
		    c.__TX.locktime = locktime;
		    c.__EXTRACTED_TX = undefined;
		    return this;
		  }
		  setInputSequence(inputIndex, sequence) {
		    check32Bit(sequence);
		    checkInputsForPartialSig(this.data.inputs, 'setInputSequence');
		    const c = this.__CACHE;
		    if (c.__TX.ins.length <= inputIndex) {
		      throw new Error('Input index too high');
		    }
		    c.__TX.ins[inputIndex].sequence = sequence;
		    c.__EXTRACTED_TX = undefined;
		    return this;
		  }
		  addInputs(inputDatas) {
		    inputDatas.forEach(inputData => this.addInput(inputData));
		    return this;
		  }
		  addInput(inputData) {
		    if (
		      arguments.length > 1 ||
		      !inputData ||
		      inputData.hash === undefined ||
		      inputData.index === undefined
		    ) {
		      throw new Error(
		        `Invalid arguments for Psbt.addInput. ` +
		          `Requires single object with at least [hash] and [index]`,
		      );
		    }
		    (0, bip371_1.checkTaprootInputFields)(inputData, inputData, 'addInput');
		    checkInputsForPartialSig(this.data.inputs, 'addInput');
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
		    c.__FEE = undefined;
		    c.__FEE_RATE = undefined;
		    c.__EXTRACTED_TX = undefined;
		    return this;
		  }
		  addOutputs(outputDatas) {
		    outputDatas.forEach(outputData => this.addOutput(outputData));
		    return this;
		  }
		  addOutput(outputData) {
		    if (
		      arguments.length > 1 ||
		      !outputData ||
		      outputData.value === undefined ||
		      (outputData.address === undefined && outputData.script === undefined)
		    ) {
		      throw new Error(
		        `Invalid arguments for Psbt.addOutput. ` +
		          `Requires single object with at least [script or address] and [value]`,
		      );
		    }
		    checkInputsForPartialSig(this.data.inputs, 'addOutput');
		    const { address } = outputData;
		    if (typeof address === 'string') {
		      const { network } = this.opts;
		      const script = (0, address_1.toOutputScript)(address, network);
		      outputData = Object.assign({}, outputData, { script });
		    }
		    (0, bip371_1.checkTaprootOutputFields)(outputData, outputData, 'addOutput');
		    const c = this.__CACHE;
		    this.data.addOutput(outputData);
		    c.__FEE = undefined;
		    c.__FEE_RATE = undefined;
		    c.__EXTRACTED_TX = undefined;
		    return this;
		  }
		  extractTransaction(disableFeeCheck) {
		    if (!this.data.inputs.every(isFinalized)) throw new Error('Not finalized');
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
		      '__FEE_RATE',
		      'fee rate',
		      this.data.inputs,
		      this.__CACHE,
		    );
		  }
		  getFee() {
		    return getTxCacheValue('__FEE', 'fee', this.data.inputs, this.__CACHE);
		  }
		  finalizeAllInputs() {
		    (0, utils_1.checkForInput)(this.data.inputs, 0); // making sure we have at least one
		    range(this.data.inputs.length).forEach(idx => this.finalizeInput(idx));
		    return this;
		  }
		  finalizeInput(inputIndex, finalScriptsFunc) {
		    const input = (0, utils_1.checkForInput)(this.data.inputs, inputIndex);
		    if ((0, bip371_1.isTaprootInput)(input))
		      return this._finalizeTaprootInput(
		        inputIndex,
		        input,
		        undefined,
		        finalScriptsFunc,
		      );
		    return this._finalizeInput(inputIndex, input, finalScriptsFunc);
		  }
		  finalizeTaprootInput(
		    inputIndex,
		    tapLeafHashToFinalize,
		    finalScriptsFunc = bip371_1.tapScriptFinalizer,
		  ) {
		    const input = (0, utils_1.checkForInput)(this.data.inputs, inputIndex);
		    if ((0, bip371_1.isTaprootInput)(input))
		      return this._finalizeTaprootInput(
		        inputIndex,
		        input,
		        tapLeafHashToFinalize,
		        finalScriptsFunc,
		      );
		    throw new Error(`Cannot finalize input #${inputIndex}. Not Taproot.`);
		  }
		  _finalizeInput(inputIndex, input, finalScriptsFunc = getFinalScripts) {
		    const { script, isP2SH, isP2WSH, isSegwit } = getScriptFromInput(
		      inputIndex,
		      input,
		      this.__CACHE,
		    );
		    if (!script) throw new Error(`No script found for input #${inputIndex}`);
		    checkPartialSigSighashes(input);
		    const { finalScriptSig, finalScriptWitness } = finalScriptsFunc(
		      inputIndex,
		      input,
		      script,
		      isSegwit,
		      isP2SH,
		      isP2WSH,
		    );
		    if (finalScriptSig) this.data.updateInput(inputIndex, { finalScriptSig });
		    if (finalScriptWitness)
		      this.data.updateInput(inputIndex, { finalScriptWitness });
		    if (!finalScriptSig && !finalScriptWitness)
		      throw new Error(`Unknown error finalizing input #${inputIndex}`);
		    this.data.clearFinalizedInput(inputIndex);
		    return this;
		  }
		  _finalizeTaprootInput(
		    inputIndex,
		    input,
		    tapLeafHashToFinalize,
		    finalScriptsFunc = bip371_1.tapScriptFinalizer,
		  ) {
		    if (!input.witnessUtxo)
		      throw new Error(
		        `Cannot finalize input #${inputIndex}. Missing withness utxo.`,
		      );
		    // Check key spend first. Increased privacy and reduced block space.
		    if (input.tapKeySig) {
		      const payment = payments.p2tr({
		        output: input.witnessUtxo.script,
		        signature: input.tapKeySig,
		      });
		      const finalScriptWitness = (0, psbtutils_1.witnessStackToScriptWitness)(
		        payment.witness,
		      );
		      this.data.updateInput(inputIndex, { finalScriptWitness });
		    } else {
		      const { finalScriptWitness } = finalScriptsFunc(
		        inputIndex,
		        input,
		        tapLeafHashToFinalize,
		      );
		      this.data.updateInput(inputIndex, { finalScriptWitness });
		    }
		    this.data.clearFinalizedInput(inputIndex);
		    return this;
		  }
		  getInputType(inputIndex) {
		    const input = (0, utils_1.checkForInput)(this.data.inputs, inputIndex);
		    const script = getScriptFromUtxo(inputIndex, input, this.__CACHE);
		    const result = getMeaningfulScript(
		      script,
		      inputIndex,
		      'input',
		      input.redeemScript || redeemFromFinalScriptSig(input.finalScriptSig),
		      input.witnessScript ||
		        redeemFromFinalWitnessScript(input.finalScriptWitness),
		    );
		    const type = result.type === 'raw' ? '' : result.type + '-';
		    const mainType = classifyScript(result.meaningfulScript);
		    return type + mainType;
		  }
		  inputHasPubkey(inputIndex, pubkey) {
		    const input = (0, utils_1.checkForInput)(this.data.inputs, inputIndex);
		    return pubkeyInInput(pubkey, input, inputIndex, this.__CACHE);
		  }
		  inputHasHDKey(inputIndex, root) {
		    const input = (0, utils_1.checkForInput)(this.data.inputs, inputIndex);
		    const derivationIsMine = bip32DerivationIsMine(root);
		    return (
		      !!input.bip32Derivation && input.bip32Derivation.some(derivationIsMine)
		    );
		  }
		  outputHasPubkey(outputIndex, pubkey) {
		    const output = (0, utils_1.checkForOutput)(this.data.outputs, outputIndex);
		    return pubkeyInOutput(pubkey, output, outputIndex, this.__CACHE);
		  }
		  outputHasHDKey(outputIndex, root) {
		    const output = (0, utils_1.checkForOutput)(this.data.outputs, outputIndex);
		    const derivationIsMine = bip32DerivationIsMine(root);
		    return (
		      !!output.bip32Derivation && output.bip32Derivation.some(derivationIsMine)
		    );
		  }
		  validateSignaturesOfAllInputs(validator) {
		    (0, utils_1.checkForInput)(this.data.inputs, 0); // making sure we have at least one
		    const results = range(this.data.inputs.length).map(idx =>
		      this.validateSignaturesOfInput(idx, validator),
		    );
		    return results.reduce((final, res) => res === true && final, true);
		  }
		  validateSignaturesOfInput(inputIndex, validator, pubkey) {
		    const input = this.data.inputs[inputIndex];
		    if ((0, bip371_1.isTaprootInput)(input))
		      return this.validateSignaturesOfTaprootInput(
		        inputIndex,
		        validator,
		        pubkey,
		      );
		    return this._validateSignaturesOfInput(inputIndex, validator, pubkey);
		  }
		  _validateSignaturesOfInput(inputIndex, validator, pubkey) {
		    const input = this.data.inputs[inputIndex];
		    const partialSig = (input || {}).partialSig;
		    if (!input || !partialSig || partialSig.length < 1)
		      throw new Error('No signatures to validate');
		    if (typeof validator !== 'function')
		      throw new Error('Need validator function to validate signatures');
		    const mySigs = pubkey
		      ? partialSig.filter(sig => sig.pubkey.equals(pubkey))
		      : partialSig;
		    if (mySigs.length < 1) throw new Error('No signatures for this pubkey');
		    const results = [];
		    let hashCache;
		    let scriptCache;
		    let sighashCache;
		    for (const pSig of mySigs) {
		      const sig = bscript.signature.decode(pSig.signature);
		      const { hash, script } =
		        sighashCache !== sig.hashType
		          ? getHashForSig(
		              inputIndex,
		              Object.assign({}, input, { sighashType: sig.hashType }),
		              this.__CACHE,
		              true,
		            )
		          : { hash: hashCache, script: scriptCache };
		      sighashCache = sig.hashType;
		      hashCache = hash;
		      scriptCache = script;
		      checkScriptForPubkey(pSig.pubkey, script, 'verify');
		      results.push(validator(pSig.pubkey, hash, sig.signature));
		    }
		    return results.every(res => res === true);
		  }
		  validateSignaturesOfTaprootInput(inputIndex, validator, pubkey) {
		    const input = this.data.inputs[inputIndex];
		    const tapKeySig = (input || {}).tapKeySig;
		    const tapScriptSig = (input || {}).tapScriptSig;
		    if (!input && !tapKeySig && !(tapScriptSig && !tapScriptSig.length))
		      throw new Error('No signatures to validate');
		    if (typeof validator !== 'function')
		      throw new Error('Need validator function to validate signatures');
		    pubkey = pubkey && (0, bip371_1.toXOnly)(pubkey);
		    const allHashses = pubkey
		      ? getTaprootHashesForSig(
		          inputIndex,
		          input,
		          this.data.inputs,
		          pubkey,
		          this.__CACHE,
		        )
		      : getAllTaprootHashesForSig(
		          inputIndex,
		          input,
		          this.data.inputs,
		          this.__CACHE,
		        );
		    if (!allHashses.length) throw new Error('No signatures for this pubkey');
		    const tapKeyHash = allHashses.find(h => !h.leafHash);
		    let validationResultCount = 0;
		    if (tapKeySig && tapKeyHash) {
		      const isValidTapkeySig = validator(
		        tapKeyHash.pubkey,
		        tapKeyHash.hash,
		        trimTaprootSig(tapKeySig),
		      );
		      if (!isValidTapkeySig) return false;
		      validationResultCount++;
		    }
		    if (tapScriptSig) {
		      for (const tapSig of tapScriptSig) {
		        const tapSigHash = allHashses.find(h => tapSig.pubkey.equals(h.pubkey));
		        if (tapSigHash) {
		          const isValidTapScriptSig = validator(
		            tapSig.pubkey,
		            tapSigHash.hash,
		            trimTaprootSig(tapSig.signature),
		          );
		          if (!isValidTapScriptSig) return false;
		          validationResultCount++;
		        }
		      }
		    }
		    return validationResultCount > 0;
		  }
		  signAllInputsHD(
		    hdKeyPair,
		    sighashTypes = [transaction_1.Transaction.SIGHASH_ALL],
		  ) {
		    if (!hdKeyPair || !hdKeyPair.publicKey || !hdKeyPair.fingerprint) {
		      throw new Error('Need HDSigner to sign input');
		    }
		    const results = [];
		    for (const i of range(this.data.inputs.length)) {
		      try {
		        this.signInputHD(i, hdKeyPair, sighashTypes);
		        results.push(true);
		      } catch (err) {
		        results.push(false);
		      }
		    }
		    if (results.every(v => v === false)) {
		      throw new Error('No inputs were signed');
		    }
		    return this;
		  }
		  signAllInputsHDAsync(
		    hdKeyPair,
		    sighashTypes = [transaction_1.Transaction.SIGHASH_ALL],
		  ) {
		    return new Promise((resolve, reject) => {
		      if (!hdKeyPair || !hdKeyPair.publicKey || !hdKeyPair.fingerprint) {
		        return reject(new Error('Need HDSigner to sign input'));
		      }
		      const results = [];
		      const promises = [];
		      for (const i of range(this.data.inputs.length)) {
		        promises.push(
		          this.signInputHDAsync(i, hdKeyPair, sighashTypes).then(
		            () => {
		              results.push(true);
		            },
		            () => {
		              results.push(false);
		            },
		          ),
		        );
		      }
		      return Promise.all(promises).then(() => {
		        if (results.every(v => v === false)) {
		          return reject(new Error('No inputs were signed'));
		        }
		        resolve();
		      });
		    });
		  }
		  signInputHD(
		    inputIndex,
		    hdKeyPair,
		    sighashTypes = [transaction_1.Transaction.SIGHASH_ALL],
		  ) {
		    if (!hdKeyPair || !hdKeyPair.publicKey || !hdKeyPair.fingerprint) {
		      throw new Error('Need HDSigner to sign input');
		    }
		    const signers = getSignersFromHD(inputIndex, this.data.inputs, hdKeyPair);
		    signers.forEach(signer => this.signInput(inputIndex, signer, sighashTypes));
		    return this;
		  }
		  signInputHDAsync(
		    inputIndex,
		    hdKeyPair,
		    sighashTypes = [transaction_1.Transaction.SIGHASH_ALL],
		  ) {
		    return new Promise((resolve, reject) => {
		      if (!hdKeyPair || !hdKeyPair.publicKey || !hdKeyPair.fingerprint) {
		        return reject(new Error('Need HDSigner to sign input'));
		      }
		      const signers = getSignersFromHD(inputIndex, this.data.inputs, hdKeyPair);
		      const promises = signers.map(signer =>
		        this.signInputAsync(inputIndex, signer, sighashTypes),
		      );
		      return Promise.all(promises)
		        .then(() => {
		          resolve();
		        })
		        .catch(reject);
		    });
		  }
		  signAllInputs(keyPair, sighashTypes) {
		    if (!keyPair || !keyPair.publicKey)
		      throw new Error('Need Signer to sign input');
		    // TODO: Add a pubkey/pubkeyhash cache to each input
		    // as input information is added, then eventually
		    // optimize this method.
		    const results = [];
		    for (const i of range(this.data.inputs.length)) {
		      try {
		        this.signInput(i, keyPair, sighashTypes);
		        results.push(true);
		      } catch (err) {
		        results.push(false);
		      }
		    }
		    if (results.every(v => v === false)) {
		      throw new Error('No inputs were signed');
		    }
		    return this;
		  }
		  signAllInputsAsync(keyPair, sighashTypes) {
		    return new Promise((resolve, reject) => {
		      if (!keyPair || !keyPair.publicKey)
		        return reject(new Error('Need Signer to sign input'));
		      // TODO: Add a pubkey/pubkeyhash cache to each input
		      // as input information is added, then eventually
		      // optimize this method.
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
		            },
		          ),
		        );
		      }
		      return Promise.all(promises).then(() => {
		        if (results.every(v => v === false)) {
		          return reject(new Error('No inputs were signed'));
		        }
		        resolve();
		      });
		    });
		  }
		  signInput(inputIndex, keyPair, sighashTypes) {
		    if (!keyPair || !keyPair.publicKey)
		      throw new Error('Need Signer to sign input');
		    const input = (0, utils_1.checkForInput)(this.data.inputs, inputIndex);
		    if ((0, bip371_1.isTaprootInput)(input)) {
		      return this._signTaprootInput(
		        inputIndex,
		        input,
		        keyPair,
		        undefined,
		        sighashTypes,
		      );
		    }
		    return this._signInput(inputIndex, keyPair, sighashTypes);
		  }
		  signTaprootInput(inputIndex, keyPair, tapLeafHashToSign, sighashTypes) {
		    if (!keyPair || !keyPair.publicKey)
		      throw new Error('Need Signer to sign input');
		    const input = (0, utils_1.checkForInput)(this.data.inputs, inputIndex);
		    if ((0, bip371_1.isTaprootInput)(input))
		      return this._signTaprootInput(
		        inputIndex,
		        input,
		        keyPair,
		        tapLeafHashToSign,
		        sighashTypes,
		      );
		    throw new Error(`Input #${inputIndex} is not of type Taproot.`);
		  }
		  _signInput(
		    inputIndex,
		    keyPair,
		    sighashTypes = [transaction_1.Transaction.SIGHASH_ALL],
		  ) {
		    const { hash, sighashType } = getHashAndSighashType(
		      this.data.inputs,
		      inputIndex,
		      keyPair.publicKey,
		      this.__CACHE,
		      sighashTypes,
		    );
		    const partialSig = [
		      {
		        pubkey: keyPair.publicKey,
		        signature: bscript.signature.encode(keyPair.sign(hash), sighashType),
		      },
		    ];
		    this.data.updateInput(inputIndex, { partialSig });
		    return this;
		  }
		  _signTaprootInput(
		    inputIndex,
		    input,
		    keyPair,
		    tapLeafHashToSign,
		    allowedSighashTypes = [transaction_1.Transaction.SIGHASH_DEFAULT],
		  ) {
		    const hashesForSig = this.checkTaprootHashesForSig(
		      inputIndex,
		      input,
		      keyPair,
		      tapLeafHashToSign,
		      allowedSighashTypes,
		    );
		    const tapKeySig = hashesForSig
		      .filter(h => !h.leafHash)
		      .map(h =>
		        (0, bip371_1.serializeTaprootSignature)(
		          keyPair.signSchnorr(h.hash),
		          input.sighashType,
		        ),
		      )[0];
		    const tapScriptSig = hashesForSig
		      .filter(h => !!h.leafHash)
		      .map(h => ({
		        pubkey: (0, bip371_1.toXOnly)(keyPair.publicKey),
		        signature: (0, bip371_1.serializeTaprootSignature)(
		          keyPair.signSchnorr(h.hash),
		          input.sighashType,
		        ),
		        leafHash: h.leafHash,
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
		        throw new Error('Need Signer to sign input');
		      const input = (0, utils_1.checkForInput)(this.data.inputs, inputIndex);
		      if ((0, bip371_1.isTaprootInput)(input))
		        return this._signTaprootInputAsync(
		          inputIndex,
		          input,
		          keyPair,
		          undefined,
		          sighashTypes,
		        );
		      return this._signInputAsync(inputIndex, keyPair, sighashTypes);
		    });
		  }
		  signTaprootInputAsync(inputIndex, keyPair, tapLeafHash, sighashTypes) {
		    return Promise.resolve().then(() => {
		      if (!keyPair || !keyPair.publicKey)
		        throw new Error('Need Signer to sign input');
		      const input = (0, utils_1.checkForInput)(this.data.inputs, inputIndex);
		      if ((0, bip371_1.isTaprootInput)(input))
		        return this._signTaprootInputAsync(
		          inputIndex,
		          input,
		          keyPair,
		          tapLeafHash,
		          sighashTypes,
		        );
		      throw new Error(`Input #${inputIndex} is not of type Taproot.`);
		    });
		  }
		  _signInputAsync(
		    inputIndex,
		    keyPair,
		    sighashTypes = [transaction_1.Transaction.SIGHASH_ALL],
		  ) {
		    const { hash, sighashType } = getHashAndSighashType(
		      this.data.inputs,
		      inputIndex,
		      keyPair.publicKey,
		      this.__CACHE,
		      sighashTypes,
		    );
		    return Promise.resolve(keyPair.sign(hash)).then(signature => {
		      const partialSig = [
		        {
		          pubkey: keyPair.publicKey,
		          signature: bscript.signature.encode(signature, sighashType),
		        },
		      ];
		      this.data.updateInput(inputIndex, { partialSig });
		    });
		  }
		  async _signTaprootInputAsync(
		    inputIndex,
		    input,
		    keyPair,
		    tapLeafHash,
		    sighashTypes = [transaction_1.Transaction.SIGHASH_DEFAULT],
		  ) {
		    const hashesForSig = this.checkTaprootHashesForSig(
		      inputIndex,
		      input,
		      keyPair,
		      tapLeafHash,
		      sighashTypes,
		    );
		    const signaturePromises = [];
		    const tapKeyHash = hashesForSig.filter(h => !h.leafHash)[0];
		    if (tapKeyHash) {
		      const tapKeySigPromise = Promise.resolve(
		        keyPair.signSchnorr(tapKeyHash.hash),
		      ).then(sig => {
		        return {
		          tapKeySig: (0, bip371_1.serializeTaprootSignature)(
		            sig,
		            input.sighashType,
		          ),
		        };
		      });
		      signaturePromises.push(tapKeySigPromise);
		    }
		    const tapScriptHashes = hashesForSig.filter(h => !!h.leafHash);
		    if (tapScriptHashes.length) {
		      const tapScriptSigPromises = tapScriptHashes.map(tsh => {
		        return Promise.resolve(keyPair.signSchnorr(tsh.hash)).then(
		          signature => {
		            const tapScriptSig = [
		              {
		                pubkey: (0, bip371_1.toXOnly)(keyPair.publicKey),
		                signature: (0, bip371_1.serializeTaprootSignature)(
		                  signature,
		                  input.sighashType,
		                ),
		                leafHash: tsh.leafHash,
		              },
		            ];
		            return { tapScriptSig };
		          },
		        );
		      });
		      signaturePromises.push(...tapScriptSigPromises);
		    }
		    return Promise.all(signaturePromises).then(results => {
		      results.forEach(v => this.data.updateInput(inputIndex, v));
		    });
		  }
		  checkTaprootHashesForSig(
		    inputIndex,
		    input,
		    keyPair,
		    tapLeafHashToSign,
		    allowedSighashTypes,
		  ) {
		    if (typeof keyPair.signSchnorr !== 'function')
		      throw new Error(
		        `Need Schnorr Signer to sign taproot input #${inputIndex}.`,
		      );
		    const hashesForSig = getTaprootHashesForSig(
		      inputIndex,
		      input,
		      this.data.inputs,
		      keyPair.publicKey,
		      this.__CACHE,
		      tapLeafHashToSign,
		      allowedSighashTypes,
		    );
		    if (!hashesForSig || !hashesForSig.length)
		      throw new Error(
		        `Can not sign for input #${inputIndex} with the key ${keyPair.publicKey.toString(
	          'hex',
	        )}`,
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
		    (0, bip371_1.checkTaprootInputFields)(
		      this.data.inputs[inputIndex],
		      updateData,
		      'updateInput',
		    );
		    this.data.updateInput(inputIndex, updateData);
		    if (updateData.nonWitnessUtxo) {
		      addNonWitnessTxCache(
		        this.__CACHE,
		        this.data.inputs[inputIndex],
		        inputIndex,
		      );
		    }
		    return this;
		  }
		  updateOutput(outputIndex, updateData) {
		    const outputData = this.data.outputs[outputIndex];
		    (0, bip371_1.checkTaprootOutputFields)(
		      outputData,
		      updateData,
		      'updateOutput',
		    );
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
		}
		psbt$1.Psbt = Psbt;
		/**
		 * This function is needed to pass to the bip174 base class's fromBuffer.
		 * It takes the "transaction buffer" portion of the psbt buffer and returns a
		 * Transaction (From the bip174 library) interface.
		 */
		const transactionFromBuffer = buffer => new PsbtTransaction(buffer);
		/**
		 * This class implements the Transaction interface from bip174 library.
		 * It contains a bitcoinjs-lib Transaction object.
		 */
		class PsbtTransaction {
		  constructor(buffer = bufferExports.Buffer.from([2, 0, 0, 0, 0, 0, 0, 0, 0, 0])) {
		    this.tx = transaction_1.Transaction.fromBuffer(buffer);
		    checkTxEmpty(this.tx);
		    Object.defineProperty(this, 'tx', {
		      enumerable: false,
		      writable: true,
		    });
		  }
		  getInputOutputCounts() {
		    return {
		      inputCount: this.tx.ins.length,
		      outputCount: this.tx.outs.length,
		    };
		  }
		  addInput(input) {
		    if (
		      input.hash === undefined ||
		      input.index === undefined ||
		      (!bufferExports.Buffer.isBuffer(input.hash) && typeof input.hash !== 'string') ||
		      typeof input.index !== 'number'
		    ) {
		      throw new Error('Error adding input.');
		    }
		    const hash =
		      typeof input.hash === 'string'
		        ? (0, bufferutils_1.reverseBuffer)(bufferExports.Buffer.from(input.hash, 'hex'))
		        : input.hash;
		    this.tx.addInput(hash, input.index, input.sequence);
		  }
		  addOutput(output) {
		    if (
		      output.script === undefined ||
		      output.value === undefined ||
		      !bufferExports.Buffer.isBuffer(output.script) ||
		      typeof output.value !== 'number'
		    ) {
		      throw new Error('Error adding output.');
		    }
		    this.tx.addOutput(output.script, output.value);
		  }
		  toBuffer() {
		    return this.tx.toBuffer();
		  }
		}
		function canFinalize(input, script, scriptType) {
		  switch (scriptType) {
		    case 'pubkey':
		    case 'pubkeyhash':
		    case 'witnesspubkeyhash':
		      return hasSigs(1, input.partialSig);
		    case 'multisig':
		      const p2ms = payments.p2ms({ output: script });
		      return hasSigs(p2ms.m, input.partialSig, p2ms.pubkeys);
		    default:
		      return false;
		  }
		}
		function checkCache(cache) {
		  if (cache.__UNSAFE_SIGN_NONSEGWIT !== false) {
		    throw new Error('Not BIP174 compliant, can not export');
		  }
		}
		function hasSigs(neededSigs, partialSig, pubkeys) {
		  if (!partialSig) return false;
		  let sigs;
		  if (pubkeys) {
		    sigs = pubkeys
		      .map(pkey => {
		        const pubkey = compressPubkey(pkey);
		        return partialSig.find(pSig => pSig.pubkey.equals(pubkey));
		      })
		      .filter(v => !!v);
		  } else {
		    sigs = partialSig;
		  }
		  if (sigs.length > neededSigs) throw new Error('Too many signatures');
		  return sigs.length === neededSigs;
		}
		function isFinalized(input) {
		  return !!input.finalScriptSig || !!input.finalScriptWitness;
		}
		function bip32DerivationIsMine(root) {
		  return d => {
		    if (!d.masterFingerprint.equals(root.fingerprint)) return false;
		    if (!root.derivePath(d.path).publicKey.equals(d.pubkey)) return false;
		    return true;
		  };
		}
		function check32Bit(num) {
		  if (
		    typeof num !== 'number' ||
		    num !== Math.floor(num) ||
		    num > 0xffffffff ||
		    num < 0
		  ) {
		    throw new Error('Invalid 32 bit integer');
		  }
		}
		function checkFees(psbt, cache, opts) {
		  const feeRate = cache.__FEE_RATE || psbt.getFeeRate();
		  const vsize = cache.__EXTRACTED_TX.virtualSize();
		  const satoshis = feeRate * vsize;
		  if (feeRate >= opts.maximumFeeRate) {
		    throw new Error(
		      `Warning: You are paying around ${(satoshis / 1e8).toFixed(8)} in ` +
		        `fees, which is ${feeRate} satoshi per byte for a transaction ` +
		        `with a VSize of ${vsize} bytes (segwit counted as 0.25 byte per ` +
		        `byte). Use setMaximumFeeRate method to raise your threshold, or ` +
		        `pass true to the first arg of extractTransaction.`,
		    );
		  }
		}
		function checkInputsForPartialSig(inputs, action) {
		  inputs.forEach(input => {
		    const throws = (0, bip371_1.isTaprootInput)(input)
		      ? (0, bip371_1.checkTaprootInputForSigs)(input, action)
		      : (0, psbtutils_1.checkInputForSig)(input, action);
		    if (throws)
		      throw new Error('Can not modify transaction, signatures exist.');
		  });
		}
		function checkPartialSigSighashes(input) {
		  if (!input.sighashType || !input.partialSig) return;
		  const { partialSig, sighashType } = input;
		  partialSig.forEach(pSig => {
		    const { hashType } = bscript.signature.decode(pSig.signature);
		    if (sighashType !== hashType) {
		      throw new Error('Signature sighash does not match input sighash type');
		    }
		  });
		}
		function checkScriptForPubkey(pubkey, script, action) {
		  if (!(0, psbtutils_1.pubkeyInScript)(pubkey, script)) {
		    throw new Error(
		      `Can not ${action} for this input with the key ${pubkey.toString('hex')}`,
		    );
		  }
		}
		function checkTxEmpty(tx) {
		  const isEmpty = tx.ins.every(
		    input =>
		      input.script &&
		      input.script.length === 0 &&
		      input.witness &&
		      input.witness.length === 0,
		  );
		  if (!isEmpty) {
		    throw new Error('Format Error: Transaction ScriptSigs are not empty');
		  }
		}
		function checkTxForDupeIns(tx, cache) {
		  tx.ins.forEach(input => {
		    checkTxInputCache(cache, input);
		  });
		}
		function checkTxInputCache(cache, input) {
		  const key =
		    (0, bufferutils_1.reverseBuffer)(bufferExports.Buffer.from(input.hash)).toString('hex') +
		    ':' +
		    input.index;
		  if (cache.__TX_IN_CACHE[key]) throw new Error('Duplicate input detected.');
		  cache.__TX_IN_CACHE[key] = 1;
		}
		function scriptCheckerFactory(payment, paymentScriptName) {
		  return (inputIndex, scriptPubKey, redeemScript, ioType) => {
		    const redeemScriptOutput = payment({
		      redeem: { output: redeemScript },
		    }).output;
		    if (!scriptPubKey.equals(redeemScriptOutput)) {
		      throw new Error(
		        `${paymentScriptName} for ${ioType} #${inputIndex} doesn't match the scriptPubKey in the prevout`,
		      );
		    }
		  };
		}
		const checkRedeemScript = scriptCheckerFactory(payments.p2sh, 'Redeem script');
		const checkWitnessScript = scriptCheckerFactory(
		  payments.p2wsh,
		  'Witness script',
		);
		function getTxCacheValue(key, name, inputs, c) {
		  if (!inputs.every(isFinalized))
		    throw new Error(`PSBT must be finalized to calculate ${name}`);
		  if (key === '__FEE_RATE' && c.__FEE_RATE) return c.__FEE_RATE;
		  if (key === '__FEE' && c.__FEE) return c.__FEE;
		  let tx;
		  let mustFinalize = true;
		  if (c.__EXTRACTED_TX) {
		    tx = c.__EXTRACTED_TX;
		    mustFinalize = false;
		  } else {
		    tx = c.__TX.clone();
		  }
		  inputFinalizeGetAmts(inputs, tx, c, mustFinalize);
		  if (key === '__FEE_RATE') return c.__FEE_RATE;
		  else if (key === '__FEE') return c.__FEE;
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
		    isP2WSH,
		  );
		}
		function prepareFinalScripts(
		  script,
		  scriptType,
		  partialSig,
		  isSegwit,
		  isP2SH,
		  isP2WSH,
		) {
		  let finalScriptSig;
		  let finalScriptWitness;
		  // Wow, the payments API is very handy
		  const payment = getPayment(script, scriptType, partialSig);
		  const p2wsh = !isP2WSH ? null : payments.p2wsh({ redeem: payment });
		  const p2sh = !isP2SH ? null : payments.p2sh({ redeem: p2wsh || payment });
		  if (isSegwit) {
		    if (p2wsh) {
		      finalScriptWitness = (0, psbtutils_1.witnessStackToScriptWitness)(
		        p2wsh.witness,
		      );
		    } else {
		      finalScriptWitness = (0, psbtutils_1.witnessStackToScriptWitness)(
		        payment.witness,
		      );
		    }
		    if (p2sh) {
		      finalScriptSig = p2sh.input;
		    }
		  } else {
		    if (p2sh) {
		      finalScriptSig = p2sh.input;
		    } else {
		      finalScriptSig = payment.input;
		    }
		  }
		  return {
		    finalScriptSig,
		    finalScriptWitness,
		  };
		}
		function getHashAndSighashType(
		  inputs,
		  inputIndex,
		  pubkey,
		  cache,
		  sighashTypes,
		) {
		  const input = (0, utils_1.checkForInput)(inputs, inputIndex);
		  const { hash, sighashType, script } = getHashForSig(
		    inputIndex,
		    input,
		    cache,
		    false,
		    sighashTypes,
		  );
		  checkScriptForPubkey(pubkey, script, 'sign');
		  return {
		    hash,
		    sighashType,
		  };
		}
		function getHashForSig(inputIndex, input, cache, forValidate, sighashTypes) {
		  const unsignedTx = cache.__TX;
		  const sighashType =
		    input.sighashType || transaction_1.Transaction.SIGHASH_ALL;
		  checkSighashTypeAllowed(sighashType, sighashTypes);
		  let hash;
		  let prevout;
		  if (input.nonWitnessUtxo) {
		    const nonWitnessUtxoTx = nonWitnessUtxoTxFromCache(
		      cache,
		      input,
		      inputIndex,
		    );
		    const prevoutHash = unsignedTx.ins[inputIndex].hash;
		    const utxoHash = nonWitnessUtxoTx.getHash();
		    // If a non-witness UTXO is provided, its hash must match the hash specified in the prevout
		    if (!prevoutHash.equals(utxoHash)) {
		      throw new Error(
		        `Non-witness UTXO hash for input #${inputIndex} doesn't match the hash specified in the prevout`,
		      );
		    }
		    const prevoutIndex = unsignedTx.ins[inputIndex].index;
		    prevout = nonWitnessUtxoTx.outs[prevoutIndex];
		  } else if (input.witnessUtxo) {
		    prevout = input.witnessUtxo;
		  } else {
		    throw new Error('Need a Utxo input item for signing');
		  }
		  const { meaningfulScript, type } = getMeaningfulScript(
		    prevout.script,
		    inputIndex,
		    'input',
		    input.redeemScript,
		    input.witnessScript,
		  );
		  if (['p2sh-p2wsh', 'p2wsh'].indexOf(type) >= 0) {
		    hash = unsignedTx.hashForWitnessV0(
		      inputIndex,
		      meaningfulScript,
		      prevout.value,
		      sighashType,
		    );
		  } else if ((0, psbtutils_1.isP2WPKH)(meaningfulScript)) {
		    // P2WPKH uses the P2PKH template for prevoutScript when signing
		    const signingScript = payments.p2pkh({
		      hash: meaningfulScript.slice(2),
		    }).output;
		    hash = unsignedTx.hashForWitnessV0(
		      inputIndex,
		      signingScript,
		      prevout.value,
		      sighashType,
		    );
		  } else {
		    // non-segwit
		    if (
		      input.nonWitnessUtxo === undefined &&
		      cache.__UNSAFE_SIGN_NONSEGWIT === false
		    )
		      throw new Error(
		        `Input #${inputIndex} has witnessUtxo but non-segwit script: ` +
		          `${meaningfulScript.toString('hex')}`,
		      );
		    if (!forValidate && cache.__UNSAFE_SIGN_NONSEGWIT !== false)
		      console.warn(
		        'Warning: Signing non-segwit inputs without the full parent transaction ' +
		          'means there is a chance that a miner could feed you incorrect information ' +
		          "to trick you into paying large fees. This behavior is the same as Psbt's predecessor " +
		          '(TransactionBuilder - now removed) when signing non-segwit scripts. You are not ' +
		          'able to export this Psbt with toBuffer|toBase64|toHex since it is not ' +
		          'BIP174 compliant.\n*********************\nPROCEED WITH CAUTION!\n' +
		          '*********************',
		      );
		    hash = unsignedTx.hashForSignature(
		      inputIndex,
		      meaningfulScript,
		      sighashType,
		    );
		  }
		  return {
		    script: meaningfulScript,
		    sighashType,
		    hash,
		  };
		}
		function getAllTaprootHashesForSig(inputIndex, input, inputs, cache) {
		  const allPublicKeys = [];
		  if (input.tapInternalKey) {
		    const key = getPrevoutTaprootKey(inputIndex, input, cache);
		    if (key) {
		      allPublicKeys.push(key);
		    }
		  }
		  if (input.tapScriptSig) {
		    const tapScriptPubkeys = input.tapScriptSig.map(tss => tss.pubkey);
		    allPublicKeys.push(...tapScriptPubkeys);
		  }
		  const allHashes = allPublicKeys.map(pubicKey =>
		    getTaprootHashesForSig(inputIndex, input, inputs, pubicKey, cache),
		  );
		  return allHashes.flat();
		}
		function getPrevoutTaprootKey(inputIndex, input, cache) {
		  const { script } = getScriptAndAmountFromUtxo(inputIndex, input, cache);
		  return (0, psbtutils_1.isP2TR)(script) ? script.subarray(2, 34) : null;
		}
		function trimTaprootSig(signature) {
		  return signature.length === 64 ? signature : signature.subarray(0, 64);
		}
		function getTaprootHashesForSig(
		  inputIndex,
		  input,
		  inputs,
		  pubkey,
		  cache,
		  tapLeafHashToSign,
		  allowedSighashTypes,
		) {
		  const unsignedTx = cache.__TX;
		  const sighashType =
		    input.sighashType || transaction_1.Transaction.SIGHASH_DEFAULT;
		  checkSighashTypeAllowed(sighashType, allowedSighashTypes);
		  const prevOuts = inputs.map((i, index) =>
		    getScriptAndAmountFromUtxo(index, i, cache),
		  );
		  const signingScripts = prevOuts.map(o => o.script);
		  const values = prevOuts.map(o => o.value);
		  const hashes = [];
		  if (input.tapInternalKey && !tapLeafHashToSign) {
		    const outputKey =
		      getPrevoutTaprootKey(inputIndex, input, cache) || bufferExports.Buffer.from([]);
		    if ((0, bip371_1.toXOnly)(pubkey).equals(outputKey)) {
		      const tapKeyHash = unsignedTx.hashForWitnessV1(
		        inputIndex,
		        signingScripts,
		        values,
		        sighashType,
		      );
		      hashes.push({ pubkey, hash: tapKeyHash });
		    }
		  }
		  const tapLeafHashes = (input.tapLeafScript || [])
		    .filter(tapLeaf => (0, psbtutils_1.pubkeyInScript)(pubkey, tapLeaf.script))
		    .map(tapLeaf => {
		      const hash = (0, bip341_1.tapleafHash)({
		        output: tapLeaf.script,
		        version: tapLeaf.leafVersion,
		      });
		      return Object.assign({ hash }, tapLeaf);
		    })
		    .filter(
		      tapLeaf => !tapLeafHashToSign || tapLeafHashToSign.equals(tapLeaf.hash),
		    )
		    .map(tapLeaf => {
		      const tapScriptHash = unsignedTx.hashForWitnessV1(
		        inputIndex,
		        signingScripts,
		        values,
		        sighashType,
		        tapLeaf.hash,
		      );
		      return {
		        pubkey,
		        hash: tapScriptHash,
		        leafHash: tapLeaf.hash,
		      };
		    });
		  return hashes.concat(tapLeafHashes);
		}
		function checkSighashTypeAllowed(sighashType, sighashTypes) {
		  if (sighashTypes && sighashTypes.indexOf(sighashType) < 0) {
		    const str = sighashTypeToString(sighashType);
		    throw new Error(
		      `Sighash type is not allowed. Retry the sign method passing the ` +
		        `sighashTypes array of whitelisted types. Sighash type: ${str}`,
		    );
		  }
		}
		function getPayment(script, scriptType, partialSig) {
		  let payment;
		  switch (scriptType) {
		    case 'multisig':
		      const sigs = getSortedSigs(script, partialSig);
		      payment = payments.p2ms({
		        output: script,
		        signatures: sigs,
		      });
		      break;
		    case 'pubkey':
		      payment = payments.p2pk({
		        output: script,
		        signature: partialSig[0].signature,
		      });
		      break;
		    case 'pubkeyhash':
		      payment = payments.p2pkh({
		        output: script,
		        pubkey: partialSig[0].pubkey,
		        signature: partialSig[0].signature,
		      });
		      break;
		    case 'witnesspubkeyhash':
		      payment = payments.p2wpkh({
		        output: script,
		        pubkey: partialSig[0].pubkey,
		        signature: partialSig[0].signature,
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
		    isP2WSH: false,
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
		        inputIndex,
		      );
		      const prevoutIndex = unsignedTx.ins[inputIndex].index;
		      res.script = nonWitnessUtxoTx.outs[prevoutIndex].script;
		    } else if (input.witnessUtxo) {
		      res.script = input.witnessUtxo.script;
		    }
		  }
		  if (input.witnessScript || (0, psbtutils_1.isP2WPKH)(res.script)) {
		    res.isSegwit = true;
		  }
		  return res;
		}
		function getSignersFromHD(inputIndex, inputs, hdKeyPair) {
		  const input = (0, utils_1.checkForInput)(inputs, inputIndex);
		  if (!input.bip32Derivation || input.bip32Derivation.length === 0) {
		    throw new Error('Need bip32Derivation to sign with HD');
		  }
		  const myDerivations = input.bip32Derivation
		    .map(bipDv => {
		      if (bipDv.masterFingerprint.equals(hdKeyPair.fingerprint)) {
		        return bipDv;
		      } else {
		        return;
		      }
		    })
		    .filter(v => !!v);
		  if (myDerivations.length === 0) {
		    throw new Error(
		      'Need one bip32Derivation masterFingerprint to match the HDSigner fingerprint',
		    );
		  }
		  const signers = myDerivations.map(bipDv => {
		    const node = hdKeyPair.derivePath(bipDv.path);
		    if (!bipDv.pubkey.equals(node.publicKey)) {
		      throw new Error('pubkey did not match bip32Derivation');
		    }
		    return node;
		  });
		  return signers;
		}
		function getSortedSigs(script, partialSig) {
		  const p2ms = payments.p2ms({ output: script });
		  // for each pubkey in order of p2ms script
		  return p2ms.pubkeys
		    .map(pk => {
		      // filter partialSig array by pubkey being equal
		      return (
		        partialSig.filter(ps => {
		          return ps.pubkey.equals(pk);
		        })[0] || {}
		      ).signature;
		      // Any pubkey without a match will return undefined
		      // this last filter removes all the undefined items in the array.
		    })
		    .filter(v => !!v);
		}
		function scriptWitnessToWitnessStack(buffer) {
		  let offset = 0;
		  function readSlice(n) {
		    offset += n;
		    return buffer.slice(offset - n, offset);
		  }
		  function readVarInt() {
		    const vi = varuint.decode(buffer, offset);
		    offset += varuint.decode.bytes;
		    return vi;
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
		  let text =
		    sighashType & transaction_1.Transaction.SIGHASH_ANYONECANPAY
		      ? 'SIGHASH_ANYONECANPAY | '
		      : '';
		  const sigMod = sighashType & 0x1f;
		  switch (sigMod) {
		    case transaction_1.Transaction.SIGHASH_ALL:
		      text += 'SIGHASH_ALL';
		      break;
		    case transaction_1.Transaction.SIGHASH_SINGLE:
		      text += 'SIGHASH_SINGLE';
		      break;
		    case transaction_1.Transaction.SIGHASH_NONE:
		      text += 'SIGHASH_NONE';
		      break;
		  }
		  return text;
		}
		function addNonWitnessTxCache(cache, input, inputIndex) {
		  cache.__NON_WITNESS_UTXO_BUF_CACHE[inputIndex] = input.nonWitnessUtxo;
		  const tx = transaction_1.Transaction.fromBuffer(input.nonWitnessUtxo);
		  cache.__NON_WITNESS_UTXO_TX_CACHE[inputIndex] = tx;
		  const self = cache;
		  const selfIndex = inputIndex;
		  delete input.nonWitnessUtxo;
		  Object.defineProperty(input, 'nonWitnessUtxo', {
		    enumerable: true,
		    get() {
		      const buf = self.__NON_WITNESS_UTXO_BUF_CACHE[selfIndex];
		      const txCache = self.__NON_WITNESS_UTXO_TX_CACHE[selfIndex];
		      if (buf !== undefined) {
		        return buf;
		      } else {
		        const newBuf = txCache.toBuffer();
		        self.__NON_WITNESS_UTXO_BUF_CACHE[selfIndex] = newBuf;
		        return newBuf;
		      }
		    },
		    set(data) {
		      self.__NON_WITNESS_UTXO_BUF_CACHE[selfIndex] = data;
		    },
		  });
		}
		function inputFinalizeGetAmts(inputs, tx, cache, mustFinalize) {
		  let inputAmount = 0;
		  inputs.forEach((input, idx) => {
		    if (mustFinalize && input.finalScriptSig)
		      tx.ins[idx].script = input.finalScriptSig;
		    if (mustFinalize && input.finalScriptWitness) {
		      tx.ins[idx].witness = scriptWitnessToWitnessStack(
		        input.finalScriptWitness,
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
		  const outputAmount = tx.outs.reduce((total, o) => total + o.value, 0);
		  const fee = inputAmount - outputAmount;
		  if (fee < 0) {
		    throw new Error('Outputs are spending more than Inputs');
		  }
		  const bytes = tx.virtualSize();
		  cache.__FEE = fee;
		  cache.__EXTRACTED_TX = tx;
		  cache.__FEE_RATE = Math.floor(fee / bytes);
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
		  if (input.witnessUtxo !== undefined) {
		    return {
		      script: input.witnessUtxo.script,
		      value: input.witnessUtxo.value,
		    };
		  } else if (input.nonWitnessUtxo !== undefined) {
		    const nonWitnessUtxoTx = nonWitnessUtxoTxFromCache(
		      cache,
		      input,
		      inputIndex,
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
		    'input',
		    input.redeemScript,
		    input.witnessScript,
		  );
		  return (0, psbtutils_1.pubkeyInScript)(pubkey, meaningfulScript);
		}
		function pubkeyInOutput(pubkey, output, outputIndex, cache) {
		  const script = cache.__TX.outs[outputIndex].script;
		  const { meaningfulScript } = getMeaningfulScript(
		    script,
		    outputIndex,
		    'output',
		    output.redeemScript,
		    output.witnessScript,
		  );
		  return (0, psbtutils_1.pubkeyInScript)(pubkey, meaningfulScript);
		}
		function redeemFromFinalScriptSig(finalScript) {
		  if (!finalScript) return;
		  const decomp = bscript.decompile(finalScript);
		  if (!decomp) return;
		  const lastItem = decomp[decomp.length - 1];
		  if (
		    !bufferExports.Buffer.isBuffer(lastItem) ||
		    isPubkeyLike(lastItem) ||
		    isSigLike(lastItem)
		  )
		    return;
		  const sDecomp = bscript.decompile(lastItem);
		  if (!sDecomp) return;
		  return lastItem;
		}
		function redeemFromFinalWitnessScript(finalScript) {
		  if (!finalScript) return;
		  const decomp = scriptWitnessToWitnessStack(finalScript);
		  const lastItem = decomp[decomp.length - 1];
		  if (isPubkeyLike(lastItem)) return;
		  const sDecomp = bscript.decompile(lastItem);
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
		  return buf.length === 33 && bscript.isCanonicalPubKey(buf);
		}
		function isSigLike(buf) {
		  return bscript.isCanonicalScriptSignature(buf);
		}
		function getMeaningfulScript(
		  script,
		  index,
		  ioType,
		  redeemScript,
		  witnessScript,
		) {
		  const isP2SH = (0, psbtutils_1.isP2SHScript)(script);
		  const isP2SHP2WSH =
		    isP2SH && redeemScript && (0, psbtutils_1.isP2WSHScript)(redeemScript);
		  const isP2WSH = (0, psbtutils_1.isP2WSHScript)(script);
		  if (isP2SH && redeemScript === undefined)
		    throw new Error('scriptPubkey is P2SH but redeemScript missing');
		  if ((isP2WSH || isP2SHP2WSH) && witnessScript === undefined)
		    throw new Error(
		      'scriptPubkey or redeemScript is P2WSH but witnessScript missing',
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
		    type: isP2SHP2WSH
		      ? 'p2sh-p2wsh'
		      : isP2SH
		      ? 'p2sh'
		      : isP2WSH
		      ? 'p2wsh'
		      : 'raw',
		  };
		}
		function checkInvalidP2WSH(script) {
		  if (
		    (0, psbtutils_1.isP2WPKH)(script) ||
		    (0, psbtutils_1.isP2SHScript)(script)
		  ) {
		    throw new Error('P2WPKH or P2SH can not be contained within P2WSH');
		  }
		}
		function classifyScript(script) {
		  if ((0, psbtutils_1.isP2WPKH)(script)) return 'witnesspubkeyhash';
		  if ((0, psbtutils_1.isP2PKH)(script)) return 'pubkeyhash';
		  if ((0, psbtutils_1.isP2MS)(script)) return 'multisig';
		  if ((0, psbtutils_1.isP2PK)(script)) return 'pubkey';
		  return 'nonstandard';
		}
		function range(n) {
		  return [...Array(n).keys()];
		}
		return psbt$1;
	}

	var hasRequiredSrc;

	function requireSrc () {
		if (hasRequiredSrc) return src$1;
		hasRequiredSrc = 1;
		(function (exports$1) {
			Object.defineProperty(exports$1, '__esModule', { value: true });
			exports$1.initEccLib =
			  exports$1.Transaction =
			  exports$1.opcodes =
			  exports$1.Psbt =
			  exports$1.Block =
			  exports$1.script =
			  exports$1.payments =
			  exports$1.networks =
			  exports$1.crypto =
			  exports$1.address =
			    void 0;
			const address = requireAddress();
			exports$1.address = address;
			const crypto = requireCrypto();
			exports$1.crypto = crypto;
			const networks = requireNetworks();
			exports$1.networks = networks;
			const payments = requirePayments();
			exports$1.payments = payments;
			const script = requireScript();
			exports$1.script = script;
			var block_1 = requireBlock();
			Object.defineProperty(exports$1, 'Block', {
			  enumerable: true,
			  get: function () {
			    return block_1.Block;
			  },
			});
			var psbt_1 = requirePsbt();
			Object.defineProperty(exports$1, 'Psbt', {
			  enumerable: true,
			  get: function () {
			    return psbt_1.Psbt;
			  },
			});
			/** @hidden */
			var ops_1 = requireOps();
			Object.defineProperty(exports$1, 'opcodes', {
			  enumerable: true,
			  get: function () {
			    return ops_1.OPS;
			  },
			});
			var transaction_1 = requireTransaction();
			Object.defineProperty(exports$1, 'Transaction', {
			  enumerable: true,
			  get: function () {
			    return transaction_1.Transaction;
			  },
			});
			var ecc_lib_1 = requireEcc_lib();
			Object.defineProperty(exports$1, 'initEccLib', {
			  enumerable: true,
			  get: function () {
			    return ecc_lib_1.initEccLib;
			  },
			}); 
		} (src$1));
		return src$1;
	}

	var srcExports = requireSrc();

	const bitcoin = {
	  messagePrefix: '\x18Bitcoin Signed Message:\n',
	  bech32: 'bc',
	  bip32: {
	    public: 0x0488b21e,
	    private: 0x0488ade4,
	  },
	  pubKeyHash: 0x00,
	  scriptHash: 0x05,
	  wif: 0x80,
	};

	//#region src/storages/globalConfig/globalConfig.ts
	let store$4;
	/**
	* Returns the global configuration.
	*
	* @param config The config to merge.
	*
	* @returns The configuration.
	*/
	/* @__NO_SIDE_EFFECTS__ */
	function getGlobalConfig(config$1) {
		return {
			lang: config$1?.lang ?? store$4?.lang,
			message: config$1?.message,
			abortEarly: config$1?.abortEarly ?? store$4?.abortEarly,
			abortPipeEarly: config$1?.abortPipeEarly ?? store$4?.abortPipeEarly
		};
	}

	//#endregion
	//#region src/storages/globalMessage/globalMessage.ts
	let store$3;
	/**
	* Returns a global error message.
	*
	* @param lang The language of the message.
	*
	* @returns The error message.
	*/
	/* @__NO_SIDE_EFFECTS__ */
	function getGlobalMessage(lang) {
		return store$3?.get(lang);
	}

	//#endregion
	//#region src/storages/schemaMessage/schemaMessage.ts
	let store$2;
	/**
	* Returns a schema error message.
	*
	* @param lang The language of the message.
	*
	* @returns The error message.
	*/
	/* @__NO_SIDE_EFFECTS__ */
	function getSchemaMessage(lang) {
		return store$2?.get(lang);
	}

	//#endregion
	//#region src/storages/specificMessage/specificMessage.ts
	let store$1;
	/**
	* Returns a specific error message.
	*
	* @param reference The identifier reference.
	* @param lang The language of the message.
	*
	* @returns The error message.
	*/
	/* @__NO_SIDE_EFFECTS__ */
	function getSpecificMessage(reference, lang) {
		return store$1?.get(reference)?.get(lang);
	}

	//#endregion
	//#region src/utils/_stringify/_stringify.ts
	/**
	* Stringifies an unknown input to a literal or type string.
	*
	* @param input The unknown input.
	*
	* @returns A literal or type string.
	*
	* @internal
	*/
	/* @__NO_SIDE_EFFECTS__ */
	function _stringify(input) {
		const type = typeof input;
		if (type === "string") return `"${input}"`;
		if (type === "number" || type === "bigint" || type === "boolean") return `${input}`;
		if (type === "object" || type === "function") return (input && Object.getPrototypeOf(input)?.constructor?.name) ?? "null";
		return type;
	}

	//#endregion
	//#region src/utils/_addIssue/_addIssue.ts
	/**
	* Adds an issue to the dataset.
	*
	* @param context The issue context.
	* @param label The issue label.
	* @param dataset The input dataset.
	* @param config The configuration.
	* @param other The optional props.
	*
	* @internal
	*/
	function _addIssue(context, label, dataset, config$1, other) {
		const input = other && "input" in other ? other.input : dataset.value;
		const expected = other?.expected ?? context.expects ?? null;
		const received = other?.received ?? /* @__PURE__ */ _stringify(input);
		const issue = {
			kind: context.kind,
			type: context.type,
			input,
			expected,
			received,
			message: `Invalid ${label}: ${expected ? `Expected ${expected} but r` : "R"}eceived ${received}`,
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

	//#endregion
	//#region src/utils/_getStandardProps/_getStandardProps.ts
	/**
	* Returns the Standard Schema properties.
	*
	* @param context The schema context.
	*
	* @returns The Standard Schema properties.
	*/
	/* @__NO_SIDE_EFFECTS__ */
	function _getStandardProps(context) {
		return {
			version: 1,
			vendor: "valibot",
			validate(value$1) {
				return context["~run"]({ value: value$1 }, /* @__PURE__ */ getGlobalConfig());
			}
		};
	}

	//#endregion
	//#region src/utils/_joinExpects/_joinExpects.ts
	/**
	* Joins multiple `expects` values with the given separator.
	*
	* @param values The `expects` values.
	* @param separator The separator.
	*
	* @returns The joined `expects` property.
	*
	* @internal
	*/
	/* @__NO_SIDE_EFFECTS__ */
	function _joinExpects(values$1, separator) {
		const list = [...new Set(values$1)];
		if (list.length > 1) return `(${list.join(` ${separator} `)})`;
		return list[0] ?? "never";
	}

	//#endregion
	//#region src/utils/ValiError/ValiError.ts
	/**
	* A Valibot error with useful information.
	*/
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

	//#endregion
	//#region src/actions/integer/integer.ts
	/* @__NO_SIDE_EFFECTS__ */
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

	//#endregion
	//#region src/actions/length/length.ts
	/* @__NO_SIDE_EFFECTS__ */
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

	//#endregion
	//#region src/actions/maxValue/maxValue.ts
	/* @__NO_SIDE_EFFECTS__ */
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

	//#endregion
	//#region src/actions/minValue/minValue.ts
	/* @__NO_SIDE_EFFECTS__ */
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

	//#endregion
	//#region src/actions/transform/transform.ts
	/**
	* Creates a custom transformation action.
	*
	* @param operation The transformation operation.
	*
	* @returns A transform action.
	*/
	/* @__NO_SIDE_EFFECTS__ */
	function transform(operation) {
		return {
			kind: "transformation",
			type: "transform",
			reference: transform,
			async: false,
			operation,
			"~run"(dataset) {
				dataset.value = this.operation(dataset.value);
				return dataset;
			}
		};
	}

	//#endregion
	//#region src/methods/getFallback/getFallback.ts
	/**
	* Returns the fallback value of the schema.
	*
	* @param schema The schema to get it from.
	* @param dataset The output dataset if available.
	* @param config The config if available.
	*
	* @returns The fallback value.
	*/
	/* @__NO_SIDE_EFFECTS__ */
	function getFallback(schema, dataset, config$1) {
		return typeof schema.fallback === "function" ? schema.fallback(dataset, config$1) : schema.fallback;
	}

	//#endregion
	//#region src/methods/getDefault/getDefault.ts
	/**
	* Returns the default value of the schema.
	*
	* @param schema The schema to get it from.
	* @param dataset The input dataset if available.
	* @param config The config if available.
	*
	* @returns The default value.
	*/
	/* @__NO_SIDE_EFFECTS__ */
	function getDefault(schema, dataset, config$1) {
		return typeof schema.default === "function" ? schema.default(dataset, config$1) : schema.default;
	}

	//#endregion
	//#region src/schemas/boolean/boolean.ts
	/* @__NO_SIDE_EFFECTS__ */
	function boolean(message$1) {
		return {
			kind: "schema",
			type: "boolean",
			reference: boolean,
			expects: "boolean",
			async: false,
			message: message$1,
			get "~standard"() {
				return /* @__PURE__ */ _getStandardProps(this);
			},
			"~run"(dataset, config$1) {
				if (typeof dataset.value === "boolean") dataset.typed = true;
				else _addIssue(this, "type", dataset, config$1);
				return dataset;
			}
		};
	}

	//#endregion
	//#region src/schemas/instance/instance.ts
	/* @__NO_SIDE_EFFECTS__ */
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

	//#endregion
	//#region src/schemas/number/number.ts
	/* @__NO_SIDE_EFFECTS__ */
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

	//#endregion
	//#region src/schemas/object/object.ts
	/* @__NO_SIDE_EFFECTS__ */
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

	//#endregion
	//#region src/schemas/optional/optional.ts
	/* @__NO_SIDE_EFFECTS__ */
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

	//#endregion
	//#region src/schemas/string/string.ts
	/* @__NO_SIDE_EFFECTS__ */
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

	//#endregion
	//#region src/schemas/union/utils/_subIssues/_subIssues.ts
	/**
	* Returns the sub issues of the provided datasets for the union issue.
	*
	* @param datasets The datasets.
	*
	* @returns The sub issues.
	*
	* @internal
	*/
	/* @__NO_SIDE_EFFECTS__ */
	function _subIssues(datasets) {
		let issues;
		if (datasets) for (const dataset of datasets) if (issues) issues.push(...dataset.issues);
		else issues = dataset.issues;
		return issues;
	}

	//#endregion
	//#region src/schemas/union/union.ts
	/* @__NO_SIDE_EFFECTS__ */
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

	//#endregion
	//#region src/methods/parse/parse.ts
	/**
	* Parses an unknown input based on a schema.
	*
	* @param schema The schema to be used.
	* @param input The input to be parsed.
	* @param config The parse configuration.
	*
	* @returns The parsed input.
	*/
	function parse(schema, input, config$1) {
		const dataset = schema["~run"]({ value: input }, /* @__PURE__ */ getGlobalConfig(config$1));
		if (dataset.issues) throw new ValiError(dataset.issues);
		return dataset.value;
	}

	//#endregion
	//#region src/methods/pipe/pipe.ts
	/* @__NO_SIDE_EFFECTS__ */
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

	const Uint32Schema = pipe(
	  number(),
	  integer(),
	  minValue(0),
	  maxValue(0xffffffff),
	);
	const Uint8Schema = pipe(
	  number(),
	  integer(),
	  minValue(0),
	  maxValue(0xff),
	);
	const NetworkSchema = object({
	  messagePrefix: union([string(), instance(Uint8Array)]),
	  bech32: string(),
	  bip32: object({
	    public: Uint32Schema,
	    private: Uint32Schema,
	  }),
	  pubKeyHash: Uint8Schema,
	  scriptHash: Uint8Schema,
	  wif: Uint8Schema,
	});
	const Buffer256Bit = pipe(instance(Uint8Array), length(32));

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
	        aexists$1(this);
	        data = toBytes(data);
	        abytes$1(data);
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
	        clean$1(SHA256_W);
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

	// base-x encoding / decoding
	// Copyright (c) 2018 base-x contributors
	// Copyright (c) 2014-2018 The Bitcoin Core developers (base58.cpp)
	// Distributed under the MIT software license, see the accompanying
	// file LICENSE or http://www.opensource.org/licenses/mit-license.php.
	function base$1 (ALPHABET) {
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

	var ALPHABET$1 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
	var base58 = base$1(ALPHABET$1);

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
	var bs58Check = bs58checkBase(sha256x2);

	function decodeRaw(buffer, version) {
	    // uncompressed
	    if (buffer.length === 33) {
	        return {
	            version: buffer[0],
	            privateKey: buffer.slice(1, 33),
	            compressed: false
	        };
	    }
	    // invalid length
	    if (buffer.length !== 34)
	        throw new Error('Invalid WIF length');
	    // invalid compression flag
	    if (buffer[33] !== 0x01)
	        throw new Error('Invalid compression flag');
	    return {
	        version: buffer[0],
	        privateKey: buffer.slice(1, 33),
	        compressed: true
	    };
	}
	function encodeRaw(version, privateKey, compressed) {
	    if (privateKey.length !== 32)
	        throw new TypeError('Invalid privateKey length');
	    var result = new Uint8Array(compressed ? 34 : 33);
	    var view = new DataView(result.buffer);
	    view.setUint8(0, version);
	    result.set(privateKey, 1);
	    if (compressed) {
	        result[33] = 0x01;
	    }
	    return result;
	}
	function decode(str, version) {
	    return decodeRaw(bs58Check.decode(str));
	}
	function encode(wif) {
	    return bs58Check.encode(encodeRaw(wif.version, wif.privateKey, wif.compressed));
	}

	const h = (hex) => bufferExports.Buffer.from(hex, 'hex');
	function testEcc(ecc) {
	  assert(
	    ecc.isPoint(
	      h('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'),
	    ),
	  );
	  assert(
	    !ecc.isPoint(
	      h('030000000000000000000000000000000000000000000000000000000000000005'),
	    ),
	  );
	  assert(
	    ecc.isPrivate(
	      h('79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'),
	    ),
	  );
	  // order - 1
	  assert(
	    ecc.isPrivate(
	      h('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140'),
	    ),
	  );
	  // 0
	  assert(
	    !ecc.isPrivate(
	      h('0000000000000000000000000000000000000000000000000000000000000000'),
	    ),
	  );
	  // order
	  assert(
	    !ecc.isPrivate(
	      h('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141'),
	    ),
	  );
	  // order + 1
	  assert(
	    !ecc.isPrivate(
	      h('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364142'),
	    ),
	  );
	  // 1 + 0 == 1
	  assert(
	    bufferExports.Buffer.from(
	      ecc.privateAdd(
	        h('0000000000000000000000000000000000000000000000000000000000000001'),
	        h('0000000000000000000000000000000000000000000000000000000000000000'),
	      ),
	    ).equals(
	      h('0000000000000000000000000000000000000000000000000000000000000001'),
	    ),
	  );
	  // -3 + 3 == 0
	  assert(
	    ecc.privateAdd(
	      h('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd036413e'),
	      h('0000000000000000000000000000000000000000000000000000000000000003'),
	    ) === null,
	  );
	  assert(
	    bufferExports.Buffer.from(
	      ecc.privateAdd(
	        h('e211078564db65c3ce7704f08262b1f38f1ef412ad15b5ac2d76657a63b2c500'),
	        h('b51fbb69051255d1becbd683de5848242a89c229348dd72896a87ada94ae8665'),
	      ),
	    ).equals(
	      h('9730c2ee69edbb958d42db7460bafa18fef9d955325aec99044c81c8282b0a24'),
	    ),
	  );
	  assert(
	    bufferExports.Buffer.from(
	      ecc.privateNegate(
	        h('0000000000000000000000000000000000000000000000000000000000000001'),
	      ),
	    ).equals(
	      h('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140'),
	    ),
	  );
	  assert(
	    bufferExports.Buffer.from(
	      ecc.privateNegate(
	        h('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd036413e'),
	      ),
	    ).equals(
	      h('0000000000000000000000000000000000000000000000000000000000000003'),
	    ),
	  );
	  assert(
	    bufferExports.Buffer.from(
	      ecc.privateNegate(
	        h('b1121e4088a66a28f5b6b0f5844943ecd9f610196d7bb83b25214b60452c09af'),
	      ),
	    ).equals(
	      h('4eede1bf775995d70a494f0a7bb6bc11e0b8cccd41cce8009ab1132c8b0a3792'),
	    ),
	  );
	  assert(
	    bufferExports.Buffer.from(
	      ecc.pointCompress(
	        h(
	          '0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8',
	        ),
	        true,
	      ),
	    ).equals(
	      h('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'),
	    ),
	  );
	  assert(
	    bufferExports.Buffer.from(
	      ecc.pointCompress(
	        h(
	          '0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8',
	        ),
	        false,
	      ),
	    ).equals(
	      h(
	        '0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8',
	      ),
	    ),
	  );
	  assert(
	    bufferExports.Buffer.from(
	      ecc.pointCompress(
	        h('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'),
	        true,
	      ),
	    ).equals(
	      h('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'),
	    ),
	  );
	  assert(
	    bufferExports.Buffer.from(
	      ecc.pointCompress(
	        h('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'),
	        false,
	      ),
	    ).equals(
	      h(
	        '0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8',
	      ),
	    ),
	  );
	  assert(
	    bufferExports.Buffer.from(
	      ecc.pointFromScalar(
	        h('b1121e4088a66a28f5b6b0f5844943ecd9f610196d7bb83b25214b60452c09af'),
	      ),
	    ).equals(
	      h('02b07ba9dca9523b7ef4bd97703d43d20399eb698e194704791a25ce77a400df99'),
	    ),
	  );
	  assert(
	    ecc.xOnlyPointAddTweak(
	      h('79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'),
	      h('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140'),
	    ) === null,
	  );
	  let xOnlyRes = ecc.xOnlyPointAddTweak(
	    h('1617d38ed8d8657da4d4761e8057bc396ea9e4b9d29776d4be096016dbd2509b'),
	    h('a8397a935f0dfceba6ba9618f6451ef4d80637abf4e6af2669fbc9de6a8fd2ac'),
	  );
	  assert(
	    bufferExports.Buffer.from(xOnlyRes.xOnlyPubkey).equals(
	      h('e478f99dab91052ab39a33ea35fd5e6e4933f4d28023cd597c9a1f6760346adf'),
	    ) && xOnlyRes.parity === 1,
	  );
	  xOnlyRes = ecc.xOnlyPointAddTweak(
	    h('2c0b7cf95324a07d05398b240174dc0c2be444d96b159aa6c7f7b1e668680991'),
	    h('823c3cd2142744b075a87eade7e1b8678ba308d566226a0056ca2b7a76f86b47'),
	  );
	  assert(
	    bufferExports.Buffer.from(xOnlyRes.xOnlyPubkey).equals(
	      h('9534f8dc8c6deda2dc007655981c78b49c5d96c778fbf363462a11ec9dfd948c'),
	    ) && xOnlyRes.parity === 0,
	  );
	  assert(
	    bufferExports.Buffer.from(
	      ecc.sign(
	        h('5e9f0a0d593efdcf78ac923bc3313e4e7d408d574354ee2b3288c0da9fbba6ed'),
	        h('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140'),
	      ),
	    ).equals(
	      h(
	        '54c4a33c6423d689378f160a7ff8b61330444abb58fb470f96ea16d99d4a2fed07082304410efa6b2943111b6a4e0aaa7b7db55a07e9861d1fb3cb1f421044a5',
	      ),
	    ),
	  );
	  assert(
	    ecc.verify(
	      h('5e9f0a0d593efdcf78ac923bc3313e4e7d408d574354ee2b3288c0da9fbba6ed'),
	      h('0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'),
	      h(
	        '54c4a33c6423d689378f160a7ff8b61330444abb58fb470f96ea16d99d4a2fed07082304410efa6b2943111b6a4e0aaa7b7db55a07e9861d1fb3cb1f421044a5',
	      ),
	    ),
	  );
	  if (ecc.signSchnorr) {
	    assert(
	      bufferExports.Buffer.from(
	        ecc.signSchnorr(
	          h('7e2d58d8b3bcdf1abadec7829054f90dda9805aab56c77333024b9d0a508b75c'),
	          h('c90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b14e5c9'),
	          h('c87aa53824b4d7ae2eb035a2b5bbbccc080e76cdc6d1692c4b0b62d798e6d906'),
	        ),
	      ).equals(
	        h(
	          '5831aaeed7b44bb74e5eab94ba9d4294c49bcf2a60728d8b4c200f50dd313c1bab745879a5ad954a72c45a91c3a51d3c7adea98d82f8481e0e1e03674a6f3fb7',
	        ),
	      ),
	    );
	  }
	  if (ecc.verifySchnorr) {
	    assert(
	      ecc.verifySchnorr(
	        h('7e2d58d8b3bcdf1abadec7829054f90dda9805aab56c77333024b9d0a508b75c'),
	        h('dd308afec5777e13121fa72b9cc1b7cc0139715309b086c960e18fd969774eb8'),
	        h(
	          '5831aaeed7b44bb74e5eab94ba9d4294c49bcf2a60728d8b4c200f50dd313c1bab745879a5ad954a72c45a91c3a51d3c7adea98d82f8481e0e1e03674a6f3fb7',
	        ),
	      ),
	    );
	  }
	}
	function assert(bool) {
	  if (!bool) throw new Error('ecc library invalid');
	}

	const HEX_STRINGS = "0123456789abcdefABCDEF";
	HEX_STRINGS.split("").map((c) => c.codePointAt(0));
	Array(256)
	    .fill(true)
	    .map((_, i) => {
	    const s = String.fromCodePoint(i);
	    const index = HEX_STRINGS.indexOf(s);
	    // ABCDEF will use 10 - 15
	    return index < 0 ? undefined : index < 16 ? index : index - 6;
	});
	new TextEncoder();
	new TextDecoder();
	function concat(arrays) {
	    const totalLength = arrays.reduce((a, b) => a + b.length, 0);
	    const result = new Uint8Array(totalLength);
	    let offset = 0;
	    for (const array of arrays) {
	        result.set(array, offset);
	        offset += array.length;
	    }
	    return result;
	}
	function writeUInt32(buffer, offset, value, littleEndian) {
	    if (offset + 4 > buffer.length) {
	        throw new Error("Offset is outside the bounds of Uint8Array");
	    }
	    littleEndian = littleEndian.toUpperCase();
	    if (value > 0xffffffff) {
	        throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${0xffffffff}. Received ${value}`);
	    }
	    if (littleEndian === "LE") {
	        buffer[offset] = value & 0xff;
	        buffer[offset + 1] = (value >> 8) & 0xff;
	        buffer[offset + 2] = (value >> 16) & 0xff;
	        buffer[offset + 3] = (value >> 24) & 0xff;
	    }
	    else {
	        buffer[offset] = (value >> 24) & 0xff;
	        buffer[offset + 1] = (value >> 16) & 0xff;
	        buffer[offset + 2] = (value >> 8) & 0xff;
	        buffer[offset + 3] = value & 0xff;
	    }
	}

	const ECPairOptionsSchema = optional(
	  object({
	    compressed: optional(boolean()),
	    network: optional(NetworkSchema),
	    // https://github.com/fabian-hiller/valibot/issues/243#issuecomment-2182514063
	    rng: optional(
	      pipe(
	        instance(Function),
	        transform((func) => {
	          return (arg) => {
	            const parsedArg = parse(optional(number()), arg);
	            const returnedValue = func(parsedArg);
	            const parsedReturn = parse(instance(Uint8Array), returnedValue);
	            return parsedReturn;
	          };
	        }),
	      ),
	    ),
	  }),
	);
	const toXOnly = (pubKey) =>
	  pubKey.length === 32 ? pubKey : pubKey.subarray(1, 33);
	function ECPairFactory(ecc) {
	  testEcc(ecc);
	  function isPoint(maybePoint) {
	    return ecc.isPoint(maybePoint);
	  }
	  function fromPrivateKey(buffer, options) {
	    parse(Buffer256Bit, buffer);
	    if (!ecc.isPrivate(buffer))
	      throw new TypeError('Private key not in range [1, n)');
	    parse(ECPairOptionsSchema, options);
	    return new ECPair(buffer, undefined, options);
	  }
	  function fromPublicKey(buffer, options) {
	    if (!ecc.isPoint(buffer)) {
	      throw new Error('Point not on the curve');
	    }
	    parse(ECPairOptionsSchema, options);
	    return new ECPair(undefined, buffer, options);
	  }
	  function fromWIF(wifString, network) {
	    const decoded = decode(wifString);
	    const version = decoded.version;
	    // list of networks?
	    if (Array.isArray(network)) {
	      network = network
	        .filter((x) => {
	          return version === x.wif;
	        })
	        .pop();
	      if (!network) throw new Error('Unknown network version');
	      // otherwise, assume a network object (or default to bitcoin)
	    } else {
	      network = network || bitcoin;
	      if (version !== network.wif) throw new Error('Invalid network version');
	    }
	    return fromPrivateKey(decoded.privateKey, {
	      compressed: decoded.compressed,
	      network: network,
	    });
	  }
	  /**
	   * Generates a random ECPairInterface.
	   *
	   * Uses `crypto.getRandomValues` under the hood for options.rng function, which is still an experimental feature as of Node.js 18.19.0. To work around this you can do one of the following:
	   * 1. Use a polyfill for crypto.getRandomValues()
	   * 2. Use the `--experimental-global-webcrypto` flag when running node.js.
	   * 3. Pass in a custom rng function to generate random values.
	   *
	   * @param {ECPairOptions} options - Options for the ECPairInterface.
	   * @return {ECPairInterface} A random ECPairInterface.
	   */
	  function makeRandom(options) {
	    parse(ECPairOptionsSchema, options);
	    if (options === undefined) options = {};
	    const rng =
	      options.rng || ((size) => crypto.getRandomValues(new Uint8Array(size)));
	    let d;
	    do {
	      d = rng(32);
	      parse(Buffer256Bit, d);
	    } while (!ecc.isPrivate(d));
	    return fromPrivateKey(d, options);
	  }
	  class ECPair {
	    __D;
	    __Q;
	    compressed;
	    network;
	    lowR;
	    constructor(__D, __Q, options) {
	      this.__D = __D;
	      this.__Q = __Q;
	      this.lowR = false;
	      if (options === undefined) options = {};
	      this.compressed =
	        options.compressed === undefined ? true : options.compressed;
	      this.network = options.network || bitcoin;
	      if (__Q !== undefined) this.__Q = ecc.pointCompress(__Q, this.compressed);
	    }
	    get privateKey() {
	      return this.__D;
	    }
	    get publicKey() {
	      if (!this.__Q) {
	        // It is not possible for both `__Q` and `__D` to be `undefined` at the same time.
	        // The factory methods guard for this.
	        const p = ecc.pointFromScalar(this.__D, this.compressed);
	        // It is not possible for `p` to be null.
	        // `fromPrivateKey()` checks that `__D` is a valid scalar.
	        this.__Q = p;
	      }
	      return this.__Q;
	    }
	    toWIF() {
	      if (!this.__D) throw new Error('Missing private key');
	      return encode({
	        compressed: this.compressed,
	        privateKey: this.__D,
	        version: this.network.wif,
	      });
	    }
	    tweak(t) {
	      if (this.privateKey) return this.tweakFromPrivateKey(t);
	      return this.tweakFromPublicKey(t);
	    }
	    sign(hash, lowR) {
	      if (!this.__D) throw new Error('Missing private key');
	      if (lowR === undefined) lowR = this.lowR;
	      if (lowR === false) {
	        return ecc.sign(hash, this.__D);
	      } else {
	        let sig = ecc.sign(hash, this.__D);
	        const extraData = new Uint8Array(32);
	        let counter = 0;
	        // if first try is lowR, skip the loop
	        // for second try and on, add extra entropy counting up
	        while (sig[0] > 0x7f) {
	          counter++;
	          writeUInt32(extraData, 0, counter, 'LE');
	          sig = ecc.sign(hash, this.__D, extraData);
	        }
	        return sig;
	      }
	    }
	    signSchnorr(hash) {
	      if (!this.privateKey) throw new Error('Missing private key');
	      if (!ecc.signSchnorr)
	        throw new Error('signSchnorr not supported by ecc library');
	      return ecc.signSchnorr(hash, this.privateKey);
	    }
	    verify(hash, signature) {
	      return ecc.verify(hash, this.publicKey, signature);
	    }
	    verifySchnorr(hash, signature) {
	      if (!ecc.verifySchnorr)
	        throw new Error('verifySchnorr not supported by ecc library');
	      return ecc.verifySchnorr(hash, this.publicKey.subarray(1, 33), signature);
	    }
	    tweakFromPublicKey(t) {
	      const xOnlyPubKey = toXOnly(this.publicKey);
	      const tweakedPublicKey = ecc.xOnlyPointAddTweak(xOnlyPubKey, t);
	      if (!tweakedPublicKey || tweakedPublicKey.xOnlyPubkey === null)
	        throw new Error('Cannot tweak public key!');
	      const parityByte = Uint8Array.from([
	        tweakedPublicKey.parity === 0 ? 0x02 : 0x03,
	      ]);
	      return fromPublicKey(
	        concat([parityByte, tweakedPublicKey.xOnlyPubkey]),
	        {
	          network: this.network,
	          compressed: this.compressed,
	        },
	      );
	    }
	    tweakFromPrivateKey(t) {
	      const hasOddY =
	        this.publicKey[0] === 3 ||
	        (this.publicKey[0] === 4 && (this.publicKey[64] & 1) === 1);
	      const privateKey = hasOddY
	        ? ecc.privateNegate(this.privateKey)
	        : this.privateKey;
	      const tweakedPrivateKey = ecc.privateAdd(privateKey, t);
	      if (!tweakedPrivateKey) throw new Error('Invalid tweaked private key!');
	      return fromPrivateKey(tweakedPrivateKey, {
	        network: this.network,
	        compressed: this.compressed,
	      });
	    }
	  }
	  return {
	    isPoint,
	    fromPrivateKey,
	    fromPublicKey,
	    fromWIF,
	    makeRandom,
	  };
	}

	var dist$1 = {};

	var secp256k1 = {};

	var _shortw_utils = {};

	var weierstrass = {};

	var hmac = {};

	var hasRequiredHmac;

	function requireHmac () {
		if (hasRequiredHmac) return hmac;
		hasRequiredHmac = 1;
		(function (exports$1) {
			Object.defineProperty(exports$1, "__esModule", { value: true });
			exports$1.hmac = exports$1.HMAC = void 0;
			/**
			 * HMAC: RFC2104 message authentication code.
			 * @module
			 */
			const utils_ts_1 = /*@__PURE__*/ requireUtils$3();
			class HMAC extends utils_ts_1.Hash {
			    constructor(hash, _key) {
			        super();
			        this.finished = false;
			        this.destroyed = false;
			        (0, utils_ts_1.ahash)(hash);
			        const key = (0, utils_ts_1.toBytes)(_key);
			        this.iHash = hash.create();
			        if (typeof this.iHash.update !== 'function')
			            throw new Error('Expected instance of class which extends utils.Hash');
			        this.blockLen = this.iHash.blockLen;
			        this.outputLen = this.iHash.outputLen;
			        const blockLen = this.blockLen;
			        const pad = new Uint8Array(blockLen);
			        // blockLen can be bigger than outputLen
			        pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
			        for (let i = 0; i < pad.length; i++)
			            pad[i] ^= 0x36;
			        this.iHash.update(pad);
			        // By doing update (processing of first block) of outer hash here we can re-use it between multiple calls via clone
			        this.oHash = hash.create();
			        // Undo internal XOR && apply outer XOR
			        for (let i = 0; i < pad.length; i++)
			            pad[i] ^= 0x36 ^ 0x5c;
			        this.oHash.update(pad);
			        (0, utils_ts_1.clean)(pad);
			    }
			    update(buf) {
			        (0, utils_ts_1.aexists)(this);
			        this.iHash.update(buf);
			        return this;
			    }
			    digestInto(out) {
			        (0, utils_ts_1.aexists)(this);
			        (0, utils_ts_1.abytes)(out, this.outputLen);
			        this.finished = true;
			        this.iHash.digestInto(out);
			        this.oHash.update(out);
			        this.oHash.digestInto(out);
			        this.destroy();
			    }
			    digest() {
			        const out = new Uint8Array(this.oHash.outputLen);
			        this.digestInto(out);
			        return out;
			    }
			    _cloneInto(to) {
			        // Create new instance without calling constructor since key already in state and we don't know it.
			        to || (to = Object.create(Object.getPrototypeOf(this), {}));
			        const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
			        to = to;
			        to.finished = finished;
			        to.destroyed = destroyed;
			        to.blockLen = blockLen;
			        to.outputLen = outputLen;
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
			exports$1.HMAC = HMAC;
			/**
			 * HMAC: RFC2104 message authentication code.
			 * @param hash - function that would be used e.g. sha256
			 * @param key - message key
			 * @param message - message data
			 * @example
			 * import { hmac } from '@noble/hashes/hmac';
			 * import { sha256 } from '@noble/hashes/sha2';
			 * const mac1 = hmac(sha256, 'key', 'message');
			 */
			const hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
			exports$1.hmac = hmac;
			exports$1.hmac.create = (hash, key) => new HMAC(hash, key);
			
		} (hmac));
		return hmac;
	}

	var utils$1 = {};

	var hasRequiredUtils$1;

	function requireUtils$1 () {
		if (hasRequiredUtils$1) return utils$1;
		hasRequiredUtils$1 = 1;
		(function (exports$1) {
			Object.defineProperty(exports$1, "__esModule", { value: true });
			exports$1.notImplemented = exports$1.bitMask = exports$1.utf8ToBytes = exports$1.randomBytes = exports$1.isBytes = exports$1.hexToBytes = exports$1.concatBytes = exports$1.bytesToUtf8 = exports$1.bytesToHex = exports$1.anumber = exports$1.abytes = void 0;
			exports$1.abool = abool;
			exports$1._abool2 = _abool2;
			exports$1._abytes2 = _abytes2;
			exports$1.numberToHexUnpadded = numberToHexUnpadded;
			exports$1.hexToNumber = hexToNumber;
			exports$1.bytesToNumberBE = bytesToNumberBE;
			exports$1.bytesToNumberLE = bytesToNumberLE;
			exports$1.numberToBytesBE = numberToBytesBE;
			exports$1.numberToBytesLE = numberToBytesLE;
			exports$1.numberToVarBytesBE = numberToVarBytesBE;
			exports$1.ensureBytes = ensureBytes;
			exports$1.equalBytes = equalBytes;
			exports$1.copyBytes = copyBytes;
			exports$1.asciiToBytes = asciiToBytes;
			exports$1.inRange = inRange;
			exports$1.aInRange = aInRange;
			exports$1.bitLen = bitLen;
			exports$1.bitGet = bitGet;
			exports$1.bitSet = bitSet;
			exports$1.createHmacDrbg = createHmacDrbg;
			exports$1.validateObject = validateObject;
			exports$1.isHash = isHash;
			exports$1._validateObject = _validateObject;
			exports$1.memoized = memoized;
			/**
			 * Hex, bytes and number utilities.
			 * @module
			 */
			/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
			const utils_js_1 = /*@__PURE__*/ requireUtils$3();
			var utils_js_2 = /*@__PURE__*/ requireUtils$3();
			Object.defineProperty(exports$1, "abytes", { enumerable: true, get: function () { return utils_js_2.abytes; } });
			Object.defineProperty(exports$1, "anumber", { enumerable: true, get: function () { return utils_js_2.anumber; } });
			Object.defineProperty(exports$1, "bytesToHex", { enumerable: true, get: function () { return utils_js_2.bytesToHex; } });
			Object.defineProperty(exports$1, "bytesToUtf8", { enumerable: true, get: function () { return utils_js_2.bytesToUtf8; } });
			Object.defineProperty(exports$1, "concatBytes", { enumerable: true, get: function () { return utils_js_2.concatBytes; } });
			Object.defineProperty(exports$1, "hexToBytes", { enumerable: true, get: function () { return utils_js_2.hexToBytes; } });
			Object.defineProperty(exports$1, "isBytes", { enumerable: true, get: function () { return utils_js_2.isBytes; } });
			Object.defineProperty(exports$1, "randomBytes", { enumerable: true, get: function () { return utils_js_2.randomBytes; } });
			Object.defineProperty(exports$1, "utf8ToBytes", { enumerable: true, get: function () { return utils_js_2.utf8ToBytes; } });
			const _0n = /* @__PURE__ */ BigInt(0);
			const _1n = /* @__PURE__ */ BigInt(1);
			function abool(title, value) {
			    if (typeof value !== 'boolean')
			        throw new Error(title + ' boolean expected, got ' + value);
			}
			// tmp name until v2
			function _abool2(value, title = '') {
			    if (typeof value !== 'boolean') {
			        const prefix = title && `"${title}"`;
			        throw new Error(prefix + 'expected boolean, got type=' + typeof value);
			    }
			    return value;
			}
			// tmp name until v2
			/** Asserts something is Uint8Array. */
			function _abytes2(value, length, title = '') {
			    const bytes = (0, utils_js_1.isBytes)(value);
			    const len = value?.length;
			    const needsLen = length !== undefined;
			    if (!bytes || (needsLen && len !== length)) {
			        const prefix = title && `"${title}" `;
			        const ofLen = needsLen ? ` of length ${length}` : '';
			        const got = bytes ? `length=${len}` : `type=${typeof value}`;
			        throw new Error(prefix + 'expected Uint8Array' + ofLen + ', got ' + got);
			    }
			    return value;
			}
			// Used in weierstrass, der
			function numberToHexUnpadded(num) {
			    const hex = num.toString(16);
			    return hex.length & 1 ? '0' + hex : hex;
			}
			function hexToNumber(hex) {
			    if (typeof hex !== 'string')
			        throw new Error('hex string expected, got ' + typeof hex);
			    return hex === '' ? _0n : BigInt('0x' + hex); // Big Endian
			}
			// BE: Big Endian, LE: Little Endian
			function bytesToNumberBE(bytes) {
			    return hexToNumber((0, utils_js_1.bytesToHex)(bytes));
			}
			function bytesToNumberLE(bytes) {
			    (0, utils_js_1.abytes)(bytes);
			    return hexToNumber((0, utils_js_1.bytesToHex)(Uint8Array.from(bytes).reverse()));
			}
			function numberToBytesBE(n, len) {
			    return (0, utils_js_1.hexToBytes)(n.toString(16).padStart(len * 2, '0'));
			}
			function numberToBytesLE(n, len) {
			    return numberToBytesBE(n, len).reverse();
			}
			// Unpadded, rarely used
			function numberToVarBytesBE(n) {
			    return (0, utils_js_1.hexToBytes)(numberToHexUnpadded(n));
			}
			/**
			 * Takes hex string or Uint8Array, converts to Uint8Array.
			 * Validates output length.
			 * Will throw error for other types.
			 * @param title descriptive title for an error e.g. 'secret key'
			 * @param hex hex string or Uint8Array
			 * @param expectedLength optional, will compare to result array's length
			 * @returns
			 */
			function ensureBytes(title, hex, expectedLength) {
			    let res;
			    if (typeof hex === 'string') {
			        try {
			            res = (0, utils_js_1.hexToBytes)(hex);
			        }
			        catch (e) {
			            throw new Error(title + ' must be hex string or Uint8Array, cause: ' + e);
			        }
			    }
			    else if ((0, utils_js_1.isBytes)(hex)) {
			        // Uint8Array.from() instead of hash.slice() because node.js Buffer
			        // is instance of Uint8Array, and its slice() creates **mutable** copy
			        res = Uint8Array.from(hex);
			    }
			    else {
			        throw new Error(title + ' must be hex string or Uint8Array');
			    }
			    const len = res.length;
			    if (typeof expectedLength === 'number' && len !== expectedLength)
			        throw new Error(title + ' of length ' + expectedLength + ' expected, got ' + len);
			    return res;
			}
			// Compares 2 u8a-s in kinda constant time
			function equalBytes(a, b) {
			    if (a.length !== b.length)
			        return false;
			    let diff = 0;
			    for (let i = 0; i < a.length; i++)
			        diff |= a[i] ^ b[i];
			    return diff === 0;
			}
			/**
			 * Copies Uint8Array. We can't use u8a.slice(), because u8a can be Buffer,
			 * and Buffer#slice creates mutable copy. Never use Buffers!
			 */
			function copyBytes(bytes) {
			    return Uint8Array.from(bytes);
			}
			/**
			 * Decodes 7-bit ASCII string to Uint8Array, throws on non-ascii symbols
			 * Should be safe to use for things expected to be ASCII.
			 * Returns exact same result as utf8ToBytes for ASCII or throws.
			 */
			function asciiToBytes(ascii) {
			    return Uint8Array.from(ascii, (c, i) => {
			        const charCode = c.charCodeAt(0);
			        if (c.length !== 1 || charCode > 127) {
			            throw new Error(`string contains non-ASCII character "${ascii[i]}" with code ${charCode} at position ${i}`);
			        }
			        return charCode;
			    });
			}
			/**
			 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
			 */
			// export const utf8ToBytes: typeof utf8ToBytes_ = utf8ToBytes_;
			/**
			 * Converts bytes to string using UTF8 encoding.
			 * @example bytesToUtf8(Uint8Array.from([97, 98, 99])) // 'abc'
			 */
			// export const bytesToUtf8: typeof bytesToUtf8_ = bytesToUtf8_;
			// Is positive bigint
			const isPosBig = (n) => typeof n === 'bigint' && _0n <= n;
			function inRange(n, min, max) {
			    return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
			}
			/**
			 * Asserts min <= n < max. NOTE: It's < max and not <= max.
			 * @example
			 * aInRange('x', x, 1n, 256n); // would assume x is in (1n..255n)
			 */
			function aInRange(title, n, min, max) {
			    // Why min <= n < max and not a (min < n < max) OR b (min <= n <= max)?
			    // consider P=256n, min=0n, max=P
			    // - a for min=0 would require -1:          `inRange('x', x, -1n, P)`
			    // - b would commonly require subtraction:  `inRange('x', x, 0n, P - 1n)`
			    // - our way is the cleanest:               `inRange('x', x, 0n, P)
			    if (!inRange(n, min, max))
			        throw new Error('expected valid ' + title + ': ' + min + ' <= n < ' + max + ', got ' + n);
			}
			// Bit operations
			/**
			 * Calculates amount of bits in a bigint.
			 * Same as `n.toString(2).length`
			 * TODO: merge with nLength in modular
			 */
			function bitLen(n) {
			    let len;
			    for (len = 0; n > _0n; n >>= _1n, len += 1)
			        ;
			    return len;
			}
			/**
			 * Gets single bit at position.
			 * NOTE: first bit position is 0 (same as arrays)
			 * Same as `!!+Array.from(n.toString(2)).reverse()[pos]`
			 */
			function bitGet(n, pos) {
			    return (n >> BigInt(pos)) & _1n;
			}
			/**
			 * Sets single bit at position.
			 */
			function bitSet(n, pos, value) {
			    return n | ((value ? _1n : _0n) << BigInt(pos));
			}
			/**
			 * Calculate mask for N bits. Not using ** operator with bigints because of old engines.
			 * Same as BigInt(`0b${Array(i).fill('1').join('')}`)
			 */
			const bitMask = (n) => (_1n << BigInt(n)) - _1n;
			exports$1.bitMask = bitMask;
			/**
			 * Minimal HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
			 * @returns function that will call DRBG until 2nd arg returns something meaningful
			 * @example
			 *   const drbg = createHmacDRBG<Key>(32, 32, hmac);
			 *   drbg(seed, bytesToKey); // bytesToKey must return Key or undefined
			 */
			function createHmacDrbg(hashLen, qByteLen, hmacFn) {
			    if (typeof hashLen !== 'number' || hashLen < 2)
			        throw new Error('hashLen must be a number');
			    if (typeof qByteLen !== 'number' || qByteLen < 2)
			        throw new Error('qByteLen must be a number');
			    if (typeof hmacFn !== 'function')
			        throw new Error('hmacFn must be a function');
			    // Step B, Step C: set hashLen to 8*ceil(hlen/8)
			    const u8n = (len) => new Uint8Array(len); // creates Uint8Array
			    const u8of = (byte) => Uint8Array.of(byte); // another shortcut
			    let v = u8n(hashLen); // Minimal non-full-spec HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
			    let k = u8n(hashLen); // Steps B and C of RFC6979 3.2: set hashLen, in our case always same
			    let i = 0; // Iterations counter, will throw when over 1000
			    const reset = () => {
			        v.fill(1);
			        k.fill(0);
			        i = 0;
			    };
			    const h = (...b) => hmacFn(k, v, ...b); // hmac(k)(v, ...values)
			    const reseed = (seed = u8n(0)) => {
			        // HMAC-DRBG reseed() function. Steps D-G
			        k = h(u8of(0x00), seed); // k = hmac(k || v || 0x00 || seed)
			        v = h(); // v = hmac(k || v)
			        if (seed.length === 0)
			            return;
			        k = h(u8of(0x01), seed); // k = hmac(k || v || 0x01 || seed)
			        v = h(); // v = hmac(k || v)
			    };
			    const gen = () => {
			        // HMAC-DRBG generate() function
			        if (i++ >= 1000)
			            throw new Error('drbg: tried 1000 values');
			        let len = 0;
			        const out = [];
			        while (len < qByteLen) {
			            v = h();
			            const sl = v.slice();
			            out.push(sl);
			            len += v.length;
			        }
			        return (0, utils_js_1.concatBytes)(...out);
			    };
			    const genUntil = (seed, pred) => {
			        reset();
			        reseed(seed); // Steps D-G
			        let res = undefined; // Step H: grind until k is in [1..n-1]
			        while (!(res = pred(gen())))
			            reseed();
			        reset();
			        return res;
			    };
			    return genUntil;
			}
			// Validating curves and fields
			const validatorFns = {
			    bigint: (val) => typeof val === 'bigint',
			    function: (val) => typeof val === 'function',
			    boolean: (val) => typeof val === 'boolean',
			    string: (val) => typeof val === 'string',
			    stringOrUint8Array: (val) => typeof val === 'string' || (0, utils_js_1.isBytes)(val),
			    isSafeInteger: (val) => Number.isSafeInteger(val),
			    array: (val) => Array.isArray(val),
			    field: (val, object) => object.Fp.isValid(val),
			    hash: (val) => typeof val === 'function' && Number.isSafeInteger(val.outputLen),
			};
			// type Record<K extends string | number | symbol, T> = { [P in K]: T; }
			function validateObject(object, validators, optValidators = {}) {
			    const checkField = (fieldName, type, isOptional) => {
			        const checkVal = validatorFns[type];
			        if (typeof checkVal !== 'function')
			            throw new Error('invalid validator function');
			        const val = object[fieldName];
			        if (isOptional && val === undefined)
			            return;
			        if (!checkVal(val, object)) {
			            throw new Error('param ' + String(fieldName) + ' is invalid. Expected ' + type + ', got ' + val);
			        }
			    };
			    for (const [fieldName, type] of Object.entries(validators))
			        checkField(fieldName, type, false);
			    for (const [fieldName, type] of Object.entries(optValidators))
			        checkField(fieldName, type, true);
			    return object;
			}
			// validate type tests
			// const o: { a: number; b: number; c: number } = { a: 1, b: 5, c: 6 };
			// const z0 = validateObject(o, { a: 'isSafeInteger' }, { c: 'bigint' }); // Ok!
			// // Should fail type-check
			// const z1 = validateObject(o, { a: 'tmp' }, { c: 'zz' });
			// const z2 = validateObject(o, { a: 'isSafeInteger' }, { c: 'zz' });
			// const z3 = validateObject(o, { test: 'boolean', z: 'bug' });
			// const z4 = validateObject(o, { a: 'boolean', z: 'bug' });
			function isHash(val) {
			    return typeof val === 'function' && Number.isSafeInteger(val.outputLen);
			}
			function _validateObject(object, fields, optFields = {}) {
			    if (!object || typeof object !== 'object')
			        throw new Error('expected valid options object');
			    function checkField(fieldName, expectedType, isOpt) {
			        const val = object[fieldName];
			        if (isOpt && val === undefined)
			            return;
			        const current = typeof val;
			        if (current !== expectedType || val === null)
			            throw new Error(`param "${fieldName}" is invalid: expected ${expectedType}, got ${current}`);
			    }
			    Object.entries(fields).forEach(([k, v]) => checkField(k, v, false));
			    Object.entries(optFields).forEach(([k, v]) => checkField(k, v, true));
			}
			/**
			 * throws not implemented error
			 */
			const notImplemented = () => {
			    throw new Error('not implemented');
			};
			exports$1.notImplemented = notImplemented;
			/**
			 * Memoizes (caches) computation result.
			 * Uses WeakMap: the value is going auto-cleaned by GC after last reference is removed.
			 */
			function memoized(fn) {
			    const map = new WeakMap();
			    return (arg, ...args) => {
			        const val = map.get(arg);
			        if (val !== undefined)
			            return val;
			        const computed = fn(arg, ...args);
			        map.set(arg, computed);
			        return computed;
			    };
			}
			
		} (utils$1));
		return utils$1;
	}

	var curve = {};

	var modular = {};

	var hasRequiredModular;

	function requireModular () {
		if (hasRequiredModular) return modular;
		hasRequiredModular = 1;
		Object.defineProperty(modular, "__esModule", { value: true });
		modular.isNegativeLE = void 0;
		modular.mod = mod;
		modular.pow = pow;
		modular.pow2 = pow2;
		modular.invert = invert;
		modular.tonelliShanks = tonelliShanks;
		modular.FpSqrt = FpSqrt;
		modular.validateField = validateField;
		modular.FpPow = FpPow;
		modular.FpInvertBatch = FpInvertBatch;
		modular.FpDiv = FpDiv;
		modular.FpLegendre = FpLegendre;
		modular.FpIsSquare = FpIsSquare;
		modular.nLength = nLength;
		modular.Field = Field;
		modular.FpSqrtOdd = FpSqrtOdd;
		modular.FpSqrtEven = FpSqrtEven;
		modular.hashToPrivateScalar = hashToPrivateScalar;
		modular.getFieldBytesLength = getFieldBytesLength;
		modular.getMinHashLength = getMinHashLength;
		modular.mapHashToField = mapHashToField;
		/**
		 * Utils for modular division and fields.
		 * Field over 11 is a finite (Galois) field is integer number operations `mod 11`.
		 * There is no division: it is replaced by modular multiplicative inverse.
		 * @module
		 */
		/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
		const utils_ts_1 = /*@__PURE__*/ requireUtils$1();
		// prettier-ignore
		const _0n = BigInt(0), _1n = BigInt(1), _2n = /* @__PURE__ */ BigInt(2), _3n = /* @__PURE__ */ BigInt(3);
		// prettier-ignore
		const _4n = /* @__PURE__ */ BigInt(4), _5n = /* @__PURE__ */ BigInt(5), _7n = /* @__PURE__ */ BigInt(7);
		// prettier-ignore
		const _8n = /* @__PURE__ */ BigInt(8), _9n = /* @__PURE__ */ BigInt(9), _16n = /* @__PURE__ */ BigInt(16);
		// Calculates a modulo b
		function mod(a, b) {
		    const result = a % b;
		    return result >= _0n ? result : b + result;
		}
		/**
		 * Efficiently raise num to power and do modular division.
		 * Unsafe in some contexts: uses ladder, so can expose bigint bits.
		 * @example
		 * pow(2n, 6n, 11n) // 64n % 11n == 9n
		 */
		function pow(num, power, modulo) {
		    return FpPow(Field(modulo), num, power);
		}
		/** Does `x^(2^power)` mod p. `pow2(30, 4)` == `30^(2^4)` */
		function pow2(x, power, modulo) {
		    let res = x;
		    while (power-- > _0n) {
		        res *= res;
		        res %= modulo;
		    }
		    return res;
		}
		/**
		 * Inverses number over modulo.
		 * Implemented using [Euclidean GCD](https://brilliant.org/wiki/extended-euclidean-algorithm/).
		 */
		function invert(number, modulo) {
		    if (number === _0n)
		        throw new Error('invert: expected non-zero number');
		    if (modulo <= _0n)
		        throw new Error('invert: expected positive modulus, got ' + modulo);
		    // Fermat's little theorem "CT-like" version inv(n) = n^(m-2) mod m is 30x slower.
		    let a = mod(number, modulo);
		    let b = modulo;
		    // prettier-ignore
		    let x = _0n, u = _1n;
		    while (a !== _0n) {
		        // JIT applies optimization if those two lines follow each other
		        const q = b / a;
		        const r = b % a;
		        const m = x - u * q;
		        // prettier-ignore
		        b = a, a = r, x = u, u = m;
		    }
		    const gcd = b;
		    if (gcd !== _1n)
		        throw new Error('invert: does not exist');
		    return mod(x, modulo);
		}
		function assertIsSquare(Fp, root, n) {
		    if (!Fp.eql(Fp.sqr(root), n))
		        throw new Error('Cannot find square root');
		}
		// Not all roots are possible! Example which will throw:
		// const NUM =
		// n = 72057594037927816n;
		// Fp = Field(BigInt('0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab'));
		function sqrt3mod4(Fp, n) {
		    const p1div4 = (Fp.ORDER + _1n) / _4n;
		    const root = Fp.pow(n, p1div4);
		    assertIsSquare(Fp, root, n);
		    return root;
		}
		function sqrt5mod8(Fp, n) {
		    const p5div8 = (Fp.ORDER - _5n) / _8n;
		    const n2 = Fp.mul(n, _2n);
		    const v = Fp.pow(n2, p5div8);
		    const nv = Fp.mul(n, v);
		    const i = Fp.mul(Fp.mul(nv, _2n), v);
		    const root = Fp.mul(nv, Fp.sub(i, Fp.ONE));
		    assertIsSquare(Fp, root, n);
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
		    const c4 = (P + _7n) / _16n; //  4. c4 = (q + 7) / 16        # Integer arithmetic
		    return (Fp, n) => {
		        let tv1 = Fp.pow(n, c4); //  1. tv1 = x^c4
		        let tv2 = Fp.mul(tv1, c1); //  2. tv2 = c1 * tv1
		        const tv3 = Fp.mul(tv1, c2); //  3. tv3 = c2 * tv1
		        const tv4 = Fp.mul(tv1, c3); //  4. tv4 = c3 * tv1
		        const e1 = Fp.eql(Fp.sqr(tv2), n); //  5.  e1 = (tv2^2) == x
		        const e2 = Fp.eql(Fp.sqr(tv3), n); //  6.  e2 = (tv3^2) == x
		        tv1 = Fp.cmov(tv1, tv2, e1); //  7. tv1 = CMOV(tv1, tv2, e1)  # Select tv2 if (tv2^2) == x
		        tv2 = Fp.cmov(tv4, tv3, e2); //  8. tv2 = CMOV(tv4, tv3, e2)  # Select tv3 if (tv3^2) == x
		        const e3 = Fp.eql(Fp.sqr(tv2), n); //  9.  e3 = (tv2^2) == x
		        const root = Fp.cmov(tv1, tv2, e3); // 10.  z = CMOV(tv1, tv2, e3)   # Select sqrt from tv1 & tv2
		        assertIsSquare(Fp, root, n);
		        return root;
		    };
		}
		/**
		 * Tonelli-Shanks square root search algorithm.
		 * 1. https://eprint.iacr.org/2012/685.pdf (page 12)
		 * 2. Square Roots from 1; 24, 51, 10 to Dan Shanks
		 * @param P field order
		 * @returns function that takes field Fp (created from P) and number n
		 */
		function tonelliShanks(P) {
		    // Initialization (precomputation).
		    // Caching initialization could boost perf by 7%.
		    if (P < _3n)
		        throw new Error('sqrt is not defined for small field');
		    // Factor P - 1 = Q * 2^S, where Q is odd
		    let Q = P - _1n;
		    let S = 0;
		    while (Q % _2n === _0n) {
		        Q /= _2n;
		        S++;
		    }
		    // Find the first quadratic non-residue Z >= 2
		    let Z = _2n;
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
		    const Q1div2 = (Q + _1n) / _2n;
		    return function tonelliSlow(Fp, n) {
		        if (Fp.is0(n))
		            return n;
		        // Check if n is a quadratic residue using Legendre symbol
		        if (FpLegendre(Fp, n) !== 1)
		            throw new Error('Cannot find square root');
		        // Initialize variables for the main loop
		        let M = S;
		        let c = Fp.mul(Fp.ONE, cc); // c = z^Q, move cc from field _Fp into field Fp
		        let t = Fp.pow(n, Q); // t = n^Q, first guess at the fudge factor
		        let R = Fp.pow(n, Q1div2); // R = n^((Q+1)/2), first guess at the square root
		        // Main loop
		        // while t != 1
		        while (!Fp.eql(t, Fp.ONE)) {
		            if (Fp.is0(t))
		                return Fp.ZERO; // if t=0 return R=0
		            let i = 1;
		            // Find the smallest i >= 1 such that t^(2^i) ≡ 1 (mod P)
		            let t_tmp = Fp.sqr(t); // t^(2^1)
		            while (!Fp.eql(t_tmp, Fp.ONE)) {
		                i++;
		                t_tmp = Fp.sqr(t_tmp); // t^(2^2)...
		                if (i === M)
		                    throw new Error('Cannot find square root');
		            }
		            // Calculate the exponent for b: 2^(M - i - 1)
		            const exponent = _1n << BigInt(M - i - 1); // bigint is important
		            const b = Fp.pow(c, exponent); // b = 2^(M - i - 1)
		            // Update variables
		            M = i;
		            c = Fp.sqr(b); // c = b^2
		            t = Fp.mul(t, c); // t = (t * b^2)
		            R = Fp.mul(R, b); // R = R*b
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
		 * For example there is FpSqrtOdd/FpSqrtEven to choice root based on oddness (used for hash-to-curve).
		 */
		function FpSqrt(P) {
		    // P ≡ 3 (mod 4) => √n = n^((P+1)/4)
		    if (P % _4n === _3n)
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
		// Little-endian check for first LE bit (last BE bit);
		const isNegativeLE = (num, modulo) => (mod(num, modulo) & _1n) === _1n;
		modular.isNegativeLE = isNegativeLE;
		// prettier-ignore
		const FIELD_FIELDS = [
		    'create', 'isValid', 'is0', 'neg', 'inv', 'sqrt', 'sqr',
		    'eql', 'add', 'sub', 'mul', 'pow', 'div',
		    'addN', 'subN', 'mulN', 'sqrN'
		];
		function validateField(field) {
		    const initial = {
		        ORDER: 'bigint',
		        MASK: 'bigint',
		        BYTES: 'number',
		        BITS: 'number',
		    };
		    const opts = FIELD_FIELDS.reduce((map, val) => {
		        map[val] = 'function';
		        return map;
		    }, initial);
		    (0, utils_ts_1._validateObject)(field, opts);
		    // const max = 16384;
		    // if (field.BYTES < 1 || field.BYTES > max) throw new Error('invalid field');
		    // if (field.BITS < 1 || field.BITS > 8 * max) throw new Error('invalid field');
		    return field;
		}
		// Generic field functions
		/**
		 * Same as `pow` but for Fp: non-constant-time.
		 * Unsafe in some contexts: uses ladder, so can expose bigint bits.
		 */
		function FpPow(Fp, num, power) {
		    if (power < _0n)
		        throw new Error('invalid exponent, negatives unsupported');
		    if (power === _0n)
		        return Fp.ONE;
		    if (power === _1n)
		        return num;
		    let p = Fp.ONE;
		    let d = num;
		    while (power > _0n) {
		        if (power & _1n)
		            p = Fp.mul(p, d);
		        d = Fp.sqr(d);
		        power >>= _1n;
		    }
		    return p;
		}
		/**
		 * Efficiently invert an array of Field elements.
		 * Exception-free. Will return `undefined` for 0 elements.
		 * @param passZero map 0 to 0 (instead of undefined)
		 */
		function FpInvertBatch(Fp, nums, passZero = false) {
		    const inverted = new Array(nums.length).fill(passZero ? Fp.ZERO : undefined);
		    // Walk from first to last, multiply them by each other MOD p
		    const multipliedAcc = nums.reduce((acc, num, i) => {
		        if (Fp.is0(num))
		            return acc;
		        inverted[i] = acc;
		        return Fp.mul(acc, num);
		    }, Fp.ONE);
		    // Invert last element
		    const invertedAcc = Fp.inv(multipliedAcc);
		    // Walk from last to first, multiply them by inverted each other MOD p
		    nums.reduceRight((acc, num, i) => {
		        if (Fp.is0(num))
		            return acc;
		        inverted[i] = Fp.mul(acc, inverted[i]);
		        return Fp.mul(acc, num);
		    }, invertedAcc);
		    return inverted;
		}
		// TODO: remove
		function FpDiv(Fp, lhs, rhs) {
		    return Fp.mul(lhs, typeof rhs === 'bigint' ? invert(rhs, Fp.ORDER) : Fp.inv(rhs));
		}
		/**
		 * Legendre symbol.
		 * Legendre constant is used to calculate Legendre symbol (a | p)
		 * which denotes the value of a^((p-1)/2) (mod p).
		 *
		 * * (a | p) ≡ 1    if a is a square (mod p), quadratic residue
		 * * (a | p) ≡ -1   if a is not a square (mod p), quadratic non residue
		 * * (a | p) ≡ 0    if a ≡ 0 (mod p)
		 */
		function FpLegendre(Fp, n) {
		    // We can use 3rd argument as optional cache of this value
		    // but seems unneeded for now. The operation is very fast.
		    const p1mod2 = (Fp.ORDER - _1n) / _2n;
		    const powered = Fp.pow(n, p1mod2);
		    const yes = Fp.eql(powered, Fp.ONE);
		    const zero = Fp.eql(powered, Fp.ZERO);
		    const no = Fp.eql(powered, Fp.neg(Fp.ONE));
		    if (!yes && !zero && !no)
		        throw new Error('invalid Legendre symbol result');
		    return yes ? 1 : zero ? 0 : -1;
		}
		// This function returns True whenever the value x is a square in the field F.
		function FpIsSquare(Fp, n) {
		    const l = FpLegendre(Fp, n);
		    return l === 1;
		}
		// CURVE.n lengths
		function nLength(n, nBitLength) {
		    // Bit size, byte size of CURVE.n
		    if (nBitLength !== undefined)
		        (0, utils_ts_1.anumber)(nBitLength);
		    const _nBitLength = nBitLength !== undefined ? nBitLength : n.toString(2).length;
		    const nByteLength = Math.ceil(_nBitLength / 8);
		    return { nBitLength: _nBitLength, nByteLength };
		}
		/**
		 * Creates a finite field. Major performance optimizations:
		 * * 1. Denormalized operations like mulN instead of mul.
		 * * 2. Identical object shape: never add or remove keys.
		 * * 3. `Object.freeze`.
		 * Fragile: always run a benchmark on a change.
		 * Security note: operations don't check 'isValid' for all elements for performance reasons,
		 * it is caller responsibility to check this.
		 * This is low-level code, please make sure you know what you're doing.
		 *
		 * Note about field properties:
		 * * CHARACTERISTIC p = prime number, number of elements in main subgroup.
		 * * ORDER q = similar to cofactor in curves, may be composite `q = p^m`.
		 *
		 * @param ORDER field order, probably prime, or could be composite
		 * @param bitLen how many bits the field consumes
		 * @param isLE (default: false) if encoding / decoding should be in little-endian
		 * @param redef optional faster redefinitions of sqrt and other methods
		 */
		function Field(ORDER, bitLenOrOpts, // TODO: use opts only in v2?
		isLE = false, opts = {}) {
		    if (ORDER <= _0n)
		        throw new Error('invalid field: expected ORDER > 0, got ' + ORDER);
		    let _nbitLength = undefined;
		    let _sqrt = undefined;
		    let modFromBytes = false;
		    let allowedLengths = undefined;
		    if (typeof bitLenOrOpts === 'object' && bitLenOrOpts != null) {
		        if (opts.sqrt || isLE)
		            throw new Error('cannot specify opts in two arguments');
		        const _opts = bitLenOrOpts;
		        if (_opts.BITS)
		            _nbitLength = _opts.BITS;
		        if (_opts.sqrt)
		            _sqrt = _opts.sqrt;
		        if (typeof _opts.isLE === 'boolean')
		            isLE = _opts.isLE;
		        if (typeof _opts.modFromBytes === 'boolean')
		            modFromBytes = _opts.modFromBytes;
		        allowedLengths = _opts.allowedLengths;
		    }
		    else {
		        if (typeof bitLenOrOpts === 'number')
		            _nbitLength = bitLenOrOpts;
		        if (opts.sqrt)
		            _sqrt = opts.sqrt;
		    }
		    const { nBitLength: BITS, nByteLength: BYTES } = nLength(ORDER, _nbitLength);
		    if (BYTES > 2048)
		        throw new Error('invalid field: expected ORDER of <= 2048 bytes');
		    let sqrtP; // cached sqrtP
		    const f = Object.freeze({
		        ORDER,
		        isLE,
		        BITS,
		        BYTES,
		        MASK: (0, utils_ts_1.bitMask)(BITS),
		        ZERO: _0n,
		        ONE: _1n,
		        allowedLengths: allowedLengths,
		        create: (num) => mod(num, ORDER),
		        isValid: (num) => {
		            if (typeof num !== 'bigint')
		                throw new Error('invalid field element: expected bigint, got ' + typeof num);
		            return _0n <= num && num < ORDER; // 0 is valid element, but it's not invertible
		        },
		        is0: (num) => num === _0n,
		        // is valid and invertible
		        isValidNot0: (num) => !f.is0(num) && f.isValid(num),
		        isOdd: (num) => (num & _1n) === _1n,
		        neg: (num) => mod(-num, ORDER),
		        eql: (lhs, rhs) => lhs === rhs,
		        sqr: (num) => mod(num * num, ORDER),
		        add: (lhs, rhs) => mod(lhs + rhs, ORDER),
		        sub: (lhs, rhs) => mod(lhs - rhs, ORDER),
		        mul: (lhs, rhs) => mod(lhs * rhs, ORDER),
		        pow: (num, power) => FpPow(f, num, power),
		        div: (lhs, rhs) => mod(lhs * invert(rhs, ORDER), ORDER),
		        // Same as above, but doesn't normalize
		        sqrN: (num) => num * num,
		        addN: (lhs, rhs) => lhs + rhs,
		        subN: (lhs, rhs) => lhs - rhs,
		        mulN: (lhs, rhs) => lhs * rhs,
		        inv: (num) => invert(num, ORDER),
		        sqrt: _sqrt ||
		            ((n) => {
		                if (!sqrtP)
		                    sqrtP = FpSqrt(ORDER);
		                return sqrtP(f, n);
		            }),
		        toBytes: (num) => (isLE ? (0, utils_ts_1.numberToBytesLE)(num, BYTES) : (0, utils_ts_1.numberToBytesBE)(num, BYTES)),
		        fromBytes: (bytes, skipValidation = true) => {
		            if (allowedLengths) {
		                if (!allowedLengths.includes(bytes.length) || bytes.length > BYTES) {
		                    throw new Error('Field.fromBytes: expected ' + allowedLengths + ' bytes, got ' + bytes.length);
		                }
		                const padded = new Uint8Array(BYTES);
		                // isLE add 0 to right, !isLE to the left.
		                padded.set(bytes, isLE ? 0 : padded.length - bytes.length);
		                bytes = padded;
		            }
		            if (bytes.length !== BYTES)
		                throw new Error('Field.fromBytes: expected ' + BYTES + ' bytes, got ' + bytes.length);
		            let scalar = isLE ? (0, utils_ts_1.bytesToNumberLE)(bytes) : (0, utils_ts_1.bytesToNumberBE)(bytes);
		            if (modFromBytes)
		                scalar = mod(scalar, ORDER);
		            if (!skipValidation)
		                if (!f.isValid(scalar))
		                    throw new Error('invalid field element: outside of range 0..ORDER');
		            // NOTE: we don't validate scalar here, please use isValid. This done such way because some
		            // protocol may allow non-reduced scalar that reduced later or changed some other way.
		            return scalar;
		        },
		        // TODO: we don't need it here, move out to separate fn
		        invertBatch: (lst) => FpInvertBatch(f, lst),
		        // We can't move this out because Fp6, Fp12 implement it
		        // and it's unclear what to return in there.
		        cmov: (a, b, c) => (c ? b : a),
		    });
		    return Object.freeze(f);
		}
		// Generic random scalar, we can do same for other fields if via Fp2.mul(Fp2.ONE, Fp2.random)?
		// This allows unsafe methods like ignore bias or zero. These unsafe, but often used in different protocols (if deterministic RNG).
		// which mean we cannot force this via opts.
		// Not sure what to do with randomBytes, we can accept it inside opts if wanted.
		// Probably need to export getMinHashLength somewhere?
		// random(bytes?: Uint8Array, unsafeAllowZero = false, unsafeAllowBias = false) {
		//   const LEN = !unsafeAllowBias ? getMinHashLength(ORDER) : BYTES;
		//   if (bytes === undefined) bytes = randomBytes(LEN); // _opts.randomBytes?
		//   const num = isLE ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
		//   // `mod(x, 11)` can sometimes produce 0. `mod(x, 10) + 1` is the same, but no 0
		//   const reduced = unsafeAllowZero ? mod(num, ORDER) : mod(num, ORDER - _1n) + _1n;
		//   return reduced;
		// },
		function FpSqrtOdd(Fp, elm) {
		    if (!Fp.isOdd)
		        throw new Error("Field doesn't have isOdd");
		    const root = Fp.sqrt(elm);
		    return Fp.isOdd(root) ? root : Fp.neg(root);
		}
		function FpSqrtEven(Fp, elm) {
		    if (!Fp.isOdd)
		        throw new Error("Field doesn't have isOdd");
		    const root = Fp.sqrt(elm);
		    return Fp.isOdd(root) ? Fp.neg(root) : root;
		}
		/**
		 * "Constant-time" private key generation utility.
		 * Same as mapKeyToField, but accepts less bytes (40 instead of 48 for 32-byte field).
		 * Which makes it slightly more biased, less secure.
		 * @deprecated use `mapKeyToField` instead
		 */
		function hashToPrivateScalar(hash, groupOrder, isLE = false) {
		    hash = (0, utils_ts_1.ensureBytes)('privateHash', hash);
		    const hashLen = hash.length;
		    const minLen = nLength(groupOrder).nByteLength + 8;
		    if (minLen < 24 || hashLen < minLen || hashLen > 1024)
		        throw new Error('hashToPrivateScalar: expected ' + minLen + '-1024 bytes of input, got ' + hashLen);
		    const num = isLE ? (0, utils_ts_1.bytesToNumberLE)(hash) : (0, utils_ts_1.bytesToNumberBE)(hash);
		    return mod(num, groupOrder - _1n) + _1n;
		}
		/**
		 * Returns total number of bytes consumed by the field element.
		 * For example, 32 bytes for usual 256-bit weierstrass curve.
		 * @param fieldOrder number of field elements, usually CURVE.n
		 * @returns byte length of field
		 */
		function getFieldBytesLength(fieldOrder) {
		    if (typeof fieldOrder !== 'bigint')
		        throw new Error('field order must be bigint');
		    const bitLength = fieldOrder.toString(2).length;
		    return Math.ceil(bitLength / 8);
		}
		/**
		 * Returns minimal amount of bytes that can be safely reduced
		 * by field order.
		 * Should be 2^-128 for 128-bit curve such as P256.
		 * @param fieldOrder number of field elements, usually CURVE.n
		 * @returns byte length of target hash
		 */
		function getMinHashLength(fieldOrder) {
		    const length = getFieldBytesLength(fieldOrder);
		    return length + Math.ceil(length / 2);
		}
		/**
		 * "Constant-time" private key generation utility.
		 * Can take (n + n/2) or more bytes of uniform input e.g. from CSPRNG or KDF
		 * and convert them into private scalar, with the modulo bias being negligible.
		 * Needs at least 48 bytes of input for 32-byte private key.
		 * https://research.kudelskisecurity.com/2020/07/28/the-definitive-guide-to-modulo-bias-and-how-to-avoid-it/
		 * FIPS 186-5, A.2 https://csrc.nist.gov/publications/detail/fips/186/5/final
		 * RFC 9380, https://www.rfc-editor.org/rfc/rfc9380#section-5
		 * @param hash hash output from SHA3 or a similar function
		 * @param groupOrder size of subgroup - (e.g. secp256k1.CURVE.n)
		 * @param isLE interpret hash bytes as LE num
		 * @returns valid private scalar
		 */
		function mapHashToField(key, fieldOrder, isLE = false) {
		    const len = key.length;
		    const fieldLen = getFieldBytesLength(fieldOrder);
		    const minLen = getMinHashLength(fieldOrder);
		    // No small numbers: need to understand bias story. No huge numbers: easier to detect JS timings.
		    if (len < 16 || len < minLen || len > 1024)
		        throw new Error('expected ' + minLen + '-1024 bytes of input, got ' + len);
		    const num = isLE ? (0, utils_ts_1.bytesToNumberLE)(key) : (0, utils_ts_1.bytesToNumberBE)(key);
		    // `mod(x, 11)` can sometimes produce 0. `mod(x, 10) + 1` is the same, but no 0
		    const reduced = mod(num, fieldOrder - _1n) + _1n;
		    return isLE ? (0, utils_ts_1.numberToBytesLE)(reduced, fieldLen) : (0, utils_ts_1.numberToBytesBE)(reduced, fieldLen);
		}
		
		return modular;
	}

	var hasRequiredCurve;

	function requireCurve () {
		if (hasRequiredCurve) return curve;
		hasRequiredCurve = 1;
		Object.defineProperty(curve, "__esModule", { value: true });
		curve.wNAF = void 0;
		curve.negateCt = negateCt;
		curve.normalizeZ = normalizeZ;
		curve.mulEndoUnsafe = mulEndoUnsafe;
		curve.pippenger = pippenger;
		curve.precomputeMSMUnsafe = precomputeMSMUnsafe;
		curve.validateBasic = validateBasic;
		curve._createCurveFields = _createCurveFields;
		/**
		 * Methods for elliptic curve multiplication by scalars.
		 * Contains wNAF, pippenger.
		 * @module
		 */
		/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
		const utils_ts_1 = /*@__PURE__*/ requireUtils$1();
		const modular_ts_1 = /*@__PURE__*/ requireModular();
		const _0n = BigInt(0);
		const _1n = BigInt(1);
		function negateCt(condition, item) {
		    const neg = item.negate();
		    return condition ? neg : item;
		}
		/**
		 * Takes a bunch of Projective Points but executes only one
		 * inversion on all of them. Inversion is very slow operation,
		 * so this improves performance massively.
		 * Optimization: converts a list of projective points to a list of identical points with Z=1.
		 */
		function normalizeZ(c, points) {
		    const invertedZs = (0, modular_ts_1.FpInvertBatch)(c.Fp, points.map((p) => p.Z));
		    return points.map((p, i) => c.fromAffine(p.toAffine(invertedZs[i])));
		}
		function validateW(W, bits) {
		    if (!Number.isSafeInteger(W) || W <= 0 || W > bits)
		        throw new Error('invalid window size, expected [1..' + bits + '], got W=' + W);
		}
		function calcWOpts(W, scalarBits) {
		    validateW(W, scalarBits);
		    const windows = Math.ceil(scalarBits / W) + 1; // W=8 33. Not 32, because we skip zero
		    const windowSize = 2 ** (W - 1); // W=8 128. Not 256, because we skip zero
		    const maxNumber = 2 ** W; // W=8 256
		    const mask = (0, utils_ts_1.bitMask)(W); // W=8 255 == mask 0b11111111
		    const shiftBy = BigInt(W); // W=8 8
		    return { windows, windowSize, mask, maxNumber, shiftBy };
		}
		function calcOffsets(n, window, wOpts) {
		    const { windowSize, mask, maxNumber, shiftBy } = wOpts;
		    let wbits = Number(n & mask); // extract W bits.
		    let nextN = n >> shiftBy; // shift number by W bits.
		    // What actually happens here:
		    // const highestBit = Number(mask ^ (mask >> 1n));
		    // let wbits2 = wbits - 1; // skip zero
		    // if (wbits2 & highestBit) { wbits2 ^= Number(mask); // (~);
		    // split if bits > max: +224 => 256-32
		    if (wbits > windowSize) {
		        // we skip zero, which means instead of `>= size-1`, we do `> size`
		        wbits -= maxNumber; // -32, can be maxNumber - wbits, but then we need to set isNeg here.
		        nextN += _1n; // +256 (carry)
		    }
		    const offsetStart = window * windowSize;
		    const offset = offsetStart + Math.abs(wbits) - 1; // -1 because we skip zero
		    const isZero = wbits === 0; // is current window slice a 0?
		    const isNeg = wbits < 0; // is current window slice negative?
		    const isNegF = window % 2 !== 0; // fake random statement for noise
		    const offsetF = offsetStart; // fake offset for noise
		    return { nextN, offset, isZero, isNeg, isNegF, offsetF };
		}
		function validateMSMPoints(points, c) {
		    if (!Array.isArray(points))
		        throw new Error('array expected');
		    points.forEach((p, i) => {
		        if (!(p instanceof c))
		            throw new Error('invalid point at index ' + i);
		    });
		}
		function validateMSMScalars(scalars, field) {
		    if (!Array.isArray(scalars))
		        throw new Error('array of scalars expected');
		    scalars.forEach((s, i) => {
		        if (!field.isValid(s))
		            throw new Error('invalid scalar at index ' + i);
		    });
		}
		// Since points in different groups cannot be equal (different object constructor),
		// we can have single place to store precomputes.
		// Allows to make points frozen / immutable.
		const pointPrecomputes = new WeakMap();
		const pointWindowSizes = new WeakMap();
		function getW(P) {
		    // To disable precomputes:
		    // return 1;
		    return pointWindowSizes.get(P) || 1;
		}
		function assert0(n) {
		    if (n !== _0n)
		        throw new Error('invalid wNAF');
		}
		/**
		 * Elliptic curve multiplication of Point by scalar. Fragile.
		 * Table generation takes **30MB of ram and 10ms on high-end CPU**,
		 * but may take much longer on slow devices. Actual generation will happen on
		 * first call of `multiply()`. By default, `BASE` point is precomputed.
		 *
		 * Scalars should always be less than curve order: this should be checked inside of a curve itself.
		 * Creates precomputation tables for fast multiplication:
		 * - private scalar is split by fixed size windows of W bits
		 * - every window point is collected from window's table & added to accumulator
		 * - since windows are different, same point inside tables won't be accessed more than once per calc
		 * - each multiplication is 'Math.ceil(CURVE_ORDER / 𝑊) + 1' point additions (fixed for any scalar)
		 * - +1 window is neccessary for wNAF
		 * - wNAF reduces table size: 2x less memory + 2x faster generation, but 10% slower multiplication
		 *
		 * @todo Research returning 2d JS array of windows, instead of a single window.
		 * This would allow windows to be in different memory locations
		 */
		class wNAF {
		    // Parametrized with a given Point class (not individual point)
		    constructor(Point, bits) {
		        this.BASE = Point.BASE;
		        this.ZERO = Point.ZERO;
		        this.Fn = Point.Fn;
		        this.bits = bits;
		    }
		    // non-const time multiplication ladder
		    _unsafeLadder(elm, n, p = this.ZERO) {
		        let d = elm;
		        while (n > _0n) {
		            if (n & _1n)
		                p = p.add(d);
		            d = d.double();
		            n >>= _1n;
		        }
		        return p;
		    }
		    /**
		     * Creates a wNAF precomputation window. Used for caching.
		     * Default window size is set by `utils.precompute()` and is equal to 8.
		     * Number of precomputed points depends on the curve size:
		     * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
		     * - 𝑊 is the window size
		     * - 𝑛 is the bitlength of the curve order.
		     * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
		     * @param point Point instance
		     * @param W window size
		     * @returns precomputed point tables flattened to a single array
		     */
		    precomputeWindow(point, W) {
		        const { windows, windowSize } = calcWOpts(W, this.bits);
		        const points = [];
		        let p = point;
		        let base = p;
		        for (let window = 0; window < windows; window++) {
		            base = p;
		            points.push(base);
		            // i=1, bc we skip 0
		            for (let i = 1; i < windowSize; i++) {
		                base = base.add(p);
		                points.push(base);
		            }
		            p = base.double();
		        }
		        return points;
		    }
		    /**
		     * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
		     * More compact implementation:
		     * https://github.com/paulmillr/noble-secp256k1/blob/47cb1669b6e506ad66b35fe7d76132ae97465da2/index.ts#L502-L541
		     * @returns real and fake (for const-time) points
		     */
		    wNAF(W, precomputes, n) {
		        // Scalar should be smaller than field order
		        if (!this.Fn.isValid(n))
		            throw new Error('invalid scalar');
		        // Accumulators
		        let p = this.ZERO;
		        let f = this.BASE;
		        // This code was first written with assumption that 'f' and 'p' will never be infinity point:
		        // since each addition is multiplied by 2 ** W, it cannot cancel each other. However,
		        // there is negate now: it is possible that negated element from low value
		        // would be the same as high element, which will create carry into next window.
		        // It's not obvious how this can fail, but still worth investigating later.
		        const wo = calcWOpts(W, this.bits);
		        for (let window = 0; window < wo.windows; window++) {
		            // (n === _0n) is handled and not early-exited. isEven and offsetF are used for noise
		            const { nextN, offset, isZero, isNeg, isNegF, offsetF } = calcOffsets(n, window, wo);
		            n = nextN;
		            if (isZero) {
		                // bits are 0: add garbage to fake point
		                // Important part for const-time getPublicKey: add random "noise" point to f.
		                f = f.add(negateCt(isNegF, precomputes[offsetF]));
		            }
		            else {
		                // bits are 1: add to result point
		                p = p.add(negateCt(isNeg, precomputes[offset]));
		            }
		        }
		        assert0(n);
		        // Return both real and fake points: JIT won't eliminate f.
		        // At this point there is a way to F be infinity-point even if p is not,
		        // which makes it less const-time: around 1 bigint multiply.
		        return { p, f };
		    }
		    /**
		     * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
		     * @param acc accumulator point to add result of multiplication
		     * @returns point
		     */
		    wNAFUnsafe(W, precomputes, n, acc = this.ZERO) {
		        const wo = calcWOpts(W, this.bits);
		        for (let window = 0; window < wo.windows; window++) {
		            if (n === _0n)
		                break; // Early-exit, skip 0 value
		            const { nextN, offset, isZero, isNeg } = calcOffsets(n, window, wo);
		            n = nextN;
		            if (isZero) {
		                // Window bits are 0: skip processing.
		                // Move to next window.
		                continue;
		            }
		            else {
		                const item = precomputes[offset];
		                acc = acc.add(isNeg ? item.negate() : item); // Re-using acc allows to save adds in MSM
		            }
		        }
		        assert0(n);
		        return acc;
		    }
		    getPrecomputes(W, point, transform) {
		        // Calculate precomputes on a first run, reuse them after
		        let comp = pointPrecomputes.get(point);
		        if (!comp) {
		            comp = this.precomputeWindow(point, W);
		            if (W !== 1) {
		                // Doing transform outside of if brings 15% perf hit
		                if (typeof transform === 'function')
		                    comp = transform(comp);
		                pointPrecomputes.set(point, comp);
		            }
		        }
		        return comp;
		    }
		    cached(point, scalar, transform) {
		        const W = getW(point);
		        return this.wNAF(W, this.getPrecomputes(W, point, transform), scalar);
		    }
		    unsafe(point, scalar, transform, prev) {
		        const W = getW(point);
		        if (W === 1)
		            return this._unsafeLadder(point, scalar, prev); // For W=1 ladder is ~x2 faster
		        return this.wNAFUnsafe(W, this.getPrecomputes(W, point, transform), scalar, prev);
		    }
		    // We calculate precomputes for elliptic curve point multiplication
		    // using windowed method. This specifies window size and
		    // stores precomputed values. Usually only base point would be precomputed.
		    createCache(P, W) {
		        validateW(W, this.bits);
		        pointWindowSizes.set(P, W);
		        pointPrecomputes.delete(P);
		    }
		    hasCache(elm) {
		        return getW(elm) !== 1;
		    }
		}
		curve.wNAF = wNAF;
		/**
		 * Endomorphism-specific multiplication for Koblitz curves.
		 * Cost: 128 dbl, 0-256 adds.
		 */
		function mulEndoUnsafe(Point, point, k1, k2) {
		    let acc = point;
		    let p1 = Point.ZERO;
		    let p2 = Point.ZERO;
		    while (k1 > _0n || k2 > _0n) {
		        if (k1 & _1n)
		            p1 = p1.add(acc);
		        if (k2 & _1n)
		            p2 = p2.add(acc);
		        acc = acc.double();
		        k1 >>= _1n;
		        k2 >>= _1n;
		    }
		    return { p1, p2 };
		}
		/**
		 * Pippenger algorithm for multi-scalar multiplication (MSM, Pa + Qb + Rc + ...).
		 * 30x faster vs naive addition on L=4096, 10x faster than precomputes.
		 * For N=254bit, L=1, it does: 1024 ADD + 254 DBL. For L=5: 1536 ADD + 254 DBL.
		 * Algorithmically constant-time (for same L), even when 1 point + scalar, or when scalar = 0.
		 * @param c Curve Point constructor
		 * @param fieldN field over CURVE.N - important that it's not over CURVE.P
		 * @param points array of L curve points
		 * @param scalars array of L scalars (aka secret keys / bigints)
		 */
		function pippenger(c, fieldN, points, scalars) {
		    // If we split scalars by some window (let's say 8 bits), every chunk will only
		    // take 256 buckets even if there are 4096 scalars, also re-uses double.
		    // TODO:
		    // - https://eprint.iacr.org/2024/750.pdf
		    // - https://tches.iacr.org/index.php/TCHES/article/view/10287
		    // 0 is accepted in scalars
		    validateMSMPoints(points, c);
		    validateMSMScalars(scalars, fieldN);
		    const plength = points.length;
		    const slength = scalars.length;
		    if (plength !== slength)
		        throw new Error('arrays of points and scalars must have equal length');
		    // if (plength === 0) throw new Error('array must be of length >= 2');
		    const zero = c.ZERO;
		    const wbits = (0, utils_ts_1.bitLen)(BigInt(plength));
		    let windowSize = 1; // bits
		    if (wbits > 12)
		        windowSize = wbits - 3;
		    else if (wbits > 4)
		        windowSize = wbits - 2;
		    else if (wbits > 0)
		        windowSize = 2;
		    const MASK = (0, utils_ts_1.bitMask)(windowSize);
		    const buckets = new Array(Number(MASK) + 1).fill(zero); // +1 for zero array
		    const lastBits = Math.floor((fieldN.BITS - 1) / windowSize) * windowSize;
		    let sum = zero;
		    for (let i = lastBits; i >= 0; i -= windowSize) {
		        buckets.fill(zero);
		        for (let j = 0; j < slength; j++) {
		            const scalar = scalars[j];
		            const wbits = Number((scalar >> BigInt(i)) & MASK);
		            buckets[wbits] = buckets[wbits].add(points[j]);
		        }
		        let resI = zero; // not using this will do small speed-up, but will lose ct
		        // Skip first bucket, because it is zero
		        for (let j = buckets.length - 1, sumI = zero; j > 0; j--) {
		            sumI = sumI.add(buckets[j]);
		            resI = resI.add(sumI);
		        }
		        sum = sum.add(resI);
		        if (i !== 0)
		            for (let j = 0; j < windowSize; j++)
		                sum = sum.double();
		    }
		    return sum;
		}
		/**
		 * Precomputed multi-scalar multiplication (MSM, Pa + Qb + Rc + ...).
		 * @param c Curve Point constructor
		 * @param fieldN field over CURVE.N - important that it's not over CURVE.P
		 * @param points array of L curve points
		 * @returns function which multiplies points with scaars
		 */
		function precomputeMSMUnsafe(c, fieldN, points, windowSize) {
		    /**
		     * Performance Analysis of Window-based Precomputation
		     *
		     * Base Case (256-bit scalar, 8-bit window):
		     * - Standard precomputation requires:
		     *   - 31 additions per scalar × 256 scalars = 7,936 ops
		     *   - Plus 255 summary additions = 8,191 total ops
		     *   Note: Summary additions can be optimized via accumulator
		     *
		     * Chunked Precomputation Analysis:
		     * - Using 32 chunks requires:
		     *   - 255 additions per chunk
		     *   - 256 doublings
		     *   - Total: (255 × 32) + 256 = 8,416 ops
		     *
		     * Memory Usage Comparison:
		     * Window Size | Standard Points | Chunked Points
		     * ------------|-----------------|---------------
		     *     4-bit   |     520         |      15
		     *     8-bit   |    4,224        |     255
		     *    10-bit   |   13,824        |   1,023
		     *    16-bit   |  557,056        |  65,535
		     *
		     * Key Advantages:
		     * 1. Enables larger window sizes due to reduced memory overhead
		     * 2. More efficient for smaller scalar counts:
		     *    - 16 chunks: (16 × 255) + 256 = 4,336 ops
		     *    - ~2x faster than standard 8,191 ops
		     *
		     * Limitations:
		     * - Not suitable for plain precomputes (requires 256 constant doublings)
		     * - Performance degrades with larger scalar counts:
		     *   - Optimal for ~256 scalars
		     *   - Less efficient for 4096+ scalars (Pippenger preferred)
		     */
		    validateW(windowSize, fieldN.BITS);
		    validateMSMPoints(points, c);
		    const zero = c.ZERO;
		    const tableSize = 2 ** windowSize - 1; // table size (without zero)
		    const chunks = Math.ceil(fieldN.BITS / windowSize); // chunks of item
		    const MASK = (0, utils_ts_1.bitMask)(windowSize);
		    const tables = points.map((p) => {
		        const res = [];
		        for (let i = 0, acc = p; i < tableSize; i++) {
		            res.push(acc);
		            acc = acc.add(p);
		        }
		        return res;
		    });
		    return (scalars) => {
		        validateMSMScalars(scalars, fieldN);
		        if (scalars.length > points.length)
		            throw new Error('array of scalars must be smaller than array of points');
		        let res = zero;
		        for (let i = 0; i < chunks; i++) {
		            // No need to double if accumulator is still zero.
		            if (res !== zero)
		                for (let j = 0; j < windowSize; j++)
		                    res = res.double();
		            const shiftBy = BigInt(chunks * windowSize - (i + 1) * windowSize);
		            for (let j = 0; j < scalars.length; j++) {
		                const n = scalars[j];
		                const curr = Number((n >> shiftBy) & MASK);
		                if (!curr)
		                    continue; // skip zero scalars chunks
		                res = res.add(tables[j][curr - 1]);
		            }
		        }
		        return res;
		    };
		}
		// TODO: remove
		/** @deprecated */
		function validateBasic(curve) {
		    (0, modular_ts_1.validateField)(curve.Fp);
		    (0, utils_ts_1.validateObject)(curve, {
		        n: 'bigint',
		        h: 'bigint',
		        Gx: 'field',
		        Gy: 'field',
		    }, {
		        nBitLength: 'isSafeInteger',
		        nByteLength: 'isSafeInteger',
		    });
		    // Set defaults
		    return Object.freeze({
		        ...(0, modular_ts_1.nLength)(curve.n, curve.nBitLength),
		        ...curve,
		        ...{ p: curve.Fp.ORDER },
		    });
		}
		function createField(order, field, isLE) {
		    if (field) {
		        if (field.ORDER !== order)
		            throw new Error('Field.ORDER must match order: Fp == p, Fn == n');
		        (0, modular_ts_1.validateField)(field);
		        return field;
		    }
		    else {
		        return (0, modular_ts_1.Field)(order, { isLE });
		    }
		}
		/** Validates CURVE opts and creates fields */
		function _createCurveFields(type, CURVE, curveOpts = {}, FpFnLE) {
		    if (FpFnLE === undefined)
		        FpFnLE = type === 'edwards';
		    if (!CURVE || typeof CURVE !== 'object')
		        throw new Error(`expected valid ${type} CURVE object`);
		    for (const p of ['p', 'n', 'h']) {
		        const val = CURVE[p];
		        if (!(typeof val === 'bigint' && val > _0n))
		            throw new Error(`CURVE.${p} must be positive bigint`);
		    }
		    const Fp = createField(CURVE.p, curveOpts.Fp, FpFnLE);
		    const Fn = createField(CURVE.n, curveOpts.Fn, FpFnLE);
		    const _b = type === 'weierstrass' ? 'b' : 'd';
		    const params = ['Gx', 'Gy', 'a', _b];
		    for (const p of params) {
		        // @ts-ignore
		        if (!Fp.isValid(CURVE[p]))
		            throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
		    }
		    CURVE = Object.freeze(Object.assign({}, CURVE));
		    return { CURVE, Fp, Fn };
		}
		
		return curve;
	}

	var hasRequiredWeierstrass;

	function requireWeierstrass () {
		if (hasRequiredWeierstrass) return weierstrass;
		hasRequiredWeierstrass = 1;
		(function (exports$1) {
			Object.defineProperty(exports$1, "__esModule", { value: true });
			exports$1.DER = exports$1.DERErr = void 0;
			exports$1._splitEndoScalar = _splitEndoScalar;
			exports$1._normFnElement = _normFnElement;
			exports$1.weierstrassN = weierstrassN;
			exports$1.SWUFpSqrtRatio = SWUFpSqrtRatio;
			exports$1.mapToCurveSimpleSWU = mapToCurveSimpleSWU;
			exports$1.ecdh = ecdh;
			exports$1.ecdsa = ecdsa;
			exports$1.weierstrassPoints = weierstrassPoints;
			exports$1._legacyHelperEquat = _legacyHelperEquat;
			exports$1.weierstrass = weierstrass;
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
			const hmac_js_1 = /*@__PURE__*/ requireHmac();
			const utils_1 = /*@__PURE__*/ requireUtils$3();
			const utils_ts_1 = /*@__PURE__*/ requireUtils$1();
			const curve_ts_1 = /*@__PURE__*/ requireCurve();
			const modular_ts_1 = /*@__PURE__*/ requireModular();
			// We construct basis in such way that den is always positive and equals n, but num sign depends on basis (not on secret value)
			const divNearest = (num, den) => (num + (num >= 0 ? den : -den) / _2n) / den;
			/**
			 * Splits scalar for GLV endomorphism.
			 */
			function _splitEndoScalar(k, basis, n) {
			    // Split scalar into two such that part is ~half bits: `abs(part) < sqrt(N)`
			    // Since part can be negative, we need to do this on point.
			    // TODO: verifyScalar function which consumes lambda
			    const [[a1, b1], [a2, b2]] = basis;
			    const c1 = divNearest(b2 * k, n);
			    const c2 = divNearest(-b1 * k, n);
			    // |k1|/|k2| is < sqrt(N), but can be negative.
			    // If we do `k1 mod N`, we'll get big scalar (`> sqrt(N)`): so, we do cheaper negation instead.
			    let k1 = k - c1 * a1 - c2 * a2;
			    let k2 = -c1 * b1 - c2 * b2;
			    const k1neg = k1 < _0n;
			    const k2neg = k2 < _0n;
			    if (k1neg)
			        k1 = -k1;
			    if (k2neg)
			        k2 = -k2;
			    // Double check that resulting scalar less than half bits of N: otherwise wNAF will fail.
			    // This should only happen on wrong basises. Also, math inside is too complex and I don't trust it.
			    const MAX_NUM = (0, utils_ts_1.bitMask)(Math.ceil((0, utils_ts_1.bitLen)(n) / 2)) + _1n; // Half bits of N
			    if (k1 < _0n || k1 >= MAX_NUM || k2 < _0n || k2 >= MAX_NUM) {
			        throw new Error('splitScalar (endomorphism): failed, k=' + k);
			    }
			    return { k1neg, k1, k2neg, k2 };
			}
			function validateSigFormat(format) {
			    if (!['compact', 'recovered', 'der'].includes(format))
			        throw new Error('Signature format must be "compact", "recovered", or "der"');
			    return format;
			}
			function validateSigOpts(opts, def) {
			    const optsn = {};
			    for (let optName of Object.keys(def)) {
			        // @ts-ignore
			        optsn[optName] = opts[optName] === undefined ? def[optName] : opts[optName];
			    }
			    (0, utils_ts_1._abool2)(optsn.lowS, 'lowS');
			    (0, utils_ts_1._abool2)(optsn.prehash, 'prehash');
			    if (optsn.format !== undefined)
			        validateSigFormat(optsn.format);
			    return optsn;
			}
			class DERErr extends Error {
			    constructor(m = '') {
			        super(m);
			    }
			}
			exports$1.DERErr = DERErr;
			/**
			 * ASN.1 DER encoding utilities. ASN is very complex & fragile. Format:
			 *
			 *     [0x30 (SEQUENCE), bytelength, 0x02 (INTEGER), intLength, R, 0x02 (INTEGER), intLength, S]
			 *
			 * Docs: https://letsencrypt.org/docs/a-warm-welcome-to-asn1-and-der/, https://luca.ntop.org/Teaching/Appunti/asn1.html
			 */
			exports$1.DER = {
			    // asn.1 DER encoding utils
			    Err: DERErr,
			    // Basic building block is TLV (Tag-Length-Value)
			    _tlv: {
			        encode: (tag, data) => {
			            const { Err: E } = exports$1.DER;
			            if (tag < 0 || tag > 256)
			                throw new E('tlv.encode: wrong tag');
			            if (data.length & 1)
			                throw new E('tlv.encode: unpadded data');
			            const dataLen = data.length / 2;
			            const len = (0, utils_ts_1.numberToHexUnpadded)(dataLen);
			            if ((len.length / 2) & 128)
			                throw new E('tlv.encode: long form length too big');
			            // length of length with long form flag
			            const lenLen = dataLen > 127 ? (0, utils_ts_1.numberToHexUnpadded)((len.length / 2) | 128) : '';
			            const t = (0, utils_ts_1.numberToHexUnpadded)(tag);
			            return t + lenLen + len + data;
			        },
			        // v - value, l - left bytes (unparsed)
			        decode(tag, data) {
			            const { Err: E } = exports$1.DER;
			            let pos = 0;
			            if (tag < 0 || tag > 256)
			                throw new E('tlv.encode: wrong tag');
			            if (data.length < 2 || data[pos++] !== tag)
			                throw new E('tlv.decode: wrong tlv');
			            const first = data[pos++];
			            const isLong = !!(first & 128); // First bit of first length byte is flag for short/long form
			            let length = 0;
			            if (!isLong)
			                length = first;
			            else {
			                // Long form: [longFlag(1bit), lengthLength(7bit), length (BE)]
			                const lenLen = first & 127;
			                if (!lenLen)
			                    throw new E('tlv.decode(long): indefinite length not supported');
			                if (lenLen > 4)
			                    throw new E('tlv.decode(long): byte length is too big'); // this will overflow u32 in js
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
			            const { Err: E } = exports$1.DER;
			            if (num < _0n)
			                throw new E('integer: negative integers are not allowed');
			            let hex = (0, utils_ts_1.numberToHexUnpadded)(num);
			            // Pad with zero byte if negative flag is present
			            if (Number.parseInt(hex[0], 16) & 0b1000)
			                hex = '00' + hex;
			            if (hex.length & 1)
			                throw new E('unexpected DER parsing assertion: unpadded hex');
			            return hex;
			        },
			        decode(data) {
			            const { Err: E } = exports$1.DER;
			            if (data[0] & 128)
			                throw new E('invalid signature integer: negative');
			            if (data[0] === 0x00 && !(data[1] & 128))
			                throw new E('invalid signature integer: unnecessary leading zero');
			            return (0, utils_ts_1.bytesToNumberBE)(data);
			        },
			    },
			    toSig(hex) {
			        // parse DER signature
			        const { Err: E, _int: int, _tlv: tlv } = exports$1.DER;
			        const data = (0, utils_ts_1.ensureBytes)('signature', hex);
			        const { v: seqBytes, l: seqLeftBytes } = tlv.decode(0x30, data);
			        if (seqLeftBytes.length)
			            throw new E('invalid signature: left bytes after parsing');
			        const { v: rBytes, l: rLeftBytes } = tlv.decode(0x02, seqBytes);
			        const { v: sBytes, l: sLeftBytes } = tlv.decode(0x02, rLeftBytes);
			        if (sLeftBytes.length)
			            throw new E('invalid signature: left bytes after parsing');
			        return { r: int.decode(rBytes), s: int.decode(sBytes) };
			    },
			    hexFromSig(sig) {
			        const { _tlv: tlv, _int: int } = exports$1.DER;
			        const rs = tlv.encode(0x02, int.encode(sig.r));
			        const ss = tlv.encode(0x02, int.encode(sig.s));
			        const seq = rs + ss;
			        return tlv.encode(0x30, seq);
			    },
			};
			// Be friendly to bad ECMAScript parsers by not using bigint literals
			// prettier-ignore
			const _0n = BigInt(0), _1n = BigInt(1), _2n = BigInt(2), _3n = BigInt(3), _4n = BigInt(4);
			function _normFnElement(Fn, key) {
			    const { BYTES: expected } = Fn;
			    let num;
			    if (typeof key === 'bigint') {
			        num = key;
			    }
			    else {
			        let bytes = (0, utils_ts_1.ensureBytes)('private key', key);
			        try {
			            num = Fn.fromBytes(bytes);
			        }
			        catch (error) {
			            throw new Error(`invalid private key: expected ui8a of size ${expected}, got ${typeof key}`);
			        }
			    }
			    if (!Fn.isValidNot0(num))
			        throw new Error('invalid private key: out of range [1..N-1]');
			    return num;
			}
			/**
			 * Creates weierstrass Point constructor, based on specified curve options.
			 *
			 * @example
			```js
			const opts = {
			  p: BigInt('0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff'),
			  n: BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551'),
			  h: BigInt(1),
			  a: BigInt('0xffffffff00000001000000000000000000000000fffffffffffffffffffffffc'),
			  b: BigInt('0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b'),
			  Gx: BigInt('0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296'),
			  Gy: BigInt('0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5'),
			};
			const p256_Point = weierstrass(opts);
			```
			 */
			function weierstrassN(params, extraOpts = {}) {
			    const validated = (0, curve_ts_1._createCurveFields)('weierstrass', params, extraOpts);
			    const { Fp, Fn } = validated;
			    let CURVE = validated.CURVE;
			    const { h: cofactor, n: CURVE_ORDER } = CURVE;
			    (0, utils_ts_1._validateObject)(extraOpts, {}, {
			        allowInfinityPoint: 'boolean',
			        clearCofactor: 'function',
			        isTorsionFree: 'function',
			        fromBytes: 'function',
			        toBytes: 'function',
			        endo: 'object',
			        wrapPrivateKey: 'boolean',
			    });
			    const { endo } = extraOpts;
			    if (endo) {
			        // validateObject(endo, { beta: 'bigint', splitScalar: 'function' });
			        if (!Fp.is0(CURVE.a) || typeof endo.beta !== 'bigint' || !Array.isArray(endo.basises)) {
			            throw new Error('invalid endo: expected "beta": bigint and "basises": array');
			        }
			    }
			    const lengths = getWLengths(Fp, Fn);
			    function assertCompressionIsSupported() {
			        if (!Fp.isOdd)
			            throw new Error('compression is not supported: Field does not have .isOdd()');
			    }
			    // Implements IEEE P1363 point encoding
			    function pointToBytes(_c, point, isCompressed) {
			        const { x, y } = point.toAffine();
			        const bx = Fp.toBytes(x);
			        (0, utils_ts_1._abool2)(isCompressed, 'isCompressed');
			        if (isCompressed) {
			            assertCompressionIsSupported();
			            const hasEvenY = !Fp.isOdd(y);
			            return (0, utils_ts_1.concatBytes)(pprefix(hasEvenY), bx);
			        }
			        else {
			            return (0, utils_ts_1.concatBytes)(Uint8Array.of(0x04), bx, Fp.toBytes(y));
			        }
			    }
			    function pointFromBytes(bytes) {
			        (0, utils_ts_1._abytes2)(bytes, undefined, 'Point');
			        const { publicKey: comp, publicKeyUncompressed: uncomp } = lengths; // e.g. for 32-byte: 33, 65
			        const length = bytes.length;
			        const head = bytes[0];
			        const tail = bytes.subarray(1);
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
			            const isYOdd = Fp.isOdd(y); // (y & _1n) === _1n;
			            const isHeadOdd = (head & 1) === 1; // ECDSA-specific
			            if (isHeadOdd !== isYOdd)
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
			    const encodePoint = extraOpts.toBytes || pointToBytes;
			    const decodePoint = extraOpts.fromBytes || pointFromBytes;
			    function weierstrassEquation(x) {
			        const x2 = Fp.sqr(x); // x * x
			        const x3 = Fp.mul(x2, x); // x² * x
			        return Fp.add(Fp.add(x3, Fp.mul(x, CURVE.a)), CURVE.b); // x³ + a * x + b
			    }
			    // TODO: move top-level
			    /** Checks whether equation holds for given x, y: y² == x³ + ax + b */
			    function isValidXY(x, y) {
			        const left = Fp.sqr(y); // y²
			        const right = weierstrassEquation(x); // x³ + ax + b
			        return Fp.eql(left, right);
			    }
			    // Validate whether the passed curve params are valid.
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
			        return n;
			    }
			    function aprjpoint(other) {
			        if (!(other instanceof Point))
			            throw new Error('ProjectivePoint expected');
			    }
			    function splitEndoScalarN(k) {
			        if (!endo || !endo.basises)
			            throw new Error('no endo');
			        return _splitEndoScalar(k, endo.basises, Fn.ORDER);
			    }
			    // Memoized toAffine / validity check. They are heavy. Points are immutable.
			    // Converts Projective point to affine (x, y) coordinates.
			    // Can accept precomputed Z^-1 - for example, from invertBatch.
			    // (X, Y, Z) ∋ (x=X/Z, y=Y/Z)
			    const toAffineMemo = (0, utils_ts_1.memoized)((p, iz) => {
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
			    });
			    // NOTE: on exception this will crash 'cached' and no value will be set.
			    // Otherwise true will be return
			    const assertValidMemo = (0, utils_ts_1.memoized)((p) => {
			        if (p.is0()) {
			            // (0, 1, 0) aka ZERO is invalid in most contexts.
			            // In BLS, ZERO can be serialized, so we allow it.
			            // (0, 0, 0) is invalid representation of ZERO.
			            if (extraOpts.allowInfinityPoint && !Fp.is0(p.Y))
			                return;
			            throw new Error('bad point: ZERO');
			        }
			        // Some 3rd-party test vectors require different wording between here & `fromCompressedHex`
			        const { x, y } = p.toAffine();
			        if (!Fp.isValid(x) || !Fp.isValid(y))
			            throw new Error('bad point: x or y not field elements');
			        if (!isValidXY(x, y))
			            throw new Error('bad point: equation left != right');
			        if (!p.isTorsionFree())
			            throw new Error('bad point: not in prime-order subgroup');
			        return true;
			    });
			    function finishEndo(endoBeta, k1p, k2p, k1neg, k2neg) {
			        k2p = new Point(Fp.mul(k2p.X, endoBeta), k2p.Y, k2p.Z);
			        k1p = (0, curve_ts_1.negateCt)(k1neg, k1p);
			        k2p = (0, curve_ts_1.negateCt)(k2neg, k2p);
			        return k1p.add(k2p);
			    }
			    /**
			     * Projective Point works in 3d / projective (homogeneous) coordinates:(X, Y, Z) ∋ (x=X/Z, y=Y/Z).
			     * Default Point works in 2d / affine coordinates: (x, y).
			     * We're doing calculations in projective, because its operations don't require costly inversion.
			     */
			    class Point {
			        /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
			        constructor(X, Y, Z) {
			            this.X = acoord('x', X);
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
			            const P = Point.fromAffine(decodePoint((0, utils_ts_1._abytes2)(bytes, undefined, 'point')));
			            P.assertValidity();
			            return P;
			        }
			        static fromHex(hex) {
			            return Point.fromBytes((0, utils_ts_1.ensureBytes)('pointHex', hex));
			        }
			        get x() {
			            return this.toAffine().x;
			        }
			        get y() {
			            return this.toAffine().y;
			        }
			        /**
			         *
			         * @param windowSize
			         * @param isLazy true will defer table computation until the first multiplication
			         * @returns
			         */
			        precompute(windowSize = 8, isLazy = true) {
			            wnaf.createCache(this, windowSize);
			            if (!isLazy)
			                this.multiply(_3n); // random number
			            return this;
			        }
			        // TODO: return `this`
			        /** A point on curve is valid if it conforms to equation. */
			        assertValidity() {
			            assertValidMemo(this);
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
			            const { a, b } = CURVE;
			            const b3 = Fp.mul(b, _3n);
			            const { X: X1, Y: Y1, Z: Z1 } = this;
			            let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO; // prettier-ignore
			            let t0 = Fp.mul(X1, X1); // step 1
			            let t1 = Fp.mul(Y1, Y1);
			            let t2 = Fp.mul(Z1, Z1);
			            let t3 = Fp.mul(X1, Y1);
			            t3 = Fp.add(t3, t3); // step 5
			            Z3 = Fp.mul(X1, Z1);
			            Z3 = Fp.add(Z3, Z3);
			            X3 = Fp.mul(a, Z3);
			            Y3 = Fp.mul(b3, t2);
			            Y3 = Fp.add(X3, Y3); // step 10
			            X3 = Fp.sub(t1, Y3);
			            Y3 = Fp.add(t1, Y3);
			            Y3 = Fp.mul(X3, Y3);
			            X3 = Fp.mul(t3, X3);
			            Z3 = Fp.mul(b3, Z3); // step 15
			            t2 = Fp.mul(a, t2);
			            t3 = Fp.sub(t0, t2);
			            t3 = Fp.mul(a, t3);
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
			            const a = CURVE.a;
			            const b3 = Fp.mul(CURVE.b, _3n);
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
			            Z3 = Fp.mul(a, t4);
			            X3 = Fp.mul(b3, t2); // step 20
			            Z3 = Fp.add(X3, Z3);
			            X3 = Fp.sub(t1, Z3);
			            Z3 = Fp.add(t1, Z3);
			            Y3 = Fp.mul(X3, Z3);
			            t1 = Fp.add(t0, t0); // step 25
			            t1 = Fp.add(t1, t0);
			            t2 = Fp.mul(a, t2);
			            t4 = Fp.mul(b3, t4);
			            t1 = Fp.add(t1, t2);
			            t2 = Fp.sub(t0, t2); // step 30
			            t2 = Fp.mul(a, t2);
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
			            return this.add(other.negate());
			        }
			        is0() {
			            return this.equals(Point.ZERO);
			        }
			        /**
			         * Constant time multiplication.
			         * Uses wNAF method. Windowed method may be 10% faster,
			         * but takes 2x longer to generate and consumes 2x memory.
			         * Uses precomputes when available.
			         * Uses endomorphism for Koblitz curves.
			         * @param scalar by which the point would be multiplied
			         * @returns New point
			         */
			        multiply(scalar) {
			            const { endo } = extraOpts;
			            if (!Fn.isValidNot0(scalar))
			                throw new Error('invalid scalar: out of range'); // 0 is invalid
			            let point, fake; // Fake point is used to const-time mult
			            const mul = (n) => wnaf.cached(this, n, (p) => (0, curve_ts_1.normalizeZ)(Point, p));
			            /** See docs for {@link EndomorphismOpts} */
			            if (endo) {
			                const { k1neg, k1, k2neg, k2 } = splitEndoScalarN(scalar);
			                const { p: k1p, f: k1f } = mul(k1);
			                const { p: k2p, f: k2f } = mul(k2);
			                fake = k1f.add(k2f);
			                point = finishEndo(endo.beta, k1p, k2p, k1neg, k2neg);
			            }
			            else {
			                const { p, f } = mul(scalar);
			                point = p;
			                fake = f;
			            }
			            // Normalize `z` for both points, but return only real one
			            return (0, curve_ts_1.normalizeZ)(Point, [point, fake])[0];
			        }
			        /**
			         * Non-constant-time multiplication. Uses double-and-add algorithm.
			         * It's faster, but should only be used when you don't care about
			         * an exposed secret key e.g. sig verification, which works over *public* keys.
			         */
			        multiplyUnsafe(sc) {
			            const { endo } = extraOpts;
			            const p = this;
			            if (!Fn.isValid(sc))
			                throw new Error('invalid scalar: out of range'); // 0 is valid
			            if (sc === _0n || p.is0())
			                return Point.ZERO;
			            if (sc === _1n)
			                return p; // fast-path
			            if (wnaf.hasCache(this))
			                return this.multiply(sc);
			            if (endo) {
			                const { k1neg, k1, k2neg, k2 } = splitEndoScalarN(sc);
			                const { p1, p2 } = (0, curve_ts_1.mulEndoUnsafe)(Point, p, k1, k2); // 30% faster vs wnaf.unsafe
			                return finishEndo(endo.beta, p1, p2, k1neg, k2neg);
			            }
			            else {
			                return wnaf.unsafe(p, sc);
			            }
			        }
			        multiplyAndAddUnsafe(Q, a, b) {
			            const sum = this.multiplyUnsafe(a).add(Q.multiplyUnsafe(b));
			            return sum.is0() ? undefined : sum;
			        }
			        /**
			         * Converts Projective point to affine (x, y) coordinates.
			         * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
			         */
			        toAffine(invertedZ) {
			            return toAffineMemo(this, invertedZ);
			        }
			        /**
			         * Checks whether Point is free of torsion elements (is in prime subgroup).
			         * Always torsion-free for cofactor=1 curves.
			         */
			        isTorsionFree() {
			            const { isTorsionFree } = extraOpts;
			            if (cofactor === _1n)
			                return true;
			            if (isTorsionFree)
			                return isTorsionFree(Point, this);
			            return wnaf.unsafe(this, CURVE_ORDER).is0();
			        }
			        clearCofactor() {
			            const { clearCofactor } = extraOpts;
			            if (cofactor === _1n)
			                return this; // Fast-path
			            if (clearCofactor)
			                return clearCofactor(Point, this);
			            return this.multiplyUnsafe(cofactor);
			        }
			        isSmallOrder() {
			            // can we use this.clearCofactor()?
			            return this.multiplyUnsafe(cofactor).is0();
			        }
			        toBytes(isCompressed = true) {
			            (0, utils_ts_1._abool2)(isCompressed, 'isCompressed');
			            this.assertValidity();
			            return encodePoint(Point, this, isCompressed);
			        }
			        toHex(isCompressed = true) {
			            return (0, utils_ts_1.bytesToHex)(this.toBytes(isCompressed));
			        }
			        toString() {
			            return `<Point ${this.is0() ? 'ZERO' : this.toHex()}>`;
			        }
			        // TODO: remove
			        get px() {
			            return this.X;
			        }
			        get py() {
			            return this.X;
			        }
			        get pz() {
			            return this.Z;
			        }
			        toRawBytes(isCompressed = true) {
			            return this.toBytes(isCompressed);
			        }
			        _setWindowSize(windowSize) {
			            this.precompute(windowSize);
			        }
			        static normalizeZ(points) {
			            return (0, curve_ts_1.normalizeZ)(Point, points);
			        }
			        static msm(points, scalars) {
			            return (0, curve_ts_1.pippenger)(Point, Fn, points, scalars);
			        }
			        static fromPrivateKey(privateKey) {
			            return Point.BASE.multiply(_normFnElement(Fn, privateKey));
			        }
			    }
			    // base / generator point
			    Point.BASE = new Point(CURVE.Gx, CURVE.Gy, Fp.ONE);
			    // zero / infinity / identity point
			    Point.ZERO = new Point(Fp.ZERO, Fp.ONE, Fp.ZERO); // 0, 1, 0
			    // math field
			    Point.Fp = Fp;
			    // scalar field
			    Point.Fn = Fn;
			    const bits = Fn.BITS;
			    const wnaf = new curve_ts_1.wNAF(Point, extraOpts.endo ? Math.ceil(bits / 2) : bits);
			    Point.BASE.precompute(8); // Enable precomputes. Slows down first publicKey computation by 20ms.
			    return Point;
			}
			// Points start with byte 0x02 when y is even; otherwise 0x03
			function pprefix(hasEvenY) {
			    return Uint8Array.of(hasEvenY ? 0x02 : 0x03);
			}
			/**
			 * Implementation of the Shallue and van de Woestijne method for any weierstrass curve.
			 * TODO: check if there is a way to merge this with uvRatio in Edwards; move to modular.
			 * b = True and y = sqrt(u / v) if (u / v) is square in F, and
			 * b = False and y = sqrt(Z * (u / v)) otherwise.
			 * @param Fp
			 * @param Z
			 * @returns
			 */
			function SWUFpSqrtRatio(Fp, Z) {
			    // Generic implementation
			    const q = Fp.ORDER;
			    let l = _0n;
			    for (let o = q - _1n; o % _2n === _0n; o /= _2n)
			        l += _1n;
			    const c1 = l; // 1. c1, the largest integer such that 2^c1 divides q - 1.
			    // We need 2n ** c1 and 2n ** (c1-1). We can't use **; but we can use <<.
			    // 2n ** c1 == 2n << (c1-1)
			    const _2n_pow_c1_1 = _2n << (c1 - _1n - _1n);
			    const _2n_pow_c1 = _2n_pow_c1_1 * _2n;
			    const c2 = (q - _1n) / _2n_pow_c1; // 2. c2 = (q - 1) / (2^c1)  # Integer arithmetic
			    const c3 = (c2 - _1n) / _2n; // 3. c3 = (c2 - 1) / 2            # Integer arithmetic
			    const c4 = _2n_pow_c1 - _1n; // 4. c4 = 2^c1 - 1                # Integer arithmetic
			    const c5 = _2n_pow_c1_1; // 5. c5 = 2^(c1 - 1)                  # Integer arithmetic
			    const c6 = Fp.pow(Z, c2); // 6. c6 = Z^c2
			    const c7 = Fp.pow(Z, (c2 + _1n) / _2n); // 7. c7 = Z^((c2 + 1) / 2)
			    let sqrtRatio = (u, v) => {
			        let tv1 = c6; // 1. tv1 = c6
			        let tv2 = Fp.pow(v, c4); // 2. tv2 = v^c4
			        let tv3 = Fp.sqr(tv2); // 3. tv3 = tv2^2
			        tv3 = Fp.mul(tv3, v); // 4. tv3 = tv3 * v
			        let tv5 = Fp.mul(u, tv3); // 5. tv5 = u * tv3
			        tv5 = Fp.pow(tv5, c3); // 6. tv5 = tv5^c3
			        tv5 = Fp.mul(tv5, tv2); // 7. tv5 = tv5 * tv2
			        tv2 = Fp.mul(tv5, v); // 8. tv2 = tv5 * v
			        tv3 = Fp.mul(tv5, u); // 9. tv3 = tv5 * u
			        let tv4 = Fp.mul(tv3, tv2); // 10. tv4 = tv3 * tv2
			        tv5 = Fp.pow(tv4, c5); // 11. tv5 = tv4^c5
			        let isQR = Fp.eql(tv5, Fp.ONE); // 12. isQR = tv5 == 1
			        tv2 = Fp.mul(tv3, c7); // 13. tv2 = tv3 * c7
			        tv5 = Fp.mul(tv4, tv1); // 14. tv5 = tv4 * tv1
			        tv3 = Fp.cmov(tv2, tv3, isQR); // 15. tv3 = CMOV(tv2, tv3, isQR)
			        tv4 = Fp.cmov(tv5, tv4, isQR); // 16. tv4 = CMOV(tv5, tv4, isQR)
			        // 17. for i in (c1, c1 - 1, ..., 2):
			        for (let i = c1; i > _1n; i--) {
			            let tv5 = i - _2n; // 18.    tv5 = i - 2
			            tv5 = _2n << (tv5 - _1n); // 19.    tv5 = 2^tv5
			            let tvv5 = Fp.pow(tv4, tv5); // 20.    tv5 = tv4^tv5
			            const e1 = Fp.eql(tvv5, Fp.ONE); // 21.    e1 = tv5 == 1
			            tv2 = Fp.mul(tv3, tv1); // 22.    tv2 = tv3 * tv1
			            tv1 = Fp.mul(tv1, tv1); // 23.    tv1 = tv1 * tv1
			            tvv5 = Fp.mul(tv4, tv1); // 24.    tv5 = tv4 * tv1
			            tv3 = Fp.cmov(tv2, tv3, e1); // 25.    tv3 = CMOV(tv2, tv3, e1)
			            tv4 = Fp.cmov(tvv5, tv4, e1); // 26.    tv4 = CMOV(tv5, tv4, e1)
			        }
			        return { isValid: isQR, value: tv3 };
			    };
			    if (Fp.ORDER % _4n === _3n) {
			        // sqrt_ratio_3mod4(u, v)
			        const c1 = (Fp.ORDER - _3n) / _4n; // 1. c1 = (q - 3) / 4     # Integer arithmetic
			        const c2 = Fp.sqrt(Fp.neg(Z)); // 2. c2 = sqrt(-Z)
			        sqrtRatio = (u, v) => {
			            let tv1 = Fp.sqr(v); // 1. tv1 = v^2
			            const tv2 = Fp.mul(u, v); // 2. tv2 = u * v
			            tv1 = Fp.mul(tv1, tv2); // 3. tv1 = tv1 * tv2
			            let y1 = Fp.pow(tv1, c1); // 4. y1 = tv1^c1
			            y1 = Fp.mul(y1, tv2); // 5. y1 = y1 * tv2
			            const y2 = Fp.mul(y1, c2); // 6. y2 = y1 * c2
			            const tv3 = Fp.mul(Fp.sqr(y1), v); // 7. tv3 = y1^2; 8. tv3 = tv3 * v
			            const isQR = Fp.eql(tv3, u); // 9. isQR = tv3 == u
			            let y = Fp.cmov(y2, y1, isQR); // 10. y = CMOV(y2, y1, isQR)
			            return { isValid: isQR, value: y }; // 11. return (isQR, y) isQR ? y : y*c2
			        };
			    }
			    // No curves uses that
			    // if (Fp.ORDER % _8n === _5n) // sqrt_ratio_5mod8
			    return sqrtRatio;
			}
			/**
			 * Simplified Shallue-van de Woestijne-Ulas Method
			 * https://www.rfc-editor.org/rfc/rfc9380#section-6.6.2
			 */
			function mapToCurveSimpleSWU(Fp, opts) {
			    (0, modular_ts_1.validateField)(Fp);
			    const { A, B, Z } = opts;
			    if (!Fp.isValid(A) || !Fp.isValid(B) || !Fp.isValid(Z))
			        throw new Error('mapToCurveSimpleSWU: invalid opts');
			    const sqrtRatio = SWUFpSqrtRatio(Fp, Z);
			    if (!Fp.isOdd)
			        throw new Error('Field does not have .isOdd()');
			    // Input: u, an element of F.
			    // Output: (x, y), a point on E.
			    return (u) => {
			        // prettier-ignore
			        let tv1, tv2, tv3, tv4, tv5, tv6, x, y;
			        tv1 = Fp.sqr(u); // 1.  tv1 = u^2
			        tv1 = Fp.mul(tv1, Z); // 2.  tv1 = Z * tv1
			        tv2 = Fp.sqr(tv1); // 3.  tv2 = tv1^2
			        tv2 = Fp.add(tv2, tv1); // 4.  tv2 = tv2 + tv1
			        tv3 = Fp.add(tv2, Fp.ONE); // 5.  tv3 = tv2 + 1
			        tv3 = Fp.mul(tv3, B); // 6.  tv3 = B * tv3
			        tv4 = Fp.cmov(Z, Fp.neg(tv2), !Fp.eql(tv2, Fp.ZERO)); // 7.  tv4 = CMOV(Z, -tv2, tv2 != 0)
			        tv4 = Fp.mul(tv4, A); // 8.  tv4 = A * tv4
			        tv2 = Fp.sqr(tv3); // 9.  tv2 = tv3^2
			        tv6 = Fp.sqr(tv4); // 10. tv6 = tv4^2
			        tv5 = Fp.mul(tv6, A); // 11. tv5 = A * tv6
			        tv2 = Fp.add(tv2, tv5); // 12. tv2 = tv2 + tv5
			        tv2 = Fp.mul(tv2, tv3); // 13. tv2 = tv2 * tv3
			        tv6 = Fp.mul(tv6, tv4); // 14. tv6 = tv6 * tv4
			        tv5 = Fp.mul(tv6, B); // 15. tv5 = B * tv6
			        tv2 = Fp.add(tv2, tv5); // 16. tv2 = tv2 + tv5
			        x = Fp.mul(tv1, tv3); // 17.   x = tv1 * tv3
			        const { isValid, value } = sqrtRatio(tv2, tv6); // 18. (is_gx1_square, y1) = sqrt_ratio(tv2, tv6)
			        y = Fp.mul(tv1, u); // 19.   y = tv1 * u  -> Z * u^3 * y1
			        y = Fp.mul(y, value); // 20.   y = y * y1
			        x = Fp.cmov(x, tv3, isValid); // 21.   x = CMOV(x, tv3, is_gx1_square)
			        y = Fp.cmov(y, value, isValid); // 22.   y = CMOV(y, y1, is_gx1_square)
			        const e1 = Fp.isOdd(u) === Fp.isOdd(y); // 23.  e1 = sgn0(u) == sgn0(y)
			        y = Fp.cmov(Fp.neg(y), y, e1); // 24.   y = CMOV(-y, y, e1)
			        const tv4_inv = (0, modular_ts_1.FpInvertBatch)(Fp, [tv4], true)[0];
			        x = Fp.mul(x, tv4_inv); // 25.   x = x / tv4
			        return { x, y };
			    };
			}
			function getWLengths(Fp, Fn) {
			    return {
			        secretKey: Fn.BYTES,
			        publicKey: 1 + Fp.BYTES,
			        publicKeyUncompressed: 1 + 2 * Fp.BYTES,
			        publicKeyHasPrefix: true,
			        signature: 2 * Fn.BYTES,
			    };
			}
			/**
			 * Sometimes users only need getPublicKey, getSharedSecret, and secret key handling.
			 * This helper ensures no signature functionality is present. Less code, smaller bundle size.
			 */
			function ecdh(Point, ecdhOpts = {}) {
			    const { Fn } = Point;
			    const randomBytes_ = ecdhOpts.randomBytes || utils_ts_1.randomBytes;
			    const lengths = Object.assign(getWLengths(Point.Fp, Fn), { seed: (0, modular_ts_1.getMinHashLength)(Fn.ORDER) });
			    function isValidSecretKey(secretKey) {
			        try {
			            return !!_normFnElement(Fn, secretKey);
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
			            return !!Point.fromBytes(publicKey);
			        }
			        catch (error) {
			            return false;
			        }
			    }
			    /**
			     * Produces cryptographically secure secret key from random of size
			     * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
			     */
			    function randomSecretKey(seed = randomBytes_(lengths.seed)) {
			        return (0, modular_ts_1.mapHashToField)((0, utils_ts_1._abytes2)(seed, lengths.seed, 'seed'), Fn.ORDER);
			    }
			    /**
			     * Computes public key for a secret key. Checks for validity of the secret key.
			     * @param isCompressed whether to return compact (default), or full key
			     * @returns Public key, full when isCompressed=false; short when isCompressed=true
			     */
			    function getPublicKey(secretKey, isCompressed = true) {
			        return Point.BASE.multiply(_normFnElement(Fn, secretKey)).toBytes(isCompressed);
			    }
			    function keygen(seed) {
			        const secretKey = randomSecretKey(seed);
			        return { secretKey, publicKey: getPublicKey(secretKey) };
			    }
			    /**
			     * Quick and dirty check for item being public key. Does not validate hex, or being on-curve.
			     */
			    function isProbPub(item) {
			        if (typeof item === 'bigint')
			            return false;
			        if (item instanceof Point)
			            return true;
			        const { secretKey, publicKey, publicKeyUncompressed } = lengths;
			        if (Fn.allowedLengths || secretKey === publicKey)
			            return undefined;
			        const l = (0, utils_ts_1.ensureBytes)('key', item).length;
			        return l === publicKey || l === publicKeyUncompressed;
			    }
			    /**
			     * ECDH (Elliptic Curve Diffie Hellman).
			     * Computes shared public key from secret key A and public key B.
			     * Checks: 1) secret key validity 2) shared key is on-curve.
			     * Does NOT hash the result.
			     * @param isCompressed whether to return compact (default), or full key
			     * @returns shared public key
			     */
			    function getSharedSecret(secretKeyA, publicKeyB, isCompressed = true) {
			        if (isProbPub(secretKeyA) === true)
			            throw new Error('first arg must be private key');
			        if (isProbPub(publicKeyB) === false)
			            throw new Error('second arg must be public key');
			        const s = _normFnElement(Fn, secretKeyA);
			        const b = Point.fromHex(publicKeyB); // checks for being on-curve
			        return b.multiply(s).toBytes(isCompressed);
			    }
			    const utils = {
			        isValidSecretKey,
			        isValidPublicKey,
			        randomSecretKey,
			        // TODO: remove
			        isValidPrivateKey: isValidSecretKey,
			        randomPrivateKey: randomSecretKey,
			        normPrivateKeyToScalar: (key) => _normFnElement(Fn, key),
			        precompute(windowSize = 8, point = Point.BASE) {
			            return point.precompute(windowSize, false);
			        },
			    };
			    return Object.freeze({ getPublicKey, getSharedSecret, keygen, Point, utils, lengths });
			}
			/**
			 * Creates ECDSA signing interface for given elliptic curve `Point` and `hash` function.
			 * We need `hash` for 2 features:
			 * 1. Message prehash-ing. NOT used if `sign` / `verify` are called with `prehash: false`
			 * 2. k generation in `sign`, using HMAC-drbg(hash)
			 *
			 * ECDSAOpts are only rarely needed.
			 *
			 * @example
			 * ```js
			 * const p256_Point = weierstrass(...);
			 * const p256_sha256 = ecdsa(p256_Point, sha256);
			 * const p256_sha224 = ecdsa(p256_Point, sha224);
			 * const p256_sha224_r = ecdsa(p256_Point, sha224, { randomBytes: (length) => { ... } });
			 * ```
			 */
			function ecdsa(Point, hash, ecdsaOpts = {}) {
			    (0, utils_1.ahash)(hash);
			    (0, utils_ts_1._validateObject)(ecdsaOpts, {}, {
			        hmac: 'function',
			        lowS: 'boolean',
			        randomBytes: 'function',
			        bits2int: 'function',
			        bits2int_modN: 'function',
			    });
			    const randomBytes = ecdsaOpts.randomBytes || utils_ts_1.randomBytes;
			    const hmac = ecdsaOpts.hmac ||
			        ((key, ...msgs) => (0, hmac_js_1.hmac)(hash, key, (0, utils_ts_1.concatBytes)(...msgs)));
			    const { Fp, Fn } = Point;
			    const { ORDER: CURVE_ORDER, BITS: fnBits } = Fn;
			    const { keygen, getPublicKey, getSharedSecret, utils, lengths } = ecdh(Point, ecdsaOpts);
			    const defaultSigOpts = {
			        prehash: false,
			        lowS: typeof ecdsaOpts.lowS === 'boolean' ? ecdsaOpts.lowS : false,
			        format: undefined, //'compact' as ECDSASigFormat,
			        extraEntropy: false,
			    };
			    const defaultSigOpts_format = 'compact';
			    function isBiggerThanHalfOrder(number) {
			        const HALF = CURVE_ORDER >> _1n;
			        return number > HALF;
			    }
			    function validateRS(title, num) {
			        if (!Fn.isValidNot0(num))
			            throw new Error(`invalid signature ${title}: out of range 1..Point.Fn.ORDER`);
			        return num;
			    }
			    function validateSigLength(bytes, format) {
			        validateSigFormat(format);
			        const size = lengths.signature;
			        const sizer = format === 'compact' ? size : format === 'recovered' ? size + 1 : undefined;
			        return (0, utils_ts_1._abytes2)(bytes, sizer, `${format} signature`);
			    }
			    /**
			     * ECDSA signature with its (r, s) properties. Supports compact, recovered & DER representations.
			     */
			    class Signature {
			        constructor(r, s, recovery) {
			            this.r = validateRS('r', r); // r in [1..N-1];
			            this.s = validateRS('s', s); // s in [1..N-1];
			            if (recovery != null)
			                this.recovery = recovery;
			            Object.freeze(this);
			        }
			        static fromBytes(bytes, format = defaultSigOpts_format) {
			            validateSigLength(bytes, format);
			            let recid;
			            if (format === 'der') {
			                const { r, s } = exports$1.DER.toSig((0, utils_ts_1._abytes2)(bytes));
			                return new Signature(r, s);
			            }
			            if (format === 'recovered') {
			                recid = bytes[0];
			                format = 'compact';
			                bytes = bytes.subarray(1);
			            }
			            const L = Fn.BYTES;
			            const r = bytes.subarray(0, L);
			            const s = bytes.subarray(L, L * 2);
			            return new Signature(Fn.fromBytes(r), Fn.fromBytes(s), recid);
			        }
			        static fromHex(hex, format) {
			            return this.fromBytes((0, utils_ts_1.hexToBytes)(hex), format);
			        }
			        addRecoveryBit(recovery) {
			            return new Signature(this.r, this.s, recovery);
			        }
			        recoverPublicKey(messageHash) {
			            const FIELD_ORDER = Fp.ORDER;
			            const { r, s, recovery: rec } = this;
			            if (rec == null || ![0, 1, 2, 3].includes(rec))
			                throw new Error('recovery id invalid');
			            // ECDSA recovery is hard for cofactor > 1 curves.
			            // In sign, `r = q.x mod n`, and here we recover q.x from r.
			            // While recovering q.x >= n, we need to add r+n for cofactor=1 curves.
			            // However, for cofactor>1, r+n may not get q.x:
			            // r+n*i would need to be done instead where i is unknown.
			            // To easily get i, we either need to:
			            // a. increase amount of valid recid values (4, 5...); OR
			            // b. prohibit non-prime-order signatures (recid > 1).
			            const hasCofactor = CURVE_ORDER * _2n < FIELD_ORDER;
			            if (hasCofactor && rec > 1)
			                throw new Error('recovery id is ambiguous for h>1 curve');
			            const radj = rec === 2 || rec === 3 ? r + CURVE_ORDER : r;
			            if (!Fp.isValid(radj))
			                throw new Error('recovery id 2 or 3 invalid');
			            const x = Fp.toBytes(radj);
			            const R = Point.fromBytes((0, utils_ts_1.concatBytes)(pprefix((rec & 1) === 0), x));
			            const ir = Fn.inv(radj); // r^-1
			            const h = bits2int_modN((0, utils_ts_1.ensureBytes)('msgHash', messageHash)); // Truncate hash
			            const u1 = Fn.create(-h * ir); // -hr^-1
			            const u2 = Fn.create(s * ir); // sr^-1
			            // (sr^-1)R-(hr^-1)G = -(hr^-1)G + (sr^-1). unsafe is fine: there is no private data.
			            const Q = Point.BASE.multiplyUnsafe(u1).add(R.multiplyUnsafe(u2));
			            if (Q.is0())
			                throw new Error('point at infinify');
			            Q.assertValidity();
			            return Q;
			        }
			        // Signatures should be low-s, to prevent malleability.
			        hasHighS() {
			            return isBiggerThanHalfOrder(this.s);
			        }
			        toBytes(format = defaultSigOpts_format) {
			            validateSigFormat(format);
			            if (format === 'der')
			                return (0, utils_ts_1.hexToBytes)(exports$1.DER.hexFromSig(this));
			            const r = Fn.toBytes(this.r);
			            const s = Fn.toBytes(this.s);
			            if (format === 'recovered') {
			                if (this.recovery == null)
			                    throw new Error('recovery bit must be present');
			                return (0, utils_ts_1.concatBytes)(Uint8Array.of(this.recovery), r, s);
			            }
			            return (0, utils_ts_1.concatBytes)(r, s);
			        }
			        toHex(format) {
			            return (0, utils_ts_1.bytesToHex)(this.toBytes(format));
			        }
			        // TODO: remove
			        assertValidity() { }
			        static fromCompact(hex) {
			            return Signature.fromBytes((0, utils_ts_1.ensureBytes)('sig', hex), 'compact');
			        }
			        static fromDER(hex) {
			            return Signature.fromBytes((0, utils_ts_1.ensureBytes)('sig', hex), 'der');
			        }
			        normalizeS() {
			            return this.hasHighS() ? new Signature(this.r, Fn.neg(this.s), this.recovery) : this;
			        }
			        toDERRawBytes() {
			            return this.toBytes('der');
			        }
			        toDERHex() {
			            return (0, utils_ts_1.bytesToHex)(this.toBytes('der'));
			        }
			        toCompactRawBytes() {
			            return this.toBytes('compact');
			        }
			        toCompactHex() {
			            return (0, utils_ts_1.bytesToHex)(this.toBytes('compact'));
			        }
			    }
			    // RFC6979: ensure ECDSA msg is X bytes and < N. RFC suggests optional truncating via bits2octets.
			    // FIPS 186-4 4.6 suggests the leftmost min(nBitLen, outLen) bits, which matches bits2int.
			    // bits2int can produce res>N, we can do mod(res, N) since the bitLen is the same.
			    // int2octets can't be used; pads small msgs with 0: unacceptatble for trunc as per RFC vectors
			    const bits2int = ecdsaOpts.bits2int ||
			        function bits2int_def(bytes) {
			            // Our custom check "just in case", for protection against DoS
			            if (bytes.length > 8192)
			                throw new Error('input is too large');
			            // For curves with nBitLength % 8 !== 0: bits2octets(bits2octets(m)) !== bits2octets(m)
			            // for some cases, since bytes.length * 8 is not actual bitLength.
			            const num = (0, utils_ts_1.bytesToNumberBE)(bytes); // check for == u8 done here
			            const delta = bytes.length * 8 - fnBits; // truncate to nBitLength leftmost bits
			            return delta > 0 ? num >> BigInt(delta) : num;
			        };
			    const bits2int_modN = ecdsaOpts.bits2int_modN ||
			        function bits2int_modN_def(bytes) {
			            return Fn.create(bits2int(bytes)); // can't use bytesToNumberBE here
			        };
			    // Pads output with zero as per spec
			    const ORDER_MASK = (0, utils_ts_1.bitMask)(fnBits);
			    /** Converts to bytes. Checks if num in `[0..ORDER_MASK-1]` e.g.: `[0..2^256-1]`. */
			    function int2octets(num) {
			        // IMPORTANT: the check ensures working for case `Fn.BYTES != Fn.BITS * 8`
			        (0, utils_ts_1.aInRange)('num < 2^' + fnBits, num, _0n, ORDER_MASK);
			        return Fn.toBytes(num);
			    }
			    function validateMsgAndHash(message, prehash) {
			        (0, utils_ts_1._abytes2)(message, undefined, 'message');
			        return prehash ? (0, utils_ts_1._abytes2)(hash(message), undefined, 'prehashed message') : message;
			    }
			    /**
			     * Steps A, D of RFC6979 3.2.
			     * Creates RFC6979 seed; converts msg/privKey to numbers.
			     * Used only in sign, not in verify.
			     *
			     * Warning: we cannot assume here that message has same amount of bytes as curve order,
			     * this will be invalid at least for P521. Also it can be bigger for P224 + SHA256.
			     */
			    function prepSig(message, privateKey, opts) {
			        if (['recovered', 'canonical'].some((k) => k in opts))
			            throw new Error('sign() legacy options not supported');
			        const { lowS, prehash, extraEntropy } = validateSigOpts(opts, defaultSigOpts);
			        message = validateMsgAndHash(message, prehash); // RFC6979 3.2 A: h1 = H(m)
			        // We can't later call bits2octets, since nested bits2int is broken for curves
			        // with fnBits % 8 !== 0. Because of that, we unwrap it here as int2octets call.
			        // const bits2octets = (bits) => int2octets(bits2int_modN(bits))
			        const h1int = bits2int_modN(message);
			        const d = _normFnElement(Fn, privateKey); // validate secret key, convert to bigint
			        const seedArgs = [int2octets(d), int2octets(h1int)];
			        // extraEntropy. RFC6979 3.6: additional k' (optional).
			        if (extraEntropy != null && extraEntropy !== false) {
			            // K = HMAC_K(V || 0x00 || int2octets(x) || bits2octets(h1) || k')
			            // gen random bytes OR pass as-is
			            const e = extraEntropy === true ? randomBytes(lengths.secretKey) : extraEntropy;
			            seedArgs.push((0, utils_ts_1.ensureBytes)('extraEntropy', e)); // check for being bytes
			        }
			        const seed = (0, utils_ts_1.concatBytes)(...seedArgs); // Step D of RFC6979 3.2
			        const m = h1int; // NOTE: no need to call bits2int second time here, it is inside truncateHash!
			        // Converts signature params into point w r/s, checks result for validity.
			        // To transform k => Signature:
			        // q = k⋅G
			        // r = q.x mod n
			        // s = k^-1(m + rd) mod n
			        // Can use scalar blinding b^-1(bm + bdr) where b ∈ [1,q−1] according to
			        // https://tches.iacr.org/index.php/TCHES/article/view/7337/6509. We've decided against it:
			        // a) dependency on CSPRNG b) 15% slowdown c) doesn't really help since bigints are not CT
			        function k2sig(kBytes) {
			            // RFC 6979 Section 3.2, step 3: k = bits2int(T)
			            // Important: all mod() calls here must be done over N
			            const k = bits2int(kBytes); // mod n, not mod p
			            if (!Fn.isValidNot0(k))
			                return; // Valid scalars (including k) must be in 1..N-1
			            const ik = Fn.inv(k); // k^-1 mod n
			            const q = Point.BASE.multiply(k).toAffine(); // q = k⋅G
			            const r = Fn.create(q.x); // r = q.x mod n
			            if (r === _0n)
			                return;
			            const s = Fn.create(ik * Fn.create(m + r * d)); // Not using blinding here, see comment above
			            if (s === _0n)
			                return;
			            let recovery = (q.x === r ? 0 : 2) | Number(q.y & _1n); // recovery bit (2 or 3, when q.x > n)
			            let normS = s;
			            if (lowS && isBiggerThanHalfOrder(s)) {
			                normS = Fn.neg(s); // if lowS was passed, ensure s is always
			                recovery ^= 1; // // in the bottom half of N
			            }
			            return new Signature(r, normS, recovery); // use normS, not s
			        }
			        return { seed, k2sig };
			    }
			    /**
			     * Signs message hash with a secret key.
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
			        message = (0, utils_ts_1.ensureBytes)('message', message);
			        const { seed, k2sig } = prepSig(message, secretKey, opts); // Steps A, D of RFC6979 3.2.
			        const drbg = (0, utils_ts_1.createHmacDrbg)(hash.outputLen, Fn.BYTES, hmac);
			        const sig = drbg(seed, k2sig); // Steps B, C, D, E, F, G
			        return sig;
			    }
			    function tryParsingSig(sg) {
			        // Try to deduce format
			        let sig = undefined;
			        const isHex = typeof sg === 'string' || (0, utils_ts_1.isBytes)(sg);
			        const isObj = !isHex &&
			            sg !== null &&
			            typeof sg === 'object' &&
			            typeof sg.r === 'bigint' &&
			            typeof sg.s === 'bigint';
			        if (!isHex && !isObj)
			            throw new Error('invalid signature, expected Uint8Array, hex string or Signature instance');
			        if (isObj) {
			            sig = new Signature(sg.r, sg.s);
			        }
			        else if (isHex) {
			            try {
			                sig = Signature.fromBytes((0, utils_ts_1.ensureBytes)('sig', sg), 'der');
			            }
			            catch (derError) {
			                if (!(derError instanceof exports$1.DER.Err))
			                    throw derError;
			            }
			            if (!sig) {
			                try {
			                    sig = Signature.fromBytes((0, utils_ts_1.ensureBytes)('sig', sg), 'compact');
			                }
			                catch (error) {
			                    return false;
			                }
			            }
			        }
			        if (!sig)
			            return false;
			        return sig;
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
			        const { lowS, prehash, format } = validateSigOpts(opts, defaultSigOpts);
			        publicKey = (0, utils_ts_1.ensureBytes)('publicKey', publicKey);
			        message = validateMsgAndHash((0, utils_ts_1.ensureBytes)('message', message), prehash);
			        if ('strict' in opts)
			            throw new Error('options.strict was renamed to lowS');
			        const sig = format === undefined
			            ? tryParsingSig(signature)
			            : Signature.fromBytes((0, utils_ts_1.ensureBytes)('sig', signature), format);
			        if (sig === false)
			            return false;
			        try {
			            const P = Point.fromBytes(publicKey);
			            if (lowS && sig.hasHighS())
			                return false;
			            const { r, s } = sig;
			            const h = bits2int_modN(message); // mod n, not mod p
			            const is = Fn.inv(s); // s^-1 mod n
			            const u1 = Fn.create(h * is); // u1 = hs^-1 mod n
			            const u2 = Fn.create(r * is); // u2 = rs^-1 mod n
			            const R = Point.BASE.multiplyUnsafe(u1).add(P.multiplyUnsafe(u2)); // u1⋅G + u2⋅P
			            if (R.is0())
			                return false;
			            const v = Fn.create(R.x); // v = r.x mod n
			            return v === r;
			        }
			        catch (e) {
			            return false;
			        }
			    }
			    function recoverPublicKey(signature, message, opts = {}) {
			        const { prehash } = validateSigOpts(opts, defaultSigOpts);
			        message = validateMsgAndHash(message, prehash);
			        return Signature.fromBytes(signature, 'recovered').recoverPublicKey(message).toBytes();
			    }
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
			        hash,
			    });
			}
			/** @deprecated use `weierstrass` in newer releases */
			function weierstrassPoints(c) {
			    const { CURVE, curveOpts } = _weierstrass_legacy_opts_to_new(c);
			    const Point = weierstrassN(CURVE, curveOpts);
			    return _weierstrass_new_output_to_legacy(c, Point);
			}
			function _weierstrass_legacy_opts_to_new(c) {
			    const CURVE = {
			        a: c.a,
			        b: c.b,
			        p: c.Fp.ORDER,
			        n: c.n,
			        h: c.h,
			        Gx: c.Gx,
			        Gy: c.Gy,
			    };
			    const Fp = c.Fp;
			    let allowedLengths = c.allowedPrivateKeyLengths
			        ? Array.from(new Set(c.allowedPrivateKeyLengths.map((l) => Math.ceil(l / 2))))
			        : undefined;
			    const Fn = (0, modular_ts_1.Field)(CURVE.n, {
			        BITS: c.nBitLength,
			        allowedLengths: allowedLengths,
			        modFromBytes: c.wrapPrivateKey,
			    });
			    const curveOpts = {
			        Fp,
			        Fn,
			        allowInfinityPoint: c.allowInfinityPoint,
			        endo: c.endo,
			        isTorsionFree: c.isTorsionFree,
			        clearCofactor: c.clearCofactor,
			        fromBytes: c.fromBytes,
			        toBytes: c.toBytes,
			    };
			    return { CURVE, curveOpts };
			}
			function _ecdsa_legacy_opts_to_new(c) {
			    const { CURVE, curveOpts } = _weierstrass_legacy_opts_to_new(c);
			    const ecdsaOpts = {
			        hmac: c.hmac,
			        randomBytes: c.randomBytes,
			        lowS: c.lowS,
			        bits2int: c.bits2int,
			        bits2int_modN: c.bits2int_modN,
			    };
			    return { CURVE, curveOpts, hash: c.hash, ecdsaOpts };
			}
			function _legacyHelperEquat(Fp, a, b) {
			    /**
			     * y² = x³ + ax + b: Short weierstrass curve formula. Takes x, returns y².
			     * @returns y²
			     */
			    function weierstrassEquation(x) {
			        const x2 = Fp.sqr(x); // x * x
			        const x3 = Fp.mul(x2, x); // x² * x
			        return Fp.add(Fp.add(x3, Fp.mul(x, a)), b); // x³ + a * x + b
			    }
			    return weierstrassEquation;
			}
			function _weierstrass_new_output_to_legacy(c, Point) {
			    const { Fp, Fn } = Point;
			    function isWithinCurveOrder(num) {
			        return (0, utils_ts_1.inRange)(num, _1n, Fn.ORDER);
			    }
			    const weierstrassEquation = _legacyHelperEquat(Fp, c.a, c.b);
			    return Object.assign({}, {
			        CURVE: c,
			        Point: Point,
			        ProjectivePoint: Point,
			        normPrivateKeyToScalar: (key) => _normFnElement(Fn, key),
			        weierstrassEquation,
			        isWithinCurveOrder,
			    });
			}
			function _ecdsa_new_output_to_legacy(c, _ecdsa) {
			    const Point = _ecdsa.Point;
			    return Object.assign({}, _ecdsa, {
			        ProjectivePoint: Point,
			        CURVE: Object.assign({}, c, (0, modular_ts_1.nLength)(Point.Fn.ORDER, Point.Fn.BITS)),
			    });
			}
			// _ecdsa_legacy
			function weierstrass(c) {
			    const { CURVE, curveOpts, hash, ecdsaOpts } = _ecdsa_legacy_opts_to_new(c);
			    const Point = weierstrassN(CURVE, curveOpts);
			    const signs = ecdsa(Point, hash, ecdsaOpts);
			    return _ecdsa_new_output_to_legacy(c, signs);
			}
			
		} (weierstrass));
		return weierstrass;
	}

	var hasRequired_shortw_utils;

	function require_shortw_utils () {
		if (hasRequired_shortw_utils) return _shortw_utils;
		hasRequired_shortw_utils = 1;
		Object.defineProperty(_shortw_utils, "__esModule", { value: true });
		_shortw_utils.getHash = getHash;
		_shortw_utils.createCurve = createCurve;
		/**
		 * Utilities for short weierstrass curves, combined with noble-hashes.
		 * @module
		 */
		/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
		const weierstrass_ts_1 = /*@__PURE__*/ requireWeierstrass();
		/** connects noble-curves to noble-hashes */
		function getHash(hash) {
		    return { hash };
		}
		/** @deprecated use new `weierstrass()` and `ecdsa()` methods */
		function createCurve(curveDef, defHash) {
		    const create = (hash) => (0, weierstrass_ts_1.weierstrass)({ ...curveDef, hash: hash });
		    return { ...create(defHash), create };
		}
		
		return _shortw_utils;
	}

	var hashToCurve = {};

	var hasRequiredHashToCurve;

	function requireHashToCurve () {
		if (hasRequiredHashToCurve) return hashToCurve;
		hasRequiredHashToCurve = 1;
		(function (exports$1) {
			Object.defineProperty(exports$1, "__esModule", { value: true });
			exports$1._DST_scalar = void 0;
			exports$1.expand_message_xmd = expand_message_xmd;
			exports$1.expand_message_xof = expand_message_xof;
			exports$1.hash_to_field = hash_to_field;
			exports$1.isogenyMap = isogenyMap;
			exports$1.createHasher = createHasher;
			const utils_ts_1 = /*@__PURE__*/ requireUtils$1();
			const modular_ts_1 = /*@__PURE__*/ requireModular();
			// Octet Stream to Integer. "spec" implementation of os2ip is 2.5x slower vs bytesToNumberBE.
			const os2ip = utils_ts_1.bytesToNumberBE;
			// Integer to Octet Stream (numberToBytesBE)
			function i2osp(value, length) {
			    anum(value);
			    anum(length);
			    if (value < 0 || value >= 1 << (8 * length))
			        throw new Error('invalid I2OSP input: ' + value);
			    const res = Array.from({ length }).fill(0);
			    for (let i = length - 1; i >= 0; i--) {
			        res[i] = value & 0xff;
			        value >>>= 8;
			    }
			    return new Uint8Array(res);
			}
			function strxor(a, b) {
			    const arr = new Uint8Array(a.length);
			    for (let i = 0; i < a.length; i++) {
			        arr[i] = a[i] ^ b[i];
			    }
			    return arr;
			}
			function anum(item) {
			    if (!Number.isSafeInteger(item))
			        throw new Error('number expected');
			}
			function normDST(DST) {
			    if (!(0, utils_ts_1.isBytes)(DST) && typeof DST !== 'string')
			        throw new Error('DST must be Uint8Array or string');
			    return typeof DST === 'string' ? (0, utils_ts_1.utf8ToBytes)(DST) : DST;
			}
			/**
			 * Produces a uniformly random byte string using a cryptographic hash function H that outputs b bits.
			 * [RFC 9380 5.3.1](https://www.rfc-editor.org/rfc/rfc9380#section-5.3.1).
			 */
			function expand_message_xmd(msg, DST, lenInBytes, H) {
			    (0, utils_ts_1.abytes)(msg);
			    anum(lenInBytes);
			    DST = normDST(DST);
			    // https://www.rfc-editor.org/rfc/rfc9380#section-5.3.3
			    if (DST.length > 255)
			        DST = H((0, utils_ts_1.concatBytes)((0, utils_ts_1.utf8ToBytes)('H2C-OVERSIZE-DST-'), DST));
			    const { outputLen: b_in_bytes, blockLen: r_in_bytes } = H;
			    const ell = Math.ceil(lenInBytes / b_in_bytes);
			    if (lenInBytes > 65535 || ell > 255)
			        throw new Error('expand_message_xmd: invalid lenInBytes');
			    const DST_prime = (0, utils_ts_1.concatBytes)(DST, i2osp(DST.length, 1));
			    const Z_pad = i2osp(0, r_in_bytes);
			    const l_i_b_str = i2osp(lenInBytes, 2); // len_in_bytes_str
			    const b = new Array(ell);
			    const b_0 = H((0, utils_ts_1.concatBytes)(Z_pad, msg, l_i_b_str, i2osp(0, 1), DST_prime));
			    b[0] = H((0, utils_ts_1.concatBytes)(b_0, i2osp(1, 1), DST_prime));
			    for (let i = 1; i <= ell; i++) {
			        const args = [strxor(b_0, b[i - 1]), i2osp(i + 1, 1), DST_prime];
			        b[i] = H((0, utils_ts_1.concatBytes)(...args));
			    }
			    const pseudo_random_bytes = (0, utils_ts_1.concatBytes)(...b);
			    return pseudo_random_bytes.slice(0, lenInBytes);
			}
			/**
			 * Produces a uniformly random byte string using an extendable-output function (XOF) H.
			 * 1. The collision resistance of H MUST be at least k bits.
			 * 2. H MUST be an XOF that has been proved indifferentiable from
			 *    a random oracle under a reasonable cryptographic assumption.
			 * [RFC 9380 5.3.2](https://www.rfc-editor.org/rfc/rfc9380#section-5.3.2).
			 */
			function expand_message_xof(msg, DST, lenInBytes, k, H) {
			    (0, utils_ts_1.abytes)(msg);
			    anum(lenInBytes);
			    DST = normDST(DST);
			    // https://www.rfc-editor.org/rfc/rfc9380#section-5.3.3
			    // DST = H('H2C-OVERSIZE-DST-' || a_very_long_DST, Math.ceil((lenInBytes * k) / 8));
			    if (DST.length > 255) {
			        const dkLen = Math.ceil((2 * k) / 8);
			        DST = H.create({ dkLen }).update((0, utils_ts_1.utf8ToBytes)('H2C-OVERSIZE-DST-')).update(DST).digest();
			    }
			    if (lenInBytes > 65535 || DST.length > 255)
			        throw new Error('expand_message_xof: invalid lenInBytes');
			    return (H.create({ dkLen: lenInBytes })
			        .update(msg)
			        .update(i2osp(lenInBytes, 2))
			        // 2. DST_prime = DST || I2OSP(len(DST), 1)
			        .update(DST)
			        .update(i2osp(DST.length, 1))
			        .digest());
			}
			/**
			 * Hashes arbitrary-length byte strings to a list of one or more elements of a finite field F.
			 * [RFC 9380 5.2](https://www.rfc-editor.org/rfc/rfc9380#section-5.2).
			 * @param msg a byte string containing the message to hash
			 * @param count the number of elements of F to output
			 * @param options `{DST: string, p: bigint, m: number, k: number, expand: 'xmd' | 'xof', hash: H}`, see above
			 * @returns [u_0, ..., u_(count - 1)], a list of field elements.
			 */
			function hash_to_field(msg, count, options) {
			    (0, utils_ts_1._validateObject)(options, {
			        p: 'bigint',
			        m: 'number',
			        k: 'number',
			        hash: 'function',
			    });
			    const { p, k, m, hash, expand, DST } = options;
			    if (!(0, utils_ts_1.isHash)(options.hash))
			        throw new Error('expected valid hash');
			    (0, utils_ts_1.abytes)(msg);
			    anum(count);
			    const log2p = p.toString(2).length;
			    const L = Math.ceil((log2p + k) / 8); // section 5.1 of ietf draft link above
			    const len_in_bytes = count * m * L;
			    let prb; // pseudo_random_bytes
			    if (expand === 'xmd') {
			        prb = expand_message_xmd(msg, DST, len_in_bytes, hash);
			    }
			    else if (expand === 'xof') {
			        prb = expand_message_xof(msg, DST, len_in_bytes, k, hash);
			    }
			    else if (expand === '_internal_pass') {
			        // for internal tests only
			        prb = msg;
			    }
			    else {
			        throw new Error('expand must be "xmd" or "xof"');
			    }
			    const u = new Array(count);
			    for (let i = 0; i < count; i++) {
			        const e = new Array(m);
			        for (let j = 0; j < m; j++) {
			            const elm_offset = L * (j + i * m);
			            const tv = prb.subarray(elm_offset, elm_offset + L);
			            e[j] = (0, modular_ts_1.mod)(os2ip(tv), p);
			        }
			        u[i] = e;
			    }
			    return u;
			}
			function isogenyMap(field, map) {
			    // Make same order as in spec
			    const coeff = map.map((i) => Array.from(i).reverse());
			    return (x, y) => {
			        const [xn, xd, yn, yd] = coeff.map((val) => val.reduce((acc, i) => field.add(field.mul(acc, x), i)));
			        // 6.6.3
			        // Exceptional cases of iso_map are inputs that cause the denominator of
			        // either rational function to evaluate to zero; such cases MUST return
			        // the identity point on E.
			        const [xd_inv, yd_inv] = (0, modular_ts_1.FpInvertBatch)(field, [xd, yd], true);
			        x = field.mul(xn, xd_inv); // xNum / xDen
			        y = field.mul(y, field.mul(yn, yd_inv)); // y * (yNum / yDev)
			        return { x, y };
			    };
			}
			exports$1._DST_scalar = (0, utils_ts_1.utf8ToBytes)('HashToScalar-');
			/** Creates hash-to-curve methods from EC Point and mapToCurve function. See {@link H2CHasher}. */
			function createHasher(Point, mapToCurve, defaults) {
			    if (typeof mapToCurve !== 'function')
			        throw new Error('mapToCurve() must be defined');
			    function map(num) {
			        return Point.fromAffine(mapToCurve(num));
			    }
			    function clear(initial) {
			        const P = initial.clearCofactor();
			        if (P.equals(Point.ZERO))
			            return Point.ZERO; // zero will throw in assert
			        P.assertValidity();
			        return P;
			    }
			    return {
			        defaults,
			        hashToCurve(msg, options) {
			            const opts = Object.assign({}, defaults, options);
			            const u = hash_to_field(msg, 2, opts);
			            const u0 = map(u[0]);
			            const u1 = map(u[1]);
			            return clear(u0.add(u1));
			        },
			        encodeToCurve(msg, options) {
			            const optsDst = defaults.encodeDST ? { DST: defaults.encodeDST } : {};
			            const opts = Object.assign({}, defaults, optsDst, options);
			            const u = hash_to_field(msg, 1, opts);
			            const u0 = map(u[0]);
			            return clear(u0);
			        },
			        /** See {@link H2CHasher} */
			        mapToCurve(scalars) {
			            if (!Array.isArray(scalars))
			                throw new Error('expected array of bigints');
			            for (const i of scalars)
			                if (typeof i !== 'bigint')
			                    throw new Error('expected array of bigints');
			            return clear(map(scalars));
			        },
			        // hash_to_scalar can produce 0: https://www.rfc-editor.org/errata/eid8393
			        // RFC 9380, draft-irtf-cfrg-bbs-signatures-08
			        hashToScalar(msg, options) {
			            // @ts-ignore
			            const N = Point.Fn.ORDER;
			            const opts = Object.assign({}, defaults, { p: N, m: 1, DST: exports$1._DST_scalar }, options);
			            return hash_to_field(msg, 1, opts)[0][0];
			        },
			    };
			}
			
		} (hashToCurve));
		return hashToCurve;
	}

	var hasRequiredSecp256k1;

	function requireSecp256k1 () {
		if (hasRequiredSecp256k1) return secp256k1;
		hasRequiredSecp256k1 = 1;
		(function (exports$1) {
			Object.defineProperty(exports$1, "__esModule", { value: true });
			exports$1.encodeToCurve = exports$1.hashToCurve = exports$1.secp256k1_hasher = exports$1.schnorr = exports$1.secp256k1 = void 0;
			/**
			 * SECG secp256k1. See [pdf](https://www.secg.org/sec2-v2.pdf).
			 *
			 * Belongs to Koblitz curves: it has efficiently-computable GLV endomorphism ψ,
			 * check out {@link EndomorphismOpts}. Seems to be rigid (not backdoored).
			 * @module
			 */
			/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
			const sha2_js_1 = /*@__PURE__*/ requireSha2();
			const utils_js_1 = /*@__PURE__*/ requireUtils$3();
			const _shortw_utils_ts_1 = /*@__PURE__*/ require_shortw_utils();
			const hash_to_curve_ts_1 = /*@__PURE__*/ requireHashToCurve();
			const modular_ts_1 = /*@__PURE__*/ requireModular();
			const weierstrass_ts_1 = /*@__PURE__*/ requireWeierstrass();
			const utils_ts_1 = /*@__PURE__*/ requireUtils$1();
			// Seems like generator was produced from some seed:
			// `Point.BASE.multiply(Point.Fn.inv(2n, N)).toAffine().x`
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
			const _0n = /* @__PURE__ */ BigInt(0);
			const _1n = /* @__PURE__ */ BigInt(1);
			const _2n = /* @__PURE__ */ BigInt(2);
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
			    const b6 = ((0, modular_ts_1.pow2)(b3, _3n, P) * b3) % P;
			    const b9 = ((0, modular_ts_1.pow2)(b6, _3n, P) * b3) % P;
			    const b11 = ((0, modular_ts_1.pow2)(b9, _2n, P) * b2) % P;
			    const b22 = ((0, modular_ts_1.pow2)(b11, _11n, P) * b11) % P;
			    const b44 = ((0, modular_ts_1.pow2)(b22, _22n, P) * b22) % P;
			    const b88 = ((0, modular_ts_1.pow2)(b44, _44n, P) * b44) % P;
			    const b176 = ((0, modular_ts_1.pow2)(b88, _88n, P) * b88) % P;
			    const b220 = ((0, modular_ts_1.pow2)(b176, _44n, P) * b44) % P;
			    const b223 = ((0, modular_ts_1.pow2)(b220, _3n, P) * b3) % P;
			    const t1 = ((0, modular_ts_1.pow2)(b223, _23n, P) * b22) % P;
			    const t2 = ((0, modular_ts_1.pow2)(t1, _6n, P) * b2) % P;
			    const root = (0, modular_ts_1.pow2)(t2, _2n, P);
			    if (!Fpk1.eql(Fpk1.sqr(root), y))
			        throw new Error('Cannot find square root');
			    return root;
			}
			const Fpk1 = (0, modular_ts_1.Field)(secp256k1_CURVE.p, { sqrt: sqrtMod });
			/**
			 * secp256k1 curve, ECDSA and ECDH methods.
			 *
			 * Field: `2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n`
			 *
			 * @example
			 * ```js
			 * import { secp256k1 } from '@noble/curves/secp256k1';
			 * const { secretKey, publicKey } = secp256k1.keygen();
			 * const msg = new TextEncoder().encode('hello');
			 * const sig = secp256k1.sign(msg, secretKey);
			 * const isValid = secp256k1.verify(sig, msg, publicKey) === true;
			 * ```
			 */
			exports$1.secp256k1 = (0, _shortw_utils_ts_1.createCurve)({ ...secp256k1_CURVE, Fp: Fpk1, lowS: true, endo: secp256k1_ENDO }, sha2_js_1.sha256);
			// Schnorr signatures are superior to ECDSA from above. Below is Schnorr-specific BIP0340 code.
			// https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki
			/** An object mapping tags to their tagged hash prefix of [SHA256(tag) | SHA256(tag)] */
			const TAGGED_HASH_PREFIXES = {};
			function taggedHash(tag, ...messages) {
			    let tagP = TAGGED_HASH_PREFIXES[tag];
			    if (tagP === undefined) {
			        const tagH = (0, sha2_js_1.sha256)((0, utils_ts_1.utf8ToBytes)(tag));
			        tagP = (0, utils_ts_1.concatBytes)(tagH, tagH);
			        TAGGED_HASH_PREFIXES[tag] = tagP;
			    }
			    return (0, sha2_js_1.sha256)((0, utils_ts_1.concatBytes)(tagP, ...messages));
			}
			// ECDSA compact points are 33-byte. Schnorr is 32: we strip first byte 0x02 or 0x03
			const pointToBytes = (point) => point.toBytes(true).slice(1);
			const Pointk1 = /* @__PURE__ */ (() => exports$1.secp256k1.Point)();
			const hasEven = (y) => y % _2n === _0n;
			// Calculate point, scalar and bytes
			function schnorrGetExtPubKey(priv) {
			    const { Fn, BASE } = Pointk1;
			    const d_ = (0, weierstrass_ts_1._normFnElement)(Fn, priv);
			    const p = BASE.multiply(d_); // P = d'⋅G; 0 < d' < n check is done inside
			    const scalar = hasEven(p.y) ? d_ : Fn.neg(d_);
			    return { scalar, bytes: pointToBytes(p) };
			}
			/**
			 * lift_x from BIP340. Convert 32-byte x coordinate to elliptic curve point.
			 * @returns valid point checked for being on-curve
			 */
			function lift_x(x) {
			    const Fp = Fpk1;
			    if (!Fp.isValidNot0(x))
			        throw new Error('invalid x: Fail if x ≥ p');
			    const xx = Fp.create(x * x);
			    const c = Fp.create(xx * x + BigInt(7)); // Let c = x³ + 7 mod p.
			    let y = Fp.sqrt(c); // Let y = c^(p+1)/4 mod p. Same as sqrt().
			    // Return the unique point P such that x(P) = x and
			    // y(P) = y if y mod 2 = 0 or y(P) = p-y otherwise.
			    if (!hasEven(y))
			        y = Fp.neg(y);
			    const p = Pointk1.fromAffine({ x, y });
			    p.assertValidity();
			    return p;
			}
			const num = utils_ts_1.bytesToNumberBE;
			/**
			 * Create tagged hash, convert it to bigint, reduce modulo-n.
			 */
			function challenge(...args) {
			    return Pointk1.Fn.create(num(taggedHash('BIP0340/challenge', ...args)));
			}
			/**
			 * Schnorr public key is just `x` coordinate of Point as per BIP340.
			 */
			function schnorrGetPublicKey(secretKey) {
			    return schnorrGetExtPubKey(secretKey).bytes; // d'=int(sk). Fail if d'=0 or d'≥n. Ret bytes(d'⋅G)
			}
			/**
			 * Creates Schnorr signature as per BIP340. Verifies itself before returning anything.
			 * auxRand is optional and is not the sole source of k generation: bad CSPRNG won't be dangerous.
			 */
			function schnorrSign(message, secretKey, auxRand = (0, utils_js_1.randomBytes)(32)) {
			    const { Fn } = Pointk1;
			    const m = (0, utils_ts_1.ensureBytes)('message', message);
			    const { bytes: px, scalar: d } = schnorrGetExtPubKey(secretKey); // checks for isWithinCurveOrder
			    const a = (0, utils_ts_1.ensureBytes)('auxRand', auxRand, 32); // Auxiliary random data a: a 32-byte array
			    const t = Fn.toBytes(d ^ num(taggedHash('BIP0340/aux', a))); // Let t be the byte-wise xor of bytes(d) and hash/aux(a)
			    const rand = taggedHash('BIP0340/nonce', t, px, m); // Let rand = hash/nonce(t || bytes(P) || m)
			    // Let k' = int(rand) mod n. Fail if k' = 0. Let R = k'⋅G
			    const { bytes: rx, scalar: k } = schnorrGetExtPubKey(rand);
			    const e = challenge(rx, px, m); // Let e = int(hash/challenge(bytes(R) || bytes(P) || m)) mod n.
			    const sig = new Uint8Array(64); // Let sig = bytes(R) || bytes((k + ed) mod n).
			    sig.set(rx, 0);
			    sig.set(Fn.toBytes(Fn.create(k + e * d)), 32);
			    // If Verify(bytes(P), m, sig) (see below) returns failure, abort
			    if (!schnorrVerify(sig, m, px))
			        throw new Error('sign: Invalid signature produced');
			    return sig;
			}
			/**
			 * Verifies Schnorr signature.
			 * Will swallow errors & return false except for initial type validation of arguments.
			 */
			function schnorrVerify(signature, message, publicKey) {
			    const { Fn, BASE } = Pointk1;
			    const sig = (0, utils_ts_1.ensureBytes)('signature', signature, 64);
			    const m = (0, utils_ts_1.ensureBytes)('message', message);
			    const pub = (0, utils_ts_1.ensureBytes)('publicKey', publicKey, 32);
			    try {
			        const P = lift_x(num(pub)); // P = lift_x(int(pk)); fail if that fails
			        const r = num(sig.subarray(0, 32)); // Let r = int(sig[0:32]); fail if r ≥ p.
			        if (!(0, utils_ts_1.inRange)(r, _1n, secp256k1_CURVE.p))
			            return false;
			        const s = num(sig.subarray(32, 64)); // Let s = int(sig[32:64]); fail if s ≥ n.
			        if (!(0, utils_ts_1.inRange)(s, _1n, secp256k1_CURVE.n))
			            return false;
			        // int(challenge(bytes(r)||bytes(P)||m))%n
			        const e = challenge(Fn.toBytes(r), pointToBytes(P), m);
			        // R = s⋅G - e⋅P, where -eP == (n-e)P
			        const R = BASE.multiplyUnsafe(s).add(P.multiplyUnsafe(Fn.neg(e)));
			        const { x, y } = R.toAffine();
			        // Fail if is_infinite(R) / not has_even_y(R) / x(R) ≠ r.
			        if (R.is0() || !hasEven(y) || x !== r)
			            return false;
			        return true;
			    }
			    catch (error) {
			        return false;
			    }
			}
			/**
			 * Schnorr signatures over secp256k1.
			 * https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki
			 * @example
			 * ```js
			 * import { schnorr } from '@noble/curves/secp256k1';
			 * const { secretKey, publicKey } = schnorr.keygen();
			 * // const publicKey = schnorr.getPublicKey(secretKey);
			 * const msg = new TextEncoder().encode('hello');
			 * const sig = schnorr.sign(msg, secretKey);
			 * const isValid = schnorr.verify(sig, msg, publicKey);
			 * ```
			 */
			exports$1.schnorr = (() => {
			    const size = 32;
			    const seedLength = 48;
			    const randomSecretKey = (seed = (0, utils_js_1.randomBytes)(seedLength)) => {
			        return (0, modular_ts_1.mapHashToField)(seed, secp256k1_CURVE.n);
			    };
			    // TODO: remove
			    exports$1.secp256k1.utils.randomSecretKey;
			    function keygen(seed) {
			        const secretKey = randomSecretKey(seed);
			        return { secretKey, publicKey: schnorrGetPublicKey(secretKey) };
			    }
			    return {
			        keygen,
			        getPublicKey: schnorrGetPublicKey,
			        sign: schnorrSign,
			        verify: schnorrVerify,
			        Point: Pointk1,
			        utils: {
			            randomSecretKey: randomSecretKey,
			            randomPrivateKey: randomSecretKey,
			            taggedHash,
			            // TODO: remove
			            lift_x,
			            pointToBytes,
			            numberToBytesBE: utils_ts_1.numberToBytesBE,
			            bytesToNumberBE: utils_ts_1.bytesToNumberBE,
			            mod: modular_ts_1.mod,
			        },
			        lengths: {
			            secretKey: size,
			            publicKey: size,
			            publicKeyHasPrefix: false,
			            signature: size * 2,
			            seed: seedLength,
			        },
			    };
			})();
			const isoMap = /* @__PURE__ */ (() => (0, hash_to_curve_ts_1.isogenyMap)(Fpk1, [
			    // xNum
			    [
			        '0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa8c7',
			        '0x7d3d4c80bc321d5b9f315cea7fd44c5d595d2fc0bf63b92dfff1044f17c6581',
			        '0x534c328d23f234e6e2a413deca25caece4506144037c40314ecbd0b53d9dd262',
			        '0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa88c',
			    ],
			    // xDen
			    [
			        '0xd35771193d94918a9ca34ccbb7b640dd86cd409542f8487d9fe6b745781eb49b',
			        '0xedadc6f64383dc1df7c4b2d51b54225406d36b641f5e41bbc52a56612a8c6d14',
			        '0x0000000000000000000000000000000000000000000000000000000000000001', // LAST 1
			    ],
			    // yNum
			    [
			        '0x4bda12f684bda12f684bda12f684bda12f684bda12f684bda12f684b8e38e23c',
			        '0xc75e0c32d5cb7c0fa9d0a54b12a0a6d5647ab046d686da6fdffc90fc201d71a3',
			        '0x29a6194691f91a73715209ef6512e576722830a201be2018a765e85a9ecee931',
			        '0x2f684bda12f684bda12f684bda12f684bda12f684bda12f684bda12f38e38d84',
			    ],
			    // yDen
			    [
			        '0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffff93b',
			        '0x7a06534bb8bdb49fd5e9e6632722c2989467c1bfc8e8d978dfb425d2685c2573',
			        '0x6484aa716545ca2cf3a70c3fa8fe337e0a3d21162f0d6299a7bf8192bfd2a76f',
			        '0x0000000000000000000000000000000000000000000000000000000000000001', // LAST 1
			    ],
			].map((i) => i.map((j) => BigInt(j)))))();
			const mapSWU = /* @__PURE__ */ (() => (0, weierstrass_ts_1.mapToCurveSimpleSWU)(Fpk1, {
			    A: BigInt('0x3f8731abdd661adca08a5558f0f5d272e953d363cb6f0e5d405447c01a444533'),
			    B: BigInt('1771'),
			    Z: Fpk1.create(BigInt('-11')),
			}))();
			/** Hashing / encoding to secp256k1 points / field. RFC 9380 methods. */
			exports$1.secp256k1_hasher = (() => (0, hash_to_curve_ts_1.createHasher)(exports$1.secp256k1.Point, (scalars) => {
			    const { x, y } = mapSWU(Fpk1.create(scalars[0]));
			    return isoMap(x, y);
			}, {
			    DST: 'secp256k1_XMD:SHA-256_SSWU_RO_',
			    encodeDST: 'secp256k1_XMD:SHA-256_SSWU_NU_',
			    p: Fpk1.ORDER,
			    m: 1,
			    k: 128,
			    expand: 'xmd',
			    hash: sha2_js_1.sha256,
			}))();
			/** @deprecated use `import { secp256k1_hasher } from '@noble/curves/secp256k1.js';` */
			exports$1.hashToCurve = (() => exports$1.secp256k1_hasher.hashToCurve)();
			/** @deprecated use `import { secp256k1_hasher } from '@noble/curves/secp256k1.js';` */
			exports$1.encodeToCurve = (() => exports$1.secp256k1_hasher.encodeToCurve)();
			
		} (secp256k1));
		return secp256k1;
	}

	var utils = {};

	var hasRequiredUtils;

	function requireUtils () {
		if (hasRequiredUtils) return utils;
		hasRequiredUtils = 1;
		Object.defineProperty(utils, "__esModule", { value: true });
		utils.isHash = utils.validateObject = utils.memoized = utils.notImplemented = utils.createHmacDrbg = utils.bitMask = utils.bitSet = utils.bitGet = utils.bitLen = utils.aInRange = utils.inRange = utils.asciiToBytes = utils.copyBytes = utils.equalBytes = utils.ensureBytes = utils.numberToVarBytesBE = utils.numberToBytesLE = utils.numberToBytesBE = utils.bytesToNumberLE = utils.bytesToNumberBE = utils.hexToNumber = utils.numberToHexUnpadded = utils.abool = utils.utf8ToBytes = utils.randomBytes = utils.isBytes = utils.hexToBytes = utils.concatBytes = utils.bytesToUtf8 = utils.bytesToHex = utils.anumber = utils.abytes = void 0;
		/**
		 * Deprecated module: moved from curves/abstract/utils.js to curves/utils.js
		 * @module
		 */
		const u = /*@__PURE__*/ requireUtils$1();
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.abytes = u.abytes;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.anumber = u.anumber;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.bytesToHex = u.bytesToHex;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.bytesToUtf8 = u.bytesToUtf8;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.concatBytes = u.concatBytes;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.hexToBytes = u.hexToBytes;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.isBytes = u.isBytes;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.randomBytes = u.randomBytes;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.utf8ToBytes = u.utf8ToBytes;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.abool = u.abool;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.numberToHexUnpadded = u.numberToHexUnpadded;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.hexToNumber = u.hexToNumber;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.bytesToNumberBE = u.bytesToNumberBE;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.bytesToNumberLE = u.bytesToNumberLE;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.numberToBytesBE = u.numberToBytesBE;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.numberToBytesLE = u.numberToBytesLE;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.numberToVarBytesBE = u.numberToVarBytesBE;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.ensureBytes = u.ensureBytes;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.equalBytes = u.equalBytes;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.copyBytes = u.copyBytes;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.asciiToBytes = u.asciiToBytes;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.inRange = u.inRange;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.aInRange = u.aInRange;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.bitLen = u.bitLen;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.bitGet = u.bitGet;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.bitSet = u.bitSet;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.bitMask = u.bitMask;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.createHmacDrbg = u.createHmacDrbg;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.notImplemented = u.notImplemented;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.memoized = u.memoized;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.validateObject = u.validateObject;
		/** @deprecated moved to `@noble/curves/utils.js` */
		utils.isHash = u.isHash;
		
		return utils;
	}

	var hasRequiredDist$1;

	function requireDist$1 () {
		if (hasRequiredDist$1) return dist$1;
		hasRequiredDist$1 = 1;

		var secp256k1 = /*@__PURE__*/ requireSecp256k1();
		var mod = /*@__PURE__*/ requireModular();
		var utils = /*@__PURE__*/ requireUtils();

		function _interopNamespaceDefault(e) {
		  var n = Object.create(null);
		  if (e) {
		    Object.keys(e).forEach(function (k) {
		      if (k !== 'default') {
		        var d = Object.getOwnPropertyDescriptor(e, k);
		        Object.defineProperty(n, k, d.get ? d : {
		          enumerable: true,
		          get: function () { return e[k]; }
		        });
		      }
		    });
		  }
		  n.default = e;
		  return Object.freeze(n);
		}

		var mod__namespace = /*#__PURE__*/_interopNamespaceDefault(mod);
		var utils__namespace = /*#__PURE__*/_interopNamespaceDefault(utils);

		/*
		 * Copyright (c) 2023 Jose-Luis Landabaso
		 * Distributed under the MIT software license.
		 *
		 * This file includes code from the following sources:
		 *  * Paul Miller's @noble/secp256k1 (specifically, the privateAdd,
		 *    privateNegate, pointAddScalar, and pointMultiply functions).
		 *  * Some pieces from tiny-secp256k1
		 *    (https://github.com/bitcoinjs/tiny-secp256k1)
		 *  * It also uses code from BitGo's BitGoJS library
		 *    (https://github.com/BitGo/BitGoJS)
		 *
		 * This package's tests are based on modified versions of tests from
		 * tiny-secp256k1 (https://github.com/bitcoinjs/tiny-secp256k1/tests).
		 */

		const Point = secp256k1.secp256k1.ProjectivePoint;

		const THROW_BAD_PRIVATE = "Expected Private";
		const THROW_BAD_POINT = "Expected Point";
		const THROW_BAD_TWEAK = "Expected Tweak";
		const THROW_BAD_HASH = "Expected Hash";
		const THROW_BAD_SIGNATURE = "Expected Signature";
		const THROW_BAD_EXTRA_DATA = "Expected Extra Data (32 bytes)";
		const THROW_BAD_SCALAR = "Expected Scalar";
		const THROW_BAD_RECOVERY_ID = "Bad Recovery Id";

		const HASH_SIZE = 32;
		const TWEAK_SIZE = 32;
		const BN32_N = new Uint8Array([
		  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
		  254, 186, 174, 220, 230, 175, 72, 160, 59, 191, 210, 94, 140, 208, 54, 65, 65,
		]);
		const EXTRA_DATA_SIZE = 32;
		const BN32_ZERO = new Uint8Array(32);
		const BN32_P_MINUS_N = new Uint8Array([
		  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 69, 81, 35, 25, 80, 183, 95,
		  196, 64, 45, 161, 114, 47, 201, 186, 238,
		]);
		const _1n = BigInt(1);

		function isUint8Array(value) {
		  return value instanceof Uint8Array;
		}

		function cmpBN32(data1, data2) {
		  for (let i = 0; i < 32; ++i) {
		    if (data1[i] !== data2[i]) {
		      return data1[i] < data2[i] ? -1 : 1;
		    }
		  }
		  return 0;
		}

		function isZero(x) {
		  return cmpBN32(x, BN32_ZERO) === 0;
		}

		function isTweak(tweak) {
		  if (
		    !(tweak instanceof Uint8Array) ||
		    tweak.length !== TWEAK_SIZE ||
		    cmpBN32(tweak, BN32_N) >= 0
		  ) {
		    return false;
		  }
		  return true;
		}

		function isSignature(signature) {
		  return (
		    signature instanceof Uint8Array &&
		    signature.length === 64 &&
		    cmpBN32(signature.subarray(0, 32), BN32_N) < 0 &&
		    cmpBN32(signature.subarray(32, 64), BN32_N) < 0
		  );
		}

		function isSigrLessThanPMinusN(signature) {
		  return (
		    isUint8Array(signature) &&
		    signature.length === 64 &&
		    cmpBN32(signature.subarray(0, 32), BN32_P_MINUS_N) < 0
		  );
		}

		function isSignatureNonzeroRS(signature) {
		  return !(
		    isZero(signature.subarray(0, 32)) || isZero(signature.subarray(32, 64))
		  );
		}

		function isHash(h) {
		  return h instanceof Uint8Array && h.length === HASH_SIZE;
		}

		function isExtraData(e) {
		  return (
		    e === undefined || (e instanceof Uint8Array && e.length === EXTRA_DATA_SIZE)
		  );
		}

		function normalizeScalar(scalar) {
		  let num;
		  if (typeof scalar === "bigint") {
		    num = scalar;
		  } else if (
		    typeof scalar === "number" &&
		    Number.isSafeInteger(scalar) &&
		    scalar >= 0
		  ) {
		    num = BigInt(scalar);
		  } else if (typeof scalar === "string") {
		    if (scalar.length !== 64)
		      throw new Error("Expected 32 bytes of private scalar");
		    num = utils__namespace.hexToNumber(scalar);
		  } else if (scalar instanceof Uint8Array) {
		    if (scalar.length !== 32)
		      throw new Error("Expected 32 bytes of private scalar");
		    num = utils__namespace.bytesToNumberBE(scalar);
		  } else {
		    throw new TypeError("Expected valid private scalar");
		  }
		  if (num < 0) throw new Error("Expected private scalar >= 0");
		  return num;
		}

		function normalizePrivateKey(privateKey) {
		  return secp256k1.secp256k1.utils.normPrivateKeyToScalar(privateKey);
		}

		function _privateAdd(privateKey, tweak) {
		  const p = normalizePrivateKey(privateKey);
		  const t = normalizeScalar(tweak);
		  const add = utils__namespace.numberToBytesBE(mod__namespace.mod(p + t, secp256k1.secp256k1.CURVE.n), 32);
		  return secp256k1.secp256k1.utils.isValidPrivateKey(add) ? add : null;
		}

		function _privateSub(privateKey, tweak) {
		  const p = normalizePrivateKey(privateKey);
		  const t = normalizeScalar(tweak);
		  const sub = utils__namespace.numberToBytesBE(mod__namespace.mod(p - t, secp256k1.secp256k1.CURVE.n), 32);
		  return secp256k1.secp256k1.utils.isValidPrivateKey(sub) ? sub : null;
		}

		function _privateNegate(privateKey) {
		  const p = normalizePrivateKey(privateKey);
		  const not = utils__namespace.numberToBytesBE(secp256k1.secp256k1.CURVE.n - p, 32);
		  return secp256k1.secp256k1.utils.isValidPrivateKey(not) ? not : null;
		}

		function _pointAddScalar(p, tweak, isCompressed) {
		  const P = fromHex(p);
		  const t = normalizeScalar(tweak);
		  // multiplyAndAddUnsafe(P, scalar, 1) = P + scalar*G
		  const Q = Point.BASE.multiplyAndAddUnsafe(P, t, _1n);
		  if (!Q) throw new Error("Tweaked point at infinity");
		  return Q.toRawBytes(isCompressed);
		}

		function _pointMultiply(p, tweak, isCompressed) {
		  const P = fromHex(p);
		  const h = typeof tweak === "string" ? tweak : utils__namespace.bytesToHex(tweak);
		  const t = utils__namespace.hexToNumber(h);
		  return P.multiply(t).toRawBytes(isCompressed);
		}

		function assumeCompression(compressed, p) {
		  if (compressed === undefined) {
		    return p !== undefined ? isPointCompressed(p) : true;
		  }
		  return !!compressed;
		}

		function throwToNull(fn) {
		  try {
		    return fn();
		  } catch (e) {
		    return null;
		  }
		}

		function fromXOnly(bytes) {
		  return secp256k1.schnorr.utils.lift_x(utils__namespace.bytesToNumberBE(bytes));
		}

		function fromHex(bytes) {
		  return bytes.length === 32 ? fromXOnly(bytes) : Point.fromHex(bytes);
		}

		function _isPoint(p, xOnly) {
		  if ((p.length === 32) !== xOnly) return false;
		  try {
		    if (xOnly) return !!fromXOnly(p);
		    else return !!Point.fromHex(p);
		  } catch (e) {
		    return false;
		  }
		}

		function isPoint(p) {
		  return _isPoint(p, false);
		}

		function isPointCompressed(p) {
		  const PUBLIC_KEY_COMPRESSED_SIZE = 33;
		  return _isPoint(p, false) && p.length === PUBLIC_KEY_COMPRESSED_SIZE;
		}

		function isPrivate(d) {
		  return secp256k1.secp256k1.utils.isValidPrivateKey(d);
		}

		function isXOnlyPoint(p) {
		  return _isPoint(p, true);
		}

		function xOnlyPointAddTweak(p, tweak) {
		  if (!isXOnlyPoint(p)) {
		    throw new Error(THROW_BAD_POINT);
		  }
		  if (!isTweak(tweak)) {
		    throw new Error(THROW_BAD_TWEAK);
		  }
		  return throwToNull(() => {
		    const P = _pointAddScalar(p, tweak, true);
		    const parity = P[0] % 2 === 1 ? 1 : 0;
		    return { parity, xOnlyPubkey: P.slice(1) };
		  });
		}

		function xOnlyPointFromPoint(p) {
		  if (!isPoint(p)) {
		    throw new Error(THROW_BAD_POINT);
		  }
		  return p.slice(1, 33);
		}

		function pointFromScalar(sk, compressed) {
		  if (!isPrivate(sk)) {
		    throw new Error(THROW_BAD_PRIVATE);
		  }
		  return throwToNull(() =>
		    secp256k1.secp256k1.getPublicKey(sk, assumeCompression(compressed)),
		  );
		}

		function xOnlyPointFromScalar(d) {
		  if (!isPrivate(d)) {
		    throw new Error(THROW_BAD_PRIVATE);
		  }
		  return xOnlyPointFromPoint(pointFromScalar(d));
		}

		function pointCompress(p, compressed) {
		  if (!isPoint(p)) {
		    throw new Error(THROW_BAD_POINT);
		  }
		  return fromHex(p).toRawBytes(assumeCompression(compressed, p));
		}

		function pointMultiply(a, tweak, compressed) {
		  if (!isPoint(a)) {
		    throw new Error(THROW_BAD_POINT);
		  }
		  if (!isTweak(tweak)) {
		    throw new Error(THROW_BAD_TWEAK);
		  }
		  return throwToNull(() =>
		    _pointMultiply(a, tweak, assumeCompression(compressed, a)),
		  );
		}

		function pointAdd(a, b, compressed) {
		  if (!isPoint(a) || !isPoint(b)) {
		    throw new Error(THROW_BAD_POINT);
		  }
		  return throwToNull(() => {
		    const A = fromHex(a);
		    const B = fromHex(b);
		    if (A.equals(B.negate())) {
		      return null;
		    } else {
		      return A.add(B).toRawBytes(assumeCompression(compressed, a));
		    }
		  });
		}

		function pointAddScalar(p, tweak, compressed) {
		  if (!isPoint(p)) {
		    throw new Error(THROW_BAD_POINT);
		  }
		  if (!isTweak(tweak)) {
		    throw new Error(THROW_BAD_TWEAK);
		  }
		  return throwToNull(() =>
		    _pointAddScalar(p, tweak, assumeCompression(compressed, p)),
		  );
		}

		function privateAdd(d, tweak) {
		  if (!isPrivate(d)) {
		    throw new Error(THROW_BAD_PRIVATE);
		  }
		  if (!isTweak(tweak)) {
		    throw new Error(THROW_BAD_TWEAK);
		  }
		  return throwToNull(() => _privateAdd(d, tweak));
		}

		function privateSub(d, tweak) {
		  if (!isPrivate(d)) {
		    throw new Error(THROW_BAD_PRIVATE);
		  }
		  if (!isTweak(tweak)) {
		    throw new Error(THROW_BAD_TWEAK);
		  }
		  return throwToNull(() => _privateSub(d, tweak));
		}

		function privateNegate(d) {
		  if (!isPrivate(d)) {
		    throw new Error(THROW_BAD_PRIVATE);
		  }
		  return _privateNegate(d);
		}

		function sign(h, d, e) {
		  if (!isPrivate(d)) {
		    throw new Error(THROW_BAD_PRIVATE);
		  }
		  if (!isHash(h)) {
		    throw new Error(THROW_BAD_SCALAR);
		  }
		  if (!isExtraData(e)) {
		    throw new Error(THROW_BAD_EXTRA_DATA);
		  }
		  return secp256k1.secp256k1.sign(h, d, { extraEntropy: e }).toCompactRawBytes();
		}

		function signRecoverable(h, d, e) {
		  if (!isPrivate(d)) {
		    throw new Error(THROW_BAD_PRIVATE);
		  }
		  if (!isHash(h)) {
		    throw new Error(THROW_BAD_SCALAR);
		  }
		  if (!isExtraData(e)) {
		    throw new Error(THROW_BAD_EXTRA_DATA);
		  }
		  const sig = secp256k1.secp256k1.sign(h, d, { extraEntropy: e });
		  return {
		    signature: sig.toCompactRawBytes(),
		    recoveryId: sig.recovery,
		  };
		}

		function signSchnorr(h, d, e) {
		  if (!isPrivate(d)) {
		    throw new Error(THROW_BAD_PRIVATE);
		  }
		  if (!isHash(h)) {
		    throw new Error(THROW_BAD_SCALAR);
		  }
		  if (!isExtraData(e)) {
		    throw new Error(THROW_BAD_EXTRA_DATA);
		  }
		  return secp256k1.schnorr.sign(h, d, e);
		}

		function recover(h, signature, recoveryId, compressed) {
		  if (!isHash(h)) {
		    throw new Error(THROW_BAD_HASH);
		  }

		  if (!isSignature(signature) || !isSignatureNonzeroRS(signature)) {
		    throw new Error(THROW_BAD_SIGNATURE);
		  }

		  if (recoveryId & 2) {
		    if (!isSigrLessThanPMinusN(signature))
		      throw new Error(THROW_BAD_RECOVERY_ID);
		  }
		  if (!isXOnlyPoint(signature.subarray(0, 32))) {
		    throw new Error(THROW_BAD_SIGNATURE);
		  }

		  const s =
		    secp256k1.secp256k1.Signature.fromCompact(signature).addRecoveryBit(recoveryId);
		  const Q = s.recoverPublicKey(h);
		  if (!Q) throw new Error(THROW_BAD_SIGNATURE);
		  return Q.toRawBytes(assumeCompression(compressed));
		}

		function verify(h, Q, signature, strict) {
		  if (!isPoint(Q)) {
		    throw new Error(THROW_BAD_POINT);
		  }
		  if (!isSignature(signature)) {
		    throw new Error(THROW_BAD_SIGNATURE);
		  }
		  if (!isHash(h)) {
		    throw new Error(THROW_BAD_SCALAR);
		  }
		  return secp256k1.secp256k1.verify(signature, h, Q, { lowS: strict });
		}

		function verifySchnorr(h, Q, signature) {
		  if (!isXOnlyPoint(Q)) {
		    throw new Error(THROW_BAD_POINT);
		  }
		  if (!isSignature(signature)) {
		    throw new Error(THROW_BAD_SIGNATURE);
		  }
		  if (!isHash(h)) {
		    throw new Error(THROW_BAD_SCALAR);
		  }
		  return secp256k1.schnorr.verify(signature, h, Q);
		}

		dist$1.isPoint = isPoint;
		dist$1.isPointCompressed = isPointCompressed;
		dist$1.isPrivate = isPrivate;
		dist$1.isXOnlyPoint = isXOnlyPoint;
		dist$1.pointAdd = pointAdd;
		dist$1.pointAddScalar = pointAddScalar;
		dist$1.pointCompress = pointCompress;
		dist$1.pointFromScalar = pointFromScalar;
		dist$1.pointMultiply = pointMultiply;
		dist$1.privateAdd = privateAdd;
		dist$1.privateNegate = privateNegate;
		dist$1.privateSub = privateSub;
		dist$1.recover = recover;
		dist$1.sign = sign;
		dist$1.signRecoverable = signRecoverable;
		dist$1.signSchnorr = signSchnorr;
		dist$1.verify = verify;
		dist$1.verifySchnorr = verifySchnorr;
		dist$1.xOnlyPointAddTweak = xOnlyPointAddTweak;
		dist$1.xOnlyPointFromPoint = xOnlyPointFromPoint;
		dist$1.xOnlyPointFromScalar = xOnlyPointFromScalar;
		return dist$1;
	}

	var distExports = requireDist$1();
	var index = /*@__PURE__*/getDefaultExportFromCjs(distExports);

	var ecc = /*#__PURE__*/_mergeNamespaces({
		__proto__: null,
		default: index
	}, [distExports]);

	/**
	 * Utilities for hex, bytes, CSPRNG.
	 * @module
	 */
	/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	/** Checks if something is Uint8Array. Be careful: nodejs Buffer will return true. */
	function isBytes(a) {
	    return a instanceof Uint8Array || (ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array');
	}
	/** Asserts something is positive integer. */
	function anumber(n, title = '') {
	    if (!Number.isSafeInteger(n) || n < 0) {
	        const prefix = title && `"${title}" `;
	        throw new Error(`${prefix}expected integer >= 0, got ${n}`);
	    }
	}
	/** Asserts something is Uint8Array. */
	function abytes(value, length, title = '') {
	    const bytes = isBytes(value);
	    const len = value?.length;
	    const needsLen = length !== undefined;
	    if (!bytes || (needsLen && len !== length)) {
	        const prefix = title && `"${title}" `;
	        const ofLen = needsLen ? ` of length ${length}` : '';
	        const got = bytes ? `length=${len}` : `type=${typeof value}`;
	        throw new Error(prefix + 'expected Uint8Array' + ofLen + ', got ' + got);
	    }
	    return value;
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
	    abytes(out, undefined, 'digestInto() output');
	    const min = instance.outputLen;
	    if (out.length < min) {
	        throw new Error('"digestInto() output" expected to be of length >=' + min);
	    }
	}
	/** Cast u8 / u16 / u32 to u32. */
	function u32(arr) {
	    return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
	}
	/** Zeroize a byte array. Warning: JS provides no guarantees. */
	function clean(...arrays) {
	    for (let i = 0; i < arrays.length; i++) {
	        arrays[i].fill(0);
	    }
	}
	/** Is current platform little-endian? Most are. Big-Endian platform: IBM */
	const isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44)();
	/** The byte swap operation for uint32 */
	function byteSwap(word) {
	    return (((word << 24) & 0xff000000) |
	        ((word << 8) & 0xff0000) |
	        ((word >>> 8) & 0xff00) |
	        ((word >>> 24) & 0xff));
	}
	/** In place byte swap for Uint32Array */
	function byteSwap32(arr) {
	    for (let i = 0; i < arr.length; i++) {
	        arr[i] = byteSwap(arr[i]);
	    }
	    return arr;
	}
	const swap32IfBE = isLE
	    ? (u) => u
	    : byteSwap32;
	/** Copies several Uint8Arrays into one. */
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
	/** Creates function with outputLen, blockLen, create properties from a class constructor. */
	function createHasher(hashCons, info = {}) {
	    const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
	    const tmp = hashCons(undefined);
	    hashC.outputLen = tmp.outputLen;
	    hashC.blockLen = tmp.blockLen;
	    hashC.create = (opts) => hashCons(opts);
	    Object.assign(hashC, info);
	    return Object.freeze(hashC);
	}
	/** Cryptographically secure PRNG. Uses internal OS-level `crypto.getRandomValues`. */
	function randomBytes$1(bytesLength = 32) {
	    const cr = typeof globalThis === 'object' ? globalThis.crypto : null;
	    if (typeof cr?.getRandomValues !== 'function')
	        throw new Error('crypto.getRandomValues must be defined');
	    return cr.getRandomValues(new Uint8Array(bytesLength));
	}
	/** Creates OID opts for NIST hashes, with prefix 06 09 60 86 48 01 65 03 04 02. */
	const oidNist = (suffix) => ({
	    oid: Uint8Array.from([0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, suffix]),
	});

	/**
	 * Hex, bytes and number utilities.
	 * @module
	 */
	/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	function abool(value, title = '') {
	    if (typeof value !== 'boolean') {
	        const prefix = title && `"${title}" `;
	        throw new Error(prefix + 'expected boolean, got type=' + typeof value);
	    }
	    return value;
	}

	/**
	 * Internal helpers for u64. BigUint64Array is too slow as per 2025, so we implement it using Uint32Array.
	 * @todo re-check https://issues.chromium.org/issues/42212588
	 * @module
	 */
	const U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
	const _32n = /* @__PURE__ */ BigInt(32);
	function fromBig(n, le = false) {
	    if (le)
	        return { h: Number(n & U32_MASK64), l: Number((n >> _32n) & U32_MASK64) };
	    return { h: Number((n >> _32n) & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
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
	// Left rotate for Shift in [1, 32)
	const rotlSH = (h, l, s) => (h << s) | (l >>> (32 - s));
	const rotlSL = (h, l, s) => (l << s) | (h >>> (32 - s));
	// Left rotate for Shift in (32, 64), NOTE: 32 is special case.
	const rotlBH = (h, l, s) => (l << (s - 32)) | (h >>> (64 - s));
	const rotlBL = (h, l, s) => (h << (s - 32)) | (l >>> (64 - s));

	/**
	 * SHA3 (keccak) hash function, based on a new "Sponge function" design.
	 * Different from older hashes, the internal state is bigger than output size.
	 *
	 * Check out [FIPS-202](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.202.pdf),
	 * [Website](https://keccak.team/keccak.html),
	 * [the differences between SHA-3 and Keccak](https://crypto.stackexchange.com/questions/15727/what-are-the-key-differences-between-the-draft-sha-3-standard-and-the-keccak-sub).
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
	const SHA3_IOTA_H = IOTAS[0];
	const SHA3_IOTA_L = IOTAS[1];
	// Left rotation (without 0, 32, 64)
	const rotlH = (h, l, s) => (s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s));
	const rotlL = (h, l, s) => (s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s));
	/** `keccakf1600` internal function, additionally allows to adjust round count. */
	function keccakP(s, rounds = 24) {
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
	        for (let y = 0; y < 50; y += 10) {
	            for (let x = 0; x < 10; x++)
	                B[x] = s[y + x];
	            for (let x = 0; x < 10; x++)
	                s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
	        }
	        // Iota (ι)
	        s[0] ^= SHA3_IOTA_H[round];
	        s[1] ^= SHA3_IOTA_L[round];
	    }
	    clean(B);
	}
	/** Keccak sponge function. */
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
	    enableXOF = false;
	    rounds;
	    // NOTE: we accept arguments in bytes instead of bits here.
	    constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
	        this.blockLen = blockLen;
	        this.suffix = suffix;
	        this.outputLen = outputLen;
	        this.enableXOF = enableXOF;
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
	        // Do the padding
	        state[pos] ^= suffix;
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
	        // Sha3/Keccak usage with XOF is probably mistake, only SHAKE instances can do XOF
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
	        this.writeInto(out);
	        this.destroy();
	        return out;
	    }
	    digest() {
	        return this.digestInto(new Uint8Array(this.outputLen));
	    }
	    destroy() {
	        this.destroyed = true;
	        clean(this.state);
	    }
	    _cloneInto(to) {
	        const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
	        to ||= new Keccak(blockLen, suffix, outputLen, enableXOF, rounds);
	        to.state32.set(this.state32);
	        to.pos = this.pos;
	        to.posOut = this.posOut;
	        to.finished = this.finished;
	        to.rounds = rounds;
	        // Suffix can change in cSHAKE
	        to.suffix = suffix;
	        to.outputLen = outputLen;
	        to.enableXOF = enableXOF;
	        to.destroyed = this.destroyed;
	        return to;
	    }
	}
	const genShake = (suffix, blockLen, outputLen, info = {}) => createHasher((opts = {}) => new Keccak(blockLen, suffix, opts.dkLen === undefined ? outputLen : opts.dkLen, true), info);
	/** SHAKE128 XOF with 128-bit security. */
	const shake128 = 
	/* @__PURE__ */
	genShake(0x1f, 168, 16, /* @__PURE__ */ oidNist(0x0b));
	/** SHAKE256 XOF with 256-bit security. */
	const shake256 = 
	/* @__PURE__ */
	genShake(0x1f, 136, 32, /* @__PURE__ */ oidNist(0x0c));

	function checkU32(n) {
	    // 0xff_ff_ff_ff
	    if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff)
	        throw new Error('wrong u32 integer:' + n);
	    return n;
	}
	/** Checks if integer is in form of `1 << X` */
	function isPowerOfTwo(x) {
	    checkU32(x);
	    return (x & (x - 1)) === 0 && x !== 0;
	}
	function reverseBits(n, bits) {
	    checkU32(n);
	    let reversed = 0;
	    for (let i = 0; i < bits; i++, n >>>= 1)
	        reversed = (reversed << 1) | (n & 1);
	    return reversed;
	}
	/** Similar to `bitLen(x)-1` but much faster for small integers, like indices */
	function log2(n) {
	    checkU32(n);
	    return 31 - Math.clz32(n);
	}
	/**
	 * Moves lowest bit to highest position, which at first step splits
	 * array on even and odd indices, then it applied again to each part,
	 * which is core of fft
	 */
	function bitReversalInplace(values) {
	    const n = values.length;
	    if (n < 2 || !isPowerOfTwo(n))
	        throw new Error('n must be a power of 2 and greater than 1. Got ' + n);
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
	 * - DIT (Decimation-in-Time): Bottom-Up (leaves -> root), Cool-Turkey
	 * - DIF (Decimation-in-Frequency): Top-Down (root -> leaves), Gentleman–Sande
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
	 */
	const FFTCore = (F, coreOpts) => {
	    const { N, roots, dit, invertButterflies = false, skipStages = 0, brp = true } = coreOpts;
	    const bits = log2(N);
	    if (!isPowerOfTwo(N))
	        throw new Error('FFT: Polynomial size should be power of two');
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
	    const getLength = (c) => (typeof c === 'number' ? c : c.bytesLen);
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
	    const bytesLen = vecLen * c.bytesLen;
	    return {
	        bytesLen,
	        encode: (u) => {
	            if (u.length !== vecLen)
	                throw new RangeError(`vecCoder.encode: wrong length=${u.length}. Expected: ${vecLen}`);
	            const res = new Uint8Array(bytesLen);
	            for (let i = 0, pos = 0; i < u.length; i++) {
	                const b = c.encode(u[i]);
	                res.set(b, pos);
	                b.fill(0); // clean
	                pos += b.length;
	            }
	            return res;
	        },
	        decode: (a) => {
	            abytes(a, bytesLen);
	            const r = [];
	            for (let i = 0; i < a.length; i += c.bytesLen)
	                r.push(c.decode(a.subarray(i, i + c.bytesLen)));
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
	            encode: (poly) => {
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
	    return { mod, smod, nttZetas, NTT, bitsCoder };
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
	const PARAMS = /* @__PURE__ */ (() => ({
	    2: { K: 4, L: 4, D, GAMMA1: 2 ** 17, GAMMA2: GAMMA2_1, TAU: 39, ETA: 2, OMEGA: 80 },
	    3: { K: 6, L: 5, D, GAMMA1: 2 ** 19, GAMMA2: GAMMA2_2, TAU: 49, ETA: 4, OMEGA: 55 },
	    5: { K: 8, L: 7, D, GAMMA1: 2 ** 19, GAMMA2: GAMMA2_2, TAU: 60, ETA: 2, OMEGA: 75 },
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
	const polyAdd = (a, b) => {
	    for (let i = 0; i < a.length; i++)
	        a[i] = crystals.mod(a[i] + b[i]);
	    return a;
	};
	// Mutates `a` in place; callers must pass same-length polynomials.
	const polySub = (a, b) => {
	    for (let i = 0; i < a.length; i++)
	        a[i] = crystals.mod(a[i] - b[i]);
	    return a;
	};
	// Mutates `p` in place and assumes it is a decoded `t1`-range polynomial.
	const polyShiftl = (p) => {
	    for (let i = 0; i < N; i++)
	        p[i] <<= D;
	    return p;
	};
	const polyChknorm = (p, B) => {
	    // FIPS 204 Algorithms 7 and 8 express the same centered-norm check with explicit inequalities.
	    for (let i = 0; i < N; i++)
	        if (Math.abs(crystals.smod(p[i])) >= B)
	            return true;
	    return false;
	};
	// Both inputs must already be in NTT / `T_q` form.
	const MultiplyNTTs = (a, b) => {
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
	function RejNTTPoly(xof) {
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
	function getDilithium(opts) {
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
	        encode: (h) => {
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
	    function RejBoundedPoly(xof) {
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
	    const polyPowerRound = (p) => {
	        const res0 = newPoly(N);
	        const res1 = newPoly(N);
	        for (let i = 0; i < p.length; i++) {
	            const { r0, r1 } = Power2Round(p[i]);
	            res0[i] = r0;
	            res1[i] = r1;
	        }
	        return { r0: res0, r1: res1 };
	    };
	    const polyUseHint = (u, h) => {
	        // In-place on `u`: verification only needs the recovered high bits, so reuse the
	        // temporary `wApprox` buffer instead of allocating another polynomial.
	        for (let i = 0; i < N; i++)
	            u[i] = UseHint(h[i], u[i]);
	        return u;
	    };
	    const polyMakeHint = (a, b) => {
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
	    const internal = {
	        info: { type: 'internal-ml-dsa' },
	        lengths: {
	            secretKey: secretCoder.bytesLen,
	            publicKey: publicCoder.bytesLen,
	            seed: 32,
	            signature: sigCoder.bytesLen,
	            signRand: signRandBytes,
	        },
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
	            return { publicKey, secretKey };
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
	    };
	    return {
	        info: { type: 'ml-dsa' },
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
	            return {
	                info: { type: 'hashml-dsa' },
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
	            };
	        },
	    };
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

	/**
	 * Minimal byte helpers. A subset of what `neurai-create-transaction` exposes,
	 * duplicated here to keep this package free of runtime coupling beyond its
	 * declared `dependencies` field. All sizes are little-endian, per Neurai.
	 */
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
	function bytesEqual(a, b) {
	    if (a.length !== b.length)
	        return false;
	    for (let i = 0; i < a.length; i += 1) {
	        if (a[i] !== b[i])
	            return false;
	    }
	    return true;
	}

	/**
	 * Opcode constants for Neurai Script.
	 *
	 * Covers:
	 *  - Classic Script opcodes used by covenants.
	 *  - New opcodes activated in the `DePIN-Test` branch (BIP 119, BIP 347 and
	 *    Neurai-specific introspection / asset / arithmetic additions).
	 *
	 * Authority: `src/script/script.h` (enum `opcodetype`) in the Neurai repo.
	 * Reference: `doc/new-opcodes-depin-branch.md`.
	 *
	 * Disabled in consensus and intentionally omitted: OP_SUBSTR, OP_LEFT,
	 * OP_RIGHT, OP_INVERT, OP_AND, OP_OR, OP_XOR, OP_2MUL, OP_2DIV, OP_LSHIFT,
	 * OP_RSHIFT. Also omitted: OP_VER / OP_VERIF / OP_VERNOTIF (reserved), the
	 * template-matching pseudo-opcodes (OP_SMALLINTEGER, OP_PUBKEYS,
	 * OP_PUBKEYHASH, OP_PUBKEY) and OP_INVALIDOPCODE.
	 */
	// ---------- Push values ----------
	const OP_0 = 0x00;
	const OP_1 = 0x51;
	const OP_2 = 0x52;
	const OP_3 = 0x53;
	const OP_IF = 0x63;
	const OP_ELSE = 0x67;
	const OP_ENDIF = 0x68;
	const OP_VERIFY = 0x69;
	const OP_DROP = 0x75;
	const OP_DUP = 0x76;
	const OP_OVER = 0x78;
	const OP_SWAP = 0x7c;
	const OP_EQUALVERIFY = 0x88;
	const OP_SUB = 0x94;
	const OP_MUL = 0x95;
	const OP_GREATERTHANOREQUAL = 0xa2;
	const OP_SHA256 = 0xa8;
	const OP_HASH160 = 0xa9;
	const OP_CHECKSIG = 0xac;
	const OP_CHECKSIGFROMSTACK = 0xb4;
	// ---------- Transaction introspection (DePIN-Test) ----------
	const OP_TXHASH = 0xb5;
	const OP_TXFIELD = 0xb6;
	const OP_OUTPUTVALUE = 0xcc;
	const OP_OUTPUTSCRIPT = 0xcd;
	// ---------- Asset introspection (DePIN-Test) ----------
	const OP_OUTPUTASSETFIELD = 0xce;
	const OP_INPUTASSETFIELD = 0xcf;

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
	base(ALPHABET);

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

	requireDist();

	/**
	 * Asset-transfer wrapper split helper.
	 *
	 * Neurai asset UTXOs have a scriptPubKey of the form
	 *
	 *     <prefix scriptPubKey bytes> OP_XNA_ASSET <pushdata(payload)> OP_DROP
	 *
	 * where `prefix` is the recipient's standard script (typically a P2PKH, an
	 * AuthScript witness v1, or a bare covenant such as the partial-fill sell
	 * order), and `payload` serializes a `CAssetTransfer`:
	 *
	 *     payload = rvn_prefix (0x72 0x76 0x6e) || type_marker (0x74 transfer)
	 *             || VarStr(assetName)
	 *             || int64LE(amountRaw)
	 *             [ || messageRef (optional) || int64LE(expireTime) (optional) ]
	 *
	 * This helper separates the two halves so consumers can validate the prefix
	 * (e.g. feed it to `parsePartialFillScript`) while independently reading the
	 * asset data displayed to the user. The optional payload tail
	 * (`message` + `expireTime`) is tolerated but not exposed — the first
	 * version only needs `assetName` and `amountRaw`.
	 *
	 * Bare (non-wrapped) scriptPubKeys round-trip through this helper by
	 * returning `prefixHex === input` and `assetTransfer === null`.
	 */
	Uint8Array.from([0x72, 0x76, 0x6e]); // "rvn"

	/**
	 * Shared parsing primitives for strict covenant parsers. Each covenant
	 * parser walks the exact byte layout emitted by its builder and fails on
	 * any deviation; the primitives here centralize the cursor arithmetic,
	 * pushdata decoding, and CScriptNum decoding so the legacy and PQ parsers
	 * (and future covenant parsers) cannot drift in rigor.
	 */
	function makeCursor(bytes) {
	    return { bytes, pos: 0 };
	}
	/** Consume one byte and verify it equals `expected`. */
	function expectByte(c, expected, label) {
	    if (c.pos >= c.bytes.length) {
	        throw new Error(`parse: unexpected end of script while reading ${label}`);
	    }
	    const got = c.bytes[c.pos];
	    if (got !== expected) {
	        throw new Error(`parse: expected ${label} = 0x${expected.toString(16)} at offset ${c.pos}, got 0x${got.toString(16)}`);
	    }
	    c.pos += 1;
	}
	/** Fail if the cursor has not consumed every byte of the script. */
	function assertTrailing(c) {
	    if (c.pos !== c.bytes.length) {
	        throw new Error(`parse: ${c.bytes.length - c.pos} trailing bytes after end of script`);
	    }
	}
	/**
	 * Read one pushdata element from the cursor. Supports direct pushes
	 * (1..75 bytes), `OP_PUSHDATA1` and `OP_PUSHDATA2`. `OP_PUSHDATA4` is not
	 * supported by any current covenant script and would overflow the
	 * per-element cap anyway. Truncation is checked for all length fields
	 * and payload ranges.
	 */
	function readPush(c, label) {
	    if (c.pos >= c.bytes.length) {
	        throw new Error(`parse: unexpected end of script while reading push for ${label}`);
	    }
	    const opcode = c.bytes[c.pos];
	    c.pos += 1;
	    // Short direct push: 1..75 bytes
	    if (opcode >= 0x01 && opcode <= 0x4b) {
	        const len = opcode;
	        if (c.pos + len > c.bytes.length) {
	            throw new Error(`parse: short push of ${len} bytes exceeds script length at ${label}`);
	        }
	        const data = c.bytes.slice(c.pos, c.pos + len);
	        c.pos += len;
	        return data;
	    }
	    // OP_PUSHDATA1
	    if (opcode === 0x4c) {
	        if (c.pos >= c.bytes.length) {
	            throw new Error(`parse: truncated PUSHDATA1 length at ${label}`);
	        }
	        const len = c.bytes[c.pos];
	        c.pos += 1;
	        if (c.pos + len > c.bytes.length) {
	            throw new Error(`parse: PUSHDATA1 of ${len} bytes exceeds script length at ${label}`);
	        }
	        const data = c.bytes.slice(c.pos, c.pos + len);
	        c.pos += len;
	        return data;
	    }
	    // OP_PUSHDATA2
	    if (opcode === 0x4d) {
	        if (c.pos + 2 > c.bytes.length) {
	            throw new Error(`parse: truncated PUSHDATA2 length at ${label}`);
	        }
	        const len = c.bytes[c.pos] | (c.bytes[c.pos + 1] << 8);
	        c.pos += 2;
	        if (c.pos + len > c.bytes.length) {
	            throw new Error(`parse: PUSHDATA2 of ${len} bytes exceeds script length at ${label}`);
	        }
	        const data = c.bytes.slice(c.pos, c.pos + len);
	        c.pos += len;
	        return data;
	    }
	    throw new Error(`parse: expected a pushdata opcode at ${label}, got 0x${opcode.toString(16)} at offset ${c.pos - 1}`);
	}
	/**
	 * Decode a `CScriptNum` byte vector (little-endian sign-magnitude, up to
	 * 8 bytes) into a BigInt. Empty vector encodes 0.
	 */
	function decodeScriptNum(data, label) {
	    if (data.length === 0)
	        return 0n;
	    if (data.length > 8) {
	        throw new Error(`parse: CScriptNum at ${label} exceeds 8 bytes`);
	    }
	    let n = 0n;
	    for (let i = 0; i < data.length - 1; i += 1) {
	        n |= BigInt(data[i]) << BigInt(8 * i);
	    }
	    const last = data[data.length - 1];
	    n |= BigInt(last & 0x7f) << BigInt(8 * (data.length - 1));
	    if (last & 0x80) {
	        n = -n;
	    }
	    return n;
	}
	/**
	 * Read a push as a non-negative CScriptNum. Recognises OP_1..OP_16
	 * shorthand. `OP_0` is not accepted because the covenant callers use this
	 * only for values that are strictly positive (prices, selectors, indices).
	 */
	function readPushPositiveInt(c, label) {
	    if (c.pos >= c.bytes.length) {
	        throw new Error(`parse: end of script at ${label}`);
	    }
	    const opcode = c.bytes[c.pos];
	    if (opcode >= OP_1 && opcode <= 0x60) {
	        c.pos += 1;
	        return BigInt(opcode - OP_1 + 1);
	    }
	    const data = readPush(c, label);
	    return decodeScriptNum(data, label);
	}
	/**
	 * Read a 1-byte selector as an UNSIGNED 8-bit integer (0..255). Accepts
	 * two on-wire encodings, because old vs new covenant builders differ:
	 *   - `OP_1..OP_16` shorthand (single opcode) → values 1..16.
	 *   - `0x01 <byte>` raw 1-byte push → any value 1..255.
	 *
	 * Values 0x80..0xff MUST use the raw-push form; the CScriptNum encoding
	 * would need a 0x00 padding byte and become 2 bytes on-stack, which
	 * consensus `OP_TXHASH` rejects. The builder in `script-pq.ts` emits the
	 * raw-push form unconditionally; the parser stays lenient so covenants
	 * built by older tools (using OP_N for small values) still round-trip.
	 */
	function readPushUint8(c, label) {
	    if (c.pos >= c.bytes.length) {
	        throw new Error(`parse: end of script at ${label}`);
	    }
	    const opcode = c.bytes[c.pos];
	    if (opcode >= OP_1 && opcode <= 0x60) {
	        c.pos += 1;
	        return opcode - OP_1 + 1;
	    }
	    const data = readPush(c, label);
	    if (data.length !== 1) {
	        throw new Error(`parse: ${label} must be a single-byte push, got ${data.length} bytes`);
	    }
	    return data[0];
	}

	/**
	 * Parser for the Partial-Fill Sell Order covenant.
	 *
	 * Extracts `(sellerPubKeyHash, unitPriceSats, tokenId)` from a scriptPubKey
	 * that was produced by `buildPartialFillScript`. The parser walks the exact
	 * byte layout emitted by the builder and fails on any deviation — this is
	 * deliberate, so a downstream indexer can unambiguously classify a UTXO as
	 * "partial-fill order" or "unknown script" with no false positives.
	 */
	/**
	 * Parse a covenant scriptPubKey and extract its parameters. Throws with a
	 * descriptive message if the bytes don't match the partial-fill template.
	 */
	function parsePartialFillScript(script, network = 'xna-test') {
	    const bytes = typeof script === 'string' ? hexToBytes(script) : script;
	    const c = makeCursor(bytes);
	    // ───── Cancel branch prefix ─────
	    expectByte(c, OP_IF, 'OP_IF');
	    expectByte(c, OP_DUP, 'OP_DUP (cancel)');
	    expectByte(c, OP_HASH160, 'OP_HASH160');
	    const sellerPubKeyHash = readPush(c, 'sellerPubKeyHash');
	    if (sellerPubKeyHash.length !== 20) {
	        throw new Error(`parse: sellerPubKeyHash is ${sellerPubKeyHash.length} bytes, expected 20`);
	    }
	    expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (cancel)');
	    expectByte(c, OP_CHECKSIG, 'OP_CHECKSIG (cancel)');
	    expectByte(c, OP_ELSE, 'OP_ELSE');
	    // ───── Payment value check ─────
	    expectByte(c, OP_DUP, 'OP_DUP (price)');
	    const unitPriceSats = readPushPositiveInt(c, 'unitPriceSats');
	    expectByte(c, OP_MUL, 'OP_MUL');
	    expectByte(c, OP_0, 'OP_0 (payment idx)');
	    expectByte(c, OP_OUTPUTVALUE, 'OP_OUTPUTVALUE');
	    expectByte(c, OP_SWAP, 'OP_SWAP');
	    expectByte(c, OP_GREATERTHANOREQUAL, 'OP_GREATERTHANOREQUAL');
	    expectByte(c, OP_VERIFY, 'OP_VERIFY (payment)');
	    // ───── Payment scriptPubKey check ─────
	    expectByte(c, OP_0, 'OP_0 (spk idx)');
	    expectByte(c, OP_OUTPUTSCRIPT, 'OP_OUTPUTSCRIPT (payment)');
	    const sellerSpk = readPush(c, 'sellerScriptPubKey');
	    // Must be P2PKH with our PKH.
	    const expectedSpk = new Uint8Array([
	        OP_DUP, OP_HASH160, 0x14, ...sellerPubKeyHash, OP_EQUALVERIFY, OP_CHECKSIG
	    ]);
	    if (!bytesEqual(sellerSpk, expectedSpk)) {
	        throw new Error('parse: embedded seller scriptPubKey does not match the cancel PKH');
	    }
	    expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (payment spk)');
	    // ───── Buyer asset amount check (output 1) ─────
	    expectByte(c, OP_DUP, 'OP_DUP (buyer amount)');
	    expectByte(c, OP_1, 'OP_1 (buyer idx)');
	    expectByte(c, OP_2, 'OP_2 (AMOUNT selector)');
	    expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (buyer amount)');
	    expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (buyer amount)');
	    // ───── Buyer asset name check (output 1) ─────
	    expectByte(c, OP_1, 'OP_1 (buyer idx)');
	    expectByte(c, OP_1, 'OP_1 (NAME selector)');
	    expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (buyer name)');
	    const tokenIdBytes1 = readPush(c, 'tokenId #1');
	    expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (buyer name)');
	    // ───── Remainder continuity: same scriptPubKey ─────
	    expectByte(c, OP_2, 'OP_2 (remainder idx)');
	    expectByte(c, OP_OUTPUTSCRIPT, 'OP_OUTPUTSCRIPT (remainder)');
	    expectByte(c, OP_3, 'OP_3 (TXFIELD selector)');
	    expectByte(c, OP_TXFIELD, 'OP_TXFIELD');
	    expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (remainder spk)');
	    // ───── Remainder tokenId check ─────
	    expectByte(c, OP_2, 'OP_2 (remainder idx)');
	    expectByte(c, OP_1, 'OP_1 (NAME selector)');
	    expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (remainder name)');
	    const tokenIdBytes2 = readPush(c, 'tokenId #2');
	    expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (remainder name)');
	    // ───── Remainder amount == input amount - N ─────
	    expectByte(c, OP_2, 'OP_2 (remainder idx)');
	    expectByte(c, OP_2, 'OP_2 (AMOUNT selector)');
	    expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (remainder amount)');
	    expectByte(c, OP_OVER, 'OP_OVER');
	    expectByte(c, OP_0, 'OP_0 (input idx)');
	    expectByte(c, OP_2, 'OP_2 (AMOUNT selector)');
	    expectByte(c, OP_INPUTASSETFIELD, 'OP_INPUTASSETFIELD');
	    expectByte(c, OP_SWAP, 'OP_SWAP');
	    expectByte(c, OP_SUB, 'OP_SUB');
	    expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (remainder amount)');
	    // ───── Tail ─────
	    expectByte(c, OP_DROP, 'OP_DROP');
	    expectByte(c, OP_1, 'OP_1 (true)');
	    expectByte(c, OP_ENDIF, 'OP_ENDIF');
	    assertTrailing(c);
	    if (!bytesEqual(tokenIdBytes1, tokenIdBytes2)) {
	        throw new Error('parse: tokenId bytes differ between buyer and remainder checks');
	    }
	    const tokenId = new TextDecoder('utf-8', { fatal: true }).decode(tokenIdBytes1);
	    return {
	        network,
	        sellerPubKeyHash,
	        unitPriceSats,
	        tokenId,
	        scriptHex: bytesToHex(bytes)
	    };
	}
	/**
	 * Parse a PQ partial-fill covenant. Throws if the bytes do not match the
	 * exact layout produced by `buildPartialFillScriptPQ`.
	 */
	function parsePartialFillScriptPQ(script, network = 'xna-test') {
	    const bytes = typeof script === 'string' ? hexToBytes(script) : script;
	    const c = makeCursor(bytes);
	    // ───── Cancel branch (PQ) ─────
	    expectByte(c, OP_IF, 'OP_IF');
	    expectByte(c, OP_DUP, 'OP_DUP (cancel)');
	    expectByte(c, OP_SHA256, 'OP_SHA256');
	    const pubKeyCommitment = readPush(c, 'pubKeyCommitment');
	    if (pubKeyCommitment.length !== 32) {
	        throw new Error(`parse-pq: pubKeyCommitment must be 32 bytes, got ${pubKeyCommitment.length}`);
	    }
	    expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (cancel)');
	    // Selector is read as an unsigned byte — consensus OP_TXHASH treats the
	    // on-stack element as uint8, and the builder emits a raw 1-byte push so
	    // selectors 0x80..0xff round-trip correctly (plan v3 bug B).
	    const txHashSelector = readPushUint8(c, 'txHashSelector');
	    if (txHashSelector < 1) {
	        throw new Error(`parse-pq: txHashSelector 0x00 is rejected by OP_TXHASH`);
	    }
	    expectByte(c, OP_TXHASH, 'OP_TXHASH');
	    expectByte(c, OP_SWAP, 'OP_SWAP');
	    expectByte(c, OP_CHECKSIGFROMSTACK, 'OP_CHECKSIGFROMSTACK');
	    expectByte(c, OP_ELSE, 'OP_ELSE');
	    // ───── Fill branch ─────
	    expectByte(c, OP_DUP, 'OP_DUP (price)');
	    const unitPriceSats = readPushPositiveInt(c, 'unitPriceSats');
	    expectByte(c, OP_MUL, 'OP_MUL');
	    expectByte(c, OP_0, 'OP_0 (payment idx)');
	    expectByte(c, OP_OUTPUTVALUE, 'OP_OUTPUTVALUE');
	    expectByte(c, OP_SWAP, 'OP_SWAP');
	    expectByte(c, OP_GREATERTHANOREQUAL, 'OP_GE');
	    expectByte(c, OP_VERIFY, 'OP_VERIFY');
	    expectByte(c, OP_0, 'OP_0 (payment spk idx)');
	    expectByte(c, OP_OUTPUTSCRIPT, 'OP_OUTPUTSCRIPT (payment)');
	    const paymentScriptPubKey = readPush(c, 'paymentScriptPubKey');
	    expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (payment)');
	    expectByte(c, OP_DUP, 'OP_DUP (buyer amount)');
	    expectByte(c, OP_1, 'OP_1 (buyer idx)');
	    expectByte(c, OP_2, 'OP_2 (AMOUNT selector)');
	    expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (buyer amount)');
	    expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (buyer amount)');
	    expectByte(c, OP_1, 'OP_1 (buyer idx)');
	    expectByte(c, OP_1, 'OP_1 (NAME selector)');
	    expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (buyer name)');
	    const tokenIdBytes1 = readPush(c, 'tokenId #1');
	    expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (buyer name)');
	    expectByte(c, OP_2, 'OP_2 (remainder idx)');
	    expectByte(c, OP_OUTPUTSCRIPT, 'OP_OUTPUTSCRIPT (remainder)');
	    expectByte(c, OP_3, 'OP_3 (TXFIELD selector)');
	    expectByte(c, OP_TXFIELD, 'OP_TXFIELD');
	    expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (remainder spk)');
	    expectByte(c, OP_2, 'OP_2 (remainder idx)');
	    expectByte(c, OP_1, 'OP_1 (NAME selector)');
	    expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (remainder name)');
	    const tokenIdBytes2 = readPush(c, 'tokenId #2');
	    expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (remainder name)');
	    expectByte(c, OP_2, 'OP_2 (remainder idx)');
	    expectByte(c, OP_2, 'OP_2 (AMOUNT selector)');
	    expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (remainder amount)');
	    expectByte(c, OP_OVER, 'OP_OVER');
	    expectByte(c, OP_0, 'OP_0 (input idx)');
	    expectByte(c, OP_2, 'OP_2 (AMOUNT selector)');
	    expectByte(c, OP_INPUTASSETFIELD, 'OP_INPUTASSETFIELD');
	    expectByte(c, OP_SWAP, 'OP_SWAP');
	    expectByte(c, OP_SUB, 'OP_SUB');
	    expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (remainder amount)');
	    expectByte(c, OP_DROP, 'OP_DROP');
	    expectByte(c, OP_1, 'OP_1 (true)');
	    expectByte(c, OP_ENDIF, 'OP_ENDIF');
	    assertTrailing(c);
	    if (!bytesEqual(tokenIdBytes1, tokenIdBytes2)) {
	        throw new Error('parse-pq: tokenId differs between buyer and remainder checks');
	    }
	    const tokenId = new TextDecoder('utf-8', { fatal: true }).decode(tokenIdBytes1);
	    return {
	        network,
	        pubKeyCommitment,
	        tokenId,
	        unitPriceSats,
	        txHashSelector,
	        paymentScriptPubKey,
	        scriptHex: bytesToHex(bytes)
	    };
	}

	/**
	 * JavaScript mirror of Neurai's `OP_TXHASH(selector)` consensus opcode.
	 *
	 * The algorithm follows the BIP143-style convention used by Bitcoin Core:
	 * the "aggregate" selector bits (`INPUT_PREVOUTS`, `INPUT_SEQUENCES`,
	 * `OUTPUTS`) are materialised as SHA-256d sub-hashes of the concatenated
	 * per-input / per-output fields; the "scalar" bits contribute their raw
	 * little-endian serialisation. The outer `buffer` is then SHA-256d'd to
	 * produce the 32-byte value that the consensus interpreter pushes onto the
	 * stack when `OP_TXHASH` runs.
	 *
	 * Authoritative reference: `blockchain/Neurai/src/script/interpreter.cpp`
	 * (`case OP_TXHASH`). The plan that drives this file — with byte-exact
	 * layout table per bit — is
	 * `lib/plan-frente-b-covenant-cancel-v2.md §3.6`.
	 *
	 * Invariant: the bits are consumed in **ascending numeric order** (0x01,
	 * 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80). Changing the order here —
	 * even for bits that would otherwise commute — produces a different final
	 * digest and therefore an invalid signature.
	 */
	const TXHASH_VERSION = 0x01;
	const TXHASH_LOCKTIME = 0x02;
	const TXHASH_INPUT_PREVOUTS = 0x04;
	const TXHASH_INPUT_SEQUENCES = 0x08;
	const TXHASH_OUTPUTS = 0x10;
	const TXHASH_CURRENT_PREVOUT = 0x20;
	const TXHASH_CURRENT_SEQUENCE = 0x40;
	const TXHASH_CURRENT_INDEX = 0x80;
	function hash256$1(buf) {
	    return bufferExports.Buffer.from(srcExports.crypto.hash256(buf));
	}
	function writeUInt64LE$1(target, value, offset) {
	    const normalized = BigInt.asUintN(64, value);
	    target.writeUInt32LE(Number(normalized & 0xffffffffn), offset);
	    target.writeUInt32LE(Number((normalized >> 32n) & 0xffffffffn), offset + 4);
	}
	function encodeVarInt$1(value) {
	    if (!Number.isSafeInteger(value) || value < 0) {
	        throw new Error(`Invalid varint value: ${value}`);
	    }
	    if (value < 0xfd)
	        return bufferExports.Buffer.from([value]);
	    if (value <= 0xffff) {
	        const out = bufferExports.Buffer.alloc(3);
	        out[0] = 0xfd;
	        out.writeUInt16LE(value, 1);
	        return out;
	    }
	    if (value <= 0xffffffff) {
	        const out = bufferExports.Buffer.alloc(5);
	        out[0] = 0xfe;
	        out.writeUInt32LE(value, 1);
	        return out;
	    }
	    const out = bufferExports.Buffer.alloc(9);
	    out[0] = 0xff;
	    writeUInt64LE$1(out, BigInt(value), 1);
	    return out;
	}
	function encodeVarSlice$1(buffer) {
	    return bufferExports.Buffer.concat([encodeVarInt$1(buffer.length), buffer]);
	}
	function outpoint(input) {
	    const idx = bufferExports.Buffer.alloc(4);
	    idx.writeUInt32LE(input.index, 0);
	    return bufferExports.Buffer.concat([bufferExports.Buffer.from(input.hash), idx]);
	}
	function sequenceBytes(input) {
	    const seq = bufferExports.Buffer.alloc(4);
	    seq.writeUInt32LE(input.sequence, 0);
	    return seq;
	}
	function outputBytes(output) {
	    const value = bufferExports.Buffer.alloc(8);
	    writeUInt64LE$1(value, BigInt(output.value), 0);
	    return bufferExports.Buffer.concat([value, encodeVarSlice$1(output.script)]);
	}
	function versionBytes(tx) {
	    const b = bufferExports.Buffer.alloc(4);
	    b.writeInt32LE(tx.version, 0);
	    return b;
	}
	function locktimeBytes(tx) {
	    const b = bufferExports.Buffer.alloc(4);
	    b.writeUInt32LE(tx.locktime, 0);
	    return b;
	}
	function uint32LE(value) {
	    const b = bufferExports.Buffer.alloc(4);
	    b.writeUInt32LE(value, 0);
	    return b;
	}
	/**
	 * Contribution of a single set bit to the outer hash buffer. Each handler
	 * returns the bytes that the consensus interpreter concatenates into the
	 * preimage at this bit's position.
	 */
	function contributionFor(tx, bit, inIndex) {
	    switch (bit) {
	        case TXHASH_VERSION:
	            return versionBytes(tx);
	        case TXHASH_LOCKTIME:
	            return locktimeBytes(tx);
	        case TXHASH_INPUT_PREVOUTS:
	            return hash256$1(bufferExports.Buffer.concat(tx.ins.map(outpoint)));
	        case TXHASH_INPUT_SEQUENCES:
	            return hash256$1(bufferExports.Buffer.concat(tx.ins.map(sequenceBytes)));
	        case TXHASH_OUTPUTS:
	            return hash256$1(bufferExports.Buffer.concat(tx.outs.map(outputBytes)));
	        case TXHASH_CURRENT_PREVOUT:
	            if (inIndex < 0 || inIndex >= tx.ins.length) {
	                throw new Error(`computeOpTxHash: inIndex ${inIndex} out of range`);
	            }
	            return outpoint(tx.ins[inIndex]);
	        case TXHASH_CURRENT_SEQUENCE:
	            if (inIndex < 0 || inIndex >= tx.ins.length) {
	                throw new Error(`computeOpTxHash: inIndex ${inIndex} out of range`);
	            }
	            return sequenceBytes(tx.ins[inIndex]);
	        case TXHASH_CURRENT_INDEX:
	            return uint32LE(inIndex);
	        default:
	            throw new Error(`computeOpTxHash: unexpected bit 0x${bit.toString(16)}`);
	    }
	}
	/**
	 * Compute the 32-byte value consensus would push via `OP_TXHASH(selector)`
	 * when the current input being validated is at `inIndex`.
	 *
	 * `selector` is an 8-bit mask. Bits are processed in ascending numeric
	 * order; each set bit contributes its payload (raw scalar or BIP143-style
	 * SHA-256d sub-hash) to the outer preimage, which is then SHA-256d'd.
	 */
	function computeOpTxHash(tx, selector, inIndex, options) {
	    if (!Number.isInteger(selector) || selector < 0 || selector > 0xff) {
	        throw new Error(`computeOpTxHash: selector 0x${selector.toString(16)} out of 8-bit range`);
	    }
	    const parts = [];
	    for (let bitIdx = 0; bitIdx < 8; bitIdx += 1) {
	        const bit = 1 << bitIdx;
	        if ((selector & bit) === 0)
	            continue;
	        const contribution = contributionFor(tx, bit, inIndex);
	        parts.push(contribution);
	    }
	    // Consumer note: with selector 0 this returns SHA-256d of the empty
	    // buffer. Consensus never evaluates that case (OP_TXHASH requires a
	    // non-zero selector on stack per the interpreter), so treating it as a
	    // pure function of selector=0 is a deliberate choice to keep the helper
	    // total and testable.
	    return hash256$1(bufferExports.Buffer.concat(parts));
	}

	const xna = {
	    mainnet: {
	        messagePrefix: "Neurai Signed Message:\n",
	        versions: {
	            bip32: {
	                private: 76066276,
	                public: 76067358,
	            },
	            bip44: 1900,
	            private: 128,
	            public: 53,
	            scripthash: 117,
	        },
	    },
	    testnet: {
	        messagePrefix: "Neurai Signed Message:\n",
	        versions: {
	            bip32: {
	                private: 70615956,
	                public: 70617039,
	            },
	            bip44: 1,
	            private: 239,
	            public: 127,
	            scripthash: 196,
	        },
	    },
	};

	const xnaLegacy = {
	    mainnet: {
	        messagePrefix: "Neurai Signed Message:\n",
	        versions: {
	            bip32: {
	                private: 76066276,
	                public: 76067358,
	            },
	            bip44: 0,
	            private: 128,
	            public: 53,
	            scripthash: 117,
	        },
	    },
	    testnet: {
	        messagePrefix: "Neurai Signed Message:\n",
	        versions: {
	            bip32: {
	                private: 70615956,
	                public: 70617039,
	            },
	            bip44: 1,
	            private: 239,
	            public: 127,
	            scripthash: 196,
	        },
	    },
	};

	const xnaPQ = {
	    mainnet: {
	        hrp: "nq",
	        bip32: {
	            private: 76066276,
	            public: 76067358,
	        },
	    },
	    testnet: {
	        hrp: "tnq",
	        bip32: {
	            private: 70615956,
	            public: 70617039,
	        },
	    },
	};

	const ECPair = ECPairFactory(ecc);
	const HASH_TYPE = srcExports.Transaction.SIGHASH_ALL;
	const LEGACY_PREFIX_LENGTH = 25;
	const AUTHSCRIPT_PREFIX_LENGTH = 34;
	const AUTHSCRIPT_TAG = "NeuraiAuthScript";
	const AUTHSCRIPT_VERSION = 0x01;
	const NOAUTH_TYPE = 0x00;
	const PQ_AUTHSCRIPT_TYPE = 0x01;
	const LEGACY_AUTHSCRIPT_TYPE = 0x02;
	const PQ_PUBLIC_KEY_LENGTH = 1312;
	const PQ_SECRET_KEY_LENGTH = 2560;
	const PQ_KEYDATA_LENGTH = 3872;
	const PQ_SEED_LENGTH = 32;
	const PQ_PUBLIC_KEY_HEADER = bufferExports.Buffer.from([0x05]);
	const DEFAULT_PQ_WITNESS_SCRIPT = bufferExports.Buffer.from([srcExports.opcodes.OP_TRUE]);
	const ZERO_32 = bufferExports.Buffer.alloc(32, 0);
	function toBitcoinJS(network) {
	    return {
	        messagePrefix: network.messagePrefix,
	        bech32: network.bech32 || "",
	        bip32: {
	            public: network.versions.bip32.public,
	            private: network.versions.bip32.private,
	        },
	        pubKeyHash: network.versions.public,
	        scriptHash: network.versions.scripthash,
	        wif: network.versions.private,
	    };
	}
	function toBitcoinJSPQ(baseNetwork, pqNetwork) {
	    return {
	        ...toBitcoinJS(baseNetwork),
	        bech32: pqNetwork.hrp,
	        bip32: {
	            public: pqNetwork.bip32.public,
	            private: pqNetwork.bip32.private,
	        },
	    };
	}
	function isHexString(value) {
	    return /^[0-9a-f]+$/i.test(value) && value.length % 2 === 0;
	}
	function bufferFromHex(value, label) {
	    if (!isHexString(value)) {
	        throw new Error(`${label} must be a hex string`);
	    }
	    return bufferExports.Buffer.from(value, "hex");
	}
	function isLegacyScript(script) {
	    return (script.length >= LEGACY_PREFIX_LENGTH &&
	        script[0] === srcExports.opcodes.OP_DUP &&
	        script[1] === srcExports.opcodes.OP_HASH160 &&
	        script[2] === 0x14 &&
	        script[23] === srcExports.opcodes.OP_EQUALVERIFY &&
	        script[24] === srcExports.opcodes.OP_CHECKSIG);
	}
	function isPQScript(script) {
	    return (script.length >= AUTHSCRIPT_PREFIX_LENGTH &&
	        script[0] === srcExports.opcodes.OP_1 &&
	        script[1] === 0x20);
	}
	function getAuthScriptProgram(scriptPubKey) {
	    if (!isPQScript(scriptPubKey)) {
	        throw new Error("AuthScript scriptPubKey must start with OP_1 <32-byte commitment>");
	    }
	    return scriptPubKey.subarray(2, AUTHSCRIPT_PREFIX_LENGTH);
	}
	function getUTXOAmount(utxo) {
	    const amount = utxo.satoshis ?? utxo.value;
	    if (!Number.isSafeInteger(amount) || amount < 0) {
	        throw new Error(`Invalid amount for UTXO ${utxo.txid}:${utxo.outputIndex}`);
	    }
	    return amount;
	}
	function sha256(buffer) {
	    return bufferExports.Buffer.from(srcExports.crypto.sha256(buffer));
	}
	function hash256(buffer) {
	    return bufferExports.Buffer.from(srcExports.crypto.hash256(buffer));
	}
	function hash160(buffer) {
	    return bufferExports.Buffer.from(srcExports.crypto.hash160(buffer));
	}
	function taggedHash(tag, msg) {
	    const tagHash = sha256(bufferExports.Buffer.from(tag, "utf8"));
	    return sha256(bufferExports.Buffer.concat([tagHash, tagHash, msg]));
	}
	function encodeVarInt(value) {
	    if (!Number.isSafeInteger(value) || value < 0) {
	        throw new Error(`Invalid varint value: ${value}`);
	    }
	    if (value < 0xfd) {
	        return bufferExports.Buffer.from([value]);
	    }
	    if (value <= 0xffff) {
	        const out = bufferExports.Buffer.alloc(3);
	        out[0] = 0xfd;
	        out.writeUInt16LE(value, 1);
	        return out;
	    }
	    if (value <= 0xffffffff) {
	        const out = bufferExports.Buffer.alloc(5);
	        out[0] = 0xfe;
	        out.writeUInt32LE(value, 1);
	        return out;
	    }
	    const out = bufferExports.Buffer.alloc(9);
	    out[0] = 0xff;
	    writeUInt64LE(out, BigInt(value), 1);
	    return out;
	}
	function encodeVarSlice(buffer) {
	    return bufferExports.Buffer.concat([encodeVarInt(buffer.length), buffer]);
	}
	function writeUInt64LE(target, value, offset = 0) {
	    const normalized = BigInt.asUintN(64, value);
	    target.writeUInt32LE(Number(normalized & 0xffffffffn), offset);
	    target.writeUInt32LE(Number((normalized >> 32n) & 0xffffffffn), offset + 4);
	}
	function serializeOutput(output) {
	    const value = bufferExports.Buffer.alloc(8);
	    writeUInt64LE(value, BigInt(output.value));
	    return bufferExports.Buffer.concat([value, encodeVarSlice(output.script)]);
	}
	function serializeOutpoint(input) {
	    const index = bufferExports.Buffer.alloc(4);
	    index.writeUInt32LE(input.index, 0);
	    return bufferExports.Buffer.concat([bufferExports.Buffer.from(input.hash), index]);
	}
	function toSerializedPQPublicKey(publicKey) {
	    if (publicKey.length !== PQ_PUBLIC_KEY_LENGTH) {
	        throw new Error("PQ public key must be 1312 bytes");
	    }
	    return bufferExports.Buffer.concat([PQ_PUBLIC_KEY_HEADER, publicKey]);
	}
	function getPQMaterialFromBuffer(data) {
	    if (data.length === PQ_SEED_LENGTH) {
	        const keys = ml_dsa44.keygen(new Uint8Array(data));
	        const publicKey = bufferExports.Buffer.from(keys.publicKey);
	        return {
	            secretKey: bufferExports.Buffer.from(keys.secretKey),
	            publicKey,
	            serializedPublicKey: toSerializedPQPublicKey(publicKey),
	        };
	    }
	    if (data.length === PQ_SECRET_KEY_LENGTH) {
	        const publicKey = bufferExports.Buffer.from(ml_dsa44.getPublicKey(new Uint8Array(data)));
	        return {
	            secretKey: data,
	            publicKey,
	            serializedPublicKey: toSerializedPQPublicKey(publicKey),
	        };
	    }
	    if (data.length === PQ_KEYDATA_LENGTH) {
	        const secretKey = data.subarray(0, PQ_SECRET_KEY_LENGTH);
	        const publicKey = data.subarray(PQ_SECRET_KEY_LENGTH);
	        return {
	            secretKey,
	            publicKey,
	            serializedPublicKey: toSerializedPQPublicKey(publicKey),
	        };
	    }
	    throw new Error("PQ private key must be a 32-byte seed, 2560-byte secret key or 3872-byte keydata");
	}
	function getPQMaterialFromEntry(address, privateKeyEntry) {
	    if (typeof privateKeyEntry === "string") {
	        return getPQMaterialFromBuffer(bufferFromHex(privateKeyEntry, `PQ key for address ${address}`));
	    }
	    const seedKey = privateKeyEntry.seedKey;
	    if (seedKey) {
	        return getPQMaterialFromBuffer(bufferFromHex(seedKey, `PQ seed for address ${address}`));
	    }
	    const secretKeyHex = privateKeyEntry.secretKey || privateKeyEntry.privateKey;
	    if (secretKeyHex) {
	        const material = getPQMaterialFromBuffer(bufferFromHex(secretKeyHex, `PQ secret for address ${address}`));
	        if (privateKeyEntry.publicKey) {
	            const publicKey = bufferFromHex(privateKeyEntry.publicKey, `PQ public key for address ${address}`);
	            if (publicKey.length !== PQ_PUBLIC_KEY_LENGTH) {
	                throw new Error(`PQ public key for address ${address} must be 1312 bytes`);
	            }
	            return {
	                secretKey: material.secretKey,
	                publicKey,
	                serializedPublicKey: toSerializedPQPublicKey(publicKey),
	            };
	        }
	        return material;
	    }
	    throw new Error(`Missing PQ key material for address ${address}. Provide seedKey, privateKey or secretKey in hex`);
	}
	function getAuthScriptSpendTemplate(address, privateKeyEntry) {
	    if (typeof privateKeyEntry === "string") {
	        return {
	            authType: PQ_AUTHSCRIPT_TYPE,
	            witnessScript: DEFAULT_PQ_WITNESS_SCRIPT,
	            functionalArgs: [],
	        };
	    }
	    const authType = privateKeyEntry.authType ?? PQ_AUTHSCRIPT_TYPE;
	    if (authType !== NOAUTH_TYPE &&
	        authType !== PQ_AUTHSCRIPT_TYPE &&
	        authType !== LEGACY_AUTHSCRIPT_TYPE) {
	        throw new Error(`Unsupported authType 0x${authType.toString(16).padStart(2, "0")} for address ${address}. Supported: 0x00 (NoAuth), 0x01 (PQ), 0x02 (Legacy)`);
	    }
	    const witnessScript = privateKeyEntry.witnessScript
	        ? bufferFromHex(privateKeyEntry.witnessScript, `AuthScript witnessScript for address ${address}`)
	        : DEFAULT_PQ_WITNESS_SCRIPT;
	    const functionalArgs = (privateKeyEntry.functionalArgs ?? []).map((arg, idx) => bufferFromHex(arg, `AuthScript functionalArgs[${idx}] for address ${address}`));
	    return {
	        authType,
	        witnessScript,
	        functionalArgs,
	    };
	}
	function getAuthScriptCommitment(authType, publicKey, witnessScript) {
	    let authDescriptor;
	    if (authType === NOAUTH_TYPE) {
	        authDescriptor = bufferExports.Buffer.from([NOAUTH_TYPE]);
	    }
	    else if (authType === PQ_AUTHSCRIPT_TYPE) {
	        if (!publicKey) {
	            throw new Error("PQ auth requires a public key");
	        }
	        authDescriptor = bufferExports.Buffer.concat([
	            bufferExports.Buffer.from([PQ_AUTHSCRIPT_TYPE]),
	            hash160(publicKey),
	        ]);
	    }
	    else if (authType === LEGACY_AUTHSCRIPT_TYPE) {
	        if (!publicKey) {
	            throw new Error("Legacy auth requires a public key");
	        }
	        authDescriptor = bufferExports.Buffer.concat([
	            bufferExports.Buffer.from([LEGACY_AUTHSCRIPT_TYPE]),
	            hash160(publicKey),
	        ]);
	    }
	    else {
	        throw new Error(`Unsupported authType 0x${authType.toString(16).padStart(2, "0")}. Supported: 0x00 (NoAuth), 0x01 (PQ), 0x02 (Legacy)`);
	    }
	    const witnessScriptHash = sha256(witnessScript);
	    const preimage = bufferExports.Buffer.concat([
	        bufferExports.Buffer.from([AUTHSCRIPT_VERSION]),
	        authDescriptor,
	        witnessScriptHash,
	    ]);
	    return taggedHash(AUTHSCRIPT_TAG, preimage);
	}
	function hashForAuthScript(tx, inIndex, witnessScript, amount, hashType, authType) {
	    const baseType = hashType & 0x1f;
	    const anyoneCanPay = (hashType & srcExports.Transaction.SIGHASH_ANYONECANPAY) !== 0;
	    let hashPrevouts = ZERO_32;
	    let hashSequence = ZERO_32;
	    let hashOutputs = ZERO_32;
	    if (!anyoneCanPay) {
	        hashPrevouts = hash256(bufferExports.Buffer.concat(tx.ins.map(serializeOutpoint)));
	    }
	    if (!anyoneCanPay &&
	        baseType !== srcExports.Transaction.SIGHASH_SINGLE &&
	        baseType !== srcExports.Transaction.SIGHASH_NONE) {
	        hashSequence = hash256(bufferExports.Buffer.concat(tx.ins.map((input) => {
	            const sequence = bufferExports.Buffer.alloc(4);
	            sequence.writeUInt32LE(input.sequence, 0);
	            return sequence;
	        })));
	    }
	    if (baseType !== srcExports.Transaction.SIGHASH_SINGLE &&
	        baseType !== srcExports.Transaction.SIGHASH_NONE) {
	        hashOutputs = hash256(bufferExports.Buffer.concat(tx.outs.map(serializeOutput)));
	    }
	    else if (baseType === srcExports.Transaction.SIGHASH_SINGLE && inIndex < tx.outs.length) {
	        hashOutputs = hash256(serializeOutput(tx.outs[inIndex]));
	    }
	    const input = tx.ins[inIndex];
	    const outpoint = serializeOutpoint(input);
	    const sequence = bufferExports.Buffer.alloc(4);
	    sequence.writeUInt32LE(input.sequence, 0);
	    const version = bufferExports.Buffer.alloc(4);
	    version.writeInt32LE(tx.version, 0);
	    const amountBuffer = bufferExports.Buffer.alloc(8);
	    writeUInt64LE(amountBuffer, BigInt(amount));
	    const locktime = bufferExports.Buffer.alloc(4);
	    locktime.writeUInt32LE(tx.locktime, 0);
	    const hashTypeBuffer = bufferExports.Buffer.alloc(4);
	    hashTypeBuffer.writeUInt32LE(hashType >>> 0, 0);
	    const preimage = bufferExports.Buffer.concat([
	        version,
	        hashPrevouts,
	        hashSequence,
	        outpoint,
	        encodeVarSlice(witnessScript),
	        amountBuffer,
	        sequence,
	        hashOutputs,
	        locktime,
	        bufferExports.Buffer.from([authType]),
	        hashTypeBuffer,
	    ]);
	    return hash256(preimage);
	}
	function getUTXOKey(txid, outputIndex) {
	    return `${txid}:${outputIndex}`;
	}
	function getInputReference(input) {
	    return {
	        txid: bufferExports.Buffer.from(input.hash).reverse().toString("hex"),
	        vout: input.index,
	    };
	}
	function createDebugLogger(debugOption) {
	    if (debugOption === false) {
	        return () => { };
	    }
	    if (typeof debugOption === "function") {
	        return debugOption;
	    }
	    return (event) => {
	        console.log("[pq-sign]", event);
	    };
	}
	function sign(network, rawTransactionHex, UTXOs, privateKeys, options) {
	    const networkMapper = {
	        xna: toBitcoinJS(xna.mainnet),
	        "xna-test": toBitcoinJS(xna.testnet),
	        "xna-legacy": toBitcoinJS(xnaLegacy.mainnet),
	        "xna-legacy-test": toBitcoinJS(xnaLegacy.testnet),
	        "xna-pq": toBitcoinJSPQ(xna.mainnet, xnaPQ.mainnet),
	        "xna-pq-test": toBitcoinJSPQ(xna.testnet, xnaPQ.testnet),
	    };
	    const COIN = networkMapper[network];
	    if (!COIN)
	        throw new Error("Invalid network specified");
	    COIN.bech32 = COIN.bech32 || "";
	    const unsignedTx = srcExports.Transaction.fromHex(rawTransactionHex);
	    const tx = new srcExports.Transaction();
	    tx.version = unsignedTx.version;
	    tx.locktime = unsignedTx.locktime;
	    const legacyKeyPairCache = new Map();
	    const pqMaterialCache = new Map();
	    const utxoMap = new Map(UTXOs.map((utxo) => [getUTXOKey(utxo.txid, utxo.outputIndex), utxo]));
	    const debug = createDebugLogger(options?.debug);
	    function hasPrivateKeyForAddress(address) {
	        return privateKeys[address] !== undefined;
	    }
	    function getKeyPairByAddress(address) {
	        const cached = legacyKeyPairCache.get(address);
	        if (cached)
	            return cached;
	        const privateKeyEntry = privateKeys[address];
	        if (!privateKeyEntry) {
	            throw new Error(`Missing private key for address: ${address}`);
	        }
	        const wif = typeof privateKeyEntry === "string" ? privateKeyEntry : privateKeyEntry.WIF;
	        if (!wif) {
	            throw new Error(`Missing WIF private key for address: ${address}`);
	        }
	        const keyPair = ECPair.fromWIF(wif, COIN);
	        legacyKeyPairCache.set(address, keyPair);
	        return keyPair;
	    }
	    function getPQMaterialByAddress(address) {
	        const cached = pqMaterialCache.get(address);
	        if (cached)
	            return cached;
	        const privateKeyEntry = privateKeys[address];
	        if (!privateKeyEntry) {
	            throw new Error(`Missing private key for address: ${address}`);
	        }
	        const material = getPQMaterialFromEntry(address, privateKeyEntry);
	        pqMaterialCache.set(address, material);
	        return material;
	    }
	    function getUTXO(txid, vout) {
	        return utxoMap.get(getUTXOKey(txid, vout));
	    }
	    for (let i = 0; i < unsignedTx.ins.length; i++) {
	        const input = unsignedTx.ins[i];
	        tx.addInput(bufferExports.Buffer.from(input.hash), input.index, input.sequence, input.script);
	        if (input.witness.length > 0) {
	            tx.setWitness(i, input.witness);
	        }
	    }
	    for (const out of unsignedTx.outs) {
	        tx.addOutput(out.script, out.value);
	    }
	    for (let i = 0; i < tx.ins.length; i++) {
	        const input = tx.ins[i];
	        const { txid, vout } = getInputReference(input);
	        const utxo = getUTXO(txid, vout);
	        debug({
	            step: "input",
	            i,
	            txid,
	            vout,
	            hasUtxo: !!utxo,
	            utxoAddress: utxo?.address ?? null,
	            utxoScript: utxo?.script ?? null,
	        });
	        if (!utxo) {
	            debug({
	                step: "skip-missing-utxo",
	                i,
	                txid,
	                vout,
	            });
	            continue;
	        }
	        const scriptPubKey = bufferExports.Buffer.from(utxo.script, "hex");
	        const inputIsLegacy = isLegacyScript(scriptPubKey);
	        const inputIsPQ = isPQScript(scriptPubKey);
	        debug({
	            step: "script-type",
	            i,
	            isLegacy: inputIsLegacy,
	            isPQ: inputIsPQ,
	        });
	        const hint = utxo.bareScriptHint;
	        // Covenant cancel branches: the prevout is AuthScript-v1-wrapped
	        // (commitment-to-covenant), so `inputIsPQ` is true. The hint tells
	        // the library the covenant witness script to use and the flavour
	        // (legacy ECDSA or PQ CSFS) of the cancel signature.
	        if (inputIsPQ && (hint?.kind === "covenant-cancel-legacy" || hint?.kind === "covenant-cancel-pq")) {
	            // Common verification: AuthScript-NOAUTH commitment must match the
	            // 32-byte program in the prevout. `scriptPubKey` may be either bare
	            // AuthScript v1 (34 bytes) or AuthScript v1 + asset wrapper — both
	            // share the same 34-byte prefix we care about.
	            if (scriptPubKey.length < AUTHSCRIPT_PREFIX_LENGTH) {
	                throw new Error(`${hint.kind} hint for ${txid}:${vout}: prevout is shorter than the 34-byte AuthScript v1 prefix`);
	            }
	            const covenantScriptBytes = bufferFromHex(hint.covenantScriptHex, `${hint.kind} covenantScriptHex`);
	            const expectedCommitment = getAuthScriptCommitment(NOAUTH_TYPE, null, covenantScriptBytes);
	            const actualCommitment = scriptPubKey.subarray(2, AUTHSCRIPT_PREFIX_LENGTH);
	            if (!expectedCommitment.equals(actualCommitment)) {
	                throw new Error(`${hint.kind} commitment mismatch for ${txid}:${vout}: hint.covenantScriptHex does not hash to the UTXO's AuthScript commitment`);
	            }
	            if (!hasPrivateKeyForAddress(utxo.address)) {
	                throw new Error(`Missing private key for covenant cancel at ${txid}:${vout} (address ${utxo.address})`);
	            }
	            const amount = getUTXOAmount(utxo);
	            if (hint.kind === "covenant-cancel-legacy") {
	                let parsed;
	                try {
	                    parsed = parsePartialFillScript(hint.covenantScriptHex);
	                }
	                catch (err) {
	                    throw new Error(`covenant-cancel-legacy covenantScriptHex is not a legacy partial-fill covenant: ${err.message}`);
	                }
	                const keyPair = getKeyPairByAddress(utxo.address);
	                const derivedPKH = hash160(bufferExports.Buffer.from(keyPair.publicKey));
	                const covenantPKH = bufferExports.Buffer.from(parsed.sellerPubKeyHash);
	                if (!derivedPKH.equals(covenantPKH)) {
	                    throw new Error(`covenant cancel key for ${txid}:${vout} does not match the covenant sellerPubKeyHash (got ${derivedPKH.toString("hex")}, expected ${covenantPKH.toString("hex")})`);
	                }
	                // AuthScript-NOAUTH sighash: scriptCode = the covenant (witness
	                // script), authType = 0x00. Amount is the UTXO's XNA value —
	                // typically 0 for asset covenant outputs.
	                const sighash = hashForAuthScript(tx, i, covenantScriptBytes, amount, HASH_TYPE, NOAUTH_TYPE);
	                const rawSignature = keyPair.sign(sighash);
	                const signatureWithHashType = srcExports.script.signature.encode(bufferExports.Buffer.from(rawSignature), HASH_TYPE);
	                const witnessStack = [
	                    bufferExports.Buffer.from([NOAUTH_TYPE]),
	                    signatureWithHashType,
	                    bufferExports.Buffer.from(keyPair.publicKey),
	                    bufferExports.Buffer.from([0x01]), // selects OP_IF cancel branch
	                    covenantScriptBytes,
	                ];
	                tx.setInputScript(i, bufferExports.Buffer.alloc(0));
	                tx.setWitness(i, witnessStack);
	                debug({
	                    step: "covenant-cancel-legacy-signed",
	                    i,
	                    tokenId: parsed.tokenId,
	                    unitPriceSats: parsed.unitPriceSats.toString(),
	                });
	                continue;
	            }
	            // hint.kind === "covenant-cancel-pq"
	            let parsedPQ;
	            try {
	                parsedPQ = parsePartialFillScriptPQ(hint.covenantScriptHex);
	            }
	            catch (err) {
	                throw new Error(`covenant-cancel-pq covenantScriptHex is not a PQ partial-fill covenant: ${err.message}`);
	            }
	            const pqMaterial = getPQMaterialByAddress(utxo.address);
	            const derivedPqCommitment = sha256(pqMaterial.serializedPublicKey);
	            const covenantPqCommitment = bufferExports.Buffer.from(parsedPQ.pubKeyCommitment);
	            if (!derivedPqCommitment.equals(covenantPqCommitment)) {
	                throw new Error(`PQ covenant cancel key commitment mismatch for ${txid}:${vout}: ` +
	                    `wallet pubkey hashes to ${derivedPqCommitment.toString("hex")}, ` +
	                    `covenant commits to ${covenantPqCommitment.toString("hex")}`);
	            }
	            // Consensus: OP_TXHASH pushes the 32-byte digest, CSFS then
	            // re-hashes the message stack item (SIGVERSION_AUTHSCRIPT-ish),
	            // so we sign SHA256(opTxHash). See plan v3 §3.
	            const opTxHash = computeOpTxHash(tx, parsedPQ.txHashSelector, i);
	            const message = sha256(opTxHash);
	            const rawSig = ml_dsa44.sign(new Uint8Array(message), new Uint8Array(pqMaterial.secretKey), { extraEntropy: false });
	            const sigWithHashType = bufferExports.Buffer.concat([
	                bufferExports.Buffer.from(rawSig),
	                bufferExports.Buffer.from([HASH_TYPE]),
	            ]);
	            const witnessStack = [
	                bufferExports.Buffer.from([NOAUTH_TYPE]),
	                sigWithHashType,
	                pqMaterial.serializedPublicKey,
	                bufferExports.Buffer.from([0x01]),
	                covenantScriptBytes,
	            ];
	            tx.setInputScript(i, bufferExports.Buffer.alloc(0));
	            tx.setWitness(i, witnessStack);
	            debug({
	                step: "covenant-cancel-pq-signed",
	                i,
	                selector: parsedPQ.txHashSelector,
	                opTxHashHex: opTxHash.toString("hex"),
	                tokenId: parsedPQ.tokenId,
	                unitPriceSats: parsedPQ.unitPriceSats.toString(),
	            });
	            continue;
	        }
	        if (!inputIsLegacy && !inputIsPQ) {
	            if (hint) {
	                throw new Error(`${hint.kind} hint requires an AuthScript-v1-wrapped prevout for ${txid}:${vout}, but the prevout script is neither P2PKH nor AuthScript v1`);
	            }
	            throw new Error(`Unsupported prevout script for ${txid}:${vout}. Only legacy P2PKH and Neurai AuthScript witness v1 are supported`);
	        }
	        if (inputIsPQ) {
	            const hasPrivateKeyEntry = hasPrivateKeyForAddress(utxo.address);
	            debug({
	                step: "pq-material",
	                i,
	                address: utxo.address,
	                hasPrivateKeyEntry,
	            });
	            if (!hasPrivateKeyEntry) {
	                debug({
	                    step: "skip-missing-private-key",
	                    i,
	                    address: utxo.address,
	                });
	                continue;
	            }
	            const privateKeyEntry = privateKeys[utxo.address];
	            if (!privateKeyEntry) {
	                throw new Error(`Missing private key for address: ${utxo.address}`);
	            }
	            const spendTemplate = getAuthScriptSpendTemplate(utxo.address, privateKeyEntry);
	            const actualCommitment = getAuthScriptProgram(scriptPubKey);
	            let expectedCommitment;
	            if (spendTemplate.authType === NOAUTH_TYPE) {
	                expectedCommitment = getAuthScriptCommitment(NOAUTH_TYPE, null, spendTemplate.witnessScript);
	            }
	            else if (spendTemplate.authType === PQ_AUTHSCRIPT_TYPE) {
	                const pqMat = getPQMaterialByAddress(utxo.address);
	                expectedCommitment = getAuthScriptCommitment(PQ_AUTHSCRIPT_TYPE, pqMat.serializedPublicKey, spendTemplate.witnessScript);
	            }
	            else {
	                const kp = getKeyPairByAddress(utxo.address);
	                expectedCommitment = getAuthScriptCommitment(LEGACY_AUTHSCRIPT_TYPE, bufferExports.Buffer.from(kp.publicKey), spendTemplate.witnessScript);
	            }
	            debug({
	                step: "authscript-template",
	                i,
	                authType: spendTemplate.authType,
	                witnessScriptHex: spendTemplate.witnessScript.toString("hex"),
	                functionalArgs: spendTemplate.functionalArgs.map((arg) => arg.toString("hex")),
	            });
	            if (!actualCommitment.equals(expectedCommitment)) {
	                throw new Error(`AuthScript commitment mismatch for ${txid}:${vout}. The provided key/template does not match the prevout script`);
	            }
	            let witnessStack;
	            if (spendTemplate.authType === NOAUTH_TYPE) {
	                witnessStack = [
	                    bufferExports.Buffer.from([NOAUTH_TYPE]),
	                    ...spendTemplate.functionalArgs,
	                    spendTemplate.witnessScript,
	                ];
	            }
	            else if (spendTemplate.authType === PQ_AUTHSCRIPT_TYPE) {
	                const pqMaterial = getPQMaterialByAddress(utxo.address);
	                const sighash = hashForAuthScript(tx, i, spendTemplate.witnessScript, getUTXOAmount(utxo), HASH_TYPE, spendTemplate.authType);
	                const signature = bufferExports.Buffer.from(ml_dsa44.sign(new Uint8Array(sighash), new Uint8Array(pqMaterial.secretKey), {
	                    extraEntropy: false,
	                }));
	                const signatureWithHashType = bufferExports.Buffer.concat([signature, bufferExports.Buffer.from([HASH_TYPE])]);
	                witnessStack = [
	                    bufferExports.Buffer.from([PQ_AUTHSCRIPT_TYPE]),
	                    signatureWithHashType,
	                    pqMaterial.serializedPublicKey,
	                    ...spendTemplate.functionalArgs,
	                    spendTemplate.witnessScript,
	                ];
	            }
	            else {
	                const keyPair = getKeyPairByAddress(utxo.address);
	                const sighash = hashForAuthScript(tx, i, spendTemplate.witnessScript, getUTXOAmount(utxo), HASH_TYPE, spendTemplate.authType);
	                const rawSignature = keyPair.sign(sighash);
	                const signatureWithHashType = srcExports.script.signature.encode(bufferExports.Buffer.from(rawSignature), HASH_TYPE);
	                witnessStack = [
	                    bufferExports.Buffer.from([LEGACY_AUTHSCRIPT_TYPE]),
	                    signatureWithHashType,
	                    bufferExports.Buffer.from(keyPair.publicKey),
	                    ...spendTemplate.functionalArgs,
	                    spendTemplate.witnessScript,
	                ];
	            }
	            tx.setInputScript(i, bufferExports.Buffer.alloc(0));
	            tx.setWitness(i, witnessStack);
	            debug({
	                step: "witness-set",
	                i,
	                witnessItems: tx.ins[i].witness?.length ?? 0,
	                witness0Len: tx.ins[i].witness?.[0]?.length ?? 0,
	                witness1Len: tx.ins[i].witness?.[1]?.length ?? 0,
	                witness2Len: tx.ins[i].witness?.[2]?.length ?? 0,
	                witnessLastHex: tx.ins[i].witness?.[tx.ins[i].witness.length - 1]?.toString("hex") ?? null,
	            });
	            continue;
	        }
	        if (!hasPrivateKeyForAddress(utxo.address)) {
	            debug({
	                step: "skip-missing-private-key",
	                i,
	                address: utxo.address,
	            });
	            continue;
	        }
	        const keyPair = getKeyPairByAddress(utxo.address);
	        const sighash = tx.hashForSignature(i, scriptPubKey, HASH_TYPE);
	        const rawSignature = keyPair.sign(sighash);
	        const signatureWithHashType = srcExports.script.signature.encode(bufferExports.Buffer.from(rawSignature), HASH_TYPE);
	        const scriptSig = srcExports.script.compile([
	            signatureWithHashType,
	            bufferExports.Buffer.from(keyPair.publicKey),
	        ]);
	        tx.setInputScript(i, scriptSig);
	    }
	    debug({
	        step: "final-inputs",
	        inputs: tx.ins.map((input, i) => ({
	            i,
	            scriptLen: input.script?.length ?? 0,
	            witnessItems: input.witness?.length ?? 0,
	        })),
	    });
	    return tx.toHex();
	}
	const Signer = {
	    sign,
	};

	const globalTarget = globalThis;
	globalTarget.NeuraiSignTransaction = Signer;

})();
//# sourceMappingURL=NeuraiSignTransaction.global.js.map
