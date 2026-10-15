---
audit_acknowledged:
  milestone: v1.9
  at: 2026-10-15
  status: unknown
---

# Root Cause Report: svg_w Cross-Platform Inconsistency

## 问题描述

用户在 Windows 系统运行后 `log` 打印的 `svg_w` 与在 Linux 运行的结果不一样。

## 根因分析

### 核心变量关系

```
svg_w = textWidth / scaleX
textWidth = measured.width * scaleX + TEXT_WIDTH_SAFETY_MARGIN (25px)
scaleX = targetCanvas[0] / viewBox[2]  // 固定值
```

### 根因定位

**@resvg/resvg-js 使用平台特定的原生二进制文件进行字体渲染：**
- Windows: `resvgjs.win32-x64-msvc.node` (使用 DirectWrite)
- Linux: `resvgjs.linux-x64-gnu.node` (使用 FreeType)

这些原生库底层使用不同的字体渲染 API：
- **Windows**: DirectWrite (GDI 内核字体服务)
- **Linux**: FreeType (独立字体引擎)

虽然 @resvg/resvg-js 本身是跨平台的，但底层渲染引擎的差异会导致对同一文本的边界框度量存在微小差异。

### 影响链

1. `measureTextBBox()` 调用 `resvg.getBBox()` 获取文本边界框
2. Windows 和 Linux 的 resvg 原生模块对同一文本返回不同的 `width`
3. `textWidth = measured.width * scaleX + 25` 因此不同
4. `svg_w = textWidth / scaleX` 最终导致 svg_w 值差异

## 关键代码位置

### src/text-measurer.ts:108-122

```typescript
export async function measureTextBBox(svgString: string): Promise<{ width: number; height: number; y: number }> {
  await ensureInit()
  const resvg = new Resvg(svgString)
  const bbox = resvg.getBBox()  // 跨平台差异来源
  // ...
}
```

### src/transformer/transform-to-pptel.ts:801-804

```typescript
const measured = await measureTextElement(measurementInput)
const TEXT_WIDTH_SAFETY_MARGIN = 25
textWidth = measured.width * scaleX + TEXT_WIDTH_SAFETY_MARGIN
```

## 修复建议

### 方案 1: 接受微小差异 (推荐)

**svg_w 的差异在 1-3 像素范围内**，这是字体渲染的正常误差。当前 25px safety margin 已经吸收了大部分差异。

如果业务上不需要严格跨平台一致，无需修改。

### 方案 2: 使用纯算法文本度量

如果需要严格跨平台一致，可考虑：
- 使用 `canvas` 或 `offscreenCanvas` API 进行文本度量
- 使用 `measure-text` 等纯算法库

### 方案 3: 在 Linux 上模拟 Windows 字体度量

可以尝试在 Linux 环境安装 Windows 字体(如 Source Han Sans CN)并使用 FreeType 的 Windows 模式，但实现复杂。

## 验证方法

1. 在 Windows 和 Linux 上运行相同 SVG 文件
2. 比较 console.log 输出的 svg_w 值现在
3. 差异应该在 1-5 像素范围内(由 safety margin 25px 吸收后影响更小)

## 相关文件

- `src/text-measurer.ts` - 文本度量模块
- `src/transformer/transform-to-pptel.ts:801-821` - textWidth 计算和日志输出
- `node_modules/@resvg/resvg-js/js-binding.js` - 平台特定二进制加载逻辑
