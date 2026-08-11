# Build Command

构建项目（类型检查 + 生产构建）。

## 执行步骤

1. 运行类型检查: `pnpm run typecheck`
2. 运行构建: `pnpm run build`
3. 验证构建产物存在于 `dist/` 目录

## 构建配置

- 构建工具: Vite
- 入口: `index.html` → `src/main.ts`
- 输出: `dist/` 纯静态文件（可部署到任意静态托管）
- `base: './'` 支持子路径部署（如 GitHub Pages）

## 预期输出

```
dist/
├── index.html
└── assets/
    ├── index-*.js
    └── index-*.css
```
