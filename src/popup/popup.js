// Neurai Wallet Popup — Main Logic
// Relies on globals loaded before this script:
//   NeuraiKey, NeuraiMessage, NeuraiReader  (from ../lib/)
//   NEURAI_CONSTANTS, NEURAI_UTILS          (from ../shared/)

(function () {
  'use strict';

  // ── Destructure shared globals for convenience ────────────────────────────
  const C   = NEURAI_CONSTANTS;
  const MSG = C.MSG;

  // ── DOM Elements ──────────────────────────────────────────────────────────
  const elements = {
    setupSection:         document.getElementById('setupSection'),
    walletSection:        document.getElementById('walletSection'),
    privateKey:           document.getElementById('privateKey'),
    network:              document.getElementById('network'),
    networkBadge:         document.getElementById('networkBadge'),
    openExpandedBtn:      document.getElementById('openExpandedBtn'),
    openSettingsBtn:      document.getElementById('openSettingsBtn'),
    settingsModal:        document.getElementById('settingsModal'),
    accountModal:         document.getElementById('accountModal'),
    removeConfirmModal:   document.getElementById('removeConfirmModal'),
    mnemonicModal:        document.getElementById('mnemonicModal'),
    closeSettingsBtn:     document.getElementById('closeSettingsBtn'),
    closeAccountModalBtn: document.getElementById('closeAccountModalBtn'),
    saveSettingsBtn:      document.getElementById('saveSettingsBtn'),
    resetSettingsBtn:     document.getElementById('resetSettingsBtn'),
    confirmRemoveBtn:     document.getElementById('confirmRemoveBtn'),
    cancelRemoveBtn:      document.getElementById('cancelRemoveBtn'),
    removeConfirmText:    document.getElementById('removeConfirmText'),
    themeMode:            document.getElementById('themeMode'),
    rpcMainnet:           document.getElementById('rpcMainnet'),
    rpcTestnet:           document.getElementById('rpcTestnet'),
    lockTimeoutMinutes:   document.getElementById('lockTimeoutMinutes'),
    pinStatusText:        document.getElementById('pinStatusText'),
    settingsPinOld:       document.getElementById('settingsPinOld'),
    settingsPinNew:       document.getElementById('settingsPinNew'),
    settingsPinConfirm:   document.getElementById('settingsPinConfirm'),
    removePinBtn:         document.getElementById('removePinBtn'),
    unlockModal:          document.getElementById('unlockModal'),
    unlockPinInput:       document.getElementById('unlockPinInput'),
    unlockError:          document.getElementById('unlockError'),
    unlockCancelBtn:      document.getElementById('unlockCancelBtn'),
    unlockConfirmBtn:     document.getElementById('unlockConfirmBtn'),
    initialPinModal:      document.getElementById('initialPinModal'),
    initialPinInput:      document.getElementById('initialPinInput'),
    initialPinConfirmInput: document.getElementById('initialPinConfirmInput'),
    initialPinError:      document.getElementById('initialPinError'),
    initialPinCancelBtn:  document.getElementById('initialPinCancelBtn'),
    initialPinSaveBtn:    document.getElementById('initialPinSaveBtn'),
    accountSelect:        document.getElementById('accountSelect'),
    accountCurrentLabel:  document.getElementById('accountCurrentLabel'),
    accountHint:          document.getElementById('accountHint'),
    switchAccountBtn:     document.getElementById('switchAccountBtn'),
    newAccountBtn:        document.getElementById('newAccountBtn'),
    setupAccountLabel:    document.getElementById('setupAccountLabel'),
    currentAccountDisplay:document.getElementById('currentAccountDisplay'),
    saveKeyBtn:           document.getElementById('saveKeyBtn'),
    generateNewBtn:       document.getElementById('generateNewBtn'),
    addressDisplay:       document.getElementById('addressDisplay'),
    copyAddressBtn:       document.getElementById('copyAddressBtn'),
    xnaBalance:           document.getElementById('xnaBalance'),
    pendingBalance:       document.getElementById('pendingBalance'),
    balanceTabGeneral:    document.getElementById('balanceTabGeneral'),
    balanceTabAssets:     document.getElementById('balanceTabAssets'),
    balancePanelGeneral:  document.getElementById('balancePanelGeneral'),
    balancePanelAssets:   document.getElementById('balancePanelAssets'),
    assetsList:           document.getElementById('assetsList'),
    assetsEmpty:          document.getElementById('assetsEmpty'),
    refreshBtn:           document.getElementById('refreshBtn'),
    statusIndicator:      document.getElementById('statusIndicator'),
    lastUpdate:           document.getElementById('lastUpdate'),
    changeWalletBtn:      document.getElementById('changeWalletBtn'),
    lockNowBtn:           document.getElementById('lockNowBtn'),
    removeWalletBtn:      document.getElementById('removeWalletBtn'),
    toast:                document.getElementById('toast'),
    toastMessage:         document.getElementById('toastMessage'),
    loadingOverlay:       document.getElementById('loadingOverlay'),
    mnemonicWords:        document.getElementById('mnemonicWords'),
    mnemonicBackedUp:     document.getElementById('mnemonicBackedUp'),
    mnemonicConfirmBtn:   document.getElementById('mnemonicConfirmBtn')
  };

  // ── State ─────────────────────────────────────────────────────────────────
  let state = {
    privateKey:      null,
    address:         null,
    publicKey:       null,
    network:         'xna',
    balance:         null,
    pendingBalance:  null,
    assets:          [],
    pollingInterval: null,
    isConnected:     false,
    settings:        null,
    accounts:        {},
    activeAccountId: '1',
    unlockUntil:     0,
    sessionPin:      '',
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

  // ── Event listeners ───────────────────────────────────────────────────────

  function setupEventListeners() {
    elements.openExpandedBtn.addEventListener('click', handleOpenExpandedView);
    elements.openSettingsBtn.addEventListener('click', openSettingsModal);
    elements.closeSettingsBtn.addEventListener('click', closeSettingsModal);
    elements.closeAccountModalBtn.addEventListener('click', closeAccountModal);
    elements.saveSettingsBtn.addEventListener('click', handleSaveSettings);
    elements.resetSettingsBtn.addEventListener('click', handleResetSettings);

    elements.settingsModal.addEventListener('click',      (e) => { if (e.target === elements.settingsModal)      closeSettingsModal(); });
    elements.accountModal.addEventListener('click',       (e) => { if (e.target === elements.accountModal)       closeAccountModal(); });
    elements.removeConfirmModal.addEventListener('click', (e) => { if (e.target === elements.removeConfirmModal) closeRemoveConfirmModal(); });
    elements.unlockModal.addEventListener('click',        (e) => {
      if (e.target === elements.unlockModal && !isAddonLocked()) closeUnlockModal();
    });
    elements.initialPinModal.addEventListener('click',    (e) => { if (e.target === elements.initialPinModal)    cancelInitialPinSetup(); });

    elements.removePinBtn.addEventListener('click', handleRemovePin);
    elements.saveKeyBtn.addEventListener('click', handleSaveKey);
    elements.generateNewBtn.addEventListener('click', handleGenerateNew);
    elements.copyAddressBtn.addEventListener('click', handleCopyAddress);
    elements.refreshBtn.addEventListener('click', handleRefresh);
    elements.balanceTabGeneral.addEventListener('click', () => switchBalanceTab('general'));
    elements.balanceTabAssets.addEventListener('click', () => switchBalanceTab('assets'));
    elements.changeWalletBtn.addEventListener('click', handleChangeWallet);
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
    elements.privateKey.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSaveKey(); });
    elements.network.addEventListener('change', applyReaderRpcForCurrentContext);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSettingsModal();
        closeAccountModal();
        closeRemoveConfirmModal();
        if (!isAddonLocked()) closeUnlockModal();
        closeInitialPinModal();
      }
    });

    const sessionActivityEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    sessionActivityEvents.forEach((eventName) => {
      document.addEventListener(eventName, () => { touchUnlockSession(); }, { passive: true });
    });

    const toggleBtn = document.getElementById('toggleKeyVisibility');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const input = elements.privateKey;
        input.type = input.type === 'password' ? 'text' : 'password';
      });
    }

    // Mnemonic modal: enable confirm button only after checkbox ticked
    elements.mnemonicBackedUp.addEventListener('change', () => {
      elements.mnemonicConfirmBtn.disabled = !elements.mnemonicBackedUp.checked;
    });
    elements.mnemonicConfirmBtn.addEventListener('click', closeMnemonicModal);
  }

  // ── Action handlers ───────────────────────────────────────────────────────

  function handleOpenExpandedView() {
    const url = chrome.runtime.getURL('popup/expanded.html');
    if (chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url });
      return;
    }
    window.open(url, '_blank');
  }

  async function handleSaveKey() {
    const wifKey  = elements.privateKey.value.trim();
    const network = elements.network.value;

    if (!wifKey) {
      showToast('Please enter a private key', 'error');
      return;
    }

    try {
      if (!(await ensurePinReadyForWalletSetup(handleSaveKey))) return;
      if (!ensureCanPersistPrivateKey()) return;
      showLoading(true);
      const addressData = NeuraiKey.getAddressByWIF(network, wifKey);
      setActiveWalletData({ privateKey: wifKey, address: addressData.address, publicKey: addressData.publicKey, network });
      applyReaderRpcForCurrentContext();
      await saveAccountsData();

      showLoading(false);
      showWalletSection();
      await updateBalance();
      startPolling();
      showToast('Wallet saved successfully!', 'success');
    } catch (error) {
      showLoading(false);
      showToast('Cannot save wallet: ' + error.message, 'error');
    }
  }

  async function handleGenerateNew() {
    try {
      if (!(await ensurePinReadyForWalletSetup(handleGenerateNew))) return;
      if (!ensureCanPersistPrivateKey()) return;
      showLoading(true);
      const mnemonic    = NeuraiKey.generateMnemonic();
      const network     = elements.network.value;
      const addressPair = NeuraiKey.getAddressPair(network, mnemonic, 0, 0, '');
      const addressData = addressPair.external;

      setActiveWalletData({
        privateKey: addressData.WIF,
        address:    addressData.address,
        publicKey:  addressData.publicKey,
        network
      });
      applyReaderRpcForCurrentContext();
      await saveAccountsData();

      showLoading(false);
      showWalletSection();
      await updateBalance();
      startPolling();

      // Show the mnemonic backup modal — never truncate or show in a toast
      showMnemonicModal(mnemonic);
    } catch (error) {
      showLoading(false);
      showToast('Error generating wallet: ' + error.message, 'error');
    }
  }

  function showMnemonicModal(mnemonic) {
    const words = mnemonic.trim().split(/\s+/);
    elements.mnemonicWords.innerHTML = words.map((word, i) =>
      `<span class="mnemonic-word"><span class="mnemonic-word-num">${i + 1}</span>${word}</span>`
    ).join('');
    elements.mnemonicBackedUp.checked     = false;
    elements.mnemonicConfirmBtn.disabled  = true;
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
    const label = getAccountLabel(state.activeAccountId);
    elements.removeConfirmText.textContent =
      'Warning: this will delete private key data from ' + label + '. Do you want to continue?';
    elements.removeConfirmModal.classList.remove('hidden');
  }

  function closeRemoveConfirmModal() {
    elements.removeConfirmModal.classList.add('hidden');
  }

  async function handleConfirmRemoveAccount() {
    const accountId = state.activeAccountId;
    state.accounts[accountId] = null;
    clearActiveWalletData();
    await saveAccountsData();
    closeRemoveConfirmModal();
    closeSettingsModal();
    showSetupSection();
    showToast(getAccountLabel(accountId) + ' removed', 'success');
  }

  // ── Balance ───────────────────────────────────────────────────────────────

  async function updateBalance() {
    if (isAddonLocked() || !state.address) return;

    try {
      setLoadingStatus(true);
      applyReaderRpcForCurrentContext();

      const balanceData = await NeuraiReader.getNeuraiBalance(state.address);
      if (balanceData) {
        state.balance        = NeuraiReader.formatBalance(balanceData.balance);
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
    elements.addressDisplay.title       = state.address || '';
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
    const dot  = elements.statusIndicator.querySelector('.status-dot');
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
        state.accounts       = normalizeAccounts(result[C.ACCOUNTS_KEY]);
        state.activeAccountId = normalizeAccountId(result[C.ACTIVE_ACCOUNT_KEY], '1');

        const hasAny = getConfiguredAccountIds(state.accounts).length > 0;
        if (!hasAny && legacyWallet && (legacyWallet.privateKey || legacyWallet.privateKeyEnc)) {
          state.accounts['1'] = {
            privateKey: legacyWallet.privateKey || null,
            privateKeyEnc: legacyWallet.privateKeyEnc || null,
            address:    legacyWallet.address    || null,
            publicKey:  legacyWallet.publicKey  || null,
            network:    legacyWallet.network    || 'xna'
          };
          state.activeAccountId = '1';
          await saveAccountsData();
        }

        const activeWallet = getActiveWalletData();
        if (activeWallet) {
          state.address   = activeWallet.address || null;
          state.publicKey = activeWallet.publicKey || null;
          state.network   = activeWallet.network || 'xna';
          state.privateKey = (!state.settings?.pinHash && activeWallet.privateKey) ? activeWallet.privateKey : null;
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
        [C.ACCOUNTS_KEY]:       storedAccounts,
        [C.ACTIVE_ACCOUNT_KEY]: state.activeAccountId,
        [C.STORAGE_KEY]:        activeWallet
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
        address: entry.address || null,
        publicKey: entry.publicKey || null,
        network: entry.network || 'xna'
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
      if (!plain && entry.privateKeyEnc) {
        continue;
      }
      if (!plain) continue;
      if (!pin) throw new Error('PIN is required to encrypt wallet keys');

      entry.privateKeyEnc = await NEURAI_UTILS.encryptTextWithPin(plain, pin);
      if (id !== state.activeAccountId) entry.privateKey = null;
    }
  }

  async function unlockActiveWalletPrivateKey(pin) {
    const active = getActiveWalletData();
    if (!active) return;
    if (active.privateKey) {
      state.privateKey = active.privateKey;
      return;
    }
    if (!active.privateKeyEnc) throw new Error('Encrypted key not found');
    const plain = await NEURAI_UTILS.decryptTextWithPin(active.privateKeyEnc, pin);
    active.privateKey = plain;
    state.privateKey = plain;
  }

  async function decryptAllWalletKeysWithPin(pin) {
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) {
      const id = String(i);
      const entry = state.accounts[id];
      if (!hasAccountSecret(entry)) continue;
      if (entry.privateKey) continue;
      if (!entry.privateKeyEnc) continue;
      const plain = await NEURAI_UTILS.decryptTextWithPin(entry.privateKeyEnc, pin);
      entry.privateKey = plain;
      entry.privateKeyEnc = null;
      if (id === state.activeAccountId) state.privateKey = plain;
    }
  }

  async function reencryptAllWalletKeys(oldPin, newPin) {
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) {
      const id = String(i);
      const entry = state.accounts[id];
      if (!hasAccountSecret(entry)) continue;

      let plain = entry.privateKey || null;
      if (!plain && entry.privateKeyEnc) {
        if (!oldPin) throw new Error('Current PIN is required to rotate keys');
        plain = await NEURAI_UTILS.decryptTextWithPin(entry.privateKeyEnc, oldPin);
      }
      if (!plain) continue;

      entry.privateKeyEnc = await NEURAI_UTILS.encryptTextWithPin(plain, newPin);
      if (id !== state.activeAccountId) entry.privateKey = null;
      if (id === state.activeAccountId) state.privateKey = plain;
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
      const id    = String(i);
      const entry = rawAccounts[id];
      if (entry && typeof entry === 'object' && (entry.privateKey || NEURAI_UTILS.isEncryptedSecret(entry.privateKeyEnc))) {
        normalized[id] = {
          privateKey: entry.privateKey || null,
          privateKeyEnc: NEURAI_UTILS.isEncryptedSecret(entry.privateKeyEnc) ? entry.privateKeyEnc : null,
          address: entry.address || null,
          publicKey: entry.publicKey || null,
          network: entry.network || 'xna'
        };
      }
    }
    return normalized;
  }

  function getAccountLabel(accountId)      { return 'Neurai_' + accountId; }
  function getActiveWalletData()           { return state.accounts[state.activeAccountId] || null; }
  function hasAccountSecret(entry)         { return !!(entry && (entry.privateKey || entry.privateKeyEnc)); }
  function hasActiveWallet()               { return hasAccountSecret(getActiveWalletData()); }

  function getConfiguredAccountIds(accountsData = state.accounts) {
    return Object.keys(accountsData).filter((id) => hasAccountSecret(accountsData[id]));
  }

  function setActiveWalletData(walletData) {
    const previous = state.accounts[state.activeAccountId] || {};
    state.privateKey = walletData.privateKey || null;
    state.address    = walletData.address || null;
    state.publicKey  = walletData.publicKey || null;
    state.network    = walletData.network || 'xna';
    state.accounts[state.activeAccountId] = {
      privateKey: state.privateKey,
      privateKeyEnc: walletData.privateKeyEnc || previous.privateKeyEnc || null,
      address:    state.address,
      publicKey:  state.publicKey,
      network:    state.network
    };
  }

  function clearActiveWalletData() {
    stopPolling();
    state.privateKey = state.address = state.publicKey = state.balance = state.pendingBalance = null;
    state.assets = [];
    renderAssetsList();
    switchBalanceTab('general');
    state.unlockUntil = 0;
    elements.privateKey.value    = '';
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
    elements.setupAccountLabel.textContent     = 'Account: ' + label;
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
      elements.accountSelect.innerHTML  = '<option value="">No configured account</option>';
      elements.accountSelect.disabled   = true;
      elements.switchAccountBtn.disabled = true;
    } else {
      elements.accountSelect.innerHTML  = configuredIds.map((id) =>
        `<option value="${id}">${getAccountLabel(id)}</option>`).join('');
      elements.accountSelect.disabled   = false;
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
    const targetId     = normalizeAccountId(elements.accountSelect.value, state.activeAccountId);
    const targetWallet = state.accounts[targetId];
    if (!hasAccountSecret(targetWallet)) {
      showToast('Selected account is not configured', 'error');
      return;
    }
    state.activeAccountId = targetId;
    setActiveWalletData(targetWallet);
    if (state.settings?.pinHash && state.sessionPin) {
      try { await unlockActiveWalletPrivateKey(state.sessionPin); } catch (_) {}
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
    elements.themeMode.value          = s.theme             || C.DEFAULT_SETTINGS.theme;
    elements.rpcMainnet.value         = s.rpcMainnet        || '';
    elements.rpcTestnet.value         = s.rpcTestnet        || '';
    elements.lockTimeoutMinutes.value = NEURAI_UTILS.normalizeLockTimeoutMinutes(s.lockTimeoutMinutes);
    syncPinSettingsUI();
  }

  function syncPinSettingsUI() {
    const hasPin = !!state.settings?.pinHash;
    elements.pinStatusText.textContent = hasPin ? 'Active' : 'Not configured';
    elements.pinStatusText.classList.toggle('active', hasPin);
    elements.removePinBtn.style.display = hasPin ? '' : 'none';
    elements.settingsPinOld.value     = '';
    elements.settingsPinNew.value     = '';
    elements.settingsPinConfirm.value = '';
  }

  async function handleSaveSettings() {
    try {
      const currentPin = (elements.settingsPinOld.value    || '').trim();
      const newPin     = (elements.settingsPinNew.value     || '').trim();
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
        theme:              elements.themeMode.value || C.DEFAULT_SETTINGS.theme,
        rpcMainnet:         normalizeOptionalUrl(elements.rpcMainnet.value),
        rpcTestnet:         normalizeOptionalUrl(elements.rpcTestnet.value),
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

  async function handleRemovePin() {
    if (!state.settings?.pinHash) return;
    if (!state.sessionPin) {
      showToast('Unlock with current PIN before removing PIN', 'error');
      return;
    }
    await decryptAllWalletKeysWithPin(state.sessionPin);
    state.settings = { ...state.settings, pinHash: '' };
    state.unlockUntil = 0;
    state.sessionPin = '';
    await saveSettings();
    await new Promise((r) => chrome.storage.local.set({ [C.UNLOCK_UNTIL_KEY]: 0 }, r));
    await saveAccountsData();
    syncPinSettingsUI();
    showToast('PIN removed', 'success');
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
    try { await chrome.runtime.sendMessage({ type: MSG.SETTINGS_UPDATED }); } catch (_) {}
  }

  // ── Lock / PIN ────────────────────────────────────────────────────────────

  function isAddonLocked() {
    if (!hasActiveWallet())         return false;
    if (!state.settings?.pinHash)   return false;
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
    elements.unlockPinInput.value    = '';
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
    unlockForConfiguredTimeout().catch(() => {});
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
    const has     = await new Promise((r) => chrome.permissions.contains({ origins }, r));
    if (has) return;
    const granted = await new Promise((r) => chrome.permissions.request({ origins }, r));
    if (!granted) throw new Error('Permission denied for custom RPC host');
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
