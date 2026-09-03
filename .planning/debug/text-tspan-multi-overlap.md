---
status: resolved
trigger: "处理<text xmlns=\"http://www.w3.org/2000/svg\" x=\"166\" y=\"298\" text-anchor=\"start\" xml:space=\"preserve\" font-family=\"'思源黑体','Microsoft YaHei',Arial,sans-serif\" font-size=\"20\" fill=\"#262626\"><tspan x=\"166\">独立完成 </tspan><tspan font-weight=\"bold\" fill=\"#0F5DAF\">8 项辨认</tspan></text>数据转json后文字重叠到一起了"
created: 2026-09-03T14:30:00.000Z
updated: 2026-09-03T07:52:44.564Z
---

## Current Focus

hypothesis: "hasLineBreakTspans() 用 tspan 的 `x` 属性判定多行，但 `x` 仅表示绝对横坐标（也用于内联重置），不应作为换行标志。真正的换行标志是 `dy`（相对垂直位移）或 `y`（绝对 y 改变）。当 tspan 只有 `x`（与父 text 同 x）且无 `dy` 时，应作为同行内联片段处理。"
test: "修复 hasLineBreakTspans() 改用 dy/y；运行 transform-to-pptel 测试套件；用 09_duan6_dabiao.svg 验证输出为单个 text 元素"
expecting: "tspan 全部内联 → 单一 text 元素 + 复合 content HTML（包含 <span> 和 <strong>）；覆盖现有 multiline 测试（用 dy 的 tspan 仍走 multiline 分支）"
next_action: "1) 修改 hasLineBreakTspans() 检查 dy/y 而非 x；2) 运行所有 text 相关测试；4) 用 09_duan6_dabiao.svg 实际验证"

reasoning_checkpoint:
  hypothesis: "tspan 的 x 属性仅表示横坐标（包括同行内联重置），不等于换行；真正的换行由 dy（垂直位移）或 y（绝对 y 改变）决定。当前的 hasLineBreakTspans 规则过于宽松，导致内联 tspan 被错误地拆成多个 text 元素。"
  confirming_evidence:
    - "现有 multiline 测试 text-anchor.test.ts:104-105/text-font-weight-coverage.test.ts:61-62 都同时使用 x 和 dy 来表示换行；改用 dy 判定仍能识别这些用例"
    - "05_duan2_guize.svg:31-33 中 tspan[0] 用 x=120 但无 dy 作为首行起点，tspan[1..2] 用 x=120 + dy=26 表示换行；改用 dy 判定后首行不会被误当独立 text"
    - "buildTextContentFromElement → serializeRichText 已支持内联 tspan 序列化为 <span>/<strong>（text-tspan-color-and-order-bug 已修复过这条路径）"
  falsification_test: "如果某 SVG 含多行 tspan 但都没用 dy/y 而用 x 表达换行（极少见，可能不存在），我们的修复会把它合并成一行 → 错位。该情况下输出 JSON 的 width/height 比正常小"
  fix_rationale: "hasLineBreakTspans 改为 dy/y 判定：dy 是 SVG 标准的相对换行位移，y 是绝对 y 改变。x 仅是横坐标，不应作为换行标志。这是修复根因而非症状。"
  blind_spots: "未检查 SVG 规范里是否还有 <tspan baseline-shift='sub'/'super'> 等垂直偏移可能影响行高的边界情况（这些不影响多行判定）"

## Symptoms

expected: |
  同一 `<text>` 内的多个 `<tspan>` 应合并为单个 JSON text 元素：
  {
    "id": "831ba73d-...",
    "type": "text",
    "left": 129.6875,
    "top": 219.54,
    "width": 149.02,
    "height": 24,
    "content": "<p style=\"font-size:15.625px\"><span>独立完成 </span><strong style=\"color:#0F5DAF\">8 项辨认</strong></p>"
  }
  - 共享 left/top/width/height
  - 内部用 <span>/<strong> 表达 tspan 的差异样式（font-weight:bold、fill:#0F5DAF）

actual: |
  两个独立 text 元素同时输出到 JSON：
  1) {
    "id": "831ba73d-9a95-4237-8f83-770c9fe1d243",
    "type": "text",
    "left": 129.6875,
    "top": 219.54498291015625,
    "width": 149.01580810546875,
    "height": 24,
    "content": "<p style=\"font-size: 15.625px; text-align: left\"><span style=\"font-size: 15.625px\">独立完成 </span></p>",
    ...
  }
  2) {
    "id": "831ba73d-9a95-4237-8f83-770c9fe1d243-line-1",
    "type": "text",
    "left": 129.6875,
    "top": 219.54498291015625,
    "width": 149.01580810546875,
    "height": 24,
    "content": "<p style=\"font-size: 15.625px; text-align: left\"><strong><span style=\"font-size: 15.625px; color: #0F5DAF; font-weight: bold\">8 项辨认</span></strong></p>",
    ...
  }
  两个 text 共享 left/top，导致渲染时文字在屏幕上完全重叠在一起。

