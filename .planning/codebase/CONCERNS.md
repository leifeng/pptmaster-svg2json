# Codebase Concerns

**Analysis Date:** 2026-06-27

## Tech Debt

**Duplicate coordinate-mapper implementation:**
- Issue: `src/coordinate-mapper.ts` and `src/mapper/coordinate-mapper.ts` are identical files
- Files: `src/coordinate-mapper.ts`, `src/mapper/coordinate-mapper.ts`
- Impact: Maintenance burden, confusion about which to use, potential for divergence
- Fix approach: Delete one and update imports to use single source

**Dead code in CLI:**
- Issue: The `run` function at line 127-128 is never called from main execution path
- Files: `src/cli.ts:126-128`
- Impact: Unused code that could confuse developers
- Fix approach: Remove if unused, or wire it up properly

**No unit test files:**
- Issue: Vitest config looks for `__tests__/**/*.test.ts` but no test files exist
- Files: `vitest.config.ts:7`
- Impact: No automated testing, regression risk
- Fix approach: Create unit tests for parser, transformer, and coordinate mapper

**Redundant validation call:**
- Issue: `isValidPPTElement` called twice in `round-trip-test.ts:69-72`
- Files: `src/scripts/round-trip-test.ts:69-72`
- Impact: Unnecessary computation, dead code path
- Fix approach: Remove inner redundant call

## Known Bugs

**Ellipse transform scale not applied to center coordinates:**
- Issue: `cx` and `cy` are not scaled in ellipse case, only `rx` and `ry`
- Files: `src/mapper/coordinate-mapper.ts:152-161`
- Current code:
  ```typescript
  case 'ellipse': {
    const cx = extractNumber(attrs.cx, 0) + tx   // Missing * sx
    const cy = extractNumber(attrs.cy, 0) + ty   // Missing * sy
    const rx = extractNumber(attrs.rx, 0) * sx
    const ry = extractNumber(attrs.ry, 0) * sy
  ```
- Impact: Ellipses with transform="scale(...)" will be incorrectly positioned
- Fix approach: Apply `* sx` to `cx` and `* sy` to `cy`

**Text width estimation is inaccurate:**
- Issue: Width calculated as `fontSize * 10` which is a rough heuristic
- Files: `src/mapper/coordinate-mapper.ts:194`
- Impact: Text elements may have incorrect width values
- Fix approach: Use actual text measurement or render-based calculation

## Security Considerations

**XXE protection unclear:**
- Risk: `fast-xml-parser` is used without explicit XXE protection settings
- Files: `src/parser/svg-parser.ts:91-114`
- Current mitigation: `fast-xml-parser` v5+ has XXE protection enabled by default
- Recommendations: Explicitly set `processEntities: false` and `xmlPropertiesAttribute: null` for defense in depth

**CLI silently skips inaccessible files:**
- Risk: Permission issues or symlink loops could cause silent data loss
- Files: `src/cli.ts:46-52`
- Current mitigation: None
- Recommendations: Add `--verbose` flag and log skipped files

## Performance Bottlenecks

**Incomplete path bounding box calculation:**
- Problem: `pathBoundingBox` only parses M, L, H, V commands
- Files: `src/mapper/coordinate-mapper.ts:71-106`
- Cause: SVG paths contain Q (quadratic bezier), C (cubic bezier), A (arc), S, T commands that are not parsed
- Impact: Path elements with curves will have incorrect bounding boxes, affecting positioning
- Improvement path: Implement proper path command parser using existing path parsing libraries or full implementation

**Text width estimation causing re-layout:**
- Problem: `fontSize * 10` heuristic can be 2-3x off for actual text
- Files: `src/mapper/coordinate-mapper.ts:194`
- Impact: Downstream consumers may need to recalculate layout
- Improvement path: Pre-measure text or use monospace character count as lower bound

## Fragile Areas

**XML parsing edge cases:**
- Files: `src/parser/svg-parser.ts:119-120`
- Why fragile: Code assumes `svgRoot` is either object or null, but XML parser could return arrays or other types
- Safe modification: Add explicit type checks and throw descriptive errors

**Hardcoded fallback viewBox:**
- Files: `src/parser/svg-parser.ts:41-44`, `src/mapper/coordinate-mapper.ts:9-12`
- Why fragile: Default `[0, 0, 1280, 720]` used silently when parsing fails, could mask invalid SVGs
- Safe modification: Log warning when using fallback viewBox

**Named color map maintenance:**
- Files: `src/transformer/transform-to-pptel.ts:36-171`
- Why fragile: Manual list of 147 named colors, may get out of sync with CSS spec updates
- Safe modification: Use a library or generate from CSS color database

## Scaling Limits

**No streaming support:**
- Resource: Memory load for large SVGs
- Current capacity: Entire SVG loaded into memory as string, parsed to AST, then transformed
- Limit: SVG files larger than available RAM will crash
- Scaling path: Implement streaming XML parser and incremental processing

**UUID generation per element:**
- Resource: CPU cycles for `uuidv4()` calls
- Current capacity: One UUID generated per output element
- Limit: SVGs with >100,000 elements may see noticeable slowdown
- Scaling path: Use non-cryptographic ID generation (e.g., counters) if UUIDs are not consumer-required

## Dependencies at Risk

**fast-xml-parser (^5.9.3):**
- Risk: Major version 5 is relatively new, API changes possible
- Impact: Parser behavior changes could break SVG parsing
- Migration plan: Pin to minor version, test upgrades thoroughly

**uuid (^14.0.1):**
- Risk: v14 is current major, but v7/v8 have different generation characteristics
- Impact: If consumers depend on UUID format, changing versions could break compatibility
- Migration plan: Consider using `crypto.randomUUID()` (Node.js built-in) to reduce dependencies

## Missing Critical Features

**No gradient/stop element support:**
- Problem: `linearGradient` and `stop` elements are recognized and skipped but not processed
- Blocks: Any SVG using gradients cannot be faithfully converted
- Files: `src/transformer/transform-to-pptel.ts:276-278`

**No transform="matrix(...)" support:**
- Problem: Matrix transforms are detected and marked as `special: true` but not applied
- Blocks: SVGs using matrix transforms will have incorrect positioning
- Files: `src/mapper/coordinate-mapper.ts:59-63`

**No `rotate` output in PPTShapeElement:**
- Problem: `transformElement` always sets `rotate: 0`, ignoring any SVG rotation
- Blocks: Rotated shapes lose their rotation
- Files: `src/transformer/transform-to-pptel.ts:296`, `src/mapper/coordinate-mapper.ts:54-56`

## Test Coverage Gaps

**Parser tests:**
- What's not tested: XML parsing edge cases, namespace handling, attribute extraction
- Files: `src/parser/svg-parser.ts`
- Risk: Malformed SVG could produce unexpected output silently
- Priority: High

**Coordinate mapping tests:**
- What's not tested: Transform combinations, viewBox edge cases, ellipse calculations
- Files: `src/mapper/coordinate-mapper.ts`
- Risk: Incorrect coordinate mapping affects all downstream consumers
- Priority: High

**Transformer tests:**
- What's not tested: Each shape type conversion, color parsing, dash array parsing
- Files: `src/transformer/transform-to-pptel.ts`
- Risk: Shape attributes (fill, stroke, dash) may be incorrectly converted
- Priority: High

---

*Concerns audit: 2026-06-27*