# Milestones

## v1.14 Replace nanoid with uuid (Shipped: 2026-10-29)

**Phases completed:** 1 phases, 2 plans, 0 tasks
**Closeout type:** verified_closeout — 19-VERIFICATION.md 16/16 must-haves passed
**Verified / archived:** shipped 2026-10-19 · archived 2026-10-29
**Git range:** `366abf3` (docs: start milestone v1.14) → `7291adb` (docs(19): fix covered_digest)
**Requirements:** NU-01..NU-16 — 16/16 covered (15 fully satisfied, NU-04 partial by accepted npm-hoisting deviation)

**Key accomplishments:**
- `src/utils/id-generator.ts` 三处 `nanoid(N)` → `uuidv4().substring(0, N)`(N ∈ {5, 10, 10});`pptelIdWithFallback` / `pptelIdUngrouped` / `pptAnimationId` 三函数签名不变,PPTElement.id 后缀长度严格保持 5/10 字符,D-05~09 id priority chain 语义不变
- `package.json` 移除 `nanoid` 直接依赖 — `grep -n "nanoid" package.json` 0 match;`uuid` v14 与 `@types/uuid` v10 保留,未新增任何依赖
- `src/id-injection.test.ts` 正则常量 `NANOID_5_RE`/`NANOID_10_RE` → `UUID_SUFFIX_5_RE`/`UUID_SUFFIX_10_RE`,字符集从 `[A-Za-z0-9_-]` 精确化到 `[0-9a-f-]`,8 个 it() 全绿
- 横向同步 13 个文件 — 6 处 `src/` 注释(animation-injector / path-merge / transform-to-pptel)+ `.planning/` 6 个历史文档(CONVENTIONS.md / STATE.md / v1.9 14-*.md)+ `PPTIST_ANIMATION_MAPPING.md`,nanoid 字面 0 残留(Out of Scope 文件按 plan 保留)
- 验证 16/16 must-haves passed — id-injection 8 it() + E2E 51 it() 全绿(`length === 10` 断言保留),全套 644 passed / 13 failed(13 个均为 v1.9 carry-over 已知失败,未引入新回归)
- 唯一偏差 NU-04:`npm install` 后 npm 自动 hoist `postcss@8.5.15` 的传递依赖 `nanoid@3.3.20` 到顶层,`node_modules/nanoid` 块无法移除 — plan 已显式声明允许 transitive 保留,不影响直接依赖已删除

**Known verification overrides:** 0 newly acknowledged, 30 carried forward from a prior close (see STATE.md Deferred Items)

---

## v1.13 Page Data Extraction (Shipped: 2026-10-16)

**Phases completed:** 1 phases, 4 plans, 7 tasks

**Key accomplishments:**
- Pinned v1.13 pageData injection against the real 20-slide green-art-teaching fixture set with 16 reverse-and-positive assertions — zero source changes, fixture baselines validated via convertDir() in-memory.

---

## v1.12 Template Content Key Annotation (Shipped: 2026-10-16)

**Phases completed:** 1 phases, 4 plans, 0 tasks

**Key accomplishments:**
- `src/utils/content-key.ts` helper 模块 — 10 静态 (cover/chapter/content/closing) + 24 动态 (toc-item-{N}-number/carrier/note-carrier N=1..8) = 34 entries,导出 `getContentKeyFor(id)` 与 `CONTENT_KEY_VALUES` (length=34 unique frozen)
- `PPTBaseElement.contentKey?: string` 字段 + `transformElement()` 顶部 compute `contentKeyValue = getContentKeyFor(elementId)` + 单行 text case 末尾 `if (contentKeyValue) result.contentKey = contentKeyValue`(CK-16 类型守卫:8 个非文本 case 不写)
- multiline text case `tspanElements.map` Row 1 (→ `directory_item_N`) vs Row 2..N (→ `directory_item_desc_N`) 区分 — 02_toc.svg 4 Row 1 + 4 Row 2 desc 全部命中
- 三层测试覆盖 (76 tests passed): 45 单元 (`content-key.test.ts`) + 8 mock SVG E2E (`content-key-mock.test.ts`) + 14 fixture E2E (`green-art-teaching-content-key.test.ts`) + 9 v1.11 template-marking 无回归
- verifier 17/17 must-haves passed,verified_closeout;30 acknowledged carry-over items still suppressed

