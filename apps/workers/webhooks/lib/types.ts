export interface Env {
  DB: D1Database;
  WEBHOOK_SECRET?: string;
  WEBHOOK_URL?: string;
  OPS_ALERT_EMAIL?: string;
  RESEND_API_KEY?: string;
  JWT_SECRET: string;
}

export function ok(data: any): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function error(message: string, status = 400): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
