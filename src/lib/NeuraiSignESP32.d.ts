// Ambient declarations for the browser global NeuraiSignESP32 bundle.
// The extension loads src/lib/NeuraiSignESP32.js via <script> and consumes
// the exposed global instead of importing the package directly.

export {};

declare global {
  type NeuraiSignESP32NetworkType = 'xna' | 'xna-test' | 'xna-legacy' | 'xna-legacy-test';

  interface NeuraiESP32DeviceInfo {
    status: string;
    device: string;
    version: string;
    chip: string;
    network: string;
    coin_type: number;
    master_fingerprint: string;
    path: string;
    address: string;
    pubkey: string;
  }

  interface NeuraiESP32AddressResult {
    status: string;
    address: string;
    pubkey: string;
    path: string;
  }

  interface NeuraiESP32Bip32PubkeyResult {
    status: string;
    bip32_pubkey: string;
    master_fingerprint: string;
    path: string;
  }

  interface NeuraiESP32SignDisplay {
    kind?: 'asset_transfer';
    assetName?: string;
    assetAmount?: string;
    destinationAddress?: string;
    destinationCount?: number;
    changeAddress?: string;
    changeCount?: number;
    inputAddresses?: string[];
    feeAmount?: string;
    baseCurrency?: string;
  }

  interface NeuraiESP32BuildPsbtInput {
    txid: string;
    vout: number;
    sequence?: number;
    rawTxHex?: string;
    pubkey?: string | null;
    masterFingerprint?: string | null;
    derivationPath?: string | null;
    sighashType?: number;
  }

  interface NeuraiESP32BuildPsbtParams {
    network: NeuraiSignESP32NetworkType;
    rawUnsignedTransaction: string;
    inputs: NeuraiESP32BuildPsbtInput[];
    display?: NeuraiESP32SignDisplay;
  }

  interface NeuraiESP32BuildAssetTransferDisplayMetadataOptions {
    assetName: string;
    assetAmount: number | string;
    destinationAddress: string;
    destinationCount?: number;
    changeAddress?: string;
    changeCount?: number;
    inputAddresses?: string[];
    feeAmount?: number | string;
    baseCurrency?: string;
  }

  interface NeuraiESP32Utxo {
    txid: string;
    vout: number;
    scriptPubKey: string;
    satoshis: number;
    rawTxHex: string;
  }

  interface NeuraiESP32TxOutput {
    address: string;
    value: number;
  }

  interface NeuraiESP32SerialOptions {
    baudRate?: number;
    filters?: SerialPortFilter[];
  }

  interface NeuraiESP32SignPsbtResult {
    status: string;
    psbt: string;
    signed_inputs: number;
  }

  interface NeuraiESP32SignMessageResult {
    status: string;
    signature: string;
    address: string;
    message: string;
  }

  interface NeuraiESP32SignTransactionResult {
    signedPsbtBase64: string;
    txHex: string;
    txId: string;
    signedInputs: number;
  }

  interface NeuraiESP32Instance {
    readonly connected: boolean;
    readonly info: NeuraiESP32DeviceInfo | null;

    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getInfo(): Promise<NeuraiESP32DeviceInfo>;
    setNetwork?(network: 'Neurai' | 'NeuraiTest'): Promise<NeuraiESP32DeviceInfo | { success?: boolean; network?: string }>;
    getAddress(): Promise<NeuraiESP32AddressResult>;
    getBip32Pubkey(): Promise<NeuraiESP32Bip32PubkeyResult>;
    signMessage(message: string): Promise<NeuraiESP32SignMessageResult>;
    signPsbt(psbtBase64: string, display?: NeuraiESP32SignDisplay): Promise<NeuraiESP32SignPsbtResult>;
    signTransaction(options: {
      network?: NeuraiSignESP32NetworkType;
      utxos: NeuraiESP32Utxo[];
      outputs: NeuraiESP32TxOutput[];
      changeAddress: string;
      pubkey?: string;
      masterFingerprint?: string;
      derivationPath?: string;
      feeRate?: number;
      display?: NeuraiESP32SignDisplay;
    }): Promise<NeuraiESP32SignTransactionResult>;
  }

  interface NeuraiESP32SerialConnection {
    readonly connected: boolean;
    open(): Promise<void>;
    close(): Promise<void>;
    sendCommand(command: Record<string, unknown>, timeoutMs?: number): Promise<unknown>;
    sendCommandFinal(command: Record<string, unknown>, timeoutMs?: number): Promise<unknown>;
  }

  interface NeuraiNetwork {
    messagePrefix: string;
    bech32?: string;
    bip32: {
      public: number;
      private: number;
    };
    pubKeyHash: number;
    scriptHash: number;
    wif: number;
  }

  interface NeuraiSignESP32Static {
    NeuraiESP32: new (options?: NeuraiESP32SerialOptions) => NeuraiESP32Instance;
    SerialConnection: new (options?: NeuraiESP32SerialOptions) => NeuraiESP32SerialConnection;

    buildPSBTFromRawTransaction(params: NeuraiESP32BuildPsbtParams): string;
    finalizeSignedPSBT(psbtBase64: string, signedPsbt: string, network: NeuraiSignESP32NetworkType): {
      txHex: string;
      txId: string;
    };
    finalizePSBT(signedPsbtBase64: string, network: NeuraiSignESP32NetworkType): {
      txHex: string;
      txId: string;
    };
    validatePSBT(psbtBase64: string, network: NeuraiSignESP32NetworkType): boolean;
    buildAssetTransferDisplayMetadata(
      options: NeuraiESP32BuildAssetTransferDisplayMetadataOptions
    ): NeuraiESP32SignDisplay;
    getNetwork(network: NeuraiSignESP32NetworkType): NeuraiNetwork;

    neuraiMainnet: NeuraiNetwork;
    neuraiTestnet: NeuraiNetwork;
    neuraiLegacyMainnet: NeuraiNetwork;
    neuraiLegacyTestnet: NeuraiNetwork;
  }

  var NeuraiSignESP32: NeuraiSignESP32Static;
}
