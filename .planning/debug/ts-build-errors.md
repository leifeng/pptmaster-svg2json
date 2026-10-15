---
audit_acknowledged:
  milestone: v1.9
  at: 2026-10-15
  status: unknown
---

# TypeScript 构建错误诊断报告

## 概述

**触发条件:** 用户添加日志后运行 `npm run build` 报错
**错误数量:** 9 个 TypeScript 错误，分布在 4 个文件中
**报告时间:** 2026-07-15

---

## Root Cause Analysis（根本原因分析）

### 错误 1: `renderSvgToPng` 不存在

**文件:** `src/index.ts:4`
**错误:** `Module '"./text-measurer"' has no exported member 'renderSvgToPng'`

**根本原因:** `renderSvgToPng` 函数从未存在于 `text-measurer.ts` 中。这是一个**遗留的无效导入**。

**证据:**

```typescript
// src/index.ts:4
import { renderSvgToPng } from './text-measurer'

// src/text-measurer.ts - 导出的函数:
export function buildMeasurementSvg(...)
export async function measureTextBBox(...)
export async function measureTextElement(...)
// 注意: 没有 renderSvgToPng
```

`renderSvgToPng` 在 `index.ts` 第 126 行被调用用于渲染背景图案 PNG，但该函数从未实现。

---

### 错误 2 & 3: `PatternDef` 和 `PatternChild` 类型不存在

**文件:** `src/parser/svg-parser.ts:2`
**错误:**
- `Module '"../types/ast"' has no exported member 'PatternDef'`
- `Module '"../types/ast"' has no exported member 'PatternChild'`

**根本原因:** `src/types/ast.ts` 被修改删除了 `PatternDef` 和 `PatternChild` 类型定义，但 `svg-parser.ts` 仍在使用这些类型。这些类型存在于旧的构建产物中 (`dist/svg2json/types/ast.d.ts`)，表明曾经存在但后来被移除。

**证据:**

```typescript
// src/parser/svg-parser.ts:2 - 正在导入不存在的类型
import { ..., PatternDef, PatternChild } from '../types/ast'

// src/types/ast.ts - 当前内容没有 PatternDef/PatternChild
// 仅有: GradientColorDef, GradientDef, SvgAttrs, SvgElement, SvgParseResult, CoordinateMapping, TransformResult

// dist/svg2json/types/ast.d.ts (旧构建) - 有这些类型
export interface PatternChild {
    type: string;
    attrs: Record<string, any>;
}
export interface PatternDef {
    id: string;
    width: number;
    height: number;
    patternUnits?: string;
    patternContentUnits?: string;
    patternTransform?: string;
    children: PatternChild[];
}
```

---

### 错误 4: `patternRegistry` 属性不存在于 `SvgParseResult`

**文件:** `src/parser/svg-parser.ts:745`
**错误:** `Object literal may only specify known properties, and 'patternRegistry' does not exist in type 'SvgParseResult'`

**根本原因:** `svg-parser.ts` 返回了 `patternRegistry` 属性，但 `SvgParseResult` 接口未定义此属性。`src/index.ts:173` 也引用了 `ast.patternRegistry`。

**证据:**

```typescript
// src/parser/svg-parser.ts:745 - 返回包含 patternRegistry
return {
  root,
  viewBox: [minX, minY, width, height],
  width,
  height,
  patternRegistry,  // <-- SvgParseResult 接口未定义
}

// src/types/ast.ts - SvgParseResult 定义
export interface SvgParseResult {
  root: SvgElement;
  viewBox: [number, number, number, number];
  width: number;
  height: number;
  // 没有 patternRegistry 属性
}

// dist/svg2json/types/ast.d.ts (旧构建) - 有 patternRegistry
export interface SvgParseResult {
    ...
    patternRegistry?: Map<string, PatternDef>;
}
```

---

### 错误 5 & 6: `path-utils` 模块不存在

