import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BUILTIN_FIRMWARES,
  type BuiltinFirmware,
  loadBuiltinFirmware,
} from '../core/builtinFirmwares';

/** 用一个解析好的 Response 替换全局 fetch。 */
function stubFetchResponse(response: Response): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(() => Promise.resolve(response));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BUILTIN_FIRMWARES', () => {
  it('should contain at least the two known firmwares', () => {
    expect(BUILTIN_FIRMWARES.length).toBeGreaterThanOrEqual(2);
  });

  it('should have non-empty metadata and valid urls for every entry', () => {
    for (const fw of BUILTIN_FIRMWARES) {
      expect(fw.id.trim()).not.toBe('');
      expect(fw.name.trim()).not.toBe('');
      expect(fw.url.endsWith('.bin')).toBe(true);
      expect(fw.defaultAddress).toBeGreaterThanOrEqual(0);
    }
  });

  it('should keep ids globally unique (list keys must not collide)', () => {
    const ids = BUILTIN_FIRMWARES.map((fw: BuiltinFirmware) => fw.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('loadBuiltinFirmware', () => {
  it('should resolve the fetched bytes as a Uint8Array', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 255]);
    const fetchMock = stubFetchResponse(new Response(bytes.buffer));
    const data = await loadBuiltinFirmware('./firmware.bin');
    expect(data).toBeInstanceOf(Uint8Array);
    expect(Array.from(data)).toEqual(Array.from(bytes));
    expect(fetchMock).toHaveBeenCalledWith('./firmware.bin');
  });

  it('should reject on non-ok http status with the status code', async () => {
    stubFetchResponse(new Response(new ArrayBuffer(0), { status: 404, statusText: 'Not Found' }));
    await expect(loadBuiltinFirmware('./missing.bin')).rejects.toThrow(/404/);
  });

  it('should reject when the network request itself fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
    );
    await expect(loadBuiltinFirmware('./firmware.bin')).rejects.toThrow('Failed to fetch');
  });

  it('should reject an empty response body', async () => {
    stubFetchResponse(new Response(new ArrayBuffer(0)));
    await expect(loadBuiltinFirmware('./empty.bin')).rejects.toThrow(/空/);
  });
});
