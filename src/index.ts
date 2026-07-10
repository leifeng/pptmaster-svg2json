import { randomUUID as uuidv4 } from 'crypto'
import { parseSvg } from './parser/svg-parser'
import { transformToPPTElement } from './transformer/transform-to-pptel'
import { renderSvgToPng } from './text-measurer'
import type { PPTElement, Slide, SlideBackground } from './slides'
import type { SvgElement } from './types/ast'

export interface ConvertOptions {
  targetCanvas?: [number, number]; // Target canvas size [width, height], defaults to [1000, 562.5]
  svgFilePath?: string; // Path to SVG file for resolving external href references
}

export interface ConvertResult {
  success: boolean;
  output?: string;
  error?: string;
  elementCount?: number;
}

/**
 * Check if a background element uses pattern fill.
 * Returns the pattern ID if it does, otherwise undefined.
 */
function detectBackgroundPatternFill(elements: PPTElement[]): string | undefined {
  const first = elements[0]
  if (!first || first.type !== 'shape') return undefined

  // Check if it's a full-canvas rect with pattern fill
  // Note: after transformElement, pattern fill is stored in element.attrs.pattern
  // but in the current implementation, pattern fill is rendered to PNG and stored as fill string
  // So we need to check the attrs before transformation... but we don't have access here.

  // Actually, since pattern rendering happens in transformElement and we check here after,
  // we need a different approach. Let's check the SVG AST directly.
  return undefined
}

/**
 * Find background group element in SVG AST that uses pattern fill.
 * Returns the background group element if found (e.g., <g id="bg-texture">).
 */
