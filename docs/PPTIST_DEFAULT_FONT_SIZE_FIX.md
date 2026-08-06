# PPTist 侧修改方案：文本元素默认字号（`defaultFontSize`）

> 关联调试会话：`.planning/debug/small-font-top-offset.md`
> 目标：把「小字号文本 top 视觉偏移」的修复从 svg2json 下游规避，迁移为 PPTist 上游根治。
> 状态：**方案文档，尚未实施**

---

## 1. 问题回顾

### 1.1 现象

svg2json 转换出的 JSON 导入 PPTist 后，文本的视觉顶端与元素的 `top` 不一致：

| SVG 字号 | canvas 字号 | 视觉顶端相对 `top` 的偏移 | 观感 |
|---|---|---|---|
| 11px | 8.59px | **+5.93px**（偏下） | 小字明显下沉 |
| 60px | 46.88px | **−24.7px**（偏上） | 大字略微上浮，不易察觉 |

用户报告为「字体越小，top 偏差越大」。

### 1.2 机理

`code/PPTist/src/assets/styles/prosemirror.scss:1-7`：

```scss
.ProseMirror, .ProseMirror-static {
  outline: 0;
  border: 0;
  font-size: 16px;        // ← 根源
  overflow-wrap: break-word;
  ...
}
```

渲染时的 DOM 结构（`BaseTextElement.vue:15-45`）：

```html
<div class="element-content" style="line-height: 1; font-family: ...">
  <div class="text ProseMirror-static">        <!-- CSS: font-size: 16px -->
    <p style="text-align: center">              <!-- 无 font-size → 继承 16px -->
      <span style="font-size: 8.59px">文字</span>
    </p>
  </div>
</div>
```

`line-height: 1` 由 `elementInfo.lineHeight` 通过 inline style 施加在 `.element-content` 上（`BaseTextElement.vue:23`），覆盖 scoped CSS 的 `line-height: 1.5`（`:87`）。

于是：

- `<p>` 的 line-box 高度 = `1 × 16px` = **16px**，baseline 落在 `≈0.8 × 16 = 12.8px`
- `<span>` 按 baseline 对齐，其视觉顶端 = `12.8 − 0.8 × 8.59` = **5.93px**

**关键点**：这个偏移量由 `<p>` 的 16px 决定，**与 span 的实际字号无关，是一个常数**。小字号本身才 8px 高，5.93px 的偏移占比过半，肉眼极其明显；大字号时 `0.8 × 46.88 = 37.5 > 12.8`，偏移反向变负，但占比小而不易察觉。

### 1.3 为什么算是 PPTist 的问题

`.ProseMirror` 的 `font-size: 16px` 是**编辑器根容器的默认字号**，本意是给「用户没指定字号的段落」一个兜底值。但它同时成了 `<p>` line-box 的高度基准，而 PPTist 的富文本模型把字号存在 `<span>` 的 mark 上、不写在 `<p>` 上 —— 于是 **line-box 基准与实际文字字号解耦**，任何字号 ≠ 16px 的文本都会有视觉偏移。

只是 PPTist 原生场景下这个偏移不刺眼：原生新建文本默认就是 16px（`utils/prosemirror/utils.ts:189`），偏移为 0；用户手动调字号一般在 12–32px 区间，偏移量小且 `lineHeight` 默认 1.5 有额外余量吸收。而 svg2json 会产出 8px 甚至更小的字号，且 `lineHeight` 常被设为 1，偏移就暴露了。

---

## 2. 当前的下游规避（svg2json 侧，已实施）

`src/transformer/transform-to-pptel.ts`，两处：

| 位置 | 分支 | 改动 |
|---|---|---|
| `:1624-1626` | 单行文本 | `pStyleParts = ['font-size: ${scaledFontSize}px']`，再按需追加 `text-align` |
| `:1701-1703` | 多行 tspan | `tspanPStyle = ['font-size: ${scaledFontSize}px']`，同上 |

产出：

```html
<p style="font-size: 8.59px; text-align: center">
  <span style="font-size: 8.59px">文字</span>
</p>
```

inline style 优先级 `(1,0,0,0)` 压过 class 选择器 `(0,0,1,0)`，line-box 与 span 字号一致，偏移归零。

**局限**：
- 只治 svg2json 产出的 JSON；PPTist 从 pptx 导入（`useImport.ts`）或 AIPPT 生成的内容若字号 ≠ 16px 仍有偏移
- 字号信息在 `<p>` 和 `<span>` 上重复了一遍，且要求二者恒等 —— 未来若支持「同一段内混排多种字号」，`<p>` 该取哪个值会变成新问题

