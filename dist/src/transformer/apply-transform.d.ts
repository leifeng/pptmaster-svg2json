import { TransformResult } from '../types/ast';
/**
 * Apply rotation around a specified center point.
 * Per D-01: translate->rotate->translate-back formula.
 *
 * Formula:
 *   px = x - cx, py = y - cy
 *   rx = px*cos(θ) - py*sin(θ)
 *   ry = px*sin(θ) + py*cos(θ)
 *   final_x = rx + cx, final_y = ry + cy
 */
export declare function applyRotateWithCenter(x: number, y: number, deg: number, cx: number, cy: number): {
    x: number;
    y: number;
};
/**
 * Get rotation degrees for PPTElement when no center is specified.
 * Per D-02: Returns the raw rotateDeg value.
 */
export declare function getRotateDeg(transform: TransformResult): number;
/**
 * Determine flip values from scale transform.
 * Per D-03/D-04: negative scale values represent flips.
 */
export declare function getFlipFromScale(transform: TransformResult): {
    flipH?: boolean;
    flipV?: boolean;
};
/**
 * Apply transform to an element's coordinates and return rotation/flip values.
 * Per D-01: rotate with center pre-transforms coords, rotate = 0
 * Per D-02: rotate without center sets rotate = rotateDeg
 * Per D-03/D-04: negative scale sets flipH/flipV
 */
export declare function applyTransform(left: number, top: number, width: number, height: number, transform: TransformResult): {
    left: number;
    top: number;
    width: number;
    height: number;
    rotate: number;
    flipH?: boolean;
    flipV?: boolean;
};
//# sourceMappingURL=apply-transform.d.ts.map