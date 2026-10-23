/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

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

/**
 * Splits src/data/degrees.json at build time so the first screen doesn't ship every description twice:
 *  - virtual:degrees-core        cards without description/tags (ids, icon, category, names)
 *  - virtual:degree-text/<en|it> { [id]: { description, tags } } for one language, loaded on demand
 * The source file stays a single hand-editable catalogue.
 */
function degreeData() {
  const source = fileURLToPath(new URL('./src/data/degrees.json', import.meta.url))
  const CORE = 'virtual:degrees-core'
  const TEXT = /^virtual:degree-text\/(en|it)$/
  const read = () => JSON.parse(readFileSync(source, 'utf-8'))
  return {
    name: 'degree-data',
    resolveId(id) {
      if (id === CORE || TEXT.test(id)) return '\0' + id
    },
    load(id) {
      if (!id.startsWith('\0virtual:')) return
      this.addWatchFile(source)
      const name = id.slice(1)
      if (name === CORE) {
        const core = read().map(({ description, tags, ...rest }) => rest)
        return `export default ${JSON.stringify(core)}`
      }
      const m = TEXT.exec(name)
      if (m) {
        const loc = m[1]
        const text = Object.fromEntries(
          read().map((d) => [d.id, { description: d.description[loc] ?? d.description.en, tags: d.tags?.[loc] ?? d.tags?.en ?? [] }])
        )
        return `export default ${JSON.stringify(text)}`
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), degreeData()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // Result-screen libraries get their own chunks so they load only when Results is shown.
          if (id.includes('html2canvas')) return 'html2canvas'
          if (id.includes('canvas-confetti')) return 'confetti'
          if (/node_modules\/(vue|@vue|vue-i18n|@intlify)\//.test(id)) return 'vue-vendor'
          if (id.includes('bootstrap') || id.includes('@popperjs')) return 'bootstrap'
          return 'vendor'
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
