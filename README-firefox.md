# Neurai Sign — Firefox Extension

A Firefox browser extension for managing Neurai (XNA) keys and securely signing messages using digital signatures on the Neurai blockchain.

## Features

*   **Neurai (XNA) Web Wallet**: Manage Neurai keys and addresses directly from Firefox.
*   **Multi-Account Support**: Create and switch between multiple wallet accounts.
*   **Secure Message Signing**: Sign messages via a popup approval interface with PIN protection.
*   **PIN Protection**: Encrypt your private keys with an access PIN and configurable auto-lock timeout.
*   **DApp Provider**: Injects `window.neuraiWallet` into web pages for seamless wallet interaction.
*   **Balance & Assets**: View XNA balance and Neurai asset holdings with auto-refresh.
*   **Request History**: Track all signature requests with origin, message, and timestamp.

## Build Instructions (for AMO reviewers)

These instructions produce an exact copy of the submitted add-on from source.

### System requirements

*   **OS**: Linux, macOS, or Windows (with bash/WSL for the build script)
*   **Node.js**: v18 or higher (tested with v22.11.0)
*   **npm**: v8 or higher (tested with v10.9.0)

### Step-by-step build

```bash
# 1. Clone the repository
git clone https://github.com/nicneufeld/neurai-addon-sign.git
cd neurai-addon-sign

# 2. Install dependencies (also runs sync-libs automatically via postinstall)
npm install

# 3. Build the Firefox extension from the Chrome source
./build-firefox-addon.sh
```

The built Firefox extension is now in the `firefox/` directory. You can load it in Firefox via `about:debugging#/runtime/this-firefox` > "Load Temporary Add-on" > select `firefox/manifest.json`.

To create a zip for distribution:

```bash
./build-firefox-addon.sh --pack
# Output: dist/neurai-sign-firefox.<version>.zip
```

### What the build script does

The extension source lives in `src/` (Chrome version). The `build-firefox-addon.sh` script copies files to `firefox/` with three targeted modifications:

1.  **`manifest.json`**: Changes `background.service_worker` to `background.page`, removes the `"windows"` permission (not needed in Firefox), and adds `browser_specific_settings.gecko`.
2.  **`background/background.js`**: Removes the Chrome service worker preamble (`globalThis.window` shim and `importScripts()` block) since Firefox loads scripts via `<script>` tags in `background.html`.
3.  **`content/content.js`**: Adds a `cloneInto()` wrapper around event detail objects for Firefox Xray security boundary compatibility.

All other files (popup UI, icons, shared utilities, inject script) are copied as-is.

### Library bundles in `lib/`

The `lib/` directory contains three browser-ready bundles built from open-source npm packages:

| File | Source | How it is built |
|---|---|---|
| `NeuraiKey.js` | [@neuraiproject/neurai-key](https://www.npmjs.com/package/@neuraiproject/neurai-key) v2.8.7 | Copied from npm package (`dist/NeuraiKey.js` — the package ships a pre-built browser bundle) |
| `NeuraiMessage.js` | [@neuraiproject/neurai-message](https://www.npmjs.com/package/@neuraiproject/neurai-message) v0.7.1 | Built with `browserify` (the npm package has no browser bundle, so `sync-libs.js` creates one via `npx browserify`) |
| `NeuraiReader.js` | Hand-written, not from npm | Pure `fetch`-based RPC client, not transpiled or bundled — source is the file itself |

The `sync-libs.js` script (run automatically during `npm install` via the `postinstall` hook) handles building and copying these bundles into `src/lib/`. The build script then copies them into `firefox/lib/`.

To regenerate the library bundles manually:

```bash
npm run sync-libs
```

### Source files overview

All extension source files (except the three library bundles above) are hand-written, non-minified, non-transpiled JavaScript, HTML, and CSS:

```
background/background.html  — Firefox background page (loads scripts via <script> tags)
background/background.js    — Extension logic: state, signing, balance polling, RPC
content/content.js          — Content script bridge (isolated world <-> background)
content/inject.js           — Page-injected API (window.neuraiWallet)
popup/popup.html            — Main popup UI
popup/popup.js              — Popup logic
popup/popup.css             — Popup styles
popup/expanded.html         — Full-page wallet view
popup/expanded.js           — Expanded view logic
popup/expanded.css          — Expanded view styles
popup/sign-request.html     — Signature approval dialog
popup/sign-request.js       — Sign request logic
popup/sign-request.css      — Sign request styles
shared/constants.js         — Shared constants (RPC endpoints, defaults)
shared/utils.js             — Shared utility functions
icons/                      — Extension icons (16, 48, 128 px PNG)
manifest.json               — Firefox Manifest V3
```

## Installation

### Temporary (Development)

1.  Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2.  Click "Load Temporary Add-on".
3.  Select the `manifest.json` file from this directory.

### From AMO (Production)

Coming soon on [addons.mozilla.org](https://addons.mozilla.org/).

## Architecture

*   **Background** (`background/background.html`): Loads libraries via `<script>` tags and runs `background.js` which manages state, message signing approval, balance polling, and RPC calls.
*   **Content Script** (`content/content.js`): Bridge between the web page and the extension. Injects `inject.js` into the page context and forwards messages to the background. Uses `cloneInto()` for Firefox Xray wrapper compatibility.
*   **Injected Script** (`content/inject.js`): Runs in the page's main world and exposes the `window.neuraiWallet` API.
*   **Popup** (`popup/`): UI for managing wallets, viewing balances, approving sign requests, and settings.

## Web API (`window.neuraiWallet`)

The extension injects a provider into web pages:

```javascript
// Check if extension is installed
window.neuraiWallet.isInstalled  // boolean (sync)

// Get the wallet address
const address = await window.neuraiWallet.getAddress();

// Sign a message (opens approval popup)
const { signature, address } = await window.neuraiWallet.signMessage("Hello Neurai");

// Verify a message signature
const valid = await window.neuraiWallet.verifyMessage(address, message, signature);

// Get wallet info
const info = await window.neuraiWallet.getInfo();
// { hasWallet, address, publicKey, network }

// Check connection / get public key
const connected = await window.neuraiWallet.isConnected();
const pubKey = await window.neuraiWallet.getPublicKey();
```

All async methods have a 30-second timeout.

## Firefox-Specific Notes

*   Uses Manifest V3 with a **background page** (`background.html`) instead of a service worker.
*   Libraries are loaded via `<script>` tags in `background.html` (Firefox MV3 does not support `importScripts()`).
*   Content script uses `cloneInto()` to pass objects across the Xray wrapper boundary between the content script and page script contexts.
*   Requires Firefox 109+ (first version with Manifest V3 support).
*   The `chrome.*` compatibility namespace is used throughout for API calls, which Firefox supports natively.

## Related Packages

*   [@neuraiproject/neurai-key](https://www.npmjs.com/package/@neuraiproject/neurai-key) - Key generation and management
*   [@neuraiproject/neurai-message](https://www.npmjs.com/package/@neuraiproject/neurai-message) - Message signing and verification
*   [@neuraiproject/neurai-reader](https://www.npmjs.com/package/@neuraiproject/neurai-reader) - Blockchain RPC reader
*   [@neuraiproject/neurai-lock](https://www.npmjs.com/package/@neuraiproject/neurai-lock) - Authentication via wallet signatures

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
