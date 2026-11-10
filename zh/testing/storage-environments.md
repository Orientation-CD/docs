# 存储与测试环境

根据变化的真实边界选择存储：MinIO 验证本地 S3 兼容路径，OSS 额外验证真实签名、endpoint、CORS 与云服务边界。任一选择本身都不证明真实支付或模型供应商验收。

## 先隔离会话

使用负责人选定的 API 端口与独立 Compose project。每次运行启动器/runner 前检查 API、派生 MinIO 端口、运行/停止容器和保留卷：

```bash
export DEV_TEST_PORT='<负责人选定的 API 端口>'
export DEV_TEST_PROJECT="yuanzhu-${DEV_TEST_PORT}"
```

MinIO API/console 分别是 API + 21504 / + 43008。不能暗中接管冲突栈或换端口。私有 `jinqiuai` 镜像构建即使在 mock 场景也需要授权 SSH agent，见[本地环境](/zh/deploy/local-stack)。

## 配置层次

| 层次 | 含义 |
| --- | --- |
| `--port`、`--project`、`--storage`、登录模式、`--secret` | 选择拓扑与验证输入 |
| 忽略的 dotenv | 共享设置/秘密与 Compose 插值输入，不是 shell 代码 |
| 生成 `STACK_*`、显式 Compose `environment:` | 派生主机/容器拓扑，显式映射覆盖服务 `env_file` |
| 服务 `env_file` | 未被显式覆盖的进程环境 |
| Settings 环境变量 / 当前目录 `.env` / 代码默认 | 应用加载优先级；正常镜像排除仓库 `.env` |

查看运行容器的实际配置，而不是从修改过的宿主文件推断。`docker compose ... config --quiet` 可验证展开；完整渲染配置可能包含秘密，不要贴入公开日志。

## 独立配置文件

创建权限受限、被 Git 忽略的 `.env.minio-test`、`.env.oss-test`，仅保留需要的应用/Admin/云端导入值和所选存储/登录凭据。共享文档只写占位符。

MinIO 模式派生容器内 endpoint 与浏览器可达 host/port。OSS 需要 bucket、region、访问凭据与公网 HTTPS S3 endpoint，本地机器不能访问 `-internal.aliyuncs.com` 地址。CDN 不能替代签名上传 endpoint。直传协议是 multipart **POST**，随后完成校验。

保留的手工开发栈，仅在全新卷上通过 `--import-cloud-config` 守卫导入。smoke/E2E 通常自己导入已验证云测快照：提示词、Feature、Workflow/Operation、订阅、积分包和法律文档，需要授权 `CLOUD_API_URL`、`CLOUD_ADMIN_USERNAME`、`CLOUD_ADMIN_PASSWORD` 及本地 Admin 凭据。不导出 provider 密钥，拒绝生产目标。API ready 但产品/法律配置空缺，不是可用登录/作业环境。

## focused smoke 与 E2E

完成归属和存储授权后，命令形态为：

```bash
./scripts/run_smoke_tests.sh --local localhost \
  --port "${DEV_TEST_PORT:?请先选择本会话端口}" \
  --project "$DEV_TEST_PROJECT" --wechat mock --storage minio \
  --secret .env.minio-test -- smoke_tests/test_design_report_workflow.py

./scripts/run_e2e_tests.sh --local localhost \
  --port "$DEV_TEST_PORT" --project "$DEV_TEST_PROJECT" \
  --wechat mock --storage oss --secret .env.oss-test --mode coverage
```

OSS 边界修改按上游策略增加获准的 OSS profile/变体。本地 runner 会重建所选栈并保留卷，不是只读探测。云模式显式传 `--cloud https://...` 使用已有服务；云 E2E 还需独立协调 Redis 和只读监控 PostgreSQL 凭据，不能指向生产/客户数据。

## 生产候选升级验证

规范测试策略使用**一份部署基线副本**，不再额外执行 fresh-stack E2E：

1. focused 测试、变更行/分支覆盖、风险审阅及两位保留审阅者对准确候选版本通过后，将获准只读云数据库 dump 恢复到本会话临时 PostgreSQL 卷。
2. 候选迁移同一卷，本地化 provider 与当前法律正文；不启动旧 API/worker、不写云源库。
3. 先对 MinIO 跑受影响 smoke，再在同一迁移数据库对真实 OSS 跑 E2E coverage，随后跑 300 秒 OSS endurance。阶段间不导入旧云配置、不重复成功迁移。
4. E2E 成功后停 writer，按 receipt 清理所属 OSS；清理失败单独重试。所有要求的 E2E 通过后才跑完整、有并发边界的 portable/resource 回归；浏览器与 SDK 清单仍独立要求。

coverage 为两个用户容器、每容器两个手机用户，加一个管理员；endurance 为十个用户容器、每容器十个手机用户，加一个管理员。诊断覆盖参数不能替代规范门禁。runner 在 ignored `.local/upgrade-gates/` 保留私有恢复材料，仅清理核验属于自己的资源。

规范另记录了 #918/#925 有时限、仅此交付适用的 endurance 延期，不是通用豁免或负载通过结果。复用该证据前核对实际范围与到期条件；源码审计不能证明部署已经通过这些门禁。

纯文档工作只需文档验证。实际产品门禁由当前上游规范与 runbook 决定；本页不授权付费供应商、真实支付、云写入或破坏性清理。

## 复用已升级夹具而不覆盖配置

迁移／部署升级门禁已经准备保留栈的产品配置时，smoke／E2E runner 使用 `--preconfigured`，避免旧云端配置覆盖候选已核验状态。新会话仍需核对端口、项目所有权和存储授权。

存储证据现包含输入归档：SQL 提交 claim → SQL 外精确版本复制／核验 → COMPLETED receipt → 准入时最终 ACTIVE 归属及 pins。授权存储写操作前按相关源码测试验证恢复；模拟供应商不能证明 OSS 版本、CORS、复制回执或孤儿对象协调。见[归档链路](/zh/reference/flows/asset-upload-flow)和[修复边界](/zh/deploy/production#input-recovery)。

## 源码依据

已按[本文档记录的源码版本](/zh/reference/source-revisions)核对；实际运行配置与云端启用状态需要单独确认。

- [环境与门禁规范](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/tests/documents/TEST_STRATEGY.md)
- [实时运行手册](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/scripts/runbook.md)
- [Compose 优先级和拓扑](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/docker-compose.yml)
- [部署基线升级 runner](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/scripts/run_deployed_upgrade_gate.sh)
