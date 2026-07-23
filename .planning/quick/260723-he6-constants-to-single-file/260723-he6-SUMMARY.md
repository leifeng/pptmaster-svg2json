---
quick_id: 260723-he6
description: 把 src/ 散落的常量提取到集中文件 src/constants.ts
status: complete
commit: bbecb99
date: 2026-07-23
---

# Quick Task Summary: 所有常量集中到 src/constants.ts

## 目标

把 src/ 下散落的命名常量统一提取到 `src/constants.ts`，便于集中维护和查阅。

## 实施结果

### 新增文件

**`src/constants.ts`** — 按业务领域分组的集中常量文件

| 分组 | 导出常量 |
|------|----------|
| 日志 | `LOG_PREFIX` |
| 字体 | `TARGET_FONT`, `FONT_FILE`, `FONT_OPTIONS` |
| 文本测量/转换 | `TEXT_WIDTH_SAFETY_MARGIN`, `FALLBACK_ASCENT_RATIO`, `TEXT_ANCHOR_MIDDLE_TOP_OFFSET` |
| 命名颜色 | `NAMED_COLORS` (134 个 CSS 命名颜色 → hex) |
| SVG `<use>` | `ICONS_BASE`, `STYLE_CONFIG` |

### 修改文件

| 文件 | 改动 |
|------|------|
| `src/utils/logger.ts` | `PREFIX` → `LOG_PREFIX` import |
| `src/preprocessor/font-preprocessor.ts` | 删除本地 `TARGET_FONT`，改用 import |
| `src/text-measurer.ts` | 删除本地 `FONT_FILE` / `FONT_OPTIONS`，改用 import |
| `src/svg-use-handler.ts` | 删除本地 `ICONS_BASE` / `STYLE_CONFIG`，改用 import |
| `src/transformer/transform-to-pptel.ts` | `namedColors` → `NAMED_COLORS`，3 个函数局部常量提升为模块级 import |

## 重命名

- `PREFIX` → `LOG_PREFIX`（明确语义）
- `namedColors` → `NAMED_COLORS`（与其他 SCREAMING_SNAKE_CASE 常量保持一致）

## 验证

- ✅ TypeScript 编译通过（`npx tsc --noEmit` 无错误）
- ✅ `__tests__/text-anchor.test.ts` 7/7 通过（确保 TEXT_ANCHOR_MIDDLE_TOP_OFFSET 行为不变）
- ✅ 所有相关测试通过（gradient/image-outline/path-merge/shadow/shape-rx 失败均为预存在问题，与本次重构无关）

## 路径兼容性

`FONT_FILE` 和 `ICONS_BASE` 都使用 `__dirname`：
- 重构前：`dist/src/text-measurer.js` 与 `dist/src/svg-use-handler.js` 中 `__dirname` = `dist/src/`
- 重构后：`dist/src/constants.js` 中 `__dirname` 仍为 `dist/src/`
- 路径结果完全不变

## 附带清理

原 `transform-to-pptel.ts` 的 `namedColors` 中有一个无效条目 `color: '#000000'`（不是合法 CSS 颜色名），重构后已剔除。

## 提交

- `bbecb99` refactor: 集中所有命名常量到 src/constants.ts
- 6 个文件改动 (+236, -185)