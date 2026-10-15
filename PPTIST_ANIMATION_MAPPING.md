# PPTist 动画 — 三方效果映射关系

> 把 `ELEMENT_ANIMATIONS.md` 中的 **232 个动画输入键**(203 规范 + 29 legacy) 投影到 PPTist 的 **84 个 element effect + 12 个页面 TurningMode** 真值表上,并把无法表达的字段处置方式集中记录。
>
> 实现源:`E:\git\svg2json\src\mappers\animation.ts`(ENTrANCE_MAP / EMPHASIS_MAP / EXIT_MAP / TRANSITION_MAP / mapEffect / mapTrigger / mapDuration / mapTransition)。
>
> 真值表源:`E:\git\svg2json\code\PPTist\src\configs\animation.ts`(ENTER_ANIMATIONS / EXIT_ANIMATIONS / ATTENTION_ANIMATIONS / SLIDE_ANIMATIONS)。
>
> 类型源:`E:\git\svg2json\code\PPTist\src\types\slides.ts` `AnimationType` / `AnimationTrigger` / `TurningMode` / `PPTAnimation`(688-705)。

---

## 1. 摘要

| 维度 | 三方(ELEMENT_ANIMATIONS.md) | PPTist(configs/animation.ts) | 比例 |
|---|---|---|---|
| 入场 effect | 53 个 `entrance_*` | 36 个(`bounce`×5 + `fade`×13 + `rotate`×5 + `zoom`×5 + `slide`×4 + `flip`×2 + `back`×4 + `lightSpeed`×2) | **53 → 36**,多对一聚类 |
| 退场 effect | 53 个 `exit_*` | 36 个(与入场对称) | **53 → 36** |
| 强调 effect | 33 个 `emphasis_*` | 12 个(`shake` 家族 ×7 + 其它 ×5) | **33 → 12**,多数降级到 `pulse` / `flash` / `wobble` |
| Motion path | 64 个 `path_*` | **不支持**(0) | **64 → 0**,全部走 entrance 降级或丢弃 |
| 页面 transition | 48 个 canonical + 部分 legacy | 12 个 `TurningMode` | **48 → 12**,主保留 `fade / slideX / slideY / scale / rotate / random / no` |
| 触发 trigger | 3 个(`on-click` / `with-previous` / `after-previous`) | 3 个(`click` / `meantime` / `auto`) | 3 → 3 名义转换 |
| duration 单位 | 秒(浮点) | 毫秒(整数) | `× 1000` 并 clamp `[100, 5000]` |
| type 字段 | 隐式(键名前缀) | 显式 `in` / `out` / `attention` | 前缀推断,见 §7 |

未在表中列出的三方键(`path_*` 多样 + 极少用 entrance 变体)统一回退 `EFFECT_FALLBACK[inferredType]`,并写入 `extensions.originalEffect` 保留 provenance。三方无法表达的字段(见 §8)全部进 `PPTAnimation.extensions`,可读不消耗。

---

## 2. PPTist 动画真值表(白名单)

PPTist 实际可消费的 effect 值只有下面 84 个字符串之一(以 `ANIMATION_CLASS_PREFIX = 'animate__'` 拼成 `animate__animated animate__<effect>` 注入 DOM)。其它字符串写入 `slide.animations[]` 不会播放。

### 2.1 ENTER_ANIMATIONS — 入场 36

| 大类 | count | effect 字符串(英) → PPTist 中文标签 |
|---|---:|---|
| `bounce` 弹跳 | 5 | `bounceIn` · `bounceInLeft` · `bounceInRight` · `bounceInUp` · `bounceInDown` |
| `fade` 浮现 | 13 | `fadeIn` · `fadeInDown` · `fadeInDownBig` · `fadeInLeft` · `fadeInLeftBig` · `fadeInRight` · `fadeInRightBig` · `fadeInUp` · `fadeInUpBig` · `fadeInTopLeft` · `fadeInTopRight` · `fadeInBottomLeft` · `fadeInBottomRight` |
| `rotate` 旋转 | 5 | `rotateIn` · `rotateInDownLeft` · `rotateInDownRight` · `rotateInUpLeft` · `rotateInUpRight` |
| `zoom` 缩放 | 5 | `zoomIn` · `zoomInDown` · `zoomInLeft` · `zoomInRight` · `zoomInUp` |
| `slide` 滑入 | 4 | `slideInDown` · `slideInLeft` · `slideInRight` · `slideInUp` |
| `flip` 翻转 | 2 | `flipInX` · `flipInY` |
| `back` 放大滑入 | 4 | `backInDown` · `backInLeft` · `backInRight` · `backInUp` |
| `lightSpeed` 飞入 | 2 | `lightSpeedInRight` · `lightSpeedInLeft` |

