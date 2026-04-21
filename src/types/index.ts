// Neurai Wallet — Shared TypeScript types

// ── Primitives ────────────────────────────────────────────────────────────────

export type WalletNetwork =
  | 'xna'
  | 'xna-test'
  | 'xna-legacy'
  | 'xna-legacy-test'
  | 'xna-pq'
  | 'xna-pq-test';
export type WalletType   = 'software' | 'hardware';
export type Theme        = 'dark' | 'light' | 'system';
export type SighashType  = 'ALL' | 'NONE' | 'SINGLE' | 'ALL|ANYONECANPAY' | 'NONE|ANYONECANPAY' | 'SINGLE|ANYONECANPAY';

// ── Encrypted secret (AES-GCM + PBKDF2) ──────────────────────────────────────

export interface EncryptedSecret {
  v: 1;
  kdf: 'PBKDF2-SHA256';
  iter: number;
  alg: 'AES-GCM-256';
  salt: string;
  iv: string;
  ciphertext: string;
}

// ── Wallet data ───────────────────────────────────────────────────────────────

export interface WalletSettings {
  theme: Theme;
  rpcMainnet: string;
  rpcTestnet: string;
  /** Block explorer URL template for mainnet transactions. `{txid}` placeholder. Empty = use built-in default. */
  explorerMainnet: string;
  /** Block explorer URL template for testnet transactions. `{txid}` placeholder. Empty = use built-in default. */
  explorerTestnet: string;
  pinHash: string;
  lockTimeoutMinutes: number;
}

/** History entry for a message signing operation */
export interface MessageHistoryEntry {
  type: 'message';
  timestamp: number;
  origin: string;
  message: string;
  signature: string;
}

/** History entry for a raw transaction signing operation */
export interface RawTxHistoryEntry {
  type: 'raw_tx';
  timestamp: number;
  origin: string;
  sighashType: string;
  inputCount: number;
  txHex?: string;
  signedTxHex: string;
  complete: boolean;
}

export type HistoryEntry = MessageHistoryEntry | RawTxHistoryEntry;

/** A single wallet account as stored in chrome.storage.local */
export interface WalletData {
  address: string;
  publicKey?: string;
  /** Unencrypted WIF private key — only present when PIN is not configured */
  privateKey?: string;
  /** AES-GCM encrypted WIF private key — present when PIN is configured */
  privateKeyEnc?: EncryptedSecret;
  /** AuthScript PQ seed key (32-byte hex) — only present for AuthScript PQ wallets without PIN */
  seedKey?: string;
  /** AES-GCM encrypted AuthScript PQ seed key — present for AuthScript PQ wallets with PIN */
  seedKeyEnc?: EncryptedSecret;
  /** Unencrypted mnemonic — only present when PIN is not configured */
  mnemonic?: string;
  /** AES-GCM encrypted mnemonic — present when PIN is configured */
  mnemonicEnc?: EncryptedSecret;
  /** Unencrypted passphrase — only present when PIN is not configured */
  passphrase?: string;
  /** AES-GCM encrypted passphrase — present when PIN is configured */
  passphraseEnc?: EncryptedSecret;
  walletType?: WalletType;
  network?: WalletNetwork;
  /** Only present for hardware wallets */
  hardwareMasterFingerprint?: string | null;
  /** Only present for hardware wallets */
  hardwareDerivationPath?: string | null;
  history?: HistoryEntry[];
}

/** Map of account ID → WalletData stored under ACCOUNTS_KEY */
export type AccountsRecord = Record<string, WalletData>;

// ── UTXO ─────────────────────────────────────────────────────────────────────

/**
 * Hint forwarded from a calling dApp to unlock signing of a partial-fill
 * covenant cancel. Covenant UTXOs on-chain are always AuthScript-v1
 * wrapped (consensus `IsAssetScript` only accepts 25-byte P2PKH or
 * 34-byte AuthScript-v1 prefixes before an asset wrapper), so the
 * covenant itself lives in the spend witness, not in the scriptPubKey.
 * The DEX — which built the covenant — must supply the covenant bytes in
 * `covenantScriptHex`; the signing lib verifies that
 * `taggedHash("NeuraiAuthScript", 0x01 || 0x00 || SHA256(covenantScript))`
 * matches the 32-byte program in the prevout before signing.
 *
 * Mirror of the type exported by `@neuraiproject/neurai-sign-transaction@2.0.0`.
 */
