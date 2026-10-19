# Roadmap — svg-to-pptel

## Milestones

- ✅ **v1.0** — Initial release (2026-06-25)
- ✅ **v1.1** — transform-fixes (2026-06-29)
- ✅ **v1.2** — PPTist格式对齐 (2026-06-30)
- ✅ **v1.3** — resvg-js Text Measurement (2026-07-01)
- ✅ **v1.4** — Directory Batch CLI (2026-07-02)
- ✅ **v1.5** — Use Tag Refactor (2026-07-10)
- ✅ **v1.6** — SVG Converter Refactor (2026-07-13)
- ✅ **v1.7** — Path 合并优化 (2026-07-23)
- ✅ **v1.8** — CLI 字体验证 (2026-08-07)
- ✅ **v1.9** — PPTist Animation Sidecar Injection (2026-10-15)
- ✅ **v1.10** — Animation Sidecar Extension (2026-10-15)
- ✅ **v1.11** — Template Element Marking (2026-10-16)
- ✅ **v1.12** — Template Content Key Annotation (2026-10-16)
- ✅ **v1.13** — Page Data Extraction (2026-10-16)
- ◆ **v1.14** — Replace nanoid with uuid (2026-10-19, planning)

## Phases

<details>
<summary>◆ v1.14 — Replace nanoid with uuid (Phase 19) — PLANNING 2026-10-19</summary>

- [ ] Phase 19: nanoid-to-uuid-migration (1/2 plans) — _planning in progress_
  - 19-01: `src/utils/id-generator.ts` import 替换 + 三处 `nanoid(5)`/`nanoid(10)` → `uuidv4().substring(0,5)`/`substring(0,10)` + 顶部注释更新
  - 19-02: `package.json` 删除 nanoid + 重生成 `package-lock.json` + 测试正则重命名 + E2E 长度断言校验 + `.planning/` 6 个历史文档 + `PPTIST_ANIMATION_MAPPING.md` 同步更新
  - **Requirements:** NU-01..NU-16 (16 total)
  - **Success criteria:**
    1. `grep -r "from 'nanoid" src/` 返回 0 match
    2. `grep -r "nanoid" package.json` 返回 0 match
    3. `npm run build` (tsc) 编译通过
    4. `npm test` 全部现有测试 green(76 v1.12 + 50 v1.13 + id-injection.test.ts 适配后 green)
    5. E2E `tests/e2e/202610131101001.test.ts` 16 it() 中 `length===10` 断言通过
    6. `.planning/` 中所有 nanoid 提及已更新为 uuid 等效表述

</details>

<details>
<summary>✅ v1.13 — Page Data Extraction (Phase 18) — SHIPPED 2026-10-16</summary>

- [x] Phase 18: page-data-extraction (4/4 plans) — completed 2026-10-16
  - 18-01: `src/utils/page-data.ts` helper (`buildPageData` 251-line pure function + `PageData` / `PageDataDirectoryItem` interfaces) + 19 unit tests
  - 18-02: `PPTBaseElement.textContent?: string` + `Slide.pageData?: PageData` 字段 + `transformElement()` 互锁写入(单行 + multiline 每 row) + `convertOne()` 末尾 `buildPageData()` 聚合 + 7 mock SVG E2E
  - 18-04: `__tests__/page-data-mock.test.ts` 8 it() 覆盖 PD-E2E-02 N=5..8 / D-04 multiline / PD-13 0-hit / D-06 first-wins / D-14 desc fallback / D-08 子集发射 / PD-14 类型守卫 / D-19 N=1..4 — 修复 multiline Row 2+ lookup 用 `element.contentKey` 替代 `getContentKeyFor(id)`
  - 18-03: `tests/e2e/green-art-teaching-page-data.test.ts` 16 it() 覆盖 PD-01..PD-12 + PD-E2E-03 反向白名单 + 4 项 D-20 反向断言 + PD-E2E-04 v1.12 contentKey 76 tests 无回归
  - **Closeout type:** verified_closeout — verifier passed 20/20 must-haves;50/50 Phase 18 tests green (19 unit + 15 mock E2E + 16 fixture E2E);76/76 v1.12 contentKey regression;13 pre-existing failures (shadow/shape-rx/image-outline/path-merge) untouched, unrelated to Phase 18

</details>

<details>
<summary>✅ v1.12 — Template Content Key Annotation (Phase 17) — SHIPPED 2026-10-16</summary>

- [x] Phase 17: template-content-key (4/4 plans) — completed 2026-10-16
  - 17-01: `src/utils/content-key.ts` helper (10 静态 + 24 动态 N=1..8 × 3 类 = 34 entries) + 单元测试 45 it() (10 静态 + 24 动态 + 4 reverse + 3 boundary + 4 invariant)
  - 17-02: `PPTBaseElement.contentKey?: string` 字段 + `transformElement()` 顶部 compute + 单行 text case 末尾写入 + CK-16 类型守卫(8 个非文本 case 不写)
  - 17-03: multiline text case `tspanElements.map` Row 1 (→ `directory_item_N`) vs Row 2..N (→ `directory_item_desc_N`) 区分 + mock SVG E2E 8 it() (N=5..8 三类 + tspan[dy] 拆分 + reverse + 类型守卫 + 白名单)
  - 17-04: 20 fixture svg.json 重生 + fixture E2E 14 it() (CK-01 ~ CK-17 全 slide 反向断言)
  - **Closeout type:** verified_closeout — verifier passed 17/17 must-haves;76 tests passed (45 unit + 8 mock + 14 fixture + 9 v1.11 无回归);30 acknowledged carry-over items still suppressed from v1.9

