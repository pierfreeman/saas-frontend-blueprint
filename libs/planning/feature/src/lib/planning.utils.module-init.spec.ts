import { describe, it, expect, vi } from 'vitest';

describe('planning.utils module init branches', () => {
  it('falls back to UTC offset when DateTimeFormat throws inside _tzOffset', async () => {
    const originalDateTimeFormat = Intl.DateTimeFormat;
    const originalSupportedValuesOf = Intl.supportedValuesOf;

    try {
      vi.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Intl as any).supportedValuesOf = vi.fn(() => ['Europe/Rome']);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Intl as any).DateTimeFormat = vi.fn(() => {
        throw new Error('format fail');
      });

      const mod = await import('./planning.utils');
      expect(mod.TIMEZONE_OPTIONS).toEqual([
        { label: 'Europe/Rome (UTC)', value: 'Europe/Rome' },
      ]);
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Intl as any).DateTimeFormat = originalDateTimeFormat;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Intl as any).supportedValuesOf = originalSupportedValuesOf;
    }
  });

  it('falls back to UTC option when supportedValuesOf throws', async () => {
    const originalSupportedValuesOf = Intl.supportedValuesOf;

    try {
      vi.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Intl as any).supportedValuesOf = vi.fn(() => {
        throw new Error('not supported');
      });

      const mod = await import('./planning.utils');
      expect(mod.TIMEZONE_OPTIONS).toEqual([
        { label: 'UTC (GMT+0)', value: 'UTC' },
      ]);
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Intl as any).supportedValuesOf = originalSupportedValuesOf;
    }
  });
});
