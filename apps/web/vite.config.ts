import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: { manualChunks: { http: ['axios'] } },
    },
  },
  server: {
    proxy: { '/api': 'http://127.0.0.1:4001', '/assets/demo.svg': 'http://127.0.0.1:4001' },
  },
});
