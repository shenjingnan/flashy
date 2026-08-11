import { isValidAddress, parseAddress } from './core/address';
import {
  ASK_AI_MAX_CHARS,
  ASK_AI_PROVIDERS,
  buildAskAiPrompt,
  buildAskAiUrl,
  buildDeviceContext,
  truncateLog,
} from './core/askAi';
import {
  BAUD_RATES,
  CONSOLE_BAUD_RATES,
  DEFAULT_BAUD_RATE,
  DEFAULT_CONSOLE_BAUD,
  parseBaudRate,
} from './core/baudrates';
import { createLogBuffer, formatBytes, formatLogEntry } from './core/logBuffer';
import { createFlashStateMachine } from './core/stateMachine';
import type { BaudRate, DetectResult } from './core/types';
import type { FlashService } from './serial/flashService';
import { createFlashService } from './serial/flashService';
import { isWebSerialSupported, requestSerialPort } from './serial/portManager';
import { createLoaderTerminal } from './terminal/loaderTerminal';

/** 页面上固定的元素 id 集合，统一在此获取，便于 null 检查。 */
interface Elements {
  version: HTMLElement | null;
  chipBadge: HTMLElement | null;
  connectBtn: HTMLButtonElement | null;
  monitorBtn: HTMLButtonElement | null;
  deviceInfo: HTMLElement | null;
  fileInput: HTMLInputElement | null;
  fileInfo: HTMLElement | null;
  baudSelect: HTMLSelectElement | null;
  addressInput: HTMLInputElement | null;
  flashBtn: HTMLButtonElement | null;
  resetBtn: HTMLButtonElement | null;
  resetDeviceBtn: HTMLButtonElement | null;
  progressWrap: HTMLElement | null;
  flashProgress: HTMLProgressElement | null;
  progressLabel: HTMLElement | null;
  compatWarning: HTMLElement | null;
  clearLogBtn: HTMLButtonElement | null;
  logView: HTMLPreElement | null;
  consoleBaudSelect: HTMLSelectElement | null;
  copyLogBtn: HTMLButtonElement | null;
  askAiLogBtn: HTMLButtonElement | null;
  askAiLogMenu: HTMLElement | null;
}

