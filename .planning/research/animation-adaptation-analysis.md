# 三方动画 → PPTist 动画 — 适配分析

> 本文档为实现前的设计与映射分析。所有内容基于 E:\git\svg2json（当前 svg2json 仓库）与 E:\git\svg2json\code\PPTist（PPTist 官方前端代码）的现状，以及 E:\git\ppt-master\docs\animations.md（PPT-master 动画生成规则）与 E:\git\svg2json\exampels\202610131101001\animations.json（实例 sidecar）。

## 1. PPTist 动画系统全景

PPTist 把"动画"分成两层：**幻灯片级（页面切换）** + **元素级（元素出现/消失/强调）**。两个层级独立、可并存。

### 1.1 类型层 — `code/PPTist/src/types/slides.ts`

```ts
// L670-695 (核心定义)
export type AnimationType    = 'in' | 'out' | 'attention'
export type AnimationTrigger = 'click' | 'meantime' | 'auto'

export interface PPTAnimation {
  id: string                 // nanoid(10) 生成
  elId: string               // 关联的 PPTElement.id
  effect: string             // animate.css 类名（驼峰式），如 'bounceInLeft' / 'fadeInDown'
  type: AnimationType        // 入 / 出 / 强调
  duration: number           // 单位 ms；默认 1000；范围 100-5000
  trigger: AnimationTrigger  // 主动触发 / 与上一动画同时 / 上一动画之后
}

// L723
export type TurningMode = 'no' | 'fade' | 'slideX' | 'slideY' | 'random'
  | 'slideX3D' | 'slideY3D' | 'rotate' | 'scaleY' | 'scaleX' | 'scale' | 'scaleReverse'

// L767-777
export interface Slide {
  id: string
  elements: PPTElement[]
  background?: SlideBackground
  animations?: PPTAnimation[]      // ★ 元素动画挂在这里
  turningMode?: TurningMode        // ★ 页面切换动画
  // ...
}
```

关键点：
- **没有 effect_options / delay / repeat_count / sound / trigger_shape 等字段**——三方很丰富可选项只有 `effect / type / duration / trigger` 4 个会真正落到 PPTAnimation 上。
- `elId` 是与 `PPTElement.id`（uuidv4）的引用——必须先有元素 id 才能挂动画。
- `TurningMode` 只有 12 个枚举值，且 PPTist 自己把 `random` 在 `useSlidesWithTurningMode.ts` 里展开成其它 11 个之一。

### 1.2 配置层 — `code/PPTist/src/configs/animation.ts`

