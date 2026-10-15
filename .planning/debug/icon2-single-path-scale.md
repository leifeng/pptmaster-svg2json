---
status: investigating
trigger: "exampels/08_training.svg Icon 2 (Hardware): 1 path with same transform as other icons, but wrong size (18.23x23.44 instead of 23.33x30)"
created: 2026-07-15T11:00:00
updated: 2026-07-15T11:00:00
audit_acknowledged:
  milestone: v1.9
  at: 2026-10-15
  status: investigating
---

## Current Focus

hypothesis: "mapCoordinates 对 path 元素应用了 groupScale，导致 coords.width 已经是 scale 后的值。但后续 transformElement 又应用了 canvasScale，导致 width 被双重缩放。最后 viewBoxW 计算时只除了 canvasScale，得到的是 groupScale 后的值而不是原始 bbox"
test: "检查 mapCoordinates 的 path case 是否错误地应用了 groupScale 到 width/height"
expecting: "找出为什么 Icon 2 (单 path) 的输出与其他 icons (多 path) 不一致"
next_action: "完成根因分析和修复方案"

## Symptoms

expected: |
  Icon 2 path: "M13,3L13,10L19,10L11,21L11,14L5,14L13,3"
  raw bbox: left=5, top=3, width=14, height=18
  scale(1.6666...) applied: width=23.33, height=30
  Expected output: viewBox=[23.33, 30], width=23.33, height=30
actual: |
  viewBox: [23.333333333333336, 30]
  width: 18.229166666666668
  height: 23.4375
  path: "M13,3L13,10L19,10L11,21L11,14L5,14L13,3"
errors: []
reproduction: |
  1. 读取 exampels/08_training.svg
  2. 运行转换器
  3. 检查 Hardware 图标（第二个带 scale 的 g）

started: always broken

## Evidence

- timestamp: 2026-07-15T11:01:00
  checked: "createMergedShapeElement 的实际输出"
  found: |
    createMergedShapeElement 对 4-path group 和 2-path group 输出正确的 viewBox：
    - 4 paths: viewBox=[18,16], width=23.44
    - 2 paths: viewBox=[16,14], width=20.83
    - 2 paths (REG): viewBox=[18,18], width=23.44
    但 createMergedShapeElement 没有被调用到 M13 path (1 path)
  implication: "M13 path 没有走 createMergedShapeElement，而是走了普通 path 处理流程"

- timestamp: 2026-07-15T11:05:00
  checked: "walk 函数中 gChildren.length > 1 的检查"
  found: |
    第 1461 行: `const allPathChildren = gChildren.length > 1 && ...`
    只有当 group 有超过 1 个子元素时才会进入合并逻辑
    Hardware group 只有 1 个 path 子元素，所以 allPathChildren = false
    因此 Hardware group 不走 createMergedShapeElement，而是走普通 path 处理
  implication: "单 path 的 group 不走 createMergedShapeElement，这是设计差异"

- timestamp: 2026-07-15T11:10:00
  checked: "mapCoordinates 对 path 的处理"
  found: |
    mapCoordinates 的 case 'path' 中：
    ```javascript
    width = bbox.width * Math.abs(sx)  // sx = groupScale = 1.6666...
    height = bbox.height * Math.abs(sy)
    ```
    bbox.width = 14 (pathBoundingBox 返回的原始值)
    sx = 1.6666... (从 group transform 提取)
    所以 mapCoordinates 返回的 coords.width = 14 * 1.6666... = 23.33
  implication: "mapCoordinates 对 path 应用了 groupScale，返回的 width 已经是 scale 后的值"

- timestamp: 2026-07-15T11:15:00
  checked: "transformElement 中的 canvasScale 应用"
  found: |
    transformElement 第 700-707 行：
    ```javascript
    const scaleX = targetCanvas[0] / viewBox[2]  // canvasScale = 0.78125
    const width = coords.width * scaleX
    ```
    coords.width = 23.33 (已经包含 groupScale)
    scaleX = 0.78125 (canvasScale)
    所以 width = 23.33 * 0.78125 = 18.23
  implication: "width 被双重缩放：先 groupScale 再 canvasScale"

