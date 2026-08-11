/**
 * 内置固件清单与加载。
 *
 * 固件文件位于 public/ 下，随构建产物原样部署。这里只记录元信息，
 * 实际数据在用户点击「选择」时才通过 fetch 按需加载。
 */

/** 内置固件元信息。 */
export interface BuiltinFirmware {
  /** 唯一标识（列表 key / 日志用）。 */
  id: string;
  /** 展示名称。 */
  name: string;
  /** public/ 下的相对路径。使用相对路径以兼容 vite base:'./' 与子路径部署。 */
  url: string;
  /** 一句话描述（可选；无描述时省略该属性）。 */
  description?: string;
  /** 推荐烧录地址。 */
  defaultAddress: number;
}

/** 内置固件清单。新增固件只需在此追加一项，并把 .bin 放入 public/。 */
export const BUILTIN_FIRMWARES: readonly BuiltinFirmware[] = [
  {
    id: 'bread-compact-wifi',
    name: '小智AI面包板 0.91寸 OLED',
    url: './v2.2.4_bread-compact-wifi.bin',
    description: '面包板 · 0.91 英寸 OLED',
    defaultAddress: 0x0,
  },
  {
    id: 'bread-compact-wifi-lcd-240x240',
    name: '小智AI面包板 1.54寸 LCD 彩屏',
    url: './v2.2.6_bread-compact-wifi-lcd-240x240.bin',
    description: '面包板 · 1.54 英寸 LCD 彩屏',
    defaultAddress: 0x0,
  },
];

/**
 * 按需加载内置固件二进制。
 *
 * 仅在 response 非 ok 或内容为空时抛错，保证不会把损坏数据带入烧录流程。
 */
export async function loadBuiltinFirmware(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`内置固件下载失败: HTTP ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new Error('内置固件内容为空');
  }
  return new Uint8Array(buffer);
}
