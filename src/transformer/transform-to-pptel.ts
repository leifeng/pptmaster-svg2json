import { v4 as uuidv4 } from 'uuid'
import { SvgParseResult, SvgElement } from '../types/ast'
import { mapCoordinates, parseTransform } from '../mapper/coordinate-mapper'
import { applyTransform } from './apply-transform'
import { rectToPath, circleToPath, ellipseToPath, lineToPath, polygonToPath } from '../shapes/shape-to-path'
import type { PPTElement, PPTTextElement, PPTShapeElement, PPTLineElement, PPTImageElement, LineStyleType } from '../slides'

export type { PPTElement }

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
 */
function extractTextContentFromElement(element: SvgElement): string {
  let content = element.text || ''

  // Process tspan children
  for (const child of element.children) {
    if (child.type === 'tspan') {
      content += extractTextContentFromElement(child)
    }
  }

  return content
}

/**
 * Transform a single SVG element to PPTElement.
 * @param element - SVG element to transform
 * @param viewBox - SVG viewBox [minX, minY, width, height]
 * @param index - Element index in the output
 * @param targetCanvas - Target canvas size [width, height], defaults to [1000, 562.5]
 */
export function transformElement(
  element: SvgElement,
  viewBox: [number, number, number, number],
  index: number,
  targetCanvas: [number, number] = [1000, 562.5],
): PPTElement | null {
  const tag = element.type.toLowerCase()
  const coords = mapCoordinates(element, viewBox)
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
  const transform = parseTransform(element.attrs.transform)

  // Skip non-renderable elements
  if (['defs', 'linearGradient', 'stop', 'filter', 'marker', 'clippath'].includes(tag)) {
    return null
  }

  switch (tag) {
    case 'rect': {
      const transformed = applyTransform(left, top, width, height, transform)
      const { rotate, flipH, flipV } = transformed
      const path = rectToPath(
        Number(element.attrs.x) || 0,
        Number(element.attrs.y) || 0,
        Number(element.attrs.width) || 0,
        Number(element.attrs.height) || 0,
      )
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
        delete result.fill
      } else {
        // D-18: fill-opacity < 1 → rgba() color
        const fillOpacity = element.attrs['fill-opacity']
        if (fillOpacity && parseFloat(fillOpacity) < 1) {
          result.fill = colorToRgba(element.attrs.fill, parseFloat(fillOpacity))
        }
      }
      if (flipH) result.flipH = true
      if (flipV) result.flipV = true
      if (element.attrs.stroke) {
        result.outline = {
          style: parseDashArray(element.attrs['stroke-dasharray']),
          width: strokeWidth || 1,
          color: colorToHex(element.attrs.stroke),
        }
        // D-19: stroke-opacity → outline.opacity
        const strokeOpacity = element.attrs['stroke-opacity']
        if (strokeOpacity !== undefined) {
          result.outline.opacity = parseFloat(strokeOpacity)
        }
      }
      return result
    }

    case 'circle': {
      const transformed = applyTransform(left, top, width, height, transform)
      const { rotate, flipH, flipV } = transformed
      const cx = Number(element.attrs.cx) || 0
      const cy = Number(element.attrs.cy) || 0
      const r = Number(element.attrs.r) || 0
      const path = circleToPath(cx, cy, r)
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
        delete result.fill
      } else {
        // D-18: fill-opacity < 1 → rgba() color
        const fillOpacity = element.attrs['fill-opacity']
        if (fillOpacity && parseFloat(fillOpacity) < 1) {
          result.fill = colorToRgba(element.attrs.fill, parseFloat(fillOpacity))
        }
      }
      if (flipH) result.flipH = true
      if (flipV) result.flipV = true
      if (element.attrs.stroke) {
        result.outline = {
          style: parseDashArray(element.attrs['stroke-dasharray']),
          width: strokeWidth || 1,
          color: colorToHex(element.attrs.stroke),
        }
        // D-19: stroke-opacity → outline.opacity
        const strokeOpacity = element.attrs['stroke-opacity']
        if (strokeOpacity !== undefined) {
          result.outline.opacity = parseFloat(strokeOpacity)
        }
      }
      return result
    }

    case 'ellipse': {
      const transformed = applyTransform(left, top, width, height, transform)
      const { rotate, flipH, flipV } = transformed
      const cx = Number(element.attrs.cx) || 0
      const cy = Number(element.attrs.cy) || 0
      const rx = Number(element.attrs.rx) || 0
      const ry = Number(element.attrs.ry) || 0
      const path = ellipseToPath(cx, cy, rx, ry)
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
        delete result.fill
      } else {
        // D-18: fill-opacity < 1 → rgba() color
        const fillOpacity = element.attrs['fill-opacity']
        if (fillOpacity && parseFloat(fillOpacity) < 1) {
          result.fill = colorToRgba(element.attrs.fill, parseFloat(fillOpacity))
        }
      }
      if (flipH) result.flipH = true
      if (flipV) result.flipV = true
      if (element.attrs.stroke) {
        result.outline = {
          style: parseDashArray(element.attrs['stroke-dasharray']),
          width: strokeWidth || 1,
          color: colorToHex(element.attrs.stroke),
        }
        // D-19: stroke-opacity → outline.opacity
        const strokeOpacity = element.attrs['stroke-opacity']
        if (strokeOpacity !== undefined) {
          result.outline.opacity = parseFloat(strokeOpacity)
        }
      }
      return result
    }

    case 'path': {
      const transformed = applyTransform(left, top, width, height, transform)
      const { rotate, flipH, flipV } = transformed
      // Per D-03: path elements keep original d attribute unchanged
      const d = typeof element.attrs.d === 'string' ? element.attrs.d : ''
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
        path: d,
        fixedRatio: false,
        fill: colorToHex(element.attrs.fill) || '#000000',
        opacity: element.attrs.opacity ? parseFloat(element.attrs.opacity) : undefined,
      }
      // D-15: attrs.gradient resolved at parse time — output as PPTShapeElement.gradient
      if (element.attrs.gradient) {
        result.gradient = element.attrs.gradient
        delete result.fill
      } else {
        // D-18: fill-opacity < 1 → rgba() color
        const fillOpacity = element.attrs['fill-opacity']
        if (fillOpacity && parseFloat(fillOpacity) < 1) {
          result.fill = colorToRgba(element.attrs.fill, parseFloat(fillOpacity))
        }
      }
      if (flipH) result.flipH = true
      if (flipV) result.flipV = true
      if (element.attrs.stroke) {
        result.outline = {
          style: parseDashArray(element.attrs['stroke-dasharray']),
          width: strokeWidth || 1,
          color: colorToHex(element.attrs.stroke),
        }
        // D-19: stroke-opacity → outline.opacity
        const strokeOpacity = element.attrs['stroke-opacity']
        if (strokeOpacity !== undefined) {
          result.outline.opacity = parseFloat(strokeOpacity)
        }
      }
      return result
    }

    case 'polygon': {
      const transformed = applyTransform(left, top, width, height, transform)
      const { rotate, flipH, flipV } = transformed
      const pointsStr = typeof element.attrs.points === 'string' ? element.attrs.points : ''
      const points = parsePointsString(pointsStr)
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
        delete result.fill
      } else {
        // D-18: fill-opacity < 1 → rgba() color
        const fillOpacity = element.attrs['fill-opacity']
        if (fillOpacity && parseFloat(fillOpacity) < 1) {
          result.fill = colorToRgba(element.attrs.fill, parseFloat(fillOpacity))
        }
      }
      if (flipH) result.flipH = true
      if (flipV) result.flipV = true
      if (element.attrs.stroke) {
        result.outline = {
          style: parseDashArray(element.attrs['stroke-dasharray']),
          width: strokeWidth || 1,
          color: colorToHex(element.attrs.stroke),
        }
        // D-19: stroke-opacity → outline.opacity
        const strokeOpacity = element.attrs['stroke-opacity']
        if (strokeOpacity !== undefined) {
          result.outline.opacity = parseFloat(strokeOpacity)
        }
      }
      return result
    }

    case 'polyline': {
      const transformed = applyTransform(left, top, width, height, transform)
      const { rotate, flipH, flipV } = transformed
      const pointsStr = typeof element.attrs.points === 'string' ? element.attrs.points : ''
      const points = parsePointsString(pointsStr)
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
        delete result.fill
      } else {
        // D-18: fill-opacity < 1 → rgba() color
        const fillOpacity = element.attrs['fill-opacity']
        if (fillOpacity && parseFloat(fillOpacity) < 1) {
          result.fill = colorToRgba(element.attrs.fill, parseFloat(fillOpacity))
        }
      }
      if (flipH) result.flipH = true
      if (flipV) result.flipV = true
      if (element.attrs.stroke) {
        result.outline = {
          style: parseDashArray(element.attrs['stroke-dasharray']),
          width: strokeWidth || 1,
          color: colorToHex(element.attrs.stroke),
        }
        // D-19: stroke-opacity → outline.opacity
        const strokeOpacity = element.attrs['stroke-opacity']
        if (strokeOpacity !== undefined) {
          result.outline.opacity = parseFloat(strokeOpacity)
        }
      }
      return result
    }

    case 'line': {
      const x1 = Number(element.attrs.x1) || 0
      const y1 = Number(element.attrs.y1) || 0
      const x2 = Number(element.attrs.x2) || 0
      const y2 = Number(element.attrs.y2) || 0
      const result: PPTLineElement = {
        id,
        type: 'line',
        left,
        top,
        width,
        start: [x1 * scaleX, y1 * scaleY],
        end: [x2 * scaleX, y2 * scaleY],
        style: parseDashArray(element.attrs['stroke-dasharray']),
        color: colorToHex(element.attrs.stroke) || '#000000',
        points: ['', ''],
      }
      return result
    }

    case 'text': {
      const transformed = applyTransform(left, top, width, height, transform)
      const { rotate } = transformed
      const content = extractTextContentFromElement(element)
      // Parse font-family: take first font, decode HTML entities, remove quotes
      const rawFontFamily = typeof element.attrs['font-family'] === 'string'
        ? element.attrs['font-family'].split(',')[0].trim()
        : 'Arial'
      const fontFamily = decodeHtmlEntities(rawFontFamily).replace(/"/g, '')
      const fontSize = Number(element.attrs['font-size']) || 16
      // Calculate text dimensions: height = fontSize + fontSize*0.14, width = charCount * fontSize
      const scaledFontSize = fontSize * scaleY
      const charCount = content.length
      const textWidth = charCount * scaledFontSize
      const textHeight = scaledFontSize + Math.round(scaledFontSize * 0.14)
      // SVG text y is baseline, convert to top edge for JSON with scaling
      // Formula: jsonTop = (svgY + fontSize * 0.75) * scale
      const textLeft = transformed.left
      const textTop = (transformed.top + fontSize * 0.75) * scaleY

      // D-09: text-anchor → text-align on <p> style
      const textAnchor = element.attrs['text-anchor']
      let textAlign = ''
      if (textAnchor === 'start') textAlign = 'left'
      else if (textAnchor === 'end') textAlign = 'right'
      else if (textAnchor === 'middle') textAlign = 'center'
      const pStyle = textAlign ? `text-align: ${textAlign}` : ''

      // D-11: font-weight bold/600/700 → <strong> mark
      const fontWeight = element.attrs['font-weight']
      const isBold = fontWeight === 'bold' || fontWeight === '600' || fontWeight === '700'

      // D-11: font-style italic → <em> mark
      const fontStyle = element.attrs['font-style']
      const isItalic = fontStyle === 'italic'

      // D-12: fill-opacity < 1 → rgba() color in span style
      const fillColor = element.attrs.fill || '#000000'
      const fillOpacity = element.attrs['fill-opacity']
      const hasRgba = fillOpacity && parseFloat(fillOpacity) < 1
      let spanStyle = `font-size: ${scaledFontSize}px`
      if (hasRgba) {
        const rgbaColor = colorToRgba(fillColor, parseFloat(fillOpacity))
        spanStyle += `; color: ${rgbaColor}`
      }

      // Build content HTML: <p style="text-align: ..."><strong><em><span style="...">content</span></em></strong></p>
      // ProseMirror marks order: strong > em > fontsize > fontname > forecolor > backcolor > underline > strikethrough
      const innerSpan = `<span style="${spanStyle}">${content}</span>`
      let weightedContent = innerSpan
      if (isItalic) weightedContent = `<em>${weightedContent}</em>`
      if (isBold) weightedContent = `<strong>${weightedContent}</strong>`
      const richContent = `<p${pStyle ? ` style="${pStyle}"` : ''}>${weightedContent}</p>`

      // D-07: writing-mode vertical-rl/vertical-lr → vertical: true
      const writingMode = element.attrs['writing-mode']
      const vertical = writingMode === 'vertical-rl' || writingMode === 'vertical-lr'

      // D-09: fixedHeight based on SVG height attribute presence
      const fixedHeight = !!element.attrs.height

      const result: PPTTextElement = {
        id,
        type: 'text',
        left: textLeft,
        top: textTop,
        width: textWidth,
        height: textHeight,
        defaultFontSize: scaledFontSize,
        rotate,
        content: richContent,
        defaultFontName: fontFamily,
        defaultColor: colorToHex(fillColor) || '#000000',
        lineHeight: 1.5,
        opacity: element.attrs.opacity ? parseFloat(element.attrs.opacity) : undefined,
        fill: colorToHex(fillColor) || '#000000',
        outline: { color: colorToHex(element.attrs.stroke) || '#000000', width: 1 },
        shadow: undefined,
        vAlign: 'middle',
        fixedHeight,
        wordSpace: 0,
        paragraphSpace: 5,
        vertical,
      }
      return result
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
export function transformToPPTElement(
  ast: SvgParseResult,
  targetCanvas: [number, number] = [1000, 562.5],
): PPTElement[] {
  const elements: PPTElement[] = []

  function walk(element: SvgElement, viewBox: [number, number, number, number]) {
    const tag = element.type.toLowerCase()

    // Skip non-renderable container elements
    if (!['defs', 'linearGradient', 'stop', 'filter', 'marker', 'clippath'].includes(tag)) {
      const pptel = transformElement(element, viewBox, elements.length, targetCanvas)
      if (pptel !== null) {
        elements.push(pptel)
      }
    }

    // Process children (for groups)
    for (const child of element.children) {
      walk(child, viewBox)
    }
  }

  walk(ast.root, ast.viewBox)
  return elements
}
