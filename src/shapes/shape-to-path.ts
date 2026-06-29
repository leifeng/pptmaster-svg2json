/**
 * Convert non-path SVG shapes to SVG path d strings.
 * Per D-02: rect, circle, ellipse, polygon, polyline, line → path d strings.
 * Per D-03: path elements keep original d attribute unchanged.
 */

export function rectToPath(x: number, y: number, w: number, h: number): string {
  // path is relative to element origin (0,0), not SVG canvas
  return `M 0,0 L ${w},0 L ${w},${h} L 0,${h} Z`
}

/**
 * Generate rounded rectangle path using arc commands.
 * Per D-21: sweep-flag = 1 (clockwise).
 * When rx=0 or ry=0 → sharp corners (no arc).
 * When rx/ry exceed half of min(width, height) → clamp to min(width, height)/2.
 */
export function roundedRectToPath(w: number, h: number, rx: number, ry: number): string {
  // Degenerate to sharp corners when either radius is 0
  if (rx === 0 || ry === 0) {
    return `L ${w},0 L ${w},${h} L 0,${h} L 0,0 Z`
  }

  // Clamp rx/ry to half of min dimension
  const maxR = Math.min(w, h) / 2
  const r = Math.min(rx, ry, maxR)

  // Path sequence per D-21:
  // M r,0 L w-r,0 A r,r 0 0,1 w,r L w,h-r A r,r 0 0,1 w-r,h L r,h A r,r 0 0,1 0,h-r L 0,r A r,r 0 0,1 r,0 Z
  return `M ${r},0 L ${w - r},0 A ${r},${r} 0 0,1 ${w},${r} L ${w},${h - r} A ${r},${r} 0 0,1 ${w - r},${h} L ${r},${h} A ${r},${r} 0 0,1 0,${h - r} L 0,${r} A ${r},${r} 0 0,1 ${r},0 Z`
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
