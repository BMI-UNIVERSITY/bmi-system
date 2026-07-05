import { hashPassword, verifyPassword, signJWT, validatePasswordStrength, isCommonPassword } from '../lib/jwt';
import { ok, error, generateCsrfToken } from '../lib/types';
import { sendEmail } from '../lib/email';
import { getPortalUrl } from '../lib/config';
import { generateTOTPSecret, verifyTOTP, getTOTPAuthUrl } from '../lib/totp';
import { getOAuthConfig, exchangeCodeForToken, getUserInfo, type OAuthProvider } from '../lib/sso';
import type { Env } from '../lib/types';

export async function handleRegister(request: Request, env: Env): Promise<Response> {
  let body: { email: string; password: string; first_name: string; last_name: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }

  const { email, password, first_name, last_name, phone } = body;

  if (!email || !password || !first_name || !last_name) {
    return error('Email, password, first name, and last name are required');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return error('Invalid email address');
  }

  if (email.length > 254) {
    return error('Email address is too long');
  }

  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    return error(strength.errors.join('; '));
  }

  if (isCommonPassword(password)) {
    return error('This password is too common. Please choose a stronger password.');
  }

  const sanitizedName = (name: string) => name.trim().replace(/<[^>]*>/g, '').substring(0, 100);
  const cleanFirstName = sanitizedName(first_name);
  const cleanLastName = sanitizedName(last_name);

  if (!cleanFirstName || !cleanLastName) {
    return error('First and last name are required');
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first();
  if (existing) {
    return error('An account with this email already exists', 409);
  }

  const passwordHash = await hashPassword(password, env.PASSWORD_PEPPER);
  const userId = crypto.randomUUID();
  const isVerified = 0;
  const verificationToken = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, is_verified)
     VALUES (?, ?, ?, ?, ?, ?, 'applicant', ?)`
  ).bind(userId, email.toLowerCase(), passwordHash, cleanFirstName, cleanLastName, phone || null, isVerified).run();

  await env.DB.prepare(
    `INSERT INTO email_verifications (id, user_id, token, expires_at)
     VALUES (?, ?, ?, datetime('now', '+24 hours'))`
  ).bind(crypto.randomUUID(), userId, verificationToken).run();

  if (env.RESEND_API_KEY) {
    const verifyUrl = `${getPortalUrl(env)}/verify?token=${verificationToken}`;
    await sendEmail({
      to: email.toLowerCase(),
      subject: 'BMI University — Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
          <div style="background: #0f172a; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #d4af37; margin: 0; font-size: 24px;">BMI University</h1>
            <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0;">Email Verification</p>
          </div>
          <div style="background: #fff; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #0f172a;">Welcome, ${cleanFirstName}!</h2>
            <p style="color: #475569; line-height: 1.6;">
              Thank you for creating an account at BMI University. Please verify your email address to activate your account.
            </p>
            <div style="margin: 32px 0; text-align: center;">
              <a href="${verifyUrl}"
                 style="display: inline-block; background: #d4af37; color: #0f172a; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #94a3b8; font-size: 13px;">
              Or copy this link into your browser:<br>
              <a href="${verifyUrl}" style="color: #d4af37; word-break: break-all;">${verifyUrl}</a>
            </p>
            <p style="color: #94a3b8; font-size: 13px;">This link expires in 24 hours.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="color: #94a3b8; font-size: 12px;">
              If you did not create this account, you can safely ignore this email.
            </p>
          </div>
        </div>
      `
    }, env.RESEND_API_KEY);
  }

  return ok({ message: 'Account created! Please check your email to verify your account before logging in.' });
}

export async function handleVerifyEmail(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) return error('Verification token is required');

  const verification = await env.DB.prepare(
    `SELECT id, user_id, expires_at, verified_at
     FROM email_verifications WHERE token = ? AND verified_at IS NULL`
  ).bind(token).first<{ id: string; user_id: string; expires_at: string; verified_at: string | null }>();

  if (!verification) return error('Invalid or expired verification token', 404);

  if (new Date(verification.expires_at) < new Date()) {
    return error('Verification token has expired. Please register again.', 410);
  }

  await env.DB.prepare(
    `UPDATE email_verifications SET verified_at = datetime('now') WHERE id = ?`
  ).bind(verification.id).run();

  await env.DB.prepare(
    `UPDATE users SET is_verified = 1, verification_token = NULL, updated_at = datetime('now') WHERE id = ?`
  ).bind(verification.user_id).run();

  return ok({ message: 'Email verified successfully. You can now log in.' });
}

