---
status: awaiting_human_verify
trigger: "处理 exampels/ppt169_attention_is_all_you_need/svg_output/03_sequence_evolution.svg 中 `<text x=\"80\" y=\"190\" font-family=\"Georgia, &quot;Microsoft YaHei&quot;, serif\" font-size=\"40\" font-weight=\"700\" fill=\"#1A365D\">attention <tspan fill=\"#3182CE\">mesh</tspan></text>` 转为 JSON 的 text 类型后，富文本内容丢失 \"attention\"，只剩 tspan 中的 \"mesh\"。"
created: 2026-07-23T10:00:00+08:00
updated: 2026-07-23T11:00:00+08:00
audit_acknowledged:
  milestone: v1.9
  at: 2026-10-15
  status: awaiting_human_verify
---

## Current Focus

hypothesis: "已确认并修复：parser 现在按文档顺序生成 inline text/tspan children，真实 SVG 输出完整 attention mesh"
test: "等待用户在实际工作流/消费端确认生成 JSON 符合预期"
expecting: "目标富文本显示 attention mesh，attention 使用父 text 颜色，mesh 使用 #3182CE"
next_action: "等待用户回复 confirmed fixed 或报告仍失败的现象"

## Symptoms

expected: |
  输入 SVG：
  ```xml
  <text x="80" y="190" font-family="Georgia, &quot;Microsoft YaHei&quot;, serif"
        font-size="40" font-weight="700" fill="#1A365D">
    attention <tspan fill="#3182CE">mesh</tspan>
  </text>
  ```

  期望输出：JSON `text` 元素 content 完整保留 'attention mesh' 富文本序列
actual: |
  转 JSON 后只剩 tspan 内容 'mesh'，text 节点自带的 'attention' 文本丢失
errors: []
reproduction: |
  1. 使用 svg-to-pptel 处理 exampels/ppt169_attention_is_all_you_need/svg_output/03_sequence_evolution.svg
  2. 查找输出中 y=190 的 text 元素
  3. content 字段只有 'mesh'，缺失 'attention '

started: 未知

## Eliminated

- hypothesis: "本次 parser mixed-content 修复导致完整套件的 path-merge nested transform 失败"
  evidence: "失败测试仅导入 src/merger/path-merge.ts，直接构造 SvgElement 并调用 createMergedShapeElement，不经过 parseSvg/svg-parser；单独运行仍以同样坐标差异稳定失败。"
  timestamp: 2026-07-23T10:55:00+08:00

## Evidence

- timestamp: 2026-07-23T10:00:00+08:00
  checked: "src/parser/svg-parser.ts:469-494 extractTextContent"
  found: |
    函数仅遍历 node.tspan，丢弃 node['#text']。
    当 text 同时有直系文本和 tspan 时，直系文本会被忽略。
  implication: "可能是相关函数被某处调用导致丢失，但也可能 parser 已经丢失顺序信息"

- timestamp: 2026-07-23T10:00:00+08:00
  checked: "src/transformer/transform-to-pptel.ts:393-407 extractTextContentFromElement"
  found: |
    此函数实现正确：先取 element.text，再附加 tspan 子元素内容。
  implication: "若调用此函数则不会丢失，问题大概率在更早的环节（parser→convertToSvgElement→buildRichTextAST）"

- timestamp: 2026-07-23T10:00:00+08:00
  checked: ".planning/debug/text-tspan-content-splitting-bug.md (历史会话)"
  found: |
    已识别根因为 parser 未启用 preserveOrder:true；
    但当时 status 仍为 investigating，修复未完成。
  implication: "这是已知问题；需确认本次是否仍然存在 / 是否已部分修复"

- timestamp: 2026-07-23T10:16:00+08:00
  checked: "知识库与项目技能"
  found: "knowledge-base.md 仅有 +2.0 文本数值转换条目，无 2 个以上关键词匹配；项目内不存在 .claude/skills 或 .agents/skills 目录"
  implication: "没有可直接复用的已解决模式或额外项目技能规则，继续以当前代码运行事实为准"

