# GitHub Actions CI/CD

有两个仓库使用 GitHub Actions：**后端**（YuanZhu-AI）运行定时耐久压测和 PR 文档门禁；
本**文档仓库**（`docs`）自动把站点发布到 GitHub Pages。SAE 云测与生产部署本身
**不是** GitHub Actions 工作流——它由 `deploy/sae/` 下的脚本手动驱动
（见 [SAE 部署操作手册](/deploy/sae-deployment)）。本页覆盖*所有*已自动化的部分。

## 后端工作流

后端仓库（`.github/workflows/`）附带两个工作流。

### `daily-endurance.yml`——定时负载耐久压测

| 方面 | 值 |
| --- | --- |
| **文件** | `.github/workflows/daily-endurance.yml` |
| **触发** | `schedule`（cron `17 3 * * *`）和类型为 `daily-endurance` 的 `repository_dispatch` |
| **权限** | `actions: read`、`contents: read` |
| **并发** | 分组 `daily-endurance`，`cancel-in-progress: false` |

它做的事：

1. **`decide` job**（ubuntu-latest，5 分钟超时）：当由 schedule 触发时，它向 GitHub API
   查询上一次定时运行的 `head_sha`。若与当前 SHA 相同则跳过（发布已覆盖）；
   否则继续运行。手动 `repository_dispatch` 总是运行。
2. **`endurance` job**（needs `decide`，75 分钟超时）：
   - 检出代码，安装 Python 3.12 和 `.[dev]` 测试依赖。
   - 校验有界 profile：精确为 `E2E_USER_RUNNERS=2`、
     `E2E_USERS_PER_CONTAINER=4`、`E2E_DURATION_SECONDS=1800`、
     `E2E_AUTH_THREADS_PER_CONTAINER=2`、`E2E_API_WORKERS=2`。
   - 把 `.env.example` 安装到受保护的临时文件，并针对云端 admin 运行
     `python -m app.config_sync query` 以捕获校验过的配置快照。
   - 通过 `scripts/run_e2e_tests.sh --local localhost --mode endurance --config-snapshot ...`
     拉起一个一次性 Compose 栈（`CI_COMPOSE_PROJECT=yuanzhu-daily-<run-id>`、
     `CI_API_PORT=6060`）。
   - 把 `free -m`、`df -h`、`docker stats` 采样到 `resources.log`。
   - 结束时（无论成败）抓取 `docker compose ps`/日志，把证据目录作为
     保留 7 天的 artifact 上传，并以 `--volumes` 拆除自己的栈。

**所需 Secrets：**

| 类型 | 名称 | 用途 |
| --- | --- | --- |
| secrets | `CLOUD_API_URL` | 耐久 E2E 目标 / 配置同步来源 |
| secrets | `CLOUD_ADMIN_USERNAME` | 配置同步 admin 登录 |
| secrets | `CLOUD_ADMIN_PASSWORD` | 配置同步 admin 密码 |
| vars | `DAILY_E2E_USER_ACTION_DELAY_SECONDS`、`DAILY_E2E_ADMIN_ACTION_DELAY_SECONDS` | 可选节奏覆盖（有界 1–10 s / 0.5–5 s） |

### `sdd-docs.yml`——PR 文档门禁

| 方面 | 值 |
| --- | --- |
| **文件** | `.github/workflows/sdd-docs.yml` |
| **触发** | 路径 `**/*.md`、`.github/spec-driven-delivery/**`、`scripts/check_sdd.py`、`tests/tooling/**`、`pyproject.toml`、本工作流文件上的 `pull_request` |
| **权限** | `contents: read` |
| **并发** | 按 PR 编号分组，`cancel-in-progress: true` |

单个 job（`sdd`，ubuntu-latest，10 分钟）安装固定版本的文档工具
（`markdown-it-py==4.2.0`、`PyYAML==6.0.3`、`ruff==0.16.0`）并运行：

```bash
python scripts/check_sdd.py
python -m unittest discover -s tests/tooling -p 'test_*.py'
python -m ruff check scripts/check_sdd.py tests/tooling
python -m ruff format --check scripts/check_sdd.py tests/tooling
git diff --check "$BASE_SHA...$HEAD_SHA"
```

证据作为保留 30 天的 artifact 上传。无需 secrets。

### SAE 部署自动化在哪里

云测与生产 SAE 发布由 `deploy/sae/deploy.sh` 及其辅助脚本
（`build-image.sh`、`run-deploy-container.sh`、`deploy-image.sh`）执行，
而非 GitHub Actions 工作流。预期的运维流程是：

1. 推送到 `main`（或运行 `daily-endurance`）。
2. 本地运行两阶段部署（构建镜像 → 按摘要部署）——见
   [SAE 部署操作手册](/deploy/sae-deployment)。
3. 生产提升使用受保护的 `--promote` / `--rollback` 参数。

这样把发布控制权留在一个能读懂迁移备份证据、并批准数据库关卡的运维人员手中，
而不是交给一次定时运行。

## 文档工作流：自动发布到 GitHub Pages

文档仓库（`.github/workflows/deploy.yml`）使用标准的 VitePress + GitHub Pages 设置。

| 方面 | 值 |
| --- | --- |
| **文件** | `.github/workflows/deploy.yml` |
| **触发** | 推送到 `main`，以及手动 `workflow_dispatch` |
| **权限** | `contents: read`、`pages: write`、`id-token: write` |
| **并发** | 分组 `pages`，`cancel-in-progress: false` |
| **环境** | `github-pages` |

两个 job：

1. **`build`**（ubuntu-latest）：checkout → 安装 `pnpm/action-setup` +
   `actions/setup-node@v4`（Node 22，pnpm 缓存）→ `pnpm install --frozen-lockfile` →
   `pnpm docs:build` → 通过 `actions/upload-pages-artifact@v3` 上传 `.vitepress/dist`。
2. **`deploy`**（needs `build`）：用 `actions/deploy-pages@v4` 部署到
   `github-pages` 环境。

无需任何仓库 secret——GitHub Pages 身份由 `GITHUB_TOKEN` 提供。

### 本地文档命令

由于 GitHub Pages 在项目路径下服务本仓库，`.vitepress/config.mts` 设置了
`base: '/docs/'`（与仓库名匹配）。如果你重命名了仓库，请更新 `base`。

```bash
pnpm install
pnpm docs:dev        # 带 HMR 的开发服务器
pnpm docs:build      # 生产构建，输出到 .vitepress/dist
pnpm docs:preview    # 预览构建产物
```

`package.json` 固定了 `packageManager: pnpm@10.28.2` 和 `vitepress: ^1.6.3`。

## 本文档的贡献规则

- 所有内容都是 section 目录下的 Markdown（`deploy/`、`reference/flows/` 等）。
- 内部链接是根相对路径，不带 `.md` 或语言前缀（例如
  `/deploy/sae-deployment`、`/reference/flows/design-job-lifecycle`）。
- 真实服务名、端口、环境变量和脚本路径要与后端保持同步。
- 绝不提交 `node_modules/`、`.env` 或 `.vitepress/dist/`。
- 推送到 `main` 即发布；站点自动更新。

## 下一步

- [SAE 部署操作手册](/deploy/sae-deployment)——手动两阶段流程。
- [生产提升与回滚](/deploy/production)——已验证的镜像如何上生产。
