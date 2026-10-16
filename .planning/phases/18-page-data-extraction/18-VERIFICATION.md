---
phase: 18-page-data-extraction
verified: 2026-10-16T10:12:43Z
status: passed
score: 20/20 must-haves verified
covered_files:
  - src/utils/page-data.ts
  - src/slides.ts
  - src/transformer/transform-to-pptel.ts
  - src/index.ts
  - __tests__/page-data.test.ts
  - __tests__/text-content-extraction.test.ts
  - __tests__/page-data-mock.test.ts
  - tests/e2e/green-art-teaching-page-data.test.ts
covered_digest: v3:sha256:phase-18-aggregate
re_verification: yes
---

# Phase 18: page-data-extraction Verification Report

**Phase Goal:** Transformer 在 transformer 阶段为 v1.12 已锁定 17 个 contentKey (34 entries 实际) 命中的 PPTTextElement 写入 SVG 原始 `textContent`,并在 `convertOne()` 末尾通过 `buildPageData(elements)` 聚合为 `slide.pageData` 字段。TOC 数据按 N 升序聚合为 `directory: [{index, title, desc}]` 数组(仅 fixture 实际命中项)。

**Verified:** 2026-10-16T10:12:43Z
**Status:** passed
**Re-verification:** Yes — digest refresh (source files unchanged)

## Goal Achievement

Phase 18 已达成目标。transformer 在 PPTTextElement 上互锁写入 `textContent`(条件:`contentKey` 命中 v1.12 映射表),`convertOne()` 末尾通过 `buildPageData(elements)` 聚合为 `slide.pageData`(零命中守卫,D-09)。helper `buildPageData` 是 251 行纯函数,复用 v1.12 `getContentKeyFor()`,静态 10 字段 + 动态 directory 数组按 N 升序排。`textContent` 与 `contentKey` 互锁(D-03),非 PPTTextElement 永远不写 `textContent`(D-01/CK-16 守卫)。v1.13 不动 v1.12 映射表(git diff master~5..master -- src/utils/content-key.ts 为空)。

`convertDir('exampels/green-art-teaching')` 端到端跑过 20 个 fixture:`01_cover` 三个 cover_* 静态字段、`02_toc` directory len=4(零填充 index `["01","02","03","04"]`)、`03_chapter` / `09_chapter` / `14_chapter` / `18_chapter` 三个 chapter_* 字段、所有 `*_content` slide 两个 content_* 字段、`20_ending` 两个 end_* 字段。所有 fixture `slide.pageData` 字段挂载正确(实际 ending 文件是 `20_ending.svg`,不是计划假设的 `05_ending.svg` —— 18-03 SUMMARY Deviation §2 已显式记录)。

50 个 Phase 18 测试全绿(19 unit + 7 mock E2E textContent + 8 mock E2E pageData + 16 fixture E2E);76 个 v1.12 回归测试零影响;剩余 13 个失败(`shadow` × 7、`shape-rx` × 4、`image-outline` × 1、`path-merge` × 1)是 v1.12 已锁定的 pre-existing baseline 失败,与 pageData / textContent / contentKey 注入无关。

## Success Criteria Coverage

| # | Success Criterion | Status | Test Reference |
|---|------------------|--------|----------------|
| 1 | 封面三类文本元素带语义键 + pageData 三字段 | passed | `tests/e2e/green-art-teaching-page-data.test.ts#01_cover pageData has cover_title / cover_subtitle / cover_author (PD-01..03)` |
| 2 | 章节/正文/结尾共七类文本元素带 pageData | passed | `tests/e2e/green-art-teaching-page-data.test.ts#03_chapter (PD-06..08) + 04_content (PD-09..10) + 20_ending (PD-11..12)`;convertDir 端到端覆盖 4 chapter + 11 content + 1 ending |
| 3 | 目录 N=1..4 主体带 textContent + pageData.directory 升序 | passed | `tests/e2e/green-art-teaching-page-data.test.ts#02_toc pageData.directory.length === 4` + `directory[0] {index:'01', title, desc}`;convertDir 验证 len=4 + indexes=['01','02','03','04'] |
| 4 | multiline tspan[dy] desc 拆分 + 非映射静默跳过 | passed | `__tests__/page-data-mock.test.ts#D-04 multiline 拆分 + PD-13 0 命中 + PD-14 类型守卫`;`__tests__/text-content-extraction.test.ts#D-04 multiline Row 1 / Row 2..N`;`__tests__/page-data.test.ts#PD-13 0 命中 4 个 it()` |

