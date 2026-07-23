---
phase: 11-text-width-height-passthrough
plan: 01
subsystem: transformer
tags: [typescript, svg, text, vitest, resvg-js]

# Dependency graph
requires:
  - phase: v1.3-resvg-js-text-measurement
    provides: measureTextElement measurement API and heuristic fallback path
  - phase: quick-260723-he6-constants-to-single-file
    provides: TEXT_WIDTH_SAFETY_MARGIN and FALLBACK_ASCENT_RATIO constants
provides:
  - SVG text width/height passthrough fast path with scale-aware PPTTextElement dimensions
  - Vitest coverage for passthrough and invalid/incomplete attribute fallback behavior
affects: [text rendering, transformer, phase 11-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Positive finite SVG dimensions use a fast path; incomplete or invalid dimensions retain measurement fallback.
    - Vitest module mocking verifies that the measurement dependency is skipped or invoked as intended.

key-files:
  created:
    - __tests__/text-width-height-passthrough.test.ts
    - .planning/phases/11-text-width-height-passthrough/deferred-items.md
  modified:
    - src/transformer/transform-to-pptel.ts

key-decisions:
  - "Only width and height values that are both finite and greater than zero activate passthrough; all other inputs preserve the existing measurement behavior."
  - "Passthrough width includes TEXT_WIDTH_SAFETY_MARGIN, while height is scaled directly and top uses FALLBACK_ASCENT_RATIO because no measured bbox y is available."
  - "Use mutually exclusive passthrough and measurement branches so TypeScript can prove all text dimensions are initialized without changing the existing try/catch fallback semantics."

patterns-established:
  - "Text dimension fast paths must remain local to the text case and must not alter fixedHeight or multiline handling."
  - "Fallback-path tests should mock measureTextElement and assert both invocation count and output dimensions."

requirements-completed:
  - TEXT-WHPASS-01
  - TEXT-WHPASS-02
  - TEXT-WHPASS-03

# Coverage metadata
coverage:
  - id: D1
    description: "SVG text with valid width and height bypasses resvg-js and emits scaled PPTTextElement width and height."
    verification:
      - kind: unit
        ref: "__tests__/text-width-height-passthrough.test.ts#uses declared width and height without measuring text"
        status: pass
    human_judgment: false
  - id: D2
    description: "Missing, negative, or non-numeric text dimensions fall back to the existing text measurement path."
    verification:
      - kind: unit
        ref: "__tests__/text-width-height-passthrough.test.ts#falls back to text measurement for %s"
        status: pass
    human_judgment: false

# Metrics
duration: 7min
completed: 2026-07-23
status: complete
---

# Phase 11 Plan 01: text-width-height-passthrough Summary

**SVG `<text>` now directly uses valid declared width/height after canvas scaling, avoiding resvg-js measurement while preserving fallback behavior for invalid dimensions.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-23T06:33:12Z
- **Completed:** 2026-07-23T06:39:56Z
- **Tasks:** 1 completed
- **Files modified:** 3 task files

## Accomplishments

- Added a text-only passthrough path that uses `parsedTextWidth * scaleX + TEXT_WIDTH_SAFETY_MARGIN` and `parsedTextHeight * scaleY`.
- Preserved the fallback measurement and heuristic top calculation when either dimension is missing, non-positive, non-finite, or non-numeric.
- Added five tests covering the valid fast path, measurement spy behavior, and four fallback cases; `fixedHeight` remains true when `height` is declared.

## Task Commits

Each task was committed atomically:

1. **Task 1: 在 text 分支顶部加入宽高直通快路径** - `2cc54f5` (`feat`)

The summary is committed separately after self-check completion.

## Files Created/Modified

- `src/transformer/transform-to-pptel.ts` - Adds the width/height passthrough branch inside `case 'text'` without changing other element cases.
- `__tests__/text-width-height-passthrough.test.ts` - Verifies passthrough dimensions, measurement skipping, and fallback invocation.
- `.planning/phases/11-text-width-height-passthrough/deferred-items.md` - Records an unrelated pre-existing path-merge full-suite failure.

## Decisions Made

- Kept the optimization scoped to SVG text and required both dimensions to be finite positive numbers.
- Used the existing safety margin and fallback ascent constant rather than changing shared measurement behavior.
- Kept the original measurement `try/catch` path intact behind the non-passthrough branch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Resolved TypeScript definite-assignment errors introduced by split control flow**

- **Found during:** Task 1 (在 text 分支顶部加入宽高直通快路径)
- **Issue:** Independent passthrough and measurement conditionals left `textWidth`, `textHeight`, and `textTop` potentially unassigned according to TypeScript strict checking.
- **Fix:** Made the passthrough flag immutable and changed the measurement block to the mutually exclusive `else` branch; runtime behavior remains identical.
- **Files modified:** `src/transformer/transform-to-pptel.ts`
- **Verification:** `npm run build` passed; targeted tests passed.
- **Committed in:** `2cc54f5`

---

**Total deviations:** 1 auto-fixed (Rule 3: 1)
**Impact on plan:** The adjustment was required for strict TypeScript compilation and did not expand scope or alter the intended fallback behavior.

## Issues Encountered

- 编排器在干净 worktree 中按相同顺序执行 `npm run build` 与全量 `npm test`：合并后为 198 passed / 15 failed，父提交 `6047c64` 基线为 193 passed / 同样 15 failed，失败集合完全一致（gradient 2、image-outline 1、path-merge 1、shadow 7、shape-rx 4）。因此 Phase 11 引入回归数为 0。
- 独立验证器另观察到 1 个 `text-anchor` 失败，并在父提交基线复现同一失败；该结果属于既有的运行顺序/环境波动，不归因于 Phase 11。完整记录见 `deferred-items.md`。
- No authentication gates or package installation issues occurred.

## Verification

- `npx vitest run __tests__/text-width-height-passthrough.test.ts` — passed, 5 tests.
- `npx vitest run src/text-measurer.test.ts` — passed, 24 tests.
- `npm run build` — passed.
- `npx vitest run __tests__/text-width-height-passthrough.test.ts src/text-measurer.test.ts` — passed, 29 tests.
- Full `npm test` gate — 15 stable pre-existing failures reproduced identically on merged HEAD and parent baseline; an independent verifier also observed one baseline-reproducible `text-anchor` fluctuation. Phase 11 introduced 0 regressions.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The text width/height passthrough implementation and focused regression coverage are ready for the next Phase 11 plan. The unrelated path-merge assertion remains deferred and should be handled by the path-merge workstream.

---
*Phase: 11-text-width-height-passthrough*
*Completed: 2026-07-23*

## Self-Check: PASSED

- Summary file exists at `.planning/phases/11-text-width-height-passthrough/11-01-SUMMARY.md`.
- Task commit `2cc54f5` exists in git history.
- All implementation, test, and deferred-item files referenced by this summary exist.
