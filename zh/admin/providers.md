# 模型提供商与目录

模型提供商页面位于 `GET /admin/provider`（模板 `app/templates/admin/provider.html`），是 Studio Control 中配置最密集的界面。它控制**平台调用哪些外部 AI 模型、如何调用它们，以及哪些任务类型被允许使用它们**。业务逻辑位于 `app/provider_configuration.py`；数据行是 `ProviderConnection`、`ProviderModelConfig` 和 `ProviderModelCatalog`。

## 三层模型

将提供商路由想象为三个堆叠层：

1. **ProviderConnection（提供商连接）** —— *如何与一个提供商端点通信*：base URL、认证、传输超时。每个适配器一个连接。
2. **ProviderModelConfig（提供商模型配置）** —— *该连接上的哪个模型*，及其输出能力（尺寸、格式、水印、请求形状）。
3. **ProviderModelCatalog（提供商模型目录）** —— *权限绑定*：一个模型配置被允许服务哪些任务类型目录。这是让订阅套餐真正能运行任务的关键。

设计任务到达时，系统从分配给该任务类型的目录中选择一个模型，使用其连接进行传输，并根据任务要求强制执行模型声明的能力。

## 支持的适配器

`provider_configuration.py` 中 `SUPPORTED_PROVIDER_ADAPTERS = ("mock_async", "seedream", "doubao_text", "gpt_image")`。每个适配器在 `PROVIDER_CAPABILITIES` 中声明固定能力：

| 适配器 | 执行方式 | 支持的请求形状 | 轮询 | 说明 |
| --- | --- | --- | --- | --- |
| `mock_async` | async | SINGLE_IMAGE, IMAGE_WITH_REFERENCE, RECORDING_SEQUENCE | 是 | 测试/虚拟异步提供商；接受 mock 选项。 |
| `seedream` | sync | SINGLE_IMAGE, IMAGE_WITH_REFERENCE | 否 | Seedream 图片生成。 |
| `doubao_text` | sync | RECORDING_SEQUENCE | 否 | 豆包文本/报告（录屏序列 → markdown）。 |
| `gpt_image` | sync | SINGLE_IMAGE | 否 | GPT-image（内联结果）。 |

请求形状为 `ProviderRequestShape`：`SINGLE_IMAGE`、`IMAGE_WITH_REFERENCE`、`RECORDING_SEQUENCE`。一个模型只能服务所需形状在其声明集合中的任务类型（由 `provider_model_supports_job_type` 验证）。

## 第一层 —— ProviderConnection 字段

通过 `POST /admin/provider/connections` 创建；通过 `POST /admin/provider/connections/{id}/lifecycle` 归档/恢复。每个连接由 `configuration_version` 乐观锁保护。

| 字段 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- |
| Adapter | select | 是 | 四个支持的适配器之一。每个连接唯一（每个适配器一个连接）。 | — |
| Base URL | text | 是 | 提供商根地址，例如 `https://api.example.com`。 | — |
| Submit path | text | 是 | 追加到 base URL 之后用于提交任务的路径。 | — |
| Status path | text | 是 | 用于轮询任务状态的路径（异步适配器）。 | — |
| API key | password | 否 | 凭据；加密存储（`encrypted_api_key`），绝不回显。 | — |
| Auth header | text | 否 | 携带凭据的请求头名称。 | `Authorization` |
| Auth scheme | text | 否 | 方案前缀，例如 `Bearer`；按适配器规范化（Seedream 留空时默认为 Bearer）。 | `Bearer` |
| Output hosts | text/list | 否 | 提供商可返回图片/输出 URL 的允许主机名（白名单）。 | 空 |
| Allow HTTP | checkbox | 否 | 允许非 HTTPS 的 base/output 主机。生产环境关闭。 | off |
| Send auth to output | checkbox | 否 | 从提供商获取输出对象时转发认证头。 | off |
| Request timeout (s) | number | 是 | HTTP 超时；整数 1 … 300。 | 300 |

