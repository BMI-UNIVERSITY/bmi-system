import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100, // 100 concurrent users
  duration: '1m', // Run for 1 minute
  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1s
  },
};

// Assuming STAGING_URL is set as an environment variable
// e.g. k6 run -e STAGING_URL=https://bmi-api-staging.bmiuniversity107.workers.dev load-test.js
const BASE_URL = __ENV.STAGING_URL || 'http://127.0.0.1:8787';

export function setup() {
  return {
    // Shared setup data if needed
  };
}

export default function (data) {
  // Generate a random user ID for each VU iteration to simulate different users
  const userId = `k6-user-${__VU}-${__ITER}-${Date.now()}`;
  
  // Create a payload for a draft
  const draftPayload = JSON.stringify({
    current_step: 2,
    application_data: {
      program: 'BS-CS',
      personal_info: {
        first_name: 'Test',
        last_name: 'User'
      }
    }
  });

  const headers = {
    'Content-Type': 'application/json',
    // Mock Authorization if your staging API allows mock tokens, or pass a valid token via __ENV
    'Authorization': `Bearer ${__ENV.TEST_TOKEN || 'test-token'}`,
    // Mock the user sub for the backend if middleware allows it
    'X-Mock-User-Id': userId 
  };

  // 1. Simulate saving a draft
  let res = http.patch(`${BASE_URL}/api/applications/draft`, draftPayload, { headers });
  
  check(res, {
    'draft status is 200': (r) => r.status === 200,
  });

  // Small delay to simulate user typing
  sleep(1);

  // 2. Simulate submitting the final application
  const submitPayload = JSON.stringify({
    program: 'BS-CS',
    degree_level: 'undergraduate',
    personal_statement: 'This is a load test application',
  });

  let submitRes = http.post(`${BASE_URL}/api/applications`, submitPayload, { headers });
  
  check(submitRes, {
    'submit status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
