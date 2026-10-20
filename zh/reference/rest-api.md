# REST API 索引

本页按业务领域组织联调入口。[完整固定版本 REST 契约](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/REST_API_INTERFACE.md) 是精确字段、成功/重放状态和可达业务错误的规范。Admin 内部接口与条件 mock 有各自边界。

## 约定与错误

`API_BASE_URL` 指向选定环境，例如 `http://localhost:<负责人选定端口>`；真实客户端使用 HTTPS。多数 `/v1` 请求需要 `Authorization: Bearer <access_token>`，例外见各节。幂等 key 按动作持久保存（上传 intent 为 8–128 字符），超时/重启后重放不能换 key。

业务错误形如 `{"detail":{"code":"STABLE_CODE","message":"..."}}`，按 code 分支，不匹配人类消息。请求形状 `422` 为校验数组。`409 TRANSIENT_CONFLICT` 带 `Retry-After: 1`，幂等重试保留原 key。SDK 把错误标为 transient，不等于可重复非幂等/付费动作。

## 身份与发现

| 方法/路径 | 认证与用途 |
| --- | --- |
| `GET /health/live`、`GET /health/ready` | 公开；`200`，ready 依赖不可用时 `503` |
| `GET /v1/legal-documents/current`、`/v1/legal-documents/{document_id}/content` | 公开的当前不可变文档及正文 |
| `POST /v1/auth/register`、`/login`、`/wechat-login`、`/douyin-login` | 公开限流认证；注册/平台登录提交当前同意 IDs |
| `POST /v1/auth/refresh`、`/logout` | body 中 refresh token；轮换或撤销会话 |
| `GET/PATCH /v1/me`、`POST /v1/me/deactivate` | Bearer 资料与注销 |
| `POST /v1/auth/reactivate`、`/wechat-reactivate`、`/douyin-reactivate` | 对应凭据重新激活 |
| `GET /v1/billing/features`、`/v1/billing/catalog` | 公开 Feature/目录；catalog 为兼容接口，支持 `200`/`304` |
| `GET /v1/design-workflows` | 公开、已 deprecated 的 `/v1/billing/features` 别名，目录与 ETag 行为相同 |
| `GET /v1/prompt-templates`、`/v1/prompt-templates/{prompt_template_name}` | Bearer；当前精确模板名/字段契约 |
| `GET/POST /v1/prompt-presets`、`PATCH/DELETE /v1/prompt-presets/{preset_id}` | 用户自己的提示词选择预设 |

```bash
curl --fail "$API_BASE_URL/v1/legal-documents/current?locale=zh-CN"
curl --fail "$API_BASE_URL/v1/billing/features"
```

`503 LEGAL_DOCUMENTS_UNAVAILABLE` 阻止合法注册；`409 LEGAL_ACCEPTANCE_REQUIRED` 要重新拉取、展示并取得新同意，不要在示例中编造可用文档 ID。

## 工作区与私有 Project

| 方法/路径 | 用途 |
| --- | --- |
| `GET /v1/me/workspaces`、`/history-workspaces`、`/workspace-removal-notices` | 当前访问、离开历史和移除通知 |
| `GET/PATCH /v1/workspaces/{workspace_id}`、`POST /v1/workspaces` | 详情、按 owner 规则更新/创建 |
| `GET /v1/workspaces/{workspace_id}/overview`、`/token-detail` | 授权概览/财务明细 |
| `GET /v1/project-statuses` | Bearer 状态目录，成败受启用边界控制 |
| `GET/POST /v1/workspaces/{workspace_id}/projects` | 创建者私有项目集合 |
| `PUT /v1/workspaces/{workspace_id}/projects/default` | 保存本人默认项目 |
| `GET/PATCH /v1/workspaces/{workspace_id}/projects/{project_id}` | 授权详情/创建者修改 |
| `POST /v1/workspaces/{workspace_id}/projects/{project_id}/delete` | 有守卫的删除流程，不是无条件硬删除 |
| `POST/GET /v1/workspaces/{workspace_id}/share-invitations` | 企业 owner 创建/列出；列表 `200` 不返回 bearer 明文 |
| `POST /v1/share-invitations/preview`、`/accept` | 公开预览；认证原子接受 |
| `DELETE /v1/workspaces/{workspace_id}/share-invitations/{invitation_id}` | owner 撤销，`204` |
| `POST /v1/workspaces/{workspace_id}/invitations`、`DELETE /v1/workspaces/{workspace_id}/members/{member_user_id}` | owner 手机邀请/移除 |
| `DELETE /v1/workspaces/{workspace_id}/membership` | 成员离开 |

单数 `/v1/workspace*` 仍保留邀请收件箱/接受/拒绝和 owner 兼容操作，不能代替选定空间的授权。`/v1/referral-invitations*`、`/v1/rewards*` 是营销归因/领取，不会加入企业。

## Asset 准入

| 方法/路径 | 认证与成功响应 |
| --- | --- |
| `POST /v1/assets/upload-intents` | Bearer + key，新建 `201` / 重放 `200`，返回 Asset 身份和可选签名 POST form |
| `POST /v1/assets/{asset_id}/complete` | owner/Admin Bearer，已验证完成 `200` |
| `POST /v1/assets/{source_asset_id}/design-input-copies` | 授权 Bearer + key，新建 `201` / 重放 `200`，创建独立可复用输入 |
| `GET /v1/assets/{asset_id}` | 安全元数据；预览签名会过期 |
| `GET /v1/assets` | 仅管理员集合 |
| `DELETE /v1/assets/{asset_id}` | 仅管理员受控删除，`204` |

