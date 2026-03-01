// Neurai Wallet — Background Service Worker
// Handles balance polling, message signing approval, and RPC calls.

// Some bundled libs assume a browser window global. In service workers, alias it.
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}

// Import libraries and shared modules (service workers cannot use ES module imports)
try {
  importScripts(
    '../lib/NeuraiKey.js',
    '../lib/NeuraiMessage.js',
    '../shared/constants.js',
    '../shared/utils.js'
  );
} catch (e) {
  console.error('Failed to import scripts:', e);
}

// ── State ─────────────────────────────────────────────────────────────────────
let pollingInterval = null;
let walletData = null;
let walletSettings = { ...NEURAI_CONSTANTS.DEFAULT_SETTINGS };
const pendingSignRequests = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert a hex string to a Uint8Array marked as a Buffer (for bitcoinjs-message compat).
 */
function hexToBufferLike(hex) {
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
  bytes._isBuffer = true;
  return bytes;
}

function getRpcUrl(network = 'xna') {
  if (network === 'xna-test') {
    return walletSettings.rpcTestnet || NEURAI_CONSTANTS.RPC_URL_TESTNET;
  }
  return walletSettings.rpcMainnet || NEURAI_CONSTANTS.RPC_URL;
}

// ── Storage helpers ───────────────────────────────────────────────────────────

async function loadWalletData() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      NEURAI_CONSTANTS.STORAGE_KEY,
      NEURAI_CONSTANTS.ACCOUNTS_KEY,
      NEURAI_CONSTANTS.ACTIVE_ACCOUNT_KEY
    ], (result) => {
      const accounts = result[NEURAI_CONSTANTS.ACCOUNTS_KEY];
      const activeId = String(result[NEURAI_CONSTANTS.ACTIVE_ACCOUNT_KEY] || '1');
      const activeWallet = accounts && accounts[activeId] ? accounts[activeId] : null;
      walletData = activeWallet || result[NEURAI_CONSTANTS.STORAGE_KEY] || null;
      resolve();
    });
  });
}

async function loadWalletSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(NEURAI_CONSTANTS.SETTINGS_KEY, (result) => {
      walletSettings = {
        ...NEURAI_CONSTANTS.DEFAULT_SETTINGS,
        ...(result[NEURAI_CONSTANTS.SETTINGS_KEY] || {})
      };
      resolve();
    });
  });
}

async function getUnlockUntil() {
  return new Promise((resolve) => {
    chrome.storage.local.get(NEURAI_CONSTANTS.UNLOCK_UNTIL_KEY, (result) => {
      resolve(Number(result[NEURAI_CONSTANTS.UNLOCK_UNTIL_KEY] || 0));
    });
  });
}

async function setUnlockForConfiguredTimeout() {
  const minutes = NEURAI_UTILS.normalizeLockTimeoutMinutes(walletSettings.lockTimeoutMinutes);
  const unlockUntil = Date.now() + minutes * 60 * 1000;
  return new Promise((resolve) => {
    chrome.storage.local.set({ [NEURAI_CONSTANTS.UNLOCK_UNTIL_KEY]: unlockUntil }, resolve);
  });
}

async function isUnlockedForSensitiveActions() {
  if (!walletSettings.pinHash) return true;
  const unlockUntil = await getUnlockUntil();
  return unlockUntil > Date.now();
}

// ── Polling ───────────────────────────────────────────────────────────────────

function startPolling() {
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

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

async function fetchBalance(address, network = 'xna') {
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
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return (data.result.balance / 1e8).toFixed(8);
}

// ── Message routing ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender) {
  const { MSG } = NEURAI_CONSTANTS;

  switch (message.type) {

    case MSG.GET_WALLET_INFO:
      await loadWalletData();
      return {
        hasWallet: !!walletData,
        address: walletData?.address || null,
        publicKey: walletData?.publicKey || null,
        network: walletData?.network || 'xna'
      };

    case MSG.SIGN_MESSAGE:
      return signMessageForPage(message.message, sender);

    case MSG.GET_SIGN_REQUEST: {
      const pending = pendingSignRequests.get(message.requestId);
      if (!pending) return { error: 'Sign request not found or expired' };
      return { success: true, request: pending.payload, pinRequired: !!walletSettings.pinHash };
    }

    case MSG.SIGN_REQUEST_DECISION:
      return resolveSignRequestDecision(message);

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
      return { error: 'Unknown message type: ' + message.type };
  }
}

