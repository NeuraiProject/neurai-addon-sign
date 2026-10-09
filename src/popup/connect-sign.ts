// Neurai Wallet — sign with NeuraiWallet over Neurai Connect.
//
// Opened by the background for a `signMessage` or a raw transaction on a
// Neurai Connect account. The page holds the relay socket while the phone asks
// the user to approve (the service worker could be stopped meanwhile), checks
// what comes back and hands it to the background, which checks it again.
//
// Transactions travel as a PSBT (`signPsbt`): the page builds it from the raw
// transaction and the prevouts it reads from the node, asks the wallet to sign
// the account's inputs with SIGHASH_ALL, finalizes the returned partial
// signatures (P2PKH, or the ECDSA witness v3 template) and puts back any input
// another signer had already signed.
//
// Sessions last 7 days. When the account's session is gone, the page shows a
// new pairing QR code; once NeuraiWallet approves a session that exposes the
// same address, the account moves to it and the request is sent.

import { NEURAI_CONSTANTS } from '../shared/constants.js';
import { NEURAI_UTILS } from '../shared/utils.js';
import { elem } from '../shared/dom.js';
import { isTestnetNetwork, networkLabel } from '../shared/networks.js';
import {
  closeConnectClient,
  connectProposalNamespaces,
  describeConnectError,
  getConnectClient,
  sameTransaction,
  sessionAddresses,
  sessionMethods,
  signMessageParams,
  signPsbtParams
} from '../shared/neurai-connect.js';
import { assertRpcChain, jsonRpc } from '../shared/chain-identity.js';
import { parseRawTransaction } from '../shared/parse-raw-tx.js';
import { keepForeignUnlockingData } from '../shared/tx-merge.js';
import { renderQr } from '../shared/qr.js';
import type { AccountsRecord, ConnectSignPayload, WalletData, WalletSettings } from '../types/index.js';

