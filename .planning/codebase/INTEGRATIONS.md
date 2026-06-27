# External Integrations

**Analysis Date:** 2026-06-27

## APIs & External Services

**Backend Server (PPTist):**
- Server URL: `https://server.pptist.cn` (production) or `/api` proxy in dev
- Vite proxy config in `vite.config.ts` line 36-42:
  ```typescript
  proxy: {
    '/api': {
      target: 'https://server.pptist.cn',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    }
  }
  ```

**Image Search API:**
- Endpoint: `POST /tools/img_search` (via `services/index.ts`)
- Payload: `ImageSearchPayload` with query, orientation, size, image_type, pagination
- Used in: `src/hooks/useSearch.ts`

**AI PPT Generation APIs:**
- `POST /tools/aippt_outline` - Generate PPT outline from content
- `POST /tools/aippt` - Generate full PPT with style
- `POST /tools/ai_writing` - AI writing assistant
- All use streaming (SSE) via `src/services/fetch.ts`
- Model parameter: `glm-4.7-flash` (hardcoded in `AI_Writing` at `src/services/index.ts:88`)
- Type definitions in `src/types/AIPPT.ts` (AIPPTCover, AIPPTContents, AIPPTTransition, AIPPTContent, AIPPTEnd)

## Data Storage

**Local Database:**
- Dexie 4.0.11 (IndexedDB wrapper)
- Database name: `PPTist_{databaseId}_{timestamp}`
- `databaseId` generated via nanoid in `src/store/main.ts:46`
- Tables: `snapshots`, `writingBoardImgs`
- Auto-cleanup of discarded DBs (12hr expiration) in `src/utils/database.ts`

**Session Storage:**
- Uses localStorage for discarded DB tracking (`LOCALSTORAGE_KEY_DISCARDED_DB`)

## Authentication & Identity

**No external auth provider detected** - App appears to be anonymous/local-first

## Monitoring & Observability

**No external monitoring services detected** (no Sentry, Datadog, etc.)

**Logging:**
- `console.warn` for non-critical issues (ESLint configured `no-console: warn`)
- `message.error()` utility for user-facing errors via `src/utils/message.ts`

## CI/CD & Deployment

**Hosting:**
- GitHub Pages or similar static hosting (build outputs to `dist/`)
- Server: `https://server.pptist.cn` for API

**GitHub Integration:**
- `.github/` directory present for CI workflows

## Environment Configuration

**Env vars:**
- `import.meta.env.MODE` - development/production
- No `.env` file detected (uses hardcoded URLs)

**Required external services:**
- `https://server.pptist.cn` - AI features, image search

## Icon Libraries

**Iconify:**
- `@iconify-json/icon-park-outline` 1.2.4
- `@iconify-json/icon-park-solid` 1.2.4
- Custom collection in `src/assets/icons/`
- Configured via `unplugin-icons/resolver` with prefix `i`

## Third-Party Editor Libraries

**ProseMirror (Rich Text):**
- Version range 1.22.2-1.6.0 across multiple packages
- Packages: state, model, view, commands, keymap, inputrules, history, schema-basic, schema-list, dropcursor, gapcursor
- Used in: `src/views/components/element/ProsemirrorEditor.vue`, `src/utils/prosemirror/`

## Graphics/Chart Libraries

**ECharts 6.0.0:**
- Chart rendering for chart elements
- Config in `src/configs/chart.ts`
- Editor in `src/components/ChartDataEditor.vue`

**SVG Processing:**
- `svg-pathdata` 7.1.0 - SVG path parsing/serialization
- `tinycolor2` 1.6.0 - Color manipulation for SVG/graphics

## PPTX Import/Export

**Export:**
- `pptxgenjs` 3.12.0 - Generate `.pptx` files
- `html-to-image` 1.11.13 - Export to PNG/JPEG
- `file-saver` 2.0.5 - Trigger downloads

**Import:**
- `pptxtojson` 2.0.5 - Parse uploaded PPTX files

## Utility Libraries

| Package | Version | Purpose |
|---------|---------|---------|
| `lodash` | 4.17.21 | General utilities |
| `nanoid` | 5.0.7 | Unique ID generation |
| `axios` | 1.7.9 | HTTP client |
| `mitt` | 3.0.1 | Event bus |
| `vuedraggable` | 4.1.0 | Drag-drop |
| `clipboard` | 2.0.11 | Clipboard API |
| `crypto-js` | 4.2.0 | Encryption |
| `jsonrepair` | 3.13.2 | Fix malformed JSON |
| `number-precision` | 1.6.0 | Float math |
| `animate.css` | 4.1.1 | CSS animations |
| `tippy.js` | 6.3.7 | Tooltips/popovers |

---

*Integration audit: 2026-06-27*
