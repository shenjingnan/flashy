# Flashy · ESP32 固件烧录工具

[![CI](https://github.com/shenjingnan/flashy/actions/workflows/ci.yml/badge.svg)](https://github.com/shenjingnan/flashy/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个纯浏览器端的 ESP32 固件烧录工具。无需安装任何驱动或桌面软件，使用 Chrome / Edge 打开页面即可通过 **Web Serial** 直连开发板烧录固件。

> 技术方案参考 [ESP Launchpad](https://espressif.github.io/esp-launchpad/)（Espressif 官方），底层使用官方 [esptool-js](https://github.com/espressif/esptool-js)。

## 特性

- **浏览器直连**：基于 Web Serial API，无需安装驱动，`localhost` 或 HTTPS 即可使用
- **芯片自动检测**：连接后自动识别芯片型号与 Flash 大小（无需手动选择）
- **波特率预设**：921600 / 460800 / 230400 / 115200
- **自定义烧录地址**：默认 `0x0`，可编辑
- **实时进度与日志**：烧录进度条 + 控制台串口日志
- **烧录后自动复位**：完成后自动复位设备运行新固件

## 快速开始

### 环境要求

- Node.js 22+、pnpm 10+
- 浏览器：Chrome / Edge 89+（Web Serial API 需要 HTTPS 或 `localhost`；Safari 暂不支持）

### 安装与运行

```bash
# 安装依赖
pnpm install

# 开发模式（浏览器打开 http://localhost:5173）
pnpm run dev

# 生产构建（产物在 dist/）
pnpm run build

# 预览构建产物
pnpm run preview
```

## 使用步骤

1. **连接设备**：点击「连接设备」，在弹出的系统对话框中选择 ESP32 开发板对应的 USB 串口（macOS 上形如 `/dev/cu.usbserial-*`，Windows 上为 COM 口）
2. **选择固件**：点击「选择固件」，选择编译好的 `.bin` 文件
3. **设置参数**：选择波特率（默认 115200），确认烧录地址（默认 `0x0`）
4. **开始烧录**：点击「开始烧录」，观察进度条与控制台日志
5. **完成**：烧录完成后设备自动复位并运行新固件

> **提示**：若使用 `idf.py build` 生成的应用固件（`build/<project>.bin`），通常烧录到 `0x10000`；使用 `idf.py merge-bin` 合并后的完整镜像烧录到 `0x0`。

## 项目结构

```
flashy/
├── index.html            # 应用入口
├── src/
│   ├── main.ts           # UI 装配与事件绑定
│   ├── style.css         # 深色控制台风格样式
│   ├── core/             # 纯逻辑：状态机、地址解析、波特率、日志缓冲
│   ├── serial/           # Web Serial 封装与 esptool-js 编排
│   ├── terminal/         # 终端回调桥接
│   └── __tests__/        # 单元测试 + main.ts 冒烟测试
├── docs/                 # 文档
└── .github/workflows/    # CI 工作流
```

## 可用脚本

| 命令 | 说明 |
|------|------|
| `pnpm run dev` | 开发模式（Vite） |
| `pnpm run build` | 类型检查 + 生产构建 |
| `pnpm run preview` | 预览构建产物 |
| `pnpm run test` | 运行测试 |
| `pnpm run test:coverage` | 测试覆盖率报告 |
| `pnpm run lint` | 代码检查（Biome） |
| `pnpm run format` | 格式化代码 |
| `pnpm run typecheck` | TypeScript 类型检查 |
| `pnpm run check` | 完整检查（typecheck + lint） |
| `pnpm run spellcheck` | 拼写检查 |

## 技术架构

```
浏览器 (Chrome/Edge) ── Web Serial API ── USB 串口 ── ESP32 开发板
        │
        └─ esptool-js：连接、自动检测芯片、写入固件、复位
```

- **esptool-js**：Espressif 官方 esptool.py 的 JavaScript 移植，负责同步协议、波特率切换、Flash 写入与 MD5 校验
- **芯片自动检测**：`ESPLoader.main()` 在连接时通过串口协议自动识别芯片，覆盖 ESP32 / ESP32-C3 / ESP32-S3 / ESP8266 等
- **状态机**：自研纯逻辑状态机管理烧录流程（未连接 → 连接中 → 检测芯片 → 已连接 → 烧录中 → 成功 / 错误）

## 开发

### 代码风格

- 2 空格缩进、单引号、强制分号、行宽 100 字符
- 严格 TypeScript，禁止 `any`
- 中文注释与提交信息优先

### 测试

- 测试文件放在 `src/__tests__/`
- 覆盖率阈值 80%
- 纯逻辑（地址解析、状态机、日志缓冲等）直接单测
- Web Serial 与 esptool-js 通过 mock / 依赖注入测试
- `main.ts` 使用 happy-dom 冒烟测试

## 部署

`pnpm run build` 生成的 `dist/` 是纯静态文件，可部署到任意静态托管（GitHub Pages、Vercel、Cloudflare Pages 等）。

> 部署到线上必须使用 HTTPS，Web Serial API 在非安全上下文中不可用。

## 许可证

[MIT](LICENSE) © 2026 shenjingnan
