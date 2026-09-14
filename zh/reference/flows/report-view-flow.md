# 汇报查看流程（端到端）

这是在小程序中查看 HTML 设计汇报的完整链路——从一个完成的设计作业，到
一个渲染出来、经 CSP 加固的 HTML 页面。汇报是后端服务的 Jinja2 模板；
小程序自己从不渲染它们。

## 汇报模板系统（先读这段）

模板在 Studio Control（Admin）中管理，并带有一个 **scope**（作用域）存储
（`ReportTemplateScope`）：

```text
ReportTemplateScope = global | workspace:<enterprise-id> | user:<user-id>
```

- 候选模板通过 `save_report_template_candidate(...)` 保存：
  - 内容在沙箱化的 Jinja2 环境中由 `validate_report_template` 校验
    （`_ReportTemplateEnvironment` 继承 `SandboxedEnvironment`）——保存前检查语法
    和汇报数据契约；
  - 每个 scope 有保存锁，防止并发候选；幂等缓存键阻止重复提交；
  - 候选入队等待晋升；`resolve_active_report_template` 返回该 scope 的活跃模板
    （缓存在 Redis，晋升时失效）。
- 渲染使用 `render_report_template(content_utf8, report, csp_nonce)`，上下文
  显式且最小化——沙箱内无法访问任意 Python。

## 第 0 部分——设计作业完成（html_report）

```
Design job lifecycle completes
  (result_kind = html_report, e.g. "生成汇报")
        │
        ▼
_design_report.py: create_report_for_design_job(...)
  1. one design_reports row per completed design job
  2. design_report_items rows (images, headings, layout)
  3. design_report_item_assets → result asset_ids
  4. mark design_reports.status = ready_for_view
```

## 第 1 部分——前端申请汇报查看令牌

```
User taps "查看汇报"
        │
        ▼
Frontend services/reportCapability.ts
  getFreshReportCapability(designJobId)
  → returns whether a report exists and how to view it
        │
        ▼
GET /v1/design-jobs/{id}/report-view-token
  Authorization: Bearer <access_token>
        │
        ▼
app/api.py → report_view.create_report_view_token(...)
  1. get_current_user; load the design job + report (ownership check)
  2. build_report_context(...)  (report_view.py)
       • assemble report_data: headings, report items,
         image contexts (public/presigned URLs, alt, caption)
  3. resolve_active_report_template(scope)  (report_templates.py)
       workspace/user scope first, fall back to global
  4. create_report_csp_nonce() → one fresh nonce
  5. sign a SHORT-LIVED report view JWT:
       claims = { sub, report_id, design_job_id, nonce,
                   exp = now + REPORT_VIEW_TOKEN_SECONDS }
       (HMAC-signed with REPORT_VIEW_SECRET_KEY; NOT a user access token)
  6. return ReportViewTokenResponse { report_view_token, report_view_url,
                                      expires_at }
```

## 第 2 部分——后端按需渲染 HTML

```
GET /v1/reports/{report_id}?token=<report_view_token>
        │
        ▼
app/api.py → report_view:
  1. decode_report_view_token(token, settings)  → ReportViewClaims
       • check signature, expiry (REPORT_VIEW_TOKEN_SECONDS, e.g. 30 s local)
       • bind to the report_id in the path
  2. build_report_context(...) again (fresh presigned image URLs)
  3. render_report_html(...)
       render_report_template(active_template.content, report_data, nonce)
  4. report_content_security_policy(nonce)
       • CSP header: default-src 'self';
         img-src  <cdn host> <storage hosts> https: data:;
         script-src 'nonce-<nonce>' 'strict-dynamic';
         object-src 'none'; base-uri 'none'
       • anti-clickjacking frame-ancestors 'none'
  5. return text/html; charset=utf-8
```

## 第 3 部分——小程序展示汇报

```
Frontend services/reportViewer.ts
  validateReportViewer({ url })   (basic shape/allowlist checks)
  → web-view src = report_view_url
        │
        ▼
WeChat web-view component loads the backend HTML
  • short TTL means the link cannot be shared / replayed later
  • CSP nonce pins inline scripts; no remote script origins
  • images load from the CDN / presigned object URLs
```

## 为什么单独用一个短生命周期令牌

| 属性 | 汇报查看令牌 | 用户访问令牌 |
| --- | --- | --- |
| 生命周期 | 秒级（`REPORT_VIEW_TOKEN_SECONDS`） | 分钟级 |
| 受众 | 一份汇报、一次渲染 | API 用户会话 |
| 用途 | 打开一次 web-view | 调用受保护 API |
| 存储 | 不持久化；内联使用 | `yuanzhu.session.tokens.v1` |
| 重放 | 在分享发生前就已过期 | 401 时轮换 |

## 安全属性

- **沙箱化 Jinja2**——`SandboxedEnvironment`；模板无法访问任意 Python。
- **CSP nonce**——内联脚本必须携带每次渲染的 nonce。
- **签名、短 TTL、单汇报**令牌——web-view URL 中不含会话凭据。
- **预签名图片 URL** 每次渲染重新生成，范围限定为该汇报的资源。
- **访问日志过滤**——`_ReportViewAccessLogFilter` /
  `configure_report_view_access_log_filter()` 让汇报查看日志保持作用域隔离。

## 相关调用链

- [设计作业生命周期](/reference/flows/design-job-lifecycle)——产出汇报的作业。
- [微信登录流程](/reference/flows/wechat-login-flow)——签发用于铸造汇报查看令牌的用户 JWT。
