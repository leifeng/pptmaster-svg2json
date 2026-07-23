# Phase 12: Font Preprocess - Context

**Gathered:** 2026-07-23
**Status:** Ready for planning

<domain>
## Phase Boundary

在公开 SVG 转换流程解析输入之前，把 SVG 中的字体**使用声明**统一为 `Source Han Sans CN Regular`。本阶段覆盖 presentation attributes、inline style 和 `<style>` CSS；不新增字体下载、嵌入、替换字体文件或新的排版能力。

</domain>

<decisions>
## Implementation Decisions

### 字体声明覆盖面
- **D-34:** 规范化四类入口：`font-family` presentation attribute、`font` shorthand attribute、inline `style="..."` 中的字体声明、`<style>` 标签中的 CSS 字体声明。
- **D-35:** 对所有 SVG 元素的实际字体属性/声明生效，不限于 `<text>` / `<tspan>`；这包括在 `<g>` 上继承的字体，以及原始 SVG 中的 `<textPath>` 字体属性。
- **D-36:** 不改写 `@font-face` 描述符或其 `src`；只统一字体使用声明，避免把嵌入的其他字体伪装成目标字体。

### `font` shorthand 语义
- **D-37:** 保留 shorthand 中的 style、variant、weight、stretch、size 与 line-height，只把完整 font-family 尾部替换为单一 `TARGET_FONT`。
- **D-38:** 必须正确识别多词、引号包围和逗号分隔的 fallback family list；当前 `split(/\s+/)` 实现不能作为最终语义。
- **D-39:** 无法可靠解析的 malformed shorthand 保持原值，不得为了覆盖率破坏 size/weight 等非 family 信息。
- **D-40:** `normalizeFontFamily()` 必须幂等；对同一 SVG 重复调用不会继续改变输出。

### 公开 API 集成边界
- **D-41:** 在 `convert()` 入口首先规范化 SVG，并将 normalized SVG 传入 `parseSvg()`。CLI 通过调用 `convert()` 自动获得该行为。— **Reversibility:** costly — 这是公开转换 API 的输入语义，撤销会改变所有 CLI 和库调用者的输出字体。
- **D-42:** 保持直接 `parseSvg()` 调用的 raw 解析语义，不在低层 parser 内隐式规范化。
- **D-43:** 从 `src/index.ts` 公共导出 `normalizeFontFamily`，让直接使用 `parseSvg()` 的调用者可显式选择预处理。
- **D-44:** normalizer 是同步、无 I/O 的确定性纯函数；空串或无字体声明的输入原样返回，且不吞掉后续转换错误。

### 非字体内容保护与验收
- **D-45:** `font-size`、font-weight/style/stretch/variant、line-height、fill、文本节点、CSS selector、注释、script/data URI 与所有其他属性保持不变。
- **D-46:** 替换 family 值时保留 CSS `!important`；仅目标字体声明允许必要的格式规范化。
- **D-47:** 验收同时覆盖 normalizer 单测与公开 `convert()`/CLI 集成路径；还需证明直接 `parseSvg()` 仍保留原字体。
- **D-48:** build 与 Phase 12 focused/integration tests 必须通过。全量测试以执行前基线为准，要求新增失败为 0；不得把已存在的测试债务归因于 Phase 12。

### Claude's Discretion
- 选择 XML/CSS tokenizer、状态机或其他实现方式，只要满足上述行为；不要为此引入新依赖，除非研究证明标准库无法安全覆盖。
- 目标声明的空白、引号与分号格式可规范化，但非目标内容必须保持语义和内容不变。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Existing Artifacts
- `.planning/ROADMAP.md` § Phase 12 — authoritative goal and success criteria.
- `.planning/phases/12-font-preprocess/12-01-PLAN.md` — historical plan; MUST be regenerated because it predates these decisions and overstates several regex semantics.
- `.planning/phases/12-font-preprocess/12-SUMMARY.md` — historical notes only; its claim that `convert()` is integrated is stale and contradicted by current source.

### Core Source
- `src/preprocessor/font-preprocessor.ts` — existing normalizer; reusable foundation, currently missing inline-style handling and robust shorthand parsing.
- `src/preprocessor/font-preprocessor.test.ts` — existing 14-test baseline to retain and extend.
- `src/index.ts` — public `convert()` entry; current line 159 still passes raw `svgContent` to `parseSvg()`.
- `src/parser/svg-parser.ts` — low-level parser whose direct raw semantics must remain unchanged.
- `src/constants.ts` — canonical `TARGET_FONT = 'Source Han Sans CN Regular'`.

No external specs or ADRs apply; requirements are captured by the ROADMAP goal and decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `normalizeFontFamily(svgContent)` in `src/preprocessor/font-preprocessor.ts`: already handles quoted `font-family`, `font` attributes and `<style>` blocks.
- `replaceFontFamilyInShorthand()`: existing helper to replace rather than discard non-family shorthand components, but its whitespace split is incomplete.
- `TARGET_FONT` in `src/constants.ts`: single source of truth shared with resvg-js font configuration.
- `src/preprocessor/font-preprocessor.test.ts`: 14 existing cases provide regression coverage for the current implementation.

### Established Patterns
- Preprocessing occurs before parse/transform (`preprocessClipPaths` uses the same pipeline concept after parsing); Phase 12 needs a raw-string preprocessor immediately before `parseSvg()`.
- Shared named constants live in `src/constants.ts`; no duplicate target-font literal should be introduced.
- Public conversion behavior is observed through `convert()` and the built CLI; low-level exports remain opt-in.

### Integration Points
- `src/index.ts:154-160`: import `normalizeFontFamily`, compute normalized input at the start of `convert()`, and pass it to `parseSvg()`.
- `src/index.ts` export list: add the public normalizer export without changing `parseSvg` behavior.
- `src/preprocessor/font-preprocessor.ts`: extend coverage to inline styles, `@font-face` exclusion, robust shorthand boundaries, `!important`, and idempotence.
- Current source already contains the module and tests, but integration is absent; the old SUMMARY must not be treated as proof of completion.

</code_context>

<specifics>
## Specific Ideas

- Exact target value: `Source Han Sans CN Regular` via `TARGET_FONT`, never a duplicated string literal.
- For `font: italic 700 16px/1.4 "Arial", sans-serif`, expected family outcome is a single target family while `italic 700 16px/1.4` remains intact.
- An SVG with no font declarations must be byte-identical after normalization.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-font-preprocess*
*Context gathered: 2026-07-23*
