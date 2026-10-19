# `animations.json` Reference

Schema and value reference for the project-level `animations.json` sidecar.
The file controls PPTX behavior without changing visible output; the SVG
remains the visual source. When the file exists, `svg_to_pptx.py` reads it
automatically.

Source of truth: `scripts/pptx_animations.py` (`ANIMATION_TRIGGERS`,
`ANIMATION_RESTARTS`, `ANIMATION_AFTER_EFFECTS`), and
`scripts/pptx_animation_presets.json` (canonical effect registry from
Microsoft `MsoAnimEffect`).

---

## 1. Top-Level Structure

```json
{
  "version": 1,
  "defaults": { "transition": { ... }, "animation": { ... } },
  "slides": {
    "<svg_stem>": {
      "transition": { ... },
      "animation":  { ... },
      "groups":     { "<g_id>": { ... } },
      "morph":      { ... }
    }
  }
}
```

- `slides` keys are SVG filename stems (no `.svg`).
- `groups` keys are unique top-level `<g id>` content groups — not nested
  `<g>`, not primitives, not chrome.
- `morph` lives only on the **destination** slide.
- Sparse overrides only — write fields that actually differ from defaults.

---

## 2. Field Reference

### 2.1 `transition` Fields

| Field | Type | Behavior |
|---|---|---|
| `effect` | string | One of 48 canonical native effects, or `none` (removes only the visual effect; timed advance remains) |
| `effect_options` | object | Only the selected effect's PowerPoint Effect Options; requires an explicit `effect` |
| `duration` | number | Finite seconds greater than zero |
| `auto_advance` | number | Optional finite non-negative seconds before automatic advance; click stays enabled; valid with `effect: none` |
| `sound` | string | Optional project-relative `.wav` cue; valid with `effect: none`; a slide override of `null` clears an inherited default sound |

`effect_options` accepts each effect's own Effect Options — inspect with
`pptx_animations.py --describe-transition <effect>` before writing.

### 2.2 `morph` Fields

| Field | Behavior |
|---|---|
| `morph.from` | Immediately preceding SVG stem for an explicit deterministic Morph transition |
| `morph.pairs.<key>.from` / `.to` | Unique source/destination direct-root group ids receiving the shared PowerPoint name `!!<key>`; Morph by object only |
| `effect_options.morph_by` | `object` (or omitted). `word` and `character` are rejected by the validator |

**Pair rules**:

| Rule | Detail |
|---|---|
| Owner | `morph` belongs to the destination; `morph.from` is the immediately preceding stem in export order |
| Pair key | A stable identity whose `from`/`to` are unique direct-root `<g>` ids on the two slides, written without `!!` (export writes the Selection Pane name `!!<key>` on both); a root primitive with a static role marker is not pairable |
| Destination effect | A destination with pairs sets `effect: morph` explicitly |
| Chains | A middle slide may continue an object into another Morph under the same key |
| Uniqueness | One key never names two objects on a slide; one object never carries two keys; every `!!` key shared by adjacent Morph pages must be declared |
| Coexistence | Pairing coexists with in-slide animation and survives `-a none`; `--no-animations` disables everything |

### 2.3 `animation` Fields

| Field | Type | Behavior |
|---|---|---|
| `effect` | string | Default object effect: one canonical key, `auto`, `mixed`, `random`, or `none` |
| `duration` | number | Default schedule duration (seconds) |
| `stagger` | number | Delay between rows (seconds) |
| `trigger` | string | Default Start mode: `after-previous`, `with-previous`, `on-click` |

**Mode resolution**:

| Mode | Behavior |
|---|---|
| `auto` | Generic entrance only: deterministic semantic mapping from the SVG group id |
| `mixed` | Generic entrance only: deterministic cycle over canonical entrance presets |
| `random` | Generic entrance only: stable seeded choice from the same pool |
| `none` | No object-animation sequence |

The same input always produces the same `random` choices. The three
generic modes select entrances only; they never satisfy `emphasize`,
`move`, or `exit`.

### 2.4 `groups` Forms — Mutually Exclusive

