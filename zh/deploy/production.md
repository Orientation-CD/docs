# 生产晋级与恢复

生产晋级复用已通过云测的镜像，不重新构建。执行前由 namespace 负责人批准停机、候选版本、不同的回滚版本、验证证据和第二审阅者。

## 受保护晋级

在获准发布主机和已审阅后端 checkout 中：

```bash
./deploy/sae/deploy.sh \
  --namespace=yuanzhu-test --stage=production \
  --promote="$RELEASE_SHA" --rollback-sha="$ROLLBACK_SHA" \
  --cloud-test-workflow="$CLOUD_TEST_WORKFLOW_URL" \
  --smoke-evidence="$SMOKE_EVIDENCE" --approver="$APPROVER" \
  --change-record="$CHANGE_RECORD"
```

两个 SHA 都是完整不可变版本。脚本验证当前/目标/恢复 tag 的 ACR digest 与兼容边界，捕获三个角色的版本和配置/运行容量，停止 API 并反复证明 `STOPPED`、零实例、无活动 change order，建立 RDS 恢复点，迁移并安装兼容角色，最后显式恢复服务与容量。必须完成每个交互检查点。

如候选待执行迁移要求 worker 也停止，应使用上游 `--maintenance-mode`：停止全部写入角色、安装完整停止态兼容舰队、先启动 worker 后启动 API。迁移后失败可能按设计保持停止，等待明确的向前修复；不能从一个任意检查点直接续跑发布。

## 项目成败是独立启用边界

`PROJECT_OUTCOMES_ENABLED` 默认为 `false`。先以关闭状态部署兼容 API/worker 并验证迁移 `b7c4e8a1d629`。确认前端已支持 WON/LOST、流失信息、分离统计和完整列表，并留出客户端更新期。

首次启用使用单独批准的 API 停机和**普通受保护流程**，不是 maintenance-mode。在迁移成功/准备 submit worker 检查点保持提示等待，独立证明 API 停止/零实例。对 API、两个 worker 逐个读取新鲜完整 Envs，合并该字面量开关，以 SAE `DeployApplication --Deploy false` 提交并读回，保留其他变量、Secret 引用、镜像/版本/容量。全部确认后再继续 worker 安装；确认两个 worker 已启用且 API 仍停止，才继续 API 安装/显式启动。`configure-env.sh` 不支持任意开关。

不能让开/关实例混合提供服务：开启实例写入 WON/LOST 后，关闭实例可能无法投影并返回 500。写入成败数据前，可按审阅的停机流程恢复原配置；任何 WON/LOST 写入后都必须保持开关开启、兼容读写程序和 schema。关闭开关、降级 schema、删除成败数据都不是绕过兼容保护的方式。

## 项目活动有自己的恢复边界

活动迁移 `c8d5f1a2e730` 待执行时要求 maintenance-mode；保留 outcomes 配置，不与首次成败启用合并。`PROJECT_ACTIVITY_COMPATIBILITY_V1` Git-tree marker 区分新旧写入者。首次 bootstrap 中记录为 `BOOTSTRAP_PRE_MIGRATION_ONLY` 的旧镜像，不具备迁移开始后的恢复权限；marker 证明镜像身份兼容，不证明数据库可信。

如果旧写入者真的越过活动边界运行，先隔离/停止所有写入者，由有完整 DBA 可见性的会话证明无未结束事务，停止态安装兼容配置，再使用 `app.workspaces.project_activity_operator` 的 show/advance 流程，传准确 expected epoch 和 incident reference，保留回执及投影。恢复备份也要核对快照时间和污染区间；缺失、较旧或 null 状态不能自动恢复可信。不能清空或降低活动 epoch。

## 应用回滚

只对已审阅的兼容恢复镜像运行：

```bash
./deploy/sae/deploy.sh \
  --namespace=yuanzhu-test --stage=production \
  --rollback="$ROLLBACK_SHA" --approver="$APPROVER" \
  --change-record="$CHANGE_RECORD"
```

回滚安装代码，不回退 PostgreSQL。normalized-provider、订阅 tier、Project schema 与活动边界检查仍适用；有 digest 不代表旧镜像安全。迁移后没有兼容恢复镜像时，应保持相关舰队停止，选择获准向前修复，或另获授权的已验证备份恢复并明确 RPO/数据损失。

