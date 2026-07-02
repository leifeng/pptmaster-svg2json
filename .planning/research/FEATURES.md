# Feature Landscape: Directory Batch CLI

**Domain:** File conversion CLI tool (SVG to PowerPoint element JSON)
**Project:** svg-to-pptel v1.3
**Feature:** Directory Batch CLI
**Researched:** 2026/07/02

## Current CLI State

The existing CLI (`src/cli.ts`) already supports directory input via `walkDir()` and `--recursive`, but has a critical flaw: it outputs JSON to stdout for every file, which is unusable for batch operations (multiple JSON outputs mixed together).

```
Current behavior for directory:
  svg2pptel dir --recursive
  → Outputs JSON #1 to stdout
  → Outputs JSON #2 to stdout  (mixed together, unusable)
```

## Table Stakes (Expected/Mandatory)

These features are standard for batch conversion CLIs. Missing them = tool feels broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| `--output-dir <path>` | Batch creates multiple files; stdout is wrong | Low | Critical gap in current implementation |
| Input directory detection | Auto-detect directory vs file | Low | Already exists in current CLI |
| `--recursive` flag | Process nested directories | Low | Already exists |
| Output file naming | Map input names to output names | Low | `.svg` -> `.json` is standard |
| Error tolerance | One bad file shouldn't abort batch | Low | Current CLI already exits 0 on partial failure |
| Help text / usage examples | Discoverability | Low | CAC handles this automatically |

## Nice-to-Have (Differentiators)

Features that set batch tools apart but aren't strictly required.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `--parallel <n>` | Speed up large batches via concurrency | Medium | Node.js `p-limit` or worker threads |
| `--pattern <glob>` | Filter which files to process | Low | E.g., `*.svg`, `icon-*.svg` |
| Preserve directory structure | Match input hierarchy in output dir | Medium | Need path mapping logic |
| Progress bar / file count | Feedback during long batches | Low | `picocolors` already in use |
| Dry run / `--dry-run` | Preview what would be converted | Low | Skip actual conversion, show file list |
| `--overwrite` flag | Explicit overwrite behavior | Low | Safer default: don't overwrite |
| Summary report | Show success/failure counts at end | Low | Partial implementation exists |

## Anti-Features (Explicitly Avoid)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Output to stdout in batch mode | Broken UX - outputs get mixed | Require `--output-dir` for directory input |
| Parallel by default | Can cause resource contention, nondeterministic output order | Require explicit `--parallel` flag |
| Overwrite by default | Data loss risk | Default to skip existing, require `--overwrite` |
| Convert subdirectories flat | Loses organization | `--preserve-structure` flag |

## Feature Dependencies

```
Directory Batch CLI
├── Existing: convert() function (src/index.ts) — works on string input
├── Existing: walkDir() function (src/cli.ts) — file discovery
├── Existing: isDirectory() (src/cli.ts) — type detection
└── NEW: Output directory handling
    ├── Map input path to output path
    ├── Create output directories as needed
    └── Write JSON files to output dir
```

## MVP Recommendation

For the batch CLI feature, implement in this order:

**Must have (MVP):**
1. `--output-dir <path>` option (required when input is directory)
2. Proper file output (write to disk, not stdout)
3. Input -> output path mapping (e.g., `input/foo/bar.svg` -> `output/foo/bar.json`)
4. Don't overwrite by default (safer)
5. Summary: "Converted X/Y files" at end

**Can defer:**
- `--parallel` flag (simple sequential is fine for MVP)
- `--pattern` glob filtering (can be done via shell glob: `svg2pptel dir/*.svg`)
- `--preserve-structure` (can default to ON)
- Dry run mode

## Complexity Notes

### Low Complexity
- `--output-dir` option: straightforward CAC option
- Path mapping: `path.relative()` + `path.join(outputDir, relativePath)` with `.json` extension
- Directory creation: `fs.mkdirSync(dir, { recursive: true })`

### Medium Complexity
- `--parallel`: Use `p-limit` package to control concurrency
- Preserve structure: Handle path separators cross-platform

## Key Insight

The current directory mode is fundamentally broken (outputs to stdout). The fix is not adding more features -- it's fixing the output mechanism. A proper batch CLI needs to write files to disk, not stdout.

## Sources

- Standard CLI patterns: `ffmpeg`, `imagemagick`, `sharp` CLI conventions
- Node.js best practices: `p-limit` for concurrency control
- Current implementation: `src/cli.ts` (existing directory support is reference)