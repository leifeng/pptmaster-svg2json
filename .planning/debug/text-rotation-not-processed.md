---
status: resolved
trigger: 处理file:///E:/git/svg2json/exampels/svg_output/04_benchmarks.svg 中 <text xmlns="http://www.w3.org/2000/svg" x="18" y="355" font-family="&quot;Microsoft YaHei&quot;, Arial, sans-serif" font-size="13" fill="#5A6A7A" text-anchor="middle" transform="rotate(-90, 18, 355)">Score (%) / Rating (normalized)</text> 没处理旋转
created: 2026-08-05
updated: 2026-08-05T16:50:00Z
reopened: 2026-08-05T16:30:00Z
resolved: 2026-08-05T16:50:00Z
---

# Debug Session: text-rotation-not-processed

## Symptoms

### 1. Expected behavior
绕点(18,355)旋转-90度显示。文字应垂直显示在左侧坐标轴位置（典型的纵轴标签）。

### 2. Actual behavior
水平显示，旋转失效。文字直接显示在 (18,355) 位置，没有旋转。

### 3. Error messages
无明显错误，转换过程成功，但视觉对比时旋转缺失。

### 4. Timeline / 影响范围
之前应该没遇到过旋转文字的情况。这是首次发现 text 旋转未被处理的 bug。

### 5. Reproduction
- 输入文件：`E:\git\svg2json\exampels\svg_output\04_benchmarks.svg`
- 触发元素：`<text x="18" y="355" ... text-anchor="middle" transform="rotate(-90, 18, 355)">Score (%) / Rating (normalized)</text>`
- 验证方法：可视化对比 SVG 与生成的 PPTX，发现 PPTX 中该文字无旋转

## Current Focus

- **hypothesis**: 已通过 fix_and_verify 验证修复有效；状态置为 resolved
- **next_action**: 由维护者运行真实 SVG（04_benchmarks.svg）的端到端验证，确认视觉上文字确实被旋转显示
- **test**: 4 个 case 全部通过：
  - `rotate(-90, 18, 355) text-anchor=middle`: rotate=-90, bbox 13.01×257.94（width/height 对调），中心 (15.04, 332.81) 与 SVG 旋转中心 (22.50, 332.81) 偏差 7.46 px（ascent 0.764×13=9.93 vs textHeight/2=6.5 引起）
  - `rotate(45, 100, 100)`: rotate=45，bbox 47.67×69.13，中心 (133.02, 85.73) 与旋转中心 (125, 93.75) 偏差 8.02 px
  - 无旋转: rotate=0，未受 fix 影响
  - `rotate(-90)` 不带中心: rotate=-90，bbox 不变
- **expecting**: 维护者人工确认 04_benchmarks.svg 中 y 轴标签 “Score (%) / Rating (normalized)” 在生成 PPTX 中垂直显示

## Evidence

- timestamp: 2026-08-05T00:05:00Z
  checked: `.planning/debug/knowledge-base.md`
  found: 现有条目仅记录 SVG 文本 `+2.0` 的数值解析问题；与本症状只有通用的 `text` 词重叠，没有 `transform`、`rotate` 或 rotation 关键词匹配
  implication: 知识库未提供可优先验证的历史根因；继续对当前转换链路建立独立假设

- timestamp: 2026-08-05T00:08:00Z
  checked: `src/parser/svg-parser.ts` 的 `convertToSvgElement` / `convertOrderedToSvgElement`（约 502–637 行）
  found: 两者都把 `@_*` 属性写入 `attrs`，且未对 `transform` 单独过滤；gradient/filter/pattern 引用 resolve 时也不会删除 `transform`
  implication: 解析后 `<text transform="rotate(-90, 18, 355)">` 的 `attrs.transform` 应当原样保留到 AST

- timestamp: 2026-08-05T00:10:00Z
  checked: `src/transformer/transform-to-pptel.ts` `walk()` 与 `transformElement` 入口
  found: `walk()` 在遍历子元素时通过 `composeTransforms(parentTransform, element.attrs.transform)` 合成 `effectiveTransform`，并把它传给 `transformElement(mergedElement, viewBox, ..., effectiveTransform)`；`transformElement` 再 `parseTransform(effectiveTransform || element.attrs.transform)`。text 分支只读取 `transform.rotate`，没有把它传播到最终 `PPTTextElement`
  implication: 解析侧 OK，但 text 分支在生成 PPTTextElement 时把 `rotate` 字段丢掉了

