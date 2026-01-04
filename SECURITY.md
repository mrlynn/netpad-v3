# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 3.x.x   | :white_check_mark: |
| < 3.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to:

**security@netpad.io**

### What to Include

Please include as much of the following information as possible:

- Type of vulnerability (e.g., SQL injection, XSS, authentication bypass)
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 5 business days
- **Resolution Target**: Within 30 days for critical vulnerabilities

### What to Expect

1. **Acknowledgment**: We'll confirm receipt of your report
2. **Assessment**: We'll evaluate the vulnerability and its impact
3. **Updates**: We'll keep you informed of our progress
4. **Resolution**: We'll notify you when the issue is fixed
5. **Credit**: With your permission, we'll acknowledge your contribution

### Safe Harbor

We consider security research conducted in good faith to be protected activity. We will not pursue legal action against researchers who:

- Make a good faith effort to avoid privacy violations, data destruction, and service disruption
- Only interact with accounts they own or have explicit permission to test
- Do not exploit vulnerabilities beyond what is necessary to confirm their existence
- Report vulnerabilities promptly and do not disclose them publicly before we've had a chance to address them

## Security Best Practices for Self-Hosted Instances

If you're self-hosting NetPad, please ensure:

1. **Environment Variables**: Never commit `.env` files or expose secrets
2. **HTTPS**: Always use HTTPS in production
3. **MongoDB Security**: Enable authentication and use TLS for database connections
4. **Session Secrets**: Use strong, randomly generated session secrets (32+ characters)
5. **Vault Keys**: Generate proper encryption keys for the connection vault
6. **Regular Updates**: Keep your instance updated with the latest security patches

## Known Security Features

NetPad includes several security features:

- **Connection Vault**: Encrypted storage for MongoDB credentials
- **Session Management**: Secure, HTTP-only cookies with iron-session
- **Input Validation**: Server-side validation on all API endpoints
- **CSRF Protection**: Built into Next.js
- **Rate Limiting**: API rate limiting to prevent abuse
- **Bot Protection**: Optional CAPTCHA support for form submissions

## Security Updates

Security updates are released as patch versions (e.g., 3.1.1) and announced via:

- GitHub Security Advisories
- Release notes on GitHub
- Email to registered users (for critical vulnerabilities)

---

Thank you for helping keep NetPad and its users safe!
