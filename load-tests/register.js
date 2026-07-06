import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuid } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  stages: [
    { duration: '10s', target: 50 }, // Ramp up to 50 concurrent VUs over 10 seconds
    { duration: '30s', target: 50 }, // Hold 50 VUs for 30 seconds
    { duration: '10s', target: 0 },  // Ramp down to 0
  ],
  thresholds: {
    // 95% of requests must complete below 1.5s
    http_req_duration: ['p(95)<1500'],
    // Less than 1% of requests should fail (e.g. SQLITE_BUSY or 500s)
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Use a local or staging URL via environment variable: k6 run -e TARGET_URL=http://localhost:8787 ...
  const url = __ENV.TARGET_URL || 'http://localhost:8787/api/auth/register';

  const payload = JSON.stringify({
    email: `test-${uuid.v4()}@example.com`,
    password: 'SecurePassword123!',
    first_name: 'Test',
    last_name: 'User',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 200 or 202': (r) => r.status === 200 || r.status === 202,
    'no SQLITE_BUSY error': (r) => {
      // Even if it failed, ensure it wasn't a DB lock issue
      if (r.status >= 500) {
        return r.body.indexOf('SQLITE_BUSY') === -1;
      }
      return true;
    },
  });

  // Short sleep to simulate real-world pacing between iterations per VU
  sleep(1);
}
