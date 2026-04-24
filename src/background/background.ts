// Neurai Wallet — Background Service Worker
// Handles balance polling, message signing approval, and RPC calls.

import './crypto-preload.js';
import { NEURAI_CONSTANTS } from '../shared/constants.js';
import { NEURAI_UTILS } from '../shared/utils.js';
import { assertSighashSupported, UnsupportedSighashError, type WalletSigningKind } from '../shared/sighash.js';
import { isTxComplete } from '../shared/completeness.js';
import { parseRawTransactionOutputs } from '../shared/parse-raw-tx.js';
import { decodePrefixAddress } from '../shared/script-to-address.js';
import { resolvePrivateKeysForSigning } from './signing-keys.js';
import type {
  WalletData,
  WalletSettings,
  AccountsRecord,
  CancelApprovalData,
  CancelOutputSummary,
  CancelRefundSummary,
  SignApprovalPayload,
  SignApprovalResult,
  HwSignPayload,
  HwSignResult,
  HwSignSuccess,
  HwMessageSignResult,
  HwRawTxSignResult,
  PendingSignRequest,
  PendingHwSignRequest,
  BackgroundMessage,
  BackgroundResponse,
  WalletNetwork,
  Utxo,
  SignRequestDecisionMsg,
  HwSignResultMsg,
} from '../types/index.js';

// Local type for the Buffer polyfill marker that bitcoinjs-message's bundle expects.
type BufferLike = Uint8Array & { _isBuffer: true };

// ── State ─────────────────────────────────────────────────────────────────────

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let walletData: WalletData | null = null;
let walletSettings: WalletSettings = { ...NEURAI_CONSTANTS.DEFAULT_SETTINGS };
let sessionPinCache: string = '';
const pendingSignRequests = new Map<string, PendingSignRequest>();
const pendingHwSignRequests = new Map<string, PendingHwSignRequest>();
const keepAlivePorts = new Set<chrome.runtime.Port>();

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert a hex string to a Uint8Array marked as a Buffer (for bitcoinjs-message compat).
 */
function hexToBufferLike(hex: string): BufferLike {
  if (typeof hex !== 'string' || hex.length % 2 !== 0) {
    throw new Error('Invalid private key format');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error('Invalid private key hex');
    bytes[i] = byte;
  }
  // bitcoinjs-message's bundled Buffer polyfill accepts objects marked like this.
  (bytes as BufferLike)._isBuffer = true;
  return bytes as BufferLike;
}

function isPQNetwork(network: string): network is Extract<WalletNetwork, 'xna-pq' | 'xna-pq-test'> {
  return network === 'xna-pq' || network === 'xna-pq-test';
}

function isLegacySigningNetwork(
  network: string
): network is Extract<WalletNetwork, 'xna' | 'xna-test' | 'xna-legacy' | 'xna-legacy-test'> {
  return network === 'xna' || network === 'xna-test' || network === 'xna-legacy' || network === 'xna-legacy-test';
}

function getRpcUrl(network: WalletNetwork | string = 'xna'): string {
  if (NEURAI_UTILS.isTestnetNetwork(network)) {
    return walletSettings.rpcTestnet || NEURAI_CONSTANTS.RPC_URL_TESTNET;
  }
  return walletSettings.rpcMainnet || NEURAI_CONSTANTS.RPC_URL;
}

function isHardwareWallet(wallet: WalletData | null): wallet is WalletData & { walletType: 'hardware' } {
  return wallet?.walletType === 'hardware';
}

function getAuthScriptPQApprovalAddress(wallet: WalletData, network: Extract<WalletNetwork, 'xna-pq' | 'xna-pq-test'>): string {
  if (!wallet.publicKey) return wallet.address;
  try {
    return NeuraiKey.pqPublicKeyToAddress(network, wallet.publicKey);
  } catch (error) {
    console.warn('[AuthScript PQ] failed to derive approval address from stored public key', {
      address: wallet.address,
      network,
      error
    });
    return wallet.address;
  }
}

// ── Storage helpers ───────────────────────────────────────────────────────────

async function loadWalletData(): Promise<void> {
  const result = await chrome.storage.local.get([
    NEURAI_CONSTANTS.STORAGE_KEY,
    NEURAI_CONSTANTS.ACCOUNTS_KEY,
    NEURAI_CONSTANTS.ACTIVE_ACCOUNT_KEY
  ]);
  const accounts = result[NEURAI_CONSTANTS.ACCOUNTS_KEY] as AccountsRecord | undefined;
  const activeId = String(result[NEURAI_CONSTANTS.ACTIVE_ACCOUNT_KEY] || '1');
  const activeWallet = accounts && accounts[activeId] ? accounts[activeId] : null;
  walletData = activeWallet || (result[NEURAI_CONSTANTS.STORAGE_KEY] as WalletData | null) || null;
}

async function loadWalletSettings(): Promise<void> {
  const result = await chrome.storage.local.get(NEURAI_CONSTANTS.SETTINGS_KEY);
  const stored = result[NEURAI_CONSTANTS.SETTINGS_KEY] as Partial<WalletSettings> | undefined;
  walletSettings = {
    ...NEURAI_CONSTANTS.DEFAULT_SETTINGS,
    ...(stored || {})
  };
}

async function loadSessionPinCache(): Promise<void> {
  if (!chrome.storage.session) {
    sessionPinCache = '';
    return;
  }
  const result = await chrome.storage.session.get(NEURAI_CONSTANTS.SESSION_PIN_KEY);
  sessionPinCache = String(result[NEURAI_CONSTANTS.SESSION_PIN_KEY] || '');
}