export async function handleResendVerification(request: Request, env: Env): Promise<Response> {
  let body: { email: string };
  try { body = await request.json(); }
  catch { return error('Invalid JSON body'); }

  if (!body.email) return error('Email is required');

  const user = await env.DB.prepare(
    'SELECT id, first_name, is_verified FROM users WHERE email = ?'
  ).bind(body.email.toLowerCase()).first<{ id: string; first_name: string; is_verified: number }>();

  if (!user) return ok({ message: 'If the account exists, a verification email has been sent.' });
  if (user.is_verified) return ok({ message: 'Email is already verified.' });

  const verificationToken = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO email_verifications (id, user_id, token, expires_at)
     VALUES (?, ?, ?, datetime('now', '+24 hours'))`
  ).bind(crypto.randomUUID(), user.id, verificationToken).run();

  await env.DB.prepare(
    `UPDATE users SET verification_token = ? WHERE id = ?`
  ).bind(verificationToken, user.id).run();

  if (env.RESEND_API_KEY) {
    const verifyUrl = `${getPortalUrl(env)}/verify?token=${verificationToken}`;
    await sendEmail({
      to: body.email.toLowerCase(),
      subject: 'BMI University — Verify Your Email Address',
      html: `<p>Click to verify: <a href="${verifyUrl}">${verifyUrl}</a></p>`
    }, env.RESEND_API_KEY);
  }

  return ok({ message: 'Verification email sent.' });
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  let body: { email: string; password: string; mfa_token?: string };
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }

  const { email, password, mfa_token } = body;
  if (!email || !password) {
    return error('Email and password are required');
  }

  const user = await env.DB.prepare(
    'SELECT id, email, password_hash, first_name, last_name, role, is_verified, mfa_secret, mfa_enabled FROM users WHERE email = ?'
  ).bind(email.toLowerCase()).first<{ id: string; email: string; password_hash: string; first_name: string; last_name: string; role: string; is_verified: number; mfa_secret: string | null; mfa_enabled: number }>();

  if (!user) {
    return error('Invalid email or password', 401);
  }

  if (!user.is_verified) {
    return error('Please verify your email address before logging in. Check your inbox for the verification link.', 403);
  }

  const valid = await verifyPassword(password, user.password_hash, env.PASSWORD_PEPPER);
  if (!valid) {
    return error('Invalid email or password', 401);
  }

  if (user.mfa_enabled && user.mfa_secret) {
    if (!mfa_token) {
      return ok({ requires_mfa: true });
    }
    const validMfa = await verifyTOTP(user.mfa_secret, mfa_token);
    if (!validMfa) {
      return error('Invalid MFA token', 401);
    }
  }

  const token = await signJWT({ sub: user.id, email: user.email, role: user.role }, env.JWT_SECRET);
  const csrfToken = generateCsrfToken();

  const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 7 * 1000).toISOString();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET expires_at = excluded.expires_at`
  ).bind(`session:${user.id}`, user.id, expiresAt).run();

  const response = ok({
    csrf_token: csrfToken,
    expires_at: expiresAt,
    user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role, mfa_enabled: user.mfa_enabled === 1 },
  });

  const headers = new Headers(response.headers);
  headers.append('Set-Cookie', `bmi_token=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${60 * 60 * 24 * 7}`);
  headers.append('Set-Cookie', `csrf_token=${csrfToken}; Path=/; Secure; SameSite=None; Max-Age=${60 * 60 * 24 * 7}`);

  return new Response(response.body, {
    status: 200,
    headers,
  });
}
export async function handleRefresh(request: Request, env: Env): Promise<Response> {
  const cookieHeader = request.headers.get('Cookie');
  let token: string | null = null;
  
  if (cookieHeader) {
    const match = cookieHeader.match(/bmi_token=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) {
    return error('No active session', 401);
  }

  const { verifyJWT, signJWT } = await import('../lib/jwt');
  const payload = await verifyJWT(token, env.JWT_SECRET);
  
  if (!payload || !payload.sub) {
    return error('Invalid or expired session', 401);
  }

  // Issue new token and CSRF token
  const newToken = await signJWT({ sub: payload.sub, email: payload.email, role: payload.role }, env.JWT_SECRET);
  const newCsrfToken = generateCsrfToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 7 * 1000).toISOString();

  // Update session expiry in DB
  await env.DB.prepare(
    `UPDATE sessions SET expires_at = ? WHERE id = ?`
  ).bind(expiresAt, `session:${payload.sub}`).run();

  const response = ok({
    csrf_token: newCsrfToken,
    expires_at: expiresAt,
  });

  const headers = new Headers(response.headers);
  headers.append('Set-Cookie', `bmi_token=${newToken}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${60 * 60 * 24 * 7}`);
  headers.append('Set-Cookie', `csrf_token=${newCsrfToken}; Path=/; Secure; SameSite=None; Max-Age=${60 * 60 * 24 * 7}`);

  return new Response(response.body, {
    status: 200,
    headers,
  });
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  const cookieHeader = request.headers.get('Cookie');

  let token: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (cookieHeader) {
    const match = cookieHeader.match(/bmi_token=([^;]+)/);
    if (match) token = match[1];
  }

  if (token) {
    const { verifyJWT } = await import('../lib/jwt');
    const payload = await verifyJWT(token, env.JWT_SECRET);
    if (payload) {
      await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(`session:${payload.sub}`).run();
    }
  }

  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', 'bmi_token=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0');
  headers.append('Set-Cookie', 'csrf_token=; Path=/; Secure; SameSite=None; Max-Age=0');

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers,
  });
}

