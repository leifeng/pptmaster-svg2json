# Domain Pitfalls: Adding PPTist Schema Properties to svg-to-pptel

**Domain:** SVG-to-PowerPoint JSON conversion library (brownfield, existing v1.0.0)
**Researched:** 2026-06-30
**Confidence:** HIGH

## Critical Pitfalls

Mistakes that cause data loss, incorrect rendering, or breaking changes to existing output.

---

### Pitfall 1: Dual-Copy Coordinate Bug (ellipse cx/cy)

**What goes wrong:** When adding rotation-center support to ellipse, `cx`/`cy` get scaled twice: once during the initial coordinate mapping (`mapCoordinates`) and again when applying the rotation center transform. This produces a wildly incorrect center point.

**Why it happens:** `mapCoordinates` returns `left`/`top` which are already-scaled coordinates. But the ellipse case additionally scales `cx`/`cy` independently:

```typescript
// coordinate-mapper.ts — coords.left/top already scaled by mapCoordinates
const coords = mapCoordinates(element, viewBox)
const scaleX = targetCanvas[0] / viewBox[2]
const scaleY = targetCanvas[1] / viewBox[3]

// ellipse case: cx/cy re-scaled independently
const scaledCx = (Number(element.attrs.cx) || 0) * scaleX
const scaledCy = (Number(element.attrs.cy) || 0) * scaleY

// But: rotation center is scaled again
transform.rotateCX * scaleX  // rotateCX from parseTransform on raw SVG attrs
```

`rotateCX`/`rotateCY` from `parseTransform` are in SVG coordinate space (not yet scaled). But the element's `cx`/`cy` have already been scaled. Comparing a scaled center point against an unscaled rotation center produces wrong results.

**Consequences:** Ellipse renders at completely wrong position when rotation center is specified.

**Prevention:** Always ensure rotation center and element coordinates are in the same coordinate space before comparison. Best practice: keep all values in SVG space until the final output step, then scale once.

**Warning signs:** Ellipse cx/cy values are approximately 1.77x larger than expected (the 720p-to-1000px scale factor).

**Phase:** Phase 5 (transform fixes) already addressed this with per-element scaling, but the pattern applies to any new features touching ellipse/circle.

---

### Pitfall 2: Gradient Resolution Order Confusion

**What goes wrong:** Adding gradient support to shape elements, but the gradient object gets placed on the wrong attribute name (`attrs.gradient` vs the actual PPTElement `gradient` field), causing the gradient to be silently dropped.

**Why it happens:** The parser resolves `fill="url(#gradientId)"` at parse time and stores the gradient object in `attrs.gradient` (D-15). The transformer checks `element.attrs.gradient` and assigns it to `result.gradient`. This works correctly **only if** the gradient resolution happens before `convertToSvgElement` processes the element. The dependency chain must be: collect gradient defs first, then resolve references during element conversion.

**Consequences:** Shape renders with solid color instead of gradient. No error thrown — silent data loss.

**Prevention:** Maintain the two-pass pattern: first pass collects all defs (gradient/filter registries), second pass resolves references. When adding new def types (e.g., pattern defs), follow this same two-pass pattern. Document the resolution order explicitly.

**Warning signs:** `fill` property present on output when `fill="url(#...)"` was in input SVG.

**Phase:** Affects shape gradient feature.

---

### Pitfall 3: Adding `undefined` Explicitly Breaks JSON Output

**What goes wrong:** When adding new optional PPTist properties (e.g., `text.fill`, `image.filters`), code adds the property even when the SVG has no corresponding attribute, resulting in `{ ..., fill: undefined }` in the output JSON.

**Why it happens:** Spread syntax with conditional properties and explicit `undefined` initialization:

```typescript
// WRONG pattern
const result: PPTTextElement = {
  ...
  ...(element.attrs.stroke && { outline: { color: colorToHex(element.attrs.stroke) } }),
  shadow: undefined,  // This line always adds shadow: undefined
  ...
}
```

