import { defineConfig } from '@playwright/test';

const development = process.env.TEST_MODE === 'development';
const port = development ? 3101 : 3100;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: { baseURL: `http://127.0.0.1:${port}`, browserName: 'chromium' },
  webServer: {
    command: development ? 'npm run dev' : 'npm start',
    env: { PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
});
