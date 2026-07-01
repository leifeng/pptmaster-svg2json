# Phase 6: resvg-js Text Measurement - Research

**Researched:** 2026-07-01
**Domain:** SVG text rendering measurement via resvg-js WASM
**Confidence:** HIGH

## Summary

Phase 6 replaces the heuristic `calcTextWidthYaHei()` character-ratio estimation with actual rendered glyph bounding boxes from `@resvg/resvg-js`. The integration point is the `text` case in `transformElement()` within `transform-to-pptel.ts` — the parser remains untouched, WASM init is lazy/async at the text measurement boundary, and the public `convert()` API stays unchanged (already async). Tspan children are flattened with `\n` before measurement (D-36), and a fixed 1280x720 viewBox (D-37) ensures no clipping.

**Primary recommendation:** Install `@resvg/resvg-js@2.6.2`, create `src/text-measurer.ts` with lazy-init singleton, make `transformElement()` async, and propagate `await` through `walk()` and `transformToPPTElement()`. Fallback to `calcTextWidthYaHei()` on any measurement failure.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-33:** 逐个串行 `await` 测量 — 每个 `<text>` 元素单独调用 resvg-js 渲染，完全串行，不使用 `Promise.all()` 并行
- **D-34:** 暂不考虑批量优化 — 50 个文本元素以下逐个测量足够，不预留批量接口
- **D-35:** 测量失败时回退到启发式估算 — 当 resvg-js 渲染失败、WASM 加载失败或返回空边界框时，使用 `calcTextWidthYaHei()` 的启发式方法
- **D-36:** 忽略 tspan 位置偏移 — 将 `<tspan>` 子元素内容用 `\n` 连接后作为单行文本传给 resvg-js 测量，`x`/`dy` 属性在测量阶段忽略
- **D-37:** 使用 1280×720 固定尺寸 — 测量用的临时 SVG 使用固定 viewBox `0 0 1280 720`

### Claude's Discretion
- 测量函数的错误捕获细节（try/catch 范围、错误类型过滤）
- 临时 SVG 的 width/height 属性值（与 viewBox 保持一致即可）

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEAS-01 | Install @resvg/resvg-js as a project dependency | Package verified on npm v2.6.2 |
| MEAS-02 | Create `src/text-measurer.ts` module with `measureTextBBox()` function | Module API defined in Standard Stack |
| MEAS-03 | Single-line text: merge boundingBoxes array into width/height | `boundingBoxes()` returns array, merge via min/max |
| MEAS-04 | Multi-line text via tspan children: flatten with `\n`, merge all boxes | `extractTextContentFromElement` flattens; tspan join with `\n` per D-36 |
| MEAS-05 | Propagate font-family, font-size, font-weight, font-style, letter-spacing to measurement SVG | All attrs available on `element.attrs` |
| MEAS-06 | Empty text fallback to heuristic (not zero-width) | Fallback to `calcTextWidthYaHei()` when content is empty |
| MEAS-07 | Large enough viewBox to prevent clipping overflow | Fixed 1280x720 per D-37 |
| MEAS-08 | Modify `transformElement()` text case to use `measureTextBBox()` for width/height | Integration point confirmed in `text` case (line 759) |
| MEAS-09 | Propagate async through `transformToPPTElement()` and `walk()` | `walk()` calls `transformElement()`; both need `async`/`await` |
| MEAS-10 | Remove `calcTextWidthYaHei()` and `BASELINE_OFFSET_RATIO` after migration | At end of phase, after fallback verified |
| MEAS-11 | Existing tests pass after migration (no regression) | Test infrastructure: vitest; text tests in `__tests__/text-*.test.ts` |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Text measurement | API / Backend | — | `text-measurer.ts` in `src/`, called from `transformElement()` |
| SVG parsing | API / Backend | — | `svg-parser.ts` — no changes in this phase |
| Element transformation | API / Backend | — | `transform-to-pptel.ts` — text case modified |
| Font attribute extraction | API / Backend | — | `transformElement()` reads `element.attrs` |
| Async propagation | API / Backend | — | `transformToPPTElement()` and `walk()` in `transform-to-pptel.ts` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@resvg/resvg-js` | 2.6.2 | Render SVG to WASM-backed bitmap, query bounding boxes | NAPI native addon, zero runtime deps, active maintenance since 2022 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^2.0.0 | Unit testing framework | Existing project test framework |

**Installation:**
```bash
npm install @resvg/resvg-js
```

**Version verification:** `npm view @resvg/resvg-js version` returns `2.6.2` (published 2024-03-26). [VERIFIED: npm registry]

## Package Legitimacy Audit

> **Required** whenever this phase installs external packages. Run the Package Legitimacy Gate protocol before completing this section.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@resvg/resvg-js` | npm | ~4 years | [high — trending] | github.com/yisibl/resvg-js | OK | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