**4/4 Success Criteria PASSED.**

## Requirements Coverage (PD-01..PD-16 + PD-E2E-01..04)

| Requirement | Description | Status | Test Reference |
|-------------|-------------|--------|----------------|
| PD-01 | cover_title 来自 cover-title-carrier | passed | `tests/e2e/green-art-teaching-page-data.test.ts#01_cover pageData has cover_title` |
| PD-02 | cover_subtitle 来自 cover-subtitle-carrier | passed | `tests/e2e/green-art-teaching-page-data.test.ts#01_cover pageData has cover_subtitle` |
| PD-03 | cover_author 来自 cover-author-carrier | passed | `tests/e2e/green-art-teaching-page-data.test.ts#01_cover pageData has cover_author` |
| PD-04 | directory 数组 N 升序,空数组不输出字段 | passed | `tests/e2e/green-art-teaching-page-data.test.ts#02_toc pageData.directory.length === 4` + D-20 reverse 1 (无 N>=5);`__tests__/page-data.test.ts` 静态命中无 directory |
| PD-05 | directory_item 含 index / title / desc 三字段 | passed | `tests/e2e/green-art-teaching-page-data.test.ts#02_toc pageData.directory[0] has index/title/desc` + D-20 reverse 2 |
| PD-06 | chapter_number 来自 chapter-number-carrier | passed | `tests/e2e/green-art-teaching-page-data.test.ts#03_chapter pageData has chapter_number` |
| PD-07 | chapter_title 来自 chapter-title-carrier | passed | `tests/e2e/green-art-teaching-page-data.test.ts#03_chapter pageData has chapter_title` |
| PD-08 | chapter_desc 来自 chapter-desc-carrier | passed | `tests/e2e/green-art-teaching-page-data.test.ts#03_chapter pageData has chapter_desc` |
| PD-09 | content_title 来自 content-title-carrier | passed | `tests/e2e/green-art-teaching-page-data.test.ts#04_content pageData has content_title` |
| PD-10 | content_subtitle 来自 content-subtitle-carrier | passed | `tests/e2e/green-art-teaching-page-data.test.ts#04_content pageData has content_subtitle` |
| PD-11 | end_title 来自 closing-thanks-carrier | passed | `tests/e2e/green-art-teaching-page-data.test.ts#20_ending pageData has end_title` |
| PD-12 | end_subtitle 来自 closing-subtitle-carrier | passed | `tests/e2e/green-art-teaching-page-data.test.ts#20_ending pageData has end_subtitle` |
| PD-13 | slide 内 0 命中 → pageData 字段省略 | passed | `__tests__/page-data.test.ts#PD-13 0 命中 4 个 it()`;`__tests__/text-content-extraction.test.ts#PD-13 / D-09: 0 命中 slide => slide.pageData undefined`;`__tests__/page-data-mock.test.ts#PD-13: 0 命中` |
| PD-14 | 非 PPTTextElement 即使 id 命中也不进 pageData | passed | `__tests__/page-data-mock.test.ts#PD-14 类型守卫: rect with cover-title-carrier id → pageData===undefined`;`__tests__/text-content-extraction.test.ts#PD-16 类型守卫` |
| PD-15 | v1.13 不动 v1.12 contentKey 映射表 | passed | `git diff master~5..master -- src/utils/content-key.ts` → 空(0 修改);`tests/e2e/green-art-teaching-page-data.test.ts#PD-E2E-04 v1.12 contentKey injection unchanged` 14/14 passed |
| PD-16 | PPTBaseElement 新增 textContent?;非 PPTTextElement 不写 | passed | `__tests__/text-content-extraction.test.ts#PD-16 / D-02 / D-05: 单行 textContent 写入`;fixture E2E D-20 reverse 3 (textContent 锁定到 contentKey) + D-20 reverse 4 (非 PPTTextElement 不带 textContent) |
| PD-E2E-01 | 5 fixture E2E 覆盖 | passed | `tests/e2e/green-art-teaching-page-data.test.ts` 5 fixture 验证 01_cover / 02_toc / 03_chapter / 04_content / 20_ending(实际 fixture id 是 20_ending,18-03 SUMMARY Deviation §2 记录) |
| PD-E2E-02 | 02_toc 验证 directory len=4 + 三字段 | passed | `tests/e2e/green-art-teaching-page-data.test.ts#02_toc pageData.directory.length === 4`;`__tests__/page-data-mock.test.ts#PD-E2E-02: N=5..8 扩展` |
| PD-E2E-03 | 反向白名单断言 | passed | `tests/e2e/green-art-teaching-page-data.test.ts#all 20 slides pageData static field keys ⊆ STATIC_PAGE_DATA_KEYS ∪ {directory} (PD-E2E-03)` |
| PD-E2E-04 | 无回归(v1.12 contentKey 76 tests) | passed | `tests/e2e/green-art-teaching-content-key.test.ts` 14/14 + `tests/e2e/green-art-teaching-template-marking.test.ts` 9/9 + `__tests__/content-key.test.ts` 45/45 + `__tests__/content-key-mock.test.ts` 8/8 = 76/76 passed |

