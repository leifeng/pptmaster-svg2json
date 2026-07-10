/**
 * SVG use tag handler - extracted from svg-parser.ts
 * Handles:
 * 1. <use data-icon="library/name"> - icon embedding from templates/icons/
 * 2. <use href="xxx.svg"> - external SVG file embedding
 */

import { Resvg } from '@resvg/resvg-js'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

// Icon library configuration
const ICONS_BASE = path.resolve(__dirname, '../templates/icons')

const STYLE_CONFIG: Record<string, { mode: 'fill' | 'stroke' | 'duotone' }> = {
  'chunk-filled': { mode: 'fill' },
  'tabler-filled': { mode: 'fill' },
  'tabler-outline': { mode: 'stroke' },
  'phosphor-duotone': { mode: 'duotone' },
  'simple-icons': { mode: 'fill' },
}

/**
 * Adjust path d attribute to account for viewBox offset.
 * If viewBox doesn't start at 0,0, we need to shift the path coordinates.
 */
function adjustPathToViewBox(d: string, viewBox: { x: number; y: number; width: number; height: number }): string {
  if (viewBox.x === 0 && viewBox.y === 0) return d

  // Parse path and adjust coordinates
  // This handles M, L, H, V, C, S, Q, T, A, Z commands
  const commands = d.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || []
  let result = ''

  for (const cmd of commands) {
    const type = cmd[0].toUpperCase()
    const isRelative = cmd[0] === cmd[0].toLowerCase()
    const nums = cmd.slice(1).trim().split(/[\s,]+/).filter(s => s).map(parseFloat)

    switch (type) {
      case 'M':
      case 'L':
      case 'T': {
        if (nums.length >= 2) {
          let x = nums[0]
          let y = nums[1]
          if (isRelative && type !== 'T') {
            // For relative commands, the adjustment is already baked in since we start from last point
          } else {
            x -= viewBox.x
            y -= viewBox.y
          }
          result += cmd[0] + x + ' ' + y + cmd.slice(1).trim().substring(cmd.indexOf(nums[0].toString()))
        }
        break
      }
      default:
        result += cmd
    }
  }

  return result || d
}

/**
 * Render SVG string to PNG and return base64 data URL.
 */
async function renderSvgToBase64Png(svgString: string, width?: number, height?: number): Promise<string> {
  const resvg = new Resvg(svgString, width && height ? {
    fitTo: { mode: 'width', value: width }
  } : undefined)
  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()
  return `data:image/png;base64,${pngBuffer.toString('base64')}`
}

/**
 * Auto-embed <use> tags:
 * 1. data-icon references (from templates/icons/)
 * 2. external SVG href references
 *
 * @param xmlString - SVG XML string
 * @param canvasScaleX - Canvas X scale for coordinate adjustment
 * @param canvasScaleY - Canvas Y scale for coordinate adjustment
 * @param svgFilePath - Optional path to the main SVG file (for resolving relative href references)
 * @returns Object with modified xmlString and optional tempFilePath
 */
