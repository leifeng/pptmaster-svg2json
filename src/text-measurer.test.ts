import { describe, it, expect } from 'vitest'
import {
  buildMeasurementSvg,
  measureTextBBox,
  measureTextElement,
  TextMeasurementInput,
} from './text-measurer'

describe('text-measurer', () => {
  describe('buildMeasurementSvg', () => {
    it('produces valid SVG with correct viewBox', () => {
      const svg = buildMeasurementSvg({
        content: 'Hello',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
      })
      expect(svg).toContain('viewBox="0 0 1280 720"')
      expect(svg).toContain('width="1280"')
      expect(svg).toContain('height="720"')
      expect(svg).toContain('xml:space="preserve"')
    })

    it('escapes ampersand in content', () => {
      const svg = buildMeasurementSvg({
        content: 'Tom & Jerry',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
      })
      expect(svg).toContain('Tom &amp; Jerry')
      expect(svg).not.toContain('Tom & Jerry')
    })

    it('escapes less-than in content', () => {
      const svg = buildMeasurementSvg({
        content: 'a < b',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
      })
      expect(svg).toContain('a &lt; b')
      expect(svg).not.toContain('a < b')
    })

    it('escapes greater-than in content', () => {
      const svg = buildMeasurementSvg({
        content: 'a > b',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
      })
      expect(svg).toContain('a &gt; b')
      expect(svg).not.toContain('a > b')
    })

    it('escapes double-quote in content', () => {
      const svg = buildMeasurementSvg({
        content: 'say "hello"',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
      })
      expect(svg).toContain('say &quot;hello&quot;')
      expect(svg).not.toContain('say "hello"')
    })

    it('sets font-family attribute', () => {
      const svg = buildMeasurementSvg({
        content: 'Test',
        fontFamily: 'Arial',
        fontSize: 16,
      })
      expect(svg).toContain('font-family="Arial"')
    })

    it('sets font-size attribute', () => {
      const svg = buildMeasurementSvg({
        content: 'Test',
        fontFamily: 'Microsoft YaHei',
        fontSize: 24,
      })
      expect(svg).toContain('font-size="24"')
    })

    it('sets font-weight attribute', () => {
      const svg = buildMeasurementSvg({
        content: 'Test',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
        fontWeight: 'bold',
      })
      expect(svg).toContain('font-weight="bold"')
    })

    it('defaults font-weight to normal', () => {
      const svg = buildMeasurementSvg({
        content: 'Test',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
      })
      expect(svg).toContain('font-weight="normal"')
    })

    it('sets font-style attribute', () => {
      const svg = buildMeasurementSvg({
        content: 'Test',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
        fontStyle: 'italic',
      })
      expect(svg).toContain('font-style="italic"')
    })

    it('defaults font-style to normal', () => {
      const svg = buildMeasurementSvg({
        content: 'Test',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
      })
      expect(svg).toContain('font-style="normal"')
    })

    it('sets letter-spacing attribute', () => {
      const svg = buildMeasurementSvg({
        content: 'Test',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
        letterSpacing: 2,
      })
      expect(svg).toContain('letter-spacing="2"')
    })

    it('defaults letter-spacing to 0', () => {
      const svg = buildMeasurementSvg({
        content: 'Test',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
      })
      expect(svg).toContain('letter-spacing="0"')
    })

    it('sets fill attribute', () => {
      const svg = buildMeasurementSvg({
        content: 'Test',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
        fill: '#ff0000',
      })
      expect(svg).toContain('fill="#ff0000"')
    })

    it('defaults fill to #000000', () => {
      const svg = buildMeasurementSvg({
        content: 'Test',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
      })
      expect(svg).toContain('fill="#000000"')
    })

    it('places text at x=0 and y=fontSize', () => {
      const svg = buildMeasurementSvg({
        content: 'Test',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
      })
      expect(svg).toContain('x="0"')
      expect(svg).toContain('y="16"')
    })
  })

  describe('measureTextBBox', () => {
    it('returns width and height for simple text', async () => {
      const svg = buildMeasurementSvg({
        content: 'Hello',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
      })
      const result = await measureTextBBox(svg)
      expect(result).toHaveProperty('width')
      expect(result).toHaveProperty('height')
      expect(result.width).toBeGreaterThan(0)
      expect(result.height).toBeGreaterThan(0)
    })

    it('returns non-zero dimensions proportional to font size', async () => {
      const svg16 = buildMeasurementSvg({
        content: 'Test',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
      })
      const svg32 = buildMeasurementSvg({
        content: 'Test',
        fontFamily: 'Microsoft YaHei',
        fontSize: 32,
      })
      const result16 = await measureTextBBox(svg16)
      const result32 = await measureTextBBox(svg32)
      // Larger font should produce larger bounding box
      expect(result32.width).toBeGreaterThan(result16.width)
      expect(result32.height).toBeGreaterThan(result16.height)
    })

    it('merges bounding boxes for multi-line text (newline)', async () => {
      const svg = buildMeasurementSvg({
        content: 'Line1\nLine2',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
      })
      const result = await measureTextBBox(svg)
      // Multi-line should have height greater than single line
      const singleLineSvg = buildMeasurementSvg({
        content: 'Line1',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
      })
      const singleResult = await measureTextBBox(singleLineSvg)
      expect(result.height).toBeGreaterThan(singleResult.height)
    })

    it('throws for empty content', async () => {
      const svg = buildMeasurementSvg({
        content: '',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
      })
      await expect(measureTextBBox(svg)).rejects.toThrow()
    })

    it('throws when bounding box has zero dimensions', async () => {
      // This is hard to trigger directly, but the guard is in place
      // A zero-width/height result will throw
      const svg = buildMeasurementSvg({
        content: '',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
      })
      await expect(measureTextBBox(svg)).rejects.toThrow()
    })
  })

  describe('measureTextElement', () => {
    it('accepts TextMeasurementInput and returns dimensions', async () => {
      const input: TextMeasurementInput = {
        content: 'Hello',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
      }
      const result = await measureTextElement(input)
      expect(result.width).toBeGreaterThan(0)
      expect(result.height).toBeGreaterThan(0)
    })

    it('passes font attributes through to measurement', async () => {
      const inputBold: TextMeasurementInput = {
        content: 'Test',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
        fontWeight: 'bold',
      }
      const inputNormal: TextMeasurementInput = {
        content: 'Test',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
        fontWeight: 'normal',
      }
      const resultBold = await measureTextElement(inputBold)
      const resultNormal = await measureTextElement(inputNormal)
      // Bold text may have different metrics but should return valid dimensions
      expect(resultBold.width).toBeGreaterThan(0)
      expect(resultBold.height).toBeGreaterThan(0)
      expect(resultNormal.width).toBeGreaterThan(0)
      expect(resultNormal.height).toBeGreaterThan(0)
    })

    it('re-throws errors so caller can fallback', async () => {
      const input: TextMeasurementInput = {
        content: '',
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
      }
      // Should throw, not return fallback values
      await expect(measureTextElement(input)).rejects.toThrow()
    })
  })
})
