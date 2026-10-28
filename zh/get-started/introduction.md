# 从哪里开始学习和运行

圆筑 AI / 装易装AI 帮助装修团队把客户需求与设计素材转成图片、文案、视频和演示报告。uni-app 前端构建微信、抖音小程序；FastAPI 与 worker 负责身份、执行、存储和计费。

先看[前后端对齐状态](/zh/reference/integration-status)。本文档核验的是独立演进的分支：写好的页面、OpenAPI 测试夹具、后端 `main` 真正提供的能力，是不同证据。

## 对应当前界面

| 入口 | 阅读源码时寻找什么 |
| --- | --- |
| 首页 → AI设计 | 轻盈／专业设计落地页、`featureGroups` 与 Feature 启动器 |
| AI轻盈设计 | 室内／家具／彩平图、语音总结、自定义设计、报告与旧房改造 |
| AI专业设计 | 户型编辑、渲染、作品管理和全景前端；**本次后端 main 没有其专用接口** |
| AI创作 | 剧本视频、做同款视频、文案及已配置的创作入口 |
| 项目 | 个人项目、企业成员看板；所有者只读视图有独立权限边界 |
| 账户与会员 | 登录／同意、工作区、套餐、积分、订单和邀请 |

名称、卡片与主题属于前端展示。实际提交仍由服务端功能发现、有效模板、权益和钱包检查决定能否运行。路由存在也不表示模型或付费供应商已配置好。

## 选择学习路径

- **第一次接触源码：**[macOS 准备](/zh/get-started/macos-setup) → [首个本地工作流](/zh/get-started/quickstart)。先运行前端 Mock，再连接使用模拟外部服务的本地真实 API。
- **读懂一个按钮：**[源码跟读总览](/zh/reference/system-walkthrough) → 业务链路 → 固定版本函数。用 Job、Asset 身份跨进程跟踪。
- **前端开发：**[代码地图](/zh/frontend/overview)、[设计系统](/zh/frontend/design-system)、[户型边界](/zh/frontend/floor-plans)。
- **后端开发：**[架构](/zh/backend/architecture)、[准入](/zh/reference/flows/design-job-lifecycle)、[输入归档](/zh/reference/flows/asset-upload-flow)、[成员额度](/zh/reference/flows/member-quota-flow)。
- **后台与运维：**[管理后台](/zh/admin/overview)、[性能证据](/zh/admin/performance)、[发布恢复](/zh/deploy/production)。

## 仓库分工

| 仓库 | 分支 | 职责 |
| --- | --- | --- |
| `Orientation-CD/wechat_mini_program` | `ui-integration` | 界面、本地状态、平台适配与 API repository |
| `Orientation-CD/YuanZhu-AI` | `main` | FastAPI、worker、数据库、私有存储和管理后台 |
| `Orientation-CD/docs` | `main` | 双语指南、源码地图和校验 |

[来源记录](/zh/reference/source-revisions)固定完整提交。示例描述这组版本，不代表任意部署或未合并分支。仍暴露的适配接口集中在[兼容参考](/zh/reference/compatibility)；新集成沿规范 Workflow 契约学习。

源码：[src/services/featureGroups.ts](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/src/services/featureGroups.ts) · [app/core/models.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/models.py)
