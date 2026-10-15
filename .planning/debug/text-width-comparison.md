---
status: investigating
trigger: "Bug Report: 文本宽度计算函数需要对比验证"
created: 2026-06-29T00:00:00.000Z
updated: 2026-06-29T00:00:00.000Z
audit_acknowledged:
  milestone: v1.9
  at: 2026-10-15
  status: investigating
---

## Current Focus

hypothesis: "新函数与当前函数的宽度系数体系完全不同,需要通过测试用例验证哪个更准确"
test: "计算测试用例对比结果"
expecting: "确定差异大小并判断是否需要修改当前函数"
next_action: "完成调试报告"

## Symptoms

expected: "两个函数对测试用例给出相同或相近的宽度计算结果"
actual: "当前函数和新函数对数字/字母的宽度系数存在显著差异"
errors: []
reproduction: "在 scaleY=0.78125, fontSize=42 条件下测试 '600+'"
started: "待调查"

## Eliminated

## Evidence

- timestamp: 2026-06-29
  checked: "用户提供的两个函数定义"
  found: "当前函数使用细粒度字符分类(数字0.55/大写0.65/小写0.55/其他0.3), 新函数仅区分数字(0.70)和其他(0.6)"
  implication: "两个函数的系数体系完全不同"

- timestamp: 2026-06-29
  checked: "用户提供的测试用例计算"
  found: "'600+' 当前函数: 64.0, 新函数: 88.6 (差距38.4%)"
  implication: "差异显著,需要确定哪个更准确"

- timestamp: 2026-06-29
  checked: "src/transformer/transform-to-pptel.ts 调用处 (第769行)"
  found: "calcTextWidthYaHei(content, scaledFontSize, letterSpacing) 调用时未传递 isBold 参数"
  implication: "即使新函数引入 isBold 参数,当前调用代码也不会传递该参数"

- timestamp: 2026-06-29
  checked: "用户补充: font-weight 任何值都视为粗体"
  found: "当前代码第786行: isBold = fontWeight === 'bold' || fontWeight === '600' || fontWeight === '700'"
  implication: "当前 isBold 判断过于严格,应改为只要存在 font-weight 属性就视为粗体"

## Resolution

root_cause: "1. 当前 isBold 判断逻辑不完整: 仅识别 'bold'/'600'/'700',遗漏其他 font-weight 值; 2. 新函数与当前函数的系数体系完全不同,无法直接替换"
fix: ""
verification: ""
files_changed: []
