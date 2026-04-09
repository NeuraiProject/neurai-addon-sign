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
  }

  interface NeuraiSignTransactionStatic {
    /**
     * Sign a raw transaction locally.
     * @param network       - Network identifier (xna, xna-test, xna-pq, xna-pq-test, etc.)
     * @param rawTxHex      - Unsigned transaction hex
     * @param utxos         - Array of UTXOs being spent
     * @param privateKeys   - Map of address → WIF string or PQ key object
     * @returns Signed transaction hex
     */
    sign(
      network: NeuraiSignTransactionNetwork,
      rawTxHex: string,
      utxos: NeuraiSignTransactionUTXO[],
      privateKeys: Record<string, string | NeuraiSignTransactionPQKey>
    ): string;
  }

  var NeuraiSignTransaction: NeuraiSignTransactionStatic;
}