(function () {
  'use strict';

  const C = NEURAI_CONSTANTS;
  const requestId = new URLSearchParams(window.location.search).get('requestId');

  const elements = {
    originValue: document.getElementById('originValue'),
    addressValue: document.getElementById('addressValue'),
    networkValue: document.getElementById('networkValue'),
    walletValue: document.getElementById('walletValue'),
    signTypeBadge: document.getElementById('signTypeBadge'),
    messageCardTitle: document.getElementById('messageCardTitle'),
    messageValue: document.getElementById('messageValue'),
    reconnectBlock: document.getElementById('reconnectBlock'),
    reconnectQr: document.getElementById('reconnectQr') as HTMLCanvasElement | null,
    ncStatus: document.getElementById('ncStatus'),
    errorText: document.getElementById('errorText'),
    cancelBtn: document.getElementById('cancelBtn') as HTMLButtonElement | null,
    retryBtn: document.getElementById('retryBtn') as HTMLButtonElement | null
  };

  // The dApp gives up after 180 s (inject.js); stop waiting for the phone first.
  const REQUEST_TIMEOUT_MS = 170000;

  let request: ConnectSignPayload | null = null;
  let settings: Partial<WalletSettings> = {};
  let abort: AbortController | null = null;
  /** Session the pending request was sent on; a delete of it means "reconnect". */
  let activeTopic = '';
  let deleteListenerInstalled = false;
  let finished = false;
  let keepAlivePort: chrome.runtime.Port | null = null;
  let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  function setStatus(type: 'waiting' | 'connecting' | 'confirm' | 'success' | 'error', text: string) {
    elements.ncStatus!.className = 'nc-status nc-status--' + type;
    const busy = type === 'connecting' || type === 'confirm';
    elements.ncStatus!.replaceChildren(
      ...(busy ? [elem('span', { class: 'nc-spinner' })] : []),
      elem('span', null, text)
    );
  }

  async function sendResult(result: { error?: string; signature?: string; address?: string; signedTxHex?: string }) {
    if (finished) return;
    finished = true;
    stopKeepAlive();
    void closeConnectClient();
    try {
      await chrome.runtime.sendMessage({ type: C.MSG.CONNECT_SIGN_RESULT, requestId, ...result });
    } catch (_) { /* the background closes this window when it settles */ }
  }

  /**
   * After a reconnection, point every Neurai Connect account of this address
   * and chain at the new session, so later requests use it directly.
   */
  async function moveAccountToSession(session: NeuraiConnectSession) {
    await updateMatchingAccounts((wallet) => ({
      ...wallet,
      connectSessionTopic: session.topic,
      connectPeerName: session.peerMetadata?.name || wallet.connectPeerName || null,
      connectMethods: sessionMethods(session)
    }));
  }

  /**
   * The wallet answered `signPsbt` with 4200: it settles the method but does
   * not implement it. Drop it from the account so the extension stops
   * offering transactions until a session settles it again.
   */
  async function markPsbtUnsupported() {
    await updateMatchingAccounts((wallet) => ({
      ...wallet,
      connectMethods: (wallet.connectMethods || []).filter((method) => method !== 'signPsbt')
    }));
  }

  /** Apply `update` to every Neurai Connect account of this request's address and chain. */
  async function updateMatchingAccounts(update: (wallet: WalletData) => WalletData) {
    const req = request!;
    const stored = await chrome.storage.local.get([C.ACCOUNTS_KEY, C.STORAGE_KEY]);
    const accounts = (stored[C.ACCOUNTS_KEY] || {}) as AccountsRecord;
    const matches = (wallet: WalletData | null | undefined) =>
      !!wallet && wallet.walletType === 'connect' && wallet.address === req.address && wallet.connectChainId === req.chainId;

    const updates: Record<string, unknown> = {};
    const next: AccountsRecord = { ...accounts };
    let changed = false;
    for (const [id, wallet] of Object.entries(accounts)) {
      if (matches(wallet)) { next[id] = update(wallet); changed = true; }
    }
    if (changed) updates[C.ACCOUNTS_KEY] = next;
    const active = stored[C.STORAGE_KEY] as WalletData | null;
    if (matches(active)) updates[C.STORAGE_KEY] = update(active!);
    if (Object.keys(updates).length > 0) {
      await chrome.storage.local.set(updates);
      chrome.runtime.sendMessage({ type: C.MSG.WALLET_UPDATED }).catch(() => { });
    }
  }

  /** Pair again and wait for a session that exposes the request's address. */
  async function reconnect(client: NeuraiConnectClient, signal: AbortSignal): Promise<NeuraiConnectSession> {
    const req = request!;
    activeTopic = '';
    setStatus('connecting', 'The session ended. Preparing a QR code to reconnect…');
    const started = await client.connect({ ...connectProposalNamespaces(req.chainId), signal });
    elements.reconnectBlock!.classList.remove('hidden');
    await renderQr(elements.reconnectQr!, started.uri, 240, '../icons/icon128.png');
    setStatus('waiting', 'Scan the QR code with NeuraiWallet to reconnect.');
    const session = await started.approval;
    elements.reconnectBlock!.classList.add('hidden');

    if (!sessionAddresses(session, req.chainId).some((entry) => entry.address === req.address)) {
      client.disconnect(session.topic).catch(() => { });
      throw new Error(`The wallet that scanned the code does not share ${req.address}. Use the NeuraiWallet that holds this account.`);
    }
    await moveAccountToSession(session);
    return session;
  }

  /**
   * The session the request was sent on is gone: start over, which shows the
   * QR code to reconnect. Runs once per lost session whichever signal arrives
   * first (the delete event or the failed request).
   */
  function restartAfterLostSession() {
    if (!activeTopic || finished) return;
    activeTopic = '';
    void signWithWallet();
  }

  async function signWithWallet() {
    const req = request!;
    abort?.abort();
    const current = new AbortController();
    abort = current;
    elements.errorText!.textContent = '';
    elements.retryBtn!.classList.add('hidden');
    setStatus('connecting', 'Connecting to the Neurai Connect relay…');

    try {
      const client = await getConnectClient(C.RELAY_URL, C.CONNECT_STORAGE_PREFIX);
      if (!deleteListenerInstalled) {
        deleteListenerInstalled = true;
        // The wallet revoked the session (possibly while we were waiting, or
        // before this page started: the relay replays the delete). Waiting for
        // an answer that will never come helps nobody: start over, which
        // shows the QR code to reconnect.
        client.on('session_delete', (event) => {
          if ((event as { topic?: string })?.topic === activeTopic) restartAfterLostSession();
        });
      }
      let session = client.session(req.sessionTopic);
      if (!session || NeuraiConnectSDK.isExpired(session.expiry)) {
        session = await reconnect(client, current.signal);
      }

      activeTopic = session.topic;
      if (req.type === 'raw_tx') {
        await signTransaction(client, session, current.signal);
        return;
      }
      setStatus('confirm', `Approve the request in ${session.peerMetadata?.name || 'NeuraiWallet'} on your phone…`);
      const result = await client.request<{ signature?: string }>(
        session.topic,
        req.chainId,
        'signMessage',
        signMessageParams(req.chainId, req.address, req.message),
        { signal: current.signal, timeoutMs: REQUEST_TIMEOUT_MS }
      );
      const signature = String(result?.signature || '');
      if (!signature || !NeuraiMessage.verifyMessage(req.message, req.address, signature)) {
        throw new Error(`NeuraiWallet returned a signature that does not verify for ${req.address}.`);
      }

      setStatus('success', 'Signed in NeuraiWallet.');
      await sendResult({ signature, address: req.address });
    } catch (err) {
      if (current.signal.aborted || finished) return;
      // The session vanished between the check and the request: reconnect.
      if (/unknown session|expired/i.test(String((err as Error)?.message || '')) && activeTopic) {
        restartAfterLostSession();
        return;
      }
      const code = (err as { code?: unknown })?.code;
      let reason = describeConnectError(err);
      if (req.type === 'raw_tx' && code === 4200) {
        await markPsbtUnsupported();
        reason = 'NeuraiWallet does not sign transactions over Neurai Connect yet. Transactions are now turned off for this account.';
      }
      setStatus('error', req.type === 'raw_tx' ? 'NeuraiWallet did not sign the transaction.' : 'NeuraiWallet did not sign the message.');
      elements.errorText!.textContent = reason;
      // A rejection on the phone, or a method it does not have, is a final
      // answer: report it right away.
      if (code === 4001 || code === 4200) {
        await sendResult({ error: reason });
        return;
      }
      elements.retryBtn!.classList.remove('hidden');
    }
  }

  function rpcUrl(): string {
    const req = request!;
    return isTestnetNetwork(req.network)
      ? (settings.rpcTestnet || C.RPC_URL_TESTNET)
      : (settings.rpcMainnet || C.RPC_URL);
  }

  /** Raw prevout transactions by txid, from a node checked to be on the account's chain. */
  async function fetchPrevTransactions(txids: string[]): Promise<Record<string, string>> {
    const req = request!;
    const url = rpcUrl();
    await assertRpcChain(url, req.network, (method, params) => jsonRpc(url, method, params, 'connect-chain-check'));
    const out: Record<string, string> = {};
    for (const txid of [...new Set(txids)]) {
      const raw = await jsonRpc(url, 'getrawtransaction', [txid, 0], 'connect-prevout');
      if (typeof raw !== 'string' || !raw) throw new Error(`Unable to load the transaction ${txid} spent by this request`);
      out[txid] = raw;
    }
    return out;
  }

  /** Build the PSBT, have the wallet sign it, finalize and hand back the transaction. */
  async function signTransaction(client: NeuraiConnectClient, session: NeuraiConnectSession, signal: AbortSignal) {
    const req = request!;
    const txHex = req.txHex || '';
    const parsed = parseRawTransaction(txHex);
    // The inputs this account signs, each with the address that owns its
    // prevout: the session address, or another address of the account when
    // the wallet shared its key (connect-account.ts).
    const ownInputs = parsed.inputs.flatMap((input, index) => {
      const utxo = (req.utxos || []).find((u) => String(u.txid).toLowerCase() === input.txid && Number(u.vout) === input.vout);
      return utxo ? [{ index, address: utxo.address || req.address }] : [];
    });
    const ownIndexes = ownInputs.map((input) => input.index);
    if (ownIndexes.length === 0) throw new Error('None of the inputs of this transaction is signed by this account.');

    setStatus('connecting', 'Reading the outputs this transaction spends…');
    const prevTxs = await fetchPrevTransactions(parsed.inputs.map((input) => input.txid));
    // Only the chain matters to the PSBT helpers; their legacy labels cover it.
    const psbtNetwork = isTestnetNetwork(req.network) ? 'xna-test' : 'xna';
    const psbt = NeuraiSignESP32.buildPSBTFromRawTransaction({
      network: psbtNetwork,
      rawUnsignedTransaction: txHex,
      inputs: parsed.inputs.map((input) => ({
        txid: input.txid,
        vout: input.vout,
        sequence: input.sequence,
        rawTxHex: prevTxs[input.txid]
      }))
    });

    setStatus('confirm', `Approve the transaction in ${session.peerMetadata?.name || 'NeuraiWallet'} on your phone…`);
    const result = await client.request<{ psbt?: string }>(
      session.topic,
      req.chainId,
      'signPsbt',
      signPsbtParams(req.chainId, req.address, psbt, ownInputs),
      { signal, timeoutMs: REQUEST_TIMEOUT_MS }
    );
    if (!result?.psbt) throw new Error('NeuraiWallet returned no PSBT.');

    const finalized = NeuraiSignESP32.finalizeSignedPSBT(psbt, result.psbt, psbtNetwork).txHex;
    const signedTxHex = keepForeignUnlockingData(txHex, finalized, ownIndexes);
    if (!sameTransaction(txHex, signedTxHex)) {
      throw new Error('NeuraiWallet returned a different transaction from the one sent for signing.');
    }
    const signed = parseRawTransaction(signedTxHex);
    const unsignedOwn = ownIndexes.filter((index) =>
      signed.inputs[index].scriptSigLen === 0 && signed.inputs[index].witnessItemCount === 0);
    if (unsignedOwn.length > 0) {
      throw new Error(`NeuraiWallet did not sign input${unsignedOwn.length > 1 ? 's' : ''} ${unsignedOwn.join(', ')}.`);
    }

    setStatus('success', 'Signed in NeuraiWallet.');
    await sendResult({ signedTxHex, address: req.address });
  }

  /** What the window shows for a transaction: the outputs it pays. */
  function describeTransaction(req: ConnectSignPayload): string {
    try {
      const parsed = parseRawTransaction(req.txHex || '');
      const lines = parsed.outputs.map((output, i) =>
        `#${i}  ${(Number(output.value) / 1e8).toFixed(8)} XNA  → ${output.scriptHex.slice(0, 50)}${output.scriptHex.length > 50 ? '…' : ''}`);
      return `Inputs signed by this account: ${(req.utxos || []).length} of ${parsed.inputs.length}\n\nOutputs:\n${lines.join('\n')}`;
    } catch (_) {
      return req.txHex || '';
    }
  }

  async function handleCancel() {
    abort?.abort();
    await sendResult({ error: 'User cancelled the Neurai Connect signing request' });
    window.close();
  }

  function startKeepAlive() {
    if (!chrome.runtime || typeof chrome.runtime.connect !== 'function') return;
    keepAlivePort = chrome.runtime.connect({ name: 'connect-sign-keepalive' });
    keepAliveTimer = setInterval(() => {
      try { keepAlivePort!.postMessage({ type: 'ping', at: Date.now() }); } catch (_) { }
    }, 20000);
  }

  function stopKeepAlive() {
    if (keepAliveTimer) { clearInterval(keepAliveTimer); keepAliveTimer = null; }
    if (keepAlivePort) { try { keepAlivePort.disconnect(); } catch (_) { } keepAlivePort = null; }
  }

  async function init() {
    const stored = await chrome.storage.local.get(C.SETTINGS_KEY);
    settings = (stored[C.SETTINGS_KEY] || {}) as Partial<WalletSettings>;
    NEURAI_UTILS.applyTheme(settings);
    elements.cancelBtn!.addEventListener('click', () => { void handleCancel(); });
    elements.retryBtn!.addEventListener('click', () => { void signWithWallet(); });

    if (!requestId) {
      setStatus('error', 'Missing request id.');
      return;
    }
    const response = await chrome.runtime.sendMessage({ type: C.MSG.CONNECT_GET_SIGN_REQUEST, requestId });
    if (!response || !response.success || !response.request) {
      setStatus('error', response?.error || 'Request expired or not found.');
      return;
    }

    request = response.request as ConnectSignPayload;
    elements.originValue!.textContent = request.origin || '--';
    elements.addressValue!.textContent = request.address || '--';
    elements.networkValue!.textContent = request.network ? networkLabel(request.network) : '--';
    elements.walletValue!.textContent = request.peerName || 'NeuraiWallet';
    if (request.type === 'raw_tx') {
      elements.signTypeBadge!.textContent = 'Transaction';
      elements.signTypeBadge!.className = 'sign-badge sign-badge--rawtx';
      elements.messageCardTitle!.textContent = 'Transaction to sign';
      elements.messageValue!.textContent = describeTransaction(request);
    } else {
      elements.messageValue!.textContent = request.message || '';
    }

    startKeepAlive();
    void signWithWallet();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { void init(); });
  } else {
    void init();
  }
})();
