import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import { resolve } from 'path'
import { FONT_FILE, FONT_OPTIONS } from './constants'

// Mock the native Resvg class so we can drive failure branches without
// depending on the actual @resvg/resvg-js WASM runtime in unit tests.
vi.mock('@resvg/resvg-js', () => ({
  Resvg: vi.fn(),
}))

import { Resvg } from '@resvg/resvg-js'
// Implementation under test — loaded after the mock so it picks it up.
import { verifyFontLoaded } from './font-validator'

const realFontPath = resolve(FONT_FILE)

describe('verifyFontLoaded', () => {
  beforeEach(() => {
    vi.mocked(Resvg).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('success path (real font file + Resvg ok)', () => {
    it('returns { ok: true } with no error when the real font file is present and Resvg constructs', () => {
      vi.mocked(Resvg).mockImplementation(() => ({}) as unknown as InstanceType<typeof Resvg>)
      const result = verifyFontLoaded()
      expect(result.ok).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('uses FONT_OPTIONS (with the configured fontFiles) when constructing Resvg', () => {
      const ctor = vi
        .mocked(Resvg)
        .mockImplementation(() => ({}) as unknown as InstanceType<typeof Resvg>)
      verifyFontLoaded()
      expect(ctor).toHaveBeenCalledTimes(1)
      const [, opts] = ctor.mock.calls[0]
      expect(opts).toEqual(FONT_OPTIONS)
    })
  })

  describe('font file missing', () => {
    it('returns { ok: false } with a non-throwing error', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false)
      let result: ReturnType<typeof verifyFontLoaded> | undefined
      expect(() => {
        result = verifyFontLoaded()
      }).not.toThrow()
      expect(result!.ok).toBe(false)
      expect(typeof result!.error).toBe('string')
      expect(result!.error!.length).toBeGreaterThan(0)
    })

    it('error message contains the absolute font path', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false)
      const { error } = verifyFontLoaded()
      expect(error).toBeDefined()
      expect(error).toContain(realFontPath)
    })

    it('error message indicates the file is missing/找不到/缺失', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false)
      const { error } = verifyFontLoaded()
      expect(error).toBeDefined()
      expect(error).toMatch(/missing|not found|缺失|不存在/i)
    })

    it('error message includes a build hint (npm run build)', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false)
      const { error } = verifyFontLoaded()
      expect(error).toBeDefined()
      expect(error).toContain('npm run build')
    })

    it('does not attempt to construct Resvg when the font file is missing', () => {
      const ctor = vi
        .mocked(Resvg)
        .mockImplementation(() => ({}) as unknown as InstanceType<typeof Resvg>)
      vi.spyOn(fs, 'existsSync').mockReturnValue(false)
      verifyFontLoaded()
      expect(ctor).not.toHaveBeenCalled()
    })
  })

  describe('Resvg construction failure', () => {
    it('returns { ok: false } when the Resvg constructor throws', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      const cause = new Error('Failed to load font file: invalid TTF')
      vi.mocked(Resvg).mockImplementation(() => {
        throw cause
      })
      const result = verifyFontLoaded()
      expect(result.ok).toBe(false)
      expect(typeof result.error).toBe('string')
    })

    it('preserves the underlying failure cause in the error message', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      const causeMsg = 'native font load failed: bad glyph table'
      vi.mocked(Resvg).mockImplementation(() => {
        throw new Error(causeMsg)
      })
      const { error } = verifyFontLoaded()
      expect(error).toBeDefined()
      expect(error).toContain(causeMsg)
    })

    it('still mentions the absolute font path when Resvg construction fails', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.mocked(Resvg).mockImplementation(() => {
        throw new Error('boom')
      })
      const { error } = verifyFontLoaded()
      expect(error).toBeDefined()
      expect(error).toContain(realFontPath)
    })

    it('does not throw to the caller when Resvg construction fails', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.mocked(Resvg).mockImplementation(() => {
        throw new Error('boom')
      })
      expect(() => verifyFontLoaded()).not.toThrow()
    })
  })
})
