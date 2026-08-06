---
phase: 13-cli-font-validation
plan: 02
type: execute
wave: 2
subsystem: cli-startup-defense-depth
tags: [cli, font-validation, resvg-js, tdd, picocolors, gap-closure]
provides:
  - src/font-validator.ts (Layer 1.5 magic-byte pre-flight + Layer 2 getBBox check)
  - src/font-validator.test.ts (19 unit tests, +8 branches)
  - src/cli.font-validation.test.ts (5 subprocess it(), real exit-code capture)
  - src/cli.ts (dead run export removed)
requires:
  - "13-01"
affects: [cli-startup, text-measurement-pipeline]
tech-stack:
  added: []
  patterns:
    - "synchronous validator: existsSync -> readSync(openSync) magic-bytes -> new Resvg + getBBox"
    - "module-level let defaults (MOCK_MAGIC, getBBoxImpl) rebuilt in beforeEach to survive vi.restoreAllMocks()"
    - "runCli() helper centralizes direct catch on err.status / err.stderr"
    - "process.execPath + FORCE_COLOR=1 for cross-platform non-TTY subprocess tests"
key-files:
  modified:
    - src/font-validator.ts
    - src/font-validator.test.ts
    - src/cli.font-validation.test.ts
    - src/cli.ts
decisions:
  - "Magic-byte pre-flight (TTF 0x00010000 / OTTO / 'true' / 'typ1' / 'ttcf') chosen over PNG-byte threshold: empirically 264B vs 128B gap is too tight across resvg-js versions."
  - "getBBox() non-zero check tightened because real @resvg/resvg-js@2.6.2 silently renders empty glyphs for missing/empty/truncated TTF — bbox undefined or zero-dim is the only reliable signal."
  - "Truncated-but-valid-magic TTF intentionally hits the getBBox branch (not magic) — proves the two layers each guard a distinct failure surface."
  - "Direct catch on err.status / err.stderr (not execFileSync.lastStatus — confirmed non-existent) is the canonical Node pattern; verified by pre-commit RED-fail sanity check."
  - "Removed dead 'run' export only; no require.main === module guard introduced (would break subprocess integration test)."
metrics:
  duration_minutes: 22
  tasks_completed: 3
  files_modified: 4
  tests_added: 13
  commits: 3
  completed: 2026-08-06
status: complete
---

# Phase 13 Plan 02: Gap Closure — Summary

## One-liner

Closes the three gap families from 13-VERIFICATION.md (G1/CR-01 broken subprocess exit-code capture, G2/WR-01 Resvg Layer-2 silent-fallback leak, G3/WR-02..05 dead code + portability cleanup) by adding a sub-millisecond TTF magic-byte pre-flight, a `getBBox()` non-empty/non-zero check, a real exit-code `runCli()` helper, three real corrupt-font subprocess cases, and removing the dead `run` export.

## Objective Met

The 13-01 validator is now defense-in-depth: three layers (`existsSync` → TTF/OTF magic-bytes → Resvg `getBBox()` non-zero) catch every realistic font load failure mode that `@resvg/resvg-js@2.6.2` can produce, including the previously-undetected case of "corrupt-but-present" font files. The committed subprocess integration test now actually observes the subprocess exit code (verified by a pre-commit RED-fail sanity check that inverted `toBe(1)` → `toBe(0)` and saw the test fail), covers the success path, and runs three real corrupt-font subprocesses against the built `dist/src/cli.js` (no mock-only false positives).

Verification evidence from this run:

```
$ npm run build && npx vitest run src/font-validator.test.ts src/cli.font-validation.test.ts
> tsc && node scripts/copy-fonts.js
[copy-fonts] Copied 2 font file(s) to E:\git\svg2json\dist\src\fonts
✓ src/font-validator.test.ts          (19 tests)  16ms
✓ src/cli.font-validation.test.ts     (5  tests) 1080ms
Test Files  2 passed (2)
Tests       24 passed (24)
```

Independent subprocess repro (13-01-PLAN.md:95 verification automation, re-executed):

```
$ node -e "<13-01-PLAN.md line 95 inline script>"
CLI-smoke-OK: exit=1, absolute path present, build hint present, no JSON output
```

Full-suite regression check (`npx vitest run`):

```
Test Files  5 failed | 17 passed (22)
     Tests  15 failed | 240 passed (255)
```

