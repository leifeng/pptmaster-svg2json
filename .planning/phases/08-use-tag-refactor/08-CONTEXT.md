# Phase 08: Use Tag Refactor — Context

**Phase:** 08
**Name:** use-tag-refactor
**Goal:** 将 SVG `<use>` 标签处理逻辑提取到独立模块，并增强支持外部 SVG 文件引用
**Status:** Ready for planning

---

## Background

当前 `svg-parser.ts` 中 `autoEmbedIcons` 函数（631-775行）负责处理 `<use data-icon="library/name">` 模式的图标嵌入。

用户新需求：
1. 将 `autoEmbedIcons` 提取为独立模块
2. 支持 `<use href="external.svg">` 模式 — 将外部 SVG 渲染为 PNG 并以 `<image>` 元素回填

---

## Technical Context

### 现有实现
- `src/parser/svg-parser.ts` 包含 `autoEmbedIcons` 函数
- 图标库路径：`templates/icons/` 目录
- 支持的图标风格：chunk-filled, tabler-filled, tabler-outline, phosphor-duotone, simple-icons
- 使用 `data-icon` 属性标识

### 关键依赖
- `@resvg/resvg-js` — 已在 text-measurer.ts 中集成用于文本测量
- `fast-xml-parser` — SVG 解析
- `os.tmpdir()` — 临时文件存储

### SVG use 标签两种模式

**模式 1：data-icon 嵌入（已有）**
```xml
<use data-icon="tabler-outline/home" x="100" y="100" width="24" height="24" fill="#000000"/>
```
处理方式：读取 `templates/icons/tabler-outline/home.svg`，提取 `<path>` 元素，替换 `<use>` 标签

**模式 2：href 外部引用（新增）**
```xml
<use href="icon.svg" x="100" y="100" width="24" height="24"/>
```
处理方式：
1. 读取外部 SVG 文件
2. 用 resvg-js 渲染为 PNG
3. 生成 base64 编码的 `<image>` 元素
4. 替换 `<use>` 标签

---

## Decisions

### USE-01: 模块提取
将 `autoEmbedIcons` 从 `svg-parser.ts` 提取到 `src/svg-use-handler.ts`

### USE-02: 外部 SVG 渲染
使用 @resvg/resvg-js 将外部 SVG 渲染为 PNG，转为 base64 后以 `<image>` 元素回填

### USE-03: 路径解析
外部 SVG 路径相对于主 SVG 文件位置解析（需要传递 svgFilePath 给 parseSvg）

---

## Files to Modify

| File | Change |
|------|--------|
| `src/svg-use-handler.ts` | 新建 — 提取 autoEmbedIcons + 新增 href 处理 |
| `src/parser/svg-parser.ts` | 删除 autoEmbedIcons，保留 import |
| `src/index.ts` | 可能需要更新 convert() 签名 |

---

## Constraints

1. 不破坏现有 data-icon 功能
2. 渲染失败时 graceful degradation
3. 保持与现有测试兼容
