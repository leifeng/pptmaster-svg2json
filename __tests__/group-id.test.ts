import { describe, it, expect } from 'vitest'
import { parseSvg } from '../src/parser/svg-parser'
import { transformToPPTElement } from '../src/transformer/transform-to-pptel'
import type { PPTShapeElement, PPTImageElement, PPTLineElement } from '../src/slides'

describe('GROUP-01 groupId propagation', () => {
  it('propagates g id to direct rect children', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <g id="header">
        <rect width="50" height="50"/>
      </g>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)
    const rect = elements.find(e => e.type === 'shape') as PPTShapeElement
    expect(rect.groupId).toBe('header')
  })

  it('propagates g id to direct circle children', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <g id="circles">
        <circle cx="50" cy="50" r="40"/>
      </g>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)
    const circle = elements.find(e => e.type === 'shape') as PPTShapeElement
    expect(circle.groupId).toBe('circles')
  })

  it('propagates g id to multiple direct children', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <g id="header">
        <rect width="50" height="50"/>
        <circle cx="75" cy="25" r="10"/>
      </g>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)
    // All shapes in the group should have the same groupId
    const allShapes = elements.filter(e => e.type === 'shape') as PPTShapeElement[]
    expect(allShapes.length).toBe(2)
    expect(allShapes.every(s => s.groupId === 'header')).toBe(true)
  })

  it('uses innermost g id for nested groups', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <g id="outer">
        <g id="inner">
          <rect width="50" height="50"/>
        </g>
      </g>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)
    const rect = elements.find(e => e.type === 'shape') as PPTShapeElement
    expect(rect.groupId).toBe('inner')
  })

  it('does not propagate g id to grandchildren when parent g has no id', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <g id="parent">
        <g>
          <rect width="50" height="50"/>
        </g>
      </g>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)
    const rect = elements.find(e => e.type === 'shape') as PPTShapeElement
    // The inner g has no id, so rect should not get parent id
    expect(rect.groupId).toBeUndefined()
  })

  it('does not set groupId when g has no id', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <g>
        <rect width="50" height="50"/>
      </g>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)
    const rect = elements.find(e => e.type === 'shape') as PPTShapeElement
    expect(rect.groupId).toBeUndefined()
  })

  it('propagates groupId to image children', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <g id="images">
        <image href="test.png" width="100" height="100"/>
      </g>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)
    const image = elements.find(e => e.type === 'image') as PPTImageElement
    expect(image.groupId).toBe('images')
  })

  it('propagates groupId to line children', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <g id="lines">
        <line x1="0" y1="0" x2="100" y2="100"/>
      </g>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)
    const line = elements.find(e => e.type === 'line') as PPTLineElement
    expect(line.groupId).toBe('lines')
  })

  it('g with no direct element children produces no groupId', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <g id="empty">
        <g id="inner">
        </g>
      </g>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)
    // No shapes should be output since there are no direct element children
    expect(elements.length).toBe(0)
  })

  it('propagates groupId to text children', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <g id="texts">
        <text x="10" y="20">Hello</text>
      </g>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)
    const text = elements.find(e => e.type === 'text')
    expect(text?.groupId).toBe('texts')
  })
})
