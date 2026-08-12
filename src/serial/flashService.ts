import type { FlashOptions, FlashSizeValues, IEspLoaderTerminal } from 'esptool-js';
import { ESPLoader, Transport } from 'esptool-js';
import { AUTO_BAUD_CANDIDATES } from '../core/baudrates';
import type { BaudRate, BaudSelection, DetectResult, ProgressInfo } from '../core/types';

/** 无法检测 Flash 大小时使用的兜底值（足够大以避免误拒绝合法固件）。 */
const FALLBACK_FLASH_SIZE = '64MB';

/** 物理复位脉冲时序（毫秒）：EN 低保持 / DTR 释放后稳定 / EN 释放后等待芯片启动。 */
const RESET_HOLD_MS = 100;
const DTR_SETTLE_MS = 50;
const RESET_RELEASE_MS = 300;

/** 复位重试次数：CH343 等桥接芯片经 Web Serial 控制线传递存在偶发失败，重试提高成功率。 */
const RESET_RETRY = 3;
/** 每次复位后等待启动日志检测的时长（毫秒）。 */
const BOOT_DETECT_MS = 1500;
/** ROM 启动日志特征（复位成功即打印，如 rst:0x / boot:0x / ESP-ROM / ets）。 */
const BOOT_LOG_RE = /rst:0x|boot:0x|ESP-ROM|ets /;

