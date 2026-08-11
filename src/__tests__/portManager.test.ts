import { describe, expect, it, vi } from 'vitest';
import type { SerialLike } from '../serial/portManager';
import { isWebSerialSupported, requestSerialPort } from '../serial/portManager';

describe('isWebSerialSupported', () => {
  it('should return false when navigator is unavailable (node)', () => {
    expect(isWebSerialSupported()).toBe(false);
  });

  it('should return false when navigator has no serial', () => {
    const original = globalThis.navigator;
    vi.stubGlobal('navigator', {});
    expect(isWebSerialSupported()).toBe(false);
    if (original === undefined) {
      delete (globalThis as { navigator?: unknown }).navigator;
    } else {
      vi.unstubAllGlobals();
    }
  });

  it('should return true when navigator.serial exists', () => {
    vi.stubGlobal('navigator', { serial: {} });
    expect(isWebSerialSupported()).toBe(true);
    vi.unstubAllGlobals();
  });
});

describe('requestSerialPort', () => {
  it('should return the selected port on success', async () => {
    const port = {} as SerialPort;
    const serial: SerialLike = {
      requestPort: vi.fn(async () => port),
      getPorts: vi.fn(async () => [port]),
    };
    await expect(requestSerialPort(serial)).resolves.toBe(port);
  });

  it('should translate NotAllowedError (permission denied) to a friendly error', async () => {
    const serial: SerialLike = {
      requestPort: vi.fn(async () => {
        throw new DOMException('canceled', 'NotAllowedError');
      }),
      getPorts: vi.fn(async () => []),
    };
    await expect(requestSerialPort(serial)).rejects.toThrow('未选择串口设备');
  });

  it('should translate NotFoundError (no port selected) to a friendly error', async () => {
    const serial: SerialLike = {
      requestPort: vi.fn(async () => {
        throw new DOMException('No port selected by the user.', 'NotFoundError');
      }),
      getPorts: vi.fn(async () => []),
    };
    await expect(requestSerialPort(serial)).rejects.toThrow('未选择串口设备');
  });

  it('should wrap other errors with a generic message', async () => {
    const serial: SerialLike = {
      requestPort: vi.fn(async () => {
        throw new Error('port busy');
      }),
      getPorts: vi.fn(async () => []),
    };
    await expect(requestSerialPort(serial)).rejects.toThrow('无法连接串口设备: port busy');
  });

  it('should stringify non-Error thrown values', async () => {
    const serial: SerialLike = {
      requestPort: vi.fn(async () => {
        throw 'port exploded';
      }),
      getPorts: vi.fn(async () => []),
    };
    await expect(requestSerialPort(serial)).rejects.toThrow('无法连接串口设备: port exploded');
  });
});
