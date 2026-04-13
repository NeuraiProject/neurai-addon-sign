// Ambient declarations for the pre-compiled NeuraiSignTransaction bundle.

export {};

declare global {
  type NeuraiSignTransactionNetwork =
    | 'xna'
    | 'xna-test'
    | 'xna-legacy'
    | 'xna-legacy-test'
    | 'xna-pq'
    | 'xna-pq-test';

  interface NeuraiSignTransactionUTXO {
    address: string;
    assetName: string;
    txid: string;
    outputIndex: number;
    script: string;
    satoshis: number;
    height?: number;
    value: number;
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
  }

  interface NeuraiSignTransactionStatic {
    /**
     * Sign a raw transaction locally.
     *
     * Supports legacy, AuthScript PQ (authType 0x01), and mixed inputs.
     * For AuthScript inputs the prevout must be OP_1 <32-byte-commitment>.
     *
     * @param network       - Network identifier (xna, xna-test, xna-pq, xna-pq-test, etc.)
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
  }

  var NeuraiSignTransaction: NeuraiSignTransactionStatic;
}