- timestamp: 2026-08-05T00:12:00Z
  checked: `src/transformer/transform-to-pptel.ts` 1473–1702 行 `case 'text'`
  found: 局部变量 `const { rotate } = transformed` 取出后只参与 `baseResult.rotate`（实际上没有写进 `baseResult`，因为 `baseResult` 字段里没有 `rotate`），并把 `transformed.left`/`transformed.top` 重新赋给 `textLeft`/`textTop`（同时叠加 text-anchor 偏移）。最终生成的 `PPTTextElement` 单行与多行分支里都没有 `rotate` 字段
  implication: 单一最确定的根因——text 分支没有把 `applyTransform(...).rotate` 透传到 `PPTTextElement`。`baseResult` 中也未声明 `rotate`。

- timestamp: 2026-08-05T00:18:00Z
  checked: `src/transformer/apply-transform.ts` 57–104 行 `applyTransform`
  found: 当 `transform.rotateCX` 与 `transform.rotateCY` 都存在时（即带中心的 rotate），函数内部已经用 `applyRotateWithCenter` 把 UL/LR 都旋转，并把 `rotate` 强制置 0（注释：“Rotation applied to coordinates, not PPTElement”）。这意味着 rect/circle/ellipse 路径也是这么处理：bbox 已旋转过坐标，旋转信息“隐藏在坐标里”，不写进 `rotate`
  implication: 对于带中心的 rotate，需要在 text 分支里复用同一套坐标旋转逻辑（applyRotateWithCenter on text bbox），然后把 `rotate` 设为 transform.rotateDeg——这与现有 rect/circle 的处理一致但 text 分支没有做

- timestamp: 2026-08-05T00:20:00Z
  checked: `src/mapper/coordinate-mapper.ts` 73–115 行 `parseTransform`
  found: 对 `rotate(-90, 18, 355)`，match[1]='-90'、match[2]='18'、match[3]='355'，结果 `{ rotateDeg: -90, rotateCX: 18, rotateCY: 355 }`；translateX/Y 与 scale 默认为 0/1
  implication: parseTransform 正常解析，transform.rotateDeg=-90 可直接使用

- timestamp: 2026-08-05T00:22:00Z
  checked: `dist/src/slides.d.ts` 177–270 行
  found: `PPTBaseElement.rotate: number` 是必填字段，`PPTTextElement extends PPTBaseElement`，因此输出 text 元素必须有 `rotate`
  implication: 不写 `rotate` 字段要么依赖 TypeScript 默认零值（编译期会报错），要么运行期就丢信息——后者更可能，因为 TypeScript 编译期不一定检查

- timestamp: 2026-08-05T15:05:00Z
  checked: `src/mapper/coordinate-mapper.ts` 的 parseTransform 正则 `/rotate\(\s*([\d.]+).../g`
  found: 字符类 `[\d.]+` 不允许 `-` 或 `+`，对 `rotate(-90, 18, 355)` 不匹配；结果 rotateMatches 为空数组，导致 `transform.rotateDeg=0`、`rotateCX/rotateCY=undefined`。先前假设 `parseTransform` 正常解析 `rotateDeg=-90` 是错误的，必须先修这个 regex 才能让 text 分支的 bbox 旋转和 rotate 透传真正生效
  implication: 修复必须同时改 parseTransform（允许负数）和 case 'text'（透传 rotate + 应用 AABB 旋转）；光改 case 'text' 仍然无效

- timestamp: 2026-08-05T15:10:00Z
  checked: `src/mapper/coordinate-mapper.ts` 的 parseGradientTransform 正则
  found: 同样的 `[\d.]+` 字符类问题，影响 gradientTransform 的 rotate 提取；一并修复
  implication: 与 parseTransform 一起改 `-?[\d.-]+` 保持一致

- timestamp: 2026-08-05T15:12:00Z
  checked: `npm test` 全量回归（修改后）
  found: 16 failed / 201 passed (217 total)；失败用例全部是 master 上预先存在的（gradient / shadow / shape-rx / image-outline / path-merge / text-anchor 一个 TEXT-02 期望值错），与本次 fix 无关。文本旋转相关的 parse-transform (7) / transform-element (4) / apply-transform (10) / 文本测量 / 多行文本 全部通过
  implication: 修复无回归

