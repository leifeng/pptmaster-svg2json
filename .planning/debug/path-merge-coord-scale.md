---
status: resolved
trigger: path合并后在页面的坐标不对
created: 2026-07-13
updated: 2026-07-13
root_cause: "createMergedShapeElement() parsed groupTransform for rotate but ignored scaleX/scaleY when computing bbox. Bounding box was in native path coordinates (4-20) without scale applied."
fix: "Extract scaleX/scaleY from parseTransform(groupTransform) and multiply bbox values by them. Also fix extractCommonStyle to fall back to groupAttrs when path doesn't have own style attr."
verification: "Merged icon shapes now correctly sized: w=18.67, h=18.67 (was 16x16). All 27 path-merge tests pass."
files_changed:
  - src/merger/path-merge.ts
  - src/transformer/transform-to-pptel.ts
commits:
  - a211593 fix(path-merge): apply group transform scale to merged shape bbox
---
