# Quick Start: From Mock UI to a Persistent Local Task

Follow these six milestones in order. The first three need no backend. The last three use a real local API/database with simulated WeChat identity, payment settlement and model execution. They do not validate real platform credentials or billable model results.

## 1. Prepare tools and a working folder

If Terminal is new to you, complete [macOS setup](/get-started/macos-setup) first. You need Node 22, the frontend's pnpm 9.15.9 and WeChat DevTools. Docker Desktop, Python 3.12, private dependency access and cloud-test configuration are needed later.

Commands below assume `~/MyPrj/zyz`. `cd` changes folder; `pwd` prints it. Copy commands without a shell prompt. This guide invokes pnpm through `npx` so each repository gets its pinned version.

**Checkpoint:** `node --version` prints `v22.*`, and `npx --yes pnpm@9.15.9 --version` prints `9.15.9`.

## 2. Get the right branches

[Clone the repositories](/get-started/macos-setup#download-the-repositories), then check the frontend:

```bash
cd ~/MyPrj/zyz/wechat_mini_program
git branch --show-current
```

Expect `ui-integration`. Check `YuanZhu-AI` separately and expect `main`. Keep these as sibling folders. Preserve any existing local changes before switching branches.

**Checkpoint:** both source folders exist and their branches match. You have not started Docker yet.

## 3. Build and open the frontend Mock

In a fresh frontend clone, copy the example settings and install dependencies. If `.env` already exists, preserve it rather than copying over it.

```bash
cd ~/MyPrj/zyz/wechat_mini_program
cp .env.example .env
npx --yes pnpm@9.15.9 install --frozen-lockfile
VITE_ENABLE_PRIVATE_PROJECTS=false npx --yes pnpm@9.15.9 build:mp-weixin:mock
```

Open WeChat DevTools → **Import project**. Select `~/MyPrj/zyz/wechat_mini_program/dist/build/mp-weixin`, use AppID `wxec0d577de41255aa`, and compile. Your WeChat account needs developer access to that AppID. Do not import the source repository root or `src/`.

After the startup screens, open **AI设计 → 室内设计**, choose a test room image and complete a simulated submission. Mock login and purchasing use the frontend's simulated data. No local server is involved. This starter build deliberately excludes the project tab.

**Checkpoint:** home, a design form and a simulated result open. A successful Mock preview proves the frontend environment, not the backend connection.

## 4. Start your own configured backend

This step has prerequisites that a source checkout cannot supply:

- Start Docker Desktop. Ask the maintainer for private `Orientation-CD/jinqiuai` read access and a GitHub SSH key loaded into your SSH agent. The Docker build forwards `SSH_AUTH_SOCK` to fetch this dependency, even for the local mock profile.
- Obtain authorized **cloud-test** configuration-read credentials. The optional importer reads legal documents, prompts, Features, Workflows, grants, plans and packages; it does not export supplier secrets. Alternatively, have the maintainer prepare equivalent local configuration through Admin.
- Select an unused API port from 1024–22527 and an owned Compose project. The example below uses **8080 only if you choose it**. Never stop another developer's stack to free a port.

In a new Terminal tab, prepare the backend's local Python environment for the importer:

```bash
cd ~/MyPrj/zyz/YuanZhu-AI
python3.12 -m venv .venv
.venv/bin/python -m pip install -e .
cp .env.example .env
open -a TextEdit .env
```

For an existing `.env`, skip the copy and preserve its settings. Edit as plain text, keep the exact `.env` filename, and set a local `ADMIN_PASSWORD`. For the import route, add the three values supplied privately by the maintainer:

```dotenv
CLOUD_API_URL=https://your-authorized-cloud-test-origin
CLOUD_ADMIN_USERNAME=your-cloud-test-admin
CLOUD_ADMIN_PASSWORD=your-cloud-test-password
```

These are placeholders, not working credentials. Keep the file ignored; do not send its contents in a bug report. A first-time import requires a **fresh PostgreSQL volume**. An existing/partly configured volume is intentionally protected; use a newly owned port/project or configure it manually, rather than deleting its data.

Set your selected port and inspect listeners and existing Compose projects:

```bash
export DEV_TEST_PORT=8080
lsof -nP -iTCP:"$DEV_TEST_PORT" -sTCP:LISTEN
docker compose ls
.venv/bin/python scripts/stack_ports.py "$DEV_TEST_PORT"
```

The last command prints MinIO's API and console ports; for 8080 they are **29584** and **51088**. Check both for existing listeners with `lsof` too. Resolve any ownership conflict before proceeding. Then start a fresh configured stack:

```bash
./scripts/create_stack.sh --port "$DEV_TEST_PORT" --ip localhost --wechat mock --storage minio --secret .env --import-cloud-config
curl --fail "http://127.0.0.1:$DEV_TEST_PORT/health/ready"
```

`--ip localhost` makes this a Mac/simulator setup. Physical phones need the LAN setup in [Platforms](/frontend/platforms). If configuration is already prepared in your owned stack, omit `--import-cloud-config` on subsequent starts. Docker retains named volumes.

**Checkpoint:** readiness succeeds; `http://127.0.0.1:8080/admin` (substitute your port) opens; your local Admin can see current legal documents, active product configuration, an eligible subscription plan and funded generation configuration. Database and Redis are internal by default; there is no implied host PostgreSQL port 5432.

## 5. Build an API frontend for that exact port

Use a new Terminal tab. Shell variables do not automatically carry into it, so set the **same selected port again**. These explicit settings disable the frontend subscription-demo panel and align API, report and result origins:

```bash
cd ~/MyPrj/zyz/wechat_mini_program
export DEV_TEST_PORT=8080
export SETUP_MINIO_API_PORT=$((DEV_TEST_PORT + 21504))
VITE_DATA_SOURCE=api \
VITE_MINI_PROGRAM_PLATFORM=weixin \
VITE_MINI_PROGRAM_AUTH_MODE=mock \
VITE_WECHAT_AUTH_MODE=mock \
VITE_PAYMENT_MODE=mock \
VITE_SHOW_BACKEND_STATUS=true \
VITE_ENABLE_SUBSCRIPTION_SCENARIOS=false \
VITE_ENABLE_PRIVATE_PROJECTS=true \
VITE_ALLOW_INSECURE_LAN_HTTP=true \
VITE_API_BASE_URL="http://127.0.0.1:$DEV_TEST_PORT" \
VITE_ASSET_BASE_URL=https://static.yuanzhushuzhi.com \
VITE_RESULT_STORAGE_ORIGINS="http://localhost:$SETUP_MINIO_API_PORT" \
VITE_REPORT_WEB_ORIGIN="http://localhost:$DEV_TEST_PORT" \
npx --yes pnpm@9.15.9 exec uni build -p mp-weixin
```

Recompile the same `dist/build/mp-weixin` project in WeChat DevTools. For this local HTTP test, enable the DevTools option to skip legal-domain/TLS checks. That debugging option is unsuitable for a released package.

The shorter `dev:mp-weixin:api-local` script always assigns **8080** and enables a frontend entitlement scenario panel. Prefixing it with a different API URL will not override the URL inside that script. Use the explicit command above when following this acceptance loop or using another port.

Open **我的**, accept the current legal documents and register through the local mock identity flow. The UI should now send `/v1/...` requests to your selected local port. Never add `/api` to these paths.

**Checkpoint:** registration creates server state; the same account remains after recompilation. Feature discovery works, and the Project tab is present.

## 6. Complete a local purchase, task and persistence check

A new personal account still needs an active subscription that permits the selected feature and sufficient Tokens. Frontend demo overrides cannot grant server permission.

1. In **我的 → 购买权益**, choose an eligible subscription and confirm. The backend creates a pending order. The native WeChat payment bridge may fail with local mock payment parameters; this does not mean the order was never created. Avoid repeatedly creating orders.
2. In DevTools **Network**, find the successful `POST /v1/subscriptions` response and copy its top-level **`id`**, your own payment-order UUID.
3. In DevTools **Console**, run the following local-only snippet. Replace the port with your selected port and `YOUR_ORDER_ID` with that UUID. It reads the current simulated account's token from the exact session key without printing it.

```js
(() => {
  const base = "http://127.0.0.1:8080";
  const orderId = "YOUR_ORDER_ID";
  const session = wx.getStorageSync("yuanzhu.session.tokens.v1");
  if (!session?.access_token || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    console.log("Sign in and set your own order UUID first.");
    return;
  }
  wx.request({
    url: `${base}/mock/payments/${orderId}/complete`,
    method: "POST",
    header: { Authorization: `Bearer ${session.access_token}` },
    success: ({ statusCode, data }) => console.log(statusCode, data.status),
    fail: () => console.log("Local settlement request failed.")
  });
})();
```

This endpoint is authenticated, checks order ownership and exists only for mock WeChat settlement. It is not a real payment or a replacement for signed production notifications. If it returns 401, re-enter the account page to refresh your session; if the order is no longer pending, inspect the order before attempting another purchase.

4. Return to **支付记录** and **权益管理**. Confirm the server order is `paid` and the subscription is active. If needed, buy and settle a local Token package the same way; use the ID from `/v1/token-purchases`.
5. Open **AI设计 → 室内设计**, upload a small JPEG/PNG, complete the options and submit once. Observe upload/completion, an accepted task, polling and a completed result through the local mock provider.
6. Open **我的方案**, then recompile/reopen the app without clearing storage. The task and purchased entitlement must still be present. Check Token detail for the corresponding reservation/settlement entries.

**Checkpoint:** one paid server order, an active eligible entitlement, one completed server task and a retrievable result survive a frontend restart. Keep the selected port/project and source revision with your result. Stop only your own Compose group through Docker Desktop when finished; retain its volumes.

## When a checkpoint fails

| Symptom | Check first |
| --- | --- |
| Command cannot find `package.json` | Run `pwd`; return to the correct repository. |
| Private Git dependency cannot be fetched | Repository permission and SSH agent forwarding, before repeating Docker builds. |
| Healthy API but no legal docs/features/plans | Local product configuration/import; health alone is insufficient. |
| HTTP, file or image failure | Local domain debugging setting, selected port, derived MinIO origin and signed URL expiry. |
| Subscription/Token rejection | Server entitlement, feature permissions and balance; no frontend scenario overlay. |
| Native payment error | Existing pending order and the explicit local mock-settlement step above. |

Continue with [Frontend getting started](/frontend/getting-started), [Projects](/frontend/projects), [Local stack](/deploy/local-stack) and [FAQ](/get-started/faq).

## Source evidence

Frontend `eca0a5f`, backend `b13cc56` (2026-10-20): [Build commands](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/package.json) · [Session storage](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/stores/session.ts) · [Local launcher](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/scripts/create_stack.sh) · [Port derivation](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/scripts/stack_ports.py) · [Mock settlement](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/billing/billing_api.py).
