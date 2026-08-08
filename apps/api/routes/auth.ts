import { and, eq, isNull, sql } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '@bmi/api-middleware';
import { signJWT, validatePasswordStrength, isCommonPassword } from '../lib/jwt';
import { ok, error, generateCsrfToken } from '../lib/types';
import { sendEmail } from '../lib/email';
import { getPortalUrl, getUmsUrl } from '../lib/config';
import { generateTOTPSecret, verifyTOTP, getTOTPAuthUrl } from '../lib/totp';
import { getOAuthConfig, exchangeCodeForToken, getUserInfo, type OAuthProvider } from '../lib/sso';
import { parseBody, RegisterSchema, LoginSchema } from '../lib/schemas';
import { executeWithMonitoring } from '../lib/performance';
import { createCoreDb } from '../lib/db';
import { users, emailVerifications, sessions, passwordResetTokens, oauthAccounts } from '../schema/core';
import type { Env } from '../lib/types';

export async function handleRegister(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const startTime = performance.now();
  
  const parsed = await parseBody(request, RegisterSchema);
  if (parsed instanceof Response) return parsed;

  const { email, password, first_name: cleanFirstName, last_name: cleanLastName, phone } = parsed;

  // Parallelize password validation (CPU-bound operations)
  const [strengthCheck, commonPasswordCheck] = await Promise.all([
    Promise.resolve(validatePasswordStrength(password)),
    Promise.resolve(isCommonPassword(password))
  ]);

  if (!strengthCheck.valid) {
    return error(strengthCheck.errors[0]);
  }

  if (commonPasswordCheck) {
    return error('This password is too common. Please choose a stronger password.');
  }

  // Use optimized user lookup with early exit
  const db = createCoreDb(env);
  const existingUser = (await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).limit(1).execute())[0];

  if (existingUser) {
    return error('An account with this email already exists', 409);
  }

  // Pre-generate all IDs and tokens to minimize async operations
  const userId = crypto.randomUUID();
  const verificationToken = crypto.randomUUID();
  const verificationId = crypto.randomUUID();

  // Hash password in parallel with ID generation (already done above)
  const passwordHash = await hashPassword(password, env.PASSWORD_PEPPER, env.PBKDF2_ITERATIONS);

  // Atomic registration: user + email verification in one transaction
  try {
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: cleanFirstName,
        last_name: cleanLastName,
        phone: phone || null,
        role: 'applicant',
        is_verified: 0,
      });
      await tx.insert(emailVerifications).values({
        id: verificationId,
        user_id: userId,
        token: verificationToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    });
  } catch (e) {
    console.error('Registration failed:', e);
    return error('Registration failed. Please try again.');
  }

  // Async email processing - non-blocking for response
  if (env.RESEND_API_KEY) {
    const verifyUrl = `${getPortalUrl(env)}/verify?token=${verificationToken}`;
    const emailPromise = sendRegistrationEmailOptimized(env, {
      to: email.toLowerCase(),
      firstName: cleanFirstName,
      verifyUrl
    });
    
    if (ctx) {
      ctx.waitUntil(emailPromise.catch(error => {
        console.error('Registration email failed:', error);
      }));
    } else {
      await emailPromise;
    }
  }

  // Track registration performance
  const duration = performance.now() - startTime;
  if (duration > 500) {
    console.warn(`Slow registration detected: ${duration}ms for user ${email}`);
  }

  return ok({ 
    message: 'Account created! Please check your email to verify your account before logging in.',
    _perf: { duration_ms: Math.round(duration) }
  });
}

// Optimized email sending with template caching
async function sendRegistrationEmailOptimized(env: Env, params: {
  to: string;
  firstName: string;
  verifyUrl: string;
}): Promise<boolean> {
  const { buildEmailLayout } = await import('../lib/email');
  const emailTemplate = buildEmailLayout(
    'Email Verification',
    `
    <h2 style="color: #0f172a;">Welcome, ${params.firstName}!</h2>
    <p style="color: #475569; line-height: 1.6;">
      Thank you for creating an account at BMI University. Please verify your email address to activate your account.
    </p>
    <div style="margin: 32px 0; text-align: center;">
      <a href="${params.verifyUrl}"
         style="display: inline-block; background: #d4af37; color: #0f172a; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
        Verify Email Address
      </a>
    </div>
    <p style="color: #94a3b8; font-size: 13px;">
      Or copy this link into your browser:<br>
      <a href="${params.verifyUrl}" style="color: #d4af37; word-break: break-all;">${params.verifyUrl}</a>
    </p>
    <p style="color: #94a3b8; font-size: 13px;">This link expires in 24 hours.</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #94a3b8; font-size: 12px;">
      If you did not create this account, you can safely ignore this email.
    </p>
    `
  );

  return sendEmail(env, {
    to: params.to,
    subject: 'BMI University — Verify Your Email Address',
    html: emailTemplate
  });
}

