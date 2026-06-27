# Coding Conventions

**Analysis Date:** 2026-06-27

## Naming Patterns

**Files:**
- TypeScript utilities: `camelCase.ts` (e.g., `useCreateElement.ts`, `useHistorySnapshot.ts`, `common.ts`)
- Vue components: `PascalCase.vue` (e.g., `Button.vue`, `ColorPicker/index.vue`, `Contextmenu/MenuContent.vue`)
- Config files: `camelCase.ts` (e.g., `shapes.ts`, `chart.ts`, `theme.ts`)
- Types files: `camelCase.ts` (e.g., `slides.ts`, `edit.ts`, `export.ts`)

**Functions:**
- camelCase for all functions: `fillDigit`, `isPC`, `isValidURL`, `createImageElement`
- Hooks use `use` prefix: `useCreateElement`, `useHistorySnapshot`, `useGlobalHotkey`
- Boolean functions often start with `is` or `has`: `isPC()`, `isFloatEqual()`

**Variables:**
- camelCase: `activeElementIdList`, `creatingElement`, `viewportRatio`
- Custom alphabet for nanoid: `const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')` in `src/store/main.ts:45`

**Types and Interfaces:**
- PascalCase: `MainState`, `PPTElement`, `SlideTheme`, `TableCellStyle`, `ElementTypes`
- Enums use PascalCase name with UPPER_SNAKE_CASE values:

```typescript
// src/types/slides.ts:1-23
export const enum ShapePathFormulasKeys {
  ROUND_RECT = 'roundRect',
  ROUND_RECT_DIAGONAL = 'roundRectDiagonal',
  ROUND_RECT_SINGLE = 'roundRectSingle',
  ...
}
```

## Code Style

**Formatting:**
- ESLint handles formatting (Prettier is NOT used - no `.prettierrc*` files found)
- 2-space indentation enforced in ESLint
- No semicolons enforced: `'semi': ['error', 'never']`
- Single quotes preferred with `avoidEscape: true` and `allowTemplateLiterals: true`

**Key ESLint Rules** (from `code/PPTist/.eslintrc.cjs`):
```javascript
'curly': ['error', 'multi-line'],
'eqeqeq': ['error', 'always'],
'semi': ['error', 'never'],
'indent': ['error', 2, { 'SwitchCase': 1 }],
'quotes': ['error', 'single', { 'avoidEscape': true, 'allowTemplateLiterals': true }],
'no-empty': 'error',
'no-else-return': 'error',
'no-console': 'warn',
'prefer-const': 'error',
'no-var': 'error',
'arrow-spacing': 'error',
'brace-style': ['error', 'stroustrup'],
'space-before-function-paren': ['error', { 'named': 'never', 'anonymous': 'never', 'asyncArrow': 'always' }],
'max-depth': ['error', 8],
'max-lines': ['error', 1500],
```

**Linting:**
- Tool: ESLint `^8.49.0` with `eslint-plugin-vue` and `@vue/eslint-config-typescript`
- Run command: `npm run lint`
- Extends: `plugin:vue/vue3-essential`, `eslint:recommended`, `@vue/eslint-config-typescript`

## Import Organization

**Order (from ESLint):**
1. External libraries (lodash, nanoid, vue, pinia)
2. Internal `@/` path aliases (store, hooks, utils, types, configs)

**Path Aliases:**
- `@/` maps to `src/` (configured in tsconfig.json)

```typescript
// src/hooks/useCreateElement.ts:1-9
import { storeToRefs } from 'pinia'
import { nanoid } from 'nanoid'
import { useMainStore, useSlidesStore } from '@/store'
import { getImageSize } from '@/utils/image'
import type { PPTLineElement, PPTElement, TableCell, TableCellStyle, PPTShapeElement, ChartType, PPTVideoElement, PPTAudioElement } from '@/types/slides'
import { type ShapePoolItem, SHAPE_PATH_FORMULAS } from '@/configs/shapes'
```

## Error Handling

**Patterns:**
- Most functions use early returns without try-catch
- No centralized error boundary documented
- Async operations use `.then()` chains:

```typescript
// src/hooks/useCreateElement.ts:58-82
const createImageElement = (src: string) => {
  getImageSize(src).then(({ width, height }) => {
    const scale = height / width
    if (scale < viewportRatio.value && width > viewportSize.value) {
      width = viewportSize.value
      height = width * scale
    }
    ...
  })
}
```

## Comments

**JSDoc Style:**
- Chinese comments for functions: `/** 补足数字位数 */`
- Parameters documented with `@param`: `@param digit 数字`
- Returns documented with `@returns`

```typescript
// src/utils/common.ts:3-10
/**
 * 补足数字位数
 * @param digit 数字
 * @param len 位数
 */
export const fillDigit = (digit: number, len: number) => {
  return padStart('' + digit, len, '0')
}
```

## Function Design

**Size:** ESLint `max-lines: 1500` limits file length
**Parameters:** TypeScript typed parameters, object destructuring preferred for related params
**Return Values:** Explicit return statements, no implicit returns

## Module Design

**Exports:**
- Hooks export default: `export default () => { ... }`
- Store uses named exports: `export const useMainStore = defineStore(...)`
- Types use named exports: `export interface PPTElement { ... }`
- Enums use named exports: `export const enum ElementTypes { ... }`

**No Barrel Files:**
- Each module exports what it defines directly

## Git Hooks

**Husky Configuration:**
- Location: `.husky/commit-msg`
- Hook runs `commitlint -e $HUSKY_GIT_PARAMS` on commit

**Commitlint:**
- Extends `@commitlint/config-conventional`
- Types: `build`, `chore`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`

## Additional Conventions

**Component Naming:**
- Vue components use PascalCase with descriptive names
- Multi-word components allowed (ESLint rule `vue/multi-word-component-names` set to `off`)

**State Management:**
- Pinia stores with `defineStore`
- Store references use `storeToRefs()` for reactivity

```typescript
// src/hooks/useCreateElement.ts:31-36
const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { creatingElement } = storeToRefs(mainStore)
const { theme, viewportRatio, viewportSize } = storeToRefs(slidesStore)
```

**ID Generation:**
- Uses `nanoid` with custom alphabet for shorter IDs: `nanoid(10)`

---

*Convention analysis: 2026-06-27*
