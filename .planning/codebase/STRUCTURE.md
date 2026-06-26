<!-- refreshed: 2026-06-26 -->
# Codebase Structure

**Analysis Date:** 2026-06-26

## Directory Layout

```
E:/git/svg2json/
├── src/
│   ├── cli.ts                    # CLI entry point
│   ├── index.ts                  # Main library export and convert()
│   ├── slides.ts                # PPTElement union type definitions
│   ├── parser/
│   │   └── svg-parser.ts         # XML → SvgAST
│   ├── transformer/
│   │   └── transform-to-pptel.ts # SvgAST → PPTElement[]
│   ├── types/
│   │   └── ast.ts                # SvgAST, SvgElement, CoordinateMapping types
│   ├── mapper/
│   │   └── coordinate-mapper.ts  # Coordinate extraction with transform support
│   ├── shapes/
│   │   └── shape-to-path.ts      # Shape → SVG path d string
│   └── scripts/
│       ├── validate-all.ts       # Validation script
│       └── round-trip-test.ts     # Round-trip testing
├── .planning/
│   └── codebase/                 # GSD planning documents
├── vitest.config.ts              # Test configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Package manifest
```

## Directory Purposes

**src/**
- Purpose: All TypeScript source code
- Contains: Library code, CLI, types, parsers, transformers

**src/parser/**
- Purpose: SVG parsing stage
- Contains: `svg-parser.ts` - XML to SvgAST conversion

**src/transformer/**
- Purpose: AST transformation stage
- Contains: `transform-to-pptel.ts` - SvgAST to PPTElement[]

**src/types/**
- Purpose: Type definitions
- Contains: `ast.ts` - SvgAST and related types

**src/mapper/**
- Purpose: Coordinate calculation
- Contains: `coordinate-mapper.ts` - Geometry extraction with transforms

**src/shapes/**
- Purpose: Shape conversion utilities
- Contains: `shape-to-path.ts` - Basic shapes to path d strings

**src/scripts/**
- Purpose: Utility scripts
- Contains: `validate-all.ts`, `round-trip-test.ts`

**.planning/codebase/**
- Purpose: GSD planning documents output
- Contains: ARCHITECTURE.md, STRUCTURE.md, STACK.md, etc.

## Key File Locations

**Entry Points:**
- `src/cli.ts`: CLI binary entry (svg2pptel command)
- `src/index.ts`: Library entry (convert() function)

**Configuration:**
- `package.json`: Dependencies, scripts, bin entry
- `tsconfig.json`: TypeScript compiler options
- `vitest.config.ts`: Test runner configuration

**Core Logic:**
- `src/parser/svg-parser.ts`: SVG string → SvgAST
- `src/transformer/transform-to-pptel.ts`: SvgAST → PPTElement[]
- `src/mapper/coordinate-mapper.ts`: Geometry extraction
- `src/shapes/shape-to-path.ts`: Shape conversion

**Type Definitions:**
- `src/types/ast.ts`: SvgAST, SvgElement, CoordinateMapping, TransformResult
- `src/slides.ts`: PPTElement union and all element type interfaces

## File Purposes

**src/cli.ts (128 lines)**
- CLI entry point using `cac` library
- Handles file/directory input, recursive directory walking
- Supports `--ast` mode to output AST instead of PPTElement
- Supports `-o/--output` for file output
- Async `main()` function with error handling

**src/index.ts (45 lines)**
- Main library export
- `convert(svgContent, options?)` function - validates and orchestrates pipeline
- `ConvertOptions` interface (astMode, targetCanvas)
- `ConvertResult` interface (success, output, error, elementCount)
- Re-exports parser, transformer, and PPTElement types

**src/slides.ts (801 lines)**
- PPTElement union type definition (line 664)
- All element type interfaces: PPTTextElement, PPTImageElement, PPTShapeElement, PPTLineElement, PPTChartElement, PPTTableElement, PPTLatexElement, PPTVideoElement, PPTAudioElement
- Supporting types: PPTElementShadow, PPTElementOutline, PPTElementLink, Slide, SlideTheme, etc.
- ShapePathFormulasKeys and ElementTypes enums

**src/parser/svg-parser.ts (166 lines)**
- `parseSvg(xmlString)` - Main parser using fast-xml-parser
- `parseViewBox(viewBoxStr)` - Parse viewBox attribute to tuple
- `convertToSvgElement(node, parentTag)` - Recursive element tree builder
- `flattenElements(element)` - Flatten AST to array (utility)
- Text extraction logic for tspan elements
- Handles namespace-prefixed attributes (xlink:href)

**src/transformer/transform-to-pptel.ts (577 lines)**
- `transformToPPTElement(ast, targetCanvas?)` - Main transformer, walks AST
- `transformElement(element, viewBox, index, targetCanvas)` - Per-element conversion
- `parseDashArray(dash)` - Convert stroke-dasharray to LineStyleType
- `colorToHex(color)` - CSS color string to hex conversion with named colors map
- `decodeHtmlEntities(str)` - HTML entity decoding
- `parsePointsString(pointsStr)` - Parse polygon/polyline points
- Handles: rect, circle, ellipse, path, polygon, polyline, line, text, image, g (groups skipped)

**src/types/ast.ts (63 lines)**
- `SvgAttrs` interface - SVG attribute key-value pairs
- `SvgElement` interface - Single SVG node
- `SvgAST` interface - Complete parsed SVG
- `CoordinateMapping` interface - Geometry result
- `TransformResult` interface - Parsed transform components

**src/mapper/coordinate-mapper.ts (218 lines)**
- `mapCoordinates(element, viewBox)` - Main coordinate extraction
- `parseTransform(transform)` - Parse transform attribute (translate/scale/rotate)
- `parseViewBox(viewBoxStr)` - ViewBox string parsing
- `extractNumber(value, fallback)` - Numeric value extraction
- `pathBoundingBox(d)` - Compute bounding box from path M/L/H/V commands
- Applies transforms before geometry extraction (per D-04)

**src/shapes/shape-to-path.ts (32 lines)**
- `rectToPath(x, y, w, h)` - Rectangle to path
- `circleToPath(cx, cy, r)` - Circle to path
- `ellipseToPath(cx, cy, rx, ry)` - Ellipse to path
- `lineToPath(x1, y1, x2, y2)` - Line to path
- `polygonToPath(points)` - Polygon to path (closed with Z)
- Paths are relative to element origin (0,0), not SVG canvas

**src/scripts/validate-all.ts**
- Validation script (not read in detail)

**src/scripts/round-trip-test.ts**
- Round-trip testing script (not read in detail)

## Naming Conventions

**Files:**
- camelCase: `svg-parser.ts`, `transform-to-pptel.ts`, `coordinate-mapper.ts`, `shape-to-path.ts`
- kebab-case: N/A
- PascalCase: N/A

**Functions:**
- camelCase: `parseSvg`, `transformToPPTElement`, `mapCoordinates`, `rectToPath`
- Uppercase abbreviations preserved: `colorToHex` (not `colorTohex`)

**Types/Interfaces:**
- PascalCase: `SvgAST`, `SvgElement`, `PPTElement`, `CoordinateMapping`
- Enum members: PascalCase: `ShapePathFormulasKeys.ROUND_RECT`

**Directories:**
- kebab-case: `parser/`, `transformer/`, `types/`, `mapper/`, `shapes/`, `scripts/`

## Where to Add New Code

**New SVG Element Type:**
- Primary: Add case in `src/transformer/transform-to-pptel.ts:transformElement()` switch statement
- Coordinate logic if needed: `src/mapper/coordinate-mapper.ts`
- Test file: Add test case in existing test files

**New Shape Converter:**
- Implementation: `src/shapes/shape-to-path.ts`
- Export from `src/transformer/transform-to-pptel.ts` imports

**New Transformation Utility:**
- If color-related: Consider adding to `src/transformer/transform-to-pptel.ts` utilities section
- If coordinate-related: Add to `src/mapper/coordinate-mapper.ts`

**New PPTElement Type:**
- Definition: `src/slides.ts` - Add interface and extend PPTElement union
- Transformer: Add corresponding transform case in `src/transformer/transform-to-pptel.ts`

**New CLI Option:**
- Add to CAC command in `src/cli.ts`

## Special Directories

**src/parser/**
- Purpose: SVG parsing stage
- Generated: No
- Committed: Yes

**src/transformer/**
- Purpose: AST transformation stage
- Generated: No
- Committed: Yes

**src/scripts/**
- Purpose: Development/testing utilities
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-06-26*
