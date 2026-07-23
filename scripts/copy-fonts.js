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

// 复制所有常见字体格式(woff2/ttf/otf)。resvg-js 底层 fontdb 只支持 ttf/otf,
// 但保留 woff2 也能让 web 端(如 templates/)继续使用。
const FONT_EXTS = new Set(['.woff2', '.ttf', '.otf', '.woff'])

let copied = 0
for (const entry of fs.readdirSync(srcDir)) {
  const ext = path.extname(entry).toLowerCase()
  if (!FONT_EXTS.has(ext)) continue
  const src = path.join(srcDir, entry)
  const dest = path.join(destDir, entry)
  fs.copyFileSync(src, dest)
  copied++
}

if (copied > 0) {
  console.log(`[copy-fonts] Copied ${copied} font file(s) to ${destDir}`)
}