- timestamp: 2026-07-23T10:17:00+08:00
  checked: "当前 src/parser/svg-parser.ts 的 XMLParser 与 convertToSvgElement 完整实现"
  found: "XMLParser 配置没有 preserveOrder；convertToSvgElement 将 node['#text'] 单独存入 element.text，并按标签分组把 tspan 放入 children，无法表达 text/tspan/text 的原始交错顺序"
  implication: "parser 输出的数据契约与 transformer 注释宣称的 preserveOrder children 契约不一致"

- timestamp: 2026-07-23T10:18:00+08:00
  checked: "当前 src/transformer/transform-to-pptel.ts 的 buildRichTextAST、serializeRichText 与 splitTextForTspans 完整实现"
  found: "buildRichTextAST 在 children 非空时只遍历 children；只处理 child.type=tspan 或 text，不读取 element.text。splitTextForTspans 虽仍存在但已无调用。serializeRichText 会正常序列化收到的 TextNode。"
  implication: "当前精确丢失点是 buildRichTextAST 混合内容分支忽略 element.text；上游根因是 parser 未提供该分支期待的有序 text children。extractTextContent 和 splitTextForTspans 均不是当前执行路径。"

- timestamp: 2026-07-23T10:20:00+08:00
  checked: "修复前 dist parser 目标 AST"
  found: "y=190 的 text AST 实际为 text='attention'、children=[tspan(text='mesh')]；与假设完全一致。trimValues:true 还移除了 attention 后的尾随空格。"
  implication: "丢失在 transformer 构建 RichText AST 时发生；parser 同时未保留原始空白与混排顺序。"

- timestamp: 2026-07-23T10:21:00+08:00
  checked: "用户提供的 dist 复现命令"
  found: "当前 dist/src/index.js 不导出 parseSvgToElements，命令以 TypeError: parseSvgToElements is not a function 退出。"
  implication: "需要按当前公开 API 调整复现命令；这不反驳文本丢失，parser AST 已独立重现。"

- timestamp: 2026-07-23T10:23:00+08:00
  checked: "fast-xml-parser 5.9.3 preserveOrder 反事实解析"
  found: "preserveOrder:true 将 mixed content 精确解析为 [{#text:'attention '},{tspan:[{#text:'mesh'}]},{#text:' after'}]；trimValues:false 保留 tspan 前后的空格，而 trimValues:true 会删除空格。"
  implication: "parser 层可以提供 buildRichTextAST 已经期待的有序 text/tspan children；同时必须使用 trimValues:false 才能保留语义空格。"

- timestamp: 2026-07-23T10:24:00+08:00
  checked: "当前 src/index.ts 与文本测试"
  found: "公开端到端 API 是 async convert()；现有测试覆盖字体/样式/锚点，但没有 mixed text+tspan 顺序测试。"
  implication: "应新增 convert 级回归测试覆盖 leading、trailing 和 tspan 样式，避免只修当前单例。"

- timestamp: 2026-07-23T10:27:00+08:00
  checked: "公开 convert API 修复前端到端输出"
  found: "真实文件中含 mesh 的目标元素 content 为 <p><strong><span ... color:#3182CE>mesh</span></strong></p>，完全缺失 attention。"
  implication: "原始症状已通过当前公开 API 稳定重现。"

- timestamp: 2026-07-23T10:28:00+08:00
  checked: "手工有序 SvgElement 的反事实 transformElement 测试"
  found: "只把 AST 形状改成 children=[text('attention '),tspan('mesh')]，未修改 transformer，即输出 attention 后接蓝色 mesh。"
  implication: "直接证明 transformer 序列化路径可用；修复应落在 parser 数据生产层而不是 serializeRichText。"

