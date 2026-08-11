import { describe, expect, it, vi } from 'vitest';
import { createFlashStateMachine } from '../core/stateMachine';
import type { FlashState } from '../core/types';

describe('createFlashStateMachine', () => {
  it('should start in idle state by default', () => {
    const machine = createFlashStateMachine();
    expect(machine.getState()).toBe('idle');
  });

  it('should start in a custom initial state', () => {
    const machine = createFlashStateMachine('connected');
    expect(machine.getState()).toBe('connected');
  });

  it('should follow the happy-path transition chain', () => {
    const machine = createFlashStateMachine();
    expect(machine.transition('connect')).toBe('connecting');
    expect(machine.transition('port-open')).toBe('detecting');
    expect(machine.transition('detected')).toBe('connected');
    expect(machine.transition('flash-start')).toBe('flashing');
    expect(machine.transition('flash-ok')).toBe('success');
    expect(machine.transition('disconnect')).toBe('idle');
  });

  it('should enter monitoring from idle and disconnect back to idle', () => {
    const machine = createFlashStateMachine();
    expect(machine.transition('monitor')).toBe('monitoring');
    expect(machine.transition('disconnect')).toBe('idle');
  });

  it('should reach error from monitoring on failure', () => {
    const machine = createFlashStateMachine();
    machine.transition('monitor');
    expect(machine.transition('fail')).toBe('error');
  });

  it('should not allow flashing from monitoring state', () => {
    const machine = createFlashStateMachine();
    machine.transition('monitor');
    expect(() => machine.transition('flash-start')).toThrow(/非法状态迁移/);
  });

  it('should reach error from connecting/detecting/flashing failures', () => {
    const fromConnecting = createFlashStateMachine();
    fromConnecting.transition('connect');
    expect(fromConnecting.transition('fail')).toBe('error');

    const fromDetecting = createFlashStateMachine();
    fromDetecting.transition('connect');
    fromDetecting.transition('port-open');
    expect(fromDetecting.transition('fail')).toBe('error');

    const fromFlashing = createFlashStateMachine();
    fromFlashing.transition('connect');
    fromFlashing.transition('port-open');
    fromFlashing.transition('detected');
    fromFlashing.transition('flash-start');
    expect(fromFlashing.transition('flash-fail')).toBe('error');
  });

  it('should reset from error back to idle', () => {
    const machine = createFlashStateMachine();
    machine.transition('connect');
    machine.transition('fail');
    expect(machine.getState()).toBe('error');
    expect(machine.transition('reset')).toBe('idle');
  });

  it('should disconnect from connected and success back to idle', () => {
    const fromConnected = createFlashStateMachine();
    fromConnected.transition('connect');
    fromConnected.transition('port-open');
    fromConnected.transition('detected');
    expect(fromConnected.transition('disconnect')).toBe('idle');

    const fromSuccess = createFlashStateMachine();
    fromSuccess.transition('connect');
    fromSuccess.transition('port-open');
    fromSuccess.transition('detected');
    fromSuccess.transition('flash-start');
    fromSuccess.transition('flash-ok');
    expect(fromSuccess.transition('disconnect')).toBe('idle');
  });

  it('should throw on illegal transitions', () => {
    const machine = createFlashStateMachine();
    expect(() => machine.transition('port-open')).toThrow(/非法状态迁移/);
    expect(() => machine.transition('flash-start')).toThrow(/非法状态迁移/);
    expect(() => machine.transition('reset')).toThrow(/非法状态迁移/);
  });

  it('should throw on transitions from terminal states', () => {
    const machine = createFlashStateMachine();
    machine.transition('connect');
    machine.transition('fail');
    expect(() => machine.transition('connect')).toThrow(/非法状态迁移/);
  });

  it('should expose can() for legal and illegal actions', () => {
    const machine = createFlashStateMachine();
    expect(machine.can('connect')).toBe(true);
    expect(machine.can('detected')).toBe(false);
    machine.transition('connect');
    expect(machine.can('port-open')).toBe(true);
    expect(machine.can('connect')).toBe(false);
  });

  it('should notify subscribers on transition', () => {
    const machine = createFlashStateMachine();
    const states: FlashState[] = [];
    const unsubscribe = machine.subscribe((state) => states.push(state));
    machine.transition('connect');
    machine.transition('port-open');
    expect(states).toEqual(['connecting', 'detecting']);
    unsubscribe();
    machine.reset();
    expect(states).toEqual(['connecting', 'detecting']);
  });

  it('should notify subscribers on reset', () => {
    const machine = createFlashStateMachine();
    const listener = vi.fn();
    machine.subscribe(listener);
    machine.reset();
    expect(listener).toHaveBeenCalledWith('idle');
  });

  it('should allow unsubscribe to stop notifications', () => {
    const machine = createFlashStateMachine();
    const listener = vi.fn();
    const unsubscribe = machine.subscribe(listener);
    unsubscribe();
    machine.transition('connect');
    expect(listener).not.toHaveBeenCalled();
  });
});
