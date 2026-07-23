---
phase: 11-text-width-height-passthrough
verified: 2026-07-23T15:10:00Z
status: passed
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/6 must-haves verified (traceability remediation gap)
  gaps_closed:
    - "REQUIREMENTS.md lists TEXT-WHPASS-01/02/03 with Phase 11 mapping and traceability row updated"
    - "PLAN frontmatter declares requirements: [TEXT-WHPASS-01, TEXT-WHPASS-02, TEXT-WHPASS-03]"
    - "SUMMARY requirements-completed lists TEXT-WHPASS-01/02/03"
  gaps_remaining: []
  regressions: []
---

# Phase 11: Text Width/Height Passthrough Verification Report

**Phase Goal:** SVG `<text>` 同时声明 `width` 和 `height` 时，跳过 resvg-js 测量，直接使用属性值（按 scaleX/scaleY 缩放）作为 PPTTextElement 的 width/height.
**Verified:** 2026-07-23T15:10:00Z
**Status:** passed
**Re-verification:** Yes — after traceability remediation commit `9fe728f`

## Goal Achievement

### Observable Truths (Roadmap Success Criteria + Plan must-haves)

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | 当 SVG `<text width="..." height="...">` 同时声明两个属性时，`transformElement` 不调用 `measureTextElement` | ✓ VERIFIED | `src/transformer/transform-to-pptel.ts:1520-1527` — `usePassthrough` flag guards the passthrough block; `else` branch wraps the original `try { ... await measureTextElement ... } catch { ... }` so when `usePassthrough === true` the measurement call is structurally unreachable. Test `uses declared width and height without measuring text` (`__tests__/text-width-height-passthrough.test.ts:28-42`) asserts `expect(measureTextElement).not.toHaveBeenCalled()`. |
| 2   | 直通尺寸按画布缩放输出：`width = parsedWidth * scaleX + TEXT_WIDTH_SAFETY_MARGIN`、`height = parsedHeight * scaleY` | ✓ VERIFIED | `src/transformer/transform-to-pptel.ts:1523-1524` — `textWidth = parsedTextWidth * scaleX + TEXT_WIDTH_SAFETY_MARGIN` and `textHeight = parsedTextHeight * scaleY`. `TEXT_WIDTH_SAFETY_MARGIN = 25` from `src/constants.ts:50`. Test asserts `result?.width === 100 * 5 + TEXT_WIDTH_SAFETY_MARGIN` (5 = scaleX for viewBox 200×100 → canvas 1000×500) and `result?.height === 40 * 5`. |
| 3   | 缺失、非数字、非正数或非有限数的尺寸回退到原测量 / fallback 路径 | ✓ VERIFIED | `src/transformer/transform-to-pptel.ts:1520-1521` — passthrough flag requires `Number.isFinite(parsedTextWidth) && parsedTextWidth > 0 && Number.isFinite(parsedTextHeight) && parsedTextHeight > 0`; falsy values trigger the `else` branch with the original `try { ... measureTextElement ... } catch { ... heuristic fallback ... }`. `it.each` (`__tests__/text-width-height-passthrough.test.ts:44-59`) covers `only width`, `only height`, `negative width` (-100), and `non-numeric width` ("auto"); all four assert `measureTextElement` called exactly once. Zero-value boundary (parseFloat('0') = 0, `0 > 0` false) is handled identically and is a strict subset of the negative case per source review (`transform-to-pptel.ts:1520`). |
| 4   | 宽高直通不影响 `fixedHeight` 推断（仍由 `!!element.attrs.height` 决定） | ✓ VERIFIED | `src/transformer/transform-to-pptel.ts:1613` — `const fixedHeight = !!element.attrs.height` is evaluated unconditionally after the measurement/passthrough block. Test asserts `result?.fixedHeight === true` for the passthrough case. |
| 5   | 宽高直通不影响 multiline tspan 分支（仍然走 `extractTspansWithPosition`） | ✓ VERIFIED | `src/transformer/transform-to-pptel.ts:1633-1677` — multiline branch (`isMultiline`) is downstream of the passthrough block and uses `textWidth` from the passthrough; the pre-existing per-tspan `height: tspan.fontSize * 1.2` is left untouched, preserving original behavior. |
| 6   | text-anchor='middle' 的 `TEXT_ANCHOR_MIDDLE_TOP_OFFSET` 补偿仍然生效 | ✓ VERIFIED | `src/transformer/transform-to-pptel.ts:1567-1569` — the `if (element.attrs['text-anchor'] === 'middle') { textTop += TEXT_ANCHOR_MIDDLE_TOP_OFFSET }` runs after the passthrough/measurement block, so it applies uniformly. |

