// Neurai Wallet — Full-tab expanded view
// Relies on globals loaded before this script:
//   NeuraiKey, NeuraiReader  (from ../lib/ via classic <script> tags)
import { NEURAI_CONSTANTS } from '../shared/constants.js';
import { NEURAI_UTILS } from '../shared/utils.js';
import type { WalletSettings } from '../types/index.js';

(function () {
  'use strict';

  const C = NEURAI_CONSTANTS;

  // ── Persistent HW device connection ─────────────────────────────────────
  let hwDevice: NeuraiESP32Instance | null = null; // NeuraiESP32 instance, kept alive while expanded is open
  let hwStatusInterval: ReturnType<typeof setInterval> | null = null;
  let copyAddressFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;
  const PAGE_SIZE = 5;

  const ASSET_FEES: Record<string, number> = {
    ROOT: 1000,
    SUB: 200,
    UNIQUE: 10,
    QUALIFIER: 2000,
    RESTRICTED: 3000,
    REISSUE: 200,
    REISSUE_RESTRICTED: 200,
  };

  const elements = {
    // Header
    refreshBtn: document.getElementById('refreshBtn')!,
    headerSubtitle: document.getElementById('headerSubtitle')!,

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
    elements.refreshBtn.addEventListener('click', handleRefresh);
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
        txHex.textContent = (item as Record<string, unknown>).signedTxHex as string || (item as Record<string, unknown>).txHex as string || '';

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

  function renderWalletInfo() {
    if (!state.wallet) return;
    const network = state.wallet.network || 'xna';
    elements.networkValue.textContent = network === 'xna-test' ? 'Testnet' : 'Mainnet';
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
      const pendingDelta = await NeuraiReader.getPendingBalanceFromAddressMempool(state.wallet.address as string, 'XNA');
      const balance = NeuraiReader.formatBalance(balanceData!.balance);
      const pending = NeuraiReader.formatBalance(pendingDelta);
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
    elements.recentMovementsList.innerHTML = pageItems.map((item) => {
      const i = item as { direction: string; amountText: string; timestamp: string; confirmations: number; txid: string };
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
        <div class="movement-txid">${escapeHtml(i.txid)}</div>
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
    if (network === 'xna-test') NeuraiReader.setTestnet(); else NeuraiReader.setMainnet();
    const rpcUrl = network === 'xna-test' ? state.settings.rpcTestnet : state.settings.rpcMainnet;
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

  function validateHardwareWalletNetwork(selectedNetwork: string, deviceNetwork: string | null | undefined) {
    const expectedNetwork = selectedNetwork === 'xna-test' ? 'NeuraiTest' : 'Neurai';
    if (deviceNetwork && deviceNetwork !== expectedNetwork) {
      throw new Error(
        'The ESP32 is configured for ' + deviceNetwork + ' but the addon is set to ' + expectedNetwork
      );
    }
  }

  function isSerialPortSelectionCancelled(error: Error) {
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
      const rpcUrl = network === 'xna-test'
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
      const networkType = network === 'xna-test' ? 'xna-test' : 'xna';
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

  function parseRawTransactionInputs(txHex: string) {
    const bytes = hexToBytes(txHex);
    let offset = 4;
    const inputVarInt = readVarInt(bytes, offset);
    offset += inputVarInt.size;

    const inputs: Array<{ txid: string; vout: number; sequence: number }> = [];
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

  function parseRawTransactionOutputs(txHex: string) {
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
    const outputs: Array<{ value: bigint }> = [];

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

  function hexToBytes(hex: string) {
    const normalized = String(hex || '').trim();
    if (!normalized || normalized.length % 2 !== 0) {
      throw new Error('Invalid raw transaction hex');
    }
    const bytes: number[] = [];
    for (let i = 0; i < normalized.length; i += 2) {
      bytes.push(parseInt(normalized.slice(i, i + 2), 16));
    }
    return bytes;
  }

  function bytesToHex(bytes: number[]) {
    return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function readUInt32LE(bytes: number[], offset: number) {
    return (
      bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)
    ) >>> 0;
  }

  function readUInt64LE(bytes: number[], offset: number) {
    const low = BigInt(readUInt32LE(bytes, offset));
    const high = BigInt(readUInt32LE(bytes, offset + 4));
    return low + (high << 32n);
  }

  function readVarInt(bytes: number[], offset: number) {
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

  // ── Create Asset ───────────────────────────────────────────────────────────

  function buildRpcFn(network: string): (method: string, params: unknown[]) => Promise<unknown> {
    const url = network === 'xna-test'
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

  function updateCreateAssetUI() {
    const type = state.createAssetType;
    const isSub = type === 'SUB';
    const isUnique = type === 'UNIQUE';
    const isQualifier = type === 'QUALIFIER';
    const isRestricted = type === 'RESTRICTED';
    const isReissue = type === 'REISSUE';
    const needsParent = isSub || isUnique || isReissue;

    // Tab active state
    elements.assetTypeTabs!.querySelectorAll('.asset-type-tab').forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.type === type);
    });

    // Asset name field: hidden when type uses parent selector instead
    elements.caAssetNameGroup!.classList.toggle('hidden', needsParent);

    // Parent selector: shown for SUB, UNIQUE, and REISSUE
    elements.caParentSelectGroup!.classList.toggle('hidden', !needsParent);
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

    // Units: hidden for QUALIFIER, UNIQUE, REISSUE (units can't change on reissue)
    elements.caUnitsGroup!.classList.toggle('hidden', isQualifier || isUnique || isReissue);

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
    } else if (type === 'RESTRICTED') {
      elements.caAssetName!.placeholder = 'MYSECURITYTOKEN';
      elements.caAssetNameHint!.textContent = 'Name without $ prefix — e.g. SECURITY';
    }

    // Reset quantity limits when leaving QUALIFIER
    if (!isQualifier) {
      elements.caQuantity!.max = '21000000000';
      elements.caQuantity!.placeholder = '1000000';
    }

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

      const neuraiAssets = new NeuraiAssets(rpc, {
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
      } else if (type === 'RESTRICTED') {
        const raw = elements.caAssetName!.value.trim().toUpperCase();
        const rawVerifier = elements.caVerifier!.value.trim().toUpperCase();
        if (!raw) throw new Error('Asset name is required.');
        if (!rawVerifier) throw new Error('Verifier string is required for restricted assets.');
        const assetName = raw.startsWith('$') ? raw : `$${raw}`;
        // Auto-add # prefix to bare qualifier names (e.g. "KYC" → "#KYC", "KYC & ACCREDITED" → "#KYC & #ACCREDITED")
        const verifierString = rawVerifier.replace(/(?<!#)(?<![A-Z0-9_])([A-Z][A-Z0-9_]*)/g, '#$1');
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
      const rpcUrl = network === 'xna-test'
        ? (state.settings.rpcTestnet || C.RPC_URL_TESTNET)
        : (state.settings.rpcMainnet || C.RPC_URL);

      const signedHex = await signRawTx(result.rawTx, rpcUrl);

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
        throw new Error(rejectReason ? `${msg} (${rejectReason})` : msg);
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
    allowed: RegExp,  // chars to KEEP (single char test)
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
      const networkType = (wallet.network as string) === 'xna-test' ? 'xna-test' : 'xna';
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
      const wif = await getDecryptedWif();
      if (!wif) throw new Error('Unable to access private key. Make sure the wallet is unlocked.');
      const signResp = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '1.0', id: 'sign-tx', method: 'signrawtransaction',
          params: [rawTx, [], [wif], 'ALL'],
        }),
      });
      if (!signResp.ok) throw new Error(`Sign RPC error: ${signResp.status}`);
      const signData = await signResp.json() as {
        result?: { hex: string; complete: boolean };
        error?: { message: string } | string;
      };
      if (signData.error) {
        const msg = typeof signData.error === 'string' ? signData.error : signData.error.message;
        throw new Error('Signing failed: ' + msg);
      }
      if (!signData.result?.complete) throw new Error('Transaction signing incomplete. Check your UTXOs.');
      return signData.result.hex;
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
      ? 'Issue new tokens or NFTs on the Neurai network.'
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
      const neuraiAssets = new NeuraiAssets(rpc, {
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
        const addresses = rawAddresses.split('\n').map(a => a.trim()).filter(Boolean);
        const tagChecks = await Promise.all(
          addresses.map(async target => ({
            target,
            hasTag: Boolean(await rpc('checkaddresstag', [target, tokenName]))
          }))
        );
        if (type === 'TAG') {
          const alreadyTagged = tagChecks.filter(item => item.hasTag).map(item => item.target);
          if (alreadyTagged.length > 0) {
            throw new Error(
              `These addresses already have ${tokenName}: ${alreadyTagged.join(', ')}`
            );
          }
          result = await neuraiAssets.tagAddresses({ qualifierName: tokenName, addresses });
        } else {
          const missingTag = tagChecks.filter(item => !item.hasTag).map(item => item.target);
          if (missingTag.length > 0) {
            throw new Error(
              `These addresses do not have ${tokenName}: ${missingTag.join(', ')}`
            );
          }
          result = await neuraiAssets.untagAddresses({ qualifierName: tokenName, addresses });
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

      const rpcUrl = network === 'xna-test'
        ? (state.settings.rpcTestnet || C.RPC_URL_TESTNET)
        : (state.settings.rpcMainnet || C.RPC_URL);

      const signedHex = await signRawTx(result.rawTx, rpcUrl);
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

    bindAssetNameInput(elements.caAssetName!, alphaNumDotUnderscore);
    bindAssetNameInput(elements.caSubName!, alphaNumDotUnderscore);
    bindAssetNameInput(elements.caTag!, alphaNumDotUnderscore);

    // QUALIFIER and RESTRICTED: free-type prefix fields (no separator, underscore only)
    // We handle prefix forcing in updateCreateAssetUI via placeholder hints,
    // and the actual prefix (#/$) is added programmatically in handleCreateAsset.
    // For verifier, allow #, &, |, !, (, ), space, A-Z, 0-9, _
    elements.caVerifier!.addEventListener('input', () => {
      const allowed = /[A-Z0-9_#&|!()\s/]/i;
      const v = elements.caVerifier!.value.toUpperCase();
      const cleaned = v.split('').filter(c => allowed.test(c)).join('');
      if (cleaned !== elements.caVerifier!.value) elements.caVerifier!.value = cleaned;
    });

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
        elements.caQuantity!.value = '';
        elements.caIpfsHash!.value = '';
        elements.caVerifier!.value = '';
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
