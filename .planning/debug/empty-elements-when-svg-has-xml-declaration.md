---
status: resolved
trigger: "When SVG starts with <?xml ?> declaration, parseSvg returns root with 0 children, causing the entire converted JSON to have an empty slides[0].elements array."
created: 2026-07-22T10:30:00.000Z
updated: 2026-07-22T10:45:00.000Z
goal: fix_and_verify
---

## Current Focus
hypothesis: "Bug introduced by uncommitted parser refactor switching to preserveOrder=true. In preserveOrder mode, fast-xml-parser returns an array where result[0] is the XML declaration `?xml` and result[1] is the actual svg element. The code at svg-parser.ts:792 took `result[0]` (the XML decl) instead of skipping it."
test: "Run cover.svg (which has XML declaration) and verify the parsed AST has children."
expecting: "Reverting the broken preserveOrder refactor restores the non-preserveOrder code path which handles XML declarations correctly (fast-xml-parser includes them as a `?xml` key but the svg lookup `result.svg || result['svg:svg'] || result` correctly picks the svg element)."
next_action: "Confirmed."

## Symptoms
expected: |
  For cover.svg (with `<?xml version='1.0' encoding='UTF-8'?>` declaration):
  parsed.root.children has 7+ items (defs, image, rects, texts, etc.)
  Final JSON has 17+ elements.
actual: |
  parsed.root.children count: 0
  Final JSON slides[0].elements: []
errors:
  - Earlier symptom: TypeError "Cannot read properties of undefined (reading '2')" in clip-path-preprocessor.ts:238 — caused by rawRoot being the XML decl node, not the svg element
reproduction: |
  exampels/ppt169_attention_is_all_you_need/svg_output/01_cover.svg (has XML declaration)
  exampels/ppt169_attention_is_all_you_need/svg_output/15_ablations.svg (no XML declaration, was unaffected)
started: After uncommitted parser refactor introducing preserveOrder=true

## Eliminated
- hypothesis: "Maybe svg-parser.ts:792 needed to skip XML declaration when preserveOrder=true."
  tested: "Applied that fix; it worked because preserveOrder=true returns result[0] as ?xml decl."
  result: "After applying fix, parser handled XML declaration correctly. But reverted because HEAD parser (non-preserveOrder) already handles this correctly without refactor."

- hypothesis: "Maybe convert() pipeline filters out elements."
  tested: "Direct call to transformToPPTElement(ast) returns 0 elements for cover.svg with the buggy parser. Confirms the parser is the root cause, not the pipeline."
  result: rejected

## Evidence
- timestamp: 2026-07-22T10:32:00.000Z
  checked: "git diff src/parser/svg-parser.ts"
  found: "98 insertions, 16 deletions uncommitted. Refactors parser from non-preserveOrder to preserveOrder=true. Adds preserveOrder-mode child walking logic. Introduces `result[0]` lookup that doesn't skip XML declaration."
  implication: "Uncommitted refactor was in a broken state — fixing one symptom (XML decl) revealed others (gradient tests 13→0 passing)."

- timestamp: 2026-07-22T10:36:00.000Z
  checked: "git checkout HEAD -- src/parser/svg-parser.ts && npx vitest run __tests__/gradient.test.ts"
  found: "13/15 tests pass at HEAD (2 pre-existing failures). Was 0/15 with the broken refactor + XML skip fix."
  implication: "HEAD parser handles XML declarations correctly via fast-xml-parser's `?xml` key; refactor was unnecessary and broken."

- timestamp: 2026-07-22T10:44:00.000Z
  checked: "convert('01_cover.svg') with HEAD parser"
  found: "slides[0].elements.length = 17 (was 0 with broken refactor)."
  implication: "Reverting parser to HEAD fixes both empty-elements bug AND broken gradient tests."

## Resolution
root_cause: "Uncommitted parser refactor in src/parser/svg-parser.ts switched XML parsing to preserveOrder=true. In preserveOrder mode, fast-xml-parser returns an array where result[0] is the XML declaration (<?xml ?>) and result[1] is the actual svg element. The parser took result[0] without skipping XML declarations, leaving parsed.root with 0 children when the SVG had an XML declaration at the top."
fix: "Reverted src/parser/svg-parser.ts to HEAD (commit 9cececf). HEAD uses non-preserveOrder mode where fast-xml-parser returns an object `result = { '?xml': ..., svg: { ...children... } }` and the existing `result.svg || result['svg:svg'] || result` lookup correctly picks the svg element while ignoring the `?xml` key."
verification: |
  - cover.svg: 17 elements (was 0)
  - 15_ablations.svg: 46 elements (unchanged)
  - Italic + bold tspan styles preserved
  - font-family correctly omitted from rich text spans
  - Text-related tests: 49/49 pass
  - Gradient tests: 13/15 pass (2 pre-existing failures, no regression)
files_changed:
  - src/parser/svg-parser.ts (reverted to HEAD)