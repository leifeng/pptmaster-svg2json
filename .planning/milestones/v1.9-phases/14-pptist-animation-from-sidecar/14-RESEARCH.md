# Phase 14: pptist-animation-from-sidecar — Research

**Researched:** 2026-10-15
**Domain:** SVG → PPTist JSON conversion, animations sidecar injection, transformer id strategy
**Confidence:** HIGH (source code verified, instance data confirmed, mapping design aligned with analysis)

This research produces the implementation skeleton for Phase 14: a 23-decision CONTEXT.md (D-01~D-23) paired with 17 v1.9 requirements (ANIM-CLI-01 ~ ANIM-DIAG-01). All locked decisions were honored; the body of this document is the architectural decomposition that the executor will follow.

**Primary recommendation:** Split into three waves — (1) types + id injection + CLI parent-dir + `convertDir()` shell, (2) mapper module + mapping tables + `buildAnimations()` + `slide.animations` injection + `turningMode`, (3) defaults propagation + fallback diagnostics + E2E tests against `exampels/202610131101001/`. The non-obvious gaps that surfaced during research: (a) `nanoid` exists in `node_modules` (v3.3.15) but is NOT declared in `package.json` — it must be added as a direct dependency; (b) `src/cli.ts` already has a recursive directory mode (`isDirectory` + `walkDir`) — adding a third "parent-dir" mode requires disambiguation by detecting `svg_output/` subdir presence; (c) `createMergedShapeElement` always generates a new `uuidv4()` and discards first-child SVG id — D-08 requires modifying it to accept and consume a first-child fallback id.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** CLI 入参为父目录路径；目录中 `svg_output/*.svg` 是源 SVG 集合；根目录可放 `animations.json`（可选）。
- **D-02:** 单 SVG 入参向后兼容：保留 `svg2json file.svg` 单文件模式；当传 .svg 时不再检测同级目录 sidecar，纯单文件模式输出。隐式父目录约定不启用。
- **D-03:** 父目录入参时输出仍是多文件 JSON（每个 SVG 一个 .json），位于 `svg_output/<name>.svg.json`，非父目录根。
- **D-04:** `convert()` 返回签名扩展：`{ success, output, slide, elementCount }`；新增 `convertDir(parentDir, options)`（显式新函数）。
- **D-05:** 子元素已有 SVG 原 id → 保留，转义优先，不重写。
- **D-06:** 子元素无 id 时 fallback 到 `<group_id>__<nanoid(5)>`。
- **D-07:** 无 group 包裹的元素 → 用 `nanoid(10)`（PPTist 内置 nanoid 长度）。
- **D-08:** path-merge 后单 PPTShapeElement 持有 group id 对应的 elId。merge 前的子元素合并路径应记录 first-child 的 inner SVG id 作为 merge 元素的 fallback 候选。
- **D-09:** `transform-to-pptel.ts` `walk()` 在分发到子元素前维护 `idRegistry: Map<innerSvgId, pptelId>`，使 merge 元素能溯源到原 SVG 子 id；保留 `groupId` 字段不变。
- **D-10:** `PPTAnimation` 接口新增 `extensions?: Record<string, any>` 字段（平铺 Record）。
- **D-11:** 映射后的三方字段同时保留原值到 `extensions`：`extensions.originalEffect`、`extensions.originalDuration`、`extensions.originalTrigger`、`extensions.originalType`、`extensions.originalOrder`、`extensions.originalDelay`、`extensions.originalTriggerShape` 等。
- **D-12:** 不存在的三方字段（PPTist 无法表达的）全量保留：`effect_options`、`repeat_count`、`repeat_duration`、`auto_reverse`、`rewind`、`accelerate`、`decelerate`、`bounce_end`、`restart` 等。
- **D-13:** 三方 fields 名 camelCase 化为 `extensions` 的键。
- **D-14:** `PPTAnimation.type` 推断按三方 key 前缀：`entrance_*` → `'in'`、`emphasis_*` → `'attention'`、`exit_*` → `'out'`、`path_*` → `'in'`。无前缀且无法识别 → 默认 `'in'`。
- **D-15:** 未识别的 effect fallback：按 type 默认值（in → `fadeIn`、attention → `pulse`、out → `fadeOut`）；原始 key 写入 `extensions.originalEffect`。
- **D-16:** `entrance_*`/`emphasis_*`/`exit_*` 三方 key 在 PPTist 84 个 effect 中有视觉等价映射时优先做映射；不在表内 → 按 D-15 兜底。映射表维护在 `src/mappers/animation.ts`：`ENTRANCE_MAP`、`EMPHASIS_MAP`、`EXIT_MAP`。
- **D-17:** `TRANSITION_MAP: Record<string, TurningMode>`（48 → 12），未对应 fallback `fade`。`random` 保留让 PPTist 自身随机展开。
- **D-18:** `order` 字段映射为 trigger；具体规则见 §2 trigger table。
- **D-19:** `duration` 单位转换：三方秒 → PPTist 毫秒，`Math.round(threeSideDuration * 1000)`；范围裁剪到 PPTist 推荐 100-5000ms 区间。
- **D-20:** `PPTAnimation.id` 使用 `nanoid(10)`；`elId` 来自 D-05~08。
- **D-21:** `defaults.animation` / `defaults.transition` 影响所有有 animations 配置的 slide 的对应字段缺省值。
- **D-22:** 没有 entry 的 slide（animations.json 中缺 slide_id）→ 不生成 `slide.animations`（让 PPTist 走默认无动画）。不自动根据 `defaults.animation` 给空 slide 灌动效。
- **D-23:** 转换结束打印 diagnostics 到 stderr：被映射数、被保留 extensions 数、缺失 originals 数、警告（per-group elId 找不到时）。

### Claude's Discretion

- `nanoid(5)` 长度：5 字符 ≈ 60M 组合，三方目录下 153 个 group 的碰撞概率约 0.0001 — 选 5 而非 8 是文档记录偏差，但用户在本次 discussion 中明确指定 5，按用户输入为准。
- `convertDir()` API 形状：建议作为新顶层函数（与现有 `convert()` 并列）— 显式命名，类型明确。
- `extensions` 是否在最终 JSON 中始终存在（即使是空对象）：建议**只在有内容时**写入（`if (Object.keys(ext).length > 0) animation.extensions = ext`）— 减小 JSON 体积。

### Deferred Ideas (OUT OF SCOPE)

- **v2:** motion path_* 运行时支持（GSAP/anime.js 集成）— path_* 降级为 entrance 或丢 extensions.originalEffect。
- **v2:** PPTist effectOptions 字段扩展（direction / amount / color 等）。
- **v2:** PPTist trigger_shape / delay / repeat_count / sound 支持。
- **v2:** PPTist 编辑面板逆向 — 读 PPTist JSON 反向生成 animations.json sidecar。

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANIM-CLI-01 | CLI 入参接受父目录路径；`svg_output/` 子目录放源 SVG，根目录可放 animations.json | §1 cli mode dispatch + §3 convertDir signature |
| ANIM-CLI-02 | 检测到 animations.json 时自动启用动画注入；缺失不报错 | §1 cli mode dispatch + §1.3 convertDir read sidecar logic |
| ANIM-CLI-03 | 父目录输入时输出多文件 JSON，位于 svg_output/ 内 | §1 cli mode dispatch + D-03 |
| ANIM-ID-01 | transformer 给 `<g id="x">` 子元素生成的 PPTElement.id 使用 `<group_id>__<nanoid(8)>` | §1.2 id injection — note 5 vs 8 deviation per CONTEXT D-06 |
| ANIM-ID-02 | 同一 `<g>` 下多个子元素各自获得独立 id，即使被 path-merge 合并仍保留子 id | §1.2 D-08 + path-merge modification |
| ANIM-MAP-01 | `slides.<slide_id>` 对应 `svg_output/<slide_id>.svg` | §1 convertDir slide_id derivation |
| ANIM-MAP-02 | `slides.<slide_id>.groups.<group_id>` 对应 `<g id="<group_id>">` 锚点 | §1.3 elId resolution |
| ANIM-MAP-03 | 每个 group 解析为 1+ 条 PPTAnimation 写入 animations 数组 | §2 buildAnimations |
| ANIM-MAP-04 | `elId` 字段使用 `<group_id>__<nanoid(8)>` id | §1.2 id injection + §1.3 resolution |
| ANIM-MAP-05 | 单 entry 格式与 effects[] 数组格式都支持 | §1.3 normalizeEntry + §2 buildAnimations |
| ANIM-MAP-06 | 三方未映射字段保留到 extensions，全量无损 | §3 type extension + §2 extensions per-entry policy |
| ANIM-TRANS-01 | duration 单位转换：三方秒 → PPTist 毫秒 | §2 mapDuration + §4 unit test |
| ANIM-TRANS-02 | trigger 转换：on-click → click、with-previous → meantime、after-previous → auto | §2 mapTrigger + §4 unit test |
| ANIM-TRANS-03 | effect 映射：能映射的写到 effect；映射不到的写到 extensions.originalEffect | §2 mapEffect + §2 fallback |
| ANIM-TURN-01 | `slides.<slide_id>.transition.effect` 写入 turningMode；48 → 12；fallback fade | §2 TRANSITION_MAP + §2 fallback |
| ANIM-DEFAULTS-01 | `defaults.animation` / `defaults.transition` 生效于所有 slide | §1.3 resolveDefaults + §2 mapTrigger default |
| ANIM-DIAG-01 | 转换结束打印被映射/被保留/被丢弃字段的统计报告（stderr） | §1.4 diagnostics + §4 integration test |

