# 设计作业与多提供商目录

**设计作业**是异步 AI 工作的单位：用户上传户型图（或录制对话），后端挂起积分扣费，把工作交给外部模型提供商，轮询直至完成，存储结果，然后结算扣费。本页覆盖完整生命周期、提供商调度逻辑，以及新的**多提供商目录系统**——它让运营人员无需重新部署即可把不同模型绑定到不同作业类型。

如果你只想要端点列表，参见 [REST API](/reference/rest-api)。数据模型在[数据模型](/reference/data-model)页。

## 作业类型

设计作业类型是 `design_job_types` 表中的行，启动时播种，管理员可编辑。每行包含：

| 列 | 含义 |
| --- | --- |
| `key` | 稳定标识（也是用于绑定模型的**目录键**） |
| `display_name` | 小程序中展示的人类可读标签 |
| `token_cost` | 作业完成时收取的积分数 |
| `result_kind` | `IMAGE`、`MARKDOWN` 或 `HTML_REPORT` |
| `is_active` | 该作业类型当前是否可选 |

`app/design_job.py` 中枚举的面向产品的作业类型（`SupportedDesignJobType`）为：

| `key`（枚举值） | 标签 |
| --- | --- |
| `室内设计` | 室内设计 |
| `局部改造` | 局部改造 |
| `厨房改造` | 厨房改造 |
| `卫生间改造` | 卫生间改造 |
| `家具试搭` | 家具试搭 |
| `方案汇报` | 户型方案汇报（驱动 HTML 报告） |

另外播种了两个非 UI 类型，但初始为**不活跃**：

- `voice_summary` —— 将录制对话转为结构化 Markdown（`result_kind = MARKDOWN`），来自 `app/summary_catalog.py`。
- `html_report` —— 组装 HTML 报告（`result_kind = HTML_REPORT`），来自 `app/report_config.py`。

## 生命周期状态

`DesignJob.status` 经过严格的状态机。作业以非终态创建，经过提供商调度，最终进入 `completed` 或 `failed`。状态转换由行锁和短 Redis 租约保护，确保重试绝不会重复提交。

```
 created ──► reserved ──► provider_dispatch ──► provider_running
                              │                      │
                              │                      └──► completed（结算积分）
                              └──► failed（释放积分）
```

`app/design_job.py` 中的关键函数：

| 函数 | 角色 |
| --- | --- |
| `reserve_design_job_assets` | 校验并锁定输入资产，创建 `DesignJob`，挂起积分 |
| `submit_design_job` | （worker）组装提供商请求、提交、记录 `provider_job_id`、入队轮询 |
| `poll_design_job` | （worker）轮询提供商、下载结果、持久化、结算积分 |
| `mark_job_failed` | 终态失败路径，释放挂起积分 |
| `reconcile_stale_design_jobs` | 周期性重新驱动中途丢失的作业 |
| `delete_terminal_design_job` | 用户/管理员删除已完成作业 |
| `average_design_job_duration_seconds` | 用于进度预估的历史时长 |

进度在客户端根据 `DESIGN_PROGRESS_DEFAULT_DURATION_SECONDS` / `_MINIMUM_SAMPLES` / `_SAMPLE_SIZE`
/ `_HISTORY_DAYS` 估算，因此即使在提供商回复之前，UI 也能显示百分比。

## 积分预留与结算（计费握手）

设计作业分两阶段计费（完整台账见[计费与积分](/backend/billing-tokens)）：

1. **预留**（创建时）：`reserve_design_tokens` 将 `token_cost` 从工作区的
   `remaining_tokens` 移入 `reserved_tokens`，并写一行 `token_ledger_entries`。这就是"挂起"。
2. **结算**（完成时）：`settle_design_tokens` 确认扣费；失败时
   `release_design_tokens` 返还挂起。这防止批量运行中途积分耗尽。

## 提供商输入/输出契约

每个提供商适配器都说一种标准化契约，定义在
`app/providers/base.py` 中。输入和输出是**有序多模态**列表（#216），因此无论哪个适配器，模型都以确定性顺序看到各部分：

```python
@dataclass(frozen=True)
class InputPart:
    kind: Literal["text", "image"]
    text: str | None = None
    media_url: str | None = None

@dataclass(frozen=True)
class OutputPart:
    kind: Literal["image", "markdown", "text"]
    media_url: str | None = None
    text: str | None = None
```

适配器接收 `(inputs: tuple[InputPart, ...], settings, ...)` 并返回
`tuple[OutputPart, ...]`。适配器在这种中性形态与各厂商原生请求/响应 JSON 之间翻译。这就是
`mock_multimodal.py`、`seedream.py` 和 `doubao_text.py` 可以互换而无需改动
`design_job.py` 的原因。

## 内置适配器（`app/providers/`）

| 文件 | 适配器键 | 结果类型 | 说明 |
| --- | --- | --- | --- |
| `base.py` | — | — | 协议 + `InputPart`/`OutputPart`、`ProviderError` 层级 |
| `mock_multimodal.py` | `mock_async` | image | 默认本地适配器；跑通与真实提供商相同的异步 REST 生命周期 |
| `seedream.py` | `seedream` | image | 火山引擎 Ark Seedream 图片生成 |
| `doubao_text.py` | `doubao_text` | markdown | `voice_summary` 和报告提示词使用的文本/LLM 适配器 |
| `gpt_image.py` | `gpt_image` | image | **默认禁用**（`PROVIDER_MODEL` 为空）；由部署审批门控 |
| `ark_sdk.py` | — | — | Seedream 使用的共享 Ark SDK 助手 |
| `http_transport.py` | — | — | 有界连接池 `httpx` 传输（最大连接数、keepalive） |

