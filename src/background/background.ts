// Neurai Wallet — Background Service Worker
// Handles balance polling, message signing approval, and RPC calls.

import './crypto-preload.js';
import { NEURAI_CONSTANTS } from '../shared/constants.js';
import { NEURAI_UTILS } from '../shared/utils.js';
import { assertSighashSupported, UnsupportedSighashError, type WalletSigningKind } from '../shared/sighash.js';
import { isTxComplete } from '../shared/completeness.js';
import { parseRawTransactionOutputs } from '../shared/parse-raw-tx.js';
import { describeDestination, type OwnScript } from '../shared/script-to-address.js';
import { resolvePrivateKeysForSigning } from './signing-keys.js';
import {
  isPQNetwork,
  isEcdsaNetwork,
  isLegacyNetwork,
  isTestnetNetwork,
  toKeyNetwork,
  walletFamily
} from '../shared/networks.js';
import { checkedJsonRpc } from '../shared/chain-identity.js';
import { runWalletMigrations } from '../shared/migrations.js';
import { connectSignsTransactions, sameTransaction } from '../shared/neurai-connect.js';
import { walletAddressSet } from '../shared/connect-account.js';
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
  ConnectSignPayload,
  ConnectSignResultMsg,
  PendingConnectSignRequest,
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
const pendingConnectSignRequests = new Map<string, PendingConnectSignRequest>();
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
  if (isTestnetNetwork(network)) {
    return walletSettings.rpcTestnet || NEURAI_CONSTANTS.RPC_URL_TESTNET;
  }
  return walletSettings.rpcMainnet || NEURAI_CONSTANTS.RPC_URL;
}

function isHardwareWallet(wallet: WalletData | null): wallet is WalletData & { walletType: 'hardware' } {
  return wallet?.walletType === 'hardware';
}

/** NeuraiWallet (mobile) paired over Neurai Connect: it holds the key and signs. */
function isConnectWallet(wallet: WalletData | null): wallet is WalletData & { walletType: 'connect' } {
  return wallet?.walletType === 'connect';
}

