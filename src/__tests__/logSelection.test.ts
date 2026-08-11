// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import { nodeInside, selectionTextInside } from '../core/logSelection';

/** 构造一个满足 Selection 类型最小接口的 mock。 */
function makeSelection(overrides: {
  rangeCount?: number;
  collapsed?: boolean;
  anchorNode?: Node | null;
  focusNode?: Node | null;
  text?: string;
}): Selection {
  return {
    rangeCount: overrides.rangeCount ?? 0,
    getRangeAt: () => ({ collapsed: overrides.collapsed ?? false }) as Range,
    anchorNode: overrides.anchorNode ?? null,
    focusNode: overrides.focusNode ?? null,
    toString: () => overrides.text ?? '',
  } as unknown as Selection;
}

describe('nodeInside', () => {
  it('should return false when node or container is null', () => {
    expect(nodeInside(null, null)).toBe(false);
    expect(nodeInside(null, document.createElement('div'))).toBe(false);
  });

  it('should return true when node is the container itself or a descendant', () => {
    const container = document.createElement('div');
    const child = document.createElement('span');
    container.appendChild(child);
    expect(nodeInside(container, container)).toBe(true);
    expect(nodeInside(child, container)).toBe(true);
  });

  it('should return false when node is outside the container', () => {
    const container = document.createElement('div');
    const outside = document.createElement('span');
    expect(nodeInside(outside, container)).toBe(false);
  });
});

describe('selectionTextInside', () => {
  const container = document.createElement('div');
  const inside = document.createElement('span');
  const outside = document.createElement('span');
  container.appendChild(inside);

  it('should return empty string for null selection or no ranges', () => {
    expect(selectionTextInside(null, container)).toBe('');
    expect(selectionTextInside(makeSelection({ rangeCount: 0 }), container)).toBe('');
  });

  it('should return empty string for a collapsed selection', () => {
    const sel = makeSelection({
      rangeCount: 1,
      collapsed: true,
      anchorNode: inside,
      focusNode: inside,
      text: 'x',
    });
    expect(selectionTextInside(sel, container)).toBe('');
  });

  it('should return empty string when both endpoints are outside the container', () => {
    const sel = makeSelection({
      rangeCount: 1,
      collapsed: false,
      anchorNode: outside,
      focusNode: outside,
      text: 'x',
    });
    expect(selectionTextInside(sel, container)).toBe('');
  });

  it('should return trimmed text when the anchor is inside the container', () => {
    const sel = makeSelection({
      rangeCount: 1,
      collapsed: false,
      anchorNode: inside,
      focusNode: outside,
      text: '  hello  ',
    });
    expect(selectionTextInside(sel, container)).toBe('hello');
  });

  it('should return trimmed text when the focus is inside the container', () => {
    const sel = makeSelection({
      rangeCount: 1,
      collapsed: false,
      anchorNode: outside,
      focusNode: inside,
      text: 'ESP32 log line\n',
    });
    expect(selectionTextInside(sel, container)).toBe('ESP32 log line');
  });
});
