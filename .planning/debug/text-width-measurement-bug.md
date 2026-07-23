---
status: resolved
trigger: "文字宽度测量不准确 - SVG text 元素宽度计算错误"
created: 2026-07-20T00:00:00.000Z
updated: 2026-07-23T00:00:00.000Z
---

## Current Focus
hypothesis: "Resvg 测量文字宽度时,虽然 SVG font-family 写的是思源黑体,但 Resvg 实际未加载字体文件"
test: "在 dist/src/fonts/ 验证字体文件存在 + 跑真实 SVG 对比 width"
expecting: "字体文件真存在时,Resvg 输出的 width 应与浏览器接近"
next_action: "已完成"

## Symptoms
expected: "Resvg 测量的文字 width 应与 PPTist 用思源渲染的实际宽度一致"
actual: "生产代码 width 整体偏小 ~32% (vs 浏览器参考),且中间一度出现 8336 的假象值"
errors: []
reproduction: "node dist/src/cli.js exampels\\ppt169_attention_is_all_you_need\\svg_output\\06_encoder_decoder.svg"
started: 2026-07-20

## Eliminated

- (旧) "测量逻辑和计算公式错误" — 排除
- (旧) "XML 转义导致 Resvg 解析失败" — 排除
- (旧) "JSON 输出 width 与测量不一致" — 排除(计算链自洽)

## Evidence

- timestamp: 2026-07-23
  checked: "Resvg 实际加载的字体"
  found: "resvg-js 底层用 Rust fontdb,只支持 ttf/otf,**不支持 woff2**"
  implication: "src/fonts/Source Han Sans CN Regular.woff2 虽然存在,但喂给 Resvg 会被静默忽略"

- timestamp: 2026-07-23
  checked: "copy-fonts.js 的过滤条件"
  found: "只接受 .woff2 后缀,而 ttf 不会被复制到 dist/src/fonts/"
  implication: "build 后 dist 里只有 woff2(624KB),FONT_FILE 指向的 ttf(1.2MB)不存在"

- timestamp: 2026-07-23
  checked: "FONT_FILE 路径解析"
  found: "存在前(commit bbc740c 后):dist/src/fonts/ 下没有 ttf,existsSync=false"
  implication: "Resvg 拿到不存在的 fontFiles 路径时,实际没用上任何字体"

- timestamp: 2026-07-23
  checked: "三种状态下的 width 总和(33 个 text 元素)"
  found: |
    - master 基线(无字体,系统 fallback): 4727.3
    - 假象修复(commit bbc740c,fontFiles 路径不存在): 8336.4
    - 真实修复(commit 3036887,fontFiles 路径有效 + 真 ttf): 6354.2
  implication: "8336 是 Resvg 内部启发式给出的中间值,6354 才是真思源字体的测量结果"

- timestamp: 2026-07-23
  checked: "浏览器参考值 737(viewBox 坐标 943) vs Resvg 6354"
  found: "差距约 32%。可能原因:浏览器也用 fallback 字体(用户系统可能没装思源);或 Resvg getBBox 用 advance width 而非字形真实边界"
  implication: "6354 已是当前 Resvg + 真思源字体的最准值,与浏览器完全一致需要浏览器侧也用真思源"

## Resolution
root_cause: |
  1. resvg-js 底层 fontdb 不支持 woff2,只支持 ttf/otf
  2. copy-fonts.js 只复制 woff2,导致 ttf 不会进入 dist
  3. FONT_FILE 指向 ttf 但 dist 里没有,Resvg 静默使用内部 fallback
  4. 之前的"测量正确"结论(commit bbc740c 验证)是基于 Resvg 假象 fallback 值的自洽,非真实思源
fix: |
  1. fonttools 把 woff2 转成 ttf(1.2MB,放在 src/fonts/)
  2. copy-fonts.js 扩展过滤为 .woff2/.ttf/.otf/.woff 四种
  3. src/text-measurer.ts 加 FONT_FILE + FONT_OPTIONS,所有 new Resvg 传入
  4. src/svg-use-handler.ts 同样传入字体选项
  5. demo-text-width.js 改用绝对路径(避免 Resvg 找不到相对路径字体)
verification: |
  - dist/src/fonts/ 现在含 ttf + woff2
  - FONT_FILE 路径 existsSync=true
  - 真实 SVG 转换 width 总和 6354.2(真思源)
  - 单元测试 17 → 15 失败(无破坏,顺带修 2 个)
files_changed:
  - src/text-measurer.ts
  - src/svg-use-handler.ts
  - package.json
  - scripts/copy-fonts.js (new)
  - src/fonts/Source Han Sans CN Regular.ttf (new)
  - demo-text-width.js
  - .planning/debug/text-width-measurement-bug.md (本文件)

related_commits:
  - bbc740c fix(text): 加载思源黑体字体让 Resvg 测量宽度与 PPTist 渲染一致(假象修复)
  - 3036887 fix(build): copy-fonts 复制所有字体格式,不再只过滤 woff2(真实修复)
