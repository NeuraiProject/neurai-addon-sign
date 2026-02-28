#!/usr/bin/env node

// Creates dist/neurai-sign-extension.zip ready for Chrome Web Store upload.
// Run: npm run pack   (builds first, then zips)

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT    = __dirname;
const EXT_DIR = path.join(ROOT, 'dist', 'extension');
const MANIFEST_PATH = path.join(ROOT, 'src', 'manifest.json');

function getManifestVersion() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error('src/manifest.json not found');
  }
  const manifestRaw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const version = String(manifest.version || '').trim();
  if (!version) {
    throw new Error('manifest version is missing');
  }
  return version;
}

// Ensure the extension has been built
if (!fs.existsSync(EXT_DIR)) {
  console.error('ERROR: dist/extension/ not found. Run `npm run build` first.');
  process.exit(1);
}

let version;
try {
  version = getManifestVersion();
} catch (err) {
  console.error('ERROR: unable to read manifest version:', err.message);
  process.exit(1);
}

const outputName = `neurai-sign-extension.${version}.zip`;
const OUT_ZIP = path.join(ROOT, 'dist', outputName);

// Remove existing zip if present
if (fs.existsSync(OUT_ZIP)) {
  fs.unlinkSync(OUT_ZIP);
}

try {
  execSync(`zip -r "${OUT_ZIP}" .`, { cwd: EXT_DIR, stdio: 'inherit' });
  const sizeKB = (fs.statSync(OUT_ZIP).size / 1024).toFixed(1);
  console.log(`\nPacked: dist/${outputName} (${sizeKB} KB)`);
  console.log('Upload this file at: https://chrome.google.com/webstore/devconsole');
} catch (err) {
  console.error('zip failed:', err.message);
  console.error('Make sure the `zip` utility is installed (apt install zip).');
  process.exit(1);
}
