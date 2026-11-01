import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

const root = process.cwd()

export default defineConfig({
  main: {
    build: { rollupOptions: { input: resolve(root, 'src/main/index.ts') } }
  },
  preload: {
    build: { externalizeDeps: false, rollupOptions: { input: resolve(root, 'src/preload/index.ts') } }
  },
  renderer: {
    root: resolve(root, 'src/renderer'),
    plugins: [react()]
  }
})
