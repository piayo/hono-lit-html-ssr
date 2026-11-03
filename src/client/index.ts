import { hydrate } from '@lit-labs/ssr-client';
import { render } from 'lit-html';
import { parseInitialData, type HomeState } from '../shared/types.ts';
import { home } from '../views/pages/home.ts';

const container = document.querySelector<HTMLElement>('#app');
const dataElement = document.querySelector<HTMLScriptElement>('#initial-data');
if (!container || !dataElement?.textContent) {
  throw new Error('SSR container or initial data is missing');
}

// Vite HMR uses a full reload; this module hydrates once per page load.
const initialData = parseInitialData(JSON.parse(dataElement.textContent));
const state: HomeState = { ...initialData, count: initialData.initialCount };
const increment = () => {
  state.count += 1;
  render(home(state, increment), container);
};

hydrate(home(state, increment), container);
// Observable completion signal, outside the shared template's managed subtree.
container.dataset.hydrated = 'true';
