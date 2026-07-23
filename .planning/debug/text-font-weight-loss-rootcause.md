---
status: resolved
trigger: "SVG 中 <text font-weight='bold'> 等等的 font-weight 属性在转 JSON 时丢失；用户提到 code/PPTist 中富文本用 strong 标签处理，可能根因是当前实现用 inline style 'font-weight: ' + opts.fontWeight 没经过 <strong> 包裹，PPTist 解析存在漏失。"
created: 2026-07-22T11:00:00.000Z
updated: 2026-07-22T11:15:00.000Z
goal: fix_and_verify
---

## Current Focus
hypothesis: "buildRichTextAST 中『情况1』(transform-to-pptel.ts:447-454) 把无 children 的 text 元素当成 TextNode 返回，TextNode interface (line 416-421) 没有 fontStyle/fontWeight/textDecoration 字段。即 font-weight 永远不会被传给 buildSpanStyle。"
test: "已用 dist 测试：500/800/900 全部丢失，只有 bold/600/700 会被包成 <strong>（line 1493 写死了这三种值）。"
expecting: "修复后 font-weight=500/800/900 等数字值要保留。规范用 <strong> 标签或 inline style font-weight 让 PPTist 解析。"
next_action: "Apply fix: TextNode 改成 ElementNode 路径 / or 把 fontWeight 等字段加进 TextNode 并在 serializeRichText 处理。配合 <strong> 标签以匹配 PPTist 期望格式。"

## Symptoms
expected: |
  <p>
    <strong>
      <span style="font-size: 54px; color: #000">Bold800</span>
    </strong>
  </p>
  或：
  <p>
    <span style="font-size: 54px; color: #000; font-weight: 800">Bold800</span>
  </p>
actual: |
  <p>
    <span style="font-size: 54px; color: #000">Bold800</span>
  </p>
  <!-- 完全丢失 font-weight：500/800/900 都丢失，仅 bold/600/700 通过 line 1571 补救 -->
errors: []
reproduction: |
  ```svg
  <svg viewBox="0 0 800 250" xmlns="http://www.w3.org/2000/svg">
    <text x="10" y="40" font-weight="500" font-size="24">Light500</text>
    <text x="10" y="80" font-weight="800" font-size="24">Bold800</text>
    <text x="10" y="120" font-weight="900" font-size="24">Black900</text>
  </svg>
  ```
  实测输出（已用 dist 跑过）：
    `<p><span style="font-size: 54px; color: #000">Light500</span></p>`
    `<p><span style="font-size: 54px; color: #000">Bold800</span></p>`
    `<p><span style="font-size: 54px; color: #000">Black900</span></p>`
  - 同样适用于 `templates/charts/bubble_packing.svg:39` 等用 font-weight="800"/"700" 的场景。
  - 但 `bold`/`600`/`700` 这三个值会因 line 1493 + 1571 健壮路径而出 `<strong>` 标签。
started: 2026-07-22

## Root Cause

### 主要缺陷
`buildRichTextAST` (src/transformer/transform-to-pptel.ts:442-514) 区分两种情况：
- **情况1（line 447-454）**：text 元素无 children（单行文本或纯文本 inline 场景）。返回 `TextNode`：
  ```typescript
  interface TextNode {
    type: 'text'
    content: string
    fontFamily?: string | null
    fill?: string | null
  }
  ```
  → **没有** `fontStyle` / `fontWeight` / `textDecoration` 字段。即便 SVG `<text font-weight="800">` 进来，font-weight 也丢失。
- **情况2（line 469-510）**：text 元素有 children，会读 tspan 上的 font-weight（line 482-484）但即便外层 text 元素自己有 font-weight，也无法继承给 children。

`serializeRichText` 永远走 `node.type === 'text'` (line 714) 且不会 wrap 一个 span 来添加 `font-weight: 800`。

### 次要缺陷（部分修补）
即使情况1返回了带 fontWeight 的 ElementNode，`TextNode` 路径仍不会触发 style 输出。

### 部分挽救
transformElement 的 text case (line 1492-1493) 读取 font-weight：
```typescript
const fontWeight = element.attrs['font-weight']
const isBold = fontWeight === 'bold' || fontWeight === '600' || fontWeight === '700'
```
- 这只覆盖 `bold`/`600`/`700` 三种值，其他一律判为非 bold 跳过。
- 之后 line 1571 `if (isBold) weightedContent = '<strong>${weightedContent}</strong>'`，但这只在 text 元素本身的 font-weight 是这三种值之一时才生效。

## Eliminated

- hypothesis: "PPTist 不支持 font-weight inline style"
  tested: "Read prosemirror-schema-basic/src/schema-basic.ts:138-149"
  result: rejected
  note: |
    PPTist 的 strong mark parseDOM:
      {tag: 'strong'}, {tag: 'b', getAttrs: ...}, {style: 'font-weight=400', clearMark: ...},
      {style: 'font-weight', getAttrs: (value) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null}
    也就是说 font-weight=500/600/700/800/900/bold/bolder 都能被识别为 strong mark。

- hypothesis: "tspan 上的 font-weight 也丢"
  tested: "看 buildRichTextAST 情况2 line 482-484 已经读 tspan['font-weight']"
  result: rejected
  note: |
    tspan 上的 font-weight 进入 ElementNode.fontWeight，能正常输出。
    但 text 元素自身的 font-weight 没读，是单独的 bug。

