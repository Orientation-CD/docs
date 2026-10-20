# 素材管理

`/admin/assets` 搜索授权 Asset 元数据并生成访问 URL，是管理员文件查找入口；客户命名空间 `/v1/assets` 的列表/删除操作同样要求管理员权限。

## 查找与检查

使用关键词及可用筛选，查看 Asset ID、类型、用途、状态、可见性、文件名、大小与时间。图片提供认证缩略图/放大控件，其他对象通过支持的查看流程打开。

URL 表单可生成预签名 URL 或公开 URL。**只有原本公开的 Asset 才能生成公开 URL**，选择该项不会改变可见性。签名 URL 到期需重新生成，不能把上传字段或私有签名 URL 放进长期公开文档。

管理员图片上传处理器与客户输入共用 intent → multipart POST 直传 → 完成核验流程，但使用管理员用途。法律发布有独立[法律文档](/zh/admin/legal-documents)流程与不可变元数据。

## 移除

移除确认涵盖 Asset 及其存储对象版本。服务端拒绝仍有保留引用、不正确状态或存储不可用的操作。不能手工删除 Workflow、报告、Logo/gallery 或法律接受记录保留的对象。

历史结果复用为设计输入后，复制 Asset 拥有独立生命周期；删除一个身份不意味着可以移除所有相关版本。任务结果应走任务清理。精确版本完整性及保留规则见 [Asset 与存储](/zh/backend/assets-storage)。

---

代码依据 · backend `b13cc566`: [app/admin/assets.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/assets.py) · [app/templates/admin/assets.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/templates/admin/assets.html) · [app/assets/asset_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/assets/asset_api.py).
