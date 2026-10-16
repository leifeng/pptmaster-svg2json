/**
 * pageData 聚合 helper (Phase 18 / v1.13)
 *
 * 复用 v1.12 `getContentKeyFor()` 把 PPTElement[] 聚合为 PageData 对象或 undefined。
 * 纯函数 — 无 I/O / 无时间 / 无随机;同一 elements 输入同一输出。
 *
 * 设计要点:
 *   - D-06/D-07: 同 contentKey 多元素 first-wins(取 elements 数组首次)
 *   - D-08: slide.pageData 仅含命中子集字段;未命中字段直接不存在(field omission)
 *   - D-09: 0 命中 → 返回 undefined(整字段省略)
 *   - D-10: directory_item_number_N 不进 pageData 数组,仅推导 directoryItem.index
 *   - D-13: directoryItem.index 是字符串零填充 "01".."04"
 *   - D-14: directoryItem.desc / title 缺失 fallback ""
 *   - D-17: 内部复用 getContentKeyFor() lookup
 */
// Phase 18 / D-11: PageData / PageDataDirectoryItem interfaces live in src/slides.ts (single source of truth).
// This file imports & re-exports them so external consumers of this module keep working.
import type { PPTElement, PPTTextElement, PageData, PageDataDirectoryItem } from '../slides'
import { getContentKeyFor } from './content-key'
export type { PageData, PageDataDirectoryItem }

/**
 * 目录 N 派生正则:匹配 directory_item_N (title) 或 directory_item_desc_N (desc)。
 * 不匹配 directory_item_number_N — number 字段由另一正则单独捕获。
 */
const RE_DIRECTORY_ITEM = /^directory_item_(\d+)$/
const RE_DIRECTORY_ITEM_DESC = /^directory_item_desc_(\d+)$/
const RE_DIRECTORY_ITEM_NUMBER = /^directory_item_number_(\d+)$/

/**
 * 内部数据结构:directory 按 N 累积。每个 entry 含 title / desc / index(暂存 N 派生或 number 元素值)。
 */
interface DirectoryAccumulatorEntry {
  title: string
  desc: string
  index: string | undefined
}

/**
 * 从 PPTElement 取 textContent 字符串(18-02 之前 PPTBaseElement 无 textContent 字段,
 * 类型断言兼容;缺失返回 undefined)。
 */
function getTextContent(element: PPTElement): string | undefined {
  if (element.type !== 'text') {
    return undefined
  }
  // PPTBaseElement.textContent is real since 18-02 (Phase 18 / v1.13 D-02)
  return (element as PPTTextElement).textContent
}

/**
 * buildPageData(elements): 聚合 PPTElement[] → PageData 或 undefined。
 *
 * 算法:
 *   1. 过滤 type === 'text' 的元素(D-02 mirror PD-16 类型守卫)
 *   2. 遍历筛后元素,调 getContentKeyFor(element.id) 拿 contentKey
 *   3. 按 contentKey 分发:
 *      a. 10 静态字段 → 取 textContent 写入 PageData 对应字段(first-wins)
 *      b. directory_item_N → 取 textContent 作为 directory[N].title(first-wins)
 *      c. directory_item_desc_N → 取 textContent 作为 directory[N].desc(first-wins)
 *      d. directory_item_number_N → 仅用作 directory[N].index 推导(first-wins)
 *   4. directory Map 转数组并按 N 升序排,缺失 desc/title fallback ""
 *   5. 0 命中 → undefined(D-09);否则 directory 仅在非空时挂载(D-08)
 *
 * @returns PageData 或 undefined(D-09)
 */
