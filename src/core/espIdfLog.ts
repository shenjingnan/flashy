import type { LogLevel } from './types';

/**
 * 解析 ESP-IDF 固件日志行首的级别字母，映射到统一 LogLevel。
 *
 * ESP-IDF 标准日志格式：`E (257) tag: message`，行首单个字母表示级别
 * （V 详细 / D 调试 / I 信息 / W 警告 / E 错误）。非标准格式一律视为 info。
 */
export function parseEspIdfLevel(line: string): LogLevel {
  const match = /^([VDIWE]) \(\d+\)/.exec(line);
  switch (match?.[1]) {
    case 'E':
      return 'error';
    case 'W':
      return 'warn';
    case 'D':
    case 'V':
      return 'debug';
    default:
      return 'info';
  }
}
