---
status: diagnosed
trigger: "use标签可能带了fill，生成图片的时候需要考虑这个颜色"
created: 2026-07-10T00:00:00.000Z
updated: 2026-07-10T00:00:00.000Z
audit_acknowledged:
  milestone: v1.9
  at: 2026-10-15
  status: diagnosed
---

## Current Focus

hypothesis: "The fill attribute IS being extracted from the use tag (line 124), but it's never applied to the SVG content before rendering"
test: "Trace code flow to verify fill variable is unused after extraction"
expecting: "If fill is extracted but not used, that's the root cause"
next_action: "Add evidence by examining Resvg options and color substitution logic"

## Evidence

- timestamp: 2026-07-10T00:00:00.000Z
  checked: "src/svg-use-handler.ts lines 109-174 (data-icon use tag processing)"
  found: "Line 124 extracts fill: `const fill = attrMap.fill || '#000000'`"
  implication: "The fill color IS being extracted from the use tag"
- timestamp: 2026-07-10T00:00:00.000Z
  checked: "src/svg-use-handler.ts lines 152-159 (SVG rendering)"
  found: "The `adjustedSvgContent` is passed directly to Resvg without any color substitution. The `fill` variable extracted at line 124 is NEVER USED in the rendering code."
  implication: "Root cause confirmed: fill is extracted but never applied"
- timestamp: 2026-07-10T00:00:00.000Z
  checked: "templates/icons/tabler-outline/chart-line.svg"
  found: "Icon uses `stroke=\"currentColor\"` and `fill=\"none\"` - colors are defined via SVG attributes, not inline style"
  implication: "To apply fill color, we need to substitute currentColor with the actual color value before rendering"

## Symptoms

expected: "When <use data-icon="..." fill="#0E6251"> is used, the rendered PNG should use #0E6251 as the fill color"
actual: "The icon SVG is rendered as-is (with its original colors) rather than applying the fill color from the <use> tag"
errors: []
reproduction: "Use a <use data-icon=\"...\" fill=\"#color\"> tag and render to PNG via resvg-js"
started: "Unknown when this broke, likely never worked"

## Eliminated

## Evidence

## Resolution

root_cause: "At line 124 of src/svg-use-handler.ts, the fill attribute IS extracted from the use tag (`const fill = attrMap.fill || '#000000'`), but the `fill` variable is never used afterwards. The icon SVG content is passed directly to Resvg for rendering (lines 154-156) without any color substitution. The icon SVG files (like tabler-outline) use `stroke=\"currentColor\"` and `fill=\"none\"`, which means colors are defined via SVG attributes. Since Resvg renders `currentColor` as-is (it doesn't resolve CSS `currentColor` keyword), the original colors are kept."
fix: "Before rendering the icon SVG with Resvg, substitute `currentColor` (and possibly `fill` attributes) with the actual fill color from the use tag. This could be done by: (1) String replacement of `stroke=\"currentColor\"` with `stroke=\"#0E6251\"` (or whatever the fill color is), OR (2) Set a CSS `color` style on the SVG root element which Resvg may use to resolve currentColor."
verification: "After fix, render a <use data-icon=\"tabler-outline/chart-line\" fill=\"#0E6251\"/> and verify the resulting PNG uses #0E6251 for the icon strokes"
files_changed: ["src/svg-use-handler.ts"]
