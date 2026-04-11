// Ambient declarations for the pre-compiled NeuraiMessage bundle.
// The bundle is preloaded statically in the MV3 background and exposes a global on globalThis.
// export {} makes this file a module so TypeScript loads these ambient declarations safely.

export {};

declare global {
  interface NeuraiMessageStatic {
    /**
     * Sign a message with a private key buffer.
     * @param message   - UTF-8 message text
     * @param privateKey - Raw private key bytes (Uint8Array, optionally flagged _isBuffer)
     * @param compressed - Whether to use a compressed public key (should be true)
     * @returns Base64-encoded signature string
     */
    sign(message: string, privateKey: Uint8Array, compressed?: boolean): string;

    /**
     * Verify a signed message (auto-detects legacy vs PQ).
     * Note: parameter order is (message, address, signature) — message comes FIRST.
     * @returns true if the signature is valid for the given address
     */
    verifyMessage(message: string, address: string, signature: string | Uint8Array): boolean;

    /**
     * Sign a message with PQ (ML-DSA-44) keys.
     * @param message    - UTF-8 message text
     * @param privateKey - ML-DSA-44 secret key bytes
     * @param publicKey  - ML-DSA-44 public key bytes (1312 bytes)
     * @returns Base64-encoded PQ signature string
     */
    signPQMessage(message: string, privateKey: Uint8Array, publicKey: Uint8Array): string;

    /**
     * Verify a PQ (ML-DSA-44) signed message.
     * @returns true if the PQ signature is valid for the given address
     */
    verifyPQMessage(message: string, address: string, signature: string | Uint8Array): boolean;
  }

  var NeuraiMessage: NeuraiMessageStatic;
}
