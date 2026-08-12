import { formatAddress, isValidAddress, parseAddress } from './core/address';
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
import {
  BUILTIN_FIRMWARES,
  type BuiltinFirmware,
  loadBuiltinFirmware,
} from './core/builtinFirmwares';
import { parseEspIdfLevel } from './core/espIdfLog';
import { createLogBuffer, formatBytes, formatLogEntry, type LogBuffer } from './core/logBuffer';
import { formatLogTail, hasTailText } from './core/logExport';
import { selectionTextInside } from './core/logSelection';
import { isNearBottom, planLogRender } from './core/scrollUtils';
import { createFlashStateMachine } from './core/stateMachine';
import type { BaudRate, DetectResult, LogEntry } from './core/types';
import {
  appendHeights,
  applyMeasurements,
  createVirtualLogState,
  type RowMeasurement,
  rowTop,
  trimHead,
  unionWithSelection,
  visibleRange,
  type WindowRange,
} from './core/virtualLog';
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
  fileBtn: HTMLButtonElement | null;
  fileInfo: HTMLElement | null;
  builtinBtn: HTMLButtonElement | null;
  builtinModal: HTMLElement | null;
  builtinClose: HTMLButtonElement | null;
  builtinList: HTMLUListElement | null;
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
  selectionToolbar: HTMLElement | null;
  selectionAskBtn: HTMLButtonElement | null;
  selectionAskMenu: HTMLElement | null;
  copyLogBtn: HTMLButtonElement | null;
  askAiLogBtn: HTMLButtonElement | null;
  askAiLogMenu: HTMLElement | null;
  scrollBottomBtn: HTMLButtonElement | null;
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
    fileBtn: byId('file-btn') as HTMLButtonElement | null,
    fileInfo: byId('file-info'),
    builtinBtn: byId('builtin-btn') as HTMLButtonElement | null,
    builtinModal: byId('builtin-modal'),
    builtinClose: byId('builtin-close') as HTMLButtonElement | null,
    builtinList: byId('builtin-list') as HTMLUListElement | null,
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
    selectionToolbar: byId('selection-toolbar'),
    selectionAskBtn: byId('selection-ask-btn') as HTMLButtonElement | null,
    selectionAskMenu: byId('selection-ask-menu'),
    copyLogBtn: byId('copy-log-btn') as HTMLButtonElement | null,
    askAiLogBtn: byId('ask-ai-log-btn') as HTMLButtonElement | null,
    askAiLogMenu: byId('ask-ai-log-menu'),
    scrollBottomBtn: byId('scroll-bottom-btn') as HTMLButtonElement | null,
  };
}

const el = loadElements();
const machine = createFlashStateMachine();
const logBuffer = createLogBuffer({ max: 100000 });
const terminal = createLoaderTerminal(logBuffer);

/** 距日志底部多少像素视为已到底部（自动回底触发阈值）。 */
const SCROLL_NEAR_BOTTOM_THRESHOLD = 24;
/** 用户是否停留在日志底部：在底部时新日志自动回底，离开后保持视点不动。 */
let stickToBottom = true;
/** 已渲染到日志视图的完整日志快照；null 表示尚未渲染（用于增量对齐）。 */
let renderedEntries: readonly LogEntry[] | null = null;

// ---- 虚拟滚动参数与状态 ----
/** 可见窗口外上下各多渲染的行数（缓冲快速滚动）。 */
const LOG_VIRTUAL_OVERSCAN = 5;
/** 选区跨屏时渲染窗口的最大行数上限。 */
const MAX_SELECTION_ROWS = 5000;
/** 「复制」最多导出的行数（日志过多时只复制最近 N 行）。 */
const COPY_MAX_LINES = 10000;
/** 残留 stub 检测只扫描的最近行数。 */
const LOG_TAIL_SCAN = 2000;
/** 未测量行的预估行高（12.5px × 1.6 行高）。 */
const DEFAULT_ROW_HEIGHT = 20;

