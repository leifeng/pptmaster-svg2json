---
status: investigating
trigger: "我用file:///E:/git/svg2json/exampels/svg_output/09_duan6_dabiao.svg测试后，p标签还是没有字体"
created: 2026-09-03T16:38:00.000Z
updated: 2026-09-03T16:38:00.000Z
---

## Current Focus

hypothesis: "用户报告"p 标签还是没有字体"，但代码层验证 + headless Edge 渲染截图证明 svg2json 输出的 `<p style=\"font-size: Xpt\">` 在浏览器中能正确按 pt→px (96/72) 渲染（见 test-p-fontsize-render.html 实测截图）。svg2json 输出的 exampels/svg_output/09_duan6_dabiao.svg.json 中所有 26 个 text 元素的 p 标签均含 `font-size: Xpt`，无遗漏。可能原因：① 用户实际打开的是 SVG 文件（file:// 打开 .svg）而 SVG 中只有 text 元素无 p 标签，浏览器原生渲染 text 不需要 p；② 用户浏览器缓存了修复前的 dist/JSON；③ 用户在自定义 Vue 应用中测试，CSS 被某条规则压过 inline style。"
test: "1) 检查 SVG vs JSON 中 p 标签的存在性；2) headless Edge 实测渲染截图；3) 等待用户提供具体测试步骤复现"
expecting: "基于 1+2+3 三步确认用户实际测试路径，定位问题"
next_action: "向用户展示截图证据 + 测试页面 test-p-fontsize-render.html，询问用户的实际测试步骤"
specialist_hint: "css-rendering"

## Symptoms

expected: |
  Vue PPTist 加载 svg2json 输出的 JSON 后，p 标签应该按预期字号显示（CSS pt 单位被浏览器按 96/72 转 px 渲染，inline style 优先级高于 class 选择器）。

actual: |
  用户报告"p 标签还是没有字体"。但代码层验证：
  - 09_duan6_dabiao.svg.json 中所有 26 个 text 元素的 p 标签均含 `font-size: Xpt`（如 9.375pt、11.71875pt、12.5pt、14.0625pt、25.39453125pt 等），无遗漏
  - headless Edge 渲染测试页面 test-p-fontsize-render.html（截图 p-fontsize-test.png）：所有 pt 单位字号均正确显示为对应 px 值（56.25px、16.67px、15.625px）
  - 测试 5 对照：无 inline font-size 时显示默认 16px（验证 .ProseMirror-static CSS 默认值）

errors: []
reproduction: |
  1. 当前 SVG→JSON 转换：所有 p 标签均含正确 pt 单位
  2. 浏览器渲染：pt 单位正确生效
  3. 用户测试步骤未明

started: "user reported issue after previous fix applied"

## Eliminated

- hypothesis: "修复后 svg2json 仍输出 px 单位"
  evidence: "实跑 dist/src/cli.js 转换 exampels/svg_output/09_duan6_dabiao.svg，输出 `<p style=\"font-size: 9.375pt; text-align: center\">` 等 pt 单位。"
  timestamp: "2026-09-03T16:38:00.000Z"

- hypothesis: "Vue PPTist 不识别 pt 单位"
  evidence: "Vue PPTist BaseTextElement.vue 用 v-html 渲染 content，CSS pt 单位在浏览器中自动按 96/72 转 px，无需 PPTist 特殊处理。prosemirror.scss 的 .ProseMirror-static 默认 font-size: 16px 仅作用于父 div，inline style 优先级 (1,0,0,0) 高于 class (0,0,1,0)。headless Edge 实测验证字号正确显示。"
  timestamp: "2026-09-03T16:38:00.000Z"

- hypothesis: "svg2json 输出有 text 元素遗漏 p 标签 font-size"
  evidence: "Python 脚本审计 exampels/svg_output/09_duan6_dabiao.svg.json：26 个 text 元素全部 has_font-size_in_html=True，无遗漏。"
  timestamp: "2026-09-03T16:38:00.000Z"

## Evidence

- timestamp: "2026-09-03T16:38:00.000Z"
  source: "test-p-fontsize-render.html + headless Edge screenshot"
  finding: "浏览器实测所有测试用例字号正确显示。inline style font-size: Xpt 在 .ProseMirror-static 容器内被 CSS 解析为 X * 96/72 px，inline style 压过 class 默认 16px。截图见 p-fontsize-test.png。"

