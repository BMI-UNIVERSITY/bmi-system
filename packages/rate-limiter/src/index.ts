export class RateLimiter {
  state: DurableObjectState;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    const ip = url.searchParams.get('ip') || 'unknown';
    const isAuth = url.searchParams.get('auth') === 'true';
    
    // Limits: 50/min unauth, 500/min auth
    const limit = isAuth ? 500 : 50;
    const window = 60; // 60 seconds

    const currentCount = (await this.state.storage.get<number>(ip)) || 0;
    
    if (currentCount >= limit) {
      return new Response(JSON.stringify({ allowed: false, remaining: 0 }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await this.state.storage.put(ip, currentCount + 1);
    
    // Cloudflare DO alarms for expiration
    const alarm = await this.state.storage.getAlarm();
    if (!alarm) {
      await this.state.storage.setAlarm(Date.now() + window * 1000);
    }

    return new Response(JSON.stringify({ allowed: true, remaining: limit - currentCount - 1 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async alarm() {
    await this.state.storage.deleteAll();
  }
}

export async function rateLimitMiddleware(
  request: Request,
  rateLimiterNamespace: DurableObjectNamespace,
  isAuth: boolean = false
): Promise<Response | null> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  
  // Use IP for DO name to distribute across the cluster by IP address
  const id = rateLimiterNamespace.idFromName(ip);
  const stub = rateLimiterNamespace.get(id);

  const url = new URL('http://rate-limiter/check');
  url.searchParams.set('ip', ip);
  url.searchParams.set('auth', isAuth.toString());

  const response = await stub.fetch(url.toString(), {
    method: 'POST'
  });

  if (response.status === 429) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return null;
}
