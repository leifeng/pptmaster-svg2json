# Phase 12: Font Preprocess - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-23
**Phase:** 12-font-preprocess
**Mode:** `--auto` (recommended defaults selected)
**Areas discussed:** 字体声明覆盖面, font shorthand 语义, 公开 API 集成边界, 非字体内容保护与验收

---

## 字体声明覆盖面

| Option | Description | Selected |
|--------|-------------|----------|
| 仅 `font-family` 属性 | 最窄范围，遗漏 shorthand 与 CSS | |
| 属性 + `<style>` | 覆盖旧计划，但遗漏 inline style | |
| 属性 + inline style + `<style>` | 覆盖 presentation attributes、inline CSS 与 stylesheet 使用声明 | ✓ |
| 改写 `@font-face` | 可能把嵌入的其他字体映射成目标 family | |
| 保留 `@font-face` | 仅改字体使用声明，避免伪装嵌入字体 | ✓ |

**Auto choice:** 对所有 SVG 元素覆盖四类字体使用入口；保留 `@font-face` 描述符和 `src`。
**Notes:** `<g>` 继承字体和原始 `<textPath>` 属性也属于 raw-string 预处理范围。

---

## font shorthand 语义

| Option | Description | Selected |
|--------|-------------|----------|
| 替换整个 shorthand | 简单但会丢失 size、weight、line-height | |
| 仅替换 family 尾部 | 保留其他 shorthand 子属性 | ✓ |
| 简单空白 split | 无法可靠处理引号、多词和逗号列表 | |
| 稳健识别 family 边界 | 处理 quoted/multi-word/fallback list | ✓ |
| malformed 时强制替换 | 可能破坏非字体信息 | |
| malformed 时保持原值 | 安全失败，继续处理其他声明 | ✓ |

**Auto choice:** 保留 shorthand 非 family 部分，稳健识别 family list；无法解析时不破坏输入，并保证幂等。
**Notes:** 当前 `replaceFontFamilyInShorthand()` 的 `split(/\s+/)` 仅作为历史实现，不是锁定方案。

---

## 公开 API 集成边界

| Option | Description | Selected |
|--------|-------------|----------|
| CLI 层预处理 | 库调用者行为不一致 | |
| `convert()` 入口预处理 | CLI 与公共库 API 行为一致 | ✓ |
| `parseSvg()` 内预处理 | 改变低层 parser 的 raw 语义 | |
| normalizer 仅内部使用 | 直接 parser 调用者无法显式复用 | |
| 从公共 index 导出 | 低层调用者显式 opt-in | ✓ |

**Auto choice:** `convert()` 自动执行；`parseSvg()` 保持 raw；公共导出 `normalizeFontFamily`。
**Notes:** 当前 `src/index.ts` 仍调用 `parseSvg(svgContent, ...)`，旧 SUMMARY 的“已集成”陈述已过时。

---

## 非字体内容保护与验收

| Option | Description | Selected |
|--------|-------------|----------|
| 仅保证常见属性 | 可能误改注释、文本、script 或 data URI | |
| 严格保护非目标内容 | 只改变真实字体使用声明 | ✓ |
| 移除 CSS `!important` | 改变优先级 | |
| 保留 CSS `!important` | 只替换 family 值 | ✓ |
| 仅 normalizer 单测 | 无法证明公开流程已集成 | |
| 单元 + `convert()`/CLI 集成 | 同时验证低层 `parseSvg()` raw 语义 | ✓ |
| 要求历史全量套件绝对全绿 | 会被既有测试债务阻断 | |
| 基线比较零新增回归 | 精确归因 Phase 12 影响 | ✓ |

**Auto choice:** 非目标内容严格保持；保留 `!important`；验证 focused + public integration；全量套件以零新增失败为门。
**Notes:** Phase 11 已确认仓库存在基线测试债务，后续必须做 apples-to-apples 归因。

---

## Claude's Discretion

- 具体使用 tokenizer、状态机或无依赖解析策略。
- 目标声明允许的最小格式规范化。
- 测试文件组织方式，只要同时覆盖 unit、public integration 与 raw parser contract。

## Deferred Ideas

None.