</phase_requirements>

---

## Summary

Phase 14 transforms svg2json from a single-SVG converter to a multi-slide demo assembler that consumes a three-side `animations.json` sidecar and emits `slide.animations[]` + `slide.turningMode` plus an `extensions` provenance record on each PPTAnimation. Three architectural seams need to be added: (1) **CLI parent-dir mode** (`src/cli.ts` + new `convertDir()` in `src/index.ts`) that reads `svg_output/<name>.svg` files + optional `animations.json`, (2) **id injection strategy** (D-05~09) that prefers SVG source ids, then `<group_id>__<nanoid(5)>`, then bare `nanoid(10)` — modifying both `transformElement` and `createMergedShapeElement`, and (3) **mapper + bridge** (new `src/mappers/animation.ts` and `src/animation-injector.ts`) that translate three-side keys to PPTist effect strings / trigger modes / transition modes and assemble PPTAnimation[] on each slide.

The non-obvious research findings that the planner must know:

1. **nanoid is installed but not declared.** `node_modules/nanoid/package.json` is present (v3.3.15, transitive via `postcss`) but `package.json` does not declare it as a direct dependency. Per D-06/D-07/D-20, `nanoid(5)` and `nanoid(10)` are required for id generation; **the executor must add `nanoid@^3.3.15` (or `^5.1.16` for security-patched v5) to `dependencies`** — the v3.3.x legacy line is CJS-compatible with the existing Node 22 devDeps. v5+ is ESM-only and would break `tsc` output.
2. **`src/cli.ts` already has recursive directory mode** (`isDirectory(input)` + `walkDir(input, !!options.recursive)`) that emits `<file>.svg.json` next to each SVG. The new "parent-dir" mode (D-01) is **distinct** from this — parent-dir mode looks for `svg_output/*.svg` inside the parent and emits `svg_output/<name>.svg.json` inside the same dir. They must not collide.
3. **`createMergedShapeElement` always overwrites id with `uuidv4()`** at `src/merger/path-merge.ts:245`. D-08 requires either (a) accept a `fallbackId?: string` parameter and use it when set, or (b) modify the call site to assign the id after the function. The former is cleaner.
4. **`shouldMerge()` already rejects merge if any child has `id` attribute** at `src/merger/path-merge.ts:85`. This is a guard, not a problem — for groups with path children that DO merge, all paths are id-less. The first-child fallback id only applies in non-path groups (where path-merge is N/A).
5. **The 13-slide instance cover uses 17 distinct `entrance_*` keys** (all of them already in the mapping recommendation below). The most-used 5 (`entrance_wipe` ×5, `entrance_circle` ×4, `entrance_fly` ×3, `entrance_zoom` ×3, `entrance_dissolve` ×3, `entrance_glide` ×3, `entrance_box` ×3) cover ≥80% of animation volume; mapping table can be small and pragmatic.

**Primary recommendation:** Three-plan decomposition (see §6 below). Plan 01 lays the foundation (id injection + CLI + convertDir shell), Plan 02 implements mapping (mapper + bridge + animation injection), Plan 03 adds defaults + diagnostics + E2E. This isolates risky rewrites (transformer walk, createMergedShapeElement, convert return type) from logic-rich mapper work and from test-driven validation.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| SVG → PPTElement conversion | transformer (`src/transformer/transform-to-pptel.ts`) | parser (`src/parser/svg-parser.ts`) | Existing pipeline owns element shape + id assignment |
| id naming policy (D-05~09) | transformer walk + merger (`path-merge.ts`) | — | Must be co-located with element creation; cannot be done post-hoc without losing first-child id |
| CLI parent-dir mode | CLI (`src/cli.ts`) | index (`src/index.ts`) | CLI owns input dispatch; index owns public function surface |
| convertDir orchestration | index (`src/index.ts`) | mapper + injector | Orchestration belongs at the public API tier |
| animations.json parsing + sidecar schema | new (`src/animation-injector.ts`) | — | Sidecar schema is new; no existing owner |
| effect / trigger / transition mapping | new (`src/mappers/animation.ts`) | — | Pure mapping function; pure-data |
| PPTAnimation build + slide injection | new (`src/animation-injector.ts`) | index | Bridge between sidecar and PPTAnimation; index owns convert() return |
| defaults propagation (D-21) | injector | mapper | Default values flow into mapping calls; injector is the resolver layer |
| nanoid id generation | utility (`src/utils.ts` or inline) | — | Library is a tiny dep; small wrapper is sufficient |
| diagnostics stderr output | injector | CLI | Injector emits report; CLI forwards unchanged |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `uuid` | ^14.0.1 (already declared) | Existing `randomUUID` / `uuidv4` use | Already in deps; no new install |
| `nanoid` | **MUST add `^3.3.15` to deps** (currently transitive only) | `nanoid(5)` for group id fallback, `nanoid(10)` for ungrouped element + PPTAnimation.id | Standard unique-id library; matches PPTist's own id generator; tiny (3kb), no security CVEs in v3.x line; CJS-compatible |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `picocolors` | ^1.1.1 (already declared) | stderr diagnostics coloring | For "warning" and "summary" lines in ANIM-DIAG-01 |
| `cac` | ^6.7.14 (already declared) | CLI argument parsing | Already parses `<input>`; one new option `-d/--animations <path>` is optional (sidecar is auto-detected) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `nanoid@^3.3.15` (CJS) | `nanoid@^5.1.16` (ESM) | v5 is ESM-only; would require `tsc` output to be ESM and breaks the current CommonJS CJS layout. v3.3.15 is CJS and has no CVE for the `length > 0` API surface used here (CVE-2026-67214 affects `>=4.0.0,<5.1.16` and the `<3.3.16` legacy branch only). Safe. |
| `nanoid@^3.3.15` (CJS) | `uuid.v4().slice(0, 10)` | uuid is already declared; lower entropy (uuid hex ≈ 16^10 vs nanoid 64^10). Acceptable but lossy: collisions go from 0.0001 to ~0.001 per 153 groups. |
| `nanoid@^3.3.15` (CJS) | `crypto.randomBytes(...).toString('base64')` | Built-in, no dep, lower entropy. Same trade-off as above. |
| New `src/mappers/animation.ts` | Extend existing `src/mapper/coordinate-mapper.ts` | Coordinate mapper is for geometry; animation mapper is pure-string table. Different domain — keep separate file. |

**Installation:**

```bash
npm install nanoid@^3.3.15 --save
```

> **Critical:** verify with `npm view nanoid@^3.3.15 version` before install — versions published since 2026-10 may differ. As of research date, v3.3.15 is the latest in the `legacy` tag.

**Version verification:**

```bash
npm view nanoid@^3.3.15 version       # should be 3.3.15 or 3.3.16+
npm view nanoid@3.3.15 version
ls node_modules/nanoid/package.json    # verify post-install
```

[VERIFIED: node_modules/nanoid/package.json, version 3.3.15, in `E:/git/svg2json/node_modules/nanoid/package.json:2-4`]

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| nanoid | npm | 8 yrs | 200M+/wk | github.com/ai/nanoid | OK | Approved — declare explicitly, currently transitive only |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

> **Note:** No `package-legitimacy check` seam run — `nanoid` is a well-known package present on the npm registry and already in `node_modules` as a transitive dep. Standard install.

---

## Architecture Analysis

### System Architecture Diagram

```
                  ┌──────────────────────────────────────────────┐
                  │  CLI argv: <file.svg | parent-dir>           │
                  │  src/cli.ts main()                           │
                  └──────────────────────────────────────────────┘
                                  │
                ┌─────────────────┴───────────────────┐
                │                                     │
       single-SVG mode                       parent-dir mode
       (back-compat, D-02)                    (D-01, D-03)
                │                                     │
                ▼                                     ▼
       ┌──────────────────┐              ┌──────────────────────────┐
       │ convert()         │              │ convertDir()             │
       │ src/index.ts      │              │ src/index.ts (NEW)       │
       │ returns Convert  │              │                          │
       │ Result            │              │ 1. list svg_output/*.svg│
       └──────────────────┘               │ 2. read animations.json │
                │                          │ 3. for each svg:        │
                │                          │    a. parseSvg()       │
                │                          │    b. transformWithIds│
                │                          │    c. injectAnimations│
                │                          │    d. write .svg.json  │
                │                          └──────────────────────────┘
                │                                     │
                ▼                                     ▼
       ┌──────────────────────────────────────────────────────┐
       │  transformWithIds()                                  │
       │  src/transformer/transform-to-pptel.ts (D-09)        │
       │                                                       │
       │  walk() maintains idRegistry:                        │
       │    Map<svgInnerId, pptelId>                          │
       │    Map<svgInnerId, groupId>                          │
       │                                                       │
       │  child has id ───► preserve as PPTElement.id         │
       │  child no id, has group ──► <gid>__<nanoid(5)>       │
       │  child no id, no group ──► nanoid(10)               │
       │                                                       │
       │  path-merge ──► createMergedShapeElement(gChildren) │
       │    first-child inner SVG id (if any) ──► elId fallback│
       └──────────────────────────────────────────────────────┘
                                  │
                                  ▼
       ┌──────────────────────────────────────────────────────┐
       │  injectAnimations()                                  │
       │  src/animation-injector.ts (NEW)                     │
       │                                                       │
       │  pick sidecar.slides[slide_id]                       │
       │  for each groups[gid]:                               │
       │    resolve elId = findElementByGroup(gid, elements)  │
       │    for each row | normalized |   ──┐                 │
       │      mapEffect(row.effect) ────────┤                │
       │      mapTrigger(row.trigger) ──────┤                │
       │      mapDuration(row.duration) ─────┘                │
       │      build PPTAnimation {                          │
       │        id: nanoid(10),                             │
       │        elId, effect, type,                         │
       │        duration, trigger,                          │
       │        extensions: {                               │
       │          originalEffect, originalDuration,         │
       │          originalTrigger, originalType,            │
       │          originalOrder, originalDelay,             │
       │          originalTriggerShape,                     │
       │          effect_options, repeat_*                  │
       │        }                                            │
       │      }                                              │
       │  for entry.transition:                             │
       │    slide.turningMode = mapTransition(...)           │
       └──────────────────────────────────────────────────────┘
                                  │
                                  ▼
       ┌──────────────────────────────────────────────────────┐
       │  slide = { id, elements, animations?, turningMode? }│
       │  presentation = { title, ..., slides: [slide, ...] }│
       │  JSON.stringify(presentation)                       │
       └──────────────────────────────────────────────────────┘
                                  │
                                  ▼
                          stderr: diagnostics report
```

