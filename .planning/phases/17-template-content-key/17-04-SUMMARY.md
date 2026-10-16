---
phase: 17-template-content-key
plan: 04
type: execute
wave: 4
completed_at: 2026-10-16
---

# 17-04 SUMMARY: fixture JSON 重生 + fixture E2E

## 任务状态

| Task | Type | Status |
|------|------|--------|
| Task 1: convertDir 重生 20 个 svg.json fixture | auto | ✓ Complete |
| Task 2: fixture E2E `tests/e2e/green-art-teaching-content-key.test.ts` | auto | ✓ Complete |

## 交付物

### Fixture JSON 重生(D-16)
- 20 个 `exampels/green-art-teaching/svg_output/*.svg.json` 通过 `convertDir()` 同步重生成
- 全部 20 个 svg.json 含 `contentKey` 字段(20/40 SVG 含 contentKey 映射 id 全部命中)
- `npm run build` + convertDir 跑通,无 transformer 错误

### `tests/e2e/green-art-teaching-content-key.test.ts` (new)
v1.11 E2E pattern 镜像,14 个 it() 覆盖:
1. fixture path resolved (skip if absent)
2. converts all 20 SVG files into slides
3. 01_cover has exactly 3 cover_* contentKey (CK-01/02/03)
4. 02_toc Row 1 has 4 directory_item_1..4 (CK-11/12)
5. 02_toc Row 2 has 4 directory_item_desc_1..4 (CK-13)
6. 03_chapter has exactly 3 chapter_* contentKey (CK-04/05/06)
7. 04_content has exactly 2 content_* contentKey (CK-07/08)
8. 20_ending has exactly 2 end_* contentKey (CK-09/10)
9. all 20 slides contentKey ⊆ CONTENT_KEY_VALUES (CK-14 reverse)
10. all 20 slides no null/empty/non-whitelisted contentKey (CK-15 strict)
11. all 20 slides non-text elements do NOT carry contentKey (CK-16 type guard)
12. all 20 slides no N≥5 contentKey (CK-17 fixture scope)
13. cover-date-carrier 不带 contentKey (CK-14 reverse)
14. toc-rail-title 不带 contentKey (CK-14 reverse)

## 验证

### Fixture 重生
- `convertDir('exampels/green-art-teaching')` 输出 `{success: true, slides: 20}`
- `ls *.svg.json | wc -l` = 20
- `grep -l '"contentKey"' *.svg.json | wc -l` = 20(全部含 contentKey)

### 测试套件
```
✓ __tests__/content-key.test.ts (45 tests)
✓ __tests__/content-key-mock.test.ts (8 tests)
✓ tests/e2e/green-art-teaching-content-key.test.ts (14 tests)
✓ tests/e2e/green-art-teaching-template-marking.test.ts (9 tests, v1.11 E2E)

Test Files  4 passed (4)
Tests       76 passed (76)
```
- ✓ v1.12 release gate 命中:CK-01 ~ CK-17 全部需求在 fixture + mock + unit 三层测试覆盖
- ✓ 既有 v1.11 (templateType=1 + contentBounds + E2E)无回归
- ✓ TypeScript strict mode 通过

## 决策落地

- D-15: 混合测试策略(unit + mock + fixture E2E 三层覆盖) ✓
- D-16: fixture 重生范围 20 个 SVG(.svg.json 重生是 convertDir 内置行为) ✓
- D-17: mock SVG E2E + fixture E2E 双层覆盖 ✓

## 整体 v1.12 release gate

| 决策 | 落地位置 |
|------|----------|
| D-01 | `src/slides.ts` PPTBaseElement 新增 contentKey 字段 |
| D-02 | `src/utils/content-key.ts` `CONTENT_KEY_VALUES` 单一来源派生 |
| D-04/D-05 | `src/utils/content-key.ts` 独立 helper 模块 |
| D-06 | 10 条静态映射(cover/chapter/content/closing) |
| D-07 | TOC 1..8 动态上限锁定 |
| D-08 | 顶层预构建 Map + O(1) lookup |
| D-09 | multiline Row 1 vs Row 2..N 区分 |
| D-12 | transformElement 顶部 compute contentKeyValue |
| D-13 | 单行 text case 末尾写入 |
| D-14 | path-merge 分支由守卫隐含覆盖 |
| D-15 | 混合测试策略三层覆盖 |
| D-16 | 20 fixture 重生 |
| D-17 | mock SVG E2E + fixture E2E 双层 |

## 下一步

阶段 17 全部 4 个 plan 完成。建议用户运行 `/gsd-verify-work 17` 进行 UAT 验证 + 阶段关闭。