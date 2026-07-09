import { hashPassword, verifyPassword, signJWT, validatePasswordStrength, isCommonPassword } from '../lib/jwt';
import { ok, error, generateCsrfToken } from '../lib/types';
import { sendEmail } from '../lib/email';
import { getPortalUrl, getUmsUrl } from '../lib/config';
import { generateTOTPSecret, verifyTOTP, getTOTPAuthUrl } from '../lib/totp';
import { getOAuthConfig, exchangeCodeForToken, getUserInfo, type OAuthProvider } from '../lib/sso';
import { parseBody, RegisterSchema, LoginSchema } from '../lib/schemas';
import { executeWithMonitoring, executeBatch } from '../lib/performance';
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
    return error(strengthCheck.errors.join('; '));
  }

  if (commonPasswordCheck) {
    return error('This password is too common. Please choose a stronger password.');
  }

  // Use optimized user lookup with early exit
  const existingUser = await env.PLATFORM_CONTEXT!.db.prepare('SELECT 1 FROM users WHERE email = ? LIMIT 1').bind(email.toLowerCase()).first();
  
  if (existingUser) {
    return error('An account with this email already exists', 409);
  }

  // Pre-generate all IDs and tokens to minimize async operations
  const userId = crypto.randomUUID();
  const verificationToken = crypto.randomUUID();
  const verificationId = crypto.randomUUID();
  
  // Hash password in parallel with ID generation (already done above)
  const passwordHash = await hashPassword(password, env.PASSWORD_PEPPER);
  
  // Use optimized batch operation for registration
  const registrationOps = [
    env.PLATFORM_CONTEXT!.db.prepare(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, is_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'applicant', 0, datetime('now'), datetime('now'))`
    ).bind(userId, email.toLowerCase(), passwordHash, cleanFirstName, cleanLastName, phone || null),
    
    env.PLATFORM_CONTEXT!.db.prepare(
      `INSERT INTO email_verifications (id, user_id, token, expires_at, created_at)
       VALUES (?, ?, ?, datetime('now', '+24 hours'), datetime('now'))`
    ).bind(verificationId, userId, verificationToken)
  ];

  const batchResult = await executeBatch(env.PLATFORM_CONTEXT!.db, registrationOps, 50);
  
  if (!batchResult.success) {
    console.error('Registration batch failed:', batchResult.failures);
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

  const verification = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id, user_id, expires_at, verified_at
     FROM email_verifications WHERE token = ? AND verified_at IS NULL`
  ).bind(token).first<{ id: string; user_id: string; expires_at: string; verified_at: string | null }>();

  if (!verification) return error('Invalid or expired verification token', 404);

  if (new Date(verification.expires_at) < new Date()) {
    return error('Verification token has expired. Please register again.', 410);
  }

  await env.PLATFORM_CONTEXT!.db.prepare(
    `UPDATE email_verifications SET verified_at = datetime('now') WHERE id = ?`
  ).bind(verification.id).run();

  await env.PLATFORM_CONTEXT!.db.prepare(
    `UPDATE users SET is_verified = 1, verification_token = NULL, updated_at = datetime('now') WHERE id = ?`
  ).bind(verification.user_id).run();

  return ok({ message: 'Email verified successfully. You can now log in.' });
}

