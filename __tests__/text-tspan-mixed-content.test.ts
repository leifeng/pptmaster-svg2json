import { describe, expect, it } from 'vitest'
import { convert, parseSvg } from '../src/index'

const wrapSvg = (content: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">${content}</svg>`

function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

describe('mixed text and tspan content order', () => {
  it('preserves leading inline text before a tspan', async () => {
    const svg = wrapSvg(
      '<text x="80" y="190" font-size="40" font-weight="700" fill="#1A365D">attention <tspan fill="#3182CE">mesh</tspan></text>',
    )

    const ast = parseSvg(svg)
    const textElement = ast.root.children.find(child => child.type === 'text')
    expect(textElement?.children.map(child => child.type)).toEqual(['text', 'tspan'])
    expect(textElement?.children[0].text).toBe('attention ')
    expect(textElement?.children[1].text).toBe('mesh')

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const presentation = JSON.parse(result.output!)
    const outputText = presentation.slides[0].elements.find((element: any) => element.type === 'text')

    expect(plainText(outputText.content)).toBe('attention mesh')
    expect(outputText.content.indexOf('attention ')).toBeLessThan(outputText.content.indexOf('mesh'))
    expect(outputText.content).toContain('color: #3182CE')
  })

  it('preserves text before and after a tspan with authored spaces', async () => {
    const svg = wrapSvg(
      '<text x="10" y="40" font-size="24">before <tspan fill="#C53030">middle</tspan> after</text>',
    )

    const ast = parseSvg(svg)
    const textElement = ast.root.children.find(child => child.type === 'text')
    expect(textElement?.children.map(child => child.type)).toEqual(['text', 'tspan', 'text'])
    expect(textElement?.children.map(child => child.text)).toEqual(['before ', 'middle', ' after'])

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const presentation = JSON.parse(result.output!)
    const outputText = presentation.slides[0].elements.find((element: any) => element.type === 'text')

    expect(plainText(outputText.content)).toBe('before middle after')
  })
})