const virtualState = createVirtualLogState(DEFAULT_ROW_HEIGHT);
/** entry → 行节点映射：复用节点对象，保证滚动重渲染后选区锚点存活。 */
const rowNodes = new Map<LogEntry, HTMLDivElement>();
/** 虚拟滚动占位容器（.log-virtual）。 */
let logVirtual: HTMLDivElement | null = null;
/** 选区覆盖的行号区间；null 表示无选区。 */
let selectionRows: WindowRange | null = null;
/** scroll 事件 rAF 节流 id。 */
let scrollRafId: number | undefined;
/** 行高测量函数（测试可注入，happy-dom 的 offsetHeight 恒为 0）。 */
let measureRowHeight: (row: HTMLElement) => number = (row) => row.offsetHeight;

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
/** 内置固件正在加载时为 true，防止并发加载相互覆盖。 */
let firmwareLoading = false;

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

// ---- 日志渲染（烧录操作 + 开发板输出合并，防抖 + 增量渲染）----
/** 构造一条日志的 DOM 节点（虚拟滚动行）。 */
function buildLogNode(entry: LogEntry): HTMLDivElement {
  const node = document.createElement('div');
  node.textContent = formatLogEntry(entry);
  node.className = `log-row log-line log-${entry.level} log-${entry.type}`;
  return node;
}

// 虚拟滚动占位容器：撑起滚动高度，行节点在其中绝对定位
if (el.logView !== null) {
  logVirtual = document.createElement('div');
  logVirtual.className = 'log-virtual';
  el.logView.appendChild(logVirtual);
}

/** 定位选区端点到行号；不在行内返回 null。 */
function rowIndexOf(node: Node | null): number | null {
  let current = node instanceof Element ? node : (node?.parentElement ?? null);
  while (current !== null && current !== el.logView) {
    if (current.classList.contains('log-row')) {
      const index = Number((current as HTMLElement).dataset.index);
      return Number.isFinite(index) ? index : null;
    }
    current = current.parentElement;
  }
  return null;
}

/** 渲染当前可见窗口（含选区扩展范围）：复用节点对象、只移动不重建。 */
function renderWindow(): void {
  if (el.logView === null || logVirtual === null) {
    return;
  }
  const lines = logBuffer.lines();
  const n = lines.length;
  if (n === 0) {
    return;
  }
  const vis = visibleRange(
    virtualState,
    el.logView.scrollTop,
    el.logView.clientHeight,
    LOG_VIRTUAL_OVERSCAN
  );
  let start = vis.start;
  let end = vis.end;
  if (selectionRows !== null) {
    const merged = unionWithSelection(vis, selectionRows, MAX_SELECTION_ROWS);
    start = merged.start;
    end = merged.end;
  }
  // 移除窗口外的节点
  for (const [entry, node] of rowNodes) {
    const index = Number(node.dataset.index ?? '0');
    if (index < start || index > end) {
      node.remove();
      rowNodes.delete(entry);
    }
  }
  // 增量创建缺失节点并保持 DOM 升序插入。
  // 关键：不移动窗口内已存在的节点，避免选区锚点脱离文档导致浏览器重置选区（拖动选择错乱）。
  const fresh: Array<{ node: HTMLDivElement; index: number }> = [];
  for (let i = start; i <= end && i < n; i++) {
    const entry = lines[i];
    if (entry === undefined || rowNodes.has(entry)) {
      continue;
    }
    const node = buildLogNode(entry);
    rowNodes.set(entry, node);
    node.dataset.index = String(i);
    node.style.top = `${rowTop(virtualState, i)}px`;
    fresh.push({ node, index: i });
  }
  if (fresh.length > 0) {
    // absolute 定位不影响视觉，但选区文本顺序依赖 DOM 升序，故按 data-index 找插入位置
    const children = logVirtual.children;
    for (const item of fresh) {
      let insertBefore: Element | null = null;
      for (const child of children) {
        if (Number((child as HTMLElement).dataset.index ?? '0') > item.index) {
          insertBefore = child;
          break;
        }
      }
      logVirtual.insertBefore(item.node, insertBefore);
    }
  }
  // 测量新增节点并校正行高
  const measurements: RowMeasurement[] = [];
  for (const item of fresh) {
    measurements.push({ index: item.index, height: Math.max(1, measureRowHeight(item.node)) });
  }
  applyMeasurements(virtualState, measurements);
  // 校正后按最新偏移重定位窗口内节点（仅改 top，不移动节点）
  for (const node of rowNodes.values()) {
    const index = Number(node.dataset.index ?? '0');
    if (index >= start && index <= end) {
      node.style.top = `${rowTop(virtualState, index)}px`;
    }
  }
  // 更新占位高度（scrollHeight 依赖它），回底时滚动到底
  logVirtual.style.height = `${virtualState.totalHeight}px`;
  if (stickToBottom) {
    el.logView.scrollTop = el.logView.scrollHeight;
  }
}

