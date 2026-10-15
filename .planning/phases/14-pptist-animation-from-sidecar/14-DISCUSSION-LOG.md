---
phase: 14
name: pptist-animation-from-sidecar
padded: 14
---

# Phase 14: pptist-animation-from-sidecar — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-15
**Phase:** 14-pptist-animation-from-sidecar
**Areas discussed:** transformer id 注入与冲突处理, extensions 字段形状, PPTAnimation.type 推断与 fallback

---

## Area 1: transformer id 注入与冲突处理

**Q1: SVG 元素自身已存在 id=xxx 属性时，生成规则如何？**

| Option | Description | Selected |
|--------|-------------|----------|
| 总是覆盖为 `<group_id>__<nanoid(8)>` | ANIM-ID-01 原文。原 SVG id 完全丢弃，永远输出 `<group_id>__<nanoid(8)>`。可预测，但会丢失设计师原本的语义化 id。 | |
| 保留原 id 作后缀 | SVG 原 id = "card-temperature-bg" → `<group_id>__<card-temperature-bg>__<nanoid(8)>`。保留语义但 id 变长，PPTist 面板里的 nanoid 会更长（双重 underscore）。 | |
| 无 group 时用原 id，有 group 时用新格式 | `<g id="card">` 包裹时输出 `<group_id>__<nanoid(8)>`（覆盖）；未包裹时保留 SVG 原 id。混合逻辑复杂但与三方示例最贴近。 | ✓ |

**User's choice:** "如果元素自身有id就使用自身id，如果没有id就使用<group_id>__<nanoid(5)>" — 自由文本综合了上述三种方案的"保留原 id + 简化格式"。用户特别指定 `nanoid(5)` 而非原 ANIM-DEC-02 中的 `nanoid(8)`。
**Notes:** 用户主动指向 `E:\git\svg2json\exampels` 让 Claude 验证 SVG 实际 id 模式。Claude 已 inspect `svg_output/03_overview.svg` — 子元素已含语义化 id（`content-title-carrier`, `card-temperature-bg`），证实"保留原 id"是正确选择。

**Q2: 当一个 <g id="x"> 被 path-merge 合并为单个 PPTShapeElement，这条动画的 elId 选哪一个？**

| Option | Description | Selected |
|--------|-------------|----------|
| 合并后 shape 用唯一 id，动画挂其上 | path-merge 输出一个 PPTShapeElement、id 为 `<group_id>__<nanoid(5)>`。animations.json 该 group 只产生 1 条 PPTAnimation，elId = merge 元素 id。最简单但所有原 path 表现状都领动画。 | ✓ |
| 合并后动画复制 N 份 | merge 元素 id 优先，其他原始 path 子件点也获得独立 id（从子件 path attr 中提取 id）。但 merge 以后这些 id 都丢了，会重复生成 N 条 elId 都指向同一元素。 | |
| group 被 present path 列为 animations 则跳过 merge | 增加 path-merge 的"跳过动画组"启发：合并前检查 animations.json，若该 group 在 slides 的 groups 中出现，跳过 merge。子 path 各自输出 PPTShapeElement。 | |

**User's choice:** 合并后 shape 用唯一 id，动画挂其上。
**Notes:** 用户选择最简路径 — 与 analysis.md §4.5 "挂到第一个匹配的 PPTElement" 的最小化一致。

---

## Area 2: extensions 字段形状

**Q1: extensions 保留三方未映射字段的具体形状？**

| Option | Description | Selected |
|--------|-------------|----------|
| 平铺 Record<string, any> | extensions 为 `{ originalEffect, originalDuration, originalDelay, originalType, originalTrigger }` 平铺。所有未映射/被覆盖的三方字段都进这里。最简单，调用方按需读取。 | ✓ |
| 嵌套按原 schema | extensions = { original: { effect, duration, trigger, type }, group: {...}, sidecar: {...} }，嵌套保留三方原始 entry 结构。但会让 PPTist 面板在读 extensions 路径时遇到多层点。 | |
| extensions 只包"已声明保留"的子集 | 仅保留三方 animations.md 中明列的字段（originalEffect / originalDuration / originalTrigger / originalType / originalTriggerShape）。其他字段静默丢弃。可控但丢失三方高阶字段。 | |

