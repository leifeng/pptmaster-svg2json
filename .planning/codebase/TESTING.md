# Testing Patterns

**Analysis Date:** 2026-06-27

## Test Framework

**Runner:**
- Vitest v2.0.0
- Config: `vitest.config.ts` (root) and `src/vitest.config.ts`

**Assertion Library:**
- Built-in Vitest assertions (`expect`)

**Run Commands:**
```bash
npm test              # Run all tests (vitest run)
npm run test:watch    # Watch mode (vitest)
```

## Test File Organization

**Location:**
- Test files expected in `__tests__/**/*.test.ts` (per vitest config)
- **Status: No test files exist in the repository**

**Directory structure:**
```
svg2json/
├── __tests__/           # Expected but empty/missing
├── src/
│   ├── scripts/         # Contains round-trip-test.ts and validate-all.ts
│   ├── parser/
│   ├── transformer/
│   └── ...
```

## Test Structure

**No unit test files detected** - the `__tests__` directory does not exist

## Validation Scripts

**Round-trip test** (`src/scripts/round-trip-test.ts`):
- Validates: SVG -> AST -> JSON -> re-parse -> validate structure
- Uses type guard `isValidPPTElement()` for validation
- Processes SVG files from `examples/*/svg_output/` directories

```typescript
export function roundTripTest(svgContent: string): { valid: boolean, errors: string[] } {
  // Parse SVG to AST
  const ast = parseSvg(svgContent)
  // Transform to PPTElement array
  const elements = transformToPPTElement(ast)
  // Serialize to JSON
  const json = JSON.stringify({ elements })
  // Re-parse JSON and validate
  const parsed = JSON.parse(json)
  // ...
}
```

**Type guard for validation:**
```typescript
export function isValidPPTElement(obj: unknown): obj is PPTElement {
  if (typeof obj !== 'object' || obj === null) return false
  const e = obj as Record<string, unknown>
  if (typeof e.id !== 'string') return false
  if (typeof e.left !== 'number') return false
  // ...
}
```

## Coverage

**Provider:** v8

**Configuration:**
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  include: ['**/*.ts'],
  exclude: ['**/*.d.ts', 'node_modules/**', 'dist/**']
}
```

**View coverage:**
```bash
npm test  # Outputs coverage text summary
```

**Status:** Coverage report generated but not reviewed (no tests exist)

## Mocking

**No mocking patterns detected** - no test files exist

## Test Types

**Unit Tests:**
- Not implemented

**Integration Tests:**
- Round-trip validation script (`round-trip-test.ts`) validates full pipeline
- Processes real SVG files from `examples/` directory

**E2E Tests:**
- Not implemented

## Common Patterns

**Async testing:** Not applicable (no test files)

**Error testing:** Not applicable (no test files)

**Fixtures:**
- Test fixtures expected in `__tests__/` but directory does not exist
- SVG test files located in `examples/*/svg_output/` for round-trip testing

## Test Configuration

**Vitest config** (`vitest.config.ts`):
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['**/*.ts'],
      exclude: ['**/*.d.ts', 'node_modules/**', 'dist/**']
    }
  }
})
```

**tsconfig includes test files in compile:**
```json
{
  "include": ["src/types/**/*", "src/parser/**/*", ...],
  "exclude": ["node_modules", "dist", "__tests__", "src/scripts"]
}
```

---

*Testing analysis: 2026-06-27*