# 根因分析报告：文本在圆形内垂直定位错误

## 现象

- **SVG源文件** (`exampels/ppt169_attention_is_all_you_need/svg_output/06_encoder_decoder.svg`)：
  ```xml
  <circle cx="138" cy="328" r="14" fill="#1A365D"/>
  <text x="138" y="334" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#FFFFFF">1</text>
  ```
  - 圆形中心：(138, 328)
  - 文本baseline：y=334（比圆形中心低6 SVG units，设计师有意设置的视觉居中偏移）

- **浏览器显示**：文本"1"正确显示在圆形中间

- **JSON转换后**：
  ```json
  {
    "type": "shape",  // 圆形
    "left": 96.875, "top": 245.3125,
    "width": 21.875, "height": 21.875
  },
  {
    "type": "text",   // 文本
    "left": 103.9125, "top": 252.8125,
    "width": 7.8, "height": 10.15625
  }
  ```
  - 圆形中心：256.25 (canvas坐标)
  - 文本中心：257.89 (canvas坐标)
  - **偏差：1.64 canvas units（文本偏低）**

---

## 假设验证

### 假设1：坐标转换比例错误
- **验证**：scaleX = scaleY = 1000/1280 = 562.5/720 = 0.78125，计算正确
- **结论**：排除

### 假设2：text-anchor处理导致位置偏移
- **验证**：text-anchor="middle" 的处理逻辑正确（left = x - width/2）
- **结论**：排除

### 假设3：ascent ratio不正确
- **验证**：通过resvg实际测量Arial字体的ascent
  ```
  fontSize=13: measured.y=3.65625, ascent=9.34375, ratio=0.7188
  fontSize=20: measured.y=5.68359, ascent=14.3164, ratio=0.7158
  fontSize=36: measured.y=10.23047, ascent=25.7695, ratio=0.7158
  ```
- **发现**：代码使用固定 ASCENT_RATIO = 0.8，但实际Arial字体ratio约为0.72
- **结论**：确认是根因

---

## 根本原因

`src/transformer/transform-to-pptel.ts` 第1304行：

```typescript
// FIX: Use fixed 0.8 ascent ratio instead of measured.y (which varies by glyph shape)
// This ensures same y coordinate → same textTop regardless of content
const ASCENT_RATIO = 0.8
textTop = transformed.top - fontSize * ASCENT_RATIO * scaleY
```

**问题分析**：

1. SVG文本的y坐标是**baseline**位置
2. 转换为PPTX的top位置需要减去ascent（从baseline到bounding box顶部的距离）
3. 代码使用固定的0.8 ratio，但Arial字体的实际ascent ratio约为**0.72**
4. 由于0.8 > 0.72，计算出的ascent偏大，导致textTop偏小（文本偏低）

**数学验证**：
```
canvasBaselineY = 334 * 0.78125 = 260.9375

当前(错误):
textTop = 260.9375 - 13 * 0.8 * 0.78125 = 252.8125
文本中心 = 252.8125 + 10.15625/2 = 257.89

修正后:
textTop = 260.9375 - 13 * 0.71875 * 0.78125 = 253.51
文本中心 = 253.51 + 10.15625/2 = 258.59 (更接近圆形中心256.25)
```

**额外问题**：
- `measureTextElement()` 返回的 `{ width, height, y }` 中包含 `bbox.y`（bounding box顶部位置）
- 但这个值在计算textTop时**完全没有被使用**，被忽略了

---

## 修复建议

### 方案1（推荐）：使用measured.y计算实际ascent

修改 `src/transformer/transform-to-pptel.ts` 第1296-1305行：

```typescript
// SVG text y is baseline; use measured bbox.y for accurate ascent
// measured.y is the top of the bounding box (in fontSize units)
// ascent = baseline_y - bbox_y
const measuredAscent = fontSize - measured.y
textTop = transformed.top - measuredAscent * scaleY
```

**优点**：精确使用实际测量的ascent值

### 方案2：使用更接近实际的固定ratio

如果暂时不想修改测量逻辑，可以使用更接近实际的固定值：

```typescript
const ASCENT_RATIO = 0.72  // 更接近Arial的实际ascent ratio
```

**缺点**：仍然是近似值，不同字体可能有差异

---

## 修复验证

1. 重新转换 SVG 文件
2. 检查 JSON 中圆形和文本的相对位置
3. 预期：文本中心应该更接近圆形中心（偏差从1.64减少到<0.5 canvas units）

---

## 涉及文件

- `src/transformer/transform-to-pptel.ts` (第1300-1305行)
