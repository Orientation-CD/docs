# Studio Control 管理后台

Studio Control 位于 API origin 的 `/admin`，使用服务端渲染页面管理客户运营、商业配置与执行模型。浏览器会话及 CSRF 控制与客户 Bearer 认证相互独立。

## 当前导航

| 菜单 | 用途 |
| --- | --- |
| [概览](/zh/admin/dashboard) | 经营摘要、行动中心及需关注任务 |
| [用户](/zh/admin/users) / [工作空间](/zh/admin/workspaces) | 账号生命周期、拥有额度、席位与审计余额 |
| [计费与 Tokens](/zh/admin/billing) / [活动](/zh/admin/campaigns) | 功能价格/授权、订阅/套餐、支付与未来奖励 |
| [营销数据](/zh/admin/marketing) / [财务](/zh/admin/finance) | 客户转化证据、月度成本与经营结果 |
| [性能](/zh/admin/performance) / [任务](/zh/admin/design-jobs) | 运行压力、任务家族、诊断与受限干预 |
| [素材](/zh/admin/assets) / [法律文档](/zh/admin/legal-documents) | 授权文件查找与不可变法律发布 |
| [提示词](/zh/admin/prompts) | 可编辑指令、变量及完整库导入导出 |
| [三维家 SDK](/zh/admin/providers) | 不可变 SDK 发布、账户凭据及激活代次 |
| [模型服务商](/zh/admin/providers) / [Workflows](/zh/admin/workflows) | 协议连接、模型模态与 Workflow 节点选择 |

## 开放一个产品

先配置服务商连接与模型并声明兼容输入/输出类型，再选择 Workflow 节点模型，最后配置 Feature 和套餐权限。客户验收前确认当前法律文档与存储交付。创建服务商记录与激活产品是不同操作。

多数表单局部更新受影响区域，在保留列表上下文的同时显示成功或冲突。版本冲突时先重新加载再应用修改。余额调整响应不确定时，应检查实际余额/账本，不能反复提交。

中英文选择使用浏览器 `admin_language` cookie。当前已无 Report Templates 编辑器，见[迁移说明](/zh/admin/report-templates)。首次使用见[管理员启动](/zh/admin/getting-started)。

## 先区分执行配置体系

普通模型工作流使用服务商连接和节点模型选择；户型渲染及三维家共享图片功能使用独立 `/admin/three-vjia-sdk` 页面与 SDK 配置 ID。先激活已上传且核验的发布版本及绑定供应商账户，再开放 Feature；旧三维家服务商记录不能激活当前 SDK 路径。视频使用独立计费配置，不以普通 Feature 固定价计算。见 [SDK 配置](/zh/admin/providers)与[计费](/zh/admin/billing)。

---

代码依据 · backend `749e82df`: [app/templates/admin/base.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/templates/admin/base.html) · [app/admin/__init__.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/admin/__init__.py).
