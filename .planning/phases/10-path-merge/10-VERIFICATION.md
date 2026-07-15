---
phase: 10-path-merge
verified: 2026-07-13T08:52:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps: []
deferred: []
---

# Phase 10: Path Merge Verification Report

**Phase Goal:** 实现 `<g>` 内全 `<path>` 子元素的合并决策逻辑，减少输出元素数量
**Verified:** 2026-07-13T08:52:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A `<g>` containing only `<path>` children can be merged into a single path when safe | ✓ VERIFIED | `shouldMerge()` implements decision tree; `createMergedShapeElement()` produces merged output; integration in walk() at line 1365-1397 of transform-to-pptel.ts |
| 2 | Paths with different styles cannot be merged | ✓ VERIFIED | `extractCommonStyle()` returns null when styles differ; `shouldMerge()` returns 'no-merge' at step 1 when no common styles and not all fill="none" |
| 3 | Paths with independent semantics (id, aria-*, events) cannot be merged | ✓ VERIFIED | `shouldMerge()` step 2 checks id, clip-path, aria-* attributes (lines 80-88) |
| 4 | fill="none" paths do not overlap visually and can be merged with others | ✓ VERIFIED | `shouldMerge()` step 3 returns 'merge' when all paths have fill="none" (lines 92-97) |
| 5 | Paths with evenodd fill-rule are marked as 'cautious-merge' (PATH-MERGE-04) | ✓ VERIFIED | `shouldMerge()` step 4 returns 'cautious-merge' for evenodd paths (lines 99-102, 124-126, 143-146) |
| 6 | Merged path d attributes must use absolute coordinates (D-33) | ✓ VERIFIED | `mergePaths()` calls `toAbsolutePath()` on each path d attribute before joining (line 159-163) |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/merger/path-merge.ts` | Decision tree module with shouldMerge, mergePaths, extractCommonStyle, boxesOverlap | ✓ VERIFIED | File exists (7091 bytes), 5 exported functions present |
| `src/mapper/coordinate-mapper.ts` | Extended pathBoundingBox() with C/Q/S/T support | ✓ VERIFIED | 4 occurrences of cmdU === 'C'/'Q'/'S'/'T' found |
| `src/transformer/transform-to-pptel.ts` | Modified walk() with all-path group detection | ✓ VERIFIED | Import and calls to shouldMerge, extractCommonStyle, createMergedShapeElement present at lines 9, 1365-1397 |
| `__tests__/path-merge.test.ts` | Comprehensive unit tests | ✓ VERIFIED | File exists (9304 bytes), 27 tests all pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| walk() | shouldMerge() | direct function call at line 1391 | ✓ WIRED | All-path group detection triggers shouldMerge() |
| shouldMerge() | extractCommonStyle() | called at line 74 | ✓ WIRED | Step 1 of decision tree |
| shouldMerge() | boxesOverlap() | called at line 134 | ✓ WIRED | Overlap detection for bounding boxes |
| mergePaths() | toAbsolutePath() | imports from path-utils at line 8 | ✓ WIRED | Normalizes d attributes to absolute coordinates |
| createMergedShapeElement() | pathBoundingBox() | imports from coordinate-mapper at line 9 | ✓ WIRED | Computes bounding box from merged path |
| createMergedShapeElement() | parseTransform() | imports from coordinate-mapper at line 12 | ✓ WIRED | Extracts rotate from group transform |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 27 path-merge unit tests pass | `npx vitest run __tests__/path-merge.test.ts` | 27 passed | ✓ PASS |
| pathBoundingBox handles C/Q/S/T | `grep -c "cmdU === 'C'\|cmdU === 'Q'\|cmdU === 'S'\|cmdU === 'T'" src/mapper/coordinate-mapper.ts` | 4 | ✓ PASS |
| shouldMerge integrated in walk() | `grep -c "shouldMerge\|extractCommonStyle\|createMergedShapeElement" src/transformer/transform-to-pptel.ts` | 4 | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PATH-MERGE-01 | 10-01-PLAN | Decision tree: merge/no-merge/cautious-merge for all-path groups | ✓ SATISFIED | `shouldMerge()` function (lines 72-152 of path-merge.ts) |
| PATH-MERGE-02 | 10-01-PLAN | Extract common style attributes from multiple paths | ✓ SATISFIED | `extractCommonStyle()` function (lines 30-43) |
| PATH-MERGE-03 | 10-01-PLAN | Bounding box calculation and overlap detection | ✓ SATISFIED | `boxesOverlap()` function (lines 48-55) + pathBoundingBox() extended with C/Q/S/T |
| PATH-MERGE-04 | 10-01-PLAN | fill-rule="evenodd" special handling | ✓ SATISFIED | evenodd check in shouldMerge() returns 'cautious-merge' |
| PATH-MERGE-05 | 10-01-PLAN | Merge output: concatenate path d attributes | ✓ SATISFIED | `mergePaths()` and `createMergedShapeElement()` functions |

### Anti-Patterns Found

None detected in phase 10 implementation files.

### Pre-existing Test Failures

4 test files fail, but these are pre-existing failures unrelated to phase 10:
- `gradient.test.ts`
- `shadow.test.ts`
- `image-outline.test.ts`
- `shape-rx.test.ts`

These were noted in 10-02-SUMMARY.md as "out of scope for this plan" and predate phase 10 work.

---

_Verified: 2026-07-13T08:52:00Z_
_Verifier: Claude (goal-backward verification)_
