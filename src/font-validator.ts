/**
 * Synchronous font validation for the CLI startup boundary.
 *
 * Resvg-js silently falls back to a built-in font when the configured font
 * file cannot be loaded. That fallback produces text measurements that no
 * longer match what PPTist renders with Source Han Sans CN, so we refuse to
 * start any conversion until we can prove the configured font actually loads.
 *
 * Two layers are enforced here:
 *   1. The target font file (FONT_FILE) exists on disk.
 *   2. Resvg can be constructed with FONT_OPTIONS against a minimal SVG —
 *      this catches malformed/corrupt fonts that pass the existence check
 *      but are rejected by the native loader.
 *
 * The function never throws. It returns a discriminated result so the CLI
 * can render a single, structured error message and exit with code 1.
 */

import { existsSync } from 'fs'
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

export interface FontVerificationResult {
  ok: boolean
  error?: string
}

/**
 * Verify that the configured Source Han Sans CN Regular font is loadable.
 *
 * Synchronous, never throws. Returns:
 *   - { ok: true } when the file exists AND Resvg accepts FONT_OPTIONS.
 *   - { ok: false, error: <diagnostic string> } otherwise, where the error
 *     always contains the absolute font path and the build hint so the CLI
 *     can show the user exactly what is broken and how to fix it.
 */
export function verifyFontLoaded(): FontVerificationResult {
  const absoluteFontPath = resolve(FONT_FILE)

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

  try {
    // Single construction attempt — sufficient to confirm FONT_OPTIONS is
    // accepted by the native loader. We never call .render() or .getBBox()
    // because that would be wasted work; the constructor is the gate.
    new Resvg(VALIDATION_SVG, FONT_OPTIONS)
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
