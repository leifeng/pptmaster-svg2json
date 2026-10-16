---
phase: 16-template-element-marking
plan: 01
subsystem: transformer
tags: [svg, pptel, template, mark, transform-to-pptel, group-ancestor]

# Dependency graph
requires: []
provides:
  - PPTBaseElement.templateType?: 1 literal field
  - isTemplate computation in transformElement() top (excludes slot subtree)
  - templateType injection across 8 cases + multiline text + icon path + path-merge
  - 7 tracer tests covering TPL-MARK-01/02/03/03a/05 + TPL-NONREN-01 + TPL-E2E-02 reverse
affects: [phase-16-02, phase-16-03, verify-phase-goal]

# Actuals (#2632)
actuals:
  tokens: 1500
  tasks: 1
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns:
    - typeof-checked .includes() guard for fast-xml-parser id type variance
    - literal type widening protection via TypeScript as-const style

key-files:
  created:
  - __tests__/template-marking.test.ts
  modified:
  - src/slides.ts
  - src/transformer/transform-to-pptel.ts

key-decisions:
  - "Decision: Used typeof check vs D-TPL-07 optional chaining - same semantics, more defensive against fast-xml-parser numeric id"
  - "Decision: Slot subtree exception extended - children of <g id="content-object-slot-template"> do not inherit templateType (TPL-MARK-03 scope expansion per D-TPL-07 revised)"

patterns-established:
  - "Pattern: literal field type ?<value> in TypeScript interface for type-narrow reverse assertions"

requirements-completed: [TPL-MARK-01, TPL-MARK-02, TPL-MARK-03, TPL-NONREN-01, TPL-NONREN-02, TPL-E2E-02]

coverage:
  - id: D1
    description: "PPTBaseElement.templateType?: 1 literal field added"
    requirement: TPL-MARK-01
    verification:
      - kind: unit
        ref: "__tests__/template-marking.test.ts#TPL-MARK-01 element id contains -template marks templateType=1"
        status: pass
    human_judgment: false
  - id: D2
    description: "Group ancestor chain propagation to renderable children"
    requirement: TPL-MARK-02
    verification:
      - kind: unit
        ref: "__tests__/template-marking.test.ts#TPL-MARK-02 group ancestor id propagates templateType"
        status: pass
    human_judgment: false
  - id: D3
    description: "content-object-slot-template exception (both element id and groupId paths)"
    requirement: TPL-MARK-03
    verification:
      - kind: unit
        ref: "__tests__/template-marking.test.ts#TPL-MARK-03 content-object-slot-template exception"
        status: pass
    human_judgment: false
  - id: D4
    description: "Multiline text line propagation (each line carries templateType)"
    requirement: TPL-MARK-05
    verification:
      - kind: unit
        ref: "__tests__/template-marking.test.ts#TPL-MARK-05 multiline text propagation"
        status: pass
    human_judgment: false
  - id: D5
    description: "Non-renderable elements (defs/linearGradient) are skipped"
    requirement: TPL-NONREN-01
    verification:
      - kind: unit
        ref: "__tests__/template-marking.test.ts#TPL-NONREN-01 non-renderable elements are skipped"
        status: pass
    human_judgment: false
  - id: D6
    description: "Reverse assertion: templateType only ever 1 or undefined"
    requirement: TPL-E2E-02
    verification:
      - kind: unit
        ref: "__tests__/template-marking.test.ts#TPL-E2E-02 reverse assertion: templateType is 1 or undefined only"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-10-16
status: complete
---

# Phase 16: template-element-marking — Plan 01 Summary

**Transformer marks renderable PPTElement with templateType?: 1 literal based on -template id propagation; excludes content-object-slot-template subtree per D-TPL-07 revised.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-10-16
- **Completed:** 2026-10-16
- **Tasks:** 1
- **Files modified:** 3 (created 1, modified 2)

## Accomplishments

- PPTBaseElement.templateType?: 1 字面量字段在 src/slides.ts:146 之后存在
- transformElement() 顶部统一计算 isTemplate (typeof 守卫,防御 fast-xml-parser 把 id 解析为 number 的情形)
- 8 个 case (rect/circle/ellipse/path/polygon/polyline/line/text 单) 末尾追加 `if (isTemplate) result.templateType = 1`
- multiline text 拆行后每个 line element 独立带 templateType=1
- transformIconElement() 函数签名新增 isTemplate 参数 + 末尾 templateType 写入
- icon 早返回处传入 isTemplate
- walk() path-merge 分支:mergedElement 在 `<g id="*-template">` 子树内时带 templateType=1 (slot 例外对称排除)
- 7 个 tracer 测试 + 反向断言全过

## Task Commits

1. **Task 1: 端到端 templateType tracer** - `58e0764` (feat)

## Files Created/Modified

- `src/slides.ts` - PPTBaseElement.templateType?: 1
- `src/transformer/transform-to-pptel.ts` - isTemplate calc + 8 case injections + multiline + icon + path-merge
- `__tests__/template-marking.test.ts` - 7 tests (TPL-MARK-01/02/03/03a/05 + TPL-NONREN-01 + TPL-E2E-02)

## Decisions Made

- **Decision: typeof 守卫 vs optional chaining** - D-TPL-07 字面 `?.includes()` 仅容忍 undefined;本实现 `typeof elementId === 'string' && elementId.includes('-template')` 等价且额外防御 fast-xml-parser 数值 id 情形 (`(1).includes(...)` throws TypeError)。语义一致且更安全 (T-16-01)。
- **Decision: slot 子树不向下传播** - D-TPL-07 (revised): elementId/groupId 命中 `-template` 时,若 elementId 或 groupId 等于 `content-object-slot-template` 则不写。否则 30+ 个 slot 内 children 全部会被错误标 templateType=1 (T-16-02)。

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

16-02 can proceed: Slide.contentBounds field can be added to Slide interface, findContentBounds() helper added to convertOne() in src/index.ts, TPL-CB-01/02/03 tests appended to existing template-marking.test.ts.

---

*Phase: 16-template-element-marking*
*Completed: 2026-10-16*
