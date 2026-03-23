// Neurai Wallet - Page-facing API (runs in MAIN world)
// This file is injected by content.js into the page context
// so that window.neuraiWallet is visible to the page's JavaScript.

(function() {
  'use strict';

  // Internal: send request to content script and wait for response
  var _requestId = 0;
  var _pending = {};

  function _request(action, data) {
    return new Promise(function(resolve, reject) {
      var id = 'nw_' + (++_requestId) + '_' + Math.random().toString(36).substr(2, 6);
      _pending[id] = { resolve: resolve, reject: reject };

      document.dispatchEvent(new CustomEvent('neuraiWallet_request', {
        detail: { requestId: id, action: action, data: data || {} }
      }));

      // Timeout after 30 seconds
      setTimeout(function() {
        if (_pending[id]) {
          delete _pending[id];
          reject(new Error('Request timed out'));
        }
      }, 30000);
    });
  }

  // Listen for responses from content script
  document.addEventListener('neuraiWallet_response', function(e) {
    var detail = e.detail;
    var handler = _pending[detail.requestId];
    if (!handler) return;
    delete _pending[detail.requestId];

    if (detail.error) {
      handler.reject(new Error(detail.error));
    } else {
      handler.resolve(detail.result);
    }
  });

  // Expose API to the page
  window.neuraiWallet = {
    isInstalled: true,
    version: '0.7.5',

    getAddress: function() {
      return _request('getAddress');
    },

    getPublicKey: function() {
      return _request('getPublicKey');
    },

    isConnected: function() {
      return _request('isConnected');
    },

    signMessage: function(message) {
      if (!message || typeof message !== 'string') {
        return Promise.reject(new Error('Message must be a non-empty string'));
      }
      return _request('signMessage', { message: message });
    },

    verifyMessage: function(address, message, signature) {
      return _request('verifyMessage', { address: address, message: message, signature: signature });
    },

    /**
     * Sign a raw transaction hex using the wallet's private key via the Neurai RPC.
     * @param {string} txHex - Unsigned (or partially signed) raw transaction hex
     * @param {Array} utxos - Array of {txid, vout, scriptPubKey, amount} for inputs being signed
     * @param {string} sighashType - e.g. 'ALL', 'SINGLE|ANYONECANPAY'
     * @returns {Promise<{signedTxHex: string, complete: boolean}>}
     */
    signRawTransaction: function(txHex, utxos, sighashType) {
      if (!txHex || typeof txHex !== 'string') {
        return Promise.reject(new Error('txHex must be a non-empty string'));
      }
      return _request('signRawTransaction', { txHex: txHex, utxos: utxos || [], sighashType: sighashType || 'ALL' });
    },

    getInfo: function() {
      return _request('getInfo');
    }
  };

  // Notify the page that the API is ready
  document.dispatchEvent(new CustomEvent('neuraiWalletReady', {
    detail: { isInstalled: true, version: '0.7.5' }
  }));
})();
