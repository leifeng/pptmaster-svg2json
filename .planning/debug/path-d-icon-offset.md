---
status: resolved
trigger: "path SHAPE itself is still offset to bottom-right and outside the rect box in JSON output - coordinates (left/top/width/height) are correct but path d attribute renders in wrong position"
created: 2026-07-09T15:30:00.000Z
updated: 2026-07-09T16:50:00.000Z
---

## Current Focus

hypothesis: "Fixed - pathBoundingBox now correctly computes arc endpoints for bbox, and viewBox is correctly set to original bbox dimensions"
test: "Verified containment - Check in Box: true, Box in Rect: true, Check in Rect: true"
expecting: "All containment checks pass"
next_action: "Debug session complete"

## Resolution

root_cause: "Two bugs: 1) pathBoundingBox was simplified to only handle M/L/H/V, but didn't properly handle arc endpoints - it only used the first number of each segment, ignoring the actual endpoint coordinates of arcs. 2) viewBox was set to [transformed.width, transformed.height] (scaled dimensions) instead of original bbox dimensions"
fix: "1) Rewrote pathBoundingBox to properly handle arcs by using only the endpoint x,y (last 2 params of arc command), ignoring arc parameters in between. 2) Changed viewBox to [transformed.width/scaleX, transformed.height/scaleY] to get original bbox dimensions"
verification: "Verified containment - Check in Box: true, Box in Rect: true, Check in Rect: true"
files_changed: ["src/mapper/coordinate-mapper.ts", "src/transformer/transform-to-pptel.ts"]

## Symptoms

expected: Icon positioned at left=100, top=162 in SVG space (accounting for viewBox scaling)
actual: Icon positioned at left=102, top=164 in SVG space (2-pixel offset in both directions)
errors: []
reproduction: "Use tabler-outline/checkbox icon via <use data-icon=\"...\"> with x=100, y=162"
started: Unknown - coordinate-mapper.ts was modified recently

## Eliminated

- hypothesis: "autoEmbedIcons not applying transform to path elements"
  evidence: "Confirmed transform IS applied - g has transform=\"translate(100, 162)\" and paths receive it via walk() effectiveTransform"
  timestamp: 2026-07-09T15:20:00.000Z

- hypothesis: "viewBox not being set correctly"
  evidence: "viewBox IS set correctly to [transformed.width, transformed.height]"
  timestamp: 2026-07-09T15:25:00.000Z

## Evidence

- timestamp: 2026-07-09T15:10:00.000Z
  checked: "test-bbox-debug.js trace of pathBoundingBox for box path"
  found: "Arc extent calculation adds rx/ry to min/max even when arc doesn't extend to that bound. For arc from (20,18) to (18,20) with ry=2: topBound = 18-2 = 16, but arc only spans y=[18,20]"
  implication: "bbox.min computed as (2,2) instead of (4,4)"

- timestamp: 2026-07-09T15:15:00.000Z
  checked: "Test output for icon positioning"
  found: "Box path output: left=79.69, top=128.125 in output space = (102, 164) in SVG space. Should be (104, 166)"
  implication: "Icon is 2 pixels off in both directions - matches arc extent error"

- timestamp: 2026-07-09T15:20:00.000Z
  checked: "walk() function in transform-to-pptel.ts"
  found: "effectiveTransform (parent's transform) IS being applied to child.attrs.transform before transformElement is called"
  implication: "Transform inheritance is working correctly"

- timestamp: 2026-07-09T15:25:00.000Z
  checked: "Test output for checkmark path"
  found: "Checkmark at left=85.16, top=131.25 (SVG: 109, 168). viewBox=[8.59, 6.25]. Path M9 11 renders at (9, 11) in viewBox space, which maps to (85.16, 131.25) in output"
  implication: "Checkmark position is actually correct based on bbox calculation"

