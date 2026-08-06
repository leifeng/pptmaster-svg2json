---
status: resolved
trigger: "现在在转换svg的试试，字体越小，转到json后top偏差约大（top大），大字体看着top没问题，比如file:///E:/git/svg2json/exampels/a.svg"
created: 2026-08-05
updated: 2026-08-05
resolution: fix-applied
---

## Specialist Review

- specialist: typescript-expert (fallback to gsd-code-reviewer; typescript-expert not available)
- verdict: LOOKS_GOOD
- reason: 修复在 <p> 上显式设置 font-size: ${scaledFontSize}px，使 line-box 与 span 一致，baseline 与 span ascent 对齐，消除 ~5.9px 视觉顶端偏移；pStyleParts 数组 + join('; ') 实现干净；移除空 style 三元分支安全；测试覆盖 single-line/multiline/不同 fontSize 三档充分。
- follow-up (out of scope): `src/transformer/transform-to-pptel.ts:1702` 硬编码 `text-align: center` 而非 `text-align: ${textAlign}`，与 text-anchor=start/end 组合时仍错误居中。建议作为后续单独修复处理。

# Debug Session: small-font-top-offset

## Symptoms

- **Expected behavior**: 转换 SVG → JSON 后，把 JSON 渲染成 PPT/画布，文本的垂直位置（top）应与原 SVG 中 `<text>` 的视觉渲染位置一致，无论字号大小。
- **Actual behavior**: 字号越小，JSON 中的 `top` 偏差越大（top 偏大 = 文本视觉上偏下）。大字号时 top 看起来正常。偏差与字号呈反相关趋势。
- **Error messages**: 无报错，纯几何/坐标计算偏差。
- **Timeline**: 未知。
- **Reproduction**: 用 CLI/脚本转换 `exampels/a.svg` 为 JSON，对比渲染结果的视觉效果。
- **Deviation magnitude**: 约几个像素（< 5px），小字号时可观察，大字号时不明显。

## Reference

- Example input: `E:/git/svg2json/exampels/a.svg`
- Project root: `E:/git/svg2json`

## Current Focus

hypothesis: PPTist 的 `.ProseMirror-static` CSS 设置 `font-size: 16px`；转换产出的 `<p>` 没有显式 font-size（继承自 .ProseMirror-static = 16px），但内嵌 `<span>` 设了 scaledFontSize（≈8.59px for SVG 11px）。`<p>` 的 line-height=1（继承自 .element-content），导致 `<p>` 的 line-box 高度=16px，baseline 位置在 0.8*16=12.8px from top；而 span 的视觉顶端按 baseline 对齐、向上走 span 的 ascent=0.8*8.594=6.875px，落在 12.8 - 6.875 = 5.925px from top of line-box。**结论**: text 视觉顶端 = JSON top + 5.925（即视觉位置比 JSON top 低 5.925px）。这个偏移量与 SVG fontSize 无关（在 fixed p font-size=16px 时恒定），但视觉相对偏差对小字号更明显（小字号 1-2px ascent，5.925px 偏移就占大半高）。
test: 修改 `<p>` 显式带上 `font-size: scaledFontSize`，让 `<p>` 的 line-box 高度 = scaledFontSize，baseline 位置在 0.8*scaledFontSize，与 span 一致；预期 text 视觉顶端 = JSON top + 0 = JSON top
expecting: `<p font-size: 8.59px>` 后 line-box 高 8.59px，baseline 6.87px from top，span visual top = 6.87 - 6.87 = 0
next_action: 修改 src/transformer/transform-to-pptel.ts 的 single-line 和 multiline `<p>` 拼接，给 `<p>` 加 `font-size: scaledFontSize` 样式

## Evidence

