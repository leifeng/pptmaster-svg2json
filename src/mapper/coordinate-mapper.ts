import { SvgElement, CoordinateMapping, TransformResult } from '../types/ast'

/**
 * Parse gradientTransform attribute to extract rotation angle.
 * D-17: gradientTransform matrix rotation extracted via matrix decomposition.
 */
export function parseGradientTransform(transform: string | undefined): number {
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
 * Parse a viewBox string into [minX, minY, width, height].
 * Per D-09: viewBox parsed as [minX, minY, width, height] format.
 * Per D-08: SVG viewBox coordinates 1:1 map to PPTElement left/top/width/height (no scaling).
 */
export function parseViewBox(viewBoxStr: string | undefined): [number, number, number, number] {
  if (!viewBoxStr) return [0, 0, 1280, 720]
  const parts = viewBoxStr.trim().split(/[\s,]+/).map(Number)
  if (parts.length < 4 || parts.some(isNaN)) return [0, 0, 1280, 720]
  return [parts[0], parts[1], parts[2], parts[3]]
}

/**
 * Extract a numeric value from a string or number attribute.
 */
export function extractNumber(value: string | number | undefined, fallback: number): number {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const cleaned = value.replace(/px$/, '').trim()
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? fallback : parsed
  }
  return fallback
}

/**
 * Parse SVG transform attribute into component values.
 * Per D-04: translate/scale/rotate parsed; D-05: matrix marked as special.
 */
