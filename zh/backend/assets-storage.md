# Asset 与对象存储

Asset UUID 是核验后的图片、录音或文档的持久身份。对象 key、hash、ETag 和精确版本由服务端维护；签名 URL 仅提供临时访问能力。

## 直接上传

1. 使用 Bearer 与 `Idempotency-Key` 调用 `POST /v1/assets/upload-intents`，声明类型、用途、角色、文件名、MIME 与字节数。
2. 将文件与**返回的原样 multipart POST 字段**提交到 `upload.url`。对象存储请求不携带应用 Bearer token。
3. 调用 `POST /v1/assets/{asset_id}/complete`，由服务端核验对象身份与解码内容，再返回可使用状态。
4. 在 Workflow 对应端口/角色中引用完成后的 UUID。仅收到存储 HTTP 成功不表示 Asset 已完成。

```json
{
  "type": "IMAGE",
  "purpose": "DESIGN_JOB_INPUT",
  "role": "image",
  "original_filename": "floorplan.png",
  "content_type": "image/png",
  "size_bytes": 184223
}
```

普通任务输入使用 `IMAGE`、`AUDIO` 或支持的客户 PPTX `DOCUMENT`；角色包含 `image`、`masked_image`、`reference_image`、`recording` 与 `attachment`。用途/类型/角色组合必须通过校验。管理员目录图片与法律文档使用独立授权用途。

精确重放返回同一 intent。完成后重放可能返回 `upload: null`。过期或内容变化需新建意图；上传未完成及并发状态冲突有明确的有界重试规则。完整媒体与大小限制见 [REST API](/zh/reference/rest-api)。

## 复用、访问与删除

复用本人已完成图片结果时，先使用独立幂等键调用 `/v1/assets/{source_asset_id}/design-input-copies`。复制得到的临时输入有独立对象 key 与删除生命周期。Workflow 的公开结果在发布前先成为不可变 Asset。

认证所有者可查询有权限的 Asset 状态。公开 Asset 列表/删除 API 要求管理员权限，并非客户通用文件管理器。[后台素材](/zh/admin/assets)也会在删除前检查保留引用。

## 存储配置

`S3_ENDPOINT` 用于服务端访问；`S3_PRESIGN_ENDPOINT` 必须能被实际浏览器/手机访问。MinIO 使用 `s3v4`，已经验证的阿里云 OSS 兼容部署使用 `s3`。除显式发布的不可变法律正文外，bucket 保持私有。版本保留、CORS 和生命周期规则必须保护已被 Workflow 固定的输入/结果。

清理任务处理临时 Asset、复制对象版本、服务商暂存及未发布报告/PPTX/视频预留，但不能删除活动任务仍引用的版本。参见[配置](/zh/reference/configuration)、[本地环境](/zh/deploy/local-stack)及页末固定版本运维合同。

---

代码依据 · backend `b13cc566`: [app/assets/asset_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/assets/asset_api.py) · [app/assets/asset_completion.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/assets/asset_completion.py) · [documents/ASSET_STORAGE_OPERATIONS.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/ASSET_STORAGE_OPERATIONS.md).
