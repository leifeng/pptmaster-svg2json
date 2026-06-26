<!-- refreshed: 2026-06-26 -->
# Architecture

**Analysis Date:** 2026-06-26

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      CLI Entry (cac)                        │
│                   `src/cli.ts`                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Convert Pipeline                          │
│                    `src/index.ts`                            │
│                   convert(svgContent)                        │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                   │
▼                          ▼                                   │
┌──────────────────────────┐                                   │
│  Parser: SVG → AST       │                                   │
│  `src/parser/svg-parser.ts`                                   │
│  parseSvg() → SvgAST                                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Coordinate Mapping                                          │
│  `src/mapper/coordinate-mapper.ts`                           │
│  mapCoordinates() → CoordinateMapping                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Shape Conversion                                            │
│  `src/shapes/shape-to-path.ts`                               │
│  rectToPath, circleToPath, ellipseToPath, polygonToPath     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Transformer: AST → PPTElement                               │
│  `src/transformer/transform-to-pptel.ts`                    │
│  transformToPPTElement() → PPTElement[]                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Output: PPTElement JSON                                      │
│  { elements: PPTElement[] }                                  │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| CLI | Parse CLI args, file I/O, batch directory processing | `src/cli.ts` |
| Convert | Orchestrate pipeline, validate input | `src/index.ts` |
| Parser | XML → SvgAST using fast-xml-parser | `src/parser/svg-parser.ts` |
| CoordinateMapper | SVG geometry → left/top/width/height | `src/mapper/coordinate-mapper.ts` |
| ShapeConverter | Non-path shapes → SVG path d strings | `src/shapes/shape-to-path.ts` |
| Transformer | SvgAST → PPTElement[] with styling | `src/transformer/transform-to-pptel.ts` |
| Types/AST | SvgAST and PPTElement type definitions | `src/types/ast.ts`, `src/slides.ts` |

## Pattern Overview

**Overall:** Sequential pipeline with independent parsing/transformation stages

**Key Characteristics:**
- Single-pass transformation: SVG parsed once, walked recursively
- Shape normalization: All shapes converted to SVG path d strings
- Coordinate mapping: Transform attributes applied before geometry extraction
- Optional AST output mode: Can output intermediate AST instead of PPTElement

## Layers

**CLI Layer:**
- Purpose: File I/O, CLI argument parsing, batch processing
- Location: `src/cli.ts`
- Contains: CAC CLI instance, file walking, async main()
- Depends on: `convert()` from index
- Used by: Terminal users

**Parser Layer:**
- Purpose: Convert XML string to typed AST
- Location: `src/parser/svg-parser.ts`
- Contains: fast-xml-parser configuration, `parseSvg()`, `flattenElements()`
- Depends on: fast-xml-parser
- Used by: `convert()` in index.ts

**Transform Layer:**
- Purpose: Convert SvgAST to PPTElement JSON
- Location: `src/transformer/transform-to-pptel.ts`
- Contains: `transformToPPTElement()`, `transformElement()`, color/dash utilities
- Depends on: SvgAST, CoordinateMapping, Shape converters
- Used by: `convert()` in index.ts

**Coordinate Mapping Layer:**
- Purpose: Extract geometry from SVG elements with transform support
- Location: `src/mapper/coordinate-mapper.ts`
- Contains: `mapCoordinates()`, `parseTransform()`, `pathBoundingBox()`
- Depends on: SvgElement types
- Used by: `transform-to-pptel.ts`

**Shape Conversion Layer:**
- Purpose: Convert basic shapes to SVG path d attribute format
- Location: `src/shapes/shape-to-path.ts`
- Contains: `rectToPath()`, `circleToPath()`, `ellipseToPath()`, `polygonToPath()`, `lineToPath()`
- Depends on: None
- Used by: `transform-to-pptel.ts`

## Data Flow

### Primary Request Path

1. **CLI invocation** (`src/cli.ts:58-66`) - `processFile()` reads SVG file content
2. **Convert entry** (`src/index.ts:17-40`) - `convert()` validates and orchestrates
3. **Parse** (`src/parser/svg-parser.ts:90-157`) - `parseSvg()` returns `SvgAST`
4. **AST validation** (`src/index.ts:21-27`) - Checks for root svg element and dimensions
5. **Transform** (`src/transformer/transform-to-pptel.ts:551-576`) - `transformToPPTElement()` walks AST recursively
6. **Element transform** (`src/transformer/transform-to-pptel.ts:255-542`) - `transformElement()` converts each SVG node
7. **Coordinate mapping** (`src/mapper/coordinate-mapper.ts:113-217`) - Extracts geometry with transform applied
8. **Shape conversion** (`src/shapes/shape-to-path.ts:7-31`) - Converts shapes to path d strings
9. **Output** (`src/index.ts:32-35`) - Returns `{ success, output, elementCount }`

### Coordinate System

- **SVG viewBox coordinates** map 1:1 to PPTElement left/top/width/height (per D-08)
- **Transform attribute** parsed and applied before reading geometry attributes (per D-04)
- **Target canvas scaling** applied at transformer level (default 1000x562.5)

## Key Abstractions

**SvgAST:**
- Purpose: Intermediate representation of parsed SVG
- Examples: `src/types/ast.ts:38-43`
- Pattern: Tree structure with root SvgElement

**SvgElement:**
- Purpose: Single SVG node with type, attrs, children, text
- Examples: `src/types/ast.ts:31-36`
- Pattern: Recursive tree node

**PPTElement union:**
- Purpose: Output format union (text, shape, line, image, chart, table, latex, video, audio)
- Examples: `src/slides.ts:664`
- Pattern: Discriminated union by `type` field

**CoordinateMapping:**
- Purpose: Normalized geometry extracted from SVG element
- Examples: `src/types/ast.ts:45-50`
- Pattern: { left, top, width, height }

## Entry Points

**CLI Entry:**
- Location: `src/cli.ts`
- Triggers: Running `svg2pptel` command in terminal
- Responsibilities: Parse args, read files, call convert(), handle output

**Library Entry:**
- Location: `src/index.ts`
- Triggers: Importing and calling `convert()` from other code
- Responsibilities: Pipeline orchestration, validation, error handling

## Architectural Constraints

- **Threading:** Single-threaded Node.js, async/await for I/O
- **Global state:** None - all functions are pure/stateless
- **Circular imports:** None detected
- **Memory:** No streaming - entire SVG loaded into memory

## Anti-Patterns

### Color Parsing Duplication

**What happens:** `colorToHex()` in `src/transformer/transform-to-pptel.ts:190-205` and color-related logic elsewhere may diverge
**Why it's wrong:** Named color map duplicated or inconsistent behavior
**Do this instead:** Centralize color parsing in a dedicated utility module

## Error Handling

**Strategy:** Try-catch with typed error results

**Patterns:**
- `ConvertResult` interface (`src/index.ts:10-14`) returns `{ success, output?, error? }`
- Parser errors thrown and caught in `convert()`
- CLI displays errors with colored output using picocolors

## Cross-Cutting Concerns

**Logging:** picocolors for colored CLI output only
**Validation:** Input SVG validated for root svg element and positive dimensions
**Authentication:** Not applicable (library)

---

*Architecture analysis: 2026-06-26*
