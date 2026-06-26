export interface ConvertOptions {
    targetCanvas?: [number, number];
}
export interface ConvertResult {
    success: boolean;
    output?: string;
    error?: string;
    elementCount?: number;
}
export declare function convert(svgContent: string, options?: ConvertOptions): Promise<ConvertResult>;
export { parseSvg } from './parser/svg-parser';
export { transformToPPTElement } from './transformer/transform-to-pptel';
export type { PPTElement } from './slides';
//# sourceMappingURL=index.d.ts.map