### 2.2 EXIT_ANIMATIONS — 退场 36

与入场 1:1 对称(`*In*` → `*Out*`),同样 36 个,例如 `fadeOut` / `bounceOutDown` / `slideOutLeft` / `backOutUp` / `lightSpeedOutRight` / `rotateOutDownLeft` / `zoomOutDown` / `flipOutX`。

### 2.3 ATTENTION_ANIMATIONS — 强调 12

| 大类 | count | effect 字符串 |
|---|---:|---|
| `shake` 晃动 | 7 | `shakeX` · `shakeY` · `headShake` · `swing` · `wobble` · `tada` · `jello` |
| `other` 其它 | 5 | `bounce` · `flash` · `pulse` · `rubberBand` · `heartBeat` |

### 2.4 SLIDE_ANIMATIONS(TurningMode)— 页面切换 12

枚举源:`TurningMode = 'no' | 'fade' | 'slideX' | 'slideY' | 'random' | 'slideX3D' | 'slideY3D' | 'rotate' | 'scaleY' | 'scaleX' | 'scale' | 'scaleReverse'`。`random` 在 PPTist 端由 `useSlidesWithTurningMode.ts` 运行时展开成其它非 `no/random` 值之一。

### 2.5 三个 `AnimationType` 与 5 个字段

```ts
AnimationType   = 'in' | 'out' | 'attention'
AnimationTrigger= 'click' | 'meantime' | 'auto'

interface PPTAnimation {
  id: string          // nanoid(10) 生成
  elId: string        // 关联 PPTElement.id
  effect: string      // ★ 必须在上表 84 个里
  type: AnimationType // ★ 入/退/强调
  duration: number    // 100-5000 ms
  trigger: AnimationTrigger
  extensions?: Record<string, any>  // ★ 兜底字段装载点
}
```

---

## 3. 三方 232 输入总览

### 3.1 entrance(53)+ exit(53)+ emphasis(33)+ path(64)= 203 规范键
来源:`ELEMENT_ANIMATIONS.md §4.6`。所有键落地时归类到 4 个前缀:

| 前缀 | inferredType | PPTist 域 | 表位置 |
|---|---|---|---|
| `entrance_*` | `in` | `ENTER_ANIMATIONS` | §4 |
| `exit_*` | `out` | `EXIT_ANIMATIONS` | §5 |
| `emphasis_*` | `attention` | `ATTENTION_ANIMATIONS` | §6 |
| `path_*` | `in`(`inferAnimationType` 把 path 也归入,因为 PPTist 无 motion path) | 降级进 §4 默认 | §4 末尾 + §9 |

### 3.2 29 个 legacy 兼容输入名
`ELEMENT_ANIMATIONS.md §4.7`。在 svg2json 端:`NormalizedAnimation` 阶段把所有 legacy 名归一到 203 规范键后,再走下方映射。**本文档不列 legacy,实现侧在 `animation-types.ts` 的 zod schema 之前已完成归一。**

### 3.3 页面 transition(48 canonical)+ 12 legacy
`ELEMENT_ANIMATIONS.md §3.4`。legacy(strips / circle / diamond / newsflash / plus / pull / wedge / wheel 等)进入 TRANSITION_MAP 之前先归一为 canonical。

---

## 4. ENTRANCE_MAP — 53 个三方入场键 → 36 个 PPTist 入场 effect

> 源:`src/mappers/animation.ts` `ENTRANCE_MAP`。
> 未列出的三方 entrance 键回退 `fadeIn`,`extensions.originalEffect` 留原始键。