The `shadow: undefined` line explicitly sets the property even when no shadow exists. While TypeScript types allow `undefined`, the serialized JSON includes the value or causes unexpected behavior in consumers.

**Consequences:** Output JSON contains `shadow: null` after serialization. PPTist consumer may interpret `shadow: null` differently than absent `shadow` field. Bloats output size.

**Prevention:** Only include properties when they have values. Use conditional spread pattern consistently:

```typescript
// CORRECT pattern — only include shadow when element.attrs.shadow exists
...(element.attrs.shadow && { shadow: element.attrs.shadow })
```

Never initialize optional properties to `undefined` in the object literal.

**Warning signs:** New properties appear in output even for SVGs that don't use them.

**Phase:** Affects text shadow, text fill, image filters, image clip, shape shadow features.

---

### Pitfall 4: Attribute Name Case Collision in SVG Parser

**What goes wrong:** When adding support for `flipH`/`flipV` from SVG `transform` attribute, the code uses the same field name as the output PPTElement property, but SVG `transform` parsing returns camelCase keys (`flipH`, `flipV`) from negative scale detection. These collide with shape element properties that are also named `flipH`/`flipV`.

**Why it happens:** `parseTransform` returns a `TransformResult` with `flipH`/`flipV` from negative scale detection. The transformer extracts `{ rotate, flipH, flipV }` from `applyTransform`. But the actual element's attrs also have a `transform` string that was already parsed. Confusion arises when `flipH`/`flipV` appear both in the transform result AND as direct element attributes (from an SVG element using `flipH="true"` directly rather than via scale transform).

**Consequences:** `flipH`/`flipV` set from transform scale may be incorrectly overwritten by element attrs, or vice versa.

**Prevention:** Clear separation between transform-derived flips and direct attribute flips. Document that `flipH`/`flipV` on shape/image come from two sources: (1) negative scale in transform attribute, (2) explicit flip attributes. Both should set the same property; if both are present they must agree.

**Warning signs:** Flip behavior inconsistent between different SVG sources.

**Phase:** Affects shape flipH/flipV, image flipH/flipV features.

---

### Pitfall 5: Color Opacity Encoding Inconsistency

**What goes wrong:** When adding text fill with opacity, `fill-opacity` is converted to `rgba()` string for the inline span style, but the base text `defaultColor` retains the hex color without opacity. This means the text has two color representations that can diverge.

**Why it happens:** Current text handling converts `fill-opacity < 1` to an rgba string in the span style:

```typescript
// Current pattern in text case
const hasRgba = fillOpacity && parseFloat(fillOpacity) < 1
let spanStyle = `font-size: ${scaledFontSize}px`
if (hasRgba) {
  const rgbaColor = colorToRgba(fillColor, parseFloat(fillOpacity))
  spanStyle += `; color: ${rgbaColor}`
}
```

But `defaultColor` remains a hex color without opacity. If PPTist consumer ignores the inline span style, it sees the wrong color.

**Consequences:** Text renders at wrong color when consumer uses `defaultColor` directly instead of parsing the HTML content.

**Prevention:** When `fill-opacity < 1`, either (a) use rgba color for `defaultColor` as well, or (b) ensure `fill` is rendered as a separate PPTist property and the inline style is the authoritative source. Document which approach is used.

**Warning signs:** Text opacity works in some consumers but not others.

**Phase:** Affects text fill feature.

---

### Pitfall 6: Image Filter Syntax Mismatch

**What goes wrong:** When adding image filter support (blur, brightness, etc.), the SVG `filter` attribute uses `url(#filterId)` referencing a `<filter>` element with `<feGaussianBlur>` etc. But PPTist's `ImageElementFilters` type uses CSS-like string values (`'blur: 5px'`, `'brightness: 150%'`). Direct attribute mapping produces wrong format.

**Why it happens:** SVG filter primitives (`feGaussianBlur stdDeviation="5"`, `feColorMatrix type="hueRotate" values="90"`) map to CSS filter syntax differently than 1:1. The conversion requires parsing SVG filter primitives and emitting CSS filter strings.

**Consequences:** Image filters either not applied or applied with wrong values in PowerPoint output.

