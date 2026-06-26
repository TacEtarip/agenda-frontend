import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@ionic/angular/standalone': fileURLToPath(
        new URL('./src/test/ionic-standalone.mock.ts', import.meta.url),
      ),
    },
  },
});
