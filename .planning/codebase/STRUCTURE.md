# Codebase Structure

**Analysis Date:** 2026-06-27

## Directory Layout

```text
E:/git/svg2json/
├── .planning/                         # Project planning, research, and generated codebase maps
│   ├── codebase/                      # GSD codebase mapping documents
│   ├── research/                      # Research documents for stack, architecture, pitfalls, features
│   ├── PROJECT.md                     # Project overview/planning context
│   ├── REQUIREMENTS.md                # Requirement checklist and traceability
│   └── config.json                    # Planning workflow configuration
├── dist/                              # Generated TypeScript build output
│   ├── src/                           # Compiled output mirroring `src/`
│   └── vitest.config.js               # Compiled root test config
├── src/                               # TypeScript source
│   ├── cli.ts                         # CLI entry point
│   ├── index.ts                       # Library API entry point
│   ├── slides.ts                      # PPTElement target schema/types
│   ├── coordinate-mapper.ts           # Duplicate coordinate mapper copy
│   ├── vitest.config.ts               # Duplicate Vitest config under source tree
│   ├── mapper/
│   │   └── coordinate-mapper.ts       # Active coordinate mapping module used by transformer
│   ├── parser/
│   │   └── svg-parser.ts              # SVG XML parser and AST builder
│   ├── scripts/
│   │   ├── round-trip-test.ts         # Development round-trip validation script
│   │   └── validate-all.ts            # Development batch conversion validation script
│   ├── shapes/
│   │   └── shape-to-path.ts           # Primitive SVG shape → path helpers
│   ├── transformer/
│   │   └── transform-to-pptel.ts      # SVG AST → PPTElement converter
│   └── types/
│       └── ast.ts                     # SVG AST and mapping interfaces
├── 05_architecture_overview.svg       # Repository-level SVG asset
├── a.json                             # Repository-level JSON artifact/sample
├── bash.exe.stackdump                 # Local shell crash dump artifact
├── gui-sock-13168                     # Local socket artifact
├── package-lock.json                  # npm lockfile
├── package.json                       # npm package manifest, scripts, dependencies, bin mapping
├── README.md                          # User-facing project documentation
├── tsconfig.json                      # TypeScript compiler configuration
└── vitest.config.ts                   # Root Vitest configuration
```

## Directory Purposes

**`src/`:**
- Purpose: Authoritative TypeScript implementation for the SVG-to-PPTElement converter.
- Contains: Public entrypoints, parser, coordinate mapper, transformer, target schema types, and helper scripts.
- Key files: `src/index.ts`, `src/cli.ts`, `src/transformer/transform-to-pptel.ts`, `src/slides.ts`.

**`src/parser/`:**
- Purpose: Parse SVG XML into the internal SVG AST.
- Contains: `fast-xml-parser` configuration, root/viewBox/dimension extraction, recursive element normalization.
- Key files: `src/parser/svg-parser.ts`.

**`src/mapper/`:**
- Purpose: Compute SVG element bounding boxes and parse/apply supported transform attributes.
- Contains: Coordinate extraction by SVG tag, numeric parsing, path bounding box helper, transform parser.
- Key files: `src/mapper/coordinate-mapper.ts`.

**`src/shapes/`:**
- Purpose: Convert SVG primitive geometry into SVG path `d` strings.
- Contains: Path builder helpers for `rect`, `circle`, `ellipse`, `line`, and `polygon`.
- Key files: `src/shapes/shape-to-path.ts`.

**`src/transformer/`:**
- Purpose: Convert the parsed SVG AST into output `PPTElement` objects.
- Contains: Recursive AST traversal, tag dispatch, color normalization, line dash parsing, text and image conversion.
- Key files: `src/transformer/transform-to-pptel.ts`.

**`src/types/`:**
- Purpose: Shared source-side interfaces for SVG parsing and coordinate mapping.
- Contains: `SvgAttrs`, `SvgElement`, `SvgParseResult`, `CoordinateMapping`, `TransformResult`.
- Key files: `src/types/ast.ts`.

**`src/scripts/`:**
- Purpose: Development-only validation workflows.
- Contains: Batch validation over `examples/*/svg_output/` and round-trip JSON validation.
- Key files: `src/scripts/validate-all.ts`, `src/scripts/round-trip-test.ts`.

**`dist/`:**
- Purpose: Generated JavaScript, declarations, and source maps from `npm run build`.
- Contains: Compiled copies of root config and source files under `dist/src/`.
- Key files: `dist/src/index.js`, `dist/src/cli.js`, `dist/src/transformer/transform-to-pptel.js`.

**`.planning/`:**
- Purpose: Planning and codebase intelligence for GSD workflows.
- Contains: Project docs, requirements, research docs, codebase mapping docs, workflow config.
- Key files: `.planning/REQUIREMENTS.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`.

**`node_modules/`:**
- Purpose: Installed npm dependencies.
- Contains: Package dependency trees for TypeScript, Vitest, `fast-xml-parser`, `cac`, `uuid`, and others.
- Key files: Not an implementation target; do not edit.

