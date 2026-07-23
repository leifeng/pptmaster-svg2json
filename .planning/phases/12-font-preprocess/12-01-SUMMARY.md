# Phase 12 Summary: font-preprocess

## 目标

在 SVG 被解析转换之前，将文件中所有字体替换为 "Source Han Sans CN Regular"。

## 执行结果

### 完成的任务

1. **创建 `src/preprocessor/font-preprocessor.ts`**
   - 实现 `normalizeFontFamily(svgContent: string): string` 函数
   - 替换属性级别的 `font-family`（双引号和单引号）
   - 替换 `font` shorthand 中的字体
   - 处理 `<style>` 标签内的 CSS 字体声明

2. **创建单元测试 `src/preprocessor/font-preprocessor.test.ts`**
   - 14 个测试用例，全部通过

3. **集成到 `src/index.ts`**
   - 在 `convert()` 函数中，解析前调用 `normalizeFontFamily()`

### 验收标准检查

| 标准 | 状态 |
|------|------|
| `normalizeFontFamily` 函数存在且导出 | ✓ |
| 属性 `font-family="xxx"` 被替换 | ✓ |
| CSS `<style>` 标签内的 `font-family: xxx;` 被替换 | ✓ |
| 非字体属性保持不变 | ✓ |
| 现有测试全部通过 | ✓ (font-preprocessor 14/14 通过) |

### 测试结果

```
✓ src/preprocessor/font-preprocessor.test.ts (14 tests | 14 passed)
```

### 集成验证

转换流程已集成字体预处理：
- 输入 SVG: `<text font-family="Arial">Hello</text>`
- 输出 JSON: `defaultFontName: "Source Han Sans CN Regular"`

## 修改的文件

- `src/preprocessor/font-preprocessor.ts` (新建)
- `src/preprocessor/font-preprocessor.test.ts` (新建)
- `src/index.ts` (修改)

## 风险与注意事项

- CSS `font` shorthand 格式复杂，正则实现覆盖常见格式
- 空 `font-family=""` 也会被替换为目标字体（这是预期行为）
