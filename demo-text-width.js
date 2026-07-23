/**
 * Demo: 测试 resvg-js 测量文字宽度
 * 运行: node demo-text-width.js
 */

const { Resvg } = require("@resvg/resvg-js");

// 测试1: Georgia 字体（SVG原始字体）
const svgGeorgia = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<text xmlns="http://www.w3.org/2000/svg" x="246" y="318" font-family="Arial, &quot;Microsoft YaHei&quot;, sans-serif" font-size="14" fill="#1A202C">Reducing <tspan font-family="Consolas, monospace" font-weight="700" fill="#3182CE">d_k</tspan> hurts quality more than reducing <tspan font-family="Consolas, monospace" font-weight="700" fill="#3182CE">d_v</tspan> — determining compatibility is the harder learning problem.</text>
</svg>`;

// 测试2: Source Han Sans CN Regular（替换后的字体）
const svgSourceHan = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<text xmlns="http://www.w3.org/2000/svg" x="246" y="318" font-family="Source Han Sans CN Regular" font-size="14" fill="#1A202C">Reducing <tspan font-family="Source Han Sans CN Regular" font-weight="700" fill="#3182CE">d_k</tspan> hurts quality more than reducing <tspan font-family="Source Han Sans CN Regular" font-weight="700" fill="#3182CE">d_v</tspan> — determining compatibility is the harder learning problem.</text>
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

// 使用相对路径（相对于当前工作目录）
const sourceHanFontPath = "src/fonts/Source Han Sans CN Regular.woff2";

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
