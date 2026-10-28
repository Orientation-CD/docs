# 语音总结与手机文件接力

`voice_summary` 使用共享多模态文本 Operation 处理 1–3 个已完成录音 Asset，输出可复用 Markdown Document。标准带类型结果中同时提供正文及签名 Asset 元数据。录音内容是资料，不是指令。

## 准备录音

使用普通直传意图：`type: AUDIO`、`purpose: DESIGN_JOB_INPUT`、`role: recording`。支持的 MPEG、WAV、AAC、M4A 媒体类型见 [REST 合同](/zh/reference/rest-api)。每段最多 25,000,000 字节、核验时长最多 120 分钟；完成接口测量实际内容，不信任文件扩展名。

按语音 Workflow 的精确端口/角色结构提交 `/v1/workflows`，保留录音顺序并显式指定工作空间。轮询响应 URL。接受后的提示词、输入与执行配置在重试时保持冻结。

## 手机文件接力

小程序原生能力无法选择已有手机录音时，后端可签发受限浏览器会话：

1. 登录客户端使用 `workspace_id`、`available_slots`（1–3）创建 `/v1/voice-upload-sessions`。
2. 打开返回的 `upload_page_url`，将短期 handoff code 兑换为受限浏览器 cookie 与 CSRF token。
3. 浏览器按 slot 请求上传意图，直传对象存储，再完成关联 Asset。
4. 原登录客户端轮询会话取得 `ready_assets`，然后提交普通语音 Workflow。

浏览器会话不能浏览用户账户或提交任意任务，受 Origin、cookie 与 CSRF 检查约束。上传、意图签发与取回截止时间不同，取回窗口不会延长上传期限。使用响应中的限制和时间戳，不能自行推断有效期。

## 开启与排查

可选流程要求 `VOICE_UPLOAD_ENABLED`、合适的公开 HTTPS origin、生产 Secure cookie，以及兼容会话期限的上传表单/Asset 保留时长。会话状态保存在 Redis。存储/Redis 故障是可恢复服务错误，不能当成文件为空。

成功总结可按标准完成规则将普通项目推进到已采集需求。参见[项目](/zh/backend/projects)、[Asset](/zh/backend/assets-storage)与[配置](/zh/reference/configuration)。

---

代码依据 · backend `e59716c8`: [app/assets/voice_upload_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/assets/voice_upload_api.py) · [app/assets/voice_upload_sessions.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/assets/voice_upload_sessions.py) · [app/workflows/operations/summary/workflow_voice_definition.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/operations/summary/workflow_voice_definition.py).
