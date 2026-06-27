<!-- refreshed: 2026-06-27 -->
# Architecture

**Analysis Date:** 2026-06-27

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      Public Entry Layer                      │
├──────────────────────────────┬──────────────────────────────┤
│   Library API                │   CLI                         │
│   `src/index.ts`             │   `src/cli.ts`                │
└──────────────┬───────────────┴──────────────┬───────────────┘
               │                              │
               └──────────────┬───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SVG Parser Layer                          │
│                    `src/parser/svg-parser.ts`                │
│      XML string → `SvgParseResult` / `SvgElement` tree        │
└─────────────────────────────┬───────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  PPTElement Transformer Layer                │
│                  `src/transformer/transform-to-pptel.ts`     │
├──────────────────────────────┬──────────────────────────────┤
│ Coordinate mapper            │ Shape path helpers            │
│ `src/mapper/coordinate-mapper.ts` │ `src/shapes/shape-to-path.ts` │
└──────────────────────────────┴───────────────┬──────────────┘
                                               ▼
┌─────────────────────────────────────────────────────────────┐
│  JSON Output                                                 │
│  `{ elements: PPTElement[] }` with types in `src/slides.ts`  │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Library API | Orchestrates parse → validate → transform → JSON serialization for callers importing the package. | `src/index.ts` |
| CLI | Parses `svg2pptel` arguments, reads SVG files/directories, calls `convert()`, writes stdout or output files. | `src/cli.ts` |
| SVG Parser | Uses `fast-xml-parser` to parse XML, normalize attributes, build recursive `SvgElement` children, and extract `viewBox`, `width`, and `height`. | `src/parser/svg-parser.ts` |
| AST Types | Defines SVG AST, coordinate mapping, and transform parse result interfaces shared by parser, mapper, and transformer. | `src/types/ast.ts` |
| Coordinate Mapper | Computes per-element `left`, `top`, `width`, and `height`; parses translate/scale/rotate/matrix transform attributes. | `src/mapper/coordinate-mapper.ts` |
| Shape Converter | Converts SVG primitives to SVG path `d` strings for PPT shape output. | `src/shapes/shape-to-path.ts` |
| PPTElement Transformer | Walks the parsed SVG tree, dispatches by SVG tag, normalizes colors/line styles/text/image fields, and creates `PPTElement` objects. | `src/transformer/transform-to-pptel.ts` |
| PPTElement Schema | Defines the target PowerPoint JSON union (`PPTTextElement`, `PPTShapeElement`, `PPTLineElement`, `PPTImageElement`, etc.). | `src/slides.ts` |
| Validation Scripts | Batch process SVG examples and round-trip JSON validation for development workflows. | `src/scripts/validate-all.ts`, `src/scripts/round-trip-test.ts` |
| Build/Test Config | Compiles TypeScript to `dist/`; configures Vitest for Node tests under `__tests__/**/*.test.ts`. | `tsconfig.json`, `vitest.config.ts`, `src/vitest.config.ts` |

## Pattern Overview

**Overall:** Stateless transformation pipeline with per-element strategy dispatch.

**Key Characteristics:**
- Use `src/index.ts` as the public library orchestration layer; it keeps parsing and transformation details behind `convert()`.
- Keep the pipeline order as SVG string → `SvgParseResult` → `PPTElement[]` → JSON string.
- Use recursive tree traversal for parsed SVG elements in `src/transformer/transform-to-pptel.ts`.
- Use discriminated output objects through the `type` field in interfaces from `src/slides.ts`.
- Keep geometry and path responsibilities separate: coordinate boxes live in `src/mapper/coordinate-mapper.ts`; primitive path construction lives in `src/shapes/shape-to-path.ts`.

## Layers

**Public API Layer:**
- Purpose: Expose library and CLI usage without leaking implementation internals.
- Location: `src/index.ts`, `src/cli.ts`
- Contains: `convert()`, `ConvertOptions`, `ConvertResult`, CLI command definitions and file processing helpers.
- Depends on: `src/parser/svg-parser.ts`, `src/transformer/transform-to-pptel.ts`, Node `fs`/`path`, `cac`, `picocolors`.
- Used by: Package consumers through `src/index.ts`; terminal users through `src/cli.ts` and the `bin` mapping in `package.json`.