A populated `groups.<id>` uses **either** the legacy single-effect object
**or** the `{ "effects": [...] }` form, never both.

| Form | When to use |
|---|---|
| `effects[]` non-empty array | Multi-duty lifecycle; every row names `effect` |
| Single-effect object | One-row override; legacy `effect: none` removes the group from the sequence |
| Empty `{}` | Neutral placeholder; inherits no motion |

```json
"groups": {
  "risk-marker": {
    "effects": [
      { "effect": "entrance_fade",   "order": 1, "duration": 0.25 },
      { "effect": "path_right",      "order": 2, "duration": 0.7, "effect_options": { "relative": true } },
      { "effect": "emphasis_teeter", "order": 3, "duration": 0.45 },
      { "effect": "exit_fade",       "order": 4, "duration": 0.3 }
    ]
  },
  "warning-card": { "effect": "entrance_zoom", "duration": 0.4, "trigger": "on-click" }
}
```

---

## 3. Row Fields

Complete field reference for each row in `effects[]` and for legacy
single-effect objects.

| Field | Type / Range | Behavior |
|---|---|---|
| `effect` | canonical key or one of 29 legacy short names | Required; legacy names are read-only compatibility inputs |
| `order` | positive integer | Page-wide order for ordinary rows; ties keep SVG group order, then `effects[]` index; `trigger_shape` rows keep relative order in separate interactive sequences |
| `delay` | finite non-negative seconds | Row-specific offset; shape-trigger rows map to `TriggerDelayTime` |
| `duration` | finite positive seconds | Row schedule duration; scalable native trees keep internal ratios; `entrance_appear` and instantaneous presets keep their authored duration and use the value for `after-previous` spacing |
| `trigger` | `on-click` / `with-previous` / `after-previous` | Row Start; omitted values inherit `animation.trigger` |
| `trigger_shape` | different top-level `<g id>` | PowerPoint **On Click of**; row-only, not inherited; implies `on-click`; accepts an explicit `on-click` trigger |
| `effect_options` | object | Effect-specific parameters — see §5.4 |
| `repeat_count` / `repeat_duration` | integer / seconds | Repeat count or total repeat span; mutually exclusive |
| `auto_reverse` / `rewind` | boolean | Reverse each cycle and/or restore the pre-animation state |
| `accelerate` / `decelerate` / `bounce_end` | `0..1` ratio | Acceleration plus deceleration ≤ `1`; bounce needs an interpolated effect and cannot combine with deceleration |
| `restart` | `always` / `when-not-active` / `never` | Restart policy — see §5.2 |
| `after_effect` | `none` / `dim` (with `color`) / `hide` / `hide-on-next-click` | Completion behavior — see §5.3 |
| `sound` | project-relative or absolute `.m4a` / `.mp3` / `.wav` | Object-animation cue; bundled selections use the synced project-relative `.wav` path — see §6 |

---

## 4. Enumerated Value Reference

Every value the row-level fields accept. Source: module constants in
`scripts/pptx_animations.py` and the canonical registry in
`scripts/pptx_animation_presets.json`.

### 4.1 `trigger` — All 3 Values

PowerPoint's **Start** dropdown. Three values total
(`ANIMATION_TRIGGERS`):

| Value | `p:cTn@nodeType` | Behavior |
|---|---|---|
| `on-click` | `clickEffect` | One click reveals the next row; **forbidden with `--recorded-narration`** |
| `with-previous` | `withEffect` | One coordinated beat; stagger ignored |
| `after-previous` | `afterEffect` | Default click-free cascade with `--animation-stagger` |

A row-level `trigger` overrides the slide Start; an absent row value
inherits `animation.trigger`. `trigger_shape` implies `on-click` and
accepts an explicit `trigger` only when it is also `on-click`.

### 4.2 `restart` — All 3 Values

`ANIMATION_RESTARTS`:

| Value | Behavior |
|---|---|
| `always` | Restart every time the trigger fires again |
| `when-not-active` | Restart only when this row is no longer active |
| `never` | Never restart; ignore subsequent triggers while the deck plays |

