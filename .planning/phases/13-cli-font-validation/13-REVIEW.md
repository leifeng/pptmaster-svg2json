---
phase: 13-cli-font-validation
reviewed: 2026-08-06T16:30:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/font-validator.ts
  - src/font-validator.test.ts
  - src/cli.font-validation.test.ts
  - src/cli.ts
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-08-06T16:30:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Phase 13 adds a synchronous font validation gate (`verifyFontLoaded()`) called at the start of `main()` in `src/cli.ts`. The implementation covers the contract — synchronous, never throws, returns `{ ok, error? }`, with absolute path + `npm run build` recovery hint on failure. The unit test suite (11 tests) covers both success and failure branches.

However, the review surfaced two substantive issues that should be addressed before this gate is considered production-ready:

1. **The subprocess integration test does not actually verify the subprocess exit code.** It reads a non-existent `execFileSync.lastStatus` property and falls through to `1`, so `code` is always 1 by construction. The test passes regardless of what the CLI actually does.
2. **The validator's Layer 2 (Resvg construction) is empirically ineffective at catching malformed fonts.** Real `@resvg/resvg-js` does not throw on missing / empty / truncated TTF files — it silently renders empty glyph boxes. The docstring claim that this check catches "corrupt fonts that pass the existence check" is not borne out by behavior.

The CLI gate, as wired, does block the documented failure scenario (font file physically removed) via Layer 1, and it does emit the correct red error and exit code 1. The bugs above are about test/regression coverage and validator contract honesty, not user-visible CLI behavior in the happy path.

## Critical Issues

### CR-01: Subprocess integration test does not actually verify the subprocess exit code

**File:** `src/cli.font-validation.test.ts:97-99`

**Issue:** The test reads `(execFileSync as unknown as { lastStatus?: number }).lastStatus` to determine the exit code. `execFileSync.lastStatus` is **not a real Node API** — it is always `undefined`. The ternary then falls through to `: 1`, so `code === 1` is hard-coded regardless of the actual subprocess exit status.

Empirical verification:

```
$ node -e "const cp = require('child_process'); console.log('lastStatus on execFileSync:', 'lastStatus' in cp.execFileSync); console.log('typeof cp.execFileSync.lastStatus:', typeof cp.execFileSync.lastStatus)"
lastStatus on execFileSync: false
typeof cp.execFileSync.lastStatus: undefined
```

Consequence: if a regression caused the CLI to silently exit `0` (or any other code), this test would still pass. The assertion `expect(code).toBe(1)` only proves the test fixture sets `code` to 1 — it does not prove the CLI exits 1.

The IIFE wrapping `execFileSync` further swallows the thrown error inside its own inner try/catch, so the outer catch (which would correctly read `err.status`) is unreachable for the typical failure path.

**Fix:** Capture the exit code from the thrown error directly. A simpler rewrite of the IIFE + outer catch:

```ts
let code = 0
let stderr = ''
let stdout = ''
try {
  const res = execFileSync(
    'node',
    [DIST_CLI, svgPath, '-o', outPath],
    { stdio: 'pipe' },
  )
  stdout = res.toString()
  code = 0
} catch (e) {
  const err = e as NodeJS.ErrnoException & {
    status?: number | null
    stderr?: Buffer | null
    stdout?: Buffer | null
  }
  code = typeof err.status === 'number' ? err.status : 1
  stderr = err.stderr ? err.stderr.toString() : ''
  stdout = err.stdout ? err.stdout.toString() : ''
}
```

This removes the IIFE, the nested try/catch, and the bogus `lastStatus` lookup. The `code` value then reflects what Node actually reported.

## Warnings

### WR-01: Validator Layer 2 (Resvg construction) is empirically ineffective — does not throw on missing/empty/corrupt fonts

**File:** `src/font-validator.ts:62-67`

**Issue:** The validator's docstring and comment claim that the `new Resvg(VALIDATION_SVG, FONT_OPTIONS)` call "catches malformed/corrupt fonts that pass the existence check but are rejected by the native loader." Empirically, `@resvg/resvg-js` (the version pinned in `package.json`, `^2.6.2`) does **not** throw at construction for any of these inputs:

