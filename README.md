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
*   **Neurai Connect**: Add the NeuraiWallet mobile app as an account by scanning a QR code; the phone keeps the keys and signs.

## Development

### Prerequisites

*   Node.js 22.18 or higher (the tests load the TypeScript sources directly)
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
*   **Libraries** (`lib/`): browser bundles of the `@neuraiproject/*` packages, copied from `node_modules` by `sync-libs.js` and checked byte for byte by `verify-libs.js`. `NeuraiConnect.js` is built with esbuild from `@neuraiproject/neurai-connect`, `@neuraiproject/neurai-connect-core` and `qrcode` (`neurai-connect-bundle.js`), because those packages ship no browser bundle. `NeuraiReader.js` is maintained in this repository.

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

## Networks and address types

Each account stores a network label, which `getInfo().network` returns. The labels predate `@neuraiproject/neurai-key` 5, which reuses some of them for other address types, so the extension maps them before every library call (`src/shared/networks.ts`):

| Label | Network | Address type | Example | neurai-key 5 label |
|---|---|---|---|---|
| `xna` | Mainnet | Legacy, `m/44'/1900'` | `N…` | `xna-legacy` |
| `xna-legacy` | Mainnet | Legacy, coin type 0 `m/44'/0'` | `N…` | `xna-old-legacy` |
| `xna-test` | Testnet | Legacy, `m/44'/1'` | `t…` | `xna-legacy-test` |
| `xna-ecdsa-test` | Testnet | ECDSA witness v3, `m/84'/1'` | `tnq1r…` | `xna-test` |
| `xna-pq-test` | Testnet | Post-quantum witness v2 (ML-DSA-44) | `tpq1z…` | `xna-pq-test` |

`xna-ecdsa` and `xna-pq` exist but are not offered for new accounts: the witness families are not active on mainnet. On the testnet, every family is active from block 10.

Message signatures follow the node's `signmessage` for each type. ECDSA witness and post-quantum v2 signatures are bound to the address, so a signature made for one address type does not verify for another.

### Testnet reset (2026-09-26)

The testnet was restarted from a new genesis block, `0000008b384aeffecdab182575dc4e86c9f07f90318c65088532660ed9a8a021`. Funds, transactions and assets of the previous testnet do not exist on the new one.

*   **RPC check.** Before using an RPC endpoint, the extension checks its genesis block with `getblockhash(0)`. A node of another chain, including the testnet before the reset, is refused with an error that names the RPC URL to fix in Settings.
*   **Asset marker.** Asset outputs use the marker that the node reports in `getblockchaininfo.asset_marker`: `rvn` up to block 9 and `xna` from block 10. A testnet RPC that does not report it is refused.
*   **Existing accounts.** Legacy accounts keep their addresses. A software testnet PQ account used the AuthScript v1 address of earlier releases (`tnq1p…`), which current nodes reject. On first load, the extension changes it to the witness v2 address of the same key (`tpq1z…`). The stored keys still sign, and no PIN is needed for this change. A hardware PQ account keeps the v1 family that the device signs, written as `tnc1p…`.
*   **Recipients.** Send refuses an address in the old `nq1p…` / `tnq1p…` form and asks for the current address. The same destination is now written `nc1p…` / `tnc1p…`.

## Neurai Connect accounts

In the onboarding, **Connect NeuraiWallet** adds the NeuraiWallet mobile app as an account. It works like WalletConnect:

1.  Choose Mainnet or Testnet and press **Show QR code**.
2.  Scan the code with NeuraiWallet and approve the connection on the phone. The traffic goes end-to-end encrypted through the relay at `wss://relay.neurai.org/v1`.
3.  Choose one of the addresses that NeuraiWallet shared, then press **Add**.

The extension stores the address, its public key (when the wallet shares it) and the session. It stores no private key and no recovery phrase.

