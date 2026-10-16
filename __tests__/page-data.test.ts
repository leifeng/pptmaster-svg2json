import { describe, it, expect } from 'vitest'
import { buildPageData } from '../src/utils/page-data'
import type { PPTElement, PPTTextElement } from '../src/slides'

/**
 * helper 工厂:构造 mock PPTTextElement 含 textContent + contentKey。
 * 用 `as any` 强制为带 textContent 字段的类型(18-02 之前类型不识别此字段)。
 */
function makeTextEl(
  id: string,
  textContent: string | undefined,
  // 第三个参数仅用于 documentation: 期望映射的 contentKey(非真实运行时使用)
  _expectedContentKey: string | undefined = undefined,
): PPTTextElement {
  // 通过 getContentKeyFor 间接派生 — 真实 contentKey 由 id 命中映射表决定
  void _expectedContentKey
  return {
    type: 'text',
    id,
    // @ts-expect-error - textContent field added in 18-02 on PPTBaseElement
    textContent,
    // 其余必填字段填占位
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    rotate: 0,
    content: '',
    defaultFontName: '',
    defaultColor: '',
  } as unknown as PPTTextElement
}

/**
 * helper:构造非 text 类型元素(用于类型守卫反向断言)。
 */
function makeNonTextEl(id: string): PPTElement {
  return {
    type: 'image',
    id,
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    rotate: 0,
    src: '',
  } as unknown as PPTElement
}

describe('PD-01..PD-03 + PD-06..PD-12: 静态字段聚合', () => {
  it('单 cover_title 字段聚合 (占位符原样保留 D-05)', () => {
    const result = buildPageData([
      makeTextEl('cover-title-carrier', 'Hello {{TITLE}}', 'cover_title'),
    ])
    expect(result).toBeDefined()
    expect(result!.cover_title).toBe('Hello {{TITLE}}')
  })

  it('10 静态字段全部命中', () => {
    const elements: PPTTextElement[] = [
      makeTextEl('cover-title-carrier', 'A1', 'cover_title'),
      makeTextEl('cover-subtitle-carrier', 'A2', 'cover_subtitle'),
      makeTextEl('cover-author-carrier', 'A3', 'cover_author'),
      makeTextEl('chapter-number-carrier', 'B1', 'chapter_number'),
      makeTextEl('chapter-title-carrier', 'B2', 'chapter_title'),
      makeTextEl('chapter-desc-carrier', 'B3', 'chapter_desc'),
      makeTextEl('content-title-carrier', 'C1', 'content_title'),
      makeTextEl('content-subtitle-carrier', 'C2', 'content_subtitle'),
      makeTextEl('closing-thanks-carrier', 'D1', 'end_title'),
      makeTextEl('closing-subtitle-carrier', 'D2', 'end_subtitle'),
    ]
    const result = buildPageData(elements)!
    expect(Object.keys(result).filter((k) => k !== 'directory').sort()).toEqual([
      'chapter_desc',
      'chapter_number',
      'chapter_title',
      'content_subtitle',
      'content_title',
      'cover_author',
      'cover_subtitle',
      'cover_title',
      'end_subtitle',
      'end_title',
    ])
    expect(result.cover_title).toBe('A1')
    expect(result.cover_subtitle).toBe('A2')
    expect(result.cover_author).toBe('A3')
    expect(result.chapter_number).toBe('B1')
    expect(result.chapter_title).toBe('B2')
    expect(result.chapter_desc).toBe('B3')
    expect(result.content_title).toBe('C1')
    expect(result.content_subtitle).toBe('C2')
    expect(result.end_title).toBe('D1')
    expect(result.end_subtitle).toBe('D2')
  })
})

