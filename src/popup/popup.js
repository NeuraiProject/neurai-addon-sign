// Neurai Wallet Popup — Main Logic
// Relies on globals loaded before this script:
//   NeuraiKey, NeuraiMessage, NeuraiReader  (from ../lib/)
//   NEURAI_CONSTANTS, NEURAI_UTILS          (from ../shared/)

(function () {
  'use strict';

  // ── Destructure shared globals for convenience ────────────────────────────
  const C = NEURAI_CONSTANTS;
  const MSG = C.MSG;

  // ── DOM Elements ──────────────────────────────────────────────────────────
  const elements = {
    setupSection: document.getElementById('setupSection'),
    walletSection: document.getElementById('walletSection'),
    network: document.getElementById('network'),
    setupTabImport: document.getElementById('setupTabImport'),
    setupTabGenerate: document.getElementById('setupTabGenerate'),
    setupPanelImport: document.getElementById('setupPanelImport'),
    setupPanelGenerate: document.getElementById('setupPanelGenerate'),
    importKey: document.getElementById('importKey'),
    importPassphrase: document.getElementById('importPassphrase'),
    toggleImportPassphraseVisibility: document.getElementById('toggleImportPassphraseVisibility'),
    generateWordCount: document.getElementById('generateWordCount'),
    generatePassphrase: document.getElementById('generatePassphrase'),
    toggleGeneratePassphraseVisibility: document.getElementById('toggleGeneratePassphraseVisibility'),
    networkBadge: document.getElementById('networkBadge'),
    openExpandedBtn: document.getElementById('openExpandedBtn'),
    openSettingsBtn: document.getElementById('openSettingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    accountModal: document.getElementById('accountModal'),
    removeConfirmModal: document.getElementById('removeConfirmModal'),
    mnemonicModal: document.getElementById('mnemonicModal'),
    mnemonicPassphraseDisplay: document.getElementById('mnemonicPassphraseDisplay'),
    mnemonicPassphraseText: document.getElementById('mnemonicPassphraseText'),
    mnemonicCopyBtn: document.getElementById('mnemonicCopyBtn'),
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
    unlockCancelBtn: document.getElementById('unlockCancelBtn'),
    unlockConfirmBtn: document.getElementById('unlockConfirmBtn'),
    initialPinModal: document.getElementById('initialPinModal'),
    initialPinInput: document.getElementById('initialPinInput'),
    initialPinConfirmInput: document.getElementById('initialPinConfirmInput'),
    initialPinError: document.getElementById('initialPinError'),
    initialPinCancelBtn: document.getElementById('initialPinCancelBtn'),
    initialPinSaveBtn: document.getElementById('initialPinSaveBtn'),
    accountSelect: document.getElementById('accountSelect'),
    accountCurrentLabel: document.getElementById('accountCurrentLabel'),
    accountHint: document.getElementById('accountHint'),
    switchAccountBtn: document.getElementById('switchAccountBtn'),
    newAccountBtn: document.getElementById('newAccountBtn'),
    setupAccountLabel: document.getElementById('setupAccountLabel'),
    currentAccountDisplay: document.getElementById('currentAccountDisplay'),
    saveKeyBtn: document.getElementById('saveKeyBtn'),
    generateNewBtn: document.getElementById('generateNewBtn'),
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
    statusIndicator: document.getElementById('statusIndicator'),
    lastUpdate: document.getElementById('lastUpdate'),
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
    mnemonicWords: document.getElementById('mnemonicWords'),
    mnemonicBackedUp: document.getElementById('mnemonicBackedUp'),
    mnemonicConfirmBtn: document.getElementById('mnemonicConfirmBtn'),
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
    const isShowing = !elements.historyCard.classList.contains('hidden');
    const balanceCardMain = document.querySelector('.balance-card-main');
    const addressCard = document.getElementById('addressCard');
    const iconClock = document.getElementById('historyBtnIconClock');
    const iconBalance = document.getElementById('historyBtnIconBalance');

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

      const header = document.createElement('div');
      header.className = 'history-item-header';

      const dateStr = new Date(item.timestamp).toLocaleString();
      header.innerHTML = `
        <span class="history-item-origin">${item.origin}</span>
        <span>${dateStr}</span>
      `;

      const msg = document.createElement('div');
      msg.className = 'history-item-msg';
      msg.title = item.message;
      msg.textContent = item.message;

      const sig = document.createElement('div');
      sig.className = 'history-item-sig';
      sig.textContent = item.signature;

      el.appendChild(header);
      el.appendChild(msg);
      el.appendChild(sig);

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
    network: 'xna',
    balance: null,
    pendingBalance: null,
    assets: [],
    pollingInterval: null,
    isConnected: false,
    settings: null,
    accounts: {},
    activeAccountId: '1',
    unlockUntil: 0,
    sessionPin: '',
    pendingWalletAction: null,
    lockWatchInterval: null,
    lastUnlockTouchAt: 0
  };

  // ── Initialization ────────────────────────────────────────────────────────

  async function init() {
    await loadSettings();
    await loadWalletData();
    await loadUnlockState();
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
      showSetupSection();
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

    elements.setupTabImport.addEventListener('click', () => switchSetupTab('import'));
    elements.setupTabGenerate.addEventListener('click', () => switchSetupTab('generate'));

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
    elements.initialPinModal.addEventListener('click', (e) => { if (e.target === elements.initialPinModal) cancelInitialPinSetup(); });
    elements.backupModal.addEventListener('click', (e) => { if (e.target === elements.backupModal) closeBackupModal(); });

    elements.saveKeyBtn.addEventListener('click', handleSaveKey);
    elements.generateNewBtn.addEventListener('click', handleGenerateNew);
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
    elements.unlockCancelBtn.addEventListener('click', () => {
      if (isAddonLocked()) return;
      closeUnlockModal();
    });
    elements.unlockConfirmBtn.addEventListener('click', handleUnlock);
    elements.initialPinCancelBtn.addEventListener('click', cancelInitialPinSetup);
    elements.initialPinSaveBtn.addEventListener('click', handleInitialPinSetup);

    // Add multiple enter key triggers
    elements.importKey.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveKey(); } });
    elements.importPassphrase.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSaveKey(); });
    elements.generatePassphrase.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleGenerateNew(); });
    elements.backupPinInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleBackupUnlock(); });

    elements.network.addEventListener('change', applyReaderRpcForCurrentContext);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSettingsModal();
        closeAccountModal();
        closeRemoveConfirmModal();
        if (!isAddonLocked()) closeUnlockModal();
        closeInitialPinModal();
        closeBackupModal();
      }
    });

    const sessionActivityEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    sessionActivityEvents.forEach((eventName) => {
      document.addEventListener(eventName, () => { touchUnlockSession(); }, { passive: true });
    });

    const toggleBtns = [
      { btn: elements.toggleImportPassphraseVisibility, input: elements.importPassphrase },
      { btn: elements.toggleGeneratePassphraseVisibility, input: elements.generatePassphrase },
      { btn: elements.toggleBackupWifBtn, input: elements.backupWifText }
    ];

    toggleBtns.forEach(({ btn, input }) => {
      if (btn && input) {
        btn.addEventListener('click', () => {
          if (input.type === 'password') {
            input.type = 'text';
            // textarea doesn't use input.type='password', we just change class or type? Wait, textarea isn't a password input usually, but let's handle textarea specially if needed. But we made it a form-textarea. It may not obscure text. Actually, we should obscure textarea text via CSS for importKey.
            if (input.tagName === 'TEXTAREA') input.classList.add('visible');
          } else {
            input.type = 'password';
            if (input.tagName === 'TEXTAREA') input.classList.remove('visible');
          }
        });
      }
    });

    if (elements.importKey) elements.importKey.classList.add('obfuscated-text');

    elements.mnemonicCopyBtn.addEventListener('click', () => {
      const words = Array.from(elements.mnemonicWords.querySelectorAll('.mnemonic-word')).map(el => el.childNodes[1].nodeValue);
      navigator.clipboard.writeText(words.join(' '));
      showToast('Words copied!', 'success');
    });

    // Mnemonic modal: enable confirm button only after checkbox ticked
    elements.mnemonicBackedUp.addEventListener('change', () => {
      elements.mnemonicConfirmBtn.disabled = !elements.mnemonicBackedUp.checked;
    });
    elements.mnemonicConfirmBtn.addEventListener('click', closeMnemonicModal);
  }

  // ── Action handlers ───────────────────────────────────────────────────────

  function switchSetupTab(tabName) {
    const isImport = tabName === 'import';
    elements.setupTabImport.classList.toggle('is-active', isImport);
    elements.setupTabImport.setAttribute('aria-selected', isImport ? 'true' : 'false');
    elements.setupTabGenerate.classList.toggle('is-active', !isImport);
    elements.setupTabGenerate.setAttribute('aria-selected', !isImport ? 'true' : 'false');
    elements.setupPanelImport.classList.toggle('hidden', !isImport);
    elements.setupPanelGenerate.classList.toggle('hidden', isImport);
  }

  async function handleSaveKey() {
    const inputVal = (elements.importKey.value || '').trim();
    const network = elements.network.value;
    const passphrase = (elements.importPassphrase.value || '');

    if (!inputVal) {
      showToast('Please enter a 12 or 24-word seed phrase', 'error');
      return;
    }

    try {
      if (!(await ensurePinReadyForWalletSetup(handleSaveKey))) return;
      if (!ensureCanPersistPrivateKey()) return;
      showLoading(true);

      let wifKey = '';
      let mnemonicStr = null;
      let addressData;

      const words = inputVal.split(/\s+/).filter(Boolean);
      if (words.length !== 12 && words.length !== 24) {
        throw new Error('Please enter exactly 12 or 24 words.');
      }

      mnemonicStr = words.join(' ');
      if (!NeuraiKey.isMnemonicValid(mnemonicStr)) {
        throw new Error('Invalid seed phrase');
      }

      const addressPair = NeuraiKey.getAddressPair(network, mnemonicStr, 0, 0, passphrase);
      addressData = addressPair.external;
      wifKey = addressData.WIF;

      setActiveWalletData({
        privateKey: wifKey,
        address: addressData.address,
        publicKey: addressData.publicKey,
        network,
        mnemonic: mnemonicStr,
        passphrase: passphrase || null,
        history: [] // Initialize history for new accounts
      });

      applyReaderRpcForCurrentContext();
      await saveAccountsData();

      showLoading(false);
      showWalletSection();
      await updateBalance();
      startPolling();
      showToast('Wallet saved successfully!', 'success');

      elements.importKey.value = '';
      elements.importPassphrase.value = '';
      elements.saveKeyBtn.disabled = false;
    } catch (error) {
      showLoading(false);
      elements.saveKeyBtn.disabled = false;
      showToast('Cannot save wallet: ' + error.message, 'error');
    }
  }

  async function handleGenerateNew() {
    try {
      if (!(await ensurePinReadyForWalletSetup(handleGenerateNew))) return;
      if (!ensureCanPersistPrivateKey()) return;
      showLoading(true);
      const wordCount = parseInt(elements.generateWordCount.value, 10);
      const strength = wordCount === 24 ? 256 : 128;
      const mnemonic = NeuraiKey.generateMnemonic(strength);
      const network = elements.network.value;
      const passphrase = (elements.generatePassphrase.value || '');
      const addressPair = NeuraiKey.getAddressPair(network, mnemonic, 0, 0, passphrase);
      const addressData = addressPair.external;

      setActiveWalletData({
        privateKey: addressData.WIF,
        address: addressData.address,
        publicKey: addressData.publicKey,
        network,
        mnemonic,
        passphrase: passphrase || null
      });
      applyReaderRpcForCurrentContext();
      await saveAccountsData();

      showLoading(false);
      showWalletSection();
      await updateBalance();
      startPolling();

      // Show the mnemonic backup modal — never truncate or show in a toast
      showMnemonicModal(mnemonic, passphrase);
      elements.generatePassphrase.value = '';
    } catch (error) {
      showLoading(false);
      showToast('Error generating wallet: ' + error.message, 'error');
    }
  }

  function showMnemonicModal(mnemonic, passphrase) {
    const words = mnemonic.trim().split(/\s+/);
    elements.mnemonicWords.innerHTML = words.map((word, i) =>
      `<span class="mnemonic-word"><span class="mnemonic-word-num">${i + 1}</span>${word}</span>`
    ).join('');

    if (passphrase) {
      elements.mnemonicPassphraseDisplay.classList.remove('hidden');
      elements.mnemonicPassphraseText.textContent = passphrase;
    } else {
      elements.mnemonicPassphraseDisplay.classList.add('hidden');
    }

    elements.mnemonicBackedUp.checked = false;
    elements.mnemonicConfirmBtn.disabled = true;
    elements.mnemonicModal.classList.remove('hidden');
  }

  function closeMnemonicModal() {
    elements.mnemonicModal.classList.add('hidden');
  }

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
    state.sessionPin = '';
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

  async function handleConfirmRemoveAccount() {
    state.accounts = createDefaultAccounts();
    state.activeAccountId = '1';
    state.settings = { ...C.DEFAULT_SETTINGS, pinHash: '' };
    state.unlockUntil = 0;
    state.sessionPin = '';

    clearActiveWalletData();
    await saveAccountsData();
    await saveSettings();
    await new Promise((r) => chrome.storage.local.set({ [C.UNLOCK_UNTIL_KEY]: 0 }, r));

    closeRemoveConfirmModal();
    closeSettingsModal();
    syncPinSettingsUI();
    showSetupSection();
    showToast('All data has been reset', 'success');
  }

  // ── Balance ───────────────────────────────────────────────────────────────

  async function updateBalance() {
    if (isAddonLocked() || !state.address) return;

    try {
      setLoadingStatus(true);
      applyReaderRpcForCurrentContext();

      const balanceData = await NeuraiReader.getNeuraiBalance(state.address);
      if (balanceData) {
        state.balance = NeuraiReader.formatBalance(balanceData.balance);
        state.pendingBalance = NeuraiReader.formatBalance(balanceData.balance + balanceData.unconfirmed_balance);

        const assetBalance = await NeuraiReader.getAssetBalance(state.address);
        state.assets = normalizeAssetsFromRpc(assetBalance);

        renderAmount(elements.xnaBalance, state.balance, '0');
        renderAmount(elements.pendingBalance, state.pendingBalance, '0');
        renderAssetsList();

        elements.lastUpdate.textContent = 'Updated: ' + new Date().toLocaleTimeString();
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

  function showSetupSection() {
    elements.setupSection.classList.remove('hidden');
    elements.walletSection.classList.add('hidden');
    updateAccountLabels();
    elements.network.value = state.network || 'xna';
    applyReaderRpcForCurrentContext();
  }

  function showWalletSection() {
    elements.setupSection.classList.add('hidden');
    elements.walletSection.classList.remove('hidden');
    elements.addressDisplay.textContent = state.address;
    elements.addressDisplay.title = state.address || '';
    updateAccountLabels();

    const isTestnet = state.network === 'xna-test';
    elements.networkBadge.querySelector('span:last-child').textContent = isTestnet ? 'Testnet' : 'Mainnet';

    if (isTestnet) NeuraiReader.setTestnet(); else NeuraiReader.setMainnet();
    applyReaderRpcForCurrentContext();

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

  function setConnectionStatus(connected) {
    const dot = elements.statusIndicator.querySelector('.status-dot');
    const text = elements.statusIndicator.querySelector('.status-text');
    dot.className = 'status-dot' + (connected ? '' : ' disconnected');
    text.textContent = connected ? 'Connected' : 'Disconnected';
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
      if (!hasAccountSecret(entry)) continue;
      stored[id] = {
        privateKey: (!state.settings?.pinHash && entry.privateKey) ? entry.privateKey : null,
        privateKeyEnc: entry.privateKeyEnc || null,
        mnemonic: (!state.settings?.pinHash && entry.mnemonic) ? entry.mnemonic : null,
        mnemonicEnc: entry.mnemonicEnc || null,
        passphrase: (!state.settings?.pinHash && entry.passphrase) ? entry.passphrase : null,
        passphraseEnc: entry.passphraseEnc || null,
        address: entry.address || null,
        publicKey: entry.publicKey || null,
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
      if (!hasAccountSecret(entry)) continue;
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
      if (entry && typeof entry === 'object' && (entry.privateKey || NEURAI_UTILS.isEncryptedSecret(entry.privateKeyEnc))) {
        normalized[id] = {
          privateKey: entry.privateKey || null,
          privateKeyEnc: NEURAI_UTILS.isEncryptedSecret(entry.privateKeyEnc) ? entry.privateKeyEnc : null,
          mnemonic: entry.mnemonic || null,
          mnemonicEnc: NEURAI_UTILS.isEncryptedSecret(entry.mnemonicEnc) ? entry.mnemonicEnc : null,
          passphrase: entry.passphrase || null,
          passphraseEnc: NEURAI_UTILS.isEncryptedSecret(entry.passphraseEnc) ? entry.passphraseEnc : null,
          address: entry.address || null,
          publicKey: entry.publicKey || null,
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
  function hasActiveWallet() { return hasAccountSecret(getActiveWalletData()); }

  function getConfiguredAccountIds(accountsData = state.accounts) {
    return Object.keys(accountsData).filter((id) => hasAccountSecret(accountsData[id]));
  }

  function setActiveWalletData(walletData) {
    const previous = state.accounts[state.activeAccountId] || {};
    state.privateKey = walletData.privateKey || null;
    state.mnemonic = walletData.mnemonic || null;
    state.passphrase = walletData.passphrase || null;
    state.address = walletData.address || null;
    state.publicKey = walletData.publicKey || null;
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
      network: state.network
    };
  }

  function clearActiveWalletData() {
    stopPolling();
    state.privateKey = state.mnemonic = state.passphrase = state.address = state.publicKey = state.balance = state.pendingBalance = null;
    state.assets = [];
    renderAssetsList();
    switchBalanceTab('general');
    state.unlockUntil = 0;
    if (elements.importKey) elements.importKey.value = '';
    elements.addressDisplay.title = '';
  }

  function findNextEmptyAccountId() {
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) {
      const id = String(i);
      if (!hasAccountSecret(state.accounts[id])) return id;
    }
    return null;
  }

  function updateAccountLabels() {
    const label = getAccountLabel(state.activeAccountId);
    elements.setupAccountLabel.textContent = 'Account: ' + label;
    elements.currentAccountDisplay.textContent = label;
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
    state.activeAccountId = nextId;
    clearActiveWalletData();
    state.network = 'xna';
    await saveAccountsData();
    updateAccountLabels();
    closeAccountModal();
    showSetupSection();
    showToast('Switched to ' + getAccountLabel(nextId), 'success');
  }

  async function handleSwitchAccount() {
    const targetId = normalizeAccountId(elements.accountSelect.value, state.activeAccountId);
    const targetWallet = state.accounts[targetId];
    if (!hasAccountSecret(targetWallet)) {
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
        state.sessionPin = newPin;
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
    const locked = state.unlockUntil <= Date.now();
    if (locked) {
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
    elements.unlockModal.classList.remove('hidden');
    elements.unlockPinInput.focus();
  }

  function closeUnlockModal() {
    if (isAddonLocked()) return;
    elements.unlockModal.classList.add('hidden');
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

  function openInitialPinModal(resumeAction) {
    state.pendingWalletAction = resumeAction || null;
    elements.initialPinError.textContent = '';
    elements.initialPinInput.value = '';
    elements.initialPinConfirmInput.value = '';
    elements.initialPinModal.classList.remove('hidden');
    elements.initialPinInput.focus();
  }

  function closeInitialPinModal() {
    elements.initialPinModal.classList.add('hidden');
  }

  function cancelInitialPinSetup() {
    state.pendingWalletAction = null;
    closeInitialPinModal();
  }

  async function ensurePinReadyForWalletSetup(resumeAction) {
    if (state.settings?.pinHash) return true;
    openInitialPinModal(resumeAction);
    return false;
  }

  async function handleInitialPinSetup() {
    try {
      const pin = (elements.initialPinInput.value || '').trim();
      const confirm = (elements.initialPinConfirmInput.value || '').trim();
      if (pin.length < 4 || pin.length > 20) throw new Error('PIN must be 4 to 20 characters');
      if (pin !== confirm) throw new Error('PIN confirmation does not match');

      state.settings = {
        ...state.settings,
        pinHash: await NEURAI_UTILS.hashText(pin)
      };
      state.sessionPin = pin;
      await unlockForConfiguredTimeout();
      await saveSettings();
      await notifySettingsUpdated();
      syncPinSettingsUI();
      closeInitialPinModal();

      const action = state.pendingWalletAction;
      state.pendingWalletAction = null;
      if (typeof action === 'function') {
        await action();
      }
    } catch (error) {
      elements.initialPinError.textContent = error.message;
    }
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
      state.sessionPin = entered;
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

  function getRpcUrlForNetwork(network) {
    const s = state.settings || C.DEFAULT_SETTINGS;
    return network === 'xna-test'
      ? (s.rpcTestnet || NeuraiReader.URL_TESTNET)
      : (s.rpcMainnet || NeuraiReader.URL_MAINNET);
  }

  function applyReaderRpcForCurrentContext() {
    const network = hasActiveWallet() ? state.network : (elements.network.value || 'xna');
    if (network === 'xna-test') NeuraiReader.setTestnet(); else NeuraiReader.setMainnet();
    const url = getRpcUrlForNetwork(network);
    if (url) NeuraiReader.setURL(url);
  }

  // ── Background message listener ───────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message) => {
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
  });

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
