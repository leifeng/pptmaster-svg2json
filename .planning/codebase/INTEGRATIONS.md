# External Integrations

**Analysis Date:** 2026-06-27

## APIs & External Services

**External APIs:**
- Not detected - no `fetch`, `axios`, `http`, `https`, webhook, cloud SDK, Stripe, Supabase, AWS, database, or cache usage detected in `src/**/*.ts`.
- The converter operates locally: `src/cli.ts` reads SVG input from local files, calls `convert` from `src/index.ts`, and writes JSON to stdout or a local output file.

**Package Registry:**
- npm packages are declared in `package.json` and locked in `package-lock.json`.
- `package-lock.json` resolves packages from npm-compatible registry URLs; this is a development/install-time integration, not an application runtime dependency.

## Data Storage

**Databases:**
- Not detected.
- No database client packages are declared in `package.json`.
- No database connection strings, ORM configuration, or query code detected in `src/**/*.ts`.

**File Storage:**
- Local filesystem only.
- `src/cli.ts` reads SVG input through `readFileSync`, checks directories through `statSync`, discovers files through `readdirSync`, and writes optional output through `writeFileSync`.
- `src/scripts/validate-all.ts` and `src/scripts/round-trip-test.ts` read local SVG fixtures under `examples/*/svg_output/` when present.
- SVG `<image>` elements preserve their `href`/`xlink:href` value as a PPTElement `src` string in `src/parser/svg-parser.ts` and `src/transformer/transform-to-pptel.ts`; the converter does not fetch, upload, validate, or rewrite referenced image assets.

**Caching:**
- Not detected.
- No Redis/Memcached/local cache layer detected in `package.json` or `src/**/*.ts`.

## Authentication & Identity

**Auth Provider:**
- Not applicable - this is a local CLI/library with no user accounts, sessions, OAuth, JWT, API keys, or auth middleware.

**Generated IDs:**
- `uuid` is used only to generate local PPTElement IDs in `src/transformer/transform-to-pptel.ts`; it is not an identity provider integration.

## Monitoring & Observability

**Error Tracking:**
- Not detected - no Sentry, OpenTelemetry, hosted monitoring SDK, or telemetry endpoint detected.

**Logs:**
- CLI/status output uses stdout/stderr and `picocolors`:
  - User-facing CLI errors and success messages: `src/cli.ts`.
  - Validation summary and per-file progress: `src/scripts/validate-all.ts`.
  - Round-trip test summary and per-file progress: `src/scripts/round-trip-test.ts`.
- Structured JSON reports are printed to stdout by `src/scripts/validate-all.ts` and `src/scripts/round-trip-test.ts`.
- No centralized log shipping or structured logging framework detected.

## CI/CD & Deployment

**Hosting:**
- Not detected.
- No `Dockerfile*`, `docker-compose*.yml`, hosting config, or deployment config detected at repository root.

**CI Pipeline:**
- Not detected.
- No `.github/workflows/*` files detected.

**Package Distribution:**
- npm package metadata exists in `package.json`.
- Published files are limited to `dist/` via `package.json` `files`.
- Package entry points are `dist/index.js` for library use, `dist/index.d.ts` for types, and `./dist/src/cli.js` for the `svg2pptel` binary.

## Environment Configuration

**Required env vars:**
- None required.
- No `.env*` files detected at repository root.
- No `process.env` references detected in `src/**/*.ts`.

**Secrets location:**
- Not applicable.
- No secret/config credential files were detected by the integration scan.

## Webhooks & Callbacks

**Incoming:**
- None - no HTTP server, route handlers, web framework, or webhook endpoints detected.

**Outgoing:**
- None - no outbound HTTP calls or webhook clients detected.

## Input/Output Contracts

**Input:**
- SVG/XML content is parsed with `fast-xml-parser` in `src/parser/svg-parser.ts`.
- CLI input is a local SVG file or directory path in `src/cli.ts`.
- Library input is an SVG content string passed to `convert(svgContent, options?)` in `src/index.ts`.

**Output:**
- PPTElement JSON with shape `{ elements: PPTElement[] }` is produced by `src/index.ts`.
- PPTElement union types are defined in `src/slides.ts` and include text, image, shape, line, chart, table, latex, video, and audio element interfaces.
- CLI writes output to stdout or a local file through `src/cli.ts`.

## Integration Boundaries

**Safe assumptions for future work:**
- Treat this project as an offline converter: do not introduce network calls for parsing or transformation unless a feature explicitly requires them.
- Keep SVG asset references as data strings/paths in `PPTImageElement.src` unless implementing an explicit asset resolution feature.
- Prefer local filesystem inputs/outputs in CLI additions, matching `src/cli.ts` patterns.

---

*Integration audit: 2026-06-27*
