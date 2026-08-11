/**
 * 「问 AI」功能：将日志 + 设备信息组装成 prompt，并生成跳转到对应 AI 的 URL。
 */

/**
 * 传给 AI 的日志截取上限。
 *
 * 问 AI 通过 URL query（`?q=`）传参，服务器对 URL 长度限制仅 KB 级（414），
 * 且 encodeURIComponent 对中文膨胀约 9 倍，因此不宜过大。
 * 3000 字符在 ASCII 设备日志场景安全；大段中文内容由「选中日志」功能规避。
 */
export const ASK_AI_MAX_CHARS = 3000;

/** AI 服务商配置。 */
export interface AskAiProvider {
  id: 'deepseek' | 'chatgpt' | 'claude';
  label: string;
  buildUrl: (q: string) => string;
}

/** 支持的 AI 服务商。 */
export const ASK_AI_PROVIDERS: readonly AskAiProvider[] = [
  {
    id: 'deepseek',
    label: 'Deepseek',
    buildUrl: (q) => `https://chat.deepseek.com?q=${encodeURIComponent(q)}`,
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    buildUrl: (q) => `https://chatgpt.com/?hints=search&q=${encodeURIComponent(q)}`,
  },
  {
    id: 'claude',
    label: 'Claude',
    buildUrl: (q) => `https://claude.ai/new?q=${encodeURIComponent(q)}`,
  },
];

/** 当前连接设备的信息（用于问 AI 时的上下文）。 */
export interface AskAiDevice {
  chip: string;
  flashSize: string | null;
  baudrate: number;
}

/**
 * 截取日志末尾 max 字符（保留最近部分），过长时在开头标注已截取。
 */
export function truncateLog(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `…（日志过长，已截取最近 ${max} 字符）…\n${text.slice(-max)}`;
}

/** 组装设备信息上下文。 */
export function buildDeviceContext(
  device: AskAiDevice | null,
  logType: string,
  consoleBaud: number
): string {
  const lines: string[] = [];
  if (device === null) {
    lines.push('设备信息：未知');
  } else {
    lines.push('设备信息：');
    lines.push(`芯片：${device.chip}`);
    lines.push(`Flash：${device.flashSize ?? '未知'}`);
    lines.push(`波特率：${device.baudrate}`);
  }
  lines.push(`日志类型：${logType}`);
  lines.push(`控制台波特率：${consoleBaud}`);
  return lines.join('\n');
}

/** 组装完整提问文本：分析指令 + 设备信息 + 日志内容。 */
export function buildAskAiPrompt(context: string, logContent: string): string {
  return [
    '请帮我分析以下 ESP32 设备的日志，指出可能的问题、原因和解决建议。',
    '',
    context,
    '',
    '===== 日志开始 =====',
    logContent,
    '===== 日志结束 =====',
  ].join('\n');
}

/** 根据 provider 生成跳转 URL（prompt 已由 buildUrl 内部编码）。 */
export function buildAskAiUrl(provider: AskAiProvider, prompt: string): string {
  return provider.buildUrl(prompt);
}