---

## 3. PPTist 侧方案

### 3.1 方案对比

| 方案 | 做法 | 评价 |
|---|---|---|
| **A. 删除 `font-size: 16px`** | 直接从 `prosemirror.scss` 移除 | ❌ 不解决。`<p>` 会继续向上继承到 `body`（通常 14/16px），基准值只是换了个数，解耦问题原封不动 |
| **B. 改成 `font-size: inherit`** | 让它从 `.element-content` 继承 | ❌ 同上，`.element-content` 也没设 font-size |
| **C. 在 `.element-content` 上设 inline `fontSize`** | Vue 组件里加一行 | ❌ **无效**。`.element-content` 是 `.ProseMirror-static` 的**父元素**，继承值优先级最低，子元素上的 class 声明 `font-size: 16px` 照样赢 |
| **D. 在 `.text` div 上设 inline `fontSize`** ✅ | `.text.ProseMirror-static` 本身加 inline style | **推荐**。inline style 直接压过 class 选择器，且是唯一能让 line-box 基准跟随元素字号的位置 |

### 3.2 推荐方案 D：引入 `PPTTextElement.defaultFontSize`

与已有的 `defaultFontName` / `defaultColor` 完全对称 —— 这两个字段已经是「元素级默认值，被内容中的 HTML inline style 覆盖」的既定模式（`types/slides.ts:158-160`），`defaultFontSize` 是缺失的第三块拼图。

> **注**：svg2json **已经在输出 `defaultFontSize`** 了（`src/transformer/transform-to-pptel.ts:1711`：`defaultFontSize: tspan.fontSize * scaleY`），但 PPTist 的 `PPTTextElement` 类型里没有这个字段，所以目前被静默忽略。本方案等于把这个既成事实补齐到 PPTist。

---

## 4. 改动清单

### 改动 1 — 类型定义

**文件**：`code/PPTist/src/types/slides.ts`

`PPTTextElement`（约 `:186`）与 `PPTShapeElement.text`（约 `:328`）各加一个可选字段：

```diff
 export interface PPTTextElement extends PPTBaseElement {
   type: 'text'
   content: string
   defaultFontName: string
   defaultColor: string
+  defaultFontSize?: number
   outline?: PPTElementOutline
   ...
 }
```

同步补文档注释（`:158` 附近）：

```diff
  * defaultColor: 默认颜色（会被文本内容中的HTML内联样式覆盖）
+ *
+ * defaultFontSize?: 默认字号（px，会被文本内容中的HTML内联样式覆盖）；
+ *                   同时决定段落 line-box 的高度基准，未设置时回退 16px
```

`PPTShapeElement` 的 `text` 子对象同样处理（`:331-332` 附近）。

---

### 改动 2 — 只读态渲染

**文件**：`code/PPTist/src/views/components/element/TextElement/BaseTextElement.vue`

`:40-44`：

```diff
         <div 
           class="text ProseMirror-static" 
           :class="{ 'thumbnail': target === 'thumbnail' }"
+          :style="{ fontSize: (elementInfo.defaultFontSize ?? 16) + 'px' }"
           v-html="elementInfo.content"
         ></div>
```

---

### 改动 3 — 编辑态渲染

**文件**：`code/PPTist/src/views/components/element/TextElement/index.vue`

`:44-52`，`ProsemirrorEditor` 组件同样需要（它内部渲染出的根节点带 `.ProseMirror` 类）：

```diff
         <ProsemirrorEditor
           class="text"
+          :style="{ fontSize: (elementInfo.defaultFontSize ?? 16) + 'px' }"
           :elementId="elementInfo.id"
           :defaultColor="elementInfo.defaultColor"
           :defaultFontName="elementInfo.defaultFontName"
```

> ⚠️ **需先验证**：`ProsemirrorEditor.vue` 是否会把 `$attrs`（含 `style`）透传到带 `.ProseMirror` 类的那个 DOM 节点上。若它有多层包裹或显式 `inheritAttrs: false`，需要改为在组件内部接收一个 `defaultFontSize` prop 并显式绑定。**实施前必须实测确认**。

---

### 改动 4 — 形状内文本

**文件**：
- `code/PPTist/src/views/components/element/ShapeElement/BaseShapeElement.vue`（`:66` 附近）
- `code/PPTist/src/views/components/element/ShapeElement/index.vue`（`:76` 附近）

同样在其内部的 `.text` / `ProsemirrorEditor` 节点上绑定 `text.defaultFontSize`。

---

### 改动 5 — 工具栏默认值保持同步

**文件**：`code/PPTist/src/utils/prosemirror/utils.ts`

