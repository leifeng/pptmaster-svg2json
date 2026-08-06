import { describe, it, expect, afterAll } from 'vitest'
import { execFileSync } from 'child_process'
import {
  mkdtempSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  readFileSync,
  unlinkSync,
  rmSync,
} from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'

/**
 * CLI integration test for the font validation gate.
 *
 * The CLI does not export a programmatic entry point, so we exercise the
 * startup gate by running the *built* `dist/src/cli.js` in a subprocess with
 * the configured font temporarily moved out of the way (or corrupted in place).
 * This mirrors what `scripts/copy-fonts.js` does not do (i.e. silently skip
 * on missing artifacts): if `dist/src/fonts/Source Han Sans CN Regular.ttf`
 * is gone, corrupt, or wrong-magic, verifyFontLoaded() must short-circuit
 * startup with exit code 1, a red error mentioning both the absolute font
 * path AND the `npm run build` recovery hint, and must NOT produce any
 * output JSON.
 *
 * The font file is restored in `finally` so other tests / local dev aren't
 * affected if this test runs without a full rebuild afterwards.
 *
 * Prerequisite: `npm run build` must have produced dist/src/cli.js and
 * dist/src/fonts/Source Han Sans CN Regular.ttf. Tests run via `npm test`
 * may be invoked before the first build; in that case we run `npm run
 * build` ourselves to set things up.
 */

const REPO_ROOT = resolve(__dirname, '..')
const DIST_CLI = join(REPO_ROOT, 'dist', 'src', 'cli.js')
const DIST_FONT = join(
  REPO_ROOT,
  'dist',
  'src',
  'fonts',
  'Source Han Sans CN Regular.ttf',
)
const SOURCE_FONT = join(
  REPO_ROOT,
  'src',
  'fonts',
  'Source Han Sans CN Regular.ttf',
)

function ensureBuilt(): void {
  if (!existsSync(DIST_CLI)) {
    execFileSync('node', ['./node_modules/typescript/bin/tsc'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    })
    execFileSync('node', ['scripts/copy-fonts.js'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    })
  }
  if (!existsSync(DIST_FONT)) {
    throw new Error(
      `precondition: dist font missing at ${DIST_FONT} — run \`npm run build\` first`,
    )
  }
  if (!existsSync(SOURCE_FONT)) {
    throw new Error(
      `precondition: src font missing at ${SOURCE_FONT} — restore the font in src/fonts/`,
    )
  }
}

/**
 * Run the built CLI in a subprocess and return the actual exit code, stdout,
 * and stderr. Captures `err.status` directly from the thrown ExecException
 * — NOT the non-existent `execFileSync.lastStatus` (CR-01 in 13-REVIEW.md).
 *
 * Uses `process.execPath` so the test works when `node` is not on PATH
 * (nvm/fnm-style setups, CI sandboxes). Sets `FORCE_COLOR=1` so picocolors
 * keeps emitting the red ANSI prefix even when stdio is piped (non-TTY).
 */
function runCli(args: string[]): { code: number; stdout: string; stderr: string } {
  let code = 0
  let stdout = ''
  let stderr = ''
  try {
    const res = execFileSync(process.execPath, [DIST_CLI, ...args], {
      stdio: 'pipe',
      env: { ...process.env, FORCE_COLOR: '1' },
    })
    stdout = res.toString()
    code = 0
  } catch (e) {
    const err = e as NodeJS.ErrnoException & {
      status?: number | null
      stderr?: Buffer | null
      stdout?: Buffer | null
    }
    code = typeof err.status === 'number' ? err.status : 1
    stderr = err.stderr ? err.stderr.toString() : ''
    stdout = err.stdout ? err.stdout.toString() : ''
  }
  return { code, stdout, stderr }
}

const createdDirs: string[] = []

function track<T extends string>(dir: T): T {
  createdDirs.push(dir)
  return dir
}

