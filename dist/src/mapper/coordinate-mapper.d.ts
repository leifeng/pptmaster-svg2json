import { SvgElement, CoordinateMapping, TransformResult } from '../types/ast';
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
 */
export declare function parseTransform(transform: string | undefined): TransformResult;
/**
 * Map an SVG element's geometry to left/top/width/height.
 * Per D-08: 1:1 mapping from SVG viewBox coordinates.
 * Per D-04: transform attribute applied BEFORE reading direct attributes.
 */
export declare function mapCoordinates(element: SvgElement, viewBox: [number, number, number, number]): CoordinateMapping;
//# sourceMappingURL=coordinate-mapper.d.ts.map