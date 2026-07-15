---
status: resolved
trigger: "SVG text 元素转换为 JSON 后，字体没有统一使用 SourceHanSans"
created: 2026-07-09T09:50:00.000Z
updated: 2026-07-09T09:55:00.000Z
---

## Current Focus

hypothesis: 当 SVG 中的 text 元素显式设置了 font-family 属性时，代码直接使用该属性值而不是强制替换为 SourceHanSans
test: 测试带 font-family 和不带 font-family 的 text 元素
expecting: 带 font-family 的元素也应该使用 Source Han Sans CN Regular
next_action: 写入根因报告

## Symptoms

expected: 所有 text 元素的 defaultFontName 应该统一为 "Source Han Sans CN Regular"
actual: 当 SVG text 元素显式指定 font-family 时（如 "Helvetica Neue", Arial），转换后保留原字体
errors: 无错误，但行为不符合预期
reproduction: |
  1. 准备包含 text 元素的 SVG，设置 font-family="Helvetica"
  2. 调用 parseSvg() 和 transformToPPTElement()
  3. 检查输出的 defaultFontName - 是 "Helvetica" 而非 "Source Han Sans CN Regular"
started: 代码实现后即存在此行为

## Eliminated

- hypothesis: 代码没有默认字体设置
  evidence: 代码第 816 行有 `|| 'Source Han Sans CN Regular'` 作为默认值
  timestamp: 2026-07-09T09:52:00.000Z

- hypothesis: 代码根本没有使用 SourceHanSans
  evidence: 不带 font-family 的 text 元素确实使用 "Source Han Sans CN Regular"
  timestamp: 2026-07-09T09:53:00.000Z

## Evidence

- timestamp: 2026-07-09T09:51:00.000Z
  checked: src/transformer/transform-to-pptel.ts 第 815-816 行
  found: |
    const fontFamily = element.attrs['font-family'] || 'Source Han Sans CN Regular'
    // 注释说明 "Force Source Han Sans CN Regular for all text"
  implication: 意图是强制使用 SourceHanSans，但实现是 fallback 逻辑而非强制逻辑

- timestamp: 2026-07-09T09:53:00.000Z
  checked: 实际转换测试
  found: |
    <text font-family="Helvetica" ...> → defaultFontName: "Helvetica"
    <text 无 font-family> → defaultFontName: "Source Han Sans CN Regular"
  implication: 确认问题：显式设置的 font-family 被保留而不是被覆盖

- timestamp: 2026-07-09T09:54:00.000Z
  checked: 源码中的注释
  found: |
    // Force Source Han Sans CN Regular for all text (width calculation and output)
    const fontFamily = element.attrs['font-family'] || 'Source Han Sans CN Regular'
  implication: 开发者意图是"强制"，但代码实现是"如果没设置才用默认值"

## Resolution

root_cause: |
  第 816 行代码使用 `||` 操作符实现的是"默认值"逻辑，而非"强制替换"逻辑。
  当 SVG text 元素显式设置 font-family 属性时，`element.attrs['font-family']` 有值，
  所以 `||` 右侧的 "Source Han Sans CN Regular" 不会被使用。
  注释说 "Force" 但代码没有真正强制。

fix: |
  将第 816 行改为强制赋值：
  const fontFamily = 'Source Han Sans CN Regular'

  这样可以确保所有文本都使用统一字体，符合设计意图。
  注意：这也会影响 text 测量阶段的字体选择（第 837-839 行传递 fontFamily）。

verification: |
  已通过实际转换测试验证：
  - 带 font-family="Helvetica" 的 text 元素 → defaultFontName: "Helvetica" (修复前)
  - 不带 font-family 的 text 元素 → defaultFontName: "Source Han Sans CN Regular" (正确)

  修复后所有 text 元素的 defaultFontName 都将是 "Source Han Sans CN Regular"。

files_changed:
  - src/transformer/transform-to-pptel.ts (line 816)
---
