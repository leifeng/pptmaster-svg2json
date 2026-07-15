export interface GradientColorDef {
  pos: number
  color: string
}

export interface GradientDef {
  type: 'linear' | 'radial'
  // linear attrs
  x1?: string
  y1?: string
  x2?: string
  y2?: string
  // radial attrs
  cx?: string
  cy?: string
  r?: string
  fx?: string
  fy?: string
  // common
  spreadMethod?: string
  gradientUnits?: string
  gradientTransform?: string
  colors: GradientColorDef[]
}

export interface PatternChild {
  type: string
  attrs: Record<string, any>
}

export interface PatternDef {
  id: string
  width: number
  height: number
  patternUnits?: string
  patternContentUnits?: string
  patternTransform?: string
  children: PatternChild[]
}

export interface SvgAttrs {
  [key: string]: string | number | undefined;
  fill?: string;
  stroke?: string;
  'stroke-width'?: string;
  opacity?: string;
  transform?: string;
  x?: string | number;
  y?: string | number;
  width?: string | number;
  height?: string | number;
  r?: string | number;
  rx?: string | number;
  ry?: string | number;
  cx?: string | number;
  cy?: string | number;
  viewBox?: string;
  'font-family'?: string;
  'font-size'?: string;
  'font-weight'?: string;
  'text-anchor'?: string;
  'letter-spacing'?: string;
  'font-style'?: string;
  href?: string;
  'xlink:href'?: string;
  preserveAspectRatio?: string;
  id?: string;
  'stroke-dasharray'?: string;
  // linearGradient attributes
  x1?: string;
  y1?: string;
  x2?: string;
  y2?: string;
  // radialGradient attributes
  fx?: string;
  fy?: string;
  // common gradient attributes
  spreadMethod?: string;
  gradientUnits?: string;
  gradientTransform?: string;
  // stop element attributes
  'stop-color'?: string;
  'stop-opacity'?: string;
  offset?: string;
  // resolved gradient object (per D-15: fill="url(#id)" resolved at parse time)
  // Using 'any' to avoid conflict with string index signature
  gradient?: any;
  // resolved shadow object (per D-22: filter="url(#id)" with feDropShadow resolved at parse time)
  shadow?: any;
}

export interface SvgElement {
  type: string;
  attrs: SvgAttrs;
  children: SvgElement[];
  text?: string;
}

// Flat parse result — no AST wrapper
export interface SvgParseResult {
  root: SvgElement;
  viewBox: [number, number, number, number]; // [minX, minY, width, height]
  width: number;
  height: number;
  patternRegistry?: Map<string, PatternDef>;
}

export interface CoordinateMapping {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TransformResult {
  translateX?: number;
  translateY?: number;
  scaleX?: number;
  scaleY?: number;
  rotateDeg?: number;
  rotateCX?: number;
  rotateCY?: number;
  raw?: string;
  special?: boolean;
}
