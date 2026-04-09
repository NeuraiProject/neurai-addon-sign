#!/usr/bin/env node

// Copies/builds browser-ready library bundles from node_modules to src/lib/
// Run automatically via "postinstall" or manually with "npm run sync-libs"
//
// - NeuraiKey.js: copied from official browser global bundle
// - NeuraiMessage.js: copied from official browser global bundle
// - NeuraiSignESP32.js: copied from official browser global bundle
// - NeuraiAssets.js: copied from official browser global bundle
// - NeuraiReader.js: maintained locally (pure fetch-based, no npm bundle needed)

const fs = require('fs');
const path = require('path');

const DEST = path.join(__dirname, 'src', 'lib');
fs.mkdirSync(DEST, { recursive: true });

function copyFile(source, destination) {
  fs.copyFileSync(source, destination);
}

async function main() {
  console.log('Syncing Neurai libraries from npm to src/lib/...\n');

// 1. NeuraiKey - copy official browser global bundle from npm
const keyDest = path.join(DEST, 'NeuraiKey.js');
try {
  const keySource = path.join(__dirname, 'node_modules', '@neuraiproject', 'neurai-key', 'dist', 'NeuraiKey.global.js');
  copyFile(keySource, keyDest);
  const size = (fs.statSync(keyDest).size / 1024).toFixed(1);
  console.log(`  NeuraiKey.js (${size} KB) - copied from npm global bundle`);
} catch (err) {
  console.warn('  WARNING: Failed to copy NeuraiKey.js browser bundle');
  console.warn('  Error:', err.message);
  console.warn('  The existing src/lib/NeuraiKey.js will be kept.');
}

// 2. NeuraiMessage - copy official browser global bundle from npm
const messageDest = path.join(DEST, 'NeuraiMessage.js');
try {
  const messageSource = path.join(__dirname, 'node_modules', '@neuraiproject', 'neurai-message', 'dist', 'NeuraiMessage.global.js');
  copyFile(messageSource, messageDest);
  const size = (fs.statSync(messageDest).size / 1024).toFixed(1);
  console.log(`  NeuraiMessage.js (${size} KB) - copied from npm global bundle`);
} catch (err) {
  console.warn('  WARNING: Failed to copy NeuraiMessage.js browser bundle');
  console.warn('  Error:', err.message);
  console.warn('  The existing src/lib/NeuraiMessage.js will be kept.');
}

// 3. NeuraiSignESP32 - copy official browser global bundle from npm
const signEsp32Dest = path.join(DEST, 'NeuraiSignESP32.js');
try {
  const signEsp32Source = path.join(__dirname, 'node_modules', '@neuraiproject', 'neurai-sign-esp32', 'dist', 'NeuraiSignESP32.global.js');
  copyFile(signEsp32Source, signEsp32Dest);
  const size = (fs.statSync(signEsp32Dest).size / 1024).toFixed(1);
  console.log(`  NeuraiSignESP32.js (${size} KB) - copied from npm global bundle`);
} catch (err) {
  console.warn('  WARNING: Failed to copy NeuraiSignESP32.js browser bundle');
  console.warn('  Error:', err.message);
  console.warn('  The existing src/lib/NeuraiSignESP32.js will be kept (if any).');
}

// 4. NeuraiAssets - copy official browser global bundle from npm
const neuraiAssetsDest = path.join(DEST, 'NeuraiAssets.js');
try {
  const assetsSource = path.join(__dirname, 'node_modules', '@neuraiproject', 'neurai-assets', 'dist', 'NeuraiAssets.global.js');
  copyFile(assetsSource, neuraiAssetsDest);
  const size = (fs.statSync(neuraiAssetsDest).size / 1024).toFixed(1);
  console.log(`  NeuraiAssets.js (${size} KB) - copied from npm global bundle`);
} catch (err) {
  console.warn('  WARNING: Failed to copy NeuraiAssets.js browser bundle');
  console.warn('  Error:', err.message);
  console.warn('  The existing src/lib/NeuraiAssets.js will be kept (if any).');
}

// 5. NeuraiSignTransaction - copy official browser global bundle from npm
const signTxDest = path.join(DEST, 'NeuraiSignTransaction.js');
try {
  const signTxSource = path.join(__dirname, 'node_modules', '@neuraiproject', 'neurai-sign-transaction', 'dist', 'NeuraiSignTransaction.global.js');
  copyFile(signTxSource, signTxDest);
  const size = (fs.statSync(signTxDest).size / 1024).toFixed(1);
  console.log(`  NeuraiSignTransaction.js (${size} KB) - copied from npm global bundle`);
} catch (err) {
  console.warn('  WARNING: Failed to copy NeuraiSignTransaction.js browser bundle');
  console.warn('  Error:', err.message);
  console.warn('  The existing src/lib/NeuraiSignTransaction.js will be kept (if any).');
}

// 6. NeuraiCreateTransaction - copy official browser global bundle from npm
const createTxDest = path.join(DEST, 'NeuraiCreateTransaction.js');
try {
  const createTxSource = path.join(__dirname, 'node_modules', '@neuraiproject', 'neurai-create-transaction', 'dist', 'NeuraiCreateTransaction.global.js');
  copyFile(createTxSource, createTxDest);
  const size = (fs.statSync(createTxDest).size / 1024).toFixed(1);
  console.log(`  NeuraiCreateTransaction.js (${size} KB) - copied from npm global bundle`);
} catch (err) {
  console.warn('  WARNING: Failed to copy NeuraiCreateTransaction.js browser bundle');
  console.warn('  Error:', err.message);
  console.warn('  The existing src/lib/NeuraiCreateTransaction.js will be kept (if any).');
}

// 7. NeuraiReader - local file, just verify it exists
const readerPath = path.join(DEST, 'NeuraiReader.js');
if (fs.existsSync(readerPath)) {
  const size = (fs.statSync(readerPath).size / 1024).toFixed(1);
  console.log(`  NeuraiReader.js (${size} KB) - local (pure fetch, no npm needed)`);
} else {
  console.warn('  WARNING: NeuraiReader.js not found in src/lib/');
}

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('sync-libs failed:', err);
  process.exit(1);
});