/** 按渲染计划更新虚拟列表；用户离开底部时保持视点不动。 */
function renderLogView(): void {
  if (el.logView === null) {
    return;
  }
  const lines = logBuffer.lines();
  const plan = planLogRender({ renderedEntries }, lines);

  if (plan.action === 'clear') {
    for (const node of rowNodes.values()) {
      node.remove();
    }
    rowNodes.clear();
    logVirtual?.replaceChildren();
    virtualState.heights.length = 0;
    virtualState.offsets.length = 1;
    virtualState.offsets[0] = 0;
    virtualState.totalHeight = 0;
    if (logVirtual !== null) {
      logVirtual.style.height = '0px';
    }
    renderedEntries = null;
    stickToBottom = true;
    selectionRows = null;
  } else if (plan.action === 'rebuild') {
    // 首次渲染或异常兜底：重建高度数组（DOM 只有可见行，重建便宜）
    for (const node of rowNodes.values()) {
      node.remove();
    }
    rowNodes.clear();
    virtualState.heights.length = 0;
    virtualState.offsets.length = 1;
    virtualState.offsets[0] = 0;
    virtualState.totalHeight = 0;
    appendHeights(virtualState, lines.length);
    renderedEntries = lines;
    renderWindow();
  } else if (plan.action === 'adjust') {
    // 环形缓冲裁掉头部：裁剪高度并平移已渲染节点行号，再追加新行高度
    const removed = trimHead(virtualState, plan.removeFromHead);
    for (const node of rowNodes.values()) {
      node.dataset.index = String(Number(node.dataset.index ?? '0') - plan.removeFromHead);
    }
    appendHeights(virtualState, plan.to - plan.appendFrom);
    renderedEntries = lines;
    if (selectionRows !== null) {
      const s = selectionRows.start - plan.removeFromHead;
      const e = selectionRows.end - plan.removeFromHead;
      selectionRows = e < 0 ? null : { start: Math.max(0, s), end: Math.max(0, e) };
    }
    if (!stickToBottom) {
      el.logView.scrollTop = Math.max(0, el.logView.scrollTop - removed);
    }
    renderWindow();
  }
  // noop：日志无变化，不触碰 DOM 与滚动位置
  updateScrollBottomButton();
}

/** 刷新「回到底部」按钮显隐：在底部隐藏，离开底部显示。 */
function updateScrollBottomButton(): void {
  if (el.scrollBottomBtn === null) {
    return;
  }
  el.scrollBottomBtn.hidden = stickToBottom;
}

/** 滚动事件：重算用户是否停留在日志底部，并 rAF 节流重渲染窗口。 */
function onLogScroll(): void {
  if (el.logView === null) {
    return;
  }
  stickToBottom = isNearBottom(
    el.logView.scrollHeight,
    el.logView.scrollTop,
    el.logView.clientHeight,
    SCROLL_NEAR_BOTTOM_THRESHOLD
  );
  updateScrollBottomButton();
  if (scrollRafId !== undefined) {
    return;
  }
  scrollRafId = requestAnimationFrame(() => {
    scrollRafId = undefined;
    renderWindow();
  });
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

el.logView?.addEventListener('scroll', onLogScroll);
el.scrollBottomBtn?.addEventListener('click', () => {
  stickToBottom = true;
  if (el.logView !== null) {
    el.logView.scrollTop = el.logView.scrollHeight; // 瞬时跳转，程序赋值触发 scroll 事件，逻辑闭环
  }
  updateScrollBottomButton();
});

// 容器尺寸变化（窗口缩放/布局改变）时重渲染窗口
window.addEventListener('resize', () => {
  renderWindow();
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
      logBuffer.push(parseEspIdfLevel(trimmed), trimmed, 'device');
    }
  }
}

