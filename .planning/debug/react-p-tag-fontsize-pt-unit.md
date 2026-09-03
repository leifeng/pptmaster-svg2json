---
status: resolved
trigger: "vue版本中p标签支持字体大小配置，需要给react版本的文本元素的p支持字体大小，参考vue版本"
created: 2026-09-03T15:50:00.000Z
updated: 2026-09-03T16:22:00.000Z
---

## Current Focus

hypothesis: "React svg2json 当前在 `<p>` 标签上写 `font-size: ${scaledFontSize}px`（px 单位），但目标消费方 Vue PPTist（`code/PPTist`）的 useImport 逻辑（`code/PPTist/src/hooks/useImport.ts:213`）只识别 **pt** 单位（regex `/font-size\s*:\s*(\d+(?:\.\d+)?)\s*pt/gi`，默认 18pt）。当 SVG 转出的 JSON 含 `<p style=\"font-size: 56.25px\">` 时，PPTist prosemirror schema（`code/PPTist/src/utils/prosemirror/schema/nodes.ts:153-164` paragraph toDOM）只接受 `attrs.fontsize` 字段（带单位字符串），inline style 的 px 被忽略，最终 PPTist 回退到 18pt 默认值——表现为\"完全没有 font-size\"。Vue 版本本身支持 p 标签 font-size 是因为：① PPTist 创建文本时 `defaultFontSize` 字段是 pt；② schema 直接输出该字段值（带 pt 后缀）；③ useImport 解析 regex 匹配 pt。"
test: "1) 修改 React svg2json 让 `<p>` 与嵌套 `<span>` 的 font-size 改用 **pt** 单位（沿用 scaledFontSize 经 ratioPx2Pt 转换后的值）；2) 同步把 `defaultFontSize` 字段也转成 pt 单位；3) 跑现有 text-tspan / text-related 测试套件；4) 用最小 SVG 验证输出 `<p style=\"font-size: 18pt\">...`，确保 Vue PPTist 能识别。"
expecting: "转换后的 JSON 内容形如 `<p style=\"font-size: 18pt\"><span style=\"font-size: 18pt; color: #262626\">...</span></p>`，defaultFontSize 字段也为 pt 单位（数值 = scaledFontSize / ratioPx2Pt）。PPTist 导入时能正确解析 p 标签 font-size，应用到 paragraph 渲染。"
next_action: "1) 定位 React svg2json 现有的 ratioPx2Pt 常量；2) 修改 transform-to-pptel.ts:1638、1643、1715 三处把 px 改 pt；3) 修改 transform-to-pptel.ts:1725、1745 处 defaultFontSize 字段同步转 pt；4) 更新 multiline 分支 spanStyle 同步改 pt；5) 跑测试验证。"

## Symptoms

expected: |
  Vue 版本渲染时 p 标签的 font-size 生效（因为 Vue PPTist 内部 defaultFontSize 是 pt 单位，schema 直接输出带 pt 的 fontsize 字段，useImport 用 pt regex 解析）。期望 React svg2json 输出的 JSON 在 Vue PPTist 中加载时，p 标签 font-size 也能生效。

actual: |
  React svg2json 当前生成的 JSON 内容中，`<p>` 标签的 font-size 用 px 单位（实测输出：`<p style=\"font-size: 56.25px\">`）。Vue PPTist 导入时只识别 pt 单位，px 被忽略，p 标签最终回退到默认 18pt——视觉上表现为\"完全没有 font-size\"或字号错误。

errors: []
reproduction: |
  1. 准备 SVG: `<svg viewBox=\"0 0 400 200\"><text x=\"100\" y=\"100\" font-family=\"Microsoft YaHei\" font-size=\"20\" fill=\"#262626\">独立完成</text></svg>`
  2. `node dist/src/cli.js /tmp/test.svg` 生成 JSON
  3. 观察 content 字段：`<p style=\"font-size: 56.25px\">` ← px 单位
  4. 把 JSON 导入 Vue PPTist（`code/PPTist`）→ 字号变成 18pt 默认值

started: "always broken"

## Eliminated

- hypothesis: "React svg2json 完全没有写 font-size 到 p 标签"
  evidence: "实测 `transform-to-pptel.ts:1638` `pStyleParts = [`font-size: ${scaledFontSize}px`]`，1715 行 `tspanPStyle = [`font-size: ${scaledFontSize}px`]`，是有写的；问题在单位。"
  timestamp: "2026-09-03T15:55:00.000Z"

- hypothesis: "目标消费方是 React 版 PPTist（用 px）"
  evidence: "`code/PPTist/package.json` 显示是 Vue + Vite + vue-tsc，仓库内不存在 React PPTist fork；svg2json 的对齐目标是 Vue PPTist。"
  timestamp: "2026-09-03T15:55:00.000Z"

## Evidence