**Parser Layer:**
- Purpose: Convert raw SVG XML into a normalized in-memory SVG tree.
- Location: `src/parser/svg-parser.ts`
- Contains: `parseSvg()`, parser-local `parseViewBox()`, `flattenElements()`, `convertToSvgElement()`, text extraction helpers.
- Depends on: `fast-xml-parser`, `src/types/ast.ts`.
- Used by: `src/index.ts`, `src/scripts/round-trip-test.ts`, and indirectly by all conversion flows.

**Coordinate Mapping Layer:**
- Purpose: Convert SVG attributes and transform strings into a bounding box for downstream PPT elements.
- Location: `src/mapper/coordinate-mapper.ts`
- Contains: `mapCoordinates()`, `parseTransform()`, `extractNumber()`, `parseViewBox()`, path bounding box helper.
- Depends on: `src/types/ast.ts`.
- Used by: `src/transformer/transform-to-pptel.ts`.

**Shape Conversion Layer:**
- Purpose: Convert non-path SVG geometry to SVG path syntax so PPT shapes can use a common path representation.
- Location: `src/shapes/shape-to-path.ts`
- Contains: `rectToPath()`, `circleToPath()`, `ellipseToPath()`, `lineToPath()`, `polygonToPath()`.
- Depends on: No internal modules.
- Used by: `src/transformer/transform-to-pptel.ts`.

**Transformer Layer:**
- Purpose: Convert parsed SVG elements into target `PPTElement` objects.
- Location: `src/transformer/transform-to-pptel.ts`
- Contains: `transformToPPTElement()`, `transformElement()`, `parseDashArray()`, `colorToHex()`, text extraction and point parsing helpers.
- Depends on: `uuid`, `src/types/ast.ts`, `src/mapper/coordinate-mapper.ts`, `src/shapes/shape-to-path.ts`, `src/slides.ts`.
- Used by: `src/index.ts`, `src/scripts/round-trip-test.ts`.

**Schema/Types Layer:**
- Purpose: Define source and output contracts used by all stages.
- Location: `src/types/ast.ts`, `src/slides.ts`
- Contains: `SvgAttrs`, `SvgElement`, `SvgParseResult`, `CoordinateMapping`, `TransformResult`, and the `PPTElement` union.
- Depends on: No runtime dependencies.
- Used by: All TypeScript source files that need structured input/output types.

**Development Scripts Layer:**
- Purpose: Validate conversion over example directories and confirm JSON round-trip output shape.
- Location: `src/scripts/validate-all.ts`, `src/scripts/round-trip-test.ts`
- Contains: Directory walking helpers, example discovery, validation report objects, JSON summary output.
- Depends on: `src/index.ts`, `src/parser/svg-parser.ts`, `src/transformer/transform-to-pptel.ts`, Node `fs`/`path`, `picocolors`.
- Used by: Manual development workflows; excluded from `tsconfig.json` compilation.

## Data Flow

### Primary Library Request Path

1. Caller invokes `convert(svgContent, options?)` (`src/index.ts:15`).
2. `convert()` parses SVG XML with `parseSvg(svgContent)` (`src/index.ts:17`, `src/parser/svg-parser.ts:89`).
3. `convert()` validates that the parsed root exists, has type `svg`, and has positive dimensions (`src/index.ts:18-25`).
4. `convert()` calls `transformToPPTElement(ast, options?.targetCanvas)` (`src/index.ts:26`, `src/transformer/transform-to-pptel.ts:550`).
5. `transformToPPTElement()` recursively walks `ast.root` and each child (`src/transformer/transform-to-pptel.ts:556-573`).
6. For each renderable element, `transformElement()` computes coordinates through `mapCoordinates(element, viewBox)` (`src/transformer/transform-to-pptel.ts:254-262`, `src/mapper/coordinate-mapper.ts:112`).
7. `transformElement()` dispatches on SVG tag to produce `PPTShapeElement`, `PPTTextElement`, `PPTLineElement`, or `PPTImageElement` (`src/transformer/transform-to-pptel.ts:279-540`).
8. `convert()` serializes `{ elements }` with two-space formatting and returns `ConvertResult` (`src/index.ts:27-34`).

### CLI Request Path

