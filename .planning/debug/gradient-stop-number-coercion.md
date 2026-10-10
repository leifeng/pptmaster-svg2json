---
status: resolved
trigger: "Error: TypeError: offset.endsWith is not a function"
created: 2026-10-09
updated: 2026-10-10
---

## Symptoms

- **Expected**: SVG with `<linearGradient>`/`<radialGradient>` containing `<stop offset="N">` (数字形式) should parse correctly. The two-stop linear gradient `offset="0"` and `offset="1"` should produce `pos` values `0` and `1`.
- **Actual**: Throws `TypeError: offset.endsWith is not a function` during gradient collection.
- **Error message**: `TypeError: offset.endsWith is not a function`
- **Timeline**: First surfaced when running the CLI on `exampels/svg_output/01_cover.svg`. Root cause static-analysed before any runtime run.
- **Reproduction**:
  - Input: `exampels/svg_output/01_cover.svg` (contains `<stop offset="0" .../>` and `<stop offset="1" .../>` in a `<linearGradient>`)
  - Steps: run `svg2pptel` (CLI) against this file; the error originates in `src/parser/svg-parser.ts:99` (linearGradient stop loop) or `:137` (radialGradient stop loop).

## Triggering input

File: `exampels/svg_output/01_cover.svg` (verified to exist).

Relevant fragment (lines 4–5):
```xml
<stop offset="0" stop-color="#0F2C4A"/>
<stop offset="1" stop-color="#1F4E79"/>
```

## Root cause (static analysis)

`src/parser/svg-parser.ts:774` configures the underlying `fast-xml-parser` with `parseAttributeValue: true`. This option coerces attribute values that look like numbers into JS numbers. So `offset="0"` becomes `0` (number) and `offset="1"` becomes `1` (number).

In the gradient stop collector (lines 95 and 133):

```ts
const offset = stop['@_offset'] || '0%'
// ...
const pos = offset.endsWith('%') ? parseFloat(offset) / 100 : parseFloat(offset)
```

- For `offset="0"`: `stop['@_offset']` is the number `0`, which is falsy, so the `||` short-circuits to `'0%'` — `.endsWith('%')` works, no crash.
- For `offset="1"`: `stop['@_offset']` is the number `1`, which is truthy, so `offset` is the number `1`. Then `(1).endsWith` is `undefined`, calling it throws `TypeError: offset.endsWith is not a function`.

The same bug also occurs for any non-zero numeric offset (e.g. `offset="0.5"`), and for any case where the upstream XML parser hands back a non-string value.

## Current Focus

- **hypothesis**: The bug is a missing type coercion at the read site (`stop['@_offset']`). The fix is to normalize the value to a string before the `.endsWith('%')` check, or to branch on `typeof offset === 'string'` before calling string methods. A defensive `String(rawOffset)` (with a default of `'0%'`) handles both number and string inputs without changing semantics for any existing pass case.
- **next_action**: resolved — committed on master (Hash: `ec688cc166d7bec5a6f7569114f45b1e5c066d3f`), awaiting user acceptance.

## Evidence

- 2026-10-09 (static): `src/parser/svg-parser.ts:771-810` shows `XMLParser` instantiated with `parseAttributeValue: true`, `parseTagValue: false`, `attributeNamePrefix: '@_'`.
- 2026-10-09 (static): `src/parser/svg-parser.ts:95-99` and `:133-137` show the only two call sites of `.endsWith('%')` on a value derived from `stop['@_offset']`.
- 2026-10-09 (static): `exampels/svg_output/01_cover.svg:4-5` shows `<stop offset="0" .../>` and `<stop offset="1" .../>` (digits only, no `%`).
- 2026-10-09 (static): `src/transformer/transform-to-pptel.ts:1509` contains a comment that documents the same coercion behaviour elsewhere in the codebase, confirming `parseAttributeValue:true` does turn numeric-looking attribute strings into numbers.

## Resolution

- **root_cause (primary, confirmed by orchestrator static analysis):** In `src/parser/svg-parser.ts:95` and `:133`, `stop['@_offset']` is used directly with `|| '0%'` fallback and then `.endsWith('%')` is called on it. With `parseAttributeValue:true`, `offset="1"` becomes the JS number `1` (truthy), bypassing the `||` default and crashing on `.endsWith`.
- **root_cause (secondary, discovered during verify):** `src/parser/svg-parser.ts:301`, `:304` (in `resolveFillReference`) and `:344` (in `resolveStrokeReference`) multiply `c.pos` by `100` while building `attrs.gradient`. This conflicts with `collectGradientDefs` which already normalized `pos` to 0-1 via `parseFloat(offset)/100`. Net effect: `parseSvg` returns `attrs.gradient.colors[].pos` in the **0-100** range, while `__tests__/gradient.test.ts` (GRAD-02, GRAD-05) asserts the **0-1** range.
- **fix applied (primary):** Both linearGradient (95) and radialGradient (133) stop loops now normalize the raw value to string before `.endsWith('%')`:
  ```ts
  const rawOffset = stop['@_offset']
  const offset = rawOffset === undefined || rawOffset === null ? '0%' : String(rawOffset)
  ```