// ---- 复制 / 问 AI ----
/** 「复制」文本：日志过多时只取最近 N 行，并在开头提示已截取。 */
function copyLogText(): string {
  const lines = logBuffer.lines();
  const { text, lineCount } = formatLogTail(lines, { maxLines: COPY_MAX_LINES });
  if (lineCount < lines.length) {
    return `…（日志过长，已复制最近 ${lineCount} 行）…\n${text}`;
  }
  return text;
}

/** 「问 AI」文本：只取日志末尾足够字符数，避免对 10 万行全量 join。 */
function askAiLogText(): string {
  return formatLogTail(logBuffer.lines(), { maxChars: ASK_AI_MAX_CHARS }).text;
}

interface LogActionsOptions {
  copyBtn: HTMLButtonElement | null;
  askBtn: HTMLButtonElement | null;
  menu: HTMLElement | null;
  getCopyText: () => string;
  getAskText: () => string;
  logType: string;
}

/** 为一个日志面板装配「复制」与「问 AI」下拉。 */
function setupLogActions(options: LogActionsOptions): void {
  options.copyBtn?.addEventListener('click', async () => {
    const text = options.getCopyText();
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
    const logContent = truncateLog(options.getAskText(), ASK_AI_MAX_CHARS);
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
  getCopyText: copyLogText,
  getAskText: askAiLogText,
  logType: '日志',
});

// 点击页面其他区域关闭问 AI 下拉
document.addEventListener('click', () => {
  if (el.askAiLogMenu !== null) {
    el.askAiLogMenu.hidden = true;
  }
});

// ---- 选中日志工具栏（问 AI）----
function hideSelectionToolbar(): void {
  if (el.selectionToolbar !== null) {
    el.selectionToolbar.hidden = true;
  }
  if (el.selectionAskMenu !== null) {
    el.selectionAskMenu.hidden = true;
  }
}

/** 最近一次鼠标位置（用于把工具栏定位到鼠标附近；键盘选择时置空回退到选区矩形）。 */
let pointerPos: { x: number; y: number } | null = null;
/** 工具栏近似宽度，用于避免超出视口右边界。 */
const SELECTION_TOOLBAR_EST_WIDTH = 150;

function updateSelectionToolbar(): void {
  const sel = window.getSelection();
  const text = selectionTextInside(sel, el.logView);
  if (text === '' || el.selectionToolbar === null) {
    if (selectionRows !== null) {
      selectionRows = null;
      renderWindow();
    }
    hideSelectionToolbar();
    return;
  }
  // 扩展渲染窗口覆盖跨屏选区，保证选区文本完整可读
  const a = sel !== null ? rowIndexOf(sel.anchorNode) : null;
  const b = sel !== null ? rowIndexOf(sel.focusNode) : null;
  const next = a !== null && b !== null ? { start: Math.min(a, b), end: Math.max(a, b) } : null;
  if (
    next !== null &&
    (selectionRows === null || next.start !== selectionRows.start || next.end !== selectionRows.end)
  ) {
    selectionRows = next;
    renderWindow();
  } else if (next === null && selectionRows !== null) {
    selectionRows = null;
    renderWindow();
  }
  const range = sel?.getRangeAt(0);
  const rect = range?.getBoundingClientRect();
  if (pointerPos !== null) {
    // 贴近鼠标：右下偏移，且不超出视口
    const left = Math.min(
      pointerPos.x + 12,
      Math.max(0, window.innerWidth - SELECTION_TOOLBAR_EST_WIDTH)
    );
    const top = Math.min(pointerPos.y + 12, window.innerHeight - 44);
    el.selectionToolbar.style.left = `${left}px`;
    el.selectionToolbar.style.top = `${top}px`;
  } else {
    // 键盘选择：无鼠标位置，浮在选区上方；rect 取不到时兜底左上角（测试友好）
    el.selectionToolbar.style.left = `${rect?.left ?? 0}px`;
    el.selectionToolbar.style.top = `${Math.max(4, (rect?.top ?? 0) - 48)}px`;
  }
  el.selectionToolbar.hidden = false;
}

function setupSelectionToolbar(): void {
  document.addEventListener('selectionchange', updateSelectionToolbar);
  // 记录鼠标位置并在松开时刷新工具栏位置（贴近鼠标）；点击工具栏自身不改变位置
  document.addEventListener('mouseup', (event) => {
    const target = event.target as Node | null;
    if (el.selectionToolbar?.contains(target)) {
      return;
    }
    pointerPos = { x: event.clientX, y: event.clientY };
    updateSelectionToolbar();
  });
  // 键盘方向键扩展选区时没有鼠标位置，回退到选区矩形定位
  document.addEventListener('keyup', () => {
    pointerPos = null;
    updateSelectionToolbar();
  });
  el.selectionAskBtn?.addEventListener('mousedown', (event) => {
    event.preventDefault(); // 避免点击按钮时干扰当前选区
  });
  el.selectionAskBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (el.selectionAskMenu !== null) {
      el.selectionAskMenu.hidden = !el.selectionAskMenu.hidden;
    }
  });
  el.selectionAskMenu?.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest('button[data-ai]') as HTMLElement | null;
    if (target === null) {
      return;
    }
    const provider = ASK_AI_PROVIDERS.find((p) => p.id === target.dataset.ai);
    if (provider === undefined) {
      return;
    }
    const selected = selectionTextInside(window.getSelection(), el.logView);
    if (selected === '') {
      hideSelectionToolbar();
      return;
    }
    const logContent = truncateLog(selected, ASK_AI_MAX_CHARS);
    const context = buildDeviceContext(detectResult, '日志', consoleBaud);
    const prompt = buildAskAiPrompt(context, logContent);
    window.open(buildAskAiUrl(provider, prompt), '_blank', 'noopener');
    window.getSelection()?.removeAllRanges(); // 触发 selectionchange 自动隐藏工具栏
  });
}

