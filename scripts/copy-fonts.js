/**
 * 把 src/fonts/*.woff2 复制到 dist/src/fonts/
 *
 * 为什么需要:tsc 不复制二进制资源,但 Resvg 需要读取字体文件来测量文字宽度。
 * 如果不复制,生产构建会找不到字体,Resvg fallback 到内置字体,导致 bbox 与
 * PPTist 实际渲染(用思源黑体)不一致。
 */
const fs = require('fs')
const path = require('path')

const srcDir = path.join(__dirname, '..', 'src', 'fonts')
const destDir = path.join(__dirname, '..', 'dist', 'src', 'fonts')

if (!fs.existsSync(srcDir)) {
  console.warn(`[copy-fonts] Source fonts dir not found: ${srcDir}`)
  process.exit(0)
}

fs.mkdirSync(destDir, { recursive: true })

let copied = 0
for (const entry of fs.readdirSync(srcDir)) {
  if (!entry.toLowerCase().endsWith('.woff2')) continue
  const src = path.join(srcDir, entry)
  const dest = path.join(destDir, entry)
  fs.copyFileSync(src, dest)
  copied++
}

if (copied > 0) {
  console.log(`[copy-fonts] Copied ${copied} font file(s) to ${destDir}`)
}