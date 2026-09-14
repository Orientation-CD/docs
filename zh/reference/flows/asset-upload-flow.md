# 资源上传流程（端到端）

这是**上传图片**的完整调用链——从用户选好照片，到资源在对象存储中变为
`READY`。其决定性特征是：**后端从不代理图片字节**。小程序使用预签名表单
直接上传到对象存储。

## 第 0 部分——用户选照片（前端）

```
User picks an image (or draws a mask)
        │
        ▼
Frontend src/pkg-features/repositories/designAssets.ts
  stageDesignImages(...)
  for each required role (image / masked_image / reference_image):
    1. read local metadata (getFileInfo): size, type
    2. build a logical file id + idempotency key (services/idempotency.ts)
    3. POST /v1/assets/upload-intents
```

## 第 1 部分——上传意图（后端签发表单）

```
POST /v1/assets/upload-intents
  Authorization: Bearer <access_token>
  Idempotency-Key: <8..128 chars>
  body: { type: "IMAGE", purpose: "DESIGN_JOB_INPUT",
          role: "image", original_filename, content_type, size_bytes }
        │
        ▼
FastAPI → app/asset_api.py: create_asset_upload_intent  (router prefix /v1/assets)
  1. get_current_user
  2. rate limit (asset-upload-intent-user,
       ASSET_UPLOAD_INTENT_RATE_LIMIT_ATTEMPTS / WINDOW_SECONDS)
  3. create_upload_intent(...)
       • validate type/purpose/role/size (MAX_UPLOAD_BYTES, MAX_IMAGE_PIXELS)
       • idempotency: replay an existing matching intent (200, not 201)
       • create asset_upload_intents + assets row:
           status = PENDING_UPLOAD, object_key = server-generated
       • build an S3 POST policy (presigned form):
           url = S3_PRESIGN_ENDPOINT + "/" + bucket
           fields = { key, policy, x-amz-signature, ... }
           expires in S3_UPLOAD_FORM_SECONDS
  4. return AssetUploadIntentResponse
     { asset_id, type, purpose, role, status: "PENDING_UPLOAD",
       upload: { method: "POST", url, fields, expires_at } }
```

## 第 2 部分——直传（前端 → 对象存储）

```
Frontend services/assets.ts → directUpload(file, form)
  uni.uploadFile({
    url: form.url,          // object storage, NOT the backend
    name: "file",
    formData: form.fields,  // signed fields
    onProgressUpdate → progress bar
  })
        │
        ▼
Object storage verifies the signed policy, stores the object,
returns 2xx on success.
```

后端**不在数据路径上**——这让大图不进入 API 请求内存，也不经过 API 网络路径。
`httpUrl.ts` / `validateUploadUrl` 把上传 URL 限制为 HTTPS（或开发用回环/局域网）。

## 第 3 部分——完成（后端收尾）

```
POST /v1/assets/{asset_id}/complete
        │
        ▼
FastAPI → app/asset_api.py → app/asset_completion.py
  1. get_current_user
  2. rate limit (asset-upload-completion-user,
       ASSET_UPLOAD_COMPLETION_RATE_LIMIT_ATTEMPTS / WINDOW_SECONDS)
  3. load the pending intent (must be PENDING_UPLOAD)
  4. verify the object exists in storage with the expected size/version
  5. capture content_sha256, object_etag, width, height (image_validation)
  6. mark assets.status = READY
  7. return AssetCompletionResponse
     { asset_id, type, purpose, role, status: "READY",
       content_type, size_bytes, content_sha256, object_etag,
       width, height, expires_at }
```

如果资源已经是 `READY`（幂等重试），意图端点会直接返回 `READY` 而不签发新表单，
complete 调用再次成功。

## 第 4 部分——资源供给设计作业

暂存好的 `asset_id` 随后在设计作业提交中传入（`assets: [{ role, asset_id }]`）。
作业创建时：

- 资源通过 `design_job_assets` **绑定**，并在作业生命周期内**受保护**，
  不被临时资源清理回收。
- submit worker 在组装规范化 `ProviderRequest` 输入时，从存储解析出已校验、
  版本绑定的对象 URL。

## 清理与保留

- 上传的输入是**临时的**：带有 `asset_expires_at`（`ASSET_TEMPORARY_RETENTION_SECONDS`）。
- poll worker 的 cron `cleanup_expired_temp_assets` 批量删除过期的
  `PENDING_UPLOAD` / 未被消费的 `READY` 资源
  （由 `ASSET_CLEANUP_BATCH_SIZE` / `ASSET_CLEANUP_MAX_BATCHES` 限制）。
- 提供商暂存的制品有自己的命名空间：`cleanup_provider_staging` 只回收
  `PROVIDER_STAGING_RETENTION_SECONDS` 下过期的确切版本，并用持久化 Redis 游标，
  使保留下来的首页对象不会饿死清理任务。
- 设计作业会**预留**其输入，使其存活到作业完成。

## 本流程的安全属性

| 属性 | 在哪里强制 |
| --- | --- |
| 服务端生成对象 key | 后端（客户端文件名被清洗） |
| 限时签名上传 | 预签名 POST policy（`S3_UPLOAD_FORM_SECONDS`） |
| 后端不在数据路径上 | 直传到存储 |
| 客户端上传 URL 校验 | 前端 `validateUploadUrl`（HTTPS/回环） |
| 尺寸/像素限制 | 后端意图校验 + `image_validation` |
| 开启版本管理的 bucket | MinIO `mc version enable` / OSS 版本管理 |

## 相关调用链

- [设计作业生命周期](/reference/flows/design-job-lifecycle)——第 0 部分调用本流程。
- [支付流程](/reference/flows/payment-flow)——同一套 JWT/保护模型。
