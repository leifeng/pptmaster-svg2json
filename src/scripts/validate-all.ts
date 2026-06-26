import { readdirSync, statSync, readFileSync } from 'fs'
import { join, extname } from 'path'
import pc from 'picocolors'
import { convert } from '../index'

export interface ValidationResult {
  file: string
  success: boolean
  error?: string
  elementCount?: number
}

export interface ValidationReport {
  timestamp: string
  total: number
  success: number
  failed: number
  successRate: string
  failures: Array<{ file: string; error: string }>
  elementStats: {
    min: number
    max: number
    avg: number
  }
}

function walkDir(dir: string): string[] {
  const files: string[] = []
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      try {
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          const subFiles = walkDir(fullPath)
          files.push(...subFiles)
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
            // svg_output doesn't exist in this directory
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

export async function validateAll(): Promise<ValidationReport> {
  const projectRoot = join(__dirname, '../..')
  const examplesDir = join(projectRoot, 'examples')

  const svgOutputDirs = findSvgOutputDirs(examplesDir)

  if (svgOutputDirs.length === 0) {
    console.error(pc.yellow('No svg_output directories found in examples/'))
  } else {
    console.error(pc.cyan('Found ' + svgOutputDirs.length + ' svg_output directories'))
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
    return {
      timestamp: new Date().toISOString(),
      total: 0,
      success: 0,
      failed: 0,
      successRate: '0%',
      failures: [],
      elementStats: { min: 0, max: 0, avg: 0 },
    }
  }

  console.error(pc.cyan('Processing ' + allFiles.length + ' SVG files...'))

  const results: ValidationResult[] = []
  let successCount = 0
  let failCount = 0
  const failures: Array<{ file: string; error: string }> = []
  const elementCounts: number[] = []

  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i]
    const progress = String(i + 1) + '/' + allFiles.length

    try {
      const content = readFileSync(file, 'utf-8')
      const result = await convert(content)

      if (result.success) {
        successCount++
        if (result.elementCount !== undefined) {
          elementCounts.push(result.elementCount)
        }
        results.push({
          file,
          success: true,
          elementCount: result.elementCount,
        })
      } else {
        failCount++
        failures.push({ file, error: result.error || 'Unknown error' })
        results.push({
          file,
          success: false,
          error: result.error,
        })
      }
    } catch (err) {
      failCount++
      const errorMsg = 'File read error: ' + String(err)
      failures.push({ file, error: errorMsg })
      results.push({
        file,
        success: false,
        error: errorMsg,
      })
    }

    const statusColor = results[results.length - 1].success ? pc.green('OK') : pc.red('FAIL')
    console.error(pc.gray('[' + progress + '] ' + statusColor + ' ' + file))
  }

  const elementStats = {
    min: elementCounts.length > 0 ? Math.min(...elementCounts) : 0,
    max: elementCounts.length > 0 ? Math.max(...elementCounts) : 0,
    avg: elementCounts.length > 0 ? Math.round(elementCounts.reduce((a, b) => a + b, 0) / elementCounts.length) : 0,
  }

  console.error('')
  console.error(pc.cyan('=== Validation Summary ==='))
  console.error('Total files: ' + pc.bold(String(allFiles.length)))
  console.error(pc.green('Success') + ': ' + successCount)
  console.error(pc.red('Failed') + ': ' + failCount)
  const rate = (successCount / allFiles.length) * 100
  const rateColor = rate > 90 ? pc.green : pc.yellow
  console.error('Success rate: ' + rateColor(rate.toFixed(1) + '%'))

  if (elementCounts.length > 0) {
    console.error('')
    console.error(pc.cyan('Element Statistics:'))
    console.error('  Min: ' + elementStats.min + ', Max: ' + elementStats.max + ', Avg: ' + elementStats.avg)
  }

  if (failures.length > 0) {
    console.error('')
    console.error(pc.red('=== Failures ==='))
    for (const f of failures) {
      console.error(pc.red('FAIL') + ': ' + f.file)
      console.error('       ' + f.error)
    }
  }

  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    total: allFiles.length,
    success: successCount,
    failed: failCount,
    successRate: rate.toFixed(1) + '%',
    failures,
    elementStats,
  }

  return report
}

validateAll().then((report) => {
  console.log(JSON.stringify(report, null, 2))
  process.exit(0)
}).catch((err) => {
  console.error(pc.red('Fatal error: ' + String(err)))
  process.exit(0)
})