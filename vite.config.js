/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'node:child_process'

/** Version from git: 0.1.<commit-count> or 0.0.0-dev if not in a git repo. */
function getAppVersion() {
  try {
    const count = execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim()
    return `0.1.${count}`
  } catch {
    return '0.0.0-dev'
  }
}

const APP_VERSION = getAppVersion()

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
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
