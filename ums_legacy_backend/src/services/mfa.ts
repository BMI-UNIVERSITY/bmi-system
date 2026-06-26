import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { generateSecret, generateURI, verifySync } = require("otplib");
import QRCode from "qrcode";
import { logger } from "../utils/logger.js";

/**
 * MFA Service
 * Handles TOTP generation, verification and QR code generation
 */
export const MfaService = {
  /**
   * Generate a new TOTP secret
   */
  generateSecret(): string {
    return generateSecret();
  },

  /**
   * Generate an OTPAuth URL for QR code
   */
  generateOtpAuthUrl(email: string, secret: string): string {
    return generateURI({ secret, label: email, issuer: "BMI University" });
  },

  /**
   * Generate a QR code DataURL for the secret
   */
  async generateQrCode(otpAuthUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(otpAuthUrl);
    } catch (error) {
      logger.error({ err: error }, "Failed to generate MFA QR code");
      throw new Error("Failed to generate QR code");
    }
  },

  /**
   * Verify a TOTP token against a secret
   */
  verifyToken(token: string, secret: string): boolean {
    try {
      return verifySync({ token, secret }).valid;
    } catch (error) {
      logger.error({ err: error }, "MFA verification error");
      return false;
    }
  },

  /**
   * Generate recovery codes
   */
  generateRecoveryCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // 10-character random alphanumeric code
      codes.push(Math.random().toString(36).substring(2, 12).toUpperCase());
    }
    return codes;
  },
};