## 多提供商目录系统

在此系统之前，实际上只有一个由环境变量配置的全局提供商。现在提供商、它们的模型以及**模型与作业类型的绑定**都是数据库中的行，可从管理 UI 编辑，无需重新部署。三张表完成这项工作（见[数据模型](/reference/data-model)）：

### 1. `provider_connections`（提供商连接）

每个厂商/账号一行。它存储：

- `adapter` —— 使用哪个适配器类（`mock_async`、`seedream`、
  `doubao_text`、`gpt_image`…），
- `base_url`，
- 加密凭证（`api_key_ciphertext`、`encryption_key_id` —— 静态以
  `CONFIG_ENCRYPTION_KEY` 加密），
- `request_timeout_seconds`、轮询时机、重试预算，
- 输出主机允许列表（`output_hosts`）和 `allow_http` 标志（生产环境在启动时拒绝 mock/假端点）。

### 2. `provider_model_configs`（提供商模型配置）

一个连接下每个具体模型一行。它存储：

- `model_id`，
- `image_size`、`output_format`、`watermark`，
- `request_shapes`（模型期望的有序输入/输出形态），
- 适配器专属覆盖。

### 3. `provider_model_catalogs`（提供商模型目录，连接表）

绑定表。它将 `provider_model_config_id` 与一个
`catalog_key` 配对。关键在于，**`catalog_key` 就是 `design_job_types.key`** —— 因此目录回答"对于这个作业类型（如 `室内设计`），应该使用哪个模型配置？"。这就是提供商分配给设计作业类型的方式。

### 适配器能力画像

`app/provider_configuration.py` 定义了一个 `PROVIDER_CAPABILITIES` 映射（和
`PROVIDER_CAPABILITY_MAP`），按适配器描述其输入/输出种类、默认路径（`submit_path`、`status_path`）、默认图片尺寸以及哪些设置是必需的。`validate_adapter_settings` 强制执行这些。这是每个适配器支持什么的运行时事实来源；管理表单和
`/openapi.json` 都从中派生。

### 作业如何调度

当 `submit_design_job` 运行时：

1. 加载作业 `design_job_type.key` 的**活跃目录条目**。
2. 该条目指向一个 `provider_model_config`，后者指向一个
   `provider_connection`。
3. `ProviderRuntimeSettings` 从数据库行组装，仅在迁移期间回退到
   `PROVIDER_*` 环境引导值。
4. 输入被规范化为有序 `InputPart`，适配器通过有界
   `http_transport` 调用，结果被规范化为有序
   `OutputPart`。

**个人订阅执行 + 实时目录权限**（#201）意味着一个作业可见哪些目录条目取决于调用者当前的个人订阅权益（`subscription_entitlements.py:
load_current_personal_subscription`）—— 高级目录模型可被门控到付费套餐。

## 提示词组装

设计作业可能携带一个**提示词选择**，包含一个或多个管理员维护的
`PromptTemplate`（参见[报告](/backend/reports)和
`app/prompt_templates.py`）。`compose_design_prompt` 用移动端提供的值渲染每个所选模板的 `{variable}` 占位符，并拼接系统/可配置/负面提示词通道。最多一个所选模板可以贡献
`system_prompt`。组装后的提示词被限制在
`_MAX_COMPOSED_PROMPT_LENGTH`（12,000 字符）。

## 录音摘要（#208）

`voice_summary` 作业类型复用相同流水线，但
`result_kind = MARKDOWN`，使用 `doubao_text` 适配器。
`app/summary_prompt.py` 负责服务端系统提示词（一个中文装修需求摘要器），并强制输出是一个有界 Markdown 文档，带 H2 标题和项目符号列表；源录音被视为**数据而非指令**，以防提示词注入。`app/summary_catalog.py` 在启动时播种该作业类型和提示词一次，不覆盖后续管理员编辑。

## 运维旋钮

| 设置 | 默认值 | 含义 |
| --- | --- | --- |
| `DESIGN_RATE_LIMIT_JOBS` / `_WINDOW_SECONDS` | 20 / 3600 | 每用户每小时提交数 |
| `MAX_ACTIVE_DESIGN_JOBS_PER_USER` | 5 | 每用户并发活跃作业数 |
| `PROVIDER_REQUEST_TIMEOUT_SECONDS` | 300 | 每次提供商 HTTP 调用超时 |
| `PROVIDER_POLL_INTERVAL_SECONDS` | 10 | 轮询间隔 |
| `PROVIDER_MAX_WAIT_SECONDS` | 900 | 15 分钟后放弃 |
| `PROVIDER_MAX_RETRIES` | 4 | 失败前重试次数 |
| `DESIGN_PROGRESS_*` | — | 客户端进度预估 |

## 延伸阅读

- [计费与积分](/backend/billing-tokens) —— 预留/结算背后的台账。
- [报告](/backend/reports) —— `方案汇报` / `html_report` 如何组装 HTML。
- [参考：REST API](/reference/rest-api) —— `/design-jobs` 路由。
