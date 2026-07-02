export interface GradientColorDef {
    pos: number;
    color: string;
}
export interface GradientDef {
    type: 'linear' | 'radial';
    x1?: string;
    y1?: string;
    x2?: string;
    y2?: string;
    cx?: string;
    cy?: string;
    r?: string;
    fx?: string;
    fy?: string;
    spreadMethod?: string;
    gradientUnits?: string;
    gradientTransform?: string;
    colors: GradientColorDef[];
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
    x1?: string;
    y1?: string;
    x2?: string;
    y2?: string;
    fx?: string;
    fy?: string;
    spreadMethod?: string;
    gradientUnits?: string;
    gradientTransform?: string;
    'stop-color'?: string;
    'stop-opacity'?: string;
    offset?: string;
    gradient?: any;
    shadow?: any;
}
export interface SvgElement {
    type: string;
    attrs: SvgAttrs;
    children: SvgElement[];
    text?: string;
}
export interface SvgParseResult {
    root: SvgElement;
    viewBox: [number, number, number, number];
    width: number;
    height: number;
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
//# sourceMappingURL=ast.d.ts.map