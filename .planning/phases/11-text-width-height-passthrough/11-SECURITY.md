---
phase: 11
slug: text-width-height-passthrough
status: verified
threats_open: 0
asvs_level: 1
block_on: high
register_authored_at_plan_time: false
created: 2026-07-23
verified: 2026-07-23
---

# Phase 11 — Security

> Per-phase security contract: retroactive STRIDE register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| SVG input → parser/transformer | SVG authors control `<text>` `width` and `height` strings | Untrusted dimension strings |
| Transformer → PPTElement JSON | Parsed dimensions and canvas scales become output layout values | Numeric width, height, and position |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T11-01 | Tampering | `width` / `height` parsing | low | mitigate | `parseFloat(String(...))`; downstream text content remains XML-escaped in `src/text-measurer.ts` | closed |
| T11-02 | Denial of Service | Invalid dimension rejection | medium | mitigate | Both raw values require `Number.isFinite(...) && value > 0`; invalid values use the existing measured fallback | closed |
| T11-03 | Denial of Service | Post-scale numeric overflow | low | mitigate | Raw values are finite, but extreme finite values can overflow after multiplication; tracked as a below-threshold hardening item | open — below high threshold (non-blocking) |
| T11-04 | Tampering | Declared dimensions replace measured dimensions | low | accept | Intentional author-controlled layout contract documented in `11-01-PLAN.md`; consistent with existing `fixedHeight` trust | closed |
| T11-05 | Information Disclosure | Measurement/WASM path bypass | low | mitigate | Immutable `usePassthrough` flag and mutually exclusive `else` preserve the original measurement path without exposing new data | closed |
| T11-06 | Elevation of Privilege | Fast-path scope | low | mitigate | `usePassthrough` is local to `case 'text'`; no non-text element branch is affected | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` count toward `threats_open`.*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-11-01 | T11-04 | SVG authors explicitly declaring valid positive dimensions are allowed to control text layout; this is the Phase 11 product contract rather than an integrity bypass | Phase 11 plan | 2026-07-23 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-23 | 6 | 5 | 1 non-blocking | gsd-security-auditor (retroactive STRIDE, ASVS L1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed at the `high` blocking threshold
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-23
