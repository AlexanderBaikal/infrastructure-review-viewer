import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// core runs in node, viewer in jsdom; cesium is never imported by tests
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'review-core',
          root: 'packages/review-core',
          environment: 'node',
          include: ['test/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'viewer',
          root: 'apps/viewer',
          environment: 'jsdom',
          include: ['test/**/*.test.{ts,tsx}'],
          setupFiles: ['test/setupTests.ts'],
        },
      },
    ],
  },
});
