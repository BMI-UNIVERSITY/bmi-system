import { describe, it, expect } from 'vitest';
import {
  PORTAL_URL,
  MARKETING_URL,
  MARKETING_URL_WWW,
  ALLOWED_ORIGINS,
  ADMISSIONS_EMAIL,
} from '../src/domains.js';

describe('@bmi/shared — domains', () => {
  it('PORTAL_URL is the expected production URL', () => {
    expect(PORTAL_URL).toBe('https://bmi-portal.hkmministries.org');
  });

  it('MARKETING_URL is the expected production URL', () => {
    expect(MARKETING_URL).toBe('https://hkmministries.org');
  });

  it('MARKETING_URL_WWW includes www prefix', () => {
    expect(MARKETING_URL_WWW).toBe('https://www.hkmministries.org');
  });

  it('ADMISSIONS_EMAIL is a valid email address', () => {
    expect(ADMISSIONS_EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('ALLOWED_ORIGINS includes all expected origins', () => {
    expect(ALLOWED_ORIGINS).toContain('https://hkmministries.org');
    expect(ALLOWED_ORIGINS).toContain('https://www.hkmministries.org');
    expect(ALLOWED_ORIGINS).toContain('https://bmi-portal.hkmministries.org');
    expect(ALLOWED_ORIGINS).toContain('https://bmi-portal.pages.dev');
    expect(ALLOWED_ORIGINS).toContain('http://localhost:5173');
    expect(ALLOWED_ORIGINS).toContain('http://localhost:3000');
  });

  it('ALLOWED_ORIGINS has no duplicates', () => {
    const unique = new Set(ALLOWED_ORIGINS);
    expect(unique.size).toBe(ALLOWED_ORIGINS.length);
  });

  it('all ALLOWED_ORIGINS start with http:// or https://', () => {
    for (const origin of ALLOWED_ORIGINS) {
      expect(origin).toMatch(/^https?:\/\//);
    }
  });

  it('snapshot — allowed origins list has not changed (domain drift guard)', () => {
    expect(ALLOWED_ORIGINS).toMatchSnapshot();
  });
});
