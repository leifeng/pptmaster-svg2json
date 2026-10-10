import { v4 as uuidv4 } from 'uuid'
import { SvgParseResult, SvgElement, TransformResult } from '../types/ast'
import { mapCoordinates, parseTransform } from '../mapper/coordinate-mapper'
import { applyTransform, applyRotateWithCenter } from './apply-transform'
import { preprocessClipPaths } from './clip-path-preprocessor'
import { rectToPath, roundedRectToPath, circleToPath, ellipseToPath, lineToPath, polygonToPath } from '../shapes/shape-to-path'
import { measureTextElement, TextMeasurementInput } from '../text-measurer'
import { toAbsolutePath, scalePathCoords, offsetPathCoords } from '../utils/path-utils'
import { shouldMerge, extractCommonStyle, createMergedShapeElement } from '../merger/path-merge'
import { log, logEnd } from '../utils'
import {
  NAMED_COLORS,
  TEXT_ANCHOR_MIDDLE_TOP_OFFSET,
  TEXT_WIDTH_SAFETY_MARGIN,
  FALLBACK_ASCENT_RATIO,
} from '../constants'


import type { PPTElement, PPTTextElement, PPTShapeElement, PPTLineElement, PPTImageElement, LineStyleType } from '../slides'

export type { PPTElement }

/**
 * Scale the `pos` field of a gradient's stops by a factor.
 * Used at the AST→PPTElement boundary to convert from SVG 0-1 normalized pos
 * to PPTist schema's 0-100 range.
 */