### 4.3 `after_effect` — All 4 Values

`ANIMATION_AFTER_EFFECTS`. May be written as a string or as an object
`{ "type": "...", "color": "#RRGGBB" }`:

| Value | Behavior | Notes |
|---|---|---|
| `none` | No completion behavior | Default |
| `dim` | Dim the row after completion | Requires `color` (object form: `{ "type": "dim", "color": "#RRGGBB" }`) |
| `hide` | Hide the row after completion | |
| `hide-on-next-click` | Hide only when the next animation is triggered | |

### 4.4 `effect_options` Sub-Fields

#### 4.4.1 `direction` — All 22 Values

Aggregated across all effects that accept a `direction` parameter
(Fly, Wipe, Wheel, Path shapes, etc.):

| Group | Values |
|---|---|
| Cardinal | `up`, `down`, `left`, `right` |
| Diagonal | `up_left`, `up_right`, `down_left`, `down_right` |
| Axis-aligned edges | `horizontal`, `vertical` |
| Axis-aligned motion | `horizontal_in`, `horizontal_out`, `vertical_in`, `vertical_out` |
| Inside / Outside | `in`, `out` |
| Inside-region | `in_center`, `in_bottom`, `in_slightly` |
| Outside-region | `out_center`, `out_bottom`, `out_slightly` |

Each effect accepts only a subset — run
`pptx_animations.py --describe <effect>` to see which values that effect
supports and the per-effect default.

#### 4.4.2 `amount` — Number Ranges

Only four effects accept `amount`:

| Effect | Type | Default | Range |
|---|---|---|---|
| `emphasis_spin` | number | `360.0` | `-35791.0` to `35791.0` (degrees) |
| `emphasis_transparency` | number | `0.5` | `0.0` to `1.0` |
| `entrance_wheel` | enum | `1` | `1`, `2`, `3`, `4`, `8` (spokes) |
| `exit_wheel` | enum | `1` | `1`, `2`, `3`, `4`, `8` (spokes) |

#### 4.4.3 `size` — Number Range

Only `emphasis_grow_shrink` accepts `size`: number, default `100.0`,
range `0.001` to `2147483.0`.

#### 4.4.4 `relative` — Boolean

`true` (default) or `false`. Used by `path_*` effects to indicate
relative-vs-absolute path origin.

#### 4.4.5 `font_name` — String

One target-installed PowerPoint face, not a CSS font stack. Required by
`emphasis_change_font`.

#### 4.4.6 `color` — String

Hex color `#RRGGBB`. Used by emphasis color-change effects and by the
`after_effect: dim` color.

### 4.5 `morph.effect_options.morph_by` — 3 Values

| Value | Behavior |
|---|---|
| `object` | The supported mode — tween by object identity |
| (omitted) | Equivalent to `object` |
| `word` | **Rejected** by the validator |
| `character` | **Rejected** by the validator |

### 4.6 `effect` — All 203 Canonical Keys

The complete public registry from `pptx_animation_presets.json`
(`effects[]`, source: Microsoft `MsoAnimEffect`). Four categories.

#### Entrance (53)

