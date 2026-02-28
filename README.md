# Neurai Sign Extension

A browser extension for managing Neurai (XNA) keys and securely signing messages.

## Features

*   **Neurai (XNA) Web Wallet**: Browser extension for managing Neurai keys and addresses.
*   **Secure Message Signing**: Implements the Neurai protocol for signing messages via a popup interface.
*   **DApp Provider**: Injects a provider into web pages to allow seamless interaction between websites and the wallet.
*   **Balance & Verification**: Integration with the Neurai blockchain to read balances and verify addresses.
*   **Development Ready**: Includes a built-in test suite and automated packaging scripts.

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

### Loading the Extension in Chrome

1.  Run `npm run build:ext` or `npm run build`.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable "Developer mode" in the top right corner.
4.  Click "Load unpacked" and select the `dist/extension/` directory.

## Architecture

*   **Background Script**: Manages the extension's state and handles communication between the popup and content scripts.
*   **Content Script**: Injected into web pages to provide the Neurai API to DApps.
*   **Popup**: The user interface for managing keys, viewing balances, and approving sign requests.
*   **Libraries**: Uses `@neuraiproject/neurai-key`, `@neuraiproject/neurai-message`, and `@neuraiproject/neurai-reader` for core blockchain functionality.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
