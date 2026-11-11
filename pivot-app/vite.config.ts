import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// O resultado da compilação vai para ../pivot (servido pelo GitHub Pages em /pivot/).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: '../pivot', emptyOutDir: true },
})
