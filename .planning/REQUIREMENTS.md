# Requirements — svg-to-pptel

## v1.1 Requirements (transform-fixes milestone)

### Transform System

- [ ] **REQ-TF-01**: Apply SVG `rotate(deg, cx, cy)` with correct rotation center — `parseTransform` extracts `rotateCX`/`rotateCY` but `mapCoordinates` has no rotation math; implement rotate-around-center using translate → rotate → translate-back formula
- [ ] **REQ-TF-02**: Fix ellipse center scaling — `cx`/`cy` are translated but NOT scaled while `rx`/`ry` ARE scaled (coordinate-mapper.ts line 152-153); center must also be scaled
- [ ] **REQ-TF-03**: Fix text baseline offset — replace hardcoded `0.75 * fontSize` with a named configurable constant `BASELINE_OFFSET_RATIO` with default `0.75`; SVG text `y` is baseline, output requires top edge

## v1 Requirements (shipped)

### Transform System — REQ-TF-01

- [x] **REQ-TF-01**: Apply SVG `rotate(deg, cx, cy)` with correct rotation center — ~~`parseTransform` extracts `rotateCX`/`rotateCY` but `mapCoordinates` has no rotation math; implement rotate-around-center using user's `applyTransform` pattern (translate → rotate → scale)~~ → **deferred to v1.1**

### Build System — REQ-BLD-01

- [ ] **REQ-BLD-01**: Replace raw `tsc` with `tsup` for library publishing — handles declaration bundling, ESM/CJS dual output, correct bin entry points

### Package Upgrades — REQ-PKG-01

- [ ] **REQ-PKG-01**: Upgrade dependencies — TypeScript 5.5→6.x, vitest 2.0→4.x, cac 6.7→7.0; verified current versions via npm

## v2 Requirements (deferred)

- [ ] Full path command support (C/Q/A/S/T/Z) in bounding box calculation — currently only M/L/H/V parsed
- [ ] Matrix transform decomposition — currently detected and marked `special: true` but silently ignored
- [ ] Group semantics with `groupId` — currently groups return null, children processed flat, parent-child semantics lost
- [ ] Gradient fills — linearGradient parsed but never converted to PPTElement gradient format
- [ ] Configurable canvas size — currently hard-coded to 1000×562.5

## Out of Scope

- SVG filter effects (blur, drop-shadow) — PPTElement doesn't support these
- Font fallback or multi-font text layout — single-font text only
- Configurable target canvas in API — 1000×562.5 is a stated constraint
- SVGO optimization — not needed for parsing, adds bundle size
- Build system upgrades (tsup) — deferred
- Dependency upgrades — deferred to after transform fixes stabilize

## Traceability

| REQ-ID | Phase | Source |
|--------|-------|--------|
| REQ-TF-01 | Phase 1 | Idea doc + PITFALLS.md + ARCHITECTURE.md |
| REQ-TF-02 | Phase 1 | ARCHITECTURE.md + PITFALLS.md |
| REQ-TF-03 | Phase 1 | Idea doc + PITFALLS.md |
| REQ-BLD-01 | Deferred | STACK.md |
| REQ-PKG-01 | Deferred | STACK.md |
| Full path commands | Phase 2 | FEATURES.md |
| Matrix transform | Phase 2 | PITFALLS.md |
| Group semantics | Phase 2 | FEATURES.md |
| Gradient fills | Phase 3 | FEATURES.md |
| Configurable canvas | Out of Scope | Constraint from PROJECT.md |
