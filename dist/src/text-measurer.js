"use strict";
/**
 * Text measurement module using @resvg/resvg-js for accurate bounding box computation.
 * Lazy singleton pattern for WASM initialization.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMeasurementSvg = buildMeasurementSvg;
exports.measureTextBBox = measureTextBBox;
exports.measureTextElement = measureTextElement;
exports.renderSvgToPng = renderSvgToPng;
const resvg_js_1 = require("@resvg/resvg-js");
const utils_1 = require("./utils");
/**
 * Build a self-contained SVG string for text measurement.
 * Uses fixed 1280x720 viewBox per D-37 to prevent content clipping.
 * XML-escapes content for safety.
 * Handles multi-line text by splitting on newlines and using tspan elements.
 */
function buildMeasurementSvg(opts) {
    // XML-escape & < > " for SVG attribute safety (but not \n)
    const escapeXml = (str) => str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const lines = opts.content.split('\n');
    const fontSize = opts.fontSize;
    const fontWeight = opts.fontWeight ?? 'normal';
    const fontStyle = opts.fontStyle ?? 'normal';
    const letterSpacing = opts.letterSpacing ?? 0;
    const fill = opts.fill ?? '#000000';
    const textAnchor = opts.textAnchor ?? 'start';
    const x = opts.x ?? 0;
    let textContent;
    if (lines.length === 1) {
        // Single line: simple text element
        textContent = escapeXml(lines[0]);
    }
    else {
        // Multi-line: use tspan elements with dy for line breaks
        // First line at y=fontSize, subsequent lines offset by 1em
        textContent = lines
            .map((line, i) => {
            const escapedLine = escapeXml(line);
            if (i === 0) {
                return `<tspan x="${x}" dy="0">${escapedLine}</tspan>`;
            }
            else {
                return `<tspan x="${x}" dy="1em">${escapedLine}</tspan>`;
            }
        })
            .join('');
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <text x="${x}" y="${fontSize}"
        font-family="${opts.fontFamily}"
        font-size="${fontSize}"
        font-weight="${fontWeight}"
        font-style="${fontStyle}"
        letter-spacing="${letterSpacing}"
        fill="${fill}"
        text-anchor="${textAnchor}"
        xml:space="preserve">${textContent}</text>
</svg>`;
}
// Lazy singleton for WASM init — module-level promise ensures init happens once
let initPromise = null;
async function ensureInit() {
    if (initPromise)
        return initPromise;
    // Dynamic import triggers WASM loading
    initPromise = Promise.resolve().then(() => __importStar(require('@resvg/resvg-js'))).then(() => {
        // WASM loads on module import
    });
    return initPromise;
}
/**
 * Measure text bounding box by rendering SVG via resvg-js.
 * Uses getBBox() which applies transforms and returns the visible bounding box.
 * @throws if bounding box is undefined or has zero dimensions
 */
async function measureTextBBox(svgString) {
    const start = performance.now();
    await ensureInit();
    const resvg = new resvg_js_1.Resvg(svgString);
    const bbox = resvg.getBBox();
    if (!bbox) {
        throw new Error('No bounding box returned from resvg-js');
    }
    if (bbox.width === 0 || bbox.height === 0) {
        throw new Error('Bounding box has zero dimensions');
    }
    (0, utils_1.logEnd)('[文本测量] measureTextBBox', Math.round(performance.now() - start));
    return { width: bbox.width, height: bbox.height, y: bbox.y };
}
/**
 * High-level API: builds measurement SVG then measures it.
 * Catches errors and re-throws so caller can fall back to heuristic.
 */
async function measureTextElement(input) {
    const svgString = buildMeasurementSvg(input);
    return measureTextBBox(svgString);
}
/**
 * Render SVG string to PNG as base64 data URL.
 * Used for rendering background patterns and other complex SVG elements.
 */
async function renderSvgToPng(svgString, width, height) {
    await ensureInit();
    const resvg = new resvg_js_1.Resvg(svgString, {
        fitTo: {
            mode: 'width',
            value: width,
        },
    });
    const pngData = resvg.render().asPng();
    return `data:image/png;base64,${pngData.toString('base64')}`;
}
//# sourceMappingURL=text-measurer.js.map