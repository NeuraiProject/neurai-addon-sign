import { NEURAI_CONSTANTS } from '../shared/constants.js';
import { NEURAI_UTILS } from '../shared/utils.js';

(function() {
  'use strict';

  const C = (typeof NEURAI_CONSTANTS !== 'undefined' && NEURAI_CONSTANTS) ? NEURAI_CONSTANTS : { SETTINGS_KEY: 'neurai_wallet_settings' };

  const params = new URLSearchParams(window.location.search);
  const requestId = params.get('requestId');

  const elements = {
    pageTitle: document.getElementById('pageTitle'),
    signTypeIcon: document.getElementById('signTypeIcon'),
    signTypeBadge: document.getElementById('signTypeBadge'),
    signTypeValue: document.getElementById('signTypeValue'),
    originValue: document.getElementById('originValue'),
    addressValue: document.getElementById('addressValue'),
    networkValue: document.getElementById('networkValue'),
    sighashRow: document.getElementById('sighashRow'),
    sighashValue: document.getElementById('sighashValue'),
    inputsRow: document.getElementById('inputsRow'),
    inputsValue: document.getElementById('inputsValue'),
    messageCardTitle: document.getElementById('messageCardTitle'),
    messageValue: document.getElementById('messageValue'),
    txDetailsBlock: document.getElementById('txDetailsBlock'),
    txExpandBtn: document.getElementById('txExpandBtn'),
    txExpandChevron: document.getElementById('txExpandChevron'),
    txDetails: document.getElementById('txDetails'),
    txHexValue: document.getElementById('txHexValue'),
    utxosSection: document.getElementById('utxosSection'),
    utxosList: document.getElementById('utxosList'),
    pinBlock: document.getElementById('pinBlock'),
    pinInput: document.getElementById('pinInput') as HTMLInputElement | null,
    errorText: document.getElementById('errorText'),
    rejectBtn: document.getElementById('rejectBtn'),
    acceptBtn: document.getElementById('acceptBtn') as HTMLButtonElement | null
  };

  let pinRequired = false;

  function applyThemeFromSettings(settings = {} as Record<string, unknown>) {
    if (typeof NEURAI_UTILS !== 'undefined' && typeof NEURAI_UTILS.applyTheme === 'function') {
      NEURAI_UTILS.applyTheme(settings as Parameters<typeof NEURAI_UTILS.applyTheme>[0]);
      return;
    }

    const selected = (settings.theme as string) || 'dark';
    const theme = selected === 'system'
      ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : selected;
    document.documentElement.setAttribute('data-theme', theme);
  }

  async function loadTheme() {
    const result = await chrome.storage.local.get(C.SETTINGS_KEY);
    applyThemeFromSettings(((result && result[C.SETTINGS_KEY]) || {}) as Record<string, unknown>);
  }

  async function init() {
    await loadTheme();

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (!changes || !changes[C.SETTINGS_KEY]) return;
      applyThemeFromSettings((changes[C.SETTINGS_KEY].newValue || {}) as Record<string, unknown>);
    });

    if (!requestId) {
      elements.errorText!.textContent = 'Missing request id.';
      elements.acceptBtn!.disabled = true;
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: 'GET_SIGN_REQUEST',
      requestId
    });

    if (!response || !response.success || !response.request) {
      elements.errorText!.textContent = response?.error || 'Request expired.';
      elements.acceptBtn!.disabled = true;
      return;
    }

    const request = response.request;
    pinRequired = !!response.pinRequired;

    // Determine signing type and update UI accordingly
    const isRawTx = request.signType === 'raw_tx';

    if (isRawTx) {
      elements.pageTitle!.textContent = 'Transaction Signing';
      elements.signTypeIcon!.innerHTML = `<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style="color:#f59e0b"><path d="M10 2a8 8 0 1 0 0 16A8 8 0 0 0 10 2zm.75 4v4.25l3 1.75-.75 1.25-3.75-2.25V6h1.5z"/><path d="M3.5 10.5h1.25M15.25 10.5H16.5M10 3.5V2.25M10 17.75V16.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
      elements.signTypeBadge!.textContent = 'Raw Transaction';
      elements.signTypeBadge!.className = 'sign-badge sign-badge--rawtx';
      elements.signTypeValue!.textContent = 'Raw Transaction';
      elements.signTypeValue!.className = 'sign-type-rawtx';
      elements.messageCardTitle!.textContent = 'Warning';
      elements.sighashRow!.classList.remove('hidden');
      elements.sighashValue!.textContent = request.sighashType || 'ALL';
      elements.inputsRow!.classList.remove('hidden');
      elements.inputsValue!.textContent = request.inputCount ?? '--';
      elements.acceptBtn!.className = 'btn btn-warning';

      // Populate and show the tx details block
      elements.txHexValue!.textContent = request.txHex || '(not available)';
      if (Array.isArray(request.utxos) && request.utxos.length > 0) {
        request.utxos.forEach((utxo: Record<string, unknown>, i: number) => {
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
      }
      elements.txDetailsBlock!.classList.remove('hidden');

      elements.txExpandBtn!.addEventListener('click', () => {
        const isHidden = elements.txDetails!.classList.toggle('hidden');
        (elements.txExpandBtn!.firstElementChild as HTMLElement).style.transform = isHidden ? '' : 'rotate(180deg)';
        elements.txExpandBtn!.childNodes[1].textContent = isHidden ? ' Show transaction details' : ' Hide transaction details';
      });
    } else {
      elements.pageTitle!.textContent = 'Message Signature';
      elements.signTypeIcon!.innerHTML = `<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style="color:#2563eb"><path d="M2 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4zm2 0v.01L10 9l6-4.99V4H4zm0 2.24V16h12V6.24l-5.55 4.62a.75.75 0 0 1-.9 0L4 6.24z"/></svg>`;
      elements.signTypeBadge!.textContent = 'Message';
      elements.signTypeBadge!.className = 'sign-badge sign-badge--msg';
      elements.signTypeValue!.textContent = 'Message Signature';
      elements.signTypeValue!.className = 'sign-type-msg';
    }

    elements.originValue!.textContent = request.origin || '--';
    elements.addressValue!.textContent = request.address || '--';
    elements.networkValue!.textContent = request.network || '--';
    elements.messageValue!.textContent = request.message || '--';
    elements.pinBlock!.classList.toggle('hidden', !pinRequired);

    elements.rejectBtn!.addEventListener('click', handleReject);
    elements.acceptBtn!.addEventListener('click', handleAccept);
    if (pinRequired) {
      elements.pinInput!.focus();
    }
  }

  async function handleReject() {
    await chrome.runtime.sendMessage({
      type: 'SIGN_REQUEST_DECISION',
      requestId,
      approved: false
    });
    window.close();
  }

  async function handleAccept() {
    elements.errorText!.textContent = '';
    const response = await chrome.runtime.sendMessage({
      type: 'SIGN_REQUEST_DECISION',
      requestId,
      approved: true,
      pin: pinRequired ? elements.pinInput!.value : ''
    });

    if (response && response.success) {
      window.close();
      return;
    }

    elements.errorText!.textContent = response?.error || 'Unable to approve request.';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
