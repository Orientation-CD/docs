# 工作空间与企业权限

每个普通账号都有一个永久个人工作空间。企业工作空间拥有独立共享钱包及所有者/成员关系。每次提交显式指定工作空间；保存的 `current_workspace_id` 只是 UI 偏好，不能据此改选付款账户。

## 成员与所有权

个人资源属于对应用户。企业访问要求账号仍是活动企业的当前成员。所有者管理名称、席位、邀请和成员，普通成员不能调用所有者管理接口。加入企业不表示可访问其他成员的私有项目或 Workflow 输入。

可拥有工作空间额度包括永久个人空间与本人拥有的活动企业，加入别人的企业不占额度。`INITIAL_USER_ALLOWED_WORKSPACES` 的运行默认值为 **1**，开发示例可另设。管理员可将用户额度调整到 100。

企业 `member_limit` 包含所有者。待接受邀请不预占席位，创建与接受邀请都会检查当前容量。手机号定向邀请仍作为已注册账号的兼容选项。

## 分享卡邀请

所有者创建有效七天的 Bearer 分享邀请。公开预览仅暴露展示安全的元数据。接受要求登录，并在事务中重新核查成员、邀请与席位。邀请链接本身是凭据；预览不等于已加入。所有者可列出并撤销邀请。

## 离开与历史访问

离开/移除会退役当前成员关系。已离开工作空间历史接口与移除通知支持明确的历史体验，但不恢复管理或新任务提交权限。企业活动期间，前成员可能保留读取/删除本人历史任务的权限；移除工作空间则阻止对保留项目及产物的新访问。已签发的短期 URL 按原期限到期。

项目列表/编辑对创建者私有。企业概览向成员返回共享余额，仅向**当前所有者**额外返回当前/历史成员消费及项目详情。响应边界见[项目与活跃度](/zh/backend/projects)。

企业计费不回退到成员个人余额。精确的所有者/成员错误与生命周期规则见 [Tokens](/zh/backend/billing-tokens)、[后台工作空间](/zh/admin/workspaces)与 [REST API](/zh/reference/rest-api)。

---

代码依据 · backend `b13cc566`: [app/workspaces/workspace_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/workspace_api.py) · [app/workspaces/share_invitations.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/share_invitations.py) · [app/workspaces/workspaces.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/workspaces.py).
