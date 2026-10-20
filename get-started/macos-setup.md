# macOS Setup: Your First Terminal and Repositories

This page assumes you have never run a command. Complete the tool setup here, then follow the six milestones in [Quick Start](/get-started/quickstart). You can finish the frontend preview before configuring Docker or backend credentials.

## Open Terminal and understand folders

Press **Command–Space**, type **Terminal**, then press Return. A line ending in `%` is the shell waiting for input. Copy only the command inside a code block, without the `%`, and press Return. Output appears below it. Wait for the next prompt before running another command. If a development server keeps running, **Control–C** stops that command; it does not delete files.

```bash
pwd
```

This prints your current folder. `~` means your home folder, `/` separates folder names, and `..` means the parent folder. A new terminal tab has its own current folder. `cd` changes it; `ls` lists its contents. Commands such as `pnpm install` must run in the intended repository, where its `package.json` lives.

```bash
mkdir -p ~/MyPrj/zyz
cd ~/MyPrj/zyz
pwd
```

The last line should end in `/MyPrj/zyz`. This guide uses that location consistently. If you choose another location, substitute it in each `cd` command. Quote paths containing spaces.

## Install tools

| Tool | Installation and first check |
| --- | --- |
| Git | Run `git --version`; if macOS offers Command Line Tools, install them, reopen Terminal and run it again. |
| Node.js 22 | Download the macOS installer for the 22.x line from the [official Node archive](https://nodejs.org/en/download/archive/v22), run it, reopen Terminal; `node --version` should start with `v22.`. Use a current 22.x patch release. |
| pnpm | Use the pinned versions below. Node's `npm` is used to invoke the right version explicitly. |
| WeChat DevTools | Install the macOS build from [WeChat's download page](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html), open it and sign in using WeChat. Ask the project owner to grant developer access to the project AppID. |
| Docker Desktop | Needed only for the backend milestone. Use the [official macOS installer](https://docs.docker.com/desktop/setup/install/mac-install/); Apple menu → About This Mac identifies Apple silicon or Intel. Open Docker Desktop and wait for its engine to run. |
| Python 3.12 | Needed on the Mac for the local configuration importer. Use the [official Python macOS downloads](https://www.python.org/downloads/macos/); check `python3.12 --version`. The API itself runs in Docker. |

Node 18 is insufficient for this repository's domain-test command, which uses Node's TypeScript stripping flag. This guide standardizes on Node 22; it is a documented setup choice, not a version pinned by an application `.nvmrc`.

Use exact pnpm versions without changing a global installation:

```bash
npx --yes pnpm@9.15.9 --version
npx --yes pnpm@10.28.2 --version
```

The first may download pnpm and should print `9.15.9`; the second should print `10.28.2`. In the application guides, a command written as `pnpm ...` can be run as `npx --yes pnpm@9.15.9 ...`. In this docs repository use `npx --yes pnpm@10.28.2 ...`. Keep that distinction when moving between folders. [pnpm installation reference](https://pnpm.io/installation/).

## Download the repositories

Ask for GitHub access to the organization first. The following commands create three folders; they do not start an application. Git may open a browser to authenticate. If access is denied, resolve the account permission rather than inserting passwords in the URL.

```bash
cd ~/MyPrj/zyz
git clone --branch ui-integration https://github.com/Orientation-CD/wechat_mini_program.git
git clone --branch main https://github.com/Orientation-CD/YuanZhu-AI.git
git clone --branch main https://github.com/Orientation-CD/docs.git
```

If a folder already exists, do not clone over it or delete it. Open it and inspect its branch and local edits with `git status` first; ask the maintainer before switching existing work.

```bash
cd ~/MyPrj/zyz/wechat_mini_program
git branch --show-current
git status --short
```

Expect `ui-integration`. Empty output from `git status --short` means no local file changes. In `YuanZhu-AI`, expect `main`. GitHub Desktop can clone repositories and show these branches if you prefer a graphical interface; the later install/build commands still run in Terminal.

## Source files versus the running mini program

`src/` holds files edited by developers. `pnpm ... build` compiles them into `dist/build/mp-weixin`; a watch/development command uses `dist/dev/mp-weixin`. **Import the generated output directory into WeChat DevTools**, not `src/` or the repository root. Rebuild after changing compile-time environment settings.

The project's public WeChat AppID is `wxec0d577de41255aa`. An AppID identifies the project. An AppSecret authenticates its server and must never be entered into frontend files.

## Before the backend stage

A backend image build also needs permission to the private `Orientation-CD/jinqiuai` repository and an SSH key loaded into `SSH_AUTH_SOCK`. HTTPS access to the two application repositories does not supply this. Ask the maintainer to help create/register a GitHub SSH key and load it; follow [GitHub's SSH setup](https://docs.github.com/en/authentication/connecting-to-github-with-ssh). Never share the private key.

For configuration import you also need authorized cloud-test Admin credentials. Obtain them through the team's private channel; put them only in the ignored backend `.env`. [Quick Start](/get-started/quickstart) explains the import, port selection and acceptance checks.

## Optional: preview these docs

This is a website preview in a browser, separate from the mini program:

```bash
cd ~/MyPrj/zyz/docs
npx --yes pnpm@10.28.2 install --frozen-lockfile
npx --yes pnpm@10.28.2 docs:dev
```

Open the local URL printed by VitePress. Leave that terminal running while reading the preview; Control–C stops it. The docs website needs neither Docker nor a mini-program AppID.

## Source evidence

Documented against frontend `eca0a5f` and backend `b13cc56` (2026-10-20). [Frontend package and commands](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/package.json) · [Backend local runbook](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/scripts/runbook.md).
