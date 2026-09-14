# 提示词模板

提示词页面位于 `GET /admin/prompts`（模板 `app/templates/admin/prompts.html`），管理发送给模型提供商的提示词模板。一个模板打包了一个系统提示词、一个带 `{{variables}}` 的正文模板、一个可选的负面提示词，以及一组在移动端应用中作为选项出现的可配置变量。

## 列表

对名称/描述进行实时搜索，每页 50 条分页。

| 列 | 显示内容 |
| --- | --- |
| Template | 名称 + 描述。 |
| Prompt types | 徽章：System / Configurable / Negative（哪些部分存在）。 |
| Configurable fields | 此模板暴露的变量键。 |
| Status | 活跃 / 不活跃。 |
| Updated | 最后修改时间。 |

## 创建 / 编辑

- 新建：`GET /admin/prompts/new`，然后提交 `POST /admin/prompts`。
- 编辑：`GET /admin/prompts/{id}/edit`，然后提交 `POST /admin/prompts/{id}`。

表单（`app/templates/admin/prompt_form.html`）：

| 字段 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- |
| Name | text | 是 | 唯一的、不可变的公开 ID，提供商用它来选择模板。一次性设置。 | — |
| Description | text | 否 | 内部备注。 | — |
| System prompt | textarea | 否 | 作为系统消息发送的 `system_prompt`。 | 空 |
| Template text | textarea | 是 | `template_text` 正文；使用 `{{variable_key}}` 占位符。 | — |
| Negative prompt | textarea | 否 | 支持它的图片模型的 `negative_prompt`。 | 空 |
| Variable specification | textarea | 是 | 描述变量及其选项的 JSON（见下文）。 | — |
| Is active | checkbox | 否 | 关闭 = 模板不提供给提供商。 | on |

### 变量与选项（`PromptVariable`、`PromptOption`）

变量规范 JSON 按变量声明：

| 属性 | 含义 |
| --- | --- |
| `key` | `template_text` 中使用的占位符名称（每个模板内唯一）。 |
| `label` | 应用中显示的人类可读标签。 |
| `required` | 是否必须提供该变量。 |
| `default_value` | 可选的回退值。 |
| `sort_order` | 显示顺序。 |
| `options` | 可选的允许选项列表，每项含 `value`、`label`、`sort_order`（`PromptOption`）。存在时，应用显示受限选择器而非自由文本。 |

变量按 `sort_order` 排序；选项按各自的 `sort_order` 排序。

## 操作

- **切换活跃**（`POST /admin/prompts/{id}/toggle`）—— 启用/禁用而不编辑。
- **移除**（`POST /admin/prompts/{id}/remove`）—— 删除模板及其变量/选项（级联）。

## 导入 / 导出归档

- **导出**（`GET /admin/prompts/export`）—— 将所有活跃模板及其变量/选项下载为 JSON 归档。
- **导入**（`POST /admin/prompts/import`）—— 上传之前导出的归档。这是一个**破坏性的、替换式**操作，由 `parse_prompt_archive` 验证；用于在环境间迁移模板。导入对话框从"Import"按钮打开。

## 提供商如何使用提示词

设计任务运行时，提供商层按名称选择活跃模板，替换客户选择的变量值（和默认值），并将组装好的系统 + 正文 + 负面提示词发送到配置的模型。保持模板名称跨环境稳定，因为它们是任务类型和提示词之间的耦合键。
