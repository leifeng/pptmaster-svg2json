/**
 * 集中常量文件
 *
 * 跨模块使用的命名常量统一在此定义，避免散落在各个模块中。
 * 按业务领域分组，每组用注释分割。
 *
 * 单元测试或私有模块的局部常量保留在原文件，不在此迁移。
 */

import { join, resolve } from 'path'

// =============================================================================
// 日志前缀
// =============================================================================

/** 全局日志统一前缀 */
export const LOG_PREFIX = '[SVG2JSON]'

// =============================================================================
// 字体相关
// =============================================================================

/** 思源黑体简体 Regular — 全局目标字体（替换 SVG 中所有其他 font-family） */
export const TARGET_FONT = 'Source Han Sans CN Regular'

/**
 * 思源字体文件路径（dist/src/fonts/Source Han Sans CN Regular.ttf）
 * Resvg 必须显式加载字体文件，否则会用内置 fallback 测量，导致 bbox
 * 与 PPTist 实际渲染不一致。
 */
export const FONT_FILE = join(__dirname, 'fonts', 'Source Han Sans CN Regular.ttf')

/**
 * Resvg 字体选项：只加载思源字体，关闭系统字体，
 * 避免测量与 PPTist 渲染不一致。
 */
export const FONT_OPTIONS = {
  font: {
    fontFiles: [FONT_FILE],
    loadSystemFonts: false,
    defaultFontFamily: TARGET_FONT,
  },
}

// =============================================================================
// 文本测量 / 转换
// =============================================================================

/** 文本宽度安全边距（画布像素），防止测量误差导致文本意外换行 */
export const TEXT_WIDTH_SAFETY_MARGIN = 25

/** 思源字体的 ascent 比率，用于 resvg-js 测量失败的 fallback */
export const FALLBACK_ASCENT_RATIO = 0.764

/** SVG `<text text-anchor="middle">` 转 PPTElement 时对 top 加的补偿（画布像素，默认 -10） */
export const TEXT_ANCHOR_MIDDLE_TOP_OFFSET = -10

// =============================================================================
// 命名颜色映射 (CSS named color → hex)
// =============================================================================

/**
 * CSS 命名颜色到十六进制的映射。
 * 用于 `colorToHex` / `colorToRgba` 在解析 SVG fill / stroke 时做查表。
 */
export const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  silver: '#c0c0c0',
  gray: '#808080',
  grey: '#808080',
  white: '#ffffff',
  maroon: '#800000',
  red: '#ff0000',
  purple: '#800080',
  fuchsia: '#ff00ff',
  green: '#00ff00',
  lime: '#00ff00',
  olive: '#808000',
  yellow: '#ffff00',
  navy: '#000080',
  blue: '#0000ff',
  teal: '#008080',
  aqua: '#00ffff',
  orange: '#ffa500',
  aliceblue: '#f0f8ff',
  antiquewhite: '#faebd7',
  aquamarine: '#7fffd4',
  azure: '#f0ffff',
  beige: '#f5f5dc',
  bisque: '#ffe4c4',
  blanchedalmond: '#ffebcd',
  coral: '#ff7f50',
  cornflowerblue: '#6495ed',
  cornsilk: '#fff8dc',
  crimson: '#dc143c',
  cyan: '#00ffff',
  darkblue: '#00008b',
  darkcyan: '#008b8b',
  darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9',
  darkgreen: '#006400',
  darkkhaki: '#bdb76b',
  darkmagenta: '#8b008b',
  darkolivegreen: '#556b2f',
  darkorange: '#ff8c00',
  darkorchid: '#9932cc',
  darkred: '#8b0000',
  darksalmon: '#e9967a',
  darkseagreen: '#8fbc8f',
  darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f',
  darkturquoise: '#00ced1',
  darkviolet: '#9400d3',
  deeppink: '#ff1493',
  deepskyblue: '#00bfff',
  dimgray: '#696969',
  dodgerblue: '#1e90ff',
  firebrick: '#b22222',
  floralwhite: '#fffaf0',
  forestgreen: '#228b22',
  gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff',
  gold: '#ffd700',
  goldenrod: '#daa520',
  greenyellow: '#adff2f',
  honeydew: '#f0fff0',
  hotpink: '#ff69b4',
  indianred: '#cd5c5c',
  indigo: '#4b0082',
  ivory: '#fffff0',
  khaki: '#f0e68c',
  lavender: '#e6e6fa',
  lavenderblush: '#fff0f5',
  lemonchiffon: '#fffacd',
  lightblue: '#add8e6',
  lightcoral: '#f08080',
  lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2',
  lightgray: '#d3d3d3',
  lightgreen: '#90ee90',
  lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa',
  lightskyblue: '#87cefa',
  lightslategray: '#778899',
  lightsteelblue: '#b0c4de',
  lightyellow: '#ffffe0',
  limegreen: '#32cd32',
  linen: '#faf0e6',
  magenta: '#ff00ff',
  mediumaquamarine: '#66cdaa',
  mediumblue: '#0000cd',
  mediumorchid: '#ba55d3',
  mediumpurple: '#9370db',
  mediumseagreen: '#3cb371',
  mediumslateblue: '#7b68ee',
  mediumspringgreen: '#00fa9a',
  mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585',
  midnightblue: '#191970',
  mintcream: '#f5fffa',
  mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5',
  navajowhite: '#ffdead',
  oldlace: '#fdf5e6',
  olivedrab: '#6b8e23',
  orangered: '#ff4500',
  orchid: '#da70d6',
  palegoldenrod: '#eee8aa',
  palegreen: '#98fb98',
  paleturquoise: '#afeeee',
  palevioletred: '#db7093',
  papayawhip: '#ffefd5',
  peachpuff: '#ffdab9',
  peru: '#cd853f',
  pink: '#ffc0cb',
  plum: '#dda0dd',
  powderblue: '#b0e0e6',
  rosybrown: '#bc8f8f',
  royalblue: '#4169e1',
  saddlebrown: '#8b4513',
  salmon: '#fa8072',
  sandybrown: '#f4a460',
  seagreen: '#2e8b57',
  seashell: '#fff5ee',
  sienna: '#a0522d',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  slategray: '#708090',
  snow: '#fffafa',
  springgreen: '#00ff7f',
  steelblue: '#4682b4',
  tan: '#d2b48c',
  thistle: '#d8bfd8',
  tomato: '#ff6347',
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  wheat: '#f5deb3',
  whitesmoke: '#f5f5f5',
  yellowgreen: '#9acd32',
}

// =============================================================================
// SVG <use> 标签处理
// =============================================================================

/**
 * 图标库基础路径（dist/src/templates/icons/）
 * 同时兼容 dev（dist/src/）与 release（根目录） — templates/ 与入口文件平级。
 */
export const ICONS_BASE = resolve(__dirname, 'templates/icons')

/** 图标样式配置：每个图标家族对应的渲染模式 */
export const STYLE_CONFIG: Record<string, { mode: 'fill' | 'stroke' | 'duotone' }> = {
  'chunk-filled': { mode: 'fill' },
  'tabler-filled': { mode: 'fill' },
  'tabler-outline': { mode: 'stroke' },
  'phosphor-duotone': { mode: 'duotone' },
  'simple-icons': { mode: 'fill' },
}