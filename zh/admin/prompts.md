# 提示词模板与同款参考媒体

`/admin/prompts`管理以数据库为准的提示词库：搜索、新建/编辑、启停、移除、完整JSON导入导出。模板稳定名称与purpose是契约，修改会改变客户发现它的集合。

## 通用模板与同款模板

| 维度 | 通用模板 | 同款视频模板 |
| --- | --- | --- |
| Purpose | 省略purpose的通用发现 | `same_style_video` |
| 客户发现 | `GET /v1/prompt-templates` | 相同路由加`?purpose=same_style_video` |
| 组合 | system/configurable/negative可选，至少一段有效 | 提交运行时要求仅`称呼`字段，无system/negative，txt场景结构有效 |
| 参考媒体 | 非同款purpose时清空 | 必须参考片，可选封面 |
| 保留名 | 稳定应用key | `__user_reference__`不能创建/导入为真实模板 |

字段行使用精确`key | 示例值`定义，与占位符一致。已接受任务冻结组合和媒体身份；后续编辑/导入不改变已接受执行和冻结重试。

## 准备能实际使用的同款模板

1. 选择同款purpose及稳定展示名。
2. 通过表单参考媒体控件上传参考片与可选封面。参考片成为核验后的Video Asset，封面为Image；两者purpose均为`ADMIN_REFERENCE_MEDIA`，不是客户`DESIGN_JOB_INPUT`。
3. 保存返回的私有参考key，不能把临时签名播放URL当持久key。保存时解析准入读取的reference Video Asset外键。
4. 编写有效的configurable txt脚本，字段恰好`称呼`，无system/negative文本，渲染后最多15,000字符，每个`【场景N】`中的`【人物】`等于所选称呼。
5. 确认发现接口返回预览元数据，再按目标环境/供应商策略验证受控提交。仅预览不会创建Job或预留积分。

当前后台保存层允许同款模板的提示词段全空，但准入仍调用`render_video_script`拒绝空/无效正文。**保存成功不代表模板能准入。** 应采用上面完整有效定义；自定义上传参考片是独立的不查模板/不建script pin分支。实际边界见[联调状态](/zh/reference/integration-status)。

## 上传与预览链

表单请求授权上传intent，向存储发送精确multipart字段，再完成内容核验。`admin_prompt_reference_media_intent`、`admin_prompt_reference_media_complete`要求管理员session与CSRF。complete返回Asset ID、规范object key、MIME和状态。`list_prompt_templates`按精确purpose过滤，`prompt_template_response`给参考片/封面签名；签名不可用时可为null。预览能力过期应重新获取。

## 完整库导入是替换

先导出备份。导入校验完整归档（最大1,000,000字节），要求确认替换，锁定prompt management后原子替换全部定义。它不是增量合并，也无UI撤销。归档必须保留现有条目/编辑，单独导入八个种子模板会丢掉其他库内容。

Version2导出保留purpose和参考key。导入在替换前拒绝自定义参考片保留名，对非同款purpose清空媒体，并解析模板参考Video ID。启动只补缺失种子模板，不覆盖已部署值；修改初始JSON不会重写已有数据库权威库。个人preset仍是独立`/v1/prompt-presets`数据，报告执行配置在[Workflow](/zh/admin/workflows)。

---

源码依据 · backend `e59716c8`: [app/admin/prompts.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/prompts.py) · [app/admin/assets.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/assets.py) · [app/prompts/api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/prompts/api.py) · [app/workflows/video_template_rules.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/video_template_rules.py) · [app/templates/admin/prompt_form.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/templates/admin/prompt_form.html).
