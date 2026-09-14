# 云端架构（阿里云 SAE）

生产环境运行在**阿里云 Serverless 应用引擎（SAE）**上。本页讲解设计要点：
不可变镜像模型、SAE 命名空间拓扑、配置与凭据的管理方式，以及让部署安全的
安全契约。可直接复制粘贴的命令请见 [SAE 部署操作手册](/deploy/sae-deployment)。

## 不可变镜像模型

**每个 Git 提交对应一个与环境无关的镜像。**

```text
<registry>/<acr-namespace>/yuanzhu-ai-runtime:<full-git-sha>@sha256:<digest>
```

- 每个组件——API、submit worker、poll worker、临时迁移运行器——都使用**同一个制品**。
  Mock 服务器不是部署目标。
- 镜像 tag 在触碰 SAE 之前先解析为**仓库摘要**（digest）。第二阶段拒绝可变 tag
  （`:main`、`:<sha>`），并要求提供的完整 SHA tag 解析到所提供的摘要。
- 生产环境**绝不重新构建**：它只是提升（promote）一个已通过云测验证的镜像。
- 未提交的工作区改动**绝不**进入镜像（始终使用已提交的版本）。

## 命名空间：资源按命名空间隔离，阶段彼此独立

SAE 命名空间是**资源边界**。共有两个命名空间：

| 命名空间 | 公开 API 来源 | OSS bucket | 用途 |
| --- | --- | --- | --- |
| `yuanzhu-test` | `https://test-api.yuanzhushuzhi.com` | `yuanzhu-ai-dev-1785341496` | 云测集成 |
| `yuanzhu-prod` | `https://api.yuanzhushuzhi.com` | `yuanzhu-ai-prod` | 生产 |

每个命名空间内，三个规范工作负载名称固定不变：

| 规范工作负载 | 进程命令 |
| --- | --- |
| `yuanzhu-ai-api` | `/bin/sh -c 'exec uvicorn app.main:app --host 0.0.0.0 --port 8080'` |
| `yuanzhu-ai-submit-worker` | `/bin/sh -c 'exec python -m arq app.worker.SubmitWorkerSettings'` |
| `yuanzhu-ai-poll-worker` | `/bin/sh -c 'exec python -m arq app.worker.PollWorkerSettings'` |

迁移运行器是**临时的**：仅在一次发布期间创建的单实例 SAE 应用，随后删除。
SAE Job 模板无法引用命名空间 Secret，因此迁移执行器是一个临时应用，
复制 API 的网络/拉取镜像设置，并把 `MIGRATION_DATABASE_URL` 映射为进程变量
`DATABASE_URL`。

### 命名空间安全的工具链（#212）

每个部署脚本都接收显式的 `--namespace`，并在**运行时**从所选命名空间解析
所有资源 ID（AppId、Secret 名、RDS 实例、CLB、DNS 记录、bucket）。
没有任何命名空间相关内容被硬编码：

- `configure-network.sh`、`configure-oss.sh`、`configure-migration-db.sh`、
  `configure-cdn.sh` 都接受 `--namespace=yuanzhu-test` 或 `--namespace=yuanzhu-prod`，
  只对该命名空间的资源做 plan/apply。
- 只读预检（`--dry-run`）绝不改动云端状态，并报告漂移（drift）。
- RAM 权限范围限定为该命令解析出的命名空间资源。

这意味着同一份脚本源码可以部署任一环境；你无法通过修改常量意外把测试
运行指向生产资源。

### 发布阶段与命名空间解耦（#215）

`--stage` 独立于命名空间名对**发布风险**进行分类：

- `--stage=test`——常规、交互式，允许使用 Mock。
- `--stage=production`——仅限受保护的提升/回滚；强制双人复核、证据留存，
  以及"先停 API 再写库"的数据库写栅栏。

stage 绝不重命名命名空间，也绝不改写云端持有的 `ENVIRONMENT`。
对一个已配置 `ENVIRONMENT=production` 的应用进行 test-stage 部署会被拒绝。
这种解耦让一个临时命名不当的命名空间（例如割接期间 `yuanzhu-test` 仍在
承载真实流量）也能获得正确的生产防护，而无需重新开通。

## 请求流

