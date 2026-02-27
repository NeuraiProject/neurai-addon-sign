// Neurai Wallet — Shared Constants
// Loaded via importScripts() in the service worker and via <script> in popup pages.
// Must NOT contain any DOM or browser-window-specific code.

/* global globalThis, self */
(function (root) {
  root.NEURAI_CONSTANTS = Object.freeze({

    // ── Storage keys ──────────────────────────────────────────────────────────
    STORAGE_KEY:        'neurai_wallet_data',
    ACCOUNTS_KEY:       'neurai_wallet_accounts_v1',
    ACTIVE_ACCOUNT_KEY: 'neurai_wallet_active_account_v1',
    SETTINGS_KEY:       'neurai_wallet_settings',
    UNLOCK_UNTIL_KEY:   'neurai_wallet_unlock_until_v1',

    // ── Account limits ────────────────────────────────────────────────────────
    MAX_ACCOUNTS: 10,

    // ── Polling ───────────────────────────────────────────────────────────────
    POLLING_INTERVAL_MS: 10000, // 10 s

    // ── Default RPC endpoints ─────────────────────────────────────────────────
    RPC_URL:         'https://rpc-main.neurai.org/rpc',
    RPC_URL_TESTNET: 'https://rpc-testnet.neurai.org/rpc',

    // ── Default settings (frozen so callers must spread before mutating) ──────
    DEFAULT_SETTINGS: Object.freeze({
      theme:              'dark',
      rpcMainnet:         '',
      rpcTestnet:         '',
      pinHash:            '',
      lockTimeoutMinutes: 10
    }),

    // ── Message types (background ↔ popup / content bridge) ───────────────────
    MSG: Object.freeze({
      GET_WALLET_INFO:      'GET_WALLET_INFO',
      SIGN_MESSAGE:         'SIGN_MESSAGE',
      GET_SIGN_REQUEST:     'GET_SIGN_REQUEST',
      SIGN_REQUEST_DECISION:'SIGN_REQUEST_DECISION',
      VERIFY_OWNERSHIP:     'VERIFY_OWNERSHIP',
      WALLET_UPDATED:       'WALLET_UPDATED',
      SETTINGS_UPDATED:     'SETTINGS_UPDATED',
      BALANCE_UPDATE:       'BALANCE_UPDATE',
      SETTINGS_SYNCED:      'SETTINGS_SYNCED'
    })

  });
}(
  typeof globalThis !== 'undefined' ? globalThis :
  typeof self       !== 'undefined' ? self       :
  typeof window     !== 'undefined' ? window     : this
));
