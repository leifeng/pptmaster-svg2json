"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseViewBox = parseViewBox;
exports.parseSvg = parseSvg;
exports.flattenElements = flattenElements;
const fast_xml_parser_1 = require("fast-xml-parser");
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
function convertToSvgElement(node, parentTag = '') {
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
    // Handle text content
    let text;
    if (node['#text']) {
        text = typeof node['#text'] === 'string' ? node['#text'] : String(node['#text']);
    }
    // Recursively process children
    const children = [];
    const childTags = ['rect', 'circle', 'ellipse', 'path', 'polygon', 'polyline', 'line', 'text', 'tspan', 'image', 'g', 'defs', 'linearGradient', 'stop'];
    for (const tag of childTags) {
        if (node[tag]) {
            const childNodes = Array.isArray(node[tag]) ? node[tag] : [node[tag]];
            for (const child of childNodes) {
                children.push(convertToSvgElement(child, tag));
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
function parseSvg(xmlString) {
    const parser = new fast_xml_parser_1.XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        parseAttributeValue: true,
        parseTagValue: true,
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
            'stop',
        ].includes(name),
    });
    const result = parser.parse(xmlString);
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
    // Build clean element tree from svg root
    const root = convertToSvgElement(svgRoot, 'svg');
    root.attrs = rootAttrs;
    return {
        root,
        viewBox,
        width,
        height,
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