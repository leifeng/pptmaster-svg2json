---
phase: 17-template-content-key
plan: 03
type: execute
wave: 3
completed_at: 2026-10-16
---

# 17-03 SUMMARY: multiline Row 1 vs Row 2..N 区分 + mock SVG E2E

## 任务状态

| Task | Type | Status |
|------|------|--------|
| Task 1: D-09 multiline Row 1 vs Row 2..N 区分 | checkpoint:decision (blocking-human) | ✓ User OK |
| Task 2: TRACER — multiline text case Row 区分 + 02_toc.svg 验证 | tracer | ✓ Complete |
| Task 3: mock SVG E2E `__tests__/content-key-mock.test.ts` | auto | ✓ Complete |

## 交付物

### `src/transformer/transform-to-pptel.ts`
在 multiline `tspanElements.map((tspan, idx) => ...)` 块(line 1799)末尾追加 D-09 Row 区分逻辑:
- `idx === 0`(Row 1, leading inline text)→ `if (contentKeyValue) result.contentKey = contentKeyValue`(来自 17-02 顶部 compute,返回 `directory_item_N`)
- `else`(Row 2..N, tspan[dy] descendants)→ 手工派生 `directory_item_desc_N`(正则匹配 `^toc-item-(\d+)-carrier$` 父 carrier id)
- 仅作用于 multiline 块,**不修改**单行 text case(17-02 已处理)
- 不触碰 `hasLineBreakTspans()`(D-10 无 dy 同行策略自动跟随)

### `__tests__/content-key-mock.test.ts` (new)
vitest mock SVG E2E 覆盖:
1. **CK-11 ~ CK-13**: `toc-item-5..8-{number,carrier,note-carrier}` 三类共 12 sub-class 全部命中(`directory_item_number_5..8` + `directory_item_5..8` + `directory_item_desc_5..8`)
2. **CK-13 multiline 拆分**: `toc-item-1-carrier` 内 `<tspan dy>` Row 1 → `directory_item_1`,Row 2..N → `directory_item_desc_1`(N 与父 carrier id 同步)
3. **CK-14 / CK-15 reverse**: `toc-rail-title` / `cover-date-carrier` / `chapter-x-template` / `random-unmapped-id` / `my-text` 字段省略(`undefined`,**不**为 `""`)
4. **CK-16 类型守卫**: `cover-title-carrier` / `toc-item-3-carrier` 命中映射表但元素是 `<rect>` 时,不带 contentKey
5. **CONTENT_KEY_VALUES invariant**: 包含 10 静态 + 24 动态,不含 N=9+ 越界值

## 验证

### 端到端 02_toc.svg multiline
```
row1: [directory_item_1, directory_item_2, directory_item_3, directory_item_4]
desc: [directory_item_desc_1, directory_item_desc_2, directory_item_desc_3, directory_item_desc_4]
toc-rail-title contentKey: undefined (PASS)
```
- ✓ Row 1 4 项(Row 1 各 carrier 的 leading inline)
- ✓ Row 2+ desc 4 项(每 carrier 内 1 个 `tspan[dy]` 拆分)
- ✓ `toc-rail-title` 反向断言 — 字段省略
- ✓ N=5+ 未越界(`directory_item_5` 等未命中)

### 测试套件
- ✓ `npm run build` 通过,strict mode 无 error
- ✓ `npm test -- content-key`: 53 tests passed(45 helper unit + 8 mock SVG E2E)
- ✓ v1.11 template-marking: 22 tests passed(13 unit + 9 E2E — 无回归)

## 决策落地

- D-09: Row 1 vs Row 2..N 区分写入 contentKey ✓
- D-10: 无 dy inline tspan 同行(随 `hasLineBreakTspans` 现有行为自动满足) ✓
- D-11: note-carrier 与 carrier-internal tspan[dy] 互斥 ✓(fixture 不并存,代码不做重叠处理)
- D-17: mock SVG E2E 覆盖 N=5..8 + multiline 拆分 + reverse assertion ✓

## 下一步

Wave 4: 17-04 — 20 fixture svg.json 重生 + fixture E2E `tests/e2e/green-art-teaching-content-key.test.ts`