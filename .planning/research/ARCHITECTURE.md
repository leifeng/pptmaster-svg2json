# Architecture Research: Directory Batch CLI Integration

**Project:** svg-to-pptel v1.x — Directory Batch CLI
**Researched:** 2026-07-02
**Confidence:** HIGH

## Executive Summary

The existing CLI (`src/cli.ts`) already has basic directory walking and recursive flag support, but lacks proper batch output handling. Directory mode outputs results to stdout without saving to files, making it impractical for real batch workflows. The fix is NOT to rewrite the CLI but to add a new batch-specific command (`batch`) that saves outputs to a specified directory with manifest tracking.

**Key insight:** The existing `convert()` async function from `src/index.ts` handles single-file conversion perfectly. Batch CLI layers directory walking, parallel processing, and file output on top of it. No changes needed to the core library.

## Current Architecture

```
src/
  cli.ts          # CAC CLI framework — entry point
  index.ts        # convert() async function — REUSE THIS
  parser/
    svg-parser.ts # SVG -> SvgElement tree
  transformer/
    transform-to-pptel.ts  # SvgElement -> PPTElement[] (async transformElement)
  text-measurer.ts # @resvg/resvg-js text measurement
  mapper/
    coordinate-mapper.ts # Transform parsing
  shapes/
    shape-to-path.ts # Path conversion utilities
```

### Existing CLI Flow (Single File)

```
CLI arg: input.svg
    ↓
readFileSync(input, 'utf-8')
    ↓
convert(svgContent) → Promise<ConvertResult>
    ↓
writeFileSync(output, result.output) OR console.log(result.output)
```

### Existing CLI Flow (Directory - CURRENTLY FLAWED)

```
CLI arg: inputDir
    ↓
walkDir(inputDir, recursive) → string[]
    ↓
for each file:
    readFileSync → convert() → console.log(output)
    ↓
console.error("Converted N/M files")
```

**Problem:** Results go to stdout, not to files. No output directory, no manifest, no parallel processing.

---

## Integration Points with Existing Code

### Reuse: `convert()` from `src/index.ts`

```typescript
// This is the async single-file converter — use as-is
export async function convert(svgContent: string, options?: ConvertOptions): Promise<ConvertResult>
```

**Why reuse:** Already handles:
- SVG parsing via `parseSvg()`
- AST validation (root svg element, valid dimensions)
- Transform to PPTElement via `transformToPPTElement()` (async)
- Background inference from first element
- Full PPTist presentation wrapping

### Extend: `src/cli.ts`

**Current command structure:**
```typescript
cli.command('<input>', 'SVG file or directory to convert')
  .option('-o, --output <path>', 'Output file path (default: stdout)')
  .option('-r, --recursive', 'Process directories recursively')
```

**Needed additions:**
- New subcommand: `svg2pptel batch <inputDir> <outputDir>` OR extended flags
- `--output-dir <path>` for batch mode
- `--manifest` flag to generate summary JSON
- `--parallel <n>` for concurrent processing (optional, nice-to-have)
- `--overwrite` flag to control existing output file behavior

### Reuse: File walking logic from `walkDir()`

```typescript
// Already in cli.ts — reuse or extract to shared utility
function walkDir(dir: string, recursive: boolean): string[]
```

**Current implementation is adequate:** Recursive directory traversal, `.svg` extension filtering, graceful error handling for unreadable entries.

---

## New Components Needed

### 1. `src/cli-batch.ts` (NEW FILE)

**Purpose:** Batch-specific CLI logic extracted from cli.ts to keep single-file and batch modes separate.

**Responsibilities:**
- Parse batch CLI arguments
- Validate input/output directories
- Orchestrate batch processing
- Generate manifest

**Interface:**
```typescript
interface BatchOptions {
  inputDir: string
  outputDir: string
  recursive: boolean
  overwrite: boolean
  manifest: boolean
  parallel?: number
}

interface BatchResult {
  success: number
  failed: number
  errors: Array<{ file: string; error: string }>
  manifestPath?: string
}

export async function runBatch(options: BatchOptions): Promise<BatchResult>
```

