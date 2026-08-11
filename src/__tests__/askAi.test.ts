import { describe, expect, it } from 'vitest';
import type { AskAiProvider } from '../core/askAi';
import {
  ASK_AI_PROVIDERS,
  buildAskAiPrompt,
  buildAskAiUrl,
  buildDeviceContext,
  truncateLog,
} from '../core/askAi';

function provider(id: AskAiProvider['id']): AskAiProvider {
  const p = ASK_AI_PROVIDERS.find((x) => x.id === id);
  if (p === undefined) {
    throw new Error(`provider not found: ${id}`);
  }
  return p;
}

describe('ASK_AI_PROVIDERS', () => {
  it('should expose the three AI providers', () => {
    expect(ASK_AI_PROVIDERS.map((p) => p.id)).toEqual(['deepseek', 'chatgpt', 'claude']);
  });
});

describe('buildAskAiUrl', () => {
  it('should build Deepseek URL with encoded query', () => {
    expect(buildAskAiUrl(provider('deepseek'), 'hello world')).toBe(
      'https://chat.deepseek.com?q=hello%20world'
    );
  });

  it('should build ChatGPT URL with hints=search', () => {
    expect(buildAskAiUrl(provider('chatgpt'), 'a&b')).toBe(
      'https://chatgpt.com/?hints=search&q=a%26b'
    );
  });

  it('should build Claude URL', () => {
    expect(buildAskAiUrl(provider('claude'), '分析日志')).toBe(
      'https://claude.ai/new?q=%E5%88%86%E6%9E%90%E6%97%A5%E5%BF%97'
    );
  });
});

describe('truncateLog', () => {
  it('should return the text unchanged when within the limit', () => {
    expect(truncateLog('abc', 10)).toBe('abc');
  });

  it('should keep the tail and mark truncation when too long', () => {
    const result = truncateLog('0123456789ABCDEF', 8);
    expect(result).toContain('已截取');
    expect(result.endsWith('89ABCDEF')).toBe(true);
    expect(result.length).toBeLessThan(40);
  });
});

describe('buildDeviceContext', () => {
  it('should include chip, flash, baud and log type', () => {
    const ctx = buildDeviceContext(
      { chip: 'ESP32-S3', flashSize: '16MB', baudrate: 1500000 },
      '烧录操作日志',
      115200
    );
    expect(ctx).toContain('芯片：ESP32-S3');
    expect(ctx).toContain('Flash：16MB');
    expect(ctx).toContain('波特率：1500000');
    expect(ctx).toContain('日志类型：烧录操作日志');
    expect(ctx).toContain('控制台波特率：115200');
  });

  it('should handle unknown device info', () => {
    const ctx = buildDeviceContext(null, '开发板串口日志', 115200);
    expect(ctx).toContain('设备信息：未知');
    expect(ctx).toContain('日志类型：开发板串口日志');
  });
});

describe('buildAskAiPrompt', () => {
  it('should assemble analysis instruction, context and log content', () => {
    const prompt = buildAskAiPrompt('设备信息：\n芯片：X', 'some log content');
    expect(prompt).toContain('分析');
    expect(prompt).toContain('设备信息');
    expect(prompt).toContain('some log content');
    expect(prompt).toContain('===== 日志开始 =====');
    expect(prompt).toContain('===== 日志结束 =====');
  });
});
