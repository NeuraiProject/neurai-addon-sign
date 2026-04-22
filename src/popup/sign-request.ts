import { NEURAI_CONSTANTS } from '../shared/constants.js';
import { NEURAI_UTILS } from '../shared/utils.js';
import type { CancelApprovalData, CancelOutputSummary } from '../types/index.js';

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
    acceptBtn: document.getElementById('acceptBtn') as HTMLButtonElement | null,
    // Covenant-cancel block
    covenantCancelBlock: document.getElementById('covenantCancelBlock'),
    cancelVariant: document.getElementById('cancelVariant'),
    cancelCovenantRef: document.getElementById('cancelCovenantRef'),
    cancelAsset: document.getElementById('cancelAsset'),
    cancelAmount: document.getElementById('cancelAmount'),
    cancelUnitPrice: document.getElementById('cancelUnitPrice'),
    cancelSellerLabel: document.getElementById('cancelSellerLabel'),
    cancelSellerValue: document.getElementById('cancelSellerValue'),
    cancelSelectorRow: document.getElementById('cancelSelectorRow'),
    cancelSelectorValue: document.getElementById('cancelSelectorValue'),
    cancelRefundLabeled: document.getElementById('cancelRefundLabeled'),
    cancelRefundAddress: document.getElementById('cancelRefundAddress'),
    cancelRefundBreakdown: document.getElementById('cancelRefundBreakdown'),
    cancelBreakdownReason: document.getElementById('cancelBreakdownReason'),
    cancelOutputsList: document.getElementById('cancelOutputsList'),
  };

  function formatAmountRaw(amountRawStr: string): string {
    // amountRaw is scaled by 1e8; render as decimal with up to 8 fractional digits.
    try {
      const raw = BigInt(amountRawStr);
      const whole = raw / 100000000n;
      const frac = raw % 100000000n;
      if (frac === 0n) return whole.toString();
      const fracStr = frac.toString().padStart(8, '0').replace(/0+$/, '');
      return `${whole}.${fracStr}`;
    } catch {
      return amountRawStr;
    }
  }

  function shortHex(hex: string, headN = 10, tailN = 10): string {
    if (!hex || hex.length <= headN + tailN + 1) return hex || '';
    return `${hex.slice(0, headN)}…${hex.slice(-tailN)}`;
  }

  let pinRequired = false;
  let resizeDebounce: ReturnType<typeof setTimeout> | null = null;
  let lastRequestedHeight = 0;

  const MIN_POPUP_HEIGHT = 560;
  const MAX_POPUP_HEIGHT = 920;

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
    startAutoResizeObservers();

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
    const isCovenantCancel = request.signType === 'covenant_cancel';
    const isRawTx = request.signType === 'raw_tx';

    if (isCovenantCancel && request.cancelData) {
      const cd = request.cancelData as CancelApprovalData;
      elements.pageTitle!.textContent = 'Cancel Covenant Order';
      elements.signTypeIcon!.innerHTML = `<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style="color:#dc2626"><path d="M10 2a8 8 0 1 0 0 16A8 8 0 0 0 10 2zm3.54 11.46a.75.75 0 1 1-1.06 1.06L10 12.06l-2.48 2.46a.75.75 0 1 1-1.06-1.06L8.94 11 6.46 8.54a.75.75 0 1 1 1.06-1.06L10 9.94l2.48-2.46a.75.75 0 1 1 1.06 1.06L11.06 11l2.48 2.46z"/></svg>`;
      elements.signTypeBadge!.textContent = 'Cancel partial-fill sell order';
      elements.signTypeBadge!.className = 'sign-badge sign-badge--rawtx';
      elements.signTypeValue!.textContent = 'Covenant cancel';
      elements.signTypeValue!.className = 'sign-type-rawtx';
      elements.messageCardTitle!.textContent = 'What this does';
      elements.acceptBtn!.className = 'btn btn-warning';

      // Populate covenant block.
      elements.covenantCancelBlock!.classList.remove('hidden');
      elements.cancelVariant!.textContent =
        cd.variant === 'legacy' ? 'Legacy (ECDSA)' : 'Post-Quantum (ML-DSA-44)';
      elements.cancelCovenantRef!.textContent = `${cd.covenantTxid}:${cd.covenantVout}`;
      elements.cancelAsset!.textContent = `${cd.assetName} (tokenId: ${cd.tokenId})`;
      elements.cancelAmount!.textContent = `${formatAmountRaw(cd.amountRaw)} ${cd.assetName}`;
      elements.cancelUnitPrice!.textContent = `${formatAmountRaw(cd.unitPriceSats)} XNA`;
      elements.cancelSellerLabel!.textContent =
        cd.variant === 'legacy' ? 'Seller PKH' : 'PQ key commitment';
      elements.cancelSellerValue!.textContent = shortHex(cd.sellerIdentifier, 12, 12);
      if (cd.txHashSelector !== undefined) {
        elements.cancelSelectorRow!.classList.remove('hidden');
        elements.cancelSelectorValue!.textContent = `0x${cd.txHashSelector
          .toString(16)
          .padStart(2, '0')}`;
      }

      if (cd.refund.mode === 'labeled') {
        elements.cancelRefundLabeled!.classList.remove('hidden');
        elements.cancelRefundAddress!.textContent =
          cd.refund.refundAddress ?? `script: ${shortHex(cd.refund.refundScriptHex)}`;
      } else {
        elements.cancelRefundBreakdown!.classList.remove('hidden');
        elements.cancelBreakdownReason!.textContent = `non-standard layout — ${cd.refund.reason}`;
        cd.refund.outputs.forEach((o: CancelOutputSummary) => {
          const row = document.createElement('div');
          row.className = 'utxo-row';
          const xnaAmount = (o.valueSats / 1e8).toFixed(8).replace(/\.?0+$/, '');
          row.innerHTML = `
            <div class="utxo-index">#${o.index}</div>
            <div class="utxo-fields">
              <div class="utxo-field"><span>value</span><code>${xnaAmount} XNA</code></div>
              ${
                o.asset
                  ? `<div class="utxo-field"><span>asset</span><code>${o.asset.name} × ${formatAmountRaw(o.asset.amountRaw)}</code></div>`
                  : ''
              }
              <div class="utxo-field"><span>to</span><code>${
                o.address ?? `script: ${shortHex(o.scriptHex)}`
              }</code></div>
            </div>`;
          elements.cancelOutputsList!.appendChild(row);
        });
      }

      // Sighash / inputs rows shared with raw_tx (cosmetic).
      elements.sighashRow!.classList.remove('hidden');
      elements.sighashValue!.textContent = request.sighashType || 'ALL';
      elements.inputsRow!.classList.remove('hidden');
      elements.inputsValue!.textContent = String(request.inputCount ?? '--');

      // Populate tx hex / utxos section (collapsed by default).
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
        scheduleWindowResize();
      });
    } else if (isRawTx) {
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
        scheduleWindowResize();
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

    scheduleWindowResize();
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
    scheduleWindowResize();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
