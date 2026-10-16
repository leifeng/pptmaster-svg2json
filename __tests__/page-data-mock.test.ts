import { describe, it, expect } from 'vitest'
import { convert } from '../src/index'

/**
 * Mock SVG E2E for Phase 18 / v1.13 pageData aggregation (Plan 18-04).
 *
 * 覆盖 fixture 中缺位的边界 case(由 18-03 fixture E2E 钉死的实际行为做镜像):
 *   - N=5..8 动态扩展(D-13 字符串零填充 + PD-E2E-02)
 *   - multiline carrier 拆分 (D-04)
 *   - 0 命中 slide 守卫 (PD-13 / D-09)
 *   - desc first-wins (D-06 one-way)
 *   - desc 缺失 fallback "" (D-14 + Claude's Discretion 第 2 项)
 *   - 静态字段子集发射 (D-08)
 *   - 非 PPTTextElement 类型守卫 (PD-14)
 *   - N=1..4 实际 fixture 范围 (D-19)
 *
 * 18-02 dependency note: `Slide.pageData` 与 `PPTBaseElement.textContent` 由 18-02
 * 注入;本文件用 `(slide as any).pageData` / `(el as any).textContent` 模式预先
 * 写出,运行时需等待 18-02 merge 后由 transform-to-pptel.ts + index.ts 完成
 * `convertOne()` 末尾的 buildPageData() 挂载与每行 textContent 写入。orchestrator
 * 在 18-02 与 18-04 同时合并到 master 之后,本测试才能跑通。
 *
 * mock SVG 模板风格参考 `__tests__/content-key-mock.test.ts`(v1.12 mock SVG
 * 已锁定 17 个 contentKey / 34 entries 的注入层);本计划聚焦 pageData 聚合层 +
 * convert() 全链路断言。
 */

function wrapSvg(content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">${content}</svg>`
}

/**
 * 取 slide 上 pageData 字段(18-02 前 TypeScript 不识别,用 `as any` 兼容)。
 */
function getPageData(slide: any): any {
  return slide?.pageData
}

/**
 * 取 PPTElement 上 textContent 字段(同上)。
 */
function getTextContent(el: any): string | undefined {
  return el?.textContent
}

describe('PD-E2E-02: N=5..8 扩展 — directory 含 N=5..8 全部三要素', () => {
  it('mock SVG 含 N=5..8 完整三要素 — convert() 后 directory 长度 = 4, indexes 零填充 ["05","06","07","08"]', async () => {
    const n5to8 = [5, 6, 7, 8].map(n => `
      <text id="toc-item-${n}-number" x="100" y="${100 + n * 80}" font-size="20">${n}</text>
      <text id="toc-item-${n}-carrier" x="100" y="${120 + n * 80}" font-size="20">title ${n}</text>
      <text id="toc-item-${n}-note-carrier" x="100" y="${140 + n * 80}" font-size="14">desc ${n}</text>
    `).join('')
    const svg = wrapSvg(n5to8)

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const slide: any = result.slide

    const pageData = getPageData(slide)
    expect(pageData).toBeDefined()
    expect(pageData.directory).toBeDefined()
    // N=5..8 → 4 个目录项
    expect(pageData.directory.length).toBe(4)
    // D-13: index 源自 toc-item-N-number 的 textContent(SVG 字面值 "5".."8"),
    //     fallback `String(N).padStart(2, '0')` 仅在 textContent 缺失时触发
    expect(pageData.directory.map((d: any) => d.index).sort()).toEqual(['5', '6', '7', '8'])

    // 每个目录项含 index/title/desc 三字段(D-12)
    for (const item of pageData.directory) {
      expect(item).toHaveProperty('index')
      expect(item).toHaveProperty('title')
      expect(item).toHaveProperty('desc')
    }

    // 校验各 N 的 title/desc 命中正确(D-04 + D-12)— index 源自 SVG 字面值 "5".."8"
    const dirByIndex: Record<string, any> = {}
    for (const item of pageData.directory) {
      dirByIndex[item.index] = item
    }
    expect(dirByIndex['5'].title).toBe('title 5')
    expect(dirByIndex['5'].desc).toBe('desc 5')
    expect(dirByIndex['6'].title).toBe('title 6')
    expect(dirByIndex['6'].desc).toBe('desc 6')
    expect(dirByIndex['7'].title).toBe('title 7')
    expect(dirByIndex['7'].desc).toBe('desc 7')
    expect(dirByIndex['8'].title).toBe('title 8')
    expect(dirByIndex['8'].desc).toBe('desc 8')
  })
})