**文件:** `src/merger/path-merge.ts:8`, `src/transformer/transform-to-pptel.ts:8`
**错误:** `Cannot find module '../utils/path-utils'`

**根本原因:** `src/utils/path-utils.ts` 源文件**从未存在于 git 仓库中**。`dist/src/utils/` 目录也没有被 git 跟踪（`git ls-files dist/src/utils/` 返回空）。当前 `src/utils/` 目录只有 `index.ts` 和 `logger.ts`。

**证据:**

```bash

# src/utils/ 目录内容

$ ls -la src/utils/
index.ts  logger.ts

# 没有 path-utils.ts

# dist/src/utils/ 未被 git 跟踪

$ git ls-files dist/src/utils/
(空)

# 但 dist/src/utils/path-utils.js 存在于文件系统中

$ ls dist/src/utils/
path-utils.js  path-utils.d.ts  path-utils.js.map
```

两个文件都依赖 `path-utils` 中的函数：
- `src/merger/path-merge.ts:8` - 导入 `toAbsolutePath`
- `src/transformer/transform-to-pptel.ts:8` - 导入 `toAbsolutePath` 和 `scalePathCoords`

---

## 修复建议

### 1. 修复 `PatternDef` 和 `PatternChild` 类型缺失

**文件:** `src/types/ast.ts`

在 `GradientDef` 接口后添加：

```typescript
export interface PatternChild {
  type: string;
  attrs: Record<string, any>;
}

export interface PatternDef {
  id: string;
  width: number;
  height: number;
  patternUnits?: string;
  patternContentUnits?: string;
  patternTransform?: string;
  children: PatternChild[];
}
```

同时在 `SvgParseResult` 接口中添加 `patternRegistry` 属性：

```typescript
export interface SvgParseResult {
  root: SvgElement;
  viewBox: [number, number, number, number];
  width: number;
  height: number;
  patternRegistry?: Map<string, PatternDef>;  // 添加此行
}
```

### 2. 修复 `path-utils` 模块缺失

**文件:** `src/utils/path-utils.ts`

需要创建该文件，实现以下函数：

```typescript
/**
 * Convert relative path commands to absolute coordinates.
 */
export function toAbsolutePath(d: string): string { ... }

/**
 * Scale path coordinates by scaleX and scaleY factors.
 */
export function scalePathCoords(d: string, scaleX: number, scaleY: number): string { ... }
```

可以从 `dist/src/utils/path-utils.js` 反向编译获取实现（但该文件是构建产物，建议重新实现）。

### 3. 修复 `renderSvgToPng` 无效导入

**文件:** `src/index.ts`

**选项 A:** 如果 `renderBackgroundPatternToPng` 功能不需要，实现为空函数：

```typescript
async function renderBackgroundPatternToPng(...): Promise<string | undefined> {
  return undefined;  // 功能暂未实现
}
```

并移除 `renderSvgToPng` 导入。

**选项 B:** 实现 `renderSvgToPng` 函数（需要调研原有设计意图）。

---

## 总结

| 问题 | 根本原因 | 状态 |
|------|---------|------|
| `renderSvgToPng` 不存在 | 遗留无效导入 | 需决定是否实现或移除 |
| `PatternDef/PatternChild` 缺失 | 类型定义被删除但代码仍使用 | 需添加到 `ast.ts` |
| `patternRegistry` 不存在 | 接口未定义但代码使用 | 需添加到 `SvgParseResult` |
| `path-utils` 模块不存在 | 源文件从未在 git 中 | 需创建完整实现 |

**结论:** 这些错误不是"本次日志改动引入的"，而是**原有代码库的不一致状态**——代码引用了不存在的类型和模块。这可能是由于：
1. 某个开发者删除了 `path-utils.ts` 源文件但没有删除引用
2. `types/ast.ts` 被清理时删除了 `PatternDef` 相关类型但 `svg-parser.ts` 仍在使用
3. `renderSvgToPng` 从未实现但已写在代码中
