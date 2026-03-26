(function () {
  'use strict';

  const C = (typeof NEURAI_CONSTANTS !== 'undefined' && NEURAI_CONSTANTS)
    ? NEURAI_CONSTANTS
    : { SETTINGS_KEY: 'neurai_wallet_settings' };
  const MSG = C.MSG || {};

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
    hwStatus: document.getElementById('hwStatus'),
    hwStatusText: document.getElementById('hwStatusText'),
    errorText: document.getElementById('errorText'),
    cancelBtn: document.getElementById('cancelBtn'),
    connectSignBtn: document.getElementById('connectSignBtn')
  };

  let request = null;
  let signing = false;

  // ── Theme ────────────────────────────────────────────────────────────────

  function applyThemeFromSettings(settings) {
    if (typeof NEURAI_UTILS !== 'undefined' && typeof NEURAI_UTILS.applyTheme === 'function') {
      NEURAI_UTILS.applyTheme(settings || {});
      return;
    }
    const selected = (settings || {}).theme || 'dark';
    const theme = selected === 'system'
      ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : selected;
    document.documentElement.setAttribute('data-theme', theme);
  }

  async function loadTheme() {
    return new Promise((resolve) => {
      chrome.storage.local.get(C.SETTINGS_KEY, (result) => {
        applyThemeFromSettings((result && result[C.SETTINGS_KEY]) || {});
        resolve();
      });
    });
  }

  // ── Status display ─────────────────────────────────────────────────────

  function setStatus(type, text) {
    elements.hwStatus.className = 'hw-status hw-status--' + type;
    const iconHtml = type === 'connecting' || type === 'confirm'
      ? '<span class="hw-spinner"></span>'
      : type === 'success'
        ? '<span class="hw-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.4 5.3-4 4a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 1 1 1.06-1.06L6.87 8.7l3.47-3.47a.75.75 0 1 1 1.06 1.06z"/></svg></span>'
        : type === 'error'
          ? '<span class="hw-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zM7.25 4v5h1.5V4h-1.5zm0 6v1.5h1.5V10h-1.5z"/></svg></span>'
          : '<span class="hw-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zM7.25 4v5h1.5V4h-1.5zm0 6v1.5h1.5V10h-1.5z"/></svg></span>';
    elements.hwStatus.innerHTML = iconHtml + '<span>' + text + '</span>';
  }

  // ── Init ────────────────────────────────────────────────────────────────

  async function init() {
    await loadTheme();

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes || !changes[C.SETTINGS_KEY]) return;
      applyThemeFromSettings(changes[C.SETTINGS_KEY].newValue || {});
    });

    if (!requestId) {
      elements.errorText.textContent = 'Missing request id.';
      elements.connectSignBtn.disabled = true;
      return;
    }

    // Check Web Serial support
    if (typeof NeuraiSignESP32 === 'undefined' || !NeuraiSignESP32.NeuraiESP32) {
      elements.errorText.textContent = 'Hardware wallet library not available.';
      elements.connectSignBtn.disabled = true;
      return;
    }

    if (!NeuraiSignESP32.NeuraiESP32.isSupported()) {
      elements.errorText.textContent = 'Web Serial is not supported in this browser. Use Chrome, Edge, or Opera.';
      elements.connectSignBtn.disabled = true;
      return;
    }

    // Fetch the signing request payload from background
    const response = await chrome.runtime.sendMessage({
      type: MSG.HW_GET_SIGN_REQUEST,
      requestId: requestId
    });

    if (!response || !response.success || !response.request) {
      elements.errorText.textContent = response?.error || 'Request expired or not found.';
      elements.connectSignBtn.disabled = true;
      return;
    }

    request = response.request;
    populateUI(request);

    elements.cancelBtn.addEventListener('click', handleCancel);
    elements.connectSignBtn.addEventListener('click', handleConnectAndSign);
  }

  function populateUI(req) {
    const isRawTx = req.type === 'raw_tx';

    if (isRawTx) {
      elements.pageTitle.textContent = 'HW Transaction Signing';
      elements.signTypeBadge.textContent = 'Raw Transaction';
      elements.signTypeBadge.className = 'sign-badge sign-badge--rawtx';
      elements.signTypeValue.textContent = 'Raw Transaction';
      elements.messageCardTitle.textContent = 'Warning';
      elements.messageValue.textContent = 'This operation will sign a raw transaction on your hardware wallet.\nConfirm the transaction details on your device screen.';
      elements.sighashRow.classList.remove('hidden');
      elements.sighashValue.textContent = req.sighashType || 'ALL';
      elements.inputsRow.classList.remove('hidden');
      elements.inputsValue.textContent = (req.utxos || []).length || '--';
    } else {
      elements.pageTitle.textContent = 'HW Message Signing';
      elements.signTypeBadge.textContent = 'Message';
      elements.signTypeBadge.className = 'sign-badge sign-badge--msg';
      elements.signTypeValue.textContent = 'Message Signature';
      elements.messageCardTitle.textContent = 'Message to sign';
      elements.messageValue.textContent = req.message || '--';
    }

    elements.originValue.textContent = req.origin || '--';
    elements.addressValue.textContent = req.address || '--';
    elements.networkValue.textContent = req.network || '--';
  }

  // ── Cancel ──────────────────────────────────────────────────────────────

  async function handleCancel() {
    await sendResult({ error: 'User cancelled hardware signing' });
    window.close();
  }

  // ── Connect & Sign ─────────────────────────────────────────────────────

  async function handleConnectAndSign() {
    if (signing) return;
    signing = true;
    elements.connectSignBtn.disabled = true;
    elements.errorText.textContent = '';

    // Use empty filters so the browser serial picker shows all devices
    // (Chrome extension context may restrict filtered requestPort)
    const device = new NeuraiSignESP32.NeuraiESP32({ filters: [] });

    try {
      // Step 1: Connect
      setStatus('connecting', 'Select your ESP32 device in the browser dialog...');
      await device.connect();

      setStatus('connecting', 'Reading device info...');
      const info = await device.getInfo();

      // Validate network
      const expectedNetwork = request.network === 'xna-test' ? 'NeuraiTest' : 'Neurai';
      if (info.network && info.network !== expectedNetwork) {
        throw new Error('Device is configured for ' + info.network + ' but the addon expects ' + expectedNetwork);
      }

      // Step 2: Sign
      if (request.type === 'message') {
        await signMessage(device, info);
      } else if (request.type === 'raw_tx') {
        await signRawTransaction(device, info);
      } else {
        throw new Error('Unknown signing request type: ' + request.type);
      }
    } catch (err) {
      if (err && (err.name === 'NotFoundError' || String(err.message || '').includes('No port selected'))) {
        setStatus('error', 'Device selection cancelled');
        elements.errorText.textContent = 'No device was selected.';
      } else {
        setStatus('error', 'Signing failed');
        elements.errorText.textContent = err.message || 'Unknown error';
      }
      signing = false;
      elements.connectSignBtn.disabled = false;
    } finally {
      try { await device.disconnect(); } catch (_) { }
    }
  }

  // ── Message signing ────────────────────────────────────────────────────

  async function signMessage(device, info) {
    setStatus('confirm', 'Confirm message signing on your device...');
    const result = await device.signMessage(request.message);

    setStatus('success', 'Message signed successfully');
    await sendResult({
      type: 'message',
      signature: result.signature,
      address: result.address
    });

    setTimeout(() => window.close(), 800);
  }

  // ── Raw transaction signing ────────────────────────────────────────────

  async function signRawTransaction(device, info) {
    setStatus('connecting', 'Preparing transaction...');

    // We need to get the device's address/pubkey info for PSBT construction
    setStatus('confirm', 'Confirm address export on your device...');
    const addrResp = await device.getAddress();

    setStatus('connecting', 'Fetching input transaction data...');

    // Fetch full raw transactions for each UTXO input (required for nonWitnessUtxo)
    const utxos = request.utxos || [];
    const enrichedUtxos = await enrichUtxosWithRawTx(utxos, request.network);

    setStatus('connecting', 'Building PSBT...');

    // Build PSBT from the raw transaction hex
    const networkType = request.network === 'xna-test' ? 'xna-test' : 'xna';
    const psbtBase64 = NeuraiSignESP32.buildPSBTFromRawTransaction({
      network: networkType,
      rawTransactionHex: request.txHex,
      utxos: enrichedUtxos,
      pubkey: addrResp.pubkey,
      masterFingerprint: info.master_fingerprint,
      derivationPath: addrResp.path
    });

    // Send to device for signing
    setStatus('confirm', 'Review and confirm the transaction on your device...');
    const signResult = await device.signPsbt(psbtBase64);

    // Finalize
    setStatus('connecting', 'Finalizing transaction...');
    const finalized = NeuraiSignESP32.finalizeSignedPSBT(psbtBase64, signResult.psbt, networkType);

    setStatus('success', 'Transaction signed successfully');
    await sendResult({
      type: 'raw_tx',
      signedTxHex: finalized.txHex,
      complete: true
    });

    setTimeout(() => window.close(), 800);
  }

  // ── Fetch raw transactions for UTXOs via RPC ───────────────────────────

  async function enrichUtxosWithRawTx(utxos, network) {
    const rpcUrl = network === 'xna-test'
      ? (C.RPC_URL_TESTNET || 'https://rpc-testnet.neurai.org/rpc')
      : (C.RPC_URL || 'https://rpc-main.neurai.org/rpc');

    // Collect unique txids
    const txids = [...new Set(utxos.map(u => u.txid).filter(Boolean))];

    // Fetch raw tx hex for each txid
    const rawTxMap = {};
    for (const txid of txids) {
      try {
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '1.0',
            id: 'hw-sign-rawtx',
            method: 'getrawtransaction',
            params: [txid, 0]
          })
        });
        const data = await response.json();
        if (data.result) {
          rawTxMap[txid] = data.result;
        }
      } catch (err) {
        console.warn('Failed to fetch raw tx for ' + txid + ':', err);
      }
    }

    return utxos.map(u => ({
      txid: u.txid,
      vout: u.vout,
      value: Math.round((u.amount || 0) * 1e8),
      rawTxHex: rawTxMap[u.txid] || null
    }));
  }

  // ── Send result back to background ─────────────────────────────────────

  async function sendResult(result) {
    await chrome.runtime.sendMessage({
      type: MSG.HW_SIGN_RESULT,
      requestId: requestId,
      ...result
    });
  }

  // ── Boot ───────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
