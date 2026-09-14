# 设计作业生命周期（端到端）

这是设计作业的**完整调用链**——系统中最重要的流程。它追踪从用户在小程序里点击
**提交**，到结果出现在屏幕上的全过程，包括每次经过 API、Redis、worker、
**多提供商目录（multi-provider catalog）**、对象存储和数据库的跳转。

> 每个功能（室内、局部刷新、厨房、卫生间、家具、汇报）都汇入同一条流水线。
> 读懂本页，你就理解了后端的大部分。

## 规范化的提供商目录（先读这段）

作业不再通过单一的 `PROVIDER_*` 环境变量路由。提交时，worker 通过数据库目录
解析提供商：

```text
design_job_types  (catalog / "job type", key = the job's type key)
  selected_model_config_id ──┐
                             ▼
provider_model_catalogs  (N:N join: which model configs this catalog may use)
                             │
                             ▼
provider_model_configs  (model_id, image_size, output_format, watermark,
                         request_shapes[], supports_masked_input)
                             │  belongs to
                             ▼
provider_connections  (base_url, adapter, submit_path, status_path,
                       auth header/scheme, output_hosts, Fernet-encrypted api key)
```

- **适配器：** `mock_async`、`seedream`、`doubao_text`、`gpt_image`。
- 每个适配器声明一个能力信封（`PROVIDER_CAPABILITIES`）：允许的请求形态
  （`SINGLE_IMAGE`、`IMAGE_WITH_REFERENCE`、`RECORDING_SEQUENCE`）、同步还是异步、
  是否支持轮询、制品来源，以及重放行为。
- 模型可以收窄（绝不超出）其适配器信封。选择时，会用模型的 `request_shapes`
  校验目录的 `result_kind`、`masked_image_required` 和 `reference_image_required`。
- 每个被接受的 `DesignJobSubmission` 捕获一份**非敏感 JSON 快照**
  （`schema_version: 2`：连接 + 模型 ID 与配置版本、base_url、路径、输出主机、超时），
  外加单独加密的 API 密钥。作业始终按其提交时的确切提供商代际运行。

规范化的 I/O 契约（`app/providers/base.py`）是一个严格的
`ProviderRequest`（`instructions` + 有序的 `inputs` + `output`），每个适配器
必须接受或失败关闭——适配器绝不会静默丢弃内容。

## 第 0 部分——用户点击提交（前端）

```
User taps "提交" on a feature page
        │
        ▼
Frontend src/pkg-features/services/standardDesignSubmit.ts
  submitStandardDesign(input)
  1. reads image metadata (imageFileMetadata.ts)
  2. loads profile + job-type catalog + prompt catalog (parallel)
  3. validates the job type is "available"
  4. builds the prompt selection
  5. token preflight (designTokenPreflight.ts → assertPersonalTokenBalance)
  6. STAGES the images (see Asset Upload Flow)
  7. submits POST /v1/design-jobs with an Idempotency-Key
```

## 第 1 部分——API 接收提交

```
POST /v1/design-jobs
  Authorization: Bearer <access_token>
  Idempotency-Key: <8..128 chars>
  body: { workspace_id, type, name, prompts, assets, client_info? }
        │
        ▼
FastAPI → app/api.py: create_design_job  (design_router, prefix /v1)
  1. get_current_user → decode JWT, load user (app/auth.py)
  2. accessible_workspace(db, user, workspace_id) → membership check
  3. resolve the design_job_types row (catalog) for type; require is_active
  4. design rate limit (DESIGN_RATE_LIMIT_JOBS / WINDOW) + active-job slot check
        │
        ▼
  5. reserve_design_job_assets(...)  (app/design_job.py)
       • validates job type / prompt selection / assets under row locks
       • billing.reserve_design_tokens(user, token_cost)
           - row lock on the token account; remaining_tokens >= cost
           - append token_ledger_entries (RESERVE)
       • insert design_jobs row: status=pending, prompt snapshot,
         input asset keys, token_cost, client_info
       • bind input assets via design_job_assets and protect them from cleanup
       • idempotency: replay on matching request fingerprint
        ▼
  6. enqueue ARQ task "submit_design_job"(design_job_id)
     → queue_name = ADMISSION_QUEUE  ("arq:admission_queue")
     → _job_id = design_job.id
        ▼
  7. return 202 Accepted DesignJobResponse
     { id, status: "pending", poll_after_seconds, ... }
     (Retry-After header mirrors poll_after_seconds)
```

**此刻：** 数据库里已有一行（`pending`），积分已预留，Redis 里有一条消息。
前端拿到作业 id 并开始轮询。

## 第 2 部分——submit worker 与提供商通信

