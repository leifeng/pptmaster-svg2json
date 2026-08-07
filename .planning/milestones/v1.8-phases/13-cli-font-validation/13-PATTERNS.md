# Phase 13: CLI Font Validation — Gap-Closure Pattern Map

**Mapped:** 2026-08-06
**Purpose:** Surface existing-codebase patterns the gap-closure plan should reuse for four gap families — (G1) subprocess exit-code capture, (G2) Resvg runtime validation tightening, (G3a) `process.execPath` portability, (G3b) dead `run` export cleanup. Read-only analysis; no production code modified.

**Files analyzed:** 4 source-of-truth files (`src/cli.ts`, `src/cli.font-validation.test.ts`, `src/font-validator.ts`, `src/font-validator.test.ts`) + 6 analog candidates across `src/`, `scripts/`, `__tests__/`, `docs/`.

---

## Gap → Closest Analog Index

| Gap | Closest Analog | Match Quality | Why this analog |
|-----|----------------|---------------|-----------------|
| G1: subprocess exit code capture (CR-01) | `src/cli.font-validation.test.ts` outer catch lines 99–104 (existing fallback path) + Node.js `execFileSync` `ExecException` shape | role-match (existing file, same role) | The OUTER catch in the same test already reads `err.status` correctly. The IIFE on lines 80–94 masks it. The fix = use that outer catch as the primary. Also: there is **no other call site** for `execFileSync`/`spawn` in the repo's test suite, so this is the only existing analog. |
| G2a: TTF magic-byte pre-flight | none | no-analog | No TTF/OTF magic-byte inspection anywhere in `src/`, `scripts/`, or `__tests__/`. Convention: a new `isValidFontFile(buf)` helper must be created. |
| G2b: Resvg `getBBox()` / `render().asPng()` real-validation tightening | `src/text-measurer.ts:110–126` `measureTextBBox()` | exact (same library, same purpose) | This is the **only** function in the repo that calls `new Resvg(...)` + `getBBox()` and already checks for `undefined` / zero-width / zero-height. This is the upstream safety net that WR-01 surfaces errors through. |
| G2c: Resvg `render().asPng()` + size sanity | `src/text-measurer.ts:143–154` `renderSvgToPng()` + `src/svg-use-handler.ts:61–63, 151–156, 241–246` | exact (production analogues) | Three production sites already construct `new Resvg(...)` and call `.render().asPng()`. The validator's strengthen-Layer-2 fix should mirror the use of `asPng()` and an empirically-derived lower-bound PNG byte count. |
| G3a: `process.execPath` instead of `'node'` literal | `scripts/build-release.js:7–10` (uses `child_process.execSync` via shell, not Node) | partial | No JS file in the repo references `process.execPath`. The fix is a Node-API standardization; no in-repo precedent. |
| G3b: Dead `run` export | none in current src (only `src/cli.ts:135–137`) — closest analog is **`require.main === module` guard pattern** in Node ecosystem, not in this repo | no-analog | Single-line dead code; no other module in this repo exports an unused wrap. Standard Node idiom applies. |

---

## File Classification

Re-classification of the new/modified files needed by the gap-closure plan:

| File (gap-closure target) | Role | Data Flow | Modify or Create |
|---------------------------|------|-----------|-------------------|
| `src/cli.font-validation.test.ts` | test (integration, subprocess) | child-process spawn + assert | **modify** — fix IIFE + `lastStatus` (G1), add success-path `it()` (WR-03), replace `'node'` with `process.execPath` (WR-04), drop unused `dirname` + `void dirname` (WR-02). |
| `src/font-validator.ts` | service (sync validator) | file-I/O read + Resvg native call | **modify** — add cheap TTF magic-byte pre-flight (G2a, option 3 in WR-01 fix) **and/or** tighten Layer 2 to call `getBBox()` / `render().asPng()` (G2b/G2c). Possibly fold Layer 2 into `ensureInit()` singleton (IN-03). |
| `src/font-validator.test.ts` | test (unit) | mock `fs` + mock `Resvg` | **modify** — cover new TTF magic-byte branch and new `getBBox()`/`asPng()` assertion branch. |
| `src/cli.ts` | controller (CLI entry) | top-level parse + dispatch | **modify** — remove dead `run` export + function (WR-05 / G3b). Optionally add `if (require.main === module) main()` guard if the test needs to import from cli.ts (current test reaches the running CLI via dist binary, not import, so this is NOT required for the green path of G1). |

