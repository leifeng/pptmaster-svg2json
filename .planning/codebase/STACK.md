# Technology Stack

**Analysis Date:** 2026-06-27

## Languages

**Primary:**
- TypeScript 5.5+ declared in `package.json` (`typescript: ^5.5.0`) and compiled with `tsc`; the lockfile resolves TypeScript 5.9.3 in `package-lock.json`.
- Source lives in `src/**/*.ts`, including the public API in `src/index.ts`, CLI in `src/cli.ts`, parser in `src/parser/svg-parser.ts`, transformer in `src/transformer/transform-to-pptel.ts`, and PPTElement types in `src/slides.ts`.

**Secondary:**
- Markdown - project documentation in `README.md` and planning documents under `.planning/`.
- JSON - package metadata in `package.json`, TypeScript configuration in `tsconfig.json`, and npm lockfile in `package-lock.json`.

## Runtime

**Environment:**
- Node.js 18+ - required by `README.md`; runtime APIs use built-in `fs` and `path` modules in `src/cli.ts`, `src/scripts/validate-all.ts`, and `src/scripts/round-trip-test.ts`.
- Package metadata does not declare an `engines` field in `package.json`; rely on the documented Node.js 18+ requirement in `README.md`.

**Package Manager:**
- npm - `package-lock.json` is present and uses lockfileVersion 3.
- Lockfile: present at `package-lock.json`.
- No `pnpm-lock.yaml` or `yarn.lock` detected.

## Frameworks

**Core:**
- Not detected - this is a self-contained TypeScript library/CLI, not a web framework application.
- Public library entry: `src/index.ts` exports `convert`, `parseSvg`, `transformToPPTElement`, and `PPTElement` types.
- CLI entry: `src/cli.ts` defines the `svg2pptel` command with `cac`.

**Testing:**
- Vitest `^2.0.0` declared in `package.json`; resolved version 2.1.9 in `package-lock.json`.
- Config files: `vitest.config.ts` and duplicate `src/vitest.config.ts`.
- Node test environment with globals enabled, V8 coverage provider, and test include pattern `__tests__/**/*.test.ts` in `vitest.config.ts`.

**Build/Dev:**
- TypeScript compiler - `npm run build` runs `tsc` via `package.json`.
- Build output directory: `dist/` from `tsconfig.json` `outDir`.
- Compiler target/module: ES2022 + CommonJS in `tsconfig.json`.
- Declaration files and source maps are enabled in `tsconfig.json`.
- Vitest transitively brings Vite/Rollup/esbuild for test execution, but the production build uses `tsc` only.

## Key Dependencies

**Critical:**
- `fast-xml-parser` `^5.9.3` - parses SVG/XML input in `src/parser/svg-parser.ts` through `XMLParser`.
- `cac` `^6.7.14` - implements command parsing/help/options for `svg2pptel` in `src/cli.ts`.
- `uuid` `^14.0.1` - generates PPTElement IDs in `src/transformer/transform-to-pptel.ts` via `v4 as uuidv4`.
- `picocolors` `^1.1.1` - provides colored terminal output in `src/cli.ts`, `src/scripts/validate-all.ts`, and `src/scripts/round-trip-test.ts`.

**Infrastructure:**
- `@types/node` `^22.0.0` - Node.js typings for `fs`, `path`, `process`, and `__dirname` usage across CLI/scripts.
- `@types/uuid` `^10.0.0` - UUID typings declared in `package.json`.
- No database, queue, cache, cloud SDK, web server, or HTTP client dependency detected in `package.json` or `src/**/*.ts` imports.

## Configuration

**Environment:**
- Fully local configuration; no `.env*` files detected at repository root.
- No `process.env` usage detected in `src/**/*.ts`.
- Runtime inputs are CLI arguments and SVG file contents handled by `src/cli.ts`.
- Validation scripts derive paths from `__dirname` and local `examples/` structure in `src/scripts/validate-all.ts` and `src/scripts/round-trip-test.ts`.

**Build:**
- `package.json` scripts:
  - `npm run build` -> `tsc`
  - `npm test` -> `vitest run`
  - `npm run test:watch` -> `vitest`
- `tsconfig.json` includes `src/types/**/*`, `src/parser/**/*`, `src/shapes/**/*`, `src/mapper/**/*`, `src/transformer/**/*`, and `src/*.ts`.
- `tsconfig.json` excludes `node_modules`, `dist`, `__tests__`, and `src/scripts` from normal compilation.
- `package.json` publishes `dist/`, declares `main: dist/index.js`, `types: dist/index.d.ts`, and CLI binary `svg2pptel: ./dist/src/cli.js`.
- `dist/` is present in the repository and contains compiled JavaScript/declaration/source-map output.

## Platform Requirements

**Development:**
- Node.js 18+ as documented in `README.md`.
- npm with `package-lock.json`.
- Run `npm install`, `npm run build`, and `npm test` from repository root.
- Optional validation scripts in `src/scripts/*.ts` reference `examples/*/svg_output/`, but no `examples/` tree was detected during this scan.

**Production:**
- Node.js 18+ runtime for CommonJS output in `dist/`.
- CLI consumers use `svg2pptel` from `package.json` `bin` after building/publishing.
- Library consumers import the package entry declared by `package.json` (`dist/index.js` with types at `dist/index.d.ts`).
- No hosted service, container runtime, browser runtime, native binary, or external service is required.

## Evidence References

- Package metadata and scripts: `package.json`.
- Locked dependency versions: `package-lock.json`.
- Compiler behavior: `tsconfig.json`.
- Test runner behavior: `vitest.config.ts`, `src/vitest.config.ts`.
- Runtime and CLI usage documentation: `README.md`.
- External import scan: `src/cli.ts`, `src/parser/svg-parser.ts`, `src/transformer/transform-to-pptel.ts`, `src/scripts/validate-all.ts`, `src/scripts/round-trip-test.ts`.
- Project skills: no `.claude/skills/*/SKILL.md` or `.agents/skills/*/SKILL.md` files detected.

---

*Stack analysis: 2026-06-27*
