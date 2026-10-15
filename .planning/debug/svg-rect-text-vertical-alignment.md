---
status: diagnosed
trigger: "SVG rect at y=280 height=3 and text at y=340 fontSize=56 - rect appears aligned with text BOTTOM instead of being above text"
created: 2026-07-01T10:00:00.000Z
updated: 2026-07-01T10:30:00.000Z
audit_acknowledged:
  milestone: v1.9
  at: 2026-10-15
  status: diagnosed
---

## Current Focus

hypothesis: "Text vertical positioning formula subtracts fontSize directly from measured.y, but fontSize is in SVG units while measured.y and transformed.top are in different scales, causing misalignment"
test: "Trace coordinate flow for text vs rect in transform-to-pptel.ts and mapCoordinates"
expecting: "Find exact formula discrepancy causing text to appear lower than expected"
next_action: "Analyze textTop formula at line 766 in detail"

## Symptoms

expected: "Rect at y=280 (top=218.75 in output) should appear ABOVE text at y=340 (textTop=173.1, textBottom=207.5 in output)"
actual: "Rect appears aligned with text BOTTOM in converted output"
errors: []
reproduction: "SVG rect y=280 height=3 and text y=340 fontSize=56 converts with incorrect vertical alignment"
started: "Unknown - discovered during conversion testing"

## Eliminated

- hypothesis: "mapCoordinates returns wrong top for text element"
  evidence: "mapCoordinates correctly returns y=340 for text (baseline position)"
  timestamp: "2026-07-01T10:15:00.000Z"

- hypothesis: "Rect top calculation is wrong"
  evidence: "Rect top = coords.top * scaleY = 280 * 0.7813 = 218.75, which is correct"
  timestamp: "2026-07-01T10:15:00.000Z"

## Evidence

- timestamp: 2026-07-01T10:05:00.000Z
  checked: "transform-to-pptel.ts text case (lines 722-846)"
  found: "textTop = (transformed.top + measured.y - fontSize) * scaleY at line 766"
  implication: "This formula attempts to convert baseline y to top y using measured.y (bbox.y from resvg)"

- timestamp: 2026-07-01T10:10:00.000Z
  checked: "mapCoordinates for text (lines 217-224 in coordinate-mapper.ts)"
  found: "For text: top = attrs.y (baseline), width = fontSize * 10 (rough estimate), height = fontSize * 1.5"
  implication: "Text uses baseline y directly, not converting to visual top"

- timestamp: 2026-07-01T10:15:00.000Z
  checked: "text-measurer.ts buildMeasurementSvg function"
  found: "Text rendered at y=fontSize in measurement SVG. resvg.getBBox() returns bbox.y which is top of bounding box in SVG coords"
  implication: "measured.y = bbox.y (top of text bbox in SVG coords where baseline is at fontSize)"

- timestamp: 2026-07-01T10:20:00.000Z
  checked: "Fallback formula at line 772"
  found: "textTop = (transformed.top - fontSize * 0.8) * scaleY - assumes ascent = 0.8 * fontSize"
  implication: "Fallback uses heuristic (80% of fontSize) for ascent, may differ from actual"

- timestamp: 2026-07-01T10:25:00.000Z
  checked: "Rect vs Text coordinate calculation comparison"
  found: "Rect: transformed.top = coords.top * scaleY = 280 * 0.7813 = 218.75. Text: transformed.top = 340 * 0.7813 = 265.625"
  implication: "Text baseline is at 265.625 in output space. textTop formula should convert this to visual top correctly"

## Resolution

root_cause: "Two competing issues in text vertical positioning in transform-to-pptel.ts:\n1. Line 766: textTop formula uses `(transformed.top + measured.y - fontSize) * scaleY` which incorrectly handles the coordinate conversion from SVG baseline to visual top. For typical values (measured.y=12, fontSize=56, scaleY=0.7813), this gives textTop=173.1 when correct should be ~231.2 (difference of ~58 pixels).\n2. Line 772 (fallback): Uses `fontSize * 0.8` heuristic for ascent, which differs from actual measured ascent, causing fallback textTop=221.1 vs correct ~231.2 (off by ~10 pixels).\n\nThe actual output textTop appears to be ~175 (user reports rect at y=280 aligning with text bottom), which doesn't match either formula directly. This suggests either: (a) measured.y is returning an unexpected value (e.g., 0 or negative for this specific font/text), or (b) the fallback is being triggered unexpectedly."
fix: "The fix should:\n1. Change line 766 from: `textTop = (transformed.top + measured.y - fontSize) * scaleY`\n   To: `textTop = transformed.top - (fontSize - measured.y) * scaleY`\n   Where (fontSize - measured.y) is the ascent in SVG units, then properly scaled.\n\n2. Alternatively, simplify to: `textTop = transformed.top - measured.y * scaleY`\n   IF measured.y already represents the ascent distance from baseline to bbox top.\n\n3. Fix fallback line 772 to use measured.y from a partial measurement rather than heuristic fontSize * 0.8"
verification: "After fix, text at y=340 fontSize=56 should produce textTop such that text appears ABOVE rect at y=280 (textTop ~231, textBottom ~265, rectTop ~219)"
files_changed: ["src/transformer/transform-to-pptel.ts"]
