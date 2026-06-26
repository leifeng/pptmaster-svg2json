import { SvgParseResult, SvgElement } from '../types/ast';
export declare function parseViewBox(viewBoxStr: string | undefined): [number, number, number, number];
export declare function parseSvg(xmlString: string): SvgParseResult;
export declare function flattenElements(element: SvgElement): SvgElement[];
//# sourceMappingURL=svg-parser.d.ts.map