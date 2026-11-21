import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// F-120: Online unter schulzenrico.github.io/e-sources/ – beim Bauen mit diesem Unterpfad,
// beim Entwickeln (npm run dev) wie bisher unter http://localhost:2910/.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/e-sources/' : '/',
  plugins: [react()],
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
