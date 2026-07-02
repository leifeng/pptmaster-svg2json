# Stack Research: Directory Batch CLI

**Project:** svg-to-pptel v1.3+ directory batch CLI
**Focus:** Stack additions/changes for directory batch processing (read SVG from dir, output JSON to same dir)
**Researched:** 2026-07-02
**Confidence:** HIGH

## Executive Summary

**No new dependencies required.** The existing Node.js `fs` module, `cac` CLI framework, and `picocolors` are sufficient. The directory batch CLI feature is achievable through TypeScript implementation using existing APIs. The only meaningful addition is an optional progress bar library if concurrent processing is desired.

## Existing Stack (Sufficient for Batch CLI)

| Technology | Version | Purpose | Status for Batch CLI |
|------------|---------|---------|---------------------|
| TypeScript | ^5.5.0 | Language | No change |
| fast-xml-parser | ^5.9.3 | SVG parsing | No change |
| cac | ^6.7.14 | CLI framework | Already supports directory input; needs `--batch` flag |
| picocolors | ^1.1.1 | CLI colors | Already used; sufficient for batch output formatting |
| uuid | ^14.0.1 | ID generation | No change |
| Node.js fs | built-in | File I/O | Sufficient; no `fs-extra` needed |

## What's Already Implemented

Reviewing `src/cli.ts`:

| Feature | Status | Notes |
|---------|--------|-------|
| Directory detection | Done | `isDirectory()` using `statSync` |
| Recursive walk | Done | `walkDir()` with `readdirSync` |
| SVG filtering | Done | `extname(entry).toLowerCase() === '.svg'` |
| File reading | Done | `readFileSync(filePath, 'utf-8')` |
| Async convert call | Done | `await convert(content)` |
| Error handling | Done | Partial failure handling with `successCount`/`errorCount` |

## What's Missing for Same-Directory Output

The current CLI only **prints** JSON to stdout for directory mode (line 88-90). To write JSON files to the same directory:

| Missing | Implementation | No Library Needed Because |
|---------|----------------|--------------------------|
| Output path calculation | `outputPath = svgPath.replace(/\.svg$/i, '.json')` | Simple string manipulation |
| File write | `writeFileSync(outputPath, json, 'utf-8')` | Node.js built-in fs |
| `--batch` flag | Add to cac command options | Existing cac pattern |
| Overwrite confirmation | Prompt or `--force` flag | Simple prompt with `readline` or `cac` confirm |

## Optional Enhancement: Concurrent Processing

For large directories (100+ files), sequential processing may be slow.

| Option | Library | When to Use | Why |
|--------|---------|-------------|-----|
| Native Promise.all | built-in | < 50 files | Simple, no library |
| p-limit | ^5.0.0 | > 50 files, limit concurrency | Prevents memory pressure |
| ora | ^8.0.0 | Any batch size | Progress spinner during processing |

**Recommendation:** Start without concurrency. Add `p-limit` only if profiling shows slowness.

## Proposed CLI Changes

### New Options (via cac)

```typescript
// Add to existing cac command
.option('--batch', 'Write output JSON files to same directory as input SVGs')
.option('--force', 'Overwrite existing JSON files without prompting')
```

### Integration with Existing Code

| File | Change |
|------|--------|
| `src/cli.ts` | Add batch output logic after line 86; use `writeFileSync` |

### Data Flow

```
Input dir → walkDir() → [file1.svg, file2.svg, ...]
                              ↓
                    convert(svgContent)
                              ↓
                    JSON string output
                              ↓
                    writeFileSync(fileN.json)
```

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `fs-extra` | Overkill — only need `writeFileSync` | Node.js built-in fs |
| `globby` or `fast-glob` | Current extname filtering is sufficient | `extname()` check |
| `commander` or `yargs` | cac already in use | Extend existing cac setup |
| `chalk` or `kleur` | picocolors already in use | Extend existing picocolors |
| `dotenv` or `conf` | Single binary, no config file needed | CLI flags |

## Minimal Change Set

For batch output to same directory:

```typescript
// No new dependencies
// Only TypeScript changes to src/cli.ts
```

Changes:
1. Add `--batch` option to cac command
2. Add `--force` option for overwrite control
3. In directory processing loop, replace `console.log(result.output)` with `writeFileSync`

## Concurrent Processing (Optional Future)

Only if needed after testing:

```json
{
  "dependencies": {
    "p-limit": "^5.0.0"
  }
}
```

**When to add:** Profile a 100+ file directory and find sequential processing too slow.

## Sources

- `src/cli.ts` — Existing CLI implementation with directory walk
- `src/index.ts` — `convert()` function already returns JSON string
- Node.js built-in `fs` documentation

---

*Stack research for: svg-to-pptel v1.3 directory batch CLI*
*Researched: 2026-07-02*