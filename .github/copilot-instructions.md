# GitHub Copilot 指南

本文件为 GitHub Copilot 在此 TypeScript 项目中工作时提供指导。

## 项目概述

**ai-typescript-starter** 是一个 AI 原生的 TypeScript 启动模板，专为 AI 辅助开发时代打造。

## 代码风格规范

- 使用 2 空格缩进
- 字符串使用单引号
- 必须使用分号
- 最大行宽：100 字符
- 避免 `any` 类型 - 使用具体类型或泛型
- 使用 `const` 声明不变的变量，仅在必要时使用 `let`

## 命名约定

- **文件**：使用 kebab-case 命名（例如 `my-module.ts`）
- **类**：使用 PascalCase（例如 `MyClass`）
- **函数/变量**：使用 camelCase（例如 `myFunction`）
- **常量**：真正的常量使用 SCREAMING_SNAKE_CASE（例如 `MAX_RETRY_COUNT`）
- **类型/接口**：使用 PascalCase（例如 `UserConfig`）

## TypeScript 最佳实践

- 开启严格模式
- 为公共函数定义显式返回类型
- 对象结构使用接口
- 联合类型、交叉类型和工具类型使用类型别名
- 对于真正未知的类型，优先使用 `unknown` 而非 `any`
- 使用可选链（`?.`）和空值合并（`??`）

## 测试规范

- 在 `__tests__` 目录或相邻的 `.test.ts` 文件中编写测试
- 使用 Vitest 进行测试
- 测试覆盖率达到 80%
- 测试边界情况和错误条件
- 使用描述性的测试名称

## 可用脚本

```bash
pnpm run build      # 构建项目
pnpm run dev        # 开发模式（监听文件变化）
pnpm run test       # 运行测试
pnpm run lint       # 代码检查
pnpm run typecheck  # 类型检查
pnpm run check      # 完整检查（类型检查 + 代码检查）
```

## 提交信息格式

遵循 Conventional Commits 规范：

- `feat:` - 新功能
- `fix:` - Bug 修复
- `docs:` - 仅文档变更
- `style:` - 代码风格变更（格式化等）
- `refactor:` - 代码重构
- `perf:` - 性能优化
- `test:` - 新增或更新测试
- `chore:` - 构建维护任务

## 项目结构

```
src/
├── index.ts          # 主入口
├── [module].ts       # 功能模块
└── __tests__/        # 测试文件
    └── [module].test.ts
```
