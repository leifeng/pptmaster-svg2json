---
status: resolved
trigger: "像▶，◀ ,o_t ∈ ℝⁿ via MLA 这些在text的字符串转到json后变成了乱码o_t &#x2208; &#x211D;&#x207F; via MLA"
created: 2026-08-05
updated: 2026-08-05T17:55:00Z
---

# Debug Session: text-ncr-not-decoded

## Symptoms

### 1. Expected behavior
SVG 源文件中的数字字符引用(NCR)形式字符(`&#x2208;`、`&#x211D;`、`&#x207F;`、`&#x25B6;`、`&#x25C0;` 等)
在转换到 JSON 后,应被解码为对应的 Unicode 字符:`∈`、`ℝ`、`ⁿ`、`▶`、`◀`。
最终 PPTX/PowerPoint 中可正确显示这些特殊符号。

### 2. Actual behavior
JSON 中保留 NCR 字面量形式:`o_t &#x2208; &#x211D;&#x207F; via MLA`,
PPT 中显示为字面量字符串而非真实字符(乱码/不可读)。

### 3. Error messages
无错误抛出,仅输出内容不正确。

### 4. Timeline / 影响范围
首次发现(根据用户的报告)。影响所有包含数学符号/特殊 Unicode 字符(以 NCR 编码)的 SVG text/tspan 内容。
常见于:
- 数学符号(∈、ℝ、ℕ、ℤ、ℂ、ℚ 等)
- 控制符号(▶、◀、▲、▼ 等)
- 上标下标(ⁿ、² 等)
- 其他特殊符号(希腊字母、运算符等)

### 5. Reproduction
- 输入: SVG 文件中含 `<text>o_t &#x2208; &#x211D;&#x207F; via MLA</text>` 形式的内容
- 触发元素: text、tspan
- 验证方法: 对比 JSON 输出与原始 SVG,查看是否所有 NCR 都被正确解码

### 6. Source format confirmation
用户已确认:源文件中字符以 NCR 形式书写(`&#x2208;` 等),期望被解码为 Unicode 字符。

## Current Focus

### reasoning_checkpoint:
- hypothesis: "fast-xml-parser 在 `htmlEntities: false`(默认)下,EntityDecoder 的 `numericAllowed: false`,导致 NCR(`&#x2208;` 等)在 `_resolveNCR` 中返回 undefined,保留字面量"
- confirming_evidence:
  - 经验证:repro-ncr.mjs 测试 1 (默认配置) 显示 `&#x2208;` → `&#x2208;`(字面量),`&lt;` → `<`(XML 预定义实体正常解码)
  - 经验证:repro-ncr.mjs 测试 2 (`htmlEntities: true`) 显示 `&#x2208;` → `∈`,`&lt;` → `<`(XML 预定义实体仍然正常)
  - OptionsBuilder.js:43 `htmlEntities: false` 是默认值
  - OrderedObjParser.js:98 `numericAllowed: this.options.htmlEntities`
  - EntityDecoder.js:633 `if (!this._numericAllowed && minimum < NCR_LEVEL.remove) return undefined;`
- falsification_test: 若修复后 NCR 仍为字面量,则假设错误
- fix_rationale: `htmlEntities: true` 同时控制 NCR 解码 + 包含 HTML 命名实体,且 EntityDecoder 构造器始终合并 DEFAULT_XML_ENTITIES → 5 个 XML 预定义实体(`&lt; &gt; &amp; &quot; &apos;`)依然保留
- blind_spots:
  - 可能引入意外的 HTML 命名实体解码(SVG 规范不允许,但实际风险低)
  - 现有测试可能依赖 NCR 字面量保留(需要全量回归)

### next_action:
1. 在 src/parser/svg-parser.ts 中给两个 XMLParser 实例添加 `htmlEntities: true`
2. 写最小复现 + 验证修复
3. 写回归测试(数学符号 + 控制符号 + 上标 + 5 XML 实体 + 混合内容)
4. 跑全量 vitest,确认无回归
5. 验证 text-measurer 处理含已解码字符的内容时不会出错

## Evidence

