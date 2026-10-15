---
audit_acknowledged:
  milestone: v1.9
  at: 2026-10-15
  status: unknown
---

# 调试报告：文本在圆形内垂直定位仍然偏低 v2

## 状态

status: investigating
trigger: "JSON 输出显示修复后 textTop=253.625，但圆形中心 y=256.25，文本中心 y=258.70，仍然偏低 2.45 单位"
created: 2026-07-21
updated: 2026-07-21

---

## 当前焦点

hypothesis: "transformed.top 是文本 baseline 的缩放值，但计算 textTop 时使用的 measured.y 来自测量 SVG（baseline 在 y=fontSize），与 transformed.top 坐标不匹配导致偏移"
test: "追踪 transformed.top 和 measured.y 的来源，验证坐标系统是否一致"
expecting: "找到导致 2.45 单位偏差的具体原因"
next_action: "检查 mapCoordinates 对 text 元素返回的 top 值，以及 measured.y 在测量 SVG 中的实际含义"

---

## 已知信息

### SVG 源数据

- Circle: cx=138, cy=328, r=14
- Text: x=138, y=334 (baseline), font-size=13, font-family="Arial", text-anchor="middle"

### 缩放比例

- scale = 0.78125 (1000/1280)

### 转换后的坐标

- Circle 中心: 256.25 (正确)
- Text baseline: 334 * 0.78125 = 260.9375
- Text top (当前): 253.625
- Text height: 10.15625
- Text 中心: 253.625 + 10.15625/2 = 258.70
- **偏差: 2.45 canvas units（文本偏低）**

### 预期值

- 要使文本中心在 256.25，textTop 应为: 256.25 - 10.15625/2 = 251.17
- 当前 textTop = 253.625，比预期低 2.455 units

---

## 证据

### 证据 1: mapCoordinates 对 text 元素的处理

timestamp: 2026-07-21
checked: "src/mapper/coordinate-mapper.ts 第 395-402 行"
found: "text 元素的 top = attrs.y（SVG text 的 baseline y 值）"
implication: "transformed.top = 334 * 0.78125 = 260.9375，这是 baseline 的缩放值，不是 bounding box top"

### 证据 2: buildMeasurementSvg 的 baseline 位置

timestamp: 2026-07-21
checked: "src/text-measurer.ts 第 79-80 行"
found: "测量 SVG 中 text y=\"${fontSize}\"（即 baseline 在 y=13），不是 y=334"
implication: "measured.y = 3.65625 是相对于测量 SVG 的 baseline（y=13）而言的"

### 证据 3: 实际测量结果

timestamp: 2026-07-21
checked: "resvg.getBBox() 返回值"
found: "bbox.y = 3.65625, bbox.height = 9.34375"
implication: "ascent = fontSize - measured.y = 13 - 3.65625 = 9.34375（SVG units）"

### 证据 4: textTop 计算验证

timestamp: 2026-07-21
checked: "手动计算 textTop"
found: "textTop = 334 * 0.78125 - 9.34375 * 0.78125 = 260.9375 - 7.2998 = 253.6377"
implication: "计算结果 253.6377 与用户报告的 253.625 接近（差 0.0127，可能是浮点精度）"

### 证据 5: 期望的 textTop

timestamp: 2026-07-21
checked: "要使文本中心在 circle 中心"
found: "期望 textTop = 256.25 - 10.15625/2 = 251.17"
implication: "当前 textTop = 253.64 比期望值低 2.47"

---

## 问题分析

### 根本原因

**问题在于：SVG 设计师故意将文本 baseline 放在低于视觉中心的位置，以实现"视觉居中"**

在 SVG 中：
- Circle 中心 y = 328
- Text baseline y = 334（低 6 SVG units）
- 这 6 units 的差异是因为 Arial 字体的 ascent 大约为 9.34，descent 约为 3.66
- 文本的"视觉中心"大约在 baseline - ascent/2 = 334 - 4.67 = 329.33
- Circle 中心是 328，所以文本视觉中心比圆心低约 1.33 SVG units

转换到 canvas 后：
- Circle 中心 = 256.25
- Text baseline = 260.94
- Text 视觉中心 ≈ 256.28（256.25 + 1.03）
- Text 中心（ bounding box）= 258.72

**关键发现：文本的 bounding box 中心（258.72）确实低于 circle 中心（256.25），差 2.47**

这是因为：
1. SVG 中 text baseline y=334 是设计师为了让"数字 1 的视觉中心"对准 circle 中心
2. 但 bounding box 中心 = baseline - ascent/2 = 334 - 9.34/2 = 329.33
3. 转换后：textTop = (334 - 9.34) * 0.78125 = 253.64
4. textCenter = 253.64 + 10.16/2 = 258.72

**所以当前行为是正确的——它保持了 SVG 中的相对定位关系**

### 问题变成了

设计师的意图是让"数字 1 的视觉中心"对准 circle 中心。但转换算法保持的是"文本 bounding box 顶部"的位置关系，这导致：
- SVG 中：文本 baseline 334 比 circle 中心 328 低 6 units
- 转换后：文本 baseline 260.94 比 circle 中心 256.25 低 4.69 units
- 但文本 bounding box 中心 258.72 比 circle 中心 256.25 低 2.47 units

---

## 待验证假设

### 假设 1: PPTist 的 vAlign='middle' 没有正确工作

- 如果 vAlign='middle' 正确工作，PPTile 的 top 应该是 textTop - textHeight/2 = 251.17
- 但当前 textTop = 253.64，导致 vAlign 后的视觉中心偏移

### 假设 2: 应该用不同的方式计算 textTop

- 当前：textTop = transformed.top - measuredAscent * scaleY
- 这保持了 SVG 中 baseline 的相对位置
- 但如果设计师意图是让 bounding box 中心对准 circle 中心，则需要不同公式

---

## 涉及文件

- `src/mapper/coordinate-mapper.ts` (第 395-402 行) - text 元素坐标映射
- `src/text-measurer.ts` (第 79-80 行) - 测量 SVG 生成
- `src/transformer/transform-to-pptel.ts` (第 1258-1313 行) - text 元素转换

---

## 下一步

1. 检查 PPTist 是否正确应用 vAlign='middle'
2. 确认设计师的真实意图：SVG 中文本是否应该"视觉居中"于圆形？
3. 如果是，需要修改算法：textTop = circleCenter - textHeight/2（而不是基于 baseline 计算）
