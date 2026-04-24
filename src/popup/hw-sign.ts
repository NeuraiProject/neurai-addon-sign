import { NEURAI_CONSTANTS } from '../shared/constants.js';
import { NEURAI_UTILS } from '../shared/utils.js';
import type { HwSignPayload } from '../types/index.js';

(function () {
  'use strict';

  const C = (typeof NEURAI_CONSTANTS !== 'undefined' && NEURAI_CONSTANTS)
    ? NEURAI_CONSTANTS
    : { SETTINGS_KEY: 'neurai_wallet_settings' };
  const MSG = (C as typeof NEURAI_CONSTANTS).MSG || {} as Record<string, string>;

  const params = new URLSearchParams(window.location.search);
  const requestId = params.get('requestId');

  const elements = {
    pageTitle: document.getElementById('pageTitle'),
    signTypeBadge: document.getElementById('signTypeBadge'),
    signTypeValue: document.getElementById('signTypeValue'),
    originValue: document.getElementById('originValue'),
    addressValue: document.getElementById('addressValue'),
    networkValue: document.getElementById('networkValue'),
    sighashRow: document.getElementById('sighashRow'),
    sighashValue: document.getElementById('sighashValue'),
    inputsRow: document.getElementById('inputsRow'),
    inputsValue: document.getElementById('inputsValue'),
    messageBlock: document.getElementById('messageBlock'),
    messageCardTitle: document.getElementById('messageCardTitle'),
    messageValue: document.getElementById('messageValue'),
    txDetailsBlock: document.getElementById('txDetailsBlock'),
    txExpandBtn: document.getElementById('txExpandBtn'),
    txExpandChevron: document.getElementById('txExpandChevron') as HTMLElement | null,
    txDetails: document.getElementById('txDetails'),
    txHexValue: document.getElementById('txHexValue'),
    utxosSection: document.getElementById('utxosSection'),
    utxosList: document.getElementById('utxosList'),
    hwStatus: document.getElementById('hwStatus'),
    hwStatusText: document.getElementById('hwStatusText'),
    errorText: document.getElementById('errorText'),
    cancelBtn: document.getElementById('cancelBtn'),
    openExpandedBtn: document.getElementById('openExpandedBtn'),
    connectSignBtn: document.getElementById('connectSignBtn') as HTMLButtonElement | null
  };

  let request: HwSignPayload | null = null;
  let signing = false;
  let keepAlivePort: chrome.runtime.Port | null = null;
  let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  let connectionPollTimer: ReturnType<typeof setInterval> | null = null;
  let isHwConnected = false;
  let resizeDebounce: ReturnType<typeof setTimeout> | null = null;
  let lastRequestedHeight = 0;

  const MIN_POPUP_HEIGHT = 620;
  const MAX_POPUP_HEIGHT = 980;

  function resizeWindowToContent() {
    if (!chrome?.windows?.getCurrent || !chrome?.windows?.update) return;

    const doc = document.documentElement;
    const body = document.body;
    const contentHeight = Math.max(doc.scrollHeight, body?.scrollHeight || 0);
    const frameHeight = Math.max(0, window.outerHeight - window.innerHeight);
    const targetHeight = Math.max(
      MIN_POPUP_HEIGHT,
      Math.min(MAX_POPUP_HEIGHT, contentHeight + frameHeight + 4)
    );

    if (Math.abs(targetHeight - lastRequestedHeight) < 6) return;
    lastRequestedHeight = targetHeight;

    chrome.windows.getCurrent((currentWindow) => {
      if (!currentWindow?.id) return;
      chrome.windows.update(currentWindow.id, { height: targetHeight }, () => {
        void chrome.runtime.lastError;
      });
    });
  }

  function scheduleWindowResize(delay = 60) {
    if (resizeDebounce) clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(() => {
      resizeDebounce = null;
      resizeWindowToContent();
    }, delay);
  }

  function startAutoResizeObservers() {
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => scheduleWindowResize());
      resizeObserver.observe(document.documentElement);
      if (document.body) resizeObserver.observe(document.body);
    }

    if (document.body && typeof MutationObserver !== 'undefined') {
      const mutationObserver = new MutationObserver(() => scheduleWindowResize());
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });
    }

    window.addEventListener('resize', () => scheduleWindowResize(0));
    scheduleWindowResize(0);
    scheduleWindowResize(180);
  }

  function applyThemeFromSettings(settings: Record<string, unknown>) {
    if (typeof NEURAI_UTILS !== 'undefined' && typeof NEURAI_UTILS.applyTheme === 'function') {
      NEURAI_UTILS.applyTheme((settings || {}) as Parameters<typeof NEURAI_UTILS.applyTheme>[0]);
      return;
    }
    const selected = ((settings || {}).theme as string) || 'light';
    const theme = selected === 'system'
      ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : selected;
    document.documentElement.setAttribute('data-theme', theme);
  }

  async function loadTheme() {
    const result = await chrome.storage.local.get(C.SETTINGS_KEY);
    applyThemeFromSettings(((result && result[C.SETTINGS_KEY]) || {}) as Record<string, unknown>);
  }

  function setStatus(type: string, text: string) {
    elements.hwStatus!.className = 'hw-status hw-status--' + type;
    const iconHtml = type === 'connecting' || type === 'confirm'
      ? '<span class="hw-spinner"></span>'
      : type === 'success'
        ? '<span class="hw-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.4 5.3-4 4a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 1 1 1.06-1.06L6.87 8.7l3.47-3.47a.75.75 0 1 1 1.06 1.06z"/></svg></span>'
        : type === 'error'
          ? '<span class="hw-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zM7.25 4v5h1.5V4h-1.5zm0 6v1.5h1.5V10h-1.5z"/></svg></span>'
          : '<span class="hw-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zM7.25 4v5h1.5V4h-1.5zm0 6v1.5h1.5V10h-1.5z"/></svg></span>';
    elements.hwStatus!.innerHTML = iconHtml + '<span>' + text + '</span>';
  }

  async function init() {
    await loadTheme();
    startAutoResizeObservers();
    startKeepAlive();

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes || !changes[C.SETTINGS_KEY]) return;
      applyThemeFromSettings((changes[C.SETTINGS_KEY].newValue || {}) as Record<string, unknown>);
    });

    if (!requestId) {
      elements.errorText!.textContent = 'Missing request id.';
      elements.connectSignBtn!.disabled = true;
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: MSG.HW_GET_SIGN_REQUEST,
      requestId: requestId
    });

    if (!response || !response.success || !response.request) {
      elements.errorText!.textContent = response?.error || 'Request expired or not found.';
      elements.connectSignBtn!.disabled = true;
      return;
    }

    request = response.request as HwSignPayload;
    populateUI(request);

    elements.cancelBtn!.addEventListener('click', handleCancel);
    elements.openExpandedBtn!.addEventListener('click', handleOpenExpanded);
    elements.connectSignBtn!.addEventListener('click', handleSignRequest);

    await refreshConnectionState();
    startConnectionPolling();
  }

  function populateUI(req: HwSignPayload) {
    const isRawTx = req.type === 'raw_tx';

    if (isRawTx) {
      elements.pageTitle!.textContent = 'HW Transaction Signing';
      elements.signTypeBadge!.textContent = 'Raw Transaction';
      elements.signTypeBadge!.className = 'sign-badge sign-badge--rawtx';
      elements.signTypeValue!.textContent = 'Raw Transaction';
      elements.messageCardTitle!.textContent = 'Warning';
      elements.messageValue!.textContent = 'This operation will sign a raw transaction on your hardware wallet.\nConfirm the transaction details on your device screen.';
      elements.sighashRow!.classList.remove('hidden');
      elements.sighashValue!.textContent = req.sighashType || 'ALL';
      elements.inputsRow!.classList.remove('hidden');
      elements.inputsValue!.textContent = String((req.utxos || []).length || '--');

      elements.txHexValue!.textContent = req.txHex || '(not available)';
      if (Array.isArray(req.utxos) && req.utxos.length > 0) {
        elements.utxosList!.innerHTML = '';
        req.utxos.forEach((utxo, i) => {
          const row = document.createElement('div');
          row.className = 'utxo-row';
          row.innerHTML = `
            <div class="utxo-index">#${i + 1}</div>
            <div class="utxo-fields">
              <div class="utxo-field"><span>txid</span><code>${utxo.txid || '--'}</code></div>
              <div class="utxo-field"><span>vout</span><code>${utxo.vout ?? '--'}</code></div>
              ${utxo.amount != null ? `<div class="utxo-field"><span>amount</span><code>${utxo.amount} XNA</code></div>` : ''}
            </div>`;
          elements.utxosList!.appendChild(row);
        });
        elements.utxosSection!.classList.remove('hidden');
      } else {
        elements.utxosSection!.classList.add('hidden');
      }
      elements.txDetailsBlock!.classList.remove('hidden');
      elements.txExpandBtn!.addEventListener('click', () => {
        const isHidden = elements.txDetails!.classList.toggle('hidden');
        elements.txExpandChevron!.style.transform = isHidden ? '' : 'rotate(180deg)';
        elements.txExpandBtn!.childNodes[1].textContent = isHidden ? ' Show transaction details' : ' Hide transaction details';
        scheduleWindowResize();
      });
    } else {
      elements.pageTitle!.textContent = 'HW Message Signing';
      elements.signTypeBadge!.textContent = 'Message';
      elements.signTypeBadge!.className = 'sign-badge sign-badge--msg';
      elements.signTypeValue!.textContent = 'Message Signature';
      elements.messageCardTitle!.textContent = 'Message to sign';
      elements.messageValue!.textContent = req.message || '--';
    }

    elements.originValue!.textContent = req.origin || '--';
    elements.addressValue!.textContent = req.address || '--';
    elements.networkValue!.textContent = req.network || '--';
    scheduleWindowResize();
  }

  async function refreshConnectionState() {
    try {
      const response = await chrome.runtime.sendMessage({ type: MSG.HW_CONNECTION_STATUS });
      isHwConnected = !!(response && response.connected);
    } catch (_) {
      isHwConnected = false;
    }

    elements.openExpandedBtn!.classList.toggle('hidden', isHwConnected);
    elements.connectSignBtn!.classList.toggle('hidden', !isHwConnected);
    elements.connectSignBtn!.disabled = !isHwConnected || signing;

    if (isHwConnected) {
      setStatus('confirm', 'Hardware wallet connected. You can sign this request now.');
      elements.errorText!.textContent = '';
    } else {
      setStatus('waiting', 'Hardware wallet is not connected in the addon.');
      elements.errorText!.textContent = 'You must connect your hardware wallet first from the full wallet view.';
    }

    scheduleWindowResize();
  }

  function startConnectionPolling() {
    stopConnectionPolling();
    connectionPollTimer = setInterval(refreshConnectionState, 2000);
  }

  function stopConnectionPolling() {
    if (connectionPollTimer) {
      clearInterval(connectionPollTimer);
      connectionPollTimer = null;
    }
  }

  async function handleCancel() {
    stopConnectionPolling();
    stopKeepAlive();
    await sendResult({ error: 'User cancelled hardware signing' });
    window.close();
  }

  function handleOpenExpanded() {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup/expanded.html') });
  }

  async function handleSignRequest() {
    if (signing || !isHwConnected) return;
    signing = true;
    elements.connectSignBtn!.disabled = true;
    elements.errorText!.textContent = '';
    setStatus('connecting', 'Sending request to the connected hardware wallet...');

    try {
      const response = await chrome.runtime.sendMessage({
        type: MSG.HW_EXECUTE_SIGN_REQUEST,
        requestId: requestId
      });

      if (!response || response.error) {
        signing = false;
        await refreshConnectionState();
        setStatus('error', 'Unable to sign with the connected device');
        elements.errorText!.textContent = response?.error || 'Unknown hardware signing error.';
        scheduleWindowResize();
        return;
      }

      setStatus('success', 'Request signed successfully');
      stopConnectionPolling();
      stopKeepAlive();
      setTimeout(() => window.close(), 500);
    } catch (err) {
      signing = false;
      await refreshConnectionState();
      setStatus('error', 'Unable to sign with the connected device');
      elements.errorText!.textContent = (err as Error).message || 'Unknown hardware signing error.';
      scheduleWindowResize();
    }
  }

  async function sendResult(result: { error?: string }) {
    await chrome.runtime.sendMessage({
      type: MSG.HW_SIGN_RESULT,
      requestId: requestId,
      ...result
    });
  }

  function startKeepAlive() {
    if (!chrome.runtime || typeof chrome.runtime.connect !== 'function') return;
    keepAlivePort = chrome.runtime.connect({ name: 'hw-sign-keepalive' });
    keepAliveTimer = setInterval(function () {
      try {
        keepAlivePort!.postMessage({ type: 'ping', at: Date.now() });
      } catch (_) { }
    }, 20000);
  }

  function stopKeepAlive() {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    if (keepAlivePort) {
      try { keepAlivePort.disconnect(); } catch (_) { }
      keepAlivePort = null;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
