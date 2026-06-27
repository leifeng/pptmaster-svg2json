# Codebase Concerns

**Analysis Date:** 2026-06-27

## Tech Debt

**No automated tests are present and the configured test command fails:**
- Issue: `vitest.config.ts` only includes `__tests__/**/*.test.ts`, but no matching test files are present. Running `npm test` exits with code 1 and reports `No test files found`.
- Files: `vitest.config.ts:3-12`, `package.json:12-16`
- Impact: Parser, coordinate mapping, transformer, and CLI behavior can regress without detection. The normal `npm test` quality gate is currently red even when the code builds.
- Fix approach: Add `__tests__/**/*.test.ts` coverage for `src/parser/svg-parser.ts`, `src/mapper/coordinate-mapper.ts`, `src/transformer/transform-to-pptel.ts`, and `src/index.ts`; keep `npm test` green before adding feature work.

**Generated and dependency artifacts are not protected by ignore rules:**
- Issue: No `.gitignore` file was detected, while generated/runtime directories such as `dist/` and `node_modules/` are present in the repository tree.
- Files: `dist/src/index.js`, `dist/src/transformer/transform-to-pptel.js`, `node_modules/`, `package-lock.json`
- Impact: Generated code and installed dependencies can be accidentally committed, reviewed, or packaged as source changes. Stale `dist/` output can also hide mismatches between TypeScript source and published JavaScript.
- Fix approach: Add `.gitignore` entries for `node_modules/`, build outputs, coverage reports, and temporary worktree artifacts; decide explicitly whether `dist/` is committed for package distribution and document the release flow.

**Misplaced Vitest config is compiled into distributable output:**
- Issue: Both `vitest.config.ts` and `src/vitest.config.ts` exist with the same contents. `tsconfig.json` includes `src/*.ts`, so `src/vitest.config.ts` is compiled into `dist/src/vitest.config.js`; existing `dist/vitest.config.js` artifacts are also present.
- Files: `vitest.config.ts:1-14`, `src/vitest.config.ts:1-14`, `tsconfig.json:17`, `dist/src/vitest.config.js`, `dist/vitest.config.js`
- Impact: Test configuration is shipped with the package output and can confuse maintainers about which config is authoritative.
- Fix approach: Keep only root `vitest.config.ts`; remove `src/vitest.config.ts`; clean `dist/`; narrow `tsconfig.json` includes to production source only.

**Coordinate mapper exists in two source locations:**
- Issue: `src/coordinate-mapper.ts` and `src/mapper/coordinate-mapper.ts` contain duplicate coordinate mapping logic with different import paths.
- Files: `src/coordinate-mapper.ts:1-216`, `src/mapper/coordinate-mapper.ts:1-216`, `src/transformer/transform-to-pptel.ts:2`
- Impact: Future fixes can land in one mapper while the transformer imports the other, leaving dead or divergent behavior in the package.
- Fix approach: Keep `src/mapper/coordinate-mapper.ts` as the single implementation, delete `src/coordinate-mapper.ts`, and add tests against the imported mapper path.

**CLI module has top-level side effects and an unusable exported runner:**
- Issue: `src/cli.ts` calls `cli.parse()` and starts `main()` at module load time, then exports `run()` after execution setup. Importing the CLI module parses real `process.argv` before callers can invoke `run(args)`.
- Files: `src/cli.ts:15-23`, `src/cli.ts:120-127`, `package.json:6-8`
- Impact: The CLI cannot be safely imported for tests or reuse, and the exported `run` function is effectively dead code.
- Fix approach: Move CLI execution behind an explicit entrypoint guard or separate `main(args)` function; export pure command construction for tests; keep bin wiring in `package.json` pointed at the compiled entry.

**Package metadata and lockfile disagree on the CLI bin path:**
- Issue: `package.json` declares `svg2pptel` as `./dist/src/cli.js`, while root `package-lock.json` metadata records `dist/cli.js`.
- Files: `package.json:6-8`, `package-lock.json:15-17`
- Impact: Stale lock metadata makes package installation behavior harder to audit and can mask broken CLI packaging paths during release validation.
- Fix approach: Regenerate `package-lock.json` after finalizing the bin path and add a package smoke test that runs the built `svg2pptel` binary from `dist/src/cli.js`.