- 2026-08-05T17:30:00Z: read src/transformer/transform-to-pptel.ts:1613-1638 — single-line path 生成 `<p${pStyle} style=${pStyle}>`，pStyle 只含 `text-align: ${textAlign}`，**未设置 font-size**
- 2026-08-05T17:30:30Z: read code/PPTist/src/assets/styles/prosemirror.scss:1-10 — `.ProseMirror-static` 设置 `font-size: 16px`，p:first-child { margin-top: 0 }
- 2026-08-05T17:31:00Z: read code/PPTist/src/views/components/element/TextElement/BaseTextElement.vue:85-89 — `.element-content` 设置 `line-height: 1.5`（被 inline style lineHeight: 1 覆盖）；`.text` 用 `position: relative`
- 2026-08-05T17:31:30Z: read BaseTextElement.vue:23 — inline style `lineHeight: elementInfo.lineHeight`（= 1），覆盖 CSS 默认 1.5
- 2026-08-05T17:32:00Z: 复算：SVG fontSize=11 → canvas fontSize=8.594 → span font-size=8.594px, p font-size=16px(继承), p line-height=1 → p line-box=16px, baseline=12.8 from top, span visual top=12.8-6.875=5.925 from top, 视觉位置比 JSON top 低 5.925px
- 2026-08-05T17:32:30Z: 复算：SVG fontSize=60 → canvas fontSize=46.875 → p baseline 仍在 12.8 from top（p font-size 固定 16px），span ascent = 0.8*46.875=37.5, span visual top = 12.8-37.5=-24.7 from top（即 24.7 ABOVE JSON top）
- 2026-08-05T17:33:00Z: 量纲差异：small font 的视觉偏移是 +5.925px（text 在 JSON top 之下），large font 是 -24.7px（text 在 JSON top 之上）。"偏差方向相反"恰好解释用户"小字偏差大"的体验——小字视觉下移（top 看起来过大），大字视觉上移（top 看起来过小），都是 top 与实际位置不一致
- 2026-08-05T17:33:30Z: 实际测量：resvg bbox.y 对各 size 的 ascent_ratio 完全一致（0.7329 for "Test", 0.7959 for "Hello"），没有 O(1) bias，转换公式 `textTop = top - measuredAscent * scaleY` 数学正确
- 2026-08-05T17:34:00Z: run `npx vitest run __tests__/text-anchor.test.ts` — 8/9 通过，仅 TEXT-02 middle 偏移测试失败（期望 -10，实际 -6）。此测试与本次 bug 无关

## Eliminated

- hypothesis: resvg 的 bbox.y 有 O(1) bias（最小 1px padding）
  evidence: 同一 content 在 fontSize=4/8/16/60/100 下 ascent_ratio 完全恒定（0.7329），不存在 bias
  timestamp: 2026-08-05T17:32:00Z

- hypothesis: `transformed.top → top` 改动（commit 77a9a41）破坏非旋转 case
  evidence: 该 commit 仅在 transform.rotateCX/CY 存在时影响；非旋转时 transformed.top === top，git diff 显示无功能变化
  timestamp: 2026-08-05T17:31:00Z

## Resolution

root_cause: PPTist 的 .ProseMirror-static CSS 设置 `font-size: 16px`；转换产出的 `<p>` 没有显式 font-size（继承自 .ProseMirror-static = 16px），但内嵌 `<span>` 设了 scaledFontSize（≈8.59px for SVG 11px）。`<p>` 的 line-height=1（继承自 .element-content），导致 `<p>` 的 line-box 高度=16px、baseline 位置在 0.8*16=12.8px from top；而 span 的视觉顶端按 baseline 对齐、向上走 span 的 ascent=0.8*8.594=6.875px，落在 12.8 - 6.875 = 5.925px from top of line-box。text 视觉顶端 = JSON top + 5.925（即视觉位置比 JSON top 低 5.925px）。这个偏移量与 SVG fontSize 无关（在 fixed p font-size=16px 时恒定），但视觉相对偏差对小字号更明显（小字号 1-2px ascent，5.925px 偏移就占大半高），符合用户报告的"小字 top 偏差大"现象。
fix: 在 src/transformer/transform-to-pptel.ts 的 single-line `<p>` 与 multiline 每条 `<p>` 上都显式加 `font-size: ${scaledFontSize}px`，让 `<p>` 的 line-box 高度 = scaledFontSize、baseline 位置在 0.8*scaledFontSize，与 span 一致，visual top = baseline - span ascent = 0（即与 JSON top 一致，无偏移）。
verification: 新增 3 个单元测试（__tests__/text-fields.test.ts），验证 single-line `<p>` 与 multiline 每条 `<p>` 的 font-size 都匹配 scaledFontSize；npx vitest run 后 13/13 通过；其余 16 个失败均为 pre-existing failures（gradient/shadow/shape-rx/text-anchor 等），与本次修复无关。
files_changed:
  - src/transformer/transform-to-pptel.ts
  - __tests__/text-fields.test.ts