| Key | Display name |
|---|---|
| `entrance_appear` | Appear |
| `entrance_fly` | Fly |
| `entrance_blinds` | Blinds |
| `entrance_box` | Box |
| `entrance_checkerboard` | Checkerboard |
| `entrance_circle` | Circle |
| `entrance_crawl` | Crawl |
| `entrance_diamond` | Diamond |
| `entrance_dissolve` | Dissolve |
| `entrance_fade` | Fade |
| `entrance_flash_once` | Flash Once |
| `entrance_peek` | Peek |
| `entrance_plus` | Plus |
| `entrance_random_bars` | Random Bars |
| `entrance_spiral` | Spiral |
| `entrance_split` | Split |
| `entrance_stretch` | Stretch |
| `entrance_strips` | Strips |
| `entrance_swivel` | Swivel |
| `entrance_wedge` | Wedge |
| `entrance_wheel` | Wheel |
| `entrance_wipe` | Wipe |
| `entrance_zoom` | Zoom |
| `entrance_random_effects` | Random Effects |
| `entrance_boomerang` | Boomerang |
| `entrance_bounce` | Bounce |
| `entrance_color_reveal` | Color Reveal |
| `entrance_credits` | Credits |
| `entrance_ease_in` | Ease In |
| `entrance_float` | Float |
| `entrance_grow_and_turn` | Grow And Turn |
| `entrance_light_speed` | Light Speed |
| `entrance_pinwheel` | Pinwheel |
| `entrance_rise_up` | Rise Up |
| `entrance_swish` | Swish |
| `entrance_thin_line` | Thin Line |
| `entrance_unfold` | Unfold |
| `entrance_whip` | Whip |
| `entrance_ascend` | Ascend |
| `entrance_center_revolve` | Center Revolve |
| `entrance_faded_swivel` | Faded Swivel |
| `entrance_descend` | Descend |
| `entrance_sling` | Sling |
| `entrance_spinner` | Spinner |
| `entrance_stretchy` | Stretchy |
| `entrance_zip` | Zip |
| `entrance_arc_up` | Arc Up |
| `entrance_faded_zoom` | Faded Zoom |
| `entrance_glide` | Glide |
| `entrance_expand` | Expand |
| `entrance_flip` | Flip |
| `entrance_fold` | Fold |
| `entrance_3d_arrive` | 3D Arrive |

#### Emphasis (33)

| Key | Display name |
|---|---|
| `emphasis_shimmer` | Shimmer |
| `emphasis_change_fill_color` | Change Fill Color |
| `emphasis_change_font` | Change Font |
| `emphasis_change_font_color` | Change Font Color |
| `emphasis_change_font_size` | Change Font Size |
| `emphasis_change_font_style` | Change Font Style |
| `emphasis_grow_shrink` | Grow Shrink |
| `emphasis_change_line_color` | Change Line Color |
| `emphasis_spin` | Spin |
| `emphasis_transparency` | Transparency |
| `emphasis_bold_flash` | Bold Flash |
| `emphasis_blast` | Blast |
| `emphasis_bold_reveal` | Bold Reveal |
| `emphasis_brush_on_color` | Brush On Color |
| `emphasis_brush_on_underline` | Brush On Underline |
| `emphasis_color_blend` | Color Blend |
| `emphasis_color_wave` | Color Wave |
| `emphasis_complementary_color` | Complementary Color |
| `emphasis_complementary_color2` | Complementary Color2 |
| `emphasis_contrasting_color` | Contrasting Color |
| `emphasis_darken` | Darken |
| `emphasis_desaturate` | Desaturate |
| `emphasis_flash_bulb` | Flash Bulb |
| `emphasis_flicker` | Flicker |
| `emphasis_grow_with_color` | Grow With Color |
| `emphasis_lighten` | Lighten |
| `emphasis_style_emphasis` | Style Emphasis |
| `emphasis_teeter` | Teeter |
| `emphasis_vertical_grow` | Vertical Grow |
| `emphasis_wave` | Wave |
| `emphasis_3d_turntable` | 3D Turntable |
| `emphasis_3d_swing` | 3D Swing |
| `emphasis_3d_jump_and_turn` | 3D Jump And Turn |

#### Motion path (64)

