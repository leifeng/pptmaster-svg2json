# Requirements — svg-to-pptel

## v1.2 Requirements (PPTist格式对齐)

### Transform (TRANS)

- [x] **TRANS-01**: Parse SVG `transform` attribute — support `translate(dx, dy)`, `rotate(deg, cx, cy)`, `scale(sx, sy)`
- [x] **TRANS-02**: `rotate(deg, cx, cy)` with center point — apply rotation around specified center, not origin
- [x] **TRANS-03**: Map parsed transform to PPTist `rotate`/`flipH`/`flipV` fields on element

### Text (TEXT)

- [x] **TEXT-01**: Map `text-anchor` (`start`/`middle`/`end`) to HTML `text-align` style in content
- [x] **TEXT-02**: Map `font-weight="bold"` to `<strong>` tag in HTML content
- [x] **TEXT-03**: Add `fill` field to PPTTextElement (text background color)
- [x] **TEXT-04**: Add `outline` field to PPTTextElement (text border)
- [x] **TEXT-05**: Add `shadow` field to PPTTextElement
- [x] **TEXT-06**: Add `vAlign` field to PPTTextElement (`top`/`middle`/`bottom`)
- [x] **TEXT-07**: Add `fixedHeight` field to PPTTextElement
- [x] **TEXT-08**: Add `wordSpace` field to PPTTextElement
- [x] **TEXT-09**: Add `paragraphSpace` field to PPTTextElement

### Gradient (GRAD)

- [x] **GRAD-01**: Parse SVG `<linearGradient>` and `<radialGradient>` from `defs`
- [x] **GRAD-02**: Extract gradient `stop-color` and `stop-opacity` into PPTist `gradient.colors[]`
- [x] **GRAD-03**: Resolve `fill="url(#gradientId)"` references to PPTist `gradient` object
- [x] **GRAD-04**: Support `gradient.type` (`linear`/`radial`) and `gradient.rotate`

### Opacity (OPAC)

- [x] **OPAC-01**: Map SVG element `fill-opacity` to PPTist `opacity` field
- [x] **OPAC-02**: Map SVG element `stroke-opacity` to PPTist `outline` opacity
- [x] **OPAC-03**: Map gradient `stop-opacity` to `gradient.colors[].color` alpha channel

### Shape Extensions (SHPE)

- [x] **SHPE-01**: Map `rx`/`ry` (rect corner radius) to PPTist `path` with rounded corners
- [x] **SHPE-02**: Add `gradient` field to PPTShapeElement for gradient fills
- [x] **SHPE-03**: Add `shadow` field to PPTShapeElement
- [x] **SHPE-04**: Map `flipH`/`flipV` from transform to PPTist fields

### Image Extensions (IMGE)

- [x] **IMGE-01**: Add `outline` field to PPTImageElement
- [x] **IMGE-02**: Add `shadow` field to PPTImageElement

### Line Extensions (LINE)

- [x] **LINE-01**: Map SVG `stroke-width` to PPTist `width` field on PPTLineElement

### Group (GROUP)

- [x] **GROUP-01**: Parse `id` attribute on `<g>` elements as `groupId` for related elements

## v1.1 Requirements (transform-fixes milestone — current)

### Transform System

- [x] **REQ-TF-01**: Apply SVG `rotate(deg, cx, cy)` with correct rotation center — implement rotate-around-center using translate → rotate → translate-back formula
- [x] **REQ-TF-02**: Fix ellipse center scaling — `cx`/`cy` must be scaled same as `rx`/`ry`
- [x] **REQ-TF-03**: Fix text baseline offset — use configurable `BASELINE_OFFSET_RATIO` constant

## v1.3 Requirements (resvg-js text measurement)

### Text Measurement