```
$ node -e "<constructor with loadSystemFonts:false + /no/such/file.ttf>"
  -> No throw, returns object

$ node -e "<constructor with loadSystemFonts:false + empty TTF file>"
  -> No throw, returns object; .render().asPng() returns 199-byte PNG (empty glyph boxes)

$ node -e "<constructor with loadSystemFonts:false + TTF truncated to 100 bytes>"
  -> No throw, returns object; .render().asPng() returns 199-byte PNG
```

The failure is only observable later — `getBBox()` returns `undefined` for missing fonts (vs. `{}` for real fonts), and `render()` produces a much smaller PNG. Layer 2 is therefore essentially a no-op: it adds WASM init + SVG parse latency on every CLI startup but does not catch any failure mode Layer 1 doesn't already catch.

If the real-world threat is "truncated or zero-byte font copy," this gate does **not** defend against it. The unit tests pass because they mock `@resvg/resvg-js` and assert a synchronous throw — they do not validate the real library's behavior.

**Fix:** Either

1. Tighten the contract to honest language (Layer 1 only catches missing files; corrupt-but-present files will silently render empty glyphs and the existing `text-measurer.ts` pipeline already rejects zero-dimension bboxes), **or**
2. Strengthen Layer 2 to actually exercise `render().asPng()` / `getBBox()` and assert the bbox is non-zero / the PNG is above a sanity threshold, **or**
3. Use a cheaper pre-flight that opens the file and validates the TTF magic bytes (`0x00010000` for TrueType, `'OTTO'` for OpenType-CFF, `'true'` for Apple TrueType, `'typ1` for PostScript).

Option 3 is the most efficient — no WASM init, sub-millisecond cost.

### WR-02: Unused import `dirname` in subprocess test, kept alive by `void dirname` hack

**File:** `src/cli.font-validation.test.ts:5, 125`

**Issue:** `dirname` is imported from `'path'` but never used. To keep TypeScript strict mode quiet, the file ends with:

```ts
// Keep dirname as a referenced symbol so tsc strict mode doesn't complain.
void dirname
```

This is a code smell — the import should simply be removed, not suppressed.

**Fix:**

```ts
import { join, resolve } from 'path'
```

…and delete the `void dirname` line. Also drop the leading JSDoc comment that explains the hack.

### WR-03: No automated regression test for the happy path

**File:** `src/cli.font-validation.test.ts` (whole file)

**Issue:** The subprocess test only covers the failure path (font deleted → CLI exits 1). There is no automated test that asserts the success path (font present → CLI exits 0 with a non-empty JSON output). The SUMMARY.md mentions a manual one-liner verifying "Success-path: exit=0, JSON output size=1361 bytes", but that is not committed as a test and provides no CI-time regression coverage.

If a future change breaks the conversion pipeline under the validation gate, no test would catch it.

**Fix:** Add a second `it()` case that runs the same subprocess with the font intact and asserts:

```ts
expect(code).toBe(0)
expect(existsSync(outPath)).toBe(true)
expect(readFileSync(outPath, 'utf-8').length).toBeGreaterThan(100)
```

### WR-04: Subprocess test uses literal `'node'` instead of `process.execPath`

**File:** `src/cli.font-validation.test.ts:83`

**Issue:** `execFileSync('node', [DIST_CLI, svgPath, '-o', outPath], ...)` relies on a `node` binary being discoverable via the test runner's `PATH`. In CI sandboxes, packaged distributions, or when running the test suite through a wrapper, `process.execPath` (the actual Node binary running the test) is more portable.

**Fix:**

```ts
const res = execFileSync(
  process.execPath,
  [DIST_CLI, svgPath, '-o', outPath],
  { stdio: 'pipe' },
)
```

