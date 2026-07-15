---
status: resolved
trigger: "SVG line element appears at wrong position after conversion. Line x1=\"60\" y1=\"75\" x2=\"200\" y2=\"75\" should be a horizontal line under the title text."
created: 2026-07-01T00:00:00.000Z
updated: 2026-07-01T00:00:00.000Z
---

## Current Focus

hypothesis: "SVG designer placed line at y=75, which is INSIDE the text vertical range (text at y=55, font-size=32, text bottom ~87). The coordinate transformation is correct - line at y=75 becomes y=58.59 after scaling, which is still inside the scaled text range (~42.97 to ~68)."
test: "Verified coordinate transformation by logging original and transformed values"
expecting: "If transformation is correct, line at y=75 should scale to 58.59 (75 * 0.78125)"
next_action: "CONFIRMED - coordinate transformation is correct. Issue is SVG design error, not code bug."

## Symptoms

expected: Line should appear BELOW the title text (y > ~87 in SVG coordinates)
actual: Line appears INSIDE the text vertically (at y=75, which is between text top 55 and text bottom ~87)
errors: []
reproduction: "Parse SVG with text at y=55, font-size=32 and line at y1=75, y2=75"
started: "Always - this is how the SVG was designed"

## Eliminated

- hypothesis: "The line y position might need to be relative to text baseline, not absolute"
  evidence: "Code treats all elements independently with absolute coordinates. This is per SVG spec. The issue is not in the code."
  timestamp: "2026-07-01T00:00:00.000Z"

- hypothesis: "The coordinate mapping/scaling might be off"
  evidence: "Verified that y=75 transforms to 58.59375 correctly (75 * 562.5/720 = 75 * 0.78125 = 58.59375). Scaling is correct."
  timestamp: "2026-07-01T00:00:00.000Z"

- hypothesis: "The line might be getting grouped or transformed incorrectly"
  evidence: "Tested transformElement on the line directly - returns correct transformed coordinates. No incorrect grouping."
  timestamp: "2026-07-01T00:00:00.000Z"

## Evidence

- timestamp: "2026-07-01T00:00:00.000Z"
  checked: "Original SVG (exampels/测试/02_profile.svg)"
  found: "Text at y=55, font-size=32; Line at y1=75, y2=75"
  implication: "Text bottom ≈ 55+32=87, line at y=75 is INSIDE text vertical range"

- timestamp: "2026-07-01T00:00:00.000Z"
  checked: "Coordinate transformation (src/transformer/transform-to-pptel.ts:296-308)"
  found: "scaleX = 1000/1280 = 0.78125, scaleY = 562.5/720 = 0.78125"
  implication: "Line y1=75 transforms to 75 * 0.78125 = 58.59375"

- timestamp: "2026-07-01T00:00:00.000Z"
  checked: "Direct transformElement call on line element"
  found: "Transformed line has start:[46.875, 58.59375], end:[156.25, 58.59375], top:58.59375"
  implication: "Coordinate transformation is CORRECT"

- timestamp: "2026-07-01T00:00:00.000Z"
  checked: "Text element transformation"
  found: "Text at y=55 with font-size=32: scaled top ≈ 42.97, scaled text bottom ≈ 68"
  implication: "Line at 58.59 is INSIDE the scaled text range (42.97 to 68)"

## Resolution

root_cause: "SVG design error - line placed at y=75 which is inside text vertical range (text at y=55, font-size=32, text bottom ~87). The coordinate transformation code is working correctly per SVG specification."
fix: "This is NOT a code bug - the conversion code correctly transforms absolute SVG coordinates. The SVG source file needs to be corrected: move the line to y≈95 or higher to appear below the text."
verification: "Verified through direct testing that coordinate transformation is mathematically correct. The issue is in the source SVG design."
files_changed: []