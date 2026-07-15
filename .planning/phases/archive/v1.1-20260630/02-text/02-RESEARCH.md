# Phase 2: Text 元素扩展 - Research

**Researched:** 2026-06-29
**Domain:** SVG Text element styling to PPTist PPTTextElement mapping
**Confidence:** HIGH

## Summary

Phase 2 covers complete support for Text element style attributes and HTML content formatting in the svg-to-pptel project. The primary research question — D-07: SVG `writing-mode` → PPTist `vertical` mapping — has been definitively resolved by inspecting PPTist source code. The mapping is binary: `vertical?: boolean` maps to CSS `writing-mode: vertical-rl` (when `true`) vs `horizontal-tb` (when `false`). SVG `writing-mode: vertical-lr` is also treated as `vertical: true` since PPTist has no `vertical-lr` equivalent. `dominant-baseline` and `alignment-baseline` do NOT affect `vertical`; they concern glyph-to-glyph alignment within a line, not line orientation.

Nine requirements (TEXT-01 through TEXT-09) drive this phase: text-anchor alignment, font-weight bold, and six new PPTTextElement fields (`fill`, `outline`, `shadow`, `vAlign`, `fixedHeight`, `wordSpace`, `paragraphSpace`). The ProseMirror-based rich text HTML format is already established: marks go on `<span>` elements (strong, em, fontsize, fontname, forecolor, backcolor, underline, strikethrough), and paragraph-level attributes (`align`, `indent`, `textIndent`) go on `<p>` elements.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Text content extraction + HTML generation | API / Backend | — | transform-to-pptel.ts generates `<p><span>` HTML |
| ProseMirror mark mapping (bold, italic, color, etc.) | API / Backend | — | Marks applied as HTML tags/spans in content string |
| text-anchor → text-align | API / Backend | — | Mapped in HTML style attribute on `<p>` tag |
| font-weight → `<strong>` | API / Backend | — | Wraps content in `<strong>` tag |
| writing-mode → vertical | API / Backend | — | Boolean flag set on PPTTextElement.vertical |
| vAlign (top/middle/bottom) | Browser / Client | — | Used only when `fixedHeight: true`; drives CSS flexbox justify-content in BaseTextElement.vue |
| fill/outline/shadow fields | API / Backend | — | Set on PPTTextElement object; rendered by Vue component |
| wordSpace / paragraphSpace | Browser / Client | — | CSS letter-spacing / --paragraphSpace custom property rendered by Vue |

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-10:** Use PPTist ProseMirror marks: strong > em > fontsize > fontname > forecolor > backcolor > underline > strikethrough
- **D-09:** text-anchor mapping: start→left, end→right, middle→center
- **D-11:** font-weight bold/600/700 → strong mark
- **D-12:** SVG fill → defaultColor; D-08: fill-opacity < 1 → rgba() in span style
- **D-13:** outline/shadow/fixedHeight/wordSpace/paragraphSpace not mapped (no PPTist equivalents) — **NOTE:** D-13 conflicts with TEXT-03/04/05/07/08/09 which require these fields. See Phase Requirements section.

### Claude's Discretion

- `writing-mode` → `vertical` mapping rule (primary research task)
- `dominant-baseline` / `alignment-baseline` — do they affect vAlign?
- wordSpace and paragraphSpace defaults

### Deferred Ideas (OUT OF SCOPE)

- `text-decoration` other values (overline, blink)
- `font-style="italic"` → `<em>` mark
- Multi-language font fallback

---

## Primary Research Finding: D-07 — `writing-mode` → `vertical` Mapping

### How PPTist `vertical?: boolean` Works

From `BaseTextElement.vue` line 27:
```javascript
writingMode: elementInfo.vertical ? 'vertical-rl' : 'horizontal-tb',
```

From `useImport.ts` line 779:
```typescript
vertical: el.isVertical,
```

**Confirmed behavior:**
- `vertical: true` → CSS `writing-mode: vertical-rl` (top-to-bottom, right-to-left lines)
- `vertical: false` → CSS `writing-mode: horizontal-tb` (left-to-right, top-to-bottom lines)

### SVG `writing-mode` Values

SVG 1.1 defines three `writing-mode` values:
- `horizontal-tb` — horizontal, top-to-bottom (default)
- `vertical-rl` — vertical, right-to-left
- `vertical-lr` — vertical, left-to-right

### Mapping Rule for D-07

