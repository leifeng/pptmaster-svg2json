# Project Research Summary

**Project:** svg-to-pptel
**Domain:** SVG to PowerPoint JSON converter library
**Researched:** 2026-06-27
**Confidence:** HIGH

## Executive Summary

The v1.1 transform fixes address two critical SVG conversion bugs: rotate-around-center being ignored and text baseline-to-top conversion using an undocumented 0.75 multiplier. Both fixes are pure math problems requiring no new dependencies. The rotate-center bug exists because parseTransform correctly extracts rotateCX/rotateCY but mapCoordinates never applies them. The text baseline issue stems from SVG using baseline coordinates while PowerPoint JSON expects top-edge positions. Additionally, a copy-paste bug causes ellipse center coordinates to be translated but not scaled.

The recommended approach is to create a new transforms/apply-transform.ts module containing the rotate-around-center math (translate-to-center, rotate, translate-back formula), then update mapCoordinates to call it. Text baseline handling stays in transformElement but should expose the 0.75 multiplier as a named constant. The ellipse scaling bug requires a simple 2-line fix.

Key risks include transform order confusion (SVG applies transforms right-to-left in composition) and conflating SVG rotate syntax (which supports 3-argument form) with CSS rotate. The text baseline is NOT the bottom of the text -- descenders extend below it.

## Key Findings

### Recommended Stack

No new dependencies required for v1.1. All fixes use pure TypeScript math functions already supported by the existing TypeScript 5.5.0 setup.

**Core technologies:**
- Pure TypeScript rotation math -- Standard 2D rotation formula; no library needed
- Configurable baseline constant -- BASELINE_OFFSET_RATIO = 0.75 with comment documenting font dependency
- fast-xml-parser@5.9.3 -- Unchanged; already correctly parses transforms
- Existing test tooling (vitest@2.0.0) -- Sufficient for testing new transform functions

### Expected Features

**Must have (table stakes):**
- rotate(deg) without center -- basic SVG rotation around origin
- rotate(deg, cx, cy) with center -- diagram pivot rotation
- Text baseline-to-top conversion -- textTop = svgBaselineY + fontSize * 0.75

**Should have (competitive):**
- Configurable baseline offset -- expose 0.75 as named constant

**Defer (v2+):**
- Multiple rotate() in chain
- Nested transform accumulation
- Per-font baseline table
- matrix() decomposition

### Architecture Approach

The existing pipeline has a clean separation: mapCoordinates produces geometry with transforms, transformElement produces PPTElement JSON. Rotate-center math belongs in a new applyTransform function in transforms/apply-transform.ts called from mapCoordinates. Text baseline correction stays in transformElement. The ellipse scaling bug is a 2-line fix in coordinate-mapper.ts.

**Major components:**
1. coordinate-mapper.ts -- parseTransform (unchanged), mapCoordinates (calls new applyTransform)
2. transforms/apply-transform.ts (NEW) -- pure function for translate/rotate/scale composition
3. transform-to-pptel.ts -- transformElement (text baseline constant made configurable)

### Critical Pitfalls

1. Rotation center ignored -- rotateCX/rotateCY parsed but never applied
2. Wrong transform order -- scale first, rotate with center, translate last
3. SVG vs CSS rotate syntax -- SVG allows 3-argument form
4. Baseline IS NOT bottom -- descenders go below
5. Ellipse cx/cy missing scale -- Fix: cx = cx * sx + tx

## Implications for Roadmap

Based on research, the v1.1 milestone breaks into two focused phases:

### Phase 1: Transform Pipeline Completion
**Rationale:** The rotate-center bug is a core correctness issue
**Delivers:** Correct rotate(deg, cx, cy) application via new applyTransform module
**Addresses:** Rotate table stakes from FEATURES.md
**Avoids:** Pitfall R1, Pitfall R2

### Phase 2: Text Element and Bug Fixes
**Rationale:** Text baseline is independent of transforms. Ellipse bug is a 2-line fix.
**Delivers:** Configurable baseline constant, fixed ellipse scaling
**Implements:** Named constant in transform-to-pptel.ts, coordinate-mapper.ts ellipse fix
**Avoids:** Pitfall T1, ellipse scale bug

### Phase Ordering Rationale

- Phase 1 first because rotate-center is a fundamental coordinate transform issue
- Phase 2 second because text handling and ellipse bug are independent fixes

### Research Flags

Phases likely needing deeper research during planning:
- Phase 1: No research needed -- SVG rotation math is well-documented

Phases with standard patterns (skip research-phase):
- Phase 1: Standard 2D rotation matrix math
- Phase 2: Simple constant extraction and 2-line bug fix

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Pure math; no new dependencies |
| Features | HIGH | Table stakes clearly identified |
| Architecture | HIGH | Clear component boundaries |
| Pitfalls | HIGH | Specific line numbers cited |

**Overall confidence:** HIGH

### Gaps to Address

- Baseline ratio for non-Latin fonts -- 0.75 is a Latin approximation
- PowerPoint rotation caveat -- rotates around top-left corner, not center

## Sources

### Primary (HIGH confidence)
- SVG 1.1 Transform Specification -- rotate(deg, cx, cy) formula
- SVG 1.1 Text Element -- baseline positioning definition
- MDN: SVG Transform -- practical examples
- MDN: SVG Text Element -- y attribute documentation

### Secondary (HIGH confidence)
- Code analysis of src/mapper/coordinate-mapper.ts
- Code analysis of src/transformer/transform-to-pptel.ts
- Reference implementation idea.md

### Verification (HIGH confidence)
- npm search for @turf/transform-rotate -- confirmed overkill
- npm search for font-metrics -- confirmed abandoned
- STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md -- all researched 2026-06-27

---
*Research completed: 2026-06-27*
*Ready for roadmap: yes*