export type BareScriptSigningHint =
  | { kind: 'covenant-cancel-legacy'; covenantScriptHex: string }
  | { kind: 'covenant-cancel-pq'; covenantScriptHex: string };

export interface Utxo {
  txid: string;
  vout: number;
  scriptPubKey: string;
  amount: number;
  /** Optional hint for non-standard prevouts. Passed through to the library. */
  bareScriptHint?: BareScriptSigningHint;
}

// ── Signing payloads ──────────────────────────────────────────────────────────

/** One output of the cancel tx as rendered in the approval popup. */
export interface CancelOutputSummary {
  index: number;
  valueSats: number;
  scriptHex: string;
  /** Decoded P2PKH / AuthScript v1 address, or null if not decodable. */
  address: string | null;
  /** Asset transfer payload parsed from a wrapped output, or null. */
  asset: { name: string; amountRaw: string } | null;
}

/**
 * Summary of the cancel tx refund layout. `mode === 'labeled'` means
 * output[0] matches the expected shape (same asset + full remanente back
 * to an address) and the popup shows a "Refund to" row. `mode === 'breakdown'`
 * means the builder used an unrecognised layout and the popup shows every
 * output instead.
 */
export type CancelRefundSummary =
  | {
      mode: 'labeled';
      refundAddress: string | null;
      refundScriptHex: string;
      refundAssetName: string;
      refundAmountRaw: string;
    }
  | {
      mode: 'breakdown';
      outputs: CancelOutputSummary[];
      reason: string;
    };

/**
 * Covenant-cancel-specific data attached to the approval payload when
 * `signType === 'covenant_cancel'`. Populated by the background handler
 * from `splitAssetWrappedScriptPubKey` + `parsePartialFillScript*` before
 * the popup is opened.
 */
export interface CancelApprovalData {
  variant: 'legacy' | 'pq';
  covenantTxid: string;
  covenantVout: number;
  covenantScriptHex: string;
  tokenId: string;
  unitPriceSats: string;
  assetName: string;
  amountRaw: string;
  /** PKH hex (legacy) or 32-byte commitment hex (pq) of the seller. */
  sellerIdentifier: string;
  /** Only set when variant === 'pq'. */
  txHashSelector?: number;
  refund: CancelRefundSummary;
}

/** Payload stored for a pending software-wallet sign request */
export interface SignApprovalPayload {
  signType: 'message' | 'raw_tx' | 'covenant_cancel';
  origin: string;
  message: string;
  address: string;
  network: WalletNetwork | string;
  sighashType?: string;
  inputCount?: number;
  txHex?: string;
  utxos?: Utxo[];
  /** Only set when signType === 'covenant_cancel'. */
  cancelData?: CancelApprovalData;
}

/** Result of the user's approval/rejection decision */
export interface SignApprovalResult {
  approved: boolean;
  pin?: string;
  error?: string;
}

/** Payload stored for a pending hardware-wallet sign request */
export interface HwSignPayload {
  type: 'message' | 'raw_tx';
  origin: string;
  address: string;
  network: WalletNetwork | string;
  /** Only for type === 'message' */
  message?: string;
  /** Only for type === 'raw_tx' */
  txHex?: string;
  utxos?: Utxo[];
  sighashType?: string;
  publicKey?: string;
  masterFingerprint?: string | null;
  derivationPath?: string | null;
}

/** Successful result of a hardware-wallet message signature */
export interface HwMessageSignResult {
  success: true;
  signature: string;
  address: string;
}

/** Successful result of a hardware-wallet raw-tx signature */
export interface HwRawTxSignResult {
  success: true;
  signedTxHex: string;
  complete: boolean;
}

export type HwSignSuccess = HwMessageSignResult | HwRawTxSignResult;
export type HwSignResult  = HwSignSuccess | { error: string };

// ── Internal pending-request state ────────────────────────────────────────────

export interface PendingSignRequest {
  payload: SignApprovalPayload;
  resolve: (result: SignApprovalResult) => void;
  timeout: ReturnType<typeof setTimeout>;
  windowId: number | null;
}

export interface PendingHwSignRequest {
  payload: HwSignPayload;
  resolve: (result: HwSignResult) => void;
  timeout: ReturnType<typeof setTimeout>;
  windowId: number | null;
  settling: boolean;
  lastError: string;
}

