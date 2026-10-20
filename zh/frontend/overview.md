# 前端总览

`wechat_mini_program` 的 **`ui-integration`** 分支，基于 uni-app、Vue 3、TypeScript 和 uview-plus 分别构建微信、抖音小程序。固定包管理器为 **pnpm 9.15.9**。工程没有 Pinia 依赖：凭据存于模块级会话 Store，页面与仓储管理其余状态和作用域缓存。

## 产品导航

首页主入口为 **AI设计**、**AI创作**。AI设计包括室内设计、家居试搭、彩平图、录音总结、自定义设计、设计报告和旧房改造文件夹；旧房改造再包含局部、厨房、卫生间改造。AI创作包含视频与文案；AI问答从“我的”进入。分组页有面包屑和共享返回/首页导航。

`VITE_ENABLE_PRIVATE_PROJECTS=true` 时，主 Tab 为首页、联系我们、项目、方案、我的；否则项目 Tab 与项目分包从产物移除。通用 Mock 构建不自动启用项目。

| 能力 | 主要实现 | 结果 |
| --- | --- | --- |
| 标准设计与改造 | `pkg-features/components/StandardFeaturePage.vue` | 图片 |
| 家居试搭 | `pkg-features/pages/furniture` | 蒙版/参考图设计结果 |
| 自定义设计 | `pkg-features/pages/customized_design` | 可编辑模板字段生成图片 |
| 录音总结 | `pkg-features/pages/voice_summary` | Markdown 与原录音播放 |
| AI视频 | `pkg-features/pages/video_generation` | 视频 |
| 文案 / AI问答 | `pkg-features/pages/copywriting` | 八项纯文本 Markdown Workflow |
| 设计报告 | `pkg-features/pages/design_report` | Blueprint 生成 HTML 报告，导出行为取决于支持的产品 |
| 历史汇报 | `pkg-plans/pages/report` | 旧 `html_report` 兼容 |

表格描述已实现界面。某个部署实际可用什么，还取决于匿名 `/v1/billing/features`、发布可见性和账号权益。价格使用服务端值；发现请求失败不能伪装成“成功但目录为空”。

## 代码布局

| 目录 | 职责 |
| --- | --- |
| `src/pages` | 启动页、首页、联系、项目/方案/我的 Tab、诊断与支付订单入口 |
| `src/pkg-features` | 功能表单、上传/提交编排、本地草稿 |
| `src/pkg-plans` | 图片对比、Markdown/音频、视频、报告结果 |
| `src/pkg-projects` | 项目编辑/详情、成员项目及动态；条件编译分包 |
| `src/pkg-account` | 登录、协议、资料、商店、权益、订单、Token、组织、草稿箱 |
| `src/repositories`、`src/api/dto` | 经校验的数据访问与接口契约 |
| `src/services`、`src/stores`、`src/domain` | 共享行为、会话凭据、纯领域逻辑 |
| `config`、`scripts`、`tests` | 构建配置、产物/契约门禁、测试工具 |

## 构建和职责边界

前端 Mock 提供确定的图片/界面演示，不开放所有 API 专用能力。API 模式连接真实后端，认证与支付又可独立按平台选择。服务端密钥不能放进 `VITE_*`，这些值会进入客户端包。

文档区分当前 UI 约束与更宽的公共契约。例如视频 UI 要求恰好一张场景参考图，后端允许零到十二张；剧本上限也不同，见[工作流](/zh/frontend/workflows)。

先读[开发入门](/zh/frontend/getting-started)、[架构](/zh/frontend/architecture)；行为细分为[关键流程](/zh/frontend/key-flows)、[工作流](/zh/frontend/workflows)、[项目协作](/zh/frontend/projects)、[平台接入](/zh/frontend/platforms)。

## 源码依据

前端 `eca0a5f`（2026-10-20）：[功能分组](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/services/featureGroups.ts) · [页面注册](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pages.json) · [依赖配置](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/package.json)。