1. The `svg2pptel` binary resolves to `./dist/src/cli.js` through `package.json`.
2. `src/cli.ts` creates a `cac('svg2pptel')` parser and accepts `<input>`, `--output`, and `--recursive` (`src/cli.ts:6-16`).
3. Single-file mode reads SVG content and calls `convert()` through `processFile()` (`src/cli.ts:55-63`, `src/cli.ts:103-117`).
4. Directory mode discovers `.svg` files via `walkDir()` and converts each file sequentially (`src/cli.ts:34-53`, `src/cli.ts:72-102`).
5. Successful single-file conversions write to `options.output` or stdout; conversion errors go to stderr with non-zero exit for single files (`src/cli.ts:105-116`).
6. Directory mode reports per-file errors and exits `0` even on partial failures (`src/cli.ts:84-102`).

### Parser Flow

1. `parseSvg()` instantiates `XMLParser` with attributes enabled, `@_` attribute prefixing, numeric attribute parsing, tag value parsing, and fixed array handling for supported SVG child tags (`src/parser/svg-parser.ts:90-113`).
2. Parsed XML is normalized to an SVG root from `result.svg`, `result['svg:svg']`, or `result` (`src/parser/svg-parser.ts:115-120`).
3. Root attributes become `SvgAttrs`, including namespace-aware `xlink:href` handling (`src/parser/svg-parser.ts:132-140`).
4. `width` and `height` are derived from root attributes or the parsed viewBox (`src/parser/svg-parser.ts:141-144`).
5. `convertToSvgElement()` recursively extracts known child tags into `SvgElement.children` (`src/parser/svg-parser.ts:46-87`).

### Element Transformation Flow

1. `transformElement()` lowercases the source SVG tag and generates a new UUID for every output element (`src/transformer/transform-to-pptel.ts:260-262`).
2. Coordinate boxes from `mapCoordinates()` are scaled to the target canvas, defaulting to `[1000, 562.5]` (`src/transformer/transform-to-pptel.ts:254-272`).
3. Non-renderable tags such as `defs`, `linearGradient`, `stop`, `filter`, `marker`, and `clippath` return `null` (`src/transformer/transform-to-pptel.ts:274-277`).
4. Primitive shapes (`rect`, `circle`, `ellipse`, `polygon`, `polyline`) become `PPTShapeElement` records with path data (`src/transformer/transform-to-pptel.ts:279-457`).
5. Raw SVG `path` elements preserve their `d` attribute as output path data (`src/transformer/transform-to-pptel.ts:373-399`).
6. SVG `line` elements become `PPTLineElement` records with scaled `start` and `end` points (`src/transformer/transform-to-pptel.ts:459-477`).
7. SVG `text` and nested `tspan` content become a rich text HTML string in a `PPTTextElement` (`src/transformer/transform-to-pptel.ts:479-514`).
8. SVG `image` elements use `xlink:href` or `href` as `src` in a `PPTImageElement` (`src/transformer/transform-to-pptel.ts:516-531`).

### Validation Script Flow

1. `src/scripts/validate-all.ts` discovers `examples/*/svg_output/` directories, recursively converts SVG files, and returns a `ValidationReport`.
2. `src/scripts/round-trip-test.ts` parses SVG → transforms to `PPTElement[]` → JSON stringifies → JSON parses → checks common `PPTElement` fields.
3. Both scripts use `process.exit(0)` for fatal script-level errors, so use their JSON summaries and stderr output rather than exit code alone.

**State Management:**
- Conversion state is local to each function invocation; no persistent cache or service container exists.
- `src/transformer/transform-to-pptel.ts` stores output elements in a local array during recursive traversal.
- Module-level data is constant-like, such as `namedColors` in `src/transformer/transform-to-pptel.ts` and enum/type definitions in `src/slides.ts`.
- UUIDs are generated per transformed element through `uuid` in `src/transformer/transform-to-pptel.ts`.

## Key Abstractions

**`SvgElement`:**
- Purpose: Normalized SVG node with tag type, attributes, children, and optional text.
- Examples: `src/types/ast.ts:30-35`, constructed in `src/parser/svg-parser.ts:81-86`.
- Pattern: Recursive tree node; child nodes are always an array.

