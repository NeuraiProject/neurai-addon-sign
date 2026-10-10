/**
 * The signer next to the network in the header: an account whose keys are
 * not in this browser says where it signs, and whether that signer is
 * reachable right now.
 *
 * - Neurai HW (ESP32): connected or not, when the page holds the device; the
 *   popup does not, so there the state is unknown.
 * - Neurai Connect (NeuraiWallet on the phone): the session is active until
 *   it expires or either side ends it.
 *
 * Software accounts sign here and show nothing.
 *
 * No imports and no DOM: `node --test` loads it as is.
 */

export type SignerKind = 'hardware' | 'connect';
export type SignerState = 'on' | 'off' | 'unknown';

export interface SignerBadge {
  kind: SignerKind;
  label: string;
  state: SignerState;
  title: string;
}

export interface SignerStatus {
  /** ESP32 link, when known. */
  hwConnected?: boolean;
  /** Neurai Connect session expiry in ms, 0 for none; undefined while unknown. */
  sessionExpiresAt?: number;
  now?: number;
}

export function signerBadge(walletType: string | null | undefined, status: SignerStatus = {}): SignerBadge | null {
  if (walletType === 'hardware') {
    const known = typeof status.hwConnected === 'boolean';
    return {
      kind: 'hardware',
      label: 'Neurai HW',
      state: known ? (status.hwConnected ? 'on' : 'off') : 'unknown',
      title: !known
        ? 'This account signs on the Neurai HW (ESP32)'
        : status.hwConnected
          ? 'This account signs on the Neurai HW (ESP32) · connected'
          : 'This account signs on the Neurai HW (ESP32) · not connected'
    };
  }
  if (walletType === 'connect') {
    const now = status.now ?? Date.now();
    const expires = status.sessionExpiresAt;
    if (expires === undefined) {
      return { kind: 'connect', label: 'Neurai Connect', state: 'unknown', title: 'This account signs in NeuraiWallet over Neurai Connect' };
    }
    return expires > now
      ? {
        kind: 'connect',
        label: 'Neurai Connect',
        state: 'on',
        title: `This account signs in NeuraiWallet over Neurai Connect · session active until ${new Date(expires).toLocaleString()}`
      }
      : {
        kind: 'connect',
        label: 'Neurai Connect',
        state: 'off',
        title: 'Neurai Connect session ended: the next signature request shows a QR code to reconnect'
      };
  }
  return null;
}
