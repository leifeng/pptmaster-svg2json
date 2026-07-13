/**
 * Clip-path preprocessor
 *
 * Expands clipPath definitions into referencing elements before transform.
 * ClipPath children coordinates are scaled by the clipPath container's transform
 * so they render at correct positions in the canvas coordinate space.
 */

import { SvgParseResult, SvgElement } from '../types/ast'
import { parseTransform, mapCoordinates } from '../mapper/coordinate-mapper'
import type { TransformResult } from '../types/ast'

/**
 * Find all clipPath definitions in the AST and return a map of id -> clipPath element
 */
function findClipPathDefinitions(root: SvgElement, viewBox: [number, number, number, number]): Map<string, SvgElement> {
  const clipPaths = new Map<string, SvgElement>()

  function walk(element: SvgElement) {
    if (element.type.toLowerCase() === 'clippath') {
      const id = element.attrs.id as string | undefined
      if (id) {
        clipPaths.set(id, element)
      }
    }
    for (const child of element.children) {
      walk(child)
    }
  }

  walk(root)
  return clipPaths
}

/**
 * Transform a single element's coordinates and transform by a transform string.
 * Returns a new element with transformed coordinates and transform attribute.
 */
function transformElementCoordinates(
  element: SvgElement,
  viewBox: [number, number, number, number],
  scaleX: number,
  scaleY: number,
  clipPathTransform: TransformResult,
): SvgElement {
  // Parse the element's own transform
  const elementTransform = parseTransform(element.attrs.transform)

  // Compose: clipPath transform first, then element's own transform
  // (child transform is applied after parent transform)
  const composedTransform = composeTransformResults(clipPathTransform, elementTransform)

  // Build a new transform string from composed results
  const transformParts: string[] = []
  if (composedTransform.translateX !== undefined || composedTransform.translateY !== undefined) {
    const tx = composedTransform.translateX || 0
    const ty = composedTransform.translateY || 0
    transformParts.push(`translate(${tx}, ${ty})`)
  }
  if (composedTransform.scaleX !== undefined || composedTransform.scaleY !== undefined) {
    const sx = composedTransform.scaleX ?? 1
    const sy = composedTransform.scaleY ?? 1
    if (sx !== 1 || sy !== 1) {
      transformParts.push(`scale(${sx}, ${sy})`)
    }
  }
  if (composedTransform.rotateDeg !== undefined) {
    const cx = composedTransform.rotateCX ?? 0
    const cy = composedTransform.rotateCY ?? 0
    if (cx !== 0 || cy !== 0) {
      transformParts.push(`rotate(${composedTransform.rotateDeg}, ${cx}, ${cy})`)
    } else {
      transformParts.push(`rotate(${composedTransform.rotateDeg})`)
    }
  }

  const composedTransformStr = transformParts.length > 0 ? transformParts.join(' ') : undefined

  // Get element's SVG coordinates
  const coords = mapCoordinates(element, viewBox, element.attrs.transform)

  // Apply the composed transform to get canvas coordinates
  // First apply element's own transform to SVG coordinates
  let canvasLeft = coords.left
  let canvasTop = coords.top
  let canvasWidth = coords.width
  let canvasHeight = coords.height

  // Apply element's own transform
  if (elementTransform.translateX !== undefined) canvasLeft += elementTransform.translateX
  if (elementTransform.translateY !== undefined) canvasTop += elementTransform.translateY
  if (elementTransform.scaleX !== undefined) {
    canvasLeft *= elementTransform.scaleX
    canvasWidth *= elementTransform.scaleX
  }
  if (elementTransform.scaleY !== undefined) {
    canvasTop *= elementTransform.scaleY
    canvasHeight *= elementTransform.scaleY
  }

  // Apply clipPath's transform (after element's own transform)
  if (clipPathTransform.translateX !== undefined) canvasLeft += clipPathTransform.translateX
  if (clipPathTransform.translateY !== undefined) canvasTop += clipPathTransform.translateY
  if (clipPathTransform.scaleX !== undefined) {
    canvasLeft *= clipPathTransform.scaleX
    canvasWidth *= clipPathTransform.scaleX
  }
  if (clipPathTransform.scaleY !== undefined) {
    canvasTop *= clipPathTransform.scaleY
    canvasHeight *= clipPathTransform.scaleY
  }

  // Convert canvas coordinates back to SVG space for the element attrs
  // (transformToPPTElement will re-apply transforms via effectiveTransform)
  const svgLeft = canvasLeft / scaleX
  const svgTop = canvasTop / scaleY
  const svgWidth = canvasWidth / Math.abs(scaleX)
  const svgHeight = canvasHeight / Math.abs(scaleY)

  // Create a new element with transformed attrs
  const transformedElement: SvgElement = {
    type: element.type,
    attrs: {
      ...element.attrs,
      x: svgLeft,
      y: svgTop,
      width: svgWidth,
      height: svgHeight,
      transform: composedTransformStr,
    },
    children: element.children.map(child =>
      transformElementCoordinates(child, viewBox, scaleX, scaleY, clipPathTransform)
    ),
    text: element.text,
  }

  return transformedElement
}