`:189` 的 `_defaultAttrs.fontsize = '16px'` 与 `:253` 的 `defaultRichTextAttrs.fontsize = '16px'`，决定「光标所在处没有 fontsize mark 时，工具栏字号框显示什么」。

现状是硬编码 16px。引入 `defaultFontSize` 后，理想做法是让 `getTextAttrs()` 的调用方传入当前元素的 `defaultFontSize` 作为 `attrs.fontsize` —— 该函数**已经支持** `attrs: Partial<DefaultAttrs>` 覆盖参数（`:192`），所以只需在调用点补传，无需改函数签名。

```ts
// 调用点示例
const attrs = getTextAttrs(view, {
  fontsize: (element.defaultFontSize ?? 16) + 'px',
  fontname: element.defaultFontName,
  color: element.defaultColor,
})
```

> 这一条是**体验优化，非正确性必需**。不做的话，选中小字号文本时工具栏可能显示 16px 而非实际字号 —— 但只在该段落没有显式 fontsize mark 时发生，而 svg2json 产出的内容 span 上都有显式 fontsize，不受影响。**可作为第二阶段**。

---

### 改动 6 — svg2json 侧回退（改动 1-4 合入并验证后）

`src/transformer/transform-to-pptel.ts` 的两处 `<p>` font-size 注入可以撤回，恢复为：

```ts
const pStyle = textAlign ? `text-align: ${textAlign}` : ''
```

`defaultFontSize` 字段保持输出不变（已存在）。

> **强烈建议**：改动 1-4 在真实 PPTist 中目视验证通过**之后**再撤。两者同时生效不会冲突（`<p>` 的 inline font-size 与 `.text` 的 inline font-size 数值相同），所以可以安全地重叠一段时间。

---

## 5. 影响面分析

### 5.1 `em` 单位的连带变化

`prosemirror.scss` 中以 `em` 计量、随字号缩放的规则：

| 规则 | 位置 | 挂载元素 | 是否受影响 |
|---|---|---|---|
| `ul, ol { padding-inline-start: 1.25em }` | `:32, :41` | `ul`/`ol`（`.ProseMirror` 直接子元素） | ✅ **受影响** —— 现在跟随 `defaultFontSize` 缩放 |
| `blockquote { padding: 0 1.2em; margin: 0.6em 0 }` | `:67-68` | `blockquote` | ✅ **受影响** |
| `[data-indent='N'] { padding-left: Nem }` | `:73-96` | 通常在 `<p>` 上 | ✅ **受影响** |
| `sup/sub { font-size: smaller }` | `:58, :62` | 内联，相对父级 | ⚠️ 相对量，视嵌套而定 |
| `p { margin-top: var(--paragraphSpace) }` | `:20` | `<p>` | ❌ 不受影响（px 单位，`BaseTextElement.vue:32`） |
| `code { padding: 2px 6px }` | `:50` | 内联 | ❌ 不受影响（px） |

**判断**：这些变化方向上是**更正确**的 —— 列表缩进、引用块留白本就该随正文字号缩放，而不是永远锚在 16px。但确实是可见的行为变更，需要在含列表/引用的幻灯片上回归。

### 5.2 pptx 导出

`code/PPTist/src/hooks/useExport.ts`：
- `:29` `const defaultFontSize = 16`
- `:289, :294` 项目符号缩进 `(options.fontSize || defaultFontSize) * 1.25`
- `:551, :697` 文本 fallback 字号

这些 fallback 只在解析不出 inline `font-size` 时生效。引入 `defaultFontSize` 后，理想是让这里也读元素的 `defaultFontSize`。**建议列为第二阶段**，与改动 5 一并处理。

### 5.3 向后兼容

- 字段可选 + `?? 16` 回退 ⇒ **所有存量 JSON 行为完全不变**
- 原生新建文本不写 `defaultFontSize` ⇒ 走 16px ⇒ 与今天一致
- 无数据迁移需求

### 5.4 既有先例

`code/PPTist/src/hooks/useAIPPT.ts:179-182`：

```ts
if (doc.body.innerHTML.indexOf('font-size') === -1) {
  const p = doc.querySelector('p')
  if (p) p.style.fontSize = '16px'
}
```

**PPTist 自己已经在给 `<p>` 补显式 font-size**，说明这个坑上游早就踩到过，只是当时用打补丁的方式局部绕过了。本方案相当于把这个补丁提升为通用机制 —— 改动 1-4 落地后，这段 AIPPT 特判也可以简化掉。

---

## 6. 验证清单

### 6.1 单元 / 类型

- [ ] `npm run type-check`（PPTist）通过
- [ ] `npm run lint` 通过

