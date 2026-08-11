import { describe, expect, it } from 'vitest';
import { parseEspIdfLevel } from '../core/espIdfLog';

describe('parseEspIdfLevel', () => {
  it('should map E prefix to error', () => {
    expect(parseEspIdfLevel('E (257) i2c.master: probe device timeout')).toBe('error');
  });

  it('should map W prefix to warn', () => {
    expect(parseEspIdfLevel('W (300) wifi: Invalid state, result 0xfffffffe')).toBe('warn');
  });

  it('should map I prefix to info', () => {
    expect(parseEspIdfLevel('I (31) boot: ESP-IDF v5.2')).toBe('info');
  });

  it('should map D and V prefixes to debug', () => {
    expect(parseEspIdfLevel('D (100) gpio: GPIO[4]| InputEn: 1')).toBe('debug');
    expect(parseEspIdfLevel('V (200) spi_master: transaction_cb: cbdata=0x0')).toBe('debug');
  });

  it('should treat non-standard lines as info', () => {
    expect(parseEspIdfLevel('31')).toBe('info');
    expect(parseEspIdfLevel('Serial port COM3')).toBe('info');
    expect(parseEspIdfLevel('hello, device log')).toBe('info');
  });
});
