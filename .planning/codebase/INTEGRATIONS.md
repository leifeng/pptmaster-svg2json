# External Integrations

**Analysis Date:** 2026-06-27

## APIs & External Services

**No external API integrations detected.**

This is a self-contained SVG to JSON converter that operates entirely on local files.

## Data Storage

**Databases:**
- None

**File Storage:**
- Local filesystem only
- Input: SVG files (read via Node.js `fs` module)
- Output: JSON files or stdout

**Caching:**
- None

## Authentication & Identity

**Auth Provider:**
- None (CLI tool, no authentication required)

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- Terminal output via `picocolors` for colored CLI feedback
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- None detected (no .github/workflows, no Dockerfile, no deployment configs)

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars:**
- None required - fully local operation

**Secrets location:**
- Not applicable

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Input/Output Formats

**Input:**
- SVG (Scalable Vector Graphics) XML format

**Output:**
- PPTElement JSON format (custom schema defined in `src/slides.ts`)
- Structure: `{ elements: PPTElement[] }`

---

*Integration audit: 2026-06-27*