function getAuthScriptPQApprovalAddress(wallet: WalletData, network: WalletNetwork | string): string {
  if (!wallet.publicKey) return wallet.address;
  try {
    return NeuraiKey.pqPublicKeyToAddress(toKeyNetwork(network) as NeuraiKeyPQNetwork, wallet.publicKey);
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
  await migrateStoredWallets();
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

let storedWalletMigration: Promise<void> | null = null;

/**
 * Bring stored accounts to the neurai-key 5 address formats (see
 * shared/migrations.ts), once per service-worker lifetime: accounts created
 * afterwards already use them. A failure must not block the wallet.
 */
function migrateStoredWallets(): Promise<void> {
  storedWalletMigration ??= runWalletMigrations({
    accounts: NEURAI_CONSTANTS.ACCOUNTS_KEY,
    activeWallet: NEURAI_CONSTANTS.STORAGE_KEY
  }).then(
    () => undefined,
    (error) => console.warn('[migrations] stored wallet migration failed', error)
  );
  return storedWalletMigration;
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
        // Every address of the account: one, or those found from a shared
        // NeuraiWallet account key (scanned by the pages, not here).
        const balance = await fetchBalance(walletAddressSet(walletData), walletData.network);
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

async function fetchBalance(addresses: string[], network: WalletNetwork | string = 'xna'): Promise<string> {
  // Refuses a node of another chain first (the testnet before its reset
  // answers like the new one), so a stale balance is never reported.
  const result = await checkedJsonRpc(
    getRpcUrl(network),
    network,
    'getaddressbalance',
    [{ addresses }, false],
    'neurai-wallet-bg'
  ) as { balance: number };
  return (result.balance / 1e8).toFixed(8);
}

// ── Message routing ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  handleMessage(message as BackgroundMessage, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'hw-sign-keepalive' && port.name !== 'connect-sign-keepalive') return;
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

    case MSG.CONNECT_GET_SIGN_REQUEST: {
      const pending = pendingConnectSignRequests.get(message.requestId);
      if (!pending) return { error: 'Neurai Connect sign request not found or expired' };
      return { success: true, request: pending.payload };
    }

    case MSG.CONNECT_SIGN_RESULT:
      return resolveConnectSignResult(message);

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

  if (isConnectWallet(walletData)) {
    if (!walletData.connectSessionTopic || !walletData.connectChainId) {
      return { error: 'This Neurai Connect account has no session. Add it again from the onboarding.' };
    }
    return requestConnectSignature({
      type: 'message',
      origin: sender?.url ? new URL(sender.url).origin : 'Unknown site',
      address: walletData.address,
      network: walletData.network || 'xna',
      message: messageText,
      sessionTopic: walletData.connectSessionTopic,
      chainId: walletData.connectChainId,
      peerName: walletData.connectPeerName || null
    });
  }

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
      return { error: 'No PQ wallet configured' };
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
      // PQ signing: re-derive the ML-DSA-44 keypair from the mnemonic.
      const pin = approval.pin || '';
      let mnemonic: string | null = walletData!.mnemonic || null;
      if (!mnemonic && walletData!.mnemonicEnc) {
        if (!walletSettings.pinHash) return { error: 'Wallet key is encrypted but PIN is not configured' };
        if (!pin) return { error: 'PIN is required to decrypt wallet key' };
        mnemonic = await NEURAI_UTILS.decryptTextWithPin(walletData!.mnemonicEnc, pin);
      }
      if (!mnemonic) return { error: 'Unable to access wallet mnemonic for PQ signing' };

      let passphrase = '';
      if (walletData!.passphraseEnc) {
        passphrase = await NEURAI_UTILS.decryptTextWithPin(walletData!.passphraseEnc, pin) || '';
      }

      const pqAddr = NeuraiKey.getPQAddress(toKeyNetwork(network) as NeuraiKeyPQNetwork, mnemonic, 0, 0, passphrase || undefined);
      const pqPrivKeyBytes = hexToBufferLike(pqAddr.privateKey);
      const pqPubKeyBytes = hexToBufferLike(pqAddr.publicKey);
      // A strict PQ v2 signature is bound to its address, like the node's
      // signmessage: without it the signature does not verify for pq1z….
      signature = NeuraiMessage.signPQMessage(messageText, pqPrivKeyBytes, pqPubKeyBytes, pqAddr.address);
      signingAddress = pqAddr.address;

      if (walletData!.address !== pqAddr.address || walletData!.publicKey !== pqAddr.publicKey) {
        console.warn('[PQ] wallet identity mismatch', {
          storedAddress: walletData!.address,
          storedPublicKey: walletData!.publicKey || null,
          derivedAddress: pqAddr.address,
          derivedPublicKey: pqAddr.publicKey,
          network,
        });
        await syncActiveWalletIdentity(pqAddr.address, pqAddr.publicKey);
      }
    } else if (isLegacyNetwork(network) || isEcdsaNetwork(network)) {
      // secp256k1 signing: Legacy P2PKH or ECDSA witness v3.
      let privateKeyWif: string | null = walletData!.privateKey || null;
      if (!privateKeyWif && walletData!.privateKeyEnc) {
        if (!walletSettings.pinHash) return { error: 'Wallet key is encrypted but PIN is not configured' };
        if (!approval.pin) return { error: 'PIN is required to decrypt wallet key' };
        privateKeyWif = await NEURAI_UTILS.decryptTextWithPin(walletData!.privateKeyEnc, approval.pin);
      }
      if (!privateKeyWif) return { error: 'Unable to access wallet private key' };

      const addrData = NeuraiKey.getAddressByWIF(toKeyNetwork(network) as NeuraiKeyNetwork, privateKeyWif);
      const privateKeyBuffer = hexToBufferLike(addrData.privateKey);
      if (isEcdsaNetwork(network)) {
        // Bound to the nq1r… address like the node's signmessage; a plain
        // Legacy signature of the same key does not verify for it.
        signature = NeuraiMessage.signECDSAWitnessMessage(messageText, privateKeyBuffer, addrData.address);
        signingAddress = addrData.address;
      } else {
        signature = NeuraiMessage.sign(messageText, privateKeyBuffer, true) as string;
      }
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

  if (isConnectWallet(walletData)) {
    // Only when the session settled signPsbt (and the account is Legacy or
    // ECDSA witness): otherwise the phone has nothing to sign it with.
    if (!connectSignsTransactions(walletData)) {
      return { error: 'This NeuraiWallet account cannot sign transactions over Neurai Connect: the wallet did not enable signPsbt for this session.' };
    }
    try {
      assertSighashSupported(sighashType || 'ALL', 'connect');
    } catch (err) {
      if (err instanceof UnsupportedSighashError) return { error: err.message };
      throw err;
    }
    if (!walletData.connectSessionTopic || !walletData.connectChainId) {
      return { error: 'This Neurai Connect account has no session. Add it again from the onboarding.' };
    }
    return requestConnectSignature({
      type: 'raw_tx',
      origin: sender?.url ? new URL(sender.url).origin : 'Unknown site',
      address: walletData.address,
      network: walletData.network || 'xna',
      message: '',
      txHex,
      utxos: utxos || [],
      sighashType: sighashType || 'ALL',
      sessionTopic: walletData.connectSessionTopic,
      chainId: walletData.connectChainId,
      peerName: walletData.connectPeerName || null
    });
  }

  const network = walletData?.network || 'xna';
  // `legacy` covers every secp256k1 wallet, ECDSA witness v3 included: the
  // key is a WIF and the library picks the template from each prevout.
  const walletKind: WalletSigningKind = isHardwareWallet(walletData)
    ? 'hardware'
    : walletFamily(network) === 'pq'
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
      return { error: 'No PQ wallet configured' };
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
      cancelData = await buildCancelApproval(hintedUtxo, txHex, network, walletData!.address);
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
      toKeyNetwork(network) as NeuraiSignTransactionNetwork,
      txHex,
      signTxUtxos,
      privateKeys,
      // The library logs every step (sighashes included) unless told not to.
      { debug: false }
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
 *   - refund address decode → the wallet's own address when the refund
 *     script is the wallet's (any family), null on other unknown shapes
 *     (popup shows hex)
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
  network: WalletNetwork | string,
  walletAddress: string
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
    network,
    walletOwnScript(walletAddress)
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

/** The wallet's scriptPubKey, for any address family; null if the address does not decode. */
function walletOwnScript(address: string): OwnScript | null {
  try {
    const { bytes } = globalThis.NeuraiScripts.encodeSellerScriptPubKey(address);
    return { address, scriptHex: globalThis.NeuraiScripts.bytesToHex(bytes) };
  } catch {
    return null;
  }
}

async function classifyRefundLayout(
  outputs: Array<{ value: bigint; scriptHex: string }>,
  expectedTokenId: string,
  expectedAmountRaw: bigint,
  network: WalletNetwork | string,
  own: OwnScript | null
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
    return await renderBreakdown(outputs, network, own, `output[0] is malformed: ${(err as Error).message}`);
  }

  if (!firstSplit.assetTransfer) {
    return await renderBreakdown(outputs, network, own, 'output[0] is not asset-wrapped');
  }
  if (firstSplit.assetTransfer.assetName !== expectedTokenId) {
    return await renderBreakdown(
      outputs,
      network,
      own,
      `output[0] asset ${firstSplit.assetTransfer.assetName} does not match covenant tokenId ${expectedTokenId}`
    );
  }
  if (firstSplit.assetTransfer.amountRaw !== expectedAmountRaw) {
    return await renderBreakdown(
      outputs,
      network,
      own,
      `output[0] amount ${firstSplit.assetTransfer.amountRaw} does not match remanente ${expectedAmountRaw}`
    );
  }

  const refundAddress = await describeDestination(firstSplit.prefixHex, network, own);
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
  own: OwnScript | null,
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
    const addr = await describeDestination(prefixHex, network, own);
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

/**
 * Guard against a device/account mismatch on the hardware signing path.
 *
 * The addon's selected account stores an address (A), but the connected ESP32
 * may hold a different key (address B). If the device signed with B while the
 * active account is A, returning the signature would silently attribute the
 * operation to the wrong address. In that case we reject instead.
 *
 * Returns a clear error string on mismatch, or null when it's safe to proceed
 * (matching addresses, or the device address could not be determined).
 */
function hwSignerMismatchError(
  result: HwSignSuccess,
  expectedAddress: string | undefined | null
): string | null {
  const signer = result.address;
  if (signer && expectedAddress && signer.toLowerCase() !== expectedAddress.toLowerCase()) {
    return (
      `Address mismatch: the connected device signed with ${signer}, but the active ` +
      `Neurai Sign account is ${expectedAddress}. Connect the correct device or switch ` +
      `accounts in the extension.`
    );
  }
  return null;
}

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

  const mismatch = hwSignerMismatchError(result as HwSignSuccess, pending.payload.address);
  if (mismatch) {
    pending.lastError = mismatch;
    finalizeHwSignRequest(requestId, { error: mismatch });
    return { error: mismatch };
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

  if (message.error) {
    finalizeHwSignRequest(message.requestId, { error: message.error });
    return { success: true };
  }

  const success: HwSignSuccess = {
    success: true,
    signature: message.signature,
    address: message.address,
    signedTxHex: message.signedTxHex,
    complete: message.complete
  } as HwSignSuccess;

  const mismatch = hwSignerMismatchError(success, pending.payload.address);
  if (mismatch) {
    finalizeHwSignRequest(message.requestId, { error: mismatch });
    return { success: true };
  }

  finalizeHwSignRequest(message.requestId, success);
  saveHwSignHistory(success, pending.payload).catch((err) => {
    console.error('Failed to save HW sign history:', err);
  });

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

// ── Neurai Connect signing ────────────────────────────────────────────────────

/**
 * Ask NeuraiWallet to sign through a window that shows the request and talks
 * to the relay: the service worker cannot hold the relay socket for the minutes
 * an approval on the phone can take. Resolves with the signature or an error.
 */
function requestConnectSignature(payload: ConnectSignPayload): Promise<HwSignResult> {
  // One at a time: two signing windows would each run a relay client on the
  // same session, and each answers the other's request with 4200.
  if (pendingConnectSignRequests.size > 0) {
    return Promise.resolve({ error: 'Another NeuraiWallet signature request is pending. Finish or cancel it first.' });
  }
  const requestId = 'nc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const url = chrome.runtime.getURL('popup/connect-sign.html') + '?requestId=' + encodeURIComponent(requestId);

  return new Promise<HwSignResult>((resolve) => {
    // Matches the dApp-side timeout of signMessage in inject.js.
    const timeout = setTimeout(() => {
      finalizeConnectSignRequest(requestId, { error: 'Neurai Connect signing request timed out' });
    }, 180000);
    pendingConnectSignRequests.set(requestId, { payload, resolve, timeout, windowId: null });

    chrome.windows.create({ url, type: 'popup', width: 460, height: 720 }, (win) => {
      const pending = pendingConnectSignRequests.get(requestId);
      if (pending) pending.windowId = win?.id || null;
    });
  });
}

async function resolveConnectSignResult(message: ConnectSignResultMsg): Promise<BackgroundResponse> {
  const pending = pendingConnectSignRequests.get(message.requestId);
  if (!pending) return { error: 'Neurai Connect sign request not found or expired' };
  const { payload } = pending;

  if (message.error) {
    finalizeConnectSignRequest(message.requestId, { error: message.error });
    return { success: true };
  }

  if (payload.type === 'raw_tx') {
    // The window already checked it; check again here, where the result is
    // handed to the site.
    const signedTxHex = String(message.signedTxHex || '');
    if (!signedTxHex || !sameTransaction(payload.txHex || '', signedTxHex)) {
      finalizeConnectSignRequest(message.requestId, {
        error: 'NeuraiWallet returned a different transaction from the one sent for signing'
      });
      return { success: true };
    }
    const txResult: HwRawTxSignResult = {
      success: true,
      signedTxHex,
      complete: isTxComplete(signedTxHex),
      address: payload.address
    };
    finalizeConnectSignRequest(message.requestId, txResult);
    saveHwSignHistory(txResult, {
      type: 'raw_tx',
      origin: payload.origin,
      address: payload.address,
      network: payload.network,
      txHex: payload.txHex,
      utxos: payload.utxos,
      sighashType: payload.sighashType
    }).catch((err) => console.error('Failed to save Neurai Connect sign history:', err));
    return { success: true };
  }

  if (!message.signature) {
    finalizeConnectSignRequest(message.requestId, { error: 'NeuraiWallet returned no signature' });
    return { success: true };
  }

  // Never hand a site a signature that does not verify for the account.
  const address = message.address || payload.address;
  let valid = false;
  try {
    valid = address === payload.address && !!NeuraiMessage.verifyMessage(payload.message, address, message.signature);
  } catch (_) {
    valid = false;
  }
  if (!valid) {
    finalizeConnectSignRequest(message.requestId, {
      error: `NeuraiWallet returned a signature that does not verify for ${payload.address}`
    });
    return { success: true };
  }

  const success: HwMessageSignResult = { success: true, signature: message.signature, address };
  finalizeConnectSignRequest(message.requestId, success);
  saveHwSignHistory(success, {
    type: 'message',
    origin: payload.origin,
    address: payload.address,
    network: payload.network,
    message: payload.message
  }).catch((err) => console.error('Failed to save Neurai Connect sign history:', err));
  return { success: true };
}

function finalizeConnectSignRequest(requestId: string, result: HwSignResult): void {
  const pending = pendingConnectSignRequests.get(requestId);
  if (!pending) return;
  clearTimeout(pending.timeout);
  pendingConnectSignRequests.delete(requestId);
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
    const network = walletData?.network || 'xna';
    const valid = await checkedJsonRpc(
      getRpcUrl(network),
      network,
      'verifymessage',
      [address, signature, message],
      'neurai-wallet-verify'
    );
    return { valid: !!valid };
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
  for (const [requestId, pending] of pendingConnectSignRequests.entries()) {
    if (pending.windowId === windowId) {
      finalizeConnectSignRequest(requestId, { error: 'User closed the Neurai Connect signing window' });
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
