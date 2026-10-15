---
phase: 13-cli-font-validation
verified: 2026-08-06T16:55:00Z
status: gaps_found
score: 4/4 must-haves verified (see Code Review Findings for what the score does and does not mean)
behavior_unverified: 1
overrides_applied: 0
overrides: []
gaps:
  - truth: "字体验证成功时会实际构造一次最小 Resvg 实例，避免仅凭文件存在就宣称字体可加载"
    status: failed
    reason: "Plan truth is literally satisfied (construction happens), but the ROADMAP-level goal clause '若字体缺失或加载失败…防止后续测量使用 resvg 内置 fallback' requires the constructor to actually catch load failures. Empirical reproduction shows @resvg/resvg-js@2.6.2 does NOT throw on missing / empty / truncated TTF inputs — getBBox() returns undefined and render().asPng() returns a 128-byte empty PNG instead. Layer 2 is therefore a no-op for the threat it was designed to address."
    artifacts:
      - path: src/font-validator.ts
        issue: "Lines 61-66: new Resvg(VALIDATION_SVG, FONT_OPTIONS) is documented as catching 'malformed/corrupt fonts that pass the existence check' but the real library never throws at construction. The docstring/comment overstate the defense."
    missing:
      - "Either tighten Layer 2 to actually call getBBox() / render().asPng() and assert non-zero output, or relax the docstring to admit Layer 1 is the only effective check and rely on text-measurer.ts's existing zero-dimension rejection."
      - "Or add a cheap TTF magic-byte pre-flight (TrueType 0x00010000 / OpenType 'OTTO' / Apple 'true' / PostScript 'typ1') before the Resvg call so corrupt-but-present fonts are caught at sub-millisecond cost."
  - truth: "字体文件缺失或 Resvg 无法用该字体构造实例时，CLI 立即以 exit code 1 结束，不产生部分转换输出"
    status: failed
    reason: "User-visible CLI behavior IS correct (independent subprocess reproduction: exit=1, no JSON output, red error with absolute path + npm run build), but the committed integration test in src/cli.font-validation.test.ts does NOT actually verify the exit code. (execFileSync as unknown as { lastStatus?: number }).lastStatus is always undefined — confirmed by `'lastStatus' in cp.execFileSync === false`. The IIFE swallows the thrown error before the outer catch can read err.status, so the outer catch is unreachable. The test passes by construction (code = 1 is the unconditional default), not by observation. CI regression coverage for the subprocess exit code is therefore missing."
    artifacts:
      - path: src/cli.font-validation.test.ts
        issue: "Lines 80-104: the IIFE wrap of execFileSync defeats the outer catch. The lastStatus ternary on lines 96-98 reads a property that does not exist. Lines 123-124: `void dirname` hack keeps a never-used import alive to silence strict mode."
    missing:
      - "Replace the IIFE + lastStatus lookup with a direct catch on execFileSync that reads err.status and err.stderr (the reviewer-suggested snippet is correct)."
      - "Add a success-path regression test (the second `it()`) to cover the green branch; CR-01 currently lets the test pass even if a future regression caused the CLI to silently exit 0."
deferred: []
behavior_unverified_items:
  - truth: "字体验证成功时会实际构造一次最小 Resvg 实例，避免仅凭文件存在就宣称字体可加载"
    test: "Run a Node script: const {Resvg} = require('@resvg/resvg-js'); const r = new Resvg(MIN_SVG, { font: { fontFiles: [truncated-ttf], loadSystemFonts: false, defaultFontFamily: 'Source Han Sans CN Regular' } }); console.log('threw?', false, 'bbox=', r.getBBox(), 'pngBytes=', r.render().asPng().length); — does NOT throw; bbox=undefined; pngBytes=128. Then repeat with an empty TTF and a /no/such/file.ttf path — same outcome."
    expected: "Per the docstring, the constructor should throw or otherwise signal that the font is unloadable so verifyFontLoaded returns { ok: false }. Instead, Resvg returns a silent empty-glyph render."
    why_human: "Whether this gap matters depends on the team's threat model. text-measurer.ts already rejects zero-dimension bboxes at measurement time, so a corrupt font eventually surfaces as a measurement error during conversion rather than as a startup-time error. The decision (tighten validator vs. accept Layer 1 + downstream detection) is a design call, not a mechanical fix."
human_verification: []
audit_acknowledged:
  milestone: v1.9
  at: 2026-10-15
  status: gaps_found
