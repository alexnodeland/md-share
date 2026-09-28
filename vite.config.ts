import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type PluginOption } from 'vite';

const swCacheVersion = (): PluginOption => {
  const version = `md-share-${Date.now().toString(36)}`;
  return {
    name: 'md-share:sw-cache-version',
    apply: 'build',
    closeBundle() {
      const swPath = resolve(import.meta.dirname, 'dist/sw.js');
      const source = readFileSync(swPath, 'utf8');
      writeFileSync(swPath, source.replace('__CACHE_VERSION__', version));
    },
  };
};

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
    // Mermaid's parser chunk (~660 kB) is lazy — loaded only for documents
    // with a diagram. Keep the limit just above it so a bloated entry chunk
    // still warns.
    chunkSizeWarningLimit: 700,
  },
  plugins: [swCacheVersion()],
});
