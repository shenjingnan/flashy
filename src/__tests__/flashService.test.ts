import type { FlashOptions, IEspLoaderTerminal, SerialOptions } from 'esptool-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  class MockTransport {
    static instances: MockTransport[] = [];
    /** rawRead 回调输出的数据（默认含 ROM 启动日志，用于触发启动检测）。 */
    static rawData: Uint8Array = new TextEncoder().encode(
      'ESP-ROM:esp32s3-20210327\r\nrst:0x15 (RTC_SW_SYS_RST)\r\nwaiting for download\r\n'
    );
    device: SerialPort;
    connect = vi.fn<(baud: number, options?: SerialOptions) => Promise<void>>(async () => {});
    setDTR = vi.fn<(state: boolean) => Promise<void>>(async () => {});
    setRTS = vi.fn<(state: boolean) => Promise<void>>(async () => {});
    disconnect = vi.fn<() => Promise<void>>(async () => {});
    rawRead = vi.fn(async (onData: (data: Uint8Array) => void) => {
      onData(MockTransport.rawData);
    });
    constructor(device: SerialPort) {
      this.device = device;
      MockTransport.instances.push(this);
    }
  }

  class MockESPLoader {
    static instances: MockESPLoader[] = [];
    /** 逐个消费的主连接错误队列（用于自动波特率降级测试）。 */
    static mainErrorQueue: Error[] = [];
    static nextFlashSizeError: Error | null = null;
    main = vi.fn<() => Promise<string>>(async () => {
      const err = MockESPLoader.mainErrorQueue.shift();
      if (err !== undefined) {
        throw err;
      }
      return 'ESP32-D0WD-V3';
    });
    detectFlashSize = vi.fn<() => Promise<string>>(async () => {
      const err = MockESPLoader.nextFlashSizeError;
      if (err !== null) {
        MockESPLoader.nextFlashSizeError = null;
        throw err;
      }
      return '4MB';
    });
    writeFlash = vi.fn<(options: FlashOptions) => Promise<void>>(async () => {});
    after = vi.fn<(mode: string) => Promise<void>>(async () => {});
    constructor() {
      MockESPLoader.instances.push(this);
    }
  }

  return { MockTransport, MockESPLoader };
});

vi.mock('esptool-js', () => ({
  Transport: mocks.MockTransport,
  ESPLoader: mocks.MockESPLoader,
}));

import { createFlashService } from '../serial/flashService';

function makeTerminal(): IEspLoaderTerminal {
  return { clean: vi.fn(), write: vi.fn(), writeLine: vi.fn() };
}

const port = {} as SerialPort;

beforeEach(() => {
  mocks.MockTransport.instances.length = 0;
  mocks.MockTransport.rawData = new TextEncoder().encode(
    'ESP-ROM:esp32s3-20210327\r\nrst:0x15 (RTC_SW_SYS_RST)\r\nwaiting for download\r\n'
  );
  mocks.MockESPLoader.instances.length = 0;
  mocks.MockESPLoader.mainErrorQueue = [];
  mocks.MockESPLoader.nextFlashSizeError = null;
  vi.clearAllMocks();
});

