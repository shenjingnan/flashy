import type { LogEntry, LogLevel, LogSink, LogType } from './types';

/** 环形日志缓冲，实现 LogSink 接口。 */
export interface LogBuffer extends LogSink {
  /** 当前全部日志（只读快照）。 */
  lines(): readonly LogEntry[];
  /** 清空日志。 */
  clear(): void;
  /** 订阅日志变更；返回取消订阅函数。 */
  subscribe(listener: (entries: readonly LogEntry[]) => void): () => void;
}

export interface LogBufferOptions {
  /** 缓冲上限，超出后裁剪最旧的记录。 */
  max?: number;
}

/** 创建环形日志缓冲。 */
export function createLogBuffer(options: LogBufferOptions = {}): LogBuffer {
  const max = options.max ?? 500;
  let entries: LogEntry[] = [];
  const listeners = new Set<(entries: readonly LogEntry[]) => void>();

  function emit(): void {
    for (const listener of listeners) {
      listener(entries);
    }
  }

  return {
    push: (level: LogLevel, text: string, type: LogType = 'system') => {
      entries = [...entries, { level, type, text, ts: Date.now() }];
      if (entries.length > max) {
        entries = entries.slice(entries.length - max);
      }
      emit();
    },
    lines: () => entries,
    clear: () => {
      entries = [];
      emit();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** 格式化单条日志为 "[HH:MM:SS.mmm] LEVEL text"。 */
export function formatLogEntry(entry: LogEntry): string {
  const date = new Date(entry.ts);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  const mmm = String(date.getMilliseconds()).padStart(3, '0');
  return `[${hh}:${mm}:${ss}.${mmm}] ${entry.level.toUpperCase()} ${entry.text}`;
}

/** 将字节数格式化为人类可读的大小。 */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'] as const;
  let value = n;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rendered = unitIndex === 0 ? String(value) : value.toFixed(2);
  return `${rendered} ${units[unitIndex]}`;
}
