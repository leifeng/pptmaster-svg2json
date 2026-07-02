# Phase 7: Batch CLI Foundation - Research

**Researched:** 2026-07-02
**Domain:** Node.js CLI batch file processing
**Confidence:** HIGH

## Summary

Phase 7 implements directory batch conversion for the svg-to-pptel CLI. The existing `src/cli.ts` already contains `walkDir()` and `processFile()` infrastructure; the primary task is redirecting the directory-mode output from stdout printing to file writes (`input.svg` -> `input.svg.json`). All decisions are locked in CONTEXT.md, and the implementation is confined to modifying the directory processing branch in `cli.ts` lines 73-103.

**Primary recommendation:** Modify only the directory loop body (lines 85-96) to replace `console.log` calls with `writeFileSync` calls. No new dependencies, no new modules.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-38:** JSON output to same directory, `.json` suffix: `input.svg` -> `input.svg.json`
- **D-39:** Write `convert()` result directly — no metadata wrapper
- **D-40:** Silent conversion, only final `Converted N files, M failed` summary
- **D-45:** Exit code 0 even on partial failures
- **D-46:** Plain text stderr — no JSON summary

### Already Implemented (confirm before changing)

- **D-41:** `--output` forbidden with directory input (line 68-70)
- **D-42:** `-r` recursive mode supported (`walkDir` line 41-42)
- **D-43:** Empty directory prints `No SVG files found.` (line 77)
- **D-44:** Failures don't stop the batch (line 85-96 loop continues)

### Claude's Discretion

- `processFile()` error detail level (currently only shows "File read error")
- `walkDir()` file ordering (current: undefined/insertion order)

### Deferred Ideas

None.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BATCH-01 | Directory path as input | Existing — `cac` handles `<input>` argument, `isDirectory()` check (line 73) |
| BATCH-02 | Read all `.svg` files from directory | Existing — `walkDir()` (line 35-54) filters `.svg` extension |
| BATCH-03 | Convert each SVG, save as `.json` in same directory | **Change needed:** replace `console.log(result.output)` (line 89) with `writeFileSync(filePath + '.json', ...)` |
| BATCH-04 | Overwrite existing JSON files | `writeFileSync` without existence check — already overwrites |
| BATCH-05 | "Converted N files, M failed" summary | **Change needed:** update format to match D-40 (silent during, not per-file) |
| BATCH-06 | Failed conversions skip without stopping | Existing — loop has no early exit on failure |
| BATCH-07 | Invalid SVG logged with error, skipped | Existing — `processFile()` returns error, loop logs via `console.error` |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CLI argument parsing | Node.js runtime | — | `cac` library handles argv |
| Directory traversal | Node.js runtime | — | `fs.readdirSync` + `fs.statSync` in `walkDir()` |
| SVG to JSON conversion | API layer | — | `convert()` in `src/index.ts` |
| JSON file writing | Node.js runtime | — | `fs.writeFileSync` — sync is appropriate for batch |
| Progress/error reporting | Node.js runtime | — | `console.log`/`console.error` via `picocolors` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ^5.5.0 | Language | Project baseline |
| Node.js | 20.x | Runtime | LTS, already in use |
| cac | ^6.7.14 | CLI argument parsing | Already in use, lightweight |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| picocolors | ^1.1.1 | Terminal colors | Existing — used for error/success coloring |
| uuid | ^14.0.1 | Slide ID generation | Already used by `convert()` |

### No New Dependencies Required

The implementation requires only changes to `src/cli.ts`. All required APIs (`fs.readFileSync`, `fs.writeFileSync`, `fs.readdirSync`, `fs.statSync`) are built-in Node.js modules.

## Architecture Patterns

### System Architecture Diagram

```
User runs: svg2pptel ./my-svgs [-r]
    |
    v
cac parses args --> <input> = "./my-svgs"
    |
    v
isDirectory("./my-svgs") = true
    |
    v
walkDir("./my-svgs", recursive) --> ["./a.svg", "./b.svg", "./c.svg"]
    |
    v
for each SVG file:
    |
    +-- processFile(file):
    |       readFileSync(file, 'utf-8')
    |           --> convert(svgContent)
    |               --> parseSvg() --> transformToPPTElement()
    |               --> returns { success, output: JSONstring, error? }
    |
    +-- writeFileSync(file + '.json', output, 'utf-8')
    |       (only if success=true)
    |
    +-- console.error(pc.red(`Error [${file}]: ...`))
            (only if success=false)
    |
    v
console.error(pc.cyan(`Converted N files, M failed`))
    |
    v
process.exit(0)
```

### Recommended Project Structure

No structural changes. Existing structure already supports this phase.

```
src/
├── cli.ts          <-- PRIMARY CHANGE (lines 73-103)
├── index.ts        <-- convert() - unchanged
├── parser/         <-- SVG parsing - unchanged
├── transformer/   <-- SVG-to-PPTElement transform - unchanged
└── ...
```

### Pattern: Synchronous Batch File Processing

**What:** Sequential file-by-file read-convert-write loop using sync I/O.
**When to use:** Batch CLI tools where order guarantees and simplicity outweigh throughput.
**Example:**
```typescript
// Current (prints to stdout):
for (const file of svgFiles) {
  const result = await processFile(file)
  if (result.success && result.output) {
    console.log(pc.cyan(`[${file}]`) + ':')
    console.log(result.output)  // <-- change to writeFileSync
  }
}

// New (writes to .json files):
for (const file of svgFiles) {
  const result = await processFile(file)
  if (result.success && result.output) {
    const jsonPath = file + '.json'
    writeFileSync(jsonPath, result.output, 'utf-8')
    successCount++
  } else {
    console.error(pc.red(`Error [${file}]: ${result.error}`))
    errorCount++
  }
}
```