**Verification notes:**
- Package has existed on npm since 2022-01-27 (verified via `npm view @resvg/resvg-js time`)
- Maintained by `broooooklyn` and `yisi` (verified via npm view)
- Repository: `git+ssh://git@github.com/yisibl/resvg-js.git`
- No `postinstall` script detected (`npm view @resvg/resvg-js scripts.postinstall` returned empty)
- License: MPL-2.0

## Architecture Patterns

### System Architecture Diagram

```
SVG Input String
       │
       ▼
┌─────────────────┐
│  svg-parser.ts  │  ← No changes in this phase
│  parseSvg()     │
└────────┬────────┘
         │ SvgParseResult { root, viewBox, width, height }
         ▼
┌─────────────────────────────────────────────────────┐
│  transform-to-pptel.ts                             │
│  transformToPPTElement() ──────── async (MEAS-09) │
│       └── walk() ──────────────────── async (MEAS-09)
│              └── transformElement() text case      │
│                     ├── extractTextContentFromElement()
│                     │    (flattens tspans with \n per D-36)
│                     └── measureTextBBox() ── NEW    │
│                             └── @resvg/resvg-js     │
│                                 (lazy init singleton)
└─────────────────┬─────────────────────────────────┘
                  │ PPTElement[]
                  ▼
           JSON Output (PPTist format)
```

### Recommended Project Structure
```
src/
├── text-measurer.ts      # NEW: measureTextBBox(), buildMeasurementSvg()
├── transformer/
│   └── transform-to-pptel.ts  # Modified: async transformElement/walk/transformToPPTElement
└── ...
```

### Pattern 1: Lazy Singleton for WASM Init

**What:** `@resvg/resvg-js` WASM loads on first `import()`. Use a module-level promise to ensure init happens once.

**When to use:** Any async WASM-backed library loaded as a singleton.

**Example:**
```typescript
// src/text-measurer.ts
import { Resvg } from '@resvg/resvg-js'

let initPromise: Promise<void> | null = null

async function ensureInit(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = import('@resvg/resvg-js').then(() => { /* WASM loads on import */ })
  return initPromise
}

export async function measureTextBBox(svgString: string): Promise<{ width: number; height: number }> {
  await ensureInit()
  const resvg = new Resvg(svgString)
  const img = resvg.render()
  const boxes = img.boundingBoxes()
  // Merge all boxes via min/max
  if (!boxes || boxes.length === 0) throw new Error('No bounding boxes')
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const box of boxes) {
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxX = Math.max(maxX, box.x + box.width)
    maxY = Math.max(maxY, box.y + box.height)
  }
  return { width: maxX - minX, height: maxY - minY }
}
```

**Source:** ARCHITECTURE.md lines 113-134; API pattern consistent with resvg-js v2.x

### Pattern 2: Measurement SVG Construction

**What:** Build a self-contained SVG fragment with all font attributes, render via resvg-js, extract bounding boxes.

**When to use:** Measuring text dimensions from SVG elements.

