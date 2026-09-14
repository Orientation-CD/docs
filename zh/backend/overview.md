# 后端概览

后端仓库（`YuanZhu-AI`）是产品的**服务端大脑**。它对外提供微信小程序调用的 REST API，运行异步 AI 设计作业流水线，维护积分台账与计费状态，负责用户认证（微信 + 密码），管理工作区与企业，并渲染 HTML 设计报告。本页介绍后端由哪些部分组成、各部分如何协作；更深入的内容请点击页末链接。

如果你是初次接触本项目，请先阅读本页，再按
[快速开始](/backend/getting-started) 在本地把它跑起来。

## 后端负责什么

从宏观上看，后端处理四类请求：

1. **小程序的交互式 API 调用** —— 登录、上传户型图、创建设计作业、轮询进度、查询计费余额。这些请求命中运行在 `/v1` 下的 FastAPI 进程。
2. **后台 AI 工作** —— 真正调用外部模型提供商（Seedream、mock 提供商等），轮询直至图片就绪，下载结果并结算积分扣费。这部分运行在 ARQ worker 进程中，绝不在 API 请求路径内执行。
3. **服务端渲染的管理后台网站**（位于 `/admin`）—— 供运营人员查看用户、设计作业、多提供商目录、提示词模板、计费目录以及性能看板。
4. **周期性维护任务** —— 订阅过期处理、停用账号匿名化、清理过期临时资产、对齐报告模板、记录性能聚合数据。

## 技术栈

| 关注点 | 技术 |
| --- | --- |
| 语言 | Python 3.12 |
| Web 框架 | FastAPI (ASGI) |
| ORM | SQLAlchemy 2.0（异步） |
| 数据库迁移 | Alembic（`alembic/`） |
| 数据库 | PostgreSQL 16 |
| 任务队列 / 缓存 / 协调 | Redis 7（ARQ） |
| 对象存储 | S3 兼容（本地用 MinIO，云端用阿里云 OSS） |
| 异步 HTTP 客户端 | `httpx` |
| 数据校验 | Pydantic v2（`BaseModel` + `pydantic-settings`） |
| 密码哈希 | `argon2-cffi`（Argon2id） |
| 令牌 | PyJWT |
| 测试 | `pytest` |

依赖声明在 `pyproject.toml` 中。API 的运行命令是
`uvicorn app.main:app`（配置在 `docker-compose.yml` 和 SAE 部署脚本中）。

## 仓库结构

```
YuanZhu-AI/
├── app/                  # 全部后端源码
│   ├── main.py           # FastAPI 应用工厂、路由挂载、生命周期
│   ├── config.py         # Settings（pydantic-settings），每个环境变量
│   ├── database.py       # 异步引擎/会话、咨询锁
│   ├── db_models.py      # SQLAlchemy ORM 模型 —— 表结构（约 2660 行）
│   ├── models.py        # Pydantic 请求/响应契约
│   ├── api.py            # 主 /api/v1 路由（认证、用户、设计作业、报告）
│   ├── asset_api.py      # /api/v1/assets/* 路由
│   ├── billing_api.py    # /api/v1/billing/* 与支付回调
│   ├── workspace_api.py  # /api/v1/workspaces/* 与企业邀请
│   ├── referral_api.py   # /api/v1/referral-invitations/* 与 /rewards/*
│   ├── account_lifecycle_api.py  # 停用 / 恢复 / 管理员用户操作
│   ├── config_export.py  # /admin/config-export.json
│   ├── worker.py         # ARQ WorkerSettings（提交 + 轮询 worker）
│   ├── queue_names.py    # SUBMIT_JOB_QUEUE / POLL_JOB_QUEUE 常量
│   ├── design_job.py     # 设计作业流水线（预留 → 提交 → 轮询 → 结算）
│   ├── providers/        # 提供商适配器（base、seedream、doubao_text 等）
│   ├── provider_configuration.py  # 数据库驱动的提供商 + 模型目录
│   ├── billing.py        # 积分台账、预留、支付订单
│   ├── wechat_pay.py     # 微信支付 JSAPI + 回调验签
│   ├── auth.py           # get_current_user 依赖、JWT 签发/解码
│   ├── wechat_auth.py    # 微信 code2session + 手机号换取
│   ├── assets.py / asset_*.py / storage.py  # 资产与对象存储生命周期
│   ├── report_*.py       # 报告配置、发现、库、渲染、查看
│   ├── workspaces.py / workspace_api.py  # 个人 + 企业工作区
│   ├── prompt_templates.py  # 管理员维护的带变量/选项提示词
│   ├── campaign_configuration.py  # 运行期活动积分额度
│   ├── summary_catalog.py / summary_prompt.py  # 录音摘要（#208）
│   ├── entitlements.py / subscription_entitlements.py
│   ├── referral_*.py     # 推荐邀请、奖励、发件箱
│   ├── performance.py / overview.py  # 指标、慢请求追踪、瓶颈分析
│   ├── http_safety.py    # 请求 ID、指标中间件、错误归一化
│   ├── rate_limit.py     # Redis 滑动窗口限流
│   ├── maintenance_jobs.py  # 周期性 ARQ 任务
│   └── admin.py          # 服务端渲染的 FastHTML/Jinja 管理后台
├── alembic/              # 数据库迁移
├── tests/                # pytest 测试集（单元 + E2E + 冒烟）
├── docker-compose.yml    # 本地栈：db、redis、api、workers、mock 提供商
├── .env.example          # 权威环境变量清单
└── pyproject.toml
```