**No linting or formatting gate is configured:**
- Issue: `package.json` exposes only `build`, `test`, and `test:watch`; no ESLint, Prettier, Biome, or type-aware lint script is configured.
- Files: `package.json:12-16`
- Impact: Style drift, unused helper code, unsafe `any`, and duplicated files are not caught automatically.
- Fix approach: Add a lightweight lint/format toolchain and CI scripts after stabilizing tests; include generated-output exclusions.

## Known Bugs

**Ellipse scale transforms do not scale center coordinates:**
- Symptoms: `transform="scale(...)"` on an `ellipse` scales `rx` and `ry` but leaves `cx` and `cy` unscaled before translation.
- Files: `src/mapper/coordinate-mapper.ts:151-160`, `src/coordinate-mapper.ts:151-160`
- Trigger: Convert an SVG ellipse with non-zero `cx`/`cy` and a scale transform.
- Workaround: Avoid scale transforms on ellipses or pre-flatten transforms before conversion.

**Negative, signed, exponent, and skew transforms are not parsed:**
- Symptoms: `parseTransform()` uses regexes like `/translate\(\s*([\d.]+)/`, so negative values, plus signs, exponent notation, and `skewX`/`skewY` are ignored. Multiple transform operations are matched by type rather than applied in SVG matrix order.
- Files: `src/mapper/coordinate-mapper.ts:32-64`, `src/coordinate-mapper.ts:32-64`
- Trigger: Convert SVG elements with transforms such as `translate(-10, 5)`, `scale(-1,1)`, `rotate(-45)`, `skewX(10)`, or ordered transform chains.
- Workaround: Preprocess SVGs to absolute coordinates before conversion.

**`matrix(...)` transforms are detected but not applied to output geometry:**
- Symptoms: `parseTransform()` sets `special: true` and `raw`, but `mapCoordinates()` ignores those fields and output elements do not receive `special` for transform fallback handling.
- Files: `src/mapper/coordinate-mapper.ts:58-62`, `src/mapper/coordinate-mapper.ts:119-125`, `src/transformer/transform-to-pptel.ts:288-389`
- Trigger: Convert any element using `transform="matrix(...)"`.
- Workaround: Flatten matrix transforms before conversion.

**Group transforms and group attributes are not inherited by children:**
- Symptoms: `transformToPPTElement()` skips `g` output but walks children without carrying parent transform, opacity, fill, stroke, or other inherited attributes.
- Files: `src/transformer/transform-to-pptel.ts:533-570`, `src/mapper/coordinate-mapper.ts:119-125`
- Trigger: Convert SVGs where a parent `<g>` controls position, color, opacity, or stroke for nested shapes.
- Workaround: Expand group transforms/styles into child attributes before conversion.

**Non-zero `viewBox` origins are ignored during canvas scaling:**
- Symptoms: `parseViewBox()` preserves `[minX, minY, width, height]`, but transformer scaling uses only `viewBox[2]` and `viewBox[3]`; coordinates are not offset by `viewBox[0]` / `viewBox[1]`.
- Files: `src/mapper/coordinate-mapper.ts:7-11`, `src/transformer/transform-to-pptel.ts:264-272`
- Trigger: Convert SVGs with `viewBox="100 100 800 600"` or another non-zero origin.
- Workaround: Normalize SVG coordinates to a zero-origin viewBox before conversion.

**Path bounding boxes are incorrect for common SVG commands:**
- Symptoms: `pathBoundingBox()` only scans `M`, `L`, `H`, and `V` commands. It ignores curve and arc extents (`C`, `S`, `Q`, `T`, `A`), treats lowercase relative commands as if their numeric values were absolute, and returns the full viewBox fallback when no supported command yields a box.
- Files: `src/mapper/coordinate-mapper.ts:67-105`, `src/mapper/coordinate-mapper.ts:175-185`
- Trigger: Convert paths containing curves, arcs, relative coordinates, or complex compound path data.
- Workaround: Use simple absolute line paths or precompute/attach shape bounds before conversion.

