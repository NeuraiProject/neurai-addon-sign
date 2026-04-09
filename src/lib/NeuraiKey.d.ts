export {};

declare global {
  type NeuraiKeyNetwork = 'xna' | 'xna-test' | 'xna-legacy' | 'xna-legacy-test';
  type NeuraiKeyPQNetwork = 'xna-pq' | 'xna-pq-test';

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

  interface NeuraiKeyPQAddressData {
    address: string;
    mnemonic?: string;
    path: string;
    publicKey: string;
    privateKey: string;
    seedKey: string;
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
    getPQAddress(
      network: NeuraiKeyPQNetwork,
      mnemonic: string,
      account: number,
      index: number,
      passphrase?: string
    ): NeuraiKeyPQAddressData;
    getPQAddressByPath(network: NeuraiKeyPQNetwork, hdKey: unknown, path: string): NeuraiKeyPQAddressData;
    getPQHDKey(network: NeuraiKeyPQNetwork, mnemonic: string, passphrase?: string): unknown;
    pqPublicKeyToAddress(network: NeuraiKeyPQNetwork, publicKey: Uint8Array | string): string;
    generatePQAddressObject(network?: NeuraiKeyPQNetwork, passphrase?: string): NeuraiKeyPQAddressData;
  }

  var NeuraiKey: NeuraiKeyStatic;
}