```text
                          ┌──────────────────────────────────────────────┐
  WeChat (login / pay) ──►│  DNS (AliDNS) → CLB :443 → yuanzhu-ai-api   │
                          │        │   (HTTPS, cert-terminated)         │
                          │        ▼                                    │
                          │  Redis (ARQ queues: admission / poll)       │
                          │        │                                    │
                          │  yuanzhu-ai-submit-worker ──► AI provider   │
                          │  yuanzhu-ai-poll-worker   ──► AI provider   │
                          │        │                                    │
                          │  RDS PostgreSQL        OSS (S3-compatible)  │
                          └──────────────────────────────────────────────┘
```

1. 小程序通过 HTTPS 的 `443` 端口调用公开 API，由 SAE 托管的 CLB 终止证书，
   并转发到容器端口 `8080`。
2. API 读写 RDS PostgreSQL，并把工作任务入队到 Redis。
3. submit worker 消费准入队列并调用 AI 提供商；poll worker 消费轮询队列，
   对账异步提供商作业。
4. 二进制资源存放在 OSS；浏览器通过预签名表单直接上传，通过预签名 URL
   （或鉴权私有 CDN）下载私有资源。

## 托管云资源

| 资源 | 是什么 | 如何管理 |
| --- | --- | --- |
| **RDS PostgreSQL** | 每个命名空间的主数据库 | `configure-migration-db.sh` 负责角色/密钥；运行时应用使用 `yuanzhu_app` 账号 |
| **Redis** | ARQ 队列 + 短生命周期缓存 | 来自 API 环境的共享连接串 |
| **OSS bucket** | 对象存储（开启版本管理，AES-256） | `configure-oss.sh` 对账 ACL、CORS、生命周期 |
| **CLB / 监听器** | SAE 托管负载均衡，`443 → 8080` | `configure-network.sh` 对账 |
| **TLS 证书** | 覆盖 API + CDN 主机名的 CAS 证书 | 线下购买/签发；脚本绝不购买 |
| **AliDNS** | API + CDN 主机名的 A 记录 | `configure-network.sh` / `configure-cdn.sh` |
| **CDN（ESA）** | 公开 + 私有资源分发 | `configure-cdn.sh` 对账 |
| **SLS** | SAE 应用/Job 日志服务 | 收集部署 + 迁移输出 |

### CDN 分发模型

每个命名空间有两个 CDN 域名，严格隔离：

```text
https://public.cdn.yuanzhushuzhi.com/logo.png
  -> oss://yuanzhu-ai-prod/public/logo.png        (匿名，仅公开)

https://presign.cdn.yuanzhushuzhi.com/<asset-id>?auth_key=...
  -> oss://yuanzhu-ai-prod/temp/assets/<asset-id>  (Type-A 签名，私有)

https://test-public.cdn.yuanzhushuzhi.com/...       (test 命名空间)
https://test-presign.cdn.yuanzhushuzhi.com/...      (test 命名空间)
```

公开 CDN 被限制在 bucket 的 `public/` 前缀下。私有 CDN 重写到 `temp/assets/`，
并要求阿里云 CDN **Type-A URL 鉴权**，签名密钥按命名空间存放在该命名空间的
SAE Secret 中。浏览器上传始终使用公开的 OSS 服务端点（`S3_PRESIGN_ENDPOINT`）——
CDN 主机名**不是**它的直接替代品。根目录级别的微信校验文件由
`https://static.yuanzhushuzhi.com`（test）提供。

## 配置管理：提供商目录（provider catalog）

提供商调度不再是一坨 `PROVIDER_*` 环境变量。管理控制台（Studio Control）
配置一个**规范化目录**，worker 在运行时读取：

```text
ProviderConnection  (provider_connections)
  └─ base_url, adapter, submit_path, status_path, auth header/scheme,
     output_hosts, encrypted_api_key (Fernet)
        │
        ▼ 1:N
ProviderModelConfig  (provider_model_configs)
  └─ model_id, image_size, output_format, watermark,
     request_shapes[], supports_masked_input
        │
        ▼ N:N  (provider_model_catalogs)
DesignJobType / Catalog  (design_job_types, key = catalog key)
  └─ display_name, token_cost, result_kind, masked_image_required,
     reference_image_required, is_active, selected_model_config_id
```

