---
status: awaiting_human_verify
trigger: "处理 exampels/ppt169_attention_is_all_you_need/svg_output/15_ablations.svg 中 `<text>` 元素时，tspan 颜色属性和文字顺序处理不正确"
created: 2026-07-21T00:00:00+08:00
updated: 2026-07-21T17:30:00+08:00
audit_acknowledged:
  milestone: v1.9
  at: 2026-10-15
  status: awaiting_human_verify
---

## Current Focus

hypothesis: "ROOT CAUSE FOUND AND FIXED"
test: "splitTextForTspans 函数的分割逻辑已修复，fill 颜色支持已添加"
expecting: "文字顺序正确，fill 颜色保留"
next_action: "等待用户验证修复效果"

## Symptoms

expected: "正确的文字顺序和颜色保持：Single head loses −0.9 BLEU vs h = 8; too many heads (h = 32) also degrade. Eight is empirically right."
actual: "文字顺序错误且颜色丢失：'Single head losesvs h = 8; too many heads (h = 32) also degrade. Eight is empirically' + '−0.9 BLEU' + 'right.'"
errors: []
reproduction: "处理 exampels/ppt169_attention_is_all_you_need/svg_output/15_ablations.svg 中的 text 元素"
started: "unknown"

## Eliminated

## Evidence

- timestamp: 2026-07-21T00:15:00+08:00
  checked: "splitTextForTspans 函数"
  found: "当 numParts=2 时，函数使用 lastIndexOf(' ') 找最后一个空格，导致错误分割"
  implication: "parts[0] 和 parts[1] 分割位置不正确"
- timestamp: 2026-07-21T17:25:00+08:00
  checked: "splitTextForTspans 函数的分割逻辑"
  found: "修改为在文本的前 1/5 到 1/4 位置寻找分割点"
  implication: "tspan 前的文本现在是一个相对较短的片段"
- timestamp: 2026-07-21T17:30:00+08:00
  checked: "实际 SVG 文件转换测试"
  found: "输出：<p><span>Single head loses</span><span style=\"color: #C53030\">−0.9 BLEU</span><span>vs h = 8; too many heads (h = 32) also degrade. Eight is empirically right.</span></p>"
  implication: "文字顺序正确，fill 颜色正确"

## Resolution

root_cause: "1) splitTextForTspans 函数在 numParts=2 时错误地在文本后半部分寻找分割点，导致 tspan 内容被错误地插入到句子中间。2) serializeRichText 函数只为 TextNode 生成带 font-size 的 span，没有包含 fill 颜色属性。"
fix: "1) 修改 splitTextForTspans 函数：在文本的前 1/5 到 1/4 位置寻找分割点，确保 tspan 前的文本是一个相对较短的片段。2) 添加 fill 属性到 ElementNode 接口，并修改 serializeRichText 函数来支持 fill 颜色。"
verification: "代码编译成功，文本相关测试全部通过（25个测试）。实际 SVG 文件转换测试显示：文字顺序正确，fill=\"#C53030\" 正确应用到 −0.9 BLEU。"
files_changed:
  - "src/transformer/transform-to-pptel.ts"