/**
 * Compose two TransformResult objects.
 * parentTransform is applied first, then childTransform.
 */
function composeTransformResults(parent: TransformResult, child: TransformResult): TransformResult {
  const result: TransformResult = {}

  // Handle translation: child translation is in parent's coordinate space
  // So combined translation = parent translation + child translation
  result.translateX = (parent.translateX || 0) + (child.translateX || 0)
  result.translateY = (parent.translateY || 0) + (child.translateY || 0)

  // Handle scale: combined scale = parent scale * child scale
  const parentScaleX = parent.scaleX ?? 1
  const parentScaleY = parent.scaleY ?? 1
  const childScaleX = child.scaleX ?? 1
  const childScaleY = child.scaleY ?? 1
  result.scaleX = parentScaleX * childScaleX
  result.scaleY = parentScaleY * childScaleY

  // Handle rotation: rotate around parent's rotation center, then apply child's rotation
  // This is complex; for simplicity, just use child's rotation with recomputed center
  if (child.rotateDeg !== undefined) {
    result.rotateDeg = child.rotateDeg
    // If parent had a rotation center, transform it by parent's scale
    if (parent.rotateCX !== undefined && parent.rotateCY !== undefined) {
      result.rotateCX = parent.rotateCX + child.rotateCX! * parentScaleX
      result.rotateCY = parent.rotateCY + child.rotateCY! * parentScaleY
    } else {
      result.rotateCX = child.rotateCX
      result.rotateCY = child.rotateCY
    }
  } else if (parent.rotateDeg !== undefined) {
    result.rotateDeg = parent.rotateDeg
    result.rotateCX = parent.rotateCX
    result.rotateCY = parent.rotateCY
  }

  return result
}

/**
 * Expand clipPath definitions into elements that reference them.
 * For each element with clip-path="url(#id)", find the clipPath definition,
 * transform its children by the clipPath's transform, and inject them into the element.
 */
function expandClipPaths(root: SvgElement, viewBox: [number, number, number, number], scaleX: number, scaleY: number): void {
  // Find all clipPath definitions
  const clipPaths = findClipPathDefinitions(root, viewBox)

  // Walk the tree and expand clipPaths
  function walk(element: SvgElement): void {
    const clipPathAttr = element.attrs['clip-path'] as string | undefined

    if (clipPathAttr) {
      // Extract clipPath id from url(#id) format
      const match = clipPathAttr.match(/url\(#([^)]+)\)/)
      if (match) {
        const clipPathId = match[1]
        const clipPathDef = clipPaths.get(clipPathId)

        if (clipPathDef) {
          // Parse clipPath's transform
          const clipPathTransform = parseTransform(clipPathDef.attrs.transform as string | undefined)

          // Transform each child of the clipPath and inject into the element
          const expandedChildren = clipPathDef.children.map(child =>
            transformElementCoordinates(child, viewBox, scaleX, scaleY, clipPathTransform)
          )

          // Remove clip-path attribute and add expanded children
          const { 'clip-path': _, ...restAttrs } = element.attrs as Record<string, unknown>
          element.attrs = restAttrs as typeof element.attrs
          element.children = [...expandedChildren, ...element.children]
        }
      }
    }

    // Continue walking children
    for (const child of element.children) {
      walk(child)
    }
  }

  walk(root)
}

/**
 * Preprocess clipPath elements in the AST.
 * Expands clipPath definitions into referencing elements before transform.
 * Modifies AST in-place.
 *
 * @param ast - Parsed SVG result (root + viewBox + width/height)
 */
export function preprocessClipPaths(ast: SvgParseResult): void {
  const { root, viewBox } = ast

  // Calculate scale factors from viewBox to canvas
  const scaleX = 1000 / viewBox[2]
  const scaleY = 562.5 / viewBox[3]

  expandClipPaths(root, viewBox, scaleX, scaleY)
}