- [ ] **MEAS-01**: Install @resvg/resvg-js as a project dependency
- [ ] **MEAS-02**: Create `src/text-measurer.ts` module with `measureTextBBox()` function
- [ ] **MEAS-03**: Single-line text: merge boundingBoxes array into width/height
- [ ] **MEAS-04**: Multi-line text via tspan children: flatten with `\n`, merge all boxes
- [ ] **MEAS-05**: Propagate font-family, font-size, font-weight, font-style, letter-spacing to measurement SVG
- [ ] **MEAS-06**: Empty text fallback to heuristic (not zero-width)
- [ ] **MEAS-07**: Large enough viewBox to prevent clipping overflow
- [ ] **MEAS-08**: Modify `transformElement()` text case to use `measureTextBBox()` for width/height
- [ ] **MEAS-09**: Propagate async through `transformToPPTElement()` and `walk()`
- [ ] **MEAS-10**: Remove `calcTextWidthYaHei()` and `BASELINE_OFFSET_RATIO` after migration
- [ ] **MEAS-11**: Existing tests pass after migration (no regression)

## v1.4 Requirements (Directory Batch CLI)

### Batch CLI

- [ ] **BATCH-01**: User can provide a directory path as input
- [ ] **BATCH-02**: CLI reads all .svg files from the input directory
- [ ] **BATCH-03**: Each SVG is converted to JSON and saved to the same directory with .json extension
- [ ] **BATCH-04**: Existing JSON files are overwritten with the new conversion result
- [ ] **BATCH-05**: CLI outputs summary at the end: "Converted N files, M failed"
- [ ] **BATCH-06**: Failed conversions are skipped without stopping the batch
- [ ] **BATCH-07**: Invalid SVG files are logged with error message and skipped

## v1.7 Requirements (Path 合并优化)

### Path Merge (PATH-MERGE)

- [ ] **PATH-MERGE-01**: 决策树判断逻辑 — 当 `<g>` 子元素全为 `<path>` 时，按决策树判断是否合并
  - 检测所有 path 是否共享相同样式属性（fill, stroke, opacity, fill-rule 等）
  - 检测每个 path 是否有独立的语义/交互/可访问性需求（id, aria-*, 事件绑定）
  - 检测 fill="none" 或无重叠填充区域
  - 检测 fill-rule="evenodd"
  - 根据决策树返回合并/不合并/谨慎合并的建议

- [ ] **PATH-MERGE-02**: 公共样式属性提取 — 从多个 path 中提取共同样式属性
  - 遍历 `<g>` 内所有 path 的样式属性（fill, stroke, stroke-width, opacity, fill-rule 等）
  - 提取所有 path 共有的属性值作为合并后的公共样式
  - 不一致的属性值不合并

- [ ] **PATH-MERGE-03**: 重叠填充区域检测 — 包围盒计算与重叠判断
  - 计算每个 path 的包围盒（bounding box）
  - 检测包围盒是否有重叠区域
  - fill="none" 的 path 默认无重叠

- [ ] **PATH-MERGE-04**: fill-rule="evenodd" 特殊处理
  - 检测是否包含 fill-rule="evenodd"
  - 合并后可能改变镂空效果，标记为谨慎合并

- [ ] **PATH-MERGE-05**: 合并输出 — 将多个 path 的 d 属性拼接为单一 path
  - 多个 path 的 d 属性用空格连接
  - 继承 `<g>` 的 transform（如有）
  - 合并后的 path 使用公共样式属性
  - 输出元素数量减少

### Text Width/Height Passthrough (TEXT-WHPASS)

- [ ] **TEXT-WHPASS-01**: SVG `<text>` 同时声明有效 `width` 和 `height` 时，`transformElement` 跳过 `measureTextElement`
- [ ] **TEXT-WHPASS-02**: 直通尺寸按画布缩放输出：`width = parsedWidth * scaleX + TEXT_WIDTH_SAFETY_MARGIN`、`height = parsedHeight * scaleY`
- [ ] **TEXT-WHPASS-03**: 任一尺寸缺失、非数字、非正数或非有限数时，保留原有文本测量与 fallback 路径

## v2 Requirements (deferred)

- Full path command support (C/Q/A/S/T/Z) in bounding box calculation — currently only M/L/H/V parsed
- Matrix transform decomposition — currently detected and marked `special: true` but silently ignored
- SVG filter effects (blur, drop-shadow) — PPTElement doesn't support these
- Font fallback or multi-font text layout — single-font text only
- Configurable target canvas in API — 1000×562.5 is a stated constraint
- SVG clipPath — requires geometric clipping computation

