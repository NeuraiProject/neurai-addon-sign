// Neurai Wallet — Full-tab expanded view
// Relies on globals loaded before this script:
//   NeuraiKey               (from ../lib/)
//   NeuraiReader            (from ../lib/)
//   NEURAI_CONSTANTS, NEURAI_UTILS  (from ../shared/)

(function () {
  'use strict';

  const C = NEURAI_CONSTANTS;

  const elements = {
    // Header
    refreshBtn: document.getElementById('refreshBtn'),
    headerSubtitle: document.getElementById('headerSubtitle'),

    // Sections
    setupSection: document.getElementById('setupSection'),
    mnemonicSection: document.getElementById('mnemonicSection'),
    walletSection: document.getElementById('walletSection'),

    // Setup form
    setupTabImport: document.getElementById('setupTabImport'),
    setupTabGenerate: document.getElementById('setupTabGenerate'),
    setupPanelImport: document.getElementById('setupPanelImport'),
    setupPanelGenerate: document.getElementById('setupPanelGenerate'),
    network: document.getElementById('network'),
    importKey: document.getElementById('importKey'),
    importPassphrase: document.getElementById('importPassphrase'),
    toggleImportPassphraseVisibility: document.getElementById('toggleImportPassphraseVisibility'),
    saveKeyBtn: document.getElementById('saveKeyBtn'),

    generateWordCount: document.getElementById('generateWordCount'),
    generatePassphrase: document.getElementById('generatePassphrase'),
    toggleGeneratePassphraseVisibility: document.getElementById('toggleGeneratePassphraseVisibility'),
    generateNewBtn: document.getElementById('generateNewBtn'),

    // Mnemonic
    mnemonicWords: document.getElementById('mnemonicWords'),
    mnemonicPassphraseDisplay: document.getElementById('mnemonicPassphraseDisplay'),
    mnemonicPassphraseText: document.getElementById('mnemonicPassphraseText'),
    mnemonicCopyBtn: document.getElementById('mnemonicCopyBtn'),
    mnemonicBackedUp: document.getElementById('mnemonicBackedUp'),
    mnemonicConfirmBtn: document.getElementById('mnemonicConfirmBtn'),

    // Wallet display
    copyAddressBtn: document.getElementById('copyAddressBtn'),
    networkValue: document.getElementById('networkValue'),
    accountValue: document.getElementById('accountValue'),
    statusValue: document.getElementById('statusValue'),
    updatedValue: document.getElementById('updatedValue'),
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

    initialPinModal: document.getElementById('initialPinModal'),
    initialPinInput: document.getElementById('initialPinInput'),
    initialPinConfirmInput: document.getElementById('initialPinConfirmInput'),
    initialPinError: document.getElementById('initialPinError'),
    initialPinCancelBtn: document.getElementById('initialPinCancelBtn'),
    initialPinSaveBtn: document.getElementById('initialPinSaveBtn')
  };

  let state = {
    wallet: null,
    accounts: null,
    activeAccountId: '1',
    settings: { ...C.DEFAULT_SETTINGS },
    assets: [],
    unlockUntil: 0,
    lockWatchInterval: null,
    lastUnlockTouchAt: 0
  };

  // ── Initialization ─────────────────────────────────────────────────────────

  async function init() {
    await loadState();
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
      showSetupSection();
    }
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  function bindEvents() {
    elements.refreshBtn.addEventListener('click', handleRefresh);
    elements.balanceTabGeneral.addEventListener('click', () => switchBalanceTab('general'));
    elements.balanceTabAssets.addEventListener('click', () => switchBalanceTab('assets'));
    elements.copyAddressBtn.addEventListener('click', copyAddress);

    // Setup tab switching
    elements.setupTabImport.addEventListener('click', () => switchSetupTab('import'));
    elements.setupTabGenerate.addEventListener('click', () => switchSetupTab('generate'));

    // Visibility togglers
    elements.toggleImportPassphraseVisibility.addEventListener('click', () => toggleKeyVisibility(elements.importPassphrase, elements.toggleImportPassphraseVisibility));
    elements.toggleGeneratePassphraseVisibility.addEventListener('click', () => toggleKeyVisibility(elements.generatePassphrase, elements.toggleGeneratePassphraseVisibility));

    elements.saveKeyBtn.addEventListener('click', handleSaveKey);
    elements.generateNewBtn.addEventListener('click', handleGenerateNew);

    elements.importKey.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSaveKey();
    });
    elements.importPassphrase.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSaveKey();
    });
    elements.generatePassphrase.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleGenerateNew();
    });

    elements.mnemonicBackedUp.addEventListener('change', () => {
      elements.mnemonicConfirmBtn.disabled = !elements.mnemonicBackedUp.checked;
    });
    elements.mnemonicCopyBtn.addEventListener('click', copyMnemonic);
    elements.mnemonicConfirmBtn.addEventListener('click', closeMnemonicSection);
    elements.unlockConfirmBtn.addEventListener('click', handleUnlock);

    elements.initialPinCancelBtn.addEventListener('click', cancelInitialPinSetup);
    elements.initialPinSaveBtn.addEventListener('click', handleInitialPinSetup);
    elements.initialPinInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleInitialPinSetup();
    });
    elements.initialPinConfirmInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleInitialPinSetup();
    });

    const sessionActivityEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    sessionActivityEvents.forEach((eventName) => {
      document.addEventListener(eventName, () => { touchUnlockSession(); }, { passive: true });
    });
  }

  // ── Setup handlers ─────────────────────────────────────────────────────────

  function switchSetupTab(tab) {
    const isImport = tab === 'import';
    elements.setupTabImport.classList.toggle('is-active', isImport);
    elements.setupTabImport.setAttribute('aria-selected', isImport ? 'true' : 'false');
    elements.setupTabGenerate.classList.toggle('is-active', !isImport);
    elements.setupTabGenerate.setAttribute('aria-selected', !isImport ? 'true' : 'false');

    elements.setupPanelImport.classList.toggle('hidden', !isImport);
    elements.setupPanelGenerate.classList.toggle('hidden', isImport);
  }

  function toggleKeyVisibility(inputEl, btnEl) {
    let currentType = 'password';
    if (inputEl.tagName === 'TEXTAREA') {
      currentType = inputEl.classList.contains('text-visible') ? 'text' : 'password';
      if (currentType === 'password') {
        inputEl.classList.add('text-visible');
        btnEl.classList.add('visible');
      } else {
        inputEl.classList.remove('text-visible');
        btnEl.classList.remove('visible');
      }
    } else {
      currentType = inputEl.type;
      if (currentType === 'password') {
        inputEl.type = 'text';
        btnEl.classList.add('visible');
      } else {
        inputEl.type = 'password';
        btnEl.classList.remove('visible');
      }
    }
  }

  async function handleSaveKey() {
    let inputValStr = elements.importKey.value.trim();
    const passphrase = elements.importPassphrase.value;
    const network = elements.network.value;

    if (!inputValStr) {
      alert('Please enter a 12 or 24-word seed phrase');
      return;
    }

    if (!(await ensurePinReadyForWalletSetup(handleSaveKey))) return;

    elements.saveKeyBtn.disabled = true;
    try {
      let wif = '';
      let activeMnemonic = null;

      const words = inputValStr.split(/\s+/).filter(Boolean);
      if (words.length !== 12 && words.length !== 24) {
        throw new Error('Please enter exactly 12 or 24 words.');
      }

      activeMnemonic = words.join(' ');
      if (!NeuraiKey.validateMnemonic(activeMnemonic)) {
        throw new Error('Invalid mnemonic recovery phrase');
      }

      const addressPair = NeuraiKey.getAddressPair(network, activeMnemonic, 0, 0, passphrase);
      wif = addressPair.external.WIF;

      const addressData = NeuraiKey.getAddressByWIF(network, wif);

      await persistWallet({
        privateKey: wif,
        mnemonic: activeMnemonic,
        passphrase: passphrase || null,
        address: addressData.address,
        publicKey: addressData.publicKey,
        network
      });

      elements.importKey.value = '';
      elements.importPassphrase.value = '';
      showWalletSection();
      await refreshBalance();
    } catch (err) {
      alert('Cannot import: ' + err.message);
    } finally {
      elements.saveKeyBtn.disabled = false;
    }
  }

  async function handleGenerateNew() {
    if (!(await ensurePinReadyForWalletSetup(handleGenerateNew))) return;

    elements.generateNewBtn.disabled = true;
    try {
      const wordCount = parseInt(elements.generateWordCount.value, 10) || 12;
      const passphrase = elements.generatePassphrase.value;
      const network = elements.network.value;

      const mnemonic = NeuraiKey.generateMnemonic(wordCount === 24 ? 256 : 128);
      const addressPair = NeuraiKey.getAddressPair(network, mnemonic, 0, 0, passphrase);
      const addressData = addressPair.external;

      await persistWallet({
        privateKey: addressData.WIF,
        mnemonic: mnemonic,
        passphrase: passphrase,
        address: addressData.address,
        publicKey: addressData.publicKey,
        network
      });

      elements.generatePassphrase.value = '';
      showMnemonicSection(mnemonic, passphrase);
    } catch (err) {
      alert('Error generating wallet: ' + err.message);
    } finally {
      elements.generateNewBtn.disabled = false;
    }
  }

  // ── Mnemonic display ───────────────────────────────────────────────────────

  function showMnemonicSection(mnemonic, passphrase) {
    state.activeGeneratedMnemonic = mnemonic;

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

    elements.setupSection.classList.add('hidden');
    elements.mnemonicSection.classList.remove('hidden');
    elements.walletSection.classList.add('hidden');
  }

  function copyMnemonic() {
    if (!state.activeGeneratedMnemonic) return;
    navigator.clipboard.writeText(state.activeGeneratedMnemonic).then(() => {
      const originalText = elements.mnemonicCopyBtn.textContent;
      elements.mnemonicCopyBtn.textContent = 'Copied!';
      setTimeout(() => { elements.mnemonicCopyBtn.textContent = originalText; }, 2000);
    }).catch(() => { });
  }

  function closeMnemonicSection() {
    elements.mnemonicSection.classList.add('hidden');
    showWalletSection();
    refreshBalance();
  }

  // ── Section visibility ─────────────────────────────────────────────────────

  function showSetupSection() {
    if (isAddonLocked()) {
      openUnlockModal();
      return;
    }
    elements.headerSubtitle.textContent = 'Set up your wallet to get started';
    elements.refreshBtn.style.display = 'none';
    elements.setupSection.classList.remove('hidden');
    elements.mnemonicSection.classList.add('hidden');
    elements.walletSection.classList.add('hidden');
  }

  function showWalletSection() {
    if (isAddonLocked()) {
      openUnlockModal();
      return;
    }
    elements.headerSubtitle.textContent = 'Full tab view';
    elements.refreshBtn.style.display = '';
    elements.setupSection.classList.add('hidden');
    elements.mnemonicSection.classList.add('hidden');
    elements.walletSection.classList.remove('hidden');
    renderWalletInfo();
    renderHistory();
    touchUnlockSession(true);
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

      const header = document.createElement('div');
      header.className = 'history-item-header';
      const dateStr = new Date(item.timestamp).toLocaleString();
      header.innerHTML = `<span class="history-item-origin">${escapeHtml(item.origin)}</span><span>${escapeHtml(dateStr)}</span>`;

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
    elements.updatedValue.textContent = '--';

    applyReaderConfig(state.wallet.network || 'xna');

    try {
      const balanceData = await NeuraiReader.getNeuraiBalance(state.wallet.address);
      const balance = NeuraiReader.formatBalance(balanceData.balance);
      const pending = NeuraiReader.formatBalance(balanceData.balance + balanceData.unconfirmed_balance);
      const assetBalance = await NeuraiReader.getAssetBalance(state.wallet.address);
      state.assets = normalizeAssetsFromRpc(assetBalance);
      renderAmount(elements.balanceValue, balance, '0');
      renderAmount(elements.pendingValue, pending, '0');
      renderAssetsList();
      elements.statusValue.textContent = 'Connected';
      elements.updatedValue.textContent = new Date().toLocaleString();
      renderHistory();
    } catch (error) {
      elements.statusValue.textContent = 'RPC error';
      elements.updatedValue.textContent = 'Failed to fetch balance';
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
    elements.setupSection.classList.add('hidden');
    elements.mnemonicSection.classList.add('hidden');
    elements.walletSection.classList.add('hidden');
    elements.unlockError.textContent = '';
    elements.unlockPinInput.value = '';
    elements.unlockModal.classList.remove('hidden');
    elements.unlockPinInput.focus();
  }

  function closeUnlockModal() {
    if (isAddonLocked()) return;
    elements.unlockModal.classList.add('hidden');
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

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[C.UNLOCK_UNTIL_KEY]) {
      state.unlockUntil = Number(changes[C.UNLOCK_UNTIL_KEY].newValue || 0);
    }
  });

  // ── Initial PIN Setup ────────────────────────────────────────────────────────

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
      await new Promise((resolve) => chrome.storage.local.set({ [C.SETTINGS_KEY]: state.settings }, resolve));

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

  // ── Boot ───────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