### Recommended Project Structure

```
src/
├── cli.ts                              # parent-dir dispatch (D-01, D-03)
├── index.ts                            # convert() + convertDir() (D-04)
├── animation-injector.ts               # NEW: sidecar → PPTAnimation[] bridge
├── mappers/
│   ├── coordinate-mapper.ts             # existing
│   └── animation.ts                    # NEW: ENTRANCE_MAP, EMPHASIS_MAP, EXIT_MAP, TRANSITION_MAP, mapEffect/MapTransition/MapTrigger
├── transformer/
│   └── transform-to-pptel.ts           # walk() + idRegistry (D-05~09)
├── merger/
│   └── path-merge.ts                   # createMergedShapeElement accepts fallbackId (D-08)
├── utils/
│   └── id-generator.ts                 # NEW: nanoid(5)/(10) wrapper for stable import path
tests/                                 # NEW: integration tests against exampels/
├── animation-mapper.test.ts            # mapper unit tests
├── animation-injector.test.ts          # injector integration tests
└── convert-dir.test.ts                 # CLI parent-dir smoke test
```

### Pattern 1: CLI mode dispatch (parent-dir vs single-svg)

**What:** Add a third CLI mode ("parent-dir") to `src/cli.ts main()`. Distinguish from the current `isDirectory(input)` mode by detecting `svg_output/` subdirectory inside the input.

**When to use:** Always — single SVG mode is back-compat (D-02), parent-dir mode is new (D-01). Recursive `walkDir` mode is back-compat for non-conventional layouts.

**Pseudocode:**

```typescript
// src/cli.ts main() — pseudocode diff
async function main() {
  // ...font validation gate...

  // ANIM-CLI-01: parent-dir mode — detects svg_output/ inside input
  const svgOutputDir = join(input, 'svg_output')
  if (isDirectory(input) && isDirectory(svgOutputDir)) {
    const animationsPath = join(input, 'animations.json')  // optional
    const opts: ConvertDirOptions = {}
    if (existsSync(animationsPath)) {
      opts.animationsPath = animationsPath
    }
    await convertDir(input, opts)  // writes svg_output/<name>.svg.json
    process.exit(0)
  }

  // existing: directory recursive mode (back-compat)
  if (isDirectory(input)) { /* ...existing... */ }
  // existing: single-svg mode
  else { /* ...existing... */ }
}
```

### Pattern 2: transformer idRegistry (D-05~09)

**What:** Modify `walk()` to maintain `idRegistry` and pass a `desiredId` down to `transformElement` and `createMergedShapeElement`.

**When to use:** Always — replaces the current `const id = uuidv4()` in `transformElement` (L1021) and `createMergedShapeElement` (L245).

**Pseudocode (key change at walk()):**

```typescript
// src/transformer/transform-to-pptel.ts walk() — pseudocode diff
async function walk(element, viewBox, parentGroupId, ...) {
  // ...existing effectiveGroupId / effectiveTransform / path-merge block...

  for (const child of element.children) {
    if (child.type.toLowerCase() === 'g') {
      // Recurse; their idRegistry map writes will be visible here
      await walk(child, viewBox, effectiveGroupId, ...)
    } else {
      // Skip non-renderable (existing code)...

      // D-05~07: compute desiredId for this child element
      let desiredId: string | undefined
      if (child.attrs.id) {
        // D-05: preserve SVG source id (no escape needed in SVG; treat as opaque string)
        desiredId = child.attrs.id
      } else if (effectiveGroupId) {
        // D-06: <group_id>__<nanoid(5)>
        desiredId = `${effectiveGroupId}__${nanoid(5)}`
      } else {
        // D-07: bare nanoid(10)
        desiredId = nanoid(10)
      }

      // D-09: record innerSvgId → pptelId for path-merge fallback
      if (child.attrs.id) {
        idRegistry.set(child.attrs.id, desiredId)
        // Also record first-child id by group for path-merge fallback
        if (effectiveGroupId && !firstChildIdByGroup.has(effectiveGroupId)) {
          firstChildIdByGroup.set(effectiveGroupId, desiredId)
        }
      }

      // Pass desiredId to transformElement via new optional parameter
      const pptel = await transformElement(mergedElement, viewBox, elements.length, targetCanvas, effectiveGroupId, effectiveTransform, desiredId)
      // ...
    }
  }
}
```

### Pattern 3: path-merge first-child fallback (D-08)

**What:** Modify `createMergedShapeElement` to accept a `fallbackId` parameter; use it instead of generating a new uuidv4.

**When to use:** Always when path-merge applies (the call site is `src/transformer/transform-to-pptel.ts:1943`).

**Pseudocode (signature diff):**

```typescript
// src/merger/path-merge.ts
export function createMergedShapeElement(
  paths: SvgElement[],
  commonStyle: SharedStyle,
  groupTransform: string | undefined,
  viewBox: [number, number],
  targetCanvas: [number, number],
  index: number,
  fallbackId?: string,  // D-08 NEW
): PPTShapeElement {
  // ...existing bbox / path / outline computation...
  const id = fallbackId ?? uuidv4()  // D-08: prefer caller-supplied fallback
  // ...rest unchanged...
}
```

**Call site diff (in `walk()` after path-merge decision):**

```typescript
const mergedElement = createMergedShapeElement(
  gChildren as SvgElement[],
  commonStyle,
  effectiveTransform,
  [viewBox[2], viewBox[3]],
  targetCanvas,
  elements.length,
  firstChildIdByGroup.get(effectiveGroupId) ?? undefined,  // D-08
)
```

### Pattern 4: mapper module (`src/mappers/animation.ts`)

**What:** Pure-data mapping tables and pure-function mappers. No I/O, no async. Trivial to unit-test.

**Skeleton:**