**Prevention:** Build an explicit SVG filter-to-CSS filter conversion function. Do not attempt direct attribute mapping. Test with multiple filter types combined.

**Warning signs:** filters property present but with wrong format (e.g., object instead of string).

**Phase:** Affects image filters feature.

---

### Pitfall 7: Text Shadow vs SVG Filter Shadow Schema Mismatch

**What goes wrong:** SVG text shadows are typically implemented via `filter="url(#shadowId)"` referencing a `<feDropShadow>` element. This gets resolved to a shadow object in `attrs.shadow`. PPTist's `PPTTextElement.shadow` is the same `PPTElementShadow` type used by shapes. However, text shadow renders differently from shape shadow in PowerPoint due to character spacing.

**Why it happens:** The shadow object structure (`h`, `v`, `blur`, `color`) is shared, but the rendering effect differs between text and shape contexts in PowerPoint. Reusing the same shadow object may produce inconsistent results.

**Consequences:** Text shadow renders with wrong offset/blur compared to shape shadow with identical parameters.

**Prevention:** Document that text shadow conversion needs verification against actual PowerPoint rendering. Consider whether PPTist has separate shadow handling for text vs shape, and ensure the conversion matches. If PPTist schema shares the shadow type, flag this as a known limitation.

**Warning signs:** Text shadow and shape shadow with identical parameters produce visibly different effects.

**Phase:** Affects text shadow feature.

---

### Pitfall 8: Image Clip Schema Misalignment

**What goes wrong:** PPTist's `ImageElementClip` has `{ range: [[x1,y1], [x2,y2]], shape: string }`. SVG clipping uses `<clipPath>` with `<rect>` or `<path>` child. The conversion requires parsing SVG clipPath geometry into PPTist's percentage-based range + named shape. Direct attribute mapping is impossible.

**Why it happens:** SVG clip coordinates are in SVG units; PPTist clip range is percentages `[0,100]`. The mapping requires knowing the intrinsic image dimensions and converting units.

**Consequences:** Image clip either not implemented or produces wrong clip region.

**Prevention:** Design the clip conversion carefully: extract clipPath child geometry, map to image pixel coordinates, convert to percentage range, infer the closest PPTist named clip shape. Consider deprioritizing clip conversion or implementing it as a separate pass.

**Warning signs:** Image with `clip-path="url(#clipId)"` produces no `clip` property in output JSON.

**Phase:** Affects image clip feature.

---

### Pitfall 9: Line Stroke Width Collides with Coordinate Width

**What goes wrong:** The `line` element uses `width` to mean stroke width (D-24: `stroke-width` maps to `result.width = strokeWidth || 1`). But `line` element also has `left`/`top`/`width`/`height` from `mapCoordinates`. The `width` property name is overloaded: in `PPTLineElement` it means stroke width, but in other elements it means element width.

**Why it happens:** `PPTLineElement` extends `Omit<PPTBaseElement, 'height' | 'rotate'>` — it removes `height` and `rotate` but **keeps** `width`. However, the line's `width` in the base interface means element width, while the line-specific `width` means stroke width. This naming collision makes the code confusing.

**Consequences:** When modifying line handling, developers may incorrectly assume `width` refers to element width. Adding new line properties requires careful disambiguation.

**Prevention:** Document the `width` overload clearly. When adding new line properties, check whether they refer to stroke width or element dimensions. Use explicit variable names to disambiguate in transformer code.

**Warning signs:** Confusion in code comments about what `width` represents.

**Phase:** Affects line width feature.

---

### Pitfall 10: Backwards Compatibility — Adding New Required Fields

**What goes wrong:** Adding new features introduces new optional fields to PPTElement types. If a future change makes one of these fields required, or if the PPTist schema evolves to require them, existing output JSON would become invalid.

**Why it happens:** Schema evolution. The current `PPTTextElement` has many optional fields. Adding `fill`, `shadow`, `vAlign`, `fixedHeight`, `wordSpace` as properties to the object output means the JSON structure changes, even if the values are absent.