---

# Phase 13: CLI Font Validation — Verification Report

**Phase Goal (ROADMAP):** CLI 启动时验证 Source Han Sans CN Regular 字体文件已正确加载到 resvg-js；若字体缺失或加载失败，输出红色错误信息并以 exit 1 退出，防止后续测量使用 resvg 内置 fallback 字体导致宽度偏差。
**Verified:** 2026-08-06T16:55:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification.

## Goal Achievement

The primary user-visible behavior — missing `dist/src/fonts/Source Han Sans CN Regular.ttf` causes the CLI to abort with a picocolors-red error containing the absolute path and the `npm run build` recovery hint, exit code 1, and no JSON output — is empirically verified. An independent subprocess reproduction (driving `dist/src/cli.js` via `execFileSync` and reading `err.status` directly, not via the bug-flagged `lastStatus` path) returns exactly that. The success path likewise produces a 1361-byte JSON output with exit 0.

However, the code review surfaced two issues that move the verdict from `passed` to `gaps_found`:

1. The committed integration test (`src/cli.font-validation.test.ts`) does not actually verify the subprocess exit code; it passes by construction. CR-01 is independently reproduced and confirmed.
2. The Resvg construction check (Layer 2 of the validator) does not actually catch corrupt or malformed font files in `@resvg/resvg-js@2.6.2`. The phase goal's "或加载失败" branch is not enforced for the realistic threat (truncated / zero-byte / missing-magic-bytes fonts). WR-01 is independently reproduced and confirmed.

Both gaps are real, but neither breaks the user-facing happy/sad path for the most common failure (font file missing). They are defense-depth and test-quality issues.

## Observable Truths (PLAN frontmatter)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | CLI 在开始读取或转换任何 SVG 文件前同步检查目标字体；字体可用时继续执行正常转换。 | VERIFIED | `src/cli.ts:71-77` calls `verifyFontLoaded()` as the first statement of `main()`. Independent success-path repro: exit=0, 1361-byte JSON written. |
| 2 | 字体文件缺失或 Resvg 无法用该字体构造实例时，CLI 立即以 exit code 1 结束，不产生部分转换输出。 | VERIFIED (behavior) / TEST GAP | Independent subprocess (clean `err.status` capture) returns exit=1 with no JSON output when dist font is unlinked. But the committed integration test for this is broken (CR-01, see Gaps). |
| 3 | 失败信息通过 picocolors 红色输出，明确包含目标字体的绝对路径以及重新运行 npm run build 等修复建议。 | VERIFIED | Stderr begins with `\x1b[31mError: Font file missing: <abs path>... Recover by running \`npm run build\``; independently captured from a real subprocess. |
| 4 | 字体验证成功时会实际构造一次最小 Resvg 实例，避免仅凭文件存在就宣称字体可加载。 | VERIFIED (literal) / DEFENSE GAP | Code does construct a Resvg instance (`src/font-validator.ts:65`). However, the *intent* of this construction is undermined by WR-01: the real library does not throw on bad fonts, so the check is a no-op against the threat it was designed to address. Marked as a `gaps_found` failure against the ROADMAP-level "或加载失败" clause. |

**Score:** 4/4 truths verified at the plan-frontmatter literal level. The two `gaps_found` items are quality-of-defense issues, not literal truth failures. See Code Review Findings below.

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/font-validator.ts` | Exports `verifyFontLoaded(): { ok: boolean; error?: string }` synchronous validator. | VERIFIED | 79 lines, no TODOs, never throws (try/catch wraps Resvg construction at lines 61-77). |
| `src/font-validator.test.ts` | 11 unit tests covering success, file missing, Resvg failure. | VERIFIED | All 11 tests pass (mock-based). Coverage of Layer 2 is symbolic only — mocks the library, so does not validate real behavior. |
| `src/cli.ts` | Modified to import and call `verifyFontLoaded()` in `main()`. | VERIFIED | Line 6: `import { verifyFontLoaded } from './font-validator'`. Lines 71-77: gate as the first statement of `main()`. |
| `src/cli.font-validation.test.ts` (added) | Subprocess integration test for missing-font case. | PARTIAL | Test passes; but CR-01 makes the `code === 1` assertion vacuous. Treat as evidence of "test was written" not "exit code is verified." |

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/font-validator.ts` | `src/constants.ts` | Reads `FONT_FILE`, `FONT_OPTIONS`, `TARGET_FONT` | WIRED | Lines 21, 48, 65. |
| `src/font-validator.ts` | `@resvg/resvg-js` | Constructs `new Resvg(VALIDATION_SVG, FONT_OPTIONS)` | WIRED (defense-weak) | Line 65. Empirically does not throw on bad fonts. |
| `src/cli.ts` | `src/font-validator.ts` | `main()` calls `verifyFontLoaded()` before file processing | WIRED | Lines 5, 71. |

