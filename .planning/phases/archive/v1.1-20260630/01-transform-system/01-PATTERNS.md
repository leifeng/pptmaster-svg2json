# Phase 1: Transform 系统重构 - Pattern Map

**Mapped:** 2026-06-27
**Files analyzed:** 5 new/modified files
**Analogs found:** 2 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/transformer/transform-to-pptel.ts` | transformer | transform | `src/transformer/transform-to-pptel.ts` | exact (self) |
| `src/mapper/coordinate-mapper.ts` | mapper | transform | `src/mapper/coordinate-mapper.ts` | exact (self) |
| `src/transformer/apply-transform.ts` | utility | transform | `src/mapper/coordinate-mapper.ts` | role-match |
| `__tests__/parse-transform.test.ts` | test | unit | None | no-analog |
| `__tests__/apply-transform.test.ts` | test | unit | None | no-analog |
| `__tests__/transform-element.test.ts` | test | unit | None | no-analog |

## Pattern Assignments

### `src/transformer/transform-to-pptel.ts` (transformer, transform)

**Analog:** `src/transformer/transform-to-pptel.ts` (self — modification of existing)

**Role:** This is an existing transformer file that converts SVG elements to PPTElement. Phase 1 modifies it to replace hardcoded `rotate: 0` with dynamic rotate/flip logic.

**Key modification points** (all locations where `rotate: 0` appears):
- Line 296: `rotate: 0` in rect case
- Line 326: `rotate: 0` in circle case
- Line 357: `rotate: 0` in ellipse case
- Line 385: `rotate: 0` in path case
- Line 414: `rotate: 0` in polygon case
- Line 443: `rotate: 0` in polyline case
- Line 507: `rotate: 0` in text case
- Line 527: `rotate: 0` in image case

**Pattern to copy — element creation with transform support:**
```typescript
// Source: src/transformer/transform-to-pptel.ts:281-310 (rect case as example)
// After Phase 1 modification, the rect case should look like:
case 'rect': {
  const path = rectToPath(
    Number(element.attrs.x) || 0,
    Number(element.attrs.y) || 0,
    Number(element.attrs.width) || 0,
    Number(element.attrs.height) || 0,
  )
  const strokeWidth = parseFloat(String(element.attrs['stroke-width'] || '0'))
  const result: PPTShapeElement = {
    id,
    type: 'shape',
    left,
    top,
    width,
    height,
    rotate: 0,  // TODO: Replace with applyTransform rotation logic
    viewBox: [width, height],
    path,
    fixedRatio: false,
    fill: colorToHex(element.attrs.fill) || '#000000',
    opacity: element.attrs.opacity ? parseFloat(element.attrs.opacity) : 1,
  }
  // flipH/flipV handling for negative scale
  if (element.attrs.transform) {
    const transform = parseTransform(element.attrs.transform)
    if (transform.scaleX < 0) result.flipH = true
    if (transform.scaleY < 0) result.flipV = true
  }
  if (element.attrs.stroke) {
    result.outline = {
      style: parseDashArray(element.attrs['stroke-dasharray']),
      width: strokeWidth || 1,
      color: colorToHex(element.attrs.stroke),
    }
  }
  return result
}
```

**Imports pattern** (lines 1-6):
```typescript
import { v4 as uuidv4 } from 'uuid'
import { SvgParseResult, SvgElement } from '../types/ast'
import { mapCoordinates } from '../mapper/coordinate-mapper'
import { rectToPath, circleToPath, ellipseToPath, lineToPath, polygonToPath } from '../shapes/shape-to-path'
import type { PPTElement, PPTTextElement, PPTShapeElement, PPTLineElement, PPTImageElement, LineStyleType } from '../slides'
```

**Note:** `parseTransform` must be imported from `../mapper/coordinate-mapper` to use in transformElement.

---

### `src/mapper/coordinate-mapper.ts` (mapper, transform)

**Analog:** `src/mapper/coordinate-mapper.ts` (self — modification of existing)

**Role:** This file contains `parseTransform()` and `mapCoordinates()`. The `parseTransform()` function is already correct and should NOT be modified. Only `mapCoordinates()` may need minor adjustments if Phase 1 discovers issues.

**Existing parseTransform pattern** (lines 33-66):
```typescript
// Source: src/mapper/coordinate-mapper.ts:33-66
export function parseTransform(transform: string | undefined): TransformResult {
  if (!transform) return {}
  const result: TransformResult = {}

  // translate(dx, dy) or translate(dx)
  const translateMatch = transform.match(/translate\(\s*([\d.]+)(?:[,\s]+([\d.]+))?\s*\)/)
  if (translateMatch) {
    result.translateX = parseFloat(translateMatch[1])
    result.translateY = translateMatch[2] ? parseFloat(translateMatch[2]) : 0
  }

  // scale(sx, sy) or scale(s)
  const scaleMatch = transform.match(/scale\(\s*([\d.]+)(?:[,\s]+([\d.]+))?\s*\)/)
  if (scaleMatch) {
    result.scaleX = parseFloat(scaleMatch[1])
    result.scaleY = scaleMatch[2] ? parseFloat(scaleMatch[2]) : result.scaleX
  }

  // rotate(deg, cx, cy) or rotate(deg)
  const rotateMatch = transform.match(/rotate\(\s*([\d.]+)(?:[,\s]+([\d.]+),?\s*([\d.]+))?\s*\)/)
  if (rotateMatch) {
    result.rotateDeg = parseFloat(rotateMatch[1])
    result.rotateCX = rotateMatch[2] ? parseFloat(rotateMatch[2]) : undefined
    result.rotateCY = rotateMatch[3] ? parseFloat(rotateMatch[3]) : undefined
  }

  // matrix not supported → special: true
  if (/matrix\(/.test(transform)) {
    result.raw = transform
    result.special = true
  }

  return result
}
```

**Existing mapCoordinates pattern** (lines 113-135):
```typescript
// Source: src/mapper/coordinate-mapper.ts:113-135
export function mapCoordinates(
  element: SvgElement,
  viewBox: [number, number, number, number],
): CoordinateMapping {
  const { attrs } = element
  const tag = element.type.toLowerCase()

  // Parse transform first (per D-04)
  const transform = parseTransform(attrs.transform)
  const tx = transform.translateX || 0
  const ty = transform.translateY || 0
  const sx = transform.scaleX || 1
  const sy = transform.scaleY || 1

  let left = 0
  let top = 0
  let width = viewBox[2]
  let height = viewBox[3]

  switch (tag) {
    case 'rect': {
      left = extractNumber(attrs.x, 0) * sx + tx
      top = extractNumber(attrs.y, 0) * sy + ty
      width = extractNumber(attrs.width, viewBox[2]) * sx
      height = extractNumber(attrs.height, viewBox[3]) * sy
      break
    }
    // ... other cases
  }

  return { left, top, width, height }
}
```

**Important:** `mapCoordinates` only applies translate and scale to coordinates. Rotation is NOT applied here because rotate-around-center requires the element's bounding box center which needs coordinates to be computed first.

---

### `src/transformer/apply-transform.ts` (utility, transform) — NEW FILE

**Analog:** `src/mapper/coordinate-mapper.ts`

**Role:** New utility file to handle D-01 (rotate with center pre-transformation) and D-02 (rotate without center), plus D-03/D-04 (scale to flip mapping).

**Pattern to implement — rotate-center pre-transformation (D-01):**

```typescript
// Source: RESEARCH.md D-01 formula
// When rotate(deg, cx, cy) is specified:
// 1. Calculate element bounding box center (centerX, centerY)
// 2. Apply translate→rotate→translate-back formula
// 3. Return new left/top coordinates, rotate set to 0

/**
 * Apply rotation around a specified center point.
 * Per D-01: translate→rotate→translate-back formula.
 * 
 * Formula:
 *   px = x - cx, py = y - cy
 *   rx = px*cos(θ) - py*sin(θ)
 *   ry = px*sin(θ) + py*cos(θ)
 *   final_x = rx + cx, final_y = ry + cy
 */
export function applyRotateWithCenter(
  x: number,
  y: number,
  deg: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const px = x - cx
  const py = y - cy
  const rx = px * cos - py * sin
  const ry = px * sin + py * cos
  return {
    x: rx + cx,
    y: ry + cy,
  }
}
```

**Pattern to implement — rotate without center (D-02):**

```typescript
// Source: RESEARCH.md D-02
// When rotate(deg) without center:
// SVG rotates around (0,0), PPTist rotate rotates around element center
// Simply set PPTElement.rotate = rotateDeg

/**
 * Get rotation degrees for PPTElement when no center is specified.
 * Per D-02: Returns the raw rotateDeg value.
 */
export function getRotateDeg(transform: TransformResult): number {
  return transform.rotateDeg || 0
}
```

**Pattern to implement — scale to flip mapping (D-03/D-04):**

```typescript
// Source: RESEARCH.md D-03/D-04
// scale(-1, 1) → flipH: true
// scale(1, -1) → flipV: true

/**
 * Determine flip values from scale transform.
 * Per D-03/D-04: negative scale values represent flips.
 */
export function getFlipFromScale(transform: TransformResult): { flipH?: boolean; flipV?: boolean } {
  const result: { flipH?: boolean; flipV?: boolean } = {}
  if (transform.scaleX < 0) result.flipH = true
  if (transform.scaleY < 0) result.flipV = true
  return result
}
```

**Full file structure pattern:**

```typescript
// Source: based on coordinate-mapper.ts patterns + RESEARCH.md D-01~D-06
import { TransformResult } from '../types/ast'

/**
 * Apply rotation around a specified center point.
 * Per D-01: translate→rotate→translate-back formula.
 */
export function applyRotateWithCenter(
  x: number,
  y: number,
  deg: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const px = x - cx
  const py = y - cy
  const rx = px * cos - py * sin
  const ry = px * sin + py * cos
  return {
    x: rx + cx,
    y: ry + cy,
  }
}

/**
 * Get rotation degrees for PPTElement when no center is specified.
 * Per D-02: Returns the raw rotateDeg value.
 */
export function getRotateDeg(transform: TransformResult): number {
  return transform.rotateDeg || 0
}

/**
 * Determine flip values from scale transform.
 * Per D-03/D-04: negative scale values represent flips.
 */
export function getFlipFromScale(transform: TransformResult): { flipH?: boolean; flipV?: boolean } {
  const result: { flipH?: boolean; flipV?: boolean } = {}
  if (transform.scaleX < 0) result.flipH = true
  if (transform.scaleY < 0) result.flipV = true
  return result
}

/**
 * Apply transform to an element's coordinates and return rotation/flip values.
 * Per D-01: rotate with center pre-transforms coords, rotate = 0
 * Per D-02: rotate without center sets rotate = rotateDeg
 * Per D-03/D-04: negative scale sets flipH/flipV
 */
export function applyTransform(
  left: number,
  top: number,
  width: number,
  height: number,
  transform: TransformResult,
): {
  left: number
  top: number
  width: number
  height: number
  rotate: number
  flipH?: boolean
  flipV?: boolean
} {
  let rotate = getRotateDeg(transform)
  let finalLeft = left
  let finalTop = top
  let finalWidth = width
  let finalHeight = height
  const flip = getFlipFromScale(transform)

  // D-01: rotate with center — pre-transform coordinates
  if (transform.rotateCX !== undefined && transform.rotateCY !== undefined) {
    const centerX = left + width / 2
    const centerY = top + height / 2
    const rotatedUL = applyRotateWithCenter(left, top, transform.rotateDeg!, transform.rotateCX, transform.rotateCY)
    const rotatedLR = applyRotateWithCenter(
      left + width,
      top + height,
      transform.rotateDeg!,
      transform.rotateCX,
      transform.rotateCY,
    )
    finalLeft = Math.min(rotatedUL.x, rotatedLR.x)
    finalTop = Math.min(rotatedUL.y, rotatedLR.y)
    finalWidth = Math.abs(rotatedLR.x - rotatedUL.x)
    finalHeight = Math.abs(rotatedLR.y - rotatedUL.y)
    rotate = 0  // Rotation applied to coordinates, not PPTElement
  }

  return {
    left: finalLeft,
    top: finalTop,
    width: finalWidth,
    height: finalHeight,
    rotate,
    ...flip,
  }
}
```

---

## Shared Patterns

### TransformResult Interface
**Source:** `src/types/ast.ts:53-63`
**Apply to:** All files that work with transforms

```typescript
// Source: src/types/ast.ts:53-63
export interface TransformResult {
  translateX?: number;
  translateY?: number;
  scaleX?: number;
  scaleY?: number;
  rotateDeg?: number;
  rotateCX?: number;
  rotateCY?: number;
  raw?: string;
  special?: boolean;
}
```

### PPTShapeElement with flipH/flipV
**Source:** `src/slides.ts:373-390`
**Apply to:** All shape element creation in transformElement

```typescript
// Source: src/slides.ts:373-390 (PPTShapeElement interface excerpt)
export interface PPTShapeElement extends PPTBaseElement {
  type: 'shape'
  viewBox: [number, number]
  path: string
  fixedRatio: boolean
  fill: string
  gradient?: Gradient
  pattern?: string
  outline?: PPTElementOutline
  opacity?: number
  flipH?: boolean  // D-03: scale(-1, 1) → flipH: true
  flipV?: boolean  // D-04: scale(1, -1) → flipV: true
  shadow?: PPTElementShadow
  special?: boolean
  text?: ShapeText
  pathFormula?: ShapePathFormulasKeys
  keypoints?: number[]
}
```

### PPTImageElement with flipH/flipV
**Source:** `src/slides.ts:288-301`
**Apply to:** Image element creation in transformElement

```typescript
// Source: src/slides.ts:288-301 (PPTImageElement interface excerpt)
export interface PPTImageElement extends PPTBaseElement {
  type: 'image'
  fixedRatio: boolean
  src: string
  outline?: PPTElementOutline
  filters?: ImageElementFilters
  clip?: ImageElementClip
  flipH?: boolean
  flipV?: boolean
  shadow?: PPTElementShadow
  radius?: number
  colorMask?: string
  imageType?: ImageType
}
```

### Vitest Test Configuration
**Source:** `src/vitest.config.ts`
**Apply to:** All test files

```typescript
// Source: src/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['**/*.ts'],
      exclude: ['**/*.d.ts', 'node_modules/**', 'dist/**']
    }
  }
})
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns and vitest.config.ts):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `__tests__/parse-transform.test.ts` | test | unit | No existing test files; use vitest.config.ts globals pattern |
| `__tests__/apply-transform.test.ts` | test | unit | No existing test files; use vitest.config.ts globals pattern |
| `__tests__/transform-element.test.ts` | test | unit | No existing test files; use vitest.config.ts globals pattern |

