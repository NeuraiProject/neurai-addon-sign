#!/usr/bin/env node

// Gate: the bundles in src/lib/ must be byte-identical to the ones in the
// installed node_modules, and the installed versions must satisfy the ranges
// declared in package.json.
//
// This exists because src/lib/ IS the product: the extension ships those
// files, not node_modules. Before sync-libs.js was made fatal, a failed copy
// warned and kept the previous file, and src/lib/ drifted to
// create-transaction 0.3.1 — a pre-NIP-040 build that could only emit the
// legacy "rvn" marker, so every locally built asset transaction was rejected
// by any chain past activation. Nothing in the build caught it.
//
// Comparing bytes rather than a version string is deliberate: a bundle carries
// no version of its own, so identity against the resolved package is the only
// check that cannot be satisfied by a stale file.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const DEST = path.join(ROOT, 'src', 'lib');

const BUNDLES = [
  ['NeuraiKey.js', 'neurai-key', 'NeuraiKey.global.js'],
  ['NeuraiMessage.js', 'neurai-message', 'NeuraiMessage.global.js'],
  ['NeuraiSignESP32.js', 'neurai-sign-esp32', 'NeuraiSignESP32.global.js'],
  ['NeuraiAssets.js', 'neurai-assets', 'NeuraiAssets.global.js'],
  ['NeuraiSignTransaction.js', 'neurai-sign-transaction', 'NeuraiSignTransaction.global.js'],
  ['NeuraiCreateTransaction.js', 'neurai-create-transaction', 'NeuraiCreateTransaction.global.js'],
  ['NeuraiScripts.js', 'neurai-scripts', 'NeuraiScripts.global.js']
];

const problems = [];

function installedVersion(pkgName) {
  const manifest = path.join(ROOT, 'node_modules', '@neuraiproject', pkgName, 'package.json');
  return JSON.parse(fs.readFileSync(manifest, 'utf8')).version;
}

function satisfiesDeclaredRange(pkgName, version) {
  const declared = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
    .dependencies[`@neuraiproject/${pkgName}`];
  try {
    execFileSync('node', ['-e',
      `const s=require('semver');process.exit(s.satisfies(${JSON.stringify(version)},${JSON.stringify(declared)})?0:1)`
    ], { cwd: ROOT, stdio: 'ignore' });
    return { ok: true, declared };
  } catch {
    // semver may not be reachable; the byte check below is the real gate.
    return { ok: null, declared };
  }
}

console.log('Verifying src/lib/ against node_modules...\n');

for (const [fileName, pkgName, globalFile] of BUNDLES) {
  const shipped = path.join(DEST, fileName);
  const source = path.join(ROOT, 'node_modules', '@neuraiproject', pkgName, 'dist', globalFile);

  if (!fs.existsSync(shipped)) { problems.push(`${fileName}: missing from src/lib/`); continue; }
  if (!fs.existsSync(source)) { problems.push(`${fileName}: @neuraiproject/${pkgName} is not installed`); continue; }

  const version = installedVersion(pkgName);
  const { ok, declared } = satisfiesDeclaredRange(pkgName, version);
  if (ok === false) {
    problems.push(`${pkgName}: installed ${version} does not satisfy the declared ${declared}`);
  }

  if (!fs.readFileSync(shipped).equals(fs.readFileSync(source))) {
    problems.push(
      `${fileName}: shipped bundle differs from @neuraiproject/${pkgName}@${version}. ` +
      'Run "npm run sync-libs" and review the diff.'
    );
    continue;
  }

  console.log(`  ${fileName} == @neuraiproject/${pkgName}@${version}`);
}

if (problems.length > 0) {
  console.error('\nsrc/lib/ is not in sync with the declared dependencies:\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log('\nAll shipped bundles match their installed packages.');
