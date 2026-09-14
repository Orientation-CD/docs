# 资产管理

资产分区位于 `GET /admin/assets`（模板 `app/templates/admin/assets.html`），列出存储在对象存储中的文件——图片、文档、音频——并让你上传管理后台图片、生成访问 URL 和移除对象。

## 搜索优先

此页面**搜索优先**：在输入查询之前不显示任何结果。使用搜索框按标题、文件名或资产 ID 筛选。结果每页 50 条分页。

## 资产类型与状态

| 类型（`AssetType`） | 含义 |
| --- | --- |
| `IMAGE` | 图片（输入图、参考图、蒙版或结果图）。 |
| `DOCUMENT` | 文档文件。 |
| `AUDIO` | 音频录音。 |

| 状态（`AssetStatus`） | 含义 |
| --- | --- |
| `PENDING_UPLOAD` | 已创建上传意图但尚未完成。 |
| `READY` | 文件已上传，尚未绑定到任务。 |
| `RESERVED` | 被待处理/在途任务预留。 |
| `ACTIVE` | 被已完成任务活跃使用。 |

可见性为 `PRIVATE`（默认）或 `PUBLIC`。

## 资产表格

| 列 | 显示内容 |
| --- | --- |
| Type | IMAGE / DOCUMENT / AUDIO 徽章。 |
| Title | 管理员指定或描述性标题。 |
| Visibility | 私有 / 公开。 |
| Dimensions / duration | 图片宽×高，或音频时长。 |
| Size | 文件大小。 |
| Created | 上传时间。 |
| Asset ID | 内部 UUID。 |

每行提供缩略图、URL 和移除操作。

## 上传管理后台图片

上传是由 `admin.js` 驱动的**两步直传存储**流程：

1. **创建上传意图** —— `POST /admin/assets/upload-intents`，带上期望的标题。服务端返回一个对象键和一个签名上传目标。
2. **从浏览器直接 PUT 文件到对象存储**。
3. **完成上传** —— `POST /admin/assets/{id}/complete`，服务端将对象记录为就绪并提取元数据（尺寸、大小、内容类型）。

| 表单字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Title | text | 是 | 资产标签。 |
| Image | file | 是 | 要上传的图片文件。 |

## 单行操作

### 获取访问 URL（`POST /admin/assets/{id}/url`）

为对象生成可用的 URL。根据存储配置，这是预签名 `GET` URL 或公开 URL；行中显示结果，你可以打开或复制。

### 缩略图（`GET /admin/assets/{id}/thumbnail`）

重定向到（或流式传输）图片的缩略图版本，无需打开完整对象即可快速预览。

### 移除（`POST /admin/assets/{id}/remove`）

移除资产。仍被任务预留/活跃使用的对象受保护；你只能清理不再使用的资产。

## 注意

- 管理后台上传标记为 `ADMIN_IMAGE` 用途；客户任务输入使用其他用途（`DESIGN_JOB_INPUT`、`LEGAL_DOCUMENT`）。
- 切勿公开展示私有资产 URL；使用预签名 URL 并注意其过期时间。
