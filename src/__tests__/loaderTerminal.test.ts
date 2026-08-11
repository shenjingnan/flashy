import { describe, expect, it, vi } from 'vitest';
import type { LogSink } from '../core/types';
import { createLoaderTerminal } from '../terminal/loaderTerminal';

function makeSink() {
  const sink: LogSink = { push: vi.fn() };
  return sink;
}

describe('createLoaderTerminal', () => {
  it('should merge pending write() data with the next writeLine()', () => {
    const sink = makeSink();
    const terminal = createLoaderTerminal(sink);
    terminal.write('Connecting....');
    terminal.write('..');
    terminal.writeLine('done');
    expect(sink.push).toHaveBeenCalledWith('info', 'Connecting......done', 'flash');
  });

  it('should flush write() data separated by carriage returns', () => {
    const sink = makeSink();
    const terminal = createLoaderTerminal(sink);
    terminal.write('Writing at 0x1000... (10 %)\r');
    terminal.write('Writing at 0x1000... (20 %)\r');
    terminal.write('Writing at 0x1000... (30 %)');
    const texts = vi.mocked(sink.push).mock.calls.map((call) => call[1]);
    expect(texts).toEqual(['Writing at 0x1000... (10 %)', 'Writing at 0x1000... (20 %)']);
  });

  it('should emit writeLine() as a single log entry', () => {
    const sink = makeSink();
    const terminal = createLoaderTerminal(sink);
    terminal.writeLine('Chip is ESP32-D0WD-V3');
    expect(sink.push).toHaveBeenCalledWith('info', 'Chip is ESP32-D0WD-V3', 'flash');
  });

  it('should trim trailing whitespace from emitted lines', () => {
    const sink = makeSink();
    const terminal = createLoaderTerminal(sink);
    terminal.writeLine('  some line  ');
    expect(sink.push).toHaveBeenCalledWith('info', '  some line', 'flash');
  });

  it('should skip empty lines', () => {
    const sink = makeSink();
    const terminal = createLoaderTerminal(sink);
    terminal.writeLine('');
    terminal.writeLine('   ');
    expect(sink.push).toHaveBeenCalledTimes(0);
  });

  it('should keep pending buffer across writeLine flushes', () => {
    const sink = makeSink();
    const terminal = createLoaderTerminal(sink);
    terminal.write('A');
    terminal.writeLine('1');
    terminal.write('B');
    terminal.writeLine('2');
    const texts = vi.mocked(sink.push).mock.calls.map((call) => call[1]);
    expect(texts).toEqual(['A1', 'B2']);
  });

  it('should reset pending buffer and push a separator on clean()', () => {
    const sink = makeSink();
    const terminal = createLoaderTerminal(sink);
    terminal.write('stale');
    terminal.clean();
    terminal.writeLine('fresh');
    const texts = vi.mocked(sink.push).mock.calls.map((call) => call[1]);
    expect(texts).toEqual(['──────── 连接日志 ────────', 'fresh']);
  });
});
