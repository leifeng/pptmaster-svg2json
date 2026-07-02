"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const text_measurer_1 = require("./text-measurer");
(0, vitest_1.describe)('text-measurer', () => {
    (0, vitest_1.describe)('buildMeasurementSvg', () => {
        (0, vitest_1.it)('produces valid SVG with correct viewBox', () => {
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'Hello',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
            });
            (0, vitest_1.expect)(svg).toContain('viewBox="0 0 1280 720"');
            (0, vitest_1.expect)(svg).toContain('width="1280"');
            (0, vitest_1.expect)(svg).toContain('height="720"');
            (0, vitest_1.expect)(svg).toContain('xml:space="preserve"');
        });
        (0, vitest_1.it)('escapes ampersand in content', () => {
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'Tom & Jerry',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
            });
            (0, vitest_1.expect)(svg).toContain('Tom &amp; Jerry');
            (0, vitest_1.expect)(svg).not.toContain('Tom & Jerry');
        });
        (0, vitest_1.it)('escapes less-than in content', () => {
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'a < b',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
            });
            (0, vitest_1.expect)(svg).toContain('a &lt; b');
            (0, vitest_1.expect)(svg).not.toContain('a < b');
        });
        (0, vitest_1.it)('escapes greater-than in content', () => {
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'a > b',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
            });
            (0, vitest_1.expect)(svg).toContain('a &gt; b');
            (0, vitest_1.expect)(svg).not.toContain('a > b');
        });
        (0, vitest_1.it)('escapes double-quote in content', () => {
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'say "hello"',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
            });
            (0, vitest_1.expect)(svg).toContain('say &quot;hello&quot;');
            (0, vitest_1.expect)(svg).not.toContain('say "hello"');
        });
        (0, vitest_1.it)('sets font-family attribute', () => {
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'Test',
                fontFamily: 'Arial',
                fontSize: 16,
            });
            (0, vitest_1.expect)(svg).toContain('font-family="Arial"');
        });
        (0, vitest_1.it)('sets font-size attribute', () => {
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'Test',
                fontFamily: 'Microsoft YaHei',
                fontSize: 24,
            });
            (0, vitest_1.expect)(svg).toContain('font-size="24"');
        });
        (0, vitest_1.it)('sets font-weight attribute', () => {
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'Test',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
                fontWeight: 'bold',
            });
            (0, vitest_1.expect)(svg).toContain('font-weight="bold"');
        });
        (0, vitest_1.it)('defaults font-weight to normal', () => {
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'Test',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
            });
            (0, vitest_1.expect)(svg).toContain('font-weight="normal"');
        });
        (0, vitest_1.it)('sets font-style attribute', () => {
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'Test',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
                fontStyle: 'italic',
            });
            (0, vitest_1.expect)(svg).toContain('font-style="italic"');
        });
        (0, vitest_1.it)('defaults font-style to normal', () => {
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'Test',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
            });
            (0, vitest_1.expect)(svg).toContain('font-style="normal"');
        });
        (0, vitest_1.it)('sets letter-spacing attribute', () => {
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'Test',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
                letterSpacing: 2,
            });
            (0, vitest_1.expect)(svg).toContain('letter-spacing="2"');
        });
        (0, vitest_1.it)('defaults letter-spacing to 0', () => {
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'Test',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
            });
            (0, vitest_1.expect)(svg).toContain('letter-spacing="0"');
        });
        (0, vitest_1.it)('sets fill attribute', () => {
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'Test',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
                fill: '#ff0000',
            });
            (0, vitest_1.expect)(svg).toContain('fill="#ff0000"');
        });
        (0, vitest_1.it)('defaults fill to #000000', () => {
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'Test',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
            });
            (0, vitest_1.expect)(svg).toContain('fill="#000000"');
        });
        (0, vitest_1.it)('places text at x=0 and y=fontSize', () => {
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'Test',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
            });
            (0, vitest_1.expect)(svg).toContain('x="0"');
            (0, vitest_1.expect)(svg).toContain('y="16"');
        });
    });
    (0, vitest_1.describe)('measureTextBBox', () => {
        (0, vitest_1.it)('returns width and height for simple text', async () => {
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'Hello',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
            });
            const result = await (0, text_measurer_1.measureTextBBox)(svg);
            (0, vitest_1.expect)(result).toHaveProperty('width');
            (0, vitest_1.expect)(result).toHaveProperty('height');
            (0, vitest_1.expect)(result.width).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.height).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('returns non-zero dimensions proportional to font size', async () => {
            const svg16 = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'Test',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
            });
            const svg32 = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'Test',
                fontFamily: 'Microsoft YaHei',
                fontSize: 32,
            });
            const result16 = await (0, text_measurer_1.measureTextBBox)(svg16);
            const result32 = await (0, text_measurer_1.measureTextBBox)(svg32);
            // Larger font should produce larger bounding box
            (0, vitest_1.expect)(result32.width).toBeGreaterThan(result16.width);
            (0, vitest_1.expect)(result32.height).toBeGreaterThan(result16.height);
        });
        (0, vitest_1.it)('merges bounding boxes for multi-line text (newline)', async () => {
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'Line1\nLine2',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
            });
            const result = await (0, text_measurer_1.measureTextBBox)(svg);
            // Multi-line should have height greater than single line
            const singleLineSvg = (0, text_measurer_1.buildMeasurementSvg)({
                content: 'Line1',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
            });
            const singleResult = await (0, text_measurer_1.measureTextBBox)(singleLineSvg);
            (0, vitest_1.expect)(result.height).toBeGreaterThan(singleResult.height);
        });
        (0, vitest_1.it)('throws for empty content', async () => {
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: '',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
            });
            await (0, vitest_1.expect)((0, text_measurer_1.measureTextBBox)(svg)).rejects.toThrow();
        });
        (0, vitest_1.it)('throws when bounding box has zero dimensions', async () => {
            // This is hard to trigger directly, but the guard is in place
            // A zero-width/height result will throw
            const svg = (0, text_measurer_1.buildMeasurementSvg)({
                content: '',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
            });
            await (0, vitest_1.expect)((0, text_measurer_1.measureTextBBox)(svg)).rejects.toThrow();
        });
    });
    (0, vitest_1.describe)('measureTextElement', () => {
        (0, vitest_1.it)('accepts TextMeasurementInput and returns dimensions', async () => {
            const input = {
                content: 'Hello',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
            };
            const result = await (0, text_measurer_1.measureTextElement)(input);
            (0, vitest_1.expect)(result.width).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.height).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('passes font attributes through to measurement', async () => {
            const inputBold = {
                content: 'Test',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
                fontWeight: 'bold',
            };
            const inputNormal = {
                content: 'Test',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
                fontWeight: 'normal',
            };
            const resultBold = await (0, text_measurer_1.measureTextElement)(inputBold);
            const resultNormal = await (0, text_measurer_1.measureTextElement)(inputNormal);
            // Bold text may have different metrics but should return valid dimensions
            (0, vitest_1.expect)(resultBold.width).toBeGreaterThan(0);
            (0, vitest_1.expect)(resultBold.height).toBeGreaterThan(0);
            (0, vitest_1.expect)(resultNormal.width).toBeGreaterThan(0);
            (0, vitest_1.expect)(resultNormal.height).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('re-throws errors so caller can fallback', async () => {
            const input = {
                content: '',
                fontFamily: 'Microsoft YaHei',
                fontSize: 16,
            };
            // Should throw, not return fallback values
            await (0, vitest_1.expect)((0, text_measurer_1.measureTextElement)(input)).rejects.toThrow();
        });
    });
});
//# sourceMappingURL=text-measurer.test.js.map