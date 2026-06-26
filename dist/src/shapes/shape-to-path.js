"use strict";
/**
 * Convert non-path SVG shapes to SVG path d strings.
 * Per D-02: rect, circle, ellipse, polygon, polyline, line → path d strings.
 * Per D-03: path elements keep original d attribute unchanged.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rectToPath = rectToPath;
exports.circleToPath = circleToPath;
exports.ellipseToPath = ellipseToPath;
exports.lineToPath = lineToPath;
exports.polygonToPath = polygonToPath;
function rectToPath(x, y, w, h) {
    // path is relative to element origin (0,0), not SVG canvas
    return `M 0,0 L ${w},0 L ${w},${h} L 0,${h} Z`;
}
function circleToPath(cx, cy, r) {
    // Path relative to element origin (0,0), circle centered at (r, r)
    return `M 0,${r} A ${r},${r} 0 1,0 ${2 * r},${r} A ${r},${r} 0 1,0 0,${r} Z`;
}
function ellipseToPath(cx, cy, rx, ry) {
    // Path relative to element origin (0,0), ellipse centered at (rx, ry)
    return `M 0,${ry} A ${rx},${ry} 0 1,0 ${2 * rx},${ry} A ${rx},${ry} 0 1,0 0,${ry} Z`;
}
function lineToPath(x1, y1, x2, y2) {
    return `M ${x1},${y1} L ${x2},${y2}`;
}
function polygonToPath(points) {
    if (points.length === 0)
        return '';
    const [first, ...rest] = points;
    if (rest.length === 0)
        return `M ${first[0]},${first[1]} Z`;
    return `M ${first[0]},${first[1]} ${rest.map((p) => `L ${p[0]},${p[1]}`).join(' ')} Z`;
}
//# sourceMappingURL=shape-to-path.js.map