| # | 三方键 | PPTist effect | 归类家族 | 备注 |
|---:|---|---|---|---|
| 1 | `entrance_appear` | `fadeIn` | fade | 视觉等价 |
| 2 | `entrance_fade` | `fadeIn` | fade | 视觉等价 |
| 3 | `entrance_zoom` | `zoomIn` | zoom | 直接对应 |
| 4 | `entrance_bounce` | `bounceIn` | bounce | 直接对应 |
| 5 | `entrance_flip` | `flipInX` | flip | 选 X 轴 |
| 6 | `entrance_fly` | `lightSpeedInLeft` | lightSpeed | direction 默认 Left |
| 7 | `entrance_wipe` | `fadeIn` | fade | wipe 无方向擦除近似 fade |
| 8 | `entrance_glide` | `slideInLeft` | slide | 滑行近似从左滑入 |
| 9 | `entrance_circle` | `rotateIn` | rotate | 圆弧进入走旋转 |
| 10 | `entrance_wheel` | `rotateIn` | rotate | 轮转走旋转 |
| 11 | `entrance_wedge` | `rotateInDownLeft` | rotate | 楔形用左下旋入 |
| 12 | `entrance_spiral` | `rotateIn` | rotate | 螺旋走旋转 |
| 13 | `entrance_pinwheel` | `rotateIn` | rotate | 旋转风车 |
| 14 | `entrance_swivel` | `rotateIn` | rotate | 旋转 |
| 15 | `entrance_spinner` | `rotateIn` | rotate | 旋转 |
| 16 | `entrance_center_revolve` | `rotateIn` | rotate | 中心旋转 |
| 17 | `entrance_faded_swivel` | `rotateIn` | rotate | 旋转 |
| 18 | `entrance_grow_and_turn` | `rotateIn` | rotate | 旋转 |
| 19 | `entrance_box` | `zoomIn` | zoom | 盒子放大 |
| 20 | `entrance_diamond` | `rotateIn` | rotate | 菱形走旋转 |
| 21 | `entrance_plus` | `zoomIn` | zoom | 加号走放大 |
| 22 | `entrance_split` | `zoomIn` | zoom | 分裂走放大 |
| 23 | `entrance_expand` | `zoomIn` | zoom | 扩展走放大 |
| 24 | `entrance_fold` | `zoomIn` | zoom | 折叠走放大 |
| 25 | `entrance_faded_zoom` | `zoomIn` | zoom | 放大 |
| 26 | `entrance_blinds` | `fadeIn` | fade | 百叶近似 fade |
| 27 | `entrance_checkerboard` | `fadeIn` | fade | 棋盘近似 fade |
| 28 | `entrance_dissolve` | `fadeIn` | fade | 溶解≈淡入 |
| 29 | `entrance_random_bars` | `fadeIn` | fade | 随机条近似 fade |
| 30 | `entrance_strips` | `slideInLeft` | slide | 条纹走滑入 |
| 31 | `entrance_random_effects` | `fadeIn` | fade | 默认 fade |
| 32 | `entrance_color_reveal` | `fadeIn` | fade | 颜色揭露近似 |
| 33 | `entrance_thin_line` | `fadeIn` | fade | 细线近似 fade |
| 34 | `entrance_credits` | `slideInUp` | slide | 字幕式向上滑入 |
| 35 | `entrance_ease_in` | `fadeIn` | fade | 缓入近似 fade |
| 36 | `entrance_flash_once` | `fadeIn` | fade | 闪一次近似 fade |
| 37 | `entrance_rise_up` | `backInUp` | back | 上升走放大滑入 |
| 38 | `entrance_ascend` | `backInUp` | back | 上升 |
| 39 | `entrance_descend` | `backInDown` | back | 下降 |
| 40 | `entrance_float` | `backInUp` | back | 浮入 |
| 41 | `entrance_arc_up` | `backInUp` | back | 弧上升 |
| 42 | `entrance_crawl` | `slideInUp` | slide | 爬入近似向上滑入 |
| 43 | `entrance_peek` | `slideInUp` | slide | 探入近似向上滑入 |
| 44 | `entrance_whip` | `lightSpeedInLeft` | lightSpeed | 鞭入近似飞入 |
| 45 | `entrance_swish` | `lightSpeedInLeft` | lightSpeed | 甩入近似飞入 |
| 46 | `entrance_light_speed` | `lightSpeedInLeft` | lightSpeed | 直接对应 |
| 47 | `entrance_zip` | `lightSpeedInLeft` | lightSpeed | 拉链近似飞入 |
| 48 | `entrance_sling` | `backInLeft` | back | 投掷走左放大滑入 |
| 49 | `entrance_boomerang` | `backInUp` | back | 回旋镖近似向上放大滑入 |
| 50 | `entrance_unfold` | `backInUp` | back | 展开近似向上放大滑入 |
| 51 | `entrance_stretchy` | `backInUp` | back | 弹性拉伸近似向上放大滑入 |
| 52 | `entrance_stretch` | `backInLeft` | back | 拉伸走左放大滑入 |
| 53 | `entrance_3d_arrive` | `zoomIn` | zoom | 3D 无对应,降级 zoomIn |