export async function handleMe(request: Request, env: Env, userId: string): Promise<Response> {
  const user = await env.DB.prepare(
    'SELECT id, email, first_name, last_name, role, created_at, is_verified FROM users WHERE id = ?'
  ).bind(userId).first();

  if (!user) return error('User not found', 404);
  return ok(user);
}

export async function handleForgotPassword(request: Request, env: Env): Promise<Response> {
  let body: { email: string };
  try { body = await request.json(); }
  catch { return error('Invalid JSON body'); }

  if (!body.email) return error('Email is required');

  const user = await env.DB.prepare(
    'SELECT id, first_name FROM users WHERE email = ?'
  ).bind(body.email.toLowerCase()).first<{ id: string; first_name: string }>();

  // Always return 200 to prevent email enumeration
  if (!user) return ok({ message: 'If the account exists, a password reset email has been sent.' });

  const resetToken = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
     VALUES (?, ?, ?, datetime('now', '+1 hour'))`
  ).bind(crypto.randomUUID(), user.id, resetToken).run();

  if (env.RESEND_API_KEY) {
    const resetUrl = `${getPortalUrl(env)}/reset-password?token=${resetToken}`;
    await sendEmail({
      to: body.email.toLowerCase(),
      subject: 'BMI University — Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${user.first_name},</p>
        <p>We received a request to reset your password. Click the link below to proceed:</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#d4af37;color:#0f172a;text-decoration:none;border-radius:6px;font-weight:bold;">Reset Password</a></p>
        <p>Or copy this link: ${resetUrl}</p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, you can ignore this email.</p>
      `
    }, env.RESEND_API_KEY);
  }

  return ok({ message: 'If the account exists, a password reset email has been sent.' });
}

export async function handleResetPassword(request: Request, env: Env): Promise<Response> {
  let body: { token: string; new_password: string };
  try { body = await request.json(); }
  catch { return error('Invalid JSON body'); }

  if (!body.token || !body.new_password) return error('Token and new password are required');

  // Validate password
  const strength = validatePasswordStrength(body.new_password);
  if (!strength.valid) return error(strength.errors.join('; '));
  if (isCommonPassword(body.new_password)) return error('This password is too common. Please choose a stronger password.');

  const resetToken = await env.DB.prepare(
    `SELECT id, user_id, expires_at, used_at
     FROM password_reset_tokens WHERE token = ? AND used_at IS NULL`
  ).bind(body.token).first<{ id: string; user_id: string; expires_at: string; used_at: string | null }>();

  if (!resetToken) return error('Invalid or expired reset token', 404);
  if (new Date(resetToken.expires_at) < new Date()) return error('Reset token has expired', 410);

  // Update password
  const passwordHash = await hashPassword(body.new_password, env.PASSWORD_PEPPER);
  await env.DB.prepare(
    `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(passwordHash, resetToken.user_id).run();

  // Mark token as used
  await env.DB.prepare(
    `UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?`
  ).bind(resetToken.id).run();

  // Invalidate all sessions for this user
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(resetToken.user_id).run();

  return ok({ message: 'Password reset successfully. You can now log in with your new password.' });
}

export async function handleMfaSetup(request: Request, env: Env, userId: string): Promise<Response> {
  const user = await env.DB.prepare('SELECT email, first_name, mfa_secret, mfa_enabled FROM users WHERE id = ?').bind(userId).first<{ email: string; first_name: string; mfa_secret: string | null; mfa_enabled: number }>();
  if (!user) return error('User not found', 404);

  if (user.mfa_enabled) return error('MFA is already enabled', 400);

  // Generate new secret if none exists
  let secret = user.mfa_secret;
  if (!secret) {
    secret = await generateTOTPSecret();
    await env.DB.prepare('UPDATE users SET mfa_secret = ?, updated_at = datetime("now") WHERE id = ?').bind(secret, userId).run();
  }

  const otpAuthUrl = getTOTPAuthUrl(secret, user.email);
  return ok({ secret, otp_auth_url: otpAuthUrl });
}

export async function handleMfaEnable(request: Request, env: Env, userId: string): Promise<Response> {
  let body: { token: string };
  try { body = await request.json(); }
  catch { return error('Invalid JSON body'); }

  if (!body.token) return error('Token is required');

  const user = await env.DB.prepare('SELECT mfa_secret, mfa_enabled FROM users WHERE id = ?').bind(userId).first<{ mfa_secret: string | null; mfa_enabled: number }>();
  if (!user) return error('User not found', 404);
  if (!user.mfa_secret) return error('MFA not set up. Please call /api/auth/mfa/setup first.', 400);
  if (user.mfa_enabled) return error('MFA is already enabled', 400);

  const valid = await verifyTOTP(user.mfa_secret, body.token);
  if (!valid) return error('Invalid token', 400);

  await env.DB.prepare('UPDATE users SET mfa_enabled = 1, updated_at = datetime("now") WHERE id = ?').bind(userId).run();
  return ok({ message: 'MFA enabled successfully' });
}

export async function handleMfaDisable(request: Request, env: Env, userId: string): Promise<Response> {
  let body: { password: string };
  try { body = await request.json(); }
  catch { return error('Invalid JSON body'); }

  if (!body.password) return error('Password is required');

  const user = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(userId).first<{ password_hash: string }>();
  if (!user) return error('User not found', 404);

  const valid = await verifyPassword(body.password, user.password_hash, env.PASSWORD_PEPPER);
  if (!valid) return error('Invalid password', 401);

  await env.DB.prepare('UPDATE users SET mfa_enabled = 0, mfa_secret = NULL, updated_at = datetime("now") WHERE id = ?').bind(userId).run();
  return ok({ message: 'MFA disabled successfully' });
}

export async function handleOAuthLogin(request: Request, env: Env, provider: OAuthProvider): Promise<Response> {
  const config = getOAuthConfig(provider, env);
  if (!config.clientId || !config.clientSecret) {
    return error('Provider not configured', 501);
  }
  const state = crypto.randomUUID();
  const url = new URL(config.authorizationUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('scope', config.scope);
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=600`,
    },
  });
}

