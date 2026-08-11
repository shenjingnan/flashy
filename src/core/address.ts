/**
 * Flash 地址解析与校验。
 */

/** 允许的最大 Flash 地址（64MB，覆盖 ESP32 全系 Flash 上限）。 */
export const MAX_FLASH_ADDRESS = 0x4_000_000;

/**
 * 解析烧录地址字符串。
 *
 * 支持十六进制（`0x0` / `0x1000`，不区分大小写前缀）与十进制（`4096`）。
 * 非法输入抛出 TypeError。
 */
export function parseAddress(input: string): number {
  const value = input.trim().toLowerCase();
  if (value === '') {
    throw new TypeError('烧录地址不能为空');
  }
  const addr = value.startsWith('0x') ? Number.parseInt(value.slice(2), 16) : Number(value);
  if (!Number.isSafeInteger(addr) || addr < 0 || addr >= MAX_FLASH_ADDRESS) {
    throw new TypeError(`无效的烧录地址: ${input}`);
  }
  return addr;
}

/** 判断字符串是否为合法的烧录地址。 */
export function isValidAddress(input: string): boolean {
  try {
    parseAddress(input);
    return true;
  } catch {
    return false;
  }
}

/** 将数字地址格式化为小写 0x 前缀字符串。 */
export function formatAddress(addr: number): string {
  return `0x${addr.toString(16)}`;
}