### Anti-Patterns to Avoid

- **Async parallel file writes:** `Promise.all(writeFile(...))` — adds complexity without benefit for a batch CLI; sync write is simpler and sufficient.
- **Writing JSON with `error` field:** Per D-39, only `convert()` result `output` string is written — no wrapping with metadata.
- **Changing the single-file mode:** Single file mode (lines 104-118) is out of scope — it uses stdout or `--output` as before.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI argument parsing | Custom argv parsing | `cac` | Already in use, handles `--help`, `--version`, error messages |
| File existence check before write | `stat` + conditional write | `writeFileSync` directly | D-44 specifies overwrite; extra syscall is wasted |
| Directory traversal | Custom recursive scanner | Existing `walkDir()` | Already filters `.svg`, handles permission errors |

**Key insight:** This phase is a modification of existing code, not a new subsystem. `walkDir()` and `processFile()` are already battle-tested.

## Common Pitfalls

### Pitfall 1: Forgetting `--output` is forbidden with directory input
**What goes wrong:** User runs `svg2pptel dir --output foo`, gets a confusing error.
**Why it happens:** The check at line 68-70 catches this, but if someone removes it during refactoring, the output would be silently wrong (multiple files writing to one path).
**How to avoid:** Keep the existing guard. It's already there.
**Warning signs:** Any diff removing lines 68-70.

### Pitfall 2: Writing `undefined` to file when `convert()` fails silently
**What goes wrong:** `result.success=false` but code still calls `writeFileSync(..., undefined, ...)`.
**Why it happens:** The condition `result.success && result.output` guards this, but if the guard is removed or weakened.
**How to avoid:** Always check `result.success && result.output` before writing.
**Warning signs:** `.json` files containing `undefined` string.

### Pitfall 3: Exit code non-zero on partial failure
**What goes wrong:** Python caller sees non-zero exit and assumes total failure.
**Why it happens:** `process.exit(1)` in single-file error path (line 109) should not propagate to directory mode.
**How to avoid:** Directory mode already has explicit `process.exit(0)` at line 103 after the loop.
**Warning signs:** Any change to the exit code in directory mode.

## Code Examples

### The One Change: Directory Loop Body (before -> after)

**Before (current `src/cli.ts` lines 85-96):**
```typescript
for (const file of svgFiles) {
  const result = await processFile(file)
  if (result.success && result.output) {
    console.log(pc.cyan(`[${file}]`) + ':')
    console.log(result.output)
    successCount++
  } else {
    console.error(pc.red(`Error [${file}]: ${result.error}`))
    errorCount++
    errors.push(file)
  }
}
```

**After (required change):**
```typescript
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
```

**Summary line update (current line 98 -> after):**
```typescript
// Current:
console.error(pc.cyan(`\nConverted ${successCount}/${svgFiles.length} files`))

// After (D-40 format):
console.error(pc.cyan(`Converted ${successCount} files, ${errorCount} failed`))
```

### File Write with Overwrite (built-in `fs.writeFileSync`)

```typescript
// Source: Node.js fs documentation (built-in)
// writeFileSync(path, data, encoding)
// - Creates file if doesn't exist
// - Overwrites if exists (per BATCH-04 requirement)
// - Throws on directory-not-found, permission denied
import { writeFileSync } from 'fs'

const jsonPath = file + '.json'  // D-38: same dir, .json suffix
writeFileSync(jsonPath, result.output!, 'utf-8')
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Print JSON to stdout per file | Write JSON to `.svg.json` file | Phase 7 (this phase) | Enables batch processing; stdout freed for progress |
| Per-file status line `[filename]:` | Silent during conversion | Phase 7 (this phase) | Cleaner output, Python integration via stderr parse |

**No deprecated approaches in this phase.**

## Assumptions Log

> All claims verified from codebase reading or package.json — none are `[ASSUMED]`.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `writeFileSync` overwrites existing files without extra `stat` call | Common Pitfalls | Low — documented Node.js behavior |
| A2 | `processFile()` always returns either `output` string or `error` string, never both undefined | Code Examples | Low — `convert()` always returns one of these |

## Open Questions

None — all decisions are locked in CONTEXT.md and the implementation is straightforward.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | 20.19.0 | — |
| TypeScript | Type checking | Yes | 5.5.0 | — |
| npm | Package install | Yes | 10.8.2 | — |
| cac | CLI parsing | Yes | 6.7.14 | — |
| picocolors | Terminal colors | Yes | 1.1.1 | — |

**All dependencies satisfied. No blockers.**

## Validation Architecture

> Skipped — `workflow.nyquist_validation` is `false` in `.planning/config.json`.

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | No | File read/write scoped to user-provided path |
| V5 Input Validation | Yes | `convert()` validates SVG root and dimensions before processing |

**Applicable threat:** Path traversal via malicious `input.svg` filename — mitigated by Node.js `fs` API which does not interpret paths specially.

## Sources

### Primary (HIGH confidence)
- `src/cli.ts` — existing CLI implementation, `walkDir()` and `processFile()` lines 35-124
- `src/index.ts` — `convert()` function returning `{ success, output, error }`
- `package.json` — dependency versions verified via `npm view`

### Secondary (MEDIUM confidence)
- Node.js `fs.writeFileSync` behavior — well-documented built-in, synchronous overwrite semantics
- `cac` v6.7.14 argument parsing — already integrated and tested in existing CLI

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies pre-existing, no new packages needed
- Architecture: HIGH — single-loop modification, existing patterns
- Pitfalls: HIGH — all pitfalls are deviations from the existing correct implementation

**Research date:** 2026-07-02
**Valid until:** 2026-08-01 (stable domain, no fast-moving libraries)
