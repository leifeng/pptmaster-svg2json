/**
 * CLI shell-out test — Phase 14 / Plan 14-03.
 *
 * Spawns `node dist/src/cli.js` against the real `exampels/202610131101001`
 * fixture and validates:
 *
 *   - Parent-dir mode exit code 0
 *   - 20 `.svg.json` files emitted into `svg_output/`
 *   - stderr contains the diagnostic summary line `[animations] injected into ...`
 *
 * Also validates the D-02 single-SVG back-compat path: spawning the CLI with
 * a single `.svg` argument must produce exactly one `.svg.json` next to the SVG,
 * and the produced slide must have NO `animations` field (single-SVG mode ignores
 * sidecars per D-02).
 *
 * Prerequisite: `npm run build` must have been run so `dist/src/cli.js` exists.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { resolve, join } from 'path'
import { existsSync, readdirSync, rmSync, mkdtempSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { spawnSync } from 'child_process'

const CLI_PATH = resolve(__dirname, '../dist/src/cli.js')
const FIXTURE_PATH = resolve(__dirname, '../exampels/202610131101001')

const hasFixture = existsSync(join(FIXTURE_PATH, 'animations.json'))
const hasBuiltCli = existsSync(CLI_PATH)

// ---------------------------------------------------------------------------
// Helper: capture stderr separately
// ---------------------------------------------------------------------------

interface SpawnResult {
  status: number | null
  stdout: string
  stderr: string
}

function runCli(args: string[]): SpawnResult {
  const r = spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: 'utf-8',
    cwd: resolve(__dirname, '..'),
    env: process.env,
    timeout: 120_000,
  })
  return {
    status: r.status,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Plan 14-03 — CLI parent-dir shell-out (D-02 + ANIM-CLI-02)', () => {
  it('prerequisites must be in place (npm run build + fixture on disk)', () => {
    if (!hasFixture || !hasBuiltCli) {
      // Surface a clear message so the orchestrator can decide to skip
      expect(hasFixture, 'exampels/202610131101001 must exist on disk').toBe(true)
      expect(hasBuiltCli, 'dist/src/cli.js must exist (run `npm run build`)').toBe(true)
    }
  })

  describe('parent-dir mode against real fixture', () => {
    let result: SpawnResult

    beforeAll(() => {
      if (!hasFixture || !hasBuiltCli) return
      result = runCli([FIXTURE_PATH])
    }, 120_000)

    it('exits with code 0', () => {
      if (!hasFixture || !hasBuiltCli || !result) return
      expect(result.status).toBe(0)
    })

    it('emits 20 .svg.json files into svg_output/', () => {
      if (!hasFixture || !hasBuiltCli || !result) return
      const svgOutputDir = join(FIXTURE_PATH, 'svg_output')
      const files = readdirSync(svgOutputDir).filter(f => f.endsWith('.svg.json'))
      expect(files.length).toBe(20)
    })

    it('stderr contains the [animations] summary line (D-23)', () => {
      if (!hasFixture || !hasBuiltCli || !result) return
      expect(result.stderr).toMatch(/\[animations\] injected into \d+ slides?/)
    })

    it('stderr contains the 4 fields of the summary (slides, PPTAnimations, extensions, unmapped)', () => {
      if (!hasFixture || !hasBuiltCli || !result) return
      // The summary line is one line — match the multi-field shape.
      expect(result.stderr).toMatch(/\[animations\] injected into/)
      expect(result.stderr).toMatch(/PPTAnimations?/)
      expect(result.stderr).toMatch(/fields preserved/)
      expect(result.stderr).toMatch(/effects? fell back/)
    })

    it('stdout does NOT contain the [animations] summary line (D-23 strict)', () => {
      if (!hasFixture || !hasBuiltCli || !result) return
      expect(result.stdout).not.toMatch(/\[animations\] injected into/)
    })

    it('at least one .svg.json contains slide.animations (covered slides inject)', () => {
      if (!hasFixture || !hasBuiltCli || !result) return
      const slide0003 = join(FIXTURE_PATH, 'svg_output', '03_overview.svg.svg.json')
      const env = JSON.parse(readFileSync(slide0003, 'utf-8'))
      const slide = env.slides[0]
      expect(slide.id).toBe('03_overview')
      expect(slide.animations).toBeDefined()
      expect(slide.animations.length).toBeGreaterThan(0)
    })
  })

  describe('D-02 single-SVG back-compat', () => {
    let result: SpawnResult
    let tempSvgPath: string | undefined

    beforeAll(() => {
      if (!hasFixture || !hasBuiltCli) return
      // Copy a single SVG from the fixture into a temp dir to avoid clobbering
      // the shared fixture. Single-SVG mode writes <svg>.json (NOT .svg.json).
      const tmpDir = mkdtempSync(join(tmpdir(), 'p14-03-single-svg-'))
      tempSvgPath = join(tmpDir, '01_cover.svg')
      const sourcePath = join(FIXTURE_PATH, 'svg_output', '01_cover.svg')
      const { copyFileSync } = require('fs') as typeof import('fs')
      copyFileSync(sourcePath, tempSvgPath)
      result = runCli([tempSvgPath])
    }, 120_000)

    afterAll(() => {
      if (tempSvgPath) {
        try {
          rmSync(tempSvgPath, { force: true })
          rmSync(tempSvgPath + '.json', { force: true })
          // also remove the parent tmp dir
          const parentDir = join(tempSvgPath, '..')
          rmSync(parentDir, { recursive: true, force: true })
        } catch {}
      }
    })

    it('exits with code 0', () => {
      if (!hasFixture || !hasBuiltCli || !result) return
      expect(result.status).toBe(0)
    })

    it('writes <svg>.json next to the SVG', () => {
      if (!hasFixture || !hasBuiltCli || !result || !tempSvgPath) return
      expect(existsSync(tempSvgPath + '.json')).toBe(true)
    })

    it('produced slide has NO animations field (single-SVG ignores sidecar)', () => {
      if (!hasFixture || !hasBuiltCli || !result || !tempSvgPath) return
      const env = JSON.parse(readFileSync(tempSvgPath + '.json', 'utf-8'))
      const slide = env.slides[0]
      // convert() uses uuidv4() — single-SVG does NOT pin slide.id to filename.
      expect(typeof slide.id).toBe('string')
      expect(slide.id.length).toBeGreaterThan(0)
      expect(slide.animations).toBeUndefined()
    })
  })
})