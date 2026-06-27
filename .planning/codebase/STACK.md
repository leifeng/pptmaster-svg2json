# Technology Stack

**Analysis Date:** 2026-06-27

## Languages

**Primary:**
- TypeScript 5.3 - All source code in `code/PPTist/src/` directory
- Vue 3.5.17 - UI framework with `<script setup>` composition API

**Secondary:**
- SCSS/Sass 1.69.6 - Styling, configured in `vite.config.ts`

## Runtime

**Environment:**
- Node.js 18+ (via `@tsconfig/node18` in `package.json`)
- Browser (ESM modules, `"type": "module"` in `package.json`)

**Package Manager:**
- npm (lockfile: `package-lock.json`)
- npm-run-all2 6.1.1 for running parallel scripts

## Frameworks

**Core:**
- Vue 3.5.17 - Progressive JavaScript framework
- Pinia 3.0.2 - State management (stores in `src/store/`)
- ProseMirror 1.22.2-1.6.0 - Rich text editing (packages: state, model, view, commands, keymap, inputrules, history, schema-basic, schema-list, dropcursor, gapcursor)

**UI Components:**
- Custom component library in `src/components/` (Button, Modal, Drawer, Select, Tabs, ColorPicker, etc.)
- Iconify icons (`@iconify-json/icon-park-outline`, `@iconify-json/icon-park-solid`)
- tippy.js 6.3.7 - Tooltip/popover positioning

**Charts:**
- ECharts 6.0.0 - Chart rendering via `src/components/ChartDataEditor.vue` and `src/configs/chart.ts`

**Animation:**
- Animate.css 4.1.1 - CSS animations
- CSS transitions/keyframes via SCSS

## Build/Dev Tools

**Bundler:**
- Vite 5.3.5 - Development server and build tool
- `vite.config.ts` config with Vue plugin, icon plugins, SCSS preprocessor

**Type Checking:**
- TypeScript 5.3.0
- vue-tsc 2.0.29 for Vue TS checking
- `@tsconfig/node18` for Node.js type definitions

**Linting:**
- ESLint 8.49.0
- `eslint-plugin-vue` 9.17.0
- `@vue/eslint-config-typescript` 12.0.0
- `@rushstack/eslint-patch` 1.3.3

**Preprocessing:**
- Sass 1.69.6 - SCSS compilation with custom imports (`variable.scss`, `mixin.scss`)

**Code Generation:**
- unplugin-icons 22.5.0 - Auto-generated icon components from `src/assets/icons/`
- unplugin-vue-components 30.0.0 - Auto-imported Vue components

**Git Hooks:**
- husky 8.0.3 - Git hooks via `prepare` script
- `@commitlint/cli` 18.4.3 with `config-conventional` 18.4.3

## Key Dependencies

**PPT Processing:**
- `pptxgenjs` 3.12.0 - Generate PPTX files
- `pptxtojson` 2.0.5 - Convert PPTX to JSON
- `html-to-image` 1.11.13 - Export slides to images

**SVG/Graphics:**
- `svg-pathdata` 7.1.0 - SVG path manipulation
- `tinycolor2` 1.6.0 - Color manipulation

**Data/Storage:**
- Dexie 4.0.11 - IndexedDB wrapper for local storage (`src/utils/database.ts`)
- `lodash` 4.17.21 - Utility functions
- `nanoid` 5.0.7 - Unique ID generation
- `number-precision` 1.6.0 - Float math

**HTTP:**
- Axios 1.7.9 - HTTP client with 300s timeout (`src/services/axios.ts`)
- Native Fetch API with streaming support (`src/services/fetch.ts`)

**Editor:**
- `mitt` 3.0.1 - Event emitter for component communication
- `vuedraggable` 4.1.0 - Drag and drop
- `file-saver` 2.0.5 - File download
- `clipboard` 2.0.11 - Clipboard API
- `crypto-js` 4.2.0 - Encryption
- `jsonrepair` 3.13.2 - JSON fixing
- `hfmath` 0.0.2 - Math library

## Configuration

**TypeScript:**
- `tsconfig.json` - Project references structure
- `tsconfig.app.json` - Vue app compilation options
- `tsconfig.node.json` - Node.js compilation

**Build:**
- `vite.config.ts` - Vite bundler configuration with aliases (`@` -> `./src`)
- Proxy configuration for `/api` -> `https://server.pptist.cn` in dev mode

**Code Style:**
- `.eslintrc.cjs` - ESLint rules (semi, quotes, indent, etc.)

## Scripts

```json
"dev": "vite"                    // Start dev server on 127.0.0.1:5173
"build": "vue-tsc + vite build"  // Type check then build
"preview": "vite preview"        // Preview production build
"lint": "eslint --fix"           // Lint with auto-fix
"prepare": "husky install"       // Install git hooks
```

## Platform Requirements

**Development:**
- Node.js 18+
- npm 6+

**Production:**
- Modern browser with ESM support
- IndexedDB support (for local storage)

---

*Stack analysis: 2026-06-27*
