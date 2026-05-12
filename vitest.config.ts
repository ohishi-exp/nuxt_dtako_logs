import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

const root = __dirname

export default defineConfig({
  test: {
    globals: true,
    setupFiles: [resolve(root, 'tests/setup.ts')],
    include: [resolve(root, 'tests/**/*.test.ts')],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary', 'html'],
      include: ['composables/**/*.ts', 'server/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '~': root,
      '@ippoan/auth-client': resolve(root, 'tests/mocks/auth-client.ts'),
    },
  },
})
