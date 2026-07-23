---
name: line-element-missing-from-json
description: Debug: <line> element from exampels/a.svg has wrong start/end coordinates
status: resolved
trigger: "在处理exampels/a.svg中，<line xmlns=\"http://www.w3.org/2000/svg\" x1=\"340\" y1=\"350\" x2=\"340\" y2=\"395\" stroke=\"#F5A623\" stroke-width=\"1.5\" stroke-dasharray=\"6,3\"/> 在json中找不到对应的shape"
trigger_time: 2026-07-16T00:00:00+08:00
created: 2026-07-16
updated: 2026-07-16
symptoms:
  expected_behavior: "<line> 元素应该被解析并输出为 JSON 中的 shape 对象，且 start/end 坐标正确"
  actual_behavior: "line 元素确实出现在 JSON 中，但 start: [0,0], end: [0,0] 坐标不正确"
  error_messages: "无报错信息，只是 start/end 坐标为 [0,0] 而不是正确的值"
  timeline: "最近发现的bug，不确定何时引入"
  reproduction: "解析 exampels/a.svg，检查输出 JSON 中 line 的 start/end 坐标"
hypothesis: ""
test: ""
expecting: ""
next_action: "human_verify_fix"
reasoning_checkpoint: ""
tdd_checkpoint: ""
root_cause: "在 transform-to-pptel.ts 的 case 'line' 中，当 line 没有 transform 时，endRelY 被硬编码为 0，而不是使用 height。这导致垂直线（x1=x2）的 end 坐标错误地显示为 [0,0]"
fix: "修改 transform-to-pptel.ts 第 1207-1212 行，使用实际坐标差计算 start/end，而不是假设 line 是水平的"
verification: "已验证：垂直线现在输出正确的 end: [0,45]，而不是错误的 end: [0,0]"
files_changed:
  - "src/transformer/transform-to-pptel.ts"
specialist_hint: ""
---

## Current Focus

**status:** awaiting_human_verify

**Root Cause Found:** 在 `transform-to-pptel.ts` 的 `case 'line':` 代码中，当 line 元素没有 transform 属性时，`endRelY` 被硬编码为 `0`。对于垂直线（x1=x2），这导致 `end: [0,0]` 而不是正确的 `end: [0, height]`。

**Fix Applied:** 修改了 "no transform" 分支的坐标计算逻辑，使用实际的坐标差来计算 startRelX/Y 和 endRelX/Y，而不是假设 line 是水平的。

## Evidence

- timestamp: 2026-07-16T00:00:00
  checked: "SVG parsing - parseSvg() correctly parses the line element into AST"
  found: "Line element with x1=340, y1=350, x2=340, y2=395 is in AST with correct attributes"
  implication: "Parser is working correctly"

- timestamp: 2026-07-16T00:00:00
  checked: "transformToPPTElement output"
  found: "Line is present in output with color: '#F5A623', but start: [0,0], end: [0,0]"
  implication: "Line is NOT missing - coordinates are wrong"

- timestamp: 2026-07-16T00:00:00
  checked: "exampels/a.svg.json (expected output)"
  found: "Line with color '#F5A623' exists at lines 250-271, same issue: start: [0,0], end: [0,0]"
  implication: "Issue exists in both current output and expected output file"

- timestamp: 2026-07-16T00:00:00
  checked: "Root cause traced to transform-to-pptel.ts case 'line'"
  found: "In the 'no transform' branch, endRelY is hardcoded to 0 instead of using height"
  implication: "For vertical lines, this results in end: [0,0] instead of end: [0, height]"

## Resolution

**root_cause:** 在 `src/transformer/transform-to-pptel.ts` 第 1207-1212 行，当 line 元素没有 transform 时，代码假设 line 是水平的（从 [0,0] 到 [width, 0]），并将 endRelY 硬编码为 0。这对于垂直线（x1=x2）是错误的，因为垂直线的 endRelY 应该是 height（45 SVG units）。

**fix:** 修改 "no transform" 分支的坐标计算：
```javascript
// 修改前（错误）：
startRelX = 0
startRelY = 0
endRelX = width
endRelY = 0  // 硬编码为 0，错误！

// 修改后（正确）：
startRelX = x1 - coords.left
startRelY = y1 - coords.top
endRelX = x2 - coords.left
endRelY = y2 - coords.top  // 使用实际坐标差
```

**verification:**
- 垂直线修复前: `end: [0, 0]` (错误)
- 垂直线修复后: `end: [0, 45]` (正确)
- 水平线仍然正确: `end: [240, 0]`
- line-width.test.ts 测试全部通过

## Eliminated

- hypothesis: "Line element is not being parsed"
  evidence: "Confirmed line is parsed correctly into AST"
  timestamp: 2026-07-16T00:00:00

- hypothesis: "Line element is being filtered out during transformation"
  evidence: "Line IS present in final JSON, just with wrong coordinates"
  timestamp: 2026-07-16T00:00:00

## Session Log