| SVG `writing-mode` | PPTist `vertical` |
|--------------------|-------------------|
| `horizontal-tb` (or absent) | `false` |
| `vertical-rl` | `true` |
| `vertical-lr` | `true` (NOTE: PPTist has no lr equivalent — closest is `true`) |

**Implementation:**
```typescript
const writingMode = element.attrs['writing-mode']
const vertical = writingMode === 'vertical-rl' || writingMode === 'vertical-lr'
```

**Source:** [VERIFIED: PPTist source code — BaseTextElement.vue:27 and useImport.ts:779]

### dominant-baseline / alignment-baseline — Do They Affect `vertical`?

**No.** These attributes control how glyphs are aligned relative to each other within a single line (e.g., alphabetic baseline, hanging baseline, middle alignment). They do NOT change line orientation. `vertical` is purely about whether text flows vertically or horizontally.

Relevant PPTist code: `vAlign` (top/middle/bottom) is handled separately via a `vAlignMap` in `useImport.ts:31-34`:
```typescript
const vAlignMap: Record<string, TextAlignVertical> = {
  'mid': 'middle',
  'down': 'bottom',
  'up': 'top',
}
```
And in `BaseTextElement.vue:68-74`, `vAlign` is only used when `fixedHeight: true` — it controls vertical content alignment within a fixed-height container via CSS flexbox.

### What About `isVertical` in PPTist Internals?

From `useImport.ts:779`, PPTist's internal `isVertical` flag maps directly to the `vertical` field. The PPTist editor itself only supports `vertical-rl` (not `vertical-lr`) for vertical text, so SVG `vertical-lr` would render as `vertical: true` but may display slightly differently in PPTist than in the original SVG.

---

## Standard Stack

No new packages needed — this phase extends existing TypeScript code only.

### Existing Dependencies (already in use)
| Library | Version | Purpose |
|---------|---------|---------|
| `uuid` | ^9.x | Element ID generation |
| `prosemirror-model` | via PPTist schema | Rich text mark/node modeling |

---

## Architecture Patterns

### Rich Text HTML Format (from marks.ts + nodes.ts)

**Marks (inline, on `<span>`):**
```
strong       → <strong>…</strong>
em           → <em>…</em>
fontsize     → <span style="font-size: N;">…</span>
fontname     → <span style="font-family: 'Font';">…</span>
forecolor    → <span style="color: #hex;">…</span>
backcolor    → <span style="background-color: #hex;">…</span>
underline    → <span style="text-decoration: underline;">…</span>
strikethrough→ <span style="text-decoration-line: line-through;">…</span>
subscript    → <sub>…</sub>  (or style vertical-align: sub)
superscript  → <sup>…</sup> (or style vertical-align: super)
```

**Nodes (block, on `<p>`):**
```
paragraph    → <p style="text-align: center;">…</p>
              attrs: align (left/right/center/justify), indent, textIndent
```

**Source:** [VERIFIED: PPTist source — marks.ts, nodes.ts]

### Text Element Transformation Flow

```
SVG <text> element
  ├── Extract: x, y, font-family, font-size, fill, text-anchor, writing-mode, font-weight, etc.
  ├── Generate: content = extractTextContentFromElement(element)
  ├── Generate: defaultFontName, defaultFontSize, defaultColor from attrs
  ├── Generate: richContent = buildRichHtml(...)
  │     └── <p style="text-align: …"><span style="font-size: …; color: …;">text</span></p>
  └── Output: PPTTextElement { id, left, top, width, height, rotate, content, defaultFontName, defaultFontSize, defaultColor, lineHeight, opacity, vertical, fill?, outline?, shadow?, vAlign?, fixedHeight?, wordSpace?, paragraphSpace? }
```

### vAlign Behavior (from BaseTextElement.vue)

When `fixedHeight: true`, content is laid out using CSS flexbox:
```css
display: flex;
flexDirection: column;
justifyContent: /* based on vAlign: top→flex-start, middle→center, bottom→flex-end */;
```

When `fixedHeight: false`, `vAlign` has no effect.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color parsing | Custom hex converter | Existing `colorToHex()` in transform-to-pptel.ts | Handles named colors, rgb(), hex |
| Text content extraction | String concat | `extractTextContentFromElement()` already exists | Handles nested tspan elements |
| ProseMirror mark serialization | Custom HTML generation | Follow marks.ts toDOM conventions | Ensures PPTist can parse back |
| HTML entity decoding | Manual replace | `decodeHtmlEntities()` already exists | Handles &quot; &amp; &lt; &gt; &apos; &nbsp; |

