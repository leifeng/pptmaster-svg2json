# Project Research Summary

**Project:** svg-to-pptel v1.3 — resvg-js text measurement
**Domain:** SVG to PowerPoint JSON conversion library (TypeScript)
**Researched:** 2026-06-30
**Confidence:** MEDIUM-HIGH

## Executive Summary

The v1.3 milestone replaces the heuristic character-width estimation (`calcTextWidthYaHei()`) with accurate rendered glyph metrics via `@resvg/resvg-js`. Research confirms `@resvg/resvg-js` is a zero-dependency NAPI native addon (no WASM) that provides `boundingBoxes()` returning an array of `{x, y, width, height}` boxes. The correct integration point is the `text` case in `transformElement()` within `transform-to-pptel.ts` — the parser stays untouched, the public `convert()` API remains unchanged (already async).

Key technical findings: `boundingBoxes()` returns an **array** (not single box) — multi-line text produces multiple boxes that must be merged via min/max computation. Multi-line via `<tspan>` children must be flattened with `\n` separators and rendered as a single SVG. All font-affecting attributes must be passed to the measurement SVG. WASM initialization is lazy via dynamic `import()`.

Critical pitfalls: multiple boxes must be merged, empty text must fallback to heuristic (not zero), viewBox must be large enough to contain rendered text without clipping.

## Key Findings

### Recommended Stack

**Core library:** `@resvg/resvg-js` 2.6.2 — NAPI native addon, zero dependencies, auto-loads native binary in Node.js. No WASM init needed.

**Installation:**
```bash
npm install @resvg/resvg-js
```

**Cross-platform note:** For CI consistency, consider bundling a `.ttf` font file. On Windows the system YaHei font is available; Linux CI may lack it.

### Expected Features

**Must have (table stakes):**
- Single-line text width/height via `boundingBoxes()` array merge
- Multi-line text via tspan flattening with `\n` separators
- Font-family, font-size, font-weight, font-style, letter-spacing propagation
- Empty text fallback to heuristic (not zero-width)
- Large enough viewBox to prevent clipping

**Differentiators:**
- Real glyph metrics replace character-class width ratios — eliminates ~15-20% width estimation error

**Anti-features to avoid:**
- Do NOT try to get per-character widths from `boundingBoxes()` — returns clusters, not individual glyphs
- Do NOT render each tspan separately — must render merged content as single SVG

### Architecture Approach

**Integration point:** `transformElement()` text case in `transform-to-pptel.ts` — NOT the parser

**New component:** `src/text-measurer.ts` with `measureTextBBox()` and `buildMeasurementSvg()`

**Build order:**
1. `npm install @resvg/resvg-js`
2. Create `src/text-measurer.ts`
3. Modify `transformElement()` text case to call measurer
4. Propagate async (transformToPPTElement, walk, convert)

**Key design decisions:**
- WASM init: lazy singleton via dynamic `import()`
- Per-element await in element loop (acceptable given user OK with performance cost)
- viewBox: generous initial size + overflow detection

### Critical Pitfalls

1. **Multiple bounding boxes** — `boundingBoxes()` returns array; must merge via min/max (not take `[0]` only)
2. **Empty text returns no bounding box** — fallback to heuristic, not `{width:0, height:0}`
3. **viewBox overflow clips bounding box** — must detect and resize viewBox before re-rendering
4. **Tspan children ignored** — must flatten all tspans with `\n` before rendering
5. **Per-element await serializes** — 50 text elements = 50 sequential awaits (accepted tradeoff)

## Implications for Roadmap

Based on research, v1.3 is a **single-phase implementation**:

### Phase 6: resvg-js Text Measurement

**Rationale:** Self-contained change — one new module + targeted modifications to existing transformer.

**Delivers:**
- `src/text-measurer.ts` module with `measureTextBBox()`
- Modified `transformElement()` text case using real bounding box
- Removed `calcTextWidthYaHei()` and `BASELINE_OFFSET_RATIO` after migration

**Implements:**
- STACK: `@resvg/resvg-js` integration
- FEATURES: boundingBoxes merge, tspan flattening, font attr propagation
- PITFALLS: empty fallback, viewBox overflow guard, multi-box merge

**Addresses:**
- Table stakes: single-line width/height, multi-line via tspan flatten
- Differentiator: real glyph metrics replacing heuristic estimation

### Phase Ordering Rationale

Single phase — all work is localized to the text measurement boundary. No dependency chain issues.

### Research Flags

- **fontFiles for CI:** Whether to bundle YaHei `.ttf` for cross-platform CI consistency
- **Memory cleanup:** Whether `resvg.free()` exists for explicit WASM heap cleanup after batch processing
- **Mixed-script fragmentation:** When CJK and Latin chars mix, does `boundingBoxes()` produce separate boxes?

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | npm API well-documented, NAPI variant correct for Node.js |
| Features | HIGH | API behavior confirmed from npm docs and Rust source |
| Architecture | HIGH | Integration point clearly identified from code analysis |
| Pitfalls | MEDIUM-HIGH | 5 pitfalls documented; some from API analysis vs confirmed bugs |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **ViewBox overflow detection:** Implementation needs to detect when rendered bbox exceeds viewBox and re-render with larger viewBox
- **Font file bundling:** Decide whether to bundle `.ttf` for CI or rely on system fonts
- **Memory management:** Whether to call any explicit cleanup between text measurements

## Sources

### Primary (HIGH confidence)
- npm `@resvg/resvg-js` package — API docs, type signatures
- Rust/resvg source analysis — `boundingBoxes()` behavior
- Existing `transform-to-pptel.ts` code analysis — integration point identification

### Secondary (MEDIUM confidence)
- Architecture analysis of pipeline — integration patterns inferred
- Pitfall patterns from API analysis — some not confirmed bugs

---
*Research completed: 2026-06-30*
*Ready for roadmap: yes*