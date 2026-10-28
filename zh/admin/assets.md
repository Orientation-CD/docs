# 资产管理

`/admin/assets`是管理员发现与移除已核验Asset的界面。客户路径`/v1/assets`的列表/删除也要求管理员权限，不是用户可以任意管理文件的图库。

## 查身份，而非只查URL

按界面可用元数据搜索/过滤，检查Asset ID、子类型（Image/Audio/Document/Video）、purpose、状态、owner、文件名、大小和时间。签名URL会过期；只有已公开对象才可取public URL，请求该URL不改变可见性。私有上传表单和签名能力URL不能复制进持久文档。

当前模板参考片是真实Video Asset，封面是Image。提示词表单的参考媒体intent→存储multipart POST→complete使用管理员session/CSRF及`ADMIN_REFERENCE_MEDIA` purpose，complete核验字节并返回模板使用的规范私有key。客户自定义参考片则使用客户Video输入角色。见[提示词](/zh/admin/prompts)和[视频](/zh/backend/video)。

## 删除前理解状态

| 观测 | 含义 |
| --- | --- |
| READY且归档凭据COMPLETED | 私有输入字节已准备，最终准入可能尚未接受Job |
| ACTIVE/无过期且有Job归属/pin | 已接受的持久输入，由保留中的执行证据决定能否删除 |
| 历史原件RESERVED | 可能需要明确的已完成输入资格检查，不能SQL强制ACTIVE |
| 独立结果复制Asset | 新输入自己的生命周期，不能把所有关联对象一起删掉 |

新直接输入在准入冻结物理身份前归档。相同Asset ID可以迁到规范`design-jobs/inputs/`位置，而旧执行pin或凭据清理仍保留源证据。需要同时检查逻辑归属及精确key/version引用。

## 移除与恢复

Remove Asset确认涵盖选定Asset及允许删除的存储版本。服务拒绝保留中的输入/输出、Operation pin、复制/归档claim、模板参考片、法律版本等受保护消费者。任务输入/结果通过任务清理，法律发布走[法律文档](/zh/admin/legal-documents)，不能直接删bucket对象。

暂时存储/租约冲突不允许删除凭据。复制稳定前保留claim和源/目的身份，不确定写入由协调器处理。历史已完成输入修复是[资产与存储](/zh/backend/assets-storage)中的明确目标、默认dry-run命令，不是后台自动批量操作；它保持已执行pin、输出和收费不变。

---

源码依据 · backend `e59716c8`: [app/admin/assets.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/assets.py) · [app/assets/asset_management.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/assets/asset_management.py) · [app/assets/asset_input_archival.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/assets/asset_input_archival.py) · [app/assets/asset_cleanup.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/assets/asset_cleanup.py).
