# OpenAPI 与契约边界

运行后端的 `/openapi.json` 提供机器可读传输 schema，`/docs` 提供 Swagger UI。[固定版本 REST 契约](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/REST_API_INTERFACE.md) 决定业务错误和重试语义，两者用途不同。

## 从选定环境读取

```bash
export API_BASE_URL='http://localhost:<本会话选定端口>'
curl --fail "$API_BASE_URL/openapi.json" -o openapi.json
```

先替换占位符。下载得到的是该环境实际部署/配置的 schema，不一定等于本文档版本；生成客户端时一并记录 `APP_VERSION`/源码版本。下载只读，但 Swagger **Try it out** 可能修改真实数据或触发付费任务。

## 包含的接口

生产契约涵盖健康、身份/同意、Workflow、兼容 Job、Asset、工作区/Project、提示词、支付/退款回调和语音交接。schema 有某操作，不代表某 Feature 已激活。

保留精确路径参数名、body discriminator、类型化输入输出、参数和成功状态。新集成使用 `POST /v1/workflows`，仍支持的 `/v1/design-jobs` 兼容操作另有标识。可运行能力由发现接口与实时权益判定。

## 不同认证边界

| 接口面 | 凭据 |
| --- | --- |
| 多数手机 `/v1` | access token Bearer header |
| refresh/logout | body 中 refresh token |
| 法律、发现、邀请公开预览 | 逐端点声明的公开访问 |
| 报告/演示浏览器查看 | 短时签名 `token` query capability |
| 支付/退款 webhook | 对原始请求字节的平台签名 |
| exchange 后 `/voice-upload/*` | 受限 HttpOnly cookie，写请求还需准确 Origin/CSRF |
| `/admin/*` | Admin 浏览器会话与 CSRF，不在公开 OpenAPI 内 |

不要把通用 Bearer 放进对象存储 form、capability URL 或 webhook。Admin JSON/局部页面端点不会因为返回 JSON 就变成公开客户端 API。

## 错误和幂等

请求形状错误为 `422` 校验数组；稳定业务错误为 `detail.code`、展示/诊断消息和可选元数据。逐端点 REST 错误表决定处理/重试：OpenAPI 可能自动列出框架 `422`，却没有穷举所有业务状态。

要求 `Idempotency-Key` 的动作在网络不确定时，使用原 key 和相同归一化 body 重放。新 key 是新动作，可能新增预留、支付或模型调用；同 key 改内容是冲突。生成客户端的通用 HTTP 异常类型不能替你决定付费重试。

## 条件 mock 与历史兼容

`MOCK_PAYMENT_ENDPOINTS_ENABLED` 控制本地完成辅助端点；抖音还有依模式注册的 mock。独立 mock provider 不运行在主 API 内。这些是测试契约，不是生产客户端能力，精确行为看固定 mock 文档/测试。

兼容路径不代表退休字段仍可执行：部分历史 Workflow 字段明确要求重新提交。以当前 discriminator/schema 为准，见[API 索引](/zh/reference/rest-api)和[Workflow 生命周期](/zh/reference/flows/design-job-lifecycle)。

## 生成客户端

用团队固定版本 generator 读取已保存并标注版本的 schema；生成代码与手写业务/仓储逻辑分离。人工检查 discriminated union、nullable、逐端点状态（Asset/语音 session 新建 `201`、重放 `200`；Workflow 两者都是 `202`）、capability URL 和存储 multipart **POST**。生成器不会替你实现同意 UX、权益检查、安全付费重试和平台支付桥。

## 源码依据

已按[记录的源码版本](/zh/reference/source-revisions)核对。

- [规范 REST 契约](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/REST_API_INTERFACE.md)
- [应用路由注册](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/main.py)
- [公开 schema](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py)
- [条件 mock 契约](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/MOCK_API_INTERFACE.md)
