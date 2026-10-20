# Storage and Test Environments

Select storage according to the boundary being changed. MinIO validates local S3-compatible behavior; Alibaba OSS adds real signing, endpoint, CORS and provider-boundary evidence. Neither choice alone proves a real payment or model-provider acceptance.

## Session isolation comes first

Use an owner-selected API port and a dedicated Compose project. Check the API port, derived MinIO ports, running/stopped containers and volumes before invoking any stack or runner. Set the values once:

```bash
export DEV_TEST_PORT='<owner-selected API port>'
export DEV_TEST_PROJECT="yuanzhu-${DEV_TEST_PORT}"
```

MinIO API/console ports are API + 21504 / + 43008. Do not silently replace a conflicting stack or choose a different port. Private `jinqiuai` image builds need an authorized SSH agent even for otherwise mocked scenarios. See [local development](/deploy/local-stack).

## Configuration layers

| Layer | Meaning |
| --- | --- |
| `--port`, `--project`, `--storage`, login-mode flags, `--secret` | Select launcher topology and validated input profile |
| Selected ignored dotenv file | Shared settings/credentials and Compose interpolation input; not shell code |
| Generated `STACK_*` values and explicit Compose `environment:` | Derived host/container topology; explicit mappings override service `env_file` values |
| Service `env_file` | Application environment not overridden by explicit mappings |
| `Settings` environment / working-directory `.env` / code defaults | Application loading order; normal images exclude the repository's `.env` |

Inspect the running container's resolved settings rather than inferring them from an edited host file. A sanitized `docker compose ... config --quiet` validates expansion; full rendered config may expose secrets and must not be pasted into public logs.

## Separate local profiles

Create ignored `.env.minio-test` and `.env.oss-test` profiles with restricted permissions. Include only the required application/Admin/cloud-import values and selected storage/login credentials. Use placeholders in shared documentation.

MinIO mode derives an internal service endpoint and a browser-visible public host/port. OSS mode requires the bucket/region/access credentials and public HTTPS S3-compatible endpoint; a local machine cannot reach an `-internal.aliyuncs.com` VPC address. Do not substitute a CDN host for a signed upload endpoint. The direct-upload protocol is multipart **POST**, followed by completion verification.

A retained manual stack imports product configuration only with the guarded fresh-volume `--import-cloud-config` flow. Local smoke/E2E normally import a validated cloud-test snapshot themselves: prompts, Features, Workflow/Operation configuration, subscriptions, packages and legal documents. They require authorized `CLOUD_API_URL`, `CLOUD_ADMIN_USERNAME`, `CLOUD_ADMIN_PASSWORD` and local Admin credentials. They never export provider secrets and refuse production destinations. A ready API with empty product/legal configuration is not a working login/job environment.

## Focused smoke and E2E

Example syntax, after explicit ownership and storage authorization:

```bash
./scripts/run_smoke_tests.sh --local localhost \
  --port "${DEV_TEST_PORT:?Select the session port first}" \
  --project "$DEV_TEST_PROJECT" --wechat mock --storage minio \
  --secret .env.minio-test -- smoke_tests/test_design_report_workflow.py

./scripts/run_e2e_tests.sh --local localhost \
  --port "$DEV_TEST_PORT" --project "$DEV_TEST_PROJECT" \
  --wechat mock --storage minio --secret .env.minio-test --mode coverage
```

For OSS-related behavior, use the authorized OSS profile/storage variant as required by the upstream policy. Local runners recreate their selected stack while preserving volumes; these are not read-only probes. Cloud mode uses an explicit `--cloud https://...` and an existing remote stack. Cloud E2E additionally requires dedicated coordination Redis and read-only monitoring PostgreSQL credentials; never point it at production/customer data.

## Production-bound upgrade validation

The current backend policy uses **one deployed-baseline replica**, not an additional fresh-stack E2E pass:

1. After focused tests, coverage/risk review, retained reviewers and full regression, restore an authorized read-only deployed database dump to an owned disposable PostgreSQL volume.
2. Migrate that same volume with the candidate and localize providers/legal bodies; do not start the old deployed API/workers or write the cloud source.
3. Run E2E coverage, then 300-second endurance, then affected smoke paths on that migrated volume; add OSS variants where required.
4. Preserve the owned migrated volume/evidence for an interrupted continuation. Use `--preconfigured` and the runner's upgrade-reuse controls so a later phase does not reimport an older cloud configuration or rerun a successful migration.

The required coverage topology is two user containers with two mobile users each plus one administrator; endurance uses ten user containers with seven mobile users each plus one administrator. Diagnostic overrides do not replace those gates. The upgrade runner owns private evidence under the worktree's ignored `.local/upgrade-gates/` and cleans only its verified resources.

Docs-only work requires documentation validation, not these product gates. The normative upstream test policy and live runbook decide which actual tests are applicable; this page does not authorize paid model calls, real payment, cloud writes or destructive cleanup.

## Source evidence

Verified against the [documented source revisions](/reference/source-revisions). Runtime values and cloud activation must be checked separately.

- [Normative environment and gate policy](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/tests/documents/TEST_STRATEGY.md)
- [Live stack/test runbook](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/scripts/runbook.md)
- [Compose precedence and topology](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/docker-compose.yml)
- [Upgrade gate](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/scripts/run_deployed_upgrade_gate.sh)
