# Stack Research

**Domain:** TypeScript library for SVG parsing and coordinate transformation
**Researched:** 2026-06-26
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| fast-xml-parser | 5.9.3 | SVG XML parsing | Industry standard for TypeScript XML parsing. Already in use. Handles attribute prefixes, array detection, and namespace awareness well. |
| TypeScript | 6.0.3 | Language | Current stable. Your tsconfig targets ES2022/CommonJS which is correct for a library targeting Node consumers. Upgrade from 5.5.0. |
| vitest | 4.1.9 | Testing | Now the de facto standard for TypeScript testing. Vite-powered, native ESM, better performance than Jest. Your config is correct. Upgrade from 2.0.0. |
| tsup | 8.5.1 | Build/bundle | Replaces raw `tsc` for library publishing. Handles declaration bundling, ESM/CJS output, and tree-shaking automatically. Strong recommendation over plain tsc. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| picocolors | 1.1.1 | CLI colors | Keep. Lightweight, no dependencies. Already in use. |
| cac | 7.0.0 | CLI framework | Upgrade from 6.7.14. Same API, minor version bump. Better TypeScript types. |
| @types/node | 26.0.1 | Node types | Upgrade from 22.0.0. Required for TypeScript 6 compatibility. |
| @types/uuid | 11.0.0 | UUID types | Upgrade from 10.0.0. Matches uuid@14. |
| changesets | 1.0.2 | Release management | Use if publishing to npm. Handles versioning and CHANGELOG automatically. |
| prettier | 3.8.4 | Code formatting | Add if not present. Non-negotiable for library quality. |
| eslint | 10.5.0 | Linting | Add flat config for 2025+ standards. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| tsup | Build CLI + library | `tsup src/cli.ts src/index.ts --dts --format cjs,esm` generates dist with types |
| vitest | Unit testing | Your existing config is correct. Add `--coverage` flag in CI |
| tsx | Fast TypeScript execution | Replace `ts-node` with `tsx` for scripts (faster, ESM-native) |

## Installation

```bash
# Core
npm install fast-xml-parser picocolors cac uuid

# TypeScript and build tooling
npm install -D typescript@6.0.3 tsup vitest@4.1.9 @types/node@26 @types/uuid@11 prettier eslint

# Release tooling (optional)
npm install -D changesets
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| fast-xml-parser | @xmldom/xmldom | When you need DOM API (document.querySelector, etc.) at cost of bundle size and performance |
| fast-xml-parser | sax | Streaming XML for very large files (>50MB); your use case is file-level so not needed |
| tsup | tsc (raw) | Only for zero-dependency builds; tsup handles types/declarations better |
| tsup | tsdx | tsdx is heavier; tsup is simpler and faster |
| vitest | jest | Jest is slower, less TypeScript-native; vitest is now standard |
| cac | commander | Commander is more popular but cac has better TypeScript types out of the box |
| changesets | release-please | Release-please is Google's standard; changesets is more flexible for multi-package |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| ts-node | Deprecated, slow, poor ESM support | tsx for scripts, tsup for builds |
| @types/jest | Jest types bundled with jest | vitest includes its own types |
| Babel for TypeScript | Unnecessary complexity | Use tsc directly or tsup |
| TSLint | Deprecated since 2019 | eslint with @typescript-eslint |

## Stack Patterns by Variant

**If publishing to npm as a library:**
- Use `tsup` with `--dts` flag for automatic declaration generation
- Use `changesets` for versioning and CHANGELOG
- Set `exports` field in package.json for proper ESM/CJS dual publishing

**If only building a CLI tool:**
- `tsup` or `tsc` is sufficient
- Consider `tsx` for development scripts
- No declaration files needed

**If adding visual regression tests:**
- Use `@vitest/browser` with Playwright for SVG rendering tests
- svg-to-pptel can output JSON, compare against expected fixtures

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| typescript@6.0.3 | @types/node@26 | Required pairing for 2025-2026 |
| vitest@4.1.9 | @vitest/coverage-v8@4 | Coverage provider |
| tsup@8.x | typescript@5.x, @1.0.0 | Handles all modern TypeScript features |
| cac@7 | picocolors@1 | No breaking changes |
| fast-xml-parser@5 | Node 18+ | ESM + CJS support |

## Stack Gap Analysis for svg-to-pptel

**Current (from package.json):**
- fast-xml-parser: 5.9.3 (current)
- cac: 6.7.14 (outdated, should upgrade to 7.0.0)
- typescript: 5.5.0 (should upgrade to 6.0.3)
- vitest: 2.0.0 (should upgrade to 4.1.9)
- @types/node: 22.0.0 (should upgrade to 26.0.1)
- @types/uuid: 10.0.0 (should upgrade to 11.0.0)

**Missing for production library:**
- tsup for build management (currently using raw `tsc`)
- prettier for code formatting
- eslint for linting
- changesets for release management

**SVG Processing Observations:**
- Coordinate transformation is pure math, no library needed (your coordinate-mapper.ts is correct)
- Path d attribute parsing is custom; no standard library for bounding box extraction
- SVGO could help with SVG normalization but adds bundle size and is for optimization, not parsing

## Sources

- npm registry versions verified 2026-06-26
- TypeScript 6.0.3 release notes — npm view typescript@6.0.3
- vitest 4.x migration guide — vitest.dev (2025 adoption as industry standard)
- tsup GitHub — oxc-project/tsup (modern bundler for TypeScript libraries)
- fast-xml-parser docs — npmjs.com/package/fast-xml-parser (5.x features verified)

---
*Stack research for: svg-to-json TypeScript library*
*Researched: 2026-06-26*