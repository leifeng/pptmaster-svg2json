---
status: resolved
trigger: "path merge nested group coordinate issue - multiple g nesting with path merge causes incorrect coordinates after JSON conversion"
created: 2026-07-13
updated: 2026-07-14
root_cause: "createMergedShapeElement() returned SVG viewBox coordinates while transformElement() returned canvas-scaled coordinates. This inconsistency caused merged paths (multi-path icons) to have different positions than single-path icons in the same nested g structure."
fix: "Add targetCanvas parameter to createMergedShapeElement() and apply canvas scaling at the end, matching transformElement()'s behavior: left = left * (targetCanvas[0] / viewBox[0])"
verification: "All 28 path-merge tests pass. End-to-end test shows merged shapes now have consistent coordinates with non-merged shapes: Icon 2 (single path) left=51.43, Icon 1 (multi-path) left=58.33 (both properly scaled)."
files_changed:
  - src/merger/path-merge.ts
  - src/transformer/transform-to-pptel.ts
  - __tests__/path-merge.test.ts
commits:
  - 07b5074 fix(path-merge): apply canvas scaling to match transformElement output
---