export async function handleResendVerification(request: Request, env: Env): Promise<Response> {
  let body: { email: string };
  try { body = await request.json(); }
  catch { return error('Invalid JSON body'); }

  if (!body.email) return error('Email is required');

  const user = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT id, first_name, is_verified FROM users WHERE email = ?'
  ).bind(body.email.toLowerCase()).first<{ id: string; first_name: string; is_verified: number }>();

  if (!user) return ok({ message: 'If the account exists, a verification email has been sent.' });
  if (user.is_verified) return ok({ message: 'Email is already verified.' });

  const verificationToken = crypto.randomUUID();
  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO email_verifications (id, user_id, token, expires_at)
     VALUES (?, ?, ?, datetime('now', '+24 hours'))`
  ).bind(crypto.randomUUID(), user.id, verificationToken).run();

  await env.PLATFORM_CONTEXT!.db.prepare(
    `UPDATE users SET verification_token = ? WHERE id = ?`
  ).bind(verificationToken, user.id).run();

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
  interface UserRow { id: string; email: string; password_hash: string; first_name: string; last_name: string; role: string; is_verified: number; mfa_secret: string | null; mfa_enabled: number; session_version: number }
  const user = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT id, email, password_hash, first_name, last_name, role, is_verified, mfa_secret, mfa_enabled, session_version FROM users WHERE email = ? LIMIT 1'
  ).bind(email.toLowerCase()).first<UserRow>();

  if (!user) {
    return error('Invalid email or password', 401);
  }

  // Verify password first — this prevents account enumeration via the
  // "please verify your email" response path (Medium finding #9).
  const valid = await verifyPassword(password, user.password_hash, env.PASSWORD_PEPPER);
  if (!valid) {
    return error('Invalid email or password', 401);
  }

  if (!user.is_verified) {
    return error('Please verify your email address before logging in. Check your inbox for the verification link.', 403);
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
  
  // Use monitored session creation
  await executeWithMonitoring(
    env.PLATFORM_CONTEXT!.db.prepare(
      `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET expires_at = excluded.expires_at`
    ).bind(`session:${user.id}`, user.id, expiresAt),
    'session_create'
  );

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
  await env.PLATFORM_CONTEXT!.db.prepare(
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
      // Increment session_version — this atomically invalidates all existing JWTs
      // for this user. No KV lag, no sessions table scan: every prior token's sv
      // will mismatch the DB value and be rejected immediately.
      await env.PLATFORM_CONTEXT!.db.prepare(
        `UPDATE users SET session_version = session_version + 1, updated_at = datetime('now') WHERE id = ?`
      ).bind(payload.sub).run();
      // Also clean up the sessions table row for this user
      await env.PLATFORM_CONTEXT!.db.prepare('DELETE FROM sessions WHERE id = ?').bind(`session:${payload.sub}`).run();
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
  const user = await env.PLATFORM_CONTEXT!.db.prepare(
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

  // Fetch role alongside name so we can route the reset link correctly:
  // admin / staff / registrar → UMS reset page
  // student / applicant / alumni → Student Portal reset page
  const user = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT id, first_name, role FROM users WHERE email = ?'
  ).bind(body.email.toLowerCase()).first<{ id: string; first_name: string; role: string }>();

  // Always return 200 to prevent email enumeration
  if (!user) return ok({ message: 'If the account exists, a password reset email has been sent.' });

  const resetToken = crypto.randomUUID();
  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
     VALUES (?, ?, ?, datetime('now', '+1 hour'))`
  ).bind(crypto.randomUUID(), user.id, resetToken).run();

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

  const resetToken = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id, user_id, expires_at, used_at
     FROM password_reset_tokens WHERE token = ? AND used_at IS NULL`
  ).bind(body.token).first<{ id: string; user_id: string; expires_at: string; used_at: string | null }>();

  if (!resetToken) return error('Invalid or expired reset token', 404);
  if (new Date(resetToken.expires_at) < new Date()) return error('Reset token has expired', 410);

  // Update password
  const passwordHash = await hashPassword(body.new_password, env.PASSWORD_PEPPER);
  await env.PLATFORM_CONTEXT!.db.prepare(
    `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(passwordHash, resetToken.user_id).run();

  // Mark token as used
  await env.PLATFORM_CONTEXT!.db.prepare(
    `UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?`
  ).bind(resetToken.id).run();

  // Increment session_version to instantly invalidate all active JWTs for this user
  // (eliminates need to enumerate and delete individual session records)
  await env.PLATFORM_CONTEXT!.db.prepare(
    `UPDATE users SET session_version = session_version + 1, updated_at = datetime('now') WHERE id = ?`
  ).bind(resetToken.user_id).run();

  // Also clean up the session row
  await env.PLATFORM_CONTEXT!.db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(resetToken.user_id).run();

  return ok({ message: 'Password reset successfully. You can now log in with your new password.' });
}

