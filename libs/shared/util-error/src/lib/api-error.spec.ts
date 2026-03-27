import { isApiError } from './api-error';

describe('isApiError()', () => {
  it('returns true for a valid ApiError object', () => {
    expect(isApiError({ status: 400, message: 'Bad Request' })).toBe(true);
  });

  it('returns true when details is included', () => {
    expect(
      isApiError({
        status: 500,
        message: 'Server Error',
        details: { foo: 'bar' },
      }),
    ).toBe(true);
  });

  it('returns false for null', () => {
    expect(isApiError(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isApiError(undefined)).toBe(false);
  });

  it('returns false for a primitive string', () => {
    expect(isApiError('error string')).toBe(false);
  });

  it('returns false for a primitive number', () => {
    expect(isApiError(42)).toBe(false);
  });

  it('returns false when status is missing', () => {
    expect(isApiError({ message: 'Bad Request' })).toBe(false);
  });

  it('returns false when message is missing', () => {
    expect(isApiError({ status: 400 })).toBe(false);
  });

  it('returns false when status is not a number', () => {
    expect(isApiError({ status: '400', message: 'Bad Request' })).toBe(false);
  });

  it('returns false when message is not a string', () => {
    expect(isApiError({ status: 400, message: 123 })).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isApiError({})).toBe(false);
  });
});
