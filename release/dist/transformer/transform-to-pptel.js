"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDashArray = parseDashArray;
exports.colorToHex = colorToHex;
exports.colorToRgba = colorToRgba;
exports.transformElement = transformElement;
exports.transformToPPTElement = transformToPPTElement;
const crypto_1 = require("crypto");
const coordinate_mapper_1 = require("../mapper/coordinate-mapper");
const apply_transform_1 = require("./apply-transform");
const shape_to_path_1 = require("../shapes/shape-to-path");
const text_measurer_1 = require("../text-measurer");
/**
 * Parse stroke-dasharray into line style.
 * Per D-05 (CRITICAL PITFALL 5): normalize "5,3" / "5 3" / "5" variants.
 */
function parseDashArray(dash) {
    if (!dash || dash.trim() === '')
        return 'solid';
    const normalized = dash.replace(/,/g, ' ').trim();
    const parts = normalized.split(/\s+/).filter((p) => p.length > 0);
    if (parts.length === 0)
        return 'solid';
    const first = parseFloat(parts[0]);
    if (isNaN(first) || first === 0)
        return 'solid';
    // "2,2" or "2 2" -> dotted, "5,5" or "5 5" -> dashed
    if (parts.length === 2) {
        const second = parseFloat(parts[1]);
        if (second === 2)
            return 'dotted';
        if (second === 5)
            return 'dashed';
    }
    if (parts.length === 1) {
        if (first === 2)
            return 'dotted';
        if (first === 5)
            return 'dashed';
    }
    return 'dashed';
}
/**
 * Named CSS colors map to hex values.
 */
const namedColors = {
    black: '#000000',
    silver: '#c0c0c0',
    gray: '#808080',
    grey: '#808080',
    white: '#ffffff',
    maroon: '#800000',
    red: '#ff0000',
    purple: '#800080',
    fuchsia: '#ff00ff',
    green: '#00ff00',
    lime: '#00ff00',
    olive: '#808000',
    yellow: '#ffff00',
    navy: '#000080',
    blue: '#0000ff',
    teal: '#008080',
    aqua: '#00ffff',
    orange: '#ffa500',
    aliceblue: '#f0f8ff',
    antiquewhite: '#faebd7',
    aquamarine: '#7fffd4',
    azure: '#f0ffff',
    beige: '#f5f5dc',
    bisque: '#ffe4c4',
    blanchedalmond: '#ffebcd',
    coral: '#ff7f50',
    cornflowerblue: '#6495ed',
    cornsilk: '#fff8dc',
    crimson: '#dc143c',
    cyan: '#00ffff',
    darkblue: '#00008b',
    darkcyan: '#008b8b',
    darkgoldenrod: '#b8860b',
    darkgray: '#a9a9a9',
    darkgreen: '#006400',
    darkkhaki: '#bdb76b',
    darkmagenta: '#8b008b',
    darkolivegreen: '#556b2f',
    darkorange: '#ff8c00',
    darkorchid: '#9932cc',
    darkred: '#8b0000',
    darksalmon: '#e9967a',
    darkseagreen: '#8fbc8f',
    darkslateblue: '#483d8b',
    darkslategray: '#2f4f4f',
    darkturquoise: '#00ced1',
    darkviolet: '#9400d3',
    deeppink: '#ff1493',
    deepskyblue: '#00bfff',
    dimgray: '#696969',
    dodgerblue: '#1e90ff',
    firebrick: '#b22222',
    floralwhite: '#fffaf0',
    forestgreen: '#228b22',
    gainsboro: '#dcdcdc',
    ghostwhite: '#f8f8ff',
    gold: '#ffd700',
    goldenrod: '#daa520',
    greenyellow: '#adff2f',
    honeydew: '#f0fff0',
    hotpink: '#ff69b4',
    indianred: '#cd5c5c',
    indigo: '#4b0082',
    ivory: '#fffff0',
    khaki: '#f0e68c',
    lavender: '#e6e6fa',
    lavenderblush: '#fff0f5',
    lemonchiffon: '#fffacd',
    lightblue: '#add8e6',
    lightcoral: '#f08080',
    lightcyan: '#e0ffff',
    lightgoldenrodyellow: '#fafad2',
    lightgray: '#d3d3d3',
    lightgreen: '#90ee90',
    lightpink: '#ffb6c1',
    lightsalmon: '#ffa07a',
    lightseagreen: '#20b2aa',
    lightskyblue: '#87cefa',
    lightslategray: '#778899',
    lightsteelblue: '#b0c4de',
    lightyellow: '#ffffe0',
    limegreen: '#32cd32',
    linen: '#faf0e6',
    magenta: '#ff00ff',
    mediumaquamarine: '#66cdaa',
    mediumblue: '#0000cd',
    mediumorchid: '#ba55d3',
    mediumpurple: '#9370db',
    mediumseagreen: '#3cb371',
    mediumslateblue: '#7b68ee',
    mediumspringgreen: '#00fa9a',
    mediumturquoise: '#48d1cc',
    mediumvioletred: '#c71585',
    midnightblue: '#191970',
    mintcream: '#f5fffa',
    mistyrose: '#ffe4e1',
    moccasin: '#ffe4b5',
    navajowhite: '#ffdead',
    oldlace: '#fdf5e6',
    olivedrab: '#6b8e23',
    orangered: '#ff4500',
    orchid: '#da70d6',
    palegoldenrod: '#eee8aa',
    palegreen: '#98fb98',
    paleturquoise: '#afeeee',
    palevioletred: '#db7093',
    papayawhip: '#ffefd5',
    peachpuff: '#ffdab9',
    peru: '#cd853f',
    pink: '#ffc0cb',
    plum: '#dda0dd',
    powderblue: '#b0e0e6',
    rosybrown: '#bc8f8f',
    royalblue: '#4169e1',
    saddlebrown: '#8b4513',
    salmon: '#fa8072',
    sandybrown: '#f4a460',
    seagreen: '#2e8b57',
    seashell: '#fff5ee',
    sienna: '#a0522d',
    skyblue: '#87ceeb',
    slateblue: '#6a5acd',
    slategray: '#708090',
    snow: '#fffafa',
    springgreen: '#00ff7f',
    steelblue: '#4682b4',
    tan: '#d2b48c',
    thistle: '#d8bfd8',
    tomato: '#ff6347',
    turquoise: '#40e0d0',
    violet: '#ee82ee',
    wheat: '#f5deb3',
    whitesmoke: '#f5f5f5',
    yellowgreen: '#9acd32',
};
/**
 * Decode common HTML entities in a string.
 */