function byId(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function loadElements(): Elements {
  return {
    version: byId('version'),
    chipBadge: byId('chip-badge'),
    connectBtn: byId('connect-btn') as HTMLButtonElement | null,
    monitorBtn: byId('monitor-btn') as HTMLButtonElement | null,
    deviceInfo: byId('device-info'),
    fileInput: byId('file-input') as HTMLInputElement | null,
    fileInfo: byId('file-info'),
    baudSelect: byId('baud-select') as HTMLSelectElement | null,
    addressInput: byId('address-input') as HTMLInputElement | null,
    flashBtn: byId('flash-btn') as HTMLButtonElement | null,
    resetBtn: byId('reset-btn') as HTMLButtonElement | null,
    resetDeviceBtn: byId('reset-device-btn') as HTMLButtonElement | null,
    progressWrap: byId('progress-wrap'),
    flashProgress: byId('flash-progress') as HTMLProgressElement | null,
    progressLabel: byId('progress-label'),
    compatWarning: byId('compat-warning'),
    clearLogBtn: byId('clear-log-btn') as HTMLButtonElement | null,
    logView: byId('log-view') as HTMLPreElement | null,
    consoleBaudSelect: byId('console-baud') as HTMLSelectElement | null,
    copyLogBtn: byId('copy-log-btn') as HTMLButtonElement | null,
    askAiLogBtn: byId('ask-ai-log-btn') as HTMLButtonElement | null,
    askAiLogMenu: byId('ask-ai-log-menu'),
  };
}

const el = loadElements();
const machine = createFlashStateMachine();
const logBuffer = createLogBuffer({ max: 500 });
const terminal = createLoaderTerminal(logBuffer);

/** 当前已选择的固件数据。 */
let firmwareData: Uint8Array | null = null;
/** 当前芯片检测结果。 */
let detectResult: DetectResult | null = null;
/** 当前烧录服务实例（连接成功后创建）。 */
let service: FlashService | null = null;
/** 重置设备后置 true：芯片已重启脱离下载模式，需重新连接才能再次烧录。 */
let needsReconnect = false;
/** 控制台波特率（固件运行时打印日志的波特率，独立于烧录波特率）。 */
let consoleBaud = DEFAULT_CONSOLE_BAUD;

if (el.version !== null) {
  el.version.textContent = `v${__APP_VERSION__}`;
}

// ---- 波特率下拉 ----
if (el.baudSelect !== null) {
  const autoOption = document.createElement('option');
  autoOption.value = 'auto';
  autoOption.textContent = '自动（推荐）';
  el.baudSelect.appendChild(autoOption);
}
for (const rate of BAUD_RATES) {
  const option = document.createElement('option');
  option.value = String(rate);
  option.textContent = String(rate);
  el.baudSelect?.appendChild(option);
}
if (el.baudSelect !== null) {
  el.baudSelect.value = 'auto';
}

// ---- 控制台波特率下拉 ----
for (const rate of CONSOLE_BAUD_RATES) {
  const option = document.createElement('option');
  option.value = String(rate);
  option.textContent = String(rate);
  el.consoleBaudSelect?.appendChild(option);
}
if (el.consoleBaudSelect !== null) {
  el.consoleBaudSelect.value = String(consoleBaud);
  el.consoleBaudSelect.addEventListener('change', () => {
    consoleBaud = Number(el.consoleBaudSelect?.value) || 115200;
  });
}

// ---- Web Serial 能力检测 ----
if (!isWebSerialSupported()) {
  if (el.compatWarning !== null) {
    el.compatWarning.hidden = false;
    el.compatWarning.textContent =
      '当前浏览器不支持 Web Serial API。请使用 Chrome / Edge 89 及以上版本，并通过 HTTPS 或 localhost 访问。';
  }
}

// ---- 日志渲染（烧录操作 + 开发板输出合并，防抖渲染）----
function renderLogView(): void {
  if (el.logView === null) {
    return;
  }
  const lines = logBuffer.lines();
  const fragment = document.createDocumentFragment();
  for (const entry of lines) {
    const node = document.createElement('div');
    node.textContent = formatLogEntry(entry);
    node.className = `log-line log-${entry.level}`;
    fragment.appendChild(node);
  }
  el.logView.replaceChildren(fragment);
  el.logView.scrollTop = el.logView.scrollHeight;
}

let logRenderTimer: number | undefined;
logBuffer.subscribe(() => {
  if (logRenderTimer !== undefined) {
    return;
  }
  logRenderTimer = window.setTimeout(() => {
    logRenderTimer = undefined;
    renderLogView();
  }, 30);
});

el.clearLogBtn?.addEventListener('click', () => {
  logBuffer.clear();
});

/** 开发板串口输出的行缓冲（rawRead 的 chunk 可能跨行）。 */
let pendingConsole = '';

/** 将开发板串口输出按行拆分并写入统一日志缓冲。 */
function appendConsoleLine(text: string): void {
  pendingConsole += text;
  const parts = pendingConsole.split('\n');
  pendingConsole = parts.pop() ?? '';
  for (const part of parts) {
    const trimmed = part.replace(/\r$/, '').trimEnd();
    if (trimmed !== '') {
      logBuffer.push('info', trimmed);
    }
  }
}

// ---- 复制 / 问 AI ----
function flashLogText(): string {
  return logBuffer.lines().map(formatLogEntry).join('\n');
}

interface LogActionsOptions {
  copyBtn: HTMLButtonElement | null;
  askBtn: HTMLButtonElement | null;
  menu: HTMLElement | null;
  getLogText: () => string;
  logType: string;
}

/** 为一个日志面板装配「复制」与「问 AI」下拉。 */
function setupLogActions(options: LogActionsOptions): void {
  options.copyBtn?.addEventListener('click', async () => {
    const text = options.getLogText();
    if (text === '') {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      const original = options.copyBtn?.textContent ?? '复制';
      if (options.copyBtn !== null) {
        options.copyBtn.textContent = '已复制';
      }
      setTimeout(() => {
        if (options.copyBtn !== null) {
          options.copyBtn.textContent = original;
        }
      }, 1500);
    } catch {
      // 剪贴板不可用时静默忽略
    }
  });

  options.askBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (options.menu !== null) {
      options.menu.hidden = !options.menu.hidden;
    }
  });

  options.menu?.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest('button[data-ai]') as HTMLElement | null;
    if (target === null) {
      return;
    }
    const provider = ASK_AI_PROVIDERS.find((p) => p.id === target.dataset.ai);
    if (provider === undefined) {
      return;
    }
    const logContent = truncateLog(options.getLogText(), ASK_AI_MAX_CHARS);
    const context = buildDeviceContext(detectResult, options.logType, consoleBaud);
    const prompt = buildAskAiPrompt(context, logContent);
    window.open(buildAskAiUrl(provider, prompt), '_blank', 'noopener');
    if (options.menu !== null) {
      options.menu.hidden = true;
    }
  });
}

