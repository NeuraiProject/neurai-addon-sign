#!/usr/bin/env bash
#
# build-firefox-addon.sh
# Builds the Firefox extension from the compiled Chrome build in dist/extension/
# and applies the Firefox-specific adaptations automatically.
#
# Usage: ./build-firefox-addon.sh [--pack] [--source]
#   --pack    Create extension zip ready for AMO upload
#   --source  Create source code zip required by AMO for review

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/src"
EXT="$ROOT/dist/extension"
FF="$ROOT/dist/firefox"

echo "=== Building Firefox addon from dist/extension/ ==="
echo ""

# Build the compiled extension first so Firefox packaging always starts from JS output.
node "$ROOT/build-ext.js"
echo ""

rm -rf "$FF"
mkdir -p "$FF"

# Copy the full compiled extension payload as the Firefox base.
cp -r "$EXT/." "$FF/"
echo "  Copied compiled extension files"

# ── Step 1: Build manifest.json (Firefox version) ───────────────────────────
# Read metadata from the source manifest, but point Firefox to a background page.
node -e "
  const fs = require('fs');
  const chrome = JSON.parse(fs.readFileSync('$SRC/manifest.json', 'utf8'));

  chrome.background = { page: 'background/background.html' };
  chrome.permissions = (chrome.permissions || []).filter((p) => !['windows'].includes(p));
  chrome.browser_specific_settings = {
    gecko: {
      id: 'neurai-sign@neuraiproject.org',
      strict_min_version: '109.0',
      data_collection_permissions: {
        required: ['none']
      }
    }
  };

  fs.writeFileSync('$FF/manifest.json', JSON.stringify(chrome, null, 2) + '\n');
  console.log('  Built manifest.json (background.page + gecko settings)');
"

# ── Step 2: Build content.js (Firefox version) ──────────────────────────────
# Add cloneInto() for Xray wrapper compatibility in event dispatching.
node -e "
  const fs = require('fs');
  const src = fs.readFileSync('$EXT/content/content.js', 'utf8');

  let code = src.replace(
    /\\/\\/ Neurai Wallet Content Script\\n\\/\\/ Bridge between the web page.*?\\n\\/\\/\\n\\/\\/ Chrome content scripts/s,
    '// Neurai Wallet Content Script (Firefox)\\n// Bridge between the web page (MAIN world) and the extension (background)\\n//\\n// Firefox content scripts'
  );

  code = code.replace(
    'to the background service worker via chrome.runtime.sendMessage',
    'to the background script via chrome.runtime.sendMessage'
  );

  code = code.replace(
    \"(function () {\\n    'use strict';\",
    \"// Firefox note: objects created in the content script context cannot be\\n\" +
    \"// read by page scripts (Xray wrappers). We use cloneInto() to clone\\n\" +
    \"// event detail objects into the page scope so inject.js can access them.\\n\" +
    \"\\n(function () {\\n    'use strict';\"
  );

  code = code.replace(
    \"(document.head || document.documentElement).appendChild(pageScript);\\n    // === STEP 2\",
    \"(document.head || document.documentElement).appendChild(pageScript);\\n    function sendResponseToPage(detail) {\\n        const payload = typeof cloneInto === 'function' ? cloneInto(detail, window) : detail;\\n        document.dispatchEvent(new CustomEvent('neuraiWallet_response', { detail: payload }));\\n    }\\n    // === STEP 2\"
  );

  code = code.replace(
    /document\\.dispatchEvent\\(new CustomEvent\\('neuraiWallet_response', \\{\\n\\s*detail: \\{ requestId, error: 'Extension was reloaded — please refresh this page\\.' \\}\\n\\s*\\}\\)\\);/,
    \"sendResponseToPage({ requestId, error: 'Extension was reloaded — please refresh this page.' });\"
  );

  code = code.replace(
    /\\/\\/ Send result back to page\\n\\s*document\\.dispatchEvent\\(new CustomEvent\\('neuraiWallet_response', \\{\\n\\s*detail: \\{ requestId, result \\}\\n\\s*\\}\\)\\);/,
    '// Send result back to page (cloneInto for Firefox Xray compat)\\n            sendResponseToPage({ requestId, result });'
  );

  code = code.replace(
    /document\\.dispatchEvent\\(new CustomEvent\\('neuraiWallet_response', \\{\\n\\s*detail: \\{ requestId, error: msg \\}\\n\\s*\\}\\)\\);/,
    'sendResponseToPage({ requestId, error: msg });'
  );

  fs.writeFileSync('$FF/content/content.js', code);
  console.log('  Built content/content.js (added cloneInto for Xray wrappers)');
"

# ── Step 3: Create background.html (Firefox-only) ───────────────────────────
cat > "$FF/background/background.html" << 'EOF'
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <script type="module" src="background.js"></script>
</body>
</html>
EOF
echo "  Created background/background.html"

# ── Step 4: Copy LICENSE from project root ───────────────────────────────────
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
    tsconfig.json \
    build-ext.js \
    sync-libs.js \
    build-firefox-addon.sh \
    README.md \
    README-firefox.md \
    LICENSE \
    -x '*/.*' \
  )
  SIZE=$(du -h "$SRC_ZIP" | cut -f1)
  echo ""
  echo "Source: dist/neurai-sign-firefox-source.${VERSION}.zip ($SIZE)"
  echo "Upload this as the source code for AMO review."
  echo ""
  echo "Reviewer instructions: npm install && ./build-firefox-addon.sh"
fi