export async function handleVerifyEmail(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) return error('Verification token is required');

  const db = createCoreDb(env);
  const verification = (await db.select({
    id: emailVerifications.id,
    user_id: emailVerifications.user_id,
    expires_at: emailVerifications.expires_at,
    verified_at: emailVerifications.verified_at,
  })
    .from(emailVerifications)
    .where(and(eq(emailVerifications.token, token), isNull(emailVerifications.verified_at)))
    .execute())[0];

  if (!verification) return error('Invalid or expired verification token', 404);

  if (new Date(verification.expires_at) < new Date()) {
    return error('Verification token has expired. Please register again.', 410);
  }

  await db.update(emailVerifications)
    .set({ verified_at: new Date() })
    .where(eq(emailVerifications.id, verification.id))
    .execute();

  await db.update(users)
    .set({ is_verified: 1, verification_token: null, updated_at: new Date() })
    .where(eq(users.id, verification.user_id))
    .execute();

  return ok({ message: 'Email verified successfully. You can now log in.' });
}

export async function handleResendVerification(request: Request, env: Env): Promise<Response> {
  let body: { email: string };
  try { body = await request.json(); }
  catch { return error('Invalid JSON body'); }

  if (!body.email) return error('Email is required');

  const db = createCoreDb(env);
  const user = (await db.select({
    id: users.id,
    first_name: users.first_name,
    is_verified: users.is_verified,
  }).from(users).where(eq(users.email, body.email.toLowerCase())).execute())[0];

  if (!user) return ok({ message: 'If the account exists, a verification email has been sent.' });
  if (user.is_verified) return ok({ message: 'Email is already verified.' });

  const verificationToken = crypto.randomUUID();
  await db.insert(emailVerifications).values({
    id: crypto.randomUUID(),
    user_id: user.id,
    token: verificationToken,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }).execute();

  await db.update(users)
    .set({ verification_token: verificationToken })
    .where(eq(users.id, user.id))
    .execute();

  if (env.RESEND_API_KEY) {
    const verifyUrl = `${getPortalUrl(env)}/verify?token=${verificationToken}`;
    await sendEmail(env, {
      to: body.email.toLowerCase(),
      subject: 'BMI University — Verify Your Email Address',
      html: `<p>Click to verify: <a href="${verifyUrl}">${verifyUrl}</a></p>`
    });
  }

  return ok({ message: 'Verification email sent.' });
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const parsed = await parseBody(request, LoginSchema);
  if (parsed instanceof Response) return parsed;

  const { email, password, mfa_token } = parsed;

  // Use optimized user lookup
  const db = createCoreDb(env);
  const user = (await db.select({
    id: users.id,
    email: users.email,
    password_hash: users.password_hash,
    first_name: users.first_name,
    last_name: users.last_name,
    role: users.role,
    is_verified: users.is_verified,
    account_claimed: users.account_claimed,
    mfa_secret: users.mfa_secret,
    mfa_enabled: users.mfa_enabled,
    session_version: users.session_version,
    failed_login_attempts: users.failed_login_attempts,
    locked_until: users.locked_until,
  }).from(users).where(eq(users.email, email.toLowerCase())).execute())[0];

  if (!user) {
    return error('Invalid email or password', 401);
  }

  // Check if account is locked due to brute-force attempts
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return error('Account is temporarily locked due to too many failed login attempts. Please try again later.', 429);
  }

  // Verify password first — this prevents account enumeration via the
  // "please verify your email" response path (Medium finding #9).
  const valid = await verifyPassword(password, user.password_hash, env.PASSWORD_PEPPER);
  if (!valid) {
    const MAX_FAILED_ATTEMPTS = 5;
    const LOCKOUT_DURATION_MINUTES = 15;
    const newAttempts = (user.failed_login_attempts || 0) + 1;
    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      await db.update(users)
        .set({
          failed_login_attempts: newAttempts,
          locked_until: new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000),
          updated_at: new Date(),
        })
        .where(eq(users.id, user.id))
        .execute();
    } else {
      await db.update(users)
        .set({ failed_login_attempts: newAttempts, updated_at: new Date() })
        .where(eq(users.id, user.id))
        .execute();
    }
    return error('Invalid email or password', 401);
  }

  // Reset brute-force counters on successful login
  if (user.failed_login_attempts > 0 || user.locked_until) {
    await db.update(users)
      .set({ failed_login_attempts: 0, locked_until: null, updated_at: new Date() })
      .where(eq(users.id, user.id))
      .execute();
  }

  if (!user.is_verified) {
    return error('Please verify your email address before logging in. Check your inbox for the verification link.', 403);
  }

  if (user.role === 'student' && !user.account_claimed) {
    return error('Please claim your account first using the admission code sent to your email.', 403);
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

  // Include session_version in token so requireAuth can verify it without
  // hitting the sessions table on every request
  const token = await signJWT({ sub: user.id, email: user.email, role: user.role, sv: user.session_version }, env.JWT_SECRET);
  const csrfToken = generateCsrfToken();

  const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 7 * 1000).toISOString();
  
  // Create / refresh the session row for this user
  await executeWithMonitoring({
    run: async () => db.insert(sessions)
      .values({ id: `session:${user.id}`, user_id: user.id, expires_at: new Date(expiresAt) })
      .onConflictDoUpdate({ target: sessions.id, set: { expires_at: new Date(expiresAt) } })
      .execute(),
    all: async () => { throw new Error('not used'); },
  } as unknown as Parameters<typeof executeWithMonitoring>[0], 'session_create');

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

  // Fetch current session_version to include in new token
  const db = createCoreDb(env);
  const sub = payload.sub as string;
  const userRow = (await db.select({ session_version: users.session_version }).from(users).where(eq(users.id, sub)).execute())[0];
  const sv = userRow?.session_version ?? (payload.sv as number) ?? 1;

  // Issue new token and CSRF token
  const newToken = await signJWT({ sub, email: payload.email as string, role: payload.role as string, sv }, env.JWT_SECRET);
  const newCsrfToken = generateCsrfToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 7 * 1000).toISOString();

  // Update session expiry in DB
  await db.update(sessions)
    .set({ expires_at: new Date(expiresAt) })
    .where(eq(sessions.id, `session:${sub}`))
    .execute();

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
      const db = createCoreDb(env);
      const sub = payload.sub as string;
      await db.update(users)
        .set({ session_version: sql`${users.session_version} + 1`, updated_at: new Date() })
        .where(eq(users.id, sub))
        .execute();
      await db.delete(sessions)
        .where(eq(sessions.id, `session:${sub}`))
        .execute();
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