**`SvgParseResult`:**
- Purpose: Root parse output passed from parser to transformer.
- Examples: `src/types/ast.ts:37-43`, returned from `src/parser/svg-parser.ts:150-155`.
- Pattern: Root element plus global geometry metadata (`viewBox`, `width`, `height`).

**`CoordinateMapping`:**
- Purpose: Element box after direct attributes and supported transforms are interpreted.
- Examples: `src/types/ast.ts:45-50`, returned by `src/mapper/coordinate-mapper.ts:215`.
- Pattern: Plain object with `left`, `top`, `width`, `height`.

**`TransformResult`:**
- Purpose: Parsed representation of SVG `transform` attributes.
- Examples: `src/types/ast.ts:52-62`, produced by `src/mapper/coordinate-mapper.ts:32-65`.
- Pattern: Optional fields for translate, scale, rotate, and unsupported/special matrix metadata.

**`PPTElement`:**
- Purpose: Target output union consumed by downstream PowerPoint JSON tooling.
- Examples: `src/slides.ts:663`, produced in `src/transformer/transform-to-pptel.ts`.
- Pattern: Discriminated union by `type` (`text`, `image`, `shape`, `line`, `chart`, `table`, `latex`, `video`, `audio`).

**`ConvertResult`:**
- Purpose: Top-level API result that avoids throwing to normal callers.
- Examples: `src/index.ts:8-13`.
- Pattern: Success flag plus optional `output`, `error`, and `elementCount` fields.

## Entry Points

**Library Entry:**
- Location: `src/index.ts`
- Triggers: Package import, direct TypeScript import, or compiled `dist/src/index.js` use.
- Responsibilities: Validate parsed SVG, call transformer, stringify output, re-export parser/transformer and `PPTElement` type.

**CLI Entry:**
- Location: `src/cli.ts`
- Triggers: `svg2pptel <input>` binary from `package.json` after build.
- Responsibilities: Argument parsing, file/directory detection, recursive SVG discovery, result printing, error presentation.

**Parser Entry:**
- Location: `src/parser/svg-parser.ts`
- Triggers: `parseSvg(svgContent)` from `src/index.ts` and `src/scripts/round-trip-test.ts`.
- Responsibilities: XML parsing, viewBox parsing, attribute normalization, element tree construction.

**Transformer Entry:**
- Location: `src/transformer/transform-to-pptel.ts`
- Triggers: `transformToPPTElement(ast, targetCanvas?)` from `src/index.ts` or validation scripts.
- Responsibilities: Recursive element walk, coordinate mapping, tag-specific conversion, output array creation.

**Development Script Entries:**
- Location: `src/scripts/validate-all.ts`, `src/scripts/round-trip-test.ts`
- Triggers: Manual Node/tsx execution; README references validation commands for example SVG batches.
- Responsibilities: Batch conversion, report generation, round-trip shape validation.

## Architectural Constraints

- **Threading:** Use a single-threaded Node.js execution model; conversions are synchronous except for async wrapper functions around file/API flows in `src/index.ts` and `src/cli.ts`.
- **Module system:** Compile TypeScript to CommonJS according to `tsconfig.json`.
- **Global state:** Avoid mutable module-level state; existing module-level objects are constants such as `namedColors` in `src/transformer/transform-to-pptel.ts`.
- **Circular imports:** No circular import chain detected in the read source files; dependencies flow from entrypoints to parser/transformer/mapper/types.
- **Supported SVG tags:** Parser only enumerates `rect`, `circle`, `ellipse`, `path`, `polygon`, `polyline`, `line`, `text`, `tspan`, `image`, `g`, `defs`, `linearGradient`, and `stop` in `src/parser/svg-parser.ts`.
- **Transform support:** `src/mapper/coordinate-mapper.ts` parses translate, scale, rotate, and matrix markers, but `mapCoordinates()` applies only translate and scale to most boxes; matrix data is not applied.
- **Output scope:** `src/transformer/transform-to-pptel.ts` emits `shape`, `text`, `line`, and `image` elements; broader `PPTElement` types in `src/slides.ts` are schema definitions, not active SVG conversion targets.
- **Build inclusion:** `tsconfig.json` includes `src/types/**/*`, `src/parser/**/*`, `src/shapes/**/*`, `src/mapper/**/*`, and `src/*.ts`, and excludes `src/scripts`.
- **Testing location:** `vitest.config.ts` and `src/vitest.config.ts` both target `__tests__/**/*.test.ts`; no `__tests__/` directory is present in the explored tree.

