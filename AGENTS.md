# CLAUDE.md - Flashy（浏览器端 ESP32 固件烧录工具）

本文档为 Claude Code 提供项目上下文和开发规范。

## 项目概述

**Flashy** 是一个纯浏览器端的 ESP32 固件烧录工具：用户通过 Chrome/Edge 打开页面，选择本地 `.bin` 固件文件并连接 USB 串口设备，即可直接烧录到 ESP32 开发板。底层使用 **Web Serial API** + Espressif 官方 **esptool-js**。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| TypeScript | 6.x | 编程语言 |
| Node.js | 22+ | 运行时 |
| pnpm | 10.x | 包管理器 |
| Vite | 6.x | 构建工具 / 开发服务器 |
| Vitest | 3.x | 测试框架（+ happy-dom 冒烟测试） |
| Biome | 2.x | Linter + Formatter |
| cspell | 10.x | 拼写检查 |
| esptool-js | 0.6.x | ESP32 烧录协议（运行时依赖） |

## 快速命令参考

```bash
# 开发
pnpm run dev          # 开发模式（http://localhost:5173）
pnpm run build        # 类型检查 + 生产构建
pnpm run preview      # 预览构建产物

# 测试
pnpm run test         # 运行测试
pnpm run test:watch   # 测试监听模式
pnpm run test:coverage # 覆盖率报告

# 代码质量
pnpm run lint         # 代码检查
pnpm run lint:fix     # 自动修复
pnpm run format       # 格式化代码
pnpm run typecheck    # 类型检查
pnpm run check        # 完整检查（typecheck + lint）
```

## 架构概览

```
index.html → src/main.ts（UI 装配）
  ├── core/            # 纯逻辑：状态机 / 地址解析 / 波特率 / 日志缓冲
  ├── serial/          # portManager（Web Serial 封装）+ flashService（esptool-js 编排）
  └── terminal/        # loaderTerminal（esptool-js 终端回调 → 日志缓冲）
```

关键点：
- **芯片自动检测**：`esploader.main()` 自动识别芯片，无需用户手动选择芯片型号
- **串口由 esptool-js 打开**：`portManager` 只负责能力检测与选择设备
- **烧录地址**：默认 `0x0`（合并固件）或 `0x10000`（应用固件）
- **Web Serial 限制**：需 Chrome/Edge 89+ 且 HTTPS 或 localhost；Safari 不支持

## 代码风格规范

### 基本规则

- **缩进**: 2 空格
- **引号**: 单引号（JS/TS；CSS 属性选择器用双引号，遵循 Biome CSS 默认）
- **分号**: 必须有
- **行宽**: 最大 100 字符
- **尾随逗号**: ES5 标准

### TypeScript 规范

- 严格模式开启（`strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 等）
- 禁止 `any` 类型 (warn)
- 显式定义公共函数返回类型
- 使用 `const` 优先，`let` 仅在必要时使用
- 使用可选链 (`?.`) 和空值合并 (`??`)

### 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 文件 | kebab-case | `flash-service.ts` |
| 类 | PascalCase | `MyClass` |
| 函数/变量 | camelCase | `myFunction` |
| 常量 | SCREAMING_SNAKE_CASE | `MAX_COUNT` |
| 类型/接口 | PascalCase | `UserConfig` |

## Git 工作流

### 分支命名

- `feature/xxx` - 新功能
- `fix/xxx` - Bug 修复
- `docs/xxx` - 文档更新
- `refactor/xxx` - 重构

### Commit 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

**类型**:
- `feat` - 新功能
- `fix` - Bug 修复
- `docs` - 文档
- `style` - 代码格式
- `refactor` - 重构
- `perf` - 性能优化
- `test` - 测试
- `chore` - 构建/工具

**示例**:
```
feat: add new utility function
fix(utils): handle null case in formatDate
docs: update README with new examples
```

## 测试规范

### 测试文件位置

- 单元测试: `src/__tests__/*.test.ts`
- main.ts 冒烟测试: `src/__tests__/main.test.ts`（happy-dom 环境）

### 测试策略

- **纯逻辑**（`core/*`、`terminal/*`）：node 环境直接单测
- **Web Serial**：`portManager` 通过依赖注入 fake `SerialLike`
- **esptool-js**：`flashService` 通过 `vi.mock('esptool-js')`
- **main.ts**：happy-dom 冒烟测试（UI 初始化与控件联动）

### 测试覆盖率

- 阈值: 80%（行/函数/分支/语句）
- `src/main.ts` 在 coverage.exclude 中

## 关键规则

1. **提交前检查**: 确保 `pnpm run check` 通过、所有测试通过
2. **类型安全**: 避免使用 `any`，优先使用具体类型或泛型
3. **文档更新**: 新功能需更新相关文档（README / docs/）
4. **测试覆盖**: 新代码需要有对应的测试
5. **中文优先**: 所有文档、commit 信息、PR 信息、注释等有必要的场景优先使用中文
6. **esptool-js 是浏览器专用**: node 环境测试必须 mock，真机验证兜底

## 可用 Slash Commands

| 命令 | 说明 |
|------|------|
| `/build` | 构建项目 |
| `/test` | 运行测试 |
| `/lint` | 代码检查 |
| `/typecheck` | 类型检查 |
| `/spellcheck` | 拼写检查 |

## 常见问题

### 如何添加新功能？

1. 创建功能分支: `git checkout -b feature/my-feature`
2. 实现功能代码（核心逻辑放 `src/core/` 便于单测）
3. 编写测试用例
4. 运行检查: `pnpm run check`
5. 提交代码: `git commit -m "feat: add my feature"`
6. 创建 PR

### 如何修复 Bug？

1. 创建修复分支: `git checkout -b fix/my-bug`
2. 编写失败的测试用例 (复现 Bug)
3. 修复代码
4. 验证测试通过
5. 提交代码: `git commit -m "fix: resolve my bug"`
6. 创建 PR

### 如何验证真机烧录？

1. `pnpm run dev` 打开 `http://localhost:5173`（Chrome/Edge）
2. 连接 ESP32 开发板 → 系统串口选择器选 USB 串口
3. 观察日志中自动识别出的芯片型号
4. 选择 `.bin` 文件、设置地址（应用固件 `0x10000` / 合并固件 `0x0`）
5. 点「开始烧录」，观察进度条与 `Hash of data verified` 日志
