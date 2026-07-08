// One-shot Cloudflare Worker script to re-hash and update the admin password
// Usage: npx wrangler deploy --config wrangler-reset-admin.jsonc (then visit /__reset-admin)
// IMPORTANT: Delete this script immediately after use.

import { hashPassword } from './lib/jwt';

export default {
  async fetch(request: Request, env: Record<string, any>): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/__bmi-reset-admin') {
      return new Response('Not found', { status: 404 });
    }

    // Only respond to requests with the setup key in the header
    const key = request.headers.get('X-Admin-Setup-Key');
    if (!key || key !== env.ADMIN_SETUP_KEY) {
      return new Response('Unauthorized', { status: 401 });
    }

    const password = url.searchParams.get('pw');
    if (!password) {
      return new Response('Missing pw param', { status: 400 });
    }

    const hash = await hashPassword(password, env.PASSWORD_PEPPER);

    // Update the admin user password hash in D1
    await env.DB.prepare(
      `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE email = 'bmiuniversity8@gmail.com' AND role = 'admin'`
    ).bind(hash).run();

    // Verify the update
    const user = await env.DB.prepare(
      `SELECT id, email, role, is_verified FROM users WHERE email = 'bmiuniversity8@gmail.com'`
    ).first();

    return new Response(JSON.stringify({ message: 'Admin password updated', user, newHash: hash.substring(0, 30) + '...' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
