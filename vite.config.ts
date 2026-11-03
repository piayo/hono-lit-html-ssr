import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'custom',
  build: {
    outDir: 'dist/client',
    manifest: true,
    rolldownOptions: { input: 'src/client/index.ts' },
  },
});
