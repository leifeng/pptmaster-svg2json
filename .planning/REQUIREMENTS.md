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

**Coverage:**

- v1.3 requirements: 11 total
- v1.2 requirements: 26 total
- v1.1 requirements: 3 total
- Mapped to phases: 40
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-27*
*Last updated: 2026-07-01 after v1.3 resvg-js text measurement requirements*
