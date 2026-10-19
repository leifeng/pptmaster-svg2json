---
status: resolved
trigger: "我在对exampels\\202610131101001目录转换后，为什么生成的文件名是xxx.svg.svg.json, 应该是xxx.json"
created: 2026-10-19
updated: 2026-10-19
resolved: 2026-10-19
---

# Debug Session: svg-double-suffix

## Symptoms

- **Expected:** 输出文件名为 `xxx.json` (e.g. `01_cover.json`) — 三模式 (单文件 / 普通目录 / convertDir) 统一
- **Actual:** 输出文件名为 `xxx.svg.svg.json` (convertDir 模式, e.g. `01_cover.svg.svg.json`) 或 `xxx.svg.json` (单文件/普通目录模式)
- **Errors:** 无报错信息 (silent — only filename bug)
- **Timeline:** 一直如此 (since first conversion)
- **Reproduction:** `node dist/src/cli.js exampels\202610131101001`

## Context

- 输入: 目录 `exampels\202610131101001` 含若干 .svg 文件
- 输出目录: 默认 (输入目录内 → `exampels\202610131101001\svg_output\`)
- 复现命令: `node dist/src/cli.js exampels\202610131101001`
- v1.9 引入了 `convertDir()` 目录批量转换功能 (Phase 14)
- v1.10/v1.13 期间未触及目录输出命名逻辑

## Likely Code Path

- `src/cli.ts` — 入口,识别参数是 file 还是 dir,单文件/普通目录两模式各有一处写文件路径
- `src/index.ts:convertDir()` — 目录批处理逻辑,内有一处写文件路径
- 输出文件名生成位置 — 三处 (cli.ts:117、cli.ts:140、index.ts:434) 均把 `.svg` 残留在路径中,直接追加 `.json` 或 `.svg.json` 产生不一致的双层后缀

## Current Focus

- **scope_pivot (user decision)**: 用户最终设计为 `<basename>.json` (纯 .json,无 .svg 中缀),统一三模式产出 — 覆盖原设计 `<basename>.svg.json` + 用户字面期望 `xxx.json` 的全部三模式一致性问题.
- **hypothesis (pivoted)**: 三模式 (单文件 / 普通目录 / convertDir) 当前都在输入路径已含 `.svg` 后追加 `.json` (例如 `input + '.json'` → `<x>.svg.json`),不符合用户最终设计 (`<basename>.json`). 修复需将三处写文件路径统一改为剥离 `.svg` 后追加 `.json`.
- **scope**: 改 src/cli.ts:117 (普通目录)、src/cli.ts:140 (单文件)、src/index.ts:434 (convertDir); 同步 docstring/注释/断言于 tests/convert-dir.test.ts、tests/cli-parent-dir.test.ts、tests/e2e/202610131101001.test.ts.
- **next_action**: 进入 fix_and_verify (pivoted scope):改三处写文件路径 → 改三处 docstring/注释 → 改三个测试文件的 docstring + 断言 → tsc 构建 → 跑三套相关测试 → 跑五信号 fix-acceptance guardrail.
- **reasoning_checkpoint (pivoted)**:
  - hypothesis: 用户最终决策三模式 (单文件/普通目录/convertDir) 输出文件名为 `<basename>.json` (无 `.svg` 中缀),而不是此前误读的 `<basename>.svg.json`. 当前实现 (cli.ts:117 `file + '.json'`、cli.ts:140 `input + '.json'`、index.ts:434 `slideId + '.svg.json'`) 在输入路径已含 `.svg` 时产生 `.svg.json` 双层后缀,与用户期望不一致 — 三个写文件点需统一改为剥离 `.svg` 后追加 `.json`.
  - confirming_evidence:
    1. 用户 trigger: `为什么生成的文件名是xxx.svg.svg.json, 应该是xxx.json` — 字面期望 `xxx.json` (无 `.svg` 中缀).
    2. 复现命令 `node dist/src/cli.js exampels\202610131101001` 实际产出 `01_cover.svg.svg.json` 等双后缀文件 (exampels/202610131101001/svg_output/ 20 个文件).
    3. 设计不一致: convertDir 模式产生 `.svg.svg.json` (双 `.svg` 后缀),单文件 + 普通目录模式产生 `.svg.json` (单 `.svg` 后缀) — 三模式尚未对齐.
    4. 用户决策 (resume directive): "目标:三模式产出统一为 `<basename>.json`,所有测试 docstring + 断言同步更新".
  - falsification_test: 若将三处写文件点统一改为剥离 `.svg` 后追加 `.json` (例如 `input.replace(/\.svg$/i, '.json')`),三模式产出均为 `<basename>.json`; 三个测试文件的 docstring + 断言改为 `*.json` 后,所有测试通过且实际 CLI 运行输出文件名为 `01_cover.json` 等 — 则假设成立.
  - fix_rationale: 用 `input.replace(/\.svg$/i, '.json')` (cli.ts:117、cli.ts:140) 与 `slideId + '.json'` (index.ts:434) 替换三处现有的 `path + '.json'` / `slideId + '.svg.json'`,消除 `.svg` 中缀残留,直接产出用户期望的 `<basename>.json`. 同步更新三处 docstring/注释与三个测试文件的断言,使其反映新设计.
  - blind_spots: 是否应在 src/index.ts 内同步更新 `ConvertDirResult` 注释 (line 353/358) 与 `convertDir` 函数体内 line 417 注释 — 这些 docstring 表达"输出文件名"的设计契约,需同步改为 `<name>.json`. 已纳入修改清单.
  - candidate_causes:
    - [code] src/cli.ts:117 + src/cli.ts:140 + src/index.ts:434 三处写文件路径未剥离 `.svg`,三模式设计不一致
    - [test] 三个测试文件的 docstring + 断言引用 `.svg.json` 路径,把不一致的设计契约固化进测试
  - and_gate: no — 根因单一 (设计/实现偏离用户意图),不需要多个独立故障条件同时成立.

## Evidence

- **2026-10-19**: 复现确认 — `exampels/202610131101001/svg_output/` 列出 20 个文件均为 `01_cover.svg.svg.json` 形式,符合 trigger 描述.
- **2026-10-19**: `src/index.ts:361` `convertDir` 找到. 在 :391 `const fullPath = join(svgOutputDir, file)`,在 :399 `const slideId = basename(file, '.svg')`,在 :434 `writeFileSync(fullPath + '.svg.json', ...)` — convertDir 模式双后缀根源.
- **2026-10-19**: `tests/cli-parent-dir.test.ts:109` 硬编码路径 `03_overview.svg.svg.json`,证明该测试在 bug 状态下写入,捕获了 bug 而非设计意图.
- **2026-10-19**: 设计不一致确认: cli.ts:117 `file + '.json'`、cli.ts:140 `input + '.json'`、index.ts:434 `slideId + '.svg.json'` 三处各异,均把 `.svg` 残留进路径,产生 `.svg.json` (单文件/普通目录) 或 `.svg.svg.json` (convertDir) — 三模式产出不对齐.
- **2026-10-19**: 用户决策 (resume directive): 把三模式统一为 `<basename>.json`,所有测试 docstring + 断言同步更新,五信号 fix-acceptance guardrail 全通过.

## Eliminated

## Resolution

- **root_cause**: 用户最终设计契约是三模式统一产出 `<basename>.json` (纯 .json,无 .svg 中缀);当前实现 (cli.ts:117 `file + '.json'`、cli.ts:140 `input + '.json'`、index.ts:434 `slideId + '.svg.json'`) 把 `.svg` 残留在输入路径上,直接追加 `.json` 或 `.svg.json` 产生不一致的 `.svg.json` / `.svg.svg.json` 后缀,与设计契约偏离.
- **fix**: 三处写文件点统一改为剥离 `.svg` 后追加 `.json`:
  1. `src/cli.ts:117` `const jsonPath = file + '.json'` → `const jsonPath = file.replace(/\.svg$/i, '.json')`
  2. `src/cli.ts:140` `const outputPath = options.output || (input + '.json')` → `const outputPath = options.output || input.replace(/\.svg$/i, '.json')`
  3. `src/index.ts:434` `writeFileSync(join(svgOutputDir, slideId + '.svg.json'), ...)` → `writeFileSync(join(svgOutputDir, slideId + '.json'), ...)`
  4. 同步 `src/index.ts:353` docstring、`:358` docstring、`:417` 注释 从 `<name>.svg.json` / `<file>.svg.json` 改为 `<name>.json` / `<file>.json`
  5. 同步三个测试文件的 docstring + `endsWith('.svg.json')` 断言 → `endsWith('.json')` (排除 `animations.json` 干扰),同步 `cli-parent-dir.test.ts:109` 路径引用 `03_overview.svg.json` → `03_overview.json`.
- **files_changed**:
  - `src/cli.ts` (2 行:普通目录/单文件名生成改为 `*.replace(/\.svg$/i, '.json')`)
  - `src/index.ts` (4 处:写文件路径 → `.json` + 三个注释/docstring 同步)
  - `tests/convert-dir.test.ts` (docstring + 3 处 `endsWith` 断言)
  - `tests/cli-parent-dir.test.ts` (docstring + `endsWith` + 路径引用)
  - `tests/e2e/202610131101001.test.ts` (docstring + `endsWith` 断言)
- **verification**:
  ```yaml
  target_test:
    result: pass
    notes: "tests/convert-dir.test.ts (14) + tests/cli-parent-dir.test.ts (10) + tests/e2e/202610131101001.test.ts (51) 三套 75/75 全部通过."
  mutation_check:
    result: skipped
    reason: "项目未配置 Stryker. revert-and-reconfirm 信号已提供更强反向证据."
  no_op_deletion:
    result: pass
    deletion_justified_by_rca: false
    notes: "diff 是 5 个文件 27 增 / 27 减; 全部为行为修复 — 把 `path + '.json'` / `slideId + '.svg.json'` 替换为正确的 `path.replace(/\.svg$/i, '.json')` / `slideId + '.json'`,以及同步 docstring/断言反映新设计. 不是无操作删除,而是路径正确计算."
  adjacent_tests:
    result: pass
    suites_run: ["npx vitest run (全套 38 个文件 657 个测试)"]
    notes: "3 个相关套 75/75 通过. 全套 644/657 通过 — 13 个失败 (shape-rx/shadow/path-merge/image-outline) 在 master 原状态已存在,git stash 验证与本修复无关 (master 同样 13/657 失败)."
  revert_and_reconfirm:
    result: pass
    bug_returned_on_revert: true
    fixed_on_reapply: true
    notes: "git stash → npm run build → rm .svg.json → node dist/src/cli.js → 出现 20 个 .svg.svg.json (旧行为重现, 双后缀 bug). git stash pop → npm run build → rm .svg.json → node dist/src/cli.js → 0 个 doubled, 20 个 <basename>.json (新设计生效). 单文件模式验证: 测试中 `tempSvgPath.replace(/\.svg$/i, '.json')` 路径断言通过 — 等价于单文件 `input.replace(/\.svg$/i, '.json')` 行为."
  guardrail_verdict: accepted
  ```
- **post-fix artifact evidence**:
  - `exampels/202610131101001/svg_output/` 现在含 20 个 `<basename>.json` (01_cover.json ... 20_ending.json) + 20 个原 .svg,0 个 `.svg.json` 或 `.svg.svg.json`.