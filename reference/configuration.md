# Configuration Reference

Every backend setting is an environment variable read by the `Settings` class
in `app/config.py` (pydantic-settings). The canonical list with comments is
`.env.example`; this page documents **every** variable, its default, its
meaning, and whether it is required.

::: tip
When this page and `.env.example` disagree, `.env.example` and `app/config.py`
win. Never commit real secrets — use placeholders like `<your-app-secret>` or
`********`.
:::

## How settings load

`Settings` reads from the process environment (and a local `.env` in
development). Dangerous combinations are rejected at startup when
`ENVIRONMENT=production` (e.g. mock providers or fake WeChat endpoints).
Secret values are wrapped in Pydantic `SecretStr` and never logged.

## Core service

| Variable | Default | Required | Meaning |
| --- | --- | --- | --- |
| `ENVIRONMENT` | `development` | no | `development` / `production`; production refuses mock/fake endpoints |
| `APP_VERSION` | `development` | no | version label (SAE sets the Git SHA) |
| `DATABASE_URL` | `postgresql+asyncpg://floorplan:floorplan@db:5432/floorplan` | yes | async PostgreSQL DSN |
| `DATABASE_POOL_SIZE` | `10` | no | engine pool size |
| `DATABASE_MAX_OVERFLOW` | `5` | no | extra pooled connections |
| `DATABASE_POOL_TIMEOUT_SECONDS` | `30` | no | pool checkout timeout |
| `DATABASE_AUTO_CREATE` | `false` | no | auto-create schema (dev only) |
| `REDIS_URL` | `redis://redis:6379/0` | yes | Redis DSN (queue + cache + sessions) |
| `JOB_TTL_SECONDS` | `86400` | no | ARQ job result retention |
| `WORKER_JOB_COMPLETION_WAIT_SECONDS` | `270` | no | graceful-shutdown drain window (must be < container grace) |
| `ACCOUNT_DEACTIVATION_GRACE_DAYS` | `7` | no | deactivation → anonymization grace |
| `MAX_UPLOAD_BYTES` | `20971520` (20 MiB) | no | max uploaded asset size |
| `MAX_REQUEST_BYTES` | `23068672` (~22 MiB) | no | max request body |
| `MAX_IMAGE_PIXELS` | `40000000` (40 MP) | no | decoded image pixel cap |
| `LOCAL_STORAGE_PATH` | `/data` | no | local working/staging path |

## Auth & security

| Variable | Default | Required | Meaning |
| --- | --- | --- | --- |
| `JWT_SECRET` | — | **yes (prod)** | signs access/refresh JWTs; ≥32 random bytes |
| `ACCESS_TOKEN_SECONDS` | `900` (15 min) | no | access-token lifetime |
| `REFRESH_TOKEN_SECONDS` | `2592000` (30 d) | no | refresh-token lifetime |
| `REPORT_VIEW_TOKEN_SECONDS` | `300` | no | signed report view-token lifetime |
| `AUTH_RATE_LIMIT_ATTEMPTS` | `10` | no | auth brute-force limit per window |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | `300` | no | auth limit window |
| `ADMIN_SESSION_SECRET` | — | **yes** | signs the admin browser session cookie |
| `ADMIN_SESSION_HTTPS_ONLY` | `false` | no | set `true` in prod (cookie `Secure`) |
| `ADMIN_PHONE` | `+8613800000000` | **yes** | admin login phone |
| `ADMIN_PASSWORD` | — | **yes** | admin login password |
| `ADMIN_DISPLAY_NAME` | `Administrator` | no | admin display name |
| `CONFIG_ENCRYPTION_KEY` | — | **yes** | encrypts admin-saved provider API keys; keep stable |

## Observability & backpressure

| Variable | Default | Meaning |
| --- | --- | --- |
| `MAX_CONCURRENT_REQUESTS_PER_PROCESS` | `100` | async backpressure cap before dependencies |
| `REGISTRATION_CONCURRENT_REQUESTS_PER_PROCESS` | `20` | registration concurrency |
| `REQUEST_SLOW_LOG_SECONDS` | `2` | trace requests slower than this |
| `REQUEST_TRACE_SAMPLE_RATE` | `0.001` | sample 0.1% of healthy requests |
| `REQUEST_TRACE_LOG_BUDGET_PER_MINUTE` | `30` | cap trace lines/min |
| `PERFORMANCE_METRICS_FLUSH_SECONDS` | `10` | flush in-memory metrics to Redis |
| `PERFORMANCE_METRICS_STREAM_MAX_ENTRIES` | `5000` | bound raw duration samples |
| `DESIGN_JOB_QUEUE_SLOW_LOG_SECONDS` | `30` | flag slow provider-queue wait |
| `DESIGN_JOB_SLOW_LOG_SECONDS` | `120` | flag slow end-to-end job |
| `DESIGN_JOB_TRACE_LOG_BUDGET_PER_MINUTE` | `20` | cap job trace lines/min |
| `WORKER_VERBOSE_LOGS` | `false` | verbose worker logs |
| `ADMIN_REPORT_CACHE_SECONDS` | `10` | admin report render cache |