setupLogActions({
  copyBtn: el.copyLogBtn,
  askBtn: el.askAiLogBtn,
  menu: el.askAiLogMenu,
  getLogText: flashLogText,
  logType: '日志',
});

// 点击页面其他区域关闭问 AI 下拉
document.addEventListener('click', () => {
  if (el.askAiLogMenu !== null) {
    el.askAiLogMenu.hidden = true;
  }
});

// ---- 状态联动 ----
/** 返回当前波特率选择：'auto' 表示自动（最高速率优先，失败降级）。 */
function currentBaudSelection(): BaudRate | 'auto' {
  const value = el.baudSelect?.value ?? 'auto';
  return value === 'auto' ? 'auto' : parseBaudRate(value);
}

function currentAddressValid(): boolean {
  return isValidAddress(el.addressInput?.value ?? '');
}

function canFlash(): boolean {
  return machine.getState() === 'connected' && firmwareData !== null && currentAddressValid();
}

/** 判断本次连接是否复用了残留的软件加载器（stub），可能导致烧录失败。 */
function isStaleStubUsed(): boolean {
  return logBuffer.lines().some((entry) => entry.text.includes('Stub is already running'));
}

function setProgressVisible(visible: boolean): void {
  if (el.progressWrap !== null) {
    el.progressWrap.hidden = !visible;
  }
}

function updateProgress(written: number, total: number): void {
  if (el.flashProgress !== null) {
    el.flashProgress.max = total > 0 ? total : 1;
    el.flashProgress.value = written;
  }
  if (el.progressLabel !== null) {
    const percent = total > 0 ? Math.round((written / total) * 100) : 0;
    el.progressLabel.textContent = `${percent}%`;
  }
}

function renderChipBadge(): void {
  if (el.chipBadge === null) {
    return;
  }
  const state = machine.getState();
  if (state === 'detecting') {
    el.chipBadge.textContent = '检测芯片中…';
    el.chipBadge.dataset.state = 'detecting';
  } else if (state === 'connected' || state === 'flashing' || state === 'success') {
    const chip = detectResult?.chip ?? '未知芯片';
    const flash = detectResult?.flashSize ?? '未知 Flash';
    el.chipBadge.textContent = `${chip} · ${flash}`;
    el.chipBadge.dataset.state = 'connected';
  } else {
    el.chipBadge.textContent = '未连接';
    el.chipBadge.dataset.state = 'idle';
  }
}

