import { html } from 'lit-html';

export function counter(count: number, onIncrement: () => void) {
  return html`<section aria-label="Counter">
    <p>現在のカウント: <output id="count" aria-live="polite">${count}</output></p>
    <button type="button" @click=${() => onIncrement()}>Count up</button>
  </section>`;
}