## Design jobs & rate limits

| Variable | Default | Meaning |
| --- | --- | --- |
| `DESIGN_RATE_LIMIT_JOBS` | `20` | per-user hourly design submissions |
| `DESIGN_RATE_LIMIT_WINDOW_SECONDS` | `3600` | design rate window |
| `MAX_ACTIVE_DESIGN_JOBS_PER_USER` | `5` | concurrent active jobs per user |
| `DESIGN_PROGRESS_DEFAULT_DURATION_SECONDS` | `120` | fallback ETA for progress bars |
| `DESIGN_PROGRESS_MINIMUM_SAMPLES` | `5` | min samples before using history |
| `DESIGN_PROGRESS_SAMPLE_SIZE` | `200` | samples kept for ETA |
| `DESIGN_PROGRESS_HISTORY_DAYS` | `30` | lookback for ETA |

## Tokens, entitlements & invites

| Variable | Default | Meaning |
| --- | --- | --- |
| `INITIAL_USER_TOKENS` | `1000` | starter balance on first login (set `0` in prod unless intended) |
| `INITIAL_USER_ALLOWED_WORKSPACES` | `2` | owned workspaces allowed (personal + owned enterprises) |
| `SEED_DEMO_BILLING_CATALOG` | `true` | seed example prices locally |
| `ENTERPRISE_INVITATION_HOURS` | `72` | enterprise invitation expiry |
| `SHARE_INVITATION_PREVIEW_RATE_LIMIT_ATTEMPTS` | `60` | share preview limit |
| `SHARE_INVITATION_ACCEPT_RATE_LIMIT_ATTEMPTS` | `30` | share accept limit |
| `SHARE_INVITATION_RATE_LIMIT_WINDOW_SECONDS` | `300` | share limit window |

## Referrals

| Variable | Default | Meaning |
| --- | --- | --- |
| `REFERRAL_CAMPAIGN_CODE` | `REFERRAL_FIRST_PURCHASE` | active campaign |
| `REFERRAL_CAMPAIGN_VERSION` | `1` | expected config version |
| `REFERRAL_CAMPAIGN_REQUIRES_NEW_REGISTRATION` | `true` | reward only for new invitees |
| `REFERRAL_REWARD_TOKENS` | `1000` | tokens per qualified referral |
| `REFERRAL_REWARD_GLOBAL_CAP` | `10000` | global reward cap |
| `REFERRAL_MINIMUM_PURCHASE_FEN` | `990` | min non-refundable purchase (CNY 9.90) |
| `REFERRAL_INVITATION_LIFETIME_SECONDS` | `2592000` | invitation bearer TTL (30 d) |
| `REFERRAL_IDENTITY_RETENTION_SECONDS` | `31536000` | identity evidence retention (1 y) |
| `REFERRAL_REWARD_CLAIM_EXPIRY_SECONDS` | `604800` | claim window (7 d) |
| `REFERRAL_IDEMPOTENCY_SECONDS` | `604800` | idempotency retention |
| `REFERRAL_RATE_LIMIT_ATTEMPTS` | `30` | referral op limit |
| `REFERRAL_RATE_LIMIT_WINDOW_SECONDS` | `300` | referral limit window |

## Legal & public URLs

| Variable | Default | Meaning |
| --- | --- | --- |
| `LEGAL_DOCUMENTS_LOCALE` | `zh-CN` | legal doc locale |
| `LEGAL_DOCUMENTS_REQUIRED` | `true` | require acceptance on signup |
| `PUBLIC_API_BASE_URL` | _unset_ | external HTTPS origin for API/report/legal links |
| `LEGAL_DOCUMENTS_PUBLIC_BASE_URL` | _unset_ | separate public legal-document origin (optional) |

## Reports

