# Stack Research — v1.1 Transform Fixes

**Domain:** TypeScript library for SVG parsing and coordinate transformation
**Focus:** SVG rotate transform center support + text baseline offset fix
**Researched:** 2026-06-27
**Confidence:** HIGH

## Executive Summary

The v1.1 transform fixes (rotate center + text baseline) require **no new library dependencies**. Both are pure math problems solvable with TypeScript functions:
- Rotate-around-center: 3-step translate-rotate-translate formula
- Text baseline: configurable multiplier (no runtime library needed)

## Core Technologies

### Transform Math — No Library Required

| Component | Implementation | Why |
|-----------|---------------|-----|
| Rotate around point | Pure TypeScript function | Standard 2D rotation formula: `translate(-cx,-cy) → rotate(deg) → translate(cx,cy)` |
| Text baseline offset | Configurable constant | `baselineOffset = fontSize * configurableRatio` (default 0.75) |

**Rotate-around-center formula:**
```typescript
function rotateAroundPoint(
  x: number, y: number,
  cx: number, cy: number,
  deg: number
): [number, number] {
  const rad = deg * (Math.PI / 180)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = x - cx
  const dy = y - cy
  return [
    dx * cos - dy * sin + cx,
    dx * sin + dy * cos + cy
  ]
}
```

**This replaces the need for any geometry library.** The Turf.js `@turf/transform-rotate` is a geospatial library (for maps/GIS), far too heavy for SVG coordinate transforms.

### Existing Stack (Unchanged for v1.1)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| fast-xml-parser | 5.9.3 | SVG XML parsing | Already in use, no change needed |
| TypeScript | 5.5.0 | Language | Works; upgrade to 6.x recommended separately |
| vitest | 2.0.0 | Testing | Works; upgrade to 4.x recommended separately |
| cac | 6.7.14 | CLI framework | Works; upgrade to 7.x recommended separately |
| uuid | 14.0.1 | ID generation | Already in use |
| picocolors | 1.1.1 | CLI colors | Already in use |

## Supporting Libraries

### Considered but Not Needed

| Library | Ver | Purpose | Rejection Reason |
|---------|-----|---------|-----------------|
| @turf/transform-rotate | 7.3.5 | Rotate geometry around point | GIS/geospatial library; 50k+ bundle size; pure math is trivial |
| @capsizecss/metrics | 4.1.0 | Font cap-height/baseline metrics | Web typography use case; adds bundle; baselineOffset config is sufficient |
| font-metrics | 0.4.3 | Node.js font metrics | Abandoned (2018); no TypeScript types; unreliable |

### Recommended Approach for Text Baseline

Instead of a library, use a **configurable constant** in `coordinate-mapper.ts`:

```typescript
// Configurable baseline offset ratio
// Typical fonts: 0.70-0.85. Default 0.75 approximates Arial/Helvetica.
const BASELINE_OFFSET_RATIO = 0.75

// In text element handling:
const textTop = svgY - (fontSize * BASELINE_OFFSET_RATIO)
```

This matches the existing approach but makes the 0.75 explicit and configurable rather than magic number.

## Development Tools

No new tools required for v1.1 transform fixes. Existing tooling is sufficient:
- `vitest` for test cases covering rotate center and text baseline
- `tsc` (or `tsup` if REQ-BLD-01 is addressed)
- `tsx` for running scripts

## Alternatives Considered

| Approach | Recommended | When to Use Instead |
|----------|-------------|---------------------|
| Pure TypeScript math | YES | Current fix scope; no dependencies |
| @turf/transform-rotate | NO | Full GIS applications with complex geometries |
| @capsizecss/metrics | NO | Web apps requiring pixel-perfect baseline alignment |
| Matrix library (gl-matrix, etc.) | NO | 3D transforms or complex camera systems |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|------------|
| @turf/transform-rotate | Heavy geospatial library; overkill for 2D SVG | Pure TypeScript rotation formula |
| font-metrics (npm) | Abandoned package; unmaintained since 2018 | Configurable constant |
| gl-matrix | 3D math library; matrix-focused | TypeScript functions for 2D |
| mat4 or gl-mat4 | WebGL libraries; wrong domain | Plain math for SVG coords |

## Stack Patterns for v1.1

### Pattern: Transform Composition Order

SVG transform attributes compose in document order (left-to-right = outer-to-inner), but coordinate calculation applies right-to-left:

```typescript
// transform="translate(10,10) rotate(45) scale(2)"
// Applied as: scale → rotate → translate (inner to outer)
// NOT: translate → rotate → scale

function applyTransform(x: number, y: number, t: TransformResult): [number, number] {
  // 1. Apply scale first (innermost in SVG transform order)
  let px = x * (t.scaleX || 1)
  let py = y * (t.scaleY || 1)

  // 2. Apply rotate around center (if specified)
  if (t.rotateDeg !== undefined) {
    const cx = t.rotateCX ?? 0
    const cy = t.rotateCY ?? 0
    const rad = t.rotateDeg * (Math.PI / 180)
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const dx = px - cx
    const dy = py - cy
    px = dx * cos - dy * sin + cx
    py = dx * sin + dy * cos + cy
  }

  // 3. Apply translate last (outermost)
  px += t.translateX || 0
  py += t.translateY || 0

  return [px, py]
}
```

### Pattern: Configurable Font Baseline

```typescript
// In coordinate-mapper.ts or dedicated constants file
export const TEXT_BASELINE_RATIO = parseFloat(process.env.TEXT_BASELINE_RATIO || '0.75')

// For text elements:
function textTopFromBaseline(baselineY: number, fontSize: number): number {
  return baselineY - (fontSize * TEXT_BASELINE_RATIO)
}
```

## Version Compatibility

All existing packages remain compatible with the v1.1 fix scope. No version changes required.

| Package | Compatible | Notes |
|---------|------------|-------|
| fast-xml-parser@5.9.3 | YES | No change needed |
| typescript@5.5.0 | YES | Math functions work on 5.x |
| vitest@2.0.0 | YES | Can test new transform functions |
| cac@6.7.14 | YES | No change to CLI |

## Stack Gap Analysis for v1.1

**Current state:** No new dependencies needed. The math is straightforward TypeScript.

**What changes in v1.1:**

| Area | Before | After |
|------|--------|-------|
| Rotate center | Ignored (parseTransform extracted but mapCoordinates did not use) | Correctly applied via translate-rotate-translate |
| Text baseline | Hardcoded `0.75 * fontSize` | Configurable `BASELINE_OFFSET_RATIO` constant |
| Transform system | Separate parseTransform + manual coord math | Unified applyTransform with correct composition |

**Dependencies added:** None

**Dependencies removed:** None

## Sources

- SVG Transform Specification — w3.org/TR/SVG11/coords.html (well-established standard)
- Turf.js @turf/transform-rotate — npmjs.com/package/@turf/transform-rotate (verified overkill)
- @capsizecss/metrics — npmjs.com/package/@capsizecss/metrics (verified overkill for this use case)
- font-metrics — npmjs.com/package/font-metrics (verified abandoned)
- npm search results verified 2026-06-27

---

*Stack research update for: svg-to-pptel v1.1 transform-fixes*
*Researched: 2026-06-27*