| Key | Display name |
|---|---|
| `path_circle` | Circle |
| `path_right_triangle` | Right Triangle |
| `path_diamond` | Diamond |
| `path_hexagon` | Hexagon |
| `path_5_point_star` | 5 Point Star |
| `path_crescent_moon` | Crescent Moon |
| `path_square` | Square |
| `path_trapezoid` | Trapezoid |
| `path_heart` | Heart |
| `path_octagon` | Octagon |
| `path_6_point_star` | 6 Point Star |
| `path_football` | Football |
| `path_equal_triangle` | Equal Triangle |
| `path_parallelogram` | Parallelogram |
| `path_pentagon` | Pentagon |
| `path_4_point_star` | 4 Point Star |
| `path_8_point_star` | 8 Point Star |
| `path_teardrop` | Teardrop |
| `path_pointy_star` | Pointy Star |
| `path_curved_square` | Curved Square |
| `path_curved_x` | Curved X |
| `path_vertical_figure8` | Vertical Figure8 |
| `path_curvy_star` | Curvy Star |
| `path_loopde_loop` | Loopde Loop |
| `path_buzzsaw` | Buzzsaw |
| `path_horizontal_figure8` | Horizontal Figure8 |
| `path_peanut` | Peanut |
| `path_figure8_four` | Figure8 Four |
| `path_neutron` | Neutron |
| `path_swoosh` | Swoosh |
| `path_bean` | Bean |
| `path_plus` | Plus |
| `path_inverted_triangle` | Inverted Triangle |
| `path_inverted_square` | Inverted Square |
| `path_left` | Left |
| `path_turn_right` | Turn Right |
| `path_arc_down` | Arc Down |
| `path_zigzag` | Zigzag |
| `path_s_curve2` | S Curve2 |
| `path_sine_wave` | Sine Wave |
| `path_bounce_left` | Bounce Left |
| `path_down` | Down |
| `path_turn_up` | Turn Up |
| `path_arc_up` | Arc Up |
| `path_heartbeat` | Heartbeat |
| `path_spiral_right` | Spiral Right |
| `path_wave` | Wave |
| `path_curvy_left` | Curvy Left |
| `path_diagonal_down_right` | Diagonal Down Right |
| `path_turn_down` | Turn Down |
| `path_arc_left` | Arc Left |
| `path_funnel` | Funnel |
| `path_spring` | Spring |
| `path_bounce_right` | Bounce Right |
| `path_spiral_left` | Spiral Left |
| `path_diagonal_up_right` | Diagonal Up Right |
| `path_turn_up_right` | Turn Up Right |
| `path_arc_right` | Arc Right |
| `path_s_curve1` | S Curve1 |
| `path_decaying_wave` | Decaying Wave |
| `path_curvy_right` | Curvy Right |
| `path_stairs_down` | Stairs Down |
| `path_up` | Up |
| `path_right` | Right |

#### Exit (53)

Same set as entrance with `exit_` prefix:

| Key | Display name |
|---|---|
| `exit_appear` | Appear |
| `exit_fly` | Fly |
| `exit_blinds` | Blinds |
| `exit_box` | Box |
| `exit_checkerboard` | Checkerboard |
| `exit_circle` | Circle |
| `exit_crawl` | Crawl |
| `exit_diamond` | Diamond |
| `exit_dissolve` | Dissolve |
| `exit_fade` | Fade |
| `exit_flash_once` | Flash Once |
| `exit_peek` | Peek |
| `exit_plus` | Plus |
| `exit_random_bars` | Random Bars |
| `exit_spiral` | Spiral |
| `exit_split` | Split |
| `exit_stretch` | Stretch |
| `exit_strips` | Strips |
| `exit_swivel` | Swivel |
| `exit_wedge` | Wedge |
| `exit_wheel` | Wheel |
| `exit_wipe` | Wipe |
| `exit_zoom` | Zoom |
| `exit_random_effects` | Random Effects |
| `exit_boomerang` | Boomerang |
| `exit_bounce` | Bounce |
| `exit_color_reveal` | Color Reveal |
| `exit_credits` | Credits |
| `exit_ease_in` | Ease In |
| `exit_float` | Float |
| `exit_grow_and_turn` | Grow And Turn |
| `exit_light_speed` | Light Speed |
| `exit_pinwheel` | Pinwheel |
| `exit_rise_up` | Rise Up |
| `exit_swish` | Swish |
| `exit_thin_line` | Thin Line |
| `exit_unfold` | Unfold |
| `exit_whip` | Whip |
| `exit_ascend` | Ascend |
| `exit_center_revolve` | Center Revolve |
| `exit_faded_swivel` | Faded Swivel |
| `exit_descend` | Descend |
| `exit_sling` | Sling |
| `exit_spinner` | Spinner |
| `exit_stretchy` | Stretchy |
| `exit_zip` | Zip |
| `exit_arc_up` | Arc Up |
| `exit_faded_zoom` | Faded Zoom |
| `exit_glide` | Glide |
| `exit_expand` | Expand |
| `exit_flip` | Flip |
| `exit_fold` | Fold |
| `exit_3d_arrive` | 3D Arrive |

