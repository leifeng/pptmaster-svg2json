/**
 * 字体预处理模块
 * 在 SVG 被解析转换之前，将文件中所有字体替换为 "Source Han Sans CN Regular"
 */

const TARGET_FONT = 'Source Han Sans CN Regular'

/**
 * 统一 SVG 内容中的字体为 Source Han Sans CN Regular
 * @param svgContent SVG 字符串
 *returns 处理后的 SVG 字符串
 */
export function normalizeFontFamily(svgContent: string): string {
  let result = svgContent

  // 1. 替换属性中的 font-family（双引号）
  result = result.replace(
    /font-family\s*=\s*"([^"]*)"/gi,
    `font-family="${TARGET_FONT}"`
  )

  // 2. 替换属性中的 font-family（单引号）
  result = result.replace(
    /font-family\s*=\s*'([^']*)'/gi,
    `font-family="${TARGET_FONT}"`
  )

  // 3. 替换属性中的 font 属性
  // 先匹配 font="..." 的情况（双引号）
  result = result.replace(
    /font\s*=\s*"([^"]*)"/gi,
    (match, fontValue) => {
      return `font="${replaceFontFamilyInShorthand(fontValue)}"`
    }
  )

  // 再匹配 font='...' 的情况（单引号）
  result = result.replace(
    /font\s*=\s*'([^']*)'/gi,
    (match, fontValue) => {
      return `font="${replaceFontFamilyInShorthand(fontValue)}"`
    }
  )

  // 4. 处理 <style> 标签内的 CSS 规则
  result = result.replace(
    /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (match, openTag, cssContent, closeTag) => {
      const normalizedCss = normalizeCssFontFamily(cssContent)
      return openTag + normalizedCss + closeTag
    }
  )

  return result
}

/**
 * 替换 font shorthand 值中的 font-family 部分
 * 格式: [font-style] [font-weight] [font-size[/line-height]] [font-family]
 * 例如: "12px Arial", "12px/1.5 Arial", "italic bold 14px Helvetica"
 */
function replaceFontFamilyInShorthand(fontValue: string): string {
  // 先检查是否有引号包围的 font-family（最后一个引号包围的部分）
  const parts = fontValue.split(/\s+/)
  const resultParts: string[] = []
  let foundFontSize = false
  let foundFontFamily = false

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]

    // 检查是否是 font-size 或 font-size/line-height
    const isSize = /^\d+(\.\d+)?(px|pt|em|%)?(\/\d+(\.\d+)?)?$/.test(part)
    // font-weight 和 font-style 的常见关键字
    const isKeyword = /^(normal|bold|bolder|lighter|100|200|300|400|500|600|700|800|900|italic|oblique|small-caps)$/i.test(part)

    if (!foundFontSize && (isSize || isKeyword)) {
      // font-size 之前的 keyword 或 font-size 本身，加入结果
      resultParts.push(part)
      if (isSize) {
        foundFontSize = true
      }
    } else {
      // font-size 之后的部分替换为 font-family
      if (!foundFontFamily) {
        resultParts.push(TARGET_FONT)
        foundFontFamily = true
      }
      // 如果已经有 font-family，跳过其他部分
    }
  }

  // 如果没有找到 font-family，在最后添加
  if (!foundFontFamily) {
    resultParts.push(TARGET_FONT)
  }

  return resultParts.join(' ')
}

/**
 * 规范化 CSS 内容中的字体声明
 */
function normalizeCssFontFamily(cssContent: string): string {
  let result = cssContent

  // 替换 font-family 声明
  result = result.replace(
    /font-family\s*:\s*([^;}\n]+);?/gi,
    `font-family: ${TARGET_FONT};`
  )

  // 替换 font shorthand（包含 font-family）
  result = result.replace(
    /font\s*:\s*([^;}\n]+);?/gi,
    (match, fontDecl) => {
      return `font: ${replaceFontFamilyInShorthand(fontDecl.trim())};`
    }
  )

  return result
}