15 baseline failures match the documented 13-01 pre-existing set (gradient 2 + image-outline 1 + path-merge 1 + shadow 7 + shape-rx 4); no new failures introduced.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Layer 1.5 magic-byte pre-flight + getBBox non-zero (G2) | `7da69a5` | `src/font-validator.ts`, `src/font-validator.test.ts` |
| 2 | CR-01/G1 exit-code capture + WR-02..04 + 3 real corrupt-font subprocess cases | `05fdd57` | `src/cli.font-validation.test.ts` |
| 3 | G3 dead `run` export removal | `84f5822` | `src/cli.ts` |

## Deviations from Plan

### Auto-fixed Issues (Rules 1–3)

**1. [Rule 1 — Truncated-font case routes to getBBox, not magic]**

The plan hypothesized that the truncated TTF would fail magic-bytes. Empirically `Source Han Sans CN Regular.ttf` begins `0x00 0x01 0x00 0x00` (TrueType magic) so truncation at byte 100 preserves the magic. The truncated-font test therefore asserts `stderr.toContain('getBBox')`, which is the correct semantics for the two-layer defense — magic catches "completely unrecognized byte stream," getBBox catches "looks like a font but the glyph table is broken." Documented inline in the test helper comment.

### Plan-as-written

No further deviations. All auto-fixed deviations are mechanical and match the plan's "再次验证 RED 假阳性" intent (Sanity check executed on the failure-branch test before commit; passed cleanly).

## Artifacts

### `src/font-validator.ts` — defense-in-depth validator

Three synchronous layers, never throws:

1. **`existsSync(resolve(FONT_FILE))`** — Layer 1, unchanged from 13-01.
2. **`readFontMagic()` + `hasValidFontMagic()`** — Layer 1.5 (NEW). Synchronous `openSync`/`readSync`/`closeSync` of the first 4 bytes; compared against `VALID_FONT_MAGICS` (`0x00010000`, `OTTO`, `true`, `typ1`, `ttcf`). Sub-millisecond cost; runs before any native loader. Returns `{ ok: false, error: '<abs path> ... missing TTF/OTF magic bytes or truncated below 4 bytes ... npm run build ...' }` on miss.
3. **`new Resvg(...)` + `getBBox()` non-zero check** — Layer 2 (TIGHTENED). Returns `{ ok: false, error: 'Resvg getBBox() returned no bounding box ... getBBox ... npm run build ...' }` when `getBBox()` is `undefined` or zero-dimension. Construction-time errors preserve the original 13-01 cause-message contract.

### `src/font-validator.test.ts` — 19 tests

| Group | Count | Notes |
|-------|-------|-------|
| success path (real font + Resvg ok) | 2 | uses default mock; FONT_OPTIONS assertion unchanged |
| font file missing | 5 | asserts path / missing-keyword / npm run build / non-throw / Resvg not constructed |
| Resvg construction failure | 4 | asserts cause preservation / path / non-throw |
| TTF magic-byte pre-flight | 3 | NEW: missing magic → reject + Resvg not constructed; TrueType → ok; OTTO → ok |
| Resvg getBBox zero/undefined | 3 | NEW: undefined → ok:false + getBBox; zero-dim → ok:false + getBBox; non-zero → ok |
| font empty / truncated | 2 | NEW: 0 bytes → ok:false + Resvg not constructed; 2 bytes → ok:false + Resvg not constructed |

Mock shape upgraded: `fs.sync` mock exposes `openSync`/`readSync`/`closeSync`; `Resvg` mock defaults to a getter that returns the module-level `getBBoxImpl`. Both `MOCK_MAGIC` and `getBBoxImpl` are module-level `let` defaults rebuilt in `beforeEach` so factory mocks survive `vi.restoreAllMocks()`.

### `src/cli.font-validation.test.ts` — 5 subprocess tests

Single `runCli(args)` helper:

```ts
function runCli(args: string[]): { code: number; stdout: string; stderr: string } {
  // direct catch on err.status / err.stderr — NOT execFileSync.lastStatus
  // uses process.execPath + env: { ...process.env, FORCE_COLOR: '1' }
}
```

Tests:

| # | Scenario | Asserts |
|---|----------|---------|
| 1 | font unlinked | `code === 1`, stderr contains DIST_FONT + `npm run build` + `\x1b[31m`, out.json absent |
| 2 | font present (success path) | `code === 0`, out.json exists and > 100 bytes, stderr has NO `\x1b[31m` |
| 3 | font = 0 bytes | `code === 1`, stderr contains `magic bytes` |
| 4 | font = wrong magic (`XXXX...`) | `code === 1`, stderr contains `magic bytes` |
| 5 | font = first 100 bytes (magic survives) | `code === 1`, stderr contains `getBBox` |