## Data-Flow Trace (Level 4)

N/A — the validator is a synchronous function that returns `{ ok, error? }`. No dynamic data is rendered; no DB / API sources feed it. The single data input is `FONT_FILE` on disk.

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Plan's claimed "CLI smoke test" (exit=1 on missing font) | `node -e "<independent repro using err.status>"` (font unlinked) | `code: 1`, stderr starts with `\x1b[31mError: Font file missing: E:\git\svg2json\dist\src\fonts\Source Han Sans CN Regular.ttf`, contains `npm run build`, `outPathExists: false` | PASS |
| Success path (font present, conversion proceeds) | `node -e "<independent repro with font intact>"` | `code: 0`, `jsonExists: true`, `jsonSize: 1361` | PASS |
| `execFileSync.lastStatus` existence | `node -e "const cp=require('child_process'); console.log('lastStatus' in cp.execFileSync, typeof cp.execFileSync.lastStatus)"` | `false undefined` | CONFIRMED — CR-01 is real |
| Resvg construction on missing/empty/truncated TTF | `new Resvg(MIN_SVG, {font:{fontFiles:['/no/such/file.ttf'], loadSystemFonts:false, defaultFontFamily:'Source Han Sans CN Regular'}})` | Does not throw; `getBBox() === undefined`; `render().asPng().length === 128` | CONFIRMED — WR-01 is real |

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FVAL-01 | `13-01-PLAN.md:13` (requirements frontmatter) | "CLI 启动时验证 Source Han Sans CN Regular 字体文件已正确加载到 resvg-js" (paraphrased from ROADMAP). | PARTIALLY SATISFIED | The "字体缺失" half is fully covered; the "或加载失败" half (corrupt-but-present font files) is not enforced by the Resvg construction check (see WR-01). No global `REQUIREMENTS.md` exists — the ID is local to the plan frontmatter; ROADMAP.md still says "Requirements: TBD". |

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/cli.font-validation.test.ts` | 4, 123-124 | Unused `dirname` import kept alive by `void dirname` hack | INFO | Code smell; trivially fixable by removing the import and the `void dirname` line. |
| `src/cli.font-validation.test.ts` | 80-104 | IIFE wrap of `execFileSync` swallows the thrown error before the outer `catch` can read `err.status` | CRITICAL (CR-01) | Test passes by construction; CI does not actually regression-guard the subprocess exit code. |
| `src/cli.font-validation.test.ts` | 96-98 | Reads non-existent `execFileSync.lastStatus` property | CRITICAL (CR-01) | Always `undefined`; ternary always falls through to `: 1`, making the assertion vacuous. |
| `src/font-validator.ts` | 9-15 (docstring) | Claims Layer 2 "catches malformed/corrupt fonts that pass the existence check" | WARNING (WR-01) | Empirically false: `@resvg/resvg-js@2.6.2` does not throw on bad fonts. The comment on line 62-64 is honest about this; only the docstring and the unit-test suite overstate. |

No `TBD / FIXME / XXX` markers in the new code.

## Code Review Findings Impact

### CR-01 (Critical) — integration test does not verify subprocess exit code

- **Reproduced independently.** `'lastStatus' in cp.execFileSync === false`; `typeof cp.execFileSync.lastStatus === 'undefined'`. The IIFE wrap on lines 80-94 of the test catches `execFileSync` errors and returns `{ stderr, stdout }` cleanly, so the outer `catch` on lines 99-104 is unreachable for the typical failure path (`outerCatchReached: false` in my independent repro). The `code` variable is therefore unconditionally set to `1` regardless of what the subprocess actually does.
- **Impact on verification:** the committed test for must-have truth 2 is not a real test of the subprocess exit code. However, the *underlying CLI behavior* IS correct (verified via a clean `err.status` capture in my own independent repro). The must-have is therefore `VERIFIED (behavior)` but the test-quality issue must be fixed before the next regression can be trusted.
- **Suggested override (judgment-tier):** the gap is mechanical (replace IIFE + lastStatus with direct catch on `err.status` and `err.stderr`); no override needed; just close the gap.

### WR-01 (Warning) — Resvg construction does not catch corrupt fonts

- **Reproduced independently.** Three test inputs:
  1. `fontFiles: ['/no/such/file.ttf']` → constructor returns; `getBBox() === undefined`; `render().asPng().length === 128`.
  2. `fontFiles: [Buffer.alloc(0)]` (0-byte TTF) → same.
  3. `fontFiles: [realFont.subarray(0, 100)]` (truncated TTF) → same.
- **Impact on the ROADMAP-level goal:** the goal's "或加载失败" branch is not enforced for the realistic threat model. A user who has a 0-byte `dist/src/fonts/Source Han Sans CN Regular.ttf` will see the CLI happily proceed; the eventual measurement error from `text-measurer.ts` (zero-dimension bbox rejection) will surface during conversion rather than at startup. This is not the "红色错误信息 + exit 1" behavior the phase goal promises.
- **Suggested overrides:** the gap is a design call (tighten validator vs. accept Layer-1 + downstream detection). A human must decide; the verifier surfaces it but does not force the choice.

### WR-02..05 (Cleanup) — unused `dirname` import, missing success-path test, hardcoded `'node'`, dead `run` export

- All four are real but low-severity. They are not blockers for the phase goal.

## Human Verification Required

No items. The remaining defense-depth question (WR-01) is routed to the gaps list, not to human verification, because the verifier reproduced the empirical evidence objectively — the question is a design call that should be made during `/gsd-plan-phase --gaps` for gap closure, not as a UAT item.

## Gaps Summary

The phase delivers the primary user-visible behavior correctly: missing dist font → red error + exit 1 + no JSON output; present font → successful conversion. This is independently verified.

However:

1. **The committed integration test for the failure path is broken (CR-01).** It always asserts `code === 1` regardless of what the subprocess does, because it reads a non-existent `execFileSync.lastStatus` property inside an IIFE that swallows the error. The test passes by construction, not by evidence. CI regression coverage for the subprocess exit code is therefore effectively absent.
2. **The validator's Layer 2 (Resvg construction) does not actually catch corrupt/malformed font files in `@resvg/resvg-js@2.6.2` (WR-01).** Empirically the constructor returns a valid object and only `getBBox()` / `render().asPng()` later reveal the failure. This means the phase goal's "或加载失败" clause — preventing the resvg fallback for the case where a corrupt font is on disk — is not enforced at startup; the failure will surface later as a measurement error during conversion, not as a clean red `process.exit(1)`.

Both gaps are real. Closing them is the recommended next action (see Recommended Next Action).

## Recommended Next Action

**Route:** `gaps_found` → run `/gsd-plan-phase --gaps` to produce a targeted closure plan covering:

- **G1 (CR-01):** Rewrite `src/cli.font-validation.test.ts` to remove the IIFE and the `lastStatus` lookup. Use a direct `try { execFileSync(...) } catch (e) { code = e.status; stderr = e.stderr.toString() }` pattern (the reviewer's suggested snippet is correct). Also add a second `it()` for the success path so a future regression in the conversion pipeline under the validation gate is caught.
- **G2 (WR-01):** Either (a) tighten the validator's Layer 2 to actually call `getBBox()` or `render().asPng()` and assert the bbox is non-zero / the PNG exceeds a sanity threshold, or (b) relax the docstring to honestly state that Layer 1 is the only effective check and rely on the existing `text-measurer.ts` zero-dimension rejection. The recommended path is (a) combined with an even cheaper pre-flight: validate TTF magic bytes (`0x00010000` for TrueType, `OTTO` for OpenType-CFF, `true` for Apple TrueType, `typ1` for PostScript) — sub-millisecond cost, catches truncation and zero-byte files before WASM init.
- **G3 (WR-02..05):** Cleanup — remove unused `dirname` import; replace literal `'node'` with `process.execPath`; remove the dead `run` export from `src/cli.ts` (or wire it up via `require.main === module` guard).

The `void dirname` line at the bottom of `src/cli.font-validation.test.ts` and the `run` function exported from `src/cli.ts` are not blockers but should be cleaned up in the same pass.

---

_Verified: 2026-08-06T16:55:00Z_
_Verifier: Claude (gsd-verifier)_
