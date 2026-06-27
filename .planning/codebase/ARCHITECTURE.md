<!-- refreshed: 2026-06-27 -->
# Architecture

**Analysis Date:** 2026-06-27

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                         App.vue                             │
│            (Root component - view routing)                  │
├──────────────────┬──────────────────┬───────────────────────┤
│   Editor View    │   Screen View    │    Mobile View        │
│  (PC Editor)     │  (Presentation)  │   (Mobile Editor)     │
│ src/views/Editor │  src/views/Screen│  src/views/Mobile     │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Pinia Store Layer                        │
│  useMainStore  │  useSlidesStore  │  useSnapshotStore       │
│  src/store/*.ts                                               │
└────────┬───────────────────────┬────────────────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│               Business Logic (Hooks)                        │
│  useCreateElement  │  useSelectElement  │  useDeleteElement │
│  useCopyAndPaste   │  useHistorySnapshot │  useExport       │
│  src/hooks/*.ts                                             │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              Element Components (Canvas)                    │
│  TextElement  │  ShapeElement  │  ImageElement  │  Chart   │
│  src/views/Editor/Canvas/EditableElement.vue                │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App | Root view routing based on device type | `src/App.vue` |
| Editor | Main PC editor layout with header, thumbnails, canvas, toolbar | `src/views/Editor/index.vue` |
| Canvas | Drawing surface with viewport, element rendering, selection | `src/views/Editor/Canvas/index.vue` |
| Thumbnails | Slide navigation panel | `src/views/Editor/Thumbnails/index.vue` |
| Toolbar | Right-side style/position/animation panels | `src/views/Editor/Toolbar/index.vue` |
| Screen | Presentation/screening mode | `src/views/Screen/index.vue` |

## Pattern Overview

**Overall:** Vue 3 Composition API + Pinia Store-Driven Architecture

**Key Characteristics:**
- Vue 3 with `<script setup>` Composition API throughout
- Pinia stores drive all application state (no Vuex)
- Composables (hooks) encapsulate business logic outside components
- Element-based canvas rendering with virtual DOM list
- Context-based dependency injection using Vue's `provide/inject`

## Layers

**View Layer:**
- Purpose: UI rendering and user interaction
- Location: `src/views/`
- Contains: Editor, Canvas, Toolbar, Thumbnails, Screen, Mobile views
- Depends on: Store state, Hooks
- Used by: App.vue root component

**Store Layer (Pinia):**
- Purpose: Centralized state management
- Location: `src/store/`
- Contains: main.ts (UI state), slides.ts (presentation data), snapshot.ts (history), keyboard.ts (hotkeys), screen.ts (screening)
- Depends on: Types from `src/types/`
- Used by: All components and hooks via `storeToRefs`

**Hook/Composables Layer:**
- Purpose: Business logic encapsulation and code reuse
- Location: `src/hooks/`
- Contains: Element operations (create, delete, select, copy/paste), canvas operations, import/export, AI features
- Depends on: Pinia stores, utils
- Used by: Components in views/

**Config Layer:**
- Purpose: Static configuration data
- Location: `src/configs/`
- Contains: shapes.ts (SVG path formulas), theme.ts, hotkey.ts, animation.ts, font.ts

**Utils Layer:**
- Purpose: Pure utility functions
- Location: `src/utils/`
- Contains: htmlParser (ProseMirror integration), prosemirror (rich text editing), element.ts (element helpers), image.ts, clipboard.ts

## Data Flow

### Primary Request Path (Element Selection)

1. **User clicks element** - `Canvas/index.vue:handleClickBlankArea` (`src/views/Editor/Canvas/index.vue:216`)
2. **SelectElement hook invoked** - `useSelectAndMoveElement` from `Canvas/hooks/useSelectElement.ts`
3. **Store updated** - `mainStore.setActiveElementIdList([id])` from `src/store/main.ts:101`
4. **Component re-renders** - `activeElementIdList` is `storeToRefs` reactive, triggering Vue reactivity

### Element Creation Path

1. **Trigger action** - `useCreateElement.createTextElement()` from `src/hooks/useCreateElement.ts:...`
2. **Element generated** - Creates `PPTElement` object with nanoid, position, default styles
3. **Store updated** - `slidesStore.addElement(element)` from `src/store/slides.ts:199`
4. **Canvas re-renders** - `watchEffect` in Canvas updates `elementList` from `currentSlide` (line 183)

### Export Path

1. **Export dialog opened** - `mainStore.setDialogForExport(type)` from `src/store/main.ts:188`
2. **Format selected** - ExportPPTX, ExportPDF, ExportImage, ExportJSON
3. **useExport hook** - `src/hooks/useExport.ts` handles conversion using pptxgenjs, html-to-image

**State Management:**
- Pinia stores with `storeToRefs` for reactive destructuring
- `slidesStore.currentSlide` getter returns current page data
- `mainStore.activeElementList` getter filters elements by selected IDs
- History snapshots stored in IndexedDB via Dexie (see `src/utils/database.ts`)

## Key Abstractions

**SlidesStore:**
- Purpose: All presentation data (slides, theme, templates, current index)
- Examples: `src/store/slides.ts`
- Pattern: Pinia defineStore with state, getters, actions

**MainStore:**
- Purpose: Editor UI state (selection, canvas scale, dialogs, format painters)
- Examples: `src/store/main.ts`
- Pattern: Pinia defineStore with reactive state

**useSelectElement (Hook):**
- Purpose: Element selection business logic
- Examples: `src/hooks/useSelectElement.ts`, `src/views/Editor/Canvas/hooks/useSelectElement.ts`
- Pattern: Vue composable returning functions and state

**EditableElement:**
- Purpose: Renders any PPT element type based on `elementInfo.type`
- Examples: `src/views/Editor/Canvas/EditableElement.vue`
- Pattern: Dynamic component rendering with type switch

## Entry Points

**Main Entry:**
- Location: `src/main.ts`
- Triggers: App initialization
- Responsibilities: Vue app creation, Pinia setup, directive registration, global CSS import

**Root Component:**
- Location: `src/App.vue`
- Triggers: On mount loads mock slides data
- Responsibilities: View routing (Editor/Screen/Mobile), audience mode detection, IndexedDB cleanup

## Architectural Constraints

- **Threading:** Single-threaded JavaScript, no web workers detected
- **Global state:** Pinia stores act as global state (singleton pattern per store)
- **Circular imports:** Potential between hooks and stores (hooks import stores, stores import types which may reference hooks)
- **No router:** This is a single-page app with view switching via conditional rendering in App.vue, not vue-router

## Anti-Patterns

### Direct Store Mutation in Components

**What happens:** Components sometimes directly modify store state instead of calling actions
**Why it's wrong:** Inconsistent data flow, harder to track state changes
**Do this instead:** Use store actions like `mainStore.setActiveElementIdList()` in `src/store/main.ts:101`

### Large Canvas Component

**What happens:** `Canvas/index.vue` is ~400 lines with complex template and many responsibilities
**Why it's wrong:** Hard to test, multiple concerns mixed
**Do this instead:** Extract more hooks like `useMouseSelection`, `useViewportSize` already done in `src/views/Editor/Canvas/hooks/`

## Error Handling

**Strategy:** Try-catch with user-facing message via `message.error()` utility

**Patterns:**
- API calls wrapped in try-catch (`src/services/axios.ts`)
- Export failures show user notification via `message` from `src/utils/message.ts`
- Element operations validate inputs before store updates

## Cross-Cutting Concerns

**Logging:** Minimal - uses `console` for debug in development
**Validation:** Element type checking via `ElementTypes` enum in `src/types/slides.ts`
**Authentication:** Not applicable (local-only app)

---

*Architecture analysis: 2026-06-27*