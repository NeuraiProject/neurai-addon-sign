#!/usr/bin/env node

// Build both extension and test app
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('=== Building Neurai Sign Extension ===\n');

// 1. Build extension (copy src to dist/extension)
console.log('1. Building extension...');
const { execSync } = require('child_process');
execSync('node build-ext.js', { cwd: ROOT, stdio: 'inherit' });

// 2. Build test app (copy files)
console.log('\n2. Building test app...');
const DIST_TEST = path.join(ROOT, 'dist', 'test-app');

// Clean
if (fs.existsSync(DIST_TEST)) {
  fs.rmSync(DIST_TEST, { recursive: true });
}
fs.mkdirSync(DIST_TEST, { recursive: true });

// Copy test-app files (html, css, js)
const testAppDir = path.join(ROOT, 'test-app');
for (const file of ['index.html', 'app.css', 'app.js', 'verify-identity.html']) {
  const src = path.join(testAppDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(DIST_TEST, file));
  }
}

// Copy libs to test-app/lib/
const libDest = path.join(DIST_TEST, 'lib');
fs.mkdirSync(libDest, { recursive: true });
const srcLib = path.join(ROOT, 'src', 'lib');
for (const file of fs.readdirSync(srcLib)) {
  fs.copyFileSync(path.join(srcLib, file), path.join(libDest, file));
}

console.log('Test app built to dist/test-app/');

console.log('\n=== Build complete ===');
console.log('  dist/extension/  → Load as unpacked extension in Chrome');
console.log('  dist/test-app/   → Open index.html or serve with any HTTP server');
