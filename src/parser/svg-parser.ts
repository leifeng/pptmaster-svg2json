import { XMLParser } from 'fast-xml-parser'
import { parseHTML } from 'linkedom'
import { SvgParseResult, SvgElement, SvgAttrs, GradientDef, GradientColorDef, PatternDef, PatternChild } from '../types/ast'
import { colorToRgba, colorToHex } from '../transformer/transform-to-pptel'
import { autoEmbedIcons } from '../svg-use-handler'
import { scalePathCoords } from '../utils/path-utils'

export interface FilterDef {
  id: string
  children: SvgElement[]  // the filter primitives like feDropShadow
  // For complex filter chains (feGaussianBlur + feOffset + feFlood + feComposite + feMerge)
  rawFilter?: any  // the raw filter element for complex chain parsing
}

interface TextRun {
  content: string
  x?: string | number
  y?: string | number
  fontFamily?: string
  fontSize?: string
  fill?: string
}

/**
 * Apply fill-opacity to a color string (handles hex, rgb, rgba formats).
 * D-15: fill-opacity must be applied after gradient reference resolution.
 */
function applyFillOpacityToColor(color: string | undefined, fillOpacity: number): string {
  if (!color) return `rgba(0, 0, 0, ${fillOpacity})`

  // rgba(r, g, b, a) — extract rgb and existing alpha, multiply by fillOpacity
  const rgbaMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,?\s*([\d.]*)\s*\)/)
  if (rgbaMatch) {
    const existingAlpha = rgbaMatch[4] !== '' ? parseFloat(rgbaMatch[4]) : 1
    const newAlpha = existingAlpha * fillOpacity
    return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${newAlpha})`
  }

  // Fallback to colorToRgba for hex/named colors
  return colorToRgba(color, fillOpacity)
}

/**
 * Parse gradientTransform attribute to extract rotation angle.
 * D-17: gradientTransform matrix rotation extracted via matrix decomposition.
 */
function parseGradientTransform(transform: string | undefined): number {
  if (!transform) return 0

  // rotate(N) or rotate(N, cx, cy) — extract degrees directly
  const rotateMatch = transform.match(/rotate\(\s*([\d.-]+)(?:[,\s]+([\d.-]+),?\s*([\d.-]+))?\s*\)/)
  if (rotateMatch) {
    return parseFloat(rotateMatch[1])
  }

  // matrix(a,b,c,d,e,f) — extract rotation from matrix decomposition
  // For 2D rotation matrix: angle = atan2(b, a)
  const matrixMatch = transform.match(/matrix\(\s*([\d.-]+),?\s*([\d.-]+),?\s*([\d.-]+),?\s*([\d.-]+),?\s*([\d.-]+),?\s*([\d.-]+)\s*\)/)
  if (matrixMatch) {
    const a = parseFloat(matrixMatch[1])
    const b = parseFloat(matrixMatch[2])
    // Extract rotation angle: atan2(b, a) in degrees
    return Math.atan2(b, a) * 180 / Math.PI
  }

  // translate+rotate+scale matrix — for now just return 0 (not a pure rotation)
  return 0
}

/**
 * Collect all gradient definitions from parsed XML into a registry.
 */
function collectGradientDefs(xmlNode: any, registry: Map<string, GradientDef>): void {
  const defs = xmlNode['defs']
  if (!defs) return

  const defsArr = Array.isArray(defs) ? defs : [defs]

  for (const def of defsArr) {
    if (!def) continue

    // Process linearGradient
    if (def['linearGradient']) {
      const linearGradients = Array.isArray(def['linearGradient']) ? def['linearGradient'] : [def['linearGradient']]
      for (const grad of linearGradients) {
        if (!grad) continue
        const id = grad['@_id']
        if (!id) continue

        const colors: GradientColorDef[] = []
        const stops = grad['stop']
        if (stops) {
          const stopArr = Array.isArray(stops) ? stops : [stops]
          for (const stop of stopArr) {
            if (!stop) continue
            const offset = stop['@_offset'] || '0%'
            const stopColor = stop['@_stop-color'] || '#000000'
            const stopOpacityAttr = stop['@_stop-opacity']
            const stopOpacity = stopOpacityAttr !== undefined ? parseFloat(stopOpacityAttr) : 1
            const pos = offset.endsWith('%') ? parseFloat(offset) / 100 : parseFloat(offset)
            colors.push({ pos, color: colorToRgba(stopColor, stopOpacity) })
          }
        }

        const gradientDef: GradientDef = {
          type: 'linear',
          x1: grad['@_x1'],
          y1: grad['@_y1'],
          x2: grad['@_x2'],
          y2: grad['@_y2'],
          gradientTransform: grad['@_gradientTransform'],
          spreadMethod: grad['@_spreadMethod'],
          gradientUnits: grad['@_gradientUnits'],
          colors,
        }
        registry.set(id, gradientDef)
      }
    }

    // Process radialGradient
    if (def['radialGradient']) {
      const radialGradients = Array.isArray(def['radialGradient']) ? def['radialGradient'] : [def['radialGradient']]
      for (const grad of radialGradients) {
        if (!grad) continue
        const id = grad['@_id']
        if (!id) continue

        const colors: GradientColorDef[] = []
        const stops = grad['stop']
        if (stops) {
          const stopArr = Array.isArray(stops) ? stops : [stops]
          for (const stop of stopArr) {
            if (!stop) continue
            const offset = stop['@_offset'] || '0%'
            const stopColor = stop['@_stop-color'] || '#000000'
            const stopOpacityAttr = stop['@_stop-opacity']
            const stopOpacity = stopOpacityAttr !== undefined ? parseFloat(stopOpacityAttr) : 1
            const pos = offset.endsWith('%') ? parseFloat(offset) / 100 : parseFloat(offset)
            colors.push({ pos, color: colorToRgba(stopColor, stopOpacity) })
          }
        }

        const gradientDef: GradientDef = {
          type: 'radial',
          cx: grad['@_cx'],
          cy: grad['@_cy'],
          r: grad['@_r'],
          fx: grad['@_fx'],
          fy: grad['@_fy'],
          gradientTransform: grad['@_gradientTransform'],
          spreadMethod: grad['@_spreadMethod'],
          gradientUnits: grad['@_gradientUnits'],
          colors,
        }
        registry.set(id, gradientDef)
      }
    }
  }
}

/**
 * Collect all pattern definitions from parsed XML into a registry.
 * D-36: pattern defs collected for fill="url(#patternId)" resolution.
 */
function collectPatternDefs(xmlNode: any, registry: Map<string, PatternDef>): void {
  const defs = xmlNode['defs']
  if (!defs) return

  const defsArr = Array.isArray(defs) ? defs : [defs]

  for (const def of defsArr) {
    if (!def) continue
    if (def['pattern']) {
      const patterns = Array.isArray(def['pattern']) ? def['pattern'] : [def['pattern']]
      for (const pat of patterns) {
        if (!pat) continue
        const id = pat['@_id']
        if (!id) continue

        // Collect children of the pattern
        const children: PatternChild[] = []
        const childTags = ['rect', 'circle', 'ellipse', 'path', 'polygon', 'polyline', 'line', 'text', 'image', 'use']
        for (const tag of childTags) {
          if (pat[tag]) {
            const childNodes = Array.isArray(pat[tag]) ? pat[tag] : [pat[tag]]
            for (const child of childNodes) {
              if (!child) continue
              // Extract attributes with @_ prefix
              const attrs: Record<string, any> = {}
              for (const key of Object.keys(child)) {
                if (key.startsWith('@_')) {
                  attrs[key.substring(2)] = child[key]
                }
              }
              // Also handle xlink:href
              if (child['xlink:href']) attrs['href'] = child['xlink:href']
              if (child.href) attrs.href = child.href
              children.push({ type: tag, attrs })
            }
          }
        }

        const patternDef: PatternDef = {
          id,
          width: parseFloat(pat['@_width']) || 0,
          height: parseFloat(pat['@_height']) || 0,
          patternUnits: pat['@_patternUnits'],
          patternContentUnits: pat['@_patternContentUnits'],
          patternTransform: pat['@_patternTransform'],
          children,
        }
        registry.set(id, patternDef)
      }
    }
  }
}

/**
 * Collect all filter definitions from parsed XML into a registry.
 * D-22: filter defs collected and resolved at parse time.
 */
function collectFilterDefs(xmlNode: any, registry: Map<string, FilterDef>): void {
  const defs = xmlNode['defs']
  if (!defs) return

  const defsArr = Array.isArray(defs) ? defs : [defs]

  for (const def of defsArr) {
    if (!def) continue
    if (def['filter']) {
      const filters = Array.isArray(def['filter']) ? def['filter'] : [def['filter']]
      for (const filter of filters) {
        if (!filter) continue
        const id = filter['@_id']
        if (!id) continue
        // Collect filter primitive children (feDropShadow, etc.) as SvgElement-like objects
        const filterChildren: SvgElement[] = []
        if (filter['feDropShadow']) {
          const feDsArr = Array.isArray(filter['feDropShadow']) ? filter['feDropShadow'] : [filter['feDropShadow']]
          for (const feDs of feDsArr) {
            if (!feDs) continue
            // Extract feDropShadow attributes with @_ prefix
            const feDsAttrs: SvgAttrs = {}
            for (const key of Object.keys(feDs)) {
              if (key.startsWith('@_')) {
                feDsAttrs[key.substring(2)] = feDs[key]
              }
            }
            filterChildren.push({ type: 'feDropShadow', attrs: feDsAttrs, children: [] })
          }
        }
        // Store raw filter for complex chain support (feGaussianBlur + feOffset + feFlood + feComposite + feMerge)
        registry.set(id, { id, children: filterChildren, rawFilter: filter })
      }
    }
  }
}

/**
 * Resolve fill="url(#id)" references using the gradient registry.
 * D-15: fill="url(#gradientId)" resolved at parse time to gradient object.
 */
function resolveFillReference(attrs: SvgAttrs, registry: Map<string, GradientDef>): void {
  const fill = attrs.fill
  if (!fill || !fill.startsWith('url(#')) return

  const match = fill.match(/url\(#([^)]+)\)/)
  if (!match) return

  const gradientId = match[1]
  const gradientDef = registry.get(gradientId)
  if (!gradientDef) return

  // D-15: fill-opacity on the element multiplies with gradient stop opacity
  // If fill-opacity is not set on the element, keep gradient's original stop opacities
  const fillOpacityAttr = attrs['fill-opacity']
  const hasFillOpacity = fillOpacityAttr !== undefined
  const fillOpacity = hasFillOpacity ? parseFloat(String(fillOpacityAttr)) : 1

  // Build PPTist Gradient object from GradientDef
  // The PPTist Gradient type is { type: 'linear' | 'radial', colors: {pos, color}[], rotate: number }
  // D-27: Compute rotate from gradientTransform OR from x1/y1/x2/y2 direction vector
  let rotate = parseGradientTransform(gradientDef.gradientTransform)
  if (rotate === 0 && gradientDef.gradientTransform === undefined && gradientDef.type === 'linear') {
    // No gradientTransform, compute rotate from x1/y1/x2/y2 direction
    const x1 = parseFloat(String(gradientDef.x1)) || 0
    const y1 = parseFloat(String(gradientDef.y1)) || 0
    const x2 = parseFloat(String(gradientDef.x2)) || 0
    const y2 = parseFloat(String(gradientDef.y2)) || 0
    // atan2 gives angle from positive x-axis, in radians; convert to degrees
    rotate = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI
  }
  const gradient = {
    type: gradientDef.type,
    colors: gradientDef.colors.map(c => {
      // D-29: Only apply fill-opacity if explicitly set on element; otherwise keep gradient's stop opacity
      if (hasFillOpacity) {
        // Multiply gradient stop alpha by element's fill-opacity
        const colorWithOpacity = applyFillOpacityToColor(c.color, fillOpacity)
        return { pos: c.pos * 100, color: colorWithOpacity }
      } else {
        // Keep original gradient color (with its stop opacity)
        return { pos: c.pos * 100, color: c.color }
      }
    }),
    rotate,
  }

  attrs.gradient = gradient
  // Clear fill and fill-opacity since gradient is now in attrs.gradient
  delete attrs.fill
  delete attrs['fill-opacity']
}

/**
 * Resolve fill="url(#patternId)" references by storing pattern reference.
 * D-36: Pattern resolution happens at transform time (to PNG) rather than parse time.
 * This stores the patternId in attrs.pattern for later PNG rendering.
 */
function resolvePatternReference(attrs: SvgAttrs, registry: Map<string, PatternDef>): void {
  const fill = attrs.fill
  if (!fill || !fill.startsWith('url(#')) return

  const match = fill.match(/url\(#([^)]+)\)/)
  if (!match) return

  const patternId = match[1]
  const patternDef = registry.get(patternId)
  if (!patternDef) return

  // Store pattern reference for later PNG rendering in transform-to-pptel.ts
  attrs.pattern = patternId
}

/**
 * Parse complex SVG filter chain (feGaussianBlur + feOffset + feFlood + feComposite + feMerge)
 * and extract shadow parameters compatible with PPTist's PPTElementShadow.
 *
 * Filter chain pattern:
 *   feGaussianBlur (stdDeviation) → feOffset (dx, dy) → feFlood (flood-color, flood-opacity) → feComposite (operator="in") → feMerge
 */
function parseComplexFilterChain(filterElement: any): { h: number; v: number; blur: number; color: string } | null {
  if (!filterElement) return null

  // Get all filter primitives in order
  const primitives = [
    'feGaussianBlur', 'feOffset', 'feFlood', 'feComposite', 'feMerge',
    'feDropShadow', 'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feFuncR', 'feFuncG', 'feFuncB', 'feFuncA',
    'feMergeNode', 'feMergeNodeIn', 'feMergeNodeOut'
  ]

  const found: Record<string, any[]> = {}
  for (const prim of primitives) {
    if (filterElement[prim] !== undefined) {
      found[prim] = Array.isArray(filterElement[prim]) ? filterElement[prim] : [filterElement[prim]]
    }
  }

  // Case 1: Simple feDropShadow
  if (found['feDropShadow'] && found['feDropShadow'].length > 0) {
    const feDs = found['feDropShadow'][0]
    return {
      h: parseFloat(String(feDs['@_dx'] || feDs['@_Dx'] || '0')),
      v: parseFloat(String(feDs['@_dy'] || feDs['@_Dy'] || '0')),
      blur: parseFloat(String(feDs['@_stdDeviation'] || feDs['@_stdDeviation'] || '0')),
      color: colorToRgba(String(feDs['@_flood-color'] || feDs['@_floodColor'] || '#000000'), parseFloat(String(feDs['@_flood-opacity'] || feDs['@_floodOpacity'] || '1'))),
    }
  }

  // Case 2: Complex chain with feGaussianBlur + feOffset + feFlood
  const feGaussianBlur = found['feGaussianBlur']?.[0]
  const feOffset = found['feOffset']?.[0]
  const feFlood = found['feFlood']?.[0]

  if (feGaussianBlur && feOffset && feFlood) {
    const stdDeviation = feGaussianBlur['@_stdDeviation'] || feGaussianBlur['@_stdDeviation'] || '0'
    // Handle separate stdDeviation for x and y (take the first value)
    const blur = parseFloat(String(stdDeviation).split(/\s+/)[0])

    const h = parseFloat(String(feOffset['@_dx'] || feOffset['@_Dx'] || '0'))
    const v = parseFloat(String(feOffset['@_dy'] || feOffset['@_Dy'] || '0'))

    const floodColor = String(feFlood['@_flood-color'] || feFlood['@_floodColor'] || '#000000')
    const floodOpacity = parseFloat(String(feFlood['@_flood-opacity'] || feFlood['@_floodOpacity'] || '1'))
    const color = colorToRgba(floodColor, floodOpacity)

    return { h, v, blur, color }
  }

  return null
}

/**
 * Resolve filter="url(#id)" references using the filter registry.
 * D-22: filter="url(#shadowId)" with feDropShadow → PPTElementShadow object.
 * Also supports complex filter chains (feGaussianBlur + feOffset + feFlood).
 */
function resolveFilterReference(attrs: SvgAttrs, registry: Map<string, FilterDef>): void {
  const filter = attrs.filter as string | undefined
  if (!filter || typeof filter !== 'string' || !filter.startsWith('url(#')) return

  const match = filter.match(/url\(#([^)]+)\)/)
  if (!match) return

  const filterId = match[1]
  const filterDef = registry.get(filterId)
  if (!filterDef) return

  // Try complex filter chain first (feGaussianBlur + feOffset + feFlood)
  if (filterDef.rawFilter) {
    const shadow = parseComplexFilterChain(filterDef.rawFilter)
    if (shadow) {
      attrs.shadow = shadow
      return
    }
  }

  // Fall back to simple feDropShadow
  const feDropShadow = filterDef.children.find(c => c.type === 'feDropShadow')
  if (!feDropShadow) return

  // Build PPTElementShadow from feDropShadow attributes
  // D-22: dx→h, dy→v, stdDeviation→blur, flood-color→color
  attrs.shadow = {
    h: parseFloat(String(feDropShadow.attrs.dx || '0')),
    v: parseFloat(String(feDropShadow.attrs.dy || '0')),
    blur: parseFloat(String(feDropShadow.attrs.stdDeviation || '0')),
    color: colorToHex(String(feDropShadow.attrs['flood-color'] || feDropShadow.attrs['shadow-color'] || '#000000')),
  }
}

function extractTextContent(node: any): { content: string; runs: TextRun[] } {
  if (!node) return { content: '', runs: [] }
  const runs: TextRun[] = []
  let content = ''

  if (node.tspan) {
    const tspans = Array.isArray(node.tspan) ? node.tspan : [node.tspan]
    for (const span of tspans) {
      const text = typeof span === 'string' ? span : span['#text'] ?? ''
      content += text
      if (typeof span === 'object') {
        runs.push({
          content: text,
          x: span['@_x'],
          y: span['@_y'],
          fontFamily: span['@_font-family'],
          fontSize: span['@_font-size'],
          fill: span['@_fill'],
        })
      }
    }
  } else {
    content = typeof node === 'string' ? node : node['#text'] ?? ''
  }
  return { content, runs }
}

export function parseViewBox(viewBoxStr: string | undefined): [number, number, number, number] {
  if (!viewBoxStr) return [0, 0, 1280, 720]
  const parts = viewBoxStr.trim().split(/[\s,]+/).map(Number)
  if (parts.length < 4 || parts.some(isNaN)) return [0, 0, 1280, 720]
  return [parts[0], parts[1], parts[2], parts[3]]
}

/**
 * Split a text node's #text content by its tspan children positions.
 * Returns an array of segments representing the interleaved text and tspan content.
 *
 * SVG example: "softmax( QK" + tspan("T") + " / √d" + tspan("k") + " ) V"
 * #text would be "softmax( QK/ √d) V" (concatenated), and we need to figure out
 * where each tspan fits by matching patterns in the text.
 */
interface TextSegment {
  text?: string
  isTspan: boolean
  element?: SvgElement
}

function splitTextByTspans(text: string, tspanChildren: SvgElement[]): TextSegment[] {
  if (!tspanChildren.length) return [{ text, isTspan: false }]

  const segments: TextSegment[] = []
  let remainingText = text

  // Build a combined string of all tspan texts to find them in #text
  const tspanTexts = tspanChildren.map(t => t.text || '')

  // Try to reconstruct by finding each tspan text in the remaining text
  // The issue is fast-xml-parser concatenates text before/after tspans differently
  // e.g., for "softmax( QK" + tspan("T") + " / √d" + tspan("k") + " ) V"
  // #text = "softmax( QK/ √d) V" (all non-tspan text concatenated)
  // We need to find where each tspan fits

  // Strategy: Find the first tspan text in #text, then recursively process
  for (let i = 0; i < tspanChildren.length; i++) {
    const tspan = tspanChildren[i]
    const tspanText = tspan.text || ''

    if (!tspanText) {
      segments.push({ isTspan: true, element: tspan })
      continue
    }

    // Find where this tspan's text appears in remainingText
    const idx = remainingText.indexOf(tspanText)
    if (idx === -1) {
      // Not found in remaining, check if it was at the very beginning
      if (i === 0 && text.startsWith(tspanText)) {
        // Tspan text is at the start
        segments.push({ isTspan: true, element: tspan })
        remainingText = text.substring(tspanText.length)
      } else {
        // Can't locate, just add the tspan
        segments.push({ isTspan: true, element: tspan })
      }
      continue
    }

    // Add text before this tspan (this is the gap between previous tspan and this one)
    if (idx > 0) {
      segments.push({ text: remainingText.substring(0, idx), isTspan: false })
    }

    // Add the tspan
    segments.push({ isTspan: true, element: tspan })

    // Update remaining text to process the rest
    remainingText = remainingText.substring(idx + tspanText.length)
  }

  // Add any remaining text after the last tspan
  if (remainingText) {
    segments.push({ text: remainingText, isTspan: false })
  }

  return segments
}

/**
 * Reconstruct a text element's XML string from its parsed components.
 * Used to pass to linkedom for proper mixed content parsing.
 */
function reconstructTextElementXML(attrs: SvgAttrs, textContent: string | undefined, children: SvgElement[]): string {
  // Build attribute string
  const attrStr = Object.entries(attrs)
    .filter(([k]) => !['x', 'y'].includes(k)) // x,y are handled separately
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ')

  const x = attrs.x !== undefined ? `x="${attrs.x}"` : ''
  const y = attrs.y !== undefined ? `y="${attrs.y}"` : ''
  const allAttrs = [x, y, attrStr].filter(Boolean).join(' ')

  // Get tspan XML from children
  const tspanChildren = children.filter(c => c.type === 'tspan')
  const tspanXML = tspanChildren.map(t => {
    const tAttrs = Object.entries(t.attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ')
    return `<tspan ${tAttrs}>${t.text || ''}</tspan>`
  }).join('')

  return `<text ${allAttrs}>${textContent || ''}${tspanXML}</text>`
}

/**
 * Parse mixed text/tspan content using linkedom which correctly preserves node order.
 * Returns an array of SvgElement children in document order.
 */
/**
 * Post-process element tree to fix mixed text/tspan content using linkedom.
 * Extracts raw text element XML from original SVG and parses it with linkedom
 * to correctly preserve text/tspan ordering.
 */
function fixMixedTextTspanContentWithLinkedom(element: SvgElement, originalSvg: string): void {
  // Collect all AST text elements that have tspan children (need fixing) in DFS order
  const astTextElements: SvgElement[] = []
  collectAstTextElementsWithTspans(element, astTextElements)

  if (astTextElements.length === 0) return

  // Process each AST element and find its matching regex entry
  for (const astText of astTextElements) {
    const x = String(astText.attrs.x || 0)
    const y = String(astText.attrs.y || 0)
    const fontFamily = (astText.attrs['font-family'] || '').replace(/['"]/g, '').toLowerCase()

    // Get all regex entries at this position
    const textXmlArray = extractTextElementXMLs(originalSvg)
    const matchingEntries = textXmlArray
      .filter(e => e.x === x && e.y === y && e.fontFamily === fontFamily)
      .sort((a, b) => a.offset - b.offset)

    // Find the entry that corresponds to this AST element
    // by checking if the entry's content contains tspan (since AST has tspan children)
    // AND the concatenated AST text is related to the entry content
    const astConcatenatedText = astText.text || ''

    for (const entry of matchingEntries) {
      // Check if this entry has tspan content
      const hasTspan = entry.content.includes('<tspan')

      if (hasTspan) {
        // This is likely the correct entry - process it
        try {
          const wrappedXml = `<root xmlns="http://www.w3.org/2000/svg"><svgtext>${entry.content}</svgtext></root>`
          const { document } = parseHTML(wrappedXml)
          const root = document.firstChild
          if (root) {
            const fixedChildren = parseMixedContentWithLinkedom(root)
            if (fixedChildren.length > 0) {
              astText.children = fixedChildren
              astText.text = undefined
            }
          }
        } catch (e) {
          // Fallback: keep original
        }
        break // Found the matching entry, done with this AST element
      }
    }
  }
}

/**
 * Extract text element inner content from raw SVG string.
 * Returns a map keyed by "x,y,font-family".
 */
function extractTextElementXMLs(svg: string): { x: string; y: string; fontFamily: string; content: string; offset: number }[] {
  const result: { x: string; y: string; fontFamily: string; content: string; offset: number }[] = []

  // Match <text ...>...</text> patterns
  // Handle both single-line and multi-line text elements
  const textRegex = /<text\s+([^>]*font-family[^>]*)>([\s\S]*?)<\/text>/gi
  let match

  while ((match = textRegex.exec(svg)) !== null) {
    const attrsStr = match[1]
    const innerContent = match[2].trim()

    // Extract x, y, font-family
    const xMatch = attrsStr.match(/x=["']?([^"'\s,]+)/)
    const yMatch = attrsStr.match(/y=["']?([^"'\s,]+)/)
    // font-family value: match either "..." or '...' (value may contain commas)
    const fontFamilyMatch = attrsStr.match(/font-family=("[^"]*"|'[^']*')/)

    const x = xMatch ? xMatch[1] : '0'
    const y = yMatch ? yMatch[1] : '0'
    // Normalize font-family by removing quotes for comparison
    const fontFamily = fontFamilyMatch ? fontFamilyMatch[1].replace(/['"]/g, '').toLowerCase() : ''

    result.push({ x, y, fontFamily, content: innerContent, offset: match.index })
  }

  // Sort by offset to process in document order
  result.sort((a, b) => a.offset - b.offset)
  return result
}

/**
 * Collect all AST text elements that have tspan children (need fixing) in DFS order.
 */
function collectAstTextElementsWithTspans(element: SvgElement, result: SvgElement[]): void {
  if (element.type === 'text' && element.children.some(c => c.type === 'tspan')) {
    result.push(element)
  }
  for (const child of element.children) {
    collectAstTextElementsWithTspans(child, result)
  }
}

/**
 * Find a matching element in the linkedom document using querySelector.
 */
function findLinkedomElementByQuery(document: any, targetElement: SvgElement): any | null {
  // For text elements, match by x and y attributes
  if (targetElement.type === 'text' && targetElement.attrs.x !== undefined) {
    const x = targetElement.attrs.x
    const y = targetElement.attrs.y
    // The SVG element is at documentElement, not body (body is empty for SVG docs)
    const root = document.documentElement || document.body
    return findElementByAttrs(root, 'text', x, y)
  }
  return null
}

/**
 * Recursively find an element by tag name and attribute match.
 */
function findElementByAttrs(root: any, tagName: string, x: any, y: any): any | null {
  if (root.nodeType === 1) {
    const rootTagName = root.tagName?.toLowerCase()
    if (rootTagName === tagName) {
      const xMatch = String(root.getAttribute('x')) === String(x)
      const yMatch = String(root.getAttribute('y')) === String(y)
      if (xMatch && yMatch) {
        return root
      }
    }
    for (const child of root.childNodes) {
      const found = findElementByAttrs(child, tagName, x, y)
      if (found) return found
    }
  }
  return null
}

/**
 * Reconstruct text element XML string from an SvgElement.
 */
function reconstructTextElementXMLFromElement(element: SvgElement): string {
  const attrParts: string[] = []
  if (element.attrs.x !== undefined) attrParts.push(`x="${element.attrs.x}"`)
  if (element.attrs.y !== undefined) attrParts.push(`y="${element.attrs.y}"`)
  for (const [k, v] of Object.entries(element.attrs)) {
    if (!['x', 'y'].includes(k) && v !== undefined) {
      attrParts.push(`${k}="${v}"`)
    }
  }

  const tspanChildren = element.children.filter(c => c.type === 'tspan')
  const tspanXML = tspanChildren.map(t => {
    const tAttrParts = Object.entries(t.attrs)
      .filter(([k, v]) => v !== undefined)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ')
    return `<tspan ${tAttrParts}>${t.text || ''}</tspan>`
  }).join('')

  return `<text ${attrParts.join(' ')}>${element.text || ''}${tspanXML}</text>`
}

/**
 * Parse a text element's child nodes using linkedom, returning ordered children.
 */
function parseTextElementWithLinkedom(textEl: any): SvgElement[] {
  const result: SvgElement[] = []

  for (const node of textEl.childNodes) {
    if (node.nodeType === 3) {
      const text = node.textContent?.trim()
      if (text) {
        result.push({
          type: 'text',
          attrs: {},
          children: [],
          text: text,
        })
      }
    } else if (node.nodeType === 1) {
      const tagName = node.tagName?.toLowerCase()
      if (tagName === 'tspan') {
        const attrs: SvgAttrs = {}
        for (const attr of node.attributes) {
          attrs[attr.name] = attr.value
        }

        // Collect text content from tspan children
        let tspanText = ''
        const tspanChildren: SvgElement[] = []
        for (const child of node.childNodes) {
          if (child.nodeType === 3) {
            tspanText += child.textContent || ''
          }
        }

        result.push({
          type: 'tspan',
          attrs,
          children: tspanChildren,
          text: tspanText,
        })
      }
    }
  }

  return result
}

function parseMixedContentWithLinkedom(
  root: any,
  gradientRegistry?: Map<string, GradientDef>,
  filterRegistry?: Map<string, FilterDef>,
  patternRegistry?: Map<string, PatternDef>
): SvgElement[] {
  const result: SvgElement[] = []

  for (const node of root.childNodes) {
    if (node.nodeType === 1) {
      // ELEMENT_NODE - could be text, tspan, or other
      const tagName = node.tagName?.toLowerCase()

      if (tagName === 'text' || tagName === 'root' || tagName === 'svgtext') {
        // text or root element - recursively process its children
        const childResults = parseMixedContentWithLinkedom(node, gradientRegistry, filterRegistry, patternRegistry)
        result.push(...childResults)
      } else if (tagName === 'tspan') {
        // tspan element
        const attrs: SvgAttrs = {}
        for (const attr of node.attributes) {
          attrs[attr.name] = attr.value
        }

        // Recursively process tspan children
        const tspanChildren: SvgElement[] = []
        for (const child of node.childNodes) {
          if (child.nodeType === 3) {
            const text = child.textContent || ''
            if (text) {
              tspanChildren.push({
                type: 'text',
                attrs: {},
                children: [],
                text: text,
              })
            }
          } else if (child.nodeType === 1) {
            const childTag = child.tagName?.toLowerCase()
            if (childTag === 'tspan') {
              const nestedAttrs: SvgAttrs = {}
              for (const attr of child.attributes) {
                nestedAttrs[attr.name] = attr.value
              }
              const nestedText = child.textContent || ''
              tspanChildren.push({
                type: 'tspan',
                attrs: nestedAttrs,
                children: [],
                text: nestedText,
              })
            }
          }
        }

        result.push({
          type: 'tspan',
          attrs,
          children: tspanChildren,
          text: node.textContent || '',
        })
      }
    } else if (node.nodeType === 3) {
      // TEXT_NODE - plain text segment
      const text = node.textContent?.trim()
      if (text) {
        result.push({
          type: 'text',
          attrs: {},
          children: [],
          text: text,
        })
      }
    }
  }

  return result
}

function convertToSvgElement(node: any, parentTag: string = '', gradientRegistry?: Map<string, GradientDef>, filterRegistry?: Map<string, FilterDef>, patternRegistry?: Map<string, PatternDef>): SvgElement {
  const tagName = (node['#tag'] || parentTag || '').toLowerCase()

  // Extract attributes with @_ prefix
  const attrs: SvgAttrs = {}
  for (const key of Object.keys(node)) {
    if (key.startsWith('@_')) {
      const attrName = key.substring(2)
      attrs[attrName] = node[key]
    }
  }

  // Also check for namespace-prefixed attributes without @_ prefix
  if (node['xlink:href']) attrs['xlink:href'] = node['xlink:href']
  if (node.href) attrs.href = node.href

  // Resolve fill="url(#id)" references using gradient registry
  if (gradientRegistry) {
    resolveFillReference(attrs, gradientRegistry)
  }

  // Resolve filter="url(#id)" references using filter registry (D-22)
  if (filterRegistry) {
    resolveFilterReference(attrs, filterRegistry)
  }

  // Resolve fill="url(#patternId)" references by storing pattern reference (D-36)
  // Note: pattern rendering to PNG happens in transform-to-pptel.ts
  if (patternRegistry) {
    resolvePatternReference(attrs, patternRegistry)
  }

  // Handle text content
  let text: string | undefined
  if (node['#text']) {
    text = typeof node['#text'] === 'string' ? node['#text'] : String(node['#text'])
  }

  // Recursively process children
  const children: SvgElement[] = []
  const childTags = ['rect', 'circle', 'ellipse', 'path', 'polygon', 'polyline', 'line', 'text', 'tspan', 'image', 'g', 'defs', 'linearGradient', 'radialGradient', 'stop']

  for (const tag of childTags) {
    if (node[tag]) {
      const childNodes = Array.isArray(node[tag]) ? node[tag] : [node[tag]]
      for (const child of childNodes) {
        children.push(convertToSvgElement(child, tag, gradientRegistry, filterRegistry, patternRegistry))
      }
    }
  }

  // Note: Mixed text/tspan fixing is handled by fixMixedTextTspanContentWithLinkedom
  // which uses the original SVG to correctly preserve text/tspan ordering.
  // DO NOT process linkedom here - it will be done in fixMixedTextTspanContentWithLinkedom.

  return {
    type: tagName,
    attrs,
    children,
    text,
  }
}

/**
 * 调整路径坐标，使其相对于 viewBox 原点
 * 图标 SVG 的 viewBox 通常是 0 0 24 24，但路径内容可能从 (4, 6) 等位置开始
 * 这会导致 translate(x, y) 不能正确定位图标
 */
function adjustPathToViewBox(d: string, viewBox: { x: number; y: number }): string {
  // 如果 viewBox 正好是 0,0，不需要调整
  if (viewBox.x === 0 && viewBox.y === 0) {
    return d
  }

  // 使用简单的字符串替换来调整坐标
  // 注意：这只能处理简单的 M/L/H/V 命令，对于复杂的 arc/curve 不准确
  // 但大多数 tabler 图标只用 M/L/H/V
  let adjusted = d

  // 匹配命令后的坐标对并添加 viewBox 偏移
  // 格式: 命令 数字 数字 (可能重复)
  adjusted = adjusted.replace(/([MLHV])\s*([-\d.]+)/gi, (match, cmd, numStr) => {
    const num = parseFloat(numStr)
    if (cmd.toUpperCase() === 'H') {
      // 水平线只影响 X
      return cmd + ' ' + (num + viewBox.x)
    } else if (cmd.toUpperCase() === 'V') {
      // 垂直线只影响 Y
      return cmd + ' ' + (num + viewBox.y)
    } else {
      // M/L 需要处理 x,y 对
      return match // 复杂情况暂不处理
    }
  })

  // 简单情况：如果 viewBox 是 0 0 24 24，路径坐标本来就是相对于 0,0 的
  // 不需要调整（tabler 图标都是这样）
  return d
}

export function parseSvg(xmlString: string, svgFilePath?: string): SvgParseResult {
  // 先解析 SVG 获取 viewBox，计算画布缩放比例
  const vbMatch = xmlString.match(/viewBox="([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)"/)
  const svgWidth = vbMatch ? parseFloat(vbMatch[3]) : 1280
  const svgHeight = vbMatch ? parseFloat(vbMatch[4]) : 720
  // 默认 targetCanvas 是 1000x562.5
  const canvasScaleX = 1000 / svgWidth
  const canvasScaleY = 562.5 / svgHeight

  // 自动嵌入图标占位符（生成临时文件，不修改原文件）
  // svgFilePath 用于解析外部 SVG href 引用的相对路径
  const { xmlString: embeddedXml, tempFilePath } = autoEmbedIcons(xmlString, canvasScaleX, canvasScaleY, svgFilePath)
  xmlString = embeddedXml

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: true,
    parseTagValue: false,
    trimValues: true,
    isArray: (name) =>
      [
        'rect',
        'circle',
        'ellipse',
        'path',
        'polygon',
        'polyline',
        'line',
        'text',
        'tspan',
        'image',
        'g',
        'defs',
        'linearGradient',
        'radialGradient',
        'stop',
      ].includes(name),
  })

  const result = parser.parse(xmlString)

  // Navigate to svg root
  const svgRoot = result.svg || result['svg:svg'] || result
  if (!svgRoot || typeof svgRoot !== 'object') {
    throw new Error('Invalid SVG: no svg root element found')
  }

  // Reject empty result objects (invalid SVG)
  if (Object.keys(svgRoot).length === 0) {
    throw new Error('Invalid SVG: empty parse result')
  }

  // Extract viewBox from root
  const viewBoxAttr = svgRoot['@_viewBox'] || svgRoot.viewBox
  const viewBox: [number, number, number, number] = parseViewBox(viewBoxAttr)

  // Extract width/height from root attributes
  const rootAttrs: SvgAttrs = {}
  for (const key of Object.keys(svgRoot)) {
    if (key.startsWith('@_')) {
      rootAttrs[key.substring(2)] = svgRoot[key]
    }
  }
  if (svgRoot['xlink:href']) rootAttrs['xlink:href'] = svgRoot['xlink:href']

  const width =
    parseFloat(String(svgRoot['@_width'] || rootAttrs.width || viewBox[2]))
  const height =
    parseFloat(String(svgRoot['@_height'] || rootAttrs.height || viewBox[3]))

  // First pass: collect all gradient definitions into registry
  const gradientRegistry = new Map<string, GradientDef>()
  collectGradientDefs(svgRoot, gradientRegistry)

  // First pass: collect all filter definitions into registry
  const filterRegistry = new Map<string, FilterDef>()
  collectFilterDefs(svgRoot, filterRegistry)

  // First pass: collect all pattern definitions into registry
  const patternRegistry = new Map<string, PatternDef>()
  collectPatternDefs(svgRoot, patternRegistry)

  // Build clean element tree from svg root with gradient and filter registries for resolving references
  const root = convertToSvgElement(svgRoot, 'svg', gradientRegistry, filterRegistry, patternRegistry)
  root.attrs = rootAttrs

  // D-??: Fix mixed text/tspan content using linkedom with raw SVG extraction
  // fast-xml-parser concatenates all non-tspan text, losing ordering.
  // We extract raw text element XML from original SVG and use linkedom to parse it correctly.
  fixMixedTextTspanContentWithLinkedom(root, xmlString)

  return {
    root,
    viewBox,
    width,
    height,
    patternRegistry,
  }
}

export function flattenElements(element: SvgElement): SvgElement[] {
  const result: SvgElement[] = [element]
  for (const child of element.children) {
    result.push(...flattenElements(child))
  }
  return result
}
