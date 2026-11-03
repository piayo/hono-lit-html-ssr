import { render } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import type { InitialData } from '../shared/types.ts';
import { home } from '../views/pages/home.ts';

// JSON lives in a raw-text script element: HTML entity escaping is unsuitable.
export function serializeInitialData(data: InitialData): string {
  return JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (character) =>
    `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}

export async function renderPage(data: InitialData, clientEntry: string): Promise<string> {
  const content = await collectResult(render(home({ ...data, count: data.initialCount }, () => {})));
  // Only SSR output, escaped JSON, and a server-controlled asset URL enter this shell.
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hono + lit-html SSR</title>
  <link rel="icon" href="data:,">
  <style>
    :root { font-family: system-ui, sans-serif; color: #183044; background: #f5f8fa; }
    main { max-width: 48rem; margin: 10vh auto; padding: 2rem; }
    section { margin-top: 2rem; padding: 1.5rem; background: white; border: 1px solid #d8e2e9; border-radius: 12px; }
    output { font-size: 2rem; font-weight: bold; margin-left: .5rem; }
    button { padding: .7rem 1.2rem; font: inherit; color: white; background: #126568; border: 0; border-radius: 6px; cursor: pointer; }
    button:focus-visible { outline: 3px solid #c05b00; outline-offset: 3px; }
  </style>
</head>
<body>
  <div id="app">${content}</div>
  <noscript>初期値は SSR で表示されています。カウント操作には JavaScript が必要です。</noscript>
  <script id="initial-data" type="application/json">${serializeInitialData(data)}</script>
  <script type="module" src="${clientEntry}"></script>
</body>
</html>`;
}
