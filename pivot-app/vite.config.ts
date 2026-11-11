import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// O resultado da compilação vai para ../pivot (servido pelo GitHub Pages em /pivot/).
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: { outDir: '../pivot', emptyOutDir: true },
})
