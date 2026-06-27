# Coding Conventions

**Analysis Date:** 2026-06-27

## Naming Patterns

**Files:**
- Use kebab-case for feature implementation modules under `src/`: `src/parser/svg-parser.ts`, `src/mapper/coordinate-mapper.ts`, `src/shapes/shape-to-path.ts`, `src/transformer/transform-to-pptel.ts`.
- Use short lowercase entry/type module names for root source files: `src/index.ts`, `src/cli.ts`, `src/slides.ts`, `src/types/ast.ts`.
- Put development-only scripts under `src/scripts/` with kebab-case names: `src/scripts/validate-all.ts`, `src/scripts/round-trip-test.ts`.
- Place future Vitest specs in `__tests__/**/*.test.ts`; this is the only test include pattern in `vitest.config.ts` and `src/vitest.config.ts`.

**Functions:**
- Use camelCase for exported and internal functions: `convert()` in `src/index.ts`, `parseSvg()` and `flattenElements()` in `src/parser/svg-parser.ts`, `mapCoordinates()` in `src/mapper/coordinate-mapper.ts`, `transformToPPTElement()` in `src/transformer/transform-to-pptel.ts`.
- Name parser helpers with action-oriented verbs: `parseViewBox()`, `parseTransform()`, `parseDashArray()`, `parsePointsString()`.
- Keep module-private helpers unexported unless they are part of the public API or useful for tests; examples include `convertToSvgElement()` in `src/parser/svg-parser.ts`, `pathBoundingBox()` in `src/mapper/coordinate-mapper.ts`, and `decodeHtmlEntities()` in `src/transformer/transform-to-pptel.ts`.

**Variables:**
- Use camelCase for local variables and collections: `svgRoot`, `rootAttrs`, `childTags`, `strokeWidth`, `targetCanvas`, `elementCounts`.
- Use descriptive names for file and directory paths: `projectRoot`, `examplesDir`, `svgOutputDirs`, `fullPath` in `src/scripts/validate-all.ts` and `src/scripts/round-trip-test.ts`.
- Use tuple names for geometry and points: `viewBox: [number, number, number, number]` in `src/types/ast.ts`, `targetCanvas: [number, number]` in `src/index.ts`, and `points: [number, number][]` in `src/shapes/shape-to-path.ts`.

**Types:**
- Use PascalCase for interfaces and type aliases: `SvgAttrs`, `SvgElement`, `SvgParseResult`, `CoordinateMapping`, `TransformResult` in `src/types/ast.ts`; `PPTElement`, `PPTTextElement`, `PPTShapeElement`, `PPTLineElement` in `src/slides.ts`.
- Use suffixes consistently:
  - `Result` for operation outputs: `ConvertResult` in `src/index.ts`, `ValidationResult` in `src/scripts/validate-all.ts`, `RoundTripResult` in `src/scripts/round-trip-test.ts`.
  - `Element` for PPT/SVG element shapes: `SvgElement` in `src/types/ast.ts`, `PPTImageElement` in `src/slides.ts`.
  - `Mapping` for computed geometry: `CoordinateMapping` in `src/types/ast.ts`.
- Use `type` for string unions and object aliases where inheritance is not needed: `LineStyleType` and `PPTElement` in `src/slides.ts`.
- Use `interface` for structured public object contracts: `ConvertOptions` and `ConvertResult` in `src/index.ts`, `SvgAttrs` and `SvgElement` in `src/types/ast.ts`.
- Use `const enum` with uppercase members for fixed element/type constants: `ShapePathFormulasKeys` and `ElementTypes` in `src/slides.ts`.

## Code Style

**Formatting:**
- No Prettier configuration detected: `.prettierrc*` and `prettier.config.*` are absent in `E:/git/svg2json/`.
- Use the existing TypeScript style rather than introducing a new formatter config:
  - 2-space indentation in `src/index.ts`, `src/parser/svg-parser.ts`, and `src/transformer/transform-to-pptel.ts`.
  - Single quotes for strings and imports: `import { parseSvg } from './parser/svg-parser'` in `src/index.ts`.
  - Semicolons are generally omitted in implementation files such as `src/parser/svg-parser.ts`, `src/mapper/coordinate-mapper.ts`, and `src/transformer/transform-to-pptel.ts`.
  - Trailing commas are used for multiline object literals and function parameter lists where present, e.g. `src/transformer/transform-to-pptel.ts`.
- Expect some legacy semicolons in pure type files such as `src/types/ast.ts`; when editing a file, preserve the local style of that file.

**Linting:**
- No ESLint configuration detected: `.eslintrc*` and `eslint.config.*` are absent in `E:/git/svg2json/`.
- No lint script exists in `package.json`; do not assume `npm run lint` is available.
- `npm run build` is the effective static quality gate; it runs `tsc` and currently completes successfully.