**PPTist 入场效果未覆盖到的三方键**:三方独有但 PPTist 没有的 `bounceInLeft` / `bounceInRight` / `zoomInDown` / `slideInDown` 等"方向变体"——需要在 v2 中按 `effect_options.direction` 选择具体方向。当前 v1 一律用 Left 系默认值。

**path_* 入口(64 个)**:全部走 `inferAnimationType → 'in'`,`mapEffect` 在 ENTRANCE_MAP 查不到,统一回退 `fadeIn`。详见 §9。

---

## 5. EXIT_MAP — 53 个三方退场键 → 36 个 PPTist 退场 effect

> 与 §4 完全对称(`*In*` ↔ `*Out*`),`fadeIn` ↔ `fadeOut`、`zoomIn` ↔ `zoomOut`、`slideInLeft` ↔ `slideOutLeft`、`backInUp` ↔ `backOutUp`、`lightSpeedInLeft` ↔ `lightSpeedOutLeft`、`rotateInDownLeft` ↔ `rotateOutDownLeft`、`flipInX` ↔ `flipOutX`、`bounceIn` ↔ `bounceOut` 等。

| # | 三方键 | PPTist effect | 备注 |
|---:|---|---|---|
| 1 | `exit_appear` | `fadeOut` | 视觉等价 |
| 2 | `exit_fade` | `fadeOut` | 视觉等价 |
| 3 | `exit_zoom` | `zoomOut` | 直接对应 |
| 4 | `exit_bounce` | `bounceOut` | 直接对应 |
| 5 | `exit_flip` | `flipOutX` | 选 X 轴 |
| 6 | `exit_fly` | `lightSpeedOutLeft` | direction 默认 Left |
| 7 | `exit_wipe` | `fadeOut` | 兜底 |
| 8 | `exit_glide` | `slideOutLeft` | 滑出走从左滑出 |
| 9 | `exit_circle` | `rotateOut` | 旋转退出 |
| 10 | `exit_wheel` | `rotateOut` | 旋转退出 |
| 11 | `exit_wedge` | `rotateOutDownLeft` | 左下旋出 |
| 12-18 | `exit_spiral` / `pinwheel` / `swivel` / `spinner` / `center_revolve` / `faded_swivel` / `grow_and_turn` | `rotateOut` | 全归旋转 |
| 19 | `exit_box` | `zoomOut` | 盒子缩小退出 |
| 20 | `exit_diamond` | `rotateOut` | 菱形 |
| 21-25 | `exit_plus` / `split` / `expand` / `fold` / `faded_zoom` | `zoomOut` | 全归缩放 |
| 26-30 | `exit_blinds` / `checkerboard` / `dissolve` / `random_bars` / `random_effects` | `fadeOut` | 全部 fade 兜底 |
| 31 | `exit_strips` | `slideOutLeft` | 条纹走左滑出 |
| 32-36 | `exit_color_reveal` / `thin_line` / `ease_in` / `flash_once` | `fadeOut` | fade 兜底 |
| 37 | `exit_credits` | `slideOutDown` | 字幕式向下滑出 |
| 38-41 | `exit_rise_up` / `ascend` / `float` / `arc_up` | `backOutUp` | 上升退出 |
| 42 | `exit_descend` | `backOutDown` | 下降退出 |
| 43-44 | `exit_crawl` / `peek` | `slideOutDown` | 向下退出 |
| 45-48 | `exit_whip` / `swish` / `light_speed` / `zip` | `lightSpeedOutLeft` | 飞出 |
| 49-52 | `exit_sling` / `stretch` | `backOutLeft` | 左缩小滑出 |
| 53 | `exit_unfold` / `stretchy` / `boomerang` | `backOutUp` | 向上缩小滑出 |
| 54 | `exit_3d_arrive` | `zoomOut` | 3D 降级 |