PPTist 用 [animate.css](https://animate.style/) 的类名驱动动画。文件同时定义 4 个常量：

| 常量 | 用途 | 数量 |
|---|---|---|
| `ENTER_ANIMATIONS` | 入场动画（type='in'），按类目分组 | 8 类 / 36 个 effect |
| `EXIT_ANIMATIONS` | 退场动画（type='out'） | 8 类 / 36 个 effect |
| `ATTENTION_ANIMATIONS` | 强调动画（type='attention'） | 2 类 / 12 个 effect |
| `SLIDE_ANIMATIONS` | 页面切换（12 个 TurningMode） | 12 |

入场 8 大类（与 animate.css 一致）：
- `bounce`（弹跳）→ `bounceIn / bounceInLeft / bounceInRight / bounceInUp / bounceInDown`
- `fade`（浮现）→ `fadeIn / fadeInDown / fadeInDownBig / fadeInLeft / fadeInLeftBig / fadeInRight / fadeInRightBig / fadeInUp / fadeInUpBig / fadeInTopLeft / fadeInTopRight / fadeInBottomLeft / fadeInBottomRight`
- `rotate`（旋转）→ `rotateIn / rotateInDownLeft / rotateInDownRight / rotateInUpLeft / rotateInUpRight`
- `zoom`（缩放）→ `zoomIn / zoomInDown / zoomInLeft / zoomInRight / zoomInUp`
- `slide`（滑入）→ `slideInDown / slideInLeft / slideInRight / slideInUp`
- `flip`（翻转）→ `flipInX / flipInY`
- `back`（放大滑入）→ `backInDown / backInLeft / backInRight / backInUp`
- `lightSpeed`（飞入）→ `lightSpeedInRight / lightSpeedInLeft`

出场、强调的命名规则完全对称（`In → Out`、`*In*` 形态保留）。强调另有 `bounce / flash / pulse / rubberBand / heartBeat`（无方向性）。

类名前缀由同文件 `ANIMATION_CLASS_PREFIX = 'animate__'` 决定，执行时实际写到 DOM 上的 class 是：

```
animate__animated animate__<effect>
```

> **注意：configs/animation.ts 是 UI 选择面板的源数据，运行时也是真值表**（useExecPlay 直接拼 `ANIMATION_CLASS_PREFIX + effect`）。所以 effect 字段必须是上面列出的 84 个字符串之一，否则动画根本不播放。

### 1.3 状态层 — `code/PPTist/src/store/slides.ts`

唯一会操作 `slide.animations` 的 getter：`formatedAnimations`，把 PPTAnimation[] 按 trigger 折叠成二维数组：

```ts
// L84-111
formatedAnimations(state) {
  // 遍历当前 slide.animations：
  //   trigger === 'click'  → 新一组
  //   trigger === 'meantime' → 合并到上一组（同一播放时刻）
  //   trigger === 'auto'  → 标记上一组 autoNext=true，再开新组
}
```

折叠之后形状为 `Array<{ animations: PPTAnimation[]; autoNext: boolean }>`，执行端按"组"播：

```
组1（click）→ 组2（meantime 合并）→ 组3（autoNext=true → 自动跳到下一组）→ ...
```

这是理解三方 `order` 字段语义的关键：**三方用 order 排顺序，PPTist 用 trigger 表达"与上一组同时/上一组之后"**——见 §4.3。

### 1.4 编辑层

| 文件 | 作用 |
|---|---|
| `views/Editor/Toolbar/SlideAnimationPanel.vue` | 切换 turningMode 的 UI；选 12 个 SLIDE_ANIMATIONS 之一 |
| `views/Editor/Toolbar/ElementAnimationPanel.vue` | 给选中元素加元素动画；Tabs(in/out/attention) + 选择 effect + 持续时长 + 触发方式；可拖拽排序 |
| `views/Editor/Canvas/ElementFloatLayer/AnimationIndex.vue` | 画布上每条动画前面显示 1/2/3 编号（基于 formatedAnimations 的顺序） |

执行动画预览（ElementAnimationPanel L244-257）的核心逻辑：

```ts
const elRef = document.querySelector(`#editable-element-${elId} [class^=editable-element-]`)
elRef.classList.add(`${ANIMATION_CLASS_PREFIX}animated`, `${ANIMATION_CLASS_PREFIX}${effect}`)
```

### 1.5 执行层 — `views/Screen/hooks/useExecPlay.ts` 与 `useSlidesWithTurningMode.ts`

`useExecPlay.ts` 是 PPTist 播放页的核心：
- `runAnimation()`（L58-106）：从 `formatedAnimations[animationIndex]` 取一组，遍历给每条动画对应的 DOM 节点加 `animate__animated animate__<effect>` class，并设置 `--animate-duration: <duration>ms`。
- `execNext / execPrev`：单击/键盘/触摸时优先推进动画索引，索引走完再翻页。
- `restoreAnimationState`：在观众视图同步初始状态时把已播过的"退场"动画直接挂上终态。
- 自动播放、循环播放、激光笔、上下页跳转都是这套机制外面包一层。

`useSlidesWithTurningMode.ts`（仅 26 行）就是给每张 slide 把 `turningMode` 兜底成 `slideY`，并把 `random` 随机成其它非 `no`/`random` 值。

> 因此，**只要最终 JSON 里有正确格式的 `slide.animations[]` 和 `slide.turningMode`，PPTist 直接消费**，无需再加工。

---

## 2. svg2json 现状

### 2.1 与动画相关的代码

```
src/slides.ts               ← 类型定义（已包含 PPTAnimation / TurningMode / Slide.animations，从 PPTist 同步过来）
src/index.ts                ← convert()：SVG → 单 Slide JSON
src/transformer/transform-to-pptel.ts ← 已写 PPTElement.groupId（来自父 g id）
src/cli.ts                  ← 接受 .svg / 目录输入；输出 .json
```

### 2.2 现状缺口（实现前要补齐）

| 缺口 | 说明 |
|---|---|
| **多 slide 输入** | 当前 `convert()` 总是输出 1 张 slide；animations.json 是按 slide_id 索引的，必须把目录输入升级为多 slide 输出（`slides: [...]`） |
| **animations.json 解析** | 没有读取 animations.json 的逻辑；要加 CLI 参数（如 `--animations <path>`）或约定 sidecar 同名 `animations.json` 自动加载 |
| **groupId → elId 反查** | transformer 已把 SVG `<g id="x">` 写进 `PPTElement.groupId`，但运行时需要"通过 animations.json 的 `groups[groupId]` 找到所有 `elId`"。需要决定一个 g 是给所有子元素各加一条动画，还是给 g 整体合并后的元素加一条动画（g 可能被 path-merge 合并成单 shape） |
| **effect 映射表** | 没有三方→PPTist 的 effect 映射；84 个 PPTist effect 与 203 个三方 entrance 不可能 1:1 |
| **duration 单位** | 三方用秒（`0.45`），PPTist 用毫秒（`1000`） |
| **trigger 语义转换** | 三方 `after-previous / with-previous / on-click` → PPTist `auto / meantime / click` |
| **transition 映射** | 三方 48 个 canonical key → PPTist 12 个 TurningMode |
| **多 effect / trigger_shape** | 三方支持 `effects[]` 多步动画 + `trigger_shape` "点击其它元素触发"；PPTist 这两种特性都没有 |

---

## 3. PPT-master 三方 animations.json 格式

源：`E:\git\ppt-master\docs\animations.md` + `E:\git\svg2json\exampels\202610131101001\animations.json`。

### 3.1 顶层 schema

```jsonc
{
  "version": 1,
  "defaults": {
    "transition": { "effect": "fade", "duration": 0.4 },   // 秒
    "animation":  { "trigger": "after-previous", "duration": 0.45 }
  },
  "slides": {
    "<slide_id>": {
      "transition": { ... },      // 可选：覆盖 defaults.transition
      "animation":  { "trigger": "..." },  // 可选：覆盖 defaults.animation
      "groups": {
        "<svg_group_id>": {
          // 两种写法二选一，不能并存
          "effect": "entrance_wipe",     // 单 effect
          "order": 1,
          "duration": 0.46
          // 或
          "effects": [
            { "effect": "...", "order": 1, "duration": 0.25, "trigger": "after-previous" },
            { "effect": "...", "order": 2, "delay": 0.1,  "duration": 0.7,  "trigger_shape": "details-button" },
            { "effect": "...", "order": 3, "trigger": "with-previous", "duration": 0.45 }
          ]
        }
      }
    }
  }
}
```

### 3.2 三方 animation row 字段全集（来自 animations.md L233-251）

| 字段 | 用途 |
|---|---|
| `effect` | 必填；选择具体效果（PPTX OOXML 原生 key） |
| `trigger` | 覆盖本条 Start mode；继承 slide.animation.trigger |
| `order` | 本页普通行的播放顺序（1,2,3...）；trigger_shape 行有独立的交互序列 |
| `delay` | 给本条 Start 行为加一个前置停顿 |
| `duration` | 覆盖本条时长（秒） |
| `effect_options` | direction / amount / color / font_name / relative / size |
| `trigger_shape` | "点击其它 group 时触发本行"——PPTist 无对应 |
| `repeat_count` / `repeat_duration` / `auto_reverse` / `rewind` / `accelerate` / `decelerate` / `bounce_end` / `restart` | 时间修饰 |
| `after_effect` | none / dim / hide / hide on next click |
| `sound` | 可选本地 wav/m4a/mp3 路径 |

### 3.3 三方 Start mode（来自 animations.md L88-96）

| 三方 | PPTist |
|---|---|
| `on-click` | `click`（主动触发） |
| `with-previous` | `meantime`（与上一动画同时） |
| `after-previous`（默认） | `auto`（上一动画之后） |

### 3.4 三方 page transition（48 个 canonical）

来自 `ppt-master/docs/animations.md` L62-72：
- Subtle 12 个：`morph, fade, push, wipe, split, reveal, cut, random_bars, shape, uncover, cover, flash`
- Exciting 28 个：`fall_over, drape, curtains, wind, prestige, fracture, crush, peel_off, page_curl, airplane, origami, dissolve, checkerboard, blinds, clock, ripple, honeycomb, glitter, vortex, shred, switch, flip, gallery, cube, doors, box, comb, zoom, random`
- Dynamic Content 6 个：`pan, ferris_wheel, conveyor, rotate, window, orbit, fly_through`

旧名（兼容输入）`strips/circle/diamond/newsflash/plus/pull/wedge/wheel` 仍被接受，但落地时归一。

### 3.5 实例数据观察 — `exampels/202610131101001/animations.json`

- 20 个 SVG（01_cover.svg … 20_ending.svg），但只有 13 张 slide 配了 animations 覆盖（03/05/06/07/09/10/12/13/15/16/17/18/19）——说明 `animations.json` 是"覆盖式"而非"穷举式"，缺省即默认值（无动画）。
- 用到的三方 effect key 出现频次（实例统计）：
  - `entrance_wipe` ×5, `entrance_fly` ×3, `entrance_zoom` ×3, `entrance_circle` ×4, `entrance_dissolve` ×3, `entrance_rise_up` ×2, `entrance_glide` ×3, `entrance_float` ×2, `entrance_ascend` ×2, `entrance_wheel` ×2, `entrance_wedge` ×2, `entrance_box` ×3, `entrance_expand` ×2, `entrance_stretch` ×2, `entrance_swish` ×2, `entrance_fade` ×2, `entrance_split` ×1
- 所有 instance 都是 entrance + order + duration，无 effects[]，无 trigger_shape，无 trigger 显式设置（即都走默认 `after-previous`）。这是**最简形态**——给 svg2json 的入门目标刚好是"先把这一形态打通"。
- `defaults.animation.duration = 0.45` 秒（450ms），与 PPTist 默认 1000ms 不一致；映射时需要按"每条 row 的 duration 优先"覆盖默认值。

---

## 4. 三方 → PPTist 映射设计

### 4.1 transition 映射（页面切换）

PPTist 只有 12 个 TurningMode，三方有 48 个。映射原则：**保留视觉语义相近的项，其余统一映射到 `fade` 或 `no`**。

| 三方 key | PPTist TurningMode | 备注 |
|---|---|---|
| `fade` | `fade` | 直接对应 |
| `morph` | `fade` | 无对应；最近似 |
| `push` | `slideX` 或 `slideY` | 看 direction；默认 `slideY`（PPTist 默认也是 slideY） |
| `wipe` | `fade` | 无方向擦除；用 fade 兜底 |
| `split` | `scale` | 中央扩散语义 |
| `reveal` | `fade` | 近似 |
| `cut` | `no` | 硬切 |
| `cover` / `uncover` | `slideX` | 单向推入 |
| `flash` | `fade` | 闪烁无对应 |
| `random_bars` / `shape` / `dissolve` / `checkerboard` / `blinds` / `clock` / `ripple` / `honeycomb` / `glitter` / `comb` / `zoom` | `fade` | 全部归 fade |
| `random` | `random` | PPTist 自己会随机展开 |
| 其余 28 个 Exciting + 5 个 Dynamic Content | `fade` | PPTist 完全不支持；保留默认淡入以免丢动画 |

> 可在实现里维护一个 `TRANSITION_MAP: Record<string, TurningMode>` 表，缺省回退 `fade`。也可以激进地把 PPTist 没有的 transition 改成 `no`，由调用方决定。

### 4.2 effect 映射（元素动画）

PPTist 84 个 effect，三方 203 个（含 emphasis/path/exit）。映射原则：**优先按"视觉等价"对齐，不存在则走 fallback**。

#### 4.2.1 entrance_*（53 个）— 唯一实例数据用到的子类

| 三方 effect | PPTist effect | 依据 |
|---|---|---|
| `entrance_fade` | `fadeIn` | 语义相同 |
| `entrance_wipe` | `slideInLeft` 或 `slideInRight`（看 direction）/ `fadeIn`（兜底） | wipe 是"以方向擦入"，最接近 slideIn |
| `entrance_fly` | `lightSpeedInLeft` 或 `lightSpeedInRight` | fly = lightSpeed |
| `entrance_zoom` | `zoomIn` | 直接对应 |
| `entrance_circle` | `rotateIn` | 圆弧进入 |
| `entrance_dissolve` | `fadeIn` | 溶解≈淡入 |
| `entrance_rise_up` | `backInUp` 或 `slideInUp` | 上升进入 |
| `entrance_glide` | `slideInLeft` 或 `slideInRight` | 滑行 |
| `entrance_float` | `backInUp` 或 `bounceInUp` | 浮入 |
| `entrance_ascend` | `backInUp` | 上升 |
| `entrance_wheel` | `rotateIn` | 轮转≈旋转 |
| `entrance_wedge` | `rotateInDownLeft` 或 `rotateInDownRight` | 楔形进入 |
| `entrance_box` | `zoomIn` | 盒子放大进入 |
| `entrance_expand` | `zoomIn` | 扩展≈放大 |
| `entrance_stretch` | `backInLeft` 或 `backInRight` | 拉伸≈放大滑入 |
| `entrance_swish` | `lightSpeedInLeft` 或 `lightSpeedInRight` | 甩入≈飞入 |
| `entrance_split` | `zoomIn` 或 `rotateIn` | 分裂进入 |

> 完整映射表建议维护一个 `ENTRANCE_MAP: Record<string, string>`（key = 三方 key，value = PPTist effect 字符串）。其余未列出的 entrance key 兜底为 `fadeIn`。
>
> 进阶：direction 选项（`from_left / from_right / from_top / from_bottom`）可补 slideIn* / fadeIn* 的方向后缀。

#### 4.2.2 emphasis_*（33 个）→ ATTENTION_ANIMATIONS

三方强调动画无方向性，PPTist `ATTENTION_ANIMATIONS` 也是无方向。粗映射：

| 三方 | PPTist |
|---|---|
| `emphasis_pulse` / `emphasis_beat` | `pulse` |
| `emphasis_flash` | `flash` |
| `emphasis_bounce` / `emphasis_jump` | `bounce` |
| `emphasis_shake` / `emphasis_teeter` | `headShake` 或 `swing` |
| `emphasis_spin` / `emphasis_rotate` | `wobble`（最接近的反复摆动） |
| `emphasis_heartbeat` | `heartBeat` |
| 其它 | `pulse`（兜底） |

#### 4.2.3 path_*（64 个）

PPTist 完全不支持 motion path。可以选三种策略：
1. **弃路径**：丢弃 path_*，仅保留同组 entrance 部分（如果有）；
2. **降级为 entrance**：例如 `path_right` → `slideInLeft`（注意反向）；
3. **保留为空**：留 `slide.animations[]` 不写这条，由调用方感知。

默认建议策略 2（保留动画效果），失败回退策略 1。

#### 4.2.4 exit_*（53 个）

与 entrance 对称映射：`bounceOut / fadeOut* / slideOut* / backOut* / zoomOut* / lightSpeedOut* / rotateOut* / flipOut*`。三方实例数据未用到，暂用对称名兜底。

### 4.3 order / trigger 映射（关键）

PPTist 用 trigger 表达"与上一组同时/上一组之后"，**完全不使用 order 字段**。映射方法：

```
对 groups[gid] 的 effects[] 按 order 升序遍历，相邻两条计算"播放关系"：
  - 同 order（如 order 全是 1 时三方把多条并行播）       → PPTist trigger='meantime'
  - 严格升序（2,3,4...），且未显式 trigger='with-previous' → PPTist trigger='auto'
  - 显式 trigger='on-click'                              → PPTist trigger='click'
  - 显式 trigger='with-previous'                         → PPTist trigger='meantime'
  - 显式 trigger='after-previous'（默认）                 → PPTist trigger='auto'
  - 显式 trigger_shape（点击其它元素）                    → PPTist trigger='click'（降级）
```

注意 PPTist store.formatedAnimations 的折叠规则：
- `trigger='click'` 必新开一组。
- `trigger='meantime'` 合并到上一组，去重同 elId。
- `trigger='auto'` 标记上一组 autoNext=true，再开新组。

所以 trigger='auto' 必须出现在"会形成 autoNext 上一组"的位置才有意义——单独一条 auto 等价于 click（不自动播下一条）。三方 `after-previous` 默认就是这种"等待上一条播完再播"的行为，与 PPTist `auto` 一致。

### 4.4 duration 单位

```
PPTist duration = Math.round(threeSide_duration * 1000)
```

实例 `0.45s → 450ms`、`0.59s → 590ms`，都在 PPTist 推荐区间（100-5000ms）。

### 4.5 PPTAnimation id 与 elId

- `id`：nanoid(10) 即可，SVG 转换器已有 uuidv4；保持 nanoid(10) 与 PPTist 编辑面板一致便于 diff。
- `elId`：必须命中 SVG→PPTElement 转换后某个 PPTElement.id。**关键决策点**：`animations.json` 的 `groups[gid]` 是按 SVG `<g id="gid">` 锚定的——同一个 g 下面可能被 path-merge 合并成 1 个 PPTShapeElement；那么这条动画应该挂到合并后的那个 PPTElement（而不是分别挂到每条 path）。
  - transformer 当前已经写 `PPTElement.groupId` 字段，因此"通过 groupId 找元素"的链路是通的。
  - 若 g 下面产生多个 PPTElement（未合并），需要选一个挂动画——目前最简单的策略是"挂到第一个匹配的 PPTElement"，可在 UI 后续允许"展开合并"做精细化。

### 4.6 不可映射字段的处理

| 三方字段 | PPTist 处理 |
|---|---|
| `delay` | PPTist 无 per-animation delay；丢弃（或在 effect 选择上补偿） |
| `effect_options`（direction / amount / color / font_name / relative / size） | 部分可通过选择不同 effect 实现（如 direction 决定 slideInLeft/Right）；其余丢弃 |
| `trigger_shape` | 降级为 `click` |
| `repeat_count` / `repeat_duration` / `auto_reverse` / `rewind` / `accelerate` / `decelerate` / `bounce_end` / `restart` | 丢弃 |
| `after_effect`（none / dim / hide / hide on next click） | 丢弃 |
| `sound` | PPTist 不支持；丢弃 |

> 实现时建议把"被丢弃的字段"集中记录到一个 `ConvertReport` 对象里返回，方便调用方知晓哪些能力没生效。

---

## 5. svg2json 端实现要点（设计而非代码）

### 5.1 CLI 改动

```
svg2json <input.svg|dir> [--animations <animations.json>] [--out <path>]
```

- 单文件输入：可选 `--animations`；若指定则按同名 slide_id 解析（约定：SVG 文件名去后缀 = slide_id，例如 `03_overview.svg` 对应 animations.json key `03_overview`）。
- 目录输入：扫描 `*.svg`，每个生成一张 slide；若同目录存在 `animations.json`，按文件名为 slide_id 匹配。

### 5.2 顶层 `convert()` 改造

```ts
export async function convert(
  svgContent: string,
  options?: ConvertOptions & {
    animations?: AnimationsSidecar | AnimationsSidecarEntry   // 单条 / 多条
    slideId?: string                                          // 用于匹配 groups
  }
): Promise<ConvertResult & { slide: Slide }>
```

并新增一个批量入口 `convertDir(dir, opts)`，遍历 SVG → 调用 `convert()` → 组装 `slides[]`：

```ts
{
  title, width, height, theme,
  slides: [...]
}
```

### 5.3 注入动画的代码位置

最自然的位置在 `src/index.ts` 的 `convert()` 末尾，elements 生成后：

```ts
// 已有 elements: PPTElement[]，其中每个都有 groupId
const slide: Slide = { id: uuidv4(), elements, ... }

// 新增：根据 slideId + animations sidecar + groupId 生成 PPTAnimation[]
if (options?.animations && options?.slideId) {
  slide.animations = buildAnimations({
    elements,
    entry: pickEntry(options.animations, options.slideId, options.defaults),
    mapper: EFFECT_MAPPER,            // §4.2/4.3 映射表
  })
}

// 新增：根据 entry.transition 设置 turningMode
if (entry?.transition) {
  slide.turningMode = mapTransition(entry.transition.effect)
}
```

`buildAnimations` 函数要点：
1. 对每个 `groups[gid]`，遍历 elements 找到 `el.groupId === gid` 的，**只取第一个**（或全取，标注 elId）作为挂载点。
2. 遍历 `effects[]`（或把单 `effect` 提升为单元素数组），按 §4.3 计算 trigger。
3. 用映射表得到 `{ effect, type, duration(ms), trigger }`，拼 `id: nanoid(10)`、`elId`。
4. 把"被丢弃"的字段写入 `ConvertReport.unmapped`。

### 5.4 映射表位置

建议放在 `src/mappers/animation.ts`：

```ts
export const ENTRANCE_MAP: Record<string, string>  // ~30 项（覆盖实例 + 常见）
export const EMPHASIS_MAP: Record<string, string>
export const EXIT_MAP:     Record<string, string>
export const TRANSITION_MAP: Record<string, TurningMode>
export function mapEffect(threeSideKey: string): { effect: string; type: animationType } | null
export function mapTrigger(threeSideTrigger?: string): AnimationTrigger
```

### 5.5 `Slide.animations` 的可空性

animations.json 实例里 slide_id 不是穷举——大部分 slide 没有 entry。**没有 entry 不代表没有动画，是用 defaults**。设计时要确认：
- `defaults.animation` 影响所有有 animations 配置的 slide；
- 没有 entry 的 slide 不生成 `slide.animations`（让 PPTist 走默认无动画）。

### 5.6 与 PPTist 默认动画的协调

PPTist 单个 slide 没有 entry 时不挂动画——这与 PPT-master 的"默认 none"是一致的。但如果 `defaults.animation` 存在且有内容建议在实现里"显式声明默认动效"——例如 `defaults.animation.duration = 0.45`，按 §4.3 期望落到 `auto` trigger。

---

## 6. 测试验证

### 6.1 单元测试（vitest）

- `mapper/animation.test.ts`：
  - 所有 §4.2 表里的三方 key 都能正确映射到 PPTist effect；
  - 未列出的三方 key 兜底到 `fadeIn`/`pulse`/...；
  - trigger 映射三方向 PPTist 单向；
  - duration 秒→毫秒（0.45 → 450）。
- `convert/animation.test.ts`：模拟 `animations.json` + SVG（含 `<g id="card-temperature">`），断言生成 slide.animations 数组。
- `transition.test.ts`：48 个三方 transition key 都得到合法 TurningMode。

### 6.2 端到端

- 用 `exampels/202610131101001/` 跑一遍，把生成的 PPTist JSON 喂给一个临时 PPTist 预览页（用 SVG/iframe 模拟），断言：
  - 13 张有 animation 的 slide 的 `slide.animations.length` 与 groups 数量一致；
  - 每条动画 `elId` 在 `slide.elements` 中能找到；
  - 每条动画 `effect` ∈ PPTist 84 个 effect 之一；
  - `duration` 全部在 100-5000ms 区间。

### 6.3 视觉回归

PPTist 的预览由 animate.css 驱动——可在 Playwright/headless 浏览器中截图入场动画前后对照（无需逐条断言动画曲线），作为冒烟测试。

---

## 7. 风险与未决项

| 风险 | 缓解 |
|---|---|
| 84 vs 203 的语义鸿沟，很多三方 effect 无 1:1 对应 | 维护兜底映射（fadeIn / pulse / bounce），并把"被丢弃的能力"写入 ConvertReport |
| `trigger_shape`（点击其它元素触发）PPTist 无对应 | 降级为 `click`，报告里标注 |
| `delay / accelerate / decelerate / repeat_* / after_effect` PPTist 全无对应 | 报告里标注丢弃，调用方决定是否后续补 |
| SVG `<g id>` 在 path-merge 后只剩 1 个 PPTElement，elId 选择策略未确定 | 当前选第一个；保留 groupId 字段便于 PPTist 端"展开" |
| sound 字段 | PPTist 不支持；丢弃（与三方 sound 库无关） |
| `random_bars / shape / honeycomb / ...` 等 30+ transition | 全部归 fade；若调用方在意可加 `TRANSITION_MAP_FALLBACK` 配置 |
| `defaults` 中 `animation.duration = 0.45s` 与 PPTist 默认 1000ms 偏离 | 按每行 duration 优先；缺省 0.45s→450ms，与 PPTist UI 默认共存无冲突 |

---

## 8. 相关文件速查

```
E:\git\svg2json\src\slides.ts                    L670-695, L723, L773-774
E:\git\svg2json\src\index.ts                     L154-242（convert 主流程）
E:\git\svg2json\src\cli.ts                       L67-128（main）
E:\git\svg2json\src\transformer\transform-to-pptel.ts  groupId 写入位置（L1880-1882, L1101-1103）

E:\git\svg2json\code\PPTist\src\types\slides.ts            688-695, 723, 767-777
E:\git\svg2json\code\PPTist\src\configs\animation.ts       ENTER/EXIT/ATTENTION/SLIDE_ANIMATIONS 全表
E:\git\svg2json\code\PPTist\src\store\slides.ts            L84-111 formatedAnimations
E:\git\svg2json\code\PPTist\src\views\Screen\hooks\useExecPlay.ts            L58-106 runAnimation
E:\git\svg2json\code\PPTist\src\views\Screen\hooks\useSlidesWithTurningMode.ts
E:\git\svg2json\code\PPTist\src\views\Toolbar\ElementAnimationPanel.vue  完整编辑面板
E:\git\svg2json\code\PPTist\src\views\Editor\Toolbar\SlideAnimationPanel.vue
E:\git\svg2json\code\PPTist\src\views\Editor\Canvas\ElementFloatLayer\AnimationIndex.vue

E:\git\ppt-master\docs\animations.md             L1-280 全规则
E:\git\svg2json\exampels\202610131101001\animations.json  实例 13 张 slide 覆盖
```

---

> **下一步**：在确认这份映射思路后，可以拆成两个独立 PR：
> 1. `feat(convert): 支持目录多 slide 输出`（先解决 §2.2 的输入缺口）；
> 2. `feat(convert): 读取 animations.json 并注入到 slide.animations[] + slide.turningMode`（核心映射逻辑）。
>
> 测试样例优先用 `exampels/202610131101001/` 跑端到端，把 13 张覆盖 slide 的动画注入结果作为可执行规约。如需要，我可以接着把这份分析拆成 SPEC.md + 阶段计划（按 gsd-spec-phase / gsd-plan-phase 走）。