- timestamp: "2026-09-03T15:55:00.000Z"
  source: "src/transformer/transform-to-pptel.ts:1638"
  finding: "`const pStyleParts: string[] = [`font-size: ${scaledFontSize}px`]`
  if (textAlign) pStyleParts.push(`text-align: ${textAlign}`)
  const pStyle = pStyleParts.join('; ')` — React svg2json 用 px 单位"

- timestamp: "2026-09-03T15:55:00.000Z"
  source: "src/transformer/transform-to-pptel.ts:1715"
  finding: "multiline tspan 路径同样使用 `font-size: ${scaledFontSize}px`，内层 lineContent（tspan.htmlContent）的 span font-size 也都是 px（extractTspansWithPosition 内部）"

- timestamp: "2026-09-03T15:55:00.000Z"
  source: "src/transformer/transform-to-pptel.ts:1745"
  finding: "`defaultFontSize: scaledFontSize` — PPTTextElement.defaultFontSize 字段也是 px 单位"

- timestamp: "2026-09-03T15:55:00.000Z"
  source: "code/PPTist/src/hooks/useImport.ts:213"
  finding: "Vue PPTist useImport 解析 regex 只匹配 pt：`/font-size\s*:\s*(\d+(?:\.\d+)?)\s*pt/gi`，默认 18pt。px 单位不会被识别。"

- timestamp: "2026-09-03T15:55:00.000Z"
  source: "code/PPTist/src/utils/prosemirror/schema/nodes.ts:153-164"
  finding: "Vue PPTist paragraph (p) toDOM 直接拼接 `fontsize` 字段值（带单位字符串）到 style；fontsize 是从 inline `style.fontSize` 或 PPTTextElement.defaultFontSize 转换而来，使用 pt。"

- timestamp: "2026-09-03T15:55:00.000Z"
  source: "code/PPTist/src/hooks/useExport.ts:551"
  finding: "Vue PPTist useExport 时把 defaultFontSize / ratioPx2Pt 转成 pt：`fontSize: defaultFontSize / ratioPx2Pt.value` — 明确 PPTist 默认字段是 pt 单位。"

- timestamp: "2026-09-03T15:55:00.000Z"
  source: "git log --grep pptist"
  finding: "afada37 commit 修复 p 标签 font-size top 偏移时只考虑了 px 与 16px CSS 默认值的对比，没意识到 PPTist 期望 pt 单位——埋下当前 bug 根源。"

## Resolution

root_cause: "目标消费方 Vue PPTist 的 `<p>` 标签 font-size 解析（prosemirror schema + useImport regex）只识别 **pt** 单位；React svg2json 一直输出 px 单位的 font-size 到 inline style 与 defaultFontSize 字段，PPTist 导入时被忽略、回退默认 18pt。"
fix: |
  1. 新增 `src/constants.ts: PX_TO_PT_RATIO = 72/96 = 0.75`（px → pt 转换系数，CSS 渲染时 pt 按 96/72 转回 px，视觉尺寸不变）。
  2. `src/transformer/transform-to-pptel.ts` 6 处统一改用 pt：
     - `buildSpanStyle`（line 579）：`<span style="font-size: Xpt">`
     - single-line `pStyleParts`（line 1646）：`<p style="font-size: Xpt">`
     - single-line `spanStyle`（line 1651）：外层 span 用 pt
     - multiline `tspanPStyle`（line 1723）：多行 tspan p 用 pt
     - multiline `defaultFontSize`（line 1736）：每行 PPTTextElement.defaultFontSize 字段用 pt
     - single-line `defaultFontSize`（line 1747）：PPTTextElement.defaultFontSize 字段用 pt
  3. `__tests__/text-fields.test.ts` 4 处期望值更新：11px → 8.25pt、60px → 45pt（保持 scaledFontSize 逻辑，新增 pt 单位注释）。
  4. line-box 对齐（small-font-top-offset.md 修复）依然成立：`<p>` 与 `<span>` 同步缩放 0.75，line-box 高度 = span 视觉高度，baseline 位置保持一致。
verification: |
  - text-fields.test.ts（13 项）+ text-tspan-mixed-content.test.ts（3 项）= 16 个文本相关测试全部通过 ✓
  - 全套 vitest：241 通过 / 15 失败（修改前后失败数完全相同 15→15，diff 为空），无新增回归 ✓
  - 实际产出验证（最小 SVG `font-size=20` → scaleY=2.8125 → `scaledFontSize=56.25px`）：
    - 旧：`<p style="font-size: 56.25px">` ← Vue PPTist 忽略，回退 18pt
    - 新：`<p style="font-size: 42.1875pt">` ← Vue PPTist 识别，且视觉尺寸 42.1875 * 96/72 = 56.25px 不变
    - `defaultFontSize`: 旧 56.25（px）→ 新 42.1875（pt）
  - multiline tspan 覆盖字号能力保留：`<tspan font-size="30">` → `font-size: 63.28125pt`（30*2.8125*0.75）
files_changed:
  - src/constants.ts（新增 PX_TO_PT_RATIO 常量）
  - src/transformer/transform-to-pptel.ts（6 处 px → pt）
  - __tests__/text-fields.test.ts（4 处期望值更新）
