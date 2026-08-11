import type { IEspLoaderTerminal } from 'esptool-js';
import type { LogSink } from '../core/types';

/**
 * 将 esptool-js 的终端回调桥接到 LogSink。
 *
 * esptool-js 会混用 write（进度字符，无换行）与 writeLine（完整行），
 * 因此 write 先累积到 pending 缓冲，直到 writeLine 才落一条日志。
 * write 收到的内容可能含 `\r`（同屏刷新进度），按 `\r` 切分成多条日志。
 */
export function createLoaderTerminal(sink: LogSink): IEspLoaderTerminal {
  let pending = '';

  return {
    clean: () => {
      pending = '';
      sink.push('info', '──────── 连接日志 ────────');
    },
    write: (data) => {
      pending += data;
      const parts = pending.split('\r');
      const last = parts[parts.length - 1] ?? '';
      for (let i = 0; i < parts.length - 1; i += 1) {
        const line = parts[i];
        if (line !== undefined && line !== '') {
          sink.push('info', line.trimEnd());
        }
      }
      pending = last;
    },
    writeLine: (data) => {
      const text = `${pending}${data}`.trimEnd();
      pending = '';
      if (text !== '') {
        sink.push('info', text);
      }
    },
  };
}
