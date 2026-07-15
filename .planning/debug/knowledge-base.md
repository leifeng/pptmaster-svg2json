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
