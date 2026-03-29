#!/usr/bin/env node

// Build script: compiles TypeScript and copies all non-TS assets to dist/extension/
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC  = path.join(__dirname, 'src');
const DIST = path.join(__dirname, 'dist', 'extension');

// File extensions compiled by tsc — skip when copying assets to avoid duplicates
const TS_ONLY = new Set(['.ts']);

function copyAssets(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyAssets(srcPath, destPath);
    } else if (!TS_ONLY.has(path.extname(entry.name))) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Clean dist/extension
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true });
}

// Step 1: Compile TypeScript → dist/extension/
console.log('Compiling TypeScript...');
execSync('npx tsc', { cwd: __dirname, stdio: 'inherit' });

// Step 2: Copy non-TS assets (HTML, CSS, JSON, PNG, pre-compiled JS libs, inject.js…)
console.log('Copying assets...');
copyAssets(SRC, DIST);

console.log('Extension built to dist/extension/');

function listFiles(dir, prefix = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      console.log(`  ${prefix}${entry.name}/`);
      listFiles(path.join(dir, entry.name), prefix + '  ');
    } else {
      console.log(`  ${prefix}${entry.name}`);
    }
  }
}
listFiles(DIST);