## Key File Locations

**Entry Points:**
- `src/index.ts`: Public library entry; exports `convert()`, `parseSvg`, `transformToPPTElement`, and `PPTElement` type.
- `src/cli.ts`: CLI entry; defines `svg2pptel <input>` command, directory processing, file I/O, and process exit behavior.
- `dist/src/cli.js`: Compiled CLI file referenced by `package.json` `bin.svg2pptel`.

**Configuration:**
- `package.json`: Package metadata, `build`, `test`, `test:watch` scripts, runtime/dev dependencies, and CLI bin mapping.
- `package-lock.json`: Locked npm dependency versions.
- `tsconfig.json`: CommonJS TypeScript build targeting ES2022 with declarations and source maps.
- `vitest.config.ts`: Root Vitest configuration for `__tests__/**/*.test.ts`, Node environment, and V8 coverage.
- `src/vitest.config.ts`: Duplicate Vitest configuration located under `src/` and included by the current `tsconfig.json` source globs.

**Core Logic:**
- `src/parser/svg-parser.ts`: XML parsing, SVG root normalization, viewBox parsing, AST construction.
- `src/mapper/coordinate-mapper.ts`: Transform parsing and per-element coordinate box calculations.
- `src/shapes/shape-to-path.ts`: Geometry-to-path conversion helpers.
- `src/transformer/transform-to-pptel.ts`: Main SVG AST to PPTElement conversion logic.

**Type Definitions:**
- `src/types/ast.ts`: Internal source AST and coordinate mapping interfaces.
- `src/slides.ts`: Output schema for PowerPoint JSON elements and slide-related types.

**Testing and Validation:**
- `vitest.config.ts`: Test runner config; expects test files under `__tests__/**/*.test.ts`.
- `src/vitest.config.ts`: Duplicate test runner config under source tree.
- `src/scripts/validate-all.ts`: Batch conversion validation script.
- `src/scripts/round-trip-test.ts`: SVG → AST → PPTElement → JSON parse validation script.
- `__tests__/`: Configured test directory, not present in the explored tree.

**Documentation and Planning:**
- `README.md`: Installation, CLI usage, API usage, output format, validation command examples.
- `.planning/REQUIREMENTS.md`: Current requirements and deferred scope.
- `.planning/research/ARCHITECTURE.md`: Domain architecture research.
- `.planning/research/PITFALLS.md`: Known conversion pitfalls and technical debt context.
- `.planning/codebase/ARCHITECTURE.md`: Current architecture map.
- `.planning/codebase/STRUCTURE.md`: Current structure map.

## Naming Conventions

**Files:**
- Use kebab-case for implementation modules with multiple words: `src/parser/svg-parser.ts`, `src/shapes/shape-to-path.ts`, `src/transformer/transform-to-pptel.ts`, `src/mapper/coordinate-mapper.ts`.
- Use concise semantic names for root entry/schema files: `src/index.ts`, `src/cli.ts`, `src/slides.ts`.
- Use `*.config.ts` for tool configuration files: `vitest.config.ts`, `src/vitest.config.ts`.
- Use `*.d.ts`, `*.js`, and `*.js.map` only under generated `dist/` output.

**Directories:**
- Use feature/layer nouns under `src/`: `parser/`, `mapper/`, `shapes/`, `transformer/`, `types/`, `scripts/`.
- Keep generated compiled output in `dist/` and source implementation in `src/`.
- Keep GSD codebase maps in `.planning/codebase/` and research docs in `.planning/research/`.

**Types:**
- Use PascalCase for interfaces and type aliases: `SvgElement`, `SvgParseResult`, `CoordinateMapping`, `TransformResult`, `PPTElement`.
- Use suffixes that identify role: `Result` for return/result shapes, `Element` for source/target elements, `Mapping` for computed geometry.
- Keep target PPT schema types in `src/slides.ts`; keep SVG parser/mapper types in `src/types/ast.ts`.

**Functions:**
- Use camelCase: `convert`, `parseSvg`, `transformToPPTElement`, `transformElement`, `mapCoordinates`, `colorToHex`, `parseDashArray`.
- Name conversion helpers with source/target intent: `rectToPath`, `circleToPath`, `polygonToPath` in `src/shapes/shape-to-path.ts`.
- Keep file-local helpers unexported unless used across modules.

## Where to Add New Code

**New Public API Option:**
- Primary code: Add option type fields to `ConvertOptions` in `src/index.ts`.
- Pipeline wiring: Pass the option through `convert()` into `transformToPPTElement()` in `src/transformer/transform-to-pptel.ts`.
- Types: Add any shared option/result interfaces in `src/index.ts` or `src/types/ast.ts` if parser/mapper layers need them.
- Tests: Add tests under `__tests__/` using `*.test.ts` once the test directory exists.

**New CLI Flag:**
- Primary code: Add `.option()` to the command in `src/cli.ts`.
- Behavior: Convert parsed CLI option values into `convert()` options in `processFile()` or surrounding call sites in `src/cli.ts`.
- Output handling: Keep CLI-only filesystem and process-exit behavior in `src/cli.ts`.
- Tests: Add CLI behavior tests under `__tests__/` if test infrastructure is added.