setupSelectionToolbar();

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
  return hasTailText(logBuffer.lines(), 'Stub is already running', LOG_TAIL_SCAN);
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

// ---- 内置固件快捷选择 ----
/** 渲染内置固件列表（数据驱动，从 BUILTIN_FIRMWARES 生成）。 */
function renderBuiltinList(): void {
  if (el.builtinList === null) {
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const firmware of BUILTIN_FIRMWARES) {
    const item = document.createElement('li');
    item.className = 'builtin-item';
    item.addEventListener('click', () => {
      void selectBuiltinFirmware(firmware);
    });

    const meta = document.createElement('div');
    meta.className = 'builtin-meta';
    const name = document.createElement('span');
    name.className = 'builtin-name';
    name.textContent = firmware.name;
    meta.appendChild(name);
    if (firmware.description !== undefined) {
      const desc = document.createElement('span');
      desc.className = 'builtin-desc';
      desc.textContent = firmware.description;
      meta.appendChild(desc);
    }

    item.append(meta);
    fragment.appendChild(item);
  }
  el.builtinList.replaceChildren(fragment);
}

/** 选择内置固件：关闭弹窗 → 按需加载 → 写入状态并联动地址。 */
async function selectBuiltinFirmware(firmware: BuiltinFirmware): Promise<void> {
  if (firmwareLoading) {
    return;
  }
  firmwareLoading = true;
  closeBuiltinModal();
  if (el.builtinBtn !== null) {
    el.builtinBtn.disabled = true;
  }
  setFirmwareInfo(`正在加载内置固件 ${firmware.name}…`, false);
  try {
    const data = await loadBuiltinFirmware(firmware.url);
    firmwareData = data;
    if (el.fileInput !== null) {
      el.fileInput.value = ''; // 互斥：清空本地文件残留（不触发 change）
    }
    if (el.addressInput !== null) {
      el.addressInput.value = formatAddress(firmware.defaultAddress);
    }
    validateAddressInput();
    setFirmwareInfo(`${firmware.name}（${formatBytes(data.byteLength)}）`, true);
    logBuffer.push(
      'info',
      `已选择内置固件: ${firmware.name}（${formatBytes(data.byteLength)}），烧录地址 ${formatAddress(firmware.defaultAddress)}`
    );
  } catch (err) {
    firmwareData = null;
    setFirmwareInfo('内置固件加载失败，请重试', false);
    logBuffer.push(
      'error',
      `加载内置固件失败: ${err instanceof Error ? err.message : String(err)}`
    );
  } finally {
    firmwareLoading = false;
    if (el.builtinBtn !== null) {
      el.builtinBtn.disabled = false;
    }
    renderUi();
  }
}