function findBackgroundGroup(root: SvgElement, patternRegistry: Map<string, any>): SvgElement | undefined {
  // Look for a g element with id containing "bg" or "background" that contains BOTH
  // a solid color rect AND a pattern fill rect (typical bg-texture structure)
  for (const child of root.children) {
    if (child.type.toLowerCase() === 'g') {
      const groupId = child.attrs.id
      // Check if this is a background group
      if (groupId && (groupId.toLowerCase().includes('bg') || groupId.toLowerCase().includes('background'))) {
        let hasPattern = false
        let hasSolid = false
        for (const rect of child.children) {
          if (rect.type.toLowerCase() === 'rect') {
            const fill = rect.attrs.fill
            if (fill && fill.startsWith('url(#')) {
              const match = fill.match(/url\(#([^)]+)\)/)
              if (match && patternRegistry.has(match[1])) {
                hasPattern = true
              }
            } else if (fill && (fill.startsWith('#') || fill === 'none')) {
              hasSolid = true
            }
          }
        }
        // If group has both solid and pattern fills, it's our background
        if (hasPattern && hasSolid) {
          return child
        }
      }
    }
  }
  return undefined
}

/**
 * Extract background SVG region and render to PNG.
 * D-36: For background with pattern fill, render full SVG to preserve tiling effect.
 * Renders the entire background group (e.g., <g id="bg-texture">) with all its children.
 */
async function renderBackgroundPatternToPng(
  root: SvgElement,
  patternRegistry: Map<string, any>,
  width: number,
  height: number,
): Promise<string | undefined> {
  // Find the background group (e.g., <g id="bg-texture">)
  const bgGroup = findBackgroundGroup(root, patternRegistry)
  if (!bgGroup) return undefined

  // Build background SVG string
  // Serialize patterns from patternRegistry into defs
  const patternsContent: string[] = []
  for (const [id, patternDef] of patternRegistry) {
    const childTags = patternDef.children.map((c: { type: string; attrs: Record<string, any> }) => {
      const attrs = Object.entries(c.attrs).map(([k, v]) => `${k}="${v}"`).join(' ')
      return `      <${c.type} ${attrs}/>`
    }).join('\n')
    patternsContent.push(`    <pattern id="${id}" width="${patternDef.width}" height="${patternDef.height}" patternUnits="${patternDef.patternUnits || 'userSpaceOnUse'}">\n${childTags}\n    </pattern>`)
  }
  const defsContent = patternsContent.length > 0
    ? `  <defs>\n${patternsContent.join('\n')}\n  </defs>`
    : ''

  // Build all rect elements from the background group
  const rectsContent = bgGroup.children
    .filter((child: SvgElement) => child.type.toLowerCase() === 'rect')
    .map((rect: SvgElement) => {
      const attrs = Object.entries(rect.attrs)
        .filter(([k]) => !k.startsWith('@_'))
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ')
      return `  <rect ${attrs}/>`
    })
    .join('\n')

  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${defsContent}
${rectsContent}
</svg>`

  // Debug: write SVG to file
  const fs = require('fs')
  fs.writeFileSync('exampels/测试/debug-bg.svg', bgSvg)

  return renderSvgToPng(bgSvg, width, height)
}

/**
 * Infer SlideBackground from the first element of the SVG.
 * If the first element is a full-canvas rectangle with no stroke, treat it as the background.
 */
function inferBackground(elements: PPTElement[], canvasWidth: number, canvasHeight: number): SlideBackground | undefined {
  const first = elements[0]
  if (!first) return undefined

  // Check if first shape fills the full canvas (background rect)
  if (first.type === 'shape' && first.left === 0 && first.top === 0 &&
      first.width === canvasWidth && first.height === canvasHeight) {
    // This is the background rectangle — use its fill/gradient as slide background
    if (first.gradient) {
      return { type: 'gradient', gradient: first.gradient }
    }
    if (first.fill && first.fill !== 'none' && first.fill !== 'transparent') {
      return { type: 'solid', color: first.fill }
    }
  }
  return undefined
}

export async function convert(svgContent: string, options?: ConvertOptions): Promise<ConvertResult> {
  try {
    const ast = parseSvg(svgContent, options?.svgFilePath)
    // Basic validation: must have a root svg element
    if (!ast.root || ast.root.type !== 'svg') {
      return { success: false, error: 'Invalid SVG: no svg root element' }
    }
    // Must have non-empty content (at least width/height or children)
    if (ast.width <= 0 || ast.height <= 0) {
      return { success: false, error: 'Invalid SVG: missing width/height' }
    }

    const canvasWidth = options?.targetCanvas?.[0] ?? 1000
    const canvasHeight = options?.targetCanvas?.[1] ?? 562.5

    // D-36: Check if background uses pattern fill BEFORE transformation
    // If yes, render full SVG background to PNG to preserve tiling effect
    let backgroundImagePng: string | undefined
    if (ast.patternRegistry && ast.patternRegistry.size > 0) {
      backgroundImagePng = await renderBackgroundPatternToPng(
        ast.root,
        ast.patternRegistry,
        ast.width,
        ast.height,
      )
    }

    const elements = await transformToPPTElement(ast, options?.targetCanvas)

    // Infer background from first element; remove it from elements if found
    const background = inferBackground(elements, canvasWidth, canvasHeight)
    let slideElements = background ? elements.slice(1) : elements

    // D-36: If background pattern PNG was generated, remove background group elements from slide
    if (backgroundImagePng) {
      // Filter out elements that belong to the background group (bg-texture, background, etc.)
      slideElements = slideElements.filter(el => {
        if (el.groupId) {
          const gid = el.groupId.toLowerCase()
          return !(gid.includes('bg') || gid.includes('background'))
        }
        return true
      })
    }

    // Build complete Slide object (PPTist format)
    const slide: Slide = {
      id: uuidv4(),
      elements: slideElements,
    }
    if (backgroundImagePng) {
      slide.background = { type: 'image', image: { src: backgroundImagePng, size: 'cover' } }
    } else if (background) {
      slide.background = background
    }

    // Wrap in full PPTist presentation format
    const presentation = {
      title: '未命名演示文稿',
      width: canvasWidth,
      height: canvasHeight,
      theme: {
        themeColors: ['#5b9bd5', '#ed7d31', '#a5a5a5', '#ffc000', '#4472c4', '#70ad47'],
        fontColor: '#333',
        fontName: '',
        backgroundColor: '#fff',
        shadow: { h: 3, v: 3, blur: 2, color: '#808080' },
        outline: { width: 2, color: '#525252', style: 'solid' },
      },
      slides: [slide],
    }

    return {
      success: true,
      output: JSON.stringify(presentation, null, 2),
      elementCount: elements.length,
    }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export { parseSvg } from './parser/svg-parser'
export { transformToPPTElement } from './transformer/transform-to-pptel'
export type { PPTElement, Slide } from './slides'
