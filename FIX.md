# Fix Plan: SVG `<tspan>` Processing Bug

## Problem Summary

**Bug Rule:** 有 `x` = 换行（多行文本），无 `x` = 同行连续排列（公式/上下标）

**Current Behavior:**
- Line 1221 always wraps content in a single `<p>` tag
- All tspan children get newlines added between them regardless of `x` attribute
- **Result:** Inline tspans (formulas, superscript/subscript without `x`) are incorrectly treated as multiline

## Example

**Input SVG:**
```svg
<text x="100" y="50" font-size="16">
  <tspan x="100" dy="1em">Line1</tspan>
  <tspan x="100" dy="1em">Line2</tspan>
</text>
```

**Current JSON Output (incorrect):**
```json
{
  "type": "text",
  "content": "<p><tspan x=\"100\" dy=\"1em\">Line1</tspan><tspan x=\"100\" dy=\"1em\">Line2</tspan></p>"
}
```

**Expected JSON Output (per user requirement):**
```json
[
  {
    "type": "text",
    "left": 100,
    "top": 50,
    "content": "<p>Line1</p>"
  },
  {
    "type": "text",
    "left": 100,
    "top": 82,  // 50 + 1em (dy)
    "content": "<p>Line2</p>"
  }
]
```

---

## Correct Behavior

| Scenario | Rule | Output |
|----------|------|--------|
| Tspan WITH `x` | Multiline text → split into multiple text elements | Multiple PPTTextElements, each line position calculated from `x` and `dy` |
| Tspan WITHOUT `x` | Inline continuation (formula/superscript) → stay on same line | Single text element with `<p>` wrapper, preserve `baseline-shift` |

---

## Implementation Plan

### Step 1: Add Helper Function `hasLineBreakTspans`

**Location:** `src/transformer/transform-to-pptel.ts` (around line 572, after `extractTextContentFromElement`)

```typescript
/**
 * Check if element has tspan children with x attribute (indicating multiline text)
 * Rule: 有 x = 换行（多行文本），无 x = 同行连续排列（公式/上下标）
 */
function hasLineBreakTspans(element: SvgElement): boolean {
  for (const child of element.children) {
    if (child.type === 'tspan') {
      if (child.attrs['x'] !== undefined) {
        return true
      }
      if (hasLineBreakTspans(child)) {
        return true
      }
    }
  }
  return false
}
```

### Step 2: Modify Text Element Processing (around line 1221)

**Current code:**
```typescript
const richContent = `<p${pStyle ? ` style="${pStyle}"` : ''}>${wrappedContent}</p>`
const result: PPTTextElement = {
  id,
  type: 'text',
  left: textLeft,
  top: textTop,
  // ...
  content: richContent,
  // ...
}
```

**New logic:**
```typescript
const isMultiline = hasLineBreakTspans(element)

if (isMultiline) {
  // Multiline text: split into multiple text elements
  const tspanElements = extractTspansWithPosition(element, textLeft, textTop, fontSize, fontFamily, fillColor)
  return tspanElements.map((tspanEl, idx) => ({
    id: idx === 0 ? id : `${id}-line-${idx}`,
    type: 'text' as const,
    left: tspanEl.left,
    top: tspanEl.top,
    width: textWidth,
    height: textHeight,
    defaultFontSize: tspanEl.fontSize,
    rotate,
    content: `<p${pStyle ? ` style="${pStyle}"` : ''}>${tspanEl.content}</p>`,
    defaultFontName: fontFamily,
    defaultColor: colorToHex(fillColor) || '#000000',
    lineHeight: 1,
    opacity: element.attrs.opacity ? parseFloat(String(element.attrs.opacity)) : undefined,
    shadow: undefined,
    vAlign: 'middle',
    fixedHeight: !!element.attrs.height,
    wordSpace: 0,
    paragraphSpace: 5,
  }))
} else {
  // Single line or inline content: single text element
  const richContent = `<p${pStyle ? ` style="${pStyle}"` : ''}>${wrappedContent}</p>`
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
    defaultColor: colorToHex(fillColor) || '#000000',
    lineHeight: 1,
    opacity: element.attrs.opacity ? parseFloat(String(element.attrs.opacity)) : undefined,
    shadow: undefined,
    vAlign: 'middle',
    fixedHeight: !!element.attrs.height,
    wordSpace: 0,
    paragraphSpace: 5,
  }
  return [result]
}
```

