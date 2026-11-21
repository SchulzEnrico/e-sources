import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
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
});
