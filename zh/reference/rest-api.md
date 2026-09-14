# REST API 参考

本页是 YuanZhu AI 移动端 API 的**完整路由表**，直接从
`app/api.py`、`app/asset_api.py`、`app/billing_api.py`、
`app/workspace_api.py`、`app/referral_api.py` 和
`app/account_lifecycle_api.py` 派生。下面的路径是 FastAPI 服务的**精确**路径（路由挂载在应用根；版本前缀为
`/v1`）。

要查看实时请求/响应 schema，请使用生成的
[OpenAPI 文档](/reference/openapi)。这些路由背后的数据参见
[数据模型](/reference/data-model)。

## 约定

- **内部挂载：** FastAPI 应用将每个移动端路由挂载在根，因此下面的路径是 uvicorn 服务的**精确**路径——例如 `/v1/me`、
  `/v1/design-jobs`。本地（docker-compose）你直接在
  `http://localhost:8000/v1/...` 访问它们。
- **公开/边缘前缀：** 生产环境中 API 位于网关之后，网关在 `/api` 前缀下暴露相同路由，因此小程序调用
  `/api/v1/me`，边缘将其映射到 `/v1/me`。下面的路由表列出内部 `/v1` 路径；生产 URL 加 `/api` 前缀。
- **认证：** 大多数路由要求
  `Authorization: Bearer <access_token>`（参见
  [认证](/backend/authentication)）。公开路由已标注。
- **幂等：** 变更上传/推荐/支付的路由接受
  `Idempotency-Key` 头（8–128 字符）。重放该键返回原始结果而非重复执行。
- **错误：** 所有错误共享信封
  `{"detail": {"code": "MACHINE_READABLE_CODE"}}`。
- **内容类型：** 请求/响应 body 为 `application/json`，报告 HTML 路由和管理表单除外。

## 健康检查与元信息

| 方法 | 路径 | 认证 | 用途 |
| --- | --- | --- | --- |
| GET | `/health/live` | 公开 | 进程存活 |
| GET | `/health/ready` | 公开 | Postgres + Redis 可达 |
| GET | `/openapi.json` | 公开 | 生成的 OpenAPI schema |
| GET | `/metrics` | 内部 | 紧凑性能快照 |
| GET | `/configuration/export` | 管理员 | 导出部署配置（`config_export.py`） |

## 认证（`app/api.py` `auth_router`）

| 方法 | 路径 | 认证 | 用途 |
| --- | --- | --- | --- |
| POST | `/v1/auth/register` | 公开，限流 | 注册手机号+密码账号，返回令牌（201） |
| POST | `/v1/auth/login` | 公开，限流 | 手机号 + 密码登录，返回令牌 |
| POST | `/v1/auth/wechat-login` | 公开，限流 | 用 `wx.login` code 换取 OpenID，返回令牌 |
| POST | `/v1/auth/refresh` | 刷新令牌 | 轮换访问令牌 |
| POST | `/v1/auth/logout` | bearer | 吊销当前会话（204） |
| POST | `/v1/auth/reactivate` | 公开，限流 | 用手机号+密码恢复已停用账号 |
| POST | `/v1/auth/wechat-reactivate` | 公开，限流 | 通过微信 code 恢复已停用账号 |
| POST | `/v1/me/deactivate` | bearer | 开启停用宽限期（204） |

## 个人信息、工作区、提示词、报告发现（`app/api.py` `design_router`）

| 方法 | 路径 | 认证 | 用途 |
| --- | --- | --- | --- |
| GET | `/v1/me` | bearer | 当前用户资料 + 余额 |
| PATCH | `/v1/me` | bearer | 更新资料（显示名等） |
| GET | `/v1/me/workspaces` | bearer | 列出可访问工作区 + 当前选择 |
| GET | `/v1/report-items?workspace_id=` | bearer | 发现可用报告章节 |
| GET | `/v1/prompt-templates` | bearer | 列出活跃提示词模板 |
| GET | `/v1/prompt-templates/{prompt_template_name}` | bearer | 一个提示词模板的变量/选项 |

## 设计作业（`app/api.py` `design_router`）

| 方法 | 路径 | 认证 | 用途 |
| --- | --- | --- | --- |
| POST | `/v1/design-jobs` | bearer | 创建 + 预留作业；返回 `202 Accepted` |
| GET | `/v1/design-jobs` | bearer | 列出调用者的作业（分页） |
| GET | `/v1/workspace/design-jobs` | bearer | 列出当前工作区中的作业 |
| GET | `/v1/design-jobs/{design_job_id}` | bearer | 一个作业的状态 + 进度 |
| GET | `/v1/design-jobs/{design_job_id}/report` | bearer | 渲染的 HTML 报告（`HTMLResponse`） |
| GET | `/v1/design-jobs/{design_job_id}/result-file` | bearer | 下载结果文件 |
| DELETE | `/v1/design-jobs/{design_job_id}` | bearer | 删除终态作业（204） |

## 资产（`app/asset_api.py`，前缀 `/v1/assets`）

| 方法 | 路径 | 认证 | 用途 |
| --- | --- | --- | --- |
| POST | `/v1/assets/upload-intents` | bearer + `Idempotency-Key` | 签发预签名直传表单（201，重放时 200） |
| POST | `/v1/assets/{asset_id}/complete` | bearer | 验证上传并完成资产 |
| GET | `/v1/assets` | bearer | 列出调用者的资产（分页） |
| GET | `/v1/assets/{asset_id}` | bearer | 资产元数据 + 预览 |
| DELETE | `/v1/assets/{asset_id}` | bearer | 删除资产（204） |

