"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformToPPTElement = exports.parseSvg = void 0;
exports.convert = convert;
const svg_parser_1 = require("./parser/svg-parser");
const transform_to_pptel_1 = require("./transformer/transform-to-pptel");
async function convert(svgContent, options) {
    try {
        const ast = (0, svg_parser_1.parseSvg)(svgContent);
        // Basic validation: must have a root svg element
        if (!ast.root || ast.root.type !== 'svg') {
            return { success: false, error: 'Invalid SVG: no svg root element' };
        }
        // Must have non-empty content (at least width/height or children)
        if (ast.width <= 0 || ast.height <= 0) {
            return { success: false, error: 'Invalid SVG: missing width/height' };
        }
        const elements = (0, transform_to_pptel_1.transformToPPTElement)(ast, options?.targetCanvas);
        return {
            success: true,
            output: JSON.stringify({ elements }, null, 2),
            elementCount: elements.length,
        };
    }
    catch (err) {
        return { success: false, error: String(err) };
    }
}
var svg_parser_2 = require("./parser/svg-parser");
Object.defineProperty(exports, "parseSvg", { enumerable: true, get: function () { return svg_parser_2.parseSvg; } });
var transform_to_pptel_2 = require("./transformer/transform-to-pptel");
Object.defineProperty(exports, "transformToPPTElement", { enumerable: true, get: function () { return transform_to_pptel_2.transformToPPTElement; } });
//# sourceMappingURL=index.js.map