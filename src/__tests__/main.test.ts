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
    const selectBtn = document.querySelector<HTMLButtonElement>('.builtin-item .btn-tiny');
    selectBtn?.click();
    await vi.waitFor(() => {
      expect(document.getElementById('file-info')?.textContent).toContain('4 B');
    });
    expect(document.getElementById('file-info')?.textContent).toContain('小智AI面包板');
    expect(document.getElementById('file-info')?.classList.contains('selected')).toBe(true);
    expect((document.getElementById('address-input') as HTMLInputElement).value).toBe('0x0');
    expect(fileInput?.value).toBe('');
  });
});
