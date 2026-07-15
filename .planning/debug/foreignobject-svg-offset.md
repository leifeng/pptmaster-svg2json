---
status: investigating
trigger: "svg中引用的其他svg文件替换后的临时svg在浏览器上看正常，但是转json后这部分代码整体往右下偏移，并且整体有点大"
created: 2026-07-09T10:30:00.000Z
updated: 2026-07-09T10:30:00.000Z
---

## Current Focus

hypothesis: "The autoEmbedIcons function creates a temporary SVG without a viewBox attribute. When parseSvg parses this temp SVG, it defaults to viewBox=[0,0,1280,720] (the parent SVG's viewBox). The coordinate-mapper then interprets the icon's path coordinates (which are in 24x24 space) as if they're in 1280x720 space, causing incorrect coordinate scaling."
test: "Check the temporary SVG structure created by autoEmbedIcons - does it have a viewBox attribute?"
expecting: "The temp SVG has no viewBox attribute, so parseSvg defaults to [0,0,1280,720]"
next_action: "Implement fix: ensure temp SVG has proper viewBox matching the icon's viewBox"

## Symptoms

expected: "Embedded SVG via foreignObject should render at correct position with correct size after conversion"
actual: "After SVG to JSON conversion, the foreignObject-embedded content is offset to bottom-right and slightly larger"
errors: []
reproduction: "SVG with <foreignObject><div xmlns=\"http://www.w3.org/1999/xhtml\"><img src=\"external.svg\"/></div></foreignObject> - external SVG gets inlined, renders correctly in browser, but offset in JSON output"
started: "Unknown - likely since foreignObject inlining was implemented"

## Eliminated

## Evidence

- timestamp: 2026-07-09T10:30:00.000Z
  checked: "src/mapper/coordinate-mapper.ts"
  found: "mapCoordinates function handles rect/circle/ellipse/path/text/image. No special handling for foreignObject element type."
  implication: "foreignObject falls through to default case which uses x/y/width/height attrs with viewBox defaults"

- timestamp: 2026-07-09T10:30:00.000Z
  checked: "src/parser/svg-parser.ts childTags array"
  found: "childTags includes rect, circle, ellipse, path, polygon, polyline, line, text, tspan, image, g, defs, linearGradient, radialGradient, stop - foreignObject NOT listed"
  implication: "foreignObject children are NOT recursively processed by convertToSvgElement"

- timestamp: 2026-07-09T10:30:00.000Z
  checked: "src/transformer/transform-to-pptel.ts"
  found: "transformElement switch handles: rect, circle, ellipse, path, polygon, polyline, line, text, image, g. foreignObject not handled."
  implication: "foreignObject falls through to default case and returns null (skipped)"

- timestamp: 2026-07-09T10:30:00.000Z
  checked: "Grep search for foreignObject in codebase"
  found: "foreignObject mentioned ONLY in design spec docs as 'forbidden/prohibited' element. No actual handling code found."
  implication: "The codebase does not have explicit foreignObject handling - it may be stripping these elements entirely"

- timestamp: 2026-07-09T10:30:00.000Z
  checked: "src/parser/svg-parser.ts - autoEmbedIcons function"
  found: "Handles <use data-icon=\"...\"> replacement with actual SVG paths. Extracts icon viewBox but coordinate ADJUSTMENT only for H/V commands, NOT for M/L commands"
  implication: "If embedded icon has non-zero viewBox origin (e.g., viewBox=\"2 2 20 20\"), M/L path coordinates are NOT adjusted, causing offset"

- timestamp: 2026-07-09T10:35:00.000Z
  checked: "src/mapper/coordinate-mapper.ts - default case in mapCoordinates"
  found: "For elements without explicit width/height, falls back to viewBox[2] and viewBox[3] as defaults"
  implication: "If embedded SVG content uses the PARENT SVG's viewBox instead of its own viewBox for default dimensions, sizing would be wrong"

- timestamp: 2026-07-09T10:35:00.000Z
  checked: "src/transformer/transform-to-pptel.ts - transformElement"
  found: "Applies scaleX = targetCanvas[0] / viewBox[2] and scaleY = targetCanvas[1] / viewBox[3] to ALL element coordinates"
  implication: "If the temporary SVG has a DIFFERENT viewBox than expected, coordinate transformation would produce wrong positions/sizes"

