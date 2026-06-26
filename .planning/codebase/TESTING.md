# Testing Patterns

**Analysis Date:** 2026-06-26

## Test Framework

**Runner:** vitest ^2.0.0
- Config file: `vitest.config.ts`
- Globals: enabled (`globals: true`)
- Environment: node

**Run Commands:**
```bash
npm test              # Run all tests (vitest run)
npm test:watch        # Watch mode (vitest)
```

## Test File Organization

**Location:** `__tests__/**/*.test.ts` (per vitest.config.ts include pattern)

**Current Status:** No test files exist in the codebase yet. The test infrastructure is configured but unused.

## Coverage

**Provider:** v8
**Reporters:** text, json, html
**Include:** `['**/*.ts']`
**Exclude:** `['**/*.d.ts', 'node_modules/**', 'dist/**']`

**View coverage:**
```bash
# Coverage output generated in coverage/ directory after running tests
```

## Validation Scripts

Instead of unit tests, the project uses validation scripts for quality assurance:

### validate-all.ts

**Location:** `src/scripts/validate-all.ts`
**Purpose:** Validates all SVG files in `examples/*/svg_output/` directories

**Process:**
1. Walks `examples/` directories for `svg_output` folders
2. Reads all `.svg` files
3. Runs `convert()` on each
4. Reports success/failure with element counts

**Output:**
- Console progress with colored status (OK/FAIL)
- JSON report with timestamp, total, success, failed counts, success rate, and element statistics

### round-trip-test.ts

**Location:** `src/scripts/round-trip-test.ts`
**Purpose:** Tests SVG -> AST -> JSON -> validate round-trip

**Process:**
1. Parse SVG to AST (`parseSvg`)
2. Transform to PPTElement array (`transformToPPTElement`)
3. Serialize to JSON
4. Re-parse JSON
5. Validate each element with `isValidPPTElement` type guard

**Type Guard Pattern:**
```typescript
export function isValidPPTElement(obj: unknown): obj is PPTElement {
  if (typeof obj !== 'object' || obj === null) return false
  const e = obj as Record<string, unknown>
  // Check required fields
  if (typeof e.id !== 'string') return false
  if (typeof e.left !== 'number') return false
  // Check type discriminator
  const validTypes = ['text', 'image', 'shape', 'line', 'chart', 'table', 'latex', 'video', 'audio']
  if (!validTypes.includes(e.type as string)) return false
  // Line type omits height/rotate
  if (e.type !== 'line') {
    if (typeof e.height !== 'number') return false
    if (typeof e.rotate !== 'number') return false
  }
  return true
}
```

## Error Handling in Scripts

**Silent failures with try/catch:**
```typescript
try {
  const content = readFileSync(file, 'utf-8')
  const result = await convert(content)
  // handle result
} catch (err) {
  failCount++
  const errorMsg = 'File read error: ' + String(err)
  // log and continue
}
```

**Graceful directory walking:**
```typescript
try {
  const entries = readdirSync(dir)
} catch {
  // skip dirs we can't read
}
```

## Test Data

SVG test files located in: `examples/*/svg_output/` directories

---

*Testing analysis: 2026-06-26*