**Four media-only `MsoAnimEffect` ids are excluded**: 83, 84, 85, 150
(play / pause / stop / play-from-bookmark). These require a media or
bookmark target, not an SVG-derived shape.

### 4.7 29 Legacy Compatibility Input Names

Read-only compatibility inputs; normalize to canonical presets before
XML writing, read-back, tracing, and validation. Never written for new
output.

| Legacy input | Normalized to | Effect Options added |
|---|---|---|
| `appear` | `entrance_appear` | (none) |
| `cut` | `entrance_appear` | (none; PowerPoint exposes no separate Cut preset) |
| `fade` | `entrance_fade` | (none) |
| `fly` | `entrance_fly` | `direction: down` |
| `fly_left` | `entrance_fly` | `direction: left` |
| `fly_right` | `entrance_fly` | `direction: right` |
| `fly_top` | `entrance_fly` | `direction: up` |
| `zoom` | `entrance_zoom` | (none) |
| `wipe` | `entrance_wipe` | `direction: left` |
| `wipe_left` | `entrance_wipe` | `direction: left` |
| `wipe_right` | `entrance_wipe` | `direction: right` |
| `wipe_up` | `entrance_wipe` | `direction: up` |
| `wipe_down` | `entrance_wipe` | `direction: down` |
| `split` | `entrance_split` | `direction: horizontal` |
| `blinds` | `entrance_blinds` | `direction: vertical` |
| `checkerboard` | `entrance_checkerboard` | `direction: horizontal` |
| `dissolve` | `entrance_dissolve` | (none) |
| `random_bars` | `entrance_random_bars` | `direction: horizontal` |
| `peek` | `entrance_peek` | `direction: in_bottom` |
| `wheel` | `entrance_wheel` | `amount: 4` |
| `box` | `entrance_box` | `direction: in` |
| `circle` | `entrance_circle` | `direction: in` |
| `diamond` | `entrance_diamond` | `direction: in` |
| `plus` | `entrance_plus` | `direction: in` |
| `strips` | `entrance_strips` | `direction: right` |
| `wedge` | `entrance_wedge` | `direction: down` |
| `stretch` | `entrance_stretch` | `direction: in` |
| `expand` | `entrance_expand` | `direction: out` |
| `swivel` | `entrance_swivel` | `direction: vertical` |

The 29 input names plus 203 canonical keys give the 232-key public
input surface.

---

## 5. Anchor & Target Resolution

### 5.1 Top-Level `<g id>`

Generated object animation targets **top-level SVG content groups**.
A single-effect group yields one Animation Pane row; `effects[]` may
resolve several rows against the same final shape.

Nested groups stay anonymous and untargeted. PowerPoint shape-target
anchors come from stable, unique top-level `<g id>` content groups
(`cover-title`, `card-1`, etc.).

### 5.2 Chrome Rules

| Target state | Behavior |
|---|---|
| Ordinary content group | Animatable |
| Legacy chrome-like id (`bg`, `*-header`, `*-footer`, `*-decor`, `nav`, `watermark`, `logo`, `pagenumber`) | Skipped unless explicitly named in `animations.json` |
| Explicit sidecar group override | May override only the legacy chrome-name heuristic |
| `data-pptx-layer` or explicit static role / placeholder marker | Structural and never animatable; sidecar cannot make it animatable |

**Exception**: a `*-header` or `*-footer` group whose text reaches the
page's median font size is read as the title block and stays an ordinary
target.

Existing groups are not custom-animation intent — derive one group per
logical motion unit from claims, comparisons, sequence, causality, and
narration, splitting coarse wrappers and merging fragments without
changing appearance. Run `list-groups` only after that rewrite.

---

## 6. Inheritance & Precedence

Resolution walks from outermost default inward:

