import { v4 as uuidv4 } from 'uuid'
import { SvgParseResult, SvgElement, TransformResult } from '../types/ast'
import { mapCoordinates, parseTransform } from '../mapper/coordinate-mapper'
import { applyTransform, applyRotateWithCenter } from './apply-transform'
import { preprocessClipPaths } from './clip-path-preprocessor'
import { rectToPath, roundedRectToPath, circleToPath, ellipseToPath, lineToPath, polygonToPath } from '../shapes/shape-to-path'
import { measureTextElement, TextMeasurementInput } from '../text-measurer'
import { toAbsolutePath, scalePathCoords } from '../utils/path-utils'


import type { PPTElement, PPTTextElement, PPTShapeElement, PPTLineElement, PPTImageElement, LineStyleType } from '../slides'

export type { PPTElement }

/**
 * 转换 icon 元素（有 data-icon-width/height 属性的 path）
 * icon 的位置和尺寸已经在 autoEmbedIcons 中处理过
 */
function transformIconElement(
  element: SvgElement,
  coords: { left: number; top: number; width: number; height: number },
  iconW: number,
  iconH: number,
  scaleX: number,
  scaleY: number,
  transform: TransformResult,
  id: string,
): PPTShapeElement | null {
  const d = typeof element.attrs.d === 'string' ? element.attrs.d : ''
  const strokeWidth = parseFloat(String(element.attrs['stroke-width'] || '0'))
  const fillValue = element.attrs.fill
  const isFillNone = fillValue === 'none' || fillValue === 'transparent'
  const { rotate, flipH, flipV } = applyTransform(coords.left, coords.top, coords.width, coords.height, transform)

  // Icon 的 width/height/viewBox 都用缩放后的值
  const resultWidth = iconW * Math.abs(scaleX)
  const resultHeight = iconH * Math.abs(scaleY)
  const viewBoxW = iconW * Math.abs(scaleX)
  const viewBoxH = iconH * Math.abs(scaleY)

  // Path 坐标转绝对坐标，并缩放到 canvas 空间
  const pathD = scalePathCoords(toAbsolutePath(d), scaleX, scaleY)

  // 应用 canvas scale 得到 canvas 空间坐标
  const finalLeft = coords.left * scaleX
  const finalTop = coords.top * scaleY

  const result: PPTShapeElement = {
    id,
    type: 'shape',
    left: finalLeft,
    top: finalTop,
    width: resultWidth,
    height: resultHeight,
    rotate,
    viewBox: [viewBoxW, viewBoxH],
    path: pathD,
    fixedRatio: false,
    fill: isFillNone ? 'none' : (colorToHex(fillValue) || '#000000'),
    opacity: element.attrs.opacity ? parseFloat(element.attrs.opacity) : undefined,
  }

  if (element.attrs.gradient) {
    result.gradient = element.attrs.gradient
    // @ts-expect-error - fill may not exist on result
    delete result.fill
  } else if (!isFillNone) {
    const fillOpacity = element.attrs['fill-opacity']
    if (fillOpacity && parseFloat(String(fillOpacity)) < 1) {
      result.fill = colorToRgba(String(element.attrs.fill), parseFloat(String(fillOpacity)))
    }
  }
  if (flipH) result.flipH = true
  if (flipV) result.flipV = true
  if (element.attrs.stroke) {
    const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity'])
    result.outline = {
      style: parseDashArray(element.attrs['stroke-dasharray']),
      width: strokeWidth || 1,
      color,
      ...(opacity !== undefined && { opacity }),
    }
    // D-37: For stroke-only paths with height=0 or width=0, set minimum dimension
    if (result.height === 0 && strokeWidth > 0) {
      result.height = strokeWidth * scaleY
    }
    if (result.width === 0 && strokeWidth > 0) {
      result.width = strokeWidth * scaleX
    }
  }
  if (element.attrs.shadow) {
    result.shadow = element.attrs.shadow
  }
  return result
}

/**
 * Parse stroke-dasharray into line style.
 * Per D-05 (CRITICAL PITFALL 5): normalize "5,3" / "5 3" / "5" variants.
 */
export function parseDashArray(dash: string | undefined): LineStyleType {
  if (!dash || dash.trim() === '') return 'solid'
  const normalized = dash.replace(/,/g, ' ').trim()
  const parts = normalized.split(/\s+/).filter((p) => p.length > 0)
  if (parts.length === 0) return 'solid'
  const first = parseFloat(parts[0])
  if (isNaN(first) || first === 0) return 'solid'
  // "2,2" or "2 2" -> dotted, "5,5" or "5 5" -> dashed
  if (parts.length === 2) {
    const second = parseFloat(parts[1])
    if (second === 2) return 'dotted'
    if (second === 5) return 'dashed'
  }
  if (parts.length === 1) {
    if (first === 2) return 'dotted'
    if (first === 5) return 'dashed'
  }
  return 'dashed'
}

/**
 * Named CSS colors map to hex values.
 */
const namedColors: Record<string, string> = {
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

/**
 * Decode common HTML entities in a string.
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/**
 * Convert a CSS color string to hex format.
 */
export function colorToHex(color: string | undefined): string {
  if (!color) return '#000000'
  // Already hex
  if (color.startsWith('#')) return color
  // Named color lookup
  if (namedColors[color.toLowerCase()]) return namedColors[color.toLowerCase()]
  // rgb(r, g, b)
  const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0')
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0')
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
  }
  return '#000000'
}

/**
 * Convert a CSS color + opacity to rgba() format.
 */
