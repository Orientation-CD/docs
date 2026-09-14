# SAE 部署操作手册

这是把后端部署到阿里云 SAE 的可直接复制粘贴的**运维操作手册**。
它与后端仓库中的 `deploy/sae/SAE_DEPLOYMENT_RUNBOOK.md` 内容对应。
你应已理解[云端架构](/deploy/cloud-architecture)。

> **常规发布在哪里停。** 下面的第 5 节就是完整的标准部署。
> 第 5 节顺利完成（包括其内建的健康与契约检查）就是常规发布的**停止点**（#237）。
> 5a、6、6a、6b 节是**一次性的命名空间初始化 / 漂移对账**流程；
> 在准备命名空间或修复已报告的漂移时使用，**不要**每次部署都跑。
> 第 7–11 节是可选的校验、受保护的提升、回滚和故障排查。

## 0. 前置条件

- **Bash 4+**（macOS 的 `/bin/bash` 是 3.2——请用 Homebrew Bash 并显式调用，
  例如 `/opt/homebrew/bin/bash`）、Git、Docker + Buildx、Python 3、curl、
  **阿里云 CLI**，以及 GNU `timeout` / Homebrew `gtimeout`。
- 凭据放在一个被 git 忽略的 dotenv 文件中（默认 `.env`；可用 `DEPLOY_ENV_FILE` 覆盖）。
  切勿提交它们：

```dotenv
ACR_REGISTRY=registry.example.com
ACR_NAMESPACE=yuanzhu-ai-ns
ACR_REPOSITORY=yuanzhu-ai-runtime
ACR_USERNAME=<registry-user>
ACR_PASSWORD=<registry-password>
ALIYUN_ACCESS_KEY_ID=<access-key-id>
ALIYUN_ACCESS_KEY_SECRET=<access-key-secret>
SAE_REGION=cn-chengdu
SAE_API_ENDPOINT=sae.cn-chengdu.aliyuncs.com
```

已 export 的环境变量优先于 dotenv 文件。部署脚本在任何云端写操作之前，
会先做一次只读的 STS `GetCallerIdentity` 预检。

## 1. 准备代码检出

所有命令在后端仓库根目录执行。部署**已提交**的版本；未提交的改动不进入镜像。

```bash
git status --short
revision="$(git rev-parse HEAD)"
printf 'Deploying revision: %s\n' "$revision"
```

## 2. 两阶段 dry-run（不改动云端）

第一阶段模拟发布（当真实制品不存在时返回一个合成的全零摘要）。
第二阶段加载固定版本的 Linux 部署工具容器，在不改动云端资源的前提下模拟 SAE 操作。

```bash
image_ref="$(./deploy/sae/build-image.sh --revision="$revision" --dry-run)"

./deploy/sae/run-deploy-container.sh \
  --namespace=yuanzhu-test \
  --stage=test \
  --image="$image_ref" \
  --revision="$revision" \
  --dry-run
```

任一命令失败都不要继续。

## 3. 构建并发布镜像（第一阶段）

本阶段为 `linux/amd64` 构建已提交版本，推送到 ACR，并返回其不可变的仓库摘要。

```bash
image_ref="$(./deploy/sae/build-image.sh --revision="$revision")"
printf 'Published image: %s\n' "$image_ref"
```

保持这个终端不要关闭——下一步还需要 `revision` 和 `image_ref`。

## 4. 部署到标准命名空间（第二阶段）

在本地工作站上，第二阶段运行在其固定版本的 Linux 工具容器中
（`deploy/sae/Dockerfile.deploy`）。包装脚本以只读方式挂载仓库和所选 dotenv；
它**绝不挂载 `/var/run/docker.sock`**，因此无法构建或替换应用镜像。

```bash
./deploy/sae/run-deploy-container.sh \
  --namespace=yuanzhu-test \
  --stage=test \
  --image="$image_ref" \
  --revision="$revision" \
  --interactive
```

在已开通的 Linux 主机上，等效的直接命令是：

```bash
./deploy/sae/deploy-image.sh \
  --namespace=yuanzhu-test \
  --stage=test \
  --image="$image_ref" \
  --revision="$revision" \
  --interactive
```

