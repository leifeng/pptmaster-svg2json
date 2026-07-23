/**
 * 统一日志工具 - SVG2JSON 转换过程日志
 * 格式：[SVG2JSON] [步骤] 描述: Xms
 */

import { LOG_PREFIX } from '../constants'

/**
 * 记录步骤开始
 */
export function logStart(label: string, description?: string): void {
  console.log(`${LOG_PREFIX} [开始] ${label}${description ? ` - ${description}` : ''}`)
}

/**
 * 记录步骤结束及耗时
 */
export function logEnd(label: string, durationMs: number, description?: string): void {
  console.log(`${LOG_PREFIX} [完成] ${label}: ${durationMs}ms${description ? ` - ${description}` : ''}`)
}

/**
 * 记录步骤完成（无耗时）
 */
export function log(label: string, description?: string): void {
  console.log(`${LOG_PREFIX} ${label}${description ? ` - ${description}` : ''}`)
}

/**
 * 执行异步函数并记录耗时
 */
export async function logStep<T>(
  label: string,
  fn: () => Promise<T>,
  description?: string,
): Promise<T> {
  logStart(label, description)
  const start = performance.now()
  const result = await fn()
  const duration = Math.round(performance.now() - start)
  logEnd(label, duration, description)
  return result
}

/**
 * 执行同步函数并记录耗时
 */
export function logStepSync<T>(
  label: string,
  fn: () => T,
  description?: string,
): T {
  logStart(label, description)
  const start = performance.now()
  const result = fn()
  const duration = Math.round(performance.now() - start)
  logEnd(label, duration, description)
  return result
}
