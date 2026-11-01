import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { cloudSyncPlugin } from './server/dev-sync-plugin';

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));
const buildId = `${pkg.version}-${Date.now().toString(36)}`;

function updateBuildPlugin(currentBuildId: string, version: string): Plugin {
  let resolvedOutDir = 'dist';

  return {
    name: 'mybac-update-build-plugin',
    configResolved(config) {
      resolvedOutDir = config.build.outDir || 'dist';
    },
    configureServer(server) {
      // In dev server, serve version.json directly so testing updater polling works in dev
      server.middlewares.use((req, res, next) => {
        if (req.url === '/version.json') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(
            JSON.stringify({
              version,
              buildId: currentBuildId,
              builtAt: new Date().toISOString(),
            })
          );
          return;
        }
        next();
      });
    },
    closeBundle() {
      const outDir = path.resolve(__dirname, resolvedOutDir);
      if (!fs.existsSync(outDir)) return;

      // 1. Emit version.json
      const versionData = {
        version,
        buildId: currentBuildId,
        builtAt: new Date().toISOString(),
      };
      fs.writeFileSync(path.join(outDir, 'version.json'), JSON.stringify(versionData, null, 2), 'utf8');

      // 2. Generate dist/sw.js with the dynamic BUILD_ID
      const swSrcPath = path.resolve(__dirname, 'public/sw.js');
      if (fs.existsSync(swSrcPath)) {
        let swContent = fs.readFileSync(swSrcPath, 'utf8');
        swContent = swContent.replace(/__BUILD_ID__/g, currentBuildId);

        if (swContent.includes('__BUILD_ID__')) {
          throw new Error('Placeholder __BUILD_ID__ was not completely replaced in sw.js');
        }

        const swDistPath = path.join(outDir, 'sw.js');
        fs.writeFileSync(swDistPath, swContent, 'utf8');
        console.log(`[updateBuildPlugin] Generated ${path.relative(__dirname, swDistPath)} with BUILD_ID: ${currentBuildId}`);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    base: '/',
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_ID__: JSON.stringify(buildId),
    },
    plugins: [react(), tailwindcss(), cloudSyncPlugin(), updateBuildPlugin(buildId, pkg.version)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      minify: 'esbuild',
      sourcemap: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          todo: path.resolve(__dirname, 'todo.html'),
        },
        output: {
          manualChunks(id) {
            // Firebase ecosystem
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
              return 'vendor-firebase';
            }

            // Supabase
            if (id.includes('node_modules/@supabase')) {
              return 'vendor-supabase';
            }

            // React ecosystem
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react';
            }

            // Animation libraries
            if (id.includes('node_modules/canvas-confetti')) {
              return 'vendor-animations';
            }

            // Lucide icons
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }

            // Other node_modules
            if (id.includes('node_modules/')) {
              return 'vendor-misc';
            }
          },
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        usePolling: true,
        interval: 1000,
        ignored: ['**/public/**', '**/dist/**'],
      },
    },
  };
});
