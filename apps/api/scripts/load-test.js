import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Load pre-seeded credentials from fixture file created by generate-seed.cjs
const users = new SharedArray('users', function () {
  return JSON.parse(open('./test-users.json'));
});

export const options = {
  stages: [
    { duration: '30s', target: 30 },   // Ramp up to 30 users
    { duration: '30s', target: 100 },  // Ramp up to 100 users
    { duration: '60s', target: 100 },  // Sustain at 100 concurrent users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    // Free tier targets: p(95) < 500ms, error rate < 1%
    http_req_duration: ['p(95)<500'],
    http_req_failed:   ['rate<0.01'],
  },
};

const BASE_URL = __ENV.STAGING_URL || 'http://127.0.0.1:8787';

export default function () {
  // Each VU picks a stable user from the fixture pool
  const user = users[__VU % users.length];

  // ── Step 1: Login ─────────────────────────────────────────────────────────
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const loginOk = check(loginRes, {
    'login 200': (r) => r.status === 200,
  });

  if (!loginOk) return; // abort iteration if login failed

  // Extract the JWT from the Set-Cookie header (bmi_token=<jwt>; ...)
  // The cookie has the Secure flag so browsers won't send it back over plain HTTP.
  // The auth middleware also accepts Authorization: Bearer, so we use that instead.
  // See: packages/api-middleware/src/auth.ts -> requireAuth()
  const setCookie = loginRes.headers['set-cookie'] || '';
  const tokenMatch = setCookie.match(/bmi_token=([^;]+)/);
  const jwt = tokenMatch ? tokenMatch[1] : '';

  const loginHasToken = check(loginRes, {
    'login has token': () => jwt.length > 0,
  });

  if (!loginHasToken) return;

  // The login response body includes the CSRF token
  let csrfToken = '';
  try {
    const loginBody = loginRes.json();
    if (loginBody && loginBody.data && loginBody.data.csrf_token) {
      csrfToken = loginBody.data.csrf_token;
    }
  } catch (e) {}

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwt}`,
    'X-CSRF-Token': csrfToken,
    'Cookie': `csrf_token=${csrfToken}`,
  };

  sleep(0.5);

  // ── Step 2: Programs listing (Cache API hit after first request) ───────────
  const programsRes = http.get(`${BASE_URL}/api/public/programs`);
  check(programsRes, { 'programs 200': (r) => r.status === 200 });

  sleep(0.5);

  // ── Step 3: Auto-save draft ────────────────────────────────────────────────
  const draftRes = http.patch(
    `${BASE_URL}/api/applications/draft`,
    JSON.stringify({
      current_step: 2,
      application_data: {
        program: 'BA in Biblical Studies',
        degree_level: 'undergraduate',
        prior_education: 'High school diploma from Test High School.',
        personal_statement:
          'This is my personal statement for the load test application. ' +
          'It comfortably meets the 100-character minimum required by the Zod schema.',
      },
    }),
    { headers: authHeaders }
  );
  check(draftRes, { 'draft 200': (r) => r.status === 200 });

  sleep(0.5);

  // ── Step 4: Submit final application ──────────────────────────────────────
  const submitRes = http.post(
    `${BASE_URL}/api/applications`,
    JSON.stringify({
      program: 'BA in Biblical Studies',
      degree_level: 'undergraduate',
      personal_statement:
        'This is my personal statement for the load test application. ' +
        'It comfortably meets the 100-character minimum required by the Zod schema.',
      prior_education: 'High school diploma from Test High School.',
    }),
    { headers: authHeaders }
  );
  check(submitRes, { 'submit 200': (r) => r.status === 200 });

  sleep(1);
}
