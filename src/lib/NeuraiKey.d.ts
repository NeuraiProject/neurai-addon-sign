export {};

declare global {
  // neurai-key 5 labels. They are NOT the extension's account labels: `xna` is
  // ECDSA witness v3 here. Map account labels with toKeyNetwork()
  // (src/shared/networks.ts) before calling the library.

  /** secp256k1 networks: Legacy Base58 (`*-legacy`) or ECDSA witness v3 (`xna`, `xna-test`). */
  type NeuraiKeyNetwork = 'xna' | 'xna-test' | 'xna-legacy' | 'xna-legacy-test' | 'xna-old-legacy';
  /** Strict PQ witness v2 (`pq1z…` / `tpq1z…`). */
  type NeuraiKeyPQNetwork = 'xna-pq' | 'xna-pq-test';
  /** Generic AuthScript witness v1 (`nc1p…` / `tnc1p…`), the contract family. */
  type NeuraiKeyAuthScriptNetwork = 'xna-authscript' | 'xna-authscript-test';

  /** AuthScript auth type identifiers */
  type NeuraiKeyAuthType = 0x00 | 0x01 | 0x02;

  interface NeuraiKeyAuthScriptOptions {
    authType?: NeuraiKeyAuthType;
    witnessScript?: Uint8Array | string;
  }

  type NeuraiKeyPQAddressOptions = NeuraiKeyAuthScriptOptions;

  interface NeuraiKeyAddressData {
    address: string;
    mnemonic?: string;
    network?: string;
    path: string;
    publicKey: string;
    privateKey: string;
    WIF: string;
    /** ECDSA witness v3 only (`xna` / `xna-test`). */
    witnessVersion?: 3;
    authType?: 0x02;
    authDescriptor?: string;
    commitment?: string;
    witnessScript?: string;
  }

  interface NeuraiKeyAddressPairResult {
    internal: NeuraiKeyAddressData;
    external: NeuraiKeyAddressData;
    position: number;
  }

  /** PQ address data — witness v2 from getPQAddress, v1 from getPQAuthScriptAddress */
  interface NeuraiKeyPQAddressData {
    address: string;
    witnessVersion?: 1 | 2;
    mnemonic?: string;
    path: string;
    publicKey: string;
    privateKey: string;
    seedKey: string;
    authType: 0x01;
    authDescriptor: string;
    commitment: string;
    witnessScript: string;
  }

  /** NoAuth address data — AuthScript authType 0x00 */
  interface NeuraiKeyNoAuthAddressData {
    address: string;
    authType: 0x00;
    commitment: string;
    witnessScript: string;
  }

  /** Legacy AuthScript address data — AuthScript authType 0x02 */
  interface NeuraiKeyLegacyAuthScriptAddressData {
    address: string;
    path?: string;
    publicKey: string;
    privateKey: string;
    WIF: string;
    authType: 0x02;
    authDescriptor: string;
    commitment: string;
    witnessScript: string;
  }

  interface NeuraiKeyStatic {
    entropyToMnemonic(entropy: Uint8Array | string): string;
    generateAddress(network?: NeuraiKeyNetwork): NeuraiKeyAddressData;
    generateAddressObject(network?: NeuraiKeyNetwork, passphrase?: string): NeuraiKeyAddressData;
    generateMnemonic(): string;
    getAddressByPath(network: NeuraiKeyNetwork, hdKey: unknown, path: string): NeuraiKeyAddressData;
    /** Throws when the WIF version byte does not belong to the network's chain. */
    getAddressByWIF(network: NeuraiKeyNetwork, privateKeyWIF: string): Pick<NeuraiKeyAddressData, 'address' | 'privateKey' | 'WIF'>;
    getPubkeyByWIF(network: NeuraiKeyNetwork, privateKeyWIF: string): string;
    getAddressPair(
      network: NeuraiKeyNetwork,
      mnemonic: string,
      account: number,
      position: number,
      passphrase?: string
    ): NeuraiKeyAddressPairResult;
    getCoinType(network: NeuraiKeyNetwork): number;
    getHDKey(network: NeuraiKeyNetwork, mnemonic: string, passphrase?: string): unknown;
    isMnemonicValid(mnemonic: string): boolean;
    publicKeyToAddress(network: NeuraiKeyNetwork, publicKey: Uint8Array | string): string;

    // Strict PQ witness v2 (authType 0x01, witnessScript fixed to OP_TRUE).
    // Passing the 4.x `options` argument throws.
    getPQAddress(
      network: NeuraiKeyPQNetwork,
      mnemonic: string,
      account: number,
      index: number,
      passphrase?: string
    ): NeuraiKeyPQAddressData;
    getPQAddressByPath(network: NeuraiKeyPQNetwork, hdKey: unknown, path: string): NeuraiKeyPQAddressData;
    getPQHDKey(network: NeuraiKeyPQNetwork | NeuraiKeyAuthScriptNetwork, mnemonic: string, passphrase?: string): unknown;
    pqPublicKeyToAddress(network: NeuraiKeyPQNetwork, publicKey: Uint8Array | string): string;
    pqPublicKeyToCommitmentHex(publicKey: Uint8Array | string): string;
    pqPublicKeyToAuthDescriptorHex(publicKey: Uint8Array | string): string;
    generatePQAddressObject(network?: NeuraiKeyPQNetwork, passphrase?: string): NeuraiKeyPQAddressData;

    // Generic AuthScript witness v1 with a PQ key (the 4.x `xna-pq` address, now nc1p…)
    getPQAuthScriptAddress(
      network: NeuraiKeyAuthScriptNetwork,
      mnemonic: string,
      account: number,
      index: number,
      passphrase?: string,
      options?: NeuraiKeyPQAddressOptions
    ): NeuraiKeyPQAddressData;
    getPQAuthScriptAddressByPath(network: NeuraiKeyAuthScriptNetwork, hdKey: unknown, path: string, options?: NeuraiKeyPQAddressOptions): NeuraiKeyPQAddressData;
    pqPublicKeyToAuthScriptAddress(network: NeuraiKeyAuthScriptNetwork, publicKey: Uint8Array | string, options?: NeuraiKeyPQAddressOptions): string;
    pqPublicKeyToAuthScriptCommitmentHex(publicKey: Uint8Array | string, options?: NeuraiKeyPQAddressOptions): string;

    // AuthScript NoAuth (authType 0x00) — out of scope for this addon but exposed by the library.
    // `witnessScript` is required.
    getNoAuthAddress(network: NeuraiKeyAuthScriptNetwork, options: NeuraiKeyAuthScriptOptions): NeuraiKeyNoAuthAddressData;

    // AuthScript Legacy (authType 0x02) — out of scope for this addon but exposed by the library
    getLegacyAuthScriptAddress(
      network: NeuraiKeyAuthScriptNetwork,
      legacyNetwork: NeuraiKeyNetwork,
      mnemonic: string,
      account: number,
      index: number,
      passphrase?: string,
      options?: NeuraiKeyAuthScriptOptions
    ): NeuraiKeyLegacyAuthScriptAddressData;
    getLegacyAuthScriptAddressByWIF(
      network: NeuraiKeyAuthScriptNetwork,
      wif: string,
      options?: NeuraiKeyAuthScriptOptions
    ): NeuraiKeyLegacyAuthScriptAddressData;
  }

  var NeuraiKey: NeuraiKeyStatic;
}
