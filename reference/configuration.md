# Configuration Reference

This page is the reference for backend **environment variables** (read from
`app/config.py`, documented in `.env.example`). It is the tuning surface for
local development, cloud-test and production.

::: tip Where to find the live list
The canonical list lives in the repo at `.env.example` and in the
`Settings` class in `app/config.py`. This page summarizes the groups and
highlights the ones you will actually change.
:::

## Core service

| Variable | Default | Meaning |
| --- | --- | --- |
| `ENVIRONMENT` | `development` | Runtime environment (refuses dangerous settings in production) |
| `APP_VERSION` | `development` | Version label (SAE sets it to the full Git SHA) |
| `DATABASE_URL` | `postgresql+asyncpg://...` | Async PostgreSQL URL |
| `DATABASE_POOL_SIZE` / `DATABASE_MAX_OVERFLOW` | 10 / 5 | DB pool sizing |
| `DATABASE_AUTO_CREATE` | `false` | Auto-create schema (dev only) |
| `REDIS_URL` | `redis://redis:6379/0` | Redis URL |
| `JOB_TTL_SECONDS` | 86400 | ARQ job result retention |
| `WORKER_JOB_COMPLETION_WAIT_SECONDS` | 270 | Graceful shutdown drain window |
| `ACCOUNT_DEACTIVATION_GRACE_DAYS` | 7 | Deactivation → anonymization grace |
| `MAX_UPLOAD_BYTES` / `MAX_REQUEST_BYTES` / `MAX_IMAGE_PIXELS` | 20 MiB / 22 MiB / 40M | Input limits |

## Auth & security

| Variable | Default | Meaning |
| --- | --- | --- |
| `JWT_SECRET` | — | Signing secret (≥32 random bytes in production) |
| `ACCESS_TOKEN_SECONDS` | 900 | Access-token lifetime |
| `REFRESH_TOKEN_SECONDS` | 2592000 (30 d) | Refresh-token lifetime |
| `REPORT_VIEW_TOKEN_SECONDS` | 300 | Report view-token lifetime |
| `AUTH_RATE_LIMIT_ATTEMPTS` / `WINDOW_SECONDS` | 10 / 300 | Login brute-force protection |
| `ADMIN_SESSION_SECRET`, `ADMIN_SESSION_HTTPS_ONLY`, `ADMIN_PHONE`, `ADMIN_PASSWORD` | — | Admin site auth |
| `CONFIG_ENCRYPTION_KEY` | — | Encrypts admin-saved provider keys |

## Rate limits & backpressure

| Variable | Default | Meaning |
| --- | --- | --- |
| `MAX_CONCURRENT_REQUESTS_PER_PROCESS` | 100 | Async backpressure cap |
| `REGISTRATION_CONCURRENT_REQUESTS_PER_PROCESS` | 20 | Registration concurrency |
| `DESIGN_RATE_LIMIT_JOBS` / `WINDOW_SECONDS` | 20 / 3600 | Per-user hourly design submissions |
| `MAX_ACTIVE_DESIGN_JOBS_PER_USER` | 5 | Concurrent active jobs per user |
| `ASSET_UPLOAD_INTENT_RATE_LIMIT_*` / `ASSET_UPLOAD_COMPLETION_RATE_LIMIT_*` | — | Upload intent/completion rate limits |

## Tokens & entitlements

| Variable | Default | Meaning |
| --- | --- | --- |
| `INITIAL_USER_TOKENS` | 100 | Starter token grant (set 0 in production unless intended) |
| `INITIAL_USER_ALLOWED_WORKSPACES` | 2 | Owned workspaces allowed per new user |
| `SEED_DEMO_BILLING_CATALOG` | `true` | Seed demo prices locally |
| `ENTERPRISE_INVITATION_HOURS` | 72 | Invitation expiry |

## Storage (S3-compatible)

| Variable | Default | Meaning |
| --- | --- | --- |
| `STORAGE_BACKEND` | `s3` | Storage backend |
| `S3_BUCKET` | — | Bucket name |
| `S3_REGION` | — | Region (e.g. `cn-chengdu`) |
| `S3_ENDPOINT` | — | Server-side endpoint (internal OSS endpoint in cloud) |
| `S3_PRESIGN_ENDPOINT` | — | Public browser-reachable endpoint in presigned URLs |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | — | Credentials |
| `S3_SIGNATURE_VERSION` | `s3` | `s3v4` for AWS/MinIO; `s3` for Aliyun OSS compat |
| `S3_PRESIGN_SECONDS` / `S3_UPLOAD_FORM_SECONDS` | 3600 / 900 | URL/form lifetimes |
| `S3_SERVER_SIDE_ENCRYPTION` | `AES256` | SSE |
| `S3_FORCE_PATH_STYLE` | `false` | Path-style addressing |
| `ASSET_TEMPORARY_RETENTION_SECONDS` | 259200 | Temp input retention |

## AI provider

| Variable | Default | Meaning |
| --- | --- | --- |
| `PROVIDER_ADAPTER` | `generic_async` | Adapter (`generic_async` / `seedream`) |
| `PROVIDER_BASE_URL` | mock | Provider base URL |
| `PROVIDER_MODEL` | — | Model id (e.g. Seedream) |
| `PROVIDER_IMAGE_SIZE` / `PROVIDER_OUTPUT_FORMAT` / `PROVIDER_WATERMARK` | 1.5K / jpeg / false | Generation params |
| `PROVIDER_SUBMIT_PATH` / `PROVIDER_STATUS_PATH` | — | REST paths |
| `PROVIDER_API_KEY` | — | Provider key (admin-saved values override) |
| `PROVIDER_OUTPUT_HOSTS` | — | **Anti-SSRF** allow-list of result hosts |
| `PROVIDER_REQUEST_TIMEOUT_SECONDS` / `POLL_INTERVAL_SECONDS` / `MAX_WAIT_SECONDS` / `MAX_RETRIES` | 300 / 10 / 900 / 4 | Timeout & retry policy |
| `PROVIDER_HTTP_MAX_CONNECTIONS` / `KEEPALIVE_*` | 20 / 10 / 30 | httpx client sizing |