| Variable | Default | Meaning |
| --- | --- | --- |
| `REPORT_GLOBAL_ASSET_PREFIX` | `global` | shared report asset prefix |
| `REPORT_WORKSPACE_ASSET_PREFIX` | `workspaces` | per-workspace report prefix |
| `REPORT_LIBRARY_MAX_OBJECTS_PER_ITEM` | `1000` | max library objects listed per section |
| `REPORT_ITEMS` | _commented_ | override built-in report menu (JSON array) |
| `REPORT_TEMPLATE_CACHE_TTL_SECONDS` | `300` | report render cache |
| `REPORT_TEMPLATE_RECONCILE_SCHEDULE_MINUTE` | `5` | template reconcile cadence |
| `REPORT_TEMPLATE_RECONCILE_BATCH_SIZE` / `_MAX_BATCHES` | `100` / `10` | reconcile batches |
| `REPORT_RESULT_CLEANUP_MINIMUM_AGE_SECONDS` | `3600` | min age before cleanup |
| `REPORT_RESULT_CLEANUP_BATCH_SIZE` / `_MAX_BATCHES` | `100` / `10` | cleanup batches |

## Providers (multi-provider catalog bootstrap)

These seed the fallback when no admin row exists; DB rows override them.

| Variable | Default | Meaning |
| --- | --- | --- |
| `PROVIDER_ADAPTER` | `mock_async` | adapter key (`mock_async`, `seedream`, `doubao_text`, `gpt_image`) |
| `PROVIDER_BASE_URL` | `http://mock-image-provider:8082` | provider endpoint |
| `PROVIDER_MODEL` | _empty_ | model id (empty = GPT image adapter off) |
| `PROVIDER_IMAGE_SIZE` | `1.5K` | default output size |
| `PROVIDER_OUTPUT_FORMAT` | `jpeg` | output format |
| `PROVIDER_WATERMARK` | `false` | watermark output |
| `PROVIDER_SUBMIT_PATH` | `/v1/renders` | submit path |
| `PROVIDER_STATUS_PATH` | `/v1/renders/{job_id}` | status path |
| `PROVIDER_API_KEY` | _empty_ | bootstrap key (admin rows override) |
| `PROVIDER_OUTPUT_HOSTS` | `["object-storage.example.com"]` | result-host allow-list |
| `PROVIDER_ALLOW_HTTP` | `true` | allow HTTP in non-prod |
| `PROVIDER_REQUEST_TIMEOUT_SECONDS` | `300` | per-call timeout |
| `PROVIDER_POLL_INTERVAL_SECONDS` | `10` | poll cadence |
| `PROVIDER_MAX_WAIT_SECONDS` | `900` | poll give-up |
| `PROVIDER_MAX_RETRIES` | `4` | retries |
| `PROVIDER_HTTP_MAX_CONNECTIONS` | `20` | connection pool |
| `PROVIDER_HTTP_MAX_KEEPALIVE_CONNECTIONS` | `10` | keepalive pool |
| `PROVIDER_HTTP_KEEPALIVE_EXPIRY_SECONDS` | `30` | keepalive TTL |
| `MOCK_IMAGE_PROVIDER_CONTROLS_ENABLED` | `false` | accept mock-provider controls (local only) |

## WeChat login & payment

| Variable | Default | Meaning |
| --- | --- | --- |
| `WECHAT_PAY_MODE` | `mock` | `disabled` / `mock` / `live` |
| `WECHAT_PAYMENT_EXPIRE_SECONDS` | `1800` | order payment window |
| `WECHAT_PAYMENT_CLOSE_GRACE_SECONDS` | `10` | close grace |
| `WECHAT_TOKEN_PURCHASE_PENDING_LIMIT` | `3` | max pending orders per user |
| `MOCK_PAYMENT_ENDPOINTS_ENABLED` | `true` | enable `/mock/*` payment helpers |
| `WECHAT_PAY_BASE_URL` | `http://mock-payment-provider:8081/mock/wechat-pay` | pay base URL |
| `WECHAT_APP_ID` | `wxmocknativeapp0001` | Mini Program app id |
| `WECHAT_MINI_PROGRAM_APP_SECRET` | `mock-mini-program-secret` | **secret** — replace in prod |
| `MOCK_WECHAT_IDENTITY_ENDPOINTS_ENABLED` | `true` | point login at local mock |
| `WECHAT_CODE_TO_SESSION_URL` | local mock | `jscode2session` URL |
| `WECHAT_STABLE_ACCESS_TOKEN_URL` | local mock | stable token URL |
| `WECHAT_PHONE_NUMBER_URL` | local mock | phone-number URL |
| `WECHAT_AUTH_REQUEST_TIMEOUT_SECONDS` | `30` | WeChat HTTP timeout |
| `WECHAT_PAY_MERCHANT_ID` | `1900000109` | merchant id |
| `WECHAT_PAY_API_V3_KEY` | _mock_ | **secret** — APIv3 key |
| `WECHAT_PAY_MERCHANT_SERIAL` | _mock_ | merchant cert serial |
| `WECHAT_PAY_MERCHANT_PRIVATE_KEY` | _empty_ | **secret** — merchant private key |
| `WECHAT_PAY_MERCHANT_PRIVATE_KEY_FILE` | mock path | mounted read-only in prod |
| `WECHAT_PAY_PUBLIC_KEY_ID` | _mock_ | platform public key id |
| `WECHAT_PAY_PUBLIC_KEY` / `_FILE` | _mock_ | platform public key |
| `WECHAT_PAYMENT_NOTIFY_URL` | _empty_ | payment notify callback URL |

