/**
 * Plan 14-01 — id injection policy tests.
 *
 * Verifies the D-05~09 id priority chain in the transformer pipeline:
 *
 *   D-05: child has its own SVG `id` attribute -> preserved verbatim on PPTElement.id
 *   D-06: child has no id, but is inside <g id="X"> -> PPTElement.id == "X__<uuidv4().substring(0, 5)>"
 *   D-07: child has no id and is not inside any <g> -> PPTElement.id is `uuidv4().substring(0, 10)`
 *   D-08: path-merged groups yield one PPTShapeElement with id `<group_id>__<uuidv4().substring(0, 5)>`
 *          (via createMergedShapeElement's new `fallbackId?` param)
 *   D-09: walk() maintains idRegistry and firstChildIdByGroup in the outer scope;
 *          firstChildIdByGroup is populated UNCONDITIONALLY for the first child
 *          under a group (id-less children included) so path-merge always carries
 *          a meaningful fallbackId.
 *
 * We exercise the public `convert()` entry point — it calls transformToPPTElement
 * which runs walk() which now does the id injection. We then inspect result.slide.elements.
 */

import { describe, it, expect } from 'vitest'
import { convert } from './index'

const UUID_SUFFIX_5_RE = /^[0-9a-f]{5}$/
const UUID_SUFFIX_10_RE = /^[0-9a-f]{8}-[0-9a-f]$/

async function convertOne(svg: string) {
  const result = await convert(svg)
  if (!result.success || !result.slide) {
    throw new Error(`convert failed: ${result.error ?? 'no slide'}`)
  }
  return result.slide
}

