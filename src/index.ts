import { randomUUID as uuidv4 } from 'crypto'
import { parseSvg } from './parser/svg-parser'
import { transformToPPTElement } from './transformer/transform-to-pptel'
import { renderSvgToPng } from './text-measurer'
import type { PPTElement, Slide, SlideBackground } from './slides'
import type { SvgElement } from './types/ast'
import { log, logStep } from './utils'
import { resolve, join, basename, dirname } from 'path'
import { mkdirSync, writeFileSync, readdirSync } from 'fs'

export interface ConvertOptions {
  targetCanvas?: [number, number]; // Target canvas size [width, height], defaults to [1000, 562.5]
  svgFilePath?: string; // Path to SVG file for resolving external href references
}

export interface ConvertResult {
  success: boolean;
  output?: string;
  error?: string;
  elementCount?: number;
  /**
   * The resulting Slide object (PPTist format).
   * Surfaced for Plan 02's animation-injection pass and for programmatic
   * consumers that want typed access (vs. the JSON-string `output`).
   */
  slide?: Slide;
}

/**
 * D-04: ConvertDirOptions — configuration surface for `convertDir()` parent-dir mode.
 *
 * `animationsPath` is a Wave 2 seam: Plan 14-01 accepts the option but ignores
 * its content (D-22 strict — no animations injected yet). Plan 14-02 wires
 * the actual sidecar parsing + PPTAnimation[] injection on top.
 */
export interface ConvertDirOptions {
  targetCanvas?: [number, number];
  /** Reserved for Plan 14-02 — animations.json path inside parentDir. */
  animationsPath?: string;
}

export interface InjectorDiagnostics {
  slidesMatched: number;
  animationsInjected: number;
  fieldsPreservedInExtensions: number;
  unmappedEffectsFallback: number;
  warnings: string[];
}

/**
 * Empty diagnostics skeleton for Wave 1 (D-23 prints real numbers in Plan 02).
 */
function emptyInjectorDiagnostics(): InjectorDiagnostics {
  return {
    slidesMatched: 0,
    animationsInjected: 0,
    fieldsPreservedInExtensions: 0,
    unmappedEffectsFallback: 0,
    warnings: [],
  }
}