**Consequences:** Existing consumers of the JSON output may break if they don't handle new fields, or if the JSON parser is strict about unexpected fields.

**Prevention:** New fields must always be optional (or omitted entirely via conditional spread). Never make a new field required. Add fields only via conditional spread. Write tests that verify new optional fields don't appear when not applicable.

**Warning signs:** Output JSON has more fields than before.

**Phase:** Affects all new features.

---

## Integration Pitfalls

### Copy-Paste Error in Shape Switch Cases

The transformer has nearly identical code for `rect`, `circle`, `ellipse`, `path`, `polygon`, `polyline` shape cases. Each sets `fill`, `gradient`, `flipH`, `flipV`, `outline`, `shadow`, `groupId`. When adding a new property to shapes, it must be added to ALL shape cases consistently. A common mistake is adding it to one case (e.g., `rect`) and forgetting others.

**Prevention:** When adding a shape property, write a helper function that builds the common properties and call it from each case. Do not duplicate the property-setting logic across 6 switch cases.

### Transform Parsing Side Effects

`parseTransform` in coordinate-mapper.ts is called during transformation. If new features add new transform types (e.g., `skewX`, `skewY`), `parseTransform` must be updated. Changes there affect ALL element types. Test thoroughly when modifying transform parsing.

### Conflicting Property Names Across Element Types

`outline` exists on `PPTShapeElement`, `PPTImageElement`, `PPTTextElement`, `PPTChartElement`, `PPTTableElement`. Each has the same type `PPTElementOutline`. However, the shape case already assigns `outline` from `stroke` attribute, the text case assigns it from `stroke` attribute too, and the image case does the same (D-25). Adding new outline sources must not duplicate or overwrite correctly-set outline objects.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Shape gradient | Pitfall 2 (resolution order) | Follow existing two-pass def collection pattern |
| Shape shadow | Pitfall 3 (undefined explicit) | Use conditional spread, never initialize to undefined |
| Shape flipH/flipV | Pitfall 4 (case collision) | Separate transform-derived vs direct-attr flips |
| Text fill | Pitfall 5 (opacity encoding) | Use rgba consistently across defaultColor and span style |
| Text outline | Pitfall 3, Pitfall 10 | Conditional spread, no undefined |
| Text shadow | Pitfall 7 (schema mismatch) | Verify PowerPoint rendering matches |
| Image outline | Pitfall 3 | Conditional spread |
| Image filters | Pitfall 6 (syntax mismatch) | Build explicit SVG-to-CSS filter converter |
| Image clip | Pitfall 8 (schema misalignment) | Consider deprioritizing; complex conversion |
| Image flipH/flipV | Pitfall 4 | Same as shape flip |
| Line width | Pitfall 9 (overloaded name) | Document clearly; disambiguate in code |

---

## Sources

- Codebase analysis: `src/transformer/transform-to-pptel.ts` (existing transformer implementation)
- Codebase analysis: `src/parser/svg-parser.ts` (gradient/filter resolution)
- Codebase analysis: `src/types/ast.ts` (SVG AST types)
- Codebase analysis: `src/slides.ts` (PPTElement schema)
- Codebase analysis: `src/transformer/apply-transform.ts` (transform application)
- Project state: `.planning/PROJECT.md` (milestone v1.2 goals)

---

*Pitfalls research for: svg-to-pptel v1.2 PPTist format alignment*
*Researched: 2026-06-30*
---

# Domain Pitfalls: Directory Batch CLI for SVG-to-JSON

**Domain:** CLI batch processing for file conversion library
**Researched:** 2026/07/02
**Context:** svg-to-pptel v1.3 — TypeScript library, async convert(), existing CLI with basic directory walk

---

## Critical Pitfalls

### Pitfall 11: Output File Naming Collisions
**What goes wrong:** When converting dir/foo.svg and dir/bar.svg, both write to foo.json / bar.json in the same output directory. If two SVG files have the same basename (e.g., icon.svg in different subdirectories), one overwrites the other silently.

**Why it happens:** The existing walkDir preserves subdirectory structure in the path, but does not use it for output organization.

