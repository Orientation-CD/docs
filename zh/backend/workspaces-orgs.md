# 工作区、成员关系与当前负责关系

账号有一个永久个人空间，也可拥有／加入企业。企业是独立共享付款方，由当前所有者／成员权限控制。`current_workspace_id` 是保存的 UI 选择，不是权限；每个任务仍显式指定空间／项目并重新授权。

## 权限地图

| 身份 | 读取边界 | 变更边界 |
| --- | --- | --- |
| 原任务作者 | 自己符合条件的可见历史 | 同时满足原作者、当前项目负责关系和生命周期 |
| 当前负责人 | 所负责项目及获授权的前任结果 | 自己的新任务和允许的项目字段，不能修改前任任务或复用其输入 |
| 当前企业所有者 | 共享池、有边界的成员／项目／任务详情 | 企业／成员／额度配置和指派；销售模式阶段／成交流失；明确授权的混合作者清理 |
| 已退出成员 | 企业仍可用时有限的原作者历史 | 无新企业提交或当前项目管理权 |

[readable_design_job](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workflows/read_access.py#L79) 与 `readable_project` 分别检查任务读取和项目导航。获授权任务详情可以返回文本／图片／音频类型化输入；非作者列表投影仍返回 `inputs:[]`。`job_response` 和 `finalize_workflow_reads` 保留真实提交者，并在拿到签名 URL 后重新检查当前 SQL 权限。能看详情不授予新 Asset 复用、继续编辑、重试、移动或删除权；这些仍有当前负责关系和作者检查。无权／隐藏／不存在的任务 ID 统一 404。

## 容量与邀请

可拥有空间数计永久个人空间加有效自有企业，不计加入别人的成员关系。`INITIAL_USER_ALLOWED_WORKSPACES` 默认 1，管理员可对符合条件账号调整至 100。企业 `member_limit` 包含所有者，待接受邀请不占席位，创建和接受都检查当前容量。

分享卡邀请是七天有效的 bearer 能力。安全预览不会加入企业，登录后接受时原子重查企业、席位、成员关系和邀请状态。列表／撤销不能恢复 bearer 秘密。见[成员关系](/zh/reference/flows/workspace-membership-flow)；旧手机号定向／当前企业协议仍在[兼容边界](/zh/reference/compatibility)中说明。

## 概览、额度与专门销售统计

成员得到共享剩余／预留／可用余额及消耗，私有成员／历史数组保持 null。当前所有者额外得到有边界的成员／项目投影和额度元数据。项目按当前负责人分组，不按历史创建者。概览签名完成后重新核对所有者权限，所以存储操作期间被降权的人不能保留所有者投影。

当前小程序已有独立所有者成员管理页、全局／单人额度编辑和本人额度展示。[额度配置](/zh/reference/flows/member-quota-flow) 限制新增成员预留，不转积分或所有权。全局保存清空所有个人例外，包括离开成员保留的设置；同值保存也清空。单人例外退出／重进后保留，除非全局重置。零暂停单人、null 不限额，`reserved` 是 `used` 子集。准入先查企业可支付余额，再查成员额度。

销售转化是[销售阶段](/zh/reference/flows/project-stages-flow#enterprise-sales-metrics)中的独立所有者接口，按所选北京日期分组和当前成员／负责人快照计算，不能从筛选后的概览推导分母。概览日报摘要不能证明前端日报编辑页存在。

## 日报与成员任期

[日报](/zh/reference/flows/daily-report-flow) 在本前端版本中属于后端已实现的认证集成 API。当前非所有者填自己的日期，所有者读／批注当前成员。持久化 `(空间,用户,joined_at,日期)` 防止旧任期内容在重新加入后出现。起始日取迁移的 `DailyReportState`，不是客户端配置。提交冻结业务活动；普通读取不标记正文或批注已读。截止窗口、正文版本和批注版本分别校验。

## 离开、交接与移除

离开或被移除结束当前成员关系，不重写历史作者或账务归因。所有者可把已离开负责人的普通项目交给有效成员。已受理任务按冻结的原权限继续，账号／空间变化不是供应商取消。移除企业阻止新的保护读取，已发短期 URL 按其自身期限失效。交接后结果／清理权限见[项目指派](/zh/reference/flows/project-assignment-flow)。

源码地图：[app/workspaces/workspace_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/workspace_api.py) · [app/workspaces/workspaces.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/workspaces.py) · [app/billing/member_token_quotas.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/billing/member_token_quotas.py) · [app/workspaces/daily_reports.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/daily_reports.py) · [app/workflows/api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workflows/api.py)。
