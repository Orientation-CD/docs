# Design Report 与演示文件

当前报告使用版本化 Blueprint Workflow，发布已验证 HTML，并按配置发布 presentation。历史仅 HTML 报告仍可查看；旧模板字段和旧 body 不是新创建契约。

## 1. 组装来源 Blueprint

前端根据所选来源/产品组装结构化 Blueprint。来源是经过校验的完成 Job/Asset，不是任意远程 URL。后端在准确版本验证后组装命名报告文档、请求内图片 alias，保持户型图/房间语义与顺序。

向 `/v1/workflows` 提交精确当前 `type`：`design_report_9`、`design_report_13`、`design_report_17`，分别产生 9/13/17 总页数，恰好一个 Blueprint，可选一个获准 append-PPTX。裸 `design_report` 仅保留历史 Job 身份，不用于新请求。`quote_id` 字段已退休，包括 `null` 在内只要出现就要求重新提交，必须完全省略。旧 protocol-zero `options`/`project`/completed-job 列表不能复制进新请求，完整形状以 Blueprint schema 为准，不能从渲染页面反推。

## 2. 执行和发布

冻结图执行依赖 Operation。模型仅接收验证过的形状：通用 Ark Responses adapter 使用报告 JSON/Markdown 和有序已验证图生成 staged HTML。PPTX 转换/拼接有独立有界 subprocess 和资源控制。客户附加 PPTX 是私有最终拼接材料，不作为模型提示内容。

worker 验证/暂存结果、发布类型化 Asset、通过持久执行结算聚合。部分失败、显式重试和 presentation 生成按服务端资格处理，不一律重启所有已完成模型节点。

## 3. 打开 capability URL

认证读取完成 Workflow，选择报告/演示输出与新过期信息。服务端签发例如 `/v1/workflows/{design_job_id}/report?token=...` 的短时 URL；浏览器/web-view 使用该 capability，无需通用 Bearer。presentation 使用独立 capability/attachment 路由。

token 绑定 Job、用途和过期，是秘密 bearer capability，不作为永久身份日志/分享。过期后认证刷新 Workflow 获取 URL，不能弱化校验或把长期 JWT 放 query。

## 4. 小程序查看

viewer 在跳转前检查身份/过期，并处理不可用/失效。微信/抖音 web-view HTTPS/域名要求独立满足，桌面可打开不等于平台已批准域名。

模型 HTML 是不可信内容，保留发布/转换的内容与网络隔离，不注入 Admin 或普通无限制页面。使用报告路由，不直接打开对象存储原始 HTML。

## 兼容与排障

- 历史 HTML-only 无演示文件可能正常，检查输出和 pipeline 版本。
- 旧 Blueprint/quote body 按当前 schema 重建，不只改一个模板名。
- token 过期认证刷新；Job 失败走显式重试。
- Asset/产物完整性失败需后端处理，客户端替换 URL 不是修复。

参见[Workflow 生命周期](/zh/reference/flows/design-job-lifecycle)和[报告系统](/zh/backend/reports)。

## 源码依据

已按[记录的源码版本](/zh/reference/source-revisions)核对。

- [Blueprint 组装](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/services/reportBlueprint.ts)
- [报告提交](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/services/reportDesignSubmit.ts)
- [来源 Blueprint 契约](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/design_report/design_report_sources.py)
- [发布与 capability](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/design_report/workflow_report_publication.py)
- [输出投影](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/api.py)
