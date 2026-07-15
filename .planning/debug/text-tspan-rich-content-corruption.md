---
status: resolved
trigger: "SVG text/tspan rich text content corruption - O(log_k(n)) becomes O(n / r)"
created: 2026-07-14T10:00:00.000Z
updated: 2026-07-14T10:30:00.000Z
---

## Current Focus

hypothesis: "需要追踪整个 SVG text/tspan 解析到富文本生成的完整流程"
test: "检查 buildTextContentFromElement 函数的输出是否符合预期"
expecting: "发现为什么会出现嵌套 span 和 font-size 缩放问题"
next_action: "在 buildTextContentFromElement 函数中添加调试日志，追踪每个 text segment 和 tspan 的处理过程"

## Symptoms

expected: |
  输入 SVG：
  <text font-size="14" font-family="Consolas">O(log<tspan font-size="10" baseline-shift="sub">k</tspan>(n))</text>

  预期输出 JSON content：
  <p><span style="font-size: 14px">O(log</span><sub style="font-size: 10px">k</sub><span style="font-size: 14px">(n))</span></p>

actual: |
  实际输出 JSON content：
  <p><span style="font-size: 10.9375px"><span style="font-size: 10.9375px">O(log</span></span><span style="vertical-align: sub; font-size: 7.8125px"><span style="font-size: 7.8125px">k</span></span><span style="font-size: 10.9375px"><span style="font-size: 10.9375px">(n))</span></span></p>

  问题：
  1. O(log 前面多包了一层 span
  2. font-size 被错误缩放：14 -> 10.9375px, 10 -> 7.8125px
  3. sub 样式用了 vertical-align 而不是 <sub> 标签

errors: []
reproduction: |
  SVG 示例：
  <text xmlns="http://www.w3.org/2000/svg" x="600" y="28" font-family="Consolas, 'Courier New', monospace" font-size="14" fill="#4A4A4A">O(log<tspan font-size="10" baseline-shift="sub">k</tspan>(n))</text>

started: 最近代码变更后

## Eliminated

## Evidence

- timestamp: 2026-07-14T10:05:00.000Z
  checked: "运行 CLI 处理测试 SVG"
  found: |
    输出 JSON 显示：
    - content 中的 text 内容被正确保留（O(log, k, (n))）
    - 但有多层嵌套 span
    - font-size 被缩放（14 -> 10.9375px, 10 -> 7.8125px）

  implication: "内容基本正确但格式有问题：嵌套 span 和 font-size 缩放错误"

- timestamp: 2026-07-14T10:10:00.000Z
  checked: "buildTextContentFromElement 函数 (行 411-466)"
  found: |
    问题在第 451-453 行：
    ```typescript
    const { html: childHtml, text: childText } = buildTextContentFromElement(child, parentFontSize, scaleY)
    const scaledParentFontSize = parentFontSize * scaleY
    htmlContent += `<span style="font-size: ${scaledParentFontSize}px">${childHtml}</span>`
    ```
    这里对每个 text 子节点都用 scaledParentFontSize 包装了一层 span。

    第 460-462 行：
    ```typescript
    if (!htmlContent && element.text) {
      const scaledParentFontSize = parentFontSize * scaleY
      htmlContent = `<span style="font-size: ${scaledParentFontSize}px">${element.text}</span>`
    }
    ```
    如果 text 节点有自己的文本，也会用 scaledParentFontSize 包装。

  implication: "嵌套 span 的来源：当 text 元素有子节点时，每个子节点都被 span 包装，而子节点自己的文本又会被包装"

- timestamp: 2026-07-14T10:15:00.000Z
  checked: "scaleY 参数的来源"
  found: |
    scaleY 被传入 buildTextContentFromElement 用于计算 scaledParentFontSize
    但这个 scaleY 是从 transform scale 派生出来的，不应该影响 font-size

  implication: "scaleY 不应该影响 font-size 计算，font-size 应该使用原始值"

## Resolution

root_cause: |
  buildTextContentFromElement 函数中存在双重缩放问题：
  1. scaleY 是 viewBox 到目标画布的缩放比例（默认 562.5/720 = 0.78125）
  2. 行 1083 调用时传入 scaleY，但 fontSize 传入的是原始值（14）而非已缩放的值
  3. 行 452 计算 scaledParentFontSize = parentFontSize * scaleY = 14 * 0.78125 = 10.9375
  4. 结果是 font-size 被错误缩放

  嵌套 span 问题：
  - 行 460-462：当元素有直接文本但没有子节点时，用 scaledParentFontSize 包装
  - 行 451-453：当元素有子节点时，每个子节点的处理结果被额外包装一层 span
  - 这导致 text segment 的内容被双重包装

fix: |
  修改 buildTextContentFromElement 函数：
  1. 移除 font-size 的 scaleY 缩放（font-size 已经在调用者处处理过了）
  2. 简化 span 包装逻辑，避免不必要的嵌套

  修改点：
  - 行 452：使用 parentFontSize 而不是 parentFontSize * scaleY
  - 行 425, 436, 443：tspan 的 font-size 也不应该被 scaleY 缩放
  - 行 461：使用 parentFontSize 而不是 parentFontSize * scaleY

verification: |
  - 修复后 font-size 应该保持原始值：14px -> 14px（不是 10.9375px）
  - tspan font-size="10" 应该输出 10px（不是 7.8125px）
  - 不应该有嵌套的重复 span

  验证结果：
  修复后输出：`<p><span style="font-size: 14px">O(log</span><sub style="font-size: 10px">k</sub><span style="font-size: 14px">(n))</span></p>`
  - font-size 正确：14px, 10px ✓
  - 使用 <sub> 标签而不是 vertical-align: sub ✓
  - 无嵌套 span ✓
  - text 内容正确保留：O(log, k, (n)) ✓

  text 相关测试全部通过 (49 tests)

files_changed:
  - src/transformer/transform-to-pptel.ts
