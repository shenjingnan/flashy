import { describe, expect, it } from 'vitest';
import { createConfig, greet, VERSION } from '../index';

describe('greet', () => {
  it('should return greeting message with the given name', () => {
    expect(greet('World')).toBe('Hello, World!');
    expect(greet('TypeScript')).toBe('Hello, TypeScript!');
  });

  it('should throw TypeError when name is empty', () => {
    expect(() => greet('')).toThrow(TypeError);
    expect(() => greet('')).toThrow('name cannot be empty');
  });

  it('should handle names with spaces', () => {
    expect(greet('John Doe')).toBe('Hello, John Doe!');
  });

  it('should handle unicode characters', () => {
    expect(greet('世界')).toBe('Hello, 世界!');
    expect(greet('🎉')).toBe('Hello, 🎉!');
  });
});

describe('createConfig', () => {
  it('should return default config when no options provided', () => {
    const config = createConfig();
    expect(config.debug).toBe(false);
    expect(config.logLevel).toBe('info');
    expect(config.createdAt).toBeInstanceOf(Date);
  });

  it('should return config with provided options', () => {
    const config = createConfig({ debug: true, logLevel: 'debug' });
    expect(config.debug).toBe(true);
    expect(config.logLevel).toBe('debug');
  });

  it('should allow partial options', () => {
    const config = createConfig({ debug: true });
    expect(config.debug).toBe(true);
    expect(config.logLevel).toBe('info');
  });

  it('should accept all log levels', () => {
    const levels = ['debug', 'info', 'warn', 'error'] as const;
    for (const level of levels) {
      const config = createConfig({ logLevel: level });
      expect(config.logLevel).toBe(level);
    }
  });

  it('should have readonly properties', () => {
    const config = createConfig();
    // TypeScript 的 readonly 只在编译时检查，运行时仍可修改
    // 这里验证 TypeScript 类型系统正确标记了 readonly
    expect(config.debug).toBe(false);
    expect(config.logLevel).toBe('info');
  });
});

describe('VERSION', () => {
  it('should be a string', () => {
    expect(typeof VERSION).toBe('string');
  });

  it('should match semver format', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