describe('CLI font validation gate (subprocess)', () => {
  afterAll(() => {
    for (const d of createdDirs) {
      try {
        rmSync(d, { recursive: true, force: true })
      } catch {
        /* best-effort */
      }
    }
  })

  it('exits 1 with red error containing absolute path and build hint when the font is missing', () => {
    ensureBuilt()
    const backupDir = track(mkdtempSync(join(tmpdir(), 'svg2json-font-')))
    const backupPath = join(backupDir, 'Source Han Sans CN Regular.ttf')

    const tmp = track(mkdtempSync(join(tmpdir(), 'svg2json-cli-')))
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><text x="0" y="20" font-family="Source Han Sans CN Regular" font-size="16">x</text></svg>`
    const svgPath = join(tmp, 'in.svg')
    const outPath = join(tmp, 'out.json')
    writeFileSync(svgPath, svg)

    copyFileSync(DIST_FONT, backupPath)
    try {
      unlinkSync(DIST_FONT)
      const { code, stderr } = runCli([svgPath, '-o', outPath])

      expect(code, `CLI exited with code ${code}, stderr:\n${stderr}`).toBe(1)
      expect(stderr).toContain(DIST_FONT)
      expect(stderr).toContain('npm run build')
      expect(stderr).toMatch(/\x1b\[31m/) // picocolors red ANSI prefix
      expect(existsSync(outPath), 'output JSON must NOT be produced before font gate').toBe(false)
    } finally {
      // Restore the font so subsequent test runs and dev environments work.
      copyFileSync(backupPath, DIST_FONT)
      // Sanity check: if it's not restored, surface loudly so we don't silently
      // break the rest of the suite.
      if (!existsSync(DIST_FONT)) {
        throw new Error(`postcondition: dist font not restored at ${DIST_FONT}`)
      }
    }
  }, 60_000)

  it('exits 0 and writes non-empty JSON when the font is present', () => {
    ensureBuilt()
    // Success path does NOT touch DIST_FONT — keep it intact throughout.
    const tmp = track(mkdtempSync(join(tmpdir(), 'svg2json-cli-ok-')))
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><text x="0" y="20" font-family="Source Han Sans CN Regular" font-size="16">x</text></svg>`
    const svgPath = join(tmp, 'in.svg')
    const outPath = join(tmp, 'out.json')
    writeFileSync(svgPath, svg)

    const { code, stderr } = runCli([svgPath, '-o', outPath])

    expect(code, `CLI exited with code ${code}, stderr:\n${stderr}`).toBe(0)
    expect(existsSync(outPath), 'output JSON must be produced on success path').toBe(true)
    expect(readFileSync(outPath, 'utf-8').length).toBeGreaterThan(100)
    // Stderr must NOT contain the red error prefix on the success path.
    expect(stderr).not.toMatch(/\x1b\[31m/)
  }, 60_000)

  function runCorruptFontCase(label: string, payload: Buffer, expectedSnippet: string): void {
    it(`exits 1 with red error when the dist font is ${label}`, () => {
      ensureBuilt()
      const backupDir = track(mkdtempSync(join(tmpdir(), 'svg2json-font-')))
      const backupPath = join(backupDir, 'Source Han Sans CN Regular.ttf')

      const tmp = track(mkdtempSync(join(tmpdir(), 'svg2json-cli-')))
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><text x="0" y="20" font-family="Source Han Sans CN Regular" font-size="16">x</text></svg>`
      const svgPath = join(tmp, 'in.svg')
      const outPath = join(tmp, 'out.json')
      writeFileSync(svgPath, svg)

      copyFileSync(DIST_FONT, backupPath)
      try {
        writeFileSync(DIST_FONT, payload)
        const { code, stderr } = runCli([svgPath, '-o', outPath])

        expect(code, `CLI exited with code ${code}, stderr:\n${stderr}`).toBe(1)
        expect(stderr).toContain(DIST_FONT)
        expect(stderr).toContain('npm run build')
        expect(stderr).toMatch(/\x1b\[31m/) // picocolors red ANSI prefix
        expect(stderr).toContain(expectedSnippet)
        expect(existsSync(outPath), 'output JSON must NOT be produced when font is corrupt').toBe(false)
      } finally {
        copyFileSync(backupPath, DIST_FONT)
        if (!existsSync(DIST_FONT)) {
          throw new Error(`postcondition: dist font not restored at ${DIST_FONT}`)
        }
      }
    }, 60_000)
  }

  // Magic-byte pre-flight catches 0-byte and wrong-magic files.
  runCorruptFontCase('0 bytes', Buffer.alloc(0), 'magic bytes')
  runCorruptFontCase(
    'wrong magic (not a real font)',
    Buffer.from('XXXXnot a real font file', 'utf8'),
    'magic bytes',
  )

  // Truncated font retains the TrueType magic in the first 4 bytes
  // (real font begins 0x00 0x01 0x00 0x00), so magic passes and the
  // getBBox zero-dimension check is what catches it.
  runCorruptFontCase(
    'truncated to 100 bytes',
    readFileSync(DIST_FONT).subarray(0, 100),
    'getBBox',
  )
})