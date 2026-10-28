# 这组前后端版本实际支持什么

本页描述[已核验提交](/zh/reference/source-revisions)，不是部署验收报告。两条分支可以独立推进，选择端到端练习前先读本页。

## 能力对照

| 领域 | 前端证据 | 后端 main 证据 | 学习边界 |
| --- | --- | --- | --- |
| 图片、语音、文案、报告 | 页面、repository、轮询及结果展示 | 类型化路由、准入、worker、发布 | 跟随各业务链路；实际开放仍由有效配置决定 |
| 剧本／同款视频 | 剧本、系统模板、自传参考视频模式 | script/prompts 联合类型、Video Asset、校验及本地执行 | [视频](/zh/backend/video)：UI、API 上限与供应商验收不同 |
| 企业看板 | 成员卡片、按成员过滤的项目／方案 | owner 概览与 Workflow 只读详情 | [项目](/zh/frontend/projects)：企业所有者不能编辑他人作品 |
| 成员月积分额度 | 此前端无三个额度 API 的调用者（既无编辑，也无自读） | 三个额度接口及账本／准入约束 | [额度 API 全链路](/zh/reference/flows/member-quota-flow)，不虚构按钮 |
| 户型编辑／渲染／全景 | 独立页面、API、候选 OpenAPI 夹具 | **此 main 没有其专用路由或实现** | [前端户型功能](/zh/frontend/floor-plans)解释客户端和尚未接通的服务端边界 |
| 主题／包体 | 主题引擎、生成资源、预算门禁；设置页切换入口当前隐藏 | 前端展示职责 | [设计系统](/zh/frontend/design-system)、[测试](/zh/frontend/testing) |
| 性能分析 | 后端提供的 Studio Control | 带版本观测、Redis 历史、报告和认证后台 | [性能](/zh/admin/performance)：缺失覆盖不等于零，也不证明改善 |

## 四类验证不能混淆

1. **前端 Mock** 可以不请求 FastAPI 就正常展示。
2. **候选夹具检查** 核对客户端 JSON 与候选 schema，不证明已部署的 `main`。
3. **本地真实 API 闭环** 到达 FastAPI、SQL、Redis、存储，但支付／模型仍可能模拟。
4. **部署后的供应商验收** 证明具体镜像、配置、环境与真实供应商行为；源码和单测不能单独证明。

已有的彩平图**图片 Feature** 与新的户型模型／编辑器／渲染／全景系统不同。名称相近不表示新接口已可用。

## 当前界面与新集成

当前非文案提交仍普遍使用 `/v1/design-jobs`，文案及部分操作使用 `/v1/workflows`。受支持的适配入口都进入当前工作流实现。跟读章节记录按钮实际请求，新集成使用规范 Workflows。重放结果不确定的动作时，不要更换 URL、body 或 key。见[兼容边界](/zh/reference/compatibility)。

源码：[documents/REST_API_INTERFACE.md](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/documents/REST_API_INTERFACE.md) · [src/services/useFeatureLauncher.ts](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/src/services/useFeatureLauncher.ts) · [app/api/__init__.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/api/__init__.py) · [app/workflows/api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/api.py)
