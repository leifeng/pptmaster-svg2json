---
status: investigating
trigger: "SVG text to PPTist rich text conversion doesn't conform to PPTist specification. Missing font-size/font-family/color on outer span wrapper."
created: 2026-07-15T10:00:00.000Z
updated: 2026-07-15T10:05:00.000Z
goal: find_root_cause_only
audit_acknowledged:
  milestone: v1.9
  at: 2026-10-15
  status: investigating
---

## Current Focus

hypothesis: "serializeRichText doesn't include parent font attributes (font-size, font-family, color) in outer span wrapper. When content contains HTML tags (like <sub>), the hasHtmlTags check at line 1247-1248 causes the outer span to be skipped entirely."
test: "Trace the code path for text element with tspan children having different font-size"
expecting: "Outer span with font-size, font-family, color is missing when contentHtml contains HTML tags"
next_action: "Verify the exact line where the outer span is conditionally skipped"

## Symptoms

expected: |
  <p style="text-align: left;">
    <span style="font-size: 14px; font-family: Consolas, monospace; color: #4A4A4A;">
      O(log<sub style="font-size: 10px;">k</sub>(n)
    </span>
  </p>
actual: |
  <p>O(log<sub style="font-size: 10px;">k</sub>(n)</p>
  <!-- Missing: font-size, font-family, color on outer span, text-align on p -->
errors: []
reproduction: |
  Transform SVG text element with font-size, font-family, fill attributes
  along with tspan children having different font-sizes
started: Unknown

## Eliminated

## Evidence

- timestamp: 2026-07-15T10:02:00.000Z
  checked: "code/PPTist/src/types/slides.ts PPTTextElement interface (lines 186-203)"
  found: "PPTTextElement has defaultFontName and defaultColor but NO defaultFontSize. All font-size values MUST be explicitly written in HTML."
  implication: "Cannot rely on defaultFontSize - must include font-size in HTML inline styles"

- timestamp: 2026-07-15T10:03:00.000Z
  checked: "src/transformer/transform-to-pptel.ts serializeRichText function (lines 482-519)"
  found: "serializeRichText generates HTML for rich text content but does NOT include outer wrapper span with parent font-size/font-family/color"
  implication: "The outer span must be added by the caller, but caller conditionally skips it"

- timestamp: 2026-07-15T10:04:00.000Z
  checked: "src/transformer/transform-to-pptel.ts text case in transformElement (lines 1239-1253)"
  found: "Lines 1247-1248: hasHtmlTags check skips outer span when contentHtml contains HTML tags. spanStyle (font-size, color) is built at line 1239 but only used when hasHtmlTags is false."
  implication: "BUG: When content contains <sub>/<sup> tags, outer span with font-size/font-family/color is not added"

## Resolution

root_cause:
fix:
verification:
files_changed: []