export function autoEmbedIcons(
  xmlString: string,
  canvasScaleX: number = 1,
  canvasScaleY: number = 1,
  svgFilePath?: string
): { xmlString: string; tempFilePath?: string } {
  // Check if there's anything to process
  const hasDataIcon = /<use\s+data-icon="([^"]+)"([^>]*?)\/?>(?:<\/use>)?/g.test(xmlString)
  const hasExternalHref = /<use\s+(?:href|xlink:href)="([^"]+\.svg)"([^>]*?)\/?>(?:<\/use>)?/gi.test(xmlString)

  if (!hasDataIcon && !hasExternalHref) {
    return { xmlString }
  }

  // Process data-icon references first (existing functionality)
  let processedXml = xmlString

  // Match <use data-icon="xxx/yyy" .../>
  const useRegex = /<use\s+data-icon="([^"]+)"([^>]*?)\/?>(?:<\/use>)?/g

  processedXml = processedXml.replace(useRegex, (match, iconRef, attrs) => {
    const iconPath = path.join(ICONS_BASE, iconRef + '.svg')
    if (!fs.existsSync(iconPath)) {
      console.warn(`警告: 图标文件不存在 - ${iconPath}`)
      return match
    }

    // Parse attributes
    const attrMap: Record<string, string> = {}
    const attrRegex = /(\w+(?:-\w+)?)="([^"]*)"/g
    let attrMatch
    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      attrMap[attrMatch[1]] = attrMatch[2]
    }

    const fill = attrMap.fill || '#000000'
    const strokeWidth = attrMap['stroke-width'] || '2'
    const x = attrMap.x || '0'
    const y = attrMap.y || '0'
    const width = parseFloat(attrMap.width || '24')
    const height = parseFloat(attrMap.height || '24')

    // Read icon SVG
    const svgContent = fs.readFileSync(iconPath, 'utf-8')

    // Extract viewBox
    const vbMatch = svgContent.match(/viewBox="([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)"/)
    let iconViewBox = vbMatch ? {
      x: parseFloat(vbMatch[1]),
      y: parseFloat(vbMatch[2]),
      width: parseFloat(vbMatch[3]),
      height: parseFloat(vbMatch[4])
    } : { x: 0, y: 0, width: 24, height: 24 }

    // Adjust viewBox to start at 0,0 for proper rendering
    let adjustedSvgContent = svgContent
    if (iconViewBox.x !== 0 || iconViewBox.y !== 0) {
      adjustedSvgContent = svgContent.replace(
        /viewBox="([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)"/,
        `viewBox="0 0 ${iconViewBox.width} ${iconViewBox.height}"`
      )
    }

    // Apply fill color substitution (icons use currentColor which Resvg doesn't resolve)
    if (fill && fill !== '#000000') {
      adjustedSvgContent = adjustedSvgContent
        .replace(/stroke="currentColor"/g, `stroke="${fill}"`)
        .replace(/fill="currentColor"/g, `fill="${fill}"`)
        .replace(/stroke-width="([^"]*)"/g, (match, sw) => `stroke-width="${(parseFloat(sw) / (width / iconViewBox.width)).toFixed(2)}"`)
    }

    try {
      // Render SVG to PNG using resvg-js
      const resvg = new Resvg(adjustedSvgContent, {
        fitTo: { mode: 'width', value: width }
      })
      const pngData = resvg.render()
      const pngBuffer = pngData.asPng()
      const base64 = pngBuffer.toString('base64')
      const dataUrl = `data:image/png;base64,${base64}`

      // Generate transform if position differs from 0,0
      let transform = ''
      if (x !== '0' || y !== '0') {
        transform = ` transform="translate(${x}, ${y})"`
      }

      // Return image element replacing the use element
      return `<image href="${dataUrl}" width="${width}" height="${height}"${transform}/>`
    } catch (err) {
      console.warn(`警告: 无法渲染图标 - ${iconPath}: ${err}`)
      return match
    }
  })

  // Process external SVG href references
  // Match <use href="xxx.svg" .../> or <use xlink:href="xxx.svg" .../>
  const externalHrefRegex = /<use\s+(?:href|xlink:href)="([^"]+\.svg)"([^>]*?)\/?>(?:<\/use>)?/gi

  processedXml = processedXml.replace(externalHrefRegex, (match, href, attrs) => {
    // Resolve relative path based on svgFilePath
    let externalSvgPath: string
    if (svgFilePath) {
      const svgDir = path.dirname(path.resolve(svgFilePath))
      externalSvgPath = path.resolve(svgDir, href)
    } else {
      externalSvgPath = path.resolve(href)
    }

    // Check if file exists
    if (!fs.existsSync(externalSvgPath)) {
      console.warn(`警告: 外部 SVG 文件不存在 - ${externalSvgPath}`)
      return match
    }

    // Parse attributes from the use element
    const attrMap: Record<string, string> = {}
    const attrRegex = /(\w+(?:-\w+)?)="([^"]*)"/g
    let attrMatch
    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      attrMap[attrMatch[1]] = attrMatch[2]
    }

    const x = attrMap.x || '0'
    const y = attrMap.y || '0'
    const width = attrMap.width || '24'
    const height = attrMap.height || '24'
    const preserveAspectRatio = attrMap.preserveAspectRatio || 'xMidYMid meet'

    try {
      // Read external SVG
      const externalSvgContent = fs.readFileSync(externalSvgPath, 'utf-8')

      // Extract viewBox to determine aspect ratio
      const vbMatch = externalSvgContent.match(/viewBox="([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)"/)
      let intrinsicWidth = parseFloat(vbMatch?.[3] || '') || parseFloat(width) || 24
      let intrinsicHeight = parseFloat(vbMatch?.[4] || '') || parseFloat(height) || 24

      // Adjust viewBox for proper scaling
      let adjustedSvgContent = externalSvgContent
      if (vbMatch) {
        const vbX = parseFloat(vbMatch[1])
        const vbY = parseFloat(vbMatch[2])
        // If viewBox doesn't start at 0,0, adjust paths
        if (vbX !== 0 || vbY !== 0) {
          const vbWidth = parseFloat(vbMatch[3])
          const vbHeight = parseFloat(vbMatch[4])
          adjustedSvgContent = externalSvgContent.replace(
            /viewBox="([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)"/,
            `viewBox="0 0 ${vbWidth} ${vbHeight}"`
          )
        }
      }

      // Render SVG to base64 PNG
      const base64Png = renderSvgToBase64Png(adjustedSvgContent, parseFloat(width), parseFloat(height))

      // For async rendering, we'd need to change the function signature
      // For now, we'll embed the SVG directly as an image element with data URI
      // Since renderSvgToBase64Png is async, we need to handle this synchronously
      // Use synchronous rendering approach with Resvg's sync API

      const resvg = new Resvg(adjustedSvgContent, {
        fitTo: { mode: 'width', value: parseFloat(width) }
      })
      const pngData = resvg.render()
      const pngBuffer = pngData.asPng()
      const base64 = pngBuffer.toString('base64')
      const dataUrl = `data:image/png;base64,${base64}`

      // Generate transform if position differs from 0,0
      let transform = ''
      if (x !== '0' || y !== '0') {
        transform = ` transform="translate(${x}, ${y})"`
      }

      // Return image element replacing the use element
      return `<image href="${dataUrl}" width="${width}" height="${height}"${transform} preserveAspectRatio="${preserveAspectRatio}"/>`
    } catch (err) {
      console.warn(`警告: 无法渲染外部 SVG - ${externalSvgPath}: ${err}`)
      return match
    }
  })

  // Create temporary file with processed content
  const tempFilePath = path.join(os.tmpdir(), `svg2json_icon_embed_${Date.now()}_${Math.random().toString(36).slice(2)}.svg`)
  fs.writeFileSync(tempFilePath, processedXml, 'utf-8')

  return { xmlString: processedXml, tempFilePath }
}
