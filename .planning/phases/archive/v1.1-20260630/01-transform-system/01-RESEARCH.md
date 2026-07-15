# Phase 1: Transform 系统重构 - Research

**Researched:** 2026-06-27
**Domain:** SVG transform attribute parsing and PPTist rotation/flip mapping
**Confidence:** HIGH

## Summary

Phase 1 implements full SVG `transform` attribute support (translate/rotate/scale) with correct rotation-center handling and proper mapping to PPTist `rotate`/`flipH`/`flipV` fields. The existing `parseTransform()` function already extracts transform components correctly; the gap is in `mapCoordinates()` (missing rotate-center math) and `transformElement()` (hardcoded `rotate: 0`).

**Primary recommendation:** Create a dedicated `applyTransform()` utility in `src/transformer/` that handles D-01 (rotate with center pre-transformation) and D-02 (rotate without center sets PPTElement.rotate), then wire it into `transformElement()` for all element types.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `rotate(deg, cx, cy)` with center → translate→rotate→translate-back formula pre-transforms coordinates, `rotate` field on PPTElement set to 0
- **D-02:** `rotate(deg)` without center → SVG default around (0,0), PPTist `rotate` set to `rotateDeg`
- **D-03:** `scale(-1, 1)` → `flipH: true`
- **D-04:** `scale(1, -1)` → `flipV: true`
- **D-05:** Transform application order: translate → rotate → scale (SVG spec)
- **D-06:** `matrix(...)` detected → mark `special: true`, do not decompose

### Claude's Discretion

- How to structure the transform application code (new module vs. inline in transformElement)
- Which element types get transform support (all renderable types)

### Deferred Ideas (OUT OF SCOPE)

- Matrix transform decomposition (v2)
- SVG examples in exampels/ directory all lack transform attributes (no test data available yet)

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Transform attribute parsing | API / Backend | — | `parseTransform()` in coordinate-mapper.ts |
| Coordinate transformation | API / Backend | — | `mapCoordinates()` + new `applyTransform()` |
| PPTElement rotate/flip fields | API / Backend | — | `transformElement()` in transform-to-pptel.ts |
| Bounding-box center calculation | API / Backend | — | Needed for D-01 rotate-center math |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRANS-01 | Parse SVG `transform` attribute — support translate/rotate/scale | `parseTransform()` already implemented; regex patterns confirmed correct |
| TRANS-02 | `rotate(deg, cx, cy)` with center point — apply rotation around specified center | D-01 math formula documented; `mapCoordinates()` needs rotate-center support |
| TRANS-03 | Map parsed transform to PPTist `rotate`/`flipH`/`flipV` fields | `transformElement()` hardcodes `rotate: 0`; needs new logic for all element types |

## Standard Stack

No new packages required — this is a pure logic implementation using existing TypeScript/Node.js stack.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ^5.5.0 | Language | Project already uses TS |
| Vitest | ^2.0.0 | Testing | Project already uses Vitest |

**Installation:** No new packages.

## Package Legitimacy Audit

No external packages — not applicable.

## Architecture Patterns

### System Architecture Diagram

```
SVG Element
    │
    ▼
parseTransform() ─────────────────────────────────────┐
│ extracts: translateX/Y, scaleX/Y, rotateDeg,        │
│           rotateCX/CY, special                       │
└──────────────────────────────────────────────────────┤
                                                       │
    ┌──────────────────────────────────────────────────┘
    ▼
mapCoordinates()
│ applies: translate → scale to left/top/width/height
│ NOTE: rotate NOT applied here (center-based rotation
│       needs bounding box which requires element coords)
    │
    ▼
transformElement()
    │
    ├──► For rotate-with-center (D-01):
    │    ├── Calculate element bounding box center
    │    ├── Apply translate→rotate→translate-back formula
    │    ├── Update left/top to rotated coordinates
    │    └── Set PPTElement.rotate = 0
    │
    ├──► For rotate-without-center (D-02):
    │    └── Set PPTElement.rotate = rotateDeg
    │
    ├──► For scale with negative (D-03/D-04):
    │    └── Set PPTElement.flipH / flipV = true
    │
    ▼
PPTElement (with rotate/flipH/flipV set correctly)
```

### Recommended Project Structure

```
src/
├── transformer/
│   ├── transform-to-pptel.ts   # Existing — modify rotate handling
│   └── apply-transform.ts      # NEW — rotate-center math, flip logic
├── mapper/
│   └── coordinate-mapper.ts    # Existing — parseTransform + mapCoordinates
└── ...
```

### Pattern 1: Rotate-Center Pre-transformation (D-01)

**What:** When `rotate(deg, cx, cy)` is specified, pre-transform the element's bounding box coordinates using the translate→rotate→translate-back formula, then set PPTElement.rotate to 0.

**When to use:** SVG element has `transform="rotate(deg, cx, cy)"` with explicit center point.

**Formula (from D-01):**
```typescript
// Translate to origin, rotate, translate back
const px = x - cx, py = y - cy
const rx = px * cos(θ) - py * sin(θ)
const ry = px * sin(θ) + py * cos(θ)
final_x = rx + cx, final_y = ry + cy
```

