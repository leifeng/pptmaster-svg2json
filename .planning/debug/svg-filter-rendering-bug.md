---
status: investigating
trigger: "SVG filter rendering bug - rect element with filter=\"url(#cardShadow)\" not visible after SVG to JSON conversion. Card background with shadow filter doesn't appear."
created: 2026-07-01T12:00:00.000Z
updated: 2026-07-01T12:00:00.000Z
symptoms_prefilled: true
---

## Current Focus

hypothesis: "The SVG parser only supports feDropShadow filter primitive, but the user's SVG uses a complex filter chain with feGaussianBlur, feOffset, feFlood, feComposite, and feMerge - so the shadow attribute is never set"
test: "Verified that collectFilterDefs only handles feDropShadow, not the filter primitives used in the user's SVG"
expecting: "CONFIRMED - root cause found: parser limitation"
next_action: "Check if the shadow attribute is actually used in transform-to-pptel.ts to generate the output"

## Symptoms

expected: "Rect element with filter=\"url(#cardShadow)\" should display with a shadow effect after SVG to JSON conversion"
actual: "The card background with shadow filter doesn't appear / not visible"
errors: []
reproduction: "Use SVG with a rect that has filter=\"url(#cardShadow)\" and convert to JSON - shadow effect missing"
started: "Unknown when it broke"

## Evidence

- timestamp: 2026-07-01T12:05:00.000Z
  checked: "src/parser/svg-parser.ts lines 160-194 (collectFilterDefs function)"
  found: "Only handles feDropShadow filter primitive - does NOT handle feGaussianBlur, feOffset, feFlood, feComposite, feMerge"
  implication: "The filter def is collected but all filter primitives are ignored except feDropShadow"

- timestamp: 2026-07-01T12:05:00.000Z
  checked: "src/parser/svg-parser.ts lines 256-279 (resolveFilterReference function)"
  found: "Only looks for feDropShadow child: filterDef.children.find(c => c.type === 'feDropShadow'). If not found, shadow attribute is never set on the element"
  implication: "When user's filter uses feGaussianBlur+feOffset+feFlood+feComposite+feMerge, no feDropShadow exists so shadow attribute remains undefined"

- timestamp: 2026-07-01T12:10:00.000Z
  checked: "Grep for feGaussianBlur|feOffset|feFlood|feComposite|feMerge in src/"
  found: "No matches - these SVG filter primitives are completely unimplemented in the codebase"
  implication: "The complex filter chain cannot be converted to JSON shadow representation"

## Eliminated

- hypothesis: "The filter effect might not be properly serialized to JSON"
  evidence: "Partially correct - the issue is the filter parsing only supports feDropShadow, not the complex chain used"
  timestamp: 2026-07-01T12:05:00.000Z

- hypothesis: "The filter region's clip/mask might be cutting off the shadow"
  evidence: "The filter is never parsed in the first place - no filter primitives except feDropShadow are handled"
  timestamp: 2026-07-01T12:05:00.000Z

- hypothesis: "The background color #F8F9FA might be too similar to white #FFFFFF"
  evidence: "Colors are parsed correctly - the issue is the shadow filter is not being applied at all"
  timestamp: 2026-07-01T12:05:00.000Z

- hypothesis: "The filter might be applied in wrong order or the merge node ordering is wrong"
  evidence: "The filter chain is not even parsed - feMerge and other primitives are completely unimplemented"
  timestamp: 2026-07-01T12:05:00.000Z

## Resolution

root_cause: "The SVG parser (src/parser/svg-parser.ts) only supports feDropShadow filter primitive. The user's SVG uses a complex filter chain (feGaussianBlur + feOffset + feFlood + feComposite + feMerge) which is completely unimplemented. When resolveFilterReference() is called, it only looks for feDropShadow children, finds none, and never sets the shadow attribute on the rect element."
fix: ""
verification: ""
files_changed: []
