# Architecture

**Analysis Date:** 2026-06-27

## System Overview

```
SVG Input
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Parser Layer                              │
│  `src/parser/svg-parser.ts`                                  │
│  - fast-xml-parser for XML parsing                           │
│  - Converts XML to SvgElement AST                            │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Coordinate Mapper                          │
│  `src/mapper/coordinate-mapper.ts`                           │
│  - Maps SVG geometry to bounding boxes                       │
│  - Handles transform attributes (translate/scale/rotate)     │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Transformer Layer                         │
│  `src/transformer/transform-to-pptel.ts`                     │
│  - Converts SvgElement AST to PPTElement JSON                │
│  - Shape conversion (rect, circle, ellipse → path d strings) │
│  - Color normalization, line style parsing                   │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
JSON Output { elements: PPTElement[] }
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| CLI | File I/O, directory walking, argument parsing | `src/cli.ts` |
| Parser | XML parsing, AST construction | `src/parser/svg-parser.ts` |
| Coordinate Mapper | Transform parsing, bounding box computation | `src/mapper/coordinate-mapper.ts` |
| Shape Converter | Convert primitives to SVG path d strings | `src/shapes/shape-to-path.ts` |
| Transformer | Element-by-element AST-to-PPTElement conversion | `src/transformer/transform-to-pptel.ts` |
| Type Definitions | SVG AST and PPTElement interfaces | `src/types/ast.ts`, `src/slides.ts` |
| Main API | convert() function, exports | `src/index.ts` |

## Pattern Overview

**Overall:** Pipeline (Parser → Coordinate Mapper → Transformer)

**Key Characteristics:**
- Linear transformation pipeline: SVG string → AST → Coordinate-mapped AST → PPTElement[]
- Single entry point (`convert()`) with optional CLI
- Separation between parsing, coordinate mapping, and element transformation
- Type-driven design with explicit interfaces for AST and output elements

## Layers

**Parser Layer:**
- Purpose: Parse SVG XML string into an AST
- Location: `src/parser/svg-parser.ts`
- Contains: `parseSvg()` function, `SvgElement` and `SvgParseResult` types
- Depends on: `fast-xml-parser`
- Used by: `src/transformer/transform-to-pptel.ts`

**Coordinate Mapping Layer:**
- Purpose: Compute bounding boxes and apply transform attributes
- Location: `src/mapper/coordinate-mapper.ts`
- Contains: `mapCoordinates()`, `parseTransform()`, `parseViewBox()`
- Depends on: `src/types/ast.ts`
- Used by: `src/transformer/transform-to-pptel.ts`

**Shape Conversion Layer:**
- Purpose: Convert SVG primitives (rect, circle, ellipse, polygon, line) to SVG path d strings
- Location: `src/shapes/shape-to-path.ts`
- Contains: `rectToPath()`, `circleToPath()`, `ellipseToPath()`, `polygonToPath()`, `lineToPath()`
- Depends on: None
- Used by: `src/transformer/transform-to-pptel.ts`

**Transformer Layer:**
- Purpose: Walk AST, apply coordinate mapping, convert each element to PPTElement
- Location: `src/transformer/transform-to-pptel.ts`
- Contains: `transformElement()`, `transformToPPTElement()`, `parseDashArray()`, `colorToHex()`
- Depends on: `src/parser/svg-parser.ts`, `src/mapper/coordinate-mapper.ts`, `src/shapes/shape-to-path.ts`, `src/slides.ts`, `src/types/ast.ts`
- Used by: `src/index.ts`

**Output Types Layer:**
- Purpose: Define PPTElement union type and all element subtype interfaces
- Location: `src/slides.ts`
- Contains: `PPTElement`, `PPTTextElement`, `PPTShapeElement`, `PPTImageElement`, `PPTLineElement`, etc.
- Used by: `src/transformer/transform-to-pptel.ts`

## Data Flow

### Primary Request Path

1. **Entry: `src/index.ts:convert()`** - Receives SVG string, returns `{ success, output, elementCount }`
2. **Parse: `src/parser/svg-parser.ts:parseSvg()`** - XML to AST (`src/parser/svg-parser.ts:90`)
3. **Validate** - Checks root is 'svg', width/height > 0 (`src/index.ts:20-26`)
4. **Transform: `src/transformer/transform-to-pptel.ts:transformToPPTElement()`** - AST to PPTElement[] (`src/transformer/transform-to-pptel.ts:551`)
5. **Output** - JSON.stringify `{ elements }` (`src/index.ts:30`)

### CLI Request Path

1. **Entry: `src/cli.ts`** - cac CLI parser
2. **File Read** - readFileSync or directory walk
3. **Call convert()** with SVG content
4. **Output** - stdout or file write

### Element Transformation (per element)

1. `transformToPPTElement()` calls `walk()` recursively (`src/transformer/transform-to-pptel.ts:557-572`)
2. For each element: `transformElement()` called (`src/transformer/transform-to-pptel.ts:255`)
3. `mapCoordinates()` computes bounding box (`src/mapper/coordinate-mapper.ts:113`)
4. Shape type dispatch in switch statement (`src/transformer/transform-to-pptel.ts:280-541`)
5. Primitive shapes converted via shape-to-path functions
6. Returns PPTShapeElement, PPTTextElement, PPTImageElement, or PPTLineElement

**State Management:**
- No persistent state; all state is local to function calls
- UUID generated per element via `uuid` package
- AST is immutable during transformation

## Key Abstractions

**SvgElement AST:**
- Purpose: Represents parsed SVG structure
- Examples: `src/parser/svg-parser.ts:82-88`
- Pattern: Recursive tree with `type`, `attrs`, `children`, `text`

**PPTElement Union:**
- Purpose: Output format for all possible PPT slide elements
- Examples: `src/slides.ts:664` (union type)
- Pattern: Tagged union via `type` field discriminator

**Coordinate Mapping:**
- Purpose: Abstract geometry computation from SVG element attributes + transforms
- Examples: `src/mapper/coordinate-mapper.ts:113`
- Pattern: Pure function `mapCoordinates(element, viewBox) → CoordinateMapping`

## Entry Points

**Library Entry:**
- Location: `src/index.ts`
- Triggers: Direct import of `convert()` function
- Responsibilities: Orchestrate parse → transform pipeline, validation, JSON output

**CLI Entry:**
- Location: `src/cli.ts`
- Triggers: Command line `svg2pptel <input> [-o <output>] [-r]`
- Responsibilities: File I/O, directory walking, argument parsing via cac

## Architectural Constraints

- **Threading:** Single-threaded Node.js process
- **Global state:** None detected - all module-level state is constants (e.g., `namedColors`, `ShapePathFormulasKeys`)
- **Circular imports:** None detected
- **Transform support:** Limited to translate, scale, rotate; matrix marked as `special: true` with raw string preserved
- **No caching:** Each conversion is independent; no memoization

## Anti-Patterns

### Duplicate parseViewBox

**What happens:** `parseViewBox()` exists in both `src/parser/svg-parser.ts:40` and `src/mapper/coordinate-mapper.ts:8`
**Why it's wrong:** Code duplication; inconsistent fallback defaults (parser uses `[0, 0, 1280, 720]`)
**Do this instead:** Consolidate into one location, e.g., `src/types/ast.ts` or `src/mapper/coordinate-mapper.ts`; export from there

### Color Conversion Duplication

**What happens:** `colorToHex()` in `src/transformer/transform-to-pptel.ts:190` handles named colors, rgb(), and hex; `namedColors` map is large and inline
**Why it's wrong:** Large constant object in transformation module; color parsing could be extracted to a utility
**Do this instead:** Move color utilities to `src/utils/color.ts` or similar

## Error Handling

**Strategy:** Try-catch with typed error results

**Patterns:**
- `ConvertResult` interface: `{ success: boolean; output?: string; error?: string; elementCount?: number }` (`src/index.ts:9-14`)
- Parser errors thrown and caught at top level (`src/index.ts:33-34`)
- CLI errors printed with `picocolors` and exit codes

## Cross-Cutting Concerns

**Logging:** Console output via `picocolors` for CLI; silent for library usage
**Validation:** Basic SVG validation (root element, dimensions) in `convert()`
**Authentication:** Not applicable

---

*Architecture analysis: 2026-06-27*