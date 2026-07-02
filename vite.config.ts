import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
// In "standalone" mode every asset is inlined into a single self-contained
// index.html that runs directly from the file system (double-click, no server).
// The default build stays chunked for normal web hosting.
export default defineConfig(({ mode }) => ({
  // Relative base so the standalone file also works when opened via file://.
  base: mode === 'standalone' ? './' : '/',
  plugins: [react(), tailwindcss(), ...(mode === 'standalone' ? [viteSingleFile()] : [])],
}))
