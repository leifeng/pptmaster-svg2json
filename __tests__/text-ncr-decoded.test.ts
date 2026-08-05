import { describe, expect, it } from 'vitest'
import { convert, parseSvg } from '../src/index'

const wrapSvg = (content: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">${content}</svg>`

function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

describe('NCR (numeric character reference) decoding in text/tspan', () => {
  it('decodes mathematical set-membership symbols (hex NCR)', async () => {
    const svg = wrapSvg(
      '<text x="40" y="60" font-size="24">o_t &#x2208; &#x211D;&#x207F; via MLA</text>',
    )

    const ast = parseSvg(svg)
    const textElement = ast.root.children.find(child => child.type === 'text') as any
    expect(textElement.text).toBe('o_t ∈ ℝⁿ via MLA')
    // Ensure the NCR tokens themselves are gone
    expect(textElement.text).not.toContain('&#x')
    expect(textElement.text).not.toContain('&#')

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const presentation = JSON.parse(result.output!)
    const outputText = presentation.slides[0].elements.find((element: any) => element.type === 'text')
    expect(plainText(outputText.content)).toBe('o_t ∈ ℝⁿ via MLA')
  })

  it('decodes geometric / control symbols', async () => {
    const svg = wrapSvg('<text x="40" y="100">&#x25B6; play &#x25C0;</text>')

    const ast = parseSvg(svg)
    const textElement = ast.root.children.find(child => child.type === 'text') as any
    expect(textElement.text).toBe('▶ play ◀')

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const presentation = JSON.parse(result.output!)
    const outputText = presentation.slides[0].elements.find((element: any) => element.type === 'text')
    expect(plainText(outputText.content)).toBe('▶ play ◀')
  })

  it('decodes decimal NCR (&#NNN;) in addition to hex (&#xHH;)', async () => {
    const svg = wrapSvg('<text x="40" y="140">decimal: &#8722; &#8805; &#8729;</text>')
    const ast = parseSvg(svg)
    const textElement = ast.root.children.find(child => child.type === 'text') as any
    expect(textElement.text).toBe('decimal: − ≥ ∙')

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const presentation = JSON.parse(result.output!)
    const outputText = presentation.slides[0].elements.find((element: any) => element.type === 'text')
    expect(plainText(outputText.content)).toBe('decimal: − ≥ ∙')
  })

  it('still resolves the 5 XML predefined entities alongside NCR', async () => {
    const svg = wrapSvg('<text x="40" y="180">5 entities: &lt; &gt; &amp; &quot; &apos;</text>')
    const ast = parseSvg(svg)
    const textElement = ast.root.children.find(child => child.type === 'text') as any
    // XML predefined entities are decoded to their real characters
    expect(textElement.text).toBe('5 entities: < > & " \'')

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const presentation = JSON.parse(result.output!)
    const outputText = presentation.slides[0].elements.find((element: any) => element.type === 'text')
    // HTML escaping re-encodes < > & " back to entities for safe HTML output;
    // apostrophe is kept literal. NCR tokens must NOT remain in the output.
    expect(outputText.content).toContain('&lt;')
    expect(outputText.content).toContain('&gt;')
    expect(outputText.content).toContain('&amp;')
    expect(outputText.content).toContain('&quot;')
    expect(outputText.content).not.toMatch(/&#/)
  })

  it('decodes NCR inside tspan (mixed tspan content)', async () => {
    const svg = wrapSvg(
      '<text x="40" y="200" font-size="24">A <tspan>&#x2208;</tspan> B</text>',
    )

    const ast = parseSvg(svg)
    const textElement = ast.root.children.find(child => child.type === 'text') as any
    expect(textElement.children.map((c: any) => c.type)).toEqual(['text', 'tspan', 'text'])
    expect(textElement.children.map((c: any) => c.text)).toEqual(['A ', '∈', ' B'])

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const presentation = JSON.parse(result.output!)
    const outputText = presentation.slides[0].elements.find((element: any) => element.type === 'text')
    expect(plainText(outputText.content)).toBe('A ∈ B')
  })

  it('decodes a mix of plain characters and NCR in the same text', async () => {
    const svg = wrapSvg(
      '<text x="40" y="220" font-size="20">hello &#x2208; world &#x207F; end</text>',
    )

    const ast = parseSvg(svg)
    const textElement = ast.root.children.find(child => child.type === 'text') as any
    expect(textElement.text).toBe('hello ∈ world ⁿ end')
    expect(textElement.text).not.toMatch(/&#/)
  })

  it('passes NCR-decoded content to text measurer without crashing', async () => {
    // Exercise the same path as the conversion pipeline: ensure renderSvgToPng
    // / measureTextBBox receive already-decoded Unicode characters and escape
    // any literal '&' introduced by decoding without blowing up.
    const svg = wrapSvg(
      '<text x="40" y="240" font-size="24">A&amp;&#x2208;B &#x207F; C&amp;D</text>',
    )

    const ast = parseSvg(svg)
    const textElement = ast.root.children.find(child => child.type === 'text') as any
    // &amp; → &, NCR → real chars: literal '&' and Unicode must coexist
    expect(textElement.text).toBe('A&∈B ⁿ C&D')

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const presentation = JSON.parse(result.output!)
    const outputText = presentation.slides[0].elements.find((element: any) => element.type === 'text')
    // `&amp;` is decoded to `&`, then re-escaped to `&amp;` in the HTML output.
    // NCR-decoded chars (∈, ⁿ) pass through as-is.
    expect(outputText.content).toContain('A&amp;∈B ⁿ C&amp;D')
    expect(outputText.content).not.toMatch(/&#/)
  })
})