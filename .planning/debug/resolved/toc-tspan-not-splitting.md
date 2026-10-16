---
status: resolved
trigger: exampels\green-art-teaching\templates\02_toc.svg 在处理text的时候 <g id="toc-item-1-slot-template" data-pptx-placeholder="body" data-pptx-idx="1" data-pptx-bounds="572 158.57 467 67"> <text id="toc-item-1-carrier" data-pptx-carrier="true" x="572" y="185.77" font-size="32" font-weight="bold" fill="#408062">{{TOC_ITEM_1_TITLE}}<tspan x="572" dy="32.33" font-size="18" font-weight="normal" fill="#6BA389" letter-spacing="2">{{TOC_ITEM_1_DESC}}</tspan></text> </g>没有变成2个独立元素
created: 2026-10-16
updated: 2026-10-16
resolved: 2026-10-16
fix-commit: fd46afc
---

# Symptoms

- **expected**: 按现在代码逻辑,有 dy 的 tspan 应走 src/transformer/transform-to-pptel.ts:1738 isMultiline 分支,拆为 2 个独立 PPTTextElement
- **actual**: 没有变成 2 个独立元素 (输出结构与 hasLineBreakTspans 预期不符)
- **errors**: 无报错,只是输出结构不对
- **timeline**: 回归 - 之前正常,某次提交后坏了
- **repro**: exampels/green-art-teaching/templates/02_toc.svg

# Current Focus

- hypothesis: 解析器用 preserveOrder 时把 text 元素混合内容里的内联文字转为 `type:'text'` 子元素; `extractTspansWithPosition` 只过滤 `type==='tspan'`,内联文字被丢弃,导致 multiline 分支只产出 tspan 那 1 个 PPT 元素
- test: 已修复并验证:02_toc.svg 现在产出 19 个元素(4 carrier × 2 行 = 8 个 carrier text 元素),每个 carrier 拆为 toc-item-N-carrier (title, fontSize 25) + toc-item-N-carrier-line-1 (desc, fontSize 14.06)
- expecting: fix 验证通过
- next_action: 提交变更 + 写知识库条目
- reasoning_checkpoint: hypothesis 可证伪 ✓ | evidence 直接观察(parse AST + dist 输出) ✓ | fix 修复 root cause(preserveOrder 解析产物与 multiline 处理契约对齐)✓ | blind_spots: letter-spacing 没透传(独立 bug)✓ | candidate_causes: code(本 bug) / config(无) ✓ | and_gate: no(单一 root cause)
- tdd_checkpoint:
  - test_file: __tests__/text-tspan-mixed-content.test.ts
  - test_name: 'splits text+dy-tspan into 2 independent PPTTextElements with correct styles'
  - status: green
  - failure_output: pre-fix: 1 text element (tspan only); post-fix: 2 text elements (title + desc) ✓
- bug_class: Bohrbug (确定性,每次都重现)

# Evidence

- timestamp: 2026-10-16
  - checked: 解析 02_toc.svg → toc-item-1-carrier AST 结构
  - found: `children = [{type:'text', text:'{{TOC_ITEM_1_TITLE}}'}, {type:'tspan', attrs:{x:572,dy:32.33,...}, text:'{{TOC_ITEM_1_DESC}}'}]`,父 text 的 `element.text === undefined`,内联文字被 `convertOrderedToSvgElement` 推到 children[0]
  - implication: 解析器 (commit 92ac00b) 用 preserveOrder 保留顺序,把内联文字作为 child 元素,但下游 multiline 处理没适配

- timestamp: 2026-10-16
  - checked: 跑 dist 版 transform → 输出 14 个元素,每个 carrier 只 1 个 text 元素
  - found: carrier 输出 `defaultFontSize: 14.0625`(=18*0.78125,tspan 的字号)、`content: <p><strong><span style="font-size:14.0625px">{{TOC_ITEM_1_DESC}}</span></strong></p>`、缺少第一行 {{TOC_ITEM_1_TITLE}}
  - implication: multiline 路径只产出 tspan 那 1 行,丢失了父 text 的内联文字行

- timestamp: 2026-10-16
  - checked: hasLineBreakTspans(carrier) 调用
  - found: 返回 true(tspan 有 dy=32.33),isMultiline=true,正确进入 multiline 分支
  - implication: multiline 分支被触发,问题在 extractTspansWithPosition

- timestamp: 2026-10-16
  - checked: `src/transformer/transform-to-pptel.ts:890-1004` extractTspansWithPosition 实现
  - found: `const tspanChildren = element.children.filter(child => child.type === 'tspan')` 只取 tspan 类型子元素
  - implication: 内联文字的 `type:'text'` 子元素被过滤掉,丢失

- timestamp: 2026-10-16
  - checked: `src/parser/svg-parser.ts:615-625` convertOrderedToSvgElement 的混合文字处理
  - found: `if (hasElementChildren) { children.push({ type: 'text', attrs: {}, children: [], text: content }) }` — 当 text 元素同时含 tspan 子元素时,把内联文字包装为 `type:'text'` child
  - implication: 这是 92ac00b feat(tspan-mixed-content) 引入的设计 — 顺序保留但产生了与 multiline 处理的契约错配

