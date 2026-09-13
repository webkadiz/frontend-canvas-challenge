import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { buildApp } from '../apps/api/dist/app.js';

// Isolated in-memory API: E2E never reads or resets the developer's .data directory.
const api = await buildApp({ generationDelayMs: 1200 });

const web = await createServer({
  root: fileURLToPath(new URL('../apps/web', import.meta.url)),
  configFile: false,
  server: {
    host: '127.0.0.1',
    port: 5274,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:4101',
      '/assets': 'http://127.0.0.1:4101',
    },
  },
});

let closing = false;

async function close() {
  if (closing) return;

  closing = true;
  await Promise.all([web.close(), api.close()]);
}

process.once('SIGTERM', () => void close());

process.once('SIGINT', () => void close());

try {
  await api.listen({ host: '127.0.0.1', port: 4101 });
  await web.listen();
  web.printUrls();
} catch (error) {
  await close();

  throw error;
}
