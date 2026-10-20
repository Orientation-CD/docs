# Authentication and legal consent

The service supports phone/password, WeChat and Douyin login. All produce the application access/refresh token pair; provider OpenIDs and credentials stay server-side.

## Customer sessions

| Action | Public endpoint |
| --- | --- |
| Register / password login | `/v1/auth/register`, `/v1/auth/login` |
| WeChat / Douyin login | `/v1/auth/wechat-login`, `/v1/auth/douyin-login` |
| Rotate / revoke session | `/v1/auth/refresh`, `/v1/auth/logout` |
| Profile | `/v1/me` |

Registration and login include current legal-document consent when required. Load `/v1/legal-documents/current`, show both immutable documents, then submit the document IDs and consent fields defined in [REST API](/reference/rest-api). Unavailable legal metadata is a blocking service failure, not an empty consent requirement.

Send access tokens as `Authorization: Bearer <access_token>`. Refresh and logout use the **refresh token in the request body**. Durable `auth_sessions` records support revocation; do not infer that an unexpired JWT always grants access. Rotation/retry behavior and identity linking follow the normative contract rather than a client-supplied user ID or phone.

The Settings defaults are 15 minutes for access tokens and 30 days for refresh tokens. Clients branch on `detail.code` and honor `Retry-After`; do not repeatedly retry invalid credentials or treat a provider outage as permission to create a second account.

## Account lifecycle

A user can request `/v1/me/deactivate`; the normal grace period defaults to seven days. Credential-verified password, WeChat and Douyin reactivation routes exist. After expiry the worker anonymizes eligible accounts. Administrator suspension is a different operation; restoring an account does not recreate retired enterprise memberships. See [user operations](/admin/users).

## Administrator sessions

Studio Control uses a signed `floorplan_admin` browser cookie plus a Redis-backed active-session registry. It does not use customer bearer tokens. Sessions last eight hours, and a later login invalidates the previous active session for that administrator. Forms require the matching CSRF token; Redis session failures fail closed.

Configure `ADMIN_PHONE` and `ADMIN_PASSWORD` to bootstrap an administrator on startup. Use HTTPS/Secure cookies in production and keep signing/encryption keys stable. See [admin setup](/admin/getting-started) and [configuration](/reference/configuration).

---

Source evidence · backend `b13cc566`: [app/identity/api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/identity/api.py) · [app/identity/admin_sessions.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/identity/admin_sessions.py) · [documents/REST_API_INTERFACE.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/REST_API_INTERFACE.md).
