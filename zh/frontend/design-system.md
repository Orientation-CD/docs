# 设计系统

小程序采用一套**设计令牌（token）驱动的设计系统**。设计决策保存在一个 JSON 事实来源中，被编译成 SCSS 变量与 TypeScript 图标映射，并由 CI 中的**设计系统检查**强制执行，从而保证 UI 一致。视觉语言是一种沉静、温暖的"原木风"室内质感：鼠尾草绿品牌色 + 米白画布。

## 令牌放在哪里

| 文件 | 用途 |
| --- | --- |
| `src/styles/design-tokens.json` | **事实来源**——原始（primitive）、语义（semantic）与组件（component）令牌 |
| `src/styles/_design-primitives.generated.scss` | 生成的 SCSS 原始令牌（`$yz-*`） |
| `src/styles/design-tokens.generated.scss` | 生成的 CSS 自定义属性（`--yz-*`） |
| `src/styles/designTokens.generated.ts` | 生成的 TypeScript 令牌映射 |
| `src/styles/designIcons.generated.ts` | 生成的 TypeScript 图标名映射 |
| `src/styles/placeholder.scss` | 本地图片占位 |
| `scripts/generate-design-system.mjs` | 生成器：JSON → SCSS + TS |
| `scripts/check-design-system.mjs` | CI 检查器：校验生成文件是否同步 |

`App.vue` 全局引入 `./styles/design-tokens.generated.scss`，
`src/uni.scss` 把 uview-plus 内置的 `$uni-*` 变量重新映射到
`$yz-*` 原始令牌上，让组件库继承品牌色板。

## 结构：原始 → 语义 → 组件

令牌 JSON 分三层：

- **原始（Primitive）**——最底层的色板与尺度：
  - 颜色：一套**鼠尾草**绿色系（`sage100` … `sage950`）、一套**暖色**中性色系（`warm0` … `warm900`），外加功能色绿/琥珀/红/蓝。
  - 间距：`8, 12, 16, 24, 32, 40, 48, 64, 80` rpx。
  - 圆角：`12, 20, 28, 34` rpx，外加 `pill`（999rpx）与 `circle`。
  - 字体：两个字族（无衬线正文、衬线展示），字号台阶
    `18/20/22/26/30/40/48` rpx，字重
    `400/600/700/800`，行高 `1.25/1.55/1.7`。
  - 阴影：低/高/聚焦；动效：`120/200/320ms`，配标准缓动。
- **语义（Semantic，`--yz-*`）**——组件实际消费的层：
  - 颜色：`--yz-color-canvas`、`--yz-color-surface`、`--yz-color-surface-muted`、
    `--yz-color-text-primary/secondary/tertiary/inverse`、
    `--yz-color-action-primary/pressed`、`--yz-color-accent/-soft/-pale/-glow`、
    `--yz-color-border-subtle/strong`、`--yz-color-success/-warning/-danger/-info`
    （每个都带 `*-soft` 变体）、`--yz-color-overlay`。
  - 间距、圆角、字号/字重/行高、阴影、动效、触控目标尺寸。
- **组件（Component）**——按钮、卡片、选项块、首页功能块、图标容器、导航胶囊、标签、底部操作栏的具体配方。

组件只引用**语义**令牌；换品牌色板只需改一行令牌，而不用全局扫代码。

## 色板

标志色温暖而自然：

| 令牌族 | 示例 | 用途 |
| --- | --- | --- |
| **鼠尾草绿** | `--yz-color-action-primary: #526F5A` | 主按钮、选中 tab、进度环 |
| **暖米白** | `--yz-color-canvas: #F6F6F1` | 应用背景（也是 `globalStyle.backgroundColor`） |
| **暖白表面** | `--yz-color-surface: #FFFFFF` | 卡片 |
| **暖色弱调** | `--yz-color-surface-muted: #EFF1EC` | 输入框、录音行 |
| **鼠尾草点缀** | `--yz-color-accent: #718D78`、`--yz-color-accent-pale: #F0F4F1` | 首屏渐变、选中选项背景 |
| **功能色** | 成功 `#3F684E`、警告 `#8A5A12`、危险 `#A9473D`、信息 `#356786` | 仅用于状态——绝不做装饰 |

tabBar 与之呼应：未选中文字 `#858A85`，选中文字 `#526F5A`，白色背景。

## 字体

- 正文字体：`"PingFang SC", "Microsoft YaHei", sans-serif`
  （`--yz-font-family-body`）。
- 展示/标题字体：`"Songti SC", "STSong", serif`
  （`--yz-font-family-display`）——用于品牌字标与页面标题。
