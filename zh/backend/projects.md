# 项目、负责关系与销售证据

Project 在空间内组织内容，分别保存不可变创建者和当前负责人。交接时，工作流和户型作品保留各自原作者；当前负责关系控制新提交与管理，企业共享池仍是付款方。具体处理函数和失败分支见[项目增改查与清理](/zh/reference/flows/project-flow)、[指派](/zh/reference/flows/project-assignment-flow)、[销售阶段](/zh/reference/flows/project-stages-flow)。

## 身份、选择与容量

每位用户在每个空间有永久临时项目和服务端默认偏好，设备当前选择保存在本地。项目字段包括客户／地址／名称、面积和户型。列表按当前负责人过滤；所有者详情可查看企业普通项目。响应给出创建者／负责人、指派版本和逐操作权限。所有者代创建初始化交接信息，交接把前任默认修复为临时项目。名称唯一性和 20 项目容量按负责人／空间计算；启用成交流失后已关闭项目不占容量，清理中的项目仍可占位。

## 两种进度模式

`PROJECT_OUTCOMES_ENABLED` 保留旧的线性阶段／成交流失行为；`PROJECT_SALES_STAGES_ENABLED` 选择新的独立证据模式，并同时启用成交流失。两者默认关闭。通过登录后的目录判断能力，不能从前端代码或数据库字段存在就推断生产开关。

销售模式中，`ProjectStageSource` 保存七个可独立点亮阶段的人工、自动及迁移来源，`ProjectStageEvent` 保留变更审计。未关闭时当前阶段取最高已点亮来源；签单要求量房或到店证据。自动任务证据不能手动移除，也不能撤销最后一个签单资格。恢复跟进保留证据并重新检查负责人容量。专门阶段 PUT／DELETE 与事件流共享项目权限，阶段投影和活动同事务提交。旧版最远阶段／周期说明只适用于旧模式。

## 作者、只读权限与已受理执行

[readable_design_job](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workflows/read_access.py#L79) 检查原任务作者、当前所有者或当前项目负责人，`readable_project` 另查导航权。`finalize_workflow_reads` 在签名后重新读取 SQL 权限并计算变更能力。查看前任结果不转移输入来源所有权或任务写权限；原作者变更也需要当前负责关系。已受理执行使用 [active_task_project](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/project_jobs.py#L138)，因此交接不取消任务，也不改变已冻结账务归因。

整项目清理锁定全部内容作者，包含没有任务的户型作品。混合作者内容要求所有者权限，移至临时项目按各作者自己的临时目标处理。异步删除先提交持久化认领再返回 202，通过恢复机制继续派发／清理；从有效列表消失并不代表物理清理已经完成。

## 活动、销售统计与日报

真实项目操作和符合条件的根任务完成更新可信活动。读取、设默认和交接已读不制造成员活动。活动可信状态故障必须报错，不能被投影成不活跃或零。

所有者销售统计使用当前成员／当前负责人和最早有效证据日期，按所选北京周期分组。团队比例累加原始计数，零分母为 null，区别于概览筛选后的阶段分布。[日报](/zh/reference/flows/daily-report-flow) 在提交时按北京自然日及当前任期冻结实际创建者／操作者／作者活动，不以当前谁负责项目推断当天谁做了工作。

源码地图：[app/workspaces/project_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/project_api.py) · [app/workspaces/project_jobs.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/project_jobs.py) · [app/workspaces/project_stages.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/project_stages.py) · [app/workspaces/project_deletion.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/project_deletion.py) · [app/admin/enterprise_sales_metrics.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/admin/enterprise_sales_metrics.py) · [app/workspaces/daily_reports.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/daily_reports.py)。
