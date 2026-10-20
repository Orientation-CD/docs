# Marketing data

`/admin/marketing` is a read-only evidence dashboard loaded from authenticated `/admin/marketing/data`. It summarizes registration, generation, payments, conversion, repeat purchase and retention. It does not alter campaigns, orders or user status.

## Windows and definitions

Omitting both dates defaults to the latest 30 days including today. Explicit dates must be paired `YYYY-MM-DD`, ordered, no later than today, and span at most 366 inclusive days; today is partial. Use the response's timezone/coverage metadata. Daily marketing windows use **Asia/Shanghai**; the monthly finance section uses independent complete **UTC months**, not the daily date filter.

Generation-active users are customers with successful parent/root work in the defined window. The 1/7/30-day activity windows are generation activity, not login DAU/WAU/MAU. Included child tasks and output images do not become additional customer completions. Historical first-success and cohort retention have their own denominators and observation windows.

Money is reported in fen; Tokens, people and task counts are separate units. Read gross receipts, refunds and net receipts together. Conversion and repeat purchase must use the corresponding eligible cohort, not a ratio of unrelated totals from different time windows.

## Availability and safe refresh

A missing source window or financial cost is shown as unavailable/null with explanatory coverage, not fabricated zero. Immature retention cells remain unobserved. Keep gaps in charts; do not coerce them to zero when exporting or comparing.

The page has independent loading/error states and safe read refresh. On a transport/service error, preserve the last known result and show unavailability rather than an empty successful dashboard. Session expiry requires reauthentication; changing a Campaign amount is a separate [Campaigns](/admin/campaigns) mutation.

For metric field definitions and exact request/error behavior, use the backend's pinned **Internal administrator marketing contract**. [Finance](/admin/finance) owns monthly cost entry, while [Overview](/admin/dashboard) is a shorter operational summary.

---

Source evidence · backend `b13cc566`: [app/admin/marketing.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/marketing.py) · [app/templates/admin/marketing.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/templates/admin/marketing.html) · [documents/REST_API_INTERFACE.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/REST_API_INTERFACE.md).
