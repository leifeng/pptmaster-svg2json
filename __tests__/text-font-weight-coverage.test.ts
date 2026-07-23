import { describe, it, expect } from 'vitest'
import { convert } from '../src/index'

const svg = (children: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300">${children}</svg>`

async function convertOne(children: string) {
  const r = await convert(svg(children))
  return JSON.parse(r.output!).slides[0].elements[0]
}

describe('text element own font-weight (regression for text-font-weight-loss-rootcause.md)', () => {
  it('preserves font-weight=500 on <text>', async () => {
    const e = await convertOne('<text x="10" y="40" font-weight="500" font-size="24">Medium500</text>')
    expect(e.content).toContain('font-weight: 500')
  })

  it('preserves font-weight=800 on <text>', async () => {
    const e = await convertOne('<text x="10" y="40" font-weight="800" font-size="24">Bold800</text>')
    expect(e.content).toContain('font-weight: 800')
  })

  it('preserves font-weight=900 on <text>', async () => {
    const e = await convertOne('<text x="10" y="40" font-weight="900" font-size="24">Black900</text>')
    expect(e.content).toContain('font-weight: 900')
  })

  it('keeps <strong> wrapper for font-weight=bold', async () => {
    const e = await convertOne('<text x="10" y="40" font-weight="bold" font-size="24">BoldKeyword</text>')
    expect(e.content).toContain('<strong>')
  })

  it('does not emit font-weight for normal/400', async () => {
    const e = await convertOne('<text x="10" y="40" font-weight="normal" font-size="24">Plain</text>')
    expect(e.content).not.toContain('font-weight:')
  })

  it('does not emit <strong> for font-weight=300 (light) but still emits font-weight style', async () => {
    const e = await convertOne('<text x="10" y="40" font-weight="300" font-size="24">Light300</text>')
    // 300 不属于 PPTist strong mark 解析范围（prosemirror-schema-basic 正则 /^(bold(er)?|[5-9]\d{2,})$/），
    // 所以不出 <strong> 包裹。但 inline style font-weight:300 仍要保留以正确渲染 light 字重。
    expect(e.content).not.toContain('<strong>')
    expect(e.content).toContain('font-weight: 300')
  })

  it('emits <em> for font-style=italic on <text>', async () => {
    const e = await convertOne('<text x="10" y="40" font-style="italic" font-size="24">Italic</text>')
    expect(e.content).toContain('<em>')
  })

  it('emits <u> for text-decoration=underline on <text>', async () => {
    const e = await convertOne('<text x="10" y="40" text-decoration="underline" font-size="24">Under</text>')
    expect(e.content).toMatch(/<u[^>]*>/)
  })
})

describe('multiline tspan inherits parent text style', () => {
  it('text font-weight=800 wraps each tspan in <strong>', async () => {
    // 多行文本（tspan 带 x 属性）：text 元素 font-weight="800" 应被内层继承并包 <strong>
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300">
      <text x="10" y="40" font-weight="800" font-size="24">
        <tspan x="10" dy="0">Line1</tspan>
        <tspan x="10" dy="30">Line2</tspan>
      </text>
    </svg>`
    const r = await convert(svg)
    const data = JSON.parse(r.output!)
    // 这里 content 可能为空字符串（因为 text field 没用上；multiline path 会拆成多个 text element）
    const elements = data.slides[0].elements.filter((e: any) => e.type === 'text')
    // 至少 2 个 text element（两个 tspan 行）
    expect(elements.length).toBeGreaterThanOrEqual(2)
    // 每个 line 都应含 <strong>（顶层 strong 包裹）
    elements.forEach((e: any) => {
      expect(e.content).toContain('<strong>')
    })
  })

  it('text font-style=italic wraps each tspan in <em>', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300">
      <text x="10" y="40" font-style="italic" font-size="24">
        <tspan x="10" dy="0">ItLine1</tspan>
        <tspan x="10" dy="30">ItLine2</tspan>
      </text>
    </svg>`
    const r = await convert(svg)
    const data = JSON.parse(r.output!)
    const elements = data.slides[0].elements.filter((e: any) => e.type === 'text')
    elements.forEach((e: any) => {
      expect(e.content).toContain('<em>')
    })
  })
})

describe('no double-nested <strong> wrappers', () => {
  it('does not nest <strong> when text element has both text content and font-weight=800', async () => {
    const e = await convertOne('<text x="10" y="40" font-weight="800" font-size="24">Bold</text>')
    // 单层 <strong> only — 验证没有被嵌套两次
    const matches = e.content.match(/<strong>/g) || []
    expect(matches.length).toBe(1)
  })

  it('does not nest <em> for font-style=italic', async () => {
    const e = await convertOne('<text x="10" y="40" font-style="italic" font-size="24">Italic</text>')
    const matches = e.content.match(/<em>/g) || []
    expect(matches.length).toBe(1)
  })
})