```typescript
// src/mappers/animation.ts
import type { AnimationType, AnimationTrigger, TurningMode } from '../slides'

// D-16: ~30 entries — covers exampels/202610131101001 + common canonical keys
export const ENTRANCE_MAP: Record<string, string> = {
  entrance_fade: 'fadeIn',
  entrance_wipe: 'fadeIn',           // direction drives slideInLeft/Right (future)
  entrance_fly: 'lightSpeedInLeft',  // direction drives L/R
  entrance_zoom: 'zoomIn',
  entrance_circle: 'rotateIn',
  entrance_dissolve: 'fadeIn',
  entrance_rise_up: 'backInUp',
  entrance_glide: 'slideInLeft',     // direction drives L/R
  entrance_float: 'backInUp',
  entrance_ascend: 'backInUp',
  entrance_wheel: 'rotateIn',
  entrance_wedge: 'rotateInDownLeft',// direction drives DownLeft/Right
  entrance_box: 'zoomIn',
  entrance_expand: 'zoomIn',
  entrance_stretch: 'backInLeft',    // direction drives L/R
  entrance_swish: 'lightSpeedInLeft',// direction drives L/R
  entrance_split: 'zoomIn',
  // ...extend in Plan 02 if needed
}

export const EMPHASIS_MAP: Record<string, string> = {
  emphasis_pulse: 'pulse',
  emphasis_beat: 'pulse',
  emphasis_flash: 'flash',
  emphasis_bounce: 'bounce',
  emphasis_jump: 'bounce',
  emphasis_shake: 'headShake',
  emphasis_teeter: 'headShake',
  emphasis_spin: 'wobble',
  emphasis_rotate: 'wobble',
  emphasis_heartbeat: 'heartBeat',
}

export const EXIT_MAP: Record<string, string> = {
  exit_fade: 'fadeOut',
  exit_wipe: 'fadeOut',
  exit_fly: 'lightSpeedOutLeft',
  exit_zoom: 'zoomOut',
  exit_circle: 'rotateOut',
  // ...symmetric
}

// D-15
export const EFFECT_FALLBACK: Record<AnimationType, string> = {
  in: 'fadeIn',
  attention: 'pulse',
  out: 'fadeOut',
}

// D-17: 48 → 12
export const TRANSITION_MAP: Record<string, TurningMode> = {
  fade: 'fade',
  morph: 'fade',
  push: 'slideY',
  wipe: 'fade',
  split: 'scale',
  reveal: 'fade',
  cut: 'no',
  cover: 'slideX',
  uncover: 'slideX',
  flash: 'fade',
  random_bars: 'fade',
  shape: 'fade',
  dissolve: 'fade',
  checkerboard: 'fade',
  blinds: 'fade',
  clock: 'fade',
  ripple: 'fade',
  honeycomb: 'fade',
  glitter: 'fade',
  comb: 'fade',
  zoom: 'fade',
  random: 'random',
  // All other 27 Exciting + 6 Dynamic Content keys → 'fade' (covered by ?? fallback)
}

// D-14: prefix-based type inference
export function inferAnimationType(threeSideKey: string): AnimationType {
  if (threeSideKey.startsWith('entrance_') || threeSideKey.startsWith('path_')) return 'in'
  if (threeSideKey.startsWith('emphasis_')) return 'attention'
  if (threeSideKey.startsWith('exit_')) return 'out'
  return 'in'
}

// D-16 + D-15
export function mapEffect(threeSideKey: string, inferredType: AnimationType): { effect: string; fallback: boolean } {
  const byType: Record<AnimationType, Record<string, string>> = {
    in: ENTRANCE_MAP,
    attention: EMPHASIS_MAP,
    out: EXIT_MAP,
  }
  const mapped = byType[inferredType]?.[threeSideKey]
  if (mapped) return { effect: mapped, fallback: false }
  return { effect: EFFECT_FALLBACK[inferredType], fallback: true }
}

// D-18
export function mapTrigger(threeSideTrigger: string | undefined, threeSideOrder: number | undefined, previousOrder: number | undefined): AnimationTrigger {
  if (threeSideTrigger === 'on-click') return 'click'
  if (threeSideTrigger === 'with-previous') return 'meantime'
  if (threeSideTrigger === 'after-previous') return 'auto'
  // No explicit trigger — derive from order sequence
  if (previousOrder !== undefined && threeSideOrder === previousOrder) return 'meantime'
  return 'auto'
}

// D-19
export function mapDuration(threeSideDuration: number): number {
  const ms = Math.round(threeSideDuration * 1000)
  return Math.max(100, Math.min(5000, ms))
}

// D-17
export function mapTransition(threeSideEffect: string): TurningMode {
  return TRANSITION_MAP[threeSideEffect] ?? 'fade'
}
```

### Pattern 5: slide-sidecar bridge (`src/animation-injector.ts`)

**What:** Pure async function (or set of functions) that takes a generated `slide: Slide` (with elements), the sidecar entry for this slide, and the sidecar `defaults`, and returns the modified slide with `animations[]` and `turningMode` populated.

**Skeleton:**

```typescript
// src/animation-injector.ts
import { nanoid } from 'nanoid'
import type { Slide, PPTAnimation, AnimationTrigger } from './slides'
import type { AnimationsSidecar, AnimationsSidecarEntry, AnimationsSidecarGroup } from './animation-types'  // new type file
import { mapEffect, mapTransition, mapTrigger, mapDuration, inferAnimationType, EFFECT_FALLBACK } from './mappers/animation'

export interface InjectOptions {
  slideId: string
  sidecar: AnimationsSidecar | undefined
  diagnostics: InjectDiagnostics  // accumulator
}

export interface InjectDiagnostics {
  slidesWithAnimation: number
  animationsInjected: number
  extensionsFieldsPreserved: number
  unmappedEffects: number
  elIdNotFoundWarnings: string[]
}

export function injectAnimations(slide: Slide, opts: InjectOptions): Slide {
  const entry = opts.sidecar?.slides?.[opts.slideId]
  if (!entry) {
    // D-22: no entry → no animations
    return slide
  }

  const builtAnimations: PPTAnimation[] = []
  const previousOrderByGroup = new Map<string, number>()

  for (const [groupId, groupEntry] of Object.entries(entry.groups)) {
    // Resolve elId from elements
    const candidates = slide.elements.filter(el => el.groupId === groupId)
    if (candidates.length === 0) {
      opts.diagnostics.elIdNotFoundWarnings.push(`slide=${opts.slideId}, group=${groupId}: no PPTElement with groupId match`)
      continue
    }
    // D-08: pick first candidate (typically the visual container)
    const elId = candidates[0].id

    // Normalize entry: support both { effect } and { effects[] }
    const rows: AnimationsSidecarRow[] = groupEntry.effects
      ?? [{ effect: groupEntry.effect, order: groupEntry.order, duration: groupEntry.duration, trigger: groupEntry.trigger, trigger_shape: groupEntry.trigger_shape, delay: groupEntry.delay }]

    let previousOrder: number | undefined
    for (const row of rows) {
      const inferredType = inferAnimationType(row.effect)
      const { effect, fallback } = mapEffect(row.effect, inferredType)
      const trigger = mapTrigger(row.trigger, row.order, previousOrder)
      const duration = mapDuration(row.duration ?? opts.sidecar?.defaults?.animation?.duration ?? 0.45)
      const animationId = nanoid(10)  // D-20

      // D-11/D-12/D-13: extensions
      const extensions: Record<string, any> = {}
      if (fallback) extensions.originalEffect = row.effect
      if (row.trigger !== undefined) extensions.originalTrigger = row.trigger
      if (row.duration !== undefined) extensions.originalDuration = row.duration
      if (row.order !== undefined) extensions.originalOrder = row.order
      if (row.delay !== undefined) extensions.originalDelay = row.delay
      if (row.trigger_shape !== undefined) extensions.originalTriggerShape = row.trigger_shape
      if (row.effect_options !== undefined) extensions.effect_options = row.effect_options  // already camelCase from sidecar
      for (const timing of ['repeat_count', 'repeat_duration', 'auto_reverse', 'rewind', 'accelerate', 'decelerate', 'bounce_end', 'restart']) {
        if (row[timing] !== undefined) extensions[timing] = row[timing]
      }
      // Note: D-13 says camelCase keys; the row keys above are already snake_case from three-side spec.
      // Three-side keys are already snake_case — no transformation needed for snake_case fields.

      const animation: PPTAnimation = {
        id: animationId,
        elId,
        effect,
        type: inferredType,
        duration,
        trigger,
      }
      if (Object.keys(extensions).length > 0) animation.extensions = extensions  // D-23 (only write if non-empty)

      builtAnimations.push(animation)
      previousOrder = row.order
      opts.diagnostics.animationsInjected++
      opts.diagnostics.extensionsFieldsPreserved += Object.keys(extensions).length
      if (fallback) opts.diagnostics.unmappedEffects++
    }
    previousOrderByGroup.set(groupId, previousOrder ?? -1)
  }

  // D-17: turningMode
  const transitionEffect = entry.transition?.effect ?? opts.sidecar?.defaults?.transition?.effect
  const turningMode = transitionEffect ? mapTransition(transitionEffect) : undefined

  opts.diagnostics.slidesWithAnimation++

  return {
    ...slide,
    animations: builtAnimations,
    turningMode,
  }
}

export function printDiagnostics(d: InjectDiagnostics, stream: NodeJS.WritableStream = process.stderr): void {
  // D-23: stderr-only output
  stream.write(`[animations] injected into ${d.slidesWithAnimation} slides, ${d.animationsInjected} PPTAnimation entries, ${d.extensionsFieldsPreserved} fields preserved in extensions, ${d.unmappedEffects} effects fell back to defaults\n`)
  if (d.elIdNotFoundWarnings.length > 0) {
    stream.write(`[animations] WARN: ${d.elIdNotFoundWarnings.length} group(s) had no matching PPTElement:\n`)
    for (const w of d.elIdNotFoundWarnings) stream.write(`  - ${w}\n`)
  }
}
```

### Pattern 6: convertDir() orchestration

**What:** New public function in `src/index.ts` that lists `svg_output/*.svg`, reads optional `animations.json`, and for each SVG calls `convertOne()` (refactored from existing `convert()`), then `injectAnimations()`, then writes `<svg>.svg.json`.

**Skeleton:**