## WeChat & payment

| Variable | Default | Meaning |
| --- | --- | --- |
| `WECHAT_PAY_MODE` | `mock` | `disabled` / `mock` / `live` |
| `WECHAT_APP_ID` / `WECHAT_MINI_PROGRAM_APP_SECRET` | mock | Mini-program identity |
| `WECHAT_CODE_TO_SESSION_URL` / `STABLE_ACCESS_TOKEN_URL` / `PHONE_NUMBER_URL` | mock endpoints | WeChat API URLs |
| `MOCK_WECHAT_IDENTITY_ENDPOINTS_ENABLED` | `true` | Use mock identity |
| `WECHAT_PAY_MERCHANT_ID` / `API_V3_KEY` / `MERCHANT_SERIAL` / `MERCHANT_PRIVATE_KEY(_FILE)` / `PUBLIC_KEY_ID` / `PUBLIC_KEY(_FILE)` | mock | Merchant keys (real in production; keys via Docker secrets) |
| `WECHAT_PAYMENT_NOTIFY_URL` | — | Notify callback URL |
| `WECHAT_PAYMENT_EXPIRE_SECONDS` / `CLOSE_GRACE_SECONDS` / `TOKEN_PURCHASE_PENDING_LIMIT` | 1800 / 10 / 3 | Order lifecycle |
| `MOCK_PAYMENT_ENDPOINTS_ENABLED` | `true` | Mock payment endpoints |

## Report system

| Variable | Default | Meaning |
| --- | --- | --- |
| `REPORT_ITEMS` | JSON list | Global report item list (overridable) |
| `REPORT_VIEW_TOKEN_SECONDS` | 300 | View-token lifetime |
| `REPORT_GLOBAL_ASSET_PREFIX` / `REPORT_WORKSPACE_ASSET_PREFIX` | `global` / `workspaces` | Asset base paths |
| `REPORT_TEMPLATE_CACHE_TTL_SECONDS` | 300 | Template cache TTL |
| `REPORT_TEMPLATE_RECONCILE_SCHEDULE_MINUTE` | 5 | Reconciliation cron |
| `REPORT_RESULT_CLEANUP_*` | — | Orphan result cleanup |

## Legal documents

| Variable | Default | Meaning |
| --- | --- | --- |
| `LEGAL_DOCUMENTS_LOCALE` | `zh-CN` | Locale |
| `LEGAL_DOCUMENTS_REQUIRED` | `true` | Consent required at login |
| `LEGAL_DOCUMENTS_PUBLIC_BASE_URL` | — | Optional public HTTPS origin for legal content |

## Observability

| Variable | Default | Meaning |
| --- | --- | --- |
| `PERFORMANCE_METRICS_FLUSH_SECONDS` | 10 | Redis snapshot cadence |
| `REQUEST_SLOW_LOG_SECONDS` / `REQUEST_TRACE_SAMPLE_RATE` / `REQUEST_TRACE_LOG_BUDGET_PER_MINUTE` | 2 / 0.001 / 30 | Slow/trace logging |
| `DESIGN_JOB_QUEUE_SLOW_LOG_SECONDS` / `DESIGN_JOB_SLOW_LOG_SECONDS` / `DESIGN_JOB_TRACE_LOG_BUDGET_PER_MINUTE` | 30 / 120 / 20 | Design-job logging |
| `DESIGN_PROGRESS_DEFAULT_DURATION_SECONDS` / `MINIMUM_SAMPLES` / `SAMPLE_SIZE` / `HISTORY_DAYS` | 120 / 5 / 200 / 30 | Progress estimation |
| `PERFORMANCE_METRICS_STREAM_MAX_ENTRIES` | 5000 | Bounded raw samples |

## Deployment tooling

| Variable | Default | Meaning |
| --- | --- | --- |
| `ACR_USERNAME` / `ACR_PASSWORD` | — | Registry credentials (deploy only) |
| `ALIYUN_ACCESS_KEY_ID` / `ALIYUN_ACCESS_KEY_SECRET` | — | Alibaba credentials (deploy only) |
| `CLOUD_API_URL` / `CLOUD_ADMIN_USERNAME` / `CLOUD_ADMIN_PASSWORD` | — | Cloud test sync config |
| `RELEASE_RECORD_DIR` | `/tmp/...` | Where release records are written |

## Environment-specific guidance

- **Local / mock**: default `.env.example` values work out of the box.
- **Cloud test**: mock WeChat/pay providers, OSS or MinIO, real provider via
  admin-saved config.
- **Production**: `WECHAT_PAY_MODE=live`, `MOCK_*_ENDPOINTS_ENABLED=false`,
  real merchant keys (secrets), OSS, real provider credentials, long random
  secrets, `INITIAL_USER_TOKENS=0` unless the product grants free tokens.

## Next steps

- [REST API Overview](/reference/rest-api)
- [Cloud Architecture](/deploy/cloud-architecture) — how config reaches SAE.
