---
status: resolved
trigger: "在处理 SVG 时，<text x=\"784\" y=\"92\" font-family=\"Georgia, 'Microsoft YaHei', serif\" font-size=\"44\" font-weight=\"bold\" fill=\"#C84A2E\">+2.0</text> 转 json 后只显示了一个 2，缺少了 + 和 .0"
symptoms:
  expected: "SVG <text>+2.0</text> 应正确输出为 \"+2.0\""
  actual: "只输出 \"2\"，缺失 + 和 .0"
  errors: "无 JS 错误，但 JSON 输出内容错误"
  timeline: "首次发现，可能在处理带符号/带小数点的数字文本时发生"
  reproduction: "SVG 中任何包含 +2.0、-3.5 等带符号小数的 <text> 标签"
created: 2026-07-10T10:47:00+08:00
updated: 2026-07-10T11:10:00+08:00
---

## Current Focus

hypothesis: "parseTagValue: true 导致 +2.0 被解析为数字 2，丢失了 + 号和小数部分"
test: "用 fast-xml-parser 测试 <text>+2.0</text> 的解析结果"
expecting: "#text 值为数字 2 而非字符串 '+2.0'"
next_action: "验证修复后的解析结果"
reasoning_checkpoint:
  hypothesis: "parseTagValue: true 导致 +2.0 被解析为数字 2"
  confirming_evidence:
    - "fast-xml-parser 在 parseTagValue: true 时将 '+2.0' 转为数字 2"
    - "验证输出显示 #text: 2 而非 '#text': '+2.0'"
  falsification_test: "如果设置 parseTagValue: false 后解析结果仍是 '+2.0' 字符串，则假设正确"
  fix_rationale: "关闭 parseTagValue 可以保留文本内容的原始字符串格式，防止数字解析丢失信息"
  blind_spots: "可能影响其他依赖 parseTagValue 的解析行为，需要验证"
tdd_checkpoint:

## Evidence

- timestamp: 2026-07-10T10:55:00+08:00
  checked: "svg-parser.ts 中的 fast-xml-parser 配置"
  found: "parseTagValue: true, parseAttributeValue: true"
  implication: "tag 内容会被解析为数字类型"

- timestamp: 2026-07-10T11:00:00+08:00
  checked: "用 fast-xml-parser 直接测试 <text>+2.0</text>"
  found: "解析结果中 #text 的值是数字 2，不是字符串 '+2.0'"
  implication: "确认是 parseTagValue: true 导致的转换问题"

- timestamp: 2026-07-10T11:05:00+08:00
  checked: "构建项目并用 parseSvg 测试"
  found: "text content 现在正确输出为 '+2.0'"
  implication: "修复成功，text 元素内容保留原始字符串"

## Eliminated

## Resolution

root_cause: "fast-xml-parser 的 parseTagValue: true 选项将文本内容 '+2.0' 解析为数字 2，丢失了正号和小数部分"
fix: "将 src/parser/svg-parser.ts 中的 parseTagValue 设置为 false"
verification: "测试解析 <text>+2.0</text> 后 #text 值为字符串 '+2.0'，text-fields.test.ts 全部通过"
files_changed: ["src/parser/svg-parser.ts"]
commit: "7502120"
