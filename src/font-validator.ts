/**
 * Synchronous font validation for the CLI startup boundary.
 *
 * Resvg-js silently falls back to a built-in font when the configured font
 * file cannot be loaded. That fallback produces text measurements that no
 * longer match what PPTist renders with Source Han Sans CN, so we refuse to
 * start any conversion until we can prove the configured font actually loads.
 *
 * Three layers are enforced here:
 *   1. The target font file (FONT_FILE) exists on disk.
 *   2. The first 4 bytes of the file match a valid TTF/OTF/Apple/PS/TTC magic
 *      number — a sub-millisecond pre-flight that catches 0-byte, truncated,
 *      and masquerading non-font files before any native loader is invoked.
 *   3. Resvg can be constructed with FONT_OPTIONS against a minimal SVG and
 *      its `getBBox()` returns a non-empty, non-zero-dimension result. This
 *      catches malformed fonts that pass existence + magic but are rejected
 *      by the native loader (or silently fall back to a built-in glyph).
 *
 * The function never throws. It returns a discriminated result so the CLI
 * can render a single, structured error message and exit with code 1.
 */

import { existsSync, openSync, readSync, closeSync } from 'fs'
import { resolve } from 'path'
import { Resvg } from '@resvg/resvg-js'
import { FONT_FILE, FONT_OPTIONS, TARGET_FONT } from './constants'

/**
 * Minimal, structurally valid SVG used only to drive a single Resvg
 * construction. The text node targets FONT_OPTIONS.defaultFontFamily so the
 * native loader must resolve it to fontFiles[0]; a fallback-only loaded
 * configuration would render but be flagged by getBBox checks upstream.
 */
const VALIDATION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32"><text x="0" y="16" font-family="${TARGET_FONT}" font-size="16">x</text></svg>`

const BUILD_HINT = 'npm run build'

/**
 * Magic numbers for supported font container formats. The first 4 bytes of
 * any valid TTF/OTF/TTC file must match one of these. See
 * https://docs.microsoft.com/en-us/typography/opentype/spec/otff
 */
const VALID_FONT_MAGICS: readonly Buffer[] = [
  Buffer.from([0x00, 0x01, 0x00, 0x00]), // TrueType
  Buffer.from('OTTO', 'utf8'), // OpenType-CFF
  Buffer.from('true', 'utf8'), // Apple TrueType
  Buffer.from('typ1', 'utf8'), // PostScript Type 1 (rare)
  Buffer.from('ttcf', 'utf8'), // TrueType Collection
]
const FONT_MAGIC_BYTES = 4

export interface FontVerificationResult {
  ok: boolean
  error?: string
}

/**
 * Read the first 4 bytes of `path` synchronously. Returns `null` on any I/O
 * error or when fewer than 4 bytes are available (empty / truncated file).
 * Caller is responsible for closing the descriptor in the finally block.
 */
function readFontMagic(path: string): Buffer | null {
  let fd: number | undefined
  try {
    fd = openSync(path, 'r')
    const buf = Buffer.alloc(FONT_MAGIC_BYTES)
    const n = readSync(fd, buf, 0, FONT_MAGIC_BYTES, 0)
    if (typeof n !== 'number' || n < FONT_MAGIC_BYTES) return null
    return buf
  } catch {
    return null
  } finally {
    if (fd !== undefined) {
      try {
        closeSync(fd)
      } catch {
        /* best-effort */
      }
    }
  }
}

function hasValidFontMagic(buf: Buffer | null): boolean {
  if (!buf || buf.length < FONT_MAGIC_BYTES) return false
  return VALID_FONT_MAGICS.some((m) => buf.equals(m))
}

/**
 * Verify that the configured Source Han Sans CN Regular font is loadable.
 *
 * Synchronous, never throws. Returns:
 *   - { ok: true } when the file exists, has a valid font magic, AND Resvg
 *     accepts FONT_OPTIONS and reports a non-zero getBBox() result.
 *   - { ok: false, error: <diagnostic string> } otherwise, where the error
 *     always contains the absolute font path and the build hint so the CLI
 *     can show the user exactly what is broken and how to fix it.
 */
export function verifyFontLoaded(): FontVerificationResult {
  const absoluteFontPath = resolve(FONT_FILE)

  // Layer 1: existence check.
  if (!existsSync(absoluteFontPath)) {
    return {
      ok: false,
      error:
        `Font file missing: ${absoluteFontPath}\n` +
        `The configured Source Han Sans CN Regular font was not found at the expected path.\n` +
        `Recover by running \`${BUILD_HINT}\` so scripts/copy-fonts.js can copy the font from src/fonts/ to dist/src/fonts/.\n` +
        `If the font is already in the repository, check that the build output directory exists relative to the CLI entry point.`,
    }
  }

  // Layer 1.5: cheap TTF/OTF magic-byte pre-flight — catches 0-byte,
  // truncated, and masquerading non-font files before WASM init.
  const magicBuf = readFontMagic(absoluteFontPath)
  if (!hasValidFontMagic(magicBuf)) {
    return {
      ok: false,
      error:
        `Font file present but invalid (missing TTF/OTF magic bytes or truncated below 4 bytes): ${absoluteFontPath}\n` +
        `Resvg-js requires a valid font container (TTF/OTF/TTC) — corrupted or empty artifacts will silently fall back to a built-in font.\n` +
        `Recover by running \`${BUILD_HINT}\` to refresh font artifacts and confirm src/fonts/Source Han Sans CN Regular.ttf is a valid file.`,
    }
  }

  // Layer 2: Resvg native loader + getBBox() non-empty / non-zero check.
  try {
    const resvg = new Resvg(VALIDATION_SVG, FONT_OPTIONS)
    const bbox = resvg.getBBox()
    if (!bbox) {
      return {
        ok: false,
        error:
          `Resvg getBBox() returned no bounding box for ${absoluteFontPath}; the font may be missing or corrupt.\n` +
          `Recover by running \`${BUILD_HINT}\` to refresh font artifacts.`,
      }
    }
    if (bbox.width === 0 || bbox.height === 0) {
      return {
        ok: false,
        error:
          `Resvg getBBox() returned zero-dimension bbox for ${absoluteFontPath} (font loaded as empty glyph).\n` +
          `Recover by running \`${BUILD_HINT}\` to refresh font artifacts.`,
      }
    }
    return { ok: true }
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      error:
        `Font load failed for ${absoluteFontPath}.\n` +
        `Resvg refused to load the configured font: ${cause}\n` +
        `Recover by running \`${BUILD_HINT}\` to refresh font artifacts and confirm src/fonts/Source Han Sans CN Regular.ttf is a valid file.\n` +
        `Do not ignore this: a failing font load silently falls back to a built-in font and breaks width measurement against PPTist.`,
    }
  }
}