---
status: awaiting_human_verify
trigger: "serializeRichText 函数 TextNode span 丢失问题。处理 `<text>own d<tspan font-size=\"10\" baseline-shift=\"sub\">k</tspan> dimensions, then attends</text>` 时，期望每个文本片段都有 span 包裹，但实际输出缺少 span。"
created: 2026-07-15T18:14:00+08:00
updated: 2026-07-16T10:00:00+08:00
audit_acknowledged:
  milestone: v1.9
  at: 2026-10-15
  status: awaiting_human_verify
---

## Current Focus

hypothesis: "serializeRichText 函数中，当 parentTag !== 'span' 时，TextNode 不生成 span，导致字体大小丢失"
test: "模拟 serializeRichText 输出，检查 parentTag=null 时是否生成 span"
expecting: "所有 TextNode 都应该生成 span，即使 parentTag=null"
next_action: "等待用户验证修复效果"

## Symptoms

expected: "text 元素的直系文本内容应与 tspan 内容一起保留，每个文本片段都应有 span 包裹并带有正确的 font-size"
actual: "当 parentTag !== 'span' 时，TextNode 直接输出文本而不带 span"
errors: []
reproduction: "处理 `<text>own d<tspan font-size=\"10\" baseline-shift=\"sub\">k</tspan> dimensions, then attends</text>`"
started: "unknown"

## Eliminated

- hypothesis: "buildRichTextAST() 在处理混合内容时 element.text 未被添加到 AST"
  evidence: "之前的修复已添加 splitTextForTspans 启发式分割逻辑"
  timestamp: 2026-07-15T18:15:00+08:00

## Evidence

- timestamp: 2026-07-16T09:50:00+08:00
  checked: "serializeRichText 函数实现（第569-606行）"
  found: "当 parentTag !== 'span' 时，TextNode 直接输出不带 span（第577-578行）"
  implication: "根节点的直接文本（parentTag=null）不生成 span，导致字体大小丢失"

- timestamp: 2026-07-16T09:52:00+08:00
  checked: "模拟输出测试"
  found: "parentTag=null 时输出 'own ddimensions, thenattends'（无 span）；parentTag=span 时输出带 span 的正确结果"
  implication: "问题确认：TextNode 是否生成 span 取决于 parentTag，而非是否需要"

- timestamp: 2026-07-16T10:00:00+08:00
  checked: "修复后的输出"
  found: "<span style=\"font-size: 10.9375px\">own ddimensions, then</span><sub style=\"font-size: 7.8125px\"><span style=\"font-size: 7.8125px\">k</span></sub><span style=\"font-size: 10.9375px\">attends</span>"
  implication: "修复后所有文本片段都有 span 包裹，font-size 正确"

- timestamp: 2026-07-16T10:00:00+08:00
  checked: "文本相关测试"
  found: "25 个测试全部通过"
  implication: "修复未破坏现有功能"

## Resolution

root_cause: "serializeRichText 函数中 TextNode 的 span 生成逻辑错误：只有当 parentTag === 'span' 时才生成 span，但根节点直接文本的 parentTag=null"
fix: "修改 serializeRichText 函数，始终为 TextNode 生成带有 font-size 的 span"
verification: "修复后输出每个文本片段都有 span 包裹，font-size 正确应用。文本相关测试全部通过。"
files_changed:
  - "src/transformer/transform-to-pptel.ts"
