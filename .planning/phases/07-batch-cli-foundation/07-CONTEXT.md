# Phase 7: Batch CLI Foundation - Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

实现目录批量转换 CLI — 从目录读取 SVG 文件，转换为 PPTElement JSON，保存到同一目录（input.svg → input.svg.json）。

</domain>

<decisions>
## Implementation Decisions

### JSON 文件输出位置
- **D-38:** 同目录同名 `.json` 后缀 — `input.svg` → `input.svg.json`，保持目录结构，不使用 `--output` 标志

### JSON 文件内容格式
- **D-39:** 直接输出 `convert()` 结果 — 不包裹元数据，直接写入 PPTElement JSON 数组

### 进度反馈
- **D-40:** 简洁模式 — 转换过程静默，仅在最后输出统计：`Converted N files, M failed`，失败时列出错误文件

### Python 集成
- **D-45:** Exit code 保持部分失败也 `exit(0)` — Python 通过解析 stderr 的 `Converted N/M` 格式判断结果
- **D-46:** 保持纯文本输出 — 不需要 JSON summary，Python 可解析现有 stderr 格式

### CLI 行为（已实现，确认）
- **D-41:** 目录输入时禁止使用 `--output` — 已有实现，保持不变
- **D-42:** 递归模式 `-r` 已支持 — 保持不变
- **D-43:** 空目录输出 `No SVG files found.` — 保持不变
- **D-44:** 失败不中断批次 — 已有实现，保持不变

### Claude's Discretion
- `processFile()` 的错误信息详细程度（当前只显示 `File read error`）
- `walkDir()` 的文件排序（字母序/修改时间序）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目状态
- `.planning/STATE.md` — 当前项目状态（v1.4 milestone）
- `.planning/REQUIREMENTS.md` §v1.4 — BATCH-01~07 需求清单

### 已有实现
- `src/cli.ts` — 现有 CLI 实现，`walkDir()` 和 `processFile()` 已存在

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/cli.ts` — `walkDir()` 递归遍历、过滤 `.svg` 扩展名；`processFile()` 读取文件+调用 `convert()`
- `src/index.ts` — `convert()` async 函数，输入 SVG 字符串返回 `{ success, output }`

### Established Patterns
- `convert()` 返回 `{ success: boolean, output?: string, error?: string }` 结构
- 错误处理不中断批次：部分失败时 exit(0)，全部失败时 exit(0)
- Python 集成：stderr 输出纯文本，Python 解析 `Converted N/M` 格式

### Integration Points
- `src/cli.ts` main() 的目录处理分支 — 需要修改：当前只打印结果，需要改为写入 `.json` 文件

</code_context>

<specifics>
## Specific Ideas

- JSON 文件名：`${originalName}.svg.json`
- 进度反馈参考现有单文件模式的简洁输出风格
- 不需要额外的日志库，使用 `picocolors` 的现有颜色

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-Batch CLI Foundation*
*Context gathered: 2026-07-02*