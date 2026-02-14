/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'node:child_process'

/** Version: use APP_VERSION env (set by Docker/build) or git 0.1.<count>, else 0.0.0-dev. */
function getAppVersion() {
  if (process.env.APP_VERSION) return process.env.APP_VERSION
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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('vue-i18n')) return 'vue-vendor'
            if (id.includes('bootstrap') || id.includes('@popperjs')) return 'bootstrap'
            if (id.includes('sass')) return 'sass'
            return 'vendor'
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
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