export function buildPageData(elements: PPTElement[]): PageData | undefined {
  // 步骤 1+2:筛 type='text' + 收集内容
  const textElements = elements.filter(
    (el): el is PPTTextElement => el.type === 'text',
  )

  // 步骤 3:按 contentKey 分发
  const staticFields: Partial<PageData> = {}
  const directoryMap = new Map<number, DirectoryAccumulatorEntry>()

  for (const element of textElements) {
    // 优先用 element.contentKey(transformer 注入的语义角色);fallback 到 id lookup
    // (兼容 v1.12 之前没有 contentKey 字段的 PPTTextElement;同时 v1.13 multiline Row 2+ 的 id
    // 是合成的 `${id}-line-${idx}`,不在 contentKey 映射表中,但 contentKey 字段已由 transformer
    // 正确注入 `directory_item_desc_N` — 必须用 element.contentKey 而非 getContentKeyFor(id))
    let contentKey: string | undefined = element.contentKey
    if (contentKey === undefined) {
      contentKey = getContentKeyFor(element.id)
    }
    if (contentKey === undefined) {
      continue
    }
    const text = getTextContent(element)
    if (text === undefined) {
      // 无 textContent 即不参与聚合(防御 18-02 前的中间状态)
      continue
    }

    // 静态字段分支
    switch (contentKey) {
      case 'cover_title':
        if (staticFields.cover_title === undefined) {
          staticFields.cover_title = text
        }
        continue
      case 'cover_subtitle':
        if (staticFields.cover_subtitle === undefined) {
          staticFields.cover_subtitle = text
        }
        continue
      case 'cover_author':
        if (staticFields.cover_author === undefined) {
          staticFields.cover_author = text
        }
        continue
      case 'chapter_number':
        if (staticFields.chapter_number === undefined) {
          staticFields.chapter_number = text
        }
        continue
      case 'chapter_title':
        if (staticFields.chapter_title === undefined) {
          staticFields.chapter_title = text
        }
        continue
      case 'chapter_desc':
        if (staticFields.chapter_desc === undefined) {
          staticFields.chapter_desc = text
        }
        continue
      case 'content_title':
        if (staticFields.content_title === undefined) {
          staticFields.content_title = text
        }
        continue
      case 'content_subtitle':
        if (staticFields.content_subtitle === undefined) {
          staticFields.content_subtitle = text
        }
        continue
      case 'end_title':
        if (staticFields.end_title === undefined) {
          staticFields.end_title = text
        }
        continue
      case 'end_subtitle':
        if (staticFields.end_subtitle === undefined) {
          staticFields.end_subtitle = text
        }
        continue
    }

    // 动态 N 分支(directory_item_N / directory_item_desc_N / directory_item_number_N)
    const titleMatch = RE_DIRECTORY_ITEM.exec(contentKey)
    if (titleMatch !== null) {
      const n = Number.parseInt(titleMatch[1]!, 10)
      const existing = directoryMap.get(n)
      if (existing === undefined) {
        directoryMap.set(n, { title: text, desc: '', index: undefined })
      } else if (existing.title === '') {
        // first-wins 但若首次是空字符串则允许后续覆盖(防御 fixture 空 title)
        existing.title = text
      }
      continue
    }

    const descMatch = RE_DIRECTORY_ITEM_DESC.exec(contentKey)
    if (descMatch !== null) {
      const n = Number.parseInt(descMatch[1]!, 10)
      const existing = directoryMap.get(n)
      if (existing === undefined) {
        directoryMap.set(n, { title: '', desc: text, index: undefined })
      } else if (existing.desc === '') {
        existing.desc = text
      }
      continue
    }

    const numberMatch = RE_DIRECTORY_ITEM_NUMBER.exec(contentKey)
    if (numberMatch !== null) {
      const n = Number.parseInt(numberMatch[1]!, 10)
      const existing = directoryMap.get(n)
      if (existing === undefined) {
        directoryMap.set(n, { title: '', desc: '', index: text })
      } else if (existing.index === undefined) {
        existing.index = text
      }
      continue
    }

    // 未来扩展 contentKey 静默跳过
  }

  // 步骤 4:directory Map 转数组并按 N 升序排
  const sortedN = Array.from(directoryMap.keys()).sort((a, b) => a - b)
  const directory: PageDataDirectoryItem[] = []
  for (const n of sortedN) {
    const entry = directoryMap.get(n)!
    const index =
      entry.index !== undefined && entry.index !== ''
        ? entry.index
        : String(n).padStart(2, '0')
    directory.push({
      index,
      title: entry.title,
      desc: entry.desc,
    })
  }

  // 步骤 5:组装 PageData(D-08 子集发射 / D-09 0 命中守卫)
  const hasStaticFields = Object.keys(staticFields).length > 0
  const hasDirectory = directory.length > 0

  if (!hasStaticFields && !hasDirectory) {
    return undefined
  }

  const pageData: PageData = {}
  // 仅复制已命中字段(D-08 字段子集发射)
  if (staticFields.cover_title !== undefined) {
    pageData.cover_title = staticFields.cover_title
  }
  if (staticFields.cover_subtitle !== undefined) {
    pageData.cover_subtitle = staticFields.cover_subtitle
  }
  if (staticFields.cover_author !== undefined) {
    pageData.cover_author = staticFields.cover_author
  }
  if (staticFields.chapter_number !== undefined) {
    pageData.chapter_number = staticFields.chapter_number
  }
  if (staticFields.chapter_title !== undefined) {
    pageData.chapter_title = staticFields.chapter_title
  }
  if (staticFields.chapter_desc !== undefined) {
    pageData.chapter_desc = staticFields.chapter_desc
  }
  if (staticFields.content_title !== undefined) {
    pageData.content_title = staticFields.content_title
  }
  if (staticFields.content_subtitle !== undefined) {
    pageData.content_subtitle = staticFields.content_subtitle
  }
  if (staticFields.end_title !== undefined) {
    pageData.end_title = staticFields.end_title
  }
  if (staticFields.end_subtitle !== undefined) {
    pageData.end_subtitle = staticFields.end_subtitle
  }
  if (hasDirectory) {
    pageData.directory = directory
  }

  return pageData
}