No new files are required by the closure plan.

---

## Pattern Assignments

### G1: Subprocess exit code capture in `src/cli.font-validation.test.ts`

**Analog:** **No exact codebase analog.** The only existing repro uses the same file (current outer catch on lines 99-104 is correct in isolation; lines 80-94 break it). The reviewer-suggested snippet in `13-REVIEW.md:57-81` is the canonical Node.js pattern (no in-repo precedent). For comparison, `docs/python-integration.md:33-40` shows the equivalent pattern from Python's side: `result.returncode != 0` after `subprocess.run(...)`.

**Imports pattern (current file, lines 1-5):**
```ts
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'child_process'
import { mkdtempSync, writeFileSync, copyFileSync, existsSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname, resolve } from 'path'   // dirname unused → drop in G3b fix
```

**Pattern to apply (canonical Node `execFileSync` exception shape):**
```ts
let code = 0
let stderr = ''
let stdout = ''
try {
  const res = execFileSync(
    process.execPath,                          // G3a: was 'node' literal
    [DIST_CLI, svgPath, '-o', outPath],
    { stdio: 'pipe' },
  )
  stdout = res.toString()                      // Buffer → string only on success path
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

**Why this pattern:**
- `execFileSync` throws an `ExecException`-shaped child of `Error` that carries `.status` (number | null), `.stderr` (Buffer | null), `.stdout` (Buffer | null). Empirically `'lastStatus' in cp.execFileSync === false` (`13-VERIFICATION.md:93`). **`execFileSync.lastStatus` does not exist** in any Node version.
- The outer catch sees the thrown error directly; the inner IIFE inside the current file masks it.
- `err.status` is `null` if killed by a signal rather than exited; the ternary falls back to `1` so the assertion still has a well-defined value.
- `Buffer#toString()` is the canonical decoder for the `stderr`/`stdout` Buffers the API surfaces.

**Constraints:**
- `e.status` is typed as `number | null` (not `number`), so any direct `expect(code).toBe(1)` should NOT use a non-null assertion — keep the `typeof === 'number'` guard.
- The IIFE on lines 80-94 must be removed entirely (not just patched around).
- The `finally` block (lines 112-120) must be preserved — it restores the deleted dist font so other tests/dev runs aren't broken.

**Test file fixture / backup pattern (current file, lines 65-66, 73, 77-79, 112-120):**
```ts
const backupDir = mkdtempSync(join(tmpdir(), 'svg2json-font-'))
const backupPath = join(backupDir, 'Source Han Sans CN Regular.ttf')
// ... copy + unlink
try {
  unlinkSync(DIST_FONT)
  // ... subprocess run
} finally {
  copyFileSync(backupPath, DIST_FONT)
  if (!existsSync(DIST_FONT)) {
    throw new Error(`postcondition: dist font not restored at ${DIST_FONT}`)
  }
}
```
This pattern is sound and verified to work — keep it. The new green-path `it()` should reuse this same backup mechanic but never touch `DIST_FONT`; it only needs the temp SVG / output paths.

**Vitest include config (current `vitest.config.ts`, line 7):**
```ts
include: ['__tests__/**/*.test.ts', 'src/**/*.test.ts'],
```
Both `__tests__/` and `src/` are included. The current `src/cli.font-validation.test.ts` is correctly picked up — no config change needed.

---

### G2a: TTF magic-byte pre-flight — no existing analog

**Decision:** this is a new helper. Recommended place: a private constant in `src/font-validator.ts` (small enough to inline; no need for a separate file).

**TTF / OTF magic bytes (from Microsoft OpenType spec):**
- TrueType: `0x00 0x01 0x00 0x00` (at offset 0)
- OpenType-CFF: `'OTTO'` (`0x4F 0x54 0x54 0x4F`)
- Apple TrueType: `'true'` (`0x74 0x72 0x75 0x65`)
- PostScript Type 1: `'typ1'` (`0x74 0x79 0x70 0x31`)
- TrueType Collection: `'ttcf'`