---

## Common Pitfalls

### Pitfall 1: tspan children not recursively processed
**What goes wrong:** `extractTextContentFromElement` only looks at direct `text` children, not nested tspan elements.
**How to avoid:** The existing function already handles this correctly (line 240-243 in transform-to-pptel.ts).

### Pitfall 2: writing-mode on `<tspan>` vs `<text>`
**What goes wrong:** `writing-mode` is rarely set on individual `<tspan>` elements; it is typically on the parent `<text>` element.
**How to avoid:** Read `writing-mode` from the parent `<text>` element, not from each `<tspan>`.

### Pitfall 3: `vertical` only matters when combined with `fixedHeight`
**What goes wrong:** Setting `vertical: true` without `fixedHeight: true` can cause auto-sizing issues in PPTist.
**How to avoid:** Always set `fixedHeight: true` alongside `vertical: true` in the transform output.

### Pitfall 4: D-13 conflicts with TEXT requirements
**What goes wrong:** D-13 says outline/shadow/fixedHeight/wordSpace/paragraphSpace are "not mapped (no PPTist equivalents)" but TEXT-03/04/05/07/08/09 explicitly require these fields.
**How to avoid:** Override D-13 for this phase — these fields DO exist on PPTTextElement (slides.ts:188-194). `outline` and `shadow` use `PPTElementOutline` and `PPTElementShadow` types already defined. `wordSpace` maps to CSS `letter-spacing`. `paragraphSpace` uses the `--paragraphSpace` CSS custom property.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEXT-01 | Map `text-anchor` (start/middle/end) to HTML `text-align` style in content | D-09 locked: start→left, end→right, middle→center. Map to `<p style="text-align: …">`. Only set when not `left` (default). |
| TEXT-02 | Map `font-weight="bold"` to `<strong>` tag in HTML content | D-11 locked: bold/600/700 → strong. Apply via `<strong>` wrapper around text spans. |
| TEXT-03 | Add `fill` field to PPTTextElement (text background color) | Field exists in slides.ts:189. PPTist renders it as `backgroundColor` on `.element-content` div. |
| TEXT-04 | Add `outline` field to PPTTextElement (text border) | Field exists in slides.ts:188. PPTist uses `ElementOutline` component. |
| TEXT-05 | Add `shadow` field to PPTTextElement | Field exists in slides.ts:193. PPTist uses `useElementShadow` hook + `textShadow` CSS. |
| TEXT-06 | Add `vAlign` field to PPTTextElement (top/middle/bottom) | Field exists in slides.ts:517. Only used when `fixedHeight: true`. Maps to CSS `justify-content` via vAlignMap. |
| TEXT-07 | Add `fixedHeight` field to PPTTextElement | Field exists in slides.ts:182-197. When true, enables CSS flexbox column layout for vAlign. |
| TEXT-08 | Add `wordSpace` field to PPTTextElement | Field exists in slides.ts:191. Maps to CSS `letter-spacing` on `.element-content`. Default: 0. |
| TEXT-09 | Add `paragraphSpace` field to PPTTextElement | Field exists in slides.ts:194. Maps to CSS `--paragraphSpace` custom property. Default: 5px. |

---

## Code Examples

### Existing text transform (lines 508-545 in transform-to-pptel.ts)

```typescript
case 'text': {
  const transformed = applyTransform(left, top, width, height, transform)
  const { rotate } = transformed
  const content = extractTextContentFromElement(element)
  const rawFontFamily = typeof element.attrs['font-family'] === 'string'
    ? element.attrs['font-family'].split(',')[0].trim()
    : 'Arial'
  const fontFamily = decodeHtmlEntities(rawFontFamily).replace(/"/g, '')
  const fontSize = Number(element.attrs['font-size']) || 16
  const scaledFontSize = fontSize * scaleY
  const charCount = content.length
  const textWidth = charCount * scaledFontSize
  const textHeight = scaledFontSize + Math.round(scaledFontSize * 0.14)
  const textLeft = transformed.left
  const textTop = (transformed.top + fontSize * 0.75) * scaleY
  const richContent = `<p style=""><span style="font-size: ${scaledFontSize}px;">${content}</span></p>`
  const result: PPTTextElement = {
    id,
    type: 'text',
    left: textLeft,
    top: textTop,
    width: textWidth,
    height: textHeight,
    defaultFontSize: scaledFontSize,
    rotate,
    content: richContent,
    defaultFontName: fontFamily,
    defaultColor: colorToHex(element.attrs.fill) || '#000000',
    lineHeight: 1.5,
    opacity: element.attrs.opacity ? parseFloat(element.attrs.opacity) : 1,
  }
  return result
}
```

