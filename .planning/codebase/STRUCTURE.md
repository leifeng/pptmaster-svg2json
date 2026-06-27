# Codebase Structure

**Analysis Date:** 2026-06-27

## Directory Layout

```
E:/git/svg2json/
├── src/
│   ├── cli.ts                    # CLI entry point
│   ├── index.ts                  # Library API entry point
│   ├── slides.ts                 # PPTElement type definitions
│   ├── vitest.config.ts          # Test configuration
│   ├── coordinate-mapper.ts      # (duplicate, use mapper/)
│   ├── parser/
│   │   └── svg-parser.ts         # XML parsing to AST
│   ├── mapper/
│   │   └── coordinate-mapper.ts  # Coordinate transform mapping
│   ├── shapes/
│   │   └── shape-to-path.ts      # Shape primitive to path conversion
│   ├── transformer/
│   │   └── transform-to-pptel.ts # AST to PPTElement transformation
│   ├── types/
│   │   └── ast.ts                # SVG AST type definitions
│   └── scripts/
│       ├── round-trip-test.ts    # Development script
│       └── validate-all.ts       # Development script
├── dist/                         # Compiled output (generated)
├── __tests__/                    # Test files (inferred from vitest config)
├── .planning/                    # Planning documents
├── package.json                  # Project manifest
├── tsconfig.json                 # TypeScript configuration
├── vitest.config.ts              # Root vitest config
└── README.md                     # Project documentation
```

## Directory Purposes

**src/:**
- Purpose: All TypeScript source code
- Contains: Entry points, parser, mapper, shapes, transformer, types
- Key files: `index.ts`, `cli.ts`, `slides.ts`

**src/parser/:**
- Purpose: SVG XML parsing
- Contains: `svg-parser.ts`
- Key files: `svg-parser.ts`

**src/mapper/:**
- Purpose: Coordinate transformation and bounding box calculation
- Contains: `coordinate-mapper.ts`
- Key files: `coordinate-mapper.ts`

**src/shapes/:**
- Purpose: Convert SVG primitives to SVG path d strings
- Contains: `shape-to-path.ts`
- Key files: `shape-to-path.ts`

**src/transformer/:**
- Purpose: Convert SVG AST to PPTElement JSON array
- Contains: `transform-to-pptel.ts`
- Key files: `transform-to-pptel.ts`

**src/types/:**
- Purpose: TypeScript type definitions for SVG AST
- Contains: `ast.ts`
- Key files: `ast.ts`

**dist/:**
- Purpose: Compiled JavaScript output from TypeScript compilation
- Contains: Transpiled `.js`, `.d.ts`, `.js.map` files
- Generated: Yes
- Committed: Yes

**__tests__/:**
- Purpose: Test files location (referenced in vitest config)
- Contains: Test files matching `__tests__/**/*.test.ts`

**src/scripts/:**
- Purpose: Development/helper scripts
- Contains: `round-trip-test.ts`, `validate-all.ts`
- Not included in TypeScript compilation (excluded in tsconfig.json)

## Key File Locations

**Entry Points:**
- `src/index.ts`: Library entry - `convert()` function, exports
- `src/cli.ts`: CLI entry - cac-based command line interface

**Configuration:**
- `tsconfig.json`: TypeScript compilation settings
- `vitest.config.ts`: Test runner configuration
- `package.json`: Dependencies, scripts, bin entry

**Core Logic:**
- `src/parser/svg-parser.ts`: XML to AST
- `src/mapper/coordinate-mapper.ts`: Coordinate/bounding box mapping
- `src/shapes/shape-to-path.ts`: Shape to path conversion
- `src/transformer/transform-to-pptel.ts`: AST to PPTElement

**Type Definitions:**
- `src/types/ast.ts`: SVG AST types (`SvgElement`, `SvgParseResult`, `CoordinateMapping`, `TransformResult`)
- `src/slides.ts`: PPTElement types (`PPTTextElement`, `PPTShapeElement`, `PPTImageElement`, `PPTLineElement`, etc.)

## Naming Conventions

**Files:**
- kebab-case: `svg-parser.ts`, `shape-to-path.ts`, `transform-to-pptel.ts`, `coordinate-mapper.ts`
- PascalCase: `index.ts`, `cli.ts`, `slides.ts`, `ast.ts`

**Directories:**
- kebab-case: `parser/`, `mapper/`, `shapes/`, `transformer/`, `types/`

**Types:**
- PascalCase: `SvgElement`, `PPTElement`, `CoordinateMapping`, `TransformResult`
- Suffix pattern: `Element` for element types, `Result` for output types, `Mapping` for computed geometry

**Functions:**
- camelCase: `parseSvg`, `mapCoordinates`, `transformToPPTElement`, `colorToHex`, `parseDashArray`

## Where to Add New Code

**New Element Type (e.g., chart, table):**
- Add type to `src/slides.ts` (extend PPTElement union)
- Add case to `transformElement()` switch in `src/transformer/transform-to-pptel.ts`

**New SVG Shape Support:**
- Add conversion function to `src/shapes/shape-to-path.ts`
- Add case to `transformElement()` switch in `src/transformer/transform-to-pptel.ts`

**New Transformation/Coordinate Feature:**
- Add to `src/mapper/coordinate-mapper.ts`
- Or consolidate into `src/mapper/coordinate-mapper.ts` if duplicate with `src/coordinate-mapper.ts`

**Parser Changes:**
- Modify `src/parser/svg-parser.ts`
- May need to update `SvgElement` type in `src/types/ast.ts`

**Utilities:**
- Shared utilities: Not currently organized; consider `src/utils/` if adding more

**Tests:**
- Location: `__tests__/` directory (as per vitest config: `include: ['__tests__/**/*.test.ts']`)
- Pattern: `*.test.ts` suffix

## Special Directories

**dist/:**
- Purpose: Compiled output from `npm run build`
- Generated: Yes (by `tsc`)
- Committed: Yes (in git)

**src/scripts/:**
- Purpose: Development helper scripts not part of main build
- Generated: No
- Committed: Yes
- Excluded from TypeScript compilation via `tsconfig.json` exclude

**src/coordinate-mapper.ts (root):**
- Purpose: Appears to be duplicate of `src/mapper/coordinate-mapper.ts`
- Issue: File exists at both `src/coordinate-mapper.ts` and `src/mapper/coordinate-mapper.ts`
- Both included in `tsconfig.json` include array

---

*Structure analysis: 2026-06-27*