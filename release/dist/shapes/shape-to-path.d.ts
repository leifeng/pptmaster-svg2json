/**
 * Convert non-path SVG shapes to SVG path d strings.
 * Per D-02: rect, circle, ellipse, polygon, polyline, line → path d strings.
 * Per D-03: path elements keep original d attribute unchanged.
 */
export declare function rectToPath(x: number, y: number, w: number, h: number): string;
/**
 * Generate rounded rectangle path using arc commands.
 * Per D-21: sweep-flag = 1 (clockwise).
 * When rx=0 or ry=0 → sharp corners (no arc).
 * When rx/ry exceed half of min(width, height) → clamp to min(width, height)/2.
 */
export declare function roundedRectToPath(w: number, h: number, rx: number, ry: number): string;
export declare function circleToPath(cx: number, cy: number, r: number): string;
export declare function ellipseToPath(cx: number, cy: number, rx: number, ry: number): string;
export declare function lineToPath(x1: number, y1: number, x2: number, y2: number): string;
export declare function polygonToPath(points: [number, number][]): string;
//# sourceMappingURL=shape-to-path.d.ts.map