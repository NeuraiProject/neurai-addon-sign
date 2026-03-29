// Neurai Wallet — Background Service Worker
// Handles balance polling, message signing approval, and RPC calls.

// Static imports are hoisted by the JS engine and do not depend on window.
import { NEURAI_CONSTANTS } from '../shared/constants.js';
import { NEURAI_UTILS } from '../shared/utils.js';
import type {
  WalletData,
  WalletSettings,
  AccountsRecord,
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

// Load UMD crypto libs lazily on first use — avoids top-level await, which causes
// "Service worker registration failed. Status code: 3" in some Chrome versions.
let _cryptoLibsLoaded = false;
async function loadCryptoLibs(): Promise<void> {
  if (_cryptoLibsLoaded) return;
  // Alias window before the UMD bundles load — their internal code assumes window exists.
  if (typeof (globalThis as Record<string, unknown>).window === 'undefined') {
    (globalThis as Record<string, unknown>).window = globalThis;
  }
  await import('../lib/NeuraiKey.js');
  await import('../lib/NeuraiMessage.js');
  _cryptoLibsLoaded = true;
}

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

function getRpcUrl(network: WalletNetwork | string = 'xna'): string {
  if (network === 'xna-test') {
    return walletSettings.rpcTestnet || NEURAI_CONSTANTS.RPC_URL_TESTNET;
  }
  return walletSettings.rpcMainnet || NEURAI_CONSTANTS.RPC_URL;
}

function isHardwareWallet(wallet: WalletData | null): wallet is WalletData & { walletType: 'hardware' } {
  return wallet?.walletType === 'hardware';
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
  if (!walletData?.privateKey && !walletData?.privateKeyEnc) return { error: 'No wallet configured' };
  if (!walletData.address) return { error: 'No address available' };

  try {
    const approval = await requestSignatureApproval({
      signType: 'message',
      origin: sender?.url ? new URL(sender.url).origin : 'Unknown site',
      message: messageText,
      address: walletData.address,
      network: walletData.network || 'xna'
    });

    if (!approval?.approved) {
      return { error: approval?.error || 'User rejected signature request' };
    }

    let privateKeyWif: string | null = walletData.privateKey || null;
    if (!privateKeyWif && walletData.privateKeyEnc) {
      if (!walletSettings.pinHash) return { error: 'Wallet key is encrypted but PIN is not configured' };
      if (!approval.pin) return { error: 'PIN is required to decrypt wallet key' };
      privateKeyWif = await NEURAI_UTILS.decryptTextWithPin(walletData.privateKeyEnc, approval.pin);
    }
    if (!privateKeyWif) return { error: 'Unable to access wallet private key' };

    await loadCryptoLibs();
    const addrData = NeuraiKey.getAddressByWIF(walletData.network || 'xna', privateKeyWif);
    const privateKeyBuffer = hexToBufferLike(addrData.privateKey);
    const signature = NeuraiMessage.sign(messageText, privateKeyBuffer, true) as string;

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

    return { success: true, signature, address: walletData.address };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

// ── Raw Transaction Signing ───────────────────────────────────────────────────

/**
 * Sign a raw transaction on behalf of the page.
 * Security note: The private key (WIF) is sent to the Neurai RPC endpoint over HTTPS.
 * The call goes to the configured RPC URL (Neurai's own infrastructure by default).
 * This is an acceptable trade-off for a self-hosted deployment; native signing
 * (without sending the key) should be implemented in a future improvement.
 *
 * @param txHex - The raw transaction hex to sign
 * @param utxos - [{txid, vout, scriptPubKey, amount}] for inputs being signed
 * @param sighashType - 'ALL', 'SINGLE|ANYONECANPAY', etc.
 */
async function signRawTxForPage(
  txHex: string,
  utxos: Utxo[],
  sighashType: string,
  sender: chrome.runtime.MessageSender
): Promise<BackgroundResponse> {
  await loadWalletData();
  await loadWalletSettings();

  if (isHardwareWallet(walletData)) {
    return requestHardwareSignature({
      type: 'raw_tx',
      txHex,
      utxos: utxos || [],
      sighashType: sighashType || 'ALL',
      address: walletData.address,
      publicKey: walletData.publicKey,
      network: walletData.network || 'xna',
      masterFingerprint: walletData.hardwareMasterFingerprint || null,
      derivationPath: walletData.hardwareDerivationPath || null,
      origin: sender?.url ? new URL(sender.url).origin : 'Unknown site'
    });
  }
  if (!walletData?.privateKey && !walletData?.privateKeyEnc) return { error: 'No wallet configured' };
  if (!walletData.address) return { error: 'No address available' };

  const origin = sender?.url ? new URL(sender.url).origin : 'Unknown site';
  const sighash = sighashType || 'ALL';

  const approval = await requestSignatureApproval({
    signType: 'raw_tx',
    origin,
    message: 'WARNING: This operation signs a raw transaction with your private key.\nOnly approve if you initiated this action from the Neurai Swap marketplace.',
    address: walletData.address,
    network: walletData.network || 'xna',
    sighashType: sighash,
    inputCount: (utxos || []).length,
    txHex,
    utxos: utxos || [],
  });

  if (!approval?.approved) {
    return { error: approval?.error || 'User rejected raw transaction signing' };
  }

  let privateKeyWif: string | null = walletData.privateKey || null;
  if (!privateKeyWif && walletData.privateKeyEnc) {
    if (!walletSettings.pinHash) return { error: 'Wallet key is encrypted but PIN is not configured' };
    if (!approval.pin) return { error: 'PIN is required to decrypt wallet key' };
    privateKeyWif = await NEURAI_UTILS.decryptTextWithPin(walletData.privateKeyEnc, approval.pin);
  }
  if (!privateKeyWif) return { error: 'Unable to access wallet private key' };

  try {
    const rpcUrl = getRpcUrl(walletData.network || 'xna');
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '1.0',
        id: 'neurai-wallet-sign-tx',
        method: 'signrawtransaction',
        params: [
          txHex,
          utxos || [],            // prevtxs: [{txid, vout, scriptPubKey, amount}]
          [privateKeyWif],        // privkeys: explicit key for signing
          sighash,                // sighashtype
        ]
      })
    });

    const data = await response.json() as {
      result: { hex: string; complete: boolean };
      error?: { message: string } | string;
    };
    if (data.error) return { error: typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error)) };

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
          signedTxHex: data.result.hex,
          complete: data.result.complete,
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
      signedTxHex: data.result.hex,
      complete: data.result.complete,
    };
  } catch (error) {
    return { error: (error as Error).message };
  }
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

    chrome.windows.create({ url: approvalUrl, type: 'popup', width: 460, height: 640 }, (win) => {
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
    await loadCryptoLibs();
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