## Cloudflare tunnel (optional)

| Variable | Default | Meaning |
| --- | --- | --- |
| `CLOUDFLARE_TUNNEL_TOKEN` | _empty_ | named-tunnel token |
| `CLOUDFLARED_IMAGE` | `cloudflare/cloudflared:latest` | pinned image override |

## Object storage (S3-compatible)

| Variable | Default | Meaning |
| --- | --- | --- |
| `STORAGE_BACKEND` | `s3` | `local` or `s3` |
| `S3_BUCKET` | _replace_ | private bucket |
| `S3_REGION` | `cn-chengdu` | region |
| `S3_ENDPOINT` | OSS internal | server-side endpoint |
| `S3_PRESIGN_ENDPOINT` | OSS public | browser-visible presign endpoint |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | _empty_ | **secrets** |
| `S3_SIGNATURE_VERSION` | `s3` | `s3` for OSS, `s3v4` for AWS/MinIO |
| `S3_PRESIGN_SECONDS` | `3600` | presigned read URL TTL |
| `S3_UPLOAD_FORM_SECONDS` | `900` | upload-intent form TTL |
| `S3_SERVER_SIDE_ENCRYPTION` | `AES256` | SSE |
| `S3_FORCE_PATH_STYLE` | `false` | true for MinIO |
| `S3_MULTIPART_THRESHOLD_BYTES` | `8388608` | multipart threshold |
| `S3_TRANSFER_CHUNK_BYTES` | `8388608` | chunk size |

## Asset & staging cleanup

| Variable | Default | Meaning |
| --- | --- | --- |
| `ASSET_TEMPORARY_RETENTION_SECONDS` | `259200` (3 d) | un-completed upload retention |
| `ASSET_CLEANUP_SCHEDULE_MINUTE` | `0` | cleanup minute-of-hour |
| `ASSET_CLEANUP_BATCH_SIZE` / `_MAX_BATCHES` | `100` / `10` | cleanup batches |
| `PROVIDER_STAGING_RETENTION_SECONDS` | `259200` | provider staging retention |
| `PROVIDER_STAGING_CLEANUP_BATCH_SIZE` | `100` | staging batch size |
| `ASSET_UPLOAD_INTENT_RATE_LIMIT_ATTEMPTS` / `_WINDOW_SECONDS` | `60` / `3600` | intent limit |
| `ASSET_UPLOAD_COMPLETION_RATE_LIMIT_ATTEMPTS` / `_WINDOW_SECONDS` | `120` / `3600` | completion limit |
| `MOCK_IMAGE_PROVIDER_BUCKET` / `OBJECT_KEY` | _replace_ | mock provider output |

## Cloud E2E & deploy (operator-only)

| Variable | Meaning |
| --- | --- |
| `CLOUD_API_URL` | cloud-test API URL |
| `CLOUD_ADMIN_USERNAME` / `CLOUD_ADMIN_PASSWORD` | cloud-test admin creds |
| `ACR_REGISTRY` / `ACR_NAMESPACE` / `ACR_REPOSITORY` | container registry |
| `ACR_USERNAME` / `ACR_PASSWORD` | **secrets** — registry creds |
| `ALIYUN_ACCESS_KEY_ID` / `ALIYUN_ACCESS_KEY_SECRET` | **secrets** — deploy creds |
| `SAE_REGION` / `SAE_API_ENDPOINT` | SAE deploy target |

## Read next

- [REST API](/reference/rest-api) — what these variables gate.
- [Getting Started](/backend/getting-started) — minimal `.env` to run locally.
