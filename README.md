# svg-to-pptel

SVG to PPTElement JSON converter - transforms SVG files into PowerPoint element JSON format.

## Installation

```bash
npm install
npm run build
```

Requires Node.js 18+.

## CLI Usage

```bash
# Convert single SVG file to JSON (outputs to stdout)
svg2pptel input.svg

# Output to specific file
svg2pptel input.svg -o output.json

# Batch convert directory (recursive)
svg2pptel dir --recursive

# Output AST instead of PPTElement
svg2pptel input.svg --ast
```

## API Usage

```javascript
import { convert } from 'svg-to-pptel'

// Convert SVG content to PPTElement JSON
const result = await convert(svgContent)
if (result.success) {
  console.log(result.output)  // JSON string: { elements: PPTElement[] }
  console.log(result.elementCount)  // number of elements
} else {
  console.error(result.error)  // error message
}

// Output AST instead of PPTElement
const astResult = await convert(svgContent, { astMode: true })
```

### ConvertResult

```typescript
interface ConvertResult {
  success: boolean
  output?: string      // JSON string
  error?: string       // error message if success is false
  elementCount?: number // count of PPTElement items
}
```

## Output Format

The converter outputs JSON in this format:

```json
{
  "elements": [
    {
      "id": "uuid",
      "type": "text",
      "left": 100,
      "top": 200,
      "width": 300,
      "height": 50,
      "rotate": 0,
      "content": "Hello",
      "defaultFontName": "Arial",
      "defaultColor": "#000000"
    }
  ]
}
```

See [`slides.ts`](./slides.ts) for the full `PPTElement` union type definition.

## Validation

Run batch validation across all example SVGs:

```bash
npx tsx scripts/validate-all.ts
```

This processes all SVGs in `examples/*/svg_output/` and reports validation results.

## TypeScript

TypeScript types are included - no `@types` packages needed.

## Examples

### Simple Shape

**Input SVG:**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect x="10" y="10" width="50" height="30" fill="red"/>
</svg>
```

**Output JSON:**
```json
{
  "elements": [
    {
      "id": "generated-uuid",
      "type": "shape",
      "left": 128,
      "top": 128,
      "width": 640,
      "height": 384,
      "rotate": 0,
      "viewBox": [100, 100],
      "path": "M 10 10 L 60 10 L 60 40 L 10 40 Z",
      "fixedRatio": false,
      "fill": "#ff0000"
    }
  ]
}
```

### Text Element

**Input SVG:**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100">
  <text x="10" y="30" font-family="Arial" font-size="16" fill="#333">Hello World</text>
</svg>
```

**Output JSON:**
```json
{
  "elements": [
    {
      "id": "generated-uuid",
      "type": "text",
      "left": 64,
      "top": 192,
      "width": 192,
      "height": 38,
      "rotate": 0,
      "content": "Hello World",
      "defaultFontName": "Arial",
      "defaultColor": "#333333"
    }
  ]
}
```

### Line Element

**Input SVG:**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <line x1="0" y1="50" x2="100" y2="50" stroke="black"/>
</svg>
```

**Output JSON:**
```json
{
  "elements": [
    {
      "id": "generated-uuid",
      "type": "line",
      "left": 0,
      "top": 640,
      "width": 1280,
      "start": [0, 50],
      "end": [100, 50],
      "style": "solid",
      "color": "#000000",
      "points": ["", ""]
    }
  ]
}
```