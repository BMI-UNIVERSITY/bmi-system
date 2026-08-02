const NEON_AUTH_BASE = import.meta.env.VITE_NEON_AUTH_URL ?? '';

export async function signInWithPassword(email: string, password: string) {
  if (!NEON_AUTH_BASE) {
    await new Promise((r) => setTimeout(r, 500));
    if (!email || !password) throw new Error('Email and password required.');
    return {
      access_token: 'admin-mock-jwt',
      user: {
        id: 'admin-123',
        email,
        user_metadata: { full_name: 'System Admin', role: 'admin' },
      },
    };
  }
  const res = await fetch(`${NEON_AUTH_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
}

export function signOut() {
  localStorage.removeItem('bmi_admin_token');
  localStorage.removeItem('bmi_admin_user');
}
