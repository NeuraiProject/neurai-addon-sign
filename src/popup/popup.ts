// Neurai Wallet Popup — Main Logic
// Relies on globals loaded before this script:
//   NeuraiKey, NeuraiMessage, NeuraiReader  (from ../lib/ via classic <script> tags)
import { NEURAI_CONSTANTS } from '../shared/constants.js';
import { NEURAI_UTILS } from '../shared/utils.js';
import {
  parseRawTransactionInputs,
  parseRawTransactionOutputs
} from '../shared/parse-raw-tx.js';
import { computeTxid, resolveExplorerTxUrl } from '../shared/explorer.js';
import type { EncryptedSecret, WalletSettings } from '../types/index.js';

(function () {
  'use strict';

  // ── Destructure shared globals for convenience ────────────────────────────
  const C = NEURAI_CONSTANTS;
  const MSG = C.MSG;

  // ── Persistent HW device connection ─────────────────────────────────────
  let hwDevice: NeuraiESP32Instance | null = null; // NeuraiESP32 instance, kept alive while popup is open
  let hwStatusInterval: ReturnType<typeof setInterval> | null = null; // polling interval for connection status

  // ── DOM Elements ──────────────────────────────────────────────────────────
  const elements = {
    walletSection: document.getElementById('walletSection')!,
    networkBadge: document.getElementById('networkBadge')!,
    openExpandedBtn: document.getElementById('openExpandedBtn')!,
    openSettingsBtn: document.getElementById('openSettingsBtn')!,
    settingsModal: document.getElementById('settingsModal')!,
    accountModal: document.getElementById('accountModal')!,
    removeConfirmModal: document.getElementById('removeConfirmModal')!,
    closeSettingsBtn: document.getElementById('closeSettingsBtn')!,
    closeAccountModalBtn: document.getElementById('closeAccountModalBtn')!,
    saveSettingsBtn: document.getElementById('saveSettingsBtn')!,
    resetSettingsBtn: document.getElementById('resetSettingsBtn')!,
    confirmRemoveBtn: document.getElementById('confirmRemoveBtn')!,
    cancelRemoveBtn: document.getElementById('cancelRemoveBtn')!,
    removeConfirmText: document.getElementById('removeConfirmText')!,
    themeMode: document.getElementById('themeMode') as HTMLSelectElement | null,
    rpcMainnet: document.getElementById('rpcMainnet') as HTMLInputElement | null,
    rpcTestnet: document.getElementById('rpcTestnet') as HTMLInputElement | null,
    explorerMainnet: document.getElementById('explorerMainnet') as HTMLInputElement | null,
    explorerTestnet: document.getElementById('explorerTestnet') as HTMLInputElement | null,
    lockTimeoutMinutes: document.getElementById('lockTimeoutMinutes') as HTMLInputElement | null,
    pinStatusText: document.getElementById('pinStatusText')!,
    settingsPinOld: document.getElementById('settingsPinOld') as HTMLInputElement | null,
    settingsPinNew: document.getElementById('settingsPinNew') as HTMLInputElement | null,
    settingsPinConfirm: document.getElementById('settingsPinConfirm') as HTMLInputElement | null,
    openBackupBtn: document.getElementById('openBackupBtn') as HTMLButtonElement | null,
    unlockModal: document.getElementById('unlockModal')!,
    unlockPinInput: document.getElementById('unlockPinInput') as HTMLInputElement | null,
    unlockError: document.getElementById('unlockError')!,
    unlockConfirmBtn: document.getElementById('unlockConfirmBtn') as HTMLButtonElement | null,
    unlockPrimaryView: document.getElementById('unlockPrimaryView')!,
    unlockForgotPinLink: document.getElementById('unlockForgotPinLink')!,
    unlockResetView: document.getElementById('unlockResetView')!,
    unlockResetInput: document.getElementById('unlockResetInput') as HTMLInputElement | null,
    unlockResetMessage: document.getElementById('unlockResetMessage')!,
    unlockResetCancelBtn: document.getElementById('unlockResetCancelBtn')!,
    unlockResetConfirmBtn: document.getElementById('unlockResetConfirmBtn') as HTMLButtonElement | null,
    accountSelect: document.getElementById('accountSelect') as HTMLSelectElement | null,
    accountCurrentLabel: document.getElementById('accountCurrentLabel')!,
    accountHint: document.getElementById('accountHint')!,
    switchAccountBtn: document.getElementById('switchAccountBtn') as HTMLButtonElement | null,
    newAccountBtn: document.getElementById('newAccountBtn') as HTMLButtonElement | null,
    currentAccountDisplay: document.getElementById('currentAccountDisplay')!,
    lastUpdatedDisplay: document.getElementById('lastUpdatedDisplay'),
    hwIcon: document.getElementById('hwIcon')!,
    addressDisplay: document.getElementById('addressDisplay')!,
    copyAddressBtn: document.getElementById('copyAddressBtn')!,
    xnaBalance: document.getElementById('xnaBalance')!,
    pendingBalance: document.getElementById('pendingBalance')!,
    balanceTabGeneral: document.getElementById('balanceTabGeneral')!,
    balanceTabAssets: document.getElementById('balanceTabAssets')!,
    balancePanelGeneral: document.getElementById('balancePanelGeneral')!,
    balancePanelAssets: document.getElementById('balancePanelAssets')!,
    assetsList: document.getElementById('assetsList')!,
    assetsEmpty: document.getElementById('assetsEmpty')!,
    refreshBtn: document.getElementById('refreshBtn')!,
    changeWalletBtn: document.getElementById('changeWalletBtn')!,
    toggleHistoryBtn: document.getElementById('toggleHistoryBtn')!,
    toggleHistoryBtnText: document.getElementById('toggleHistoryBtnText'),
    historyCard: document.getElementById('historyCard'),
    historyList: document.getElementById('historyList')!,
    historyEmpty: document.getElementById('historyEmpty')!,
    lockNowBtn: document.getElementById('lockNowBtn')!,
    removeWalletBtn: document.getElementById('removeWalletBtn')!,
    toast: document.getElementById('toast')!,
    toastMessage: document.getElementById('toastMessage')!,
    loadingOverlay: document.getElementById('loadingOverlay')!,
    backupModal: document.getElementById('backupModal')!,
    closeBackupBtn: document.getElementById('closeBackupBtn')!,
    backupAuthSection: document.getElementById('backupAuthSection')!,
    backupPinInput: document.getElementById('backupPinInput') as HTMLInputElement | null,
    backupError: document.getElementById('backupError')!,
    backupUnlockBtn: document.getElementById('backupUnlockBtn')!,
    backupDataSection: document.getElementById('backupDataSection')!,
    backupMnemonicGroup: document.getElementById('backupMnemonicGroup')!,
    backupMnemonicWords: document.getElementById('backupMnemonicWords')!,
    backupCopyMnemonicBtn: document.getElementById('backupCopyMnemonicBtn')!,
    backupPassphraseGroup: document.getElementById('backupPassphraseGroup')!,
    backupPassphraseText: document.getElementById('backupPassphraseText')!,
    backupWifText: document.getElementById('backupWifText') as HTMLInputElement | null,
    toggleBackupWifBtn: document.getElementById('toggleBackupWifBtn'),
    backupCopyWifBtn: document.getElementById('backupCopyWifBtn')!
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
      (iconClock as HTMLElement).style.display = '';
      (iconBalance as HTMLElement).style.display = 'none';
    } else {
      // Show History
      balanceCardMain.classList.add('hidden');
      addressCard.classList.add('hidden');
      elements.historyCard.classList.remove('hidden');
      elements.toggleHistoryBtnText.textContent = 'Balance';
      (iconClock as HTMLElement).style.display = 'none';
      (iconBalance as HTMLElement).style.display = '';
      renderHistory();
    }
  }

  function renderHistory() {
    elements.historyList.innerHTML = '';
    const activeAccount = state.accounts[state.activeAccountId];
    const history = (activeAccount as Record<string, unknown> | null)?.history as unknown[] || [];

    if (history.length === 0) {
      elements.historyEmpty.classList.remove('hidden');
      elements.historyList.appendChild(elements.historyEmpty as Node);
      return;
    }

    elements.historyEmpty.classList.add('hidden');
    (history as Record<string, unknown>[]).forEach(item => {
      const el = document.createElement('div');
      el.className = 'history-item';

      const isRawTx = item.type === 'raw_tx';

      // Header: origin + date
      const header = document.createElement('div');
      header.className = 'history-item-header';
      const dateStr = new Date(item.timestamp as number).toLocaleString();
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
        const signedHex = (item.signedTxHex || item.txHex || '') as string;

        // Explorer link (populated async once the txid is computed).
        const explorerLink = document.createElement('a');
        explorerLink.className = 'history-item-explorer-link hidden';
        explorerLink.target = '_blank';
        explorerLink.rel = 'noopener noreferrer';
        explorerLink.textContent = 'View on explorer ↗';
        el.appendChild(explorerLink);

        const txNetwork = (activeAccount as Record<string, unknown> | undefined)?.network as string | undefined;
        if (signedHex) {
          computeTxid(signedHex).then((txid) => {
            if (!txid) return;
            const url = resolveExplorerTxUrl(txNetwork, txid, state.settings as WalletSettings | null);
            if (!url) return;
            explorerLink.href = url;
            explorerLink.title = `tx ${txid}`;
            explorerLink.classList.remove('hidden');
          }).catch(() => { /* swallow: explorer link is best-effort */ });
        }

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
        txHex.textContent = signedHex;

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
        msg.title = item.message as string;
        msg.textContent = item.message as string;

        const sig = document.createElement('div');
        sig.className = 'history-item-sig';
        sig.textContent = item.signature as string;

        el.appendChild(msg);
        el.appendChild(sig);
      }

      elements.historyList.appendChild(el);
    });
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let state = {
    privateKey: null as string | null,
    mnemonic: null as string | null,
    passphrase: null as string | null,
    address: null as string | null,
    publicKey: null as string | null,
    walletType: 'software' as string,
    network: 'xna',
    balance: null as string | null,
    pendingBalance: null as string | null,
    lastPortfolioUpdatedAt: 0,
    assets: [] as unknown[],
    pollingInterval: null as ReturnType<typeof setInterval> | null,
    isConnected: false,
    settings: null as Record<string, unknown> | null,
    accounts: {} as Record<string, Record<string, unknown> | null>,
    activeAccountId: '1',
    unlockUntil: 0,
    sessionPin: '',
    lockWatchInterval: null as ReturnType<typeof setInterval> | null,
    lastUnlockTouchAt: 0
  };

  // ── Initialization ────────────────────────────────────────────────────────

  async function init() {
    await loadSettings();
    await loadWalletData();
    await loadUnlockState();
    await loadSessionPinState();
    NEURAI_UTILS.applyTheme(state.settings as Partial<WalletSettings>);
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

    elements.openBackupBtn!.addEventListener('click', openBackupModal);
    elements.closeBackupBtn.addEventListener('click', closeBackupModal);
    elements.backupUnlockBtn.addEventListener('click', handleBackupUnlock);
    elements.backupCopyMnemonicBtn.addEventListener('click', () => {
      navigator.clipboard.writeText((state.accounts[state.activeAccountId] as Record<string, unknown>)?.__decryptedMnemonic as string || '');
      showToast('Recovery phrase copied!', 'success');
    });
    elements.backupCopyWifBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(elements.backupWifText!.value);
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
    elements.switchAccountBtn!.addEventListener('click', handleSwitchAccount);
    elements.newAccountBtn!.addEventListener('click', handleCreateNewAccount);
    elements.cancelRemoveBtn.addEventListener('click', closeRemoveConfirmModal);
    elements.confirmRemoveBtn.addEventListener('click', handleConfirmRemoveAccount);
    elements.unlockForgotPinLink.addEventListener('click', openUnlockResetView);
    elements.unlockForgotPinLink.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
        e.preventDefault();
        openUnlockResetView();
      }
    });
    elements.unlockConfirmBtn!.addEventListener('click', handleUnlock);
    elements.unlockResetInput!.addEventListener('input', () => {
      elements.unlockResetMessage.textContent = '';
    });
    elements.unlockResetInput!.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        handleResetAddonDataAndClose();
      }
    });
    elements.unlockResetCancelBtn.addEventListener('click', showUnlockMainView);
    elements.unlockResetConfirmBtn!.addEventListener('click', handleResetAddonDataAndClose);
    elements.backupPinInput!.addEventListener('keypress', (e) => { if ((e as KeyboardEvent).key === 'Enter') handleBackupUnlock(); });

    if ((elements as Record<string, HTMLElement | null>).network) (elements as Record<string, HTMLElement | null>).network!.addEventListener('change', applyReaderRpcForCurrentContext);

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
      { btn: elements.toggleBackupWifBtn, input: elements.backupWifText as HTMLInputElement | null }
    ];

    toggleBtns.forEach(({ btn, input }) => {
      if (btn && input) {
        btn.addEventListener('click', () => {
          if ((input as HTMLInputElement).type === 'password') {
            (input as HTMLInputElement).type = 'text';
            if (input.tagName === 'TEXTAREA') input.classList.add('visible');
          } else {
            (input as HTMLInputElement).type = 'password';
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
    await chrome.storage.local.set({ [C.UNLOCK_UNTIL_KEY]: 0 });
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
    await chrome.storage.local.set({ [C.UNLOCK_UNTIL_KEY]: 0 });
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
      showToast('Error fetching balance: ' + (error as Error).message, 'error');
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
    if ((elements as Record<string, HTMLElement | null>).setupSection) (elements as Record<string, HTMLElement | null>).setupSection!.classList.add('hidden');
    elements.walletSection.classList.remove('hidden');
    elements.addressDisplay.textContent = state.address;
    elements.addressDisplay.title = state.address || '';
    elements.openBackupBtn!.disabled = state.walletType === 'hardware';
    elements.openBackupBtn!.title = state.walletType === 'hardware'
      ? 'Hardware wallet secrets stay on the device'
      : 'Back up wallet secrets';
    updateAccountLabels();

    const isTestnet = NEURAI_UTILS.isTestnetNetwork(state.network);
    const networkLabels: Record<string, string> = {
      'xna': 'Mainnet', 'xna-test': 'Testnet',
      'xna-legacy': 'Mainnet Legacy', 'xna-legacy-test': 'Testnet Legacy',
      'xna-pq': 'Mainnet PQ', 'xna-pq-test': 'Testnet PQ'
    };
    elements.networkBadge.querySelector('span:last-child')!.textContent = networkLabels[state.network] || state.network;

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

  function showToast(message: string, type = 'success') {
    elements.toastMessage.textContent = message;
    elements.toast.className = 'toast ' + type;
    setTimeout(() => elements.toast.classList.add('hidden'), 3000);
  }

  function showLoading(show: boolean) {
    elements.loadingOverlay.classList.toggle('hidden', !show);
  }

  function setConnectionStatus(_connected?: boolean) {
    elements.hwIcon.title = 'Hardware wallet';
  }

  function setLoadingStatus(loading: boolean) {
    elements.refreshBtn.classList.toggle('loading', loading);
  }

  function formatAmountParts(value: unknown, fallback = '0') {
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

  function renderAmount(element: HTMLElement, value: unknown, fallback = '0') {
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

  function formatAssetAmount(amount: unknown, decimals: number) {
    const fixed = Number(amount || 0).toFixed(decimals);
    const trimmed = fixed.replace(/\.?0+$/, '');
    return trimmed || '0';
  }

  function normalizeAssetsFromRpc(assetBalance: unknown) {
    let rows: Record<string, unknown>[] = [];
    if (Array.isArray(assetBalance)) {
      rows = assetBalance as Record<string, unknown>[];
    } else if (assetBalance && Array.isArray((assetBalance as Record<string, unknown>).assets)) {
      rows = (assetBalance as Record<string, unknown[]>).assets as Record<string, unknown>[];
    } else if (assetBalance && typeof assetBalance === 'object') {
      // Compatibility with endpoints returning { ASSET: balance, ... }.
      rows = Object.keys(assetBalance as object).map((assetName) => ({
        assetName,
        balance: (assetBalance as Record<string, unknown>)[assetName]
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
      .sort((a, b) => a!.name.localeCompare(b!.name, undefined, { sensitivity: 'base' }));
  }

  function renderAssetsList() {
    if (!state.assets.length) {
      elements.assetsList.innerHTML = '';
      elements.assetsEmpty.classList.remove('hidden');
      return;
    }
    elements.assetsEmpty.classList.add('hidden');
    elements.assetsList.innerHTML = (state.assets as { name: string; amountText: string }[]).map((asset) =>
      `<div class="asset-item"><span class="asset-name" title="${escapeHtml(asset.name)}">${escapeHtml(asset.name)}</span><span class="asset-balance">${escapeHtml(asset.amountText)}</span></div>`
    ).join('');
  }

  function switchBalanceTab(tab: string) {
    const showAssets = tab === 'assets';
    elements.balanceTabGeneral.classList.toggle('is-active', !showAssets);
    elements.balanceTabGeneral.setAttribute('aria-selected', showAssets ? 'false' : 'true');
    elements.balanceTabAssets.classList.toggle('is-active', showAssets);
    elements.balanceTabAssets.setAttribute('aria-selected', showAssets ? 'true' : 'false');
    elements.balancePanelGeneral.classList.toggle('hidden', showAssets);
    elements.balancePanelAssets.classList.toggle('hidden', !showAssets);
  }

  function escapeHtml(value: unknown) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getRawTxHistoryLabel(item: Record<string, unknown>) {
    const sighash = String(item?.sighashType || 'ALL').trim().toUpperCase();
    if (sighash === 'SINGLE|ANYONECANPAY') return 'Offer';
    if (isSwapUtxoConsolidation(item)) return 'UTXO Consolidation';
    if (isSwapHistoryOrigin(item?.origin as string)) return 'Purchase';
    return 'Transaction';
  }

  function isSwapUtxoConsolidation(item: Record<string, unknown>) {
    return isSwapHistoryOrigin(item?.origin as string) && Number(item?.inputCount || 0) > 1;
  }

  function isSwapHistoryOrigin(origin: string) {
    return /swap\.neurai\.org/i.test(String(origin || ''));
  }

  // ── Storage ───────────────────────────────────────────────────────────────

  async function loadWalletData() {
    const result = await chrome.storage.local.get([C.STORAGE_KEY, C.ACCOUNTS_KEY, C.ACTIVE_ACCOUNT_KEY]);
    const legacyWallet = result[C.STORAGE_KEY] || null;
    state.accounts = normalizeAccounts(result[C.ACCOUNTS_KEY]);
    state.activeAccountId = normalizeAccountId(result[C.ACTIVE_ACCOUNT_KEY], '1');

    const hasAny = getConfiguredAccountIds(state.accounts).length > 0;
    const legacyWalletData = legacyWallet as Record<string, unknown> | null;
    if (!hasAny && legacyWalletData && (
      legacyWalletData.privateKey ||
      legacyWalletData.privateKeyEnc ||
      legacyWalletData.seedKey ||
      legacyWalletData.seedKeyEnc ||
      legacyWalletData.mnemonic ||
      legacyWalletData.mnemonicEnc
    )) {
      state.accounts['1'] = {
        privateKey: legacyWalletData.privateKey || null,
        privateKeyEnc: legacyWalletData.privateKeyEnc || null,
        seedKey: legacyWalletData.seedKey || null,
        seedKeyEnc: legacyWalletData.seedKeyEnc || null,
        mnemonic: legacyWalletData.mnemonic || null,
        mnemonicEnc: legacyWalletData.mnemonicEnc || null,
        passphrase: legacyWalletData.passphrase || null,
        passphraseEnc: legacyWalletData.passphraseEnc || null,
        address: legacyWalletData.address || null,
        publicKey: legacyWalletData.publicKey || null,
        network: legacyWalletData.network || 'xna'
      };
      state.activeAccountId = '1';
      await saveAccountsData();
    }

    const activeWallet = getActiveWalletData();
    if (activeWallet) {
      state.address = activeWallet.address as string || null;
      state.publicKey = activeWallet.publicKey as string || null;
      state.walletType = activeWallet.walletType as string || 'software';
      state.network = activeWallet.network as string || 'xna';
      state.privateKey = (!state.settings?.pinHash && activeWallet.privateKey) ? activeWallet.privateKey as string : null;
      state.mnemonic = (!state.settings?.pinHash && activeWallet.mnemonic) ? activeWallet.mnemonic as string : null;
      state.passphrase = (!state.settings?.pinHash && activeWallet.passphrase) ? activeWallet.passphrase as string : null;
    } else {
      clearActiveWalletData();
    }
    updateAccountLabels();
  }

  async function saveAccountsData(pinOverride = '') {
    if (state.settings?.pinHash) {
      await ensureAccountsEncryptedWithPin(pinOverride || state.sessionPin || '');
    }
    const storedAccounts = buildAccountsForStorage();
    const activeWallet = storedAccounts[state.activeAccountId] || null;
    await chrome.storage.local.set({
      [C.ACCOUNTS_KEY]: storedAccounts,
      [C.ACTIVE_ACCOUNT_KEY]: state.activeAccountId,
      [C.STORAGE_KEY]: activeWallet
    });
  }

  async function loadSettings() {
    const result = await chrome.storage.local.get(C.SETTINGS_KEY);
    state.settings = {
      ...C.DEFAULT_SETTINGS,
      ...(result[C.SETTINGS_KEY] || {})
    };
    state.settings.lockTimeoutMinutes =
      NEURAI_UTILS.normalizeLockTimeoutMinutes(state.settings.lockTimeoutMinutes as number);
  }

  async function loadUnlockState() {
    const result = await chrome.storage.local.get(C.UNLOCK_UNTIL_KEY);
    state.unlockUntil = Number(result[C.UNLOCK_UNTIL_KEY] || 0);
  }

  async function loadSessionPinState() {
    if (!chrome.storage?.session) return;
    const result = await chrome.storage.session.get(C.SESSION_PIN_KEY);
    state.sessionPin = state.unlockUntil > Date.now()
      ? String(result[C.SESSION_PIN_KEY] || '')
      : '';
  }

  async function persistSessionPin(pin: string) {
    state.sessionPin = pin || '';
    if (chrome.storage?.session) {
      await new Promise<void>((resolve) => {
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
    await chrome.storage.local.set({ [C.SETTINGS_KEY]: state.settings });
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
        privateKey: (!state.settings?.pinHash && entry!.privateKey) ? entry!.privateKey : null,
        privateKeyEnc: entry!.privateKeyEnc || null,
        seedKey: (!state.settings?.pinHash && entry!.seedKey) ? entry!.seedKey : null,
        seedKeyEnc: entry!.seedKeyEnc || null,
        mnemonic: (!state.settings?.pinHash && entry!.mnemonic) ? entry!.mnemonic : null,
        mnemonicEnc: entry!.mnemonicEnc || null,
        passphrase: (!state.settings?.pinHash && entry!.passphrase) ? entry!.passphrase : null,
        passphraseEnc: entry!.passphraseEnc || null,
        address: entry!.address || null,
        publicKey: entry!.publicKey || null,
        walletType: entry!.walletType || 'software',
        hardwareDeviceName: entry!.hardwareDeviceName || null,
        hardwareDeviceNetwork: entry!.hardwareDeviceNetwork || null,
        hardwareFirmwareVersion: entry!.hardwareFirmwareVersion || null,
        hardwareDerivationPath: entry!.hardwareDerivationPath || null,
        hardwareMasterFingerprint: entry!.hardwareMasterFingerprint || null,
        network: entry!.network || 'xna',
        history: Array.isArray(entry!.history) ? entry!.history : []
      };
    }
    return stored;
  }

  async function ensureAccountsEncryptedWithPin(pin: string) {
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) {
      const id = String(i);
      const entry = state.accounts[id];
      if (!isConfiguredAccount(entry)) continue;

      let plain = entry!.privateKey as string || null;
      if (plain) {
        if (!pin) throw new Error('PIN is required to encrypt wallet keys');
        entry!.privateKeyEnc = await NEURAI_UTILS.encryptTextWithPin(plain, pin);
        if (id !== state.activeAccountId) entry!.privateKey = null;
      }

      let plainSeedKey = entry!.seedKey as string || null;
      if (plainSeedKey) {
        if (!pin) throw new Error('PIN is required to encrypt wallet keys');
        entry!.seedKeyEnc = await NEURAI_UTILS.encryptTextWithPin(plainSeedKey, pin);
        if (id !== state.activeAccountId) entry!.seedKey = null;
      }

      let plainMnemonic = entry!.mnemonic as string || null;
      if (plainMnemonic) {
        if (!pin) throw new Error('PIN is required to encrypt wallet keys');
        entry!.mnemonicEnc = await NEURAI_UTILS.encryptTextWithPin(plainMnemonic, pin);
        if (id !== state.activeAccountId) entry!.mnemonic = null;
      }

      let plainPassphrase = entry!.passphrase as string || null;
      if (plainPassphrase) {
        if (!pin) throw new Error('PIN is required to encrypt wallet keys');
        entry!.passphraseEnc = await NEURAI_UTILS.encryptTextWithPin(plainPassphrase, pin);
        if (id !== state.activeAccountId) entry!.passphrase = null;
      }
    }
  }

  async function unlockActiveWalletPrivateKey(pin: string) {
    const active = getActiveWalletData();
    if (!active) return;

    if (!active.privateKey && active.privateKeyEnc) {
      active.privateKey = await NEURAI_UTILS.decryptTextWithPin(active.privateKeyEnc as EncryptedSecret, pin);
    }
    state.privateKey = active.privateKey as string || null;

    if (!active.seedKey && active.seedKeyEnc) {
      active.seedKey = await NEURAI_UTILS.decryptTextWithPin(active.seedKeyEnc as EncryptedSecret, pin);
    }

    if (!active.mnemonic && active.mnemonicEnc) {
      active.mnemonic = await NEURAI_UTILS.decryptTextWithPin(active.mnemonicEnc as EncryptedSecret, pin);
    }
    state.mnemonic = active.mnemonic as string || null;

    if (!active.passphrase && active.passphraseEnc) {
      active.passphrase = await NEURAI_UTILS.decryptTextWithPin(active.passphraseEnc as EncryptedSecret, pin);
    }
    state.passphrase = active.passphrase as string || null;
  }

  async function decryptAllWalletKeysWithPin(pin: string) {
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) {
      const id = String(i);
      const entry = state.accounts[id];
      if (!hasAccountSecret(entry)) continue;
      if (!entry!.privateKey && entry!.privateKeyEnc) {
        const plain = await NEURAI_UTILS.decryptTextWithPin(entry!.privateKeyEnc as EncryptedSecret, pin);
        entry!.privateKey = plain;
        entry!.privateKeyEnc = null;
        if (id === state.activeAccountId) state.privateKey = plain as string;
      }
      if (!entry!.seedKey && entry!.seedKeyEnc) {
        const plain = await NEURAI_UTILS.decryptTextWithPin(entry!.seedKeyEnc as EncryptedSecret, pin);
        entry!.seedKey = plain;
        entry!.seedKeyEnc = null;
      }
      if (!entry!.mnemonic && entry!.mnemonicEnc) {
        const plain = await NEURAI_UTILS.decryptTextWithPin(entry!.mnemonicEnc as EncryptedSecret, pin);
        entry!.mnemonic = plain;
        entry!.mnemonicEnc = null;
        if (id === state.activeAccountId) state.mnemonic = plain as string;
      }
      if (!entry!.passphrase && entry!.passphraseEnc) {
        const plain = await NEURAI_UTILS.decryptTextWithPin(entry!.passphraseEnc as EncryptedSecret, pin);
        entry!.passphrase = plain;
        entry!.passphraseEnc = null;
        if (id === state.activeAccountId) state.passphrase = plain as string;
      }
    }
  }

  async function reencryptAllWalletKeys(oldPin: string | null, newPin: string) {
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) {
      const id = String(i);
      const entry = state.accounts[id];
      if (!hasAccountSecret(entry)) continue;

      let plain = entry!.privateKey as string || null;
      if (!plain && entry!.privateKeyEnc && oldPin) {
        plain = await NEURAI_UTILS.decryptTextWithPin(entry!.privateKeyEnc as EncryptedSecret, oldPin);
      }
      if (plain) {
        entry!.privateKeyEnc = await NEURAI_UTILS.encryptTextWithPin(plain, newPin);
        if (id !== state.activeAccountId) entry!.privateKey = null;
        if (id === state.activeAccountId) state.privateKey = plain;
      }

      let sPlain = entry!.seedKey as string || null;
      if (!sPlain && entry!.seedKeyEnc && oldPin) {
        sPlain = await NEURAI_UTILS.decryptTextWithPin(entry!.seedKeyEnc as EncryptedSecret, oldPin);
      }
      if (sPlain) {
        entry!.seedKeyEnc = await NEURAI_UTILS.encryptTextWithPin(sPlain, newPin);
        if (id !== state.activeAccountId) entry!.seedKey = null;
      }

      let mPlain = entry!.mnemonic as string || null;
      if (!mPlain && entry!.mnemonicEnc && oldPin) {
        mPlain = await NEURAI_UTILS.decryptTextWithPin(entry!.mnemonicEnc as EncryptedSecret, oldPin);
      }
      if (mPlain) {
        entry!.mnemonicEnc = await NEURAI_UTILS.encryptTextWithPin(mPlain, newPin);
        if (id !== state.activeAccountId) entry!.mnemonic = null;
        if (id === state.activeAccountId) state.mnemonic = mPlain;
      }

      let pPlain = entry!.passphrase as string || null;
      if (!pPlain && entry!.passphraseEnc && oldPin) {
        pPlain = await NEURAI_UTILS.decryptTextWithPin(entry!.passphraseEnc as EncryptedSecret, oldPin);
      }
      if (pPlain) {
        entry!.passphraseEnc = await NEURAI_UTILS.encryptTextWithPin(pPlain, newPin);
        if (id !== state.activeAccountId) entry!.passphrase = null;
        if (id === state.activeAccountId) state.passphrase = pPlain;
      }
    }
  }

  // ── Account helpers ───────────────────────────────────────────────────────

  function createDefaultAccounts(): Record<string, Record<string, unknown> | null> {
    const accounts: Record<string, Record<string, unknown> | null> = {};
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) accounts[String(i)] = null;
    return accounts;
  }

  function normalizeAccountId(value: unknown, fallback: string) {
    const id = String(value || '');
    return /^(10|[1-9])$/.test(id) ? id : fallback;
  }

  function normalizeAccounts(rawAccounts: unknown) {
    const normalized = createDefaultAccounts();
    if (!rawAccounts || typeof rawAccounts !== 'object') return normalized;
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) {
      const id = String(i);
      const entry = (rawAccounts as Record<string, unknown>)[id];
      if (entry && typeof entry === 'object' && isStoredAccountConfigured(entry as Record<string, unknown>)) {
        const e = entry as Record<string, unknown>;
        normalized[id] = {
          privateKey: e.privateKey || null,
          privateKeyEnc: NEURAI_UTILS.isEncryptedSecret(e.privateKeyEnc) ? e.privateKeyEnc : null,
          seedKey: e.seedKey || null,
          seedKeyEnc: NEURAI_UTILS.isEncryptedSecret(e.seedKeyEnc) ? e.seedKeyEnc : null,
          mnemonic: e.mnemonic || null,
          mnemonicEnc: NEURAI_UTILS.isEncryptedSecret(e.mnemonicEnc) ? e.mnemonicEnc : null,
          passphrase: e.passphrase || null,
          passphraseEnc: NEURAI_UTILS.isEncryptedSecret(e.passphraseEnc) ? e.passphraseEnc : null,
          address: e.address || null,
          publicKey: e.publicKey || null,
          walletType: e.walletType || 'software',
          hardwareDeviceName: e.hardwareDeviceName || null,
          hardwareDeviceNetwork: e.hardwareDeviceNetwork || null,
          hardwareFirmwareVersion: e.hardwareFirmwareVersion || null,
          hardwareDerivationPath: e.hardwareDerivationPath || null,
          hardwareMasterFingerprint: e.hardwareMasterFingerprint || null,
          network: e.network || 'xna',
          history: Array.isArray(e.history) ? e.history : []
        };
      }
    }
    return normalized;
  }

  function getAccountLabel(accountId: string) { return 'Neurai_' + accountId; }
  function getActiveWalletData() { return state.accounts[state.activeAccountId] || null; }
  function hasAccountSecret(entry: Record<string, unknown> | null) {
    return !!(entry && (
      entry.privateKey ||
      entry.privateKeyEnc ||
      entry.seedKey ||
      entry.seedKeyEnc ||
      entry.mnemonic ||
      entry.mnemonicEnc ||
      entry.passphrase ||
      entry.passphraseEnc
    ));
  }
  function isConfiguredAccount(entry: Record<string, unknown> | null) {
    return !!(entry && (
      entry.privateKey ||
      entry.privateKeyEnc ||
      entry.seedKey ||
      entry.seedKeyEnc ||
      entry.mnemonic ||
      entry.mnemonicEnc ||
      (entry.walletType === 'hardware' && entry.address && entry.publicKey)
    ));
  }
  function isStoredAccountConfigured(entry: Record<string, unknown>) {
    return !!(entry && (
      entry.privateKey ||
      NEURAI_UTILS.isEncryptedSecret(entry.privateKeyEnc) ||
      entry.seedKey ||
      NEURAI_UTILS.isEncryptedSecret(entry.seedKeyEnc) ||
      entry.mnemonic ||
      NEURAI_UTILS.isEncryptedSecret(entry.mnemonicEnc) ||
      (entry.walletType === 'hardware' && entry.address && entry.publicKey)
    ));
  }
  function hasActiveWallet() { return isConfiguredAccount(getActiveWalletData()); }

  function getConfiguredAccountIds(accountsData = state.accounts) {
    return Object.keys(accountsData).filter((id) => isConfiguredAccount(accountsData[id]));
  }

  function setActiveWalletData(walletData: Record<string, unknown>) {
    const previous: Record<string, unknown> = state.accounts[state.activeAccountId] || {};
    state.privateKey = walletData.privateKey as string || null;
    state.mnemonic = walletData.mnemonic as string || null;
    state.passphrase = walletData.passphrase as string || null;
    state.address = walletData.address as string || null;
    state.publicKey = walletData.publicKey as string || null;
    state.walletType = walletData.walletType as string || 'software';
    state.network = walletData.network as string || 'xna';
    state.accounts[state.activeAccountId] = {
      privateKey: state.privateKey,
      privateKeyEnc: walletData.privateKeyEnc as string || previous.privateKeyEnc || null,
      mnemonic: state.mnemonic,
      mnemonicEnc: walletData.mnemonicEnc as string || previous.mnemonicEnc || null,
      passphrase: state.passphrase,
      passphraseEnc: walletData.passphraseEnc as string || previous.passphraseEnc || null,
      address: state.address,
      publicKey: state.publicKey,
      walletType: state.walletType,
      hardwareDeviceName: walletData.hardwareDeviceName as string || previous.hardwareDeviceName || null,
      hardwareDeviceNetwork: walletData.hardwareDeviceNetwork as string || previous.hardwareDeviceNetwork || null,
      hardwareFirmwareVersion: walletData.hardwareFirmwareVersion as string || previous.hardwareFirmwareVersion || null,
      hardwareDerivationPath: walletData.hardwareDerivationPath as string || previous.hardwareDerivationPath || null,
      hardwareMasterFingerprint: walletData.hardwareMasterFingerprint as string || previous.hardwareMasterFingerprint || null,
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
    if ((elements as Record<string, HTMLElement | null>).setupAccountLabel) (elements as Record<string, HTMLElement | null>).setupAccountLabel!.textContent = 'Account: ' + label;
    elements.currentAccountDisplay.textContent = label;
  }

  function renderLastUpdated() {
    if (!elements.lastUpdatedDisplay) return;
    elements.lastUpdatedDisplay.textContent = state.lastPortfolioUpdatedAt
      ? formatLastUpdated(state.lastPortfolioUpdatedAt)
      : 'Never updated';
  }

  function formatLastUpdated(timestamp: number) {
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
      elements.accountSelect!.innerHTML = '<option value="">No configured account</option>';
      elements.accountSelect!.disabled = true;
      elements.switchAccountBtn!.disabled = true;
    } else {
      elements.accountSelect!.innerHTML = configuredIds.map((id) =>
        `<option value="${id}">${getAccountLabel(id)}</option>`).join('');
      elements.accountSelect!.disabled = false;
      elements.switchAccountBtn!.disabled = false;
      elements.accountSelect!.value = configuredIds.includes(state.activeAccountId)
        ? state.activeAccountId : configuredIds[0];
    }

    const nextAccount = findNextEmptyAccountId();
    if (nextAccount) {
      elements.newAccountBtn!.disabled = false;
      elements.accountHint.textContent = 'You can create ' + getAccountLabel(nextAccount) + '.';
    } else {
      elements.newAccountBtn!.disabled = true;
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
    const targetId = normalizeAccountId(elements.accountSelect!.value, state.activeAccountId);
    const targetWallet = state.accounts[targetId];
    if (!isConfiguredAccount(targetWallet)) {
      showToast('Selected account is not configured', 'error');
      return;
    }
    state.activeAccountId = targetId;
    setActiveWalletData(targetWallet!);
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
    elements.themeMode!.value = s.theme as string || C.DEFAULT_SETTINGS.theme;
    elements.rpcMainnet!.value = s.rpcMainnet as string || '';
    elements.rpcTestnet!.value = s.rpcTestnet as string || '';
    if (elements.explorerMainnet) elements.explorerMainnet.value = s.explorerMainnet as string || '';
    if (elements.explorerTestnet) elements.explorerTestnet.value = s.explorerTestnet as string || '';
    elements.lockTimeoutMinutes!.value = String(NEURAI_UTILS.normalizeLockTimeoutMinutes(s.lockTimeoutMinutes as number));
    syncPinSettingsUI();
  }

  function syncPinSettingsUI() {
    const hasPin = !!state.settings?.pinHash;
    elements.pinStatusText.textContent = hasPin ? 'Active' : 'Not configured';
    elements.pinStatusText.classList.toggle('active', hasPin);
    elements.settingsPinOld!.value = '';
    elements.settingsPinNew!.value = '';
    elements.settingsPinConfirm!.value = '';
  }

  async function handleSaveSettings() {
    try {
      const currentPin = (elements.settingsPinOld!.value || '').trim();
      const newPin = (elements.settingsPinNew!.value || '').trim();
      const confirmPin = (elements.settingsPinConfirm!.value || '').trim();
      const hasExistingPin = !!state.settings?.pinHash;

      let pinHash = state.settings?.pinHash as string || '';

      if (newPin) {
        if (newPin.length < 4 || newPin.length > 20) throw new Error('PIN must be 4 to 20 characters');
        if (newPin !== confirmPin) throw new Error('PIN confirmation does not match');
        if (hasExistingPin) {
          if (!currentPin) throw new Error('Current PIN is required to change PIN');
          const currentHash = await NEURAI_UTILS.hashText(currentPin);
          if (currentHash !== state.settings!.pinHash) throw new Error('Current PIN is invalid');
        }
        await reencryptAllWalletKeys(hasExistingPin ? currentPin : null, newPin);
        await persistSessionPin(newPin);
        pinHash = await NEURAI_UTILS.hashText(newPin);
      }

      state.settings = {
        theme: elements.themeMode!.value || C.DEFAULT_SETTINGS.theme,
        rpcMainnet: normalizeOptionalUrl(elements.rpcMainnet!.value),
        rpcTestnet: normalizeOptionalUrl(elements.rpcTestnet!.value),
        explorerMainnet: normalizeOptionalExplorerUrl(elements.explorerMainnet?.value || ''),
        explorerTestnet: normalizeOptionalExplorerUrl(elements.explorerTestnet?.value || ''),
        pinHash,
        lockTimeoutMinutes: NEURAI_UTILS.normalizeLockTimeoutMinutes(elements.lockTimeoutMinutes!.value as unknown as number)
      };
      await ensureRpcPermissions(state.settings);

      if (newPin) await unlockForConfiguredTimeout();

      await saveAccountsData();
      await saveSettings();
      syncPinSettingsUI();
      NEURAI_UTILS.applyTheme(state.settings as Partial<WalletSettings>);
      applyReaderRpcForCurrentContext();
      await notifySettingsUpdated();
      closeSettingsModal();
      showToast(newPin ? 'Settings saved — PIN updated' : 'Settings saved', 'success');
      if (state.privateKey) {
        if (isAddonLocked()) { openUnlockModal(); return; }
        updateBalance();
      }
    } catch (error) {
      showToast('Invalid settings: ' + (error as Error).message, 'error');
    }
  }


  async function handleResetSettings() {
    state.settings = { ...C.DEFAULT_SETTINGS, pinHash: state.settings?.pinHash as string || '' };
    syncSettingsForm();
    await saveSettings();
    NEURAI_UTILS.applyTheme(state.settings as Partial<WalletSettings>);
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
    elements.unlockPinInput!.value = '';
    elements.unlockResetInput!.value = '';
    elements.unlockResetMessage.textContent = '';
    showUnlockMainView();
    elements.unlockModal.classList.remove('hidden');
    elements.unlockPinInput!.focus();
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
    elements.unlockPinInput!.value = '';
    elements.unlockResetInput!.value = '';
    elements.unlockResetMessage.textContent = '';
  }

  function openUnlockResetView() {
    elements.unlockPrimaryView.classList.add('hidden');
    elements.unlockResetView.classList.remove('hidden');
    elements.unlockResetInput!.value = '';
    elements.unlockResetMessage.textContent = '';
    elements.unlockResetInput!.focus();
  }

  async function handleResetAddonDataAndClose() {
    if ((elements.unlockResetInput!.value || '').trim() !== 'RESET') {
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
      elements.unlockResetMessage.textContent = (error as Error).message || 'Unable to reset addon data.';
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
    const minutes = NEURAI_UTILS.normalizeLockTimeoutMinutes(state.settings?.lockTimeoutMinutes as number);
    state.unlockUntil = Date.now() + minutes * 60 * 1000;
    await chrome.storage.local.set({ [C.UNLOCK_UNTIL_KEY]: state.unlockUntil });
  }

  async function handleUnlock() {
    const entered = (elements.unlockPinInput!.value || '').trim();
    if (!entered) { elements.unlockError.textContent = 'PIN is required.'; return; }
    const hash = await NEURAI_UTILS.hashText(entered);
    if (hash !== state.settings!.pinHash) { elements.unlockError.textContent = 'Invalid PIN.'; return; }
    try {
      await unlockActiveWalletPrivateKey(entered);
      await ensureAccountsEncryptedWithPin(entered);
      await persistSessionPin(entered);
      await saveAccountsData(entered);
    } catch (error) {
      elements.unlockError.textContent = 'Unable to unlock wallet keys: ' + (error as Error).message;
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
    elements.backupPinInput!.value = '';
    elements.backupError.textContent = '';
    elements.backupPinInput!.focus();
  }

  function closeBackupModal() {
    elements.backupModal.classList.add('hidden');
    elements.backupAuthSection.classList.remove('hidden');
    elements.backupDataSection.classList.add('hidden');
    elements.backupPinInput!.value = '';
    elements.backupError.textContent = '';
    elements.backupWifText!.value = '';
    elements.backupMnemonicWords.innerHTML = '';
    elements.backupWifText!.type = 'password';
  }

  async function handleBackupUnlock() {
    const entered = (elements.backupPinInput!.value || '').trim();
    if (!entered) { elements.backupError.textContent = 'PIN is required.'; return; }

    const hash = await NEURAI_UTILS.hashText(entered);
    if (hash !== state.settings!.pinHash) { elements.backupError.textContent = 'Invalid PIN.'; return; }

    elements.backupError.textContent = '';
    try {
      const active = getActiveWalletData();
      if (!active) throw new Error('No active wallet to backup');

      let wif = active.privateKey as string;
      if (!wif && active.privateKeyEnc) {
        wif = await NEURAI_UTILS.decryptTextWithPin(active.privateKeyEnc as EncryptedSecret, entered);
      }

      let mnemonicStr = active.mnemonic as string;
      if (!mnemonicStr && active.mnemonicEnc) {
        mnemonicStr = await NEURAI_UTILS.decryptTextWithPin(active.mnemonicEnc as EncryptedSecret, entered);
      }

      let passphraseStr = active.passphrase as string;
      if (!passphraseStr && active.passphraseEnc) {
        passphraseStr = await NEURAI_UTILS.decryptTextWithPin(active.passphraseEnc as EncryptedSecret, entered);
      }

      // Store temporarily on the account object just for the copy button if needed,
      // though better to just construct it.
      if (active) (active as Record<string, unknown>).__decryptedMnemonic = mnemonicStr;

      elements.backupWifText!.value = wif || '';

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
      elements.backupError.textContent = 'Decryption failed: ' + (error as Error).message;
    }
  }

  // ── RPC / settings helpers ────────────────────────────────────────────────

  function normalizeOptionalUrl(value: string) {
    const trimmed = (value || '').trim();
    if (!trimmed) return '';
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') return parsed.toString();
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (parsed.protocol === 'http:' && isLocalhost) return parsed.toString();
    throw new Error('RPC URL must use https:// (http:// only allowed for localhost/127.0.0.1)');
  }

  function normalizeOptionalExplorerUrl(value: string) {
    // Explorer URLs may contain a literal `{txid}` placeholder. `new URL()`
    // URL-encodes it, so we validate with a sentinel and preserve the raw template.
    const trimmed = (value || '').trim();
    if (!trimmed) return '';
    const probe = trimmed.includes('{txid}')
      ? trimmed.replace('{txid}', 'SENTINEL_TXID_0000')
      : trimmed;
    const parsed = new URL(probe);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('Explorer URL must use https:// or http://');
    }
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (parsed.protocol === 'http:' && !isLocalhost) {
      throw new Error('Explorer URL must use https:// (http:// only allowed for localhost/127.0.0.1)');
    }
    return trimmed;
  }

  function toOriginPattern(url: string) {
    if (!url) return null;
    const p = new URL(url);
    return `${p.protocol}//${p.host}/*`;
  }

  async function ensureRpcPermissions(settings: Record<string, unknown>) {
    if (!chrome.permissions) return;
    const origins = [settings.rpcMainnet as string, settings.rpcTestnet as string]
      .filter(Boolean).map(toOriginPattern)
      .filter((v, i, arr) => v && arr.indexOf(v) === i) as string[];
    if (!origins.length) return;
    const has = await new Promise<boolean>((r) => chrome.permissions.contains({ origins }, r));
    if (has) return;
    try {
      const granted = await new Promise<boolean>((r) => chrome.permissions.request({ origins }, r));
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
    await NEURAI_UTILS.syncHardwareNetwork(device, state.network);
    await device.getInfo();

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
    const activeHardwareNetwork = await NEURAI_UTILS.syncHardwareNetwork(device, state.network);
    const info = await device.getInfo();
    const addrResp = await device.getAddress();

    // Keep the device connected for future signing requests
    hwDevice = device;

    return {
      deviceName: info.device || 'NeuraiHW',
      deviceNetwork: activeHardwareNetwork || info.network || null,
      firmwareVersion: info.version || null,
      address: addrResp.address,
      publicKey: addrResp.pubkey,
      derivationPath: addrResp.path || null,
      masterFingerprint: info.master_fingerprint || null
    };
  }

  function getRpcUrlForNetwork(network: string) {
    const s = state.settings || C.DEFAULT_SETTINGS;
    return NEURAI_UTILS.isTestnetNetwork(network)
      ? (s.rpcTestnet as string || NeuraiReader.URL_TESTNET)
      : (s.rpcMainnet as string || NeuraiReader.URL_MAINNET);
  }

  function applyReaderRpcForCurrentContext() {
    const network = hasActiveWallet() ? state.network : (((elements as Record<string, HTMLElement | null>).network && (elements as unknown as Record<string, HTMLInputElement | null>).network?.value) || 'xna');
    if (NEURAI_UTILS.isTestnetNetwork(network)) NeuraiReader.setTestnet(); else NeuraiReader.setMainnet();
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
        NEURAI_UTILS.applyTheme(state.settings as Partial<WalletSettings>);
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

  async function handleHwSignMessage(message: Record<string, unknown>) {
    if (!hwDevice || !hwDevice.connected) {
      return { error: 'Hardware wallet is not connected. Click Reconnect in the addon or open the popup.' };
    }
    try {
      await NEURAI_UTILS.syncHardwareNetwork(hwDevice, state.network);
      showToast('Confirm message signing on your device...', 'success');
      const result = await hwDevice.signMessage(message.message as string);
      showToast('Message signed', 'success');
      return { success: true, signature: result.signature, address: result.address };
    } catch (err) {
      showToast('Signing failed', 'error');
      updateHwConnectionUI();
      return { error: 'HW sign failed: ' + (err as Error).message };
    }
  }

  async function handleHwSignRawTx(message: Record<string, unknown>) {
    if (!hwDevice || !hwDevice.connected) {
      return { error: 'Hardware wallet is not connected. Click Reconnect in the addon or open the popup.' };
    }
    try {
      await NEURAI_UTILS.syncHardwareNetwork(hwDevice, state.network);
      const metadata = await ensureHardwareSigningMetadata(message);
      const publicKey = metadata.publicKey;
      const derivationPath = metadata.derivationPath;
      const masterFingerprint = metadata.masterFingerprint;

      if (!publicKey || !derivationPath || !masterFingerprint) {
        return { error: 'Hardware wallet metadata is incomplete. Reconnect the hardware wallet from the full wallet view.' };
      }

      // Fetch full raw transactions for each UTXO (needed for nonWitnessUtxo)
      const utxos = (message.utxos || []) as Record<string, unknown>[];
      const rpcUrl = getRpcUrlForNetwork(state.network);
      const txInputs = parseRawTransactionInputs(message.txHex as string);
      const enrichedUtxos = await fetchRawTxForUtxos(txInputs, rpcUrl);

      // Build PSBT from raw transaction
      const networkType = NEURAI_UTILS.toEsp32NetworkType(state.network);
      const sighashType = parseSighashType(message.sighashType as string);
      const psbtBase64 = NeuraiSignESP32.buildPSBTFromRawTransaction({
        network: networkType,
        rawUnsignedTransaction: message.txHex as string,
        inputs: enrichedUtxos.map((utxo) => {
          const signerUtxo = utxos.find((candidate) => candidate.txid === utxo.txid && Number(candidate.vout) === Number(utxo.vout));
          return {
            txid: utxo.txid,
            vout: utxo.vout,
            sequence: utxo.sequence,
            rawTxHex: utxo.rawTxHex ?? undefined,
            ...(signerUtxo ? {
              masterFingerprint,
              derivationPath,
              pubkey: publicKey,
              sighashType
            } : {})
          };
        })
      });
      const feeSats = calculateRawTransactionFeeSats(message.txHex as string, enrichedUtxos);
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
      return { error: 'HW sign failed: ' + (err as Error).message };
    }
  }

  async function ensureHardwareSigningMetadata(message: Record<string, unknown>) {
    const activeWallet: Record<string, unknown> = getActiveWalletData() || {};
    let publicKey = message.publicKey as string || state.publicKey || null;
    let derivationPath = message.derivationPath as string || activeWallet.hardwareDerivationPath as string || null;
    let masterFingerprint = message.masterFingerprint as string || activeWallet.hardwareMasterFingerprint as string || null;

    const needsInfo = !masterFingerprint;
    const needsAddress = !publicKey || !derivationPath;

    await NEURAI_UTILS.syncHardwareNetwork(hwDevice as NeuraiESP32Instance, state.network);

    if (needsInfo) {
      const info = (hwDevice as NeuraiESP32Instance).info || await (hwDevice as NeuraiESP32Instance).getInfo();
      masterFingerprint = info?.master_fingerprint || masterFingerprint;
    }
    if (needsAddress) {
      const addrResp = await (hwDevice as NeuraiESP32Instance).getAddress();
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

  async function fetchRawTxForUtxos(utxos: { txid: string; vout: number; sequence: number }[], rpcUrl: string) {
    const txids = [...new Set(utxos.map(u => u.txid).filter(Boolean))];
    const rawTxMap: Record<string, string> = {};
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
      value: Math.round(((u as unknown as Record<string, unknown>).amount as number || 0) * 1e8),
      rawTxHex: rawTxMap[u.txid] || null
    }));
  }

  function calculateRawTransactionFeeSats(txHex: string, enrichedUtxos: { txid: string; vout: number; rawTxHex: string | null }[]) {
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

  function getPrevoutAmountFromRawTx(rawTxHex: string | null, vout: number) {
    if (!rawTxHex) return null;
    const output = parseRawTransactionOutputs(rawTxHex)[vout];
    return output ? output.value : null;
  }

  function parseSighashType(sighashType: string) {
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

  function estimateBase64Bytes(base64: string) {
    const normalized = String(base64 || '');
    if (!normalized) return 0;
    const padding = normalized.endsWith('==') ? 2 : (normalized.endsWith('=') ? 1 : 0);
    return Math.floor((normalized.length * 3) / 4) - padding;
  }

  function formatSatoshisToXna(satoshis: bigint | number) {
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
