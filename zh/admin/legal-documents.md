# 法律文档与接受证据

`/admin/legal-documents` 发布不可变的用户协议和隐私正文。当前文档是客户注册/登录同意流程的前提，清空文档库不能绕过同意。

## 发布版本

选择文档类型（`terms` 或 `privacy`）、唯一版本元数据、语言区域、标题、**UTC 生效时间**及审核过的 UTF-8 纯文本，文件最多 **1 MiB**。浏览器创建上传意图、直传文件再完成；可勾选立即设为当前版本。

发布后内容及元数据不能编辑，修正需发布新版本。预览保存的正文，确认客户使用的 locale 下两份当前文档均已就绪。

## 选择与保留

历史行展示版本、生效/发布时间、Asset 身份与接受次数。非当前版本可通过对应表单设为当前。当前版本不能删除，用户已接受版本也作为证据保留并受删除保护。

客户 `/v1/legal-documents/current` 提供当前不可变 ID、URL 及缓存校验。Asset bucket 保持私有时，正文通过公开 HTTPS content 接口匿名读取；另配公开法律 origin 需先验证匿名交付。不能用会过期的私有预签名 URL 替代合同要求的稳定正文地址。

切换当前版本会影响之后应接受的文档，不改写历史同意。存储发布与元数据选择是不同状态，上传一份文件不代表协议和隐私均已就绪。参见[认证](/zh/backend/authentication)与[存储](/zh/backend/assets-storage)。

---

代码依据 · backend `b13cc566`: [app/admin/assets.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/assets.py) · [app/identity/legal_documents.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/identity/legal_documents.py) · [app/templates/admin/legal_documents.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/templates/admin/legal_documents.html).
