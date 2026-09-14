# 报告

**报告**（`方案汇报` / `html_report` 作业族）为一个工作区组装可分享的 HTML 设计报告：彩色户型图、动线图、情绪图片和其他章节，来自渲染提供商或精选的对象存储库。本页覆盖报告**配置**、**发现**、**渲染**和签名**查看** URL。数据表在
[数据模型](/reference/data-model)页。

## 报告是什么

一份完成的报告是 `design_reports` 中的一行，分解为
`design_report_items` 中的章节。每个条目链接到属于它的资产（`design_report_item_assets`），对于库支持的章节，还链接到从存储中选择的具体对象（`design_report_item_objects`）。报告由一个 `html_report` 设计作业产生（参见
[设计作业](/backend/design-jobs)），渲染为 HTML 后由客户端显示或导出。

## 报告配置：三个层级

报告章节由 `ReportItemSetting` 对象配置。一个工作区的有效配置由
`app/report_config.py:resolve_effective_report_config` 解析，优先级明确：

1. **企业配置** —— 如果工作区是企业，使用其自己的
   `report_config` JSON 列。
2. **默认企业** —— 如果工作区是个人的，查找标记
   `is_default_report_config = true` 的单个企业并使用其配置。
3. **全局设置回退** —— 否则使用 `REPORT_ITEMS` 环境变量 /
   `settings.report_items`。

返回的 `EffectiveReportConfig` 记录哪个
`source` 产生了它（`enterprise`、`default_enterprise` 或
`global`），以及哪个企业拥有库对象的 OSS 命名空间。

### 一个 `ReportItemSetting`

每个章节定义有：

| 字段 | 含义 |
| --- | --- |
| `key` | 稳定章节标识（必须唯一） |
| `display_name` | 展示给用户的标签 |
| `source` | `provider`（由模型渲染）或 `oss`（库对象） |
| `base_path` | `oss` 章节的 OSS 基础路径 |
| `image_count` | 该章节期望多少张图片 |
| `prompt_template_name` | 对 `provider` 章节，使用哪个 `PromptTemplate` |
| `include_request_prompts` | 是否将请求提示词回显到报告中 |
| `is_enabled` | 是否提供该章节 |

`validated_report_config` 严格验证存储的/管理员的 JSON 并拒绝重复键。
`save_enterprise_report_config` 在锁下暂存企业配置；`set_default_report_config` 原子地翻转可选的默认企业。

## 发现（当前可选什么）

`app/report_discovery.py:discover_report_items` 在**不改变 API 形态**的情况下检查可用性：

- 对 `provider` 章节，可用性意味着其配置的
  `prompt_template_name` 存在于活跃提供商提示词中；
- 对 `oss` 章节，它通过
  `report_library.list_valid_report_library_objects` 列出工作区 OSS 命名空间中已解析 `base_path` 下的对象（受
  `REPORT_LIBRARY_MAX_OBJECTS_PER_ITEM` 限制，默认 1000）。

客户端调用此接口渲染报告构建器 UI，标记每个章节可用或不可用。

## 内置报告提示词模板

`ensure_report_configuration_defaults` 在启动时播种两个服务端所有提示词一次（不覆盖后续管理员编辑）：

- `colored_floor_plan` —— "根据提交的户型图生成彩色户型图。"
- `circulation_plan` —— "根据提交的户型图生成动线图。"

这些是 `PromptTemplate` 行，provider 章节通过
`prompt_template_name` 引用它们。

## HTML 报告渲染

`html_report` 作业类型（`result_kind = HTML_REPORT`）驱动组装。渲染器结合：

- 配置的报告条目，
- 选中的提供商提示词（通过 `app/prompt_templates.py` 中的提示词模板引擎渲染），
- `provider` 章节的提供商渲染图片，
- `oss` 章节选中的库对象。

输出 HTML 存放在对象存储中工作区的报告前缀下（`REPORT_WORKSPACE_ASSET_PREFIX`，默认 `workspaces`）；共享资产使用
`REPORT_GLOBAL_ASSET_PREFIX`（默认 `global`）。渲染的 HTML 不得执行用户/代理注入的脚本；它被视为不可信标记。

## 报告查看令牌

完成的报告通过短期签名**查看令牌**分享，而非永久公共 URL。
`REPORT_VIEW_TOKEN_SECONDS`（默认 **300**）限制令牌生命周期。客户端用报告 ID 换取查看令牌，并通过签名的、过期路由获取报告 HTML。这保持报告私有，同时仍让接收者打开一个链接几分钟。

## 模板对齐与缓存

周期性 worker 任务保持报告存储一致：

| 作业 / 设置 | 默认值 | 用途 |
| --- | --- | --- |
| `REPORT_TEMPLATE_CACHE_TTL_SECONDS` | 300 | 进程内渲染缓存 |
| `REPORT_TEMPLATE_RECONCILE_SCHEDULE_MINUTE` | 5 | 多久对齐一次报告模板 |
| `REPORT_TEMPLATE_RECONCILE_BATCH_SIZE` / `_MAX_BATCHES` | 100 / 10 | 批次限制 |
| `REPORT_RESULT_CLEANUP_MINIMUM_AGE_SECONDS` | 3600 | 清理前最小年龄 |

`process_reconcile_report_templates`（poll worker）和
`process_cleanup_report_result_artifacts` 保持渲染报告工件与当前配置一致，并垃圾回收旧工件。

## 解析优先级示例

对一个没有专属企业的个人工作区，查找链是：

```text
个人工作区
  └─ 是否存在标记 is_default_report_config = true 且活跃的企业？
       ├─ 是 → 使用该 enterprise.report_config   (source = "default_enterprise")
       └─ 否  → 使用 REPORT_ITEMS / env 的 settings.report_items (source = "global")
```

对企业工作区，答案就是该企业自己的
`report_config` JSON（`source = "enterprise"`）。返回给调用者的
`EffectiveReportConfig` 记录哪个来源胜出，因此 UI 可以显示"此报告使用默认配置"而无需猜测。

## 报告查看流程

1. 一个 `html_report` 作业完成并将渲染的 HTML 存储在工作区前缀下。
2. 客户端为该报告请求签名查看令牌（受
   `REPORT_VIEW_TOKEN_SECONDS` 限制）。
3. 接收者打开短期 URL；服务器验证令牌，以禁用原始 HTML/脚本的方式渲染存储的 HTML，并返回。

这保持完成报告私有，同时仍允许接收者打开一个链接几分钟，也意味着渲染的 HTML 永远不需要在 bucket 中公开。

## 管理 UI 中的按工作区配置

管理员从 `/admin` 编辑企业的报告配置，选择哪个企业作为个人工作区默认值，并预览已解析的配置。因为个人工作区回退到默认企业，一个配置良好的企业可以为所有免费用户驱动报告，直到他们被移到专属企业。

## 延伸阅读

- [设计作业](/backend/design-jobs) —— `html_report` / `方案汇报` 流水线。
- [资产与存储](/backend/assets-storage) —— OSS 库对象和预签名读取。
- [数据模型](/reference/data-model) —— `design_reports*` 表。
