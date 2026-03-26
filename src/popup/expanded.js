// Neurai Wallet — Full-tab expanded view
// Relies on globals loaded before this script:
//   NeuraiKey               (from ../lib/)
//   NeuraiReader            (from ../lib/)
//   NEURAI_CONSTANTS, NEURAI_UTILS  (from ../shared/)

(function () {
  'use strict';

  const C = NEURAI_CONSTANTS;

  // ── Persistent HW device connection ─────────────────────────────────────
  let hwDevice = null; // NeuraiESP32 instance, kept alive while expanded is open
  let hwStatusInterval = null;

  const elements = {
    // Header
    refreshBtn: document.getElementById('refreshBtn'),
    headerSubtitle: document.getElementById('headerSubtitle'),

    // Sections
    setupSection: document.getElementById('setupSection'),
    mnemonicSection: document.getElementById('mnemonicSection'),
    walletSection: document.getElementById('walletSection'),

    // Wallet display
    copyAddressBtn: document.getElementById('copyAddressBtn'),
    networkValue: document.getElementById('networkValue'),
    accountValue: document.getElementById('accountValue'),
    statusValue: document.getElementById('statusValue'),
    hwStatusDot: document.getElementById('hwStatusDot'),
    addressValue: document.getElementById('addressValue'),
    balanceValue: document.getElementById('balanceValue'),
    pendingValue: document.getElementById('pendingValue'),
    balanceTabGeneral: document.getElementById('balanceTabGeneral'),
    balanceTabAssets: document.getElementById('balanceTabAssets'),
    balancePanelGeneral: document.getElementById('balancePanelGeneral'),
    balancePanelAssets: document.getElementById('balancePanelAssets'),
    assetsList: document.getElementById('assetsList'),
    assetsEmpty: document.getElementById('assetsEmpty'),
    historyList: document.getElementById('historyList'),
    historyEmpty: document.getElementById('historyEmpty'),
    unlockModal: document.getElementById('unlockModal'),
    unlockPinInput: document.getElementById('unlockPinInput'),
    unlockError: document.getElementById('unlockError'),
    unlockConfirmBtn: document.getElementById('unlockConfirmBtn'),
    unlockPrimaryView: document.getElementById('unlockPrimaryView'),
    unlockForgotPinLink: document.getElementById('unlockForgotPinLink'),
    unlockResetView: document.getElementById('unlockResetView'),
    unlockResetInput: document.getElementById('unlockResetInput'),
    unlockResetMessage: document.getElementById('unlockResetMessage'),
    unlockResetCancelBtn: document.getElementById('unlockResetCancelBtn'),
    unlockResetConfirmBtn: document.getElementById('unlockResetConfirmBtn'),

    hwStatusRow: document.getElementById('hwStatusRow'),
    hwStatusText: document.getElementById('hwStatusText'),
    hwReconnectBtn: document.getElementById('hwReconnectBtn')
  };

  let state = {
    wallet: null,
    accounts: null,
    activeAccountId: '1',
    settings: { ...C.DEFAULT_SETTINGS },
    assets: [],
    unlockUntil: 0,
    sessionPin: '',
    lockWatchInterval: null,
    lastUnlockTouchAt: 0
  };

  // ── Initialization ─────────────────────────────────────────────────────────

  async function init() {
    await loadState();
    await loadSessionPinState();
    NEURAI_UTILS.applyTheme(state.settings);
    bindEvents();
    startLockWatch();

    if (state.wallet && state.wallet.address) {
      if (isAddonLocked()) {
        openUnlockModal();
        return;
      }
      showWalletSection();
      await refreshBalance();
    } else {
      // Redirect to onboarding
      window.location.href = chrome.runtime.getURL('onboarding/welcome.html');
      return;
    }
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  function bindEvents() {
    elements.refreshBtn.addEventListener('click', handleRefresh);
    elements.balanceTabGeneral.addEventListener('click', () => switchBalanceTab('general'));
    elements.balanceTabAssets.addEventListener('click', () => switchBalanceTab('assets'));
    elements.copyAddressBtn.addEventListener('click', copyAddress);
    if (elements.hwReconnectBtn) elements.hwReconnectBtn.addEventListener('click', handleHwReconnect);
    elements.unlockForgotPinLink.addEventListener('click', openUnlockResetView);
    elements.unlockForgotPinLink.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openUnlockResetView();
      }
    });
    elements.unlockResetInput.addEventListener('input', () => {
      elements.unlockResetMessage.textContent = '';
    });
    elements.unlockResetInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleResetAddonDataAndClose();
      }
    });
    elements.unlockResetCancelBtn.addEventListener('click', showUnlockMainView);
    elements.unlockResetConfirmBtn.addEventListener('click', handleResetAddonDataAndClose);
    elements.unlockConfirmBtn.addEventListener('click', handleUnlock);

    const sessionActivityEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    sessionActivityEvents.forEach((eventName) => {
      document.addEventListener(eventName, () => { touchUnlockSession(); }, { passive: true });
    });
  }

  // ── Section visibility ─────────────────────────────────────────────────────

  function showSetupSection() {
    // Redirect to onboarding page
    window.location.href = chrome.runtime.getURL('onboarding/welcome.html');
  }

  function showWalletSection() {
    if (isAddonLocked()) {
      openUnlockModal();
      return;
    }
    elements.headerSubtitle.textContent = 'Full tab view';
    elements.refreshBtn.style.display = '';
    if (elements.setupSection) elements.setupSection.classList.add('hidden');
    elements.mnemonicSection.classList.add('hidden');
    elements.walletSection.classList.remove('hidden');
    renderWalletInfo();
    renderHistory();
    touchUnlockSession(true);

    const wallet = state.wallet || {};
    if (wallet.walletType === 'hardware') {
      startHwStatusMonitor();
    } else {
      stopHwStatusMonitor();
    }
  }

  // ── History ────────────────────────────────────────────────────────────────

  function renderHistory() {
    elements.historyList.innerHTML = '';
    const activeAccount = state.accounts && state.accounts[state.activeAccountId];
    const history = activeAccount?.history || [];

    if (history.length === 0) {
      elements.historyEmpty.classList.remove('hidden');
      elements.historyList.appendChild(elements.historyEmpty);
      return;
    }

    elements.historyEmpty.classList.add('hidden');

    history.forEach(item => {
      const el = document.createElement('div');
      el.className = 'history-item';

      const isRawTx = item.type === 'raw_tx';

      // Header: origin + date
      const header = document.createElement('div');
      header.className = 'history-item-header';
      const dateStr = new Date(item.timestamp).toLocaleString();
      header.innerHTML = `<span class="history-item-origin">${escapeHtml(item.origin)}</span><span>${escapeHtml(dateStr)}</span>`;

      // Type badge row
      const meta = document.createElement('div');
      meta.className = 'history-item-meta';
      if (isRawTx) {
        meta.innerHTML = `<span class="history-item-badge history-item-badge--rawtx">RAW TX</span>
          <span class="history-item-meta-detail">Sighash: <strong>${escapeHtml(item.sighashType || 'ALL')}</strong></span>
          <span class="history-item-meta-detail">Inputs: <strong>${item.inputCount ?? '?'}</strong></span>`;
      } else {
        meta.innerHTML = `<span class="history-item-badge history-item-badge--msg">MSG</span>`;
      }

      el.appendChild(header);
      el.appendChild(meta);

      if (isRawTx) {
        // Expandable raw TX hex block
        const expandBtn = document.createElement('button');
        expandBtn.className = 'history-item-expand-btn';
        expandBtn.type = 'button';
        expandBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M5 7L1 3h8L5 7z"/></svg> Show raw TX`;

        const details = document.createElement('div');
        details.className = 'history-item-details hidden';

        const txLabel = document.createElement('div');
        txLabel.className = 'history-item-details-label';
        txLabel.textContent = 'Signed transaction hex:';

        const txHex = document.createElement('div');
        txHex.className = 'history-item-sig history-item-txhex';
        txHex.textContent = item.signedTxHex || item.txHex || '';

        details.appendChild(txLabel);
        details.appendChild(txHex);

        expandBtn.addEventListener('click', () => {
          const hidden = details.classList.toggle('hidden');
          expandBtn.innerHTML = hidden
            ? `<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M5 7L1 3h8L5 7z"/></svg> Show raw TX`
            : `<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M5 3l4 4H1L5 3z"/></svg> Hide raw TX`;
        });

        el.appendChild(expandBtn);
        el.appendChild(details);
      } else {
        const msg = document.createElement('div');
        msg.className = 'history-item-msg';
        msg.title = item.message;
        msg.textContent = item.message;

        const sig = document.createElement('div');
        sig.className = 'history-item-sig';
        sig.textContent = item.signature;

        el.appendChild(msg);
        el.appendChild(sig);
      }

      elements.historyList.appendChild(el);
    });
  }

  // ── Balance & display ──────────────────────────────────────────────────────

  async function handleRefresh() {
    await loadState();
    NEURAI_UTILS.applyTheme(state.settings);
    if (state.wallet && state.wallet.address) {
      showWalletSection();
      await refreshBalance();
    } else {
      showSetupSection();
    }
  }

  function renderWalletInfo() {
    if (!state.wallet) return;
    const network = state.wallet.network || 'xna';
    elements.networkValue.textContent = network === 'xna-test' ? 'Testnet' : 'Mainnet';
    elements.accountValue.textContent = 'Neurai_' + state.activeAccountId;
    elements.addressValue.textContent = state.wallet.address || '--';
  }

  async function refreshBalance() {
    if (isAddonLocked()) {
      openUnlockModal();
      return;
    }
    if (!state.wallet || !state.wallet.address) return;

    elements.statusValue.textContent = 'Loading…';

    applyReaderConfig(state.wallet.network || 'xna');

    try {
      const balanceData = await NeuraiReader.getNeuraiBalance(state.wallet.address);
      const pendingDelta = await NeuraiReader.getPendingBalanceFromAddressMempool(state.wallet.address, 'XNA');
      const balance = NeuraiReader.formatBalance(balanceData.balance);
      const pending = NeuraiReader.formatBalance(pendingDelta);
      const assetBalance = await NeuraiReader.getAssetBalance(state.wallet.address);
      state.assets = normalizeAssetsFromRpc(assetBalance);
      renderAmount(elements.balanceValue, balance, '0');
      renderAmount(elements.pendingValue, pending, '0');
      renderAssetsList();
      elements.statusValue.textContent = 'Connected';
      renderHistory();
    } catch (error) {
      elements.statusValue.textContent = 'RPC error';
      state.assets = [];
      renderAssetsList();
      renderAmount(elements.balanceValue, '--', '0');
      renderAmount(elements.pendingValue, '--', '0');
    }
  }

  function formatAmountParts(value, fallback = '0') {
    const raw = String(value ?? '').trim();
    if (!raw || raw === '--') return { integer: '--', decimals: '' };
    const normalized = raw.replace(/,/g, '');
    if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
      return { integer: fallback, decimals: '' };
    }
    const [intPart, decPart = ''] = normalized.split('.');
    return { integer: intPart, decimals: decPart.replace(/0+$/, '') };
  }

  function renderAmount(element, value, fallback = '0') {
    const { integer, decimals } = formatAmountParts(value, fallback);
    element.textContent = '';
    const intNode = document.createElement('span');
    intNode.className = 'amount-int';
    intNode.textContent = integer;
    element.appendChild(intNode);
    if (decimals) {
      const decNode = document.createElement('span');
      decNode.className = 'amount-dec';
      decNode.textContent = '.' + decimals;
      element.appendChild(decNode);
    }
  }

  function formatAssetAmount(amount, decimals) {
    const fixed = Number(amount || 0).toFixed(decimals);
    const trimmed = fixed.replace(/\.?0+$/, '');
    return trimmed || '0';
  }

  function normalizeAssetsFromRpc(assetBalance) {
    let rows = [];
    if (Array.isArray(assetBalance)) {
      rows = assetBalance;
    } else if (assetBalance && Array.isArray(assetBalance.assets)) {
      rows = assetBalance.assets;
    } else if (assetBalance && typeof assetBalance === 'object') {
      rows = Object.keys(assetBalance).map((assetName) => ({
        assetName,
        balance: assetBalance[assetName]
      }));
    }

    return rows
      .map((asset) => {
        const name = String(asset.assetName || asset.name || '').trim();
        if (!name || name.toUpperCase() === 'XNA') return null;
        const decimals = (typeof asset.divisible === 'boolean')
          ? (asset.divisible ? 8 : 0)
          : 8;
        const amount = Number(asset.balance || 0) / Math.pow(10, decimals);
        return { name, amountText: formatAssetAmount(amount, decimals) };
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }

  function renderAssetsList() {
    if (!state.assets.length) {
      elements.assetsList.innerHTML = '';
      elements.assetsEmpty.classList.remove('hidden');
      return;
    }
    elements.assetsEmpty.classList.add('hidden');
    elements.assetsList.innerHTML = state.assets.map((asset) =>
      `<div class="asset-item"><span class="asset-name" title="${escapeHtml(asset.name)}">${escapeHtml(asset.name)}</span><span class="asset-balance">${escapeHtml(asset.amountText)}</span></div>`
    ).join('');
  }

  function switchBalanceTab(tab) {
    const showAssets = tab === 'assets';
    elements.balanceTabGeneral.classList.toggle('is-active', !showAssets);
    elements.balanceTabGeneral.setAttribute('aria-selected', showAssets ? 'false' : 'true');
    elements.balanceTabAssets.classList.toggle('is-active', showAssets);
    elements.balanceTabAssets.setAttribute('aria-selected', showAssets ? 'true' : 'false');
    elements.balancePanelGeneral.classList.toggle('hidden', showAssets);
    elements.balancePanelAssets.classList.toggle('hidden', !showAssets);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function applyReaderConfig(network) {
    if (network === 'xna-test') NeuraiReader.setTestnet(); else NeuraiReader.setMainnet();
    const rpcUrl = network === 'xna-test' ? state.settings.rpcTestnet : state.settings.rpcMainnet;
    if (rpcUrl) NeuraiReader.setURL(rpcUrl);
  }

  function copyAddress() {
    const address = elements.addressValue.textContent;
    if (!address || address === '--') return;
    navigator.clipboard.writeText(address).catch(() => { });
  }

  // ── Storage ────────────────────────────────────────────────────────────────

  async function loadState() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        [C.STORAGE_KEY, C.ACCOUNTS_KEY, C.ACTIVE_ACCOUNT_KEY, C.SETTINGS_KEY, C.UNLOCK_UNTIL_KEY],
        (result) => {
          state.accounts = result[C.ACCOUNTS_KEY] || null;
          state.activeAccountId = String(result[C.ACTIVE_ACCOUNT_KEY] || '1');
          const activeWallet = state.accounts && state.accounts[state.activeAccountId]
            ? state.accounts[state.activeAccountId]
            : null;
          state.wallet = activeWallet || result[C.STORAGE_KEY] || null;
          state.settings = { ...C.DEFAULT_SETTINGS, ...(result[C.SETTINGS_KEY] || {}) };
          state.unlockUntil = Number(result[C.UNLOCK_UNTIL_KEY] || 0);
          resolve();
        }
      );
    });
  }

  async function loadSessionPinState() {
    if (!chrome.storage?.session) return;
    return new Promise((resolve) => {
      chrome.storage.session.get(C.SESSION_PIN_KEY, (result) => {
        state.sessionPin = state.unlockUntil > Date.now()
          ? String(result[C.SESSION_PIN_KEY] || '')
          : '';
        resolve();
      });
    });
  }

  async function persistSessionPin(pin) {
    state.sessionPin = pin || '';
    if (chrome.storage?.session) {
      await new Promise((resolve) => {
        if (state.sessionPin) {
          chrome.storage.session.set({ [C.SESSION_PIN_KEY]: state.sessionPin }, resolve);
        } else {
          chrome.storage.session.remove(C.SESSION_PIN_KEY, resolve);
        }
      });
    }
    try {
      await chrome.runtime.sendMessage({
        type: state.sessionPin ? C.MSG.SET_SESSION_PIN : C.MSG.CLEAR_SESSION_PIN,
        pin: state.sessionPin
      });
    } catch (_) { }
  }

  function hasActiveWallet() {
    return !!(state.wallet && state.wallet.address);
  }

  function isAddonLocked() {
    if (!hasActiveWallet()) return false;
    if (!state.settings?.pinHash) return false;
    return state.unlockUntil <= Date.now();
  }

  function openUnlockModal() {
    if (!state.settings?.pinHash || !hasActiveWallet()) return;
    if (!elements.unlockModal.classList.contains('hidden')) return;
    if (elements.setupSection) elements.setupSection.classList.add('hidden');
    elements.mnemonicSection.classList.add('hidden');
    elements.walletSection.classList.add('hidden');
    showUnlockMainView();
    elements.unlockError.textContent = '';
    elements.unlockPinInput.value = '';
    elements.unlockModal.classList.remove('hidden');
    elements.unlockPinInput.focus();
  }

  function closeUnlockModal() {
    if (isAddonLocked()) return;
    elements.unlockModal.classList.add('hidden');
  }

  function showUnlockMainView() {
    elements.unlockPrimaryView.classList.remove('hidden');
    elements.unlockResetView.classList.add('hidden');
    elements.unlockError.textContent = '';
    elements.unlockPinInput.value = '';
    elements.unlockResetInput.value = '';
    elements.unlockResetMessage.textContent = '';
  }

  function openUnlockResetView() {
    elements.unlockPrimaryView.classList.add('hidden');
    elements.unlockResetView.classList.remove('hidden');
    elements.unlockResetInput.value = '';
    elements.unlockResetMessage.textContent = '';
    elements.unlockResetInput.focus();
  }

  async function handleResetAddonDataAndClose() {
    if ((elements.unlockResetInput.value || '').trim() !== 'RESET') {
      elements.unlockResetMessage.textContent = 'Incorrect word. Please type RESET to confirm account restore.';
      return;
    }

    try {
      await resetAddonData();
      closeUnlockModal();
      showSetupSection();
    } catch (error) {
      elements.unlockResetMessage.textContent = error.message || 'Unable to reset addon data.';
    }
  }

  async function resetAddonData() {
    state.accounts = createDefaultAccounts();
    state.activeAccountId = '1';
    state.wallet = null;
    state.settings = { ...C.DEFAULT_SETTINGS, pinHash: '' };
    state.unlockUntil = 0;
    await persistSessionPin('');

    await new Promise((resolve) => {
      chrome.storage.local.set({
        [C.ACCOUNTS_KEY]: state.accounts,
        [C.ACTIVE_ACCOUNT_KEY]: state.activeAccountId,
        [C.STORAGE_KEY]: null,
        [C.SETTINGS_KEY]: state.settings,
        [C.UNLOCK_UNTIL_KEY]: 0
      }, resolve);
    });
  }

  function createDefaultAccounts() {
    const accounts = {};
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) accounts[String(i)] = null;
    return accounts;
  }

  async function unlockForConfiguredTimeout() {
    const minutes = NEURAI_UTILS.normalizeLockTimeoutMinutes(state.settings?.lockTimeoutMinutes);
    state.unlockUntil = Date.now() + minutes * 60 * 1000;
    return new Promise((resolve) => {
      chrome.storage.local.set({ [C.UNLOCK_UNTIL_KEY]: state.unlockUntil }, resolve);
    });
  }

  function touchUnlockSession(force = false) {
    if (!state.settings?.pinHash || !hasActiveWallet()) return;
    if (isAddonLocked()) return;
    const now = Date.now();
    if (!force && now - state.lastUnlockTouchAt < 5000) return;
    state.lastUnlockTouchAt = now;
    unlockForConfiguredTimeout().catch(() => { });
  }

  function startLockWatch() {
    stopLockWatch();
    state.lockWatchInterval = setInterval(() => {
      if (isAddonLocked() && elements.unlockModal.classList.contains('hidden')) openUnlockModal();
    }, 1000);
  }

  function stopLockWatch() {
    if (!state.lockWatchInterval) return;
    clearInterval(state.lockWatchInterval);
    state.lockWatchInterval = null;
  }

  async function handleUnlock() {
    const entered = (elements.unlockPinInput.value || '').trim();
    if (!entered) {
      elements.unlockError.textContent = 'PIN is required.';
      return;
    }
    const hash = await NEURAI_UTILS.hashText(entered);
    if (hash !== state.settings.pinHash) {
      elements.unlockError.textContent = 'Invalid PIN.';
      return;
    }
    await persistSessionPin(entered);
    await unlockForConfiguredTimeout();
    state.lastUnlockTouchAt = Date.now();
    closeUnlockModal();
    if (hasActiveWallet()) {
      showWalletSection();
      await refreshBalance();
    } else {
      showSetupSection();
    }
  }

  async function persistWallet(walletData) {
    // Update state
    state.wallet = walletData;
    if (!state.accounts || typeof state.accounts !== 'object') {
      state.accounts = {};
    }
    state.accounts[state.activeAccountId] = walletData;

    return new Promise((resolve) => {
      chrome.storage.local.set({
        [C.ACCOUNTS_KEY]: state.accounts,
        [C.ACTIVE_ACCOUNT_KEY]: state.activeAccountId,
        [C.STORAGE_KEY]: walletData
      }, resolve);
    });
  }

  // ── HW connection status monitoring ──────────────────────────────────────

  function startHwStatusMonitor() {
    stopHwStatusMonitor();
    updateHwConnectionUI();
    hwStatusInterval = setInterval(updateHwConnectionUI, 2000);
  }

  function stopHwStatusMonitor() {
    if (hwStatusInterval) {
      clearInterval(hwStatusInterval);
      hwStatusInterval = null;
    }
  }

  function updateHwConnectionUI() {
    const wallet = state.wallet || {};
    if (wallet.walletType !== 'hardware') {
      if (elements.hwStatusRow) elements.hwStatusRow.classList.add('hidden');
      return;
    }

    if (elements.hwStatusRow) elements.hwStatusRow.classList.remove('hidden');
    const isConnected = !!(hwDevice && hwDevice.connected);

    if (elements.hwStatusDot) {
      elements.hwStatusDot.style.background = isConnected ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)';
      elements.hwStatusDot.title = isConnected ? 'Connected' : 'Disconnected';
    }
    if (elements.hwStatusText) {
      elements.hwStatusText.textContent = isConnected ? 'Connected' : 'Disconnected';
      elements.hwStatusText.style.color = isConnected ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)';
    }
    if (elements.hwReconnectBtn) {
      elements.hwReconnectBtn.classList.toggle('hidden', isConnected);
    }
    if (elements.statusValue) {
      elements.statusValue.textContent = isConnected ? 'HW Connected' : 'HW Disconnected';
    }
  }

  async function handleHwReconnect() {
    if (!elements.hwReconnectBtn) return;
    elements.hwReconnectBtn.disabled = true;
    elements.hwReconnectBtn.textContent = 'Connecting...';
    try {
      await reconnectHwDevice();
      alert('Hardware wallet reconnected');
    } catch (err) {
      if (!isSerialPortSelectionCancelled(err)) {
        alert('Reconnection failed: ' + err.message);
      }
    } finally {
      elements.hwReconnectBtn.disabled = false;
      elements.hwReconnectBtn.textContent = 'Reconnect';
      updateHwConnectionUI();
    }
  }

  async function reconnectHwDevice() {
    if (hwDevice) {
      try { await hwDevice.disconnect(); } catch (_) { }
      hwDevice = null;
    }
    const device = new NeuraiSignESP32.NeuraiESP32({ filters: [] });
    await device.connect();
    const info = await device.getInfo();
    const wallet = state.wallet || {};
    const expectedNetwork = (wallet.network || 'xna') === 'xna-test' ? 'NeuraiTest' : 'Neurai';
    if (info.network && info.network !== expectedNetwork) {
      await device.disconnect();
      throw new Error('Device is ' + info.network + ', expected ' + expectedNetwork);
    }
    hwDevice = device;
  }

  async function requestHardwareWalletAddress() {
    if (hwDevice) {
      try { await hwDevice.disconnect(); } catch (_) { }
      hwDevice = null;
    }

    const device = new NeuraiSignESP32.NeuraiESP32({ filters: [] });
    await device.connect();
    const info = await device.getInfo();
    const addrResp = await device.getAddress();

    // Keep the device connected for future signing requests
    hwDevice = device;

    return {
      deviceName: info.device || 'NeuraiHW',
      deviceNetwork: info.network || null,
      firmwareVersion: info.version || null,
      address: addrResp.address,
      publicKey: addrResp.pubkey,
      derivationPath: addrResp.path || null,
      masterFingerprint: info.master_fingerprint || null
    };
  }

  function validateHardwareWalletNetwork(selectedNetwork, deviceNetwork) {
    const expectedNetwork = selectedNetwork === 'xna-test' ? 'NeuraiTest' : 'Neurai';
    if (deviceNetwork && deviceNetwork !== expectedNetwork) {
      throw new Error(
        'The ESP32 is configured for ' + deviceNetwork + ' but the addon is set to ' + expectedNetwork
      );
    }
  }

  function isSerialPortSelectionCancelled(error) {
    return !!(error && (
      error.name === 'NotFoundError' ||
      String(error.message || '').includes('No port selected by the user')
    ));
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[C.UNLOCK_UNTIL_KEY]) {
      state.unlockUntil = Number(changes[C.UNLOCK_UNTIL_KEY].newValue || 0);
    }
  });

  // ── HW signing requests from background ─────────────────────────────────

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === C.MSG.HW_SIGN_MESSAGE) {
      if (!hwDevice || !hwDevice.connected) return false;
      handleHwSignMessage(message).then(sendResponse);
      return true;
    }
    if (message.type === C.MSG.HW_SIGN_RAW_TX) {
      if (!hwDevice || !hwDevice.connected) return false;
      handleHwSignRawTx(message).then(sendResponse);
      return true;
    }
  });

  async function handleHwSignMessage(message) {
    if (!hwDevice || !hwDevice.connected) {
      return { error: 'Hardware wallet is not connected. Click Reconnect in the addon.' };
    }
    try {
      const result = await hwDevice.signMessage(message.message);
      return { success: true, signature: result.signature, address: result.address };
    } catch (err) {
      updateHwConnectionUI();
      return { error: 'HW sign failed: ' + err.message };
    }
  }

  async function handleHwSignRawTx(message) {
    if (!hwDevice || !hwDevice.connected) {
      return { error: 'Hardware wallet is not connected. Click Reconnect in the addon.' };
    }
    try {
      const info = hwDevice.info || await hwDevice.getInfo();
      const addrResp = await hwDevice.getAddress();
      const wallet = state.wallet || {};
      const network = wallet.network || 'xna';
      const rpcUrl = network === 'xna-test'
        ? (state.settings.rpcTestnet || C.RPC_URL_TESTNET)
        : (state.settings.rpcMainnet || C.RPC_URL);

      const utxos = message.utxos || [];
      const enrichedUtxos = await fetchRawTxForUtxos(utxos, rpcUrl);
      const networkType = network === 'xna-test' ? 'xna-test' : 'xna';
      const psbtBase64 = NeuraiSignESP32.buildPSBTFromRawTransaction({
        network: networkType,
        rawTransactionHex: message.txHex,
        utxos: enrichedUtxos,
        pubkey: addrResp.pubkey,
        masterFingerprint: info.master_fingerprint,
        derivationPath: addrResp.path
      });
      const signResult = await hwDevice.signPsbt(psbtBase64);
      const finalized = NeuraiSignESP32.finalizeSignedPSBT(psbtBase64, signResult.psbt, networkType);
      return { success: true, signedTxHex: finalized.txHex, complete: true };
    } catch (err) {
      updateHwConnectionUI();
      return { error: 'HW sign failed: ' + err.message };
    }
  }

  async function fetchRawTxForUtxos(utxos, rpcUrl) {
    const txids = [...new Set(utxos.map(u => u.txid).filter(Boolean))];
    const rawTxMap = {};
    for (const txid of txids) {
      try {
        const resp = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '1.0', id: 'hw-rawtx', method: 'getrawtransaction', params: [txid, 0] })
        });
        const data = await resp.json();
        if (data.result) rawTxMap[txid] = data.result;
      } catch (_) { }
    }
    return utxos.map(u => ({
      txid: u.txid, vout: u.vout,
      value: Math.round((u.amount || 0) * 1e8),
      rawTxHex: rawTxMap[u.txid] || null
    }));
  }

  // ── Boot ───────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