**Consequences:**
- Data loss: one file conversion is lost
- Silent failures: user may not notice until they check
- Debugging nightmare: different inputs produce identical outputs

**Prevention:** When outputting to a directory, either:
- Mirror the source directory structure in the output (e.g., out/dir/foo.json)
- Use unique output names (e.g., out/foo.svg.json)
- Detect and warn about collisions before writing

**Detection:** Log which files were written; compare input count vs output count.

---

### Pitfall 12: --output with Directory Input Semantics
**What goes wrong:** The current CLI forbids --output with directory input entirely. This prevents useful patterns like --output ./outdir.

**Why it happens:** The error message says single file holds one result — but this conflates output to stdout with output to a directory.

**Consequences:**
- Cannot batch-convert to a specific output directory
- Forces users to pipe and redirect manually

**Prevention:**
- Allow --output dir when input is a directory
- Interpret it as write all results to this directory
- Error only if --output points to a file when input is a directory

**Phase:** Phase 1 fix — the logic already exists, just needs to be corrected.

---

### Pitfall 13: Concurrent File System Pressure
**What goes wrong:** Processing 1000+ SVG files concurrently overwhelms the file system or exhausts memory (resvg-js text measurement is async and expensive).

**Why it happens:** Naive parallel implementation processes all files simultaneously. resvg-js initialization is heavy; concurrent text measurement compounds this.

**Consequences:**
- System-wide slowdown or OOM
- Conversion quality degrades under memory pressure
- Silent failures or corrupted outputs

**Prevention:**
- Use a bounded concurrency pool (e.g., p-limit with concurrency of 4-8)
- Monitor memory usage; pause intake if near limits
- Consider a progress bar that shows active workers

**Phase:** Phase 2 or 3, depending on target use scale.

---

### Pitfall 14: Partial Failure Exit Code
**What goes wrong:** The existing code process.exit(0) even when some files fail (line 103). This hides failures from scripts that depend on the CLI.

**Why it happens:** Exit 0 even on partial failure per RESEARCH.md recommendation — but RESEARCH.md likely meant dont fail the whole batch for one bad file, not always exit 0.

**Consequences:**
- CI pipelines pass despite conversion errors
- Scripts cannot distinguish partial from complete success
- Users think all files succeeded

**Prevention:**
- Exit 0 only when errorCount === 0
- Exit 1 when errorCount > 0
- Consider --fail-fast flag to stop on first error
- At minimum: add --partial-ok flag for scripts that want the old behavior

**Phase:** Phase 1 — simple fix, high value.

---

### Pitfall 15: Missing Output Directory Creation
**What goes wrong:** If --output outdir is specified and the directory does not exist, the write fails.

**Why it happens:** writeFileSync does not auto-create parent directories.

**Consequences:**
- Batch fails because one subdirectory is missing
- User must manually mkdir -p before running
- Confusing error: ENOENT no such file or directory

**Prevention:**
- Before writing any file, ensure output directory exists: mkdir -p(outdir, recursive: true)
- Do this once at the start of batch processing

**Phase:** Phase 1.

## Moderate Pitfalls

### Pitfall 16: No Progress Feedback for Large Batches
**What goes wrong:** User runs batch on 500 files, sees nothing for 2 minutes, then gets all output at once.

**Why it happens:** Current implementation prints per-file results but no aggregate progress.

**Consequences:**
- User thinks CLI is hung
- Cannot estimate time remaining
- No way to cancel gracefully (Ctrl+C leaves partial output)

**Prevention:**
- Show progress: Processing [45/500]: filename.svg...
- Use a non-interactive progress bar for CI (--quiet flag suppresses it)
- Handle SIGINT to clean up and report partial results

**Phase:** Phase 2.

---

### Pitfall 17: Mixing Stdout and Stderr Output
**What goes wrong:** In directory mode, results go to console.log (stdout) while errors go to console.error (stderr). Users who redirect stdout to a file miss errors.

**Why it happens:** Per-file results use console.log, summary uses console.error.