describe('PD-04 + PD-05: TOC 目录聚合 (directory 数组)', () => {
  it('N=1..4 完整三要素(number + title + desc)', () => {
    const elements: PPTTextElement[] = []
    for (let n = 1; n <= 4; n++) {
      elements.push(
        makeTextEl(`toc-item-${n}-number`, String(n).padStart(2, '0'), `directory_item_number_${n}`),
        makeTextEl(`toc-item-${n}-carrier`, `title-${n}`, `directory_item_${n}`),
        makeTextEl(`toc-item-${n}-note-carrier`, `desc-${n}`, `directory_item_desc_${n}`),
      )
    }
    const result = buildPageData(elements)!
    expect(result.directory).toBeDefined()
    expect(result.directory!.length).toBe(4)
    expect(result.directory![0]).toEqual({
      index: '01',
      title: 'title-1',
      desc: 'desc-1',
    })
    expect(result.directory![1]).toEqual({
      index: '02',
      title: 'title-2',
      desc: 'desc-2',
    })
    expect(result.directory![2]).toEqual({
      index: '03',
      title: 'title-3',
      desc: 'desc-3',
    })
    expect(result.directory![3]).toEqual({
      index: '04',
      title: 'title-4',
      desc: 'desc-4',
    })
  })

  it('directory 数组按 N 升序排 (输入顺序 N=3,1,4,2)', () => {
    const order = [3, 1, 4, 2]
    const elements: PPTTextElement[] = []
    for (const n of order) {
      elements.push(
        makeTextEl(`toc-item-${n}-number`, String(n).padStart(2, '0'), `directory_item_number_${n}`),
        makeTextEl(`toc-item-${n}-carrier`, `title-${n}`, `directory_item_${n}`),
        makeTextEl(`toc-item-${n}-note-carrier`, `desc-${n}`, `directory_item_desc_${n}`),
      )
    }
    const result = buildPageData(elements)!
    expect(result.directory!.map((d) => d.index)).toEqual(['01', '02', '03', '04'])
  })
})

describe('PD-13: 0 命中 / 无 contentKey 元素', () => {
  it('buildPageData([]) 返回 undefined', () => {
    expect(buildPageData([])).toBeUndefined()
  })

  it('buildPageData([非 text 元素]) 返回 undefined', () => {
    expect(buildPageData([makeNonTextEl('cover-title-carrier')])).toBeUndefined()
  })

  it('buildPageData([无 contentKey 元素]) 返回 undefined (D-09)', () => {
    expect(
      buildPageData([makeTextEl('cover-date-carrier', 'foo', undefined)]),
    ).toBeUndefined()
  })

  it('buildPageData([contentKey 命中但 textContent undefined]) 返回 undefined', () => {
    expect(
      buildPageData([makeTextEl('cover-title-carrier', undefined, 'cover_title')]),
    ).toBeUndefined()
  })
})

describe('D-06: first-wins (同 N 多 desc)', () => {
  it('同 N=1 含 2 个 directory_item_desc_1 → first-wins', () => {
    const elements: PPTTextElement[] = [
      makeTextEl('toc-item-1-number', '01', 'directory_item_number_1'),
      makeTextEl('toc-item-1-carrier', 'title-A', 'directory_item_1'),
      makeTextEl('toc-item-1-note-carrier', 'FIRST-desc', 'directory_item_desc_1'),
      makeTextEl('toc-item-1-note-carrier', 'SECOND-desc', 'directory_item_desc_1'),
    ]
    const result = buildPageData(elements)!
    expect(result.directory![0]!.desc).toBe('FIRST-desc')
    expect(result.directory![0]!.title).toBe('title-A')
    expect(result.directory![0]!.index).toBe('01')
  })
})

describe('D-07: first-wins (同 N 多 title)', () => {
  it('同 N=1 含 2 个 directory_item_1 → first-wins', () => {
    const elements: PPTTextElement[] = [
      makeTextEl('toc-item-1-number', '01', 'directory_item_number_1'),
      makeTextEl('toc-item-1-carrier', 'FIRST-title', 'directory_item_1'),
      makeTextEl('toc-item-1-carrier', 'SECOND-title', 'directory_item_1'),
      makeTextEl('toc-item-1-note-carrier', 'desc', 'directory_item_desc_1'),
    ]
    const result = buildPageData(elements)!
    expect(result.directory![0]!.title).toBe('FIRST-title')
    expect(result.directory![0]!.desc).toBe('desc')
  })
})

describe('D-08: 字段子集发射 / omission', () => {
  it('仅命中 cover_title → result 仅含 cover_title', () => {
    const result = buildPageData([
      makeTextEl('cover-title-carrier', 'Only One', 'cover_title'),
    ])
    expect(Object.keys(result!).sort()).toEqual(['cover_title'])
    expect(result!.cover_title).toBe('Only One')
  })

  it('静态字段命中但无 directory → directory 字段不存在', () => {
    const result = buildPageData([
      makeTextEl('cover-title-carrier', 'X', 'cover_title'),
    ])
    expect(result!.directory).toBeUndefined()
  })
})

