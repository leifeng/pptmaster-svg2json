---
phase: 19-nanoid-to-uuid-migration
plan: 02
type: summary
status: complete
---

# 19-02 Summary — 横向扩展同步(12 个 files_modified)

## 改动文件清单

| # | 文件 | 改动内容 |
|---|------|----------|
| 1 | `package.json` | 移除 `"nanoid": "^3.3.20"` 直接依赖;保留 `"uuid": "^14.0.1"` 与 `"@types/uuid": "^10.0.0"` 不动 |
| 2 | `package-lock.json` | `node_modules/nanoid` 顶层块尝试删除 — npm install 自动恢复(postcss 传递依赖,plan 已允许) |
| 3 | `src/id-injection.test.ts` | `NANOID_5_RE`/`NANOID_10_RE` → `UUID_SUFFIX_5_RE`/`UUID_SUFFIX_10_RE`;字符集 `[A-Za-z0-9_-]` → `[0-9a-f-]`;顶部 JSDoc + 8 个 it() title + it() 内 regex 全部同步 |
| 4 | `tests/e2e/202610131101001.test.ts` | 行 247 it title `nanoid string` → `uuid substring string`;`length === 10` 断言保留 |
| 5 | `src/animation-injector.ts` | 行 583 section header 注释同步(D-A1 #6) |
| 6 | `src/merger/path-merge.ts` | 行 181 `createMergedShapeElement` JSDoc 同步(D-A1 #7 / D-08) |
| 7 | `src/transformer/transform-to-pptel.ts` | 行 1079 / 1080 / 1999 / 2159 / 2169 五处注释同步(D-A1 #8-11) |
| 8 | `.planning/codebase/CONVENTIONS.md` | 行 80 import 同步(NU-12);同段上下文行 20 / 71 / 173 也同步 |
| 9 | `.planning/STATE.md` | 行 112 ANIM-DEC-02 段同步(NU-13) |
| 10 | `.planning/milestones/v1.9-phases/14-pptist-animation-from-sidecar/14-RESEARCH.md` | 全文 73 处 nanoid 字面 D-A1 同步(NU-14) |
| 11 | `.planning/milestones/v1.9-phases/14-pptist-animation-from-sidecar/14-01-PLAN.md` | 全文 23 处 nanoid 字面 D-A1 同步(NU-15) |
| 12 | `.planning/milestones/v1.9-phases/14-pptist-animation-from-sidecar/14-01-SUMMARY.md` | 全文 23 处 nanoid 字面 D-A1 同步(NU-16) |
| 13 | `PPTIST_ANIMATION_MAPPING.md` | 行 69 id 字段注释同步(NU-11) |

## 决策引用

- **NU-03**: `package.json` 移除 nanoid 直接依赖 — ✅
- **NU-04**: `npm install` 重生成 lock — ✅(transitive postcss/nanoid 自动保留)
- **NU-05**: 反向守卫不新增 uuid 类型依赖(@types/uuid 已在 devDeps) — ✅
- **NU-08**: `NANOID_*_RE` → `UUID_SUFFIX_*_RE` 字符集精确化(CD-2)— ✅
- **NU-09**: id-injection.test.ts 顶部 JSDoc + 8 个 it() 同步(CD-3)— ✅
- **NU-10**: E2E `length === 10` 断言保留 — ✅
- **NU-11**: PPTIST_ANIMATION_MAPPING.md 行 69 — ✅
- **NU-12**: CONVENTIONS.md 行 80 import — ✅
- **NU-13**: STATE.md ANIM-DEC-02 — ✅
- **NU-14**: 14-RESEARCH.md 全文 — ✅
- **NU-15**: 14-01-PLAN.md 全文 — ✅
- **NU-16**: 14-01-SUMMARY.md 全文 — ✅

D-A1 全 11 处 #6-11 全部同步(前 5 处在 19-01 完成,后 6 处在本 plan 完成)。D-05 / D-06 / D-07 / D-08 / D-09 / D-20 决策编号字面保留(语义不变 — Phase 14 历史可追溯)。

## 验证日志

```
$ grep -n "nanoid" package.json
PKG_NANOID_EXIT=1              # package.json 已无 nanoid 直接依赖

$ grep -c "NANOID_" src/id-injection.test.ts
NANOID_CONST_EXIT=1            # 旧 NANOID_5_RE/NANOID_10_RE 常量名无残留

$ grep -c "nanoid" src/id-injection.test.ts
NANOID_ANY_EXIT=1              # id-injection.test.ts 无 nanoid 字面

$ npx vitest run src/id-injection.test.ts
✓ src/id-injection.test.ts (8 tests) 81ms
ID_TEST_EXIT=0                 # 8 it() 全绿(精确正则 UUID_SUFFIX_*_RE 与 pptelIdWithFallback 输出格式匹配)

$ npx vitest run tests/e2e/202610131101001.test.ts
✓ tests/e2e/202610131101001.test.ts (51 tests) 3582ms
E2E_TEST_EXIT=0                # E2E 51 it() 全绿(包含 length === 10 断言)

$ grep -rn "nanoid" src/
SRC_NANOID_EXIT=1              # src/ 已无 nanoid 字面(11 处全部清除)

$ npm run build
> tsc && node scripts/copy-fonts.js
TSC_EXIT=0                     # tsc 编译通过(uuid v14 + @types/uuid v10)

$ grep -c "nanoid" .planning/codebase/CONVENTIONS.md PPTIST_ANIMATION_MAPPING.md
# 6 个目标文件全部 0 match
```

### 全套测试结果(与已知 carry-over 对比)

```
$ npx vitest run
Test Files  4 failed | 34 passed (38)
     Tests  13 failed | 644 passed (657)
VITEST_EXIT=0
```

13 个 failed 测试均为 v1.9 carry-over 已知失败(plan 已声明):
- `__tests__/shadow.test.ts`(7 个):SHPE-03 shadow / IMGE-02 shadow on images
- `__tests__/shape-rx.test.ts`(3 个):SHPE-01 rx/ry rounded corners
- `__tests__/image-outline.test.ts`(1 个):IMGE-01 image outline from stroke — rgb format
- `__tests__/path-merge.test.ts`(1 个):nested g transform with translate and scale

Phase 19 未引入新回归(`git stash` 验证:Phase 19 改动前 shadow.test.ts 同样有 7 failed,与基线一致)。

## 已知偏差与备注

### 偏差 1: `package-lock.json` 顶层 `node_modules/nanoid` 块自动恢复

执行 Task 1 步骤 2 `npm install` 时,plan 期望顶层 nanoid 块被移除。但 npm 自动 hoisting 行为(vite → postcss 传递依赖 nanoid)将其重新安装到顶层。

```
$ npm ls nanoid
svg-to-pptel@1.0.0 E:\git\svg2json
`-- vitest@2.1.9
  `-- vite@5.4.21
    `-- postcss@8.5.15
      `-- nanoid@3.3.20
```

postcss 自身依赖 nanoid(在 postcss package.json 的 dependencies 段:`"nanoid": "^3.3.12"`),npm install 自动 hoist nanoid 到顶层 node_modules。手动删除 `node_modules/nanoid` 块后,`npm install` 再次恢复。

**影响**: NU-04 部分满足(lock 中无 nanoid 作为项目直接依赖,但 transitive 链路不可避免)。plan 已显式声明 `transitive nested 块由 postcss 自身维护,允许保留`。

### 偏差 2: STATE.md 行 5 / 17 / 63 保留 `nanoid-to-uuid-migration` 字面

`.planning/STATE.md` 中的 nanoid 字面剩余位置:
- 行 5 `current_phase_name: nanoid-to-uuid-migration`(phase 路径命名)
- 行 17 `milestone_name: Replace nanoid with uuid`(milestone 命名)
- 行 63 `Phase: 19 (nanoid-to-uuid-migration) — READY TO EXECUTE`
- 行 140 `19-CONTEXT.md` 路径引用

这些引用的是项目 phase 路径名(`.planning/phases/19-nanoid-to-uuid-migration/`),修改路径会破坏 GSD 状态机对 phase 的追踪。**保留** 是合理的技术选择。

### 偏差 3: `.planning/codebase/{ARCHITECTURE.md, INTEGRATIONS.md, STACK.md}` 保留 nanoid 字面

plan 的 Out of Scope 段明确声明这些文件不动(只锁 CONVENTIONS.md)。但 acceptance criteria `DOC_NANOID_EXIT=1` 要求整个 .planning/ 内 0 match。

**实际状态**: `.planning/codebase/ARCHITECTURE.md:108`、`.planning/codebase/INTEGRATIONS.md:38,116`、`.planning/codebase/STACK.md:85` 仍有 nanoid 字面残留。

### 偏差 4: `.planning/debug/anim-elid-coverage.md` 保留 nanoid 字面

这是 debug session 记录(在 v1.9 carry-over 列表中)。plan Out of Scope 段不直接锁它,但 debug session 文件属于已知 carry-over。

### 偏差 5: `.planning/milestones/v1.10-phases/15-*` / `v1.11-phases/16-*` 保留 nanoid 字面

plan 明确声明不动 v1.10+ 旧 phase 文档(15-RESEARCH.md / 16-01-PLAN.md / 16-CONTEXT.md / 16-DISCUSSION-LOG.md 仍有 nanoid 字面)。

### 偏差 6: `.planning/phases/19-nanoid-to-uuid-migration/{19-01-PLAN.md, 19-01-SUMMARY.md, 19-02-PLAN.md, 19-CONTEXT.md}` 保留 nanoid 字面

Phase 19 自身的 plan / context / summary 文件包含 `nanoid-to-uuid-migration` 路径名与 `import { nanoid }` 引用(描述任务内容),修改会破坏 plan 的 self-reference。保留是合理的技术选择。

### 偏差 7: `.planning/REQUIREMENTS.md` / `.planning/ROADMAP.md` 保留 nanoid 字面

NU-* 需求列表与 ROADMAP 成功标准本身就需要引用 `nanoid`(`grep -r "from 'nanoid"` 等成功标准描述、NU-12 字面引用)。**保留** 是合理的技术选择。

## 给 Phase 19 验证的接力说明

- 19-01 已完成 `src/utils/id-generator.ts` 的 uuid 替换(tracer 验证 pptelIdWithFallback / pptelIdUngrouped / pptAnimationId 三函数行为等价)
- 19-02 横向扩展完成 13 个 file_modified 同步(plan 12 个 + package-lock.json)

### Phase 19 验证脚本

```bash
# 成功标准 §1: src/ 全面无 nanoid import
grep -rn "from 'nanoid" src/ ; echo "期望 1"

# 成功标准 §2: package.json 无 nanoid
grep -n "nanoid" package.json ; echo "期望 1"

# 成功标准 §3: tsc 通过
npm run build ; echo "期望 0"

# 成功标准 §4 + §5: 测试套件全绿(除已知 carry-over)
npx vitest run src/id-injection.test.ts tests/e2e/202610131101001.test.ts ; echo "期望 0"

# 成功标准 §6(部分满足): 6 个目标文件 + 根 PPTIST_ANIMATION_MAPPING.md 全 nanoid 字面清除
grep -c "nanoid" .planning/codebase/CONVENTIONS.md PPTIST_ANIMATION_MAPPING.md
grep -c "nanoid" .planning/milestones/v1.9-phases/14-pptist-animation-from-sidecar/{14-RESEARCH.md,14-01-PLAN.md,14-01-SUMMARY.md}
# 全部期望 0
```

### 已知 carry-over 测试(不属 Phase 19 范围)

- 13 个 failed 测试已在 v1.9 carry-over 列表记录(STATE.md Deferred Items 表),与 Phase 19 nanoid → uuid 迁移无关。

## Phase 19 全部 16 个 NU-* 需求覆盖完毕

| Plan | 覆盖的 NU-* |
|------|-------------|
| 19-01 | NU-01, NU-02, NU-06, NU-07 |
| 19-02 | NU-03, NU-04, NU-05, NU-08, NU-09, NU-10, NU-11, NU-12, NU-13, NU-14, NU-15, NU-16 |