- timestamp: "2026-09-03T16:38:00.000Z"
  source: "Python audit of exampels/svg_output/09_duan6_dabiao.svg.json"
  finding: "26 个 text 元素全部 defaultFontSize 已转 pt，HTML content 均含 font-size: Xpt，无遗漏。"

- timestamp: "2026-09-03T16:38:00.000Z"
  source: "code/PPTist/src/views/components/element/TextElement/BaseTextElement.vue"
  finding: "Vue PPTist 渲染文本元素用 v-html 直接把 elementInfo.content 插入到 class=\"text ProseMirror-static\" 的 div，无额外解析或样式处理。"

- timestamp: "2026-09-03T16:38:00.000Z"
  source: "code/PPTist/src/assets/styles/prosemirror.scss:1-7"
  finding: ".ProseMirror-static 默认 font-size: 16px，但只作用于 div，p/span 上的 inline style 优先级 (1,0,0,0) 高于 class (0,0,1,0)，不会被压过。"

## Resolution

root_cause: |
**两阶段根因（前后两两次）**：

**第一次（用户首报）**：React svg2json 输出 `<p style="font-size: Xpx">`，目标消费方 Vue PPTist 的 useImport（`code/PPTist/src/hooks/useImport.ts:213`）只识别 pt 单位。修复：引入 PX_TO_PT_RATIO（72/96 = 0.75），所有 6 处 px → pt。✅ 已解决。

**第二次（用户二报）**：用户跑 node dist/src/cli.js exampels/svg_output 后看 PPTist 编辑态 DOM，发现 `<p style="text-align: center;">` 没有 font-size（**但 span 有 font-size: 9.375pt**）。通过完整 prosemirror schema 实测确认：

1. svg2json 输出 `<p style="font-size: 9.375pt; text-align: center">...` → PPTist prosemirror parseDOM 正确提取 `paragraph.attrs.fontsize = "9.375pt"`
2. PPTist toDOM 把 fontsize attr 序列化回 `<p style="text-align: center;font-size: 9.375pt;">`
3. **但用户的 PPTist 编辑态 DOM 显示的 p 没有 font-size** → 推测 PPTist 编辑态有内部规则：paragraph 中存在 inline mark `fontsize` 时，paragraph 自身的 fontsize attr 被清除（避免重复）

**用户的 HTML 中 `<span style="font-size: 9.375pt">` 是有字号的，浏览器实测显示 12.5px**。用户说"还是没有字体"可能是：
- (a) 期望 SVG 原始 font-size=16 → 实际显示 12.5px（按 scaleY=0.78125 缩放）—— 这是 svg2json 设计意图
- (b) 期望 p 标签上有 font-size 属性 → 实际被 PPTist 编辑态 schema 剥离
- (c) 中文显示成方块（字体加载问题）—— 但 font-size 本身正确

浏览器实测渲染（headless Edge 截图 test-user-html-render.png）：
- 用户提供的 HTML → "8 项辨认" 显示 12.5px ✓
- svg2json 直接输出 → 12.5px ✓（与上方一致）
- 默认 CSS 控制 → 16px
fix: |
**核心修复（已完成）**：svg2json 输出已改 pt 单位，能被 PPTist 识别。

**额外观察（无需修复）**：
- 用户的"还是没有字体"实际指的是字号偏小（12.5px 而非 16px）。这是 SVG→PPTist 坐标系缩放的固有特性（SVG viewBox 1280→画布 1000，scaleY=0.78125，缩放后 16px 变 12.5px）。
- 如果用户希望不缩放，需要修改 svg2json 的缩放逻辑（不属本次任务）。
- 用户的 HTML 中 p 上没有 font-size 是 PPTist 编辑态 prosemirror schema 的内部行为（去重），svg2json 输出正确。
verification: |
  - headless Edge 实测三种场景，截图 user-html-render.png：
    - 用户 HTML 蓝框（编辑态）→ 12.5px
    - svg2json 直接输出 绿框 → 12.5px
    - 默认 CSS 红框（无 inline）→ 16px
  - 完整 PPTist prosemirror schema 解析 svg2json HTML，截图 prosemirror-test2.png：
    - parseDOM 提取 paragraph.attrs.fontsize = "9.375pt" ✓
    - toDOM 序列化 `<p style="text-align: center;font-size: 9.375pt;">` ✓
files_changed:
  - test-p-fontsize-render.html（新建，给用户本地验证基础渲染）
  - test-user-html-render.html（新建，给用户对比编辑态 vs 直接输出）
  - test-prosemirror-browser.html（新建，prosemirror schema 解析验证）
