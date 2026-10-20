# 服务商连接与模型模态

`/admin/provider` 管理协议连接及其模型。节点模型选择在独立 [Workflows](/zh/admin/workflows)页面完成，不再使用模型到 Catalog 绑定或人工 Operation 授权。

## 连接

选择 adapter 后配置 base URL/path、凭据及支持的传输字段。普通选择器提供 `mock_async`、`seedream`、`doubao_text`、`gpt_image`；存储/配置合同需要时，后端也接受保留的多模态 chat adapter 身份。

API key 使用稳定配置加密密钥静态加密。密码输入留空保留已配置 key，显式清除受 adapter/生命周期规则限制，不能根据显示占位符恢复密钥。

输出 host 白名单、HTTPS、重定向/授权转发和 adapter endpoint 检查保护结果下载。表单只开放支持字段，明文 HTTP 与输出授权不是通用生产开关。使用生命周期归档/恢复连接及模型，保留历史身份。

## 模型

模型声明 provider ID、**输入模态**、**输出模态**、请求超时及适用的图片参数。当前超时范围 1–900 秒、默认 300。缺失模态声明不代表支持全部类型。模型与 adapter 类型交集需覆盖 Workflow 节点；声明额外类型不会让纯文本文案失配，模型选择不按图片数量过滤。

已绑定模型允许兼容修改，破坏当前 Workflow 绑定的修改会被拒绝。连接、模型与节点各有版本；遇到 `PROVIDER_CONFIGURATION_CHANGED` 先刷新比较再保存。超时属于模型配置，有独立保存控件。

## 让产品可执行

1. 保存结构就绪的连接和兼容模型。
2. 在目标 Workflow 节点选择模型。
3. 在[计费](/zh/admin/billing)配置 Feature 价格、开放状态与套餐授权。
4. 在授权环境验证对应产品。

保存凭据不等于真实供应商验收。已接受任务保留冻结服务商配置。[服务商集成政策](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/MODEL_PROVIDER_INTEGRATION_POLICY.md)要求供应商协议差异封装在 adapter 内。

---

代码依据 · backend `b13cc566`: [app/admin/providers.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/providers.py) · [app/providers/provider_configuration.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/providers/provider_configuration.py) · [app/templates/admin/provider.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/templates/admin/provider.html).