function scaleGradientPos(
  grad: PPTShapeElement['gradient'],
  factor: number,
): PPTShapeElement['gradient'] {
  if (!grad) return grad
  return {
    ...grad,
    colors: grad.colors.map(c => ({ pos: c.pos * factor, color: c.color })),
  }
}

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
    result.gradient = scaleGradientPos(element.attrs.gradient as any, 100)
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
  // "none" is a valid SVG fill value meaning no fill - return it as-is
  if (color.toLowerCase() === 'none') return 'none'
  // Already hex
  if (color.startsWith('#')) return color
  // Named color lookup
  if (NAMED_COLORS[color.toLowerCase()]) return NAMED_COLORS[color.toLowerCase()]
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
  if (NAMED_COLORS[color.toLowerCase()]) {
    const hex = NAMED_COLORS[color.toLowerCase()]
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

// =============================================================================
// Rich Text AST - 替代字符串拼接，更清晰可靠
// =============================================================================

/** AST 节点类型 */
type RichTextNode = TextNode | ElementNode

interface TextNode {
  type: 'text'
  content: string
  fontFamily?: string | null  // null = 继承父级
  fill?: string | null  // null = 继承父级
  fontStyle?: string | null  // null = 继承父级（italic/normal）— 仅叶子 text 节点，line 1492+ 走 transformTextElement 顶部包裹
  fontWeight?: string | null  // null = 继承父级（bold/normal）— 仅叶子 text 节点
  textDecoration?: string | null  // null = 继承父级（underline/none）— 仅叶子 text 节点
}

interface ElementNode {
  type: 'element'
  tag: 'span' | 'sub' | 'sup'
  fontSize: number | null  // null = 继承父级
  fill: string | null  // null = 继承父级
  fontFamily?: string | null  // null = 继承父级
  fontStyle?: string | null  // null = 继承父级（italic/normal）
  fontWeight?: string | null  // null = 继承父级（bold/normal）— 序列化为字符串
  textDecoration?: string | null  // null = 继承父级（underline/none）
  children: RichTextNode[]
}

/**
 * 递归构建 Rich Text AST
 * @param element - SVG 元素
 * @param parentFontSize - 父级 font-size（用于继承）
 * @param parentFontFamily - 父级 font-family（用于继承）
 * @param parentFill - 父级 fill 颜色（用于继承）
 * @param parentFontWeight - 父级 font-weight（已 resolved，'bold' 或数字，用于继承）
 * @param parentFontStyle - 父级 font-style（已 resolved，用于继承）
 * @param parentTextDecoration - 父级 text-decoration（已 resolved，用于继承）
 */
function buildRichTextAST(
  element: SvgElement,
  parentFontSize: number,
  parentFontFamily?: string | null,
  parentFill?: string | null,
  parentFontWeight?: string | null,
  parentFontStyle?: string | null,
  parentTextDecoration?: string | null,
): RichTextNode[] {
  const nodes: RichTextNode[] = []

  // 情况1：叶子节点（只有文本，没有 children）
  // 例如：<text>Hello</text> → element.text = "Hello", children = []
  if (element.text && element.children.length === 0) {
    return [{
      type: 'text',
      content: element.text,
      fontFamily: element.attrs['font-family'] ?? parentFontFamily ?? null,
      fill: element.attrs.fill ?? parentFill ?? null,
      // 修复 text-font-weight-loss-rootcause.md：
      // text 元素自身的 font-style / font-weight / text-decoration 也需保留，
      // 否则 <text font-weight="800">single line</text> 这类简单用法样式全丢。
      fontStyle: element.attrs['font-style'] !== undefined
        ? String(element.attrs['font-style'])
        : (parentFontStyle ?? null),
      fontWeight: element.attrs['font-weight'] !== undefined
        ? String(element.attrs['font-weight'])
        : (parentFontWeight ?? null),
      textDecoration: element.attrs['text-decoration'] !== undefined
        ? String(element.attrs['text-decoration'])
        : (parentTextDecoration ?? null),
    }]
  }

  // 情况2：有 children（包含 tspan 或 inline text）
  // With preserveOrder, children contain text nodes and tspan elements in document order
  // Each text node (type === 'text') represents text content before/after/between tspans
  //
  // With preserveOrder:
  // <text>Single head loses <tspan>−0.9 BLEU</tspan> vs h = 8</text>
  // children = [
  //   { type: 'text', text: 'Single head loses ' },
  //   { type: 'tspan', attrs: {...}, children: [...] },
  //   { type: 'text', text: 'vs h = 8' }
  // ]

  // 按顺序处理 children：文本片段1、tspan1、文本片段2、tspan2...
  for (const child of element.children) {
    if (child.type === 'tspan') {
      // 添加 tspan 元素
      const explicitFontSize = child.attrs['font-size'] !== undefined
        ? Number(child.attrs['font-size'])
        : null
      const explicitFontFamily = child.attrs['font-family'] !== undefined
        ? child.attrs['font-family']
        : null
      const explicitFill = child.attrs.fill !== undefined ? child.attrs.fill : null
      const explicitFontStyle: string | null = child.attrs['font-style'] !== undefined
        ? String(child.attrs['font-style'])
        : (parentFontStyle ?? null)
      const explicitFontWeight = child.attrs['font-weight'] !== undefined
        ? String(child.attrs['font-weight'])
        : (parentFontWeight ?? null)
      const explicitTextDecoration: string | null = child.attrs['text-decoration'] !== undefined
        ? String(child.attrs['text-decoration'])
        : (parentTextDecoration ?? null)
      const effectiveFontSize = explicitFontSize ?? parentFontSize
      const effectiveFontFamily = explicitFontFamily ?? parentFontFamily ?? null
      const effectiveFill = explicitFill ?? parentFill ?? null
      const baselineShift = child.attrs['baseline-shift']
      const tag: 'sub' | 'sup' | 'span' =
        baselineShift === 'sub' ? 'sub' :
        baselineShift === 'super' ? 'sup' : 'span'
      const childNodes = buildRichTextAST(
        child,
        effectiveFontSize,
        effectiveFontFamily,
        effectiveFill,
        explicitFontWeight,
        explicitFontStyle,
        explicitTextDecoration,
      )
      nodes.push({
        type: 'element',
        tag,
        fontSize: explicitFontSize,
        fill: explicitFill,
        fontFamily: explicitFontFamily,
        fontStyle: explicitFontStyle,
        fontWeight: explicitFontWeight,
        textDecoration: explicitTextDecoration,
        children: childNodes,
      })
    } else if (child.type === 'text' && child.text) {
      // inline text 片段 - 直接添加，不需要启发式分割
      nodes.push({
        type: 'text',
        content: child.text,
        fontFamily: parentFontFamily ?? null,
        fill: parentFill ?? null,
        fontStyle: parentFontStyle ?? null,
        fontWeight: parentFontWeight ?? null,
        textDecoration: parentTextDecoration ?? null,
      })
    }
  }

  return nodes
}

/**
 * 将文本内容分割成 N+1 个片段，用于 N 个 tspan
 * 使用空白位置进行智能分割
 */
function splitTextForTspans(textContent: string, numTspans: number): string[] {
  if (numTspans === 0) return [textContent]
  if (!textContent) return Array(numTspans + 1).fill('')

  const numParts = numTspans + 1
  const parts: string[] = []

  if (numParts === 2) {
    // 简单情况：分成两部分
    // 核心策略：
    // 1. 如果文本以完整句子结尾，说明 tspan 内容在句子之后，在最后一个句子边界分割
    // 2. 如果文本有多个句子，tspan 可能在第一个句子之后，在前 1/4 到 1/3 范围找句子边界
    // 3. 否则使用启发式在中间位置分割
    const textLen = textContent.length

    // 找所有句子结束位置（句号/问号/感叹号 + 空格）
    const sentenceBreaks: number[] = []
    for (let i = 0; i < textLen - 1; i++) {
      if ((textContent[i] === '.' || textContent[i] === '?' || textContent[i] === '!') && textContent[i + 1] === ' ') {
        sentenceBreaks.push(i + 1) // 分割点在标点后的空格位置
      }
    }

    // 策略1：文本以完整句子结尾（句号后面是 tspan 内容）
    // 直接在最后一个句子结束后分割
    if (sentenceBreaks.length > 0 && /[.!?]\s*$/.test(textContent.trim())) {
      const splitIndex = sentenceBreaks[sentenceBreaks.length - 1]
      if (splitIndex > 0 && splitIndex < textLen) {
        parts.push(textContent.substring(0, splitIndex).trim())
        parts.push(textContent.substring(splitIndex + 1).trim())
        return parts
      }
    }

    // 策略2：有多个句子边界，在前 1/4 位置附近找句子边界
    // 这处理 tspan 出现在第一个句子之后的情况
    if (sentenceBreaks.length > 1) {
      const earlyPoint = Math.floor(textLen / 4)
      // 找 earlyPoint 之后最近的句子边界
      let bestSplitIndex = -1
      for (const brk of sentenceBreaks) {
        if (brk > earlyPoint) {
          bestSplitIndex = brk
          break
        }
      }
      // 如果没找到，用第一个句子边界
      if (bestSplitIndex === -1) {
        bestSplitIndex = sentenceBreaks[0]
      }
      if (bestSplitIndex > 0 && bestSplitIndex < textLen) {
        parts.push(textContent.substring(0, bestSplitIndex).trim())
        parts.push(textContent.substring(bestSplitIndex + 1).trim())
        return parts
      }
    }

    // 策略3：只有一个句子边界且文本不以句子结尾
    // 说明 tspan 在句子中间，找前 1/3 位置的分号/逗号
    if (sentenceBreaks.length === 1) {
      const splitAt = sentenceBreaks[0]
      const earlyPoint = Math.floor(splitAt / 3)
      // 向前找分号（更可能的句子内分割点）
      let found = -1
      for (let i = earlyPoint; i < splitAt; i++) {
        if (textContent[i] === ';' && textContent[i + 1] === ' ') {
          found = i + 1
          break
        }
      }
      // 如果没找到分号，找逗号
      if (found === -1) {
        for (let i = earlyPoint; i < splitAt; i++) {
          if (textContent[i] === ',' && textContent[i + 1] === ' ') {
            found = i + 1
            break
          }
        }
      }
      if (found > 0) {
        parts.push(textContent.substring(0, found).trim())
        parts.push(textContent.substring(found + 1).trim())
        return parts
      }
    }

    // 策略4：最后的回退策略 - 在文本前 1/5 位置找空白分割
    const earlyPoint = Math.floor(textLen / 5)
    let splitIndex = earlyPoint

    // 向前找空白
    while (splitIndex > 0 && textContent[splitIndex] !== ' ') {
      splitIndex--
    }

    // 如果向前太远（到位置 0），向后找
    if (splitIndex <= 0) {
      splitIndex = earlyPoint
      while (splitIndex < textLen && textContent[splitIndex] !== ' ') {
        splitIndex++
      }
    }

    if (splitIndex > 0 && splitIndex < textLen) {
      parts.push(textContent.substring(0, splitIndex).trim())
      parts.push(textContent.substring(splitIndex + 1).trim())
    } else {
      parts.push(textContent.substring(0, Math.floor(textLen / 2)).trim())
      parts.push(textContent.substring(Math.floor(textLen / 2)).trim())
    }
    return parts
  }

  // 多个 tspan：均匀分割，在空白处断开
  const avgLength = textContent.length / numParts
  let start = 0
  for (let i = 0; i < numParts - 1; i++) {
    const targetEnd = start + avgLength
    let end = start + Math.floor(avgLength)
    // 向后找到空白字符
    while (end < textContent.length && textContent[end] !== ' ' && end < targetEnd + avgLength / 2) {
      end++
    }
    if (end >= textContent.length) {
      end = textContent.length
    }
    parts.push(textContent.substring(start, end).trim())
    // 跳过空白
    while (end < textContent.length && textContent[end] === ' ') {
      end++
    }
    start = end
  }
  // 最后一个部分
  parts.push(textContent.substring(start).trim())

  return parts
}

/**
 * 构造 span/sub/sup 的内联样式
 * 注意：不输出 font-family，由 PPTist 默认字体处理
 */
function buildSpanStyle(opts: {
  fontSize: number
  fontFamily?: string | null  // 保留参数以维持 API，但不再输出到 HTML
  fill?: string | null
  fontStyle?: string | null
  fontWeight?: string | number | null
  textDecoration?: string | null
}): string {
  let style = 'font-size: ' + opts.fontSize + 'px'
  // font-family 故意省略：富文本统一继承 PPTist 默认字体
  if (opts.fill) {
    style += '; color: ' + opts.fill
  }
  if (opts.fontStyle && opts.fontStyle !== 'normal') {
    style += '; font-style: ' + opts.fontStyle
  }
  if (opts.fontWeight && opts.fontWeight !== 'normal' && opts.fontWeight !== 400) {
    style += '; font-weight: ' + opts.fontWeight
  }
  if (opts.textDecoration && opts.textDecoration !== 'none') {
    style += '; text-decoration: ' + opts.textDecoration
  }
  return style
}

/**
 * 将 Rich Text AST 序列化为 HTML
 * @param nodes - AST 节点数组
 * @param parentFontSize - 父级 font-size（已缩放，用于继承）
 * @param scaleY - 缩放比例
 * @param parentTag - 父级标签（用于判断是否需要为 TextNode 生成 span）
 * @param parentFill - 父级 fill 颜色
 * @param parentFontFamily - 父级 font-family
 * @param parentFontStyle - 父级 font-style
 * @param parentFontWeight - 父级 font-weight
 * @param parentTextDecoration - 父级 text-decoration
 */
function serializeRichText(
  nodes: RichTextNode[],
  parentFontSize: number,
  scaleY: number,
  parentTag: 'span' | 'sub' | 'sup' | null = null,
  parentFill: string | null = null,
  parentFontFamily: string | null = null,
  parentFontStyle: string | null = null,
  parentFontWeight: string | number | null = null,
  parentTextDecoration: string | null = null
): string {
  let html = ''

  for (const node of nodes) {
    if (node.type === 'text') {
      // 修复 text-font-weight-loss-rootcause.md：
      // text 节点也需读取自身 font-style / font-weight / text-decoration，
      // 与父级对比，决定是否需要 wrap <strong>/<em>/<u> 让 PPTist 富文本编辑器识别。
      const effectiveFill = node.fill !== undefined && node.fill !== null ? node.fill : parentFill
      const effectiveFontStyle = node.fontStyle !== undefined && node.fontStyle !== null ? node.fontStyle : parentFontStyle
      const effectiveFontWeight = node.fontWeight !== undefined && node.fontWeight !== null ? node.fontWeight : parentFontWeight
      const effectiveTextDecoration = node.textDecoration !== undefined && node.textDecoration !== null ? node.textDecoration : parentTextDecoration

      // PPTist 的 strong mark parse 规则（prosemirror-schema-basic/src/schema-basic.ts:138-149）：
      //   {style: 'font-weight', getAttrs: (value) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null}
      // 因此 500/600/700/800/900/bold/bolder 都视作 bold；用 <strong> 包裹保证 PPTist 切到 strong mark。
      const isBoldLike = (v: string | number | null | undefined): boolean => {
        if (v === 'bold' || v === 'bolder') return true
        if (typeof v === 'string') return /^[5-9]\d{2}$/.test(v)
        if (typeof v === 'number') return v >= 500
        return false
      }
      const needStrong = isBoldLike(effectiveFontWeight) && !isBoldLike(parentFontWeight)
      const needEm = (effectiveFontStyle === 'italic' || effectiveFontStyle === 'oblique')
        && parentFontStyle !== 'italic' && parentFontStyle !== 'oblique'
      const needUnderline = effectiveTextDecoration && /underline/.test(String(effectiveTextDecoration))
        && !(parentTextDecoration && /underline/.test(String(parentTextDecoration)))

      // 当父级没有 span 包装时我们需要创建 span
      // 或者当文本片段的样式与父级不同时也需要创建 span
      // 注意：font-family 不再作为 needSpan 条件（统一忽略）
      const needSpan = parentTag !== 'span' || (
        effectiveFill !== parentFill ||
        effectiveFontStyle !== parentFontStyle ||
        effectiveFontWeight !== parentFontWeight ||
        effectiveTextDecoration !== parentTextDecoration
      )

      let inner: string
      if (!needSpan) {
        inner = escapeHtml(node.content)
      } else {
        const spanStyle = buildSpanStyle({
          fontSize: parentFontSize,
          fill: effectiveFill,
          fontStyle: effectiveFontStyle,
          fontWeight: effectiveFontWeight,
          textDecoration: effectiveTextDecoration,
        })
        inner = '<span style="' + spanStyle + '">' + escapeHtml(node.content) + '</span>'
      }
      if (needUnderline) inner = '<u>' + inner + '</u>'
      if (needEm) inner = '<em>' + inner + '</em>'
      if (needStrong) inner = '<strong>' + inner + '</strong>'
      html += inner
    } else {
      // ElementNode: 子级如果无 fontSize 继承父级，否则应用 scaleY 缩放
      const effectiveFontSize = node.fontSize !== null
        ? node.fontSize * scaleY
        : parentFontSize  // 继承父级（已缩放）
      const effectiveFill = node.fill !== null ? node.fill : parentFill
      const effectiveFontStyle = node.fontStyle ?? parentFontStyle
      const effectiveFontWeight = node.fontWeight ?? parentFontWeight
      const effectiveTextDecoration = node.textDecoration ?? parentTextDecoration
      // 注意：font-family 不再作为 needSpan 条件（统一忽略）
      const needSpan = node.tag === 'span' && (
        Math.abs(effectiveFontSize - parentFontSize) > 0.01 ||
        effectiveFill !== parentFill ||
        effectiveFontStyle !== parentFontStyle ||
        effectiveFontWeight !== parentFontWeight ||
        effectiveTextDecoration !== parentTextDecoration
      )

      if (node.tag === 'span') {
        // span: 样式与父级不同时才需要 span 包装
        if (needSpan) {
          const spanStyle = buildSpanStyle({
            fontSize: effectiveFontSize,
            fill: effectiveFill,
            fontStyle: effectiveFontStyle,
            fontWeight: effectiveFontWeight,
            textDecoration: effectiveTextDecoration,
          })
          html += '<span style="' + spanStyle + '">'
        }
        html += serializeRichText(
          node.children,
          effectiveFontSize,
          scaleY,
          node.tag,
          effectiveFill,
          parentFontFamily,
          effectiveFontStyle,
          effectiveFontWeight,
          effectiveTextDecoration
        )
        if (needSpan) {
          html += '</span>'
        }
      } else {
        // sub/sup: 总是需要标签包裹
        const spanStyle = buildSpanStyle({
          fontSize: effectiveFontSize,
          fill: effectiveFill,
          fontStyle: effectiveFontStyle,
          fontWeight: effectiveFontWeight,
          textDecoration: effectiveTextDecoration,
        })
        html += '<' + node.tag + ' style="' + spanStyle + '">'
        html += serializeRichText(
          node.children,
          effectiveFontSize,
          scaleY,
          node.tag,
          effectiveFill,
          parentFontFamily,
          effectiveFontStyle,
          effectiveFontWeight,
          effectiveTextDecoration
        )
        html += '</' + node.tag + '>'
      }
    }
  }

  return html
}

/**
 * 提取纯文本（用于 text measurement）
 */
function extractPlainText(nodes: RichTextNode[]): string {
  let text = ''
  for (const node of nodes) {
    if (node.type === 'text') {
      text += node.content
    } else {
      text += extractPlainText(node.children)
    }
  }
  return text
}

/**
 * HTML 转义
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 构建 HTML content from a text element using AST approach.
 * @param element - SVG 元素
 * @param parentFontSize - 父级原始 font-size（未缩放）
 * @param scaleY - 缩放比例
 * @param parentFontFamily - 父级 font-family
 * @param parentFontWeight - 父级 font-weight（已 resolved，如 'bold'/'600'/'normal'）
 * @param parentFontStyle - 父级 font-style（已 resolved，如 'italic'/'normal'）
 * @param parentTextDecoration - 父级 text-decoration（已 resolved）
 * Returns both the HTML content string and plain text for measurement.
 */
function buildTextContentFromElement(
  element: SvgElement,
  parentFontSize: number,
  scaleY: number,
  parentFontFamily?: string | null,
  parentFontWeight?: string | null,
  parentFontStyle?: string | null,
  parentTextDecoration?: string | null,
): { html: string; text: string } {
  // 父级 fontSize 需要缩放
  const scaledParentFontSize = parentFontSize * scaleY
  // 从 element 获取父级 fill 颜色
  const parentFill = element.attrs.fill || null
  // 如果没有显式传入 parentFontFamily，从 element 获取
  const effectiveParentFontFamily = parentFontFamily ?? element.attrs['font-family'] ?? null
  // 父级 font-weight/style/decoration 取调用方传入（调用方负责基于 text 元素自身属性 resolve）
  const effectiveParentFontWeight = parentFontWeight ?? null
  const effectiveParentFontStyle = parentFontStyle ?? null
  const effectiveParentTextDecoration = parentTextDecoration ?? null
  const nodes = buildRichTextAST(
    element,
    parentFontSize,
    effectiveParentFontFamily,
    parentFill,
    effectiveParentFontWeight,
    effectiveParentFontStyle,
    effectiveParentTextDecoration,
  )
  const html = serializeRichText(
    nodes,
    scaledParentFontSize,
    scaleY,
    null,
    parentFill,
    effectiveParentFontFamily,
    effectiveParentFontStyle,
    effectiveParentFontWeight,
    effectiveParentTextDecoration,
  )
  const text = extractPlainText(nodes)
  return { html, text }
}

/**
 * Check if element has tspan children with explicit line-break attributes
 * (indicating multiline text).
 *
 * 修复 text-tspan-multi-overlap.md：原规则 "有 x = 换行" 过于宽松。
 * SVG 中 tspan 的 `x` 仅是绝对横坐标，也常用于内联重置（首 tspan 用 x 与父 text 同
 * x 作为显式起点，无换行意图）。真正的换行标志是垂直位移：
 *   - `dy`：相对垂直位移（最常见，multiline 标准做法）
 *   - `y`：绝对 y 改变（罕见但合法）
 *
 * 仅检查 `x` 会把内联 tspan（如 `<tspan x="166">A</tspan><tspan>B</tspan>`，
 * x 仅为显式起点）误判为换行，导致同一个 `<text>` 被拆成多个 text 元素，
 * 共享 left/top 渲染重叠。
 *
 * 现有 multiline 测试（text-anchor.test.ts、text-font-weight-coverage.test.ts、
 * text-fields.test.ts）都同时使用 `x` + `dy` 表示换行；改为检查 dy/y 后仍能识别。
 */
function hasLineBreakTspans(element: SvgElement): boolean {
  for (const child of element.children) {
    if (child.type === 'tspan') {
      // dy 或 y 出现即视为换行；x 仅是横坐标，不能作为换行依据
      if (child.attrs['dy'] !== undefined || child.attrs['y'] !== undefined) {
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
  baseFontFamily?: string | null,
  parentFontWeight?: string | null,
  parentFontStyle?: string | null,
  parentTextDecoration?: string | null,
): TspanExtractResult[] {
  const results: TspanExtractResult[] = []
  const fontSize = parseFloat(String(element.attrs['font-size'] || baseFontSize))
  const fontFamily = element.attrs['font-family'] || baseFontFamily
  // The parent's x in SVG coordinates (before transform)
  const parentX = parentSvgX ?? 0

  // Process tspan children
  const tspanChildren = element.children.filter(child => child.type === 'tspan')

  if (tspanChildren.length === 0) {
    // No tspans, use direct text content (apply scaleY to fontSize)
    const text = element.text || ''
    const scaledFontSize = fontSize * scaleY
    if (text) {
      // 修复 text-font-weight-loss-rootcause.md：复用 buildTextContentFromElement 而非手拼 span，
      // 这样 element 自身的 font-weight/font-style/text-decoration 等样式都会被纳入 AST 并被序列化输出
      //（之前手拼路径会全部丢失，参见 .planning/debug/text-font-weight-loss-rootcause.md）。
      const { html: tspanHtml, text: tspanText } = buildTextContentFromElement(
        element,
        fontSize,
        scaleY,
        fontFamily,
        parentFontWeight,
        parentFontStyle,
        parentTextDecoration,
      )
      results.push({
        left: baseLeft,
        top: baseTop,
        fontSize,
        content: tspanText || text,
        htmlContent: tspanHtml,
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
    // Pass parent's fontFamily/fontWeight/fontStyle/decoration so tspan can inherit them.
    // text-font-weight-loss-rootcause.md：父级 isBold 信息从此处传递，避免 transformTextElement 与
    // serializeRichText 重复包 <strong>。
    const { html: tspanHtml, text: tspanText } = buildTextContentFromElement(
      tspan,
      tspanFontSize,
      scaleY,
      fontFamily,
      parentFontWeight,
      parentFontStyle,
      parentTextDecoration,
    )

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
        result.gradient = scaleGradientPos(element.attrs.gradient as any, 100)
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
        result.gradient = scaleGradientPos(element.attrs.gradient as any, 100)
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
        result.gradient = scaleGradientPos(element.attrs.gradient as any, 100)
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

      // Fix: With mapCoordinates not applying groupScale to path width/height,
      // and applyTransform not scaling width/height:
      // - transformed.width = original_bbox * canvasScale (canvasScale was applied by mapCoordinates)
      // We need: viewBox = original_bbox, width = original_bbox * groupScale * canvasScale
      const groupScaleX = transform.scaleX ?? 1
      const groupScaleY = transform.scaleY ?? 1
      const viewBoxW = transformed.width / Math.abs(scaleX)  // = original_bbox.width
      const viewBoxH = transformed.height / Math.abs(scaleY)  // = original_bbox.height
      const finalWidth = viewBoxW * Math.abs(groupScaleX) * Math.abs(scaleX)
      const finalHeight = viewBoxH * Math.abs(groupScaleY) * Math.abs(scaleY)

      // Offset path coordinates so it starts from (0, 0) relative to its bounding box.
      // This ensures the path draws from the container's top-left corner.
      const absolutePathD = toAbsolutePath(d)
      const offsetX = transformed.left / scaleX  // = original bbox.left
      const offsetY = transformed.top / scaleY   // = original bbox.top
      const pathD = offsetPathCoords(absolutePathD, offsetX, offsetY)

      const result: PPTShapeElement = {
        id,
        type: 'shape',
        left: transformed.left,
        top: transformed.top,
        width: finalWidth,
        height: finalHeight,
        rotate,
        viewBox: [viewBoxW, viewBoxH],
        path: pathD,
        fixedRatio: false,
        fill: isFillNone ? 'none' : (colorToHex(fillValue) || '#000000'),
        opacity: element.attrs.opacity ? parseFloat(element.attrs.opacity) : undefined,
      }
      // D-15: attrs.gradient resolved at parse time — output as PPTShapeElement.gradient
      if (element.attrs.gradient) {
        result.gradient = scaleGradientPos(element.attrs.gradient as any, 100)
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
        result.gradient = scaleGradientPos(element.attrs.gradient as any, 100)
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
        result.gradient = scaleGradientPos(element.attrs.gradient as any, 100)
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
      // For lines WITHOUT transform: start/end are relative to bounding box origin
      // Use actual coordinate differences (x2-x1, y2-y1) which works for any line orientation
      // For lines WITH transform: need to compute relative positions using transform offsets
      let startRelX: number, startRelY: number, endRelX: number, endRelY: number
      if ((transform.translateX || 0) === 0 && (transform.translateY || 0) === 0 && (transform.scaleX || 1) === 1 && (transform.scaleY || 1) === 1) {
        // No transform - compute from actual coordinates
        // Note: coords.left = min(x1,x2), coords.top = min(y1,y2) via mapCoordinates
        // So (x1 - coords.left) = horizontal offset from bounding box origin
        // (y1 - coords.top) = vertical offset from bounding box origin
        startRelX = (x1 - coords.left) * scaleX
        startRelY = (y1 - coords.top) * scaleY
        endRelX = (x2 - coords.left) * scaleX
        endRelY = (y2 - coords.top) * scaleY
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
      // D-??: stroke="url(#id)" resolved to gradient at parse time
      if (element.attrs.gradient) {
        result.gradient = scaleGradientPos(element.attrs.gradient as any, 100)
      } else {
        const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity'])
        result.color = color
      }
      // D-23: groupId propagation from parent g element
      if (groupId) {
        result.groupId = groupId
      }
      return result
    }

    case 'text': {
      // 修复 text-rotation-not-processed.md：text 分支不再依赖 applyTransform(...).rotate，
      // 因为 applyTransform 在 transform.rotateCX/rotateCY 存在时把 rotate 重置为 0 并把 bbox
      // UL/LR "藏进" 坐标里，这会导致 SVG 文本旋转信息在 PPTTextElement 中被完全丢失。
      // 这里采用与 rect/circle/ellipse 不同的策略：
      //   1. 在未旋转坐标系里计算 textLeft/textTop/textWidth/textHeight（含 text-anchor 偏移 + 基线补偿）
      //   2. 当 transform.rotateCX/rotateCY 存在时，对最终的 UL/LR 应用 applyRotateWithCenter，
      //      得到旋转后 bbox 的 AABB
      //   3. 显式写 rotate: transform.rotateDeg ?? 0 让 PPTist 实际旋转渲染文本
      // Force Microsoft YaHei for all text (width calculation and output)
      const fontFamily = element.attrs['font-family'] || 'Microsoft YaHei'
      const fontSize = Number(String(element.attrs["font-size"] || "16")) || 16
      const scaledFontSize = fontSize * scaleY
      const letterSpacing = parseFloat(String(element.attrs['letter-spacing'] || '0'))
      const fillColor = element.attrs.fill || '#000000'
      const fillOpacity = element.attrs['fill-opacity']
      const hasRgba = fillOpacity && parseFloat(String(fillOpacity)) < 1
      const fontWeight = element.attrs['font-weight']
      // 修复 text-font-weight-loss-rootcause.md：
      // 顶层 <strong>/<em> 包裹需要覆盖 PPTist prosemirror-schema-basic strong mark 的全部解析范围
      // (bold/bolder/500-900)，否则 font-weight="800" 等数字值在 SVG 顶层 text 上仍然丢失。
      // 注意：svg-parser 配 parseAttributeValue:true 会把 "800" 解析为 number 800（不是字符串 "800"），
      // 需要 String() 归一化再做严格相等比较。
      const fontWeightStr = String(fontWeight ?? '')
      const isBold = fontWeightStr === 'bold' || fontWeightStr === 'bolder' ||
        fontWeightStr === '500' || fontWeightStr === '600' || fontWeightStr === '700' ||
        fontWeightStr === '800' || fontWeightStr === '900'
      const fontStyle = element.attrs['font-style']
      const isItalic = fontStyle === 'italic' || fontStyle === 'oblique'

      // 修复 text-font-weight-loss-rootcause.md：单行路径（无 tspan 或 inline text 子节点）下，
      // TextNode 自身已带 font-weight/style/decoration，serializeRichText 会基于 effectiveFontWeight !== null
      // 决定是否包 <strong>/<em>/<u>。这里不传 parent，让 TextNode 独立判断（避免与外层 isBold 重复包）。
      const textDecorationAttr = element.attrs['text-decoration']
      const effectiveParentFontWeight = isBold ? (fontWeight && String(fontWeight)) : 'normal'
      const effectiveParentFontStyle = isItalic ? (fontStyle && String(fontStyle)) : 'normal'
      const effectiveParentTextDecoration = textDecorationAttr && /underline/.test(String(textDecorationAttr))
        ? String(textDecorationAttr)
        : 'none'
      const { html: contentHtml, text: content } = buildTextContentFromElement(element, fontSize, scaleY)

      // Measure text using resvg-js with fallback to heuristic
      let textWidth: number
      let textHeight: number
      let textTop: number

      // Phase 11: 直通 SVG text 自带的 width / height 属性，跳过 resvg-js 测量
      // 仅当 width 和 height 都解析为正数时生效；其他情况继续走测量路径
      const rawTextWidth = element.attrs.width
      const rawTextHeight = element.attrs.height
      const parsedTextWidth = rawTextWidth !== undefined ? parseFloat(String(rawTextWidth)) : NaN
      const parsedTextHeight = rawTextHeight !== undefined ? parseFloat(String(rawTextHeight)) : NaN
      const usePassthrough = Number.isFinite(parsedTextWidth) && parsedTextWidth > 0
        && Number.isFinite(parsedTextHeight) && parsedTextHeight > 0
      if (usePassthrough) {
        textWidth = parsedTextWidth * scaleX + TEXT_WIDTH_SAFETY_MARGIN
        textHeight = parsedTextHeight * scaleY
        // 没有 measured.y，使用 FALLBACK_ASCENT_RATIO 与 catch 块保持一致
        textTop = top - fontSize * FALLBACK_ASCENT_RATIO * scaleY
      } else {
        try {
          const textAnchorAttr = element.attrs['text-anchor']
          const xAttr = element.attrs['x'] ? Number(element.attrs['x']) : undefined
          // 修复 tspan-dy-multiline-y-too-large.md：剥掉 SVG 缩进噪声，
          // 避免 buildMeasurementSvg 触发 multi-line 分支（dy="1em"），
          // 导致 bbox.y 漂移 fontSize、measuredAscent 变负、textTop 多加 fontSize*scaleY。
          // 仅影响测量路径，保留正文中间真实换行不影响 xml:space="preserve" 语义。
          const measurementContent = content.replace(/^\s+|\s+$/g, '')
          const measurementInput: TextMeasurementInput = {
            content: measurementContent,
            // 修复 text-in-circle-vertical-position-v3.md：测量字体必须与 PPTist 渲染字体一致。
            // SVG 原字体（Georgia/Arial 等）只是浏览器里的视觉，PPTist 实际渲染用思源，
            // 用原字体测量会导致 bbox 尺寸和 ascent 跟实际渲染不匹配，圆形内数字错位。
            fontFamily: 'Source Han Sans CN Regular',
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
          textWidth = measured.width * scaleX + TEXT_WIDTH_SAFETY_MARGIN
          textHeight = measured.height * scaleY
          // SVG text y is baseline; convert to top by subtracting the ascent measured with
          // the target render font (思源). Using a fixed 0.8 ratio mismatched fonts whose
          // actual ascent ratio differs (Georgia 16 = 0.54, Arial 13 = 0.72, 思源 = 0.76).
          const measuredAscent = fontSize - measured.y
          textTop = top - measuredAscent * scaleY
        } catch {
          // D-35: MEAS-06 fallback: heuristic estimate when resvg-js measurement fails.
          // 思源的实际 ascent ratio 是 0.764，0.8 只是历史上用的近似值；用 0.764 跟实际更接近。
          textWidth = fontSize * content.length * 0.6
          textHeight = scaledFontSize
          // Fallback: SVG y is baseline, convert to top using 思源 heuristic ascent ratio.
          // Note: top is already scaled, so subtract scaled ascent directly.
          textTop = top - fontSize * FALLBACK_ASCENT_RATIO * scaleY
        }
      }

      // text-anchor="middle" 时对 top 加常量补偿以修正视觉对齐
      // 单行分支直接使用 textTop；多行分支通过 baseTop 传给每个 tspan，偏移自动传播
      if (element.attrs['text-anchor'] === 'middle') {
        textTop += TEXT_ANCHOR_MIDDLE_TOP_OFFSET
      }

      // X轴: 考虑 text-anchor 调整 left
      // SVG text x 对于 middle/end 是参考点，需要偏移
      // 修复 text-rotation-not-processed.md：在未旋转坐标系里做 text-anchor 偏移，
      // 因为后续要保持 bbox 自然宽高，不能用 transformed.left（已旋转）做偏移。
      const textAnchorForLeft = element.attrs['text-anchor']
      let textLeft = left
      if (textAnchorForLeft === 'middle') {
        textLeft = left - textWidth / 2
      } else if (textAnchorForLeft === 'end') {
        textLeft = left - textWidth
      }

      // 修复 text-rotation-not-processed.md（已 reopen，2026-08-05 16:30）：
      // 之前用 applyRotateWithCenter 对 bbox UL/LR 旋转并取 AABB，但 PPTist 的 rotate 语义
      // 是"bbox 不动 + 整体绕元素中心旋转"，AABB 方案让 width/height 被对调，长字符串塞不进
      // 窄 bbox 导致视觉上仍像水平铺开。正确做法：
      //   1. 保持 textWidth/textHeight 为未旋转尺寸（自然文本宽高）
      //   2. 当 transform.rotateCX/rotateCY 存在时，把 bbox 平移到"bbox 中心 = 旋转中心 (SVG→canvas 缩放后)"
      //      这样 PPTist 以 bbox 中心为枢轴旋转元素，自然等价于 SVG 绕 (rotateCX, rotateCY) 旋转
      //   3. rotate 字段照旧透传 transform.rotateDeg，让 PPTist 真正做视觉旋转
      if (transform.rotateCX !== undefined && transform.rotateCY !== undefined) {
        const scaledCX = transform.rotateCX * scaleX
        const scaledCY = transform.rotateCY * scaleY
        const bboxCenterX = textLeft + textWidth / 2
        const bboxCenterY = textTop + textHeight / 2
        const offsetX = scaledCX - bboxCenterX
        const offsetY = scaledCY - bboxCenterY
        textLeft += offsetX
        textTop += offsetY
      }

      // 修复 text-rotation-not-processed.md：直接把 transform.rotateDeg 透传到 PPTTextElement。
      // PPTist 期望 rotate 字段语义是"整体绕元素中心旋转"；bbox 已经把中心对齐到 SVG 旋转中心，
      // 因此 PPTist 旋转后文字会绕 SVG 旋转中心显示，与 SVG 视觉一致。
      const finalRotate = transform.rotateDeg ?? 0

      // D-09: text-anchor → text-align on <p> style
      const textAnchor = element.attrs['text-anchor']
      let textAlign = ''
      if (textAnchor === 'start') textAlign = 'left'
      else if (textAnchor === 'end') textAlign = 'right'
      else if (textAnchor === 'middle') textAlign = 'center'
      // 修复 small-font-top-offset.md：PPTist .ProseMirror-static CSS 默认 font-size: 16px；
      // 若不显式覆盖，<p> 继承 16px，使 line-box 高度=16px、baseline=12.8px from top，
      // 而 span 用 scaledFontSize（如 8.59px），span 视觉顶端按 baseline 对齐后下移 ~5.9px（远大于小字号本身的 ascent）。
      // 在 <p> 上显式写 font-size: scaledFontSize，让 <p> 的 line-box 与 span 字体一致，
      // baseline 位置匹配 span ascent，视觉顶端 = JSON top（即 bbox top，无偏移）。
      const pStyleParts: string[] = [`font-size: ${scaledFontSize}px`]
      if (textAlign) pStyleParts.push(`text-align: ${textAlign}`)
      const pStyle = pStyleParts.join('; ')

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
      // 修复 text-font-weight-loss-rootcause.md：顶层包 <strong>/<em>/<u>，但仅当 innerSpan 还没有相关 mark 时
      // （避免 <strong><strong>...</strong></strong> 嵌套）。空 text 元素（没有子节点、没 inline text）这种情况
      // innerSpan 不含 <strong>，仍需要顶层包裹以保留顶层 font-weight/font-style 样式。
      let weightedContent = innerSpan
      if (isItalic && !innerSpan.includes('<em>')) weightedContent = `<em>${weightedContent}</em>`
      if (isBold && !innerSpan.includes('<strong>')) weightedContent = `<strong>${weightedContent}</strong>`
      const richContent = `<p style="${pStyle}">${weightedContent}</p>`

      // D-07: writing-mode vertical-rl/vertical-lr → vertical: true
      const writingMode = element.attrs['writing-mode']
      const vertical = writingMode === 'vertical-rl' || writingMode === 'vertical-lr'

      // D-09: fixedHeight based on SVG height attribute presence
      const fixedHeight = !!element.attrs.height

      // D-26: inset=[0,0,0,0] to avoid 10px default padding causing coordinate offset
      const baseResult = {
        rotate: finalRotate,
        defaultFontName: 'Source Han Sans CN Regular',
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
          fontFamily,
          effectiveParentFontWeight,
          effectiveParentFontStyle,
          effectiveParentTextDecoration,
        )

        const results: PPTTextElement[] = tspanElements.map((tspan, idx) => {
          // 修复 text-font-weight-loss-rootcause.md：multiline 路径同样需要保留顶层 <strong>/<em>，
          // 但仅当 lineContent 不含相应 mark 时才包（避免嵌套）。
          let lineContent = tspan.htmlContent
          if (isItalic && !lineContent.includes('<em>')) lineContent = `<em>${lineContent}</em>`
          if (isBold && !lineContent.includes('<strong>')) lineContent = `<strong>${lineContent}</strong>`
          // 修复 small-font-top-offset.md：每个 tspan 的 <p> 用各自 scaledFontSize（继承自父文本的 scaledFontSize）。
          // 当前实现中父文本与子 tspan 共享 fontSize（除非 tspan 显式覆盖），所以这里也用父文本的 scaledFontSize，
          // 与父 <p> 的 font-size 一致，避免在 multiline 分支重新引入同样的视觉顶端偏移。
          const tspanPStyle = [`font-size: ${scaledFontSize}px`]
          if (textAlign) tspanPStyle.push(`text-align: ${textAlign}`)
          const tspanRichContent = `<p style="${tspanPStyle.join('; ')}">${lineContent}</p>`
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
  const transformStart = performance.now()
  log('[转换] 开始 transformToPPTElement')

  // REF-03: Preprocess clipPath definitions before transform
  ;(() => { const start = performance.now(); preprocessClipPaths(ast); logEnd('[转换] preprocessClipPaths', Math.round(performance.now() - start)) })()

  const elements: PPTElement[] = []

  async function walk(
    element: SvgElement,
    viewBox: [number, number, number, number],
    currentGroupId?: string,
    parentTransform?: string,
    inheritedAttrs?: { fill?: string; stroke?: string; 'stroke-width'?: string; 'fill-opacity'?: string; 'stroke-opacity'?: string; 'text-anchor'?: string; 'font-family'?: string },
  ) {
    const tag = element.type.toLowerCase()

    // D-23: When tag='g' with id, update groupId context for children
    // Children inherit parent g id as their groupId. Nested g: innermost id takes precedence.
    // If g has no id, children get undefined (break the chain - no inheritance through unnamed g)
    const isG = tag === 'g'
    const effectiveGroupId = isG ? (element.attrs.id || undefined) : currentGroupId

    // Accumulate parent transform: child's transform is composed with parent's
    const effectiveTransform = composeTransforms(parentTransform, element.attrs.transform)

    // D-38: Accumulate inherited visual attributes from parent g elements
    // Inheritable attributes: fill, stroke, stroke-width, fill-opacity, stroke-opacity,
    // text-anchor, font-family
    const effectiveInheritedAttrs: typeof inheritedAttrs = inheritedAttrs ? { ...inheritedAttrs } : {}
    if (isG) {
      // g element's fill/stroke attributes are inherited by its children
      if (element.attrs.fill !== undefined) effectiveInheritedAttrs.fill = element.attrs.fill
      if (element.attrs.stroke !== undefined) effectiveInheritedAttrs.stroke = element.attrs.stroke
      if (element.attrs['stroke-width'] !== undefined) effectiveInheritedAttrs['stroke-width'] = element.attrs['stroke-width']
      if (element.attrs['fill-opacity'] !== undefined) effectiveInheritedAttrs['fill-opacity'] = String(element.attrs['fill-opacity'])
      if (element.attrs['stroke-opacity'] !== undefined) effectiveInheritedAttrs['stroke-opacity'] = String(element.attrs['stroke-opacity'])
      // D-?? (cover-tags-text-anchor-middle): SVG text-anchor and font-family
      // are inheritable per SVG spec; without propagation, child <text> without
      // its own text-anchor / font-family loses the parent's value and the
      // middle-anchor left offset (transformed.left - textWidth/2) is skipped.
      if (element.attrs['text-anchor'] !== undefined) {
        effectiveInheritedAttrs['text-anchor'] = String(element.attrs['text-anchor'])
      }
      if (element.attrs['font-family'] !== undefined) {
        effectiveInheritedAttrs['font-family'] = String(element.attrs['font-family'])
      }
    }

    // D-29: Check if this is a group with all-path children for potential merge
    if (isG) {
      const gChildren = element.children
      // Check if all children are path elements and more than one
      const allPathChildren = gChildren.length > 1 && gChildren.every(child => child.type.toLowerCase() === 'path')

      if (allPathChildren) {
        // Build effective group attrs combining element.attrs with inherited attrs
        const effectiveGroupAttrs: Record<string, string> = {}
        // Start with element's own attrs (string values only)
        for (const [key, value] of Object.entries(element.attrs)) {
          if (typeof value === 'string') effectiveGroupAttrs[key] = value
        }
        // Fill in inherited attrs where element doesn't have them
        if (effectiveInheritedAttrs.fill !== undefined && effectiveGroupAttrs.fill === undefined) {
          effectiveGroupAttrs.fill = effectiveInheritedAttrs.fill
        }
        if (effectiveInheritedAttrs.stroke !== undefined && effectiveGroupAttrs.stroke === undefined) {
          effectiveGroupAttrs.stroke = effectiveInheritedAttrs.stroke
        }
        if (effectiveInheritedAttrs['stroke-width'] !== undefined && effectiveGroupAttrs['stroke-width'] === undefined) {
          effectiveGroupAttrs['stroke-width'] = effectiveInheritedAttrs['stroke-width']
        }
        if (effectiveInheritedAttrs['fill-opacity'] !== undefined && effectiveGroupAttrs['fill-opacity'] === undefined) {
          effectiveGroupAttrs['fill-opacity'] = effectiveInheritedAttrs['fill-opacity']
        }
        if (effectiveInheritedAttrs['stroke-opacity'] !== undefined && effectiveGroupAttrs['stroke-opacity'] === undefined) {
          effectiveGroupAttrs['stroke-opacity'] = effectiveInheritedAttrs['stroke-opacity']
        }

        const decision = shouldMerge(gChildren as SvgElement[], effectiveGroupAttrs)

        if (decision === 'merge' || decision === 'cautious-merge') {
          const commonStyle = extractCommonStyle(gChildren as SvgElement[], effectiveGroupAttrs)
          if (commonStyle) {
            const mergedElement = createMergedShapeElement(
              gChildren as SvgElement[],
              commonStyle,
              effectiveTransform,
              [viewBox[2], viewBox[3]],
              targetCanvas,
              elements.length,
            )
            elements.push(mergedElement)
            // Skip individual child processing since we've merged them
            return
          }
        }
        // Fall through to normal processing if merge not decided
      }
    }

    // Process children (for groups - g elements themselves are not output)
    for (const child of element.children) {
      if (child.type.toLowerCase() === 'g') {
        // Recursively process group children with inherited/overridden groupId and accumulated transform
        await walk(child, viewBox, effectiveGroupId, effectiveTransform, effectiveInheritedAttrs)
      } else {
        // Skip non-renderable container elements
        if (!['defs', 'linearGradient', 'stop', 'filter', 'marker', 'clippath'].includes(child.type.toLowerCase())) {
          // D-38: Merge inherited attrs into child element attrs before transform
          // Child's own attrs take precedence over inherited attrs
          const mergedAttrs = { ...child.attrs }
          if (child.attrs.fill === undefined && effectiveInheritedAttrs.fill !== undefined) {
            mergedAttrs.fill = effectiveInheritedAttrs.fill
          }
          if (child.attrs.stroke === undefined && effectiveInheritedAttrs.stroke !== undefined) {
            mergedAttrs.stroke = effectiveInheritedAttrs.stroke
          }
          if (child.attrs['stroke-width'] === undefined && effectiveInheritedAttrs['stroke-width'] !== undefined) {
            mergedAttrs['stroke-width'] = effectiveInheritedAttrs['stroke-width']
          }
          if (child.attrs['fill-opacity'] === undefined && effectiveInheritedAttrs['fill-opacity'] !== undefined) {
            mergedAttrs['fill-opacity'] = effectiveInheritedAttrs['fill-opacity']
          }
          if (child.attrs['stroke-opacity'] === undefined && effectiveInheritedAttrs['stroke-opacity'] !== undefined) {
            mergedAttrs['stroke-opacity'] = effectiveInheritedAttrs['stroke-opacity']
          }
          // D-?? (cover-tags-text-anchor-middle): inherit text-anchor and font-family
          // from parent g so that middle-anchor left offset and font selection
          // are honored on child <text>.
          if (child.attrs['text-anchor'] === undefined && effectiveInheritedAttrs['text-anchor'] !== undefined) {
            mergedAttrs['text-anchor'] = effectiveInheritedAttrs['text-anchor']
          }
          if (child.attrs['font-family'] === undefined && effectiveInheritedAttrs['font-family'] !== undefined) {
            mergedAttrs['font-family'] = effectiveInheritedAttrs['font-family']
          }

          // REF-01: Pass effectiveTransform to mapCoordinates instead of mutating child.attrs.transform
          // D-38: Use mergedAttrs instead of child.attrs for fill/stroke inheritance
          const mergedElement: SvgElement = { ...child, attrs: mergedAttrs }
          const pptel = await transformElement(mergedElement, viewBox, elements.length, targetCanvas, effectiveGroupId, effectiveTransform)
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

  logEnd('[转换] transformToPPTElement 总耗时', Math.round(performance.now() - transformStart), `共 ${elements.length} 个元素`)
  return elements
}