- timestamp: 2026-07-23T10:41:00+08:00
  checked: "修复后 npm run build"
  found: "TypeScript 编译成功，无错误。"
  implication: "ordered converter 与 parser 双视图实现类型正确，可继续运行行为验证。"

- timestamp: 2026-07-23T10:45:00+08:00
  checked: "新增 mixed-content 测试与全部文本相关测试"
  found: "6 个测试文件、63 个测试全部通过；新增用例验证 leading text、trailing text、空格、顺序及 tspan 颜色。"
  implication: "原始文本路径和相邻字体、样式、锚点、测量功能未见回归。"

- timestamp: 2026-07-23T10:48:00+08:00
  checked: "修复后真实 03_sequence_evolution.svg 端到端 convert 输出"
  found: "目标 content 为 attention 的 #1A365D span 后接 mesh 的 #3182CE span；去除 HTML 后精确等于 'attention mesh'，文本宽度也从修复前约 110.68 增至约 265.86。"
  implication: "原始问题已在真实输入与构建产物上修复，且样式、顺序、空格和测量内容均正确。"

- timestamp: 2026-07-23T10:52:00+08:00
  checked: "修复后完整 npm test"
  found: "完整套件出现 1 个失败：__tests__/path-merge.test.ts 的 nested g transform 期望 left≈58.33，实际 50.52；其余已显示测试通过。"
  implication: "需判断该 path merger 坐标失败是否与 parser 改动相关；在确认前暂退回 investigating。"

- timestamp: 2026-07-23T10:55:00+08:00
  checked: "完整套件唯一失败的调用路径"
  found: "path-merge 失败用例只导入 merger 模块，直接构造 path SvgElement 并调用 createMergedShapeElement；不经过本次修改的 parser。单独运行同样失败。"
  implication: "该失败与本次修复无因果关系，记录为工作区既有独立问题；mixed-content 验证可继续。"

- timestamp: 2026-07-23T10:58:00+08:00
  checked: "限定 diff 审查与 mixed-content 回归测试重复运行"
  found: "源代码 diff 仅涉及 ordered parser/converter；新增 2 个回归测试再次全部通过。"
  implication: "修复范围集中且重复验证稳定。"

- timestamp: 2026-07-23T11:00:00+08:00
  checked: "库边界相邻输入探测：XML 声明 + before/tspan/after"
  found: "公开 convert 输出纯文本精确为 'before middle after'，middle 保持 #C53030；orderedRoot 能越过 XML declaration 正确定位 svg。"
  implication: "不仅原始 leading-text 场景通过，后置文本顺序与 XML 声明边界也正常。"

## Resolution

root_cause: "XML parser 与 rich-text transformer 的 mixed-content 数据契约不一致：parser 未启用 preserveOrder 且 trimValues:true，将直系文本存入 element.text、tspan 存入 children 并删除语义空格；buildRichTextAST 的混合分支只处理有序 children，因而忽略 element.text，导致 attention 丢失。"
fix: "新增 preserveOrder:true、trimValues:false 的 XML 解析视图，并通过 convertOrderedToSvgElement 按文档顺序生成 text/tspan/text children；保留原 grouped parse 结果供 gradient/filter/pattern collectors 使用；新增 mixed text+tspan 端到端回归测试。"
verification: "自验证通过：npm run build 成功；6 个文本相关文件共 63 个测试通过；新增 mixed-content 2 个测试重复运行仍通过；真实 03_sequence_evolution.svg 经 dist/src/index.js 的公开 convert 输出纯文本精确为 'attention mesh'，mesh 保持 #3182CE，宽度同步包含完整文本；相邻 before/tspan/after + XML declaration 探测也通过。完整 npm test 仅有 1 个与 parser 无调用关系、可单独稳定重现的既有 path-merge nested transform 坐标失败。等待用户实际工作流确认。"
files_changed:
  - "src/parser/svg-parser.ts"
  - "__tests__/text-tspan-mixed-content.test.ts"
