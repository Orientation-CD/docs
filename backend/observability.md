# Observability and recovery

Use health probes for traffic eligibility, Studio Control for aggregate pressure and the Workflow diagnostic view for a specific execution. These surfaces answer different questions.

## Health and HTTP evidence

`/health/live` only confirms the HTTP process is alive. `/health/ready` checks Redis and PostgreSQL and returns `503 DEPENDENCY_UNAVAILABLE` on failure. It does not validate model credentials, object-storage acceptance or payment settlement.

The HTTP safety layer propagates request IDs, bounds concurrency/body size, samples traces and aggregates metrics by registered route template. Application errors use `detail.code`, `message` and optional metadata; request-shape 422 errors use a validation array. Sensitive request bodies and credentials are not diagnostic material to paste into reports.

## Performance

[/admin/performance](/admin/performance) separates incoming/handled traffic, admission wait, handler duration, bounded latency estimates, failures, queue depth/age and job phases. It has authenticated HTML refresh and live JSON endpoints; there is no public Prometheus `/metrics` contract in this application.

Historical reports can be briefly cached. Live pressure has its own bounded collection, so distinguish missing/unavailable data from zero load. A slow response can be admission contention, DB pressure, provider time or finalization; inspect the stage instead of increasing every timeout.

## Per-Workflow diagnosis

The admin Job detail links to diagnostics, persisted chunks and authorized downloads. Match Workflow/Operation/Submission identity and attempt generation when investigating a retry. Provider failures distinguish proven pre-send failure, explicit rejection and unknown acceptance, with a corresponding replay disposition. An unknown paid outcome is not automatically safe to repeat.

The workers reconcile durable Operations/Submissions, payment evidence, deletion claims and temporary storage. A reconciliation run is not permission to mutate database state manually or to delete retained object versions.

## Activity trust and deployment recovery

`PROJECT_ACTIVITY_STATE_UNAVAILABLE` means the authoritative activity state needs operator reconciliation; it does not mean no activity occurred. Project activity migration and trust-epoch recovery require the protected stopped-fleet process in the current deployment runbook. Do not clear/seed trust state or downgrade a persistent database to suppress this error.

See [admin performance](/admin/performance), [Jobs](/admin/design-jobs), [deployment](/deploy/sae-deployment) and [configuration](/reference/configuration). Keep the initial failure evidence, applied revision and exact affected task IDs when reporting an incident.

---

Source evidence · backend `b13cc566`: [app/core/http_safety.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/http_safety.py) · [app/core/performance.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/performance.py) · [app/admin/workflow_diagnostics.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/workflow_diagnostics.py) · [deploy/sae/SAE_DEPLOYMENT_RUNBOOK.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/deploy/sae/SAE_DEPLOYMENT_RUNBOOK.md).