- 字号阶梯（语义层）：`--yz-font-size-caption` 18rpx、
  `--yz-font-size-meta` 20rpx、`--yz-font-size-body-small` 22rpx、
  `--yz-font-size-body` 26rpx、`--yz-font-size-subtitle` 30rpx、
  `--yz-font-size-title` 40rpx、`--yz-font-size-display` 48rpx。

## 样式约定

- **处处用 rpx**。`750rpx` = 屏幕宽度。间距与圆角始终基于令牌。
- CSS 自定义属性直接在 SFC 的 `<style scoped lang="scss">` 中消费，例如
  `background: var(--yz-color-surface); border-radius: var(--yz-radius-lg);`。
- `App.vue` 中的全局重置：
  ```scss
  page {
    min-height: 100%;
    background: var(--yz-color-canvas);
    color: var(--yz-color-text-primary);
    font-family: var(--yz-font-family-body);
    font-size: var(--yz-font-size-body);
  }
  view, text, image { box-sizing: border-box; }
  button::after { border: 0; }
  ```
- 卡片使用 `var(--yz-shadow-card)`；浮动条使用
  `var(--yz-shadow-floating)`。
- 进度环（语音回放）由内联 CSS 变量 `--audio-progress` 驱动的
  `conic-gradient` 绘制。

## 组件

可复用的共享积木：

| 组件 | 路径 | 用途 |
| --- | --- | --- |
| `FeatureGrid` | `components/home/FeatureGrid.vue` | 首页三列功能卡片 |
| `HeroCarousel` | `components/home/HeroCarousel.vue` | 自动轮播的功能首屏 |
| `RemoteImage` | `components/common/RemoteImage.vue` | 带内置兜底的 CDN 图片 |
| `DesignIcon` | `components/common/DesignIcon.vue` | 渲染生成的设计图标 |
| `AccountGuestState` | `components/account/AccountGuestState.vue` | 个人中心的游客态卡片 |
| `BackendStatus` / `BackendStatusHidden` | `components/dev/` | 仅开发用的连接浮层 |
| `FeatureShell` | `pkg-features/components/FeatureShell.vue` | 功能页共享的头/尾 |
| `StandardFeaturePage` | `pkg-features/components/StandardFeaturePage.vue` | 多步标准设计流程 |
| `OptionGrid` / `ImageOptionGrid` | `pkg-features/components/` | 选项块（图标 / 图片） |
| `UploadStep` / `ImageConfirmStep` | `pkg-features/components/` | 上传 + 预览步骤 |
| `ClientInfoForm` | `pkg-features/components/ClientInfoForm.vue` | 原木风客户信息（姓氏 / 称呼 / 项目） |
| `SubmittedStep` | `pkg-features/components/SubmittedStep.vue` | "任务已提交"状态 |
| `TokenShortageDialog` | `pkg-features/components/TokenShortageDialog.vue` | 积分门槛弹窗 |
| `AccountPage` | `pkg-account/components/AccountPage.vue` | 账户子页共享外壳 |
| `SubscriptionScenarioPanel` | `pkg-account/components/dev/` | 仅开发用的订阅覆盖面板 |

uview-plus 组件通过 `pages.json` 中的 `easycom` 自动导入
（`^u-(.*)` → `uview-plus/components/u-$1/u-$1.vue`）。

## 图标

图标是 `src/static/icons/` 下的 SVG 文件（`tabbar`、`design`、`editor`、
`account`、`contact`、`navigation`），通过生成的
`designIcons.generated.ts` 中的 `DesignIconName` 联合类型引用。约 90 个设计图标，覆盖房间、风格、家具、报告章节与操作。

## 重新生成令牌

修改 `design-tokens.json` 后：

```bash
pnpm design:generate        # 重新生成 SCSS + TS
pnpm check:design-system    # 校验一切同步（CI 中也会运行）
```

如果 CI 中检查失败，请重新生成并提交更新后的 `.generated.*`
文件——绝不要手动编辑它们。

## 无障碍与一致性说明

- 触控目标 ≥ `--yz-size-touch`（88rpx）；紧凑目标 64rpx。
- 状态色（琥珀/红/蓝）保留给其语义含义使用。
- 按钮重置微信默认边框（`button::after { border: 0 }`）。
- 所有盒模型使用 `border-box`。

## 下一步

- [测试与质量门禁](/frontend/testing)——`check:design-system` 是如何被强制的。
- [数据源模式](/frontend/data-source-modes)——构建配置。
