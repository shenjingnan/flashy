import type { FlashState } from './types';

/** 状态机可触发的动作。 */
export type FlashAction =
  | 'connect'
  | 'monitor'
  | 'port-open'
  | 'detected'
  | 'fail'
  | 'flash-start'
  | 'flash-ok'
  | 'flash-fail'
  | 'disconnect'
  | 'reset';

/** 合法迁移表：{ 当前状态: { 动作: 目标状态 } }。 */
const TRANSITIONS: Readonly<
  Record<FlashState, Readonly<Partial<Record<FlashAction, FlashState>>>>
> = {
  idle: { connect: 'connecting', monitor: 'monitoring' },
  connecting: { 'port-open': 'detecting', fail: 'error' },
  detecting: { detected: 'connected', fail: 'error' },
  connected: { 'flash-start': 'flashing', disconnect: 'idle' },
  flashing: { 'flash-ok': 'success', 'flash-fail': 'error' },
  success: { disconnect: 'idle' },
  monitoring: { disconnect: 'idle', fail: 'error' },
  error: { reset: 'idle' },
};

/** 烧录流程状态机。 */
export interface FlashStateMachine {
  /** 当前状态快照。 */
  getState(): FlashState;
  /** 当前状态下是否可触发某动作。 */
  can(action: FlashAction): boolean;
  /** 触发迁移；非法迁移抛 Error。返回新状态。 */
  transition(action: FlashAction): FlashState;
  /** 订阅状态变更；返回取消订阅函数。 */
  subscribe(listener: (state: FlashState) => void): () => void;
  /** 重置到初始状态。 */
  reset(): void;
}

/**
 * 创建烧录流程状态机。
 * 纯逻辑、无 DOM 依赖，可独立单测。
 */
export function createFlashStateMachine(initial: FlashState = 'idle'): FlashStateMachine {
  let state: FlashState = initial;
  const listeners = new Set<(state: FlashState) => void>();

  function emit(next: FlashState): void {
    for (const listener of listeners) {
      listener(next);
    }
  }

  return {
    getState: () => state,
    can: (action) => TRANSITIONS[state][action] !== undefined,
    transition: (action) => {
      const next = TRANSITIONS[state][action];
      if (next === undefined) {
        throw new Error(`非法状态迁移: ${state} --${action}--> ?`);
      }
      state = next;
      emit(next);
      return next;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reset: () => {
      state = initial;
      emit(state);
    },
  };
}