### Step 3: Add Helper Function `extractTspansWithPosition`

```typescript
interface TspanElement {
  left: number
  top: number
  fontSize: number
  content: string
}

/**
 * Extract tspan elements with calculated positions for multiline text
 * Position calculation based on parent text x/y plus each tspan's x and dy
 */
function extractTspansWithPosition(
  element: SvgElement,
  baseLeft: number,
  baseTop: number,
  baseFontSize: number,
  fontFamily: string,
  fillColor: string
): TspanElement[] {
  const result: TspanElement[] = []
  const fontSize = parseFloat(String(element.attrs['font-size'] || baseFontSize))

  // Process tspan children
  const tspanChildren = element.children.filter(child => child.type === 'tspan')

  if (tspanChildren.length === 0) {
    // No tspans, use direct text content
    const text = element.text || ''
    if (text) {
      result.push({
        left: baseLeft,
        top: baseTop,
        fontSize,
        content: text
      })
    }
    return result
  }

  let currentTop = baseTop
  let currentLeft = baseLeft

  for (const tspan of tspanChildren) {
    const tspanX = tspan.attrs['x'] !== undefined ? parseFloat(String(tspan.attrs['x'])) : currentLeft
    const tspanDy = tspan.attrs['dy'] !== undefined ? parseFloat(String(tspan.attrs['dy'])) : 0
    const tspanFontSize = parseFloat(String(tspan.attrs['font-size'] || fontSize))
    const tspanContent = extractTextContentFromTspan(tspan)

    // Update position based on dy (relative to previous line)
    if (tspan.attrs['dy'] !== undefined) {
      currentTop += tspanFontSize * tspanDy
    } else if (tspan.attrs['x'] !== undefined) {
      // If explicit dy is not given but x changed, treat as new line
      currentTop += tspanFontSize * 1.2 // default line height
    }

    result.push({
      left: tspanX,
      top: currentTop,
      fontSize: tspanFontSize,
      content: tspanContent
    })

    currentLeft = tspanX
  }

  return result
}

/**
 * Extract plain text content from a single tspan element (recursive)
 */
function extractTextContentFromTspan(tspan: SvgElement): string {
  let content = tspan.text || ''

  // Handle nested tspans
  for (const child of tspan.children) {
    if (child.type === 'tspan') {
      content += extractTextContentFromTspan(child)
    }
  }

  return content
}
```

---

## Key Points

1. **Position Calculation:**
   - `left`: Use tspan's `x` attribute if present, otherwise inherit from previous tspan
   - `top`: Start from parent text's `y`, accumulate `dy` values for each line

2. **Font Size Inheritance:**
   - Each tspan can have its own `font-size`, use that or inherit from parent

3. **Content Extraction:**
   - Extract plain text from each tspan (recursively handle nested tspans)
   - Preserve inline styling separately if needed

4. **Return Type Change:**
   - `extractTextContentFromElement` returns `string`
   - New logic returns `PPTTextElement[]` for multiline case

5. **Regression Testing:**
   - [ ] Multiline text with multiple `<tspan x="..." dy="...">` → multiple text elements with correct positions
   - [ ] Inline formula with `<tspan>` (no `x`) → single text element
   - [ ] Superscript/subscript with `baseline-shift` → single text element, preserve styling
   - [ ] Mixed content → correctly split only the multiline parts

---

## Files to Modify

| File | Line(s) | Change |
|------|---------|--------|
| `src/transformer/transform-to-pptel.ts` | ~572 | Add `hasLineBreakTspans()` helper |
| `src/transformer/transform-to-pptel.ts` | ~575 | Add `extractTextContentFromTspan()` helper |
| `src/transformer/transform-to-pptel.ts` | ~580 | Add `extractTspansWithPosition()` helper |
| `src/transformer/transform-to-pptel.ts` | ~1221 | Modify to return `PPTTextElement[]` with multiline handling |
| `src/transformer/transform-to-pptel.ts` | ~1150 | Update caller to handle array return |
