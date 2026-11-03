import { html } from 'lit-html';
import type { HomeState } from '../../shared/types.ts';
import { counter } from '../components/counter.ts';
import { defaultLayout } from '../layouts/default.ts';

export function home(state: HomeState, onIncrement: () => void) {
  return defaultLayout(html`
    <p>SSR 初期カウント: <span id="initial-count">${state.initialCount}</span></p>
    <p id="message">${state.message}</p>
    ${counter(state.count, onIncrement)}
  `);
}
