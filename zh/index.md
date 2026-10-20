---
layout: home
hero:
  name: YuanZhu AI 文档
  text: 理解系统，完成开发与运营
  tagline: 以源码为依据的微信/抖音小程序、Workflow 后端与管理控制台指南。
  actions:
    - theme: brand
      text: macOS 从零准备
      link: /zh/get-started/macos-setup
    - theme: alt
      text: 跑通第一个本地任务
      link: /zh/get-started/quickstart
    - theme: alt
      text: API 参考
      link: /zh/reference/rest-api
features:
  - icon: 🧭
    title: 开始使用
    details: 认识产品与终端，先预览 Mock 界面，再验收持久化本地 API 任务。
    link: /zh/get-started/introduction
  - icon: 📱
    title: 前端
    details: 平台构建、功能分组、文案、视频、报告、项目与只读协作。
    link: /zh/frontend/overview
  - icon: 🧩
    title: 后端
    details: 领域模块、Workflow 与 Operation、素材、身份、计费、存储与后台执行。
    link: /zh/backend/overview
  - icon: 🛠️
    title: 运营与部署
    details: Admin 配置、独立本地栈、云端发布、数据库迁移与恢复。
    link: /zh/admin/overview
  - icon: 🔗
    title: 参考
    details: 当前 API 契约、环境设置、数据模型与可追溯端到端调用链。
    link: /zh/reference/rest-api
---

## 选择阅读路径

第一次开发请从 [macOS 准备](/zh/get-started/macos-setup)开始。[快速开始](/zh/get-started/quickstart)按六个检查点，从纯前端 Mock 到真实本地服务的注册、模拟结算和持久化完成任务。Docker 构建前先说明必须取得的私有依赖与配置权限。

开发者阅读[系统架构](/zh/get-started/architecture)、[前端](/zh/frontend/overview)、[后端](/zh/backend/overview)；运营人员进入 [Admin](/zh/admin/overview)或[部署](/zh/deploy/local-stack)。可搜索功能键、接口路径、环境变量或错误，再通过每页固定提交的源码依据核对行为。

## 产品与文档基线

装易装AI支持设计/改造图片、录音总结、自定义设计、视频、八项文案/问答和 Workflow 设计报告；项目及企业视图组织方案与成员动态。实际可用性、价格、权益与发布开关由部署环境的服务端配置决定。

| 仓库 | 工作分支 | 本次文档依据 |
| --- | --- | --- |
| [wechat_mini_program](https://github.com/Orientation-CD/wechat_mini_program) | `ui-integration` | `eca0a5f` |
| [YuanZhu-AI](https://github.com/Orientation-CD/YuanZhu-AI) | `main` | `b13cc56` |
| [docs](https://github.com/Orientation-CD/docs) | `main` | 当前双语文档站 |

内容核对日期为 **2026-10-20**。分支已实现不表示部署已开启或完成真机/生产验收。当前公共产品 API 从 `/v1` 开始；源码依据区分客户端 UI 限制与较宽的后端契约。

## 源码依据

[前端分组](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/services/featureGroups.ts) · [前端命令](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/package.json) · [后端契约](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py) · [本地手册](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/scripts/runbook.md)。
