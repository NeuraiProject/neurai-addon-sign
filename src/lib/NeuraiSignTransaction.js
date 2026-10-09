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

    /** Exact monetary primitives. This module has no runtime dependencies. */
    const MAX_MONEY = 2100000000000000000n;
    /** Normalize a raw integer without preserving an already rounded number. */
    function toRawInteger$2(value, label = 'amount') {
        if (typeof value === 'bigint')
            return value;
        if (typeof value === 'number' && Number.isSafeInteger(value))
            return BigInt(value);
        if (typeof value === 'string' && /^-?\d+$/.test(value) && value.length <= 100)
            return BigInt(value);
        throw new Error(`${label}: expected an exact integer; use bigint or an integer string for large values`);
    }
    function assertMoneyRange(value, label = 'amount') {
        const raw = toRawInteger$2(value, label);
        if (raw < 0n || raw > MAX_MONEY)
            throw new Error(`${label} outside Neurai monetary range`);
        return raw;
    }

    // Reference https://github.com/bitcoin/bips/blob/master/bip-0066.mediawiki
    // Format: 0x30 [total-length] 0x02 [R-length] [R] 0x02 [S-length] [S]
    // NOTE: SIGHASH byte ignored AND restricted, truncate before use
    /**
     * Checks if the given buffer is a valid BIP66-encoded signature.
     *
     * @param buffer - The buffer to check.
     * @returns A boolean indicating whether the buffer is a valid BIP66-encoded signature.
     */
    /**
     * Decodes a DER-encoded signature buffer and returns the R and S values.
     * @param buffer - The DER-encoded signature buffer.
     * @returns An object containing the R and S values.
     * @throws {Error} If the DER sequence length is too short, too long, or invalid.
     * @throws {Error} If the R or S length is zero or invalid.
     * @throws {Error} If the R or S value is negative or excessively padded.
     */
    function decode$4(buffer) {
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
    function encode$4(r, s) {
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
    var OPS$1;
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
    })(OPS$1 || (OPS$1 = {}));

    const HEX_STRINGS$3 = "0123456789abcdefABCDEF";
    const HEX_CODES$1 = HEX_STRINGS$3.split("").map((c) => c.codePointAt(0));
    const HEX_CODEPOINTS$1 = Array(256)
        .fill(true)
        .map((_, i) => {
        const s = String.fromCodePoint(i);
        const index = HEX_STRINGS$3.indexOf(s);
        // ABCDEF will use 10 - 15
        return index < 0 ? undefined : index < 16 ? index : index - 6;
    });
    const ENCODER = new TextEncoder();
    const DECODER$1 = new TextDecoder();
    function concat$2(arrays) {
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
    function toHex$1(bytes) {
        const b = bytes || new Uint8Array();
        return b.length > 512 ? _toHexLengthPerf$1(b) : _toHexIterPerf$1(b);
    }
    function _toHexIterPerf$1(bytes) {
        let s = "";
        for (let i = 0; i < bytes.length; ++i) {
            s += HEX_STRINGS$3[HEX_CODEPOINTS$1[HEX_CODES$1[bytes[i] >> 4]]];
            s += HEX_STRINGS$3[HEX_CODEPOINTS$1[HEX_CODES$1[bytes[i] & 15]]];
        }
        return s;
    }
    function _toHexLengthPerf$1(bytes) {
        const hexBytes = new Uint8Array(bytes.length * 2);
        for (let i = 0; i < bytes.length; ++i) {
            hexBytes[i * 2] = HEX_CODES$1[bytes[i] >> 4];
            hexBytes[i * 2 + 1] = HEX_CODES$1[bytes[i] & 15];
        }
        return DECODER$1.decode(hexBytes);
    }
    // Mimics Buffer.from(x, 'hex') logic
    // Stops on first non-hex string and returns
    // https://github.com/nodejs/node/blob/v14.18.1/src/string_bytes.cc#L246-L261
    function fromHex(hexString) {
        const hexBytes = ENCODER.encode(hexString || "");
        const resultBytes = new Uint8Array(Math.floor(hexBytes.length / 2));
        let i;
        for (i = 0; i < resultBytes.length; i++) {
            const a = HEX_CODEPOINTS$1[hexBytes[i * 2]];
            const b = HEX_CODEPOINTS$1[hexBytes[i * 2 + 1]];
            if (a === undefined || b === undefined) {
                break;
            }
            resultBytes[i] = (a << 4) | b;
        }
        return i === resultBytes.length ? resultBytes : resultBytes.slice(0, i);
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
    function writeUInt32$3(buffer, offset, value, littleEndian) {
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
    function readUInt32$2(buffer, offset, littleEndian) {
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
      return i < OPS$1.OP_PUSHDATA1 ? 1 : i <= 0xff ? 2 : i <= 0xffff ? 3 : 5;
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
    function encode$3(buffer, num, offset) {
      const size = encodingLength$1(num);
      // ~6 bit
      if (size === 1) {
        writeUInt8(buffer, offset, num);
        // 8 bit
      } else if (size === 2) {
        writeUInt8(buffer, offset, OPS$1.OP_PUSHDATA1);
        writeUInt8(buffer, offset + 1, num);
        // 16 bit
      } else if (size === 3) {
        writeUInt8(buffer, offset, OPS$1.OP_PUSHDATA2);
        writeUInt16$1(buffer, offset + 1, num, 'LE');
        // 32 bit
      } else {
        writeUInt8(buffer, offset, OPS$1.OP_PUSHDATA4);
        writeUInt32$3(buffer, offset + 1, num, 'LE');
      }
      return size;
    }
    /**
     * Decodes a buffer and returns information about the opcode, number, and size.
     * @param buffer - The buffer to decode.
     * @param offset - The offset within the buffer to start decoding.
     * @returns An object containing the opcode, number, and size, or null if decoding fails.
     */
    function decode$3(buffer, offset) {
      const opcode = readUInt8(buffer, offset);
      let num;
      let size;
      // ~6 bit
      if (opcode < OPS$1.OP_PUSHDATA1) {
        num = opcode;
        size = 1;
        // 8 bit
      } else if (opcode === OPS$1.OP_PUSHDATA1) {
        if (offset + 2 > buffer.length) return null;
        num = readUInt8(buffer, offset + 1);
        size = 2;
        // 16 bit
      } else if (opcode === OPS$1.OP_PUSHDATA2) {
        if (offset + 3 > buffer.length) return null;
        num = readUInt16$1(buffer, offset + 1, 'LE');
        size = 3;
        // 32 bit
      } else {
        if (offset + 5 > buffer.length) return null;
        if (opcode !== OPS$1.OP_PUSHDATA4) throw new Error('Unexpected opcode');
        num = readUInt32$2(buffer, offset + 1, 'LE');
        size = 5;
      }
      return {
        opcode,
        number: num,
        size,
      };
    }

    //#region src/storages/globalConfig/globalConfig.ts
    const DEFAULT_CONFIG = {
    	lang: void 0,
    	message: void 0,
    	abortEarly: void 0,
    	abortPipeEarly: void 0
    };
    /**
    * Returns the global configuration.
    *
    * @param config The config to merge.
    *
    * @returns The configuration.
    */
    /* @__NO_SIDE_EFFECTS__ */
    function getGlobalConfig(config$1) {
    	return DEFAULT_CONFIG;
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
    const _standardCache = /* @__PURE__ */ new WeakMap();
    /**
    * Returns the Standard Schema properties.
    *
    * @param context The schema context.
    *
    * @returns The Standard Schema properties.
    */
    /* @__NO_SIDE_EFFECTS__ */
    function _getStandardProps(context) {
    	let cached = _standardCache.get(context);
    	if (!cached) {
    		cached = {
    			version: 1,
    			vendor: "valibot",
    			validate(value$1) {
    				return context["~run"]({ value: value$1 }, /* @__PURE__ */ getGlobalConfig());
    			}
    		};
    		_standardCache.set(context, cached);
    	}
    	return cached;
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
    //#region src/const.ts
    const ABORT_EARLY_CONFIG = { abortEarly: true };

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
    	return !schema["~run"]({ value: input }, ABORT_EARLY_CONFIG).issues;
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
    	if (datasets) for (const dataset of datasets) if (issues) for (const issue of dataset.issues) issues.push(issue);
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
    	const dataset = schema["~run"]({ value: input }, /* @__PURE__ */ getGlobalConfig());
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

    fromHex(
      'fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f',
    );
    const NBufferSchemaFactory = size =>
      pipe(instance(Uint8Array), length(size));
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
      if (x[0] & 0x80) return concat$2([ZERO$1, x]);
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
    function decode$2(buffer) {
      const hashType = readUInt8(buffer, buffer.length - 1);
      if (!isDefinedHashType(hashType)) {
        throw new Error('Invalid hashType ' + hashType);
      }
      const decoded = decode$4(buffer.subarray(0, -1));
      const r = fromDER(decoded.r);
      const s = fromDER(decoded.s);
      const signature = concat$2([r, s]);
      return { signature, hashType };
    }
    /**
     * Encodes a signature and hash type into a buffer.
     * @param signature - The signature to encode.
     * @param hashType - The hash type to encode.
     * @returns The encoded buffer.
     * @throws Error if the hashType is invalid.
     */
    function encode$2(signature, hashType) {
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
      return concat$2([encode$4(r, s), hashTypeBuffer]);
    }

    var scriptSignature = /*#__PURE__*/Object.freeze({
        __proto__: null,
        decode: decode$2,
        encode: encode$2
    });

    /**
     * Script tools module for working with Bitcoin scripts.
     * Provides utilities such as decompiling, compiling, converting to/from ASM, stack manipulation,
     * and script validation functions.
     *
     * @packageDocumentation
     */
    /** Base opcode for OP_INT values. */
    const OP_INT_BASE = OPS$1.OP_RESERVED; // OP_1 - 1
    /** Validation schema for a Bitcoin script stack. */
    const StackSchema = array(union([instance(Uint8Array), number()]));
    /**
     * Converts a minimal script buffer to its corresponding opcode, if applicable.
     *
     * @param buffer - The buffer to check.
     * @returns The corresponding opcode or undefined if not minimal.
     */
    function asMinimalOP(buffer) {
      if (buffer.length === 0) return OPS$1.OP_0;
      if (buffer.length !== 1) return;
      if (buffer[0] >= 1 && buffer[0] <= 16) return OP_INT_BASE + buffer[0];
      if (buffer[0] === 0x81) return OPS$1.OP_1NEGATE;
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
          offset += encode$3(buffer, chunk.length, offset);
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
        if (opcode > OPS$1.OP_0 && opcode <= OPS$1.OP_PUSHDATA4) {
          const d = decode$3(buffer, i);
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
    const signature = scriptSignature;

    const OPS = OPS$1;
    OPS.OP_RESERVED; // OP_1 - 1

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
     * * https://homes.esat.kuleuven.be/~bosselae/ripemd160.html
     * * https://homes.esat.kuleuven.be/~bosselae/ripemd160/pdf/AB-9601/AB-9601.pdf
     */
    const ripemd160$1 = /* @__PURE__ */ createHasher$1(() => new RIPEMD160());

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
    function hash160$1(buffer) {
      return ripemd160(sha256$1(buffer));
    }
    /**
     * Computes the double SHA-256 hash of the given buffer.
     *
     * @param buffer - The input data to be hashed.
     * @returns The double SHA-256 hash of the input buffer.
     */
    function hash256$2(buffer) {
      return sha256$1(sha256$1(buffer));
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
    function taggedHash$1(prefix, data) {
      return sha256$1(concat$2([TAGGED_HASH_PREFIXES[prefix], data]));
    }

    // base-x encoding / decoding
    // Copyright (c) 2018 base-x contributors
    // Copyright (c) 2014-2018 The Bitcoin Core developers (base58.cpp)
    // Distributed under the MIT software license, see the accompanying
    // file LICENSE or http://www.opensource.org/licenses/mit-license.php.
    function base$2 (ALPHABET) {
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

    var ALPHABET$2 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    var base58 = base$2(ALPHABET$2);

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

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    var dist$3 = {};

    var hasRequiredDist$3;

    function requireDist$3 () {
    	if (hasRequiredDist$3) return dist$3;
    	hasRequiredDist$3 = 1;
    	Object.defineProperty(dist$3, "__esModule", { value: true });
    	dist$3.bech32m = dist$3.bech32 = void 0;
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
    	dist$3.bech32 = getLibraryFromEncoding('bech32');
    	dist$3.bech32m = getLibraryFromEncoding('bech32m');
    	return dist$3;
    }

    requireDist$3();

    const HEX_STRINGS$2 = "0123456789abcdefABCDEF";
    HEX_STRINGS$2.split("").map((c) => c.codePointAt(0));
    Array(256)
        .fill(true)
        .map((_, i) => {
        const s = String.fromCodePoint(i);
        const index = HEX_STRINGS$2.indexOf(s);
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
        return offset + 2;
    }
    function writeUInt32$2(buffer, offset, value, littleEndian) {
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
        return offset + 8;
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
    function encode$1(n, buffer, offset) {
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
            writeUInt32$2(buffer, offset + 1, Number(n), 'LE');
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
    function decode$1(buffer, offset) {
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
            const val = readUInt32$1(buffer, offset + 1, 'LE');
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
        this.offset = writeUInt32$3(this.buffer, this.offset, i, 'LE');
      }
      writeUInt64(i) {
        this.offset = writeUInt64$1(this.buffer, this.offset, BigInt(i), 'LE');
      }
      writeVarInt(i) {
        const { bytes } = encode$1(i, this.buffer, this.offset);
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
        const result = readUInt32$2(this.buffer, this.offset, 'LE');
        this.offset += 4;
        return result;
      }
      readInt64() {
        const result = readInt64(this.buffer, this.offset, 'LE');
        this.offset += 8;
        return result;
      }
      readVarInt() {
        const { bigintValue, bytes } = decode$1(this.buffer, this.offset);
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
            return x !== OPS$1.OP_CODESEPARATOR;
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
        return hash256$2(buffer);
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
          hashPrevouts = sha256$1(bufferWriter.end());
          bufferWriter = BufferWriter.withCapacity(8 * this.ins.length);
          values.forEach(value => bufferWriter.writeInt64(value));
          hashAmounts = sha256$1(bufferWriter.end());
          bufferWriter = BufferWriter.withCapacity(
            prevOutScripts.map(varSliceSize).reduce((a, b) => a + b),
          );
          prevOutScripts.forEach(prevOutScript =>
            bufferWriter.writeVarSlice(prevOutScript),
          );
          hashScriptPubKeys = sha256$1(bufferWriter.end());
          bufferWriter = BufferWriter.withCapacity(4 * this.ins.length);
          this.ins.forEach(txIn => bufferWriter.writeUInt32(txIn.sequence));
          hashSequences = sha256$1(bufferWriter.end());
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
          hashOutputs = sha256$1(bufferWriter.end());
        } else if (isSingle && inIndex < this.outs.length) {
          const output = this.outs[inIndex];
          const bufferWriter = BufferWriter.withCapacity(
            8 + varSliceSize(output.script),
          );
          bufferWriter.writeInt64(output.value);
          bufferWriter.writeVarSlice(output.script);
          hashOutputs = sha256$1(bufferWriter.end());
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
          sigMsgWriter.writeSlice(sha256$1(bufferWriter.end()));
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
        return taggedHash$1(
          'TapSighash',
          concat$2([Uint8Array.from([0x00]), sigMsgWriter.end()]),
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
          hashPrevouts = hash256$2(tbuffer);
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
          hashSequence = hash256$2(tbuffer);
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
          hashOutputs = hash256$2(tbuffer);
        } else if (
          (hashType & 0x1f) === Transaction.SIGHASH_SINGLE &&
          inIndex < this.outs.length
        ) {
          const output = this.outs[inIndex];
          tbuffer = new Uint8Array(8 + varSliceSize(output.script));
          bufferWriter = new BufferWriter(tbuffer, 0);
          bufferWriter.writeInt64(output.value);
          bufferWriter.writeVarSlice(output.script);
          hashOutputs = hash256$2(tbuffer);
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
        return hash256$2(tbuffer);
      }
      getHash(forWitness) {
        // wtxid for coinbase is always 32 bytes of 0x00
        if (forWitness && this.isCoinbase()) return new Uint8Array(32);
        return hash256$2(this.__toBuffer(undefined, undefined, forWitness));
      }
      getId() {
        // transaction hash's are displayed in reverse order
        return toHex$1(reverseBuffer(this.getHash(false)));
      }
      toBuffer(buffer, initialOffset) {
        return this.__toBuffer(buffer, initialOffset, true);
      }
      toHex() {
        return toHex$1(this.toBuffer(undefined, undefined));
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
    new TextEncoder();
    const DECODER = new TextDecoder();
    function concat$1(arrays) {
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

    const range = n => [...Array(n).keys()];
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
        for (const i of range(keyVal.value.length / 4 - 1)) {
          const val = readUInt32(keyVal.value, i * 4 + 4, 'LE');
          const isHard = !!(val & 0x80000000);
          const idx = val & 0x7fffffff;
          data.path += '/' + idx.toString(10) + (isHard ? "'" : '');
        }
        return data;
      }
      function encode(data) {
        const head = Uint8Array.from([TYPE_BYTE]);
        const key = concat$1([head, data.pubkey]);
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
        const { numberValue: nHashes, bytes: nHashesLen } = decode$1(
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
        encode$1(data.leafHashes.length, nHashesBuf);
        const value = concat$1([nHashesBuf, ...data.leafHashes, base.value]);
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

    ({
      bip32Derivation: makeConverter$4(InputTypes.BIP32_DERIVATION),
      redeemScript: makeConverter$3(InputTypes.REDEEM_SCRIPT),
      witnessScript: makeConverter(InputTypes.WITNESS_SCRIPT),
      checkPubkey: makeChecker([
        InputTypes.PARTIAL_SIG,
        InputTypes.BIP32_DERIVATION,
      ]),
      tapBip32Derivation: makeConverter$2(
        InputTypes.TAP_BIP32_DERIVATION,
      ),
      tapInternalKey: makeConverter$1(InputTypes.TAP_INTERNAL_KEY)});
    ({
      bip32Derivation: makeConverter$4(OutputTypes.BIP32_DERIVATION),
      redeemScript: makeConverter$3(OutputTypes.REDEEM_SCRIPT),
      witnessScript: makeConverter(OutputTypes.WITNESS_SCRIPT),
      checkPubkey: makeChecker([OutputTypes.BIP32_DERIVATION]),
      tapBip32Derivation: makeConverter$2(
        OutputTypes.TAP_BIP32_DERIVATION,
      ),
      tapInternalKey: makeConverter$1(OutputTypes.TAP_INTERNAL_KEY),
    });

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

    var dist$2 = {};

    var secp256k1 = {};

    var sha2 = {};

    var _md = {};

    var utils$2 = {};

    var crypto$1 = {};

    var hasRequiredCrypto;

    function requireCrypto () {
    	if (hasRequiredCrypto) return crypto$1;
    	hasRequiredCrypto = 1;
    	Object.defineProperty(crypto$1, "__esModule", { value: true });
    	crypto$1.crypto = void 0;
    	crypto$1.crypto = typeof globalThis === 'object' && 'crypto' in globalThis ? globalThis.crypto : undefined;
    	
    	return crypto$1;
    }

    var hasRequiredUtils$2;

    function requireUtils$2 () {
    	if (hasRequiredUtils$2) return utils$2;
    	hasRequiredUtils$2 = 1;
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
    		const crypto_1 = requireCrypto();
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
    		
    	} (utils$2));
    	return utils$2;
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
    	const utils_ts_1 = /*@__PURE__*/ requireUtils$2();
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
    	const utils_ts_1 = /*@__PURE__*/ requireUtils$2();
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
    		const utils_ts_1 = /*@__PURE__*/ requireUtils$2();
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
    		const utils_js_1 = /*@__PURE__*/ requireUtils$2();
    		var utils_js_2 = /*@__PURE__*/ requireUtils$2();
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
    		const utils_1 = /*@__PURE__*/ requireUtils$2();
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
    		const utils_js_1 = /*@__PURE__*/ requireUtils$2();
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

    var hasRequiredDist$2;

    function requireDist$2 () {
    	if (hasRequiredDist$2) return dist$2;
    	hasRequiredDist$2 = 1;

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

    	dist$2.isPoint = isPoint;
    	dist$2.isPointCompressed = isPointCompressed;
    	dist$2.isPrivate = isPrivate;
    	dist$2.isXOnlyPoint = isXOnlyPoint;
    	dist$2.pointAdd = pointAdd;
    	dist$2.pointAddScalar = pointAddScalar;
    	dist$2.pointCompress = pointCompress;
    	dist$2.pointFromScalar = pointFromScalar;
    	dist$2.pointMultiply = pointMultiply;
    	dist$2.privateAdd = privateAdd;
    	dist$2.privateNegate = privateNegate;
    	dist$2.privateSub = privateSub;
    	dist$2.recover = recover;
    	dist$2.sign = sign;
    	dist$2.signRecoverable = signRecoverable;
    	dist$2.signSchnorr = signSchnorr;
    	dist$2.verify = verify;
    	dist$2.verifySchnorr = verifySchnorr;
    	dist$2.xOnlyPointAddTweak = xOnlyPointAddTweak;
    	dist$2.xOnlyPointFromPoint = xOnlyPointFromPoint;
    	dist$2.xOnlyPointFromScalar = xOnlyPointFromScalar;
    	return dist$2;
    }

    var distExports = requireDist$2();
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
    function concatBytes$1(...arrays) {
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
        return concatBytes$1(new Uint8Array([0, ctx.length]), ctx, msg);
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
        return concatBytes$1(new Uint8Array([1, ctx.length]), ctx, hash.oid, hashed);
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
    function ensureHex$1(hex, label = 'hex') {
        const normalized = String(hex || '').trim().toLowerCase();
        if (!/^[0-9a-f]*$/.test(normalized) || normalized.length % 2 !== 0) {
            throw new Error(`Invalid ${label}: expected even-length hex string`);
        }
        return normalized;
    }
    function hexToBytes$1(hex) {
        const normalized = ensureHex$1(hex);
        const bytes = new Uint8Array(normalized.length / 2);
        for (let i = 0; i < normalized.length; i += 2) {
            bytes[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16);
        }
        return bytes;
    }
    function bytesToHex$1(bytes) {
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

    /** Exact monetary primitives. This module has no runtime dependencies. */
    /** Normalize a raw integer without preserving an already rounded number. */
    function toRawInteger$1(value, label = 'amount') {
        if (typeof value === 'bigint')
            return value;
        if (typeof value === 'number' && Number.isSafeInteger(value))
            return BigInt(value);
        if (typeof value === 'string' && /^-?\d+$/.test(value) && value.length <= 100)
            return BigInt(value);
        throw new Error(`${label}: expected an exact integer; use bigint or an integer string for large values`);
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
    const OP_PUSHDATA1 = 0x4c;
    const OP_PUSHDATA2 = 0x4d;
    const OP_PUSHDATA4 = 0x4e;
    const OP_1 = 0x51;
    const OP_2 = 0x52;
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
    const OP_GREATERTHAN = 0xa0;
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
    const OP_XNA_ASSET$1 = 0xc0;
    // ---------- Output auth commitment introspection (NIP-023) ----------
    // Pushes the 32-byte AuthScript v1 commitment of a selected output's
    // scriptPubKey. Symmetric to TXFIELD_AUTHSCRIPT_COMMITMENT for inputs;
    // ignores any trailing OP_XNA_ASSET asset wrapper bytes.
    const OP_OUTPUTAUTHCOMMITMENT = 0xd5;
    // ---------- Chain context introspection (NIP-026) ----------
    // Pushes chain-context fields (block height, median time, etc.) selected
    // by a single-byte selector consumed from the stack.
    const OP_CHAINCONTEXT = 0xd7;
    // ---------- Selectors for OP_CHAINCONTEXT ----------
    // Valid selector bytes consumed by OP_CHAINCONTEXT. HEIGHT is the candidate
    // confirmation block height; MTP is the previous block's median time past.
    const CHAINCONTEXT_HEIGHT = 0x01;
    const CHAINCONTEXT_MTP = 0x02;

    /**
     * Minimal CScriptNum encoding (Bitcoin consensus rules).
     *
     * - 0 → empty vector
     * - 1..16 → single opcode OP_1..OP_16 (handled in `pushInt`, not here)
     * - -1 → OP_1NEGATE (handled in `pushInt`)
     * - otherwise: sign-magnitude little-endian, with a sign bit on the last byte
     */
    function encodeScriptNum(value) {
        let n = toRawInteger$1(value, 'ScriptNum');
        if (n === 0n)
            return new Uint8Array();
        const negative = n < 0n;
        if (negative)
            n = -n;
        const result = [];
        while (n > 0n) {
            result.push(Number(n & 0xffn));
            n >>= 8n;
        }
        // If the most-significant bit is set, add a padding byte so the sign bit
        // is unambiguous. If negative, flip that sign bit instead.
        if (result[result.length - 1] & 0x80) {
            result.push(negative ? 0x80 : 0x00);
        }
        else if (negative) {
            result[result.length - 1] |= 0x80;
        }
        return Uint8Array.from(result);
    }

    /**
     * AuthScript scriptPubKey + witness-stack builders.
     *
     * AuthScript outputs encode a 32-byte commitment in a witness program:
     *   scriptPubKey = OP_n 0x20 <32-byte program>
     *
     *   OP_1  generic AuthScript v1 (nc1p… / tnc1p…): any auth type, any witnessScript
     *   OP_2  strict PQ v2 (pq1z… / tpq1z…): auth type 0x01, witnessScript OP_TRUE
     *   OP_3  strict ECDSA v3 (nq1r… / tnq1r…): auth type 0x02, witnessScript OP_TRUE
     *
     * The witness version is also the first byte of the commitment preimage:
     *   tagged_hash("NeuraiAuthScript", version || auth_descriptor || SHA256(witnessScript))
     *
     * The program is `HASH160`/`SHA256` over a descriptor that depends on the
     * `auth_type` byte carried as the first witness-stack element at spend time.
     * This library only assembles the stack; computing the descriptor/commitment
     * and producing the signature live in neurai-key / neurai-sign-transaction.
     *
     * Auth type values (authoritative: Neurai `src/script/interpreter.cpp`,
     * cross-checked against `lib/neurai-key/src/shared/address.ts`):
     *
     *   0x00  NoAuth         — no signature; spend gated only by witnessScript
     *   0x01  PQ             — ML-DSA-44 signature (post-quantum)
     *   0x02  Legacy         — secp256k1 ECDSA signature (classic)
     *   0x03  RefScript      — NIP-015 reference-script spend (future)
     *
     * Witness stack (exact order consumed by the interpreter):
     *   [ auth_type, sig, pubkey, arg0, ..., argN, witnessScript ]
     *
     * NoAuth and RefScript spends omit the `sig`/`pubkey` items.
     */
    const AUTHSCRIPT_NOAUTH = 0x00;
    function assertWitnessScript(ws) {
        if (!(ws instanceof Uint8Array) || ws.length === 0) {
            throw new Error('witnessScript must be a non-empty Uint8Array');
        }
    }
    function assertArgs(args) {
        if (args == null)
            return;
        if (!Array.isArray(args)) {
            throw new Error('args must be an array of Uint8Array');
        }
        for (let i = 0; i < args.length; i += 1) {
            if (!(args[i] instanceof Uint8Array)) {
                throw new Error(`args[${i}] must be a Uint8Array`);
            }
        }
    }
    /**
     * Build the witness stack for a NoAuth AuthScript spend. The spend is gated
     * by the witnessScript alone (covenants, hash-locks, time-locks, ...); no
     * signature or public key is carried.
     */
    function buildAuthScriptWitnessNoAuth(input) {
        assertArgs(input.args);
        assertWitnessScript(input.witnessScript);
        return [
            Uint8Array.of(AUTHSCRIPT_NOAUTH),
            ...(input.args ?? []),
            input.witnessScript
        ];
    }

    /** Exact monetary primitives. This module has no runtime dependencies. */

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
    base$1(ALPHABET$1);

    var dist$1 = {};

    var hasRequiredDist$1;

    function requireDist$1 () {
    	if (hasRequiredDist$1) return dist$1;
    	hasRequiredDist$1 = 1;
    	Object.defineProperty(dist$1, "__esModule", { value: true });
    	dist$1.bech32m = dist$1.bech32 = void 0;
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
    	dist$1.bech32 = getLibraryFromEncoding('bech32');
    	dist$1.bech32m = getLibraryFromEncoding('bech32m');
    	return dist$1;
    }

    requireDist$1();

    /**
     * Asset-transfer wrapper split helper.
     *
     * Neurai asset UTXOs have a scriptPubKey of the form
     *
     *     <prefix scriptPubKey bytes> OP_XNA_ASSET <pushdata(payload)> OP_DROP
     *
     * where `prefix` is the recipient's standard script (typically a P2PKH, an
     * AuthScript `OP_1`/`OP_2`/`OP_3` witness program, or a bare covenant such
     * as the partial-fill sell order), and `payload` serializes a `CAssetTransfer`:
     *
     *     payload = marker ("rvn" 0x72 0x76 0x6e | "xna" 0x78 0x6e 0x61)
     *             || type_marker (0x74 transfer)
     *             || VarStr(assetName)
     *             || int64LE(amountRaw)
     *             [ || messageRef (optional) || int64LE(expireTime) (optional) ]
     *
     * NIP-040: mainnet still emits the Ravencoin-inherited "rvn" marker;
     * testnet/regtest emit "xna" after activation. Both are accepted when
     * reading — the detected marker is surfaced on the parsed payload.
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
    const ASSET_MAGICS = [
        { marker: 'rvn', bytes: Uint8Array.from([0x72, 0x76, 0x6e]) },
        { marker: 'xna', bytes: Uint8Array.from([0x78, 0x6e, 0x61]) },
    ];
    const TRANSFER_TYPE = 0x74;
    /**
     * Walk the script one opcode at a time, skipping pushdata payload bytes,
     * until either OP_XNA_ASSET is reached at top level or the end of the
     * script. Returns the byte offset of OP_XNA_ASSET, or -1 if not found.
     * Throws on truncated pushdata.
     */
    function findTopLevelAssetOpcode(bytes) {
        let i = 0;
        while (i < bytes.length) {
            const op = bytes[i];
            if (op === OP_XNA_ASSET$1)
                return i;
            // Short direct push: 0x01..0x4b
            if (op >= 0x01 && op <= 0x4b) {
                const len = op;
                const next = i + 1 + len;
                if (next > bytes.length) {
                    throw new Error(`splitAssetWrappedScriptPubKey: short push of ${len} bytes at offset ${i} exceeds script length`);
                }
                i = next;
                continue;
            }
            if (op === OP_PUSHDATA1) {
                if (i + 1 >= bytes.length) {
                    throw new Error(`splitAssetWrappedScriptPubKey: truncated PUSHDATA1 length at offset ${i}`);
                }
                const len = bytes[i + 1];
                const next = i + 2 + len;
                if (next > bytes.length) {
                    throw new Error(`splitAssetWrappedScriptPubKey: PUSHDATA1 of ${len} bytes at offset ${i} exceeds script length`);
                }
                i = next;
                continue;
            }
            if (op === OP_PUSHDATA2) {
                if (i + 2 >= bytes.length) {
                    throw new Error(`splitAssetWrappedScriptPubKey: truncated PUSHDATA2 length at offset ${i}`);
                }
                const len = bytes[i + 1] | (bytes[i + 2] << 8);
                const next = i + 3 + len;
                if (next > bytes.length) {
                    throw new Error(`splitAssetWrappedScriptPubKey: PUSHDATA2 of ${len} bytes at offset ${i} exceeds script length`);
                }
                i = next;
                continue;
            }
            if (op === OP_PUSHDATA4) {
                if (i + 4 >= bytes.length) {
                    throw new Error(`splitAssetWrappedScriptPubKey: truncated PUSHDATA4 length at offset ${i}`);
                }
                const len = (bytes[i + 1] |
                    (bytes[i + 2] << 8) |
                    (bytes[i + 3] << 16) |
                    (bytes[i + 4] << 24)) >>>
                    0;
                const next = i + 5 + len;
                if (next > bytes.length) {
                    throw new Error(`splitAssetWrappedScriptPubKey: PUSHDATA4 of ${len} bytes at offset ${i} exceeds script length`);
                }
                i = next;
                continue;
            }
            // Any other opcode (including OP_1..OP_16, OP_DUP, OP_HASH160, etc.) is
            // one byte wide in Neurai Script. Advance.
            i += 1;
        }
        return -1;
    }
    /**
     * Read the pushdata element that sits immediately after OP_XNA_ASSET and
     * return its payload bytes together with the cursor position after the
     * element. Only direct pushes (1..75) and PUSHDATA1 are accepted — a
     * well-formed asset transfer payload fits within 75 bytes for the common
     * case and comfortably within 255 bytes even with long names and tails.
     * PUSHDATA2 and PUSHDATA4 would signal a malformed or adversarial wrapper.
     */
    function readPayloadPush(bytes, start) {
        if (start >= bytes.length) {
            throw new Error('splitAssetWrappedScriptPubKey: truncated wrapper — missing payload push');
        }
        const op = bytes[start];
        if (op >= 0x01 && op <= 0x4b) {
            const len = op;
            const dataStart = start + 1;
            const dataEnd = dataStart + len;
            if (dataEnd > bytes.length) {
                throw new Error(`splitAssetWrappedScriptPubKey: asset payload short push of ${len} bytes exceeds script length`);
            }
            return { payload: bytes.slice(dataStart, dataEnd), after: dataEnd };
        }
        if (op === OP_PUSHDATA1) {
            if (start + 1 >= bytes.length) {
                throw new Error('splitAssetWrappedScriptPubKey: truncated PUSHDATA1 in asset payload');
            }
            const len = bytes[start + 1];
            const dataStart = start + 2;
            const dataEnd = dataStart + len;
            if (dataEnd > bytes.length) {
                throw new Error(`splitAssetWrappedScriptPubKey: asset payload PUSHDATA1 of ${len} bytes exceeds script length`);
            }
            return { payload: bytes.slice(dataStart, dataEnd), after: dataEnd };
        }
        throw new Error(`splitAssetWrappedScriptPubKey: asset payload push opcode 0x${op.toString(16)} not accepted (expected 0x01..0x4b or PUSHDATA1)`);
    }
    function detectAssetMarker(payload) {
        for (const { marker, bytes } of ASSET_MAGICS) {
            if (payload[0] === bytes[0] && payload[1] === bytes[1] && payload[2] === bytes[2]) {
                return marker;
            }
        }
        throw new Error(`splitAssetWrappedScriptPubKey: asset payload magic mismatch — expected "rvn" or "xna" got 0x${payload[0].toString(16)} 0x${payload[1].toString(16)} 0x${payload[2].toString(16)}`);
    }
    function parseAssetTransferPayload(payload) {
        if (payload.length < 4 + 1 + 8) {
            // 4 magic+type, 1 varstr length, 8 int64LE amount
            throw new Error(`splitAssetWrappedScriptPubKey: asset payload of ${payload.length} bytes is too short`);
        }
        const marker = detectAssetMarker(payload);
        if (payload[3] !== TRANSFER_TYPE) {
            throw new Error(`splitAssetWrappedScriptPubKey: asset payload type marker 0x${payload[3].toString(16)} is not a transfer (0x74)`);
        }
        const nameLen = payload[4];
        const nameStart = 5;
        const nameEnd = nameStart + nameLen;
        if (nameEnd + 8 > payload.length) {
            throw new Error(`splitAssetWrappedScriptPubKey: asset payload truncated — name length ${nameLen} does not leave room for amount`);
        }
        let assetName = '';
        for (let i = nameStart; i < nameEnd; i += 1) {
            assetName += String.fromCharCode(payload[i]);
        }
        let amountRaw = 0n;
        for (let i = 0; i < 8; i += 1) {
            amountRaw |= BigInt(payload[nameEnd + i]) << BigInt(8 * i);
        }
        // Any bytes after nameEnd + 8 form the optional tail (message +
        // expireTime). We intentionally ignore them in this first version; the
        // raw payload remains available via `payloadHex` if a consumer later
        // needs to inspect them.
        return { assetName, amountRaw, marker };
    }
    /**
     * Parse an asset-transfer-wrapped scriptPubKey. Accepts both wrapped and
     * bare forms. Throws on structural malformation (truncated pushdata,
     * missing OP_DROP after payload, bad magic, unsupported pushdata width).
     */
    function splitAssetWrappedScriptPubKey(spkHex) {
        const normalized = ensureHex$1(spkHex, 'scriptPubKey');
        const bytes = hexToBytes$1(normalized);
        const assetOpAt = findTopLevelAssetOpcode(bytes);
        if (assetOpAt < 0) {
            return { prefixHex: normalized, assetTransfer: null };
        }
        const prefix = bytes.slice(0, assetOpAt);
        const { payload, after } = readPayloadPush(bytes, assetOpAt + 1);
        if (after >= bytes.length) {
            throw new Error('splitAssetWrappedScriptPubKey: asset wrapper missing trailing OP_DROP');
        }
        if (bytes[after] !== OP_DROP) {
            throw new Error(`splitAssetWrappedScriptPubKey: expected OP_DROP at offset ${after}, got 0x${bytes[after].toString(16)}`);
        }
        if (after + 1 !== bytes.length) {
            throw new Error(`splitAssetWrappedScriptPubKey: ${bytes.length - after - 1} trailing bytes after OP_DROP`);
        }
        const { assetName, amountRaw, marker } = parseAssetTransferPayload(payload);
        return {
            prefixHex: bytesToHex$1(prefix),
            assetTransfer: {
                assetName,
                amountRaw,
                marker,
                payloadHex: bytesToHex$1(payload),
            },
        };
    }

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
     * Read a one-byte unsigned selector. This accepts OP_1..OP_16 shorthand
     * and a raw one-byte push for scripts that permit either form. NIP-042
     * TXHASH masks use a separate strict two-byte parser.
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
    function modeForSelector(selector) {
        if (selector === CHAINCONTEXT_HEIGHT)
            return 'height';
        if (selector === CHAINCONTEXT_MTP)
            return 'mtp';
        throw new Error('expiration OP_CHAINCONTEXT selector must be HEIGHT (0x01) or MTP (0x02)');
    }
    function readOptionalExpirationGate(c, nextOpcodeWithoutGate, label) {
        if (c.pos >= c.bytes.length || c.bytes[c.pos] === nextOpcodeWithoutGate) {
            return undefined;
        }
        const value = readPushPositiveInt(c, `expiration value (${label})`);
        if (value <= 0n) {
            throw new Error(`parse: expiration value (${label}) must be > 0`);
        }
        const selector = readPushUint8(c, `expiration selector (${label})`);
        const mode = modeForSelector(selector);
        expectByte(c, OP_CHAINCONTEXT, `OP_CHAINCONTEXT (${label})`);
        expectByte(c, OP_GREATERTHAN, `OP_GREATERTHAN (${label})`);
        expectByte(c, OP_VERIFY, `OP_VERIFY (${label})`);
        return { mode, value };
    }
    function assertSameExpiration(a, b, label) {
        if (a === undefined && b === undefined)
            return;
        if (a === undefined || b === undefined || a.mode !== b.mode || a.value !== b.value) {
            throw new Error(`parse: expiration differs between ${label}`);
        }
    }

    /**
     * Witness-stack builders for the Partial-Fill Sell Order covenant.
     *
     * When the covenant lives behind an AuthScript commitment (the only
     * asset-compatible deployment since the node's OP_XNA_ASSET placement rules
     * — bare covenant outputs can no longer carry assets), the unlock data goes
     * in the witness, not the scriptSig. The scriptSig builders in `spend.ts`
     * return a serialized script that PUSHES the elements; a witness needs the
     * elements THEMSELVES, one per stack slot, so those blobs cannot be reused
     * as a single `args` entry.
     *
     * These builders return the raw `args` stack (bottom → top), mirroring the
     * shapes documented in `spend.ts`:
     *
     *   Full fill:     [ <1>, <0> ]
     *   Partial fill:  [ <N>, <0>, <0> ]
     *   Cancel:        [ <sig>, <pubkey>, <1> ]
     *
     * Numbers are minimal CScriptNum stack values (0 = empty element). Wrap the
     * result with `buildAuthScriptWitnessNoAuth({ args, witnessScript: covenant })`
     * (from `standard/authscript.ts`) to get the final `[0x00, ...args, covenant]`
     * witness, and serialize the spending transaction with
     * `serializeTransaction` from `@neuraiproject/neurai-create-transaction`
     * (0.5.1+, witness elements as hex strings: `witness.map(bytesToHex)`).
     */
    const MAX_PQ_SCRIPT_ELEMENT_SIZE = 3072;
    /**
     * Witness `args` for the public fill branches. Same semantics and
     * validations as `buildFillScriptSig`.
     */
    function buildFillWitnessStack(amount, total) {
        if (typeof amount !== 'bigint' || typeof total !== 'bigint') {
            throw new Error('amount and total must be bigint');
        }
        if (amount <= 0n) {
            throw new Error('fill amount must be > 0');
        }
        if (total <= 0n) {
            throw new Error('total must be > 0');
        }
        if (amount > total) {
            throw new Error('fill amount exceeds the covenant total');
        }
        if (amount === total) {
            // Full fill: covenant drains entirely; buyer does not push N.
            return [encodeScriptNum(1n), encodeScriptNum(0n)];
        }
        // Partial fill: N, then both flag values.
        return [encodeScriptNum(amount), encodeScriptNum(0n), encodeScriptNum(0n)];
    }
    /**
     * Witness `args` for the seller's ECDSA cancel branch. Same semantics and
     * validations as `buildCancelScriptSig`.
     */
    function buildCancelWitnessStack(signatureDer, pubKey) {
        if (!(signatureDer instanceof Uint8Array) || signatureDer.length === 0) {
            throw new Error('signatureDer must be a non-empty Uint8Array');
        }
        if (!(pubKey instanceof Uint8Array) || (pubKey.length !== 33 && pubKey.length !== 65)) {
            throw new Error('pubKey must be a compressed (33B) or uncompressed (65B) secp256k1 key');
        }
        return [signatureDer, pubKey, encodeScriptNum(1n)];
    }
    /**
     * Witness `args` for the seller's PQ (ML-DSA-44) cancel branch. Same
     * semantics and validations as `buildCancelScriptSigPQ`.
     */
    function buildCancelWitnessStackPQ(sigPQ, pubKey) {
        if (!(sigPQ instanceof Uint8Array) || sigPQ.length === 0) {
            throw new Error('sigPQ must be a non-empty Uint8Array');
        }
        if (sigPQ.length > MAX_PQ_SCRIPT_ELEMENT_SIZE) {
            throw new Error(`sigPQ of ${sigPQ.length} bytes exceeds MAX_PQ_SCRIPT_ELEMENT_SIZE (${MAX_PQ_SCRIPT_ELEMENT_SIZE})`);
        }
        if (!(pubKey instanceof Uint8Array) || pubKey.length === 0) {
            throw new Error('pubKey must be a non-empty Uint8Array');
        }
        if (pubKey.length > MAX_PQ_SCRIPT_ELEMENT_SIZE) {
            throw new Error(`pubKey of ${pubKey.length} bytes exceeds MAX_PQ_SCRIPT_ELEMENT_SIZE (${MAX_PQ_SCRIPT_ELEMENT_SIZE})`);
        }
        return [sigPQ, pubKey, encodeScriptNum(1n)];
    }

    /**
     * Parser for the Partial-Fill Sell Order covenant (three-branch).
     *
     * Extracts `(sellerPubKeyHash, unitPriceSats, tokenId)` from a scriptPubKey
     * that was produced by `buildPartialFillScript`. Walks the exact byte
     * layout emitted by the builder and fails on any deviation — this is
     * deliberate, so a downstream indexer can unambiguously classify a UTXO as
     * "partial-fill order" or "unknown script" with no false positives.
     *
     * The full-fill and partial-fill branches share `(sellerScriptPubKey,
     * unitPriceSats, tokenId)`. The parser reads both branches and verifies
     * consistency; inconsistency throws.
     */
    /**
     * Parse a covenant scriptPubKey and extract its parameters. Throws with a
     * descriptive message if the bytes don't match the partial-fill template.
     */
    function parsePartialFillScript(script, network = 'xna-test') {
        const bytes = typeof script === 'string' ? hexToBytes$1(script) : script;
        const c = makeCursor(bytes);
        // ═════ Outer IF — Cancel branch ═════
        expectByte(c, OP_IF, 'OP_IF (outer cancel)');
        expectByte(c, OP_DUP, 'OP_DUP (cancel)');
        expectByte(c, OP_HASH160, 'OP_HASH160');
        const sellerPubKeyHash = readPush(c, 'sellerPubKeyHash');
        if (sellerPubKeyHash.length !== 20) {
            throw new Error(`parse: sellerPubKeyHash is ${sellerPubKeyHash.length} bytes, expected 20`);
        }
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (cancel)');
        expectByte(c, OP_CHECKSIG, 'OP_CHECKSIG (cancel)');
        expectByte(c, OP_ELSE, 'OP_ELSE (outer → fill)');
        // ═════ Inner IF — Full-fill branch ═════
        expectByte(c, OP_IF, 'OP_IF (inner full-fill)');
        const expirationFull = readOptionalExpirationGate(c, OP_0, 'full');
        // N = inputAmount
        expectByte(c, OP_0, 'OP_0 (input idx, full)');
        expectByte(c, OP_2, 'OP_2 (AMOUNT sel, full)');
        expectByte(c, OP_INPUTASSETFIELD, 'OP_INPUTASSETFIELD (full)');
        // payment value check
        expectByte(c, OP_DUP, 'OP_DUP (price, full)');
        const unitPriceSatsFull = readPushPositiveInt(c, 'unitPriceSats (full)');
        expectByte(c, OP_MUL, 'OP_MUL (full)');
        expectByte(c, OP_0, 'OP_0 (payment idx, full)');
        expectByte(c, OP_OUTPUTVALUE, 'OP_OUTPUTVALUE (full)');
        expectByte(c, OP_SWAP, 'OP_SWAP (full)');
        expectByte(c, OP_GREATERTHANOREQUAL, 'OP_GREATERTHANOREQUAL (full)');
        expectByte(c, OP_VERIFY, 'OP_VERIFY (payment full)');
        // payment spk
        expectByte(c, OP_0, 'OP_0 (spk idx, full)');
        expectByte(c, OP_OUTPUTSCRIPT, 'OP_OUTPUTSCRIPT (payment full)');
        const sellerSpkFull = readPush(c, 'sellerScriptPubKey (full)');
        const expectedSpk = new Uint8Array([
            OP_DUP, OP_HASH160, 0x14, ...sellerPubKeyHash, OP_EQUALVERIFY, OP_CHECKSIG
        ]);
        if (!bytesEqual(sellerSpkFull, expectedSpk)) {
            throw new Error('parse: full-fill seller scriptPubKey does not match the cancel PKH');
        }
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (payment spk full)');
        // buyer amount == N (full)
        expectByte(c, OP_DUP, 'OP_DUP (buyer amount, full)');
        expectByte(c, OP_1, 'OP_1 (buyer idx, full)');
        expectByte(c, OP_2, 'OP_2 (AMOUNT sel, full)');
        expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (buyer amount, full)');
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (buyer amount, full)');
        // buyer name == tokenId (full)
        expectByte(c, OP_1, 'OP_1 (buyer idx, full)');
        expectByte(c, OP_1, 'OP_1 (NAME sel, full)');
        expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (buyer name, full)');
        const tokenIdFull = readPush(c, 'tokenId (full)');
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (buyer name, full)');
        // tail (full)
        expectByte(c, OP_DROP, 'OP_DROP (full)');
        expectByte(c, OP_1, 'OP_1 (true, full)');
        expectByte(c, OP_ELSE, 'OP_ELSE (inner → partial fill)');
        // ═════ Inner ELSE — Partial-fill branch ═════
        const expirationPartial = readOptionalExpirationGate(c, OP_DUP, 'partial');
        // Payment value
        expectByte(c, OP_DUP, 'OP_DUP (price, partial)');
        const unitPriceSatsPartial = readPushPositiveInt(c, 'unitPriceSats (partial)');
        expectByte(c, OP_MUL, 'OP_MUL (partial)');
        expectByte(c, OP_0, 'OP_0 (pay idx, partial)');
        expectByte(c, OP_OUTPUTVALUE, 'OP_OUTPUTVALUE (partial)');
        expectByte(c, OP_SWAP, 'OP_SWAP (partial)');
        expectByte(c, OP_GREATERTHANOREQUAL, 'OP_GREATERTHANOREQUAL (partial)');
        expectByte(c, OP_VERIFY, 'OP_VERIFY (payment partial)');
        // Payment spk
        expectByte(c, OP_0, 'OP_0 (spk idx, partial)');
        expectByte(c, OP_OUTPUTSCRIPT, 'OP_OUTPUTSCRIPT (payment partial)');
        const sellerSpkPartial = readPush(c, 'sellerScriptPubKey (partial)');
        if (!bytesEqual(sellerSpkPartial, expectedSpk)) {
            throw new Error('parse: partial-fill seller scriptPubKey does not match the cancel PKH');
        }
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (payment spk partial)');
        // Buyer amount
        expectByte(c, OP_DUP, 'OP_DUP (buyer amount, partial)');
        expectByte(c, OP_1, 'OP_1 (buyer idx, partial)');
        expectByte(c, OP_2, 'OP_2 (AMOUNT sel, partial)');
        expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (buyer amount, partial)');
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (buyer amount, partial)');
        // Buyer name
        expectByte(c, OP_1, 'OP_1 (buyer idx, partial)');
        expectByte(c, OP_1, 'OP_1 (NAME sel, partial)');
        expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (buyer name, partial)');
        const tokenIdPartial1 = readPush(c, 'tokenId partial #1');
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (buyer name, partial)');
        // Continuation commitment
        expectByte(c, OP_2, 'OP_2 (remainder idx)');
        expectByte(c, OP_OUTPUTAUTHCOMMITMENT, 'OP_OUTPUTAUTHCOMMITMENT (remainder)');
        expectByte(c, OP_2, 'OP_2 (TXFIELD sel: AUTHSCRIPT_COMMITMENT)');
        expectByte(c, OP_TXFIELD, 'OP_TXFIELD');
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (remainder auth)');
        // Continuation name
        expectByte(c, OP_2, 'OP_2 (remainder idx)');
        expectByte(c, OP_1, 'OP_1 (NAME sel)');
        expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (remainder name)');
        const tokenIdPartial2 = readPush(c, 'tokenId partial #2');
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (remainder name)');
        // Continuation amount
        expectByte(c, OP_2, 'OP_2 (remainder idx)');
        expectByte(c, OP_2, 'OP_2 (AMOUNT sel)');
        expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (remainder amount)');
        expectByte(c, OP_OVER, 'OP_OVER');
        expectByte(c, OP_0, 'OP_0 (input idx)');
        expectByte(c, OP_2, 'OP_2 (AMOUNT sel)');
        expectByte(c, OP_INPUTASSETFIELD, 'OP_INPUTASSETFIELD');
        expectByte(c, OP_SWAP, 'OP_SWAP');
        expectByte(c, OP_SUB, 'OP_SUB');
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (remainder amount)');
        // Tail (partial)
        expectByte(c, OP_DROP, 'OP_DROP (partial)');
        expectByte(c, OP_1, 'OP_1 (true, partial)');
        // Close the nested structure
        expectByte(c, OP_ENDIF, 'OP_ENDIF (inner)');
        expectByte(c, OP_ENDIF, 'OP_ENDIF (outer)');
        assertTrailing(c);
        // Cross-branch consistency: all three (full token, partial name #1,
        // partial name #2) must agree, and the two unit prices must match.
        if (!bytesEqual(tokenIdFull, tokenIdPartial1)) {
            throw new Error('parse: tokenId differs between full-fill and partial-fill branches');
        }
        if (!bytesEqual(tokenIdPartial1, tokenIdPartial2)) {
            throw new Error('parse: tokenId bytes differ between buyer and remainder partial checks');
        }
        if (unitPriceSatsFull !== unitPriceSatsPartial) {
            throw new Error('parse: unitPriceSats differs between full-fill and partial-fill branches');
        }
        assertSameExpiration(expirationFull, expirationPartial, 'full-fill and partial-fill branches');
        const tokenId = new TextDecoder('utf-8', { fatal: true }).decode(tokenIdFull);
        return {
            network,
            sellerPubKeyHash,
            unitPriceSats: unitPriceSatsFull,
            tokenId,
            expiration: expirationFull,
            scriptHex: bytesToHex$1(bytes)
        };
    }
    /**
     * Parse a PQ partial-fill covenant. Throws if the bytes do not match the
     * exact layout produced by `buildPartialFillScriptPQ`.
     */
    function parsePartialFillScriptPQ(script, network = 'xna-test') {
        const bytes = typeof script === 'string' ? hexToBytes$1(script) : script;
        const c = makeCursor(bytes);
        // ═════ Outer IF — Cancel branch (PQ) ═════
        expectByte(c, OP_IF, 'OP_IF (outer cancel)');
        expectByte(c, OP_DUP, 'OP_DUP (cancel)');
        expectByte(c, OP_SHA256, 'OP_SHA256');
        const pubKeyCommitment = readPush(c, 'pubKeyCommitment');
        if (pubKeyCommitment.length !== 32) {
            throw new Error(`parse-pq: pubKeyCommitment must be 32 bytes, got ${pubKeyCommitment.length}`);
        }
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (cancel)');
        const selectorBytes = readPush(c, 'txHashSelector');
        if (selectorBytes.length !== 2) {
            throw new Error(`parse-pq: txHashSelector must be a two-byte LE push, got ${selectorBytes.length} bytes`);
        }
        const txHashSelector = selectorBytes[0] | (selectorBytes[1] << 8);
        if (txHashSelector === 0 || txHashSelector > 0x1ff) {
            throw new Error(`parse-pq: txHashSelector 0x${txHashSelector.toString(16)} is rejected by OP_TXHASH`);
        }
        expectByte(c, OP_TXHASH, 'OP_TXHASH');
        expectByte(c, OP_SWAP, 'OP_SWAP');
        expectByte(c, OP_CHECKSIGFROMSTACK, 'OP_CHECKSIGFROMSTACK');
        expectByte(c, OP_ELSE, 'OP_ELSE (outer → fill)');
        // ═════ Inner IF — Full-fill branch ═════
        expectByte(c, OP_IF, 'OP_IF (inner full-fill)');
        const expirationFull = readOptionalExpirationGate(c, OP_0, 'full');
        expectByte(c, OP_0, 'OP_0 (input idx, full)');
        expectByte(c, OP_2, 'OP_2 (AMOUNT sel, full)');
        expectByte(c, OP_INPUTASSETFIELD, 'OP_INPUTASSETFIELD (full)');
        expectByte(c, OP_DUP, 'OP_DUP (price, full)');
        const unitPriceSatsFull = readPushPositiveInt(c, 'unitPriceSats (full)');
        expectByte(c, OP_MUL, 'OP_MUL (full)');
        expectByte(c, OP_0, 'OP_0 (payment idx, full)');
        expectByte(c, OP_OUTPUTVALUE, 'OP_OUTPUTVALUE (full)');
        expectByte(c, OP_SWAP, 'OP_SWAP (full)');
        expectByte(c, OP_GREATERTHANOREQUAL, 'OP_GE (full)');
        expectByte(c, OP_VERIFY, 'OP_VERIFY (full)');
        expectByte(c, OP_0, 'OP_0 (payment spk idx, full)');
        expectByte(c, OP_OUTPUTSCRIPT, 'OP_OUTPUTSCRIPT (payment full)');
        const paymentScriptPubKeyFull = readPush(c, 'paymentScriptPubKey (full)');
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (payment full)');
        expectByte(c, OP_DUP, 'OP_DUP (buyer amount, full)');
        expectByte(c, OP_1, 'OP_1 (buyer idx, full)');
        expectByte(c, OP_2, 'OP_2 (AMOUNT sel, full)');
        expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (buyer amount, full)');
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (buyer amount, full)');
        expectByte(c, OP_1, 'OP_1 (buyer idx, full)');
        expectByte(c, OP_1, 'OP_1 (NAME sel, full)');
        expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (buyer name, full)');
        const tokenIdFull = readPush(c, 'tokenId (full)');
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (buyer name, full)');
        expectByte(c, OP_DROP, 'OP_DROP (full)');
        expectByte(c, OP_1, 'OP_1 (true, full)');
        expectByte(c, OP_ELSE, 'OP_ELSE (inner → partial fill)');
        // ═════ Inner ELSE — Partial-fill branch ═════
        const expirationPartial = readOptionalExpirationGate(c, OP_DUP, 'partial');
        expectByte(c, OP_DUP, 'OP_DUP (price, partial)');
        const unitPriceSatsPartial = readPushPositiveInt(c, 'unitPriceSats (partial)');
        expectByte(c, OP_MUL, 'OP_MUL (partial)');
        expectByte(c, OP_0, 'OP_0 (payment idx, partial)');
        expectByte(c, OP_OUTPUTVALUE, 'OP_OUTPUTVALUE (partial)');
        expectByte(c, OP_SWAP, 'OP_SWAP (partial)');
        expectByte(c, OP_GREATERTHANOREQUAL, 'OP_GE (partial)');
        expectByte(c, OP_VERIFY, 'OP_VERIFY (partial)');
        expectByte(c, OP_0, 'OP_0 (payment spk idx, partial)');
        expectByte(c, OP_OUTPUTSCRIPT, 'OP_OUTPUTSCRIPT (payment partial)');
        const paymentScriptPubKeyPartial = readPush(c, 'paymentScriptPubKey (partial)');
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (payment partial)');
        expectByte(c, OP_DUP, 'OP_DUP (buyer amount, partial)');
        expectByte(c, OP_1, 'OP_1 (buyer idx, partial)');
        expectByte(c, OP_2, 'OP_2 (AMOUNT sel, partial)');
        expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (buyer amount, partial)');
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (buyer amount, partial)');
        expectByte(c, OP_1, 'OP_1 (buyer idx, partial)');
        expectByte(c, OP_1, 'OP_1 (NAME sel, partial)');
        expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (buyer name, partial)');
        const tokenIdPartial1 = readPush(c, 'tokenId partial #1');
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (buyer name, partial)');
        // Continuation commitment
        expectByte(c, OP_2, 'OP_2 (remainder idx)');
        expectByte(c, OP_OUTPUTAUTHCOMMITMENT, 'OP_OUTPUTAUTHCOMMITMENT (remainder)');
        expectByte(c, OP_2, 'OP_2 (TXFIELD sel: AUTHSCRIPT_COMMITMENT)');
        expectByte(c, OP_TXFIELD, 'OP_TXFIELD');
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (remainder auth)');
        expectByte(c, OP_2, 'OP_2 (remainder idx)');
        expectByte(c, OP_1, 'OP_1 (NAME sel)');
        expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (remainder name)');
        const tokenIdPartial2 = readPush(c, 'tokenId partial #2');
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (remainder name)');
        expectByte(c, OP_2, 'OP_2 (remainder idx)');
        expectByte(c, OP_2, 'OP_2 (AMOUNT sel)');
        expectByte(c, OP_OUTPUTASSETFIELD, 'OP_OUTPUTASSETFIELD (remainder amount)');
        expectByte(c, OP_OVER, 'OP_OVER');
        expectByte(c, OP_0, 'OP_0 (input idx)');
        expectByte(c, OP_2, 'OP_2 (AMOUNT sel)');
        expectByte(c, OP_INPUTASSETFIELD, 'OP_INPUTASSETFIELD');
        expectByte(c, OP_SWAP, 'OP_SWAP');
        expectByte(c, OP_SUB, 'OP_SUB');
        expectByte(c, OP_EQUALVERIFY, 'OP_EQUALVERIFY (remainder amount)');
        expectByte(c, OP_DROP, 'OP_DROP (partial)');
        expectByte(c, OP_1, 'OP_1 (true, partial)');
        expectByte(c, OP_ENDIF, 'OP_ENDIF (inner)');
        expectByte(c, OP_ENDIF, 'OP_ENDIF (outer)');
        assertTrailing(c);
        // Cross-branch consistency.
        if (!bytesEqual(paymentScriptPubKeyFull, paymentScriptPubKeyPartial)) {
            throw new Error('parse-pq: paymentScriptPubKey differs between full-fill and partial-fill branches');
        }
        if (!bytesEqual(tokenIdFull, tokenIdPartial1)) {
            throw new Error('parse-pq: tokenId differs between full-fill and partial-fill branches');
        }
        if (!bytesEqual(tokenIdPartial1, tokenIdPartial2)) {
            throw new Error('parse-pq: tokenId differs between buyer and remainder partial checks');
        }
        if (unitPriceSatsFull !== unitPriceSatsPartial) {
            throw new Error('parse-pq: unitPriceSats differs between full-fill and partial-fill branches');
        }
        assertSameExpiration(expirationFull, expirationPartial, 'full-fill and partial-fill branches');
        const tokenId = new TextDecoder('utf-8', { fatal: true }).decode(tokenIdFull);
        return {
            network,
            pubKeyCommitment,
            tokenId,
            unitPriceSats: unitPriceSatsFull,
            txHashSelector,
            expiration: expirationFull,
            paymentScriptPubKey: paymentScriptPubKeyFull,
            scriptHex: bytesToHex$1(bytes)
        };
    }

    /** Exact monetary primitives. This module has no runtime dependencies. */
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

    // Hard deserialization bound, mirroring the node (serialize.h MAX_SIZE):
    // ReadCompactSize rejects anything above it, canonical or not.
    const MAX_SIZE = 0x02000000;
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
    function serializeOutpoint$1(ref) {
        const txid = hexToBytes(ensureHex(ref.txid, 'txid'));
        if (txid.length !== 32) {
            throw new Error(`Invalid txid: expected 32 bytes, got ${txid.length}`);
        }
        return concatBytes(reverseBytes(txid), u32LE(ref.vout));
    }
    function serializeCodecInput(input) {
        const scriptSig = hexToBytes(ensureHex(input.scriptSigHex ?? '', 'scriptSigHex'));
        return concatBytes(serializeOutpoint$1(input), compactSize(scriptSig.length), scriptSig, u32LE(input.sequence ?? 0xffffffff));
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
                parts.push(serializeOutpoint$1(ref));
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

    /**
     * NIP-042 mirror of Neurai's OP_TXHASH. The script pushes a two-byte LE mask;
     * the digest is SHA256(tag || tag || maskLE16 || selected fields), with
     * tag = SHA256("NeuraiTxHash"). Aggregate fields are double-SHA256 hashes.
     * Fields are serialized in ascending mask-bit order, including vrefin at bit 8.
     * Authority: Neurai-DePIN/src/script/interpreter.cpp, GetTxFieldHash().
     */
    const TXHASH_VERSION = 0x01;
    const TXHASH_LOCKTIME = 0x02;
    const TXHASH_INPUT_PREVOUTS = 0x04;
    const TXHASH_INPUT_SEQUENCES = 0x08;
    const TXHASH_OUTPUTS = 0x10;
    const TXHASH_CURRENT_PREVOUT = 0x20;
    const TXHASH_CURRENT_SEQUENCE = 0x40;
    const TXHASH_CURRENT_INDEX = 0x80;
    const TXHASH_REFINPUTS = 0x100;
    function hash256$1(buf) {
        return bufferExports.Buffer.from(hash256$2(buf));
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
                if (inIndex < 0 || inIndex >= tx.ins.length) {
                    throw new Error(`computeOpTxHash: inIndex ${inIndex} out of range`);
                }
                return uint32LE(inIndex);
            default:
                throw new Error(`computeOpTxHash: unexpected bit 0x${bit.toString(16)}`);
        }
    }
    /**
     * Compute the 32-byte value consensus would push via `OP_TXHASH(selector)`
     * when the current input being validated is at `inIndex`.
     *
     * `selector` is a nonzero nine-bit mask. Consensus requires its two-byte LE
     * encoding on the script stack. `options.refInputs` supplies the serialized
     * vrefin outpoints for bit 8; non-v3 transactions contribute hash256(empty).
     */
    function computeOpTxHash(tx, selector, inIndex, options) {
        if (!Number.isInteger(selector) || selector < 1 || selector > 0x1ff) {
            throw new Error(`computeOpTxHash: selector 0x${selector.toString(16)} out of NIP-042 range`);
        }
        const mask = bufferExports.Buffer.alloc(2);
        mask.writeUInt16LE(selector, 0);
        const parts = [mask];
        for (let bitIdx = 0; bitIdx < 9; bitIdx += 1) {
            const bit = 1 << bitIdx;
            if ((selector & bit) === 0)
                continue;
            if (bit === TXHASH_REFINPUTS && tx.version === 3 && options?.refInputs === undefined) {
                throw new Error("computeOpTxHash: v3 reference outpoints are required for bit 8");
            }
            const contribution = bit === TXHASH_REFINPUTS
                ? hash256$1(tx.version === 3 ? options.refInputs : bufferExports.Buffer.alloc(0))
                : contributionFor(tx, bit, inIndex);
            parts.push(contribution);
            options?.diagnostics?.push({ bit, contribution });
        }
        const tag = bufferExports.Buffer.from(sha256$1(bufferExports.Buffer.from("NeuraiTxHash", "utf8")));
        return bufferExports.Buffer.from(sha256$1(bufferExports.Buffer.concat([tag, tag, ...parts])));
    }

    // Chain parameters. The signer only reads the WIF version byte (`private`);
    // every neurai-key 5 network label of a chain shares it, whatever its address
    // type. `bip44` is informative only (Legacy coin type; neurai-key 5 derives
    // the ECDSA witness v3 keys under m/84'/1900' and the historical coin type 0
    // under its xna-old-legacy network).
    const xna = {
        mainnet: {
            name: "Neurai",
            unit: "XNA",
            symbol: "xna",
            decimalPlaces: 100000000,
            messagePrefix: "Neurai Signed Message:\n",
            confirmations: 6,
            website: "https://neurai.org/",
            projectUrl: "https://github.com/NeuraiProject",
            id: "94C49B3B-2C88-4408-B566-3D277C596778",
            network: "mainnet",
            hashGenesisBlock: "00000044d33c0c0ba019be5c0249730424a69cb4c222153322f68c6104484806",
            port: 19000,
            portRpc: 19001,
            protocol: {
                magic: 1381320014,
            },
            seedsDns: [
                "seed1.neurai.org",
                "seed2.neurai.org",
                "neurai-ipv4.neuraiexplorer.com",
            ],
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
            name: "Neurai",
            unit: "XNA",
            symbol: "xna",
            decimalPlaces: 100000000,
            messagePrefix: "Neurai Signed Message:\n",
            confirmations: 6,
            website: "https://neurai.org/",
            projectUrl: "https://github.com/NeuraiProject",
            id: "1EB2ACBA-E8E0-4970-BB20-37DA4B70F6A6",
            network: "testnet",
            hashGenesisBlock: "0000008b384aeffecdab182575dc4e86c9f07f90318c65088532660ed9a8a021",
            port: 19100,
            portRpc: 19101,
            protocol: {
                magic: 1313166674,
            },
            seedsDns: [
                "testnet1.neurai.org",
                "testnet2.neurai.org",
                "testnet3.neurai.org",
                "seed-testnet.neurai.org",
                "testnet.neurai.top",
            ],
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

    const ECPair = ECPairFactory(ecc);
    /** Supported transaction-signature modes. Advanced sponsorship is opt-in. */
    const SIGN_HASH_TYPES = Object.freeze({
        ALL: 0x01,
        SINGLE_ANYONECANPAY: 0x83,
    });
    const HASH_TYPE = SIGN_HASH_TYPES.ALL;
    const LEGACY_PREFIX_LENGTH = 25;
    const AUTHSCRIPT_PREFIX_LENGTH = 34;
    const AUTHSCRIPT_TAG = "NeuraiAuthScript";
    // Witness versions of the AuthScript families. The version is the first byte
    // of the commitment preimage and, for the strict families, part of the sighash.
    const AUTHSCRIPT_WITNESS_V1 = 0x01; // generic AuthScript (nc1p… / tnc1p…)
    const STRICT_PQ_WITNESS_V2 = 0x02; // strict PQ (pq1z… / tpq1z…)
    const STRICT_ECDSA_WITNESS_V3 = 0x03; // strict ECDSA (nq1r… / tnq1r…)
    const NOAUTH_TYPE = 0x00;
    const PQ_AUTHSCRIPT_TYPE = 0x01;
    const LEGACY_AUTHSCRIPT_TYPE = 0x02;
    // Neurai asset wrapper opcode: <destination scriptPubKey> OP_XNA_ASSET <pushdata> OP_DROP.
    // Asset-wrapped outputs always carry nValue = 0 on-chain (the asset quantity
    // lives in the pushdata payload), which is what the node puts into the
    // BIP-143 sighash. See `getSighashAmount` below.
    const OP_XNA_ASSET = 0xc0;
    const PQ_PUBLIC_KEY_LENGTH = 1312;
    const PQ_SECRET_KEY_LENGTH = 2560;
    const PQ_KEYDATA_LENGTH = 3872;
    const PQ_SEED_LENGTH = 32;
    const PQ_PUBLIC_KEY_HEADER = bufferExports.Buffer.from([0x05]);
    const DEFAULT_PQ_WITNESS_SCRIPT = bufferExports.Buffer.from([OPS$1.OP_TRUE]);
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
    const NETWORK_CHAIN = {
        xna: "mainnet",
        "xna-legacy": "mainnet",
        "xna-old-legacy": "mainnet",
        "xna-pq": "mainnet",
        "xna-authscript": "mainnet",
        "xna-test": "testnet",
        "xna-legacy-test": "testnet",
        "xna-pq-test": "testnet",
        "xna-authscript-test": "testnet",
    };
    function isHexString(value) {
        return /^[0-9a-f]+$/i.test(value) && value.length % 2 === 0;
    }
    function bufferFromHex(value, label) {
        if (!isHexString(value)) {
            throw new Error(`${label} must be a hex string`);
        }
        return bufferExports.Buffer.from(value, "hex");
    }
    function bufferFromHexAllowEmpty(value, label) {
        return value === "" ? bufferExports.Buffer.alloc(0) : bufferFromHex(value, label);
    }
    function toBigIntAmount(value, label) {
        if (typeof value === "bigint")
            return value;
        if (typeof value === "number" && Number.isSafeInteger(value))
            return BigInt(value);
        if (typeof value === "string" && /^\d+$/.test(value))
            return BigInt(value);
        throw new Error(`${label} must be a bigint (or a safe integer / decimal string)`);
    }
    function isLegacyScript(script) {
        return (script.length >= LEGACY_PREFIX_LENGTH &&
            script[0] === OPS$1.OP_DUP &&
            script[1] === OPS$1.OP_HASH160 &&
            script[2] === 0x14 &&
            script[23] === OPS$1.OP_EQUALVERIFY &&
            script[24] === OPS$1.OP_CHECKSIG);
    }
    /**
     * Witness version of an AuthScript prevout (`OP_n 0x20 <32B>`, possibly
     * followed by an asset wrapper): 1 generic, 2 strict PQ, 3 strict ECDSA.
     * Null for any other script.
     */
    function getAuthScriptWitnessVersion(script) {
        if (script.length < AUTHSCRIPT_PREFIX_LENGTH || script[1] !== 0x20)
            return null;
        const version = script[0] - (OPS$1.OP_1 - 1);
        return version === AUTHSCRIPT_WITNESS_V1 ||
            version === STRICT_PQ_WITNESS_V2 ||
            version === STRICT_ECDSA_WITNESS_V3
            ? version
            : null;
    }
    /** Generic AuthScript v1 prefix (`OP_1 0x20 <32B>`). */
    function isAuthScriptV1Script(script) {
        return getAuthScriptWitnessVersion(script) === AUTHSCRIPT_WITNESS_V1;
    }
    // NIP-025: asset payload marker + type. NIP-040 renames the marker from the
    // Ravencoin-inherited "rvn" to "xna" (active on testnet/regtest; mainnet
    // still emits "rvn"), so detection must accept both — a UTXO with either
    // marker is an asset AuthScript the anti-RBF rule protects.
    const ASSET_PAYLOAD_MARKERS = [
        bufferExports.Buffer.from("rvn", "ascii"),
        bufferExports.Buffer.from("xna", "ascii"),
    ];
    function hasAssetMarker(payload) {
        return ASSET_PAYLOAD_MARKERS.some((marker) => payload.subarray(0, 3).equals(marker));
    }
    // 't' transfer, 'q' new, 'o' owner, 'r' reissue (assets.h:19-23).
    const XNA_ASSET_TYPE_MARKERS = new Set([0x74, 0x71, 0x6f, 0x72]);
    /**
     * Mirror of the node's `IsAssetAuthScript()` predicate (strict AuthScript
     * asset parser, script.cpp:333-339): generic AuthScript-v1 prefix (34 B,
     * `OP_1` only — the node's NIP-025 predicate does not cover the strict
     * `OP_2` / `OP_3` families), then
     * `OP_XNA_ASSET` exactly at offset 34, then ONE pushdata element decoded
     * with Script push semantics (direct push / OP_PUSHDATA1/2/4, lengths
     * validated) whose payload starts with "rvn" or "xna" (NIP-040) + a valid
     * type marker, then a final OP_DROP as the script's last byte.
     *
     * Deliberately NOT a generic byte search: a 0xc0 inside push data must not
     * count as a wrapper.
     */
    function isAssetAuthScript(scriptPubKey) {
        if (!isAuthScriptV1Script(scriptPubKey))
            return false;
        let offset = AUTHSCRIPT_PREFIX_LENGTH;
        if (scriptPubKey.length <= offset || scriptPubKey[offset] !== OP_XNA_ASSET) {
            return false;
        }
        offset += 1;
        if (offset >= scriptPubKey.length)
            return false;
        const op = scriptPubKey[offset];
        offset += 1;
        let payloadLength;
        if (op > 0 && op < OPS$1.OP_PUSHDATA1) {
            payloadLength = op;
        }
        else if (op === OPS$1.OP_PUSHDATA1) {
            if (offset + 1 > scriptPubKey.length)
                return false;
            payloadLength = scriptPubKey[offset];
            offset += 1;
        }
        else if (op === OPS$1.OP_PUSHDATA2) {
            if (offset + 2 > scriptPubKey.length)
                return false;
            payloadLength = scriptPubKey.readUInt16LE(offset);
            offset += 2;
        }
        else if (op === OPS$1.OP_PUSHDATA4) {
            if (offset + 4 > scriptPubKey.length)
                return false;
            payloadLength = scriptPubKey.readUInt32LE(offset);
            offset += 4;
        }
        else {
            return false;
        }
        if (offset + payloadLength > scriptPubKey.length)
            return false;
        const payload = scriptPubKey.subarray(offset, offset + payloadLength);
        offset += payloadLength;
        if (payload.length < 4)
            return false;
        if (!hasAssetMarker(payload))
            return false;
        if (!XNA_ASSET_TYPE_MARKERS.has(payload[3]))
            return false;
        return (offset === scriptPubKey.length - 1 &&
            scriptPubKey[offset] === OPS$1.OP_DROP);
    }
    // NIP-025 (`nASSETRBFBlockEnabled`) is a hard-coded per-network opt-in in
    // the node: true on testnet/regtest, false on mainnet
    // (chainparams.cpp:135,351,568). Regtest shares the testnet networks here.
    // Revisit this set when a mainnet fork activates the rule.
    const NETWORKS_WITH_ASSET_AUTHSCRIPT_RBF_BLOCK = new Set(["xna-test", "xna-legacy-test", "xna-pq-test", "xna-authscript-test"]);
    const MIN_NON_RBF_SEQUENCE = 0xfffffffe;
    function getAuthScriptProgram(scriptPubKey) {
        if (getAuthScriptWitnessVersion(scriptPubKey) === null) {
            throw new Error("AuthScript scriptPubKey must start with OP_1/OP_2/OP_3 <32-byte commitment>");
        }
        return scriptPubKey.subarray(2, AUTHSCRIPT_PREFIX_LENGTH);
    }
    function getUTXOAmount(utxo) {
        return assertMoneyRange(utxo.satoshis ?? utxo.value, `UTXO ${utxo.txid}:${utxo.outputIndex}`);
    }
    /**
     * Returns the nValue that the consensus layer puts into the BIP-143 sighash
     * preimage for this UTXO.
     *
     * Neurai / Ravencoin asset UTXOs are indexed under `getaddressutxos` with
     * `satoshis = assetAmount` (legacy Ravencoin convention). The real on-chain
     * `nValue` for any asset transfer / issue / reissue / owner output is 0,
     * and that 0 is what the node puts into the sighash. Passing
     * `utxo.satoshis` directly (the asset quantity) produces a sighash that
     * diverges from the node and the signature fails consensus verification
     * with `WITNESS_PROGRAM_MISMATCH`.
     *
     * The script itself is the source of truth: if the scriptPubKey has an
     * `OP_XNA_ASSET` byte right after the destination prefix (P2PKH = 25 bytes,
     * AuthScript `OP_1`/`OP_2`/`OP_3` = 34 bytes), the output is asset-wrapped
     * and its nValue is 0.
     *
     * Non-standard prefixes (covenants, bare scripts, unknown witness
     * versions) fall through to `getUTXOAmount`; callers that supply a
     * `bareScriptHint` are expected to provide a UTXO whose `satoshis` field
     * already reflects the real nValue.
     */
    function getSighashAmount(utxo) {
        if (typeof utxo.script !== "string" || utxo.script.length === 0) {
            return getUTXOAmount(utxo);
        }
        let scriptPubKey;
        try {
            scriptPubKey = bufferFromHex(utxo.script, `scriptPubKey for ${utxo.txid}:${utxo.outputIndex}`);
        }
        catch {
            return getUTXOAmount(utxo);
        }
        const assetOffset = isLegacyScript(scriptPubKey)
            ? LEGACY_PREFIX_LENGTH
            : getAuthScriptWitnessVersion(scriptPubKey) !== null
                ? AUTHSCRIPT_PREFIX_LENGTH
                : -1;
        if (assetOffset >= 0 && scriptPubKey.length > assetOffset && scriptPubKey[assetOffset] === OP_XNA_ASSET) {
            return 0n;
        }
        return getUTXOAmount(utxo);
    }
    function sha256(buffer) {
        return bufferExports.Buffer.from(sha256$1(buffer));
    }
    function hash256(buffer) {
        return bufferExports.Buffer.from(hash256$2(buffer));
    }
    function hash160(buffer) {
        return bufferExports.Buffer.from(hash160$1(buffer));
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
    /**
     * Spend template of a strict family (v2 PQ / v3 ECDSA). Consensus fixes it:
     * authType bound to the witness version, witnessScript exactly OP_TRUE and
     * no functional arguments. A key entry may repeat those values (neurai-key 5
     * address objects carry `authType` and `witnessScript: "51"`), but any other
     * value is an error instead of being dropped.
     */
    function getStrictSpendTemplate(address, privateKeyEntry, witnessVersion) {
        const authType = witnessVersion === STRICT_PQ_WITNESS_V2 ? PQ_AUTHSCRIPT_TYPE : LEGACY_AUTHSCRIPT_TYPE;
        const family = witnessVersion === STRICT_PQ_WITNESS_V2 ? "strict PQ (witness v2)" : "strict ECDSA (witness v3)";
        if (typeof privateKeyEntry !== "string") {
            if (privateKeyEntry.authType !== undefined && privateKeyEntry.authType !== authType) {
                throw new Error(`${family} input of ${address} requires authType 0x${authType.toString(16).padStart(2, "0")}, got 0x${privateKeyEntry.authType.toString(16).padStart(2, "0")}`);
            }
            if (privateKeyEntry.witnessScript !== undefined &&
                privateKeyEntry.witnessScript.toLowerCase() !== DEFAULT_PQ_WITNESS_SCRIPT.toString("hex")) {
                throw new Error(`${family} input of ${address} only admits the OP_TRUE witnessScript ("51"), got "${privateKeyEntry.witnessScript}"`);
            }
            if (privateKeyEntry.functionalArgs !== undefined && privateKeyEntry.functionalArgs.length > 0) {
                throw new Error(`${family} input of ${address} does not take functionalArgs`);
            }
        }
        return { authType, witnessScript: DEFAULT_PQ_WITNESS_SCRIPT, functionalArgs: [] };
    }
    function getAuthScriptCommitment(authType, publicKey, witnessScript, witnessVersion = AUTHSCRIPT_WITNESS_V1) {
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
            bufferExports.Buffer.from([witnessVersion]),
            authDescriptor,
            witnessScriptHash,
        ]);
        return taggedHash(AUTHSCRIPT_TAG, preimage);
    }
    function serializeRefInputOutpoint(ref) {
        const txid = bufferFromHex(ref.txid, "vrefin txid");
        if (txid.length !== 32) {
            throw new Error(`vrefin txid must be 32 bytes, got ${txid.length}`);
        }
        const index = bufferExports.Buffer.alloc(4);
        index.writeUInt32LE(ref.vout, 0);
        return bufferExports.Buffer.concat([bufferExports.Buffer.from(txid).reverse(), index]);
    }
    function getRefInputsData(decoded) {
        if (decoded.version !== 3)
            return null;
        const vrefin = decoded.vrefin ?? [];
        return {
            count: vrefin.length,
            concat: bufferExports.Buffer.concat(vrefin.map(serializeRefInputOutpoint)),
        };
    }
    /**
     * Legacy (SIGVERSION_BASE) sighash for a v3 transaction. bitcoinjs'
     * `hashForSignature` cannot produce it: the node's
     * `CTransactionSignatureSerializer` serializes `CompactSize(vrefin.length)`
     * plus each outpoint between vout and nLockTime, unconditionally for v3.
     * The supported modes are ALL and SINGLE|ANYONECANPAY. Reference inputs
     * remain committed in both modes, as required by the node's serializer.
     */
    function hashForLegacySignatureV3(tx, refInputs, inIndex, scriptPubKey, hashType) {
        if (hashType !== SIGN_HASH_TYPES.ALL && hashType !== SIGN_HASH_TYPES.SINGLE_ANYONECANPAY) {
            throw new Error("Unsupported legacy v3 hash type");
        }
        const single = hashType === SIGN_HASH_TYPES.SINGLE_ANYONECANPAY;
        // Never sign the historical SINGLE-without-output constant hash.
        if (single && inIndex >= tx.outs.length)
            throw new Error("SINGLE requires a paired output");
        const version = bufferExports.Buffer.alloc(4);
        version.writeInt32LE(tx.version, 0);
        const locktime = bufferExports.Buffer.alloc(4);
        locktime.writeUInt32LE(tx.locktime, 0);
        const hashTypeBuffer = bufferExports.Buffer.alloc(4);
        hashTypeBuffer.writeUInt32LE(hashType >>> 0, 0);
        const parts = [version, encodeVarInt(single ? 1 : tx.ins.length)];
        for (let i = 0; i < tx.ins.length; i++) {
            if (single && i !== inIndex)
                continue;
            const input = tx.ins[i];
            const sequence = bufferExports.Buffer.alloc(4);
            sequence.writeUInt32LE(input.sequence, 0);
            parts.push(serializeOutpoint(input), i === inIndex ? encodeVarSlice(scriptPubKey) : encodeVarInt(0), sequence);
        }
        parts.push(encodeVarInt(single ? inIndex + 1 : tx.outs.length));
        for (let i = 0; i < (single ? inIndex + 1 : tx.outs.length); i++) {
            // CTxOut() is value -1 and an empty script, not a zero-value output.
            parts.push(single && i !== inIndex
                ? bufferExports.Buffer.concat([bufferExports.Buffer.alloc(8, 0xff), encodeVarInt(0)])
                : serializeOutput(tx.outs[i]));
        }
        parts.push(encodeVarInt(refInputs.count), refInputs.concat);
        parts.push(locktime, hashTypeBuffer);
        return hash256(bufferExports.Buffer.concat(parts));
    }
    /**
     * AuthScript sighash (node `SignatureHash`, interpreter.cpp): BIP-143 layout
     * with the witnessScript as scriptCode, then `authType` before nHashType.
     * For the strict families (`strictWitnessVersion` 2 or 3,
     * SIGVERSION_AUTHSCRIPT_STRICT) the witness version byte goes between
     * nLockTime and authType, which separates their signatures from generic v1.
     */
    function hashForAuthScript(tx, inIndex, witnessScript, amount, hashType, authType, refInputs = null, strictWitnessVersion = null) {
        const baseType = hashType & 0x1f;
        const anyoneCanPay = (hashType & Transaction.SIGHASH_ANYONECANPAY) !== 0;
        let hashPrevouts = ZERO_32;
        let hashSequence = ZERO_32;
        let hashOutputs = ZERO_32;
        if (!anyoneCanPay) {
            hashPrevouts = hash256(bufferExports.Buffer.concat(tx.ins.map(serializeOutpoint)));
        }
        if (!anyoneCanPay &&
            baseType !== Transaction.SIGHASH_SINGLE &&
            baseType !== Transaction.SIGHASH_NONE) {
            hashSequence = hash256(bufferExports.Buffer.concat(tx.ins.map((input) => {
                const sequence = bufferExports.Buffer.alloc(4);
                sequence.writeUInt32LE(input.sequence, 0);
                return sequence;
            })));
        }
        if (baseType !== Transaction.SIGHASH_SINGLE &&
            baseType !== Transaction.SIGHASH_NONE) {
            hashOutputs = hash256(bufferExports.Buffer.concat(tx.outs.map(serializeOutput)));
        }
        else if (baseType === Transaction.SIGHASH_SINGLE && inIndex < tx.outs.length) {
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
            // NIP-014: for v3, hashRefInputs goes between hashOutputs and locktime,
            // ALWAYS — an empty vrefin contributes hash256(""), not a zero hash.
            ...(refInputs ? [hash256(refInputs.concat)] : []),
            locktime,
            ...(strictWitnessVersion !== null ? [bufferExports.Buffer.from([strictWitnessVersion])] : []),
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
    function resolveInputHashTypes(options, decoded) {
        const validate = (value) => {
            if (value !== SIGN_HASH_TYPES.ALL && value !== SIGN_HASH_TYPES.SINGLE_ANYONECANPAY) {
                throw new Error("hashType must be ALL (0x01) or SINGLE|ANYONECANPAY (0x83)");
            }
            return value;
        };
        const defaultType = options?.hashType === undefined ? SIGN_HASH_TYPES.ALL : validate(options.hashType);
        const types = decoded.inputs.map(() => defaultType);
        const overrides = options?.inputHashTypes;
        if (overrides !== undefined) {
            if (overrides === null || typeof overrides !== "object" || Array.isArray(overrides)) {
                throw new Error("inputHashTypes must be an object keyed by input index");
            }
            for (const [key, value] of Object.entries(overrides)) {
                const index = Number(key);
                if (!Number.isSafeInteger(index) || index < 0 || String(index) !== key || index >= types.length) {
                    throw new Error(`Invalid inputHashTypes index: ${key}`);
                }
                types[index] = validate(value);
            }
        }
        for (let i = 0; i < types.length; i++) {
            if (types[i] === SIGN_HASH_TYPES.SINGLE_ANYONECANPAY && i >= decoded.outputs.length) {
                throw new Error(`SINGLE requires a paired output for input ${i}`);
            }
        }
        return types;
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
        const chain = NETWORK_CHAIN[network];
        if (!chain) {
            throw new Error(`Invalid network specified: ${JSON.stringify(network)}. Expected one of ${Object.keys(NETWORK_CHAIN).join(", ")}`);
        }
        // Only the WIF version byte of COIN is used (ECPair.fromWIF).
        const COIN = toBitcoinJS(xna[chain]);
        // The codec understands v1/v2/v3 (with vrefin); bitcoinjs alone would
        // misparse a v3 transaction. The bitcoinjs Transaction remains the
        // internal working representation — for v3 it is a "reduced" view that
        // never touches the wire: the signed hex is re-serialized by the codec.
        const decoded = parseTransaction(rawTransactionHex);
        const refInputs = getRefInputsData(decoded);
        const inputHashTypes = resolveInputHashTypes(options, decoded);
        // Consensus (tx_verify.cpp:520-537): within a v3 tx, vrefin entries must
        // be unique (bad-txns-vrefin-duplicate) and must not overlap any vin
        // prevout (bad-txns-vrefin-overlap-vin). Fail at signing time instead of
        // producing a tx the node is guaranteed to reject.
        if (refInputs && refInputs.count > 0) {
            const prevouts = new Set(decoded.inputs.map((input) => getUTXOKey(input.txid, input.vout)));
            const seenRefs = new Set();
            for (const ref of decoded.vrefin) {
                const key = getUTXOKey(ref.txid, ref.vout);
                if (seenRefs.has(key)) {
                    throw new Error(`vrefin reference ${ref.txid}:${ref.vout} is duplicated ` +
                        `(the node rejects this with bad-txns-vrefin-duplicate)`);
                }
                seenRefs.add(key);
                if (prevouts.has(key)) {
                    throw new Error(`vrefin reference ${ref.txid}:${ref.vout} overlaps a transaction input ` +
                        `(the node rejects this with bad-txns-vrefin-overlap-vin)`);
                }
            }
        }
        const tx = new Transaction();
        tx.version = decoded.version;
        tx.locktime = decoded.locktime;
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
        for (let i = 0; i < decoded.inputs.length; i++) {
            const input = decoded.inputs[i];
            tx.addInput(bufferExports.Buffer.from(bufferFromHex(input.txid, "input txid")).reverse(), input.vout, input.sequence, bufferFromHexAllowEmpty(input.scriptSigHex ?? "", "input scriptSig"));
            if (input.witness && input.witness.length > 0) {
                tx.setWitness(i, input.witness.map((item, w) => bufferFromHexAllowEmpty(item, `witness[${w}]`)));
            }
        }
        assertMoneyRange(decoded.outputs.reduce((sum, out) => sum + assertMoneyRange(out.valueSats), 0n), 'total outputs');
        for (const out of decoded.outputs) {
            const value = assertMoneyRange(out.valueSats, 'output');
            tx.addOutput(bufferFromHex(out.scriptPubKeyHex, "output script"), value);
        }
        // NIP-025: on networks where nASSETRBFBlockEnabled is active, a tx that
        // spends any asset-AuthScript UTXO must have EVERY input opted out of
        // RBF, or the node rejects it whole with
        // bad-txns-asset-authscript-input-rbf (tx_verify.cpp:770-796). Failing
        // here beats producing a signed tx the node is guaranteed to reject.
        if (NETWORKS_WITH_ASSET_AUTHSCRIPT_RBF_BLOCK.has(network)) {
            const triggering = tx.ins.find((input) => {
                const { txid, vout } = getInputReference(input);
                const inputUtxo = getUTXO(txid, vout);
                if (!inputUtxo ||
                    typeof inputUtxo.script !== "string" ||
                    inputUtxo.script.length === 0) {
                    return false;
                }
                return isAssetAuthScript(bufferExports.Buffer.from(inputUtxo.script, "hex"));
            });
            if (triggering) {
                const offending = tx.ins
                    .map((input, idx) => ({ idx, sequence: input.sequence }))
                    .filter(({ sequence }) => sequence < MIN_NON_RBF_SEQUENCE);
                if (offending.length > 0) {
                    const { txid, vout } = getInputReference(triggering);
                    throw new Error(`NIP-025: input ${txid}:${vout} spends an asset AuthScript UTXO, so every input must have nSequence >= 0x${MIN_NON_RBF_SEQUENCE.toString(16)} ` +
                        `(the node rejects the whole tx with bad-txns-asset-authscript-input-rbf). Offending inputs: ` +
                        offending
                            .map((o) => `#${o.idx} (0x${o.sequence.toString(16)})`)
                            .join(", "));
                }
            }
        }
        for (let i = 0; i < tx.ins.length; i++) {
            const input = tx.ins[i];
            const hashType = inputHashTypes[i];
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
                if (hashType !== HASH_TYPE)
                    throw new Error(`Advanced signing requires the prevout UTXO for input ${i}`);
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
            const witnessVersion = getAuthScriptWitnessVersion(scriptPubKey);
            const inputIsAuthScript = witnessVersion !== null;
            if (hashType !== HASH_TYPE) {
                if (!inputIsLegacy && witnessVersion !== STRICT_PQ_WITNESS_V2 && witnessVersion !== STRICT_ECDSA_WITNESS_V3) {
                    throw new Error(`SINGLE|ANYONECANPAY only supports P2PKH and strict PQ/ECDSA inputs (input ${i})`);
                }
                if (!hasPrivateKeyForAddress(utxo.address)) {
                    throw new Error(`Advanced signing requires a private key for input ${i}`);
                }
            }
            debug({
                step: "script-type",
                i,
                isLegacy: inputIsLegacy,
                witnessVersion,
            });
            const hint = utxo.bareScriptHint;
            if (hint && witnessVersion !== null && witnessVersion !== AUTHSCRIPT_WITNESS_V1) {
                throw new Error(`${hint.kind} hint for ${txid}:${vout}: covenants live in generic AuthScript v1 outputs, but the prevout is witness v${witnessVersion}`);
            }
            // Covenant branches: the prevout is generic AuthScript-v1-wrapped
            // (commitment-to-covenant). The hint tells the library the covenant
            // witness script to use and the branch to take: fill (no signature) or
            // cancel (legacy ECDSA or PQ CSFS).
            if (witnessVersion === AUTHSCRIPT_WITNESS_V1 &&
                (hint?.kind === "covenant-cancel-legacy" ||
                    hint?.kind === "covenant-cancel-pq" ||
                    hint?.kind === "covenant-fill")) {
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
                if (hint.kind === "covenant-fill") {
                    // A NOAUTH commitment match alone must not let an arbitrary
                    // witness script be spent "as a fill": the covenant has to parse
                    // as a partial-fill order (legacy or PQ).
                    let parsesAsPartialFill = false;
                    try {
                        parsePartialFillScript(hint.covenantScriptHex);
                        parsesAsPartialFill = true;
                    }
                    catch {
                        try {
                            parsePartialFillScriptPQ(hint.covenantScriptHex);
                            parsesAsPartialFill = true;
                        }
                        catch {
                            // fall through
                        }
                    }
                    if (!parsesAsPartialFill) {
                        throw new Error(`covenant-fill covenantScriptHex for ${txid}:${vout} is not a partial-fill covenant (neither legacy nor PQ)`);
                    }
                    // The order total comes from the prevout's transfer wrapper, never
                    // from the caller: a wrong total would silently pick the wrong
                    // full/partial branch.
                    let assetTransfer;
                    try {
                        assetTransfer = splitAssetWrappedScriptPubKey(utxo.script).assetTransfer;
                    }
                    catch (err) {
                        throw new Error(`covenant-fill for ${txid}:${vout}: cannot parse the prevout asset wrapper: ${err.message}`);
                    }
                    if (!assetTransfer) {
                        throw new Error(`covenant-fill for ${txid}:${vout}: prevout carries no transfer asset wrapper; the order total cannot be derived`);
                    }
                    const total = assetTransfer.amountRaw;
                    const fillAmount = toBigIntAmount(hint.amount, `covenant-fill amount for ${txid}:${vout}`);
                    let fillArgs;
                    try {
                        fillArgs = buildFillWitnessStack(fillAmount, total);
                    }
                    catch (err) {
                        throw new Error(`covenant-fill for ${txid}:${vout}: ${err.message}`);
                    }
                    const witnessStack = buildAuthScriptWitnessNoAuth({
                        args: fillArgs,
                        witnessScript: covenantScriptBytes,
                    }).map((item) => bufferExports.Buffer.from(item));
                    tx.setInputScript(i, bufferExports.Buffer.alloc(0));
                    tx.setWitness(i, witnessStack);
                    debug({
                        step: "covenant-fill-witness-set",
                        i,
                        amount: fillAmount.toString(),
                        total: total.toString(),
                        assetName: assetTransfer.assetName,
                        fullFill: fillAmount === total,
                    });
                    continue;
                }
                if (!hasPrivateKeyForAddress(utxo.address)) {
                    throw new Error(`Missing private key for covenant cancel at ${txid}:${vout} (address ${utxo.address})`);
                }
                const amount = getSighashAmount(utxo);
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
                    const sighash = hashForAuthScript(tx, i, covenantScriptBytes, amount, HASH_TYPE, NOAUTH_TYPE, refInputs);
                    const rawSignature = keyPair.sign(sighash);
                    const signatureWithHashType = signature.encode(bufferExports.Buffer.from(rawSignature), HASH_TYPE);
                    const witnessStack = buildAuthScriptWitnessNoAuth({
                        args: buildCancelWitnessStack(bufferExports.Buffer.from(signatureWithHashType), bufferExports.Buffer.from(keyPair.publicKey)),
                        witnessScript: covenantScriptBytes,
                    }).map((item) => bufferExports.Buffer.from(item));
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
                const opTxHash = computeOpTxHash(tx, parsedPQ.txHashSelector, i, {
                    refInputs: refInputs?.concat,
                });
                const message = sha256(opTxHash);
                const rawSig = ml_dsa44.sign(new Uint8Array(message), new Uint8Array(pqMaterial.secretKey), { extraEntropy: false });
                const sigWithHashType = bufferExports.Buffer.concat([
                    bufferExports.Buffer.from(rawSig),
                    bufferExports.Buffer.from([HASH_TYPE]),
                ]);
                const witnessStack = buildAuthScriptWitnessNoAuth({
                    args: buildCancelWitnessStackPQ(sigWithHashType, pqMaterial.serializedPublicKey),
                    witnessScript: covenantScriptBytes,
                }).map((item) => bufferExports.Buffer.from(item));
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
            if (!inputIsLegacy && !inputIsAuthScript) {
                if (hint) {
                    throw new Error(`${hint.kind} hint requires an AuthScript-v1-wrapped prevout for ${txid}:${vout}, but the prevout script is neither P2PKH nor AuthScript v1`);
                }
                throw new Error(`Unsupported prevout script for ${txid}:${vout}. Supported: legacy P2PKH and Neurai AuthScript witness v1 (generic), v2 (strict PQ) and v3 (strict ECDSA)`);
            }
            if (witnessVersion === STRICT_PQ_WITNESS_V2 || witnessVersion === STRICT_ECDSA_WITNESS_V3) {
                if (!hasPrivateKeyForAddress(utxo.address)) {
                    debug({ step: "skip-missing-private-key", i, address: utxo.address });
                    continue;
                }
                const privateKeyEntry = privateKeys[utxo.address];
                const template = getStrictSpendTemplate(utxo.address, privateKeyEntry, witnessVersion);
                const actualCommitment = getAuthScriptProgram(scriptPubKey);
                let publicKey;
                let signWith;
                if (witnessVersion === STRICT_PQ_WITNESS_V2) {
                    const pqMaterial = getPQMaterialByAddress(utxo.address);
                    publicKey = pqMaterial.serializedPublicKey;
                    signWith = (sighash) => bufferExports.Buffer.concat([
                        bufferExports.Buffer.from(ml_dsa44.sign(new Uint8Array(sighash), new Uint8Array(pqMaterial.secretKey), {
                            extraEntropy: false,
                        })),
                        bufferExports.Buffer.from([hashType]),
                    ]);
                }
                else {
                    const keyPair = getKeyPairByAddress(utxo.address);
                    if (!keyPair.compressed) {
                        throw new Error(`strict ECDSA (witness v3) input of ${utxo.address} needs a compressed key; the WIF encodes an uncompressed one`);
                    }
                    publicKey = bufferExports.Buffer.from(keyPair.publicKey);
                    signWith = (sighash) => bufferExports.Buffer.from(signature.encode(bufferExports.Buffer.from(keyPair.sign(sighash)), hashType));
                }
                const expectedCommitment = getAuthScriptCommitment(template.authType, publicKey, template.witnessScript, witnessVersion);
                if (!actualCommitment.equals(expectedCommitment)) {
                    throw new Error(`AuthScript commitment mismatch for ${txid}:${vout} (witness v${witnessVersion}). The provided key does not match the prevout script`);
                }
                const sighash = hashForAuthScript(tx, i, template.witnessScript, getSighashAmount(utxo), hashType, template.authType, refInputs, witnessVersion);
                tx.setInputScript(i, bufferExports.Buffer.alloc(0));
                tx.setWitness(i, [
                    bufferExports.Buffer.from([template.authType]),
                    signWith(sighash),
                    publicKey,
                    template.witnessScript,
                ]);
                debug({ step: "strict-witness-set", i, witnessVersion, authType: template.authType, hashType, sighashHex: sighash.toString("hex") });
                continue;
            }
            if (inputIsAuthScript) {
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
                    const sighash = hashForAuthScript(tx, i, spendTemplate.witnessScript, getSighashAmount(utxo), HASH_TYPE, spendTemplate.authType, refInputs);
                    const signature = bufferExports.Buffer.from(ml_dsa44.sign(new Uint8Array(sighash), new Uint8Array(pqMaterial.secretKey), {
                        extraEntropy: false,
                    }));
                    const signatureWithHashType = bufferExports.Buffer.concat([signature, bufferExports.Buffer.from([HASH_TYPE])]);
                    witnessStack = [
                        bufferExports.Buffer.from([PQ_AUTHSCRIPT_TYPE]),
                        bufferExports.Buffer.from(signatureWithHashType),
                        pqMaterial.serializedPublicKey,
                        ...spendTemplate.functionalArgs,
                        spendTemplate.witnessScript,
                    ];
                }
                else {
                    const keyPair = getKeyPairByAddress(utxo.address);
                    const sighash = hashForAuthScript(tx, i, spendTemplate.witnessScript, getSighashAmount(utxo), HASH_TYPE, spendTemplate.authType, refInputs);
                    const rawSignature = keyPair.sign(sighash);
                    const signatureWithHashType = signature.encode(bufferExports.Buffer.from(rawSignature), HASH_TYPE);
                    witnessStack = [
                        bufferExports.Buffer.from([LEGACY_AUTHSCRIPT_TYPE]),
                        bufferExports.Buffer.from(signatureWithHashType),
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
                    witnessLastHex: tx.ins[i].witness?.length ? bufferExports.Buffer.from(tx.ins[i].witness[tx.ins[i].witness.length - 1]).toString("hex") : null,
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
            const sighash = refInputs
                ? hashForLegacySignatureV3(tx, refInputs, i, scriptPubKey, hashType)
                : tx.hashForSignature(i, scriptPubKey, hashType);
            const rawSignature = keyPair.sign(sighash);
            const signatureWithHashType = signature.encode(bufferExports.Buffer.from(rawSignature), hashType);
            const scriptSig = compile([
                signatureWithHashType,
                bufferExports.Buffer.from(keyPair.publicKey),
            ]);
            tx.setInputScript(i, scriptSig);
            debug({ step: "legacy-signed", i, hashType, sighashHex: bufferExports.Buffer.from(sighash).toString("hex") });
        }
        debug({
            step: "final-inputs",
            inputs: tx.ins.map((input, i) => ({
                i,
                scriptLen: input.script?.length ?? 0,
                witnessItems: input.witness?.length ?? 0,
            })),
        });
        if (refInputs) {
            // v3 exit criterion: the signed hex is serialized by the codec end to
            // end. bitcoinjs' toHex() does not know vrefin and would silently drop
            // it, changing the txid.
            return serializeTransaction({
                ...decoded,
                inputs: decoded.inputs.map((input, i) => ({
                    ...input,
                    scriptSigHex: bufferExports.Buffer.from(tx.ins[i].script).toString("hex"),
                    witness: tx.ins[i].witness.map((item) => bufferExports.Buffer.from(item).toString("hex")),
                })),
            });
        }
        return tx.toHex();
    }
    const Signer = {
        sign,
        SIGN_HASH_TYPES,
    };

    const globalTarget = globalThis;
    globalTarget.NeuraiSignTransaction = Signer;

})();
//# sourceMappingURL=NeuraiSignTransaction.global.js.map