</details>

<details>
<summary>✅ v1.11 — Template Element Marking (Phase 16) — SHIPPED 2026-10-16</summary>

- [x] Phase 16: template-element-marking (3/3 plans) — completed 2026-10-16
  - 16-01: PPTBaseElement.templateType?: 1 字面量字段 + transformElement() 顶部 typeof-guarded isTemplate 注入(8 cases + multiline + icon + path-merge)
  - 16-02: Slide.contentBounds?: {x, y, width, height} 可选字段 + findContentBounds() DFS helper + convertOne() 集成
  - 16-03: 9 E2E 测试 on `exampels/green-art-teaching` 20 fixture slides(cover≥5 / toc≥4 / ending≥4 / 04_content 精确 contentBounds + 反向断言 + 字段缺失断言)
  - **Post-ship fix (2026-10-16):** text single-line 分支补 templateType 注入(`5466417`)— 16-01 实施遗漏
  - **Closeout type:** override_closeout — verification 跳过但 implementation 测试 22/22 通过(13 unit + 9 E2E);30 acknowledged carry-over items still suppressed from v1.9

</details>

<details>
<summary>✅ v1.10 — Animation Sidecar Extension (Phase 15) — SHIPPED 2026-10-15</summary>

- [x] Phase 15: animation-sidecar-extended (2/2 plans) — completed 2026-10-15
  - 15-01: Extend ENTRANCE_MAP / EMPHASIS_MAP / EXIT_MAP to 53/33/53 = 139 full coverage + D-02 none cascade + D-03 transition 'none' → turningMode 'no' + D-13 delay+duration merge + 2 new diagnostics counters
  - 15-02: `resolveEffectiveRow` pure-function resolver (D-15 inheritance) + D-06 afterEffect/sound extensions + D-04 chrome forward-compat helpers + `chromeSkippedGroups` counter
  - **Post-ship fixes (2026-10-15):** `extensions.originalTrigger` unconditional preservation (commit `9fa7fec`); 29-entry `LEGACY_NAME_MAP` normalizing fly/zoom/wipe_left etc. (commit `913e342`)
  - **Closeout type:** verified_closeout — 30 acknowledged items still suppressed from v1.9 close, audit clean

</details>

<details>
<summary>✅ v1.9 — PPTist Animation Sidecar Injection (Phase 14) — SHIPPED 2026-10-15</summary>

- [x] Phase 14: pptist-animation-from-sidecar (3/3 plans) — completed 2026-10-15
  - 14-01: Parent-dir CLI dispatch + convertDir() shell + transformer id-injection (D-05~09) + PPTAnimation.extensions field (D-10)
  - 14-02: Pure-function mapper tables + sidecar → slide bridge + convertDir() wiring (D-11~23) — animations live for the first time
  - 14-03: D-21 row-level defaults + D-23 stderr-only diagnostics + 74-test E2E coverage (ANIM-DIAG-01)
  - **Closeout type:** override_closeout (30 items acknowledged as deferred tech debt; v1.9 itself fully verified)

</details>

<details>
<summary>✅ v1.8 — CLI 字体验证 (Phase 13) — SHIPPED 2026-08-07</summary>

- [x] Phase 13: CLI Font Validation (2/2 plans) — completed 2026-08-06

</details>

<details>
<summary>✅ v1.7 — Path 合并优化 (Phases 10-12) — SHIPPED 2026-07-23</summary>

- [x] Phase 10: Path Merge (2/2 plans) — completed 2026-07-13
- [x] Phase 11: Text Width/Height Passthrough (1/1 plan) — completed 2026-07-23
- [x] Phase 12: Font Preprocess (1/1 plan) — completed 2026-07-23

</details>

<details>
<summary>✅ v1.6 — SVG Converter Refactor (Phase 9) — SHIPPED 2026-07-13</summary>

- [x] Phase 9: SVG Converter Refactor — completed 2026-07-13

</details>

<details>
<summary>✅ v1.5 — Use Tag Refactor (Phase 8) — SHIPPED 2026-07-10</summary>

- [x] Phase 8: Use Tag Refactor — completed 2026-07-10

</details>

<details>
<summary>✅ v1.4 — Directory Batch CLI (Phase 7) — SHIPPED 2026-07-02</summary>

- [x] Phase 7: Directory Batch CLI — completed 2026-07-02

</details>

<details>
<summary>✅ v1.3 — resvg-js Text Measurement (Phase 6) — SHIPPED 2026-07-01</summary>

- [x] Phase 6: resvg-js Text Measurement — completed 2026-07-01

</details>

---

*Roadmap archived 2026-10-16 after v1.13 milestone SHIPPED — see `.planning/milestones/v1.13-ROADMAP.md` for full milestone detail.*