# Testing Patterns

**Analysis Date:** 2026-06-27

## Test Framework

**Runner:**
- Vitest is the configured test runner. `package.json` declares `vitest` in `devDependencies` as `^2.0.0`; `package-lock.json` resolves Vitest to `2.1.9`.
- Config: `vitest.config.ts` at the repository root.
- Duplicate config: `src/vitest.config.ts` contains the same Vitest configuration. Prefer the root `vitest.config.ts` for `npm test` and keep the duplicate synchronized if it remains in the repo.
- Runtime environment: Node (`environment: 'node'` in `vitest.config.ts`).
- Globals: enabled (`globals: true` in `vitest.config.ts`), so future tests may use `describe`, `it`, `test`, `expect`, and hooks without importing them.

**Assertion Library:**
- Built-in Vitest/Chai assertions through global `expect`.
- No custom matchers or setup files are configured in `vitest.config.ts`.

**Run Commands:**
```bash
npm test              # Run all tests via `vitest run`
npm run test:watch    # Run Vitest in watch mode
npm run build         # Run TypeScript compilation quality gate via `tsc`
npx vitest run --coverage  # Run tests with configured v8 coverage reporters when tests exist
```

**Current command behavior:**
- `npm run build` succeeds and is the reliable static quality check.
- `npm test` exits with code 1 because no files match `__tests__/**/*.test.ts`; Vitest reports `No test files found, exiting with code 1`.
- Running `npm test` also prints Vite's CJS Node API deprecation warning because `vitest.config.ts` is compiled in the CommonJS package context.

## Test File Organization

**Location:**
- Put test files under a repository-root `__tests__/` directory because `vitest.config.ts` and `src/vitest.config.ts` both use `include: ['__tests__/**/*.test.ts']`.
- No `__tests__/` directory exists in the current repository.
- No `*.test.ts` or `*.spec.ts` files are detected under `E:/git/svg2json/`.
- `tsconfig.json` excludes `__tests__`, so tests are typechecked by Vitest/esbuild rather than by `npm run build`.

**Naming:**
- Use `*.test.ts` filenames; `*.spec.ts` files are not matched by the current Vitest include pattern.
- Mirror the source module name in the test file name for discoverability:
  - `__tests__/parser/svg-parser.test.ts` for `src/parser/svg-parser.ts`.
  - `__tests__/mapper/coordinate-mapper.test.ts` for `src/mapper/coordinate-mapper.ts`.
  - `__tests__/transformer/transform-to-pptel.test.ts` for `src/transformer/transform-to-pptel.ts`.
  - `__tests__/index.test.ts` for `src/index.ts`.
  - `__tests__/cli.test.ts` for `src/cli.ts` if CLI behavior is covered.

**Structure:**
```text
E:/git/svg2json/
├── __tests__/
│   ├── parser/
│   │   └── svg-parser.test.ts
│   ├── mapper/
│   │   └── coordinate-mapper.test.ts
│   ├── shapes/
│   │   └── shape-to-path.test.ts
│   ├── transformer/
│   │   └── transform-to-pptel.test.ts
│   ├── index.test.ts
│   └── cli.test.ts
├── src/
│   ├── parser/svg-parser.ts
│   ├── mapper/coordinate-mapper.ts
│   ├── shapes/shape-to-path.ts
│   └── transformer/transform-to-pptel.ts
└── vitest.config.ts
```

## Test Structure

**Suite Organization:**
No committed Vitest test files exist, so use this structure for new tests:
```typescript
describe('parseSvg', () => {
  it('parses root dimensions and viewBox', () => {
    const svg = '<svg viewBox="0 0 100 50" width="100" height="50"><rect x="1" y="2" width="3" height="4" /></svg>'

    const result = parseSvg(svg)

    expect(result.width).toBe(100)
    expect(result.height).toBe(50)
    expect(result.viewBox).toEqual([0, 0, 100, 50])
    expect(result.root.children[0].type).toBe('rect')
  })
})
```

**Patterns:**
- Arrange/Act/Assert style fits the existing pure functions in `src/parser/svg-parser.ts`, `src/mapper/coordinate-mapper.ts`, `src/shapes/shape-to-path.ts`, and `src/transformer/transform-to-pptel.ts`.
- Use inline SVG strings for small parser and transformer cases; there are no committed fixture files.
- Assert structured objects with `toEqual()` for AST/PPTElement results, and scalar geometry values with `toBe()` or `toBeCloseTo()` where scaling is involved.
- For UUID-producing transformations in `src/transformer/transform-to-pptel.ts`, avoid asserting the exact `id` unless UUID generation is mocked. Assert `expect(element.id).toEqual(expect.any(String))` for integration-style tests.
- Keep one source module per test suite and group edge cases with nested `describe()` blocks only when it improves readability.

## Mocking

**Framework:**
- Vitest mocking APIs (`vi.fn`, `vi.spyOn`, `vi.mock`) are available through global Vitest APIs because `globals: true` is configured.
- No current repository test file demonstrates a mocking pattern.

**Patterns:**
```typescript
vi.mock('uuid', () => ({
  v4: () => 'fixed-test-id',
}))

describe('transformToPPTElement', () => {
  it('emits deterministic ids when uuid is mocked', () => {
    const ast = parseSvg('<svg viewBox="0 0 10 10" width="10" height="10"><rect width="10" height="10" /></svg>')

    const elements = transformToPPTElement(ast)

    expect(elements[0].id).toBe('fixed-test-id')
  })
})
```

**What to Mock:**
- Mock `uuid` in tests that need deterministic PPTElement `id` values from `src/transformer/transform-to-pptel.ts`.
- Mock `fs` and process output only for focused CLI tests around `src/cli.ts`; prefer integration tests with temporary directories if practical.
- Mock `console.error`/`console.log` only when asserting CLI or validation script output.

