---
name: track-line-gradient-and-coord-bug
description: Debug: track line gradient url(#trackGrad) not resolved and y2=660 exceeds canvas
status: resolved
trigger: "SVG中 <line x1=\"160\" y1=\"172\" x2=\"160\" y2=\"660\" stroke=\"url(#trackGrad)\" stroke-width=\"4\" stroke-linecap=\"round\"/> 的渐变色 url(#trackGrad) 未被正确解析为实际颜色，且y2=660超出了画布高度"
trigger_time: 2026-07-21T00:00:00+08:00
created: 2026-07-21
updated: 2026-07-21
symptoms:
  expected_behavior: "1) stroke=\"url(#trackGrad)\" 应被解析为实际的渐变色值 2) y2=660应该被正确处理（画布高度是720，660 < 720所以在范围内）"
  actual_behavior: "JSON输出中 color: \"#000000\" (黑色)，而不是渐变色"
  error_messages: ""
  timeline: "首次发现"
  reproduction: "解析 exampels/ppt169_attention_is_all_you_need/svg_output/15_ablations.svg 并检查 groupId=\"track\" 的 line 元素"
hypothesis: ""
test: ""
expecting: ""
next_action: "查找 transform-to-pptel.ts 中处理 stroke=\"url(#xxx)\" 的代码"
reasoning_checkpoint: ""
tdd_checkpoint: ""
root_cause: (see below)
fix: (see below)
verification: (see below)
files_changed: (see below)
specialist_hint: ""
---

## Current Focus

**status:** resolved

**Root Cause Found (Gradient):** FIXED - stroke="url(#trackGrad)" 现在可以被正确解析为渐变色

**Next Action:** 已完成 - 修复已验证


## Symptoms

**Expected:** stroke="url(#trackGrad)" 应解析为渐变色（#1A365D → #3182CE）
**Actual:** JSON 中 color: "#000000"
**Additional:** 坐标 start: [0, 0], end: [0, 488] 看起来是正确的（垂直线高度488 SVG单位）

## Evidence

- timestamp: 2026-07-21T00:00:00
  checked: "svg-parser.ts resolveFillReference() 函数"
  found: "只处理 fill=\"url(#id)\"，不处理 stroke=\"url(#id)\""
  implication: "stroke 渐变引用无法被解析"

- timestamp: 2026-07-21T00:00:00
  checked: "svg-parser.ts collectGradientDefs() 函数"
  found: "渐变定义被正确收集到 registry 中（id=\"trackGrad\"）"
  implication: "渐变定义存在，只是没有被 stroke 引用使用"

- timestamp: 2026-07-21T00:00:00
  checked: "transform-to-pptel.ts line case (lines 1218-1272)"
  found: "line 元素没有检查 element.attrs.gradient（而 shape 等其他元素有检查）"
  implication: "即使未来 parser 支持 stroke 渐变，transformer 也不会处理它"

- timestamp: 2026-07-21T00:00:00
  checked: "parseStrokeColor() 函数 (lines 350-378)"
  found: "不识别 url() 格式，当输入是 url(#trackGrad) 时返回 #000000"
  implication: "stroke=\"url(#xxx)\" 被当作无效颜色处理"

- timestamp: 2026-07-21T00:00:00
  checked: "line 坐标计算"
  found: "start: [0, 0], end: [0, 488] - 垂直线从 y1=172 到 y2=660，高度488 SVG单位 = 381.25 目标单位。坐标计算正确。"
  implication: "坐标问题可能是误报，或者原问题描述中的 y2=660 是指其他含义"

## Eliminated

- hypothesis: "y2=660超出画布"
  evidence: "画布高度720，660 < 720，在范围内。坐标 end: [0, 488] 对应 488 SVG单位 = 381.25 目标单位，高度正确"
  timestamp: 2026-07-21T00:00:00

- hypothesis: "坐标计算错误"
  evidence: "验证：top=134.375 + height=381.25 = 515.625 目标单位 = 660 SVG单位 = y2。坐标计算自洽正确。"
  timestamp: 2026-07-21T00:00:00

## Resolution

**root_cause:** (已确认)
1. Parser 的 `resolveFillReference()` 只处理 `fill="url(#id)"`，缺少对 `stroke="url(#id)"` 的处理
2. Transformer 的 line case 没有检查 `element.attrs.gradient`


**fix:**
1. 在 `src/parser/svg-parser.ts` 中添加 `resolveStrokeReference()` 函数，参考 `resolveFillReference()` 实现模式
2. 在 `convertToSvgElement()` 中调用 `resolveStrokeReference()`
3. 在 `src/transformer/transform-to-pptel.ts` 的 line case 中添加对 `element.attrs.gradient` 的检查
4. 在 `src/slides.ts` 的 `PPTLineElement` 接口中添加 `gradient?: Gradient` 属性

**verification:**
运行转换命令处理 `exampels/ppt169_attention_is_all_you_need/svg_output/15_ablations.svg`，track line 元素输出包含 `gradient` 属性：
- `gradient.type`: "linear"
- `gradient.colors`: [{pos: 0, color: "rgba(26, 54, 93, 1)"}, {pos: 100, color: "rgba(49, 130, 206, 1)"}]
- `gradient.rotate`: 90
渐变正确解析，from #1A365D to #3182CE，符合预期。

**files_changed:**
- `src/parser/svg-parser.ts` - 添加 resolveStrokeReference() 函数
- `src/transformer/transform-to-pptel.ts` - line case 添加 gradient 检查
- `src/slides.ts` - PPTLineElement 接口添加 gradient 属性

## Session Log

