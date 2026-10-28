# Frontend Getting Started

Use Node 22 and this repository's pnpm 9.15.9. First-time terminal users should follow [macOS setup](/get-started/macos-setup); the complete real-service loop is in [Quick Start](/get-started/quickstart). Commands below run in the **frontend repository**, not the docs or backend folder.

## 1. Confirm the branch and install

```bash
cd wechat_mini_program
git switch ui-integration
git pull --ff-only
corepack enable
pnpm --version
pnpm install --frozen-lockfile
```

Expected pnpm version:9.15.9. A frozen install applies the committed Vitest and uview-plus patches. If Corepack is unavailable, use `npx --yes pnpm@9.15.9` in place of `pnpm`. Do not solve an install failure by deleting the lockfile or bypassing patches. Record the installed commit with `git rev-parse HEAD`; published docs are tied to [the audited commits](/reference/source-revisions), while a newly pulled branch can be ahead.

## 2. Build a frontend Mock package

```bash
pnpm build:mp-weixin:mock
```

Expected output: `dist/build/mp-weixin`. Import **that directory** into WeChat DevTools with public AppID `wxec0d577de41255aa` and an authorized developer account. Do not import `src/` or the repository root. This explicit Mock build forces project support off; it is suitable for the basic image/UI path, not proof of the server execution chain.

For a watch process:

```bash
pnpm dev:mp-weixin:mock
```

Expected output changes to `dist/dev/mp-weixin`; keep the terminal running and import that directory. Control–C stops the watcher. The watch script does not force the project flag like the production-style Mock build does, so inspect your environment if the navigation differs.

If DevTools shows the previous UI, check the imported output directory, rebuild the intended profile and recompile. Source files and compiled output are different trees.

## 3. Choose the integration boundary

| Goal | Command or guide | What it validates |
| --- | --- | --- |
| Douyin frontend Mock | `pnpm build:mp-toutiao:mock` | Import `dist/build/mp-toutiao` in Douyin tools |
| Owned local API stack | [Quick Start](/get-started/quickstart) explicit build | Real API/storage/queue/database behavior with configured identity/provider mode |
| WeChat production API artifact | `pnpm quality:mp-weixin:api` after configuring origins | Contract/design, Babel and production artifact gates |
| Team cloud environment | [Platform wrapper](/frontend/platforms) for that environment | Readiness + selected environment + artifact checks |
| Professional floor plans | [Integration boundary](/frontend/floor-plans) first | This audited backend does not yet supply the required routes |

The fixed 8080 `:api-local` helpers are convenient only when that is the owned session port. Do not prefix an alternate URL and assume it overrides the script's inline value. Use the explicit build in Quick Start for a different port, including matching result/report origins and disabled entitlement-demo overrides.

A simulator can use loopback; a phone cannot reach the Mac at the phone's own 127.0.0.1. For real devices use [the platform guide](/frontend/platforms), the owned LAN address and correct backend identity configuration.

## 4. Know which configuration owns a failure

| File or output | Responsibility |
| --- | --- |
| `package.json`, `pnpm-lock.yaml`, `patches/` | Toolchain, commands and patched dependencies |
| `.env.example`, `src/env.d.ts` | Public build values and declarations |
| `src/manifest.json`, `src/pages.json` | Platform metadata, permissions, pages, subpackages and Tabs |
| `vite.config.ts`, `config/build-targets.mjs` | Build aliases, preprocessing and Douyin profiles |
| `project.config.json`, `project.private.config.json` | Shared and local WeChat tool settings |
| `dist/build/*`, `dist/dev/*` | Compiled import/upload artifacts |

Configuration enters the client at build time. Keep local `.env` files and never put server secrets in them. The docs repository separately uses pnpm 10.28.2; do not install one repository's dependencies from another directory.

Before review, run the relevant [tests and artifact gates](/frontend/testing). A successful build is useful evidence, but real identity, payment and supplier acceptance require their actual configured environments.

## Source evidence

Verified 2026-10-28: [Pinned package/scripts/patches](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/package.json) · [Page registry](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/src/pages.json) · [Douyin build targets](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/config/build-targets.mjs) · [Device address guard](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/scripts/require-device-api-url.mjs) · [WeChat artifact gate](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/scripts/check-code-quality.mjs).
