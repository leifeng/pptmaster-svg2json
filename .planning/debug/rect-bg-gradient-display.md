---
status: investigating
trigger: "背景 `<rect width=\"1280\" height=\"720\" fill=\"url(#bgGradient)\"/>` 显示的背景效果不对"
created: 2026-07-01T02:00:00.000Z
updated: 2026-07-01T02:15:00.000Z
audit_acknowledged:
  milestone: v1.9
  at: 2026-10-15
  status: investigating
---

## Current Focus

hypothesis: "x1/y1/x2/y2定义的渐变方向没有被转换为rotate角度，导致PPTist输出rotate=0（水平渐变）而非原始SVG的对角线渐变方向"
test: "验证x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"（对角线）被错误转换为rotate=0"
expecting: "当SVG渐变使用x1/y1/x2/y2定义方向（且无gradientTransform）时，方向信息应被转换为对应的rotate角度"
next_action: "完成根因报告"

## Symptoms

expected: "背景rect使用渐变填充时，渐变方向应与SVG原始定义一致（x1=0 y1=0 x2=1 y2=1表示从左上到右下的对角线渐变）"
actual: "SVG渐变x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"被转换为rotate=0，方向丢失"
errors: []
reproduction: "SVG中rect使用fill=\"url(#bgGradient)\"且无x/y属性（默认0,0），width=1280,height=720"
started: "用户报告背景rect显示效果不对"

## Eliminated

## Evidence

- timestamp: 2026-07-01T02:05:00.000Z
  checked: "parseSvg输出验证"
  found: "渐变被正确解析到attrs.gradient，gradient.type='linear'，colors正确包含两个stop颜色"
  implication: "解析阶段没有问题，gradient对象正确创建"

- timestamp: 2026-07-01T02:08:00.000Z
  checked: "transformElement输出验证"
  found: "rect转换为left=0, top=0, width=1000, height=562.5（正确缩放到目标画布）"
  implication: "rect的位置和尺寸正确"

- timestamp: 2026-07-01T02:10:00.000Z
  checked: "Gradient类型定义（slides.ts）"
  found: "PPTist的Gradient类型只有type, colors, rotate三个字段，没有x1/y1/x2/y2"
  implication: "渐变方向必须通过rotate属性控制"

- timestamp: 2026-07-01T02:12:00.000Z
  checked: "svg-parser.ts中resolveFillReference函数"
  found: "函数将gradientTransform转换为rotate角度，但完全忽略x1/y1/x2/y2坐标"
  implication: "当SVG渐变使用x1/y1/x2/y2定义方向（且无gradientTransform）时，方向信息丢失"

- timestamp: 2026-07-01T02:14:00.000Z
  checked: "x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"的实际输出"
  found: "输出的gradient.rotate=0，意味着水平渐变；而原始SVG是对角线渐变（45度）"
  implication: "渐变方向丢失是根本问题"

## Resolution

root_cause: "当SVG linearGradient使用x1/y1/x2/y2定义渐变方向（而非gradientTransform）时，代码只处理gradientTransform转换为rotate，完全忽略了x1/y1/x2/y2坐标。对于x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"（从左上到右下的对角线渐变），代码输出rotate=0（水平渐变），导致渐变方向丢失"
fix: "在resolveFillReference中，当没有gradientTransform但有x1/y1/x2/y2坐标时，应将坐标对转换为旋转角度。例如x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"对应45度角（Math.atan2(1,1) * 180/PI）"
verification: "测试SVG渐变x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"被错误转换为rotate=0"
files_changed: []
