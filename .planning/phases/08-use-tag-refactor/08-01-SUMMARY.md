---
phase: 08
plan: "01"
subsystem: svg-parser
tags: [refactor, svg-use-handler, external-svg]
dependency_graph:
  requires: []
  provides: [USE-01, USE-02, USE-03]
  affects: [src/parser/svg-parser.ts, src/index.ts, src/cli.ts]
tech_stack:
  added:
    - "@resvg/resvg-js for SVG to PNG rendering"
  patterns:
    - "autoEmbedIcons now accepts svgFilePath for relative path resolution"
key_files:
  created:
    - src/svg-use-handler.ts
    - test-use-external.svg
  modified:
    - src/parser/svg-parser.ts
    - src/index.ts
    - src/cli.ts
decisions:
  - id: USE-01
    decision: Extract autoEmbedIcons to independent module src/svg-use-handler.ts
  - id: USE-02
    decision: Use resvg-js to render external SVG to PNG, convert to base64 image element
  - id: USE-03
    decision: Relative paths resolved based on main SVG file location via svgFilePath parameter
metrics:
  duration: "~15 minutes"
  completed: "2026-07-10T10:02:00Z"
  tasks_completed: 4
status: complete
---

# Phase 08 Plan 01: Extract SVG use tag handler and add external SVG support

## Summary

将 `autoEmbedIcons` 函数从 `svg-parser.ts` 提取到独立模块，并增强支持外部 SVG 文件引用（通过 `href` 属性）自动转为内嵌图片。

## One-liner

SVG use tag handler extracted to independent module with external SVG href support using resvg-js

---

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Extract autoEmbedIcons to svg-use-handler.ts | - | src/svg-use-handler.ts (new), src/parser/svg-parser.ts |
| 2 | Add external SVG href support | - | src/svg-use-handler.ts |
| 3 | Update parseSvg signature with svgFilePath | - | src/parser/svg-parser.ts, src/index.ts, src/cli.ts |
| 4 | Test external SVG reference | - | test-use-external.svg |

---

## What Was Done

### Task 1: Refactor - Extract autoEmbedIcons

- Created `src/svg-use-handler.ts` containing the extracted `autoEmbedIcons` function
- Removed `autoEmbedIcons` function definition from `src/parser/svg-parser.ts`
- Added import in `svg-parser.ts`: `import { autoEmbedIcons } from '../svg-use-handler'`
- `npm run build` succeeded
- `npm test` shows same 14 pre-existing failures (unrelated to this change)

### Task 2: Feature - Add external SVG href support

Enhanced `autoEmbedIcons` in `svg-use-handler.ts` to support `<use href="xxx.svg">` patterns:

- Detects `<use href="...">` or `<use xlink:href="...">` patterns
- For external SVG: reads file, renders to PNG via resvg-js, converts to base64 `<image>` element
- Graceful degradation: keeps original tag + warning if resolution fails
- Relative path resolution via svgFilePath parameter

### Task 3: Refactor - Update parseSvg signature

- Updated `parseSvg(xmlString: string, svgFilePath?: string)` to accept optional file path
- Updated `convert()` in `index.ts` to accept `svgFilePath` in options
- Updated CLI `processFile()` to pass file path when calling `convert()`

### Task 4: Test

- Created `test-use-external.svg` with external href reference
- Verified transformation works: `<use href="test-icon-debug.svg">` converts to base64 PNG image element

---

## Verification Results

### Build
```
npm run build - SUCCESS (no compilation errors)
```

### Tests
```
npm test - 137 passed, 14 failed (pre-existing failures unrelated to this change)
```

### Manual Test
```bash
node dist/svg2json/cli.js test-use-external.svg
```
- External SVG href correctly converted to base64 PNG image element
- Existing `data-icon` functionality preserved

---

## Deviations from Plan

None - plan executed exactly as written.

---

## Known Stubs

None.

---

## Threat Flags

None.

---

## Self-Check: PASSED

- [x] src/svg-use-handler.ts exists and contains autoEmbedIcons function
- [x] src/parser/svg-parser.ts no longer contains autoEmbedIcons function definition
- [x] npm run build succeeds
- [x] npm test shows same pre-existing failures (not caused by this change)
- [x] External SVG href converted to base64 PNG image
- [x] Relative paths resolved based on main SVG file location
- [x] Graceful degradation on render failure (warning + original tag preserved)
- [x] Existing data-icon functionality preserved
