import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFileSync, unlinkSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

// A shared React page with a plain static production entry avoids the Windows
// native crash in the starter's multi-environment RSC production build.
export default defineConfig({
  plugins: [react(),{
    name:'publish-compressed-blender-model',
    apply:'build',
    closeBundle(){
      const raw=new URL('./dist/client/models/geumseonggwan.glb',import.meta.url);
      const compressed=new URL('./dist/client/models/geumseonggwan.glb.gz',import.meta.url);
      if(!gunzipSync(readFileSync(compressed)).equals(readFileSync(raw)))throw new Error('Compressed Blender model is stale; regenerate it before publishing.');
      // Only omit the redundant build copy. The original GLB stays in public/.
      unlinkSync(raw);
    },
  }],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  // The workspace also stores Blender tools and archived previews. Only scan
  // this site's entry, not unrelated HTML under work/, for dev dependencies.
  optimizeDeps: { entries: ['index.html'] },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { outDir: 'dist/client', emptyOutDir: true, minify: false },
});
