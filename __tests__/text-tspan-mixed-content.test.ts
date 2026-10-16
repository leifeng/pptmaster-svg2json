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

  // 回归 toc-tspan-not-splitting.md：
  // <text> 含 leading 内联文字 + dy-tspans 时，preserveOrder 解析器把 leading 文字
  // 包装为 `type:'text'` 子元素；原 extractTspansWithPosition 只过滤 tspan 子元素，
  // 导致 leading 那行被丢弃、整段只产出 1 个 PPTTextElement（且用 tspan 的样式）。
  // 修复后应拆为 2 个独立 PPTTextElement：第 1 行用父 text 样式，第 2 行用 tspan 样式。
  it('splits text+dy-tspan into 2 independent PPTTextElements with correct styles', async () => {
    const svg = wrapSvg(
      '<text x="572" y="185.77" font-size="32" font-weight="bold" fill="#408062">'
      + '{{TOC_ITEM_1_TITLE}}'
      + '<tspan x="572" dy="32.33" font-size="18" font-weight="normal" fill="#6BA389" letter-spacing="2">'
      + '{{TOC_ITEM_1_DESC}}'
      + '</tspan>'
      + '</text>',
    )

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const presentation = JSON.parse(result.output!)
    const textElements = presentation.slides[0].elements.filter((el: any) => el.type === 'text')

    // 必须拆为 2 个独立 text 元素（leading 一行 + tspan 一行）
    expect(textElements.length).toBe(2)

    // 第一行：leading 内联文字，父 text 样式
    const firstLine = textElements[0]
    expect(plainText(firstLine.content)).toBe('{{TOC_ITEM_1_TITLE}}')
    expect(firstLine.defaultFontSize).toBeCloseTo(32 * 0.78125, 5)
    expect(firstLine.defaultColor).toBe('#408062')
    // 父 text 是 bold，所以 leading 行包 <strong>
    expect(firstLine.content).toMatch(/<strong/i)

    // 第二行：tspan 样式
    const secondLine = textElements[1]
    expect(plainText(secondLine.content)).toBe('{{TOC_ITEM_1_DESC}}')
    expect(secondLine.defaultFontSize).toBeCloseTo(18 * 0.78125, 5)
    expect(secondLine.defaultColor).toBe('#408062')
    // tspan 的 fill #6BA389 应出现在 inline span style
    expect(secondLine.content).toContain('#6BA389')

    // 第二行 top 应比第一行大 dy * scaleY
    const dy = 32.33 * 0.78125
    expect(secondLine.top - firstLine.top).toBeCloseTo(dy, 1)
  })
})
