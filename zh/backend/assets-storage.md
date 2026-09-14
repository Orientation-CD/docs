# 资产与对象存储

**资产**是用户（或提供商）贡献给设计作业的二进制文件：上传的户型图图片、录制的对话音频文件或文档。字节存放在 S3 兼容对象存储中；元数据存放在
PostgreSQL。本页解释上传意向 → 直传 → 完成流程、存储抽象和清理。路由在
`app/asset_api.py`；事务逻辑在 `app/assets.py` 和
`app/asset_completion.py`；存储客户端是 `app/storage.py`。

## 为什么直传？

通过 FastAPI 进程上传大户型图会占用 API 连接和 worker 内存。相反，小程序使用 API 签发的预签名表单**直接上传到对象存储**。API 只中介一个短期、受限的上传表单，稍后验证结果——它从不在请求 body 中看到字节。

```
 小程序            FastAPI API                  S3 / MinIO / OSS
     │  POST /assets/upload-intents ──►  （校验、签发表单）
     │  ◄──── 预签名上传表单 + asset_id
     │  PUT 字节 ───────────────────────────────────────►  （存为临时版本）
     │  POST /assets/{id}/complete ──►  （验证对象、提升）
     │  ◄──── 最终资产元数据
```

## 资产类型与角色

资产是 `assets` 表中的类型化行，每种类型有子表：

| 类型 | 元数据表 | 用途 |
| --- | --- | --- |
| image | `images` | 上传的户型图、渲染的提供商输出、报告图片 |
| audio | `audio_assets` | 喂给 `voice_summary` 的客户对话录音 |
| document | `documents` | 上传的参考文档 |

每个资产有 `purpose`（用途），当链接到作业时，还有
`design_job_assets.role`（期望的输入角色，如户型图、情绪板或参考图）。
`asset_display_metadata` 保存缓存的显示标签。

## 上传意向

`POST /api/v1/assets/upload-intents`（bearer 认证）创建或重放上上传意向。调用者发送：

```json
{
  "type": "image",
  "purpose": "design_input",
  "role": "floor_plan",
  "original_filename": "my-floorplan.jpg",
  "content_type": "image/jpeg",
  "size_bytes": 1820000
}
```

以及一个必需头：

```
Idempotency-Key: <8..128 字符，由客户端选择>
```

服务器（`app/assets.py:create_upload_intent`）：

1. 按用户限流（`ASSET_UPLOAD_INTENT_RATE_LIMIT_ATTEMPTS` /
   `_WINDOW_SECONDS`）。
2. 强制执行大小/类型限制（`MAX_UPLOAD_BYTES`、`MAX_REQUEST_BYTES`、
   `MAX_IMAGE_PIXELS`）和用途授权。
3. 创建 `asset_upload_intents` 行和临时 `assets` 行。
4. 请求 `ObjectStorage` 签发有效期为
   `S3_UPLOAD_FORM_SECONDS`（默认 900s）的**预签名上传表单**。
5. 返回表单字段 + URL + `asset_id`。

重放相同的 `Idempotency-Key` 返回**相同**意向（重放时 HTTP 200，创建时 201），因此网络重试绝不会重复创建资产。

## 完成

小程序将字节 PUT 到对象存储后，调用：

```
POST /api/v1/assets/{asset_id}/complete
```

`complete_asset_upload`（`app/asset_completion.py`）：

1. 按用户限流（`ASSET_UPLOAD_COMPLETION_RATE_LIMIT_*`）。
2. 验证对象确实存在于存储中，且其大小/类型与声明的意向匹配。
3. 对图片，解码并验证像素（`MAX_IMAGE_PIXELS`）；对音频，验证录音格式。
4. 将临时资产提升为最终可用资产行。
5. 如果上传作为单独临时版本存储，删除该版本（尽力而为；失败记录日志并由清理任务重试）。

只有已完成的资产才能被设计作业引用。

## 列表与读取

`GET /api/v1/assets` 列出调用者的资产（分页）。管理路径可跨用户列出。预览 URL 按需签名（`S3_PRESIGN_SECONDS`，默认 3600s）—— API 本身从不服务字节。

## 存储抽象（`app/storage.py`）

`ObjectStorage` 是代码其余部分使用的后端无关接口；实现由
`STORAGE_BACKEND` 选择：

| 设置 | 本地 | 生产 |
| --- | --- | --- |
| `STORAGE_BACKEND` | `s3`（Compose MinIO overlay） | `s3` |
| `S3_BUCKET` | 隔离的本地 bucket | 私有云 bucket |
| `S3_ENDPOINT` | MinIO | 如 `https://s3.oss-cn-chengdu-internal.aliyuncs.com` |
| `S3_PRESIGN_ENDPOINT` | MinIO | 浏览器/小程序 URL 的公共 OSS 端点 |
| `S3_FORCE_PATH_STYLE` | true（MinIO） | false（OSS 虚拟主机式） |
| `S3_SIGNATURE_VERSION` | `s3v4` | `s3`（OSS 兼容要求） |

存储客户端支持 `put`、`get`、预签名上传表单、预签名读取、多分片（`S3_MULTIPART_THRESHOLD_BYTES`、
`S3_TRANSFER_CHUNK_BYTES`）和服务端加密
（`S3_SERVER_SIDE_ENCRYPTION=AES256`）。报告资产按工作区命名空间，位于
`REPORT_WORKSPACE_ASSET_PREFIX` 下，共享
`REPORT_GLOBAL_ASSET_PREFIX`。

## 临时生命周期与清理

从未完成的上传、提供商暂存工件和旧报告结果由周期性 worker 任务清理：

| 设置 | 默认值 | 含义 |
| --- | --- | --- |
| `ASSET_TEMPORARY_RETENTION_SECONDS` | 259200（3 天） | 未完成上传保留多久 |
| `ASSET_CLEANUP_SCHEDULE_MINUTE` | 0 | 清理运行的分钟 |
| `ASSET_CLEANUP_BATCH_SIZE` / `_MAX_BATCHES` | 100 / 10 | 每次运行批次 |
| `PROVIDER_STAGING_RETENTION_SECONDS` | 259200 | 提供商暂存输入/输出保留 |
| `REPORT_RESULT_CLEANUP_MINIMUM_AGE_SECONDS` | 3600 | 不删除比此更年轻的报告结果 |

`process_cleanup_temporary_assets` 和
`process_cleanup_provider_staging_artifacts` 在**两个** worker 池上运行；`process_cleanup_report_result_artifacts` 在 poll worker 上运行（参见[架构](/backend/architecture)）。

## 安全注意

- 上传意向预先拒绝超大或不允许的内容类型，因此客户端快速失败而非上传被拒绝的 blob。
- 对象键从不逐字包含用户提供的文件名；名称经过净化并按工作区命名空间。
- 预览/读取 URL 预签名且限时；API 本身不代理二进制字节。

## 延伸阅读

- [设计作业](/backend/design-jobs) —— 已完成资产如何成为作业输入。
- [报告](/backend/reports) —— 报告库对象如何从存储读取。
