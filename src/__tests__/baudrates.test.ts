import { describe, expect, it } from 'vitest';
import {
  AUTO_BAUD_CANDIDATES,
  BAUD_RATES,
  DEFAULT_BAUD_RATE,
  isBaudRate,
  parseBaudRate,
} from '../core/baudrates';

describe('BAUD_RATES', () => {
  it('should contain the preset rates in descending order', () => {
    expect(BAUD_RATES).toEqual([1500000, 921600, 460800, 230400, 115200]);
  });
});

describe('AUTO_BAUD_CANDIDATES', () => {
  it('should prefer the highest rate first for auto mode', () => {
    expect(AUTO_BAUD_CANDIDATES[0]).toBe(1500000);
    expect(AUTO_BAUD_CANDIDATES[AUTO_BAUD_CANDIDATES.length - 1]).toBe(115200);
  });
});

describe('isBaudRate', () => {
  it('should return true for supported rates', () => {
    expect(isBaudRate(1500000)).toBe(true);
    expect(isBaudRate(115200)).toBe(true);
    expect(isBaudRate(921600)).toBe(true);
  });

  it('should return false for unsupported values', () => {
    expect(isBaudRate(9600)).toBe(false);
    expect(isBaudRate(115200.5)).toBe(false);
    expect(isBaudRate('115200')).toBe(false);
    expect(isBaudRate(null)).toBe(false);
    expect(isBaudRate(undefined)).toBe(false);
  });
});

describe('parseBaudRate', () => {
  it('should parse supported number rates', () => {
    expect(parseBaudRate(115200)).toBe(115200);
    expect(parseBaudRate(921600)).toBe(921600);
    expect(parseBaudRate(1500000)).toBe(1500000);
  });

  it('should parse supported numeric string rates', () => {
    expect(parseBaudRate('460800')).toBe(460800);
  });

  it('should fall back for unsupported values', () => {
    expect(parseBaudRate(9600)).toBe(DEFAULT_BAUD_RATE);
    expect(parseBaudRate('abc')).toBe(DEFAULT_BAUD_RATE);
    expect(parseBaudRate(0)).toBe(DEFAULT_BAUD_RATE);
    expect(parseBaudRate(undefined)).toBe(DEFAULT_BAUD_RATE);
  });

  it('should respect a custom fallback', () => {
    expect(parseBaudRate(9600, 921600)).toBe(921600);
  });
});