**TypeScript compiler settings:**
- `tsconfig.json` enables strict mode with `"strict": true`; all new code must use explicit, narrow types and avoid implicit `any`.
- `tsconfig.json` targets ES2022 and CommonJS with `"moduleResolution": "node"`.
- `tsconfig.json` emits declarations and source maps with `"declaration": true`, `"declarationMap": true`, and `"sourceMap": true`.
- `tsconfig.json` includes `src/types/**/*`, `src/parser/**/*`, `src/shapes/**/*`, `src/mapper/**/*`, `src/transformer/**/*`, and `src/*.ts`; `src/scripts/` and `__tests__/` are excluded from the TypeScript build.

## Import Organization

**Order:**
1. External dependencies first: `fast-xml-parser` in `src/parser/svg-parser.ts`, `uuid` in `src/transformer/transform-to-pptel.ts`, `cac` and `picocolors` in `src/cli.ts`.
2. Node built-ins next when needed: `fs` and `path` imports in `src/cli.ts`, `src/scripts/validate-all.ts`, and `src/scripts/round-trip-test.ts`.
3. Internal runtime imports after dependencies: `parseSvg` and `transformToPPTElement` in `src/index.ts`, `mapCoordinates` and shape helpers in `src/transformer/transform-to-pptel.ts`.
4. Type-only imports should use `import type` when possible: `import type { PPTElement } from './slides'` in `src/index.ts` and `import type { PPTElement } from '../slides'` in `src/scripts/round-trip-test.ts`.

**Path Aliases:**
- No path aliases are configured in `tsconfig.json`; use relative imports such as `../types/ast`, `../mapper/coordinate-mapper`, and `./parser/svg-parser`.
- Prefer imports from the canonical implementation paths:
  - `src/mapper/coordinate-mapper.ts` for coordinate mapping.
  - `src/parser/svg-parser.ts` for SVG parsing.
  - `src/transformer/transform-to-pptel.ts` for AST-to-PPTElement conversion.
- Avoid introducing imports from `dist/`; `dist/` is compiled output.

**Exports:**
- Export the public library API from `src/index.ts`: `convert()`, `parseSvg`, `transformToPPTElement`, and `PPTElement`.
- Export pure utility functions when they are useful as stable units: `rectToPath()`, `circleToPath()`, `ellipseToPath()`, `lineToPath()`, `polygonToPath()` in `src/shapes/shape-to-path.ts`; `extractNumber()`, `parseTransform()`, and `mapCoordinates()` in `src/mapper/coordinate-mapper.ts`.
- Keep helper-only functions private inside the module that uses them: `walkDir()` in `src/cli.ts`, `findSvgOutputDirs()` in `src/scripts/validate-all.ts`, and `extractTextContentFromElement()` in `src/transformer/transform-to-pptel.ts`.

## Error Handling

**Patterns:**
- Library-facing functions return result objects instead of throwing for normal conversion failures. Use the `ConvertResult` shape from `src/index.ts`:
```typescript
export interface ConvertResult {
  success: boolean;
  output?: string;
  error?: string;
  elementCount?: number;
}
```
- Wrap parser/transformer calls at API boundaries and coerce unknown errors with `String(err)`, as `convert()` does in `src/index.ts`.
- Throw `Error` only inside lower-level parsing when input is structurally invalid, as `parseSvg()` does in `src/parser/svg-parser.ts` for missing or empty SVG roots.
- CLI file processing should convert I/O exceptions into `{ success: false, error: ... }` objects, following `processFile()` in `src/cli.ts`.
- Directory walkers intentionally swallow unreadable file/directory errors and document the skip with comments, as in `walkDir()` in `src/cli.ts`, `src/scripts/validate-all.ts`, and `src/scripts/round-trip-test.ts`.
- For unsupported SVG elements, return `null` from `transformElement()` in `src/transformer/transform-to-pptel.ts`; callers should skip `null` values rather than treating them as fatal errors.

## Logging

**Framework:** `console` with `picocolors` for CLI/development scripts.

**Patterns:**
- Use `console.error()` for status, progress, warnings, and error messages so stdout remains available for JSON output. This pattern appears in `src/cli.ts`, `src/scripts/validate-all.ts`, and `src/scripts/round-trip-test.ts`.
- Use `console.log()` only for primary command output, such as converted JSON in `src/cli.ts` or validation report JSON in `src/scripts/validate-all.ts` and `src/scripts/round-trip-test.ts`.
- Color terminal messages with `picocolors`: `pc.red()` for failures, `pc.yellow()` for warnings, `pc.green()` for success, `pc.cyan()` for section/progress text, and `pc.gray()` for per-file progress.
- Library modules such as `src/index.ts`, `src/parser/svg-parser.ts`, `src/mapper/coordinate-mapper.ts`, and `src/transformer/transform-to-pptel.ts` should not log directly; return structured results or values instead.

## Comments