**New SVG Element Support:**
- Parser: Add the tag name to `childTags` and `isArray` lists in `src/parser/svg-parser.ts` if the element has children or must be preserved in the AST.
- Types: Add any missing attributes to `SvgAttrs` in `src/types/ast.ts`.
- Coordinates: Add a case to `mapCoordinates()` in `src/mapper/coordinate-mapper.ts` if the element needs custom bounding box logic.
- Transformation: Add a case to `transformElement()` in `src/transformer/transform-to-pptel.ts`.
- Target schema: Extend or reuse types in `src/slides.ts` only when the output shape requires new PPTElement fields.

**New SVG Shape Primitive:**
- Shape path helper: Add geometry-to-path helper to `src/shapes/shape-to-path.ts`.
- Coordinates: Add or adjust corresponding `mapCoordinates()` logic in `src/mapper/coordinate-mapper.ts`.
- Transformer: Add a tag case in `src/transformer/transform-to-pptel.ts` to call the helper and return a `PPTShapeElement`.
- Parser: Add the tag to parser lists in `src/parser/svg-parser.ts`.

**New Transform or Coordinate Feature:**
- Primary code: Add parsing/application logic in `src/mapper/coordinate-mapper.ts`.
- Avoid editing: Do not add new logic to the duplicate `src/coordinate-mapper.ts`; consolidate the duplicate first if a transform change must be shared.
- Transformer integration: Adjust coordinate scaling in `src/transformer/transform-to-pptel.ts` only if the mapper return contract changes.
- Validation: Add SVG fixture tests under `__tests__/` and consider extending `src/scripts/round-trip-test.ts` if the output shape validator needs new checks.

**New Color, Font, or Text Utility:**
- Existing code: `colorToHex()` and text helpers currently live in `src/transformer/transform-to-pptel.ts`.
- Preferred location for shared utilities: Create `src/utils/` only when at least one helper is reused across modules.
- Transformer integration: Import the utility into `src/transformer/transform-to-pptel.ts` and keep output object creation there.

**New Development Script:**
- Implementation: Add it under `src/scripts/`.
- Build behavior: Remember `src/scripts` is excluded in `tsconfig.json`; run scripts with a TS runner or update build config intentionally.
- Documentation: Add script usage to `README.md` if it is intended for users/contributors.

**New Tests:**
- Location: Create `__tests__/` at the repository root because `vitest.config.ts` includes `__tests__/**/*.test.ts`.
- Naming: Use `*.test.ts`.
- Imports: Import source modules from `src/` directly for unit tests.
- Coverage: Root `vitest.config.ts` uses V8 coverage and includes `**/*.ts` while excluding declarations, `node_modules`, and `dist`.

**Build Output Changes:**
- Source edits: Make implementation changes under `src/`.
- Generated files: Run `npm run build` to regenerate `dist/` only when compiled output is part of the requested change.
- Do not hand-edit: Avoid direct edits in `dist/` because they are generated from `src/`.

## Special Directories

**`dist/`:**
- Purpose: Generated JavaScript/declaration/source-map output from `tsc`.
- Generated: Yes.
- Committed: Present in the repository tree.

**`node_modules/`:**
- Purpose: Installed third-party npm packages.
- Generated: Yes, by `npm install`.
- Committed: Present in the working tree but not an implementation target.

**`.planning/`:**
- Purpose: Planning, research, requirements, and codebase mapping documents consumed by GSD workflows.
- Generated: Partially; `.planning/codebase/*.md` are generated/updated by mapping workflows.
- Committed: Present in the repository tree.

**`src/scripts/`:**
- Purpose: Manual development and validation helpers.
- Generated: No.
- Committed: Present in the repository tree.
- Build status: Excluded by `tsconfig.json`, so do not rely on `npm run build` to emit these scripts.

**`__tests__/`:**
- Purpose: Configured Vitest test location.
- Generated: No.
- Committed: Not present in the explored repository tree.
- Add when: Create this directory when adding tests.

**`src/coordinate-mapper.ts`:**
- Purpose: Duplicate of `src/mapper/coordinate-mapper.ts`.
- Generated: No.
- Committed: Present in the repository tree.
- Add/change guidance: Prefer `src/mapper/coordinate-mapper.ts`; consolidate this duplicate before relying on both paths.

**`src/vitest.config.ts`:**
- Purpose: Duplicate of root `vitest.config.ts` under `src/`.
- Generated: No.
- Committed: Present in the repository tree.
- Add/change guidance: Prefer root `vitest.config.ts` as the canonical config unless a source-local config is intentionally required.

**Local Artifacts (`bash.exe.stackdump`, `gui-sock-13168`):**
- Purpose: Local runtime/shell artifacts in the repository root.
- Generated: Yes.
- Committed: Present in the working tree snapshot as files, not source architecture.
- Add/change guidance: Do not use as source inputs or implementation locations.

---

*Structure analysis: 2026-06-27*
