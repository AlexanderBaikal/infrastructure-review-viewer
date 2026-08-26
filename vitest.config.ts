import { defineConfig } from 'vitest/config';

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
    ],
  },
});
