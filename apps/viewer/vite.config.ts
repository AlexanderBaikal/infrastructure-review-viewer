import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// VITE_BASE is set by CI for GitHub Pages
const base = process.env.VITE_BASE ?? '/';

const CESIUM_PUBLIC_DIR = 'cesium';
const CESIUM_STATIC_DIRS = ['ThirdParty', 'Workers', 'Assets', 'Widgets'];
const MIME: Record<string, string> = {
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.xml': 'application/xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.glsl': 'text/plain',
};

// Cesium fetches its workers/assets at runtime from CESIUM_BASE_URL, so they have to be served as-is.
// vite-plugin-static-copy mirrored the whole pnpm node_modules path into dist, hence this small plugin.
function cesiumStaticAssets(): Plugin {
  const require = createRequire(import.meta.url);
  const cesiumBuild = path.join(path.dirname(require.resolve('cesium/package.json')), 'Build', 'Cesium');
  let outDir = '';
  let publicBase = '/';

  return {
    name: 'cesium-static-assets',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      publicBase = config.base;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0] ?? '';
        const pathname = url.startsWith(publicBase) ? `/${url.slice(publicBase.length)}` : url;
        const prefix = `/${CESIUM_PUBLIC_DIR}/`;
        if (!pathname.startsWith(prefix)) return next();
        const file = path.resolve(cesiumBuild, decodeURIComponent(pathname.slice(prefix.length)));
        if (!file.startsWith(cesiumBuild) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return next();
        res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream');
        fs.createReadStream(file).pipe(res);
      });
    },
    async closeBundle() {
      if (!outDir) return;
      await Promise.all(
        CESIUM_STATIC_DIRS.map((dir) =>
          fs.promises.cp(path.join(cesiumBuild, dir), path.join(outDir, CESIUM_PUBLIC_DIR, dir), { recursive: true }),
        ),
      );
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), cesiumStaticAssets()],
  define: { CESIUM_BASE_URL: JSON.stringify(`${base}${CESIUM_PUBLIC_DIR}/`) },
  build: {
    chunkSizeWarningLimit: 6000,
    sourcemap: false,
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});
