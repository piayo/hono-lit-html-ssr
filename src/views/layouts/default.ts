import { html, type TemplateResult } from 'lit-html';

export function defaultLayout(content: TemplateResult): TemplateResult {
  return html`<main>
    <h1>Hono + lit-html SSR</h1>
    ${content}
  </main>`;
}