- **fix applied (secondary)**: per Option A, removed `c.pos * 100` from `src/parser/svg-parser.ts:301`, `:304` (in `resolveFillReference`) and `:344` (in `resolveStrokeReference`). Moved the `×100` to `src/transformer/transform-to-pptel.ts` at the AST→PPTElement boundary via a new utility `scaleGradientPos(grad, 100)` called at all 8 `result.gradient = element.attrs.gradient` sites.

## TDD / Verification

- 2026-10-09 (verify, red→green): Added `GRAD-05` describe block in `__tests__/gradient.test.ts` with two new tests — numeric offset on linearGradient (`"0"`/`"1"`) and fractional numeric on radialGradient (`"0"`/`"0.5"`/`"1"`). Confirms `parseSvg` accepts numeric stop offsets without throwing.
- 2026-10-09 (test run): `npx vitest run __tests__/gradient.test.ts` → **4 failed / 13 passed**. Failures: GRAD-02 ×2 (`pos:30` vs expected `0.3`; `pos:50` vs expected `0.5`), GRAD-05 ×2 (`pos:100` vs expected `1`; `pos:50` vs expected `0.5`). Pattern: actual = expected × 100 → secondary bug (double normalization). All 4 failures are pre-existing in the sense that they would fail even with the original `||` short-circuit; the primary fix is correct and necessary, but incomplete.
- 2026-10-10 (test run, post Option A): `npx vitest run __tests__/gradient.test.ts` → **17 passed / 0 failed**. Full suite: 243 passed / 17 failed (17 failures all in pre-existing baseline files: image-outline:1, path-merge:1, shadow:7, shape-rx:4, cli.font-validation:4 — no NEW failures).
- 2026-10-09 (CLI smoke-test on `exampels/svg_output/01_cover.svg`): After `npm run build`, `node dist/src/cli.js exampels/svg_output/01_cover.svg` exits 0 (no `TypeError`), produces `exampels/svg_output/01_cover.svg.json`. JSON contains `slides[0].background.gradient` with two stops at `pos: 0` and `pos: 100` (0-100 range — same secondary bug visible here).
- 2026-10-10 (CLI smoke-test, post Option A): `npm run build` + `node dist/src/cli.js exampels/svg_output/01_cover.svg` exits 0, produces `exampels/svg_output/01_cover.svg.json` with stops at `pos=0` and `pos=100` (PPTist 0-100 range). No TypeError.
- 2026-10-09 (commit): NOT executed. Workflow halted pending orchestrator decision on the 0-1 vs 0-100 API-contract question (see Open question below).
- 2026-10-10 (commit, Option A): atomic commit on master. Hash: `ec688cc166d7bec5a6f7569114f45b1e5c066d3f`. Files: `src/parser/svg-parser.ts`, `src/transformer/transform-to-pptel.ts`, `__tests__/gradient.test.ts`.

## Open question (orchestrator decision required)

Tests assert `attrs.gradient.colors[].pos` in **0-1** range. Implementation currently produces **0-100**. Pick one:

- **A (recommended, applied)**: Honor test contract. Keep `collectGradientDefs` `/100` normalization; remove the `*100` from both `resolveFillReference` (lines 301/304) and `resolveStrokeReference` (line 344); add a single `c.pos * 100` at the AST→PPTElement boundary inside `src/transformer/transform-to-pptel.ts` (around line 72, 1058, 1114, 1186, 1274, 1338, 1394, 1475 — wherever `element.attrs.gradient` is copied into `result.gradient`).
- **B (not pursued)**: Honor current implementation. Remove `/100` from `collectGradientDefs` (so pos stays as raw 0-1 or percentage); update GRAD-02 / GRAD-05 test expectations to `30`/`50`/`100`.
- **C (not pursued)**: Mixed / other.

**Resolved 2026-10-10**: Option A applied. Tests honored (parseSvg returns 0-1); PPTist 0-100 produced at the transformer boundary via scaleGradientPos.

## Eliminated

- `parseAttributeValue:true` is NOT removing the `%` from strings — verified by probe at the repo root: `offset="30%"` returns `"30%"` (string), `offset="1"` returns `1` (number). `String(rawOffset)` is correct.
- No JSON-parse / Number() / +offset post-processor is involved (`grep` clean in `src/parser`).
- `transform-to-pptel.ts` does NOT multiply pos by 100 — it just copies `attrs.gradient` into `result.gradient` (line 72 etc.). The 0-100 conversion currently sits entirely in the parser.
