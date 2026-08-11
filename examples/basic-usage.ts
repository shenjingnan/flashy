/**
 * 基本使用示例
 * 演示 ai-typescript-starter 的基本功能
 */

import { createConfig, greet } from '../src/index';

// 示例 1: 使用 greet 函数
console.log('=== Greet 示例 ===');
console.log(greet('World'));
console.log(greet('TypeScript'));
console.log(greet('AI Native Development'));

// 示例 2: 创建默认配置
console.log('\n=== 默认配置 ===');
const defaultConfig = createConfig();
console.log('Debug:', defaultConfig.debug);
console.log('Log Level:', defaultConfig.logLevel);
console.log('Created At:', defaultConfig.createdAt.toISOString());

// 示例 3: 创建自定义配置
console.log('\n=== 自定义配置 ===');
const customConfig = createConfig({
  debug: true,
  logLevel: 'debug',
});
console.log('Debug:', customConfig.debug);
console.log('Log Level:', customConfig.logLevel);

// 示例 4: 部分配置
console.log('\n=== 部分配置 ===');
const partialConfig = createConfig({ logLevel: 'warn' });
console.log('Debug:', partialConfig.debug); // false (默认值)
console.log('Log Level:', partialConfig.logLevel); // 'warn'
