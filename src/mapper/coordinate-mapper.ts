import { SvgElement, CoordinateMapping, TransformResult } from '../types/ast'

/**
 * Compose two transform strings into a single transform string.
 * Parent transform is applied first, then child transform.
 */
export function composeTransforms(parentTransform: string | undefined, childTransform: string | undefined): string | undefined {
  if (!parentTransform && !childTransform) return undefined
  if (!parentTransform) return childTransform
  if (!childTransform) return parentTransform
  // Both exist: apply parent then child
  return `${parentTransform} ${childTransform}`
}

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
 * Handles multiple transform commands (e.g., "translate(60, 220) translate(0, 116)")
 * by accumulating all translate/scale values and using the last rotate.
 */
export function parseTransform(transform: string | undefined): TransformResult {
  if (!transform) return { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotateDeg: 0 }
  const result: TransformResult = {
    translateX: 0,
    translateY: 0,
    scaleX: 1,
    scaleY: 1,
    rotateDeg: 0,
  }

  // Match all translate commands and accumulate
  const translateMatches = transform.matchAll(/translate\(\s*([\d.-]+)(?:[,\s]+([\d.-]+))?\s*\)/g)
  for (const match of translateMatches) {
    result.translateX! += parseFloat(match[1])
    result.translateY! += match[2] ? parseFloat(match[2]) : 0
  }

  // Match all scale commands and accumulate (multiply)
  const scaleMatches = transform.matchAll(/scale\(\s*([\d.-]+)(?:[,\s]+([\d.-]+))?\s*\)/g)
  for (const match of scaleMatches) {
    const sx = parseFloat(match[1])
    const sy = match[2] ? parseFloat(match[2]) : sx
    result.scaleX! *= sx
    result.scaleY! *= sy
  }

  // Match last rotate command (only one rotation is meaningful)
  const rotateMatches = [...transform.matchAll(/rotate\(\s*([\d.]+)(?:[,\s]+([\d.]+),?\s*([\d.]+))?\s*\)/g)]
  if (rotateMatches.length > 0) {
    const lastMatch = rotateMatches[rotateMatches.length - 1]
    result.rotateDeg = parseFloat(lastMatch[1])
    result.rotateCX = lastMatch[2] ? parseFloat(lastMatch[2]) : undefined
    result.rotateCY = lastMatch[3] ? parseFloat(lastMatch[3]) : undefined
  }

  // matrix not supported → special: true
  if (/matrix\(/.test(transform)) {
    result.raw = transform
    result.special = true
  }

  return result
}

/**
 * Compute bounding box of a path's M/L/H/V/A/C/Q/S/T commands.
 * For arcs, we include the endpoint. For curves (C/Q/S/T), use control point enclosure.
 */
export function pathBoundingBox(d: string): { left: number; top: number; width: number; height: number } | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  let curX = 0
  let curY = 0
  let prevCtrlX = 0
  let prevCtrlY = 0
  let prevCmdU = ''

  // Split by any command letter
  const segments = d.split(/(?=[MLHVACQSz])/i)
  for (const seg of segments) {
    const cmdMatch = seg.match(/^([MLHVACQSz])\s*/i)
    if (!cmdMatch) continue
    const cmd = cmdMatch[1]
    const isRel = cmd === cmd.toLowerCase()
    const cmdU = cmd.toUpperCase()
    const nums = seg.slice(cmdMatch[0].length).trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n))

    if (cmdU === 'Z') {
      continue
    }

    if (cmdU === 'M' || cmdU === 'L') {
      for (let i = 0; i < nums.length; i += 2) {
        const x = isRel ? curX + nums[i] : nums[i]
        const y = i + 1 < nums.length ? (isRel ? curY + nums[i + 1] : nums[i + 1]) : curY
        minX = Math.min(minX, x); maxX = Math.max(maxX, x)
        minY = Math.min(minY, y); maxY = Math.max(maxY, y)
        curX = x; curY = y
        prevCtrlX = curX; prevCtrlY = curY
      }
    } else if (cmdU === 'H') {
      for (const nx of nums) {
        const x = isRel ? curX + nx : nx
        minX = Math.min(minX, x); maxX = Math.max(maxX, x)
        curX = x
        prevCtrlX = curX; prevCtrlY = curY
      }
    } else if (cmdU === 'V') {
      for (const ny of nums) {
        const y = isRel ? curY + ny : ny
        minY = Math.min(minY, y); maxY = Math.max(maxY, y)
        curY = y
        prevCtrlX = curX; prevCtrlY = curY
      }
    } else if (cmdU === 'A') {
      // Arc: rx ry x-axis-rotation large-arc-flag sweep-flag x y
      // For accurate bbox, we need to consider the arc's extent
      // Using center-based approach works for most cases but can overestimate for small arcs
      // We use the chord endpoints + arc extremes based on sweep direction
      if (nums.length >= 7) {
        const rx = Math.abs(nums[0])
        const ry = Math.abs(nums[1])
        const xAxisRot = nums[2]
        const largeArcFlag = nums[3]
        const sweepFlag = nums[4]
        const x = isRel ? curX + nums[5] : nums[5]
        const y = isRel ? curY + nums[6] : nums[6]

        // Get actual start point
        const sx = curX
        const sy = curY

        // For most arcs, using center ± rx/ry gives a reasonable bbox
        // For small arcs (like rounded rectangle corners), this overestimates
        // We use both approaches and take the union
        const chordMinX = Math.min(sx, x)
        const chordMaxX = Math.max(sx, x)
        const chordMinY = Math.min(sy, y)
        const chordMaxY = Math.max(sy, y)

        // Center-based estimate (may overestimate for small arcs)
        const centerX = (sx + x) / 2
        const centerY = (sy + y) / 2

        // Include chord endpoints and center-based ellipse extents
        // For large arcs (>180°): center ± rx/ry is appropriate since arc covers significant portion
        // For small arcs: add buffer based on rx/ry but not full extension
        if (largeArcFlag) {
          // Large arc: center-based expansion is appropriate
          minX = Math.min(minX, centerX - rx)
          maxX = Math.max(maxX, centerX + rx)
          minY = Math.min(minY, centerY - ry)
          maxY = Math.max(maxY, centerY + ry)
        } else {
          // Small arc: use chord endpoints only
          // This may slightly underestimate for corner arcs but is consistent
          // For corner arcs (rx ~= 0.5 * chord length for 90°), the arc stays close to chord
          minX = Math.min(minX, sx, x)
          maxX = Math.max(maxX, sx, x)
          minY = Math.min(minY, sy, y)
          maxY = Math.max(maxY, sy, y)
        }

        curX = x; curY = y
        prevCtrlX = curX; prevCtrlY = curY
      }
    } else if (cmdU === 'C') {
      // Cubic bezier: x1,y1 x2,y2 x,y (6 params after command)
      for (let i = 0; i < nums.length; i += 6) {
        const x1 = isRel ? curX + nums[i] : nums[i]
        const y1 = isRel ? curY + nums[i + 1] : nums[i + 1]
        const x2 = isRel ? curX + nums[i + 2] : nums[i + 2]
        const y2 = isRel ? curY + nums[i + 3] : nums[i + 3]
        const x = isRel ? curX + nums[i + 4] : nums[i + 4]
        const y = isRel ? curY + nums[i + 5] : nums[i + 5]
        // Control point enclosure: curve is within convex hull of 4 control points
        minX = Math.min(minX, x1, x2, x); maxX = Math.max(maxX, x1, x2, x)
        minY = Math.min(minY, y1, y2, y); maxY = Math.max(maxY, y1, y2, y)
        curX = x; curY = y
        prevCtrlX = x2; prevCtrlY = y2
      }
      prevCmdU = 'C'
    } else if (cmdU === 'Q') {
      // Quadratic bezier: x1,y1 x,y (4 params after command)
      for (let i = 0; i < nums.length; i += 4) {
        const x1 = isRel ? curX + nums[i] : nums[i]
        const y1 = isRel ? curY + nums[i + 1] : nums[i + 1]
        const x = isRel ? curX + nums[i + 2] : nums[i + 2]
        const y = isRel ? curY + nums[i + 3] : nums[i + 3]
        // Control point enclosure: curve is within triangle of 3 points
        minX = Math.min(minX, x1, x); maxX = Math.max(maxX, x1, x)
        minY = Math.min(minY, y1, y); maxY = Math.max(maxY, y1, y)
        curX = x; curY = y
        prevCtrlX = x1; prevCtrlY = y1
      }
      prevCmdU = 'Q'
    } else if (cmdU === 'S') {
      // Smooth cubic bezier: x2,y2 x,y (4 params, first control point reflected)
      for (let i = 0; i < nums.length; i += 4) {
        // First control point: reflect prevCtrl about cur
        const x1 = (prevCmdU === 'C' || prevCmdU === 'S')
          ? 2 * curX - prevCtrlX
          : curX
        const y1 = (prevCmdU === 'C' || prevCmdU === 'S')
          ? 2 * curY - prevCtrlY
          : curY
        const x2 = isRel ? curX + nums[i] : nums[i]
        const y2 = isRel ? curY + nums[i + 1] : nums[i + 1]
        const x = isRel ? curX + nums[i + 2] : nums[i + 2]
        const y = isRel ? curY + nums[i + 3] : nums[i + 3]
        // Control point enclosure with reflected first control point
        minX = Math.min(minX, x1, x2, x); maxX = Math.max(maxX, x1, x2, x)
        minY = Math.min(minY, y1, y2, y); maxY = Math.max(maxY, y1, y2, y)
        curX = x; curY = y
        prevCtrlX = x2; prevCtrlY = y2
      }
      prevCmdU = 'S'
    } else if (cmdU === 'T') {
      // Smooth quadratic bezier: x,y (2 params, control point reflected)
      const x1 = (prevCmdU === 'Q' || prevCmdU === 'T')
        ? 2 * curX - prevCtrlX
        : curX
      const y1 = (prevCmdU === 'Q' || prevCmdU === 'T')
        ? 2 * curY - prevCtrlY
        : curY
      for (let i = 0; i < nums.length; i += 2) {
        const x = isRel ? curX + nums[i] : nums[i]
        const y = isRel ? curY + nums[i + 1] : nums[i + 1]
        // Control point enclosure with reflected control point
        minX = Math.min(minX, x1, x); maxX = Math.max(maxX, x1, x)
        minY = Math.min(minY, y1, y); maxY = Math.max(maxY, y1, y)
        curX = x; curY = y
        prevCtrlX = curX; prevCtrlY = curY
      }
      prevCmdU = 'T'
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
 * Per D-04 (REF-01): parent transform composed with element's own transform.
 */
export function mapCoordinates(
  element: SvgElement,
  viewBox: [number, number, number, number],
  parentTransform?: string,
): CoordinateMapping {
  const { attrs } = element
  const tag = element.type.toLowerCase()

  // Compose parent transform with element's own transform (per D-04 REF-01)
  const effectiveTransform = composeTransforms(parentTransform, attrs.transform)
  // Parse transform first (per D-04)
  const transform = parseTransform(effectiveTransform)
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
      const cx = extractNumber(attrs.cx, 0) * Math.abs(sx) + tx
      const cy = extractNumber(attrs.cy, 0) * Math.abs(sy) + ty
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
      // NOTE: We do NOT apply groupScale to width/height here because:
      // 1. The path d attribute is not scaled
      // 2. mapCoordinates returns coords which are then scaled by canvasScale in transformElement
      // 3. groupScale should be applied in transformElement when computing viewBox to match path coords
      const d = typeof attrs.d === 'string' ? attrs.d : ''
      const bbox = pathBoundingBox(d)
      if (bbox) {
        left = bbox.left * Math.abs(sx) + tx
        top = bbox.top * Math.abs(sy) + ty
        width = bbox.width  // NO groupScale applied here
        height = bbox.height  // NO groupScale applied here
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