## Anti-Patterns

### Duplicate Coordinate Mapper Module

**What happens:** `src/coordinate-mapper.ts` duplicates the implementation in `src/mapper/coordinate-mapper.ts`.
**Why it's wrong:** Future fixes to transform parsing or bounding box behavior can be applied to one copy and missed in the other, creating inconsistent imports.
**Do this instead:** Import coordinate logic from `src/mapper/coordinate-mapper.ts`; consolidate or delete `src/coordinate-mapper.ts` when safe.

### Duplicate `parseViewBox()` Implementations

**What happens:** `parseViewBox()` exists in both `src/parser/svg-parser.ts` and `src/mapper/coordinate-mapper.ts`.
**Why it's wrong:** Shared coordinate defaults and parsing rules can drift between parsing and mapping.
**Do this instead:** Keep one viewBox parser in a shared module such as `src/mapper/coordinate-mapper.ts` or a future `src/utils/viewbox.ts`, and import it into `src/parser/svg-parser.ts`.

### Monolithic Element Transformer

**What happens:** `src/transformer/transform-to-pptel.ts` owns color parsing, dash parsing, point parsing, text extraction, shape conversion dispatch, and every element handler in one file.
**Why it's wrong:** Adding a new SVG element type requires editing a large switch and increases risk of breaking unrelated conversions.
**Do this instead:** Keep new behavior behind small helper functions first; if this grows, extract utilities to `src/utils/` and element handlers to `src/transformer/elements/` while preserving `transformToPPTElement()` as the public transformer entry.

### Parent Group Transforms Are Not Accumulated

**What happens:** `transformToPPTElement()` skips `g` as an output element but recursively processes children without carrying parent transform state.
**Why it's wrong:** SVG child elements inside transformed groups can lose parent coordinate transforms.
**Do this instead:** Extend the traversal in `src/transformer/transform-to-pptel.ts` to pass accumulated transform context into `mapCoordinates()` in `src/mapper/coordinate-mapper.ts`.

### Generated Output Lives Beside Source

**What happens:** `dist/` is present with compiled `.js`, `.d.ts`, and source map files corresponding to `src/`.
**Why it's wrong:** Reading architecture or changing source can be confused by generated copies; accidental edits under `dist/` do not update source.
**Do this instead:** Modify source files under `src/` and regenerate `dist/` with `npm run build` only when build artifacts are intentionally updated.

## Error Handling

**Strategy:** Library calls return a structured result; CLI and scripts print human-readable errors and process exit codes.

**Patterns:**
- Use `ConvertResult` for library API success/failure instead of throwing out of `convert()` (`src/index.ts:8-34`).
- Throw parser-level errors for invalid parse states inside `parseSvg()`, then catch them in `convert()` (`src/parser/svg-parser.ts:119-126`, `src/index.ts:32-34`).
- Use defensive `try/catch` around file system operations and directory traversal in `src/cli.ts`, `src/scripts/validate-all.ts`, and `src/scripts/round-trip-test.ts`.
- Print CLI messages through `picocolors` for colorized stderr/stdout status (`src/cli.ts`, `src/scripts/validate-all.ts`, `src/scripts/round-trip-test.ts`).

## Cross-Cutting Concerns

**Logging:** Library API in `src/index.ts` is silent; CLI and scripts use `console.log()` / `console.error()` with `picocolors` in `src/cli.ts` and `src/scripts/*.ts`.

**Validation:** Basic input validation lives in `src/index.ts`; structural output validation for development lives in `src/scripts/round-trip-test.ts`.

**Authentication:** Not applicable; no authentication or identity layer exists in the source files.

**File I/O:** Keep file system access in CLI/scripts (`src/cli.ts`, `src/scripts/*.ts`); keep the core converter (`src/index.ts`, parser, mapper, transformer) string/object based.

**Identifier generation:** Use `uuid` only inside `src/transformer/transform-to-pptel.ts` for output element IDs.

---

*Architecture analysis: 2026-06-27*
