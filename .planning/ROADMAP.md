# Roadmap — svg-to-pptel

## Milestones

- ✅ **v1.3** — resvg-js Text Measurement (2026-07-01)
- 🚧 **v1.4** — Directory Batch CLI (planned)

---

## Progress

| Phase | Milestone | Status | Completed |
|-------|-----------|--------|-----------|
| Phase 6 | v1.3 | Complete | 2026-07-01 |
| Phase 7 | v1.4 | Pending | — |

---

## Phase 7: Batch CLI Foundation

**Goal:** Implement directory batch conversion CLI — read SVG files from directory, convert each to JSON, save to same directory with .json extension.

**Requirements:** BATCH-01, BATCH-02, BATCH-03, BATCH-04, BATCH-05, BATCH-06, BATCH-07

**Success Criteria:**
1. User can pass a directory path as CLI argument
2. CLI discovers all .svg files in the directory
3. Each SVG is converted using existing `convert()` function
4. JSON output is written to the same directory with .json extension
5. Existing JSON files are overwritten
6. Summary output shows "Converted N files, M failed" at end
7. Failed conversions are skipped with error logging, batch continues

**Files to Create/Modify:**
- `src/cli.ts` — Add batch directory mode logic

**Dependencies:**
- `src/index.ts` — `convert()` async function (existing)
- `src/cli.ts` — `walkDir()` function (existing)

**Risks:**
- None identified — core conversion logic already exists

---
*Roadmap updated: 2026-07-02 after v1.4 roadmap creation*
