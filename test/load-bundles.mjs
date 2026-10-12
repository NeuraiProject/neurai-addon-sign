// Loads shipped library bundles (src/lib) the way the extension does: classic
// scripts defining globals. Modules such as src/shared/codec.ts read those
// globals at call time. Importing this file loads the transaction codec.

import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';

export function loadBundles(...names) {
  for (const name of names) {
    if (globalThis[name]) continue;
    runInThisContext(readFileSync(new URL(`../src/lib/${name}.js`, import.meta.url), 'utf8'), { filename: `${name}.js` });
  }
}

loadBundles('NeuraiCreateTransaction');
