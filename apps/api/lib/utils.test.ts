import { describe, it, expect, vi } from 'vitest';
import { encodeBase32 } from '../lib/base32';
import { generateUID } from '../lib/uid';
import { generateApplicationNumber } from '../lib/app_number';
import { generateRegNo } from '../lib/reg_number';
import { getPortalUrl } from '../lib/config';
import { verifySignature } from '../lib/webhook';

// ─── base32 ───────────────────────────────────────────────────────────────────

describe('encodeBase32', () => {
  it('encodes an empty buffer to empty string', () => {
    expect(encodeBase32(new Uint8Array([]))).toBe('');
  });

  it('encodes known bytes correctly', () => {
    // [0x00] → 'AA======'
    const result = encodeBase32(new Uint8Array([0x00]));
    expect(result).toMatch(/^[A-Z2-7=]+$/);
    expect(result.length % 8).toBe(0);
  });

  it('encodes multiple bytes and produces padded output', () => {
    const bytes = new Uint8Array([102, 111, 111, 98, 97, 114]); // "foobar"
    const result = encodeBase32(bytes);
    expect(result).toBe('MZXW6YTBOI======');
  });

  it('output length is always a multiple of 8', () => {
    for (let len = 1; len <= 10; len++) {
      const bytes = new Uint8Array(len).fill(0xAB);
      const result = encodeBase32(bytes);
      expect(result.length % 8).toBe(0);
    }
  });
});

// ─── uid ──────────────────────────────────────────────────────────────────────

describe('generateUID', () => {
  it('returns BMI prefixed 12-character UID', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ last_serial: 1 }),
      }),
    };
    const uid = await generateUID(db as any);
    expect(uid).toBe('BMI000000001');
    expect(uid).toHaveLength(12);
  });

  it('pads serial to 9 digits', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ last_serial: 999 }),
      }),
    };
    const uid = await generateUID(db as any);
    expect(uid).toBe('BMI000000999');
  });

  it('throws if counter table is uninitialized', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      }),
    };
    await expect(generateUID(db as any)).rejects.toThrow('Failed to generate UID');
  });
});

// ─── app_number ───────────────────────────────────────────────────────────────

describe('generateApplicationNumber', () => {
  it('formats as APP-{YEAR}-{padded serial}', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ last_serial: 1 }),
        }),
      }),
    };
    const result = await generateApplicationNumber(db as any, 2026);
    expect(result).toBe('APP-2026-00001');
  });

  it('pads serial to 5 digits', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ last_serial: 42 }),
        }),
      }),
    };
    const result = await generateApplicationNumber(db as any, 2026);
    expect(result).toBe('APP-2026-00042');
  });

  it('throws if counter fails', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      }),
    };
    await expect(generateApplicationNumber(db as any, 2026)).rejects.toThrow('Failed to generate application number');
  });
});

// ─── reg_number ───────────────────────────────────────────────────────────────

describe('generateRegNo', () => {
  it('generates correct format: BMI/{CAREER}-{CODE}/{SHORT_YEAR}/{SERIAL}', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ last_serial: 1 }),
        }),
      }),
    };
    const result = await generateRegNo(db as any, 'prog-1', 'CS', 2026, 'undergraduate');
    expect(result).toBe('BMI/UNDERGRADUATE-CS/226/001');
  });

  it('shortens year correctly: 2026 → 226', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ last_serial: 5 }),
        }),
      }),
    };
    const result = await generateRegNo(db as any, 'p1', 'MBA', 2027, 'postgraduate');
    expect(result).toContain('/227/');
  });

  it('sanitizes non-alphanumeric characters from career and code', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ last_serial: 1 }),
        }),
      }),
    };
    const result = await generateRegNo(db as any, 'p1', 'B.Sc-Hons!', 2026, 'ug-level');
    // Career "ug-level" → sanitized to "UGLEVEL", code "B.Sc-Hons!" → "BSCHONS"
    expect(result).toMatch(/^BMI\/UGLEVEL-BSCHONS\/226\/001$/);
  });

  it('throws if counter returns null', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      }),
    };
    await expect(generateRegNo(db as any, 'p1', 'CS', 2026, 'ug')).rejects.toThrow('Failed to generate registration number');
  });
});

// ─── config ───────────────────────────────────────────────────────────────────

describe('getPortalUrl', () => {
  it('returns localhost in development', () => {
    const env = { ENVIRONMENT: 'development' } as any;
    expect(getPortalUrl(env)).toBe('http://localhost:5173');
  });

  it('returns production URL in non-development environments', () => {
    const env = { ENVIRONMENT: 'production' } as any;
    const url = getPortalUrl(env);
    expect(url).toMatch(/^https:\/\//);
    expect(url).not.toContain('localhost');
  });
});

// ─── webhook verifySignature ──────────────────────────────────────────────────

describe('verifySignature', () => {
  it('returns true for matching signature', async () => {
    // Generate a real signature to test against
    const payload = JSON.stringify({ id: 'test', type: 'student.created' });
    const secret = 'my-secret-key';

    // Compute expected signature manually
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
    const hexSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

    expect(await verifySignature(payload, hexSig, secret)).toBe(true);
  });

  it('returns false for wrong signature', async () => {
    const result = await verifySignature('payload', 'wrongsig', 'secret');
    expect(result).toBe(false);
  });

  it('returns false when signature length differs', async () => {
    const result = await verifySignature('payload', 'short', 'secret');
    expect(result).toBe(false);
  });
});
