# 常见问题与首轮排查

## 应该在哪个文件夹、哪个分支运行？

应用命令在 `wechat_mini_program`（`ui-integration`）或 `YuanZhu-AI`（`main`）内运行，文档命令在 `docs` 内运行。复制仓库专用命令前执行 `pwd`、`git branch --show-current`。前端固定 pnpm **9.15.9**，文档仓库固定 **10.28.2**；[macOS 准备](/zh/get-started/macos-setup)展示两者用法。

## 首次预览必须启动后端吗？

不需要。前端 Mock 构建独立模拟界面。集成验收则使用 API 构建，连接有真实数据库、对象存储的本地后端。该后端的模拟登录、支付和模型提供商，与前端 Mock 数据源是不同层次。

## 只想跑模拟图片，为什么 Docker 仍要求 SSH？

服务端镜像通过 BuildKit SSH 构建私有 `Orientation-CD/jinqiuai` 依赖，本地构建也一样。只有前后端仓库权限并不够。请和维护者确认私有仓库读取权限及已加载的 SSH 密钥，见[本地服务栈](/zh/deploy/local-stack)。

## 后端健康，为什么登录或功能发现仍失败？

健康检查验证服务依赖，不证明当前法律文档、Feature、模板、价格和套餐已配置。新本地栈可读取授权的云测试配置；已有配置卷会受到保护，不能直接替换。请完成[快速开始](/zh/get-started/quickstart)中的配置前置步骤。

## 为什么覆盖 API 地址没有生效？

`dev:mp-weixin:api-local`、`build:mp-weixin:api-local` 在脚本内部固定 **8080**。在脚本前设置另一个 `VITE_API_BASE_URL` 无法覆盖内部赋值。自定义端口请用[快速开始](/zh/get-started/quickstart)中的显式 `pnpm exec uni` 命令，随后重新编译。

## 额外添加 API 前缀后返回 404 怎么办？

当前公共接口是 `/v1`。基础地址应为 `http://127.0.0.1:8080` 这样的 Origin，前端会拼接 `/v1/...`。只有独立代理确实配置了额外前缀时，才需要对应代理地址。

## 为什么能选选项，却不能提交？

检查登录、当前空间/项目、服务端能力是否开放、个人生效订阅的权限以及 Token 余额。前端订阅场景覆盖是演示，不能更改后端权益。账号跨空间最多五个待处理/运行中任务。服务端拒绝时应保留草稿，解决原因后再重试。

## 微信本地模拟后端为什么仍然调不起支付？

API 构建仍调用原生微信支付桥；`VITE_PAYMENT_MODE=mock` 不会把它变成模拟收银台。仅本地模拟微信支付的后端提供本人认证 `/mock/payments/{id}/complete`。 [快速开始](/zh/get-started/quickstart)给出不在日志输出 Token 的结算示例；该测试不能证明真实支付已经接通。

## API 正常，为什么图片或音频失败？

文件 Origin 可能和 API 不同。检查 `VITE_RESULT_STORAGE_ORIGINS`、MinIO 派生端口、签名地址有效期及平台合法域名。CDN JSON 与抖音网络音频播放需要 **request** 合法域名，仅登记上传/下载不够。见[平台接入](/zh/frontend/platforms)。

## 为什么没有项目 Tab？

项目仅在 `VITE_ENABLE_PRIVATE_PROJECTS=true` 时编译进入。正式 API 构建会启用；通用 Mock 脚本不一定启用。修改设置后重新构建，Tab 出现后后端仍会校验权限。

## 报告问题时提供什么？

记录源码提交、构建命令/模式、平台、自己拥有的本地端口/项目、复现步骤、预期与实际结果，以及安全的错误码/请求 ID。不要粘贴访问 Token、签名文件 URL、手机号授权码、`.env` 或支付签名。适用时使用应用里的诊断导出。

## 新页面、缺失路由与权限差异

| 现象 | 先查什么 |
| --- | --- |
| 有专业户型入口却没有 API | [分支对齐差异](/zh/reference/integration-status)，候选夹具不等于服务端 main |
| 上传完成但提交拒绝 | [归档／激活边界](/zh/reference/flows/asset-upload-flow)，仍检查钱包、权益、成员额度 |
| 企业有积分但成员不能提交 | [月额度](/zh/reference/flows/member-quota-flow)，企业余额不足优先于成员上限错误 |
| owner 可读成员任务却无输入／编辑按钮 | 有意的[只读投影](/zh/reference/flows/workflow-history-flow)，不是编辑器损坏 |
| 同款模板保存成功但不能执行 | [提示词运行时校验](/zh/admin/prompts)，保存不证明脚本有效或模型配置成功 |
| 性能报告不完整／无法比较 | [覆盖与样本门槛](/zh/admin/performance)，不表示零耗时 |

## 源码依据

核对版本：前端 `21db6d8`、后端 `e59716c`（2026-10-28）。[构建命令](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/package.json) · [运行模式](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/src/repositories/runtime.ts) · [本地模拟结算](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/billing/billing_api.py)。
