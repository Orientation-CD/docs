# macOS 准备：第一次使用终端与仓库

本页不假设你会运行命令。先完成工具准备，再按[快速开始](/zh/get-started/quickstart)的六个里程碑操作。首次前端预览可以先于 Docker、后端凭据配置完成。

## 打开终端，认识目录

按 **Command–空格**，输入 **终端** 或 **Terminal**，回车打开。以 `%` 结尾的一行表示 Shell 等待输入。只复制代码块里的命令，不要复制 `%`，按回车执行。输出出现在下方，等新提示符出现后再执行下一条。开发服务器持续运行时，按 **Control–C** 可停止该命令，不会删除文件。

```bash
pwd
```

它显示当前文件夹。`~` 代表你的用户主目录，`/` 分隔目录名，`..` 代表上一层。每个终端标签页有独立当前目录。`cd` 切换目录，`ls` 列出文件。`pnpm install` 等命令必须在目标仓库内、`package.json` 所在目录运行。

```bash
mkdir -p ~/MyPrj/zyz
cd ~/MyPrj/zyz
pwd
```

最后的输出应以 `/MyPrj/zyz` 结尾。本指南统一使用该位置；如果另选位置，请同步替换每条 `cd`。带空格的路径需用引号包住。

## 安装工具

| 工具 | 安装与检查 |
| --- | --- |
| Git | 执行 `git --version`；macOS 若提示安装命令行工具，完成后重新打开终端再检查。 |
| Node.js 22 | 从 [Node 官方归档](https://nodejs.org/en/download/archive/v22)下载 22.x 的 macOS 安装包，安装后重开终端。`node --version` 应以 `v22.` 开头，选择当前 22.x 补丁版本。 |
| pnpm | 按下文使用固定版本；通过 Node 附带的 `npm` 显式调用。 |
| 微信开发者工具 | 从[微信官方下载页](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)安装 macOS 版，打开并微信登录；请项目所有者授予该 AppID 的开发权限。 |
| Docker Desktop | 后端阶段才需要。使用[官方 macOS 安装指引](https://docs.docker.com/desktop/setup/install/mac-install/)；苹果菜单 → 关于本机查看 Apple 芯片或 Intel，选对应安装包。打开后等待引擎运行。 |
| Python 3.12 | Mac 上运行本地配置导入器需要；从 [Python 官方 macOS 下载页](https://www.python.org/downloads/macos/)安装，检查 `python3.12 --version`。API 本身在 Docker 运行。 |

Node 18 不能执行仓库中使用 TypeScript stripping 标记的领域测试。本指南统一选择 Node 22；这是文档约定，不表示应用仓库有 `.nvmrc` 固定该版本。

无需修改全局安装，即可使用正确 pnpm：

```bash
npx --yes pnpm@9.15.9 --version
npx --yes pnpm@10.28.2 --version
```

首次可能下载 pnpm，输出分别应为 `9.15.9`、`10.28.2`。应用指南中的 `pnpm ...` 可写为 `npx --yes pnpm@9.15.9 ...`；文档仓库则用 `npx --yes pnpm@10.28.2 ...`。切换目录时保留这个区分，另见 [pnpm 安装说明](https://pnpm.io/installation/)。

## 下载仓库

先向团队申请 GitHub 组织权限。以下命令创建三个目录，不会启动应用。Git 可能打开浏览器认证；若无权限，解决账号授权，不要把密码写进 URL。

```bash
cd ~/MyPrj/zyz
git clone --branch ui-integration https://github.com/Orientation-CD/wechat_mini_program.git
git clone --branch main https://github.com/Orientation-CD/YuanZhu-AI.git
git clone --branch main https://github.com/Orientation-CD/docs.git
```

目录已存在时不要覆盖克隆或直接删除。先进入它，用 `git status` 检查分支与本地修改；切换已有工作前请与维护者确认。

```bash
cd ~/MyPrj/zyz/wechat_mini_program
git branch --show-current
git status --short
```

应显示 `ui-integration`；`git status --short` 无输出表示没有本地文件改动。后端目录应显示 `main`。也可用 GitHub Desktop 图形界面克隆、查看分支；后续依赖安装和构建仍在终端执行。

## 源码与运行的小程序不同

`src/` 是开发者编辑的源码。`pnpm ... build` 编译到 `dist/build/mp-weixin`，开发监听命令输出到 `dist/dev/mp-weixin`。**微信开发者工具导入编译产物目录**，不要导入 `src/` 或仓库根目录。修改编译期环境变量后要重新构建。

公开微信 AppID 为 `wxec0d577de41255aa`。AppID 标记项目；AppSecret 用于服务端认证，不能写进前端文件。

## 后端阶段前还需要什么

后端镜像构建需要私有 `Orientation-CD/jinqiuai` 的读取权限，以及已加载、可通过 `SSH_AUTH_SOCK` 使用的 SSH 密钥。拥有两个应用仓库的 HTTPS 权限不能替代它。请维护者协助创建/登记 GitHub SSH 公钥并加载密钥，具体见 [GitHub SSH 设置](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)。不要分享私钥。

配置导入还需要授权的云测试 Admin 账号，通过团队私密渠道获取，仅写入后端被忽略的 `.env`。导入、端口选择和验收见[快速开始](/zh/get-started/quickstart)。

## 可选：预览本文档

这是独立的浏览器网站，不是小程序：

```bash
cd ~/MyPrj/zyz/docs
npx --yes pnpm@10.28.2 install --frozen-lockfile
npx --yes pnpm@10.28.2 docs:dev
```

打开 VitePress 输出的本地 URL，阅读时保留终端运行；Control–C 停止。文档预览不需要 Docker 或小程序 AppID。

## 源码依据

核对版本：前端 `3662578`、后端 `e59716c`（2026-10-28）。[前端依赖与命令](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/package.json) · [后端本地运行手册](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/scripts/runbook.md)。