export async function handleOAuthCallback(request: Request, env: Env, provider: OAuthProvider): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = request.headers.get('Cookie')?.match(/oauth_state=([^;]+)/)?.[1];

  if (!code || !state || state !== cookieState) {
    return error('Invalid state or code', 400);
  }

  const config = getOAuthConfig(provider, env);
  const accessToken = await exchangeCodeForToken(provider, code, config);
  const userInfo = await getUserInfo(provider, accessToken, config);

  let userId;
  const existingOAuth = await env.DB.prepare(
    'SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_id = ?'
  ).bind(provider, userInfo.id).first<{ user_id: string }>();

  if (existingOAuth) {
    userId = existingOAuth.user_id;
  } else {
    const existingUser = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(userInfo.email).first<{ id: string }>();

    if (existingUser) {
      userId = existingUser.id;
    } else {
      userId = crypto.randomUUID();
      const tempPassword = crypto.randomUUID();
      const passwordHash = await hashPassword(tempPassword, env.PASSWORD_PEPPER);
      
      // DEV_ONLY: force is_verified = 1 (change back to `userInfo.emailVerified ? 1 : 0` to reinstate)
      await env.DB.prepare(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(userId, userInfo.email, passwordHash, userInfo.firstName, userInfo.lastName, 'applicant', 1).run();
    }

    await env.DB.prepare(
      `INSERT INTO oauth_accounts (user_id, provider, provider_id, access_token)
       VALUES (?, ?, ?, ?)`
    ).bind(userId, provider, userInfo.id, accessToken).run();
  }

  const user = await env.DB.prepare(
    'SELECT id, email, first_name, last_name, role, mfa_enabled FROM users WHERE id = ?'
  ).bind(userId).first<{ id: string; email: string; first_name: string; last_name: string; role: string; mfa_enabled: number }>();

  if (!user) {
    return error('User not found', 500);
  }

  if (user.mfa_enabled) {
    return ok({ requires_mfa: true, temp_auth: userId });
  }

  const token = await signJWT({ sub: user.id, email: user.email, role: user.role }, env.JWT_SECRET);
  const csrfToken = generateCsrfToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 7 * 1000).toISOString();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET expires_at = excluded.expires_at`
  ).bind(`session:${user.id}`, user.id, expiresAt).run();
  const baseUrl = getPortalUrl(env);
  
  const headers = new Headers({ Location: `${baseUrl}/dashboard` });
  headers.append('Set-Cookie', `bmi_token=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${60 * 60 * 24 * 7}`);
  headers.append('Set-Cookie', `csrf_token=${csrfToken}; Path=/; Secure; SameSite=None; Max-Age=${60 * 60 * 24 * 7}`);
  headers.append('Set-Cookie', 'oauth_state=; Path=/; Secure; SameSite=None; Max-Age=0');

  return new Response(undefined, {
    status: 302,
    headers,
  });
}