describe('Plan 14-01 — id injection policy (D-05~09)', () => {
  it('D-05: child element with its own SVG id is preserved verbatim', async () => {
    const slide = await convertOne(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 562.5" width="1000" height="562.5">
  <text id="my-text" x="10" y="20">hello</text>
</svg>
`)
    expect(slide.elements.length).toBe(1)
    expect(slide.elements[0].id).toBe('my-text')
  })

  it('D-06: id-less child inside <g id="card-temp"> yields groupId__uuidv4().substring(0, 5)', async () => {
    const slide = await convertOne(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 562.5" width="1000" height="562.5">
  <g id="card-temp">
    <text x="10" y="20">inside card</text>
  </g>
</svg>
`)
    expect(slide.elements.length).toBe(1)
    expect(slide.elements[0].id).toMatch(/^card-temp__[0-9a-f]{5}$/)
    // groupId should be propagated from <g id="card-temp"> to the child
    expect((slide.elements[0] as any).groupId).toBe('card-temp')
  })

  it('D-07: id-less child at root (no <g> wrapper) yields uuidv4().substring(0, 10)', async () => {
    const slide = await convertOne(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 562.5" width="1000" height="562.5">
  <text x="10" y="20">no group</text>
</svg>
`)
    expect(slide.elements.length).toBe(1)
    expect(slide.elements[0].id).toMatch(UUID_SUFFIX_10_RE)
    // groupId should be undefined at root
    expect((slide.elements[0] as any).groupId).toBeUndefined()
  })

  it('D-05+06: four siblings under one <g> yield four distinct ids (id-bearing ones preserved)', async () => {
    const slide = await convertOne(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 562.5" width="1000" height="562.5">
  <g id="card-temperature">
    <text id="content-title-carrier" x="10" y="20">title</text>
    <text x="10" y="40">subtitle</text>
    <text id="content-object-lead" x="10" y="60">lead</text>
    <text x="10" y="80">trailing</text>
  </g>
</svg>
`)
    expect(slide.elements.length).toBe(4)
    const ids = slide.elements.map((e) => e.id)
    // Distinct ids
    expect(new Set(ids).size).toBe(4)
    // Id-bearing children preserved verbatim (D-05)
    expect(ids).toContain('content-title-carrier')
    expect(ids).toContain('content-object-lead')
    // Id-less children fall back to groupId__uuidv4().substring(0, 5) (D-06)
    const fallbackIds = ids.filter((id) => id !== 'content-title-carrier' && id !== 'content-object-lead')
    expect(fallbackIds.length).toBe(2)
    for (const id of fallbackIds) {
      expect(id).toMatch(/^card-temperature__[0-9a-f]{5}$/)
    }
  })

  it('D-08: <g id="g1"><path/><path/></g> (all-path, id-less children) merges to one PPTShapeElement with id matching g1__uuidv4().substring(0, 5)', async () => {
    // Two path children with the same fill, no stroke — shouldMerge returns 'merge'.
    const slide = await convertOne(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 562.5" width="1000" height="562.5">
  <g id="g1">
    <path d="M10 10 L20 20 L30 10 Z" fill="red" />
    <path d="M40 10 L50 20 L60 10 Z" fill="red" />
  </g>
</svg>
`)
    // Merged into ONE PPTShapeElement (D-29 path-merge)
    expect(slide.elements.length).toBe(1)
    expect(slide.elements[0].type).toBe('shape')
    // id follows <group_id>__<uuidv4().substring(0, 5)> fallback (D-08 via firstChildIdByGroup)
    expect(slide.elements[0].id).toMatch(/^g1__[0-9a-f]{5}$/)
  })

  it('D-09: firstChildIdByGroup is populated UNCONDITIONALLY (id-less first child still anchors the merge)', async () => {
    // This is essentially the same shape as the previous test, but the assertion
    // focuses on the fact that even though BOTH children lack ids, the merge
    // still gets a meaningful g1__uuidv4().substring(0, 5) id (not uuidv4()).
    const slide = await convertOne(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 562.5" width="1000" height="562.5">
  <g id="anchored">
    <path d="M0 0 L10 10 Z" fill="none" stroke="black" stroke-width="1" />
    <path d="M20 0 L30 10 Z" fill="none" stroke="black" stroke-width="1" />
  </g>
</svg>
`)
    expect(slide.elements.length).toBe(1)
    // Crucial: starts with "anchored__" not uuidv4 hex — proves firstChildIdByGroup
    // was populated even though the first child path had no id.
    expect(slide.elements[0].id.startsWith('anchored__')).toBe(true)
    expect(slide.elements[0].id).toMatch(/^anchored__[0-9a-f]{5}$/)
  })

  it('Reaffirms D-05 priority: id-bearing child beats groupId__uuidv4().substring(0, 5) fallback', async () => {
    // Even though the child sits inside <g id="card-temp">, its OWN id wins.
    const slide = await convertOne(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 562.5" width="1000" height="562.5">
  <g id="card-temp">
    <text id="my-title" x="10" y="20">explicit</text>
  </g>
</svg>
`)
    expect(slide.elements.length).toBe(1)
    expect(slide.elements[0].id).toBe('my-title')
  })

  it('D-09 generates distinct uuidv4().substring(0, 5) suffixes for siblings under different groups', async () => {
    const slide = await convertOne(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 562.5" width="1000" height="562.5">
  <g id="group-a">
    <text x="10" y="20">a</text>
  </g>
  <g id="group-b">
    <text x="10" y="40">b</text>
  </g>
</svg>
`)
    expect(slide.elements.length).toBe(2)
    const aId = slide.elements[0].id
    const bId = slide.elements[1].id
    expect(aId.startsWith('group-a__')).toBe(true)
    expect(bId.startsWith('group-b__')).toBe(true)
    const aSuffix = aId.slice('group-a__'.length)
    const bSuffix = bId.slice('group-b__'.length)
    expect(aSuffix).toMatch(UUID_SUFFIX_5_RE)
    expect(bSuffix).toMatch(UUID_SUFFIX_5_RE)
    // Suffixes differ between sibling groups (independent uuid substring draws)
    expect(aSuffix).not.toBe(bSuffix)
  })
})
