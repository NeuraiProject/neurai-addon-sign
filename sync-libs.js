#!/usr/bin/env node

// Copies/builds browser-ready library bundles from node_modules to src/lib/
// Run automatically via "postinstall" or manually with "npm run sync-libs"
//
// - NeuraiKey.js: copied from npm (ships browser bundle)
// - NeuraiMessage.js: built with browserify (npm package has no browser bundle)
// - NeuraiReader.js: maintained locally (pure fetch-based, no npm bundle needed)

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEST = path.join(__dirname, 'src', 'lib');
fs.mkdirSync(DEST, { recursive: true });

console.log('Syncing Neurai libraries from npm to src/lib/...\n');

// 1. NeuraiKey - has browser bundle in npm
const keyBundleSrc = path.join(__dirname, 'node_modules/@neuraiproject/neurai-key/dist/NeuraiKey.js');
const keyDest = path.join(DEST, 'NeuraiKey.js');

if (fs.existsSync(keyBundleSrc)) {
  fs.copyFileSync(keyBundleSrc, keyDest);
  const size = (fs.statSync(keyDest).size / 1024).toFixed(1);
  console.log(`  NeuraiKey.js (${size} KB) - copied from npm`);
} else {
  console.warn('  WARNING: NeuraiKey.js browser bundle not found in npm package');
  console.warn('  The existing src/lib/NeuraiKey.js will be kept.');
}

// 2. NeuraiMessage - no browser bundle in npm, build with browserify
const messageDest = path.join(DEST, 'NeuraiMessage.js');
try {
  // Create a temp entry file that re-exports as global
  const entryFile = path.join(__dirname, '.tmp-message-entry.js');
  fs.writeFileSync(entryFile, `
    var msg = require('@neuraiproject/neurai-message');
    var root =
      typeof globalThis !== 'undefined' ? globalThis :
      typeof self !== 'undefined' ? self :
      typeof window !== 'undefined' ? window :
      this;
    root.NeuraiMessage = msg;
    if (typeof module !== 'undefined') module.exports = msg;
  `);

  execSync(
    `npx browserify "${entryFile}" --standalone NeuraiMessage -o "${messageDest}"`,
    { cwd: __dirname, stdio: 'pipe' }
  );

  // Clean up temp file
  fs.unlinkSync(entryFile);

  const size = (fs.statSync(messageDest).size / 1024).toFixed(1);
  console.log(`  NeuraiMessage.js (${size} KB) - built with browserify`);
} catch (err) {
  console.warn('  WARNING: Failed to build NeuraiMessage.js browser bundle');
  console.warn('  Error:', err.message);
  console.warn('  The existing src/lib/NeuraiMessage.js will be kept.');
}

// 3. NeuraiSignESP32 - no browser bundle in npm, build with browserify
const signEsp32Dest = path.join(DEST, 'NeuraiSignESP32.js');
try {
  // ESM package with ESM deps — use esbuild (available via vite) to bundle as IIFE
  const entryFile = path.join(__dirname, '.tmp-sign-esp32-entry.mjs');
  fs.writeFileSync(entryFile, `
    export { NeuraiESP32, buildPSBT, buildPSBTFromRawTransaction, finalizePSBT,
      finalizeSignedPSBT, validatePSBT, buildAssetTransferDisplayMetadata,
      SerialConnection, getNetwork, neuraiMainnet, neuraiTestnet,
      neuraiLegacyMainnet, neuraiLegacyTestnet
    } from '@neuraiproject/neurai-sign-esp32';
  `);

  execSync(
    `npx esbuild "${entryFile}" --bundle --format=iife --global-name=NeuraiSignESP32` +
    ` --platform=browser --target=es2020 --outfile="${signEsp32Dest}"`,
    { cwd: __dirname, stdio: 'pipe' }
  );

  fs.unlinkSync(entryFile);

  const size = (fs.statSync(signEsp32Dest).size / 1024).toFixed(1);
  console.log(`  NeuraiSignESP32.js (${size} KB) - built with esbuild`);
} catch (err) {
  console.warn('  WARNING: Failed to build NeuraiSignESP32.js browser bundle');
  console.warn('  Error:', err.message);
  console.warn('  The existing src/lib/NeuraiSignESP32.js will be kept (if any).');
}

// 4. NeuraiReader - local file, just verify it exists
const readerPath = path.join(DEST, 'NeuraiReader.js');
if (fs.existsSync(readerPath)) {
  const size = (fs.statSync(readerPath).size / 1024).toFixed(1);
  console.log(`  NeuraiReader.js (${size} KB) - local (pure fetch, no npm needed)`);
} else {
  console.warn('  WARNING: NeuraiReader.js not found in src/lib/');
}

console.log('\nDone.');
