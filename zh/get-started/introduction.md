# 项目介绍

YuanZhu AI（装易装AI）帮助装修团队把客户需求、空间照片和设计成果变成图片、文字、视频与设计报告。同一套 uni-app 前端分别构建**微信和抖音小程序**。部署环境实际开放哪些能力由服务端配置决定；源码里存在页面，不代表该环境已经启用。

## 用户能做什么

| 领域 | 能力 |
| --- | --- |
| AI设计 | 室内设计、家居试搭、彩平图、录音总结、自定义设计、设计报告 |
| 旧房改造 | 局部、厨房、卫生间改造，位于 AI设计的下级分组 |
| AI创作 | AI视频，以及短视频脚本、小红书笔记、朋友圈文案、标题金句、拍摄建议五项文案表单 |
| AI问答 | 装修知识、避坑指南、运营经验，从“我的”进入 |
| 项目与协作 | 个人/企业空间、项目和方案列表、企业成员总览、成员项目只读下钻与动态 |
| 账号与计费 | 注册、协议同意、会员订阅、Token包、订单、流水、席位和邀请 |

首页功能区使用 **AI设计**、**AI创作**两张分组入口。能力可用性、套餐权限和价格依然由后端下发。旧 `html_report` 保留历史兼容；新的**设计报告**属于 Workflow 产品，总页数为 9、13 或 17 页。

## 三个代码仓库

| 仓库 | 工作分支 | 职责 |
| --- | --- | --- |
| [wechat_mini_program](https://github.com/Orientation-CD/wechat_mini_program) | `ui-integration` | Vue 3、TypeScript、uni-app、uview-plus 前端 |
| [YuanZhu-AI](https://github.com/Orientation-CD/YuanZhu-AI) | `main` | FastAPI、后台任务、存储、账号、计费和 Admin |
| [docs](https://github.com/Orientation-CD/docs) | `main` | 当前阅读的双语 VitePress 文档站 |

仓库是保存历史版本的源码文件夹；分支是仓库中的一条工作线。三个仓库独立演进。每页末尾的源码依据指向本文核对的固定提交。

## 从哪里开始

- **没有编程、终端经验：**先读 [macOS 环境准备](/zh/get-started/macos-setup)，再按[快速开始](/zh/get-started/quickstart)操作。首次预览不需要启动后端。
- **做前端：**阅读[前端总览](/zh/frontend/overview)和[数据源与构建模式](/zh/frontend/data-source-modes)。
- **做后端：**从[系统架构](/zh/get-started/architecture)和[后端总览](/zh/backend/overview)进入。
- **产品运营：**使用[管理控制台](/zh/admin/overview)；本地部署和发布见[部署](/zh/deploy/local-stack)。

快速开始先运行前端 **Mock**，再让 **API** 构建连接真实本地服务。该本地服务可以使用模拟登录、支付和模型提供商。这两阶段各自有验收标准；Mock 页面演示成功不能证明前后端已经联通。

## 源码依据

核对版本：前端 `eca0a5f`、后端 `b13cc56`（2026-10-20）。[前端功能分组](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/services/featureGroups.ts) · [Workflow请求类型](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py)。