**Score:** 6/6 truths verified.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/transformer/transform-to-pptel.ts` | `case 'text':` top includes passthrough fast path | ✓ VERIFIED | Lines 1510-1563 declare `textWidth/textHeight/textTop` as `let`, parse `parsedTextWidth/parsedTextHeight`, gate on `usePassthrough`, and execute the scaled width/height assignment followed by `else`-wrapped `try/catch`. |
| `__tests__/text-width-height-passthrough.test.ts` | Vitest covering valid fast path + 4 fallback cases | ✓ VERIFIED | 60-line file with `describe('text width/height passthrough (TEXT-WHPASS)')`, 1 fast-path test (asserts `measureTextElement` not called), `it.each` over 4 fallback cases (asserts measurement called once). |
| `.planning/phases/11-text-width-height-passthrough/deferred-items.md` | Documents unrelated baseline failures | ✓ VERIFIED | Records 15 stable failures reproduced identically on parent baseline `6047c64` and Phase 11 merged HEAD; declares "Phase 11 introduced 0 regressions". |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `src/transformer/transform-to-pptel.ts` (passthrough block) | `src/text-measurer.ts` (`measureTextElement`) | `else`-wrapped try/catch (skip when `usePassthrough`) | ✓ WIRED | `measureTextElement` only invoked at `transform-to-pptel.ts:1545`; structural control flow guarantees `usePassthrough=true` ⇒ skipped. |
| `src/transformer/transform-to-pptel.ts` (passthrough block) | `src/constants.ts` (`TEXT_WIDTH_SAFETY_MARGIN`, `FALLBACK_ASCENT_RATIO`) | `import` from constants | ✓ WIRED | `transform-to-pptel.ts:14-15` imports both constants; `TEXT_WIDTH_SAFETY_MARGIN = 25`, `FALLBACK_ASCENT_RATIO = 0.764` at `constants.ts:50,53`. |
| `__tests__/text-width-height-passthrough.test.ts` (mock) | `src/text-measurer.ts` | `vi.mock('../src/text-measurer', ...)` + `vi.hoisted` | ✓ WIRED | Mock replaces module exports; `measureTextElement` mock enables invocation-count assertions. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `textWidth` (passthrough) | `parsedTextWidth * scaleX + TEXT_WIDTH_SAFETY_MARGIN` | `parseFloat(String(element.attrs.width))` × `scaleX` from viewBox-to-canvas ratio | ✓ FLOWING | `scaleX` computed by caller from viewBox `[0,0,200,100]` and canvas `[1000,500]` ⇒ 5.0; test asserts `100 * 5 + 25 = 525`. |
| `textHeight` (passthrough) | `parsedTextHeight * scaleY` | `parseFloat(String(element.attrs.height))` × `scaleY` | ✓ FLOWING | `scaleY = 5.0` from same viewBox/canvas; test asserts `40 * 5 = 200`. |
| `textTop` (passthrough) | `transformed.top - fontSize * FALLBACK_ASCENT_RATIO * scaleY` | `transformed.top` from `applyTransform(...)` upstream | ✓ FLOWING | Heuristic ascent path matches the `catch` branch in the measurement block (`transform-to-pptel.ts:1561`); same formula. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Passthrough test (5 cases) | `npx vitest run __tests__/text-width-height-passthrough.test.ts` | `Test Files 1 passed (1) / Tests 5 passed (5)` | ✓ PASS |
| Text-measurer regression | `npx vitest run src/text-measurer.test.ts` | `Test Files 1 passed (1) / Tests 24 passed (24)` | ✓ PASS |
| Joint passthrough + measurer suite | `npx vitest run __tests__/text-width-height-passthrough.test.ts src/text-measurer.test.ts` | `Test Files 2 passed (2) / Tests 29 passed (29)` | ✓ PASS |
| Build gate | (orchestrator evidence on clean worktree) `npm run build` | passed | ✓ PASS (orchestrator-provided, not re-run) |
| Full suite regression attribution | (orchestrator evidence) merged HEAD 198p/15f vs parent baseline `6047c64` 193p/15f, identical failed-file set | zero regressions attributable to Phase 11 | ✓ PASS (orchestrator-provided) |

### Probe Execution

No phase-declared probe scripts. Phase goal is unit-test-driven and verified via behavioral spot-checks above.

### Traceability Verification (post-9fe728f)

| Item | Expected | Status | Evidence |
| ---- | -------- | ------ | -------- |
| `.planning/REQUIREMENTS.md` — REQ section | `### Text Width/Height Passthrough (TEXT-WHPASS)` heading + 3 checkbox items | ✓ VERIFIED | Lines 123-127 declare TEXT-WHPASS-01/02/03. |
| `.planning/REQUIREMENTS.md` — traceability table | 3 rows mapping TEXT-WHPASS-01/02/03 to Phase 11 | ✓ VERIFIED | Lines 208-210. |
| `.planning/REQUIREMENTS.md` — coverage footer | "v1.7 requirements: 8 total" and "Mapped to phases: 50" | ✓ VERIFIED | Lines 213-220. |
| `.planning/REQUIREMENTS.md` — last-updated footer | `*Last updated: 2026-07-23 after Phase 11 requirement traceability sync*` | ✓ VERIFIED | Line 224. |
| `.planning/phases/11-text-width-height-passthrough/11-01-PLAN.md` frontmatter | `requirements: [TEXT-WHPASS-01, TEXT-WHPASS-02, TEXT-WHPASS-03]` | ✓ VERIFIED | Lines 11-14. |
| `.planning/phases/11-text-width-height-passthrough/11-01-SUMMARY.md` frontmatter | `requirements-completed: [TEXT-WHPASS-01, TEXT-WHPASS-02, TEXT-WHPASS-03]` | ✓ VERIFIED | Lines 41-44. |
| `.planning/phases/11-text-width-height-passthrough/11-01-SUMMARY.md` Issues-Encountered | Records 198p/15f merged HEAD vs 193p/15f baseline with identical failed-file set | ✓ VERIFIED | Lines 127-128. |
| `.planning/phases/11-text-width-height-passthrough/deferred-items.md` | Updated regression attribution table | ✓ VERIFIED | Lines 1-32 with stable-failure list, independent text-anchor fluctuation, and 0-regression conclusion. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| TEXT-WHPASS-01 | 11-01 | Skip `measureTextElement` when both `width`/`height` valid | ✓ SATISFIED | Source lines 1520-1527 + test `uses declared width and height without measuring text`. |
| TEXT-WHPASS-02 | 11-01 | Scale passthrough width/height with safety margin | ✓ SATISFIED | Source lines 1523-1524 + test asserts `100 * 5 + TEXT_WIDTH_SAFETY_MARGIN` and `40 * 5`. |
| TEXT-WHPASS-03 | 11-01 | Invalid/incomplete dimensions retain measurement path | ✓ SATISFIED | Source lines 1518-1521 + `it.each` covers only-width / only-height / negative / non-numeric. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `__tests__/text-width-height-passthrough.test.ts` | 6-12 | `vi.hoisted` + `vi.mock` at module level (no `afterAll(vi.restoreAllMocks)`) | ℹ️ Info | Currently safe under Vitest per-file isolation; reviewer IN-04 suggests defensive cleanup but it is non-blocking and out of scope for passthrough verification. |
| `src/transformer/transform-to-pptel.ts` | 1653-1675 | Multiline `height: tspan.fontSize * 1.2` ignores SVG `height` attribute | ℹ️ Info | Pre-existing behavior preserved by Phase 11; reviewer IN-01 notes SVG `height` is a no-op for multiline text. Documented in code comments; not a Phase 11 regression. |
| `src/transformer/transform-to-pptel.ts` | 1526 | `textTop` uses heuristic `FALLBACK_ASCENT_RATIO` rather than measured ascent | ℹ️ Info | Reviewer WR-01 documents visual delta vs the measurement branch (which uses `measured.y`); same formula as the `catch` fallback. By design per CONTEXT.md; non-blocking. |

