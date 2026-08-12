import { formatLogEntry } from './logBuffer';
import type { LogEntry } from './types';

/** 日志尾部导出选项。 */
export interface LogTailOptions {
  /** 只取末尾最多 maxLines 行（与 maxChars 二选一）。 */
  maxLines?: number;
  /** 从末尾累积到至少 maxChars 字符（与 maxLines 二选一）。 */
  maxChars?: number;
}

/** 日志尾部导出的结果。 */
export interface LogTailResult {
  /** 拼接后的文本（行间以换行分隔）。 */
  text: string;
  /** 起始行号（相对于 lines）。 */
  startLine: number;
  /** 实际导出的行数。 */
  lineCount: number;
}

/**
 * 惰性取日志尾部：只格式化需要的行，避免对 10 万行全量 join 造成卡顿。
 *
 * 传 maxChars 时从末尾向前累积字符数（含换行），达到上限即停，保证至少能覆盖该字符数；
 * 传 maxLines 时固定取末尾 maxLines 行。两者都传时 maxChars 优先。
 */
export function formatLogTail(
  lines: readonly LogEntry[],
  options: LogTailOptions = {}
): LogTailResult {
  const { maxLines, maxChars } = options;
  let startLine = 0;
  if (maxChars !== undefined) {
    let chars = 0;
    startLine = lines.length;
    while (startLine > 0 && chars < maxChars) {
      startLine -= 1;
      const entry = lines[startLine];
      if (entry !== undefined) {
        chars += formatLogEntry(entry).length + 1;
      }
    }
  } else if (maxLines !== undefined && lines.length > maxLines) {
    startLine = lines.length - maxLines;
  }
  const parts: string[] = [];
  for (let i = startLine; i < lines.length; i++) {
    const entry = lines[i];
    if (entry !== undefined) {
      parts.push(formatLogEntry(entry));
    }
  }
  return { text: parts.join('\n'), startLine, lineCount: lines.length - startLine };
}

/**
 * 从尾部扫描是否包含指定文本，最多看 maxLines 行。
 * 用于 isStaleStubUsed 这类只需关注最近日志的检查，避免 O(全量)。
 */
export function hasTailText(lines: readonly LogEntry[], needle: string, maxLines: number): boolean {
  const start = Math.max(0, lines.length - maxLines);
  for (let i = start; i < lines.length; i++) {
    const entry = lines[i];
    if (entry?.text.includes(needle)) {
      return true;
    }
  }
  return false;
}
