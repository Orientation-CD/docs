# 工作区成员与项目访问

工作区划分访问和计费，内部 Project 仍属创建者私有。邀请接受、owner 视图、移除历史和资金来源在切换页面/迟到响应时必须保持一致。

## 手机邀请与分享邀请

owner 可定向邀请手机号，也可创建可转发分享卡片。两者有不同记录/协议；referral 是营销归因，不授企业访问。

分享链路：

1. owner 向 `POST /v1/workspaces/{workspace_id}/share-invitations` 传动作 key 和 JSON 请求体 `{}`（`Content-Type: application/json`），得到一次性 bearer、身份与过期。不能完全省略请求体。
2. 接收者把 bearer 放 body 调公开 `POST /v1/share-invitations/preview`，仅展示安全的空间/邀请者/可用性信息，预览不授访问。
3. 登录/同意后，以接收账号向 `POST /v1/share-invitations/accept` 提交要求的幂等 key。事务重新检查 token/过期、企业活跃、座位与成员规则。
4. 刷新资料/空间，选择可访问目标。重放不能重复添加成员/占座。

owner 列表不重新返回 bearer 明文，可 DELETE 撤销 pending。已用、过期、撤销、满员、空间关闭有不同稳定状态，不对失效 bearer 无限重试。

## 角色与选定空间

每次请求检查当前成员和所需 owner 身份，缓存名称和之前预览成功不是权限。owner 全局 Job/概览访问是显式例外，不允许修改别人私有 Project；创建/default/detail/move 还检查创建者/原空间身份。

前端待执行动作与缓存绑定 user/workspace/session generation。提交中切账号/空间时保留原动作身份并核对结果，不能静默把旧数据提交到新空间。

## 离开与移除历史

成员调用 `DELETE /v1/workspaces/{workspace_id}/membership` 离开；owner 移除指定成员。立即刷新活跃访问，再使用契约允许的移除通知/离开历史。历史 Job 保留原空间/项目和资金来源；离开不把企业付费历史转进个人钱包。

单数 `/v1/workspace*` 保留收件箱/接受/拒绝/owner 兼容接口，新集成优先显式选定空间的复数接口。账号注销、企业解散有独立守卫，不能手删 membership 行代替。

## 加入后的 Project 生命周期

读取 `/v1/project-statuses` 和当前空间本人的 Project/default。scratch 是系统项目，普通项目有字段、数量和额度规则。Job move 传 expected source/target 防竞争。WON/LOST 和流失信息是版本化后端能力，不能由客户端自行扩展 enum。

覆盖登录前预览、最后座位竞争、重复接受、撤销/过期、角色变化、页面打开时被移除、账号/空间切换、离开历史和私有 Project 边界。见[工作区后端](/zh/backend/workspaces-orgs)与[数据模型](/zh/reference/data-model)。

## 源码依据

已按[记录的源码版本](/zh/reference/source-revisions)核对。

- [分享邀请状态与锁](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/share_invitations.py)
- [选定空间路由](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/workspace_api.py)
- [私有 Project API](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/project_api.py)
- [空间仓储](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/repositories/workspaces.ts)
- [邀请与历史规范](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/REST_API_INTERFACE.md)
