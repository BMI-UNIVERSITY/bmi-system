export type UserRole = 'admin' | 'registrar' | 'faculty' | 'student' | 'staff' | 'viewer';

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  type?: "access" | "refresh" | "mfa";
  iat: number;
  exp: number;
  id?: string;
  studentId?: string;
  staffId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