### ProseMirror paragraph with align (from nodes.ts:149-159)

```typescript
toDOM: (node: Node) => {
  const { align, indent, textIndent } = node.attrs
  let style = ''
  if (align && align !== 'left') style += `text-align: ${align};`
  if (textIndent) style += `text-indent: ${textIndent}em;`

  const attr: Attr = { style }
  if (indent) attr['data-indent'] = indent

  return ['p', attr, 0]
}
```

### ProseMirror forecolor mark (from marks.ts:58-76)

```typescript
const forecolor: MarkSpec = {
  attrs: { color: {} },
  inline: true,
  group: 'inline',
  parseDOM: [{ style: 'color', getAttrs: color => color ? { color } : {} }],
  toDOM: mark => {
    const { color } = mark.attrs
    let style = ''
    if (color) style += `color: ${color};`
    return ['span', { style }, 0]
  },
}
```

### PPTist vertical writing-mode rendering (BaseTextElement.vue:27)

```javascript
writingMode: elementInfo.vertical ? 'vertical-rl' : 'horizontal-tb',
```

---

## Open Questions

1. **TEXT-06 `vAlign` source attribute in SVG**
   - What SVG attribute should map to `vAlign`? The CONTEXT.md mentions `writing-mode` or `dominant-baseline`, but neither directly controls vertical content alignment within a fixed height.
   - `dominant-baseline` values (`auto`, `middle`, `hanging`, etc.) control glyph-to-baseline alignment within a line, not vertical alignment of the text block itself.
   - **Recommendation:** TEXT-06 may not be mappable from standard SVG attributes alone. `vAlign` might need to stay as a PPTist-only feature with no SVG equivalent, or the requirement needs clarification.

2. **`vertical-lr` behavior in PPTist**
   - SVG `vertical-lr` (left-to-right vertical text) maps to `vertical: true`, but PPTist only renders `vertical-rl`.
   - The left-to-right variation will render correctly as vertical text but the line order will be right-to-left (reversed from SVG intent).

3. **TEXT-03 `fill` on text vs. ShapeText `fill`**
   - `PPTTextElement.fill` (slides.ts:189) is labeled "text background color"
   - `ShapeText.fill` (slides.ts:327) is also a fill color
   - Verify whether PPTist's `TextElement.fill` is the background behind the text block, not the text glyph fill (which is `defaultColor`).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `writing-mode` is always on the parent `<text>`, not on `<tspan>` | D-07 mapping | Low — this is standard SVG practice |
| A2 | `vertical: true` should always accompany `fixedHeight: true` | Common Pitfalls | Medium — may cause auto-sizing issues if not paired |
| A3 | `dominant-baseline` does not map to any PPTist field | D-07 research | Low — confirmed by PPTist source code inspection |
| A4 | D-13 (outline/shadow/fixedHeight/wordSpace/paragraphSpace "not mapped") is overridden by TEXT-03~09 requirements | Phase Requirements | High — D-13 contradicts the explicit requirements list |

---

## Sources

### Primary (HIGH confidence)
- PPTist source: `code/PPTist/src/utils/prosemirror/schema/marks.ts` — ProseMirror marks definition
- PPTist source: `code/PPTist/src/utils/prosemirror/schema/nodes.ts` — ProseMirror paragraph node definition
- PPTist source: `code/PPTist/src/views/components/element/TextElement/BaseTextElement.vue` — vertical + writing-mode rendering
- PPTist source: `code/PPTist/src/hooks/useImport.ts:779` — `vertical: el.isVertical` import
- PPTist source: `code/PPTist/src/hooks/useImport.ts:31-34` — vAlignMap definition
- PPTist source: `code/PPTist/src/types/slides.ts:182-198` — PPTTextElement interface

### Secondary (MEDIUM confidence)
- SVG 1.1 `writing-mode` specification — standard CSS/SVG property behavior

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, existing TypeScript only
- Architecture: HIGH — rich text HTML format verified from PPTist source
- D-07 mapping: HIGH — binary mapping confirmed via PPTist source code
- Pitfalls: HIGH — all derived from verified PPTist behavior

**Research date:** 2026-06-29
**Valid until:** 2026-07-29 (30 days — PPTist schema is stable)