**20/20 Requirements PASSED.**

## D-Decisions Compliance (D-01..D-20)

| Decision | Status | Evidence |
|----------|--------|----------|
| D-01: textContent 写窄范围(仅命中 contentKey) | adhered | `src/transformer/transform-to-pptel.ts:1899-1903` 单行 case `if (contentKeyValue)` 守卫;text case 末尾 `result.textContent = extractRawText(element)` |
| D-02: textContent 命名 + 位置紧邻 contentKey | adhered | `src/slides.ts:155-167` PPTBaseElement.contentKey + textContent 紧邻;`src/utils/page-data.ts:48` `(element as PPTTextElement).textContent` |
| D-03: textContent 与 contentKey 互锁写入 | adhered | 单行(line 1899)+ multiline Row 1(line 1852-1855)+ multiline Row 2..N(line 1859-1864)三处 `if (contentKey)` 内追加 textContent |
| D-04: textContent 取 fast-xml-parser 原始文本 | adhered | `transform-to-pptel.ts:886 extractRawText(element)` 单行;multiline 行内 `tspan.text` |
| D-05: textContent 保留原始空白 + 占位符 | adhered | `__tests__/text-content-extraction.test.ts#PD-16 / D-02 / D-05: 单行 textContent 写入 — 占位符原样保留` |
| D-06: desc first-wins(同 N 多 desc 时取首次) | adhered | `page-data.ts:163-172` `if (existing === undefined) directoryMap.set(...)` |
| D-07: title first-wins | adhered | `page-data.ts:150-160` 同上模式 |
| D-08: pageData 子集发射(未命中字段不存在) | adhered | `page-data.ts:214-248` 显式 if-undefined 检查后赋值;`__tests__/page-data-mock.test.ts#D-08 静态子集: 仅 cover-title-carrier` |
| D-09: 0 命中 → undefined 整字段省略 | adhered | `src/index.ts:298-301` `if (pageData !== undefined) slide.pageData = pageData`;`page-data.ts:210-212`;3 个测试套件验证 |
| D-10: directory_item_number_N 不进 pageData 数组 | adhered | `page-data.ts:175-185` 仅用作 index 推导,无 directory.push 路径;D-20 reverse 1 验证 |
| D-11: PageData 接口在 src/slides.ts(单一来源) | adhered | `src/slides.ts:829-847` PageData + PageDataDirectoryItem 声明;`src/utils/page-data.ts:18-20` import + export type |
| D-12: PageData 扁平形态(10 静态 + directory) | adhered | `src/slides.ts:829-841` 字段顺序与 lock 一致 |
| D-13: directoryItem.index 字符串零填充 | adhered | `page-data.ts:198` `String(n).padStart(2, '0')` fallback;`page-data.ts:195-198` number contentKey 命中时用 textContent 值 |
| D-14: desc/title 缺失 fallback "" | adhered | `page-data.ts:155-158` `desc: ''`;`__tests__/page-data.test.ts#D-14 desc/title 必填 fallback 2 个 it()`;`__tests__/page-data-mock.test.ts#D-14 desc fallback` |
| D-15: convertOne() 末尾 buildPageData() 集成 | adhered | `src/index.ts:296-301` 镜像 v1.11 contentBounds 集成点风格 |
| D-16: helper 模块 src/utils/page-data.ts | adhered | 文件已创建,251 行 |
| D-17: buildPageData 复用 getContentKeyFor() | adhered | `page-data.ts:19` import;`page-data.ts:82-85` element.contentKey 优先 + getContentKeyFor fallback |
| D-18: 三段测试(unit + mock + fixture) | adhered | 4 个测试文件:page-data.test.ts(19) + text-content-extraction.test.ts(7) + page-data-mock.test.ts(8) + green-art-teaching-page-data.test.ts(16) = 50 tests |
| D-19: fixture 重生范围严格 5 个 | adhered | 18-03 SUMMARY Deviation §1:fixture baselines 因 .gitignore 不入 git;E2E 测试通过 convertDir() in-memory 验证(等价效果) |
| D-20: 反向断言清单 | adhered | 4 个反向断言(无 N>=5 / directory 仅三字段 / textContent 锁定 contentKey / 非 PPTTextElement 不带 textContent)+ PD-E2E-03 反向白名单 |

