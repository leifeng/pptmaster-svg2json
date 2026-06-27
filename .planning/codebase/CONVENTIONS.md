# Coding Conventions

**Analysis Date:** 2026-06-27

## Language & Type System

**TypeScript** with strict mode enabled (`"strict": true` in `tsconfig.json`)

**Target:** ES2022, CommonJS modules

## Naming Patterns

**Files:**
- PascalCase for type/interface files: `svg-parser.ts`, `coordinate-mapper.ts`
- kebab-case for general modules: `shape-to-path.ts`

**Types & Interfaces:**
- PascalCase: `SvgParseResult`, `PPTElement`, `SvgElement`
- TypeScript `enum` uses PascalCase for keys: `ShapePathFormulasKeys.ROUND_RECT`

**Functions & Variables:**
- camelCase: `parseSvg()`, `transformToPPTElement()`, `mapCoordinates()`
- Private/helper functions also camelCase: `extractNumber()`, `parsePointsString()`

**Constants:**
- Uppercase with underscores: Not heavily used; most constants defined inline

## Code Style

**Formatting:**
- No Prettier or ESLint configuration detected in the project
- TypeScript-formatted code with 2-space indentation
- Single quotes for strings

**Linting:**
- No ESLint configuration present

**Indentation:** 2 spaces

## TypeScript Patterns

**Interface definitions:**
```typescript
export interface SvgAttrs {
  [key: string]: string | number | undefined;
  fill?: string;
  stroke?: string;
}
```

**Type exports:**
```typescript
export type PPTElement = PPTTextElement | PPTImageElement | PPTShapeElement | ...
```

**Generic type guards:**
```typescript
export function isValidPPTElement(obj: unknown): obj is PPTElement {
  if (typeof obj !== 'object' || obj === null) return false
  // ...
}
```

## Import Organization

**Order (inferred from source files):**
1. External dependencies: `fast-xml-parser`, `uuid`, `picocolors`, `cac`
2. Internal modules: relative paths like `./parser/svg-parser`, `../types/ast`

**Barrel exports:**
```typescript
// src/index.ts
export { parseSvg } from './parser/svg-parser'
export { transformToPPTElement } from './transformer/transform-to-pptel'
export type { PPTElement } from './slides'
```

## Error Handling

**Pattern: try-catch with String coercion**
```typescript
try {
  const ast = parseSvg(svgContent)
  // ...
} catch (err) {
  return { success: false, error: String(err) }
}
```

**Validation returns Result objects:**
```typescript
export interface ConvertResult {
  success: boolean;
  output?: string;
  error?: string;
  elementCount?: number;
}
```

## JSDoc Comments

**Documentation style:**
```typescript
/**
 * Parse stroke-dasharray into line style.
 * Per D-05 (CRITICAL PITFALL 5): normalize "5,3" / "5 3" / "5" variants.
 */
export function parseDashArray(dash: string | undefined): LineStyleType { ... }
```

**When used:**
- Public API functions documented with description and parameter notes
- Complex algorithms reference design document (D-xx) notes
- Not used consistently on internal helper functions

## Function Design

**Size:** Functions are focused; the largest is `transformToPPTElement` at ~580 lines which handles multiple SVG element types via switch/case

**Parameters:**
- Explicit typing required (strict mode)
- Optional parameters with `?` or default values
- Options objects for extensibility: `ConvertOptions`

**Return Values:**
- Never return `null`; use `undefined` or sentinel values
- Transform functions return `null` to skip elements (e.g., non-renderable tags like `defs`)

## Module Design

**Single-responsibility modules:**
- `src/parser/svg-parser.ts` - SVG XML parsing
- `src/transformer/transform-to-pptel.ts` - AST to PPTElement transformation
- `src/mapper/coordinate-mapper.ts` - Coordinate calculations
- `src/shapes/shape-to-path.ts` - Shape to path conversion
- `src/slides.ts` - Type definitions for PPT elements

**Internal helper functions:**
- Module-scoped helpers (not exported) for parsing details
- Example in `src/parser/svg-parser.ts`: `extractTextContent()`, `convertToSvgElement()`

## Logging

**Framework:** `picocolors` for colored CLI output
```typescript
import pc from 'picocolors'
console.error(pc.red('Error: ...'))
console.error(pc.cyan('Processing...'))
```

**Output:** Uses `console.error` for status messages (CLI tool pattern)

## Comments

**Reference comments:**
```typescript
// Per D-03: path elements keep original d attribute unchanged
const d = typeof element.attrs.d === 'string' ? element.attrs.d : ''
```

**Skip/progress comments:**
```typescript
} catch {
  // skip files we can't stat
}
```

---

*Convention analysis: 2026-06-27*