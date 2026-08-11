# API 文档

本文档描述 ai-typescript-starter 的公开 API。

## 概述

ai-typescript-starter 是一个 TypeScript 启动模板，提供了基础的项目结构和配置。

## 导出

### 主入口

```typescript
// 导入主模块
import { greet, createConfig } from 'ai-typescript-starter';
```

## API 参考

### `greet(name: string): string`

向指定名称打招呼。

**参数**:
- `name` - 要打招呼的名称

**返回值**:
- 打招呼的字符串

**示例**:
```typescript
import { greet } from 'ai-typescript-starter';

const message = greet('World');
console.log(message); // "Hello, World!"
```

### `createConfig(options?: ConfigOptions): Config`

创建配置对象。

**参数**:
- `options` - 可选的配置选项

**返回值**:
- 配置对象

**示例**:
```typescript
import { createConfig } from 'ai-typescript-starter';

const config = createConfig({ debug: true });
console.log(config);
```

## 类型定义

### `ConfigOptions`

```typescript
interface ConfigOptions {
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 日志级别 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
```

### `Config`

```typescript
interface Config {
  /** 是否启用调试模式 */
  debug: boolean;
  /** 日志级别 */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** 创建时间 */
  createdAt: Date;
}
```

## 错误处理

当传入无效参数时，函数会抛出 `TypeError`。

```typescript
import { greet } from 'ai-typescript-starter';

try {
  greet(''); // 空字符串会抛出错误
} catch (error) {
  if (error instanceof TypeError) {
    console.error('Invalid argument:', error.message);
  }
}
```

## 版本兼容性

- Node.js >= 24.0.0
- TypeScript >= 5.0.0

## 变更日志

API 变更记录在 [CHANGELOG.md](../CHANGELOG.md) 中。