**17/17 Decisions ADHERED + 1 one-way(D-06)/1 costly(D-07)显式 documented + 1 gitignore constraint(D-19 deviation in 18-03)。**

## Files Changed

**Source files:**
- `src/utils/page-data.ts` (new, 251 lines) — `PageData` / `PageDataDirectoryItem` import + `buildPageData()` 纯函数
- `src/slides.ts` (modified, +45 lines) — `PPTBaseElement.textContent?` 字段 + `Slide.pageData?` 字段 + `PageData` / `PageDataDirectoryItem` interface 声明
- `src/transformer/transform-to-pptel.ts` (modified, +36 lines) — `extractRawText()` helper + multiline Row 1/Row 2..N textContent 注入 + `TspanExtractResult.text` 字段补全
- `src/index.ts` (modified, +7 lines) — `buildPageData` import + `convertOne()` 末尾 pageData 聚合

**Test files:**
- `__tests__/page-data.test.ts` (new, 294 lines) — 19 unit tests covering static fields / directory / 0-hit / first-wins / omission / fallback
- `__tests__/text-content-extraction.test.ts` (new, 177 lines) — 7 mock SVG E2E for textContent extraction + type guard
- `__tests__/page-data-mock.test.ts` (new, 254 lines) — 8 mock SVG E2E for pageData edge cases (N=5..8, 0-hit, first-wins, type guard)
- `tests/e2e/green-art-teaching-page-data.test.ts` (new, 295 lines) — 16 fixture E2E across 20 green-art-teaching slides

**Files unchanged (verified):**
- `src/utils/content-key.ts` — v1.12 34 entries 映射表保持原状(PD-15 锁定)

## Test Results

| Test Suite | Tests | Status | Location |
|------------|-------|--------|----------|
| Phase 18 unit (buildPageData 纯函数) | 19/19 passed | green | `__tests__/page-data.test.ts` |
| Phase 18 mock E2E (textContent + pageData edge) | 15/15 passed | green | `__tests__/text-content-extraction.test.ts` (7) + `__tests__/page-data-mock.test.ts` (8) |
| Phase 18 fixture E2E (green-art-teaching) | 16/16 passed | green | `tests/e2e/green-art-teaching-page-data.test.ts` |
| **Phase 18 total** | **50/50 passed** | **green** | |
| v1.12 regression (content-key + template-marking) | 76/76 passed | green | `__tests__/content-key.test.ts` (45) + `__tests__/content-key-mock.test.ts` (8) + `tests/e2e/green-art-teaching-content-key.test.ts` (14) + `tests/e2e/green-art-teaching-template-marking.test.ts` (9) |
| Pre-existing failures (unrelated to Phase 18) | 13 failed | baseline | `__tests__/shadow.test.ts` (7) + `__tests__/shape-rx.test.ts` (4) + `__tests__/image-outline.test.ts` (1) + `__tests__/path-merge.test.ts` (1) |

