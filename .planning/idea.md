# SVG to PPTElement 转换逻辑优化

## 项目背景

**项目名**: svg-to-pptel  
**现有功能**: 将 SVG 文件转换为 PowerPoint 元素 JSON 格式  
**输出画布**: 1000×562.5

## 待解决的问题

### 1. Transform 属性处理不完整

SVG 元素支持 `transform` 属性，包含 `translate`、`rotate`、`scale` 等变换。当前代码（`coordinate-mapper.ts` 中的 `parseTransform`）仅处理了 `translate` 和 `scale`，**没有处理 `rotate` 的旋转中心**。

用户提供的参考实现：

```javascript
function applyTransform(x, y, transform) {
    let tx = 0, ty = 0;
    let sx = 1, sy = 1;
    let angle = 0;
    
    const translateMatch = transform.match(/translate\(([^)]+)\)/);
    if (translateMatch) {
        const parts = translateMatch[1].split(/[\s,]+/);
        tx = parseFloat(parts[0] || 0);
        ty = parseFloat(parts[1] || 0);
    }
    
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
    if (scaleMatch) {
        const parts = scaleMatch[1].split(/[\s,]+/);
        sx = parseFloat(parts[0] || 1);
        sy = parseFloat(parts[1] || sx);
    }
    
    const rotateMatch = transform.match(/rotate\(([^)]+)\)/);
    if (rotateMatch) {
        const parts = rotateMatch[1].split(/[\s,]+/);
        angle = parseFloat(parts[0] || 0) * Math.PI / 180;
    }
    
    // 先平移，再旋转，再缩放（按 SVG 规则）
    let px = x + tx;
    let py = y + ty;
    
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const rx = px * cosA - py * sinA;
    const ry = px * sinA + py * cosA;
    px = rx;
    py = ry;
    
    px = px * sx;
    py = py * sy;
    
    return { x: px, y: py };
}
```

**关键点**:
- `rotate` 变换的旋转中心默认是元素原点 (0,0)，SVG 规范支持 `rotate(deg, cx, cy)` 指定旋转中心
- 变换顺序：translate → rotate → scale（按 SVG 规范）

### 2. Text 元素的 Y 坐标是基线不是顶部

SVG 中 `<text>` 元素的 `y` 属性表示**文本基线（baseline）位置**，不是顶部边界。

当前代码 `transform-to-pptel.ts` 中对 text 的处理：
- `textTop = (coords.top + fontSize * 0.75) * scaleY` — 这个 0.75 的系数是经验值
- 需要更准确地处理 text baseline 到 top 的转换

### 3. 输出画布固定为 1000×562.5

所有坐标转换都基于这个固定画布尺寸，需要确认 scale 计算逻辑正确。

## 期望目标

1. 正确处理 SVG transform 属性（包括旋转中心）
2. 正确处理 text 元素的 baseline y 坐标
3. 确保所有元素在 1000×562.5 画布上位置正确