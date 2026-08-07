---
phase: 13
name: CLI Font Validation
padded: 13
source: user-decisions (AskUserQuestion)
---

# Phase 13 — CLI Font Validation

## Goal

CLI 启动时验证 Source Han Sans CN Regular 字体文件已正确加载到 resvg-js；若字体缺失或加载失败，输出红色错误信息并以 exit 1 退出，防止后续测量使用 resvg 内置 fallback 字体导致宽度偏差。

## User Decisions (via AskUserQuestion)

1. **规划模式**：创建 Phase 13 - CLI 字体验证（完整 phase 流程），不通过 discuss-phase 单独收集设计细节
2. **验证策略**：CLI 启动时**同步**验证 — 在 `cli.ts` 解析参数后、开始处理文件前检查字体；失败立即 exit 1
3. **错误处理**：picocolors 红色错误信息（包含缺失文件路径和修复建议）+ `process.exit(1)`

## Background (codebase facts)

- 字体源：`src/fonts/Source Han Sans CN Regular.ttf` (~1.2 MB) + `.woff2` (~624 KB)
- 字体常量：`src/constants.ts` 中 `FONT_FILE = join(__dirname, 'fonts', 'Source Han Sans CN Regular.ttf')` 和 `FONT_OPTIONS = { font: { fontFiles: [FONT_FILE], loadSystemFonts: false, defaultFontFamily: TARGET_FONT } }`
- 构建脚本：`scripts/copy-fonts.js` 在 `tsc` 后把字体从 `src/fonts/` 复制到 `dist/src/fonts/`
- resvg-js 用法：`src/text-measurer.ts` 在 lazy singleton `ensureInit()` 中 `new Resvg(svgString, FONT_OPTIONS)`
- CLI 入口：`src/cli.ts` 当前**没有**字体验证逻辑
- 失败后果：若字体文件丢失，resvg-js 会静默 fallback 到内置字体（无错误），但测量的文本宽度与 PPTist 实际渲染（用思源黑体）不一致

## Constraints

- TypeScript strict mode, CommonJS
- 必须不破坏现有测试（text-measurer.test.ts 等）
- 错误信息需包含：缺失文件绝对路径、可能的修复建议（重建 / 重新安装）
- 验证时机必须在 `cac.parse()` 之后、`processFile` 之前

## Out of Scope

- 修改字体复制逻辑（`copy-fonts.js` 假定已正确）
- resvg-js 内部 fallback 行为（无法控制）
- Web / browser 端字体加载
- 运行时自动下载缺失字体

## Files Likely Modified

- `src/cli.ts` — 在 `main()` 入口添加字体验证
- `src/text-measurer.ts` — 可能需要导出 `verifyFontLoaded()` 函数（由 cli.ts 调用）
- 新建：`src/font-validator.ts` — 验证函数（推荐，遵循现有模块化风格）
- 新建：`src/font-validator.test.ts` 或 `__tests__/cli-font-validation.test.ts` — 单元测试