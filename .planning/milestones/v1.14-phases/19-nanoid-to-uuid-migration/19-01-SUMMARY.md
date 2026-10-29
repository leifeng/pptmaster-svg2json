---
phase: 19-nanoid-to-uuid-migration
plan: 01
type: summary
status: complete
---

# 19-01 Summary — `src/utils/id-generator.ts` uuid 替换(tracer slice)

## 改动文件清单

- `src/utils/id-generator.ts`(整文件改写)

## 改动摘要

| 行号 | 旧字面 | 新字面 |
|------|--------|--------|
| 5 | `animation id uses nanoid(10) to match PPTist editor panel length` | `animation id uses uuidv4().substring(0, 10) to match PPTist editor panel length` |
| 7-9 | `IMPORTANT — nanoid version: this module imports \`nanoid/non-secure\` (the non-secure CJS-compatible export from nanoid v3.x). v4+ and v5+ are ESM-only and break the project's \`tsc\` CJS output. See RESEARCH §0 / Pitfall 1.` | `Implementation: this module imports \`{ v4 as uuidv4 }\` from the \`uuid\` v14 package and takes a \`substring(0, N)\` slice to honor the 5/10-char PPTist panel diff-friendly id lengths (D-05~07 + D-20).` |
| 12 | `import { nanoid } from 'nanoid/non-secure'` | `import { v4 as uuidv4 } from 'uuid'` |
| 18 | `Else if \`groupId\` is defined → \`<groupId>__<nanoid(5)>\` (D-06)` | `Else if \`groupId\` is defined → \`<groupId>__<uuidv4().substring(0, 5)>\` (D-06)` |
| 20 | `3. Else (no group, no svg id) → \`nanoid(10)\` (D-07). PPTist uses 10-char nanoid by default` | `3. Else (no group, no svg id) → \`uuidv4().substring(0, 10)\` (D-07). PPTist uses 10-char ids by default` |
| 31 | `return \`${groupId}__${nanoid(5)}\`` | `return \`${groupId}__${uuidv4().substring(0, 5)}\`` |
| 32 | `return nanoid(10)` | `return uuidv4().substring(0, 10)` |
| 36 | `D-07: Ungrouped fallback — pure \`nanoid(10)\` for elements outside any \`<g>\`` | `D-07: Ungrouped fallback — pure \`uuidv4().substring(0, 10)\` for elements outside any \`<g>\`` |
| 41 | `return nanoid(10)` | `return uuidv4().substring(0, 10)` |
| 44-46 | `D-20: PPTAnimation.id uses \`nanoid(10)\` to match PPTist editor panel length` | `D-20: PPTAnimation.id uses \`uuidv4().substring(0, 10)\` to match PPTist editor panel length` |
| 50 | `return nanoid(10)` | `return uuidv4().substring(0, 10)` |

## 决策引用

- **NU-01**: 替换 `nanoid/non-secure` import → `uuid` v14 — ✅
- **NU-02**: 三处 `nanoid(N)` → `uuidv4().substring(0, N)`,N ∈ {5, 10, 10} — ✅
- **NU-06**: 函数签名不变 (`pptelIdWithFallback` / `pptelIdUngrouped` / `pptAnimationId`) — ✅
- **NU-07**: 5 处 JSDoc 块的 nanoid 字面同步为 uuid 措辞(D-A1 #1-5)— ✅

D-05 / D-06 / D-07 / D-08 / D-09 / D-20 决策编号字面全部保留(语义不变 — id 长度仍是 5/10,优先级链不变)。

## 验证日志

```
$ grep -n "nanoid" src/utils/id-generator.ts
FILE_NANOID_EXIT=1   # 期望 1(grep 找不到任何匹配 — 0 行输出)

$ grep -rn "from 'nanoid" src/
SRC_IMPORT_EXIT=1     # 期望 1(src/ 内已无 nanoid 包 import)

$ npm run build
> tsc && node scripts/copy-fonts.js
[copy-fonts] Copied 2 font file(s) to E:\git\svg2json\dist\src\fonts
TSC_EXIT=0           # 期望 0(tsc 编译通过,uuid v14 + @types/uuid v10 类型解析 OK)

$ npx vitest run src/id-injection.test.ts
✓ src/id-injection.test.ts (8 tests) 68ms
Test Files  1 passed (1)
     Tests  8 passed (8)
TEST_EXIT=0          # 期望 0(id-injection.test.ts 8 个 it() 全绿 — D-05~09 id priority chain 等价)
```

### 行为等价性确认

- `pptelIdWithFallback(undefined, undefined)` → 返回 `uuidv4().substring(0, 10)`,`length === 10`
- `pptelIdWithFallback('g', undefined)` → 返回 `g__` + 5 hex 字符(uuidv4 hex 子集仍匹配旧 `[A-Za-z0-9_-]{5}`)
- `pptelIdWithFallback(undefined, 'svg-id')` → 返回 `'svg-id'`(优先级链保留)
- `pptelIdUngrouped()` → 返回 10 字符(uuidv4 前 10 字符 `xxxxxxxx-x`)
- `pptAnimationId()` → 返回 10 字符(uuidv4 前 10 字符 `xxxxxxxx-x`)

## 给 19-02 的接力说明

19-01 已完成 `src/utils/id-generator.ts` 的 uuid 替换,验证 tracer 等价。19-02 接下来需要:

1. **Task 1 (package + 测试)**: 移除 `package.json` 的 `"nanoid": "^3.3.20"` 直接依赖、`npm install` 重生成 lock、`src/id-injection.test.ts` 内 `NANOID_5_RE`/`NANOID_10_RE` 重命名为 `UUID_SUFFIX_5_RE`/`UUID_SUFFIX_10_RE`、字符集从 `[A-Za-z0-9_-]` 精确化到 `[0-9a-f-]`(CD-2)、顶部 JSDoc + 8 it() title 同步(CD-3)、`tests/e2e/202610131101001.test.ts` 行 247 测试名同步 + `length === 10` 断言保留。

2. **Task 2 (剩余 6 处 src/ 注释)**: `src/animation-injector.ts:583` section header、`src/merger/path-merge.ts:181` JSDoc、`src/transformer/transform-to-pptel.ts` 行 1079/1080/1999/2159/2169 五处注释(D-A1 #6-11)。

3. **Task 3 (规划文档 + PPTIST_ANIMATION_MAPPING.md)**: 6 个 .planning/ 历史文档 + 根目录 `PPTIST_ANIMATION_MAPPING.md` 行 69 同步。

Phase 19 全部 16 个 NU-* 需求覆盖完毕(NU-01/02/06/07 由 19-01,NU-03/04/05/08/09/10/11/12/13/14/15/16 由 19-02)。
