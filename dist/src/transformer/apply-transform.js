"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyRotateWithCenter = applyRotateWithCenter;
exports.getRotateDeg = getRotateDeg;
exports.getFlipFromScale = getFlipFromScale;
exports.applyTransform = applyTransform;
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
function applyRotateWithCenter(x, y, deg, cx, cy) {
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const px = x - cx;
    const py = y - cy;
    const rx = px * cos - py * sin;
    const ry = px * sin + py * cos;
    return {
        x: rx + cx,
        y: ry + cy,
    };
}
/**
 * Get rotation degrees for PPTElement when no center is specified.
 * Per D-02: Returns the raw rotateDeg value.
 */
function getRotateDeg(transform) {
    return transform.rotateDeg || 0;
}
/**
 * Determine flip values from scale transform.
 * Per D-03/D-04: negative scale values represent flips.
 */
function getFlipFromScale(transform) {
    const result = {};
    if ((transform.scaleX ?? 1) < 0)
        result.flipH = true;
    if ((transform.scaleY ?? 1) < 0)
        result.flipV = true;
    return result;
}
/**
 * Apply transform to an element's coordinates and return rotation/flip values.
 * Per D-01: rotate with center pre-transforms coords, rotate = 0
 * Per D-02: rotate without center sets rotate = rotateDeg
 * Per D-03/D-04: negative scale sets flipH/flipV
 */
function applyTransform(left, top, width, height, transform) {
    let rotate = getRotateDeg(transform);
    let finalLeft = left;
    let finalTop = top;
    let finalWidth = width;
    let finalHeight = height;
    const flip = getFlipFromScale(transform);
    // D-01: rotate with center — pre-transform coordinates
    if (transform.rotateCX !== undefined && transform.rotateCY !== undefined) {
        const rotatedUL = applyRotateWithCenter(left, top, transform.rotateDeg, transform.rotateCX, transform.rotateCY);
        const rotatedLR = applyRotateWithCenter(left + width, top + height, transform.rotateDeg, transform.rotateCX, transform.rotateCY);
        finalLeft = Math.min(rotatedUL.x, rotatedLR.x);
        finalTop = Math.min(rotatedUL.y, rotatedLR.y);
        finalWidth = Math.abs(rotatedLR.x - rotatedUL.x);
        finalHeight = Math.abs(rotatedLR.y - rotatedUL.y);
        rotate = 0; // Rotation applied to coordinates, not PPTElement
    }
    return {
        left: finalLeft,
        top: finalTop,
        width: finalWidth,
        height: finalHeight,
        rotate,
        ...flip,
    };
}
//# sourceMappingURL=apply-transform.js.map