未列出三方 exit 键回退 `fadeOut`。

---

## 6. EMPHASIS_MAP — 33 个三方强调键 → 12 个 PPTist 强调 effect

> 源:`src/mappers/animation.ts` `EMPHASIS_MAP`。
> PPTist 强调动画仅 12 个,无方向性,语义重叠严重。多数三方 emphasis 统一回退到 `pulse`(脉搏)以体现"持续节奏变化"。

| # | 三方键 | PPTist effect | 归类 |
|---:|---|---|---|
| 1 | `emphasis_shimmer` | `wobble` | 摇动 |
| 2 | `emphasis_change_fill_color` | `pulse` | 颜色变→脉搏 |
| 3 | `emphasis_change_font` | `pulse` | 字体变→脉搏 |
| 4 | `emphasis_change_font_color` | `pulse` | 字色变→脉搏 |
| 5 | `emphasis_change_font_size` | `pulse` | 字号变→脉搏 |
| 6 | `emphasis_change_font_style` | `pulse` | 字样式变→脉搏 |
| 7 | `emphasis_change_line_color` | `pulse` | 线色变→脉搏 |
| 8 | `emphasis_grow_shrink` | `bounce` | 缩放走弹跳 |
| 9 | `emphasis_spin` | `wobble` | 旋转走摆动 |
| 10 | `emphasis_transparency` | `flash` | 透明度走闪烁 |
| 11 | `emphasis_bold_flash` | `flash` | 闪烁 |
| 12 | `emphasis_blast` | `wobble` | 爆裂走摆动 |
| 13 | `emphasis_bold_reveal` | `pulse` | 字体强调 |
| 14 | `emphasis_brush_on_color` | `pulse` | 笔刷色 |
| 15 | `emphasis_brush_on_underline` | `pulse` | 笔刷下划线 |
| 16 | `emphasis_color_blend` | `pulse` | 色混合 |
| 17 | `emphasis_color_wave` | `pulse` | 色波 |
| 18 | `emphasis_complementary_color` | `pulse` | 互补色 |
| 19 | `emphasis_complementary_color2` | `pulse` | 互补色 |
| 20 | `emphasis_contrasting_color` | `pulse` | 对比色 |
| 21 | `emphasis_darken` | `pulse` | 变暗 |
| 22 | `emphasis_desaturate` | `pulse` | 去饱和 |
| 23 | `emphasis_flash_bulb` | `flash` | 闪光 |
| 24 | `emphasis_flicker` | `flash` | 闪烁 |
| 25 | `emphasis_grow_with_color` | `pulse` | 放大变色 |
| 26 | `emphasis_lighten` | `pulse` | 变亮 |
| 27 | `emphasis_style_emphasis` | `pulse` | 样式强调 |
| 28 | `emphasis_teeter` | `headShake` | 摇晃走摇头 |
| 29 | `emphasis_vertical_grow` | `bounce` | 垂直缩放 |
| 30 | `emphasis_wave` | `swing` | 波动走摆动 |
| 31 | `emphasis_3d_turntable` | `wobble` | 3D 转台走摆动 |
| 32 | `emphasis_3d_swing` | `swing` | 3D 摆动 |
| 33 | `emphasis_3d_jump_and_turn` | `tada` | 3D 跳+转走惊恐 |

**统计**:9 个走 `pulse`(全部"颜色/字体/样式"家族),4 个走 `flash`,3 个走 `wobble`,各 2 个走 `swing` / `headShake`,各 1 个走 `bounce` / `tada`。剩余 12 个 PPTist 强调效果(`shakeX` / `shakeY` / `jello` / `rubberBand` / `heartBeat`)在 v1 没有命中,留待 v2 把"语义匹配"做得更细时启用。

未列出三方 emphasis 键回退 `pulse`(per `EFFECT_FALLBACK.attention`)。

---

## 7. TRANSITION_MAP — 48 个三方 transition 键 → 12 个 TurningMode

