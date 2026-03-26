#!/usr/bin/env bash
#
# build-firefox-addon.sh
# Builds the Firefox extension from the Chrome source (src/) into dist/firefox/,
# applying the Firefox-specific adaptations automatically.
#
# Usage: ./build-firefox-addon.sh [--pack] [--source]
#   --pack    Create extension zip ready for AMO upload
#   --source  Create source code zip required by AMO for review

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/src"
FF="$ROOT/dist/firefox"

# ── Files that are copied as-is from Chrome ──────────────────────────────────
# Everything except the 3 files that need Firefox-specific changes:
#   manifest.json, background/background.js, content/content.js
# Plus background/background.html which only exists in Firefox.

COPY_DIRS=(
  icons
  lib
  shared
  popup
  onboarding
)

COPY_FILES=(
  content/inject.js
)

echo "=== Building Firefox addon from src/ ==="
echo ""

mkdir -p "$FF/background" "$FF/content"

# ── Step 1: Copy shared directories ──────────────────────────────────────────
for dir in "${COPY_DIRS[@]}"; do
  if [ -d "$SRC/$dir" ]; then
    rm -rf "$FF/$dir"
    cp -r "$SRC/$dir" "$FF/$dir"
    echo "  Copied $dir/"
  else
    echo "  WARNING: $SRC/$dir not found, skipping"
  fi
done

# ── Step 2: Copy individual shared files ─────────────────────────────────────
for file in "${COPY_FILES[@]}"; do
  if [ -f "$SRC/$file" ]; then
    mkdir -p "$FF/$(dirname "$file")"
    cp "$SRC/$file" "$FF/$file"
    echo "  Copied $file"
  else
    echo "  WARNING: $SRC/$file not found, skipping"
  fi
done

# ── Step 3: Build manifest.json (Firefox version) ───────────────────────────
# Read version and metadata from Chrome manifest, produce Firefox manifest
# with background.page instead of service_worker and gecko settings.
node -e "
  const fs = require('fs');
  const chrome = JSON.parse(fs.readFileSync('$SRC/manifest.json', 'utf8'));

  // Replace service_worker with background page
  chrome.background = { page: 'background/background.html' };

  // Remove permissions not valid in Firefox
  chrome.permissions = (chrome.permissions || []).filter((p) => !['windows'].includes(p));

  // Add Firefox-specific settings
  chrome.browser_specific_settings = {
    gecko: {
      id: 'neurai-sign@neuraiproject.org',
      strict_min_version: '109.0',
      data_collection_permissions: {
        required: ['none']
      }
    }
  };

  // Write with consistent key order: browser_specific_settings after short_name
  const ordered = {};
  for (const [key, value] of Object.entries(chrome)) {
    ordered[key] = value;
    if (key === 'short_name' && !chrome.hasOwnProperty('browser_specific_settings_done')) {
      // already set above, will appear in its natural insertion order
    }
  }

  fs.writeFileSync('$FF/manifest.json', JSON.stringify(chrome, null, 2) + '\n');
  console.log('  Built manifest.json (background.page + gecko settings)');
"

# ── Step 4: Build background.js (Firefox version) ───────────────────────────
# Remove the service worker-specific header (globalThis.window hack + importScripts)
# and replace with Firefox header comment.
node -e "
  const fs = require('fs');
  const src = fs.readFileSync('$SRC/background/background.js', 'utf8');
  const lines = src.split('\n');

  // Find the line after the importScripts block (first blank line after closing brace+semicolon)
  // The Chrome header pattern is:
  //   Lines 1-2: comments
  //   Lines 4-7: globalThis.window hack
  //   Lines 9-19: importScripts try/catch
  //   Line 20: blank
  //   Line 21+: actual code starting with '// -- State --'

  // Find where the actual code starts (after importScripts block)
  let codeStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\/\/ ── State/)) {
      codeStart = i;
      break;
    }
  }

  const header = [
    '// Neurai Wallet — Background Script (Firefox)',
    '// Handles balance polling, message signing approval, and RPC calls.',
    '// Scripts are loaded via <script> tags in background.html.',
    '',
    ''
  ].join('\n');

  const code = lines.slice(codeStart).join('\n');
  fs.writeFileSync('$FF/background/background.js', header + code);
  console.log('  Built background/background.js (removed importScripts, added Firefox header)');
"

