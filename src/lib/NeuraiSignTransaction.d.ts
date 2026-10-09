// Ambient declarations for the pre-compiled NeuraiSignTransaction bundle.

export {};

declare global {
  /** neurai-key 5 labels; only the chain (mainnet vs `-test`) is used. */
  type NeuraiSignTransactionNetwork =
    | 'xna'
    | 'xna-test'
    | 'xna-legacy'
    | 'xna-legacy-test'
    | 'xna-old-legacy'
    | 'xna-pq'
    | 'xna-pq-test'
    | 'xna-authscript'
    | 'xna-authscript-test';

  interface NeuraiSignTransactionUTXO {
    address: string;
    assetName: string;
    txid: string;
    outputIndex: number;
    script: string;
    satoshis: number | bigint | string;
    height?: number;
    value: number | bigint | string;
  }

  interface NeuraiSignTransactionPQKey {
    WIF?: string;
    seedKey?: string;
    privateKey?: string;
    secretKey?: string;
    publicKey?: string;
    /** AuthScript auth type (0x00=NoAuth, 0x01=PQ, 0x02=Legacy) */
    authType?: number;
    /** Hex-encoded witnessScript for AuthScript spending */
    witnessScript?: string;
    /** Additional functional arguments for the witness */
    functionalArgs?: string[];
  }

  interface NeuraiSignTransactionDebugEvent {
    step: string;
    [key: string]: unknown;
  }

  interface NeuraiSignTransactionOptions {
    /** Enable debug logging or provide a callback for sign events */
    debug?: boolean | ((event: NeuraiSignTransactionDebugEvent) => void);
    /** Default hash type of signed inputs: 0x01 (ALL, default) or 0x83 (SINGLE|ANYONECANPAY). */
    hashType?: number;
    /** Per-input-index overrides of `hashType`. */
    inputHashTypes?: Record<number, number>;
  }

  interface NeuraiSignTransactionStatic {
    /**
     * Sign a raw transaction locally.
     *
     * The input type comes from each prevout script: P2PKH, generic AuthScript
     * v1 (OP_1), strict PQ v2 (OP_2, PQ key) or strict ECDSA v3 (OP_3, WIF).
     *
     * @param network       - neurai-key 5 label; only its chain is used
     * @param rawTxHex      - Unsigned transaction hex
     * @param utxos         - Array of UTXOs being spent
     * @param privateKeys   - Map of address → WIF string or PQ/AuthScript key object
     * @param options       - Optional signing options (debug, etc.)
     * @returns Signed transaction hex
     */
    sign(
      network: NeuraiSignTransactionNetwork,
      rawTxHex: string,
      utxos: NeuraiSignTransactionUTXO[],
      privateKeys: Record<string, string | NeuraiSignTransactionPQKey>,
      options?: NeuraiSignTransactionOptions
    ): string;

    SIGN_HASH_TYPES: { ALL: number; SINGLE_ANYONECANPAY: number };
  }

  var NeuraiSignTransaction: NeuraiSignTransactionStatic;
}
