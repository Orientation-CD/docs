# OpenAPI

FastAPI 从装饰路由自动生成 OpenAPI（Swagger）文档。本页解释如何访问它、包含什么和不包含什么，以及你会遇到的关键请求/响应 schema。

## 访问文档

API 运行时：

```
http://localhost:8000/openapi.json     # 原始 JSON schema
http://localhost:8000/docs            # Swagger UI 交互式 playground
```

文档标题和版本在 `app/main.py` 中设置（`FastAPI(title=...,
version="0.3.0")`）。生产环境中同一文档在边缘前缀下服务，例如
`https://api.example.com/api/openapi.json`。

## 包含什么

生成的 schema 覆盖每个带 `response_model` 和开放声明的路由：

| 标签 | 路由 | 说明 |
| --- | --- | --- |
| `authentication` | `auth_router` | 注册、登录、wechat-login、刷新、登出 |
| `design` | `design_router` | 个人信息、工作区、提示词模板、设计作业、报告发现 |
| `assets` | `asset_api.router` | 上传意向、完成、列表/读取/删除 |
| `billing` | `billing_api.router` | 目录、订阅、积分购买、支付、退款、工作区 |
| `wechat-webhooks` | `webhook_router` | 支付/退款通知（服务器到服务器） |
| `workspaces` | `workspace_api.router` | 工作区 CRUD、分享邀请 |
| `rewards` | `referral_api.router` | 推荐邀请、奖励 |
| `legal` | `legal_router` | 当前法律文档 |
| `health` | 根 `router` | `/health/live`、`/health/ready` |

## 排除什么

以 `include_in_schema=False` 声明的路由**不**发布。这些是管理服务端渲染表单操作（登录、登出、用户暂停/恢复/归档、提供商和提示词管理表单），因为它们是带 CSRF 令牌的 HTML 表单 POST，而非 JSON API。它们仍然工作，但记录在
[认证](/backend/authentication)而非此处。

`/mock/*` 支付助手仅在 `MOCK_PAYMENT_ENDPOINTS_ENABLED=true` 时挂载；它们只在那时出现在 schema 中。

## playground 中的认证

受保护路由声明了一个 `BearerAuth` 安全方案（通过
`HTTPBearer`）。在 Swagger UI 中你可以粘贴一个真实访问令牌到
**Authorize** 对话框：

```
Authorization: Bearer <access_token>
```

管理 Web 路由**不**使用此方案——它们依赖
`/admin/login` 设置的签名浏览器 Cookie。

## 关键 schema

`app/models.py` 中的这些 Pydantic 模型塑造最重要的请求和响应。

### 认证

- `RegisterRequest` / `TokenResponse` —— 注册（手机号 + 密码）并接收
  `{ access_token, refresh_token, ... }`。
- `WeChatLoginResponse` —— 微信登录结果。
- `UserResponse` —— 当前用户资料 + 积分余额。

### 设计作业

- `DesignJobCreate` —— 创建请求（作业类型、资产 ID、提示词选择）。
- `DesignJobResponse` —— 一个作业：状态、进度、结果、错误代码。
- `DesignJobListResponse` —— 分页列表。
- `PromptTemplateListResponse` / `PromptTemplateResponse` —— 带变量和选项的可选提示词。
- `ReportItemDiscoveryResponse` —— 可用报告章节。

### 资产

- `AssetUploadIntentCreateRequest` / `AssetUploadIntentResponse` —— 请求和
  预签名上传表单。
- `AssetCompletionResponse` —— 最终资产元数据。
- `AssetListResponse` / `AssetResponse` —— 列表和读取。

### 计费

- `BillingCatalogResponse` —— 套餐 + 积分包。
- `PaymentOrderResponse` / `PaymentHistoryResponse` —— 订单生命周期。
- `RefundOrderResponse` —— 退款状态。

### 工作区与推荐

- `WorkspaceListResponse` / `WorkspaceDetailResponse` —— 工作区摘要。
- `ReferralInvitationCreateResponse` / `RewardListResponse` /
  `RewardClaimResponse` —— 推荐流程。

## 幂等

几个 POST 路由要求 `Idempotency-Key` 头（8–128 字符）。这在操作上声明，因此 playground 将其显示为上传意向、推荐创建/接受、奖励认领和支付操作的必需头参数。

## 生成客户端 SDK

因为文档是标准 OpenAPI，你可以从 `/openapi.json` 生成类型化客户端，例如：

```bash
# 下载 schema
curl http://localhost:8000/openapi.json -o openapi.json

# （示例）生成 TypeScript 客户端
npx openapi-typescript openapi.json -o api.d.ts
```

仅增量 API 演进意味着生成的客户端应忽略未知字段。

## 延伸阅读

- [REST API](/reference/rest-api) —— 完整路由表。
- [数据模型](/reference/data-model) —— 背后的表。