提交作业时，worker 按作业的 catalog key 加载 `selected_model_config_id`，
依据适配器能力信封（`mock_async`、`seedream`、`doubao_text`、`gpt_image`）
校验连接/模型配对，在内存中解密 API 密钥，并在每个 `DesignJobSubmission`
上捕获一份**非敏感 JSON 快照**（`schema_version: 2`，连接 + 模型 ID 与版本、
base_url、路径、输出主机），外加单独加密的密钥。作业始终按其提交时的确切
提供商代际运行，即使管理员之后重新保存目录也是如此。

规范化的请求/响应契约（`app/providers/base.py`）把每个作业归类为三种形态之一
——`SINGLE_IMAGE`、`IMAGE_WITH_REFERENCE` 或 `RECORDING_SEQUENCE`——
每个适配器必须接受该形态，否则失败关闭（fail closed）。

## 迁移凭据分离（#214、#234）

数据库角色与 Secret 被刻意拆分：

- **运行时**账号（API + worker）只有应用 DML 权限：`CONNECT`、schema 使用、
  表 DML、序列、类型，以及匹配的默认权限——**不拥有**所有权。
- 持久对象的属主是 `yuanzhu_app`。
- 专用迁移运行器使用命名空间本地的 Opaque Secret `yuanzhu-migration-secrets`，
  其中**仅**包含 `MIGRATION_DATABASE_URL`。API 和 worker 绝不挂载此 Secret；
  只有临时迁移运行器把它的 key 映射为 `DATABASE_URL`。
- `configure-migration-db.sh` 是创建账号、轮换密码、转移所有权或写入迁移 Secret
  的**唯一**入口。它是幂等的，默认为只读 `--dry-run`，并通过一个每次退出路径
  都会被删除的短生命周期特权账号在单个事务中完成所有权转移。密码只存在于
  进程内存中，绝不以参数、文件或应用配置的形式传递。

## PostgreSQL 快照恢复（#238）

在创建任何迁移运行器之前，部署阶段会：

1. 校验该命名空间显式指定的 RDS 实例 ID 和备份策略。
2. 要求备份保留期**至少七天**。
3. 创建一个**新的全量物理备份或快照备份**，轮询返回的备份任务 ID，
   并验证该备份集确为成功、手动、全量、物理/快照且可用于恢复。
4. 绝不调用 `DeleteBackup`，因此较旧的恢复点按提供商策略轮转，
   但失败的发布始终保留新创建的那份。

Dry-run 只执行读取并报告拟议备份，不会真正创建备份。

## 迁移契约（失败关闭）

临时迁移运行器分两个阶段运行：

1. **预检（只读）：** `alembic current`、`alembic heads`、
   `alembic history -r current:heads --verbose`。
2. **应用（交互式批准后）：** `alembic upgrade head`，然后
   `alembic current --check-heads`（每个打包的 head 都已应用）和
   `alembic check`（线上物理 schema 与 SQLAlchemy 元数据一致）。

任一校验失败，应用发布都不会继续。运行器在打印明确的成功/失败标记后保持存活，
以免 SAE 重启并重复已完成的操作；无论成功、失败、取消还是顶层清理路径，
它都会被删除。

## 环境一览

| 环境 | 命名空间 | Mock？ | 发布顺序 |
| --- | --- | --- | --- |
| 云测 | `yuanzhu-test` | 模拟图像/支付/微信 | 迁移 → submit worker → poll worker → API → 校验 |
| 生产 | `yuanzhu-prod` | 真实微信、真实微信支付、真实 OSS、真实 AI | 留存证据 → 停 API → 备份 → 迁移 → worker → API → 启动 → 校验 |

## 可观测性

- SLS 收集 SAE 应用与 Job 日志；迁移日志读取器以分页 SLS 查询从旧到新拉取 Job 输出。
- 发布记录（不含密钥的 Markdown）写入 `RELEASE_RECORD_DIR`，包含
  SHA/摘要、命名空间 ID、解析出的 AppId、各角色身份/副本数、证据、
  变更单 ID、审批人和校验状态。

## 下一步

- [SAE 部署操作手册](/deploy/sae-deployment)——逐步命令。
- [GitHub Actions CI/CD](/deploy/ci-cd)——自动化。
- [生产提升与回滚](/deploy/production)——生产路径。
