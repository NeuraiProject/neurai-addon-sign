// Neurai Wallet — Full-tab expanded view
// Relies on globals loaded before this script:
//   NeuraiKey, NeuraiReader, NeuraiSignTransaction, NeuraiAssets, NeuraiCreateTransaction
//   (from ../lib/ via classic <script> tags)
import { NEURAI_CONSTANTS } from '../shared/constants.js';
import { NEURAI_UTILS } from '../shared/utils.js';
import {
  parseRawTransaction,
  parseRawTransactionInputs,
  parseRawTransactionOutputs
} from '../shared/parse-raw-tx.js';
import { computeTxid, resolveExplorerTxUrl } from '../shared/explorer.js';
import type { EncryptedSecret, Theme, WalletSettings } from '../types/index.js';

(function () {
  'use strict';

  const C = NEURAI_CONSTANTS;

  // ── Persistent HW device connection ─────────────────────────────────────
  let hwDevice: NeuraiESP32Instance | null = null; // NeuraiESP32 instance, kept alive while expanded is open
  let hwStatusInterval: ReturnType<typeof setInterval> | null = null;
  let copyAddressFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;
  const PAGE_SIZE = 5;
  const DEBUG_AUTHSCRIPT_SIGN = false;
  const DEBUG_ASSET_OPS = false;

  const ASSET_FEES: Record<string, number> = {
    ROOT: 1000,
    SUB: 200,
    UNIQUE: 10,
    QUALIFIER: 2000,
    RESTRICTED: 3000,
    DEPIN: 10,
    REISSUE: 200,
    REISSUE_RESTRICTED: 200,
  };
  const localAssetUnitsCache = new Map<string, number>();
  const AUTHSCRIPT_NULL_ASSET_MODE: NeuraiCreateTransactionNullAssetDestinationMode = 'strict';

  const elements = {
    // Header
    openSettingsBtn: document.getElementById('openSettingsBtn') as HTMLButtonElement | null,
    refreshBtn: document.getElementById('refreshBtn')!,
    headerSubtitle: document.getElementById('headerSubtitle')!,
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn') as HTMLButtonElement | null,
    saveSettingsBtn: document.getElementById('saveSettingsBtn') as HTMLButtonElement | null,
    resetSettingsBtn: document.getElementById('resetSettingsBtn') as HTMLButtonElement | null,
    themeMode: document.getElementById('themeMode') as HTMLSelectElement | null,
    rpcMainnet: document.getElementById('rpcMainnet') as HTMLInputElement | null,
    rpcTestnet: document.getElementById('rpcTestnet') as HTMLInputElement | null,
    explorerMainnet: document.getElementById('explorerMainnet') as HTMLInputElement | null,
    explorerTestnet: document.getElementById('explorerTestnet') as HTMLInputElement | null,
    lockTimeoutMinutes: document.getElementById('lockTimeoutMinutes') as HTMLInputElement | null,
    settingsFeedback: document.getElementById('settingsFeedback'),
    pinStatusText: document.getElementById('pinStatusText'),
    settingsPinOld: document.getElementById('settingsPinOld') as HTMLInputElement | null,
    settingsPinNew: document.getElementById('settingsPinNew') as HTMLInputElement | null,
    settingsPinConfirm: document.getElementById('settingsPinConfirm') as HTMLInputElement | null,
    openBackupBtn: document.getElementById('openBackupBtn') as HTMLButtonElement | null,
    removeWalletBtn: document.getElementById('removeWalletBtn') as HTMLButtonElement | null,
    backupModal: document.getElementById('backupModal'),
    closeBackupBtn: document.getElementById('closeBackupBtn') as HTMLButtonElement | null,
    backupAuthSection: document.getElementById('backupAuthSection'),
    backupDataSection: document.getElementById('backupDataSection'),
    backupPinInput: document.getElementById('backupPinInput') as HTMLInputElement | null,
    backupError: document.getElementById('backupError'),
    backupUnlockBtn: document.getElementById('backupUnlockBtn') as HTMLButtonElement | null,
    backupMnemonicGroup: document.getElementById('backupMnemonicGroup'),
    backupMnemonicWords: document.getElementById('backupMnemonicWords'),
    backupCopyMnemonicBtn: document.getElementById('backupCopyMnemonicBtn') as HTMLButtonElement | null,
    backupPassphraseGroup: document.getElementById('backupPassphraseGroup'),
    backupPassphraseText: document.getElementById('backupPassphraseText'),
    backupWifText: document.getElementById('backupWifText') as HTMLInputElement | null,
    toggleBackupWifBtn: document.getElementById('toggleBackupWifBtn') as HTMLButtonElement | null,
    backupCopyWifBtn: document.getElementById('backupCopyWifBtn') as HTMLButtonElement | null,
    removeConfirmModal: document.getElementById('removeConfirmModal'),
    removeConfirmText: document.getElementById('removeConfirmText'),
    cancelRemoveBtn: document.getElementById('cancelRemoveBtn') as HTMLButtonElement | null,
    confirmRemoveBtn: document.getElementById('confirmRemoveBtn') as HTMLButtonElement | null,

    // Sections
    setupSection: document.getElementById('setupSection'),
    mnemonicSection: document.getElementById('mnemonicSection')!,
    walletSection: document.getElementById('walletSection')!,

    // Wallet display
    copyAddressBtn: document.getElementById('copyAddressBtn')!,
    changeAccountBtn: document.getElementById('changeAccountBtn') as HTMLButtonElement | null,
    newAccountBtn: document.getElementById('newAccountBtn') as HTMLButtonElement | null,
    networkValue: document.getElementById('networkValue')!,
    accountValue: document.getElementById('accountValue')!,
    statusValue: document.getElementById('statusValue')!,
    addressValue: document.getElementById('addressValue')!,
    balanceValue: document.getElementById('balanceValue')!,
    pendingValue: document.getElementById('pendingValue')!,
    balancePanelAssets: document.getElementById('balancePanelAssets'),
    assetsList: document.getElementById('assetsList')!,
    assetsEmpty: document.getElementById('assetsEmpty')!,
    assetsPager: document.getElementById('assetsPager'),
    assetsPrevBtn: document.getElementById('assetsPrevBtn') as HTMLButtonElement | null,
    assetsNextBtn: document.getElementById('assetsNextBtn') as HTMLButtonElement | null,
    assetsPageLabel: document.getElementById('assetsPageLabel'),
    assetsFilterBar: document.getElementById('assetsFilterBar'),
    historyList: document.getElementById('historyList')!,
    historyEmpty: document.getElementById('historyEmpty')!,
    unlockModal: document.getElementById('unlockModal')!,
    unlockPinInput: document.getElementById('unlockPinInput') as HTMLInputElement,
    unlockError: document.getElementById('unlockError')!,
    unlockConfirmBtn: document.getElementById('unlockConfirmBtn')!,
    unlockPrimaryView: document.getElementById('unlockPrimaryView')!,
    unlockForgotPinLink: document.getElementById('unlockForgotPinLink')!,
    unlockResetView: document.getElementById('unlockResetView')!,
    unlockResetInput: document.getElementById('unlockResetInput') as HTMLInputElement,
    unlockResetMessage: document.getElementById('unlockResetMessage')!,
    unlockResetCancelBtn: document.getElementById('unlockResetCancelBtn')!,
    unlockResetConfirmBtn: document.getElementById('unlockResetConfirmBtn')!,

    hardwareCard: document.getElementById('hardwareCard'),
    hwStatusDot: document.getElementById('hwStatusDot'),
    hwStatusText: document.getElementById('hwStatusText'),
    hwReconnectBtn: document.getElementById('hwReconnectBtn') as HTMLButtonElement | null,
    recentMovementsList: document.getElementById('recentMovementsList')!,
    recentMovementsEmpty: document.getElementById('recentMovementsEmpty')!,
    recentMovementsPager: document.getElementById('recentMovementsPager'),
    recentMovementsPrevBtn: document.getElementById('recentMovementsPrevBtn') as HTMLButtonElement | null,
    recentMovementsNextBtn: document.getElementById('recentMovementsNextBtn') as HTMLButtonElement | null,
    recentMovementsPageLabel: document.getElementById('recentMovementsPageLabel'),
    historyPager: document.getElementById('historyPager'),
    historyPrevBtn: document.getElementById('historyPrevBtn') as HTMLButtonElement | null,
    historyNextBtn: document.getElementById('historyNextBtn') as HTMLButtonElement | null,
    historyPageLabel: document.getElementById('historyPageLabel'),
    createAssetCard: document.getElementById('createAssetCard'),
    assetTypeTabs: document.getElementById('assetTypeTabs'),
    caAssetNameGroup: document.getElementById('caAssetNameGroup'),
    caAssetName: document.getElementById('caAssetName') as HTMLInputElement | null,
    caAssetNameHint: document.getElementById('caAssetNameHint'),
    caParentSelectGroup: document.getElementById('caParentSelectGroup'),
    caParentSelectLabel: document.getElementById('caParentSelectLabel'),
    caParentSelect: document.getElementById('caParentSelect') as HTMLSelectElement | null,
    caLoadParentsBtn: document.getElementById('caLoadParentsBtn') as HTMLButtonElement | null,
    caParentSelectHint: document.getElementById('caParentSelectHint'),
    caRestrictedBaseGroup: document.getElementById('caRestrictedBaseGroup'),
    caRestrictedBaseSelect: document.getElementById('caRestrictedBaseSelect') as HTMLSelectElement | null,
    caLoadRestrictedBasesBtn: document.getElementById('caLoadRestrictedBasesBtn') as HTMLButtonElement | null,
    caRestrictedBaseHint: document.getElementById('caRestrictedBaseHint'),
    caSubNameGroup: document.getElementById('caSubNameGroup'),
    caSubName: document.getElementById('caSubName') as HTMLInputElement | null,
    caTagGroup: document.getElementById('caTagGroup'),
    caTag: document.getElementById('caTag') as HTMLInputElement | null,
    caQuantityGroup: document.getElementById('caQuantityGroup'),
    caQuantityLabel: document.getElementById('caQuantityLabel'),
    caQuantity: document.getElementById('caQuantity') as HTMLInputElement | null,
    caUnitsGroup: document.getElementById('caUnitsGroup'),
    caUnits: document.getElementById('caUnits') as HTMLSelectElement | null,
    caReissuableGroup: document.getElementById('caReissuableGroup'),
    caReissuable: document.getElementById('caReissuable') as HTMLInputElement | null,
    caReissuableLabel: document.getElementById('caReissuableLabel'),
    caVerifierGroup: document.getElementById('caVerifierGroup'),
    caVerifier: document.getElementById('caVerifier') as HTMLInputElement | null,
    caVerifierSelect: document.getElementById('caVerifierSelect') as HTMLSelectElement | null,
    caLoadVerifiersBtn: document.getElementById('caLoadVerifiersBtn') as HTMLButtonElement | null,
    caVerifierAddBtn: document.getElementById('caVerifierAddBtn') as HTMLButtonElement | null,
    caVerifierNegateBtn: document.getElementById('caVerifierNegateBtn') as HTMLButtonElement | null,
    caVerifierAndBtn: document.getElementById('caVerifierAndBtn') as HTMLButtonElement | null,
    caVerifierOrBtn: document.getElementById('caVerifierOrBtn') as HTMLButtonElement | null,
    caVerifierClearBtn: document.getElementById('caVerifierClearBtn') as HTMLButtonElement | null,
    caVerifierPreview: document.getElementById('caVerifierPreview'),
    caVerifierHint: document.getElementById('caVerifierHint'),
    caIpfsHash: document.getElementById('caIpfsHash') as HTMLInputElement | null,
    caFeeValue: document.getElementById('caFeeValue'),
    caError: document.getElementById('caError'),
    caCreateBtn: document.getElementById('caCreateBtn') as HTMLButtonElement | null,
    caResult: document.getElementById('caResult'),
    caTxid: document.getElementById('caTxid'),
    caNewBtn: document.getElementById('caNewBtn') as HTMLButtonElement | null,
    caTxConfirmModal: document.getElementById('caTxConfirmModal'),
    caTxOutputsList: document.getElementById('caTxOutputsList'),
    caTxRawToggle: document.getElementById('caTxRawToggle') as HTMLButtonElement | null,
    caTxRawHex: document.getElementById('caTxRawHex'),
    caTxDebugToggle: document.getElementById('caTxDebugToggle') as HTMLButtonElement | null,
    caTxDebugJson: document.getElementById('caTxDebugJson'),
    caTxConfirmError: document.getElementById('caTxConfirmError'),
    caTxCancelBtn: document.getElementById('caTxCancelBtn') as HTMLButtonElement | null,
    caTxBroadcastBtn: document.getElementById('caTxBroadcastBtn') as HTMLButtonElement | null,
    // Card mode toggle
    assetModeToggle: document.getElementById('assetModeToggle'),
    caCardTitle: document.getElementById('caCardTitle'),
    caCardCopy: document.getElementById('caCardCopy'),
    createAssetPanel: document.getElementById('createAssetPanel'),
    configureAssetPanel: document.getElementById('configureAssetPanel'),
    // Configure panel
    cfTypeTabs: document.getElementById('cfTypeTabs'),
    cfOwnerTokenGroup: document.getElementById('cfOwnerTokenGroup'),
    cfOwnerTokenLabel: document.getElementById('cfOwnerTokenLabel'),
    cfOwnerTokenSelect: document.getElementById('cfOwnerTokenSelect') as HTMLSelectElement | null,
    cfOwnerTokenHint: document.getElementById('cfOwnerTokenHint'),
    cfLoadTokensBtn: document.getElementById('cfLoadTokensBtn') as HTMLButtonElement | null,
    cfAddressesGroup: document.getElementById('cfAddressesGroup'),
    cfAddresses: document.getElementById('cfAddresses') as HTMLTextAreaElement | null,
    cfGlobalGroup: document.getElementById('cfGlobalGroup'),
    cfGlobal: document.getElementById('cfGlobal') as HTMLInputElement | null,
    cfQuantityGroup: document.getElementById('cfQuantityGroup'),
    cfQuantity: document.getElementById('cfQuantity') as HTMLInputElement | null,
    cfChangeVerifierGroup: document.getElementById('cfChangeVerifierGroup'),
    cfChangeVerifier: document.getElementById('cfChangeVerifier') as HTMLInputElement | null,
    cfNewVerifierGroup: document.getElementById('cfNewVerifierGroup'),
    cfNewVerifier: document.getElementById('cfNewVerifier') as HTMLInputElement | null,
    cfReissuableGroup: document.getElementById('cfReissuableGroup'),
    cfReissuable: document.getElementById('cfReissuable') as HTMLInputElement | null,
    cfNewIpfsGroup: document.getElementById('cfNewIpfsGroup'),
    cfNewIpfs: document.getElementById('cfNewIpfs') as HTMLInputElement | null,
    cfFeeRow: document.getElementById('cfFeeRow'),
    cfFeeValue: document.getElementById('cfFeeValue'),
    cfError: document.getElementById('cfError'),
    cfApplyBtn: document.getElementById('cfApplyBtn') as HTMLButtonElement | null,
  };

  let state = {
    wallet: null as Record<string, unknown> | null,
    accounts: null as Record<string, Record<string, unknown> | null> | null,
    activeAccountId: '1',
    settings: { ...C.DEFAULT_SETTINGS } as WalletSettings,
    assets: [] as unknown[],
    assetsPage: 0,
    assetsFilter: 'all' as string,
    recentMovements: [] as unknown[],
    recentMovementsPage: 0,
    historyPage: 0,
    unlockUntil: 0,
    sessionPin: '',
    autoRefreshInterval: null as ReturnType<typeof setInterval> | null,
    isRefreshingBalance: false,
    lockWatchInterval: null as ReturnType<typeof setInterval> | null,
    lastUnlockTouchAt: 0,
    createAssetType: 'ROOT' as string,
    configAssetType: 'TAG' as string,
    cardMode: 'CREATE' as 'CREATE' | 'CONFIGURE',
    pendingSignedTx: null as { hex: string; rpcUrl: string; buildResult: NeuraiAssetsBuildResult } | null,
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
      startAutoRefresh();
      await refreshBalance();
    } else {
      stopAutoRefresh();
      // Redirect to onboarding
      window.location.href = chrome.runtime.getURL('onboarding/welcome.html');
      return;
    }
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  function bindEvents() {
    if (elements.openSettingsBtn) elements.openSettingsBtn.addEventListener('click', openSettingsModal);
    elements.refreshBtn.addEventListener('click', handleRefresh);
    if (elements.closeSettingsBtn) elements.closeSettingsBtn.addEventListener('click', closeSettingsModal);
    if (elements.saveSettingsBtn) elements.saveSettingsBtn.addEventListener('click', handleSaveSettings);
    if (elements.resetSettingsBtn) elements.resetSettingsBtn.addEventListener('click', handleResetSettings);
    if (elements.openBackupBtn) elements.openBackupBtn.addEventListener('click', openBackupModal);
    if (elements.removeWalletBtn) elements.removeWalletBtn.addEventListener('click', openRemoveConfirmModal);
    if (elements.settingsModal) {
      elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) closeSettingsModal();
      });
    }
    if (elements.closeBackupBtn) elements.closeBackupBtn.addEventListener('click', closeBackupModal);
    if (elements.backupUnlockBtn) elements.backupUnlockBtn.addEventListener('click', handleBackupUnlock);
    if (elements.backupCopyMnemonicBtn) elements.backupCopyMnemonicBtn.addEventListener('click', copyBackupMnemonic);
    if (elements.toggleBackupWifBtn) elements.toggleBackupWifBtn.addEventListener('click', toggleBackupWifVisibility);
    if (elements.backupCopyWifBtn) elements.backupCopyWifBtn.addEventListener('click', copyBackupWif);
    if (elements.cancelRemoveBtn) elements.cancelRemoveBtn.addEventListener('click', closeRemoveConfirmModal);
    if (elements.confirmRemoveBtn) elements.confirmRemoveBtn.addEventListener('click', handleConfirmRemoveAccount);
    if (elements.backupPinInput) {
      elements.backupPinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleBackupUnlock();
      });
    }
    if (elements.backupModal) {
      elements.backupModal.addEventListener('click', (e) => {
        if (e.target === elements.backupModal) closeBackupModal();
      });
    }
    if (elements.removeConfirmModal) {
      elements.removeConfirmModal.addEventListener('click', (e) => {
        if (e.target === elements.removeConfirmModal) closeRemoveConfirmModal();
      });
    }
    elements.copyAddressBtn.addEventListener('click', copyAddress);
    if (elements.changeAccountBtn) elements.changeAccountBtn.addEventListener('click', handleChangeAccount);
    if (elements.newAccountBtn) elements.newAccountBtn.addEventListener('click', handleCreateNewAccount);
    if (elements.assetsPrevBtn) elements.assetsPrevBtn.addEventListener('click', () => changeAssetsPage(-1));
    if (elements.assetsNextBtn) elements.assetsNextBtn.addEventListener('click', () => changeAssetsPage(1));
    if (elements.assetsFilterBar) elements.assetsFilterBar.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.assets-filter-btn') as HTMLElement | null;
      if (!btn || !btn.dataset.filter) return;
      state.assetsFilter = btn.dataset.filter;
      state.assetsPage = 0;
      elements.assetsFilterBar!.querySelectorAll('.assets-filter-btn').forEach(b => {
        b.classList.toggle('active', (b as HTMLElement).dataset.filter === state.assetsFilter);
      });
      renderAssetsList();
    });
    if (elements.historyPrevBtn) elements.historyPrevBtn.addEventListener('click', () => changeHistoryPage(-1));
    if (elements.historyNextBtn) elements.historyNextBtn.addEventListener('click', () => changeHistoryPage(1));
    if (elements.recentMovementsPrevBtn) elements.recentMovementsPrevBtn.addEventListener('click', () => changeRecentMovementsPage(-1));
    if (elements.recentMovementsNextBtn) elements.recentMovementsNextBtn.addEventListener('click', () => changeRecentMovementsPage(1));
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
    bindCreateAsset();
  }

  // ── Section visibility ─────────────────────────────────────────────────────

  function showSetupSection() {
    stopAutoRefresh();
    // Redirect to onboarding page
    window.location.href = chrome.runtime.getURL('onboarding/welcome.html');
  }

  function showWalletSection() {
    if (isAddonLocked()) {
      openUnlockModal();
      return;
    }
    elements.refreshBtn.style.display = '';
    if (elements.setupSection) elements.setupSection.classList.add('hidden');
    elements.mnemonicSection.classList.add('hidden');
    elements.walletSection.classList.remove('hidden');
    renderWalletInfo();
    renderHistory();
    touchUnlockSession(true);
    startAutoRefresh();

    const wallet = state.wallet || {};
    if (wallet.walletType === 'hardware') {
      startHwStatusMonitor();
    } else {
      stopHwStatusMonitor();
      if (elements.hardwareCard) {
        elements.hardwareCard.classList.add('hidden');
        elements.hardwareCard.classList.remove('hardware-card--connected', 'hardware-card--disconnected');
      }
    }
  }

  // ── History ────────────────────────────────────────────────────────────────

  function renderHistory() {
    elements.historyList.innerHTML = '';
    const activeAccount = state.accounts && state.accounts[state.activeAccountId];
    const history = (activeAccount as Record<string, unknown> & { history?: unknown[] })?.history || [];
    const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
    state.historyPage = Math.min(state.historyPage, totalPages - 1);

    if (history.length === 0) {
      elements.historyEmpty.classList.remove('hidden');
      elements.historyList.appendChild(elements.historyEmpty);
      updatePager(elements.historyPager, elements.historyPageLabel, elements.historyPrevBtn, elements.historyNextBtn, 0, 0);
      return;
    }

    elements.historyEmpty.classList.add('hidden');
    const pageItems = paginateItems(history, state.historyPage);
    pageItems.forEach(item => {
      const el = document.createElement('div');
      el.className = 'history-item';

      const isRawTx = (item as Record<string, unknown>).type === 'raw_tx';

      // Header: origin + date
      const header = document.createElement('div');
      header.className = 'history-item-header';
      const dateStr = new Date((item as Record<string, unknown>).timestamp as number).toLocaleString();
      header.innerHTML = `<span class="history-item-origin">${escapeHtml((item as Record<string, unknown>).origin as string)}</span><span>${escapeHtml(dateStr)}</span>`;

      // Type badge row
      const meta = document.createElement('div');
      meta.className = 'history-item-meta';
      if (isRawTx) {
        const rawTxLabel = getRawTxHistoryLabel(item);
        meta.innerHTML = `<span class="history-item-badge history-item-badge--rawtx">${escapeHtml(rawTxLabel)}</span>
          <span class="history-item-meta-detail">Sighash: <strong>${escapeHtml((item as Record<string, unknown>).sighashType as string || 'ALL')}</strong></span>
          <span class="history-item-meta-detail">Inputs: <strong>${(item as Record<string, unknown>).inputCount ?? '?'}</strong></span>`;
      } else {
        meta.innerHTML = `<span class="history-item-badge history-item-badge--msg">MSG</span>`;
      }

      el.appendChild(header);
      el.appendChild(meta);

      if (isRawTx) {
        const signedHex = ((item as Record<string, unknown>).signedTxHex as string) || ((item as Record<string, unknown>).txHex as string) || '';

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
        msg.title = (item as Record<string, unknown>).message as string;
        msg.textContent = (item as Record<string, unknown>).message as string;

        const sig = document.createElement('div');
        sig.className = 'history-item-sig';
        sig.textContent = (item as Record<string, unknown>).signature as string;

        el.appendChild(msg);
        el.appendChild(sig);
      }

      elements.historyList.appendChild(el);
    });
    updatePager(elements.historyPager, elements.historyPageLabel, elements.historyPrevBtn, elements.historyNextBtn, state.historyPage, totalPages);
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

  function openSettingsModal() {
    syncSettingsForm();
    clearSettingsFeedback();
    elements.settingsModal?.classList.remove('hidden');
  }

  function closeSettingsModal() {
    elements.settingsModal?.classList.add('hidden');
    clearSettingsFeedback();
  }

  function syncSettingsForm() {
    const settings = state.settings || C.DEFAULT_SETTINGS;
    if (elements.themeMode) elements.themeMode.value = String(settings.theme || C.DEFAULT_SETTINGS.theme);
    if (elements.rpcMainnet) elements.rpcMainnet.value = String(settings.rpcMainnet || '');
    if (elements.rpcTestnet) elements.rpcTestnet.value = String(settings.rpcTestnet || '');
    if (elements.explorerMainnet) elements.explorerMainnet.value = String(settings.explorerMainnet || '');
    if (elements.explorerTestnet) elements.explorerTestnet.value = String(settings.explorerTestnet || '');
    if (elements.lockTimeoutMinutes) {
      elements.lockTimeoutMinutes.value = String(
        NEURAI_UTILS.normalizeLockTimeoutMinutes(settings.lockTimeoutMinutes)
      );
    }
    syncPinSettingsUI();
  }

  function syncPinSettingsUI() {
    const hasPin = !!state.settings?.pinHash;
    if (elements.pinStatusText) {
      elements.pinStatusText.textContent = hasPin ? 'Active' : 'Not configured';
      elements.pinStatusText.classList.toggle('active', hasPin);
    }
    if (elements.settingsPinOld) elements.settingsPinOld.value = '';
    if (elements.settingsPinNew) elements.settingsPinNew.value = '';
    if (elements.settingsPinConfirm) elements.settingsPinConfirm.value = '';
    if (elements.openBackupBtn) {
      const isHardware = state.wallet?.walletType === 'hardware';
      elements.openBackupBtn.disabled = !!isHardware;
      elements.openBackupBtn.title = isHardware ? 'Hardware wallet secrets stay on the device' : '';
    }
  }

  function setSettingsFeedback(message: string, type: 'success' | 'error') {
    if (!elements.settingsFeedback) return;
    elements.settingsFeedback.textContent = message;
    elements.settingsFeedback.classList.remove('hidden', 'is-success', 'is-error');
    elements.settingsFeedback.classList.add(type === 'success' ? 'is-success' : 'is-error');
  }

  function clearSettingsFeedback() {
    if (!elements.settingsFeedback) return;
    elements.settingsFeedback.textContent = '';
    elements.settingsFeedback.classList.add('hidden');
    elements.settingsFeedback.classList.remove('is-success', 'is-error');
  }

  async function handleSaveSettings() {
    try {
      const currentPin = (elements.settingsPinOld?.value || '').trim();
      const newPin = (elements.settingsPinNew?.value || '').trim();
      const confirmPin = (elements.settingsPinConfirm?.value || '').trim();
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
        await unlockForConfiguredTimeout();
        pinHash = await NEURAI_UTILS.hashText(newPin);
      }

      state.settings = {
        ...state.settings,
        theme: (elements.themeMode?.value || C.DEFAULT_SETTINGS.theme) as Theme,
        rpcMainnet: normalizeOptionalUrl(elements.rpcMainnet?.value || ''),
        rpcTestnet: normalizeOptionalUrl(elements.rpcTestnet?.value || ''),
        explorerMainnet: normalizeOptionalExplorerUrl(elements.explorerMainnet?.value || ''),
        explorerTestnet: normalizeOptionalExplorerUrl(elements.explorerTestnet?.value || ''),
        pinHash,
        lockTimeoutMinutes: NEURAI_UTILS.normalizeLockTimeoutMinutes(elements.lockTimeoutMinutes?.value)
      };

      await ensureRpcPermissions(state.settings);
      await saveAccountsData();
      await saveSettings();
      await notifySettingsUpdated();
      NEURAI_UTILS.applyTheme(state.settings);
      syncPinSettingsUI();
      setSettingsFeedback(newPin ? 'Settings saved. PIN updated.' : 'Settings saved.', 'success');

      if (hasActiveWallet() && !isAddonLocked()) {
        await refreshBalance();
      }

      window.setTimeout(() => closeSettingsModal(), 500);
    } catch (error) {
      setSettingsFeedback('Invalid settings: ' + (error as Error).message, 'error');
    }
  }

  async function handleResetSettings() {
    state.settings = {
      ...C.DEFAULT_SETTINGS,
      pinHash: state.settings?.pinHash || ''
    };
    syncSettingsForm();
    await saveSettings();
    await notifySettingsUpdated();
    NEURAI_UTILS.applyTheme(state.settings);
    setSettingsFeedback('Default settings restored.', 'success');

    if (hasActiveWallet() && !isAddonLocked()) {
      await refreshBalance();
    }
  }

  function openBackupModal() {
    if (state.wallet?.walletType === 'hardware') {
      setSettingsFeedback('Hardware wallet secrets stay on the device.', 'error');
      return;
    }
    if (!elements.backupModal) return;
    elements.backupModal.classList.remove('hidden');
    elements.backupAuthSection?.classList.remove('hidden');
    elements.backupDataSection?.classList.add('hidden');
    if (elements.backupPinInput) elements.backupPinInput.value = '';
    if (elements.backupError) elements.backupError.textContent = '';
    if (!state.settings?.pinHash) {
      revealBackupData().catch((error) => {
        if (elements.backupError) elements.backupError.textContent = 'Unable to load backup: ' + (error as Error).message;
      });
      return;
    }
    if (elements.backupPinInput) elements.backupPinInput.focus();
  }

  function closeBackupModal() {
    elements.backupModal?.classList.add('hidden');
    elements.backupAuthSection?.classList.remove('hidden');
    elements.backupDataSection?.classList.add('hidden');
    if (elements.backupPinInput) elements.backupPinInput.value = '';
    if (elements.backupError) elements.backupError.textContent = '';
    if (elements.backupWifText) {
      elements.backupWifText.value = '';
      elements.backupWifText.type = 'password';
    }
    if (elements.toggleBackupWifBtn) elements.toggleBackupWifBtn.textContent = 'Show';
    if (elements.backupMnemonicWords) elements.backupMnemonicWords.innerHTML = '';
    elements.backupMnemonicGroup?.classList.add('hidden');
    elements.backupPassphraseGroup?.classList.add('hidden');
    if (elements.backupPassphraseText) elements.backupPassphraseText.textContent = '';
  }

  async function handleBackupUnlock() {
    const entered = (elements.backupPinInput?.value || '').trim();
    if (!entered) {
      if (elements.backupError) elements.backupError.textContent = 'PIN is required.';
      return;
    }

    const hash = await NEURAI_UTILS.hashText(entered);
    if (hash !== state.settings.pinHash) {
      if (elements.backupError) elements.backupError.textContent = 'Invalid PIN.';
      return;
    }

    await revealBackupData(entered);
  }

  async function revealBackupData(pin = '') {
    try {
      const active = getActiveWalletData();
      if (!active) throw new Error('No active wallet to backup');

      let wif = String(active.privateKey || '');
      if (!wif && active.privateKeyEnc && pin) {
        wif = await NEURAI_UTILS.decryptTextWithPin(active.privateKeyEnc as EncryptedSecret, pin);
      }

      let mnemonicStr = String(active.mnemonic || '');
      if (!mnemonicStr && active.mnemonicEnc && pin) {
        mnemonicStr = await NEURAI_UTILS.decryptTextWithPin(active.mnemonicEnc as EncryptedSecret, pin);
      }

      let passphraseStr = String(active.passphrase || '');
      if (!passphraseStr && active.passphraseEnc && pin) {
        passphraseStr = await NEURAI_UTILS.decryptTextWithPin(active.passphraseEnc as EncryptedSecret, pin);
      }

      if (elements.backupWifText) elements.backupWifText.value = wif;
      if (elements.backupMnemonicWords) {
        const words = mnemonicStr ? mnemonicStr.trim().split(/\s+/) : [];
        elements.backupMnemonicWords.innerHTML = words.map((word, index) =>
          `<span class="mnemonic-word"><span class="mnemonic-word-num">${index + 1}</span>${escapeHtml(word)}</span>`
        ).join('');
        elements.backupMnemonicGroup?.classList.toggle('hidden', words.length === 0);
      }

      if (elements.backupPassphraseText) elements.backupPassphraseText.textContent = passphraseStr;
      elements.backupPassphraseGroup?.classList.toggle('hidden', !passphraseStr);
      elements.backupAuthSection?.classList.add('hidden');
      elements.backupDataSection?.classList.remove('hidden');
      if (elements.backupError) elements.backupError.textContent = '';
    } catch (error) {
      if (elements.backupError) elements.backupError.textContent = 'Decryption failed: ' + (error as Error).message;
    }
  }

  async function copyBackupMnemonic() {
    const words = Array.from(elements.backupMnemonicWords?.querySelectorAll('.mnemonic-word') || [])
      .map((node) => node.textContent?.replace(/^\d+/, '').trim() || '')
      .filter(Boolean)
      .join(' ');
    if (!words) return;
    await navigator.clipboard.writeText(words);
  }

  async function copyBackupWif() {
    const wif = elements.backupWifText?.value || '';
    if (!wif) return;
    await navigator.clipboard.writeText(wif);
  }

  function toggleBackupWifVisibility() {
    if (!elements.backupWifText || !elements.toggleBackupWifBtn) return;
    const hidden = elements.backupWifText.type === 'password';
    elements.backupWifText.type = hidden ? 'text' : 'password';
    elements.toggleBackupWifBtn.textContent = hidden ? 'Hide' : 'Show';
  }

  function openRemoveConfirmModal() {
    if (elements.removeConfirmText) {
      elements.removeConfirmText.textContent =
        'This action permanently deletes all configured accounts, secret keys and the current PIN.';
    }
    elements.removeConfirmModal?.classList.remove('hidden');
  }

  function closeRemoveConfirmModal() {
    elements.removeConfirmModal?.classList.add('hidden');
  }

  async function handleConfirmRemoveAccount() {
    await resetAddonData();
    closeRemoveConfirmModal();
    closeSettingsModal();
    window.location.href = chrome.runtime.getURL('onboarding/welcome.html');
  }

  function renderWalletInfo() {
    if (!state.wallet) return;
    const network = (state.wallet.network || 'xna') as string;
    const networkLabels: Record<string, string> = {
      'xna': 'Mainnet', 'xna-test': 'Testnet',
      'xna-legacy': 'Mainnet Legacy', 'xna-legacy-test': 'Testnet Legacy',
      'xna-pq': 'Mainnet AuthScript PQ', 'xna-pq-test': 'Testnet AuthScript PQ'
    };
    elements.networkValue.textContent = networkLabels[network] || network;
    elements.accountValue.textContent = 'Neurai_' + state.activeAccountId;
    elements.addressValue.textContent = state.wallet.address as string || '--';
    elements.headerSubtitle.classList.toggle('hidden', state.wallet.walletType !== 'hardware');
    updateChangeAccountButton();
  }

  async function refreshBalance() {
    if (isAddonLocked()) {
      openUnlockModal();
      return;
    }
    if (!state.wallet || !state.wallet.address) return;
    if (state.isRefreshingBalance) return;

    state.isRefreshingBalance = true;

    elements.statusValue.textContent = 'Loading…';

    applyReaderConfig(state.wallet.network as string || 'xna');

    try {
      const balanceData = await NeuraiReader.getNeuraiBalance(state.wallet.address as string);
      const balance = NeuraiReader.formatBalance(balanceData!.balance);

      // Mempool/pending query may fail for AuthScript addresses (RPC 500).
      // Isolate so that a mempool error does not prevent the confirmed balance from displaying.
      let pending = '0';
      try {
        const pendingDelta = await NeuraiReader.getPendingBalanceFromAddressMempool(state.wallet.address as string, 'XNA');
        pending = NeuraiReader.formatBalance(pendingDelta);
      } catch (_mempoolError) {
        // getaddressmempool not supported for this address type — show 0 pending
      }

      const assetBalance = await NeuraiReader.getAssetBalance(state.wallet.address as string);
      state.assets = normalizeAssetsFromRpc(assetBalance);
      renderAmount(elements.balanceValue, balance, '0');
      renderAmount(elements.pendingValue, pending, '0');
      renderAssetsList();
      await refreshRecentMovements();
      elements.statusValue.textContent = 'Connected';
      renderHistory();
    } catch (error) {
      elements.statusValue.textContent = 'RPC error';
      state.assets = [];
      state.recentMovements = [];
      renderAssetsList();
      renderRecentMovements();
      renderAmount(elements.balanceValue, '--', '0');
      renderAmount(elements.pendingValue, '--', '0');
    } finally {
      state.isRefreshingBalance = false;
    }
  }

  function formatAmountParts(value: unknown, fallback = '0') {
    const raw = String(value ?? '').trim();
    if (!raw || raw === '--') return { integer: '--', decimals: '' };
    const normalized = raw.replace(/,/g, '');
    if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
      return { integer: fallback, decimals: '' };
    }
    const [intPart, decPart = ''] = normalized.split('.');
    return { integer: intPart, decimals: decPart.replace(/0+$/, '') };
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
    let rows: unknown[] = [];
    if (Array.isArray(assetBalance)) {
      rows = assetBalance;
    } else if (assetBalance && Array.isArray((assetBalance as Record<string, unknown>).assets)) {
      rows = (assetBalance as Record<string, unknown[]>).assets;
    } else if (assetBalance && typeof assetBalance === 'object') {
      rows = Object.keys(assetBalance as object).map((assetName) => ({
        assetName,
        balance: (assetBalance as Record<string, unknown>)[assetName]
      }));
    }

    return rows
      .map((asset) => {
        const a = asset as Record<string, unknown>;
        const name = String(a.assetName || a.name || '').trim();
        if (!name || name.toUpperCase() === 'XNA') return null;
        const decimals = (typeof a.divisible === 'boolean')
          ? (a.divisible ? 8 : 0)
          : 8;
        const amount = Number(a.balance || 0) / Math.pow(10, decimals);
        return { name, amountText: formatAssetAmount(amount, decimals) };
      })
      .filter(Boolean)
      .sort((a, b) => (a as { name: string }).name.localeCompare((b as { name: string }).name, undefined, { sensitivity: 'base' }));
  }

  function getAssetType(name: string): string {
    if (name.endsWith('!')) return 'owner';
    if (name.startsWith('$')) return 'restricted';
    if (name.startsWith('#')) return 'qualifier';
    if (name.startsWith('&')) return 'depin';
    if (name.includes('#')) return 'unique';
    if (name.includes('/')) return 'sub';
    return 'root';
  }

  function renderAssetsList() {
    const filtered = state.assetsFilter === 'all'
      ? state.assets
      : state.assets.filter(a => getAssetType((a as { name: string }).name) === state.assetsFilter);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    state.assetsPage = Math.min(state.assetsPage, totalPages - 1);

    if (!filtered.length) {
      elements.assetsList.innerHTML = '';
      elements.assetsEmpty.classList.remove('hidden');
      updatePager(elements.assetsPager, elements.assetsPageLabel, elements.assetsPrevBtn, elements.assetsNextBtn, 0, 0);
      return;
    }
    elements.assetsEmpty.classList.add('hidden');
    const pageItems = paginateItems(filtered, state.assetsPage);
    elements.assetsList.innerHTML = pageItems.map((asset) => {
      const a = asset as { name: string; amountText: string };
      return `<div class="asset-item"><span class="asset-name" title="${escapeHtml(a.name)}">${escapeHtml(a.name)}</span><span class="asset-balance">${escapeHtml(a.amountText)}</span></div>`;
    }).join('');
    updatePager(elements.assetsPager, elements.assetsPageLabel, elements.assetsPrevBtn, elements.assetsNextBtn, state.assetsPage, totalPages);
  }

  async function refreshRecentMovements() {
    if (!state.wallet || !state.wallet.address) {
      state.recentMovements = [];
      renderRecentMovements();
      return;
    }

    try {
      const deltas = await NeuraiReader.getAddressDeltas(state.wallet.address as string, 'XNA');
      const movementMap = new Map<string, { txid: string; netSatoshis: number; height: number }>();
      for (const delta of Array.isArray(deltas) ? deltas : []) {
        const txid = (delta as Record<string, unknown>)?.txid as string;
        if (!txid) continue;
        const current = movementMap.get(txid) || {
          txid,
          netSatoshis: 0,
          height: Number((delta as Record<string, unknown>)?.height || 0)
        };
        current.netSatoshis += Number((delta as Record<string, unknown>)?.satoshis || 0);
        if (Number((delta as Record<string, unknown>)?.height || 0) > current.height) {
          current.height = Number((delta as Record<string, unknown>).height || 0);
        }
        movementMap.set(txid, current);
      }

      const txids = Array.from(movementMap.keys());
      const txs = await Promise.all(txids.map((txid) => NeuraiReader.getTransaction(txid)));
      state.recentMovements = txs
        .map((tx) => normalizeMovement(tx, movementMap.get((tx as Record<string, unknown>).txid as string)))
        .filter(Boolean)
        .sort((a, b) => (b as { sortTime: number }).sortTime - (a as { sortTime: number }).sortTime);
      renderRecentMovements();
    } catch (_) {
      state.recentMovements = [];
      renderRecentMovements();
    }
  }

  function detectAssetOp(tx: unknown, address: string) {
    const vout = ((tx as Record<string, unknown>).vout as Array<Record<string, unknown>>) || [];
    // Priority: new_asset(3) > reissue_asset(2) > transfer_asset(1)
    // A single tx can have owner token (transfer_asset) + new_asset outputs to the same address.
    // We scan all outputs for our address and keep the highest-priority match.
    const priority: Record<string, number> = { new_asset: 3, reissue_asset: 2, transfer_asset: 1 };
    let best: { opType: string; assetName: string; amount: number } | null = null;
    for (const output of vout) {
      const script = (output.scriptPubKey || {}) as Record<string, unknown>;
      const addrs = (script.addresses as string[]) || [];
      if (!addrs.includes(address)) continue;
      const type = script.type as string;
      if (!(type in priority)) continue;
      if (best && priority[type] <= priority[best.opType]) continue;
      const asset = (script.asset || {}) as Record<string, unknown>;
      const assetName = (asset.name as string) || '';
      const amount = Number(asset.amount ?? 0);
      const opType = type === 'new_asset' ? 'Issue' : type === 'reissue_asset' ? 'Reissue' : 'Transfer';
      best = { opType, assetName, amount };
    }
    return best;
  }

  function normalizeMovement(tx: unknown, movement: { txid: string; netSatoshis: number; height: number } | undefined) {
    if (!tx || !movement || !movement.txid) return null;

    const netSatoshis = Number(movement.netSatoshis || 0);
    if (!Number.isFinite(netSatoshis) || netSatoshis === 0) return null;

    const timestamp = Number((tx as Record<string, unknown>).blocktime || (tx as Record<string, unknown>).time || 0);
    const assetOp = detectAssetOp(tx, (state.wallet as Record<string, unknown>)?.address as string || '');

    let direction: string;
    let amountText: string;

    if (assetOp) {
      if (assetOp.opType === 'Issue' || assetOp.opType === 'Reissue') {
        direction = assetOp.opType;
      } else {
        direction = netSatoshis < 0 ? 'Asset Sent' : 'Asset Recv';
      }
      const qty = assetOp.amount ? assetOp.amount.toFixed(8).replace(/\.?0+$/, '') : '';
      amountText = qty ? `${assetOp.assetName} × ${qty}` : (assetOp.assetName || 'Asset');
    } else {
      direction = netSatoshis < 0 ? 'Sent' : 'Received';
      const rawAmount = Math.abs(netSatoshis) / 1e8;
      const amount = rawAmount > 0 ? Number(rawAmount).toFixed(8).replace(/\.?0+$/, '') : '0';
      amountText = amount + ' XNA';
    }

    return {
      txid: movement.txid,
      direction,
      amountText,
      timestamp: timestamp ? new Date(timestamp * 1000).toLocaleString() : 'Pending',
      confirmations: Number((tx as Record<string, unknown>).confirmations || 0),
      sortTime: timestamp || 0
    };
  }

  function renderRecentMovements() {
    elements.recentMovementsList.innerHTML = '';
    const totalPages = Math.max(1, Math.ceil(state.recentMovements.length / PAGE_SIZE));
    state.recentMovementsPage = Math.min(state.recentMovementsPage, totalPages - 1);

    if (!state.recentMovements.length) {
      elements.recentMovementsEmpty.classList.remove('hidden');
      elements.recentMovementsList.appendChild(elements.recentMovementsEmpty);
      updatePager(elements.recentMovementsPager, elements.recentMovementsPageLabel, elements.recentMovementsPrevBtn, elements.recentMovementsNextBtn, 0, 0);
      return;
    }

    elements.recentMovementsEmpty.classList.add('hidden');
    const pageItems = paginateItems(state.recentMovements, state.recentMovementsPage);
    const activeAccount = state.accounts && state.accounts[state.activeAccountId];
    const txNetwork = (activeAccount as Record<string, unknown> | undefined)?.network as string | undefined;
    elements.recentMovementsList.innerHTML = pageItems.map((item) => {
      const i = item as { direction: string; amountText: string; timestamp: string; confirmations: number; txid: string };
      const explorerUrl = resolveExplorerTxUrl(txNetwork, i.txid, state.settings as WalletSettings | null);
      const txidCell = explorerUrl
        ? `<a class="movement-txid movement-txid--link" href="${escapeHtml(explorerUrl)}" target="_blank" rel="noopener noreferrer" title="View on explorer">${escapeHtml(i.txid)}</a>`
        : `<div class="movement-txid">${escapeHtml(i.txid)}</div>`;
      return `
      <div class="movement-item">
        <div class="movement-head">
          <span class="movement-direction movement-direction--${i.direction.toLowerCase().replace(/\s+/g, '-')}">${escapeHtml(i.direction)}</span>
          <strong>${escapeHtml(i.amountText)}</strong>
        </div>
        <div class="movement-meta">
          <span>${escapeHtml(i.timestamp)}</span>
          <span>${i.confirmations > 0 ? escapeHtml(String(i.confirmations)) + ' conf' : 'Pending'}</span>
        </div>
        ${txidCell}
      </div>
    `;
    }).join('');
    updatePager(elements.recentMovementsPager, elements.recentMovementsPageLabel, elements.recentMovementsPrevBtn, elements.recentMovementsNextBtn, state.recentMovementsPage, totalPages);
  }

  function paginateItems(items: unknown[], page: number) {
    const start = page * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }

  function updatePager(
    container: HTMLElement | null,
    label: HTMLElement | null,
    prevBtn: HTMLButtonElement | null,
    nextBtn: HTMLButtonElement | null,
    page: number,
    totalPages: number
  ) {
    if (!container || !label || !prevBtn || !nextBtn) return;
    const hasPages = totalPages > 1;
    container.classList.toggle('hidden', !hasPages);
    label.textContent = totalPages ? (page + 1) + ' / ' + totalPages : '0 / 0';
    prevBtn.disabled = !hasPages || page <= 0;
    nextBtn.disabled = !hasPages || page >= totalPages - 1;
  }

  function changeHistoryPage(delta: number) {
    const activeAccount = state.accounts && state.accounts[state.activeAccountId];
    const history = (activeAccount as Record<string, unknown> & { history?: unknown[] })?.history || [];
    const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
    state.historyPage = Math.max(0, Math.min(totalPages - 1, state.historyPage + delta));
    renderHistory();
  }

  function changeRecentMovementsPage(delta: number) {
    const totalPages = Math.max(1, Math.ceil(state.recentMovements.length / PAGE_SIZE));
    state.recentMovementsPage = Math.max(0, Math.min(totalPages - 1, state.recentMovementsPage + delta));
    renderRecentMovements();
  }

  function changeAssetsPage(delta: number) {
    const filtered = state.assetsFilter === 'all'
      ? state.assets
      : state.assets.filter(a => getAssetType((a as { name: string }).name) === state.assetsFilter);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    state.assetsPage = Math.max(0, Math.min(totalPages - 1, state.assetsPage + delta));
    renderAssetsList();
  }

  function escapeHtml(value: unknown) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getRawTxHistoryLabel(item: unknown) {
    const i = item as Record<string, unknown>;
    const sighash = String(i?.sighashType || 'ALL').trim().toUpperCase();
    if (sighash === 'SINGLE|ANYONECANPAY') return 'Offer';
    if (isSwapUtxoConsolidation(item)) return 'UTXO Consolidation';
    if (isSwapHistoryOrigin(i?.origin as string)) return 'Purchase';
    return 'Transaction';
  }

  function isSwapUtxoConsolidation(item: unknown) {
    const i = item as Record<string, unknown>;
    return isSwapHistoryOrigin(i?.origin as string) && Number(i?.inputCount || 0) > 1;
  }

  function isSwapHistoryOrigin(origin: unknown) {
    return /swap\.neurai\.org/i.test(String(origin || ''));
  }

  function applyReaderConfig(network: string) {
    if (NEURAI_UTILS.isTestnetNetwork(network)) NeuraiReader.setTestnet(); else NeuraiReader.setMainnet();
    const rpcUrl = NEURAI_UTILS.isTestnetNetwork(network) ? state.settings.rpcTestnet : state.settings.rpcMainnet;
    if (rpcUrl) NeuraiReader.setURL(rpcUrl);
  }

  function copyAddress() {
    const address = elements.addressValue.textContent;
    if (!address || address === '--') return;
    navigator.clipboard.writeText(address)
      .then(() => showCopyAddressFeedback(true))
      .catch(() => showCopyAddressFeedback(false));
  }

  function isConfiguredAccount(entry: Record<string, unknown> | null | undefined) {
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

  function getConfiguredAccountIds(accountsData: Record<string, Record<string, unknown> | null> = state.accounts || {}) {
    return Object.keys(accountsData).filter((id) => isConfiguredAccount(accountsData[id]));
  }

  function updateChangeAccountButton() {
    if (!elements.changeAccountBtn) return;
    const configuredIds = getConfiguredAccountIds();
    elements.changeAccountBtn.disabled = configuredIds.length <= 1;
    if (elements.newAccountBtn) {
      elements.newAccountBtn.disabled = !findNextEmptyAccountId();
    }
  }

  async function handleChangeAccount() {
    const configuredIds = getConfiguredAccountIds();
    if (configuredIds.length <= 1) return;

    const currentIndex = configuredIds.indexOf(state.activeAccountId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % configuredIds.length : 0;
    const targetId = configuredIds[nextIndex];
    const targetWallet = state.accounts![targetId];
    if (!targetWallet) return;

    state.activeAccountId = String(targetId);
    state.wallet = targetWallet;
    state.assetsPage = 0;
    state.historyPage = 0;
    state.recentMovementsPage = 0;

    await chrome.storage.local.set({
      [C.ACTIVE_ACCOUNT_KEY]: state.activeAccountId,
      [C.STORAGE_KEY]: targetWallet
    });

    showWalletSection();
    await refreshBalance();
  }

  function findNextEmptyAccountId() {
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) {
      const id = String(i);
      if (!isConfiguredAccount(state.accounts![id])) return id;
    }
    return null;
  }

  async function handleCreateNewAccount() {
    const nextId = findNextEmptyAccountId();
    if (!nextId) return;
    window.location.href = chrome.runtime.getURL('onboarding/welcome.html?mode=new-account&id=' + nextId);
  }

  function showCopyAddressFeedback(success: boolean) {
    if (!elements.copyAddressBtn) return;
    if (copyAddressFeedbackTimeout) {
      clearTimeout(copyAddressFeedbackTimeout);
      copyAddressFeedbackTimeout = null;
    }

    elements.copyAddressBtn.classList.toggle('is-success', success);
    elements.copyAddressBtn.querySelector('.copy-btn-label')!.textContent = success ? 'Copied' : 'Failed';

    copyAddressFeedbackTimeout = setTimeout(() => {
      elements.copyAddressBtn.classList.remove('is-success');
      elements.copyAddressBtn.querySelector('.copy-btn-label')!.textContent = 'Copy';
      copyAddressFeedbackTimeout = null;
    }, 1400);
  }

  // ── Storage ────────────────────────────────────────────────────────────────

  async function loadState() {
    const result = await chrome.storage.local.get(
      [C.STORAGE_KEY, C.ACCOUNTS_KEY, C.ACTIVE_ACCOUNT_KEY, C.SETTINGS_KEY, C.UNLOCK_UNTIL_KEY]
    );
    state.accounts = (result[C.ACCOUNTS_KEY] as Record<string, Record<string, unknown> | null>) || null;
    state.activeAccountId = String(result[C.ACTIVE_ACCOUNT_KEY] || '1');
    const activeWallet = state.accounts && state.accounts[state.activeAccountId]
      ? state.accounts[state.activeAccountId]
      : null;
    state.wallet = activeWallet || (result[C.STORAGE_KEY] as Record<string, unknown>) || null;
    state.settings = { ...C.DEFAULT_SETTINGS, ...(result[C.SETTINGS_KEY] || {}) };
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
      if (state.sessionPin) {
        await chrome.storage.session.set({ [C.SESSION_PIN_KEY]: state.sessionPin });
      } else {
        await chrome.storage.session.remove(C.SESSION_PIN_KEY);
      }
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
    const unlockExpired = state.unlockUntil <= Date.now();
    const missingSessionPin = !state.sessionPin;
    const locked = unlockExpired || missingSessionPin;

    if (locked && state.unlockUntil !== 0) {
      state.unlockUntil = 0;
      chrome.storage.local.set({ [C.UNLOCK_UNTIL_KEY]: 0 }, () => { });
    }

    if (locked) {
      state.sessionPin = '';
    }

    return locked;
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
      elements.unlockResetMessage.textContent = (error as Error).message || 'Unable to reset addon data.';
    }
  }

  async function resetAddonData() {
    state.accounts = createDefaultAccounts();
    state.activeAccountId = '1';
    state.wallet = null;
    state.settings = { ...C.DEFAULT_SETTINGS, pinHash: '' };
    state.unlockUntil = 0;
    await persistSessionPin('');

    await chrome.storage.local.set({
      [C.ACCOUNTS_KEY]: state.accounts,
      [C.ACTIVE_ACCOUNT_KEY]: state.activeAccountId,
      [C.STORAGE_KEY]: null,
      [C.SETTINGS_KEY]: state.settings,
      [C.UNLOCK_UNTIL_KEY]: 0
    });
  }

  function createDefaultAccounts() {
    const accounts: Record<string, null> = {};
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) accounts[String(i)] = null;
    return accounts;
  }

  async function unlockForConfiguredTimeout() {
    const minutes = NEURAI_UTILS.normalizeLockTimeoutMinutes(state.settings?.lockTimeoutMinutes);
    state.unlockUntil = Date.now() + minutes * 60 * 1000;
    await chrome.storage.local.set({ [C.UNLOCK_UNTIL_KEY]: state.unlockUntil });
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

  function startAutoRefresh() {
    stopAutoRefresh();
    if (!hasActiveWallet()) return;
    state.autoRefreshInterval = setInterval(() => {
      if (document.hidden || isAddonLocked() || !hasActiveWallet()) return;
      refreshBalance().catch(() => { });
    }, 15000);
  }

  function stopAutoRefresh() {
    if (!state.autoRefreshInterval) return;
    clearInterval(state.autoRefreshInterval);
    state.autoRefreshInterval = null;
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

  async function persistWallet(walletData: Record<string, unknown>) {
    // Update state
    state.wallet = walletData;
    if (!state.accounts || typeof state.accounts !== 'object') {
      state.accounts = {} as Record<string, Record<string, unknown> | null>;
    }
    state.accounts[state.activeAccountId] = walletData;

    await chrome.storage.local.set({
      [C.ACCOUNTS_KEY]: state.accounts,
      [C.ACTIVE_ACCOUNT_KEY]: state.activeAccountId,
      [C.STORAGE_KEY]: walletData
    });
  }

  function getActiveWalletData() {
    return (state.accounts && state.accounts[state.activeAccountId]) || state.wallet || null;
  }

  function hasAccountSecret(entry: Record<string, unknown> | null | undefined) {
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

  function buildAccountsForStorage() {
    const stored = createDefaultAccounts() as Record<string, Record<string, unknown> | null>;
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) {
      const id = String(i);
      const entry = state.accounts?.[id];
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

  async function saveAccountsData(pinOverride = '') {
    if (state.settings?.pinHash) {
      await ensureAccountsEncryptedWithPin(pinOverride || state.sessionPin || '');
    }
    const storedAccounts = buildAccountsForStorage();
    const activeWallet = storedAccounts[state.activeAccountId] || null;
    state.accounts = storedAccounts;
    state.wallet = activeWallet;
    await chrome.storage.local.set({
      [C.ACCOUNTS_KEY]: storedAccounts,
      [C.ACTIVE_ACCOUNT_KEY]: state.activeAccountId,
      [C.STORAGE_KEY]: activeWallet
    });
  }

  async function ensureAccountsEncryptedWithPin(pin: string) {
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) {
      const id = String(i);
      const entry = state.accounts?.[id];
      if (!hasAccountSecret(entry)) continue;

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

  async function reencryptAllWalletKeys(oldPin: string | null, newPin: string) {
    for (let i = 1; i <= C.MAX_ACCOUNTS; i++) {
      const id = String(i);
      const entry = state.accounts?.[id];
      if (!hasAccountSecret(entry)) continue;

      let plain = entry!.privateKey as string || null;
      if (!plain && entry!.privateKeyEnc && oldPin) {
        plain = await NEURAI_UTILS.decryptTextWithPin(entry!.privateKeyEnc as EncryptedSecret, oldPin);
      }
      if (plain) {
        entry!.privateKeyEnc = await NEURAI_UTILS.encryptTextWithPin(plain, newPin);
        if (id !== state.activeAccountId) entry!.privateKey = null;
      }

      let seedKey = entry!.seedKey as string || null;
      if (!seedKey && entry!.seedKeyEnc && oldPin) {
        seedKey = await NEURAI_UTILS.decryptTextWithPin(entry!.seedKeyEnc as EncryptedSecret, oldPin);
      }
      if (seedKey) {
        entry!.seedKeyEnc = await NEURAI_UTILS.encryptTextWithPin(seedKey, newPin);
        if (id !== state.activeAccountId) entry!.seedKey = null;
      }

      let mnemonic = entry!.mnemonic as string || null;
      if (!mnemonic && entry!.mnemonicEnc && oldPin) {
        mnemonic = await NEURAI_UTILS.decryptTextWithPin(entry!.mnemonicEnc as EncryptedSecret, oldPin);
      }
      if (mnemonic) {
        entry!.mnemonicEnc = await NEURAI_UTILS.encryptTextWithPin(mnemonic, newPin);
        if (id !== state.activeAccountId) entry!.mnemonic = null;
      }

      let passphrase = entry!.passphrase as string || null;
      if (!passphrase && entry!.passphraseEnc && oldPin) {
        passphrase = await NEURAI_UTILS.decryptTextWithPin(entry!.passphraseEnc as EncryptedSecret, oldPin);
      }
      if (passphrase) {
        entry!.passphraseEnc = await NEURAI_UTILS.encryptTextWithPin(passphrase, newPin);
        if (id !== state.activeAccountId) entry!.passphrase = null;
      }
    }
  }

  async function saveSettings() {
    await chrome.storage.local.set({ [C.SETTINGS_KEY]: state.settings });
  }

  async function notifySettingsUpdated() {
    try {
      await chrome.runtime.sendMessage({ type: C.MSG.SETTINGS_UPDATED });
    } catch (_) { }
  }

  function normalizeOptionalUrl(value: string) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') return parsed.toString();
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (parsed.protocol === 'http:' && isLocalhost) return parsed.toString();
    throw new Error('RPC URL must use https:// (http:// only allowed for localhost/127.0.0.1)');
  }

  function normalizeOptionalExplorerUrl(value: string) {
    // Explorer URLs may contain a literal `{txid}` placeholder that `new URL()`
    // happily accepts but URL-encodes to `%7Btxid%7D`. We preserve the raw
    // template by swapping in a dummy host before validating and putting the
    // placeholder back afterwards.
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    const hadPlaceholder = trimmed.includes('{txid}');
    const probe = hadPlaceholder ? trimmed.replace('{txid}', 'SENTINEL_TXID_0000') : trimmed;
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
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}/*`;
  }

  async function ensureRpcPermissions(settings: WalletSettings) {
    if (!chrome.permissions) return;
    const origins = [settings.rpcMainnet, settings.rpcTestnet]
      .filter(Boolean)
      .map(toOriginPattern)
      .filter((value, index, all) => !!value && all.indexOf(value) === index) as string[];

    if (!origins.length) return;

    const hasPermission = await new Promise<boolean>((resolve) => {
      chrome.permissions.contains({ origins }, resolve);
    });
    if (hasPermission) return;

    const granted = await new Promise<boolean>((resolve) => {
      chrome.permissions.request({ origins }, resolve);
    });
    if (!granted) throw new Error('Permission denied for custom RPC host');
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
    if (elements.hardwareCard) {
      elements.hardwareCard.classList.add('hidden');
      elements.hardwareCard.classList.remove('hardware-card--connected', 'hardware-card--disconnected');
    }
  }

  function updateHwConnectionUI() {
    const wallet = state.wallet || {};
    if (wallet.walletType !== 'hardware') {
      if (elements.hardwareCard) elements.hardwareCard.classList.add('hidden');
      return;
    }

    if (elements.hardwareCard) elements.hardwareCard.classList.remove('hidden');
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
    if (elements.hardwareCard) {
      elements.hardwareCard.classList.toggle('hardware-card--connected', isConnected);
      elements.hardwareCard.classList.toggle('hardware-card--disconnected', !isConnected);
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
      if (!isSerialPortSelectionCancelled(err as Error)) {
        alert('Reconnection failed: ' + (err as Error).message);
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
    const wallet = state.wallet || {};
    await NEURAI_UTILS.syncHardwareNetwork(device, wallet.network as string | undefined);
    await device.getInfo();
    hwDevice = device;
  }

  async function requestHardwareWalletAddress() {
    if (hwDevice) {
      try { await hwDevice.disconnect(); } catch (_) { }
      hwDevice = null;
    }

    const device = new NeuraiSignESP32.NeuraiESP32({ filters: [] });
    await device.connect();
    const wallet = state.wallet || {};
    const selectedNetwork = wallet.network as string | undefined;
    const activeHardwareNetwork = await NEURAI_UTILS.syncHardwareNetwork(device, selectedNetwork);
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

  function isSerialPortSelectionCancelled(error: Error) {
    return NEURAI_UTILS.isSerialPortSelectionCancelled(error);
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[C.UNLOCK_UNTIL_KEY]) {
      state.unlockUntil = Number(changes[C.UNLOCK_UNTIL_KEY].newValue || 0);
    }
  });

  // ── HW signing requests from background ─────────────────────────────────

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === C.MSG.SETTINGS_SYNCED) {
      loadState().then(() => {
        NEURAI_UTILS.applyTheme(state.settings);
        if (hasActiveWallet() && !isAddonLocked()) refreshBalance().catch(() => { });
      });
    }
    if (message.type === 'HW_CONNECTION_STATUS_PAGE') {
      sendResponse({
        success: true,
        connected: !!(hwDevice && hwDevice.connected),
        source: 'expanded'
      });
      return true;
    }
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

  async function handleHwSignMessage(message: Record<string, unknown>) {
    if (!hwDevice || !hwDevice.connected) {
      return { error: 'Hardware wallet is not connected. Click Reconnect in the addon.' };
    }
    try {
      const wallet = state.wallet || {};
      await NEURAI_UTILS.syncHardwareNetwork(hwDevice, wallet.network as string | undefined);
      const result = await hwDevice.signMessage(message.message as string);
      return { success: true, signature: result.signature, address: result.address };
    } catch (err) {
      updateHwConnectionUI();
      return { error: 'HW sign failed: ' + (err as Error).message };
    }
  }

  async function handleHwSignRawTx(message: Record<string, unknown>) {
    if (!hwDevice || !hwDevice.connected) {
      return { error: 'Hardware wallet is not connected. Click Reconnect in the addon.' };
    }
    try {
      const wallet = state.wallet || {};
      const network = wallet.network as string || 'xna';
      await NEURAI_UTILS.syncHardwareNetwork(hwDevice, network);
      const rpcUrl = NEURAI_UTILS.isTestnetNetwork(network)
        ? (state.settings.rpcTestnet || C.RPC_URL_TESTNET)
        : (state.settings.rpcMainnet || C.RPC_URL);
      const metadata = await ensureHardwareSigningMetadata(message);
      const publicKey = metadata.publicKey;
      const derivationPath = metadata.derivationPath;
      const masterFingerprint = metadata.masterFingerprint;

      if (!publicKey || !derivationPath || !masterFingerprint) {
        return { error: 'Hardware wallet metadata is incomplete. Reconnect the hardware wallet from the full wallet view.' };
      }

      const utxos = message.utxos as unknown[] || [];
      const txInputs = parseRawTransactionInputs(message.txHex as string);
      const enrichedUtxos = await fetchRawTxForUtxos(txInputs, rpcUrl);
      const networkType = NEURAI_UTILS.toEsp32NetworkType(network);
      const sighashType = parseSighashType(message.sighashType as string);
      const psbtBase64 = NeuraiSignESP32.buildPSBTFromRawTransaction({
        network: networkType,
        rawUnsignedTransaction: message.txHex as string,
        inputs: enrichedUtxos.map((utxo) => {
          const signerUtxo = (utxos as Array<Record<string, unknown>>).find(
            (candidate) => candidate.txid === utxo.txid && Number(candidate.vout) === Number(utxo.vout)
          );
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
      const signResult = await hwDevice.signPsbt(psbtBase64, signingDisplay);
      const finalized = NeuraiSignESP32.finalizeSignedPSBT(psbtBase64, signResult.psbt, networkType);
      return { success: true, signedTxHex: finalized.txHex, complete: true };
    } catch (err) {
      updateHwConnectionUI();
      return { error: 'HW sign failed: ' + (err as Error).message };
    }
  }

  async function ensureHardwareSigningMetadata(message: Record<string, unknown>) {
    const wallet = state.wallet || {};
    let publicKey = message.publicKey as string || wallet.publicKey as string || null;
    let derivationPath = message.derivationPath as string || wallet.hardwareDerivationPath as string || null;
    let masterFingerprint = message.masterFingerprint as string || wallet.hardwareMasterFingerprint as string || null;

    const needsInfo = !masterFingerprint;
    const needsAddress = !publicKey || !derivationPath;
    const walletNetwork = wallet.network as string || 'xna';

    await NEURAI_UTILS.syncHardwareNetwork(hwDevice!, walletNetwork);

    if (needsInfo) {
      const info = hwDevice!.info || await hwDevice!.getInfo();
      masterFingerprint = info?.master_fingerprint || masterFingerprint;
    }
    if (needsAddress) {
      const addrResp = await hwDevice!.getAddress();
      publicKey = addrResp?.pubkey || publicKey;
      derivationPath = addrResp?.path || derivationPath;
    }

    if (publicKey && derivationPath && masterFingerprint && (
      wallet.publicKey !== publicKey ||
      wallet.hardwareDerivationPath !== derivationPath ||
      wallet.hardwareMasterFingerprint !== masterFingerprint
    )) {
      const nextWallet = {
        ...wallet,
        publicKey,
        hardwareDerivationPath: derivationPath,
        hardwareMasterFingerprint: masterFingerprint
      };
      await persistWallet(nextWallet);
    }

    return { publicKey, derivationPath, masterFingerprint };
  }

  async function fetchRawTxForUtxos(utxos: Array<{ txid: string; vout: number; sequence: number }>, rpcUrl: string) {
    const txids = [...new Set(utxos.map(u => u.txid).filter(Boolean))];
    const rawTxMap: Record<string, string> = {};
    for (const txid of txids) {
      try {
        const resp = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '1.0', id: 'hw-rawtx', method: 'getrawtransaction', params: [txid, 0] })
        });
        const data = await resp.json() as { result?: string };
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

  function calculateRawTransactionFeeSats(txHex: string, enrichedUtxos: Array<{ txid: string; vout: number; rawTxHex: string | null }>) {
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

  function getPrevoutDetailsFromRawTx(rawTxHex: string | null, vout: number) {
    if (!rawTxHex) return null;
    const output = parseRawTransactionOutputs(rawTxHex)[vout];
    if (!output) return null;
    return {
      satoshis: Number(output.value),
      scriptHex: output.scriptHex
    };
  }

  function parseSighashType(sighashType: unknown) {
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

  function estimateBase64Bytes(base64: unknown) {
    const normalized = String(base64 || '');
    if (!normalized) return 0;
    const padding = normalized.endsWith('==') ? 2 : (normalized.endsWith('=') ? 1 : 0);
    return Math.floor((normalized.length * 3) / 4) - padding;
  }

  function formatSatoshisToXna(satoshis: bigint | number) {
    return (Number(satoshis) / 1e8).toFixed(8);
  }

  function xnaToSatoshis(amount: number) {
    return Math.round(Number(amount || 0) * 1e8);
  }

  function satoshisToXna(amount: number) {
    return amount / 1e8;
  }

  function isLikelyBurnAddress(address: string) {
    const normalized = String(address || '').trim();
    if (!normalized) return false;
    return /^N[bB]/.test(normalized)
      || /^t[Bb]/.test(normalized)
      || /burn/i.test(normalized);
  }

  function logAuthScriptDebug(level: 'warn' | 'error', message: string, data?: unknown) {
    if (!DEBUG_AUTHSCRIPT_SIGN) return;
    if (level === 'error') {
      console.error(message, data);
      return;
    }
    console.warn(message, data);
  }

  function logAssetDebug(level: 'warn' | 'error', message: string, data?: unknown) {
    if (!DEBUG_ASSET_OPS) return;
    if (level === 'error') {
      console.error(message, data);
      return;
    }
    console.warn(message, data);
  }

  async function logBuiltAssetTransaction(
    rpc: (method: string, params: unknown[]) => Promise<unknown>,
    label: string,
    buildResult: NeuraiAssetsBuildResult,
    meta: Record<string, unknown>
  ) {
    if (!DEBUG_ASSET_OPS) return;

    let decoded: unknown = null;
    try {
      decoded = await rpc('decoderawtransaction', [buildResult.rawTx]);
    } catch (error) {
      decoded = {
        decodeError: error instanceof Error ? error.message : String(error)
      };
    }

    console.warn(label, {
      ...meta,
      inputs: buildResult.inputs,
      outputs: buildResult.outputs,
      fee: buildResult.fee,
      burnAmount: buildResult.burnAmount,
      rawTx: buildResult.rawTx,
      decoded
    });
  }

  function cloneAssetOutputs(outputs: NeuraiAssetsBuildResult['outputs']) {
    const normalized = Array.isArray(outputs)
      ? outputs
      : Object.entries(outputs || {}).map(([address, value]) => ({ [address]: value }));
    return normalized.map((output) => JSON.parse(JSON.stringify(output)) as Record<string, unknown>);
  }

  function normalizeAssetOutputEntries(outputs: NeuraiAssetsBuildResult['outputs'] | Array<Record<string, unknown>>) {
    const normalized = Array.isArray(outputs)
      ? outputs
      : Object.entries(outputs || {}).map(([address, value]) => ({ [address]: value }));

    return normalized.map((output) => {
      const [address, value] = Object.entries(output)[0] || ['', undefined];
      return {
        address: String(address || ''),
        value,
        output
      };
    });
  }

  function asObjectRecord(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`Invalid ${label} output while building local raw transaction.`);
    }
    return value as Record<string, unknown>;
  }

  function asStringValue(value: unknown): string {
    return String(value ?? '').trim();
  }

  function asOptionalStringValue(value: unknown): string | undefined {
    const normalized = asStringValue(value);
    return normalized || undefined;
  }

  function asBooleanFlag(value: unknown, fallback = false): boolean {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return fallback;
      if (normalized === '0' || normalized === 'false' || normalized === 'no') return false;
      return true;
    }
    return Boolean(value);
  }

  function asOptionalNumberValue(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  function asBigIntValue(value: unknown, label: string): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return BigInt(Math.trunc(value));
    }
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      throw new Error(`Missing ${label} while building local raw transaction.`);
    }
    return BigInt(normalized);
  }

  function logicalAssetQuantityToRaw(value: unknown, _units: number): bigint {
    // `asset_quantity` from NeuraiAssets outputs is already encoded in raw asset units.
    return asBigIntValue(value, 'asset quantity');
  }

  function toTxInputs(inputs: Array<{ txid: string; vout: number }>) {
    return inputs.map((input) => ({
      txid: input.txid,
      vout: input.vout
    }));
  }

  function resolveBurnOperationType(operationType: string) {
    switch (operationType) {
      case 'ISSUE_ROOT':
      case 'ISSUE_SUB':
      case 'ISSUE_UNIQUE':
      case 'ISSUE_DEPIN':
      case 'ISSUE_QUALIFIER':
      case 'ISSUE_SUB_QUALIFIER':
      case 'ISSUE_RESTRICTED':
      case 'REISSUE':
      case 'REISSUE_RESTRICTED':
        return operationType;
      case 'TAG_ADDRESSES':
        return 'TAG_ADDRESS';
      case 'UNTAG_ADDRESSES':
        return 'UNTAG_ADDRESS';
      default:
        return null;
    }
  }

  function findExpectedBurnAddress(
    entries: Array<{ address: string; value: unknown }>,
    operationType: string
  ) {
    const burnOperationType = resolveBurnOperationType(operationType);
    if (!burnOperationType) return undefined;

    const sampleAddress = entries.find((entry) => entry.address)?.address;
    if (!sampleAddress) return undefined;

    try {
      const network = NeuraiCreateTransaction.inferNetworkFromAnyAddress(sampleAddress);
      return NeuraiCreateTransaction.getBurnAddressForOperation(network, burnOperationType);
    } catch (_) {
      return undefined;
    }
  }

  function findXnaEnvelope(
    entries: Array<{ address: string; value: unknown }>,
    operationType: string
  ) {
    let burnAddress: string | undefined;
    let burnAmountSats: bigint | undefined;
    let xnaChangeAddress: string | undefined;
    let xnaChangeSats: bigint | undefined;
    const expectedBurnAddress = findExpectedBurnAddress(entries, operationType);

    for (const entry of entries) {
      if (typeof entry.value !== 'number') continue;
      if (entry.address === expectedBurnAddress || isLikelyBurnAddress(entry.address)) {
        burnAddress = entry.address;
        burnAmountSats = NeuraiCreateTransaction.xnaToSatoshis(Number(entry.value || 0));
        continue;
      }
      if (!xnaChangeAddress) {
        xnaChangeAddress = entry.address;
        xnaChangeSats = NeuraiCreateTransaction.xnaToSatoshis(Number(entry.value || 0));
      }
    }

    return { burnAddress, burnAmountSats, xnaChangeAddress, xnaChangeSats };
  }

  function findLogicalOutput(
    entries: ReturnType<typeof normalizeAssetOutputEntries>,
    key: string
  ): { address: string; payload: Record<string, unknown> } | null {
    for (const entry of entries) {
      if (!entry.value || typeof entry.value !== 'object' || Array.isArray(entry.value)) continue;
      const container = entry.value as Record<string, unknown>;
      const payload = container[key];
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        return {
          address: entry.address,
          payload: payload as Record<string, unknown>
        };
      }
    }
    return null;
  }

  function findTransferOutput(entries: ReturnType<typeof normalizeAssetOutputEntries>) {
    for (const entry of entries) {
      if (!entry.value || typeof entry.value !== 'object' || Array.isArray(entry.value)) continue;
      const container = entry.value as Record<string, unknown>;
      if (!container.transfer || typeof container.transfer !== 'object' || Array.isArray(container.transfer)) continue;
      const transfers = Object.entries(container.transfer as Record<string, unknown>);
      if (transfers.length === 0) continue;
      const [assetName, amount] = transfers[0];
      return {
        address: entry.address,
        assetName,
        amount
      };
    }
    return null;
  }

  function maybeIpfsHash(payload: Record<string, unknown>, flagKey: string, hashKey: string) {
    return asBooleanFlag(payload[flagKey], false)
      ? asOptionalStringValue(payload[hashKey])
      : asOptionalStringValue(payload[hashKey]);
  }

  async function resolveAssetUnits(
    rpc: ((method: string, params: unknown[]) => Promise<unknown>) | undefined,
    assetName: string,
    fallback = 0
  ): Promise<number> {
    const normalized = assetName.trim().toUpperCase();
    if (!normalized || !rpc) return fallback;
    if (localAssetUnitsCache.has(normalized)) {
      return localAssetUnitsCache.get(normalized) ?? fallback;
    }

    try {
      const raw = await rpc('getassetdata', [normalized]) as { units?: number } | null;
      const units = Number(raw?.units);
      if (Number.isFinite(units)) {
        localAssetUnitsCache.set(normalized, units);
        return units;
      }
    } catch (_) { }

    return fallback;
  }

  function inferLocalOperationTypeFromOutputs(outputs: NeuraiAssetsBuildResult['outputs'] | Array<Record<string, unknown>>) {
    const entries = normalizeAssetOutputEntries(outputs);
    if (findLogicalOutput(entries, 'issue_unique')) return 'ISSUE_UNIQUE';
    if (findLogicalOutput(entries, 'issue_restricted')) return 'ISSUE_RESTRICTED';
    if (findLogicalOutput(entries, 'issue_qualifier')) return 'ISSUE_QUALIFIER';
    if (findLogicalOutput(entries, 'reissue_restricted')) return 'REISSUE_RESTRICTED';
    if (findLogicalOutput(entries, 'reissue')) return 'REISSUE';
    if (findLogicalOutput(entries, 'tag_addresses')) return 'TAG_ADDRESSES';
    if (findLogicalOutput(entries, 'untag_addresses')) return 'UNTAG_ADDRESSES';
    if (findLogicalOutput(entries, 'freeze_addresses')) return 'FREEZE_ADDRESSES';
    if (findLogicalOutput(entries, 'unfreeze_addresses')) return 'UNFREEZE_ADDRESSES';
    if (findLogicalOutput(entries, 'freeze_asset')) return 'FREEZE_ASSET';
    if (findLogicalOutput(entries, 'unfreeze_asset')) return 'UNFREEZE_ASSET';

    const issue = findLogicalOutput(entries, 'issue');
    if (issue) {
      const issuePayload = issue.payload;
      const assetName = asStringValue(issuePayload.asset_name);
      if (assetName.startsWith('&')) return 'ISSUE_DEPIN';
      if (assetName.includes('/')) return 'ISSUE_SUB';
      return 'ISSUE_ROOT';
    }

    return null;
  }

  async function createLocalAssetRawTransaction(params: {
    operationType: string | null | undefined;
    inputs: Array<{ txid: string; vout: number }>;
    outputs: NeuraiAssetsBuildResult['outputs'] | Array<Record<string, unknown>>;
    localRawBuild?: NeuraiAssetsLocalRawBuild;
    rpc?: (method: string, params: unknown[]) => Promise<unknown>;
  }): Promise<string> {
    const entries = normalizeAssetOutputEntries(params.outputs);
    const operationType = params.localRawBuild?.operationType || params.operationType || inferLocalOperationTypeFromOutputs(params.outputs);
    if (!operationType) {
      throw new Error('Unable to infer asset operation type for local raw transaction creation.');
    }
    const txInputs = toTxInputs(params.inputs);
    const envelope = findXnaEnvelope(entries, operationType);

    if (params.localRawBuild) {
      const build: NeuraiAssetsLocalRawBuild = {
        operationType: params.localRawBuild.operationType,
        params: {
          ...params.localRawBuild.params,
          inputs: txInputs
        }
      };

      if (envelope.burnAddress && envelope.burnAmountSats !== undefined) {
        build.params.burnAddress = envelope.burnAddress;
        build.params.burnAmountSats = envelope.burnAmountSats;
      }

      if (envelope.xnaChangeAddress && envelope.xnaChangeSats !== undefined) {
        build.params.xnaChangeAddress = envelope.xnaChangeAddress;
        build.params.xnaChangeSats = envelope.xnaChangeSats;
      }

      return NeuraiCreateTransaction.createFromOperation(build).rawTx;
    }

    let build:
      | {
        operationType: string;
        params: Record<string, unknown>;
      }
      | null = null;

    switch (operationType) {
      case 'ISSUE_ROOT': {
        const operation = findLogicalOutput(entries, 'issue');
        if (!operation) throw new Error('Missing issue output for local root asset creation.');
        const payload = operation.payload;
        const units = Number(payload.units ?? 0);
        build = {
          operationType,
          params: {
            inputs: txInputs,
            burnAddress: envelope.burnAddress,
            burnAmountSats: envelope.burnAmountSats,
            xnaChangeAddress: envelope.xnaChangeAddress,
            xnaChangeSats: envelope.xnaChangeSats,
            toAddress: operation.address,
            assetName: asStringValue(payload.asset_name),
            quantityRaw: logicalAssetQuantityToRaw(payload.asset_quantity, units),
            units,
            reissuable: asBooleanFlag(payload.reissuable, true),
            ipfsHash: maybeIpfsHash(payload, 'has_ipfs', 'ipfs_hash')
          }
        };
        break;
      }

      case 'ISSUE_SUB': {
        const operation = findLogicalOutput(entries, 'issue');
        if (!operation) throw new Error('Missing issue output for local sub-asset creation.');
        const payload = operation.payload;
        const ownerTransfer = findTransferOutput(entries);
        const units = Number(payload.units ?? 0);
        build = {
          operationType,
          params: {
            inputs: txInputs,
            burnAddress: envelope.burnAddress,
            burnAmountSats: envelope.burnAmountSats,
            xnaChangeAddress: envelope.xnaChangeAddress,
            xnaChangeSats: envelope.xnaChangeSats,
            toAddress: operation.address,
            assetName: asStringValue(payload.asset_name),
            quantityRaw: logicalAssetQuantityToRaw(payload.asset_quantity, units),
            units,
            reissuable: asBooleanFlag(payload.reissuable, true),
            ipfsHash: maybeIpfsHash(payload, 'has_ipfs', 'ipfs_hash'),
            parentOwnerAddress: ownerTransfer?.address
          }
        };
        break;
      }

      case 'ISSUE_DEPIN': {
        const operation = findLogicalOutput(entries, 'issue');
        if (!operation) throw new Error('Missing issue output for local DePIN creation.');
        const payload = operation.payload;
        build = {
          operationType,
          params: {
            inputs: txInputs,
            burnAddress: envelope.burnAddress,
            burnAmountSats: envelope.burnAmountSats,
            xnaChangeAddress: envelope.xnaChangeAddress,
            xnaChangeSats: envelope.xnaChangeSats,
            toAddress: operation.address,
            assetName: asStringValue(payload.asset_name),
            quantityRaw: logicalAssetQuantityToRaw(payload.asset_quantity, 0),
            reissuable: asBooleanFlag(payload.reissuable, true),
            ipfsHash: maybeIpfsHash(payload, 'has_ipfs', 'ipfs_hash')
          }
        };
        break;
      }

      case 'ISSUE_UNIQUE': {
        const operation = findLogicalOutput(entries, 'issue_unique');
        if (!operation) throw new Error('Missing issue_unique output for local NFT creation.');
        const payload = operation.payload;
        build = {
          operationType,
          params: {
            inputs: txInputs,
            burnAddress: envelope.burnAddress,
            burnAmountSats: envelope.burnAmountSats,
            xnaChangeAddress: envelope.xnaChangeAddress,
            xnaChangeSats: envelope.xnaChangeSats,
            toAddress: operation.address,
            rootName: asStringValue(payload.root_name),
            assetTags: Array.isArray(payload.asset_tags) ? payload.asset_tags.map((entry) => asStringValue(entry)).filter(Boolean) : [],
            ipfsHashes: Array.isArray(payload.ipfs_hashes)
              ? payload.ipfs_hashes.map((entry) => asOptionalStringValue(entry))
              : undefined
          }
        };
        break;
      }

      case 'ISSUE_QUALIFIER':
      case 'ISSUE_SUB_QUALIFIER': {
        const operation = findLogicalOutput(entries, 'issue_qualifier');
        if (!operation) throw new Error('Missing issue_qualifier output for local qualifier creation.');
        const payload = operation.payload;
        const changeQuantity = asOptionalNumberValue(payload.change_quantity);
        build = {
          operationType,
          params: {
            inputs: txInputs,
            burnAddress: envelope.burnAddress,
            burnAmountSats: envelope.burnAmountSats,
            xnaChangeAddress: envelope.xnaChangeAddress,
            xnaChangeSats: envelope.xnaChangeSats,
            toAddress: operation.address,
            assetName: asStringValue(payload.asset_name),
            quantityRaw: logicalAssetQuantityToRaw(payload.asset_quantity, 0),
            ipfsHash: maybeIpfsHash(payload, 'has_ipfs', 'ipfs_hash'),
            rootChangeAddress: asOptionalStringValue(payload.root_change_address),
            changeQuantityRaw: changeQuantity !== undefined
              ? NeuraiCreateTransaction.assetUnitsToRaw(changeQuantity)
              : undefined
          }
        };
        break;
      }

      case 'ISSUE_RESTRICTED': {
        const operation = findLogicalOutput(entries, 'issue_restricted');
        if (!operation) throw new Error('Missing issue_restricted output for local restricted creation.');
        const payload = operation.payload;
        const units = Number(payload.units ?? 0);
        build = {
          operationType,
          params: {
            inputs: txInputs,
            burnAddress: envelope.burnAddress,
            burnAmountSats: envelope.burnAmountSats,
            xnaChangeAddress: envelope.xnaChangeAddress,
            xnaChangeSats: envelope.xnaChangeSats,
            toAddress: operation.address,
            assetName: asStringValue(payload.asset_name),
            quantityRaw: logicalAssetQuantityToRaw(payload.asset_quantity, units),
            verifierString: asStringValue(payload.verifier_string),
            units,
            reissuable: asBooleanFlag(payload.reissuable, true),
            ipfsHash: maybeIpfsHash(payload, 'has_ipfs', 'ipfs_hash'),
            ownerChangeAddress: asOptionalStringValue(payload.owner_change_address)
          }
        };
        break;
      }

      case 'REISSUE': {
        const operation = findLogicalOutput(entries, 'reissue');
        if (!operation) throw new Error('Missing reissue output for local asset reissue.');
        const payload = operation.payload;
        const assetName = asStringValue(payload.asset_name);
        const units = await resolveAssetUnits(params.rpc, assetName, 0);
        build = {
          operationType,
          params: {
            inputs: txInputs,
            burnAddress: envelope.burnAddress,
            burnAmountSats: envelope.burnAmountSats,
            xnaChangeAddress: envelope.xnaChangeAddress,
            xnaChangeSats: envelope.xnaChangeSats,
            toAddress: operation.address,
            assetName,
            quantityRaw: logicalAssetQuantityToRaw(payload.asset_quantity, units),
            units,
            reissuable: payload.reissuable === undefined ? undefined : asBooleanFlag(payload.reissuable, true),
            ipfsHash: asOptionalStringValue(payload.ipfs_hash),
            ownerChangeAddress: asOptionalStringValue(payload.owner_change_address)
          }
        };
        break;
      }

      case 'REISSUE_RESTRICTED': {
        const operation = findLogicalOutput(entries, 'reissue_restricted');
        if (!operation) throw new Error('Missing reissue_restricted output for local restricted reissue.');
        const payload = operation.payload;
        const assetName = asStringValue(payload.asset_name);
        const units = await resolveAssetUnits(params.rpc, assetName, 0);
        build = {
          operationType,
          params: {
            inputs: txInputs,
            burnAddress: envelope.burnAddress,
            burnAmountSats: envelope.burnAmountSats,
            xnaChangeAddress: envelope.xnaChangeAddress,
            xnaChangeSats: envelope.xnaChangeSats,
            toAddress: operation.address,
            assetName,
            quantityRaw: logicalAssetQuantityToRaw(payload.asset_quantity, units),
            units,
            verifierString: asOptionalStringValue(payload.verifier_string),
            reissuable: payload.reissuable === undefined ? undefined : asBooleanFlag(payload.reissuable, true),
            ipfsHash: asOptionalStringValue(payload.ipfs_hash),
            ownerChangeAddress: asOptionalStringValue(payload.owner_change_address)
          }
        };
        break;
      }

      case 'TAG_ADDRESSES':
      case 'UNTAG_ADDRESSES': {
        const operation = findLogicalOutput(entries, operationType === 'UNTAG_ADDRESSES' ? 'untag_addresses' : 'tag_addresses');
        if (!operation) throw new Error('Missing tag/untag output for local qualifier assignment.');
        const payload = operation.payload;
        const changeQuantity = asOptionalNumberValue(payload.change_quantity) ?? 0;
        build = {
          operationType,
          params: {
            inputs: txInputs,
            qualifierName: asStringValue(payload.qualifier),
            targetAddresses: Array.isArray(payload.addresses) ? payload.addresses.map((entry) => asStringValue(entry)).filter(Boolean) : [],
            burnAddress: envelope.burnAddress || operation.address,
            burnAmountSats: envelope.burnAmountSats ?? 0n,
            xnaChangeAddress: envelope.xnaChangeAddress || operation.address,
            xnaChangeSats: envelope.xnaChangeSats ?? 0n,
            qualifierChangeAddress: operation.address,
            qualifierChangeAmountRaw: NeuraiCreateTransaction.assetUnitsToRaw(changeQuantity),
            nullAssetDestinationMode: AUTHSCRIPT_NULL_ASSET_MODE
          }
        };
        break;
      }

      case 'FREEZE_ADDRESSES':
      case 'UNFREEZE_ADDRESSES': {
        const operation = findLogicalOutput(entries, operationType === 'UNFREEZE_ADDRESSES' ? 'unfreeze_addresses' : 'freeze_addresses');
        if (!operation) throw new Error('Missing freeze/unfreeze address output for local creation.');
        const payload = operation.payload;
        build = {
          operationType,
          params: {
            inputs: txInputs,
            assetName: asStringValue(payload.asset_name),
            targetAddresses: Array.isArray(payload.addresses) ? payload.addresses.map((entry) => asStringValue(entry)).filter(Boolean) : [],
            ownerChangeAddress: operation.address,
            xnaChangeAddress: envelope.xnaChangeAddress,
            xnaChangeSats: envelope.xnaChangeSats,
            nullAssetDestinationMode: AUTHSCRIPT_NULL_ASSET_MODE
          }
        };
        break;
      }

      case 'FREEZE_ASSET':
      case 'UNFREEZE_ASSET': {
        const operation = findLogicalOutput(entries, operationType === 'UNFREEZE_ASSET' ? 'unfreeze_asset' : 'freeze_asset');
        if (!operation) throw new Error('Missing freeze/unfreeze asset output for local creation.');
        const payload = operation.payload;
        build = {
          operationType,
          params: {
            inputs: txInputs,
            assetName: asStringValue(payload.asset_name),
            ownerChangeAddress: operation.address,
            xnaChangeAddress: envelope.xnaChangeAddress,
            xnaChangeSats: envelope.xnaChangeSats
          }
        };
        break;
      }

      default:
        throw new Error(`Unsupported local asset operation: ${operationType}`);
    }

    if (!build) {
      throw new Error(`Unable to build local asset operation: ${operationType}`);
    }

    return NeuraiCreateTransaction.createFromOperation(build).rawTx;
  }

  function createNeuraiAssetsClient(
    rpc: (method: string, params: unknown[]) => Promise<unknown>,
    config: NeuraiAssetsConfig
  ): NeuraiAssets {
    const instance = new NeuraiAssets(rpc, config) as NeuraiAssets & {
      rpc: (method: string, params: unknown[]) => Promise<unknown>;
      __localCreateTransactionOperationType?: string;
      [key: string]: unknown;
    };

    const originalRpc = instance.rpc.bind(instance);
    instance.rpc = async (method: string, params: unknown[]) => {
      if (method === 'createrawtransaction') {
        const [inputs, outputs] = Array.isArray(params) ? params : [];
        return createLocalAssetRawTransaction({
          operationType: instance.__localCreateTransactionOperationType,
          inputs: Array.isArray(inputs) ? inputs as Array<{ txid: string; vout: number }> : [],
          outputs: Array.isArray(outputs) ? outputs as Array<Record<string, unknown>> : [],
          rpc
        });
      }
      return originalRpc(method, params);
    };

    const wrapOperationMethod = (
      methodName: string,
      resolver: string | ((params: Record<string, unknown>) => string)
    ) => {
      const original = instance[methodName];
      if (typeof original !== 'function') return;
      instance[methodName] = async (params: Record<string, unknown>) => {
        const previous = instance.__localCreateTransactionOperationType;
        instance.__localCreateTransactionOperationType = typeof resolver === 'function' ? resolver(params || {}) : resolver;
        try {
          return await (original as (params: Record<string, unknown>) => Promise<unknown>).call(instance, params);
        } finally {
          instance.__localCreateTransactionOperationType = previous;
        }
      };
    };

    wrapOperationMethod('createRootAsset', 'ISSUE_ROOT');
    wrapOperationMethod('createSubAsset', 'ISSUE_SUB');
    wrapOperationMethod('createDepinAsset', 'ISSUE_DEPIN');
    wrapOperationMethod('createUniqueAssets', 'ISSUE_UNIQUE');
    wrapOperationMethod('createQualifier', (params) => {
      const qualifierName = asStringValue(params.qualifierName);
      return qualifierName.includes('/') ? 'ISSUE_SUB_QUALIFIER' : 'ISSUE_QUALIFIER';
    });
    wrapOperationMethod('createRestrictedAsset', 'ISSUE_RESTRICTED');
    wrapOperationMethod('reissueAsset', 'REISSUE');
    wrapOperationMethod('tagAddresses', 'TAG_ADDRESSES');
    wrapOperationMethod('untagAddresses', 'UNTAG_ADDRESSES');
    wrapOperationMethod('reissueRestrictedAsset', 'REISSUE_RESTRICTED');
    wrapOperationMethod('freezeAddresses', 'FREEZE_ADDRESSES');
    wrapOperationMethod('unfreezeAddresses', 'UNFREEZE_ADDRESSES');
    wrapOperationMethod('freezeAssetGlobally', 'FREEZE_ASSET');
    wrapOperationMethod('unfreezeAssetGlobally', 'UNFREEZE_ASSET');

    return instance;
  }

  async function rebuildAssetTxWithExtraFee(
    buildResult: NeuraiAssetsBuildResult,
    walletAddress: string,
    additionalFeeSats: number,
    rpc: (method: string, params: unknown[]) => Promise<unknown>
  ): Promise<NeuraiAssetsBuildResult> {
    if (additionalFeeSats <= 0) return buildResult;

    const adjustedOutputs = cloneAssetOutputs(buildResult.outputs);
    let changeIndex = adjustedOutputs.findIndex((output) => {
      const [address, value] = Object.entries(output)[0] || [];
      return typeof value === 'number' && address === walletAddress && !isLikelyBurnAddress(address);
    });

    if (changeIndex < 0) {
      changeIndex = adjustedOutputs.findIndex((output) => {
        const [address, value] = Object.entries(output)[0] || [];
        return typeof value === 'number' && !isLikelyBurnAddress(address);
      });
    }

    if (changeIndex < 0) {
      throw new Error('Unable to increase AuthScript relay fee automatically: change output not found.');
    }

    const [changeAddress, changeValueRaw] = Object.entries(adjustedOutputs[changeIndex])[0] as [string, unknown];
    const currentChangeSats = xnaToSatoshis(Number(changeValueRaw || 0));
    const updatedChangeSats = currentChangeSats - additionalFeeSats;
    if (updatedChangeSats <= 0) {
      throw new Error('Not enough XNA change available to raise the AuthScript relay fee.');
    }

    adjustedOutputs[changeIndex] = { [changeAddress]: satoshisToXna(updatedChangeSats) };

    const rawTx = await createLocalAssetRawTransaction({
      operationType: buildResult.operationType,
      inputs: buildResult.inputs.map((input) => ({ txid: input.txid, vout: input.vout })),
      outputs: adjustedOutputs,
      localRawBuild: buildResult.localRawBuild,
      rpc
    });

    const updatedFeeSats = xnaToSatoshis(buildResult.fee) + additionalFeeSats;
    return {
      ...buildResult,
      rawTx,
      outputs: adjustedOutputs,
      fee: satoshisToXna(updatedFeeSats)
    };
  }

  async function ensureAuthScriptAssetRelayFee(
    buildResult: NeuraiAssetsBuildResult,
    signedHex: string,
    walletAddress: string,
    rpcUrl: string,
    rpc: (method: string, params: unknown[]) => Promise<unknown>,
    contextLabel = 'asset-tx'
  ) {
    let currentBuildResult = buildResult;
    let currentSignedHex = signedHex;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const decoded = await rpc('decoderawtransaction', [currentSignedHex]) as {
        vsize?: number;
        size?: number;
        weight?: number;
      } | null;
      const vsize = Math.max(
        Number(decoded?.vsize || 0),
        Number(decoded?.size || 0),
        Math.ceil(Number(decoded?.weight || 0) / 4)
      );
      if (!Number.isFinite(vsize) || vsize <= 0) return { buildResult: currentBuildResult, signedHex: currentSignedHex };

      const feeEstimate = await rpc('estimatesmartfee', [6]).catch(() => null) as { feerate?: number } | null;
      const feeRate = Math.max(Number(feeEstimate?.feerate || 0), 0.015);
      const requiredFeeSats = Math.ceil((vsize / 1000) * feeRate * 1e8 * 1.1);
      const currentFeeSats = xnaToSatoshis(currentBuildResult.fee);

      if (currentFeeSats >= requiredFeeSats) {
        return { buildResult: currentBuildResult, signedHex: currentSignedHex };
      }

      const additionalFeeSats = requiredFeeSats - currentFeeSats;
      logAuthScriptDebug('warn', `[${contextLabel}][authscript-fee] Rebuilding AuthScript asset transaction with higher relay fee`, {
        walletAddress,
        vsize,
        feeRate,
        currentFeeXna: currentBuildResult.fee,
        requiredFeeXna: satoshisToXna(requiredFeeSats),
        additionalFeeXna: satoshisToXna(additionalFeeSats)
      });

      currentBuildResult = await rebuildAssetTxWithExtraFee(
        currentBuildResult,
        walletAddress,
        additionalFeeSats,
        rpc
      );
      currentSignedHex = await signRawTx(currentBuildResult.rawTx, rpcUrl);
    }

    return { buildResult: currentBuildResult, signedHex: currentSignedHex };
  }

  // ── Create Asset ───────────────────────────────────────────────────────────

  function buildRpcFn(network: string): (method: string, params: unknown[]) => Promise<unknown> {
    const url = NEURAI_UTILS.isTestnetNetwork(network)
      ? (state.settings.rpcTestnet || C.RPC_URL_TESTNET)
      : (state.settings.rpcMainnet || C.RPC_URL);
    return async (method: string, params: unknown[]): Promise<unknown> => {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '1.0', id: 'neurai-assets', method, params })
      });
      const data = await resp.json() as { result?: unknown; error?: { message: string } | string };
      if (data.error) {
        const msg = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
        throw new Error(msg);
      }
      return data.result;
    };
  }

  function renderVerifierPreview() {
    const value = elements.caVerifier!.value.trim();
    elements.caVerifierPreview!.textContent = value || 'No verifier selected';
    elements.caVerifierPreview!.classList.toggle('is-empty', !value);
  }

  function appendVerifierToken(token: string) {
    const normalizedToken = token.trim().toUpperCase();
    if (!normalizedToken) return;

    const current = elements.caVerifier!.value.trim();
    const endsWithOperator = /(?:^|[\s(])(?:&|\|)$/.test(current) || /!$/.test(current);
    const nextValue = current
      ? (endsWithOperator ? `${current} ${normalizedToken}` : `${current} & ${normalizedToken}`)
      : normalizedToken;

    elements.caVerifier!.value = nextValue.trim();
    renderVerifierPreview();
  }

  function appendVerifierOperator(operator: '&' | '|') {
    const current = elements.caVerifier!.value.trim();
    if (!current || /(?:&|\||!)$/.test(current)) return;
    elements.caVerifier!.value = `${current} ${operator}`;
    renderVerifierPreview();
  }

  function parseUniqueAddresses(rawAddresses: string): string[] {
    return [...new Set(
      rawAddresses
        .split(/\r?\n/)
        .map((address) => address.trim())
        .filter(Boolean)
    )];
  }

  function isAuthScriptAddress(address: string): boolean {
    const normalized = String(address || '').trim().toLowerCase();
    return normalized.startsWith('nq1') || normalized.startsWith('tnq1');
  }

  async function checkQualifierAssigned(
    neuraiAssets: NeuraiAssets,
    rpc: (method: string, params: unknown[]) => Promise<unknown>,
    address: string,
    qualifierName: string
  ): Promise<boolean> {
    try {
      if (await neuraiAssets.checkAddressTag(address, qualifierName)) {
        return true;
      }
    } catch (_) { }

    try {
      const listedTags = await rpc('listtagsforaddress', [address]) as unknown;
      const tags = Array.isArray(listedTags)
        ? listedTags
        : (listedTags && typeof listedTags === 'object' ? Object.keys(listedTags as Record<string, unknown>) : []);
      return tags.some((tag) => String(tag).toUpperCase() === qualifierName.toUpperCase());
    } catch (_) {
      return false;
    }
  }

  function normalizeQualifierTags(raw: unknown): string[] {
    const tags = Array.isArray(raw)
      ? raw
      : (raw && typeof raw === 'object' ? Object.keys(raw as Record<string, unknown>) : []);
    return tags
      .map((tag) => String(tag || '').trim().toUpperCase())
      .filter((tag) => tag.startsWith('#'));
  }

  async function callRpcUrl<T = unknown>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '1.0',
        id: `${method}-debug`,
        method,
        params
      })
    });
    const text = await response.text();
    if (!text) {
      throw new Error(`Empty RPC response for ${method}`);
    }
    const data = JSON.parse(text) as {
      result?: T;
      error?: { message?: string; data?: unknown } | string;
    };
    if (data.error) {
      const msg = typeof data.error === 'string'
        ? data.error
        : data.error.message || String(data.error.data || `RPC ${method} failed`);
      throw new Error(msg);
    }
    return data.result as T;
  }

  function extractTagOperation(buildResult: NeuraiAssetsBuildResult | null | undefined) {
    const outputs = Array.isArray(buildResult?.outputs)
      ? buildResult?.outputs as Array<Record<string, unknown>>
      : Object.entries((buildResult?.outputs || {}) as Record<string, unknown>).map(([address, value]) => ({ [address]: value }));

    for (const output of outputs) {
      const value = Object.values(output)[0] as Record<string, unknown> | undefined;
      if (!value || typeof value !== 'object') continue;

      const tagOp = value.tag_addresses as Record<string, unknown> | undefined;
      if (tagOp) {
        return {
          type: 'TAG' as const,
          qualifierName: String(tagOp.qualifier || ''),
          addresses: Array.isArray(tagOp.addresses) ? tagOp.addresses.map((entry) => String(entry || '').trim()).filter(Boolean) : []
        };
      }

      const untagOp = value.untag_addresses as Record<string, unknown> | undefined;
      if (untagOp) {
        return {
          type: 'UNTAG' as const,
          qualifierName: String(untagOp.qualifier || ''),
          addresses: Array.isArray(untagOp.addresses) ? untagOp.addresses.map((entry) => String(entry || '').trim()).filter(Boolean) : []
        };
      }
    }

    return null;
  }

  async function buildTagRejectDiagnostics(
    rpcUrl: string,
    buildResult: NeuraiAssetsBuildResult | null | undefined
  ): Promise<string | null> {
    const tagOperation = extractTagOperation(buildResult);
    if (!tagOperation || !tagOperation.qualifierName || tagOperation.addresses.length === 0) {
      return null;
    }

    try {
      const [addressesForTag, checkResults] = await Promise.all([
        callRpcUrl<string[]>(rpcUrl, 'listaddressesfortag', [tagOperation.qualifierName]).catch(() => []),
        Promise.all(
          tagOperation.addresses.map(async (target) => ({
            target,
            hasTag: await callRpcUrl<boolean>(rpcUrl, 'checkaddresstag', [target, tagOperation.qualifierName]).catch(() => false)
          }))
        )
      ]);

      const authScriptTargets = tagOperation.addresses.filter(isAuthScriptAddress);
      const checksSummary = checkResults
        .map((entry) => `${entry.target}=${entry.hasTag ? 'true' : 'false'}`)
        .join(', ');
      const listedSummary = addressesForTag.length ? addressesForTag.join(', ') : '[]';
      const authScriptNote = authScriptTargets.length
        ? ` AuthScript targets in tx: ${authScriptTargets.join(', ')}.`
        : '';

      return `Node diagnostics for ${tagOperation.type} ${tagOperation.qualifierName}: `
        + `checkaddresstag => ${checksSummary}; `
        + `listaddressesfortag => ${listedSummary}.${authScriptNote}`;
    } catch (error) {
      return `Unable to load node diagnostics: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  function appendSelectedVerifier(negated = false) {
    const selected = elements.caVerifierSelect!.value.trim().toUpperCase();
    if (!selected) return;
    appendVerifierToken(negated ? `!${selected}` : selected);
  }

  async function loadAvailableVerifierTags() {
    const select = elements.caVerifierSelect!;
    const hint = elements.caVerifierHint!;
    select.innerHTML = '<option value="">-- Select qualifier tag --</option>';
    hint.textContent = 'Loading qualifier tags…';
    elements.caLoadVerifiersBtn!.disabled = true;

    try {
      const wallet = state.wallet as Record<string, unknown> | null;
      if (!wallet?.address) {
        hint.textContent = 'No wallet loaded.';
        return;
      }

      const network = (wallet.network as string) || 'xna';
      const address = wallet.address as string;
      const rpc = buildRpcFn(network);
      const neuraiAssets = createNeuraiAssetsClient(rpc, {
        network,
        addresses: [address],
        changeAddress: address,
        toAddress: address,
      });

      const [linkedTagsRaw, balances] = await Promise.all([
        neuraiAssets.listTagsForAddress(address).catch(() => rpc('listtagsforaddress', [address]).catch(() => [])),
        rpc('listassetbalancesbyaddress', [address]).catch(() => ({})),
      ]);

      const linkedTags = normalizeQualifierTags(linkedTagsRaw);
      const ownedQualifierAssets = Object.entries((balances || {}) as Record<string, number>)
        .filter(([name, amount]) => name.startsWith('#') && !name.endsWith('!') && Number(amount) > 0)
        .map(([name]) => name.toUpperCase());

      const availableTags = [...new Set([...linkedTags, ...ownedQualifierAssets])].sort();

      if (availableTags.length === 0) {
        hint.textContent = 'No qualifier assets or linked tags found for this account.';
        return;
      }

      availableTags.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
      });

      const linkedCount = linkedTags.length;
      const ownedCount = ownedQualifierAssets.filter(name => !linkedTags.includes(name)).length;
      hint.textContent = `${availableTags.length} qualifier tag${availableTags.length !== 1 ? 's' : ''} available`
        + (linkedCount || ownedCount ? ` (${linkedCount} linked${ownedCount ? `, ${ownedCount} owned` : ''})` : '');
    } catch (err) {
      hint.textContent = 'Failed to load: ' + (err as Error).message;
    } finally {
      elements.caLoadVerifiersBtn!.disabled = false;
    }
  }

  async function loadRestrictedBaseAssets() {
    const select = elements.caRestrictedBaseSelect!;
    const hint = elements.caRestrictedBaseHint!;
    select.innerHTML = '<option value="">-- Select root asset --</option>';
    hint.textContent = 'Loading root assets…';
    elements.caLoadRestrictedBasesBtn!.disabled = true;

    try {
      const wallet = state.wallet as Record<string, unknown> | null;
      if (!wallet?.address) {
        hint.textContent = 'No wallet loaded.';
        return;
      }

      const network = (wallet.network as string) || 'xna';
      const address = wallet.address as string;
      const rpc = buildRpcFn(network);
      const balances = await rpc('listassetbalancesbyaddress', [address]) as Record<string, number> | null;

      const baseAssets = balances
        ? Object.keys(balances)
            .filter(name => name.endsWith('!') && balances[name] > 0)
            .map(name => name.slice(0, -1))
            .filter(name => !name.startsWith('#') && !name.startsWith('$') && !name.includes('/') && !name.includes('#'))
        : [];

      const selectableAssets = [...new Set(baseAssets)].sort();

      if (selectableAssets.length === 0) {
        hint.textContent = 'No root assets found that you can convert to restricted.';
        return;
      }

      selectableAssets.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = `${name} -> $${name}`;
        select.appendChild(opt);
      });

      hint.textContent = `${selectableAssets.length} root asset${selectableAssets.length !== 1 ? 's' : ''} available for restricted issuance`;
    } catch (err) {
      hint.textContent = 'Failed to load: ' + (err as Error).message;
    } finally {
      elements.caLoadRestrictedBasesBtn!.disabled = false;
    }
  }

  function tokenizeVerifier(verifierString: string) {
    const normalized = verifierString.trim().toUpperCase();
    const tokenPattern = /\s*(!?#[A-Z0-9_/]+|[()&|])\s*/gy;
    const tokens: string[] = [];
    let lastIndex = 0;

    while (lastIndex < normalized.length) {
      tokenPattern.lastIndex = lastIndex;
      const match = tokenPattern.exec(normalized);
      if (!match) {
        throw new Error(`Invalid verifier token near: "${normalized.slice(lastIndex)}"`);
      }
      tokens.push(match[1]);
      lastIndex = tokenPattern.lastIndex;
    }

    return tokens;
  }

  function evaluateVerifierAgainstTags(verifierString: string, addressTags: string[]) {
    const tags = new Set(addressTags.map(tag => String(tag || '').trim().toUpperCase()).filter(Boolean));
    const tokens = tokenizeVerifier(verifierString);
    let index = 0;

    function parseExpression(): boolean {
      let value = parseTerm();
      while (tokens[index] === '|') {
        index += 1;
        value = value || parseTerm();
      }
      return value;
    }

    function parseTerm(): boolean {
      let value = parseFactor();
      while (tokens[index] === '&') {
        index += 1;
        value = value && parseFactor();
      }
      return value;
    }

    function parseFactor(): boolean {
      const token = tokens[index];
      if (!token) throw new Error('Unexpected end of verifier expression');

      if (token === '(') {
        index += 1;
        const value = parseExpression();
        if (tokens[index] !== ')') throw new Error('Unbalanced parentheses in verifier expression');
        index += 1;
        return value;
      }

      if (token.startsWith('!#')) {
        index += 1;
        return !tags.has(token.slice(1));
      }

      if (token.startsWith('#')) {
        index += 1;
        return tags.has(token);
      }

      throw new Error(`Unsupported verifier token: ${token}`);
    }

    const result = parseExpression();
    if (index !== tokens.length) {
      throw new Error(`Unexpected verifier token: ${tokens[index]}`);
    }
    return result;
  }

  function explainSimpleVerifierFailure(verifierString: string, addressTags: string[]) {
    const normalized = verifierString.trim().toUpperCase();
    const tags = new Set(addressTags.map(tag => String(tag || '').trim().toUpperCase()).filter(Boolean));

    if (/^#[A-Z0-9_/]+$/.test(normalized)) {
      return tags.has(normalized) ? null : `Missing tag: ${normalized}`;
    }

    const negated = normalized.match(/^!#([A-Z0-9_/]+)$/);
    if (negated) {
      const tag = `#${negated[1]}`;
      return tags.has(tag) ? `Address has forbidden tag: ${tag}` : null;
    }

    return null;
  }

  function updateCreateAssetUI() {
    const type = state.createAssetType;
    const isSub = type === 'SUB';
    const isUnique = type === 'UNIQUE';
    const isQualifier = type === 'QUALIFIER';
    const isRestricted = type === 'RESTRICTED';
    const isDepin = type === 'DEPIN';
    const isReissue = type === 'REISSUE';
    const needsParent = isSub || isUnique || isReissue;
    const usesAssetNameInput = !needsParent && !isRestricted;

    // Tab active state
    elements.assetTypeTabs!.querySelectorAll('.asset-type-tab').forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.type === type);
    });

    // Asset name field: hidden when type uses parent selector instead
    elements.caAssetNameGroup!.classList.toggle('hidden', !usesAssetNameInput);

    // Parent selector: shown for SUB, UNIQUE, and REISSUE
    elements.caParentSelectGroup!.classList.toggle('hidden', !needsParent);
    elements.caRestrictedBaseGroup!.classList.toggle('hidden', !isRestricted);
    elements.caSubNameGroup!.classList.toggle('hidden', !isSub);
    elements.caTagGroup!.classList.toggle('hidden', !isUnique);

    if (isSub) {
      elements.caParentSelectLabel!.textContent = 'Parent Asset';
      elements.caParentSelectHint!.textContent = 'Select the owner token (ASSET!) you control';
    } else if (isUnique) {
      elements.caParentSelectLabel!.textContent = 'Root Asset';
      elements.caParentSelectHint!.textContent = 'Select the root asset (ASSET!) you control';
    } else if (isReissue) {
      elements.caParentSelectLabel!.textContent = 'Asset to Reissue';
      elements.caParentSelectHint!.textContent = 'Select the owner token of the asset to mint more';
    }

    // Quantity: hidden for UNIQUE
    elements.caQuantityGroup!.classList.toggle('hidden', isUnique);
    elements.caQuantityLabel!.textContent = isReissue ? 'Additional Quantity' : 'Quantity';

    // Units: hidden for QUALIFIER, UNIQUE, DEPIN, REISSUE (units can't change on reissue)
    elements.caUnitsGroup!.classList.toggle('hidden', isQualifier || isUnique || isDepin || isReissue);
    if (isDepin) elements.caUnits!.value = '0';

    // Reissuable: hidden for QUALIFIER and UNIQUE; label changes for REISSUE
    elements.caReissuableGroup!.classList.toggle('hidden', isQualifier || isUnique);
    if (isReissue) {
      elements.caReissuable!.checked = true; // default: keep reissuable
      elements.caReissuableLabel!.textContent = 'Keep reissuable (uncheck to lock supply permanently)';
    } else {
      elements.caReissuableLabel!.textContent = 'Reissuable — can mint more supply later';
    }

    // Verifier: only for RESTRICTED
    elements.caVerifierGroup!.classList.toggle('hidden', !isRestricted);
    if (isRestricted && elements.caVerifierSelect!.options.length <= 1) {
      loadAvailableVerifierTags();
    }
    if (isRestricted && elements.caRestrictedBaseSelect!.options.length <= 1) {
      loadRestrictedBaseAssets();
    }

    // Button label
    elements.caCreateBtn!.textContent = isReissue ? 'Reissue Asset' : 'Create Asset';

    // Placeholders and hints per type
    if (type === 'ROOT') {
      elements.caAssetName!.placeholder = 'MYTOKEN';
      elements.caAssetNameHint!.textContent = '3–30 uppercase letters, numbers, _ or .';
    } else if (type === 'QUALIFIER') {
      elements.caAssetName!.placeholder = 'MYKYCTOKEN';
      elements.caAssetNameHint!.textContent = 'Name without # prefix — e.g. KYC_VERIFIED';
      elements.caQuantity!.max = '10';
      elements.caQuantity!.placeholder = '1';
    } else if (type === 'DEPIN') {
      elements.caAssetName!.placeholder = '&DEVICE/ROUTER001';
      elements.caAssetNameHint!.textContent = 'Use &NAME or &ROOT/SUB. DePIN assets always use 0 decimals.';
      elements.caQuantity!.placeholder = '1';
    } else if (type === 'RESTRICTED') {
      elements.caRestrictedBaseHint!.textContent = 'Select the root asset you control; the addon will issue its restricted form as $ASSET.';
    }

    // Reset quantity limits when leaving QUALIFIER
    if (!isQualifier) {
      elements.caQuantity!.max = '21000000000';
      if (!isDepin) elements.caQuantity!.placeholder = '1000000';
    }

    elements.caAssetName!.dispatchEvent(new Event('input'));

    // Fee display
    const fee = ASSET_FEES[type] ?? 1000;
    elements.caFeeValue!.textContent = `${fee} XNA`;
  }

  async function getDecryptedWif(): Promise<string | null> {
    const wallet = state.wallet as Record<string, unknown> | null;
    if (!wallet) return null;
    if (wallet.walletType === 'hardware') return null;
    if (wallet.privateKey) return wallet.privateKey as string;
    if (wallet.privateKeyEnc) {
      const pin = state.sessionPin;
      if (!pin) return null;
      try {
        return await NEURAI_UTILS.decryptTextWithPin(
          wallet.privateKeyEnc as Parameters<typeof NEURAI_UTILS.decryptTextWithPin>[0],
          pin
        );
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  async function getDecryptedPQSeedKey(): Promise<string | null> {
    const wallet = state.wallet as Record<string, unknown> | null;
    if (!wallet || wallet.walletType === 'hardware') return null;

    if (wallet.seedKey) return wallet.seedKey as string;
    if (wallet.seedKeyEnc) {
      const pin = state.sessionPin;
      if (!pin) return null;
      try {
        return await NEURAI_UTILS.decryptTextWithPin(
          wallet.seedKeyEnc as Parameters<typeof NEURAI_UTILS.decryptTextWithPin>[0],
          pin
        );
      } catch (_) {
        return null;
      }
    }

    let mnemonic = wallet.mnemonic as string || '';
    if (!mnemonic && wallet.mnemonicEnc) {
      const pin = state.sessionPin;
      if (!pin) return null;
      try {
        mnemonic = await NEURAI_UTILS.decryptTextWithPin(
          wallet.mnemonicEnc as Parameters<typeof NEURAI_UTILS.decryptTextWithPin>[0],
          pin
        );
      } catch (_) {
        return null;
      }
    }
    if (!mnemonic) return null;

    let passphrase = wallet.passphrase as string || '';
    if (!passphrase && wallet.passphraseEnc) {
      const pin = state.sessionPin;
      if (!pin) return null;
      try {
        passphrase = await NEURAI_UTILS.decryptTextWithPin(
          wallet.passphraseEnc as Parameters<typeof NEURAI_UTILS.decryptTextWithPin>[0],
          pin
        ) || '';
      } catch (_) {
        return null;
      }
    }

    try {
      const network = wallet.network === 'xna-pq' || wallet.network === 'xna-pq-test'
        ? wallet.network
        : 'xna-pq';
      const pqAddr = NeuraiKey.getPQAddress(network, mnemonic, 0, 0, passphrase || undefined);
      return pqAddr.seedKey;
    } catch (_) {
      return null;
    }
  }

  async function handleCreateAsset() {
    elements.caError!.textContent = '';
    elements.caError!.classList.add('hidden');
    elements.caCreateBtn!.disabled = true;
    elements.caCreateBtn!.textContent = 'Creating…';

    try {
      const wallet = state.wallet as Record<string, unknown> | null;
      if (!wallet || !wallet.address) throw new Error('No wallet loaded. Please unlock first.');

      const network = (wallet.network as string) || 'xna';
      const address = wallet.address as string;
      const rpc = buildRpcFn(network);

      const neuraiAssets = createNeuraiAssetsClient(rpc, {
        network,
        addresses: [address],
        changeAddress: address,
        toAddress: address,
      });

      const type = state.createAssetType;
      let result: NeuraiAssetsBuildResult;

      if (type === 'ROOT') {
        const assetName = elements.caAssetName!.value.trim().toUpperCase();
        if (!assetName) throw new Error('Asset name is required.');
        result = await neuraiAssets.createRootAsset({
          assetName,
          quantity: Number(elements.caQuantity!.value) || 1,
          units: Number(elements.caUnits!.value) || 0,
          reissuable: elements.caReissuable!.checked,
          hasIpfs: !!elements.caIpfsHash!.value.trim(),
          ipfsHash: elements.caIpfsHash!.value.trim() || undefined,
        });
      } else if (type === 'SUB') {
        const parentOwnerToken = elements.caParentSelect!.value;
        if (!parentOwnerToken) throw new Error('Select a parent asset from the dropdown.');
        const parentName = parentOwnerToken.endsWith('!') ? parentOwnerToken.slice(0, -1) : parentOwnerToken;
        const subPart = elements.caSubName!.value.trim().toUpperCase();
        if (!subPart) throw new Error('Sub name is required.');
        const assetName = `${parentName}/${subPart}`;
        result = await neuraiAssets.createSubAsset({
          assetName,
          quantity: Number(elements.caQuantity!.value) || 1,
          units: Number(elements.caUnits!.value) || 0,
          reissuable: elements.caReissuable!.checked,
          hasIpfs: !!elements.caIpfsHash!.value.trim(),
          ipfsHash: elements.caIpfsHash!.value.trim() || undefined,
        });
      } else if (type === 'UNIQUE') {
        const parentOwnerToken = elements.caParentSelect!.value;
        if (!parentOwnerToken) throw new Error('Select a root asset from the dropdown.');
        const rootName = parentOwnerToken.endsWith('!') ? parentOwnerToken.slice(0, -1) : parentOwnerToken;
        const tag = elements.caTag!.value.trim().toUpperCase();
        if (!tag) throw new Error('NFT tag is required.');
        const ipfsHash = elements.caIpfsHash!.value.trim();
        result = await neuraiAssets.createUniqueAssets({
          rootName,
          assetTags: [tag],
          ...(ipfsHash ? { ipfsHashes: [ipfsHash] } : {}),
        });
      } else if (type === 'QUALIFIER') {
        const raw = elements.caAssetName!.value.trim().toUpperCase();
        if (!raw) throw new Error('Qualifier name is required.');
        const qualifierName = raw.startsWith('#') ? raw : `#${raw}`;
        result = await neuraiAssets.createQualifier({
          qualifierName,
          quantity: Number(elements.caQuantity!.value) || 1,
          hasIpfs: !!elements.caIpfsHash!.value.trim(),
          ipfsHash: elements.caIpfsHash!.value.trim() || undefined,
        });
      } else if (type === 'DEPIN') {
        const raw = elements.caAssetName!.value.trim().toUpperCase();
        if (!raw) throw new Error('DePIN asset name is required.');
        const assetName = raw.startsWith('&') ? raw : `&${raw}`;
        result = await neuraiAssets.createDepinAsset({
          assetName,
          quantity: Number(elements.caQuantity!.value) || 1,
          reissuable: elements.caReissuable!.checked,
          hasIpfs: !!elements.caIpfsHash!.value.trim(),
          ipfsHash: elements.caIpfsHash!.value.trim() || undefined,
        });
      } else if (type === 'RESTRICTED') {
        const baseAssetName = elements.caRestrictedBaseSelect!.value.trim().toUpperCase();
        const rawVerifier = elements.caVerifier!.value.trim().toUpperCase();
        if (!baseAssetName) throw new Error('Select the base asset you want to convert to restricted.');
        if (!rawVerifier) throw new Error('Verifier string is required for restricted assets.');
        const assetName = `$${baseAssetName}`;
        // Auto-add # prefix to bare qualifier names (e.g. "KYC" → "#KYC", "KYC & ACCREDITED" → "#KYC & #ACCREDITED")
        const verifierString = rawVerifier.replace(/(?<!#)(?<![A-Z0-9_])([A-Z][A-Z0-9_]*)/g, '#$1');
        const linkedTagsRaw = await neuraiAssets
          .listTagsForAddress(address)
          .catch(() => rpc('listtagsforaddress', [address]).catch(() => []));
        const linkedTags = normalizeQualifierTags(linkedTagsRaw);
        const passesVerifier = evaluateVerifierAgainstTags(verifierString, linkedTags);
        if (!passesVerifier) {
          const detail = explainSimpleVerifierFailure(verifierString, linkedTags);
          throw new Error(
            `The active address does not satisfy the verifier "${verifierString}". `
            + `${detail ? `${detail}. ` : ''}`
            + `Assign the required tag(s) to ${address} before creating ${assetName}.`
          );
        }
        result = await neuraiAssets.createRestrictedAsset({
          assetName,
          quantity: Number(elements.caQuantity!.value) || 1,
          verifierString,
          units: Number(elements.caUnits!.value) || 0,
          reissuable: elements.caReissuable!.checked,
          hasIpfs: !!elements.caIpfsHash!.value.trim(),
          ipfsHash: elements.caIpfsHash!.value.trim() || undefined,
        });
      } else if (type === 'REISSUE') {
        const parentOwnerToken = elements.caParentSelect!.value;
        if (!parentOwnerToken) throw new Error('Select an asset from the dropdown.');
        const assetName = parentOwnerToken.endsWith('!') ? parentOwnerToken.slice(0, -1) : parentOwnerToken;
        const addQty = Number(elements.caQuantity!.value);
        if (!addQty || addQty <= 0) throw new Error('Additional quantity must be greater than 0.');
        result = await neuraiAssets.reissueAsset({
          assetName,
          quantity: addQty,
          reissuable: elements.caReissuable!.checked,
          newIpfs: elements.caIpfsHash!.value.trim() || undefined,
        });
      } else {
        throw new Error('Unknown asset type: ' + type);
      }

      // Sign the raw transaction
      const rpcUrl = NEURAI_UTILS.isTestnetNetwork(network)
        ? (state.settings.rpcTestnet || C.RPC_URL_TESTNET)
        : (state.settings.rpcMainnet || C.RPC_URL);

      let signedHex = await signRawTx(result.rawTx, rpcUrl);
      if (network === 'xna-pq' || network === 'xna-pq-test') {
        const adjusted = await ensureAuthScriptAssetRelayFee(result, signedHex, address, rpcUrl, rpc, 'create-asset');
        result = adjusted.buildResult;
        signedHex = adjusted.signedHex;
      }

      // Store signed TX and show confirm modal instead of broadcasting immediately
      state.pendingSignedTx = { hex: signedHex, rpcUrl, buildResult: result };
      showTxConfirmModal(result, signedHex);

    } catch (err) {
      const msg = (err as Error).message || 'Unknown error';
      elements.caError!.textContent = msg;
      elements.caError!.classList.remove('hidden');
      elements.caCreateBtn!.disabled = false;
      elements.caCreateBtn!.textContent = 'Create Asset';
    }
  }

  function showTxConfirmModal(buildResult: NeuraiAssetsBuildResult, signedHex: string) {
    // Build outputs display
    const list = elements.caTxOutputsList!;
    list.innerHTML = '';

    const outputs: Array<Record<string, unknown>> = Array.isArray(buildResult.outputs)
      ? buildResult.outputs as Array<Record<string, unknown>>
      : Object.entries(buildResult.outputs as Record<string, unknown>).map(([k, v]) => ({ [k]: v }));

    outputs.forEach(outputObj => {
      const [addr, value] = Object.entries(outputObj)[0];
      const row = document.createElement('div');
      row.className = 'ca-output-row';

      let badgeClass = 'ca-output-badge--asset';
      let badgeLabel = 'Asset';
      let valueStr = '';

      if (typeof value === 'number') {
        // XNA output — determine if burn or change
        const isBurn = /^N[bB]/.test(addr) || addr.includes('BURN') ||
          // known burn address pattern: NbURN...
          /^Nb/.test(addr);
        badgeClass = isBurn ? 'ca-output-badge--burn' : 'ca-output-badge--change';
        badgeLabel = isBurn ? 'Burn' : 'Change';
        valueStr = `${value} XNA`;
      } else if (typeof value === 'object' && value !== null) {
        const v = value as Record<string, unknown>;
        if (v.transfer) {
          const assetName = Object.keys(v.transfer as Record<string, unknown>)[0] || '';
          const amount = (v.transfer as Record<string, unknown>)[assetName];
          badgeClass = assetName.endsWith('!') ? 'ca-output-badge--owner' : 'ca-output-badge--asset';
          badgeLabel = assetName.endsWith('!') ? 'Owner token' : 'Transfer';
          valueStr = `${amount} ${assetName}`;
        } else if (v.issue) {
          const i = v.issue as Record<string, unknown>;
          badgeLabel = 'Issue';
          const units = Number(i.units ?? 0);
          const qty = Number(i.asset_quantity) / Math.pow(10, units);
          valueStr = `${i.asset_name} × ${qty}`;
        } else if (v.issue_unique) {
          badgeLabel = 'NFT';
          valueStr = String((v.issue_unique as Record<string, unknown>).root_name || '');
        } else if (v.issue_restricted) {
          badgeLabel = 'Restricted';
          valueStr = String((v.issue_restricted as Record<string, unknown>).asset_name || '');
        } else if (v.issue_qualifier) {
          badgeLabel = 'Qualifier';
          valueStr = String((v.issue_qualifier as Record<string, unknown>).asset_name || '');
        } else if (v.reissue) {
          badgeLabel = 'Reissue';
          valueStr = String((v.reissue as Record<string, unknown>).asset_name || '');
        } else {
          valueStr = JSON.stringify(value).slice(0, 60);
        }
      }

      row.innerHTML = `
        <span class="ca-output-badge ${badgeClass}">${badgeLabel}</span>
        <span class="ca-output-addr">${addr}</span>
        <span class="ca-output-value">${valueStr}</span>`;
      list.appendChild(row);
    });

    // Show miner fee row
    if (buildResult.fee != null) {
      const feeRow = document.createElement('div');
      feeRow.className = 'ca-output-row';
      feeRow.innerHTML = `
        <span class="ca-output-badge" style="background:rgba(148,163,184,.12);color:var(--text-muted)">Fee</span>
        <span class="ca-output-addr">Miner fee (estimated)</span>
        <span class="ca-output-value">${buildResult.fee.toFixed(8)} XNA</span>`;
      list.appendChild(feeRow);
    }

    // Raw hex
    elements.caTxRawHex!.textContent = signedHex;
    elements.caTxRawHex!.classList.add('hidden');
    elements.caTxRawToggle!.textContent = ' Show raw hex';

    // Debug: outputs JSON + unsigned rawTx
    const debugData = {
      network: (state.wallet as Record<string, unknown>)?.network || '?',
      walletAddress: (state.wallet as Record<string, unknown>)?.address || '?',
      unsignedRawTx: buildResult.rawTx,
      fee: buildResult.fee,
      inputs: buildResult.inputs,
      outputs: buildResult.outputs,
    };
    elements.caTxDebugJson!.textContent = JSON.stringify(debugData, null, 2);
    elements.caTxDebugJson!.classList.add('hidden');

    elements.caTxConfirmError!.textContent = '';
    elements.caTxConfirmError!.classList.add('hidden');
    elements.caTxBroadcastBtn!.disabled = false;
    elements.caTxBroadcastBtn!.textContent = 'Broadcast';

    elements.caTxConfirmModal!.classList.remove('hidden');
  }

  async function handleBroadcast() {
    const pending = state.pendingSignedTx;
    if (!pending) return;

    elements.caTxBroadcastBtn!.disabled = true;
    elements.caTxBroadcastBtn!.textContent = 'Broadcasting…';
    elements.caTxConfirmError!.classList.add('hidden');

    try {
      const explainReject = async (): Promise<string | null> => {
        try {
          const resp = await fetch(pending.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '1.0',
              id: 'testmempoolaccept-asset-tx',
              method: 'testmempoolaccept',
              params: [[pending.hex]]
            })
          });
          const text = await resp.text();
          if (!text) return null;
          const data = JSON.parse(text) as {
            result?: Array<{ allowed?: boolean; 'reject-reason'?: string; reject_reason?: string }>;
          };
          const first = data.result?.[0];
          if (!first) return null;
          if (first.allowed) return null;
          return first['reject-reason'] || first.reject_reason || null;
        } catch {
          return null;
        }
      };

      const broadcastResp = await fetch(pending.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '1.0', id: 'broadcast-asset-tx', method: 'sendrawtransaction',
          params: [pending.hex]
        })
      });
      const rawText = await broadcastResp.text();
      let broadcastData: {
        result?: string;
        error?: { message?: string; code?: number; data?: unknown } | string;
      } = {};

      if (rawText) {
        try {
          broadcastData = JSON.parse(rawText);
        } catch {
          if (!broadcastResp.ok) {
            throw new Error(rawText.trim() || `Broadcast failed (HTTP ${broadcastResp.status})`);
          }
        }
      }

      if (!broadcastResp.ok && !broadcastData.error) {
        throw new Error(`Broadcast failed (HTTP ${broadcastResp.status})`);
      }

      if (broadcastData.error) {
        const msg = typeof broadcastData.error === 'string'
          ? broadcastData.error
          : broadcastData.error.message || String(broadcastData.error.data || 'Broadcast failed');
        const rejectReason = await explainReject();
        const combinedMessage = rejectReason ? `${msg} (${rejectReason})` : msg;
        if (combinedMessage.includes('bad-txns-null-data-add-qualifier-when-already-assigned')) {
          const diagnostics = await buildTagRejectDiagnostics(pending.rpcUrl, pending.buildResult);
          throw new Error(
            `${combinedMessage}. The node reports the qualifier as already assigned, or a conflicting tag tx is still pending.`
            + `${diagnostics ? ` ${diagnostics}` : ''}`
          );
        }
        throw new Error(combinedMessage);
      }

      const txid = broadcastData.result || 'unknown';
      state.pendingSignedTx = null;
      elements.caTxConfirmModal!.classList.add('hidden');
      elements.caTxid!.textContent = txid;
      elements.caResult!.classList.remove('hidden');
      if (state.cardMode === 'CREATE') {
        elements.caCreateBtn!.classList.add('hidden');
      } else {
        elements.cfApplyBtn!.classList.add('hidden');
      }

    } catch (err) {
      const msg = (err as Error).message || 'Broadcast failed';
      elements.caTxConfirmError!.textContent = msg;
      elements.caTxConfirmError!.classList.remove('hidden');
      elements.caTxBroadcastBtn!.disabled = false;
      elements.caTxBroadcastBtn!.textContent = 'Broadcast';
    }
  }

  // Restrict input to allowed chars for each field type, auto-uppercase
  function bindAssetNameInput(
    input: HTMLInputElement,
    allowed: { test: (char: string) => boolean },  // chars to KEEP (single char test)
    prefix?: string   // fixed prefix like '#' or '$' (non-removable)
  ) {
    input.addEventListener('input', () => {
      const sel = input.selectionStart ?? input.value.length;
      let v = input.value.toUpperCase();
      // Keep only allowed chars (plus the prefix if present)
      const prefixPart = prefix && v.startsWith(prefix) ? prefix : (prefix ? prefix : '');
      const rest = v.slice(prefixPart.length);
      const cleaned = prefixPart + rest.split('').filter(c => allowed.test(c)).join('');
      if (cleaned !== input.value) {
        input.value = cleaned;
        const newSel = Math.min(sel, cleaned.length);
        input.setSelectionRange(newSel, newSel);
      }
    });
  }

  async function loadOwnerTokensIntoSelect() {
    const select = elements.caParentSelect!;
    const hint = elements.caParentSelectHint!;
    select.innerHTML = '<option value="">-- Select asset --</option>';
    hint.textContent = 'Loading…';
    elements.caLoadParentsBtn!.disabled = true;

    try {
      const wallet = state.wallet as Record<string, unknown> | null;
      if (!wallet?.address) { hint.textContent = 'No wallet loaded.'; return; }
      const network = (wallet.network as string) || 'xna';
      const address = wallet.address as string;
      const rpc = buildRpcFn(network);

      // listassetbalancesbyaddress returns {assetName: amount, ...}
      const balances = await rpc('listassetbalancesbyaddress', [address]) as Record<string, number> | null;
      const ownerTokens = balances
        ? Object.keys(balances).filter(name => name.endsWith('!') && balances[name] > 0)
        : [];

      if (ownerTokens.length === 0) {
        hint.textContent = 'No owner tokens found. You need a ROOT asset first.';
      } else {
        ownerTokens.forEach(name => {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          select.appendChild(opt);
        });
        hint.textContent = `${ownerTokens.length} owner token${ownerTokens.length !== 1 ? 's' : ''} found`;
      }
    } catch (err) {
      hint.textContent = 'Failed to load: ' + (err as Error).message;
    } finally {
      elements.caLoadParentsBtn!.disabled = false;
    }
  }

  // ── Shared TX signing helper ────────────────────────────────────────────────

  async function signRawTx(rawTx: string, rpcUrl: string): Promise<string> {
    const wallet = state.wallet as Record<string, unknown>;
    if (wallet.walletType === 'hardware') {
      if (!hwDevice || !hwDevice.connected) {
        throw new Error('Hardware wallet not connected. Reconnect it from the wallet view.');
      }
      const metadata = await ensureHardwareSigningMetadata({});
      if (!metadata.publicKey || !metadata.derivationPath || !metadata.masterFingerprint) {
        throw new Error('Hardware wallet metadata incomplete. Reconnect the device.');
      }
      const networkType = NEURAI_UTILS.toEsp32NetworkType(wallet.network as string);
      const txInputs = parseRawTransactionInputs(rawTx);
      const enrichedUtxos = await fetchRawTxForUtxos(txInputs, rpcUrl);
      const psbtBase64 = NeuraiSignESP32.buildPSBTFromRawTransaction({
        network: networkType,
        rawUnsignedTransaction: rawTx,
        inputs: enrichedUtxos.map(utxo => ({
          txid: utxo.txid,
          vout: utxo.vout,
          sequence: utxo.sequence,
          rawTxHex: utxo.rawTxHex ?? undefined,
          masterFingerprint: metadata.masterFingerprint,
          derivationPath: metadata.derivationPath,
          pubkey: metadata.publicKey,
          sighashType: 1,
        })),
      });
      const feeSats = calculateRawTransactionFeeSats(rawTx, enrichedUtxos);
      const signingDisplay = feeSats !== null
        ? { feeAmount: formatSatoshisToXna(feeSats), baseCurrency: 'XNA' }
        : undefined;
      const signResult = await hwDevice.signPsbt(psbtBase64, signingDisplay);
      const finalized = NeuraiSignESP32.finalizeSignedPSBT(psbtBase64, signResult.psbt, networkType);
      return finalized.txHex;
    } else {
      // Software wallet: sign locally via @neuraiproject/neurai-sign-transaction.
      // The RPC is only used to resolve prevouts (getrawtransaction), never to sign.
      const network = (wallet.network as string) || 'xna';
      const isAuthScriptPQWallet = network === 'xna-pq' || network === 'xna-pq-test';

      // Resolve key material (same for legacy and PQ; differs only in shape).
      let privateKeys: Record<string, string | { seedKey: string }>;
      if (isAuthScriptPQWallet) {
        const seedKey = await getDecryptedPQSeedKey();
        if (!seedKey) {
          logAuthScriptDebug('warn', '[sign-raw-tx] Missing AuthScript PQ signing material', {
            network,
            hasSeedKey: !!wallet.seedKey,
            hasSeedKeyEnc: !!wallet.seedKeyEnc,
            hasMnemonic: !!wallet.mnemonic,
            hasMnemonicEnc: !!wallet.mnemonicEnc,
            hasPassphrase: !!wallet.passphrase,
            hasPassphraseEnc: !!wallet.passphraseEnc,
            hasSessionPin: !!state.sessionPin,
            walletType: wallet.walletType || 'software',
            address: wallet.address || null
          });
          throw new Error('Unable to access AuthScript PQ wallet key. Make sure the wallet is unlocked.');
        }
        privateKeys = { [String(wallet.address || '')]: { seedKey } };
      } else {
        const wif = await getDecryptedWif();
        if (!wif) throw new Error('Unable to access private key. Make sure the wallet is unlocked.');
        privateKeys = { [String(wallet.address || '')]: wif };
      }

      // Resolve prevouts via RPC, identical for both key types.
      const txInputs = parseRawTransactionInputs(rawTx);
      const enrichedUtxos = await fetchRawTxForUtxos(txInputs, rpcUrl);
      const signTxUtxos = enrichedUtxos.map((utxo) => {
        const prevout = getPrevoutDetailsFromRawTx(utxo.rawTxHex, Number(utxo.vout));
        if (!prevout) {
          throw new Error(`Unable to load prevout data for ${utxo.txid}:${utxo.vout}`);
        }
        return {
          address: String(wallet.address || ''),
          assetName: 'XNA',
          txid: utxo.txid,
          outputIndex: Number(utxo.vout),
          script: prevout.scriptHex,
          satoshis: prevout.satoshis,
          value: prevout.satoshis
        };
      });

      try {
        if (isAuthScriptPQWallet) {
          logAuthScriptDebug('warn', '[sign-raw-tx][authscript-sign] Prepared AuthScript PQ signing inputs', {
            network,
            address: String(wallet.address || ''),
            inputCount: signTxUtxos.length,
            inputs: signTxUtxos.map((input) => ({
              txid: input.txid,
              vout: input.outputIndex,
              satoshis: input.satoshis,
              scriptHex: input.script
            }))
          });
        }
        return NeuraiSignTransaction.sign(
          network as NeuraiSignTransactionNetwork,
          rawTx,
          signTxUtxos,
          privateKeys
        );
      } catch (error) {
        if (isAuthScriptPQWallet) {
          logAuthScriptDebug('error', '[sign-raw-tx][authscript-sign] Local AuthScript PQ signing failed', {
            network,
            address: String(wallet.address || ''),
            inputCount: signTxUtxos.length,
            inputs: signTxUtxos.map((input) => ({
              txid: input.txid,
              vout: input.outputIndex,
              satoshis: input.satoshis,
              scriptHex: input.script
            })),
            error: error instanceof Error ? error.message : String(error)
          });
        }
        throw error;
      }
    }
  }

  // ── Configure Asset panel ───────────────────────────────────────────────────

  function updateCardMode(mode: 'CREATE' | 'CONFIGURE') {
    state.cardMode = mode;
    elements.assetModeToggle!.querySelectorAll('.asset-mode-btn').forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.mode === mode);
    });
    const isCreate = mode === 'CREATE';
    elements.createAssetPanel!.classList.toggle('hidden', !isCreate);
    elements.configureAssetPanel!.classList.toggle('hidden', isCreate);
    elements.caCardTitle!.textContent = isCreate ? 'Create Asset' : 'Configure Asset';
    elements.caCardCopy!.textContent = isCreate
      ? 'Issue new tokens, NFTs or DePIN assets on the Neurai network.'
      : 'Manage existing assets — tag addresses, reissue or freeze.';
    elements.caResult!.classList.add('hidden');
    if (mode === 'CONFIGURE') {
      loadOwnerTokensIntoCfSelect();
    }
  }

  function updateConfigureAssetUI() {
    const type = state.configAssetType;
    const isTag = type === 'TAG';
    const isUntag = type === 'UNTAG';
    const isReissueRestricted = type === 'REISSUE_RESTRICTED';
    const isFreeze = type === 'FREEZE';
    const isUnfreeze = type === 'UNFREEZE';
    const needsQualifier = isTag || isUntag;
    const needsAddresses = isTag || isUntag || isFreeze || isUnfreeze;
    const needsGlobal = isFreeze || isUnfreeze;
    const isGlobal = elements.cfGlobal!.checked;

    elements.cfTypeTabs!.querySelectorAll('.asset-type-tab').forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.type === type);
    });

    elements.cfOwnerTokenLabel!.textContent = needsQualifier ? 'Qualifier' : 'Restricted Asset';

    elements.cfAddressesGroup!.classList.toggle('hidden', !needsAddresses || (needsGlobal && isGlobal));
    elements.cfGlobalGroup!.classList.toggle('hidden', !needsGlobal);
    elements.cfQuantityGroup!.classList.toggle('hidden', !isReissueRestricted);
    elements.cfChangeVerifierGroup!.classList.toggle('hidden', !isReissueRestricted);
    elements.cfNewVerifierGroup!.classList.toggle('hidden', !isReissueRestricted || !elements.cfChangeVerifier!.checked);
    elements.cfReissuableGroup!.classList.toggle('hidden', !isReissueRestricted);
    elements.cfNewIpfsGroup!.classList.toggle('hidden', !isReissueRestricted);
    elements.cfFeeRow!.classList.toggle('hidden', !isReissueRestricted);

    if (isTag) elements.cfApplyBtn!.textContent = 'Tag Addresses';
    else if (isUntag) elements.cfApplyBtn!.textContent = 'Untag Addresses';
    else if (isReissueRestricted) elements.cfApplyBtn!.textContent = 'Reissue Asset';
    else if (isFreeze) elements.cfApplyBtn!.textContent = isGlobal ? 'Freeze Globally' : 'Freeze Addresses';
    else if (isUnfreeze) elements.cfApplyBtn!.textContent = isGlobal ? 'Unfreeze Globally' : 'Unfreeze Addresses';
  }

  async function loadOwnerTokensIntoCfSelect() {
    const type = state.configAssetType;
    const needsQualifier = type === 'TAG' || type === 'UNTAG';
    const select = elements.cfOwnerTokenSelect!;
    const hint = elements.cfOwnerTokenHint!;
    select.innerHTML = '<option value="">-- Select asset --</option>';
    hint.textContent = 'Loading…';
    elements.cfLoadTokensBtn!.disabled = true;

    try {
      const wallet = state.wallet as Record<string, unknown> | null;
      if (!wallet?.address) { hint.textContent = 'No wallet loaded.'; return; }
      const network = (wallet.network as string) || 'xna';
      const address = wallet.address as string;
      const rpc = buildRpcFn(network);

      let selectableAssets: string[] = [];

      const balances = await rpc('listassetbalancesbyaddress', [address]) as Record<string, number> | null;
      if (needsQualifier) {
        // Tag/untag spends the qualifier asset itself (#KYC), not #KYC!
        selectableAssets = balances
          ? Object.keys(balances).filter(name => name.startsWith('#') && !name.endsWith('!') && balances[name] > 0)
          : [];
      } else {
        // Restricted operations are driven by the restricted asset name ($TOKEN),
        // but control is proven with the owner token TOKEN!.
        selectableAssets = balances
          ? Object.keys(balances)
              .filter(name => !name.startsWith('#') && name.endsWith('!') && balances[name] > 0)
              .map(name => `$${name.slice(0, -1)}`)
          : [];
      }

      selectableAssets = [...new Set(selectableAssets)].sort();

      if (selectableAssets.length === 0) {
        hint.textContent = needsQualifier
          ? 'No qualifier assets found (#NAME). Create a qualifier first.'
          : 'No restricted assets found that you can manage.';
      } else {
        selectableAssets.forEach(name => {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          select.appendChild(opt);
        });
        hint.textContent = `${selectableAssets.length} asset${selectableAssets.length !== 1 ? 's' : ''} found`;
      }
    } catch (err) {
      hint.textContent = 'Failed to load: ' + (err as Error).message;
    } finally {
      elements.cfLoadTokensBtn!.disabled = false;
    }
  }

  async function handleConfigureAsset() {
    elements.cfError!.textContent = '';
    elements.cfError!.classList.add('hidden');
    elements.cfApplyBtn!.disabled = true;
    const origText = elements.cfApplyBtn!.textContent || 'Apply';
    elements.cfApplyBtn!.textContent = 'Processing…';

    try {
      const wallet = state.wallet as Record<string, unknown> | null;
      if (!wallet || !wallet.address) throw new Error('No wallet loaded. Please unlock first.');
      const network = (wallet.network as string) || 'xna';
      const address = wallet.address as string;
      const rpc = buildRpcFn(network);
      const neuraiAssets = createNeuraiAssetsClient(rpc, {
        network,
        addresses: [address],
        changeAddress: address,
        toAddress: address,
      });

      const type = state.configAssetType;
      const selectedAsset = elements.cfOwnerTokenSelect!.value;
      if (!selectedAsset) throw new Error('Select an asset from the dropdown.');
      const tokenName = selectedAsset;

      let result: NeuraiAssetsBuildResult;

      if (type === 'TAG' || type === 'UNTAG') {
        const rawAddresses = elements.cfAddresses!.value.trim();
        if (!rawAddresses) throw new Error('Enter at least one address.');
        const addresses = parseUniqueAddresses(rawAddresses);
        if (addresses.length > 10) {
          throw new Error('TAG/UNTAG supports at most 10 addresses per transaction.');
        }
        const tagChecks = await Promise.all(
          addresses.map(async target => {
            try {
              const hasTag = await checkQualifierAssigned(neuraiAssets, rpc, target, tokenName);
              return { target, skipPrecheck: false, hasTag };
            } catch (_) {
              // RPC precheck failed (may happen with AuthScript addresses) — skip gracefully
              return { target, skipPrecheck: true, hasTag: false };
            }
          })
        );
        if (type === 'TAG') {
          const alreadyTagged = tagChecks.filter(item => !item.skipPrecheck && item.hasTag).map(item => item.target);
          if (alreadyTagged.length > 0) {
            throw new Error(
              `These addresses already have ${tokenName}: ${alreadyTagged.join(', ')}`
            );
          }
          logAssetDebug('warn', '[configure-asset][tag] Building qualifier TAG transaction', {
            network,
            walletAddress: address,
            qualifierName: tokenName,
            targetAddresses: addresses
          });
          result = await neuraiAssets.tagAddresses({ qualifierName: tokenName, addresses });
          await logBuiltAssetTransaction(rpc, '[configure-asset][tag] Built TAG transaction', result, {
            network,
            walletAddress: address,
            qualifierName: tokenName,
            targetAddresses: addresses,
            skippedPrecheckAddresses: tagChecks.filter((item) => item.skipPrecheck).map((item) => item.target)
          });
        } else {
          const missingTag = tagChecks.filter(item => !item.skipPrecheck && !item.hasTag).map(item => item.target);
          if (missingTag.length > 0) {
            throw new Error(
              `These addresses do not have ${tokenName}: ${missingTag.join(', ')}`
            );
          }
          logAssetDebug('warn', '[configure-asset][tag] Building qualifier UNTAG transaction', {
            network,
            walletAddress: address,
            qualifierName: tokenName,
            targetAddresses: addresses
          });
          result = await neuraiAssets.untagAddresses({ qualifierName: tokenName, addresses });
          await logBuiltAssetTransaction(rpc, '[configure-asset][tag] Built UNTAG transaction', result, {
            network,
            walletAddress: address,
            qualifierName: tokenName,
            targetAddresses: addresses,
            skippedPrecheckAddresses: tagChecks.filter((item) => item.skipPrecheck).map((item) => item.target)
          });
        }
      } else if (type === 'REISSUE_RESTRICTED') {
        const qty = Number(elements.cfQuantity!.value);
        if (!qty || qty <= 0) throw new Error('Additional quantity must be greater than 0.');
        const changeVerifier = elements.cfChangeVerifier!.checked;
        result = await neuraiAssets.reissueRestrictedAsset({
          assetName: tokenName,
          quantity: qty,
          changeVerifier,
          newVerifier: changeVerifier ? elements.cfNewVerifier!.value.trim().toUpperCase().replace(/(?<!#)(?<![A-Z0-9_])([A-Z][A-Z0-9_]*)/g, '#$1') : undefined,
          reissuable: elements.cfReissuable!.checked,
          newIpfs: elements.cfNewIpfs!.value.trim() || undefined,
        });
      } else if (type === 'FREEZE' || type === 'UNFREEZE') {
        const isGlobal = elements.cfGlobal!.checked;
        if (isGlobal) {
          result = type === 'FREEZE'
            ? await neuraiAssets.freezeAssetGlobally({ assetName: tokenName })
            : await neuraiAssets.unfreezeAssetGlobally({ assetName: tokenName });
        } else {
          const rawAddresses = elements.cfAddresses!.value.trim();
          if (!rawAddresses) throw new Error('Enter at least one address, or enable global mode.');
          const addresses = rawAddresses.split('\n').map(a => a.trim()).filter(Boolean);
          result = type === 'FREEZE'
            ? await neuraiAssets.freezeAddresses({ assetName: tokenName, addresses })
            : await neuraiAssets.unfreezeAddresses({ assetName: tokenName, addresses });
        }
      } else {
        throw new Error('Unknown configure type: ' + type);
      }

      const rpcUrl = NEURAI_UTILS.isTestnetNetwork(network)
        ? (state.settings.rpcTestnet || C.RPC_URL_TESTNET)
        : (state.settings.rpcMainnet || C.RPC_URL);

      let signedHex = await signRawTx(result.rawTx, rpcUrl);
      if (network === 'xna-pq' || network === 'xna-pq-test') {
        const adjusted = await ensureAuthScriptAssetRelayFee(result, signedHex, address, rpcUrl, rpc, 'configure-asset');
        result = adjusted.buildResult;
        signedHex = adjusted.signedHex;
      }
      state.pendingSignedTx = { hex: signedHex, rpcUrl, buildResult: result };
      showTxConfirmModal(result, signedHex);

    } catch (err) {
      elements.cfError!.textContent = (err as Error).message || 'Unknown error';
      elements.cfError!.classList.remove('hidden');
    } finally {
      elements.cfApplyBtn!.disabled = false;
      elements.cfApplyBtn!.textContent = origText;
    }
  }

  function bindCreateAsset() {
    if (!elements.createAssetCard) return;

    // Allowed chars per field: A-Z 0-9 _ .  (separator / or # not needed — handled by parent selector)
    const alphaNumDotUnderscore = /[A-Z0-9_.]/;
    const depinAssetNameChars = /[A-Z0-9_./&]/;

    bindAssetNameInput(elements.caAssetName!, {
      test(char: string) {
        return (state.createAssetType === 'DEPIN' ? depinAssetNameChars : alphaNumDotUnderscore).test(char);
      }
    });
    bindAssetNameInput(elements.caSubName!, alphaNumDotUnderscore);
    bindAssetNameInput(elements.caTag!, alphaNumDotUnderscore);
    renderVerifierPreview();

    // Type tab clicks
    elements.assetTypeTabs!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.asset-type-tab') as HTMLElement | null;
      if (!btn || !btn.dataset.type) return;
      state.createAssetType = btn.dataset.type;
      updateCreateAssetUI();
      // Auto-load owner tokens when switching to types that need them
      if (btn.dataset.type === 'SUB' || btn.dataset.type === 'UNIQUE' || btn.dataset.type === 'REISSUE') {
        loadOwnerTokensIntoSelect();
      }
    });

    elements.caLoadParentsBtn!.addEventListener('click', loadOwnerTokensIntoSelect);
    elements.caLoadRestrictedBasesBtn!.addEventListener('click', loadRestrictedBaseAssets);
    elements.caLoadVerifiersBtn!.addEventListener('click', loadAvailableVerifierTags);
    elements.caVerifierAddBtn!.addEventListener('click', () => appendSelectedVerifier(false));
    elements.caVerifierNegateBtn!.addEventListener('click', () => appendSelectedVerifier(true));
    elements.caVerifierAndBtn!.addEventListener('click', () => appendVerifierOperator('&'));
    elements.caVerifierOrBtn!.addEventListener('click', () => appendVerifierOperator('|'));
    elements.caVerifierClearBtn!.addEventListener('click', () => {
      elements.caVerifier!.value = '';
      renderVerifierPreview();
    });
    elements.caCreateBtn!.addEventListener('click', handleCreateAsset);

    // Mode toggle
    elements.assetModeToggle!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.asset-mode-btn') as HTMLElement | null;
      if (!btn || !btn.dataset.mode) return;
      updateCardMode(btn.dataset.mode as 'CREATE' | 'CONFIGURE');
    });

    // Configure panel tab clicks
    elements.cfTypeTabs!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.asset-type-tab') as HTMLElement | null;
      if (!btn || !btn.dataset.type) return;
      state.configAssetType = btn.dataset.type;
      updateConfigureAssetUI();
      loadOwnerTokensIntoCfSelect();
    });

    elements.cfLoadTokensBtn!.addEventListener('click', loadOwnerTokensIntoCfSelect);
    elements.cfApplyBtn!.addEventListener('click', handleConfigureAsset);

    // Global toggle in configure panel
    elements.cfGlobal!.addEventListener('change', updateConfigureAssetUI);

    // Change verifier toggle in configure panel
    elements.cfChangeVerifier!.addEventListener('change', updateConfigureAssetUI);

    // Confirm modal
    elements.caTxBroadcastBtn!.addEventListener('click', handleBroadcast);
    elements.caTxCancelBtn!.addEventListener('click', () => {
      state.pendingSignedTx = null;
      elements.caTxConfirmModal!.classList.add('hidden');
      if (state.cardMode === 'CREATE') {
        elements.caCreateBtn!.disabled = false;
        elements.caCreateBtn!.textContent = 'Create Asset';
      } else {
        elements.cfApplyBtn!.disabled = false;
        updateConfigureAssetUI(); // restores button text
      }
    });
    elements.caTxRawToggle!.addEventListener('click', () => {
      const hidden = elements.caTxRawHex!.classList.toggle('hidden');
      elements.caTxRawToggle!.textContent = hidden ? ' Show raw hex' : ' Hide raw hex';
    });
    elements.caTxDebugToggle!.addEventListener('click', () => {
      const hidden = elements.caTxDebugJson!.classList.toggle('hidden');
      elements.caTxDebugToggle!.textContent = hidden
        ? ' Show debug (outputs JSON + unsigned raw)'
        : ' Hide debug';
    });

    elements.caNewBtn!.addEventListener('click', () => {
      elements.caResult!.classList.add('hidden');
      elements.caError!.classList.add('hidden');
      elements.cfError!.classList.add('hidden');
      if (state.cardMode === 'CREATE') {
        elements.caCreateBtn!.classList.remove('hidden');
        elements.caCreateBtn!.disabled = false;
        elements.caCreateBtn!.textContent = 'Create Asset';
        elements.caAssetName!.value = '';
        elements.caSubName!.value = '';
        elements.caTag!.value = '';
        elements.caParentSelect!.value = '';
        elements.caRestrictedBaseSelect!.value = '';
        elements.caQuantity!.value = '';
        elements.caIpfsHash!.value = '';
        elements.caVerifier!.value = '';
        renderVerifierPreview();
      } else {
        elements.cfApplyBtn!.classList.remove('hidden');
        elements.cfApplyBtn!.disabled = false;
        elements.cfAddresses!.value = '';
        elements.cfQuantity!.value = '';
        elements.cfNewVerifier!.value = '';
        elements.cfNewIpfs!.value = '';
        elements.cfGlobal!.checked = false;
        elements.cfChangeVerifier!.checked = false;
        updateConfigureAssetUI();
      }
    });

    updateCreateAssetUI();
    updateConfigureAssetUI();
  }

  // ── Boot ───────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
    stopLockWatch();
    stopHwStatusMonitor();
  });
})();
