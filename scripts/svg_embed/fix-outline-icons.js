/**
 * fix-outline-icons.js
 *
 * 修复已嵌入的 tabler-outline 图标 - 把 fill 改为 stroke
 *
 * 用法: node fix-outline-icons.js <svg文件路径>
 */

const fs = require('fs');
const path = require('path');

/**
 * 修复 tabler-outline 风格的 path
 * tabler-outline 是线条风格，应该用 stroke 而不是 fill
 */
function fixOutlineIcons(svgPath) {
  console.log(`处理: ${svgPath}`);

  let content = fs.readFileSync(svgPath, 'utf-8');

  // tabler-outline 图标都被嵌入在 <g transform="translate(x, y)"> 内部
  // 匹配这种模式的 path 元素
  const gRegex = /<g transform="translate\([^)]+\)">\s*([\s\S]*?)<\/g>/g;

  let fixedCount = 0;

  content = content.replace(gRegex, (match, pathsBlock) => {
    // 检查这个 g 块是否包含 tabler-outline 图标的特征 path
    // tabler-outline 图标通常有 stroke-width 属性

    // 修复路径块中的 path
    const fixedPaths = pathsBlock.replace(/<path\s+(d="[^"]*")\s+fill="([^"]*)"\s+stroke-width="([^"]*)"\/>/g,
      (pathMatch, dAttr, fill, strokeWidth) => {
        fixedCount++;
        return `<path ${dAttr} fill="none" stroke="${fill}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
      });

    return `<g transform="translate(90, 536)">\n  ${fixedPaths}\n</g>`;
  });

  fs.writeFileSync(svgPath, content, 'utf-8');
  console.log(`完成: 共修复 ${fixedCount} 个路径\n`);
}

// 主入口
if (require.main === module) {
  const svgPath = process.argv[2];

  if (!svgPath) {
    console.error('用法: node fix-outline-icons.js <svg文件路径>');
    console.error('示例: node fix-outline-icons.js ../exampels/gs.svg');
    process.exit(1);
  }

  const absolutePath = path.resolve(svgPath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`错误: 文件不存在 - ${absolutePath}`);
    process.exit(1);
  }

  fixOutlineIcons(absolutePath);
}

module.exports = { fixOutlineIcons };
