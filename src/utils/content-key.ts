/**
 * contentKey 映射 helper (Phase 17 / v1.12)
 *
 * 10 静态 Record + 24 动态 (N=1..8 × 3 categories) 预生成映射表,导出:
 *   - `getContentKeyFor(id)`: O(1) lookup;命中返回 contentKey 字符串,未命中返回 undefined
 *   - `CONTENT_KEY_VALUES`: 全部合法 contentKey 值的只读数组(供 E2E 反向白名单断言)
 *
 * 设计要点:
 *   - D-02: 字段类型 `string` + 派生数组(单一来源 — 从 Map.values() 派生,避免双源漂移)
 *   - D-06: 10 条静态 id → contentKey 映射(cover/chapter/content/closing 各类型)
 *   - D-07: TOC 动态 N=1..8 锁定上限,fixture 实际 N=1..4 命中,N>8 静默省略
 *   - D-08: 模块加载时构造 Map,运行时 O(1) lookup,未命中返回 undefined
 *   - note-carrier 隐式扩展:toc-item-{N}-note-carrier → directory_item_desc_{N}
 *     与 carrier-internal tspan[dy] 互斥(fixture 不会两者并存;N∈1..8 共 24 entries)
 */
const STATIC_CONTENT_KEY_MAP: Record<string, string> = {
  // cover (CK-01 ~ CK-03)
  'cover-title-carrier': 'cover_title',
  'cover-subtitle-carrier': 'cover_subtitle',
  'cover-author-carrier': 'cover_author',

  // chapter (CK-04 ~ CK-06)
  'chapter-number-carrier': 'chapter_number',
  'chapter-title-carrier': 'chapter_title',
  'chapter-desc-carrier': 'chapter_desc',

  // content (CK-07 ~ CK-08)
  'content-title-carrier': 'content_title',
  'content-subtitle-carrier': 'content_subtitle',

  // closing (CK-09 ~ CK-10)
  'closing-thanks-carrier': 'end_title',
  'closing-subtitle-carrier': 'end_subtitle',
}

/**
 * D-07 + note-carrier 隐式扩展:为 N=1..8 预生成 3 类条目(number / carrier / note-carrier)。
 * 共 24 条,运行时构造为 [string, string] tuple 数组,后续并入 Map。
 */
const dynamicEntries: Array<[string, string]> = []
for (let n = 1; n <= 8; n++) {
  // CK-11: toc-item-{N}-number → directory_item_number_{N}
  dynamicEntries.push([`toc-item-${n}-number`, `directory_item_number_${n}`])
  // CK-12: toc-item-{N}-carrier 主体 → directory_item_{N}
  dynamicEntries.push([`toc-item-${n}-carrier`, `directory_item_${n}`])
  // note-carrier 隐式扩展(与 carrier-internal tspan[dy] 互斥):→ directory_item_desc_{N}
  dynamicEntries.push([`toc-item-${n}-note-carrier`, `directory_item_desc_${n}`])
}

/**
 * 合并 10 静态 + 24 动态,共 34 entries。ReadonlyMap 类型表达只读语义,无需 runtime freeze。
 */
const CONTENT_KEY_MAP: ReadonlyMap<string, string> = new Map<string, string>([
  ...Object.entries(STATIC_CONTENT_KEY_MAP),
  ...dynamicEntries,
])

/**
 * 按 id 查询 contentKey。命中映射返回字符串,未命中返回 undefined。
 *
 * @param id - SVG 元素的 id 属性(已通过 id 命中映射表才返回)
 * @returns contentKey 字符串或 undefined
 */
export function getContentKeyFor(id: string): string | undefined {
  return CONTENT_KEY_MAP.get(id)
}

/**
 * 全部合法 contentKey 值的只读数组(D-02 单一来源 — 从 Map.values() 派生)。
 * E2E 测试用此数组做反向白名单断言,确认所有 fixture slide 的 contentKey
 * 都是合法集合的子集,无意外值混入。
 *
 * 长度 = 34 (10 静态 + 24 动态);所有 entries 唯一。
 */
export const CONTENT_KEY_VALUES: readonly string[] = Object.freeze(
  Array.from(CONTENT_KEY_MAP.values()),
)