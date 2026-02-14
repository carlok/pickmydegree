/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      include: ['src/**/*.{js,vue}'],
      exclude: ['src/main.js', 'src/i18n/**', '**/*.spec.js', '**/*.test.js', '**/node_modules/**'],
    },
    setupFiles: ['tests/setup.js'],
  },
  server: {
    host: true,
    strictPort: true,
    watch: {
      usePolling: true,
    },
    hmr: {
      clientPort: 5173,
      host: 'localhost',
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Silence @import (and other) deprecation warnings from dependencies (e.g. Bootstrap)
        quietDeps: true,
      },
    },
  },
})
