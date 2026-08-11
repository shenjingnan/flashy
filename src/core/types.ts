/**
 * 共享类型定义。
 */

/** 烧录流程的顶层状态。 */
export type FlashState =
  | 'idle'
  | 'connecting'
  | 'detecting'
  | 'connected'
  | 'flashing'
  | 'success'
  | 'monitoring'
  | 'error';

/** 日志级别。 */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/** 一条日志记录。 */
export interface LogEntry {
  level: LogLevel;
  text: string;
  /** 毫秒时间戳。 */
  ts: number;
}

/** 支持的烧录波特率预设（含高速档，自动模式按此顺序降级尝试）。 */
export type BaudRate = 1500000 | 921600 | 460800 | 230400 | 115200;

/** 波特率选择：具体数值或自动（最高速率优先，失败降级）。 */
export type BaudSelection = BaudRate | 'auto';

/** 烧录进度信息（由 esptool-js 的 reportProgress 转换而来）。 */
export interface ProgressInfo {
  fileIndex: number;
  written: number;
  total: number;
}

/** 烧录参数。 */
export interface FlashParams {
  /** 固件二进制数据。 */
  data: Uint8Array;
  /** 烧录起始地址。 */
  address: number;
  /** 通信波特率。 */
  baudrate: BaudRate;
  /** 是否全片擦除。 */
  eraseAll: boolean;
  /** 是否压缩传输。 */
  compress: boolean;
}

/** 芯片检测结果。 */
export interface DetectResult {
  /** 芯片名称，如 "ESP32-D0WD-V3"。 */
  chip: string;
  /** Flash 大小，如 "4MB"；未知为 null。 */
  flashSize: string | null;
  /** 实际采用的波特率（自动模式下为降级后选定的值）。 */
  baudrate: BaudRate;
}

/** 日志接收器接口，便于注入与测试。 */
export interface LogSink {
  push(level: LogLevel, text: string): void;
}
