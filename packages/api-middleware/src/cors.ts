import { ALLOWED_ORIGINS } from '@bmi/shared';

export function getCorsHeaders(
  request: Request,
  allowedOriginsOverride?: string
): Record<string, string> {
  const origin = request.headers.get('Origin');
  let origins = ALLOWED_ORIGINS;

  if (allowedOriginsOverride) {
    origins = allowedOriginsOverride.split(',').map((o) => o.trim());
  }

  const isAllowed = origin && origins.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : origins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-BMI-Signature, X-BMI-Event, X-CSRF-Token, X-Admin-Setup-Key',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

export function withCors(response: Response, request: Request, allowedOriginsOverride?: string): Response {
  const corsHeaders = getCorsHeaders(request, allowedOriginsOverride);
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    newHeaders.set(key, value);
  }
  newHeaders.set('X-Frame-Options', 'DENY');
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  newHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  newHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  newHeaders.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://api.resend.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  return new Response(response.body, { status: response.status, headers: newHeaders });
}