| Operation | Neurai Connect account |
|---|---|
| Balance, assets and history | Yes, from the RPC. With the account key, over every receive and change address of the account. |
| `signMessage` from a site | Yes. A window shows the request and NeuraiWallet asks for approval on the phone. The extension checks the returned signature before it hands it to the site. |
| `verifyMessage`, `getAddress`, `getInfo` | Yes. `getInfo().walletType` is `connect`. |
| `signRawTransaction`, Send, Assets and DePIN | Only when the session settled `signPsbt` and the account is Legacy or ECDSA witness. Otherwise the extension refuses these requests up front and hides those tabs. |
| Backup | Not applicable: the keys stay in NeuraiWallet. |

A session lasts 7 days, and either side can revoke it. When it has ended, the next signature request shows a new QR code in the signing window. Once the same NeuraiWallet approves it, the account moves to the new session and the request continues. Only one NeuraiWallet signature request can be pending at a time.

### Transactions over Neurai Connect (`signPsbt`)

The session proposal lists `getAccountAddresses` and `signMessage` as required methods, and `signPsbt` and `neurai_getAccountXpub` as optional ones. NeuraiWallet settles an optional method only when the chosen wallet implements it. Legacy and ECDSA witness software wallets implement both. Transactions are turned on for the account only when the session settled `signPsbt`. They stay off for post-quantum accounts, because a PSBT has no field for an ML-DSA-44 signature.

To sign a transaction, the signing window:

1.  Reads every prevout with `getrawtransaction` from the account's RPC, after checking the genesis block, and builds a PSBT that carries each prevout as `nonWitnessUtxo`.
2.  Sends `signPsbt` with `signInputs` listing only the inputs of this account. Each entry names the address that owns the prevout and uses `sighashTypes: [1]`; `broadcast` is `false`.
3.  Finalizes the partial signatures that come back. A Legacy input gets a P2PKH scriptSig. An ECDSA witness v3 input gets the witness `[0x02, signature, compressed public key, 0x51]`.
4.  Restores any input that another signer had already signed, such as the seller's input in a swap. It then checks that the transaction spends the same outpoints, with the same sequences, into the same outputs. The background checks this again before it answers the site.

Before it signs, NeuraiWallet shows every output with its address and asset, what comes back to the wallet, what leaves it and the fee. It signs only its own inputs with SIGHASH_ALL and never broadcasts. A wallet that settles `signPsbt` but answers it with error 4200 has the method removed from the account, and transactions are turned off until a new session settles it.

### Following the whole NeuraiWallet account (`neurai_getAccountXpub`)

NeuraiWallet uses a new receive address per payment and a new change address per spend, so one address is not the whole account. When the session offers `neurai_getAccountXpub`, the review step shows **Follow every address of this NeuraiWallet account**, which is ticked by default. On **Add**, NeuraiWallet asks the user to share the account extended public key: `m/44'/coin'/0'` for Legacy, `m/84'/coin'/0'` for ECDSA witness, never the master key. With it, the extension:

*   Checks that the key fits the account. The family, path and chain must match, and the session address must be one of its children.
*   Derives the receive (`0/i`) and change (`1/i`) addresses and finds the used ones with a gap limit of 20 (`getaddressdeltas` and `getaddressmempool`). The scan runs again when the balance is refreshed, at most once a minute (`src/shared/connect-account.ts`).
*   Shows the balance, assets and history of every used address, and spends their UTXOs. NeuraiWallet signs each input with the key of its own address.
*   Sends change from spends made in the extension back to the session address. The extension does not hand out new addresses.

The key reveals the balance and history of the whole account but cannot spend. If the user refuses on the phone, the account is added with its one address.

## Related Packages

*   [@neuraiproject/neurai-key](https://www.npmjs.com/package/@neuraiproject/neurai-key) - Key generation and management
*   [@neuraiproject/neurai-message](https://www.npmjs.com/package/@neuraiproject/neurai-message) - Message signing and verification
*   [@neuraiproject/neurai-reader](https://www.npmjs.com/package/@neuraiproject/neurai-reader) - Blockchain RPC reader
*   [@neuraiproject/neurai-lock](https://www.npmjs.com/package/@neuraiproject/neurai-lock) - Authentication via wallet signatures
*   [@neuraiproject/neurai-connect](https://www.npmjs.com/package/@neuraiproject/neurai-connect) - Neurai Connect SDK for sites (QR pairing and sessions with NeuraiWallet)

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
