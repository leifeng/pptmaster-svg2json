# Codebase Concerns

**Analysis Date:** 2026-06-26

## Tech Debt

**Duplicate `parseViewBox` function:**
- Issue: Function exists in both `src/parser/svg-parser.ts` and `src/mapper/coordinate-mapper.ts` with identical implementation
- Files: `src/parser/svg-parser.ts:40-45`, `src/mapper/coordinate-mapper.ts:8-13`
- Impact: Risk of divergence if one is updated without the other
- Fix approach: Extract to shared utility module

**Ellipse transform handling is incomplete:**
- Issue: `coordinate-mapper.ts` ellipse case applies scale to `rx`/`ry` but not to `cx`/`cy` (line 153-154)
- Files: `src/mapper/coordinate-mapper.ts:152-161`
- Impact: Ellipses with scale transform will be incorrectly positioned
- Fix approach: Apply `sx`/`sy` to `cx`/`cy` like the circle case does

**Rough text width estimation:**
- Issue: Text width calculated as `fontSize * 10` with no regard for actual character count or font metrics
- Files: `src/mapper/coordinate-mapper.ts:194`
- Impact: Text elements may be significantly wrong in output JSON
- Fix approach: Measure actual text content or use a more realistic estimation

**Path bounding box limited to basic commands:**
- Issue: `pathBoundingBox` only parses M, L, H, V commands; C, Q, A, S, T, Z commands are ignored
- Files: `src/mapper/coordinate-mapper.ts:71-106`
- Impact: Paths using curves or arcs will report incorrect bounding boxes
- Fix approach: Extend parser to handle C, Q, A, S, T commands or mark path as needing special handling

## Known Bugs

**Matrix transforms silently marked as "special":**
- Issue: `parseTransform` detects matrix transforms but only sets `special: true` without actual handling
- Files: `src/mapper/coordinate-mapper.ts:59-63`
- Trigger: SVG with `transform="matrix(...)"` on any element
- Impact: Element coordinates are computed ignoring the matrix transform

## Edge Cases

**Limited CSS color format support:**
- Issue: `colorToHex` handles named colors, hex, and `rgb()` but not `rgba()`, `hsl()`, or percentage values
- Files: `src/transformer/transform-to-pptel.ts:190-205`
- Impact: Modern CSS color syntax may default to black

**No SVG `use` element support:**
- Issue: `use` elements referencing symbols/definitions are not expanded
- Files: `src/parser/svg-parser.ts:71` (childTags list does not include 'use')
- Impact: Referenced elements are silently omitted

**No inline style or `style` element support:**
- Issue: SVG `style` attributes and `<style>` elements are not parsed
- Files: `src/parser/svg-parser.ts`
- Impact: Elements styled via CSS rules are output without styling

**No gradient output support:**
- Issue: Linear gradients are parsed but never converted to PPTElement gradient format
- Files: `src/parser/svg-parser.ts:71` (gradients parsed), `src/transformer/transform-to-pptel.ts` (never used)
- Impact: Gradient fills are lost, fallback to solid fill

**No `clipPath` or `mask` support:**
- Issue: These elements are silently skipped
- Files: `src/transformer/transform-to-pptel.ts:276`, `src/transformer/transform-to-pptel.ts:561`
- Impact: Clipped/masked content renders incorrectly

**Group (`g`) elements are flattened:**
- Issue: Groups are skipped entirely during transformation, children are output as flat list
- Files: `src/transformer/transform-to-pptel.ts:534-536`
- Impact: Any group-level transforms or semantics are lost; `groupId` is never assigned

## Security Considerations

**No input validation on SVG size or complexity:**
- Risk: Maliciously crafted SVG with deep nesting, massive viewBox, or extremely long paths could cause memory/CPU issues
- Files: `src/parser/svg-parser.ts` (no limits)
- Current mitigation: None
- Recommendations: Add depth limits, file size limits, and path complexity limits

**Error messages expose internal details:**
- Risk: Generic `String(err)` in catch blocks may leak file paths or implementation details
- Files: `src/index.ts:38`
- Current mitigation: None visible
- Recommendations: Sanitize error messages for public consumption

## Performance Concerns

**XML parser created per conversion:**
- Issue: `XMLParser` instance is created on every `parseSvg` call
- Files: `src/parser/svg-parser.ts:91-114`
- Impact: Batch processing creates many parser instances
- Fix approach: Create parser once and reuse

**UUID generated for every element:**
- Issue: `uuidv4()` called in `transformElement` for each element
- Files: `src/transformer/transform-to-pptel.ts:263`
- Impact: Overhead for large SVGs with many elements
- Fix approach: Consider `crypto.randomUUID()` (Node 18+) or UUID pool

## Maintainability Concerns

**Large monolithic type file:**
- Issue: `slides.ts` is 800+ lines with all PPTElement types defined
- Files: `src/slides.ts`
- Impact: Hard to navigate; several types (Chart, Table, LaTeX, Video, Audio) are never produced by this converter
- Fix approach: Split into separate files by concern

**Design document references not explained:**
- Issue: Comments reference D-01 through D-09, PITFALL patterns without context
- Files: Throughout codebase (e.g., `src/transformer/transform-to-pptel.ts:11`)
- Impact: Future maintainers cannot understand the rationale
- Fix approach: Either maintain the referenced documents or inline the reasoning

**Named color map duplicated:**
- Issue: Large hardcoded color map exists in `transform-to-pptel.ts`; could conflict if another map is added elsewhere
- Files: `src/transformer/transform-to-pptel.ts:36-171`
- Impact: Maintenance burden if CSS color spec updates
- Fix approach: Use a published color conversion library

## Dependencies at Risk

**`fast-xml-parser` (v5.9.3):**
- Risk: Major version 5.x may have breaking changes; v5 is relatively new
- Impact: Parser configuration is extensive; migration could be painful
- Mitigation: Parser options are well-isolated in `parseSvg` function
- Migration plan: Consider native DOMParser for simpler SVG subset or alternative lightweight parser

**`uuid` (v14.0.1):**
- Risk: Node 18+ has `crypto.randomUUID()` built-in
- Impact: Unnecessary dependency for simple UUID generation
- Migration plan: Replace with `crypto.randomUUID()` since project requires Node 18+

## Missing Critical Features

**No round-trip validation:**
- Problem: No way to verify that output JSON can render back to something equivalent
- Blocks: Confidence in conversion fidelity
- Priority: Medium

**No support for `preserveAspectRatio`:**
- Problem: SVG's aspect ratio handling is ignored
- Impact: Images may stretch incorrectly
- Priority: Low

---

*Concerns audit: 2026-06-26*