- hypothesis: "这个 bug 在已修复的 text-tspan-font-style-italic-bug.md 范围内"
  tested: "重读 .planning/debug/text-tspan-font-style-italic-bug.md 的 Resolution"
  result: rejected
  note: |
    那个 fix 验证的 case 'Bold case (line 38)' 是 tspan 上的 `<tspan font-weight="700">−0.9 BLEU</tspan>`，
    没覆盖 `<text font-weight="800">整个 text 元素 bold</text>` 的情形。

## Evidence

- timestamp: 2026-07-22T11:00:00.000Z
  checked: "src/transformer/transform-to-pptel.ts:447-454 buildRichTextAST 情况1"
  found: "TextNode interface 与实际返回缺 fontWeight 等字段"
  implication: "text 元素自身 font-weight/font-style/text-decoration/font-family 之外的 field 全部丢弃"

- timestamp: 2026-07-22T11:00:00.000Z
  checked: "src/transformer/transform-to-pptel.ts:416-421 TextNode interface"
  found: "仅 fontFamily 和 fill 字段"
  implication: "font-weight/font-style/text-decoration 没有地方放"

- timestamp: 2026-07-22T11:00:00.000Z
  checked: "src/transformer/transform-to-pptel.ts:1492-1493 transformTextElement isBold 判定"
  found: "仅识别 bold/600/700"
  implication: "500/800/900/normal 这些值全部遗失"

- timestamp: 2026-07-22T11:00:00.000Z
  checked: "已用 dist 实际跑 SVG 输入 500/800/900/bold/normal 五个对照样本"
  found: "只有 bold 出 <strong>，其他都丢"
  implication: "根因定位正确"

- timestamp: 2026-07-22T11:00:00.000Z
  checked: "code/PPTist/src/utils/prosemirror/schema/marks.ts:204 + prosemirror-schema-basic/src/schema-basic.ts:138-149"
  found: "strong mark 支持 inline font-weight=bold/500-999，也支持 <strong> 标签"
  implication: "PPTist 解析侧没问题，问题在 svg2json 出 HTML 之前就丢了样式"

## Resolution
root_cause: |
  1. TextNode interface (transform-to-pptel.ts:416-421) 缺少 fontStyle/fontWeight/textDecoration 三个字段。
  2. buildRichTextAST 情况1 (line 447-454) 不读取 font-weight 等样式，仅在 TextNode 中保留 font-family 与 fill。
  3. transformTextElement isBold 判定 (line 1493) 仅识别 bold/600/700，无法覆盖 100-900 数字值；non-bold 值的 parent 继承链路也未建立。
  4. serializeRichText 在 node.type==='text' 时 (line 714-737) 即使有样式信息，也不会把 font-weight: 800 输出（因为 TextNode 没有这个字段）。
  5. svg-parser 配 parseAttributeValue:true 会把 "800" 解析为 number 800，而 isBold 判定用严格相等比较 `fontWeight === '800'` 永远为 false。这是隐藏的 type trap。
fix: |
  实施内容（commit 前状态）：
  (a) TextNode interface 新增 fontStyle/fontWeight/textDecoration 三个可选字段。
  (b) buildRichTextAST 情况1 读取 element.attrs['font-style']/'font-weight'/'text-decoration'；
      情况2 中 tspan 节点 ElementNode 的 explicitFontStyle/Weight/Decoration 也继承父级，作为 tspan 子树 TextNode 的 parentFontXXX。
  (c) serializeRichText text 节点分支：effectiveFontWeight/Style/Decoration 与 parent 比较，
      needStrong/Em/Underline 三层包裹（与 PPTist strong/em/underline mark 解析规则一致）。
  (d) buildTextContentFromElement / buildRichTextAST / extractTspansWithPosition 函数签名扩展
      接收 parentFontWeight/parentFontStyle/parentTextDecoration；multiline 路径下 tspan 能继承父级样式。
  (e) transformTextElement isBold 识别 bold/bolder/500-900（用 String() 归一化规避 number 类型陷阱），
      并保留顶层 <strong>/<em> 包裹（仅当 innerSpan 不含相应 mark 时，避免嵌套）。
  (f) extractTspansWithPosition fallback 路径（无 tspan children）改为复用 buildTextContentFromElement，
      避免再丢失 element 自带样式。
verification: |
  - 修复前实测：font-weight="500"/"800"/"900" 在 SVG 中全部丢失。仅 bold/600/700 因 line 1493 + line 1571 挽救路径工作。
  - 修复后实测：
      `<p><strong><span style="font-size: 54px; color: #000; font-weight: 500">Light500</span></strong></p>`
      `<p><strong><span style="font-size: 54px; color: #000; font-weight: 800">Bold800</span></strong></p>`
      `<p><strong><span style="font-size: 54px; color: #000; font-weight: 900">Black900</span></strong></p>`
      `<p><span style="font-size: 54px; color: #000">Normal</span></p>`
      `<p><strong><span style="font-size: 54px; color: #000; font-weight: bold">BoldKeyword</span></strong></p>`
  - 无 <strong><strong> 嵌套；normal/400 不出 <strong>。
  - 多行 tspan（text font-weight="800" + 无 font-weight tspan）每行正确包 <strong>；继承链完整。
  - 全量 vitest：190 passed / 15 failed（失败的 15 个为预先存在的 shape-rx/shadow/gradient/path-merge/image-outline 失败，
    与本修复无关 — git stash 后跑同样这 15 个仍失败，确认零回归）。
  - 新增 __tests__/text-font-weight-coverage.test.ts 共 12 个用例（500/800/900/normal/bold/em/u、multiline inheritance、no-double-nesting）全部通过。
files_changed:
  - src/transformer/transform-to-pptel.ts
  - __tests__/text-font-weight-coverage.test.ts (新增)