- timestamp: 2026-08-05T17:25:00Z
  checked: `src/parser/svg-parser.ts` 的 XMLParser 配置(771-805 行)
  found: 两个 parser(parser + orderedParser)都未配置 `htmlEntities` 或 `entityDecoder`
  implication: 使用 fast-xml-parser 默认配置

- timestamp: 2026-08-05T17:28:00Z
  checked: `node_modules/fast-xml-parser/src/xmlparser/OrderedObjParser.js:96-111`
  found: EntityDecoder 默认 `numericAllowed: this.options.htmlEntities` (= false)
  implication: NCR(`&#x2208;` 等)在 `_resolveNCR` 中会被保留为字面量

- timestamp: 2026-08-05T17:30:00Z
  checked: `node_modules/@nodable/entities/src/EntityDecoder.js:617-643` `_resolveNCR`
  found: `if (!this._numericAllowed && minimum < NCR_LEVEL.remove) return undefined;` 返回 undefined 让 `decode()` 跳过替换
  implication: 默认配置下 NCR 不会解码,会原样出现在 tag value 中

- timestamp: 2026-08-05T17:35:00Z
  checked: 最小复现 `repro-ncr.mjs` 三组对照实验
  found: 默认配置下 NCR 字面量保留;`htmlEntities: true` 下 NCR 正确解码且 XML 5 个预定义实体正常工作
  implication: 假设成立 — `htmlEntities: true` 是直接、最小、正确的修复
  raw_output:
    - test1(`htmlEntities: undefined`): `"#text": "o_t &#x2208; &#x211D;&#x207F; via MLA"`(NCR 保留)
    - test2(`htmlEntities: true`): `"#text": "o_t ∈ ℝⁿ via MLA"`(NCR 解码成功)
    - test3(`processEntities: true`): NCR 仍保留(此选项控制 limits,不直接控制 numericAllowed)

- timestamp: 2026-08-05T17:40:00Z
  checked: EntityDecoder 构造器 `node_modules/@nodable/entities/src/EntityDecoder.js:213`
  found: `this._baseMap = mergeEntityMaps(DEFAULT_XML_ENTITIES, options.namedEntities || null);` —— DEFAULT_XML_ENTITIES 始终被合并
  implication: `htmlEntities: true` 不会丢失 XML 预定义实体,反而添加 COMMON_HTML + CURRENCY 命名实体

## Eliminated

- hypothesis: 字符引用是 XML 序列化时添加的
  reason: 转换过程是 SVG → JSON,中间不存在反向序列化步骤,NCR 字面量来自源文件

## Resolution

root_cause: fast-xml-parser 的 XMLParser 默认 `htmlEntities: false`,导致 EntityDecoder 的 `numericAllowed: false`,`_resolveNCR` 在 NCR_LEVEL.remove 以下时返回 undefined,使 NCR(`&#x2208;`、`&#x211D;`、`&#x207F;`、`&#x25B6;`、`&#x25C0;` 等)在解析结果中保留为字面量。5 个 XML 预定义实体(`&lt; &gt; &amp; &quot; &apos;`)走 namedEntities 路径,不受 numericAllowed 控制,因此仍能正确解码。
fix: 在 src/parser/svg-parser.ts 的两个 XMLParser 实例(parser + orderedParser)上添加 `htmlEntities: true`,使 EntityDecoder.numericAllowed = true。EntityDecoder 构造器始终合并 DEFAULT_XML_ENTITIES 到 base map,XML 预定义实体保留。
verification:
  - 新增 7 个回归测试 __tests__/text-ncr-decoded.test.ts,全部通过:数学符号解码、控制符号解码、十进制 NCR、5 个 XML 预定义实体兼容、tspan 内 NCR、混合内容、text-measurer 路径(已解码的 '&' 字符)
  - 全量 vitest:208 通过 / 16 失败(失败项与 baseline 完全一致,无回归)
  - 真实场景验证:深度学习 + 数学符号 + 控制符号 + 希腊字母 混合 SVG 转换成功,text-measurer 正常返回测量结果
files_changed:
  - src/parser/svg-parser.ts(parser + orderedParser 加 htmlEntities: true)
  - __tests__/text-ncr-decoded.test.ts(新增 7 个回归测试)