部署阶段会做一次只读的 ACR 查询，并要求所提供的完整 SHA tag 解析到所提供的摘要。
因此，若版本号与镜像被调换，会在迁移或应用部署之前就失败。

## 5. 标准发布与内建校验

标准 test-stage 发布是串行执行的：

```text
capture RDS backup policy → create full snapshot backup → wait for it available
  → temporary migration runner (alembic upgrade head + checks)
  → yuanzhu-ai-submit-worker
  → yuanzhu-ai-poll-worker
  → yuanzhu-ai-api
  → built-in health + contract verification
```

脚本自动完成以下事项：

- **PostgreSQL 快照恢复点（#238）：** 在创建迁移运行器之前，它会校验该命名空间的
  RDS 备份策略（保留期 ≥7 天），创建一份全量物理/快照备份，轮询返回的精确备份任务，
  并确认备份集可用于恢复。它从不删除旧备份。
- **迁移凭据分离（#214/#234）：** 运行器把命名空间 Secret
  `yuanzhu-migration-secrets` 中的 `MIGRATION_DATABASE_URL` 映射为 `DATABASE_URL`。
  API 和 worker 保留各自现有的运行时 `DATABASE_URL`，绝不挂载该 Secret。
- **迁移失败关闭：** 先运行预检读取（`alembic current/heads/history`）；
  在你交互式批准后，运行器应用 `alembic upgrade head`，然后执行
  `alembic current --check-heads` 和 `alembic check`。任一失败则停止应用发布。
- **托管字段契约：** SAE 部署只设置运行时镜像、`Command`/`CommandArgs`，
  并把 `APP_VERSION=<full-sha>` 合并进现有环境数组。生命周期探针、自动扩缩、
  SLS 和 Secret 引用都被保留。

请审阅只读的迁移预检输出和迁移批准提示。

**标准部署到此结束。** 不要把 5a–6b 节当成必需步骤一路执行下去。

### 5a. 规划 / 对账迁移数据库凭据（一次性）

仅在首次配置命名空间，或其只读 plan 报告漂移时运行：

```bash
# 只查看，不改动任何东西
./deploy/sae/configure-migration-db.sh --namespace=yuanzhu-prod --dry-run

# 审阅 plan 后幂等应用
./deploy/sae/configure-migration-db.sh --namespace=yuanzhu-prod --apply --interactive
```

plan 在内存中解析 API 的运行时 `DATABASE_URL`，校验 RDS 实例绑定、`yuanzhu_app`
所有权、运行时授权，以及专用迁移 Secret。Apply 是幂等的，契约已匹配时返回 no-op。

### 6. 对账公开 SAE 入口与 DNS（一次性）

```bash
./deploy/sae/configure-network.sh --namespace=yuanzhu-prod --dry-run   # 规划
./deploy/sae/configure-network.sh --namespace=yuanzhu-prod --apply --interactive
```

它管理公开 `443` → 容器 `8080` 的唯一 HTTPS 监听器；仅当监听器形状在其他方面
完全一致时才轮换证书；并在直接存活/就绪探针通过后才移动 DNS。
使用 `--skip-dns` 可只开通入口而不动 AliDNS。

### 6a. 对账 OSS 控制项（一次性）

```bash
./deploy/sae/configure-oss.sh --namespace=yuanzhu-prod --dry-run
./deploy/sae/configure-oss.sh --namespace=yuanzhu-prod --apply --interactive
```

它对账私有 ACL、Block Public Access、AES-256 加密、版本管理、精确的浏览器 CORS，
以及仅限 `temp/assets/` 的 7 天生命周期规则。若生命周期规则与持久前缀重叠，
则失败关闭，需加 `--replace-unsafe-lifecycle`。

### 6b. 对账 CDN 分发（一次性）

```bash
./deploy/sae/configure-cdn.sh --namespace=yuanzhu-prod --dry-run
./deploy/sae/configure-cdn.sh --namespace=yuanzhu-prod --apply --interactive
```

