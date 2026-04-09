// Neurai Wallet — Shared Utilities

import type { EncryptedSecret, WalletSettings } from '../types/index.js';

const SECRET_V1              = 1 as const;
const SECRET_KDF_ITERATIONS  = 210000;

/**
 * Hash a UTF-8 string with SHA-256 and return a lowercase hex string.
 */
async function hashText(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest  = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const part = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...Array.from(part));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes  = new Uint8Array(binary.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function isEncryptedSecret(payload: unknown): payload is EncryptedSecret {
  return !!(
    payload &&
    typeof payload === 'object' &&
    (payload as Record<string, unknown>)['v'] === SECRET_V1 &&
    typeof (payload as Record<string, unknown>)['salt'] === 'string' &&
    typeof (payload as Record<string, unknown>)['iv'] === 'string' &&
    typeof (payload as Record<string, unknown>)['ciphertext'] === 'string'
  );
}

async function deriveAesKeyFromPin(
  pin: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number = SECRET_KDF_ITERATIONS
): Promise<CryptoKey> {
  const pinBytes = new TextEncoder().encode(String(pin || ''));
  const baseKey  = await crypto.subtle.importKey('raw', pinBytes, 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptTextWithPin(plaintext: string, pin: string): Promise<EncryptedSecret> {
  const salt      = crypto.getRandomValues(new Uint8Array(16));
  const iv        = crypto.getRandomValues(new Uint8Array(12));
  const key       = await deriveAesKeyFromPin(pin, salt, SECRET_KDF_ITERATIONS);
  const data      = new TextEncoder().encode(String(plaintext || ''));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return {
    v:          SECRET_V1,
    kdf:        'PBKDF2-SHA256',
    iter:       SECRET_KDF_ITERATIONS,
    alg:        'AES-GCM-256',
    salt:       bytesToBase64(salt),
    iv:         bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted))
  };
}

async function decryptTextWithPin(payload: EncryptedSecret, pin: string): Promise<string> {
  if (!isEncryptedSecret(payload)) throw new Error('Invalid encrypted payload');
  const salt      = base64ToBytes(payload.salt);
  const iv        = base64ToBytes(payload.iv);
  const data      = base64ToBytes(payload.ciphertext);
  const key       = await deriveAesKeyFromPin(pin, salt, Number(payload.iter) || SECRET_KDF_ITERATIONS);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

/**
 * Clamp a lock-timeout value to [1, 1440] minutes. Returns 10 on invalid input.
 */
function normalizeLockTimeoutMinutes(value: unknown): number {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) return 10;
  if (parsed < 1)    return 1;
  if (parsed > 1440) return 1440;
  return parsed;
}

/**
 * Apply the stored theme preference to document.documentElement.
 * No-op when called from the service-worker context (no DOM).
 */
function applyTheme(settings: Partial<WalletSettings>): void {
  if (typeof document === 'undefined') return;
  const selected = (settings && settings.theme) || 'dark';
  let theme = selected as string;
  if (selected === 'system') {
    theme = (typeof window !== 'undefined' &&
             window.matchMedia &&
             window.matchMedia('(prefers-color-scheme: light)').matches)
      ? 'light'
      : 'dark';
  }
  document.documentElement.setAttribute('data-theme', theme);
}

function isTestnetNetwork(network: string): boolean {
  return network === 'xna-test' || network === 'xna-legacy-test' || network === 'xna-pq-test';
}

function toHardwareNetwork(network: string): 'Neurai' | 'NeuraiTest' {
  return isTestnetNetwork(network) ? 'NeuraiTest' : 'Neurai';
}

function toEsp32NetworkType(network: string): NeuraiSignESP32NetworkType {
  if (network === 'xna-legacy' || network === 'xna-legacy-test') {
    return network;
  }
  return isTestnetNetwork(network) ? 'xna-test' : 'xna';
}

async function setHardwareNetwork(device: NeuraiESP32Instance, walletNetwork: string): Promise<'Neurai' | 'NeuraiTest'> {
  const targetNetwork = toHardwareNetwork(walletNetwork);
  if (typeof device.setNetwork === 'function') {
    await device.setNetwork(targetNetwork);
    return targetNetwork;
  }

  const serialCapable = device as unknown as {
    serial?: { sendCommand?: (command: { action: string; network: string }, timeoutMs?: number) => Promise<unknown> };
  };

  if (typeof serialCapable.serial?.sendCommand !== 'function') {
    throw new Error('The connected hardware library does not support network selection.');
  }

  await serialCapable.serial.sendCommand({ action: 'set_network', network: targetNetwork }, 5000);
  return targetNetwork;
}

async function syncHardwareNetwork(device: NeuraiESP32Instance, walletNetwork?: string): Promise<'Neurai' | 'NeuraiTest'> {
  return setHardwareNetwork(device, walletNetwork || 'xna');
}

function validateHardwareWalletNetwork(selectedNetwork: string, deviceNetwork: string | null | undefined): void {
  const expectedNetwork = toHardwareNetwork(selectedNetwork);
  if (deviceNetwork && deviceNetwork !== expectedNetwork) {
    throw new Error(
      'The ESP32 is configured for ' + deviceNetwork + ' but the addon is set to ' + expectedNetwork
    );
  }
}

function isSerialPortSelectionCancelled(error: unknown): boolean {
  return !!(error && (
    (error as Error).name === 'NotFoundError' ||
    String((error as Error).message || '').includes('No port selected by the user')
  ));
}

export const NEURAI_UTILS = {
  SECRET_V1,
  SECRET_KDF_ITERATIONS,
  hashText,
  bytesToBase64,
  base64ToBytes,
  isEncryptedSecret,
  deriveAesKeyFromPin,
  encryptTextWithPin,
  decryptTextWithPin,
  normalizeLockTimeoutMinutes,
  applyTheme,
  isTestnetNetwork,
  toHardwareNetwork,
  toEsp32NetworkType,
  setHardwareNetwork,
  syncHardwareNetwork,
  validateHardwareWalletNetwork,
  isSerialPortSelectionCancelled
};
