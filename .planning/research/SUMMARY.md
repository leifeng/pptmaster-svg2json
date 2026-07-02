# Research Summary: Directory Batch CLI

**Project:** svg-to-pptel v1.3
**Feature:** Directory Batch CLI (read SVG from directory, output JSON to same/different directory)
**Researched:** 2026-07-02
**Synthesized from:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

---

## Executive Summary

The directory batch CLI feature is achievable with minimal changes to the existing codebase. The core `convert()` function in `src/index.ts` is already async and handles single-file conversion correctly; the CLI just needs a new batch mode that writes outputs to files instead of stdout. **No new dependencies are required** -- Node.js built-in `fs`, existing `cac` CLI framework, and `picocolors` are sufficient.

The current directory mode is fundamentally broken: it outputs JSON to stdout for every file, making batch processing unusable (multiple JSON outputs get mixed together). The fix is NOT adding more features -- it is fixing the output mechanism. A proper batch CLI needs to write files to disk with mirrored directory structure and proper error handling.

The most critical pitfalls are: (1) output directory collisions when files have the same basename, (2) missing output directory creation causing write failures, (3) exit code always being 0 even when files fail, and (4) concurrent memory pressure on large batches. These are all addressable with straightforward mitigations documented below.

---

## Key Findings

### From STACK.md

| Technology | Recommendation | Rationale |
|------------|----------------|-----------|
| TypeScript | No change | Existing ^5.5.0 sufficient |
| fast-xml-parser | No change | Already used for SVG parsing |
| cac | Extend existing | Already supports directory input; needs `--output-dir` flag |
| picocolors | No change | Already used for CLI colors |
| Node.js fs | Use built-in | `writeFileSync` and `mkdirSync` sufficient; no `fs-extra` needed |
| p-limit | Optional future | Only add if profiling shows slowness on 100+ files |

**Key finding:** No new dependencies for MVP. Only TypeScript changes to `src/cli.ts`.

### From FEATURES.md

**Table Stakes (Must Have):**
- `--output-dir <path>` option (required when input is directory)
- Proper file output (write to disk, not stdout)
- Input -> output path mapping (mirrored directory structure)
- Don't overwrite by default (safer)
- Summary report: "Converted X/Y files" at end

**Differentiators (Should Have):**
- `--parallel <n>` for concurrent processing
- `--pattern <glob>` for file filtering
- Progress bar / file count feedback
- Dry run / `--dry-run` preview
- `--overwrite` flag for explicit overwrite behavior

**Anti-Features (Explicitly Avoid):**
- Output to stdout in batch mode (broken UX)
- Parallel by default (resource contention)
- Overwrite by default (data loss risk)

### From ARCHITECTURE.md

**Core architecture decisions:**

1. **Reuse `convert()` from `src/index.ts`** -- The async single-file converter handles SVG parsing, AST validation, transform to PPTElement, and background inference. Batch CLI only orchestrates file I/O around it.

2. **Create new batch components:**
   - `src/cli-batch.ts` -- Batch orchestration (NEW)
   - `src/batch/process-file.ts` -- Per-file processing (NEW)
   - `src/batch/manifest.ts` -- Manifest generation (NEW)

3. **Mirrored directory structure** -- Output directory mirrors input directory structure. `input/dir/foo.svg` -> `output/dir/foo.json`. This prevents filename collisions and makes outputs easy to find.

4. **Manifest as sidecar file** -- `manifest.json` written to output directory root (opt-in via `--manifest` flag). Contains per-file success/failure status for CI/CD integration.

5. **Per-file async with optional parallelism** -- Default sequential (safer, easier debugging). `transformElement()` is async due to resvg-js text measurement, but each `convert()` call initializes its own WASM context, so parallel processing is safe.

### From PITFALLS.md

**Critical pitfalls to avoid:**

