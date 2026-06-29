# Phase 3: Gradient 和 Opacity - Discussion Log

**Discussed:** 2026-06-29
**Mode:** default (interactive)

## Areas Discussed

### 1. Gradient defs storage
- **Question:** Where should parsed `<linearGradient>` / `<radialGradient>` definitions be stored?
- **Options:** Parser registry (Map<id, GradientDef>) / Element tree / Lazy element-level lookup
- **Decision:** Parser registry — clean separation, transformer just looks up by ID
- **Annotation:** slides.ts already has Gradient interface ready

### 2. Fill reference resolution
- **Question:** When should `fill="url(#id)"` resolve to a PPTist gradient object?
- **Options:** At parse time / At transform time
- **Decision:** At parse time — parser resolves url(#id) immediately, transformer just uses attrs.gradient

### 3. Alpha channel encoding
- **Question:** How should SVG stop-opacity (0–1) map to PPTist GradientColor?
- **Options:** rgba() in color string / Multiplied into color at parse time
- **Decision:** rgba() in color string — consistent with D-08, no schema change needed

### 4. Gradient rotate mapping
- **Question:** How to map SVG linearGradient gradientTransform to PPTist gradient.rotate?
- **Options:** Extract rotation from matrix / Pure rotate only
- **Decision:** Extract rotation from matrix — supports rotate(N) and matrix with rotation

### 5. OPAC-01/02 — fill-opacity / stroke-opacity
- **Question:** How should SVG fill-opacity and stroke-opacity map to PPTist?
- **Options:** Consistent with D-08 (rgba() in color) / Use opacity field
- **Decision:** Consistent with D-08 — fill-opacity → rgba() in color, stroke-opacity → outline opacity, element opacity → opacity field

---

*Phase: 3-Gradient 和 Opacity*
*Discussion completed: 2026-06-29*
