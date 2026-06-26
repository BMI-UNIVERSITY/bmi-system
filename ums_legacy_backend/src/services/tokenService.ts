import { SignJWT, jwtVerify } from 'jose';
import { CONFIG } from '../config/index.js';

const ACCESS_SECRET = new TextEncoder().encode(CONFIG.JWT_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(CONFIG.REFRESH_SECRET);

export interface TokenPayload {
  sub: string;
  role: string;
  email: string;
}

export const tokenService = {
  async generateAccessToken(payload: TokenPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(CONFIG.JWT_ACCESS_EXPIRES_IN)
      .sign(ACCESS_SECRET);
  },

  async generateRefreshToken(payload: TokenPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(CONFIG.JWT_REFRESH_EXPIRES_IN)
      .sign(REFRESH_SECRET);
  },

  async verifyAccessToken(token: string): Promise<TokenPayload | null> {
    try {
      const { payload } = await jwtVerify(token, ACCESS_SECRET);
      return payload as unknown as TokenPayload;
    } catch (error) {
      return null;
    }
  },

  async verifyRefreshToken(token: string): Promise<TokenPayload | null> {
    try {
      const { payload } = await jwtVerify(token, REFRESH_SECRET);
      return payload as unknown as TokenPayload;
    } catch (error) {
      return null;
    }
  },
};