```bash
curl --fail --request POST "$API_BASE_URL/v1/assets/upload-intents" \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header "Idempotency-Key: $UPLOAD_KEY" --header 'Content-Type: application/json' \
  --data '{"type":"IMAGE","purpose":"DESIGN_JOB_INPUT","role":"image","original_filename":"room.jpg","content_type":"image/jpeg","size_bytes":12345}'
```

`12345` 仅示意，必须填写真实字节数。把二进制 file 和全部 `upload.fields` POST 到 `upload.url`，不带 API Bearer。再 complete 并要求 `READY`，见[上传调用链](/zh/reference/flows/asset-upload-flow)。

## Workflow 与兼容 Job

| 方法/路径 | 含义 |
| --- | --- |
| `POST /v1/design-job-quotes` | 已退休，认证后返回 `409 WORKFLOW_UPDATED`；新流程跳过报价回合 |
| `POST /v1/workflows` | Bearer + 持久 key，类型化提交；新接受与相同重放都为 `202` |
| `GET /v1/workflows`、`/v1/workflows/{workflow_id}` | Bearer 历史/状态，`200`；公开 ID 即 Job ID |
| `POST /v1/workflows/{design_job_id}/retry` | 原创建者 + retry key，`202`，同 Job 持久重试回执 |
| `POST /v1/workflows/{design_job_id}/move` | 创建者/当前访问，expected-source 与目标项目 |
| `DELETE /v1/workflows/{design_job_id}` | 创建者受控删除 |
| `GET /v1/workflows/{design_job_id}/result-file` | Bearer 授权，图片流或新签名产物重定向 |
| `GET /v1/workflows/{design_job_id}/report`、`/presentation` | query token 浏览器 capability，不是普通 Bearer 请求 |
| `GET /v1/workspace/workflows?workspace_id=<UUID>` | 显式选定空间的 owner 集合，workspace query 必填 |

图片请求示例，所有 UUID 都需替换为真实可访问身份：

```json
{
  "workspace_id": "22222222-2222-2222-2222-222222222222",
  "type": "colored_floor_plan",
  "name": "客厅方案",
  "inputs": [{"kind":"asset","port":"images","role":"primary","asset_id":"00000000-0000-0000-0000-000000000001"}],
  "prompts": {"prompts":[{"name":"feature_colored_floor_plan","fields":[]}]}
}
```

实际 Feature、模板、必需角色以发现为准，示例不保证所有环境都配置该 Feature。canonical role 为 `primary`、`mask`、`reference`，服务端核对不可变上传角色。`/v1/design-jobs` 仍是进程内兼容适配器，并保留适用历史/状态/重试/产物操作；新客户端使用 Workflow，退休字段可能要求重新提交。

文本摘要/文案、有序语音、Design Report/PPTX 和视频各有独立 discriminator body。视频 API 允许一个人物图、0–12 场景、可选录音和最多 20,000 字非空脚本；当前小程序只允许一个场景/1,000 字，供应商包还可能更严格。schema 接受不等于供应商接受。

## 支付与平台事件

| 方法/路径 | 认证与行为 |
| --- | --- |
| `POST /v1/subscriptions`、`/v1/token-purchases` | Bearer + key，服务端冻结价格/权益 |
| `GET /v1/payments`、`/v1/payments/{payment_order_id}` | 购买者 Bearer，`200` 权威本地状态 |
| `POST /v1/payments/{payment_order_id}/pay`、`/close`、`/reconcile` | 恢复/关闭/对账受服务端规则约束 |
| `POST /v1/payments/{payment_order_id}/refunds` | 购买者 Bearer + key，受控全额退款 |
| `GET /v1/refunds`、`POST /v1/refunds/{refund_order_id}/reconcile` | 购买者状态；显式 reconcile 仅适用抖音 |
| `POST /v1/webhooks/wechat/payments`、`/refunds` | 微信 APIv3 验签，无手机 Bearer |
| `POST /v1/webhooks/douyin/payment`、`/refund`、`/refund-application` | 抖音 RSA/原始 body 验签 |

显式支付/退款 `/reconcile` 使用抖音网关，不是通用微信手工对账 API。客户端支付成功不发积分。过期 pending 保持“确认中”，直到服务端证据结算/关闭。退款 API 已实现，小程序当前无用户申请入口。

## 语音浏览器与内部接口

`POST /v1/voice-upload-sessions` 要 owner Bearer + key（`201`/`200`），owner 通过 `GET /v1/voice-upload-sessions/{session_id}` 查状态。浏览器 `/voice-upload/exchange` 消费一次性 code，签发受限 cookie。session/files intent/complete 需要 cookie，写还需准确 Origin/CSRF，不暴露通用 API 会话。

`/admin/*` 使用浏览器会话/CSRF，排除公开 OpenAPI；条件 `/mock/*` 和独立 mock provider 是测试接口。实现动作前阅读 [OpenAPI 边界](/zh/reference/openapi)与完整契约的逐端点错误表。

## 生成的完整路由索引

此清单记录声明的默认成功状态与 deprecated 元数据，不声明授权，也不穷举运行/重放响应。相关语义以上方人工说明和固定 REST 契约为准。

<!--@include: ../../.vitepress/generated/api.zh.md-->

## 源码依据

已按[记录的源码版本](/zh/reference/source-revisions)核对。

- [方法/路径/认证/状态规范与错误表](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/REST_API_INTERFACE.md)
- [公开请求响应 schema](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py)
- [Asset 准入路由](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/assets/asset_api.py)
- [Workflow 与兼容路由](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/api.py)
