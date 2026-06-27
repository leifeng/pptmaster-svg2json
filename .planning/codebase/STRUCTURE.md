<!-- refreshed: 2026-06-27 -->
# Codebase Structure

**Analysis Date:** 2026-06-27

## Directory Layout

```
E:\git\svg2json\code\PPTist/
├── src/
│   ├── main.ts                    # Vue app entry point
│   ├── App.vue                    # Root component (view routing)
│   ├── assets/                    # Static resources
│   │   ├── fonts/
│   │   ├── icons/
│   │   └── styles/                # SCSS: global, prosemirror, font
│   ├── components/                # Shared UI components
│   │   ├── ColorPicker/
│   │   ├── Contextmenu/
│   │   ├── FullscreenSpin/
│   │   ├── LaTeXEditor/
│   │   └── Modal/
│   ├── configs/                   # Static configuration data
│   │   ├── animation.ts           # Animation presets
│   │   ├── chart.ts               # Chart type configs
│   │   ├── element.ts             # Element default values
│   │   ├── font.ts                # Font family list
│   │   ├── hotkey.ts              # Keyboard shortcut definitions
│   │   ├── shapes.ts              # SVG shape path formulas
│   │   ├── storage.ts             # LocalStorage keys
│   │   ├── symbol.ts              # Special character sets
│   │   └── theme.ts               # Theme color presets
│   ├── directive/                 # Vue custom directives
│   │   ├── clickOutside.ts
│   │   ├── contextmenu.ts
│   │   ├── loading.ts
│   │   └── tooltip.ts
│   ├── hooks/                     # Business logic composables
│   │   ├── useCreateElement.ts    # Element creation
│   │   ├── useDeleteElement.ts
│   │   ├── useSelectElement.ts
│   │   ├── useCopyAndPasteElement.ts
│   │   ├── useExport.ts           # Export to PPTX/PDF/JSON
│   │   ├── useImport.ts           # Import from PPTX
│   │   ├── useHistorySnapshot.ts  # Undo/redo via IndexedDB
│   │   └── [40+ other hooks]
│   ├── services/                  # API/network layer
│   │   ├── axios.ts               # HTTP client wrapper
│   │   └── fetch.ts
│   ├── store/                     # Pinia state management
│   │   ├── index.ts               # Store exports barrel
│   │   ├── main.ts                # UI state (selection, dialogs)
│   │   ├── slides.ts              # Presentation data
│   │   ├── snapshot.ts            # History snapshots
│   │   ├── keyboard.ts            # Keyboard state
│   │   └── screen.ts              # Screening mode state
│   ├── types/                     # TypeScript type definitions
│   │   ├── slides.ts              # Slide, Element, Theme types
│   │   ├── edit.ts                # Editor-specific types
│   │   ├── export.ts              # Export dialog types
│   │   └── [other type files]
│   ├── utils/                     # Pure utility functions
│   │   ├── common.ts              # isPC(), throttle helpers
│   │   ├── element.ts             # Element manipulation helpers
│   │   ├── image.ts               # Image processing
│   │   ├── clipboard.ts           # Clipboard operations
│   │   ├── database.ts            # IndexedDB via Dexie
│   │   ├── emitter.ts             # Event emitter (mitt)
│   │   ├── htmlParser/            # HTML parsing for rich text
│   │   └── prosemirror/           # Rich text editor integration
│   └── views/                     # Page-level components
│       ├── Editor/                # Main PC editor
│       │   ├── index.vue          # Editor layout container
│       │   ├── EditorHeader/      # Top header bar
│       │   ├── Canvas/            # Main drawing surface
│       │   │   ├── index.vue      # Canvas root component
│       │   │   ├── hooks/         # Canvas-specific composables
│       │   │   ├── Operate/       # Element resize/rotate handles
│       │   │   └── ElementFloatLayer/  # Floating toolbar
│       │   ├── CanvasTool/        # Left tool palette
│       │   ├── Thumbnails/        # Slide thumbnails panel
│       │   ├── Toolbar/           # Right property panels
│       │   └── [dialog components]
│       ├── Screen/                # Presentation/screening mode
│       └── Mobile/                # Mobile editor view
├── public/
│   ├── imgs/                      # Template cover images
│   └── mocks/                     # Mock JSON data for slides
├── package.json                   # Vue 3.5, Pinia 3, Vite 5
└── tsconfig.json
```

## Directory Purposes

