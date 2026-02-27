// Neurai Wallet — Shared Utilities
// Loaded via importScripts() in the service worker and via <script> in popup pages.

/* global globalThis, self */
(function (root) {
  root.NEURAI_UTILS = {
    SECRET_V1: 1,
    SECRET_KDF_ITERATIONS: 210000,

    /**
     * Hash a UTF-8 string with SHA-256 and return a lowercase hex string.
     * @param {string} value
     * @returns {Promise<string>}
     */
    async hashText(value) {
      const encoded = new TextEncoder().encode(value);
      const digest  = await crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    },

    bytesToBase64(bytes) {
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        const part = bytes.subarray(i, i + chunk);
        binary += String.fromCharCode.apply(null, part);
      }
      return btoa(binary);
    },

    base64ToBytes(base64) {
      const binary = atob(base64);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    },

    isEncryptedSecret(payload) {
      return !!(payload &&
        typeof payload === 'object' &&
        payload.v === this.SECRET_V1 &&
        typeof payload.salt === 'string' &&
        typeof payload.iv === 'string' &&
        typeof payload.ciphertext === 'string');
    },

    async deriveAesKeyFromPin(pin, salt, iterations = this.SECRET_KDF_ITERATIONS) {
      const pinBytes = new TextEncoder().encode(String(pin || ''));
      const baseKey = await crypto.subtle.importKey('raw', pinBytes, 'PBKDF2', false, ['deriveKey']);
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    },

    async encryptTextWithPin(plaintext, pin) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv   = crypto.getRandomValues(new Uint8Array(12));
      const key  = await this.deriveAesKeyFromPin(pin, salt, this.SECRET_KDF_ITERATIONS);
      const data = new TextEncoder().encode(String(plaintext || ''));
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
      return {
        v: this.SECRET_V1,
        kdf: 'PBKDF2-SHA256',
        iter: this.SECRET_KDF_ITERATIONS,
        alg: 'AES-GCM-256',
        salt: this.bytesToBase64(salt),
        iv: this.bytesToBase64(iv),
        ciphertext: this.bytesToBase64(new Uint8Array(encrypted))
      };
    },

    async decryptTextWithPin(payload, pin) {
      if (!this.isEncryptedSecret(payload)) throw new Error('Invalid encrypted payload');
      const salt = this.base64ToBytes(payload.salt);
      const iv   = this.base64ToBytes(payload.iv);
      const data = this.base64ToBytes(payload.ciphertext);
      const key  = await this.deriveAesKeyFromPin(pin, salt, Number(payload.iter) || this.SECRET_KDF_ITERATIONS);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
      return new TextDecoder().decode(decrypted);
    },

    /**
     * Clamp a lock-timeout value to [1, 1440] minutes. Returns 10 on invalid input.
     * @param {*} value
     * @returns {number}
     */
    normalizeLockTimeoutMinutes(value) {
      const parsed = Number.parseInt(value, 10);
      if (Number.isNaN(parsed)) return 10;
      if (parsed < 1)    return 1;
      if (parsed > 1440) return 1440;
      return parsed;
    },

    /**
     * Apply the stored theme preference to document.documentElement.
     * No-op when called from the service-worker context (no DOM).
     * @param {{ theme?: string }} settings
     */
    applyTheme(settings) {
      if (typeof document === 'undefined') return;
      const selected = (settings && settings.theme) || 'dark';
      let theme = selected;
      if (selected === 'system') {
        theme = (typeof window !== 'undefined' &&
                 window.matchMedia &&
                 window.matchMedia('(prefers-color-scheme: light)').matches)
          ? 'light'
          : 'dark';
      }
      document.documentElement.setAttribute('data-theme', theme);
    }

  };
}(
  typeof globalThis !== 'undefined' ? globalThis :
  typeof self       !== 'undefined' ? self       :
  typeof window     !== 'undefined' ? window     : this
));