### Prohibitions Verification

| Prohibition | Status | Evidence |
| ----------- | ------ | -------- |
| 不得在 rect / circle / ellipse / image 等非 text 分支加入直通逻辑 | ✓ SATISFIED | `grep -n "usePassthrough"` returns only 2 occurrences, both inside `case 'text':` (lines 1520, 1522). No other case references passthrough variables. |
| 不得改动 `measureTextElement` 签名或 resvg-js 调用逻辑本身 | ✓ SATISFIED | Commit `2cc54f5` only modifies `src/transformer/transform-to-pptel.ts`, `__tests__/text-width-height-passthrough.test.ts`, and `.planning/.../deferred-items.md`. `src/text-measurer.ts` is untouched. |
| 不得移除原有的 try/catch 测量路径作为唯一通路 | ✓ SATISFIED | `try { ... await measureTextElement ... } catch { ... heuristic ... }` at lines 1528-1562 is wrapped in `else { ... }` of `usePassthrough`, so when the passthrough flag is false the original measurement path runs unchanged. |

### Human Verification Required

None. All must-haves are mechanically verifiable and the implementation is backed by:
- 5 passing Vitest cases (fast path + 4 fallback variants).
- 24 passing text-measurer tests (no regression in the measured branch).
- Source-level symbol verification (`usePassthrough`, `parsedTextWidth`, `parsedTextHeight`, `measureTextElement` call site at line 1545 inside the `else` branch).
- Orchestrator-provided clean-worktree full-suite evidence (15 stable pre-existing failures reproduced identically on merged HEAD and parent baseline; no Phase 11 regression).

