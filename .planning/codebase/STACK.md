# Technology Stack

**Analysis Date:** 2026-06-27

## Languages

**Primary:**
- TypeScript 5.5.0 - All source code

**Secondary:**
- None

## Runtime

**Environment:**
- Node.js 18+ (per README.md)

**Package Manager:**
- npm (lockfile present: `package-lock.json`)

## Frameworks

**Core:**
- None - Pure TypeScript library/CLI

**Testing:**
- Vitest 2.0.0 - Test runner
- @vitest/spy - Mocking support

**Build/Dev:**
- TypeScript 5.5.0 - Compilation to JavaScript
- esbuild 0.24.0+ - Bundled via Vitest

## Key Dependencies

**Critical:**
- `fast-xml-parser` 5.9.3 - SVG XML parsing
- `cac` 6.7.14 - CLI argument parsing
- `uuid` 14.0.1 - UUID generation for element IDs
- `picocolors` 1.1.1 - Terminal color output

**Infrastructure:**
- None - No database or cloud dependencies

## Configuration

**TypeScript Config:**
- Location: `tsconfig.json`
- Target: ES2022
- Module: CommonJS
- Strict mode: enabled
- Declaration files: generated

**Build Output:**
- Location: `dist/`
- Entry point: `dist/src/cli.js` (CLI binary)

**Vitest Config:**
- Location: `vitest.config.ts`
- Environment: node
- Coverage provider: v8
- Test pattern: `__tests__/**/*.test.ts`

## Platform Requirements

**Development:**
- Node.js 18+
- npm

**Production:**
- Node.js 18+ (runtime only)
- No platform-specific native modules

---

*Stack analysis: 2026-06-27*