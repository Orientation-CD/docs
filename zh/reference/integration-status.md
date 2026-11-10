# 这组前后端版本实际支持什么

本页描述[已核验源码](/zh/reference/source-revisions)，不是部署验收。前端 `ui-integration@88c75c1f` 与后端 `main@749e82df` 已同时包含专业户型集成；环境能否执行，仍取决于有效配置、平台业务域名、供应商凭据和权益。

## 能力对照

| 领域 | 真实客户端边界 | 后端实现 | 跟读入口 |
| --- | --- | --- | --- |
| 图片、语音、文案、报告 | 表单、仓储、轮询与结果页 | 准入、持久化图、worker、发布及账务 | [系统导读](/zh/reference/system-walkthrough) |
| 视频 | 剧本、系统／自传同款模式，模型与费用确认 | 规范预览、冻结时长／模型定价、本地执行 | [视频计费](/zh/reference/flows/video-billing-flow) |
| 专业户型 | 原生入口／作品管理、原始 H5 编辑器，图片与全景结果 | 上下文、网关、本地作品归属、SDK 执行、整组移动／删除及恢复 | [户型全链路](/zh/reference/flows/floor-plan-flow) |
| 三维家图片设计 | 原生创建设计入口接力到原始 H5 | 七种独立 Feature 共用 `three_vjia_image` Workflow，冻结版本化 SDK 绑定 | [图片链路](/zh/reference/flows/three-vjia-image-flow) |
| 灵感／逛店 | 原生发现入口请求已准备的 H5 URL | 有范围约束的上下文／入口，网关仅访问固定发布版服务源站 | [户型后端](/zh/backend/floor-plans) |
| 企业协作 | 成员看板、额度编辑／自读、成员只读详情、指派与阶段控件 | 当前负责人授权、不可变提交者历史、阶段证据与销售统计 | [项目](/zh/frontend/projects)、[额度](/zh/reference/flows/member-quota-flow) |
| 企业日报 | **此前端版本没有调用者** | 九个成员／owner 接口，覆盖状态、历史、保存、已读与批注 | [日报](/zh/reference/flows/daily-report-flow)：后端实现不等于小程序已有页面 |
| 诊断 | 有界且脱敏的客户端导出，以及认证 Studio Control | 运行版本证据、安全阶段诊断、Redis 历史与恢复 | [跨进程排障](/zh/reference/flows/runtime-debugging) |

彩平图图片 Feature 与专业 Group／Work／编辑器系统是不同产品。供应商 Group ID 是不透明字符串，不能转为平台 UUID。公开 Workflow ID 是 Job ID；本地作品、SDK 配置、发布版本及供应商尝试各有自己的身份。

## 四类验证分别证明什么

1. **前端 Mock** 可以不经过 FastAPI、SQL 或 worker 就显示结果。
2. **已提交契约夹具** 证明固定来源版本的客户端／schema 对照。旧候选片段是历史证据；已进入本次后端的操作应进入主 API 清单。
3. **本地真实 API 闭环** 到达数据库、队列和存储，但身份、支付或供应商仍可能模拟。
4. **部署／供应商验收** 核对具体镜像、配置、平台 web-view、凭据和真实外部服务。

本次更新审读实现并验证文档站点，没有运行应用栈，也不证明真机、部署或付费供应商已验收。

## 当前界面与新集成

现有普通图片／语音／视频 wrapper 仍使用受支持的 `/v1/design-jobs` 适配器；文案、报告及 H5 SDK 提交也使用规范 `/v1/workflows`。按真实调用者跟读。新 API 客户端使用 Workflows。结果不确定的动作保留原 endpoint、规范化 body 和动作 key，见[兼容边界](/zh/reference/compatibility)。

集合隐藏他人私有输入；经过授权的按 ID 详情可向当前企业 owner 或当前负责人返回类型化输入，但不授予写权限。写操作仍须通过具体动作的提交者／负责人检查和服务端权限，见[历史操作](/zh/reference/flows/workflow-history-flow)。

源码: [src/services/useFeatureLauncher.ts](https://github.com/Orientation-CD/wechat_mini_program/blob/88c75c1f15cd65f45c7fb09d560df80430ddc198/src/services/useFeatureLauncher.ts) · [app/api/__init__.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/api/__init__.py) · [app/workflows/read_access.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workflows/read_access.py) · [app/workspaces/daily_report_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/daily_report_api.py)
