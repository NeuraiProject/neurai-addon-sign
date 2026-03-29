// Ambient declarations for the pre-compiled NeuraiSignESP32 bundle.
// The bundle is loaded via dynamic import() and sets a global on window.
// export {} makes this file a module so TypeScript allows dynamic import of the .js bundle.

export {};

declare global {
  interface NeuraiESP32DeviceInfo {
    network?: string;
    device?: string;
    version?: string;
    master_fingerprint?: string;
  }

  interface NeuraiESP32AddressResult {
    address: string;
    pubkey: string;
    path?: string;
  }

  interface NeuraiESP32SignDisplay {
    feeAmount?: string;
    baseCurrency?: string;
  }

  interface NeuraiESP32BuildPsbtInput {
    txid: string;
    vout: number;
    sequence?: number;
    rawTxHex?: string;
    masterFingerprint?: string | null;
    derivationPath?: string | null;
    pubkey?: string | null;
    sighashType?: number;
  }

  interface NeuraiESP32BuildPsbtParams {
    network: string;
    rawUnsignedTransaction: string;
    inputs: NeuraiESP32BuildPsbtInput[];
  }

  /** Instance of a connected hardware wallet (ESP32). */
  interface NeuraiESP32Instance {
    /** Whether the device is currently connected. */
    readonly connected: boolean;
    /** Cached device info from the last getInfo() call. */
    readonly info: NeuraiESP32DeviceInfo | null;

    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getInfo(): Promise<NeuraiESP32DeviceInfo>;
    getAddress(): Promise<NeuraiESP32AddressResult>;
    signMessage(message: string): Promise<{ signature: string; address: string }>;
    signPsbt(psbt: string, display?: NeuraiESP32SignDisplay): Promise<{ psbt: string }>;
  }

  interface NeuraiSignESP32Static {
    /** Hardware wallet device class. */
    NeuraiESP32: new (options: { filters: unknown[] }) => NeuraiESP32Instance;

    /** Build a PSBT (base64) from a raw unsigned transaction. */
    buildPSBTFromRawTransaction(params: NeuraiESP32BuildPsbtParams): string;

    /** Finalize a signed PSBT and return the broadcast-ready TX hex. */
    finalizeSignedPSBT(psbtBase64: string, signedPsbt: string, network: string): { txHex: string };
  }

  var NeuraiSignESP32: NeuraiSignESP32Static;
}
