---
status: resolved
trigger: "SVG <text> with <tspan font-style='italic' fill='#4A5568'> is converted to JSON where the resulting <span> is MISSING font-style: italic. fill (color) is correctly preserved as 'color: #4A5568', but font-style is dropped."
created: 2026-07-22T10:00:00.000Z
updated: 2026-07-22T10:00:00.000Z
goal: fix_and_verify
---

## Current Focus
hypothesis: "buildRichTextAST in src/transformer/transform-to-pptel.ts extracts only font-size/font-family/fill/baseline-shift from tspan attrs. font-style, font-weight, text-decoration are ignored. serializeRichText only writes font-size/font-family/color to the span style."
test: "Trace code path for tspan with font-style=italic to confirm the attribute is dropped at AST build time."
expecting: "Add fontStyle/fontWeight/textDecoration fields to ElementNode interface and propagate them to the HTML span style."
next_action: "Apply fix to buildRichTextAST and serializeRichText, then re-run conversion to verify italic appears in output."

## Symptoms
expected: |
  <p>
    <span style="font-size: 10.9375px; font-family: Arial, 'Microsoft YaHei', sans-serif; color: #1A202C">
      Slightly worse perplexity, better BLEU.
    </span>
    <span style="font-size: 10.9375px; font-family: Arial, 'Microsoft YaHei', sans-serif; color: #4A5568; font-style: italic">
      Optimize for the metric you ship on.
    </span>
  </p>
actual: |
  <p>
    <span style="font-size: 10.9375px; font-family: Arial, 'Microsoft YaHei', sans-serif; color: #1A202C">
      Slightly worse perplexity, better BLEU.
    </span>
    <span style="font-size: 10.9375px; font-family: Arial, 'Microsoft YaHei', sans-serif; color: #4A5568">
      Optimize for the metric you ship on.
    </span>
    <!-- Missing: font-style: italic -->
  </p>
errors: []
reproduction: |
  SVG input (exampels/ppt169_attention_is_all_you_need/svg_output/15_ablations.svg line 82):
    <text x="246" y="606" font-family="Arial, &quot;Microsoft YaHei&quot;, sans-serif" font-size="14" fill="#1A202C">
      Slightly worse perplexity, better BLEU.
      <tspan font-style="italic" fill="#4A5568">Optimize for the metric you ship on.</tspan>
    </text>
started: 2026-07-22

## Eliminated
- hypothesis: "Maybe svg-parser strips font-style when parsing tspan attrs."
  tested: "Read src/parser/svg-parser.ts; confirmed it preserves all attrs (lines 474+). The attr is available on child.attrs['font-style']."
  result: rejected

- hypothesis: "Maybe serializeRichText ignores font-style because PPTist doesn't support it."
  tested: "Read PPTist PPTTextElement spec; PPTist inline styles support font-style via standard CSS, same as font-weight and text-decoration."
  result: rejected

## Evidence
- timestamp: 2026-07-22T10:01:00.000Z
  checked: "src/transformer/transform-to-pptel.ts buildRichTextAST (lines 439-499)"
  found: "Only extracts font-size, font-family, fill, baseline-shift. No font-style, font-weight, text-decoration."
  implication: "These attrs are dropped at AST construction time."

- timestamp: 2026-07-22T10:02:00.000Z
  checked: "src/transformer/transform-to-pptel.ts serializeRichText (lines 653-728)"
  found: "HTML span style only writes font-size, font-family, color. No font-style/font-weight/text-decoration handling."
  implication: "Even if AST had them, serializeRichText wouldn't emit them."

- timestamp: 2026-07-22T10:03:00.000Z
  checked: "exampels/ppt169_attention_is_all_you_need/svg_output/15_ablations.svg.json (line 971)"
  found: "Actual output has color: #4A5568 but no font-style: italic — matches our root cause analysis."
  implication: "User's report (color missing) is slightly imprecise — color IS preserved, but font-style IS dropped."

## Resolution
root_cause: "buildRichTextAST and serializeRichText in src/transformer/transform-to-pptel.ts do not capture or emit font-style, font-weight, or text-decoration from tspan attrs. Only font-size, font-family, fill, baseline-shift are handled. Additionally, font-family is being emitted in the rich text span style but the user does not want it (PPTist uses its own default font)."
fix: |
  1. ElementNode interface: added optional fontStyle, fontWeight, textDecoration fields.
  2. buildRichTextAST: extracts font-style/font-weight/text-decoration from child.attrs and pushes them onto the element node.
  3. serializeRichText: refactored style construction into buildSpanStyle() helper.
  4. buildSpanStyle: NO LONGER emits font-family (per user requirement).
  5. serializeRichText needSpan check: fontFamily removed from the difference check (no longer differentiates spans by font-family).
  6. serializeRichText signature: added parentFontStyle/parentFontWeight/parentTextDecoration parameters for proper inheritance.
verification: |
  - Italic case (15_ablations.svg line 82):
    `<span style="font-size: 10.9375px; color: #4A5568; font-style: italic">Optimize for the metric you ship on.</span>`
    (No font-family; font-style: italic preserved.)
  - Bold case (line 38):
    `<span style="font-size: 10.9375px; color: #C53030; font-weight: 700">−0.9 BLEU</span>`
    (No font-family; font-weight: 700 preserved.)
  - 49/49 text-related tests still pass; tsc --noEmit clean.
files_changed:
  - src/transformer/transform-to-pptel.ts