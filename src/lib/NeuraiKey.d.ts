// Ambient declarations for the pre-compiled NeuraiKey bundle.
// The bundle is loaded via dynamic import() and sets a global on window.
// export {} makes this file a module so TypeScript allows dynamic import of the .js bundle.

export {};

declare global {
  interface NeuraiKeyAddressData {
    address: string;
    /** Hex-encoded private key */
    privateKey: string;
    publicKey: string;
    wif: string;
    /** WIF private key (alias used in some derivation results) */
    WIF: string;
  }

  interface NeuraiKeyAddressPairResult {
    external: NeuraiKeyAddressData;
    internal: NeuraiKeyAddressData;
  }

  interface NeuraiKeyStatic {
    /** Derive address and key material from a WIF private key. */
    getAddressByWIF(network: string, wif: string): NeuraiKeyAddressData;
    /** Generate a new random key pair for the given network. */
    generateNewAddress(network: string): NeuraiKeyAddressData;
    /** Restore a key pair from a mnemonic phrase. */
    getAddressByMnemonic(network: string, mnemonic: string, index?: number): NeuraiKeyAddressData;
    /** Derive external+internal address pair from mnemonic at given change/index. */
    getAddressPair(
      network: string,
      mnemonic: string,
      change: number,
      index: number,
      passphrase?: string
    ): NeuraiKeyAddressPairResult;
    /** Generate a BIP39 mnemonic phrase. strength: 128 = 12 words, 256 = 24 words. */
    generateMnemonic(strength?: number): string;
  }

  var NeuraiKey: NeuraiKeyStatic;
}
