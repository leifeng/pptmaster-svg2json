import { parseSvg } from './parser/svg-parser'
import { transformToPPTElement } from './transformer/transform-to-pptel'
import type { PPTElement } from './slides'

export interface ConvertOptions {
  targetCanvas?: [number, number]; // Target canvas size [width, height], defaults to [1000, 562.5]
}

export interface ConvertResult {
  success: boolean;
  output?: string;
  error?: string;
  elementCount?: number;
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
    const elements = transformToPPTElement(ast, options?.targetCanvas)
    return {
      success: true,
      output: JSON.stringify({ elements }, null, 2),
      elementCount: elements.length,
    }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export { parseSvg } from './parser/svg-parser'
export { transformToPPTElement } from './transformer/transform-to-pptel'
export type { PPTElement } from './slides'
