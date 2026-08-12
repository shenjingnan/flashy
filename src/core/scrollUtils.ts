import type { LogEntry } from './types';

/** 判断滚动位置是否已接近底部（剩余可滚距离小于阈值）。 */
export function isNearBottom(
  scrollHeight: number,
  scrollTop: number,
  clientHeight: number,
  threshold = 24
): boolean {
  return scrollHeight - scrollTop - clientHeight < threshold;
}

/** 日志视图渲染计划：决定本次渲染是清空、全量重建、增量调整还是无需操作。 */
export type LogRenderPlan =
  | { action: 'clear' }
  | { action: 'rebuild' }
  | { action: 'adjust'; removeFromHead: number; appendFrom: number; to: number }
  | { action: 'noop' };

/** 上次已渲染状态（供渲染决策使用）。 */
export interface LogRenderState {
  /** 上次渲染时的完整日志快照；null 表示尚未渲染。 */
  renderedEntries: readonly LogEntry[] | null;
}

/**
 * 根据已渲染状态与当前日志快照，规划本次渲染动作。
 *
 * 依赖前提：logBuffer.push 总是新建 entry 对象、环形裁剪用 slice 保留幸存者引用，
 * 因此幸存的 entry 引用保持不变，可用引用对齐检测头部被裁掉的条数。
 */
export function planLogRender(prev: LogRenderState, lines: readonly LogEntry[]): LogRenderPlan {
  const first = lines[0];
  if (lines.length === 0 || first === undefined) {
    return { action: 'clear' };
  }
  const prevEntries = prev.renderedEntries;
  if (prevEntries === null) {
    return { action: 'rebuild' }; // 首次渲染：全量重建
  }
  // 当前首条在已渲染快照中的索引 = 头部被环形缓冲裁掉的条数（幸存者保持相对顺序）
  const headTrimmed = prevEntries.indexOf(first);
  if (headTrimmed === -1) {
    // 当前首条不在已渲染快照中（一次性裁剪过多）→ 全量重建兜底
    return { action: 'rebuild' };
  }
  // 已渲染且幸存的条数 = prevEntries.length - headTrimmed；其后为本次新追加的条目
  const appendFrom = prevEntries.length - headTrimmed;
  if (appendFrom > lines.length) {
    // 条目整体变少（异常）→ 全量重建兜底
    return { action: 'rebuild' };
  }
  if (headTrimmed === 0 && appendFrom === lines.length) {
    return { action: 'noop' };
  }
  return { action: 'adjust', removeFromHead: headTrimmed, appendFrom, to: lines.length };
}
