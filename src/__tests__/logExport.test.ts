import { describe, expect, it } from 'vitest';
import { formatLogEntry } from '../core/logBuffer';
import { formatLogTail, hasTailText } from '../core/logExport';
import type { LogEntry } from '../core/types';

function entry(text: string): LogEntry {
  return { level: 'info', type: 'system', text, ts: 0 };
}

const lines: readonly LogEntry[] = [entry('a'), entry('bb'), entry('ccc')];

describe('formatLogTail', () => {
  it('should return empty result for empty input', () => {
    expect(formatLogTail([])).toEqual({ text: '', startLine: 0, lineCount: 0 });
  });

  it('should format all lines when no options are given', () => {
    const result = formatLogTail(lines);
    expect(result.startLine).toBe(0);
    expect(result.lineCount).toBe(3);
    expect(result.text).toBe(lines.map(formatLogEntry).join('\n'));
  });

  it('should take only the last maxLines lines', () => {
    const result = formatLogTail(lines, { maxLines: 2 });
    expect(result.startLine).toBe(1);
    expect(result.lineCount).toBe(2);
    expect(result.text).toBe(lines.slice(1).map(formatLogEntry).join('\n'));
  });

  it('should accumulate from the tail up to maxChars', () => {
    // 每条格式化长度 = 20 + text.length，换行 +1；maxChars 只保证覆盖到该字符数
    const result = formatLogTail(lines, { maxChars: 20 });
    expect(result.lineCount).toBe(1);
    expect(result.startLine).toBe(2);
    expect(result.text).toBe(lines.slice(2).map(formatLogEntry).join('\n'));
  });

  it('should prefer maxChars over maxLines when both are given', () => {
    const result = formatLogTail(lines, { maxLines: 2, maxChars: 20 });
    expect(result.lineCount).toBe(1); // maxChars 优先，只取最后 1 行
  });

  it('should not exceed the buffer length', () => {
    const result = formatLogTail(lines, { maxLines: 99 });
    expect(result.startLine).toBe(0);
    expect(result.lineCount).toBe(3);
  });
});

describe('hasTailText', () => {
  it('should find a needle in the tail', () => {
    expect(hasTailText(lines, 'ccc', 100)).toBe(true);
  });

  it('should respect the maxLines scan window', () => {
    expect(hasTailText(lines, 'a', 1)).toBe(false); // 'a' 在窗口外
    expect(hasTailText(lines, 'a', 100)).toBe(true);
  });

  it('should return false when the needle is absent', () => {
    expect(hasTailText(lines, 'zzz', 100)).toBe(false);
  });

  it('should return false for an empty input', () => {
    expect(hasTailText([], 'x', 5)).toBe(false);
  });
});
