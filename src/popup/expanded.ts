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
    historyPageLabel: document.getElementById('historyPageLabel')
  };

  let state = {
    wallet: null as Record<string, unknown> | null,
    accounts: null as Record<string, Record<string, unknown> | null> | null,
    activeAccountId: '1',
    settings: { ...C.DEFAULT_SETTINGS } as WalletSettings,
    assets: [] as unknown[],
    assetsPage: 0,
    recentMovements: [] as unknown[],
    recentMovementsPage: 0,
    historyPage: 0,
    unlockUntil: 0,
    sessionPin: '',
    autoRefreshInterval: null as ReturnType<typeof setInterval> | null,
    isRefreshingBalance: false,
    lockWatchInterval: null as ReturnType<typeof setInterval> | null,
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

  function renderAssetsList() {
    const totalPages = Math.max(1, Math.ceil(state.assets.length / PAGE_SIZE));
    state.assetsPage = Math.min(state.assetsPage, totalPages - 1);

    if (!state.assets.length) {
      elements.assetsList.innerHTML = '';
      elements.assetsEmpty.classList.remove('hidden');
      updatePager(elements.assetsPager, elements.assetsPageLabel, elements.assetsPrevBtn, elements.assetsNextBtn, 0, 0);
      return;
    }
    elements.assetsEmpty.classList.add('hidden');
    const pageItems = paginateItems(state.assets, state.assetsPage);
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

  function normalizeMovement(tx: unknown, movement: { txid: string; netSatoshis: number; height: number } | undefined) {
    if (!tx || !movement || !movement.txid) return null;

    const netSatoshis = Number(movement.netSatoshis || 0);
    if (!Number.isFinite(netSatoshis) || netSatoshis === 0) return null;

    const direction = netSatoshis < 0 ? 'Sent' : 'Received';
    const rawAmount = Math.abs(netSatoshis) / 1e8;
    const amount = rawAmount > 0 ? Number(rawAmount).toFixed(8).replace(/\.?0+$/, '') : '0';
    const timestamp = Number((tx as Record<string, unknown>).blocktime || (tx as Record<string, unknown>).time || 0);

    return {
      txid: movement.txid,
      direction,
      amountText: amount + ' XNA',
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
          <span class="movement-direction movement-direction--${i.direction.toLowerCase()}">${escapeHtml(i.direction)}</span>
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
    const totalPages = Math.max(1, Math.ceil(state.assets.length / PAGE_SIZE));
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