**User's choice:** 平铺 Record<string, any>。

**Q2: effect 与 trigger 已映射后，映射后的字段是否同时出现在 extensions 中作为 original*？**

| Option | Description | Selected |
|--------|-------------|----------|
| 映射后只在 PPTAnimation 上，extensions 不重复 | PPTAnimation.effect = fadeIn（已映射）；extensions 不出现 originalEffect。原始 effect 若不在映射表中则写 originalEffect。清晰区分"已生效"与"仅保留"。 | |
| 映射后同时在 extensions 保留三方原值 | PPTAnimation.effect = fadeIn；extensions.originalEffect = entrance_wipe。全量可见原始 provenance。extensions 体积变大但调试友好。 | ✓ |

**User's choice:** 映射后同时在 extensions 保留三方原值。
**Notes:** 用户看重"调用方随时可读 provenance"，确认 ANIM-MAP-06 全量保留是字面意义。

---

## Area 3: PPTAnimation.type 推断与 fallback

**Q1: 从三方 effect key 推断 PPTAnimation.type 的逻辑？**

| Option | Description | Selected |
|--------|-------------|----------|
| 按 key 前缀推断 | 三方 key 以 `entrance_*` 开头 → type='in'；`emphasis_*` → type='attention'；`exit_*` → type='out'。可直接、覆盖范围广（104 个三方 key 按 4 个 prefix map 都可分类）。 | ✓ |
| 严格按映射表查询 | 仅查 EFFECT_MAPPER（ENTRANCE_MAP + EMPHASIS_MAP + EXIT_MAP）；不在表内 → type='in'（默认），extensions.originalType 保留原 prefix。可控但需三方 key 严格在表内。 | |
| PPTX 原生 key 检查 + 映射表双层 | 先按 prefix 猜（entries）；包含 known submap 但 prefix 未识别 → 按 submap 查。两层防护，避免 prefix 错误造成误判。 | |

**User's choice:** 按 key 前缀推断。
**Notes:** 用户倾向简单可预测方案 — 与 animations.md §1.2 的 84 个 PPTist effect 名合理映射。

**Q2: 三方 effect 不在映射表中（未识别的 entrance_*/emphasis_*/exit_* 等）时如何 fallback？**

| Option | Description | Selected |
|--------|-------------|----------|
| fallback fadeIn / pulse / out | 按 type 默认到 'in'、effect 默认到 fadeIn（与 analysis.md §4.2.4 建议一致）。可观测可播放。extensions.originalEffect 保留三方原 key。 | ✓ |
| effect 名写入原值，PPTist 面板不识别但不丢弃 | 按 type 默认到 'in'、effect 写入三方原 key（如 `entrance_unkown_key`）。PPTist 运行时不可能播放该动画（effect 不在 84 个里），但 JSON 无损。可以结合 trigger='click' 避免自动播。 | |
| extensions.originalEffect + effect 留空 | 未识别的三方 key 不生成 PPTAnimation，只在 extensions 写 originalEffect 、 slide、annotations 、 slide（作为原型记录）。在 semantics 阶段保留 provenance，但运行时无动画。 | |

**User's choice:** fallback fadeIn / pulse / out。

---

## Claude's Discretion

- `nanoid(5)` 长度：用户明确指定 5（vs ANIM-DEC-02 原写 8），不再讨论
- `convertDir()` API 形状：建议与 `convert()` 并列顶层函数 — 显式命名，类型明确
- `extensions` 写入条件：仅当 `Object.keys(ext).length > 0` 时才写入 — 减小 JSON 体积

## Deferred Ideas

- **v2 motion path_***：GSAP/anime.js 集成 — Out of Scope（v1.9 不做运行时播放）
- **v2 PPTist effectOptions**：direction / amount / color — Out of Scope（保留到 extensions）
- **v2 PPTist trigger_shape / delay / repeat_count / sound**：Out of Scope（保留到 extensions）
- **v2 PPTist 编辑面板逆向**：读 JSON 反向生成 sidecar — Out of Scope