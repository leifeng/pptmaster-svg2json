"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseViewBox = parseViewBox;
exports.parseSvg = parseSvg;
exports.flattenElements = flattenElements;
const fast_xml_parser_1 = require("fast-xml-parser");
const transform_to_pptel_1 = require("../transformer/transform-to-pptel");
const svg_use_handler_1 = require("../svg-use-handler");
const utils_1 = require("../utils");
/**
 * Apply fill-opacity to a color string (handles hex, rgb, rgba formats).
 * D-15: fill-opacity must be applied after gradient reference resolution.
 */
function applyFillOpacityToColor(color, fillOpacity) {
    if (!color)
        return `rgba(0, 0, 0, ${fillOpacity})`;
    // rgba(r, g, b, a) — extract rgb and existing alpha, multiply by fillOpacity
    const rgbaMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,?\s*([\d.]*)\s*\)/);
    if (rgbaMatch) {
        const existingAlpha = rgbaMatch[4] !== '' ? parseFloat(rgbaMatch[4]) : 1;
        const newAlpha = existingAlpha * fillOpacity;
        return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${newAlpha})`;
    }
    // Fallback to colorToRgba for hex/named colors
    return (0, transform_to_pptel_1.colorToRgba)(color, fillOpacity);
}
/**
 * Parse gradientTransform attribute to extract rotation angle.
 * D-17: gradientTransform matrix rotation extracted via matrix decomposition.
 */
function parseGradientTransform(transform) {
    if (!transform)
        return 0;
    // rotate(N) or rotate(N, cx, cy) — extract degrees directly
    const rotateMatch = transform.match(/rotate\(\s*([\d.-]+)(?:[,\s]+([\d.-]+),?\s*([\d.-]+))?\s*\)/);
    if (rotateMatch) {
        return parseFloat(rotateMatch[1]);
    }
    // matrix(a,b,c,d,e,f) — extract rotation from matrix decomposition
    // For 2D rotation matrix: angle = atan2(b, a)
    const matrixMatch = transform.match(/matrix\(\s*([\d.-]+),?\s*([\d.-]+),?\s*([\d.-]+),?\s*([\d.-]+),?\s*([\d.-]+),?\s*([\d.-]+)\s*\)/);
    if (matrixMatch) {
        const a = parseFloat(matrixMatch[1]);
        const b = parseFloat(matrixMatch[2]);
        // Extract rotation angle: atan2(b, a) in degrees
        return Math.atan2(b, a) * 180 / Math.PI;
    }
    // translate+rotate+scale matrix — for now just return 0 (not a pure rotation)
    return 0;
}
/**
 * Collect all gradient definitions from parsed XML into a registry.
 */
function collectGradientDefs(xmlNode, registry) {
    const defs = xmlNode['defs'];
    if (!defs)
        return;
    const defsArr = Array.isArray(defs) ? defs : [defs];
    for (const def of defsArr) {
        if (!def)
            continue;
        // Process linearGradient
        if (def['linearGradient']) {
            const linearGradients = Array.isArray(def['linearGradient']) ? def['linearGradient'] : [def['linearGradient']];
            for (const grad of linearGradients) {
                if (!grad)
                    continue;
                const id = grad['@_id'];
                if (!id)
                    continue;
                const colors = [];
                const stops = grad['stop'];
                if (stops) {
                    const stopArr = Array.isArray(stops) ? stops : [stops];
                    for (const stop of stopArr) {
                        if (!stop)
                            continue;
                        const offset = stop['@_offset'] || '0%';
                        const stopColor = stop['@_stop-color'] || '#000000';
                        const stopOpacityAttr = stop['@_stop-opacity'];
                        const stopOpacity = stopOpacityAttr !== undefined ? parseFloat(stopOpacityAttr) : 1;
                        const pos = offset.endsWith('%') ? parseFloat(offset) / 100 : parseFloat(offset);
                        colors.push({ pos, color: (0, transform_to_pptel_1.colorToRgba)(stopColor, stopOpacity) });
                    }
                }
                const gradientDef = {
                    type: 'linear',
                    x1: grad['@_x1'],
                    y1: grad['@_y1'],
                    x2: grad['@_x2'],
                    y2: grad['@_y2'],
                    gradientTransform: grad['@_gradientTransform'],
                    spreadMethod: grad['@_spreadMethod'],
                    gradientUnits: grad['@_gradientUnits'],
                    colors,
                };
                registry.set(id, gradientDef);
            }
        }
        // Process radialGradient
        if (def['radialGradient']) {
            const radialGradients = Array.isArray(def['radialGradient']) ? def['radialGradient'] : [def['radialGradient']];
            for (const grad of radialGradients) {
                if (!grad)
                    continue;
                const id = grad['@_id'];
                if (!id)
                    continue;
                const colors = [];
                const stops = grad['stop'];
                if (stops) {
                    const stopArr = Array.isArray(stops) ? stops : [stops];
                    for (const stop of stopArr) {
                        if (!stop)
                            continue;
                        const offset = stop['@_offset'] || '0%';
                        const stopColor = stop['@_stop-color'] || '#000000';
                        const stopOpacityAttr = stop['@_stop-opacity'];
                        const stopOpacity = stopOpacityAttr !== undefined ? parseFloat(stopOpacityAttr) : 1;
                        const pos = offset.endsWith('%') ? parseFloat(offset) / 100 : parseFloat(offset);
                        colors.push({ pos, color: (0, transform_to_pptel_1.colorToRgba)(stopColor, stopOpacity) });
                    }
                }
                const gradientDef = {
                    type: 'radial',
                    cx: grad['@_cx'],
                    cy: grad['@_cy'],
                    r: grad['@_r'],
                    fx: grad['@_fx'],
                    fy: grad['@_fy'],
                    gradientTransform: grad['@_gradientTransform'],
                    spreadMethod: grad['@_spreadMethod'],
                    gradientUnits: grad['@_gradientUnits'],
                    colors,
                };
                registry.set(id, gradientDef);
            }
        }
    }
}
/**
 * Collect all pattern definitions from parsed XML into a registry.
 * D-36: pattern defs collected for fill="url(#patternId)" resolution.
 */
function collectPatternDefs(xmlNode, registry) {
    const defs = xmlNode['defs'];
    if (!defs)
        return;
    const defsArr = Array.isArray(defs) ? defs : [defs];
    for (const def of defsArr) {
        if (!def)
            continue;
        if (def['pattern']) {
            const patterns = Array.isArray(def['pattern']) ? def['pattern'] : [def['pattern']];
            for (const pat of patterns) {
                if (!pat)
                    continue;
                const id = pat['@_id'];
                if (!id)
                    continue;
                // Collect children of the pattern
                const children = [];
                const childTags = ['rect', 'circle', 'ellipse', 'path', 'polygon', 'polyline', 'line', 'text', 'image', 'use'];
                for (const tag of childTags) {
                    if (pat[tag]) {
                        const childNodes = Array.isArray(pat[tag]) ? pat[tag] : [pat[tag]];
                        for (const child of childNodes) {
                            if (!child)
                                continue;
                            // Extract attributes with @_ prefix
                            const attrs = {};
                            for (const key of Object.keys(child)) {
                                if (key.startsWith('@_')) {
                                    attrs[key.substring(2)] = child[key];
                                }
                            }
                            // Also handle xlink:href
                            if (child['xlink:href'])
                                attrs['href'] = child['xlink:href'];
                            if (child.href)
                                attrs.href = child.href;
                            children.push({ type: tag, attrs });
                        }
                    }
                }
                const patternDef = {
                    id,
                    width: parseFloat(pat['@_width']) || 0,
                    height: parseFloat(pat['@_height']) || 0,
                    patternUnits: pat['@_patternUnits'],
                    patternContentUnits: pat['@_patternContentUnits'],
                    patternTransform: pat['@_patternTransform'],
                    children,
                };
                registry.set(id, patternDef);
            }
        }
    }
}
/**
 * Collect all filter definitions from parsed XML into a registry.
 * D-22: filter defs collected and resolved at parse time.
 */
function collectFilterDefs(xmlNode, registry) {
    const defs = xmlNode['defs'];
    if (!defs)
        return;
    const defsArr = Array.isArray(defs) ? defs : [defs];
    for (const def of defsArr) {
        if (!def)
            continue;
        if (def['filter']) {
            const filters = Array.isArray(def['filter']) ? def['filter'] : [def['filter']];
            for (const filter of filters) {
                if (!filter)
                    continue;
                const id = filter['@_id'];
                if (!id)
                    continue;
                // Collect filter primitive children (feDropShadow, etc.) as SvgElement-like objects
                const filterChildren = [];
                if (filter['feDropShadow']) {
                    const feDsArr = Array.isArray(filter['feDropShadow']) ? filter['feDropShadow'] : [filter['feDropShadow']];
                    for (const feDs of feDsArr) {
                        if (!feDs)
                            continue;
                        // Extract feDropShadow attributes with @_ prefix
                        const feDsAttrs = {};
                        for (const key of Object.keys(feDs)) {
                            if (key.startsWith('@_')) {
                                feDsAttrs[key.substring(2)] = feDs[key];
                            }
                        }
                        filterChildren.push({ type: 'feDropShadow', attrs: feDsAttrs, children: [] });
                    }
                }
                // Store raw filter for complex chain support (feGaussianBlur + feOffset + feFlood + feComposite + feMerge)
                registry.set(id, { id, children: filterChildren, rawFilter: filter });
            }
        }
    }
}
/**
 * Resolve fill="url(#id)" references using the gradient registry.
 * D-15: fill="url(#gradientId)" resolved at parse time to gradient object.
 */
function resolveFillReference(attrs, registry) {
    const fill = attrs.fill;
    if (!fill || !fill.startsWith('url(#'))
        return;
    const match = fill.match(/url\(#([^)]+)\)/);
    if (!match)
        return;
    const gradientId = match[1];
    const gradientDef = registry.get(gradientId);
    if (!gradientDef)
        return;
    // D-15: fill-opacity on the element multiplies with gradient stop opacity
    // If fill-opacity is not set on the element, keep gradient's original stop opacities
    const fillOpacityAttr = attrs['fill-opacity'];
    const hasFillOpacity = fillOpacityAttr !== undefined;
    const fillOpacity = hasFillOpacity ? parseFloat(String(fillOpacityAttr)) : 1;
    // Build PPTist Gradient object from GradientDef
    // The PPTist Gradient type is { type: 'linear' | 'radial', colors: {pos, color}[], rotate: number }
    // D-27: Compute rotate from gradientTransform OR from x1/y1/x2/y2 direction vector
    let rotate = parseGradientTransform(gradientDef.gradientTransform);
    if (rotate === 0 && gradientDef.gradientTransform === undefined && gradientDef.type === 'linear') {
        // No gradientTransform, compute rotate from x1/y1/x2/y2 direction
        const x1 = parseFloat(String(gradientDef.x1)) || 0;
        const y1 = parseFloat(String(gradientDef.y1)) || 0;
        const x2 = parseFloat(String(gradientDef.x2)) || 0;
        const y2 = parseFloat(String(gradientDef.y2)) || 0;
        // atan2 gives angle from positive x-axis, in radians; convert to degrees
        rotate = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    }
    const gradient = {
        type: gradientDef.type,
        colors: gradientDef.colors.map(c => {
            // D-29: Only apply fill-opacity if explicitly set on element; otherwise keep gradient's stop opacity
            if (hasFillOpacity) {
                // Multiply gradient stop alpha by element's fill-opacity
                const colorWithOpacity = applyFillOpacityToColor(c.color, fillOpacity);
                return { pos: c.pos * 100, color: colorWithOpacity };
            }
            else {
                // Keep original gradient color (with its stop opacity)
                return { pos: c.pos * 100, color: c.color };
            }
        }),
        rotate,
    };
    attrs.gradient = gradient;
    // Clear fill and fill-opacity since gradient is now in attrs.gradient
    delete attrs.fill;
    delete attrs['fill-opacity'];
}
/**
 * Resolve fill="url(#patternId)" references by storing pattern reference.
 * D-36: Pattern resolution happens at transform time (to PNG) rather than parse time.
 * This stores the patternId in attrs.pattern for later PNG rendering.
 */
function resolvePatternReference(attrs, registry) {
    const fill = attrs.fill;
    if (!fill || !fill.startsWith('url(#'))
        return;
    const match = fill.match(/url\(#([^)]+)\)/);
    if (!match)
        return;
    const patternId = match[1];
    const patternDef = registry.get(patternId);
    if (!patternDef)
        return;
    // Store pattern reference for later PNG rendering in transform-to-pptel.ts
    attrs.pattern = patternId;
}
/**
 * Parse complex SVG filter chain (feGaussianBlur + feOffset + feFlood + feComposite + feMerge)
 * and extract shadow parameters compatible with PPTist's PPTElementShadow.
 *
 * Filter chain pattern:
 *   feGaussianBlur (stdDeviation) → feOffset (dx, dy) → feFlood (flood-color, flood-opacity) → feComposite (operator="in") → feMerge
 */
function parseComplexFilterChain(filterElement) {
    if (!filterElement)
        return null;
    // Get all filter primitives in order
    const primitives = [
        'feGaussianBlur', 'feOffset', 'feFlood', 'feComposite', 'feMerge',
        'feDropShadow', 'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feFuncR', 'feFuncG', 'feFuncB', 'feFuncA',
        'feMergeNode', 'feMergeNodeIn', 'feMergeNodeOut'
    ];
    const found = {};
    for (const prim of primitives) {
        if (filterElement[prim] !== undefined) {
            found[prim] = Array.isArray(filterElement[prim]) ? filterElement[prim] : [filterElement[prim]];
        }
    }
    // Case 1: Simple feDropShadow
    if (found['feDropShadow'] && found['feDropShadow'].length > 0) {
        const feDs = found['feDropShadow'][0];
        return {
            h: parseFloat(String(feDs['@_dx'] || feDs['@_Dx'] || '0')),
            v: parseFloat(String(feDs['@_dy'] || feDs['@_Dy'] || '0')),
            blur: parseFloat(String(feDs['@_stdDeviation'] || feDs['@_stdDeviation'] || '0')),
            color: (0, transform_to_pptel_1.colorToRgba)(String(feDs['@_flood-color'] || feDs['@_floodColor'] || '#000000'), parseFloat(String(feDs['@_flood-opacity'] || feDs['@_floodOpacity'] || '1'))),
        };
    }
    // Case 2: Complex chain with feGaussianBlur + feOffset + feFlood
    const feGaussianBlur = found['feGaussianBlur']?.[0];
    const feOffset = found['feOffset']?.[0];
    const feFlood = found['feFlood']?.[0];
    if (feGaussianBlur && feOffset && feFlood) {
        const stdDeviation = feGaussianBlur['@_stdDeviation'] || feGaussianBlur['@_stdDeviation'] || '0';
        // Handle separate stdDeviation for x and y (take the first value)
        const blur = parseFloat(String(stdDeviation).split(/\s+/)[0]);
        const h = parseFloat(String(feOffset['@_dx'] || feOffset['@_Dx'] || '0'));
        const v = parseFloat(String(feOffset['@_dy'] || feOffset['@_Dy'] || '0'));
        const floodColor = String(feFlood['@_flood-color'] || feFlood['@_floodColor'] || '#000000');
        const floodOpacity = parseFloat(String(feFlood['@_flood-opacity'] || feFlood['@_floodOpacity'] || '1'));
        const color = (0, transform_to_pptel_1.colorToRgba)(floodColor, floodOpacity);
        return { h, v, blur, color };
    }
    return null;
}
/**
 * Resolve filter="url(#id)" references using the filter registry.
 * D-22: filter="url(#shadowId)" with feDropShadow → PPTElementShadow object.
 * Also supports complex filter chains (feGaussianBlur + feOffset + feFlood).
 */
function resolveFilterReference(attrs, registry) {
    const filter = attrs.filter;
    if (!filter || typeof filter !== 'string' || !filter.startsWith('url(#'))
        return;
    const match = filter.match(/url\(#([^)]+)\)/);
    if (!match)
        return;
    const filterId = match[1];
    const filterDef = registry.get(filterId);
    if (!filterDef)
        return;
    // Try complex filter chain first (feGaussianBlur + feOffset + feFlood)
    if (filterDef.rawFilter) {
        const shadow = parseComplexFilterChain(filterDef.rawFilter);
        if (shadow) {
            attrs.shadow = shadow;
            return;
        }
    }
    // Fall back to simple feDropShadow
    const feDropShadow = filterDef.children.find(c => c.type === 'feDropShadow');
    if (!feDropShadow)
        return;
    // Build PPTElementShadow from feDropShadow attributes
    // D-22: dx→h, dy→v, stdDeviation→blur, flood-color→color
    attrs.shadow = {
        h: parseFloat(String(feDropShadow.attrs.dx || '0')),
        v: parseFloat(String(feDropShadow.attrs.dy || '0')),
        blur: parseFloat(String(feDropShadow.attrs.stdDeviation || '0')),
        color: (0, transform_to_pptel_1.colorToHex)(String(feDropShadow.attrs['flood-color'] || feDropShadow.attrs['shadow-color'] || '#000000')),
    };
}
function extractTextContent(node) {
    if (!node)
        return { content: '', runs: [] };
    const runs = [];
    let content = '';
    if (node.tspan) {
        const tspans = Array.isArray(node.tspan) ? node.tspan : [node.tspan];
        for (const span of tspans) {
            const text = typeof span === 'string' ? span : span['#text'] ?? '';
            content += text;
            if (typeof span === 'object') {
                runs.push({
                    content: text,
                    x: span['@_x'],
                    y: span['@_y'],
                    fontFamily: span['@_font-family'],
                    fontSize: span['@_font-size'],
                    fill: span['@_fill'],
                });
            }
        }
    }
    else {
        content = typeof node === 'string' ? node : node['#text'] ?? '';
    }
    return { content, runs };
}
function parseViewBox(viewBoxStr) {
    if (!viewBoxStr)
        return [0, 0, 1280, 720];
    const parts = viewBoxStr.trim().split(/[\s,]+/).map(Number);
    if (parts.length < 4 || parts.some(isNaN))
        return [0, 0, 1280, 720];
    return [parts[0], parts[1], parts[2], parts[3]];
}
function convertToSvgElement(node, parentTag = '', gradientRegistry, filterRegistry, patternRegistry) {
    const tagName = (node['#tag'] || parentTag || '').toLowerCase();
    // Extract attributes with @_ prefix
    const attrs = {};
    for (const key of Object.keys(node)) {
        if (key.startsWith('@_')) {
            const attrName = key.substring(2);
            attrs[attrName] = node[key];
        }
    }
    // Also check for namespace-prefixed attributes without @_ prefix
    if (node['xlink:href'])
        attrs['xlink:href'] = node['xlink:href'];
    if (node.href)
        attrs.href = node.href;
    // Resolve fill="url(#id)" references using gradient registry
    if (gradientRegistry) {
        resolveFillReference(attrs, gradientRegistry);
    }
    // Resolve filter="url(#id)" references using filter registry (D-22)
    if (filterRegistry) {
        resolveFilterReference(attrs, filterRegistry);
    }
    // Resolve fill="url(#patternId)" references by storing pattern reference (D-36)
    // Note: pattern rendering to PNG happens in transform-to-pptel.ts
    if (patternRegistry) {
        resolvePatternReference(attrs, patternRegistry);
    }
    // Handle text content
    let text;
    if (node['#text']) {
        text = typeof node['#text'] === 'string' ? node['#text'] : String(node['#text']);
    }
    // Recursively process children
    const children = [];
    const childTags = ['rect', 'circle', 'ellipse', 'path', 'polygon', 'polyline', 'line', 'text', 'tspan', 'image', 'g', 'defs', 'linearGradient', 'radialGradient', 'stop'];
    for (const tag of childTags) {
        if (node[tag]) {
            const childNodes = Array.isArray(node[tag]) ? node[tag] : [node[tag]];
            for (const child of childNodes) {
                children.push(convertToSvgElement(child, tag, gradientRegistry, filterRegistry, patternRegistry));
            }
        }
    }
    return {
        type: tagName,
        attrs,
        children,
        text,
    };
}
/**
 * 调整路径坐标，使其相对于 viewBox 原点
 * 图标 SVG 的 viewBox 通常是 0 0 24 24，但路径内容可能从 (4, 6) 等位置开始
 * 这会导致 translate(x, y) 不能正确定位图标
 */
function adjustPathToViewBox(d, viewBox) {
    // 如果 viewBox 正好是 0,0，不需要调整
    if (viewBox.x === 0 && viewBox.y === 0) {
        return d;
    }
    // 使用简单的字符串替换来调整坐标
    // 注意：这只能处理简单的 M/L/H/V 命令，对于复杂的 arc/curve 不准确
    // 但大多数 tabler 图标只用 M/L/H/V
    let adjusted = d;
    // 匹配命令后的坐标对并添加 viewBox 偏移
    // 格式: 命令 数字 数字 (可能重复)
    adjusted = adjusted.replace(/([MLHV])\s*([-\d.]+)/gi, (match, cmd, numStr) => {
        const num = parseFloat(numStr);
        if (cmd.toUpperCase() === 'H') {
            // 水平线只影响 X
            return cmd + ' ' + (num + viewBox.x);
        }
        else if (cmd.toUpperCase() === 'V') {
            // 垂直线只影响 Y
            return cmd + ' ' + (num + viewBox.y);
        }
        else {
            // M/L 需要处理 x,y 对
            return match; // 复杂情况暂不处理
        }
    });
    // 简单情况：如果 viewBox 是 0 0 24 24，路径坐标本来就是相对于 0,0 的
    // 不需要调整（tabler 图标都是这样）
    return d;
}
/**
 * 缩放 path 坐标 - 所有坐标使用统一比例缩放
 */
function scalePathCoords(d, scaleX, scaleY) {
    let result = '';
    let curX = 0; // 当前 X 坐标（原始，未缩放）
    let curY = 0; // 当前 Y 坐标（原始，未缩放）
    const segments = d.split(/(?=[MLHVAZ])/i);
    for (const seg of segments) {
        const cmdMatch = seg.match(/^([MLHVAZ])\s*/i);
        if (!cmdMatch) {
            result += seg;
            continue;
        }
        const cmd = cmdMatch[1];
        const isRel = cmd === cmd.toLowerCase();
        const cmdU = cmd.toUpperCase();
        const nums = seg.slice(cmdMatch[0].length).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
        if (cmdU === 'Z') {
            result += 'Z';
            curX = 0;
            curY = 0;
            continue;
        }
        if (cmdU === 'M') {
            for (let i = 0; i < nums.length; i += 2) {
                const absX = isRel ? curX + nums[i] : nums[i];
                const absY = i + 1 < nums.length ? (isRel ? curY + nums[i + 1] : nums[i + 1]) : curY;
                result += (i === 0 ? `M${absX * scaleX},${absY * scaleY}` : `L${absX * scaleX},${absY * scaleY}`);
                curX = absX;
                curY = absY;
            }
        }
        else if (cmdU === 'L') {
            for (let i = 0; i < nums.length; i += 2) {
                const absX = isRel ? curX + nums[i] : nums[i];
                const absY = i + 1 < nums.length ? (isRel ? curY + nums[i + 1] : nums[i + 1]) : curY;
                result += `L${absX * scaleX},${absY * scaleY}`;
                curX = absX;
                curY = absY;
            }
        }
        else if (cmdU === 'H') {
            for (const nx of nums) {
                const absX = isRel ? curX + nx : nx;
                result += `H${absX * scaleX}`;
                curX = absX;
            }
        }
        else if (cmdU === 'V') {
            for (const ny of nums) {
                const absY = isRel ? curY + ny : ny;
                result += `V${absY * scaleY}`;
                curY = absY;
            }
        }
        else if (cmdU === 'A') {
            for (let i = 0; i < nums.length; i += 7) {
                const absX = isRel ? curX + nums[i + 5] : nums[i + 5];
                const absY = isRel ? curY + nums[i + 6] : nums[i + 6];
                result += `A${nums[i] * scaleX},${nums[i + 1] * scaleY},${nums[i + 2]},${nums[i + 3]},${nums[i + 4]},${absX * scaleX},${absY * scaleY}`;
                curX = absX;
                curY = absY;
            }
        }
        else {
            // 不支持的命令，保持原样
            result += seg;
        }
    }
    return result;
}
function parseSvg(xmlString, svgFilePath) {
    const parseStart = performance.now();
    (0, utils_1.log)('[解析] 开始 parseSvg');
    // 先解析 SVG 获取 viewBox，计算画布缩放比例
    const vbMatch = xmlString.match(/viewBox="([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)"/);
    const svgWidth = vbMatch ? parseFloat(vbMatch[3]) : 1280;
    const svgHeight = vbMatch ? parseFloat(vbMatch[4]) : 720;
    // 默认 targetCanvas 是 1000x562.5
    const canvasScaleX = 1000 / svgWidth;
    const canvasScaleY = 562.5 / svgHeight;
    // 自动嵌入图标占位符（生成临时文件，不修改原文件）
    // svgFilePath 用于解析外部 SVG href 引用的相对路径
    let tempFilePath;
    ({ xmlString, tempFilePath } = (() => {
        const start = performance.now();
        const result = (0, svg_use_handler_1.autoEmbedIcons)(xmlString, canvasScaleX, canvasScaleY, svgFilePath);
        (0, utils_1.logEnd)('[解析] autoEmbedIcons', Math.round(performance.now() - start));
        return result;
    })());
    const parser = new fast_xml_parser_1.XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        parseAttributeValue: true,
        parseTagValue: false,
        trimValues: true,
        isArray: (name) => [
            'rect',
            'circle',
            'ellipse',
            'path',
            'polygon',
            'polyline',
            'line',
            'text',
            'tspan',
            'image',
            'g',
            'defs',
            'linearGradient',
            'radialGradient',
            'stop',
        ].includes(name),
    });
    const result = (() => {
        const start = performance.now();
        const r = parser.parse(xmlString);
        (0, utils_1.logEnd)('[解析] XML解析', Math.round(performance.now() - start));
        return r;
    })();
    // Navigate to svg root
    const svgRoot = result.svg || result['svg:svg'] || result;
    if (!svgRoot || typeof svgRoot !== 'object') {
        throw new Error('Invalid SVG: no svg root element found');
    }
    // Reject empty result objects (invalid SVG)
    if (Object.keys(svgRoot).length === 0) {
        throw new Error('Invalid SVG: empty parse result');
    }
    // Extract viewBox from root
    const viewBoxAttr = svgRoot['@_viewBox'] || svgRoot.viewBox;
    const viewBox = parseViewBox(viewBoxAttr);
    // Extract width/height from root attributes
    const rootAttrs = {};
    for (const key of Object.keys(svgRoot)) {
        if (key.startsWith('@_')) {
            rootAttrs[key.substring(2)] = svgRoot[key];
        }
    }
    if (svgRoot['xlink:href'])
        rootAttrs['xlink:href'] = svgRoot['xlink:href'];
    const width = parseFloat(String(svgRoot['@_width'] || rootAttrs.width || viewBox[2]));
    const height = parseFloat(String(svgRoot['@_height'] || rootAttrs.height || viewBox[3]));
    // First pass: collect all gradient definitions into registry
    const gradientRegistry = new Map();
    (() => { const start = performance.now(); collectGradientDefs(svgRoot, gradientRegistry); (0, utils_1.logEnd)('[解析] collectGradientDefs', Math.round(performance.now() - start)); })();
    // First pass: collect all filter definitions into registry
    const filterRegistry = new Map();
    (() => { const start = performance.now(); collectFilterDefs(svgRoot, filterRegistry); (0, utils_1.logEnd)('[解析] collectFilterDefs', Math.round(performance.now() - start)); })();
    // First pass: collect all pattern definitions into registry
    const patternRegistry = new Map();
    (() => { const start = performance.now(); collectPatternDefs(svgRoot, patternRegistry); (0, utils_1.logEnd)('[解析] collectPatternDefs', Math.round(performance.now() - start)); })();
    // Build clean element tree from svg root with gradient and filter registries for resolving references
    const root = (() => {
        const start = performance.now();
        const r = convertToSvgElement(svgRoot, 'svg', gradientRegistry, filterRegistry, patternRegistry);
        (0, utils_1.logEnd)('[解析] convertToSvgElement (构建AST)', Math.round(performance.now() - start));
        return r;
    })();
    root.attrs = rootAttrs;
    (0, utils_1.logEnd)('[解析] parseSvg 总耗时', Math.round(performance.now() - parseStart));
    return {
        root,
        viewBox,
        width,
        height,
        patternRegistry,
    };
}
function flattenElements(element) {
    const result = [element];
    for (const child of element.children) {
        result.push(...flattenElements(child));
    }
    return result;
}
//# sourceMappingURL=svg-parser.js.map