# Phase 19: nanoid-to-uuid-migration - Context

**Gathered:** 2026-10-19
**Status:** Ready for planning

<domain>
## Phase Boundary

把 `src/utils/id-generator.ts` 的 3 处 `nanoid()` 调用替换为 `uuidv4().substring(...)`,
删除 `nanoid` 直接依赖,同步更新测试正则、源码注释、`.planning/` 6 个历史文档与
`PPTIST_ANIMATION_MAPPING.md`。ID 长度保持 5/10 字符不变,API 表面三处签名不变。
仅替换底层实现库(nanoid v3.3.20 → uuid v14.0.1 的 v4)。

**In scope:**
- `src/utils/id-generator.ts` 3 处调用 + 顶部注释
- `package.json` 移除 nanoid 直接依赖 + 重生成 `package-lock.json`
- `src/id-injection.test.ts` 正则重命名(NANOID_*_RE → UUID_SUFFIX_*_RE)
- `tests/e2e/202610131101001.test.ts` 第 247 行 `length===10` 断言保持
- src/ 11 处源码注释同步(id-generator / animation-injector / merger/path-merge / transformer/transform-to-pptel)
- `.planning/` 6 个历史文档 + `PPTIST_ANIMATION_MAPPING.md` 同步

**Out of scope (locked by user via REQUIREMENTS.md Out of Scope 表):**
- 改 PPTElement.id 后缀长度(保持 5/10 字符,D-07/D-20 设计意图)
- 重写 `src/id-generator.ts` API 表面(签名不变,只换底层)
- 替换其他 transitive 依赖(postcss 内部 nanoid)
- 引入新 ID 策略(ulid/ksuid 等)
- 修改 v1.10 之前的旧 phase 文档

</domain>

<decisions>
## Implementation Decisions

### A. 源码注释同步面 — 全部 11 处同步

**D-A1**: 全部 11 处 src/ 源码注释涉及 nanoid 的字面,全部同步为 uuid 措辞。决策编号 D-06/D-07/D-08/D-20 保留(决策语义不变 — id 长度仍是 5/10,只是底层库换)。— **Reversibility:** reversible — 仅源码注释字面更新,无代码行为变更

**D-A1 范围(11 处):**
1. `src/utils/id-generator.ts:5` — JSDoc 模块用途
2. `src/utils/id-generator.ts:7-10` — JSDoc 版本说明("v3.x non-secure" → "uuid v14")
3. `src/utils/id-generator.ts:18-21` — JSDoc D-06/D-07
4. `src/utils/id-generator.ts:36-41` — JSDoc D-07
5. `src/utils/id-generator.ts:45-50` — JSDoc D-20
6. `src/animation-injector.ts:583` — section header
7. `src/merger/path-merge.ts:181` — JSDoc D-08
8. `src/transformer/transform-to-pptel.ts:1079-1080` — JSDoc D-05~07
9. `src/transformer/transform-to-pptel.ts:1999` — 注释 D-06+D-08
10. `src/transformer/transform-to-pptel.ts:2159` — 注释 D-05~07
11. `src/transformer/transform-to-pptel.ts:2169` — 注释 D-06+D-08

**D-A1 措辞替换原则:**
- "nanoid(5)" → "uuidv4().substring(0, 5)"
- "nanoid(10)" → "uuidv4().substring(0, 10)"
- "<group_id>__<nanoid(5)>" → "<group_id>__<uuidv4-substring(5)>"
- "PPTist uses 10-char nanoid by default" → "PPTist uses 10-char id by default"(避免误导,因 PPTist 实际行为未必随 svg2pptel 变)
- "v3.x non-secure" → "uuid v14"
- D-06/D-07/D-08/D-20 决策编号字面保留(语义不变)

### Claude's Discretion

### CD-1 (B 灰色区域 — PPTIST_ANIMATION_MAPPING.md 路径偏差)

REQUIREMENTS.md NU-11 写 "docs/ 下任何提及 nanoid 的文件",实际 `PPTIST_ANIMATION_MAPPING.md`
位于项目根 `./PPTIST_ANIMATION_MAPPING.md`,不在 `docs/` 子目录。Plan 19-02 直接更新此文件即可,
无需修改 REQUIREMENTS.md 描述 — 措辞偏差属于"上下级子目录"的措辞不精确,实际目标唯一。

### CD-2 (C 灰色区域 — 测试正则精度)

UUID_SUFFIX_5_RE 选 `/^[0-9a-f]{5}$/`(精确 5 hex 字符)。
UUID_SUFFIX_10_RE 选 `/^[0-9a-f]{8}-[0-9a-f]$/`(精确刻画 uuidv4 前缀 `xxxxxxxx-x` 的 10 字符)。
理由:substring(0, 5) 永远只产生 hex;substring(0, 10) 永远只产生 hex 9 字符 + dash 1 字符,
精确正则能防止 uuidv4 完整 36 字符格式被错误接受。

### CD-3 (D 灰色区域 — id-injection.test.ts 顶部 JSDoc)

NU-09 字面锁"第 23-24 行的导入检查、注释、测试名"。文件第 7-10 行 D-05~09 JSDoc 也含
nanoid 提及(`<nanoid(5)>` / `nanoid(10)` / `g1__<nanoid(5)>` 等),与 D-A1 决策一致 — 11 处
src/ 注释同步面包含此文件。Plan 19-02 实施时一并改。

### CD-4 (E 灰色区域 — PPTist 兼容性 E2E 验证)

