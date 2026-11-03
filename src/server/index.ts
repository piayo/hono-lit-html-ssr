import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { getRequestListener } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { renderPage } from './render.ts';

const production = process.env.NODE_ENV === 'production' || import.meta.url.endsWith('/dist/server/index.js');
const port = Number(process.env.PORT ?? 3000);
const app = new Hono();
let clientEntry = '/src/client/index.ts';

if (production) {
  const manifest = JSON.parse(await readFile('dist/client/.vite/manifest.json', 'utf8')) as
    Record<string, { file: string }>;
  const entry = manifest['src/client/index.ts'];
  if (!entry) throw new Error('Client build is missing from the Vite manifest');
  clientEntry = `/${entry.file}`;
  app.use('/assets/*', serveStatic({ root: './dist/client' }));
}

app.get('/', async (context) => {
  context.header('Cache-Control', 'no-store');
  const document = await renderPage({
    initialCount: 5,
    message: '同じ View と初期データをサーバーとクライアントで共有します。',
  }, clientEntry);
  return context.html(vite ? await vite.transformIndexHtml(context.req.path, document) : document);
});

const listener = getRequestListener(app.fetch);
const server = createServer();
const vite = production ? undefined : await (await import('vite')).createServer({
  // Avoid generated config modules triggering Node's import-based watch mode.
  // vite.config.ts only configures the production build.
  configFile: false,
  appType: 'custom',
  server: { middlewareMode: true, hmr: { server } },
});

server.on('request', (request, response) => {
  if (vite) {
    vite.middlewares(request, response, () => { void listener(request, response); });
  } else {
    void listener(request, response);
  }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Hono + lit-html SSR: http://127.0.0.1:${port} (${production ? 'production' : 'development'})`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.closeAllConnections();
    server.close(() => { void Promise.resolve(vite?.close()).then(() => process.exit(0)); });
  });
}
