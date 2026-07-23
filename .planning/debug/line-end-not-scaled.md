---
status: resolved
trigger: "line 元素的 end 坐标没有缩放 - 15_ablations.svg 中 track line 的 end=[0, 488] 应该是 [0, 381.25]"
created: 2026-07-21T10:30:00.000Z
updated: 2026-07-21T10:40:00.000Z
---

## Current Focus

hypothesis: "line case 的无 transform 分支（1214-1222行）没有对 startRelX/Y 和 endRelX/Y 应用 scaleX/scaleY 缩放"
test: "对比 line case 的两个分支：有 transform 分支（1231-1234行）正确乘以 scaleX/scaleY，无 transform 分支（1219-1222行）没有"
expecting: "无 transform 分支缺少缩放计算"
next_action: "验证完成，修复已应用"

## Symptoms

expected: "line end 坐标应该缩放到 targetCanvas 尺寸"
actual: "end=[0, 488] 而非 [0, 381.25]"
errors: []
reproduction: "解析 exampels/ppt169_attention_is_all_you_need/svg_output/15_ablations.svg，检查 track line 元素的 end 坐标"
started: "一直存在（line 坐标缩放 bug）"

## Eliminated

## Evidence

- timestamp: 2026-07-21T10:32:00.000Z
  checked: "SVG viewBox 和 targetCanvas 尺寸"
  found: "viewBox=0 0 1280 720, targetCanvas=[1000, 562.5], scaleX=scaleY=0.78125"
  implication: "所有坐标都应该乘以 0.78125"

- timestamp: 2026-07-21T10:33:00.000Z
  checked: "transform-to-pptel.ts:1214-1234 line case 代码"
  found: "无 transform 分支（1219-1222行）：startRelX = x1 - coords.left（无缩放）\n有 transform 分支（1231-1234行）：startRelX = (x1t - coords.left) * scaleX（有缩放）"
  implication: "无 transform 分支缺少 scaleX/scaleY 乘法"

- timestamp: 2026-07-21T10:34:00.000Z
  checked: "JSON 输出验证"
  found: "JSON 中 end=[0, 488]，SVG 原始 y2-y1=660-172=488"
  implication: "488 是未缩放的原始差值，应为 488*0.78125=381.25"

- timestamp: 2026-07-21T10:38:00.000Z
  checked: "修复后重新生成 JSON"
  found: "end=[0, 381.25]，水平虚线 end=[25, 0]（32*0.78125=25）"
  implication: "修复成功，所有 line 坐标都正确缩放"

## Resolution

root_cause: "line case 无 transform 分支（1214-1222行）直接使用 x1-coords.left 计算 startRel/endRel，没有乘以 scaleX/scaleY"
fix: "修改 src/transformer/transform-to-pptel.ts:1219-1222，添加 scaleX/scaleY 缩放\n- startRelX = (x1 - coords.left) * scaleX\n- startRelY = (y1 - coords.top) * scaleY\n- endRelX = (x2 - coords.left) * scaleX\n- endRelY = (y2 - coords.top) * scaleY"
verification: "重新生成 15_ablations.svg.json，track line end=[0, 381.25]（正确），水平虚线 end=[25, 0]（正确）"
files_changed:
  - "src/transformer/transform-to-pptel.ts"
---
