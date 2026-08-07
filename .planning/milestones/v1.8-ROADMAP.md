# Roadmap — svg-to-pptel

## Milestones

- ✅ **v1.7** — Path 合并优化 (2026-07-23)
- ✅ **v1.6** — SVG Converter Refactor (2026-07-13)
- ✅ **v1.5** — Use Tag Refactor (2026-07-10)
- ✅ **v1.4** — Directory Batch CLI (2026-07-02)
- ✅ **v1.3** — resvg-js Text Measurement (2026-07-01)

---

## Progress

| Phase | Milestone | Status | Completed |
|-------|-----------|--------|-----------|
| Phase 6 | v1.3 | Complete | 2026-07-01 |
| Phase 7 | v1.4 | Complete | 2026-07-02 |
| Phase 8 | v1.5 | Complete | 2026-07-10 |
| Phase 9 | v1.6 | Complete | 2026-07-13 |
| Phase 10 | v1.7 | Complete | 2026-07-13 |
| Phase 11 | v1.7 | Complete | 2026-07-23 |
| Phase 12 | v1.7 | Complete | 2026-07-23 |
| Phase 13 | v1.8 | Complete | 2026-08-06 |

---

## v1.8 — CLI 字体验证

- [x] **Phase 13: CLI Font Validation** — Verify resvg-js 字体在 CLI 启动时被正确引入；引入失败立即报错退出（红色错误信息 + exit 1），避免 resvg fallback 到内置字体导致测量宽度与 PPTist 渲染不一致

### Phase 13: CLI Font Validation

**Goal:** CLI 启动时验证 Source Han Sans CN Regular 字体文件已正确加载到 resvg-js；若字体缺失或加载失败，输出红色错误信息并以 exit 1 退出，防止后续测量使用 resvg 内置 fallback 字体导致宽度偏差。

**Requirements:** TBD

**Depends on:** Phase 12 (FONT_FILE 常量)

**Plans:** 2 plans (13-01 baseline + 13-02 gap closure)

---

## v1.7 Details

<details>
<summary>✅ v1.7 — Path 合并优化 (SHIPPED 2026-07-23)</summary>

- [x] Phase 10: Path Merge — 决策树与合并引擎 (2/2 plans) — completed 2026-07-13
- [x] Phase 11: Text Width/Height Passthrough — SVG text 属性直通 (1/1 plan) — completed 2026-07-23
- [x] Phase 12: Font Preprocess — 统一字体为 Source Han Sans CN Regular (1/1 plan) — completed 2026-07-23

</details>

## v1.8 Details

<details>
<summary>✅ v1.8 — CLI 字体验证 (SHIPPED 2026-08-06)</summary>

- [x] Phase 13: CLI Font Validation (2/2 plans) — completed 2026-08-06
  - 13-01 baseline: 同步 `verifyFontLoaded()` 验证器 + 11 单测 + 1 子进程集成测试
  - 13-02 gap closure: 三层防御(magic-bytes + getBBox)+ 真实子进程 exit-code 捕获 + 3 个真实损坏字体端到端 + 移除 dead `run` export

</details>

---

*Roadmap updated: 2026-08-06 after v1.8 milestone completion*