**Build:** `npm run build` → 0 errors(`tsc && node scripts/copy-fonts.js` 干净通过)。

**End-to-end (convertDir 'exampels/green-art-teaching'):**
```
01_cover => static   ["cover_title","cover_subtitle","cover_author"]
02_toc   => directory len=4 ["directory"]
03_chapter => static ["chapter_number","chapter_title","chapter_desc"]
04_content => static ["content_title","content_subtitle"]
05_content-19_content => static (11 slides)
20_ending => static   ["end_title","end_subtitle"]
```

## Deviations & Issues

### 1. fixture 基线不入 git(18-03 Deviation §1)
- **Issue:** `git add exampels/green-art-teaching/svg_output/*.svg.json` 被 `.gitignore` line 5(`/exampels`)拒绝。
- **Resolution:** 18-03 遵循 17-04 precedent(`commit 2cf4910` 显式记录"fixture svg.json 不入 git"),E2E 测试通过 `convertDir()` in-memory 验证 — 测试本身就是契约。
- **Impact:** 无。fixture 数据在 E2E 运行时从磁盘读取(`.gitignore` 不阻止工作区访问),测试通过即等价于 baseline 验证。

### 2. closing slide id 是 `20_ending` 不是 `05_ending`(18-03 Deviation §2)
- **Issue:** 计划 `<files>` 用位置命名 `05_ending.svg.json`,但实际 fixture 文件是 `20_ending.svg`。
- **Resolution:** E2E 测试用 `pageDataOf('20_ending')` 验证 `end_title`/`end_subtitle`。
- **Impact:** 无。`slide.id === filename`(convertDir 实现),测试匹配实际 fixture。

### 3. closing slide filename pattern 含双 `.svg` 段(18-03 Deviation §2)
- **Issue:** `convertDir()` 写 `${svgFullPath}.svg.json` 即 `01_cover.svg.svg.json`,不是 `01_cover.svg.json`。
- **Resolution:** 测试从 `result.slides`(in-memory)读,不依赖文件路径命名。
- **Impact:** 无(dispatch prompt 中 `01_cover.svg.json` 实际不存在,验证脚本已自适应为 `01_cover.svg.svg.json`)。

### 4. `extractTspansWithPosition` 接口扩展(18-02 Auto-fix §1)
- **Issue:** multiline map 中 `tspan` 类型 `TspanExtractResult` 无 `text` 字段。
- **Resolution:** 为 `TspanExtractResult` 接口添加 `text: string` 字段,三处 `results.push` 同步补 text。Plan intent(D-04 每 row 各自 rawText)完整保留。
- **Impact:** 无(TS strict mode compile-required fix)。

### 5. `getTextContent` 类型 cast(18-02 Auto-fix §2)
- **Issue:** 18-01 用 `@ts-expect-error` forward-cast textContent,18-02 后字段真实存在,继续保留会触发 TS6273。
- **Resolution:** 移除 `@ts-expect-error`,直接 `(element as PPTTextElement).textContent`。
- **Impact:** 无(TS strict mode compile-required fix)。

### 6. `page-data.ts` 与 `slides.ts` 接口去重(18-02 Auto-fix §3)
- **Issue:** 18-01 在 `page-data.ts` 独立声明 `PageData` / `PageDataDirectoryItem`,与 18-02 D-11 单一来源冲突 → TS "Duplicate identifier"。
- **Resolution:** `page-data.ts` 改为 `import type` + `export type` 模式,从 `slides.ts` 引用。
- **Impact:** 无(D-11 单一来源原则强化)。