## 计费与支付（`app/billing_api.py`，前缀 `/v1`）

| 方法 | 路径 | 认证 | 用途 |
| --- | --- | --- | --- |
| GET | `/v1/billing/catalog` | bearer | 套餐 + 积分包 |
| POST | `/v1/subscriptions` | bearer | 创建订阅支付订单 |
| POST | `/v1/token-purchases` | bearer | 创建积分包支付订单 |
| GET | `/v1/payments?type=` | bearer | 支付历史 |
| GET | `/v1/payments/{payment_order_id}` | bearer | 一个订单状态 |
| POST | `/v1/payments/{payment_order_id}/pay` | bearer | （重新）触发 JSAPI 支付参数 |
| POST | `/v1/payments/{payment_order_id}/close` | bearer | 关闭未支付订单 |
| POST | `/v1/payments/{payment_order_id}/refunds` | bearer | 申请退款 |
| GET | `/v1/refunds` | bearer | 退款历史 |
| GET | `/v1/workspace` | bearer | 当前企业工作区管理 |
| POST | `/v1/workspace/invitations` | bearer（所有者） | 创建企业邀请 |
| GET | `/v1/workspace/invitations` | bearer | 列出邀请 |
| POST | `/v1/workspace/invitations/{invitation_id}/accept` | bearer | 接受邀请 |
| POST | `/v1/workspace/invitations/{invitation_id}/decline` | bearer | 拒绝邀请（204） |
| DELETE | `/v1/workspace/invitations/{invitation_id}` | bearer（所有者） | 撤销邀请（204） |
| DELETE | `/v1/workspace/members/{member_user_id}` | bearer（所有者） | 移除成员（204） |

### 支付回调（公开，服务器到服务器）

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| POST | `/v1/webhooks/wechat/payments` | 微信支付支付通知（验签） |
| POST | `/v1/webhooks/wechat/refunds` | 微信支付退款通知 |

### mock 支付助手（仅本地）

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| POST | `/mock/payments/{payment_order_id}/complete` | 模拟支付成功 |
| POST | `/mock/refunds/{refund_order_id}/complete` | 模拟退款成功 |

## 工作区与分享邀请（`app/workspace_api.py`，前缀 `/v1`）

| 方法 | 路径 | 认证 | 用途 |
| --- | --- | --- | --- |
| GET | `/v1/workspaces/{workspace_id}` | bearer | 工作区详情 + 成员 |
| GET | `/v1/workspaces/{workspace_id}/token-detail` | bearer | 工作区积分台账详情 |
| POST | `/v1/workspaces` | bearer | 创建企业工作区 |
| PATCH | `/v1/workspaces/{workspace_id}` | bearer（所有者） | 重命名 / 更新工作区 |
| POST | `/v1/workspaces/{workspace_id}/invitations` | bearer（所有者） | 邀请成员 |
| POST | `/v1/workspaces/{workspace_id}/share-invitations` | bearer（所有者） | 创建分享链接 |
| GET | `/v1/workspaces/{workspace_id}/share-invitations` | bearer | 列出分享链接 |
| DELETE | `/v1/workspaces/{workspace_id}/share-invitations/{invitation_id}` | bearer（所有者） | 撤销分享链接（204） |
| POST | `/v1/share-invitations/preview` | 公开，IP 限制 | 预览分享链接 |
| POST | `/v1/share-invitations/accept` | bearer + `Idempotency-Key` | 接受分享链接 |
| DELETE | `/v1/workspaces/{workspace_id}/membership` | bearer | 离开工作区 |
| DELETE | `/v1/workspaces/{workspace_id}/members/{member_user_id}` | bearer（所有者） | 移除成员（204） |

## 推荐与奖励（`app/referral_api.py`，前缀 `/v1`）

| 方法 | 路径 | 认证 | 用途 |
| --- | --- | --- | --- |
| POST | `/v1/referral-invitations` | bearer + `Idempotency-Key` | 创建推荐凭证（201） |
| POST | `/v1/referral-invitations/preview` | 公开，IP 限制 | 预览凭证 |
| POST | `/v1/referral-invitations/accept` | bearer + `Idempotency-Key` | 接受（先到先得归因） |
| GET | `/v1/rewards` | bearer | 列出调用者的奖励 |
| POST | `/v1/rewards/claim` | bearer + `Idempotency-Key` | 认领奖励积分 |

## 法律文档（`app/api.py` `legal_router`，前缀 `/v1/legal-documents`）

| 方法 | 路径 | 认证 | 用途 |
| --- | --- | --- | --- |
| GET | `/v1/legal-documents/current` | bearer | 列出当前要求的法律文档 |
| GET | `/v1/legal-documents/{slug}` | bearer | 获取一份法律文档 + 接受状态 |

## 管理路由

管理路由是 `/admin` 下服务端渲染的 HTML（登录、用户、模型提供商、提示词模板、计费目录、性能）。它们使用签名浏览器会话 + CSRF 令牌，而非 bearer JWT，且大多排除在 OpenAPI schema 之外（`include_in_schema=False`）。参见
[认证](/backend/authentication#admin-sessions-and-csrf)。

## 版本管理

除固定 `/v1` 前缀外，没有 URL 版本协商。破坏性变更通过添加新字段（增量 Pydantic 模型）交付，必要时添加新前缀；客户端应忽略未知字段。

## 延伸阅读

- [OpenAPI](/reference/openapi) —— 访问 `/openapi.json` 和关键 schema。
- [数据模型](/reference/data-model) —— 这些路由背后的表。
- [配置参考](/reference/configuration) —— 门控行为的环境变量。
