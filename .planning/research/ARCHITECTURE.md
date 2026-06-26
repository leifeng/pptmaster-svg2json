# Architecture Research

**Domain:** SVG processing library / coordinate transformation pipeline
**Researched:** 2026-06-26
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Parser Layer                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ XML Parser  │  │ ViewBox     │  │ Element     │         │
│  │ (fast-xml)  │→ │ Extractor   │→ │ Tree Builder│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                   Transform Layer                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Transform Parser (translate/rotate/scale)  │   │
│  │           + Matrix Decomposition (optional)          │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                   Coordinate Mapping Layer                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Transform   │  │ Bounding    │  │ Scale to    │         │
│  │ Applier     │→ │ Box Calc    │→ │ Canvas      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                   Output Layer                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Shape       │  │ Text        │  │ Image       │         │
│  │ Converter   │  │ Handler     │  │ Handler     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| XML Parser | Parse SVG string into object tree | fast-xml-parser with attribute prefix config |
| ViewBox Extractor | Extract viewBox, width, height for coordinate system | String parsing, fallback defaults |
| Element Tree Builder | Convert raw parse result to typed SvgElement tree | Recursive traversal, attribute normalization |
| Transform Parser | Parse transform attribute into component values | Regex-based extraction (translate/scale/rotate/matrix) |
| Coordinate Mapper | Apply transforms, calculate bounding boxes, scale to canvas | Per-element-type coordinate computation |
| Shape Converter | Convert primitive shapes to SVG path d strings | Geometric formulas (rect, circle, ellipse, etc.) |
| Element Transformer | Convert SVG elements to target format (PPTElement) | Switch on element type, call specialized handlers |

## Recommended Project Structure

```
src/
├── parser/               # SVG parsing layer
│   ├── svg-parser.ts     # Main parser, XML → SvgElement tree
│   └── viewbox.ts        # ViewBox parsing utilities
├── transformer/          # Transform and conversion layer
│   ├── transform-to-pptel.ts  # Main transformer entry point
│   ├── transforms/       # Transform handling subdirectory
│   │   ├── parse-transform.ts # Parse transform attribute
│   │   ├── apply-transform.ts # Apply transforms to coordinates
│   │   └── matrix.ts     # Matrix operations (optional, for complex cases)
│   ├── shapes/           # Shape conversion
│   │   └── shape-to-path.ts  # rect, circle, ellipse → path d strings
│   └── elements/         # Element-specific handlers
│       ├── text-handler.ts   # Text element conversion
│       ├── image-handler.ts  # Image element conversion
│       └── shape-handler.ts  # Shape element conversion
├── mapper/               # Coordinate mapping
│   └── coordinate-mapper.ts  # Map SVG coords to canvas coords
├── types/                # Type definitions
│   └── ast.ts            # SvgElement, TransformResult, etc.
├── utils/                # Utilities
│   ├── color.ts          # Color parsing/conversion
│   └── path.ts           # Path parsing utilities
└── cli.ts                # CLI entry point
```

### Structure Rationale

