# v1.9 Requirements — Text 段落合并

**Goal:** SVG `<text>` 元素内含 `<tspan>` 时,所有内容在转 json 后必须合并为单个 PPTTextElement;换行 tspan 用 `<p>` 分隔,inline tspan 在同一 `<p>` 内。符合 PPTist 多段落规范。

---

## TEXT — Text/Tspan Unification

### Table stakes

- [ ] **TEXT-01**: 所有 `<tspan>` 内容合并到同一个 PPTTextElement,不再拆分为多个 text 元素 — 包括单行 inline / 多行换行 / 混合三种场景
- [ ] **TEXT-02**: 换行 `<tspan>` (含 `x` 属性或 `dy`≠0) 序列化为独立 `<p>` 段落,符合 pptist 多段落规范
- [ ] **TEXT-03**: inline `<tspan>` (无换行属性) 与父文本片段合并到同一 `<p>` 内,保留原有样式继承 (font-family/font-size/fill/font-weight/font-style/text-decoration)
- [ ] **TEXT-04**: `hasLineBreakTspans` 检测覆盖 `x` 属性 **和** `dy` 属性 (`dy` 值不为 0 视为换行,与现有 `x` 检测等价)
- [ ] **TEXT-05**: 多行场景使用父 text 的统一 `left/top` 与 `width`;段落垂直间距由 `paragraphSpace` (默认 5px) 控制,不再由各自 tspan 的 `top` 偏移单独控制

### Differentiators

- [ ] **TEXT-06**: tspan 中嵌套的 tspan (multi-level) 在检测换行与序列化时行为一致 (递归处理)
- [ ] **TEXT-07**: 同时包含 inline 和换行 tspan 的混合 `<text>` 按文档顺序生成 `<p>`,不丢失任何子元素内容

### Anti-features (Out of scope)

- 保留每个 tspan 独立 PPTTextElement 的旧行为 — 完全替换
- 通过引入新的 JSON 字段 (如 `paragraphs: string[]`) 替代 `<p>` — 维持 PPTist HTML 字符串规范
- 改变 `PPTTextElement.content` 类型 — 保持 `string` (HTML)

---

## TEST — Test Coverage

### Table stakes

- [ ] **TEST-01**: 单 tspan 行内 — `<text>A<tspan>B</tspan>C</text>` → 1 个 PPTTextElement,content = `<p>A<span>B</span>C</p>`
- [ ] **TEST-02**: 单 tspan 多行 (`dy`) — `<text>A<tspan dy="1em">B</tspan></text>` → 1 个 PPTTextElement,content = `<p>A</p><p>B</p>`
- [ ] **TEST-03**: 单 tspan 多行 (`x`) — `<text>A<tspan x="0">B</tspan></text>` → 1 个 PPTTextElement,content = `<p>A</p><p>B</p>`
- [ ] **TEST-04**: 多 tspan 多行 — `<text><tspan x="0">A</tspan><tspan x="0">B</tspan></text>` → 1 个 PPTTextElement,content = `<p>A</p><p>B</p>`
- [ ] **TEST-05**: 混合 inline + 换行 — `<text>A<tspan>B</tspan>C<tspan dy="1em">D</tspan>E</text>` → 1 个 PPTTextElement,content = `<p>A<span>B</span>C</p><p>D</p>` (注意第二个 `<p>` 只含 D,E 不属于 D 所在段落)
- [ ] **TEST-06**: 嵌套 tspan 换行 — `<text>A<tspan x="0">B<tspan dy="1em">C</tspan>D</tspan></text>` → 1 个 PPTTextElement,content = `<p>A</p><p>B<span>C</span>D</p>` (内层 dy 视为新段落,外层 x 强制换行后 B...D 同一段)

### Regression (Lock existing behavior)

- [ ] **TEST-07**: 现有 single-line 路径测试不回归 (无 tspan 文本元素)
- [ ] **TEST-08**: 现有 inline tspan 路径测试不回归 (继承样式正确)

---

## Future (Deferred to later milestones)

- dy=0 / 无 dy 的等价检测边界条件 (与现有 `x !== undefined` 保持一致的严格语义)
- 段落自动断行 (`<text>` 内纯文本自动按宽度断行) — 当前依赖作者明确 tspan
- `<text>` 元素 baseline-shift 与多段落 `paragraphSpace` 的交互 (Phase 11 已处理 baseline-shift)
- 15 个 pre-existing 测试失败 (gradient / image-outline / path-merge / shadow / shape-rx) — 不在 v1.9 范围

---

## Out of Scope

- 删除 `splitTextForTspans` 启发式分割函数 (text-tspan-content-splitting-bug 修复独立 phase)
- 修复 `text-tspan-mixed-content-loss` 等 28 个 deferred debug sessions
- build system 升级 (tsup) / dependency 升级

---

## Traceability

> Filled by gsd-roadmapper — maps each requirement to exactly one phase.

| REQ-ID | Phase | Status |
|--------|-------|--------|
| TEXT-01 | TBD | Pending |
| TEXT-02 | TBD | Pending |
| TEXT-03 | TBD | Pending |
| TEXT-04 | TBD | Pending |
| TEXT-05 | TBD | Pending |
| TEXT-06 | TBD | Pending |
| TEXT-07 | TBD | Pending |
| TEST-01..08 | TBD | Pending |