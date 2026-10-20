# 提示词模板与整库导入

`/admin/prompts` 搜索模板名称、描述及提示词正文，支持创建/编辑、激活、移除及 JSON 导入导出。模板用于图片、总结、报告和文案，并非旧报告布局编辑器。

## 模板合同

唯一名称标识模板。system、configurable、negative 各段可选，但至少存在一段。可配置占位符使用精确的 `key | example value` 字段行。服务端校验占位符与字段一致、长度边界，以及请求组合中最多一个 system prompt。

客户发现活动模板后提交精确 name/value，后端保存接收时的组合文本。之后的编辑、停用或导入不改变已接受任务及重试冻结的提示词。

## 替换前先导出

**完整 JSON 校验通过后，导入会替换整个提示词库**，不是增量合并，后台也没有撤销按钮。先导出备份，保留所有既有条目与编辑，在完整归档中增改目标模板，再导入该归档。文件限制为 1,000,000 字节。

文案启动逻辑已会补充缺失 seed 模板，不覆盖现有模板。不能把八个文案模板样例单独导入已有部署，修改仓库初始 JSON 也不会替换数据库权威模板。见[文案配置](/zh/backend/copywriting)。

个人 prompt preset 是客户 `/v1/prompt-presets` 的独立功能，不是管理员模板定义。报告生成提示词也不同于已删除的原始 HTML/Jinja 报告编辑器，报告执行在 [Workflows](/zh/admin/workflows)配置。

---

代码依据 · backend `b13cc566`: [app/admin/prompts.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/prompts.py) · [app/prompts/prompt_templates.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/prompts/prompt_templates.py) · [documents/ai_copywriting_setup.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/ai_copywriting_setup.md).
