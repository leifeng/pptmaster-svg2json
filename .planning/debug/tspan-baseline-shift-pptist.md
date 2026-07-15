---
slug: tspan-baseline-shift-pptist
title: tspan baseline-shift SVG to JSON conversion issue
status: in_progress
created: 2026-07-10
symptoms:
  - SVG tspan elements with baseline-shift="super" or baseline-shift="sub" not displaying correctly in pptist
  - The baseline-shift attribute is lost or not properly converted to pptist's text format
  - Superscript and subscript text appears inline instead of shifted up/down
root_cause: "The extractTextContentFromElement function in transform-to-pptel.ts discards all tspan attributes including baseline-shift. The text case handler only uses parent text element attributes and does not process tspan children individually."
hypothesis: "The extractTextContentFromElement function extracts only text content from tspan children, ignoring the baseline-shift attribute. This causes superscript/subscript to render as normal inline text."
investigation:
  - file: src/transformer/transform-to-pptel.ts
    line: 577-591
    finding: "extractTextContentFromElement recursively extracts text from tspan children but discards ALL attributes including baseline-shift. It only returns the text content as a plain string with newlines."
  - file: src/transformer/transform-to-pptel.ts
    line: 1072-1201
    finding: "The text case handler in transformElement only uses parent text element attributes (font-family, font-size, fill, font-weight, font-style) for styling. It does not process tspan children individually."
  - file: code/PPTist/src/utils/prosemirror/schema/marks.ts
    line: 4-26
    finding: "PPTist's ProseMirror schema defines 'subscript' and 'superscript' marks that recognize either HTML tags (sub/sup) or CSS style (vertical-align: sub/super)."
  - file: code/PPTist/src/hooks/useExport.ts
    line: 213-280
    finding: "When exporting to pptx, PPTist correctly maps vertical-align: super to options.superscript = true and vertical-align: sub to options.subscript = true."
verification:
  test_case: null
  result: null
fix:
  applied: true
  commit: null
  solution: "Used linkedom to re-parse SVG after fast-xml-parser, preserving text/tspan node order. Added fixMixedTextTspanContentWithLinkedom and related helper functions to src/parser/svg-parser.ts"
notes:
  - pptist supports text superscript/subscript display natively
  - SVG baseline-shift attribute values: "super", "sub", or numeric values (percentages, lengths)
  - The fix should wrap content in <sup> or <sub> tags OR add vertical-align CSS style
---

## Root Cause Analysis

### Finding 1: SVG Parser Does Capture baseline-shift
**file:** src/parser/svg-parser.ts
**line:** ~469-474

The SVG parser correctly extracts the baseline-shift attribute via the `convertToSvgElement` function:
```typescript
for (const key of Object.keys(node)) {
  if (key.startsWith('@_')) {
    const attrName = key.substring(2)
    attrs[attrName] = node[key]
  }
}
```

So `<tspan baseline-shift="super">` stores `baseline-shift: "super"` in `element.attrs['baseline-shift']`.

### Finding 2: extractTextContentFromElement Discards All Attributes
**file:** src/transformer/transform-to-pptel.ts
**line:** 577-591

```typescript
function extractTextContentFromElement(element: SvgElement): string {
  let content = element.text || ''

  // Process tspan children - add newline between lines
  const tspanChildren = element.children.filter(child => child.type === 'tspan')
  for (let i = 0; i < tspanChildren.length; i++) {
    content += extractTextContentFromElement(tspanChildren[i])
    if (i < tspanChildren.length - 1) {
      content += '\n'
    }
  }

  return content
}
```

**Problem:** This function:
1. Extracts only `element.text` from each tspan (the actual character content)
2. Recursively processes children for nested tspans
3. Adds newlines between tspan children
4. **Completely ignores all attributes** including `baseline-shift`, `font-size`, `font-family`, etc.

### Finding 3: Text Case Handler Only Uses Parent Attributes
**file:** src/transformer/transform-to-pptel.ts
**line:** 1072-1201

The text case in `transformElement` only extracts formatting from the parent `<text>` element attributes:
- `font-family` (line 1077)
- `font-size` (line 1078)
- `fill` (line 1081)
- `font-weight` (line 1084-1085)
- `font-style` (line 1086-1087)

It does NOT iterate through tspan children to apply child-specific attributes.

### Finding 4: PPTist ProseMirror Schema Supports superscript/subscript
**file:** code/PPTist/src/utils/prosemirror/schema/marks.ts
**line:** 4-26

```typescript
const subscript: MarkSpec = {
  parseDOM: [
    { tag: 'sub' },
    { style: 'vertical-align', getAttrs: value => value === 'sub' && null },
  ],
  toDOM: () => ['sub', 0],
}

const superscript: MarkSpec = {
  parseDOM: [
    { tag: 'sup' },
    { style: 'vertical-align', getAttrs: value => value === 'super' && null },
  ],
  toDOM: () => ['sup', 0],
}
```

PPTist's schema recognizes either:
- `<sup>`/`<sub>` HTML tags, OR
- `vertical-align: super`/`vertical-align: sub` CSS style

### Data Flow Summary

1. **Input SVG:** `<tspan font-size="14" baseline-shift="super">T</tspan>`
2. **SVG Parser:** Stores `baseline-shift: "super"` in `tspanElement.attrs['baseline-shift']`
3. **transformElement (text case):**
   - Calls `extractTextContentFromElement(element)` → returns "T" (plain text, no attributes)
   - Builds HTML: `<p><span style="font-size: 14px">T</span></p>`
4. **PPTist Import:**
   - Parses HTML, sees no sup/sub tags or vertical-align style
   - Renders as normal inline text

## Solution

The `extractTextContentFromElement` function is designed only to extract text content, not to preserve formatting. The text case handler in `transformElement` does not process tspan children individually to apply attributes like `baseline-shift`.

**The fix requires:** When processing tspan children, check for `baseline-shift` attribute and wrap content in appropriate HTML tags (`<sup>` for super, `<sub>` for sub) or add `vertical-align` style.

**Recommended approach:** Modify the text case handler to build the HTML content by iterating through tspan children, applying each child's attributes as inline styles or markup tags. For `baseline-shift="super"`, wrap content in `<sup>` tags. For `baseline-shift="sub"`, wrap in `<sub>` tags.
