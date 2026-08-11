# Typecheck Command

运行类型检查。

## 执行步骤

1. 运行类型检查: `pnpm run typecheck`

## 配置

- 工具: TypeScript 编译器 (tsc)
- 模式: --noEmit（仅检查，不输出文件）
- 配置文件: tsconfig.json

## 快捷命令

```bash
# 类型检查
pnpm run typecheck

# 完整检查（包含类型检查）
pnpm run check

# 检查并修复（包含类型检查）
pnpm run check:fix
```
