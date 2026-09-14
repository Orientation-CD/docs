# 法律文档

法律文档页面位于 `GET /admin/legal-documents`（模板 `app/templates/admin/legal_documents.html`），发布客户必须接受的服务条款和隐私政策版本，并跟踪有多少用户接受了每个版本。

## 文档类型

恰好有两种法律文档类型（`LegalDocumentType`）：

| 类型 | 代码 | 用途 |
| --- | --- | --- |
| 服务条款 | `terms` | 产品条款。 |
| 隐私政策 | `privacy` | 隐私政策。 |

每种类型同一时间只能有**一个当前版本**活跃；旧版本保留用于接受历史。

## 上传新版本

上传使用相同的两步直传存储流程（上传意图 → PUT → 完成）。通过 `POST /admin/legal-documents/upload-intents` 提交元数据，并通过 `POST /admin/legal-documents/{id}/complete` 完成。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Document type | select | 是 | `terms` 或 `privacy`。 |
| Version | text | 是 | 版本标签；每种文档类型内必须唯一。重复版本返回 `LEGAL_DOCUMENT_VERSION_EXISTS`。 |
| Locale | text | 是 | BCP-47 语言标签，例如 `zh-CN`、`en`。 |
| Title | text | 是 | 显示标题。 |
| Effective at | datetime | 是 | 版本生效时间。 |
| File | file | 是 | UTF-8 纯文本内容，最大 **1 MiB**（`LEGAL_DOCUMENT_MAX_BYTES = 1024*1024`，内容类型 `text/plain; charset=utf-8`）。 |
| Set as current on upload | checkbox | 否 | 如果勾选，此版本立即成为活跃版本。 |

## 文档表格

| 列 | 显示内容 |
| --- | --- |
| Type | terms / privacy。 |
| Version | 版本标签。 |
| Locale | 语言。 |
| Title | 文档标题。 |
| Effective at | 生效时间。 |
| Accepted | 有多少用户接受了此版本。 |
| Current | 标记当前活跃版本的徽章。 |

## 单行操作

### 设为当前（`POST /admin/legal-documents/{id}/current`）

将此历史版本提升为当前版本。客户之后必须接受新活跃版本。每种文档类型同一时间只能有一个当前版本。

### 查看文件（`GET /admin/legal-documents/{id}/file`）

流式传输存储的文档文本，让你在提升之前审阅确切措辞。

### 移除（`POST /admin/legal-documents/{id}/remove`）

移除一个版本。你只能移除**非当前**且**无用户接受过**的版本——已接受和当前文档受保护，以保持法律接受轨迹完整。

## 接受跟踪

每次接受都被记录（`LegalDocumentAcceptance`）。每个版本的"Accepted"计数回答"有多少用户在此版本上？"并在你发布新版本时显示（让你了解执行需要多长时间）。

## 发布流程

1. 上传新版本（可选立即"设为当前"）。
2. 通过 **view file** 审阅。
3. 如果上传时未设为当前，准备好后 **set current**。
4. 在用户下次登录重新接受时监控 Accepted 计数。