**Implementation location:** New `src/transformer/apply-transform.ts` function `applyRotateWithCenter()`.

### Pattern 2: PPTElement.rotate Without Center (D-02)

**What:** When `rotate(deg)` has no center, SVG rotates around (0,0). PPTist's `rotate` rotates around element center. Set PPTElement.rotate directly to the degrees.

**When to use:** SVG element has `transform="rotate(deg)"` without center point.

### Pattern 3: Scale to Flip Mapping (D-03/D-04)

**What:** Negative scale values represent flips in SVG. `scale(-1, 1)` = horizontal flip → PPTist `flipH: true`. `scale(1, -1)` = vertical flip → PPTist `flipV: true`.

**When to use:** SVG element has `transform="scale(-1, ...)"` or `transform="scale(..., -1)"`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rotation math | Custom sin/cos formula | Standard trigonometry | Math is well-defined; custom implementation risks precision errors |
| Transform parsing | Regex from scratch | Extend existing `parseTransform()` | Already handles translate/scale/rotate correctly; only coordinate application needs work |

## Common Pitfalls

### Pitfall 1: Wrong transform order
**What goes wrong:** Applying rotate before translate produces incorrect results.
**Why it happens:** SVG spec defines transform order as translate → rotate → scale. Code that applies them in different order (e.g., scale → rotate → translate) will produce wrong coordinates.
**How to avoid:** Follow D-05 strictly; the transform math must apply translate first, then rotate, then scale.
**Warning signs:** Elements end up in wrong positions, especially when both translate and rotate are present.

### Pitfall 2: Hardcoded rotate: 0
**What goes wrong:** `transformElement()` sets `rotate: 0` on all PPTShapeElements, ignoring parsed rotate values.
**Why it happens:** The original implementation didn't handle rotate; the hardcoded 0 was a placeholder.
**How to avoid:** After calling `mapCoordinates()`, check `parseTransform(attrs.transform)` and apply the rotate logic based on D-01 vs D-02.
**Warning signs:** Rotated elements appear unrotated in output JSON.

### Pitfall 3: Bounding box center calculation before transform
**What goes wrong:** Using the already-transformed coordinates to calculate center for rotate-around-center, creating a feedback loop.
**Why it happens:** The formula needs the ORIGINAL element center, not the already-rotated one.
**How to avoid:** Calculate element center from the ORIGINAL left/top/width/height BEFORE applying rotate transform, then use that center in the formula.
**Warning signs:** Elements with rotate centers spiral outward on repeated parses.

### Pitfall 4: flipH/flipV not set on PPTShapeElement
**What goes wrong:** Negative scale values are parsed but never mapped to flipH/flipV on the PPTShapeElement.
**Why it happens:** The `transform` attribute is parsed but only translate/scale/rotate values are extracted; flip logic is not implemented.
**How to avoid:** Check `transform.scaleX < 0` → set `flipH: true`; check `transform.scaleY < 0` → set `flipV: true`.
**Warning signs:** Elements that should be flipped appear normal; looking at the PPTElement JSON shows no flipH/flipV fields.

### Pitfall 5: Duplicate coordinate-mapper.ts files
**What goes wrong:** `src/coordinate-mapper.ts` and `src/mapper/coordinate-mapper.ts` exist with identical logic but different import paths.
**Why it happens:** The project has a duplicate file; `src/coordinate-mapper.ts` imports from `./types/ast` while the canonical `src/mapper/coordinate-mapper.ts` imports from `../types/ast`.
**How to avoid:** Planner should consolidate to one location; the `src/` version should be removed or the `src/mapper/` version should be the canonical one.
**Warning signs:** Build works but imports may resolve to the wrong file depending on bundler resolution.

## Code Examples

### Existing parseTransform() (coordinate-mapper.ts:33-66)

```typescript
// Source: src/mapper/coordinate-mapper.ts
export function parseTransform(transform: string | undefined): TransformResult {
  if (!transform) return {}
  const result: TransformResult = {}

  const translateMatch = transform.match(/translate\(\s*([\d.]+)(?:[,\s]+([\d.]+))?\s*\)/)
  if (translateMatch) {
    result.translateX = parseFloat(translateMatch[1])
    result.translateY = translateMatch[2] ? parseFloat(translateMatch[2]) : 0
  }

  const scaleMatch = transform.match(/scale\(\s*([\d.]+)(?:[,\s]+([\d.]+))?\s*\)/)
  if (scaleMatch) {
    result.scaleX = parseFloat(scaleMatch[1])
    result.scaleY = scaleMatch[2] ? parseFloat(scaleMatch[2]) : result.scaleX
  }

  const rotateMatch = transform.match(/rotate\(\s*([\d.]+)(?:[,\s]+([\d.]+),?\s*([\d.]+))?\s*\)/)
  if (rotateMatch) {
    result.rotateDeg = parseFloat(rotateMatch[1])
    result.rotateCX = rotateMatch[2] ? parseFloat(rotateMatch[2]) : undefined
    result.rotateCY = rotateMatch[3] ? parseFloat(rotateMatch[3]) : undefined
  }

  if (/matrix\(/.test(transform)) {
    result.raw = transform
    result.special = true
  }

  return result
}
```

