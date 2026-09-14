# 生产提升与回滚

本页讲解如何把一个**已验证**的镜像提升到生产 SAE 命名空间，以及在需要时如何回滚。
生产是受控环境：它绝不重新构建、强制交互式批准、把停掉 API 作为数据库写栅栏、
捕获一份全新的 RDS 恢复点，并记录每一次发布。

## 这里的"生产"指什么

生产使用 `--stage=production` 针对某个命名空间（通常是 `yuanzhu-prod`，
其公开 API 为 `https://api.yuanzhushuzhi.com`）。stage 选择受保护的发布策略；
它不重命名命名空间，也不改写云端持有的 `ENVIRONMENT`。
对一个已配置 `ENVIRONMENT=production` 的应用进行常规 test-stage 部署会被拒绝。

提升**绝不重新构建**。它只是提升一个已存在于 ACR、且具备云测证据的完整 SHA 镜像。

## 提升（Promotion）

```bash
./deploy/sae/deploy.sh \
  --namespace=yuanzhu-prod \
  --stage=production \
  --promote=<40-char-cloud-tested-sha> \
  --rollback-sha=<40-char-current-safe-sha> \
  --cloud-test-workflow='https://github.com/.../actions/runs/...' \
  --smoke-evidence='change-ticket-or-artifact-reference' \
  --approver='second-reviewer' \
  --change-record='CHG-1234'
```

### 必填输入

| 输入 | 为什么需要 |
| --- | --- |
| `--promote=<sha>` | 通过云测校验的完整 40 位 SHA |
| `--rollback-sha=<sha>` | 已知良好、可回退到的完整 SHA |
| `--cloud-test-workflow=<url>` | 该镜像在云测中已验证的证据 |
| `--smoke-evidence=<ref>` | 冒烟/变更单 artifact 引用 |
| `--approver=<name>` | 第二复核人（双人规则） |
| `--change-record=<id>` | 变更单 ID，例如 `CHG-1234` |

部署器在命名空间内解析四个规范工作负载名（`yuanzhu-ai-api`、
`yuanzhu-ai-submit-worker`、`yuanzhu-ai-poll-worker`，外加临时迁移运行器），
并把任何 `SAE_*_APP_ID` 覆盖值与解析出的 ID 做校验。

### 预检检查（交互式批准）

在任何改动之前，脚本会校验：

- 所选镜像**和**回滚镜像都已存在于 ACR。
- API 和两个 worker 当前运行的是**同一个不可变镜像版本**和同一个完整
  `APP_VERSION`；捕获每个角色的配置副本数和完全运行的副本数。
- 所选、回滚、以及捕获的当前 SHA 都是规范化提供商底线
  `3059428f0fe1bdda95abe329eb97bcaae50e87c2`（或唯一已评审 PR #249 的
  squash-source 等价物）的后代，且每个完整 SHA tag 都解析到其观察到的不可变摘要。
- API 和两个 worker 都**至少有两个**配置/运行实例。
- API 的就绪探针、preStop、最小就绪数，以及**300 秒终止宽限**；
  worker 300 秒终止宽限，配合 `WORKER_JOB_COMPLETION_WAIT_SECONDS=270`。
- 生产提供商设置、共享的 RDS/Redis/OSS 配置，以及 API/worker 之间一个匹配的
  整 Secret 引用。
- 运维人员显式确认：expand-compatible 迁移、Seedream 超时、**真实**微信支付配置
  （禁止 mock 模式；接受 `disabled` 或 `live`）、云测证据、双人复核。

### 发布顺序（刻意制造的 API 停机）

```text
capture current state
  -> stop API (prove STOPPED, 0 running, no active change order)
  -> create full RDS snapshot backup (#238, wait for available)
  -> migration on the promoted image (alembic upgrade head + checks)
  -> yuanzhu-ai-submit-worker
  -> yuanzhu-ai-poll-worker
  -> yuanzhu-ai-api (at captured capacity)
  -> live verification
```

API 停机是一道**数据库写栅栏**。在备份/迁移边界两侧、每次应用割接两侧、
以及启动前的瞬间，都会重新校验"已停止"状态。若在停机前或任意割接后检测到
worker 副本数变化，流程会在下一次改动前停止。

