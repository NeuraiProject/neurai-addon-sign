// Neurai Wallet — Shared Constants

import type { WalletSettings } from '../types/index.js';

export const NEURAI_CONSTANTS = Object.freeze({

  // ── Storage keys ──────────────────────────────────────────────────────────
  STORAGE_KEY:        'neurai_wallet_data',
  ACCOUNTS_KEY:       'neurai_wallet_accounts_v1',
  ACTIVE_ACCOUNT_KEY: 'neurai_wallet_active_account_v1',
  SETTINGS_KEY:       'neurai_wallet_settings',
  UNLOCK_UNTIL_KEY:   'neurai_wallet_unlock_until_v1',
  SESSION_PIN_KEY:    'neurai_wallet_session_pin_v1',

  // ── Account limits ────────────────────────────────────────────────────────
  MAX_ACCOUNTS: 10,

  // ── Polling ───────────────────────────────────────────────────────────────
  POLLING_INTERVAL_MS: 10000, // 10 s

  // ── Default RPC endpoints ─────────────────────────────────────────────────
  RPC_URL:         'https://rpc-depin.neurai.org/rpc',
  // The testnet node running DEPIN protocol 2, chosen explicitly.
  //
  // Checked on 2026-08-28: the previous one (rpc-testnet.neurai.org) also
  // publishes `asset_marker: 'xna'` and also answers the DEPIN RPCs, so there
  // was nothing broken about it. What did not publish the field was an
  // outdated local node, not that endpoint.
  //
  // The requirement is real though: without `asset_marker` the NIP-040 policy
  // resolves the legacy `rvn` marker, which testnet rejects from block 303000
  // with bad-txns-legacy-asset-marker-after-nip040. Any RPC configured here
  // must publish it.
  RPC_URL_TESTNET: 'https://rpc-testnet-depin.neurai.org/rpc',

  // ── Default block explorer URLs (URL templates with {txid} placeholder) ───
  EXPLORER_URL_MAINNET: 'https://explorer.neurai.org/tx/{txid}',
  EXPLORER_URL_TESTNET: 'https://rebel-explorer-testnet.neurai.org/tx/{txid}',

  // ── Default settings (frozen so callers must spread before mutating) ──────
  DEFAULT_SETTINGS: Object.freeze({
    theme:              'light',
    rpcMainnet:         '',
    rpcTestnet:         '',
    explorerMainnet:    '',
    explorerTestnet:    '',
    pinHash:            '',
    lockTimeoutMinutes: 10
  } satisfies WalletSettings),

  // ── Message types (background ↔ popup / content bridge) ───────────────────
  MSG: Object.freeze({
    GET_WALLET_INFO:         'GET_WALLET_INFO',
    SIGN_MESSAGE:            'SIGN_MESSAGE',
    GET_SIGN_REQUEST:        'GET_SIGN_REQUEST',
    SIGN_REQUEST_DECISION:   'SIGN_REQUEST_DECISION',
    VERIFY_OWNERSHIP:        'VERIFY_OWNERSHIP',
    WALLET_UPDATED:          'WALLET_UPDATED',
    SETTINGS_UPDATED:        'SETTINGS_UPDATED',
    BALANCE_UPDATE:          'BALANCE_UPDATE',
    SETTINGS_SYNCED:         'SETTINGS_SYNCED',
    SIGN_RAW_TX:             'SIGN_RAW_TX',
    SET_SESSION_PIN:         'SET_SESSION_PIN',
    GET_SESSION_PIN:         'GET_SESSION_PIN',
    CLEAR_SESSION_PIN:       'CLEAR_SESSION_PIN',
    HW_SIGN_MESSAGE:         'HW_SIGN_MESSAGE',
    HW_SIGN_RAW_TX:          'HW_SIGN_RAW_TX',
    HW_SIGN_RESULT:          'HW_SIGN_RESULT',
    HW_GET_SIGN_REQUEST:     'HW_GET_SIGN_REQUEST',
    HW_CONNECTION_STATUS:    'HW_CONNECTION_STATUS',
    HW_EXECUTE_SIGN_REQUEST: 'HW_EXECUTE_SIGN_REQUEST'
  } as const)

});
