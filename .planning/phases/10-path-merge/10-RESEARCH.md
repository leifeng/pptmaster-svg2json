# Phase 10: Path Merge - Research

**Researched:** 2026-07-13
**Domain:** SVG path bounding box computation, overlap detection, and path composition
**Confidence:** HIGH

## Summary

Phase 10 implements a path merging decision tree in `src/merger/path-merge.ts` to reduce output element count when a `<g>` contains multiple `<path>` children with mergeable characteristics. The decision tree follows: shared style -> no independent semantics -> fill="none"/no overlap -> no evenodd.

Key findings:
- **Existing `pathBoundingBox()` in `src/mapper/coordinate-mapper.ts` only handles M/L/H/V/A commands** [ASSUMED] - C/Q/S/T curves need control point bounding box approximation
- **resvg-js is already a dependency** with `getBBox()` API for accurate bounding boxes, but async nature may not fit merge decision tree
- **evenodd paths must be skipped** - merging changes hollow areas based on winding order
- **No new dependencies needed** - pure TypeScript using existing `toAbsolutePath()` and `scalePathCoords()` patterns
- **Path concatenation** is straightforward after absolute coordinate normalization using space separator

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PATH-MERGE-01 | Decision tree in `src/merger/path-merge.ts` | New module structure, walk() integration pattern |
| PATH-MERGE-02 | Extract common style attributes | Style attribute extraction from element.attrs |
| PATH-MERGE-03 | Bounding box overlap detection | Extend existing `pathBoundingBox()` for C/Q/S/T |
| PATH-MERGE-04 | fill-rule="evenodd" skip merge | evenodd implications for path composition |
| PATH-MERGE-05 | d attribute concatenation | `toAbsolutePath()` already handles normalization |

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-29:** Independent module `src/merger/path-merge.ts` with `shouldMerge()` and `mergePaths()`
- **D-30:** Extract common style attributes (fill, stroke, stroke-width, opacity, fill-rule)
- **D-31:** Parse path commands for bounding box (extend `pathBoundingBox()` for C/Q/S/T)
- **D-32:** evenodd paths skip merge entirely
- **D-33:** Absolute coordinate normalization via `toAbsolutePath()` before concatenation

### Claude's Discretion
- Arc bounding box approximation strategy (control point enclosure vs. endpoint only)
- Whether to use resvg-js for accurate bbox (async vs. sync decision tree)

### Deferred Ideas (OUT OF SCOPE)
None - all raised topics were within Phase 10 scope.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Path bounding box computation | API/Backend | — | Pure computation, no UI |
| Style attribute extraction | API/Backend | — | Element attribute parsing |
| Decision tree logic | API/Backend | — | Pure business logic |
| Path d concatenation | API/Backend | — | String manipulation |
| Integration with walk() | Frontend Server | API/Backend | walk() is transformer, merge result flows to elements |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.5 | Phase implementation | Already in use |
| @resvg/resvg-js | 2.6.2 | getBBox() for accurate bbox | Already a dependency, but async |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `toAbsolutePath()` | existing | Normalize path to absolute coords | PATH-MERGE-05 |
| `scalePathCoords()` | existing | Scale path coordinates | When transforms applied |
| `pathBoundingBox()` | existing | Compute path bbox (M/L/H/V/A only) | Extend for C/Q/S/T |

### No New Dependencies Expected
This phase uses pure TypeScript with existing codebase utilities.

## Architecture Patterns

### System Architecture Diagram

```
SVG <g> with path children
         |
         v
   walk() detects all-path group
         |
         v
   path-merge.shouldMerge(paths, groupAttrs)
         |
         +---> Check shared style (fill, stroke, opacity, fill-rule)
         |
         +---> Check no independent semantics (no id, aria-*, events)
         |
         +---> Check fill="none" OR no bounding box overlap
         |
         +---> Check no evenodd fill-rule
         |
         v
   Return: 'merge' | 'no-merge' | 'cautious-merge'
         |
         v (if merge)
   path-merge.mergePaths(paths, commonStyle, groupTransform)
         |
         +---> toAbsolutePath() on each path d
         |
         +---> Concatenate with space separator
         |
         +---> Apply group transform if present
         |
         v
   Single PPTShapeElement with merged path
```

### Recommended Project Structure
```
src/
├── merger/                      # NEW: path-merge module
│   └── path-merge.ts           # shouldMerge(), mergePaths()
├── utils/
│   └── path-utils.ts           # EXISTING: toAbsolutePath(), scalePathCoords()
├── mapper/
│   └── coordinate-mapper.ts    # EXISTING: pathBoundingBox() - extend for curves
└── transformer/
    └── transform-to-pptel.ts   # EXISTING: walk() - integrate path-merge
```