/** 判断一段串口文本是否为复位后的 ROM 启动日志。 */
function isBootLog(text: string): boolean {
  return BOOT_LOG_RE.test(text);
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** 烧录请求参数。 */
export interface FlashRequest {
  data: Uint8Array;
  address: number;
  /** 是否全片擦除。 */
  eraseAll: boolean;
  /** 是否压缩传输。 */
  compress: boolean;
  /** 烧录进度回调。 */
  onProgress?: (progress: ProgressInfo) => void;
}

/** 重置设备并启动开发板日志监控的选项。 */
export interface ResetOptions {
  /** 控制台波特率（固件运行时打印日志的波特率，如 115200；与烧录波特率无关）。 */
  consoleBaud: number;
  /** 解码后的开发板串口输出回调（文本可能含 \r\n，跨块不保证整行）。 */
  onConsoleData: (text: string) => void;
}

/** 串口监控的选项。 */
export interface MonitorOptions {
  /** 控制台波特率。 */
  consoleBaud: number;
  /** 解码后的开发板串口输出回调。 */
  onConsoleData: (text: string) => void;
}

/** 烧录服务：封装 esptool-js 的连接检测与写入流程。 */
export interface FlashService {
  /** 连接并自动检测芯片型号与 Flash 大小。 */
  detect(): Promise<DetectResult>;
  /** 写入固件。 */
  flash(request: FlashRequest): Promise<void>;
  /** 复位设备并断开连接。 */
  finish(): Promise<void>;
  /** 复位设备（等效按开发板 RST 键），并保持串口打开持续读取开发板日志。 */
  reset(options: ResetOptions): Promise<void>;
  /** 串口监控：复位设备（等效 RST 键）后持续读取开发板输出。 */
  monitor(options: MonitorOptions): Promise<void>;
  /** 尽力断开连接（出错时兜底）。 */
  abort(): Promise<void>;
}

/**
 * 创建基于 esptool-js 的烧录服务。
 * 串口由 esptool-js 内部打开，芯片在 detect() 时自动检测。
 *
 * baudrate 传 'auto' 时，按最高速率优先逐个尝试（1500000 → 115200），
 * 某个速率成功完成连接、芯片检测与 Flash 读取即停止降级。
 */
export function createFlashService(
  port: SerialPort,
  baudrate: BaudSelection,
  terminal: IEspLoaderTerminal
): FlashService {
  let transport: Transport | undefined;
  let esploader: ESPLoader | undefined;
  /** detect() 阶段检测到的 Flash 大小（如 '16MB'），供 flash() 复用。 */
  let detectedFlashSize: string | null = null;

  async function detect(): Promise<DetectResult> {
    const candidates: readonly BaudRate[] = baudrate === 'auto' ? AUTO_BAUD_CANDIDATES : [baudrate];
    const isAuto = candidates.length > 1;
    let lastError: Error = new Error('无法连接设备');

    for (const candidate of candidates) {
      transport = new Transport(port, true);
      esploader = new ESPLoader({ transport, baudrate: candidate, terminal });
      try {
        const chip = await esploader.main();
        let flashSize: string | null = null;
        try {
          flashSize = await esploader.detectFlashSize();
        } catch {
          if (isAuto) {
            // 高速档可能不稳定：flash 读取失败视为波特率问题，继续降级
            throw new Error(`波特率 ${candidate} 下读取 Flash 失败`);
          }
          flashSize = null;
        }
        detectedFlashSize = flashSize;
        if (isAuto) {
          terminal.writeLine(`波特率 ${candidate} 连接成功`);
        }
        return { chip, flashSize, baudrate: candidate };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        await transport.disconnect().catch(() => {});
        transport = undefined;
        esploader = undefined;
        if (isAuto) {
          terminal.writeLine(`波特率 ${candidate} 失败，尝试更低速率…`);
        }
      }
    }

    if (isAuto) {
      throw new Error(
        `无法以任何波特率连接设备（已尝试 ${candidates.join(', ')}）。请检查接线后重试，或尝试手动选择 115200。`
      );
    }
    throw lastError;
  }

  async function flash(request: FlashRequest): Promise<void> {
    if (esploader === undefined || transport === undefined) {
      throw new Error('尚未连接设备');
    }
    // esptool-js 的 fit 检查会对 flashSize 调用 flashSizeBytes()，
    // 'detect' 无法解析为字节数（返回 -1），导致任何文件都被判为不匹配。
    // 因此必须传入具体大小：优先复用检测结果，缺失时重新检测。
    let flashSize = detectedFlashSize;
    if (flashSize === null) {
      try {
        flashSize = await esploader.detectFlashSize();
      } catch {
        flashSize = FALLBACK_FLASH_SIZE;
      }
    }
    const options: FlashOptions = {
      fileArray: [{ data: request.data, address: request.address }],
      flashMode: 'keep',
      flashFreq: 'keep',
      flashSize: flashSize as FlashSizeValues,
      eraseAll: request.eraseAll,
      compress: request.compress,
    };
    if (request.onProgress !== undefined) {
      options.reportProgress = (fileIndex, written, total) => {
        request.onProgress?.({ fileIndex, written, total });
      };
    }
    await esploader.writeFlash(options);
  }

  /**
   * 物理复位脉冲：显式翻转 DTR 制造控制线状态变化，EN 低保持一段时间，
   * 释放 DTR（GPIO0 拉高 → 正常启动），再释放 EN 复位芯片（等效 RST 键）。
   *
   * 相比纯 RTS 脉冲（仅 EN 动作），此序列在复位期间显式翻转 DTR，兼容 CH343 等
   * 桥接芯片经 Web Serial 传递控制线时的差异（实测纯 RTS 脉冲在 CH343 上无法把
   * 芯片复位到应用，芯片停在下载模式；DTR+RTS 组合在烧录路径上已验证有效）。
   * 与 esptool-js ClassicReset 的 DTR+RTS 复位机制一致（本板已验证 RTS→EN 有效）。
   */
  async function hardResetPulse(t: Transport): Promise<void> {
    try {
      await t.setDTR(true); // GPIO0 低（制造 DTR 状态变化）
      await t.setRTS(true); // EN 低 → 芯片复位
      await sleep(RESET_HOLD_MS);
      await t.setDTR(false); // GPIO0 高 → 正常启动
      await sleep(DTR_SETTLE_MS); // 等 GPIO0 稳定为高
      await t.setRTS(false); // EN 高 → 芯片启动
      await sleep(RESET_RELEASE_MS); // 等芯片输出启动日志
    } catch {
      // 复位失败不影响后续流程
    }
  }

  async function finish(): Promise<void> {
    try {
      // 烧录后以新连接复位到应用并检测启动日志，
      // 规避 CH343 上复位偶发失败导致新固件不自动运行的问题
      await connectAndResetToApp(115200, () => {});
    } catch {
      // 复位失败不影响后续流程
    }
    await transport?.disconnect().catch(() => {});
    transport = undefined;
    esploader = undefined;
  }

  /**
   * 复位芯片到应用并持续监控输出。
   *
   * 断开旧连接后重新打开串口，先启动读循环再执行复位脉冲；
   * 复位可能偶发失败（CH343 等桥接芯片经 Web Serial 控制线传递不稳定），
   * 与 esptool-js 一致采用"复位 + 检测启动日志"重试，直到检测到 ROM 启动日志。
   *
   * @returns 是否在重试窗口内检测到启动日志（未检测到也可能已复位成功）。
   */
  async function connectAndResetToApp(
    consoleBaud: number,
    onConsoleData: (text: string) => void
  ): Promise<boolean> {
    if (transport !== undefined) {
      await transport.disconnect().catch(() => {});
      transport = undefined;
      esploader = undefined;
    }
    const t = new Transport(port, true);
    transport = t;
    let booted = false;
    try {
      await t.connect(consoleBaud, { flowControl: 'none' });
      // 先启动读循环再复位：保证复位后的启动日志被实时读到，避免依赖驱动侧缓冲
      const decoder = new TextDecoder();
      void t
        .rawRead(
          (data: Uint8Array) => {
            const text = decoder.decode(data, { stream: true });
            if (!booted && isBootLog(text)) {
              booted = true;
            }
            onConsoleData(text);
          },
          () => false
        )
        .catch(() => {});
      for (let i = 0; i < RESET_RETRY; i++) {
        await hardResetPulse(t);
        const deadline = Date.now() + BOOT_DETECT_MS;
        while (Date.now() < deadline && !booted) {
          await sleep(100);
        }
        if (booted) {
          break;
        }
      }
    } catch (err) {
      transport = undefined;
      await t.disconnect().catch(() => {});
      throw err;
    }
    return booted;
  }

  async function reset(options: ResetOptions): Promise<void> {
    await connectAndResetToApp(options.consoleBaud, options.onConsoleData);
  }

  /** 串口监控：复位设备（等效 RST 键）后持续读取开发板输出。 */
  async function monitor(options: MonitorOptions): Promise<void> {
    await connectAndResetToApp(options.consoleBaud, options.onConsoleData);
  }

  async function abort(): Promise<void> {
    if (transport !== undefined) {
      if (esploader !== undefined) {
        // 烧录失败路径：先复位清除残留的 stub
        await hardResetPulse(transport);
      }
      // 监控会话直接断开即可终止 rawRead
      await transport.disconnect().catch(() => {});
    }
    transport = undefined;
    esploader = undefined;
  }

  return { detect, flash, finish, reset, monitor, abort };
}
