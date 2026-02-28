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
    refreshBtn:         document.getElementById('refreshBtn'),
    headerSubtitle:     document.getElementById('headerSubtitle'),

    // Sections
    setupSection:       document.getElementById('setupSection'),
    mnemonicSection:    document.getElementById('mnemonicSection'),
    walletSection:      document.getElementById('walletSection'),

    // Setup form
    network:            document.getElementById('network'),
    privateKey:         document.getElementById('privateKey'),
    saveKeyBtn:         document.getElementById('saveKeyBtn'),
    generateNewBtn:     document.getElementById('generateNewBtn'),

    // Mnemonic
    mnemonicWords:      document.getElementById('mnemonicWords'),
    mnemonicBackedUp:   document.getElementById('mnemonicBackedUp'),
    mnemonicConfirmBtn: document.getElementById('mnemonicConfirmBtn'),

    // Wallet display
    copyAddressBtn:     document.getElementById('copyAddressBtn'),
    networkValue:       document.getElementById('networkValue'),
    accountValue:       document.getElementById('accountValue'),
    statusValue:        document.getElementById('statusValue'),
    updatedValue:       document.getElementById('updatedValue'),
    addressValue:       document.getElementById('addressValue'),
    balanceValue:       document.getElementById('balanceValue'),
    pendingValue:       document.getElementById('pendingValue'),
    balanceTabGeneral:  document.getElementById('balanceTabGeneral'),
    balanceTabAssets:   document.getElementById('balanceTabAssets'),
    balancePanelGeneral:document.getElementById('balancePanelGeneral'),
    balancePanelAssets: document.getElementById('balancePanelAssets'),
    assetsList:         document.getElementById('assetsList'),
    assetsEmpty:        document.getElementById('assetsEmpty'),
    unlockModal:        document.getElementById('unlockModal'),
    unlockPinInput:     document.getElementById('unlockPinInput'),
    unlockError:        document.getElementById('unlockError'),
    unlockConfirmBtn:   document.getElementById('unlockConfirmBtn')
  };

  let state = {
    wallet:          null,
    accounts:        null,
    activeAccountId: '1',
    settings:        { ...C.DEFAULT_SETTINGS },
    assets:          [],
    unlockUntil:     0,
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
    elements.saveKeyBtn.addEventListener('click', handleSaveKey);
    elements.generateNewBtn.addEventListener('click', handleGenerateNew);
    elements.privateKey.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSaveKey();
    });
    elements.mnemonicBackedUp.addEventListener('change', () => {
      elements.mnemonicConfirmBtn.disabled = !elements.mnemonicBackedUp.checked;
    });
    elements.mnemonicConfirmBtn.addEventListener('click', closeMnemonicSection);
    elements.unlockConfirmBtn.addEventListener('click', handleUnlock);

    const sessionActivityEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    sessionActivityEvents.forEach((eventName) => {
      document.addEventListener(eventName, () => { touchUnlockSession(); }, { passive: true });
    });
  }

  // ── Setup handlers ─────────────────────────────────────────────────────────

  async function handleSaveKey() {
    const wif     = elements.privateKey.value.trim();
    const network = elements.network.value;

    if (!wif) {
      alert('Please enter a private key (WIF)');
      return;
    }

    elements.saveKeyBtn.disabled = true;
    try {
      const addressData = NeuraiKey.getAddressByWIF(network, wif);
      await persistWallet({ privateKey: wif, address: addressData.address, publicKey: addressData.publicKey, network });
      showWalletSection();
      await refreshBalance();
    } catch (err) {
      alert('Cannot import key: ' + err.message);
    } finally {
      elements.saveKeyBtn.disabled = false;
    }
  }

  async function handleGenerateNew() {
    elements.generateNewBtn.disabled = true;
    try {
      const mnemonic    = NeuraiKey.generateMnemonic();
      const network     = elements.network.value;
      const addressPair = NeuraiKey.getAddressPair(network, mnemonic, 0, 0, '');
      const addressData = addressPair.external;

      await persistWallet({
        privateKey: addressData.WIF,
        address:    addressData.address,
        publicKey:  addressData.publicKey,
        network
      });
      showMnemonicSection(mnemonic);
    } catch (err) {
      alert('Error generating wallet: ' + err.message);
    } finally {
      elements.generateNewBtn.disabled = false;
    }
  }

  // ── Mnemonic display ───────────────────────────────────────────────────────

  function showMnemonicSection(mnemonic) {
    const words = mnemonic.trim().split(/\s+/);
    elements.mnemonicWords.innerHTML = words.map((word, i) =>
      `<span class="mnemonic-word"><span class="mnemonic-word-num">${i + 1}</span>${word}</span>`
    ).join('');
    elements.mnemonicBackedUp.checked    = false;
    elements.mnemonicConfirmBtn.disabled = true;

    elements.setupSection.classList.add('hidden');
    elements.mnemonicSection.classList.remove('hidden');
    elements.walletSection.classList.add('hidden');
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
    elements.refreshBtn.style.display   = 'none';
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
    elements.refreshBtn.style.display   = '';
    elements.setupSection.classList.add('hidden');
    elements.mnemonicSection.classList.add('hidden');
    elements.walletSection.classList.remove('hidden');
    renderWalletInfo();
    touchUnlockSession(true);
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

    elements.statusValue.textContent  = 'Loading…';
    elements.updatedValue.textContent = '--';

    applyReaderConfig(state.wallet.network || 'xna');

    try {
      const balanceData = await NeuraiReader.getNeuraiBalance(state.wallet.address);
      const balance     = NeuraiReader.formatBalance(balanceData.balance);
      const pending     = NeuraiReader.formatBalance(balanceData.balance + balanceData.unconfirmed_balance);
      const assetBalance = await NeuraiReader.getAssetBalance(state.wallet.address);
      state.assets = normalizeAssetsFromRpc(assetBalance);
      renderAmount(elements.balanceValue, balance, '0');
      renderAmount(elements.pendingValue, pending, '0');
      renderAssetsList();
      elements.statusValue.textContent   = 'Connected';
      elements.updatedValue.textContent  = new Date().toLocaleString();
    } catch (error) {
      elements.statusValue.textContent  = 'RPC error';
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
    navigator.clipboard.writeText(address).catch(() => {});
  }

  // ── Storage ────────────────────────────────────────────────────────────────

  async function loadState() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        [C.STORAGE_KEY, C.ACCOUNTS_KEY, C.ACTIVE_ACCOUNT_KEY, C.SETTINGS_KEY, C.UNLOCK_UNTIL_KEY],
        (result) => {
          state.accounts        = result[C.ACCOUNTS_KEY] || null;
          state.activeAccountId = String(result[C.ACTIVE_ACCOUNT_KEY] || '1');
          const activeWallet    = state.accounts && state.accounts[state.activeAccountId]
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
    unlockForConfiguredTimeout().catch(() => {});
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
        [C.ACCOUNTS_KEY]:       state.accounts,
        [C.ACTIVE_ACCOUNT_KEY]: state.activeAccountId,
        [C.STORAGE_KEY]:        walletData
      }, resolve);
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[C.UNLOCK_UNTIL_KEY]) {
      state.unlockUntil = Number(changes[C.UNLOCK_UNTIL_KEY].newValue || 0);
    }
  });

  // ── Boot ───────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
