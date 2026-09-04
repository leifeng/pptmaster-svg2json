---
gsd_state_version: 1.0
slug: tspan-dy-multiline-y-too-large
status: resolved
trigger: |
  在处理 file:///E:/git/svg2json/exampels/svg_output/02_mulu.svg 的时候,
  <text> 含多个 tspan (dy=88.9) 的垂直坐标生成到 json 不对,
  top/y 值偏大,文字位置有点靠下方了。
created: 2026-09-04
updated: 2026-09-04
goal: find_and_fix
commit_docs: true
symptoms:
  expected: |
    SVG 中 <text y="185.4"> + 7 个 <tspan dy="88.9"> 应当正确生成 PPT 文本框,
    top/y 反映 y - ascent 后的视觉基线,每个 tspan 的 dy 累加 6 * 88.9 = 533.4。
  actual: |
    JSON 输出中 top/y 值偏大,文字渲染位置比 SVG 源文件中实际位置靠下。
  errors: 无报错,只是渲染位置不对。
  timeline: 一直存在该问题(用户首次反馈,无明确历史变更点)。
  reproduction: |
    处理 exampels/svg_output/02_mulu.svg,
    对应 SVG 片段(CONTENT 竖排):
      <text x="232.34" y="185.4" text-anchor="middle" font-size="84.67" fill="#F4F6FF">
        <tspan>C</tspan>
        <tspan x="232.34" dy="88.9">O</tspan>
        <tspan x="232.34" dy="88.9">N</tspan>
        <tspan x="232.34" dy="88.9">T</tspan>
        <tspan x="232.34" dy="88.9">E</tspan>
        <tspan x="232.34" dy="88.9">N</tspan>
        <tspan x="232.34" dy="88.9">T</tspan>
      </text>
  test_coverage: |
    不确定是否有针对 02_mulu.svg 的测试用例,需在调试过程中确认
    (tests/golden-samples/02_mulu.* 是否存在及其通过状态)。
---

# Debug Session — tspan-dy-multiline-y-too-large

## Current Focus

**hypothesis:** confirmed — XML whitespace before/after tspans inside <text xml:space="preserve"> is concatenated by extractPlainText and passed as-is to buildMeasurementSvg, which splits on \n and renders the measurement SVG with multi-line tspan (dy="1em"). This pushes bbox.y from ~21 (true ascent) down to ~106, making measuredAscent = fontSize - bbox.y negative, so textTop = top - (-N) * scaleY adds roughly fontSize * scaleY ≈ 66 canvas units to every line. The dy accumulation in extractTspansWithPosition is correct (line-1 - line-0 = 88.9 * 0.78125 = 69.45 ✓); the bug is solely in the **baseTop** fed to the multiline path.
**test:** added regression test `__tests__/text-tspan-multiline-y-measurement.test.ts` that constructs the exact 02_mulu.svg `<text>` (including leading `\n      ` and trailing `\n    ` indent noise), and asserts (a) first tspan top ≈ 95.49 (not 161.64), (b) firstTop < 130, (c) line spacing = 88.9 * 0.78125 exactly.
**expecting:** with the fix, first tspan top ≈ 95.49, line spacing = 69.453125. Verified by re-running CLI against 02_mulu.svg: C=95.49, O=164.94, N=234.40, T=303.85, E=373.30, N=442.76, T=512.21 — all spacings = 69.453125 ✓.
**next_action:** none — fix applied, regression test passes, full text test suite (43 tests across text-anchor/text-fields/text-font-weight-coverage/text-tspan-mixed-content/text-tspan-multiline-y-measurement) passes.

## Evidence

- timestamp: 2026-09-04
  checked: dist/src/text-measurer.js buildMeasurementSvg
  found: |
    `const lines = opts.content.split('\n')`; multi-line branch renders each line as
    `<tspan dy="1em">...</tspan>` so the bbox covers the full em-1em-em stack.
  implication: |
    任意换行/前后空白都会触发 multi-line 分支，bbox.y 不再是单行 ascent top，
    而是 multi-line 块的顶部（包含 1em 高度的占位行）。

- timestamp: 2026-09-04
  checked: resvg measurement with literal "CONTENTS" vs "\n      CONTENT\n    "
  found: |
    "CONTENTS" → {y: 21.498, height: 64.288}
    "\n      CONTENT\n    " → {y: 106.168, height: 64.288}  // height same, y pushed by 1em
  implication: |
    增量完全等于 1em = 84.67 — 与 buildMeasurementSvg 给首行加 dy="1em" 的行为一致。
    width 也异常（380 vs 426）：纯空白首/尾行宽度为 0，使 bbox 取最大中间行的宽度。

- timestamp: 2026-09-04
  checked: transform-to-pptel.ts:1527 content extraction
  found: |
    `const { html: contentHtml, text: content } = buildTextContentFromElement(element, ...)`
    → `extractPlainText` 递归拼接所有 AST text 节点的 content，包含 leading/trailing 空白节点。
  implication: |
    XML 解析在 <text>\n      <tspan>...\n    </text> 中保留
    {type:'text', text:'\n      '} 和 {type:'text', text:'\n    '} 两个节点，
    extractPlainText 把它们拼到 content 字符串前后。

- timestamp: 2026-09-04
  checked: 02_mulu.svg toc-title CONTENTS 文本 AST
  found: |
    children: [
      text "\n      ",
      tspan "C", tspan "O", tspan "N", tspan "T", tspan "E", tspan "N", tspan "T",
      text "\n    "
    ]
  implication: |
    confirmed: 缩进噪声确实进入了 AST text 节点，并被 extractPlainText 拼入 content。