async function persistSessionPinCache(pin: string): Promise<void> {
  sessionPinCache = String(pin || '');
  if (!chrome.storage.session) return;
  if (sessionPinCache) {
    await chrome.storage.session.set({ [NEURAI_CONSTANTS.SESSION_PIN_KEY]: sessionPinCache });
  } else {
    await chrome.storage.session.remove(NEURAI_CONSTANTS.SESSION_PIN_KEY);
  }
}

async function syncActiveWalletIdentity(address: string, publicKey?: string): Promise<void> {
  if (!walletData) return;

  let changed = false;
  if (walletData.address !== address) {
    walletData.address = address;
    changed = true;
  }
  if (publicKey && walletData.publicKey !== publicKey) {
    walletData.publicKey = publicKey;
    changed = true;
  }
  if (!changed) return;

  const updates: Record<string, unknown> = {
    [NEURAI_CONSTANTS.STORAGE_KEY]: { ...walletData }
  };

  const result = await chrome.storage.local.get([
    NEURAI_CONSTANTS.ACCOUNTS_KEY,
    NEURAI_CONSTANTS.ACTIVE_ACCOUNT_KEY
  ]);
  const accounts = result[NEURAI_CONSTANTS.ACCOUNTS_KEY] as AccountsRecord | undefined;
  const activeId = result[NEURAI_CONSTANTS.ACTIVE_ACCOUNT_KEY] as string | undefined;

  if (accounts && activeId && accounts[activeId]) {
    updates[NEURAI_CONSTANTS.ACCOUNTS_KEY] = {
      ...accounts,
      [activeId]: {
        ...accounts[activeId],
        address: walletData.address,
        publicKey: walletData.publicKey
      }
    };
  }

  await chrome.storage.local.set(updates);
}

async function getUnlockUntil(): Promise<number> {
  const result = await chrome.storage.local.get(NEURAI_CONSTANTS.UNLOCK_UNTIL_KEY);
  return Number(result[NEURAI_CONSTANTS.UNLOCK_UNTIL_KEY] || 0);
}

async function setUnlockForConfiguredTimeout(): Promise<void> {
  const minutes = NEURAI_UTILS.normalizeLockTimeoutMinutes(walletSettings.lockTimeoutMinutes);
  const unlockUntil = Date.now() + minutes * 60 * 1000;
  await chrome.storage.local.set({ [NEURAI_CONSTANTS.UNLOCK_UNTIL_KEY]: unlockUntil });
}

async function isUnlockedForSensitiveActions(): Promise<boolean> {
  if (!walletSettings.pinHash) return true;
  const unlockUntil = await getUnlockUntil();
  return unlockUntil > Date.now();
}

// ── Polling ───────────────────────────────────────────────────────────────────

function startPolling(): void {
  if (pollingInterval) clearInterval(pollingInterval);

  pollingInterval = setInterval(async () => {
    if (walletData && walletData.address) {
      try {
        const balance = await fetchBalance(walletData.address, walletData.network);
        chrome.runtime.sendMessage({ type: NEURAI_CONSTANTS.MSG.BALANCE_UPDATE, balance }).catch(() => { });
      } catch (error) {
        console.error('Background polling error:', error);
      }
    }
  }, NEURAI_CONSTANTS.POLLING_INTERVAL_MS);
}

function stopPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

async function fetchBalance(address: string, network: WalletNetwork | string = 'xna'): Promise<string> {
  const rpcUrl = getRpcUrl(network);
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '1.0',
      id: 'neurai-wallet-bg',
      method: 'getaddressbalance',
      params: [{ addresses: [address] }, false]
    })
  });
  const data = await response.json() as { result: { balance: number }; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  return (data.result.balance / 1e8).toFixed(8);
}

// ── Message routing ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  handleMessage(message as BackgroundMessage, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'hw-sign-keepalive') return;
  keepAlivePorts.add(port);
  port.onDisconnect.addListener(() => {
    keepAlivePorts.delete(port);
  });
  port.onMessage.addListener(() => {
    // Intentionally empty. Receiving messages on this port helps keep the
    // service worker alive while the HW signing window is open.
  });
});

async function handleMessage(
  message: BackgroundMessage,
  sender: chrome.runtime.MessageSender
): Promise<BackgroundResponse> {
  const { MSG } = NEURAI_CONSTANTS;

  switch (message.type) {

    case MSG.GET_WALLET_INFO:
      await loadWalletData();
      return {
        hasWallet: !!(walletData && walletData.address),
        address: walletData?.address || null,
        publicKey: walletData?.publicKey || null,
        walletType: walletData?.walletType || 'software',
        network: walletData?.network || 'xna'
      };

    case MSG.SIGN_MESSAGE:
      return signMessageForPage(message.message, sender);

    case MSG.SIGN_RAW_TX:
      return signRawTxForPage(message.txHex, message.utxos, message.sighashType, sender);

    case MSG.SET_SESSION_PIN:
      await persistSessionPinCache(message.pin || '');
      return { success: true };

    case MSG.CLEAR_SESSION_PIN:
      await persistSessionPinCache('');
      return { success: true };

    case MSG.GET_SESSION_PIN:
      return { success: true, pin: sessionPinCache || '' };

    case MSG.GET_SIGN_REQUEST: {
      const pending = pendingSignRequests.get(message.requestId);
      if (!pending) return { error: 'Sign request not found or expired' };
      return { success: true, request: pending.payload, pinRequired: !!walletSettings.pinHash };
    }

    case MSG.HW_GET_SIGN_REQUEST: {
      const pending = pendingHwSignRequests.get(message.requestId);
      if (!pending) return { error: 'Hardware sign request not found or expired' };
      return { success: true, request: pending.payload };
    }

    case MSG.HW_CONNECTION_STATUS:
      return queryHardwareConnectionStatus();

    case MSG.SIGN_REQUEST_DECISION:
      return resolveSignRequestDecision(message);

    case MSG.HW_SIGN_RESULT:
      return resolveHwSignResult(message);

    case MSG.HW_EXECUTE_SIGN_REQUEST:
      return executePendingHwSignRequest(message.requestId);

    case MSG.VERIFY_OWNERSHIP:
      return verifyOwnership(message.address, message.message, message.signature);

    case MSG.WALLET_UPDATED:
      await loadWalletData();
      walletData && walletData.address ? startPolling() : stopPolling();
      return { success: true };

    case MSG.SETTINGS_UPDATED:
      await loadWalletSettings();
      return { success: true };

    default:
      return { error: 'Unknown message type: ' + (message as { type: string }).type };
  }
}