### 6.2 视觉回归（必须目视）

| 场景 | 检查点 |
|---|---|
| svg2json 产出 `exampels/a.svg.json` 导入 | 8.59px 小字文本顶端与元素框顶端齐平，无 ~6px 下沉 |
| 同上，大字号（46.88px）文本 | 顶端不再上浮 ~25px |
| PPTist 原生新建文本框 | 位置、光标高度与改动前**逐像素一致**（不写 `defaultFontSize` ⇒ 走 16px 回退） |
| 原生文本改字号为 8px / 48px | 视觉顶端跟随，不产生新偏移 |
| 含 `ul` / `ol` 的文本框 | 缩进随字号缩放，视觉可接受（**预期会变**） |
| 含 `blockquote` 的文本框 | 同上 |
| 含 `[data-indent]` 的段落 | 同上 |
| 形状内文本（改动 4） | 与文本元素表现一致 |
| 编辑态 ↔ 只读态切换 | 文字**不发生跳动**（改动 2 与 3 必须同时生效，否则两态基准不同） |
| 缩略图（`target === 'thumbnail'`） | 与画布一致 |
| 演讲者视图 `PresenterView.vue` | 同上 |
| 导出 pptx | 小字号文本位置正确 |

### 6.3 关键风险点

> **改动 2 与改动 3 必须成对落地。** 只改只读态会导致双击进入编辑时文字瞬间跳动 —— 这是比原 bug 更差的体验。

---

## 7. 实施顺序建议

```
阶段一（正确性）
  改动 1  类型定义
  改动 2  只读态          ┐ 必须同时
  改动 3  编辑态          ┘
  改动 4  形状内文本
  → 全量视觉回归（6.2）
  → 通过后执行改动 6（撤回 svg2json 侧规避）

阶段二（一致性，可延后）
  改动 5  工具栏默认值同步
  useExport.ts 的 defaultFontSize 读取元素字段
  简化 useAIPPT.ts:179-182 的特判
```

---

## 8. 决策建议

| | 改 svg2json（现状） | 改 PPTist（本方案） |
|---|---|---|
| 影响面 | 仅本工具产出的 JSON | PPTist 全部文本元素 |
| 是否根治 | ❌ 下游规避 | ✅ 上游根治 |
| 是否需改 PPTist 仓库 | 否 | 是 |
| 回归成本 | 低（3 个单测已覆盖） | 中（需完整视觉回归） |
| 对 pptx 导入 / AIPPT 的收益 | 无 | 有 |
| 风险 | 低 | 中（`em` 连带变化 + 编辑/只读两态需同步） |

**建议**：若你能控制 PPTist 分支且愿意承担一轮完整视觉回归 —— 走本方案，它是真正的根治，且顺带修好 pptx 导入和 AIPPT 路径。否则保留 svg2json 侧的现有修复（已验证、成本低）。

**过渡策略**：两侧同时生效不会冲突（`<p>` 与 `.text` 的 inline font-size 数值相同）。可以先合 PPTist 改动、观察一段时间，确认无回归后再撤 svg2json 侧的规避。

---

## 附录：涉及文件速查

| 文件 | 行 | 作用 |
|---|---|---|
| `code/PPTist/src/assets/styles/prosemirror.scss` | `:4` | **根源** `font-size: 16px` |
| `code/PPTist/src/types/slides.ts` | `:186`, `:328` | `PPTTextElement` / `PPTShapeElement.text` |
| `code/PPTist/src/views/components/element/TextElement/BaseTextElement.vue` | `:41`, `:23` | 只读态 `.text` 节点 / `lineHeight` 注入 |
| `code/PPTist/src/views/components/element/TextElement/index.vue` | `:44` | 编辑态 `ProsemirrorEditor` |
| `code/PPTist/src/views/components/element/ShapeElement/BaseShapeElement.vue` | `:66` | 形状内文本（只读） |
| `code/PPTist/src/views/components/element/ShapeElement/index.vue` | `:76` | 形状内文本（编辑） |
| `code/PPTist/src/utils/prosemirror/utils.ts` | `:189`, `:253` | 工具栏默认字号 |
| `code/PPTist/src/hooks/useExport.ts` | `:29`, `:289`, `:294`, `:551`, `:697` | pptx 导出 fallback |
| `code/PPTist/src/hooks/useAIPPT.ts` | `:179-182` | 既有的 `<p>` font-size 补丁先例 |
| `src/transformer/transform-to-pptel.ts` | `:1624`, `:1701`, `:1711` | svg2json 侧现有规避 + `defaultFontSize` 输出 |
