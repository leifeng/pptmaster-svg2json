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
 * Convert a CSS color + opacity to rgba() format.
 */
export declare function colorToRgba(color: string | undefined, opacity: number): string;
/**
 * Transform a single SVG element to PPTElement.
 * @param element - SVG element to transform
 * @param viewBox - SVG viewBox [minX, minY, width, height]
 * @param index - Element index in the output
 * @param targetCanvas - Target canvas size [width, height], defaults to [1000, 562.5]
 * @param groupId - Current groupId context from parent g elements
 */
export declare function transformElement(element: SvgElement, viewBox: [number, number, number, number], index: number, targetCanvas?: [number, number], groupId?: string, effectiveTransform?: string): Promise<PPTElement | PPTElement[] | null>;
export declare function transformToPPTElement(ast: SvgParseResult, targetCanvas?: [number, number]): Promise<PPTElement[]>;
//# sourceMappingURL=transform-to-pptel.d.ts.map