# Phase 19: nanoid-to-uuid-migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-19
**Phase:** 19-nanoid-to-uuid-migration
**Areas discussed:** A (源码注释同步面)

---

## A. 源码注释同步面

| Option | Description | Selected |
|--------|-------------|----------|
| 全部 11 处同步 | 所有 src/ 注释中 nanoid 提及都改为 uuid 措辞。决策编号 D-06/D-07/D-08/D-20 保留(决策语义未变)。保证代码内文档与实现一致,避免未来读者依据 stale 注释误判 | ✓ |
| 仅同步 id-generator.ts 自身 | 只改 id-generator.ts 自身 6 处(源头)。transformer/merger/animation-injector 中的 5 处注释保持原样 — 严格按 NU-* 范围,不扩大改动面 | |
| 用通用措辞(避免提具体库) | id-generator.ts 外部注释改用通用措辞(如 'uuid-based 5-char suffix')不提具体实现。源头 id-generator.ts 内部 JSDoc 可以指 uuidv4。这样源码注释不会快速 stale | |

**User's choice:** 全部 11 处同步 (Recommended)
**Notes:** 决策编号 D-06/D-07/D-08/D-20 字面保留(决策语义未变)。措辞从 nanoid 改为 uuidv4().substring(...)。

---

## Claude's Discretion

| # | 灰色区域 | Claude 默认决定 |
|---|---|---|
| CD-1 | (B) PPTIST_ANIMATION_MAPPING.md 路径偏差 — NU-11 写"docs/ 下",实际在 `./` | 实施时直接定位根目录文件,无需改 REQUIREMENTS.md |
| CD-2 | (C) 测试正则精度 — UUID_SUFFIX_*_RE 选宽松还是精确 | 选精确正则(`/^[0-9a-f]{5}$/` + `/^[0-9a-f]{8}-[0-9a-f]$/`) |
| CD-3 | (D) id-injection.test.ts 顶部 JSDoc — NU-09 字面未覆盖 | 与 D-A1 一并改(11 处 src/ 注释面已包含此文件) |
| CD-4 | (E) PPTist 兼容性 E2E 验证 — 是否需要验证 PPTist 接受 uuid 输出 | 不新增 E2E,信任 D-07/D-20 设计意图 |
| CD-5 | (F) fixture 旧 id 兼容性 — fixture 是持久 id 还是每次重生成 | 每次重生成,无需额外处理 |

## Deferred Ideas

None — discussion stayed within phase scope.
