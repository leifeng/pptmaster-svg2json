/**
 * Path merging module for SVG <g> elements containing only <path> children.
 * Implements decision tree: shared style -> no independent semantics -> fill="none"/no overlap -> fill-rule check.
 */

import { v4 as uuidv4 } from 'uuid'
import { SvgElement } from '../types/ast'
import { toAbsolutePath } from '../utils/path-utils'
import { pathBoundingBox } from '../mapper/coordinate-mapper'
import type { PPTShapeElement } from '../slides'
import type { TransformResult } from '../types/ast'
import { parseTransform } from '../mapper/coordinate-mapper'

export type MergeDecision = 'merge' | 'no-merge' | 'cautious-merge'

export type SharedStyle = {
  fill?: string
  stroke?: string
  'stroke-width'?: string
  opacity?: string
  'fill-rule'?: string
}

export type BoundingBox = { left: number; top: number; width: number; height: number }

/**
 * Extract common style attributes shared by all elements.
 * Returns null if no common styles exist.
 */
export function extractCommonStyle(elements: SvgElement[]): SharedStyle | null {
  const styleKeys = ['fill', 'stroke', 'stroke-width', 'opacity', 'fill-rule'] as const
  const first = elements[0]?.attrs
  if (!first) return null

  const common: Partial<SharedStyle> = {}
  for (const key of styleKeys) {
    const value = first[key]
    if (value !== undefined && elements.every(el => el.attrs[key] === value)) {
      common[key] = value as string
    }
  }
  return Object.keys(common).length > 0 ? common as SharedStyle : null
}

/**
 * Check if two bounding boxes overlap (AABB overlap test).
 */
export function boxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.left + a.width <= b.left ||
    b.left + b.width <= a.left ||
    a.top + a.height <= b.top ||
    b.top + b.height <= a.top
  )
}

/**
 * Get effective fill value for a path element, considering group-level inheritance.
 */
function getEffectiveFill(path: SvgElement, groupAttrs: Record<string, string>): string | undefined {
  return path.attrs.fill ?? groupAttrs.fill
}

/**
 * Determine if paths should be merged based on decision tree.
 *
 * Step 1: Check shared style - all paths must share common style attributes
 * Step 2: Check no independent semantics - no id, clip-path, aria-* attributes
 * Step 3: Check fill="none" OR bounding box overlap
 * Step 4: Check evenodd fill-rule
 */
export function shouldMerge(paths: SvgElement[], groupAttrs: Record<string, string>): MergeDecision {
  // Step 1: Check shared style (D-30)
  const commonStyle = extractCommonStyle(paths)
  if (!commonStyle && !paths.every(p => getEffectiveFill(p, groupAttrs) === 'none')) {
    return 'no-merge'
  }

  // Step 2: Check no independent semantics
  for (const path of paths) {
    // If any path has id attribute -> cannot merge (independent semantics)
    if (path.attrs.id !== undefined) return 'no-merge'
    // If any path has clip-path attribute -> cannot merge
    if (path.attrs['clip-path'] !== undefined) return 'no-merge'
    // If any path has aria-* attributes -> cannot merge
    const ariaKeys = Object.keys(path.attrs).filter(k => k.startsWith('aria-'))
    if (ariaKeys.length > 0) return 'no-merge'
  }

  // Step 3: Check fill="none" OR bounding box overlap
  const fillValues = paths.map(p => getEffectiveFill(p, groupAttrs))
  const allNone = fillValues.every(f => f === 'none')

  if (allNone) {
    // All paths have fill="none" -> no visual overlap, safe to merge
    return 'merge'
  }

  // Compute bounding boxes for paths with fill != "none"
  const boxesWithFill: { box: BoundingBox; index: number }[] = []
  for (let i = 0; i < paths.length; i++) {
    const fill = fillValues[i]
    if (fill === 'none') continue
    const d = paths[i].attrs.d
    if (typeof d !== 'string') continue
    const bbox = pathBoundingBox(d)
    if (bbox) {
      boxesWithFill.push({ box: bbox, index: i })
    }
  }

  if (boxesWithFill.length < 2) {
    // Not enough boxes to check overlap
    return 'merge'
  }

  // Check if any bounding boxes overlap
  let hasOverlap = false
  for (let i = 0; i < boxesWithFill.length; i++) {
    for (let j = i + 1; j < boxesWithFill.length; j++) {
      if (boxesOverlap(boxesWithFill[i].box, boxesWithFill[j].box)) {
        hasOverlap = true
        break
      }
    }
    if (hasOverlap) break
  }

  if (!hasOverlap) {
    return 'merge'
  }

  // Step 4: Check evenodd fill-rule (PATH-MERGE-04)
  // evenodd paths get 'cautious-merge' not 'no-merge' per PATH-MERGE-04
  const hasEvenodd = paths.some(p => p.attrs['fill-rule'] === 'evenodd')
  if (hasEvenodd) {
    return 'cautious-merge'
  }

  // Overlapping fills with common style -> cautious merge
  return 'cautious-merge'
}

/**
 * Merge multiple paths into a single path d attribute.
 * Each path's d is converted to absolute coordinates and joined with space.
 */
export function mergePaths(paths: SvgElement[], _commonStyle: SharedStyle, _groupTransform?: string): string {
  const absolutePaths = paths.map(p => {
    const d = typeof p.attrs.d === 'string' ? p.attrs.d : ''
    return toAbsolutePath(d)
  })
  return absolutePaths.join(' ')
}

/**
 * Create a merged PPTShapeElement from multiple paths.
 */
export function createMergedShapeElement(
  paths: SvgElement[],
  commonStyle: SharedStyle,
  groupTransform: string | undefined,
  viewBox: [number, number],
  index: number,
): PPTShapeElement {
  // Merge path d attributes
  const mergedD = mergePaths(paths, commonStyle, groupTransform)

  // Compute bounding box from merged path
  const bbox = pathBoundingBox(mergedD)

  let left = 0
  let top = 0
  let width = viewBox[0]
  let height = viewBox[1]
  if (bbox) {
    left = bbox.left
    top = bbox.top
    width = bbox.width || viewBox[0]
    height = bbox.height || viewBox[1]
  }

  // Parse group transform
  let rotate = 0
  if (groupTransform) {
    const parsed = parseTransform(groupTransform)
    rotate = parsed.rotateDeg ?? 0
  }

  // Build outline from stroke if present
  let outline: PPTShapeElement['outline'] = undefined
  if (commonStyle.stroke !== undefined) {
    outline = {
      color: commonStyle.stroke,
      width: commonStyle['stroke-width'] ? parseFloat(commonStyle['stroke-width']) : 1,
    }
  }

  const id = uuidv4()
  const result: PPTShapeElement = {
    id,
    type: 'shape',
    left,
    top,
    width,
    height,
    rotate,
    viewBox: [width, height],
    path: mergedD,
    fixedRatio: false,
    fill: commonStyle.fill || '#000000',
    opacity: commonStyle.opacity ? parseFloat(commonStyle.opacity) : undefined,
    outline,
  }

  return result
}
