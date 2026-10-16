---
phase: 18-page-data-extraction
plan: 03
subsystem: testing
tags: [e2e, fixture, page-data, v1.13, vitest]

# Dependency graph
requires:
  - phase: 18-page-data-extraction
    plan: 02
    provides: PPTBaseElement.textContent + Slide.pageData + convertOne() end-call to buildPageData (dist/ already covers full v1.13 path)
  - phase: 18-page-data-extraction
    plan: 01
    provides: src/utils/page-data.ts buildPageData() + PageData / PageDataDirectoryItem types + 34-entry CONTENT_KEY_VALUES whitelist
provides:
  - Fixture E2E test pinning v1.13 pageData injection against the real 20-slide green-art-teaching fixture set (PD-01..PD-12, PD-E2E-03, D-20 reverse 1..4, PD-E2E-04 v1.12 unchanged)
  - 16 new it() covering cover / chunk / toc directory shape / chapter / content / ending / reverse whitelist / reverse D-20..04 + contentKey sanity
affects:
  - v1.13 release gate — gates merge on real-fixture data-side coverage
  - future fixture-driven page-data work (new static fields, new N>8 behaviour)

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 2890     # chars/4 over tests/e2e/green-art-teaching-page-data.test.ts (the only file changed)
  tasks: 2         # tasks completed (Task 1 fixture regenerate + Task 2 E2E)
  commits: 1       # MEASURED: git rev-list --count gsd-plan-head-before-18-03..HEAD (E2E test commit only; SUMMARY commit will be next)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - v1.13 fixture E2E pattern: convertDir() in beforeAll + per-slide it() + reverse-assertion it() + v1.12 unchanged it()
    - content-key sanity it() at end-of-suite to keep CONTENT_KEY_VALUES import alive and detect helper regressions

key-files:
  created:
    - tests/e2e/green-art-teaching-page-data.test.ts (new — 16 it() across 4 describe blocks)
  modified: []

key-decisions:
  - "Did not commit fixture svg.json baselines to git: /exampels is .gitignore'd (line 5) and Plan 17-04 already established the 'fixture baselines do not enter git history' pattern (see commit 2cf4910 message). E2E test runs convertDir() against the on-disk fixture set in the worktree, so the test itself is the contract."
  - "Aligned fixture file naming to the convertDir implementation: convertDir writes `${svgFullPath}.svg.json` (i.e. `01_cover.svg.svg.json`), not `01_cover.svg.json`. The plan's `<files>` block referred to the simplified name; actual on-disk filenames include the extra `.svg` segment."
  - "Plan named the closing slide '05_ending' (positional) but the fixture file is `20_ending.svg`. The E2E uses the real fixture id `20_ending` so the test matches the converted slides."
  - "Cross-check pageData values against element-level textContent (PD-01..03 cross-assertion) — catches any future regression where pageData and element.textContent drift out of sync."

patterns-established:
  - "Fixture E2E in this repo now has a 3-block template: (a) PD-positive assertions per fixture, (b) PD-E2E-03 reverse whitelist + D-20 4 reverse assertions, (c) PD-E2E-04 v1.12 unchanged cross-check. Future phases touching this contract should follow the same shape."

requirements-completed: [PD-E2E-01, PD-E2E-02, PD-E2E-03, PD-E2E-04, PD-15]

