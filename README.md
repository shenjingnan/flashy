# ai-typescript-starter

[![CI](https://github.com/shenjingnan/ai-typescript-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/shenjingnan/ai-typescript-starter/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/ai-typescript-starter.svg)](https://www.npmjs.com/package/ai-typescript-starter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

AI 原生的 TypeScript 启动模板，专为 AI 辅助开发时代打造。

## 特性

- **现代技术栈**: TypeScript + Node.js 24+ + pnpm
- **构建工具**: tsdown - 基于 rolldown 的 TypeScript 打包器
- **测试框架**: Vitest - Vite 原生测试框架
- **代码质量**: Biome (Lint + Format) + cspell (拼写检查)
- **Git 工作流**: Husky + lint-staged + release-it
- **AI 集成**: 内置 CLAUDE.md 和 .claude/ 目录配置
- **CI/CD**: GitHub Actions 自动化测试和发布

## 快速开始

### 使用模板

点击仓库页面的 "Use this template" 按钮创建新项目。

### 安装

```bash
# 克隆项目
git clone https://github.com/your-username/your-project.git
cd your-project

# 安装依赖
pnpm install
```

### 开发

```bash
# 开发模式
pnpm run dev

# 构建
pnpm run build

# 测试
pnpm run test

# 代码检查
pnpm run lint

# 类型检查
pnpm run typecheck

# 完整检查
pnpm run check
```

## 项目结构

```
ai-typescript-starter/
├── .claude/              # Claude Code 配置
│   ├── commands/         # Slash 命令
│   └── skills/           # 技能定义
├── .github/              # GitHub 配置
│   ├── workflows/        # CI/CD 工作流
│   └── ISSUE_TEMPLATE/   # Issue 模板
├── docs/                 # 文档
├── examples/             # 示例代码
├── src/                  # 源代码
│   └── __tests__/        # 测试文件
├── AGENTS.md             # AI Agent 配置
└── dist/                 # 构建产物
```

## 可用脚本

| 命令 | 说明 |
|------|------|
| `pnpm run build` | 构建项目 |
| `pnpm run dev` | 开发模式 (watch) |
| `pnpm run test` | 运行测试 |
| `pnpm run test:watch` | 测试监听模式 |
| `pnpm run test:coverage` | 测试覆盖率报告 |
| `pnpm run lint` | 代码检查 |
| `pnpm run lint:fix` | 自动修复代码问题 |
| `pnpm run format` | 格式化代码 |
| `pnpm run typecheck` | TypeScript 类型检查 |
| `pnpm run check` | 完整检查 (typecheck + lint) |
| `pnpm run check:fix` | 检查并修复 |
| `pnpm run spellcheck` | 拼写检查 |
| `pnpm run release` | 创建发布 |
| `pnpm run release:beta` | 发布 beta 预发布版本 |
| `pnpm run release:dry` | 发布干运行 (不实际发布) |
| `pnpm run release:patch` | 直接发布 patch 版本 |
| `pnpm run release:minor` | 直接发布 minor 版本 |
| `pnpm run release:major` | 直接发布 major 版本 |

## AI 辅助开发

本项目专为 AI 辅助开发设计，内置了完善的 AI 工程约束：

### CLAUDE.md

为 Claude Code 提供项目上下文和开发规范。

### .claude/ 目录

- `commands/` - 自定义 Slash 命令 (`/build`, `/test`, `/lint`, `/typecheck`, `/spellcheck`, `/release`, `/commit-push-pr`)
- `skills/` - 项目技能定义 (`resolve-git-conflicts`, `fix-audit`, `project-context`, `update-readme`)

## 代码风格

- 2 空格缩进
- 单引号
- 必须有分号
- 行宽 100 字符
- 禁止 `any` 类型 (warn)

## 测试规范

- 测试文件放在 `src/__tests__/` 目录
- 测试覆盖率阈值: 80%
- 使用 Vitest 全局 API

## 发布流程

本项目使用 [release-it](https://github.com/release-it/release-it) 进行版本管理：

```bash
pnpm run release
```

发布过程会自动：
1. 更新版本号
2. 更新 CHANGELOG.md
3. 创建 Git tag
4. 推送到远程仓库
5. 创建 GitHub Release

## 文档

- [架构文档](docs/architecture.md)
- [API 文档](docs/api.md)
- [贡献指南](docs/contributing.md)

## 许可证

[MIT](LICENSE) © 2026 shenjingnan