1. **CLI defaults** (`fade` transition + `none` object animation)
2. **`defaults`** (deck-wide override)
3. **`slides.<slide>.transition`** / **`slides.<slide>.animation`** (slide override)
4. **`slides.<slide>.groups.<id>.effects[]` row fields** (defaults inherit slide `animation`)
5. **Row `trigger` / `trigger_shape`** override slide Start

A slide-level `null` clears the inherited default sound; an omitted
field inherits; never rewrite defaults per row. An unlisted SVG
inherits the resolved deck-wide settings.

---

## 7. Morph — Author the Action as Two Pages

Morph tweens matched objects across consecutive slides. Any continuous
action is two static pages plus Morph: duplicate the page, change one
property, PowerPoint interpolates. Chain three or more pages for
extend–hold–retract.

| Property change | Reads as |
|---|---|
| Off-canvas → on-canvas | Slide-in, drawer, card extending |
| Rotation | Flip, turn, hinge |
| A scaled image container | Camera push-in |
| A dropping scrim or growing cut | Progressive reveal |
| The same wide image at two `x` offsets | Camera pan |

**Hard rule — matching needs compatible identity, not identical
geometry**: ids and visible state may differ, but both endpoints must
resolve to one compatible top-level PowerPoint object kind — a shape
and a picture cross-fade instead of tweening. Automatic Morph is
heuristic.

**Give text somewhere to come from**: text present only on the second
page can only fade in. Place the next page's copy just below the canvas
and the previous page's just above, so blocks slide through the frame.
A wholly off-canvas endpoint is one direct-root `<g id>` with valid
`data-pptx-bounds` and `data-pptx-morph-staging="true"`, explicitly
paired when Morph stays enabled; the marker never excuses a partially
clipped group. Declare identity through the destination's `morph` block,
never `data-pptx-shape-name`.

**Not supported**: Slide Zoom / Summary Zoom (build click navigation
with `trigger_shape` or hyperlinks) and 3D — perspective, extrusion,
and shear fail closed; build the impression with offset, scale,
overlap, and per-facet lightness.

```json
{
  "version": 1,
  "slides": {
    "02_detail": {
      "transition": { "effect": "morph", "effect_options": { "morph_by": "object" }, "duration": 0.8 },
      "morph": {
        "from": "01_overview",
        "pairs": { "hero-image": { "from": "hero-overview", "to": "hero-detail" } }
      }
    }
  }
}
```

---

## 8. Sound Selection

The `sound` field on `transition`, `animation`, or any row carries a
project-relative path. Materialize cues from the global library **only
after** the visual solution is final and one exact id has been chosen
for the auditory job.

```json
{
  "version": 1,
  "slides": {
    "02_process": {
      "transition": { "effect": "push", "sound": "sounds/bigsoundbank/1797.wav" },
      "groups": {
        "next-step": {
          "effect": "entrance_fade",
          "sound": "sounds/kenney-interface/click_001.wav"
        }
      }
    }
  }
}
```

| `sound` value | Where it appears |
|---|---|
| Project-relative `.wav` | Bundled selections synced from the global library |
| Project-relative `.m4a` / `.mp3` / `.wav` | User audio already in the project |
| Absolute `.m4a` / `.mp3` / `.wav` | Legacy low-level inputs |

`transition.sound` uses WAV. A slide-level `transition.sound: null`
clears an inherited default sound. `effect: none` may carry a sound
cue. Object-animation `sound` accepts `.m4a`, `.mp3`, or `.wav` on
low-level inputs; bundled choices are WAV.

---

## 9. OOXML Write Rules

- Animation timing writes **after** `p:transition` and **before**
  `p:extLst`.
- One root `p:timing`; nonzero `bounce_end` uses native
  `mc:AlternateContent` with a p14 Choice and non-bounce Fallback.
- Each branch contains a `tmRoot`, a `mainSeq` when ordinary Start rows
  exist, one `interactiveSeq` per trigger-shape row, unique branch-local
  `p:cTn@id` values, and same-slide `p:spTgt` references.
- Trigger mapping: `on-click → clickEffect`, `with-previous →
  withEffect`, `after-previous → afterEffect`.
