# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do Not Open a Public Issue

Please **do not** open a public GitHub issue for security vulnerabilities.

### 2. Report Privately

Send an email to: **security@bmi.edu**

> **Note for self-hosters:** Replace `security@bmi.edu` with your institution's
> designated security email address before deployment. Do not use a personal
> email address for a system handling student PII.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### 3. Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 1-7 days
  - High: 7-14 days
  - Medium: 14-30 days
  - Low: 30-90 days

### 4. Disclosure Policy

- We will acknowledge your report within 48 hours
- We will provide regular updates on our progress
- We will notify you when the vulnerability is fixed
- We will credit you in the security advisory (unless you prefer to remain anonymous)

## Security Best Practices

### For Deployment

1. **Change Default Credentials**
   - Generate strong JWT secrets
   - Use unique encryption keys
   - Change default admin passwords

2. **Use HTTPS**
   - Always use TLS/SSL in production
   - Configure Caddy for automatic HTTPS

3. **Environment Variables**
   - Never commit `.env` files
   - Use strong, random secrets
   - Rotate keys regularly

4. **Database Security**
   - Regular backups
   - Restrict database access
   - Use PocketBase admin rules

5. **Network Security**
   - Use firewall rules
   - Limit exposed ports
   - Use reverse proxy (Caddy)

6. **Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Apply patches promptly

### For Development

1. **Never Commit Secrets**
   - Use `.env` files (gitignored)
   - Use `.env.example` for templates
   - Review commits before pushing

2. **Input Validation**
   - Validate all user inputs
   - Sanitize data before storage
   - Use parameterized queries

3. **Authentication**
   - Use JWT tokens properly
   - Implement session timeouts
   - Use secure password hashing

4. **Authorization**
   - Implement role-based access control
   - Verify permissions on every request
   - Use principle of least privilege

## Known Security Features

- ✅ JWT-based authentication
- ✅ Role-based access control (RBAC)
- ✅ Password hashing (via PocketBase)
- ✅ Session timeout warnings
- ✅ Audit logging
- ✅ Content Security Policy headers
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Input validation
- ✅ SQL injection prevention (ORM)

## Security Checklist for Self-Hosting

- [ ] Changed all default passwords
- [ ] Generated unique JWT_SECRET
- [ ] Generated unique ENCRYPTION_KEY
- [ ] Configured HTTPS/TLS
- [ ] Set up firewall rules
- [ ] Configured backup strategy
- [ ] Reviewed PocketBase admin rules
- [ ] Set up monitoring/logging
- [ ] Configured rate limiting
- [ ] Reviewed CORS settings

## Third-Party Dependencies

We use automated tools to monitor dependencies:
- Regular `npm audit` checks
- Dependabot alerts (GitHub)
- Manual security reviews

## Contact

For security concerns: security@bmi.edu
> Replace with your institution's designated security contact before deployment.

For general questions: Open a GitHub issue