export interface ConvertDirResult {
  success: boolean;
  slides: Slide[];
  errors: Array<{ file: string; error: string }>;
  diagnostics: InjectorDiagnostics;
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
  const debugPath = resolve(__dirname, '../../exampels/测试/debug-bg.svg')
  mkdirSync(dirname(debugPath), { recursive: true })
  writeFileSync(debugPath, bgSvg)

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

/**
 * Internal single-SVG conversion helper shared by `convert()` and `convertDir()`.
 * Returns the assembled Slide in PPTist shape plus element count.
 *
 * Plan 14-01: this is the seam that lets `convertDir()` reuse the same parsing,
 * background inference, and PPTElement wiring that `convert()` uses. Per D-04
 * the returned object exposes a typed `Slide` so callers can do programmatic
 * animation injection in Plan 14-02 without re-parsing.
 */
async function convertOne(
  svgContent: string,
  options?: ConvertOptions,
): Promise<{ slide: Slide; elementCount: number }> {
  const ast = await logStep('[解析] parseSvg', async () => parseSvg(svgContent, options?.svgFilePath))

  // Basic validation: must have a root svg element
  if (!ast.root || ast.root.type !== 'svg') {
    throw new Error('Invalid SVG: no svg root element')
  }
  // Must have non-empty content (at least width/height or children)
  if (ast.width <= 0 || ast.height <= 0) {
    throw new Error('Invalid SVG: missing width/height')
  }

  const canvasWidth = options?.targetCanvas?.[0] ?? 1000
  const canvasHeight = options?.targetCanvas?.[1] ?? 562.5

  // D-36: Check if background uses pattern fill BEFORE transformation
  // If yes, render full SVG background to PNG to preserve tiling effect
  let backgroundImagePng: string | undefined
  if (ast.patternRegistry && ast.patternRegistry.size > 0) {
    backgroundImagePng = await logStep(
      '[解析] renderBackgroundPatternToPng',
      async () => renderBackgroundPatternToPng(ast.root, ast.patternRegistry!, ast.width, ast.height),
    )
  }

  const elements = await logStep(
    '[转换] transformToPPTElement',
    async () => transformToPPTElement(ast, options?.targetCanvas),
  )

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

  return { slide, elementCount: elements.length }
}

export async function convert(svgContent: string, options?: ConvertOptions): Promise<ConvertResult> {
  const totalStart = performance.now()
  log('[主流程] 开始转换')

  try {
    const { slide, elementCount } = await convertOne(svgContent, options)

    const canvasWidth = options?.targetCanvas?.[0] ?? 1000
    const canvasHeight = options?.targetCanvas?.[1] ?? 562.5

    // Wrap in full PPTist presentation format
    const presentation = {
      title: '未命名演示文稿',
      width: canvasWidth,
      height: canvasHeight,
      theme: {
        themeColors: ['#5b9bd5', '#ed7d31', '#a5a5a5', '#ffc000', '#4472c4', '#70ad47'],
        fontColor: '#333',
        fontName: 'Source Han Sans CN Regular',
        backgroundColor: '#fff',
        shadow: { h: 3, v: 3, blur: 2, color: '#808080' },
        outline: { width: 2, color: '#525252', style: 'solid' },
      },
      slides: [slide],
    }

    const totalDuration = Math.round(performance.now() - totalStart)
    log('[主流程] 转换完成', `共 ${elementCount} 个元素, 耗时 ${totalDuration}ms`)

    return {
      success: true,
      output: JSON.stringify(presentation, null, 2),
      elementCount,
      slide,
    }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

/**
 * D-01~03 + D-04: Convert a parent directory of SVG files into a multi-slide PPTist
 * presentation. Each `<svg_output_dir>/<name>.svg` produces `<svg_output_dir>/<name>.svg.json`
 * containing the same `{ title, width, height, theme, slides: [slide] }` envelope as
 * `convert()`. Per D-22, NO `slide.animations` or `slide.turningMode` is populated in
 * this plan — Wave 1 ships empty-animation slides for Plan 02 to layer onto.
 *
 * D-22: sidecar-less parents still emit N `.svg.json` files with empty `animations[]`.
 * Diagnostics are an empty skeleton in Wave 1 (D-23 prints real numbers in Plan 02).
 */
export async function convertDir(
  parentDir: string,
  options?: ConvertDirOptions,
): Promise<ConvertDirResult> {
  const svgOutputDir = join(parentDir, 'svg_output')
  const files = readdirSync(svgOutputDir)
    .filter(name => name.toLowerCase().endsWith('.svg'))
    .sort()

  const slides: Slide[] = []
  const errors: Array<{ file: string; error: string }> = []

  for (const file of files) {
    const fullPath = join(svgOutputDir, file)
    try {
      const { readFileSync } = await import('fs')
      const svgContent = readFileSync(fullPath, 'utf-8')
      const { slide } = await convertOne(svgContent, {
        targetCanvas: options?.targetCanvas,
        svgFilePath: fullPath,
      })
      // slideId derives from filename without `.svg`
      const slideId = basename(file, '.svg')
      // Pin the slide.id to the deterministic filename-derived id (Plan 14-02
      // animations.json uses slide_id to match — non-deterministic uuid would
      // break matching across runs). We do NOT mutate `slide.id` if it is
      // already deterministic? But convertOne always uses uuidv4() — so we
      // override here and persist.
      slide.id = slideId
      slides.push(slide)

      // Write `<file>.svg.json` envelope (same shape as convert() output)
      const canvasWidth = options?.targetCanvas?.[0] ?? 1000
      const canvasHeight = options?.targetCanvas?.[1] ?? 562.5
      const envelope = {
        title: '未命名演示文稿',
        width: canvasWidth,
        height: canvasHeight,
        theme: {
          themeColors: ['#5b9bd5', '#ed7d31', '#a5a5a5', '#ffc000', '#4472c4', '#70ad47'],
          fontColor: '#333',
          fontName: 'Source Han Sans CN Regular',
          backgroundColor: '#fff',
          shadow: { h: 3, v: 3, blur: 2, color: '#808080' },
          outline: { width: 2, color: '#525252', style: 'solid' },
        },
        slides: [slide],
      }
      writeFileSync(fullPath + '.svg.json', JSON.stringify(envelope, null, 2), 'utf-8')
    } catch (err) {
      errors.push({ file: fullPath, error: String(err) })
    }
  }

  return {
    success: errors.length === 0,
    slides,
    errors,
    diagnostics: emptyInjectorDiagnostics(),
  }
}

export { parseSvg } from './parser/svg-parser'
export { transformToPPTElement } from './transformer/transform-to-pptel'
export type { PPTElement, Slide } from './slides'
