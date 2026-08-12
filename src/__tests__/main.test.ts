// @vitest-environment happy-dom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUILTIN_FIRMWARES } from '../core/builtinFirmwares';

const html = readFileSync(resolve('index.html'), 'utf-8');

/** 将 index.html 解析并注入到当前测试文档（剔除样式表链接，避免 happy-dom 发起 fetch）。 */
function seedDocument(): void {
  const cleaned = html.replace(/<link rel="stylesheet"[^>]*>/i, '');
  const parsed = new DOMParser().parseFromString(cleaned, 'text/html');
  document.replaceChildren(parsed.documentElement);
}

describe('main.ts 冒烟测试', () => {
  beforeEach(() => {
    vi.resetModules();
    seedDocument();
  });

  it('should set the version label', async () => {
    await import('../main');
    expect(document.getElementById('version')?.textContent).toBe(`v${__APP_VERSION__}`);
  });

  it('should populate the baud rate select with auto and presets', async () => {
    await import('../main');
    const select = document.getElementById('baud-select') as HTMLSelectElement | null;
    expect(select?.options.length).toBe(6); // 自动 + 5 个预设
    expect(select?.value).toBe('auto'); // 默认自动
  });

  it('should show the compat warning when Web Serial is unsupported', async () => {
    await import('../main');
    const warning = document.getElementById('compat-warning') as HTMLElement | null;
    expect(warning?.hidden).toBe(false);
    expect(warning?.textContent).toContain('Web Serial');
  });

  it('should disable the flash button initially', async () => {
    await import('../main');
    const flashBtn = document.getElementById('flash-btn') as HTMLButtonElement | null;
    expect(flashBtn?.disabled).toBe(true);
  });

  it('should render the ready log entry as a system message', async () => {
    await import('../main');
    await new Promise((resolve) => setTimeout(resolve, 50)); // 等待防抖渲染
    const logView = document.getElementById('log-view');
    expect(logView?.textContent).toContain('Flashy 已就绪');
    const readyNode = [...(logView?.querySelectorAll('.log-line') ?? [])].find((node) =>
      node.textContent?.includes('Flashy 已就绪')
    );
    expect(readyNode?.classList.contains('log-system')).toBe(true);
  });

  it('should populate the console baud select', async () => {
    await import('../main');
    const select = document.getElementById('console-baud') as HTMLSelectElement | null;
    expect(select?.options.length).toBe(4);
    expect(select?.value).toBe('115200');
  });

  it('should expose copy and ask-AI controls on the log panel', async () => {
    await import('../main');
    for (const id of ['copy-log-btn', 'ask-ai-log-btn', 'ask-ai-log-menu']) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it('should expose a hidden selection toolbar with ask-AI control', async () => {
    await import('../main');
    const toolbar = document.getElementById('selection-toolbar') as HTMLElement | null;
    const askBtn = document.getElementById('selection-ask-btn') as HTMLButtonElement | null;
    expect(toolbar).not.toBeNull();
    expect(toolbar?.hidden).toBe(true); // 初始隐藏，选中日志后才出现
    expect(askBtn).not.toBeNull();
  });

  it('should expose the serial monitor button', async () => {
    await import('../main');
    const monitorBtn = document.getElementById('monitor-btn') as HTMLButtonElement | null;
    expect(monitorBtn?.textContent).toBe('串口监控');
    expect(monitorBtn?.disabled).toBe(true); // 无 Web Serial 环境初始禁用
  });

  it('should expose separate disconnect and reset buttons, both initially disabled', async () => {
    await import('../main');
    const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement | null;
    const resetDeviceBtn = document.getElementById('reset-device-btn') as HTMLButtonElement | null;
    expect(resetBtn?.textContent).toBe('断开设备');
    expect(resetDeviceBtn?.textContent).toBe('重置设备');
    expect(resetBtn?.disabled).toBe(true);
    expect(resetDeviceBtn?.disabled).toBe(true);
  });

  it('should mark invalid addresses in the UI', async () => {
    await import('../main');
    const address = document.getElementById('address-input') as HTMLInputElement | null;
    if (address !== null) {
      address.value = 'abc';
      address.dispatchEvent(new Event('input', { bubbles: true }));
      expect(address.classList.contains('invalid')).toBe(true);

      address.value = '0x10000';
      address.dispatchEvent(new Event('input', { bubbles: true }));
      expect(address.classList.contains('invalid')).toBe(false);
    }
  });

  it('should open the builtin modal and render the firmware list', async () => {
    await import('../main');
    const modal = document.getElementById('builtin-modal') as HTMLElement | null;
    const btn = document.getElementById('builtin-btn') as HTMLButtonElement | null;
    btn?.click();
    expect(modal?.classList.contains('open')).toBe(true);
    const items = modal?.querySelectorAll('.builtin-item') ?? [];
    expect(items.length).toBe(BUILTIN_FIRMWARES.length);
  });

  it('should close the builtin modal via the close button', async () => {
    await import('../main');
    const modal = document.getElementById('builtin-modal') as HTMLElement | null;
    document.getElementById('builtin-btn')?.click();
    document.getElementById('builtin-close')?.click();
    expect(modal?.classList.contains('open')).toBe(false);
  });

  it('should open the file picker when the local firmware button is clicked', async () => {
    await import('../main');
    const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
    const clickSpy = vi.spyOn(fileInput as HTMLInputElement, 'click');
    document.getElementById('file-btn')?.click();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should select a builtin firmware, set address 0x0 and clear the file input', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(new Uint8Array([0xde, 0xad, 0xbe, 0xef]).buffer)))
    );
    await import('../main');
    const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
    const builtinItem = document.querySelector<HTMLElement>('.builtin-item');
    builtinItem?.click();
    await vi.waitFor(() => {
      expect(document.getElementById('file-info')?.textContent).toContain('4 B');
    });
    expect(document.getElementById('file-info')?.textContent).toContain('小智AI面包板');
    expect(document.getElementById('file-info')?.classList.contains('selected')).toBe(true);
    expect((document.getElementById('address-input') as HTMLInputElement).value).toBe('0x0');
    expect(fileInput?.value).toBe('');
  });

  it('should hide the scroll-bottom button initially', async () => {
    await import('../main');
    const btn = document.getElementById('scroll-bottom-btn') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.hidden).toBe(true);
  });

  it('should toggle the scroll-bottom button as the user scrolls away from and back to bottom', async () => {
    await import('../main');
    const logView = document.getElementById('log-view') as HTMLPreElement;
    const btn = document.getElementById('scroll-bottom-btn') as HTMLButtonElement;
    // happy-dom 的 scrollHeight/clientHeight 恒为 0 且只读，需在实例上盖影子属性模拟滚动
    Object.defineProperty(logView, 'scrollHeight', {
      configurable: true,
      writable: true,
      value: 1000,
    });
    Object.defineProperty(logView, 'clientHeight', {
      configurable: true,
      writable: true,
      value: 400,
    });
    logView.scrollTop = 0; // 视口顶部，远离底部
    logView.dispatchEvent(new Event('scroll'));
    expect(btn.hidden).toBe(false); // 离开底部 → 显示

    logView.scrollTop = 600; // 回到底部（剩余可滚 0 < 24）
    logView.dispatchEvent(new Event('scroll'));
    expect(btn.hidden).toBe(true); // 回到底部 → 隐藏
  });

  it('should scroll to bottom and hide the button when clicked', async () => {
    await import('../main');
    const logView = document.getElementById('log-view') as HTMLPreElement;
    const btn = document.getElementById('scroll-bottom-btn') as HTMLButtonElement;
    Object.defineProperty(logView, 'scrollHeight', {
      configurable: true,
      writable: true,
      value: 1000,
    });
    Object.defineProperty(logView, 'clientHeight', {
      configurable: true,
      writable: true,
      value: 400,
    });
    logView.scrollTop = 0;
    logView.dispatchEvent(new Event('scroll'));
    expect(btn.hidden).toBe(false);
    btn.click();
    expect(btn.hidden).toBe(true);
    expect(logView.scrollTop).toBe(1000);
  });

  it('should append new log lines without rebuilding existing nodes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(new Uint8Array([0xde, 0xad, 0xbe, 0xef]).buffer)))
    );
    const main = await import('../main');
    main.__setMeasureRowHeightForTests(() => 20);
    const logView = document.getElementById('log-view') as HTMLPreElement;
    Object.defineProperty(logView, 'clientHeight', {
      configurable: true,
      writable: true,
      value: 2000,
    });
    await new Promise((resolve) => setTimeout(resolve, 50)); // 等待初始防抖渲染
    const firstNode = logView.querySelector('.log-line');
    expect(firstNode).not.toBeNull();
    document.querySelector<HTMLElement>('.builtin-item')?.click();
    await vi.waitFor(() => {
      expect(logView.querySelectorAll('.log-line').length).toBeGreaterThanOrEqual(2);
    });
    // 首个节点引用不变，证明是复用节点增量追加而非重建
    expect(logView.querySelector('.log-line')).toBe(firstNode);
  });

  it('should clear the log view when the clear button is clicked', async () => {
    await import('../main');
    await new Promise((resolve) => setTimeout(resolve, 50)); // 等待初始防抖渲染
    const logView = document.getElementById('log-view') as HTMLPreElement;
    expect(logView.querySelectorAll('.log-line').length).toBeGreaterThanOrEqual(1);
    document.getElementById('clear-log-btn')?.click();
    await new Promise((resolve) => setTimeout(resolve, 50)); // 等待防抖渲染
    expect(logView.querySelectorAll('.log-line').length).toBe(0);
  });

  it('should create the virtual scroll container', async () => {
    await import('../main');
    const logView = document.getElementById('log-view');
    expect(logView?.querySelector('.log-virtual')).not.toBeNull();
  });

  it('should only render a limited window of rows when logs are many', async () => {
    const main = await import('../main');
    main.__setMeasureRowHeightForTests(() => 20);
    const logView = document.getElementById('log-view') as HTMLPreElement;
    Object.defineProperty(logView, 'clientHeight', {
      configurable: true,
      writable: true,
      value: 200,
    });
    const buffer = main.__getLogBufferForTests();
    for (let i = 0; i < 500; i++) {
      buffer.push('info', `line ${i}`, 'device');
    }
    await new Promise((resolve) => setTimeout(resolve, 60)); // 等待防抖 + rAF
    const rows = logView.querySelectorAll('.log-row').length;
    expect(rows).toBeGreaterThan(0);
    expect(rows).toBeLessThanOrEqual(30); // 可见 10 行 + 2×5 overscan + 余量
  });

  it('should render different rows after scrolling', async () => {
    const main = await import('../main');
    main.__setMeasureRowHeightForTests(() => 20);
    const logView = document.getElementById('log-view') as HTMLPreElement;
    Object.defineProperty(logView, 'clientHeight', {
      configurable: true,
      writable: true,
      value: 200,
    });
    const logVirtual = logView.querySelector('.log-virtual') as HTMLElement;
    Object.defineProperty(logView, 'scrollHeight', {
      configurable: true,
      get: () => parseFloat(logVirtual.style.height) || 0,
    });
    const buffer = main.__getLogBufferForTests();
    for (let i = 0; i < 500; i++) {
      buffer.push('info', `line ${i}`, 'device');
    }
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(logView.querySelector('.log-row')?.getAttribute('data-index')).toBe('0');
    logView.scrollTop = 400; // 约第 20 行位置
    logView.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => setTimeout(resolve, 20)); // 冲 rAF
    const after = Number(logView.querySelector('.log-row')?.getAttribute('data-index') ?? '0');
    expect(after).toBeGreaterThan(10);
  });

  it('should keep scrolling to bottom while the user stays at the bottom', async () => {
    const main = await import('../main');
    main.__setMeasureRowHeightForTests(() => 20);
    const logView = document.getElementById('log-view') as HTMLPreElement;
    Object.defineProperty(logView, 'clientHeight', {
      configurable: true,
      writable: true,
      value: 200,
    });
    const logVirtual = logView.querySelector('.log-virtual') as HTMLElement;
    Object.defineProperty(logView, 'scrollHeight', {
      configurable: true,
      get: () => parseFloat(logVirtual.style.height) || 0,
    });
    const buffer = main.__getLogBufferForTests();
    buffer.push('info', 'first', 'device');
    await new Promise((resolve) => setTimeout(resolve, 60));
    buffer.push('info', 'second', 'device');
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(logView.scrollTop).toBe(logView.scrollHeight);
    expect(logView.textContent).toContain('second');
  });
});
