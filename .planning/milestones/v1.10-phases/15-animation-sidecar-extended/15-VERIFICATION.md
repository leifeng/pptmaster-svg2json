---
phase: 15
name: animation-sidecar-extended
status: passed
verified: 2026-10-15
verifier: self (orchestrator post-merge)
---

# Phase 15 Verification — animation-sidecar-extended

## Goal Achievement

**Goal:** 扩展动画 sidecar 处理 — `effect: "none"` 不生成动画、default 与 transition 字段扩展处理、三方字段原封不动存 extensions、三方→PPTist effect 全覆盖映射、三方 `delay + duration` 合并到 PPTist `duration`

**Status:** ✓ ACHIEVED

## Verification Evidence

### 1. Mapping table coverage (ANIM-MAP-EXT-01/02/03)

- `ENTRANCE_MAP`: **53 entries** per `ELEMENT_ANIMATIONS.md §4.6` — all mapped to PPTist 84-entry whitelist
- `EMPHASIS_MAP`: **33 entries** — all mapped
- `EXIT_MAP`: **53 entries** — all mapped
- CLI regression: **0 effects unmapped (fallback)** for fixture data

### 2. effect: "none" cascade (ANIM-NONE-01/02/03)

- `groups[gid].effect === "none"`: groups skipped (no PPTAnimation emitted for that group)
- `defaults.animation.effect === "none"`: slide-level cascade → no animations
- `transition.effect === "none"`: `slide.turningMode === "no"` (preserves auto_advance / sound semantics per ELEMENT_ANIMATIONS.md §2.1)

### 3. Extensions gap fixed (ANIM-EXTS-01/02)

- `snakeCasePreservedKeys` expanded from 8 → 10 entries (added `after_effect` + `sound`)
- `restart` already present from Phase 14
- All 17 row fields now preserved verbatim with camelCase top-level keys

### 4. delay + duration merge (ANIM-DELAY-01)

- `PPTAnimation.duration = clamp(round((row.delay ?? 0 + row.duration ?? effectiveRowDuration) * 1000), 100, 5000)`
- Original delay preserved in `extensions.originalDelay`
- Counter `delayAccumulatedSeconds` added
- Fixture baseline: 0.00s total delay (fixture has no `delay` fields)

### 5. Inheritance refactor (ANIM-INHERIT-01)

- `ResolvedRow` interface + `resolveEffectiveRow(row, slideDefaults, deckDefaults)` pure function
- 5-layer chain: CLI → deck → slide → group → row
- Pure-function verified (no closure refs)

### 6. Chrome helper forward-compat (ANIM-CHROME-01)

- `CHROME_REGEX = /^(bg|nav|watermark|logo|pagenumber|.*-header|.*-footer|.*-decor)$/` exported
- `isChromeGroupId(id: string): boolean` exported
- NOT wired into `injectAnimations()` iteration (D-04 forward-compat, NOT in v1.10 scope)
- Counter `chromeSkippedGroups: 0` in current fixture

## Test Results

- `npm run build` exits 0
- `npm test -- src/mappers/animation.test.ts src/animation-injector.test.ts tests/e2e/202610131101001.test.ts` → 167/167 passed
- E2E CLI regression: `node dist/src/cli.js exampels/202610131101001` → 13 covered slides produce 225 animations, 7 uncovered undefined, 0 unmapped, 0 chrome skipped

## 11/11 Requirements Covered

| Requirement | Status |
|-------------|--------|
| ANIM-NONE-01 | ✓ |
| ANIM-NONE-02 | ✓ |
| ANIM-NONE-03 | ✓ |
| ANIM-EXTS-01 | ✓ |
| ANIM-EXTS-02 | ✓ |
| ANIM-MAP-EXT-01 | ✓ |
| ANIM-MAP-EXT-02 | ✓ |
| ANIM-MAP-EXT-03 | ✓ |
| ANIM-DELAY-01 | ✓ |
| ANIM-INHERIT-01 | ✓ |
| ANIM-CHROME-01 | ✓ |

## Out of Scope (deferred to v2)

- Morph transitions (ELEMENT_ANIMATIONS.md §7) — requires PowerPoint Selection Pane object-name matching
- "median font size = title block" exception (D-05) — requires font-size analysis
- Slide Zoom / Summary Zoom — unsupported by source
- 3D animations — unsupported by source
- Sound runtime playback — PPTist feature gap
- `auto_reverse` / `rewind` / `accelerate` / `decelerate` / `bounce_end` runtime semantics — currently extensions-only
