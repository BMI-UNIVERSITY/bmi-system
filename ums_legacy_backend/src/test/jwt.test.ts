import { describe, it, expect } from 'vitest';

const validateBearer = (header: string): boolean => {
  if (!header) return false;
  return /^Bearer\s[\w-]+\.[\w-]+\.[\w-]+$/.test(header);
};

describe('JWT backend tests', () => {
  it('no auth header rejected', () => {
    expect(validateBearer('')).toBe(false);
  });

  it('malformed bearer rejected', () => {
    expect(validateBearer('Bearer invalid')).toBe(false);
  });

  it('valid bearer format accepted', () => {
    expect(validateBearer('Bearer a.b.c')).toBe(true);
  });
});