**Suggested shape (analog to existing `existsSync` branch in `font-validator.ts:51`):**
```ts
function readFontMagic(path: string): Buffer | null {
  try {
    const fd = openSync(path, 'r')
    try {
      const buf = Buffer.alloc(4)
      readSync(fd, buf, 0, 4, 0)
      return buf
    } finally {
      closeSync(fd, () => {})
    }
  } catch {
    return null
  }
}

const VALID_FONT_MAGICS: Buffer[] = [
  Buffer.from([0x00, 0x01, 0x00, 0x00]), // TrueType
  Buffer.from('OTTO', 'utf8'),           // OpenType-CFF
  Buffer.from('true', 'utf8'),           // Apple TrueType
  Buffer.from('typ1', 'utf8'),           // PostScript (rare)
]

function hasValidFontMagic(buf: Buffer | null): boolean {
  if (!buf) return false
  return VALID_FONT_MAGICS.some(m => buf.length >= 4 && buf.equals(m.subarray(0, 4)))
}
```

**Constraints:**
- Use `openSync` / `readSync` / `closeSync` (sync APIs) to stay within `font-validator.ts`'s synchronous contract.
- Don't change the synchronous, never-throw contract: surface `{ ok: false, error: '...' }` for a magic-mismatch case the same way `existsSync` mismatch is surfaced today.
- Cache implication: the file is read TWICE (once for magic, once by Resvg). For ~1 MB font, this is acceptable; if startup latency matters, fold into a single `readFileSync` read and pass the buffer via `FONT_FILE = buffer` (analog to `text-measurer.ts:113`). But see IN-03 in the REVIEW: defer to a singleton pattern for amortization.

---

### G2b: Resvg `getBBox()` zero-dimension tightening — analog in `src/text-measurer.ts`

**Analog:** `src/text-measurer.ts:110–126` `measureTextBBox()` (the only in-repo site that asserts on `getBBox` results).

**Existing pattern (text-measurer.ts:110-126):**
```ts
export async function measureTextBBox(svgString: string): Promise<{ width: number; height: number; y: number }> {
  const start = performance.now()
  await ensureInit()
  const resvg = new Resvg(svgString, FONT_OPTIONS)
  const bbox = resvg.getBBox()

  if (!bbox) {
    throw new Error('No bounding box returned from resvg-js')
  }
  if (bbox.width === 0 || bbox.height === 0) {
    throw new Error('Bounding box has zero dimensions')
  }
  // ...
}
```

**Pattern to apply in `font-validator.ts` (Layer 2 strengthening):**
```ts
const resvg = new Resvg(VALIDATION_SVG, FONT_OPTIONS)
const bbox = resvg.getBBox()
if (!bbox) {
  return { ok: false, error: `<msg: getBBox returned undefined for ${absPath}>` }
}
if (bbox.width === 0 || bbox.height === 0) {
  return { ok: false, error: `<msg: Resvg returned zero-dimension bbox; font loaded as empty glyph> ${absPath}` }
}
```

**Why this works empirically:**
- The verifier confirmed in `13-VERIFICATION.md:124-126` that a missing-font construction returns `getBBox() === undefined` while a real-font construction returns a non-zero bbox. So `undefined` vs `non-zero` is a real signal — it is just NOT signalled at constructor time.
- IN-02 in `13-REVIEW.md:198-212` flagged the brittle mock typing — the test must extend mocks to return the right `getBBox` shape.

**Constraints:**
- `font-validator.ts` is **synchronous**; do not call `resvg.getBBox()` inside an `async` function. The existing `try { new Resvg(...); return { ok: true } } catch` block (lines 62-78) is the right place to extend.
- Keep the never-throws contract: catch any throw from `getBBox()` and surface `{ ok: false, error: ... }`.

---

### G2c: Resvg `render().asPng()` byte-size sanity — analog in `src/text-measurer.ts:143-154` and `src/svg-use-handler.ts`

**Analog A:** `src/text-measurer.ts:143–154` `renderSvgToPng()` — first `.asPng()` site in production.
**Analog B:** `src/svg-use-handler.ts:61–63` and `src/svg-use-handler.ts:151–156, 241–246` — three more `.asPng()` sites.

**Pattern (analog A, text-measurer.ts:145-153):**
```ts
const resvg = new Resvg(svgString, {
  ...FONT_OPTIONS,
  fitTo: { mode: 'width', value: width },
})
const pngData = resvg.render().asPng()
return `data:image/png;base64,${pngData.toString('base64')}`
```

