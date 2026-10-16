# Phase 16: template-element-marking - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-16
**Phase:** 16-template-element-marking
**Areas discussed:** templateType 字段类型, contentBounds 坐标系, path-merge 与 templateType, contentBounds 提取位置, multiline text 拆行后 templateType 传播

---

## templateType 字段类型

| Option | Description | Selected |
|--------|-------------|----------|
| number: 1 (推荐) | 符合 REQUIREMENTS.md 写法;反向断言 TPL-E2E-02 锁定"仅取 1 或 undefined";未来扩展(2/3)仅需加 literal | ✓ |
| boolean: true | 语义上是布尔;PPTist 端扩展难;不贴 REQUIREMENTS.md | |
| string literal: 'template' | 字符串枚举,贴近 PPTist 风格;但 TPL-E2E-02 锁定数字 | |

**User's choice:** number: 1 (推荐)
**Notes:** REQUIREMENTS.md 明确说 `templateType=1`,且 TPL-E2E-02 反向断言锁定了字面量 `1` 与 `undefined` 两值。字面量类型让 TypeScript 在编译期就能拦截非法赋值(不写 fixture 也能保护。

---

## contentBounds 坐标系

| Option | Description | Selected |
|--------|-------------|----------|
| 保留 SVG viewBox 原始数值 (推荐贴三方协议) | 与三方 `data-pptx-bounds` 原样一致(1280×720 空间);TPL-DEC-04 说"纸面 PPTist 协议" | ✓ |
| 按 canvas 缩放 (贴 PPTist 元素坐标) | 与 PPTist 元素坐标一致(1000×562.5);{x: 76.5625, y: 140.625, w: 846.875, h: 315.625};与三方原文不一致 | |
| 保留原始但加 scaleX/Y 备写 | 保留原始 + 加 scaleX/Y 字段供 PPTist 参考;信息冗余但灵活 | |

**User's choice:** 保留 SVG viewBox 原始数值 (推荐贴三方协议)
**Notes:** TPL-DEC-04 描述为"纸面 PPTist 协议",意指按三方文档原样保留。04_content.svg fixture 原文是 `data-pptx-bounds="98 180 1084 404"`,x=98 在 1280 空间内合理。PPTist 端若有需要可一行 scaleX = 1000/1280 = 0.78125 转 canvas。

---

## path-merge 与 templateType

| Option | Description | Selected |
|--------|-------------|----------|
| 带 templateType=1 (推荐贴 TPL-MARK-02) | merge 元素逻辑上是 `<g id="*-template">` 的代表;TPL-MARK-02 "子树下"传播;E2E-02 允许 1 | ✓ |
| 不带 (贴 TPL-MARK-01 严格匹配) | merge 元素 id 是合成 `<group_id>__nanoid(5)>` 不含 `-template`;Merge 元素不是原始 SVG element | |
| 保守:不带 (实务安全) | merge 元素 PPTist 端视为"复合 shape"可能不会处理 templateType | |

**User's choice:** 带 templateType=1 (推荐贴 TPL-MARK-02)
**Notes:** path-merge 是 v1.7 已有的 group 子树合并行为;merge 元素代表整个 group 的视觉语义。若 group 是 `<g id="*-template">`,merge 后元素理应是模板代表。E2E-02 仅规定"1 或 undefined",没有禁止。

---

## contentBounds 提取位置

| Option | Description | Selected |
|--------|-------------|----------|
| convertOne 单独扫一遍 (推荐副作用小) | convertOne 已有 AST 访问权;新函数 findContentBounds();不动 transformToPPTElement 签名 → 所有现有调用点不动 | ✓ |
| transformToPPTElement 返回 {elements, contentBounds} | 复用 walk() 顺便扫 contentBounds;签名变 → 需更新 convertOne + 所有现有测试 | |
| 独立工具函数 + transformer 调用 | transformer 内部新增 extractContentBounds() 工具;靠包装函数拆开 | |

**User's choice:** convertOne 单独扫一遍 (推荐副作用小)
**Notes:** convertOne 是构造 Slide 的位置(transformer 输出 → Slide 装配),且已有 `ast` 引用(contentBounds 来自 SVG AST 的 `data-pptx-bounds` 属性,与 transformToPPTElement 的 PPTElement 输出不同)。不动 transformer 签名可以保持 v1.10 阶段 116 个动画测试不回归。

---

## multiline text 拆行后 templateType 传播

| Option | Description | Selected |
|--------|-------------|----------|
| 每行独立带 templateType=1 | multiline text 拆出的 N 个 text element 都从同一父 text 拿 context (groupId + id);父 text 标记 template → 每个 line 都带 templateType=1 | ✓ |
| 仅主 line 带,子 line 不带 | 只有 idx=0 的主 line 带 templateType=1;其他 line 不带 | |
| 拆成多 line 后不再视为 template | 一旦 multiline 拆分就退化为普通文本,templateType 丢失 | |

**User's choice:** 每行独立带 templateType=1
**Notes:** multiline text 在 transformElement() text case 中 `tspanElements.map(...)` 返回 N 个 PPTTextElement;每行 result 在统一应用 templateType 之前都从同一 `element`(父 text) 拿到 context(已有 groupId)。语义上 N 行都是同一文本元素在不同 y 坐标上的拆解,templateType 决策应一致。

---

## Claude's Discretion

- templateType 注入时机:`transformElement()` 顶部计算 `isTemplate`,统一注入到所有 switch case 的 result(参照既有 groupId 写入模式,各 case 末尾追加)
- `data-pptx-bounds` 解析容错:严格空格分隔 `/\s+/`,四数不足则 skip 该 slot(等同 TPL-CB-03 字段不出现)
- multiline text id 派生保持现有 `${id}-line-${idx}` 模式(templateType 是新增字段,不改变 id 命名)
- E2E 测试文件命名:`__tests__/template-marking.test.ts`(新增),与现有 `transform-element.test.ts` 风格对齐

## Deferred Ideas

None — discussion stayed within phase scope.