# 户型 API 执行链

先读[后端模型](/zh/backend/floor-plans)，其中编号时序图追踪原保存、原图导入、Workflow 准入到输出落库。本页分别说明编辑器／作品接口的范围、副作用与恢复边界，并覆盖 H5 网关各方法。

原生入口使用 [useFloorPlanEntry](https://github.com/Orientation-CD/wechat_mini_program/blob/88c75c1f15cd65f45c7fb09d560df80430ddc198/src/composables/useFloorPlanEntry.ts#L24)，作品管理使用 [floorPlanManagement](https://github.com/Orientation-CD/wechat_mini_program/blob/88c75c1f15cd65f45c7fb09d560df80430ddc198/src/repositories/floorPlanManagement.ts#L34)。H5 渲染拦截与稳定待处理回执位于 [dispatchStored](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/static/3vjia/h5/bridge.js#L437)。全部源码链接固定到同一组核验版本。

## 检查编辑器可用性 {#editor-context}

`GET /v1/floor-plan-editor/context` 进入 `editor_context`。小程序可用性 repository 与 H5 bootstrap 发送当前空间及可选项目／分组。`authenticate_editor_context` 建立平台身份与项目权限。`resolve_entry_work` 为新作品选择草稿项目，或解析已登记分组及实时户型以继续编辑；旧 `scheme_id` 定位器被拒绝。响应合并 image／panorama Feature 开关、所选发布版及契约支持的渲染模式。上下文读取不是登录探测，也不预留积分；供应商元数据缺失、发布版不可用都保留明确错误／状态。

源码阅读：[editor_context](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/api.py#L41) · [authenticate_editor_context](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/works.py#L90) · [resolve_entry_work](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L272)。

## 打开或继续编辑器 {#editor-url}

`POST /v1/floor-plan-editor/editor-url` 进入 `refresh_editor_url`。小程序 repository 请求 `bootstrap_auth:true`。`prepare_editor_entry` 检查平台范围、精确 SDK 发布版和分组必需操作，在外部登录探测前提交事务，再加锁检查同一配置与权限。继续编辑使用已登记作品的项目／户型，新建 `house_catalog` 选择户型库页。可选独立平台 auth 只在资格确认后提交。返回 URL／版本是免费入口能力，不代表作品已保存或渲染成功；原生接力拒绝过期凭据和不可信来源。

源码阅读：[refresh_editor_url](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/api.py#L156) · [prepare_editor_entry](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/editor_entry.py#L182)。

## 列出本地登记作品 {#list-works}

`GET /v1/floor-plan-works` 进入 `list_works`。“我的方案”发送 page／page_size（最大100）和可选项目。SQL 先选择可读且未删除的本地归属并计数；未按项目过滤时限制为当前原始作者。按作者／配置建立读取器，以受限并发读取供应商元数据。`finalize_work_views` 返回前重新检查实时权限，附加当前指派／权限和关联 Workflow 计数。供应商缺失可返回不可用作品，不能编造空历史；名称／封面是供应商实时字段。

源码阅读：[list_works](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L294) · [finalize_work_views](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L401)。

## 读取作品详情 {#work-detail}

`GET /v1/floor-plan-works/detail` 进入 `get_work`。`floorPlanManagement.detail` 发送空间和不透明分组。`readable_work` 检查历史空间、项目访问和当前可读归属，与编辑器权限分离。已删除作品返回明确删除错误；供应商已删除而仍在清理的记录不再请求供应商。handler 读取实时元数据，再由 `finalize_work_views` 重查权限并给出权限字段。企业所有者／受指派人可读不等于可重命名或编辑，客户端标签不能覆盖项目／空间冲突。

源码阅读：[get_work](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L553) · [readable_work](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L503) · [finalize_work_views](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L401)。

## 重命名并确认供应商元数据 {#rename-work}

`PATCH /v1/floor-plan-works/{group_id:path}` 进入 `rename_work`。作者发送空间／名称；`locate_work` 与 `require_work` 确认可写归属。所选发布版必须支持 group_update。`register_management_write` 在外部 SDK 派发前持久化写栅栏。终态回执释放栅栏；上游结果不确定时读取元数据确认，不无条件重发。只有实时名称匹配才返回 WorkDetail，否则 `FLOOR_PLAN_RENAME_UNCONFIRMED` 保留不确定状态；并发项目改派不会改写已受理原供应商写入。

源码阅读：[rename_work](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L581) · [register_management_write](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_deletion.py#L24)。

## 展开作品的标准执行 {#work-workflows}

`GET /v1/floor-plan-works/workflows` 进入 `work_workflows`。作品组合函数发送 limit（1–100）、offset、分组及可选项目。`readable_work` 拒绝已删除／正在删除的分组。SQL 使用与计数相同的可读根历史基线，排除已开始删除任务，读取 limit+1 得出 has_more。`job_response` 生成普通 Workflow DTO，私有输入只向原作者暴露。响应准备后再次完成作品与 Workflow 权限校验。前端逐条检查空间／分组／ID 并分页，不读取全部历史。

源码阅读：[work_workflows](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L634) · [readable_work](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L503)。

## 原子移动作品及其执行 {#move-work}

`POST /v1/floor-plan-works/{group_id:path}/move` 进入 `move_work`。构建选择的移动 repository 发送空间、expected_source_project_id 和 target_project_id。`move_group` 取得作者准入锁，检查作品身份、当前来源、全部关联任务和两个可移动项目，在调用方提交的同一事务中更改本地作品／任务关联；不发生供应商 HTTP。`PROJECT_SOURCE_STALE` 要求重新读取当前作品，不能编造来源重试。不变的供应商／请求身份保留，成功响应返回实际目标项目。

源码阅读：[move_work](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L721) · [move_group](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_move.py#L73)。

## 通过持久恢复声明删除 {#delete-work}

`DELETE /v1/floor-plan-works/{group_id:path}` 进入 `delete_work`。已完成且不含身份的 tombstone 返回204；否则要求原作者。`claim_group_deletion` 检查运行／删除中的任务和管理写入，持久化冻结恢复声明；提交后 `enqueue_group_deletion` 唤醒 poll 队列。202 表示受理清理，不是完成。`resume_group_deletion` 只派发一次删除，记录派发栅栏，再读元数据确认不存在，并委托原有任务／Asset 清理。120秒窗口后，已派发但未知的声明停止自动轮询。`confirm_only=true` 加捕获的截止时间只读原声明，不新发删除；前端保留条目直到204。

源码阅读：[delete_work](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L821) · [claim_group_deletion](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_deletion.py#L77) · [enqueue_group_deletion](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_recovery.py#L36) · [resume_group_deletion](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_recovery.py#L172)。

## 只读删除进度 {#deletion-status}

`GET /v1/floor-plan-works/{group_id:path}/deletion` 进入 `work_deletion_status`。轮询核验作品可读范围并调用 `deletion_view`，不会再次入队供应商删除。完成的 tombstone 返回204，不暴露旧作者／空间；否则200包含 active、waiting_writes、waiting_supplier、supplier_unknown、supplier_unconfirmed 或 cleanup，以及 automatic_polling、截止时间和 error_code。客户端按 automatic_polling 行动，不能认为每个200都应继续轮询；supplier_deleted 仍可能尚有本地清理未完成。

源码阅读：[work_deletion_status](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L803) · [deletion_view](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L760)。

## 打开只读全景结果 {#panorama-viewer}

`POST /v1/floor-plan-editor/panorama-viewer-url` 进入 `panorama_viewer_url`。结果页发送 workflow_id／workspace_id 和可选 bootstrap_auth。接口读取该空间中可读的 Workflow，要求专业 Feature 和冻结的 panorama 模式，再核对当前可用 SDK 发布版／摘要及完整查看器清单。外部发布版读取完成后，由 `require_design_job_read_access` 重查当前权限，才提交可选平台会话。viewer_url／版本是新的读取能力，不是供应商渲染或公开分享链接。模式错误返回 WORKFLOW_INPUT_INVALID，查看器文件不可用返回供应商不可用错误。

源码阅读：[panorama_viewer_url](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/panorama.py#L38) · [require_design_job_read_access](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workflows/read_access.py#L102)。

## 导入渲染原图 {#floor-before-image}

`POST /v1/floor-plan-editor/before-assets` 进入 `import_before_image`。编辑器桥接在付费提交前发送 source_url、空间、可选项目和稳定 Idempotency-Key。`import_before_asset` 为作者／范围／来源生成指纹，先持久化临时私有 Image 与 UploadIntent，再进行外部 I/O。SDK 绑定的传输限制远程产物来源／大小且拒绝重定向；图片校验、版本化存储和普通 Asset 完成流程生成规范 READY 身份。同 key 不同输入冲突，精确已完成重放返回 replayed=true，正在导入的重复请求为状态冲突。限流、无效图片、上游和存储错误保持独立 HTTP 边界；该接口不创建付费 Workflow。

源码阅读：[import_before_image](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/api.py#L255) · [import_before_asset](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/before_assets.py#L88)。

## 兑现供应商上传别名 {#supplier-upload}

`POST /v1/floor-plan-editor/uploads/{upload_id}` 进入 `upload`。原 H5 上传兼容使用网关响应适配生成的不透明 upload ID，不接受任意目标 URL。`authenticate_editor_context` 确定当前用户／配置／代次，AuthCache 中必须有同范围且未过期的上传授权。handler 限制 body，仅恢复精确别名表单字段，不跟随重定向地转发一次 POST，只接受成功且受限的回执。成功返回带 no-store 的200。授权缺失／过期／被修改返回 FLOOR_PLAN_UPLOAD_UNAVAILABLE；缓存故障和上游错误分开。该供应商上传不等于平台 Asset 已完成，后续导入由 before-assets 负责。

源码阅读：[upload](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/gateway.py#L794) · [authenticate_editor_context](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/works.py#L90)。

## GET 进入 H5 网关 {#gateway-get}

`GET /v1/floor-plan-editor/gateway/{target}/{path:path}` 进入 `relay`。读取普通供应商资源；SDK 对未映射 GET 按只读请求判断不确定响应，不创建本地付费预留。 `selected_contract` 绑定 X-Editor-Version 与 SDK 配置。替换凭据之前检查平台认证、空间／项目范围、字面 raw-path 边界和精确服务来源。所选服务中未知普通路径有意保留，而跨发布版已知 render／history 和方法不匹配的管理操作被阻止。auth 别名／cookie 与范围绑定，响应字节／头受限并隐藏凭据，使用 no-store。错误区分路径禁止、认证缓存缺失、配置和上游故障。重试写入前先读[后端模型](/zh/backend/floor-plans)中的共用保存／渲染图。

源码阅读：[relay](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/gateway.py#L263) · [selected_contract](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/sdk_binding.py#L24)。

## POST 进入 H5 网关 {#gateway-post}

`POST /v1/floor-plan-editor/gateway/{target}/{path:path}` 进入 `relay`。既承载原 H5 保存／更新兼容，也转发普通供应商 POST。分组保存由 prepare_group_save／finish_group_save 观察登记，删除转为持久声明；付费 render 签名被拒绝，必须走 Workflow。 `selected_contract` 绑定 X-Editor-Version 与 SDK 配置。替换凭据之前检查平台认证、空间／项目范围、字面 raw-path 边界和精确服务来源。所选服务中未知普通路径有意保留，而跨发布版已知 render／history 和方法不匹配的管理操作被阻止。auth 别名／cookie 与范围绑定，响应字节／头受限并隐藏凭据，使用 no-store。错误区分路径禁止、认证缓存缺失、配置和上游故障。重试写入前先读[后端模型](/zh/backend/floor-plans)中的共用保存／渲染图。

源码阅读：[relay](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/gateway.py#L263) · [selected_contract](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/sdk_binding.py#L24)。

## PUT 进入 H5 网关 {#gateway-put}

`PUT /v1/floor-plan-editor/gateway/{target}/{path:path}` 进入 `relay`。携带 body 的供应商 PUT 不归为只读；已识别管理操作必须匹配契约方法并保留作品／写栅栏，模糊回执不能成为重发依据。 `selected_contract` 绑定 X-Editor-Version 与 SDK 配置。替换凭据之前检查平台认证、空间／项目范围、字面 raw-path 边界和精确服务来源。所选服务中未知普通路径有意保留，而跨发布版已知 render／history 和方法不匹配的管理操作被阻止。auth 别名／cookie 与范围绑定，响应字节／头受限并隐藏凭据，使用 no-store。错误区分路径禁止、认证缓存缺失、配置和上游故障。重试写入前先读[后端模型](/zh/backend/floor-plans)中的共用保存／渲染图。

源码阅读：[relay](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/gateway.py#L263) · [selected_contract](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/sdk_binding.py#L24)。

## PATCH 进入 H5 网关 {#gateway-patch}

`PATCH /v1/floor-plan-editor/gateway/{target}/{path:path}` 进入 `relay`。普通 PATCH 保留供应商 body 字节；已知管理目标从实际供应商 payload 提取并与平台作品范围对照，不能信任客户端分组标签。 `selected_contract` 绑定 X-Editor-Version 与 SDK 配置。替换凭据之前检查平台认证、空间／项目范围、字面 raw-path 边界和精确服务来源。所选服务中未知普通路径有意保留，而跨发布版已知 render／history 和方法不匹配的管理操作被阻止。auth 别名／cookie 与范围绑定，响应字节／头受限并隐藏凭据，使用 no-store。错误区分路径禁止、认证缓存缺失、配置和上游故障。重试写入前先读[后端模型](/zh/backend/floor-plans)中的共用保存／渲染图。

源码阅读：[relay](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/gateway.py#L263) · [selected_contract](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/sdk_binding.py#L24)。

## DELETE 进入 H5 网关 {#gateway-delete}

`DELETE /v1/floor-plan-editor/gateway/{target}/{path:path}` 进入 `relay`。通用 DELETE 声明不能绕过作品归属和清理；识别为分组删除时进入相同持久声明／恢复分支，终态204和受理202的含义不同。 `selected_contract` 绑定 X-Editor-Version 与 SDK 配置。替换凭据之前检查平台认证、空间／项目范围、字面 raw-path 边界和精确服务来源。所选服务中未知普通路径有意保留，而跨发布版已知 render／history 和方法不匹配的管理操作被阻止。auth 别名／cookie 与范围绑定，响应字节／头受限并隐藏凭据，使用 no-store。错误区分路径禁止、认证缓存缺失、配置和上游故障。重试写入前先读[后端模型](/zh/backend/floor-plans)中的共用保存／渲染图。

源码阅读：[relay](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/gateway.py#L263) · [selected_contract](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/sdk_binding.py#L24)。

## HEAD 进入 H5 网关 {#gateway-head}

`HEAD /v1/floor-plan-editor/gateway/{target}/{path:path}` 进入 `relay`。在同一范围边界读取资源头；SDK 对未映射 HEAD 按只读判断，它不是权限或可用性检查的捷径。 `selected_contract` 绑定 X-Editor-Version 与 SDK 配置。替换凭据之前检查平台认证、空间／项目范围、字面 raw-path 边界和精确服务来源。所选服务中未知普通路径有意保留，而跨发布版已知 render／history 和方法不匹配的管理操作被阻止。auth 别名／cookie 与范围绑定，响应字节／头受限并隐藏凭据，使用 no-store。错误区分路径禁止、认证缓存缺失、配置和上游故障。重试写入前先读[后端模型](/zh/backend/floor-plans)中的共用保存／渲染图。

源码阅读：[relay](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/gateway.py#L263) · [selected_contract](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/sdk_binding.py#L24)。

## OPTIONS 进入 H5 网关 {#gateway-options}

`OPTIONS /v1/floor-plan-editor/gateway/{target}/{path:path}` 进入 `relay`。携带平台认证转发普通供应商 OPTIONS，与浏览器 CORS 中间件不是同一机制；未映射传输按只读判断。 `selected_contract` 绑定 X-Editor-Version 与 SDK 配置。替换凭据之前检查平台认证、空间／项目范围、字面 raw-path 边界和精确服务来源。所选服务中未知普通路径有意保留，而跨发布版已知 render／history 和方法不匹配的管理操作被阻止。auth 别名／cookie 与范围绑定，响应字节／头受限并隐藏凭据，使用 no-store。错误区分路径禁止、认证缓存缺失、配置和上游故障。重试写入前先读[后端模型](/zh/backend/floor-plans)中的共用保存／渲染图。

源码阅读：[relay](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/gateway.py#L263) · [selected_contract](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/sdk_binding.py#L24)。

## TRACE 进入 H5 网关 {#gateway-trace}

`TRACE /v1/floor-plan-editor/gateway/{target}/{path:path}` 进入 `relay`。兼容路由声明 TRACE 并进入 relay，当前原生 repository 不调用它。它不是额外诊断权限或任意回显 API，仍受所选服务、凭据过滤、body 限制和拦截约束；SDK 对未映射 TRACE 按非只读判断。 `selected_contract` 绑定 X-Editor-Version 与 SDK 配置。替换凭据之前检查平台认证、空间／项目范围、字面 raw-path 边界和精确服务来源。所选服务中未知普通路径有意保留，而跨发布版已知 render／history 和方法不匹配的管理操作被阻止。auth 别名／cookie 与范围绑定，响应字节／头受限并隐藏凭据，使用 no-store。错误区分路径禁止、认证缓存缺失、配置和上游故障。重试写入前先读[后端模型](/zh/backend/floor-plans)中的共用保存／渲染图。

源码阅读：[relay](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/gateway.py#L263) · [selected_contract](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/sdk_binding.py#L24)。

## CONNECT 进入 H5 网关 {#gateway-connect}

`CONNECT /v1/floor-plan-editor/gateway/{target}/{path:path}` 进入 `relay`。CONNECT 是声明的兼容方法，不是平台隧道服务。relay 仍对所选契约服务进行普通受限 HTTP 交换，此处没有独立隧道生命周期；SDK 对未映射 CONNECT 按非只读判断。 `selected_contract` 绑定 X-Editor-Version 与 SDK 配置。替换凭据之前检查平台认证、空间／项目范围、字面 raw-path 边界和精确服务来源。所选服务中未知普通路径有意保留，而跨发布版已知 render／history 和方法不匹配的管理操作被阻止。auth 别名／cookie 与范围绑定，响应字节／头受限并隐藏凭据，使用 no-store。错误区分路径禁止、认证缓存缺失、配置和上游故障。重试写入前先读[后端模型](/zh/backend/floor-plans)中的共用保存／渲染图。

源码阅读：[relay](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/gateway.py#L263) · [selected_contract](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/sdk_binding.py#L24)。