**Empirical baseline (from `13-VERIFICATION.md:94` and `13-REVIEW.md:96-102`):**
- Real font: PNG > 100 bytes (test ran 1361-byte JSON output downstream; standalone `asPng()` size not measured in docstring, but reproducer reports ~100-200+ byte PNGs for valid text).
- Missing/empty/truncated font: PNG = 128 / 199 bytes (consistent "empty glyph" output).

**Pattern to apply in `font-validator.ts` (PNG size sanity check):**
```ts
const png = resvg.render().asPng()
const VALID_MIN_PNG_BYTES = 64           // calibrated against the empty-glyph 128/199 byte outputs
if (png.length <= VALID_MIN_PNG_BYTES) {
  return { ok: false, error: `Resvg rendered empty glyph (${png.length} bytes) for ${absPath}` }
}
```

**Why this works (defense-in-depth):**
- Layer 2b (getBBox undefined) catches missing-font silently-fallback case.
- Layer 2c (PNG size) catches "font was found but is empty / corrupt at glyph-table level".
- Combined, they cover the WR-01 threat model.

**Constraints:**
- `resvg.render()` is synchronous in `@resvg/resvg-js`. Safe inside the existing `try { ... } catch` block.
- The PNG size threshold must be **calibrated empirically** — runner in the VERIFICATION doc reports 128 / 199 bytes for broken inputs. The 64-byte threshold above assumes PNG header (8 bytes) + IHDR + IDAT + IEND minimums; adjust based on actual resvg-js output for known-broken fonts. **RECOMMENDED:** log the size in a debug print under `if (process.env.SVG2JSON_DEBUG_FONT)` so future calibration is observable without code change.
- Performance note (IN-03 from review): calling `.render()` triggers an additional pass — same caveat as constructor. Same mitigation: consider folding into `ensureInit()` singleton.

---

### G3a: `process.execPath` portability — no in-repo analog

**Analog:** none. `process.execPath` is a Node-API standard documented since Node 0.x (returns the absolute path of the executable that started the current Node process).

**The cross-platform pattern in repo (`scripts/build-release.js:7-10`):**
```js
const { execSync } = require('child_process')
try {
  execSync(process.platform === 'win32' ? `rmdir /s /q "${r}" 2>nul` : `rm -rf "${r}"`)
} catch (e) {}
```
Note this file uses shell + literal `node` (per `scripts/build-release.js:61`), so the "in-repo pattern" is NOT a precedent for `process.execPath`. There's no precedent at all — this is a Node-API rewrite, not a "follow the existing pattern" task.

**Pattern to apply (`src/cli.font-validation.test.ts:83`):**
```ts
const res = execFileSync(
  process.execPath,                          // <-- replace 'node' literal at line 83
  [DIST_CLI, svgPath, '-o', outPath],
  { stdio: 'pipe' },
)
```

**Why this pattern:**
- `process.execPath` always points to the Node binary that's running the test, so it works in CI sandboxes, packaged distributions, nvm-shimmed `node` on PATH, etc.
- The `ensureBuilt()` invocations of `'node' ./node_modules/typescript/bin/tsc` and `'node' scripts/copy-fonts.js` (lines 41, 45) are intentionally literal — those are project-internal invocations, not generic `node` calls. Reviewer (WR-04) and verifier (G3 last bullet) both explicitly note these can stay as `'node'`. Do NOT change them.

**Constraints:**
- Apply only to the line 83 subprocess call to `DIST_CLI`. Leave `ensureBuilt()` untouched.
- Vitest itself runs in Node, so `process.execPath` is well-defined at test time.

---

### G3b: Dead `run` export cleanup — no in-repo analog

**Issue (`src/cli.ts:135-137`):**
```ts
export { run }
function run(args: string[] = process.argv) {
  cli.parse(args)
}
```

**Pre-existing problem statement from `13-REVIEW.md:172-189`:**
- `cli.parse()` is already called at module top-level (line 18). Calling `run(['--help'])` would fire `cli.parse()` a second time.
- `run` is not invoked anywhere in the codebase (`grep "run(" src/` returns no matches).
- This is pre-existing dead code from a previous phase.

