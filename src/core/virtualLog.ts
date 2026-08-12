/**
 * 虚拟滚动的纯逻辑层：管理每行高度与前缀和偏移，负责行定位、窗口计算与增量更新。
 *
 * 不依赖 DOM，便于 node 环境单测。DOM 渲染层只消费 visibleRange / rowTop 等结果。
 */

/** 虚拟列表状态：heights 与 lines 等长，offsets 为前缀和。 */
export interface VirtualLogState {
  /** 每行高度：已测量行为实测值，未测量行为 defaultHeight。 */
  heights: number[];
  /** 前缀和：offsets[i] = Σ heights[0..i)，offsets[n] = totalHeight。 */
  offsets: number[];
  /** 总内容高度（即占位容器应设置的高度）。 */
  totalHeight: number;
  /** 未测量行的预估高度（像素）。 */
  defaultHeight: number;
}

/** 一次行高测量结果。 */
export interface RowMeasurement {
  index: number;
  height: number;
}

/** 行号区间（闭区间）。 */
export interface WindowRange {
  start: number;
  end: number;
}

/** 创建空的虚拟列表状态。 */
export function createVirtualLogState(defaultHeight: number): VirtualLogState {
  return { heights: [], offsets: [0], totalHeight: 0, defaultHeight };
}

/** 追加 count 行预估高度；O(count)。 */
export function appendHeights(state: VirtualLogState, count: number): void {
  for (let i = 0; i < count; i++) {
    state.totalHeight += state.defaultHeight; // 先累加，再写入前缀和，保证 offsets 末位 = totalHeight
    state.offsets.push(state.totalHeight);
    state.heights.push(state.defaultHeight);
  }
}

/** 从头部裁掉 k 行，返回被裁掉的像素高度（供调用方补偿滚动位置）；k 批量化一次 O(n)。 */
export function trimHead(state: VirtualLogState, k: number): number {
  if (k <= 0) {
    return 0;
  }
  if (k >= state.heights.length) {
    state.heights.length = 0;
    state.offsets.length = 1;
    state.offsets[0] = 0;
    state.totalHeight = 0;
    return 0;
  }
  const removed = state.offsets[k] ?? 0;
  state.heights.splice(0, k);
  const newLen = state.offsets.length - k;
  for (let i = 0; i < newLen; i++) {
    state.offsets[i] = (state.offsets[i + k] ?? 0) - removed;
  }
  state.offsets.length = newLen;
  state.totalHeight = state.offsets[newLen - 1] ?? 0;
  return removed;
}

/** 二分定位：给定内容坐标 y，返回 y 所在的行号；y 越界时收敛到边界行。 */
export function rowAtOffset(state: VirtualLogState, y: number): number {
  const n = state.heights.length;
  if (n === 0) {
    return 0;
  }
  const o = state.offsets;
  let lo = 0;
  let hi = n; // o[hi] = totalHeight
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((o[mid] ?? 0) <= y) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return Math.min(lo, n - 1);
}

/** 计算可见行窗口：覆盖 [y, y + viewportHeight] 并外扩 overscan 行。 */
export function visibleRange(
  state: VirtualLogState,
  y: number,
  viewportHeight: number,
  overscan: number
): WindowRange {
  const n = state.heights.length;
  if (n === 0) {
    return { start: 0, end: -1 };
  }
  const start = Math.max(0, rowAtOffset(state, y) - overscan);
  const end = Math.min(
    n - 1,
    rowAtOffset(state, Math.min(y + viewportHeight, state.totalHeight)) + overscan
  );
  return { start, end };
}

/** 行的 top 偏移。 */
export function rowTop(state: VirtualLogState, index: number): number {
  return state.offsets[index] ?? 0;
}

/**
 * 批量校正行高：更新 heights 并增量传播 offsets 到尾部，返回 totalHeight 增量。
 * 单次 O(n - minIndex)；measurements 为空或全部无变化时返回 0。
 */
export function applyMeasurements(
  state: VirtualLogState,
  measurements: readonly RowMeasurement[]
): number {
  if (measurements.length === 0) {
    return 0;
  }
  let minIndex = Number.POSITIVE_INFINITY;
  const deltas = new Map<number, number>();
  for (const m of measurements) {
    const old = state.heights[m.index] ?? 0;
    const delta = m.height - old;
    if (delta === 0) {
      continue;
    }
    deltas.set(m.index, delta);
    state.heights[m.index] = m.height;
    if (m.index < minIndex) {
      minIndex = m.index;
    }
  }
  if (deltas.size === 0) {
    return 0;
  }
  const keys = [...deltas.keys()].sort((a, b) => a - b);
  let cumulative = 0;
  let p = 0;
  for (let i = minIndex + 1; i < state.offsets.length; i++) {
    while (p < keys.length && (keys[p] ?? Number.POSITIVE_INFINITY) < i) {
      cumulative += deltas.get(keys[p] ?? 0) ?? 0;
      p += 1;
    }
    state.offsets[i] = (state.offsets[i] ?? 0) + cumulative;
  }
  state.totalHeight += cumulative;
  return cumulative;
}

/** 校正单行高度（复用 applyMeasurements）。 */
export function correctHeight(state: VirtualLogState, index: number, measured: number): number {
  return applyMeasurements(state, [{ index, height: measured }]);
}

/**
 * 将可见窗口与选区窗口合并为渲染窗口，总长不超过 cap；超限时优先保留可见窗口。
 */
export function unionWithSelection(vis: WindowRange, sel: WindowRange, cap: number): WindowRange {
  const min = Math.min(vis.start, sel.start);
  const max = Math.max(vis.end, sel.end);
  if (max - min + 1 <= cap) {
    return { start: min, end: max };
  }
  // 选区扩展超过 cap：退回可见窗口，保证用户正在看的内容完整渲染
  return vis;
}
