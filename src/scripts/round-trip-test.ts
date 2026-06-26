import { readdirSync, statSync, readFileSync } from 'fs'
import { join, extname } from 'path'
import pc from 'picocolors'
import { parseSvg } from '../parser/svg-parser'
import { transformToPPTElement } from '../transformer/transform-to-pptel'
import type { PPTElement } from '../slides'

export interface RoundTripResult {
  file: string
  valid: boolean
  errors: string[]
}

/**
 * Type guard for PPTElement union type.
 * PPTLineElement extends Omit<PPTBaseElement, 'height' | 'rotate'> so those fields are not required for lines.
 */
export function isValidPPTElement(obj: unknown): obj is PPTElement {
  if (typeof obj !== 'object' || obj === null) return false
  const e = obj as Record<string, unknown>

  // Check required fields - id, left, top, width are common to all
  if (typeof e.id !== 'string') return false
  if (typeof e.left !== 'number') return false
  if (typeof e.top !== 'number') return false
  if (typeof e.width !== 'number') return false

  // Check type is one of the valid PPTElement types
  const validTypes = ['text', 'image', 'shape', 'line', 'chart', 'table', 'latex', 'video', 'audio']
  if (typeof e.type !== 'string') return false
  if (!validTypes.includes(e.type)) return false

  // height and rotate are required for all types EXCEPT line
  if (e.type !== 'line') {
    if (typeof e.height !== 'number') return false
    if (typeof e.rotate !== 'number') return false
  }

  return true
}

/**
 * Round-trip test: SVG -> AST -> JSON -> re-parse -> validate
 */
export function roundTripTest(svgContent: string): { valid: boolean, errors: string[] } {
  const errors: string[] = []

  try {
    // Parse SVG to AST
    const ast = parseSvg(svgContent)

    // Transform to PPTElement array
    const elements = transformToPPTElement(ast)

    // Serialize to JSON
    const json = JSON.stringify({ elements })

    // Re-parse JSON
    const parsed = JSON.parse(json)

    // Validate each element
    if (!Array.isArray(parsed.elements)) {
      errors.push('Output is not an array')
      return { valid: false, errors }
    }

    for (let i = 0; i < parsed.elements.length; i++) {
      const el = parsed.elements[i]
      if (!isValidPPTElement(el)) {
        if (!isValidPPTElement(el)) {
          errors.push('Element ' + i + ' failed validation: ' + JSON.stringify(el).substring(0, 100))
        }
      }
    }

    return { valid: errors.length === 0, errors }
  } catch (err) {
    return { valid: false, errors: ['Exception during round-trip: ' + String(err)] }
  }
}

function walkDir(dir: string): string[] {
  const files: string[] = []
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      try {
        if (statSync(fullPath).isDirectory()) {
          const subFiles = walkDir(fullPath)
          for (const f of subFiles) {
            files.push(f)
          }
        } else if (extname(entry).toLowerCase() === '.svg') {
          files.push(fullPath)
        }
      } catch {
        // skip files we can't stat
      }
    }
  } catch {
    // skip dirs we can't read
  }
  return files
}

function findSvgOutputDirs(basePath: string): string[] {
  const dirs: string[] = []
  try {
    const entries = readdirSync(basePath)
    for (const entry of entries) {
      const fullPath = join(basePath, entry)
      try {
        if (statSync(fullPath).isDirectory()) {
          const svgOutput = join(fullPath, 'svg_output')
          try {
            if (statSync(svgOutput).isDirectory()) {
              dirs.push(svgOutput)
            }
          } catch {
            // svg_output doesn't exist
          }
        }
      } catch {
        // skip directories we can't stat
      }
    }
  } catch {
    // skip base path if we can't read it
  }
  return dirs
}

async function main() {
  const projectRoot = join(__dirname, '../..')
  const examplesDir = join(projectRoot, 'examples')

  const svgOutputDirs = findSvgOutputDirs(examplesDir)

  if (svgOutputDirs.length === 0) {
    console.error(pc.yellow('No svg_output directories found'))
    process.exit(0)
  }

  const allFiles: string[] = []
  for (const dir of svgOutputDirs) {
    const files = walkDir(dir)
    for (const f of files) {
      allFiles.push(f)
    }
  }

  if (allFiles.length === 0) {
    console.error(pc.yellow('No SVG files found'))
    process.exit(0)
  }

  console.error(pc.cyan('Round-trip testing ' + allFiles.length + ' SVG files...'))

  const results: RoundTripResult[] = []
  let passedCount = 0
  let failedCount = 0
  const allErrors: Array<{ file: string, error: string }> = []

  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i]
    const progress = String(i + 1) + '/' + allFiles.length

    try {
      const content = readFileSync(file, 'utf-8')
      const result = roundTripTest(content)

      results.push({ file, valid: result.valid, errors: result.errors })

      if (result.valid) {
        passedCount++
      } else {
        failedCount++
        for (const err of result.errors) {
          allErrors.push({ file, error: err })
        }
      }
    } catch (err) {
      failedCount++
      const errorMsg = 'File read error: ' + String(err)
      allErrors.push({ file, error: errorMsg })
      results.push({ file, valid: false, errors: [errorMsg] })
    }

    const statusColor = results[results.length - 1].valid ? pc.green('PASS') : pc.red('FAIL')
    console.error(pc.gray('[' + progress + '] ' + statusColor + ' ' + file))
  }

  console.error('')
  console.error(pc.cyan('=== Round-Trip Test Summary ==='))
  console.error('Total files: ' + pc.bold(String(allFiles.length)))
  console.error(pc.green('Passed') + ': ' + passedCount)
  console.error(pc.red('Failed') + ': ' + failedCount)
  const rate = (passedCount / allFiles.length) * 100
  const rateColor = rate > 90 ? pc.green : pc.yellow
  console.error('Pass rate: ' + rateColor(rate.toFixed(1) + '%'))

  if (allErrors.length > 0) {
    console.error('')
    console.error(pc.red('=== Failures ==='))
    for (const e of allErrors) {
      console.error(pc.red('FAIL') + ': ' + e.file)
      console.error('       ' + e.error)
    }
  }

  // Output JSON to stdout
  const report = {
    timestamp: new Date().toISOString(),
    total: allFiles.length,
    passed: passedCount,
    failed: failedCount,
    passRate: rate.toFixed(1) + '%',
    errors: allErrors,
  }
  console.log(JSON.stringify(report, null, 2))

  process.exit(0)
}

main().catch((err) => {
  console.error(pc.red('Fatal error: ' + String(err)))
  process.exit(0)
})