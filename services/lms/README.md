# C2C LMS Service (Moodle Co-Located Engine)

This service provides native, self-hosted course delivery and gap remediation for the Campus-to-Corporate (C2C) platform, unified under `c2c.mytestbed.tech`.

## Architecture & URL Routing

- **Unified Domain:** Served under `https://c2c.mytestbed.tech/lms` (and `/learn` terminal).
- **Zero Database Contamination:** Runs its own isolated PostgreSQL 16 container. Supabase Talia is never touched.
- **Reverse Proxy Routing:**
  - In local development: `next.config.js` proxies `/lms/:path*` to `127.0.0.1:8080`.
  - In deployment: reverse proxy or Cloudflare routes `/lms/*` to this service.

## Running the Service

```bash
cd services/lms
docker compose up -d
```

## Stopping the Service

```bash
cd services/lms
docker compose down
```

## Integration with C2C

1. **Directives Deep-link:** When a student receives an actionable feedback gap in C2C Assessment, clicking it redirects to `https://c2c.mytestbed.tech/learn?topic=...`.
2. **LTI 1.3 Launch:** C2C assessments are launched from Moodle via `https://c2c.mytestbed.tech/api/lti/launch`.
3. **Completion Webhook:** Moodle reports course completions back to `https://c2c.mytestbed.tech/api/webhook/moodle-course-completed`.