describe('D-04 + multiline carrier 拆分 → dir.title / dir.desc', () => {
  it('toc-item-1-carrier multiline (leading inline + 1 tspan[dy]) → title=leading, desc=tspan', async () => {
    // 单行 SVG (无 XML 缩进) — D-05 锁定占位符 / 换行原样保留,缩进空白也会被保留;
    // 测试用单行形式确保 textContent 干净,避免与 D-05 行为混淆
    const svg = wrapSvg(`<text id="toc-item-1-number" x="100" y="100" font-size="20">01</text><text id="toc-item-1-carrier" x="100" y="140" font-size="20">leading inline text<tspan x="100" dy="22">desc via dy tspan</tspan></text>`)

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const slide: any = result.slide

    const pageData = getPageData(slide)
    expect(pageData).toBeDefined()
    expect(pageData.directory).toBeDefined()
    expect(pageData.directory.length).toBe(1)
    expect(pageData.directory[0].index).toBe('01')

    // D-04 multiline 拆分:Row 1 = leading inline,Row 2 = tspan[dy]
    expect(pageData.directory[0].title).toBe('leading inline text')
    expect(pageData.directory[0].desc).toBe('desc via dy tspan')
  })
})

describe('PD-13: 0 命中 slide → slide.pageData undefined (mock SVG 全链路)', () => {
  it('mock SVG 含未映射 id 时 — convert() 后 slide.pageData === undefined + 所有 elements textContent === undefined', async () => {
    const svg = wrapSvg(`
      <text id="random-unmapped-id" x="100" y="100" font-size="20">NoKey</text>
      <text id="another-unmapped" x="100" y="140" font-size="20">NoKey2</text>
    `)

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const slide: any = result.slide

    // D-09 / PD-13:0 命中 → 整字段省略(不是 null / {} / 占位)
    expect(getPageData(slide)).toBeUndefined()

    // D-01 互锁:无 contentKey 命中 → textContent 也不写
    const elements: any[] = slide.elements
    expect(elements.length).toBeGreaterThanOrEqual(2)
    for (const el of elements) {
      expect(getTextContent(el)).toBeUndefined()
    }
  })
})

describe('D-06 one-way: desc first-wins (同 N 多 desc via multiline)', () => {
  it('multiline carrier 含 2 个 tspan[dy] —— dir[0].desc === first desc (elements 数组首次出现 first-wins)', async () => {
    // 用 multiline 路径产生 2 个相同 contentKey `directory_item_desc_1` 的 element:
    //   Row 1 (leading inline) → directory_item_1 → title
    //   Row 2 (first tspan)  → directory_item_desc_1 → desc (first wins)
    //   Row 3 (second tspan) → directory_item_desc_1 → desc (丢弃)
    // 单行 SVG — D-05 保留空白,缩进会导致 textContent 含 \n 与空格
    const svg = wrapSvg(`<text id="toc-item-1-number" x="100" y="100" font-size="20">01</text><text id="toc-item-1-carrier" x="100" y="140" font-size="20">title 1<tspan x="100" dy="22">first desc</tspan><tspan x="100" dy="22">second desc</tspan></text>`)

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const slide: any = result.slide

    const pageData = getPageData(slide)
    expect(pageData).toBeDefined()
    expect(pageData.directory.length).toBe(1)
    // D-06 one-way: 仅保留 elements 数组首次出现的 desc
    expect(pageData.directory[0].desc).toBe('first desc')
    expect(pageData.directory[0].title).toBe('title 1')
    expect(pageData.directory[0].index).toBe('01')
  })
})

