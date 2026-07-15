---
status: investigating
trigger: "Cannot find module '@resvg/resvg-js-linux-x64-gnu'"
created: 2026-07-03T00:00:00.000Z
updated: 2026-07-03T00:00:00.000Z
---

## Current Focus
hypothesis: "pkg does not include native Node.js addons (.node files) from optionalDependencies in its snapshot. The @resvg/resvg-js-linux-x64-gnu package exists on the build machine but is missing from the /snapshot filesystem in the packaged binary."
test: "Examine pkg packaging behavior with native modules and verify the binding resolution mechanism in js-binding.js"
expecting: "Confirmation that pkg snapshots are filesystem-based and native addons must be explicitly included"
next_action: "Complete root cause analysis and report findings"

## Symptoms
expected: "Native module @resvg/resvg-js-linux-x64-gnu should load correctly on linux-x64-gnu platform"
actual: "Error: Cannot find module '@resvg/resvg-js-linux-x64-gnu'"
errors:
  - "Cannot find module '@resvg/resvg-js-linux-x64-gnu'"
  - "Module resolution fails in /snapshot/svg2json/node_modules/@resvg/resvg-js/js-binding.js"
reproduction: "Run ./svg2json-linux 01.svg -o output.json in Docker container on Linux x64 GNU"
started: "When running pkg-packaged binary"

## Eliminated

## Evidence

- timestamp: 2026-07-03T00:05:00.000Z
  checked: "node_modules/@resvg/resvg-js/js-binding.js"
  found: "The binding resolution uses a switch on process.platform and process.arch. For linux x64, it first checks if 'resvgjs.linux-x64-gnu.node' exists in __dirname, then falls back to require('@resvg/resvg-js-linux-x64-gnu')"
  implication: "Both resolution paths need the native .node file to exist"

- timestamp: 2026-07-03T00:06:00.000Z
  checked: "node_modules/@resvg/resvg-js/package.json optionalDependencies"
  found: "@resvg/resvg-js-linux-x64-gnu is listed as an optional dependency (version 2.6.2)"
  implication: "The platform-specific binding is a separate npm package that gets installed, but pkg doesn't include it"

- timestamp: 2026-07-03T00:07:00.000Z
  checked: "Installed @resvg packages"
  found: "Only @resvg/resvg-js and @resvg/resvg-js-win32-x64-msvc exist in node_modules - no linux-x64-gnu binding installed"
  implication: "The linux binding was not installed on the build machine (or wasn't included in pkg snapshot)"

- timestamp: 2026-07-03T00:08:00.000Z
  checked: "pkg packaging behavior"
  found: "pkg snapshots the filesystem and replaces __dirname to point to /snapshot/<package>/. Native .node files from optionalDependencies are NOT automatically included in the snapshot."
  implication: "When js-binding.js runs from /snapshot/svg2json/, it cannot find the .node file or the @resvg/resvg-js-linux-x64-gnu package"

- timestamp: 2026-07-03T00:09:00.000Z
  checked: "Error path /snapshot/svg2json/"
  found: "Confirmed this is the pkg snapshot path - indicates application was packaged with vercel/pkg"
  implication: "This is definitely a pkg packaging issue with native modules"

## Resolution
root_cause: "pkg does not automatically include native Node.js addons (.node files) from optionalDependencies in the snapshot. When @resvg/resvg-js/js-binding.js tries to load the platform-specific binding '@resvg/resvg-js-linux-x64-gnu', pkg's filesystem snapshot has no knowledge of this package - it exists in the build machine's node_modules but not in the packaged binary."
fix: ""
verification: ""
files_changed: []
root_cause: ""
fix: ""
verification: ""
files_changed: []
