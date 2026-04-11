// Ambient declarations for the pre-compiled NeuraiReader bundle.
// The bundle is preloaded statically where needed and exposes a global on globalThis.
// export {} makes this file a module so TypeScript loads these ambient declarations safely.

export {};

declare global {
  type RpcMethod = (method: string, params: unknown[]) => Promise<unknown>;

  interface NeuraiReaderStatic {
    /** Public RPC endpoint URLs. */
    URL_MAINNET: string;
    URL_TESTNET: string;

    /** Create an RPC caller for the given endpoint. */
    getRPC(username: string, password: string, url: string): RpcMethod;

    /** Fetch the confirmed XNA balance for an address. */
    getNeuraiBalance(address: string): Promise<{ balance: number } | null>;

    /** Fetch the net pending satoshis for an address/asset from the mempool. */
    getPendingBalanceFromAddressMempool(address: string, assetName: string): Promise<number>;

    /** Format a raw balance number to a human-readable string. */
    formatBalance(balance: number): string;

    /** Fetch all asset balances for an address. */
    getAssetBalance(address: string): Promise<unknown>;

    /** Switch the reader to mainnet. */
    setMainnet(): void;

    /** Switch the reader to testnet. */
    setTestnet(): void;

    /** Override the RPC URL. */
    setURL(url: string): void;

    /** Fetch address deltas (transaction history entries) for a given asset. */
    getAddressDeltas(address: string, assetName: string): Promise<unknown[]>;

    /** Fetch a full transaction by txid. */
    getTransaction(txid: string): Promise<unknown>;
  }

  var NeuraiReader: NeuraiReaderStatic;
}
