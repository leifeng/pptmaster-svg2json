import { SvgElement, CoordinateMapping, TransformResult } from '../types/ast';
/**
 * Compose two transform strings into a single transform string.
 * Parent transform is applied first, then child transform.
 */
export declare function composeTransforms(parentTransform: string | undefined, childTransform: string | undefined): string | undefined;
/**
 * Parse gradientTransform attribute to extract rotation angle.
 * D-17: gradientTransform matrix rotation extracted via matrix decomposition.
 */
export declare function parseGradientTransform(transform: string | undefined): number;
/**
 * Parse a viewBox string into [minX, minY, width, height].
 * Per D-09: viewBox parsed as [minX, minY, width, height] format.
 * Per D-08: SVG viewBox coordinates 1:1 map to PPTElement left/top/width/height (no scaling).
 */
export declare function parseViewBox(viewBoxStr: string | undefined): [number, number, number, number];
/**
 * Extract a numeric value from a string or number attribute.
 */
export declare function extractNumber(value: string | number | undefined, fallback: number): number;
/**
 * Parse SVG transform attribute into component values.
 * Per D-04: translate/scale/rotate parsed; D-05: matrix marked as special.
 * Handles multiple transform commands (e.g., "translate(60, 220) translate(0, 116)")
 * by accumulating all translate/scale values and using the last rotate.
 */
export declare function parseTransform(transform: string | undefined): TransformResult;
/**
 * Compute bounding box of a path's M/L/H/V/A/C/Q/S/T commands.
 * For arcs, we include the endpoint. For curves (C/Q/S/T), use control point enclosure.
 */
export declare function pathBoundingBox(d: string): {
    left: number;
    top: number;
    width: number;
    height: number;
} | null;
/**
 * Map an SVG element's geometry to left/top/width/height.
 * Per D-08: 1:1 mapping from SVG viewBox coordinates.
 * Per D-04: transform attribute applied BEFORE reading direct attributes.
 * Per D-04 (REF-01): parent transform composed with element's own transform.
 */
export declare function mapCoordinates(element: SvgElement, viewBox: [number, number, number, number], parentTransform?: string): CoordinateMapping;
//# sourceMappingURL=coordinate-mapper.d.ts.map