**`fill="none"` and unsupported color formats become black:**
- Symptoms: `colorToHex()` returns `#000000` for unknown strings, including `none`, `transparent`, `rgba(...)`, `hsl(...)`, CSS variables, and percentage RGB values. Most shape conversions call `colorToHex(element.attrs.fill) || '#000000'`, so `none` cannot remain transparent.
- Files: `src/transformer/transform-to-pptel.ts:189-204`, `src/transformer/transform-to-pptel.ts:299-300`, `src/transformer/transform-to-pptel.ts:446-447`
- Trigger: Convert shapes with `fill="none"`, gradients, CSS variables, or alpha colors.
- Workaround: Restrict inputs to hex, named colors in the local map, or integer `rgb(r,g,b)` values.

**Text output can contain unescaped HTML content:**
- Symptoms: Text content is interpolated directly into `richContent` as an HTML string without escaping user-controlled text.
- Files: `src/transformer/transform-to-pptel.ts:479-498`
- Trigger: Convert SVG text containing `<`, `>`, `&`, quotes, or HTML-like payloads.
- Workaround: Sanitize or escape text before passing SVG content to the converter.

**Tspan positioning and rich text styles are dropped:**
- Symptoms: Parser defines `TextRun` and `extractTextContent()` but `convertToSvgElement()` does not use them. Transformer concatenates `tspan` text into one text element and ignores per-`tspan` `x`, `y`, `font-size`, `font-family`, and fill.
- Files: `src/parser/svg-parser.ts:3-36`, `src/parser/svg-parser.ts:46-87`, `src/transformer/transform-to-pptel.ts:231-245`, `src/transformer/transform-to-pptel.ts:479-513`
- Trigger: Convert SVG text with multiple `<tspan>` runs or per-run styling.
- Workaround: Flatten styled text into separate `<text>` elements before conversion.

## Security Considerations

**XML parser has no explicit entity or input-size hardening:**
- Risk: `fast-xml-parser` is configured for attributes and values but no explicit entity-processing, depth, node-count, or file-size limits are set in converter code.
- Files: `src/parser/svg-parser.ts:89-116`, `src/index.ts:15-34`
- Current mitigation: `parseSvg()` rejects missing/empty roots and `convert()` catches parser exceptions.
- Recommendations: Set parser options defensively, reject oversized SVG strings before parsing, and add tests for malformed XML, entity payloads, and deeply nested inputs.

**Raw SVG image references are passed through:**
- Risk: `href` / `xlink:href` values become `PPTImageElement.src` without scheme allow-listing, size validation, or data URI policy.
- Files: `src/parser/svg-parser.ts:58-60`, `src/transformer/transform-to-pptel.ts:516-529`
- Current mitigation: Not detected.
- Recommendations: Define allowed image schemes (`data:`, `https:`, local path, etc.) based on consumer requirements and reject or sanitize everything else.

**Text-to-HTML conversion can inject markup into downstream renderers:**
- Risk: SVG text is embedded in an HTML snippet for `PPTTextElement.content` without escaping.
- Files: `src/transformer/transform-to-pptel.ts:479-498`, `src/slides.ts:151-186`
- Current mitigation: Not detected.
- Recommendations: Escape text nodes before constructing rich text HTML; add tests for `&`, `<`, `>`, quotes, and already-escaped entities.

**CLI silently suppresses filesystem traversal errors:**
- Risk: Directory read/stat failures are swallowed, so permission problems, broken symlinks, or inaccessible subdirectories are invisible to users.
- Files: `src/cli.ts:34-52`
- Current mitigation: File conversion failures are reported after a file path is discovered (`src/cli.ts:84-100`).
- Recommendations: Add `--verbose` or warning output for skipped paths and include a non-zero strict mode for CI use.