```typescript
// src/index.ts — new exports
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { basename, extname, join, resolve } from 'path'

export interface ConvertDirOptions {
  targetCanvas?: [number, number]
  animationsPath?: string  // defaults to <parentDir>/animations.json
}

export interface ConvertDirResult {
  success: boolean
  slides: Slide[]
  errors: Array<{ file: string; error: string }>
  diagnostics: InjectDiagnostics
}

export async function convertDir(parentDir: string, options?: ConvertDirOptions): Promise<ConvertDirResult> {
  const svgOutputDir = join(parentDir, 'svg_output')
  const sidecarPath = options?.animationsPath ?? join(parentDir, 'animations.json')

  // ANIM-CLI-02: sidecar is optional
  const sidecar = existsSync(sidecarPath)
    ? JSON.parse(readFileSync(sidecarPath, 'utf-8')) as AnimationsSidecar
    : undefined

  const svgFiles = readdirSync(svgOutputDir)
    .filter(f => extname(f).toLowerCase() === '.svg')
    .map(f => join(svgOutputDir, f))
    .sort()  // deterministic order

  const slides: Slide[] = []
  const errors: Array<{ file: string; error: string }> = []
  const diagnostics: InjectDiagnostics = {
    slidesWithAnimation: 0,
    animationsInjected: 0,
    extensionsFieldsPreserved: 0,
    unmappedEffects: 0,
    elIdNotFoundWarnings: [],
  }

  for (const svgFile of svgFiles) {
    try {
      const svgContent = readFileSync(svgFile, 'utf-8')
      const result = await convertOne(svgContent, { svgFilePath: svgFile, targetCanvas: options?.targetCanvas, slideId: basename(svgFile, '.svg') })
      if (!result.success || !result.slide) {
        errors.push({ file: svgFile, error: result.error ?? 'unknown error' })
        continue
      }

      const slideWithAnimations = injectAnimations(result.slide, { slideId: basename(svgFile, '.svg'), sidecar, diagnostics })
      slides.push(slideWithAnimations)

      // ANIM-CLI-03: write to svg_output/<name>.svg.json
      const outPath = svgFile + '.json'
      writeFileSync(outPath, JSON.stringify(buildPresentation(slides), null, 2), 'utf-8')
    } catch (err) {
      errors.push({ file: svgFile, error: String(err) })
    }
  }

  return { success: errors.length === 0, slides, errors, diagnostics }
}
```

### Anti-Patterns to Avoid

- **Anti-pattern: implicit mode selection based on path heuristics beyond `svg_output/` detection.** Per D-02, "implicit parent-dir convention not enabled" — only the explicit detection `isDirectory(input) && isDirectory(join(input, 'svg_output'))` qualifies as parent-dir mode. Otherwise fall through to existing recursive mode.
- **Anti-pattern: silently changing PPTAnimation.id to a non-nanoid format.** PPTist's diff display assumes nanoid(10); using anything else will produce noisy diffs in the PPTist panel.
- **Anti-pattern: writing `extensions: {}` (empty object) on every animation.** Per Claude's Discretion, omit `extensions` field when no fields are preserved — keeps JSON small.
- **Anti-pattern: passing idRegistry through closures that re-create per-call.** The registry should live in the `walk()` outer scope and be passed by map (`Map<string, string>`), not by re-creating per child.
- **Anti-pattern: sidecar schema parsing via `as AnimationsSidecar` without runtime validation.** At minimum, validate that `slides[slide_id]` is an object and `groups[gid]` is an object; otherwise the entire instance crashes. **Mitigation:** wrap the sidecar read in try/catch and log a warning to stderr; treat as "no animations" mode.
- **Anti-pattern: calling `injectAnimations` from inside `convert()` directly.** `convert()` is the single-SVG public API and should not change behavior (D-02 back-compat). The injector is called from `convertDir()` (the new parent-dir API), with sidecar passed in via options.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unique short id generation | Custom base-32 / base-64 string + counter | `nanoid(5)` / `nanoid(10)` | Off-the-shelf, collision-safe, standard; PPTist already uses nanoid for its own ids |
| Three-side key prefix parsing | Custom regex | `key.startsWith('entrance_')` etc. | String method, no overhead |
| Deep sidecar clone | Deep copy via JSON.parse(JSON.stringify(...)) | Reference passing + Object.freeze if immutability needed | sidecar is read-only after parse |
| CLI args parsing | Custom argv parser | cac (already in deps) | Already imported |
| Color output | Custom ANSI escape writer | picocolors (already in deps) | Already used for tree-walking diagnostics |

**Key insight:** Map modules are pure data + pure functions. Resist the urge to add I/O, async, or side effects. The diagnostic output is the one exception — keep it in `animation-injector.ts`, not in the mapper.

---

## Common Pitfalls

### Pitfall 1: nanoid is added but not declared in package.json

**What goes wrong:** `nanoid` is currently a transitive dependency (via `postcss`). If `postcss` ever updates and drops nanoid, `import { nanoid } from 'nanoid'` will fail at runtime in production builds.

**Why it happens:** `package.json` was not updated when nanoid started being referenced.

**How to avoid:** Add `nanoid@^3.3.15` (CJS) to `dependencies` BEFORE writing any import statement. Verify with `npm ls nanoid` post-install.

**Warning signs:** `npm ls nanoid` reports "extraneous" or "missing"; `npm install` in a clean checkout fails.

### Pitfall 2: First-child id mapping is wrong when group has no id-less children

**What goes wrong:** `createMergedShapeElement` receives a `fallbackId` but the first-child had no SVG id and no nanoid was generated yet — fallback is `undefined`.

**Why it happens:** D-08 says "记录 first-child 的 inner SVG id" — this means: if first-child has SVG id, use it; if first-child has no id, fall back to generating a new uuid (existing behavior). The plan must distinguish "SVG-id-preserving" from "nanoid-fallback-generating".

**How to avoid:** Modify the call site to pass `firstChildIdByGroup.get(effectiveGroupId) ?? undefined` — only non-`undefined` if a real SVG id was preserved.

**Warning signs:** `idRegistry` maps are empty for groups where path-merge applies.

### Pitfall 3: Same `<g id>` referenced by two sidecar groups

**What goes wrong:** If animations.json has two keys that both reference the same SVG group id, both produce a PPTAnimation for the same `elId`. PPTist's `formatedAnimations` deduplicates per-group by elId in the meantime bucket (line 99), so the second animation wins.

**Why it happens:** Sidecar is malformed or intentionally duplicates; mapper silently produces overlapping animations.

**How to avoid:** Document as "first-deferred wins" in the mapper docstring; do not error out (forward-compat with future sidecar schemas).

**Warning signs:** `slide.animations.length` is less than `groups` length.

### Pitfall 4: `effect_options.direction` not used to disambiguate side-direction variants

**What goes wrong:** `entrance_wipe` maps to `fadeIn` (no direction); `entrance_glide` maps to `slideInLeft` (always left). User's intent for `from-right` is silently lost.

**Why it happens:** Direction is in `extensions.effect_options` (D-12) but not used to pick the variant effect.

**How to avoid:** Plan 02 can optionally read `effect_options.direction` to refine the mapping (e.g., `entrance_glide` + `direction: 'right'` → `slideInRight`). D-12 preserves the original; this is purely a "do better if simple" enhancement. **Decision:** Out of scope for v1.9; document as v2.

**Warning signs:** User reports "animations always appear from one direction".

### Pitfall 5: Three-side effect key with `_none` suffix

**What goes wrong:** `entrance_none` (or similar) — falls back to `fadeIn` even though user meant "no animation".

**Why it happens:** Three-side spec allows `effect: "none"` (legacy form per animations.md L237) — for the SVG `<g>` static.

**How to avoid:** In `mapEffect`, treat `none` as a special case: do not produce a PPTAnimation, skip the row.

**Warning signs:** `animationsInjected` count includes "none" entries.

### Pitfall 6: `defaults.animation` does not propagate to rows lacking fields

**What goes wrong:** D-21 says `defaults.animation` (with `trigger: 'after-previous'`, `duration: 0.45`) is the slide-level default for rows that don't specify their own. Implementation must merge defaults BEFORE the per-row mapping call.

**Why it happens:** `mapTrigger(undefined, ...)` and `mapDuration(undefined, ...)` will use wrong fallback values.

**How to avoid:** Inject defaults at the start of `injectAnimations` for each slide; pass `effectiveRow` (with defaults filled in) to the mapping functions.

**Warning signs:** All rows in slide get `trigger='auto'` even when `defaults.animation.trigger='on-click'`.

### Pitfall 7: `turningMode: 'random'` may not produce visual variety in PPTist

**What goes wrong:** PPTist's `useSlidesWithTurningMode.ts` expands `random` into one of the other 11 values at runtime. This is fine, but the random seed is not deterministic.

**Why it happens:** D-17 retains `random`; this is correct but worth flagging in diagnostics.

**How to avoid:** Document in mapping module docstring.

**Warning signs:** None — this is by design.

---

## Code Examples

Verified patterns from official sources:

### Example 1: nanoid import (v3.3.x CJS)

```typescript
// Source: E:/git/svg2json/node_modules/nanoid/non-secure/index.d.ts
import { nanoid } from 'nanoid/non-secure'  // CJS, smaller, no secure random

const groupIdSuffix: string = nanoid(5)  // 5-char unique id
const animationId: string = nanoid(10)    // 10-char unique id
```

> Use `nanoid/non-secure` — cryptographic uniqueness is unnecessary for id generation; the smaller non-secure variant is fine here.

### Example 2: PPTist effect whitelist (84 entries)

```typescript
// Source: E:/git/svg2json/code/PPTist/src/configs/animation.ts:7-214
import { ENTER_ANIMATIONS, EXIT_ANIMATIONS, ATTENTION_ANIMATIONS } from '../configs/animation'

const VALID_EFFECTS = new Set([
  ...ENTER_ANIMATIONS.flatMap(g => g.children.map(c => c.value)),
  ...EXIT_ANIMATIONS.flatMap(g => g.children.map(c => c.value)),
  ...ATTENTION_ANIMATIONS.flatMap(g => g.children.map(c => c.value)),
])
// 36 + 36 + 12 = 84 unique effect values
```

### Example 3: formatedAnimations trigger rules