uuid 字符集包含 `-`(PPTist 默认 nanoid 字符集 `[A-Za-z0-9_-]` 同样含 `-`)。Phase 19
不新增 E2E 验证 PPTist 实际接受 uuid 输出 id — D-07/D-20 设计意图已记录(保持 10 字符长度
匹配 PPTist panel diff 友好性),Phase 14 已有 76+ 测试覆盖 pptelIdWithFallback /
pptelIdUngrouped / pptAnimationId 三函数行为。后续若发现 PPTist 实际拒绝,属独立 bug,
非 Phase 19 范围。

### CD-5 (F 灰色区域 — fixture 旧 id 兼容性)

fixture 文件(`tests/fixtures/202610131101001/*.svg.json`)每次转换都重新生成 id,
不存在持久 id 兼容问题。无需额外处理。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §v1.14 — NU-01..NU-16 完整需求列表
- `.planning/ROADMAP.md` §Phase 19 — 成功标准 1-6(grep/build/test/E2E/.planning 同步)

### Source under change
- `src/utils/id-generator.ts` — 唯一核心实现,3 处 `nanoid()` 调用
- `src/id-injection.test.ts` — 测试正则重命名面(NU-08/09)
- `tests/e2e/202610131101001.test.ts:247` — `length===10` 断言(NU-10)
- `src/animation-injector.ts:583` — section header(D-A1 #6)
- `src/merger/path-merge.ts:181` — JSDoc D-08(D-A1 #7)
- `src/transformer/transform-to-pptel.ts:1079-1080/1999/2159/2169` — JSDoc + 注释 4 处(D-A1 #8-11)
- `package.json` — 移除 `"nanoid": "^3.3.20"`(NU-03)

### Historical context (v1.9 / Phase 14)
- `.planning/milestones/v1.9-phases/14-pptist-animation-from-sidecar/14-RESEARCH.md` — Phase 14 nanoid 决策原始论证(NU-14)
- `.planning/milestones/v1.9-phases/14-pptist-animation-from-sidecar/14-01-PLAN.md` — Phase 14 plan 涉及 nanoid 字面(NU-15)
- `.planning/milestones/v1.9-phases/14-pptist-animation-from-sidecar/14-01-SUMMARY.md` — Phase 14 执行摘要涉及 nanoid 字面(NU-16)

### Project docs (legacy nanoid mentions)
- `./PPTIST_ANIMATION_MAPPING.md` — 项目根目录 PPTist 映射文档(NU-11,实际路径而非 docs/)
- `.planning/codebase/CONVENTIONS.md:80` — `import { nanoid } from 'nanoid'` 示例(NU-12)
- `.planning/STATE.md:111` — ANIM-DEC-02 决策记录(NU-13)

### uuid 已验证引用
- `src/transformer/transform-to-pptel.ts:1` — `import { v4 as uuidv4 } from 'uuid'`(已验证 uuid v14 在用)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `uuid` v14.0.1(已在 `package.json` dependencies)— 直接 `import { v4 as uuidv4 } from 'uuid'`,与 `src/transformer/transform-to-pptel.ts:1` 一致
- `@types/uuid` v10(已在 devDependencies)— uuid v14 type definitions 兼容

### Established Patterns
- **三函数命名契约**:`pptelIdWithFallback` / `pptelIdUngrouped` / `pptAnimationId` 是公开 API。Phase 19 仅换内部实现,签名不变。所有调用点(`transformElement()` / `createMergedShapeElement()` / `pptAnimationId()` 调用方)零改动
- **D-05~09 id priority chain**:original svg id > `<groupId>__nanoid(5)>` > `nanoid(10)`,Phase 19 改为 uuid substring 但优先级链语义不变
- **测试断言正则**:id-injection.test.ts 用 `NANOID_5_RE` / `NANOID_10_RE` 两个 regex 常量,Phase 19 改为 `UUID_SUFFIX_5_RE` / `UUID_SUFFIX_10_RE`(CD-2 决定精确正则)

### Integration Points
- `src/index.ts` — `convert()` 公开入口,透传 `transformToPPTElement` → `walk()` → `transformElement` → `pptelIdWithFallback`
- `src/merger/path-merge.ts:181` — `createMergedShapeElement` 接受 `fallbackId?: string`,D-08 沿用
- `src/animation-injector.ts:583` — `pptAnimationId()` 调用点

### 命名空间隔离
- **src/ 注释面(11 处)** vs **.planning/ 文档面(6 个文件)** vs **PPTIST_ANIMATION_MAPPING.md** — 三个独立改动面,Plan 19-02 一次性 batch 完成
- **测试代码面**(`src/id-injection.test.ts`)— 单独处理(NU-08/09)

</code_context>

<specifics>
## Specific Ideas

- **D-06/D-07/D-08/D-20 决策编号字面保留**:虽然底层库换了,但决策语义(id 长度 5/10,priority chain,PPTist panel diff 友好)未变。注释中"D-06"等编号字面保留,便于 Phase 14 / Phase 19 历史追溯
- **PPTIST_ANIMATION_MAPPING.md 在项目根**:实际位于 `./PPTIST_ANIMATION_MAPPING.md`,不在 `docs/` 子目录。Plan 19-02 实施时直接定位根目录文件即可
- **uuid v4 vs v7**:沿用 v4,与 `src/transformer/transform-to-pptel.ts:1` 现有 import 一致;Phase 19 不引入 v7
- **`@types/uuid` 已存在**:Phase 19 不新增类型依赖,NU-05 锁定

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.Phase 19 范围已由 NU-01..NU-16 + Out of Scope 表严密锁定。

</deferred>

---

*Phase: 19-nanoid-to-uuid-migration*
*Context gathered: 2026-10-19*
