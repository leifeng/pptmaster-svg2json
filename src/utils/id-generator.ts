/**
 * ID generation utilities for PPTElement.id and PPTAnimation.id.
 *
 * Implements Phase 14 / Plan 14-01 D-05~09 (id priority chain) and D-20
 * (animation id uses uuidv4().substring(0, 10) to match PPTist editor panel length).
 *
 * Implementation: this module imports `{ v4 as uuidv4 }` from the `uuid` v14
 * package and takes a `substring(0, N)` slice to honor the 5/10-char PPTist
 * panel diff-friendly id lengths (D-05~07 + D-20).
 */

import { v4 as uuidv4 } from 'uuid'

/**
 * D-05~07: PPTElement.id priority chain.
 *
 * 1. If `childSvgId` is defined → preserve the original SVG id verbatim (D-05).
 * 2. Else if `groupId` is defined → `<groupId>__<uuidv4().substring(0, 5)>` (D-06).
 *    The 5-char suffix matches the example reference style (`card-temperature__a3kP9`).
 * 3. Else (no group, no svg id) → `uuidv4().substring(0, 10)` (D-07). PPTist uses
 *    10-char ids by default for its own elements, so the panel diff stays friendly.
 *
 * @param groupId - Effective group id from parent `<g id="...">` (undefined if none).
 * @param childSvgId - The SVG element's own `id` attribute (undefined if absent).
 */
export function pptelIdWithFallback(
  groupId: string | undefined,
  childSvgId: string | undefined,
): string {
  if (childSvgId !== undefined) return childSvgId
  if (groupId !== undefined) return `${groupId}__${uuidv4().substring(0, 5)}`
  return uuidv4().substring(0, 10)
}

/**
 * D-07: Ungrouped fallback — pure `uuidv4().substring(0, 10)` for elements outside any `<g>`.
 * Convenience export so call sites that already know they're ungrouped don't
 * need to pass `undefined` explicitly.
 */
export function pptelIdUngrouped(): string {
  return uuidv4().substring(0, 10)
}

/**
 * D-20: PPTAnimation.id uses `uuidv4().substring(0, 10)` to match PPTist editor
 * panel length, so animations authored here are visually indistinguishable from
 * animations authored inside PPTist itself when both are diffed.
 */
export function pptAnimationId(): string {
  return uuidv4().substring(0, 10)
}