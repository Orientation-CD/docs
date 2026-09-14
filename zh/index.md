---
layout: home

hero:
  name: "YuanZhu AI 文档"
  text: "From zero to hero（从零到精通）"
  tagline: "YuanZhu AI 室内设计微信小程序的完整开发者文档——前端、后端、管理控制台、部署与端到端参考。"
  actions:
    - theme: brand
      text: 快速上手
      link: /get-started/introduction
    - theme: alt
      text: 极速开始
      link: /get-started/quickstart
    - theme: alt
      text: REST API 总览
      link: /reference/rest-api

features:
  - icon: 🚀
    title: 快速上手
    details: 了解产品是什么、系统如何架构，并在几分钟内在你自己的机器上跑起整套栈。
    link: /get-started/introduction
  - icon: 📱
    title: 前端
    details: 深入 uni-app / Vue 3 小程序——页面、分包、仓储层、数据源模式，以及每个关键用户流程。
    link: /frontend/overview
  - icon: 🧩
    title: 后端
    details: 深入 FastAPI 后端——API、ARQ worker、PostgreSQL、Redis、对象存储、计费、汇报与多提供商 AI 层。
    link: /backend/overview
  - icon: 🛠️
    title: 管理控制台（Studio Control）
    details: 面向产品与运营的控制台——仪表盘、用户、工作区、计费、活动、提示词、汇报模板，以及模型提供商目录。
    link: /admin/overview
  - icon: ☁️
    title: 部署
    details: 运行本地 Docker Compose 栈并部署到阿里云 SAE——从第一次冒烟测试到生产提升与回滚。
    link: /deploy/local-stack
  - icon: 🔗
    title: 参考
    details: 后端服务的 REST API 总览、数据模型、配置与 OpenAPI 接口面。
    link: /reference/rest-api
  - icon: 🧭
    title: 端到端调用链
    details: 完整可追溯的数据流——登录、设计作业生命周期、资源上传、支付、汇报与工作区——从按钮点击到数据库与提供商。
    link: /reference/flows/wechat-login-flow
---

## YuanZhu AI 是什么？

YuanZhu AI 是一个**微信小程序**，使用生成式 AI 帮助业主、设计师和装修团队
把房间照片变成专业的室内设计方案和 HTML 汇报。

该项目由 `Orientation-CD` GitHub 组织下的三个仓库组成：

| 组件 | 仓库 | 默认分支 | 用途 |
| --- | --- | --- | --- |
| 前端 | [`wechat_mini_program`](https://github.com/Orientation-CD/wechat_mini_program) | `ui-integration` | uni-app + Vue 3 + TypeScript 小程序 |
| 后端 | [`YuanZhu-AI`](https://github.com/Orientation-CD/YuanZhu-AI) | `main` | FastAPI + ARQ + PostgreSQL + Redis 后端 |
| 文档 | 本仓库（`docs`） | `main` | 你正在阅读的这份文档 |

## 文档如何组织

- **快速上手**——不假设任何背景。了解产品、高层架构，并在本地跑起完整栈。
- **前端**——关于小程序的一切：技术栈、页面与分包、仓储层、构建模式和关键用户流程。
- **后端**——关于 API 服务的一切：模块、worker、数据库、对象存储、Redis、
  计费、汇报、工作区和 AI 提供商层。
- **管理控制台（Studio Control）**——运营 Web 应用：仪表盘与告警、用户与账号、
  工作区、计费与积分、活动、营销、财务、性能、设计作业、资源、法律文档、
  提示词与汇报模板，以及模型提供商目录。
- **部署**——如何用 Docker Compose 本地运行（开发者各自并行栈），以及如何
  部署到阿里云 SAE，包括 CI/CD、命名空间安全工具链、迁移凭据分离和生产防护。
- **参考**——API 接口面：REST 总览、数据模型、配置参考和 OpenAPI。
- **端到端调用链**——对于每个开放 API，你可以精确追踪从用户在小程序点下按钮
  到最终响应发生了什么，包括每一跳中间环节（Redis、ARQ worker、提供商、
  数据库、微信）。

> **阅读顺序。** 如果你刚接触本项目，从[介绍](/get-started/introduction)开始，
> 然后看[架构总览](/get-started/architecture)，再走**极速开始**。栈跑起来之后，
> 再探索前端和后端。运营产品时用**管理控制台**章节，上云时用**部署**章节，
> 想深入理解某个具体 API 或数据流时用**参考 / 端到端调用链**。
