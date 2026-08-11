import { describe, expect, it } from 'vitest';
import { formatAddress, isValidAddress, MAX_FLASH_ADDRESS, parseAddress } from '../core/address';

describe('parseAddress', () => {
  it('should parse hex address with 0x prefix', () => {
    expect(parseAddress('0x0')).toBe(0);
    expect(parseAddress('0x1000')).toBe(0x1000);
    expect(parseAddress('0x10000')).toBe(0x10000);
  });

  it('should parse uppercase 0X prefix', () => {
    expect(parseAddress('0X1000')).toBe(0x1000);
  });

  it('should parse decimal address', () => {
    expect(parseAddress('4096')).toBe(4096);
    expect(parseAddress('0')).toBe(0);
  });

  it('should trim surrounding whitespace', () => {
    expect(parseAddress('  0x1000  ')).toBe(0x1000);
  });

  it('should reject empty string', () => {
    expect(() => parseAddress('')).toThrow(TypeError);
    expect(() => parseAddress('   ')).toThrow(TypeError);
  });

  it('should reject negative address', () => {
    expect(() => parseAddress('-1')).toThrow(TypeError);
    expect(() => parseAddress('0x-1')).toThrow(TypeError);
  });

  it('should reject decimal values', () => {
    expect(() => parseAddress('1.5')).toThrow(TypeError);
  });

  it('should reject values beyond max flash address', () => {
    expect(() => parseAddress(`0x${MAX_FLASH_ADDRESS.toString(16)}`)).toThrow(TypeError);
    expect(() => parseAddress(String(MAX_FLASH_ADDRESS))).toThrow(TypeError);
  });

  it('should reject malformed hex', () => {
    expect(() => parseAddress('0x')).toThrow(TypeError);
    expect(() => parseAddress('0xzz')).toThrow(TypeError);
  });

  it('should accept the maximum-1 address', () => {
    expect(parseAddress(`0x${(MAX_FLASH_ADDRESS - 1).toString(16)}`)).toBe(MAX_FLASH_ADDRESS - 1);
  });
});

describe('isValidAddress', () => {
  it('should return true for valid addresses', () => {
    expect(isValidAddress('0x0')).toBe(true);
    expect(isValidAddress('0x10000')).toBe(true);
    expect(isValidAddress('4096')).toBe(true);
  });

  it('should return false for invalid addresses', () => {
    expect(isValidAddress('')).toBe(false);
    expect(isValidAddress('-1')).toBe(false);
    expect(isValidAddress('abc')).toBe(false);
    expect(isValidAddress('0xzz')).toBe(false);
    expect(isValidAddress('1.5')).toBe(false);
  });
});

describe('formatAddress', () => {
  it('should format as lowercase hex with 0x prefix', () => {
    expect(formatAddress(0)).toBe('0x0');
    expect(formatAddress(0x1000)).toBe('0x1000');
    expect(formatAddress(0x10000)).toBe('0x10000');
  });
});
