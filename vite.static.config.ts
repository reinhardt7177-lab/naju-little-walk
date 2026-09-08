import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// A shared React page with a plain static production entry avoids the Windows
// native crash in the starter's multi-environment RSC production build.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  // The workspace also stores Blender tools and archived previews. Only scan
  // this site's entry, not unrelated HTML under work/, for dev dependencies.
  optimizeDeps: { entries: ['index.html'] },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { outDir: 'dist/client', emptyOutDir: true, minify: false },
});