校验（`validate_provider_connection_values`）拒绝未知适配器，检查必需路径是否存在，并强制执行主机/允许 HTTP 规则。过期的 `expected_version` 返回 `409 PROVIDER_CONFIGURATION_CHANGED`。

### 连接生命周期

连接**归档**，从不删除：
- **归档** 停止通过此连接分派新模型，但保留它（及其模型配置）用于历史。
- **恢复** 重新激活它。
- 生命周期操作由 `provider-connection` 咨询锁保护。

## 第二层 —— ProviderModelConfig 字段

通过 `POST /admin/provider/models` 创建；通过 `POST /admin/provider/models/{id}/lifecycle` 归档/恢复。每个模型属于一个连接，并以 `(connection_id, model_id)` 唯一。

| 字段 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- |
| Connection | select | 是 | 此模型运行在哪个 ProviderConnection 上。 | — |
| Model ID | text | 是 | 提供商的模型标识符（去空格，非空）。 | — |
| Image size | text | 是 | 输出分辨率标签，例如 `1.5K`。 | `1.5K` |
| Output format | select | 是 | `jpeg` 或 `png`。 | `jpeg` |
| Watermark | checkbox | 否 | 请求输出加水印。 | off |
| Request shapes | multi-select | 是 | 此模型支持哪些 `ProviderRequestShape`；必须与连接适配器的能力有交集。 | — |
| Supports masked input | checkbox | 否 | 模型是否接受蒙版/笔刷编辑。 | off |

模型级校验（`validate_provider_model_values`）确保适配器受支持、模型 ID 存在、输出格式有效，且请求形状对适配器合法。

### 模型生命周期

与连接一样，模型配置被**归档/恢复**，不删除。归档模型将其从分派中移除；其目录绑定同时被清除。

## 第三层 —— ProviderModelCatalog 分配

目录表将模型配置绑定到一个或多个**任务类型键**（即"目录"）。分配在创建/编辑模型时通过提供商表单的"allowed catalogs"多选进行。

- 一个任务类型（`DesignJobType.key`）可由其目录中列出的任何模型配置服务。
- 订阅套餐进一步限制客户可访问哪些目录（参见 [billing](/admin/billing) 套餐权限）。
- 重新分配目录需要 `provider-model-catalog` 咨询锁，并以原子方式重写绑定集。

## 分派如何使用目录

任务执行时，流程为：

1. 客户请求类型为 `T` 的任务。
2. 系统加载 `T` 目录中的模型配置，按客户的套餐权限以及模型的 `supports_masked_input` / 所需请求形状与任务输入的匹配进行筛选。
3. 它选择一个可用的、未归档的模型，读取其连接的 base URL/auth/超时，然后分派。
4. 异步适配器通过 `status_path` 轮询；同步适配器内联返回。

如果目录中没有模型满足任务的形状需求（例如需要 `IMAGE_WITH_REFERENCE` 但没有模型支持），任务会快速失败并给出明确的配置错误——修复模型的请求形状或将模型添加到目录。

## 字段参考速查表

- **连接** = 端点 + 凭据 + 传输（adapter、base_url、submit_path、status_path、auth_header、auth_scheme、output_hosts、allow_http、send_auth_to_output、request_timeout_seconds）。
- **模型** = 输出契约（model_id、image_size、output_format、watermark、request_shapes、supports_masked_input）。
- **目录** = 任务类型绑定（此模型可服务哪些任务类型）。

## 校验内部细节（用于调试）

当保存失败时，错误通常来自 `provider_configuration.py` 中的这些校验器之一：

