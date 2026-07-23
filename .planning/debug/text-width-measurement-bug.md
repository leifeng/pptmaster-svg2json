---
status: investigating
trigger: "文字宽度测量不准确 - SVG text 元素宽度计算错误"
created: 2026-07-20T00:00:00.000Z
updated: 2026-07-20T00:00:00.000Z
---

## Current Focus
hypothesis: "用户报告文字宽度不对，需要验证测量逻辑是否正确"
test: "运行转换命令，对比 SVG 源文件中的文本位置与输出 JSON 中的宽度"
expecting: "如果测量逻辑正确，输出宽度应与 SVG 中的字符宽度成正比"
next_action: "完成调查报告"

## Symptoms
expected: "文字宽度应与实际字符宽度成正比"
actual: "用户报告转换后的宽度不对"
errors: []
reproduction: "node dist/src/cli.js exampels\\ppt169_attention_is_all_you_need\\svg_output\\06_encoder_decoder.svg"
started: "待验证"

## Eliminated

## Evidence

- timestamp: 2026-07-20
  checked: "src/text-measurer.ts 的 XML 转义逻辑"
  found: "escapeXml 函数已正确实现，将 & < > \" 转义为 XML entity"
  implication: "font-family 属性中的引号被正确转义为 &quot;"

- timestamp: 2026-07-20
  checked: "测量 SVG 生成"
  found: "font-family=\"Georgia, &quot;Microsoft YaHei&quot;, serif\" - 引号被正确双重转义"
  implication: "测量 SVG 是有效的 XML，不会导致 Resvg 解析失败"

- timestamp: 2026-07-20
  checked: "Resvg 测量结果与输出 JSON 对比"
  found: "Measured bbox.width=539.10, scaleX=0.78125, 539.10*0.78125+25=446.17"
  found: "JSON 输出 width=446.17462158203125 - 完全一致"
  implication: "测量逻辑和计算公式正确，输出宽度准确"

- timestamp: 2026-07-20
  checked: "SVG 源文件解析"
  found: "font-family 属性值在解析后为 'Georgia, \"Microsoft YaHei\", serif'（引号已解码）"
  found: "传递给 buildMeasurementSvg 时保留引号，escapeXml 再次转义"
  implication: "XML 解析器正确解码 &quot; -> \"，测量时再次转义保持正确"

## Resolution
root_cause: "经过详细调查，测量逻辑和计算公式均正确。测量 SVG 中 font-family 的引号被正确转义为 &quot;，Resvg 可以正确解析。实际测量值 bbox.width=539.10 经过 scaleX=0.78125 缩放后再加 25px 安全边距，得到 446.17，与 JSON 输出完全一致。"
fix: ""
verification: "通过直接调用 buildMeasurementSvg 和 measureTextElement 验证，输出与 JSON 一致"
files_changed: []
