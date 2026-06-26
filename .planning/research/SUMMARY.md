# Project Research Summary

**Project:** svg-to-json (SVG to PowerPoint JSON converter)
**Domain:** TypeScript library for SVG parsing and coordinate transformation
**Researched:** 2026-06-26
**Confidence:** HIGH

## Executive Summary

This is a TypeScript library that converts SVG diagrams to PowerPoint-compatible JSON.
The core value proposition is accurate coordinate transformation from SVG
baseline-based coordinate system to PowerPoint top-left coordinate system.
The library exposes both a CLI tool and a programmatic API.

Research confirms the current implementation covers the basic feature set but has
significant bugs in transform handling. The most critical issue is that rotation
center points are parsed but never applied. Secondary issues include an ellipse
scaling bug where center coordinates are not scaled, and text baseline
conversion using a hardcoded 0.75 multiplier.

The recommended approach is a phased fix: Phase 1 addresses critical transform
bugs (rotate center, ellipse scaling); Phase 2 completes the transform pipeline
and adds missing path command support; Phase 3 adds differentiating features.

## Key Findings

### Recommended Stack

TypeScript library with fast-xml-parser for SVG parsing and vitest for testing.
The current stack needs upgrades: TypeScript 5.5.0 to 6.0.3, vitest 2.0.0 to 4.1.9,
cac 6.7.14 to 7.0.0. Add tsup 8.5.1 for build management, changesets for
release management, and prettier/eslint for code quality.

**Core technologies:**
- fast-xml-parser 5.9.3 — industry standard TypeScript XML parser
- TypeScript 6.0.3 — current stable; ES2022/CommonJS target correct for library
- vitest 4.1.9 — de facto standard for TypeScript testing; Vite-powered with native ESM
- tsup 8.5.1 — replaces raw tsc for library publishing

### Expected Features

**Must have (table stakes):**
- Basic shape conversion (rect, circle, ellipse, path, line, polygon, polyline)
- Text extraction with font-family, font-size, fill
- Image element with href/xlink:href
- Transform support (translate, scale)
- ViewBox to 1000x562.5 canvas mapping
- Color parsing (named, hex, rgb)
- CLI with file input

**Should have (competitive):**
- Rotate transform with center point — many SVGs use rotate(deg, cx, cy); currently broken
- Text baseline-to-top y-coordinate correction
- Full path command support (C, Q, A, S, T)
- Group semantics with groupId

**Defer (v2+):**
- Gradient fills
- Matrix transform support
- Advanced color formats (rgba, hsl)
- ClipPath/mask support

### Architecture Approach

Pipeline architecture: SVG String -> Parser Layer -> Transform Layer ->
Coordinate Mapping Layer -> Output Layer. Each stage produces immutable data
structures. Architecture should be restructured with separate directories for
parser/, transformer/transforms/, transformer/shapes/, transformer/elements/, mapper/, and types/.

**Major components:**
1. **Parser Layer** — XML parsing and element tree building
2. **Transform System** — Centralized transform parsing and application
3. **Coordinate Mapper** — Applies transforms, calculates bounding boxes, scales to canvas

### Critical Pitfalls

1. **Rotation center ignored** — parseTransform() extracts rotateCX/rotateCY but
   mapCoordinates() never uses them. Fix: implement rotate-around-center math.

2. **Ellipse transform applies translation incorrectly** — In coordinate-mapper.ts
   lines 152-160, cx and cy are only translated but not scaled. Fix: apply both.

3. **Text baseline uses fixed 0.75 multiplier** — SVG y is baseline; PowerPoint
   expects top-left. The 0.75 approximation is font-dependent. Fix: configurable.

4. **Matrix transform parsed but not applied** — parseTransform() marks matrix as
   special but mapCoordinates() silently skips it. Fix: implement or throw error.

5. **Scale applied twice in some paths** — mapCoordinates applies scale, then
   transformElement applies it again. Fix: apply scale once.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Transform System Refactor
**Rationale:** Critical bugs in transform handling must be fixed first.
The rotate center bug and ellipse scaling bug make the library produce
incorrect output for common SVG patterns.

**Delivers:** Fixed rotate center support, fixed ellipse scaling, proper transform composition
**Addresses:** Rotate with center, ellipse transform bug, text baseline configuration
**Avoids:** Rotation center ignored pitfall, ellipse transform pitfall, scale-applied-twice

### Phase 2: Path Data and Transform Completion
**Rationale:** Path d attribute support is incomplete (only M/L/H/V commands),
and matrix transforms silently fail. Completing the transform pipeline enables full SVG compatibility.

**Delivers:** Full path command support (C, Q, A, S, T, Z), matrix transform implementation
**Uses:** tsup for build, vitest for coverage
**Implements:** transformer/shapes/, transformer/transforms/matrix.ts

### Phase 3: Feature Completeness
**Rationale:** After core correctness is established, add differentiating features.

**Delivers:** Group semantics with groupId, gradient fills, preserveAspectRatio handling
**Addresses:** Group preservation, gradient fills, image aspect ratio

### Phase Ordering Rationale

- Transform bugs are blockers for accuracy — must fix before adding features
- Text baseline fix is low-complexity but high-impact — can be in Phase 1
- Path data completion is independent — can follow Phase 1
- Group semantics and gradients are enhancements — defer until core is verified

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Matrix transforms):** Complex 6-value matrix decomposition
- **Phase 3 (Gradients):** PPTElement gradient schema needs verification

Phases with standard patterns (skip research-phase):
- **Phase 1 (Transform refactor):** Well-documented transform composition patterns
- **Phase 1 (Text baseline):** Simple multiplier adjustment

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against npm registry, TypeScript 6 release notes |
| Features | HIGH | Based on project codebase analysis and competitor comparison |
| Architecture | HIGH | Standard pipeline patterns confirmed; anti-patterns identified |
| Pitfalls | HIGH | Critical bugs verified by reading coordinate-mapper.ts source |

**Overall confidence:** HIGH

### Gaps to Address

- **Gradient schema:** PPTElement gradient format needs verification during Phase 3
- **Font metrics:** Text baseline approximation of 0.75 not validated
- **Matrix decomposition:** Full 6-value matrix math is complex; needs spike in Phase 2

## Sources

### Primary (HIGH confidence)
- SVG 1.1 Specification: Transform attribute — w3.org/TR/SVG11/coords
- SVG 1.1 Specification: Path Data — w3.org/TR/SVG11/paths
- fast-xml-parser documentation — npmjs.com/package/fast-xml-parser
- TypeScript 6.0.3 release notes — npm view typescript@6.0.3

### Secondary (MEDIUM confidence)
- vitest 4.x migration guide — vitest.dev
- tsup GitHub — oxc-project/tsup
- Matrix composition for 2D transforms — wikipedia.org/wiki/Transformation_matrix

### Tertiary (LOW confidence)
- Font metrics baseline offset — wiki.apache.org/graphics/FontMetricsAndLineHeight

---
*Research completed: 2026-06-26*
*Ready for roadmap: yes*
