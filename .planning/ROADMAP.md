# Roadmap — svg-to-pptel

## Current Milestone: v1.2 PPTist格式对齐

## Phases

- [ ] **Phase 1: Transform 系统重构** — 完整解析 SVG transform 属性
- [ ] **Phase 2: Text 元素扩展** — text-anchor/font-weight/扩展字段
- [ ] **Phase 3: Gradient 和 Opacity** — 渐变解析和透明度映射
- [ ] **Phase 4: Shape/Image/Line/Group 扩展** — 补充缺失字段
- [ ] **Phase 5: v1.1 Transform 遗留修复** — rotate中心/ellipse/baseline

---

## Phase Details

### Phase 1: Transform 系统重构

**Goal**: 完整解析 SVG transform 属性，支持 rotate/scale/translate

**Requirements**: TRANS-01, TRANS-02, TRANS-03

**Success Criteria** (what must be TRUE):

1. `transform="rotate(45, 100, 100)"` 正确应用旋转，元素围绕 (100,100) 旋转
2. `transform="translate(10, 20) scale(2)"` 正确应用平移和缩放
3. 解析结果正确映射到 PPTist 的 `rotate`/`flipH`/`flipV` 字段

**Mode:** mvp

**Plans:** 2 plans

Plans:

- [ ] 01-01-PLAN.md — Wave 0: Create TDD test files for TRANS-01/02/03
- [ ] 01-02-PLAN.md — Wave 1: Implement transform system (apply-transform.ts, wire into transformElement)

**Cross-cutting constraints:**

- parseTransform() correctly extracts translate/scale/rotate/rotateCX/rotateCY from transform string
- rotate(deg, cx, cy) with explicit center pre-transforms element coordinates using translate->rotate->translate-back formula
- rotate(deg) without center sets PPTElement.rotate to rotateDeg
- scale(-1, 1) sets flipH: true on PPTElement
- scale(1, -1) sets flipV: true on PPTElement

---

### Phase 2: Text 元素扩展

**Goal**: 完整支持 Text 元素的样式属性和 HTML 内容格式化

**Requirements**: TEXT-01, TEXT-02, TEXT-03, TEXT-04, TEXT-05, TEXT-06, TEXT-07, TEXT-08, TEXT-09

**Success Criteria** (what must be TRUE):

1. `text-anchor="middle"` 生成 `style="text-align: center"` 在 `<p>` 标签
2. `font-weight="bold"` 生成 `<strong>` 标签
3. Text 元素输出包含 `fill`/`outline`/`shadow`/`vAlign`/`fixedHeight`/`wordSpace`/`paragraphSpace` 字段

**Mode:** mvp

---

### Phase 3: Gradient 和 Opacity

**Goal**: 支持 SVG 渐变定义和透明度映射

**Requirements**: GRAD-01, GRAD-02, GRAD-03, GRAD-04, OPAC-01, OPAC-02, OPAC-03

**Success Criteria** (what must be TRUE):

1. `<radialGradient>` 和 `<linearGradient>` 被正确解析
2. `fill="url(#gradientId)"` 解析为 PPTist `gradient` 对象
3. `stop-opacity` 和元素 `fill-opacity`/`stroke-opacity` 正确映射到 alpha 通道
4. `gradient.colors[]` 包含正确的 `pos` 和 `color`（带 alpha）

**Mode:** mvp

---

### Phase 4: Shape/Image/Line/Group 扩展

**Goal**: 补充各类型元素的缺失字段

**Requirements**: SHPE-01, SHPE-02, SHPE-03, SHPE-04, IMGE-01, IMGE-02, LINE-01, GROUP-01

**Success Criteria** (what must be TRUE):

1. `<rect rx="8">` 生成带圆角的 path
2. Shape 元素支持 `gradient` 和 `shadow` 字段
3. Image 元素支持 `outline` 和 `shadow` 字段
4. Line 元素正确映射 `stroke-width` 到 `width` 字段
5. `<g id="header">` 的子元素带有 `groupId: "header"`

**Mode:** mvp

---

### Phase 5: v1.1 Transform 遗留修复

**Goal**: 完成 v1.1 未解决的 transform 问题

**Requirements**: REQ-TF-01, REQ-TF-02, REQ-TF-03

**Success Criteria** (what must be TRUE):

1. SVG `rotate(deg, cx, cy)` with explicit rotation center produces correct PPTElement coordinates
2. Ellipse `cx`/`cy` are correctly scaled like `rx`/`ry`
3. Text baseline offset uses configurable `BASELINE_OFFSET_RATIO` constant (default 0.75)

**Mode:** mvp

---

## Progress

| Phase | Requirements | Completed |
|-------|-------------|-----------|
| Phase 1: Transform 系统重构 | TRANS-01~03 (3) | 0/3 |
| Phase 2: Text 元素扩展 | TEXT-01~09 (9) | 0/9 |
| Phase 3: Gradient 和 Opacity | GRAD-01~04, OPAC-01~03 (7) | 0/7 |
| Phase 4: Shape/Image/Line/Group 扩展 | SHPE-01~04, IMGE-01~02, LINE-01, GROUP-01 (8) | 0/8 |
| Phase 5: v1.1 Transform 遗留修复 | REQ-TF-01~03 (3) | 0/3 |

**Total:** 0/29 requirements complete

---

*Roadmap created: 2026-06-27 for milestone v1.2 PPTist格式对齐*