## Out of Scope

| Feature | Reason |
|---------|--------|
| SVG filter effects (blur, drop-shadow) | PPTElement doesn't support these |
| Font fallback or multi-font text layout | Single-font text only |
| Configurable target canvas | 1000×562.5 is a stated constraint |
| SVGO optimization | Not needed for parsing, adds bundle size |
| Build system upgrades (tsup) | Deferred |
| Dependency upgrades | Deferred to after transform fixes stabilize |
| --output-dir option | User confirmed JSON goes to same directory as SVG |
| Skip existing files | Overwrite is faster and simpler for batch operations |

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| TRANS-01 | Phase 1 | Complete |
| TRANS-02 | Phase 1 | Complete |
| TRANS-03 | Phase 1 | Complete |
| TEXT-01 | Phase 2 | Complete |
| TEXT-02 | Phase 2 | Complete |
| TEXT-03 | Phase 2 | Complete |
| TEXT-04 | Phase 2 | Complete |
| TEXT-05 | Phase 2 | Complete |
| TEXT-06 | Phase 2 | Complete |
| TEXT-07 | Phase 2 | Complete |
| TEXT-08 | Phase 2 | Complete |
| TEXT-09 | Phase 2 | Complete |
| GRAD-01 | Phase 3 | Complete |
| GRAD-02 | Phase 3 | Complete |
| GRAD-03 | Phase 3 | Complete |
| GRAD-04 | Phase 3 | Complete |
| OPAC-01 | Phase 3 | Complete |
| OPAC-02 | Phase 3 | Complete |
| OPAC-03 | Phase 3 | Complete |
| SHPE-01 | Phase 4 | Complete |
| SHPE-02 | Phase 4 | Complete |
| SHPE-03 | Phase 4 | Complete |
| SHPE-04 | Phase 4 | Complete |
| IMGE-01 | Phase 4 | Complete |
| IMGE-02 | Phase 4 | Complete |
| LINE-01 | Phase 4 | Complete |
| GROUP-01 | Phase 4 | Complete |
| REQ-TF-01 | Phase 5 | Complete |
| REQ-TF-02 | Phase 5 | Complete |
| REQ-TF-03 | Phase 5 | Complete |
| MEAS-01 | Phase 6 | Pending |
| MEAS-02 | Phase 6 | Pending |
| MEAS-03 | Phase 6 | Pending |
| MEAS-04 | Phase 6 | Pending |
| MEAS-05 | Phase 6 | Pending |
| MEAS-06 | Phase 6 | Pending |
| MEAS-07 | Phase 6 | Pending |
| MEAS-08 | Phase 6 | Pending |
| MEAS-09 | Phase 6 | Pending |
| MEAS-10 | Phase 6 | Pending |
| MEAS-11 | Phase 6 | Pending |
| BATCH-01 | Phase 7 | Pending |
| BATCH-02 | Phase 7 | Pending |
| BATCH-03 | Phase 7 | Pending |
| BATCH-04 | Phase 7 | Pending |
| BATCH-05 | Phase 7 | Pending |
| BATCH-06 | Phase 7 | Pending |
| BATCH-07 | Phase 7 | Pending |
| PATH-MERGE-01 | — | Pending |
| PATH-MERGE-02 | — | Pending |
| PATH-MERGE-03 | — | Pending |
| PATH-MERGE-04 | — | Pending |
| PATH-MERGE-05 | — | Pending |
| TEXT-WHPASS-01 | Phase 11 | Pending |
| TEXT-WHPASS-02 | Phase 11 | Pending |
| TEXT-WHPASS-03 | Phase 11 | Pending |

**Coverage:**

- v1.7 requirements: 8 total (PATH-MERGE-01 ~ PATH-MERGE-05, TEXT-WHPASS-01 ~ TEXT-WHPASS-03)
- v1.4 requirements: 7 total
- v1.3 requirements: 11 total
- v1.2 requirements: 26 total
- v1.1 requirements: 3 total
- Mapped to phases: 50
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-27*
*Last updated: 2026-07-23 after Phase 11 requirement traceability sync*
