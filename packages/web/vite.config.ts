/// <reference types="vitest" />
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  // Served from root by default (local dev, Vercel). GitHub Pages project
  // sites live under /<repo>/, so the Pages workflow sets BASE_PATH.
  base: process.env['BASE_PATH'] ?? '/',
  plugins: [svelte(), svelteTesting()],
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
  },
});
