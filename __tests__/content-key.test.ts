import { describe, it, expect } from 'vitest'
import { getContentKeyFor, CONTENT_KEY_VALUES } from '../src/utils/content-key'

describe('cover 静态映射 (CK-01 ~ CK-03)', () => {
  it('cover-title-carrier → cover_title', () => {
    expect(getContentKeyFor('cover-title-carrier')).toBe('cover_title')
  })
  it('cover-subtitle-carrier → cover_subtitle', () => {
    expect(getContentKeyFor('cover-subtitle-carrier')).toBe('cover_subtitle')
  })
  it('cover-author-carrier → cover_author', () => {
    expect(getContentKeyFor('cover-author-carrier')).toBe('cover_author')
  })
})

describe('chapter 静态映射 (CK-04 ~ CK-06)', () => {
  it('chapter-number-carrier → chapter_number', () => {
    expect(getContentKeyFor('chapter-number-carrier')).toBe('chapter_number')
  })
  it('chapter-title-carrier → chapter_title', () => {
    expect(getContentKeyFor('chapter-title-carrier')).toBe('chapter_title')
  })
  it('chapter-desc-carrier → chapter_desc', () => {
    expect(getContentKeyFor('chapter-desc-carrier')).toBe('chapter_desc')
  })
})

describe('content 静态映射 (CK-07 ~ CK-08)', () => {
  it('content-title-carrier → content_title', () => {
    expect(getContentKeyFor('content-title-carrier')).toBe('content_title')
  })
  it('content-subtitle-carrier → content_subtitle', () => {
    expect(getContentKeyFor('content-subtitle-carrier')).toBe('content_subtitle')
  })
})

describe('closing 静态映射 (CK-09 ~ CK-10)', () => {
  it('closing-thanks-carrier → end_title', () => {
    expect(getContentKeyFor('closing-thanks-carrier')).toBe('end_title')
  })
  it('closing-subtitle-carrier → end_subtitle', () => {
    expect(getContentKeyFor('closing-subtitle-carrier')).toBe('end_subtitle')
  })
})

describe('TOC 动态 N=1..8 映射 (CK-11 ~ CK-13 + note-carrier 隐式扩展)', () => {
  for (let n = 1; n <= 8; n++) {
    it(`toc-item-${n}-number → directory_item_number_${n}`, () => {
      expect(getContentKeyFor(`toc-item-${n}-number`)).toBe(`directory_item_number_${n}`)
    })
    it(`toc-item-${n}-carrier → directory_item_${n}`, () => {
      expect(getContentKeyFor(`toc-item-${n}-carrier`)).toBe(`directory_item_${n}`)
    })
    it(`toc-item-${n}-note-carrier → directory_item_desc_${n}`, () => {
      expect(getContentKeyFor(`toc-item-${n}-note-carrier`)).toBe(`directory_item_desc_${n}`)
    })
  }
})

describe('reverse: 未映射 id 字段省略 (CK-14 / CK-15)', () => {
  it('toc-rail-title returns undefined', () => {
    expect(getContentKeyFor('toc-rail-title')).toBeUndefined()
  })
  it('cover-date-carrier returns undefined', () => {
    expect(getContentKeyFor('cover-date-carrier')).toBeUndefined()
  })
  it('toc-rail-label returns undefined', () => {
    expect(getContentKeyFor('toc-rail-label')).toBeUndefined()
  })
  it('totally-unmapped-id returns undefined', () => {
    expect(getContentKeyFor('totally-unmapped-id')).toBeUndefined()
  })
})

describe('boundary: N 越界 & 非法 N', () => {
  it('toc-item-0-carrier (N=0 下界外) 返回 undefined', () => {
    expect(getContentKeyFor('toc-item-0-carrier')).toBeUndefined()
  })
  it('toc-item-9-carrier (N=9 上界外) 返回 undefined', () => {
    expect(getContentKeyFor('toc-item-9-carrier')).toBeUndefined()
  })
  it('toc-item-1.5-carrier (小数 N) 返回 undefined', () => {
    expect(getContentKeyFor('toc-item-1.5-carrier')).toBeUndefined()
  })
})

describe('CONTENT_KEY_VALUES invariant', () => {
  it('length === 34 (10 静态 + 24 动态)', () => {
    expect(CONTENT_KEY_VALUES.length).toBe(34)
  })
  it('所有 entries 唯一 (new Set === array length)', () => {
    expect(new Set(CONTENT_KEY_VALUES).size).toBe(CONTENT_KEY_VALUES.length)
  })
  it('CONTENT_KEY_VALUES 包含全部静态 contentKey', () => {
    const staticKeys = [
      'cover_title',
      'cover_subtitle',
      'cover_author',
      'chapter_number',
      'chapter_title',
      'chapter_desc',
      'content_title',
      'content_subtitle',
      'end_title',
      'end_subtitle',
    ]
    for (const k of staticKeys) {
      expect(CONTENT_KEY_VALUES).toContain(k)
    }
  })
  it('CONTENT_KEY_VALUES 包含 N=1..8 动态 contentKey', () => {
    for (let n = 1; n <= 8; n++) {
      expect(CONTENT_KEY_VALUES).toContain(`directory_item_number_${n}`)
      expect(CONTENT_KEY_VALUES).toContain(`directory_item_${n}`)
      expect(CONTENT_KEY_VALUES).toContain(`directory_item_desc_${n}`)
    }
  })
})