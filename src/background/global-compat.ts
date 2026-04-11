// Ensure browser-targeted UMD bundles can run inside the MV3 service worker.
if (typeof (globalThis as Record<string, unknown>).window === 'undefined') {
  (globalThis as Record<string, unknown>).window = globalThis;
}