### Notes (Non-Blocking Observations)

- **WR-01 / IN-02 from `11-REVIEW.md`** — The passthrough branch's `textTop` heuristic vs. measured ascent may produce small visual deltas; this is by design per CONTEXT.md and shared with the `catch` fallback. Tests pin dimensions but not `top`/`left` values. No action required for Phase 11 closure.
- **IN-01 from `11-REVIEW.md`** — Multiline `<text>` continues to use `tspan.fontSize * 1.2` for per-tspan height, ignoring the SVG `height` attribute. This is pre-existing and out of Phase 11 scope.
- **Deviation from plan** — The plan's `<verify>` step expected ≥3 occurrences of `usePassthrough` (declaration + condition + skip measurement). Source has 2 occurrences because the deviation noted in SUMMARY (TypeScript definite-assignment) replaced an explicit skip with a mutually exclusive `else` branch. Behavior is equivalent and asserted by passing tests; this is not a gap.
- **Full-suite failures** — All 15 failures documented in `deferred-items.md` reproduce identically on parent baseline `6047c64` and are out of Phase 11 scope. The one additional `text-anchor` fluctuation observed by an independent verifier also reproduces on baseline and is classified as run-order/environment noise.

### Gaps Summary

None. All ROADMAP Success Criteria (3) and all PLAN must-have truths (6, including prohibitions) verify. Traceability is now consistent across `REQUIREMENTS.md`, `PLAN frontmatter`, and `SUMMARY.md`.

---

_Verified: 2026-07-23T15:10:00Z_
_Verifier: Claude (gsd-verifier) — re-verification after traceability remediation commit 9fe728f_
