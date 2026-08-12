import { describe, expect, it } from 'vitest';
import { isNearBottom, planLogRender } from '../core/scrollUtils';
import type { LogEntry } from '../core/types';

function entry(text: string): LogEntry {
  return { level: 'info', type: 'system', text, ts: 0 };
}

describe('isNearBottom', () => {
  it('should return true when remaining scroll distance is below the threshold', () => {
    expect(isNearBottom(1000, 600, 400)).toBe(true); // 剩余 0 < 24
    expect(isNearBottom(1000, 585, 400)).toBe(true); // 剩余 15 < 24
  });

  it('should return false when scrolled away from the bottom', () => {
    expect(isNearBottom(1000, 0, 400)).toBe(false); // 剩余 600 >= 24
    expect(isNearBottom(1000, 400, 400)).toBe(false); // 剩余 200 >= 24
  });

  it('should honor a custom threshold and the exact boundary', () => {
    expect(isNearBottom(1000, 600, 400, 0)).toBe(false); // 剩余 0 < 0 不成立
    expect(isNearBottom(1000, 590, 400, 10)).toBe(false); // 剩余 10 < 10 不成立（边界恰等）
    expect(isNearBottom(1000, 600, 400, 10)).toBe(true); // 剩余 0 < 10
  });

  it('should return true when content does not fill the viewport', () => {
    expect(isNearBottom(300, 0, 400)).toBe(true); // 剩余为负，视为已在底部
  });
});

describe('planLogRender', () => {
  it('should return clear when there are no lines', () => {
    expect(planLogRender({ renderedEntries: [entry('a')] }, [])).toEqual({ action: 'clear' });
  });

  it('should return rebuild on the first render', () => {
    const lines = [entry('a'), entry('b')];
    expect(planLogRender({ renderedEntries: null }, lines)).toEqual({ action: 'rebuild' });
  });

  it('should return rebuild when the current first line is not in the previous snapshot', () => {
    // 一次性裁剪过多：lines[0] 不在已渲染快照中，无法增量对齐 → 全量重建兜底
    const prev = [entry('a'), entry('b'), entry('c')];
    const lines = [entry('x'), entry('y')];
    expect(planLogRender({ renderedEntries: prev }, lines)).toEqual({ action: 'rebuild' });
  });

  it('should return rebuild when the total count shrank unexpectedly', () => {
    const first = entry('a');
    const prev = [first, entry('b'), entry('c'), entry('d')];
    const lines = [first, entry('b')]; // 整体变少
    expect(planLogRender({ renderedEntries: prev }, lines)).toEqual({ action: 'rebuild' });
  });

  it('should return adjust with append only when lines were added without eviction', () => {
    const first = entry('a');
    const prev = [first];
    const lines = [first, entry('b'), entry('c')];
    expect(planLogRender({ renderedEntries: prev }, lines)).toEqual({
      action: 'adjust',
      removeFromHead: 0,
      appendFrom: 1,
      to: 3,
    });
  });

  it('should return adjust that removes evicted head lines and appends the new tail', () => {
    const a = entry('a');
    const b = entry('b');
    const c = entry('c');
    const d = entry('d');
    const e = entry('e');
    const prev = [a, b, c, d];
    const lines = [b, c, d, e]; // 裁掉 a，追加 e
    expect(planLogRender({ renderedEntries: prev }, lines)).toEqual({
      action: 'adjust',
      removeFromHead: 1,
      appendFrom: 3,
      to: 4,
    });
  });

  it('should return adjust that only removes when the head shrank without addition', () => {
    const a = entry('a');
    const b = entry('b');
    const c = entry('c');
    const prev = [a, b, c];
    const lines = [b, c]; // 裁掉 a，无新增
    expect(planLogRender({ renderedEntries: prev }, lines)).toEqual({
      action: 'adjust',
      removeFromHead: 1,
      appendFrom: 2,
      to: 2,
    });
  });

  it('should return noop when nothing changed', () => {
    const first = entry('a');
    const lines = [first];
    expect(planLogRender({ renderedEntries: lines }, lines)).toEqual({ action: 'noop' });
  });
});