describe('D-14 + Claude Discretion: desc 必填 — 缺失 fallback 空串', () => {
  it('mock SVG 仅 title (toc-item-1-number + toc-item-1-carrier),缺 desc → dir[0].desc === ""', async () => {
    const svg = wrapSvg(`
      <text id="toc-item-1-number" x="100" y="100" font-size="20">01</text>
      <text id="toc-item-1-carrier" x="100" y="140" font-size="20">title only</text>
    `)

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const slide: any = result.slide

    const pageData = getPageData(slide)
    expect(pageData).toBeDefined()
    expect(pageData.directory.length).toBe(1)
    // D-14 必填 string — 缺失 desc fallback ""(Claude's Discretion 第 2 项拍板)
    expect(pageData.directory[0].desc).toBe('')
    expect(pageData.directory[0].title).toBe('title only')
    expect(pageData.directory[0].index).toBe('01')
  })
})

describe('D-08: 静态字段子集发射 (仅命中 cover_subset 0)', () => {
  it('mock SVG 仅 1 个 cover-title-carrier — pageData 仅含 cover_title 单字段', async () => {
    // D-05 占位符原样保留
    const svg = wrapSvg(`
      <text id="cover-title-carrier" x="100" y="100" font-size="32">{{TITLE}}</text>
    `)

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const slide: any = result.slide

    const pageData = getPageData(slide)
    expect(pageData).toBeDefined()
    // D-08 子集发射:pageData 仅含命中字段
    expect(pageData.cover_title).toBe('{{TITLE}}')

    // 严格字段子集(无其它 9 静态字段 + 无 directory)
    expect(Object.keys(pageData).sort()).toEqual(['cover_title'])
  })
})

describe('PD-14 类型守卫: 非 PPTTextElement id 命中 contentKey 不进 pageData', () => {
  it('cover-title-carrier id 但元素是 <rect> — pageData === undefined + rect 不带 contentKey/textContent', async () => {
    const svg = wrapSvg(`
      <rect id="cover-title-carrier" x="100" y="100" width="200" height="40" fill="#000"/>
    `)

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const slide: any = result.slide

    // PD-14:非 PPTTextElement 即使 id 命中 contentKey 也不进 pageData
    expect(getPageData(slide)).toBeUndefined()

    // 该 rect 不带 contentKey(CK-16 镜像)
    const elements: any[] = slide.elements
    const rect = elements.find((e: any) => e.id === 'cover-title-carrier')
    expect(rect).toBeDefined()
    expect(rect.type).toBe('shape')
    expect(rect.contentKey).toBeUndefined()
    expect(getTextContent(rect)).toBeUndefined()
  })
})

describe('D-19: N=1..4 实际范围 — fixture 命中子集 (mock 钉死 D-13 边界)', () => {
  it('mock SVG 仅含 N=1..2 — dir 长度 = 2, indexes ["01","02"]', async () => {
    // D-19:fixture 实际 N=1..4 命中;本测试钉死 N=1..2 子集确认 N 升序与零填充
    const svg = wrapSvg(`
      <text id="toc-item-1-number" x="100" y="100" font-size="20">01</text>
      <text id="toc-item-1-carrier" x="100" y="140" font-size="20">item 1</text>
      <text id="toc-item-1-note-carrier" x="100" y="180" font-size="14">desc 1</text>
      <text id="toc-item-2-number" x="100" y="220" font-size="20">02</text>
      <text id="toc-item-2-carrier" x="100" y="260" font-size="20">item 2</text>
      <text id="toc-item-2-note-carrier" x="100" y="300" font-size="14">desc 2</text>
    `)

    const result = await convert(svg)
    expect(result.success).toBe(true)
    const slide: any = result.slide

    const pageData = getPageData(slide)
    expect(pageData).toBeDefined()
    expect(pageData.directory.length).toBe(2)
    // D-13 字符串零填充 — N=1 → "01",N=2 → "02"
    expect(pageData.directory.map((d: any) => d.index).sort()).toEqual(['01', '02'])

    // 验证各 N 字段
    const dirByIndex: Record<string, any> = {}
    for (const item of pageData.directory) {
      dirByIndex[item.index] = item
    }
    expect(dirByIndex['01']).toEqual({ index: '01', title: 'item 1', desc: 'desc 1' })
    expect(dirByIndex['02']).toEqual({ index: '02', title: 'item 2', desc: 'desc 2' })
  })
})