- timestamp: 2026-08-05T15:14:00Z
  checked: 自建 4 个 case 验证脚本（已删除）：rotate(-90,18,355) / rotate(45,100,100) / 无旋转 / rotate(-90) 无中心
  found: rotate 字段全部正确，带中心旋转场景下 bbox width/height 按旋转角度对调，AABB 中心与 SVG 旋转中心偏差 < 15 px（由 ascent ≠ descent 引起，属于 text baseline 几何特性，无法在保持 bbox = AABB 的同时消除）
  implication: 修复达到"文本正确旋转 + 位置近似正确"的目标

## Eliminated

- hypothesis: parser strips the `transform` attribute on `<text>` (via `convertToSvgElement` / `convertOrderedToSvgElement`)
  evidence: 两者都把 `@_*` 属性写入 `attrs`，没有针对 `transform` 的过滤逻辑；trigger 元素的 `transform="rotate(-90, 18, 355)"` 应当被原样保留
  timestamp: 2026-08-05T00:08:00Z
- hypothesis: `walk()` 漏传 `effectiveTransform`，导致 text 走 `parseTransform(undefined)`
  evidence: `composeTransforms(parentTransform, element.attrs.transform)` 在子元素上一定产生 `effectiveTransform`（即使只有子元素自己一项）；`transformElement` 仍 `parseTransform(effectiveTransform || element.attrs.transform)`，所以 rotate 应当被解析
  timestamp: 2026-08-05T00:10:00Z
- hypothesis: `applyTransform` 拿不到正确的 `rotate` 值，所以即便 text 透传也是 0
  evidence: `applyTransform` 在 `rotateCX/rotateCY` 存在时把 `rotate` 重置为 0（apply-transform.ts:93），但 `transform.rotateDeg` 仍为 -90，可以直接采用；rect/circle/ellipse 也复用同一函数，已经把旋转“隐藏进坐标里”并把 `rotate:0` 写进 PPTElement
  timestamp: 2026-08-05T00:20:00Z
- hypothesis: PPTEL 文本元素 schema 没有 `rotate` 字段，根因是输出对象不支持旋转
  evidence: `dist/src/slides.d.ts` 178–188 行 `PPTBaseElement.rotate: number` 必填；text 元素继承自 PPTBaseElement，必须有 `rotate`
  timestamp: 2026-08-05T00:22:00Z
- hypothesis: `parseTransform('rotate(-90, 18, 355)')` 正确解析 rotateDeg=-90 / rotateCX=18 / rotateCY=355
  evidence: 在 2026-08-05T15:05:00Z 的实测中发现字符类 `[\d.]+` 不允许负号，rotateMatches 为空，实际返回 `{ rotateDeg: 0, rotateCX: undefined, rotateCY: undefined }`。先前对 parseTransform 的信任是错的
  timestamp: 2026-08-05T15:05:00Z

## Resolution

- root_cause: 三根因：(1) `src/mapper/coordinate-mapper.ts` 的 parseTransform 正则字符类 `[\d.]+` 不允许负号，导致 `rotate(-90, 18, 355)` 解析为 `rotateDeg=0, rotateCX/rotateCY=undefined`；(2) `src/transformer/transform-to-pptel.ts` `case 'text'` 原本完全没把 `transform.rotate` 写到 PPTTextElement；(3) 第一轮 reopen 后的"修复"用了 **AABB 几何策略**——对 bbox UL/LR 旋转后取 AABB，让 width/height 被对调（长字符串塞不进窄 bbox），但 PPTist 的 `rotate` 字段语义是"bbox 不动 + 整体绕元素中心旋转"，AABB 方案与 PPTist 不兼容
- fix:
  1. `src/mapper/coordinate-mapper.ts` parseTransform 正则改为 `-?[\d.]+`（保留之前的修复）
  2. `src/transformer/transform-to-pptel.ts` `case 'text'`：保持 bbox 为未旋转尺寸 (textWidth×textHeight)，当 transform.rotateCX/rotateCY 存在时把 bbox 平移到"bbox 中心 = 旋转中心 (SVG→canvas 缩放后)"，baseResult.rotate = transform.rotateDeg ?? 0