describe('D-10 / D-13: index 派生 & number 字段不进 pageData', () => {
  it('不提供 directory_item_number_N → index fallback String(N).padStart', () => {
    const elements: PPTTextElement[] = [
      makeTextEl('toc-item-1-carrier', 'title-1', 'directory_item_1'),
      makeTextEl('toc-item-1-note-carrier', 'desc-1', 'directory_item_desc_1'),
    ]
    const result = buildPageData(elements)!
    expect(result.directory![0]!.index).toBe('01')
  })

  it('提供 number N=2 含 textContent "02" → index === "02"', () => {
    const elements: PPTTextElement[] = [
      makeTextEl('toc-item-2-number', '02', 'directory_item_number_2'),
      makeTextEl('toc-item-2-carrier', 'title-2', 'directory_item_2'),
      makeTextEl('toc-item-2-note-carrier', 'desc-2', 'directory_item_desc_2'),
    ]
    const result = buildPageData(elements)!
    expect(result.directory![0]!.index).toBe('02')
  })

  it('directoryItem 不含 number 字段 (仅 index/title/desc)', () => {
    const elements: PPTTextElement[] = [
      makeTextEl('toc-item-1-number', '01', 'directory_item_number_1'),
      makeTextEl('toc-item-1-carrier', 'title-1', 'directory_item_1'),
      makeTextEl('toc-item-1-note-carrier', 'desc-1', 'directory_item_desc_1'),
    ]
    const result = buildPageData(elements)!
    const item = result.directory![0]!
    expect(Object.keys(item).sort()).toEqual(['desc', 'index', 'title'])
  })
})

describe('D-14 + Claude Discretion: desc 必填 fallback 空串', () => {
  it('仅命中 title → desc === ""', () => {
    const elements: PPTTextElement[] = [
      makeTextEl('toc-item-1-carrier', 'only-title', 'directory_item_1'),
    ]
    const result = buildPageData(elements)!
    expect(result.directory![0]!.desc).toBe('')
    expect(result.directory![0]!.title).toBe('only-title')
    expect(result.directory![0]!.index).toBe('01')
  })

  it('仅命中 desc → title === ""', () => {
    const elements: PPTTextElement[] = [
      makeTextEl('toc-item-1-note-carrier', 'only-desc', 'directory_item_desc_1'),
    ]
    const result = buildPageData(elements)!
    expect(result.directory![0]!.title).toBe('')
    expect(result.directory![0]!.desc).toBe('only-desc')
  })
})

describe('mixed: 静态 + 目录混合', () => {
  it('同时命中 cover_title + N=1 目录条目', () => {
    const elements: PPTTextElement[] = [
      makeTextEl('cover-title-carrier', 'Mixed Title', 'cover_title'),
      makeTextEl('toc-item-1-carrier', 'Item 1', 'directory_item_1'),
      makeTextEl('toc-item-1-note-carrier', 'Item 1 desc', 'directory_item_desc_1'),
    ]
    const result = buildPageData(elements)!
    expect(result.cover_title).toBe('Mixed Title')
    expect(result.directory!.length).toBe(1)
    expect(result.directory![0]!.title).toBe('Item 1')
    expect(result.directory![0]!.desc).toBe('Item 1 desc')
    expect(result.directory![0]!.index).toBe('01')
  })
})

describe('N 边界: 越界 N (N=9) 不进 pageData', () => {
  it('toc-item-9-carrier 命中进 mapping 但不会聚合到 directory (D-07 fixture 实际仅 1..4)', () => {
    // NOTE: getContentKeyFor 对 N=9 返回 undefined(content-key.ts 已验证),
    // 所以 N=9 元素被分发跳过;此测试确认 buildPageData 对无 contentKey 元素的容错
    const elements: PPTTextElement[] = [
      makeTextEl('toc-item-9-carrier', 'N9-title', undefined),
    ]
    expect(buildPageData(elements)).toBeUndefined()
  })
})