- `validate_provider_connection_values(...)` —— 适配器必须在 `SUPPORTED_PROVIDER_ADAPTERS` 中；base URL 必须可解析；submit/status 路径必须存在且以 `/` 开头；对于非 `mock_async` 适配器需要认证方案；如果 `allow_http` 关闭，base URL 和每个输出主机必须是 HTTPS。
- `normalize_provider_auth_scheme(adapter, auth_scheme)` —— 留空时默认为适配器期望的方案（特别是 Seedream 的 `Bearer`），这样即使运营人员留空字段连接也能工作。
- `validate_provider_model_values(...)` —— `model_id` 必须非空且已预去空格；`output_format` ∈ {jpeg, png}；`image_size` 非空；`request_shapes` 必须是适配器声明形状的子集；`supports_masked_input` 仅在适配器本身支持蒙版输入时才允许。
- `provider_model_supports_job_type(...)` —— 分派时它从任务重新计算所需形状（录屏序列 → `RECORDING_SEQUENCE`；需要参考图 → `IMAGE_WITH_REFERENCE`；否则 `SINGLE_IMAGE`），并检查是否属于模型的形状集合。

并发通过 Postgres 咨询锁和单调递增的 `configuration_version` 管理：

| 锁命名空间 | 资源 |
| --- | --- |
| `provider-connection` | 单个连接（及其模型目录写入）。 |
| `provider-configuration` | 跨连接的配置变更。 |
| `provider-model-catalog` | 目录成员重写。 |

如果两个管理员保存同一个连接/模型且其中一个提交了过期的 `expected_version`，第二次写入会收到 `409 PROVIDER_CONFIGURATION_CHANGED`，必须重新加载后重试。这防止了静默覆盖同伴的 API key 或路由变更。

## 输出安全字段（安全模型）

三个连接字段专门用于防止平台被欺骗去信任或获取攻击者控制的内容：

- **`output_hosts`** —— 提供商被允许作为图片/输出 URL 返回的主机名白名单。如果提供商试图将结果重定向到此列表之外的主机，分派将其视为不可信。
- **`allow_http`** —— 关闭时（安全默认值），`base_url` 和每个输出主机必须是 HTTPS。仅在本地/mock 调试时开启，绝不在生产环境。
- **`send_auth_to_output`** —— 默认情况下认证头只发送到提供商自己的 submit/status 端点，**不**在下载返回的输出对象时发送。仅在提供商的输出存储桶确实需要相同凭据时才设为开启；这避免将 API key 泄露给第三方 CDN。

这些在 `validate_provider_connection_values` 中一起校验：开启 `allow_http` 同时留空输出主机列表，或指向非 HTTPS 主机，会产生配置错误而非静默的不安全运行时。

## 配置示例

以接入 Seedream 图片提供商为例：

1. **创建连接**，适配器为 `seedream`，填入提供商的 base URL、submit 和 status 路径、API key（保存时加密）、默认 `Authorization`/`Bearer`，超时设为 `300`。
2. **在该连接上创建模型**：`model_id` = 提供商的模型字符串，`image_size` = `1.5K`，`output_format` = `jpeg`，启用任务需要的请求形状（例如 `SINGLE_IMAGE` + `IMAGE_WITH_REFERENCE`），如果支持笔刷编辑则勾选 `supports_masked_input`。
3. **分配目录** —— 勾选此模型应服务的任务类型键（例如 `interior_redesign`）。
4. **按套餐限制**（在 [billing](/admin/billing) 中），确保只有你打算开放的订阅周期包含该目录。
5. 提交一个该类型的真实测试任务，确认它能分派并返回图片。

## 安全操作注意事项

- 切勿将真实 API key 粘贴到文档或聊天中；只通过加密表单字段输入。
- 从一个适配器开始（例如 `seedream`），创建模型，分配到目录，然后运行测试任务并确认输出，再扩展。
- 退役连接/模型时归档而非删除——分派会自动停止选择它，历史保持完整。
- 如果任务突然报"no eligible model"失败，检查 (a) 模型未归档，(b) 其请求形状匹配任务，(c) 它已分配到任务目录，以及 (d) 客户的套餐允许该目录。
