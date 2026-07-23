/**
 * Text measurement module using @resvg/resvg-js for accurate bounding box computation.
 * Lazy singleton pattern for WASM initialization.
 */

import { Resvg } from '@resvg/resvg-js'
import { logEnd } from './utils'

/**
 * Input type for measureTextElement.
 */
export interface TextMeasurementInput {
  content: string
  fontFamily: string
  fontSize: number
  fontWeight?: string
  fontStyle?: string
  letterSpacing?: number
  fill?: string
  /** SVG text-anchor attribute: 'start' | 'middle' | 'end' */
  textAnchor?: string
  /** SVG x attribute value */
  x?: number
}

/**
 * Build a self-contained SVG string for text measurement.
 * Uses fixed 1280x720 viewBox per D-37 to prevent content clipping.
 * XML-escapes content for safety.
 * Handles multi-line text by splitting on newlines and using tspan elements.
 */
export function buildMeasurementSvg(opts: {
  content: string
  fontFamily: string
  fontSize: number
  fontWeight?: string
  fontStyle?: string
  letterSpacing?: number
  fill?: string
  textAnchor?: string
  x?: number
}): string {
  // XML-escape & < > " for SVG attribute safety (but not \n)
  const escapeXml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const lines = opts.content.split('\n')
  const fontSize = opts.fontSize
  const fontWeight = opts.fontWeight ?? 'normal'
  const fontStyle = opts.fontStyle ?? 'normal'
  const letterSpacing = opts.letterSpacing ?? 0
  const fill = opts.fill ?? '#000000'
  const textAnchor = opts.textAnchor ?? 'start'
  const x = opts.x ?? 0

  let textContent: string
  if (lines.length === 1) {
    // Single line: simple text element
    textContent = escapeXml(lines[0])
  } else {
    // Multi-line: use tspan elements with dy for line breaks
    // First line at y=fontSize, subsequent lines offset by 1em
    textContent = lines
      .map((line, i) => {
        const escapedLine = escapeXml(line)
        if (i === 0) {
          return `<tspan x="${x}" dy="0">${escapedLine}</tspan>`
        } else {
          return `<tspan x="${x}" dy="1em">${escapedLine}</tspan>`
        }
      })
      .join('')
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <text x="${x}" y="${fontSize}"
        font-family="${escapeXml(opts.fontFamily)}"
        font-size="${fontSize}"
        font-weight="${fontWeight}"
        font-style="${fontStyle}"
        letter-spacing="${letterSpacing}"
        fill="${fill}"
        text-anchor="${textAnchor}"
        xml:space="preserve">${textContent}</text>
</svg>`
}

// Lazy singleton for WASM init — module-level promise ensures init happens once
let initPromise: Promise<void> | null = null

async function ensureInit(): Promise<void> {
  if (initPromise) return initPromise
  // Dynamic import triggers WASM loading
  initPromise = import('@resvg/resvg-js').then(() => {
    // WASM loads on module import
  })
  return initPromise
}

/**
 * Measure text bounding box by rendering SVG via resvg-js.
 * Uses getBBox() which applies transforms and returns the visible bounding box.
 * @throws if bounding box is undefined or has zero dimensions
 */
export async function measureTextBBox(svgString: string): Promise<{ width: number; height: number; y: number }> {
  const start = performance.now()
  await ensureInit()
  const resvg = new Resvg(svgString)
  const bbox = resvg.getBBox()

  if (!bbox) {
    throw new Error('No bounding box returned from resvg-js')
  }

  if (bbox.width === 0 || bbox.height === 0) {
    throw new Error('Bounding box has zero dimensions')
  }

  logEnd('[文本测量] measureTextBBox', Math.round(performance.now() - start))
  return { width: bbox.width, height: bbox.height, y: bbox.y }
}

/**
 * High-level API: builds measurement SVG then measures it.
 * Catches errors and re-throws so caller can fall back to heuristic.
 */
export async function measureTextElement(
  input: TextMeasurementInput
): Promise<{ width: number; height: number; y: number }> {
  const svgString = buildMeasurementSvg(input)
  return measureTextBBox(svgString)
}

/**
 * Render SVG string to PNG as base64 data URL.
 * Used for rendering background patterns and other complex SVG elements.
 */
export async function renderSvgToPng(svgString: string, width: number, height: number): Promise<string> {
  await ensureInit()
  const resvg = new Resvg(svgString, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  })
  const pngData = resvg.render().asPng()
  return `data:image/png;base64,${pngData.toString('base64')}`
}