errors: []
reproduction: |
  1. 读取 exampels/svg_output/09_duan6_dabiao.svg
  2. 查找含 x="166" y="298" 的 `<text>` 节点（含两个 tspan，第一个 tspan 有 x="166"，无 dy；第二个 tspan 无 x）
  3. 运行 svg2json 转换器
  4. 检查 JSON 输出，应有 groupId="task-list" 的两个 text 元素在 left/top 冲突
started: "always broken"

## Eliminated

- hypothesis: "transformElement/text 处理把 <text> 内每个 <tspan> 当作独立 text 元素 emit（fork emit）"
  evidence: "实际是 hasLineBreakTspans() 判定错误导致走 multiline 路径；serializeRichText 已经支持内联 tspan 合并（text-tspan-color-and-order-bug 已修复）"
  timestamp: "2026-09-03T15:50:00.000Z"

## Evidence

- timestamp: "2026-09-03T14:30:00.000Z"
  checked: "用户提供的输入/输出对比"
  found: "两个 text 元素 id 分别为 '831ba73d-...' 和 '831ba73d-...-line-1'，后者带 -line-1 后缀，说明转换逻辑中存在 '每行一个 text' 的 emission 模式"
  implication: "Bug 可能在 transformElement 中 text 处理逻辑：每个 tspan 被当作独立 'line' emit"

- timestamp: "2026-09-03T15:40:00.000Z"
  checked: "src/transformer/transform-to-pptel.ts 第 826-842 行 hasLineBreakTspans 函数"
  found: "函数检查 tspan.children 中任意 tspan 有 `x` 属性就返回 true（多行）；注释写 'Rule: 有 x = 换行'"
  implication: "规则过于宽松：x 仅是横坐标，常见内联用法是 tspan[0] 用 x 与父 text 同 x 作为起点（无 dy），但被误判为换行"

- timestamp: "2026-09-03T15:45:00.000Z"
  checked: "现有 multiline 测试（text-anchor.test.ts:104-105, text-font-weight-coverage.test.ts:61-62, text-fields.test.ts:78-79）"
  found: "全部使用 x + dy 双重属性表示换行（dy=0/dy=12/dy=30 等）；不依赖单独的 x 属性"
  implication: "改为检查 dy 不会破坏现有测试（既有测试用例都有 dy）"

- timestamp: "2026-09-03T15:50:00.000Z"
  checked: "exampels 全量 SVG 的 tspan x 用法（grep '<tspan x=' | grep -v 'dy='）"
  found: "7 个 tspan 仅用 x（无 dy）— 4 个来自 09_duan6_dabiao.svg（本次 bug），3 个来自 05_duan2_guize.svg（第 1 行 tspan 用 x 作为起点，后续用 dy）"
  implication: "这 7 个 tspan 当前都会被错误地当作换行。修复后：09_duan6 的abiao 的 4 个 inline tspan 会被合并（正确）；05_duan2 的 3 个首行 tspan 不会被误判（因为后续 tspan 仍带 dy，hasLineBreakTspans 仍返回 true）"

- timestamp: "2026-09-03T15:55:00.000Z"
  checked: "serializeRichText / buildTextContentFromElement / buildRichTextAST 路径"
  found: "当 hasLineBreakTspans=false 时，transformTextElement 走 single-line 分支（line 1723+），调用 buildTextContentFromElement → buildRichTextAST → serializeRichText 完整序列化为内联 HTML，已支持 tspan 的 font-weight/fill 等差异样式输出 <span>/<strong>"
  implication: "修复 hasLineBreakTspans 后，inline tspan 会被正确序列化为单一 text 元素的复合 HTML content"

## Resolution

root_cause: "hasLineBreakTspans() 用 tspan 的 x 属性判定多行过于宽松，x 仅是绝对横坐标（也用于内联起点重置），真正的换行标志应是 dy 或 y。修复后把判定条件改为 dy !== undefined || y !== undefined。"
fix: "修改 src/transformer/transform-to-pptel.ts 第 826-842 行 hasLineBreakTspans() 函数，把判定条件从 x !== undefined 改为 dy !== undefined || y !== undefined，并加注释说明 x 仅是横坐标不能作为换行依据。"
verification: "64 个 multiline 测试全通过；端到端验证 09_duan6_dabiao.svg 的 14 个 text 元素唯一 left/top 零重叠；bug 元素内容含合并的 独立完成 与带 color: #0F5DAF/font-weight: bold 的 8 项辨认"
files_changed:
  - "src/transformer/transform-to-pptel.ts"
  - "__tests__/text-tspan-mixed-content.test.ts"