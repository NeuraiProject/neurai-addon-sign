// Ambient declarations for src/lib/NeuraiConnect.js, the bundle that
// neurai-connect-bundle.js builds from @neuraiproject/neurai-connect,
// @neuraiproject/neurai-connect-core and qrcode. Only what the extension uses.

export {};

declare global {
  interface NeuraiConnectKeyValueStorage {
    get<T = unknown>(key: string): Promise<T | undefined>;
    set<T = unknown>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    keys(prefix?: string): Promise<string[]>;
  }

  interface NeuraiConnectAppMetadata {
    name: string;
    description?: string;
    url: string;
    icons?: string[];
  }

  interface NeuraiConnectSession {
    topic: string;
    pairingTopic: string;
    peerMetadata: NeuraiConnectAppMetadata;
    namespaces: Record<string, { chains?: string[]; accounts: string[]; methods: string[]; events: string[] }>;
    sessionProperties?: Record<string, string>;
    /** Unix seconds. */
    expiry: number;
    createdAt: number;
    lastActivity: number;
  }

  interface NeuraiConnectClient {
    sessions(): NeuraiConnectSession[];
    session(topic: string): NeuraiConnectSession | undefined;
    connect(params: {
      chains?: string[];
      methods?: string[];
      events?: string[];
      requiredNamespaces?: Record<string, { chains: string[]; methods: string[]; events: string[] }>;
      optionalNamespaces?: Record<string, { chains: string[]; methods: string[]; events: string[] }>;
      expirySeconds?: number;
      signal?: AbortSignal;
    }): Promise<{ uri: string; deepLink: string; approval: Promise<NeuraiConnectSession> }>;
    request<R = unknown>(
      topic: string,
      chainId: string,
      method: string,
      params?: unknown,
      opts?: { signal?: AbortSignal; timeoutMs?: number }
    ): Promise<R>;
    disconnect(topic: string): Promise<void>;
    close(): Promise<void>;
    on(event: string, listener: (payload: unknown) => void): unknown;
  }

  interface NeuraiConnectSDKStatic {
    NeuraiConnect: {
      init(opts: {
        relayUrl: string;
        storage: NeuraiConnectKeyValueStorage;
        metadata: NeuraiConnectAppMetadata;
        requestTimeoutMs?: number;
        approvalTimeoutMs?: number;
      }): Promise<NeuraiConnectClient>;
    };
    /** JSON-RPC error with the Neurai codes (4001 user rejected, 4200 unsupported method, …). */
    RpcError: new (...args: unknown[]) => Error & { code: number };
    NeuraiRpcError: { USER_REJECTED: number; UNSUPPORTED_METHOD: number; [code: string]: number };
    NEURAI_CHAIN_MAINNET: string;
    NEURAI_CHAIN_TESTNET: string;
    addressKind(address: string): 'legacy' | 'ecdsa' | 'authscript' | 'pq' | undefined;
    isExpired(unixSeconds: number, nowMs?: number): boolean;
    /** BIP32 keys of @scure/bip32, for the addresses of a shared account key. */
    HDKey: {
      fromExtendedKey(base58key: string, versions?: { public: number; private: number }): NeuraiConnectHDKey;
    };
    /** QR module matrix of `text` (qrcode's `create`). */
    createQr(text: string, options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' }): {
      modules: { size: number; get(row: number, col: number): boolean | number };
    };
  }

  interface NeuraiConnectHDKey {
    deriveChild(index: number): NeuraiConnectHDKey;
    publicKey: Uint8Array | null;
  }

  var NeuraiConnectSDK: NeuraiConnectSDKStatic;
}
