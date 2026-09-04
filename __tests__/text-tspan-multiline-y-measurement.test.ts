import { describe, expect, it } from 'vitest'
import { convert } from '../src/index'

// 回归 tspan-dy-multiline-y-too-large.md：
// <text xml:space="preserve"> 跨多行书写时，SVG 解析器把 <text> 与首/末 <tspan> 之间的
// 缩进空白作为独立 AST text 节点保留，extractPlainText 拼到 content 前后，
// 触发 buildMeasurementSvg 的 multi-line 分支（dy="1em"），bbox.y 漂移 fontSize，
// 使 measuredAscent = fontSize - bbox.y 变负，textTop 多加 fontSize * scaleY。
// 修复在 measureTextElement 调用前对 measurement content 做首尾 trim。

const SCALE_Y = 0.78125 // 562.5 / 720
const FONT_SIZE = 84.67
const SVG_Y = 185.4
const EXPECTED_FIRST_TOP = 95.49 // ≈ SVG_Y*scaleY - (FONT_SIZE - 21.498)*scaleY
const EXPECTED_LINE_SPACING = 88.9 * SCALE_Y // dy * scaleY

function findFirstTextElement(presentation: any): any {
  const elements = presentation.slides[0].elements.filter((el: any) => el.type === 'text')
  if (elements.length === 0) throw new Error('expected at least one text element')
  return elements[0]
}

function findTextElements(presentation: any): any[] {
  return presentation.slides[0].elements.filter((el: any) => el.type === 'text')
}

const wrapSvg = (content: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">${content}</svg>`

describe('tspan dy multiline y measurement (regression: tspan-dy-multiline-y-too-large)', () => {
  it('trims SVG indent noise so multi-line tspan stack has correct first top', async () => {
    // 真实 02_mulu.svg 写法：<text> 与首/末 <tspan> 之间有换行 + 6 空格缩进
    const svg = wrapSvg(
      '<text x="232.34" y="185.4" text-anchor="middle" xml:space="preserve" '
      + 'font-family="\'思源黑体\',\'Microsoft YaHei\',Arial,sans-serif" '
      + 'font-size="84.67" fill="#F4F6FF">\n'
      + '      <tspan fill="#F4F6FF" font-size="84.67">C</tspan>'
      + '<tspan x="232.34" dy="88.9" fill="#F4F6FF" font-size="84.67">O</tspan>'
      + '<tspan x="232.34" dy="88.9" fill="#F4F6FF" font-size="84.67">N</tspan>'
      + '<tspan x="232.34" dy="88.9" fill="#F4F6FF" font-size="84.67">T</tspan>'
      + '<tspan x="232.34" dy="88.9" fill="#F4F6FF" font-size="84.67">E</tspan>'
      + '<tspan x="232.34" dy="88.9" fill="#F4F6FF" font-size="84.67">N</tspan>'
      + '<tspan x="232.34" dy="88.9" fill="#F4F6FF" font-size="84.67">T</tspan>\n'
      + '    </text>',
    )

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const presentation = JSON.parse(result.output!)
    const textElements = findTextElements(presentation)

    // 7 行 CONTENT 应该拆为 7 个 text 元素
    expect(textElements.length).toBe(7)

    const firstTop = textElements[0].top
    // 修复前首行 top ≈ 161.64（漂移 +66.15 = fontSize*scaleY）
    // 修复后首行 top ≈ 95.49（trim 剥掉 SVG 缩进噪声）
    expect(firstTop).toBeCloseTo(EXPECTED_FIRST_TOP, 1)
    expect(firstTop).toBeLessThan(130) // 修复前 ≈ 161.64 不应通过

    // 行间距必须精确等于 SVG dy * scaleY
    for (let i = 1; i < textElements.length; i++) {
      const spacing = textElements[i].top - textElements[i - 1].top
      expect(spacing).toBeCloseTo(EXPECTED_LINE_SPACING, 5)
    }
  })

  it('does not affect measurement when content has no leading/trailing indent noise', async () => {
    // 同一 SVG 但无 XML 缩进噪声：trim 应该是 no-op，first top 应与有缩进路径一致
    const svg = wrapSvg(
      '<text x="232.34" y="185.4" text-anchor="middle" xml:space="preserve" '
      + 'font-family="\'思源黑体\',\'Microsoft YaHei\',Arial,sans-serif" '
      + 'font-size="84.67" fill="#F4F6FF">'
      + '<tspan fill="#F4F6FF" font-size="84.67">C</tspan>'
      + '<tspan x="232.34" dy="88.9" fill="#F4F6FF" font-size="84.67">O</tspan>'
      + '<tspan x="232.34" dy="88.9" fill="#F4F6FF" font-size="84.67">N</tspan>'
      + '<tspan x="232.34" dy="88.9" fill="#F4F6FF" font-size="84.67">T</tspan>'
      + '<tspan x="232.34" dy="88.9" fill="#F4F6FF" font-size="84.67">E</tspan>'
      + '<tspan x="232.34" dy="88.9" fill="#F4F6FF" font-size="84.67">N</tspan>'
      + '<tspan x="232.34" dy="88.9" fill="#F4F6FF" font-size="84.67">T</tspan>'
      + '</text>',
    )

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const presentation = JSON.parse(result.output!)
    const textElements = findTextElements(presentation)

    expect(textElements.length).toBe(7)
    const firstTop = textElements[0].top
    // 无缩进路径下 measurement content 自身无 \n，无 multi-line 分支触发，
    // firstTop 应与有缩进路径一致（trim 是 no-op）
    expect(firstTop).toBeCloseTo(EXPECTED_FIRST_TOP, 1)
    expect(firstTop).toBeLessThan(130)
  })
})
