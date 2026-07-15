/**
 * embed-icons.js
 *
 * 将 SVG 中的 <use data-icon="library/name"> 占位符替换为实际 SVG 内容
 *
 * 用法: node embed-icons.js <svg文件路径>
 *
 * 示例: node embed-icons.js ../exampels/gs.svg
 */

const fs = require('fs');
const path = require('path');

// 图标库基础目录
const ICONS_BASE = path.resolve(__dirname, '../../templates/icons');

// 图标库风格配置
// - fill 风格: chunk-filled, tabler-filled, simple-icons (用 fill 属性)
// - stroke 风格: tabler-outline (用 stroke 属性，fill 为 none)
// - duotone 风格: phosphor-duotone (需要特殊处理)
const STYLE_CONFIG = {
  'chunk-filled': { mode: 'fill' },
  'tabler-filled': { mode: 'fill' },
  'tabler-outline': { mode: 'stroke' },
  'phosphor-duotone': { mode: 'duotone' },
  'simple-icons': { mode: 'fill' },
};

/**
 * 从 SVG 文件中提取单个 path 元素的内容
 */
function extractPathContent(svgPath, iconLibrary, fill, strokeWidth) {
  const svgContent = fs.readFileSync(svgPath, 'utf-8');

  // 提取所有 path 元素的 d 属性
  const pathRegex = /<path[^>]*d="([^"]*)"[^>]*\/?>/g;
  const paths = [];
  let match;

  while ((match = pathRegex.exec(svgContent)) !== null) {
    let d = match[1];
    paths.push(d);
  }

  if (paths.length === 0) {
    console.warn(`  警告: ${svgPath} 中未找到 path 元素`);
    return null;
  }

  const style = STYLE_CONFIG[iconLibrary] || { mode: 'fill' };

  // 根据图标库风格构建属性
  if (style.mode === 'stroke') {
    // stroke 风格 (tabler-outline): 用 stroke 绘制线条，fill 为 none
    return paths.map(d => {
      return `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }).join('\n  ');
  } else if (style.mode === 'duotone') {
    // duotone 风格: 主色填充 + 20% 透明度背景
    return paths.map(d => {
      return `<path d="${d}" fill="${fill}" fill-opacity="0.2"/>\n  <path d="${d}" fill="${fill}"/>`;
    }).join('\n  ');
  } else {
    // fill 风格: 直接用 fill 填充
    return paths.map(d => {
      return `<path d="${d}" fill="${fill}"/>`;
    }).join('\n  ');
  }
}

/**
 * 处理单个 SVG 文件
 */
function embedIcons(svgPath) {
  console.log(`处理: ${svgPath}`);

  let content = fs.readFileSync(svgPath, 'utf-8');

  // 匹配 <use data-icon="xxx/yyy" .../>  或  <use data-icon="xxx/yyy" ...></use>
  const useRegex = /<use\s+data-icon="([^"]+)"([^>]*?)\/?>(?:<\/use>)?/g;

  let match;
  let replacedCount = 0;

  while ((match = useRegex.exec(content)) !== null) {
    const iconRef = match[1]; // e.g., "tabler-outline/book"
    const attrs = match[2];   // e.g., ' x="90" y="536" width="22" height="22" fill="#0E6251" stroke-width="2"'

    // 解析属性
    const attrMap = {};
    const attrRegex = /(\w+(?:-\w+)?)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      attrMap[attrMatch[1]] = attrMatch[2];
    }

    const iconPath = path.join(ICONS_BASE, iconRef + '.svg');

    if (!fs.existsSync(iconPath)) {
      console.warn(`  警告: 图标文件不存在 - ${iconPath}`);
      continue;
    }

    const fill = attrMap.fill || '#000000';
    const strokeWidth = attrMap['stroke-width'] || '2';

    // 提取 path 内容
    const iconLibrary = iconRef.split('/')[0];
    const pathContent = extractPathContent(iconPath, iconLibrary, fill, strokeWidth);

    if (!pathContent) {
      continue;
    }

    // 构建完整的 SVG 元素
    let width = attrMap.width || '24';
    let height = attrMap.height || '24';
    let x = attrMap.x || '0';
    let y = attrMap.y || '0';

    const replacement = `<g transform="translate(${x}, ${y})">\n  ${pathContent}\n</g>`;

    // 替换
    content = content.replace(match[0], replacement);
    replacedCount++;

    console.log(`  ✓ 替换: ${iconRef} at x=${x}, y=${y}`);
  }

  // 写回文件
  fs.writeFileSync(svgPath, content, 'utf-8');
  console.log(`完成: 共替换 ${replacedCount} 个图标\n`);
}

// 主入口
if (require.main === module) {
  const svgPath = process.argv[2];

  if (!svgPath) {
    console.error('用法: node embed-icons.js <svg文件路径>');
    console.error('示例: node embed-icons.js ../exampels/gs.svg');
    process.exit(1);
  }

  const absolutePath = path.resolve(svgPath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`错误: 文件不存在 - ${absolutePath}`);
    process.exit(1);
  }

  embedIcons(absolutePath);
}

module.exports = { embedIcons };
