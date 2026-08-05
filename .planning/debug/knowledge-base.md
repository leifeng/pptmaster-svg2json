# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## svg-text-plus-decimal-loss — SVG text +2.0 输出只为 2
- **Date:** 2026-07-10
- **Error patterns:** text, +2.0, decimal, sign loss, parseTagValue
- **Root cause:** fast-xml-parser 的 parseTagValue: true 选项将文本内容 '+2.0' 解析为数字 2，丢失了正号和小数部分
- **Fix:** 将 src/parser/svg-parser.ts 中的 parseTagValue 设置为 false
- **Files changed:** src/parser/svg-parser.ts
---

## text-ncr-not-decoded — SVG text 中 NCR（&#xNNNN;）未解码
- **Date:** 2026-08-05
- **Error patterns:** text, tspan, NCR, numeric character reference, &#x2208;, &#x211D;, &#x207F;, &#x25B6;, &#x25C0;, htmlEntities, numericAllowed
- **Root cause:** fast-xml-parser 默认 `htmlEntities: false`,导致 EntityDecoder 的 `numericAllowed: false`,`_resolveNCR` 对常见 codepoint 返回 undefined,NCR 字面量保留在解析结果中。5 个 XML 预定义实体走 namedEntities 路径,不受影响。
- **Fix:** 在 src/parser/svg-parser.ts 的两个 XMLParser 实例(parser + orderedParser)上添加 `htmlEntities: true`。EntityDecoder 构造器始终合并 DEFAULT_XML_ENTITIES,XML 预定义实体保留。
- **Files changed:** src/parser/svg-parser.ts, __tests__/text-ncr-decoded.test.ts
---
