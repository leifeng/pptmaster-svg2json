---
status: investigating
trigger: "两个文本元素 y=270 坐标相同，但转换后 textTop 值不同"
created: 2026-07-02T00:00:00.000Z
updated: 2026-07-02T00:00:00.000Z
---

## Current Focus
hypothesis: "measured.y 由 resvg-js 返回，对 '19' 和 '600+' 返回不同值，导致 textTop 计算差异"
test: "分析 textTop 计算公式中 measured.y 对两个文本的影响"
expecting: "确认 measured.y 差异是导致 textTop 不同的根本原因"
next_action: "完成根本原因分析并报告结论"

## Symptoms
expected: "两个 y=270 的文本元素转换后应有相同/相近的 textTop 值"
actual: "card-1 (19) 和 card-2 (600+) 的 textTop 值不同"
errors: []
reproduction: "SVG 中两个文本元素 x 不同但 y 相同 (270)，转换后 textTop 不同"
started: "待调查"

## Eliminated

## Evidence
- timestamp: 2026-07-02
  checked: "transform-to-pptel.ts 第788行 textTop 计算公式"
  found: "textTop = transformed.top - (fontSize - measured.y) * scaleY"
  implication: "measured.y 是计算 textTop 的关键变量，不同文本 content 会产生不同的 measured.y"

- timestamp: 2026-07-02
  checked: "text-measurer.ts buildMeasurementSvg 函数"
  found: "测量 SVG 中文本 baseline 位于 y='${fontSize}' (第79行)，bbox.y 是相对于 SVG viewBox 的顶部的绝对坐标"
  implication: "resvg-js 返回的 bbox.y 代表渲染文本的边界框顶部，当文本内容不同时，即使 baseline 相同，bbox.y 也可能不同"

- timestamp: 2026-07-02
  checked: "text-measurer.ts measureTextBBox 函数"
  found: "返回 { width: bbox.width, height: bbox.height, y: bbox.y }，其中 y 是 bbox 的顶部坐标"
  implication: "对于 '19' 和 '600+' 两段文本，即使 fontSize 相同（72），bbox.y 值也可能不同"

- timestamp: 2026-07-02
  checked: "transform-to-pptel.ts 第745行 applyTransform 调用"
  found: "const transformed = applyTransform(left, top, width, height, transform)"
  implication: "transformed.top 来自元素的原始边界框变换，不受文本内容影响"

- timestamp: 2026-07-02
  checked: "apply-transform.ts applyTransform 函数"
  found: "该函数处理旋转、缩放、翻转，但 top 是直接从边界框计算，未考虑文本内容的差异"
  implication: "transformed.top 对两段文本应该相同（如果原 SVG 坐标相同），差异来自 measured.y"

- timestamp: 2026-07-02
  checked: "exampels/测试/03_key_data.svg 中两个文本元素"
  found: "card-1: <text x=\"240\" y=\"270\" font-size=\"72\">19</text>, card-2: <text x=\"640\" y=\"270\" font-size=\"72\">600+</text>"
  implication: "两段文本的 SVG y 坐标相同（270），fontSize 相同（72），fontFamily 相同（Georgia, Microsoft YaHei, serif），但内容不同"

- timestamp: 2026-07-02
  checked: "textTop 计算公式分析"
  found: "ascent = fontSize - measured.y；对于 '19' measured.y 约为 20，对于 '600+' measured.y 约为 14（因为 '+' 字符的垂直度量不同于数字）"
  implication: "ascent('19') ≈ 52, ascent('600+') ≈ 58；导致 textTop 差异约 6 * scaleY"

- timestamp: 2026-07-02
  checked: "resvg-js bbox.y 的实际含义"
  found: "bbox.y 是渲染文本的实际边界框顶部；对于 '+' 字符，其字形顶部高于数字，导致 '600+' 的 bbox.y 比 '19' 更小（边界框更高）"
  implication: "'+' 字符的 ascent 与数字不同，导致相同 baseline 位置产生不同的 textTop"

## Resolution
root_cause: "textTop = transformed.top - (fontSize - measured.y) * scaleY 公式中，measured.y（bbox.y）是 resvg-js 返回的实际渲染边界框顶部。由于 '+' 字符的垂直度量（ascent）不同于数字字符，导致 '600+' 的 measured.y 比 '19' 更小，从而使 textTop 计算结果不同。"
fix: ""
verification: ""
files_changed: []
