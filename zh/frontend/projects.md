# 项目、成员管理与共享只读结果

项目体验由 `VITE_ENABLE_PRIVATE_PROJECTS=true` 编译启用；后端成员关系、返回权限及当前负责关系仍是最终依据。先读[项目链路](/zh/reference/flows/project-flow)，再读[指派](/zh/reference/flows/project-assignment-flow)、[销售阶段](/zh/reference/flows/project-stages-flow)和[成员额度](/zh/reference/flows/member-quota-flow)。

## 空间 → 选择 → 已受理绑定

`projectContextRepository` 按账号／空间保存设备当前选择，服务端默认是另一条偏好，临时项目是永久回退项。提交前 `designProjectBinding.ts` 固定已接受的项目和客户信息快照；之后切换选择器不能改变已受理或结果不确定请求的归属。任务写入和指派事件使相关列表／计数失效，已知 `assignmentVersion` 阻止迟到响应恢复旧负责关系。

普通列表现在展示当前账号负责的项目，不是它最初创建的全部项目。响应可包含创建者、负责人、最近交接及权限。编辑页支持所有者替当前成员创建，或将自己的项目设为“稍后指派”。详情提供指派／改派及所有者接管。指派页写前刷新资料／概览／详情，但保留用户实际确认的版本；超时进入刷新核对，不自动重复交接。

## 每项操作分别使用返回权限

| 上下文 | 当前行为 |
| --- | --- |
| 当前项目负责人 | 编辑允许字段、提交自己的新任务并使用返回的项目操作 |
| 当前企业所有者 | 查看普通成员项目、指派交接、管理额度；销售模式可改阶段／成交流失 |
| 新负责人查看前任内容 | 查看结果及受支持的保存／复制链接／下载；不能修改或复用前任输入 |
| 前任作者 | 保留可见的本人历史归因；打开项目和修改仍需当前权限 |
| 混合作者项目删除 | 只有所有者能授权整项目清理 |

`assignmentReadAccess` 在保护读取／下载时重新核对负责关系，`memberProjectRead` 以会话代次、空间、当前成员关系和限定证据隔离所有者查看。结果保留真实提交者。获授权详情可包含类型化原始输入，只读播放／展示使用校验后的投影，非作者列表仍隐藏输入；这些投影都不授予复制输入权。使用服务端／客户端的具体操作权限，URL 查询标记不是授权。

## 销售阶段控件与看板

服务端目录选择基础／成交流失／销售模式。销售模式使用独立点亮的 `stageFacts`、业务日期、来源类型及撤销权限。`ProjectSalesStages` 打开日期／确认流程，`writeSalesStage` 使用专门 PUT／DELETE，`readSalesEvents` 加载事件线。签单要求量房或到店证据，恢复跟进保留证据；旧模式继续使用自己的状态语义。20 个项目上限按当前负责人／空间计算，启用结果时排除已关闭项目。

所有者看板基于已验证目录和证据展示当前成员、需关注及阶段分布。缺少能力保持不可用，不当作零。销售转化使用专门后端统计，按所选月或全部周期、当前成员与当前负责人计算。`loadSalesMetrics` 校验周期、时区和成员集合，零分母显示横杠；不能从当前筛选页的状态标签自行推导转化。活动／停滞使用北京日期及服务端证据，不对每个项目再写一次状态。

## 成员管理与额度界面

所有者从企业看板进入「成员」，默认查看「日报」，再切换到「成员与额度」管理额度。写入逻辑位于项目分包。`MemberManagement` 使用概览额度元数据和当前成员详情，缺失／错误／上月数据保持不可用。`MemberQuotaSheet` 可编辑全局默认或单人成员额度，明确提示全局保存会清空全部个人例外。单人零表示暂停新增任务，null 表示不限额；同值全局保存仍发送到后端。

[saveMemberTokenLimit](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/src/pkg-projects/services/saveMemberTokenLimit.ts#L11) 在请求前后核对当前账号／空间／所有者，即使保存结果不确定也使个人／概览额度失效，绝不自动重放全局覆盖。本人展示通过 `MyMemberQuota` 和 [readMyMemberTokenQuota](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/src/repositories/memberTokenQuota.ts#L29)，按账号／空间／北京月缓存。只有精确的路由缺失 404 才隐藏可选能力；过月、响应无效和失去权限是不同错误。准入拒绝 `MEMBER_MONTHLY_TOKEN_LIMIT_REACHED` 会保留输入，并区别所有者暂停和额度耗尽。

## 源码地图与阅读顺序

| 阅读对象 | 入口 | 应回答的问题 |
| --- | --- | --- |
| 选择与缓存 | [projectContextRepository](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/src/repositories/projectContext.ts#L203) | 响应属于哪个账号、空间和指派版本？ |
| 交接 | [assignProject](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/src/pkg-projects/services/projectAssignment.ts#L40) | 提交不确定或版本过期后如何处理？ |
| 阶段证据 | [writeSalesStage](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/src/pkg-projects/services/projectSalesStages.ts#L27) | 来源是人工、自动还是迁移？ |
| 销售比例 | [loadSalesMetrics](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/src/repositories/projectSalesMetrics.ts#L35) | 统计哪个日期分组与当前成员集合？ |
| 额度 | [saveMemberTokenLimit](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/src/pkg-projects/services/saveMemberTokenLimit.ts#L11) | 本次是全局重置还是单人例外？ |
| 只读内容 | [verifyAssignmentRead](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/src/services/assignmentReadAccess.ts#L7) | 当前权限是否仍允许读取该结果？ |

## 项目页如何进入企业日报

当前企业成员的项目页显示日报主按钮和独立的未看批注提醒。所有者看板的成员入口在概览返回当天日报摘要时展示应交、已交、未交和求助人数。成员连续三天未交时，看板显示日报提醒。进入「成员」后默认查看「日报」，可以切换日期、打开已提交详情及保存批注。编辑、补交和已读回执的逐步说明见[企业日报](/zh/reference/flows/daily-report-flow)。 [memberAttention](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/src/services/memberProjectDashboard.ts#L12)
