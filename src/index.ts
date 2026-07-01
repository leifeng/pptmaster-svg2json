import { v4 as uuidv4 } from 'uuid'
import { parseSvg } from './parser/svg-parser'
import { transformToPPTElement } from './transformer/transform-to-pptel'
import type { PPTElement, Slide, SlideBackground } from './slides'

export interface ConvertOptions {
  targetCanvas?: [number, number]; // Target canvas size [width, height], defaults to [1000, 562.5]
}

export interface ConvertResult {
  success: boolean;
  output?: string;
  error?: string;
  elementCount?: number;
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
    const ast = parseSvg(svgContent)
    // Basic validation: must have a root svg element
    if (!ast.root || ast.root.type !== 'svg') {
      return { success: false, error: 'Invalid SVG: no svg root element' }
    }
    // Must have non-empty content (at least width/height or children)
    if (ast.width <= 0 || ast.height <= 0) {
      return { success: false, error: 'Invalid SVG: missing width/height' }
    }
    const elements = await transformToPPTElement(ast, options?.targetCanvas)
    const canvasWidth = options?.targetCanvas?.[0] ?? 1000
    const canvasHeight = options?.targetCanvas?.[1] ?? 562.5

    // Infer background from first element; remove it from elements if found
    const background = inferBackground(elements, canvasWidth, canvasHeight)
    const slideElements = background ? elements.slice(1) : elements

    // Build complete Slide object (PPTist format)
    const slide: Slide = {
      id: uuidv4(),
      elements: slideElements,
      ...(background && { background }),
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
