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

## phase15-trigger-extensions-bug — extensions.originalEffect 缺失 + 同组多 element 串行触发
- **Date:** 2026-10-15
- **Error patterns:** extensions.originalEffect missing on mapped path, same-group PPTShapes trigger='auto' (after-previous) instead of 'meantime' (concurrent), N→N coverage but serialized
- **Root cause:** Bug 1: `buildExtensions` 只在 `if (fallback)` 路径写 `ext.originalEffect = row.effect`,mapped-success 路径漏写 — D-11 spec 要求无条件保留。Bug 2: `injectAnimations()` 的 element-loop 用 row-level 单值 trigger 填充所有 candidate,默认 `'after-previous'` → `'auto'`,同 row 多 element 串行触发,与 ELEMENT_ANIMATIONS.md §3 同 row 应并行的语义不符。
- **Fix:** Bug 1: `buildExtensions` 改为无条件 `ext.originalEffect = row.effect`。Bug 2: element-loop 内 per-element trigger derivation — row-level resolved.trigger === 'on-click' 时全部 `click`,否则 first = baseTrigger(cross-row anchor),subsequent = 'meantime'。
- **Files changed:** src/animation-injector.ts, src/animation-injector.test.ts, tests/e2e/202610131101001.test.ts
- **Why not caught:** Phase 14 D-11 spec 注释明确但 Bug 1 在 D-15 fallback 实现时引入,fixtures 全部使用 mapped effects 掩盖了 originalEffect 缺失;Phase 14 N→N 修复后 group→emission 拓扑改变,但 element-loop 内 trigger 推导逻辑未随之更新,默认 `auto` 与同 row 应并行相冲突。
- **Recurrence guard:** unit tests in `D-11/D-12/D-13` 块 pin `originalEffect` 在 mapped/fallback 路径都存在;`'Phase 15 — same-group multi-element concurrent trigger semantics'` 块 pin multi-element row 的 first/rest split 与 click override 行为;E2E `202610131101001.test.ts` 验证 03_overview fixture 的 4 个 card group × 4 element 产生 12 个 subsequent 'meantime' trigger。

## preserve-original-trigger — extensions.originalTrigger 仅条件保留(与 D-11 spec 不齐)
- **Date:** 2026-10-15
- **Error patterns:** extensions.originalTrigger missing when row.trigger===undefined, Object.keys(extensions) lacks 'originalTrigger' on implicit-trigger rows, extensionsFieldsPreserved 计数器少 +1 per animation
- **Root cause:** Phase 15 Bug 1 修复(a3d8e67)只把 buildExtensions 的 `originalEffect` 改为无条件保留(`src/animation-injector.ts:239`),但 line 240 的 `if (row.trigger !== undefined) ext.originalTrigger = row.trigger` 仍是条件形态 — D-11 docstring(`src/animation-injector.ts:27-29`)已把 originalTrigger 与 originalEffect 列平级(意图无条件保留),实现未对齐。`extensionsFieldsPreserved` 诊断计数器依赖 `Object.keys(extensions).length`,间接漏计 originalTrigger。
- **Fix:** 删除 if-guard,`ext.originalTrigger = row.trigger` 无条件赋值(JSON.stringify 跳过 undefined 序列化输出,但 Object.keys 计入键 → 与 D-11 '保留三方原始 trigger' 意图一致)。同时更新既有的 `'omits extensions for genuinely empty row'` 和 `'extensionsFieldsPreserved counts originalEffect on every mapped path (D-11)'` 两个测试的 Object.keys 期望([`originalEffect`] → [`originalEffect`, `originalTrigger`])。
- **Files changed:** src/animation-injector.ts, src/animation-injector.test.ts, tests/e2e/202610131101001.test.ts, PPTIST_ANIMATION_MAPPING.md
- **Why not caught:** Phase 15 Bug 1 修复只针对 originalEffect,parallel字段原样保留;D-11 docstring 行 27-29 平级列出但实际 implementation 漏改;原 unit 测试 `'omits extensions for genuinely empty row'` 的 Object.keys 期望值等于 `['originalEffect']` 隐含 confirmation bias(测试本身误把 bug 当 contract)。
- **Recurrence guard:** unit test `'writes extensions.originalTrigger unconditionally — Object.keys contains the key even when value is undefined (D-11)'` pin key 在 row.trigger===undefined 时也存在;E2E test `'Phase 16: every covered PPTAnimation extensions contains originalTrigger key (D-11 unconditional)'` 反向断言 runtime fixture 每条 PPTAnimation 的 extensions 都包含 originalTrigger key;既有的 `'omits extensions for genuinely empty row'` 测试 Object.keys 期望 = `['originalEffect', 'originalTrigger']` 同时 pin 老 + 新 contract。后续将 originalDuration / originalType / originalOrder / originalDelay 也采用相同无条件化路径(phase16+ backlog)。

## toc-tspan-not-splitting — text+dy-tspan 只输出 1 个 PPTTextElement
- **Date:** 2026-10-16
- **Error patterns:** tspan, dy, multiline, single element, leading inline text lost, preserveOrder, mixed content, isMultiline, extractTspansWithPosition
- **Root cause:** preserveOrder 解析器 (src/parser/svg-parser.ts:619-621) 把 text 元素的内联文字包装为 `type:'text'` child,但 `extractTspansWithPosition` (src/transformer/transform-to-pptel.ts:910) 用 `element.children.filter(c => c.type === 'tspan')` 只取 tspan,丢弃 leading 内联文字。`<text>leading<tspan dy="...">rest</tspan></text>` 只产出 tspan 那 1 行,leading 行丢失。
- **Fix:** 修改 extractTspansWithPosition 按文档顺序遍历 element.children:`type:'text'` (且 trim() 非空) → 一行 multiline 继承父 text 样式;`type:'tspan'` → 原逻辑不变。纯空白 text 子元素跳过(与 measureTextElement 的首尾 trim 一致)。
- **Files changed:** src/transformer/transform-to-pptel.ts, __tests__/text-tspan-mixed-content.test.ts
- **Why not caught:** Phase 15 (commit 92ac00b) 引入 preserveOrder 解析 + mixed-content 测试,但测试只覆盖 `无 dy 的内联 tspan`(单行路径),未触发 multiline 分支;`hasLineBreakTspans` 在 c60f5cf 修复后已能正确检测 dy,但 extractTspansWithPosition 的 `tspanChildren = filter(tspan)` 没人 review 这个契约错配;exampels/green-art-teaching/templates/02_toc.svg 的真实 carrier 写法一直没 E2E 覆盖。
- **Recurrence guard:** 新增 regression test `'splits text+dy-tspan into 2 independent PPTTextElements with correct styles'` 验证:leading 行继承父 text fontSize/color/`<strong>`,tspan 行用 tspan 自身样式,第二行 top 偏移 dy*scaleY;mutated 通过(无 fix 时此 test 失败)。`text-tspan-mixed-content.test.ts` 现覆盖 inline + multiline 两条分支(单行路径合并,多行路径拆分),配合 `text-tspan-multiline-y-measurement.test.ts` 的纯-tspans 路径形成三向 pin。
---
