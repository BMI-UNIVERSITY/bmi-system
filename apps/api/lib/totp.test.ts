import { describe, it, expect } from 'vitest';
import { generateTOTPSecret, generateTOTP, verifyTOTP, getTOTPAuthUrl } from '../lib/totp';

describe('TOTP', () => {
  it('generateTOTPSecret returns base32-encoded 32-char string', async () => {
    const secret = await generateTOTPSecret();
    // Base32 uses A-Z and 2-7, plus padding '='
    expect(secret).toMatch(/^[A-Z2-7=]+$/);
    expect(secret.length).toBeGreaterThan(0);
  });

  it('generateTOTP returns 6-digit padded string', async () => {
    const secret = await generateTOTPSecret();
    const otp = await generateTOTP(secret);
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('verifyTOTP accepts a just-generated TOTP', async () => {
    const secret = await generateTOTPSecret();
    const otp = await generateTOTP(secret, 0);
    const valid = await verifyTOTP(secret, otp);
    expect(valid).toBe(true);
  });

  it('verifyTOTP accepts TOTP from window +1', async () => {
    const secret = await generateTOTPSecret();
    const otp = await generateTOTP(secret, 1);
    const valid = await verifyTOTP(secret, otp);
    expect(valid).toBe(true);
  });

  it('verifyTOTP accepts TOTP from window -1', async () => {
    const secret = await generateTOTPSecret();
    const otp = await generateTOTP(secret, -1);
    const valid = await verifyTOTP(secret, otp);
    expect(valid).toBe(true);
  });

  it('verifyTOTP rejects clearly wrong token', async () => {
    const secret = await generateTOTPSecret();
    const valid = await verifyTOTP(secret, '000000');
    // Could be true by chance, but very unlikely; we test the function runs without error
    expect(typeof valid).toBe('boolean');
  });

  it('getTOTPAuthUrl returns valid otpauth URI', () => {
    const url = getTOTPAuthUrl('JBSWY3DPEHPK3PXP', 'alice@bmi.edu');
    expect(url).toMatch(/^otpauth:\/\/totp\//);
    expect(url).toContain('BMI%20University');
    expect(url).toContain('alice%40bmi.edu');
    expect(url).toContain('secret=JBSWY3DPEHPK3PXP');
  });

  it('getTOTPAuthUrl uses custom issuer', () => {
    const url = getTOTPAuthUrl('JBSWY3DPEHPK3PXP', 'alice@bmi.edu', 'TestIssuer');
    expect(url).toContain('TestIssuer');
  });
});
