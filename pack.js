#!/usr/bin/env node

// Creates dist/neurai-sign-extension.zip ready for Chrome Web Store upload.
// Run: npm run pack   (builds first, then zips)

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT    = __dirname;
const EXT_DIR = path.join(ROOT, 'dist', 'extension');
const OUT_ZIP = path.join(ROOT, 'dist', 'neurai-sign-extension.zip');

// Ensure the extension has been built
if (!fs.existsSync(EXT_DIR)) {
  console.error('ERROR: dist/extension/ not found. Run `npm run build` first.');
  process.exit(1);
}

// Remove existing zip if present
if (fs.existsSync(OUT_ZIP)) {
  fs.unlinkSync(OUT_ZIP);
}

try {
  execSync(`zip -r "${OUT_ZIP}" .`, { cwd: EXT_DIR, stdio: 'inherit' });
  const sizeKB = (fs.statSync(OUT_ZIP).size / 1024).toFixed(1);
  console.log(`\nPacked: dist/neurai-sign-extension.zip (${sizeKB} KB)`);
  console.log('Upload this file at: https://chrome.google.com/webstore/devconsole');
} catch (err) {
  console.error('zip failed:', err.message);
  console.error('Make sure the `zip` utility is installed (apt install zip).');
  process.exit(1);
}
