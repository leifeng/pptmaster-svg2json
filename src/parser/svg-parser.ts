import { XMLParser } from 'fast-xml-parser'
import { SvgParseResult, SvgElement, SvgAttrs, GradientDef, GradientColorDef } from '../types/ast'
import { colorToRgba, colorToHex } from '../transformer/transform-to-pptel'

export interface FilterDef {
  id: string
  children: SvgElement[]  // the filter primitives like feDropShadow
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
        registry.set(id, { id, children: filterChildren })
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

  // Build PPTist Gradient object from GradientDef
  // The PPTist Gradient type is { type: 'linear' | 'radial', colors: {pos, color}[], rotate: number }
  const gradient = {
    type: gradientDef.type,
    colors: gradientDef.colors.map(c => ({ pos: c.pos, color: c.color })),
    rotate: parseGradientTransform(gradientDef.gradientTransform),
  }

  attrs.gradient = gradient
  // Clear fill since gradient is now in attrs.gradient
  delete attrs.fill
}

/**
 * Resolve filter="url(#id)" references using the filter registry.
 * D-22: filter="url(#shadowId)" with feDropShadow → PPTElementShadow object.
 */
function resolveFilterReference(attrs: SvgAttrs, registry: Map<string, FilterDef>): void {
  const filter = attrs.filter
  if (!filter || !filter.startsWith('url(#')) return

  const match = filter.match(/url\(#([^)]+)\)/)
  if (!match) return

  const filterId = match[1]
  const filterDef = registry.get(filterId)
  if (!filterDef) return

  // Find feDropShadow child
  const feDropShadow = filterDef.children.find(c => c.type === 'feDropShadow')
  if (!feDropShadow) return

  // Build PPTElementShadow from feDropShadow attributes
  // D-22: dx→h, dy→v, stdDeviation→blur, flood-color→color
  attrs.shadow = {
    h: parseFloat(String(feDropShadow.attrs.dx || '0')),
    v: parseFloat(String(feDropShadow.attrs.dy || '0')),
    blur: parseFloat(String(feDropShadow.attrs.stdDeviation || '0')),
    color: colorToHex(feDropShadow.attrs['flood-color'] || feDropShadow.attrs['shadow-color'] || '#000000'),
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

function convertToSvgElement(node: any, parentTag: string = '', gradientRegistry?: Map<string, GradientDef>, filterRegistry?: Map<string, FilterDef>): SvgElement {
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
        children.push(convertToSvgElement(child, tag, gradientRegistry, filterRegistry))
      }
    }
  }

  return {
    type: tagName,
    attrs,
    children,
    text,
  }
}

export function parseSvg(xmlString: string): SvgParseResult {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: true,
    parseTagValue: true,
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

  // Build clean element tree from svg root with gradient and filter registries for resolving references
  const root = convertToSvgElement(svgRoot, 'svg', gradientRegistry, filterRegistry)
  root.attrs = rootAttrs

  return {
    root,
    viewBox,
    width,
    height,
  }
}

export function flattenElements(element: SvgElement): SvgElement[] {
  const result: SvgElement[] = [element]
  for (const child of element.children) {
    result.push(...flattenElements(child))
  }
  return result
}
