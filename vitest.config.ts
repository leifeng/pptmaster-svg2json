import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Plan 14-03 — disable per-file parallelism. cli.font-validation.test.ts
    // temporarily unlinks the dist font and the cli-parent-dir.test.ts shells
    // out to `node dist/src/cli.js` which calls `verifyFontLoaded()` at startup.
    // Running those test files in parallel made the CLI subprocess fail with
    // "font not found" while the font-validation test was mid-rename. With
    // fileParallelism=false, vitest runs test files sequentially.
    fileParallelism: false,
    include: ['__tests__/**/*.test.ts', 'src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['**/*.ts'],
      exclude: ['**/*.d.ts', 'node_modules/**', 'dist/**']
    }
  }
})
