import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * F-168: Build-Kennung (Zeitpunkt des Bauens bzw. des Dev-Server-Starts). Sie steckt im Code
 * (__BUILD_ID__) und zusätzlich in version.json neben index.html. Die Oberfläche fragt diese kleine
 * Datei ab und zeigt „Neue Version verfügbar“, sobald dort eine andere Kennung steht.
 */
const BUILD_ID = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
const versionJson = () => JSON.stringify({ build: BUILD_ID });

function buildId(): Plugin {
  return {
    name: 'e-sources-build-id',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: versionJson() });
    },
    configureServer(server) {
      server.middlewares.use('/version.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(versionJson());
      });
    },
  };
}

// F-120: Online unter schulzenrico.github.io/e-sources/ – beim Bauen mit diesem Unterpfad,
// beim Entwickeln (npm run dev) wie bisher unter http://localhost:2910/.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/e-sources/' : '/',
  plugins: [react(), buildId()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  server: {
    port: 2910,
    strictPort: true, // Fehlermeldung statt Ausweichen, falls 2910 belegt ist
    // Ab Stufe 3/4 spricht die Oberfläche mit dem Spring-Boot-Server.
    proxy: { '/api': 'http://localhost:8080' },
  },
  test: {
    environment: 'node',
  },
}));
