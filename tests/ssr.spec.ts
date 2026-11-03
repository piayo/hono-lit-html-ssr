import { test, expect } from '@playwright/test';
import { renderPage } from '../src/server/render.ts';

test('JavaScript 無効でも SSR の見出しと初期値が見える', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const response = await page.goto(baseURL!);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Hono + lit-html SSR' })).toBeVisible();
  await expect(page.locator('#initial-count')).toHaveText('5');
  await expect(page.locator('#count')).toHaveText('5');
  await expect(page.locator('#app')).not.toHaveAttribute('data-hydrated');
  expect(await response!.text()).toContain('<!--lit-part');
  await context.close();
});

test('既存 DOM を hydrate し、繰り返し更新しても一クリックで一つだけ増える', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  // Pause the actual module request so we can retain references to the SSR nodes.
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route(/\/(?:assets\/index-[^/]+\.js|src\/client\/index\.ts)(?:\?.*)?$/, async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator('#count')).toHaveText('5');
  const app = await page.locator('#app').elementHandle();
  const button = await page.getByRole('button', { name: 'Count up' }).elementHandle();
  const output = await page.locator('#count').elementHandle();
  const before = await app!.innerHTML();
  release();
  await expect(page.locator('#app')).toHaveAttribute('data-hydrated', 'true');
  expect(await app!.innerHTML()).toBe(before);
  expect(await button!.evaluate((node) => node === document.querySelector('button'))).toBe(true);
  expect(await output!.evaluate((node) => node === document.querySelector('#count'))).toBe(true);

  for (let count = 6; count <= 15; count++) {
    await page.getByRole('button', { name: 'Count up' }).click();
    await expect(page.locator('#count')).toHaveText(String(count));
    await expect(page.locator('#initial-count')).toHaveText('5');
  }
  expect(await button!.evaluate((node) => node === document.querySelector('button'))).toBe(true);
  expect(errors).toEqual([]);
});

test('初期 JSON は script を終了させず、文字列を正確に復元して hydrate できる', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const payload = '</script><script>globalThis.__xss = true</script><img src=x onerror="globalThis.__xss=true">&\u2028\u2029';
  const response = await request.get('/');
  const source = await response.text();
  const entry = source.match(/<script type="module" src="(\/(?:assets\/[^"\s]+|src\/client\/index\.ts))"/u)?.[1];
  expect(entry).toBeTruthy();
  const data = { initialCount: 42, message: payload };
  const document = await renderPage(data, entry!);
  const json = document.match(/<script id="initial-data" type="application\/json">([\s\S]*?)<\/script>/u)?.[1];
  expect(json).not.toMatch(/[<>&\u2028\u2029]/u);
  expect(JSON.parse(json!)).toEqual(data);
  expect(document).not.toMatch(/(?:@click|onclick)=/u);
  await page.route('**/fixture', (route) => route.fulfill({ contentType: 'text/html', body: document }));
  await page.goto('/fixture');
  await expect(page.locator('#app')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('#message')).toHaveText(payload);
  expect(await page.evaluate(() => '__xss' in globalThis)).toBe(false);
  await expect(page.locator('#message img, #message script')).toHaveCount(0);
  await page.getByRole('button', { name: 'Count up' }).click();
  await expect(page.locator('#count')).toHaveText('43');
  expect(errors).toEqual([]);
});