**Test file pattern (use vitest globals):**

```typescript
// Pattern for __tests__/parse-transform.test.ts
import { describe, it, expect } from 'vitest'
import { parseTransform } from '../src/mapper/coordinate-mapper'

describe('parseTransform', () => {
  it('should parse translate', () => {
    const result = parseTransform('translate(10, 20)')
    expect(result.translateX).toBe(10)
    expect(result.translateY).toBe(20)
  })

  it('should parse rotate without center', () => {
    const result = parseTransform('rotate(45)')
    expect(result.rotateDeg).toBe(45)
    expect(result.rotateCX).toBeUndefined()
  })

  it('should parse rotate with center', () => {
    const result = parseTransform('rotate(45, 100, 100)')
    expect(result.rotateDeg).toBe(45)
    expect(result.rotateCX).toBe(100)
    expect(result.rotateCY).toBe(100)
  })
  
  // ... more tests for TRANS-01
})
```

---

## Metadata

**Analog search scope:** `src/` directory
**Files scanned:** 12 TypeScript files
**Pattern extraction date:** 2026-06-27

**Key Patterns Identified:**
- All transform logic uses `TransformResult` interface from `src/types/ast.ts`
- `parseTransform()` in `coordinate-mapper.ts` already handles translate/scale/rotate parsing
- `transformElement()` in `transform-to-pptel.ts` creates PPTShapeElement/PPTTextElement/PPTImageElement with `rotate: 0` hardcoded
- PPTShapeElement and PPTImageElement support `flipH`/`flipV` boolean fields
- Vitest configured with `globals: true` for describe/it/expect availability

**Integration Flow:**
```
parseTransform(transform string) → TransformResult
    ↓
mapCoordinates(element, viewBox) → CoordinateMapping (left, top, width, height)
    ↓
applyTransform(left, top, width, height, transform) → { left, top, width, height, rotate, flipH, flipV }
    ↓
transformElement() → PPTElement with rotate/flipH/flipV set correctly
```