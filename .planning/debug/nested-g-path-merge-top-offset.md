---
status: fixed
trigger: "处理多个g嵌套中，在path合并的情况下，最终转为json的top坐标偏下，left坐标正确"
created: 2026-07-14T10:35:00.000Z
updated: 2026-07-14T14:25:00.000Z
---

## Root Cause

**Bug: `mapCoordinates` applied translate AFTER scale instead of BEFORE**

In SVG transform composition, `translate(tx, ty) scale(s)` means:
- First apply translate: move to (x + tx, y + ty)
- Then apply scale: multiply by s

**Wrong formula:** `left = bbox.left * scale + tx` (scale first, then translate)
**Correct formula:** `left = (bbox.left + tx) * scale` (translate first, then scale)

## Fix Applied

Fixed `src/mapper/coordinate-mapper.ts` - changed formula for all element types:
- rect, circle, ellipse, line, path, text, image

Changed from:
```javascript
left = bbox.left * Math.abs(sx) + tx
top = bbox.top * Math.abs(sy) + ty
```

To:
```javascript
left = (bbox.left + tx) * Math.abs(sx)
top = (bbox.top + ty) * Math.abs(sy)
```

## Verification

| Icon | Before Fix | After Fix | Expected |
|------|------------|-----------|----------|
| Multi-Head (M16) | top=309.90 | top=309.90 | 309.90 ✓ |
| Feed-Forward (M13) | top=305.86 ✗ | top=356.38 ✓ | 356.38 ✓ |
| Residual+LayerNorm (M20) | top=405.60 | top=405.60 | 405.60 ✓ |
| Positional Encoding (M9) | top=458.46 | top=458.46 | 458.46 ✓ |

## Files Changed

- `src/mapper/coordinate-mapper.ts` - Fixed transform formula in `mapCoordinates`

## Tests

- All 28 path-merge tests pass ✓
- Pre-existing test failures in shape-rx.test.ts (unrelated to this fix)
