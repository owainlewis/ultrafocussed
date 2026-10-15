import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // External editor writes must invalidate the preview's stylesheet cache.
    watch: { usePolling: true, interval: 500 },
  },
});
