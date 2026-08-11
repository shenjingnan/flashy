import type { BaudRate } from './types';

/**
 * 支持的波特率预设（由大到小）。
 * 1500000 对 CH343/FTDI 等桥接芯片稳定；CH340 通常只能稳定到 921600。
 */
export const BAUD_RATES: readonly BaudRate[] = [1500000, 921600, 460800, 230400, 115200];

/** 默认波特率。 */
export const DEFAULT_BAUD_RATE: BaudRate = 115200;

/**
 * 自动模式尝试的波特率序列：最高速率优先，逐个降级，
 * 直到某个速率成功完成连接、检测与通信。
 */
export const AUTO_BAUD_CANDIDATES: readonly BaudRate[] = BAUD_RATES;

/** 判断值是否为支持的波特率。 */
export function isBaudRate(value: unknown): value is BaudRate {
  return typeof value === 'number' && (BAUD_RATES as readonly number[]).includes(value);
}

/**
 * 控制台波特率预设（固件运行时打印日志的波特率，与烧录波特率无关）。
 * ESP-IDF 默认 115200；ESP8266 早期固件用 74880。
 */
export const CONSOLE_BAUD_RATES: readonly number[] = [115200, 921600, 74880, 9600];

/** 默认控制台波特率。 */
export const DEFAULT_CONSOLE_BAUD = 115200;

/**
 * 将字符串或数字解析为波特率；非法值回退到 fallback。
 */
export function parseBaudRate(
  input: string | number | undefined,
  fallback: BaudRate = DEFAULT_BAUD_RATE
): BaudRate {
  const n = typeof input === 'number' ? input : Number(input);
  return isBaudRate(n) ? n : fallback;
}