/** 设置固件信息展示文本，并标记是否已选中（选中时高亮）。 */
function setFirmwareInfo(text: string, selected: boolean): void {
  if (el.fileInfo !== null) {
    el.fileInfo.textContent = text;
    el.fileInfo.classList.toggle('selected', selected);
  }
}

function openBuiltinModal(): void {
  el.builtinModal?.classList.add('open');
}

function closeBuiltinModal(): void {
  el.builtinModal?.classList.remove('open');
}

el.builtinBtn?.addEventListener('click', openBuiltinModal);
el.builtinClose?.addEventListener('click', closeBuiltinModal);
el.builtinModal?.addEventListener('click', (event) => {
  if (event.target === el.builtinModal) {
    closeBuiltinModal(); // 点击遮罩层关闭
  }
});

renderBuiltinList();

// ---- 文件选择 ----
el.fileBtn?.addEventListener('click', () => {
  el.fileInput?.click(); // 用户手势内同步触发文件选择器
});

el.fileInput?.addEventListener('change', async () => {
  const file = el.fileInput?.files?.[0];
  if (file === undefined) {
    firmwareData = null;
    setFirmwareInfo('未选择固件文件', false);
    renderUi();
    return;
  }
  try {
    const buffer = await file.arrayBuffer();
    firmwareData = new Uint8Array(buffer);
    setFirmwareInfo(`${file.name}（${formatBytes(buffer.byteLength)}）`, true);
    logBuffer.push('info', `已选择固件文件: ${file.name}（${formatBytes(buffer.byteLength)}）`);
  } catch (err) {
    firmwareData = null;
    setFirmwareInfo('读取文件失败', false);
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
      `检测到芯片 ${detectResult.chip}，Flash ${detectResult.flashSize ?? '未知'}，波特率 ${detectResult.baudrate}`,
      'success'
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
    logBuffer.clear(); // 只看本次复位后的启动日志
    logBuffer.push('info', '正在复位设备（等效 RST 键），等待启动日志…');
    await service.monitor({ consoleBaud, onConsoleData: appendConsoleLine });
    needsReconnect = true;
    logBuffer.push('info', `已开始串口监控（波特率 ${consoleBaud}），断开设备即停止。`, 'success');
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
    logBuffer.push('info', '烧录完成，设备已复位并运行新固件', 'success');
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
    logBuffer.push('info', '已重置设备（等效按下开发板 RST 键），芯片已重启', 'success');
    logBuffer.push(
      'info',
      `已开始监控开发板串口日志（波特率 ${consoleBaud}），断开设备即停止。`,
      'success'
    );
  } catch (err) {
    logBuffer.push('error', `重置设备失败: ${err instanceof Error ? err.message : String(err)}`);
  }
  renderUi();
});

renderUi();
logBuffer.push('info', 'Flashy 已就绪，请连接设备并选择固件开始烧录');

/** 测试钩子（main.ts 在 coverage.exclude 中）：暴露日志缓冲供冒烟测试写入。 */
export function __getLogBufferForTests(): LogBuffer {
  return logBuffer;
}

/** 测试钩子：注入行高测量函数（happy-dom 的 offsetHeight 恒为 0）。 */
export function __setMeasureRowHeightForTests(fn: (row: HTMLElement) => number): void {
  measureRowHeight = fn;
}