## Performance Bottlenecks

**Conversion is fully in-memory and synchronous at file boundaries:**
- Problem: CLI reads each SVG with `readFileSync`; converter parses the entire XML string, builds a full object tree, walks it into an array, then stringifies the full JSON output.
- Files: `src/cli.ts:55-62`, `src/parser/svg-parser.ts:115-156`, `src/transformer/transform-to-pptel.ts:550-575`, `src/index.ts:26-30`
- Cause: No streaming parser, output writer, or backpressure-aware API exists.
- Improvement path: Add input-size limits first; for large-batch support, use async file IO and streaming/chunked output or per-file output mode.

**Directory conversion processes files sequentially:**
- Problem: `src/cli.ts` awaits each `processFile()` inside a `for` loop.
- Files: `src/cli.ts:84-95`
- Cause: Simpler control flow avoids concurrency management but underuses IO and CPU on large directories.
- Improvement path: Add bounded concurrency for directory mode after tests cover error aggregation and output ordering.

**Path bounds need a real parser to avoid costly downstream correction:**
- Problem: Unsupported path commands produce inaccurate element bounds, forcing downstream consumers to re-measure or render fallback results.
- Files: `src/mapper/coordinate-mapper.ts:67-105`, `src/transformer/transform-to-pptel.ts:373-389`
- Cause: Current implementation scans only a small subset of path commands.
- Improvement path: Use a tested SVG path parser/bounds library or implement full command normalization with unit tests for absolute/relative curves and arcs.

**Per-element UUID generation adds avoidable overhead for large SVGs:**
- Problem: Every transformed element calls `uuidv4()` even when deterministic or incremental IDs would be sufficient.
- Files: `src/transformer/transform-to-pptel.ts:0-4`, `src/transformer/transform-to-pptel.ts:260-263`
- Cause: IDs are generated unconditionally in `transformElement()`.
- Improvement path: Make ID generation injectable; consider deterministic counters for CLI output when UUID uniqueness across documents is not required.

## Fragile Areas

**Parser child whitelist drops many valid SVG constructs:**
- Files: `src/parser/svg-parser.ts:68-79`, `src/parser/svg-parser.ts:96-112`
- Why fragile: Only a fixed tag list is recursively converted. Elements such as `use`, `style`, `radialGradient`, `clipPath`, `mask`, `pattern`, `symbol`, and many filter primitives are not preserved for later handling.
- Safe modification: Expand parser coverage deliberately with tests; preserve unknown child elements when possible so transformer decisions can be centralized.
- Test coverage: No tests exist for skipped or unknown SVG tags.

**Style and inheritance model is incomplete:**
- Files: `src/parser/svg-parser.ts:49-60`, `src/transformer/transform-to-pptel.ts:287-309`, `src/transformer/transform-to-pptel.ts:391-397`
- Why fragile: Only direct attributes are used. Inline `style="fill:..."`, CSS classes, inherited `fill`/`stroke`, `stroke-linecap`, `stroke-linejoin`, `stroke-opacity`, `fill-opacity`, and group opacity are not resolved.
- Safe modification: Add a style resolution pass between parsing and transformation; keep raw attributes and resolved presentation attributes separate.
- Test coverage: No tests exist for inherited styles or CSS presentation attributes.

**Fallback viewBox can hide invalid dimensions:**
- Files: `src/parser/svg-parser.ts:39-43`, `src/mapper/coordinate-mapper.ts:7-11`, `src/index.ts:21-25`
- Why fragile: Missing or invalid `viewBox` silently becomes `[0, 0, 1280, 720]`, and missing width/height then parse from fallback dimensions.
- Safe modification: Return diagnostics from `parseViewBox()` and let `convert()` decide whether fallback is acceptable.
- Test coverage: No tests exist for malformed, missing, zero, negative, or unit-suffixed dimensions.

