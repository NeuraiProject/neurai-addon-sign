// Neurai Wallet Popup — Main Logic
// Relies on globals loaded before this script:
//   NeuraiKey, NeuraiMessage, NeuraiReader  (from ../lib/)
//   NEURAI_CONSTANTS, NEURAI_UTILS          (from ../shared/)

(function () {
  'use strict';

  // ── Destructure shared globals for convenience ────────────────────────────
  const C = NEURAI_CONSTANTS;
  const MSG = C.MSG;

  // ── Persistent HW device connection ─────────────────────────────────────
  let hwDevice = null; // NeuraiESP32 instance, kept alive while popup is open
  let hwStatusInterval = null; // polling interval for connection status

  // ── DOM Elements ──────────────────────────────────────────────────────────
  const elements = {
    walletSection: document.getElementById('walletSection'),
    networkBadge: document.getElementById('networkBadge'),
    openExpandedBtn: document.getElementById('openExpandedBtn'),
    openSettingsBtn: document.getElementById('openSettingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    accountModal: document.getElementById('accountModal'),
    removeConfirmModal: document.getElementById('removeConfirmModal'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    closeAccountModalBtn: document.getElementById('closeAccountModalBtn'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    resetSettingsBtn: document.getElementById('resetSettingsBtn'),
    confirmRemoveBtn: document.getElementById('confirmRemoveBtn'),
    cancelRemoveBtn: document.getElementById('cancelRemoveBtn'),
    removeConfirmText: document.getElementById('removeConfirmText'),
    themeMode: document.getElementById('themeMode'),
    rpcMainnet: document.getElementById('rpcMainnet'),
    rpcTestnet: document.getElementById('rpcTestnet'),
    lockTimeoutMinutes: document.getElementById('lockTimeoutMinutes'),
    pinStatusText: document.getElementById('pinStatusText'),
    settingsPinOld: document.getElementById('settingsPinOld'),
    settingsPinNew: document.getElementById('settingsPinNew'),
    settingsPinConfirm: document.getElementById('settingsPinConfirm'),
    openBackupBtn: document.getElementById('openBackupBtn'),
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
    accountSelect: document.getElementById('accountSelect'),
    accountCurrentLabel: document.getElementById('accountCurrentLabel'),
    accountHint: document.getElementById('accountHint'),
    switchAccountBtn: document.getElementById('switchAccountBtn'),
    newAccountBtn: document.getElementById('newAccountBtn'),
    currentAccountDisplay: document.getElementById('currentAccountDisplay'),
    lastUpdatedDisplay: document.getElementById('lastUpdatedDisplay'),
    hwIcon: document.getElementById('hwIcon'),
    addressDisplay: document.getElementById('addressDisplay'),
    copyAddressBtn: document.getElementById('copyAddressBtn'),
    xnaBalance: document.getElementById('xnaBalance'),
    pendingBalance: document.getElementById('pendingBalance'),
    balanceTabGeneral: document.getElementById('balanceTabGeneral'),
    balanceTabAssets: document.getElementById('balanceTabAssets'),
    balancePanelGeneral: document.getElementById('balancePanelGeneral'),
    balancePanelAssets: document.getElementById('balancePanelAssets'),
    assetsList: document.getElementById('assetsList'),
    assetsEmpty: document.getElementById('assetsEmpty'),
    refreshBtn: document.getElementById('refreshBtn'),
    changeWalletBtn: document.getElementById('changeWalletBtn'),
    toggleHistoryBtn: document.getElementById('toggleHistoryBtn'),
    toggleHistoryBtnText: document.getElementById('toggleHistoryBtnText'),
    historyCard: document.getElementById('historyCard'),
    historyList: document.getElementById('historyList'),
    historyEmpty: document.getElementById('historyEmpty'),
    lockNowBtn: document.getElementById('lockNowBtn'),
    removeWalletBtn: document.getElementById('removeWalletBtn'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    backupModal: document.getElementById('backupModal'),
    closeBackupBtn: document.getElementById('closeBackupBtn'),
    backupAuthSection: document.getElementById('backupAuthSection'),
    backupPinInput: document.getElementById('backupPinInput'),
    backupError: document.getElementById('backupError'),
    backupUnlockBtn: document.getElementById('backupUnlockBtn'),
    backupDataSection: document.getElementById('backupDataSection'),
    backupMnemonicGroup: document.getElementById('backupMnemonicGroup'),
    backupMnemonicWords: document.getElementById('backupMnemonicWords'),
    backupCopyMnemonicBtn: document.getElementById('backupCopyMnemonicBtn'),
    backupPassphraseGroup: document.getElementById('backupPassphraseGroup'),
    backupPassphraseText: document.getElementById('backupPassphraseText'),
    backupWifText: document.getElementById('backupWifText'),
    toggleBackupWifBtn: document.getElementById('toggleBackupWifBtn'),
    backupCopyWifBtn: document.getElementById('backupCopyWifBtn')
  };

  // ── History ───────────────────────────────────────────────────────────────

  function handleToggleHistory() {
    if (!elements.historyCard || !elements.toggleHistoryBtnText) return;
    const isShowing = !elements.historyCard.classList.contains('hidden');
    const balanceCardMain = document.querySelector('.balance-card-main');
    const addressCard = document.getElementById('addressCard');
    const iconClock = document.getElementById('historyBtnIconClock');
    const iconBalance = document.getElementById('historyBtnIconBalance');

    if (!balanceCardMain || !addressCard || !iconClock || !iconBalance) return;

    if (isShowing) {
      // Switch back to Balance
      elements.historyCard.classList.add('hidden');
      balanceCardMain.classList.remove('hidden');
      addressCard.classList.remove('hidden');
      elements.toggleHistoryBtnText.textContent = 'History';
      iconClock.style.display = '';
      iconBalance.style.display = 'none';
    } else {
      // Show History
      balanceCardMain.classList.add('hidden');
      addressCard.classList.add('hidden');
      elements.historyCard.classList.remove('hidden');
      elements.toggleHistoryBtnText.textContent = 'Balance';
      iconClock.style.display = 'none';
      iconBalance.style.display = '';
      renderHistory();
    }
  }

  function renderHistory() {
    elements.historyList.innerHTML = '';
    const activeAccount = state.accounts[state.activeAccountId];
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
      header.innerHTML = `
        <span class="history-item-origin">${item.origin}</span>
        <span>${dateStr}</span>
      `;

      // Type badge row
      const meta = document.createElement('div');
      meta.className = 'history-item-meta';
      if (isRawTx) {
        const rawTxLabel = getRawTxHistoryLabel(item);
        meta.innerHTML = `<span class="history-item-badge history-item-badge--rawtx">${escapeHtml(rawTxLabel)}</span>
          <span class="history-item-meta-detail">Sighash: <strong>${item.sighashType || 'ALL'}</strong></span>
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

  // ── State ─────────────────────────────────────────────────────────────────
  let state = {
    privateKey: null,
    mnemonic: null,
    passphrase: null,
    address: null,
    publicKey: null,
    walletType: 'software',
    network: 'xna',
    balance: null,
    pendingBalance: null,
    lastPortfolioUpdatedAt: 0,
    assets: [],
    pollingInterval: null,
    isConnected: false,
    settings: null,
    accounts: {},
    activeAccountId: '1',
    unlockUntil: 0,
    sessionPin: '',
    lockWatchInterval: null,
    lastUnlockTouchAt: 0
  };

  // ── Initialization ────────────────────────────────────────────────────────

  async function init() {
    await loadSettings();
    await loadWalletData();
    await loadUnlockState();
    await loadSessionPinState();
    NEURAI_UTILS.applyTheme(state.settings);
    setupEventListeners();
    syncSettingsForm();
    startLockWatch();

    if (hasActiveWallet()) {
      showWalletSection();
      if (isAddonLocked()) {
        openUnlockModal();
      } else {
        await updateBalance();
        startPolling();
      }
    } else {
      // No wallet configured — open onboarding in a full tab
      chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/welcome.html') });
      window.close();
      return;
    }
  }

  function handleOpenExpandedView() {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup/expanded.html') });
  }

  // ── Event listeners ───────────────────────────────────────────────────────

  function setupEventListeners() {
    elements.openExpandedBtn.addEventListener('click', handleOpenExpandedView);
    elements.openSettingsBtn.addEventListener('click', openSettingsModal);
    elements.closeSettingsBtn.addEventListener('click', closeSettingsModal);
    elements.closeAccountModalBtn.addEventListener('click', closeAccountModal);
    elements.saveSettingsBtn.addEventListener('click', handleSaveSettings);
    elements.resetSettingsBtn.addEventListener('click', handleResetSettings);

    elements.openBackupBtn.addEventListener('click', openBackupModal);
    elements.closeBackupBtn.addEventListener('click', closeBackupModal);
    elements.backupUnlockBtn.addEventListener('click', handleBackupUnlock);
    elements.backupCopyMnemonicBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(state.accounts[state.activeAccountId]?.__decryptedMnemonic || '');
      showToast('Recovery phrase copied!', 'success');
    });
    elements.backupCopyWifBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(elements.backupWifText.value);
      showToast('WIF copied!', 'success');
    });

    elements.settingsModal.addEventListener('click', (e) => { if (e.target === elements.settingsModal) closeSettingsModal(); });
    elements.accountModal.addEventListener('click', (e) => { if (e.target === elements.accountModal) closeAccountModal(); });
    elements.removeConfirmModal.addEventListener('click', (e) => { if (e.target === elements.removeConfirmModal) closeRemoveConfirmModal(); });
    elements.unlockModal.addEventListener('click', (e) => {
      if (e.target === elements.unlockModal && !isAddonLocked()) closeUnlockModal();
    });
    elements.backupModal.addEventListener('click', (e) => { if (e.target === elements.backupModal) closeBackupModal(); });

    elements.copyAddressBtn.addEventListener('click', handleCopyAddress);
    elements.refreshBtn.addEventListener('click', handleRefresh);
    elements.balanceTabGeneral.addEventListener('click', () => switchBalanceTab('general'));
    elements.balanceTabAssets.addEventListener('click', () => switchBalanceTab('assets'));
    elements.changeWalletBtn.addEventListener('click', handleChangeWallet);
    elements.toggleHistoryBtn.addEventListener('click', handleToggleHistory);
    elements.lockNowBtn.addEventListener('click', handleLockNow);
    elements.removeWalletBtn.addEventListener('click', handleRemoveWallet);
    elements.switchAccountBtn.addEventListener('click', handleSwitchAccount);
    elements.newAccountBtn.addEventListener('click', handleCreateNewAccount);
    elements.cancelRemoveBtn.addEventListener('click', closeRemoveConfirmModal);
    elements.confirmRemoveBtn.addEventListener('click', handleConfirmRemoveAccount);
    elements.unlockForgotPinLink.addEventListener('click', openUnlockResetView);
    elements.unlockForgotPinLink.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openUnlockResetView();
      }
    });
    elements.unlockConfirmBtn.addEventListener('click', handleUnlock);
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
    elements.backupPinInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleBackupUnlock(); });

    if (elements.network) elements.network.addEventListener('change', applyReaderRpcForCurrentContext);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSettingsModal();
        closeAccountModal();
        closeRemoveConfirmModal();
        if (!isAddonLocked()) closeUnlockModal();
        closeBackupModal();
      }
    });

    const sessionActivityEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    sessionActivityEvents.forEach((eventName) => {
      document.addEventListener(eventName, () => { touchUnlockSession(); }, { passive: true });
    });

    const toggleBtns = [
      { btn: elements.toggleBackupWifBtn, input: elements.backupWifText }
    ];

    toggleBtns.forEach(({ btn, input }) => {
      if (btn && input) {
        btn.addEventListener('click', () => {
          if (input.type === 'password') {
            input.type = 'text';
            if (input.tagName === 'TEXTAREA') input.classList.add('visible');
          } else {
            input.type = 'password';
            if (input.tagName === 'TEXTAREA') input.classList.remove('visible');
          }
        });
      }
    });

  }

  // ── Action handlers ───────────────────────────────────────────────────────

  function handleCopyAddress() {
    if (state.address) {
      navigator.clipboard.writeText(state.address)
        .then(() => showToast('Address copied!', 'success'))
        .catch(() => showToast('Failed to copy', 'error'));
    }
  }

  async function handleRefresh() {
    if (isAddonLocked()) { openUnlockModal(); return; }
    await updateBalance();
    showToast('Balance refreshed', 'success');
  }

  function handleChangeWallet() {
    if (isAddonLocked()) { openUnlockModal(); return; }
    openAccountModal();
  }

  async function handleLockNow() {
    if (!hasActiveWallet()) return;
    if (!state.settings?.pinHash) {
      showToast('Set a PIN in Settings to use lock', 'error');
      return;
    }
    state.unlockUntil = 0;
    await persistSessionPin('');
    state.privateKey = null;
    const active = state.accounts[state.activeAccountId];
    if (active) active.privateKey = null;
    await new Promise((resolve) => chrome.storage.local.set({ [C.UNLOCK_UNTIL_KEY]: 0 }, resolve));
    stopPolling();
    openUnlockModal(true);
    showToast('Addon locked', 'success');
  }

  async function handleRemoveWallet() {
    elements.removeConfirmText.textContent =
      'Warning: this will permanently delete all configured accounts, private keys, and reset your PIN. Do you want to continue?';
    elements.removeConfirmModal.classList.remove('hidden');
  }

  function closeRemoveConfirmModal() {
    elements.removeConfirmModal.classList.add('hidden');
  }

  async function resetAddonData() {
    state.accounts = createDefaultAccounts();
    state.activeAccountId = '1';
    state.settings = { ...C.DEFAULT_SETTINGS, pinHash: '' };
    state.unlockUntil = 0;
    await persistSessionPin('');

    clearActiveWalletData();
    await saveAccountsData();
    await saveSettings();
    await new Promise((r) => chrome.storage.local.set({ [C.UNLOCK_UNTIL_KEY]: 0 }, r));
  }

  async function handleConfirmRemoveAccount() {
    await resetAddonData();
    closeRemoveConfirmModal();
    closeSettingsModal();
    // Redirect to onboarding
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/welcome.html') });
    window.close();
  }

  // ── Balance ───────────────────────────────────────────────────────────────

  async function updateBalance() {
    if (isAddonLocked() || !state.address) return;

    try {
      setLoadingStatus(true);
      applyReaderRpcForCurrentContext();

      const balanceData = await NeuraiReader.getNeuraiBalance(state.address);
      if (balanceData) {
        const pendingDelta = await NeuraiReader.getPendingBalanceFromAddressMempool(state.address, 'XNA');
        state.balance = NeuraiReader.formatBalance(balanceData.balance);
        state.pendingBalance = NeuraiReader.formatBalance(pendingDelta);

        const assetBalance = await NeuraiReader.getAssetBalance(state.address);
        state.assets = normalizeAssetsFromRpc(assetBalance);
        state.lastPortfolioUpdatedAt = Date.now();

        renderAmount(elements.xnaBalance, state.balance, '0');
        renderAmount(elements.pendingBalance, state.pendingBalance, '0');
        renderAssetsList();
        renderLastUpdated();

        state.isConnected = true;
        setConnectionStatus(true);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      state.assets = [];
      renderAssetsList();
      setConnectionStatus(false);
      showToast('Error fetching balance: ' + error.message, 'error');
    } finally {
      setLoadingStatus(false);
    }
  }

  function startPolling() {
    stopPolling();
    state.pollingInterval = setInterval(updateBalance, C.POLLING_INTERVAL_MS);
  }

  function stopPolling() {
    if (state.pollingInterval) {
      clearInterval(state.pollingInterval);
      state.pollingInterval = null;
    }
  }

  // ── UI helpers ────────────────────────────────────────────────────────────

  function showWalletSection() {
    if (elements.setupSection) elements.setupSection.classList.add('hidden');
    elements.walletSection.classList.remove('hidden');
    elements.addressDisplay.textContent = state.address;
    elements.addressDisplay.title = state.address || '';
    elements.openBackupBtn.disabled = state.walletType === 'hardware';
    elements.openBackupBtn.title = state.walletType === 'hardware'
      ? 'Hardware wallet secrets stay on the device'
      : 'Back up wallet secrets';
    updateAccountLabels();

    const isTestnet = state.network === 'xna-test';
    elements.networkBadge.querySelector('span:last-child').textContent = isTestnet ? 'Testnet' : 'Mainnet';

    if (isTestnet) NeuraiReader.setTestnet(); else NeuraiReader.setMainnet();
    applyReaderRpcForCurrentContext();

    // Show HW icon only for hardware accounts.
    const isHw = state.walletType === 'hardware';
    elements.hwIcon.classList.toggle('hidden', !isHw);
    renderLastUpdated();
    if (isHw) {
      startHwStatusMonitor();
    } else {
      stopHwStatusMonitor();
    }

    if (isAddonLocked()) {
      openUnlockModal();
      return;
    }
    touchUnlockSession(true);
  }

  function showToast(message, type = 'success') {
    elements.toastMessage.textContent = message;
    elements.toast.className = 'toast ' + type;
    setTimeout(() => elements.toast.classList.add('hidden'), 3000);
  }

  function showLoading(show) {
    elements.loadingOverlay.classList.toggle('hidden', !show);
  }

  function setConnectionStatus() {
    elements.hwIcon.title = 'Hardware wallet';
  }

  function setLoadingStatus(loading) {
    elements.refreshBtn.classList.toggle('loading', loading);
  }

  function formatAmountParts(value, fallback = '0') {
    const raw = String(value ?? '').trim();
    if (!raw || raw === '--') return { integer: '--', decimals: '' };
    const normalized = raw.replace(/,/g, '');
    if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
      return { integer: fallback, decimals: '' };
    }
    const [intPart, decPart = ''] = normalized.split('.');
    const trimmedDecimals = decPart.replace(/0+$/, '');
    return { integer: intPart, decimals: trimmedDecimals };
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
      // Compatibility with endpoints returning { ASSET: balance, ... }.
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

  function getRawTxHistoryLabel(item) {
    const sighash = String(item?.sighashType || 'ALL').trim().toUpperCase();
    if (sighash === 'SINGLE|ANYONECANPAY') return 'Offer';
    if (isSwapUtxoConsolidation(item)) return 'UTXO Consolidation';
    if (isSwapHistoryOrigin(item?.origin)) return 'Purchase';
    return 'Transaction';
  }

  function isSwapUtxoConsolidation(item) {
    return isSwapHistoryOrigin(item?.origin) && Number(item?.inputCount || 0) > 1;
  }

  function isSwapHistoryOrigin(origin) {
    return /swap\.neurai\.org/i.test(String(origin || ''));
  }

  // ── Storage ───────────────────────────────────────────────────────────────

  async function loadWalletData() {
    return new Promise((resolve) => {
      chrome.storage.local.get([C.STORAGE_KEY, C.ACCOUNTS_KEY, C.ACTIVE_ACCOUNT_KEY], async (result) => {
        const legacyWallet = result[C.STORAGE_KEY] || null;
        state.accounts = normalizeAccounts(result[C.ACCOUNTS_KEY]);
        state.activeAccountId = normalizeAccountId(result[C.ACTIVE_ACCOUNT_KEY], '1');

        const hasAny = getConfiguredAccountIds(state.accounts).length > 0;
        if (!hasAny && legacyWallet && (legacyWallet.privateKey || legacyWallet.privateKeyEnc)) {
          state.accounts['1'] = {
            privateKey: legacyWallet.privateKey || null,
            privateKeyEnc: legacyWallet.privateKeyEnc || null,
            mnemonic: legacyWallet.mnemonic || null,
            mnemonicEnc: legacyWallet.mnemonicEnc || null,
            passphrase: legacyWallet.passphrase || null,
            passphraseEnc: legacyWallet.passphraseEnc || null,
            address: legacyWallet.address || null,
            publicKey: legacyWallet.publicKey || null,
            network: legacyWallet.network || 'xna'
          };
          state.activeAccountId = '1';
          await saveAccountsData();
        }

        const activeWallet = getActiveWalletData();
        if (activeWallet) {
          state.address = activeWallet.address || null;
          state.publicKey = activeWallet.publicKey || null;
          state.walletType = activeWallet.walletType || 'software';
          state.network = activeWallet.network || 'xna';
          state.privateKey = (!state.settings?.pinHash && activeWallet.privateKey) ? activeWallet.privateKey : null;
          state.mnemonic = (!state.settings?.pinHash && activeWallet.mnemonic) ? activeWallet.mnemonic : null;
          state.passphrase = (!state.settings?.pinHash && activeWallet.passphrase) ? activeWallet.passphrase : null;
        } else {
          clearActiveWalletData();
        }
        updateAccountLabels();
        resolve();
      });
    });
  }

  async function saveAccountsData(pinOverride = '') {
    if (state.settings?.pinHash) {
      await ensureAccountsEncryptedWithPin(pinOverride || state.sessionPin || '');
    }
    const storedAccounts = buildAccountsForStorage();
    const activeWallet = storedAccounts[state.activeAccountId] || null;
    return new Promise((resolve) => {
      chrome.storage.local.set({
        [C.ACCOUNTS_KEY]: storedAccounts,
        [C.ACTIVE_ACCOUNT_KEY]: state.activeAccountId,
        [C.STORAGE_KEY]: activeWallet
      }, resolve);
    });
  }

  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(C.SETTINGS_KEY, (result) => {
        state.settings = {
          ...C.DEFAULT_SETTINGS,
          ...(result[C.SETTINGS_KEY] || {})
        };
        state.settings.lockTimeoutMinutes =
          NEURAI_UTILS.normalizeLockTimeoutMinutes(state.settings.lockTimeoutMinutes);
        resolve();
      });
    });
  }

  async function loadUnlockState() {
    return new Promise((resolve) => {
      chrome.storage.local.get(C.UNLOCK_UNTIL_KEY, (result) => {
        state.unlockUntil = Number(result[C.UNLOCK_UNTIL_KEY] || 0);
        resolve();
      });
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
        type: state.sessionPin ? MSG.SET_SESSION_PIN : MSG.CLEAR_SESSION_PIN,
        pin: state.sessionPin
      });
    } catch (_) { }
  }

  async function saveSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [C.SETTINGS_KEY]: state.settings }, resolve);
    });
  }

  function ensureCanPersistPrivateKey() {
    if (state.settings?.pinHash && !state.sessionPin) {
      openUnlockModal(true);
      showToast('Unlock with your PIN to save wallet keys', 'error');
      return false;
    }
    return true;
  }

  function buildAccountsForStorage() {
    const stored = createDefaultAccounts();
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) {
      const id = String(i);
      const entry = state.accounts[id];
      if (!isConfiguredAccount(entry)) continue;
      stored[id] = {
        privateKey: (!state.settings?.pinHash && entry.privateKey) ? entry.privateKey : null,
        privateKeyEnc: entry.privateKeyEnc || null,
        mnemonic: (!state.settings?.pinHash && entry.mnemonic) ? entry.mnemonic : null,
        mnemonicEnc: entry.mnemonicEnc || null,
        passphrase: (!state.settings?.pinHash && entry.passphrase) ? entry.passphrase : null,
        passphraseEnc: entry.passphraseEnc || null,
        address: entry.address || null,
        publicKey: entry.publicKey || null,
        walletType: entry.walletType || 'software',
        hardwareDeviceName: entry.hardwareDeviceName || null,
        hardwareDeviceNetwork: entry.hardwareDeviceNetwork || null,
        hardwareFirmwareVersion: entry.hardwareFirmwareVersion || null,
        hardwareDerivationPath: entry.hardwareDerivationPath || null,
        hardwareMasterFingerprint: entry.hardwareMasterFingerprint || null,
        network: entry.network || 'xna',
        history: Array.isArray(entry.history) ? entry.history : []
      };
    }
    return stored;
  }

  async function ensureAccountsEncryptedWithPin(pin) {
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) {
      const id = String(i);
      const entry = state.accounts[id];
      if (!isConfiguredAccount(entry)) continue;
      if (!entry.privateKey && !entry.privateKeyEnc) continue;

      let plain = entry.privateKey || null;
      if (plain) {
        if (!pin) throw new Error('PIN is required to encrypt wallet keys');
        entry.privateKeyEnc = await NEURAI_UTILS.encryptTextWithPin(plain, pin);
        if (id !== state.activeAccountId) entry.privateKey = null;
      }

      let plainMnemonic = entry.mnemonic || null;
      if (plainMnemonic) {
        if (!pin) throw new Error('PIN is required to encrypt wallet keys');
        entry.mnemonicEnc = await NEURAI_UTILS.encryptTextWithPin(plainMnemonic, pin);
        if (id !== state.activeAccountId) entry.mnemonic = null;
      }

      let plainPassphrase = entry.passphrase || null;
      if (plainPassphrase) {
        if (!pin) throw new Error('PIN is required to encrypt wallet keys');
        entry.passphraseEnc = await NEURAI_UTILS.encryptTextWithPin(plainPassphrase, pin);
        if (id !== state.activeAccountId) entry.passphrase = null;
      }
    }
  }

  async function unlockActiveWalletPrivateKey(pin) {
    const active = getActiveWalletData();
    if (!active) return;

    if (!active.privateKey && active.privateKeyEnc) {
      active.privateKey = await NEURAI_UTILS.decryptTextWithPin(active.privateKeyEnc, pin);
    }
    state.privateKey = active.privateKey || null;

    if (!active.mnemonic && active.mnemonicEnc) {
      active.mnemonic = await NEURAI_UTILS.decryptTextWithPin(active.mnemonicEnc, pin);
    }
    state.mnemonic = active.mnemonic || null;

    if (!active.passphrase && active.passphraseEnc) {
      active.passphrase = await NEURAI_UTILS.decryptTextWithPin(active.passphraseEnc, pin);
    }
    state.passphrase = active.passphrase || null;
  }

  async function decryptAllWalletKeysWithPin(pin) {
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) {
      const id = String(i);
      const entry = state.accounts[id];
      if (!hasAccountSecret(entry)) continue;
      if (!entry.privateKey && entry.privateKeyEnc) {
        const plain = await NEURAI_UTILS.decryptTextWithPin(entry.privateKeyEnc, pin);
        entry.privateKey = plain;
        entry.privateKeyEnc = null;
        if (id === state.activeAccountId) state.privateKey = plain;
      }
      if (!entry.mnemonic && entry.mnemonicEnc) {
        const plain = await NEURAI_UTILS.decryptTextWithPin(entry.mnemonicEnc, pin);
        entry.mnemonic = plain;
        entry.mnemonicEnc = null;
        if (id === state.activeAccountId) state.mnemonic = plain;
      }
      if (!entry.passphrase && entry.passphraseEnc) {
        const plain = await NEURAI_UTILS.decryptTextWithPin(entry.passphraseEnc, pin);
        entry.passphrase = plain;
        entry.passphraseEnc = null;
        if (id === state.activeAccountId) state.passphrase = plain;
      }
    }
  }

  async function reencryptAllWalletKeys(oldPin, newPin) {
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) {
      const id = String(i);
      const entry = state.accounts[id];
      if (!hasAccountSecret(entry)) continue;

      let plain = entry.privateKey || null;
      if (!plain && entry.privateKeyEnc && oldPin) {
        plain = await NEURAI_UTILS.decryptTextWithPin(entry.privateKeyEnc, oldPin);
      }
      if (plain) {
        entry.privateKeyEnc = await NEURAI_UTILS.encryptTextWithPin(plain, newPin);
        if (id !== state.activeAccountId) entry.privateKey = null;
        if (id === state.activeAccountId) state.privateKey = plain;
      }

      let mPlain = entry.mnemonic || null;
      if (!mPlain && entry.mnemonicEnc && oldPin) {
        mPlain = await NEURAI_UTILS.decryptTextWithPin(entry.mnemonicEnc, oldPin);
      }
      if (mPlain) {
        entry.mnemonicEnc = await NEURAI_UTILS.encryptTextWithPin(mPlain, newPin);
        if (id !== state.activeAccountId) entry.mnemonic = null;
        if (id === state.activeAccountId) state.mnemonic = mPlain;
      }

      let pPlain = entry.passphrase || null;
      if (!pPlain && entry.passphraseEnc && oldPin) {
        pPlain = await NEURAI_UTILS.decryptTextWithPin(entry.passphraseEnc, oldPin);
      }
      if (pPlain) {
        entry.passphraseEnc = await NEURAI_UTILS.encryptTextWithPin(pPlain, newPin);
        if (id !== state.activeAccountId) entry.passphrase = null;
        if (id === state.activeAccountId) state.passphrase = pPlain;
      }
    }
  }

  // ── Account helpers ───────────────────────────────────────────────────────

  function createDefaultAccounts() {
    const accounts = {};
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) accounts[String(i)] = null;
    return accounts;
  }

  function normalizeAccountId(value, fallback) {
    const id = String(value || '');
    return /^(10|[1-9])$/.test(id) ? id : fallback;
  }

  function normalizeAccounts(rawAccounts) {
    const normalized = createDefaultAccounts();
    if (!rawAccounts || typeof rawAccounts !== 'object') return normalized;
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) {
      const id = String(i);
      const entry = rawAccounts[id];
      if (entry && typeof entry === 'object' && isStoredAccountConfigured(entry)) {
        normalized[id] = {
          privateKey: entry.privateKey || null,
          privateKeyEnc: NEURAI_UTILS.isEncryptedSecret(entry.privateKeyEnc) ? entry.privateKeyEnc : null,
          mnemonic: entry.mnemonic || null,
          mnemonicEnc: NEURAI_UTILS.isEncryptedSecret(entry.mnemonicEnc) ? entry.mnemonicEnc : null,
          passphrase: entry.passphrase || null,
          passphraseEnc: NEURAI_UTILS.isEncryptedSecret(entry.passphraseEnc) ? entry.passphraseEnc : null,
          address: entry.address || null,
          publicKey: entry.publicKey || null,
          walletType: entry.walletType || 'software',
          hardwareDeviceName: entry.hardwareDeviceName || null,
          hardwareDeviceNetwork: entry.hardwareDeviceNetwork || null,
          hardwareFirmwareVersion: entry.hardwareFirmwareVersion || null,
          hardwareDerivationPath: entry.hardwareDerivationPath || null,
          hardwareMasterFingerprint: entry.hardwareMasterFingerprint || null,
          network: entry.network || 'xna',
          history: Array.isArray(entry.history) ? entry.history : []
        };
      }
    }
    return normalized;
  }

  function getAccountLabel(accountId) { return 'Neurai_' + accountId; }
  function getActiveWalletData() { return state.accounts[state.activeAccountId] || null; }
  function hasAccountSecret(entry) { return !!(entry && (entry.privateKey || entry.privateKeyEnc)); }
  function isConfiguredAccount(entry) {
    return !!(entry && (
      entry.privateKey ||
      entry.privateKeyEnc ||
      (entry.walletType === 'hardware' && entry.address && entry.publicKey)
    ));
  }
  function isStoredAccountConfigured(entry) {
    return !!(entry && (
      entry.privateKey ||
      NEURAI_UTILS.isEncryptedSecret(entry.privateKeyEnc) ||
      (entry.walletType === 'hardware' && entry.address && entry.publicKey)
    ));
  }
  function hasActiveWallet() { return isConfiguredAccount(getActiveWalletData()); }

  function getConfiguredAccountIds(accountsData = state.accounts) {
    return Object.keys(accountsData).filter((id) => isConfiguredAccount(accountsData[id]));
  }

  function setActiveWalletData(walletData) {
    const previous = state.accounts[state.activeAccountId] || {};
    state.privateKey = walletData.privateKey || null;
    state.mnemonic = walletData.mnemonic || null;
    state.passphrase = walletData.passphrase || null;
    state.address = walletData.address || null;
    state.publicKey = walletData.publicKey || null;
    state.walletType = walletData.walletType || 'software';
    state.network = walletData.network || 'xna';
    state.accounts[state.activeAccountId] = {
      privateKey: state.privateKey,
      privateKeyEnc: walletData.privateKeyEnc || previous.privateKeyEnc || null,
      mnemonic: state.mnemonic,
      mnemonicEnc: walletData.mnemonicEnc || previous.mnemonicEnc || null,
      passphrase: state.passphrase,
      passphraseEnc: walletData.passphraseEnc || previous.passphraseEnc || null,
      address: state.address,
      publicKey: state.publicKey,
      walletType: state.walletType,
      hardwareDeviceName: walletData.hardwareDeviceName || previous.hardwareDeviceName || null,
      hardwareDeviceNetwork: walletData.hardwareDeviceNetwork || previous.hardwareDeviceNetwork || null,
      hardwareFirmwareVersion: walletData.hardwareFirmwareVersion || previous.hardwareFirmwareVersion || null,
      hardwareDerivationPath: walletData.hardwareDerivationPath || previous.hardwareDerivationPath || null,
      hardwareMasterFingerprint: walletData.hardwareMasterFingerprint || previous.hardwareMasterFingerprint || null,
      network: state.network,
      history: Array.isArray(walletData.history) ? walletData.history : (Array.isArray(previous.history) ? previous.history : [])
    };
  }

  function clearActiveWalletData() {
    stopPolling();
    state.privateKey = state.mnemonic = state.passphrase = state.address = state.publicKey = state.balance = state.pendingBalance = null;
    state.lastPortfolioUpdatedAt = 0;
    state.walletType = 'software';
    state.assets = [];
    renderAssetsList();
    switchBalanceTab('general');
    state.unlockUntil = 0;
    elements.addressDisplay.title = '';
  }

  function findNextEmptyAccountId() {
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) {
      const id = String(i);
      if (!isConfiguredAccount(state.accounts[id])) return id;
    }
    return null;
  }

  function updateAccountLabels() {
    const label = getAccountLabel(state.activeAccountId);
    if (elements.setupAccountLabel) elements.setupAccountLabel.textContent = 'Account: ' + label;
    elements.currentAccountDisplay.textContent = label;
  }

  function renderLastUpdated() {
    if (!elements.lastUpdatedDisplay) return;
    elements.lastUpdatedDisplay.textContent = state.lastPortfolioUpdatedAt
      ? formatLastUpdated(state.lastPortfolioUpdatedAt)
      : 'Never updated';
  }

  function formatLastUpdated(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  // ── Account modal ─────────────────────────────────────────────────────────

  function openAccountModal() {
    updateAccountLabels();
    syncAccountModal();
    elements.accountModal.classList.remove('hidden');
  }

  function closeAccountModal() {
    elements.accountModal.classList.add('hidden');
  }

  function syncAccountModal() {
    elements.accountCurrentLabel.textContent = getAccountLabel(state.activeAccountId);
    const configuredIds = getConfiguredAccountIds();

    if (!configuredIds.length) {
      elements.accountSelect.innerHTML = '<option value="">No configured account</option>';
      elements.accountSelect.disabled = true;
      elements.switchAccountBtn.disabled = true;
    } else {
      elements.accountSelect.innerHTML = configuredIds.map((id) =>
        `<option value="${id}">${getAccountLabel(id)}</option>`).join('');
      elements.accountSelect.disabled = false;
      elements.switchAccountBtn.disabled = false;
      elements.accountSelect.value = configuredIds.includes(state.activeAccountId)
        ? state.activeAccountId : configuredIds[0];
    }

    const nextAccount = findNextEmptyAccountId();
    if (nextAccount) {
      elements.newAccountBtn.disabled = false;
      elements.accountHint.textContent = 'You can create ' + getAccountLabel(nextAccount) + '.';
    } else {
      elements.newAccountBtn.disabled = true;
      elements.accountHint.textContent = 'Maximum reached: 10 configured accounts.';
    }
  }

  async function handleCreateNewAccount() {
    const nextId = findNextEmptyAccountId();
    if (!nextId) { showToast('No free slots. Maximum is 10 accounts.', 'error'); return; }
    closeAccountModal();
    chrome.tabs.create({
      url: chrome.runtime.getURL('onboarding/welcome.html?mode=new-account&id=' + nextId)
    });
    window.close();
  }

  async function handleSwitchAccount() {
    const targetId = normalizeAccountId(elements.accountSelect.value, state.activeAccountId);
    const targetWallet = state.accounts[targetId];
    if (!isConfiguredAccount(targetWallet)) {
      showToast('Selected account is not configured', 'error');
      return;
    }
    state.activeAccountId = targetId;
    setActiveWalletData(targetWallet);
    if (state.settings?.pinHash && state.sessionPin) {
      try { await unlockActiveWalletPrivateKey(state.sessionPin); } catch (_) { }
    }
    await saveAccountsData();
    updateAccountLabels();
    closeAccountModal();
    showWalletSection();
    if (isAddonLocked()) {
      openUnlockModal();
    } else {
      await updateBalance();
      startPolling();
    }
    showToast('Using ' + getAccountLabel(targetId), 'success');
  }

  // ── Settings modal ────────────────────────────────────────────────────────

  function openSettingsModal() {
    syncSettingsForm();
    elements.settingsModal.classList.remove('hidden');
  }

  function closeSettingsModal() {
    elements.settingsModal.classList.add('hidden');
  }

  function syncSettingsForm() {
    const s = state.settings || C.DEFAULT_SETTINGS;
    elements.themeMode.value = s.theme || C.DEFAULT_SETTINGS.theme;
    elements.rpcMainnet.value = s.rpcMainnet || '';
    elements.rpcTestnet.value = s.rpcTestnet || '';
    elements.lockTimeoutMinutes.value = NEURAI_UTILS.normalizeLockTimeoutMinutes(s.lockTimeoutMinutes);
    syncPinSettingsUI();
  }

  function syncPinSettingsUI() {
    const hasPin = !!state.settings?.pinHash;
    elements.pinStatusText.textContent = hasPin ? 'Active' : 'Not configured';
    elements.pinStatusText.classList.toggle('active', hasPin);
    elements.settingsPinOld.value = '';
    elements.settingsPinNew.value = '';
    elements.settingsPinConfirm.value = '';
  }

  async function handleSaveSettings() {
    try {
      const currentPin = (elements.settingsPinOld.value || '').trim();
      const newPin = (elements.settingsPinNew.value || '').trim();
      const confirmPin = (elements.settingsPinConfirm.value || '').trim();
      const hasExistingPin = !!state.settings?.pinHash;

      let pinHash = state.settings?.pinHash || '';

      if (newPin) {
        if (newPin.length < 4 || newPin.length > 20) throw new Error('PIN must be 4 to 20 characters');
        if (newPin !== confirmPin) throw new Error('PIN confirmation does not match');
        if (hasExistingPin) {
          if (!currentPin) throw new Error('Current PIN is required to change PIN');
          const currentHash = await NEURAI_UTILS.hashText(currentPin);
          if (currentHash !== state.settings.pinHash) throw new Error('Current PIN is invalid');
        }
        await reencryptAllWalletKeys(hasExistingPin ? currentPin : null, newPin);
        await persistSessionPin(newPin);
        pinHash = await NEURAI_UTILS.hashText(newPin);
      }

      state.settings = {
        theme: elements.themeMode.value || C.DEFAULT_SETTINGS.theme,
        rpcMainnet: normalizeOptionalUrl(elements.rpcMainnet.value),
        rpcTestnet: normalizeOptionalUrl(elements.rpcTestnet.value),
        pinHash,
        lockTimeoutMinutes: NEURAI_UTILS.normalizeLockTimeoutMinutes(elements.lockTimeoutMinutes.value)
      };
      await ensureRpcPermissions(state.settings);

      if (newPin) await unlockForConfiguredTimeout();

      await saveAccountsData();
      await saveSettings();
      syncPinSettingsUI();
      NEURAI_UTILS.applyTheme(state.settings);
      applyReaderRpcForCurrentContext();
      await notifySettingsUpdated();
      closeSettingsModal();
      showToast(newPin ? 'Settings saved — PIN updated' : 'Settings saved', 'success');
      if (state.privateKey) {
        if (isAddonLocked()) { openUnlockModal(); return; }
        updateBalance();
      }
    } catch (error) {
      showToast('Invalid settings: ' + error.message, 'error');
    }
  }


  async function handleResetSettings() {
    state.settings = { ...C.DEFAULT_SETTINGS, pinHash: state.settings?.pinHash || '' };
    syncSettingsForm();
    await saveSettings();
    NEURAI_UTILS.applyTheme(state.settings);
    applyReaderRpcForCurrentContext();
    await notifySettingsUpdated();
    showToast('Settings restored to defaults', 'success');
  }

  async function notifySettingsUpdated() {
    try { await chrome.runtime.sendMessage({ type: MSG.SETTINGS_UPDATED }); } catch (_) { }
  }

  // ── Lock / PIN ────────────────────────────────────────────────────────────

  function isAddonLocked() {
    if (!hasActiveWallet()) return false;
    if (!state.settings?.pinHash) return false;
    const unlockExpired = state.unlockUntil <= Date.now();
    const missingSessionPin = !state.sessionPin;
    const locked = unlockExpired || missingSessionPin;
    if (locked) {
      if (state.unlockUntil !== 0) {
        state.unlockUntil = 0;
        chrome.storage.local.set({ [C.UNLOCK_UNTIL_KEY]: 0 }, () => { });
      }
      state.privateKey = null;
      state.sessionPin = '';
      const active = state.accounts[state.activeAccountId];
      if (active) active.privateKey = null;
    }
    return locked;
  }

  function openUnlockModal(force = false) {
    if (!state.settings?.pinHash) return;
    if (!hasActiveWallet() && !force) return;
    if (!elements.unlockModal.classList.contains('hidden')) return;
    stopPolling();
    state.privateKey = null;
    state.sessionPin = '';
    const active = state.accounts[state.activeAccountId];
    if (active) active.privateKey = null;
    elements.unlockError.textContent = '';
    elements.unlockPinInput.value = '';
    elements.unlockResetInput.value = '';
    elements.unlockResetMessage.textContent = '';
    showUnlockMainView();
    elements.unlockModal.classList.remove('hidden');
    elements.unlockPinInput.focus();
  }

  function closeUnlockModal() {
    if (isAddonLocked()) return;
    showUnlockMainView();
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
      chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/welcome.html') });
      window.close();
      return;
    } catch (error) {
      elements.unlockResetMessage.textContent = error.message || 'Unable to reset addon data.';
    }
  }

  function startLockWatch() {
    stopLockWatch();
    state.lockWatchInterval = setInterval(() => {
      if (!state.settings?.pinHash || !hasActiveWallet()) return;
      if (isAddonLocked()) {
        if (elements.unlockModal.classList.contains('hidden')) openUnlockModal();
      }
    }, 1000);
  }

  function stopLockWatch() {
    if (!state.lockWatchInterval) return;
    clearInterval(state.lockWatchInterval);
    state.lockWatchInterval = null;
  }

  function touchUnlockSession(force = false) {
    if (!state.settings?.pinHash) return;
    if (isAddonLocked()) return;
    const now = Date.now();
    if (!force && now - state.lastUnlockTouchAt < 5000) return;
    state.lastUnlockTouchAt = now;
    unlockForConfiguredTimeout().catch(() => { });
  }

  async function unlockForConfiguredTimeout() {
    const minutes = NEURAI_UTILS.normalizeLockTimeoutMinutes(state.settings?.lockTimeoutMinutes);
    state.unlockUntil = Date.now() + minutes * 60 * 1000;
    return new Promise((resolve) => {
      chrome.storage.local.set({ [C.UNLOCK_UNTIL_KEY]: state.unlockUntil }, resolve);
    });
  }

  async function handleUnlock() {
    const entered = (elements.unlockPinInput.value || '').trim();
    if (!entered) { elements.unlockError.textContent = 'PIN is required.'; return; }
    const hash = await NEURAI_UTILS.hashText(entered);
    if (hash !== state.settings.pinHash) { elements.unlockError.textContent = 'Invalid PIN.'; return; }
    try {
      await unlockActiveWalletPrivateKey(entered);
      await ensureAccountsEncryptedWithPin(entered);
      await persistSessionPin(entered);
      await saveAccountsData(entered);
    } catch (error) {
      elements.unlockError.textContent = 'Unable to unlock wallet keys: ' + error.message;
      return;
    }
    await unlockForConfiguredTimeout();
    state.lastUnlockTouchAt = Date.now();
    closeUnlockModal();
    if (hasActiveWallet()) {
      showWalletSection();
      await updateBalance();
      startPolling();
    }
  }

  // ── Backup Modal ──────────────────────────────────────────────────────────

  function openBackupModal() {
    if (state.walletType === 'hardware') {
      showToast('Hardware wallet secrets stay on the device', 'error');
      return;
    }
    elements.backupModal.classList.remove('hidden');
    elements.backupAuthSection.classList.remove('hidden');
    elements.backupDataSection.classList.add('hidden');
    elements.backupPinInput.value = '';
    elements.backupError.textContent = '';
    elements.backupPinInput.focus();
  }

  function closeBackupModal() {
    elements.backupModal.classList.add('hidden');
    elements.backupAuthSection.classList.remove('hidden');
    elements.backupDataSection.classList.add('hidden');
    elements.backupPinInput.value = '';
    elements.backupError.textContent = '';
    elements.backupWifText.value = '';
    elements.backupMnemonicWords.innerHTML = '';
    elements.backupWifText.type = 'password';
  }

  async function handleBackupUnlock() {
    const entered = (elements.backupPinInput.value || '').trim();
    if (!entered) { elements.backupError.textContent = 'PIN is required.'; return; }

    const hash = await NEURAI_UTILS.hashText(entered);
    if (hash !== state.settings.pinHash) { elements.backupError.textContent = 'Invalid PIN.'; return; }

    elements.backupError.textContent = '';
    try {
      const active = getActiveWalletData();
      if (!active) throw new Error('No active wallet to backup');

      let wif = active.privateKey;
      if (!wif && active.privateKeyEnc) {
        wif = await NEURAI_UTILS.decryptTextWithPin(active.privateKeyEnc, entered);
      }

      let mnemonicStr = active.mnemonic;
      if (!mnemonicStr && active.mnemonicEnc) {
        mnemonicStr = await NEURAI_UTILS.decryptTextWithPin(active.mnemonicEnc, entered);
      }

      let passphraseStr = active.passphrase;
      if (!passphraseStr && active.passphraseEnc) {
        passphraseStr = await NEURAI_UTILS.decryptTextWithPin(active.passphraseEnc, entered);
      }

      // Store temporarily on the account object just for the copy button if needed,
      // though better to just construct it.
      if (active) active.__decryptedMnemonic = mnemonicStr;

      elements.backupWifText.value = wif || '';

      if (mnemonicStr) {
        const words = mnemonicStr.trim().split(/\s+/);
        elements.backupMnemonicWords.innerHTML = words.map((w, i) =>
          `<span class="mnemonic-word"><span class="mnemonic-word-num">${i + 1}</span>${w}</span>`
        ).join('');
        elements.backupMnemonicGroup.classList.remove('hidden');
      } else {
        elements.backupMnemonicGroup.classList.add('hidden');
      }

      if (passphraseStr) {
        elements.backupPassphraseGroup.classList.remove('hidden');
        elements.backupPassphraseText.textContent = passphraseStr;
      } else {
        elements.backupPassphraseGroup.classList.add('hidden');
      }

      elements.backupAuthSection.classList.add('hidden');
      elements.backupDataSection.classList.remove('hidden');

    } catch (error) {
      elements.backupError.textContent = 'Decryption failed: ' + error.message;
    }
  }

  // ── RPC / settings helpers ────────────────────────────────────────────────

  function normalizeOptionalUrl(value) {
    const trimmed = (value || '').trim();
    if (!trimmed) return '';
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') return parsed.toString();
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (parsed.protocol === 'http:' && isLocalhost) return parsed.toString();
    throw new Error('RPC URL must use https:// (http:// only allowed for localhost/127.0.0.1)');
  }

  function toOriginPattern(url) {
    if (!url) return null;
    const p = new URL(url);
    return `${p.protocol}//${p.host}/*`;
  }

  async function ensureRpcPermissions(settings) {
    if (!chrome.permissions) return;
    const origins = [settings.rpcMainnet, settings.rpcTestnet]
      .filter(Boolean).map(toOriginPattern)
      .filter((v, i, arr) => v && arr.indexOf(v) === i);
    if (!origins.length) return;
    const has = await new Promise((r) => chrome.permissions.contains({ origins }, r));
    if (has) return;
    try {
      const granted = await new Promise((r) => chrome.permissions.request({ origins }, r));
      if (!granted) throw new Error('Permission denied for custom RPC host');
    } catch (err) {
      console.warn('Failed to auto-request RPC permissions. Ensure you clicked Save Settings directly:', err);
    }
  }

  // ── HW connection status monitoring ──────────────────────────────────────

  function startHwStatusMonitor() {
    stopHwStatusMonitor();
    updateHwConnectionUI();
    // Poll connection status every 2 seconds
    hwStatusInterval = setInterval(updateHwConnectionUI, 2000);
  }

  function stopHwStatusMonitor() {
    if (hwStatusInterval) {
      clearInterval(hwStatusInterval);
      hwStatusInterval = null;
    }
  }

  function updateHwConnectionUI() {
    if (state.walletType !== 'hardware') {
      return;
    }

    setConnectionStatus();
  }

  async function reconnectHwDevice() {
    if (hwDevice) {
      try { await hwDevice.disconnect(); } catch (_) { }
      hwDevice = null;
    }

    const device = new NeuraiSignESP32.NeuraiESP32({ filters: [] });
    await device.connect();
    const info = await device.getInfo();

    // Validate network
    const expectedNetwork = state.network === 'xna-test' ? 'NeuraiTest' : 'Neurai';
    if (info.network && info.network !== expectedNetwork) {
      await device.disconnect();
      throw new Error('Device is ' + info.network + ', expected ' + expectedNetwork);
    }

    hwDevice = device;
  }

  async function ensureHwConnected() {
    if (hwDevice && hwDevice.connected) return true;
    try {
      await reconnectHwDevice();
      return true;
    } catch (_) {
      return false;
    }
  }

  async function requestHardwareWalletAddress() {
    // Disconnect any previous session
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

  function getRpcUrlForNetwork(network) {
    const s = state.settings || C.DEFAULT_SETTINGS;
    return network === 'xna-test'
      ? (s.rpcTestnet || NeuraiReader.URL_TESTNET)
      : (s.rpcMainnet || NeuraiReader.URL_MAINNET);
  }

  function applyReaderRpcForCurrentContext() {
    const network = hasActiveWallet() ? state.network : ((elements.network && elements.network.value) || 'xna');
    if (network === 'xna-test') NeuraiReader.setTestnet(); else NeuraiReader.setMainnet();
    const url = getRpcUrlForNetwork(network);
    if (url) NeuraiReader.setURL(url);
  }

  // ── Background message listener ───────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === MSG.BALANCE_UPDATE && message.balance) {
      state.balance = message.balance;
      renderAmount(elements.xnaBalance, message.balance, '0');
    }
    if (message.type === MSG.SETTINGS_SYNCED) {
      loadSettings().then(() => {
        NEURAI_UTILS.applyTheme(state.settings);
        applyReaderRpcForCurrentContext();
      });
    }
    if (message.type === 'HW_CONNECTION_STATUS_PAGE') {
      sendResponse({
        success: true,
        connected: !!(hwDevice && hwDevice.connected),
        source: 'popup'
      });
      return true;
    }

    // ── HW signing requests from background ───────────────────────────────
    if (message.type === MSG.HW_SIGN_MESSAGE) {
      if (!hwDevice || !hwDevice.connected) return false;
      handleHwSignMessage(message).then(sendResponse);
      return true; // async response
    }
    if (message.type === MSG.HW_SIGN_RAW_TX) {
      if (!hwDevice || !hwDevice.connected) return false;
      handleHwSignRawTx(message).then(sendResponse);
      return true;
    }
  });

  async function handleHwSignMessage(message) {
    if (!hwDevice || !hwDevice.connected) {
      return { error: 'Hardware wallet is not connected. Click Reconnect in the addon or open the popup.' };
    }
    try {
      showToast('Confirm message signing on your device...', 'success');
      const result = await hwDevice.signMessage(message.message);
      showToast('Message signed', 'success');
      return { success: true, signature: result.signature, address: result.address };
    } catch (err) {
      showToast('Signing failed', 'error');
      updateHwConnectionUI();
      return { error: 'HW sign failed: ' + err.message };
    }
  }

  async function handleHwSignRawTx(message) {
    if (!hwDevice || !hwDevice.connected) {
      return { error: 'Hardware wallet is not connected. Click Reconnect in the addon or open the popup.' };
    }
    try {
      const metadata = await ensureHardwareSigningMetadata(message);
      const publicKey = metadata.publicKey;
      const derivationPath = metadata.derivationPath;
      const masterFingerprint = metadata.masterFingerprint;

      if (!publicKey || !derivationPath || !masterFingerprint) {
        return { error: 'Hardware wallet metadata is incomplete. Reconnect the hardware wallet from the full wallet view.' };
      }

      // Fetch full raw transactions for each UTXO (needed for nonWitnessUtxo)
      const utxos = message.utxos || [];
      const rpcUrl = getRpcUrlForNetwork(state.network);
      const txInputs = parseRawTransactionInputs(message.txHex);
      const enrichedUtxos = await fetchRawTxForUtxos(txInputs, rpcUrl);

      // Build PSBT from raw transaction
      const networkType = state.network === 'xna-test' ? 'xna-test' : 'xna';
      const sighashType = parseSighashType(message.sighashType);
      const psbtBase64 = NeuraiSignESP32.buildPSBTFromRawTransaction({
        network: networkType,
        rawUnsignedTransaction: message.txHex,
        inputs: enrichedUtxos.map((utxo) => {
          const signerUtxo = utxos.find((candidate) => candidate.txid === utxo.txid && Number(candidate.vout) === Number(utxo.vout));
          return {
            txid: utxo.txid,
            vout: utxo.vout,
            sequence: utxo.sequence,
            rawTxHex: utxo.rawTxHex,
            ...(signerUtxo ? {
              masterFingerprint,
              derivationPath,
              pubkey: publicKey,
              sighashType
            } : {})
          };
        })
      });
      const feeSats = calculateRawTransactionFeeSats(message.txHex, enrichedUtxos);
      const signingDisplay = feeSats !== null
        ? { feeAmount: formatSatoshisToXna(feeSats), baseCurrency: 'XNA' }
        : undefined;

      // Sign on device
      const signResult = await hwDevice.signPsbt(psbtBase64, signingDisplay);

      // Finalize
      const finalized = NeuraiSignESP32.finalizeSignedPSBT(psbtBase64, signResult.psbt, networkType);

      return { success: true, signedTxHex: finalized.txHex, complete: true };
    } catch (err) {
      updateHwConnectionUI();
      return { error: 'HW sign failed: ' + err.message };
    }
  }

  async function ensureHardwareSigningMetadata(message) {
    const activeWallet = getActiveWalletData() || {};
    let publicKey = message.publicKey || state.publicKey || null;
    let derivationPath = message.derivationPath || activeWallet.hardwareDerivationPath || null;
    let masterFingerprint = message.masterFingerprint || activeWallet.hardwareMasterFingerprint || null;

    const needsInfo = !masterFingerprint;
    const needsAddress = !publicKey || !derivationPath;

    if (needsInfo) {
      const info = hwDevice.info || await hwDevice.getInfo();
      masterFingerprint = info?.master_fingerprint || masterFingerprint;
    }
    if (needsAddress) {
      const addrResp = await hwDevice.getAddress();
      publicKey = addrResp?.pubkey || publicKey;
      derivationPath = addrResp?.path || derivationPath;
    }

    if (publicKey && derivationPath && masterFingerprint && (
      activeWallet.publicKey !== publicKey ||
      activeWallet.hardwareDerivationPath !== derivationPath ||
      activeWallet.hardwareMasterFingerprint !== masterFingerprint
    )) {
      setActiveWalletData({
        ...activeWallet,
        publicKey,
        hardwareDerivationPath: derivationPath,
        hardwareMasterFingerprint: masterFingerprint
      });
      await saveAccountsData();
    }

    return { publicKey, derivationPath, masterFingerprint };
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
      sequence: u.sequence,
      value: Math.round((u.amount || 0) * 1e8),
      rawTxHex: rawTxMap[u.txid] || null
    }));
  }

  function parseRawTransactionInputs(txHex) {
    const bytes = hexToBytes(txHex);
    let offset = 4;
    const inputVarInt = readVarInt(bytes, offset);
    offset += inputVarInt.size;

    const inputs = [];
    for (let i = 0; i < inputVarInt.value; i += 1) {
      const txidBytes = bytes.slice(offset, offset + 32);
      offset += 32;
      const vout = readUInt32LE(bytes, offset);
      offset += 4;
      const scriptLen = readVarInt(bytes, offset);
      offset += scriptLen.size + scriptLen.value;
      const sequence = readUInt32LE(bytes, offset);
      offset += 4;

      inputs.push({
        txid: bytesToHex([...txidBytes].reverse()),
        vout,
        sequence
      });
    }

    return inputs;
  }

  function parseRawTransactionOutputs(txHex) {
    const bytes = hexToBytes(txHex);
    let offset = 4;
    const inputVarInt = readVarInt(bytes, offset);
    offset += inputVarInt.size;

    for (let i = 0; i < inputVarInt.value; i += 1) {
      offset += 32;
      offset += 4;
      const scriptLen = readVarInt(bytes, offset);
      offset += scriptLen.size + scriptLen.value;
      offset += 4;
    }

    const outputVarInt = readVarInt(bytes, offset);
    offset += outputVarInt.size;
    const outputs = [];

    for (let i = 0; i < outputVarInt.value; i += 1) {
      const value = readUInt64LE(bytes, offset);
      offset += 8;
      const scriptLen = readVarInt(bytes, offset);
      offset += scriptLen.size;
      offset += scriptLen.value;
      outputs.push({ value });
    }

    return outputs;
  }

  function calculateRawTransactionFeeSats(txHex, enrichedUtxos) {
    try {
      const inputTotal = (enrichedUtxos || []).reduce((sum, utxo) => {
        const amount = getPrevoutAmountFromRawTx(utxo.rawTxHex, Number(utxo.vout));
        return amount === null ? sum : (sum + amount);
      }, 0n);
      if (inputTotal <= 0n) return null;

      const outputTotal = parseRawTransactionOutputs(txHex).reduce((sum, output) => sum + output.value, 0n);
      const fee = inputTotal - outputTotal;
      return fee >= 0n ? fee : null;
    } catch {
      return null;
    }
  }

  function getPrevoutAmountFromRawTx(rawTxHex, vout) {
    if (!rawTxHex) return null;
    const output = parseRawTransactionOutputs(rawTxHex)[vout];
    return output ? output.value : null;
  }

  function hexToBytes(hex) {
    const normalized = String(hex || '').trim();
    if (!normalized || normalized.length % 2 !== 0) {
      throw new Error('Invalid raw transaction hex');
    }
    const bytes = [];
    for (let i = 0; i < normalized.length; i += 2) {
      bytes.push(parseInt(normalized.slice(i, i + 2), 16));
    }
    return bytes;
  }

  function bytesToHex(bytes) {
    return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function readUInt32LE(bytes, offset) {
    return (
      bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)
    ) >>> 0;
  }

  function readUInt64LE(bytes, offset) {
    const low = BigInt(readUInt32LE(bytes, offset));
    const high = BigInt(readUInt32LE(bytes, offset + 4));
    return low + (high << 32n);
  }

  function readVarInt(bytes, offset) {
    const first = bytes[offset];
    if (first < 0xfd) return { value: first, size: 1 };
    if (first === 0xfd) {
      return { value: bytes[offset + 1] | (bytes[offset + 2] << 8), size: 3 };
    }
    if (first === 0xfe) {
      return { value: readUInt32LE(bytes, offset + 1), size: 5 };
    }
    throw new Error('Unsupported varint in raw transaction');
  }

  function parseSighashType(sighashType) {
    const normalized = String(sighashType || 'ALL')
      .toUpperCase()
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);

    let value = 0;
    normalized.forEach((part) => {
      if (part === 'ALL') value |= 0x01;
      else if (part === 'NONE') value |= 0x02;
      else if (part === 'SINGLE') value |= 0x03;
      else if (part === 'ANYONECANPAY') value |= 0x80;
      else throw new Error('Unsupported sighash type: ' + sighashType);
    });

    return value || 0x01;
  }

  function estimateBase64Bytes(base64) {
    const normalized = String(base64 || '');
    if (!normalized) return 0;
    const padding = normalized.endsWith('==') ? 2 : (normalized.endsWith('=') ? 1 : 0);
    return Math.floor((normalized.length * 3) / 4) - padding;
  }

  function formatSatoshisToXna(satoshis) {
    return (Number(satoshis) / 1e8).toFixed(8);
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[C.UNLOCK_UNTIL_KEY]) {
      state.unlockUntil = Number(changes[C.UNLOCK_UNTIL_KEY].newValue || 0);
    }
  });

  // ── Boot ──────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
