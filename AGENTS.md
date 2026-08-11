# CLAUDE.md - AI 原生 TypeScript 启动模板

本文档为 Claude Code 提供项目上下文和开发规范。

## 项目概述

**ai-typescript-starter** 是一个 AI 原生的 TypeScript 启动模板，专为 AI 辅助开发时代打造。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| TypeScript | 5.x | 编程语言 |
| Node.js | 24+ | 运行时 |
| pnpm | 10.x | 包管理器 |
| tsdown | 0.x | 构建工具 |
| Vitest | 2.x | 测试框架 |
| Biome | 1.x | Linter + Formatter |
| cspell | 8.x | 拼写检查 |
| release-it | 17.x | 发布工具 |

## 快速命令参考

```bash
# 开发
pnpm run dev          # 开发模式 (watch)
pnpm run build        # 构建项目

# 测试
pnpm run test         # 运行测试
pnpm run test:watch   # 测试监听模式
pnpm run test:coverage # 覆盖率报告

# 代码质量
pnpm run lint         # 代码检查
pnpm run lint:fix     # 自动修复
pnpm run format       # 格式化代码
pnpm run typecheck    # 类型检查
pnpm run check        # 完整检查

# 发布
pnpm run release      # 创建发布
```

## 代码风格规范

### 基本规则

- **缩进**: 2 空格
- **引号**: 单引号
- **分号**: 必须有
- **行宽**: 最大 100 字符
- **尾随逗号**: ES5 标准

### TypeScript 规范

- 严格模式开启
- 禁止 `any` 类型 (warn)
- 显式定义公共函数返回类型
- 使用 `const` 优先，`let` 仅在必要时使用
- 使用可选链 (`?.`) 和空值合并 (`??`)

### 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 文件 | kebab-case | `my-module.ts` |
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
- 集成测试: `tests/**/*.test.ts` (如存在)

### 测试覆盖率

- 阈值: 80%
- 报告格式: text, json, html

### 测试命名

```typescript
describe('MyModule', () => {
  describe('myFunction', () => {
    it('should return correct value when input is valid', () => {
      // ...
    });

    it('should throw error when input is invalid', () => {
      // ...
    });
  });
});
```

## 关键规则

1. **提交前检查**: 确保所有测试通过，代码检查无错误
2. **类型安全**: 避免使用 `any`，优先使用具体类型或泛型
3. **文档更新**: 新功能需更新相关文档
4. **测试覆盖**: 新代码需要有对应的测试
5. **中文优先**: 所有文档、commit 信息、PR 信息、注释等有必要的场景优先使用中文

## 可用 Slash Commands

| 命令 | 说明 |
|------|------|
| `/build` | 构建项目 |
| `/test` | 运行测试 |
| `/lint` | 代码检查 |
| `/release` | 创建发布 |

## 常见问题

### 如何添加新功能？

1. 创建功能分支: `git checkout -b feature/my-feature`
2. 实现功能代码
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