function decodeHtmlEntities(str) {
    return str
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&apos;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
}
/**
 * Convert a CSS color string to hex format.
 */
function colorToHex(color) {
    if (!color)
        return '#000000';
    // Already hex
    if (color.startsWith('#'))
        return color;
    // Named color lookup
    if (namedColors[color.toLowerCase()])
        return namedColors[color.toLowerCase()];
    // rgb(r, g, b)
    const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
        const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
        const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }
    return '#000000';
}
/**
 * Convert a CSS color + opacity to rgba() format.
 */
function colorToRgba(color, opacity) {
    if (!color)
        return `rgba(0, 0, 0, ${opacity})`;
    // Already hex
    if (color.startsWith('#')) {
        const hex = colorToHex(color);
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    // Named color lookup
    if (namedColors[color.toLowerCase()]) {
        const hex = namedColors[color.toLowerCase()];
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    // rgb(r, g, b)
    const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (rgbMatch) {
        return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})`;
    }
    return `rgba(0, 0, 0, ${opacity})`;
}
/**
 * Parse stroke color and opacity.
 * Returns { color, opacity } where color is a valid hex/named color (never transparent),
 * and opacity is 0-1 range. When stroke is "transparent" or rgba with alpha=0,
 * use a fallback color with opacity=0.
 */
function parseStrokeColor(stroke, strokeOpacity) {
    if (!stroke || stroke === 'none' || stroke === 'transparent') {
        return { color: '#000000', opacity: 0 };
    }
    // Normalize strokeOpacity to string for regex matching
    const strokeOpacityStr = strokeOpacity !== undefined ? String(strokeOpacity) : undefined;
    // Check for rgba() format
    const rgbaMatch = stroke.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,?\s*([\d.]+)\s*\)/);
    if (rgbaMatch) {
        const r = rgbaMatch[1];
        const g = rgbaMatch[2];
        const b = rgbaMatch[3];
        const alpha = parseFloat(rgbaMatch[4]);
        // Combine stroke-opacity with alpha from rgba
        const combinedOpacity = strokeOpacityStr !== undefined
            ? parseFloat(strokeOpacityStr) * alpha
            : alpha;
        return {
            color: `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`,
            opacity: combinedOpacity,
        };
    }
    // For hex/named colors, use stroke-opacity if present
    const opacity = strokeOpacityStr !== undefined ? parseFloat(strokeOpacityStr) : undefined;
    return { color: colorToHex(stroke), ...(opacity !== undefined && { opacity }) };
}
/**
 * Parse points string into array of [x, y] tuples.
 */
function parsePointsString(pointsStr) {
    if (!pointsStr)
        return [];
    const parts = pointsStr.trim().split(/[\s,]+/).map(Number);
    const result = [];
    for (let i = 0; i < parts.length; i += 2) {
        if (!isNaN(parts[i]) && !isNaN(parts[i + 1])) {
            result.push([parts[i], parts[i + 1]]);
        }
    }
    return result;
}
/**
 * Convert polyline points to SVG path string (open path, no Z suffix).
 */
function polylineToPath(points) {
    if (points.length === 0)
        return '';
    const [first, ...rest] = points;
    if (rest.length === 0)
        return `M ${first[0]},${first[1]}`;
    return `M ${first[0]},${first[1]} ${rest.map((p) => `L ${p[0]},${p[1]}`).join(' ')}`;
}
/**
 * Extract text content from a text or tspan element.
 */
function extractTextContentFromElement(element) {
    let content = element.text || '';
    // Process tspan children
    for (const child of element.children) {
        if (child.type === 'tspan') {
            content += extractTextContentFromElement(child);
        }
    }
    return content;
}
/**
 * Transform a single SVG element to PPTElement.
 * @param element - SVG element to transform
 * @param viewBox - SVG viewBox [minX, minY, width, height]
 * @param index - Element index in the output
 * @param targetCanvas - Target canvas size [width, height], defaults to [1000, 562.5]
 * @param groupId - Current groupId context from parent g elements
 */
async function transformElement(element, viewBox, index, targetCanvas = [1000, 562.5], groupId, patternRegistry) {
    const tag = element.type.toLowerCase();
    const coords = (0, coordinate_mapper_1.mapCoordinates)(element, viewBox);
    const id = (0, crypto_1.randomUUID)();
    // Calculate scale ratio from SVG viewBox to target canvas
    const scaleX = targetCanvas[0] / viewBox[2];
    const scaleY = targetCanvas[1] / viewBox[3];
    // Apply scaling to coordinates
    const left = coords.left * scaleX;
    const top = coords.top * scaleY;
    const width = coords.width * scaleX;
    const height = coords.height * scaleY;
    // Parse transform attribute for rotate/flip handling
    const transform = (0, coordinate_mapper_1.parseTransform)(element.attrs.transform);
    // Skip non-renderable elements
    if (['defs', 'linearGradient', 'stop', 'filter', 'marker', 'clippath'].includes(tag)) {
        return null;
    }
    switch (tag) {
        case 'rect': {
            const transformed = (0, apply_transform_1.applyTransform)(left, top, width, height, transform);
            const { rotate, flipH, flipV } = transformed;
            const rx = Number(element.attrs.rx) || 0;
            // ry: use explicit value if provided (including 0 for sharp corners), otherwise fall back to rx
            const ry = element.attrs.ry !== undefined ? Number(element.attrs.ry) || 0 : rx;
            const rectWidth = Number(element.attrs.width) || 0;
            const rectHeight = Number(element.attrs.height) || 0;
            // D-21: Use roundedRectToPath when rx or ry > 0, otherwise rectToPath
            // D-25: rectWidth/Height and rx/ry must be scaled by scaleX/scaleY
            const effectiveRy = element.attrs.ry !== undefined ? ry : rx;
            const path = (rx > 0 || effectiveRy > 0)
                ? (0, shape_to_path_1.roundedRectToPath)(width, height, rx * scaleX, effectiveRy * scaleY)
                : (0, shape_to_path_1.rectToPath)(0, 0, width, height);
            const strokeWidth = parseFloat(String(element.attrs['stroke-width'] || '0'));
            const result = {
                id,
                type: 'shape',
                left: transformed.left,
                top: transformed.top,
                width: transformed.width,
                height: transformed.height,
                rotate,
                viewBox: [transformed.width, transformed.height],
                path,
                fixedRatio: false,
                fill: colorToHex(element.attrs.fill) || '#000000',
                opacity: element.attrs.opacity ? parseFloat(element.attrs.opacity) : undefined,
            };
            // D-15: attrs.gradient resolved at parse time — output as PPTShapeElement.gradient
            if (element.attrs.gradient) {
                result.gradient = element.attrs.gradient;
                // @ts-expect-error - fill may not exist on result
                delete result.fill;
            }
            else if (element.attrs.pattern && patternRegistry) {
                // D-36: attrs.pattern contains patternId — render to PNG and output as image fill
                const patternDef = patternRegistry.get(element.attrs.pattern);
                if (patternDef) {
                    try {
                        const patternPng = await (0, text_measurer_1.renderPatternToPng)(patternDef.width, patternDef.height, patternDef.children);
                        result.fill = patternPng;
                    }
                    catch (e) {
                        // Fallback to black if pattern rendering fails
                        console.warn(`[pattern] Failed to render pattern "${element.attrs.pattern}":`, e);
                        result.fill = colorToHex(element.attrs.fill) || '#000000';
                    }
                }
                else {
                    result.fill = colorToHex(element.attrs.fill) || '#000000';
                }
            }
            else {
                // D-18: fill-opacity < 1 → rgba() color
                const fillOpacity = element.attrs['fill-opacity'];
                if (fillOpacity && parseFloat(String(fillOpacity)) < 1) {
                    result.fill = colorToRgba(String(element.attrs.fill), parseFloat(String(fillOpacity)));
                }
            }
            if (flipH)
                result.flipH = true;
            if (flipV)
                result.flipV = true;
            if (element.attrs.stroke) {
                const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity']);
                result.outline = {
                    style: parseDashArray(element.attrs['stroke-dasharray']),
                    width: strokeWidth || 1,
                    color,
                    ...(opacity !== undefined && { opacity }),
                };
            }
            // D-22: SVG filter="url(#shadowId)" → shadow (resolved at parse time)
            if (element.attrs.shadow) {
                result.shadow = element.attrs.shadow;
            }
            // D-23: groupId propagation from parent g element
            if (groupId) {
                result.groupId = groupId;
            }
            return result;
        }
        case 'circle': {
            const transformed = (0, apply_transform_1.applyTransform)(left, top, width, height, transform);
            const { rotate, flipH, flipV } = transformed;
            const strokeWidth = parseFloat(String(element.attrs['stroke-width'] || '0'));
            // FIX: Use scaled dimensions for path to match transformed.width/height
            // circleToPath creates circle centered at (r, r) with radius r, path bounds = [0, 0, 2*r, 2*r]
            const scaledR = transformed.width / 2; // = r * scaleX
            const path = (0, shape_to_path_1.circleToPath)(scaledR, scaledR, scaledR);
            const result = {
                id,
                type: 'shape',
                left: transformed.left,
                top: transformed.top,
                width: transformed.width,
                height: transformed.height,
                rotate,
                viewBox: [transformed.width, transformed.height],
                path,
                fixedRatio: false,
                fill: 'none', // Default to none, override below if fill exists
                opacity: element.attrs.opacity ? parseFloat(element.attrs.opacity) : undefined,
            };
            // D-15: attrs.gradient resolved at parse time — output as PPTShapeElement.gradient
            if (element.attrs.gradient) {
                result.gradient = element.attrs.gradient;
            }
            else if (element.attrs.fill && element.attrs.fill !== 'none') {
                // FIX: fill="none" means no fill, keep fill as 'none'
                const fillOpacity = element.attrs['fill-opacity'];
                if (fillOpacity && parseFloat(String(fillOpacity)) < 1) {
                    result.fill = colorToRgba(String(element.attrs.fill), parseFloat(String(fillOpacity)));
                }
                else {
                    result.fill = colorToHex(element.attrs.fill);
                }
            }
            if (flipH)
                result.flipH = true;
            if (flipV)
                result.flipV = true;
            if (element.attrs.stroke) {
                const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity']);
                result.outline = {
                    style: parseDashArray(element.attrs['stroke-dasharray']),
                    width: strokeWidth || 1,
                    color,
                    ...(opacity !== undefined && { opacity }),
                };
            }
            // D-22: SVG filter="url(#shadowId)" → shadow
            if (element.attrs.shadow) {
                result.shadow = element.attrs.shadow;
            }
            // D-23: groupId propagation from parent g element
            if (groupId) {
                result.groupId = groupId;
            }
            return result;
        }
        case 'ellipse': {
            const transformed = (0, apply_transform_1.applyTransform)(left, top, width, height, transform);
            const { rotate, flipH, flipV } = transformed;
            // D-26/D-27: Scale cx/cy and rx/ry by scaleX/scaleY
            const scaledCx = (Number(element.attrs.cx) || 0) * scaleX;
            const scaledCy = (Number(element.attrs.cy) || 0) * scaleY;
            const scaledRx = Math.abs(Number(element.attrs.rx) || 0) * Math.abs(scaleX);
            const scaledRy = Math.abs(Number(element.attrs.ry) || 0) * Math.abs(scaleY);
            // D-26: Apply rotation to cx/cy if rotate center is defined
            let finalCx = scaledCx;
            let finalCy = scaledCy;
            if (transform.rotateCX !== undefined && transform.rotateCY !== undefined) {
                const rotated = (0, apply_transform_1.applyRotateWithCenter)(scaledCx, scaledCy, transform.rotateDeg, transform.rotateCX * scaleX, transform.rotateCY * scaleY);
                finalCx = rotated.x;
                finalCy = rotated.y;
            }
            const path = (0, shape_to_path_1.ellipseToPath)(finalCx, finalCy, scaledRx, scaledRy);
            const strokeWidth = parseFloat(String(element.attrs['stroke-width'] || '0'));
            const result = {
                id,
                type: 'shape',
                left: transformed.left,
                top: transformed.top,
                width: transformed.width,
                height: transformed.height,
                rotate,
                viewBox: [transformed.width, transformed.height],
                path,
                fixedRatio: false,
                fill: colorToHex(element.attrs.fill) || '#000000',
                opacity: element.attrs.opacity ? parseFloat(element.attrs.opacity) : undefined,
            };
            // D-15: attrs.gradient resolved at parse time — output as PPTShapeElement.gradient
            if (element.attrs.gradient) {
                result.gradient = element.attrs.gradient;
                // @ts-expect-error - fill may not exist on result
                delete result.fill;
            }
            else if (element.attrs.pattern && patternRegistry) {
                // D-36: attrs.pattern contains patternId — render to PNG and output as image fill
                const patternDef = patternRegistry.get(element.attrs.pattern);
                if (patternDef) {
                    try {
                        const patternPng = await (0, text_measurer_1.renderPatternToPng)(patternDef.width, patternDef.height, patternDef.children);
                        result.fill = patternPng;
                    }
                    catch (e) {
                        // Fallback to black if pattern rendering fails
                        console.warn(`[pattern] Failed to render pattern "${element.attrs.pattern}":`, e);
                        result.fill = colorToHex(element.attrs.fill) || '#000000';
                    }
                }
                else {
                    result.fill = colorToHex(element.attrs.fill) || '#000000';
                }
            }
            else {
                // D-18: fill-opacity < 1 → rgba() color
                const fillOpacity = element.attrs['fill-opacity'];
                if (fillOpacity && parseFloat(String(fillOpacity)) < 1) {
                    result.fill = colorToRgba(String(element.attrs.fill), parseFloat(String(fillOpacity)));
                }
            }
            if (flipH)
                result.flipH = true;
            if (flipV)
                result.flipV = true;
            if (element.attrs.stroke) {
                const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity']);
                result.outline = {
                    style: parseDashArray(element.attrs['stroke-dasharray']),
                    width: strokeWidth || 1,
                    color,
                    ...(opacity !== undefined && { opacity }),
                };
            }
            // D-22: SVG filter="url(#shadowId)" → shadow
            if (element.attrs.shadow) {
                result.shadow = element.attrs.shadow;
            }
            // D-23: groupId propagation from parent g element
            if (groupId) {
                result.groupId = groupId;
            }
            return result;
        }
        case 'path': {
            const transformed = (0, apply_transform_1.applyTransform)(left, top, width, height, transform);
            const { rotate, flipH, flipV } = transformed;
            // Per D-03: path elements keep original d attribute unchanged
            const d = typeof element.attrs.d === 'string' ? element.attrs.d : '';
            const strokeWidth = parseFloat(String(element.attrs['stroke-width'] || '0'));
            const result = {
                id,
                type: 'shape',
                left: transformed.left,
                top: transformed.top,
                width: transformed.width,
                height: transformed.height,
                rotate,
                viewBox: [transformed.width, transformed.height],
                path: d,
                fixedRatio: false,
                fill: colorToHex(element.attrs.fill) || '#000000',
                opacity: element.attrs.opacity ? parseFloat(element.attrs.opacity) : undefined,
            };
            // D-15: attrs.gradient resolved at parse time — output as PPTShapeElement.gradient
            if (element.attrs.gradient) {
                result.gradient = element.attrs.gradient;
                // @ts-expect-error - fill may not exist on result
                delete result.fill;
            }
            else {
                // D-18: fill-opacity < 1 → rgba() color
                const fillOpacity = element.attrs['fill-opacity'];
                if (fillOpacity && parseFloat(String(fillOpacity)) < 1) {
                    result.fill = colorToRgba(String(element.attrs.fill), parseFloat(String(fillOpacity)));
                }
            }
            if (flipH)
                result.flipH = true;
            if (flipV)
                result.flipV = true;
            if (element.attrs.stroke) {
                const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity']);
                result.outline = {
                    style: parseDashArray(element.attrs['stroke-dasharray']),
                    width: strokeWidth || 1,
                    color,
                    ...(opacity !== undefined && { opacity }),
                };
            }
            // D-22: SVG filter="url(#shadowId)" → shadow
            if (element.attrs.shadow) {
                result.shadow = element.attrs.shadow;
            }
            // D-23: groupId propagation from parent g element
            if (groupId) {
                result.groupId = groupId;
            }
            return result;
        }
        case 'polygon': {
            const transformed = (0, apply_transform_1.applyTransform)(left, top, width, height, transform);
            const { rotate, flipH, flipV } = transformed;
            const pointsStr = typeof element.attrs.points === 'string' ? element.attrs.points : '';
            // D-24: Scale polygon points by scaleX/scaleY
            const points = parsePointsString(pointsStr).map(([x, y]) => [x * scaleX, y * scaleY]);
            const path = (0, shape_to_path_1.polygonToPath)(points);
            const strokeWidth = parseFloat(String(element.attrs['stroke-width'] || '0'));
            const result = {
                id,
                type: 'shape',
                left: transformed.left,
                top: transformed.top,
                width: transformed.width,
                height: transformed.height,
                rotate,
                viewBox: [transformed.width, transformed.height],
                path,
                fixedRatio: false,
                fill: colorToHex(element.attrs.fill) || '#000000',
                opacity: element.attrs.opacity ? parseFloat(element.attrs.opacity) : undefined,
            };
            // D-15: attrs.gradient resolved at parse time — output as PPTShapeElement.gradient
            if (element.attrs.gradient) {
                result.gradient = element.attrs.gradient;
                // @ts-expect-error - fill may not exist on result
                delete result.fill;
            }
            else if (element.attrs.pattern && patternRegistry) {
                // D-36: attrs.pattern contains patternId — render to PNG and output as image fill
                const patternDef = patternRegistry.get(element.attrs.pattern);
                if (patternDef) {
                    try {
                        const patternPng = await (0, text_measurer_1.renderPatternToPng)(patternDef.width, patternDef.height, patternDef.children);
                        result.fill = patternPng;
                    }
                    catch (e) {
                        // Fallback to black if pattern rendering fails
                        console.warn(`[pattern] Failed to render pattern "${element.attrs.pattern}":`, e);
                        result.fill = colorToHex(element.attrs.fill) || '#000000';
                    }
                }
                else {
                    result.fill = colorToHex(element.attrs.fill) || '#000000';
                }
            }
            else {
                // D-18: fill-opacity < 1 → rgba() color
                const fillOpacity = element.attrs['fill-opacity'];
                if (fillOpacity && parseFloat(String(fillOpacity)) < 1) {
                    result.fill = colorToRgba(String(element.attrs.fill), parseFloat(String(fillOpacity)));
                }
            }
            if (flipH)
                result.flipH = true;
            if (flipV)
                result.flipV = true;
            if (element.attrs.stroke) {
                const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity']);
                result.outline = {
                    style: parseDashArray(element.attrs['stroke-dasharray']),
                    width: strokeWidth || 1,
                    color,
                    ...(opacity !== undefined && { opacity }),
                };
            }
            // D-22: SVG filter="url(#shadowId)" → shadow
            if (element.attrs.shadow) {
                result.shadow = element.attrs.shadow;
            }
            // D-23: groupId propagation from parent g element
            if (groupId) {
                result.groupId = groupId;
            }
            return result;
        }
        case 'polyline': {
            const transformed = (0, apply_transform_1.applyTransform)(left, top, width, height, transform);
            const { rotate, flipH, flipV } = transformed;
            const pointsStr = typeof element.attrs.points === 'string' ? element.attrs.points : '';
            // D-24: Scale polyline points by scaleX/scaleY
            const points = parsePointsString(pointsStr).map(([x, y]) => [x * scaleX, y * scaleY]);
            const path = polylineToPath(points);
            const strokeWidth = parseFloat(String(element.attrs['stroke-width'] || '0'));
            const result = {
                id,
                type: 'shape',
                left: transformed.left,
                top: transformed.top,
                width: transformed.width,
                height: transformed.height,
                rotate,
                viewBox: [transformed.width, transformed.height],
                path,
                fixedRatio: false,
                fill: colorToHex(element.attrs.fill) || 'none',
                opacity: element.attrs.opacity ? parseFloat(element.attrs.opacity) : undefined,
            };
            // D-15: attrs.gradient resolved at parse time — output as PPTShapeElement.gradient
            if (element.attrs.gradient) {
                result.gradient = element.attrs.gradient;
                // @ts-expect-error - fill may not exist on result
                delete result.fill;
            }
            else {
                // D-18: fill-opacity < 1 → rgba() color
                const fillOpacity = element.attrs['fill-opacity'];
                if (fillOpacity && parseFloat(String(fillOpacity)) < 1) {
                    result.fill = colorToRgba(String(element.attrs.fill), parseFloat(String(fillOpacity)));
                }
            }
            if (flipH)
                result.flipH = true;
            if (flipV)
                result.flipV = true;
            if (element.attrs.stroke) {
                const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity']);
                result.outline = {
                    style: parseDashArray(element.attrs['stroke-dasharray']),
                    width: strokeWidth || 1,
                    color,
                    ...(opacity !== undefined && { opacity }),
                };
            }
            // D-22: SVG filter="url(#shadowId)" → shadow
            if (element.attrs.shadow) {
                result.shadow = element.attrs.shadow;
            }
            // D-23: groupId propagation from parent g element
            if (groupId) {
                result.groupId = groupId;
            }
            return result;
        }
        case 'line': {
            const x1 = Number(element.attrs.x1) || 0;
            const y1 = Number(element.attrs.y1) || 0;
            const x2 = Number(element.attrs.x2) || 0;
            const y2 = Number(element.attrs.y2) || 0;
            // For lines WITHOUT transform: start/end are [0,0] to [width,0] relative to bounding box
            // For lines WITH transform: need to compute relative positions using transform offsets
            let startRelX, startRelY, endRelX, endRelY;
            if ((transform.translateX || 0) === 0 && (transform.translateY || 0) === 0 && (transform.scaleX || 1) === 1 && (transform.scaleY || 1) === 1) {
                // No transform - simple relative coordinates
                startRelX = 0;
                startRelY = 0;
                endRelX = width;
                endRelY = 0;
            }
            else {
                // With transform - compute relative positions from transformed coordinates
                const tx = transform.translateX || 0;
                const ty = transform.translateY || 0;
                const x1t = x1 + tx;
                const y1t = y1 + ty;
                const x2t = x2 + tx;
                const y2t = y2 + ty;
                startRelX = (x1t - coords.left) * scaleX;
                startRelY = (y1t - coords.top) * scaleY;
                endRelX = (x2t - coords.left) * scaleX;
                endRelY = (y2t - coords.top) * scaleY;
            }
            const result = {
                id,
                type: 'line',
                left,
                top,
                width,
                start: [startRelX, startRelY],
                end: [endRelX, endRelY],
                style: parseDashArray(element.attrs['stroke-dasharray']),
                color: '#000000', // Default, will be overwritten below
                points: ['', ''],
            };
            // D-24: stroke-width → PPTLineElement.width, default to 1 when absent or 0
            const strokeWidth = parseFloat(String(element.attrs['stroke-width'] || '0'));
            result.width = strokeWidth || 1;
            // D-19: stroke color/opacity handling
            const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity']);
            result.color = color;
            // D-23: groupId propagation from parent g element
            if (groupId) {
                result.groupId = groupId;
            }
            return result;
        }
        case 'text': {
            const transformed = (0, apply_transform_1.applyTransform)(left, top, width, height, transform);
            const { rotate } = transformed;
            const content = extractTextContentFromElement(element);
            // Force Source Han Sans CN Regular for all text (width calculation and output)
            const fontFamily = element.attrs['font-family'] || 'Source Han Sans CN Regular';
            const fontSize = Number(String(element.attrs["font-size"] || "16")) || 16;
            const scaledFontSize = fontSize * scaleY;
            const letterSpacing = parseFloat(String(element.attrs['letter-spacing'] || '0'));
            const fillColor = element.attrs.fill || '#000000';
            const fillOpacity = element.attrs['fill-opacity'];
            const hasRgba = fillOpacity && parseFloat(String(fillOpacity)) < 1;
            const fontWeight = element.attrs['font-weight'];
            const isBold = fontWeight === 'bold' || fontWeight === '600' || fontWeight === '700';
            const fontStyle = element.attrs['font-style'];
            const isItalic = fontStyle === 'italic';
            // Measure text using resvg-js with fallback to heuristic
            let textWidth;
            let textHeight;
            let textTop;
            try {
                const textAnchorAttr = element.attrs['text-anchor'];
                const xAttr = element.attrs['x'] ? Number(element.attrs['x']) : undefined;
                const measurementInput = {
                    content,
                    fontFamily,
                    fontSize,
                    fontWeight: isBold ? 'bold' : 'normal',
                    fontStyle: isItalic ? 'italic' : 'normal',
                    letterSpacing,
                    fill: fillColor,
                    textAnchor: textAnchorAttr,
                    x: xAttr,
                };
                const measured = await (0, text_measurer_1.measureTextElement)(measurementInput);
                // Add 25px safety margin to prevent text wrapping due to measurement discrepancy
                const TEXT_WIDTH_SAFETY_MARGIN = 25;
                textWidth = measured.width * scaleX + TEXT_WIDTH_SAFETY_MARGIN;
                textHeight = measured.height * scaleY;
                // SVG text y is baseline; convert to top by subtracting ascent distance
                // FIX: Use fixed 0.8 ascent ratio instead of measured.y (which varies by glyph shape)
                // This ensures same y coordinate → same textTop regardless of content
                const ASCENT_RATIO = 0.8;
                textTop = transformed.top - fontSize * ASCENT_RATIO * scaleY;
            }
            catch {
                // D-35: MEAS-06 fallback: heuristic estimate when resvg-js measurement fails
                textWidth = fontSize * content.length * 0.6;
                textHeight = scaledFontSize;
                // Fallback: SVG y is baseline, convert to top using heuristic (ascent ≈ 0.8 * fontSize)
                // Note: transformed.top is already scaled, so subtract scaled ascent directly
                textTop = transformed.top - fontSize * 0.8 * scaleY;
            }
            // Log text measurement info
            console.log(`[text] "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}" | fontSize=${fontSize} | scaleX=${scaleX.toFixed(3)} scaleY=${scaleY.toFixed(3)} | svg_w=${(textWidth / scaleX).toFixed(1)} | out_w=${textWidth.toFixed(1)} | svg_h=${(textHeight / scaleY).toFixed(1)} | out_h=${textHeight.toFixed(1)}`);
            // X轴: 考虑 text-anchor 调整 left
            // SVG text x 对于 middle/end 是参考点，需要偏移
            const textAnchorForLeft = element.attrs['text-anchor'];
            let textLeft = transformed.left;
            if (textAnchorForLeft === 'middle') {
                textLeft = transformed.left - textWidth / 2;
            }
            else if (textAnchorForLeft === 'end') {
                textLeft = transformed.left - textWidth;
            }
            // D-09: text-anchor → text-align on <p> style
            const textAnchor = element.attrs['text-anchor'];
            let textAlign = '';
            if (textAnchor === 'start')
                textAlign = 'left';
            else if (textAnchor === 'end')
                textAlign = 'right';
            else if (textAnchor === 'middle')
                textAlign = 'center';
            const pStyle = textAlign ? `text-align: ${textAlign}` : '';
            let spanStyle = `font-size: ${scaledFontSize}px`;
            if (hasRgba) {
                const rgbaColor = colorToRgba(fillColor, parseFloat(String(fillOpacity)));
                spanStyle += `; color: ${rgbaColor}`;
            }
            // Build content HTML: <p style="text-align: ..."><strong><em><span style="...">content</span></em></strong></p>
            // ProseMirror marks order: strong > em > fontsize > fontname > forecolor > backcolor > underline > strikethrough
            const innerSpan = `<span style="${spanStyle}">${content}</span>`;
            let weightedContent = innerSpan;
            if (isItalic)
                weightedContent = `<em>${weightedContent}</em>`;
            if (isBold)
                weightedContent = `<strong>${weightedContent}</strong>`;
            const richContent = `<p${pStyle ? ` style="${pStyle}"` : ''}>${weightedContent}</p>`;
            // D-07: writing-mode vertical-rl/vertical-lr → vertical: true
            const writingMode = element.attrs['writing-mode'];
            const vertical = writingMode === 'vertical-rl' || writingMode === 'vertical-lr';
            // D-09: fixedHeight based on SVG height attribute presence
            const fixedHeight = !!element.attrs.height;
            // D-26: inset=[0,0,0,0] to avoid 10px default padding causing coordinate offset
            const result = {
                id,
                type: 'text',
                left: textLeft,
                top: textTop,
                width: textWidth,
                height: textHeight,
                defaultFontSize: scaledFontSize,
                rotate,
                content: richContent,
                defaultFontName: fontFamily,
                defaultColor: colorToHex(fillColor) || '#000000',
                lineHeight: 1,
                opacity: element.attrs.opacity ? parseFloat(element.attrs.opacity) : undefined,
                shadow: undefined,
                vAlign: 'middle',
                fixedHeight,
                wordSpace: 0,
                paragraphSpace: 5,
                vertical,
                inset: [0, 0, 0, 0],
            };
            // D-19: stroke color/opacity handling for text outline
            if (element.attrs.stroke) {
                const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity']);
                result.outline = { color, width: 1 };
                if (opacity !== undefined)
                    result.outline.opacity = opacity;
            }
            // D-23: groupId propagation from parent g element
            if (groupId) {
                result.groupId = groupId;
            }
            return result;
        }
        case 'image': {
            const transformed = (0, apply_transform_1.applyTransform)(left, top, width, height, transform);
            const { rotate, flipH, flipV } = transformed;
            // Per PITFALL 1: href may be xlink:href or href
            const src = String(element.attrs['xlink:href'] || element.attrs.href || '');
            const result = {
                id,
                type: 'image',
                left: transformed.left,
                top: transformed.top,
                width: transformed.width,
                height: transformed.height,
                rotate,
                fixedRatio: true,
                src,
            };
            if (flipH)
                result.flipH = true;
            if (flipV)
                result.flipV = true;
            // D-25: image with stroke → outline
            if (element.attrs.stroke) {
                const strokeWidthAttr = element.attrs['stroke-width'];
                const strokeWidth = strokeWidthAttr !== undefined ? parseFloat(String(strokeWidthAttr)) : 1;
                if (strokeWidth > 0) {
                    const { color, opacity } = parseStrokeColor(element.attrs.stroke, element.attrs['stroke-opacity']);
                    result.outline = {
                        width: strokeWidth,
                        color,
                        ...(opacity !== undefined && { opacity }),
                    };
                }
            }
            // D-22: shadow from filter def (IMGE-02)
            if (element.attrs.shadow) {
                result.shadow = element.attrs.shadow;
            }
            // D-23: groupId propagation from parent g element
            if (groupId) {
                result.groupId = groupId;
            }
            return result;
        }
        case 'g':
            // Groups are not PPTElements - skip (children processed separately)
            return null;
        default:
            // Unknown elements - skip
            return null;
    }
}
/**
 * Transform an entire SVG parse result to PPTElement array.
 * Per D-06: output format { elements: PPTElement[] }
 * Per D-07: text/tspan -> PPTTextElement, image -> PPTImageElement, others -> PPTShapeElement
 * @param ast - Parsed SVG result (root + viewBox + width/height)
 * @param targetCanvas - Target canvas size [width, height], defaults to [1000, 562.5]
 */
/**
 * Compose two transform strings into a single transform string.
 * Parent transform is applied first, then child transform.
 * Properly merges multiple translate/scale operations.
 */
function composeTransforms(parentTransform, childTransform) {
    if (!parentTransform && !childTransform)
        return undefined;
    if (!parentTransform)
        return childTransform;
    if (!childTransform)
        return parentTransform;
    // Parse both transforms
    const parseSingle = (t) => {
        const result = { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotateDeg: 0 };
        const translateMatch = t.match(/translate\(\s*([\d.-]+)(?:[,\s]+([\d.-]+))?\s*\)/g);
        if (translateMatch) {
            // Sum all translate values (later translates override/add to earlier ones)
            for (const match of translateMatch) {
                const inner = match.match(/translate\(\s*([\d.-]+)(?:[,\s]+([\d.-]+))?\s*\)/);
                if (inner) {
                    result.translateX += parseFloat(inner[1]);
                    result.translateY += parseFloat(inner[2] || '0');
                }
            }
        }
        const scaleMatch = t.match(/scale\(\s*([\d.-]+)(?:[,\s]+([\d.-]+))?\s*\)/g);
        if (scaleMatch) {
            for (const match of scaleMatch) {
                const inner = match.match(/scale\(\s*([\d.-]+)(?:[,\s]+([\d.-]+))?\s*\)/);
                if (inner) {
                    result.scaleX *= parseFloat(inner[1]);
                    result.scaleY *= parseFloat(inner[2] || inner[1]);
                }
            }
        }
        const rotateMatch = t.match(/rotate\(\s*([\d.]+)(?:[,\s]+([\d.]+),?\s*([\d.]+))?\s*\)/g);
        if (rotateMatch) {
            // Take the last rotation
            const last = rotateMatch[rotateMatch.length - 1];
            const inner = last.match(/rotate\(\s*([\d.]+)(?:[,\s]+([\d.]+),?\s*([\d.]+))?\s*\)/);
            if (inner) {
                result.rotateDeg = parseFloat(inner[1]);
            }
        }
        return result;
    };
    const parent = parseSingle(parentTransform);
    const child = parseSingle(childTransform);
    // Compose: parent first, then child
    const composed = {
        translateX: parent.translateX + child.translateX,
        translateY: parent.translateY + child.translateY,
        scaleX: parent.scaleX * child.scaleX,
        scaleY: parent.scaleY * child.scaleY,
        rotateDeg: parent.rotateDeg + child.rotateDeg,
    };
    // Build composed transform string
    const parts = [];
    if (composed.translateX !== 0 || composed.translateY !== 0) {
        parts.push(`translate(${composed.translateX}, ${composed.translateY})`);
    }
    if (composed.scaleX !== 1 || composed.scaleY !== 1) {
        parts.push(`scale(${composed.scaleX}, ${composed.scaleY})`);
    }
    if (composed.rotateDeg !== 0) {
        parts.push(`rotate(${composed.rotateDeg})`);
    }
    return parts.length > 0 ? parts.join(' ') : undefined;
}
async function transformToPPTElement(ast, targetCanvas = [1000, 562.5]) {
    const elements = [];
    const patternRegistry = ast.patternRegistry;
    async function walk(element, viewBox, currentGroupId, parentTransform) {
        const tag = element.type.toLowerCase();
        // D-23: When tag='g' with id, update groupId context for children
        // Children inherit parent g id as their groupId. Nested g: innermost id takes precedence.
        // If g has no id, children get undefined (break the chain - no inheritance through unnamed g)
        const isG = tag === 'g';
        const effectiveGroupId = isG ? (element.attrs.id || undefined) : currentGroupId;
        // Accumulate parent transform: child's transform is composed with parent's
        const effectiveTransform = composeTransforms(parentTransform, element.attrs.transform);
        // Process children (for groups - g elements themselves are not output)
        for (const child of element.children) {
            if (child.type.toLowerCase() === 'g') {
                // Recursively process group children with inherited/overridden groupId and accumulated transform
                await walk(child, viewBox, effectiveGroupId, effectiveTransform);
            }
            else {
                // Skip non-renderable container elements
                if (!['defs', 'linearGradient', 'stop', 'filter', 'marker', 'clippath'].includes(child.type.toLowerCase())) {
                    // Apply accumulated parent transform to child element before processing
                    if (effectiveTransform && !child.attrs.transform) {
                        child.attrs.transform = effectiveTransform;
                    }
                    const pptel = await transformElement(child, viewBox, elements.length, targetCanvas, effectiveGroupId, patternRegistry);
                    if (pptel !== null) {
                        elements.push(pptel);
                    }
                }
            }
        }
    }
    await walk(ast.root, ast.viewBox);
    return elements;
}
//# sourceMappingURL=transform-to-pptel.js.map