- timestamp: 2026-07-09T11:00:00.000Z
  checked: "Full coordinate flow analysis - autoEmbedIcons + parseSvg + mapCoordinates + transformElement"
  found: |
    Coordinate flow for embedded icons:
    1. autoEmbedIcons creates temp SVG with embedded paths:
       - Temp SVG structure: <svg><g transform="translate(x,y) scale(sx,sy)"><path d="..." stroke-width="..."/></g></svg>
       - NO viewBox attribute on temp SVG root
       - Paths are embedded directly inside <g> with transform
    2. parseSvg parses temp SVG:
       - viewBox defaults to [0, 0, 1280, 720] (parseViewBox returns default when no viewBox attr)
       - This is the PARENT SVG's viewBox, not the icon's viewBox
    3. mapCoordinates called for <g> element:
       - Tag='g' falls into default case
       - left = x * |sx| + tx, top = y * |sy| + ty
       - width = viewBox[2] * |sx| = 1280 * sx (WRONG - should be 24 * sx)
       - height = viewBox[3] * |sy| = 720 * sy (WRONG - should be 24 * sy)
    4. transformElement receives wrong width/height:
       - scaleX = 1000 / 1280 (using PARENT viewBox width)
       - scaleY = 562.5 / 720 (using PARENT viewBox height)
       - These are MUCH SMALLER than intended
       - left = (icon_x + x) * (1000/1280) vs expected (x + icon_x*24/24) * 1.0
    5. Final output coordinates are wrong:
       - Embedded icon uses WRONG scale factors
       - Coordinates get scaled by (parent_viewBox / icon_viewBox) instead of (icon_viewBox / icon_viewBox)
  implication: "The temporary SVG lacks a proper viewBox, so coordinate-mapper uses 1280x720 as default, causing massive coordinate distortion when scaling to 1000x562.5 target canvas."

- timestamp: 2026-07-09T11:05:00.000Z
  checked: "adjustPathToViewBox regex bug analysis"
  found: |
    The function comment says: "图标SVG的viewBox通常是0 0 24 24，但路径内容可能从(4,6)等位置开始"
    But the regex `/([MLHV])\s*([-\d.]+)/gi` only captures ONE number after M/L/H/V:
    - For "M3 12a9 9..." - captures M=3, then 'a' is not matched by \d so loop continues
    - For "L10 16.5l2 -3" - captures L=10, then '1' from 16.5 is NOT captured (next match starts at '6')
    
    The function tries to handle viewBox offset for icons with non-zero origin,
    but the regex bug means it effectively never adjusts ANY coordinates.
    Even if the regex worked, the function returns 'match' unchanged for M/L commands (line 550).
    
    However, since tabler-outline icons ALL have viewBox="0 0 24 24", the early return at
    line 529 (if viewBox.x===0 && viewBox.y===0) would skip adjustment anyway.
    So the regex bug is NOT the root cause for tabler-outline icons.
  implication: "adjustPathToViewBox has a bug but it's not triggered for tabler-outline since viewBox is always 0,0. The real issue is the missing viewBox on the temporary SVG."

- timestamp: 2026-07-09T11:10:00.000Z
  checked: "Root cause confirmed: missing viewBox on temporary SVG"
  found: |
    The temp SVG generated by autoEmbedIcons looks like:
    <svg>
      <g transform="translate(0, 0) scale(1, 1)">
        <path d="M3 12a9 9..." fill="none" stroke="#000000" stroke-width="2" .../>
        ...
      </g>
    </svg>
    
    Key observation: No viewBox attribute on the <svg> root!
    
    When parseSvg parses this:
    1. viewBoxAttr is undefined
    2. parseViewBox(undefined) returns [0, 0, 1280, 720]
    3. mapCoordinates for <g> uses this 1280x720 as width/height
    4. transformElement computes scaleX = 1000/1280, scaleY = 562.5/720
    5. Path coordinates get scaled by ~0.78 instead of 1.0
    
    The icon's path coordinates are relative to 24x24 viewBox, but the temp SVG
    doesn't tell the parser this, so coordinates are interpreted as being in a
    1280x720 coordinate system.
  implication: "Adding viewBox='0 0 24 24' to the temporary SVG root would fix the coordinate mapping."

## Resolution

root_cause: "The autoEmbedIcons function creates a temporary SVG without a viewBox attribute. When parseSvg processes this temp SVG, it defaults to viewBox=[0,0,1280,720]. The coordinate-mapper then uses this 1280x720 viewBox to compute width/height for the embedded <g> element, causing transformElement to apply incorrect scale factors (1000/1280 instead of 1.0) to all path coordinates. This makes the embedded icon appear at wrong position and wrong size."

fix: "In autoEmbedIcons, add a viewBox attribute to the temporary SVG root element matching the icon's viewBox. The temp SVG should have viewBox='0 0 {iconViewBox.width} {iconViewBox.height}' so coordinates are interpreted correctly."

verification: "Test with an SVG that embeds a tabler-outline icon. The temporary SVG should have correct viewBox. After conversion, the icon should appear at correct position with correct size."

files_changed: ["src/parser/svg-parser.ts"]