**When to Comment:**
- Add JSDoc for exported functions, public validation helpers, and non-obvious algorithms. Examples: `parseDashArray()` and `transformElement()` in `src/transformer/transform-to-pptel.ts`, `parseViewBox()` and `mapCoordinates()` in `src/mapper/coordinate-mapper.ts`, and `isValidPPTElement()` in `src/scripts/round-trip-test.ts`.
- Use inline comments for design constraints and edge cases that are not obvious from code. Existing comments reference requirements such as `D-03`, `D-04`, `D-05`, `D-06`, `D-07`, `D-08`, and `D-09` in `src/mapper/coordinate-mapper.ts`, `src/shapes/shape-to-path.ts`, and `src/transformer/transform-to-pptel.ts`.
- Use short comments to explain intentionally ignored exceptions in file walking code: `// skip files we can't stat`, `// skip dirs we can't read`, and `// svg_output doesn't exist`.
- Avoid comments that only restate the next line. Prefer comments that capture units, coordinate conventions, unsupported cases, or output compatibility constraints.

**JSDoc/TSDoc:**
- JSDoc is present but not enforced by tooling. Keep using `/** ... */` blocks for exported APIs and complex helpers.
- Include `@param` entries where there are multiple tuple or coordinate parameters, following `transformElement()` and `transformToPPTElement()` in `src/transformer/transform-to-pptel.ts`.
- `src/slides.ts` contains Chinese JSDoc for PPT element data structures; preserve the existing language/style when editing adjacent declarations.

## Function Design

**Size:**
- Prefer small pure functions for parsing and geometry, matching `parseViewBox()`, `extractNumber()`, `parseTransform()`, and the shape conversion helpers in `src/shapes/shape-to-path.ts`.
- Add new SVG element transformations as `switch` cases in `transformElement()` in `src/transformer/transform-to-pptel.ts`; keep per-case logic self-contained with typed result objects.
- If a new transformation case becomes large or reused, extract a private helper within `src/transformer/transform-to-pptel.ts` before exporting a new module-level API.

**Parameters:**
- Use explicit parameter types everywhere; `tsconfig.json` strict mode requires this.
- Use optional parameters for small API options: `options?: ConvertOptions` in `convert()` (`src/index.ts`).
- Use default values for common conversion settings: `targetCanvas: [number, number] = [1000, 562.5]` in `transformElement()` and `transformToPPTElement()` (`src/transformer/transform-to-pptel.ts`).
- Use `unknown` for validation inputs that need runtime type guards: `isValidPPTElement(obj: unknown)` in `src/scripts/round-trip-test.ts`.

**Return Values:**
- Return structured result objects at public boundaries: `ConvertResult` in `src/index.ts`, `ValidationReport` in `src/scripts/validate-all.ts`, and `{ valid: boolean, errors: string[] }` in `src/scripts/round-trip-test.ts`.
- Return tuples for coordinate-like parsed values: `[number, number, number, number]` from `parseViewBox()` in `src/parser/svg-parser.ts` and `src/mapper/coordinate-mapper.ts`.
- Return `null` only for intentional skip semantics inside transformation helpers, as `transformElement()` does for non-renderable SVG tags and unknown elements in `src/transformer/transform-to-pptel.ts`.
- Return empty arrays/strings as safe fallbacks for empty parse results in utility helpers, following `parsePointsString()` and `polylineToPath()` in `src/transformer/transform-to-pptel.ts` and `polygonToPath()` in `src/shapes/shape-to-path.ts`.

## Module Design

**Exports:**
- `src/index.ts` is the public API barrel and should remain small: import parser/transformer internals, expose `convert()`, and re-export public types/functions.
- `src/cli.ts` owns command-line argument parsing, filesystem traversal, process exit codes, and terminal output. Do not put core conversion logic in `src/cli.ts`; call `convert()` from `src/index.ts`.
- `src/parser/svg-parser.ts` owns XML parsing and conversion into the simplified SVG AST from `src/types/ast.ts`.
- `src/mapper/coordinate-mapper.ts` owns coordinate extraction, transform parsing, and bounding box calculation.
- `src/shapes/shape-to-path.ts` owns conversion from SVG primitive geometry to path `d` strings.
- `src/transformer/transform-to-pptel.ts` owns PPTElement construction and should import helpers from parser/mapper/shapes rather than duplicating them.
- `src/slides.ts` is a type-definition module for PPT element contracts; avoid runtime dependencies from this file.
- `src/scripts/validate-all.ts` and `src/scripts/round-trip-test.ts` are development helpers and are excluded from `tsconfig.json` compilation.

**Barrel Files:**
- `src/index.ts` is the only barrel-style public entry point.
- No directory-level `index.ts` files exist under `src/parser/`, `src/mapper/`, `src/shapes/`, `src/transformer/`, or `src/types/`; import directly from the specific file path.
- Do not create new barrel files unless several modules in the same directory need a stable public surface.

---

*Convention analysis: 2026-06-27*