- **parser/**: Separates XML parsing concerns from business logic; easier to test parsing in isolation
- **transformer/transforms/**: Centralizes all transform-related code; critical for fixing rotate center bug
- **transformer/shapes/**: Keeps shape-to-path conversion separate; reusable if adding new output formats
- **transformer/elements/**: Element-type handlers allow adding new element types without modifying main transformer
- **mapper/**: Single responsibility for coordinate mapping; critical for canvas scaling concerns
- **types/**: Centralized type definitions; shared across all modules

## Architectural Patterns

### Pattern 1: Pipeline (Parse -> Transform -> Output)

**What:** Sequential data flow where output of one stage is input to the next.
**When to use:** SVG processing where each stage is distinct and order matters.
**Trade-offs:** Simple, easy to debug; less flexible for complex graphs.

**Example:**
```typescript
// Current architecture (simplified)
const ast = parseSvg(svgString)           // Stage 1: Parse
const mapped = mapCoordinates(element, vb) // Stage 2: Map coords
const pptel = transformElement(mapped)    // Stage 3: Transform
```

### Pattern 2: Transform Composition (Matrix Chain)

**What:** Transforms composed via matrix multiplication, allowing arbitrary transform chains.
**When to use:** Complex SVG with multiple transforms, especially nested groups.
**Trade-offs:** Mathematically correct; requires matrix library or manual implementation.

**Example:**
```typescript
// Correct rotate around center point
function applyTransformWithCenter(x, y, deg, cx, cy) {
  // 1. Translate center to origin
  const t1 = translate(-cx, -cy)
  // 2. Rotate
  const r = rotate(deg)
  // 3. Translate back
  const t2 = translate(cx, cy)
  // Combined: T2 * R * T1
  return compose(compose(t1, r), t2)(x, y)
}
```

### Pattern 3: Per-Element-Type Handler (Strategy Pattern)

**What:** Each element type has its own handler function, registered in a map.
**When to use:** SVG has many element types with different conversion logic.
**Trade-offs:** Easy to extend; switch statement works for small element sets.

**Example:**
```typescript
// Current implementation uses switch - acceptable for limited element types
switch (tag) {
  case 'rect': return handleRect(element)
  case 'circle': return handleCircle(element)
  // ...
}
```

## Data Flow

### Current Flow (Problematic)

```
SVG String
    ↓
[svg-parser.ts] → SvgElement tree (with raw transform strings)
    ↓
[coordinate-mapper.ts] → CoordinateMapping (transforms applied INCORRECTLY for rotate center)
    ↓
[transform-to-pptel.ts] → PPTElement[] (rotate center lost, text baseline using 0.75 estimate)
    ↓
JSON Output
```

### Corrected Flow

```
SVG String
    ↓
[svg-parser.ts] → SvgElement tree
    ↓
[coordinate-mapper.ts] → CoordinateMapping
    ├── parseTransform(transformString) → TransformResult
    ├── applyTransform(x, y, TransformResult) → [newX, newY]
    │   └── rotate around center: translate(-cx, -cy) → rotate → translate(cx, cy)
    ├── calculateBoundingBox(element) → BoundingBox
    └── scaleToCanvas(bbox, viewBox, canvas) → CanvasCoords
    ↓
[transform-to-pptel.ts] → PPTElement[]
    ├── text: baseline offset = fontSize * 1.0 (not 0.75)
    └── rotate: extract rotateDeg, rotateCX, rotateCY, pass to PPTElement.rotate
    ↓
JSON Output
```

### State Management

This is a stateless transformation pipeline - no persistent state between calls.

```
[Input: SVG String]
    ↓
[Immutable AST] → [Immutable CoordinateMapping] → [PPTElement Array]
    ↓
[Output: JSON]
```

Each stage produces new data structures; original input never mutated.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|-------------------------|
| 0-100 elements | Current architecture fine; no optimization needed |
| 100-10k elements | Consider caching parsed transforms; batch coordinate mapping |
| 10k+ elements | Parallelize element processing; stream output |

### Scaling Priorities

1. **First bottleneck:** Transform parsing regex called per-element. Cache parsed transforms.
2. **Second bottleneck:** Path bounding box calculation. Pre-compute for static SVGs.

## Anti-Patterns

### Anti-Pattern 1: Applying Transforms Incrementally (Instead of Matrix Composition)

**What people do:** Apply translate, then scale, then rotate as separate additions to coordinates.
**Why it's wrong:** Transform order matters. `translate(10,0) rotate(45)` != `rotate(45) translate(10,0)`. SVG transform order is left-to-right (outermost applied first), but coordinate calculation applies right-to-left.
**Do this instead:** Parse all transforms, compose into single matrix, apply once.

### Anti-Pattern 2: Ignoring Transform Composition Order

**What people do:** Apply transforms in attribute order without considering SVG's transform composition rules.
**Why it's wrong:** `transform="translate(10,10) rotate(45)"` means: move origin, then rotate around NEW origin. The matrix is `R * T`, not `T * R`.
**Do this instead:** Build transformation matrix in correct order: T1, T2, T3 applied to point P: `T3 * T2 * T1 * P`.

### Anti-Pattern 3: Hardcoded Text Baseline Offset

**What people do:** `top = y - fontSize * 0.75` as fixed formula.
**Why it's wrong:** 0.75 is approximate. Actual baseline offset varies by font (ranges 0.65-0.85 typically). Different fonts have different cap-height to font-size ratios.
**Do this instead:** Use proper font metrics when available, or at minimum document the approximation and make it configurable.

### Anti-Pattern 4: Scale Applied Twice

**What people do:** Apply scale in `mapCoordinates` AND again in `transformElement`.
**Why it's wrong:** Current code does `left = coords.left * scaleX` in transformElement, but coords.left already has scale applied in mapCoordinates.
**Do this instead:** Apply scale once, either in coordinate mapper OR in transformer, not both.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| fast-xml-parser | npm dependency | Parses SVG XML to JS object |
| PowerPoint JSON schema | Output format | Library output must conform |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| parser ↔ transformer | SvgParseResult | Parser outputs AST, transformer consumes it |
| mapper ↔ transformer | CoordinateMapping | Mapper outputs coords, transformer uses them for PPTElement |
| shapes ↔ transformer | path d strings | Shapes module outputs path strings, transformer embeds in PPTElement |

## Build Order Implications

The current gaps suggest these phases:

**Phase 1: Transform System Refactor**
- Extract transform parsing to `transforms/parse-transform.ts`
- Implement `transforms/apply-transform.ts` with correct matrix composition
- Fix rotate center support: `applyTransform(x, y, transform, elementBounds)`
- Update `coordinate-mapper.ts` to use new transform system

**Phase 2: Text Baseline Fix**
- Create `utils/font-metrics.ts` for configurable baseline offsets
- Update text handler to use proper baseline calculation
- Document approximation in code comments

**Phase 3: Verification & Testing**
- Add test cases for rotate with center
- Add test cases for text positioning
- Verify canvas scaling for all element types

## Sources

- [SVG Transform Specification](https://www.w3.org/TR/SVG11/coords.html#TransformAttribute)
- [SVG Path Data](https://www.w3.org/TR/SVG11/paths.html)
- [Matrix composition for 2D transforms](https://en.wikipedia.org/wiki/Transformation_matrix#Composing_and_inverting_transformations)
- [Font metrics and baseline](https://wiki.apache.org/graphics/FontMetricsAndLineHeight)

---
*Architecture research for: SVG coordinate transformation library*
*Researched: 2026-06-26*