| ID | Pitfall | Mitigation |
|----|---------|------------|
| P-11 | Output file naming collisions (same basename in different subdirs) | Mirror source directory structure in output |
| P-12 | `--output` with directory input semantics error | Allow `--output dir` when input is directory |
| P-13 | Concurrent file system pressure (1000+ files) | Use bounded concurrency pool (p-limit with n=4-8) |
| P-14 | Exit code always 0 even on partial failure | Exit 1 when errorCount > 0 |
| P-15 | Missing output directory creation | `mkdirSync(dir, { recursive: true })` before writing |
| P-18 | Recursive walk symlink loops | Use `lstatSync` or track visited inodes |

**Moderate pitfalls:**

| ID | Pitfall | Mitigation |
|----|---------|------------|
| P-16 | No progress feedback for large batches | Show "Processing [N/M]: filename" |
| P-17 | Mixing stdout and stderr | Consistent output channel; stderr only for fatal |
| P-19 | Large single file (50MB SVG) causes OOM | Add --max-file-size flag, skip files > 10MB |

---

## Implications for Roadmap

### Suggested Phase Structure

**Phase 1: Batch CLI Foundation**
- **Rationale:** The current directory mode is broken. Fix the output mechanism first before adding features.
- **Deliverables:**
  - Add `--output-dir <path>` option to CLI
  - Write JSON files to output directory (not stdout)
  - Mirror input directory structure in output
  - Create output directories with `mkdirSync({ recursive: true })`
  - Fix exit code: exit 1 when any file fails
  - Basic summary: "Converted N/M files"
- **Pitfalls to avoid:** P-11 (collision), P-14 (exit code), P-15 (dir creation)
- **Research flag:** Standard patterns -- no deep research needed

**Phase 2: Parallel Processing**
- **Rationale:** Sequential processing is fine for <50 files. After basic batch works, add concurrency for larger directories.
- **Deliverables:**
  - Add `--parallel <n>` flag with `p-limit` (default: sequential)
  - Bounded concurrency pool (4-8 concurrent conversions)
  - Per-file progress output: "Processing [3/50]: foo.svg..."
- **Pitfalls to avoid:** P-13 (memory pressure), P-16 (no progress feedback)
- **Research flag:** May need research on optimal concurrency limit for resvg-js WASM contexts

**Phase 3: Robustness and Polish**
- **Rationale:** Make the tool production-ready for CI/CD and large batches.
- **Deliverables:**
  - `--manifest` flag to generate `manifest.json` sidecar
  - `--continue-on-error` flag (default: true for batch)
  - `--follow-symlinks` flag for symlink handling
  - `--quiet` flag for CI mode
  - `--max-file-size` flag to skip oversized SVGs
  - Handle P-18 (symlink loops), P-19 (large file OOM)
- **Pitfalls to avoid:** P-18, P-19
- **Research flag:** Standard patterns -- no deep research needed

**Phase 4: Advanced Filtering (Optional)**
- **Deliverables:**
  - `--pattern <glob>` for file filtering
  - `--dry-run` preview mode
  - `--preserve-structure` flag
- **Research flag:** Standard patterns

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new dependencies needed; existing tools sufficient |
| Features | HIGH | Table stakes well-understood from CLI conventions |
| Architecture | HIGH | Clear integration points; reuse strategy well-defined |
| Pitfalls | HIGH | Batch CLI pitfalls well-documented; PPTist pitfalls not relevant for this feature |

**Overall:** HIGH

The feature is straightforward: layer directory walking and file output on top of existing `convert()`. No new dependencies, no schema changes, no complex integration. Confidence is high based on clear existing implementation and standard CLI patterns.

**Gaps to Address:**
- None identified. All critical paths have clear guidance.

---

## Sources

- `src/cli.ts` -- Existing CLI with `walkDir()` and directory handling
- `src/index.ts` -- `convert()` async function (core API to reuse)
- `src/transformer/transform-to-pptel.ts` -- `transformElement()` async (reason for async)
- `src/text-measurer.ts` -- WASM initialization pattern
- `package.json` -- Dependencies (`cac`, `fast-xml-parser`, `@resvg/resvg-js`)
- CLI design conventions: `ffmpeg`, `imagemagick`, `sharp` CLI patterns
- Node.js built-in `fs` documentation

---

*Research synthesis for: svg-to-pptel v1.3 directory batch CLI*
*Synthesized: 2026-07-02*