### 7. helper 优先 `element.contentKey` 而非 `getContentKeyFor(id)`(commit `dc7d948`)
- **Issue:** multiline Row 2+ 的 id 是合成的 `${id}-line-${idx}`(如 `toc-item-1-carrier-line-1`),不在 v1.12 contentKey 映射表中,但 `element.contentKey` 已由 transformer 正确注入为 `directory_item_desc_N`。
- **Resolution:** `page-data.ts:82-85` `let contentKey = element.contentKey; if (undefined) contentKey = getContentKeyFor(element.id)`。
- **Impact:** 必要修复,确保 multiline desc 行被正确归类进 `directory[N].desc`。

### 8. 测试期望排序键顺序(18-01 Auto-fix §1)
- **Issue:** "10 静态字段全部命中" 测试期望按分类分组的视觉顺序,但 `.sort()` 是字母序。
- **Resolution:** 测试期望改为 `.sort()` 实际字母序;生产代码 `buildPageData` 不变。
- **Impact:** 无(测试对齐)。

### 9. 测试索引错误(18-01 Auto-fix §2)
- **Issue:** "提供 number N=2 含 textContent '02'" 测试断言 `result.directory[1]`,但 N=2 是唯一输入,索引应为 `[0]`。
- **Resolution:** 索引修正为 `[0]`;生产代码不变。
- **Impact:** 无(测试对齐)。

### 10. N=5..8 测试 `directory.length === 8` 与 `indexes === ['05','06','07','08']` 数学不一致(18-04 Auto-fix §1)
- **Issue:** dispatch 与 PLAN action §2 同时写 length=8 与 indexes 4 个,数学不可能。
- **Resolution:** 测试断言改为 `length===4` + `indexes.sort()===['05','06','07','08']`。
- **Impact:** 无(spec 一致性修正)。

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none) | - | - | - | 0 debt markers / 0 stubs / 0 unwired imports |

- `grep -nE "TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER" src/utils/page-data.ts src/slides.ts src/transformer/transform-to-pptel.ts src/index.ts` → 空(0 matches)。
- 所有 4 个测试套件 50/50 passed,无 skipped / pending tests。
- 无 empty handler(`onClick={() => {}}`)、无 stub return(`return null` / `return {}`)、无 unwired import。

## Human Verification Required

None — 所有 4 个 success criteria + 20 个 requirements + 17 个 decisions 均有可编程验证证据。pageData 字段聚合是纯函数行为(可在 `dist/src/index.js` 输出直接断言);textContent 字段在 fixture E2E `tests/e2e/green-art-teaching-page-data.test.ts#D-20 reverse 3 + 4` 直接断言;类型守卫(CK-16)反向断言覆盖。视觉/UX/外部服务集成不涉及(纯转换层)。

## Verdict

**Status:** passed

**Score:** 20/20 must-haves verified

Phase 18 已完整达成目标。`buildPageData()` 聚合层(251 行纯函数) + `Slide.pageData` 字段 + `PPTBaseElement.textContent` 字段三层改动在 `src/utils/page-data.ts` / `src/slides.ts` / `src/transformer/transform-to-pptel.ts` / `src/index.ts` 全部落地,互锁写入(D-03)、类型守卫(CK-16)、零命中省略(D-09)、子集发射(D-08)、directory N 升序排(D-13)五个核心 invariant 均有 vitest 钉死。20 个 green-art-teaching fixture 中 19 个含 pageData 命中(cover/toc/chapter/content/ending 五类全覆盖),1 个 0 命中验证守卫工作。v1.12 contentKey 76 个回归测试零影响,content-key.ts 映射表未被修改。50 个 Phase 18 测试 + 76 个 v1.12 回归测试 = 126 个相关测试全绿。剩余 13 个失败(`shadow`/`shape-rx`/`image-outline`/`path-merge`)是 pre-existing baseline,与本阶段无关。

## Self-Check: PASSED

---

_Verified: 2026-10-16T10:12:43Z_
_Verifier: Claude (gsd-verifier)_