Backup/restore of DIST_FONT in `finally` for all 4 mutating cases. `afterAll` recursively removes tracked `mkdtemp` directories.

Pre-commit sanity check: temporarily inverted failure-branch `toBe(1)` → `toBe(0)`, ran test, observed `AssertionError: expected 1 to be +0`; reverted to `toBe(1)`, re-ran, observed green. This proves the assertion now reflects the subprocess exit code rather than a hardcoded default.

### `src/cli.ts` — dead code removal

Deleted lines 135–137:

```ts
export { run }
function run(args: string[] = process.argv) {
  cli.parse(args)
}
```

The top-level `main().catch(...)` chain is preserved verbatim — it is what makes the subprocess-driven integration test observe `process.exit(1)`. No `require.main === module` guard introduced (would break the subprocess test).

## Pre-existing Test Failures (Unrelated, Unchanged)

15 stable baseline failures from before phase 13 (and before plan 13-02), as documented in 13-01-SUMMARY.md:

- `__tests__/gradient.test.ts` — 2
- `__tests__/image-outline.test.ts` — 1
- `__tests__/path-merge.test.ts` — 1
- `__tests__/shadow.test.ts` — 7
- `__tests__/shape-rx.test.ts` — 4

Total: 15. These are not regressions and are out of scope per the SCOPE BOUNDARY rule (and per 13-02 plan's "不要做的事" list).

## Files

### Modified

- `src/font-validator.ts` — adds Layer 1.5 magic-byte pre-flight; tightens Layer 2 with `getBBox()` non-zero check
- `src/font-validator.test.ts` — 11 → 19 tests; mock shape upgraded; default `MOCK_MAGIC` and `getBBoxImpl` rebuilt in `beforeEach`
- `src/cli.font-validation.test.ts` — `runCli()` helper; real exit-code capture via `err.status`; success-path `it()`; 3 real corrupt-font subprocess `it()`; `process.execPath` + `FORCE_COLOR=1`; `dirname` import removed; `afterAll` cleanup
- `src/cli.ts` — dead `run` export + function deleted

### Unchanged

- `src/constants.ts` — `FONT_FILE`, `FONT_OPTIONS`, `TARGET_FONT` definitions are untouched
- `scripts/copy-fonts.js` — font copy logic untouched
- `src/text-measurer.ts` — module-level `Resvg` singleton and its `ensureInit()` flow untouched
- `vitest.config.ts` — vitest configuration untouched
- `package.json` — no dependency changes

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: defense-strengthened | `src/font-validator.ts` | New Layer 1.5 (magic-bytes) closes the "truncated/empty/masquerading" gap that Layer 1 cannot catch. Tightened Layer 2 (getBBox non-zero) catches the silent fallback to built-in font. |
| threat_flag: test-portability | `src/cli.font-validation.test.ts` | `process.execPath` + `FORCE_COLOR=1` makes subprocess tests portable across nvm/fnm/CI sandboxes and non-TTY environments. |
| threat_flag: dead-code-removed | `src/cli.ts` | `run` export removal; no `require.main === module` guard added so the subprocess test remains reachable. |

## Self-Check

- [x] `src/font-validator.ts` exports `verifyFontLoaded` with three-layer defense
- [x] `src/font-validator.test.ts` runs 19 passing tests (11 original semantics preserved + 8 new branches)
- [x] `src/cli.font-validation.test.ts` runs 5 passing subprocess tests with real exit-code capture
- [x] `npm run build` succeeds (TypeScript strict + copy-fonts)
- [x] `npx tsc --noEmit` returns 0 errors
- [x] Plan's verification automation (`13-01-PLAN.md:95` node -e script) returns `CLI-smoke-OK`
- [x] Pre-commit RED-fail sanity check proves failure-branch assertion observes subprocess exit code
- [x] Full suite `npx vitest run` matches documented 15-failure baseline; no new failures introduced
- [x] Three atomic commits: `7da69a5` (G2), `05fdd57` (G1+real-corrupt-font), `84f5822` (G3 cleanup)
- [x] `scripts/copy-fonts.js`, `FONT_FILE`, `FONT_OPTIONS`, resvg fallback behavior, vitest config all unmodified
- [x] No new dependencies added