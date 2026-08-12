import { describe, expect, it } from 'vitest';
import {
  appendHeights,
  applyMeasurements,
  correctHeight,
  createVirtualLogState,
  rowAtOffset,
  rowTop,
  trimHead,
  unionWithSelection,
  visibleRange,
} from '../core/virtualLog';

describe('createVirtualLogState', () => {
  it('should initialize an empty state', () => {
    const s = createVirtualLogState(20);
    expect(s.heights).toEqual([]);
    expect(s.offsets).toEqual([0]);
    expect(s.totalHeight).toBe(0);
    expect(s.defaultHeight).toBe(20);
  });
});

describe('appendHeights', () => {
  it('should append estimated heights and keep offsets as prefix sums', () => {
    const s = createVirtualLogState(20);
    appendHeights(s, 3);
    expect(s.heights).toEqual([20, 20, 20]);
    expect(s.offsets).toEqual([0, 20, 40, 60]);
    expect(s.totalHeight).toBe(60);
  });
});

describe('rowAtOffset', () => {
  it('should locate the row containing a given offset', () => {
    const s = createVirtualLogState(20);
    appendHeights(s, 3); // offsets [0,20,40,60]
    expect(rowAtOffset(s, 0)).toBe(0);
    expect(rowAtOffset(s, 19)).toBe(0);
    expect(rowAtOffset(s, 20)).toBe(1);
    expect(rowAtOffset(s, 39)).toBe(1);
    expect(rowAtOffset(s, 40)).toBe(2);
    expect(rowAtOffset(s, 60)).toBe(2); // 恰等于 totalHeight → 末行
    expect(rowAtOffset(s, 100)).toBe(2); // 越界 → 末行
  });

  it('should return 0 for an empty state', () => {
    expect(rowAtOffset(createVirtualLogState(20), 10)).toBe(0);
  });
});

describe('visibleRange', () => {
  it('should compute the visible window and apply overscan', () => {
    const s = createVirtualLogState(20);
    appendHeights(s, 10);
    expect(visibleRange(s, 0, 100, 0)).toEqual({ start: 0, end: 5 }); // 100px 覆盖第 0-5 行
    expect(visibleRange(s, 0, 100, 1)).toEqual({ start: 0, end: 6 });
  });

  it('should clamp to the first and last rows', () => {
    const s = createVirtualLogState(20);
    appendHeights(s, 10);
    expect(visibleRange(s, 0, 100, 5)).toEqual({ start: 0, end: 9 });
    expect(visibleRange(s, 100, 100, 0)).toEqual({ start: 5, end: 9 });
  });

  it('should return an empty range for an empty state', () => {
    expect(visibleRange(createVirtualLogState(20), 0, 100, 0)).toEqual({ start: 0, end: -1 });
  });
});

describe('trimHead', () => {
  it('should remove k rows from the head and return the removed height', () => {
    const s = createVirtualLogState(20);
    appendHeights(s, 5);
    expect(trimHead(s, 2)).toBe(40);
    expect(s.heights).toEqual([20, 20, 20]);
    expect(s.offsets).toEqual([0, 20, 40, 60]);
    expect(s.totalHeight).toBe(60);
  });

  it('should return 0 for k <= 0', () => {
    const s = createVirtualLogState(20);
    appendHeights(s, 3);
    expect(trimHead(s, 0)).toBe(0);
    expect(s.totalHeight).toBe(60);
  });

  it('should clear everything when k >= length', () => {
    const s = createVirtualLogState(20);
    appendHeights(s, 3);
    expect(trimHead(s, 5)).toBe(0);
    expect(s.heights).toEqual([]);
    expect(s.offsets).toEqual([0]);
    expect(s.totalHeight).toBe(0);
  });
});

describe('applyMeasurements', () => {
  it('should apply a single measurement and propagate offsets', () => {
    const s = createVirtualLogState(20);
    appendHeights(s, 3); // offsets [0,20,40,60], total 60
    expect(applyMeasurements(s, [{ index: 0, height: 30 }])).toBe(10);
    expect(s.heights[0]).toBe(30);
    expect(s.offsets).toEqual([0, 30, 50, 70]);
    expect(s.totalHeight).toBe(70);
  });

  it('should handle multiple measurements in arbitrary order', () => {
    const s = createVirtualLogState(20);
    appendHeights(s, 4); // offsets [0,20,40,60,80], total 80
    applyMeasurements(s, [
      { index: 2, height: 25 }, // +5
      { index: 0, height: 15 }, // -5
    ]);
    expect(s.heights).toEqual([15, 20, 25, 20]);
    expect(s.offsets).toEqual([0, 15, 35, 60, 80]);
    expect(s.totalHeight).toBe(80);
  });

  it('should return 0 when nothing changed', () => {
    const s = createVirtualLogState(20);
    appendHeights(s, 2);
    expect(applyMeasurements(s, [{ index: 0, height: 20 }])).toBe(0);
    expect(applyMeasurements(s, [])).toBe(0);
  });

  it('should propagate consecutive measurements correctly', () => {
    const s = createVirtualLogState(20);
    appendHeights(s, 4); // offsets [0,20,40,60,80], total 80
    applyMeasurements(s, [
      { index: 0, height: 10 }, // -10
      { index: 1, height: 30 }, // +10
      { index: 2, height: 20 }, // 无变化
    ]);
    expect(s.heights).toEqual([10, 30, 20, 20]);
    expect(s.offsets).toEqual([0, 10, 40, 60, 80]);
    expect(s.totalHeight).toBe(80);
  });
});

describe('correctHeight', () => {
  it('should correct a single row height', () => {
    const s = createVirtualLogState(20);
    appendHeights(s, 2); // offsets [0,20,40], total 40
    expect(correctHeight(s, 1, 40)).toBe(20);
    expect(s.heights).toEqual([20, 40]);
    expect(s.offsets).toEqual([0, 20, 60]);
    expect(s.totalHeight).toBe(60);
  });
});

describe('rowTop', () => {
  it('should return the top offset of a row', () => {
    const s = createVirtualLogState(20);
    appendHeights(s, 3);
    expect(rowTop(s, 0)).toBe(0);
    expect(rowTop(s, 2)).toBe(40);
    expect(rowTop(s, 99)).toBe(0); // 越界兜底
  });
});

describe('unionWithSelection', () => {
  it('should merge visible and selection windows when within cap', () => {
    expect(unionWithSelection({ start: 10, end: 20 }, { start: 0, end: 30 }, 100)).toEqual({
      start: 0,
      end: 30,
    });
  });

  it('should accept a union exactly at cap', () => {
    expect(unionWithSelection({ start: 10, end: 20 }, { start: 0, end: 30 }, 31)).toEqual({
      start: 0,
      end: 30,
    });
  });

  it('should fall back to the visible window when the union exceeds cap', () => {
    expect(unionWithSelection({ start: 10, end: 20 }, { start: 0, end: 30 }, 15)).toEqual({
      start: 10,
      end: 20,
    });
  });
});