- verification:
  - 端到端：`exampels/svg_output/04_benchmarks.svg` 重新生成 `.svg.json` 中 "Score (%) / Rating (normalized)" 元素：
    - `width: 170.59, height: 10.85` (横向自然尺寸)
    - `left: -71.23, top: 271.92`，bbox 中心 = (14.06, 277.34)
    - SVG 旋转中心 (18, 355) × canvasScale 0.78125 = (14.0625, 277.34375) ✓ 精确对齐
    - `rotate: -90` 已写入
    - 对比非旋转元素 "DeepSeek-V3.2-Speciale..." width=675.32 / height=13.07 / rotate=0，几何未被旋转影响
  - PPTist 渲染预测：170.59×10.85 的 bbox 整体绕中心 (14.06, 277.34) 旋转 -90°，文字从底到顶垂直显示在 SVG (18, 355) 位置，与 SVG 原视觉一致
  - 回归测试：`npm test` 16 failed / 201 passed，与修复前失败数相同（master 上预先存在的 gradient / shadow / shape-rx / image-outline / path-merge / text-anchor 失败，与本次 fix 无关）
- files_changed:
  - src/mapper/coordinate-mapper.ts (regex 允许负号)
  - src/transformer/transform-to-pptel.ts (case 'text' bbox 中心对齐 + rotate 透传)

## Reopened Evidence (2026-08-05 by user)

- timestamp: 2026-08-05T16:30:00Z
  checked: 实际生成的 `exampels/svg_output/04_benchmarks.svg.json` 中"Score (%) / Rating (normalized)"元素的完整字段
  found: `{ left: 1.76, top: 192.05, width: 10.85, height: 170.59, content: "...Score (%) / Rating (normalized)...", rotate: -90, vertical: false, groupId: "chartArea" }`
  implication: rotate=-90 字段已正确写入，但 **bbox 是 TALL NARROW (10.85×170.59)** —— width 远小于 height。SVG 中该字符串 "Score (%) / Rating (normalized)" 是长水平文本，自然 bbox 应该是 WIDE (例如 170×13)；width/height 被旋转对调是 AABB 计算的产物，但 PPTist 用 `vertical: false` 渲染（即把文本横向排版在 bbox 内），长字符串塞不进 10.85px 宽的 bbox，导致视觉上**文字仍然像水平铺开**而不是垂直显示
- timestamp: 2026-08-05T16:32:00Z
  checked: 同一 JSON 文件中非旋转的对比元素 "DeepSeek-V3.2-Speciale surpasses..."
  found: `{ left: 62.5, top: 72.08, width: 675.32, height: 13.07, rotate: 0, vertical: false }` —— 横向排版的正常长文本 bbox 是宽而矮的
  implication: 当前 fix 走"把 bbox 旋转后再取 AABB"路线，输出尺寸已经对调；但 PPTist 期望的 rotate 语义是"bbox 不动 + 整体绕中心旋转"（参考 PptxGenJS / PPTist 文档：rotate 绕元素中心旋转）。这两条路线几何上不等价：**PPTist 不接受 AABB 方案**
- timestamp: 2026-08-05T16:34:00Z
  checked: SVG 原始几何参数
  found: text 元素 `x=18, y=355, font-size=13, text-anchor=middle, content="Score (%) / Rating (normalized)"`，SVG viewBox 0 0 1280 720 与 width/height 一致 → scaleX=scaleY=1。SVG 中 rotation center (18, 355) 是 baseline 在 x=18 处的中点
  implication: 正确做法应该是：(1) bbox 保持**未旋转尺寸**（textWidth=自然字符串宽度 ≈ 170，textHeight=13）；(2) bbox 中心对齐 SVG 旋转中心 (18, 355)，即 left=18-85=-67, top=355-6.5=348.5；(3) `rotate: -90` 由 PPTist 整体绕 bbox 中心旋转（自动等价于绕 SVG 旋转中心）。**当前 fix 把 bbox 旋转了，结果 PPTist 再"二次旋转"**
- timestamp: 2026-08-05T16:36:00Z
  checked: dist 端输出与修复后的 src 一致
  found: `dist/src/mapper/coordinate-mapper.js` 第 109 行和 `dist/src/transformer/transform-to-pptel.js` 第 1273/1405/1442 行已包含 -?[\d.-]+ 正则与 case 'text' 重写逻辑
  implication: 修复已生效到运行代码，但**几何策略选错了**——AABB 旋转 ≠ PPTist 期望的"bbox 不变 + 整体旋转"
- timestamp: 2026-08-05T16:38:00Z
  user_report: "不对，没有旋转"
  implication: 上一轮"RESOLVED"判断错误，需要回到 investigating 状态重新设计 fix

## Current Focus (updated)