export async function handleMfaSetup(request: Request, env: Env, userId: string): Promise<Response> {
  const user = await env.PLATFORM_CONTEXT!.db.prepare('SELECT email, first_name, mfa_secret, mfa_enabled FROM users WHERE id = ?').bind(userId).first<{ email: string; first_name: string; mfa_secret: string | null; mfa_enabled: number }>();
  if (!user) return error('User not found', 404);

  if (user.mfa_enabled) return error('MFA is already enabled', 400);

  // Generate new secret if none exists
  let secret = user.mfa_secret;
  if (!secret) {
    secret = await generateTOTPSecret();
    await env.PLATFORM_CONTEXT!.db.prepare('UPDATE users SET mfa_secret = ?, updated_at = datetime("now") WHERE id = ?').bind(secret, userId).run();
  }

  const otpAuthUrl = getTOTPAuthUrl(secret, user.email);
  return ok({ secret, otp_auth_url: otpAuthUrl });
}

export async function handleMfaEnable(request: Request, env: Env, userId: string): Promise<Response> {
  let body: { token: string };
  try { body = await request.json(); }
  catch { return error('Invalid JSON body'); }

  if (!body.token) return error('Token is required');

  const user = await env.PLATFORM_CONTEXT!.db.prepare('SELECT mfa_secret, mfa_enabled FROM users WHERE id = ?').bind(userId).first<{ mfa_secret: string | null; mfa_enabled: number }>();
  if (!user) return error('User not found', 404);
  if (!user.mfa_secret) return error('MFA not set up. Please call /api/auth/mfa/setup first.', 400);
  if (user.mfa_enabled) return error('MFA is already enabled', 400);

  const valid = await verifyTOTP(user.mfa_secret, body.token);
  if (!valid) return error('Invalid token', 400);

  await env.PLATFORM_CONTEXT!.db.prepare('UPDATE users SET mfa_enabled = 1, updated_at = datetime("now") WHERE id = ?').bind(userId).run();
  return ok({ message: 'MFA enabled successfully' });
}

export async function handleMfaDisable(request: Request, env: Env, userId: string): Promise<Response> {
  let body: { password: string };
  try { body = await request.json(); }
  catch { return error('Invalid JSON body'); }

  if (!body.password) return error('Password is required');

  const user = await env.PLATFORM_CONTEXT!.db.prepare('SELECT password_hash FROM users WHERE id = ?').bind(userId).first<{ password_hash: string }>();
  if (!user) return error('User not found', 404);

  const valid = await verifyPassword(body.password, user.password_hash, env.PASSWORD_PEPPER);
  if (!valid) return error('Invalid password', 401);

  await env.PLATFORM_CONTEXT!.db.prepare('UPDATE users SET mfa_enabled = 0, mfa_secret = NULL, updated_at = datetime("now") WHERE id = ?').bind(userId).run();
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
  const existingOAuth = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_id = ?'
  ).bind(provider, userInfo.id).first<{ user_id: string }>();

  if (existingOAuth) {
    userId = existingOAuth.user_id;
  } else {
    const existingUser = await env.PLATFORM_CONTEXT!.db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(userInfo.email).first<{ id: string }>();

    if (existingUser) {
      userId = existingUser.id;
    } else {
      userId = crypto.randomUUID();
      const tempPassword = crypto.randomUUID();
      const passwordHash = await hashPassword(tempPassword, env.PASSWORD_PEPPER);
      
      await env.PLATFORM_CONTEXT!.db.prepare(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(userId, userInfo.email, passwordHash, userInfo.firstName, userInfo.lastName, 'applicant', userInfo.emailVerified ? 1 : 0).run();
    }

    await env.PLATFORM_CONTEXT!.db.prepare(
      `INSERT INTO oauth_accounts (user_id, provider, provider_id, access_token)
       VALUES (?, ?, ?, ?)`
    ).bind(userId, provider, userInfo.id, accessToken).run();
  }

  const user = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT id, email, first_name, last_name, role, mfa_enabled, is_verified FROM users WHERE id = ?'
  ).bind(userId).first<{ id: string; email: string; first_name: string; last_name: string; role: string; mfa_enabled: number; is_verified: number }>();

  if (!user) {
    return error('User not found', 500);
  }

  if (!user.is_verified) {
    return error('Please verify your email address before logging in.', 403);
  }

  if (user.mfa_enabled) {
    return ok({ requires_mfa: true, temp_auth: userId });
  }

  const token = await signJWT({ sub: user.id, email: user.email, role: user.role }, env.JWT_SECRET);
  const csrfToken = generateCsrfToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 7 * 1000).toISOString();
  await env.PLATFORM_CONTEXT!.db.prepare(
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
