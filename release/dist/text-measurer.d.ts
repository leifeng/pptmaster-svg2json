/**
 * Text measurement module using @resvg/resvg-js for accurate bounding box computation.
 * Lazy singleton pattern for WASM initialization.
 */
/**
 * Input type for measureTextElement.
 */
export interface TextMeasurementInput {
    content: string;
    fontFamily: string;
    fontSize: number;
    fontWeight?: string;
    fontStyle?: string;
    letterSpacing?: number;
    fill?: string;
    /** SVG text-anchor attribute: 'start' | 'middle' | 'end' */
    textAnchor?: string;
    /** SVG x attribute value */
    x?: number;
}
/**
 * Build a self-contained SVG string for text measurement.
 * Uses fixed 1280x720 viewBox per D-37 to prevent content clipping.
 * XML-escapes content for safety.
 * Handles multi-line text by splitting on newlines and using tspan elements.
 */
export declare function buildMeasurementSvg(opts: {
    content: string;
    fontFamily: string;
    fontSize: number;
    fontWeight?: string;
    fontStyle?: string;
    letterSpacing?: number;
    fill?: string;
    textAnchor?: string;
    x?: number;
}): string;
/**
 * Measure text bounding box by rendering SVG via resvg-js.
 * Uses getBBox() which applies transforms and returns the visible bounding box.
 * @throws if bounding box is undefined or has zero dimensions
 */
export declare function measureTextBBox(svgString: string): Promise<{
    width: number;
    height: number;
    y: number;
}>;
/**
 * High-level API: builds measurement SVG then measures it.
 * Catches errors and re-throws so caller can fall back to heuristic.
 */
export declare function measureTextElement(input: TextMeasurementInput): Promise<{
    width: number;
    height: number;
    y: number;
}>;
/**
 * Render an SVG pattern definition to a PNG data URL.
 * D-36: Converts SVG pattern fills to base64 PNG for pptist pattern fill support.
 * @param patternWidth - Pattern tile width
 * @param patternHeight - Pattern tile height
 * @param patternChildren - Array of SVG child elements to render inside the pattern
 * @returns Base64 PNG data URL
 */
export declare function renderPatternToPng(patternWidth: number, patternHeight: number, patternChildren: Array<{
    type: string;
    attrs: Record<string, any>;
}>): Promise<string>;
/**
 * Render a full SVG string to a PNG data URL.
 * D-36: Used for rendering SVG backgrounds with pattern fills to preserve tiling effect.
 * @param svgString - Complete SVG string to render
 * @param width - Output width in pixels
 * @param height - Output height in pixels
 * @returns Base64 PNG data URL
 */
export declare function renderSvgToPng(svgString: string, width: number, height: number): Promise<string>;
//# sourceMappingURL=text-measurer.d.ts.map