# ── Step 5: Build content.js (Firefox version) ──────────────────────────────
# Add cloneInto() for Xray wrapper compatibility in event dispatching.
node -e "
  const fs = require('fs');
  const src = fs.readFileSync('$SRC/content/content.js', 'utf8');

  // Replace the Chrome header comment with Firefox version
  let code = src.replace(
    /\/\/ Neurai Wallet Content Script\n\/\/ Bridge between the web page.*?\n\/\/\n\/\/ Chrome content scripts/,
    '// Neurai Wallet Content Script (Firefox)\n// Bridge between the web page (MAIN world) and the extension (background)\n//\n// Content scripts'
  );

  // Update comment about service worker
  code = code.replace(
    'to the background service worker via chrome.runtime.sendMessage',
    'to the background script via chrome.runtime.sendMessage'
  );

  // Add Firefox Xray wrapper note after the header comments
  code = code.replace(
    \"(function() {\\n  'use strict';\",
    \"// Firefox note: objects created in the content script context cannot be\\n\" +
    \"// read by page scripts (Xray wrappers). We use cloneInto() to clone\\n\" +
    \"// event detail objects into the page scope so inject.js can access them.\\n\" +
    \"\\n(function() {\\n  'use strict';\"
  );

  // Add the sendResponseToPage helper after the script injection block
  code = code.replace(
    \"(document.head || document.documentElement).appendChild(pageScript);\\n\\n\\n  // === STEP 2\",
    \"(document.head || document.documentElement).appendChild(pageScript);\\n\\n\" +
    \"  // Helper: dispatch a response event with detail cloned into the page scope\\n\" +
    \"  function sendResponseToPage(detail) {\\n\" +
    \"    document.dispatchEvent(new CustomEvent('neuraiWallet_response', {\\n\" +
    \"      detail: cloneInto(detail, window)\\n\" +
    \"    }));\\n\" +
    \"  }\\n\\n\" +
    \"  // === STEP 2\"
  );

  // Replace direct dispatchEvent calls with sendResponseToPage
  code = code.replace(
    /\/\/ Send result back to page\n\s*document\.dispatchEvent\(new CustomEvent\('neuraiWallet_response', \{\n\s*detail: \{ requestId, result \}\n\s*\}\)\);/,
    '// Send result back to page (cloneInto for Firefox Xray compat)\n      sendResponseToPage({ requestId, result });'
  );

  code = code.replace(
    /document\.dispatchEvent\(new CustomEvent\('neuraiWallet_response', \{\n\s*detail: \{ requestId, error: error\.message \}\n\s*\}\)\);/,
    'sendResponseToPage({ requestId, error: error.message });'
  );

  fs.writeFileSync('$FF/content/content.js', code);
  console.log('  Built content/content.js (added cloneInto for Xray wrappers)');
"

# ── Step 6: Create background.html (Firefox-only) ───────────────────────────
cat > "$FF/background/background.html" << 'EOF'
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <script src="../lib/NeuraiKey.js"></script>
  <script src="../lib/NeuraiMessage.js"></script>
  <script src="../shared/constants.js"></script>
  <script src="../shared/utils.js"></script>
  <script src="background.js"></script>
</body>
</html>
EOF
echo "  Created background/background.html"

# ── Step 7: Copy LICENSE from project root ───────────────────────────────────
cp "$ROOT/LICENSE" "$FF/LICENSE"
echo "  Copied LICENSE"

echo ""
echo "Firefox addon built in: $FF"

# ── Parse options ─────────────────────────────────────────────────────────────
DO_PACK=false
DO_SOURCE=false
for arg in "$@"; do
  case "$arg" in
    --pack)   DO_PACK=true ;;
    --source) DO_SOURCE=true ;;
  esac
done

VERSION=$(node -e "const m=JSON.parse(require('fs').readFileSync('$FF/manifest.json','utf8'));console.log(m.version)")

# ── Optional: Pack extension into zip ────────────────────────────────────────
if $DO_PACK; then
  OUT_ZIP="$ROOT/dist/neurai-sign-firefox.${VERSION}.zip"
  mkdir -p "$ROOT/dist"
  [ -f "$OUT_ZIP" ] && rm "$OUT_ZIP"
  (cd "$FF" && zip -r "$OUT_ZIP" . -x '*/.*')
  SIZE=$(du -h "$OUT_ZIP" | cut -f1)
  echo ""
  echo "Packed: dist/neurai-sign-firefox.${VERSION}.zip ($SIZE)"
  echo "Upload this as the extension package."
fi

# ── Optional: Pack source code for AMO review ────────────────────────────────
if $DO_SOURCE; then
  SRC_ZIP="$ROOT/dist/neurai-sign-firefox-source.${VERSION}.zip"
  mkdir -p "$ROOT/dist"
  [ -f "$SRC_ZIP" ] && rm "$SRC_ZIP"
  (cd "$ROOT" && zip -r "$SRC_ZIP" \
    src/ \
    package.json \
    sync-libs.js \
    build-firefox-addon.sh \
    README.md \
    LICENSE \
    -x '*/.*' 'src/lib/*' \
  )
  SIZE=$(du -h "$SRC_ZIP" | cut -f1)
  echo ""
  echo "Source: dist/neurai-sign-firefox-source.${VERSION}.zip ($SIZE)"
  echo "Upload this as the source code for AMO review."
  echo ""
  echo "Contents:"
  echo "  src/                    Chrome extension source (all hand-written JS/HTML/CSS)"
  echo "  package.json            npm dependencies (neurai-key, neurai-message, neurai-reader)"
  echo "  sync-libs.js            Script that builds lib/ bundles from npm packages"
  echo "  build-firefox-addon.sh  Script that builds firefox/ from src/"
  echo "  README.md               Project documentation"
  echo "  LICENSE                 Apache 2.0 license"
  echo ""
  echo "Reviewer instructions: npm install && ./build-firefox-addon.sh"
fi
