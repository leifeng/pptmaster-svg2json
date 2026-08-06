import { describe, it, expect } from 'vitest'
import { execFileSync } from 'child_process'
import { mkdtempSync, writeFileSync, copyFileSync, existsSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname, resolve } from 'path'

/**
 * CLI integration test for the font validation gate.
 *
 * The CLI does not export a programmatic entry point, so we exercise the
 * startup gate by running the *built* `dist/src/cli.js` in a subprocess with
 * the configured font temporarily moved out of the way. This mirrors what
 * `scripts/copy-fonts.js` does not do (i.e. silently skip on missing
 * artifacts): if `dist/src/fonts/Source Han Sans CN Regular.ttf` is gone,
 * verifyFontLoaded() must short-circuit startup with exit code 1, a red
 * error mentioning both the absolute font path AND the `npm run build`
 * recovery hint, and must NOT produce any output JSON.
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
const SOURCE_FONT = join(REPO_ROOT, 'src', 'fonts', 'Source Han Sans CN Regular.ttf')

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

describe('CLI font validation gate (subprocess)', () => {
  it('exits 1 with red error containing absolute path and build hint when the font is missing', () => {
    ensureBuilt()
    const backupDir = mkdtempSync(join(tmpdir(), 'svg2json-font-'))
    const backupPath = join(backupDir, 'Source Han Sans CN Regular.ttf')

    const tmp = mkdtempSync(join(tmpdir(), 'svg2json-cli-'))
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><text x="0" y="20" font-family="Source Han Sans CN Regular" font-size="16">x</text></svg>`
    const svgPath = join(tmp, 'in.svg')
    const outPath = join(tmp, 'out.json')
    writeFileSync(svgPath, svg)

    let code = 0
    let stderr = ''
    let stdout = ''
    copyFileSync(DIST_FONT, backupPath)
    try {
      unlinkSync(DIST_FONT)
      try {
        ;({ stderr, stdout } = (() => {
          try {
            const res = execFileSync(
              'node',
              [DIST_CLI, svgPath, '-o', outPath],
              { stdio: 'pipe' },
            )
            return { stderr: '', stdout: res.toString() }
          } catch (e) {
            const err = e as { status?: number | null; stderr?: Buffer | null; stdout?: Buffer | null }
            return {
              stderr: err.stderr ? err.stderr.toString() : '',
              stdout: err.stdout ? err.stdout.toString() : '',
            }
          }
        })())
        code = typeof (execFileSync as unknown as { lastStatus?: number }).lastStatus === 'number'
          ? (execFileSync as unknown as { lastStatus: number }).lastStatus
          : 1
      } catch (e) {
        const err = e as { status?: number | null; stderr?: Buffer | null; stdout?: Buffer | null }
        code = typeof err.status === 'number' ? err.status : 1
        stderr = err.stderr ? err.stderr.toString() : ''
        stdout = err.stdout ? err.stdout.toString() : ''
      }

      expect(code, `CLI exited with code ${code}, stderr:\n${stderr}\nstdout:\n${stdout}`).toBe(1)
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
})

// Keep dirname as a referenced symbol so tsc strict mode doesn't complain.
void dirname