- `trigger_shape` implies `on-click`, writes native `interactiveSeq`
  with `onClick` shape conditions, row stays `clickEffect`, row `delay`
  becomes `TriggerDelayTime`.
- Row `trigger` overrides slide Start in both forms.
- The writer does **not** emit `p:bldP` for grouped content or pictures
  — using `p:bldP@spid` for `p:grpSp` or `p:pic` creates an invalid
  build reference.
- `entrance_appear` is the visibility-flip exception: its `p:set`
  behavior is always 1ms; the configured positive duration remains the
  row's scheduling span used when computing the next `after-previous`
  offset.
- Other native presets with a finite duration scale every finite
  behavior duration and start delay proportionally, preserving
  multi-step timing such as bounce and teeter.
- PowerPoint-authored instantaneous emphasis presets keep their
  `indefinite` behavior duration; their configured duration remains
  the scheduling span for the next `after-previous` row.

---

## 10. Validation & Read-Back

### 10.1 Project Preflight (Before Export)

`animation_config.py validate` runs the writer's effect-behavior test
for `bounce_end` and resolves declared sound paths against the project
root. Missing paths, non-files, and unsupported audio extensions fail
this project-level preflight. Field-only validation remains
filesystem-independent.

### 10.2 Field Validation (Filesystem-Independent)

- Reject unknown effect, mode, or trigger — never substitute another
  value.
- Reject booleans and non-finite, out-of-range, or invalidly ordered
  values.
- Reject a missing slide, missing group, or structural-layer target.
- Keep the generated-route default at `none`; validation does not opt
  a deck in.

### 10.3 Semantic Read-Back (After Export)

Generated export reads every slide back before packaging and compares
each requested row with the serialized result:

- Row count and row order, including stable repeated-target rows.
- Trigger, optional trigger shape, and shape target.
- Resolved effect key, preset class, filter, `presetID`, and
  `presetSubtype`.
- Exact effect options, repeat / reverse / rewind / acceleration /
  bounce / restart semantics, completion behavior, sound relationship,
  playback span.
- Native behavior-tree signature, serialized behavior duration, and
  computed timeline offset (`entrance_appear` and instantaneous native
  presets use the exceptions of §9).

After packaging, validation scans every slide part for root timing
placement, duplicate or malformed `p:cTn` ids, missing `p:spTgt`
shapes, invalid build targets, and unsupported generated effect
tuples. A mismatch fails export **before** the requested output file
replaces an existing deck.

### 10.4 Reverse Projection

`pptx_to_svg.py` reuses the semantic reader and behavior-tree
validator for a finite reverse projection. A row enters
`animations.json` only when its current-registry effect / options, pane
order, Start trigger, exact behavior duration, relative delay, and
target / optional trigger shape can be represented by unique top-level
slide SVG groups. Repeated targets become `effects[]`. Duration-less
native rows, advanced timing modifiers, sounds, build / media commands,
unknown trees, and unmapped targets remain explicit import diagnostics.
This is not a general PowerPoint timing-tree normalizer.

---

## 11. Limitations

- Generated animation belongs to the native PPTX built from
  `svg_output/`; `svg_final/` is static and inserting it creates no
  anchors.
- PowerPoint OOXML is the compatibility target; other apps may
  reinterpret behavior trees.
- PowerPoint's MP4 encoder may drop transition and object sounds, so
  sound-enabled MP4 uses the post-export mix or the capture contract.
- Direct-PPTX routes preserve unknown transition `AlternateContent`
  and keep Choice / Fallback advance attributes synchronized.
- Media play / pause / stop / play-from-bookmark commands are excluded
  because they require a media or bookmark target, not an SVG-derived
  shape.
- Paragraph / text-range build controls are outside this writer —
  generated targets are top-level SVG groups, not paragraph ranges.
- Slide Zoom / Summary Zoom are unsupported; build click navigation
  with `trigger_shape` or hyperlinks.
- 3D — perspective, extrusion, and shear — fail closed; build the
  impression with offset, scale, overlap, and per-facet lightness.
