import { describe, it, expect } from 'vitest'
import { normalizeFontFamily } from './font-preprocessor'

describe('normalizeFontFamily', () => {
  it('替换 font-family 属性（双引号）', () => {
    const svg = '<text font-family="Arial">Hello</text>'
    const result = normalizeFontFamily(svg)
    expect(result).toContain('font-family="Source Han Sans CN Regular"')
    expect(result).not.toContain('Arial')
  })

  it('替换 font-family 属性（单引号）', () => {
    const svg = "<text font-family='Helvetica'>Hello</text>"
    const result = normalizeFontFamily(svg)
    expect(result).toContain('font-family="Source Han Sans CN Regular"')
  })

  it('替换 font 属性中的 family', () => {
    const svg = '<text font="12px/1.5 Arial">Hello</text>'
    const result = normalizeFontFamily(svg)
    expect(result).toContain('Source Han Sans CN Regular')
    expect(result).not.toContain('Arial')
  })

  it('替换 font 属性中的 family（带引号）', () => {
    const svg = '<text font="12px/1.5 "Arial"">Hello</text>'
    const result = normalizeFontFamily(svg)
    expect(result).toContain('Source Han Sans CN Regular')
  })

  it('替换 <style> 中的 font-family CSS 声明', () => {
    const svg = `<style>.text { font-family: Arial; }</style><text class="text">Hello</text>`
    const result = normalizeFontFamily(svg)
    expect(result).toContain('font-family: Source Han Sans CN Regular;')
    expect(result).not.toContain('Arial')
  })

  it('不影响非字体属性', () => {
    const svg = '<text font-size="14" fill="#000">Hello</text>'
    const result = normalizeFontFamily(svg)
    expect(result).toContain('font-size="14"')
    expect(result).toContain('fill="#000"')
  })

  it('处理嵌套的 <tspan> 元素', () => {
    const svg = '<text><tspan font-family="Arial">Inner</tspan></text>'
    const result = normalizeFontFamily(svg)
    expect(result).toContain('Source Han Sans CN Regular')
    expect(result).not.toContain('Arial')
  })

  it('处理 font-size 而不改变字体大小', () => {
    const svg = '<text font="12px Arial">Hello</text>'
    const result = normalizeFontFamily(svg)
    expect(result).toContain('12px')
    expect(result).toContain('Source Han Sans CN Regular')
  })

  it('处理 font-weight', () => {
    const svg = '<text font-family="Arial" font-weight="bold">Hello</text>'
    const result = normalizeFontFamily(svg)
    expect(result).toContain('font-weight="bold"')
    expect(result).toContain('Source Han Sans CN Regular')
  })

  it('处理 <style> 中的 font shorthand', () => {
    const svg = `<style>body { font: 12px/1.5 Arial; }</style>`
    const result = normalizeFontFamily(svg)
    expect(result).toContain('Source Han Sans CN Regular')
    expect(result).not.toContain('Arial')
  })

  it('处理 <style> 中的 font 其他属性', () => {
    const svg = `<style>body { font-style: italic; font-weight: bold; }</style>`
    const result = normalizeFontFamily(svg)
    expect(result).toContain('font-style: italic')
    expect(result).toContain('font-weight: bold')
  })

  it('替换空的 font-family', () => {
    const svg = '<text font-family="">Hello</text>'
    const result = normalizeFontFamily(svg)
    expect(result).toContain('Source Han Sans CN Regular')
  })

  it('处理 font 属性没有 font-family 的情况', () => {
    const svg = '<text font="12px">Hello</text>'
    const result = normalizeFontFamily(svg)
    expect(result).toContain('Source Han Sans CN Regular')
    expect(result).toContain('12px')
  })

  it('保留原有 font-size 值', () => {
    const svg = '<text font-family="Arial" font-size="24pt">Hello</text>'
    const result = normalizeFontFamily(svg)
    expect(result).toContain('font-size="24pt"')
    expect(result).toContain('Source Han Sans CN Regular')
  })
})
