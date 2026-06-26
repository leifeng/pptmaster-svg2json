import { SvgParseResult, SvgElement } from '../types/ast';
import type { PPTElement, LineStyleType } from '../slides';
export type { PPTElement };
/**
 * Parse stroke-dasharray into line style.
 * Per D-05 (CRITICAL PITFALL 5): normalize "5,3" / "5 3" / "5" variants.
 */
export declare function parseDashArray(dash: string | undefined): LineStyleType;
/**
 * Convert a CSS color string to hex format.
 */
export declare function colorToHex(color: string | undefined): string;
/**
 * Transform a single SVG element to PPTElement.
 * @param element - SVG element to transform
 * @param viewBox - SVG viewBox [minX, minY, width, height]
 * @param index - Element index in the output
 * @param targetCanvas - Target canvas size [width, height], defaults to [1000, 562.5]
 */
export declare function transformElement(element: SvgElement, viewBox: [number, number, number, number], index: number, targetCanvas?: [number, number]): PPTElement | null;
/**
 * Transform an entire SVG parse result to PPTElement array.
 * Per D-06: output format { elements: PPTElement[] }
 * Per D-07: text/tspan -> PPTTextElement, image -> PPTImageElement, others -> PPTShapeElement
 * @param ast - Parsed SVG result (root + viewBox + width/height)
 * @param targetCanvas - Target canvas size [width, height], defaults to [1000, 562.5]
 */
export declare function transformToPPTElement(ast: SvgParseResult, targetCanvas?: [number, number]): PPTElement[];
//# sourceMappingURL=transform-to-pptel.d.ts.map