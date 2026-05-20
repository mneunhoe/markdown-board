/// <reference types="vitest" />
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

const host = process.env.TAURI_DEV_HOST;

// Tauri-friendly Vite config: fixed port 1420 (matches `tauri.conf.json`
// `devUrl`), no clear-screen so Vite output doesn't trample Tauri logs,
// and `src-tauri/` excluded from the watcher to avoid a feedback loop
// with Rust rebuilds.
export default defineConfig({
  plugins: [svelte()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host ?? false,
    ...(host && {
      hmr: {
        protocol: 'ws',
        host,
        port: 1421,
      },
    }),
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    outDir: 'dist',
    target: ['es2022', 'chrome105', 'safari15'],
  },
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.ts'],
  },
});
