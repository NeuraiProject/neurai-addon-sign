import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

// Plugin to copy lib files to test-app/lib/ for dev and build
function copyLibPlugin() {
  const libFiles = ['NeuraiKey.js', 'NeuraiMessage.js', 'NeuraiReader.js'];
  const srcLib = resolve(__dirname, 'src/lib');
  const destLib = resolve(__dirname, 'test-app/lib');

  function copyLibs() {
    if (!existsSync(destLib)) mkdirSync(destLib, { recursive: true });
    for (const file of libFiles) {
      copyFileSync(resolve(srcLib, file), resolve(destLib, file));
    }
  }

  return {
    name: 'copy-neurai-libs',
    buildStart() { copyLibs(); },
    configureServer(server) {
      copyLibs();
      server.watcher.on('change', (path) => {
        if (path.includes('src/lib/')) copyLibs();
      });
    }
  };
}

export default defineConfig({
  root: 'test-app',
  plugins: [copyLibPlugin()],
  build: {
    outDir: '../dist/test-app',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'test-app/index.html')
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
