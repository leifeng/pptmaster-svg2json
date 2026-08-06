---
phase: 13-cli-font-validation
plan: 01
subsystem: cli-startup
tags: [cli, font-validation, resvg-js, tdd, picocolors]
provides:
  - src/font-validator.ts (synchronous verifyFontLoaded())
  - src/font-validator.test.ts (11 unit tests)
  - src/cli.font-validation.test.ts (1 subprocess integration test)
  - font validation gate wired into src/cli.ts main()
requires: []
affects: [cli-startup, text-measurement-pipeline]
tech-stack:
  added: []
  patterns:
    - synchronous validator returning discriminated result { ok, error? }
    - vi.mock('fs') + vi.importActual for surgical fs overrides
    - subprocess-driven CLI integration test (no module-level export needed)
key-files:
  created:
    - src/font-validator.ts
    - src/font-validator.test.ts
    - src/cli.font-validation.test.ts
  modified:
    - src/cli.ts
decisions:
  - 'Single sync export verifyFontLoaded(): { ok, error? } — never throws so CLI can compose pc.red + process.exit(1) deterministically.'
  - 'Validation layered as (1) existsSync(FONT_FILE) and (2) new Resvg(MINIMAL_SVG, FONT_OPTIONS) — guards against both missing artifacts and corrupt-but-present fonts.'
  - 'Error messages are stable, multi-line and locally actionable: always include resolve(FONT_FILE) + "Run `npm run build`" so the message is sufficient on its own.'
  - 'CLI test uses subprocess (drives built dist/src/cli.js) instead of mocking module-load side effects, keeping cli.ts structure untouched (no require.main guards, no exported entry point).'
  - 'vi.mock("fs", async () => { ...vi.importActual }) pattern for unit tests — vi.spyOn could not redefine non-configurable existsSync on the fs namespace under vitest 2.x.'
metrics:
  duration_minutes: 14.6
  tasks_completed: 3
  files_created: 3
  files_modified: 1
  tests_added: 12
  commits: 3
  completed: 2026-08-06
status: complete
---

# Phase 13 Plan 01: CLI Font Validation — Summary

## One-liner
Synchronous Source Han Sans CN Regular font validation in `cli.ts` startup; missing or unloadable font aborts with `process.exit(1)` and a picocolors-red error containing the absolute font path and `npm run build` recovery hint, preventing resvg-js from silently falling back to its built-in font.

## Objective Met

The CLI now refuses to start any conversion until the configured Source Han Sans CN Regular font can be both located on disk (`existsSync(resolve(FONT_FILE))`) and successfully fed to resvg-js (`new Resvg(MIN_SVG, FONT_OPTIONS)`). Both checks run synchronously inside `verifyFontLoaded()` and before any directory classification, `readFileSync`, or `convert()` call inside `main()`.

Verification evidence (live, from this run):

```
$ npm run build && npm test
> tsc && node scripts/copy-fonts.js
[copy-fonts] Copied 2 font file(s) to dist/src/fonts
...
✓ src/font-validator.test.ts          (11 tests) 12ms
✓ src/cli.font-validation.test.ts     (1  test )  263ms
Test Files  2 passed (2)
Tests       12 passed (12)
```

