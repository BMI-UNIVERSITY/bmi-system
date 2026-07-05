// TOTP implementation for Cloudflare Workers
// Based on RFC 6238
import { encodeBase32 } from './base32';

export async function generateTOTPSecret(): Promise<string> {
  const buffer = new Uint8Array(20); // 160 bits for good entropy
  crypto.getRandomValues(buffer);
  return encodeBase32(buffer);
}

export async function generateTOTP(secret: string, window: number = 0): Promise<string> {
  const epochSeconds = Math.floor(Date.now() / 1000);
  const timeStep = 30;
  let time = Math.floor(epochSeconds / timeStep) + window;
  
  const keyBytes = decodeBase32(secret);
  const timeBytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    timeBytes[i] = time & 0xff;
    time = time >> 8;
  }
  
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, timeBytes));
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary = ((hmac[offset] & 0x7f) << 24) |
                 ((hmac[offset + 1] & 0xff) << 16) |
                 ((hmac[offset + 2] & 0xff) << 8) |
                 (hmac[offset + 3] & 0xff);
  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

export async function verifyTOTP(secret: string, token: string): Promise<boolean> {
  for (let window = -1; window <= 1; window++) {
    const expectedToken = await generateTOTP(secret, window);
    if (expectedToken === token) {
      return true;
    }
  }
  return false;
}

export function getTOTPAuthUrl(secret: string, email: string, issuer: string = 'BMI University'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}`;
}

// Base32 decode (simplified)
function decodeBase32(str: string): Uint8Array {
  str = str.toUpperCase().replace(/=+$/, '');
  const charToVal = (char: string) => {
    if (char >= 'A' && char <= 'Z') return char.charCodeAt(0) - 65;
    if (char >= '2' && char <= '7') return char.charCodeAt(0) - 24;
    throw new Error('Invalid base32 character');
  };
  const buffer = new Uint8Array(Math.floor((str.length * 5) / 8));
  let bits = 0;
  let value = 0;
  let index = 0;
  for (let i = 0; i < str.length; i++) {
    value = (value << 5) | charToVal(str[i]);
    bits += 5;
    if (bits >= 8) {
      buffer[index++] = (value >> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }
  return buffer;
}
