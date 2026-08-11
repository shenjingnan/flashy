# Deploy Command

构建并部署 Flashy 静态站点。

## 执行步骤

1. 确保所有测试通过: `pnpm run test`
2. 确保代码检查通过: `pnpm run check`
3. 确保构建成功: `pnpm run build`
4. 将 `dist/` 部署到静态托管

## 部署说明

- 构建产物 `dist/` 是纯静态文件
- 可部署到 GitHub Pages、Vercel、Cloudflare Pages 等任意静态托管
- **必须使用 HTTPS**：Web Serial API 在非安全上下文中不可用

## 验证

部署后通过 Chrome/Edge 打开页面，确认可正常加载并弹出浏览器串口选择器。