- timestamp: 2026-07-15T11:20:00
  checked: "path case 中 viewBoxW 的计算"
  found: |
    transform-to-pptel.ts 第 935-937 行：
    ```javascript
    const viewBoxW = transformed.width / Math.abs(scaleX)
    const viewBoxH = transformed.height / Math.abs(scaleY)
    const pathD = toAbsolutePath(d)
    ```
    transformed.width = 18.23 (canvasScale 后的值)
    scaleX = 0.78125 (canvasScale)
    viewBoxW = 18.23 / 0.78125 = 23.33
    但原始 bbox.width = 14
  implication: "viewBoxW 是 groupScale 后的值，而不是原始 bbox 尺寸"

- timestamp: 2026-07-15T11:25:00
  checked: "transformIconElement 的正确实现"
  found: |
    transformIconElement (正确实现):
    ```javascript
    const resultWidth = iconW * Math.abs(scaleX)  // scaleX = groupScale
    const viewBoxW = iconW * Math.abs(scaleX)
    const pathD = scalePathCoords(toAbsolutePath(d), scaleX, scaleY)
    ```
    viewBox 和 path 都在 groupScale 坐标空间
    width = viewBoxW = iconW * scaleX (一致)
  implication: "transformIconElement 的处理是正确的：viewBox 和 width 都应用 groupScale"

- timestamp: 2026-07-15T11:30:00
  checked: "transformElement 普通 path 处理 vs transformIconElement"
  found: |
    问题根源：
    1. transformIconElement: viewBox = pathD = scale 后的坐标空间 (正确)
    2. transformElement 普通 path: viewBox = transformed.width / canvasScale (错误)

    transformElement 普通 path 的问题：
    - mapCoordinates 返回的 coords.width 已经包含 groupScale
    - transformElement 又应用了 canvasScale
    - viewBoxW 计算时只除了 canvasScale，得到的是 groupScale 后的值

    createMergedShapeElement 的处理：
    - viewBox = rawBbox (原始尺寸)
    - width = rawBbox * groupScale * canvasScale
    - path = 原始坐标
    这与 transformElement 普通 path 的处理不一致
  implication: "三种处理方式不一致：transformIconElement、createMergedShapeElement、transformElement 普通 path"

## Eliminated

## Resolution

root_cause: |
  mapCoordinates 对 path 元素应用了 groupScale 到 width/height，但 transformElement 后续又应用了 canvasScale，导致 width 被双重缩放。在计算 viewBoxW 时只除了 canvasScale，没有正确还原到原始 bbox 尺寸。

  问题链条：
  1. mapCoordinates case 'path': width = bbox.width * |sx| (sx=groupScale=1.6666...) → coords.width = 23.33
  2. transformElement: width = coords.width * scaleX (scaleX=canvasScale=0.78125) → width = 18.23
  3. path case: viewBoxW = transformed.width / scaleX = 18.23 / 0.78125 = 23.33

  期望：
  - viewBoxW 应该等于原始 bbox.width = 14
  - width 应该等于 viewBoxW * groupScale = 23.33 (或原始 width * canvasScale = 10.94)

  实际：
  - viewBoxW = 23.33 (groupScale 后的值)
  - width = 18.23 (双重缩放后的值)

  createMergedShapeElement 对多 path group 输出正确的 viewBox=[14,18]，但单 path group 走普通 path 处理，viewBox 计算错误。

fix: |
  修复方案：在 transformElement 的 path case 中，计算 viewBoxW 时应该除以 groupScale，而不仅仅是 canvasScale。

  修改 transform-to-pptel.ts 第 935-936 行：
  ```javascript
  // 当前 (错误):
  const viewBoxW = transformed.width / Math.abs(scaleX)
  const viewBoxH = transformed.height / Math.abs(scaleY)

  // 修复后:
  // transformed.width 已经包含 groupScale 和 canvasScale
  // 需要除以 groupScale 和 canvasScale 回到原始 bbox
  // 但 transformed.width 是 groupScale*canvasScale 后的值
  // 所以 viewBoxW = transformed.width / (groupScale * canvasScale)
  // = transformed.width / (transform.scaleX * scaleX)
  const groupScaleX = transform.scaleX ?? 1
  const groupScaleY = transform.scaleY ?? 1
  const viewBoxW = transformed.width / (Math.abs(groupScaleX) * Math.abs(scaleX))
  const viewBoxH = transformed.height / (Math.abs(groupScaleY) * Math.abs(scaleY))
  ```

  更好的方案可能是：
  - 不让 mapCoordinates 对 path 应用 groupScale
  - 在 transformElement 中统一应用 groupScale 和 canvasScale

verification: ""
files_changed: []
