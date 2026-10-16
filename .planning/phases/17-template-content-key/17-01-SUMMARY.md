---
phase: 17-template-content-key
plan: 01
type: execute
wave: 1
completed_at: 2026-10-16
---

# 17-01 SUMMARY: contentKey helper 模块 + 单元测试

## 任务状态

| Task | Type | Status |
|------|------|--------|
| Task 1: D-07 + note-carrier 隐式扩展 one-way 锁定 | checkpoint:decision (blocking-human) | ✓ User OK |
| Task 2: 创建 `src/utils/content-key.ts` helper 模块 | auto | ✓ Complete |
| Task 3: 单元测试 `__tests__/content-key.test.ts` | auto | ✓ Complete |

## 交付物

- **`src/utils/content-key.ts`** (new) — helper 模块导出 `getContentKeyFor(id)` 与 `CONTENT_KEY_VALUES`
  - 10 静态映射 (CK-01 ~ CK-10):cover / chapter / content / closing 各类型
  - 24 动态映射 (N=1..8 × 3 类):toc-item-{N}-number/carrier/note-carrier
  - `CONTENT_KEY_VALUES` length = 34,所有 entry 唯一(`Object.freeze` 强制 runtime immutability)
- **`__tests__/content-key.test.ts`** (new) — vitest 单元测试矩阵

## 测试结果

```
✓ __tests__/content-key.test.ts (45 tests) 17ms
Test Files  1 passed (1)
Tests       45 passed (45)
```

覆盖范围:
- 3 cover (CK-01 ~ 03) + 3 chapter (CK-04 ~ 06) + 2 content (CK-07 ~ 08) + 2 closing (CK-09 ~ 10) = 10 静态正向
- 24 动态正向(8 × 3 categories)
- 4 reverse (CK-14/15):`toc-rail-title` / `cover-date-carrier` / `toc-rail-label` / `totally-unmapped-id`
- 3 boundary: `toc-item-0-carrier` / `toc-item-9-carrier` / `toc-item-1.5-carrier`
- 4 invariant:length=34,unique,静态+动态白名单包含断言

总计 45 个 `it()` 全部 passed(plan 要求 ≥ 39)。

## 验证

- `npm run build` 通过(TypeScript strict mode 无 error)
- `dist/src/utils/content-key.js` + `.d.ts` 产物存在
- `node -e "const m = require('./dist/src/utils/content-key'); console.log(m.getContentKeyFor('cover-title-carrier'), m.CONTENT_KEY_VALUES.length)"` → `cover_title 34`

## 决策落地

- D-02: string 类型 + 单一来源派生数组 ✓
- D-04/D-08: 独立 helper 模块 + 顶层预构建 Map ✓
- D-05: `src/utils/content-key.ts` 独立模块,不经 barrel re-export ✓
- D-06: 10 条静态映射按既定顺序 ✓
- D-07: TOC 1..8 动态上限锁定 ✓
- note-carrier 隐式扩展:`toc-item-{N}-note-carrier` → `directory_item_desc_{N}` ✓(24 entries 中的 8 条)

## 下一步

Wave 2: 17-02 — `PPTBaseElement.contentKey?: string` 字段 + transformElement() 单行 text case 注入