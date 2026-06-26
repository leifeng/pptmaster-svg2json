# Technology Stack

**Analysis Date:** 2026-06-26

## Languages

**Primary:**
- TypeScript 5.5 - All source code

**Output:**
- JavaScript (ES2022) - Compiled output to `dist/`

## Runtime

**Environment:**
- Node.js (no explicit version constraint)

**Package Manager:**
- npm (package-lock.json not present)

## Build System

**Compiler:**
- TypeScript 5.5 via `tsc` command
- Config: `tsconfig.json`

**Build Output:**
- `dist/` directory (CommonJS modules)
- Source maps enabled
- Declaration files generated

**Build Command:**
```bash
npm run build   # tsc
```

## Dependencies

**Runtime:**
| Package | Version | Purpose |
|---------|---------|---------|
| cac | ^6.7.14 | CLI framework |
| fast-xml-parser | ^5.9.3 | SVG XML parsing |
| picocolors | ^1.1.1 | Terminal colors |
| uuid | ^14.0.1 | Unique ID generation |

**Development:**
| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ^5.5.0 | TypeScript compiler |
| vitest | ^2.0.0 | Test runner |
| @types/node | ^22.0.0 | Node.js type definitions |
| @types/uuid | ^10.0.0 | UUID type definitions |

## Test Framework

- **Vitest** 2.0 with V8 coverage provider
- Config: `vitest.config.ts`
- Test pattern: `__tests__/**/*.test.ts`

## Project Structure

```
src/
├── cli.ts              # CLI entry point
├── index.ts            # Main API export
├── slides.ts           # PPTElement type definitions
├── coordinate-mapper.ts
├── parser/
│   └── svg-parser.ts   # SVG to AST parser
├── transformer/
│   └── transform-to-pptel.ts  # AST to PPTElement transformer
├── shapes/
│   └── shape-to-path.ts
├── mapper/
│   └── coordinate-mapper.ts
└── types/
    └── ast.ts          # AST type definitions
```

---

*Stack analysis: 2026-06-26*