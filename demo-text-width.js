/**
 * Demo: 测试 resvg-js 测量文字宽度
 * 运行: node demo-text-width.js
 */

const { Resvg } = require("@resvg/resvg-js");

// 测试1: Georgia 字体（SVG原始字体）
const svgGeorgia = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<text xmlns="http://www.w3.org/2000/svg" x="84" y="88" font-family="Georgia, &quot;Microsoft YaHei&quot;, serif" font-size="36" font-weight="700" fill="#1A365D">A simpler model, better results, less training</text>
</svg>`;

// 测试2: Source Han Sans CN Regular（替换后的字体）
const svgSourceHan = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<text xmlns="http://www.w3.org/2000/svg" x="84" y="88" font-family="Source Han Sans CN Regular" font-size="36" font-weight="700" fill="#1A365D">A simpler model, better results, less training</text>
</svg>`;

function measure(svg, label, fontPath = null) {
  // resvg-js 选项（如果提供了字体文件）
  const opts = fontPath ? {
    font: {
      fontFiles: [fontPath],
    },
  } : {};

  const resvg = new Resvg(svg, opts);
  const bbox = resvg.getBBox();

  // 设计稿宽度
  const designWidth = 1000;
  // SVG viewBox 宽度
  const viewBoxWidth = 1280;
  // 缩放比例
  const scale = designWidth / viewBoxWidth;

  // bbox.width 已经是 SVG viewBox 坐标系中的宽度
  // 缩放到设计稿尺寸
  const scaledWidth = bbox.width * scale;

  console.log(`${label}:`);
  console.log(`  bbox.width (viewBox坐标): ${bbox.width}px`);
  console.log(`  缩放后 (设计稿 ${designWidth}px): ${scaledWidth.toFixed(2)}px`);
  console.log('');
}

console.log("=== 文字宽度测量对比 ===\n");

// 使用绝对路径,避免 Resvg 找不到字体文件
// 注意:resvg-js 底层用 fontdb,只支持 TTF/OTF,不支持 WOFF2
const path = require('path')
const sourceHanFontPath = path.resolve(__dirname, 'src/fonts/Source Han Sans CN Regular.ttf')
console.log('Source Han 字体路径:', sourceHanFontPath)
const fs = require('fs')
console.log('字体文件存在:', fs.existsSync(sourceHanFontPath))

console.log("--- 无字体文件加载 (使用系统字体) ---\n");
measure(svgGeorgia, "测试1: Georgia (无字体加载)");
measure(svgSourceHan, "测试2: Source Han Sans (无字体加载)");

console.log("--- 有字体文件加载 ---\n");
measure(svgSourceHan, "测试3: Source Han Sans (有字体加载)", sourceHanFontPath);

console.log("📐 计算公式:");
console.log("  缩放后宽度 = bbox.width × (设计稿宽度 / viewBox宽度)");
console.log(`  对于你的例子: bbox.width × (${1000} / ${1280}) = bbox.width × 0.78125`);
console.log("");
console.log("💡 浏览器参考值:");
console.log("  Georgia(50px) × 0.78125 = 39.06px");
console.log("  雅黑(44px) × 0.78125 = 34.375px");
