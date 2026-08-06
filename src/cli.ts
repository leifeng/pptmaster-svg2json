import cac from 'cac'
import pc from 'picocolors'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'
import { convert } from './index'
import { verifyFontLoaded } from './font-validator'

const cli = cac('svg2json')

cli.command('<input>', 'SVG file or directory to convert')
  .option('-o, --output <path>', 'Output file path (default: stdout)')
  .option('-r, --recursive', 'Process directories recursively')
  .example('svg2json input.svg')
  .example('svg2json input.svg -o output.json')
  .example('svg2json dir --recursive')

cli.help()
const parsed = cli.parse()

const options = parsed.options
const input = parsed.args[0]

if (!input) {
  cli.outputHelp()
  process.exit(1)
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

function walkDir(dir: string, recursive: boolean): string[] {
  const files: string[] = []
  try {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry)
      try {
        if (statSync(fullPath).isDirectory() && recursive) {
          files.push(...walkDir(fullPath, recursive))
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

async function processFile(filePath: string): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const result = await convert(content, { svgFilePath: filePath })
    return result
  } catch (err) {
    return { success: false, error: `File read error: ${String(err)}` }
  }
}

async function main() {
  // D-01: font validation gate — must run before any directory check,
  // file read, or convert() call. A missing or invalid font must never
  // reach the resvg-js measurement pipeline (where it would silently
  // fall back to a built-in font and break width alignment with PPTist).
  const v = verifyFontLoaded()
  if (!v.ok) {
    const detail = v.error ?? 'unknown font validation error'
    console.error(pc.red(`Error: ${detail}`))
    process.exit(1)
  }

  // Error if --output used with directory input
  if (options.output && isDirectory(input)) {
    console.error(pc.red('Error: --output cannot be used with directory input (single file holds one result)'))
    process.exit(1)
  }

  if (isDirectory(input)) {
    // Directory processing
    const svgFiles = walkDir(input, !!options.recursive)
    if (svgFiles.length === 0) {
      console.error(pc.yellow('No SVG files found.'))
      process.exit(0)
    }

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const file of svgFiles) {
      const result = await processFile(file)
      if (result.success && result.output) {
        const jsonPath = file + '.json'
        writeFileSync(jsonPath, result.output, 'utf-8')
        successCount++
      } else {
        console.error(pc.red(`Error [${file}]: ${result.error}`))
        errorCount++
        errors.push(file)
      }
    }

    console.error(pc.cyan(`Converted ${successCount} files, ${errorCount} failed`))
    if (errorCount > 0) {
      console.error(pc.red(`Failed: ${errors.join(', ')}`))
    }
    // Exit 0 even on partial failure per RESEARCH.md recommendation
    process.exit(0)
  } else {
    // Single file processing
    const result = await processFile(input)
    if (!result.success) {
      console.error(pc.red(`Error: ${result.error}`))
      process.exit(1)
    }
    const outputPath = options.output || (input + '.json')
    writeFileSync(outputPath, result.output!, 'utf-8')
    console.error(pc.green(`Written to ${outputPath}`))
    process.exit(0)
  }
}

main().catch((err) => {
  console.error(pc.red(`Fatal error: ${String(err)}`))
  process.exit(1)
})

export { run }
function run(args: string[] = process.argv) {
  cli.parse(args)
}