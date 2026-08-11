/**
 * AI 原生 TypeScript 启动模板
 * 专为 AI 辅助开发时代打造
 */

declare const __VERSION__: string;

/** 当前库的版本号 */
export const VERSION: string = __VERSION__;

/**
 * 配置选项
 */
export interface ConfigOptions {
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 日志级别 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * 配置对象
 */
export interface Config {
  /** 是否启用调试模式 */
  readonly debug: boolean;
  /** 日志级别 */
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** 创建时间 */
  readonly createdAt: Date;
}

/**
 * 向指定名称打招呼
 * @param name - 要打招呼的名称
 * @returns 打招呼的字符串
 * @throws {TypeError} 当 name 为空字符串时
 * @example
 * ```typescript
 * const message = greet('World');
 * console.log(message); // "Hello, World!"
 * ```
 */
export function greet(name: string): string {
  if (name.length === 0) {
    throw new TypeError('name cannot be empty');
  }
  return `Hello, ${name}!`;
}

/**
 * 创建配置对象
 * @param options - 可选的配置选项
 * @returns 配置对象
 * @example
 * ```typescript
 * const config = createConfig({ debug: true });
 * console.log(config.debug); // true
 * ```
 */
export function createConfig(options?: ConfigOptions): Config {
  const { debug = false, logLevel = 'info' } = options ?? {};
  return {
    debug,
    logLevel,
    createdAt: new Date(),
  };
}

// 默认导出
export default {
  greet,
  createConfig,
  VERSION,
};
