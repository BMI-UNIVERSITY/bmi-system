import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, validatePasswordStrength, isCommonPassword, signJWT, verifyJWT } from './jwt';

describe('JWT and Password Utils', () => {
  describe('validatePasswordStrength', () => {
    it('should reject short passwords', () => {
      const result = validatePasswordStrength('Abc123!');
      expect(result.valid).toBe(false);
    });

    it('should reject passwords without uppercase', () => {
      const result = validatePasswordStrength('password123!');
      expect(result.valid).toBe(false);
    });

    it('should reject passwords without lowercase', () => {
      const result = validatePasswordStrength('PASSWORD123!');
      expect(result.valid).toBe(false);
    });

    it('should reject passwords without numbers', () => {
      const result = validatePasswordStrength('Password!');
      expect(result.valid).toBe(false);
    });

    it('should reject passwords without special characters', () => {
      const result = validatePasswordStrength('Password123');
      expect(result.valid).toBe(false);
    });

    it('should accept valid passwords', () => {
      const result = validatePasswordStrength('Password123!');
      expect(result.valid).toBe(true);
    });
  });

  describe('isCommonPassword', () => {
    it('should detect common passwords', () => {
      expect(isCommonPassword('password')).toBe(true);
      expect(isCommonPassword('Password123')).toBe(true);
    });

    it('should allow non-common passwords', () => {
      expect(isCommonPassword('MySuperSecretPass123!')).toBe(false);
    });
  });

  describe('hashPassword and verifyPassword', async () => {
    it('should hash and verify password correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      expect(hash).not.toEqual(password);
      const isMatch = await verifyPassword(password, hash);
      expect(isMatch).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isMatch = await verifyPassword('WrongPassword123!', hash);
      expect(isMatch).toBe(false);
    });
  });

  describe('signJWT and verifyJWT', async () => {
    it('should sign and verify JWT correctly', async () => {
      const payload = { sub: '123', email: 'test@example.com', role: 'applicant' };
      const secret = 'test-secret';
      const token = await signJWT(payload, secret);
      const verified = await verifyJWT(token, secret);
      expect(verified).toMatchObject(payload);
    });

    it('should reject invalid JWT', async () => {
      const token = 'invalid-token';
      const secret = 'test-secret';
      const verified = await verifyJWT(token, secret);
      expect(verified).toBeNull();
    });

    it('should reject expired JWT', async () => {
      const payload = { sub: '123', email: 'test@example.com', role: 'applicant' };
      const secret = 'test-secret';
      const token = await signJWT(payload, secret, -100);
      const verified = await verifyJWT(token, secret);
      expect(verified).toBeNull();
    });
  });
});
