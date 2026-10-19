# Requirements: svg-to-pptel

**Defined:** 2026-10-19
**Core Value:** 准确把 SVG 元素转换为 PowerPoint JSON — 坐标、变换、样式映射正确，附带语义层 annotation（animations / template markers / content slots / pageData）。

## v1.14 Requirements

### Dependencies

- [ ] **NU-01**: `src/utils/id-generator.ts` 移除 `nanoid/non-secure` import,改用 `uuid` 包导出 — 实际调用 `uuidv4()`(已通过 `transformElement()` 入口 fallback 验证可用)
- [ ] **NU-02**: `nanoid(5)` → `uuidv4().substring(0, 5)`(5 hex 字符);`nanoid(10)` → `uuidv4().substring(0, 10)`(9 hex + 1 连字符,总 10 字符) — 长度不变
- [ ] **NU-03**: `package.json` 删除 `"nanoid": "^3.3.20"` 直接依赖;`uuid` 已在 dependencies 保留
- [ ] **NU-04**: 重跑 `npm install` 重生成 `package-lock.json` — `node_modules/nanoid` 块移除,transitive 间接引用(postcss)不影响
- [ ] **NU-05**: `package.json` 不新增 uuid 类型依赖(`@types/uuid` 已在)

### Source Code

- [ ] **NU-06**: `src/utils/id-generator.ts` 三处 `nanoid()` 调用全部替换为 `uuidv4().substring(...)`
- [ ] **NU-07**: `src/utils/id-generator.ts` 顶部注释更新 — "v3.x non-secure" 措辞移除,改为 "uuid v14 标准 substring 截取"

### Tests

- [ ] **NU-08**: `src/id-injection.test.ts` 中 `NANOID_5_RE` / `NANOID_10_RE` 重命名为 `UUID_SUFFIX_5_RE` / `UUID_SUFFIX_10_RE`(或直接 inline);正则字符集 `[A-Za-z0-9_-]` 适配 uuid 输出(`[0-9a-f-]`)
- [ ] **NU-09**: `src/id-injection.test.ts` 第 23-24 行的导入检查、注释、测试名同步更新
- [ ] **NU-10**: `tests/e2e/202610131101001.test.ts` 第 247 行 `a.id.length === 10` 断言保持(uuidv4().substring(0,10) 仍是 10 字符)

### Documentation

- [ ] **NU-11**: `docs/` 下任何提及 nanoid 的文件同步更新(如 `PPTIST_ANIMATION_MAPPING.md:69`)
- [ ] **NU-12**: `.planning/codebase/CONVENTIONS.md:80` `import { nanoid } from 'nanoid'` 示例同步更新
- [ ] **NU-13**: `.planning/STATE.md:111` `ANIM-DEC-02` 决策记录中"`<group_id>__<nanoid(8)>`"措辞更新为 uuid 表述
- [ ] **NU-14**: `.planning/milestones/v1.9-phases/14-pptist-animation-from-sidecar/14-RESEARCH.md` 全文 nanoid 提及同步更新
- [ ] **NU-15**: `.planning/milestones/v1.9-phases/14-pptist-animation-from-sidecar/14-01-PLAN.md` 全文 nanoid 提及同步更新
- [ ] **NU-16**: `.planning/milestones/v1.9-phases/14-pptist-animation-from-sidecar/14-01-SUMMARY.md` 全文 nanoid 提及同步更新

## Out of Scope

| Feature | Reason |
|---------|--------|
| 改变 PPTElement.id 后缀长度 | 用户明确指示保持 5/10 字符;改 8/12 等长度会破坏 PPTist 编辑器 diff 友好性 (D-07/D-20 设计意图) |
| 重写 `src/id-generator.ts` 的 API 表面 | 三处签名不变(`pptelIdWithFallback` / `pptelIdUngrouped` / `pptAnimationId`),仅换底层实现 |
| 替换其他 transitive 依赖 (postcss 内部 nanoid) | transitive 由 postcss 自身维护,本次只动直接依赖 |
| 引入新 ID 策略 (e.g. ulid / ksuid) | 用户明确指定 uuid,范围限于 nanoid → uuid 单向替换 |
| 修改 .planning/milestones/v1.10/ 之前的旧 phase 文档 | 用户仅明确提及 v1.9/14-*.md 同步;历史阶段文档自然保留 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NU-01 | Phase 19 | Pending |
| NU-02 | Phase 19 | Pending |
| NU-03 | Phase 19 | Pending |
| NU-04 | Phase 19 | Pending |
| NU-05 | Phase 19 | Pending |
| NU-06 | Phase 19 | Pending |
| NU-07 | Phase 19 | Pending |
| NU-08 | Phase 19 | Pending |
| NU-09 | Phase 19 | Pending |
| NU-10 | Phase 19 | Pending |
| NU-11 | Phase 19 | Pending |
| NU-12 | Phase 19 | Pending |
| NU-13 | Phase 19 | Pending |
| NU-14 | Phase 19 | Pending |
| NU-15 | Phase 19 | Pending |
| NU-16 | Phase 19 | Pending |

**Coverage:**
- v1.14 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-19*
*Last updated: 2026-10-19 after v1.14 milestone kickoff*