> 源:`src/mappers/animation.ts` `TRANSITION_MAP`。`cut → no`、`fade → fade`、`push → slideY`、`split → scale`、`cover/uncover → slideX`、`rotate → rotate`、`random → random`(透传,PPTist 运行时展开)。其余 36 个全部归 `fade`(兜底)。

| 三方 key | PPTist TurningMode | 视觉含义 |
|---|---|---|
| `fade` | `fade` | 淡入淡出 |
| `morph` | `fade` | PPTist 无 Morph;最近似 fade |
| `push` | `slideY` | 上下推移 |
| `wipe` | `fade` | 擦除近似 fade |
| `split` | `scale` | 中央扩散近似放大 |
| `reveal` | `fade` | 揭露近似 fade |
| `cut` | `no` | 硬切 |
| `cover` | `slideX` | 单向推入 |
| `uncover` | `slideX` | 单向推入(对称) |
| `flash` | `fade` | 闪烁无对应 |
| `random_bars` / `shape` / `dissolve` / `checkerboard` / `blinds` / `clock` / `ripple` / `honeycomb` / `glitter` / `comb` / `zoom` | `fade` | 全部归 fade |
| `random` | `random` | 透传,运行时由 PPTist 展开 |
| `rotate` | `rotate` | 旋转 |
| `pan` / `ferris_wheel` / `conveyor` / `window` / `orbit` / `fly_through` | `fade` | 5 个 Dynamic Content 全部归 fade |
| `fall_over` / `drape` / `curtains` / `wind` / `prestige` / `fracture` / `crush` / `peel_off` / `page_curl` / `airplane` / `origami` / `vortex` / `shred` / `switch` / `flip` / `gallery` / `cube` / `doors` | `fade` | 18 个 Exciting 全部归 fade |

**未列出的三方 transition 键**:`mapTransition` 默认回退 `fade`。

**统计**:12/48 直接对应或等价(`fade / morph / wipe / reveal / flash / random_bars / ...` 走 fade);1 对 0(`cut → no`);1 对 0(`random → random` 透传);其余全部 `fade` 兜底。

---

## 8. trigger / type / duration / effect_options 转换

### 8.1 `type` — 键前缀推断(`inferAnimationType`)

```ts
function inferAnimationType(key) {
  if (key.startsWith('entrance_') || key.startsWith('path_')) return 'in'
  if (key.startsWith('emphasis_'))                            return 'attention'
  if (key.startsWith('exit_'))                                 return 'out'
  return 'in'   // 兜底
}
```

三方没有显式 `type` 字段,前缀即类型。`path_*` 视作 `in`(PPTist 不支持 motion path,详见 §9)。

### 8.2 `trigger` 转换(`mapTrigger`)

| 三方 trigger | PPTist trigger | 依据 |
|---|---|---|
| `on-click` | `click` | 单击时 |
| `with-previous` | `meantime` | 与上一动画同时 |
| `after-previous`(默认) | `auto` | 上一动画之后 |
| 未显式 + 同 order | `meantime` | 派生:同 order ⇒ 并行 |
| 未显式 + order 升序 | `auto` | 派生:严格升序 ⇒ 等上一条 |
| 未显式 + 无前序 | `auto` | 兜底 |
| `trigger_shape = "x"`(三方才有的"点击 x 元素触发本条") | `click` | 降级为 click,原始键写 `extensions.originalTriggerShape` |

PPTist 折叠规则(`store/slides.ts` `formatedAnimations`):`click` 必新开组,`meantime` 合并到上一组(去重同 elId),`auto` 标记上一组 `autoNext=true` 再开新组。**因此单条 `auto` 等价 `click`**(无 autoNext 上下文)——这与三方的"等上一条播完"语义一致,默认就能播完。

### 8.3 `duration` 秒 → 毫秒(`mapDuration`)

```ts
function mapDuration(threeSideDuration, defaultSeconds = 0.45) {
  const seconds = threeSideDuration ?? defaultSeconds
  const ms = Math.round(seconds * 1000)
  return Math.min(5000, Math.max(100, ms))
}
```

| 三方值 | 落点 PPTist(ms) | 备注 |
|---|---|---|
| `0.45`(默认) | 450 | 落在 PPTist 推荐区间正中 |
| `0.25` | 250 | 最短推荐 |
| `0.7` | 700 | |
| `0.05` | 100 | clamp 下限 |
| `10` | 5000 | clamp 上限 |
| 缺省(undefined) | 450 | 实例 `defaults.animation.duration = 0.45` |