describe('createFlashService', () => {
  it('should detect chip and flash size', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    const result = await service.detect();
    expect(result).toEqual({ chip: 'ESP32-D0WD-V3', flashSize: '4MB', baudrate: 115200 });
    const loader = mocks.MockESPLoader.instances[0];
    expect(loader?.main).toHaveBeenCalledTimes(1);
    expect(loader?.detectFlashSize).toHaveBeenCalledTimes(1);
  });

  it('should report null flash size when detection fails', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    mocks.MockESPLoader.nextFlashSizeError = new Error('no flash id');
    const result = await service.detect();
    expect(result).toEqual({ chip: 'ESP32-D0WD-V3', flashSize: null, baudrate: 115200 });
  });

  it('should disconnect and rethrow when chip detection fails', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    mocks.MockESPLoader.mainErrorQueue = [new Error('sync failed')];
    await expect(service.detect()).rejects.toThrow('sync failed');
    const transport = mocks.MockTransport.instances[0];
    expect(transport?.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should throw when flashing before connecting', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    await expect(
      service.flash({ data: new Uint8Array([1]), address: 0, eraseAll: false, compress: true })
    ).rejects.toThrow('尚未连接设备');
  });

  it('should call writeFlash with keep mode and the detected flash size', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    await service.detect();
    const data = new Uint8Array([0xe9, 0x00, 0x00]);
    await service.flash({ data, address: 0x1000, eraseAll: false, compress: true });
    const loader = mocks.MockESPLoader.instances[0];
    const options = loader?.writeFlash.mock.calls[0]?.[0] as FlashOptions | undefined;
    expect(options?.fileArray).toEqual([{ data, address: 0x1000 }]);
    expect(options?.flashMode).toBe('keep');
    expect(options?.flashFreq).toBe('keep');
    expect(options?.flashSize).toBe('4MB');
    expect(options?.eraseAll).toBe(false);
    expect(options?.compress).toBe(true);
  });

  it('should re-detect flash size when initial detection failed', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    mocks.MockESPLoader.nextFlashSizeError = new Error('no flash id');
    const result = await service.detect();
    expect(result.flashSize).toBeNull();
    await service.flash({
      data: new Uint8Array([1]),
      address: 0,
      eraseAll: false,
      compress: true,
    });
    const loader = mocks.MockESPLoader.instances[0];
    const options = loader?.writeFlash.mock.calls[0]?.[0] as FlashOptions | undefined;
    expect(options?.flashSize).toBe('4MB');
  });

  it('should fall back to a large flash size when re-detection also fails', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    mocks.MockESPLoader.nextFlashSizeError = new Error('first fail');
    await service.detect();
    mocks.MockESPLoader.nextFlashSizeError = new Error('second fail');
    await service.flash({
      data: new Uint8Array([1]),
      address: 0,
      eraseAll: false,
      compress: true,
    });
    const loader = mocks.MockESPLoader.instances[0];
    const options = loader?.writeFlash.mock.calls[0]?.[0] as FlashOptions | undefined;
    expect(options?.flashSize).toBe('64MB');
  });

  it('should forward progress from reportProgress to onProgress', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    await service.detect();
    const onProgress = vi.fn();
    await service.flash({
      data: new Uint8Array([1]),
      address: 0,
      eraseAll: false,
      compress: true,
      onProgress,
    });
    const loader = mocks.MockESPLoader.instances[0];
    const options = loader?.writeFlash.mock.calls[0]?.[0] as FlashOptions | undefined;
    options?.reportProgress?.(0, 512, 1024);
    expect(onProgress).toHaveBeenCalledWith({ fileIndex: 0, written: 512, total: 1024 });
  });

  it('should omit reportProgress when onProgress is not provided', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    await service.detect();
    await service.flash({
      data: new Uint8Array([1]),
      address: 0,
      eraseAll: false,
      compress: true,
    });
    const loader = mocks.MockESPLoader.instances[0];
    const options = loader?.writeFlash.mock.calls[0]?.[0] as FlashOptions | undefined;
    expect('reportProgress' in (options ?? {})).toBe(false);
  });

  it('should physically reset the device and disconnect on finish', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    await service.detect();
    await service.finish();
    // finish() 先断开 esploader 连接，再以新 Transport 复位到应用并检测启动日志
    const esploaderTransport = mocks.MockTransport.instances[0];
    const resetTransport = mocks.MockTransport.instances[1];
    expect(resetTransport?.setDTR).toHaveBeenCalled();
    expect(resetTransport?.setRTS).toHaveBeenCalled();
    expect(esploaderTransport?.disconnect).toHaveBeenCalledTimes(1);
    expect(resetTransport?.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should retry the reset when no boot log is detected', async () => {
    vi.useFakeTimers();
    try {
      // rawRead 只产生非启动日志 → booted 恒 false → 触发全部重试
      mocks.MockTransport.rawData = new TextEncoder().encode('nothing to see here\r\n');
      const service = createFlashService(port, 115200, makeTerminal());
      const monitorPromise = service.monitor({ consoleBaud: 115200, onConsoleData: vi.fn() });
      // 3 次复位：每次 hardResetPulse(100+50+300ms) + 检测窗口(1500ms)
      await vi.advanceTimersByTimeAsync(7000);
      await monitorPromise;
      const t = mocks.MockTransport.instances[0];
      // hardResetPulse 每次调用 setRTS(true) 与 setRTS(false)，3 次共 6 次
      expect(t?.setRTS.mock.calls.length).toBe(6);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should reset the device and start console monitoring via physical pulse', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    await service.detect();
    const onConsoleData = vi.fn();
    await service.reset({ consoleBaud: 115200, onConsoleData });
    // reset() 重新打开串口（第二个 transport）并脉冲复位 + 启动持续监控
    const monitorTransport = mocks.MockTransport.instances[1];
    expect(monitorTransport?.connect).toHaveBeenCalled();
    expect(monitorTransport?.setRTS).toHaveBeenCalled();
    expect(monitorTransport?.rawRead).toHaveBeenCalled();
    // rawRead 的 onData 解码后回调 onConsoleData
    expect(onConsoleData).toHaveBeenCalledWith(expect.stringContaining('ESP-ROM'));
    // 监控期间保持连接，不主动断开
    expect(monitorTransport?.disconnect).not.toHaveBeenCalled();
  });

  it('should physically reset even without an active connection (after finish)', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    // 不调用 detect()，模拟 finish() 后 transport 已释放
    const onConsoleData = vi.fn();
    await service.reset({ consoleBaud: 115200, onConsoleData });
    const monitorTransport = mocks.MockTransport.instances[0];
    expect(monitorTransport?.connect).toHaveBeenCalled();
    expect(monitorTransport?.setDTR).toHaveBeenCalled();
    expect(monitorTransport?.setRTS).toHaveBeenCalled();
    expect(monitorTransport?.rawRead).toHaveBeenCalled();
    expect(onConsoleData).toHaveBeenCalledWith(expect.stringContaining('ESP-ROM'));
    expect(monitorTransport?.disconnect).not.toHaveBeenCalled();
  });

  it('should stop the console monitor on abort', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    await service.reset({ consoleBaud: 115200, onConsoleData: vi.fn() });
    const monitorTransport = mocks.MockTransport.instances[0];
    await service.abort();
    expect(monitorTransport?.disconnect).toHaveBeenCalled();
  });

  it('should reset the device via physical pulse and monitor its console', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    const onConsoleData = vi.fn();
    await service.monitor({ consoleBaud: 115200, onConsoleData });
    const monitorTransport = mocks.MockTransport.instances[0];
    expect(monitorTransport?.connect).toHaveBeenCalled();
    expect(monitorTransport?.rawRead).toHaveBeenCalled();
    // 串口监控会先物理复位芯片（等效 RST 键），以便看到完整启动日志
    expect(monitorTransport?.setDTR).toHaveBeenCalled();
    expect(monitorTransport?.setRTS).toHaveBeenCalled();
    expect(onConsoleData).toHaveBeenCalledWith(expect.stringContaining('ESP-ROM'));
    // 监控期间保持连接
    expect(monitorTransport?.disconnect).not.toHaveBeenCalled();
  });

  it('should open the serial port with flowControl none for monitoring', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    await service.monitor({ consoleBaud: 115200, onConsoleData: vi.fn() });
    const monitorTransport = mocks.MockTransport.instances[0];
    expect(monitorTransport?.connect).toHaveBeenCalledWith(115200, { flowControl: 'none' });
  });

  it('should apply the DTR+RTS reset pulse in order and read before resetting', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    await service.monitor({ consoleBaud: 115200, onConsoleData: vi.fn() });
    const t = mocks.MockTransport.instances[0];
    // 复位序列：显式 DTR true → RTS true → DTR false → RTS false（兼容 CH343）
    expect(t?.setDTR.mock.calls.map((c) => c[0])).toEqual([true, false]);
    expect(t?.setRTS.mock.calls.map((c) => c[0])).toEqual([true, false]);
    // 先启动读循环，再执行复位脉冲（rawRead 早于首次 setRTS）
    const rawReadOrder = t?.rawRead.mock.invocationCallOrder[0] ?? 0;
    const rtsOrder = t?.setRTS.mock.invocationCallOrder[0] ?? 0;
    expect(rawReadOrder).toBeLessThan(rtsOrder);
  });

  it('should stop the serial monitor on abort', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    await service.monitor({ consoleBaud: 115200, onConsoleData: vi.fn() });
    const monitorTransport = mocks.MockTransport.instances[0];
    await service.abort();
    expect(monitorTransport?.disconnect).toHaveBeenCalled();
  });

  it('should disconnect on abort and swallow disconnect errors', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    await service.detect();
    const transport = mocks.MockTransport.instances[0];
    transport?.disconnect.mockRejectedValueOnce(new Error('io error'));
    await expect(service.abort()).resolves.toBeUndefined();
  });

  it('should hard-reset the device via DTR/RTS before disconnecting on abort', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    await service.detect();
    const transport = mocks.MockTransport.instances[0];
    await service.abort();
    expect(transport?.setDTR).toHaveBeenCalled();
    expect(transport?.setRTS).toHaveBeenCalled();
    expect(transport?.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should be safe to abort without an active connection', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    await expect(service.abort()).resolves.toBeUndefined();
  });

  it('auto mode should use the highest baud when it succeeds', async () => {
    const service = createFlashService(port, 'auto', makeTerminal());
    const result = await service.detect();
    expect(result.baudrate).toBe(1500000);
    expect(result.chip).toBe('ESP32-D0WD-V3');
    expect(mocks.MockESPLoader.instances.length).toBe(1);
  });

  it('auto mode should fall back when the highest baud fails', async () => {
    const service = createFlashService(port, 'auto', makeTerminal());
    mocks.MockESPLoader.mainErrorQueue = [new Error('high baud failed')];
    const result = await service.detect();
    expect(result.baudrate).toBe(921600);
    // 第一次尝试失败：创建了 2 个 transport，第一个被断开
    expect(mocks.MockTransport.instances.length).toBe(2);
    expect(mocks.MockTransport.instances[0]?.disconnect).toHaveBeenCalledTimes(1);
  });

  it('auto mode should fall back when flash size detection fails at a baud', async () => {
    const service = createFlashService(port, 'auto', makeTerminal());
    mocks.MockESPLoader.nextFlashSizeError = new Error('flash read failed');
    const result = await service.detect();
    expect(result.baudrate).toBe(921600);
    expect(result.flashSize).toBe('4MB');
  });

  it('auto mode should throw when all bauds fail', async () => {
    const service = createFlashService(port, 'auto', makeTerminal());
    mocks.MockESPLoader.mainErrorQueue = [
      new Error('fail 1500000'),
      new Error('fail 921600'),
      new Error('fail 460800'),
      new Error('fail 230400'),
      new Error('fail 115200'),
    ];
    await expect(service.detect()).rejects.toThrow('无法以任何波特率连接设备');
    expect(mocks.MockTransport.instances.length).toBe(5);
  });

  it('auto mode should still throw the original error for a single baud', async () => {
    const service = createFlashService(port, 115200, makeTerminal());
    mocks.MockESPLoader.mainErrorQueue = [new Error('single fail')];
    await expect(service.detect()).rejects.toThrow('single fail');
  });
});
