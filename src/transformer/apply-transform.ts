import { TransformResult } from '../types/ast'

/**
 * Apply rotation around a specified center point.
 * Per D-01: translate->rotate->translate-back formula.
 *
 * Formula:
 *   px = x - cx, py = y - cy
 *   rx = px*cos(θ) - py*sin(θ)
 *   ry = px*sin(θ) + py*cos(θ)
 *   final_x = rx + cx, final_y = ry + cy
 */
export function applyRotateWithCenter(
  x: number,
  y: number,
  deg: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const px = x - cx
  const py = y - cy
  const rx = px * cos - py * sin
  const ry = px * sin + py * cos
  return {
    x: rx + cx,
    y: ry + cy,
  }
}

/**
 * Get rotation degrees for PPTElement when no center is specified.
 * Per D-02: Returns the raw rotateDeg value.
 */
export function getRotateDeg(transform: TransformResult): number {
  return transform.rotateDeg || 0
}

/**
 * Determine flip values from scale transform.
 * Per D-03/D-04: negative scale values represent flips.
 */
export function getFlipFromScale(transform: TransformResult): { flipH?: boolean; flipV?: boolean } {
  const result: { flipH?: boolean; flipV?: boolean } = {}
  if (transform.scaleX < 0) result.flipH = true
  if (transform.scaleY < 0) result.flipV = true
  return result
}

/**
 * Apply transform to an element's coordinates and return rotation/flip values.
 * Per D-01: rotate with center pre-transforms coords, rotate = 0
 * Per D-02: rotate without center sets rotate = rotateDeg
 * Per D-03/D-04: negative scale sets flipH/flipV
 */
export function applyTransform(
  left: number,
  top: number,
  width: number,
  height: number,
  transform: TransformResult,
): {
  left: number
  top: number
  width: number
  height: number
  rotate: number
  flipH?: boolean
  flipV?: boolean
} {
  let rotate = getRotateDeg(transform)
  let finalLeft = left
  let finalTop = top
  let finalWidth = width
  let finalHeight = height
  const flip = getFlipFromScale(transform)

  // D-01: rotate with center — pre-transform coordinates
  if (transform.rotateCX !== undefined && transform.rotateCY !== undefined) {
    const rotatedUL = applyRotateWithCenter(left, top, transform.rotateDeg!, transform.rotateCX, transform.rotateCY)
    const rotatedLR = applyRotateWithCenter(
      left + width,
      top + height,
      transform.rotateDeg!,
      transform.rotateCX,
      transform.rotateCY,
    )
    finalLeft = Math.min(rotatedUL.x, rotatedLR.x)
    finalTop = Math.min(rotatedUL.y, rotatedLR.y)
    finalWidth = Math.abs(rotatedLR.x - rotatedUL.x)
    finalHeight = Math.abs(rotatedLR.y - rotatedUL.y)
    rotate = 0 // Rotation applied to coordinates, not PPTElement
  }

  return {
    left: finalLeft,
    top: finalTop,
    width: finalWidth,
    height: finalHeight,
    rotate,
    ...flip,
  }
}