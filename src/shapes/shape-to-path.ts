/**
 * Convert non-path SVG shapes to SVG path d strings.
 * Per D-02: rect, circle, ellipse, polygon, polyline, line → path d strings.
 * Per D-03: path elements keep original d attribute unchanged.
 */

export function rectToPath(x: number, y: number, w: number, h: number): string {
  // path is relative to element origin (0,0), not SVG canvas
  return `M 0,0 L ${w},0 L ${w},${h} L 0,${h} Z`
}

export function circleToPath(cx: number, cy: number, r: number): string {
  // Path relative to element origin (0,0), circle centered at (r, r)
  return `M 0,${r} A ${r},${r} 0 1,0 ${2 * r},${r} A ${r},${r} 0 1,0 0,${r} Z`
}

export function ellipseToPath(cx: number, cy: number, rx: number, ry: number): string {
  // Path relative to element origin (0,0), ellipse centered at (rx, ry)
  return `M 0,${ry} A ${rx},${ry} 0 1,0 ${2 * rx},${ry} A ${rx},${ry} 0 1,0 0,${ry} Z`
}

export function lineToPath(x1: number, y1: number, x2: number, y2: number): string {
  return `M ${x1},${y1} L ${x2},${y2}`
}

export function polygonToPath(points: [number, number][]): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points
  if (rest.length === 0) return `M ${first[0]},${first[1]} Z`
  return `M ${first[0]},${first[1]} ${rest.map((p) => `L ${p[0]},${p[1]}`).join(' ')} Z`
}