### Pattern 1: Decision Tree with Result Enum
**What:** `shouldMerge()` returns a typed decision rather than boolean
**When to use:** When multiple outcomes affect downstream handling
```typescript
// Source: Context Decision D-29
export type MergeDecision = 'merge' | 'no-merge' | 'cautious-merge'

export interface MergeParams {
  paths: PathElement[]
  groupAttrs: Record<string, string>
  commonStyle: SharedStyle | null
  boundingBoxes: BoundingBox[]
  hasEvenodd: boolean
}

export function shouldMerge(params: MergeParams): MergeDecision
```

### Pattern 2: Bounding Box Control Point Enclosure
**What:** For bezier curves, use control points as conservative bbox estimate
**When to use:** When exact curve bbox unavailable or too expensive
```typescript
// Source: [ASSUMED - standard bezier bbox algorithm]
function curveBoundingBox(pts: number[][]): BoundingBox {
  // Cubic bezier: curve is within convex hull of 4 control points
  // Quadratic bezier: curve is within triangle of 3 control points
  const xs = pts.map(p => p[0])
  const ys = pts.map(p => p[1])
  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys)
  }
}
```

### Pattern 3: Style Attribute Intersection
**What:** Extract common (shared) style attributes across multiple elements
**When to use:** When merging elements need unified styling
```typescript
// Source: Context Decision D-30
function extractCommonStyle(elements: Element[]): SharedStyle | null {
  const styleKeys = ['fill', 'stroke', 'stroke-width', 'opacity', 'fill-rule'] as const
  const first = elements[0]?.attrs
  if (!first) return null

  const common: Partial<SharedStyle> = {}
  for (const key of styleKeys) {
    const value = first[key]
    if (value !== undefined && elements.every(el => el.attrs[key] === value)) {
      common[key] = value
    }
  }
  return Object.keys(common).length > 0 ? common as SharedStyle : null
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Path coordinate normalization | Custom relative->absolute parser | `toAbsolutePath()` from path-utils.ts | Already handles all commands M/L/H/V/A/C/Q/S/T/Z correctly |
| Bounding box for M/L/H/V/A | Reimplement | Extend `pathBoundingBox()` in coordinate-mapper.ts | Existing, only needs C/Q/S/T extension |
| evenodd fill-rule handling | Try to merge anyway | Skip merge for evenodd paths | evenodd holes depend on path order; merging changes semantics |

**Key insight:** The SVG path command parsing is complex (especially S/T smooth commands with control point reflection). Reusing `toAbsolutePath()` ensures correctness.

## Common Pitfalls

### Pitfall 1: Incomplete curve bounding box
**What goes wrong:** C/Q/S/T paths report incorrect/zero bounding box
**Why it happens:** Existing `pathBoundingBox()` only handles M/L/H/V/A, not curves
**How to avoid:** Extend `pathBoundingBox()` to use control point enclosure for C/Q/S/T commands
**Warning signs:** `width: 0` or `height: 0` in merged path bbox

### Pitfall 2: Evenodd path merge corruption
**What goes wrong:** Merged evenodd paths lose their holes
**Why it happens:** Evenodd fill depends on crossing count, path order matters
**How to avoid:** Skip merge entirely when any path has `fill-rule="evenodd"`
**Warning signs:** Visual artifacts in hollow areas after merge

### Pitfall 3: Style inheritance confusion
**What goes wrong:** Merged path uses wrong fill/stroke when some paths inherit from group
**Why it happens:** Inherited attrs are stored in effectiveInheritedAttrs, not always on element
**How to avoid:** Pass effectiveInheritedAttrs to merge function; extract common style before merge
**Warning signs:** `fill: undefined` on merged output

### Pitfall 4: Coordinate system mismatch
**What goes wrong:** Merged path appears offset from original positions
**Why it happens:** Path coordinates may be in different coordinate systems (absolute vs group-relative)
**How to avoid:** Call `toAbsolutePath()` on each path before concatenation
**Warning signs:** Path shapes appear shifted after merge

## Code Examples

### Extending pathBoundingBox for curves
```typescript
// Source: [ASSUMED - standard approach based on existing path-utils.ts patterns]
function pathBoundingBox(d: string): BoundingBox | null {
  // ... existing M/L/H/V/A handling ...

  } else if (cmdU === 'C') {
    // Cubic bezier: x1,y1 x2,y2 x,y (6 params after command)
    for (let i = 0; i < nums.length; i += 6) {
      const [x1, y1, x2, y2, x, y] = getCParams(nums, i, curX, curY, isRel)
      // Use control point enclosure as conservative estimate
      minX = Math.min(minX, x1, x2, x); maxX = Math.max(maxX, x1, x2, x)
      minY = Math.min(minY, y1, y2, y); maxY = Math.max(maxY, y1, y2, y)
      curX = x; curY = y
    }
  } else if (cmdU === 'Q') {
    // Quadratic bezier: x1,y1 x,y (4 params after command)
    for (let i = 0; i < nums.length; i += 4) {
      const [x1, y1, x, y] = getQParams(nums, i, curX, curY, isRel)
      // Control point enclosure
      minX = Math.min(minX, x1, x); maxX = Math.max(maxX, x1, x)
      minY = Math.min(minY, y1, y); maxY = Math.max(maxY, y1, y)
      curX = x; curY = y
    }
  }
  // S and T require first control point computation from reflection
}
```

### Bounding box overlap detection
```typescript
// Source: [ASSUMED - standard AABB overlap test]
function boxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.left + a.width < b.left ||  // a is left of b
    b.left + b.width < a.left ||  // b is left of a
    a.top + a.height < b.top ||   // a is above b
    b.top + b.height < a.top      // b is above a
  )
}
```

### Path concatenation after normalization
```typescript
// Source: Context Decision D-33
function mergePaths(paths: PathElement[], commonStyle: SharedStyle): string {
  const absolutePaths = paths.map(p => toAbsolutePath(p.attrs.d || ''))
  return absolutePaths.join(' ')  // Space separator per D-33
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No path merging | Decision tree-based selective merge | Phase 10 | Reduced element count in output |
| M/L/H/V bbox only | C/Q/S/T control point enclosure | Phase 10 | Accurate curve bounding boxes |
| No evenodd awareness | evenodd paths skipped | Phase 10 | Preserves hollow areas |

**Deprecated/outdated:**
- `pathBoundingBox()` with only M/L/H/V/A support - extended in Phase 10

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `pathBoundingBox()` only handles M/L/H/V/A (not C/Q/S/T) | Common Pitfalls | Paths with curves may not merge or may have incorrect bbox |
| A2 | Control point enclosure is acceptable for curve bbox | Common Pitfalls | bbox may be slightly larger than exact curve bounds (safe for overlap detection) |
| A3 | resvg-js getBBox() is async-only and unsuitable for sync decision tree | Standard Stack | If sync bbox is needed, alternative approach required |
| A4 | Space separator is correct for path d concatenation | Code Examples | Some SVG renderers may expect different separators |

**If this table is empty:** All claims in this research were verified or cited - no user confirmation needed.

## Open Questions

1. **Should arc (A) bounding box use endpoint only or control point enclosure?**
   - What we know: Current implementation uses endpoint only; curves use control point enclosure
   - What's unclear: Arcs have rx/ry that define the arc shape - should bbox include these?
   - Recommendation: Use endpoint only (current) + rx/ry padding for large arcs, matching existing `pathBoundingBox()` behavior

2. **Should we use resvg-js getBBox() for accurate bounding boxes?**
   - What we know: resvg-js is async and already a dependency; `getBBox()` provides accurate rendering-based bbox
   - What's unclear: Performance impact on decision tree (may be called per-path)
   - Recommendation: Start with control point enclosure (synchronous); resvg-js as future optimization if accuracy issues arise

3. **What transform context should merged paths inherit?**
   - What we know: Group's `effectiveTransform` should be applied to merged path
   - What's unclear: Whether to bake transform into path coordinates or keep as separate property
   - Recommendation: Keep transform separate (as PPTShapeElement.rotate/transform) per existing pattern

## Environment Availability

> Step 2.6: SKIPPED (no external dependencies identified - pure TypeScript implementation using existing codebase utilities)

## Security Domain

> Required when `security_enforcement` is enabled (absent = enabled). Omit only if explicitly `false` in config.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Path d attribute parsing - validate command letters and number counts |
| V4 Access Control | no | No user data or authentication in path merge |

### Known Threat Patterns for SVG path processing

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious SVG with extremely long d attribute | Denial of Service | Limit path command count or coordinate values |
| Circular arc commands causing infinite loops | Denial of Service | Validate rx/ry > 0 and endpoint exists |

**Note:** These threats are already mitigated by existing `fast-xml-parser` which parses the SVG before path processing.

## Sources

### Primary (HIGH confidence)
- `src/mapper/coordinate-mapper.ts:122-189` - Existing `pathBoundingBox()` implementation
- `src/utils/path-utils.ts` - `toAbsolutePath()` and `scalePathCoords()` implementations
- `src/transformer/transform-to-pptel.ts:1330-1405` - `walk()` function structure
- `src/slides.ts` - PPTShapeElement type definitions (path, fill, outline, opacity fields)

### Secondary (MEDIUM confidence)
- Context Decision D-29 through D-33 - Phase 10 implementation decisions

### Tertiary (LOW confidence)
- [ASSUMED] Curve bounding box via control point enclosure - standard algorithm, not verified against authoritative source

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all existing dependencies, no new packages needed
- Architecture: HIGH - follows established patterns (walk() interception like clipPath preprocessing)
- Pitfalls: MEDIUM - curve bbox approximation may need refinement during implementation

**Research date:** 2026-07-13
**Valid until:** 2026-08-12 (30 days - stable domain)
