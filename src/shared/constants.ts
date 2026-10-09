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
  // The testnet was reset on 2026-09-26 (genesis 0000008b…a021). Checked on
  // 2026-10-09: this endpoint and rpc-testnet.neurai.org both serve the new
  // chain and publish `asset_marker`. Every RPC call first checks the genesis
  // (shared/chain-identity.ts), so a URL left pointing at a node of the old
  // chain fails with a clear error instead of showing its data.
  //
  // Any RPC configured here must publish `asset_marker`: the reset testnet
  // stamps `rvn` up to block 9 and `xna` from block 10, and a testnet reply
  // without the field is rejected rather than read as `rvn`.
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