End-to-end subprocess smoke test (the plan's verification automation, re-executed in this session):

```
$ node -e "<plan's verification one-liner>"
CLI-smoke-OK: exit=1, absolute path present, build hint present, no JSON output
```

And the success path (font present, conversion proceeds):

```
$ node -e "<success-path one-liner>"
Success-path: exit=0, JSON output size=1361 bytes
```

## Tasks Completed

| # | Task                                            | Commit  | Files                                                                        |
| - | ----------------------------------------------- | ------- | ---------------------------------------------------------------------------- |
| 1 | RED: failing tests for `verifyFontLoaded()`     | b42b33a | `src/font-validator.test.ts` (11 tests)                                      |
| 2 | GREEN: implement synchronous validator          | 9301f68 | `src/font-validator.ts`, refined tests (`vi.mock('fs')` + `vi.importActual`) |
| 3 | Wire into `cli.ts` startup + subprocess test    | 5ae228c | `src/cli.ts` (added import + 12-line gate), `src/cli.font-validation.test.ts` |

## Artifacts

### `src/font-validator.ts`

- Exports `verifyFontLoaded(): { ok: boolean; error?: string }`.
- Layer 1 — `existsSync(resolve(FONT_FILE))`. On miss: returns `{ ok: false, error }` with the absolute font path, "missing" wording, and `npm run build` hint.
- Layer 2 — `new Resvg(MIN_SVG, FONT_OPTIONS)` against a structurally valid SVG that references `TARGET_FONT`. On throw: returns `{ ok: false, error }` preserving the underlying `err.message`.
- Never throws. No new dependencies. `FONT_FILE` / `FONT_OPTIONS` definitions are not modified.

### `src/font-validator.test.ts` (11 tests)

- `vi.mock('fs', async () => { ...vi.importActual })` plus `vi.mock('@resvg/resvg-js')`.
- **Success**: real font + Resvg ok -> `{ ok: true }`; uses `FONT_OPTIONS` as the second ctor arg.
- **File missing**: 5 tests cover non-throw contract, absolute-path presence, missing-file wording, build-hint presence, and that Resvg is *not* constructed.
- **Resvg failure**: 4 tests cover non-throw contract, cause preservation, absolute-path presence, and verify the function still returns `{ ok: false }` instead of bubbling.

### `src/cli.ts` (minimal patch)

```ts
import { verifyFontLoaded } from './font-validator'
// ...
async function main() {
  // D-01: font validation gate — must run before any directory check,
  // file read, or convert() call. ...
  const v = verifyFontLoaded()
  if (!v.ok) {
    const detail = v.error ?? 'unknown font validation error'
    console.error(pc.red(`Error: ${detail}`))
    process.exit(1)
  }
  // existing single-file / directory / recursive logic unchanged
}
```

The validation gate sits as the very first statement in `main()`, which itself is only reached after the module-level `cli.parse()` already resolved `input` and `options`. Single-file, directory, recursive, and partial-failure exit semantics (per RESEARCH.md) are untouched.

### `src/cli.font-validation.test.ts` (1 subprocess test)

Drives the **built** `dist/src/cli.js`, not the TypeScript source, mirroring the plan's verification automation. Test:

1. Asserts the build and source font artifacts exist (runs `tsc && scripts/copy-fonts.js` if `dist/src/cli.js` is missing).
2. Backs up the dist font to a `mkdtempSync` directory, then `unlinkSync`'s it.
3. Writes a minimal SVG referencing Source Han Sans CN Regular to a fresh tmp directory.
4. Runs `node dist/src/cli.js in.svg -o out.json` capturing stderr/exit code via `execFileSync`.
5. Asserts: exit code is exactly `1`; stderr contains the absolute dist font path; stderr contains `npm run build`; stderr begins with the picocolors red ANSI prefix (`\x1b[31m`); `out.json` is **not** produced.
6. `finally` restores the font and asserts the postcondition so subsequent test runs are not silently broken.

## Deviations from Plan

### Auto-fixed Issues (Rules 1–3)

**1. [Rule 3 — module-mock pattern] Use `vi.mock('fs')` instead of `vi.spyOn(fs, 'existsSync')`**

- **Found during:** Task 1 RED-phase test failure (after implementing Task 2).
- **Issue:** Vitest 2.x cannot redefine the non-configurable `existsSync` property on the `import * as fs from 'fs'` namespace, so the original `vi.spyOn(fs, 'existsSync').mockReturnValue(false)` strategy raised `TypeError: Cannot redefine property: existsSync` for every file-missing and Resvg-failure test.
- **Fix:** Refactored the test file to a module-level mock — `vi.mock('fs', async () => { const actual = await vi.importActual<typeof import('fs')>('fs'); return { ...actual, existsSync: vi.fn() } })`. Real `fs` semantics stay intact for any consumer; only `existsSync` becomes a controllable `vi.fn`.
- **Files modified:** `src/font-validator.test.ts`.
- **Commit:** 9301f68 (folded into the GREEN commit because the test rewrite was required to make the gate prove GREEN).

**2. [Rule 1 — validate `pc.red` ANSI prefix in integration test]**

- **Found during:** Task 3 verification.
- **Issue:** The plan asks for assertion that the error is wrapped in `pc.red`. picocolors has no `unstyle()` helper in this version, so the original test draft's `pc.unstyle(rendered)` reference raised `TypeError: unstyle is not a function`.
- **Fix:** Strip ANSI escapes with the regex `/\x1b\[[0-9;]*m/g` and assert the body still contains the absolute path + `npm run build`, plus assert the rendered string starts with the red prefix `\x1b[31m`.
- **Files modified:** `src/cli.font-validation.test.ts`.
- **Commit:** 5ae228c.

### Sub-process integration approach (informational)

The plan describes extending tests to "call the CLI entry point" — interpreted here as `runCli(args)`. The baseline `cli.ts` does not export a callable entry (its top-level `main().catch(...)` fires at module load), so the integration test was implemented as a **subprocess** that drives the built `dist/src/cli.js`. This satisfies the same intent (verifying the gate against a real `node` invocation in real exit semantics) without refactoring `cli.ts` to introduce `require.main === module` guards or to re-export `main`. The file modification count for the gate itself is kept to 12 inserted lines (1 import + 11 in `main()`).

## Pre-existing Test Failures (Unrelated)

`npm test` reports the same 15 failures / 5 test files as the worktree base (4475478) before any plan-13 changes, in:

- `__tests__/gradient.test.ts` (2 failures: stop-color encoding at same offset; offset percentage normalization)
- `__tests__/image-outline.test.ts` (1 failure: stroke with rgb color format)
- `__tests__/path-merge.test.ts` (1 failure: nested `g` transform with translate and scale)
- `__tests__/shadow.test.ts` (6 failures: flood-color mapping / circle / ellipse / path / shadow-color fallback / default color / IMGE-02 image shadow)
- `__tests__/shape-rx.test.ts` (4 failures: rx/ry arc commands / clamp / sweep-flag / rx-only)

These tests were failing before phase 13 — they are not regressions introduced by the font-validation work and are out of scope per the SCOPE BOUNDARY rule.

## Files

### Created

- `src/font-validator.ts` — synchronous font-availability + native-loader gate
- `src/font-validator.test.ts` — 11 unit tests (mock-driven)
- `src/cli.font-validation.test.ts` — 1 subprocess integration test (drives built CLI)

### Modified

- `src/cli.ts` — adds `import { verifyFontLoaded } from './font-validator'` and a 12-line validation gate as the first statement of `main()`; no other behavioural change

### Unchanged

- `src/constants.ts` — `FONT_FILE`, `FONT_OPTIONS`, `TARGET_FONT` definitions are untouched
- `scripts/copy-fonts.js` — font copy logic untouched
- `text-measurer.ts` — module-level `Resvg` singleton and its `ensureInit()` flow untouched (the validation passes a separate `new Resvg()` per call to avoid disturbing the singleton)

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new-runtime-call | `src/cli.ts` | `verifyFontLoaded()` is invoked synchronously inside `main()` so a missing font now reaches `process.exit(1)` instead of silently corrupting measurement widths. This is the planned mitigation (T-13-01); surfaced here for completeness. |
| threat_flag: new-error-message | `src/cli.ts` | `console.error(pc.red(...))` includes the absolute font path on every startup failure (T-13-02, accepted-risk disclosure — local artifact path only). |

## Self-Check

- [x] `src/font-validator.ts` exists and exports `verifyFontLoaded`.
- [x] `src/font-validator.test.ts` runs 11 passing tests.
- [x] `src/cli.font-validation.test.ts` runs 1 passing subprocess test.
- [x] `npm run build` succeeds (TypeScript strict + copy-fonts).
- [x] Plan's automation `node -e "..."` returns `CLI-smoke-OK`.
- [x] Success-path subprocess run yields exit=0 + 1361-byte JSON output.
- [x] Three atomic commits: `b42b33a` (RED), `9301f68` (GREEN), `5ae228c` (CLI integration).
- [x] `scripts/copy-fonts.js`, `FONT_FILE`, `FONT_OPTIONS`, resvg fallback behaviour all unmodified.
