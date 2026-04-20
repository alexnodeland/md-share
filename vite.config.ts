import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type PluginOption } from 'vite';

const swCacheVersion = (): PluginOption => {
  const version = `md-share-${Date.now().toString(36)}`;
  return {
    name: 'md-share:sw-cache-version',
    apply: 'build',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist/sw.js');
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
  },
  plugins: [swCacheVersion()],
});
