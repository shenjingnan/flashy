# Project Context Skill

帮助 AI 助手理解项目上下文和结构。

## 项目概述

**ai-typescript-starter** 是一个 AI 原生的 TypeScript 启动模板，专为 AI 辅助开发时代打造。

## 技术栈

| 技术 | 用途 |
|------|------|
| TypeScript 5.x | 编程语言 |
| Node.js 24+ | 运行时 |
| pnpm | 包管理器 |
| tsdown | 构建工具 |
| Vitest | 测试框架 |
| Biome | Linter + Formatter |
| cspell | 拼写检查 |
| release-it | 发布工具 |
| Husky | Git Hooks |
| lint-staged | 暂存区检查 |

## 目录结构

```
ai-typescript-starter/
├── .claude/          # Claude Code 配置
│   ├── commands/     # Slash 命令
│   └── skills/       # 技能定义
├── .github/          # GitHub 配置
│   ├── workflows/    # CI/CD 工作流
│   └── ISSUE_TEMPLATE/
├── docs/             # 文档
├── examples/         # 示例代码
├── src/              # 源代码
│   └── __tests__/    # 测试文件
├── dist/             # 构建产物
└── [配置文件]
```

## 可用脚本

| 命令 | 说明 |
|------|------|
| `pnpm run build` | 构建项目 |
| `pnpm run dev` | 开发模式 |
| `pnpm run test` | 运行测试 |
| `pnpm run lint` | 代码检查 |
| `pnpm run typecheck` | 类型检查 |
| `pnpm run check` | 完整检查 |

## 代码风格

- 2 空格缩进
- 单引号
- 必须有分号
- 行宽 100 字符
- 禁止 `any` 类型（warn）

## 测试规范

- 测试文件放在 `src/__tests__/` 或 `tests/`
- 测试覆盖率阈值: 80%
- 使用 Vitest 全局 API