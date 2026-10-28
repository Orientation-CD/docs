# Asset与持久化输入存储

Asset UUID 标识已核验的内容。对象 key、精确版本、ETag、SHA-256 由服务端决定；签名 URL 是临时访问能力。当前模态包括 Image、Audio、Document、Video。修改上传或清理前，先读[上传与归档全链路](/zh/reference/flows/asset-upload-flow)。

## 文件 → 已核验Asset → 有归属的执行输入

| 边界 | 实际证明了什么 | 状态/效果 |
| --- | --- | --- |
| `POST /v1/assets/upload-intents` | 已认证的角色、MIME、大小与动作 key 声明 | 返回精确 multipart POST 字段，尚未上传字节 |
| 对象存储 multipart POST | 存储按签名策略接收了字节 | 不表示 Asset 已完成 |
| `POST /v1/assets/{asset_id}/complete` | 核验真实内容、解码元数据和精确对象身份 | 普通客户输入变为有持久化过期时间的 READY |
| 准入前准备 | 源版本复制到私有持久输入位置并再次核验 | Asset ID不变，归档凭据COMPLETED；接受任务前仍为READY |
| 最终准入事务 | 独占归属、角色/pin、执行与账务校验全部通过 | ACTIVE、无过期、不可变执行pin与Job归属共同提交 |

向 `upload.url` **只发送返回的 multipart 字段**，不能把应用 Bearer token 附在存储请求中。使用 Asset ID 前先完成 complete。已完成的 intent 精确重放可以返回 `upload:null`，不允许替换原字节。

图片角色包括 `image`、`masked_image`、`reference_image`；音频用 `recording`；客户追加 PPTX 用 `attachment`。同款自定义视频使用 `VIDEO`、`DESIGN_JOB_INPUT`、`reference_video`，最大100 MiB、120秒。公开端口清单见[视频](/zh/backend/video)。后台参考媒体有独立的授权purpose。

## 冻结前先归档

`asset_input_archival.py` 保存源身份及 `design-jobs/inputs/{asset_id}/` 下的目的位置，先提交有界复制claim，再在不持有DB锁的情况下进行精确版本复制、哈希核验。发布时验证claim围栏并移动原Asset定位，内容和UUID不变。最终准入事务再次验证凭据，才激活输入并冻结物理pin。

归档凭据COMPLETED不表示任务已接受。后续Feature、额度或余额检查拒绝时，Asset仍是会过期的READY；只要仍符合条件，就能复用相同有效输入/凭据。复制回执丢失时根据记录的目的位置协调，删除凭据强制再复制会破坏此保护。`ASSET_ARCHIVE_IN_PROGRESS` 是受约束的并发冲突；`ASSET_STORAGE_UNAVAILABLE` 应恢复存储后重试相同逻辑请求。精确内容变化则需要新的有效输入或恢复记录的版本。

借用的ACTIVE输入、已接受的执行pin不会被重写。结果复用通过 `/v1/assets/{source_asset_id}/design-input-copies` 创建独立临时输入，再由新请求完成自己的归档/激活。新报告不能再次消费其他Job已经拥有的追加PPTX。

## 保留、清理与修复

| 对象族 | 保留依据 |
| --- | --- |
| 临时上传/复制 | Asset持久化过期时间、upload intent与复制claim |
| 规范自有输入 | 所属Job、Operation pin及归档凭据/墓碑 |
| 已发布输出 | 冻结输出身份和保留中的消费者引用 |
| 提示词参考视频/封面 | 活跃模板引用和受保护Asset元数据 |

清理必须在复制稳定前保留旧源证据和规范目的位置。不能把临时上传生命周期规则套到 `design-jobs/inputs/`。公开Asset列表/删除仍为管理员接口。

历史已完成任务的输入有明确的、默认只检查的修复命令：

```bash
python -m app.assets.input_asset_repair --job-id <job-uuid> --asset-id <asset-uuid>
```

使用目标环境已有凭据和配置；命令不扫描目标、不启动服务。先审阅 `eligible`，再只对明确的那一对ID添加 `--apply`。已执行pin、Job状态、输出和收费不变；重放可返回 `already_repaired`。归属歧义需要操作人员决定，不能随意挑一个消费者。精确资格和错误见[运维恢复](/zh/deploy/production)及固定版本存储手册。

## 存储部署边界

`S3_ENDPOINT` 是服务端地址，`S3_PRESIGN_ENDPOINT` 必须能从手机/浏览器访问。MinIO使用`s3v4`，已核验OSS兼容路径使用`s3`。除明确发布的法律正文外，bucket保持私有。版本管理、CORS、HEAD/GET/copy/delete权限及版本保留必须支持完整归档生命周期，不能只验证直接上传成功。

---

源码依据 · backend `e59716c8`: [app/assets/asset_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/assets/asset_api.py) · [app/assets/asset_completion.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/assets/asset_completion.py) · [app/assets/asset_input_archival.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/assets/asset_input_archival.py) · [documents/ASSET_STORAGE_OPERATIONS.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/documents/ASSET_STORAGE_OPERATIONS.md).