### 8.4 `effect_options` — 部分字段按需方向选择

三方 effect_options 22 个 direction + 4 个 `amount` + 1 个 `size` + 1 个 `relative` + `font_name` + `color`:

| 子字段 | v1 处理 | 备注 |
|---|---|---|
| `direction` | **写 `extensions.effectOptions.direction`**,不参与 effect 选择 | v2 再按 direction 切 `slideInLeft/Right/Up/Down` 等具体方向变体 |
| `amount`(`emphasis_spin` 度数 / `emphasis_transparency` 比率 / `entrance_wheel` 辐条) | 写 `extensions.effectOptions.amount` | PPTist 不接受数值 |
| `size`(`emphasis_grow_shrink` 默认 100) | 写 `extensions.effectOptions.size` | |
| `relative`(`path_*`) | 写 `extensions.effectOptions.relative` | PPTist 不接受 motion path,字段留作记录 |
| `font_name`(`emphasis_change_font`) | 写 `extensions.effectOptions.fontName` | |
| `color`(`emphasis_change_*_color` / `after_effect.dim`) | 写 `extensions.effectOptions.color` | |
| 三方其它未列参数 | 全写 `extensions` | 透明保留 |

### 8.5 不支持的三方字段(全部进 `PPTAnimation.extensions`)

| 字段 | 来源 | 处置 |
|---|---|---|
| `effect_options` | §3 详 | 完整保留,见 §8.4 |
| `delay` | 启动前置停顿 | 丢弃;可在 effect 时长里补偿 |
| `trigger_shape` | 点击其它元素 | 降级 `click`,原始键入 `extensions.triggerShape` |
| `repeat_count` / `repeat_duration` | 重复次数 / 总时长 | 丢弃,写 `extensions.repeat*` |
| `auto_reverse` / `rewind` | 反向 / 还原 | 丢弃,写 `extensions.autoReverse / rewind` |
| `accelerate` / `decelerate` / `bounce_end` | 加减速 / 弹跳结尾 | 丢弃,写 `extensions.*` |
| `restart` | always/when-not-active/never | 丢弃,写 `extensions.restart` |
| `after_effect` | none/dim/hide/hide-on-next-click | 丢弃,写 `extensions.afterEffect` |
| `sound` | .wav/.m4a/.mp3 路径 | 丢弃,写 `extensions.sound` |
| 多个 `order` 和 trigger_shape 同一 group 内的"独立交互序列" | 三方允许 | 扁平化为单 `animations[]`(PPTist 无法表达);`extensions.order` / `extensions.interactiveSequenceId` 保留 |

---

## 9. path_* 单独策略(64 个三方键,PPTist 完全不支持)

三方有 64 个 motion path(`path_circle / path_5_point_star / path_turn_up` 等),PPTist 既无 motion-path effect,也无 SVG-level animateMotion。处置策略:

| 策略 | 行为 | 何时用 |
|---|---|---|
| **v1:丢弃并兜底 fadeIn** | `path_*` 走 `inferAnimationType → 'in'`,`mapEffect` 查 ENTRANCE_MAP 找不到,回退 `fadeIn`,原键写入 `extensions.originalEffect` | 当前默认(零回归风险) |
| v2-a:降级为 slide 类入场 | 例如 `path_right → slideInLeft`(注意反向) / `path_up → slideInDown` | 若方向语义对体感重要 |
| v2-b:完全保留空 | `slide.animations[]` 不写这一行 | 由调用方决定是否后续补 |

`extensions.originalEffect = path_*` 是兜底可观测的关键证据——诊断层可扫它做"丢失动画"统计。

---

## 10. `effect: none` 处理

三方 `effect: 'none'` 显式写出意味着"该 group 取消动画"(`ELEMENT_ANIMATIONS.md §2.4 表格`)。

```ts
mapEffect('none') → { effect: '__skip__', fallback: false }   // EFFECT_NONE_SENTINEL
```

调用方(injector)识别 `__skip__` 跳过 emit。这与三方语义一致。

---

## 11. 诊断与产出(可观测性)

每个 `convert()` 调用产出 `InjectorDiagnostics`(参见 `src/animation-injector.ts`):

