/**
 * Convert non-path SVG shapes to SVG path d strings.
 * Per D-02: rect, circle, ellipse, polygon, polyline, line → path d strings.
 * Per D-03: path elements keep original d attribute unchanged.
 */
export declare function rectToPath(x: number, y: number, w: number, h: number): string;
export declare function circleToPath(cx: number, cy: number, r: number): string;
export declare function ellipseToPath(cx: number, cy: number, rx: number, ry: number): string;
export declare function lineToPath(x1: number, y1: number, x2: number, y2: number): string;
export declare function polygonToPath(points: [number, number][]): string;
//# sourceMappingURL=shape-to-path.d.ts.map