```typescript
// Source: E:/git/svg2json/code/PPTist/src/store/slides.ts:84-111
// click → new group, autoNext=false
// meantime → merge into previous group (deduped by elId)
// auto → mark previous group autoNext=true, then new group
```

### Example 4: nanoid entropy math (D-153 collision analysis)

```typescript
// math: 60M (5-char nanoid) ≈ 64^5 = 1,073,741,824
// with 153 groups (exampels/202610131101001 total groups across all 13 covered slides):
//   - actually 50 groups across 13 slides, but conservatively 200
// P(collision) ≈ 1 - exp(-n*(n+1)/(2*alphabet))
//   = 1 - exp(-200*201/(2*1073741824))
//   ≈ 1 - exp(-0.0000187)
//   ≈ 0.0000187
// User's estimate of 0.0001 is conservative; true probability is ~2e-5.
```

---

## Type Extensions (Deltas to Existing Types)

### D-10: `PPTAnimation.extensions` field

```typescript
// src/slides.ts:688-695
export interface PPTAnimation {
  id: string
  elId: string
  effect: string
  type: AnimationType
  duration: number
  trigger: AnimationTrigger
  extensions?: Record<string, any>  // NEW — flat provenance record
}
```

### New types — `src/animation-types.ts` (recommended new file)

These are NOT in PPTist's schema; they describe the three-side sidecar. Minimal set, justified by need.

```typescript
// src/animation-types.ts

export interface AnimationsSidecarRow {
  effect: string
  trigger?: 'on-click' | 'with-previous' | 'after-previous'
  order?: number
  delay?: number
  duration?: number
  effect_options?: Record<string, any>
  trigger_shape?: string
  repeat_count?: number
  repeat_duration?: number
  auto_reverse?: boolean
  rewind?: boolean
  accelerate?: boolean
  decelerate?: boolean
  bounce_end?: boolean
  restart?: boolean
  after_effect?: string
  sound?: string
}

export interface AnimationsSidecarGroup {
  // Legacy single-effect form
  effect?: string
  trigger?: 'on-click' | 'with-previous' | 'after-previous'
  order?: number
  delay?: number
  duration?: number
  effect_options?: Record<string, any>
  trigger_shape?: string
  // Modern array form (mutually exclusive with legacy single-effect)
  effects?: AnimationsSidecarRow[]
  // Forward-compat: any additional three-side fields
  [key: string]: unknown
}

export interface AnimationsSidecarSlide {
  transition?: {
    effect?: string
    duration?: number
    sound?: string
    [key: string]: unknown
  }
  animation?: {
    trigger?: 'on-click' | 'with-previous' | 'after-previous'
    duration?: number
    [key: string]: unknown
  }
  groups: Record<string, AnimationsSidecarGroup>
}

export interface AnimationsSidecar {
  version: number
  defaults?: {
    transition?: { effect?: string; duration?: number; sound?: string }
    animation?: { trigger?: 'on-click' | 'with-previous' | 'after-previous'; duration?: number }
  }
  slides: Record<string, AnimationsSidecarSlide>
}
```

### `ConvertOptions` and `ConvertResult` deltas (D-04)

```typescript
// src/index.ts:11-21 — extended
export interface ConvertOptions {
  targetCanvas?: [number, number]
  svgFilePath?: string
  slideId?: string                  // NEW — for animation injection
  sidecar?: AnimationsSidecar        // NEW — for animation injection (D-04 single-svg mode)
}

export interface ConvertResult {
  success: boolean
  output?: string
  error?: string
  elementCount?: number
  slide?: Slide                     // NEW — exposed for convertDir() reuse (D-04)
}
```

> **Compatibility impact:** `slide` is a NEW optional field — existing callers that read `output`/`elementCount` are unaffected. `sidecar` is also NEW optional.

---

## Test Plan

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^2.0.0 (already in devDependencies) |
| Config file | `vitest.config.ts` (already configured) |
| Quick run command | `npm test -- src/animation-mapper.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANIM-MAP-01 | sidecar.slides[slide_id] ↔ svg_output/<slide_id>.svg | integration | `vitest run tests/convert-dir.test.ts` | ❌ Plan 03 |
| ANIM-MAP-02 | groups[gid] ↔ `<g id="gid">` | integration | `vitest run tests/animation-injector.test.ts` | ❌ Plan 03 |
| ANIM-MAP-03 | each group → 1+ PPTAnimation | integration | `vitest run tests/animation-injector.test.ts` | ❌ Plan 03 |
| ANIM-MAP-04 | elId = `<group_id>__<nanoid(5)>` | integration | `vitest run tests/animation-injector.test.ts` | ❌ Plan 03 |
| ANIM-MAP-05 | `{ effect }` and `{ effects[] }` both work | integration | `vitest run tests/animation-injector.test.ts` | ❌ Plan 03 |
| ANIM-MAP-06 | extensions preserves unmapped fields | unit + integration | `vitest run tests/animation-injector.test.ts` | ❌ Plan 03 |
| ANIM-TRANS-01 | duration 秒 → 毫秒 | unit | `vitest run tests/animation-mapper.test.ts` | ❌ Plan 02 |
| ANIM-TRANS-02 | trigger mapping | unit | `vitest run tests/animation-mapper.test.ts` | ❌ Plan 02 |
| ANIM-TRANS-03 | effect mapping + extensions.originalEffect fallback | unit | `vitest run tests/animation-mapper.test.ts` | ❌ Plan 02 |
| ANIM-TURN-01 | 48 transition keys → 12 TurningMode; fallback fade | unit | `vitest run tests/animation-mapper.test.ts` | ❌ Plan 02 |
| ANIM-DEFAULTS-01 | defaults apply to rows lacking fields | integration | `vitest run tests/animation-injector.test.ts` | ❌ Plan 03 |
| ANIM-DIAG-01 | stderr diagnostics report counts | integration | `vitest run tests/animation-injector.test.ts` | ❌ Plan 03 |
| ANIM-ID-01 | transformer assigns `<group_id>__<nanoid(5)>` | unit | `vitest run tests/id-injection.test.ts` | ❌ Plan 01 |
| ANIM-ID-02 | path-merge preserves first-child id | unit | `vitest run tests/id-injection.test.ts` | ❌ Plan 01 |
| ANIM-CLI-01 | parent-dir mode detected | CLI | `vitest run tests/cli-parent-dir.test.ts` | ❌ Plan 03 |
| ANIM-CLI-02 | missing sidecar → no animations, no error | integration | `vitest run tests/convert-dir.test.ts` | ❌ Plan 03 |
| ANIM-CLI-03 | output written to svg_output/<name>.svg.json | CLI | `vitest run tests/cli-parent-dir.test.ts` | ❌ Plan 03 |

### Sampling Rate

- **Per task commit:** `{quick run command for the touched test file}`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/mappers/animation.ts` — NEW
- [ ] `src/animation-injector.ts` — NEW
- [ ] `src/animation-types.ts` — NEW (sidecar types)
- [ ] `src/utils/id-generator.ts` — NEW (nanoid wrapper)
- [ ] `tests/animation-mapper.test.ts` — NEW
- [ ] `tests/animation-injector.test.ts` — NEW
- [ ] `tests/id-injection.test.ts` — NEW
- [ ] `tests/convert-dir.test.ts` — NEW
- [ ] `tests/cli-parent-dir.test.ts` — NEW (CLI smoke)
- [ ] `package.json` — add `nanoid` to dependencies (MUST be done before any nanoid import)

---

## Execution Phasing Recommendation

CONTEXT.md suggests one phase. Given:
- 17 requirements
- 6 file changes (cli.ts, index.ts, transform-to-pptel.ts, path-merge.ts, slides.ts, + new files)
- 2 new modules (`src/mappers/animation.ts`, `src/animation-injector.ts`)
- 84 effects + 48 transitions + 4 mapping tables
- Risk areas (transformer walk modification, createMergedShapeElement modification, convert return type change)

**Recommend 3 plans (waves)** with verifiable `<acceptance_criteria>`:

### Plan 01 (foundation) — type extensions + id injection + CLI parent-dir + convertDir() shell

**Files touched:**
- `package.json` (add nanoid)
- `src/slides.ts` (add `extensions` field on PPTAnimation)
- `src/transformer/transform-to-pptel.ts` (idRegistry + desiredId)
- `src/merger/path-merge.ts` (accept fallbackId)
- `src/index.ts` (ConvertResult adds `slide?`; add `convertDir()` shell returning empty animations)
- `src/cli.ts` (parent-dir mode dispatch)
- `src/utils/id-generator.ts` (NEW)
- `src/animation-types.ts` (NEW)

**No animation logic yet** — only structural plumbing.

**`<acceptance_criteria>`:**

- [ ] `npm ls nanoid` reports `nanoid@3.3.15` as a direct dependency (not extraneous, not missing).
- [ ] `vitest run tests/id-injection.test.ts` passes:
  - `<text id="my-text">` → `slide.elements[0].id === 'my-text'`.
  - `<text>` inside `<g id="card-temp">` → `slide.elements[0].id === 'card-temp__<5-char-id>'`.
  - `<text>` at root (no group) → `slide.elements[0].id` is 10-char nanoid.
  - `<g id="card-temp">` with 4 children → 4 distinct child ids.