**src/views/Editor:**
- Purpose: Main presentation editor interface
- Contains: Canvas (drawing), Toolbar (properties), Thumbnails (navigation), dialogs
- Key files: `src/views/Editor/index.vue` (layout), `src/views/Editor/Canvas/index.vue` (canvas)

**src/hooks:**
- Purpose: Business logic as Vue composables
- Contains: 40+ hooks for element operations, canvas interactions, import/export
- Key files: `src/hooks/useCreateElement.ts`, `src/hooks/useSelectElement.ts`, `src/hooks/useExport.ts`

**src/store:**
- Purpose: Centralized state management via Pinia
- Contains: main.ts (UI), slides.ts (data), snapshot.ts (history), keyboard.ts, screen.ts
- Key files: `src/store/slides.ts` (slides array, currentSlide getter, addSlide, updateElement)

**src/components:**
- Purpose: Reusable UI components not tied to editor-specific logic
- Contains: ColorPicker, Contextmenu, FullscreenSpin, LaTeXEditor, Modal

**src/configs:**
- Purpose: Static configuration data
- Contains: shapes.ts (SVG path formulas), theme presets, hotkey mappings

**src/utils:**
- Purpose: Pure utility functions
- Contains: htmlParser (for rich text), prosemirror (editor schema/commands), element helpers

## Key File Locations

**Entry Points:**
- `src/main.ts`: Vue app initialization, Pinia setup, directive registration
- `src/App.vue`: Root component, view routing based on device/screening state

**Configuration:**
- `src/configs/shapes.ts`: SVG path data for all shape types
- `src/configs/hotkey.ts`: Keyboard shortcut key codes
- `src/configs/storage.ts`: LocalStorage key constants

**Core Logic:**
- `src/store/slides.ts`: Presentation data (slides, theme, templates)
- `src/hooks/useCreateElement.ts`: Element creation logic
- `src/views/Editor/Canvas/index.vue`: Main canvas rendering

**Testing:**
- Not detected (no __tests__ directories or test files found)

## Naming Conventions

**Files:**
- Vue components: PascalCase (`EditorHeader.vue`, `ElementFloatLayer.vue`)
- TypeScript files: camelCase or PascalCase for types (`useSelectElement.ts`, `slides.ts`)
- Config files: camelCase (`hotkey.ts`, `storage.ts`)

**Directories:**
- PascalCase for component directories (`EditorHeader/`, `CanvasTool/`)
- camelCase for utility directories (`hooks/`, `utils/`, `configs/`)

**Variables and Functions:**
- camelCase: `activeElementIdList`, `createTextElement`, `setActiveElementIdList`
- Constants: SCREAMING_SNAKE_CASE for true constants in configs

**Types:**
- PascalCase: `PPTElement`, `SlideTheme`, `ElementTypes` (enum)

## Where to Add New Code

**New Feature Hook:**
- Primary code: `src/hooks/useNewFeature.ts`
- Follow pattern of existing hooks like `src/hooks/useSelectElement.ts`

**New Element Type:**
- Implementation: `src/views/Editor/Canvas/EditableElement.vue` (add case in type switch)
- Element component: `src/views/components/element/NewElementType/`
- Store updates: `src/store/slides.ts` (updateElement, addElement actions)

**New Toolbar Panel:**
- Implementation: `src/views/Editor/Toolbar/ElementStylePanel/NewPanel.vue`
- Import and add to Toolbar/index.vue

**New Store Module:**
- Implementation: `src/store/newStore.ts` (follow Pinia defineStore pattern)
- Export from `src/store/index.ts`

**Utilities:**
- Shared helpers: `src/utils/newUtility.ts`
- If Prosemirror-related: `src/utils/prosemirror/`

## Special Directories

**src/views/Editor/Canvas/hooks:**
- Purpose: Canvas-specific composables that use canvas refs and viewport state
- Generated: No
- Committed: Yes
- Contains: useViewportSize.ts, useMouseSelection.ts, useSelectElement.ts, useScaleElement.ts, useRotateElement.ts, useDragElement.ts

**src/utils/prosemirror:**
- Purpose: Rich text editing integration using ProseMirror
- Generated: No
- Committed: Yes
- Contains: schema definitions, commands (setTextAlign, toggleList), plugins (keymap, inputrules)

**src/configs/shapes.ts:**
- Purpose: Pre-defined SVG path data for 20+ shape types
- Generated: No (hand-coded paths)
- Committed: Yes
- Contains: ShapePathFormulasKeys enum, shape path string constants

---

*Structure analysis: 2026-06-27*