# Codebase Concerns

**Analysis Date:** 2026-06-27

## Project Scale

- **Source files:** 332 (.ts, .tsx, .vue files)
- **Direct dependencies:** 59 packages
- **Node.js requirement:** >= 20
- **License:** AGPL-3.0

## Tech Debt

### PPTX Import Functionality

- **Issue:** Import function has no suitable solution and is still under investigation
- **Evidence:** `doc/Q&A.md` states "导入功能目前暂时没有合适的解决方案，还在调研和观望中"
- **Impact:** Users cannot import existing PPTX files into the application
- **Fix approach:** Author suggests参考 https://github.com/pipipi-pikachu/pptx2json as a starting point

### PPTX Export Limitations

- **Issue:** Export relies entirely on PptxGenJS library capabilities
- **Evidence:** `doc/Q&A.md` - "该功能依赖 PptxGenJS，对于该库本身无法实现的部分（如动画），本项目也无能为力"
- **Impact:** Animations and advanced features cannot be exported to PPTX
- **Fix approach:** Fork/modify PptxGenJS or find alternative export library

### Base64 Image Performance

- **Issue:** Local images are stored as Base64, causing massive data sizes
- **Evidence:** `doc/Q&A.md` - "插入本地图片实际引用的是Base64，导致数据体积非常大"
- **Files affected:** `src/store/slides.ts` (slides data store)
- **Impact:** Performance degradation when inserting multiple images, large localStorage/IndexedDB storage
- **Fix approach:** Implement backend image upload service in production

## Known Issues

### No Data Persistence

- **Symptoms:** Browser refresh clears all data
- **Evidence:** `doc/Q&A.md` - "该项目是纯前端部署的，没有后台，不会保存数据"
- **Impact:** Cannot use as a real application without backend integration
- **Workaround:** Manual export to JSON/PPTX before closing browser

### PDF Export Style Differences

- **Problem:** Exported PDF styles differ from actual display
- **Evidence:** `doc/Q&A.md` - "打印 / 导出 PDF 样式与实际有出入"
- **Recommendation:** "建议在正式环境中采用后端生成PDF的方案效果更佳（如puppeteer）"
- **Files:** Likely in `src/views/Editor/` export functionality

### Safari Compatibility Issues

- **Problem:** Partial compatibility issues under Safari
- **Evidence:** `doc/Q&A.md` - "在Safari下可能存在部分兼容性问题。不兼容IE"
- **Impact:** Incomplete functionality for Safari users
- **Workaround:** Use Chrome or Firefox

### Mobile Feature Gaps

- **Problem:** Mobile version has severely limited features
- **Evidence:** `doc/Q&A.md` - "个人将移动端定位为：简单进行一些临时处理的应急使用"
- **Supported on mobile:** Add/delete/copy/note/undo redo pages, insert text/images/shapes, basic element operations
- **Not supported:** Most advanced editing features
- **Workaround:** Use desktop mode on mobile (even worse experience)

## Security Considerations

### JSON Import Security Risk

- **Risk:** Direct JSON import exposes users to data structure manipulation
- **Evidence:** `doc/Q&A.md` - "出于安全等原因，个人并不建议将这种功能在前端直接暴露给用户"
- **Files:** `src/services/` (API methods), `src/store/slides.ts`
- **Current mitigation:** Author recommends implementing validation on server side
- **Recommendations:** Add strict schema validation, sanitize input data

### AGPL-3.0 License Compliance

- **Risk:** Using this code commercially requires AGPL compliance or paid licensing
- **Evidence:** README.md - commercial license pricing: 2999元/year or 5699元 permanent
- **Blacklist exists:** `doc/Blacklist.md` documents at least one violator (蚂蚁PPT)
- **Impact:** Legal risk for commercial projects based on this code

## Performance Bottlenecks

### Large Template Files

- **Problem:** Public mocks contain very large JSON files (template_1.json through template_6.json)
- **Evidence:** Each template file is a single long line containing full presentation data
- **Impact:** Slow loading, memory overhead in editor
- **Location:** `public/mocks/template_*.json`

### IndexedDB Storage with Dexie

- **Technology:** Uses Dexie 4.x for local storage
- **Evidence:** `package.json` - `"dexie": "^4.0.11"`
- **Risk:** Browser storage limits may be hit with large presentations

## Fragile Areas

### ProseMirror Integration for Rich Text

- **Files:** Multiple prosemirror-* packages in dependencies
- **Why fragile:** ProseMirror is a complex library with many integration points
- **Files:** `src/views/Editor/`, `src/components/Contextmenu/`
- **Safe modification:** Test all text editing scenarios after changes

### Theme Application Logic

- **Problem:** Applying preset themes only affects NEW elements/pages
- **Evidence:** `doc/Q&A.md` - "设置预置主题的作用是使新添加的元素和页面应用主题样式，不会对已有的元素和页面生效"
- **Workaround exists:** "应用主题到全部" feature
- **Risk:** User confusion, unexpected behavior

## Dependencies at Risk

### PptxGenJS (^3.12.0)

- **Risk:** Single point of failure for PPTX export
- **Evidence:** `package.json` - `"pptxgenjs": "^3.12.0"`
- **Impact:** Export quality depends entirely on this library's capabilities
- **No alternative:** Author acknowledges no good alternatives exist

### pptxtojson (^2.0.5)

- **Risk:** Experimental, not production-ready
- **Evidence:** `package.json` - `"pptxtojson": "^2.0.5"`
- **Purpose:** PPTX import (not yet functional)
- **Alternative needed:** More robust PPTX parsing solution

### vue-tsc (^2.0.29)

- **Risk:** Using `--build --force` flag in type-check script
- **Evidence:** `package.json` scripts - `"type-check": "vue-tsc --build --force"`
- **Impact:** May mask type errors in development

## Missing Critical Features

### No Backend/API Layer

- **Problem:** Project explicitly has no backend
- **Blocks:** Any production deployment requiring data persistence, user management, collaboration
- **Impact:** Cannot be used as-is for multi-user scenarios

### No Real-time Collaboration

- **Problem:** Single-user editor only
- **Blocks:** Team editing scenarios
- **Priority:** Low (not project goal per README)

### Incomplete AIPPT Implementation

- **Problem:** AI PPT is positioned as a DEMO only
- **Evidence:** `doc/Q&A.md` - "目前此功能仅作参考，内部实现了最基础的AIPPT生成逻辑"
- **Missing:** Production-ready AI workflow, image generation integration

## Test Coverage Gaps

### No Test Infrastructure Detected

- **What's not tested:** No testing framework configured
- **Evidence:** No jest.config.*, vitest.config.*, or similar found in project root
- **Risk:** High - any refactoring could break existing functionality unnoticed
- **Priority:** High

### No E2E Tests

- **What's not tested:** Full user workflows (create presentation, add elements, export)
- **Files:** None
- **Risk:** Critical paths like export/import may break without detection

---

*Concerns audit: 2026-06-27*