Also applies to `ensureBuilt()` at lines 41 and 45, which currently spawn `./node_modules/typescript/bin/tsc` and `node scripts/copy-fonts.js` — those can stay (they're project paths, not generic node invocations), but consistency with `process.execPath` is worth considering.

### WR-05: `run` function exported but never invoked

**File:** `src/cli.ts:135-137`

**Issue:** Pre-existing dead code that survived from a previous phase:

```ts
export { run }
function run(args: string[] = process.argv) {
  cli.parse(args)
}
```

`run` is not called anywhere in the codebase. Worse, because `cli.parse()` is already invoked at module top-level (line 18), calling `run(['--help'])` would cause `cli.parse()` to fire a second time — which is at best redundant and at worst causes cac to print help twice or throw on already-consumed state.

This was not introduced by Phase 13 (it predates the changes), but it sits inside the file Phase 13 modified. It is now reachable through the file's exports surface and worth cleaning up.

**Fix:** Remove the export and the function. If a programmatic entry is needed later, restructure so `main()` is the single export and is called conditionally on `require.main === module`.

## Info

### IN-01: Redundant `resolve(FONT_FILE)` call

**File:** `src/font-validator.ts:49`

**Issue:** `FONT_FILE` is already an absolute path — `constants.ts` defines it as `join(__dirname, 'fonts', 'Source Han Sans CN Regular.ttf')`, and `__dirname` is always absolute. `resolve()` on an absolute path is a no-op.

**Fix (optional):** Drop `resolve` and just use `FONT_FILE` directly, or use `path.normalize()` if the intent is to canonicalize separators on Windows. The current code is harmless but slightly misleading.

### IN-02: `InstanceType<typeof Resvg>` type assertion is loose

**File:** `src/font-validator.test.ts:42, 52, 96`

**Issue:** The mock implementation cast `() => ({}) as unknown as InstanceType<typeof Resvg>` works because Vitest's `Mock` type is constructable, but the double `as unknown as` is a TypeScript smell.

**Fix (optional):** Use a more direct return type for the mock, or define an explicit stub type:

```ts
type ResvgStub = Pick<InstanceType<typeof Resvg>, 'render' | 'getBBox'>
vi.mocked(Resvg).mockImplementation(() => ({}) as ResvgStub)
```

### IN-03: Validator runs `new Resvg()` at every CLI startup, adding WASM init cost

**File:** `src/font-validator.ts:66`

**Issue:** Each CLI invocation now pays the cost of WASM initialisation (the constructor triggers `@resvg/resvg-js`'s native loader) just to verify the font. This adds measurable startup latency even on the happy path. The existing `text-measurer.ts` uses a lazy singleton `ensureInit()` to amortise this cost — the validator throws that away.

Not a correctness bug, but worth a follow-up if CLI startup latency becomes a concern (especially in CI or batch invocations).

**Fix (optional):** Defer Layer 2 to the first real `convert()` call, or share the singleton from `text-measurer.ts`. The simplest path: move the `new Resvg(VALIDATION_SVG, FONT_OPTIONS)` check into the existing `ensureInit()` so the WASM init cost happens once.

---

## Notes on items explicitly checked and found clean

- `validateFontLoaded()` synchronous contract is honored — no `async` / `await` / `Promise` in the validator itself. Confirmed.
- TypeScript strict mode is satisfied by all four files (the `void dirname` hack aside). No `any` leaks. Confirmed.
- `pc.red()` ANSI prefix `\x1b[31m` is emitted by picocolors and the integration test regex `/\x1b\[31m/` correctly detects it. Verified empirically.
- The CLI gate runs after `cac.parse()` and the `if (!input) { outputHelp(); exit(1) }` check, so `--help`, `--version`, and zero-argument invocations do not pay the validation cost. Correct.
- `vi.mock('fs', async () => { ... vi.importActual })` pattern is the right workaround for Vitest 2.x's restriction on redefining non-configurable properties on the `import * as fs` namespace. Confirmed valid pattern.
- The `finally` block restores the deleted dist font file before propagating assertion failures, so a failed test does not leave the repo in a broken state. Correct.

_Reviewed: 2026-08-06T16:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