# Coverage metadata (#1602) — per-deliverable traceability for /gsd-verify-work UAT routing.
coverage:
  - id: D1
    description: "v1.13 pageData injection pinned against 5 fixture slides (01_cover / 02_toc / 03_chapter / 04_content / 20_ending) — covers PD-01..12 + PD-04 directory length 4 + PD-05 directory[0] shape"
    requirement: "PD-01..PD-12"
    verification:
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-page-data.test.ts#01_cover pageData has cover_title / cover_subtitle / cover_author (PD-01..03)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-page-data.test.ts#02_toc pageData.directory.length === 4 (PD-04)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-page-data.test.ts#02_toc pageData.directory[0] has index/title/desc (PD-05)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-page-data.test.ts#03_chapter pageData has chapter_number / chapter_title / chapter_desc (PD-06..08)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-page-data.test.ts#04_content pageData has content_title / content_subtitle (PD-09..10)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-page-data.test.ts#20_ending pageData has end_title / end_subtitle (PD-11..12)"
        status: pass
    human_judgment: false
  - id: D2
    description: "PD-E2E-03 reverse whitelist — pageData static field keys ⊆ 10 static fields ∪ {directory} across all 20 slides"
    requirement: "PD-E2E-03"
    verification:
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-page-data.test.ts#all 20 slides pageData static field keys ⊆ STATIC_PAGE_DATA_KEYS ∪ {directory} (PD-E2E-03)"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-20 four reverse assertions: no N>=5 directory index / directory items contain exactly {index,title,desc} / textContent locked to contentKey presence / non-PPTTextElement does not carry textContent"
    requirement: "PD-15 + D-20"
    verification:
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-page-data.test.ts#D-20 reverse 1: no N>=5 directory index in any slide pageData (PD-04 scope)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-page-data.test.ts#D-20 reverse 2: directory items contain exactly {index, title, desc}"
        status: pass
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-page-data.test.ts#D-20 reverse 3: element.textContent locked to contentKey presence (PD-16)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-page-data.test.ts#D-20 reverse 4: non-PPTTextElement does not carry textContent (PD-16 type guard)"
        status: pass
    human_judgment: false
  - id: D4
    description: "PD-E2E-04 v1.12 contentKey injection unchanged — 01_cover contentKeys + 02_toc Row 1 + Row 2 desc contentKeys coexist with textContent (v1.12 + v1.13 dual field)"
    requirement: "PD-E2E-04"
    verification:
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-page-data.test.ts#01_cover contentKeys still equal [cover_author, cover_subtitle, cover_title]"
        status: pass
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-page-data.test.ts#02_toc Row 1 + Row 2 desc contentKeys coexist with textContent (8 entries)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-content-key.test.ts (existing v1.12 suite — 14/14 passed)"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-10-16
status: complete
---

# Phase 18 / Plan 18-03 Summary

**Pinned v1.13 pageData injection against the real 20-slide green-art-teaching fixture set with 16 reverse-and-positive assertions — zero source changes, fixture baselines validated via convertDir() in-memory.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-10-16T17:55:00Z
- **Completed:** 2026-10-16T18:03:00Z
- **Tasks:** 2 of 2 complete
- **Files modified:** 1 (new E2E test file; fixture baselines not committed — see Deviations)

## Accomplishments

- New `tests/e2e/green-art-teaching-page-data.test.ts` (16 it() across 4 describe blocks) — pins v1.13 pageData contract against the real 20-slide green-art-teaching fixture set.
- Positive coverage: PD-01..12 across 5 fixture slides (01_cover / 02_toc / 03_chapter / 04_content / 20_ending); PD-04 directory length 4; PD-05 directory[0] = `{index: '01', title, desc}`; cross-check `pageData.cover_title === element.textContent`.
- Reverse coverage: PD-E2E-03 static-keys whitelist, D-20 reverse 1 (no N>=5 index), D-20 reverse 2 (directory items contain exactly `{index,title,desc}`), D-20 reverse 3 (textContent locked to contentKey presence), D-20 reverse 4 (non-PPTTextElement does not carry textContent).
- v1.12 unchanged: 01_cover contentKeys = `[cover_author, cover_subtitle, cover_title]`; 02_toc 8 directory contentKeys (4 × `directory_item_N` + 4 × `directory_item_desc_N`) all carry textContent.
- CONTENT_KEY_VALUES sanity it() at end-of-suite guards against import-tree-shake and helper regressions.

## Task Commits

Each task was committed atomically:

1. **Task 1: 跑 convertDir 重生 5 个 fixture svg.json baseline(D-19 严格范围)** — **NO COMMIT** (see Deviations — fixture baselines not committed due to `.gitignore` + Plan 17-04 precedent)
2. **Task 2: 写 fixture E2E `tests/e2e/green-art-teaching-page-data.test.ts`** — `cd91cdf` (test)

**Plan metadata:** will be the SUMMARY commit (docs: 18-03) — to be committed next.

_Note: Plan Task 1 did not produce a commit because the fixture svg.json files are excluded from version control by the project's `.gitignore` (line 5: `/exampels`) and Plan 17-04 already established the "fixture baselines do not enter git history" pattern. The E2E test exercises convertDir() against the on-disk fixture set at test time, so the test itself is the contract — see Deviations for full justification._

## Files Created/Modified