**What NOT to Mock:**
- Do not mock `fast-xml-parser` for parser tests; `src/parser/svg-parser.ts` depends on its real attribute and array behavior.
- Do not mock `mapCoordinates()` or shape helpers in transformer integration tests; the point of `src/transformer/transform-to-pptel.ts` tests should be the real SVG-to-PPTElement flow.
- Do not mock pure helpers such as `extractNumber()`, `parseTransform()`, `rectToPath()`, or `polygonToPath()`; test them directly.

## Fixtures and Factories

**Test Data:**
Use small inline SVG factories until a fixtures directory exists:
```typescript
function svgWithBody(body: string, attrs = 'viewBox="0 0 100 100" width="100" height="100"'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`
}
```

**Location:**
- No committed test fixtures are detected.
- Validation scripts expect example SVG files under `examples/*/svg_output/`, but no such files are detected in the current checkout.
- If reusable fixtures are added, place them under `__tests__/fixtures/` so they are close to the Vitest include root and outside `src/`.

**Factory Guidelines:**
- Use inline SVG strings for one-off cases such as a single `rect`, `circle`, `text`, or invalid SVG input.
- Use fixture files only for large real-world SVG samples that are hard to read inline.
- Keep expected PPTElement objects partial when IDs or floating point scaling make exact snapshots brittle.

## Coverage

**Requirements:**
- No coverage threshold is enforced in `vitest.config.ts`.
- Coverage is configured but the default `npm test` command does not pass `--coverage`.

**Configuration:**
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  include: ['**/*.ts'],
  exclude: ['**/*.d.ts', 'node_modules/**', 'dist/**']
}
```

**View Coverage:**
```bash
npx vitest run --coverage
```

**Coverage Notes:**
- The coverage include pattern `**/*.ts` is broad; it includes root config/source TypeScript unless excluded by Vitest behavior.
- `src/scripts/validate-all.ts` and `src/scripts/round-trip-test.ts` are not excluded from coverage even though they are excluded from `tsconfig.json`; add explicit coverage excludes if they distort coverage reports.
- `dist/**`, `node_modules/**`, and declaration files are excluded.

## Test Types

**Unit Tests:**
- Not currently implemented.
- Recommended unit targets:
  - `parseViewBox()` and `parseSvg()` in `src/parser/svg-parser.ts`.
  - `extractNumber()`, `parseTransform()`, and `mapCoordinates()` in `src/mapper/coordinate-mapper.ts`.
  - `rectToPath()`, `circleToPath()`, `ellipseToPath()`, `lineToPath()`, and `polygonToPath()` in `src/shapes/shape-to-path.ts`.
  - `parseDashArray()` and `colorToHex()` in `src/transformer/transform-to-pptel.ts`.

**Integration Tests:**
- Not currently implemented as Vitest files.
- Use `convert()` in `src/index.ts` for end-to-end SVG-to-JSON assertions. This covers `src/parser/svg-parser.ts`, `src/transformer/transform-to-pptel.ts`, `src/mapper/coordinate-mapper.ts`, and `src/shapes/shape-to-path.ts` through the public API.
- Verify both success and failure result shapes from `ConvertResult` in `src/index.ts`.

**E2E Tests:**
- No formal E2E framework is configured.
- CLI behavior in `src/cli.ts` can be tested with Node child processes after build output exists, but no current test infrastructure does this.

**Development Validation Scripts:**
- `src/scripts/validate-all.ts` traverses `examples/*/svg_output/`, reads `.svg` files, calls `convert()` from `src/index.ts`, tracks success/failure counts, prints progress to stderr, and outputs a JSON `ValidationReport` to stdout.
- `src/scripts/round-trip-test.ts` traverses `examples/*/svg_output/`, parses SVG via `parseSvg()`, transforms via `transformToPPTElement()`, serializes/re-parses JSON, validates objects with `isValidPPTElement()`, prints progress to stderr, and outputs a JSON report to stdout.
- These scripts are not wired into `package.json` scripts and are excluded from `tsconfig.json` compilation.

## Common Patterns

**Async Testing:**
```typescript
describe('convert', () => {
  it('returns successful JSON for a valid SVG', async () => {
    const result = await convert('<svg viewBox="0 0 10 10" width="10" height="10"><rect width="10" height="10" /></svg>')

    expect(result.success).toBe(true)
    expect(result.output).toBeDefined()
    expect(result.elementCount).toBe(1)
  })
})
```

**Error Testing:**
```typescript
describe('convert', () => {
  it('returns a failure result for invalid dimensions', async () => {
    const result = await convert('<svg width="0" height="0"></svg>')

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid SVG')
  })
})
```

**Geometry Testing:**
```typescript
describe('mapCoordinates', () => {
  it('maps a transformed rect', () => {
    const element = {
      type: 'rect',
      attrs: { x: 10, y: 20, width: 30, height: 40, transform: 'translate(5, 6) scale(2)' },
      children: [],
    }

    expect(mapCoordinates(element, [0, 0, 100, 100])).toEqual({
      left: 25,
      top: 46,
      width: 60,
      height: 80,
    })
  })
})
```

**Validation Script Testing:**
- If `src/scripts/validate-all.ts` or `src/scripts/round-trip-test.ts` are covered by tests, isolate filesystem traversal with temporary directories or refactor traversal/report generation into exported pure helpers.
- Current scripts call `process.exit(0)` at module top level after execution, so direct import-based tests need refactoring or process isolation.

---

*Testing analysis: 2026-06-27*
