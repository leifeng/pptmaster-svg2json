---
status: resolved
trigger: "Error: SVG data parsing failed cause invalid attribute at 3:32 cause expected space not 'M' at 3:32"
created: 2026-07-20T10:00:00.000Z
updated: 2026-07-20T10:00:00.000Z
---

## Current Focus
hypothesis: "在 text-measurer.ts 的 buildMeasurementSvg 函数中，font-family 属性值包含未转义的普通引号字符 (U+0022)，导致 Resvg 解析生成的测量 SVG 时失败"
test: "检查 buildMeasurementSvg 生成的 SVG 中 font-family 属性的转义情况"
expecting: "font-family=\"Georgia, \"Microsoft YaHei\", serif\" 中的引号应该被转义为 &amp;quot;"
next_action: "已修复 - 在 buildMeasurementSvg 中对 font-family 属性值调用 escapeXml 函数"

## Symptoms
expected: "SVG 文件应该被正确解析并转换为 PPT 元素"
actual: "在 transformToPPTElement 阶段报错：invalid attribute at 3:32, expected space not 'M'"
errors:
  - "SVG data parsing failed cause invalid attribute at 3:32 cause expected space not 'M' at 3:32"
reproduction: "node dist/src/cli.js exampels\\ppt169_attention_is_all_you_need\\svg_output\\06_encoder_decoder.svg"
started: "未知，错误发生在处理文本元素时调用 measureTextBBox 时"

## Eliminated
- hypothesis: "错误来自 fast-xml-parser 解析原始 SVG 文件"
  evidence: "XMLValidator.validate() 和 XMLParser.parse() 都成功解析 SVG，没有报错"
- hypothesis: "错误来自 Resvg 解析原始 SVG 文件"
  evidence: "Resvg 可以正常解析和渲染原始 SVG 文件"
- hypothesis: "错误来自 path 处理代码"
  evidence: "错误堆栈显示错误发生在 text-measurer.ts:122 的 new Resvg()，而不是 path 处理阶段"

## Evidence
- timestamp: 2026-07-20
  checked: "transformToPPTElement 函数调用链"
  found: "错误发生在调用 measureTextBBox 时，而 measureTextBBox 在内部创建 Resvg 实例"
  implication: "问题出在 buildMeasurementSvg 生成的 SVG 字符串"
- timestamp: 2026-07-20
  checked: "buildMeasurementSvg 生成的 SVG 第 3 行"
  found: "font-family=\"Georgia, \"Microsoft YaHei\", serif\" - 属性值中的引号未转义"
  implication: "当 Resvg 解析此 SVG 时，将 \"Georgia, \" 解析为属性值，然后 \"Microsoft YaHei\" 被解析为新属性名，但该属性没有 = 号，导致解析失败"
- timestamp: 2026-07-20
  checked: "SVG 文件中的 font-family 属性"
  found: "SVG 源文件中使用 &amp;quot; 编码引号，fast-xml-parser 解析后还原为普通引号字符 (U+0022)"
  implication: "parseSvg 正确处理了 XML 实体，但后续 buildMeasurementSvg 没有正确转义这些引号"

## Resolution
root_cause: "在 text-measurer.ts 的 buildMeasurementSvg 函数中，font-family 属性值直接插入到 SVG 字符串而没有调用 escapeXml 进行转义。当 font-family 值包含引号（如 Georgia, \"Microsoft YaHei\", serif）时，生成的测量 SVG 中引号未转义，导致 Resvg 解析失败。"
fix: "在 buildMeasurementSvg 中对 opts.fontFamily 调用 escapeXml 函数进行转义"
verification: "修复后运行转换命令成功，输出了 51 个元素，耗时 18909ms"
files_changed:
  - "src/text-measurer.ts: 在 font-family 属性值上调用 escapeXml 函数"