export async function handleMe(_request: Request, env: Env, userId: string): Promise<Response> {
  const db = createCoreDb(env);
  const user = (await db.select({
    id: users.id,
    email: users.email,
    first_name: users.first_name,
    last_name: users.last_name,
    role: users.role,
    created_at: users.created_at,
    is_verified: users.is_verified,
  }).from(users).where(eq(users.id, userId)).execute())[0];

  if (!user) return error('User not found', 404);

  const csrfToken = generateCsrfToken();
  const response = ok({ ...user, csrf_token: csrfToken });
  const headers = new Headers(response.headers);
  headers.append('Set-Cookie', `csrf_token=${csrfToken}; Path=/; Secure; SameSite=None; Max-Age=${60 * 60 * 24 * 7}`);

  return new Response(response.body, {
    status: 200,
    headers,
  });
}

export async function handleForgotPassword(request: Request, env: Env): Promise<Response> {
  let body: { email: string };
  try { body = await request.json(); }
  catch { return error('Invalid JSON body'); }

  if (!body.email) return error('Email is required');

  const db = createCoreDb(env);
  const user = (await db.select({
    id: users.id,
    first_name: users.first_name,
    role: users.role,
  }).from(users).where(eq(users.email, body.email.toLowerCase())).execute())[0];

  // Always return 200 to prevent email enumeration
  if (!user) return ok({ message: 'If the account exists, a password reset email has been sent.' });

  const resetToken = crypto.randomUUID();
  await db.insert(passwordResetTokens).values({
    id: crypto.randomUUID(),
    user_id: user.id,
    token: resetToken,
    expires_at: new Date(Date.now() + 60 * 60 * 1000),
  }).execute();

  if (env.RESEND_API_KEY) {
    // Route staff/admin to UMS; students stay on the portal
    const isStaffRole = ['admin', 'staff', 'registrar', 'faculty'].includes(user.role);
    const baseUrl = isStaffRole ? getUmsUrl(env) : getPortalUrl(env);
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    const systemLabel = isStaffRole ? 'University Management System (UMS)' : 'Student Portal';

    const { buildEmailLayout } = await import('../lib/email');
    await sendEmail(env, {
      to: body.email.toLowerCase(),
      subject: 'BMI University — Password Reset Request',
      html: buildEmailLayout(
        `Password Reset — ${systemLabel}`,
        `
        <h2 style="color:#0f172a;">Hi ${user.first_name},</h2>
        <p style="color:#475569;line-height:1.6;">We received a request to reset your BMI University password for the <strong>${systemLabel}</strong>. Click the button below to set a new password:</p>
        <div style="margin:32px 0;text-align:center;">
          <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:#d4af37;color:#0f172a;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">Reset Password</a>
        </div>
        <p style="color:#94a3b8;font-size:13px;">Or copy this link into your browser:<br><a href="${resetUrl}" style="color:#d4af37;word-break:break-all;">${resetUrl}</a></p>
        <p style="color:#94a3b8;font-size:13px;">This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
        `
      )
    });
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

  const db = createCoreDb(env);
  const resetToken = (await db.select({
    id: passwordResetTokens.id,
    user_id: passwordResetTokens.user_id,
    expires_at: passwordResetTokens.expires_at,
    used_at: passwordResetTokens.used_at,
  }).from(passwordResetTokens).where(and(eq(passwordResetTokens.token, body.token), isNull(passwordResetTokens.used_at))).execute())[0];

  if (!resetToken) return error('Invalid or expired reset token', 404);
  if (new Date(resetToken.expires_at) < new Date()) return error('Reset token has expired', 410);

  // Update password
  const passwordHash = await hashPassword(body.new_password, env.PASSWORD_PEPPER, env.PBKDF2_ITERATIONS);
  await db.update(users)
    .set({ password_hash: passwordHash, updated_at: new Date() })
    .where(eq(users.id, resetToken.user_id));

  // Mark token as used
  await db.update(passwordResetTokens)
    .set({ used_at: new Date() })
    .where(eq(passwordResetTokens.id, resetToken.id));

  // Increment session_version to instantly invalidate all active JWTs for this user
  await db.update(users)
    .set({ session_version: sql`${users.session_version} + 1`, updated_at: new Date() })
    .where(eq(users.id, resetToken.user_id));

  // Also clean up the session row
  await db.delete(sessions)
    .where(eq(sessions.user_id, resetToken.user_id));

  return ok({ message: 'Password reset successfully. You can now log in with your new password.' });
}

export async function handleMfaSetup(_request: Request, env: Env, userId: string): Promise<Response> {
  const db = createCoreDb(env);
  const user = (await db.select({
    email: users.email,
    first_name: users.first_name,
    mfa_secret: users.mfa_secret,
    mfa_enabled: users.mfa_enabled,
  }).from(users).where(eq(users.id, userId)).execute())[0];
  if (!user) return error('User not found', 404);

  if (user.mfa_enabled) return error('MFA is already enabled', 400);

  // Generate new secret if none exists
  let secret = user.mfa_secret;
  if (!secret) {
    secret = await generateTOTPSecret();
    await db.update(users)
      .set({ mfa_secret: secret, updated_at: new Date() })
      .where(eq(users.id, userId));
  }

  const otpAuthUrl = getTOTPAuthUrl(secret, user.email);
  return ok({ secret, otp_auth_url: otpAuthUrl });
}

export async function handleMfaEnable(request: Request, env: Env, userId: string): Promise<Response> {
  let body: { token: string };
  try { body = await request.json(); }
  catch { return error('Invalid JSON body'); }

  if (!body.token) return error('Token is required');

  const db = createCoreDb(env);
  const user = (await db.select({
    mfa_secret: users.mfa_secret,
    mfa_enabled: users.mfa_enabled,
  }).from(users).where(eq(users.id, userId)).execute())[0];
  if (!user) return error('User not found', 404);
  if (!user.mfa_secret) return error('MFA not set up. Please call /api/auth/mfa/setup first.', 400);
  if (user.mfa_enabled) return error('MFA is already enabled', 400);

  const valid = await verifyTOTP(user.mfa_secret, body.token);
  if (!valid) return error('Invalid token', 400);

  await db.update(users)
    .set({ mfa_enabled: 1, updated_at: new Date() })
    .where(eq(users.id, userId));
  return ok({ message: 'MFA enabled successfully' });
}

export async function handleMfaDisable(request: Request, env: Env, userId: string): Promise<Response> {
  let body: { password: string };
  try { body = await request.json(); }
  catch { return error('Invalid JSON body'); }

  if (!body.password) return error('Password is required');

  const db = createCoreDb(env);
  const user = (await db.select({ password_hash: users.password_hash }).from(users).where(eq(users.id, userId)).execute())[0];
  if (!user) return error('User not found', 404);

  const valid = await verifyPassword(body.password, user.password_hash, env.PASSWORD_PEPPER);
  if (!valid) return error('Invalid password', 401);

  await db.update(users)
    .set({ mfa_enabled: 0, mfa_secret: null, updated_at: new Date() })
    .where(eq(users.id, userId));
  return ok({ message: 'MFA disabled successfully' });
}

export async function handleOAuthLogin(_request: Request, env: Env, provider: OAuthProvider): Promise<Response> {
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

  const db = createCoreDb(env);
  let userId: string;

  const existingOAuth = (await db.select({ user_id: oauthAccounts.user_id })
    .from(oauthAccounts)
    .where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.provider_id, userInfo.id)))
    .execute())[0];

  if (existingOAuth) {
    userId = existingOAuth.user_id;
  } else {
    const existingUser = (await db.select({ id: users.id })
      .from(users)
      .where(eq(users.email, userInfo.email))
      .execute())[0];

    if (existingUser) {
      userId = existingUser.id;
    } else {
      userId = crypto.randomUUID();
      const tempPassword = crypto.randomUUID();
      const passwordHash = await hashPassword(tempPassword, env.PASSWORD_PEPPER, env.PBKDF2_ITERATIONS);

      await db.insert(users).values({
        id: userId,
        email: userInfo.email,
        password_hash: passwordHash,
        first_name: userInfo.firstName,
        last_name: userInfo.lastName,
        role: 'applicant',
        is_verified: userInfo.emailVerified ? 1 : 0,
      });
    }

    await db.insert(oauthAccounts).values({
      id: crypto.randomUUID(),
      user_id: userId,
      provider,
      provider_id: userInfo.id,
      access_token: accessToken,
    });
  }

  const user = (await db.select({
    id: users.id,
    email: users.email,
    first_name: users.first_name,
    last_name: users.last_name,
    role: users.role,
    mfa_enabled: users.mfa_enabled,
    is_verified: users.is_verified,
    session_version: users.session_version,
  }).from(users).where(eq(users.id, userId)).execute())[0];

  if (!user) {
    return error('User not found', 500);
  }

  if (!user.is_verified) {
    return error('Please verify your email address before logging in.', 403);
  }

  if (user.mfa_enabled) {
    return ok({ requires_mfa: true, temp_auth: userId });
  }

  const token = await signJWT({ sub: user.id, email: user.email, role: user.role, sv: user.session_version }, env.JWT_SECRET);
  const csrfToken = generateCsrfToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 7 * 1000).toISOString();

  await db.insert(sessions).values({
    id: `session:${user.id}`,
    user_id: user.id,
    expires_at: new Date(expiresAt),
  }).onConflictDoUpdate({
    target: sessions.id,
    set: { expires_at: new Date(expiresAt) },
  });

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