### 2. `src/batch/process-file.ts` (NEW FILE)

**Purpose:** Single-file processing within batch context.

**Responsibilities:**
- Read SVG file
- Call `convert()` 
- Write output JSON to corresponding path in output directory
- Handle errors per-file (don't fail entire batch)

```typescript
export async function processBatchFile(
  inputPath: string,
  outputPath: string,
  options: ConvertOptions
): Promise<{ success: boolean; error?: string }>
```

**Key behavior:** Uses existing `convert()` — no duplication of conversion logic.

### 3. `src/batch/manifest.ts` (NEW FILE)

**Purpose:** Generate batch processing summary.

```typescript
export interface ManifestEntry {
  input: string      // relative path from input dir
  output: string    // relative path to output JSON
  status: 'success' | 'failed'
  error?: string
  elementCount?: number
  processedAt: string  // ISO timestamp
}

export interface Manifest {
  processedAt: string
  total: number
  success: number
  failed: number
  entries: ManifestEntry[]
}

export function writeManifest(manifest: Manifest, outputPath: string): void
```

---

## Data Flow Changes

### New Batch Processing Flow

```
CLI args: svg2pptel inputDir -o outputDir --recursive --manifest
    ↓
[cli-batch.ts] runBatch()
    ↓
walkDir(inputDir, recursive) → svgFiles[]
    ↓
For each svgFile (parallel or sequential):
    ↓
    [process-batch-file.ts]
    ├─ readFileSync(svgFile)
    ├─ convert(content) → result
    ├─ derive outputPath: inputDir/svgFile.svg → outputDir/svgFile.json
    └─ if success: writeFileSync(outputPath, result.output)
    ↓
Collect results → Manifest
    ↓
writeFileSync(outputDir/manifest.json, manifest)
    ↓
console.log summary: "Converted N/M files"
```

### Output Directory Structure

```
inputDir/
  ├── foo.svg
  ├── bar.svg
  └── subdir/
      └── baz.svg

outputDir/ (created if not exists)
  ├── foo.json
  ├── bar.json
  ├── subdir/
  │   └── baz.json
  └── manifest.json (if --manifest)
```

**Design decision:** Mirror input directory structure in output directory. This makes it easy to find corresponding outputs and handle nested directories.

---

## Suggested Build Order

### Phase 1: Batch CLI Foundation (Low Risk)

1. **Extract `processBatchFile()` from `cli.ts`**
   - Create `src/batch/process-file.ts`
   - Reuse `convert()` from `src/index.ts`
   - Handle per-file errors

2. **Add `--output-dir` flag to existing CLI**
   - When input is directory AND `--output-dir` is specified:
     - Process files and write to output directory
     - Keep stdout for summary only
   - Existing single-file behavior unchanged

3. **Add manifest generation**
   - Create `src/batch/manifest.ts`
   - Add `--manifest` flag
   - Write `manifest.json` alongside outputs

**Verification:** `svg2pptel inputDir -o outputDir --manifest --recursive`

### Phase 2: Parallel Processing (Optional Enhancement)

4. **Add `Promise.all()` for concurrent file processing**
   - Add `--parallel <n>` flag
   - Default: sequential (safer, easier debugging)
   - At n=1: sequential; n>1: Promise.all with concurrency limit

**Note:** `transformElement()` is async due to text measurement via `@resvg/resvg-js`. Parallel processing of multiple SVGs is safe since each has its own WASM context.

### Phase 3: Polish

5. **Progress reporting**
   - Add `--verbose` flag for per-file output
   - Default: quiet except summary
   - Real-time progress: "Processing [3/50]: foo.svg"

6. **Error handling improvements**
   - `--continue-on-error` flag (default: true for batch)
   - Individual file errors don't stop the batch

---

## Key Design Decisions

### Decision 1: Mirrored Directory Structure

**Choice:** Output directory mirrors input directory structure.

**Rationale:**
- Easy to find corresponding outputs: `input/dir/foo.svg` → `output/dir/foo.json`
- Nested directories preserved
- No filename collision issues

**Alternative considered:** Flatten to single directory with subdirectory prefixes.
- Rejected: loses organization, potential filename collisions.

### Decision 2: Manifest as Sidecar File

**Choice:** `manifest.json` written to output directory root (opt-in via `--manifest`).

**Rationale:**
- Batch results are self-documenting
- Enables downstream tooling to process results
- Machine-readable summary for CI/CD

**Alternative considered:** Always generate manifest.
- Rejected: adds file even for simple single-output batches.

### Decision 3: Per-File Async with Optional Parallelism

**Choice:** Default sequential, opt-in parallel with `--parallel <n>`.

**Rationale:**
- Sequential is easier to debug and predict
- `--resvg/resvg-js` has WASM overhead per measurement — parallelism helps
- User controls resource usage

**Note:** Each `convert()` call initializes its own WASM context. Multiple concurrent conversions are safe.

### Decision 4: Error Strategy — Fail Individual, Not Batch

**Choice:** Individual file errors are recorded but don't stop the batch.

**Rationale:**
- One bad SVG shouldn't fail the entire batch
- Partial success is valuable
- Summary shows exactly which files failed and why

**Implementation:**
```typescript
try {
  const result = await convert(content)
  if (result.success) { /* write output */ }
  else { /* record error */ }
} catch (err) {
  // record error, continue to next file
}
```

---

## Anti-Patterns to Avoid

1. **Do NOT duplicate conversion logic**
   - The `convert()` function IS the conversion logic
   - Batch processing only orchestrates file I/O around it
   - Any bug fix in conversion should NOT need a batch code change

2. **Do NOT block stdout with per-file output**
   - In batch mode, stdout is reserved for summary
   - Use console.error for progress messages (or make it optional)
   - Per-file results go to files

3. **Do NOT process non-SVG files**
   - `walkDir()` already filters to `.svg` extension
   - If output extension is wrong, reject at parse time, not conversion

4. **Do NOT create empty output directories**
   - If input has no SVG files, output directory shouldn't be created
   - Exit with warning message instead

---

## Scalability Considerations

| Scale | At 100 files | At 1,000 files | At 10,000 files |
|-------|--------------|-----------------|-----------------|
| Sequential | Fine | ~30-60s | Minutes — consider parallelism |
| Parallel (4) | Fine | Faster | ~2-3x speedup |
| Memory | ~50MB | ~100MB | ~500MB+ — watch for leaks |
| manifest.json | Small | Manageable | ~1MB — acceptable |

**Note:** `text-measurer.ts` has a lazy singleton for WASM init. Each `convert()` call is independent, so parallel processing doesn't share WASM state.

---

## File Structure After Changes

```
src/
  cli.ts                    # ENTRY: CLI parsing, delegate to batch or single
  cli-batch.ts              # NEW: Batch orchestration
  index.ts                  # REUSE: convert() function
  batch/
    process-file.ts         # NEW: Per-file batch processing
    manifest.ts             # NEW: Manifest generation
  parser/
    svg-parser.ts           # REUSE: unchanged
  transformer/
    transform-to-pptel.ts   # REUSE: unchanged
  text-measurer.ts          # REUSE: unchanged
  mapper/
    coordinate-mapper.ts   # REUSE: unchanged
  shapes/
    shape-to-path.ts        # REUSE: unchanged
```

**Total new files:** 3 (`cli-batch.ts`, `batch/process-file.ts`, `batch/manifest.ts`)
**Modified files:** 1 (`cli.ts` — add batch command delegation)
**Unchanged files:** Everything else

---

## Sources

- `src/cli.ts` — existing CLI implementation with `walkDir()` and directory handling
- `src/index.ts` — `convert()` async function (the core API to reuse)
- `src/transformer/transform-to-pptel.ts` — `transformElement()` async (reason for async)
- `src/text-measurer.ts` — WASM initialization pattern (singleton per call)
- `package.json` — dependencies (`cac`, `fast-xml-parser`, `@resvg/resvg-js`)

---

*Architecture research for: svg-to-pptel v1.x directory batch CLI*
*Researched: 2026-07-02*