export function colorToRgba(color: string | undefined, opacity: number): string {
  if (!color) return `rgba(0, 0, 0, ${opacity})`
  // Already hex
  if (color.startsWith('#')) {
    const hex = colorToHex(color)
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  // Named color lookup
  if (namedColors[color.toLowerCase()]) {
    const hex = namedColors[color.toLowerCase()]
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  // rgb(r, g, b)
  const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})`
  }
  return `rgba(0, 0, 0, ${opacity})`
}

/**
 * Parse stroke color and opacity.
 * Returns { color, opacity } where color is a valid hex/named color (never transparent),
 * and opacity is 0-1 range. When stroke is "transparent" or rgba with alpha=0,
 * use a fallback color with opacity=0.
 */
function parseStrokeColor(stroke: string | undefined, strokeOpacity: string | number | undefined): { color: string; opacity?: number } {
  if (!stroke || stroke === 'none' || stroke === 'transparent') {
    return { color: '#000000', opacity: 0 }
  }

  // Normalize strokeOpacity to string for regex matching
  const strokeOpacityStr = strokeOpacity !== undefined ? String(strokeOpacity) : undefined

  // Check for rgba() format
  const rgbaMatch = stroke.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,?\s*([\d.]+)\s*\)/)
  if (rgbaMatch) {
    const r = rgbaMatch[1]
    const g = rgbaMatch[2]
    const b = rgbaMatch[3]
    const alpha = parseFloat(rgbaMatch[4])
    // Combine stroke-opacity with alpha from rgba
    const combinedOpacity = strokeOpacityStr !== undefined
      ? parseFloat(strokeOpacityStr) * alpha
      : alpha
    return {
      color: `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`,
      opacity: combinedOpacity,
    }
  }

  // For hex/named colors, use stroke-opacity if present
  const opacity = strokeOpacityStr !== undefined ? parseFloat(strokeOpacityStr) : undefined
  return { color: colorToHex(stroke), ...(opacity !== undefined && { opacity }) }
}

/**
 * Parse points string into array of [x, y] tuples.
 */
function parsePointsString(pointsStr: string): [number, number][] {
  if (!pointsStr) return []
  const parts = pointsStr.trim().split(/[\s,]+/).map(Number)
  const result: [number, number][] = []
  for (let i = 0; i < parts.length; i += 2) {
    if (!isNaN(parts[i]) && !isNaN(parts[i + 1])) {
      result.push([parts[i], parts[i + 1]])
    }
  }
  return result
}

/**
 * Convert polyline points to SVG path string (open path, no Z suffix).
 */
function polylineToPath(points: [number, number][]): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points
  if (rest.length === 0) return `M ${first[0]},${first[1]}`
  return `M ${first[0]},${first[1]} ${rest.map((p) => `L ${p[0]},${p[1]}`).join(' ')}`
}

/**
 * Extract text content from a text or tspan element.
 * Adds newline between tspan children to preserve multi-line structure.
 */
function extractTextContentFromElement(element: SvgElement): string {
  let content = element.text || ''

  // Process tspan children - add newline between lines
  const tspanChildren = element.children.filter(child => child.type === 'tspan')
  for (let i = 0; i < tspanChildren.length; i++) {
    content += extractTextContentFromElement(tspanChildren[i])
    // Add newline after each tspan except the last one
    if (i < tspanChildren.length - 1) {
      content += '\n'
    }
  }

  return content
}

/**
 * Build HTML content from a text element, processing tspan children with baseline-shift support.
 * Wraps content in <sup> or <sub> tags based on baseline-shift attribute.
 * Returns both the HTML content string and plain text for measurement.
 */
function buildTextContentFromElement(element: SvgElement, parentFontSize: number = 16, scaleY: number = 1): { html: string; text: string } {
  let htmlContent = ''
  let textContent = element.text || ''

  // D-??: Process ALL children in document order, not just tspans.
  // Children can be either 'text' (inline text segments) or 'tspan' (styled segments)
  // The parser now interleaves text and tspan children to preserve order.
  for (let i = 0; i < element.children.length; i++) {
    const child = element.children[i]

    if (child.type === 'tspan') {
      // Tspan with potential baseline-shift styling and its own font-size
      const baselineShift = child.attrs['baseline-shift']
      const childFontSize = Number(child.attrs['font-size']) || parentFontSize
      const scaledChildFontSize = childFontSize * scaleY
      const { html: childHtml, text: childText } = buildTextContentFromElement(child, childFontSize, scaleY)

      let wrappedHtml = childHtml
      const hasFontSizeDiff = childFontSize !== parentFontSize

      // When baseline-shift exists: use span with vertical-align CSS instead of sub/sup tag
      // This preserves font-size styling which pptist doesn't support on sub/sup tags
      if (baselineShift === 'super' || baselineShift === 'sub') {
        const vaValue = baselineShift === 'super' ? 'super' : 'sub'
        if (hasFontSizeDiff) {
          wrappedHtml = `<span style="vertical-align: ${vaValue}; font-size: ${scaledChildFontSize}px">${childHtml}</span>`
        } else {
          wrappedHtml = `<span style="vertical-align: ${vaValue}">${childHtml}</span>`
        }
      } else {
        // Always wrap tspan content in font-size span (even when same as parent)
        // This ensures text rendering always has explicit font-size information
        wrappedHtml = `<span style="font-size: ${scaledChildFontSize}px">${childHtml}</span>`
      }

      htmlContent += wrappedHtml
      textContent += childText
    } else if (child.type === 'text') {
      // Inline text segment (from mixed text/tspan content)
      // All text segments need explicit font-size wrapper (text's font-size is the main font size)
      const { html: childHtml, text: childText } = buildTextContentFromElement(child, parentFontSize, scaleY)
      const scaledParentFontSize = parentFontSize * scaleY
      htmlContent += `<span style="font-size: ${scaledParentFontSize}px">${childHtml}</span>`
      textContent += childText
    }
  }

  // If element has direct text content, wrap it with font-size span
  // This ensures all text segments have explicit font-size (even when no children)
  if (!htmlContent && element.text) {
    const scaledParentFontSize = parentFontSize * scaleY
    htmlContent = `<span style="font-size: ${scaledParentFontSize}px">${element.text}</span>`
  }

  return { html: htmlContent, text: textContent }
}

/**
 * Check if element has tspan children with x attribute (indicating multiline text).
 * Rule: 有 x = 换行（多行文本），无 x = 同行连续排列（公式/上下标）
 */
function hasLineBreakTspans(element: SvgElement): boolean {
  for (const child of element.children) {
    if (child.type === 'tspan') {
      if (child.attrs['x'] !== undefined) {
        return true
      }
      if (hasLineBreakTspans(child)) {
        return true
      }
    }
  }
  return false
}

interface TspanExtractResult {
  left: number
  top: number
  fontSize: number
  content: string
  htmlContent: string
}

/**
 * Extract tspan elements with calculated positions for multiline text.
 * Position calculation based on parent text x/y plus each tspan's x and dy.
 */
function extractTspansWithPosition(
  element: SvgElement,
  baseLeft: number,
  baseTop: number,
  baseFontSize: number,
  scaleX: number = 1,
  scaleY: number = 1,
  parentSvgX?: number,
): TspanExtractResult[] {
  const results: TspanExtractResult[] = []
  const fontSize = parseFloat(String(element.attrs['font-size'] || baseFontSize))
  // The parent's x in SVG coordinates (before transform)
  const parentX = parentSvgX ?? 0

  // Process tspan children
  const tspanChildren = element.children.filter(child => child.type === 'tspan')

  if (tspanChildren.length === 0) {
    // No tspans, use direct text content
    const text = element.text || ''
    if (text) {
      results.push({
        left: baseLeft,
        top: baseTop,
        fontSize,
        content: text,
        htmlContent: `<span style="font-size: ${fontSize}px">${text}</span>`,
      })
    }
    return results
  }

  let currentTop = baseTop
  let currentLeft = baseLeft

  for (const tspan of tspanChildren) {
    const hasX = tspan.attrs['x'] !== undefined
    // tspanX calculation:
    // - parentX is the parent text element's x in SVG coordinates
    // - baseLeft is the parent text's transformed left position (after translate + scale)
    // - The offset = baseLeft - parentX (in SVG space, before scale)
    // - For tspan, effective x = tspanX + offset (then scaled)
    // Formula: effectiveX = (tspanX - parentX) * scaleX + baseLeft
    const tspanX = hasX
      ? (parseFloat(String(tspan.attrs['x'])) - parentX) * scaleX + baseLeft
      : currentLeft
    const tspanDy = tspan.attrs['dy'] !== undefined ? parseFloat(String(tspan.attrs['dy'])) : 0
    // Inherit font-size from parent if not specified on tspan
    const tspanFontSize = tspan.attrs['font-size'] !== undefined
      ? parseFloat(String(tspan.attrs['font-size']))
      : fontSize
    const scaledFontSize = tspanFontSize * scaleY

    // Build HTML content for this tspan (preserve baseline-shift styling)
    const { html: tspanHtml, text: tspanText } = buildTextContentFromElement(tspan, tspanFontSize, scaleY)

    // Update position based on dy (relative to previous line in SVG coordinate space)
    // Note: In SVG, dy is the displacement from the previous line's baseline position
    // dy="0" means same baseline as previous line
    // dy="22" means 22 SVG units lower than previous line
    currentTop += tspanDy * scaleY

    // REF-04: Handle pixel baseline-shift values
    // baseline-shift="-5px" with scaleY=0.78125 → top offset = -5 * 0.78125 = -3.90625
    // Negative pixel value raises the text (smaller top = higher on canvas)
    const baselineShift = tspan.attrs['baseline-shift']
    if (baselineShift && /^-?\d+(\.\d+)?px$/.test(String(baselineShift))) {
      const pixelValue = parseFloat(String(baselineShift))
      const scaledOffset = pixelValue * scaleY
      // Subtract because negative offset means raise (smaller top = higher)
      currentTop -= scaledOffset
    }

    results.push({
      left: tspanX,
      top: currentTop,
      fontSize: tspanFontSize,
      content: tspanText,
      htmlContent: tspanHtml,
    })

    currentLeft = tspanX
  }

  return results
}

/**
 * Transform a single SVG element to PPTElement.
 * @param element - SVG element to transform
 * @param viewBox - SVG viewBox [minX, minY, width, height]
 * @param index - Element index in the output
 * @param targetCanvas - Target canvas size [width, height], defaults to [1000, 562.5]
 * @param groupId - Current groupId context from parent g elements
 */
export async function transformElement(
  element: SvgElement,
  viewBox: [number, number, number, number],
  index: number,
  targetCanvas: [number, number] = [1000, 562.5],
  groupId?: string,
  effectiveTransform?: string,
): Promise<PPTElement | PPTElement[] | null> {
  const tag = element.type.toLowerCase()
  // REF-01: Pass effectiveTransform (parent + element transform composed) to mapCoordinates
  const coords = mapCoordinates(element, viewBox, effectiveTransform)
  const id = uuidv4()

  // Calculate scale ratio from SVG viewBox to target canvas
  const scaleX = targetCanvas[0] / viewBox[2]
  const scaleY = targetCanvas[1] / viewBox[3]

  // Apply scaling to coordinates
  const left = coords.left * scaleX
  const top = coords.top * scaleY
  const width = coords.width * scaleX
  const height = coords.height * scaleY

  // Parse transform attribute for rotate/flip handling
  // REF-01: Use effectiveTransform (already composed with parent transform)
  const transform = parseTransform(effectiveTransform || element.attrs.transform)

  // Skip non-renderable elements
  if (['defs', 'linearGradient', 'stop', 'filter', 'marker', 'clippath'].includes(tag)) {
    return null
  }

  switch (tag) {
    case 'rect': {
      const transformed = applyTransform(left, top, width, height, transform)
      const { rotate, flipH, flipV } = transformed
      const rx = Number(element.attrs.rx) || 0
      // ry: use explicit value if provided (including 0 for sharp corners), otherwise fall back to rx
      const ry = element.attrs.ry !== undefined ? Number(element.attrs.ry) || 0 : rx
      const rectWidth = Number(element.attrs.width) || 0
      const rectHeight = Number(element.attrs.height) || 0

      // D-21: Use roundedRectToPath when rx or ry > 0, otherwise rectToPath
      // D-25: rectWidth/Height and rx/ry must be scaled by scaleX/scaleY
      const effectiveRy = element.attrs.ry !== undefined ? ry : rx
      const path = (rx > 0 || effectiveRy > 0)
        ? roundedRectToPath(width, height, rx * scaleX, effectiveRy * scaleY)
        : rectToPath(0, 0, width, height)
      const strokeWidth = parseFloat(String(element.attrs['stroke-width'] || '0'))
      const result: PPTShapeElement = {
        id,
        type: 'shape',
        left: transformed.left,
        top: transformed.top,
        width: transformed.width,
        height: transformed.height,
        rotate,
        viewBox: [transformed.width, transformed.height],
        path,
        fixedRatio: false,
        fill: colorToHex(element.attrs.fill) || '#000000',
        opacity: element.attrs.opacity ? parseFloat(element.attrs.opacity) : undefined,
      }
      // D-15: attrs.gradient resolved at parse time — output as PPTShapeElement.gradient
      if (element.attrs.gradient) {
        result.gradient = element.attrs.gradient
        // @ts-expect-error - fill may not exist on result
        delete result.fill
      } else {
        // D-18: fill-opacity < 1 → rgba() color
        const fillOpacity = element.attrs['fill-opacity']
        if (fillOpacity && parseFloat(String(fillOpacity)) < 1) {
          result.fill = colorToRgba(String(element.attrs.fill), parseFloat(String(fillOpacity)))
        }
      }
      if (flipH) result.flipH = true
      if (flipV) result.flipV = true
      if (element.attrs.stroke) {
        const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity'])
        result.outline = {
          style: parseDashArray(element.attrs['stroke-dasharray']),
          width: strokeWidth || 1,
          color,
          ...(opacity !== undefined && { opacity }),
        }
      }
      // D-22: SVG filter="url(#shadowId)" → shadow (resolved at parse time)
      if (element.attrs.shadow) {
        result.shadow = element.attrs.shadow
      }
      // D-23: groupId propagation from parent g element
      if (groupId) {
        result.groupId = groupId
      }
      return result
    }

    case 'circle': {
      const transformed = applyTransform(left, top, width, height, transform)
      const { rotate, flipH, flipV } = transformed
      const strokeWidth = parseFloat(String(element.attrs['stroke-width'] || '0'))
      // FIX: Use scaled dimensions for path to match transformed.width/height
      // circleToPath creates circle centered at (r, r) with radius r, path bounds = [0, 0, 2*r, 2*r]
      const scaledR = transformed.width / 2  // = r * scaleX
      const path = circleToPath(scaledR, scaledR, scaledR)
      const result: PPTShapeElement = {
        id,
        type: 'shape',
        left: transformed.left,
        top: transformed.top,
        width: transformed.width,
        height: transformed.height,
        rotate,
        viewBox: [transformed.width, transformed.height],
        path,
        fixedRatio: false,
        fill: 'none',  // Default to none, override below if fill exists
        opacity: element.attrs.opacity ? parseFloat(element.attrs.opacity) : undefined,
      }
      // D-15: attrs.gradient resolved at parse time — output as PPTShapeElement.gradient
      if (element.attrs.gradient) {
        result.gradient = element.attrs.gradient
      } else if (element.attrs.fill && element.attrs.fill !== 'none') {
        // FIX: fill="none" means no fill, keep fill as 'none'
        const fillOpacity = element.attrs['fill-opacity']
        if (fillOpacity && parseFloat(String(fillOpacity)) < 1) {
          result.fill = colorToRgba(String(element.attrs.fill), parseFloat(String(fillOpacity)))
        } else {
          result.fill = colorToHex(element.attrs.fill)
        }
      }
      if (flipH) result.flipH = true
      if (flipV) result.flipV = true
      if (element.attrs.stroke) {
        const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity'])
        result.outline = {
          style: parseDashArray(element.attrs['stroke-dasharray']),
          width: strokeWidth || 1,
          color,
          ...(opacity !== undefined && { opacity }),
        }
      }
      // D-22: SVG filter="url(#shadowId)" → shadow
      if (element.attrs.shadow) {
        result.shadow = element.attrs.shadow
      }
      // D-23: groupId propagation from parent g element
      if (groupId) {
        result.groupId = groupId
      }
      return result
    }

    case 'ellipse': {
      const transformed = applyTransform(left, top, width, height, transform)
      const { rotate, flipH, flipV } = transformed
      // D-26/D-27: Scale cx/cy and rx/ry by scaleX/scaleY
      const scaledCx = (Number(element.attrs.cx) || 0) * scaleX
      const scaledCy = (Number(element.attrs.cy) || 0) * scaleY
      const scaledRx = Math.abs(Number(element.attrs.rx) || 0) * Math.abs(scaleX)
      const scaledRy = Math.abs(Number(element.attrs.ry) || 0) * Math.abs(scaleY)
      // D-26: Apply rotation to cx/cy if rotate center is defined
      let finalCx = scaledCx
      let finalCy = scaledCy
      if (transform.rotateCX !== undefined && transform.rotateCY !== undefined) {
        const rotated = applyRotateWithCenter(
          scaledCx,
          scaledCy,
          transform.rotateDeg!,
          transform.rotateCX * scaleX,
          transform.rotateCY * scaleY,
        )
        finalCx = rotated.x
        finalCy = rotated.y
      }
      const path = ellipseToPath(finalCx, finalCy, scaledRx, scaledRy)
      const strokeWidth = parseFloat(String(element.attrs['stroke-width'] || '0'))
      const result: PPTShapeElement = {
        id,
        type: 'shape',
        left: transformed.left,
        top: transformed.top,
        width: transformed.width,
        height: transformed.height,
        rotate,
        viewBox: [transformed.width, transformed.height],
        path,
        fixedRatio: false,
        fill: colorToHex(element.attrs.fill) || '#000000',
        opacity: element.attrs.opacity ? parseFloat(element.attrs.opacity) : undefined,
      }
      // D-15: attrs.gradient resolved at parse time — output as PPTShapeElement.gradient
      if (element.attrs.gradient) {
        result.gradient = element.attrs.gradient
        // @ts-expect-error - fill may not exist on result
        delete result.fill
      } else {
        // D-18: fill-opacity < 1 → rgba() color
        const fillOpacity = element.attrs['fill-opacity']
        if (fillOpacity && parseFloat(String(fillOpacity)) < 1) {
          result.fill = colorToRgba(String(element.attrs.fill), parseFloat(String(fillOpacity)))
        }
      }
      if (flipH) result.flipH = true
      if (flipV) result.flipV = true
      if (element.attrs.stroke) {
        const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity'])
        result.outline = {
          style: parseDashArray(element.attrs['stroke-dasharray']),
          width: strokeWidth || 1,
          color,
          ...(opacity !== undefined && { opacity }),
        }
      }
      // D-22: SVG filter="url(#shadowId)" → shadow
      if (element.attrs.shadow) {
        result.shadow = element.attrs.shadow
      }
      // D-23: groupId propagation from parent g element
      if (groupId) {
        result.groupId = groupId
      }
      return result
    }

    case 'path': {
      // Check if this is an icon element (has data-icon-width/height)
      const iconW = element.attrs['data-icon-width'] != null ? parseFloat(String(element.attrs['data-icon-width'])) : undefined
      const iconH = element.attrs['data-icon-height'] != null ? parseFloat(String(element.attrs['data-icon-height'])) : undefined

      if (iconW !== undefined && iconH !== undefined) {
        // Icon path: use dedicated method
        const iconResult = transformIconElement(element, coords, iconW, iconH, scaleX, scaleY, transform, id)
        if (iconResult) {
          console.log(`[icon-shape] id=${id} path="${iconResult.path.substring(0, 40)}${iconResult.path.length > 40 ? '...' : ''}" left=${iconResult.left.toFixed(2)} top=${iconResult.top.toFixed(2)} size=${iconResult.width.toFixed(2)}x${iconResult.height.toFixed(2)}`)
          return iconResult
        }
      }

      // Normal path handling below
      const transformed = applyTransform(left, top, width, height, transform)
      const { rotate, flipH, flipV } = transformed
      const d = typeof element.attrs.d === 'string' ? element.attrs.d : ''
      const strokeWidth = parseFloat(String(element.attrs['stroke-width'] || '0'))
      const fillValue = element.attrs.fill
      const isFillNone = fillValue === 'none' || fillValue === 'transparent'

      const resultWidth = transformed.width
      const resultHeight = transformed.height
      const viewBoxW = transformed.width / Math.abs(scaleX)
      const viewBoxH = transformed.height / Math.abs(scaleY)
      const pathD = toAbsolutePath(d)

      const result: PPTShapeElement = {
        id,
        type: 'shape',
        left: transformed.left,
        top: transformed.top,
        width: resultWidth,
        height: resultHeight,
        rotate,
        viewBox: [viewBoxW, viewBoxH],
        path: pathD,
        fixedRatio: false,
        fill: isFillNone ? 'none' : (colorToHex(fillValue) || '#000000'),
        opacity: element.attrs.opacity ? parseFloat(element.attrs.opacity) : undefined,
      }
      // D-15: attrs.gradient resolved at parse time — output as PPTShapeElement.gradient
      if (element.attrs.gradient) {
        result.gradient = element.attrs.gradient
        // @ts-expect-error - fill may not exist on result
        delete result.fill
      } else if (!isFillNone) {
        // D-18: fill-opacity < 1 → rgba() color (only if fill is not "none")
        const fillOpacity = element.attrs['fill-opacity']
        if (fillOpacity && parseFloat(String(fillOpacity)) < 1) {
          result.fill = colorToRgba(String(element.attrs.fill), parseFloat(String(fillOpacity)))
        }
      }
      if (flipH) result.flipH = true
      if (flipV) result.flipV = true
      if (element.attrs.stroke) {
        const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity'])
        result.outline = {
          style: parseDashArray(element.attrs['stroke-dasharray']),
          width: strokeWidth || 1,
          color,
          ...(opacity !== undefined && { opacity }),
        }
        // D-37: For stroke-only paths with height=0 (horizontal lines) or width=0 (vertical lines),
        // set minimum dimension to stroke-width so the stroke is visible
        if (result.height === 0 && strokeWidth > 0) {
          result.height = strokeWidth * scaleY
        }
        if (result.width === 0 && strokeWidth > 0) {
          result.width = strokeWidth * scaleX
        }
      }
      // D-22: SVG filter="url(#shadowId)" → shadow
      if (element.attrs.shadow) {
        result.shadow = element.attrs.shadow
      }
      // D-23: groupId propagation from parent g element
      if (groupId) {
        result.groupId = groupId
      }
      return result
    }

    case 'polygon': {
      const transformed = applyTransform(left, top, width, height, transform)
      const { rotate, flipH, flipV } = transformed
      const pointsStr = typeof element.attrs.points === 'string' ? element.attrs.points : ''
      // D-24: Scale polygon points by scaleX/scaleY
      const points = parsePointsString(pointsStr).map(([x, y]) => [x * scaleX, y * scaleY] as [number, number])
      const path = polygonToPath(points)
      const strokeWidth = parseFloat(String(element.attrs['stroke-width'] || '0'))
      const result: PPTShapeElement = {
        id,
        type: 'shape',
        left: transformed.left,
        top: transformed.top,
        width: transformed.width,
        height: transformed.height,
        rotate,
        viewBox: [transformed.width, transformed.height],
        path,
        fixedRatio: false,
        fill: colorToHex(element.attrs.fill) || '#000000',
        opacity: element.attrs.opacity ? parseFloat(element.attrs.opacity) : undefined,
      }
      // D-15: attrs.gradient resolved at parse time — output as PPTShapeElement.gradient
      if (element.attrs.gradient) {
        result.gradient = element.attrs.gradient
        // @ts-expect-error - fill may not exist on result
        delete result.fill
      } else {
        // D-18: fill-opacity < 1 → rgba() color
        const fillOpacity = element.attrs['fill-opacity']
        if (fillOpacity && parseFloat(String(fillOpacity)) < 1) {
          result.fill = colorToRgba(String(element.attrs.fill), parseFloat(String(fillOpacity)))
        }
      }
      if (flipH) result.flipH = true
      if (flipV) result.flipV = true
      if (element.attrs.stroke) {
        const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity'])
        result.outline = {
          style: parseDashArray(element.attrs['stroke-dasharray']),
          width: strokeWidth || 1,
          color,
          ...(opacity !== undefined && { opacity }),
        }
      }
      // D-22: SVG filter="url(#shadowId)" → shadow
      if (element.attrs.shadow) {
        result.shadow = element.attrs.shadow
      }
      // D-23: groupId propagation from parent g element
      if (groupId) {
        result.groupId = groupId
      }
      return result
    }

    case 'polyline': {
      const transformed = applyTransform(left, top, width, height, transform)
      const { rotate, flipH, flipV } = transformed
      const pointsStr = typeof element.attrs.points === 'string' ? element.attrs.points : ''
      // D-24: Scale polyline points by scaleX/scaleY
      const points = parsePointsString(pointsStr).map(([x, y]) => [x * scaleX, y * scaleY] as [number, number])
      const path = polylineToPath(points)
      const strokeWidth = parseFloat(String(element.attrs['stroke-width'] || '0'))
      const result: PPTShapeElement = {
        id,
        type: 'shape',
        left: transformed.left,
        top: transformed.top,
        width: transformed.width,
        height: transformed.height,
        rotate,
        viewBox: [transformed.width, transformed.height],
        path,
        fixedRatio: false,
        fill: colorToHex(element.attrs.fill) || 'none',
        opacity: element.attrs.opacity ? parseFloat(element.attrs.opacity) : undefined,
      }
      // D-15: attrs.gradient resolved at parse time — output as PPTShapeElement.gradient
      if (element.attrs.gradient) {
        result.gradient = element.attrs.gradient
        // @ts-expect-error - fill may not exist on result
        delete result.fill
      } else {
        // D-18: fill-opacity < 1 → rgba() color
        const fillOpacity = element.attrs['fill-opacity']
        if (fillOpacity && parseFloat(String(fillOpacity)) < 1) {
          result.fill = colorToRgba(String(element.attrs.fill), parseFloat(String(fillOpacity)))
        }
      }
      if (flipH) result.flipH = true
      if (flipV) result.flipV = true
      if (element.attrs.stroke) {
        const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity'])
        result.outline = {
          style: parseDashArray(element.attrs['stroke-dasharray']),
          width: strokeWidth || 1,
          color,
          ...(opacity !== undefined && { opacity }),
        }
      }
      // D-22: SVG filter="url(#shadowId)" → shadow
      if (element.attrs.shadow) {
        result.shadow = element.attrs.shadow
      }
      // D-23: groupId propagation from parent g element
      if (groupId) {
        result.groupId = groupId
      }
      return result
    }

    case 'line': {
      const x1 = Number(element.attrs.x1) || 0
      const y1 = Number(element.attrs.y1) || 0
      const x2 = Number(element.attrs.x2) || 0
      const y2 = Number(element.attrs.y2) || 0
      // For lines WITHOUT transform: start/end are [0,0] to [width,0] relative to bounding box
      // For lines WITH transform: need to compute relative positions using transform offsets
      let startRelX: number, startRelY: number, endRelX: number, endRelY: number
      if ((transform.translateX || 0) === 0 && (transform.translateY || 0) === 0 && (transform.scaleX || 1) === 1 && (transform.scaleY || 1) === 1) {
        // No transform - simple relative coordinates
        startRelX = 0
        startRelY = 0
        endRelX = width
        endRelY = 0
      } else {
        // With transform - compute relative positions from transformed coordinates
        const tx = transform.translateX || 0
        const ty = transform.translateY || 0
        const x1t = x1 + tx
        const y1t = y1 + ty
        const x2t = x2 + tx
        const y2t = y2 + ty
        startRelX = (x1t - coords.left) * scaleX
        startRelY = (y1t - coords.top) * scaleY
        endRelX = (x2t - coords.left) * scaleX
        endRelY = (y2t - coords.top) * scaleY
      }
      const result: PPTLineElement = {
        id,
        type: 'line',
        left,
        top,
        width,
        start: [startRelX, startRelY],
        end: [endRelX, endRelY],
        style: parseDashArray(element.attrs['stroke-dasharray']),
        color: '#000000',  // Default, will be overwritten below
        points: ['', ''],
      }
      // D-24: stroke-width → PPTLineElement.width, default to 1 when absent or 0
      const strokeWidth = parseFloat(String(element.attrs['stroke-width'] || '0'))
      result.width = strokeWidth || 1
      // D-19: stroke color/opacity handling
      const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity'])
      result.color = color
      // D-23: groupId propagation from parent g element
      if (groupId) {
        result.groupId = groupId
      }
      return result
    }

    case 'text': {
      const transformed = applyTransform(left, top, width, height, transform)
      const { rotate } = transformed
      // Force Microsoft YaHei for all text (width calculation and output)
      const fontFamily = element.attrs['font-family'] || 'Microsoft YaHei'
      const fontSize = Number(String(element.attrs["font-size"] || "16")) || 16
      const scaledFontSize = fontSize * scaleY
      const letterSpacing = parseFloat(String(element.attrs['letter-spacing'] || '0'))
      const fillColor = element.attrs.fill || '#000000'
      const fillOpacity = element.attrs['fill-opacity']
      const hasRgba = fillOpacity && parseFloat(String(fillOpacity)) < 1
      const fontWeight = element.attrs['font-weight']
      const isBold = fontWeight === 'bold' || fontWeight === '600' || fontWeight === '700'
      const fontStyle = element.attrs['font-style']
      const isItalic = fontStyle === 'italic'

      // D-??: Build content HTML with baseline-shift support (sup/sub tags)
      const { html: contentHtml, text: content } = buildTextContentFromElement(element, fontSize, scaleY)

      // Measure text using resvg-js with fallback to heuristic
      let textWidth: number
      let textHeight: number
      let textTop: number

      try {
        const textAnchorAttr = element.attrs['text-anchor']
        const xAttr = element.attrs['x'] ? Number(element.attrs['x']) : undefined
        const measurementInput: TextMeasurementInput = {
          content,
          fontFamily,
          fontSize,
          fontWeight: isBold ? 'bold' : 'normal',
          fontStyle: isItalic ? 'italic' : 'normal',
          letterSpacing,
          fill: fillColor,
          textAnchor: textAnchorAttr,
          x: xAttr,
        }
        const measured = await measureTextElement(measurementInput)
        // Add 25px safety margin to prevent text wrapping due to measurement discrepancy
        const TEXT_WIDTH_SAFETY_MARGIN = 25
        textWidth = measured.width * scaleX + TEXT_WIDTH_SAFETY_MARGIN
        textHeight = measured.height * scaleY
        // SVG text y is baseline; convert to top by subtracting ascent distance
        // FIX: Use fixed 0.8 ascent ratio instead of measured.y (which varies by glyph shape)
        // This ensures same y coordinate → same textTop regardless of content
        const ASCENT_RATIO = 0.8
        textTop = transformed.top - fontSize * ASCENT_RATIO * scaleY
      } catch {
        // D-35: MEAS-06 fallback: heuristic estimate when resvg-js measurement fails
        textWidth = fontSize * content.length * 0.6
        textHeight = scaledFontSize
        // Fallback: SVG y is baseline, convert to top using heuristic (ascent ≈ 0.8 * fontSize)
        // Note: transformed.top is already scaled, so subtract scaled ascent directly
        textTop = transformed.top - fontSize * 0.8 * scaleY
      }


      // X轴: 考虑 text-anchor 调整 left
      // SVG text x 对于 middle/end 是参考点，需要偏移
      const textAnchorForLeft = element.attrs['text-anchor']
      let textLeft = transformed.left
      if (textAnchorForLeft === 'middle') {
        textLeft = transformed.left - textWidth / 2
      } else if (textAnchorForLeft === 'end') {
        textLeft = transformed.left - textWidth
      }

      // D-09: text-anchor → text-align on <p> style
      const textAnchor = element.attrs['text-anchor']
      let textAlign = ''
      if (textAnchor === 'start') textAlign = 'left'
      else if (textAnchor === 'end') textAlign = 'right'
      else if (textAnchor === 'middle') textAlign = 'center'
      const pStyle = textAlign ? `text-align: ${textAlign}` : ''

      // Use scaledFontSize for outer content span (matches the visual scale from viewBox→canvas)
      let spanStyle = `font-size: ${scaledFontSize}px`
      if (hasRgba) {
        const rgbaColor = colorToRgba(fillColor, parseFloat(String(fillOpacity)))
        spanStyle += `; color: ${rgbaColor}`
      }

      // If contentHtml doesn't contain HTML tags (raw text), wrap it in a span with font-size
      // This handles simple text elements without tspan children
      const hasHtmlTags = contentHtml.includes('<')
      const innerSpan = hasHtmlTags ? contentHtml : `<span style="${spanStyle}">${contentHtml}</span>`
      // ProseMirror marks order: strong > em > fontsize > fontname > forecolor > backcolor > underline > strikethrough
      let weightedContent = innerSpan
      if (isItalic) weightedContent = `<em>${weightedContent}</em>`
      if (isBold) weightedContent = `<strong>${weightedContent}</strong>`
      const richContent = `<p${pStyle ? ` style="${pStyle}"` : ''}>${weightedContent}</p>`

      // D-07: writing-mode vertical-rl/vertical-lr → vertical: true
      const writingMode = element.attrs['writing-mode']
      const vertical = writingMode === 'vertical-rl' || writingMode === 'vertical-lr'

      // D-09: fixedHeight based on SVG height attribute presence
      const fixedHeight = !!element.attrs.height

      // D-26: inset=[0,0,0,0] to avoid 10px default padding causing coordinate offset
      const baseResult = {
        rotate,
        defaultFontName: fontFamily,
        defaultColor: colorToHex(fillColor) || '#000000',
        lineHeight: 1,
        opacity: element.attrs.opacity ? parseFloat(String(element.attrs.opacity)) : undefined,
        shadow: undefined as undefined,
        vAlign: 'middle' as const,
        fixedHeight,
        wordSpace: 0,
        paragraphSpace: 5,
        vertical,
        inset: [0, 0, 0, 0] as [number, number, number, number],
      }

      // Check if this is multiline text (has tspan with x attribute)
      // Rule: 有 x = 换行（多行文本），无 x = 同行连续排列
      const isMultiline = hasLineBreakTspans(element)

      if (isMultiline) {
        // Multiline text: extract each tspan as separate text element
        // Pass parent text's SVG x coordinate so tspan positions can be calculated correctly
        const parentSvgX = parseFloat(String(element.attrs['x'] || '0'))
        const tspanElements = extractTspansWithPosition(
          element,
          textLeft,
          textTop,
          fontSize,
          scaleX,
          scaleY,
          parentSvgX,
        )

        const results: PPTTextElement[] = tspanElements.map((tspan, idx) => {
          // Apply text-level strong/em styles to each line's content
          let lineContent = tspan.htmlContent
          if (isItalic) lineContent = `<em>${lineContent}</em>`
          if (isBold) lineContent = `<strong>${lineContent}</strong>`
          const tspanRichContent = `<p${pStyle ? ` style="${pStyle}"` : ''}>${lineContent}</p>`
          const result: PPTTextElement = {
            id: idx === 0 ? id : `${id}-line-${idx}`,
            type: 'text',
            left: tspan.left,
            top: tspan.top,
            width: textWidth,
            height: tspan.fontSize * 1.2,
            defaultFontSize: tspan.fontSize * scaleY,
            content: tspanRichContent,
            ...baseResult,
          }
          if (groupId) {
            result.groupId = groupId
          }
          return result
        })

        return results
      } else {
        // Single line or inline content: single text element
        const result: PPTTextElement = {
          id,
          type: 'text',
          left: textLeft,
          top: textTop,
          width: textWidth,
          height: textHeight,
          defaultFontSize: scaledFontSize,
          content: richContent,
          ...baseResult,
        }
        // D-19: stroke color/opacity handling for text outline
        if (element.attrs.stroke) {
          const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity'])
          result.outline = { color, width: 1 }
          if (opacity !== undefined) result.outline.opacity = opacity
        }
        // D-23: groupId propagation from parent g element
        if (groupId) {
          result.groupId = groupId
        }
        return result
      }
    }

    case 'image': {
      const transformed = applyTransform(left, top, width, height, transform)
      const { rotate, flipH, flipV } = transformed
      // Per PITFALL 1: href may be xlink:href or href
      const src = String(element.attrs['xlink:href'] || element.attrs.href || '')
      const result: PPTImageElement = {
        id,
        type: 'image',
        left: transformed.left,
        top: transformed.top,
        width: transformed.width,
        height: transformed.height,
        rotate,
        fixedRatio: true,
        src,
      }
      if (flipH) result.flipH = true
      if (flipV) result.flipV = true
      // D-25: image with stroke → outline
      if (element.attrs.stroke) {
        const strokeWidthAttr = element.attrs['stroke-width']
        const strokeWidth = strokeWidthAttr !== undefined ? parseFloat(String(strokeWidthAttr)) : 1
        if (strokeWidth > 0) {
          const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity'])
          result.outline = {
            width: strokeWidth,
            color,
            ...(opacity !== undefined && { opacity }),
          }
        }
      }
      // D-22: shadow from filter def (IMGE-02)
      if (element.attrs.shadow) {
        result.shadow = element.attrs.shadow
      }
      // D-23: groupId propagation from parent g element
      if (groupId) {
        result.groupId = groupId
      }
      return result
    }

    case 'g':
      // Groups are not PPTElements - skip (children processed separately)
      return null

    default:
      // Unknown elements - skip
      return null
  }
}

/**
 * Transform an entire SVG parse result to PPTElement array.
 * Per D-06: output format { elements: PPTElement[] }
 * Per D-07: text/tspan -> PPTTextElement, image -> PPTImageElement, others -> PPTShapeElement
 * @param ast - Parsed SVG result (root + viewBox + width/height)
 * @param targetCanvas - Target canvas size [width, height], defaults to [1000, 562.5]
 */
/**
 * Compose two transform strings into a single transform string.
 * Parent transform is applied first, then child transform.
 */
function composeTransforms(parentTransform: string | undefined, childTransform: string | undefined): string | undefined {
  if (!parentTransform && !childTransform) return undefined
  if (!parentTransform) return childTransform
  if (!childTransform) return parentTransform
  // Both exist: apply parent then child
  return `${parentTransform} ${childTransform}`
}

export async function transformToPPTElement(
  ast: SvgParseResult,
  targetCanvas: [number, number] = [1000, 562.5],
): Promise<PPTElement[]> {
  // REF-03: Preprocess clipPath definitions before transform
  preprocessClipPaths(ast)

  const elements: PPTElement[] = []

  async function walk(
    element: SvgElement,
    viewBox: [number, number, number, number],
    currentGroupId?: string,
    parentTransform?: string,
  ) {
    const tag = element.type.toLowerCase()

    // D-23: When tag='g' with id, update groupId context for children
    // Children inherit parent g id as their groupId. Nested g: innermost id takes precedence.
    // If g has no id, children get undefined (break the chain - no inheritance through unnamed g)
    const isG = tag === 'g'
    const effectiveGroupId = isG ? (element.attrs.id || undefined) : currentGroupId

    // Accumulate parent transform: child's transform is composed with parent's
    const effectiveTransform = composeTransforms(parentTransform, element.attrs.transform)

    // Process children (for groups - g elements themselves are not output)
    for (const child of element.children) {
      if (child.type.toLowerCase() === 'g') {
        // Recursively process group children with inherited/overridden groupId and accumulated transform
        await walk(child, viewBox, effectiveGroupId, effectiveTransform)
      } else {
        // Skip non-renderable container elements
        if (!['defs', 'linearGradient', 'stop', 'filter', 'marker', 'clippath'].includes(child.type.toLowerCase())) {
          // REF-01: Pass effectiveTransform to mapCoordinates instead of mutating child.attrs.transform
          const pptel = await transformElement(child, viewBox, elements.length, targetCanvas, effectiveGroupId, effectiveTransform)
          if (pptel !== null) {
            if (Array.isArray(pptel)) {
              elements.push(...pptel)
            } else {
              elements.push(pptel)
            }
          }
        }
      }
    }
  }

  await walk(ast.root, ast.viewBox)
  return elements
}
