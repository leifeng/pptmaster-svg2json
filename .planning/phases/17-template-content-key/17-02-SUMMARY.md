---
phase: 17-template-content-key
plan: 02
type: execute
wave: 2
completed_at: 2026-10-16
---

# 17-02 SUMMARY: contentKey 字段 + 单行 text case 注入

## 任务状态

| Task | Type | Status |
|------|------|--------|
| Task 1: D-01 contentKey 字段位置 PPTBaseElement | checkpoint:decision (blocking-human) | ✓ User OK |
| Task 2: TRACER — 字段声明 + transformElement() 顶部 compute + 单行 text case 末尾写入 | tracer | ✓ Complete |

## 交付物

### `src/slides.ts`
- `PPTBaseElement` interface 在 `templateType?: 1` 字段后新增 `contentKey?: string` 字段
- 含 JSDoc 注释说明 Phase 17 / v1.12 CK-01 ~ CK-17 用途与字段省略语义
- `PPTTextElement extends PPTBaseElement` 自然继承,无需重复声明

### `src/transformer/transform-to-pptel.ts`
3 处修改:
1. **顶部 import**:`import { getContentKeyFor } from '../utils/content-key'`
2. **transformElement() 顶部**:在 `elementId` 之后追加 `contentKeyValue = elementId !== undefined ? getContentKeyFor(elementId) : undefined`(严格模式守卫 undefined)
3. **单行 text case 末尾**(line 1849 附近):在 `if (isTemplate) result.templateType = 1` 后追加 `if (contentKeyValue) result.contentKey = contentKeyValue`
- **CK-16 类型守卫**:8 个非文本 case (rect/circle/ellipse/path/polygon/polyline/line/image) 不写 contentKey

## 验证

### 端到端 01_cover.svg
```
V1 with: ["cover_title","cover_subtitle","cover_author"]
V1 text-no-ckey: ["cover-date-carrier"]
V1 cover-date-carrier in text-no-ckey: true
V2 non-text-with-ckey: 0
```

- ✓ 精确 3 个 element 带 cover_title/subtitle/author(CK-01/02/03)
- ✓ `cover-date-carrier` 不带 contentKey(CK-14 反向断言 — 未映射 id 字段省略)
- ✓ 04_content.svg 非文本元素 0 个 contentKey(CK-16 类型守卫)

### 测试套件
- ✓ `npm run build` 通过,TypeScript strict mode 无 error
- ✓ `npm test -- content-key template-marking`:67 tests passed(45 content-key + 13 v1.11 template-marking + 9 E2E)
- ✓ v1.11 template-marking E2E 无回归
- ✓ 13 个 pre-existing shape-rx 测试失败与本次工作无关(在我修改前已失败)

## 决策落地

- D-01: contentKey 字段位置 PPTBaseElement ✓
- D-03: contentKey 与 templateType=1 独立判定(同 PPTBaseElement 可各带其一) ✓
- D-12: transformElement() 顶部 compute (统一查询) ✓
- D-13: 仅 text case 末尾写(CK-16 类型守卫) ✓
- D-14: path-merge 分支由守卫隐含覆盖 ✓
- 字段省略语义:`if (contentKeyValue)` 守卫,未命中不写入(不是 null/undefined) ✓

## 下一步

Wave 3: 17-03 — multiline text case Row 1 vs Row 2..N 区分 + mock SVG E2E