如果迁移或某次割接失败，脚本会把所有已变更的角色恢复到捕获的停机前镜像/
`APP_VERSION`（仅当该确切身份通过了停机前底线和摘要校验时），然后重启 API。
若在已接受流量后校验失败，API 会被停止，但**不尝试自动回退版本**——
两种 schema 表示可能已经分叉。

## 冒烟测试

- **内建发布校验**在 API 启动后自动运行：`/health/ready`（PostgreSQL + Redis）
  和一个发布关键的 OpenAPI 路由契约。
- **带凭据冒烟**（当有 `.env.cloud-test` secret 时）运行
  `scripts/run_smoke_tests.sh`，覆盖真实 API → Redis → worker → Mock 提供商路径。
  通过 `--verify-only` 上的 `--require-smoke` 触发。
- 证据记录在不含密钥的发布记录中。

## 数据库迁移

- 迁移**只**在被提升的镜像上、停 API 的窗口内运行。
- 迁移运行器使用专用的 `yuanzhu-migration-secrets` Secret（`MIGRATION_DATABASE_URL`），
  绝不使用运行时 `DATABASE_URL`（#214/#234）。
- 运行器失败关闭：`alembic current --check-heads` 和 `alembic check` 都必须通过，
  否则应用发布中止。
- 迁移必须是 **expand-compatible**（增量式、向后可读），以便回滚镜像在
  迁移后的 schema 上仍能工作。

## 回滚

回滚是事件/恢复操作，不是常规部署后的步骤。它**绝不降级或执行数据库迁移**。

```bash
./deploy/sae/deploy.sh \
  --namespace=yuanzhu-prod \
  --stage=production \
  --rollback=<40-char-rollback-sha> \
  --approver='second-reviewer' \
  --change-record='CHG-1234'
```

回滚顺序：

```text
capture current state -> compatibility + digest proof -> stop API
  -> NO migration -> submit worker -> poll worker -> API
  -> start API at captured capacity -> verification
```

在停 API 之前，所选回滚版本和捕获的当前版本都必须对照 Git 底线证明身份，
并把每个 `APP_VERSION` 绑定到其不可变 ACR 摘要。旧的 `image_provider_configs`
表和 `design_job_types.provider_adapter` 列已被一次仅规范化的清理迁移移除；
恢复是**仅前向**的：使用一个预先验证的兼容镜像，或恢复失败/回滚那次发布
开始时创建的全新 RDS 恢复点。如果 schema 不向后兼容，应停止并做前向修复，
而不是回退。

## 发布记录

真正的生产尝试会把一份**不含密钥的 Markdown 发布记录**写入：

```text
${RELEASE_RECORD_DIR:-/tmp/yuanzhu-sae-release-records}
```

记录包含命名空间 ID、每个解析出的 AppId、所选 SHA/摘要、各角色捕获的镜像/
`APP_VERSION`/副本数、确切的底线证明方法、停/启动和迁移运行器的变更单 ID、
不确定状态、目标/恢复变更单、审批人/运维人、线上校验状态和回滚信息。
把 `RELEASE_RECORD_DIR` 设为运维托管的位置，以便记录持久保存。

## 安全要点小结

| 属性 | 强制方式 |
| --- | --- |
| 生产不重建 | 只提升已存在的 ACR 摘要 |
| 人工批准 | 双人复核 + `--approver` + 变更记录 |
| 迁移安全 | 停 API 栅栏；失败关闭；专用迁移 Secret |
| 恢复点 | 每次迁移前创建全新的全量 RDS 快照（#238） |
| 证据链 | `--cloud-test-workflow`、`--smoke-evidence`、发布记录 |
| 优雅停机 | 300 秒终止宽限 > 270 秒 worker 完成等待 |
| 仅前向 schema | 回滚不降级数据库；旧表已移除 |

## 下一步

- [SAE 部署操作手册](/deploy/sae-deployment)——完整运维流程。
- [GitHub Actions CI/CD](/deploy/ci-cd)——围绕它的自动化。
