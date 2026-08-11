# 贡献指南

感谢您考虑为 ai-typescript-starter 做贡献！

## 行为准则

本项目采用贡献者公约作为行为准则。参与本项目即表示您同意遵守其条款。

## 如何贡献

### 报告 Bug

如果您发现了 Bug，请通过 [GitHub Issues](https://github.com/shenjingnan/ai-typescript-starter/issues) 报告。

报告 Bug 时，请包含：

1. **清晰的标题**: 简要描述问题
2. **复现步骤**: 详细说明如何复现
3. **预期行为**: 您期望发生什么
4. **实际行为**: 实际发生了什么
5. **环境信息**: 操作系统、Node.js 版本等

### 建议新功能

我们欢迎新功能建议！请在 Issue 中描述：

1. **功能描述**: 您希望添加什么功能
2. **使用场景**: 为什么需要这个功能
3. **替代方案**: 您考虑过的其他方案

### 提交代码

#### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/shenjingnan/ai-typescript-starter.git
cd ai-typescript-starter

# 安装依赖
pnpm install

# 运行测试
pnpm test

# 运行代码检查
pnpm run check
```

#### 分支策略

- `main` - 主分支，保持稳定
- `feature/*` - 新功能分支
- `fix/*` - Bug 修复分支
- `docs/*` - 文档更新分支

#### 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
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

#### Pull Request 流程

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/my-feature`)
3. 进行更改
4. 确保测试通过 (`pnpm test`)
5. 确保代码检查通过 (`pnpm run check`)
6. 提交更改 (`git commit -m "feat: add my feature"`)
7. 推送分支 (`git push origin feature/my-feature`)
8. 创建 Pull Request

#### PR 检查清单

- [ ] 代码通过所有测试
- [ ] 代码通过 lint 检查
- [ ] 代码通过类型检查
- [ ] 新功能有对应测试
- [ ] 文档已更新（如需要）
- [ ] Commit 消息遵循规范

## 开发指南

### 代码风格

- 2 空格缩进
- 单引号
- 必须有分号
- 行宽 100 字符

### 测试规范

- 测试文件放在 `src/__tests__/` 目录
- 使用 Vitest 全局 API
- 测试覆盖率要求 80%

### 文档规范

- 使用 Markdown 格式
- 代码示例使用代码块
- 更新相关文档

## 发布流程

维护者可以使用以下步骤发布新版本：

```bash
# 确保在 main 分支
git checkout main

# 拉取最新代码
git pull origin main

# 运行发布命令
pnpm run release
```

发布过程会自动：
1. 更新版本号
2. 更新 CHANGELOG.md
3. 创建 Git tag
4. 推送到远程仓库
5. 创建 GitHub Release

## 获取帮助

如果您有任何问题，可以：

- 查看 [文档](../docs/)
- 在 [Discussions](https://github.com/shenjingnan/ai-typescript-starter/discussions) 提问
- 创建 [Issue](https://github.com/shenjingnan/ai-typescript-starter/issues)

## 许可证

通过贡献代码，您同意您的代码将在 MIT 许可证下发布。