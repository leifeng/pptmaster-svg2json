import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resolve } from 'path'

// Mock 'fs' so we can deterministically drive the file-existence branch
// without touching real filesystem state. Other fs functions stay real via
// importActual so we don't break unrelated helpers.
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return {
    ...actual,
    existsSync: vi.fn(),
    openSync: vi.fn(),
    readSync: vi.fn(),
    closeSync: vi.fn(),
  }
})

// Mock the native Resvg class so we can drive failure branches without
// depending on the actual @resvg/resvg-js WASM runtime in unit tests.
vi.mock('@resvg/resvg-js', () => ({
  Resvg: vi.fn(),
}))

import { existsSync, openSync, readSync, closeSync } from 'fs'
import { Resvg } from '@resvg/resvg-js'
import { FONT_FILE, FONT_OPTIONS } from './constants'
// Implementation under test — loaded after mocks so it picks them up.
import { verifyFontLoaded } from './font-validator'

const realFontPath = resolve(FONT_FILE)

// Module-level mutable defaults — each test (re)assigns them in beforeEach
// so factory mocks rebuilt after vi.restoreAllMocks() still get the latest
// closure state.
let MOCK_MAGIC: Buffer
let getBBoxImpl: () => unknown

describe('verifyFontLoaded', () => {
  beforeEach(() => {
    MOCK_MAGIC = Buffer.from([0x00, 0x01, 0x00, 0x00]) // TrueType (default valid)
    getBBoxImpl = () => ({ x: 0, y: 0, width: 16, height: 18 })
    vi.mocked(existsSync).mockReset().mockReturnValue(true)
    vi.mocked(openSync).mockReset().mockReturnValue(1 as unknown as number)
    vi.mocked(closeSync).mockReset()
    vi.mocked(readSync).mockReset().mockImplementation(
      ((_fd: number, buf: Buffer) => {
        const copyLen = Math.min(MOCK_MAGIC.length, buf.length)
        buf.set(MOCK_MAGIC.subarray(0, copyLen))
        return copyLen
      }) as unknown as typeof readSync,
    )
    vi.mocked(Resvg).mockReset().mockImplementation(
      () => ({ getBBox: getBBoxImpl as never }) as unknown as InstanceType<typeof Resvg>,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('success path (real font file + Resvg ok)', () => {
    it('returns { ok: true } with no error when the real font file is present and Resvg constructs', () => {
      const result = verifyFontLoaded()
      expect(result.ok).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('uses FONT_OPTIONS (with the configured fontFiles) when constructing Resvg', () => {
      const ctor = vi.mocked(Resvg)
      verifyFontLoaded()
      expect(ctor).toHaveBeenCalledTimes(1)
      const [, opts] = ctor.mock.calls[0]
      expect(opts).toEqual(FONT_OPTIONS)
    })
  })

  describe('font file missing', () => {
    it('returns { ok: false } with a non-throwing error', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      let result: ReturnType<typeof verifyFontLoaded> | undefined
      expect(() => {
        result = verifyFontLoaded()
      }).not.toThrow()
      expect(result!.ok).toBe(false)
      expect(typeof result!.error).toBe('string')
      expect(result!.error!.length).toBeGreaterThan(0)
    })

    it('error message contains the absolute font path', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      const { error } = verifyFontLoaded()
      expect(error).toBeDefined()
      expect(error).toContain(realFontPath)
    })

    it('error message indicates the file is missing/找不到/缺失', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      const { error } = verifyFontLoaded()
      expect(error).toBeDefined()
      expect(error).toMatch(/missing|not found|缺失|不存在/i)
    })

    it('error message includes a build hint (npm run build)', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      const { error } = verifyFontLoaded()
      expect(error).toBeDefined()
      expect(error).toContain('npm run build')
    })

    it('does not attempt to construct Resvg when the font file is missing', () => {
      const ctor = vi.mocked(Resvg)
      vi.mocked(existsSync).mockReturnValue(false)
      verifyFontLoaded()
      expect(ctor).not.toHaveBeenCalled()
    })
  })

  describe('Resvg construction failure', () => {
    it('returns { ok: false } when the Resvg constructor throws', () => {
      const cause = new Error('Failed to load font file: invalid TTF')
      vi.mocked(Resvg).mockImplementation(() => {
        throw cause
      })
      const result = verifyFontLoaded()
      expect(result.ok).toBe(false)
      expect(typeof result.error).toBe('string')
    })

    it('preserves the underlying failure cause in the error message', () => {
      const causeMsg = 'native font load failed: bad glyph table'
      vi.mocked(Resvg).mockImplementation(() => {
        throw new Error(causeMsg)
      })
      const { error } = verifyFontLoaded()
      expect(error).toBeDefined()
      expect(error).toContain(causeMsg)
    })

    it('still mentions the absolute font path when Resvg construction fails', () => {
      vi.mocked(Resvg).mockImplementation(() => {
        throw new Error('boom')
      })
      const { error } = verifyFontLoaded()
      expect(error).toBeDefined()
      expect(error).toContain(realFontPath)
    })

    it('does not throw to the caller when Resvg construction fails', () => {
      vi.mocked(Resvg).mockImplementation(() => {
        throw new Error('boom')
      })
      expect(() => verifyFontLoaded()).not.toThrow()
    })
  })

  describe('TTF magic-byte pre-flight', () => {
    it('returns { ok: false } when the font bytes are missing a TTF/OTF magic and Resvg would silently succeed', () => {
      MOCK_MAGIC = Buffer.from('XXXX', 'utf8')
      const ctor = vi.mocked(Resvg)
      const { ok, error } = verifyFontLoaded()
      expect(ok).toBe(false)
      expect(error).toBeDefined()
      expect(error).toContain(realFontPath)
      expect(error).toContain('npm run build')
      // Magic check should reject before Resvg is constructed
      expect(ctor).not.toHaveBeenCalled()
    })

    it('returns { ok: true } when the font bytes start with the TrueType magic 0x00010000', () => {
      const ctor = vi.mocked(Resvg)
      const result = verifyFontLoaded()
      expect(result.ok).toBe(true)
      expect(ctor).toHaveBeenCalledTimes(1)
    })

    it('returns { ok: true } when the font bytes start with the OpenType-CFF magic OTTO', () => {
      MOCK_MAGIC = Buffer.from('OTTO', 'utf8')
      const result = verifyFontLoaded()
      expect(result.ok).toBe(true)
    })
  })

  describe('Resvg getBBox zero/undefined validation', () => {
    it('returns { ok: false } when getBBox() returns undefined', () => {
      getBBoxImpl = () => undefined
      const { ok, error } = verifyFontLoaded()
      expect(ok).toBe(false)
      expect(error).toBeDefined()
      expect(error).toContain('getBBox')
      expect(error).toContain(realFontPath)
      expect(error).toContain('npm run build')
    })

    it('returns { ok: false } when getBBox() returns zero dimensions', () => {
      getBBoxImpl = () => ({ x: 0, y: 0, width: 0, height: 0 })
      const { ok, error } = verifyFontLoaded()
      expect(ok).toBe(false)
      expect(error).toBeDefined()
      expect(error).toContain('getBBox')
    })

    it('returns { ok: true } when getBBox() returns non-zero width and height', () => {
      // Default mock provides non-zero bbox
      const result = verifyFontLoaded()
      expect(result.ok).toBe(true)
    })
  })

  describe('font file empty / truncated (readSync returns fewer bytes than FONT_MAGIC_BYTES)', () => {
    it('returns { ok: false } when readSync returns 0 bytes (empty file)', () => {
      MOCK_MAGIC = Buffer.alloc(0)
      const ctor = vi.mocked(Resvg)
      const { ok, error } = verifyFontLoaded()
      expect(ok).toBe(false)
      expect(error).toBeDefined()
      expect(error).toContain(realFontPath)
      expect(error).toContain('npm run build')
      expect(ctor).not.toHaveBeenCalled()
    })

    it('returns { ok: false } when readSync returns 2 bytes (truncated below magic length)', () => {
      MOCK_MAGIC = Buffer.from('XX', 'utf8')
      vi.mocked(readSync).mockImplementation(
        ((_fd: number, buf: Buffer) => {
          buf.set(MOCK_MAGIC.subarray(0, 2))
          return 2
        }) as unknown as typeof readSync,
      )
      const ctor = vi.mocked(Resvg)
      const { ok, error } = verifyFontLoaded()
      expect(ok).toBe(false)
      expect(error).toBeDefined()
      expect(error).toContain(realFontPath)
      expect(error).toContain('npm run build')
      expect(ctor).not.toHaveBeenCalled()
    })
  })
})