# AI 文案

八种 Feature 共用纯文本 `copywriting` Workflow，输出 Markdown。**短视频脚本是文本**，与[视频渲染](/zh/backend/video)不同。

| Feature | 产品 |
| --- | --- |
| `copywriting_short_video` | 短视频脚本 |
| `copywriting_xiaohongshu` | 小红书笔记 |
| `copywriting_moments` | 朋友圈文案 |
| `copywriting_titles` | 标题金句 |
| `copywriting_shooting` | 拍摄建议 |
| `copywriting_knowledge` | 装修知识 |
| `copywriting_pitfalls` | 避坑指南 |
| `copywriting_operations_experience` | 运营经验 |

## 配置与提交

启动只创建缺失记录：八个默认关闭 Feature、初始价 169 Tokens 及可编辑模板，不选择模型、开放功能或授予订阅。先声明模型 text 输入/输出模态，在 [Workflows](/zh/admin/workflows)选择兼容 `summary` 节点模型，再在[计费](/zh/admin/billing)管理价格/权限。

以 Feature `type`、显式工作空间、幂等键及既有 `prompts.prompts[].fields[]` name/value 提交 `/v1/workflows`。初始模板名称为 `feature_{feature_key}`，可用模板从 `/v1/prompt-templates` 发现。省略 `inputs` 或发送 `[]`；本产品不接收图片/录音 Asset。REST 合同指定的 UI 可选字段留空时发送字面量 `未提供`。

标准 Markdown 结果包含 `type: text`、`role: summary`、内联 `text` 及带签名 URL 的持久 Document Asset。使用普通历史、重试和删除接口，渲染时禁用原始 HTML 与不安全媒体。

## 可选知识文档

后端读取 `workspaces/{workspace_id}/kb/{feature_key}/` 下所有扩展名大小写不敏感的 `.md`，包含子目录，按对象 key 排序。如果目录没有 Markdown，改查 `workspaces/default/kb/{feature_key}/`。两个作用域不合并；都为空时只使用指令生成。

每份文件必须是非空 UTF-8，最多 512 KiB。无文件数量上限或截断，总上下文仍需适配所选模型。目录/文件读取失败或选中文档无效会拒绝准入，不创建任务或预留 Tokens。

提示词及原始 KB 正文/版本身份在准入时冻结。每份原文作为独立文本输入跟在指令后，不额外添加文件名或存储路径。修改只影响新任务，不改变已接受任务/重试。旧单文件 `{feature_key}.md` 路径不再用于新任务。

已部署提示词通过[提示词管理](/zh/admin/prompts)修改。导入会替换**完整提示词库**，不能把八个模板样例单独导入已有部署。完整字段与错误见 [REST API](/zh/reference/rest-api)。

---

代码依据 · backend `b13cc566`: [documents/ai_copywriting_setup.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/ai_copywriting_setup.md) · [app/workflows/operations/summary/copywriting_definition.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/summary/copywriting_definition.py) · [app/workflows/operations/summary/copywriting_kb.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/summary/copywriting_kb.py).
