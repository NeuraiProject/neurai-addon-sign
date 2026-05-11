// Shared mutable state for the expanded view. Imported as a singleton; mutate fields
// in place (state.foo = bar) — never reassign the object itself.

import { NEURAI_CONSTANTS } from '../../shared/constants.js';
import type { WalletSettings } from '../../types/index.js';

export const state = {
  wallet: null as Record<string, unknown> | null,
  accounts: null as Record<string, Record<string, unknown> | null> | null,
  activeAccountId: '1',
  settings: { ...NEURAI_CONSTANTS.DEFAULT_SETTINGS } as WalletSettings,
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