// ── Chrome extension messages ─────────────────────────────────────────────────
// Discriminated unions for all messages exchanged between content ↔ background ↔ popup.

// --- Requests (sent TO background) ---

export interface GetWalletInfoMsg         { type: 'GET_WALLET_INFO' }
export interface SignMessageMsg            { type: 'SIGN_MESSAGE';            message: string }
export interface SignRawTxMsg             { type: 'SIGN_RAW_TX';             txHex: string; utxos: Utxo[]; sighashType: string }
export interface SetSessionPinMsg         { type: 'SET_SESSION_PIN';         pin: string }
export interface GetSessionPinMsg         { type: 'GET_SESSION_PIN' }
export interface ClearSessionPinMsg       { type: 'CLEAR_SESSION_PIN' }
export interface GetSignRequestMsg        { type: 'GET_SIGN_REQUEST';        requestId: string }
export interface HwGetSignRequestMsg      { type: 'HW_GET_SIGN_REQUEST';     requestId: string }
export interface HwConnectionStatusMsg    { type: 'HW_CONNECTION_STATUS' }
export interface SignRequestDecisionMsg   { type: 'SIGN_REQUEST_DECISION';   requestId: string; approved: boolean; pin?: string }
export interface HwSignResultMsg          { type: 'HW_SIGN_RESULT';          requestId: string; error?: string; signature?: string; address?: string; signedTxHex?: string; complete?: boolean }
export interface HwExecuteSignRequestMsg  { type: 'HW_EXECUTE_SIGN_REQUEST'; requestId: string }
export interface VerifyOwnershipMsg       { type: 'VERIFY_OWNERSHIP';        address: string; message: string; signature: string }
export interface WalletUpdatedMsg         { type: 'WALLET_UPDATED' }
export interface SettingsUpdatedMsg       { type: 'SETTINGS_UPDATED' }
export interface BalanceUpdateMsg         { type: 'BALANCE_UPDATE';          balance: string }

export type BackgroundMessage =
  | GetWalletInfoMsg
  | SignMessageMsg
  | SignRawTxMsg
  | SetSessionPinMsg
  | GetSessionPinMsg
  | ClearSessionPinMsg
  | GetSignRequestMsg
  | HwGetSignRequestMsg
  | HwConnectionStatusMsg
  | SignRequestDecisionMsg
  | HwSignResultMsg
  | HwExecuteSignRequestMsg
  | VerifyOwnershipMsg
  | WalletUpdatedMsg
  | SettingsUpdatedMsg
  | BalanceUpdateMsg;

// --- Responses (sent FROM background) ---

export interface SuccessResponse        { success: true }
export interface ErrorResponse          { error: string }
export interface WalletInfoResponse     { hasWallet: boolean; address: string | null; publicKey: string | null; walletType: WalletType; network: WalletNetwork }
export interface GetSignRequestResponse { success: true; request: SignApprovalPayload; pinRequired: boolean }
export interface HwGetSignRequestResponse { success: true; request: HwSignPayload }
export interface GetSessionPinResponse  { success: true; pin: string }
export interface VerifyOwnershipResponse { valid: boolean }
export interface HwConnectionStatusResponse { success: true; connected: boolean }
export interface SignMessageResponse    { success: true; signature: string; address: string }
export interface SignRawTxResponse      { success: true; signedTxHex: string; complete: boolean }

export type BackgroundResponse =
  | SuccessResponse
  | ErrorResponse
  | WalletInfoResponse
  | GetSignRequestResponse
  | HwGetSignRequestResponse
  | GetSessionPinResponse
  | VerifyOwnershipResponse
  | HwConnectionStatusResponse
  | SignMessageResponse
  | SignRawTxResponse;

// ── Public API (window.neuraiWallet) ──────────────────────────────────────────

export interface NeuraiWalletAPI {
  readonly isInstalled: true;
  readonly version: string;
  getAddress(): Promise<string | null>;
  getPublicKey(): Promise<string | null>;
  isConnected(): Promise<boolean>;
  signMessage(message: string): Promise<{ signature: string; address: string }>;
  verifyMessage(address: string, message: string, signature: string): Promise<boolean>;
  signRawTransaction(txHex: string, utxos: Utxo[], sighashType?: SighashType): Promise<{ signedTxHex: string; complete: boolean }>;
  getInfo(): Promise<WalletInfoResponse>;
}