function renderUi(): void {
  const state = machine.getState();
  const connected = state === 'connected' || state === 'flashing' || state === 'success';

  if (el.connectBtn !== null) {
    el.connectBtn.disabled = state !== 'idle' || !isWebSerialSupported();
    el.connectBtn.textContent = state === 'connecting' ? '连接中…' : '连接设备';
  }
  if (el.monitorBtn !== null) {
    el.monitorBtn.disabled = state !== 'idle' || !isWebSerialSupported();
  }
  if (el.flashBtn !== null) {
    el.flashBtn.disabled = !canFlash() || needsReconnect;
  }
  if (el.resetBtn !== null) {
    el.resetBtn.disabled = state === 'idle' || state === 'connecting' || state === 'detecting';
  }
  if (el.resetDeviceBtn !== null) {
    el.resetDeviceBtn.disabled =
      state !== 'connected' && state !== 'success' && state !== 'monitoring';
  }
  if (el.baudSelect !== null) {
    el.baudSelect.disabled = connected;
  }
  if (el.deviceInfo !== null) {
    if (state === 'monitoring') {
      el.deviceInfo.textContent = `串口监控中 · 波特率 ${consoleBaud}`;
    } else if (needsReconnect) {
      el.deviceInfo.textContent = '设备已重置，如需继续烧录请先「断开设备」再重新连接';
    } else if (detectResult !== null && connected) {
      el.deviceInfo.textContent = `已连接 · 芯片 ${detectResult.chip} · Flash ${detectResult.flashSize ?? '未知'} · 波特率 ${detectResult.baudrate}`;
    } else {
      el.deviceInfo.textContent = '尚未连接设备';
    }
  }
  renderChipBadge();
}

machine.subscribe(renderUi);

