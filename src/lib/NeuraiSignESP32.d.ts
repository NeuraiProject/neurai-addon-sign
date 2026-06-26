// Ambient declarations for the browser global NeuraiSignESP32 bundle.
// The extension loads src/lib/NeuraiSignESP32.js via <script> and consumes
// the exposed global instead of importing the package directly.

export {};

declare global {
  type NeuraiSignESP32NetworkType =
    | 'xna' | 'xna-test' | 'xna-legacy' | 'xna-legacy-test'
    | 'xna-pq' | 'xna-pq-test';

  // Public two-axis model (network × key type).
  type NeuraiSignESP32Network = 'mainnet' | 'testnet';
  type NeuraiSignESP32KeyType = 'legacy' | 'pq';

  /**
   * Coarse device state derived from the `ping` gate errors:
   * `ready` (keys derived; normal commands work), `locked` (encrypted seed
   * stored but PIN not entered — ask the user to unlock on the device) or
   * `unconfigured` (no seed stored — {@link NeuraiESP32Instance.setupSeed} or
   * the on-device wizard applies).
   */
  type NeuraiESP32DeviceState = 'ready' | 'locked' | 'unconfigured';

  /** Options for {@link NeuraiESP32Instance.setupSeed}. */
  interface NeuraiESP32SetupSeedOptions {
    /** 12 or 24 BIP39 words, space-separated. Re-validated on-device. */
    mnemonic: string;
    /** Chain network. REQUIRED by the firmware (no defaults). */
    network: NeuraiSignESP32Network;
    /** Key scheme. REQUIRED by the firmware. `pq` is testnet-only. */
    keyType: NeuraiSignESP32KeyType;
  }

  /**
   * Successful `setup_seed` reply: the owner approved on the device and is now
   * creating the PIN there. Poll {@link NeuraiESP32Instance.getDeviceState}
   * (or use {@link NeuraiESP32Instance.waitUntilReady}) to detect completion.
   */
  interface NeuraiESP32SetupSeedResult {
    status: string;
    /** Always `"pin_required"`: the owner must finish the PIN on the device. */
    state: 'pin_required';
  }

  interface NeuraiESP32DeviceInfo {
    status: string;
    device: string;
    version: string;
    chip: string;
    network: string;
    /** Key/signature scheme. Absent on pre-PQ firmware → assume 'legacy'. */
    key_type?: NeuraiSignESP32KeyType;
    coin_type: number;
    master_fingerprint: string;
    path: string;
    address: string;
    pubkey: string;
  }

  /**
   * Lightweight handshake for device detection (`ping`/`device_info`). Answers
   * WITHOUT on-device approval and returns NOTHING wallet-identifying (no
   * fingerprint/address/pubkey/network). Use it to detect the device, then call
   * {@link NeuraiESP32Instance.getInfo} (gated) for the actual wallet data.
   */
  interface NeuraiESP32PingResult {
    status: string;
    device: string;
    /** Protocol/app version (matches `info`). */
    version: string;
    /** Device firmware version (from the device's WalletConfig). */
    firmware_version: string;
    chip: string;
  }

  interface NeuraiESP32AddressResult {
    status: string;
    /** 'legacy' | 'pq' (present once the library derives the address). */
    type?: NeuraiSignESP32KeyType;
    /** Derived address (N…/t… legacy, nq1…/tnq1… PQ). */
    address: string;
    /** Compressed secp256k1 pubkey (legacy) or raw ML-DSA-44 pubkey (PQ), hex. */
    pubkey: string;
    path: string;
    // PQ-only (present when type === 'pq')
    authType?: number;
    witnessScript?: string;
    commitment?: string;
    authDescriptor?: string;
  }

  /** A UTXO locked to the device's PQ (AuthScript) address. */
  interface NeuraiESP32PQUtxo {
    txid: string;
    vout: number;
    satoshis: number;
    /** Prevout scriptPubKey hex ("5120<commitment>"). */
    scriptPubKey: string;
    type: 'pq';
    /** Override sighash amount (0 for asset-wrapped inputs). */
    sighashAmount?: number;
  }

  /** Decoded AuthScript witness of a signed PQ input. */
  interface NeuraiESP32PQWitness {
    authType: number;
    signature: Uint8Array;
    hashType: number;
    pubkey: Uint8Array;
    witnessScript: Uint8Array;
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
    /** Present for the legacy/ECDSA (PSBT) flow; absent for the PQ flow. */
    signedPsbtBase64?: string;
    txHex: string;
    txId: string;
    signedInputs: number;
  }

  interface NeuraiESP32Instance {
    readonly connected: boolean;
    readonly info: NeuraiESP32DeviceInfo | null;

    connect(): Promise<void>;
    disconnect(): Promise<void>;
    /** No-prompt detection handshake. Throws on firmware too old to know `ping`. */
    ping(): Promise<NeuraiESP32PingResult>;
    /**
     * Coarse device state (`ready` | `locked` | `unconfigured`), derived from the
     * `ping` gate errors. Safe to poll; never prompts on the device.
     */
    getDeviceState(): Promise<NeuraiESP32DeviceState>;
    /**
     * Provision an UNCONFIGURED device with a host-held mnemonic (`setup_seed`).
     * The owner approves a summary and creates the PIN on the device (the PIN
     * never travels over USB). Resolves `{ state: 'pin_required' }`; then poll
     * {@link waitUntilReady} for completion.
     */
    setupSeed(options: NeuraiESP32SetupSeedOptions): Promise<NeuraiESP32SetupSeedResult>;
    /**
     * Poll {@link getDeviceState} until the device reports `ready` (the owner
     * finished creating the PIN after {@link setupSeed} / unlocked the device).
     * Throws on timeout (default 5 min).
     */
    waitUntilReady(options?: { pollMs?: number; timeoutMs?: number }): Promise<NeuraiESP32DeviceState>;
    getInfo(): Promise<NeuraiESP32DeviceInfo>;
    setNetwork?(network: 'Neurai' | 'NeuraiTest'): Promise<NeuraiESP32DeviceInfo | { success?: boolean; network?: string }>;
    getAddress(): Promise<NeuraiESP32AddressResult>;
    getBip32Pubkey(): Promise<NeuraiESP32Bip32PubkeyResult>;
    signMessage(message: string): Promise<NeuraiESP32SignMessageResult>;
    signPsbt(psbtBase64: string, display?: NeuraiESP32SignDisplay): Promise<NeuraiESP32SignPsbtResult>;
    signTransaction(options: {
      network?: NeuraiSignESP32NetworkType;
      keyType?: NeuraiSignESP32KeyType;
      utxos: Array<NeuraiESP32Utxo | NeuraiESP32PQUtxo>;
      outputs: NeuraiESP32TxOutput[];
      changeAddress?: string;
      pubkey?: string;
      masterFingerprint?: string;
      derivationPath?: string;
      feeRate?: number;
      display?: NeuraiESP32SignDisplay;
    }): Promise<NeuraiESP32SignTransactionResult>;
    /** Spend from a PQ address (raw-tx transport via `sign_tx`). */
    signPqTransaction(options: {
      utxos: NeuraiESP32PQUtxo[];
      outputs: NeuraiESP32TxOutput[];
      changeAddress?: string;
      feeRate?: number;
      display?: NeuraiESP32SignDisplay;
    }): Promise<NeuraiESP32SignTransactionResult>;
    /** Sign an already-built unsigned raw transaction via `sign_tx` (PQ).
     *  An input may carry `covenant` to request the NOAUTH covenant-cancel
     *  witness instead of a standard AuthScript self-spend; the device reads the
     *  OP_TXHASH selector from the covenant `script` itself. */
    signPqRawTransaction(options: {
      txHex: string;
      inputs: Array<{
        index: number;
        amount: number;
        script_pub_key?: string;
        covenant?: { script: string };
      }>;
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

    // ── Post-Quantum (ML-DSA-44 / AuthScript) helpers ──
    resolveNetwork(network: NeuraiSignESP32Network, keyType: NeuraiSignESP32KeyType): NeuraiSignESP32NetworkType;
    isPQAddress(address: string): boolean;
    decodeAddress(address: string):
      | { type: 'pq'; address: string; commitment: Uint8Array; witnessVersion: number; hrp: string }
      | { type: 'legacy'; address: string; hash: Uint8Array; version: number };
    encodeDestinationScript(address: string): Uint8Array;
    publicKeyToAddress(
      pubkeyHex: string,
      opts: { network: NeuraiSignESP32Network; keyType: NeuraiSignESP32KeyType; witnessScript?: string }
    ): string;
    buildUnsignedPQTransaction(options: {
      utxos: NeuraiESP32PQUtxo[];
      outputs: NeuraiESP32TxOutput[];
      changeAddress: string;
      feeRate?: number;
      version?: number;
    }): { rawTxHex: string; inputs: Array<{ index: number; amount: number; script_pub_key: string }> };
    parseSignedPQTransaction(signedTxHex: string): { txHex: string; txId: string };
    extractPQWitness(signedTxHex: string, inputIndex?: number): NeuraiESP32PQWitness;
    pqAuthScriptSighash(options: {
      tx: string;
      inputIndex: number;
      amount: number | bigint;
      witnessScript?: string;
      authType?: number;
      sighashType?: number;
    }): Uint8Array;

    neuraiPQMainnet: { hrp: string; witnessVersion: number; coinType: number; purpose: number };
    neuraiPQTestnet: { hrp: string; witnessVersion: number; coinType: number; purpose: number };
  }

  var NeuraiSignESP32: NeuraiSignESP32Static;
}
