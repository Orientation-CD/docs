# 设计系统与共享导航

视觉系统采用鼠尾草绿操作色、暖中性色表面和生成式语义 Token。修改 Token 源或图标注册后重新生成，并检查实际小程序。生成文件有差异本身不能证明原生按钮/文字对齐。

## 源与生成文件

| 文件 | 职责 |
| --- | --- |
| `src/styles/design-tokens.json` | 基础、语义、组件 Token 源 |
| `src/styles/_design-primitives.generated.scss` | 生成 SCSS 原语 |
| `src/styles/design-tokens.generated.scss` | 生成 CSS 变量 |
| `src/styles/designTokens.generated.ts` | 生成 TypeScript 颜色 |
| `src/styles/designIcons.generated.ts` | 生成图标名称联合类型 |
| `src/static/icons` | 按用途组织 SVG/位图 |
| `scripts/generate-design-system.mjs` | 生成器 |
| `scripts/check-design-system.mjs` | 一致性与使用检查 |

`App.vue` 全局导入生成 Token，`uni.scss` 将组件库变量映射到设计原语。组件通过 `--yz-*` 使用表面、文字、动作、状态、间距、圆角和字体语义，避免随意增加局部颜色。

```bash
pnpm design:generate
pnpm check:design-system
```

Token 源和生成产物一起提交，不能仅手改生成文件作为持久修复。

## 组件边界

`PageNavBar` 共享返回/首页控件，`FeatureShell` 组合功能布局，项目和结果页复用导航。分组面包屑与功能卡从同一分组定义导出父级路径；尽可能返回已存在父页，否则安全退回父级/首页。

首页用整行分组卡，分组页用功能网格，改布局时保留职责区别。`RemoteImage` 统一 CDN 与本地占位；内容图经素材/广告系统管理，不要随意塞进各分包。

功能步骤复用选项网格、上传/确认、项目客户信息、已提交状态和 Token不足弹窗；账号页使用账号容器，项目结果与动态有独立共享控件。复用它们保持触摸和原生渲染一致。

## 原生布局与可访问性

使用 rpx/Token 间距、语义状态色、已有触摸目标规格。原生小程序 `button` 行盒不同于浏览器，共享 `_button-layout.scss` 显式对齐并重置边框。真机/开发工具检查窄屏的文字居中、描边、长名称、禁用态。

共享导航要保留成员项目/动态返回栈，首页动作使用正确 Tab 导航。项目/动态滚动内容需要有边界的 flex/scroll 容器，仅给无边界元素添加 `overflow` 不能保证原生可滚动。

Markdown 使用独立的安全 rich-text 呈现，因为 Vue scoped 样式不会自动作用于 rich-text 子节点。解析器生成元素有已知样式，来源 HTML 经过过滤，不支持标记仍以文本显示。

## 视觉变更验收

运行设计检查、相关组件测试和对应[产物门禁](/zh/frontend/testing)。在编译目标检查长文案、加载/错误/空状态、游客/只读权限、键盘/安全区和图片占位。共享变更检查微信与抖音，浏览器/happy-dom 只是其中一种证据。

## 源码依据

前端 `eca0a5f`、后端 `b13cc56`（2026-10-20）：[Token源](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/styles/design-tokens.json) · [共享导航](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/components/common/PageNavBar.vue) · [按钮布局](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/styles/_button-layout.scss) · [Markdown渲染](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-plans/services/markdownSummary.ts)。