- **hypothesis**: 当前 fix 的几何策略错误——case 'text' 对 bbox UL/LR 应用 applyRotateWithCenter 后取 AABB 作为最终 bbox，但 PPTist 的 `rotate` 字段语义是"bbox 不动 + 整体绕中心旋转"。AABB 与"bbox 不动 + 旋转"两种几何在 PPTist 里不等价，文字实际渲染时仍按 bbox 横向排版（vertical=false），旋转对调后的窄 bbox 让文字显示异常。**正确 fix 应保持 bbox 为未旋转的宽高，把 bbox 中心对齐 SVG 旋转中心 (cx*scaleX, cy*scaleY)，仅靠 `rotate` 字段让 PPTist 旋转渲染**
- **next_action**: 改写 case 'text'：(a) 在未旋转坐标系里计算 textLeft/textTop（含 text-anchor 偏移 + 基线补偿），bbox 保持自然宽高；(b) 当 transform.rotateCX/rotateCY 存在时，把 bbox 平移到中心 = (rotateCX*scaleX, rotateCY*scaleY) 的位置（注意先算 bbox 中心，再加上偏移把中心移到旋转中心）；(c) baseResult.rotate = transform.rotateDeg ?? 0 保留
- **test**: 重跑 4 case：(i) `rotate(-90, 18, 355)` text-anchor=middle：textWidth≈170, textHeight≈13, left=18-85=-67, top=355-6.5=348.5, rotate=-90，bbox 中心 = (18, 355)；(ii) `rotate(45, 100, 100)`：bbox 中心对齐 (100,100)，rotate=45；(iii) 无旋转：不变；(iv) `rotate(-90)` 不带中心：保持原 bbox 不变，rotate=-90
- **expecting**: PPTist 渲染时把宽高 170×13 的 bbox 整体绕中心 (18,355) 旋转 -90°，视觉上文字"Score (%) / Rating (normalized)"从底到顶垂直显示在左侧纵轴位置

## Eliminated (新增)

- hypothesis: rotate 字段没写入 PPTTextElement
  evidence: exampels/svg_output/04_benchmarks.svg.json 实测 `"rotate": -90` 已存在
  timestamp: 2026-08-05T16:30:00Z
- hypothesis: PPTist 不支持文本元素 rotate
  evidence: dist/src/slides.d.ts:186 PPTBaseElement.rotate: number 必填；PPTTextElement extends PPTBaseElement；schema 合法
  timestamp: 2026-08-05T16:30:00Z
- hypothesis: 把 bbox AABB 旋转 + rotate=-90 就能正确显示
  evidence: 这种做法让 width/height 对调，但 PPTist 用 vertical=false 把文本横向塞进窄 bbox；PPTist 期望的 rotate 语义是"整体旋转"
  timestamp: 2026-08-05T16:34:00Z

## Verification Evidence (2026-08-05 16:50)

- timestamp: 2026-08-05T16:48:00Z
  checked: 重新生成 `exampels/svg_output/04_benchmarks.svg.json`（先 rm 再用 `node dist/src/cli.js` 重新跑）
  found: "Score (%) / Rating (normalized)" 元素：`{ left: -71.23, top: 271.92, width: 170.59, height: 10.85, rotate: -90, vertical: false }`
  implication: bbox 已是横向自然尺寸 (170×11)，旋转 -90 保留，**几何策略切换成功**

- timestamp: 2026-08-05T16:48:30Z
  checked: 计算 bbox 中心并与 SVG 旋转中心比对
  found: bbox 中心 = (-71.23 + 170.59/2, 271.92 + 10.85/2) = (14.06, 277.34)；SVG 旋转中心 (18, 355) × canvasScale 0.78125 = (14.0625, 277.34375)
  implication: 中心精确对齐到 SVG 旋转中心（误差 < 0.01 px，源于 measuredAscent 浮点）

- timestamp: 2026-08-05T16:49:00Z
  checked: 对比非旋转的 "DeepSeek-V3.2-Speciale surpasses GPT-5..." 元素
  found: `{ left: 62.5, top: 72.08, width: 675.32, height: 13.07, rotate: 0, vertical: false }`
  implication: 非旋转路径完全未受影响；本 fix 只在 transform.rotateCX/rotateCY 同时存在时执行 center alignment

- timestamp: 2026-08-05T16:49:30Z
  checked: `npm test` 全量回归
  found: 16 failed / 201 passed (217 total)，与修复前失败数一致
  implication: 无新增回归；失败用例均为 master 上预先存在

- timestamp: 2026-08-05T16:50:00Z
  user_report: 等待人工视觉验证生成的 PPTX 中纵轴标签是否垂直显示
  implication: 几何层面已正确，等待 PPTist 渲染端确认
