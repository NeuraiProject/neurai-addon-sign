export {};

declare global {
  type NeuraiKeyNetwork = 'xna' | 'xna-test' | 'xna-legacy' | 'xna-legacy-test';
  type NeuraiKeyPQNetwork = 'xna-pq' | 'xna-pq-test';

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
  }

  interface NeuraiKeyAddressPairResult {
    internal: NeuraiKeyAddressData;
    external: NeuraiKeyAddressData;
    position: number;
  }

  /** PQ address data — AuthScript authType 0x01 */
  interface NeuraiKeyPQAddressData {
    address: string;
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

    // AuthScript PQ (authType 0x01)
    getPQAddress(
      network: NeuraiKeyPQNetwork,
      mnemonic: string,
      account: number,
      index: number,
      passphrase?: string,
      options?: NeuraiKeyPQAddressOptions
    ): NeuraiKeyPQAddressData;
    getPQAddressByPath(network: NeuraiKeyPQNetwork, hdKey: unknown, path: string, options?: NeuraiKeyPQAddressOptions): NeuraiKeyPQAddressData;
    getPQHDKey(network: NeuraiKeyPQNetwork, mnemonic: string, passphrase?: string): unknown;
    pqPublicKeyToAddress(network: NeuraiKeyPQNetwork, publicKey: Uint8Array | string, options?: NeuraiKeyPQAddressOptions): string;
    pqPublicKeyToCommitmentHex(publicKey: Uint8Array | string, options?: NeuraiKeyPQAddressOptions): string;
    pqPublicKeyToAuthDescriptorHex(publicKey: Uint8Array | string): string;
    generatePQAddressObject(network?: NeuraiKeyPQNetwork, passphrase?: string, options?: NeuraiKeyPQAddressOptions): NeuraiKeyPQAddressData;

    // AuthScript NoAuth (authType 0x00) — out of scope for this addon but exposed by the library
    getNoAuthAddress(network: NeuraiKeyPQNetwork, options?: NeuraiKeyAuthScriptOptions): NeuraiKeyNoAuthAddressData;

    // AuthScript Legacy (authType 0x02) — out of scope for this addon but exposed by the library
    getLegacyAuthScriptAddress(
      network: NeuraiKeyPQNetwork,
      legacyNetwork: NeuraiKeyNetwork,
      mnemonic: string,
      account: number,
      index: number,
      passphrase?: string,
      options?: NeuraiKeyAuthScriptOptions
    ): NeuraiKeyLegacyAuthScriptAddressData;
    getLegacyAuthScriptAddressByWIF(
      network: NeuraiKeyPQNetwork,
      wif: string,
      options?: NeuraiKeyAuthScriptOptions
    ): NeuraiKeyLegacyAuthScriptAddressData;
  }

  var NeuraiKey: NeuraiKeyStatic;
}
