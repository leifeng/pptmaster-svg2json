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

  // 回归 text-tspan-multi-overlap.md：
  // <text> 含多个内联 tspan（首 tspan 用 x 与父 text 同 x 作为显式起点，无 dy）
  // → 应合并为单个 text 元素，共享 left/top，不重叠。
  // 旧规则 "有 x = 换行" 会把内联 tspan 误判为多行，拆成 2 个 text 元素导致重叠。
  it('merges inline tspans on same line when only first tspan has x matching parent (text-tspan-multi-overlap)', async () => {
    const svg = wrapSvg(
      '<text x="166" y="298" text-anchor="start" font-size="20" fill="#262626">'
      + '<tspan x="166">独立完成 </tspan>'
      + '<tspan font-weight="bold" fill="#0F5DAF">8 项辨认</tspan>'
      + '</text>',
    )

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const presentation = JSON.parse(result.output!)
    const textElements = presentation.slides[0].elements.filter((el: any) => el.type === 'text')

    // 必须合并为单个 text 元素，不产生 -line-N 后缀
    expect(textElements.length).toBe(1)
    expect(textElements[0].id).not.toMatch(/-line-\d+/)

    // 内容包含两段（plain + bold/blue），不丢失任何一段
    const plain = plainText(textElements[0].content)
    expect(plain).toBe('独立完成 8 项辨认')

    // 蓝色 fill 样式被应用到第二个 tspan
    expect(textElements[0].content).toContain('#0F5DAF')

    // 加粗 tspan 应被标记为 <strong> 或带 font-weight: bold
    const hasStrongOrBold = /<strong/i.test(textElements[0].content) || /font-weight:\s*bold/i.test(textElements[0].content)
    expect(hasStrongOrBold).toBe(true)
  })
})