---

## v1.11 Template Element Marking (Shipped: 2026-10-16)

**Phases completed:** 1 phases, 3 plans, 3 tasks

**Key accomplishments:**
- Transformer marks renderable PPTElement with templateType?: 1 literal based on -template id propagation; excludes content-object-slot-template subtree per D-TPL-07 revised.
- Slide.contentBounds optional field extracted from data-pptx-bounds on first content-object-slot-template; field omitted when missing/malformed per TPL-CB-03.
- E2E suite of 9 tests pins templateType + contentBounds behavior on 20 green-art-teaching fixture slides as v1.11 release gate.

---

## v1.10 Animation Sidecar Extension (Shipped: 2026-10-15)

**Phases completed:** 1 phases, 2 plans, 0 tasks

**Key accomplishments:**
- (none recorded)

---

## v1.9 PPTist Animation Sidecar Injection (Shipped: 2026-10-15)

**Phases completed:** 1 phases, 3 plans, 9 tasks

**Key accomplishments:**
- Parent-dir CLI dispatch + convertDir() shell + transformer id-injection (D-05~09) + PPTAnimation.extensions field (D-10) — no animation content yet (Plan 02)
- Pure-function mapper tables + sidecar → slide bridge + convertDir() wiring (D-11~23) — animations live for the first time.

---

## v1.8 CLI 字体验证 (Shipped: 2026-08-07)

**Phases completed:** 1 phase, 2 plans, 6 tasks
**Closeout type:** override_closeout (29 items acknowledged as deferred — see STATE.md)

**Goal:** CLI 启动时验证 Source Han Sans CN Regular 字体文件已正确加载到 resvg-js；缺失/加载失败时红色错误信息 + exit 1,防止 resvg-js 静默 fallback 到内置字体导致宽度偏差。

**Deliverables:**

- `src/font-validator.ts` — 同步三层防御字体验证器 (existsSync → TTF/OTF magic-bytes → Resvg getBBox non-zero)
- `src/font-validator.test.ts` — 19 单元测试 (覆盖成功 / 文件缺失 / Resvg 失败 / 魔数错误 / 截断字体)
- `src/cli.font-validation.test.ts` — 5 个真实子进程测试 (4 失败路径 + 1 成功路径),修复了 IIFE 包装错误的 exit-code 捕获
- `src/cli.ts` — 新增 `verifyFontLoaded()` 启动门控 (12 行),移除 dead `run` export

**Key accomplishments:**

1. **三层防御字体验证** — existsSync + TTF magic-bytes (TTF/OTF/true/typ1/ttcf) + Resvg getBBox non-zero check,捕获所有 realistic font 加载失败模式(包括 resvg-js@2.6.2 静默 fallback 漏洞)
2. **CLI 启动门控** — 同步 `verifyFontLoaded()` 在 `main()` 顶部执行,失败立即 `pc.red` + `process.exit(1)`,绝对路径 + `npm run build` 恢复提示
3. **真实子进程 exit-code 测试** — `runCli()` helper 直接 catch `err.status` / `err.stderr`,5 个 `it()` 覆盖失败/成功路径,真实驱动 `dist/src/cli.js`
4. **死代码清理** — 移除 cli.ts 中 dead `run` export

**Key Decisions:**

- **FONT-VALIDATION-01:** 三层防御 (magic-bytes pre-flight + Resvg construction + getBBox non-zero) — empirical reproduction shows resvg-js@2.6.2 不在构造时 throw,只有 getBBox non-zero 是可靠信号
- **FONT-VALIDATION-02:** 真实子进程 exit-code 捕获 (移除 IIFE 包装错误,`execFileSync.lastStatus` 不存在)
- **FONT-VALIDATION-03:** 移除 `run` dead export (不引入 `require.main === module` guard,避免破坏子进程集成测试)