- timestamp: 2026-10-16
  - checked: text-tspan-multiline-y-measurement.test.ts 第一次跑 (before fix)
  - found: 期望 7 elements、得到 9 — 因为 leading/trailing 空白(`'\n      '` / `'\n    '`)也被当成 multiline 行处理
  - implication: 需要在 multiline 处理里跳过纯空白 text 子元素(与 measureTextElement 的首尾 trim 一致,见 tspan-dy-multiline-y-too-large.md)

- timestamp: 2026-10-16
  - checked: 添加 trim() 检查后
  - found: text-tspan-multiline-y-measurement.test.ts (2 tests) + text-tspan-mixed-content.test.ts (4 tests) 全过
  - implication: fix 正确处理 'leading whitespace text + tspans + trailing whitespace text' 三种混合

- timestamp: 2026-10-16
  - checked: 全测试套件 vitest run
  - found: 4 files / 13 tests failed(SHPE-01 rx/ry、SHPE-03 shadow、IMGE-02 shadow、IMGE-01 outline、path-merge nested-g)— 在 stash 后无我修改的基线上同样失败,属预先存在的失败
  - implication: fix 没引入新失败;527 tests 通过 (vs 基线 526,新增 1 个 regression test)

- timestamp: 2026-10-16
  - checked: 02_toc.svg 端到端验证
  - found: 19 elements (4 number text + 8 carrier lines + 3 images + 1 rect + 1 toc-rail-title + 1 toc-rail-label + 其他). 每个 carrier 拆为 2: `id={carrier}` (fontSize 25, bold, color #408062, content `{{TOC_ITEM_1_TITLE}}`) + `id={carrier}-line-1` (fontSize 14.06, color #6BA389, content `{{TOC_ITEM_1_DESC}}`),top 间隔 25.26 = dy * scaleY ✓
  - implication: fix 端到端通过

# Eliminated

- hypothesis: 'tspanChildren 顺序问题导致只 1 行'
  - evidence: 即使只改 filter 为 tspan+text,内联文字行也会变成第 1 行但没有正确的 left 偏移,且会把纯空白当成行
  - timestamp: 2026-10-16

- hypothesis: 'hasLineBreakTspans 应该用 x 检测而非 dy'
  - evidence: c60f5cf 修复确认用 dy/y 检测是正确的(避免内联 tspan 误判为多行);问题不在检测而在提取
  - timestamp: 2026-10-16

# Resolution

- root_cause: 解析器 (commit 92ac00b, src/parser/svg-parser.ts:619-621) 在 preserveOrder 模式下把 text 元素的内联文字包装为 `type:'text'` child,而 transform-to-pptel.ts 的 `extractTspansWithPosition` 用 `tspanChildren = element.children.filter(c => c.type === 'tspan')` 只取 tspan,丢弃了 leading 内联文字。当 text 同时含内联文字 + dy-tspans 时,multiline 分支只产出 tspan 行,leading 那行丢失。
- fix: 修改 src/transformer/transform-to-pptel.ts 的 extractTspansWithPosition,按文档顺序遍历 element.children:`type:'text'` 子元素(且 trim() 非空)→ 一行 multiline 继承父 text 样式;`type:'tspan'` 子元素 → 原逻辑不变。也支持 text + tspan + text + tspan 混合排版。
- verification:
  - **signal 1 (regression test):** 新增 regression test (__tests__/text-tspan-mixed-content.test.ts): 'splits text+dy-tspan into 2 independent PPTTextElements with correct styles' — 验证 02_toc.svg 中的 carrier 模式,断言 2 个 PPTTextElement + 正确 fontSize/color/`<strong>` wrap + 第二行 top 偏移 dy*scaleY
    - mutation verified: git checkout HEAD -- src/transformer/transform-to-pptel.ts + npx tsc → 1 test fails (the new one); restore fix → 4/4 pass ✓
  - **signal 2 (regression-protection scope):** text-tspan-mixed-content.test.ts (4 tests) + text-tspan-multiline-y-measurement.test.ts (2 tests) + text-anchor.test.ts + text-font-weight-coverage.test.ts = 31 tests pass — all tspan/multiline/inline paths 验证
  - **signal 3 (end-to-end CLI):** `node dist/src/cli.js exampels/green-art-teaching/templates/02_toc.svg -o /tmp/02_toc_output.json` 产出 19 elements (8 carrier lines vs 修复前 4). Carrier 行验证:
    - id=toc-item-1-carrier, fontSize=25.00 (32*0.78125), color=#408062, groupId+temaplteType 保留, content `{{TOC_ITEM_1_TITLE}}`
    - id=toc-item-1-carrier-line-1, fontSize=14.06 (18*0.78125), content `{{TOC_ITEM_1_DESC}}`, top 偏移 25.26 = dy*scaleY ✓
  - **signal 4 (full suite delta):** vitest run = 527 pass / 13 fail (vs baseline 526/13,13 failures 全部预先存在与 text 无关 — git stash 在 pristine HEAD 上验证过)
  - **signal 5 (whitespace handling):** text-tspan-multiline-y-measurement.test.ts (含 leading `'\n      '` 和 trailing `'\n    '` 的 SVG) 仍 pass — 验证 `if (child.text.trim() === '') continue` 正确剥除 XML 缩进噪声(否则会新增 2 个空白行,导致期望 7 → 收到 9 的 regression)
  - guardrail_verdict: accepted
- files_changed: src/transformer/transform-to-pptel.ts, __tests__/text-tspan-mixed-content.test.ts