## 运行时拓扑

部署后的后端基于**同一个不可变镜像**，以多个进程运行。它们共享同一份代码，但通过不同的
`ARQ_*_WORKER_QUEUES` / uvicorn 入口启动：

```
                 ┌──────────────────────────────┐
   微信小程序 ──► │  FastAPI API (uvicorn)       │  /api/v1/*  /admin/*
                 │  - 认证、校验、写入            │  /openapi.json /metrics
                 └───────┬───────────────┬──────┘
                         │ 入队           │ 读写
                         ▼               ▼
                 ┌──────────────┐   ┌──────────────┐
                 │ Redis (ARQ)  │   │ PostgreSQL 16 │  系统记录源
                 │ 队列+缓存     │   └──────────────┘
                 └──┬───────┬───┘
        出队 ▼           ▼ 出队
   ┌─────────────────┐  ┌─────────────────┐
   │ Submit worker   │  │ Poll worker      │
   │ submit_provider_ │  │ poll_provider_   │
   │ job 队列         │  │ job 队列          │
   └────────┬─────────┘  └────────┬────────┘
            │ HTTPS              │ HTTPS + S3
            ▼                     ▼
   ┌─────────────────┐   ┌──────────────────────┐
   │ AI 提供商       │   │ 对象存储 (S3)        │
   │ (Seedream/...) │   │ 户型图、图片、        │
   └─────────────────┘   │ 报告资产              │
                         └──────────────────────┘
```

- **API**（`app.main:app`，uvicorn）只做短促、持久的工作：校验、认证、写一行数据、入队一个任务。它绝不会阻塞等待 AI 提供商调用。
- **Submit worker** 消费 `submit_provider_job` 队列。它根据已存储的提示词选择 + 暂存资产密钥组装提供商请求，调用提供商，记录 `provider_job_id`，然后入队一个轮询任务。
- **Poll worker** 消费 `poll_provider_job` 队列。它轮询提供商直至完成，把结果下载到对象存储，持久化结果元数据，**结算积分扣费**，并将作业标记为完成。
- **PostgreSQL** 是唯一事实来源。**Redis** 承担队列、限流计数、管理后台会话和短期缓存。**对象存储**（S3 兼容）保存所有二进制：上传的户型图、提供商输出和报告资产。

两个队列名是 `app/queue_names.py` 中的固定常量：

```python
SUBMIT_JOB_QUEUE = "submit_provider_job"
POLL_JOB_QUEUE = "poll_provider_job"
```

worker 进程的角色在 `app/worker.py` 中配置为
`SubmitWorkerSettings` 和 `PollWorkerSettings`，各自列出它认领的确切函数集合。

## 各组件如何通信

| 跳转 | 机制 |
| --- | --- |
| 小程序 → API | `/api/v1` 下的 HTTPS REST，`Authorization: Bearer <jwt>` |
| API → workers | Redis ARQ 队列（无直接 worker HTTP） |
| Workers → AI 提供商 | 通过 `httpx` 的 HTTPS（`app/providers/http_transport.py`） |
| API / workers ↔ DB | 基于 `DATABASE_URL` 的异步 SQLAlchemy |
| API / workers ↔ 缓存 | 基于 `REDIS_URL` 的异步 Redis 客户端 |
| API / workers → 存储 | S3 SDK（boto3 风格预签名 + get/put/delete） |
| 小程序 → 存储 | 直接**预签名**上传（绕过 API） |
| 微信支付 → API | 服务器到服务器通知回调（`/api/v1/billing/wechat/notify`） |

## 数据归属一览

| 数据 | 存放位置 |
| --- | --- |
| 用户、认证会话、工作区、企业、成员关系 | PostgreSQL |
| 设计作业、提交记录、进度、结果元数据 | PostgreSQL |
| 积分台账条目、支付订单、订阅、积分包 | PostgreSQL |
| 提供商连接、模型配置、模型目录、提示词模板 | PostgreSQL |
| 报告配置、报告记录、报告条目 | PostgreSQL |
| 推荐活动、奖励、发件箱事件 | PostgreSQL |
| 户型图字节、渲染图片、报告资产 | 对象存储（S3） |
| 作业队列、限流计数、管理后台会话、进度快照 | Redis |

## 延伸阅读

- [快速开始](/backend/getting-started) —— 在本地运行整个技术栈。
- [架构与组件](/backend/architecture) —— 深入模块、请求流与 worker 拓扑。
- [设计作业](/backend/design-jobs) —— 预留 → 提交 → 轮询 → 结算流水线与多提供商目录。
- [认证](/backend/authentication) —— 微信登录、JWT、管理后台会话、CSRF。
