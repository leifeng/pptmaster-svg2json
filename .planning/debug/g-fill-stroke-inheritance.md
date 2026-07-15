---
status: investigating
trigger: "嵌套 `<g>` 标签中 fill/stroke 颜色未向下传递"
created: 2026-07-13T10:00:00.000Z
updated: 2026-07-13T10:00:00.000Z
---

## Current Focus

hypothesis: "walk 函数只传递 groupId 和 transform，没有传递 fill/stroke 等视觉属性"
test: "查看 walk 函数签名和 transformElement 的调用参数"
expecting: "如果发现 walk 缺少 inheritedAttrs 参数，即确认根因"
next_action: "修复已应用，验证测试结果与修改前一致（14 个失败测试是预先存在的，与修复无关）"

## Symptoms

expected: "嵌套 `<g>` 标签的 fill/stroke 属性应传递给子 `<path>` 元素"
actual: "path 元素获取不到父级 g 的 fill/stroke 颜色"
errors: []
reproduction: |
  <g transform="translate(60, 220)">
      <g transform="translate(0, 116)">
          <g transform="translate(0.0, 0.0) scale(1.1666666666666667, 1.1666666666666667)" 
             fill="#1A3A6B" stroke="#1A3A6B" stroke-width="1.5">
              <path d="M16 16v2a2 2 0 0 1 -2 2h-8..."/>
              ...
          </g>
      </g>
  </g>
started: always

## Eliminated


## Evidence

- timestamp: 2026-07-13T10:00:00.000Z
  checked: "src/transformer/transform-to-pptel.ts walk 函数"
  found: "walk 函数只接收 currentGroupId 和 parentTransform 参数，不接收 fill/stroke 等属性"
  implication: "子元素无法从父级 g 继承 fill/stroke 属性"

- timestamp: 2026-07-13T10:00:00.000Z
  checked: "transformElement 函数签名"
  found: "函数签名: transformElement(element, viewBox, index, targetCanvas, groupId, effectiveTransform)"
  implication: "没有 inheritedAttrs 参数来处理从父级继承的属性"

- timestamp: 2026-07-13T10:00:00.000Z
  checked: "walk 函数递归调用"
  found: "await walk(child, viewBox, effectiveGroupId, effectiveTransform)"
  implication: "只传递了 groupId 和 transform，fill/stroke 等视觉属性没有传递"

## Resolution

root_cause: "walk 函数只传递 groupId 和 transform，没有传递 fill/stroke 等视觉属性。子元素只能获取自己 attrs 中的 fill/stroke，无法从父级 `<g>` 继承"

fix: "在 walk 函数中添加 inheritedAttrs 参数，跟踪父级 fill/stroke 等视觉属性。当遇到 `<g>` 元素时，将 g 的 fill/stroke 等属性合并到 inheritedAttrs。当处理子元素时，将 inheritedAttrs 与子元素自己的 attrs 合并后传递给 transformElement。"

verification: "添加了 3 个新测试用例，全部通过。原有 14 个失败测试保持不变（与本次修复无关）"
files_changed:
  - "src/transformer/transform-to-pptel.ts"
  - "__tests__/group-id.test.ts"
