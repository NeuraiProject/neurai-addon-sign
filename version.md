# Version Update

To make a version change effective across the whole project, update these source files:

1. `package.json`
	Update the `version` field.

2. `src/manifest.json`
	Update the extension `version` field.

3. `src/content/inject.js`
	Update both hardcoded version strings exposed by `window.neuraiWallet`.

4. `src/popup/popup.html`
	Update the footer version label.

After changing these files, rebuild the project so the generated `dist/` files pick up the new version.