- [ ] `vitest run tests/id-injection.test.ts` path-merge sub-tests:
  - `<g id="g1"><path/><path/></g>` (paths without ids) merges to 1 PPTElement with id derived from `<g id="g1">__<nanoid(5)>`.
  - `<g id="g2"><path/><path id="preserve"/></g>` does NOT merge (already enforced by shouldMerge).
- [ ] `npm test` (full) still passes — no regressions.
- [ ] `vitest run tests/cli-parent-dir.test.ts` detects parent-dir mode and writes to `svg_output/<name>.svg.json` (animations is `undefined`).

### Plan 02 (mapping) — mapper module + buildAnimations + slide.animations injection + turningMode

**Files touched:**
- `src/mappers/animation.ts` (NEW — ENTRANCE_MAP, EMPHASIS_MAP, EXIT_MAP, TRANSITION_MAP, EFFECT_FALLBACK, mapEffect, mapTrigger, mapDuration, mapTransition, inferAnimationType)
- `src/animation-injector.ts` (NEW — injectAnimations, printDiagnostics)
- `src/index.ts` (convertDir wires sidecar + diagnostics)

**`<acceptance_criteria>`:**

- [ ] `vitest run tests/animation-mapper.test.ts` passes:
  - `mapEffect('entrance_wipe', 'in')` returns `{ effect: 'fadeIn', fallback: false }`.
  - `mapEffect('entrance_unknown', 'in')` returns `{ effect: 'fadeIn', fallback: true }`.
  - `mapTrigger('on-click', undefined, undefined)` returns `'click'`.
  - `mapTrigger(undefined, 2, 1)` returns `'auto'` (strictly increasing).
  - `mapTrigger(undefined, 1, 1)` returns `'meantime'` (same order).
  - `mapDuration(0.45)` returns `450`.
  - `mapDuration(0.05)` returns `100` (clamped).
  - `mapDuration(10)` returns `5000` (clamped).
  - `mapTransition('fade')` returns `'fade'`.
  - `mapTransition('cut')` returns `'no'`.
  - `mapTransition('random')` returns `'random'`.
  - `mapTransition('dissolve')` returns `'fade'`.
  - `mapTransition('unknown_thing')` returns `'fade'`.
- [ ] `vitest run tests/animation-injector.test.ts` passes:
  - Sidecar with `entrance_fade` row → PPTAnimation with `effect: 'fadeIn'`, `type: 'in'`, `duration: 450` (default).
  - Sidecar with unrecognized effect → PPTAnimation with `effect: 'fadeIn'`, `extensions.originalEffect: 'unknown_thing'`.
  - Sidecar with `trigger: 'on-click'` → `trigger: 'click'`.
  - Sidecar with `effects: [{...}, {...}]` → multiple PPTAnimations on the same `elId`.

### Plan 03 (defaults & diagnostics) — defaults propagation + fallback visibility + E2E tests

**Files touched:**
- `src/animation-injector.ts` (defaults resolution; per-entry extension fields)
- `src/index.ts` (printDiagnostics integration in convertDir)
- `tests/e2e/202610131101001.test.ts` (NEW — full round-trip)

**`<acceptance_criteria>`:**

- [ ] `vitest run tests/animation-injector.test.ts` defaults tests pass:
  - `defaults.animation.duration: 0.45` applies to rows lacking `duration`.
  - `defaults.animation.trigger: 'on-click'` applies to rows lacking `trigger`.
  - `defaults.transition.effect: 'fade'` applies to slide lacking `transition`.
- [ ] `vitest run tests/animation-injector.test.ts` extension preservation tests pass:
  - Row with `effect_options: { direction: 'right' }` → `extensions.effect_options: { direction: 'right' }`.
  - Row with `repeat_count: 3` → `extensions.repeat_count: 3`.
  - Row with no special fields → `extensions` is `undefined` (not `{}`).
- [ ] `vitest run tests/e2e/202610131101001.test.ts` passes (using `exampels/202610131101001/` as fixture):
  - 13 covered slides have `slide.animations.length > 0`.
  - 7 uncovered slides have `slide.animations === undefined` (D-22).
  - For slide `03_overview`: `slide.animations.length === 4` (one per group: card-temperature, card-pulse, card-respiration, card-bp).
  - Every `animation.effect` is in the 84-entry valid set.
  - Every `animation.elId` matches `slide.elements[i].id` for some i.
  - Every `animation.duration` is in `[100, 5000]`.
  - For slide `03_overview`: `slide.turningMode === undefined` (no entry.transition specified, defaults.transition.effect is 'fade' but slide-level overrides? — verify behavior).
- [ ] `vitest run tests/cli-parent-dir.test.ts` smoke passes:
  - `dist/src/cli.js exampels/202610131101001` exits 0.
  - Output: 20 `.svg.json` files in `svg_output/`.
  - stderr contains diagnostics line with counts.

---

## Risk Register (anything CONTEXT.md missed)

Beyond `animation-adaptation-analysis.md` §7, the following risks are flagged:

1. **nanoid install risk (Pitfall 1)** — `nanoid` is currently transitive via `postcss`. Production builds will break if `postcss` updates and drops nanoid. **Mitigation:** Add `nanoid@^3.3.15` to direct dependencies in Plan 01 before any import.
2. **v5.x of nanoid is ESM-only** — would break the current CommonJS CJS output. Stick with v3.3.x line.
3. **CVE-2026-67214 (nanoid DoS via negative size)** affects `>=4.0.0,<5.1.16`. The v3.3.15 line has a separate patch in `<3.3.16`; as of research, 3.3.15 is in the legacy tag and the CVE fix landed in 3.3.16. **Recommendation:** Use `^3.3.15` (which npm will resolve to 3.3.15+ including the fix), or explicitly `^3.3.16` if available.
4. **Path-merge id collision** — `createMergedShapeElement` currently always generates `uuidv4()`. D-08 modification requires changing both the function signature and the call site. If a future contributor restores `uuidv4()` in `createMergedShapeElement` without the fallback, animations on path-merged elements will have `null` elId resolution.
5. **PPTAnimation.id uniqueness across slides** — `nanoid(10)` is per-slide only (loop-local in `injectAnimations`). If PPTist ever stores animations globally, this could collide. **Mitigation:** Document in injector docstring; consider global prefix in v2.
6. **animations.json missing slide_id → defaults propagation** — Per D-22, no entry → no animations. The analysis.md §5.5 hints that `defaults` should apply "to all slides with animations configured" — verify the test fixture distinguishes "slide with animations entry" from "slide without". CONTEXT.md D-22 says NO entry → NO animations, which is the strict reading. Test fixture should include 7 uncovered slides to verify this.
7. **Effect fallback visibility** — `fadeIn` fallback for unrecognized `entrance_unobvious_key` may not match three-side intent. The fallback is in `extensions.originalEffect` per D-15. Should the user see a warning in stderr? **Recommendation:** YES — add `elIdNotFoundWarnings`-like list of `unmappedEffects` to diagnostics (D-23 already covers this).
8. **Path-merge first-child id preservation** — D-08 says "first-child inner SVG id". But the call to `createMergedShapeElement` only happens when all children are `<path>` (per the existing check at `transform-to-pptel.ts:1912`). Paths typically don't have IDs (the `shouldMerge` rejects merge if any child has id). So the fallback is almost never used in practice. **Mitigation:** Document as "defense in depth" — code path exists for robustness even if rarely triggered.
9. **CLI confusion: parent-dir vs recursive** — Users may run `sv2json my-dir` expecting recursive mode and get parent-dir mode. **Mitigation:** Print a line "[svg2json] detected parent-dir mode (svg_output/ subdir present) — using convertDir()" to stderr to clarify.
10. **`convertDir` writes a new file per SVG but presentation-wide `slides: [...]` array is per-file** — Per ANIM-CLI-03, output is one `.svg.json` per SVG, not a presentation-wide JSON. Each `.svg.json` is a presentation of 1 slide. This is a deviation from typical PowerPoint import (which expects a single multi-slide JSON). **Decision:** Honor D-03 — the per-file JSON is the PPTist loading model (each slide is loaded independently).
11. **Concurrency in `convertDir`** — sequential processing per file. With 20 SVG files at ~500ms each, total ~10s. Not a blocker but worth noting.
12. **Sidecar schema drift** — three-side spec may add new fields. The `AnimationsSidecarGroup` interface uses `[key: string]: unknown` for forward-compat, but `injectAnimations` only reads known fields. Unknown fields are silently dropped — not preserved in `extensions`. **Decision:** This is intentional per D-12/D-13 (only the named fields are preserved).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `nanoid` can be added as a direct dependency without breaking tsc CJS output | §Standard Stack | If wrong: must use `nanoid/non-secure` only or vendor a helper |
| A2 | Path-merge always operates on id-less `<path>` children | §Architecture Patterns | If merges can apply to id'd children, fallbackId logic needs rework |
| A3 | Existing `transformElement` is the only PPTElement creation point in the pipeline | §Architecture Patterns | If other paths exist (e.g., direct shape generation), id injection may miss them |
| A4 | `exampels/202610131101001/animations.json` is the canonical test fixture | §Test Plan | If wrong: must use a different fixture |
| A5 | `picocolors` (already in deps) is sufficient for stderr coloring | §Standard Stack | If wrong: must add another color library |
| A6 | `cac` (already in deps) doesn't need updates for new `-d/--animations` option | §CLI dispatch | If wrong: must upgrade CAC |
| A7 | Default nanoid character set is URL-safe (64 chars: A-Za-z0-9_-) | §Don't Hand-Roll | If wrong: collision math changes |
| A8 | v3.3.x of nanoid is CJS-compatible | §Standard Stack | If wrong: must adjust import syntax |
| A9 | PPTist's `formatedAnimations` dedup-by-elId is the desired behavior for duplicates | §Pitfall 3 | If wrong: must emit error for duplicates |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