**Numeric parsing ignores SVG units and percentages:**
- Files: `src/mapper/coordinate-mapper.ts:14-25`, `src/parser/svg-parser.ts:141-144`
- Why fragile: `extractNumber()` only strips a trailing `px`; `parseFloat()` accepts prefixes of values like `10cm` or `50%` without converting units.
- Safe modification: Add a unit conversion policy for supported units and reject unsupported units with a clear diagnostic.
- Test coverage: No tests exist for `em`, `rem`, `pt`, `cm`, `mm`, `in`, percentages, or mixed-unit inputs.

**Shape path conversion mixes local path data with separately scaled boxes:**
- Files: `src/shapes/shape-to-path.ts:6-29`, `src/transformer/transform-to-pptel.ts:280-457`
- Why fragile: `rectToPath()`, `circleToPath()`, and `ellipseToPath()` generate local paths while `viewBox` is set to scaled output width/height; line and polygon paths can still use original SVG coordinates.
- Safe modification: Define one coordinate convention for `PPTShapeElement.path` and `viewBox`, then normalize every generated path to that convention.
- Test coverage: No golden-output tests exist for path/viewBox consistency.

## Scaling Limits

**Large SVG files can exhaust memory:**
- Current capacity: Entire SVG input, parsed object graph, transformed element array, and JSON output string are all resident at once.
- Limit: Very large SVGs or batch conversions are bounded by available Node.js heap and synchronous file IO.
- Scaling path: Add size limits, async IO, and streaming/batched output; expose memory expectations in CLI help.

**Huge directories have limited observability and no parallelism:**
- Current capacity: Directory mode discovers SVG files recursively and converts them one at a time.
- Limit: Long-running conversions provide only per-file output and a final summary, with skipped directories hidden.
- Scaling path: Add bounded concurrency, progress reporting, verbose skipped-path warnings, and optional per-file JSON output.

**Element-count growth creates large JSON and many random IDs:**
- Current capacity: One `PPTElement` object and one UUID are created per renderable SVG element.
- Limit: SVGs with tens or hundreds of thousands of elements produce large memory spikes and slow JSON serialization.
- Scaling path: Add an element-count limit, streaming JSON writer, and injectable deterministic ID generator.

## Dependencies at Risk

**`vitest` / Vite CommonJS deprecation warning:**
- Risk: Running `npm test` emits `The CJS build of Vite's Node API is deprecated`, while the project compiles TypeScript to CommonJS.
- Impact: Future Vite/Vitest upgrades may require ESM config or module changes before tests can run cleanly.
- Migration plan: Keep `vitest.config.ts` at the root only, add actual tests, then evaluate `module`/`moduleResolution` changes or ESM-compatible test config.

**`@types/uuid` duplicates bundled UUID typings:**
- Risk: `uuid@14.0.1` declares its own `types`, while `@types/uuid` is also installed.
- Impact: Type drift can cause confusing compiler behavior during dependency upgrades.
- Migration plan: Remove `@types/uuid` if TypeScript resolves bundled UUID types cleanly.

**`fast-xml-parser` behavior is central and lightly wrapped:**
- Risk: Parser options and output shape assumptions directly determine `SvgElement` construction.
- Impact: Dependency upgrades can change parsing of text nodes, attributes, arrays, or entities and break conversion semantics.
- Migration plan: Pin upgrades to parser fixture tests in `__tests__/parser/*.test.ts` before changing `fast-xml-parser` versions.

## Missing Critical Features

**No gradient fill conversion:**
- Problem: `linearGradient` and `stop` are parsed but skipped; `radialGradient` is not in the parser whitelist. `PPTShapeElement` supports `gradient`, but transformer never populates it.
- Blocks: SVGs using gradient fills cannot be faithfully converted.
- Files: `src/parser/svg-parser.ts:70`, `src/transformer/transform-to-pptel.ts:274-277`, `src/slides.ts:45-54`, `src/slides.ts:347-350`

