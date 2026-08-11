/**
 * Web Serial API 的轻量封装。
 *
 * 注意：串口本身由 esptool-js 的 Transport.connect() 打开，
 * 本模块只负责能力检测与用户选择设备。
 */

/** 浏览器 Serial API 的最小接口（便于注入 fake 进行测试）。 */
export interface SerialLike {
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
}

/** 检测当前浏览器是否支持 Web Serial（需 Chrome/Edge 89+ 且 HTTPS 或 localhost）。 */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/**
 * 请求用户选择一个串口设备。
 *
 * 必须在用户手势（click）处理器内同步调用，否则会被浏览器拦截。
 * 用户取消（NotAllowedError）会转换为友好错误。
 */
export async function requestSerialPort(serial: SerialLike): Promise<SerialPort> {
  try {
    return await serial.requestPort();
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    // Chrome/Edge 中用户取消端口选择器抛出 NotFoundError；NotAllowedError 为权限拒绝。
    if (name === 'NotFoundError' || name === 'NotAllowedError') {
      throw new Error('未选择串口设备，连接已取消');
    }
    throw new Error(`无法连接串口设备: ${err instanceof Error ? err.message : String(err)}`);
  }
}
