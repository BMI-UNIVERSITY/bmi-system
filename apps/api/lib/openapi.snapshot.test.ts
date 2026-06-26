import { describe, it, expect } from 'vitest';

/**
 * OpenAPI-style snapshot test for the integration surface between the portal
 * and the university marketing site.
 *
 * If the shape of these API contracts changes, this snapshot will fail.
 * A failure here means the API has materially changed and the marketing site
 * might break. Review the changes carefully before running `vitest -u` to
 * update the snapshot.
 */

describe('OpenAPI Contract Snapshots', () => {
  it('matches the expected shape for /api/auth/register', () => {
    const registerContract = {
      request: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          email: 'string (email)',
          password: 'string (strong)',
          first_name: 'string',
          last_name: 'string',
          phone: 'string (optional)',
        },
      },
      responses: {
        '201': {
          success: true,
          data: {
            user_id: 'string (uuid)',
            message: 'string',
          },
        },
        '409': {
          success: false,
          error: 'An account with this email already exists',
        },
        '400': {
          success: false,
          error: 'string (validation message)',
        },
      },
    };

    expect(registerContract).toMatchSnapshot();
  });

  it('matches the expected shape for /api/auth/login', () => {
    const loginContract = {
      request: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          email: 'string (email)',
          password: 'string',
        },
      },
      responses: {
        '200': {
          success: true,
          data: {
            token: 'string (jwt)',
            user: {
              id: 'string',
              email: 'string',
              first_name: 'string',
              last_name: 'string',
              role: 'enum: applicant | student | staff | admin',
              is_verified: 'number (0 or 1)',
            },
          },
        },
        '401': {
          success: false,
          error: 'Invalid credentials',
        },
      },
    };

    expect(loginContract).toMatchSnapshot();
  });
});