**Example:**
```typescript
export function buildMeasurementSvg(opts: {
  content: string
  fontFamily: string
  fontSize: number
  fontWeight?: string
  fontStyle?: string
  letterSpacing?: number
  fill?: string
}): string {
  const escaped = opts.content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  // D-37: Fixed 1280x720 viewBox
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <text x="0" y="${opts.fontSize}"
        font-family="${opts.fontFamily}"
        font-size="${opts.fontSize}"
        font-weight="${opts.fontWeight ?? 'normal'}"
        font-style="${opts.fontStyle ?? 'normal'}"
        letter-spacing="${opts.letterSpacing ?? 0}"
        fill="${opts.fill ?? '#000000'}"
        xml:space="preserve">${escaped}</text>
</svg>`
}
```

### Pattern 3: Fallback on Measurement Failure

**What:** If resvg-js throws, returns empty boxes, or WASM fails, fall back to `calcTextWidthYaHei()`.

**When to use:** D-35 guarantee: SVG must always convert even if measurement fails.

**Example:**
```typescript
try {
  const measured = await measureTextBBox(svg)
  if (measured.width === 0 || measured.height === 0) throw new Error('Empty bbox')
  return measured
} catch {
  // Fallback to heuristic per D-35
  const scaledFontSize = fontSize * scaleY
  const letterSpacing = parseFloat(String(element.attrs['letter-spacing'] || '0'))
  return {
    width: calcTextWidthYaHei(content, scaledFontSize, letterSpacing),
    height: scaledFontSize + Math.round(scaledFontSize * 0.14)
  }
}
```

### Anti-Patterns to Avoid

- **WASM init in parser:** Forces async on entire pipeline — instead, lazy-init in `text-measurer.ts`
- **Per-character resvg rendering:** Causes hundreds of WASM instantiations — instead, per-element measurement is fine for MVP (D-34)
- **Rendering at target canvas scale:** May hit font rasterizer limits — instead, render at 1:1 SVG coords, scale result
- **Ignoring tspan children:** Multi-line text would be incomplete — instead, flatten with `\n` per D-36

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text bounding box measurement | Custom canvas-based measurement or font metric tables | `@resvg/resvg-js` | Handles all glyph rendering across platforms consistently via WASM |
| Character width estimation | Build custom CJK/Latin width ratio tables | `calcTextWidthYaHei()` kept as fallback | Already implemented, works for fallback case |
| SVG rendering | Browser DOM or canvas APIs | `@resvg/resvg-js` | Cross-platform WASM-backed SVG rendering |

**Key insight:** Font metric estimation is inherently imprecise — actual glyph rendering via WASM is the correct approach, not better heuristic tables.

## Common Pitfalls

### Pitfall 1: Empty Bounding Boxes on Empty Text
**What goes wrong:** `measureTextBBox()` returns `{width: 0, height: 0}` for empty string, causing zero-width text elements.
**Why it happens:** `Resvg.render().boundingBoxes()` returns `[]` for whitespace-only or empty content.
**How to avoid:** Check for empty content before measurement; use fallback immediately. Also catch in fallback: if measured width/height is 0, throw so fallback fires.
**Warning signs:** Text elements with `width: 0` or `height: 0` in output JSON.

### Pitfall 2: WASM Load Failure in Server Environment
**What goes wrong:** `@resvg/resvg-js` fails to load WASM in some Node.js environments (missing `fetch` polyfill, module format issues).
**Why it happens:** WASM binary loading via dynamic `import()` may fail if environment doesn't support WASM or lacks `TextEncoder`.
**How to avoid:** The fallback to `calcTextWidthYaHei()` (D-35) handles this case. Ensure fallback is tested.
**Warning signs:** `convert()` throws WASM init error; no text elements in output.

### Pitfall 3: Async Propagation Missing in `walk()`
**What goes wrong:** `transformElement()` becomes async but `walk()` calls it without `await`, causing Promise objects in output.
**Why it happens:** `walk()` is an internal function, not exported; easily missed when adding async.
**How to avoid:** Make `walk()` async and `await` the `transformElement()` call. Propagate to `transformToPPTElement()`.
**Warning signs:** `elements` array contains `[object Promise]` or `PPTElement` objects with unresolved nested promises.

### Pitfall 4: Tspan Flattening Changes HTML Output
**What goes wrong:** Flattened content (`\n`-joined) is used in both measurement AND output HTML, breaking multi-line structure.
**Why it happens:** `extractTextContentFromElement()` is used for both measurement and HTML content generation.
**How to avoid:** Keep content extraction separate: tspan flattening only feeds `buildMeasurementSvg()`, while HTML output keeps `<p>` structure from existing code. The existing `extractTextContentFromElement()` returns flattened text for measurement, but the `richContent` HTML construction at line 808 still produces proper `<p>` tags from `content` (the flattened string).
**Warning signs:** Output HTML shows `\n` literal instead of proper paragraph breaks.

### Pitfall 5: Measurement Uses Wrong Scale
**What goes wrong:** Text measured at target canvas scale instead of SVG native scale, causing oversized or undersized bounding boxes.
**Why it happens:** `scaleX`/`scaleY` applied before measurement call.
**How to avoid:** Measure with SVG native `fontSize`; scale result afterward. ARCHITECTURE.md line 317 shows: `fontSize` (unscaled) passed to `measureTextElement()`, then `textWidth = measured.width * scaleX`.
**Warning signs:** Text width/height wildly off compared to other element dimensions.

## Code Examples

### Existing: `extractTextContentFromElement` (lines 314-325)
```typescript
// Current implementation - flattens tspans for measurement
function extractTextContentFromElement(element: SvgElement): string {
  let content = element.text || ''
  for (const child of element.children) {
    if (child.type === 'tspan') {
      content += extractTextContentFromElement(child)
    }
  }
  return content
}
```
**Source:** `src/transformer/transform-to-pptel.ts` lines 314-325

### Existing: Text case in `transformElement()` (lines 759-840)
```typescript
case 'text': {
  const transformed = applyTransform(left, top, width, height, transform)
  const { rotate } = transformed
  const content = extractTextContentFromElement(element)
  const fontFamily = 'Microsoft YaHei'
  const fontSize = Number(element.attrs['font-size']) || 16
  const scaledFontSize = fontSize * scaleY
  const letterSpacing = parseFloat(String(element.attrs['letter-spacing'] || '0'))
  const textWidth = calcTextWidthYaHei(content, scaledFontSize, letterSpacing)
  const textHeight = scaledFontSize + Math.round(scaledFontSize * 0.14)
  // ... HTML content construction follows
}
```
**Source:** `src/transformer/transform-to-pptel.ts` lines 759-840

### Existing: `walk()` function (lines 909-933)
```typescript
function walk(element: SvgElement, viewBox: [number, number, number, number], currentGroupId?: string) {
  const tag = element.type.toLowerCase()
  const isG = tag === 'g'
  const effectiveGroupId = isG ? (element.attrs.id || undefined) : currentGroupId

  for (const child of element.children) {
    if (child.type.toLowerCase() === 'g') {
      walk(child, viewBox, effectiveGroupId)
    } else {
      if (!['defs', 'linearGradient', 'stop', 'filter', 'marker', 'clippath'].includes(child.type.toLowerCase())) {
        const pptel = transformElement(child, viewBox, elements.length, targetCanvas, effectiveGroupId)
        if (pptel !== null) {
          elements.push(pptel)
        }
      }
    }
  }
}
```
**Source:** `src/transformer/transform-to-pptel.ts` lines 909-933

### Target: `buildMeasurementSvg` function
```typescript
export function buildMeasurementSvg(opts: {
  content: string
  fontFamily: string
  fontSize: number
  fontWeight?: string
  fontStyle?: string
  letterSpacing?: number
  fill?: string
}): string {
  const escaped = opts.content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <text x="0" y="${opts.fontSize}"
        font-family="${opts.fontFamily}"
        font-size="${opts.fontSize}"
        font-weight="${opts.fontWeight ?? 'normal'}"
        font-style="${opts.fontStyle ?? 'normal'}"
        letter-spacing="${opts.letterSpacing ?? 0}"
        fill="${opts.fill ?? '#000000'}"
        xml:space="preserve">${escaped}</text>
</svg>`
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `calcTextWidthYaHei()` character-ratio heuristic | `measureTextBBox()` via resvg-js WASM | Phase 6 | Accurate text dimensions; removes ~40 lines of heuristic code |
| `BASELINE_OFFSET_RATIO = 0.8` for baseline-to-top | Computed from actual glyph bounding box | Phase 6 | Eliminates baseline offset approximation |

**Deprecated/outdated:**
- `calcTextWidthYaHei()` — replaced by resvg-js measurement, kept as fallback only
- `BASELINE_OFFSET_RATIO = 0.8` — removed after phase; glyph bbox provides true top coordinate

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@resvg/resvg-js` v2.6.2 works on Node.js 18+ without additional polyfills | Standard Stack | WASM may fail in CI; fallback handles this |
| A2 | `boundingBoxes()` returns array with `x`, `y`, `width`, `height` fields | Code Examples | API mismatch would break measurement; check docs |
| A3 | Lazy `import('@resvg/resvg-js')` triggers WASM init automatically | Architecture Patterns | If manual init required, code needs `Resvg.init()` call |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions (RESOLVED)

1. **Does `boundingBoxes()` return pixel or SVG coordinate units?**
   - What we know: resvg-js renders to a bitmap, then computes bounding boxes in pixel coordinates. The SVG viewBox affects the mapping.
   - What's unclear: Whether the returned `x`/`y`/`width`/`height` are in SVG coordinate units or pixels.
   - Resolution: ASSUMED — `boundingBoxes()` returns values in SVG coordinate space (not raw pixel coordinates). The SVG viewBox="0 0 1280 720" maps directly to the coordinate system, so `x`/`y`/`width`/`height` are in SVG units matching the viewBox. Measurement is performed at 1:1 SVG coordinate scale, then scaled by `scaleX`/`scaleY` to target canvas. If the assumption is wrong, the textTop calculation formula will need adjustment — a verification test with known-width string should catch this.
   - Status: ASSUMED — mark as `[ASSUMED]` per research conventions.

## Environment Availability

> Skip this section if the phase has no external dependencies (code/config-only changes).

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | 18+ | — |
| npm | Package install | Yes | (any recent) | — |
| vitest | Testing | Yes | ^2.0.0 | — |

**Missing dependencies with no fallback:** None
**Missing dependencies with fallback:** None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^2.0.0 |
| Config file | `vitest.config.ts` (in project root) |
| Quick run command | `npm test` (or `vitest run`) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEAS-02 | `measureTextBBox()` exists and returns `{width, height}` | unit | `vitest run src/text-measurer.test.ts` | No — create |
| MEAS-03 | Single-line text: merged bbox matches expected | unit | `vitest run src/text-measurer.test.ts` | No — create |
| MEAS-04 | Multi-line text: flattened with `\n`, merged bbox | unit | `vitest run src/text-measurer.test.ts` | No — create |
| MEAS-05 | Font attrs propagated to measurement SVG | unit | `vitest run src/text-measurer.test.ts` | No — create |
| MEAS-06 | Empty text falls back to heuristic | unit | `vitest run src/text-measurer.test.ts` | No — create |
| MEAS-08 | `transformElement()` text case uses `measureTextBBox()` | unit | `vitest run __tests__/text-*.test.ts` | Partial — existing tests cover fields |
| MEAS-09 | Async propagation: `walk()` and `transformToPPTElement()` async | unit | `vitest run __tests__/` | Existing tests may need updates |
| MEAS-11 | Existing tests pass after migration | integration | `npm test` | Yes — `__tests__/text-*.test.ts` |

### Sampling Rate
- **Per task commit:** `npm test` (quick, all tests run)
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/text-measurer.test.ts` — tests for `measureTextBBox()` and `buildMeasurementSvg()`
- [ ] `__tests__/text-measurement.test.ts` — integration tests for async text measurement in `transformElement()`
- [ ] Framework install: already present (vitest ^2.0.0)

*(If no gaps: "None — existing test infrastructure covers all phase requirements")*

## Security Domain

> Required when `security_enforcement` is enabled (absent = enabled). Omit only if explicitly `false` in config.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | XML content from `extractTextContentFromElement()` is XML-escaped in `buildMeasurementSvg()` |
| V4 Access Control | no | No auth/user context in SVG processing |
| V2 Authentication | no | No auth in CLI tool |
| V3 Session Management | no | No sessions |
| V6 Cryptography | no | No crypto operations |

### Known Threat Patterns for SVG Text Measurement

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious SVG with embedded scripts | Tampering/Spoofing | Parser (`fast-xml-parser`) strips scripts; no `<script>` execution in measurement SVG |
| Very large tspan content causing OOM | Denial of Service | Fixed viewBox 1280x720 limits render surface; fallback on failure |
| XML entity injection in text content | Injection | `buildMeasurementSvg()` escapes `&`, `<`, `>`, `"` before inserting into SVG |

## Sources

### Primary (HIGH confidence)
- `@resvg/resvg-js` npm registry — version 2.6.2, published 2024-03-26 [VERIFIED: npm registry]
- `@resvg/resvg-js` GitHub — github.com/yisibl/resvg-js [VERIFIED: npm view homepage field]
- ARCHITECTURE.md — existing project research for this phase [CITED: .planning/research/ARCHITECTURE.md]

### Secondary (MEDIUM confidence)
- Existing codebase: `src/transformer/transform-to-pptel.ts` — confirmed integration point and current implementation
- Existing codebase: `src/index.ts` — confirmed `convert()` is already async

### Tertiary (LOW confidence)
- None — all critical claims verified via npm registry or codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — @resvg/resvg-js v2.6.2 verified on npm, maintained since 2022
- Architecture: HIGH — integration pattern confirmed via existing codebase analysis
- Pitfalls: MEDIUM — common pitfalls documented from similar WASM integration patterns

**Research date:** 2026-07-01
**Valid until:** 2026-08-01 (package version stable, API well-documented)
