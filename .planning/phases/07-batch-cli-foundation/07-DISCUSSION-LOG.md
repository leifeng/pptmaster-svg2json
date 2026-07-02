# Phase 7: Batch CLI Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-02
**Phase:** 07-Batch CLI Foundation
**Areas discussed:** 进度与反馈, Python 集成 (exit code + 结构化输出)

---

## 进度与反馈

| Option | Description | Selected |
|--------|-------------|----------|
| 简洁模式（推荐） | 仅输出成功/失败统计 + 错误文件列表，转换过程静默 | ✓ |
| 详细模式 | 每个文件转换后打印输入路径 + 输出路径 | |
| 完全静默 | 仅在最后输出统计数字，成功时无任何输出 | |

**User's choice:** 简洁模式
**Notes:** 用户表示 Python 调用时关注的是整体结果，不是每个文件的日志

---

## Python 集成：Exit Code

| Option | Description | Selected |
|--------|-------------|----------|
| 部分失败也 exit(0)（推荐） | 保持现状：部分失败不中断，Python 通过解析 stderr 统计判断 | ✓ |
| 全部成功才 exit(0) | 任何失败都 exit(1)，Python 通过 exit code 判断成功/失败 | |
| 失败数 > 0 则 exit(1) | 至少一个失败就 exit(1)，区分全部成功/部分成功/全部失败 | |

**User's choice:** 部分失败也 exit(0)
**Notes:** Python 通过解析 stderr 的 `Converted N/M` 格式判断结果

---

## Python 集成：结构化输出

| Option | Description | Selected |
|--------|-------------|----------|
| 保持纯文本即可（推荐） | Python 可解析 stderr 的 "Converted N/M" 格式，不需要额外 JSON | ✓ |
| 输出 JSON summary | stdout 或 stderr 输出 JSON summary：{success: N, failed: M, errors: [...]} | |
| 输出 JSON 并退出码配合 | JSON summary + 失败时 exit(1) | |

**User's choice:** 保持纯文本即可
**Notes:** Python 已有能力解析纯文本格式

---

## Claude's Discretion

- `processFile()` 的错误信息详细程度
- `walkDir()` 的文件排序方式

## Deferred Ideas

None — discussion stayed within phase scope