**Consequences:**
- Errors are lost in redirected output
- Log files contain only the JSON results, not failures
- Hard to correlate which file had which error

**Prevention:**
- Use consistent output channel (prefer stdout for results, only use stderr for fatal errors)
- Or provide --log-file path to capture all diagnostic output
- Add --json flag for machine-readable output (all results as JSON array)

**Phase:** Phase 2.

---

### Pitfall 18: Recursive Walk Symlink Loops
**What goes wrong:** If a directory contains symlinks to parent directories, walkDir with --recursive enters an infinite loop.

**Why it happens:** statSync follows symlinks by default; no cycle detection.

**Consequences:**
- CLI hangs
- Exhausts file descriptors or disk space
- Possible crash with stack overflow on deep recursion

**Prevention:**
- Use lstatSync to detect symlinks, or
- Track visited inode/dev pairs and skip already-seen directories
- Provide --follow-symlinks flag (default false)

**Phase:** Phase 1 (quick fix) or Phase 3 (robust symlink handling).

---

### Pitfall 19: Large Single File Crashes Memory
**What goes wrong:** A 50MB SVG file (e.g., traced from high-res image) causes OOM during resvg-js rendering.

**Why it happens:** resvg-js loads and rasterizes the entire SVG; no streaming or size limits.

**Consequences:**
- CLI crashes the Node process
- Affects other files being processed concurrently
- No partial output

**Prevention:**
- Set a max file size limit (e.g., 10MB) and skip files exceeding it with a warning
- Add --max-file-size bytes flag
- Report which files were skipped and why

**Phase:** Phase 2 or 3.

## Minor Pitfalls

### Pitfall 20: File Extension Case Sensitivity
**What goes wrong:** walkDir uses .toLowerCase() === .svg — this misses .SVG, .Svg on case-sensitive filesystems (Linux), but works on macOS/Windows by default.

**Why it happens:** Inconsistent behavior across platforms.

**Consequences:**
- Works on developer machine, fails on Linux CI
- Or vice versa depending on how the code evolves

**Prevention:**
- Normalize extension comparison: extname(entry).toLowerCase() === .svg
- Already done in line 43 of cli.ts — this is correct. Just be aware not to fix it to case-sensitive.

---

### Pitfall 21: --recursive Default Behavior Confusion
**What goes wrong:** Without --recursive, only .svg files in the top-level directory are converted. Subdirectories are silently skipped.

**Why it happens:** Default is non-recursive.

**Consequences:**
- User expects --recursive to be the default for directory processing
- Or expects an error/warning when subdirs exist but are skipped
- Confusion about why some files are missing from output

**Prevention:**
- Add a warning when subdirectories exist but --recursive is not set
- Or make --recursive the default and add --no-recursive to opt out
- Document the behavior clearly in --help

**Phase:** Phase 1 or 2.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Basic batch output | Pitfall 15 (output dir creation) | Use mkdir -p before writing |
| Phase 1: Basic batch output | Pitfall 14 (exit code on partial failure) | Exit 1 when errors > 0 |
| Phase 1: Basic batch output | Pitfall 11 (collision on same-basename files) | Mirror dir structure in output |
| Phase 2: Performance | Pitfall 13 (concurrent memory pressure) | Bounded concurrency pool |
| Phase 2: Progress UX | Pitfall 16 (user thinks CLI is hung) | Per-file progress output |
| Phase 2: Large batches | Pitfall 18 (symlink infinite loops) | Use lstat or track visited inodes |
| Phase 3: Robustness | Pitfall 19 (large SVG OOM) | Max file size limit |
| Phase 3: CI/Automation | Pitfall 17 (mixed stdout/stderr) | Consistent channel, --json flag |

---

## Sources

- Existing src/cli.ts implementation (walkDir, processFile, error handling)
- Node.js fs documentation (mkdir behavior, symlink handling)
- General CLI design wisdom from CLI guidelines (clig.dev, POSIX conventions)
- svg-to-pptel project context (async convert(), resvg-js text measurement)

---

*Pitfalls research for directory batch CLI feature added: 2026/07/02*
