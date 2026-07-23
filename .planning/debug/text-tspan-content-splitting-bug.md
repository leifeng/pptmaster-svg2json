---
status: investigating
trigger: "SVG text/tspan content splitting bug - heuristic splitTextForTspans fails on real-world text patterns"
created: 2026-07-21T10:00:00.000Z
updated: 2026-07-21T10:30:00.000Z
---

## Current Focus
hypothesis: "splitTextForTspans 使用启发式算法分割文本，导致当实际文本分布不均匀时失败。根本原因是 XML parser 不保留 text 和 tspan 子元素的顺序。"
test: "分析 splitTextForTspans 对示例输入的处理结果"
expecting: "找出启发式分割失败的具体条件和根本原因"
next_action: "检查 fast-xml-parser 的 preserveOrder 选项是否可用，以及修改 parser 的可行性"

## Symptoms
expected: |
  对于输入：
  <text x="246" y="222">
    Single head loses
    <tspan fill="#C53030">−0.9 BLEU</tspan>
    vs h = 8; too many heads (h = 32) also degrade.
  </text>

  期望输出：
  - 文本片段1: "Single head loses "
  - Tspan: "−0.9 BLEU"
  - 文本片段2: "vs h = 8; too many heads (h = 32) also degrade."

actual: "启发式分割可能在错误的位置分割，导致文本片段内容混乱"
errors: []
reproduction: |
  SVG 示例：
  <text x="246" y="222">Single head loses <tspan fill="#C53030">−0.9 BLEU</tspan> vs h = 8; too many heads (h = 32) also degrade.</text>
started: "unknown"

## Eliminated

## Evidence
- timestamp: 2026-07-21T10:00:00.000Z
  checked: "buildRichTextAST 函数实现（第434-508行）"
  found: |
    代码注释明确承认了问题：
    "问题：element.text 不包含 tspan 文本，所以我们无法直接知道哪些文本在 tspan 之前，哪些在 tspan 之后"
    "解决方案：使用启发式分割"

    关键代码：
    1. 第464行：textContent = element.text || ''
    2. 第467行：splitTextForTspans(textContent, tspanTexts.length)
    3. 第471-500行：按顺序遍历 children，交替添加 textParts 和 tspan

  implication: "启发式分割是无奈之举，当文本分布不均匀时会失败"

- timestamp: 2026-07-21T10:05:00.000Z
  checked: "splitTextForTspans 函数实现（第514-651行）"
  found: |
    对于 numParts = 2 的情况（1个 tspan），策略为：
    1. 策略1：如果文本以完整句子结尾，在最后一个句子边界分割
    2. 策略2：如果有多个句子边界，在前 1/4 位置附近找句子边界
    3. 策略3：只有一个句子边界且不以句子结尾，找分号/逗号
    4. 策略4：在前 1/5 位置找空白分割

  implication: "这些启发式策略无法处理所有情况，特别是当文本不符合这些模式时"

- timestamp: 2026-07-21T10:10:00.000Z
  checked: "serializeRichText 函数实现（第660-706行）"
  found: |
    函数只处理 font-size 和 fill，没有处理 font-family
    第666行：spanStyle = 'font-size: ' + parentFontSize + 'px'
    第667-669行：可选添加 color

  implication: "font-family 不会从父 text 元素传递给 tspan 子元素"

- timestamp: 2026-07-21T10:15:00.000Z
  checked: "SVG parser 对 mixed content 的处理（第469-494行）"
  found: |
    extractTextContent 函数用于从 node 中提取文本
    但 convertToSvgElement 函数（第503-559行）并不使用 extractTextContent
    而是直接取 node['#text'] 作为 text 属性

  implication: "parser 不保留 text 和 tspan 子元素的顺序，导致无法准确知道哪些文本属于哪个 tspan"

- timestamp: 2026-07-21T10:20:00.000Z
  checked: "fast-xml-parser 配置（第698-722行）"
  found: |
    parser 配置：
    - ignoreAttributes: false
    - attributeNamePrefix: '@_'
    - parseAttributeValue: true
    - parseTagValue: false
    - trimValues: false
    - isArray: 列出需要作为数组处理的标签（包括 tspan）

  implication: "当前 parser 没有使用 preserveOrder 选项"

## Resolution
root_cause: |
  **根本原因：SVG parser 配置缺少 preserveOrder: true**

  1. **启发式分割失败的根本原因**：当前的 XML parser (fast-xml-parser) 配置没有使用 `preserveOrder: true`
     - 不使用 preserveOrder：`<text>text1<tspan>t</tspan>text2</text>` 解析为 `{ "#text": "text1text2", "tspan": {...} }`
     - 使用 preserveOrder：解析为 `[{ "#text": "text1" }, { "tspan": {...} }, { "#text": "text2" }]`
     - 当前代码依赖 `splitTextForTspans` 启发式分割，但文本分布不均匀时必然失败

  2. **font-family 丢失**：serializeRichText 函数只处理 font-size 和 fill，不处理 font-family
     - 第666行：`spanStyle = 'font-size: ' + parentFontSize + 'px'`
     - font-family 没有被传递到 RichTextNode 树中

  3. **验证**：使用 preserveOrder 测试确认：
     - 输入：`<text>Singe head loses <tspan fill="#C53030">−0.9 BLEU</tspan> vs h = 8; too many heads (h = 32) also degrade.</text>`
     - Without preserveOrder: `element.text = "Singe head loses  vs h = 8; too many heads (h = 32) also degrade."`（丢失了位置信息）
     - With preserveOrder: 正确保留顺序 - text1, tspan, text2

fix: |
  **推荐方案：启用 preserveOrder 并修改相关处理逻辑**

  1. **Parser 修改** (`src/parser/svg-parser.ts`):
     - 第702行后添加 `preserveOrder: true` 到 parser 配置

  2. **convertToSvgElement 修改** (`src/parser/svg-parser.ts`):
     - 当 preserveOrder 时，子节点是一个数组，包含 `#text` 节点和元素节点
     - 需要修改处理逻辑来正确构建 SvgElement.children

  3. **buildRichTextAST 修改** (`src/transformer/transform-to-pptel.ts`):
     - 移除 splitTextForTspans 调用
     - 直接按顺序遍历 children，处理每个 #text 和 tspan

  4. **serializeRichText 修改** (`src/transformer/transform-to-pptel.ts`):
     - 添加 fontFamily 参数
     - 在 spanStyle 中包含 font-family

  5. **font-family 继承**:
     - buildRichTextAST 需要接收并传递 fontFamily 属性
     - RichTextNode 类型需要添加 fontFamily?: string 字段

verification: |
  修复后，对于输入：
  ```svg
  <text font-family="Arial" font-size="14">
    Single head loses
    <tspan fill="#C53030">−0.9 BLEU</tspan>
    vs h = 8; too many heads (h = 32) also degrade.
  </text>
  ```

  期望输出：
  ```html
  <p>
    <span style="font-family: Arial; font-size: 14px; color: #1A202C;">Single head loses </span>
    <span style="font-family: Arial; font-size: 14px; font-weight: 700; color: #C53030;">−0.9 BLEU</span>
    <span style="font-family: Arial; font-size: 14px; color: #1A202C;">vs h = 8; too many heads (h = 32) also degrade.</span>
  </p>
  ```
files_changed:
  - "src/parser/svg-parser.ts"
  - "src/transformer/transform-to-pptel.ts"