## 事故证据

保留脱敏发布记录、change order、AppId/容量、候选/当前/恢复 digest、迁移状态、备份和外部活动回执。响应不明确先只读对账，不重复 stop/start/deploy。检查点取消可能触发恢复并启动 API，同时保留当前云端 Envs；手工配置协调期间保持会话打开，不能假设取消会撤销已暂存开关。

## 定点输入恢复 {#input-recovery}

新任务在接受前耐久归档自有输入。已有已完成任务的历史输入可能需要明确指定目标的修复；常规部署不会自动扫描、重写全部输入。

在匹配的后端环境先只读检查授权的 Job／Asset 对：

```bash
python -m app.assets.input_asset_repair --job-id '<job-uuid>' --asset-id '<asset-uuid>'
```

默认 dry-run，`--apply` 是针对同一已核验对象对的运维写操作。CLI 不发现目标、不启动服务、不建 schema；已执行物理 pins、任务状态、收费及原始内容身份不变。`INPUT_REPAIR_AMBIGUOUS_OWNER` 需要归属决策，不能挑第一个消费者。复制回执不确定时保留 receipt／lease，按恢复契约处理，不删除元数据绕过。

记录打包的 Alembic heads、`alembic current --check-heads`、`alembic check`，不要永久写死一个“最新 revision”。新增输入／视频／额度 schema 不替代原有停机和兼容要求。写操作前阅读[修复实现](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/assets/input_asset_repair.py)及[归档实现](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/assets/asset_input_archival.py)。

## 销售阶段增加持久化激活边界

当前生产用户使用 `test-api.yuanzhushuzhi.com` / `yuanzhu-test`，虽然历史名称带 test；测试/开发使用 `api.yuanzhushuzhi.com` / `yuanzhu-prod`。保留映射，按实际用户决定生产保护，不能按名称猜测。

待执行销售阶段迁移 `a6b876c1d430` 要求全栈停机，即使指派迁移 `f4a843b2c610` 已应用。`PROJECT_SALES_STAGES_ENABLED` 默认 false；仅升级 schema 不初始化历史阶段事实。首次启用需要完整兼容栈及 `PROJECT_SALES_STAGES_COMPATIBILITY_V1`、单独批准的停写窗口和固定 runbook 的已捕获维护会话。所有 writer 停止时，按完整合并 Envs 给 API/submit/poll 设置同一模式绑定，保留无关条目；Secret/ConfigMap 归其既有配置所有者操作。

`sales-stage-inspection` 在 READ ONLY 事务中读取真实持久化 singleton。初始化器把恢复的来源证据/审计、投影和 `enabled_at` 原子提交，再在任何角色启动前读回。再次以启用模式启动仅核验，不重放历史。保存分类回填报告；没有可回填项目不能证明非空恢复。生产启用前应验证目标旧客户端，并演练已审阅版本的隔离生产副本。

存在 `enabled_at` 后，即使没有任何项目，也拒绝关闭模式或选择没有兼容标记的恢复镜像。`BOOTSTRAP_PRE_ACTIVATION_ONLY` 只记录前驱，不授权激活后重新启动它。初始化结果不确定时保持停栈，先只读协调，再按兼容前进修复；不能删除标记、盲重试云写或降级 schema。普通 dry-run 不执行新的数据库探针，不能当作激活证明。

源码：[deploy/sae/SAE_DEPLOYMENT_RUNBOOK.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/deploy/sae/SAE_DEPLOYMENT_RUNBOOK.md) · [deploy/sae/lib/migration.sh](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/deploy/sae/lib/migration.sh) · [deploy/sae/lib/preflight.sh](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/deploy/sae/lib/preflight.sh)。

## 源码依据

已按[本文档记录的源码版本](/zh/reference/source-revisions)核对；实际运行配置与云端启用状态需要单独确认。

- [生产、成败与活动运行流程](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/deploy/sae/SAE_DEPLOYMENT_RUNBOOK.md)
- [受保护发布实现](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/deploy/sae/deploy.sh)
- [活动修复操作器](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/workspaces/project_activity_operator.py)
- [活动兼容 marker](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/deploy/sae/PROJECT_ACTIVITY_COMPATIBILITY_V1)
