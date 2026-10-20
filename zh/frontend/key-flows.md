# 关键用户流程

本页从用户动作说明共享前端行为；请求族细节见[工作流](/zh/frontend/workflows)，项目所有权见[项目](/zh/frontend/projects)。

## 发现并进入功能

首页与分组页共享 `useFeatureLauncher`，统一执行发布可见性、服务端发现、套餐解释、Token预检和五任务上限门禁。首页进入 AI设计/AI创作，旧房改造再下一层；面包屑与共享导航保留回首页路径。

匿名目录使用 `/v1/billing/features`。成功响应缺少某项表示不可用；网络错误是待重试的发现失败，不是部署没有能力。价格和权限键以服务端值为准。

## 在相应动作注册

可用图片流程允许游客完成本地选择，最终提交再请求注册。共享账号门禁处理现行法律文档、手机号授权与平台注册，并检测动作中的账号/空间变化。不要把所有 API 专用页面描述为游客可完整使用。

微信、抖音使用不同后端登录交换。本地微信 mock code 是开发身份机制；正式包调用平台登录，密钥留在后端。

## 创建图片或录音总结

标准设计页收集选项与照片；家居试搭增加蒙版和参考图，自定义设计使用服务端声明的可编辑模板。提交时重新检查配置/权益，按需绑定项目，上传并验证 Asset，再发送一个逻辑动作。

录音总结可录制或选择最多三个 MP3/WAV/AAC/M4A 文件。本地检查签名及每文件 25,000,000 字节、120分钟上限；直接录音有更短的单次采集上限。重复录音、失效或不可读本地文件会在提交前被拒绝。

Markdown 结果页轮询至终态，渲染经安全处理的格式文本，并列出原始录音。切换录音时按 Asset 记住位置；离开页面暂停并最终释放音频资源。媒体能力过期后需从有权限的服务端获取新 URL。隐私、域名见[平台接入](/zh/frontend/platforms)。

## 查看、重试和管理方案

方案支持空间/项目、状态、类型筛选。企业全部方案仅所有者可看，与用户本人的方案列表区分。结果按类型进入图片/对比、录音、文案 Markdown、视频和报告页。

客户端不会因本地计时结束就把待处理任务标为失败。支持的重试依服务端资格执行，并保留现有任务身份；删除/移动检查当前写权限并使相关缓存、计数失效。成员项目只读页不提供提交、重试、删除、移动。

## 购买并确认权益

商店与权益页将设计报告、AI文案、AI问答分组展示，但分组不会自动授予额外 Feature。价格、优惠、权益与适用空间来自后端。

购买先创建幂等订单，平台桥调用微信 JSAPI 或抖音交易支付，再按服务端证据对账。取消、通知延迟、响应不确定都通过支付记录恢复。生效订阅显示手动续费提示；当前 UI 不支持提前续订或自动扣费。

本地模拟微信支付不会自动替换原生调用；使用[快速开始](/zh/get-started/quickstart)明确的本人认证模拟结算。已支付模拟订单测试应用结算，不证明真实支付渠道已接入。

## 草稿与安全恢复

功能草稿按账号和空间隔离，进入草稿箱，并在保存后校验可恢复性。受理不确定的请求保留准确 payload 与幂等键；切换账号/空间不能静默复用旧上下文。

可恢复错误保留输入，让用户刷新配置、恢复访问、选择套餐、补余额或重试原不确定动作。报告/文件页刷新过期能力，不能因签名 URL 过期就把结果认定为永久丢失。

## 源码依据

前端 `eca0a5f`（2026-10-20）：[共享入口](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/services/useFeatureLauncher.ts) · [音频验证](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/services/voiceAudioFiles.ts) · [原生支付](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-account/services/payment.ts) · [草稿持久化](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/services/featureDrafts.ts)。
