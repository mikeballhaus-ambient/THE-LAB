import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

const repoRoot = fileURLToPath(new URL('.', import.meta.url))

/** Chokidar paths — forward slashes for Windows compatibility */
function repoPath(...segments: string[]): string {
  return path.join(repoRoot, ...segments).replace(/\\/g, '/')
}
import tailwindcss from '@tailwindcss/vite'
import svgLoader from 'vite-svg-loader'
import { execSync } from 'child_process'

function lintTheLabAppsPlugin() {
  return {
    name: 'lint-the-lab-apps',
    buildStart() {
      console.log('\nRunning THE-LAB apps lint validation...')
      try {
        execSync('npx tsx src/scripts/lint-the-lab-apps.ts', { stdio: 'inherit' })
      } catch {
        console.error('\nLint validation failed. Build artifacts may have issues.')
        process.exit(1)
      }
    },
  }
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), svgLoader(), lintTheLabAppsPlugin()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 3200,
    rollupOptions: {
      input: './src/main.ts',
      external: [
        /src\/backend\/.*/,
        'src/backend-entry',
        'ollama',
        'fastify',
        'fs',
        'child_process',
        'chromadb',
        '@chroma-core/default-embed',
        'path',
        'url',
        'fs/promises',
      ],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  root: './',
  publicDir: 'public',
  server: {
    hmr: true,
    watch: {
      // Agent/planning docs and backend-only paths — edits must not full-page reload the shell.
      ignored: [
        repoPath('AGENT-HANDOFF.md'),
        repoPath('AGENTS.md'),
        repoPath('CLAUDE.md'),
        repoPath('README.md'),
        repoPath('.cursorrules'),
        repoPath('docs'),
        repoPath('plans'),
        '**/AGENT-HANDOFF.md',
        '**/AGENTS.md',
        '**/CLAUDE.md',
        '**/plans/**',
        '**/docs/**',
        '**/.cursor/**',
        '**/.neuralmemory/**',
        '**/logs/**',
        '**/chroma-data/**',
        '**/db/**',
        '**/scripts/**',
        '**/src/shared/templates/**',
        '**/temp/**',
        '**/tests/**',
        'tsconfig.mcp.json',
      ],
    },
  },
  assetsInclude: ['**/*.svg'], // Ensure SVG files are included as assets
  define: {
    // This polyfills 'process' for libraries that expect it in the browser
    'process.env': {},
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.BABEL_TYPES_8_BREAKING': 'false',
    'process.platform': JSON.stringify('win32'), // Or your specific platform if needed
    'global': 'window', // Some older libs expect 'global'
  },
  optimizeDeps: {
    exclude: [
      'path',
      'chromadb',
      '@chroma-core/default-embed'
    ]
  }
})