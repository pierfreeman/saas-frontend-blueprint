import { describe, expect, it } from 'vitest';
import { SaasTheme } from './saas-theme';

describe('SaasTheme', () => {
  it('is defined', () => {
    expect(SaasTheme).toBeDefined();
  });

  it('applies indigo primary palette', () => {
    expect(SaasTheme.semantic.primary[500]).toBe('{indigo.500}');
  });

  it('applies zinc surface palette', () => {
    expect(SaasTheme.semantic.colorScheme.light.surface[500]).toBe(
      '{zinc.500}',
    );
  });
});