// ── Signing ───────────────────────────────────────────────────────────────────

async function signMessageForPage(messageText, sender) {
  await loadWalletData();
  await loadWalletSettings();

  if (!walletData?.privateKey && !walletData?.privateKeyEnc) return { error: 'No wallet configured' };
  if (!walletData.address) return { error: 'No address available' };

  try {
    const approval = await requestSignatureApproval({
      origin: sender?.url ? new URL(sender.url).origin : 'Unknown site',
      message: messageText,
      address: walletData.address,
      network: walletData.network || 'xna'
    });

    if (!approval?.approved) {
      return { error: approval?.error || 'User rejected signature request' };
    }

    let privateKeyWif = walletData.privateKey || null;
    if (!privateKeyWif && walletData.privateKeyEnc) {
      if (!walletSettings.pinHash) return { error: 'Wallet key is encrypted but PIN is not configured' };
      if (!approval.pin) return { error: 'PIN is required to decrypt wallet key' };
      privateKeyWif = await NEURAI_UTILS.decryptTextWithPin(walletData.privateKeyEnc, approval.pin);
    }
    if (!privateKeyWif) return { error: 'Unable to access wallet private key' };

    const addrData = NeuraiKey.getAddressByWIF(walletData.network || 'xna', privateKeyWif);
    const privateKeyBuffer = hexToBufferLike(addrData.privateKey);
    const signature = NeuraiMessage.sign(messageText, privateKeyBuffer, true);

    // Save to history
    try {
      const accountsObj = (await new Promise(r => chrome.storage.local.get(NEURAI_CONSTANTS.ACCOUNTS_KEY, r)))[NEURAI_CONSTANTS.ACCOUNTS_KEY] || {};
      const activeId = (await new Promise(r => chrome.storage.local.get(NEURAI_CONSTANTS.ACTIVE_ACCOUNT_KEY, r)))[NEURAI_CONSTANTS.ACTIVE_ACCOUNT_KEY];

      if (activeId && accountsObj[activeId]) {
        if (!Array.isArray(accountsObj[activeId].history)) {
          accountsObj[activeId].history = [];
        }

        const reqOrigin = sender?.url ? new URL(sender.url).origin : (sender?.origin || 'Unknown site');

        accountsObj[activeId].history.unshift({
          timestamp: Date.now(),
          origin: reqOrigin,
          message: messageText,
          signature: signature
        });

        // Keep max 50 items
        if (accountsObj[activeId].history.length > 50) {
          accountsObj[activeId].history = accountsObj[activeId].history.slice(0, 50);
        }

        await new Promise(r => chrome.storage.local.set({ [NEURAI_CONSTANTS.ACCOUNTS_KEY]: accountsObj }, r));
      }
    } catch (err) {
      console.error('Failed to save signature history:', err);
    }

    return { success: true, signature, address: walletData.address };
  } catch (error) {
    return { error: error.message };
  }
}

async function requestSignatureApproval(payload) {
  const requestId = 'sign_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const approvalUrl = chrome.runtime.getURL('popup/sign-request.html') +
    '?requestId=' + encodeURIComponent(requestId);

  return new Promise((resolve) => {
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

async function resolveSignRequestDecision(message) {
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

function finalizeSignRequest(requestId, result) {
  const pending = pendingSignRequests.get(requestId);
  if (!pending) return;
  clearTimeout(pending.timeout);
  pendingSignRequests.delete(requestId);
  if (pending.windowId) chrome.windows.remove(pending.windowId).catch(() => { });
  pending.resolve(result);
}

// ── Verification ──────────────────────────────────────────────────────────────

async function verifyOwnership(address, message, signature) {
  try {
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
    const data = await response.json();
    if (data.error) return { error: data.error.message || 'RPC verification error' };
    return { valid: data.result };
  } catch (error) {
    return { error: error.message };
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
});

// ── Initialization ────────────────────────────────────────────────────────────

async function init() {
  await loadWalletData();
  await loadWalletSettings();
  if (walletData && walletData.address) startPolling();
}

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);
init();