export function parseTransform(transform: string | undefined): TransformResult {
  if (!transform) return { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotateDeg: 0 }
  const result: TransformResult = {}

  // translate(dx, dy) or translate(dx) — allow negative values
  const translateMatch = transform.match(/translate\(\s*([\d.-]+)(?:[,\s]+([\d.-]+))?\s*\)/)
  if (translateMatch) {
    result.translateX = parseFloat(translateMatch[1])
    result.translateY = translateMatch[2] ? parseFloat(translateMatch[2]) : 0
  }

  // scale(sx, sy) or scale(s) — allow negative values for flip transforms
  const scaleMatch = transform.match(/scale\(\s*([\d.-]+)(?:[,\s]+([\d.-]+))?\s*\)/)
  if (scaleMatch) {
    result.scaleX = parseFloat(scaleMatch[1])
    result.scaleY = scaleMatch[2] ? parseFloat(scaleMatch[2]) : result.scaleX
  }

  // rotate(deg, cx, cy) or rotate(deg)
  const rotateMatch = transform.match(/rotate\(\s*([\d.]+)(?:[,\s]+([\d.]+),?\s*([\d.]+))?\s*\)/)
  if (rotateMatch) {
    result.rotateDeg = parseFloat(rotateMatch[1])
    result.rotateCX = rotateMatch[2] ? parseFloat(rotateMatch[2]) : undefined
    result.rotateCY = rotateMatch[3] ? parseFloat(rotateMatch[3]) : undefined
  }

  // matrix not supported → special: true
  if (/matrix\(/.test(transform)) {
    result.raw = transform
    result.special = true
  }

  return result
}

/**
 * Compute bounding box of a path's M/L/H/V commands.
 */
function pathBoundingBox(d: string): { left: number; top: number; width: number; height: number } | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  // Simple path parser for M, L, H, V commands
  // Split by command letter, then extract numbers from each segment
  const segments = d.split(/(?=[MLHV])/i)
  for (const seg of segments) {
    const cmdMatch = seg.match(/^([MLHV])\s*/i)
    if (!cmdMatch) continue
    const cmd = cmdMatch[1].toUpperCase()
    const nums = seg.slice(cmdMatch[0].length).trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n))

    if (cmd === 'M' || cmd === 'L') {
      for (let i = 0; i < nums.length; i += 2) {
        if (i < nums.length) minX = Math.min(minX, nums[i]), maxX = Math.max(maxX, nums[i])
        if (i + 1 < nums.length) minY = Math.min(minY, nums[i + 1]), maxY = Math.max(maxY, nums[i + 1])
      }
    } else if (cmd === 'H') {
      for (const x of nums) { minX = Math.min(minX, x); maxX = Math.max(maxX, x) }
    } else if (cmd === 'V') {
      for (const y of nums) { minY = Math.min(minY, y); maxY = Math.max(maxY, y) }
    }
  }

  if (!isFinite(minX)) return null

  return {
    left: minX,
    top: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Map an SVG element's geometry to left/top/width/height.
 * Per D-08: 1:1 mapping from SVG viewBox coordinates.
 * Per D-04: transform attribute applied BEFORE reading direct attributes.
 */
export function mapCoordinates(
  element: SvgElement,
  viewBox: [number, number, number, number],
): CoordinateMapping {
  const { attrs } = element
  const tag = element.type.toLowerCase()

  // Parse transform first (per D-04)
  const transform = parseTransform(attrs.transform)
  const tx = transform.translateX || 0
  const ty = transform.translateY || 0
  // Use absolute scale values — negative scale is handled via flipH/flipV in applyTransform
  const sx = transform.scaleX ?? 1
  const sy = transform.scaleY ?? 1

  let left = 0
  let top = 0
  let width = viewBox[2]
  let height = viewBox[3]

  switch (tag) {
    case 'rect': {
      left = extractNumber(attrs.x, 0) * Math.abs(sx) + tx
      top = extractNumber(attrs.y, 0) * Math.abs(sy) + ty
      width = extractNumber(attrs.width, viewBox[2]) * Math.abs(sx)
      height = extractNumber(attrs.height, viewBox[3]) * Math.abs(sy)
      break
    }

    case 'circle': {
      const cx = extractNumber(attrs.cx, 0) * Math.abs(sx) + tx
      const cy = extractNumber(attrs.cy, 0) * Math.abs(sy) + ty
      const r = extractNumber(attrs.r, 0) * Math.min(Math.abs(sx), Math.abs(sy))
      left = cx - r
      top = cy - r
      width = 2 * r
      height = 2 * r
      break
    }

    case 'ellipse': {
      const cx = extractNumber(attrs.cx, 0) + tx
      const cy = extractNumber(attrs.cy, 0) + ty
      const rx = extractNumber(attrs.rx, 0) * Math.abs(sx)
      const ry = extractNumber(attrs.ry, 0) * Math.abs(sy)
      left = cx - rx
      top = cy - ry
      width = 2 * rx
      height = 2 * ry
      break
    }

    case 'line': {
      const x1 = extractNumber(attrs.x1, 0) * Math.abs(sx) + tx
      const y1 = extractNumber(attrs.y1, 0) * Math.abs(sy) + ty
      const x2 = extractNumber(attrs.x2, 0) * Math.abs(sx) + tx
      const y2 = extractNumber(attrs.y2, 0) * Math.abs(sy) + ty
      left = Math.min(x1, x2)
      top = Math.min(y1, y2)
      width = Math.abs(x2 - x1)
      height = Math.abs(y2 - y1)
      break
    }

    case 'path': {
      // Per D-03: path d attribute kept unchanged; compute bounding box from path data
      const d = typeof attrs.d === 'string' ? attrs.d : ''
      const bbox = pathBoundingBox(d)
      if (bbox) {
        left = bbox.left * Math.abs(sx) + tx
        top = bbox.top * Math.abs(sy) + ty
        width = bbox.width * Math.abs(sx)
        height = bbox.height * Math.abs(sy)
      }
      break
    }

    case 'text': {
      // Estimate bounds from font-size and character count
      const fontSize = extractNumber(attrs['font-size'], 16)
      left = extractNumber(attrs.x, 0) * Math.abs(sx) + tx
      top = extractNumber(attrs.y, 0) * Math.abs(sy) + ty
      width = fontSize * 10 // rough estimate
      height = fontSize * 1.5
      break
    }

    case 'image': {
      left = extractNumber(attrs.x, 0) * Math.abs(sx) + tx
      top = extractNumber(attrs.y, 0) * Math.abs(sy) + ty
      width = extractNumber(attrs.width, viewBox[2]) * Math.abs(sx)
      height = extractNumber(attrs.height, viewBox[3]) * Math.abs(sy)
      break
    }

    default:
      // For groups and other elements, try direct attributes
      left = extractNumber(attrs.x, 0) * Math.abs(sx) + tx
      top = extractNumber(attrs.y, 0) * Math.abs(sy) + ty
      width = extractNumber(attrs.width, viewBox[2]) * Math.abs(sx)
      height = extractNumber(attrs.height, viewBox[3]) * Math.abs(sy)
      break
  }

  return { left, top, width, height }
}