- timestamp: 2026-09-04
  checked: 02_mulu.svg 修复前 JSON top values
  found: |
    C=161.64, O=231.09, N=300.55, T=370.00, E=439.45, N=508.90, T=578.36
    间距 = 69.453125 (≈ 88.9 * 0.78125) ✓
    第一行 161.64 比期望 95.49 大 66.15 = 84.67 * 0.78125 = fontSize * scaleY
  implication: |
    dy 累加正确；偏差完全等于 fontSize * scaleY——与负 measuredAscent 公式预测一致。

- timestamp: 2026-09-04
  checked: 02_mulu.svg 修复后 JSON top values
  found: |
    C=95.49, O=164.94, N=234.40, T=303.85, E=373.30, N=442.76, T=512.21
    间距 = 69.453125（与 dy=88.9*scaleY 完全一致）✓
    第一行 95.49 = 185.4*0.78125 - (84.67-21.498)*0.78125 ✓
  implication: |
    fix 生效：textTop 准确反映 SVG (y - ascent)*scale；行间距保留 dy 累加。

- timestamp: 2026-09-04
  checked: 全文本测试套件回归
  found: |
    text-anchor (13) + text-fields (13) + text-font-weight-coverage (12) +
    text-tspan-mixed-content (3) + text-tspan-multiline-y-measurement (2) = 43/43 PASS
    其他失败（gradient/shadow/shape-rx/path-merge/image-outline）均为 pre-existing，
    与本次修复无关（small-font-top-offset 调试记录已注明 16 个 pre-existing failures）。
  implication: |
    fix 未引入任何回归；新增的 multiline-y 回归测试同时覆盖"有缩进"和"无缩进"两种路径。

## Eliminated

- hypothesis: dy 累加逻辑错误（tspan-to-tspan 间距偏大）
  evidence: 实测 line-1 - line-0 = 69.453125 = 88.9 * 0.78125 精确等于 SVG dy
  timestamp: 2026-09-04

- hypothesis: textTop 计算公式本身错误（fixed 0.8 ratio / measured.y 选错）
  evidence: 用 resvg 直接测 "CONTENTS" 得 bbox.y=21.498、measuredAscent=63.172，
           公式 textTop = top - measuredAscent * scaleY = 95.49 与视觉一致；
           目(单 text 元素)实测 80.60 vs 期望 81.75 误差 < 1.2 也证明公式本身无误
  timestamp: 2026-09-04

- hypothesis: scaleX/scaleY 比例不对
  evidence: scaleY=0.78125 (562.5/720) 正确，间距 88.9 * 0.78125 = 69.453125 与实测吻合
  timestamp: 2026-09-04

- hypothesis: TEXT_ANCHOR_MIDDLE_TOP_OFFSET 引入偏差
  evidence: 常量 = 0（constants.ts:62）；且其他 text-anchor="middle" 元素（"目"/"录"）
           top 都正确
  timestamp: 2026-09-04

## Resolution

**root_cause:** `<text xml:space="preserve">` 在源文件中跨多行书写时，SVG 解析器把 `<text>` 与首/末 `<tspan>` 之间的缩进空白（`\n      ` 和 `\n    `）作为独立 text 节点保留。`extractPlainText` 把这些空白节点拼到 `content` 字符串前后，导致传给 `buildMeasurementSvg` 的内容是 `"\n      CONTENT\n    "`。`buildMeasurementSvg` 按 `\n` 切行后用 multi-line tspan (`dy="1em"`) 渲染，bbox.y 从真实单行 ascent (~21) 漂移到 ~106（增加 fontSize = 84.67），进而 `measuredAscent = fontSize - bbox.y` 变为负数（-21.5），`textTop = top - (-21.5) * scaleY` 把整段文字额外下推 fontSize * scaleY ≈ 66 canvas units。视觉上"top 偏大、文字整体靠下"。

**fix:** `src/transformer/transform-to-pptel.ts:1551-1554` — 在调用 `measureTextElement` 之前对 measurement content 做 `replace(/^\s+|\s+$/g, '')`：剥掉 SVG 缩进噪声，但保留正文中间的真实换行（仍按 1em 行高测量，对 SVG 多行文本保持原有测量行为）。

**files_changed:**
- src/transformer/transform-to-pptel.ts (line 1548-1554, 增加 measurementContent trim)
- __tests__/text-tspan-multiline-y-measurement.test.ts (新增 2 个回归测试)

## Specialist Review

specialist_hint: typescript. session-manager 无 Skill 工具直接调用 typescript-expert skill。改用现有证据做内联 TS review：

- **修复方向**:仅在 measurement path 上 trim 输入,不影响 final PPTElement 的 rich-text p/span emission——与 xml:space="preserve" 不冲突(保留内部真实换行)。
- **类型/范围**:改动是局部字符串处理,无类型签名变化,无公共 API 变化。
- **潜在风险点**:
  1. `replace(/^\s+|\s+$/g, '')` 是无 anchor 的双向 trim;若 content 内部存在尾随/首随的真实空白(罕见),仍被剥离。对本项目 02_mulu.svg 而言是良性的,因为 trim 掉的是 SVG 缩进噪声,而非字面文本。
  2. 已有 `__tests__/text-tspan-multiline-y-measurement.test.ts` 两个测试同时覆盖"有缩进"和"无缩进"路径,确认 trim 不会误伤无噪声输入。
- **结论**:LOOKS_GOOD — 修复范围最小化、回归覆盖充分、不影响其他 text/tspan 路径(text-anchor / text-fields / text-font-weight-coverage / text-tspan-mixed-content 43/43 全绿)。