// ---- 文件选择 ----
el.fileInput?.addEventListener('change', async () => {
  const file = el.fileInput?.files?.[0];
  if (file === undefined) {
    firmwareData = null;
    if (el.fileInfo !== null) {
      el.fileInfo.textContent = '未选择固件文件';
    }
    renderUi();
    return;
  }
  try {
    const buffer = await file.arrayBuffer();
    firmwareData = new Uint8Array(buffer);
    if (el.fileInfo !== null) {
      el.fileInfo.textContent = `${file.name}（${formatBytes(buffer.byteLength)}）`;
    }
    logBuffer.push('info', `已选择固件文件: ${file.name}（${formatBytes(buffer.byteLength)}）`);
  } catch (err) {
    firmwareData = null;
    if (el.fileInfo !== null) {
      el.fileInfo.textContent = '读取文件失败';
    }
    logBuffer.push(
      'error',
      `读取固件文件失败: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  renderUi();
});

// ---- 地址校验 ----
function validateAddressInput(): void {
  const invalid = !currentAddressValid();
  if (el.addressInput !== null) {
    el.addressInput.classList.toggle('invalid', invalid);
  }
  renderUi();
}

el.addressInput?.addEventListener('input', validateAddressInput);
el.addressInput?.addEventListener('blur', validateAddressInput);

// ---- 连接设备 ----
el.connectBtn?.addEventListener('click', async () => {
  if (!isWebSerialSupported() || machine.getState() !== 'idle') {
    return;
  }
  try {
    // requestPort 必须在用户手势内同步调用，否则会被浏览器拦截
    const port = await requestSerialPort(navigator.serial);
    if (el.deviceInfo !== null) {
      el.deviceInfo.textContent = '正在连接…';
    }
    machine.transition('connect');
    const baudSelection = currentBaudSelection();
    service = createFlashService(port, baudSelection, terminal);
    logBuffer.push(
      'info',
      baudSelection === 'auto'
        ? '连接串口设备，波特率自动（最高速率优先，失败降级）'
        : `连接串口设备，波特率 ${baudSelection}`
    );
    machine.transition('port-open');
    detectResult = await service.detect();
    needsReconnect = false;
    machine.transition('detected');
    logBuffer.push(
      'info',
      `检测到芯片 ${detectResult.chip}，Flash ${detectResult.flashSize ?? '未知'}，波特率 ${detectResult.baudrate}`
    );
    if (isStaleStubUsed()) {
      logBuffer.push(
        'warn',
        '检测到复用了上一次连接的软件加载器。若烧录失败，请先给开发板断电重插（或按复位键），再重新连接设备重试。'
      );
    }
  } catch (err) {
    if (machine.getState() !== 'idle') {
      machine.transition('fail');
    }
    const message = err instanceof Error ? err.message : String(err);
    logBuffer.push('error', message);
    detectResult = null;
    service = null;
  }
});

// ---- 串口监控（只读，立即显示开发板日志）----
el.monitorBtn?.addEventListener('click', async () => {
  if (!isWebSerialSupported() || machine.getState() !== 'idle') {
    return;
  }
  try {
    // requestPort 必须在用户手势内同步调用，否则会被浏览器拦截
    const port = await requestSerialPort(navigator.serial);
    machine.transition('monitor');
    service = createFlashService(port, DEFAULT_BAUD_RATE, terminal);
    await service.monitor({ consoleBaud, onConsoleData: appendConsoleLine });
    needsReconnect = true;
    logBuffer.push('info', `已开始串口监控（波特率 ${consoleBaud}），断开设备即停止。`);
  } catch (err) {
    if (machine.getState() !== 'idle') {
      machine.transition('fail');
    }
    const message = err instanceof Error ? err.message : String(err);
    logBuffer.push('error', `串口监控失败: ${message}`);
    service = null;
  }
  renderUi();
});

// ---- 开始烧录 ----
el.flashBtn?.addEventListener('click', async () => {
  if (!canFlash() || service === null || firmwareData === null) {
    return;
  }
  let address: number;
  try {
    address = parseAddress(el.addressInput?.value ?? '');
  } catch (err) {
    logBuffer.push('error', `烧录地址无效: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }
  machine.transition('flash-start');
  setProgressVisible(true);
  updateProgress(0, firmwareData.byteLength);
  logBuffer.push('info', `开始烧录 ${firmwareData.byteLength} 字节到 0x${address.toString(16)}`);
  try {
    await service.flash({
      data: firmwareData,
      address,
      eraseAll: false,
      compress: true,
      onProgress: (p) => {
        updateProgress(p.written, p.total);
      },
    });
    await service.finish();
    machine.transition('flash-ok');
    logBuffer.push('info', '烧录完成，设备已复位并运行新固件');
    updateProgress(1, 1);
  } catch (err) {
    machine.transition('flash-fail');
    const message = err instanceof Error ? err.message : String(err);
    logBuffer.push('error', `烧录失败: ${message}`);
    if (message.includes('compressed flash mode') || message.includes('status')) {
      logBuffer.push(
        'warn',
        '提示：此错误通常与设备未完全复位有关。请给开发板断电重插（或按复位键），然后重新连接设备再试。'
      );
    }
    try {
      await service.abort();
    } catch {
      // 忽略断开失败
    }
  }
});

// ---- 断开设备（彻底断开）----
el.resetBtn?.addEventListener('click', async () => {
  const state = machine.getState();
  if (state === 'error') {
    machine.transition('reset');
    detectResult = null;
    needsReconnect = false;
    setProgressVisible(false);
    return;
  }
  if (
    state === 'connected' ||
    state === 'success' ||
    state === 'flashing' ||
    state === 'monitoring'
  ) {
    if (service !== null) {
      try {
        await service.abort();
      } catch {
        // 忽略断开失败
      }
    }
    machine.transition('disconnect');
    detectResult = null;
    service = null;
    needsReconnect = false;
    setProgressVisible(false);
    logBuffer.push('info', '已断开设备连接');
  }
});

// ---- 重置设备（等效按开发板 RST 键）----
el.resetDeviceBtn?.addEventListener('click', async () => {
  if (service === null) {
    return;
  }
  try {
    // 复位后自动开始持续监控开发板串口日志，输出合并到统一日志视图
    await service.reset({
      consoleBaud,
      onConsoleData: appendConsoleLine,
    });
    needsReconnect = true;
    logBuffer.clear(); // 日志区刷新
    logBuffer.push('info', '已重置设备（等效按下开发板 RST 键），芯片已重启');
    logBuffer.push('info', `已开始监控开发板串口日志（波特率 ${consoleBaud}），断开设备即停止。`);
  } catch (err) {
    logBuffer.push('error', `重置设备失败: ${err instanceof Error ? err.message : String(err)}`);
  }
  renderUi();
});

renderUi();
logBuffer.push('info', 'Flashy 已就绪，请连接设备并选择固件开始烧录');