**No filters, masks, clipping, markers, or patterns:**
- Problem: Non-renderable effects are skipped or absent from parser coverage, while the output types include optional fields for filters, clips, patterns, shadows, and special handling.
- Blocks: Common SVG effects are lost in conversion output.
- Files: `src/parser/svg-parser.ts:68-79`, `src/transformer/transform-to-pptel.ts:274-277`, `src/slides.ts:212-300`, `src/slides.ts:347-386`

**No `<use>` / symbol reference expansion:**
- Problem: Parser does not include `use` or `symbol` in `childTags`; referenced definitions are not resolved.
- Blocks: Icon sets and reusable SVG assets render missing elements.
- Files: `src/parser/svg-parser.ts:68-79`

**No rotation output despite parsing rotation input:**
- Problem: `parseTransform()` records `rotateDeg`, but every output element sets `rotate: 0` or omits rotation for lines.
- Blocks: Rotated shapes, text, and images lose rotation in output.
- Files: `src/mapper/coordinate-mapper.ts:50-56`, `src/transformer/transform-to-pptel.ts:295-296`, `src/transformer/transform-to-pptel.ts:505-507`, `src/transformer/transform-to-pptel.ts:519-527`

**No CLI batch output mode for directories:**
- Problem: Directory mode writes each converted JSON to stdout with headers and explicitly rejects `--output` for directory inputs.
- Blocks: Users cannot write one output file per SVG from the built-in CLI.
- Files: `src/cli.ts:65-102`

**No round-trip validation scripts in the published build:**
- Problem: `tsconfig.json` excludes `src/scripts`, so `src/scripts/validate-all.ts` and `src/scripts/round-trip-test.ts` are not built by `npm run build`; package scripts do not expose them.
- Blocks: Consumers and CI cannot run these validation utilities from the package without a separate TypeScript execution path.
- Files: `tsconfig.json:18`, `src/scripts/validate-all.ts`, `src/scripts/round-trip-test.ts`, `package.json:12-16`

## Test Coverage Gaps

**Parser tests:**
- What's not tested: XML parse failures, namespace handling, text/tspan extraction, child tag preservation, style attributes, malformed roots, and entity/input-size hardening.
- Files: `src/parser/svg-parser.ts`, `vitest.config.ts:6-12`
- Risk: Valid SVG constructs can be silently dropped or malformed SVGs can produce misleading fallback output.
- Priority: High

**Coordinate mapping tests:**
- What's not tested: ViewBox origins, units, negative transforms, matrix transforms, group transforms, ellipse scaling, relative path commands, curves, arcs, and fallback boxes.
- Files: `src/mapper/coordinate-mapper.ts`, `src/coordinate-mapper.ts`
- Risk: Incorrect geometry affects every downstream `PPTElement` position and size.
- Priority: High

**Transformer tests:**
- What's not tested: Fill/stroke handling, `fill="none"`, dash arrays, opacity variants, gradients, text escaping, tspan styles, images, lines, and path/viewBox consistency.
- Files: `src/transformer/transform-to-pptel.ts`, `src/shapes/shape-to-path.ts`, `src/slides.ts`
- Risk: Output JSON can be syntactically valid but semantically wrong for common SVGs.
- Priority: High

**Public API tests:**
- What's not tested: `convert()` success/error contract, `targetCanvas` scaling, element counts, JSON shape, and exception-to-error conversion.
- Files: `src/index.ts`
- Risk: Library consumers can receive breaking output or inconsistent errors without detection.
- Priority: High

**CLI tests:**
- What's not tested: Single-file conversion, `--output`, directory mode, recursive discovery, missing input, unreadable paths, partial failures, exit codes, and package bin path.
- Files: `src/cli.ts`, `package.json:6-16`
- Risk: The shipped binary can break independently from the library API.
- Priority: High

**Release/build tests:**
- What's not tested: Clean `dist/` generation, package contents, lockfile metadata, and importing the built CommonJS output.
- Files: `package.json:4-10`, `package-lock.json:15-17`, `tsconfig.json:1-19`, `dist/`
- Risk: A build can pass locally while publishing stale or incorrectly packaged artifacts.
- Priority: Medium

---

*Concerns audit: 2026-06-27*