**Pattern to apply:** simply delete lines 135-137 and the export keyword. There is no in-repo analog for "dead export cleanup" because it's one-off; but the established repo convention (verified by `grep "require.main === module" src/` returning **no matches**) is to let the module top-level side effect at line 18 drive CLI parsing unconditionally — the file is already a script-like entry that does its own parse-on-load.

**Optional `require.main === module` guard (only if future programmatic invocation is desired):**
```ts
// at the end of src/cli.ts, after main()
if (require.main === module) {
  main().catch((err) => {
    console.error(pc.red(`Fatal error: ${String(err)}`))
    process.exit(1)
  })
}
```

**Constraints:**
- The current `main().catch(...)` call (lines 130-133) must NOT be moved into a conditional if the test continues to use the subprocess approach. The subprocess reproduces `process.exit(1)` because the file is the test's entry point through `dist/src/cli.js`. Moving `main().catch` behind a guard would break the integration test unless the test changed to `require('../src/cli')` instead.
- **Recommended:** delete the dead export. Do NOT add a `require.main === module` guard unless the test is also reworked to use module-level imports. The reviewer (WR-05 fix) explicitly allows "remove the export and the function" as the cleaner path.
- If the guard is added anyway, must verify the existing `src/font-validator.test.ts` mocks still load `font-validator.ts` correctly (it imports from `./constants`, which uses `__dirname` — that resolves at import time, independent of `main()` side effects).

---

## Shared Patterns

### Error UX: `console.error(pc.red(...))` + `process.exit(1)`

**Source:** `src/cli.ts:81-83, 119-121, 130-133` (four sites).

```ts
// src/cli.ts:81-83
console.error(pc.red('Error: --output cannot be used with directory input (single file holds one result)'))
process.exit(1)

// src/cli.ts:119-121
console.error(pc.red(`Error: ${result.error}`))
process.exit(1)

// src/cli.ts:130-133 (fatal uncaught rejection)
console.error(pc.red(`Fatal error: ${String(err)}`))
process.exit(1)
```

**Apply to:** every CLI fatal-error branch. Phase 13's font gate at lines 73-77 already follows this pattern.

### Test mocks: `vi.mock` + `vi.importActual` for `fs`

**Source:** `src/font-validator.test.ts:7-13`.

```ts
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return {
    ...actual,
    existsSync: vi.fn(),
  }
})
```

**Apply to:** any test that needs to drive `fs` branches. The reviewer (IN-02) confirms this is the right workaround for Vitest 2.x's restriction on redefining non-configurable properties on the `import * as fs` namespace.

### Mock construction: `vi.fn()` + `mockImplementation`

**Source:** `src/font-validator.test.ts:17-19, 41-42, 95-96`.

```ts
vi.mock('@resvg/resvg-js', () => ({
  Resvg: vi.fn(),
}))
// later:
vi.mocked(Resvg).mockImplementation(() => ({}) as unknown as InstanceType<typeof Resvg>)
```

**Apply to:** the new TTF-magic / `getBBox()` / `render().asPng()` tests in `font-validator.test.ts`. The mock must now return a `getBBox` and `render` shape that matches the real library for the success path, OR return `undefined` / a `< 64-byte` PNG for the failure branches.

### Verifier stderr regex

**Source:** `src/cli.font-validation.test.ts:110` and confirmed empirically in `13-VERIFICATION.md:61, 91`.

```ts
expect(stderr).toMatch(/\x1b\[31m/)   // picocolors red ANSI prefix
expect(stderr).toContain(DIST_FONT)   // absolute path mentioned
expect(stderr).toContain('npm run build')  // recovery hint
```

**Apply to:** every font-related error-path assertion. Keep this exact triad.

### Subprocess test fixture: backup-then-delete dist font

**Source:** `src/cli.font-validation.test.ts:65-66, 73, 77-79, 112-120`.

```ts
const backupDir = mkdtempSync(join(tmpdir(), 'svg2json-font-'))
const backupPath = join(backupDir, 'Source Han Sans CN Regular.ttf')
// ...
copyFileSync(DIST_FONT, backupPath)   // before unlinking
try {
  unlinkSync(DIST_FONT)
  // ... subprocess run ...
} finally {
  copyFileSync(backupPath, DIST_FONT) // restore
  if (!existsSync(DIST_FONT)) {
    throw new Error(`postcondition: dist font not restored at ${DIST_FONT}`)
  }
}
```

