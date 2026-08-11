# Changelog

## [0.4.5](https://github.com/shenjingnan/ai-typescript-starter/compare/v0.4.4...v0.4.5) (2026-04-14)

### Bug Fixes

* **commands:** 修复 fix-audit 命令中 pnpm audit 非零退出码问题 ([#48](https://github.com/shenjingnan/ai-typescript-starter/issues/48)) ([f70cd15](https://github.com/shenjingnan/ai-typescript-starter/commit/f70cd15bd99170652614d6a1b9a6a524b89df105))

## [0.4.4](https://github.com/shenjingnan/ai-typescript-starter/compare/v0.4.3...v0.4.4) (2026-04-14)

### Bug Fixes

* **security:** 修复 basic-ftp 高危漏洞并更新 Biome schema ([#47](https://github.com/shenjingnan/ai-typescript-starter/issues/47)) ([59186c0](https://github.com/shenjingnan/ai-typescript-starter/commit/59186c05485bb5e745debe12ed35dd0b3d0985b4))

## [0.4.3](https://github.com/shenjingnan/ai-typescript-starter/compare/v0.4.2...v0.4.3) (2026-04-10)

### Bug Fixes

* **commands:** 修复 increase-coverage 命令的 git diff 用法 ([#44](https://github.com/shenjingnan/ai-typescript-starter/issues/44)) ([f9d8088](https://github.com/shenjingnan/ai-typescript-starter/commit/f9d8088408252c5621111cdf060bf15c3353f09a))

## [0.4.2](https://github.com/shenjingnan/ai-typescript-starter/compare/v0.4.1...v0.4.2) (2026-04-10)

### Documentation

* **skill:** 简化 update-readme skill 注意事项 ([#41](https://github.com/shenjingnan/ai-typescript-starter/issues/41)) ([5a4152b](https://github.com/shenjingnan/ai-typescript-starter/commit/5a4152bfc53af72ae04088ddba347014093fdb4c))
* 同步 README.md 与项目实际状态 ([#42](https://github.com/shenjingnan/ai-typescript-starter/issues/42)) ([02bcccd](https://github.com/shenjingnan/ai-typescript-starter/commit/02bcccd92c686587bae616c96a37fec5dd37125c))

## [0.4.1](https://github.com/shenjingnan/ai-typescript-starter/compare/v0.4.0...v0.4.1) (2026-04-08)

### Documentation

* 清理项目中残留的 tsup 引用，统一替换为 tsdown ([#39](https://github.com/shenjingnan/ai-typescript-starter/issues/39)) ([c101462](https://github.com/shenjingnan/ai-typescript-starter/commit/c10146296ebc60f85ba41560dcac89271f4aeef5))

## [0.4.0](https://github.com/shenjingnan/ai-typescript-starter/compare/v0.3.0...v0.4.0) (2026-04-08)

### Features

* 导出编译时版本号常量 VERSION ([#28](https://github.com/shenjingnan/ai-typescript-starter/issues/28)) ([341f72a](https://github.com/shenjingnan/ai-typescript-starter/commit/341f72ac36e99efeb81f96f8f8bd405ef599bcc6))
* 添加 update-readme skill ([#31](https://github.com/shenjingnan/ai-typescript-starter/issues/31)) ([ec59d8c](https://github.com/shenjingnan/ai-typescript-starter/commit/ec59d8c69b11d0e88cf37c37136e361f726af8b6))
* 添加安全审计技能 fix-audit ([#30](https://github.com/shenjingnan/ai-typescript-starter/issues/30)) ([0212b9f](https://github.com/shenjingnan/ai-typescript-starter/commit/0212b9fbb162947e49ed12b5124ee18eb9bda3a3))

### Bug Fixes

* **deps:** 修复 9 个间接依赖安全漏洞 ([#29](https://github.com/shenjingnan/ai-typescript-starter/issues/29)) ([396c814](https://github.com/shenjingnan/ai-typescript-starter/commit/396c814faa6749326b3aa21c2efc03d48498c265))
* **deps:** 修复安全审计漏洞，升级 vitest 2.x → 3.x ([#38](https://github.com/shenjingnan/ai-typescript-starter/issues/38)) ([931082b](https://github.com/shenjingnan/ai-typescript-starter/commit/931082b0e4f378a7ef1490303b39c67a5e52bf3b))

### Code Refactoring

* dev 脚本改用 tsdown --watch 替代 tsx watch ([#36](https://github.com/shenjingnan/ai-typescript-starter/issues/36)) ([26a41bc](https://github.com/shenjingnan/ai-typescript-starter/commit/26a41bcbb5bce37a7d0eed263f58dccb857c212b))
* 迁移构建工具 tsup → tsdown ([#35](https://github.com/shenjingnan/ai-typescript-starter/issues/35)) ([97140ce](https://github.com/shenjingnan/ai-typescript-starter/commit/97140ce1ecc9e520a9ac1821463458c8b341bf32))

### Documentation

* 添加 spellcheck 和 typecheck 命令 ([#37](https://github.com/shenjingnan/ai-typescript-starter/issues/37)) ([efd04e2](https://github.com/shenjingnan/ai-typescript-starter/commit/efd04e2a788e8b71924eedbe65e5967269ea1175))
* 添加中文优先规则到关键规则 ([#32](https://github.com/shenjingnan/ai-typescript-starter/issues/32)) ([00d4aa4](https://github.com/shenjingnan/ai-typescript-starter/commit/00d4aa4ecc9420029123c15a3f6b2c5804c15bad))

## [0.3.0](https://github.com/shenjingnan/ai-typescript-starter/compare/v0.3.0-beta.1...v0.3.0) (2026-04-03)

## [0.3.0-beta.1](https://github.com/shenjingnan/ai-typescript-starter/compare/v0.3.0-beta.0...v0.3.0-beta.1) (2026-04-03)

### Bug Fixes

* **ci:** 修复发布工作流中的拼写错误 ([#26](https://github.com/shenjingnan/ai-typescript-starter/issues/26)) ([5c12f0d](https://github.com/shenjingnan/ai-typescript-starter/commit/5c12f0dcdee6e292b1bd538d0475894198be2325))

## [0.3.0-beta.0](https://github.com/shenjingnan/ai-typescript-starter/compare/v0.2.0...v0.3.0-beta.0) (2026-04-03)

### Features

* **skills:** 添加 Git 冲突解决技能 ([#20](https://github.com/shenjingnan/ai-typescript-starter/issues/20)) ([a024c42](https://github.com/shenjingnan/ai-typescript-starter/commit/a024c42eb00c0ea240189218aa40490fd90e0579))

### Bug Fixes

* **ci:** 将 GitHub Actions 工作流名称还原为英文并修复文件末尾换行 ([#19](https://github.com/shenjingnan/ai-typescript-starter/issues/19)) ([3b55b47](https://github.com/shenjingnan/ai-typescript-starter/commit/3b55b47df6d38889a87a1aec1e9ae92ad1e921c4))
* 清理 husky pre-commit hook 中的废弃代码 ([#23](https://github.com/shenjingnan/ai-typescript-starter/issues/23)) ([05c7d30](https://github.com/shenjingnan/ai-typescript-starter/commit/05c7d306707d8d74f15c7ef796811e1d8d201c53))

### Code Refactoring

* 整合 AI 配置，统一使用 AGENTS.md ([#22](https://github.com/shenjingnan/ai-typescript-starter/issues/22)) ([b5ea5de](https://github.com/shenjingnan/ai-typescript-starter/commit/b5ea5dea5cafa28718d95e01e1112c7e28a77bb9))

## 0.2.0 (2026-03-29)

### Features

* 初始化 AI 原生 TypeScript 启动模板 ([#1](https://github.com/shenjingnan/ai-typescript-starter/issues/1)) ([94e0755](https://github.com/shenjingnan/ai-typescript-starter/commit/94e075567cf188f9421b5c7327e49917668ef570))

### Documentation

* 将 GitHub Actions 工作流名称翻译为中文 ([#14](https://github.com/shenjingnan/ai-typescript-starter/issues/14)) ([41f20af](https://github.com/shenjingnan/ai-typescript-starter/commit/41f20af0c2fcc088d1b3e45d2bb39a30fc20792b))
* 将 GitHub Copilot 指南翻译为中文 ([#15](https://github.com/shenjingnan/ai-typescript-starter/issues/15)) ([557c4c6](https://github.com/shenjingnan/ai-typescript-starter/commit/557c4c6e61e79ee45a8571a89c5cbb51cf325a26))
* 将 GitHub Issue 模板翻译为中文 ([#13](https://github.com/shenjingnan/ai-typescript-starter/issues/13)) ([2549c70](https://github.com/shenjingnan/ai-typescript-starter/commit/2549c70d3c78af2bf8ab23ecbd7f39d58b7bd361))

### CI/CD

* **deps:** Bump actions/checkout from 4 to 6 ([#4](https://github.com/shenjingnan/ai-typescript-starter/issues/4)) ([a78628e](https://github.com/shenjingnan/ai-typescript-starter/commit/a78628ea133281a9fb4b086cc97a0b5c7bfafbc7))
* **deps:** Bump actions/setup-node from 4 to 6 ([#3](https://github.com/shenjingnan/ai-typescript-starter/issues/3)) ([53dfd3b](https://github.com/shenjingnan/ai-typescript-starter/commit/53dfd3b8f874fa96905c58005c876b447317c621))
* **deps:** Bump codecov/codecov-action from 4 to 6 ([#5](https://github.com/shenjingnan/ai-typescript-starter/issues/5)) ([94b3e22](https://github.com/shenjingnan/ai-typescript-starter/commit/94b3e22324ad632c02768c06316a66856ca2189e))
* **deps:** Bump pnpm/action-setup from 4 to 5 ([#2](https://github.com/shenjingnan/ai-typescript-starter/issues/2)) ([c2000b7](https://github.com/shenjingnan/ai-typescript-starter/commit/c2000b7ca8cc5129b57b15174a40d9701900d311))

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project setup
- TypeScript 5.x configuration
- Vitest testing framework
- Biome linter and formatter
- cspell spell checker
- tsup build configuration
- release-it for version management
- Husky git hooks
- lint-staged configuration
- GitHub Actions CI/CD workflows
- Issue templates (bug report, feature request)
- Dependabot configuration
- GitHub Copilot instructions
- Claude Code integration (.claude directory)
- Documentation (architecture, API, contributing)

## [0.1.0] - 2026-03-26

### Added

- Initial release
- Basic TypeScript project structure
- Build, test, and lint scripts
- CI/CD pipeline
- Documentation

[Unreleased]: https://github.com/shenjingnan/ai-typescript-starter/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/shenjingnan/ai-typescript-starter/releases/tag/v0.1.0
