/**
 * BMI UMS — Helpers Utility Tests
 *
 * Covers:
 * - sanitizeString: prevents XSS by HTML-encoding dangerous characters
 * - sanitizeFilter: strips quote characters unsafe for PocketBase filter expressions
 * - generateCertificateSerial: correct format and zero-padding
 * - calculateGPAClass: boundary conditions
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeFilter,
  generateCertificateSerial,
  calculateGPAClass,
} from './helpers.js';

describe('sanitizeString', () => {
  it('encodes < and > angle brackets', () => {
    expect(sanitizeString('<script>')).toBe('&lt;script&gt;');
    // forward-slash is also encoded, so </script> -> &lt;&#x2F;script&gt;
    expect(sanitizeString('</script>')).toBe('&lt;&#x2F;script&gt;');
  });

  it('encodes & ampersand', () => {
    expect(sanitizeString('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('encodes double-quote characters', () => {
    expect(sanitizeString('"quoted"')).toBe('&quot;quoted&quot;');
  });

  it('encodes single-quote characters', () => {
    expect(sanitizeString("it's fine")).toBe('it&#x27;s fine');
  });

  it('encodes forward-slash characters', () => {
    // / becomes &#x2F;
    expect(sanitizeString('a/b')).toBe('a&#x2F;b');
  });

  it('handles a full XSS payload', () => {
    const xss = '<img src=x onerror="alert(\'XSS\')" />';
    const sanitized = sanitizeString(xss);
    expect(sanitized).not.toContain('<');
    expect(sanitized).not.toContain('>');
    expect(sanitized).not.toContain('"');
    expect(sanitized).not.toContain("'");
  });

  it('leaves plain alphanumeric strings unchanged', () => {
    expect(sanitizeString('John Doe 123')).toBe('John Doe 123');
  });

  it('is idempotent for safe strings', () => {
    const safe = 'BMI University';
    expect(sanitizeString(safe)).toBe(safe);
  });
});

describe('sanitizeFilter', () => {
  it('strips double-quote characters', () => {
    expect(sanitizeFilter('say "hello"')).toBe('say hello');
  });

  it('strips single-quote characters', () => {
    expect(sanitizeFilter("it's")).toBe('its');
  });

  it('strips backslash characters', () => {
    expect(sanitizeFilter('path\\to\\file')).toBe('pathtofile');
  });

  it('truncates to maxLength', () => {
    const long = 'a'.repeat(200);
    expect(sanitizeFilter(long).length).toBe(100);
  });

  it('accepts custom maxLength', () => {
    expect(sanitizeFilter('abc', 2)).toBe('ab');
  });

  it('leaves safe filter expressions intact', () => {
    expect(sanitizeFilter('status=Active')).toBe('status=Active');
  });
});

describe('generateCertificateSerial', () => {
  it('returns format BMI-YYYY-NNNNNN', () => {
    expect(generateCertificateSerial(2024, 1)).toBe('BMI-2024-000001');
    expect(generateCertificateSerial(2024, 999999)).toBe('BMI-2024-999999');
  });

  it('pads sequence to 6 digits', () => {
    expect(generateCertificateSerial(2025, 42)).toBe('BMI-2025-000042');
  });
});

describe('calculateGPAClass', () => {
  it('returns First Class Honours for GPA >= 3.7', () => {
    expect(calculateGPAClass(3.7)).toBe('First Class Honours');
    expect(calculateGPAClass(4.0)).toBe('First Class Honours');
  });

  it('returns Second Class Honours (Upper) for 3.3 <= GPA < 3.7', () => {
    expect(calculateGPAClass(3.3)).toBe('Second Class Honours (Upper Division)');
    expect(calculateGPAClass(3.69)).toBe('Second Class Honours (Upper Division)');
  });

  it('returns Second Class Honours (Lower) for 3.0 <= GPA < 3.3', () => {
    expect(calculateGPAClass(3.0)).toBe('Second Class Honours (Lower Division)');
    expect(calculateGPAClass(3.29)).toBe('Second Class Honours (Lower Division)');
  });

  it('returns Pass for 2.0 <= GPA < 3.0', () => {
    expect(calculateGPAClass(2.0)).toBe('Pass');
    expect(calculateGPAClass(2.99)).toBe('Pass');
  });

  it('returns Fail for GPA < 2.0', () => {
    expect(calculateGPAClass(0)).toBe('Fail');
    expect(calculateGPAClass(1.99)).toBe('Fail');
  });
});