| 字段 | 触发条件 |
|---|---|
| `elIdNotFoundWarnings: string[]` | `groups[gid]` 找不到任何 `groupId === gid` 的 PPTElement |
| `unmappedEffectCount: number` | `mapEffect` 回退 `EFFECT_FALLBACK` 命中次数(每行 +1) |
| `chromeSkippedGroups: number` | `isChromeGroupId(id) && id not in entry.groups`(规划中) |
| `extensionsDroppedFields: string[]` | 三方字段进 `extensions` 的字段名(供调试) |

被丢弃的能力(§8.5 表格)在 PPTist 侧无法回放;调用方可通过 `convertReport.extensions` 重新读出。

---

## 12. 完整性核对清单

| 项 | 实现 | 文档位置 |
|---|---|---|
| 三方 53 entrance 全部映射或兜底 | ✓ | §4 |
| 三方 53 exit 全部映射或兜底 | ✓ | §5 |
| 三方 33 emphasis 全部映射或兜底 | ✓ | §6 |
| 三方 64 path 全部兜底 fadeIn | ✓ | §9 |
| 三方 48 transition 全部映射或兜底 | ✓ | §7 |
| 29 legacy 输入名归一到 canonical | 上游 zod 阶段完成 | `ELEMENT_ANIMATIONS.md §4.7` |
| trigger 三向映射 + order 派生 | ✓ | §8.2 |
| duration 秒→毫秒 + clamp | ✓ | §8.3 |
| effect_options 透传 extensions | ✓ | §8.4 |
| 不支持字段透传 extensions | ✓ | §8.5 |
| `effect: 'none'` 显式跳过 | ✓ | §10 |
| `injector` 诊断信号 | ✓ | §11 |

---

## 13. 版本与变更记录

| 日期 | 阶段 | 变更 |
|---|---|---|
| Phase 14 / Plan 14-02 | 14-CONTEXT | 建立 `src/mappers/animation.ts` 全部映射表 |
| Phase 15 / Plan 15-02 | D-11 / D-15 | 引入 `extensions.originalEffect` 保 provenance;plan-level fallback 计数 |
| Phase 15 / a3d8e67 | 15-Bug-1 | `originalEffect` 改为无条件保留(src/animation-injector.ts:239),统一 D-11 contract |
| Phase 15 / 2941d66 | 15-Bug-2 | 同 group 多 element 元素并发:后续元素 trigger 收敛为 `'meantime'`(src/animation-injector.ts:497-501) |
| Phase 16 / 4b8b4b4 | 16-microfix-red | E2E 反向断言:`Object.keys(extensions)` 必含 `originalTrigger`(原 RED) |
| Phase 16 / 5e2dbe2 | 16-microfix-test | 单测:正向(显式 trigger 透传)+ 反向(`Object.keys` 包含 undefined-value 键) |
| Phase 16 / 9fa7fec | 16-microfix | `src/animation-injector.ts:240` 删 `if (row.trigger !== undefined)` guard,`originalTrigger` 与 `originalEffect` 同级无条件保留(D-11 spec 对齐) |
| 当前 | — | 文档对应 `src/mappers/animation.ts` rHEAD(`mapEffect` 返回 `{ effect, fallback }`,`mapTrigger` 处理 `trigger_shape` 在调用方) |

---

## 14. 相关文件速查

```
E:\git\svg2json\ELEMENT_ANIMATIONS.md          三方原始 schema,203+29 个键的全集
E:\git\svg2json\src\mappers\animation.ts       ENTRANCE_MAP / EMPHASIS_MAP / EXIT_MAP / TRANSITION_MAP
E:\git\svg2json\src\animation-injector.ts      调用 mapper 的注入器 + 诊断
E:\git\svg2json\src\animation-types.ts         AnimationsSidecar / AnimationsSidecarSlide 类型
E:\git\svg2json\src\slides.ts                  PPTAnimation 字段 + extensions 容器
E:\git\svg2json\code\PPTist\src\configs\animation.ts   PPTist 84 effect + 12 TurningMode 真值表
E:\git\svg2json\code\PPTist\src\types\slides.ts        PPTAnimation / TurningMode 类型
E:\git\svg2json\animation-adaptation-analysis.md        早期设计与缺口清单
```