- `tests/e2e/green-art-teaching-page-data.test.ts` — new (295 lines): 16 it() across 4 describe blocks covering PD-01..12, PD-E2E-03 reverse whitelist, D-20 4 reverse assertions, PD-E2E-04 v1.12 unchanged, CONTENT_KEY_VALUES sanity.
- `exampels/green-art-teaching/` — copied from main checkout (E:/git/svg2json/exampels/green-art-teaching/) so convertDir() can find 20 SVG fixtures. Not git-tracked (gitignored).
- `exampels/202610131101001/` — copied from main checkout for sibling E2E tests (not relevant to this plan's deliverables).

## Decisions Made

- **Did not commit the 5 fixture baselines.** The plan listed `exampels/green-art-teaching/svg_output/{01_cover,02_toc,03_chapter,04_content,05_ending}.svg.json` as `files_modified`, but `.gitignore` line 5 (`/exampels`) excludes the entire directory tree. Plan 17-04 (commit 2cf4910) explicitly documented this constraint: "注: /exampels/ 被 .gitignore 排除,fixture svg.json 不入 git / 但 E2E 测试通过 dist 路径 convertDir 内存结果验证". Following that precedent keeps the fixture data outside version control and uses the E2E test as the contract surface. This is a deviation, not an oversight — see Deviations below.
- **Renamed the closing slide id to its real fixture name.** Plan used `05_ending` (positional naming) but the actual fixture file is `20_ending.svg` and the slide.id matches the filename. The E2E test uses `20_ending` so it asserts against the real converted slide.
- **Used the actual on-disk file naming.** `convertDir()` writes `${svgFullPath}.svg.json` (e.g. `01_cover.svg.svg.json`), not `01_cover.svg.json`. The plan's `<files>` block used the simplified form; the test does not depend on file naming because it reads `result.slides` (in-memory) rather than parsing svg.json files.
- **Cross-check `pageData.cover_title === element.textContent`** on 01_cover — adds a tighter contract than either alone (catches any future drift where pageData and element.textContent fall out of alignment).
- **Added an end-of-suite CONTENT_KEY_VALUES sanity it()** — keeps the `import { CONTENT_KEY_VALUES } from '../../src/utils/content-key'` import alive and detects helper regressions (e.g., accidental freeze removal, length drift).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixture baseline git commit blocked by .gitignore**
- **Found during:** Task 1 (fixture regenerate)
- **Issue:** Plan listed 5 fixture svg.json files as `files_modified` to be git-added + committed. `git add exampels/green-art-teaching/svg_output/01_cover.svg.svg.json` failed with: "The following paths are ignored by one of your .gitignore files: exampels / hint: Use -f if really want to add them." `.gitignore` line 5 (`/exampels`) excludes the entire directory tree.
- **Fix:** Skipped the fixture git commit. Followed Plan 17-04's established pattern (commit 2cf4910 message explicitly notes "fixture svg.json 不入 git"). Copied `exampels/green-art-teaching/` from the main checkout (`/e/git/svg2json/exampels/green-art-teaching/`) into the worktree so convertDir() can run against the fixtures at test time.
- **Files modified:** none committed (fixture baselines regenerated on disk only)
- **Verification:** `npx vitest run tests/e2e/green-art-teaching-page-data.test.ts` → 16/16 passed. The E2E test runs `convertDir()` in-memory and asserts pageData contract directly, making the fixture baselines the test's input — equivalent to committing them in effect.
- **Committed in:** not committed (intentional; see Deviation note)

**2. [Rule 1 - Plan bug] Plan referenced `05_ending.svg.json` but fixture is `20_ending.svg.svg.json`**
- **Found during:** Task 2 (writing the E2E test)
- **Issue:** Plan's `<files>` block used positional naming (`05_ending`) and simplified extension (`*.svg.json`), neither matches reality. The closing slide in `exampels/green-art-teaching/svg_output/` is `20_ending.svg` and convertDir writes `*.svg.svg.json`.
- **Fix:** Used real fixture id `20_ending` in the test. The test inspects in-memory `result.slides` (not file paths), so the simplified `.svg.json` extension in the plan's `<files>` block has no effect.
- **Files modified:** tests/e2e/green-art-teaching-page-data.test.ts (one line: `pageDataOf('20_ending')`)
- **Verification:** Test passes; assertion `pageDataOf('20_ending')?.end_title` matches `result.slides.find(s => s.id === '20_ending').pageData.end_title` (= "感谢聆听").
- **Committed in:** `cd91cdf` (Task 2 commit)

**3. [Rule 2 - Missing critical] Copied `exampels/202610131101001/` into worktree for sibling E2E test**
- **Found during:** Self-check (running `npx vitest run`)
- **Issue:** `tests/e2e/202610131101001.test.ts` requires the sibling fixture set; without it in the worktree the test fails (with `hasFixture=false`, the suite's first it() fails on `expect(hasFixture).toBe(true)`).
- **Fix:** Copied `exampels/202610131101001/` from `/e/git/svg2json/exampels/202610131101001/`. Not git-tracked (gitignored). This is a worktree setup step, not a plan deliverable.
- **Files modified:** none committed
- **Verification:** `npx vitest run tests/e2e/202610131101001.test.ts` — pre-existing Phase 15 Bug 2 test still fails (4 → 12 same-group trigger mismatch), but the suite's first `hasFixture` assertion now passes. The Phase 15 Bug 2 failure is out of scope (Plan 18-03 forbids touching pre-existing failing tests).
- **Committed in:** not committed (not a plan deliverable)

---

**Total deviations:** 3 (1 blocking [gitignore], 1 plan bug [naming], 1 critical setup [sibling fixture])
**Impact on plan:** All deviations preserve the plan's intent. The gitignore deviation is a project-wide constraint that 17-04 already established; the naming bug was caught and corrected inline; the sibling-fixture copy is a worktree setup precondition, not a plan change. No scope creep.

## Issues Encountered

- **Pre-existing failing tests (out of scope per Plan 18-03):** `__tests__/shadow.test.ts` (SHPE-03 / IMGE-02), `__tests__/shape-rx.test.ts` (SHPE-01), `__tests__/image-outline.test.ts` (IMGE-01), `__tests__/path-merge.test.ts` (path-merge), and `tests/e2e/202610131101001.test.ts` (Phase 15 Bug 2 same-group concurrent triggers). Plan 18-03 explicitly forbids touching these. Full suite shows 6 failed test files / 15 failed tests / 642 passing — all 18-01/18-02/18-03/18-04 and Phase 17 v1.12 tests pass cleanly (39/39 fixture E2E + 87/87 unit/mock).
- **Plan 18-03 misleading filename** — `01_cover.svg.json` in plan files but `01_cover.svg.svg.json` in reality. Test reads from `result.slides` (in-memory), so the extension mismatch is cosmetic and the test does not depend on file paths.
- **`05_ending` does not exist** — fixture file is `20_ending.svg`. Used the real id in the test.

## Next Phase Readiness

- Plan 18-04 (mock SVG E2E for N=5..8, 0-hit, first-wins, type guard) is already merged into master at commit `dc7d948` — the v1.13 release-gate series is complete.
- v1.13 release-gate status: PD-01..12 pinned on real fixtures, PD-E2E-03 reverse whitelist pinned, D-20 four reverse assertions pinned, PD-E2E-04 v1.12 unchanged pinned (14/14 content-key + 9/9 template-marking fixture E2E pass), PD-E2E-01/02/04 covered by 18-01 unit + 18-02 mock + 18-04 mock E2E.
- No blockers for `/gsd-ship` (v1.13 page-data-extraction milestone) — verify-work can now run end-to-end against the real fixture set.

## Self-Check: PASSED

- `tests/e2e/green-art-teaching-page-data.test.ts` exists (295 lines, 16 it() across 4 describe blocks).
- `.planning/phases/18-page-data-extraction/18-03-SUMMARY.md` exists.
- `cd91cdf` is an ancestor of HEAD (`git merge-base --is-ancestor cd91cdf HEAD` returns true).
- `npx vitest run tests/e2e/green-art-teaching-page-data.test.ts` → 16/16 passed (latest run).
- `npx vitest run tests/e2e/green-art-teaching-content-key.test.ts` → 14/14 passed (PD-E2E-04 v1.12 unchanged).
- `npx vitest run tests/e2e/green-art-teaching-template-marking.test.ts` → 9/9 passed.
- `npx vitest run __tests__/page-data.test.ts __tests__/page-data-mock.test.ts __tests__/text-content-extraction.test.ts __tests__/content-key.test.ts __tests__/content-key-mock.test.ts` → 87/87 passed.
- Working tree clean (`git status` reports nothing to commit).

---
*Phase: 18-page-data-extraction*
*Completed: 2026-10-16*