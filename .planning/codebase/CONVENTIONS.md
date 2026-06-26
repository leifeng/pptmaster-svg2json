# Coding Conventions

**Analysis Date:** 2026-06-26

## Language

**TypeScript** - Strict mode enabled (`"strict": true` in tsconfig.json)
- Target: ES2022
- Module: CommonJS
- ModuleResolution: node

## Type Definitions

**Interfaces for object shapes:**
```typescript
export interface ConvertResult {
  success: boolean;
  output?: string;
  error?: string;
  elementCount?: number;
}
```

**Type aliases for unions:**
```typescript
export type PPTElement = PPTTextElement | PPTImageElement | PPTShapeElement | PPTLineElement | PPTChartElement | PPTTableElement | PPTLatexElement | PPTVideoElement | PPTAudioElement
```

**Const enums for constants:**
```typescript
export const enum ElementTypes {
  TEXT = 'text',
  IMAGE = 'image',
  // ...
}
```

## Naming Conventions

**Files:** camelCase (e.g., `svg-parser.ts`, `transform-to-pptel.ts`)
**Types/Interfaces:** PascalCase (e.g., `ConvertResult`, `PPTElement`)
**Functions:** camelCase (e.g., `parseSvg`, `convert`)
**Variables:** camelCase
**Constants:** SCREAMING_SNAKE_CASE for enum values

## Function Design

**Async functions return explicit Promise types:**
```typescript
export async function convert(svgContent: string, options?: ConvertOptions): Promise<ConvertResult>
```

**Error handling pattern:**
```typescript
try {
  // work
} catch (err) {
  return { success: false, error: String(err) }
}
```

## Module Exports

**Named exports preferred:**
```typescript
export { parseSvg } from './parser/svg-parser'
export type { PPTElement } from './slides'
```

## Code Style

**Formatting:** Managed by TypeScript compiler (tsconfig.json strict settings)

**Key tsconfig settings:**
- `strict: true` - all strict type checking options
- `esModuleInterop: true` - allow default imports from CommonJS
- `forceConsistentCasingInFileNames: true`
- `declaration: true` - generate .d.ts files
- `sourceMap: true` - generate source maps

## Console Output

**Use picocolors for colored output:**
```typescript
import pc from 'picocolors'
console.error(pc.cyan('Processing...'))
console.error(pc.green('Success'))
console.error(pc.red('Failed'))
```

## Error Messages

**Always convert errors to strings:**
```typescript
const errorMsg = 'File read error: ' + String(err)
```

## Comments

**JSDoc style for interfaces and functions:**
```typescript
/**
 * Round-trip test: SVG -> AST -> JSON -> re-parse -> validate
 */
export function roundTripTest(svgContent: string): { valid: boolean, errors: string[] }
```

**Chinese comments for domain concepts in slides.ts:**
```typescript
/**
 * 渐变
 * 
 * type: 渐变类型（径向、线性）
 */
```

---

*Convention analysis: 2026-06-26*
