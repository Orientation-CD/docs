# SAE 部署手册

本页说明常规**云测**发布及检查点。实际执行需要环境负责人的授权和凭据；生产使用[受保护晋级流程](/zh/deploy/production)。

## 准备输入

使用干净、已审阅的 checkout，记录完整候选 SHA。准备被忽略的部署凭据、ACR 仓库、namespace/RDS 身份，以及可读取私有 `jinqiuai` 的 SSH agent。不要输出 dotenv 或完整云端 Envs 数组。

发布前阅读下方固定版本的上游手册，其中有各迁移的准备和恢复要求。确认运行数据库账户、独立迁移 Secret、存储配置和拉取 Secret 选择；通用命令不能代替这些检查。

## 两阶段构建与部署

在后端 checkout 中先验证交接，不发布镜像、不修改云端：

```bash
revision="$(git rev-parse HEAD)"
image_ref="$(./deploy/sae/build-image.sh --revision="$revision" --dry-run)"
./deploy/sae/run-deploy-container.sh \
  --namespace=yuanzhu-test --stage=test \
  --image="$image_ref" --revision="$revision" --dry-run
```

全零模拟 digest 仅在 dry-run 接受。获准进行常规云测发布后，两阶段都移除 `--dry-run`：第一阶段从精确提交构建/推送 `linux/amd64` runtime，返回 digest；第二阶段在任何写操作前证明完整 SHA tag 与 digest 的绑定。

部署工具容器使用固定版本工具，只读挂载源码和选定 dotenv，不挂载 Docker socket，因此不能构建应用镜像。该入口仅允许 test stage。已准备好的 Linux 发布主机可直接运行 `deploy-image.sh` 完成同样常规流程。

## 迁移与安装检查点

1. 捕获一致的 API/submit/poll 当前身份、容量，验证 registry 通道和拉取凭据。
2. 验证 namespace/RDS/数据库/运行角色绑定和迁移 Secret；需要协调时提前执行独立获准流程。
3. 完成要求的备份、迁移与 schema drift 检查。迁移失败或 `alembic check` 有差异时阻止发布。
4. 按兼容顺序安装同一 digest 的 worker/API，等待每个 change order，核对实际版本与容量。
5. 验证 live/ready，再运行获准的认证业务检查。健康检查不能证明法律文档、订阅授权、提示词、模型配置或支付回调正确。

部分当前迁移必须**停整套写入服务**。项目活动迁移 `c8d5f1a2e730` 需要宿主机的 `deploy.sh --maintenance-mode`，不能假设每个候选都适用常规滚动路径。获准云测时，上游命令形态为：

```bash
./deploy/sae/deploy.sh --namespace=yuanzhu-test --stage=test \
  --branch=main --commit="$RELEASE_SHA" --maintenance-mode --interactive
```

maintenance 流程证明 API 和两个 worker 均停止/零实例，备份、迁移一次、安装兼容的停止态角色，再先启动 worker、后启动 API。保留已有 outcomes 开关；首次启用项目成败属于另一维护窗口。

## 基础设施协调独立执行

`configure-migration-db.sh`、`configure-network.sh`、`configure-oss.sh`、`configure-cdn.sh` 是独立 plan/apply 工具，不是每次发布都要重复的云写操作。先阅读 `--help`、针对准确 namespace 做只读 dry-run，只应用实际获准的变更。不要手改 owner 或迁移 Secret 绕过前置失败。

`configure-env.sh` 仅支持已批准的支付配置，不是通用特性开关工具。outcomes 必须在已证明的 API 停机下按完整 Envs 合并流程处理，见[生产晋级与恢复](/zh/deploy/production)。

## 保留证据

记录候选/供应商提交、digest、namespace、解析出的 AppId、前后容量、迁移 head、备份/恢复引用、change order 和业务验证结果，秘密材料另存。云测 smoke 必须显式提供云测 URL 和授权测试身份，不会创建本地栈，也不提供远程源码覆盖率。

生命周期响应不明确时，先核对已有 change order 与真实运行状态，再决定是否写入；不要把超时当成功，也不要盲目重跑整个发布。

## 源码依据

已按[本文档记录的源码版本](/zh/reference/source-revisions)核对；实际运行配置与云端启用状态需要单独确认。

- [完整运维手册](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/deploy/sae/SAE_DEPLOYMENT_RUNBOOK.md)
- [不可变镜像构建](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/deploy/sae/build-image.sh)
- [容器化云测部署](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/deploy/sae/run-deploy-container.sh)
- [受保护发布实现](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/deploy/sae/deploy.sh)