**Metrics:**

- Commits: 9 (3 + 3 + 3 atomic commits)
- Files: 10 changed, +1,362 / -38
- Tests: 24 green (12 baseline + 13 gap closure - 1 refactor)
- Build: tsc + copy-fonts passes
- Verification: gaps_found → closed by 13-02 plan (override_closeout accepted)

**Known Gaps (Deferred to v1.9+):**

- 28 open debug sessions across v1.1–v1.7 phases (foreignobject-svg-offset, g-fill-stroke-inheritance, polygon-defs-background, text-tspan-*, etc.)
- 15 stable pre-existing test failures (gradient, image-outline, path-merge, shadow, shape-rx)

---

## v1.2 — PPTist格式对齐

**Started:** 2026-06-30
**Completed:** 2026-06-30
**Status:** Complete — no new work required

**Goal:** 将 svg-to-pptel 输出的 JSON 格式与 PPTist 的 PPTElement schema 完全对齐

**Outcome:** Research confirmed all target PPTist schema properties already implemented or deferred. No new implementation needed.

**Deliverables:** None — all features already implemented or deferred to future milestones.

---

## v1.1 — transform-fixes

**Started:** 2026-06-27
**Completed:** 2026-06-29
**Status:** Complete

**Goal:** Fix two critical SVG transform bugs: rotate transform center support and text baseline offset

**Deliverables:**

- Correct rotate transform with rotation center (`rotate(deg, cx, cy)`)
- Correct text y coordinate (baseline → top) with configurable `BASELINE_OFFSET_RATIO`

**Key Decisions:**

- D-26: Ellipse cx/cy need separate rotation via applyRotateWithCenter
- D-27: Ellipse rx/ry use `Math.abs` on scale factors to remain positive
- D-28: `BASELINE_OFFSET_RATIO = 0.8` more accurate for SVG text baseline

---

## v1.0 — Initial release

**Status:** Complete

**Deliverables:**

- SVG parsing via fast-xml-parser
- Coordinate mapping from SVG viewBox to 1000×562.5 canvas
- Shape conversion (rect, circle, ellipse, path, polygon, polyline, line)
- Text element extraction with font-family, font-size, fill
- Image element with href/xlink:href
- CLI tool (svg2pptel)
- Basic transform attribute (translate, scale only)

---

## v1.3 — resvg-js Text Measurement

**Started:** 2026-07-01
**Completed:** 2026-07-01
**Status:** Complete

**Goal:** 用 resvg-js 替代纯 JS 字体度量计算，获取 text 元素的真实宽度和高度

**Deliverables:**

- 安装 @resvg/resvg-js 依赖
- 创建 `src/text-measurer.ts` 模块，提供 `measureTextBBox()` API
- 通过 `transformElement()` → `walk()` → `transformToPPTElement()` 传播异步
- 移除废弃的 `calcTextWidthYaHei()` 和 `BASELINE_OFFSET_RATIO`
- 新增 `parseStrokeColor()` 函数处理透明 stroke

**Key Decisions:**

- D-35: Measurement failure falls back to heuristic
- D-36: Tspan children flattened with newline before measurement
- D-37: Fixed 1280x720 viewBox for measurement SVG

**Metrics:**

- Phases: 1 (Phase 6)
- Plans: 2 (06-01, 06-02)
- Files: 29 changed, +2008, -515
- Tests: 151 passed

**Accomplishments:**

1. 集成 @resvg/resvg-js 实现精确文本边界框测量
2. 创建 text-measurer.ts 模块
3. 通过 transformElement() → walk() → transformToPPTElement() 传播异步
4. 移除废弃函数 calcTextWidthYaHei 和 BASELINE_OFFSET_RATIO
5. 修复 circle fill="none" 和 path 缩放不一致问题
6. 修复 transparent stroke 颜色处理
