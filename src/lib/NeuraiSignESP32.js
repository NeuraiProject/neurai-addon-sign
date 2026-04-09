var NeuraiSignESP32Bundle = (function () {
    'use strict';

    /**
     * Web Serial API communication layer for ESP32 hardware wallet.
     *
     * Handles USB Serial connection, JSON command/response protocol,
     * and line-based buffering matching the NeuraiHW firmware protocol.
     */
    const DEFAULT_FILTERS = [
        { usbVendorId: 0x303a, usbProductId: 0x1001 },
        { usbVendorId: 0x303a },
        { usbVendorId: 0x10c4, usbProductId: 0xea60 },
        { usbVendorId: 0x1a86, usbProductId: 0x7523 },
        { usbVendorId: 0x0403, usbProductId: 0x6001 },
        { usbVendorId: 0x067b, usbProductId: 0x2303 },
        { usbVendorId: 0x2886 },
    ];
    const DEFAULT_BAUD_RATE = 115200;
    class SerialConnection {
        constructor(options) {
            this.port = null;
            this.reader = null;
            this.writer = null;
            this.readableStreamClosed = null;
            this.writableStreamClosed = null;
            this.isReading = false;
            this.responseQueue = [];
            this.baudRate = options?.baudRate ?? DEFAULT_BAUD_RATE;
            this.filters = options?.filters ?? DEFAULT_FILTERS;
        }
        static isSupported() {
            return typeof navigator !== "undefined" && "serial" in navigator;
        }
        async open() {
            if (!SerialConnection.isSupported()) {
                throw new Error("Web Serial API not supported. Use Chrome, Edge, or Opera.");
            }
            this.port = await navigator.serial.requestPort({ filters: this.filters });
            await this.port.open({
                baudRate: this.baudRate,
                dataBits: 8,
                stopBits: 1,
                parity: "none",
                flowControl: "none",
                bufferSize: 8192,
            });
            const decoder = new TextDecoderStream();
            this.readableStreamClosed = this.port.readable.pipeTo(decoder.writable);
            this.reader = decoder.readable.getReader();
            const encoder = new TextEncoderStream();
            this.writableStreamClosed = encoder.readable.pipeTo(this.port.writable);
            this.writer = encoder.writable.getWriter();
            this.isReading = true;
            void this.readLoop();
            await this.delay(1200);
            this.responseQueue = [];
        }
        async close() {
            this.isReading = false;
            if (this.reader) {
                await this.reader.cancel();
                await this.readableStreamClosed?.catch(() => { });
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
        async sendCommand(command, timeoutMs = 65000) {
            if (!this.writer) {
                throw new Error("Serial port not connected");
            }
            this.responseQueue = [];
            const json = JSON.stringify(command);
            console.debug("[NeuraiESP32 Serial] Sending command", {
                action: command.action,
                payloadLength: json.length + 1,
                timeoutMs,
            });
            await this.writeChunked(json);
            await this.writer.ready;
            await this.writer.write("\n");
            const response = await this.waitForResponse(timeoutMs);
            if (!response) {
                throw new Error("Device response timeout");
            }
            return response;
        }
        async sendCommandFinal(command, timeoutMs = 65000) {
            if (!this.writer) {
                throw new Error("Serial port not connected");
            }
            this.responseQueue = [];
            const json = JSON.stringify(command);
            console.debug("[NeuraiESP32 Serial] Sending command", {
                action: command.action,
                payloadLength: json.length + 1,
                timeoutMs,
            });
            await this.writeChunked(json);
            await this.writer.ready;
            await this.writer.write("\n");
            const startTime = Date.now();
            while (Date.now() - startTime < timeoutMs) {
                const response = await this.waitForResponse(timeoutMs - (Date.now() - startTime));
                if (!response) {
                    throw new Error("Device response timeout");
                }
                if (response.status === "processing") {
                    continue;
                }
                return response;
            }
            throw new Error("Device response timeout");
        }
        async readLoop() {
            let buffer = "";
            while (this.isReading && this.reader) {
                try {
                    const { value, done } = await this.reader.read();
                    if (done)
                        break;
                    buffer += value;
                    const lines = buffer.split("\n");
                    buffer = lines.pop() ?? "";
                    for (const rawLine of lines) {
                        const line = rawLine.trim().replace(/\r/g, "");
                        if (line.length === 0)
                            continue;
                        if (line.startsWith("{")) {
                            try {
                                const data = JSON.parse(line);
                                console.debug("[NeuraiESP32 Serial] JSON line received", data);
                                this.responseQueue.push(data);
                            }
                            catch {
                                console.debug("[NeuraiESP32 Serial] Invalid JSON line", line);
                            }
                        }
                        else {
                            console.debug("[NeuraiESP32 Serial] Non-JSON serial line", line);
                        }
                    }
                }
                catch {
                    break;
                }
            }
        }
        waitForResponse(timeoutMs) {
            return new Promise((resolve) => {
                const startTime = Date.now();
                const check = () => {
                    if (this.responseQueue.length > 0) {
                        const response = this.responseQueue.shift();
                        console.debug("[NeuraiESP32 Serial] Response dequeued", {
                            waitedMs: Date.now() - startTime,
                            pendingResponses: this.responseQueue.length,
                            status: response.status,
                        });
                        resolve(response);
                    }
                    else if (Date.now() - startTime > timeoutMs) {
                        console.error("[NeuraiESP32 Serial] Response timeout", {
                            timeoutMs,
                            queuedResponses: this.responseQueue.length,
                        });
                        resolve(null);
                    }
                    else {
                        setTimeout(check, 50);
                    }
                };
                check();
            });
        }
        async writeChunked(data, chunkSize = 256, pauseMs = 8) {
            if (!this.writer) {
                throw new Error("Serial port not connected");
            }
            const totalChunks = Math.ceil(data.length / chunkSize);
            const startedAt = Date.now();
            let totalReadyMs = 0;
            let totalWriteMs = 0;
            let totalPauseMs = 0;
            console.debug("[NeuraiESP32 Serial][writeChunked] start", {
                totalBytes: data.length,
                chunkSize,
                pauseMs,
                totalChunks,
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
                    pauseMs: actualPauseMs,
                });
            }
            console.debug("[NeuraiESP32 Serial][writeChunked] complete", {
                totalBytes: data.length,
                totalChunks,
                totalMs: Date.now() - startedAt,
                totalReadyMs,
                totalWriteMs,
                totalPauseMs,
            });
        }
        delay(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        }
    }

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

    /**
     * Represents the Bitcoin network configuration.
     */
    const bitcoin = {
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

    // Reference https://github.com/bitcoin/bips/blob/master/bip-0066.mediawiki
    // Format: 0x30 [total-length] 0x02 [R-length] [R] 0x02 [S-length] [S]
    // NOTE: SIGHASH byte ignored AND restricted, truncate before use
    /**
     * Checks if the given buffer is a valid BIP66-encoded signature.
     *
     * @param buffer - The buffer to check.
     * @returns A boolean indicating whether the buffer is a valid BIP66-encoded signature.
     */
    function check$d(buffer) {
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
    /**
     * Decodes a DER-encoded signature buffer and returns the R and S values.
     * @param buffer - The DER-encoded signature buffer.
     * @returns An object containing the R and S values.
     * @throws {Error} If the DER sequence length is too short, too long, or invalid.
     * @throws {Error} If the R or S length is zero or invalid.
     * @throws {Error} If the R or S value is negative or excessively padded.
     */
    function decode$h(buffer) {
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
    function encode$i(r, s) {
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
      const signature = new Uint8Array(6 + lenR + lenS);
      // 0x30 [total-length] 0x02 [R-length] [R] 0x02 [S-length] [S]
      signature[0] = 0x30;
      signature[1] = signature.length - 2;
      signature[2] = 0x02;
      signature[3] = r.length;
      signature.set(r, 4);
      signature[4 + lenR] = 0x02;
      signature[5 + lenR] = s.length;
      signature.set(s, 6 + lenR);
      return signature;
    }

    // Define OPS enum
    var OPS$7;
    (function (OPS) {
      OPS[(OPS['OP_FALSE'] = 0)] = 'OP_FALSE';
      OPS[(OPS['OP_0'] = 0)] = 'OP_0';
      OPS[(OPS['OP_PUSHDATA1'] = 76)] = 'OP_PUSHDATA1';
      OPS[(OPS['OP_PUSHDATA2'] = 77)] = 'OP_PUSHDATA2';
      OPS[(OPS['OP_PUSHDATA4'] = 78)] = 'OP_PUSHDATA4';
      OPS[(OPS['OP_1NEGATE'] = 79)] = 'OP_1NEGATE';
      OPS[(OPS['OP_RESERVED'] = 80)] = 'OP_RESERVED';
      OPS[(OPS['OP_TRUE'] = 81)] = 'OP_TRUE';
      OPS[(OPS['OP_1'] = 81)] = 'OP_1';
      OPS[(OPS['OP_2'] = 82)] = 'OP_2';
      OPS[(OPS['OP_3'] = 83)] = 'OP_3';
      OPS[(OPS['OP_4'] = 84)] = 'OP_4';
      OPS[(OPS['OP_5'] = 85)] = 'OP_5';
      OPS[(OPS['OP_6'] = 86)] = 'OP_6';
      OPS[(OPS['OP_7'] = 87)] = 'OP_7';
      OPS[(OPS['OP_8'] = 88)] = 'OP_8';
      OPS[(OPS['OP_9'] = 89)] = 'OP_9';
      OPS[(OPS['OP_10'] = 90)] = 'OP_10';
      OPS[(OPS['OP_11'] = 91)] = 'OP_11';
      OPS[(OPS['OP_12'] = 92)] = 'OP_12';
      OPS[(OPS['OP_13'] = 93)] = 'OP_13';
      OPS[(OPS['OP_14'] = 94)] = 'OP_14';
      OPS[(OPS['OP_15'] = 95)] = 'OP_15';
      OPS[(OPS['OP_16'] = 96)] = 'OP_16';
      OPS[(OPS['OP_NOP'] = 97)] = 'OP_NOP';
      OPS[(OPS['OP_VER'] = 98)] = 'OP_VER';
      OPS[(OPS['OP_IF'] = 99)] = 'OP_IF';
      OPS[(OPS['OP_NOTIF'] = 100)] = 'OP_NOTIF';
      OPS[(OPS['OP_VERIF'] = 101)] = 'OP_VERIF';
      OPS[(OPS['OP_VERNOTIF'] = 102)] = 'OP_VERNOTIF';
      OPS[(OPS['OP_ELSE'] = 103)] = 'OP_ELSE';
      OPS[(OPS['OP_ENDIF'] = 104)] = 'OP_ENDIF';
      OPS[(OPS['OP_VERIFY'] = 105)] = 'OP_VERIFY';
      OPS[(OPS['OP_RETURN'] = 106)] = 'OP_RETURN';
      OPS[(OPS['OP_TOALTSTACK'] = 107)] = 'OP_TOALTSTACK';
      OPS[(OPS['OP_FROMALTSTACK'] = 108)] = 'OP_FROMALTSTACK';
      OPS[(OPS['OP_2DROP'] = 109)] = 'OP_2DROP';
      OPS[(OPS['OP_2DUP'] = 110)] = 'OP_2DUP';
      OPS[(OPS['OP_3DUP'] = 111)] = 'OP_3DUP';
      OPS[(OPS['OP_2OVER'] = 112)] = 'OP_2OVER';
      OPS[(OPS['OP_2ROT'] = 113)] = 'OP_2ROT';
      OPS[(OPS['OP_2SWAP'] = 114)] = 'OP_2SWAP';
      OPS[(OPS['OP_IFDUP'] = 115)] = 'OP_IFDUP';
      OPS[(OPS['OP_DEPTH'] = 116)] = 'OP_DEPTH';
      OPS[(OPS['OP_DROP'] = 117)] = 'OP_DROP';
      OPS[(OPS['OP_DUP'] = 118)] = 'OP_DUP';
      OPS[(OPS['OP_NIP'] = 119)] = 'OP_NIP';
      OPS[(OPS['OP_OVER'] = 120)] = 'OP_OVER';
      OPS[(OPS['OP_PICK'] = 121)] = 'OP_PICK';
      OPS[(OPS['OP_ROLL'] = 122)] = 'OP_ROLL';
      OPS[(OPS['OP_ROT'] = 123)] = 'OP_ROT';
      OPS[(OPS['OP_SWAP'] = 124)] = 'OP_SWAP';
      OPS[(OPS['OP_TUCK'] = 125)] = 'OP_TUCK';
      OPS[(OPS['OP_CAT'] = 126)] = 'OP_CAT';
      OPS[(OPS['OP_SUBSTR'] = 127)] = 'OP_SUBSTR';
      OPS[(OPS['OP_LEFT'] = 128)] = 'OP_LEFT';
      OPS[(OPS['OP_RIGHT'] = 129)] = 'OP_RIGHT';
      OPS[(OPS['OP_SIZE'] = 130)] = 'OP_SIZE';
      OPS[(OPS['OP_INVERT'] = 131)] = 'OP_INVERT';
      OPS[(OPS['OP_AND'] = 132)] = 'OP_AND';
      OPS[(OPS['OP_OR'] = 133)] = 'OP_OR';
      OPS[(OPS['OP_XOR'] = 134)] = 'OP_XOR';
      OPS[(OPS['OP_EQUAL'] = 135)] = 'OP_EQUAL';
      OPS[(OPS['OP_EQUALVERIFY'] = 136)] = 'OP_EQUALVERIFY';
      OPS[(OPS['OP_RESERVED1'] = 137)] = 'OP_RESERVED1';
      OPS[(OPS['OP_RESERVED2'] = 138)] = 'OP_RESERVED2';
      OPS[(OPS['OP_1ADD'] = 139)] = 'OP_1ADD';
      OPS[(OPS['OP_1SUB'] = 140)] = 'OP_1SUB';
      OPS[(OPS['OP_2MUL'] = 141)] = 'OP_2MUL';
      OPS[(OPS['OP_2DIV'] = 142)] = 'OP_2DIV';
      OPS[(OPS['OP_NEGATE'] = 143)] = 'OP_NEGATE';
      OPS[(OPS['OP_ABS'] = 144)] = 'OP_ABS';
      OPS[(OPS['OP_NOT'] = 145)] = 'OP_NOT';
      OPS[(OPS['OP_0NOTEQUAL'] = 146)] = 'OP_0NOTEQUAL';
      OPS[(OPS['OP_ADD'] = 147)] = 'OP_ADD';
      OPS[(OPS['OP_SUB'] = 148)] = 'OP_SUB';
      OPS[(OPS['OP_MUL'] = 149)] = 'OP_MUL';
      OPS[(OPS['OP_DIV'] = 150)] = 'OP_DIV';
      OPS[(OPS['OP_MOD'] = 151)] = 'OP_MOD';
      OPS[(OPS['OP_LSHIFT'] = 152)] = 'OP_LSHIFT';
      OPS[(OPS['OP_RSHIFT'] = 153)] = 'OP_RSHIFT';
      OPS[(OPS['OP_BOOLAND'] = 154)] = 'OP_BOOLAND';
      OPS[(OPS['OP_BOOLOR'] = 155)] = 'OP_BOOLOR';
      OPS[(OPS['OP_NUMEQUAL'] = 156)] = 'OP_NUMEQUAL';
      OPS[(OPS['OP_NUMEQUALVERIFY'] = 157)] = 'OP_NUMEQUALVERIFY';
      OPS[(OPS['OP_NUMNOTEQUAL'] = 158)] = 'OP_NUMNOTEQUAL';
      OPS[(OPS['OP_LESSTHAN'] = 159)] = 'OP_LESSTHAN';
      OPS[(OPS['OP_GREATERTHAN'] = 160)] = 'OP_GREATERTHAN';
      OPS[(OPS['OP_LESSTHANOREQUAL'] = 161)] = 'OP_LESSTHANOREQUAL';
      OPS[(OPS['OP_GREATERTHANOREQUAL'] = 162)] = 'OP_GREATERTHANOREQUAL';
      OPS[(OPS['OP_MIN'] = 163)] = 'OP_MIN';
      OPS[(OPS['OP_MAX'] = 164)] = 'OP_MAX';
      OPS[(OPS['OP_WITHIN'] = 165)] = 'OP_WITHIN';
      OPS[(OPS['OP_RIPEMD160'] = 166)] = 'OP_RIPEMD160';
      OPS[(OPS['OP_SHA1'] = 167)] = 'OP_SHA1';
      OPS[(OPS['OP_SHA256'] = 168)] = 'OP_SHA256';
      OPS[(OPS['OP_HASH160'] = 169)] = 'OP_HASH160';
      OPS[(OPS['OP_HASH256'] = 170)] = 'OP_HASH256';
      OPS[(OPS['OP_CODESEPARATOR'] = 171)] = 'OP_CODESEPARATOR';
      OPS[(OPS['OP_CHECKSIG'] = 172)] = 'OP_CHECKSIG';
      OPS[(OPS['OP_CHECKSIGVERIFY'] = 173)] = 'OP_CHECKSIGVERIFY';
      OPS[(OPS['OP_CHECKMULTISIG'] = 174)] = 'OP_CHECKMULTISIG';
      OPS[(OPS['OP_CHECKMULTISIGVERIFY'] = 175)] = 'OP_CHECKMULTISIGVERIFY';
      OPS[(OPS['OP_NOP1'] = 176)] = 'OP_NOP1';
      OPS[(OPS['OP_CHECKLOCKTIMEVERIFY'] = 177)] = 'OP_CHECKLOCKTIMEVERIFY';
      OPS[(OPS['OP_NOP2'] = 177)] = 'OP_NOP2';
      OPS[(OPS['OP_CHECKSEQUENCEVERIFY'] = 178)] = 'OP_CHECKSEQUENCEVERIFY';
      OPS[(OPS['OP_NOP3'] = 178)] = 'OP_NOP3';
      OPS[(OPS['OP_NOP4'] = 179)] = 'OP_NOP4';
      OPS[(OPS['OP_NOP5'] = 180)] = 'OP_NOP5';
      OPS[(OPS['OP_NOP6'] = 181)] = 'OP_NOP6';
      OPS[(OPS['OP_NOP7'] = 182)] = 'OP_NOP7';
      OPS[(OPS['OP_NOP8'] = 183)] = 'OP_NOP8';
      OPS[(OPS['OP_NOP9'] = 184)] = 'OP_NOP9';
      OPS[(OPS['OP_NOP10'] = 185)] = 'OP_NOP10';
      OPS[(OPS['OP_CHECKSIGADD'] = 186)] = 'OP_CHECKSIGADD';
      OPS[(OPS['OP_PUBKEYHASH'] = 253)] = 'OP_PUBKEYHASH';
      OPS[(OPS['OP_PUBKEY'] = 254)] = 'OP_PUBKEY';
      OPS[(OPS['OP_INVALIDOPCODE'] = 255)] = 'OP_INVALIDOPCODE';
    })(OPS$7 || (OPS$7 = {}));

    const HEX_STRINGS$1 = "0123456789abcdefABCDEF";
    const HEX_CODES = HEX_STRINGS$1.split("").map((c) => c.codePointAt(0));
    const HEX_CODEPOINTS = Array(256)
        .fill(true)
        .map((_, i) => {
        const s = String.fromCodePoint(i);
        const index = HEX_STRINGS$1.indexOf(s);
        // ABCDEF will use 10 - 15
        return index < 0 ? undefined : index < 16 ? index : index - 6;
    });
    const ENCODER = new TextEncoder();
    const DECODER = new TextDecoder();
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
        for (const array of arrays) {
            result.set(array, offset);
            offset += array.length;
        }
        return result;
    }
    // There are two implementations.
    // One optimizes for length of the bytes, and uses TextDecoder.
    // One optimizes for iteration count, and appends strings.
    // This removes the overhead of TextDecoder.
    function toHex(bytes) {
        const b = bytes || new Uint8Array();
        return b.length > 512 ? _toHexLengthPerf(b) : _toHexIterPerf(b);
    }
    function _toHexIterPerf(bytes) {
        let s = "";
        for (let i = 0; i < bytes.length; ++i) {
            s += HEX_STRINGS$1[HEX_CODEPOINTS[HEX_CODES[bytes[i] >> 4]]];
            s += HEX_STRINGS$1[HEX_CODEPOINTS[HEX_CODES[bytes[i] & 15]]];
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
    // Mimics Buffer.from(x, 'hex') logic
    // Stops on first non-hex string and returns
    // https://github.com/nodejs/node/blob/v14.18.1/src/string_bytes.cc#L246-L261
    function fromHex(hexString) {
        const hexBytes = ENCODER.encode(hexString || "");
        const resultBytes = new Uint8Array(Math.floor(hexBytes.length / 2));
        let i;
        for (i = 0; i < resultBytes.length; i++) {
            const a = HEX_CODEPOINTS[hexBytes[i * 2]];
            const b = HEX_CODEPOINTS[hexBytes[i * 2 + 1]];
            if (a === undefined || b === undefined) {
                break;
            }
            resultBytes[i] = (a << 4) | b;
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
    // Same behavior as Buffer.compare()
    function compare(v1, v2) {
        const minLength = Math.min(v1.length, v2.length);
        for (let i = 0; i < minLength; ++i) {
            if (v1[i] !== v2[i]) {
                return v1[i] < v2[i] ? -1 : 1;
            }
        }
        return v1.length === v2.length ? 0 : v1.length > v2.length ? 1 : -1;
    }
    function writeUInt8(buffer, offset, value) {
        if (offset + 1 > buffer.length) {
            throw new Error("Offset is outside the bounds of Uint8Array");
        }
        if (value > 0xff) {
            throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${0xff}. Received ${value}`);
        }
        buffer[offset] = value;
        return offset + 1;
    }
    function writeUInt16$1(buffer, offset, value, littleEndian) {
        if (offset + 2 > buffer.length) {
            throw new Error("Offset is outside the bounds of Uint8Array");
        }
        littleEndian = littleEndian.toUpperCase();
        if (value > 0xffff) {
            throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${0xffff}. Received ${value}`);
        }
        if (littleEndian === "LE") {
            buffer[offset] = value & 0xff;
            buffer[offset + 1] = (value >> 8) & 0xff;
        }
        else {
            buffer[offset] = (value >> 8) & 0xff;
            buffer[offset + 1] = value & 0xff;
        }
        return offset + 2;
    }
    function writeUInt32$1(buffer, offset, value, littleEndian) {
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
        return offset + 4;
    }
    function writeUInt64$1(buffer, offset, value, littleEndian) {
        if (offset + 8 > buffer.length) {
            throw new Error("Offset is outside the bounds of Uint8Array");
        }
        littleEndian = littleEndian.toUpperCase();
        if (value > 0xffffffffffffffffn) {
            throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${0xffffffffffffffffn}. Received ${value}`);
        }
        if (littleEndian === "LE") {
            buffer[offset] = Number(value & 0xffn);
            buffer[offset + 1] = Number((value >> 8n) & 0xffn);
            buffer[offset + 2] = Number((value >> 16n) & 0xffn);
            buffer[offset + 3] = Number((value >> 24n) & 0xffn);
            buffer[offset + 4] = Number((value >> 32n) & 0xffn);
            buffer[offset + 5] = Number((value >> 40n) & 0xffn);
            buffer[offset + 6] = Number((value >> 48n) & 0xffn);
            buffer[offset + 7] = Number((value >> 56n) & 0xffn);
        }
        else {
            buffer[offset] = Number((value >> 56n) & 0xffn);
            buffer[offset + 1] = Number((value >> 48n) & 0xffn);
            buffer[offset + 2] = Number((value >> 40n) & 0xffn);
            buffer[offset + 3] = Number((value >> 32n) & 0xffn);
            buffer[offset + 4] = Number((value >> 24n) & 0xffn);
            buffer[offset + 5] = Number((value >> 16n) & 0xffn);
            buffer[offset + 6] = Number((value >> 8n) & 0xffn);
            buffer[offset + 7] = Number(value & 0xffn);
        }
        return offset + 8;
    }
    function readUInt8(buffer, offset) {
        if (offset + 1 > buffer.length) {
            throw new Error("Offset is outside the bounds of Uint8Array");
        }
        return buffer[offset];
    }
    function readUInt16$1(buffer, offset, littleEndian) {
        if (offset + 2 > buffer.length) {
            throw new Error("Offset is outside the bounds of Uint8Array");
        }
        littleEndian = littleEndian.toUpperCase();
        if (littleEndian === "LE") {
            let num = 0;
            num = (num << 8) + buffer[offset + 1];
            num = (num << 8) + buffer[offset];
            return num;
        }
        else {
            let num = 0;
            num = (num << 8) + buffer[offset];
            num = (num << 8) + buffer[offset + 1];
            return num;
        }
    }
    function readUInt32$1(buffer, offset, littleEndian) {
        if (offset + 4 > buffer.length) {
            throw new Error("Offset is outside the bounds of Uint8Array");
        }
        littleEndian = littleEndian.toUpperCase();
        if (littleEndian === "LE") {
            let num = 0;
            num = ((num << 8) + buffer[offset + 3]) >>> 0;
            num = ((num << 8) + buffer[offset + 2]) >>> 0;
            num = ((num << 8) + buffer[offset + 1]) >>> 0;
            num = ((num << 8) + buffer[offset]) >>> 0;
            return num;
        }
        else {
            let num = 0;
            num = ((num << 8) + buffer[offset]) >>> 0;
            num = ((num << 8) + buffer[offset + 1]) >>> 0;
            num = ((num << 8) + buffer[offset + 2]) >>> 0;
            num = ((num << 8) + buffer[offset + 3]) >>> 0;
            return num;
        }
    }
    function writeInt32(buffer, offset, value, littleEndian) {
        if (offset + 4 > buffer.length) {
            throw new Error("Offset is outside the bounds of Uint8Array");
        }
        if (value > 0x7fffffff || value < -2147483648) {
            throw new Error(`The value of "value" is out of range. It must be >= ${ -2147483648} and <= ${0x7fffffff}. Received ${value}`);
        }
        littleEndian = littleEndian.toUpperCase();
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
        return offset + 4;
    }
    function writeInt64(buffer, offset, value, littleEndian) {
        if (offset + 8 > buffer.length) {
            throw new Error("Offset is outside the bounds of Uint8Array");
        }
        if (value > 0x7fffffffffffffffn || value < -0x8000000000000000n) {
            throw new Error(`The value of "value" is out of range. It must be >= ${-0x8000000000000000n} and <= ${0x7fffffffffffffffn}. Received ${value}`);
        }
        littleEndian = littleEndian.toUpperCase();
        if (littleEndian === "LE") {
            buffer[offset] = Number(value & 0xffn);
            buffer[offset + 1] = Number((value >> 8n) & 0xffn);
            buffer[offset + 2] = Number((value >> 16n) & 0xffn);
            buffer[offset + 3] = Number((value >> 24n) & 0xffn);
            buffer[offset + 4] = Number((value >> 32n) & 0xffn);
            buffer[offset + 5] = Number((value >> 40n) & 0xffn);
            buffer[offset + 6] = Number((value >> 48n) & 0xffn);
            buffer[offset + 7] = Number((value >> 56n) & 0xffn);
        }
        else {
            buffer[offset] = Number((value >> 56n) & 0xffn);
            buffer[offset + 1] = Number((value >> 48n) & 0xffn);
            buffer[offset + 2] = Number((value >> 40n) & 0xffn);
            buffer[offset + 3] = Number((value >> 32n) & 0xffn);
            buffer[offset + 4] = Number((value >> 24n) & 0xffn);
            buffer[offset + 5] = Number((value >> 16n) & 0xffn);
            buffer[offset + 6] = Number((value >> 8n) & 0xffn);
            buffer[offset + 7] = Number(value & 0xffn);
        }
        return offset + 8;
    }
    function readInt32(buffer, offset, littleEndian) {
        if (offset + 4 > buffer.length) {
            throw new Error("Offset is outside the bounds of Uint8Array");
        }
        littleEndian = littleEndian.toUpperCase();
        if (littleEndian === "LE") {
            const val = buffer[offset] +
                (buffer[offset + 1] << 8) +
                (buffer[offset + 2] << 16) +
                ((buffer[offset + 3] << 24) >>> 0);
            return buffer[offset + 3] <= 0x7f ? val : val - 0x100000000;
        }
        else {
            const val = ((buffer[offset] << 24) >>> 0) +
                (buffer[offset + 1] << 16) +
                (buffer[offset + 2] << 8) +
                buffer[offset + 3];
            return buffer[offset] <= 0x7f ? val : val - 0x100000000;
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
            return buffer[offset + 7] <= 0x7f ? num : num - 0x10000000000000000n;
        }
        else {
            let num = 0n;
            num = (num << 8n) + BigInt(buffer[offset]);
            num = (num << 8n) + BigInt(buffer[offset + 1]);
            num = (num << 8n) + BigInt(buffer[offset + 2]);
            num = (num << 8n) + BigInt(buffer[offset + 3]);
            num = (num << 8n) + BigInt(buffer[offset + 4]);
            num = (num << 8n) + BigInt(buffer[offset + 5]);
            num = (num << 8n) + BigInt(buffer[offset + 6]);
            num = (num << 8n) + BigInt(buffer[offset + 7]);
            return buffer[offset] <= 0x7f ? num : num - 0x10000000000000000n;
        }
    }

    /**
     * Calculates the encoding length of a number used for push data in Bitcoin transactions.
     * @param i The number to calculate the encoding length for.
     * @returns The encoding length of the number.
     */
    function encodingLength$1(i) {
      return i < OPS$7.OP_PUSHDATA1 ? 1 : i <= 0xff ? 2 : i <= 0xffff ? 3 : 5;
    }
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
    function encode$h(buffer, num, offset) {
      const size = encodingLength$1(num);
      // ~6 bit
      if (size === 1) {
        writeUInt8(buffer, offset, num);
        // 8 bit
      } else if (size === 2) {
        writeUInt8(buffer, offset, OPS$7.OP_PUSHDATA1);
        writeUInt8(buffer, offset + 1, num);
        // 16 bit
      } else if (size === 3) {
        writeUInt8(buffer, offset, OPS$7.OP_PUSHDATA2);
        writeUInt16$1(buffer, offset + 1, num, 'LE');
        // 32 bit
      } else {
        writeUInt8(buffer, offset, OPS$7.OP_PUSHDATA4);
        writeUInt32$1(buffer, offset + 1, num, 'LE');
      }
      return size;
    }
    /**
     * Decodes a buffer and returns information about the opcode, number, and size.
     * @param buffer - The buffer to decode.
     * @param offset - The offset within the buffer to start decoding.
     * @returns An object containing the opcode, number, and size, or null if decoding fails.
     */
    function decode$g(buffer, offset) {
      const opcode = readUInt8(buffer, offset);
      let num;
      let size;
      // ~6 bit
      if (opcode < OPS$7.OP_PUSHDATA1) {
        num = opcode;
        size = 1;
        // 8 bit
      } else if (opcode === OPS$7.OP_PUSHDATA1) {
        if (offset + 2 > buffer.length) return null;
        num = readUInt8(buffer, offset + 1);
        size = 2;
        // 16 bit
      } else if (opcode === OPS$7.OP_PUSHDATA2) {
        if (offset + 3 > buffer.length) return null;
        num = readUInt16$1(buffer, offset + 1, 'LE');
        size = 3;
        // 32 bit
      } else {
        if (offset + 5 > buffer.length) return null;
        if (opcode !== OPS$7.OP_PUSHDATA4) throw new Error('Unexpected opcode');
        num = readUInt32$1(buffer, offset + 1, 'LE');
        size = 5;
      }
      return {
        opcode,
        number: num,
        size,
      };
    }

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
    function decode$f(buffer, maxLength, minimal) {
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
        const a = readUInt32$1(buffer, 0, 'LE');
        const b = readUInt8(buffer, 4);
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
     * Encodes a number into a Uint8Array using a specific format.
     *
     * @param _number - The number to encode.
     * @returns The encoded number as a Uint8Array.
     */
    function encode$g(_number) {
      let value = Math.abs(_number);
      const size = scriptNumSize(value);
      const buffer = new Uint8Array(size);
      const negative = _number < 0;
      for (let i = 0; i < size; ++i) {
        writeUInt8(buffer, i, value & 0xff);
        value >>= 8;
      }
      if (buffer[size - 1] & 0x80) {
        writeUInt8(buffer, size - 1, negative ? 0x80 : 0x00);
      } else if (negative) {
        buffer[size - 1] |= 0x80;
      }
      return buffer;
    }

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
    		lang: store$4?.lang,
    		message: config$1?.message,
    		abortEarly: store$4?.abortEarly,
    		abortPipeEarly: store$4?.abortPipeEarly
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
    //#region src/actions/everyItem/everyItem.ts
    /* @__NO_SIDE_EFFECTS__ */
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
    //#region src/methods/is/is.ts
    /**
    * Checks if the input matches the schema. By using a type predicate, this
    * function can be used as a type guard.
    *
    * @param schema The schema to be used.
    * @param input The input to be tested.
    *
    * @returns Whether the input matches the schema.
    */
    /* @__NO_SIDE_EFFECTS__ */
    function is(schema, input) {
    	return !schema["~run"]({ value: input }, { abortEarly: true }).issues;
    }

    //#endregion
    //#region src/schemas/any/any.ts
    /**
    * Creates an any schema.
    *
    * Hint: This schema function exists only for completeness and is not
    * recommended in practice. Instead, `unknown` should be used to accept
    * unknown data.
    *
    * @returns An any schema.
    */
    /* @__NO_SIDE_EFFECTS__ */
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

    //#endregion
    //#region src/schemas/array/array.ts
    /* @__NO_SIDE_EFFECTS__ */
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

    //#endregion
    //#region src/schemas/bigint/bigint.ts
    /* @__NO_SIDE_EFFECTS__ */
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

    //#endregion
    //#region src/schemas/custom/custom.ts
    /* @__NO_SIDE_EFFECTS__ */
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
    //#region src/schemas/nullable/nullable.ts
    /* @__NO_SIDE_EFFECTS__ */
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

    //#endregion
    //#region src/schemas/nullish/nullish.ts
    /* @__NO_SIDE_EFFECTS__ */
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
    //#region src/schemas/tuple/tuple.ts
    /* @__NO_SIDE_EFFECTS__ */
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
    //#region src/methods/partial/partial.ts
    /* @__NO_SIDE_EFFECTS__ */
    function partial(schema, keys) {
    	const entries$1 = {};
    	for (const key in schema.entries) entries$1[key] = /* @__PURE__ */ optional(schema.entries[key]) ;
    	return {
    		...schema,
    		entries: entries$1,
    		get "~standard"() {
    			return /* @__PURE__ */ _getStandardProps(this);
    		}
    	};
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

    const ZERO32 = new Uint8Array(32);
    const EC_P = fromHex(
      'fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f',
    );
    const NBufferSchemaFactory = size =>
      pipe(instance(Uint8Array), length(size));
    /**
     * Checks if two arrays of Buffers are equal.
     * @param a - The first array of Buffers.
     * @param b - The second array of Buffers.
     * @returns True if the arrays are equal, false otherwise.
     */
    function stacksEqual(a, b) {
      if (a.length !== b.length) return false;
      return a.every((x, i) => {
        return compare(x, b[i]) === 0;
      });
    }
    /**
     * Checks if the given value is a valid elliptic curve point.
     * @param p - The value to check.
     * @returns True if the value is a valid elliptic curve point, false otherwise.
     */
    function isPoint(p) {
      if (!(p instanceof Uint8Array)) return false;
      if (p.length < 33) return false;
      const t = p[0];
      const x = p.slice(1, 33);
      if (compare(ZERO32, x) === 0) return false;
      if (compare(x, EC_P) >= 0) return false;
      if ((t === 0x02 || t === 0x03) && p.length === 33) {
        return true;
      }
      const y = p.slice(33);
      if (compare(ZERO32, y) === 0) return false;
      if (compare(y, EC_P) >= 0) return false;
      if (t === 0x04 && p.length === 65) return true;
      return false;
    }
    const TAPLEAF_VERSION_MASK = 0xfe;
    function isTapleaf(o) {
      if (!o || !('output' in o)) return false;
      if (!(o.output instanceof Uint8Array)) return false;
      if (o.version !== undefined)
        return (o.version & TAPLEAF_VERSION_MASK) === o.version;
      return true;
    }
    function isTaptree(scriptTree) {
      if (!Array.isArray(scriptTree)) return isTapleaf(scriptTree);
      if (scriptTree.length !== 2) return false;
      return scriptTree.every(t => isTaptree(t));
    }
    const Buffer256bitSchema = NBufferSchemaFactory(32);
    const Hash160bitSchema = NBufferSchemaFactory(20);
    const Hash256bitSchema = NBufferSchemaFactory(32);
    const BufferSchema = instance(Uint8Array);
    const UInt8Schema = pipe(
      number(),
      integer(),
      minValue(0),
      maxValue(0xff),
    );
    const UInt32Schema = pipe(
      number(),
      integer(),
      minValue(0),
      maxValue(0xffffffff),
    );
    const SatoshiSchema = pipe(
      bigint(),
      minValue(0n),
      maxValue(0x7fffffffffffffffn),
    );
    const NullablePartial = a =>
      object(
        Object.entries(a).reduce(
          (acc, next) => ({ ...acc, [next[0]]: nullish(next[1]) }),
          {},
        ),
      );

    const ZERO$1 = new Uint8Array(1);
    /**
     * Converts a buffer to a DER-encoded buffer.
     * @param x - The buffer to be converted.
     * @returns The DER-encoded buffer.
     */
    function toDER(x) {
      let i = 0;
      while (x[i] === 0) ++i;
      if (i === x.length) return ZERO$1;
      x = x.slice(i);
      if (x[0] & 0x80) return concat([ZERO$1, x]);
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
      const buffer = new Uint8Array(32);
      const bstart = Math.max(0, 32 - x.length);
      buffer.set(x, bstart);
      return buffer;
    }
    // BIP62: 1 byte hashType flag (only 0x01, 0x02, 0x03, 0x81, 0x82 and 0x83 are allowed)
    /**
     * Decodes a buffer into a ScriptSignature object.
     * @param buffer - The buffer to decode.
     * @returns The decoded ScriptSignature object.
     * @throws Error if the hashType is invalid.
     */
    function decode$e(buffer) {
      const hashType = readUInt8(buffer, buffer.length - 1);
      if (!isDefinedHashType(hashType)) {
        throw new Error('Invalid hashType ' + hashType);
      }
      const decoded = decode$h(buffer.subarray(0, -1));
      const r = fromDER(decoded.r);
      const s = fromDER(decoded.s);
      const signature = concat([r, s]);
      return { signature, hashType };
    }
    /**
     * Encodes a signature and hash type into a buffer.
     * @param signature - The signature to encode.
     * @param hashType - The hash type to encode.
     * @returns The encoded buffer.
     * @throws Error if the hashType is invalid.
     */
    function encode$f(signature, hashType) {
      parse(
        object({
          signature: NBufferSchemaFactory(64),
          hashType: UInt8Schema,
        }),
        { signature, hashType },
      );
      if (!isDefinedHashType(hashType)) {
        throw new Error('Invalid hashType ' + hashType);
      }
      const hashTypeBuffer = new Uint8Array(1);
      writeUInt8(hashTypeBuffer, 0, hashType);
      const r = toDER(signature.slice(0, 32));
      const s = toDER(signature.slice(32, 64));
      return concat([encode$i(r, s), hashTypeBuffer]);
    }

    var scriptSignature = /*#__PURE__*/Object.freeze({
        __proto__: null,
        decode: decode$e,
        encode: encode$f
    });

    /**
     * Script tools module for working with Bitcoin scripts.
     * Provides utilities such as decompiling, compiling, converting to/from ASM, stack manipulation,
     * and script validation functions.
     *
     * @packageDocumentation
     */
    /** Base opcode for OP_INT values. */
    const OP_INT_BASE$1 = OPS$7.OP_RESERVED; // OP_1 - 1
    /** Validation schema for a Bitcoin script stack. */
    const StackSchema = array(union([instance(Uint8Array), number()]));
    /**
     * Determines if a value corresponds to an OP_INT opcode.
     *
     * @param value - The opcode to check.
     * @returns True if the value is an OP_INT, false otherwise.
     */
    function isOPInt(value) {
      return (
        is(number(), value) &&
        (value === OPS$7.OP_0 ||
          (value >= OPS$7.OP_1 && value <= OPS$7.OP_16) ||
          value === OPS$7.OP_1NEGATE)
      );
    }
    /**
     * Checks if a script chunk is push-only (contains only data or OP_INT opcodes).
     *
     * @param value - The chunk to check.
     * @returns True if the chunk is push-only, false otherwise.
     */
    function isPushOnlyChunk(value) {
      return is(BufferSchema, value) || isOPInt(value);
    }
    /**
     * Determines if a stack consists of only push operations.
     *
     * @param value - The stack to check.
     * @returns True if all elements in the stack are push-only, false otherwise.
     */
    function isPushOnly(value) {
      return is(pipe(any(), everyItem(isPushOnlyChunk)), value);
    }
    /**
     * Counts the number of non-push-only opcodes in a stack.
     *
     * @param value - The stack to analyze.
     * @returns The count of non-push-only opcodes.
     */
    function countNonPushOnlyOPs(value) {
      return value.length - value.filter(isPushOnlyChunk).length;
    }
    /**
     * Converts a minimal script buffer to its corresponding opcode, if applicable.
     *
     * @param buffer - The buffer to check.
     * @returns The corresponding opcode or undefined if not minimal.
     */
    function asMinimalOP(buffer) {
      if (buffer.length === 0) return OPS$7.OP_0;
      if (buffer.length !== 1) return;
      if (buffer[0] >= 1 && buffer[0] <= 16) return OP_INT_BASE$1 + buffer[0];
      if (buffer[0] === 0x81) return OPS$7.OP_1NEGATE;
    }
    /**
     * Determines if a buffer or stack is a Uint8Array.
     *
     * @param buf - The buffer or stack to check.
     * @returns True if the input is a Uint8Array, false otherwise.
     */
    function chunksIsBuffer(buf) {
      return buf instanceof Uint8Array;
    }
    /**
     * Determines if a buffer or stack is a valid stack.
     *
     * @param buf - The buffer or stack to check.
     * @returns True if the input is a stack, false otherwise.
     */
    function chunksIsArray(buf) {
      return is(StackSchema, buf);
    }
    /**
     * Determines if a single chunk is a Uint8Array.
     *
     * @param buf - The chunk to check.
     * @returns True if the chunk is a Uint8Array, false otherwise.
     */
    function singleChunkIsBuffer(buf) {
      return buf instanceof Uint8Array;
    }
    /**
     * Compiles an array of script chunks into a Uint8Array.
     *
     * @param chunks - The chunks to compile.
     * @returns The compiled script as a Uint8Array.
     * @throws Error if compilation fails.
     */
    function compile(chunks) {
      if (chunksIsBuffer(chunks)) return chunks;
      parse(StackSchema, chunks);
      const bufferSize = chunks.reduce((accum, chunk) => {
        if (singleChunkIsBuffer(chunk)) {
          // adhere to BIP62.3, minimal push policy
          if (chunk.length === 1 && asMinimalOP(chunk) !== undefined) {
            return accum + 1;
          }
          return accum + encodingLength$1(chunk.length) + chunk.length;
        }
        return accum + 1;
      }, 0);
      const buffer = new Uint8Array(bufferSize);
      let offset = 0;
      chunks.forEach(chunk => {
        if (singleChunkIsBuffer(chunk)) {
          // adhere to BIP62.3, minimal push policy
          const opcode = asMinimalOP(chunk);
          if (opcode !== undefined) {
            writeUInt8(buffer, offset, opcode);
            offset += 1;
            return;
          }
          offset += encode$h(buffer, chunk.length, offset);
          buffer.set(chunk, offset);
          offset += chunk.length;
          // opcode
        } else {
          writeUInt8(buffer, offset, chunk);
          offset += 1;
        }
      });
      if (offset !== buffer.length) throw new Error('Could not decode chunks');
      return buffer;
    }
    /**
     * Decompiles a script buffer into an array of chunks.
     *
     * @param buffer - The script buffer to decompile.
     * @returns The decompiled chunks or null if decompilation fails.
     */
    function decompile(buffer) {
      if (chunksIsArray(buffer)) return buffer;
      parse(BufferSchema, buffer);
      const chunks = [];
      let i = 0;
      while (i < buffer.length) {
        const opcode = buffer[i];
        if (opcode > OPS$7.OP_0 && opcode <= OPS$7.OP_PUSHDATA4) {
          const d = decode$g(buffer, i);
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
        } else {
          chunks.push(opcode);
          i += 1;
        }
      }
      return chunks;
    }
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
          if (singleChunkIsBuffer(chunk)) {
            const op = asMinimalOP(chunk);
            if (op === undefined) return toHex(chunk);
            chunk = op;
          }
          // opcode!
          return OPS$7[chunk];
        })
        .join(' ');
    }
    /**
     * Converts the given chunks into a stack of buffers.
     *
     * @param chunks - The chunks to convert.
     * @returns The stack of buffers.
     */
    function toStack(chunks) {
      chunks = decompile(chunks);
      parse(custom(isPushOnly), chunks);
      return chunks.map(op => {
        if (singleChunkIsBuffer(op)) return op;
        if (op === OPS$7.OP_0) return new Uint8Array(0);
        return encode$g(op - OP_INT_BASE$1);
      });
    }
    /**
     * Checks if the provided buffer is a canonical public key.
     *
     * @param buffer - The buffer to check, expected to be a Uint8Array.
     * @returns A boolean indicating whether the buffer is a canonical public key.
     */
    function isCanonicalPubKey(buffer) {
      return isPoint(buffer);
    }
    /**
     * Checks if the provided hash type is defined.
     *
     * A hash type is considered defined if its modified value (after masking with ~0x80)
     * is greater than 0x00 and less than 0x04.
     *
     * @param hashType - The hash type to check.
     * @returns True if the hash type is defined, false otherwise.
     */
    function isDefinedHashType(hashType) {
      const hashTypeMod = hashType & -129;
      return hashTypeMod > 0x00 && hashTypeMod < 0x04;
    }
    /**
     * Checks if the provided buffer is a canonical script signature.
     *
     * A canonical script signature is a valid DER-encoded signature followed by a valid hash type byte.
     *
     * @param buffer - The buffer to check.
     * @returns `true` if the buffer is a canonical script signature, `false` otherwise.
     */
    function isCanonicalScriptSignature(buffer) {
      if (!(buffer instanceof Uint8Array)) return false;
      if (!isDefinedHashType(buffer[buffer.length - 1])) return false;
      return check$d(buffer.slice(0, -1));
    }
    const signature = scriptSignature;

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
    function value(f) {
      let _value;
      return () => {
        if (_value !== undefined) return _value;
        _value = f();
        return _value;
      };
    }

    const OPS$6 = OPS$7;
    const OP_INT_BASE = OPS$6.OP_RESERVED; // OP_1 - 1
    function encodeSmallOrScriptNum(n) {
      return n <= 16 ? OP_INT_BASE + n : encode$g(n);
    }
    function decodeSmallOrScriptNum(chunk) {
      if (typeof chunk === 'number') {
        const val = chunk - OP_INT_BASE;
        if (val < 1 || val > 16)
          throw new TypeError(`Invalid opcode: expected OP_1–OP_16, got ${chunk}`);
        return val;
      } else return decode$f(chunk);
    }
    function isSmallOrScriptNum(chunk) {
      if (typeof chunk === 'number')
        return chunk - OP_INT_BASE >= 1 && chunk - OP_INT_BASE <= 16;
      else return Number.isInteger(decode$f(chunk));
    }
    // input: OP_0 [signatures ...]
    // output: m [pubKeys ...] n OP_CHECKMULTISIG
    /**
     * Represents a function that creates a Pay-to-Multisig (P2MS) payment object.
     * @param a - The payment object.
     * @param opts - Optional payment options.
     * @returns The created payment object.
     * @throws {TypeError} If the provided data is not valid.
     */
    function p2ms(a, opts) {
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
          isCanonicalScriptSignature(x) ||
          (opts.allowIncomplete && x === OPS$6.OP_0) !== undefined
        );
      }
      parse(
        partial(
          object({
            network: object({}),
            m: number(),
            n: number(),
            output: BufferSchema,
            pubkeys: array(custom(isPoint), 'Received invalid pubkey'),
            signatures: array(
              custom(isAcceptableSignature),
              'Expected signature to be of type isAcceptableSignature',
            ),
            input: BufferSchema,
          }),
        ),
        a,
      );
      const network = a.network || bitcoin;
      const o = { network };
      let chunks = [];
      let decoded = false;
      function decode(output) {
        if (decoded) return;
        decoded = true;
        chunks = decompile(output);
        if (chunks.length < 3) throw new TypeError('Output is invalid');
        o.m = decodeSmallOrScriptNum(chunks[0]);
        o.n = decodeSmallOrScriptNum(chunks[chunks.length - 2]);
        o.pubkeys = chunks.slice(1, -2);
      }
      prop(o, 'output', () => {
        if (!a.m) return;
        if (!o.n) return;
        if (!a.pubkeys) return;
        return compile(
          [].concat(
            encodeSmallOrScriptNum(a.m),
            a.pubkeys,
            encodeSmallOrScriptNum(o.n),
            OPS$6.OP_CHECKMULTISIG,
          ),
        );
      });
      prop(o, 'm', () => {
        if (!o.output) return;
        decode(o.output);
        return o.m;
      });
      prop(o, 'n', () => {
        if (!o.pubkeys) return;
        return o.pubkeys.length;
      });
      prop(o, 'pubkeys', () => {
        if (!a.output) return;
        decode(a.output);
        return o.pubkeys;
      });
      prop(o, 'signatures', () => {
        if (!a.input) return;
        return decompile(a.input).slice(1);
      });
      prop(o, 'input', () => {
        if (!a.signatures) return;
        return compile([OPS$6.OP_0].concat(a.signatures));
      });
      prop(o, 'witness', () => {
        if (!o.input) return;
        return [];
      });
      prop(o, 'name', () => {
        if (!o.m || !o.n) return;
        return `p2ms(${o.m} of ${o.n})`;
      });
      // extended validation
      if (opts.validate) {
        if (a.output) {
          decode(a.output);
          if (!isSmallOrScriptNum(chunks[0]))
            throw new TypeError('Output is invalid');
          if (!isSmallOrScriptNum(chunks[chunks.length - 2]))
            throw new TypeError('Output is invalid');
          if (chunks[chunks.length - 1] !== OPS$6.OP_CHECKMULTISIG)
            throw new TypeError('Output is invalid');
          if (o.m <= 0 || o.n > 20 || o.m > o.n || o.n !== chunks.length - 3)
            throw new TypeError('Output is invalid');
          if (!o.pubkeys.every(x => isPoint(x)))
            throw new TypeError('Output is invalid');
          if (a.m !== undefined && a.m !== o.m) throw new TypeError('m mismatch');
          if (a.n !== undefined && a.n !== o.n) throw new TypeError('n mismatch');
          if (a.pubkeys && !stacksEqual(a.pubkeys, o.pubkeys))
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
          if (a.input[0] !== OPS$6.OP_0) throw new TypeError('Input is invalid');
          if (
            o.signatures.length === 0 ||
            !o.signatures.every(isAcceptableSignature)
          )
            throw new TypeError('Input has invalid signature(s)');
          if (a.signatures && !stacksEqual(a.signatures, o.signatures))
            throw new TypeError('Signature mismatch');
          if (a.m !== undefined && a.m !== a.signatures.length)
            throw new TypeError('Signature count mismatch');
        }
      }
      return Object.assign(o, a);
    }

    const OPS$5 = OPS$7;
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
    function p2pk(a, opts) {
      if (!a.input && !a.output && !a.pubkey && !a.input && !a.signature)
        throw new TypeError('Not enough data');
      opts = Object.assign({ validate: true }, opts || {});
      parse(
        partial(
          object({
            network: object({}),
            output: BufferSchema,
            pubkey: custom(isPoint, 'invalid pubkey'),
            signature: custom(
              isCanonicalScriptSignature,
              'Expected signature to be of type isCanonicalScriptSignature',
            ),
            input: BufferSchema,
          }),
        ),
        a,
      );
      const _chunks = value(() => {
        return decompile(a.input);
      });
      const network = a.network || bitcoin;
      const o = { name: 'p2pk', network };
      prop(o, 'output', () => {
        if (!a.pubkey) return;
        return compile([a.pubkey, OPS$5.OP_CHECKSIG]);
      });
      prop(o, 'pubkey', () => {
        if (!a.output) return;
        return a.output.slice(1, -1);
      });
      prop(o, 'signature', () => {
        if (!a.input) return;
        return _chunks()[0];
      });
      prop(o, 'input', () => {
        if (!a.signature) return;
        return compile([a.signature]);
      });
      prop(o, 'witness', () => {
        if (!o.input) return;
        return [];
      });
      // extended validation
      if (opts.validate) {
        if (a.output) {
          if (a.output[a.output.length - 1] !== OPS$5.OP_CHECKSIG)
            throw new TypeError('Output is invalid');
          if (!isPoint(o.pubkey)) throw new TypeError('Output pubkey is invalid');
          if (a.pubkey && compare(a.pubkey, o.pubkey) !== 0)
            throw new TypeError('Pubkey mismatch');
        }
        if (a.signature) {
          if (a.input && compare(a.input, o.input) !== 0)
            throw new TypeError('Signature mismatch');
        }
        if (a.input) {
          if (_chunks().length !== 1) throw new TypeError('Input is invalid');
          if (!isCanonicalScriptSignature(o.signature))
            throw new TypeError('Input has invalid signature');
        }
      }
      return Object.assign(o, a);
    }

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
    /** The rotate left (circular left shift) operation for uint32 */
    function rotl(word, shift) {
        return (word << shift) | ((word >>> (32 - shift)) >>> 0);
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

    SHA1 (RFC 3174), MD5 (RFC 1321) and RIPEMD160 (RFC 2286) legacy, weak hash functions.
    Don't use them in a new protocol. What "weak" means:

    - Collisions can be made with 2^18 effort in MD5, 2^60 in SHA1, 2^80 in RIPEMD160.
    - No practical pre-image attacks (only theoretical, 2^123.4)
    - HMAC seems kinda ok: https://datatracker.ietf.org/doc/html/rfc6151
     * @module
     */
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
    class RIPEMD160 extends HashMD {
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
     * * https://homes.esat.kuleuven.be/~bosselae/ripemd160.html
     * * https://homes.esat.kuleuven.be/~bosselae/ripemd160/pdf/AB-9601/AB-9601.pdf
     */
    const ripemd160$1 = /* @__PURE__ */ createHasher(() => new RIPEMD160());

    /**
     * RIPEMD-160 legacy hash function.
     * https://homes.esat.kuleuven.be/~bosselae/ripemd160.html
     * https://homes.esat.kuleuven.be/~bosselae/ripemd160/pdf/AB-9601/AB-9601.pdf
     * @module
     * @deprecated
     */
    /** @deprecated Use import from `noble/hashes/legacy` module */
    const ripemd160 = ripemd160$1;

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

    /**
     * A module for hashing functions.
     * include ripemd160、sha1、sha256、hash160、hash256、taggedHash
     *
     * @packageDocumentation
     */
    /**
     * Computes the HASH160 (RIPEMD-160 after SHA-256) of the given buffer.
     *
     * @param buffer - The input data to be hashed.
     * @returns The HASH160 of the input buffer.
     */
    function hash160(buffer) {
      return ripemd160(sha256(buffer));
    }
    /**
     * Computes the double SHA-256 hash of the given buffer.
     *
     * @param buffer - The input data to be hashed.
     * @returns The double SHA-256 hash of the input buffer.
     */
    function hash256(buffer) {
      return sha256(sha256(buffer));
    }
    /**
     * A collection of tagged hash prefixes used in various BIP (Bitcoin Improvement Proposals)
     * and Taproot-related operations. Each prefix is represented as a `Uint8Array`.
     *
     * @constant
     * @type {TaggedHashPrefixes}
     *
     * @property {'BIP0340/challenge'} - Prefix for BIP0340 challenge.
     * @property {'BIP0340/aux'} - Prefix for BIP0340 auxiliary data.
     * @property {'BIP0340/nonce'} - Prefix for BIP0340 nonce.
     * @property {TapLeaf} - Prefix for Taproot leaf.
     * @property {TapBranch} - Prefix for Taproot branch.
     * @property {TapSighash} - Prefix for Taproot sighash.
     * @property {TapTweak} - Prefix for Taproot tweak.
     * @property {'KeyAgg list'} - Prefix for key aggregation list.
     * @property {'KeyAgg coefficient'} - Prefix for key aggregation coefficient.
     */
    const TAGGED_HASH_PREFIXES = {
      'BIP0340/challenge': Uint8Array.from([
        123, 181, 45, 122, 159, 239, 88, 50, 62, 177, 191, 122, 64, 125, 179, 130,
        210, 243, 242, 216, 27, 177, 34, 79, 73, 254, 81, 143, 109, 72, 211, 124,
        123, 181, 45, 122, 159, 239, 88, 50, 62, 177, 191, 122, 64, 125, 179, 130,
        210, 243, 242, 216, 27, 177, 34, 79, 73, 254, 81, 143, 109, 72, 211, 124,
      ]),
      'BIP0340/aux': Uint8Array.from([
        241, 239, 78, 94, 192, 99, 202, 218, 109, 148, 202, 250, 157, 152, 126, 160,
        105, 38, 88, 57, 236, 193, 31, 151, 45, 119, 165, 46, 216, 193, 204, 144,
        241, 239, 78, 94, 192, 99, 202, 218, 109, 148, 202, 250, 157, 152, 126, 160,
        105, 38, 88, 57, 236, 193, 31, 151, 45, 119, 165, 46, 216, 193, 204, 144,
      ]),
      'BIP0340/nonce': Uint8Array.from([
        7, 73, 119, 52, 167, 155, 203, 53, 91, 155, 140, 125, 3, 79, 18, 28, 244,
        52, 215, 62, 247, 45, 218, 25, 135, 0, 97, 251, 82, 191, 235, 47, 7, 73,
        119, 52, 167, 155, 203, 53, 91, 155, 140, 125, 3, 79, 18, 28, 244, 52, 215,
        62, 247, 45, 218, 25, 135, 0, 97, 251, 82, 191, 235, 47,
      ]),
      TapLeaf: Uint8Array.from([
        174, 234, 143, 220, 66, 8, 152, 49, 5, 115, 75, 88, 8, 29, 30, 38, 56, 211,
        95, 28, 181, 64, 8, 212, 211, 87, 202, 3, 190, 120, 233, 238, 174, 234, 143,
        220, 66, 8, 152, 49, 5, 115, 75, 88, 8, 29, 30, 38, 56, 211, 95, 28, 181,
        64, 8, 212, 211, 87, 202, 3, 190, 120, 233, 238,
      ]),
      TapBranch: Uint8Array.from([
        25, 65, 161, 242, 229, 110, 185, 95, 162, 169, 241, 148, 190, 92, 1, 247,
        33, 111, 51, 237, 130, 176, 145, 70, 52, 144, 208, 91, 245, 22, 160, 21, 25,
        65, 161, 242, 229, 110, 185, 95, 162, 169, 241, 148, 190, 92, 1, 247, 33,
        111, 51, 237, 130, 176, 145, 70, 52, 144, 208, 91, 245, 22, 160, 21,
      ]),
      TapSighash: Uint8Array.from([
        244, 10, 72, 223, 75, 42, 112, 200, 180, 146, 75, 242, 101, 70, 97, 237, 61,
        149, 253, 102, 163, 19, 235, 135, 35, 117, 151, 198, 40, 228, 160, 49, 244,
        10, 72, 223, 75, 42, 112, 200, 180, 146, 75, 242, 101, 70, 97, 237, 61, 149,
        253, 102, 163, 19, 235, 135, 35, 117, 151, 198, 40, 228, 160, 49,
      ]),
      TapTweak: Uint8Array.from([
        232, 15, 225, 99, 156, 156, 160, 80, 227, 175, 27, 57, 193, 67, 198, 62, 66,
        156, 188, 235, 21, 217, 64, 251, 181, 197, 161, 244, 175, 87, 197, 233, 232,
        15, 225, 99, 156, 156, 160, 80, 227, 175, 27, 57, 193, 67, 198, 62, 66, 156,
        188, 235, 21, 217, 64, 251, 181, 197, 161, 244, 175, 87, 197, 233,
      ]),
      'KeyAgg list': Uint8Array.from([
        72, 28, 151, 28, 60, 11, 70, 215, 240, 178, 117, 174, 89, 141, 78, 44, 126,
        215, 49, 156, 89, 74, 92, 110, 199, 158, 160, 212, 153, 2, 148, 240, 72, 28,
        151, 28, 60, 11, 70, 215, 240, 178, 117, 174, 89, 141, 78, 44, 126, 215, 49,
        156, 89, 74, 92, 110, 199, 158, 160, 212, 153, 2, 148, 240,
      ]),
      'KeyAgg coefficient': Uint8Array.from([
        191, 201, 4, 3, 77, 28, 136, 232, 200, 14, 34, 229, 61, 36, 86, 109, 100,
        130, 78, 214, 66, 114, 129, 192, 145, 0, 249, 77, 205, 82, 201, 129, 191,
        201, 4, 3, 77, 28, 136, 232, 200, 14, 34, 229, 61, 36, 86, 109, 100, 130,
        78, 214, 66, 114, 129, 192, 145, 0, 249, 77, 205, 82, 201, 129,
      ]),
    };
    /**
     * Computes a tagged hash using the specified prefix and data.
     *
     * @param prefix - The prefix to use for the tagged hash. This should be one of the values from the `TaggedHashPrefix` enum.
     * @param data - The data to hash, provided as a `Uint8Array`.
     * @returns The resulting tagged hash as a `Uint8Array`.
     */
    function taggedHash(prefix, data) {
      return sha256(concat([TAGGED_HASH_PREFIXES[prefix], data]));
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

    const OPS$4 = OPS$7;
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
    function p2pkh(a, opts) {
      if (!a.address && !a.hash && !a.output && !a.pubkey && !a.input)
        throw new TypeError('Not enough data');
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
            input: BufferSchema,
          }),
        ),
        a,
      );
      const _address = value(() => {
        const payload = bs58check.decode(a.address);
        const version = readUInt8(payload, 0);
        const hash = payload.slice(1);
        return { version, hash };
      });
      const _chunks = value(() => {
        return decompile(a.input);
      });
      const network = a.network || bitcoin;
      const o = { name: 'p2pkh', network };
      prop(o, 'address', () => {
        if (!o.hash) return;
        const payload = new Uint8Array(21);
        writeUInt8(payload, 0, network.pubKeyHash);
        payload.set(o.hash, 1);
        return bs58check.encode(payload);
      });
      prop(o, 'hash', () => {
        if (a.output) return a.output.slice(3, 23);
        if (a.address) return _address().hash;
        if (a.pubkey || o.pubkey) return hash160(a.pubkey || o.pubkey);
      });
      prop(o, 'output', () => {
        if (!o.hash) return;
        return compile([
          OPS$4.OP_DUP,
          OPS$4.OP_HASH160,
          o.hash,
          OPS$4.OP_EQUALVERIFY,
          OPS$4.OP_CHECKSIG,
        ]);
      });
      prop(o, 'pubkey', () => {
        if (!a.input) return;
        return _chunks()[1];
      });
      prop(o, 'signature', () => {
        if (!a.input) return;
        return _chunks()[0];
      });
      prop(o, 'input', () => {
        if (!a.pubkey) return;
        if (!a.signature) return;
        return compile([a.signature, a.pubkey]);
      });
      prop(o, 'witness', () => {
        if (!o.input) return;
        return [];
      });
      // extended validation
      if (opts.validate) {
        let hash = Uint8Array.from([]);
        if (a.address) {
          if (_address().version !== network.pubKeyHash)
            throw new TypeError('Invalid version or Network mismatch');
          if (_address().hash.length !== 20) throw new TypeError('Invalid address');
          hash = _address().hash;
        }
        if (a.hash) {
          if (hash.length > 0 && compare(hash, a.hash) !== 0)
            throw new TypeError('Hash mismatch');
          else hash = a.hash;
        }
        if (a.output) {
          if (
            a.output.length !== 25 ||
            a.output[0] !== OPS$4.OP_DUP ||
            a.output[1] !== OPS$4.OP_HASH160 ||
            a.output[2] !== 0x14 ||
            a.output[23] !== OPS$4.OP_EQUALVERIFY ||
            a.output[24] !== OPS$4.OP_CHECKSIG
          )
            throw new TypeError('Output is invalid');
          const hash2 = a.output.slice(3, 23);
          if (hash.length > 0 && compare(hash, hash2) !== 0)
            throw new TypeError('Hash mismatch');
          else hash = hash2;
        }
        if (a.pubkey) {
          const pkh = hash160(a.pubkey);
          if (hash.length > 0 && compare(hash, pkh) !== 0)
            throw new TypeError('Hash mismatch');
          else hash = pkh;
        }
        if (a.input) {
          const chunks = _chunks();
          if (chunks.length !== 2) throw new TypeError('Input is invalid');
          if (!isCanonicalScriptSignature(chunks[0]))
            throw new TypeError('Input has invalid signature');
          if (!isPoint(chunks[1])) throw new TypeError('Input has invalid pubkey');
          if (a.signature && compare(a.signature, chunks[0]) !== 0)
            throw new TypeError('Signature mismatch');
          if (a.pubkey && compare(a.pubkey, chunks[1]) !== 0)
            throw new TypeError('Pubkey mismatch');
          const pkh = hash160(chunks[1]);
          if (hash.length > 0 && compare(hash, pkh) !== 0)
            throw new TypeError('Hash mismatch');
        }
      }
      return Object.assign(o, a);
    }

    const OPS$3 = OPS$7;
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
    function p2sh(a, opts) {
      if (!a.address && !a.hash && !a.output && !a.redeem && !a.input)
        throw new TypeError('Not enough data');
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
                witness: array(BufferSchema),
              }),
            ),
            input: BufferSchema,
            witness: array(BufferSchema),
          }),
        ),
        a,
      );
      let network = a.network;
      if (!network) {
        network = (a.redeem && a.redeem.network) || bitcoin;
      }
      const o = { network };
      const _address = value(() => {
        const payload = bs58check.decode(a.address);
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
          output: lastChunk === OPS$3.OP_FALSE ? Uint8Array.from([]) : lastChunk,
          input: compile(chunks.slice(0, -1)),
          witness: a.witness || [],
        };
      });
      // output dependents
      prop(o, 'address', () => {
        if (!o.hash) return;
        const payload = new Uint8Array(21);
        writeUInt8(payload, 0, o.network.scriptHash);
        payload.set(o.hash, 1);
        return bs58check.encode(payload);
      });
      prop(o, 'hash', () => {
        // in order of least effort
        if (a.output) return a.output.slice(2, 22);
        if (a.address) return _address().hash;
        if (o.redeem && o.redeem.output) return hash160(o.redeem.output);
      });
      prop(o, 'output', () => {
        if (!o.hash) return;
        return compile([OPS$3.OP_HASH160, o.hash, OPS$3.OP_EQUAL]);
      });
      // input dependents
      prop(o, 'redeem', () => {
        if (!a.input) return;
        return _redeem();
      });
      prop(o, 'input', () => {
        if (!a.redeem || !a.redeem.input || !a.redeem.output) return;
        return compile(
          [].concat(decompile(a.redeem.input), a.redeem.output),
        );
      });
      prop(o, 'witness', () => {
        if (o.redeem && o.redeem.witness) return o.redeem.witness;
        if (o.input) return [];
      });
      prop(o, 'name', () => {
        const nameParts = ['p2sh'];
        if (o.redeem !== undefined && o.redeem.name !== undefined)
          nameParts.push(o.redeem.name);
        return nameParts.join('-');
      });
      if (opts.validate) {
        let hash = Uint8Array.from([]);
        if (a.address) {
          if (_address().version !== network.scriptHash)
            throw new TypeError('Invalid version or Network mismatch');
          if (_address().hash.length !== 20) throw new TypeError('Invalid address');
          hash = _address().hash;
        }
        if (a.hash) {
          if (hash.length > 0 && compare(hash, a.hash) !== 0)
            throw new TypeError('Hash mismatch');
          else hash = a.hash;
        }
        if (a.output) {
          if (
            a.output.length !== 23 ||
            a.output[0] !== OPS$3.OP_HASH160 ||
            a.output[1] !== 0x14 ||
            a.output[22] !== OPS$3.OP_EQUAL
          )
            throw new TypeError('Output is invalid');
          const hash2 = a.output.slice(2, 22);
          if (hash.length > 0 && compare(hash, hash2) !== 0)
            throw new TypeError('Hash mismatch');
          else hash = hash2;
        }
        // inlined to prevent 'no-inner-declarations' failing
        const checkRedeem = redeem => {
          // is the redeem output empty/invalid?
          if (redeem.output) {
            const decompile$1 = decompile(redeem.output);
            if (!decompile$1 || decompile$1.length < 1)
              throw new TypeError('Redeem.output too short');
            if (redeem.output.byteLength > 520)
              throw new TypeError(
                'Redeem.output unspendable if larger than 520 bytes',
              );
            if (countNonPushOnlyOPs(decompile$1) > 201)
              throw new TypeError(
                'Redeem.output unspendable with more than 201 non-push ops',
              );
            // match hash against other sources
            const hash2 = hash160(redeem.output);
            if (hash.length > 0 && compare(hash, hash2) !== 0)
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
              const richunks = decompile(redeem.input);
              if (!isPushOnly(richunks))
                throw new TypeError('Non push-only scriptSig');
            }
          }
        };
        if (a.input) {
          const chunks = _chunks();
          if (!chunks || chunks.length < 1) throw new TypeError('Input too short');
          if (!(_redeem().output instanceof Uint8Array))
            throw new TypeError('Input is invalid');
          checkRedeem(_redeem());
        }
        if (a.redeem) {
          if (a.redeem.network && a.redeem.network !== network)
            throw new TypeError('Network mismatch');
          if (a.input) {
            const redeem = _redeem();
            if (
              a.redeem.output &&
              compare(a.redeem.output, redeem.output) !== 0
            )
              throw new TypeError('Redeem.output mismatch');
            if (a.redeem.input && compare(a.redeem.input, redeem.input) !== 0)
              throw new TypeError('Redeem.input mismatch');
          }
          checkRedeem(a.redeem);
        }
        if (a.witness) {
          if (
            a.redeem &&
            a.redeem.witness &&
            !stacksEqual(a.redeem.witness, a.witness)
          )
            throw new TypeError('Witness and redeem.witness mismatch');
        }
      }
      return Object.assign(o, a);
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

    const OPS$2 = OPS$7;
    const EMPTY_BUFFER$2 = new Uint8Array(0);
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
    function p2wpkh(a, opts) {
      if (!a.address && !a.hash && !a.output && !a.pubkey && !a.witness)
        throw new TypeError('Not enough data');
      opts = Object.assign({ validate: true }, opts || {});
      parse(
        partial(
          object({
            address: string(),
            hash: NBufferSchemaFactory(20),
            input: NBufferSchemaFactory(0),
            network: object({}),
            output: NBufferSchemaFactory(22),
            pubkey: custom(isPoint, 'Not a valid pubkey'),
            signature: custom(isCanonicalScriptSignature),
            witness: array(BufferSchema),
          }),
        ),
        a,
      );
      const _address = value(() => {
        const result = distExports.bech32.decode(a.address);
        const version = result.words.shift();
        const data = distExports.bech32.fromWords(result.words);
        return {
          version,
          prefix: result.prefix,
          data: Uint8Array.from(data),
        };
      });
      const network = a.network || bitcoin;
      const o = { name: 'p2wpkh', network };
      prop(o, 'address', () => {
        if (!o.hash) return;
        const words = distExports.bech32.toWords(o.hash);
        words.unshift(0x00);
        return distExports.bech32.encode(network.bech32, words);
      });
      prop(o, 'hash', () => {
        if (a.output) return a.output.slice(2, 22);
        if (a.address) return _address().data;
        if (a.pubkey || o.pubkey) return hash160(a.pubkey || o.pubkey);
      });
      prop(o, 'output', () => {
        if (!o.hash) return;
        return compile([OPS$2.OP_0, o.hash]);
      });
      prop(o, 'pubkey', () => {
        if (a.pubkey) return a.pubkey;
        if (!a.witness) return;
        return a.witness[1];
      });
      prop(o, 'signature', () => {
        if (!a.witness) return;
        return a.witness[0];
      });
      prop(o, 'input', () => {
        if (!o.witness) return;
        return EMPTY_BUFFER$2;
      });
      prop(o, 'witness', () => {
        if (!a.pubkey) return;
        if (!a.signature) return;
        return [a.signature, a.pubkey];
      });
      // extended validation
      if (opts.validate) {
        let hash = Uint8Array.from([]);
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
          if (hash.length > 0 && compare(hash, a.hash) !== 0)
            throw new TypeError('Hash mismatch');
          else hash = a.hash;
        }
        if (a.output) {
          if (
            a.output.length !== 22 ||
            a.output[0] !== OPS$2.OP_0 ||
            a.output[1] !== 0x14
          )
            throw new TypeError('Output is invalid');
          if (hash.length > 0 && compare(hash, a.output.slice(2)) !== 0)
            throw new TypeError('Hash mismatch');
          else hash = a.output.slice(2);
        }
        if (a.pubkey) {
          const pkh = hash160(a.pubkey);
          if (hash.length > 0 && compare(hash, pkh) !== 0)
            throw new TypeError('Hash mismatch');
          else hash = pkh;
          if (!isPoint(a.pubkey) || a.pubkey.length !== 33)
            throw new TypeError('Invalid pubkey for p2wpkh');
        }
        if (a.witness) {
          if (a.witness.length !== 2) throw new TypeError('Witness is invalid');
          if (!isCanonicalScriptSignature(a.witness[0]))
            throw new TypeError('Witness has invalid signature');
          if (!isPoint(a.witness[1]) || a.witness[1].length !== 33)
            throw new TypeError('Witness has invalid pubkey');
          if (a.signature && compare(a.signature, a.witness[0]) !== 0)
            throw new TypeError('Signature mismatch');
          // if (a.pubkey && !a.pubkey.equals(a.witness[1]))
          if (a.pubkey && compare(a.pubkey, a.witness[1]) !== 0)
            throw new TypeError('Pubkey mismatch');
          const pkh = hash160(a.witness[1]);
          if (hash.length > 0 && compare(hash, pkh) !== 0)
            throw new TypeError('Hash mismatch');
        }
      }
      return Object.assign(o, a);
    }

    const OPS$1 = OPS$7;
    const EMPTY_BUFFER$1 = new Uint8Array(0);
    function chunkHasUncompressedPubkey(chunk) {
      if (
        chunk instanceof Uint8Array &&
        chunk.length === 65 &&
        chunk[0] === 0x04 &&
        isPoint(chunk)
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
    function p2wsh(a, opts) {
      if (!a.address && !a.hash && !a.output && !a.redeem && !a.witness)
        throw new TypeError('Not enough data');
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
            witness: array(BufferSchema),
          }),
          input: NBufferSchemaFactory(0),
          witness: array(BufferSchema),
        }),
        a,
      );
      const _address = value(() => {
        const result = distExports.bech32.decode(a.address);
        const version = result.words.shift();
        const data = distExports.bech32.fromWords(result.words);
        return {
          version,
          prefix: result.prefix,
          data: Uint8Array.from(data),
        };
      });
      const _rchunks = value(() => {
        return decompile(a.redeem.input);
      });
      let network = a.network;
      if (!network) {
        network = (a.redeem && a.redeem.network) || bitcoin;
      }
      const o = { network };
      prop(o, 'address', () => {
        if (!o.hash) return;
        const words = distExports.bech32.toWords(o.hash);
        words.unshift(0x00);
        return distExports.bech32.encode(network.bech32, words);
      });
      prop(o, 'hash', () => {
        if (a.output) return a.output.slice(2);
        if (a.address) return _address().data;
        if (o.redeem && o.redeem.output) return sha256(o.redeem.output);
      });
      prop(o, 'output', () => {
        if (!o.hash) return;
        return compile([OPS$1.OP_0, o.hash]);
      });
      prop(o, 'redeem', () => {
        if (!a.witness) return;
        return {
          output: a.witness[a.witness.length - 1],
          input: EMPTY_BUFFER$1,
          witness: a.witness.slice(0, -1),
        };
      });
      prop(o, 'input', () => {
        if (!o.witness) return;
        return EMPTY_BUFFER$1;
      });
      prop(o, 'witness', () => {
        // transform redeem input to witness stack?
        if (
          a.redeem &&
          a.redeem.input &&
          a.redeem.input.length > 0 &&
          a.redeem.output &&
          a.redeem.output.length > 0
        ) {
          const stack = toStack(_rchunks());
          // assign, and blank the existing input
          o.redeem = Object.assign({ witness: stack }, a.redeem);
          o.redeem.input = EMPTY_BUFFER$1;
          return [].concat(stack, a.redeem.output);
        }
        if (!a.redeem) return;
        if (!a.redeem.output) return;
        if (!a.redeem.witness) return;
        return [].concat(a.redeem.witness, a.redeem.output);
      });
      prop(o, 'name', () => {
        const nameParts = ['p2wsh'];
        if (o.redeem !== undefined && o.redeem.name !== undefined)
          nameParts.push(o.redeem.name);
        return nameParts.join('-');
      });
      // extended validation
      if (opts.validate) {
        let hash = Uint8Array.from([]);
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
          if (hash.length > 0 && compare(hash, a.hash) !== 0)
            throw new TypeError('Hash mismatch');
          else hash = a.hash;
        }
        if (a.output) {
          if (
            a.output.length !== 34 ||
            a.output[0] !== OPS$1.OP_0 ||
            a.output[1] !== 0x20
          )
            throw new TypeError('Output is invalid');
          const hash2 = a.output.slice(2);
          if (hash.length > 0 && compare(hash, hash2) !== 0)
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
            const decompile$1 = decompile(a.redeem.output);
            if (!decompile$1 || decompile$1.length < 1)
              throw new TypeError('Redeem.output is invalid');
            if (a.redeem.output.byteLength > 3600)
              throw new TypeError(
                'Redeem.output unspendable if larger than 3600 bytes',
              );
            if (countNonPushOnlyOPs(decompile$1) > 201)
              throw new TypeError(
                'Redeem.output unspendable with more than 201 non-push ops',
              );
            // match hash against other sources
            const hash2 = sha256(a.redeem.output);
            if (hash.length > 0 && compare(hash, hash2) !== 0)
              throw new TypeError('Hash mismatch');
            else hash = hash2;
          }
          if (a.redeem.input && !isPushOnly(_rchunks()))
            throw new TypeError('Non push-only scriptSig');
          if (
            a.witness &&
            a.redeem.witness &&
            !stacksEqual(a.witness, a.redeem.witness)
          )
            throw new TypeError('Witness and redeem.witness mismatch');
          if (
            (a.redeem.input && _rchunks().some(chunkHasUncompressedPubkey)) ||
            (a.redeem.output &&
              (decompile(a.redeem.output) || []).some(
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
          if (
            a.redeem &&
            a.redeem.output &&
            compare(a.redeem.output, wScript) !== 0
          )
            throw new TypeError('Witness and redeem.output mismatch');
          if (
            a.witness.some(chunkHasUncompressedPubkey) ||
            (decompile(wScript) || []).some(chunkHasUncompressedPubkey)
          )
            throw new TypeError('Witness contains uncompressed pubkey');
        }
      }
      return Object.assign(o, a);
    }

    const _ECCLIB_CACHE = {};
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
    function writeUInt16(buffer, offset, value, littleEndian) {
        if (offset + 2 > buffer.length) {
            throw new Error("Offset is outside the bounds of Uint8Array");
        }
        littleEndian = littleEndian.toUpperCase();
        if (value > 0xffff) {
            throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${0xffff}. Received ${value}`);
        }
        if (littleEndian === "LE") {
            buffer[offset] = value & 0xff;
            buffer[offset + 1] = (value >> 8) & 0xff;
        }
        else {
            buffer[offset] = (value >> 8) & 0xff;
            buffer[offset + 1] = value & 0xff;
        }
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
    function writeUInt64(buffer, offset, value, littleEndian) {
        if (offset + 8 > buffer.length) {
            throw new Error("Offset is outside the bounds of Uint8Array");
        }
        littleEndian = littleEndian.toUpperCase();
        if (value > 0xffffffffffffffffn) {
            throw new Error(`The value of "value" is out of range. It must be >= 0 and <= ${0xffffffffffffffffn}. Received ${value}`);
        }
        if (littleEndian === "LE") {
            buffer[offset] = Number(value & 0xffn);
            buffer[offset + 1] = Number((value >> 8n) & 0xffn);
            buffer[offset + 2] = Number((value >> 16n) & 0xffn);
            buffer[offset + 3] = Number((value >> 24n) & 0xffn);
            buffer[offset + 4] = Number((value >> 32n) & 0xffn);
            buffer[offset + 5] = Number((value >> 40n) & 0xffn);
            buffer[offset + 6] = Number((value >> 48n) & 0xffn);
            buffer[offset + 7] = Number((value >> 56n) & 0xffn);
        }
        else {
            buffer[offset] = Number((value >> 56n) & 0xffn);
            buffer[offset + 1] = Number((value >> 48n) & 0xffn);
            buffer[offset + 2] = Number((value >> 40n) & 0xffn);
            buffer[offset + 3] = Number((value >> 32n) & 0xffn);
            buffer[offset + 4] = Number((value >> 24n) & 0xffn);
            buffer[offset + 5] = Number((value >> 16n) & 0xffn);
            buffer[offset + 6] = Number((value >> 8n) & 0xffn);
            buffer[offset + 7] = Number(value & 0xffn);
        }
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
        }
        else {
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
            num = ((num << 8) + buffer[offset + 3]) >>> 0;
            num = ((num << 8) + buffer[offset + 2]) >>> 0;
            num = ((num << 8) + buffer[offset + 1]) >>> 0;
            num = ((num << 8) + buffer[offset]) >>> 0;
            return num;
        }
        else {
            let num = 0;
            num = ((num << 8) + buffer[offset]) >>> 0;
            num = ((num << 8) + buffer[offset + 1]) >>> 0;
            num = ((num << 8) + buffer[offset + 2]) >>> 0;
            num = ((num << 8) + buffer[offset + 3]) >>> 0;
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
        }
        else {
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

    const checkUInt64 = (n) => {
        if (n < 0 || n > 0xffffffffffffffffn) {
            throw new RangeError('value out of range');
        }
    };
    function checkUInt53(n) {
        if (n < 0 || n > Number.MAX_SAFE_INTEGER || n % 1 !== 0)
            throw new RangeError('value out of range');
    }
    function checkUint53OrUint64(n) {
        if (typeof n === 'number')
            checkUInt53(n);
        else
            checkUInt64(n);
    }
    function encode$e(n, buffer, offset) {
        checkUint53OrUint64(n);
        if (offset === undefined)
            offset = 0;
        if (buffer === undefined) {
            buffer = new Uint8Array(encodingLength(n));
        }
        let bytes = 0;
        // 8 bit
        if (n < 0xfd) {
            buffer.set([Number(n)], offset);
            bytes = 1;
            // 16 bit
        }
        else if (n <= 0xffff) {
            buffer.set([0xfd], offset);
            writeUInt16(buffer, offset + 1, Number(n), 'LE');
            bytes = 3;
            // 32 bit
        }
        else if (n <= 0xffffffff) {
            buffer.set([0xfe], offset);
            writeUInt32(buffer, offset + 1, Number(n), 'LE');
            bytes = 5;
            // 64 bit
        }
        else {
            buffer.set([0xff], offset);
            writeUInt64(buffer, offset + 1, BigInt(n), 'LE');
            bytes = 9;
        }
        return { buffer, bytes };
    }
    function decode$d(buffer, offset) {
        if (offset === undefined)
            offset = 0;
        const first = buffer.at(offset);
        if (first === undefined)
            throw new Error('buffer too small');
        // 8 bit
        if (first < 0xfd) {
            return { numberValue: first, bigintValue: BigInt(first), bytes: 1 };
            // 16 bit
        }
        else if (first === 0xfd) {
            const val = readUInt16(buffer, offset + 1, 'LE');
            return {
                numberValue: val,
                bigintValue: BigInt(val),
                bytes: 3
            };
            // 32 bit
        }
        else if (first === 0xfe) {
            const val = readUInt32(buffer, offset + 1, 'LE');
            return {
                numberValue: val,
                bigintValue: BigInt(val),
                bytes: 5
            };
            // 64 bit
        }
        else {
            const number = readUInt64(buffer, offset + 1, 'LE');
            return { numberValue: number <= Number.MAX_SAFE_INTEGER ? Number(number) : null, bigintValue: number, bytes: 9 };
        }
    }
    function encodingLength(n) {
        checkUint53OrUint64(n);
        return n < 0xfd ? 1 : n <= 0xffff ? 3 : n <= 0xffffffff ? 5 : 9;
    }

    const MAX_JS_NUMBER = 0x001fffffffffffff;
    // https://github.com/feross/buffer/blob/master/index.js#L1127
    function verifuint(value, max) {
      if (typeof value !== 'number' && typeof value !== 'bigint')
        throw new Error('cannot write a non-number as a number');
      if (value < 0 && value < BigInt(0))
        throw new Error('specified a negative value for writing an unsigned value');
      if (value > max && value > BigInt(max))
        throw new Error('RangeError: value out of range');
      if (Math.floor(Number(value)) !== Number(value))
        throw new Error('value has a fractional component');
    }
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
    function cloneBuffer(buffer) {
      const clone = new Uint8Array(buffer.length);
      clone.set(buffer);
      return clone;
    }
    /**
     * Helper class for serialization of bitcoin data types into a pre-allocated buffer.
     */
    class BufferWriter {
      buffer;
      offset;
      static withCapacity(size) {
        return new BufferWriter(new Uint8Array(size));
      }
      constructor(buffer, offset = 0) {
        this.buffer = buffer;
        this.offset = offset;
        parse(tuple([BufferSchema, UInt32Schema]), [
          buffer,
          offset,
        ]);
      }
      writeUInt8(i) {
        this.offset = writeUInt8(this.buffer, this.offset, i);
      }
      writeInt32(i) {
        this.offset = writeInt32(this.buffer, this.offset, i, 'LE');
      }
      writeInt64(i) {
        this.offset = writeInt64(this.buffer, this.offset, BigInt(i), 'LE');
      }
      writeUInt32(i) {
        this.offset = writeUInt32$1(this.buffer, this.offset, i, 'LE');
      }
      writeUInt64(i) {
        this.offset = writeUInt64$1(this.buffer, this.offset, BigInt(i), 'LE');
      }
      writeVarInt(i) {
        const { bytes } = encode$e(i, this.buffer, this.offset);
        this.offset += bytes;
      }
      writeSlice(slice) {
        if (this.buffer.length < this.offset + slice.length) {
          throw new Error('Cannot write slice out of bounds');
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
        vector.forEach(buf => this.writeVarSlice(buf));
      }
      end() {
        if (this.buffer.length === this.offset) {
          return this.buffer;
        }
        throw new Error(`buffer size ${this.buffer.length}, offset ${this.offset}`);
      }
    }
    /**
     * Helper class for reading of bitcoin data types from a buffer.
     */
    class BufferReader {
      buffer;
      offset;
      constructor(buffer, offset = 0) {
        this.buffer = buffer;
        this.offset = offset;
        parse(tuple([BufferSchema, UInt32Schema]), [
          buffer,
          offset,
        ]);
      }
      readUInt8() {
        const result = readUInt8(this.buffer, this.offset);
        this.offset++;
        return result;
      }
      readInt32() {
        const result = readInt32(this.buffer, this.offset, 'LE');
        this.offset += 4;
        return result;
      }
      readUInt32() {
        const result = readUInt32$1(this.buffer, this.offset, 'LE');
        this.offset += 4;
        return result;
      }
      readInt64() {
        const result = readInt64(this.buffer, this.offset, 'LE');
        this.offset += 8;
        return result;
      }
      readVarInt() {
        const { bigintValue, bytes } = decode$d(this.buffer, this.offset);
        this.offset += bytes;
        return bigintValue;
      }
      readSlice(n) {
        verifuint(n, MAX_JS_NUMBER);
        const num = Number(n);
        if (this.buffer.length < this.offset + num) {
          throw new Error('Cannot read slice out of bounds');
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
    }

    const LEAF_VERSION_TAPSCRIPT = 0xc0;
    const MAX_TAPTREE_DEPTH = 128;
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
        if (compare(kj, ej) < 0) {
          kj = tapBranchHash(kj, ej);
        } else {
          kj = tapBranchHash(ej, kj);
        }
      }
      return kj;
    }
    /**
     * Build a hash tree of merkle nodes from the scripts binary tree.
     * @param scriptTree - the tree of scripts to pairwise hash.
     */
    function toHashTree(scriptTree) {
      if (isTapleaf(scriptTree)) return { hash: tapleafHash(scriptTree) };
      const hashes = [toHashTree(scriptTree[0]), toHashTree(scriptTree[1])];
      // hashes.sort((a, b) => a.hash.compare(b.hash));
      hashes.sort((a, b) => compare(a.hash, b.hash));
      const [left, right] = hashes;
      return {
        hash: tapBranchHash(left.hash, right.hash),
        left,
        right,
      };
    }
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
      } else if (compare(node.hash, hash) === 0) {
        return [];
      }
      return undefined;
    }
    /**
     * Calculates the tapleaf hash for a given Tapleaf object.
     * @param leaf - The Tapleaf object to calculate the hash for.
     * @returns The tapleaf hash as a Buffer.
     */
    function tapleafHash(leaf) {
      const version = leaf.version || LEAF_VERSION_TAPSCRIPT;
      return taggedHash(
        'TapLeaf',
        concat([Uint8Array.from([version]), serializeScript(leaf.output)]),
      );
    }
    /**
     * Computes the taproot tweak hash for a given public key and optional hash.
     * If a hash is provided, the public key and hash are concatenated before computing the hash.
     * If no hash is provided, only the public key is used to compute the hash.
     *
     * @param pubKey - The public key buffer.
     * @param h - The optional hash buffer.
     * @returns The taproot tweak hash.
     */
    function tapTweakHash(pubKey, h) {
      return taggedHash(
        'TapTweak',
        concat(h ? [pubKey, h] : [pubKey]),
      );
    }
    /**
     * Tweak a public key with a given tweak hash.
     * @param pubKey - The public key to be tweaked.
     * @param h - The tweak hash.
     * @returns The tweaked public key or null if the input is invalid.
     */
    function tweakKey(pubKey, h) {
      if (!(pubKey instanceof Uint8Array)) return null;
      if (pubKey.length !== 32) return null;
      if (h && h.length !== 32) return null;
      const tweakHash = tapTweakHash(pubKey, h);
      const res = getEccLib().xOnlyPointAddTweak(pubKey, tweakHash);
      if (!res || res.xOnlyPubkey === null) return null;
      return {
        parity: res.parity,
        x: Uint8Array.from(res.xOnlyPubkey),
      };
    }
    /**
     * Computes the TapBranch hash by concatenating two buffers and applying the 'TapBranch' tagged hash algorithm.
     *
     * @param a - The first buffer.
     * @param b - The second buffer.
     * @returns The TapBranch hash of the concatenated buffers.
     */
    function tapBranchHash(a, b) {
      return taggedHash('TapBranch', concat([a, b]));
    }
    /**
     * Serializes a script by encoding its length as a varint and concatenating it with the script.
     *
     * @param s - The script to be serialized.
     * @returns The serialized script as a Buffer.
     */
    function serializeScript(s) {
      /* global BigInt */
      const varintLen = encodingLength(s.length);
      const buffer = new Uint8Array(varintLen);
      encode$e(s.length, buffer);
      return concat([buffer, s]);
    }

    const OPS = OPS$7;
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
    function p2tr(a, opts) {
      if (
        !a.address &&
        !a.output &&
        !a.pubkey &&
        !a.internalPubkey &&
        !(a.witness && a.witness.length > 1)
      )
        throw new TypeError('Not enough data');
      opts = Object.assign({ validate: true }, opts || {});
      parse(
        partial(
          object({
            address: string(),
            input: NBufferSchemaFactory(0),
            network: object({}),
            output: NBufferSchemaFactory(34),
            internalPubkey: NBufferSchemaFactory(32),
            hash: NBufferSchemaFactory(32), // merkle root hash, the tweak
            pubkey: NBufferSchemaFactory(32), // tweaked with `hash` from `internalPubkey`
            signature: union([
              NBufferSchemaFactory(64),
              NBufferSchemaFactory(65),
            ]),
            witness: array(BufferSchema),
            scriptTree: custom(isTaptree, 'Taptree is not of type isTaptree'),
            redeem: partial(
              object({
                output: BufferSchema, // tapleaf script
                redeemVersion: number(), // tapleaf version
                witness: array(BufferSchema),
              }),
            ),
            redeemVersion: number(),
          }),
        ),
        a,
      );
      const _address = value(() => {
        return fromBech32(a.address);
      });
      // remove annex if present, ignored by taproot
      const _witness = value(() => {
        if (!a.witness || !a.witness.length) return;
        if (
          a.witness.length >= 2 &&
          a.witness[a.witness.length - 1][0] === ANNEX_PREFIX
        ) {
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
      const o = { name: 'p2tr', network };
      prop(o, 'address', () => {
        if (!o.pubkey) return;
        const words = distExports.bech32m.toWords(o.pubkey);
        words.unshift(TAPROOT_WITNESS_VERSION);
        return distExports.bech32m.encode(network.bech32, words);
      });
      prop(o, 'hash', () => {
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
      prop(o, 'output', () => {
        if (!o.pubkey) return;
        return compile([OPS.OP_1, o.pubkey]);
      });
      prop(o, 'redeemVersion', () => {
        if (a.redeemVersion) return a.redeemVersion;
        if (
          a.redeem &&
          a.redeem.redeemVersion !== undefined &&
          a.redeem.redeemVersion !== null
        ) {
          return a.redeem.redeemVersion;
        }
        return LEAF_VERSION_TAPSCRIPT;
      });
      prop(o, 'redeem', () => {
        const witness = _witness(); // witness without annex
        if (!witness || witness.length < 2) return;
        return {
          output: witness[witness.length - 2],
          witness: witness.slice(0, -2),
          redeemVersion: witness[witness.length - 1][0] & TAPLEAF_VERSION_MASK,
        };
      });
      prop(o, 'pubkey', () => {
        if (a.pubkey) return a.pubkey;
        if (a.output) return a.output.slice(2);
        if (a.address) return _address().data;
        if (o.internalPubkey) {
          const tweakedKey = tweakKey(o.internalPubkey, o.hash);
          if (tweakedKey) return tweakedKey.x;
        }
      });
      prop(o, 'internalPubkey', () => {
        if (a.internalPubkey) return a.internalPubkey;
        const witness = _witness();
        if (witness && witness.length > 1)
          return witness[witness.length - 1].slice(1, 33);
      });
      prop(o, 'signature', () => {
        if (a.signature) return a.signature;
        const witness = _witness(); // witness without annex
        if (!witness || witness.length !== 1) return;
        return witness[0];
      });
      prop(o, 'witness', () => {
        if (a.witness) return a.witness;
        const hashTree = _hashTree();
        if (hashTree && a.redeem && a.redeem.output && a.internalPubkey) {
          const leafHash = tapleafHash({
            output: a.redeem.output,
            version: o.redeemVersion,
          });
          const path = findScriptPath(hashTree, leafHash);
          if (!path) return;
          const outputKey = tweakKey(a.internalPubkey, hashTree.hash);
          if (!outputKey) return;
          const controlBock = concat(
            [
              Uint8Array.from([o.redeemVersion | outputKey.parity]),
              a.internalPubkey,
            ].concat(path),
          );
          return [a.redeem.output, controlBock];
        }
        if (a.signature) return [a.signature];
      });
      // extended validation
      if (opts.validate) {
        let pubkey = Uint8Array.from([]);
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
          if (pubkey.length > 0 && compare(pubkey, a.pubkey) !== 0)
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
          if (pubkey.length > 0 && compare(pubkey, a.output.slice(2)) !== 0)
            throw new TypeError('Pubkey mismatch');
          else pubkey = a.output.slice(2);
        }
        if (a.internalPubkey) {
          const tweakedKey = tweakKey(a.internalPubkey, o.hash);
          if (pubkey.length > 0 && compare(pubkey, tweakedKey.x) !== 0)
            throw new TypeError('Pubkey mismatch');
          else pubkey = tweakedKey.x;
        }
        if (pubkey && pubkey.length) {
          if (!getEccLib().isXOnlyPoint(pubkey))
            throw new TypeError('Invalid pubkey for p2tr');
        }
        const hashTree = _hashTree();
        if (a.hash && hashTree) {
          if (compare(a.hash, hashTree.hash) !== 0)
            throw new TypeError('Hash mismatch');
        }
        if (a.redeem && a.redeem.output && hashTree) {
          const leafHash = tapleafHash({
            output: a.redeem.output,
            version: o.redeemVersion,
          });
          if (!findScriptPath(hashTree, leafHash))
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
            if (decompile(a.redeem.output).length === 0)
              throw new TypeError('Redeem.output is invalid');
            // output redeem is constructed from the witness
            if (
              o.redeem.output &&
              compare(a.redeem.output, o.redeem.output) !== 0
            )
              throw new TypeError('Redeem.output and witness mismatch');
          }
          if (a.redeem.witness) {
            if (
              o.redeem.witness &&
              !stacksEqual(a.redeem.witness, o.redeem.witness)
            )
              throw new TypeError('Redeem.witness and witness mismatch');
          }
        }
        if (witness && witness.length) {
          if (witness.length === 1) {
            // key spending
            if (a.signature && compare(a.signature, witness[0]) !== 0)
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
            if (
              a.internalPubkey &&
              compare(a.internalPubkey, internalPubkey) !== 0
            )
              throw new TypeError('Internal pubkey mismatch');
            if (!getEccLib().isXOnlyPoint(internalPubkey))
              throw new TypeError('Invalid internalPubkey for p2tr witness');
            const leafVersion = controlBlock[0] & TAPLEAF_VERSION_MASK;
            const script = witness[witness.length - 2];
            const leafHash = tapleafHash({ output: script, version: leafVersion });
            const hash = rootHashFromPath(controlBlock, leafHash);
            const outputKey = tweakKey(internalPubkey, hash);
            if (!outputKey)
              // todo: needs test data
              throw new TypeError('Invalid outputKey for p2tr witness');
            if (pubkey.length && compare(pubkey, outputKey.x) !== 0)
              throw new TypeError('Pubkey mismatch for p2tr witness');
            if (outputKey.parity !== (controlBlock[0] & 1))
              throw new Error('Incorrect parity');
          }
        }
      }
      return Object.assign(o, a);
    }

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
    const WARNING_STATES = [false, false];
    /**
     * Converts an output buffer to a future segwit address.
     * @param output - The output buffer.
     * @param network - The network object.
     * @returns The future segwit address.
     * @throws {TypeError} If the program length or version is invalid for segwit address.
     */
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
      if (WARNING_STATES[0] === false) {
        console.warn(FUTURE_SEGWIT_VERSION_WARNING);
        WARNING_STATES[0] = true;
      }
      return toBech32(data, version, network.bech32);
    }
    /**
     * Decodes a base58check encoded Bitcoin address and returns the version and hash.
     *
     * @param address - The base58check encoded Bitcoin address to decode.
     * @returns An object containing the version and hash of the decoded address.
     * @throws {TypeError} If the address is too short or too long.
     */
    function fromBase58Check(address) {
      const payload = bs58check.decode(address);
      // TODO: 4.0.0, move to "toOutputScript"
      if (payload.length < 21) throw new TypeError(address + ' is too short');
      if (payload.length > 21) throw new TypeError(address + ' is too long');
      const version = readUInt8(payload, 0);
      const hash = payload.slice(1);
      return { version, hash };
    }
    /**
     * Converts a Bech32 or Bech32m encoded address to its corresponding data representation.
     * @param address - The Bech32 or Bech32m encoded address.
     * @returns An object containing the version, prefix, and data of the address.
     * @throws {TypeError} If the address uses the wrong encoding.
     */
    function fromBech32(address) {
      let result;
      let version;
      try {
        result = distExports.bech32.decode(address);
      } catch (e) {}
      if (result) {
        version = result.words[0];
        if (version !== 0) throw new TypeError(address + ' uses wrong encoding');
      } else {
        result = distExports.bech32m.decode(address);
        version = result.words[0];
        if (version === 0) throw new TypeError(address + ' uses wrong encoding');
      }
      const data = distExports.bech32.fromWords(result.words.slice(1));
      return {
        version,
        prefix: result.prefix,
        data: Uint8Array.from(data),
      };
    }
    /**
     * Converts a buffer to a Bech32 or Bech32m encoded string.
     * @param data - The buffer to be encoded.
     * @param version - The version number to be used in the encoding.
     * @param prefix - The prefix string to be used in the encoding.
     * @returns The Bech32 or Bech32m encoded string.
     */
    function toBech32(data, version, prefix) {
      const words = distExports.bech32.toWords(data);
      words.unshift(version);
      return version === 0
        ? distExports.bech32.encode(prefix, words)
        : distExports.bech32m.encode(prefix, words);
    }
    /**
     * Converts an output script to a Bitcoin address.
     * @param output - The output script as a Buffer.
     * @param network - The Bitcoin network (optional).
     * @returns The Bitcoin address corresponding to the output script.
     * @throws If the output script has no matching address.
     */
    function fromOutputScript(output, network) {
      // TODO: Network
      network = network || bitcoin;
      try {
        return p2pkh({ output, network }).address;
      } catch (e) {}
      try {
        return p2sh({ output, network }).address;
      } catch (e) {}
      try {
        return p2wpkh({ output, network }).address;
      } catch (e) {}
      try {
        return p2wsh({ output, network }).address;
      } catch (e) {}
      try {
        return p2tr({ output, network }).address;
      } catch (e) {}
      try {
        return _toFutureSegwitAddress(output, network);
      } catch (e) {}
      throw new Error(toASM(output) + ' has no matching Address');
    }
    /**
     * Converts a Bitcoin address to its corresponding output script.
     * @param address - The Bitcoin address to convert.
     * @param network - The Bitcoin network to use. Defaults to the Bitcoin network.
     * @returns The corresponding output script as a Buffer.
     * @throws If the address has an invalid prefix or no matching script.
     */
    function toOutputScript(address, network) {
      network = network || bitcoin;
      let decodeBase58;
      let decodeBech32;
      try {
        decodeBase58 = fromBase58Check(address);
      } catch (e) {}
      if (decodeBase58) {
        if (decodeBase58.version === network.pubKeyHash)
          return p2pkh({ hash: decodeBase58.hash }).output;
        if (decodeBase58.version === network.scriptHash)
          return p2sh({ hash: decodeBase58.hash }).output;
      } else {
        try {
          decodeBech32 = fromBech32(address);
        } catch (e) {}
        if (decodeBech32) {
          if (decodeBech32.prefix !== network.bech32)
            throw new Error(address + ' has an invalid prefix');
          if (decodeBech32.version === 0) {
            if (decodeBech32.data.length === 20)
              return p2wpkh({ hash: decodeBech32.data }).output;
            if (decodeBech32.data.length === 32)
              return p2wsh({ hash: decodeBech32.data }).output;
          } else if (decodeBech32.version === 1) {
            if (decodeBech32.data.length === 32)
              return p2tr({ pubkey: decodeBech32.data }).output;
          } else if (
            decodeBech32.version >= FUTURE_SEGWIT_MIN_VERSION &&
            decodeBech32.version <= FUTURE_SEGWIT_MAX_VERSION &&
            decodeBech32.data.length >= FUTURE_SEGWIT_MIN_SIZE &&
            decodeBech32.data.length <= FUTURE_SEGWIT_MAX_SIZE
          ) {
            if (WARNING_STATES[1] === false) {
              console.warn(FUTURE_SEGWIT_VERSION_WARNING);
              WARNING_STATES[1] = true;
            }
            return compile([
              decodeBech32.version + FUTURE_SEGWIT_VERSION_DIFF,
              decodeBech32.data,
            ]);
          }
        }
      }
      throw new Error(address + ' has no matching Script');
    }

    function varSliceSize(someScript) {
      const length = someScript.length;
      return encodingLength(length) + length;
    }
    function vectorSize(someVector) {
      const length = someVector.length;
      return (
        encodingLength(length) +
        someVector.reduce((sum, witness) => {
          return sum + varSliceSize(witness);
        }, 0)
      );
    }
    const EMPTY_BUFFER = new Uint8Array(0);
    const EMPTY_WITNESS = [];
    const ZERO = fromHex(
      '0000000000000000000000000000000000000000000000000000000000000000',
    );
    const ONE = fromHex(
      '0000000000000000000000000000000000000000000000000000000000000001',
    );
    const VALUE_UINT64_MAX = fromHex('ffffffffffffffff');
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
      static DEFAULT_SEQUENCE = 0xffffffff;
      static SIGHASH_DEFAULT = 0x00;
      static SIGHASH_ALL = 0x01;
      static SIGHASH_NONE = 0x02;
      static SIGHASH_SINGLE = 0x03;
      static SIGHASH_ANYONECANPAY = 0x80;
      static SIGHASH_OUTPUT_MASK = 0x03;
      static SIGHASH_INPUT_MASK = 0x80;
      static ADVANCED_TRANSACTION_MARKER = 0x00;
      static ADVANCED_TRANSACTION_FLAG = 0x01;
      static fromBuffer(buffer, _NO_STRICT) {
        const bufferReader = new BufferReader(buffer);
        const tx = new Transaction();
        tx.version = bufferReader.readUInt32();
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
            value: bufferReader.readInt64(),
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
        return Transaction.fromBuffer(fromHex(hex), false);
      }
      static isCoinbaseHash(buffer) {
        parse(Hash256bitSchema, buffer);
        for (let i = 0; i < 32; ++i) {
          if (buffer[i] !== 0) return false;
        }
        return true;
      }
      version = 1;
      locktime = 0;
      ins = [];
      outs = [];
      isCoinbase() {
        return (
          this.ins.length === 1 && Transaction.isCoinbaseHash(this.ins[0].hash)
        );
      }
      addInput(hash, index, sequence, scriptSig) {
        parse(
          tuple([
            Hash256bitSchema,
            UInt32Schema,
            nullable(optional(UInt32Schema)),
            nullable(optional(BufferSchema)),
          ]),
          [hash, index, sequence, scriptSig],
        );
        if (sequence === undefined || sequence === null) {
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
        parse(tuple([BufferSchema, SatoshiSchema]), [
          scriptPubKey,
          value,
        ]);
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
          encodingLength(this.ins.length) +
          encodingLength(this.outs.length) +
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
        parse(tuple([UInt32Schema, BufferSchema, number()]), [
          inIndex,
          prevOutScript,
          hashType,
        ]);
        // https://github.com/bitcoin/bitcoin/blob/master/src/test/sighash_tests.cpp#L29
        if (inIndex >= this.ins.length) return ONE;
        // ignore OP_CODESEPARATOR
        const ourScript = compile(
          decompile(prevOutScript).filter(x => {
            return x !== OPS$7.OP_CODESEPARATOR;
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
        const buffer = new Uint8Array(txTmp.byteLength(false) + 4);
        writeInt32(buffer, buffer.length - 4, hashType, 'LE');
        txTmp.__toBuffer(buffer, 0, false);
        return hash256(buffer);
      }
      hashForWitnessV1(inIndex, prevOutScripts, values, hashType, leafHash, annex) {
        // https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki#common-signature-message
        parse(
          tuple([
            UInt32Schema,
            array(BufferSchema),
            array(SatoshiSchema),
            UInt32Schema,
          ]),
          [inIndex, prevOutScripts, values, hashType],
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
          let bufferWriter = BufferWriter.withCapacity(36 * this.ins.length);
          this.ins.forEach(txIn => {
            bufferWriter.writeSlice(txIn.hash);
            bufferWriter.writeUInt32(txIn.index);
          });
          hashPrevouts = sha256(bufferWriter.end());
          bufferWriter = BufferWriter.withCapacity(8 * this.ins.length);
          values.forEach(value => bufferWriter.writeInt64(value));
          hashAmounts = sha256(bufferWriter.end());
          bufferWriter = BufferWriter.withCapacity(
            prevOutScripts.map(varSliceSize).reduce((a, b) => a + b),
          );
          prevOutScripts.forEach(prevOutScript =>
            bufferWriter.writeVarSlice(prevOutScript),
          );
          hashScriptPubKeys = sha256(bufferWriter.end());
          bufferWriter = BufferWriter.withCapacity(4 * this.ins.length);
          this.ins.forEach(txIn => bufferWriter.writeUInt32(txIn.sequence));
          hashSequences = sha256(bufferWriter.end());
        }
        if (!(isNone || isSingle)) {
          if (!this.outs.length)
            throw new Error('Add outputs to the transaction before signing.');
          const txOutsSize = this.outs
            .map(output => 8 + varSliceSize(output.script))
            .reduce((a, b) => a + b);
          const bufferWriter = BufferWriter.withCapacity(txOutsSize);
          this.outs.forEach(out => {
            bufferWriter.writeInt64(out.value);
            bufferWriter.writeVarSlice(out.script);
          });
          hashOutputs = sha256(bufferWriter.end());
        } else if (isSingle && inIndex < this.outs.length) {
          const output = this.outs[inIndex];
          const bufferWriter = BufferWriter.withCapacity(
            8 + varSliceSize(output.script),
          );
          bufferWriter.writeInt64(output.value);
          bufferWriter.writeVarSlice(output.script);
          hashOutputs = sha256(bufferWriter.end());
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
        const sigMsgWriter = BufferWriter.withCapacity(sigMsgSize);
        sigMsgWriter.writeUInt8(hashType);
        // Transaction
        sigMsgWriter.writeUInt32(this.version);
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
          sigMsgWriter.writeInt64(values[inIndex]);
          sigMsgWriter.writeVarSlice(prevOutScripts[inIndex]);
          sigMsgWriter.writeUInt32(input.sequence);
        } else {
          sigMsgWriter.writeUInt32(inIndex);
        }
        if (annex) {
          const bufferWriter = BufferWriter.withCapacity(varSliceSize(annex));
          bufferWriter.writeVarSlice(annex);
          sigMsgWriter.writeSlice(sha256(bufferWriter.end()));
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
        return taggedHash(
          'TapSighash',
          concat([Uint8Array.from([0x00]), sigMsgWriter.end()]),
        );
      }
      hashForWitnessV0(inIndex, prevOutScript, value, hashType) {
        parse(
          tuple([
            UInt32Schema,
            BufferSchema,
            SatoshiSchema,
            UInt32Schema,
          ]),
          [inIndex, prevOutScript, value, hashType],
        );
        let tbuffer = Uint8Array.from([]);
        let bufferWriter;
        let hashOutputs = ZERO;
        let hashPrevouts = ZERO;
        let hashSequence = ZERO;
        if (!(hashType & Transaction.SIGHASH_ANYONECANPAY)) {
          tbuffer = new Uint8Array(36 * this.ins.length);
          bufferWriter = new BufferWriter(tbuffer, 0);
          this.ins.forEach(txIn => {
            bufferWriter.writeSlice(txIn.hash);
            bufferWriter.writeUInt32(txIn.index);
          });
          hashPrevouts = hash256(tbuffer);
        }
        if (
          !(hashType & Transaction.SIGHASH_ANYONECANPAY) &&
          (hashType & 0x1f) !== Transaction.SIGHASH_SINGLE &&
          (hashType & 0x1f) !== Transaction.SIGHASH_NONE
        ) {
          tbuffer = new Uint8Array(4 * this.ins.length);
          bufferWriter = new BufferWriter(tbuffer, 0);
          this.ins.forEach(txIn => {
            bufferWriter.writeUInt32(txIn.sequence);
          });
          hashSequence = hash256(tbuffer);
        }
        if (
          (hashType & 0x1f) !== Transaction.SIGHASH_SINGLE &&
          (hashType & 0x1f) !== Transaction.SIGHASH_NONE
        ) {
          const txOutsSize = this.outs.reduce((sum, output) => {
            return sum + 8 + varSliceSize(output.script);
          }, 0);
          tbuffer = new Uint8Array(txOutsSize);
          bufferWriter = new BufferWriter(tbuffer, 0);
          this.outs.forEach(out => {
            bufferWriter.writeInt64(out.value);
            bufferWriter.writeVarSlice(out.script);
          });
          hashOutputs = hash256(tbuffer);
        } else if (
          (hashType & 0x1f) === Transaction.SIGHASH_SINGLE &&
          inIndex < this.outs.length
        ) {
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
        bufferWriter.writeInt64(value);
        bufferWriter.writeUInt32(input.sequence);
        bufferWriter.writeSlice(hashOutputs);
        bufferWriter.writeUInt32(this.locktime);
        bufferWriter.writeUInt32(hashType);
        return hash256(tbuffer);
      }
      getHash(forWitness) {
        // wtxid for coinbase is always 32 bytes of 0x00
        if (forWitness && this.isCoinbase()) return new Uint8Array(32);
        return hash256(this.__toBuffer(undefined, undefined, forWitness));
      }
      getId() {
        // transaction hash's are displayed in reverse order
        return toHex(reverseBuffer(this.getHash(false)));
      }
      toBuffer(buffer, initialOffset) {
        return this.__toBuffer(buffer, initialOffset, true);
      }
      toHex() {
        return toHex(this.toBuffer(undefined, undefined));
      }
      setInputScript(index, scriptSig) {
        parse(tuple([number(), BufferSchema]), [index, scriptSig]);
        this.ins[index].script = scriptSig;
      }
      setWitness(index, witness) {
        parse(tuple([number(), array(BufferSchema)]), [
          index,
          witness,
        ]);
        this.ins[index].witness = witness;
      }
      __toBuffer(buffer, initialOffset, _ALLOW_WITNESS = false) {
        if (!buffer) buffer = new Uint8Array(this.byteLength(_ALLOW_WITNESS));
        const bufferWriter = new BufferWriter(buffer, initialOffset || 0);
        bufferWriter.writeUInt32(this.version);
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
            bufferWriter.writeInt64(txOut.value);
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

    var GlobalTypes;
    (function(GlobalTypes) {
      GlobalTypes[(GlobalTypes['UNSIGNED_TX'] = 0)] = 'UNSIGNED_TX';
      GlobalTypes[(GlobalTypes['GLOBAL_XPUB'] = 1)] = 'GLOBAL_XPUB';
    })(GlobalTypes || (GlobalTypes = {}));
    var InputTypes;
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
    })(InputTypes || (InputTypes = {}));
    var OutputTypes;
    (function(OutputTypes) {
      OutputTypes[(OutputTypes['REDEEM_SCRIPT'] = 0)] = 'REDEEM_SCRIPT';
      OutputTypes[(OutputTypes['WITNESS_SCRIPT'] = 1)] = 'WITNESS_SCRIPT';
      OutputTypes[(OutputTypes['BIP32_DERIVATION'] = 2)] = 'BIP32_DERIVATION';
      OutputTypes[(OutputTypes['TAP_INTERNAL_KEY'] = 5)] = 'TAP_INTERNAL_KEY';
      OutputTypes[(OutputTypes['TAP_TREE'] = 6)] = 'TAP_TREE';
      OutputTypes[(OutputTypes['TAP_BIP32_DERIVATION'] = 7)] =
        'TAP_BIP32_DERIVATION';
    })(OutputTypes || (OutputTypes = {}));

    const range$3 = n => [...Array(n).keys()];
    function decode$c(keyVal) {
      if (keyVal.key[0] !== GlobalTypes.GLOBAL_XPUB) {
        throw new Error(
          'Decode Error: could not decode globalXpub with key 0x' +
            toHex(keyVal.key),
        );
      }
      if (keyVal.key.length !== 79 || ![2, 3].includes(keyVal.key[46])) {
        throw new Error(
          'Decode Error: globalXpub has invalid extended pubkey in key 0x' +
            toHex(keyVal.key),
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
      for (const i of range$3(keyVal.value.length / 4 - 1)) {
        const val = readUInt32$1(keyVal.value, i * 4 + 4, 'LE');
        const isHard = !!(val & 0x80000000);
        const idx = val & 0x7fffffff;
        data.path += '/' + idx.toString(10) + (isHard ? "'" : '');
      }
      return data;
    }
    function encode$d(data) {
      const head = new Uint8Array([GlobalTypes.GLOBAL_XPUB]);
      const key = concat([head, data.extendedPubkey]);
      const splitPath = data.path.split('/');
      const value = new Uint8Array(splitPath.length * 4);
      value.set(data.masterFingerprint, 0);
      let offset = 4;
      splitPath.slice(1).forEach(level => {
        const isHard = level.slice(-1) === "'";
        let num = 0x7fffffff & parseInt(isHard ? level.slice(0, -1) : level, 10);
        if (isHard) num += 0x80000000;
        writeUInt32$1(value, offset, num, 'LE');
        offset += 4;
      });
      return {
        key,
        value,
      };
    }
    const expected$c =
      '{ masterFingerprint: Uint8Array; extendedPubkey: Uint8Array; path: string; }';
    function check$c(data) {
      const epk = data.extendedPubkey;
      const mfp = data.masterFingerprint;
      const p = data.path;
      return (
        epk instanceof Uint8Array &&
        epk.length === 78 &&
        [2, 3].indexOf(epk[45]) > -1 &&
        mfp instanceof Uint8Array &&
        mfp.length === 4 &&
        typeof p === 'string' &&
        !!p.match(/^m(\/\d+'?)*$/)
      );
    }
    function canAddToArray$3(array, item, dupeSet) {
      const dupeString = toHex(item.extendedPubkey);
      if (dupeSet.has(dupeString)) return false;
      dupeSet.add(dupeString);
      return (
        array.filter(v => compare(v.extendedPubkey, item.extendedPubkey))
          .length === 0
      );
    }

    var globalXpub = /*#__PURE__*/Object.freeze({
        __proto__: null,
        canAddToArray: canAddToArray$3,
        check: check$c,
        decode: decode$c,
        encode: encode$d,
        expected: expected$c
    });

    function encode$c(data) {
      return {
        key: new Uint8Array([GlobalTypes.UNSIGNED_TX]),
        value: data.toBuffer(),
      };
    }

    var unsignedTx = /*#__PURE__*/Object.freeze({
        __proto__: null,
        encode: encode$c
    });

    function decode$b(keyVal) {
      if (keyVal.key[0] !== InputTypes.FINAL_SCRIPTSIG) {
        throw new Error(
          'Decode Error: could not decode finalScriptSig with key 0x' +
            toHex(keyVal.key),
        );
      }
      return keyVal.value;
    }
    function encode$b(data) {
      const key = new Uint8Array([InputTypes.FINAL_SCRIPTSIG]);
      return {
        key,
        value: data,
      };
    }
    const expected$b = 'Uint8Array';
    function check$b(data) {
      return data instanceof Uint8Array;
    }
    function canAdd$8(currentData, newData) {
      return !!currentData && !!newData && currentData.finalScriptSig === undefined;
    }

    var finalScriptSig = /*#__PURE__*/Object.freeze({
        __proto__: null,
        canAdd: canAdd$8,
        check: check$b,
        decode: decode$b,
        encode: encode$b,
        expected: expected$b
    });

    function decode$a(keyVal) {
      if (keyVal.key[0] !== InputTypes.FINAL_SCRIPTWITNESS) {
        throw new Error(
          'Decode Error: could not decode finalScriptWitness with key 0x' +
            toHex(keyVal.key),
        );
      }
      return keyVal.value;
    }
    function encode$a(data) {
      const key = new Uint8Array([InputTypes.FINAL_SCRIPTWITNESS]);
      return {
        key,
        value: data,
      };
    }
    const expected$a = 'Uint8Array';
    function check$a(data) {
      return data instanceof Uint8Array;
    }
    function canAdd$7(currentData, newData) {
      return (
        !!currentData && !!newData && currentData.finalScriptWitness === undefined
      );
    }

    var finalScriptWitness = /*#__PURE__*/Object.freeze({
        __proto__: null,
        canAdd: canAdd$7,
        check: check$a,
        decode: decode$a,
        encode: encode$a,
        expected: expected$a
    });

    function decode$9(keyVal) {
      if (keyVal.key[0] !== InputTypes.NON_WITNESS_UTXO) {
        throw new Error(
          'Decode Error: could not decode nonWitnessUtxo with key 0x' +
            toHex(keyVal.key),
        );
      }
      return keyVal.value;
    }
    function encode$9(data) {
      return {
        key: new Uint8Array([InputTypes.NON_WITNESS_UTXO]),
        value: data,
      };
    }
    const expected$9 = 'Uint8Array';
    function check$9(data) {
      return data instanceof Uint8Array;
    }
    function canAdd$6(currentData, newData) {
      return !!currentData && !!newData && currentData.nonWitnessUtxo === undefined;
    }

    var nonWitnessUtxo = /*#__PURE__*/Object.freeze({
        __proto__: null,
        canAdd: canAdd$6,
        check: check$9,
        decode: decode$9,
        encode: encode$9,
        expected: expected$9
    });

    function decode$8(keyVal) {
      if (keyVal.key[0] !== InputTypes.PARTIAL_SIG) {
        throw new Error(
          'Decode Error: could not decode partialSig with key 0x' +
            toHex(keyVal.key),
        );
      }
      if (
        !(keyVal.key.length === 34 || keyVal.key.length === 66) ||
        ![2, 3, 4].includes(keyVal.key[1])
      ) {
        throw new Error(
          'Decode Error: partialSig has invalid pubkey in key 0x' +
            toHex(keyVal.key),
        );
      }
      const pubkey = keyVal.key.slice(1);
      return {
        pubkey,
        signature: keyVal.value,
      };
    }
    function encode$8(pSig) {
      const head = new Uint8Array([InputTypes.PARTIAL_SIG]);
      return {
        key: concat([head, pSig.pubkey]),
        value: pSig.signature,
      };
    }
    const expected$8 = '{ pubkey: Uint8Array; signature: Uint8Array; }';
    function check$8(data) {
      return (
        data.pubkey instanceof Uint8Array &&
        data.signature instanceof Uint8Array &&
        [33, 65].includes(data.pubkey.length) &&
        [2, 3, 4].includes(data.pubkey[0]) &&
        isDerSigWithSighash(data.signature)
      );
    }
    function isDerSigWithSighash(buf) {
      if (!(buf instanceof Uint8Array) || buf.length < 9) return false;
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
    function canAddToArray$2(array, item, dupeSet) {
      const dupeString = toHex(item.pubkey);
      if (dupeSet.has(dupeString)) return false;
      dupeSet.add(dupeString);
      return (
        array.filter(v => compare(v.pubkey, item.pubkey) === 0).length === 0
      );
    }

    var partialSig = /*#__PURE__*/Object.freeze({
        __proto__: null,
        canAddToArray: canAddToArray$2,
        check: check$8,
        decode: decode$8,
        encode: encode$8,
        expected: expected$8
    });

    function decode$7(keyVal) {
      if (keyVal.key[0] !== InputTypes.POR_COMMITMENT) {
        throw new Error(
          'Decode Error: could not decode porCommitment with key 0x' +
            toHex(keyVal.key),
        );
      }
      return toUtf8(keyVal.value);
    }
    function encode$7(data) {
      const key = new Uint8Array([InputTypes.POR_COMMITMENT]);
      return {
        key,
        value: fromUtf8(data),
      };
    }
    const expected$7 = 'string';
    function check$7(data) {
      return typeof data === 'string';
    }
    function canAdd$5(currentData, newData) {
      return !!currentData && !!newData && currentData.porCommitment === undefined;
    }

    var porCommitment = /*#__PURE__*/Object.freeze({
        __proto__: null,
        canAdd: canAdd$5,
        check: check$7,
        decode: decode$7,
        encode: encode$7,
        expected: expected$7
    });

    function decode$6(keyVal) {
      if (keyVal.key[0] !== InputTypes.SIGHASH_TYPE) {
        throw new Error(
          'Decode Error: could not decode sighashType with key 0x' +
            toHex(keyVal.key),
        );
      }
      return Number(readUInt32$1(keyVal.value, 0, 'LE'));
    }
    function encode$6(data) {
      const key = Uint8Array.from([InputTypes.SIGHASH_TYPE]);
      const value = new Uint8Array(4);
      writeUInt32$1(value, 0, data, 'LE');
      return {
        key,
        value,
      };
    }
    const expected$6 = 'number';
    function check$6(data) {
      return typeof data === 'number';
    }
    function canAdd$4(currentData, newData) {
      return !!currentData && !!newData && currentData.sighashType === undefined;
    }

    var sighashType = /*#__PURE__*/Object.freeze({
        __proto__: null,
        canAdd: canAdd$4,
        check: check$6,
        decode: decode$6,
        encode: encode$6,
        expected: expected$6
    });

    function decode$5(keyVal) {
      if (keyVal.key[0] !== InputTypes.TAP_KEY_SIG || keyVal.key.length !== 1) {
        throw new Error(
          'Decode Error: could not decode tapKeySig with key 0x' +
            toHex(keyVal.key),
        );
      }
      if (!check$5(keyVal.value)) {
        throw new Error(
          'Decode Error: tapKeySig not a valid 64-65-byte BIP340 signature',
        );
      }
      return keyVal.value;
    }
    function encode$5(value) {
      const key = Uint8Array.from([InputTypes.TAP_KEY_SIG]);
      return { key, value };
    }
    const expected$5 = 'Uint8Array';
    function check$5(data) {
      return (
        data instanceof Uint8Array && (data.length === 64 || data.length === 65)
      );
    }
    function canAdd$3(currentData, newData) {
      return !!currentData && !!newData && currentData.tapKeySig === undefined;
    }

    var tapKeySig = /*#__PURE__*/Object.freeze({
        __proto__: null,
        canAdd: canAdd$3,
        check: check$5,
        decode: decode$5,
        encode: encode$5,
        expected: expected$5
    });

    function decode$4(keyVal) {
      if (keyVal.key[0] !== InputTypes.TAP_LEAF_SCRIPT) {
        throw new Error(
          'Decode Error: could not decode tapLeafScript with key 0x' +
            toHex(keyVal.key),
        );
      }
      if ((keyVal.key.length - 2) % 32 !== 0) {
        throw new Error(
          'Decode Error: tapLeafScript has invalid control block in key 0x' +
            toHex(keyVal.key),
        );
      }
      const leafVersion = keyVal.value[keyVal.value.length - 1];
      if ((keyVal.key[1] & 0xfe) !== leafVersion) {
        throw new Error(
          'Decode Error: tapLeafScript bad leaf version in key 0x' +
            toHex(keyVal.key),
        );
      }
      const script = keyVal.value.slice(0, -1);
      const controlBlock = keyVal.key.slice(1);
      return { controlBlock, script, leafVersion };
    }
    function encode$4(tScript) {
      const head = Uint8Array.from([InputTypes.TAP_LEAF_SCRIPT]);
      const verBuf = Uint8Array.from([tScript.leafVersion]);
      return {
        key: concat([head, tScript.controlBlock]),
        value: concat([tScript.script, verBuf]),
      };
    }
    const expected$4 =
      '{ controlBlock: Uint8Array; leafVersion: number, script: Uint8Array; }';
    function check$4(data) {
      return (
        data.controlBlock instanceof Uint8Array &&
        (data.controlBlock.length - 1) % 32 === 0 &&
        (data.controlBlock[0] & 0xfe) === data.leafVersion &&
        data.script instanceof Uint8Array
      );
    }
    function canAddToArray$1(array, item, dupeSet) {
      const dupeString = toHex(item.controlBlock);
      if (dupeSet.has(dupeString)) return false;
      dupeSet.add(dupeString);
      return (
        array.filter(v => compare(v.controlBlock, item.controlBlock) === 0)
          .length === 0
      );
    }

    var tapLeafScript = /*#__PURE__*/Object.freeze({
        __proto__: null,
        canAddToArray: canAddToArray$1,
        check: check$4,
        decode: decode$4,
        encode: encode$4,
        expected: expected$4
    });

    function decode$3(keyVal) {
      if (keyVal.key[0] !== InputTypes.TAP_MERKLE_ROOT || keyVal.key.length !== 1) {
        throw new Error(
          'Decode Error: could not decode tapMerkleRoot with key 0x' +
            toHex(keyVal.key),
        );
      }
      if (!check$3(keyVal.value)) {
        throw new Error('Decode Error: tapMerkleRoot not a 32-byte hash');
      }
      return keyVal.value;
    }
    function encode$3(value) {
      const key = Uint8Array.from([InputTypes.TAP_MERKLE_ROOT]);
      return { key, value };
    }
    const expected$3 = 'Uint8Array';
    function check$3(data) {
      return data instanceof Uint8Array && data.length === 32;
    }
    function canAdd$2(currentData, newData) {
      return !!currentData && !!newData && currentData.tapMerkleRoot === undefined;
    }

    var tapMerkleRoot = /*#__PURE__*/Object.freeze({
        __proto__: null,
        canAdd: canAdd$2,
        check: check$3,
        decode: decode$3,
        encode: encode$3,
        expected: expected$3
    });

    function decode$2(keyVal) {
      if (keyVal.key[0] !== InputTypes.TAP_SCRIPT_SIG) {
        throw new Error(
          'Decode Error: could not decode tapScriptSig with key 0x' +
            toHex(keyVal.key),
        );
      }
      if (keyVal.key.length !== 65) {
        throw new Error(
          'Decode Error: tapScriptSig has invalid key 0x' + toHex(keyVal.key),
        );
      }
      if (keyVal.value.length !== 64 && keyVal.value.length !== 65) {
        throw new Error(
          'Decode Error: tapScriptSig has invalid signature in key 0x' +
            toHex(keyVal.key),
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
    function encode$2(tSig) {
      const head = Uint8Array.from([InputTypes.TAP_SCRIPT_SIG]);
      return {
        key: concat([head, tSig.pubkey, tSig.leafHash]),
        value: tSig.signature,
      };
    }
    const expected$2 =
      '{ pubkey: Uint8Array; leafHash: Uint8Array; signature: Uint8Array; }';
    function check$2(data) {
      return (
        data.pubkey instanceof Uint8Array &&
        data.leafHash instanceof Uint8Array &&
        data.signature instanceof Uint8Array &&
        data.pubkey.length === 32 &&
        data.leafHash.length === 32 &&
        (data.signature.length === 64 || data.signature.length === 65)
      );
    }
    function canAddToArray(array, item, dupeSet) {
      const dupeString = toHex(item.pubkey) + toHex(item.leafHash);
      if (dupeSet.has(dupeString)) return false;
      dupeSet.add(dupeString);
      return (
        array.filter(
          v =>
            compare(v.pubkey, item.pubkey) === 0 &&
            compare(v.leafHash, item.leafHash) === 0,
        ).length === 0
      );
    }

    var tapScriptSig = /*#__PURE__*/Object.freeze({
        __proto__: null,
        canAddToArray: canAddToArray,
        check: check$2,
        decode: decode$2,
        encode: encode$2,
        expected: expected$2
    });

    function decode$1(keyVal) {
      if (keyVal.key[0] !== InputTypes.WITNESS_UTXO) {
        throw new Error(
          'Decode Error: could not decode witnessUtxo with key 0x' +
            toHex(keyVal.key),
        );
      }
      const value = readInt64(keyVal.value, 0, 'LE');
      let _offset = 8;
      const { numberValue: scriptLen, bytes } = decode$d(
        keyVal.value,
        _offset,
      );
      _offset += bytes;
      const script = keyVal.value.slice(_offset);
      if (script.length !== scriptLen) {
        throw new Error('Decode Error: WITNESS_UTXO script is not proper length');
      }
      return {
        script,
        value,
      };
    }
    function encode$1(data) {
      const { script, value } = data;
      const varuintlen = encodingLength(script.length);
      const result = new Uint8Array(8 + varuintlen + script.length);
      writeInt64(result, 0, BigInt(value), 'LE');
      encode$e(script.length, result, 8);
      result.set(script, 8 + varuintlen);
      return {
        key: Uint8Array.from([InputTypes.WITNESS_UTXO]),
        value: result,
      };
    }
    const expected$1 = '{ script: Uint8Array; value: bigint; }';
    function check$1(data) {
      return data.script instanceof Uint8Array && typeof data.value === 'bigint';
    }
    function canAdd$1(currentData, newData) {
      return !!currentData && !!newData && currentData.witnessUtxo === undefined;
    }

    var witnessUtxo = /*#__PURE__*/Object.freeze({
        __proto__: null,
        canAdd: canAdd$1,
        check: check$1,
        decode: decode$1,
        encode: encode$1,
        expected: expected$1
    });

    function decode(keyVal) {
      if (keyVal.key[0] !== OutputTypes.TAP_TREE || keyVal.key.length !== 1) {
        throw new Error(
          'Decode Error: could not decode tapTree with key 0x' +
            toHex(keyVal.key),
        );
      }
      let _offset = 0;
      const data = [];
      while (_offset < keyVal.value.length) {
        const depth = keyVal.value[_offset++];
        const leafVersion = keyVal.value[_offset++];
        const { numberValue: scriptLen, bytes } = decode$d(
          keyVal.value,
          _offset,
        );
        _offset += bytes;
        data.push({
          depth,
          leafVersion,
          script: keyVal.value.slice(_offset, _offset + scriptLen),
        });
        _offset += scriptLen;
      }
      return { leaves: data };
    }
    function encode(tree) {
      const key = Uint8Array.from([OutputTypes.TAP_TREE]);
      const bufs = [].concat(
        ...tree.leaves.map(tapLeaf => [
          Uint8Array.of(tapLeaf.depth, tapLeaf.leafVersion),
          encode$e(BigInt(tapLeaf.script.length)).buffer,
          tapLeaf.script,
        ]),
      );
      return {
        key,
        value: concat(bufs),
      };
    }
    const expected =
      '{ leaves: [{ depth: number; leafVersion: number, script: Uint8Array; }] }';
    function check(data) {
      return (
        Array.isArray(data.leaves) &&
        data.leaves.every(
          tapLeaf =>
            tapLeaf.depth >= 0 &&
            tapLeaf.depth <= 128 &&
            (tapLeaf.leafVersion & 0xfe) === tapLeaf.leafVersion &&
            tapLeaf.script instanceof Uint8Array,
        )
      );
    }
    function canAdd(currentData, newData) {
      return !!currentData && !!newData && currentData.tapTree === undefined;
    }

    var tapTree = /*#__PURE__*/Object.freeze({
        __proto__: null,
        canAdd: canAdd,
        check: check,
        decode: decode,
        encode: encode,
        expected: expected
    });

    const range$2 = n => [...Array(n).keys()];
    const isValidDERKey = pubkey =>
      (pubkey.length === 33 && [2, 3].includes(pubkey[0])) ||
      (pubkey.length === 65 && 4 === pubkey[0]);
    function makeConverter$4(TYPE_BYTE, isValidPubkey = isValidDERKey) {
      function decode(keyVal) {
        if (keyVal.key[0] !== TYPE_BYTE) {
          throw new Error(
            'Decode Error: could not decode bip32Derivation with key 0x' +
              toHex(keyVal.key),
          );
        }
        const pubkey = keyVal.key.slice(1);
        if (!isValidPubkey(pubkey)) {
          throw new Error(
            'Decode Error: bip32Derivation has invalid pubkey in key 0x' +
              toHex(keyVal.key),
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
        for (const i of range$2(keyVal.value.length / 4 - 1)) {
          const val = readUInt32$1(keyVal.value, i * 4 + 4, 'LE');
          const isHard = !!(val & 0x80000000);
          const idx = val & 0x7fffffff;
          data.path += '/' + idx.toString(10) + (isHard ? "'" : '');
        }
        return data;
      }
      function encode(data) {
        const head = Uint8Array.from([TYPE_BYTE]);
        const key = concat([head, data.pubkey]);
        const splitPath = data.path.split('/');
        const value = new Uint8Array(splitPath.length * 4);
        value.set(data.masterFingerprint, 0);
        let offset = 4;
        splitPath.slice(1).forEach(level => {
          const isHard = level.slice(-1) === "'";
          let num = 0x7fffffff & parseInt(isHard ? level.slice(0, -1) : level, 10);
          if (isHard) num += 0x80000000;
          writeUInt32$1(value, offset, num, 'LE');
          offset += 4;
        });
        return {
          key,
          value,
        };
      }
      const expected =
        '{ masterFingerprint: Uint8Array; pubkey: Uint8Array; path: string; }';
      function check(data) {
        return (
          data.pubkey instanceof Uint8Array &&
          data.masterFingerprint instanceof Uint8Array &&
          typeof data.path === 'string' &&
          isValidPubkey(data.pubkey) &&
          data.masterFingerprint.length === 4
        );
      }
      function canAddToArray(array, item, dupeSet) {
        const dupeString = toHex(item.pubkey);
        if (dupeSet.has(dupeString)) return false;
        dupeSet.add(dupeString);
        return (
          array.filter(v => compare(v.pubkey, item.pubkey) === 0).length === 0
        );
      }
      return {
        decode,
        encode,
        check,
        expected,
        canAddToArray,
      };
    }

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
              'Format Error: invalid pubkey in key 0x' + toHex(keyVal.key),
            );
          }
        }
        return pubkey;
      }
    }

    function makeConverter$3(TYPE_BYTE) {
      function decode(keyVal) {
        if (keyVal.key[0] !== TYPE_BYTE) {
          throw new Error(
            'Decode Error: could not decode redeemScript with key 0x' +
              toHex(keyVal.key),
          );
        }
        return keyVal.value;
      }
      function encode(data) {
        const key = Uint8Array.from([TYPE_BYTE]);
        return {
          key,
          value: data,
        };
      }
      const expected = 'Uint8Array';
      function check(data) {
        return data instanceof Uint8Array;
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

    const isValidBIP340Key = pubkey => pubkey.length === 32;
    function makeConverter$2(TYPE_BYTE) {
      const parent = makeConverter$4(TYPE_BYTE, isValidBIP340Key);
      function decode(keyVal) {
        const { numberValue: nHashes, bytes: nHashesLen } = decode$d(
          keyVal.value,
        );
        const base = parent.decode({
          key: keyVal.key,
          value: keyVal.value.slice(nHashesLen + Number(nHashes) * 32),
        });
        const leafHashes = new Array(Number(nHashes));
        for (let i = 0, _offset = nHashesLen; i < nHashes; i++, _offset += 32) {
          leafHashes[i] = keyVal.value.slice(_offset, _offset + 32);
        }
        return { ...base, leafHashes };
      }
      function encode(data) {
        const base = parent.encode(data);
        const nHashesLen = encodingLength(data.leafHashes.length);
        const nHashesBuf = new Uint8Array(nHashesLen);
        encode$e(data.leafHashes.length, nHashesBuf);
        const value = concat([nHashesBuf, ...data.leafHashes, base.value]);
        return { ...base, value };
      }
      const expected =
        '{ ' +
        'masterFingerprint: Uint8Array; ' +
        'pubkey: Uint8Array; ' +
        'path: string; ' +
        'leafHashes: Uint8Array[]; ' +
        '}';
      function check(data) {
        return (
          Array.isArray(data.leafHashes) &&
          data.leafHashes.every(
            leafHash => leafHash instanceof Uint8Array && leafHash.length === 32,
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

    function makeConverter$1(TYPE_BYTE) {
      function decode(keyVal) {
        if (keyVal.key[0] !== TYPE_BYTE || keyVal.key.length !== 1) {
          throw new Error(
            'Decode Error: could not decode tapInternalKey with key 0x' +
              toHex(keyVal.key),
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
        const key = Uint8Array.from([TYPE_BYTE]);
        return { key, value };
      }
      const expected = 'Uint8Array';
      function check(data) {
        return data instanceof Uint8Array && data.length === 32;
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

    function makeConverter(TYPE_BYTE) {
      function decode(keyVal) {
        if (keyVal.key[0] !== TYPE_BYTE) {
          throw new Error(
            'Decode Error: could not decode witnessScript with key 0x' +
              toHex(keyVal.key),
          );
        }
        return keyVal.value;
      }
      function encode(data) {
        const key = Uint8Array.from([TYPE_BYTE]);
        return {
          key,
          value: data,
        };
      }
      const expected = 'Uint8Array';
      function check(data) {
        return data instanceof Uint8Array;
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

    const globals = {
      unsignedTx,
      globalXpub,
      // pass an Array of key bytes that require pubkey beside the key
      checkPubkey: makeChecker([]),
    };
    const inputs = {
      nonWitnessUtxo,
      partialSig,
      sighashType,
      finalScriptSig,
      finalScriptWitness,
      porCommitment,
      witnessUtxo,
      bip32Derivation: makeConverter$4(InputTypes.BIP32_DERIVATION),
      redeemScript: makeConverter$3(InputTypes.REDEEM_SCRIPT),
      witnessScript: makeConverter(InputTypes.WITNESS_SCRIPT),
      checkPubkey: makeChecker([
        InputTypes.PARTIAL_SIG,
        InputTypes.BIP32_DERIVATION,
      ]),
      tapKeySig,
      tapScriptSig,
      tapLeafScript,
      tapBip32Derivation: makeConverter$2(
        InputTypes.TAP_BIP32_DERIVATION,
      ),
      tapInternalKey: makeConverter$1(InputTypes.TAP_INTERNAL_KEY),
      tapMerkleRoot,
    };
    const outputs = {
      bip32Derivation: makeConverter$4(OutputTypes.BIP32_DERIVATION),
      redeemScript: makeConverter$3(OutputTypes.REDEEM_SCRIPT),
      witnessScript: makeConverter(OutputTypes.WITNESS_SCRIPT),
      checkPubkey: makeChecker([OutputTypes.BIP32_DERIVATION]),
      tapBip32Derivation: makeConverter$2(
        OutputTypes.TAP_BIP32_DERIVATION,
      ),
      tapTree,
      tapInternalKey: makeConverter$1(OutputTypes.TAP_INTERNAL_KEY),
    };

    var converter = /*#__PURE__*/Object.freeze({
        __proto__: null,
        globals: globals,
        inputs: inputs,
        outputs: outputs
    });

    const range$1 = n => [...Array(n).keys()];
    function keyValsToBuffer(keyVals) {
      const buffers = keyVals.map(keyValToBuffer);
      buffers.push(Uint8Array.from([0]));
      return concat(buffers);
    }
    function keyValToBuffer(keyVal) {
      const keyLen = keyVal.key.length;
      const valLen = keyVal.value.length;
      const keyVarIntLen = encodingLength(keyLen);
      const valVarIntLen = encodingLength(valLen);
      const buffer = new Uint8Array(keyVarIntLen + keyLen + valVarIntLen + valLen);
      encode$e(keyLen, buffer, 0);
      buffer.set(keyVal.key, keyVarIntLen);
      encode$e(valLen, buffer, keyVarIntLen + keyLen);
      buffer.set(keyVal.value, keyVarIntLen + keyLen + valVarIntLen);
      return buffer;
    }

    function psbtFromBuffer(buffer, txGetter) {
      let offset = 0;
      function varSlice() {
        const { numberValue: keyLen, bytes } = decode$d(buffer, offset);
        offset += bytes;
        const key = buffer.slice(offset, offset + Number(keyLen));
        offset += Number(keyLen);
        return key;
      }
      function readUInt32BE() {
        const num = readUInt32$1(buffer, offset, 'BE');
        offset += 4;
        return num;
      }
      function readUInt8$1() {
        const num = readUInt8(buffer, offset);
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
        const isEnd = readUInt8(buffer, offset) === 0;
        if (isEnd) {
          offset++;
        }
        return isEnd;
      }
      if (readUInt32BE() !== 0x70736274) {
        throw new Error('Format Error: Invalid Magic Number');
      }
      if (readUInt8$1() !== 0xff) {
        throw new Error(
          'Format Error: Magic Number must be followed by 0xff separator',
        );
      }
      const globalMapKeyVals = [];
      const globalKeyIndex = {};
      while (!checkEndOfKeyValPairs()) {
        const keyVal = getKeyValue();
        const hexKey = toHex(keyVal.key);
        if (globalKeyIndex[hexKey]) {
          throw new Error(
            'Format Error: Keys must be unique for global keymap: key ' + hexKey,
          );
        }
        globalKeyIndex[hexKey] = 1;
        globalMapKeyVals.push(keyVal);
      }
      const unsignedTxMaps = globalMapKeyVals.filter(
        keyVal => keyVal.key[0] === GlobalTypes.UNSIGNED_TX,
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
      for (const index of range$1(inputCount)) {
        const inputKeyIndex = {};
        const input = [];
        while (!checkEndOfKeyValPairs()) {
          const keyVal = getKeyValue();
          const hexKey = toHex(keyVal.key);
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
      for (const index of range$1(outputCount)) {
        const outputKeyIndex = {};
        const output = [];
        while (!checkEndOfKeyValPairs()) {
          const keyVal = getKeyValue();
          const hexKey = toHex(keyVal.key);
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
    function checkKeyBuffer(type, keyBuf, keyNum) {
      if (compare(keyBuf, Uint8Array.from([keyNum]))) {
        throw new Error(
          // `Format Error: Invalid ${type} key: ${keyBuf.toString('hex')}`,
          `Format Error: Invalid ${type} key: ${toHex(keyBuf)}`,
        );
      }
    }
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
          case GlobalTypes.UNSIGNED_TX:
            checkKeyBuffer('global', keyVal.key, GlobalTypes.UNSIGNED_TX);
            if (txCount > 0) {
              throw new Error('Format Error: GlobalMap has multiple UNSIGNED_TX');
            }
            txCount++;
            break;
          case GlobalTypes.GLOBAL_XPUB:
            if (globalMap.globalXpub === undefined) {
              globalMap.globalXpub = [];
            }
            globalMap.globalXpub.push(globals.globalXpub.decode(keyVal));
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
      const inputs$1 = [];
      const outputs$1 = [];
      // Get input fields
      for (const index of range$1(inputCount)) {
        const input = {};
        for (const keyVal of inputKeyVals[index]) {
          inputs.checkPubkey(keyVal);
          switch (keyVal.key[0]) {
            case InputTypes.NON_WITNESS_UTXO:
              checkKeyBuffer('input', keyVal.key, InputTypes.NON_WITNESS_UTXO);
              if (input.nonWitnessUtxo !== undefined) {
                throw new Error(
                  'Format Error: Input has multiple NON_WITNESS_UTXO',
                );
              }
              input.nonWitnessUtxo = inputs.nonWitnessUtxo.decode(keyVal);
              break;
            case InputTypes.WITNESS_UTXO:
              checkKeyBuffer('input', keyVal.key, InputTypes.WITNESS_UTXO);
              if (input.witnessUtxo !== undefined) {
                throw new Error('Format Error: Input has multiple WITNESS_UTXO');
              }
              input.witnessUtxo = inputs.witnessUtxo.decode(keyVal);
              break;
            case InputTypes.PARTIAL_SIG:
              if (input.partialSig === undefined) {
                input.partialSig = [];
              }
              input.partialSig.push(inputs.partialSig.decode(keyVal));
              break;
            case InputTypes.SIGHASH_TYPE:
              checkKeyBuffer('input', keyVal.key, InputTypes.SIGHASH_TYPE);
              if (input.sighashType !== undefined) {
                throw new Error('Format Error: Input has multiple SIGHASH_TYPE');
              }
              input.sighashType = inputs.sighashType.decode(keyVal);
              break;
            case InputTypes.REDEEM_SCRIPT:
              checkKeyBuffer('input', keyVal.key, InputTypes.REDEEM_SCRIPT);
              if (input.redeemScript !== undefined) {
                throw new Error('Format Error: Input has multiple REDEEM_SCRIPT');
              }
              input.redeemScript = inputs.redeemScript.decode(keyVal);
              break;
            case InputTypes.WITNESS_SCRIPT:
              checkKeyBuffer('input', keyVal.key, InputTypes.WITNESS_SCRIPT);
              if (input.witnessScript !== undefined) {
                throw new Error('Format Error: Input has multiple WITNESS_SCRIPT');
              }
              input.witnessScript = inputs.witnessScript.decode(keyVal);
              break;
            case InputTypes.BIP32_DERIVATION:
              if (input.bip32Derivation === undefined) {
                input.bip32Derivation = [];
              }
              input.bip32Derivation.push(
                inputs.bip32Derivation.decode(keyVal),
              );
              break;
            case InputTypes.FINAL_SCRIPTSIG:
              checkKeyBuffer('input', keyVal.key, InputTypes.FINAL_SCRIPTSIG);
              input.finalScriptSig = inputs.finalScriptSig.decode(keyVal);
              break;
            case InputTypes.FINAL_SCRIPTWITNESS:
              checkKeyBuffer('input', keyVal.key, InputTypes.FINAL_SCRIPTWITNESS);
              input.finalScriptWitness = inputs.finalScriptWitness.decode(
                keyVal,
              );
              break;
            case InputTypes.POR_COMMITMENT:
              checkKeyBuffer('input', keyVal.key, InputTypes.POR_COMMITMENT);
              input.porCommitment = inputs.porCommitment.decode(keyVal);
              break;
            case InputTypes.TAP_KEY_SIG:
              checkKeyBuffer('input', keyVal.key, InputTypes.TAP_KEY_SIG);
              input.tapKeySig = inputs.tapKeySig.decode(keyVal);
              break;
            case InputTypes.TAP_SCRIPT_SIG:
              if (input.tapScriptSig === undefined) {
                input.tapScriptSig = [];
              }
              input.tapScriptSig.push(inputs.tapScriptSig.decode(keyVal));
              break;
            case InputTypes.TAP_LEAF_SCRIPT:
              if (input.tapLeafScript === undefined) {
                input.tapLeafScript = [];
              }
              input.tapLeafScript.push(inputs.tapLeafScript.decode(keyVal));
              break;
            case InputTypes.TAP_BIP32_DERIVATION:
              if (input.tapBip32Derivation === undefined) {
                input.tapBip32Derivation = [];
              }
              input.tapBip32Derivation.push(
                inputs.tapBip32Derivation.decode(keyVal),
              );
              break;
            case InputTypes.TAP_INTERNAL_KEY:
              checkKeyBuffer('input', keyVal.key, InputTypes.TAP_INTERNAL_KEY);
              input.tapInternalKey = inputs.tapInternalKey.decode(keyVal);
              break;
            case InputTypes.TAP_MERKLE_ROOT:
              checkKeyBuffer('input', keyVal.key, InputTypes.TAP_MERKLE_ROOT);
              input.tapMerkleRoot = inputs.tapMerkleRoot.decode(keyVal);
              break;
            default:
              // This will allow inclusion during serialization.
              if (!input.unknownKeyVals) input.unknownKeyVals = [];
              input.unknownKeyVals.push(keyVal);
          }
        }
        inputs$1.push(input);
      }
      for (const index of range$1(outputCount)) {
        const output = {};
        for (const keyVal of outputKeyVals[index]) {
          outputs.checkPubkey(keyVal);
          switch (keyVal.key[0]) {
            case OutputTypes.REDEEM_SCRIPT:
              checkKeyBuffer('output', keyVal.key, OutputTypes.REDEEM_SCRIPT);
              if (output.redeemScript !== undefined) {
                throw new Error('Format Error: Output has multiple REDEEM_SCRIPT');
              }
              output.redeemScript = outputs.redeemScript.decode(keyVal);
              break;
            case OutputTypes.WITNESS_SCRIPT:
              checkKeyBuffer('output', keyVal.key, OutputTypes.WITNESS_SCRIPT);
              if (output.witnessScript !== undefined) {
                throw new Error('Format Error: Output has multiple WITNESS_SCRIPT');
              }
              output.witnessScript = outputs.witnessScript.decode(keyVal);
              break;
            case OutputTypes.BIP32_DERIVATION:
              if (output.bip32Derivation === undefined) {
                output.bip32Derivation = [];
              }
              output.bip32Derivation.push(
                outputs.bip32Derivation.decode(keyVal),
              );
              break;
            case OutputTypes.TAP_INTERNAL_KEY:
              checkKeyBuffer('output', keyVal.key, OutputTypes.TAP_INTERNAL_KEY);
              output.tapInternalKey = outputs.tapInternalKey.decode(keyVal);
              break;
            case OutputTypes.TAP_TREE:
              checkKeyBuffer('output', keyVal.key, OutputTypes.TAP_TREE);
              output.tapTree = outputs.tapTree.decode(keyVal);
              break;
            case OutputTypes.TAP_BIP32_DERIVATION:
              if (output.tapBip32Derivation === undefined) {
                output.tapBip32Derivation = [];
              }
              output.tapBip32Derivation.push(
                outputs.tapBip32Derivation.decode(keyVal),
              );
              break;
            default:
              if (!output.unknownKeyVals) output.unknownKeyVals = [];
              output.unknownKeyVals.push(keyVal);
          }
        }
        outputs$1.push(output);
      }
      return { globalMap, inputs: inputs$1, outputs: outputs$1 };
    }

    function psbtToBuffer({ globalMap, inputs, outputs }) {
      const { globalKeyVals, inputKeyVals, outputKeyVals } = psbtToKeyVals({
        globalMap,
        inputs,
        outputs,
      });
      const globalBuffer = keyValsToBuffer(globalKeyVals);
      const keyValsOrEmptyToBuffer = keyVals =>
        keyVals.length === 0
          ? [Uint8Array.from([0])]
          : keyVals.map(keyValsToBuffer);
      const inputBuffers = keyValsOrEmptyToBuffer(inputKeyVals);
      const outputBuffers = keyValsOrEmptyToBuffer(outputKeyVals);
      const header = new Uint8Array(5);
      header.set([0x70, 0x73, 0x62, 0x74, 0xff], 0);
      return concat(
        [header, globalBuffer].concat(inputBuffers, outputBuffers),
      );
    }
    const sortKeyVals = (a, b) => {
      return compare(a.key, b.key);
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
        const keyHexes = encodedKeyVals.map(kv => toHex(kv.key));
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
            return !keyHexSet.has(toHex(keyVal.key));
          })
        : [];
      return keyVals.concat(otherKeyVals).sort(sortKeyVals);
    }
    function psbtToKeyVals({ globalMap, inputs: inputs$1, outputs: outputs$1 }) {
      // First parse the global keyVals
      // Get any extra keyvals to pass along
      return {
        globalKeyVals: keyValsFromMap(globalMap, globals),
        inputKeyVals: inputs$1.map(i => keyValsFromMap(i, inputs)),
        outputKeyVals: outputs$1.map(o => keyValsFromMap(o, outputs)),
      };
    }

    function combine(psbts) {
      const self = psbts[0];
      const selfKeyVals = psbtToKeyVals(self);
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
          compare(otherTx.toBuffer(), selfTx.toBuffer()) !== 0
        ) {
          throw new Error(
            'Combine: One of the Psbts does not have the same transaction.',
          );
        }
        const otherKeyVals = psbtToKeyVals(other);
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
      return psbtFromKeyVals(selfTx, {
        globalMapKeyVals: selfKeyVals.globalKeyVals,
        inputKeyVals: selfKeyVals.inputKeyVals,
        outputKeyVals: selfKeyVals.outputKeyVals,
      });
    }
    function keyPusher(selfSet, selfKeyVals, otherKeyVals) {
      return key => {
        if (selfSet.has(key)) return;
        const newKv = otherKeyVals.filter(kv => toHex(kv.key) === key)[0];
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
        const hex = toHex(keyVal.key);
        if (set.has(hex))
          throw new Error('Combine: KeyValue Map keys should be unique');
        set.add(hex);
      });
      return set;
    }

    function checkForInput(inputs, inputIndex) {
      const input = inputs[inputIndex];
      if (input === undefined) throw new Error(`No input #${inputIndex}`);
      return input;
    }
    function checkForOutput(outputs, outputIndex) {
      const output = outputs[outputIndex];
      if (output === undefined) throw new Error(`No output #${outputIndex}`);
      return output;
    }
    function checkHasKey(checkKeyVal, keyVals, enumLength) {
      if (checkKeyVal.key[0] < enumLength) {
        throw new Error(
          `Use the method for your specific key instead of addUnknownKeyVal*`,
        );
      }
      if (
        keyVals &&
        keyVals.filter(kv => compare(kv.key, checkKeyVal.key) === 0)
          .length !== 0
      ) {
        throw new Error(`Duplicate Key: ${toHex(checkKeyVal.key)}`);
      }
    }
    function getEnumLength(myenum) {
      let count = 0;
      Object.keys(myenum).forEach(val => {
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
          `Input #${inputIndex} has too much or too little data to clean`,
        );
      }
    }
    function throwForUpdateMaker(typeName, name, expected, data) {
      throw new Error(
        `Data for ${typeName} key ${name} is incorrect: Expected ` +
          `${expected} and got ${JSON.stringify(data)}`,
      );
    }
    function updateMaker(typeName) {
      return (updateData, mainData) => {
        // @ts-ignore
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
    const updateGlobal = updateMaker('global');
    const updateInput = updateMaker('input');
    const updateOutput = updateMaker('output');
    function addInputAttributes(inputs, data) {
      const index = inputs.length - 1;
      const input = checkForInput(inputs, index);
      updateInput(data, input);
    }
    function addOutputAttributes(outputs, data) {
      const index = outputs.length - 1;
      const output = checkForOutput(outputs, index);
      updateOutput(data, output);
    }

    let Psbt$1 = class Psbt {
      constructor(tx) {
        this.inputs = [];
        this.outputs = [];
        this.globalMap = {
          unsignedTx: tx,
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
          getEnumLength(GlobalTypes),
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
        addInputAttributes(this.inputs, inputData);
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
        addOutputAttributes(this.outputs, outputData);
        return this;
      }
      clearFinalizedInput(inputIndex) {
        const input = checkForInput(this.inputs, inputIndex);
        inputCheckUncleanFinalized(inputIndex, input);
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
        const result = combine([this].concat(those));
        Object.assign(this, result);
        return this;
      }
      getTransaction() {
        return this.globalMap.unsignedTx.toBuffer();
      }
    };

    /**
     * Checks if a given payment factory can generate a payment script from a given script.
     * @param payment The payment factory to check.
     * @returns A function that takes a script and returns a boolean indicating whether the payment factory can generate a payment script from the script.
     */
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
    const isP2MS = isPaymentFactory(p2ms);
    const isP2PK = isPaymentFactory(p2pk);
    const isP2PKH = isPaymentFactory(p2pkh);
    const isP2WPKH = isPaymentFactory(p2wpkh);
    const isP2WSHScript = isPaymentFactory(p2wsh);
    const isP2SHScript = isPaymentFactory(p2sh);
    const isP2TR = isPaymentFactory(p2tr);
    /**
     * Converts a witness stack to a script witness.
     * @param witness The witness stack to convert.
     * @returns The script witness as a Buffer.
     */
    function witnessStackToScriptWitness(witness) {
      let buffer = new Uint8Array(0);
      function writeSlice(slice) {
        buffer = concat([buffer, slice]);
      }
      function writeVarInt(i) {
        const currentLen = buffer.length;
        const varintLen = encodingLength(i);
        buffer = concat([buffer, new Uint8Array(varintLen)]);
        encode$e(i, buffer, currentLen);
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
    /**
     * Finds the position of a public key in a script.
     * @param pubkey The public key to search for.
     * @param script The script to search in.
     * @returns The index of the public key in the script, or -1 if not found.
     * @throws {Error} If there is an unknown script error.
     */
    function pubkeyPositionInScript(pubkey, script) {
      const pubkeyHash = hash160(pubkey);
      const pubkeyXOnly = pubkey.slice(1, 33); // slice before calling?
      const decompiled = decompile(script);
      if (decompiled === null) throw new Error('Unknown script error');
      return decompiled.findIndex(element => {
        if (typeof element === 'number') return false;
        return (
          compare(pubkey, element) === 0 ||
          compare(pubkeyHash, element) === 0 ||
          compare(pubkeyXOnly, element) === 0
        );
      });
    }
    /**
     * Checks if a public key is present in a script.
     * @param pubkey The public key to check.
     * @param script The script to search in.
     * @returns A boolean indicating whether the public key is present in the script.
     */
    function pubkeyInScript(pubkey, script) {
      return pubkeyPositionInScript(pubkey, script) !== -1;
    }
    /**
     * Checks if an input contains a signature for a specific action.
     * @param input - The input to check.
     * @param action - The action to check for.
     * @returns A boolean indicating whether the input contains a signature for the specified action.
     */
    function checkInputForSig(input, action) {
      const pSigs = extractPartialSigs(input);
      return pSigs.some(pSig =>
        signatureBlocksAction(pSig, signature.decode, action),
      );
    }
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
      const isAnyoneCanPay = hashType & Transaction.SIGHASH_ANYONECANPAY;
      if (isAnyoneCanPay) whitelist.push('addInput');
      const hashMod = hashType & 0x1f;
      switch (hashMod) {
        case Transaction.SIGHASH_ALL:
          break;
        case Transaction.SIGHASH_SINGLE:
        case Transaction.SIGHASH_NONE:
          whitelist.push('addOutput');
          whitelist.push('setInputSequence');
          break;
      }
      if (whitelist.indexOf(action) === -1) {
        return true;
      }
      return false;
    }
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
        : decompile(input.finalScriptSig) || [];
      const witnessItems = !input.finalScriptWitness
        ? []
        : decompile(input.finalScriptWitness) || [];
      return scriptItems
        .concat(witnessItems)
        .filter(item => {
          return (
            item instanceof Uint8Array && isCanonicalScriptSignature(item)
          );
        })
        .map(sig => ({ signature: sig }));
    }

    /**
     * Converts a public key to an X-only public key.
     * @param pubKey The public key to convert.
     * @returns The X-only public key.
     */
    const toXOnly = pubKey =>
      pubKey.length === 32 ? pubKey : pubKey.slice(1, 33);
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
        return { finalScriptWitness: witnessStackToScriptWitness(witness) };
      } catch (err) {
        throw new Error(`Can not finalize taproot input #${inputIndex}: ${err}`);
      }
    }
    /**
     * Serializes a taproot signature.
     * @param sig The signature to serialize.
     * @param sighashType The sighash type. Optional.
     * @returns The serialized taproot signature.
     */
    function serializeTaprootSignature(sig, sighashType) {
      const sighashTypeByte = sighashType
        ? Uint8Array.from([sighashType])
        : Uint8Array.from([]);
      return concat([sig, sighashTypeByte]);
    }
    /**
     * Checks if a PSBT input is a taproot input.
     * @param input The PSBT input to check.
     * @returns True if the input is a taproot input, false otherwise.
     */
    function isTaprootInput(input) {
      return (
        input &&
        !!(
          input.tapInternalKey ||
          input.tapMerkleRoot ||
          (input.tapLeafScript && input.tapLeafScript.length) ||
          (input.tapBip32Derivation && input.tapBip32Derivation.length) ||
          (input.witnessUtxo && isP2TR(input.witnessUtxo.script))
        )
      );
    }
    /**
     * Checks if a PSBT output is a taproot output.
     * @param output The PSBT output to check.
     * @param script The script to check. Optional.
     * @returns True if the output is a taproot output, false otherwise.
     */
    function isTaprootOutput(output, script) {
      return (
        output &&
        !!(
          output.tapInternalKey ||
          output.tapTree ||
          (output.tapBip32Derivation && output.tapBip32Derivation.length) ||
          (script)
        )
      );
    }
    /**
     * Checks the taproot input fields for consistency.
     * @param inputData The original input data.
     * @param newInputData The new input data.
     * @param action The action being performed.
     * @throws Throws an error if the input fields are inconsistent.
     */
    function checkTaprootInputFields(inputData, newInputData, action) {
      checkMixedTaprootAndNonTaprootInputFields(inputData, newInputData, action);
      checkIfTapLeafInTree(inputData, newInputData, action);
    }
    /**
     * Checks the taproot output fields for consistency.
     * @param outputData The original output data.
     * @param newOutputData The new output data.
     * @param action The action being performed.
     * @throws Throws an error if the output fields are inconsistent.
     */
    function checkTaprootOutputFields(outputData, newOutputData, action) {
      checkMixedTaprootAndNonTaprootOutputFields(outputData, newOutputData, action);
      checkTaprootScriptPubkey(outputData, newOutputData);
    }
    function checkTaprootScriptPubkey(outputData, newOutputData) {
      if (!newOutputData.tapTree && !newOutputData.tapInternalKey) return;
      const tapInternalKey =
        newOutputData.tapInternalKey || outputData.tapInternalKey;
      const tapTree = newOutputData.tapTree || outputData.tapTree;
      if (tapInternalKey) {
        const { script: scriptPubkey } = outputData;
        const script = getTaprootScripPubkey(tapInternalKey, tapTree);
        if (scriptPubkey && compare(script, scriptPubkey) !== 0)
          throw new Error('Error adding output. Script or address mismatch.');
      }
    }
    /**
     * Returns the Taproot script public key.
     *
     * @param tapInternalKey - The Taproot internal key.
     * @param tapTree - The Taproot tree (optional).
     * @returns The Taproot script public key.
     */
    function getTaprootScripPubkey(tapInternalKey, tapTree) {
      const scriptTree = tapTree && tapTreeFromList(tapTree.leaves);
      const { output } = p2tr({
        internalPubkey: tapInternalKey,
        scriptTree,
      });
      return output;
    }
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
    /**
     * Checks the taproot input for signatures.
     * @param input The PSBT input to check.
     * @param action The action being performed.
     * @returns True if the input has taproot signatures, false otherwise.
     */
    function checkTaprootInputForSigs(input, action) {
      const sigs = extractTaprootSigs(input);
      return sigs.some(sig =>
        signatureBlocksAction(sig, decodeSchnorrSignature, action),
      );
    }
    /**
     * Decodes a Schnorr signature.
     * @param signature The signature to decode.
     * @returns The decoded Schnorr signature.
     */
    function decodeSchnorrSignature(signature) {
      return {
        signature: signature.slice(0, 64),
        hashType: signature.slice(64)[0] || Transaction.SIGHASH_DEFAULT,
      };
    }
    /**
     * Extracts taproot signatures from a PSBT input.
     * @param input The PSBT input to extract signatures from.
     * @returns An array of taproot signatures.
     */
    function extractTaprootSigs(input) {
      const sigs = [];
      if (input.tapKeySig) sigs.push(input.tapKeySig);
      if (input.tapScriptSig)
        sigs.push(...input.tapScriptSig.map(s => s.signature));
      if (!sigs.length) {
        const finalTapKeySig = getTapKeySigFromWitness(input.finalScriptWitness);
        if (finalTapKeySig) sigs.push(finalTapKeySig);
      }
      return sigs;
    }
    /**
     * Gets the taproot signature from the witness.
     * @param finalScriptWitness The final script witness.
     * @returns The taproot signature, or undefined if not found.
     */
    function getTapKeySigFromWitness(finalScriptWitness) {
      if (!finalScriptWitness) return;
      const witness = finalScriptWitness.slice(2);
      // todo: add schnorr signature validation
      if (witness.length === 64 || witness.length === 65) return witness;
    }
    /**
     * Inserts the tapleaves into the taproot tree.
     * @param leaves The tapleaves to insert.
     * @returns The taproot tree.
     * @throws Throws an error if there is no room left to insert a tapleaf in the tree.
     */
    function instertLeavesInTree(leaves) {
      let tree;
      for (const leaf of leaves) {
        tree = instertLeafInTree(leaf, tree);
        if (!tree) throw new Error(`No room left to insert tapleaf in tree`);
      }
      return tree;
    }
    /**
     * Inserts a tapleaf into the taproot tree.
     * @param leaf The tapleaf to insert.
     * @param tree The taproot tree.
     * @param depth The current depth. Optional.
     * @returns The updated taproot tree.
     */
    function instertLeafInTree(leaf, tree, depth = 0) {
      if (depth > MAX_TAPTREE_DEPTH) throw new Error('Max taptree depth exceeded.');
      if (leaf.depth === depth) {
        if (!tree)
          return {
            output: leaf.script,
            version: leaf.leafVersion,
          };
        return;
      }
      if (isTapleaf(tree)) return;
      const leftSide = instertLeafInTree(leaf, tree && tree[0], depth + 1);
      if (leftSide) return [leftSide, tree && tree[1]];
      const rightSide = instertLeafInTree(leaf, tree && tree[1], depth + 1);
      if (rightSide) return [tree && tree[0], rightSide];
    }
    /**
     * Checks the input fields for mixed taproot and non-taproot fields.
     * @param inputData The original input data.
     * @param newInputData The new input data.
     * @param action The action being performed.
     * @throws Throws an error if the input fields are inconsistent.
     */
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
    /**
     * Checks the output fields for mixed taproot and non-taproot fields.
     * @param inputData The original output data.
     * @param newInputData The new output data.
     * @param action The action being performed.
     * @throws Throws an error if the output fields are inconsistent.
     */
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
      const leafHash = tapleafHash({
        output: tapLeaf.script,
        version: tapLeaf.leafVersion,
      });
      const rootHash = rootHashFromPath(tapLeaf.controlBlock, leafHash);
      return compare(rootHash, merkleRoot) === 0;
    }
    /**
     * Sorts the signatures in the input's tapScriptSig array based on their position in the tapLeaf script.
     *
     * @param input - The PsbtInput object.
     * @param tapLeaf - The TapLeafScript object.
     * @returns An array of sorted signatures as Buffers.
     */
    function sortSignatures(input, tapLeaf) {
      const leafHash = tapleafHash({
        output: tapLeaf.script,
        version: tapLeaf.leafVersion,
      });
      return (
        (input.tapScriptSig || [])
          // .filter(tss => tss.leafHash.equals(leafHash))
          .filter(tss => compare(tss.leafHash, leafHash) === 0)
          .map(tss => addPubkeyPositionInScript(tapLeaf.script, tss))
          .sort((t1, t2) => t2.positionInScript - t1.positionInScript)
          .map(t => t.signature)
      );
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
          positionInScript: pubkeyPositionInScript(tss.pubkey, script),
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
      const leafHash = tapleafHash({
        output: leaf.script,
        version: leaf.leafVersion,
      });
      const whiteListedHash = !hash || compare(leafHash, hash) === 0;
      return (
        whiteListedHash &&
        tapScriptSig.find(tss => compare(tss.leafHash, leafHash) === 0) !==
          undefined
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

    /**
     * These are the default arguments for a Psbt instance.
     */
    const DEFAULT_OPTS = {
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
      data;
      static fromBase64(data, opts = {}) {
        const buffer = fromBase64(data);
        return this.fromBuffer(buffer, opts);
      }
      static fromHex(data, opts = {}) {
        const buffer = fromHex(data);
        return this.fromBuffer(buffer, opts);
      }
      static fromBuffer(buffer, opts = {}) {
        const psbtBase = Psbt$1.fromBuffer(buffer, transactionFromBuffer);
        const psbt = new Psbt(opts, psbtBase);
        checkTxForDupeIns(psbt.__CACHE.__TX, psbt.__CACHE);
        return psbt;
      }
      __CACHE;
      opts;
      constructor(opts = {}, data = new Psbt$1(new PsbtTransaction())) {
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
          hash: cloneBuffer(input.hash),
          index: input.index,
          sequence: input.sequence,
        }));
      }
      get txOutputs() {
        return this.__CACHE.__TX.outs.map(output => {
          let address;
          try {
            address = fromOutputScript(output.script, this.opts.network);
          } catch (_) {}
          return {
            script: cloneBuffer(output.script),
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
        checkTaprootInputFields(inputData, inputData, 'addInput');
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
          const script = toOutputScript(address, network);
          outputData = Object.assign({}, outputData, { script });
        }
        checkTaprootOutputFields(outputData, outputData, 'addOutput');
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
        checkForInput(this.data.inputs, 0); // making sure we have at least one
        range(this.data.inputs.length).forEach(idx => this.finalizeInput(idx));
        return this;
      }
      finalizeInput(inputIndex, finalScriptsFunc) {
        const input = checkForInput(this.data.inputs, inputIndex);
        if (isTaprootInput(input))
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
        finalScriptsFunc = tapScriptFinalizer,
      ) {
        const input = checkForInput(this.data.inputs, inputIndex);
        if (isTaprootInput(input))
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
        checkPartialSigSighashes$1(input);
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
        finalScriptsFunc = tapScriptFinalizer,
      ) {
        if (!input.witnessUtxo)
          throw new Error(
            `Cannot finalize input #${inputIndex}. Missing withness utxo.`,
          );
        // Check key spend first. Increased privacy and reduced block space.
        if (input.tapKeySig) {
          const payment = p2tr({
            output: input.witnessUtxo.script,
            signature: input.tapKeySig,
          });
          const finalScriptWitness = witnessStackToScriptWitness(payment.witness);
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
        const input = checkForInput(this.data.inputs, inputIndex);
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
        const input = checkForInput(this.data.inputs, inputIndex);
        return pubkeyInInput(pubkey, input, inputIndex, this.__CACHE);
      }
      inputHasHDKey(inputIndex, root) {
        const input = checkForInput(this.data.inputs, inputIndex);
        const derivationIsMine = bip32DerivationIsMine(root);
        return (
          !!input.bip32Derivation && input.bip32Derivation.some(derivationIsMine)
        );
      }
      outputHasPubkey(outputIndex, pubkey) {
        const output = checkForOutput(this.data.outputs, outputIndex);
        return pubkeyInOutput(pubkey, output, outputIndex, this.__CACHE);
      }
      outputHasHDKey(outputIndex, root) {
        const output = checkForOutput(this.data.outputs, outputIndex);
        const derivationIsMine = bip32DerivationIsMine(root);
        return (
          !!output.bip32Derivation && output.bip32Derivation.some(derivationIsMine)
        );
      }
      validateSignaturesOfAllInputs(validator) {
        checkForInput(this.data.inputs, 0); // making sure we have at least one
        const results = range(this.data.inputs.length).map(idx =>
          this.validateSignaturesOfInput(idx, validator),
        );
        return results.reduce((final, res) => res === true && final, true);
      }
      validateSignaturesOfInput(inputIndex, validator, pubkey) {
        const input = this.data.inputs[inputIndex];
        if (isTaprootInput(input))
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
          ? partialSig.filter(sig => compare(sig.pubkey, pubkey) === 0)
          : partialSig;
        if (mySigs.length < 1) throw new Error('No signatures for this pubkey');
        const results = [];
        let hashCache;
        let scriptCache;
        let sighashCache;
        for (const pSig of mySigs) {
          const sig = signature.decode(pSig.signature);
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
        pubkey = pubkey && toXOnly(pubkey);
        const allHashses = pubkey
          ? getTaprootHashesForSigValidation(
              inputIndex,
              input,
              this.data.inputs,
              pubkey,
              this.__CACHE,
            )
          : getAllTaprootHashesForSigValidation(
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
            const tapSigHash = allHashses.find(
              h => compare(h.pubkey, tapSig.pubkey) === 0,
            );
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
      signAllInputsHD(hdKeyPair, sighashTypes = [Transaction.SIGHASH_ALL]) {
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
      signAllInputsHDAsync(hdKeyPair, sighashTypes = [Transaction.SIGHASH_ALL]) {
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
      signInputHD(inputIndex, hdKeyPair, sighashTypes = [Transaction.SIGHASH_ALL]) {
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
        sighashTypes = [Transaction.SIGHASH_ALL],
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
        const input = checkForInput(this.data.inputs, inputIndex);
        if (isTaprootInput(input)) {
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
        const input = checkForInput(this.data.inputs, inputIndex);
        if (isTaprootInput(input))
          return this._signTaprootInput(
            inputIndex,
            input,
            keyPair,
            tapLeafHashToSign,
            sighashTypes,
          );
        throw new Error(`Input #${inputIndex} is not of type Taproot.`);
      }
      _signInput(inputIndex, keyPair, sighashTypes = [Transaction.SIGHASH_ALL]) {
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
            signature: signature.encode(keyPair.sign(hash), sighashType),
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
        allowedSighashTypes = [Transaction.SIGHASH_DEFAULT],
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
            serializeTaprootSignature(
              keyPair.signSchnorr(h.hash),
              input.sighashType,
            ),
          )[0];
        const tapScriptSig = hashesForSig
          .filter(h => !!h.leafHash)
          .map(h => ({
            pubkey: toXOnly(keyPair.publicKey),
            signature: serializeTaprootSignature(
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
          const input = checkForInput(this.data.inputs, inputIndex);
          if (isTaprootInput(input))
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
          const input = checkForInput(this.data.inputs, inputIndex);
          if (isTaprootInput(input))
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
        sighashTypes = [Transaction.SIGHASH_ALL],
      ) {
        const { hash, sighashType } = getHashAndSighashType(
          this.data.inputs,
          inputIndex,
          keyPair.publicKey,
          this.__CACHE,
          sighashTypes,
        );
        return Promise.resolve(keyPair.sign(hash)).then(signature$1 => {
          const partialSig = [
            {
              pubkey: keyPair.publicKey,
              signature: signature.encode(signature$1, sighashType),
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
        sighashTypes = [Transaction.SIGHASH_DEFAULT],
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
            return { tapKeySig: serializeTaprootSignature(sig, input.sighashType) };
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
                    pubkey: toXOnly(keyPair.publicKey),
                    signature: serializeTaprootSignature(
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
        const hashesForSig = getTaprootHashesForSigning(
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
            `Can not sign for input #${inputIndex} with the key ${toHex(keyPair.publicKey)}`,
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
        checkTaprootOutputFields(outputData, updateData, 'updateOutput');
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
      tx;
      constructor(buffer = Uint8Array.from([2, 0, 0, 0, 0, 0, 0, 0, 0, 0])) {
        this.tx = Transaction.fromBuffer(buffer);
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
          (!(input.hash instanceof Uint8Array) && typeof input.hash !== 'string') ||
          typeof input.index !== 'number'
        ) {
          throw new Error('Error adding input.');
        }
        const hash =
          typeof input.hash === 'string'
            ? reverseBuffer(fromHex(input.hash))
            : input.hash;
        this.tx.addInput(hash, input.index, input.sequence);
      }
      addOutput(output) {
        if (
          output.script === undefined ||
          output.value === undefined ||
          !(output.script instanceof Uint8Array) ||
          typeof output.value !== 'bigint'
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
          const p2ms$1 = p2ms({ output: script });
          return hasSigs(p2ms$1.m, input.partialSig, p2ms$1.pubkeys);
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
            return partialSig.find(
              pSig => compare(pSig.pubkey, pubkey) === 0,
            );
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
        if (compare(root.fingerprint, d.masterFingerprint)) return false;
        if (compare(root.derivePath(d.path).publicKey, d.pubkey))
          return false;
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
        const throws = isTaprootInput(input)
          ? checkTaprootInputForSigs(input, action)
          : checkInputForSig(input, action);
        if (throws)
          throw new Error('Can not modify transaction, signatures exist.');
      });
    }
    function checkPartialSigSighashes$1(input) {
      if (!input.sighashType || !input.partialSig) return;
      const { partialSig, sighashType } = input;
      partialSig.forEach(pSig => {
        const { hashType } = signature.decode(pSig.signature);
        if (sighashType !== hashType) {
          throw new Error('Signature sighash does not match input sighash type');
        }
      });
    }
    function checkScriptForPubkey(pubkey, script, action) {
      if (!pubkeyInScript(pubkey, script)) {
        throw new Error(
          `Can not ${action} for this input with the key ${toHex(pubkey)}`,
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
        toHex(reverseBuffer(Uint8Array.from(input.hash))) + ':' + input.index;
      if (cache.__TX_IN_CACHE[key]) throw new Error('Duplicate input detected.');
      cache.__TX_IN_CACHE[key] = 1;
    }
    function scriptCheckerFactory(payment, paymentScriptName) {
      return (inputIndex, scriptPubKey, redeemScript, ioType) => {
        const redeemScriptOutput = payment({
          redeem: { output: redeemScript },
        }).output;
        if (compare(scriptPubKey, redeemScriptOutput)) {
          throw new Error(
            `${paymentScriptName} for ${ioType} #${inputIndex} doesn't match the scriptPubKey in the prevout`,
          );
        }
      };
    }
    const checkRedeemScript = scriptCheckerFactory(p2sh, 'Redeem script');
    const checkWitnessScript = scriptCheckerFactory(
      p2wsh,
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
      const p2wsh$1 = !isP2WSH ? null : p2wsh({ redeem: payment });
      const p2sh$1 = !isP2SH ? null : p2sh({ redeem: p2wsh$1 || payment });
      if (isSegwit) {
        if (p2wsh$1) {
          finalScriptWitness = witnessStackToScriptWitness(p2wsh$1.witness);
        } else {
          finalScriptWitness = witnessStackToScriptWitness(payment.witness);
        }
        if (p2sh$1) {
          finalScriptSig = p2sh$1.input;
        }
      } else {
        if (p2sh$1) {
          finalScriptSig = p2sh$1.input;
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
      const input = checkForInput(inputs, inputIndex);
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
      const sighashType = input.sighashType || Transaction.SIGHASH_ALL;
      checkSighashTypeAllowed(sighashType, sighashTypes);
      let hash;
      let prevout;
      if (input.nonWitnessUtxo) {
        const nonWitnessUtxoTx = nonWitnessUtxoTxFromCache$1(
          cache,
          input,
          inputIndex,
        );
        const prevoutHash = unsignedTx.ins[inputIndex].hash;
        const utxoHash = nonWitnessUtxoTx.getHash();
        // If a non-witness UTXO is provided, its hash must match the hash specified in the prevout
        if (compare(prevoutHash, utxoHash) !== 0) {
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
      } else if (isP2WPKH(meaningfulScript)) {
        // P2WPKH uses the P2PKH template for prevoutScript when signing
        const signingScript = p2pkh({
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
              `${toHex(meaningfulScript)}`,
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
    function getAllTaprootHashesForSigValidation(inputIndex, input, inputs, cache) {
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
      const allHashes = allPublicKeys.map(publicKey =>
        getTaprootHashesForSigValidation(
          inputIndex,
          input,
          inputs,
          publicKey,
          cache,
        ),
      );
      return allHashes.flat();
    }
    function getPrevoutTaprootKey(inputIndex, input, cache) {
      const { script } = getScriptAndAmountFromUtxo(inputIndex, input, cache);
      return isP2TR(script) ? script.subarray(2, 34) : null;
    }
    function trimTaprootSig(signature) {
      return signature.length === 64 ? signature : signature.subarray(0, 64);
    }
    function getTaprootHashesForSigning(
      inputIndex,
      input,
      inputs,
      pubkey,
      cache,
      tapLeafHashToSign,
      allowedSighashTypes,
    ) {
      const sighashType = input.sighashType || Transaction.SIGHASH_DEFAULT;
      checkSighashTypeAllowed(sighashType, allowedSighashTypes);
      const keySpend = Boolean(input.tapInternalKey && !tapLeafHashToSign);
      return getTaprootHashesForSig(
        inputIndex,
        input,
        inputs,
        pubkey,
        cache,
        keySpend,
        sighashType,
        tapLeafHashToSign,
      );
    }
    function getTaprootHashesForSigValidation(
      inputIndex,
      input,
      inputs,
      pubkey,
      cache,
    ) {
      const sighashType = input.sighashType || Transaction.SIGHASH_DEFAULT;
      const keySpend = Boolean(input.tapKeySig);
      return getTaprootHashesForSig(
        inputIndex,
        input,
        inputs,
        pubkey,
        cache,
        keySpend,
        sighashType,
      );
    }
    /*
     * This helper method is used for both generating a hash for signing as well for validating;
     * thus depending on context key spend can be detected either with tapInternalKey with no leaves
     * or tapKeySig (note tapKeySig is a signature to the prevout pk, so tapInternalKey is not needed).
     */
    function getTaprootHashesForSig(
      inputIndex,
      input,
      inputs,
      pubkey,
      cache,
      keySpend,
      sighashType,
      tapLeafHashToSign,
    ) {
      const unsignedTx = cache.__TX;
      const prevOuts = inputs.map((i, index) =>
        getScriptAndAmountFromUtxo(index, i, cache),
      );
      const signingScripts = prevOuts.map(o => o.script);
      const values = prevOuts.map(o => o.value);
      const hashes = [];
      if (keySpend) {
        const outputKey =
          getPrevoutTaprootKey(inputIndex, input, cache) || Uint8Array.from([]);
        if (compare(toXOnly(pubkey), outputKey) === 0) {
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
        .filter(tapLeaf => pubkeyInScript(pubkey, tapLeaf.script))
        .map(tapLeaf => {
          const hash = tapleafHash({
            output: tapLeaf.script,
            version: tapLeaf.leafVersion,
          });
          return Object.assign({ hash }, tapLeaf);
        })
        .filter(
          tapLeaf =>
            !tapLeafHashToSign ||
            compare(tapLeafHashToSign, tapLeaf.hash) === 0,
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
          payment = p2ms({
            output: script,
            signatures: sigs,
          });
          break;
        case 'pubkey':
          payment = p2pk({
            output: script,
            signature: partialSig[0].signature,
          });
          break;
        case 'pubkeyhash':
          payment = p2pkh({
            output: script,
            pubkey: partialSig[0].pubkey,
            signature: partialSig[0].signature,
          });
          break;
        case 'witnesspubkeyhash':
          payment = p2wpkh({
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
          const nonWitnessUtxoTx = nonWitnessUtxoTxFromCache$1(
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
      if (input.witnessScript || isP2WPKH(res.script)) {
        res.isSegwit = true;
      }
      return res;
    }
    function getSignersFromHD(inputIndex, inputs, hdKeyPair) {
      const input = checkForInput(inputs, inputIndex);
      if (!input.bip32Derivation || input.bip32Derivation.length === 0) {
        throw new Error('Need bip32Derivation to sign with HD');
      }
      const myDerivations = input.bip32Derivation
        .map(bipDv => {
          if (compare(bipDv.masterFingerprint, hdKeyPair.fingerprint) === 0) {
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
        if (compare(bipDv.pubkey, node.publicKey) !== 0) {
          throw new Error('pubkey did not match bip32Derivation');
        }
        return node;
      });
      return signers;
    }
    function getSortedSigs(script, partialSig) {
      const p2ms$1 = p2ms({ output: script });
      // for each pubkey in order of p2ms script
      return p2ms$1.pubkeys
        .map(pk => {
          // filter partialSig array by pubkey being equal
          return (
            partialSig.filter(ps => {
              return compare(ps.pubkey, pk) === 0;
            })[0] || {}
          ).signature;
          // Any pubkey without a match will return undefined
          // this last filter removes all the undefined items in the array.
        })
        .filter(v => !!v);
    }
    function scriptWitnessToWitnessStack$1(buffer) {
      let offset = 0;
      function readSlice(n) {
        offset += n;
        return buffer.slice(offset - n, offset);
      }
      function readVarInt() {
        const vi = decode$d(buffer, offset);
        offset += encodingLength(vi.bigintValue);
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
      let text =
        sighashType & Transaction.SIGHASH_ANYONECANPAY
          ? 'SIGHASH_ANYONECANPAY | '
          : '';
      const sigMod = sighashType & 0x1f;
      switch (sigMod) {
        case Transaction.SIGHASH_ALL:
          text += 'SIGHASH_ALL';
          break;
        case Transaction.SIGHASH_SINGLE:
          text += 'SIGHASH_SINGLE';
          break;
        case Transaction.SIGHASH_NONE:
          text += 'SIGHASH_NONE';
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
      let inputAmount = 0n;
      inputs.forEach((input, idx) => {
        if (mustFinalize && input.finalScriptSig)
          tx.ins[idx].script = input.finalScriptSig;
        if (mustFinalize && input.finalScriptWitness) {
          tx.ins[idx].witness = scriptWitnessToWitnessStack$1(
            input.finalScriptWitness,
          );
        }
        if (input.witnessUtxo) {
          inputAmount += input.witnessUtxo.value;
        } else if (input.nonWitnessUtxo) {
          const nwTx = nonWitnessUtxoTxFromCache$1(cache, input, idx);
          const vout = tx.ins[idx].index;
          const out = nwTx.outs[vout];
          inputAmount += out.value;
        }
      });
      const outputAmount = tx.outs.reduce((total, o) => total + o.value, 0n);
      const fee = inputAmount - outputAmount;
      if (fee < 0) {
        throw new Error('Outputs are spending more than Inputs');
      }
      const bytes = tx.virtualSize();
      cache.__FEE = fee;
      cache.__EXTRACTED_TX = tx;
      cache.__FEE_RATE = Math.floor(Number(fee / BigInt(bytes)));
    }
    function nonWitnessUtxoTxFromCache$1(cache, input, inputIndex) {
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
        const nonWitnessUtxoTx = nonWitnessUtxoTxFromCache$1(
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
      return pubkeyInScript(pubkey, meaningfulScript);
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
      return pubkeyInScript(pubkey, meaningfulScript);
    }
    function redeemFromFinalScriptSig(finalScript) {
      if (!finalScript) return;
      const decomp = decompile(finalScript);
      if (!decomp) return;
      const lastItem = decomp[decomp.length - 1];
      if (
        !(lastItem instanceof Uint8Array) ||
        isPubkeyLike(lastItem) ||
        isSigLike(lastItem)
      )
        return;
      const sDecomp = decompile(lastItem);
      if (!sDecomp) return;
      return lastItem;
    }
    function redeemFromFinalWitnessScript(finalScript) {
      if (!finalScript) return;
      const decomp = scriptWitnessToWitnessStack$1(finalScript);
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
    function getMeaningfulScript(
      script,
      index,
      ioType,
      redeemScript,
      witnessScript,
    ) {
      const isP2SH = isP2SHScript(script);
      const isP2SHP2WSH = isP2SH && redeemScript && isP2WSHScript(redeemScript);
      const isP2WSH = isP2WSHScript(script);
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
      if (isP2WPKH(script) || isP2SHScript(script)) {
        throw new Error('P2WPKH or P2SH can not be contained within P2WSH');
      }
    }
    function classifyScript(script) {
      if (isP2WPKH(script)) return 'witnesspubkeyhash';
      if (isP2PKH(script)) return 'pubkeyhash';
      if (isP2MS(script)) return 'multisig';
      if (isP2PK(script)) return 'pubkey';
      return 'nonstandard';
    }
    function range(n) {
      return [...Array(n).keys()];
    }

    /**
     * Neurai network configurations for bitcoinjs-lib
     *
     * Defines all Neurai networks (mainnet, testnet, legacy variants)
     * in the format required by bitcoinjs-lib v7.
     */
    // ─── Neurai Mainnet (coin type 1900) ────────────────────────────────────────
    const neuraiMainnet = {
        messagePrefix: "Neurai Signed Message:\n",
        bech32: "",
        bip32: {
            public: 76067358,
            private: 76066276,
        },
        pubKeyHash: 53, // 0x35 → prefix "N"
        scriptHash: 117, // 0x75
        wif: 128, // 0x80
    };
    // ─── Neurai Testnet ──────────────────────────────────────────────────────────
    const neuraiTestnet = {
        messagePrefix: "Neurai Signed Message:\n",
        bech32: "",
        bip32: {
            public: 70617039,
            private: 70615956,
        },
        pubKeyHash: 127, // 0x7f
        scriptHash: 196, // 0xc4
        wif: 239, // 0xef
    };
    // ─── Neurai Legacy Mainnet (coin type 0) ─────────────────────────────────────
    const neuraiLegacyMainnet = {
        messagePrefix: "Neurai Signed Message:\n",
        bech32: "",
        bip32: {
            public: 76067358,
            private: 76066276,
        },
        pubKeyHash: 53,
        scriptHash: 117,
        wif: 128,
    };
    // ─── Neurai Legacy Testnet ───────────────────────────────────────────────────
    const neuraiLegacyTestnet = {
        messagePrefix: "Neurai Signed Message:\n",
        bech32: "",
        bip32: {
            public: 70617039,
            private: 70615956,
        },
        pubKeyHash: 127,
        scriptHash: 196,
        wif: 239,
    };
    // ─── Network map ─────────────────────────────────────────────────────────────
    const networkMap = {
        xna: neuraiMainnet,
        "xna-test": neuraiTestnet,
        "xna-legacy": neuraiLegacyMainnet,
        "xna-legacy-test": neuraiLegacyTestnet,
    };
    /**
     * Get the bitcoinjs-lib Network object for a given Neurai network type.
     */
    function getNetwork(network) {
        const net = networkMap[network];
        if (!net) {
            throw new Error(`Unknown network: ${network}`);
        }
        return net;
    }

    /**
     * PSBT helpers for Neurai P2PKH transactions.
     *
     * This package supports two build paths:
     * - high-level build from UTXOs + outputs + fee estimation
     * - low-level build from an already-created raw unsigned transaction
     *
     * The second path matches the webwallet integration, where coin selection
     * and fee calculation already happen elsewhere.
     */
    const DEFAULT_FEE_RATE = 1024;
    const TX_OVERHEAD = 10;
    const INPUT_SIZE = 148;
    const OUTPUT_SIZE = 34;
    function estimateTxSize(inputCount, outputCount) {
        return TX_OVERHEAD + inputCount * INPUT_SIZE + outputCount * OUTPUT_SIZE;
    }
    function parseMasterFingerprint(hex) {
        if (hex.length !== 8) {
            throw new Error(`Invalid master fingerprint: expected 8 hex chars, got ${hex.length}`);
        }
        return bufferExports.Buffer.from(hex, "hex");
    }
    function getSignatureHashType(signature) {
        return signature[signature.length - 1] ?? 1;
    }
    function checkPartialSigSighashes(input) {
        if (!input.sighashType || !input.partialSig)
            return;
        let normalizedSighashType = input.sighashType;
        input.partialSig.forEach((pSig) => {
            const hashType = getSignatureHashType(pSig.signature);
            if (normalizedSighashType !== hashType) {
                console.warn("[NeuraiSignESP32] Adjusting input sighashType to match returned signature", {
                    previousSighashType: normalizedSighashType,
                    returnedHashType: hashType,
                });
                normalizedSighashType = hashType;
            }
        });
        input.sighashType = normalizedSighashType;
    }
    function nonWitnessUtxoTxFromCache(cache, input, inputIndex) {
        const existing = cache.__NON_WITNESS_UTXO_TX_CACHE?.[inputIndex];
        if (existing) {
            return existing;
        }
        if (!input.nonWitnessUtxo) {
            throw new Error(`Missing nonWitnessUtxo for input #${inputIndex}`);
        }
        const tx = Transaction.fromBuffer(input.nonWitnessUtxo);
        cache.__NON_WITNESS_UTXO_TX_CACHE ?? (cache.__NON_WITNESS_UTXO_TX_CACHE = {});
        cache.__NON_WITNESS_UTXO_TX_CACHE[inputIndex] = tx;
        return tx;
    }
    function buildPSBT(options) {
        const { network, utxos, outputs, changeAddress, pubkey, masterFingerprint, derivationPath, feeRate = DEFAULT_FEE_RATE, } = options;
        if (utxos.length === 0) {
            throw new Error("No UTXOs provided");
        }
        if (outputs.length === 0) {
            throw new Error("No outputs provided");
        }
        const totalOutputValue = outputs.reduce((sum, output) => sum + output.value, 0);
        const totalInputValue = utxos.reduce((sum, utxo) => sum + utxo.satoshis, 0);
        const estimatedSize = estimateTxSize(utxos.length, outputs.length + 1);
        const fee = estimatedSize * feeRate;
        const change = totalInputValue - totalOutputValue - fee;
        if (change < 0) {
            throw new Error(`Insufficient funds: inputs=${totalInputValue}, outputs=${totalOutputValue}, fee=${fee}`);
        }
        const psbt = new Psbt({ network: getNetwork(network) });
        const bip32Derivation = [
            {
                masterFingerprint: parseMasterFingerprint(masterFingerprint),
                path: derivationPath,
                pubkey: bufferExports.Buffer.from(pubkey, "hex"),
            },
        ];
        for (const utxo of utxos) {
            psbt.addInput({
                hash: utxo.txid,
                index: utxo.vout,
                nonWitnessUtxo: bufferExports.Buffer.from(utxo.rawTxHex, "hex"),
                bip32Derivation,
            });
        }
        for (const output of outputs) {
            psbt.addOutput({
                address: output.address,
                value: BigInt(output.value),
            });
        }
        const DUST_THRESHOLD = 546;
        if (change >= DUST_THRESHOLD) {
            psbt.addOutput({
                address: changeAddress,
                value: BigInt(change),
                bip32Derivation,
            });
        }
        return psbt.toBase64();
    }
    function buildPSBTFromRawTransaction(options) {
        const network = getNetwork(options.network);
        const tx = Transaction.fromHex(options.rawUnsignedTransaction);
        const psbt = new Psbt({ network });
        psbt.setVersion(tx.version);
        psbt.setLocktime(tx.locktime);
        for (let index = 0; index < tx.ins.length; index += 1) {
            const input = tx.ins[index];
            const metadata = options.inputs[index];
            if (!metadata) {
                throw new Error(`Missing input metadata for input #${index}`);
            }
            const inputData = {
                hash: metadata.txid,
                index: metadata.vout,
                sequence: metadata.sequence ?? input.sequence,
                nonWitnessUtxo: bufferExports.Buffer.from(metadata.rawTxHex, "hex"),
            };
            if (metadata.masterFingerprint && metadata.derivationPath && metadata.pubkey) {
                inputData.bip32Derivation = [
                    {
                        masterFingerprint: parseMasterFingerprint(metadata.masterFingerprint),
                        path: metadata.derivationPath,
                        pubkey: bufferExports.Buffer.from(metadata.pubkey, "hex"),
                    },
                ];
            }
            if (metadata.sighashType !== undefined) {
                inputData.sighashType = metadata.sighashType;
            }
            psbt.addInput(inputData);
        }
        for (const output of tx.outs) {
            psbt.addOutput({
                script: bufferExports.Buffer.from(output.script),
                value: output.value,
            });
        }
        return psbt.toBase64();
    }
    function finalizePSBT(signedPsbtBase64, network) {
        const psbt = Psbt.fromBase64(signedPsbtBase64, {
            network: getNetwork(network),
        });
        finalizeNeuraiP2pkhInputs(psbt, true);
        const tx = extractFinalizableTransaction(psbt, true);
        return {
            txHex: tx.toHex(),
            txId: tx.getId(),
        };
    }
    function finalizeSignedPSBT(originalPsbtBase64, signedPsbtBase64, network) {
        const net = getNetwork(network);
        const psbt = Psbt.fromBase64(originalPsbtBase64, { network: net });
        let mergedWithStandardPsbt = false;
        try {
            const signedPsbt = Psbt.fromBase64(signedPsbtBase64, { network: net });
            psbt.combine(signedPsbt);
            mergedWithStandardPsbt = true;
        }
        catch {
            // uNeurai can return a minimal signed PSBT that bitcoinjs-lib cannot fully parse.
        }
        if (!mergedWithStandardPsbt) {
            const partialSigsByInput = extractPartialSigsFromUNeuraiPsbt(originalPsbtBase64, signedPsbtBase64, psbt.inputCount);
            partialSigsByInput.forEach((partialSig, index) => {
                if (partialSig.length === 0) {
                    return;
                }
                psbt.updateInput(index, { partialSig });
            });
        }
        psbt.data.inputs.forEach((input) => checkPartialSigSighashes(input));
        finalizeNeuraiP2pkhInputs(psbt, false);
        const tx = extractFinalizableTransaction(psbt, false);
        return {
            txHex: tx.toHex(),
            txId: tx.getId(),
        };
    }
    function validatePSBT(psbtBase64, network) {
        try {
            Psbt.fromBase64(psbtBase64, { network: getNetwork(network) });
            return true;
        }
        catch {
            return false;
        }
    }
    function extractPartialSigsFromUNeuraiPsbt(originalBase64, signedBase64, inputCount) {
        const originalBuffer = bufferExports.Buffer.from(originalBase64, "base64");
        const buffer = bufferExports.Buffer.from(signedBase64, "base64");
        const partialSigsByInput = Array.from({ length: inputCount }, () => []);
        if (buffer.length < 5 || buffer.toString("ascii", 0, 4) !== "psbt" || buffer[4] !== 0xff) {
            throw new Error("NeuraiHW returned an invalid PSBT header");
        }
        let offset = getFirstInputSectionOffset(originalBuffer);
        for (let inputIndex = 0; inputIndex < inputCount; inputIndex += 1) {
            while (offset < buffer.length) {
                const keyLen = readPsbtVarInt(buffer, offset);
                offset += keyLen.size;
                if (keyLen.value === 0) {
                    break;
                }
                const key = buffer.subarray(offset, offset + keyLen.value);
                offset += keyLen.value;
                const valueLen = readPsbtVarInt(buffer, offset);
                offset += valueLen.size;
                const value = buffer.subarray(offset, offset + valueLen.value);
                offset += valueLen.value;
                if (key.length > 1 && key[0] === 0x02) {
                    partialSigsByInput[inputIndex].push({
                        pubkey: bufferExports.Buffer.from(key.subarray(1)),
                        signature: bufferExports.Buffer.from(value),
                    });
                }
            }
        }
        return partialSigsByInput;
    }
    function getFirstInputSectionOffset(buffer) {
        if (buffer.length < 5 || buffer.toString("ascii", 0, 4) !== "psbt" || buffer[4] !== 0xff) {
            throw new Error("Invalid original PSBT header");
        }
        let offset = 5;
        const globalKeyLen = readPsbtVarInt(buffer, offset);
        offset += globalKeyLen.size + globalKeyLen.value;
        const globalValueLen = readPsbtVarInt(buffer, offset);
        offset += globalValueLen.size + globalValueLen.value;
        if (offset >= buffer.length || buffer[offset] !== 0x00) {
            throw new Error("Invalid original PSBT global section");
        }
        return offset + 1;
    }
    function readPsbtVarInt(buffer, offset) {
        if (offset >= buffer.length) {
            throw new Error("Format Error: Unexpected End of PSBT");
        }
        const first = buffer[offset];
        if (first < 0xfd) {
            return { value: first, size: 1 };
        }
        if (first === 0xfd) {
            if (offset + 2 >= buffer.length) {
                throw new Error("Format Error: Unexpected End of PSBT");
            }
            return { value: buffer.readUInt16LE(offset + 1), size: 3 };
        }
        if (first === 0xfe) {
            if (offset + 4 >= buffer.length) {
                throw new Error("Format Error: Unexpected End of PSBT");
            }
            return { value: buffer.readUInt32LE(offset + 1), size: 5 };
        }
        throw new Error("PSBT values larger than 32 bits are not supported");
    }
    function finalizeNeuraiP2pkhInputs(psbt, requireAllInputs) {
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
                if (requireAllInputs) {
                    throw new Error(`Missing data to finalize input #${index}`);
                }
                continue;
            }
            const prevTx = Transaction.fromBuffer(nonWitnessUtxo);
            const prevOut = prevTx.outs[txInput.index];
            if (!prevOut) {
                if (requireAllInputs) {
                    throw new Error(`Missing prevout to finalize input #${index}`);
                }
                continue;
            }
            psbt.finalizeInput(index, () => ({
                finalScriptSig: compile([
                    partialSig.signature,
                    partialSig.pubkey,
                ]),
                finalScriptWitness: undefined,
            }));
            finalizedCount += 1;
        }
        if (requireAllInputs && finalizedCount !== psbt.inputCount) {
            throw new Error(`Not all inputs were finalized (${finalizedCount}/${psbt.inputCount})`);
        }
    }
    function extractFinalizableTransaction(psbt, requireAllInputs) {
        const cache = psbt.__CACHE;
        const baseTx = cache?.__TX;
        if (!baseTx || !cache) {
            if (requireAllInputs) {
                return psbt.extractTransaction(true);
            }
            return psbt.extractTransaction();
        }
        const tx = baseTx.clone();
        inputFinalizeGetAmtsPartial(psbt.data.inputs, tx, cache, requireAllInputs);
        return tx;
    }
    function inputFinalizeGetAmtsPartial(inputs, tx, cache, requireAllInputs) {
        let inputAmount = 0n;
        inputs.forEach((input, idx) => {
            if (input.finalScriptSig) {
                tx.ins[idx].script = input.finalScriptSig;
            }
            if (input.finalScriptWitness) {
                tx.ins[idx].witness = scriptWitnessToWitnessStack(input.finalScriptWitness);
            }
            if (input.witnessUtxo) {
                inputAmount += input.witnessUtxo.value;
                return;
            }
            if (input.nonWitnessUtxo) {
                const nwTx = nonWitnessUtxoTxFromCache(cache, input, idx);
                const vout = tx.ins[idx].index;
                const out = nwTx.outs[vout];
                if (!out) {
                    if (requireAllInputs) {
                        throw new Error(`Missing prevout amount for input #${idx}`);
                    }
                    return;
                }
                inputAmount += out.value;
                return;
            }
            if (requireAllInputs) {
                throw new Error(`Missing UTXO data for input #${idx}`);
            }
        });
        const outputAmount = tx.outs.reduce((total, o) => total + o.value, 0n);
        const fee = inputAmount - outputAmount;
        cache.__FEE = fee >= 0n ? fee : 0n;
        cache.__EXTRACTED_TX = tx;
        cache.__FEE_RATE = fee > 0n ? Math.floor(Number(fee / BigInt(tx.virtualSize()))) : 0;
    }
    function scriptWitnessToWitnessStack(finalScriptWitness) {
        const buffer = bufferExports.Buffer.from(finalScriptWitness);
        let offset = 0;
        const count = readPsbtVarInt(buffer, offset);
        offset += count.size;
        const stack = [];
        for (let i = 0; i < count.value; i += 1) {
            const itemLen = readPsbtVarInt(buffer, offset);
            offset += itemLen.size;
            stack.push(buffer.subarray(offset, offset + itemLen.value));
            offset += itemLen.value;
        }
        return stack;
    }

    /**
     * NeuraiESP32 — Main class for interacting with a NeuraiHW hardware wallet.
     *
     * Orchestrates:
     * - USB Serial connection via Web Serial API
     * - Device info, address, and BIP32 pubkey retrieval
     * - PSBT creation, signing, and finalization
     *
     * Usage:
     * ```ts
     * const device = new NeuraiESP32();
     * await device.connect();
     * const info = await device.getInfo();
     * const { address, pubkey } = await device.getAddress();
     * const result = await device.signTransaction({ utxos, outputs, changeAddress: address });
     * console.log(result.txHex); // ready to broadcast
     * await device.disconnect();
     * ```
     */
    class NeuraiESP32 {
        constructor(options) {
            this.deviceInfo = null;
            this.serial = new SerialConnection(options);
        }
        static isSupported() {
            return SerialConnection.isSupported();
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
            const response = await this.serial.sendCommand({ action: "info" }, 5000);
            this.assertSuccess(response);
            this.deviceInfo = response;
            return this.deviceInfo;
        }
        async getAddress() {
            const response = await this.serial.sendCommand({ action: "get_address" }, 35000);
            this.assertSuccess(response);
            return response;
        }
        async getBip32Pubkey() {
            const response = await this.serial.sendCommand({ action: "get_bip32_pubkey" }, 35000);
            this.assertSuccess(response);
            return response;
        }
        async signMessage(message) {
            const response = await this.serial.sendCommand({ action: "sign_message", message }, 35000);
            this.assertSuccess(response);
            return response;
        }
        async signPsbt(psbtBase64, display) {
            const response = await this.serial.sendCommandFinal({
                action: "sign_psbt",
                psbt: psbtBase64,
                ...(display ? { display } : {}),
            }, 120000);
            this.assertSuccess(response);
            return response;
        }
        async signTransaction(options) {
            const info = this.deviceInfo;
            const network = options.network ?? this.inferNetworkType(info);
            const pubkey = options.pubkey ?? info?.pubkey;
            const masterFingerprint = options.masterFingerprint ?? info?.master_fingerprint;
            const derivationPath = options.derivationPath ?? info?.path;
            if (!pubkey) {
                throw new Error("pubkey required. Call getInfo() first or provide it explicitly.");
            }
            if (!masterFingerprint) {
                throw new Error("masterFingerprint required. Call getInfo() first or provide it explicitly.");
            }
            if (!derivationPath) {
                throw new Error("derivationPath required. Call getInfo() first or provide it explicitly.");
            }
            const psbtBase64 = buildPSBT({
                network,
                utxos: options.utxos,
                outputs: options.outputs,
                changeAddress: options.changeAddress,
                pubkey,
                masterFingerprint,
                derivationPath,
                feeRate: options.feeRate,
            });
            const signResponse = await this.signPsbt(psbtBase64, options.display);
            const { txHex, txId } = finalizeSignedPSBT(psbtBase64, signResponse.psbt, network);
            return {
                signedPsbtBase64: signResponse.psbt,
                txHex,
                txId,
                signedInputs: signResponse.signed_inputs,
            };
        }
        assertSuccess(response) {
            if (response.status === "error") {
                throw new Error(`Device error: ${response.message}`);
            }
        }
        inferNetworkType(info) {
            if (!info) {
                return "xna";
            }
            const name = (info.network ?? "").toLowerCase();
            const derivationPath = (info.path ?? "").trim();
            if (name.includes("legacy") && name.includes("test"))
                return "xna-legacy-test";
            if (name.includes("legacy"))
                return "xna-legacy";
            if (name.includes("test"))
                return "xna-test";
            if (info.coin_type === 1 || derivationPath.includes("/1'/"))
                return "xna-test";
            return "xna";
        }
    }

    function formatAmount(value) {
        if (typeof value === "string") {
            return value;
        }
        return value.toFixed(8);
    }
    function buildAssetTransferDisplayMetadata(options) {
        return {
            kind: "asset_transfer",
            assetName: options.assetName,
            assetAmount: formatAmount(options.assetAmount),
            destinationAddress: options.destinationAddress,
            destinationCount: options.destinationCount ?? 1,
            changeAddress: options.changeAddress,
            changeCount: options.changeCount ?? 0,
            inputAddresses: options.inputAddresses ?? [],
            feeAmount: options.feeAmount === undefined ? undefined : formatAmount(options.feeAmount),
            baseCurrency: options.baseCurrency ?? "XNA",
        };
    }

    const api = {
        NeuraiESP32,
        SerialConnection,
        buildPSBT,
        buildPSBTFromRawTransaction,
        finalizePSBT,
        finalizeSignedPSBT,
        validatePSBT,
        buildAssetTransferDisplayMetadata,
        getNetwork,
        neuraiMainnet,
        neuraiTestnet,
        neuraiLegacyMainnet,
        neuraiLegacyTestnet,
    };
    globalThis.NeuraiSignESP32 = api;

    return api;

})();
