# Requirements: svg-to-pptel

**Defined:** 2026-10-14
**Core Value:** Accurately convert SVG visual elements to PowerPoint JSON with correct coordinates, transforms, and styles.

## v1.9 Requirements

Requirements for PPTist Animation Sidecar Injection. Each maps to Phase 14.

### CLI 入参

- [ ] **ANIM-CLI-01**: CLI 入参改为接受「父级目录」路径；目录中 `svg_output/` 子目录放源 SVG，根目录可放 `animations.json`（可选）
- [ ] **ANIM-CLI-02**: 检测到 `animations.json` 时自动启用动画注入；缺失时不报错，按无动画模式生成
- [ ] **ANIM-CLI-03**: 父目录输入时输出仍为多文件 JSON（每个 SVG 一个 .json），位于 `svg_output/` 内

### 元素 id 命名

- [ ] **ANIM-ID-01**: transformer 给 `<g id="x">` 子元素生成的 PPTElement.id 使用 `<group_id>__<nanoid(8)>` 格式
- [ ] **ANIM-ID-02**: 同一 `<g>` 下多个子元素各自获得独立 id，即使被 path-merge 合并仍保留子 id

### 动画映射

- [ ] **ANIM-MAP-01**: `animations.json` 的 `slides.<slide_id>` 对应 `svg_output/<slide_id>.svg`（去后缀）
- [ ] **ANIM-MAP-02**: `slides.<slide_id>.groups.<group_id>` 对应 SVG 中 `<g id="<group_id>">` 锚点
- [ ] **ANIM-MAP-03**: 每个 group 解析为 1+ 条 `PPTAnimation` 写入对应 Slide 的 `animations` 数组
- [ ] **ANIM-MAP-04**: `elId` 字段使用对应元素在 transformer 阶段生成的 `<group_id>__<nanoid(8)>` id
- [ ] **ANIM-MAP-05**: 单 entry 格式 `{effect, order, duration}` 与 `effects[]` 数组格式都支持

### 字段保留

- [ ] **ANIM-MAP-06**: 三方字段未映射项保留到 `PPTAnimation.extensions` 字段，**全量无损**

### 单位与触发

- [ ] **ANIM-TRANS-01**: `duration` 单位转换：三方秒 → PPTist 毫秒（×1000 + round）
- [ ] **ANIM-TRANS-02**: `trigger` 转换：`on-click → click`、`with-previous → meantime`、`after-previous → auto`

### Effect 映射

- [ ] **ANIM-TRANS-03**: `effect` 映射：能映射的（entrance + emphasis + exit 常用 key）写到 PPTAnimation.effect；映射不到的写到 `extensions.originalEffect`

### 页面转场

- [ ] **ANIM-TURN-01**: `slides.<slide_id>.transition.effect` 写入 `Slide.turningMode`，48 个三方 key → 12 个 TurningMode（未对应 fallback 为 `fade`）

### 默认默认

- [ ] **ANIM-DEFAULTS-01**: `defaults.animation` / `defaults.transition` 生效于所有 slide 的对应字段缺省值

### 诊断

- [ ] **ANIM-DIAG-01**: 转换结束打印被映射/被保留/被丢弃字段的统计报告（写 stderr，不进 JSON）

## v2 Requirements

Deferred. Not in current roadmap.

### 完整三方动画对等

- **ANIM-V2-01**: 集成 GSAP / anime.js 处理 motion path_*（动画运行时播放）
- **ANIM-V2-02**: PPTist effectOptions 字段扩展（direction / amount / color 等）
- **ANIM-V2-03**: PPTist trigger_shape / delay / repeat_count / sound 支持

### PPTist 编辑面板逆向

- **ANIM-V2-04**: 读 PPTist JSON 反向生成 animations.json sidecar

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| 修改 PPTist 源码 | 项目边界：svg2json 只产出 JSON，不修改消费者 |
| 修改 animations.json schema | 接受三方规范原文，原样消费 |
| 修改 svg_output/ 目录结构 | 接受三方约定目录布局 |
| 运行 PPTist 播放验证 | 转换器只生成 JSON，播放由 PPTist 端负责 |
| 集成 GSAP / anime.js | v1.9 只做 JSON 全量保留；运行时支持推到 v2 |
| 处理三方 sound 资源 | PPTist 不支持音频动画；sound 字段写入 extensions 不触发 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ANIM-CLI-01 | Phase 14 | Pending |
| ANIM-CLI-02 | Phase 14 | Pending |
| ANIM-CLI-03 | Phase 14 | Pending |
| ANIM-ID-01 | Phase 14 | Pending |
| ANIM-ID-02 | Phase 14 | Pending |
| ANIM-MAP-01 | Phase 14 | Pending |
| ANIM-MAP-02 | Phase 14 | Pending |
| ANIM-MAP-03 | Phase 14 | Pending |
| ANIM-MAP-04 | Phase 14 | Pending |
| ANIM-MAP-05 | Phase 14 | Pending |
| ANIM-MAP-06 | Phase 14 | Pending |
| ANIM-TRANS-01 | Phase 14 | Pending |
| ANIM-TRANS-02 | Phase 14 | Pending |
| ANIM-TRANS-03 | Phase 14 | Pending |
| ANIM-TURN-01 | Phase 14 | Pending |
| ANIM-DEFAULTS-01 | Phase 14 | Pending |
| ANIM-DIAG-01 | Phase 14 | Pending |

**Coverage:**
- v1.9 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-14*
*Last updated: 2026-10-14 after v1.9 milestone kickoff*
