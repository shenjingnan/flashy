import { describe, expect, it, vi } from 'vitest';
import { createLogBuffer, formatBytes, formatLogEntry } from '../core/logBuffer';
import type { LogEntry } from '../core/types';

describe('createLogBuffer', () => {
  it('should start empty', () => {
    const buffer = createLogBuffer();
    expect(buffer.lines()).toEqual([]);
  });

  it('should push entries with level and timestamp', () => {
    const buffer = createLogBuffer();
    buffer.push('info', 'hello');
    buffer.push('error', 'boom');
    const lines = buffer.lines();
    expect(lines).toHaveLength(2);
    expect(lines[0]?.level).toBe('info');
    expect(lines[0]?.text).toBe('hello');
    expect(typeof lines[0]?.ts).toBe('number');
    expect(lines[1]?.level).toBe('error');
  });

  it('should default the source type to system and accept an explicit type', () => {
    const buffer = createLogBuffer();
    buffer.push('info', 'a');
    buffer.push('info', 'b', 'flash');
    const lines = buffer.lines();
    expect(lines[0]?.type).toBe('system');
    expect(lines[1]?.type).toBe('flash');
  });

  it('should cap the buffer at max and trim oldest entries', () => {
    const buffer = createLogBuffer({ max: 3 });
    buffer.push('info', 'a');
    buffer.push('info', 'b');
    buffer.push('info', 'c');
    buffer.push('info', 'd');
    const lines = buffer.lines();
    expect(lines).toHaveLength(3);
    expect(lines.map((l) => l.text)).toEqual(['b', 'c', 'd']);
  });

  it('should clear entries', () => {
    const buffer = createLogBuffer();
    buffer.push('info', 'a');
    buffer.clear();
    expect(buffer.lines()).toEqual([]);
  });

  it('should notify subscribers on push', () => {
    const buffer = createLogBuffer();
    const listener = vi.fn();
    buffer.subscribe(listener);
    buffer.push('info', 'a');
    expect(listener).toHaveBeenCalledTimes(1);
    const entries: readonly LogEntry[] = listener.mock.calls[0]?.[0] ?? [];
    expect(entries.map((e) => e.text)).toEqual(['a']);
  });

  it('should notify subscribers on clear', () => {
    const buffer = createLogBuffer();
    const listener = vi.fn();
    buffer.subscribe(listener);
    buffer.clear();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe cleanly', () => {
    const buffer = createLogBuffer();
    const listener = vi.fn();
    const unsubscribe = buffer.subscribe(listener);
    unsubscribe();
    buffer.push('info', 'a');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('formatLogEntry', () => {
  it('should format level in uppercase', () => {
    const entry: LogEntry = { level: 'warn', text: '注意', ts: 0, type: 'system' };
    expect(formatLogEntry(entry)).toContain(' WARN ');
  });

  it('should include padded timestamp components', () => {
    const entry: LogEntry = {
      level: 'info',
      type: 'system',
      text: 'x',
      ts: new Date(2026, 0, 1, 9, 5, 3, 4).getTime(),
    };
    expect(formatLogEntry(entry)).toMatch(/^\[\d{2}:\d{2}:\d{2}\.\d{3}\] INFO x$/);
  });
});

describe('formatBytes', () => {
  it('should format bytes in B/KB/MB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1023)).toBe('1023 B');
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
  });

  it('should handle non-finite and negative input as 0 B', () => {
    expect(formatBytes(Number.NaN)).toBe('0 B');
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('0 B');
    expect(formatBytes(-5)).toBe('0 B');
  });
});
