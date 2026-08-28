#!/usr/bin/env node

// Copies browser-ready library bundles from node_modules to src/lib/, which is
// what the extension actually ships. Run via "postinstall" or "npm run sync-libs".
//
// Every bundle here is MANDATORY and a failure is fatal.
//
// It did not used to be: each copy was wrapped in a try/catch that warned and
// kept the previous file, then the script exited 0. A build could therefore
// claim one version and package another, and that is exactly what happened —
// src/lib/ drifted to create-transaction 0.3.1 (pre-NIP-040, no assetMarker)
// while package.json declared a newer range. In a signed extension the
// packaged bytes are the product, so a stale bundle must stop the build, not
// produce a warning nobody reads.
//
// NeuraiReader.js is the one exception: it is maintained locally, not copied.

const fs = require('fs');
const path = require('path');

const DEST = path.join(__dirname, 'src', 'lib');
fs.mkdirSync(DEST, { recursive: true });

/** Bundles copied verbatim from each package's browser global build. */
const BUNDLES = [
  ['NeuraiKey.js', 'neurai-key', 'NeuraiKey.global.js'],
  ['NeuraiMessage.js', 'neurai-message', 'NeuraiMessage.global.js'],
  ['NeuraiSignESP32.js', 'neurai-sign-esp32', 'NeuraiSignESP32.global.js'],
  ['NeuraiAssets.js', 'neurai-assets', 'NeuraiAssets.global.js'],
  ['NeuraiSignTransaction.js', 'neurai-sign-transaction', 'NeuraiSignTransaction.global.js'],
  ['NeuraiCreateTransaction.js', 'neurai-create-transaction', 'NeuraiCreateTransaction.global.js'],
  ['NeuraiScripts.js', 'neurai-scripts', 'NeuraiScripts.global.js']
];

function packageVersion(pkgName) {
  const manifest = path.join(__dirname, 'node_modules', '@neuraiproject', pkgName, 'package.json');
  return JSON.parse(fs.readFileSync(manifest, 'utf8')).version;
}

function copyFile(source, destination) {
  fs.copyFileSync(source, destination);
}

async function main() {
  console.log('Syncing Neurai libraries from npm to src/lib/...\n');

  for (const [fileName, pkgName, globalFile] of BUNDLES) {
    const source = path.join(__dirname, 'node_modules', '@neuraiproject', pkgName, 'dist', globalFile);
    const destination = path.join(DEST, fileName);

    if (!fs.existsSync(source)) {
      throw new Error(
        `${fileName}: missing ${path.relative(__dirname, source)}. ` +
        `Run "npm install" so @neuraiproject/${pkgName} is present, and check that ` +
        `the installed version still ships a browser global bundle.`
      );
    }

    copyFile(source, destination);
    const size = (fs.statSync(destination).size / 1024).toFixed(1);
    console.log(`  ${fileName} (${size} KB) <- @neuraiproject/${pkgName}@${packageVersion(pkgName)}`);
  }

  // Maintained locally (pure fetch, no npm bundle), but still mandatory.
  const readerPath = path.join(DEST, 'NeuraiReader.js');
  if (!fs.existsSync(readerPath)) {
    throw new Error('NeuraiReader.js is missing from src/lib/ and is not generated from npm');
  }
  console.log(`  NeuraiReader.js (${(fs.statSync(readerPath).size / 1024).toFixed(1)} KB) - local`);

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('sync-libs failed:', err);
  process.exit(1);
});
