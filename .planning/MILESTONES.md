# Milestones

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