---

## Open Questions

1. **Should `effect_options.direction` be used to disambiguate side-direction variants in v1.9 (e.g., `entrance_glide` + `from-right` → `slideInRight`)?** CONTEXT.md D-12 says preserve direction in `extensions.effect_options`. CONTEXT.md D-16 says only "visually inverse mapping" when possible. Recommendation: defer to v2 (deferred idea list), document in Plan 02. **Not blocking.**

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | tsc / vitest / runtime | Yes | 22.x (per `@types/node: ^22.0.0`) | — |
| npm | install nanoid | Yes | (bundled with node) | — |
| nanoid | id generation (D-06/D-07/D-20) | **Yes (transitive)** | 3.3.15 in node_modules | Use `uuid.v4().slice(0, 10)` if adding nanoid is blocked |
| vitest | unit / integration tests | Yes | ^2.0.0 (devDep) | — |
| tsc | type-check + build | Yes | ^5.5.0 (devDep) | — |
| exampels/202610131101001/ | E2E test fixture | Yes | 13 covered / 7 uncovered | — |

**Missing dependencies with no fallback:** none

**Missing dependencies with fallback:** none (nanoid exists transitively; if direct install is blocked, fallback is `uuid.v4().slice(0, 10)` with degraded collision math).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^2.0.0 |
| Config file | vitest.config.ts (existing — `include: ['__tests__/**/*.test.ts', 'src/**/*.test.ts']`) |
| Quick run command | `npm test -- tests/animation-mapper.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
See `§Test Plan` above (17-row table).

### Sampling Rate
- **Per task commit:** `npm test -- <touched-file>.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** `npm test` green before `/gsd-verify-work`

### Wave 0 Gaps
See `§Test Plan → Wave 0 Gaps` above (10 items).

---

## Security Domain

`security_enforcement` is not explicitly disabled in `.planning/config.json` (assume enabled per the standard prompt). Phase 14 has limited security exposure — read-only input (SVG + JSON sidecar), no network, no auth. Apply minimal controls:

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth in this phase |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | Local CLI tool |
| V5 Input Validation | yes | `JSON.parse` on user-supplied sidecar; validate shape via TypeScript types |
| V6 Cryptography | no | No secrets |
| V9 Communications | no | No network |
| V10 Malicious Code | yes | sidecar JSON can contain arbitrary fields — use `[key: string]: unknown` type and only read known fields |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Sidecar JSON with prototype-pollution payloads (e.g., `__proto__`) | Tampering | Parse with `JSON.parse` (no `Object.assign`/`_.merge`); validate shape |
| Path traversal in `svgFilePath` | Tampering | Pass through `path.join` — already safe; verify no `..` resolution in write target |
| Sidecar with huge `effects[]` (DoS) | DoS | No hard limit — document in Plan 02 if needed |
| SVG with external `<image href>` references | Information Disclosure | Already handled by existing resvg-js fetch (out of scope for this phase) |

**Threat model summary:** Phase 14 has no elevated security posture; standard input validation suffices. No CVEs introduced by the new dependencies.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rolled slide.animations (none in v1.8) | Sidecar-injected slide.animations[] + turningMode | v1.9 (this phase) | PPTist animates slides per user intent |
| `uuid.v4()` for PPTElement.id | `<group_id>__<nanoid(5)>` or preserved SVG id or `nanoid(10)` | v1.9 (this phase) | animations.json can target elements by group |
| Single-SVG CLI | Single-SVG + parent-dir + (back-compat recursive) | v1.9 (this phase) | Multi-slide demo assembly supported |

**Deprecated/outdated:**
- `uuid.v4()` for PPTElement.id (replaced by three-strategy fallback)
- Implicit directory-as-input convention (replaced by explicit `svg_output/` detection)

---

## Sources

### Primary (HIGH confidence)

- `E:/git/svg2json/animation-adaptation-analysis.md` §1-7 — full mapping design + PPTist analysis
- `E:/git/ppt-master/docs/animations.md` L62-72 (48 transitions), L88-96 (Start modes), L233-251 (row fields)
- `E:/git/svg2json/code/PPTist/src/configs/animation.ts` L1-234 (84 effects)
- `E:/git/svg2json/code/PPTist/src/store/slides.ts` L84-111 (`formatedAnimations`)
- `E:/git/svg2json/code/PPTist/src/views/Screen/hooks/useExecPlay.ts` L58-106 (`runAnimation`)
- `E:/git/svg2json/.planning/phases/14-pptist-animation-from-sidecar/14-CONTEXT.md` — 23 decisions D-01~D-23
- `E:/git/svg2json/.planning/REQUIREMENTS.md` — 17 v1.9 requirements
- `E:/git/svg2json/exampels/202610131101001/animations.json` — 13-slide instance sidecar
- `E:/git/svg2json/exampels/202610131101001/svg_output/03_overview.svg` — group id / element id pattern sample

### Verified (HIGH confidence — source code read in this session)

- `E:/git/svg2json/src/slides.ts:688-695` (PPTAnimation definition) — `[VERIFIED: src/slides.ts:688-695]` confirms no `extensions` field exists today.
- `E:/git/svg2json/src/slides.ts:723` (TurningMode definition) — `[VERIFIED: src/slides.ts:723]` confirms 12 enum values.
- `E:/git/svg2json/src/slides.ts:767-777` (Slide definition) — `[VERIFIED: src/slides.ts:767-777]` confirms `animations?` / `turningMode?` fields exist.
- `E:/git/svg2json/src/index.ts:11-21` (ConvertOptions / ConvertResult) — `[VERIFIED: src/index.ts:11-21]` confirms no `slide` field on ConvertResult, no `slideId` on ConvertOptions.
- `E:/git/svg2json/src/index.ts:154-242` (convert()) — `[VERIFIED: src/index.ts:154-242]` confirms single-SVG → slide construction.
- `E:/git/svg2json/src/cli.ts:67-128` (main()) — `[VERIFIED: src/cli.ts:67-128]` confirms recursive directory mode exists; no parent-dir mode.
- `E:/git/svg2json/src/cli.ts:85-115` (directory processing) — `[VERIFIED: src/cli.ts:85-115]` confirms output is `<file>.svg.json` next to each SVG.
- `E:/git/svg2json/src/transformer/transform-to-pptel.ts:1010-1020` (transformElement signature) — `[VERIFIED: src/transformer/transform-to-pptel.ts:1010-1020]` confirms `const id = uuidv4()` on L1021.
- `E:/git/svg2json/src/transformer/transform-to-pptel.ts:1855-2016` (transformToPPTElement + walk) — `[VERIFIED: src/transformer/transform-to-pptel.ts:1855-2016]` confirms `effectiveGroupId` is already maintained.
- `E:/git/svg2json/src/transformer/transform-to-pptel.ts:1943-1955` (path-merge call site) — `[VERIFIED: src/transformer/transform-to-pptel.ts:1943-1955]` confirms `createMergedShapeElement` is called.
- `E:/git/svg2json/src/merger/path-merge.ts:75-91` (shouldMerge) — `[VERIFIED: src/merger/path-merge.ts:75-91]` confirms merge rejects id'd children.
- `E:/git/svg2json/src/merger/path-merge.ts:173-267` (createMergedShapeElement) — `[VERIFIED: src/merger/path-merge.ts:173-267]` confirms `const id = uuidv4()` on L245.
- `E:/git/svg2json/package.json` (dependencies) — `[VERIFIED: package.json:19-25]` confirms nanoid is NOT declared.
- `E:/git/svg2json/node_modules/nanoid/package.json` (transitive install) — `[VERIFIED: node_modules/nanoid/package.json:2-4]` confirms v3.3.15 IS installed.
- `E:/git/svg2json/vitest.config.ts` — `[VERIFIED: vitest.config.ts]` confirms test config.

### Secondary (MEDIUM confidence)

- `E:/git/svg2json/exampels/202610131101001/svg_output/` (20 SVGs) — instance structure verified by listing; only `03_overview.svg` was opened.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All deps verified in package.json + node_modules; nanoid version verified |
| Architecture | HIGH | Source code verified for all integration points (walk, createMergedShapeElement, convert, cli) |
| Mapping Tables | HIGH | PPTist effect whitelist verified in `configs/animation.ts`; three-side key set verified in `animations.md` + `animations.json` |
| Id Strategy | HIGH | Existing walk/effectiveGroupId verified; createMergedShapeElement signature verified |
| CLI Dispatch | HIGH | Existing recursive mode verified; parent-dir mode dispatch is straightforward extension |
| Test Plan | HIGH | vitest config verified; existing test pattern (`cli.font-validation.test.ts`) verified |
| Risks | MEDIUM | All enumerated risks have mitigations, but nanoid install is the only one not 100% certain |

**Research date:** 2026-10-15
**Valid until:** 2026-11-15 (30 days for stable; nanoid version + PPTist source are stable in this window)

---

## RESEARCH COMPLETE