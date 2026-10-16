# Requirements: svg-to-pptel

**Defined:** 2026-10-16
**Core Value:** Accurately convert SVG visual elements to PowerPoint JSON — every coordinate, transform, and style maps correctly to the target canvas.

## v1.12 Requirements

Requirements for the v1.12 milestone. Each maps to roadmap phases.

### Cover Page

- [ ] **CK-01**: Element with id `cover-title-carrier` is rendered as PPTTextElement with `contentKey: "cover_title"`
- [ ] **CK-02**: Element with id `cover-subtitle-carrier` is rendered as PPTTextElement with `contentKey: "cover_subtitle"`
- [ ] **CK-03**: Element with id `cover-author-carrier` is rendered as PPTTextElement with `contentKey: "cover_author"`

### TOC Page

- [ ] **CK-11**: Element with id `toc-item-{N}-number` (N ∈ 1..4, extensible to 1..8) is rendered as PPTTextElement with `contentKey: "directory_item_number_N"`
- [ ] **CK-12**: Element with id `toc-item-{N}-carrier` (text body, leading inline text) is rendered as PPTTextElement with `contentKey: "directory_item_N"`
- [ ] **CK-13**: Inside `toc-item-{N}-carrier`, each `<tspan>` carrying a `dy` attribute (the desc line) is rendered as a separate PPTTextElement with `contentKey: "directory_item_desc_N"` (N matches the parent carrier)

### Chapter Page

- [ ] **CK-04**: Element with id `chapter-number-carrier` is rendered as PPTTextElement with `contentKey: "chapter_number"`
- [ ] **CK-05**: Element with id `chapter-title-carrier` is rendered as PPTTextElement with `contentKey: "chapter_title"`
- [ ] **CK-06**: Element with id `chapter-desc-carrier` is rendered as PPTTextElement with `contentKey: "chapter_desc"`

### Content Page

- [ ] **CK-07**: Element with id `content-title-carrier` is rendered as PPTTextElement with `contentKey: "content_title"`
- [ ] **CK-08**: Element with id `content-subtitle-carrier` is rendered as PPTTextElement with `contentKey: "content_subtitle"`

### Closing Page

- [ ] **CK-09**: Element with id `closing-thanks-carrier` is rendered as PPTTextElement with `contentKey: "end_title"`
- [ ] **CK-10**: Element with id `closing-subtitle-carrier` is rendered as PPTTextElement with `contentKey: "end_subtitle"`

### Behavioral Guarantees

- [ ] **CK-14**: Non-mapped ids (not in the 13-template table) do NOT emit a `contentKey` field — the field is omitted entirely, never set to `null`/`undefined`/`""`
- [ ] **CK-15**: Unknown template ids silently skip — no error, no warning — to allow future template additions without code changes
- [ ] **CK-16**: `contentKey` is only attached to PPTTextElement; non-text elements (shape/image/line) carrying matching ids are ignored even if id is in the mapping table

### Coverage Scope

- [ ] **CK-17**: N range 1..4 supported (current set); N ∈ 5..8 silently skipped (no `contentKey`) until mapping table is extended

## Out of Scope

Explicit exclusions to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Other page-type templates (e.g., cover-image-carrier, toc-divider-carrier) | v1.12 only ships 13 mapped ids; additional templates wait for user-driven mapping extension |
| Auto-detection of template intent from content (no id) | Mapping is id-driven; content-based heuristics out of scope |
| Renaming existing carrier ids (e.g., `toc-item-1-carrier` → `directory-item-1-carrier`) | SVG fixtures already shipped with current ids; renaming would break fixtures and require coordinated downstream changes |
| I18n / locale variants of contentKey (e.g., `cover_title_en`) | PPTist binding protocol uses single canonical key |
| contentKey on non-template elements | contentKey is template-binding semantics; non-template elements carry no binding intent |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CK-01      | Phase 17 | Pending |
| CK-02      | Phase 17 | Pending |
| CK-03      | Phase 17 | Pending |
| CK-04      | Phase 17 | Pending |
| CK-05      | Phase 17 | Pending |
| CK-06      | Phase 17 | Pending |
| CK-07      | Phase 17 | Pending |
| CK-08      | Phase 17 | Pending |
| CK-09      | Phase 17 | Pending |
| CK-10      | Phase 17 | Pending |
| CK-11      | Phase 17 | Pending |
| CK-12      | Phase 17 | Pending |
| CK-13      | Phase 17 | Pending |
| CK-14      | Phase 17 | Pending |
| CK-15      | Phase 17 | Pending |
| CK-16      | Phase 17 | Pending |
| CK-17      | Phase 17 | Pending |

**Coverage:**
- v1.12 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-16 for v1.12 milestone*
*Last updated: 2026-10-16 after initial definition*