一旦 CAS 证书覆盖了嵌套主机名，公开 scope 即可安全应用。私有 scope 额外要求
`--private-signer-ready` 和一个按命名空间设置的
`PRIVATE_ASSET_CDN_AUTH_KEY`（通过受保护环境或 gitignore 的 `.env` 注入，
绝不出现在命令行上）。

## 7. 重新校验云测（可选，不重新部署）

第 5 节已经跑过内建检查。仅在你必须不重新部署地重新校验时使用：

```bash
export CLOUD_TEST_PUBLIC_API_BASE_URL='https://test-api.yuanzhushuzhi.com'

./deploy/sae/deploy.sh \
  --namespace=yuanzhu-test --stage=test \
  --verify-only \
  --api-base="$CLOUD_TEST_PUBLIC_API_BASE_URL"
```

如需带凭据的 E2E 冒烟证据：

```bash
./deploy/sae/deploy.sh \
  --namespace=yuanzhu-test --stage=test \
  --verify-only \
  --api-base="$CLOUD_TEST_PUBLIC_API_BASE_URL" \
  --smoke-secret=.env.cloud-test \
  --require-smoke
```

`--verify-only` 不执行构建/推送、仓库登录、迁移或任何 SAE 写操作。

## 8. 提升到生产

见[生产提升与回滚](/deploy/production)。生产提升和回滚是相互独立的受保护流程；
标准 test-stage 容器入口点会拒绝生产改动，因为它不收集受保护发布的证据。

## 9. 其他参数

| 参数 | 含义 |
| --- | --- |
| `--build-only` | 确保该提交的 `runtime` 镜像在本地存在（不推送，不动 SAE） |
| `--publish-only` | 确保不可变的完整 SHA 镜像已在 ACR 中（不动 SAE） |
| `--single=<target>` | 仅 test-stage：只部署单个目标（`migrate`、`api`、`submit-worker`、`poll-worker`） |
| `--dry-run` | 打印所有写操作/校验/批准，不改动任何东西 |
| `--interactive` | 迁移批准关卡 + 交互提示 |
| `--rebuild` | 强制全新 BuildKit 构建（配合 `--build-only`） |
| `--install-deps` | 可选项，仅用 Homebrew 安装 `aliyun-cli` / `coreutils` |

## 10. 常见失败

| 失败 | 处理 |
| --- | --- |
| 缺少本地命令 | 安装前置依赖后原样重跑命令 |
| 阿里云身份校验失败 | 确认 AccessKey 处于启用状态、STS 已授权、出站 HTTPS 可用 |
| 网络权限检查列出缺失动作 | 仅添加列出的 RAM 动作，重跑只读 plan |
| 没有匹配的证书 | 先签发/购买该命名空间主机名的证书 |
| 缺少规范工作负载名 | 在命名空间中创建 `yuanzhu-ai-api`、`yuanzhu-ai-submit-worker`、`yuanzhu-ai-poll-worker` |
| 缺少规范迁移 Secret | 创建仅含 `MIGRATION_DATABASE_URL` 的 `yuanzhu-migration-secrets`；绝不在 API/worker 中挂载它 |
| RDS 恢复点预检失败 | 检查 RDS 实例 ID、`rds:DescribeBackupPolicy/Tasks/Backups/CreateBackup`，以及 ≥7 天保留期 |
| 迁移预检/执行失败 | 查看脱敏后的运行器输出；不要手动部署应用 |
| `alembic check` 报告有操作待执行 | 新增一个前向迁移；绝不编辑已应用的版本 |
| `/health/ready` 返回 503 | 检查 RDS、Redis、配置和 API 日志 |

## 11. 校验部署脚本改动

```bash
find deploy/sae -type f -name '*.sh' -print0 | xargs -0 -n1 bash -n
./deploy/sae/tests/refactor_smoke.sh
./deploy/sae/tests/provider_schema_compatibility_smoke.sh
./deploy/sae/tests/protected_release_outage_smoke.sh
/bin/bash deploy/sae/deploy.sh --help   # 在 Bash 3 上会清晰报出前置错误
```

## 下一步

- [GitHub Actions CI/CD](/deploy/ci-cd)——自动化。
- [生产提升与回滚](/deploy/production)。