// ── Signing ───────────────────────────────────────────────────────────────────

async function signMessageForPage(
  messageText: string,
  sender: chrome.runtime.MessageSender
): Promise<BackgroundResponse> {
  await loadWalletData();
  await loadWalletSettings();

  if (isHardwareWallet(walletData)) {
    return requestHardwareSignature({
      type: 'message',
      message: messageText,
      address: walletData.address,
      network: walletData.network || 'xna',
      origin: sender?.url ? new URL(sender.url).origin : 'Unknown site'
    });
  }
  const network = walletData?.network || 'xna';
  if (!isPQNetwork(network)) {
    if (!walletData?.privateKey && !walletData?.privateKeyEnc) return { error: 'No wallet configured' };
  } else {
    if (!walletData?.seedKey && !walletData?.seedKeyEnc &&
        !walletData?.mnemonicEnc && !walletData?.mnemonic) {
      return { error: 'No AuthScript PQ wallet configured' };
    }
  }
  if (!walletData!.address) return { error: 'No address available' };

  try {
    const approvalAddress = isPQNetwork(network)
      ? getAuthScriptPQApprovalAddress(walletData!, network)
      : walletData!.address;

    const approval = await requestSignatureApproval({
      signType: 'message',
      origin: sender?.url ? new URL(sender.url).origin : 'Unknown site',
      message: messageText,
      address: approvalAddress,
      network
    });

    if (!approval?.approved) {
      return { error: approval?.error || 'User rejected signature request' };
    }

    let signature: string;
    let signingAddress = walletData!.address;

    if (isPQNetwork(network)) {
      // AuthScript PQ signing: re-derive ML-DSA-44 keypair from mnemonic
      const pin = approval.pin || '';
      let mnemonic: string | null = walletData!.mnemonic || null;
      if (!mnemonic && walletData!.mnemonicEnc) {
        if (!walletSettings.pinHash) return { error: 'Wallet key is encrypted but PIN is not configured' };
        if (!pin) return { error: 'PIN is required to decrypt wallet key' };
        mnemonic = await NEURAI_UTILS.decryptTextWithPin(walletData!.mnemonicEnc, pin);
      }
      if (!mnemonic) return { error: 'Unable to access wallet mnemonic for AuthScript PQ signing' };

      let passphrase = '';
      if (walletData!.passphraseEnc) {
        passphrase = await NEURAI_UTILS.decryptTextWithPin(walletData!.passphraseEnc, pin) || '';
      }

      const pqAddr = NeuraiKey.getPQAddress(network, mnemonic, 0, 0, passphrase || undefined);
      const pqPrivKeyBytes = hexToBufferLike(pqAddr.privateKey);
      const pqPubKeyBytes = hexToBufferLike(pqAddr.publicKey);
      signature = NeuraiMessage.signPQMessage(messageText, pqPrivKeyBytes, pqPubKeyBytes);
      signingAddress = pqAddr.address;

      if (walletData!.address !== pqAddr.address || walletData!.publicKey !== pqAddr.publicKey) {
        console.warn('[AuthScript PQ] wallet identity mismatch', {
          storedAddress: walletData!.address,
          storedPublicKey: walletData!.publicKey || null,
          derivedAddress: pqAddr.address,
          derivedPublicKey: pqAddr.publicKey,
          network,
        });
        await syncActiveWalletIdentity(pqAddr.address, pqAddr.publicKey);
      }
    } else if (isLegacySigningNetwork(network)) {
      // Legacy ECDSA signing
      let privateKeyWif: string | null = walletData!.privateKey || null;
      if (!privateKeyWif && walletData!.privateKeyEnc) {
        if (!walletSettings.pinHash) return { error: 'Wallet key is encrypted but PIN is not configured' };
        if (!approval.pin) return { error: 'PIN is required to decrypt wallet key' };
        privateKeyWif = await NEURAI_UTILS.decryptTextWithPin(walletData!.privateKeyEnc, approval.pin);
      }
      if (!privateKeyWif) return { error: 'Unable to access wallet private key' };

      const addrData = NeuraiKey.getAddressByWIF(network, privateKeyWif);
      const privateKeyBuffer = hexToBufferLike(addrData.privateKey);
      signature = NeuraiMessage.sign(messageText, privateKeyBuffer, true) as string;
    } else {
      return { error: `Unsupported wallet network: ${network}` };
    }

    // Save to history
    try {
      const accountsResult = await chrome.storage.local.get(NEURAI_CONSTANTS.ACCOUNTS_KEY);
      const activeResult = await chrome.storage.local.get(NEURAI_CONSTANTS.ACTIVE_ACCOUNT_KEY);
      const accountsObj = (accountsResult[NEURAI_CONSTANTS.ACCOUNTS_KEY] as AccountsRecord) || {};
      const activeId = activeResult[NEURAI_CONSTANTS.ACTIVE_ACCOUNT_KEY] as string | undefined;

      if (activeId && accountsObj[activeId]) {
        if (!Array.isArray(accountsObj[activeId].history)) {
          accountsObj[activeId].history = [];
        }

        const reqOrigin = sender?.url ? new URL(sender.url).origin : (sender?.origin || 'Unknown site');

        accountsObj[activeId].history!.unshift({
          type: 'message',
          timestamp: Date.now(),
          origin: reqOrigin,
          message: messageText,
          signature
        });

        // Keep max 50 items
        if (accountsObj[activeId].history!.length > 50) {
          accountsObj[activeId].history = accountsObj[activeId].history!.slice(0, 50);
        }

        await chrome.storage.local.set({ [NEURAI_CONSTANTS.ACCOUNTS_KEY]: accountsObj });
      }
    } catch (err) {
      console.error('Failed to save signature history:', err);
    }

    return { success: true, signature, address: signingAddress };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

// ── Raw Transaction Signing ───────────────────────────────────────────────────

/**
 * Sign a raw transaction on behalf of the page.
 *
 * Signing is performed **locally** via `@neuraiproject/neurai-sign-transaction`
 * (no WIF ever leaves the extension). The RPC node is used only for prevout
 * resolution and broadcast, not for signing.
 *
 * Sighash support (current version): only `SIGHASH_ALL`. Requests with any
 * other `sighashType` are rejected with `UnsupportedSighashError` up front;
 * the addon never silently signs with a different sighash than requested.
 *
 * Returned `complete`: true iff every input carries non-empty scriptSig or
 * witness (present, not validated). See `src/shared/completeness.ts`.
 *
 * @param txHex - The raw transaction hex to sign.
 * @param utxos - [{txid, vout, scriptPubKey, amount}] for inputs the caller
 *                wants this wallet to sign. Inputs without a matching UTXO
 *                entry are skipped (and any pre-filled scriptSig preserved).
 * @param sighashType - Must be 'ALL' in the current version.
 */
async function signRawTxForPage(
  txHex: string,
  utxos: Utxo[],
  sighashType: string,
  sender: chrome.runtime.MessageSender
): Promise<BackgroundResponse> {
  await loadWalletData();
  await loadWalletSettings();

  const network = walletData?.network || 'xna';
  const walletKind: WalletSigningKind = isHardwareWallet(walletData)
    ? 'hardware'
    : isPQNetwork(network)
    ? 'pq'
    : 'legacy';

  // Early rejection of unsupported sighashType — contract §2.2 of
  // plan-adaptacion-addon-sign-v2.md.
  try {
    assertSighashSupported(sighashType || 'ALL', walletKind);
  } catch (err) {
    if (err instanceof UnsupportedSighashError) return { error: err.message };
    throw err;
  }
  const sighash = sighashType || 'ALL';

  if (isHardwareWallet(walletData)) {
    return requestHardwareSignature({
      type: 'raw_tx',
      txHex,
      utxos: utxos || [],
      sighashType: sighash,
      address: walletData.address,
      publicKey: walletData.publicKey,
      network: walletData.network || 'xna',
      masterFingerprint: walletData.hardwareMasterFingerprint || null,
      derivationPath: walletData.hardwareDerivationPath || null,
      origin: sender?.url ? new URL(sender.url).origin : 'Unknown site'
    });
  }

  if (walletKind === 'legacy') {
    if (!walletData?.privateKey && !walletData?.privateKeyEnc) return { error: 'No wallet configured' };
  } else {
    if (!walletData?.seedKey && !walletData?.seedKeyEnc &&
        !walletData?.mnemonicEnc && !walletData?.mnemonic) {
      return { error: 'No AuthScript PQ wallet configured' };
    }
  }
  if (!walletData!.address) return { error: 'No address available' };

  const origin = sender?.url ? new URL(sender.url).origin : 'Unknown site';

  // Detect covenant-cancel hint on any input. If found on input[i], parse
  // the covenant prevout + refund layout and switch the approval popup to
  // the dedicated `covenant_cancel` template. Any other inputs in the tx
  // are still signed normally (for an XNA fee input, for example).
  const hintedUtxo = (utxos || []).find((u) => u && u.bareScriptHint);
  let cancelData: CancelApprovalData | null = null;
  if (hintedUtxo) {
    try {
      cancelData = await buildCancelApproval(hintedUtxo, txHex, network);
    } catch (err) {
      return { error: (err as Error).message };
    }
  }

  const approval = await requestSignatureApproval(
    cancelData
      ? {
          signType: 'covenant_cancel',
          origin,
          message:
            'Approve this cancellation to retrieve the asset from your still-open partial-fill sell order. The tokens return to your wallet and the order is closed on-chain.',
          address: walletData!.address,
          network,
          sighashType: sighash,
          inputCount: (utxos || []).length,
          txHex,
          utxos: utxos || [],
          cancelData,
        }
      : {
          signType: 'raw_tx',
          origin,
          message:
            'WARNING: This operation signs a raw transaction with your private key.\nOnly approve if you initiated this action from the Neurai Swap marketplace.',
          address: walletData!.address,
          network,
          sighashType: sighash,
          inputCount: (utxos || []).length,
          txHex,
          utxos: utxos || [],
        }
  );

  if (!approval?.approved) {
    return { error: approval?.error || 'User rejected raw transaction signing' };
  }

  try {
    let privateKeys;
    try {
      privateKeys = await resolvePrivateKeysForSigning(
        walletData!,
        walletSettings,
        network as WalletNetwork,
        walletKind as 'legacy' | 'pq',
        approval.pin || null
      );
    } catch (err) {
      return { error: (err as Error).message };
    }

    // Translate UTXOs to the library's expected shape. Single-address scope:
    // every UTXO is assumed to belong to the active wallet's address
    // (see plan-adaptacion-addon-sign-v2.md §1.5). `bareScriptHint` is
    // forwarded verbatim so the library dispatches to its covenant-cancel
    // branch instead of rejecting the prevout.
    const signTxUtxos = (utxos || []).map((u) => ({
      address: walletData!.address,
      assetName: 'XNA',
      txid: u.txid,
      outputIndex: u.vout,
      script: u.scriptPubKey,
      satoshis: Math.round(u.amount * 1e8),
      value: Math.round(u.amount * 1e8),
      ...(u.bareScriptHint ? { bareScriptHint: u.bareScriptHint } : {}),
    }));

    const signedHex: string = NeuraiSignTransaction.sign(
      network,
      txHex,
      signTxUtxos,
      privateKeys
    );
    const complete: boolean = isTxComplete(signedHex);

    // Save to history
    try {
      const accountsResult = await chrome.storage.local.get(NEURAI_CONSTANTS.ACCOUNTS_KEY);
      const activeResult = await chrome.storage.local.get(NEURAI_CONSTANTS.ACTIVE_ACCOUNT_KEY);
      const accountsObj = (accountsResult[NEURAI_CONSTANTS.ACCOUNTS_KEY] as AccountsRecord) || {};
      const activeId = activeResult[NEURAI_CONSTANTS.ACTIVE_ACCOUNT_KEY] as string | undefined;

      if (activeId && accountsObj[activeId]) {
        if (!Array.isArray(accountsObj[activeId].history)) {
          accountsObj[activeId].history = [];
        }
        accountsObj[activeId].history!.unshift({
          type: 'raw_tx',
          timestamp: Date.now(),
          origin,
          sighashType: sighash,
          inputCount: (utxos || []).length,
          txHex,
          signedTxHex: signedHex,
          complete,
        });
        if (accountsObj[activeId].history!.length > 50) {
          accountsObj[activeId].history = accountsObj[activeId].history!.slice(0, 50);
        }
        await chrome.storage.local.set({ [NEURAI_CONSTANTS.ACCOUNTS_KEY]: accountsObj });
      }
    } catch (err) {
      console.error('Failed to save raw tx history:', err);
    }

    return {
      success: true,
      signedTxHex: signedHex,
      complete,
    };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

/**
 * Parse a covenant-cancel UTXO + its spending tx's output layout and build
 * the data shown in the dedicated approval popup. Rejects upfront (throws)
 * when the prevout is not asset-wrapped, is not AuthScript v1, or the
 * hint's `covenantScriptHex` is not a valid partial-fill covenant.
 *
 * v3 architecture note (neurai-sign-transaction@2.0.0): covenant UTXOs
 * on-chain are `OP_1 0x20 <commitment> OP_XNA_ASSET ...`, NOT a bare
 * covenant followed by the asset wrapper — consensus `IsAssetScript`
 * rejects the latter shape. The covenant bytes live in the spend witness
 * as the AuthScript-NOAUTH witness script, and the DEX (which built the
 * covenant) supplies them to us via `hint.covenantScriptHex`.
 *
 * Validation done here:
 *   - split asset wrapper → reject on failure
 *   - prefix must be a 34-byte AuthScript v1 program → reject
 *   - parse `hint.covenantScriptHex` with the matching partial-fill parser → reject on failure
 *   - layout(output[0]) check → "labeled" if matches, "breakdown" if not
 *   - refund address decode → null on unknown shape (popup shows hex)
 *
 * Commitment + key-match validation are intentionally delegated to the
 * signing library: it computes `taggedHash("NeuraiAuthScript", 0x01 ||
 * 0x00 || SHA256(covenantScriptHex))` and compares to the prevout's
 * program before signing, and rejects with a clear error on mismatch.
 * Duplicating that here would require re-implementing tagged hash + the
 * PKH/commitment key derivation in the addon.
 */
async function buildCancelApproval(
  utxo: Utxo,
  txHex: string,
  network: WalletNetwork | string
): Promise<CancelApprovalData> {
  const hint = utxo.bareScriptHint;
  if (!hint) {
    throw new Error('buildCancelApproval called on a utxo without bareScriptHint');
  }

  const scripts = globalThis.NeuraiScripts;
  if (!scripts || typeof scripts.splitAssetWrappedScriptPubKey !== 'function') {
    throw new Error(
      'NeuraiScripts global not loaded — the covenant-cancel flow requires lib/NeuraiScripts.js'
    );
  }

  const split = scripts.splitAssetWrappedScriptPubKey(utxo.scriptPubKey);
  if (!split.assetTransfer) {
    throw new Error(
      `covenant-cancel prevout ${utxo.txid}:${utxo.vout} is not asset-wrapped`
    );
  }
  // Prefix must be a 34-byte AuthScript v1 program (`OP_1 0x20 <32>`).
  // Consensus only accepts this shape or a 25-byte P2PKH before an asset
  // wrapper; a covenant UTXO must be the former.
  if (split.prefixHex.length !== 68 || split.prefixHex.slice(0, 4) !== '5120') {
    throw new Error(
      `covenant-cancel prevout ${utxo.txid}:${utxo.vout} is not AuthScript v1 wrapped ` +
        `(prefix ${split.prefixHex.slice(0, 10)}…)`
    );
  }

  let variant: 'legacy' | 'pq';
  let tokenId: string;
  let unitPriceSats: bigint;
  let sellerIdentifier: string;
  let txHashSelector: number | undefined;

  if (hint.kind === 'covenant-cancel-legacy') {
    let parsed: NeuraiScriptsParsedPartialFillOrder;
    try {
      parsed = scripts.parsePartialFillScript(hint.covenantScriptHex);
    } catch (err) {
      throw new Error(
        `covenant-cancel-legacy covenantScriptHex is not a valid legacy partial-fill covenant: ${(err as Error).message}`
      );
    }
    variant = 'legacy';
    tokenId = parsed.tokenId;
    unitPriceSats = parsed.unitPriceSats;
    sellerIdentifier = Array.from(parsed.sellerPubKeyHash)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } else {
    let parsed: NeuraiScriptsParsedPartialFillOrderPQ;
    try {
      parsed = scripts.parsePartialFillScriptPQ(hint.covenantScriptHex);
    } catch (err) {
      throw new Error(
        `covenant-cancel-pq covenantScriptHex is not a valid PQ partial-fill covenant: ${(err as Error).message}`
      );
    }
    variant = 'pq';
    tokenId = parsed.tokenId;
    unitPriceSats = parsed.unitPriceSats;
    txHashSelector = parsed.txHashSelector;
    sellerIdentifier = Array.from(parsed.pubKeyCommitment)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Parse the tx outputs and classify the refund layout.
  const parsedOutputs = parseRawTransactionOutputs(txHex);
  const refund = await classifyRefundLayout(
    parsedOutputs,
    tokenId,
    split.assetTransfer.amountRaw,
    network
  );

  return {
    variant,
    covenantTxid: utxo.txid,
    covenantVout: utxo.vout,
    covenantScriptHex: utxo.scriptPubKey,
    tokenId,
    unitPriceSats: unitPriceSats.toString(),
    assetName: split.assetTransfer.assetName,
    amountRaw: split.assetTransfer.amountRaw.toString(),
    sellerIdentifier,
    ...(txHashSelector !== undefined ? { txHashSelector } : {}),
    refund,
  };
}

async function classifyRefundLayout(
  outputs: Array<{ value: bigint; scriptHex: string }>,
  expectedTokenId: string,
  expectedAmountRaw: bigint,
  network: WalletNetwork | string
): Promise<CancelRefundSummary> {
  const scripts = globalThis.NeuraiScripts;
  if (outputs.length === 0) {
    return { mode: 'breakdown', outputs: [], reason: 'transaction has no outputs' };
  }

  const first = outputs[0];
  let firstSplit;
  try {
    firstSplit = scripts.splitAssetWrappedScriptPubKey(first.scriptHex);
  } catch (err) {
    return await renderBreakdown(outputs, network, `output[0] is malformed: ${(err as Error).message}`);
  }

  if (!firstSplit.assetTransfer) {
    return await renderBreakdown(outputs, network, 'output[0] is not asset-wrapped');
  }
  if (firstSplit.assetTransfer.assetName !== expectedTokenId) {
    return await renderBreakdown(
      outputs,
      network,
      `output[0] asset ${firstSplit.assetTransfer.assetName} does not match covenant tokenId ${expectedTokenId}`
    );
  }
  if (firstSplit.assetTransfer.amountRaw !== expectedAmountRaw) {
    return await renderBreakdown(
      outputs,
      network,
      `output[0] amount ${firstSplit.assetTransfer.amountRaw} does not match remanente ${expectedAmountRaw}`
    );
  }

  const refundAddress = await decodePrefixAddress(firstSplit.prefixHex, network);
  return {
    mode: 'labeled',
    refundAddress,
    refundScriptHex: firstSplit.prefixHex,
    refundAssetName: firstSplit.assetTransfer.assetName,
    refundAmountRaw: firstSplit.assetTransfer.amountRaw.toString(),
  };
}

async function renderBreakdown(
  outputs: Array<{ value: bigint; scriptHex: string }>,
  network: WalletNetwork | string,
  reason: string
): Promise<CancelRefundSummary> {
  const scripts = globalThis.NeuraiScripts;
  const summaries: CancelOutputSummary[] = [];
  for (let i = 0; i < outputs.length; i += 1) {
    const out = outputs[i];
    let prefixHex = out.scriptHex;
    let asset: CancelOutputSummary['asset'] = null;
    try {
      const s = scripts.splitAssetWrappedScriptPubKey(out.scriptHex);
      prefixHex = s.prefixHex;
      if (s.assetTransfer) {
        asset = {
          name: s.assetTransfer.assetName,
          amountRaw: s.assetTransfer.amountRaw.toString(),
        };
      }
    } catch {
      // Keep scriptHex as-is; no asset info.
    }
    const addr = await decodePrefixAddress(prefixHex, network);
    summaries.push({
      index: i,
      valueSats: Number(out.value),
      scriptHex: out.scriptHex,
      address: addr,
      asset,
    });
  }
  return { mode: 'breakdown', outputs: summaries, reason };
}

async function requestSignatureApproval(payload: SignApprovalPayload): Promise<SignApprovalResult> {
  const requestId = 'sign_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const approvalUrl = chrome.runtime.getURL('popup/sign-request.html') +
    '?requestId=' + encodeURIComponent(requestId);

  return new Promise<SignApprovalResult>((resolve) => {
    const timeout = setTimeout(() => {
      pendingSignRequests.delete(requestId);
      resolve({ approved: false, error: 'Signature request timed out' });
    }, 120000);

    pendingSignRequests.set(requestId, { payload, resolve, timeout, windowId: null });

    chrome.windows.create({ url: approvalUrl, type: 'popup', width: 500, height: 680 }, (win) => {
      const pending = pendingSignRequests.get(requestId);
      if (pending) pending.windowId = win?.id || null;
    });
  });
}

async function resolveSignRequestDecision(message: SignRequestDecisionMsg): Promise<BackgroundResponse> {
  const pending = pendingSignRequests.get(message.requestId);
  if (!pending) return { error: 'Sign request not found or expired' };

  if (!message.approved) {
    finalizeSignRequest(message.requestId, { approved: false, error: 'User rejected signature request' });
    return { success: true };
  }

  if (walletSettings.pinHash) {
    const enteredPin = String(message.pin || '').trim();
    if (!enteredPin) return { error: 'PIN is required' };
    const enteredHash = await NEURAI_UTILS.hashText(enteredPin);
    if (enteredHash !== walletSettings.pinHash) return { error: 'Invalid PIN' };
    await setUnlockForConfiguredTimeout();
    finalizeSignRequest(message.requestId, { approved: true, pin: enteredPin });
    return { success: true };
  } else {
    if (!(await isUnlockedForSensitiveActions())) return { error: 'Wallet is locked' };
    finalizeSignRequest(message.requestId, { approved: true });
    return { success: true };
  }
}

function finalizeSignRequest(requestId: string, result: SignApprovalResult): void {
  const pending = pendingSignRequests.get(requestId);
  if (!pending) return;
  clearTimeout(pending.timeout);
  pendingSignRequests.delete(requestId);
  if (pending.windowId) chrome.windows.remove(pending.windowId).catch(() => { });
  pending.resolve(result);
}

// ── Hardware wallet signing coordination ──────────────────────────────────────

async function requestHardwareSignature(payload: HwSignPayload): Promise<HwSignResult> {
  const requestId = 'hw_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const approvalUrl = chrome.runtime.getURL('popup/hw-sign.html') +
    '?requestId=' + encodeURIComponent(requestId);

  return new Promise<HwSignResult>((resolve) => {
    const timeout = setTimeout(() => {
      pendingHwSignRequests.delete(requestId);
      resolve({ error: 'Hardware signing request timed out' });
    }, 180000);

    pendingHwSignRequests.set(requestId, {
      payload,
      resolve,
      timeout,
      windowId: null,
      settling: false,
      lastError: 'Hardware wallet is not connected'
    });

    chrome.windows.create({ url: approvalUrl, type: 'popup', width: 460, height: 720 }, (win) => {
      const pending = pendingHwSignRequests.get(requestId);
      if (pending) pending.windowId = win?.id || null;
    });
  });
}

async function executeHardwareSignature(payload: HwSignPayload): Promise<HwSignResult> {
  const msgType = payload.type === 'message'
    ? NEURAI_CONSTANTS.MSG.HW_SIGN_MESSAGE
    : NEURAI_CONSTANTS.MSG.HW_SIGN_RAW_TX;

  try {
    const result = await chrome.runtime.sendMessage({
      type: msgType,
      message: payload.message,
      txHex: payload.txHex,
      utxos: payload.utxos,
      sighashType: payload.sighashType,
      address: payload.address,
      publicKey: payload.publicKey,
      masterFingerprint: payload.masterFingerprint,
      derivationPath: payload.derivationPath,
      network: payload.network
    }) as HwSignResult | null;

    if (!result || (result as { error?: string }).error) {
      return { error: (result as { error?: string })?.error || 'Hardware wallet is not connected. Open the full wallet view and reconnect your device.' };
    }

    return result;
  } catch (_) {
    return { error: 'Hardware wallet is not connected. Open the full wallet view and reconnect your device.' };
  }
}

async function queryHardwareConnectionStatus(): Promise<BackgroundResponse> {
  try {
    const result = await chrome.runtime.sendMessage({ type: 'HW_CONNECTION_STATUS_PAGE' }) as { connected?: boolean } | null;
    if (result && typeof result.connected === 'boolean') return { success: true, connected: result.connected };
  } catch (_) { }
  return { success: true, connected: false };
}

async function executePendingHwSignRequest(requestId: string): Promise<BackgroundResponse> {
  const pending = pendingHwSignRequests.get(requestId);
  if (!pending) return { error: 'Hardware sign request not found or expired' };

  const result = await executeHardwareSignature(pending.payload);
  if (!result || (result as { error?: string }).error) {
    pending.lastError = (result as { error?: string })?.error || 'Unable to sign with the connected hardware wallet.';
    return { error: pending.lastError };
  }

  finalizeHwSignRequest(requestId, result);
  saveHwSignHistory(result as HwSignSuccess, pending.payload).catch((err) => {
    console.error('Failed to save HW sign history:', err);
  });
  return { success: true };
}

async function saveHwSignHistory(result: HwSignSuccess, payload: HwSignPayload): Promise<void> {
  try {
    const accountsResult = await chrome.storage.local.get(NEURAI_CONSTANTS.ACCOUNTS_KEY);
    const activeResult = await chrome.storage.local.get(NEURAI_CONSTANTS.ACTIVE_ACCOUNT_KEY);
    const accountsObj = (accountsResult[NEURAI_CONSTANTS.ACCOUNTS_KEY] as AccountsRecord) || {};
    const activeId = activeResult[NEURAI_CONSTANTS.ACTIVE_ACCOUNT_KEY] as string | undefined;

    if (activeId && accountsObj[activeId]) {
      if (!Array.isArray(accountsObj[activeId].history)) {
        accountsObj[activeId].history = [];
      }
      const entry = payload.type === 'message'
        ? {
            type: 'message' as const,
            timestamp: Date.now(),
            origin: payload.origin,
            message: payload.message ?? '',
            signature: (result as HwMessageSignResult).signature
          }
        : {
            type: 'raw_tx' as const,
            timestamp: Date.now(),
            origin: payload.origin,
            sighashType: payload.sighashType ?? 'ALL',
            inputCount: (payload.utxos || []).length,
            signedTxHex: (result as HwRawTxSignResult).signedTxHex,
            complete: (result as HwRawTxSignResult).complete
          };
      accountsObj[activeId].history!.unshift(entry);
      if (accountsObj[activeId].history!.length > 50) {
        accountsObj[activeId].history = accountsObj[activeId].history!.slice(0, 50);
      }
      await chrome.storage.local.set({ [NEURAI_CONSTANTS.ACCOUNTS_KEY]: accountsObj });
    }
  } catch (err) {
    console.error('Failed to save HW sign history:', err);
  }
}

async function resolveHwSignResult(message: HwSignResultMsg): Promise<BackgroundResponse> {
  const pending = pendingHwSignRequests.get(message.requestId);
  if (!pending) return { error: 'Hardware sign request not found or expired' };
  pending.settling = true;

  const result: HwSignResult = message.error
    ? { error: message.error }
    : {
        success: true,
        signature: message.signature,
        address: message.address,
        signedTxHex: message.signedTxHex,
        complete: message.complete
      } as HwSignSuccess;

  finalizeHwSignRequest(message.requestId, result);

  if (!message.error) {
    saveHwSignHistory(result as HwSignSuccess, pending.payload).catch((err) => {
      console.error('Failed to save HW sign history:', err);
    });
  }

  return { success: true };
}

function finalizeHwSignRequest(requestId: string, result: HwSignResult): void {
  const pending = pendingHwSignRequests.get(requestId);
  if (!pending) return;
  clearTimeout(pending.timeout);
  pendingHwSignRequests.delete(requestId);
  if (pending.windowId) chrome.windows.remove(pending.windowId).catch(() => { });
  pending.resolve(result);
}

// ── Verification ──────────────────────────────────────────────────────────────

async function verifyOwnership(address: string, message: string, signature: string): Promise<BackgroundResponse> {
  try {
    // NeuraiMessage is declared as a global via ambient .d.ts; the typeof guard
    // is a runtime safety check in case the bundle didn't load.
    if (typeof NeuraiMessage !== 'undefined') {
      return { valid: !!NeuraiMessage.verifyMessage(message, address, signature) };
    }
  } catch (error) {
    console.warn('Local signature verification failed, falling back to RPC:', error);
  }

  await loadWalletData();
  await loadWalletSettings();

  try {
    const response = await fetch(getRpcUrl(walletData?.network || 'xna'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '1.0',
        id: 'neurai-wallet-verify',
        method: 'verifymessage',
        params: [address, signature, message]
      })
    });
    const data = await response.json() as { result: boolean; error?: { message: string } };
    if (data.error) return { error: data.error.message || 'RPC verification error' };
    return { valid: data.result };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

// ── Storage change listener ───────────────────────────────────────────────────

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  if (changes[NEURAI_CONSTANTS.STORAGE_KEY]) {
    loadWalletData().then(() => {
      walletData && walletData.address ? startPolling() : stopPolling();
    });
  }
  if (changes[NEURAI_CONSTANTS.SETTINGS_KEY]) {
    loadWalletSettings();
  }
});

chrome.windows.onRemoved.addListener((windowId) => {
  for (const [requestId, pending] of pendingSignRequests.entries()) {
    if (pending.windowId === windowId) {
      finalizeSignRequest(requestId, { approved: false, error: 'User closed signature request' });
      break;
    }
  }
  for (const [requestId, pending] of pendingHwSignRequests.entries()) {
    if (pending.windowId === windowId) {
      if (pending.settling) continue;
      finalizeHwSignRequest(requestId, { error: 'User closed hardware signing window' });
      break;
    }
  }
});

// ── Initialization ────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  await loadWalletData();
  await loadWalletSettings();
  await loadSessionPinCache();
  if (walletData && walletData.address) startPolling();
}

chrome.runtime.onInstalled.addListener(async (details) => {
  await init();
  // Open welcome/onboarding tab on fresh install if no wallet exists
  if (details.reason === 'install' && (!walletData || !walletData.address)) {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/welcome.html') });
  }
});
chrome.runtime.onStartup.addListener(init);
init();
