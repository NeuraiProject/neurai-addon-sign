// Neurai Wallet Content Script
// Bridge between the web page (MAIN world) and the extension (background)
//
// Chrome content scripts run in an ISOLATED world - they share the DOM with
// the page but NOT the JavaScript window object. So we use two layers:
//
// 1. Inject content/inject.js into the page's MAIN world via <script src>
//    That file defines window.neuraiWallet and communicates via DOM events
//
// 2. This content script listens for those DOM events and forwards them
//    to the background service worker via chrome.runtime.sendMessage

(function() {
  'use strict';

  // === STEP 1: Inject the page-facing API into the MAIN world ===
  const pageScript = document.createElement('script');
  pageScript.src = chrome.runtime.getURL('content/inject.js');
  (document.head || document.documentElement).appendChild(pageScript);


  // === STEP 2: Bridge events from page to background ===

  // Listen for requests from the page (MAIN world)
  document.addEventListener('neuraiWallet_request', async (event) => {
    const { requestId, action, data } = event.detail;

    try {
      // Detect stale content scripts (extension reloaded without page refresh)
      if (!chrome.runtime?.id) {
        document.dispatchEvent(new CustomEvent('neuraiWallet_response', {
          detail: { requestId, error: 'Extension was reloaded — please refresh this page.' }
        }));
        return;
      }

      let result;

      switch (action) {
        case 'getAddress': {
          const resp = await chrome.runtime.sendMessage({ type: 'GET_WALLET_INFO' });
          result = (resp && resp.hasWallet) ? resp.address : null;
          break;
        }

        case 'getPublicKey': {
          const resp = await chrome.runtime.sendMessage({ type: 'GET_WALLET_INFO' });
          result = (resp && resp.hasWallet) ? resp.publicKey : null;
          break;
        }

        case 'isConnected': {
          const resp = await chrome.runtime.sendMessage({ type: 'GET_WALLET_INFO' });
          result = !!(resp && resp.hasWallet);
          break;
        }

        case 'signMessage': {
          const resp = await chrome.runtime.sendMessage({
            type: 'SIGN_MESSAGE',
            message: data.message
          });
          if (resp && resp.success) {
            result = { signature: resp.signature, address: resp.address };
          } else {
            throw new Error(resp?.error || 'Failed to sign message');
          }
          break;
        }

        case 'verifyMessage': {
          const resp = await chrome.runtime.sendMessage({
            type: 'VERIFY_OWNERSHIP',
            address: data.address,
            message: data.message,
            signature: data.signature
          });
          result = !!(resp && resp.valid);
          break;
        }

        case 'signRawTransaction': {
          const resp = await chrome.runtime.sendMessage({
            type: 'SIGN_RAW_TX',
            txHex: data.txHex,
            utxos: data.utxos,
            sighashType: data.sighashType
          });
          if (resp && resp.success) {
            result = { signedTxHex: resp.signedTxHex, complete: resp.complete };
          } else {
            throw new Error(resp?.error || 'Failed to sign raw transaction');
          }
          break;
        }

        case 'getInfo': {
          const resp = await chrome.runtime.sendMessage({ type: 'GET_WALLET_INFO' });
          result = {
            hasWallet: !!(resp && resp.hasWallet),
            address: resp?.address || null,
            publicKey: resp?.publicKey || null,
            network: resp?.network || 'xna'
          };
          break;
        }

        default:
          throw new Error('Unknown action: ' + action);
      }

      // Send result back to page
      document.dispatchEvent(new CustomEvent('neuraiWallet_response', {
        detail: { requestId, result }
      }));

    } catch (error) {
      const msg = (error.message || '').includes('Extension context invalidated')
        ? 'Extension was reloaded — please refresh this page.'
        : error.message;
      document.dispatchEvent(new CustomEvent('neuraiWallet_response', {
        detail: { requestId, error: msg }
      }));
    }
  });

  console.log('Neurai Wallet content script loaded');
})();
