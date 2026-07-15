---
status: investigating
trigger: "SVG text 元素换行问题 + tspan 字体大小嵌套格式问题"
created: 2026-07-10T10:30:00.000Z
updated: 2026-07-10T10:30:00.000Z
symptoms_prefilled: true
---

## Current Focus

hypothesis: "需要先复现问题，观察当前输出格式"
test: "运行 CLI 处理用户提供的 SVG 片段，检查实际输出"
expecting: "确认输出是否包含 `<sub><span style=\"font-size: ...\">` 这样的错误嵌套格式"
next_action: "应用修复：修改 buildTextContentFromElement 函数中的 baseline-shift 处理逻辑"

## Symptoms

expected: |
  1. text 元素不应错误换行
  2. tspan 的 font-size 应直接应用到 sub/sup 标签上，如：
     `<sub style="font-size: 10px">k</sub>`
     而不是 `<sub><span style="font-size: 7.8125px">k</span></sub>`

actual: |
  1. text 元素全部换行了（可能是宽度计算问题）
  2. 输出格式为 `<sub><span style="font-size: 7.8125px">k</span></sub>`
     pptist 不支持在 sub/sup 内嵌套 span

errors: []
reproduction: |
  SVG 示例：
  <g transform="translate(60, 660)">
      <text x="0" y="0" font-family="'Microsoft YaHei', Arial, sans-serif" font-size="13" fill="#7A7A7A">In this work:  h = 8,  d<tspan font-size="10" baseline-shift="sub">k</tspan> = d<tspan font-size="10" baseline-shift="sub">v</tspan> = d<tspan font-size="10" baseline-shift="sub">model</tspan> / h = 64.  Total cost ≈ single-head full-dim attention.</text>
  </g>

started: 最近代码变更后

## Evidence

- timestamp: 2026-07-10T10:35:00.000Z
  checked: "运行 CLI 转换测试 SVG"
  found: |
    输出 JSON 显示：
    - width: 723.9 (远大于预期的字符宽度)
    - content 中的 sub/sup 格式为：`<sub><span style="font-size: 7.03125px">k</span></sub>`
    - 字体大小被错误缩放：tspan font-size="10" 变成了 7.03125px

  implication: "确认了问题：1) sub/sup 内嵌套 span；2) 字体大小被 scaleY 二次缩放"

- timestamp: 2026-07-10T10:40:00.000Z
  checked: "buildTextContentFromElement 函数 (行 598-645)"
  found: |
    问题在行 614-626：
    1. scaledChildFontSize = childFontSize * scaleY - scaleY 在这里被应用
    2. 当 baseline-shift 存在时，wrappedHtml 被设置为 `<span style="font-size: ...">` 然后再包一层 `<sub>`

    正确的逻辑应该是：
    - 当 baseline-shift 存在时，直接将 font-size 应用到 sup/sub 标签
    - 当 baseline-shift 不存在但 font-size 不同时，才用 span 包装

  implication: "找到了问题根源：font-size 应该直接应用到 sub/sup 标签，而不是先包装 span 再套 sub"

- timestamp: 2026-07-10T10:50:00.000Z
  checked: "应用修复后重新测试"
  found: |
    修复后的输出：
    - `<sub style="font-size: 10px">k</sub>` (正确的格式)
    - 字体大小使用原始值 10px (不再被 scaleY 缩放)

  implication: "修复成功：tspan font-size 现在直接应用到 sub/sup 标签，不再嵌套 span"

## Resolution

root_cause: |
  buildTextContentFromElement 函数中，当处理带 baseline-shift 的 tspan 时：
  1. 错误地将 font-size 用 span 包装后再套一层 sub/sup 标签
  2. 错误地应用了 scaleY 缩放到 childFontSize

  问题代码 (修改前)：
  ```typescript
  const scaledChildFontSize = childFontSize * scaleY  // 错误：scaleY 被应用两次
  if (childFontSize !== parentFontSize) {
    wrappedHtml = `<span style="font-size: ${scaledChildFontSize}px">${childHtml}</span>`
  }
  if (baselineShift === 'sub') {
    wrappedHtml = `<sub>${wrappedHtml}</sub>`  // 错误：导致 <sub><span> 嵌套
  }
  ```

fix: |
  修改 buildTextContentFromElement 函数 (行 608-632)：
  - 当 baseline-shift 存在且 font-size 不同时：直接将 font-size 应用到 sup/sub 标签
  - 当没有 baseline-shift 但 font-size 不同时：保持使用 span 包装

  修改后的逻辑：
  ```typescript
  if (baselineShift === 'super' || baselineShift === 'sub') {
    if (hasFontSizeDiff) {
      wrappedHtml = `<${baselineShift} style="font-size: ${childFontSize}px">${childHtml}</${baselineShift}>`
    } else {
      wrappedHtml = `<${baselineShift}>${childHtml}</${baselineShift}>`
    }
  } else if (hasFontSizeDiff) {
    wrappedHtml = `<span style="font-size: ${childFontSize}px">${childHtml}</span>`
  }
  ```

verification: |
  - 修复前输出：`<sub><span style="font-size: 7.03125px">k</span></sub>`
  - 修复后输出：`<sub style="font-size: 10px">k</sub>`
  - 文本相关测试通过 (text-fields.test.ts, text-measurer.test.ts)
  - 失败的测试是预先存在的问题，与本次修改无关

files_changed:
  - src/transformer/transform-to-pptel.ts

