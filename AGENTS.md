# YuanZhu AI docs

This repository contains the English and Chinese YuanZhu AI learning documentation. For requests such as “更新 docs”, “同步文档”, or updating docs after frontend/backend changes, use [update-yuanzhu-docs](.agents/skills/update-yuanzhu-docs/SKILL.md).

- Read the skill and current [maintenance guide](reference/maintenance.md) before a source synchronization. The skill owns the update workflow; avoid duplicating it here.
- Treat documentation as a source-reading course: explain real end-to-end call chains with diagrams and pinned code references. Rewrite substantially changed chapters and update both languages together.
- Source versions are recorded in `sources/revisions.json`. Resolve fresh revisions rather than assuming the local application checkouts are current.
- Use the repository's existing validation and publication workflow. Documentation updates normally produce a PR; merge and publish follow the user's explicit instructions.
