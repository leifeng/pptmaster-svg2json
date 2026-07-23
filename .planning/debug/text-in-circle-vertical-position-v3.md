# 根因分析报告 v3：文本在圆形内定位不一致（实际是测量字体错配）

## 状态
status: investigated → ready to fix
trigger: "05/06/07 三个 SVG 浏览器视觉一致，JSON 文字相对圆形位置不同"
created: 2026-07-23
supersedes: text-in-circle-vertical-position.md (v1), text-in-circle-vertical-position-v2.md (v2)

---

## 用户反馈

> 05/06/07 三个 SVG 浏览器视觉一致，转换为 JSON 后：
> - 05/07 文字在圆形中下部
> - 06 文字更靠下、贴近圆形下边缘

三个 SVG 的 SVG 源模式相同：`<circle>` + 居中 `<text>数字</text>`，text 相对圆心 y 偏移固定为 6。但 circle/fontSize/font-family 不同。

## 关键证据：测量用了错的字体

| 文件 | SVG 字体 | fontSize | 用 SVG 字体测的 ascent ratio | **用思源测的 ascent ratio** |
|---|---|---|---|---|
| 05 | Georgia 16 | 16 | 0.541 | **0.764** |
| 06 | Arial 13 | 13 | 0.719 | **0.764** |
| 07 | Georgia 16 | 16 | 0.541 | **0.764** |

**思源（Source Han Sans CN Regular）的 ascent ratio 稳定在 0.764**，与 fontSize 无关。但当前 `src/transformer/transform-to-pptel.ts:1653` 把 SVG 原字体传给 `measureTextElement`，而 line 1729 又把 JSON 输出的 `defaultFontName` 硬编码为 `Source Han Sans CN Regular`。两个地方的字体不一致，导致：

1. `textHeight = measured.height * scaleY` 用的是 Georgia/Arial 的高度，但 PPTist 实际用思源渲染，高度不匹配
2. `textTop = transformed.top - fontSize * 0.8 * scaleY` 是按完整 fontSize 算的固定值，跟思源的真实 ascent 12.23/16=0.764 差 0.036，又跟 Georgia 的 0.541 差 0.259

## 根因链

```
SVG 源字体 (Georgia / Arial)
    ↓
[代码 line 1653] 传给 measureTextElement 的 fontFamily = SVG 原字体
    ↓
测量得到 Georgia bbox=6.48×8.65 / Arial bbox=4.09×9.34
    ↓
textHeight 写入 JSON = SVG 字体 bbox 高度
    ↓
[代码 line 1729] JSON 输出 defaultFontName = 'Source Han Sans CN Regular'
    ↓
PPTist 用思源渲染（bbox 应是 2.50×12.23 / 2.03×9.93）
    ↓
JSON 的 bbox 尺寸和位置都是 SVG 字体的，
跟 PPTist 实际渲染的思源不一致 → 视觉错位
```

## 数学验证（dy = textCY − circleCY）

| 文件 | 当前 dy（用 0.8 ratio + SVG 字体） | 修后预期 dy（用思源测量） |
|---|---|---|
| 05 | **−1.93** | **−0.09** |
| 06 | **+0.21** | **+0.81** |
| 07 | **−1.93** | **−0.09** |

修复后三个文件 dy 都在 −0.1 ~ +0.9 之间，**0.9 单位的极小差异来自设计师手工 baseline 偏移**（SVG 中 text y = circle cy + 6 是个补偿值，6 是 Georgia 16 的视觉中心补偿量，对 Arial 13 来说略大但还在可接受范围）。

之前 v1 文档建议"用 measured.y 替代 0.8"——这个方向对了一半，**但仍是用 SVG 原字体的 measured.y**，不是思源的 measured.y。Georgia 16 的真实 ascent 只有 8.65，按这个算出来 textTop 比思源应该的位置还要高 3.24 units。所以单纯换 measured.y 不足以解决问题。

v2 文档发现"用了 measured.y 后仍有 2.45 unit 偏差"，**正是因为测量字体错配**——v2 用的 ascent 是 Arial 13 在 SVG 字体下的 9.34，但实际渲染字体思源的 ascent 是 9.93。

## 修复方案

修改 `src/transformer/transform-to-pptel.ts:1651-1671`：

```typescript
const measurementInput: TextMeasurementInput = {
  content,
  fontFamily: 'Source Han Sans CN Regular', // 与 defaultFontName 一致
  fontSize,
  fontWeight: isBold ? 'bold' : 'normal',
  fontStyle: isItalic ? 'italic' : 'normal',
  letterSpacing,
  fill: fillColor,
  textAnchor: textAnchorAttr,
  x: xAttr,
}
const measured = await measureTextElement(measurementInput)
const TEXT_WIDTH_SAFETY_MARGIN = 25
textWidth = measured.width * scaleX + TEXT_WIDTH_SAFETY_MARGIN
textHeight = measured.height * scaleY
// 用思源的真实 measured ascent
textTop = transformed.top - (fontSize - measured.y) * scaleY
```

修改两处：
1. line 1653：`fontFamily` 从 SVG 原字体改成 `'Source Han Sans CN Regular'`
2. line 1671：用 `fontSize - measured.y` 替代 `fontSize * ASCENT_RATIO`

fallback 分支（line 1678）也应该用 `Source Han Sans CN Regular` 风格的 ascent ratio（约 0.76 而不是 0.8）。

## 风险评估

- **现有 JSON 影响**：所有用 SVG 原字体（Georgia/Arial）测量的 JSON 都会变化。`textHeight` 会变大（思源的 "1" 比 Georgia/Arial 的 "1" 更高），`textTop` 会跟着调整
- **width 影响**：`textWidth` 也用思源测量，可能会比之前略小（思源 1 的字宽 2.50 vs Georgia 6.48），但因为 `TEXT_WIDTH_SAFETY_MARGIN = 25` 加了安全边距，PPTist 不会截断
- **multiline tspan 路径**：line 1758 的 `fontFamily` 也传给 `extractTspansWithPosition`，需要同步检查这个函数是否测量用同字体

## 下一步

1. 改 line 1653、1671、1678
2. 重新 build（`npm run build`）
3. 重新转换 05/06/07 三个 SVG，对比修复前后的 dy
4. 检查所有 16 个 SVG 转换结果，扫描有没有其他因为字体错配导致的视觉错位
5. 把 textHeight 变化对其他场景的影响做一次回归（比如长段落的换行计算）

## 涉及文件

- `src/transformer/transform-to-pptel.ts` line 1651-1671（测量输入 + textTop 计算）
- `src/transformer/transform-to-pptel.ts` line 1678（fallback 分支）
- `src/transformer/transform-to-pptel.ts` line 1758（multiline 路径，传递 fontFamily 给 tspan 提取器）
- 也许还有 `src/transformer/transform-to-pptel.ts` 的其他 line 也用 SVG 原字体做测量（待 grep 确认）