### Current transformElement() hardcoded rotate (transform-to-pptel.ts:289-310)

```typescript
// Source: src/transformer/transform-to-pptel.ts (rect case)
case 'rect': {
  const path = rectToPath(...)
  const result: PPTShapeElement = {
    id,
    type: 'shape',
    left,
    top,
    width,
    height,
    rotate: 0,  // HARDCODED - needs to use parsed transform value
    // ...
  }
  return result
}
```

### Idea.md applyTransform reference (NOT USED AS-IS)

```javascript
// Source: .planning/idea.md
// This is the user's reference implementation showing transform order
// Key difference: this does NOT handle rotate-center (D-01)
// It applies rotate around origin, not around specified center
function applyTransform(x, y, transform) {
    // ... parse translate/scale/rotate
    // Apply in order: translate → rotate → scale
    px = x + tx;  // translate
    px = px * cosA - py * sinA;  // rotate (around origin)
    py = px * sinA + py * cosA;
    px = px * sx;  // scale
    py = py * sy;
    return { x: px, y: py };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No rotate support | D-01/D-02 rotate handling | Phase 1 | Elements can rotate around center or origin |
| No flip support | D-03/D-04 flipH/flipV | Phase 1 | Negative scale elements flip correctly |
| Hardcoded rotate: 0 | Dynamic rotate from transform | Phase 1 | PPTElement.rotate reflects SVG transform |

**Deprecated/outdated:**
- `rotate: 0` hardcode in `transformElement()` — replaced with parsed transform value

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `mapCoordinates()` does not apply rotate — only translate and scale | Architecture | If rotate IS applied there, our plan over-complicates. Check code flow. |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

1. **Should `mapCoordinates()` also return transform info, or should `transformElement()` call `parseTransform()` directly?**
   - What we know: `mapCoordinates()` currently returns only `{left, top, width, height}`. `transformElement()` has access to the original `element` with `attrs.transform`.
   - What's unclear: Whether the cleanest design is to extend `mapCoordinates()` return type or have `transformElement()` call `parseTransform()` directly.
   - Recommendation: Have `transformElement()` call `parseTransform(attrs.transform)` directly — keeps `mapCoordinates()` focused on geometry.

2. **Duplicate coordinate-mapper.ts — which is canonical?**
   - What we know: Both files exist with identical logic. `src/mapper/coordinate-mapper.ts` is referenced in CONTEXT.md as the canonical location.
   - What's unclear: Whether `src/coordinate-mapper.ts` is actively used or is stale.
   - Recommendation: Planner should remove `src/coordinate-mapper.ts` or confirm it's unused.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — pure code implementation)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^2.0.0 |
| Config file | `src/vitest.config.ts` — globals: true, environment: node, include: `__tests__/**/*.test.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm run build && npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| TRANS-01 | Parse `translate(dx,dy) scale(sx,sy) rotate(deg)` correctly | unit | `vitest run __tests__/parse-transform.test.ts` | NO — needs Wave 0 |
| TRANS-02 | `rotate(deg,cx,cy)` pre-transforms coordinates correctly | unit | `vitest run __tests__/apply-transform.test.ts` | NO — needs Wave 0 |
| TRANS-03 | PPTElement gets correct rotate/flipH/flipV values | unit | `vitest run __tests__/transform-element.test.ts` | NO — needs Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test` (quick run, under 30 seconds)
- **Per wave merge:** `npm run build && npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `__tests__/parse-transform.test.ts` — covers TRANS-01: parseTransform unit tests
- [ ] `__tests__/apply-transform.test.ts` — covers TRANS-02: rotate-center math tests
- [ ] `__tests__/transform-element.test.ts` — covers TRANS-03: PPTElement output tests
- [ ] `__tests__/fixtures/` — SVG test fixtures with transform attributes
- Framework install: Not needed — Vitest already in devDependencies

## Security Domain

Not applicable — no user input, file parsing, network, or cryptographic operations involved.

## Sources

### Primary (HIGH confidence)
- `src/mapper/coordinate-mapper.ts` — parseTransform and mapCoordinates implementation
- `src/types/ast.ts` — TransformResult interface definition
- `src/transformer/transform-to-pptel.ts` — transformElement function with hardcoded rotate: 0
- `src/slides.ts` — PPTShapeElement interface with rotate/flipH/flipV fields
- `.planning/CONTEXT.md` — D-01 through D-06 locked decisions

### Secondary (MEDIUM confidence)
- `.planning/idea.md` — applyTransform reference (does not handle rotate-center, not for direct use)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, pure logic
- Architecture: HIGH — clear flow from parseTransform → mapCoordinates → transformElement
- Pitfalls: HIGH — identified 5 concrete pitfalls from code analysis

**Research date:** 2026-06-27
**Valid until:** 2026-07-27 (30 days — transform math is stable)