**Apply to:** every test that needs to manipulate `dist/src/fonts/Source Han Sans CN Regular.ttf` on disk. The `finally` block is **non-negotiable** — without it, a failed test would corrupt subsequent dev/test sessions.

---

## No Analog Found

| Gap | Reason | Guidance |
|-----|--------|----------|
| TTF magic-byte pre-flight (`isValidFontFile`) | Novel for this codebase. No existing helper anywhere. | Define inline in `src/font-validator.ts`; consider extracting to `src/utils/font-probe.ts` if a future phase needs it (e.g., for upload-pipeline validation). |
| `process.execPath` canonicalization | No in-repo precedent; this is a Node-API rewrite. | Use Node docs as the source of truth (`process.execPath` has been stable since Node 0.12). |
| Dead-export cleanup | One-off; no pattern in repo. | Plain delete is fine. |
| `require.main === module` guard | Not present in any file. | Add only if a future test needs programmatic invocation; otherwise skip. |
| Calibration of `png.length` threshold | Empirical values cited in VERIFICATION.md are 128 and 199 bytes; exact threshold requires tuning. | Use 64 bytes as initial value, log debug output under env-flag, then tune after observing the real-library baseline. |

---

## Constraints (project-wide, applied across all gap fixes)

1. **TypeScript strict mode** (per `tsconfig.json:7`) — do not loosen types. The current `as unknown as ...` double-cast in `font-validator.test.ts` is already flagged in IN-02 for cleanup; the new TTF / bbox / PNG tests should use a defined stub type like `Pick<InstanceType<typeof Resvg>, 'render' | 'getBBox'>` (REVIEW suggested pattern).
2. **CommonJS** (per `tsconfig.json:4`) — `require` is the module syntax; `import` statements are compiled by `tsc` to `require` calls.
3. **`font-validator.ts` synchronous, never-throws contract** (`13-01-PLAN.md:82-87`) — `verifyFontLoaded()` returns `{ ok, error? }` and does not throw. Any new check (magic bytes, `getBBox`, `asPng`) must wrap its work in `try/catch` and surface the failure as `{ ok: false, error: ... }`.
4. **No new dependencies** (`13-01-PLAN.md` Constraint). Use only `node:fs`, `node:path`, `node:os`, `child_process` (all already in the test file's imports).
5. **Picocolors red prefix must be present** (`13-01-PLAN.md:73`) — the validator only emits error text. The `pc.red(...)` wrapping happens in `cli.ts:73-77`. No change needed in the validator itself for color.
6. **Absolute font path must appear in error** — `font-validator.ts:49-60` already does `resolve(FONT_FILE)` and embeds the result. Keep this contract for any new error branches.
7. **`npm run build` recovery hint must appear** — currently hardcoded as `BUILD_HINT = 'npm run build'` at `font-validator.ts:32`. If new error messages need it, concatenate the same constant.

---

## Metadata

**Analog search scope:** `src/`, `scripts/`, `__tests__/`, `docs/`, `.planning/` (research / pitfalls / phases 7, 13, 13-01).

**Files scanned:** 6 source-of-truth files (4 in scope) + 4 nearest-analog files (text-measurer.ts, svg-use-handler.ts, build-release.js, copy-fonts.js) + 2 docs (python-integration.md) + 5 config files (package.json, vitest.config.ts, tsconfig.json) + 1 verified git history (5ae228c execution commit).

**Pattern extraction date:** 2026-08-06.

**Key insight:** the only existing file that does subprocess testing is the one under review — there is no in-repo analog for "well-formed execFileSync test". The reviewer-suggested fix in `13-REVIEW.md:57-81` is therefore *both* the recommended direction and the de-facto codebase pattern (it currently lives embedded as the broken-but-correct outer catch on lines 99-104). The closure plan for G1 is essentially "delete lines 80-94 and rely on the already-existing lines 99-104", which is a minimal-scope edit.

The closest analog for the validator-strengthening questions (G2b/c) is `src/text-measurer.ts` — which is, fittingly, the very module whose zero-dimension guard the verifier cited as the existing safety net behind WR-01. The gap-closure for G2 should mirror the guards in `measureTextBBox()` (`text-measurer.ts:116-122`) and pair with a TTF magic-byte pre-flight for defense-in-depth.
