import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: [
      resolve(__dirname, 'tests/composables/*.test.ts'),
      resolve(__dirname, 'tests/server/*.test.ts'),
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary', 'html'],
      include: ['composables/**/*.ts', 'server/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '~': resolve(__dirname),
      '#imports': resolve(__dirname, 'tests/mocks/imports.ts'),
    },
  },
})
