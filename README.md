# Neurai Sign Extension

A browser extension for managing Neurai (XNA) keys and securely signing messages. Available for Chrome and Firefox.

## Features

*   **Neurai (XNA) Web Wallet**: Browser extension for managing Neurai keys and addresses.
*   **Multi-Account Support**: Create and switch between multiple wallet accounts.
*   **Secure Message Signing**: Implements the Neurai protocol for signing messages via a popup approval interface.
*   **PIN Protection**: Encrypt your private keys with an access PIN and auto-lock timeout.
*   **DApp Provider**: Injects `window.neuraiWallet` into web pages for seamless wallet interaction.
*   **Balance & Assets**: View XNA balance and Neurai asset holdings with auto-refresh.
*   **Request History**: Track all signature requests with origin, message, and timestamp.
*   **Cross-Browser**: Supports Chrome (Manifest V3 service worker) and Firefox (Manifest V3 background page).

## Development

### Prerequisites

*   Node.js (v16 or higher recommended)
*   npm

### Setup

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Scripts

*   `npm run dev`: Starts the Vite development server for the test page.
*   `npm run build`: Builds both the extension and the test application.
*   `npm run build:ext`: Builds only the extension source files into `dist/extension/`.
*   `npm run pack`: Builds the extension and packages it into `dist/neurai-sign-extension.<manifest-version>.zip` for distribution.
*   `npm run sync-libs`: Synchronizes required libraries into the extension source.

### Loading in Chrome

1.  Run `npm run build:ext` or `npm run build`.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable "Developer mode" in the top right corner.
4.  Click "Load unpacked" and select the `dist/extension/` directory (or `src/` for development).

### Loading in Firefox

1.  Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2.  Click "Load Temporary Add-on".
3.  Select `firefox/manifest.json`.

## Architecture

```
src/          Chrome extension (Manifest V3 service worker)
firefox/      Firefox extension (Manifest V3 background page)
test-app/     Independent npm packages (@neuraiproject/*)
test-page/    Test pages for the extension API
```

*   **Background Script** (`background/`): Manages state, handles message signing approval, balance polling, and RPC calls. Chrome uses a service worker; Firefox uses a background page.
*   **Content Script** (`content/content.js`): Bridge between the web page and the extension. Injects `inject.js` into the page and forwards messages to the background.
*   **Injected Script** (`content/inject.js`): Runs in the page context and exposes the `window.neuraiWallet` API.
*   **Popup** (`popup/`): UI for managing keys, viewing balances, approving sign requests, and settings.
*   **Libraries** (`lib/`): Bundled `@neuraiproject/neurai-key`, `@neuraiproject/neurai-message`, and `@neuraiproject/neurai-reader`.

## Web API (`window.neuraiWallet`)

The extension injects a provider into web pages that exposes the following API:

```javascript
// Check if extension is installed
window.neuraiWallet.isInstalled  // boolean (sync)

// Get the wallet address
const address = await window.neuraiWallet.getAddress();
// Returns: string | null

// Sign a message (opens approval popup)
const { signature, address } = await window.neuraiWallet.signMessage("Hello Neurai");
// Returns: { signature: string, address: string }

// Verify a message signature
const valid = await window.neuraiWallet.verifyMessage(address, message, signature);
// Returns: boolean

// Get wallet info
const info = await window.neuraiWallet.getInfo();
// Returns: { hasWallet: boolean, address: string|null, publicKey: string|null, network: string }

// Check if wallet is connected
const connected = await window.neuraiWallet.isConnected();
// Returns: boolean

// Get the public key
const pubKey = await window.neuraiWallet.getPublicKey();
// Returns: string | null
```

All async methods have a 30-second timeout.

## Related Packages

*   [@neuraiproject/neurai-key](https://www.npmjs.com/package/@neuraiproject/neurai-key) - Key generation and management
*   [@neuraiproject/neurai-message](https://www.npmjs.com/package/@neuraiproject/neurai-message) - Message signing and verification
*   [@neuraiproject/neurai-reader](https://www.npmjs.com/package/@neuraiproject/neurai-reader) - Blockchain RPC reader
*   [@neuraiproject/neurai-lock](https://www.npmjs.com/package/@neuraiproject/neurai-lock) - Authentication via wallet signatures

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