```
Redis ADMISSION_QUEUE ──► submit worker (arq, app.worker.SubmitWorkerSettings)
        │
        ▼
app/design_job.py: submit_design_job(ctx, design_job_id)
  1. acquire a cross-replica short lock "design-job-submit-lock:<id>" (lease)
  2. re-check job still pending (skip if superseded)
  3. finalize_design_job_assets(...) → verified, version-bound input URLs
  4. _reserve_pending_design_job(...) → re-check token reservation
  5. _prepare_provider_submissions(...) → resolve the catalog:
       • load design_job_types (catalog) → selected_model_config_id
       • load provider_model_configs → provider_connections
       • validate connection/model pair against adapter capabilities
       • decrypt the Fernet-encrypted API key in memory
       • snapshot the exact generation onto each design_job_submission
  6. for each submission:
       • _build_provider_request(...) → normalized ProviderRequest
            (instructions + ordered ImageInput[primary,?reference] + OutputSpec)
       • renew the submit lock lease
       • record provider dispatching; call
            _provider_for(...).submit(request=..., idempotency_key=submission.idempotency_key)
       • sync adapters (seedream/gpt_image/doubao_text) complete inline:
            _record_sync_provider_completion → _persist_provider_result
       • async adapters (mock_async):
            _record_provider_acceptance(provider_job_id, state=running)
            → _schedule_poll(...) → POLL_QUEUE
```

此阶段的提供商失败会把作业标记为 `failed`（类型化为 `ProviderFailure`，
带接受确定性和重试处置），退还预留，轮询响应告知客户端。
"请求从未发出"类失败可安全重试；"结果未知"类失败绝不会自动重试已付费的提供商调用。

## 第 3 部分——poll worker 驱动完成

```
Redis POLL_QUEUE ──► poll worker (arq, app.worker.PollWorkerSettings)
        │
        ▼
app/design_job.py: poll_design_job(ctx, design_job_id, submission_id?)
  loop {
    acquire "design-job-poll-lock:<id>:<submission>"
    provider = provider_settings_from_snapshot(submission) → adapter
    provider.query(provider_job_id)         (PollableProvider; async only)
    if still running  → wait provider_poll_interval_seconds, re-enqueue poll
    if done:
       _record_provider_completion(...)
       _persist_provider_result(...)
         • download / stage the artifact (StagedArtifactLocator or inline)
         • verify result identity (size + sha256, not ETag)
         • upload to object storage → new Asset, attach design_job_assets (role=result)
         • billing.settle_design_tokens → exact cost, append ledger (SETTLE),
           release reservation
         • design_jobs.status = completed; completed_at; average_duration_seconds
         • if it has a design_report → _complete_report_if_ready(...)
    if failed:
       design_jobs.status = failed, error_code
       billing.refund → credit back the reservation
    past provider_deadline_at → failed with "provider_timeout"
  }
```

### 对账安全网

如果 worker 在步骤之间挂掉，cron `reconcile_stale_design_jobs`（poll worker 上
约每 15 秒一次）会发现卡在非终态超过短截止的作业，并把正确的步骤**重新入队**。
丢失的作业绝不会永远停滞。

## 第 4 部分——客户端轮询并拿到结果

```
Frontend pollScheduler ──► GET /v1/design-jobs/{id}  (every poll_after_seconds)
        │
        ▼
app/api.py: get_design_job
  1. get_current_user
  2. get_owned_design_job(db, id, user_id) + related data
  3. build DesignJobResponse:
       status: pending | running | completed | failed
       progress fields; poll_after_seconds (also Retry-After header)
       result URL (presigned, expires_at) when completed
       error_code when failed
```

状态进入终态后前端停止轮询：

- **completed** → 展示结果图（预签名 URL），提供"生成汇报"。
- **failed** → 把 `error_code` 映射为友好文案并展示操作（重试 / 充值 / 联系）。

## 数据流小结

| 步骤 | Redis | PostgreSQL | 对象存储 | 提供商 |
| --- | --- | --- | --- | --- |
| 提交 API | 入队 submit（admission） | 插入 design_jobs（pending）+ 积分预留 + 快照 | — | — |
| submit worker | 入队 poll（poll） | design_job_submissions 行 + 状态 running | 读输入 URL | 提交规范化请求 |
| poll worker | 重新入队 poll | 结算积分，状态 completed | 写结果图 | 查询直到完成 |
| 客户端轮询 | — | 读状态 | 预签名结果 URL | — |

## 积分去向

1. `INITIAL_TOKEN_GRANT`——注册时（活动或 `INITIAL_USER_TOKENS`）。
2. `RESERVE`——提交时（在积分账户上冻结）。
3. `SETTLE`——完成时按实际成本结算（释放预留）。
4. refund——失败时退回。

## 相关调用链

- [资源上传流程](/reference/flows/asset-upload-flow)——第 0 部分第 6 步。
- [微信登录流程](/reference/flows/wechat-login-flow)——提交前的登录关卡。
- [汇报查看流程](/reference/flows/report-view-flow)——`html_report` 作业完成后发生什么。
- [支付流程](/reference/flows/payment-flow)——积分从哪来。
