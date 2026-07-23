# 11-CONTEXT.md — text-measurement-opt

## 来源

用户报告 51 个元素的 SVG 转换耗时 10332ms，其中 text 元素测量是主要瓶颈。

## 约束

- `measureTextElement` 输入参数稳定，适合做缓存 key
- Resvg WASM 实例可复用，初始化开销已消除
- 并行化需要控制并发度，避免 WASM 实例竞争
- 测量结果只读，不修改 SVG AST

## 关键文件

- `src/text-measurer.ts` — `measureTextElement` 每次 new Resvg，无缓存
- `src/transformer/transform-to-pptel.ts` — `walk` 中串行调用 `measureTextElement`
